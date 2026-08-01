// Sprint-05 Track B — the contact record page.
//
// The bug this covers, verbatim from Martice: "when clicking into a contact itself it needs to
// use better use of the whole page. right now it is so small." It was never a max-width — .main
// is padding only and .section sets display only. It was a single stacked column of cards that
// never laid out into width it already had.
//
// NOTHING HERE TOUCHES PRODUCTION. Every context installs tests/fake-firebase.js before any page
// script runs and aborts the gstatic firebasejs request, so `_fbDB` is an in-memory tree. The
// live database now holds real demo data; these fixtures are synthetic by rule — invented names,
// 555-range phones, @example.com.
//
// House rules this suite obeys:
//   · every claim is read off RENDERED DOM or off measured geometry, never off a constant the
//     code also reads,
//   · focus and typing go through REAL Playwright input. An in-page element.focus() is a no-op
//     in headless Chromium, so an in-page version of those tests would assert nothing while
//     appearing to pass,
//   · the overflow assertion checks BOTH documentElement AND .main. .main is `overflow-x:auto`,
//     so it absorbs an over-wide child and the document never scrolls — documentElement alone
//     would report green for a layout that is visibly broken. Measured, not assumed: see the
//     sabotage run in the track report.
import { chromium } from 'playwright';
import fs from 'fs';

const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const day = 86400000;
const iso = (t) => new Date(t).toISOString().slice(0, 10);

async function open(browser, viewport) {
  const ctx = await browser.newContext(viewport ? { viewport } : {});
  await ctx.route(/gstatic\.com\/firebasejs/, (r) => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 220)); });
  page.on('dialog', (d) => d.accept());
  await page.addInitScript(FAKE);
  await page.addInitScript(`window.__fake.addAccount('tester@bwquote.local','pw');window.__fake.seed({});`);
  await page.goto('http://localhost:' + (process.env.PORT || 3737) + '/', { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('tester@bwquote.local', 'pw'));
  await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
  await page.waitForTimeout(150);
  return { ctx, page, errs };
}

// A family with all four of the things the page has to lay out: property, notes, to-dos and
// linked records. Positions are synthetic and deliberately mundane; nothing here claims a real
// grave. Returns the party id.
const SEED = async function (D) {
  const p = await saveParty({
    given: 'Marguerite', family: 'Thornbury', salutation: 'Dear Marguerite,',
    status: 'appointment-set', source: 'referral', category: 'pre-need-cemetery',
    flags: ['veteran'], interest: 'a companion niche',
    phones: { p1: { value: '2065550142', type: 'mobile', isPrimary: true } },
    emails: { e1: { value: 'm.thornbury@example.com', isPrimary: true } },
    addresses: { a1: { type: 'mailing', street1: '4418 Larkspur Ave S', city: 'Burien', state: 'WA', postal: '98166', isPrimary: true } }
  });
  const prop = await saveContactProperty({ partyId: p.id, sectionCode: '12', lotAlpha: 'A', space: '5',
    spacesOwned: 4, intermentsUsed: 2, lot: '61', deedNumber: 'D-11482', purchasedOn: '1998-04-17' });
  prop.createdAt = D.now - 12 * D.day; await saveContactProperty(prop);

  const n1 = await saveContactNote({ partyId: p.id, body: 'Called about the columbarium.' });
  n1.createdAt = D.now - 9 * D.day; await saveContactNote(n1);

  const t1 = await saveContactTask({ partyId: p.id, summary: 'Pull the deed for D-11482',
    dueOn: D.overdue, category: 'follow-up', status: 'open' });
  t1.createdAt = D.now - 7 * D.day; await saveContactTask(t1);

  const t2 = await saveContactTask({ partyId: p.id, summary: 'Email the comparison', status: 'open', dueOn: D.past });
  t2.createdAt = D.now - 6 * D.day; t2.status = 'done'; t2.doneAt = D.now - 4 * D.day;
  await saveContactTask(t2);

  _quoteStore.cem['q4101'] = { id: 4101, label: 'Thornbury — Mountain View niche', total: 9420.5,
    date: 'Jul 12, 2026', spaces: [{ sid: 'MVC-F-13-1', loc: 'Bldg-MVC Wall-N Lvl-F Sp-13' }], state: {} };
  _quoteStore.fh['q4103'] = { id: 4103, label: 'Thornbury — cremation service', total: 4285.75,
    date: 'Jul 20, 2026', spaces: [], state: {} };
  _rebuildTypeArray('cem'); _rebuildTypeArray('fh');
  await saveContractRole({ partyId: p.id, recordType: 'cem', recordId: 4101, role: 'purchaser' });
  await saveContractRole({ partyId: p.id, recordType: 'fh', recordId: 4103, role: 'purchaser' });

  const son = await saveParty({ given: 'Desmond', family: 'Thornbury' });
  await saveContractRole({ partyId: son.id, recordType: 'cem', recordId: 4101, role: 'beneficiary' });

  show('contacts', null);
  openContactDetail(p.id);
  await new Promise((x) => setTimeout(x, 220));
  return p.id;
};

const now = Date.now();
const D = { now, day, overdue: iso(now - 3 * day), past: iso(now - 5 * day) };

const browser = await chromium.launch();

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n1. The property band sits ABOVE the columns and spans the full width');
{
  const { ctx, page, errs } = await open(browser, { width: 1500, height: 1000 });
  const r = await page.evaluate(async (a) => {
    await eval('(' + a.fn + ')')(a.D);
    const band = document.getElementById('ctProperty');
    const grid = document.getElementById('ctGrid');
    const bb = band.getBoundingClientRect(), gb = grid.getBoundingClientRect();
    return {
      hasBand: !!band, hasGrid: !!grid,
      // 4 == DOCUMENT_POSITION_FOLLOWING: the grid comes AFTER the band in document order
      bandFirstInDom: !!(band.compareDocumentPosition(grid) & 4),
      bandAbove: Math.round(bb.bottom) <= Math.round(gb.top),
      widthDelta: Math.round(Math.abs(bb.width - gb.width)),
      bandW: Math.round(bb.width), gridW: Math.round(gb.width),
      // and wider than any one column, which is the whole point of a band
      leftW: Math.round(document.getElementById('ctRailLeft').getBoundingClientRect().width),
      centreW: Math.round(document.getElementById('ctCentre').getBoundingClientRect().width),
      rightW: Math.round(document.getElementById('ctRailRight').getBoundingClientRect().width),
      rows: document.querySelectorAll('#ctProperty .ct-prop').length,
      title: (document.querySelector('#ctProperty .ct-prop-loc') || {}).textContent,
    };
  }, { fn: SEED.toString(), D });
  ok('the property band is rendered', r.hasBand && r.rows === 1, r);
  ok('it comes BEFORE the three-column grid in the document', r.bandFirstInDom, r);
  ok('…and is painted entirely above it', r.bandAbove, r);
  ok('it spans the full width of the columns, not one of them',
    r.widthDelta <= 2 && r.bandW > r.centreW, { bandW: r.bandW, gridW: r.gridW, centreW: r.centreW });
  ok('Track A\'s locator still renders inside it', /Garden 12 · Row A · Space 5/.test(r.title || ''), r.title);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n2. All three regions render, and each carries what it is for');
{
  const { ctx, page, errs } = await open(browser, { width: 1500, height: 1000 });
  const r = await page.evaluate(async (a) => {
    await eval('(' + a.fn + ')')(a.D);
    const t = (id) => { const e = document.getElementById(id); return e ? e.textContent.replace(/\s+/g, ' ') : null; };
    const grid = document.getElementById('ctGrid');
    return {
      head: t('ctHead'), left: t('ctRailLeft'), centre: t('ctCentre'), right: t('ctRailRight'),
      // all three are direct children of the grid, so the browser is actually laying them out
      children: [...grid.children].map((c) => c.id),
      tabs: [...document.querySelectorAll('#ctCentre .ct-tab')].map((b) => b.textContent.trim()),
      activeTab: (document.querySelector('#ctCentre .ct-tab.active') || {}).textContent,
      editable: [...document.querySelectorAll('#ctRailLeft .ct-editable')].map((b) => b.getAttribute('data-edit')),
      openBtns: document.querySelectorAll('#ctRailRight button[onclick^="loadSaved"]').length,
    };
  }, { fn: SEED.toString(), D });
  ok('the grid holds exactly the three regions, in order',
    same(r.children, ['ctRailLeft', 'ctCentre', 'ctRailRight']), r.children);
  ok('the header carries the name, the status and the next action',
    /Marguerite Thornbury/.test(r.head) && /Appointment Set/.test(r.head) && /Next action/.test(r.head), r.head);
  ok('the LEFT rail carries phone, email and address',
    /\(206\) 555-0142/.test(r.left) && /m\.thornbury@example\.com/.test(r.left)
    && /4418 Larkspur Ave S/.test(r.left), r.left);
  ok('…and the salutation', /Dear Marguerite,/.test(r.left), r.left);
  ok('the CENTRE is the tabbed stream, Activity first and active',
    same(r.tabs, ['Activity', 'Notes (1)', 'To-Dos (1)']) && /Activity/.test(r.activeTab || ''),
    { tabs: r.tabs, active: r.activeTab });
  ok('the RIGHT rail carries the holdings and their totals',
    /\$13,706\.25/.test(r.right) && /across 2 records/.test(r.right)
    && /Cemetery/.test(r.right) && /Funeral Home/.test(r.right), r.right);
  ok('…and offers to open each linked record', r.openBtns === 2, r.openBtns);
  ok('…and names the other person on the same record',
    /Desmond Thornbury/.test(r.right) && /Beneficiary/.test(r.right), r.right);
  ok('six fields in the left rail are editable in place',
    same(r.editable, ['phone', 'email', 'status', 'source', 'category', 'salutation']), r.editable);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n3. The activity timeline — one stream, newest first, an entry from every source');
{
  const { ctx, page, errs } = await open(browser, { width: 1500, height: 1000 });
  const r = await page.evaluate(async (a) => {
    // A REAL import, through the real planner and the real writer, so the "imported" entry comes
    // off _prov and the batch record rather than off a hand-written fixture.
    const header = ['First name', 'Last name', 'Phone', 'Section', 'Row', 'Space', 'Spaces owned', 'Note'];
    const mapping = ['given', 'family', 'phone', 'propSection', 'propLotAlpha', 'propSpace', 'propOwned', 'note'];
    const rows = [header, ['Constance', 'Ravensworth', '(206) 555-0173', 'MVC', 'F', '13', '1', 'Owner book row']];
    const plan = bwCsvPlan(rows, mapping, {});
    const res = await bwCsvImport(plan, { filename: 'owner-book-1998.csv' });
    const p = _parties.find((x) => x.family === 'Ravensworth');

    // then everything else, at times we control, so "chronological" is checkable
    const t = await saveContactTask({ partyId: p.id, summary: 'Walk the wall with her', status: 'open',
      dueOn: a.D.overdue });
    t.createdAt = a.D.now - 5 * a.D.day; await saveContactTask(t);
    const t2 = await saveContactTask({ partyId: p.id, summary: 'Send the niche sheet', status: 'open', dueOn: a.D.past });
    t2.createdAt = a.D.now - 8 * a.D.day; t2.status = 'done'; t2.doneAt = a.D.now - 6 * a.D.day;
    await saveContactTask(t2);
    const n = await saveContactNote({ partyId: p.id, body: 'She wants the top tier.' });
    n.createdAt = a.D.now - 2 * a.D.day; await saveContactNote(n);

    show('contacts', null);
    openContactDetail(p.id);
    await new Promise((x) => setTimeout(x, 250));
    const items = [...document.querySelectorAll('#ctActivity .ct-tl-item')].map((e) => ({
      kind: e.getAttribute('data-kind'),
      label: e.querySelector('.ct-tl-kind').textContent.trim(),
      what: e.querySelector('.ct-tl-what').textContent.trim(),
      who: e.querySelector('.ct-tl-who span').textContent.trim(),
      when: e.querySelector('.ct-tl-who span:last-child').textContent.trim(),
    }));
    return { items, batchId: res.batchId, stamps: bwActivityFor(p.id).map((x) => x.at) };
  }, { D });

  const kinds = r.items.map((x) => x.kind);
  ok('every source is represented — note, to-do, to-do done, property, import, creation',
    ['note', 'todo', 'done', 'property', 'import', 'created'].every((k) => kinds.indexOf(k) > -1), kinds);
  ok('and nothing else invented a kind of its own',
    kinds.every((k) => ['note', 'todo', 'done', 'property', 'import', 'created'].indexOf(k) > -1), kinds);
  ok('the stream is in true chronological order, newest first',
    r.stamps.every((v, i) => i === 0 || r.stamps[i - 1] >= v), r.stamps);
  ok('the import entry names the file it came from',
    /Imported from owner-book-1998\.csv/.test((r.items.find((x) => x.kind === 'import') || {}).what || ''),
    r.items.find((x) => x.kind === 'import'));
  ok('the property entry names the position, not just "property"',
    /Mountain View Columbarium · Tier F · Space 13/.test((r.items.find((x) => x.kind === 'property') || {}).what || ''),
    r.items.find((x) => x.kind === 'property'));
  // Two notes: the one typed by hand, and the one the import's `note` column created. Both are
  // in the stream, which is the point — the timeline is where an imported record stops being
  // invisible history and becomes something you can read.
  const noteBodies = r.items.filter((x) => x.kind === 'note').map((x) => x.what);
  ok('the note entries carry their bodies',
    noteBodies.indexOf('She wants the top tier.') > -1 && noteBodies.indexOf('Owner book row') > -1, noteBodies);
  ok('the completed to-do appears as done AND as raised — two facts, two entries',
    kinds.filter((k) => k === 'todo').length === 2 && kinds.filter((k) => k === 'done').length === 1, kinds);
  ok('every entry says who did it and when',
    r.items.every((x) => x.who.length > 0 && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(x.when)),
    r.items.filter((x) => !x.who || !/^\d{4}/.test(x.when)));
  ok('every entry is labelled with what it was',
    r.items.every((x) => x.label.length > 2), r.items.map((x) => x.label));
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n4. No horizontal scroll at 1500px, 1100px or 900px, and nothing truncates');
for (const [w, wantCols] of [[1500, 3], [1100, 2], [900, 1]]) {
  const { ctx, page, errs } = await open(browser, { width: w, height: 950 });
  const r = await page.evaluate(async (a) => {
    await eval('(' + a.fn + ')')(a.D);
    const de = document.documentElement;
    const main = document.querySelector('.main');
    // The SHELL's own overflow at this width, measured on a section that has nothing to do with
    // contacts. Below ~985px the top bar (264px sidebar + a 300px search + two buttons) does not
    // fit and the page scrolls by itself — that predates this track and is not ours to claim
    // green. So the record page is measured against that floor rather than against zero.
    show('home', null);
    const shellFloor = de.scrollWidth - de.clientWidth;
    show('contacts', null);
    openContactDetail(_bwDetailId);
    await new Promise((x) => setTimeout(x, 120));
    const cols = getComputedStyle(document.getElementById('ctGrid')).gridTemplateColumns.trim().split(/\s+/);
    const fits = (id) => { const e = document.getElementById(id); return e.scrollWidth <= e.clientWidth + 1; };
    return {
      shellFloor: shellFloor,
      pageOverflow: de.scrollWidth - de.clientWidth,
      mainOverflow: main.scrollWidth - main.clientWidth,
      cols: cols.length,
      colList: cols,
      nameFits: fits('ctName'), nextFits: fits('ctNextAction'),
      // …and they are not fitting by being clipped: no ellipsis, no nowrap on either
      nameClip: getComputedStyle(document.getElementById('ctName')).textOverflow,
      nameWrap: getComputedStyle(document.getElementById('ctName')).whiteSpace,
      nameText: document.getElementById('ctName').textContent,
      nextText: document.getElementById('ctNextAction').textContent.replace(/\s+/g, ' ').trim(),
    };
  }, { fn: SEED.toString(), D });
  ok(w + 'px — the record page adds NOTHING to the page\'s horizontal scroll',
    r.pageOverflow <= r.shellFloor, { record: r.pageOverflow, shellFloorAtThisWidth: r.shellFloor });
  if (w >= 1010) ok(w + 'px — and the page does not scroll sideways at all', r.pageOverflow <= 0, r.pageOverflow);
  // documentElement alone would report green for a layout that is visibly broken: .main is
  // overflow-x:auto and absorbs an over-wide child. Measured, not assumed — forcing
  // #ctCentre{min-width:1400px} leaves pageOverflow at 0 and drives mainOverflow to 472px at
  // 1500 and 860px at 1100. THIS is the assertion that catches it.
  ok(w + 'px — and neither does .main, the container that would absorb it', r.mainOverflow <= 0, r.mainOverflow);
  ok(w + 'px — the layout is ' + wantCols + ' columns', r.cols === wantCols, r.colList);
  ok(w + 'px — the name is not truncated', r.nameFits && r.nameClip === 'clip' && r.nameWrap !== 'nowrap',
    { fits: r.nameFits, clip: r.nameClip, wrap: r.nameWrap });
  ok(w + 'px — the name is all there', r.nameText === 'Marguerite Thornbury', r.nameText);
  ok(w + 'px — the next action is not truncated', r.nextFits, r.nextText);
  ok(w + 'px — the next action still reads in full',
    /Next action/.test(r.nextText) && /Pull the deed for D-11482/.test(r.nextText), r.nextText);
  ok(w + 'px — no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n5. An inline edit in the left rail saves, and survives a re-render');
{
  const { ctx, page, errs } = await open(browser, { width: 1500, height: 1000 });
  await page.evaluate(async (a) => { await eval('(' + a.fn + ')')(a.D); }, { fn: SEED.toString(), D });

  // Driven through real input. bwCtFixStart's in-page focus() call is a NO-OP in headless
  // Chromium, so clicking the field and then the input is the only honest way to do this.
  await page.click('#ctRailLeft .ct-editable[data-edit="phone"]');
  await page.waitForSelector('#ctRailLeft #ctFixIn', { timeout: 5000 });
  await page.click('#ctRailLeft #ctFixIn');
  await page.keyboard.type('206-555-0199');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);

  const r = await page.evaluate(async () => {
    const shown = () => document.getElementById('ctRailLeft').textContent.replace(/\s+/g, ' ');
    const before = shown();
    const stored = _partyStore[_bwDetailId].phones.p1.value;
    const writes = window.__fake.log().filter((l) => l.op === 'set' && /^parties\//.test(l.path)).length;
    const collectionWrites = window.__fake.log().filter((l) => (l.op === 'set' || l.op === 'update') && l.path === 'parties').length;
    // Randy writes a note on the same family: the whole panel is rebuilt.
    await _fbDB.ref('contactNotes/remote1').set({ id: 'remote1', partyId: _bwDetailId,
      body: 'from the other desk', createdAt: Date.now(), createdBy: 'uid_randy@bwquote.local' });
    await new Promise((x) => setTimeout(x, 320));
    return { before, after: shown(), stored, writes, collectionWrites,
      remoteVisible: /from the other desk/.test(document.getElementById('ctCentre').textContent),
      editorGone: !document.getElementById('ctFixIn') };
  });
  ok('the typed number is stored as digits only', r.stored === '2065550199', r.stored);
  ok('and renders formatted in the rail', /\(206\) 555-0199/.test(r.before), r.before);
  ok('the editor closes once the value is committed', r.editorGone, r.editorGone);
  ok('it survives a re-render triggered by the other counselor', /\(206\) 555-0199/.test(r.after), r.after);
  ok("…and Randy's note is on screen at the same time", r.remoteVisible);
  ok('the save went to parties/<id>, never to the parties node', r.writes >= 1 && r.collectionWrites === 0,
    { record: r.writes, collection: r.collectionWrites });
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n6. A half-typed note survives a re-render, on the new layout');
{
  const { ctx, page, errs } = await open(browser, { width: 1500, height: 1000 });
  await page.evaluate(async (a) => {
    await eval('(' + a.fn + ')')(a.D);
    bwSetDetailTab('notes');
  }, { fn: SEED.toString(), D });
  await page.waitForTimeout(200);
  await page.click('#ctNoteBody');
  await page.type('#ctNoteBody', 'She asked about the veterans sec');
  const r = await page.evaluate(async () => {
    await _fbDB.ref('contactNotes/rn9').set({ id: 'rn9', partyId: _bwDetailId, body: 'from the other desk',
      createdAt: Date.now(), createdBy: 'uid_randy@bwquote.local' });
    await new Promise((x) => setTimeout(x, 320));
    const box = document.getElementById('ctNoteBody');
    return { draft: box.value, focused: document.activeElement === box, caret: box.selectionStart,
      inCentre: !!document.querySelector('#ctCentre #ctNoteBody'),
      remote: /from the other desk/.test(document.getElementById('ctCentre').textContent) };
  });
  const TYPED = 'She asked about the veterans sec';
  ok('the note box lives in the centre column', r.inCentre);
  ok('the draft survives the re-render', r.draft === TYPED, r.draft);
  ok('focus stays in the textarea', r.focused);
  ok('and the caret stays at the end', r.caret === TYPED.length, { caret: r.caret, want: TYPED.length });
  ok("Randy's note is visible at the same time", r.remote);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n7. The letter is a Tier in a wall, a Row on a lawn and a Face in the courtyard');
{
  const { ctx, page, errs } = await open(browser, { width: 1500, height: 1000 });
  const r = await page.evaluate(async () => {
    const p = await saveParty({ given: 'Perpetua', family: 'Ashgrove' });
    await saveContactProperty({ partyId: p.id, sectionCode: '18', lotAlpha: 'C', space: '2', spacesOwned: 1 });
    await saveContactProperty({ partyId: p.id, sectionCode: 'ROAC', lotAlpha: 'D', space: '11', spacesOwned: 1 });
    await saveContactProperty({ partyId: p.id, sectionCode: 'ROA', lotAlpha: 'N', space: '3', spacesOwned: 1 });
    show('contacts', null);
    openContactDetail(p.id);
    await new Promise((x) => setTimeout(x, 220));
    return {
      titles: [...document.querySelectorAll('#ctProperty .ct-prop-loc')].map((e) => e.textContent.trim()),
      whole: document.getElementById('contactDetail').textContent,
    };
  });
  ok('a lawn garden calls the letter a Row',
    r.titles.indexOf('Garden 18 · Row C · Space 2') > -1, r.titles);
  ok('a niche wall calls it a Tier',
    r.titles.indexOf('Rock of Ages Columbarium · Tier D · Space 11') > -1, r.titles);
  ok('the Rock of Ages courtyard calls it a Face',
    r.titles.indexOf('Rock of Ages courtyard niches · Face N · Space 3') > -1, r.titles);
  ok('the word "bay" appears nowhere on the record', !/\bbay\b/i.test(r.whole), r.titles);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n8. The persistent controls are still OUTSIDE anything rebuilt with innerHTML');
{
  const { ctx, page, errs } = await open(browser, { width: 1500, height: 1000 });
  const r = await page.evaluate(async (a) => {
    await eval('(' + a.fn + ')')(a.D);
    const search = document.getElementById('contactSearch');
    return {
      inList: document.getElementById('contactsList').contains(search),
      inDetail: document.getElementById('contactDetail').contains(search),
      inChrome: document.getElementById('ctChrome').contains(search),
      // the record page is the innerHTML container; every rail is inside it
      railsInDetail: ['ctHead', 'ctProperty', 'ctGrid', 'ctRailLeft', 'ctCentre', 'ctRailRight']
        .every((id) => document.getElementById('contactDetail').contains(document.getElementById(id))),
    };
  }, { fn: SEED.toString(), D });
  ok('the search box is not inside #contactsList', r.inList === false);
  ok('nor inside #contactDetail, which this track rebuilds wholesale', r.inDetail === false);
  ok('it is in #ctChrome, where it has always been', r.inChrome === true);
  ok('and every new region IS inside the rebuilt container, as intended', r.railsInDetail === true);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n9. Content too wide for its column scrolls inside itself, never the page');
{
  const { ctx, page, errs } = await open(browser, { width: 1100, height: 950 });
  const r = await page.evaluate(async () => {
    // The two shapes that actually turn up: an unbroken run with no space in it (a pasted URL,
    // a deed reference typed without breaks) and a very long section code we have never seen.
    const p = await saveParty({ given: 'Wide', family: 'Content',
      emails: { e1: { value: 'exceptionally.long.address.for.this.family@a-very-long-domain.example.com', isPrimary: true } } });
    await saveContactNote({ partyId: p.id,
      body: 'REF' + 'X'.repeat(320) + 'END' });
    await saveContactProperty({ partyId: p.id, sectionCode: 'Z'.repeat(90), lotAlpha: 'A', space: '1', spacesOwned: 1 });
    show('contacts', null);
    openContactDetail(p.id);
    await new Promise((x) => setTimeout(x, 250));
    const de = document.documentElement, main = document.querySelector('.main');
    const over = (id) => { const e = document.getElementById(id); return e.scrollWidth - e.clientWidth; };
    return {
      pageOverflow: de.scrollWidth - de.clientWidth,
      mainOverflow: main.scrollWidth - main.clientWidth,
      band: over('ctProperty'), left: over('ctRailLeft'), centre: over('ctCentre'), right: over('ctRailRight'),
      notesTabOverflow: (bwSetDetailTab('notes'), document.getElementById('ctCentre').scrollWidth
        - document.getElementById('ctCentre').clientWidth),
    };
  });
  ok('a 320-character unbroken note does not widen the page', r.pageOverflow <= 0, r.pageOverflow);
  ok('…nor .main', r.mainOverflow <= 0, r.mainOverflow);
  ok('…nor the property band, with a 90-character section code', r.band <= 0, r.band);
  ok('…nor any of the three columns',
    r.left <= 0 && r.centre <= 0 && r.right <= 0, { left: r.left, centre: r.centre, right: r.right });
  ok('…and the same on the Notes tab, where the raw body is shown', r.notesTabOverflow <= 0, r.notesTabOverflow);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

await browser.close();
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
