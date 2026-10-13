// "Today $X (+$Y)" on the saved quote list: each saved quote rebuilt at today's prices.
//
// Fake Firebase only (gstatic SDK aborted); production is never contacted. Records are written to
// the fake with saveQuoteRecord, then made stale by editing what they say was quoted.
import { chromium } from 'playwright';
import fs from 'fs';
import { BASE } from './_base.mjs';

const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };

const browser = await chromium.launch();
async function open() {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.dismiss());
  await page.addInitScript(FAKE);
  await page.addInitScript(`window.__fake.addAccount('martice@bwquote.local', 'pw');`);
  await page.goto(BASE + 'index.html', { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('martice@bwquote.local', 'pw'));
  await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
  return { ctx, page, errs };
}
// Build a quote, save three copies: current, quoted $700 lower, and one with a line that no longer exists.
async function seedThree(page) {
  return page.evaluate(() => {
    show('cem-quote', null);
    const g = document.getElementById('qGarden');
    g.value = [...g.options].find(o => (o.value || '').split('|').length >= 2 && parseFloat(o.value.split('|')[1]) > 0).value;
    document.getElementById('qGardenQty').value = '2';
    document.getElementById('qSettingBurial').checked = true;
    cemUpdate();
    const st = captureCemState(), total = _cemTotal;
    const clone = o => JSON.parse(JSON.stringify(o));
    const same = clone(st);
    const cheaper = clone(st); cheaper.lines[0].amount -= 700; cheaper.total -= 700;
    const gone = clone(st); gone.lines.push({ label: 'Discontinued Vase Model Z', amount: 410, taxable: true }); gone.total += 410;
    saveQuoteRecord('cem', { id: 900001, label: 'Same Price', total: same.total, state: same, date: 'Oct 1, 2026' }, 'Same Price');
    saveQuoteRecord('cem', { id: 900002, label: 'Quoted Lower', total: cheaper.total, state: cheaper, date: 'Jul 1, 2026' }, 'Quoted Lower');
    saveQuoteRecord('cem', { id: 900003, label: 'Has Gone Item', total: gone.total, state: gone, date: 'Jun 1, 2026' }, 'Has Gone Item');
    resetCemQuote(); cemUpdate(); bwMarkClean();
    return { total };
  });
}
const pills = page => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('#cemSavedQuotes .saved-row')].map(r =>
  [r.querySelector('.saved-name').textContent, (r.querySelector('.pill-price') || {}).textContent || ''])));

console.log('\n1. Opening the saved list checks each quote at today\'s prices');
{
  const { ctx, page, errs } = await open();
  const { total } = await seedThree(page);
  const writesBefore = await page.evaluate(() => window.__fake.log().filter(l => ['set', 'update', 'remove'].includes(l.op)).length);
  await page.evaluate(() => show('cem-saved', document.getElementById('navCemSaved')));
  await page.waitForFunction(() => !_bwPriceBusy.cem && Object.keys(_bwPriceNow.cem).length >= 3, { timeout: 15000 });
  await page.waitForTimeout(100);
  const p = await pills(page);
  const fmtTotal = await page.evaluate(t => fmt(t), total);
  ok('a quote at today\'s price shows no tag', p['Same Price'] === '', p);
  ok('a quote quoted $700 lower shows Today and +$700.00', p['Quoted Lower'] === 'Today ' + fmtTotal + ' (+$700.00)', { got: p['Quoted Lower'], want: 'Today ' + fmtTotal + ' (+$700.00)' });
  ok('a quote with an item that no longer exists says to re-pick it', p['Has Gone Item'] === '1 item to re-pick', p);
  ok('the tag explains itself on hover', await page.evaluate(() => /Quoted .* today/.test(document.querySelector('#cemSavedQuotes .pill-price.up').title)));
  ok('the check wrote nothing to the database', (await page.evaluate(() => window.__fake.log().filter(l => ['set', 'update', 'remove'].includes(l.op)).length)) === writesBefore);
  ok('the builder is left empty', await page.evaluate(() => (_cemLines || []).filter(l => !l.isDiscount).length === 0 && !document.getElementById('cemClientName').value));
  ok('and nothing is marked unsaved', await page.evaluate(() => !bwIsDirty()));
  ok('no saved record is marked loaded', await page.evaluate(() => !_bwLoadedRecordId.cem));
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

console.log('\n2. Work in progress is never touched');
{
  const { ctx, page } = await open();
  await seedThree(page);
  // The counselor is mid-quote: a family name typed into the builder.
  await page.evaluate(() => { show('cem-quote', null); });
  await page.fill('#cemClientName', 'Work In Progress');
  await page.evaluate(() => show('cem-saved', document.getElementById('navCemSaved')));
  await page.waitForTimeout(800);
  ok('no check runs while the builder holds work', await page.evaluate(() => Object.keys(_bwPriceNow.cem).length === 0));
  ok('the typed name is still there', await page.evaluate(() => document.getElementById('cemClientName').value === 'Work In Progress'));
  ok('so no tags show', Object.values(await pills(page)).every(v => v === ''));
  await ctx.close();
}

console.log('\n3. Reopening a saved quote still works (shared restore step)');
{
  const { ctx, page, errs } = await open();
  const { total } = await seedThree(page);
  await page.evaluate(() => loadSavedCemQuote(900002));
  await page.waitForTimeout(200);
  const r = await page.evaluate(() => ({ total: _cemTotal, banner: (document.getElementById('bwVintageBanner') || {}).textContent || '' }));
  ok('the reopened quote prices at today\'s total', Math.abs(r.total - total) < 0.005, r);
  ok('and the vintage banner shows the $700 difference', /\+\$700\.00/.test(r.banner), r.banner);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
