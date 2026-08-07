// deed-transfer-letter.html — deed transfer letter generator.
//
// The page embeds COPIES of the quote tool's property lists (qGarden / qNicheName /
// qMausName in index.html) so a standalone letter page can price property without
// loading the 12 MB tool. Copies drift; this suite's first job is to fail loudly the
// moment index.html's lists change without the letter page following (the exact
// disease data/prices.json was created to cure — three copies that disagreed).
//
// Second job: the operator-requested behaviors of 2026-08-07 — centered letterhead,
// dollar auto-formatting, and picker-driven description/value that stay editable.
//
// Standalone file, no Firebase, no storage; network blocked except Google Fonts
// (also blocked — offline run). Nothing is written anywhere by this suite.
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import path from 'path';
import { pathToFileURL } from 'url';

let pass = 0, fail = 0;
const ok = (n, c, extra) => {
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (extra ? '  — ' + extra : '')); }
};

// ---------------------------------------------------------------- list parity
const idx = readFileSync('index.html', 'utf8');
const deed = readFileSync('deed-transfer-letter.html', 'utf8');

function selectOptions(html, selectId) {
  const m = html.match(new RegExp(`<select[^>]*id="${selectId}"[\\s\\S]*?</select>`));
  if (!m) return null;
  return [...m[0].matchAll(/<option value="([^"]*)"[^>]*>([\s\S]*?)<\/option>/g)]
    .map(([, v, l]) => [v, l.replace(/&amp;/g, '&').trim()])
    .filter(([v]) => v !== '' && v !== '__custom__');
}

const idxGardens = selectOptions(idx, 'qGarden');
const mDG = deed.match(/const DEED_GARDENS = \[([\s\S]*?)\];/);
const deedGardens = [...mDG[1].matchAll(/\['([^']*)','([^']*)'\]/g)].map(([, v, l]) => [v, l]);
ok('qGarden parsed from index.html (' + (idxGardens || []).length + ' options)',
   idxGardens && idxGardens.length > 25);
ok('DEED_GARDENS matches index.html qGarden exactly (value and label, in order)',
   JSON.stringify(idxGardens) === JSON.stringify(deedGardens),
   'first mismatch: ' + JSON.stringify((idxGardens || []).find((o, i) => JSON.stringify(o) !== JSON.stringify(deedGardens[i]))));

const idxNiches = selectOptions(idx, 'qNicheName').map(([v]) => v);
const deedNiches = [...deed.match(/const DEED_NICHES = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(([, n]) => n);
ok('DEED_NICHES matches index.html qNicheName exactly',
   JSON.stringify(idxNiches) === JSON.stringify(deedNiches),
   JSON.stringify(idxNiches) + ' vs ' + JSON.stringify(deedNiches));

const idxMaus = selectOptions(idx, 'qMausName').map(([v]) => v);
const deedMaus = [...deed.match(/const DEED_MAUS = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(([, n]) => n);
ok('DEED_MAUS matches index.html qMausName exactly',
   JSON.stringify(idxMaus) === JSON.stringify(deedMaus),
   JSON.stringify(idxMaus) + ' vs ' + JSON.stringify(deedMaus));

// The tool's manual-space ECF is 10% (index.html: mausEcf = mausP * 0.1, niche same).
ok('index.html still computes manual-space ECF at 10% (deed page mirrors it)',
   /\*\s*0\.1\b/.test(idx.match(/var mausEcf[^;]*;/)?.[0] || ''));

// ------------------------------------------------------------------ behavior
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1100 } });
await ctx.route('**/*', route =>
  /^https?:/i.test(route.request().url()) ? route.abort() : route.continue());
const page = await ctx.newPage();
const jsErrors = [];
page.on('pageerror', e => jsErrors.push(e.message));
await page.goto(pathToFileURL(path.resolve('deed-transfer-letter.html')).href, { waitUntil: 'load' });

// 1 — centered letterhead
const align = await page.evaluate(() =>
  getComputedStyle(document.querySelector('#letter .lh-block')).textAlign);
ok('letterhead block is centered', align === 'center', 'text-align=' + align);

// 2 — dollar auto-format on blur
await page.fill('#currentValue', '4500');
await page.dispatchEvent('#currentValue', 'blur');
ok('typed 4500 formats to $4,500.00 on blur',
   await page.inputValue('#currentValue') === '$4,500.00',
   await page.inputValue('#currentValue'));

// 3 — garden picker: 2 spaces of Garden 10 (Good) = (8995 + 1350 ECF) x 2
await page.click('text=+ Add a space / property');
const row1 = '[data-prop-row]:nth-child(1)';
await page.selectOption(`${row1} [data-role="detail"]`, '10_good|8995|1350');
await page.fill(`${row1} [data-role="qty"]`, '2');
const desc = await page.inputValue('#propertyDescription');
ok('description auto-fills from the picker without repeating the price',
   desc.includes('Garden 10 – Garden of Reflection (Good)') && desc.includes('2 spaces') && !desc.includes('$'),
   desc);
ok('value auto-calculates: (8,995 + 1,350) x 2 = $20,690.00',
   await page.inputValue('#currentValue') === '$20,690.00',
   await page.inputValue('#currentValue'));
ok('letter preview carries the computed value',
   (await page.innerText('#letter')).includes('$20,690.00'));

// 4 — location rides into the description
await page.fill(`${row1} [data-role="loc"]`, 'Lot 42, Section B');
ok('location appears in the description',
   (await page.inputValue('#propertyDescription')).includes('(Lot 42, Section B)'),
   await page.inputValue('#propertyDescription'));

// 5 — niche row with manual price joins the total at price x 1.10 ECF
await page.click('text=+ Add a space / property');
const row2 = '[data-prop-row]:nth-child(2)';
await page.selectOption(`${row2} [data-role="type"]`, 'niche');
await page.selectOption(`${row2} [data-role="detail"]`, 'Eternal Light Niches');
await page.fill(`${row2} [data-role="price"]`, '5000');
const totalNow = await page.inputValue('#currentValue');
ok('niche adds 5,000 x 1.10 = $5,500.00 to the total ($26,190.00)',
   totalNow === '$26,190.00', totalNow);
ok('description lists both properties on separate lines',
   (await page.inputValue('#propertyDescription')).split('\n').length === 2);

// 6 — manual edits win until a picker changes
await page.fill('#propertyDescription', 'My own wording');
await page.fill('#currentValue', '$1.00');
await page.dispatchEvent('#currentValue', 'blur');
ok('typing directly does not get clobbered by mere re-render',
   await page.inputValue('#propertyDescription') === 'My own wording' &&
   await page.inputValue('#currentValue') === '$1.00');

// 7 — the letter table renders the summary from the fields
const letterText = await page.innerText('#letter');
ok('letter summary table shows the edited description and value',
   letterText.includes('My own wording') && letterText.includes('$1.00'));

ok('no page JS errors', jsErrors.length === 0, jsErrors.join(' | '));

await browser.close();
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
