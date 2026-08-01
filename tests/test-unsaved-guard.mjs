// Unsaved-work guard: the beforeunload confirm must fire ONLY on genuinely unsaved work.
//
// The failure mode this guards is not a missing prompt but a worthless one — an unconditional
// confirm trains both counselors to click through it, so a real warning is never read. Also
// checks the guard did not break markCleanExit's crash detection, which shares beforeunload:
// cancelling the dialog must put the session back to LIVE, or a later crash looks like a clean
// exit and the autosave restore banner never appears.
//
// Fake Firebase only — production is never contacted.
import { chromium } from 'playwright';
import fs from 'fs';
import { BASE } from './_base.mjs';

const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
const SEED = { quotes: { cem: { q1: { id: 1, label: 'Existing Family', total: 500, date: 'x', state: { fields: {} } } } } };
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); } };

const browser = await chromium.launch();

async function open() {
  const ctx = await browser.newContext({ acceptDownloads: true });
  await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
  const page = await ctx.newPage();
  const errs = [], dialogs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(FAKE);
  await page.addInitScript(`window.__fake.seed(${JSON.stringify(SEED)}); window.__fake.addAccount('martice@bwquote.local','pw');`);
  await page.goto(BASE, { waitUntil: 'load' });
  await page.fill('#bwUser', 'martice');
  await page.fill('#bwPass', 'pw');
  await page.click('#bwGateBtn');
  await page.waitForTimeout(700);
  return { ctx, page, errs, dialogs };
}
const dirty = page => page.evaluate(() => window.bwIsDirty());

// ── 1. Clean at rest ────────────────────────────────────────────────────────────────
console.log('\n1. Nothing typed yet');
{
  const { ctx, page, errs } = await open();
  ok('not dirty after load + sign-in (gate fields excluded)', (await dirty(page)) === false);

  await page.evaluate(() => show('cem-quote', null));
  await page.waitForTimeout(150);
  ok('show() navigation does not dirty', (await dirty(page)) === false, page.url());

  await page.fill('#searchInput', 'vault');
  await page.waitForTimeout(200);
  ok('the price search box does not dirty', (await dirty(page)) === false);

  await page.evaluate(() => { show('price-list', null); });
  await page.fill('#priceListFilter', 'granite');
  await page.waitForTimeout(200);
  ok('the price-list filter does not dirty', (await dirty(page)) === false);

  await page.evaluate(() => show('cem-saved', null));
  const savedSearch = await page.$('#cemQuoteSearch');
  if (savedSearch) { await savedSearch.fill('Prescott'); await page.waitForTimeout(200); }
  ok('a saved-list "Search" box does not dirty', (await dirty(page)) === false, !!savedSearch);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ── 2. A real edit dirties; a save / load / reset cleans ────────────────────────────
console.log('\n2. Edit, then save / load / reset');
{
  const { ctx, page } = await open();
  await page.evaluate(() => show('cem-quote', null));
  await page.fill('#cemClientName', 'Aaron Prescott');
  await page.waitForTimeout(150);
  ok('typing a client name dirties', (await dirty(page)) === true);

  // A select is a `change`, not an `input`.
  const changed = await page.evaluate(async () => {
    const g = document.getElementById('qGarden');
    const opt = [...g.options].find(o => /\|/.test(o.value));
    g.value = opt.value;
    g.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 200));
    return window.bwIsDirty();
  });
  ok('changing a dropdown dirties', changed === true);

  // saveQuoteRecord is the real writer (fake Firebase — production untouched).
  const afterSave = await page.evaluate(async () => {
    saveQuoteRecord('cem', { id: 999, label: 'T', total: 1, date: 'x', state: { fields: {} } }, 'T');
    await new Promise(r => setTimeout(r, 50));
    return window.bwIsDirty();
  });
  ok('saveQuoteRecord() cleans', afterSave === false);

  const afterEditThenLoad = await page.evaluate(async () => {
    document.getElementById('cemClientName').value = 'x';
    document.getElementById('cemClientName').dispatchEvent(new Event('input', { bubbles: true }));
    const wasDirty = window.bwIsDirty();
    loadSavedCemQuote(1);
    await new Promise(r => setTimeout(r, 100));
    return { wasDirty, now: window.bwIsDirty() };
  });
  ok('loading a saved quote cleans', afterEditThenLoad.wasDirty === true && afterEditThenLoad.now === false, afterEditThenLoad);

  const afterReset = await page.evaluate(async () => {
    document.getElementById('cemClientName').value = 'y';
    document.getElementById('cemClientName').dispatchEvent(new Event('input', { bubbles: true }));
    resetCemQuote();
    await new Promise(r => setTimeout(r, 100));
    return window.bwIsDirty();
  });
  ok('resetting the quote cleans', afterReset === false);

  const afterClearAll = await page.evaluate(async () => {
    show('ric-contract', null);
    document.getElementById('ricName').value = 'z';
    document.getElementById('ricName').dispatchEvent(new Event('input', { bubbles: true }));
    ricClearAll();
    await new Promise(r => setTimeout(r, 100));
    return window.bwIsDirty();
  });
  ok('ricClearAll() cleans', afterClearAll === false);
  await ctx.close();
}

// ── 3. Generating a PDF does not prompt and does not unload ─────────────────────────
console.log('\n3. PDF generation / download');
{
  const { ctx, page, errs } = await open();
  const dialogs = [];
  page.on('dialog', async d => { dialogs.push(d.type() + ':' + d.message().slice(0, 60)); await d.accept('T'); });
  await page.evaluate(async () => {
    show('cem-quote', null);
    document.getElementById('cemClientName').value = 'Aaron Prescott';
    const g = document.getElementById('qGarden');
    g.value = [...g.options].find(o => /\|/.test(o.value)).value;
    const oc = document.getElementById('qOCNiche'); if (oc) oc.checked = true;
    cemUpdateD();
    await new Promise(r => setTimeout(r, 300));
  });
  await page.fill('#cemClientName', 'Aaron Prescott');
  ok('dirty before generating', (await dirty(page)) === true);
  const dl = page.waitForEvent('download', { timeout: 40000 });
  await page.evaluate(() => downloadCemQuotePDF());
  const d = await dl;
  ok('the PDF downloaded', !!(await d.path()), d.suggestedFilename());
  ok('no beforeunload dialog was raised by generating', !dialogs.some(x => x.startsWith('beforeunload')), dialogs);
  ok('the page is still alive on the same URL', page.url().startsWith(BASE), page.url());
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ── 4. beforeunload: fires when dirty, silent when clean ───────────────────────────
console.log('\n4. beforeunload behaviour');
{
  // 4a. clean -> closes without a dialog
  const { ctx, page } = await open();
  let saw = null;
  page.on('dialog', async d => { saw = d.type(); await d.dismiss(); });
  await page.close({ runBeforeUnload: true });
  await new Promise(r => setTimeout(r, 800));
  ok('clean session closes with no dialog', saw === null, saw);
  await ctx.close();
}
{
  // 4b. dirty -> dialog, and cancelling restores markCleanExit's "session is live" flag
  const { ctx, page } = await open();
  await page.evaluate(() => show('cem-quote', null));
  await page.fill('#cemClientName', 'Aaron Prescott');
  await page.waitForTimeout(150);
  const flagBefore = await page.evaluate(() => localStorage.getItem('bw_as_clean_exit'));
  ok('session flagged live before the close attempt', flagBefore === '0', flagBefore);

  let seen = null;
  page.on('dialog', async d => { seen = d.type(); await d.dismiss(); });   // dismiss = "Stay"
  await page.close({ runBeforeUnload: true });
  await new Promise(r => setTimeout(r, 1200));
  ok('dirty session raises the beforeunload dialog', seen === 'beforeunload', seen);
  ok('page survived the dismissed dialog', !page.isClosed());
  if (!page.isClosed()) {
    const flagAfter = await page.evaluate(() => localStorage.getItem('bw_as_clean_exit'));
    ok('markCleanExit intact: cancelling puts the session back to LIVE, so a later crash still restores',
      flagAfter === '0', flagAfter);
    const stillDirty = await dirty(page);
    ok('still dirty after cancelling', stillDirty === true);
  }
  await ctx.close();
}
{
  // 4c. suppression window: a deliberate navigation must not prompt
  const { ctx, page } = await open();
  await page.evaluate(() => show('cem-quote', null));
  await page.fill('#cemClientName', 'Aaron Prescott');
  await page.waitForTimeout(150);
  ok('dirty before suppressing', (await dirty(page)) === true);
  await page.evaluate(() => bwSuppressUnloadPrompt(5000));
  ok('bwIsDirty() reports false inside the suppression window', (await dirty(page)) === false);
  let saw2 = null;
  page.on('dialog', async d => { saw2 = d.type(); await d.dismiss(); });
  await page.close({ runBeforeUnload: true });
  await new Promise(r => setTimeout(r, 800));
  ok('no dialog during a deliberate navigation', saw2 === null, saw2);
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
