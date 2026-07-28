// Sprint-05 Track C — the Contacts home screen.
//
// The operator's complaint was that clicking Contacts showed a running list and nothing else.
// This suite proves the replacement is honest rather than decorative:
//
//   · EVERY count on the home screen equals the number of rows you get by clicking it. Both
//     sides are read out of RENDERED DOM — the number as text inside the card, and the row
//     count of the real table. Nothing here asks the code what it thinks the answer is.
//   · The list is still reachable by its own URL. A saved view bookmarked yesterday, or
//     pasted to the other counselor, must land on the filtered list and never bounce home.
//   · The "coming soon" options are inert: no navigation, no console error, no exception.
//   · Recently-viewed records an opened contact, caps at ten, and survives a reload.
//   · A fresh database renders without throwing.
//
// Fixtures are synthetic by rule: invented names, 555-range phones, @example.com. Fake
// Firebase only; the gstatic firebasejs request is aborted, so production is never contacted.
import { chromium } from 'playwright';
import fs from 'fs';

const BASE = process.env.BW_BASE || 'http://localhost:3737/';
const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sorted = (a) => a.slice().sort();

// Days relative to LOCAL today, computed here in Node — independently of the app's bwToday(),
// so a bug in that helper cannot make these expectations agree with it.
const day = (o) => { const d = new Date(); d.setDate(d.getDate() + o); const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
const TODAY = day(0);
const NOW = Date.now(), D = 86400000;
const UID = 'uid_tester@bwquote.local';

const P = (id, given, family, extra) => Object.assign({
  id, given, family, kind: 'person', ownerUid: UID,
  createdAt: NOW - 45 * D, createdBy: UID, updatedAt: NOW - 45 * D, updatedBy: UID,
  salutation: 'Dear ' + given + ',',
}, extra || {});
const ph = (v) => ({ p1: { value: v, type: 'mobile', isPrimary: true, note: '' } });

// ── the fixture ──────────────────────────────────────────────────────────────────────
// Fourteen invented people, shaped so that the four needs-attention counts are all DIFFERENT
// from each other and the five view counts are all different from each other. A card wired to
// the wrong view therefore fails on the number alone, before the id-set assertion even runs.
const PARTIES = {
  h01: P('h01', 'Ada',   'Fenwick',   { status: 'working',         source: 'walk-in',         phones: ph('2065550101') }),
  h02: P('h02', 'Bo',    'Ilesanmi',  { status: 'new',             source: 'referral',        phones: ph('2065550102') }),
  h03: P('h03', 'Cleo',  'Marchetti', { status: 'working',         source: 'cold-call',       phones: ph('2065550103') }),
  h04: P('h04', 'Dov',   'Rasmussen', { status: 'sold',            source: 'direct-mail',     phones: ph('2065550104') }),
  h05: P('h05', 'Elin',  'Vargas',    { status: 'appointment-set', source: 'web-lead',        phones: ph('2065550105'), createdAt: NOW - 2 * D }),
  // No source: one data-health problem, and the only one of the fourteen that is unworked AND incomplete.
  h06: P('h06', 'Fitz',  'Okonkwo',   { status: 'new',                                        phones: ph('2065550106') }),
  h07: P('h07', 'Gita',  'Halvorsen', { status: 'working',         source: 'community-event', phones: ph('2065550107') }),
  h08: P('h08', 'Hugo',  'Brennan',   { status: 'do-not-contact',  source: 'cold-call',       phones: ph('2065550108') }),
  // Empty salutation: the second data-health problem, on a record that is otherwise complete.
  h09: Object.assign(P('h09', 'Ivy', 'Sandoval', { status: 'not-interested', source: 'phone-in', phones: ph('2065550109') }), { salutation: '' }),
  h10: P('h10', 'Jonas', 'Petrakis',  { status: 'presented',       source: 'referral',        phones: ph('2065550110'), createdAt: NOW - 20 * D }),
  h11: P('h11', 'Kira',  'Ashworth',  { status: 'new',             source: 'existing-owner',  phones: ph('2065550111') }),
  h12: P('h12', 'Liam',  'Okafor',    { status: 'working',         source: 'walk-in',         phones: ph('2065550112') }),
  h13: P('h13', 'Wren',  'Ashby',     { status: 'working',         source: 'cold-call',       phones: ph('2065550113') }),
  h14: P('h14', 'Yusuf', 'Delgado',   { status: 'new',             source: 'referral',        phones: ph('2065550114') }),
};
const TASKS = {
  k01: { id: 'k01', partyId: 'h01', summary: 'Ring about the niche',  dueOn: day(-1), category: 'call',      status: 'open', ownerUid: UID, createdAt: NOW - 9 * D, updatedAt: NOW - 9 * D },
  k02: { id: 'k02', partyId: 'h02', summary: 'Send the brochure',     dueOn: day(-3), category: 'letter',    status: 'open', ownerUid: UID, createdAt: NOW - 9 * D, updatedAt: NOW - 9 * D },
  k03: { id: 'k03', partyId: 'h03', summary: 'Confirm the visit',     dueOn: day(0),  category: 'call',      status: 'open', ownerUid: UID, createdAt: NOW - 4 * D, updatedAt: NOW - 4 * D },
  k04: { id: 'k04', partyId: 'h05', summary: 'Walk the section',      dueOn: day(0),  category: 'meeting',   status: 'open', ownerUid: UID, createdAt: NOW - 2 * D, updatedAt: NOW - 2 * D },
  k05: { id: 'k05', partyId: 'h13', summary: 'Price the companion',   dueOn: day(-5), category: 'call',      status: 'open', ownerUid: UID, createdAt: NOW - 12 * D, updatedAt: NOW - 12 * D },
  // Done, and dated in the past: it must NOT make h12 overdue, and must not count as a next action.
  k06: { id: 'k06', partyId: 'h12', summary: 'Deed paperwork',        dueOn: day(-1), category: 'paperwork', status: 'done', doneAt: NOW - 2 * D, ownerUid: UID, createdAt: NOW - 12 * D, updatedAt: NOW - 2 * D },
};
const NOTES = {
  // Older than the 30-day window, so h07 is still "unworked".
  m01: { id: 'm01', partyId: 'h07', body: 'Left a voicemail.',   pinned: false, ownerUid: UID, createdAt: NOW - 40 * D, updatedAt: NOW - 40 * D },
  // Inside the window, so h11 is NOT unworked.
  m02: { id: 'm02', partyId: 'h11', body: 'Mailed the pricing.', pinned: false, ownerUid: UID, createdAt: NOW - 2 * D,  updatedAt: NOW - 2 * D },
};
const SEED = { parties: PARTIES, contactTasks: TASKS, contactNotes: NOTES };
const ALL = Object.keys(PARTIES);

// Hand-computed from the fixture above by reading the rules, NOT by running the code and
// writing down what it said.
const ATTENTION = {
  overdue:  ['h01', 'h02', 'h13'],                                  // earliest open to-do is before today
  duetoday: ['h03', 'h05'],                                         // earliest open to-do is today
  unworked: ['h06', 'h07', 'h12', 'h14'],                           // new/working, no open to-do, no note in 30 days
  nonext:   ['h06', 'h07', 'h10', 'h11', 'h12', 'h14'],             // still live, and zero open to-dos
};
const VIEWS = {
  followup: ['h01', 'h02', 'h03', 'h05', 'h13'],                    // an open to-do due today or earlier
  unworked: ATTENTION.unworked,
  newweek:  ['h05'],                                                // created in the last 7 days
  nonext:   ATTENTION.nonext,
  health:   ['h06', 'h09'],                                         // missing source / missing salutation
};

async function open(browser, hash, seed) {
  const ctx = await browser.newContext();
  await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 220)); });
  page.on('dialog', d => d.accept());
  await page.addInitScript(FAKE);
  await page.addInitScript(`window.__fake.addAccount('tester@bwquote.local','pw');
    window.__fake.seed(${JSON.stringify(seed === undefined ? SEED : seed)});`);
  await page.goto(BASE + (hash || ''), { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('tester@bwquote.local', 'pw'));
  await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
  const want = seed === undefined ? ALL.length : Object.keys((seed || {}).parties || {}).length;
  await page.waitForFunction((n) => typeof _parties !== 'undefined' && _parties.length === n, want, { timeout: 20000 });
  await page.waitForTimeout(150);
  return { ctx, page, errs };
}

const activeSection = (page) => page.evaluate(() => {
  const s = document.querySelector('.section.active');
  return s ? s.id : null;
});
// The answer as the SCREEN gives it, never as the model gives it.
const shownIds = (page) => page.evaluate(() =>
  [...document.querySelectorAll('#contactsList tbody tr')].map(t => t.getAttribute('data-pid')));

async function goHome(page) {
  await page.evaluate(() => {
    if (location.hash === '#contacts-home') show('contacts-home', null);
    else location.hash = '#contacts-home';
  });
  await page.waitForFunction(() =>
    document.getElementById('section-contacts-home').classList.contains('active')
    && document.querySelectorAll('#cthAtt .cth-card').length > 0, { timeout: 10000 });
  await page.waitForTimeout(60);
}

// Read the number printed inside a home-screen card, as text, from the DOM.
const cardCount = (page, sel) => page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return null;
  const n = el.querySelector('.n');
  return n ? n.textContent.trim() : null;
}, sel);

const browser = await chromium.launch();

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n1. Contacts in the sidebar opens a HOME SCREEN, not the running list');
{
  const { ctx, page, errs } = await open(browser, '');
  const nav = await page.evaluate(() => {
    const items = [...document.querySelectorAll('.nav-item')];
    return {
      contactsItems: items.filter(n => /show\('contacts/.test(n.getAttribute('onclick') || ''))
        .map(n => (n.getAttribute('onclick') || '').match(/show\('([^']+)'/)[1]),
      total: items.length,
    };
  });
  ok('there is exactly ONE Contacts item in the sidebar — no 37th nav entry was added',
    nav.contactsItems.length === 1, nav.contactsItems);
  ok('and it opens contacts-home', same(nav.contactsItems, ['contacts-home']), nav.contactsItems);

  await page.click('#navContacts');
  await page.waitForTimeout(200);
  const r = await page.evaluate(() => ({
    section: (document.querySelector('.section.active') || {}).id,
    hash: location.hash,
    navActive: document.getElementById('navContacts').classList.contains('active'),
    panels: [...document.querySelectorAll('#ctHome .cth-h')].map(h => h.textContent.trim()),
    attCards: [...document.querySelectorAll('#cthAtt .cth-card')].map(b => b.querySelector('.l').textContent.trim()),
    viewRows: [...document.querySelectorAll('#cthViews .cth-row')].map(b => b.getAttribute('data-view')),
    // The list itself must NOT be the thing on screen.
    listVisible: document.getElementById('section-contacts').classList.contains('active'),
    // Nothing in the rebuilt container may hold focus or state — same rule as #ctChrome.
    strayInputs: document.querySelectorAll('#ctHome input, #ctHome select, #ctHome textarea').length,
  }));
  ok('clicking it activates #section-contacts-home', r.section === 'section-contacts-home', r.section);
  ok('and the list section is not what is showing', r.listVisible === false);
  ok('the URL is #contacts-home', r.hash === '#contacts-home', r.hash);
  ok('the sidebar item stays highlighted', r.navActive);
  ok('the six panels are Needs attention / Quick actions / Views / Recently viewed / Saved views / Coming soon',
    same(r.panels, ['Needs attention', 'Quick actions', 'Views', 'Recently viewed', 'Saved views', 'Coming soon']), r.panels);
  ok('the needs-attention strip is Overdue / Due today / Unworked / No next action',
    same(r.attCards, ['Overdue', 'Due today', 'Unworked', 'No next action']), r.attCards);
  ok('all five built-in views appear as cards',
    same(r.viewRows, ['followup', 'unworked', 'newweek', 'nonext', 'health']), r.viewRows);
  ok('the home screen holds no input, select or textarea at all', r.strayInputs === 0, r.strayInputs);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n2. Every needs-attention count equals the rows you get by clicking it');
{
  const { ctx, page, errs } = await open(browser, '#contacts-home');
  await goHome(page);
  for (const [key, want] of Object.entries(ATTENTION)) {
    const shown = await cardCount(page, '#cthAtt .cth-card[data-att="' + key + '"]');
    await page.click('#cthAtt .cth-card[data-att="' + key + '"]');
    await page.waitForFunction(() =>
      document.getElementById('section-contacts').classList.contains('active'), { timeout: 10000 });
    await page.waitForTimeout(120);
    const ids = await shownIds(page);
    ok('"' + key + '" card says ' + shown + ' and its list has ' + ids.length + ' rows',
      String(ids.length) === shown, { shown, rows: ids.length });
    ok('"' + key + '" opens exactly ' + want.join(','), same(sorted(ids), sorted(want)), ids);
    await goHome(page);
  }
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n3. The same for all five view cards');
{
  const { ctx, page, errs } = await open(browser, '#contacts-home');
  await goHome(page);
  for (const [code, want] of Object.entries(VIEWS)) {
    const shown = await cardCount(page, '#cthViews .cth-row[data-view="' + code + '"]');
    await page.click('#cthViews .cth-row[data-view="' + code + '"]');
    await page.waitForFunction(() =>
      document.getElementById('section-contacts').classList.contains('active'), { timeout: 10000 });
    await page.waitForTimeout(120);
    const r = await page.evaluate(() => ({
      ids: [...document.querySelectorAll('#contactsList tbody tr')].map(t => t.getAttribute('data-pid')),
      hash: location.hash,
    }));
    ok('view card "' + code + '" says ' + shown + ' and its list has ' + r.ids.length + ' rows',
      String(r.ids.length) === shown, { shown, rows: r.ids.length });
    ok('view card "' + code + '" opens exactly ' + want.join(','), same(sorted(r.ids), sorted(want)), r.ids);
    ok('view card "' + code + '" links to that view, not another', r.hash === '#contacts?view=' + code, r.hash);
    await goHome(page);
  }
  // And the "All contacts" quick action, whose count is the whole book.
  const allShown = await cardCount(page, '#cthActions .cth-act[data-all="1"]');
  await page.click('#cthActions .cth-act[data-all="1"]');
  await page.waitForFunction(() => document.getElementById('section-contacts').classList.contains('active'), { timeout: 10000 });
  await page.waitForTimeout(120);
  const allIds = await shownIds(page);
  ok('"All contacts" says ' + allShown + ' and opens ' + allIds.length + ' rows',
    String(allIds.length) === allShown && allIds.length === ALL.length, { allShown, rows: allIds.length });

  // The list's own view strip must be untouched by this track — still the five plus All.
  const strip = await page.evaluate(() => [...document.querySelectorAll('#ctViews .ct-view')].map(b => b.getAttribute('data-view')));
  ok('the list keeps exactly its five built-in views plus All contacts — no view was added to it',
    same(strip, ['followup', 'unworked', 'newweek', 'nonext', 'health', '']), strip);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n4. The list still owns its URL — a bookmarked view lands on the list, not here');
{
  // (a) a saved view, created the way one really is, then loaded cold from its own hash.
  const a = await open(browser, '#contacts');
  const built = await a.page.evaluate(async () => {
    bwCtSetFilter('status', 'working');
    bwCtSort('name');
    await new Promise(r => setTimeout(r, 60));
    const v = await bwCtSaveCurrentView('Working, by name');
    await new Promise(r => setTimeout(r, 80));
    return { hash: v.hash, id: v.id,
             ids: [...document.querySelectorAll('#contactsList tbody tr')].map(t => t.getAttribute('data-pid')) };
  });
  ok('the saved view really does narrow the list', same(sorted(built.ids), ['h01', 'h03', 'h07', 'h12', 'h13']), built.ids);
  await a.ctx.close();

  const b = await open(browser, built.hash);
  const rb = await b.page.evaluate(() => ({
    section: (document.querySelector('.section.active') || {}).id,
    ids: [...document.querySelectorAll('#contactsList tbody tr')].map(t => t.getAttribute('data-pid')),
  }));
  ok('loading that hash cold lands on the LIST, not the home screen', rb.section === 'section-contacts', rb.section);
  ok('and on the same filtered rows', same(sorted(rb.ids), sorted(built.ids)), rb.ids);
  ok('no page errors', b.errs.length === 0, b.errs);
  await b.ctx.close();

  // (b) the plain hashes: bare, a built-in view, and a single-contact deep link.
  //
  // NOTE on '#contacts?id=<partyId>': on a COLD load it lands on the list but does NOT open
  // the detail panel, because bwCtApplyHash() runs before Firebase has delivered the parties
  // and bwPartyById() therefore returns nothing. That is PRE-EXISTING behaviour on main —
  // verified 2026-07-27 by running the identical probe against an unmodified main and against
  // this branch, which gave byte-identical answers. It is not this track's to fix (the fix
  // belongs next to bwCtApplyHash and the detail panel), so what is asserted here is the part
  // that IS this track's: the deep link must not bounce to the new home screen. The
  // already-loaded path — which is the one every card and every recently-viewed row uses — is
  // asserted to really open the contact, below and in section 6.
  for (const [hash, want] of [
    ['#contacts', ALL],
    ['#contacts?view=health', VIEWS.health],
    ['#contacts?id=h03', null],
  ]) {
    const c = await open(browser, hash);
    const rc = await c.page.evaluate(() => ({
      section: (document.querySelector('.section.active') || {}).id,
      ids: [...document.querySelectorAll('#contactsList tbody tr')].map(t => t.getAttribute('data-pid')),
    }));
    ok(hash + ' lands on the list section, never on the home screen', rc.section === 'section-contacts', rc.section);
    if (want) ok(hash + ' shows exactly the right rows', same(sorted(rc.ids), sorted(want)), rc.ids);
    ok('no page errors on ' + hash, c.errs.length === 0, c.errs);
    await c.ctx.close();
  }

  // The same deep link, arrived at from the home screen with the app already loaded.
  const e = await open(browser, '#contacts-home');
  await goHome(e.page);
  const re = await e.page.evaluate(async () => {
    bwCtHomeOpenContact('h03');
    await new Promise(r => setTimeout(r, 260));
    return { section: (document.querySelector('.section.active') || {}).id,
             hash: location.hash, openId: window._bwDetailId || null,
             detailOpen: document.getElementById('contactDetail').style.display !== 'none' };
  });
  ok('#contacts?id= reached from the home screen opens that contact on the list section',
    re.section === 'section-contacts' && re.openId === 'h03' && re.detailOpen, re);
  ok('no page errors', e.errs.length === 0, e.errs);
  await e.ctx.close();

  // (c) a saved view is reachable FROM the home screen too, and lands on the same rows.
  const d = await open(browser, '#contacts');
  const rd = await d.page.evaluate(async () => {
    bwCtSetFilter('status', 'working');
    const v = await bwCtSaveCurrentView('Working');
    await new Promise(r => setTimeout(r, 80));
    location.hash = '#contacts-home';
    await new Promise(r => setTimeout(r, 220));
    const chip = document.querySelector('#cthSaved .cth-row[data-saved="' + v.id + '"]');
    const label = chip ? chip.textContent.trim() : null;
    chip.click();
    await new Promise(r => setTimeout(r, 260));
    return { label, section: (document.querySelector('.section.active') || {}).id,
             ids: [...document.querySelectorAll('#contactsList tbody tr')].map(t => t.getAttribute('data-pid')) };
  });
  ok('a saved view is listed on the home screen', rd.label === 'Working', rd.label);
  ok('and clicking it goes to the list', rd.section === 'section-contacts', rd.section);
  ok('with the saved view applied', same(sorted(rd.ids), ['h01', 'h03', 'h07', 'h12', 'h13']), rd.ids);
  ok('no page errors', d.errs.length === 0, d.errs);
  await d.ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n5. The "coming soon" options read as coming, and are inert');
{
  const { ctx, page, errs } = await open(browser, '#contacts-home');
  await goHome(page);
  const shape = await page.evaluate(() => [...document.querySelectorAll('#cthSoon .cth-soon')].map(e => ({
    label: e.getAttribute('data-soon'),
    tag: e.tagName,
    href: e.getAttribute('href'),
    onclick: e.getAttribute('onclick'),
    text: e.textContent.trim(),
    disabled: e.getAttribute('aria-disabled'),
  })));
  ok('four placeholders ship — Calendar, Letters, Email, Reports',
    same(shape.map(s => s.label), ['Calendar', 'Letters', 'Email', 'Reports']), shape.map(s => s.label));
  ok('none of them is a link or a button', shape.every(s => s.tag === 'SPAN' && !s.href), shape);
  ok('none of them has a handler at all', shape.every(s => s.onclick === null), shape.map(s => s.onclick));
  ok('each is labelled as coming rather than looking broken',
    shape.every(s => /Soon/i.test(s.text)) && shape.every(s => s.disabled === 'true'), shape.map(s => s.text));

  const before = await page.evaluate(() => ({ hash: location.hash, section: (document.querySelector('.section.active') || {}).id }));
  const errsBefore = errs.length;
  for (const label of ['Calendar', 'Letters', 'Email', 'Reports']) {
    await page.click('#cthSoon .cth-soon[data-soon="' + label + '"]');
    await page.waitForTimeout(80);
  }
  const after = await page.evaluate(() => ({ hash: location.hash, section: (document.querySelector('.section.active') || {}).id }));
  ok('clicking every one of them navigates nowhere', after.hash === before.hash && after.section === before.section, { before, after });
  ok('and throws nothing and logs no error', errs.length === errsBefore, errs.slice(errsBefore));
  ok('the home screen is still standing afterwards',
    (await page.evaluate(() => document.querySelectorAll('#cthAtt .cth-card').length)) === 4);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n6. Recently viewed — records an opened contact, caps at ten, survives a reload');
{
  const { ctx, page, errs } = await open(browser, '#contacts');
  await page.evaluate(() => { try { localStorage.removeItem('bw_ct_recent'); } catch (e) {} });

  // Open one contact, the way the list does it, and check it lands on the home screen.
  await page.evaluate(async () => { openContactDetail('h04'); await new Promise(r => setTimeout(r, 80)); });
  await goHome(page);
  const one = await page.evaluate(() => [...document.querySelectorAll('#cthRecent .cth-row')].map(b => ({
    id: b.getAttribute('data-recent'), text: b.textContent.trim() })));
  ok('opening a contact records it', one.length === 1 && one[0].id === 'h04', one);
  ok('and it is shown by name, looked up live', /Dov Rasmussen/.test(one[0].text), one[0].text);

  // Twelve more, oldest first, so the cap and the order are both exercised.
  const order = ['h01', 'h02', 'h03', 'h05', 'h06', 'h07', 'h08', 'h09', 'h10', 'h11', 'h12', 'h13'];
  await page.evaluate(async (ids) => {
    for (const id of ids) { openContactDetail(id); await new Promise(r => setTimeout(r, 25)); }
    closeContactDetail();
  }, order);
  await goHome(page);
  const many = await page.evaluate(() => [...document.querySelectorAll('#cthRecent .cth-row')].map(b => b.getAttribute('data-recent')));
  ok('the list caps at ten', many.length === 10, many.length);
  ok('newest first, and the oldest three fell off',
    same(many, order.slice(-10).reverse()), { got: many, want: order.slice(-10).reverse() });
  ok('h04, opened first of all, is gone', many.indexOf('h04') === -1, many);

  // Re-opening one already in the list moves it to the front instead of duplicating it.
  await page.evaluate(async () => { openContactDetail('h07'); await new Promise(r => setTimeout(r, 60)); closeContactDetail(); });
  await goHome(page);
  const bumped = await page.evaluate(() => [...document.querySelectorAll('#cthRecent .cth-row')].map(b => b.getAttribute('data-recent')));
  ok('re-opening a contact moves it to the front and does not duplicate it',
    bumped[0] === 'h07' && bumped.filter(x => x === 'h07').length === 1 && bumped.length === 10, bumped);

  // A reload keeps it: it is localStorage, not memory, and not Firebase.
  const writes = await page.evaluate(() => window.__fake.log().filter(l => /recent/i.test(l.path || '')).length);
  ok('nothing about recently-viewed was written to the database', writes === 0, writes);
  await page.reload({ waitUntil: 'load', timeout: 120000 });
  await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('tester@bwquote.local', 'pw'));
  await page.waitForFunction(() => typeof _parties !== 'undefined' && _parties.length === 14, { timeout: 20000 });
  await goHome(page);
  const afterReload = await page.evaluate(() => [...document.querySelectorAll('#cthRecent .cth-row')].map(b => b.getAttribute('data-recent')));
  ok('and it survives a reload, in the same order', same(afterReload, bumped), { before: bumped, after: afterReload });

  // Clicking one goes to that contact.
  await page.click('#cthRecent .cth-row[data-recent="h07"]');
  await page.waitForTimeout(250);
  const landed = await page.evaluate(() => ({
    section: (document.querySelector('.section.active') || {}).id,
    openId: window._bwDetailId || null,
  }));
  ok('clicking a recently-viewed contact opens that contact on the list section',
    landed.section === 'section-contacts' && landed.openId === 'h07', landed);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n7. A fresh database renders the home screen without throwing');
{
  const { ctx, page, errs } = await open(browser, '#contacts-home', {});
  const r = await page.evaluate(() => ({
    section: (document.querySelector('.section.active') || {}).id,
    empty: !!document.getElementById('cthEmpty'),
    att: [...document.querySelectorAll('#cthAtt .cth-card .n')].map(n => n.textContent.trim()),
    views: [...document.querySelectorAll('#cthViews .cth-row .n')].map(n => n.textContent.trim()),
    all: (document.querySelector('#cthActions .cth-act[data-all="1"] .n') || {}).textContent,
    recent: document.querySelectorAll('#cthRecent .cth-row').length,
    saved: document.querySelectorAll('#cthSaved .cth-row').length,
    soon: document.querySelectorAll('#cthSoon .cth-soon').length,
  }));
  ok('the home screen still renders with zero contacts', r.section === 'section-contacts-home', r.section);
  ok('and says so rather than showing bare zeroes', r.empty);
  ok('every needs-attention count is 0', same(r.att, ['0', '0', '0', '0']), r.att);
  ok('every view count is 0', same(r.views, ['0', '0', '0', '0', '0']), r.views);
  ok('All contacts is 0', r.all === '0', r.all);
  ok('recently viewed and saved views are empty, not broken', r.recent === 0 && r.saved === 0, r);
  ok('the placeholders are still there', r.soon === 4, r.soon);
  ok('no page errors on an empty database', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n8. The home screen is live, and it writes nothing');
{
  const { ctx, page, errs } = await open(browser, '#contacts-home');
  await goHome(page);
  const beforeN = await cardCount(page, '#cthAtt .cth-card[data-att="overdue"]');
  await page.evaluate(async () => {
    window.__fake.clearLog();
    await saveContactTask({ partyId: 'h10', summary: 'Chase the deed', dueOn: '2020-01-02', category: 'call' });
    await new Promise(r => setTimeout(r, 200));
  });
  await page.waitForTimeout(150);
  const afterN = await cardCount(page, '#cthAtt .cth-card[data-att="overdue"]');
  ok('a to-do arriving from the other browser moves the Overdue count while home is open',
    +afterN === +beforeN + 1, { before: beforeN, after: afterN });

  const w = await page.evaluate(async () => {
    window.__fake.clearLog();
    renderContactsHome();
    bwCtRecentPush('h01');
    renderContactsHome();
    const log = window.__fake.log().filter(l => !['once', 'signIn', 'signOut'].includes(l.op));
    return { ops: log.map(l => l.op + ' ' + l.path) };
  });
  ok('rendering the home screen writes nothing to the database at all', w.ops.length === 0, w.ops);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

await browser.close();
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
