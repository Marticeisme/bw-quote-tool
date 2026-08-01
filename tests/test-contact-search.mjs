// Sprint-04 Track B — finding people: the worklist, the filters, the hash, saved views,
// selection and bulk actions. Fake Firebase only; production is never contacted.
//
// House rules this suite obeys (SPRINT.md):
//   · no assertion reads a value from the same constant the code reads — every expectation
//     below is a hand-written list of fixture ids, and the answers come out of RENDERED DOM,
//   · every number that matters is asserted here rather than stated in a report sentence,
//   · fixtures are synthetic by rule: invented names, 555-range phones, @example.com.
//
// The round-trip assertions genuinely RELOAD the page from nothing but the hash. That is the
// only way to prove a view is a URL: reading the model back out of the model would pass even
// if the serialiser dropped every filter it was given.
import { chromium } from 'playwright';
import fs from 'fs';
import { BASE } from './_base.mjs';

const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sorted = (a) => a.slice().sort();

// Days relative to LOCAL today, computed in Node — independently of the app's own bwToday(),
// so a bug in that helper cannot make these agree with it.
const day = (o) => { const d = new Date(); d.setDate(d.getDate() + o); const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
const YESTERDAY = day(-1), TODAY = day(0), TOMORROW = day(1);
const NOW = Date.now(), D = 86400000;
const UID = 'uid_tester@bwquote.local';

const P = (id, given, family, extra) => Object.assign({
  id, given, family, kind: 'person', ownerUid: UID,
  createdAt: NOW - 30 * D, createdBy: UID, updatedAt: NOW - 30 * D, updatedBy: UID,
  salutation: 'Dear ' + given + ',',
}, extra || {});
const ph = (...v) => { const o = {}; v.forEach((x, i) => { o['p' + (i + 1)] = { value: x, type: 'mobile', isPrimary: i === 0, note: '' }; }); return o; };
const em = (...v) => { const o = {}; v.forEach((x, i) => { o['e' + (i + 1)] = { value: x, isPrimary: i === 0, note: '' }; }); return o; };
const ad = (street, city, state, postal) => ({ a1: { type: 'mailing', street1: street, street2: '', city, state, postal, isPrimary: true } });

// ── the fixture ──────────────────────────────────────────────────────────────────────
// Thirteen invented people, shaped so every one of the five default views is non-empty and
// every operator has something to bite on. Expected id lists are hand-computed below.
const PARTIES = {
  p01: P('p01', 'Ada', 'Fenwick', { status: 'working', source: 'walk-in', category: 'pre-need-cemetery',
        flags: ['veteran'], phones: ph('2065550101'), emails: em('ada@example.com'),
        addresses: ad('12 Marine View', 'Burien', 'WA', '98166'),
        interest: 'Cremation niche', dob: '1948-03-11', createdAt: NOW - 60 * D, updatedAt: NOW - 60 * D }),
  p02: P('p02', 'Bo', 'Ilesanmi', { status: 'new', source: 'referral', category: 'pre-need-funeral',
        phones: ph('2065550102'), addresses: ad('9 Rainier Ave', 'Renton', 'WA', '98055'),
        interest: 'Double depth lawn', dob: '1955-11-02', createdAt: NOW - 45 * D, updatedAt: NOW - 45 * D }),
  p03: P('p03', 'Cleo', 'Marchetti', { status: 'working', source: 'cold-call',
        phones: ph('2065550103'), addresses: ad('4 Beacon Hill', 'Seattle', 'WA', '98108'),
        dob: '1970-06-30', createdAt: NOW - 2 * D, updatedAt: NOW - 2 * D }),
  p04: P('p04', 'Dov', 'Rasmussen', { status: 'sold', source: 'direct-mail', flags: ['payment-plan'],
        phones: ph('2065550104', '2065550204'), emails: em('dov@example.com', 'dov.r@example.com'),
        addresses: ad('77 Andover Park', 'Tukwila', 'WA', '98188'),
        createdAt: NOW - 100 * D, updatedAt: NOW - 100 * D }),
  // No contact method, no source, no status, no salutation: four data-health problems at once.
  p05: Object.assign(P('p05', 'Elin', 'Vargas', { createdAt: NOW - 3 * D, updatedAt: NOW - 3 * D }), { salutation: '' }),
  // A phone that is not ten digits — the fifth data-health rule.
  p06: P('p06', 'Fitz', 'Okonkwo', { status: 'appointment-set', source: 'web-lead',
        phones: ph('20655501'), createdAt: NOW - 20 * D, updatedAt: NOW - 20 * D }),
  p07: P('p07', 'Gita', 'Halvorsen', { status: 'do-not-contact', source: 'phone-in',
        phones: ph('2065550107'), createdAt: NOW - 200 * D, updatedAt: NOW - 200 * D }),
  p08: P('p08', 'Hugo', 'Brennan', { status: 'working', source: 'community-event',
        phones: ph('2065550108'), emails: em('hugo@example.com'),
        createdAt: NOW - 15 * D, updatedAt: NOW - 15 * D }),
  p09: P('p09', 'Ivy', 'Sandoval', { status: 'new', source: 'at-need-family',
        phones: ph('2065550109'), createdAt: NOW - 70 * D, updatedAt: NOW - 70 * D }),
  p10: P('p10', 'Jonas', 'Petrakis', { status: 'not-interested', source: 'cold-call',
        phones: ph('2065550110'), emails: em('jonas@example.com'),
        createdAt: NOW - 5 * D, updatedAt: NOW - 5 * D }),
  p11: P('p11', 'Kira', 'Ashworth', { status: 'presented', source: 'existing-owner',
        category: 'existing-owner', flags: ['vip', 'estate'],
        phones: ph('2065550111'), emails: em('kira@example.com'),
        createdAt: NOW - 10 * D, updatedAt: NOW - 10 * D }),
  // Has a status and a contact method but no source: exactly one health problem.
  p12: P('p12', 'Liam', 'Okafor', { status: 'working',
        phones: ph('2065550112'), emails: em('liam@example.com'),
        createdAt: NOW - 1 * D, updatedAt: NOW - 1 * D }),
  // Exists so that no single param of the round-trip filter is decisive on its own: working
  // and cold-call like p03, but with no letter "o" anywhere a free-text search would look.
  p13: P('p13', 'Wren', 'Ashby', { status: 'working', source: 'cold-call',
        phones: ph('2065550113'), createdAt: NOW - 50 * D, updatedAt: NOW - 50 * D }),
};
const TASKS = {
  t01: { id: 't01', partyId: 'p01', summary: 'Ring about the niche', dueOn: YESTERDAY, category: 'call', status: 'open', ownerUid: UID, createdAt: NOW - 9 * D, updatedAt: NOW - 9 * D },
  t02: { id: 't02', partyId: 'p06', summary: 'Confirm the appointment', dueOn: TODAY, category: 'call', status: 'open', ownerUid: UID, createdAt: NOW - 4 * D, updatedAt: NOW - 4 * D },
  t03: { id: 't03', partyId: 'p08', summary: 'Post the brochure', dueOn: TOMORROW, category: 'letter', status: 'open', ownerUid: UID, createdAt: NOW - 3 * D, updatedAt: NOW - 3 * D },
  t05: { id: 't05', partyId: 'p11', summary: 'Deed paperwork', dueOn: YESTERDAY, category: 'paperwork', status: 'done', doneAt: NOW - 2 * D, ownerUid: UID, createdAt: NOW - 12 * D, updatedAt: NOW - 2 * D },
};
const NOTES = {
  n01: { id: 'n01', partyId: 'p03', body: 'Wants the west wall & a bench.', pinned: false, ownerUid: UID, createdAt: NOW - 1 * D, updatedAt: NOW - 1 * D },
  n02: { id: 'n02', partyId: 'p09', body: 'Left a voicemail, no answer.', pinned: false, ownerUid: UID, createdAt: NOW - 40 * D, updatedAt: NOW - 40 * D },
  n03: { id: 'n03', partyId: 'p12', body: 'Mailed the brochure.', pinned: false, ownerUid: UID, createdAt: NOW - 1 * D, updatedAt: NOW - 1 * D },
};
const SEED = { parties: PARTIES, contactTasks: TASKS, contactNotes: NOTES };
const ALL = Object.keys(PARTIES);

// Hand-computed expectations. Worked out from the fixture above by reading the rules in
// SPRINT.md, NOT by running the code and writing down what it said.
const EXPECT = {
  followup: ['p01', 'p06'],                              // an open to-do due today or earlier
  unworked: ['p02', 'p09', 'p13'],                       // new/working, no open to-do, no note in 30 days
  newweek:  ['p03', 'p05', 'p10', 'p12'],                // created in the last 7 days
  nonext:   ['p02', 'p03', 'p05', 'p09', 'p11', 'p12', 'p13'],  // still live, and zero open to-dos
  health:   ['p05', 'p06', 'p12'],                       // missing contact method / source / status / salutation / bad phone
};

async function open(browser, hash) {
  const ctx = await browser.newContext();
  await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 220)); });
  page.on('dialog', d => d.accept());
  await page.addInitScript(FAKE);
  await page.addInitScript(`window.__fake.addAccount('tester@bwquote.local','pw');
    window.__fake.seed(${JSON.stringify(SEED)});`);
  await page.goto(BASE + (hash || ''), { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('tester@bwquote.local', 'pw'));
  await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
  await page.waitForFunction(() => typeof _parties !== 'undefined' && _parties.length === 13, { timeout: 20000 });
  await page.waitForTimeout(150);
  return { ctx, page, errs };
}
// The answer as the SCREEN gives it, never as the model gives it.
const shownIds = (page) => page.evaluate(() =>
  [...document.querySelectorAll('#contactsList tbody tr')].map(t => t.getAttribute('data-pid')));

const browser = await chromium.launch();

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n1. The list is a table, and every persistent control is OUTSIDE it');
{
  const { ctx, page, errs } = await open(browser, '#contacts');
  const r = await page.evaluate(() => {
    const list = document.getElementById('contactsList');
    const inside = (id) => list.contains(document.getElementById(id));
    return {
      headers: [...document.querySelectorAll('#contactsList thead th')].map(t => t.textContent.replace(/[↑↓]/g, '').trim()),
      rowCount: document.querySelectorAll('#contactsList tbody tr').length,
      // THE invariant. #contactsList is rebuilt with innerHTML on every keystroke; anything
      // holding state or focus that lives inside it is destroyed mid-word (ROADMAP S3).
      searchOutside: !inside('contactSearch'),
      selectsOutside: ['ctfStatus', 'ctfSource', 'ctfCategory', 'ctfFlag', 'ctfOwner', 'ctAdvJoin', 'ctViewName']
        .every(id => !inside(id)),
      strayInputs: [...list.querySelectorAll('input')].filter(i => i.type !== 'checkbox').length,
      straySelects: list.querySelectorAll('select').length,
      viewButtons: [...document.querySelectorAll('#ctViews .ct-view')].map(b => b.getAttribute('data-view')),
    };
  });
  ok('the six columns are Name / Status / Source / Next action / Last activity / Owner',
    same(r.headers.slice(1), ['Name', 'Status', 'Source', 'Next action', 'Last activity', 'Owner']), r.headers);
  ok('all thirteen fixture contacts render as rows', r.rowCount === 13, r.rowCount);
  ok('the search box is OUTSIDE the rebuilt container', r.searchOutside);
  ok('every filter control is OUTSIDE the rebuilt container', r.selectsOutside);
  ok('the rebuilt container holds no text input but the row checkboxes', r.strayInputs === 0, r.strayInputs);
  ok('the rebuilt container holds no <select> at all', r.straySelects === 0, r.straySelects);
  ok('the five default views ship as buttons, plus All contacts',
    same(r.viewButtons, ['followup', 'unworked', 'newweek', 'nonext', 'health', '']), r.viewButtons);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n2. Default sort answers "who do I call today" — overdue first, no next action last');
{
  const { ctx, page, errs } = await open(browser, '#contacts');
  const r = await page.evaluate(() => ({
    ids: [...document.querySelectorAll('#contactsList tbody tr')].map(t => t.getAttribute('data-pid')),
    next: [...document.querySelectorAll('#contactsList tbody tr')].map(t => {
      const b = t.querySelector('.ct-due');
      return b ? b.className.replace('ct-due', '').trim() : 'none';
    }),
    firstCellText: (document.querySelector('#contactsList tbody tr .ct-due') || {}).textContent,
  }));
  ok('the three contacts with a next action sort to the top',
    same(r.ids.slice(0, 3), ['p01', 'p06', 'p08']), r.ids);
  ok('and in overdue → today → future order',
    same(r.next.slice(0, 3), ['overdue', 'today', 'future']), r.next);
  ok('everyone with no next action sinks below them',
    r.next.slice(3).every(s => s === 'none'), r.next);
  ok('the overdue badge names the date', /Overdue/.test(r.firstCellText || ''), r.firstCellText);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n3. The five default views, against hand-computed expectations');
{
  const { ctx, page, errs } = await open(browser, '#contacts');
  for (const [code, want] of Object.entries(EXPECT)) {
    const got = await page.evaluate(async (c) => {
      bwCtSetView(c);
      await new Promise(r => setTimeout(r, 60));
      return [...document.querySelectorAll('#contactsList tbody tr')].map(t => t.getAttribute('data-pid'));
    }, code);
    ok('view "' + code + '" returns exactly ' + want.join(','), same(sorted(got), sorted(want)), got);
    // The count printed on the button must be the count you get by pressing it — a badge that
    // disagrees with its own list is worse than no badge.
    const badge = await page.evaluate((c) =>
      document.querySelector('#ctViews .ct-view[data-view="' + c + '"] .n').textContent, code);
    ok('view "' + code + '" badge count matches its own list', +badge === want.length, { badge, want: want.length });
  }
  const fixable = await page.evaluate(async () => {
    // bwCtSetView TOGGLES, and the loop above left 'health' already on.
    if (_bwCtView.view !== 'health') bwCtSetView('health');
    await new Promise(r => setTimeout(r, 60));
    return {
      col: [...document.querySelectorAll('#contactsList thead th')].map(t => t.textContent.trim()).includes('Missing'),
      issues: [...document.querySelectorAll('#contactsList tbody tr')].map(t => ({
        id: t.getAttribute('data-pid'),
        buttons: [...t.querySelectorAll('.ct-fix')].map(b => b.textContent.trim()),
      })),
    };
  });
  ok('Data health adds a Missing column', fixable.col);
  ok('every health problem renders as a CLICKABLE fix, not just a label',
    fixable.issues.every(r => r.buttons.length > 0)
    && fixable.issues.find(r => r.id === 'p05').buttons.length === 4
    && same(fixable.issues.find(r => r.id === 'p12').buttons, ['No source'])
    && same(fixable.issues.find(r => r.id === 'p06').buttons, ['Phone is not 10 digits']), fixable.issues);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n4. Data health is fixable inline — click, type, Enter, saved');
{
  const { ctx, page, errs } = await open(browser, '#contacts?view=health');
  const r = await page.evaluate(async () => {
    const before = [...document.querySelectorAll('#contactsList tbody tr')].map(t => t.getAttribute('data-pid'));
    // p12's only problem is a missing source; fixing it should drop it out of the view.
    document.querySelector('tr[data-pid="p12"] .ct-fix').click();
    await new Promise(r => setTimeout(r, 60));
    const sel = document.querySelector('tr[data-pid="p12"] #ctFixIn');
    const isSelect = sel && sel.tagName === 'SELECT';
    sel.value = 'referral';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 250));
    return {
      before, isSelect,
      stored: (window.__fake.get('parties/p12') || {}).source,
      after: [...document.querySelectorAll('#contactsList tbody tr')].map(t => t.getAttribute('data-pid')),
      writes: window.__fake.log().filter(l => l.op === 'set' && l.path.indexOf('parties') === 0).map(l => l.path),
    };
  });
  ok('the health list starts as the three incomplete records', same(sorted(r.before), sorted(EXPECT.health)), r.before);
  ok('a taxonomy gap offers a select, not a free-text box', r.isSelect);
  ok('the fix writes the code to the party record', r.stored === 'referral', r.stored);
  ok('and the row leaves the view once it is clean', same(sorted(r.after), ['p05', 'p06']), r.after);
  ok('the fix wrote ONE per-record path', same(r.writes, ['parties/p12']), r.writes);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n5. Free text searches all phones, all emails, and note bodies');
{
  const { ctx, page, errs } = await open(browser, '#contacts');
  const q = async (v) => page.evaluate(async (x) => {
    const box = document.getElementById('contactSearch');
    box.value = x; box.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 60));
    return [...document.querySelectorAll('#contactsList tbody tr')].map(t => t.getAttribute('data-pid'));
  }, v);
  ok('by name', same(await q('marchetti'), ['p03']));
  ok('by a NON-primary email — the old box only ever looked at the primary',
    same(await q('dov.r@example.com'), ['p04']));
  ok('by a NON-primary phone', same(await q('2065550204'), ['p04']));
  ok('by a formatted phone the record stores as digits', same(await q('(206) 555-0109'), ['p09']));
  ok('by note body — nothing in the old search read a note at all', same(await q('voicemail'), ['p09']));
  ok('an empty query returns everyone back', (await q('')).length === 13);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n6. Every operator, including is empty and the date comparators');
{
  const { ctx, page, errs } = await open(browser, '#contacts');
  const adv = async (rows, join) => page.evaluate(async (a) => {
    bwCtClearAll();
    a.rows.forEach((r, i) => { bwCtAddAdvRow(); bwCtSetAdv(i, 'f', r.f); bwCtSetAdv(i, 'op', r.op); if (r.v != null) bwCtSetAdv(i, 'v', r.v); });
    if (a.join) bwCtSetJoin(a.join);
    await new Promise(r => setTimeout(r, 60));
    return [...document.querySelectorAll('#contactsList tbody tr')].map(t => t.getAttribute('data-pid'));
  }, { rows, join });

  ok('is',            same(sorted(await adv([{ f: 'status', op: 'is', v: 'working' }])), ['p01', 'p03', 'p08', 'p12', 'p13']));
  ok('is not — and it INCLUDES the records with no status at all',
     same(sorted(await adv([{ f: 'status', op: 'not', v: 'working' }])), ['p02', 'p04', 'p05', 'p06', 'p07', 'p09', 'p10', 'p11']));
  ok('contains',      same(sorted(await adv([{ f: 'email', op: 'has', v: 'example.com' }])), ['p01', 'p04', 'p08', 'p10', 'p11', 'p12']));
  ok("doesn't contain", same(sorted(await adv([{ f: 'last', op: 'nothas', v: 'a' }])), ['p01', 'p06']));
  ok('begins with',   same(sorted(await adv([{ f: 'last', op: 'begins', v: 'Ma' }])), ['p03']));
  ok('ends with',     same(sorted(await adv([{ f: 'last', op: 'ends', v: 'sen' }])), ['p04', 'p07']));
  ok('is empty',      same(sorted(await adv([{ f: 'email', op: 'empty' }])), ['p02', 'p03', 'p05', 'p06', 'p07', 'p09', 'p13']));
  ok('is not empty',  same(sorted(await adv([{ f: 'city', op: 'notempty' }])), ['p01', 'p02', 'p03', 'p04']));
  ok('date before',   same(sorted(await adv([{ f: 'dob', op: 'before', v: '1960-01-01' }])), ['p01', 'p02']));
  ok('date after',    same(sorted(await adv([{ f: 'dob', op: 'after', v: '1960-01-01' }])), ['p03']));
  ok('date on',       same(sorted(await adv([{ f: 'dob', op: 'on', v: '1970-06-30' }])), ['p03']));
  ok('numeric more-than on open to-dos', same(sorted(await adv([{ f: 'todos', op: 'after', v: '0' }])), ['p01', 'p06', 'p08']));
  ok('flag is',       same(sorted(await adv([{ f: 'flag', op: 'is', v: 'veteran' }])), ['p01']));
  ok('owner is mine', (await adv([{ f: 'owner', op: 'is', v: 'me' }])).length === 13);
  ok('AND joins two rows',
     same(sorted(await adv([{ f: 'status', op: 'is', v: 'working' }, { f: 'city', op: 'notempty' }], 'and')), ['p01', 'p03']));
  ok('OR joins two rows',
     same(sorted(await adv([{ f: 'last', op: 'begins', v: 'Ma' }, { f: 'last', op: 'begins', v: 'Va' }], 'or')), ['p03', 'p05']));
  ok('there is no cap on rows — five join fine',
     same(await adv([{ f: 'status', op: 'is', v: 'working' }, { f: 'city', op: 'notempty' },
                     { f: 'state', op: 'is', v: 'WA' }, { f: 'email', op: 'notempty' },
                     { f: 'last', op: 'ends', v: 'wick' }], 'and'), ['p01']));
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n7. THE ROUND TRIP — a view is a URL, proven by reloading from the URL alone');
{
  // (a) a basic filter set. EVERY param here is load-bearing: over this fixture,
  //   status=working alone  -> p01 p03 p08 p12
  //   q=o alone             -> everyone with an "o" anywhere
  //   source=cold-call alone-> p03
  // so all three together give p03, and DROPPING ANY ONE OF THEM WIDENS THE RESULT. That is
  // the property that makes this a real round-trip test: an earlier version of this fixture
  // used a query that was decisive on its own, so a serialiser that silently dropped `source`
  // still round-tripped and the assertion passed. Found by sabotage, which is the point of it.
  const a = await open(browser, '#contacts');
  const built = await a.page.evaluate(async () => {
    bwCtSetFilter('status', 'working');
    bwCtSetFilter('source', 'cold-call');
    const box = document.getElementById('contactSearch');
    box.value = 'o'; box.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 60));
    const ids = [...document.querySelectorAll('#contactsList tbody tr')].map(t => t.getAttribute('data-pid'));
    // Prove each param really is decisive, so the round-trip below cannot pass by luck.
    const without = {};
    for (const k of ['status', 'source', 'q']) {
      const keep = _bwCtView[k];
      _bwCtView[k] = ''; renderContactsList();
      without[k] = document.querySelectorAll('#contactsList tbody tr').length;
      _bwCtView[k] = keep;
    }
    renderContactsList();
    return { hash: location.hash, ids, without };
  });
  ok('a basic filter set writes itself into the hash', /status=working/.test(built.hash) && /source=cold-call/.test(built.hash) && /q=o/.test(built.hash), built.hash);
  ok('the filter set narrows to exactly one contact', same(built.ids, ['p03']), built.ids);
  ok('and every param in it is load-bearing — dropping any one widens the list',
    built.without.status > 1 && built.without.source > 1 && built.without.q > 1, built.without);
  const b = await open(browser, built.hash);
  const reloaded = await shownIds(b.page);
  ok('reloading from that hash alone gives the identical id set', same(reloaded, built.ids), { built: built.ids, reloaded });
  ok('and the controls come back set', await b.page.evaluate(() => document.getElementById('ctfStatus').value === 'working'
    && document.getElementById('ctfSource').value === 'cold-call'
    && document.getElementById('contactSearch').value === 'o'));
  await b.ctx.close();

  // (b) an advanced multi-row filter, with a value full of the delimiters the encoding uses
  const built2 = await a.page.evaluate(async () => {
    bwCtClearAll();
    bwCtAddAdvRow(); bwCtSetAdv(0, 'f', 'last'); bwCtSetAdv(0, 'op', 'nothas'); bwCtSetAdv(0, 'v', 'a~b;c&d+e=f%g');
    bwCtAddAdvRow(); bwCtSetAdv(1, 'f', 'status'); bwCtSetAdv(1, 'op', 'not'); bwCtSetAdv(1, 'v', 'sold');
    bwCtAddAdvRow(); bwCtSetAdv(2, 'f', 'phone'); bwCtSetAdv(2, 'op', 'notempty');
    bwCtSetJoin('and');
    await new Promise(r => setTimeout(r, 60));
    return { hash: location.hash, ids: [...document.querySelectorAll('#contactsList tbody tr')].map(t => t.getAttribute('data-pid')),
             adv: JSON.parse(JSON.stringify(_bwCtView.adv)) };
  });
  const c = await open(browser, built2.hash);
  const rt2 = await c.page.evaluate(() => ({
    ids: [...document.querySelectorAll('#contactsList tbody tr')].map(t => t.getAttribute('data-pid')),
    adv: JSON.parse(JSON.stringify(_bwCtView.adv)),
    rows: document.querySelectorAll('#ctAdvRows .ct-advrow').length,
    chips: [...document.querySelectorAll('#ctChips .ct-chip')].map(x => x.textContent.replace('×', '').trim()),
  }));
  ok('an advanced three-row filter round-trips to the identical id set', same(rt2.ids, built2.ids), { built: built2.ids, reloaded: rt2.ids });
  ok('every row comes back, values and all', same(rt2.adv, built2.adv), { want: built2.adv, got: rt2.adv });
  ok('a value carrying ~ ; & + = % survives the encoding byte for byte',
    rt2.adv[0].v === 'a~b;c&d+e=f%g', rt2.adv[0].v);
  ok('the builder redraws all three rows', rt2.rows === 3, rt2.rows);
  ok('and the chips show what is being applied without opening the builder', rt2.chips.length === 4, rt2.chips);
  await c.ctx.close();

  // (c) a sort
  const built3 = await a.page.evaluate(async () => {
    bwCtClearAll();
    bwCtSort('activity'); bwCtSort('activity');   // second click flips to descending
    await new Promise(r => setTimeout(r, 60));
    return { hash: location.hash, ids: [...document.querySelectorAll('#contactsList tbody tr')].map(t => t.getAttribute('data-pid')) };
  });
  ok('a sort lands in the hash', /sort=activity/.test(built3.hash) && /dir=desc/.test(built3.hash), built3.hash);
  const d = await open(browser, built3.hash);
  const rt3 = await shownIds(d.page);
  ok('reloading reproduces the same ORDER, not merely the same set', same(rt3, built3.ids), { built: built3.ids, reloaded: rt3 });
  await d.ctx.close();

  // (d) a saved view + an open contact, and the way back
  const built4 = await a.page.evaluate(async () => {
    bwCtClearAll();
    bwCtSetFilter('status', 'working');
    await new Promise(r => setTimeout(r, 40));
    const listHash = location.hash;
    openContactDetail('p03');
    await new Promise(r => setTimeout(r, 60));
    const detailHash = location.hash;
    closeContactDetail();
    await new Promise(r => setTimeout(r, 60));
    return { listHash, detailHash, backHash: location.hash,
             ids: [...document.querySelectorAll('#contactsList tbody tr')].map(t => t.getAttribute('data-pid')) };
  });
  ok('opening a contact adds it to the URL and keeps the filter', /id=p03/.test(built4.detailHash) && /status=working/.test(built4.detailHash), built4.detailHash);
  ok('closing it returns to the SAME filtered list', built4.backHash === built4.listHash && same(sorted(built4.ids), ['p01', 'p03', 'p08', 'p12', 'p13']), built4);
  ok('no page errors while round-tripping', a.errs.length === 0, a.errs);
  await a.ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n8. An unrecognised param is ignored, never fatal');
{
  const { ctx, page, errs } = await open(browser, '#contacts?status=working&zzz=1&sort=bogus&view=nonesuch&adv=notafield~is~x;last~begins~Ma');
  const r = await page.evaluate(() => ({
    ids: [...document.querySelectorAll('#contactsList tbody tr')].map(t => t.getAttribute('data-pid')),
    sort: _bwCtView.sort, view: _bwCtView.view,
    adv: JSON.parse(JSON.stringify(_bwCtView.adv)),
    rendered: document.querySelectorAll('#contactsList tbody tr').length > 0,
  }));
  ok('the view still renders', r.rendered);
  ok('an unknown param is simply not read', same(sorted(r.ids), ['p03']), r.ids);
  ok('an unknown sort falls back to the default', r.sort === 'next', r.sort);
  ok('an unknown view name falls back to no view', r.view === '', r.view);
  ok('an unknown FIELD inside an advanced row is dropped, and the rest still apply',
    r.adv.length === 1 && r.adv[0].f === 'last', r.adv);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n9. The search box keeps focus and caret across the re-render it causes');
{
  const { ctx, page, errs } = await open(browser, '#contacts');
  // Driven with REAL keyboard input. An in-page element.focus() is a no-op in headless
  // Chromium, so a test that "focuses" and then asserts focus asserts nothing at all.
  await page.click('#contactSearch');
  await page.keyboard.type('marchetti', { delay: 12 });
  const r = await page.evaluate(() => ({
    active: document.activeElement && document.activeElement.id,
    value: document.getElementById('contactSearch').value,
    caret: document.getElementById('contactSearch').selectionStart,
    rows: [...document.querySelectorAll('#contactsList tbody tr')].map(t => t.getAttribute('data-pid')),
  }));
  ok('focus is still in the search box after nine re-renders', r.active === 'contactSearch', r.active);
  ok('every keystroke landed', r.value === 'marchetti', r.value);
  ok('the caret is at the end, not reset to 0', r.caret === 9, r.caret);
  ok('and the list actually filtered', same(r.rows, ['p03']), r.rows);

  // The same, on an advanced-builder value box: typing there must not rebuild the builder.
  await page.evaluate(() => { bwCtClearAll(); bwCtAddAdvRow(); bwCtSetAdv(0, 'f', 'last'); bwCtSetAdv(0, 'op', 'begins'); });
  await page.click('#ctAdvRows input[data-adv="0"]');
  await page.keyboard.type('Rasm', { delay: 12 });
  const r2 = await page.evaluate(() => ({
    active: document.activeElement && document.activeElement.getAttribute('data-adv'),
    value: document.querySelector('#ctAdvRows input[data-adv="0"]').value,
    rows: [...document.querySelectorAll('#contactsList tbody tr')].map(t => t.getAttribute('data-pid')),
  }));
  ok('an advanced value box keeps focus while typing', r2.active === '0', r2.active);
  ok('every keystroke landed there too', r2.value === 'Rasm', r2.value);
  ok('and it filtered as it went', same(r2.rows, ['p04']), r2.rows);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n10. Selection survives a re-render; bulk writes are per-record');
{
  const { ctx, page, errs } = await open(browser, '#contacts');
  const r = await page.evaluate(async () => {
    ['p01', 'p03', 'p08'].forEach(id => bwCtToggleRow(id, true));
    const barBefore = document.getElementById('ctBulk').textContent;
    // A note arriving from the other browser is the re-render that used to lose things.
    await saveContactNote({ partyId: 'p07', body: 'Someone else typed this.' });
    await new Promise(r => setTimeout(r, 80));
    const stillChecked = [...document.querySelectorAll('#contactsList tbody tr')]
      .filter(t => t.querySelector('input[type=checkbox]').checked)
      .map(t => t.getAttribute('data-pid'));
    // …and a filter change, which rebuilds the table from scratch.
    bwCtSetFilter('status', 'working');
    await new Promise(r => setTimeout(r, 60));
    const afterFilter = bwCtSelectedIds();
    bwCtSetFilter('status', '');
    await new Promise(r => setTimeout(r, 60));
    return { barBefore, stillChecked, afterFilter, model: bwCtSelectedIds() };
  });
  ok('a selection raises the sticky bar with the count', /3 selected/.test(r.barBefore), r.barBefore.slice(0, 60));
  ok('the checkboxes are still checked after a store-driven re-render', same(sorted(r.stillChecked), ['p01', 'p03', 'p08']), r.stillChecked);
  ok('and after a filter change', same(sorted(r.afterFilter), ['p01', 'p03', 'p08']), r.afterFilter);

  const w = await page.evaluate(async () => {
    window.__fake.clearLog();
    const res = await bwBulkSetField('status', 'presented');
    await new Promise(r => setTimeout(r, 120));
    const log = window.__fake.log().filter(l => !['once', 'signIn', 'signOut'].includes(l.op));
    return {
      res,
      paths: log.map(l => l.op + ' ' + l.path),
      // A collection-level write is a path with no "/" — the call shape that has destroyed
      // real data on this project twice. There must be none.
      collectionWrites: log.filter(l => l.path.indexOf('/') === -1).map(l => l.path),
      stored: ['p01', 'p03', 'p08'].map(id => window.__fake.get('parties/' + id).status),
      untouched: window.__fake.get('parties/p12').status,
      msg: document.getElementById('ctBulk') ? document.getElementById('ctBulk').textContent : '',
    };
  });
  ok('the bulk change wrote exactly three records', w.res.ok === 3 && w.res.fail === 0 && w.paths.length === 3, w);
  ok('each write is one per-record path', same(w.paths, ['set parties/p01', 'set parties/p03', 'set parties/p08']), w.paths);
  ok('ZERO collection-level writes', w.collectionWrites.length === 0, w.collectionWrites);
  ok('all three records carry the new status', same(w.stored, ['presented', 'presented', 'presented']), w.stored);
  ok('nobody outside the selection was touched', w.untouched === 'working', w.untouched);
  ok('the result is reported honestly, with a count', /3 of 3 updated/.test(w.msg), w.msg.slice(0, 90));

  // Partial failure has to be reported as partial failure, not swallowed.
  const pf = await page.evaluate(async () => {
    bwCtClearSelection();
    ['p02', 'p04'].forEach(id => bwCtToggleRow(id, true));
    const real = window.saveParty;
    let n = 0;
    window.saveParty = function (p) { n++; return n === 2 ? Promise.reject(new Error('nope')) : real(p); };
    const res = await bwBulkSetField('source', 'other');
    window.saveParty = real;
    await new Promise(r => setTimeout(r, 60));
    return { res, msg: document.getElementById('ctBulk').textContent };
  });
  ok('a partial failure counts both sides', pf.res.ok === 1 && pf.res.fail === 1, pf.res);
  ok('and says so on screen rather than showing a spinner that lies', /1 of 2 updated, 1 failed/.test(pf.msg), pf.msg.slice(0, 90));
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n11. Bulk note, to-do and flag — each one record at a time');
{
  const { ctx, page, errs } = await open(browser, '#contacts');
  const r = await page.evaluate(async () => {
    ['p05', 'p07'].forEach(id => bwCtToggleRow(id, true));
    window.__fake.clearLog();
    const n = await bwBulkAddNote('Mailed the 2026 price list.');
    const t = await bwBulkAddTask('Follow up on the mailer', '2026-09-01', 'call');
    const f = await bwBulkFlag('vip', true);
    const log = window.__fake.log().filter(l => !['once', 'signIn', 'signOut'].includes(l.op));
    return {
      n, t, f,
      collectionWrites: log.filter(l => l.path.indexOf('/') === -1).map(l => l.path),
      roots: log.map(l => l.path.split('/')[0]).filter((v, i, a) => a.indexOf(v) === i).sort(),
      noteCounts: ['p05', 'p07'].map(id => bwNotesFor(id).length),
      taskDue: bwNextActionFor('p05').dueOn,
      flags: ['p05', 'p07'].map(id => bwPartyFlags(bwPartyById(id)).join(',')),
    };
  });
  ok('a note landed on each selected contact', r.n.ok === 2 && same(r.noteCounts, [1, 1]), r);
  ok('a to-do landed on each, and becomes their next action', r.t.ok === 2 && r.taskDue === '2026-09-01', r.t);
  ok('the flag was added to each', r.f.ok === 2 && same(r.flags, ['vip', 'vip']), r.flags);
  ok('all three wrote only per-record paths', r.collectionWrites.length === 0, r.collectionWrites);
  ok('and only to the three stores they own', same(r.roots, ['contactNotes', 'contactTasks', 'parties']), r.roots);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n12. Saved views — savedViews/<id>, and a view IS its hash');
{
  const { ctx, page, errs } = await open(browser, '#contacts');
  const r = await page.evaluate(async () => {
    bwCtSetFilter('status', 'working');
    bwCtSort('name');
    await new Promise(r => setTimeout(r, 40));
    const hashAtSave = location.hash;
    window.__fake.clearLog();
    const v = await bwCtSaveCurrentView('Working, by name');
    const log = window.__fake.log().filter(l => !['once', 'signIn', 'signOut'].includes(l.op));
    await new Promise(r => setTimeout(r, 80));
    // Walk away, then come back through the saved view.
    bwCtClearAll();
    await new Promise(r => setTimeout(r, 60));
    const cleared = [...document.querySelectorAll('#contactsList tbody tr')].map(t => t.getAttribute('data-pid'));
    bwCtApplySavedView(v.id);
    await new Promise(r => setTimeout(r, 80));
    return {
      hashAtSave, stored: window.__fake.get('savedViews/' + v.id),
      paths: log.map(l => l.op + ' ' + l.path),
      collectionWrites: log.filter(l => l.path.indexOf('/') === -1).map(l => l.path),
      cleared: cleared.length,
      applied: [...document.querySelectorAll('#contactsList tbody tr')].map(t => t.getAttribute('data-pid')),
      hashAfter: location.hash,
      chip: (document.querySelector('#ctSaved .ct-chip button') || {}).textContent,
    };
  });
  ok('the record is written at savedViews/<id>, per record', same(r.paths.filter(p => /savedViews/.test(p)).length, 1)
    && /^set savedViews\/.+/.test(r.paths.find(p => /savedViews/.test(p))), r.paths);
  ok('never a whole-collection write', r.collectionWrites.length === 0, r.collectionWrites);
  ok('the record carries name, hash, pinned, owner and provenance',
    r.stored && r.stored.name === 'Working, by name' && r.stored.hash === r.hashAtSave
    && r.stored.pinned === false && !!r.stored.ownerUid && !!r.stored._prov
    && !!r.stored.createdAt && !!r.stored.updatedAt, r.stored);
  ok('clearing the filters really did clear them', r.cleared === 13, r.cleared);
  ok('applying the saved view restores the exact list', same(sorted(r.applied), ['p01', 'p03', 'p08', 'p12', 'p13']), r.applied);
  ok('and the URL with it — a saved view is nothing but a hash', r.hashAfter === r.hashAtSave, { want: r.hashAtSave, got: r.hashAfter });
  ok('it appears in the saved-views panel', /Working, by name/.test(r.chip || ''), r.chip);

  const r2 = await page.evaluate(async () => {
    const id = Object.keys(_savedViewStore)[0];
    await toggleSavedViewPin(id);
    await new Promise(r => setTimeout(r, 60));
    const pinnedChip = (document.querySelector('#ctSaved .ct-chip button') || {}).textContent;
    await renameSavedView(id, 'Renamed');
    await new Promise(r => setTimeout(r, 60));
    const renamed = window.__fake.get('savedViews/' + id).name;
    await deleteSavedView(id);
    await new Promise(r => setTimeout(r, 60));
    return { pinned: window.__fake.get('savedViews/' + id) === null || _savedViewStore[id] === undefined,
             pinnedChip, renamed, gone: window.__fake.get('savedViews/' + id),
             panel: document.getElementById('ctSaved').innerHTML };
  });
  ok('pinning marks it', /★/.test(r2.pinnedChip || ''), r2.pinnedChip);
  ok('renaming rewrites only the name', r2.renamed === 'Renamed', r2.renamed);
  ok('deleting removes the record and the chip', r2.gone === null && r2.panel === '', r2.gone);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n13. CSV export — the one function Track C reuses');
{
  const { ctx, page, errs } = await open(browser, '#contacts');
  const r = await page.evaluate(async () => {
    // A value that needs RFC 4180 quoting, planted through the normal save path.
    const p = JSON.parse(JSON.stringify(bwPartyById('p01')));
    p.interest = 'Niche, "west wall"\nsecond line';
    await saveParty(p);
    await new Promise(r => setTimeout(r, 60));
    const csv = bwContactsToCsv(['p01', 'p02']);
    return { csv, lines: csv.split('\r\n').length, header: csv.split('\r\n')[0] };
  });
  ok('the header names the columns', /^Prefix,First,Middle,Last/.test(r.header), r.header);
  ok('one header row plus one row per id', r.lines === 3, r.lines);
  ok('records are separated by CRLF', /\r\n/.test(r.csv));
  ok('a comma, a quote and a newline are all quoted and escaped',
    r.csv.indexOf('"Niche, ""west wall""\nsecond line"') > -1, r.csv.slice(0, 400));
  ok('a phone comes out formatted', /\(206\) 555-0101/.test(r.csv));
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n14. Nothing here writes a whole collection node, ever');
{
  const { ctx, page, errs } = await open(browser, '#contacts');
  const r = await page.evaluate(async () => {
    window.__fake.clearLog();
    bwCtSetFilter('status', 'working');
    bwCtSort('activity');
    bwCtSetView('nonext');
    const v = await bwCtSaveCurrentView('Everything at once');
    ['p02', 'p03'].forEach(id => bwCtToggleRow(id, true));
    await bwBulkSetField('category', 'at-need');
    await bwBulkAddNote('bulk');
    await bwCtFixCommit('p05', 'salutation', 'Dear Elin,');
    await deleteSavedView(v.id);
    await new Promise(r => setTimeout(r, 120));
    const log = window.__fake.log().filter(l => !['once', 'signIn', 'signOut'].includes(l.op));
    return {
      total: log.length,
      collectionWrites: log.filter(l => l.path.indexOf('/') === -1).map(l => l.op + ' ' + l.path),
      depths: log.map(l => l.path.split('/').length).filter((v, i, a) => a.indexOf(v) === i),
    };
  });
  ok('a full session of filtering, saving and bulk-editing wrote something', r.total >= 7, r.total);
  ok('and not one of those writes was collection-level', r.collectionWrites.length === 0, r.collectionWrites);
  ok('every path is <collection>/<id>', same(r.depths, [2]), r.depths);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

await browser.close();
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
