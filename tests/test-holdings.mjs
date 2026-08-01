// "What does this family already own" — the payoff view. Fake Firebase only.
import { chromium } from 'playwright';
import fs from 'fs';
import { BASE } from './_base.mjs';
const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };

async function open(browser, hash) {
  const ctx = await browser.newContext();
  await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  page.on('dialog', async d => { if (d.type() === 'prompt') await d.accept('T'); else await d.accept(); });
  await page.addInitScript(FAKE);
  await page.addInitScript(`window.__fake.addAccount('t@bwquote.local','pw');`);
  await page.goto(BASE + (hash ? 'index.html' + hash : ''), { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('t@bwquote.local', 'pw'));
  await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
  await page.waitForTimeout(300);
  return { ctx, page, errs };
}

// A family across three decades: 2009 property, 2019 pre-need, 2026 at-need.
const seedFamily = async () => {
  const bob = await saveParty({ given: 'Dan', family: 'Whitfield', phones: { p1: { value: '2065550147', isPrimary: true } } });
  const mk = (type, id, label, total, date, spaces) => {
    const rec = { id, label, total, date, state: {} };
    if (spaces) rec.spaces = spaces;
    _quoteStore[type]['q' + id] = rec;
    _rebuildTypeArray(type);
    return rec;
  };
  mk('cem', 2009, 'Whitfield — companion lot', 4000, 'Mar 18, 2009', [{ sid: '8115', loc: 'Sec-20 Blk-77 Lot-C Sp-3' }]);
  mk('ric', 2019, 'Whitfield — RIC', 15793.82, 'Jul 5, 2019');
  mk('ga', 2026, 'Whitfield — GA policy', 4083, 'Jul 7, 2026');
  await saveContractRole({ partyId: bob.id, recordType: 'cem', recordId: 2009, role: 'purchaser' });
  await saveContractRole({ partyId: bob.id, recordType: 'ric', recordId: 2019, role: 'purchaser' });
  await saveContractRole({ partyId: bob.id, recordType: 'ga',  recordId: 2026, role: 'insured' });
  return bob.id;
};

const browser = await chromium.launch();

// 1. Holdings resolve and group
console.log('\n1. Holdings');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async (fn) => {
    const id = await eval('(' + fn + ')')();
    const h = bwHoldingsFor(id);
    return {
      cemetery: h.cemetery.map(x => x.type + ':' + x.rec.label),
      funeral: h.funeral.map(x => x.type + ':' + x.rec.label),
      total: h.total,
      missing: h.missing.length,
      roles: h.cemetery.concat(h.funeral).map(x => x.role).sort(),
    };
  }, seedFamily.toString());
  ok('cemetery side has the 2009 lot and the RIC', r.cemetery.length === 2, r.cemetery);
  ok('funeral side has the GA policy', r.funeral.length === 1 && /ga:/.test(r.funeral[0]), r.funeral);
  ok('total across all three', Math.abs(r.total - 23876.82) < 0.01, r.total);
  ok('roles carried through', r.roles.join(',') === 'insured,purchaser,purchaser', r.roles);
  ok('nothing missing', r.missing === 0, r.missing);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 2. The rendered view
console.log('\n2. The view');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async (fn) => {
    const id = await eval('(' + fn + ')')();
    show('contacts', null);
    await new Promise(r => setTimeout(r, 150));
    const listVisible = getComputedStyle(document.getElementById('contactsList')).display !== 'none';
    openContactDetail(id);
    await new Promise(r => setTimeout(r, 200));
    const d = document.getElementById('contactDetail');
    return {
      listVisible,
      listHiddenAfter: getComputedStyle(document.getElementById('contactsList')).display === 'none',
      detailVisible: getComputedStyle(d).display !== 'none',
      text: d.textContent.replace(/\s+/g, ' '),
      html: d.innerHTML,
    };
  }, seedFamily.toString());
  ok('list shown before opening', r.listVisible);
  ok('detail replaces the list', r.listHiddenAfter && r.detailVisible, r);
  ok('shows the name', /Dan Whitfield/.test(r.text), r.text.slice(0, 90));
  ok('shows the phone', /\(206\) 555-0147/.test(r.text), r.text.slice(0, 140));
  ok('headline total', /\$23,876\.82/.test(r.text), r.text.slice(0, 200));
  ok('says how many records', /across 3 records/.test(r.text), r.text.slice(0, 200));
  ok('groups cemetery and funeral', /Cemetery/.test(r.text) && /Funeral Home/.test(r.text), r.text.slice(0, 240));
  ok('shows the 2009 space', /Sec-20 Blk-77 Lot-C Sp-3/.test(r.text), r.text.slice(0, 300));
  ok('shows roles', /Purchaser/.test(r.text) && /Insured/.test(r.text), r.text.slice(0, 300));
  ok('offers to open each record', (r.html.match(/loadSaved/g) || []).length === 3, (r.html.match(/loadSaved\w+/g) || []));
  ok('back button present', /All contacts/.test(r.text), r.text.slice(0, 80));
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 3. A prospect with nothing
console.log('\n3. A family with nothing yet');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async () => {
    const p = await saveParty({ given: 'New', family: 'Prospect', interest: 'cemetery' });
    show('contacts', null);
    openContactDetail(p.id);
    await new Promise(r => setTimeout(r, 200));
    return document.getElementById('contactDetail').textContent.replace(/\s+/g, ' ');
  });
  ok('says prospect rather than showing an empty panel', /prospect/i.test(r), r.slice(0, 160));
  ok('names what they are interested in', /cemetery/i.test(r), r.slice(0, 160));
  ok('no total is claimed', !/\$/.test(r), r.slice(0, 160));
  await ctx.close();
}

// 4. Navigation
console.log('\n4. Navigation');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async (fn) => {
    const id = await eval('(' + fn + ')')();
    show('contacts', null);
    openContactDetail(id);
    await new Promise(r => setTimeout(r, 150));
    closeContactDetail();
    await new Promise(r => setTimeout(r, 150));
    const backToList = getComputedStyle(document.getElementById('contactsList')).display !== 'none';
    openContactDetail(id);
    await new Promise(r => setTimeout(r, 100));
    show('cem-quote', null);          // leaving the section
    await new Promise(r => setTimeout(r, 150));
    const detailClosed = _bwDetailId === null;
    show('contacts', null);
    await new Promise(r => setTimeout(r, 150));
    return { backToList, detailClosed, listShown: getComputedStyle(document.getElementById('contactsList')).display !== 'none' };
  }, seedFamily.toString());
  ok('back returns to the list', r.backToList);
  ok('leaving the section closes the detail', r.detailClosed);
  ok('returning lands on the list, not a stale panel', r.listShown);
  await ctx.close();
}

// 5. Deep link
console.log('\n5. Deep link');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async (fn) => {
    const id = await eval('(' + fn + ')')();
    location.hash = '#contacts?id=' + id;
    await new Promise(r => setTimeout(r, 350));
    return {
      open: _bwDetailId === id,
      text: document.getElementById('contactDetail').textContent.replace(/\s+/g, ' ').slice(0, 60),
    };
  }, seedFamily.toString());
  ok('#contacts?id= opens that family', r.open, r);
  ok('and renders them', /Dan Whitfield/.test(r.text), r.text);

  const bad = await page.evaluate(async () => {
    location.hash = '#contacts?id=does-not-exist';
    await new Promise(r => setTimeout(r, 250));
    return { detail: _bwDetailId, listShown: getComputedStyle(document.getElementById('contactsList')).display !== 'none' };
  });
  ok('an unknown id falls back to the list, not the wrong family', bad.detail === null, bad);
  ok('and the list is shown', bad.listShown === true, bad);
  await ctx.close();
}

// 6. Live update while open
console.log('\n6. Stays current');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async (fn) => {
    const id = await eval('(' + fn + ')')();
    show('contacts', null);
    openContactDetail(id);
    await new Promise(r => setTimeout(r, 150));
    const before = document.getElementById('contactDetail').textContent.replace(/\s+/g, ' ');
    // another quote linked to the same family, as if saved elsewhere
    _quoteStore.an['q3000'] = { id: 3000, label: 'Whitfield — at-need', total: 8280, date: 'Jul 9, 2026', state: {} };
    _rebuildTypeArray('an');
    await saveContractRole({ partyId: id, recordType: 'an', recordId: 3000, role: 'purchaser' });
    await new Promise(r => setTimeout(r, 250));
    const after = document.getElementById('contactDetail').textContent.replace(/\s+/g, ' ');
    return { hadThree: /across 3 records/.test(before), hasFour: /across 4 records/.test(after), after: after.slice(0, 200) };
  }, seedFamily.toString());
  ok('started at three records', r.hadThree);
  ok('a newly linked quote appears without a reload', r.hasFour, r.after);
  await ctx.close();
}

// 7. Orphaned link
console.log('\n7. A link whose record is gone');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async () => {
    const p = await saveParty({ given: 'Orphan', family: 'Case' });
    await saveContractRole({ partyId: p.id, recordType: 'cem', recordId: 999999, role: 'purchaser' });
    show('contacts', null);
    openContactDetail(p.id);
    await new Promise(r => setTimeout(r, 200));
    const h = bwHoldingsFor(p.id);
    return { missing: h.missing.length, text: document.getElementById('contactDetail').textContent.replace(/\s+/g, ' ') };
  });
  ok('counted as missing, not silently dropped', r.missing === 1, r.missing);
  ok('and said so on screen', /no longer exists/.test(r.text), r.text.slice(0, 200));
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
