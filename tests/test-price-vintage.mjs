// What happens to a SAVED quote when prices change? Read-only investigation, fake Firebase.
import { chromium } from 'playwright';
import fs from 'fs';
const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');

const browser = await chromium.launch();
const ctx = await browser.newContext();
await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
const page = await ctx.newPage();
await page.addInitScript(FAKE);
await page.addInitScript(`window.__fake.addAccount('t@bwquote.local','pw');`);
await page.goto('http://localhost:' + (process.env.PORT || 3737) + '/', { waitUntil: 'load', timeout: 120000 });
await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('t@bwquote.local', 'pw'));
await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });

const r = await page.evaluate(async () => {
  const out = {};
  show('cem-quote', null);
  const g = document.getElementById('qGarden');

  // what a garden option actually stores
  out.sampleOptionValues = [...g.options].slice(1, 4).map(o => o.value);

  // build a quote: pick a garden + a niche O&C
  g.value = [...g.options].find(o => /\|/.test(o.value)).value;
  out.chosen = g.value;
  const oc = document.getElementById('qOCNiche');
  if (oc) { oc.checked = true; }
  cemUpdateD();
  await new Promise(r => setTimeout(r, 200));
  out.totalBefore = _cemTotal;
  out.linesBefore = (_cemLines || []).map(l => l.label + ' = ' + l.amount);

  // capture as a save would
  const saved = captureCemState();
  out.storedGardenValue = saved.fields.qGarden;
  out.storedOCFlag = saved.fields.qOCNiche;

  // ── simulate an annual price change: the garden option's value is reissued ──
  const opt = [...g.options].find(o => o.value === out.chosen);
  const parts = opt.value.split('|');
  const newVal = parts[0] + '|' + (Number(parts[1]) + 500) + '|' + parts[2];
  opt.value = newVal;
  opt.text = opt.text.replace(/\$[\d,]+/, '$' + (Number(parts[1]) + 500).toLocaleString());
  out.newOptionValue = newVal;

  // now restore the OLD saved quote against the NEW option list
  restoreFieldState(saved.fields);
  cemUpdateD();
  await new Promise(r => setTimeout(r, 200));
  out.gardenValueAfterRestore = document.getElementById('qGarden').value;
  out.selectedIndexAfterRestore = document.getElementById('qGarden').selectedIndex;
  out.totalAfterRestore = _cemTotal;
  out.linesAfterRestore = (_cemLines || []).map(l => l.label + ' = ' + l.amount);
  return out;
});

console.log('garden option values look like:', r.sampleOptionValues);
console.log('\nchosen:              ', r.chosen);
console.log('stored on the quote:  ', r.storedGardenValue);
console.log('O&C checkbox stored:  ', r.storedOCFlag, '(a boolean — no price in it)');
console.log('\ntotal before:', r.totalBefore);
console.log('lines before:'); (r.linesBefore || []).forEach(l => console.log('   ' + l));
console.log('\n--- garden price raised by $500, option value reissued ---');
console.log('new option value:    ', r.newOptionValue);
console.log('garden value after restore:', JSON.stringify(r.gardenValueAfterRestore));
console.log('selectedIndex after restore:', r.selectedIndexAfterRestore);
console.log('total after restore:', r.totalAfterRestore);
console.log('lines after restore:'); (r.linesAfterRestore || []).forEach(l => console.log('   ' + l));

await browser.close();
