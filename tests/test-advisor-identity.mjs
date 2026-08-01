// Advisor identity follows the SIGNED-IN counselor.
//
// The regression this guards: 'Martice Morrison' was hardcoded at 37 sites, so Randy signed in
// and Martice's name came out on every quote and contract — including the Insurance Producer of
// record on the Global Atlantic application. It is the kind of bug that returns silently, because
// nothing breaks and the paperwork still looks right to whoever generated it.
//
// Fake Firebase only — production is never contacted.
import { chromium } from 'playwright';
import fs from 'fs';

const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };

// producerId is deliberately absent for randy: no ID is on file and inventing one on an insurance
// document is the failure being avoided. He hand-writes it on the generated PDF.
const MARTICE = { handle: 'martice', name: 'Martice Morrison', email: 'mmorrison@bonneywatson.com', phone: '206-445-9794', producerId: '183881' };
const RANDY   = { handle: 'randy',   name: 'Randy Bergquist',  email: 'rbergquist@bonneywatson.com', phone: '206-242-1787', producerId: '' };

async function signedInAs(browser, handle) {
  const ctx = await browser.newContext();
  await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(FAKE);
  await page.addInitScript(`window.__fake.addAccount(${JSON.stringify(handle + '@bwquote.local')}, 'pw');`);
  await page.goto('http://localhost:' + (process.env.PORT || 3737) + '/', { waitUntil: 'load', timeout: 120000 });
  await page.fill('#bwUser', handle);
  await page.fill('#bwPass', 'pw');
  await page.click('#bwGateBtn');
  await page.waitForTimeout(600);
  return { ctx, page, errs };
}

// Everything the output surfaces derive their advisor identity from, read in one pass.
const readIdentity = page => page.evaluate(() => {
  const v = id => { const e = document.getElementById(id); return e ? e.value : null; };
  return {
    advisor:     bwCurrentAdvisor(),
    contactLine: bwAdvisorContactLine(),
    contactPair: bwAdvisorContactPair(' / '),
    inputs: {
      ricCounselor: v('ricCounselor'), anFSD: v('anFSD'), anoVtSoldBy: v('anoVtSoldBy'),
      gaclFSD: v('gaclFSD'), riclFSD: v('riclFSD'), anclFSD: v('anclFSD'), cpclFSD: v('cpclFSD'),
      riclSplit1Name: v('riclSplit1Name'), anclSplit1Name: v('anclSplit1Name'), cpclSplit1Name: v('cpclSplit1Name'),
    },
    // The two customer-facing quote surfaces: the family-quote model (feeds BOTH the HTML print
    // window and the pdf-lib download) and the older print footer.
    venueLine:  _fqBuildModel({ typeLabel: 'x', scopeLabel: 'y', clientName: 'Test Client', surfaces: [] }).venueLine,
    fqFooter:   _fqFooterHTML(1),
    printFooter: _printQuoteFooterHTML(),
    contactPanel: (document.getElementById('bwAdvContact') || {}).textContent || '',
    sidebarName: (document.querySelector('.sb-user-name') || {}).textContent || '',
  };
});

const browser = await chromium.launch();

// ── 1. The accessor resolves the signed-in counselor, for each counselor ─────────────
for (const who of [MARTICE, RANDY]) {
  console.log('\n1. bwCurrentAdvisor() as ' + who.handle);
  const { ctx, page, errs } = await signedInAs(browser, who.handle);
  const r = await readIdentity(page);

  ok('handle resolved from the sign-in email', r.advisor.handle === who.handle, r.advisor);
  ok('name is the signed-in counselor', r.advisor.name === who.name, r.advisor.name);
  ok('email is the signed-in counselor', r.advisor.email === who.email, r.advisor.email);
  ok('phone is the signed-in counselor', r.advisor.phone === who.phone, r.advisor.phone);
  // The producer ID has NO fallback: an advisor without one on file gets an empty string, so
  // A4176-PG1-2 on the GA application goes out blank to be hand-written. A wrong-but-plausible
  // ID on a form whose name and email are now correct reads as complete and gets filed; a blank
  // one is self-evidently unfinished. Inheriting another producer's ID is the regression here.
  ok('producer ID is the signed-in counselor\'s, or empty', r.advisor.producerId === who.producerId,
    { got: r.advisor.producerId, want: who.producerId });
  if (!who.producerId) {
    ok('an advisor with no producer ID on file does NOT inherit 183881',
      r.advisor.producerId !== '183881' && r.advisor.producerId === '', r.advisor.producerId);
  }
  ok('contact line is "Name | email | phone"',
    r.contactLine === who.name + ' | ' + who.email + ' | ' + who.phone, r.contactLine);
  ok('contact pair honours its separator', r.contactPair === who.email + ' / ' + who.phone, r.contactPair);

  // Every advisor-default input. These are the fields a counselor sees pre-filled; before the
  // fix all ten shipped Martice's name regardless of who was signed in.
  for (const [id, val] of Object.entries(r.inputs)) {
    ok('default input ' + id + ' = ' + who.name, val === who.name, { id, val });
  }

  ok('family-quote venue line names the signed-in advisor',
    r.venueLine === 'Washington Memorial Park · Prepared by ' + who.name + ', Family Service Advisor', r.venueLine);
  ok('family-quote footer carries their email and phone',
    r.fqFooter.includes(who.email) && r.fqFooter.includes(who.phone), r.fqFooter.slice(0, 200));
  ok('print-window footer carries their email and phone',
    r.printFooter.includes(who.email) && r.printFooter.includes(who.phone), r.printFooter.slice(0, 200));
  ok('Overview contact panel shows them', r.contactPanel.includes(who.name) && r.contactPanel.includes(who.email), r.contactPanel);
  ok('sidebar shows them', r.sidebarName === who.name, r.sidebarName);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ── 2. The OTHER counselor's identity never leaks through ─────────────────────────────
console.log('\n2. Nothing of Martice survives a Randy session');
{
  const { ctx, page } = await signedInAs(browser, 'randy');
  const r = await readIdentity(page);
  const blob = JSON.stringify(r);
  ok('no "Martice Morrison" anywhere in the advisor surfaces', !blob.includes('Martice Morrison'), blob.slice(0, 300));
  ok('no mmorrison@ address anywhere', !blob.includes('mmorrison@bonneywatson.com'));
  ok('no 206-445-9794 anywhere', !blob.includes('206-445-9794'));
  ok('no 183881 producer ID anywhere', !blob.includes('183881'), blob.slice(0, 300));
  await ctx.close();
}

// ── 2b. The producer ID reaches the GA form only when the signed-in producer has one ─────
// Read straight off the generated AcroForm rather than trusting the accessor: this field is the
// producer of record on an insurance application, and the point is what lands on the paper.
console.log('\n2b. A4176-PG1-2 on the generated GA application');
for (const who of [MARTICE, RANDY]) {
  const { ctx, page } = await signedInAs(browser, who.handle);
  const r = await page.evaluate(async () => {
    // Populate the funeral-home quote the GA contract is generated from, then read the field back
    // out of the produced PDF bytes instead of downloading them.
    show('fh-quote', null);
    const sel = document.getElementById('fhBurialPlan');
    const opt = [...sel.options].find(o => /^\d{3,}/.test(o.value));
    if (opt) { sel.value = opt.value; fhPlanChange('burial'); }
    fhUpdate();
    await new Promise(r => setTimeout(r, 300));
    show('ga-contract', null);
    gaImportFromFH();
    document.getElementById('gaInsuredName').value = 'Aaron Prescott';

    // Intercept the download so the generator runs untouched but nothing leaves the page.
    let bytes = null;
    const realCreate = URL.createObjectURL;
    URL.createObjectURL = function (blob) { bytes = blob; return realCreate.call(URL, blob); };
    try { await printGAContract(); } finally { URL.createObjectURL = realCreate; }
    if (!bytes) return { error: 'no PDF produced' };

    const buf = new Uint8Array(await bytes.arrayBuffer());
    const doc = await PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
    const f = doc.getForm();
    const get = (n) => { try { return f.getTextField(n).getText() || ''; } catch (e) { return null; } };
    return { producerId: get('A4176-PG1-2'), producerName: get('A4176-PG1-1'), firmId: get('A4176-PG1-3') };
  });

  ok(who.handle + ': producer NAME is on the form', r.producerName === who.name, r);
  if (who.producerId) {
    ok(who.handle + ': producer ID is their own', r.producerId === who.producerId, r);
  } else {
    ok(who.handle + ': producer ID is BLANK, to be hand-written',
      r.producerId === '' || r.producerId === null, r);
    ok(who.handle + ': producer ID did not inherit 183881', r.producerId !== '183881', r);
  }
  // The firm ID is a firm constant, not identity — it must NOT have moved.
  ok(who.handle + ': firm ID is unchanged', r.firmId === 'Y363', r);
  await ctx.close();
}

// ── 3. Defaults are DEFAULTS — a hand-typed name survives ────────────────────────────
// A counselor sometimes prepares a document on someone else's behalf, so these fields must stay
// editable and must not be clobbered when the auth watcher fires again.
console.log('\n3. Hand-typed values are not overwritten');
{
  const { ctx, page } = await signedInAs(browser, 'randy');
  const r = await page.evaluate(() => {
    const e = document.getElementById('ricCounselor');
    e.value = 'Dale Cooper';                 // typed on someone else's behalf
    bwApplyAdvisorDefaults();                // as a late auth callback would
    const typed = e.value;
    e.value = 'Martice Morrison';            // still a default value, per BW_USERS
    bwApplyAdvisorDefaults();
    return { typed, reset: e.value, readonly: e.readOnly, disabled: e.disabled };
  });
  ok('a hand-typed name survives re-application', r.typed === 'Dale Cooper', r);
  ok('a value that is still a default is corrected', r.reset === 'Randy Bergquist', r);
  ok('the field stays editable', r.readonly === false && r.disabled === false, r);
  await ctx.close();
}

// ── 4. An account not yet in BW_USERS degrades gracefully ────────────────────────────
// BW_USERS will grow. A new entry with no phone must print "Name | email" — never a dangling
// separator, never "undefined", and above all never another counselor's identity.
console.log('\n4. Unknown / incomplete account');
{
  const { ctx, page } = await signedInAs(browser, 'newhire');
  const r = await page.evaluate(() => {
    const out = { unmapped: bwCurrentAdvisor(), unmappedLine: bwAdvisorContactLine() };
    // Now simulate the future incomplete entry: a name, an email, no phone.
    BW_USERS.newhire = { name: 'Nora Hale', role: 'Advanced Planning', email: 'nhale@bonneywatson.com' };
    out.partialLine = bwAdvisorContactLine();
    out.partialPair = bwAdvisorContactPair(' | ');
    bwApplyAdvisorDefaults();
    out.partialPanel = (document.getElementById('bwAdvContact') || {}).textContent || '';
    return out;
  });
  ok('unmapped account gets its capitalised username', r.unmapped.name === 'Newhire', r.unmapped);
  ok('unmapped account borrows NOBODY else\'s email', r.unmapped.email === '', r.unmapped);
  ok('unmapped account borrows NOBODY else\'s phone', r.unmapped.phone === '', r.unmapped);
  ok('unmapped contact line is the name alone', r.unmappedLine === 'Newhire', r.unmappedLine);
  ok('no dangling separator', !/\|\s*$/.test(r.unmappedLine) && !/\|\s*\|/.test(r.unmappedLine), r.unmappedLine);
  ok('no "undefined" printed', !/undefined/.test(r.unmappedLine + r.partialLine + r.partialPair + r.partialPanel),
    { l: r.partialLine, p: r.partialPair });
  ok('an entry with no phone prints name and email only',
    r.partialLine === 'Nora Hale | nhale@bonneywatson.com', r.partialLine);
  ok('the pair with no phone is the email alone', r.partialPair === 'nhale@bonneywatson.com', r.partialPair);
  ok('the contact panel omits the missing row rather than blanking it',
    r.partialPanel.includes('Nora Hale') && r.partialPanel.includes('nhale@bonneywatson.com')
      && !/undefined/.test(r.partialPanel), r.partialPanel);
  await ctx.close();
}

// ── 5. The identity is resolved in exactly one place ─────────────────────────────────
// The fix's whole value is that there is ONE resolver. A second copy of the lookup is how the
// bug comes back, one site at a time.
console.log('\n5. Source-level: one resolver, no leftover hardcoded identity');
{
  const src = fs.readFileSync('index.html', 'utf8');
  const count = (re) => (src.match(re) || []).length;
  ok('bwCurrentAdvisor is defined exactly once', count(/function bwCurrentAdvisor\s*\(/g) === 1);
  // Every remaining literal must be either BW_USERS data, a comment, or markup that
  // bwApplyAdvisorDefaults()/bwApplySignedInUser() replaces at runtime.
  const lines = src.split(/\r?\n/);
  const stray = lines
    .map((l, i) => ({ n: i + 1, l }))
    .filter(x => /Martice Morrison/.test(x.l))
    .filter(x => !/^\s*(\/\/|martice:)/.test(x.l.trim()) && !/^\s*\/\//.test(x.l))
    .filter(x => !/(sb-user-name|id="bwAdvContact"|id="ricCounselor"|id="anFSD"|id="anoVtSoldBy"|id="gaclFSD")/.test(x.l));
  ok('no hardcoded "Martice Morrison" outside BW_USERS, comments and runtime-replaced markup',
    stray.length === 0, stray.map(x => x.n + ': ' + x.l.trim().slice(0, 90)));
  ok('no hardcoded advisor email outside BW_USERS/markup',
    lines.filter(l => /mmorrison@bonneywatson\.com/.test(l) && !/email:/.test(l) && !/📧|\\ud83d\\udce7/.test(l)).length === 0,
    lines.filter(l => /mmorrison@bonneywatson\.com/.test(l) && !/email:/.test(l)).map(l => l.trim().slice(0, 90)));
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
