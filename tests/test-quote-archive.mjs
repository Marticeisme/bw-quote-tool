// Archive / Restore and recoverable Delete on every saved list.
//
// Saved quotes are live production data. This suite drives the in-memory fake Firebase
// (tests/fake-firebase.js); the gstatic SDK request is aborted, so nothing here can reach the
// real database. The point of most assertions is the WRITE shape: archiving must be one
// update() of one field on one record, never a set() of a list and never a remove().
import { chromium } from 'playwright';
import fs from 'fs';
import { BASE } from './_base.mjs';

const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra !== undefined ? '\n        ' + JSON.stringify(extra) : '')); }
};

// Synthetic fixtures only: invented names, no real records.
const cemState = (loc) => ({ fields: { qSpaceLocation: loc }, lines: [{ label: 'Item 1', amount: 100 }], total: 1000 });
const rec = (id, label, extra) => Object.assign({ id, label, total: 1000 + id, date: 'Oct 1, 2026', state: cemState('Garden 7 · Lot ' + id) }, extra || {});

const SEED = {
  quotes: {
    cem: {
      q4001: rec(4001, 'Aldane, Prue'),
      q4002: rec(4002, 'Brisco, Hal'),
      q4003: rec(4003, 'Corvell, Ines', { archivedAt: '2026-09-01T10:00:00.000Z' }),
    },
    fh: {
      q5001: rec(5001, 'Dunmore, Vera'),
      q5002: rec(5002, 'Esterly, Lou'),
    },
    ric: { q6001: rec(6001, 'Fairholt, Sam') }, ga: {}, cp: {}, an: {},
  },
};

async function newPage(browser, seed) {
  const ctx = await browser.newContext();
  await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', e => { fail++; console.log('  PAGEERROR: ' + e.message); });
  page.on('dialog', d => d.dismiss());
  await page.addInitScript(FAKE);
  await page.addInitScript(`window.__fake.addAccount('tester@bwquote.local', 'pw');`);
  if (seed) await page.addInitScript(`(${(s) => window.__fake.seed(s)}).call(null, ${JSON.stringify(seed)});`);
  await page.goto(BASE, { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('tester@bwquote.local', 'pw'));
  await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
  await page.waitForTimeout(300);
  return { ctx, page };
}
const writesOf = (page) => page.evaluate(() =>
  window.__fake.log().filter(l => l.op === 'set' || l.op === 'update' || l.op === 'remove'));
const rows = (page, list) => page.evaluate((list) => [...document.querySelectorAll('#' + list + ' .saved-row')].map(r => ({
  name: r.querySelector('.saved-name').textContent,
  archived: r.classList.contains('is-archived'),
  pills: [...r.querySelectorAll('.pill')].map(p => p.textContent),
  btns: [...r.querySelectorAll('.saved-actions .btn')].map(b => b.textContent),
})), list);
const head = (page, list) => page.evaluate((list) => ({
  title: (document.querySelector('#' + list + ' .saved-head-title') || {}).textContent,
  toggle: (document.querySelector('#' + list + ' .saved-archived-toggle') || {}).textContent || null,
}), list);
const clickRowBtn = (page, list, name, label) => page.evaluate(({ list, name, label }) => {
  const r = [...document.querySelectorAll('#' + list + ' .saved-row')].find(x => x.querySelector('.saved-name').textContent === name);
  [...r.querySelectorAll('.saved-actions .btn')].find(b => b.textContent === label).click();
}, { list, name, label });
const dbRec = (page, path) => page.evaluate((p) => {
  // read straight from the fake's store through a once() snapshot
  let v; window._fbDB.ref(p).once('value').then(s => { v = s.val(); });
  return new Promise(r => setTimeout(() => r(v), 50));
}, path);

const browser = await chromium.launch();

console.log('\n1. Default view hides archived quotes');
{
  const { ctx, page } = await newPage(browser, SEED);
  await page.evaluate(() => show('cem-saved'));
  await page.waitForTimeout(200);
  const r = await rows(page, 'cemSavedQuotes'), h = await head(page, 'cemSavedQuotes');
  ok('only the two active quotes are listed', r.map(x => x.name).join('|') === 'Brisco, Hal|Aldane, Prue', r.map(x => x.name));
  ok('header counts active quotes only', h.title === '2 quotes', h);
  ok('toggle offers the archived count', h.toggle === 'Show archived (1)', h);
  ok('every active row has Archive next to Delete', r.every(x => x.btns.includes('Archive') && x.btns.indexOf('Archive') === x.btns.indexOf('Delete') - 1), r.map(x => x.btns));
  ok('rendering wrote nothing', (await writesOf(page)).length === 0, await writesOf(page));
  await ctx.close();
}

console.log('\n2. Archive writes one field on one record, nothing else');
{
  const { ctx, page } = await newPage(browser, SEED);
  await page.evaluate(() => show('cem-saved'));
  await page.waitForTimeout(200);
  const before = await dbRec(page, 'quotes/cem/q4002');
  await clickRowBtn(page, 'cemSavedQuotes', 'Brisco, Hal', 'Archive');
  await page.waitForTimeout(200);
  const w = await writesOf(page);
  ok('exactly one write', w.length === 1, w);
  ok('it is an update of quotes/cem/q4002 with only archivedAt', w[0] && w[0].op === 'update' && w[0].path === 'quotes/cem/q4002' && JSON.stringify(w[0].keys) === '["archivedAt"]', w);
  const after = await dbRec(page, 'quotes/cem/q4002');
  ok('archivedAt is an ISO timestamp', after && /^\d{4}-\d\d-\d\dT/.test(after.archivedAt || ''), after && after.archivedAt);
  const strip = (o) => { const c = Object.assign({}, o); delete c.archivedAt; delete c.ownerUid; delete c.ownerHandle; return JSON.stringify(c); };
  ok('every other field of the record is unchanged', strip(before) === strip(after));
  ok('the other cem records were not touched', (await dbRec(page, 'quotes/cem/q4001')).label === 'Aldane, Prue' && !(await dbRec(page, 'quotes/cem/q4001')).archivedAt);
  const r = await rows(page, 'cemSavedQuotes'), h = await head(page, 'cemSavedQuotes');
  ok('the row leaves the list', r.map(x => x.name).join('|') === 'Aldane, Prue', r.map(x => x.name));
  ok('count and toggle update', h.title === '1 quote' && h.toggle === 'Show archived (2)', h);
  ok('the record is still in memory (holdings / load-by-id still find it)', await page.evaluate(() => !!_cemSavedQuotes.find(q => q.id === 4002)));
  await ctx.close();
}

console.log('\n3. Show archived, then Restore');
{
  const { ctx, page } = await newPage(browser, SEED);
  await page.evaluate(() => show('cem-saved'));
  await page.waitForTimeout(200);
  await page.click('#cemSavedQuotes .saved-archived-toggle');
  await page.waitForTimeout(150);
  let r = await rows(page, 'cemSavedQuotes');
  const arch = r.find(x => x.name === 'Corvell, Ines');
  ok('archived quote appears when shown', !!arch, r.map(x => x.name));
  ok('it is dimmed, pilled Archived, and offers Restore', arch && arch.archived && arch.pills[0] === 'Archived' && arch.btns.includes('Restore') && !arch.btns.includes('Archive'), arch);
  ok('toggle now reads Hide archived', (await head(page, 'cemSavedQuotes')).toggle === 'Hide archived');
  await clickRowBtn(page, 'cemSavedQuotes', 'Corvell, Ines', 'Restore');
  await page.waitForTimeout(200);
  const w = await writesOf(page);
  ok('restore is one update of archivedAt on that record', w.length === 1 && w[0].op === 'update' && w[0].path === 'quotes/cem/q4003' && JSON.stringify(w[0].keys) === '["archivedAt"]', w);
  const after = await dbRec(page, 'quotes/cem/q4003');
  ok('the field is gone and the record is intact', after && !('archivedAt' in after) && after.label === 'Corvell, Ines', after);
  r = await rows(page, 'cemSavedQuotes');
  const h = await head(page, 'cemSavedQuotes');
  ok('all three active, no toggle left', r.length === 3 && h.title === '3 quotes' && h.toggle === null, { r: r.map(x => x.name), h });
  await ctx.close();
}

console.log('\n4. Funeral home quotes, and the all-archived state');
{
  const { ctx, page } = await newPage(browser, SEED);
  await page.evaluate(() => show('fh-saved'));
  await page.waitForTimeout(200);
  await clickRowBtn(page, 'fhSavedQuotes', 'Dunmore, Vera', 'Archive');
  await page.waitForTimeout(150);
  await clickRowBtn(page, 'fhSavedQuotes', 'Esterly, Lou', 'Archive');
  await page.waitForTimeout(150);
  const w = await writesOf(page);
  ok('two archives = two single-field updates on fh records', w.length === 2 && w.every(x => x.op === 'update' && /^quotes\/fh\/q500[12]$/.test(x.path) && x.keys.join() === 'archivedAt'), w);
  const empty = await page.evaluate(() => (document.querySelector('#fhSavedQuotes .empty h3') || {}).textContent);
  ok('all archived shows a clear empty state, not "No matches"', /^No active /.test(empty || ''), empty);
  ok('toggle still reachable', (await head(page, 'fhSavedQuotes')).toggle === 'Show archived (2)');
  await ctx.close();
}

console.log('\n5. Contracts and deed transfers can be archived too');
{
  const { ctx, page } = await newPage(browser, SEED);
  await page.evaluate(() => show('ric-saved'));
  await page.waitForTimeout(200);
  const r = await rows(page, 'ricSavedQuotes');
  ok('RIC rows have Archive next to Delete', r.length === 1 && r[0].btns.indexOf('Archive') === r[0].btns.indexOf('Delete') - 1, r);
  await clickRowBtn(page, 'ricSavedQuotes', 'Fairholt, Sam', 'Archive');
  await page.waitForTimeout(150);
  const w = await writesOf(page);
  ok('archiving a RIC is one archivedAt update on that record', w.length === 1 && w[0].op === 'update' && w[0].path === 'quotes/ric/q6001' && w[0].keys.join() === 'archivedAt', w);
  ok('every saved list type allows Archive', await page.evaluate(() => QUOTE_TYPES.every(t => BW_ARCHIVE_TYPES[t])));
  await ctx.close();
}

console.log('\n6. Delete is recoverable: Recently deleted, Restore, Delete forever');
{
  const seed = JSON.parse(JSON.stringify(SEED));
  seed.quotes.cem.q4004 = rec(4004, 'Darrow, Kit', { deletedAt: '2026-10-01T09:00:00.000Z' });
  const { ctx, page } = await newPage(browser, seed);
  await page.evaluate(() => show('cem-saved'));
  await page.waitForTimeout(200);
  ok('a deleted record is in no list the app reads', await page.evaluate(() => !_cemSavedQuotes.find(q => q.id === 4004)));
  let r = await rows(page, 'cemSavedQuotes');
  ok('and not on screen', !r.find(x => x.name === 'Darrow, Kit'), r.map(x => x.name));
  const toggles = () => page.evaluate(() => [...document.querySelectorAll('#cemSavedQuotes .saved-archived-toggle')].map(b => b.textContent));
  ok('header offers Recently deleted (1)', (await toggles()).includes('Recently deleted (1)'), await toggles());

  await clickRowBtn(page, 'cemSavedQuotes', 'Brisco, Hal', 'Delete');
  await page.waitForTimeout(200);
  let w = await writesOf(page);
  ok('Delete is one deletedAt update, never a remove', w.length === 1 && w[0].op === 'update' && w[0].path === 'quotes/cem/q4002' && w[0].keys.join() === 'deletedAt', w);
  ok('the record is still in the database', !!(await dbRec(page, 'quotes/cem/q4002')));
  ok('it leaves the list and the in-memory array', await page.evaluate(() => !_cemSavedQuotes.find(q => q.id === 4002)));
  ok('Recently deleted now counts 2', (await toggles()).includes('Recently deleted (2)'), await toggles());

  await page.evaluate(() => bwToggleShowDeleted('cem'));
  await page.waitForTimeout(100);
  const del = await page.evaluate(() => [...document.querySelectorAll('#cemSavedQuotes .saved-deleted .saved-row')].map(r => ({
    name: r.querySelector('.saved-name').textContent, btns: [...r.querySelectorAll('.btn')].map(b => b.textContent) })));
  ok('Recently deleted lists both, newest first, with Restore / Delete forever',
     del.map(x => x.name).join('|') === 'Brisco, Hal|Darrow, Kit' && del.every(x => x.btns.join() === 'Restore,Delete forever'), del);

  await page.evaluate(() => bwRestoreDeleted('cem', 4002));
  await page.waitForTimeout(150);
  w = await writesOf(page);
  ok('Restore is one update that clears deletedAt', w.length === 2 && w[1].op === 'update' && w[1].path === 'quotes/cem/q4002' && w[1].keys.join() === 'deletedAt', w);
  ok('restored record is back in the list', await page.evaluate(() => !!_cemSavedQuotes.find(q => q.id === 4002)));
  ok('and its deletedAt is gone in the database', !('deletedAt' in (await dbRec(page, 'quotes/cem/q4002'))));

  // Delete forever asks first; dismissing the prompt writes nothing.
  await page.evaluate(() => bwDeleteForever('cem', 4004));
  await page.waitForTimeout(100);
  ok('dismissing the Delete forever prompt writes nothing', (await writesOf(page)).length === 2);
  page.removeAllListeners('dialog'); page.on('dialog', d => d.accept());
  await page.evaluate(() => bwDeleteForever('cem', 4004));
  await page.waitForTimeout(150);
  w = await writesOf(page);
  ok('accepting it removes exactly that one record', w.length === 3 && w[2].op === 'remove' && w[2].path === 'quotes/cem/q4004', w);
  ok('the other records are untouched', !!(await dbRec(page, 'quotes/cem/q4001')) && !!(await dbRec(page, 'quotes/cem/q4002')));
  await ctx.close();
}

console.log('\n7. Overwrite-by-name keeps the replaced version in Recently deleted');
{
  const { ctx, page } = await newPage(browser, SEED);
  page.removeAllListeners('dialog'); page.on('dialog', d => d.accept());
  await page.evaluate(() => saveQuoteRecord('cem', { id: 4999, label: 'Aldane, Prue', total: 1234, date: 'Oct 12, 2026' }, 'Aldane, Prue'));
  await page.waitForTimeout(200);
  const w = await writesOf(page);
  ok('no remove: the old version gets deletedAt', w.every(x => x.op !== 'remove') && w.some(x => x.op === 'update' && x.path === 'quotes/cem/q4001' && x.keys.join() === 'deletedAt'), w);
  ok('the new version is saved', w.some(x => x.op === 'set' && x.path === 'quotes/cem/q4999'), w);
  ok('only the new one is listed', await page.evaluate(() => _cemSavedQuotes.filter(q => q.label === 'Aldane, Prue').map(q => q.id).join() === '4999'));
  ok('the old one is restorable', await page.evaluate(() => (_bwDeletedByType.cem || []).some(q => q.id === 4001)));
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
