// Saved quotes must carry their own lines, so a price change can never empty them.
// Fake Firebase only — production is never contacted.
import { chromium } from 'playwright';
import fs from 'fs';
import { BASE } from './_base.mjs';
const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };

async function open(browser) {
  const ctx = await browser.newContext();
  await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  await page.addInitScript(FAKE);
  await page.addInitScript(`window.__fake.addAccount('t@bwquote.local','pw');`);
  await page.goto(BASE, { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('t@bwquote.local', 'pw'));
  await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
  await page.waitForTimeout(250);
  return { ctx, page, errs };
}

const browser = await chromium.launch();

// 1. Lines are captured on save
console.log('\n1. Saved quotes carry their lines');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async () => {
    show('cem-quote', null);
    const g = document.getElementById('qGarden');
    g.value = [...g.options].find(o => /\|/.test(o.value)).value;
    const oc = document.getElementById('qOCNiche'); if (oc) oc.checked = true;
    cemUpdateD();
    await new Promise(r => setTimeout(r, 200));
    const st = captureCemState();
    return {
      total: _cemTotal,
      liveLines: (_cemLines || []).map(l => l.label),
      savedLines: (st.lines || []).map(l => l.label),
      savedAmounts: (st.lines || []).map(l => l.amount),
      savedTotal: st.total,
    };
  });
  ok('cemetery lines persisted', r.savedLines.length > 0 && r.savedLines.length === r.liveLines.length, r);
  ok('with their amounts', r.savedAmounts.every(a => typeof a === 'number'), r.savedAmounts);
  ok('and the total', r.savedTotal === r.total, r);

  const fh = await page.evaluate(async () => {
    show('fh-quote', null);
    const sel = document.getElementById('fhBurialPlan');
    if (sel) { sel.value = [...sel.options].find(o => /^\d{3,}/.test(o.value))?.value || ''; fhPlanChange('burial'); }
    fhUpdate();
    await new Promise(r => setTimeout(r, 200));
    const st = captureFhState();
    return { lines: (st.lines || []).length, total: st.total, live: (_fhLines || []).length };
  });
  ok('funeral home lines persisted', fh.lines === fh.live && fh.lines > 0, fh);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 2. THE BUG: a price change used to empty the quote
console.log('\n2. A price change no longer loses the quote');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async () => {
    show('cem-quote', null);
    const g = document.getElementById('qGarden');
    const chosen = [...g.options].find(o => /\|/.test(o.value)).value;
    g.value = chosen;
    const oc = document.getElementById('qOCNiche'); if (oc) oc.checked = true;
    cemUpdateD();
    await new Promise(r => setTimeout(r, 200));
    const before = { total: _cemTotal, lines: (_cemLines || []).map(l => l.label + '=' + l.amount) };
    const snap = { id: 1, label: 'Vintage Test', total: _cemTotal, state: captureCemState(), date: 'Jul 1, 2026' };
    _quoteStore.cem['q1'] = snap; _rebuildTypeArray('cem');

    // annual price rise: the option is reissued at a new price
    const opt = [...g.options].find(o => o.value === chosen);
    const parts = opt.value.split('|');
    opt.value = parts[0] + '|' + (Number(parts[1]) + 500) + '|' + parts[2];

    loadSavedCemQuote(1);
    await new Promise(r => setTimeout(r, 300));

    const banner = document.getElementById('bwVintageBanner');
    return {
      before,
      rebuiltTotal: _cemTotal,
      savedLinesIntact: (snap.state.lines || []).map(l => l.label + '=' + l.amount),
      bannerShown: !!banner,
      bannerText: banner ? banner.textContent.replace(/\s+/g, ' ').trim() : '',
    };
  });
  ok('the saved record still has every line at its quoted amount',
    r.savedLinesIntact.join('|') === r.before.lines.join('|'), { saved: r.savedLinesIntact, before: r.before.lines });
  ok('the orphaned line is reported, not swallowed', /could not be rebuilt/.test(r.bannerText), r.bannerText.slice(0, 200));
  ok('the banner shows what was quoted', new RegExp('Quoted').test(r.bannerText) && /\$/.test(r.bannerText), r.bannerText.slice(0, 120));
  ok('and what it costs today', /today/i.test(r.bannerText), r.bannerText.slice(0, 120));
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 3. Unchanged prices: both totals agree, nothing alarming
console.log('\n3. Nothing changed since');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async () => {
    show('cem-quote', null);
    const g = document.getElementById('qGarden');
    g.value = [...g.options].find(o => /\|/.test(o.value)).value;
    cemUpdateD();
    await new Promise(r => setTimeout(r, 200));
    const snap = { id: 2, label: 'Same Prices', total: _cemTotal, state: captureCemState(), date: 'Jul 2, 2026' };
    _quoteStore.cem['q2'] = snap; _rebuildTypeArray('cem');
    loadSavedCemQuote(2);
    await new Promise(r => setTimeout(r, 300));
    const b = document.getElementById('bwVintageBanner');
    return { total: _cemTotal, savedTotal: snap.total, text: b ? b.textContent.replace(/\s+/g, ' ') : '' };
  });
  ok('totals match on reload', Math.abs(r.total - r.savedTotal) < 0.005, r);
  ok('no "could not be rebuilt" warning', !/could not be rebuilt/.test(r.text), r.text.slice(0, 120));
  await ctx.close();
}

// 4. Old records without lines
console.log('\n4. Records saved before this change');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async () => {
    show('cem-quote', null);
    const g = document.getElementById('qGarden');
    g.value = [...g.options].find(o => /\|/.test(o.value)).value;
    cemUpdateD();
    await new Promise(r => setTimeout(r, 150));
    const st = captureCemState();
    delete st.lines;                       // exactly what a pre-fix record looks like
    _quoteStore.cem['q3'] = { id: 3, label: 'Legacy', total: st.total, state: st, date: 'Jun 1, 2026' };
    _rebuildTypeArray('cem');
    loadSavedCemQuote(3);
    await new Promise(r => setTimeout(r, 300));
    return { banner: !!document.getElementById('bwVintageBanner'), total: _cemTotal, loaded: !!document.getElementById('qGarden').value };
  });
  ok('legacy record still loads', r.loaded && r.total > 0, r);
  ok('no banner claiming it is unchanged', r.banner === false, r);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 5. Banner clears on a new quote
console.log('\n5. Banner lifecycle');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async () => {
    show('cem-quote', null);
    const g = document.getElementById('qGarden');
    g.value = [...g.options].find(o => /\|/.test(o.value)).value;
    cemUpdateD(); await new Promise(r => setTimeout(r, 150));
    const snap = { id: 4, label: 'X', total: _cemTotal, state: captureCemState(), date: 'Jul 3, 2026' };
    _quoteStore.cem['q4'] = snap; _rebuildTypeArray('cem');
    const opt = [...g.options].find(o => o.value === g.value);
    const p = opt.value.split('|'); opt.value = p[0] + '|' + (Number(p[1]) + 100) + '|' + p[2];
    loadSavedCemQuote(4); await new Promise(r => setTimeout(r, 250));
    const shown = !!document.getElementById('bwVintageBanner');
    resetCemQuote(); await new Promise(r => setTimeout(r, 150));
    const afterReset = !!document.getElementById('bwVintageBanner');
    return { shown, afterReset };
  });
  ok('banner appears on a vintage mismatch', r.shown);
  ok('and clears when starting a new quote', r.afterReset === false);
  await ctx.close();
}

// 6. Saving still writes one record, contracts untouched
console.log('\n6. No collateral damage');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async () => {
    window.__fake.clearLog();
    await saveQuoteRecord('cem', { id: 900, label: 'W', total: 1, date: 'x', state: captureCemState() }, 'W');
    const st = captureRicState ? captureRicState() : null;
    return {
      writes: window.__fake.log().filter(l => !['once', 'signIn', 'signOut'].includes(l.op)),
      ricUnchanged: st ? ('ricPricing' in st) : true,
    };
  });
  ok('one write per save, unchanged', r.writes.length === 1 && /^quotes\/cem\//.test(r.writes[0].path), r.writes);
  ok('contract capture untouched', r.ricUnchanged);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
