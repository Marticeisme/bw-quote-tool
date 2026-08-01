// followup-letter.html — the aftercare follow-up email generator.
//
// The email copy is operator-approved text (followupemailtoolhandoff.md, 2026-07-29),
// and the whole value of the page is that the wording bends correctly to the family's
// relationship. The two things that would actually hurt a family are (a) calling a
// deceased child "your son" instead of using their name, and (b) pitching pre-planning
// to a parent who just buried their child. Both are asserted here.
//
// The page is a standalone file: no Firebase, no storage, no network beyond the Google
// Fonts stylesheet, which this suite blocks so the run works offline. Nothing is written
// anywhere by this suite.
//
// Names below are invented fixtures. No real family data appears in this file.
import { chromium } from 'playwright';
import path from 'path';
import { pathToFileURL } from 'url';

let pass = 0, fail = 0;
const ok = (n, c, extra) => {
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (extra ? '  — ' + extra : '')); }
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1100 } });

const jsErrors = [];
const offsiteRequests = [];

await ctx.route('**/*', route => {
  const url = route.request().url();
  if (/^https?:/i.test(url)) {
    if (!/fonts\.(googleapis|gstatic)\.com/.test(url)) offsiteRequests.push(url);
    return route.abort();          // never let this page reach the network in a test
  }
  return route.continue();
});

const page = await ctx.newPage();
page.on('pageerror', e => jsErrors.push(e.message));

// Capture clipboard writes instead of touching the real clipboard.
await page.addInitScript(() => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      write: async (items) => {
        const it = items[0];
        window.__copiedHtml = await (await it.getType('text/html')).text();
        window.__copiedText = await (await it.getType('text/plain')).text();
      },
      writeText: async (t) => { window.__copiedText = t; },
    },
  });
});

const URL_ = pathToFileURL(path.resolve('followup-letter.html')).href;
await page.goto(URL_, { waitUntil: 'load' });

const body = () => page.innerText('#letter');
const visible = sel => page.isVisible(sel);

// The radio itself is visually hidden behind its pill; click the pill, like a user.
const setCat = async v => { await page.click('.pill:has(#cat-' + v + ') span'); };
const fill = async (id, v) => { await page.fill('#' + id, v); };
const pick = async (id, v) => { await page.selectOption('#' + id, v); };

// ---------------------------------------------------------------- basics
ok('page loads with no JS errors', jsErrors.length === 0, jsErrors.join(' | '));
ok('default category is Marker', await page.isChecked('#cat-marker'));
ok('Veteran checkbox shows on Marker', await visible('#f-veteran'));
ok('"Marker already in place" is hidden on Marker', !(await visible('#f-hasMarker')));

// ---------------------------------------------------------------- subject line
// Reworked per the operator 2026-08-01: per-type subjects on the decedent's FIRST
// name ("Checking In — [Full Name]" read like a case file). The auto subject now
// FOLLOWS the selected category until the counselor edits it, then it is theirs.
await fill('recipientFirst', 'Karen');
await fill('decedentFull', 'Robert Whitfield');
const SUBJECTS = {
  marker: "Robert's marker — whenever you're ready",
  cremation: 'Thinking of you and Robert',
  outside: 'Thinking of you and your family',
  full: "Thinking of you since Robert's service",
};
ok('subject auto-fills per category spec',
  (await page.inputValue('#subject')) === SUBJECTS.marker,
  await page.inputValue('#subject'));

// ------------------------------------------------- category switching preserves fields
await pick('relationship', 'daughter');
const before = {
  recipientFirst: await page.inputValue('#recipientFirst'),
  decedentFull: await page.inputValue('#decedentFull'),
  relationship: await page.inputValue('#relationship'),
};
for (const cat of ['cremation', 'outside', 'full', 'marker']) {
  await setCat(cat);
  ok(`subject follows the category: ${cat}`,
    (await page.inputValue('#subject')) === SUBJECTS[cat],
    await page.inputValue('#subject'));
}
const after = {
  recipientFirst: await page.inputValue('#recipientFirst'),
  decedentFull: await page.inputValue('#decedentFull'),
  relationship: await page.inputValue('#relationship'),
};
ok('switching all four categories preserves the common fields',
  JSON.stringify(before) === JSON.stringify(after),
  JSON.stringify(before) + ' -> ' + JSON.stringify(after));
// A counselor's manual subject is theirs: category switches must not clobber it.
await page.fill('#subject', 'My own subject');
await page.dispatchEvent('#subject', 'input');
await setCat('cremation');
ok('an edited subject survives category switching',
  (await page.inputValue('#subject')) === 'My own subject',
  await page.inputValue('#subject'));
await page.fill('#subject', SUBJECTS.marker);
await page.dispatchEvent('#subject', 'input');
await setCat('marker');

// ---------------------------------------------------------------- greeting & signature
let t = await body();
ok('greets with "Hi <first>," and never "Dear"',
  /(^|\n)Hi Karen,/.test(t) && !/\bDear\b/i.test(t), t.split('\n').slice(0, 4).join(' / '));
ok('closes with "With care,"', t.includes('With care,'));
for (const line of [
  'Martice Morrison',
  'Family Service & Advanced Planning Director',
  'Bonney Watson Washington Memorial Park',
  '(206) 445-9794',
  'mmorrison@bonneywatson.com',
  'calendly.com/mmorrison-bonneywatson/30min',
  '16445 International Blvd, SeaTac, WA 98188',
]) ok('signature line present: ' + line, t.includes(line));

// ---------------------------------------------- relationship -> decedent reference
// Son/Daughter, sibling and grandchild do not say WHICH parent/sibling/grandparent died,
// so the page asks. Default is the first name; picking the relation produces the
// possessive wording the handoff specifies.
const refCases = [
  { rel: 'daughter', who: 'mother',      want: "your mother's resting place" },
  { rel: 'son',      who: 'father',      want: "your father's resting place" },
  { rel: 'wife',     who: null,          want: "your husband's resting place" },
  { rel: 'husband',  who: null,          want: "your wife's resting place" },
  { rel: 'sister',   who: 'brother',     want: "your brother's resting place" },
  { rel: 'grandson', who: 'grandmother', want: "your grandmother's resting place" },
  { rel: 'uncle',    who: null,          want: "Robert Whitfield's resting place" },
  { rel: 'other',    who: null,          want: "Robert Whitfield's resting place" },
];
await setCat('marker');
for (const c of refCases) {
  await pick('relationship', c.rel);
  if (c.who) await pick('decWho', c.who);
  t = await body();
  ok(`${c.rel} -> "${c.want}"`, t.includes(c.want), t.split('\n').filter(Boolean)[2]);
}

// Parent of a deceased child: first name only, never "your son"/"your daughter".
await pick('relationship', 'mother');
t = await body();
ok('parent of a deceased child is referred to by first name only',
  t.includes("I've been thinking about Robert") && t.includes("choose a marker for Robert's resting place"));
ok('parent case never says "your son" / "your daughter"', !/your (son|daughter)/i.test(t));
ok('parent case shows no relation selector', !(await visible('#f-decWho')));

// ------------------------------------------ parent of deceased child omits pre-planning
for (const cat of ['marker', 'cremation', 'outside', 'full']) {
  await setCat(cat);
  await pick('relationship', 'father');
  t = await body();
  ok(`${cat}: no pre-planning paragraph for a parent who lost a child`,
    !/planning ahead/i.test(t) && !/securing property/i.test(t));
}

// ------------------------------------------------ surviving parent flows into paragraph
await setCat('marker');
await pick('relationship', 'daughter');
ok('Son/Daughter reveals the surviving-parent dropdown', await visible('#f-survivingParent'));
ok('surviving-parent NAME field stays hidden while "No"', !(await visible('#f-survivingParentName')));
await pick('survivingParent', 'yes');
ok('choosing "Yes" reveals the surviving-parent name field', await visible('#f-survivingParentName'));
await fill('survivingParentName', 'Linda');
t = await body();
ok('surviving parent name appears in the pre-planning paragraph',
  t.includes("If Linda or anyone else in the family ever wants to sit down and talk about planning ahead, I'm happy to help whenever you're ready. No pressure at all, just want you to know I'm here."));
await setCat('full');
t = await body();
ok('Full Service uses the WMP-specific pre-planning wording with the parent named',
  t.includes("If Linda or anyone else in the family ever thinks about planning ahead and securing property here at the park") &&
  t.includes('while they already have a connection here'));
await setCat('outside');
t = await body();
ok('Outside Burial pre-planning names cemetery property AND pre-arranging services',
  t.includes("whether that's securing cemetery property or pre-arranging services"));
await setCat('marker');
await pick('survivingParent', 'no');
t = await body();
ok('with no surviving parent the paragraph opens with "If you or anyone else"',
  t.includes("If you or anyone else in the family ever want to talk about planning ahead") && !t.includes('Linda'));

// spouse gets the softer wording
await pick('relationship', 'wife');
t = await body();
ok('spouse check-in opens with the softer "I\'ve been thinking about you"',
  t.includes("I've been thinking about you and just wanted to check in and see how you're doing."));
ok('spouse pre-planning is the short soft version',
  t.includes("If you or anyone else in the family ever want to talk about planning ahead, I'm here whenever you're ready. No pressure at all."));
ok('spouse shows no surviving-parent dropdown', !(await visible('#f-survivingParent')));

// ------------------------------------------------------------- veteran paragraph
await setCat('marker');
await pick('relationship', 'daughter');
await pick('decWho', 'father');
const VET = 'the family may be eligible for a government-issued bronze marker through the VA at no cost';
t = await body();
ok('veteran paragraph absent when unchecked', !t.includes(VET));
await page.check('#veteran');
t = await body();
ok('veteran paragraph appears when checked', t.includes(VET));
ok('veteran paragraph uses the decedent first name', t.includes('since Robert was a veteran'));
await page.uncheck('#veteran');
t = await body();
ok('veteran paragraph disappears again when unchecked', !t.includes(VET));

// ------------------------------------------------------- Full Service marker paragraph
await setCat('full');
ok('"Marker already in place" checkbox shows on Full Service', await visible('#f-hasMarker'));
ok('Veteran checkbox hides on Full Service', !(await visible('#f-veteran')));
const GENTLE = "If you haven't had a chance to think about a marker yet, there's no rush at all.";
t = await body();
ok('gentle marker paragraph present when no marker yet', t.includes(GENTLE));
const idxMarker = t.indexOf(GENTLE), idxPre = t.indexOf('planning ahead');
ok('gentle marker paragraph comes BEFORE the pre-planning mention',
  idxMarker > -1 && idxPre > -1 && idxMarker < idxPre, `${idxMarker} / ${idxPre}`);
await page.check('#hasMarker');
t = await body();
ok('gentle marker paragraph gone once the marker is in place', !t.includes(GENTLE));
ok('Full Service references the property at the park',
  t.includes("property here at the park"));

// --------------------------------------------------------------- cremation category
await setCat('cremation');
await pick('relationship', 'son');
await pick('decWho', 'father');
t = await body();
ok('cremation check-in uses the relationship-aware possessive',
  t.includes("since your father's services"));
ok('cremation mentions a permanent place at the park',
  t.includes('we have several options, from cremation niches to garden placements'));
ok('cremation sign-off line', t.includes('Please let me know if you need anything at all.'));

// ------------------------------------------------------------------- voice rules
await setCat('marker');
t = await body();
const bodyOnly = t.split('\n').slice(2).join('\n');   // drop the SUBJECT header block
ok('no em dashes anywhere in the email body', !bodyOnly.includes('—'), bodyOnly.match(/.{0,30}—.{0,30}/)?.[0]);
for (const banned of ['deeply personal decision', 'with dignity', 'honoring your loved one', 'in this difficult time']) {
  ok('body avoids banned phrase: "' + banned + '"', !t.toLowerCase().includes(banned));
}

// ------------------------------------------------------------------- copy buttons
await page.evaluate(() => { delete window.__copiedText; delete window.__copiedHtml; });
await page.click('button.btn-primary');
await page.waitForFunction(() => !!window.__copiedText);
const copied = await page.evaluate(() => window.__copiedText);
const copiedHtml = await page.evaluate(() => window.__copiedHtml);
ok('Copy for Email starts with the subject line',
  copied.startsWith("Subject: Robert's marker — whenever you're ready"), copied.slice(0, 60));
ok('Copy for Email includes the greeting', copied.includes('Hi Karen,'));
ok('Copy for Email includes the body', copied.includes('Granite Marker Guide'));
ok('Copy for Email includes the full signature',
  copied.includes('Martice Morrison') && copied.includes('16445 International Blvd, SeaTac, WA 98188'));
ok('Copy for Email does not repeat the subject inside the body',
  copied.split("Robert's marker — whenever you're ready").length === 2,
  copied.split("Robert's marker").length - 1 + ' occurrences');
ok('rich-text copy carries the subject and drops the placeholder styling',
  copiedHtml.includes('<strong>Subject:</strong>') && !copiedHtml.includes('class="blank"'));

await page.evaluate(() => { delete window.__copiedText; });
await page.click('button.btn-secondary');
await page.waitForFunction(() => !!window.__copiedText);
const plain = await page.evaluate(() => window.__copiedText);
ok('Copy Plain Text also carries the subject', plain.startsWith("Subject: Robert's marker — whenever you're ready"));
ok('Copy Plain Text matches the rendered email', plain === copied);

// --------------------------------------------------------- an edited subject is kept
await fill('subject', 'Thinking of you');
await fill('decedentFull', 'Robert Whitfield Jr');
ok('an edited subject is not overwritten when the decedent name changes',
  (await page.inputValue('#subject')) === 'Thinking of you');

// ------------------------------------------------------------------ page hygiene
ok('page made no off-site network requests', offsiteRequests.length === 0, offsiteRequests.join(', '));
ok('no JS errors after the full run', jsErrors.length === 0, jsErrors.join(' | '));

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
