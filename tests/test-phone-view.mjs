// Phone view (body.bw-mobile) and the Text quote sheet.
//
// Fake Firebase only (tests/fake-firebase.js, gstatic SDK aborted); production is never contacted.
// The one write in this suite is a saveQuoteRecord into the fake, to test Text on a saved row.
import { chromium } from 'playwright';
import fs from 'fs';
import { BASE } from './_base.mjs';

const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };

const browser = await chromium.launch();
async function open(viewport, mobile) {
  const ctx = await browser.newContext({ viewport, isMobile: !!mobile, hasTouch: !!mobile });
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
const go = (page, id) => page.evaluate(id => show(id, document.querySelector(`.nav-item[onclick^="show('${id}'"]`)), id);
const vis = (page, sel) => page.evaluate(sel => { const e = document.querySelector(sel); return !!e && getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0; }, sel);
async function buildCem(page, atneed) {
  await go(page, 'cem-quote');
  await page.evaluate((atneed) => {
    if (atneed) { const an = document.getElementById('cemTypeAN'); an.checked = true; cemQuoteTypeChange(); }
    const g = document.getElementById('qGarden');
    g.value = [...g.options].find(o => (o.value || '').split('|').length >= 2 && parseFloat(o.value.split('|')[1]) > 0).value;
    const q = document.getElementById('qGardenQty'); if (q) q.value = '2';
    const v = document.getElementById('qSettingBurial'); if (v) v.checked = true;
    document.getElementById('cemClientName').value = 'Avery Family';
    cemUpdate();
  }, atneed);
  await page.waitForTimeout(250);
}

console.log('\n1. Desktop by default on a desktop screen, nothing phone-only showing');
{
  const { ctx, page, errs } = await open({ width: 1440, height: 900 });
  ok('no phone class', !(await page.evaluate(() => document.body.classList.contains('bw-mobile'))));
  ok('the top bar offers "Phone view"', (await page.textContent('#tbView')).trim() === 'Phone view');
  await buildCem(page);
  ok('Download PDF is there', await vis(page, '.summary-fixed.visible button[onclick="downloadCemQuotePDF()"]'));
  ok('Text quote is hidden on desktop', !(await vis(page, '.summary-fixed.visible .bw-text-btn')));
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

console.log('\n2. A phone starts in phone view, and the layout fits the screen');
{
  const { ctx, page, errs } = await open({ width: 390, height: 844 }, true);
  ok('phone class on load', await page.evaluate(() => document.body.classList.contains('bw-mobile')));
  ok('the top bar offers "Desktop"', (await page.textContent('#tbView')).trim() === 'Desktop');
  for (const id of ['home', 'cem-quote', 'fh-quote', 'combined-quote', 'cem-saved', 'ric-contract']) {
    await go(page, id); await page.waitForTimeout(150);
    const w = await page.evaluate(() => document.documentElement.scrollWidth);
    ok(id + ': no sideways scroll (' + w + 'px)', w <= 391, w);
  }
  ok('sidebar is off screen until the menu opens', await page.evaluate(() => document.querySelector('.sidebar').getBoundingClientRect().right <= 0));
  await page.click('.tb-menu'); await page.waitForTimeout(250);
  ok('menu button opens the sidebar', await page.evaluate(() => document.querySelector('.sidebar').getBoundingClientRect().left >= 0));
  await page.click(`.nav-item[onclick^="show('fh-quote'"]`); await page.waitForTimeout(250);
  ok('picking a page closes the menu and goes there',
     await page.evaluate(() => !document.body.classList.contains('bw-drawer') && document.getElementById('section-fh-quote').classList.contains('active')));
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

console.log('\n3. Text quote: same figures as the summary card, no PDF or Print on the phone');
{
  const { ctx, page, errs } = await open({ width: 390, height: 844 }, true);
  await buildCem(page);
  ok('Text quote button shows', await vis(page, '.summary-fixed.visible .bw-text-btn'));
  ok('Download PDF hidden', !(await vis(page, '.summary-fixed.visible button[onclick="downloadCemQuotePDF()"]')));
  ok('Print hidden', !(await vis(page, '.summary-fixed.visible button[onclick="printCemQuote()"]')));
  const before = await page.evaluate(() => window.__fake.log().filter(l => ['set', 'update', 'remove'].includes(l.op)).length);
  await page.click('.summary-fixed.visible .bw-text-btn'); await page.waitForTimeout(150);
  ok('the text sheet opens', await vis(page, '#bwTextSheet.open'));
  const t = await page.inputValue('#bwTextBody');
  const want = await page.evaluate(() => ({ total: fmt(_cemTotal), tax: fmt(_bwTaxOfLines(_cemLines)) }));
  ok('names the family', t.includes('Cemetery quote for Avery Family'), t);
  ok('total matches the summary card', t.includes('Total: ' + want.total), { t, want });
  ok('tax matches the summary card', t.includes('Sales tax: ' + want.tax), { t, want });
  ok('quantities collapse to ×2', /×2: \$/.test(t), t);
  ok('pre-need carries the payment option', /Payment option: \$[\d,]+\.\d\d down, about \$[\d,]+\.\d\d\/mo for 60 months at 0%/.test(t), t);
  ok('says it is an estimate and who sent it', t.includes('This is an estimate, not a contract.') && t.includes('206-445-9794'), t);
  ok('no app link in the text', !/bwquotetool|github\.io|http/i.test(t), t);
  ok('the sheet offers Text it, Email it and Copy', (await page.evaluate(() => [...document.querySelectorAll('.bwts-actions .btn')].map(b => b.textContent.trim()).join('|'))) === 'Text it|Email it|Copy');
  ok('the email subject is in the house style', (await page.evaluate(() => bwQuoteEmailSubject('cem'))) === 'Avery Family: Cemetery Quote');
  ok('the summary button reads Send quote', (await page.textContent('.summary-fixed.visible .bw-text-btn')).trim() === 'Send quote');
  ok('opening the text wrote nothing', (await page.evaluate(() => window.__fake.log().filter(l => ['set', 'update', 'remove'].includes(l.op)).length)) === before);
  await page.click('.bwts-x');
  ok('close hides the sheet', !(await vis(page, '#bwTextSheet.open')));
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

console.log('\n4. At-need text has no payment option');
{
  const { ctx, page } = await open({ width: 390, height: 844 }, true);
  await buildCem(page, true);
  const isAtNeed = await page.evaluate(() => typeof cemQuoteType === 'function' && cemQuoteType() === 'atneed');
  ok('scenario is at-need', isAtNeed);
  const t = await page.evaluate(() => bwQuoteText('cem'));
  ok('at-need title, no payment option', /at-need/i.test(t) && !/Payment option/.test(t), t);
  await ctx.close();
}

console.log('\n5. The switch is remembered per device');
{
  const { ctx, page } = await open({ width: 1440, height: 900 });
  await page.click('#tbView');
  ok('switching turns phone view on', await page.evaluate(() => document.body.classList.contains('bw-mobile')));
  ok('and stores the choice', await page.evaluate(() => localStorage.getItem('bwViewMode')) === 'mobile');
  await page.reload({ waitUntil: 'load' });
  await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('martice@bwquote.local', 'pw'));
  await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
  ok('a reload keeps phone view on a desktop screen', await page.evaluate(() => document.body.classList.contains('bw-mobile')));
  await page.click('#tbView');
  ok('switching back stores desktop', await page.evaluate(() => localStorage.getItem('bwViewMode')) === 'desktop' && !(await page.evaluate(() => document.body.classList.contains('bw-mobile'))));
  await ctx.close();
}

console.log('\n6. Text on a saved quote (phone view)');
{
  const { ctx, page, errs } = await open({ width: 390, height: 844 }, true);
  await buildCem(page);
  const total = await page.evaluate(() => fmt(_cemTotal));
  await page.evaluate(() => saveQuoteRecord('cem', { id: 777001, label: 'Avery Family - test', total: _cemTotal, state: captureCemState(), date: 'Oct 12, 2026' }, 'Avery Family - test'));
  await page.evaluate(() => resetCemQuote());
  await go(page, 'cem-saved'); await page.waitForTimeout(200);
  const btns = await page.evaluate(() => [...document.querySelectorAll('#cemSavedQuotes .saved-row .saved-actions .btn')]
    .filter(b => getComputedStyle(b).display !== 'none').map(b => b.textContent));
  ok('saved row shows Send, not PDF or Print', btns.includes('Send') && !btns.includes('PDF') && !btns.includes('Print'), btns);
  await page.evaluate(() => [...document.querySelectorAll('#cemSavedQuotes .saved-row .btn')].find(b => b.textContent === 'Send').click());
  await page.waitForTimeout(400);
  const t = await page.inputValue('#bwTextBody');
  ok('the saved quote opens in the text sheet with its total', (await vis(page, '#bwTextSheet.open')) && t.includes('Total: ' + total), { t, total });
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

console.log('\n7. Search on the phone');
{
  const { ctx, page, errs } = await open({ width: 390, height: 844 }, true);
  ok('the search box is hidden until asked for', !(await vis(page, '.tb-search')));
  await page.click('.tb-find'); await page.waitForTimeout(150);
  ok('the search button opens it under the top bar', await vis(page, '.tb-search'));
  await page.fill('#searchInput', 'vault'); await page.waitForTimeout(150);
  const r = await page.evaluate(() => { const d = document.getElementById('searchDropdown').getBoundingClientRect(); return { l: d.left, r: d.right, w: innerWidth }; });
  ok('results sit inside the screen', r.l >= 0 && r.r <= r.w + 1, r);
  ok('no sideways scroll with the search open', (await page.evaluate(() => document.documentElement.scrollWidth)) <= 391);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
