// RIC financing (rebuilt form, signed in as martice) through the real RIC tab, after Ray reported
// 11/20 that the financing portion would not work. Synthetic quotes, invented names; fake Firebase
// only, nothing is saved. Every case: the disclosure box adds up, the rate box shows the plan rate,
// the schedule prints only when something is financed, 0% plans are ACH, first payment on 10/20/25.
import { chromium } from 'playwright';
import fs from 'fs';
import { BASE } from './_base.mjs';
import { execFileSync } from 'child_process';

const WHO = process.argv[2] || 'martice';
const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
const OUT = 'scratch/test-ric-financing-out';
fs.mkdirSync(OUT, { recursive: true });

// quote shapes: [label, lines]
const space = a => ({ label: 'Garden 21 Lawn Space', amount: a, taxable: false, isSpace: true });
const ecf = a => ({ label: 'Endowment Care Fund (ECF)', amount: a, taxable: false });
const oc = a => ({ label: 'Interment Opening & Closing', amount: a, taxable: false });
const mk = a => ({ label: 'Flush Granite 44"x20"x4" — Group 1 Non-Tariffed', amount: a, taxable: true });
const vault = a => ({ label: 'Vault: Monticello', amount: a, taxable: true });
const disc = a => ({ label: 'Courtesy Discount', amount: -a, isDiscount: true, taxable: false });
const Q = {
  std:   [space(6995), ecf(1050), oc(1795), mk(2765)],                       // ~$13,048
  odd:   [space(6995.37), ecf(1049.06), oc(1795), mk(2765.11)],              // odd cents
  disc:  [space(6995), ecf(1050), oc(1795), mk(2765), disc(500)],
  huge:  [space(185000), ecf(27750), oc(4500), mk(48500), vault(12900)],     // six figures
  tiny:  [oc(150)],                                                          // tiny, exempt only
  taxonly: [mk(612.37)],                                                     // taxable only
};

// cases: quote, plan (down % of total or $, months, rate %), extra tab overrides
const C = [];
for (const n of [12, 24, 36, 48, 60]) C.push({ id: `0pct-${n}-odd`, q: 'odd', down: 0.10, n, rate: 0 });
for (const n of [24, 60]) C.push({ id: `0pct-${n}-std`, q: 'std', down: 0.10, n, rate: 0 });
C.push({ id: 'int-36@4', q: 'std', down: 0.10, n: 36, rate: 4 });
C.push({ id: 'int-48@6', q: 'odd', down: 0.10, n: 48, rate: 6 });
C.push({ id: 'int-72@10', q: 'odd', down: 0.10, n: 72, rate: 10 });
C.push({ id: 'int-60@4.5', q: 'std', down: 0.10, n: 60, rate: 4.5 });
C.push({ id: 'int-72@8-20%', q: 'std', down: 0.20, n: 72, rate: 8 });
C.push({ id: 'paid-in-full', q: 'std', down: null });
C.push({ id: 'paid-disc', q: 'disc', down: null });
C.push({ id: 'down-0-0pct', q: 'std', down: 0, n: 24, rate: 0, tab: true });
C.push({ id: 'down-0-int', q: 'std', down: 0, n: 36, rate: 4, tab: true });
C.push({ id: 'down=total', q: 'std', down: 1, n: 24, rate: 0 });
C.push({ id: 'disc-0pct-36', q: 'disc', down: 0.10, n: 24, rate: 0 });
C.push({ id: 'disc-int-36@4', q: 'disc', down: 0.10, n: 36, rate: 4 });
C.push({ id: 'huge-60@0', q: 'huge', down: 0.10, n: 60, rate: 0 });
C.push({ id: 'huge-72@10', q: 'huge', down: 0.10, n: 72, rate: 10 });
C.push({ id: 'tiny-12@0', q: 'tiny', down: 0.10, n: 12, rate: 0 });
C.push({ id: 'taxonly-24@0', q: 'taxonly', down: 0.10, n: 24, rate: 0 });
// typed on the RIC tab only (the quote had no plan)
C.push({ id: 'tab-only-36@4', q: 'std', tabOnly: { down: 1500, n: 36, rate: 4 } });
C.push({ id: 'tab-only-60@0', q: 'odd', tabOnly: { down: 1500, n: 60, rate: 0 } });
// plan on the quote, cleared to paid in full on the RIC tab
C.push({ id: 'quote-plan-cleared', q: 'std', down: 0.10, n: 60, rate: 0, clear: true });
// first-payment dates across month and year ends (import day mocked)
for (const d of ['2026-12-05', '2026-12-30', '2027-01-29', '2026-11-20', '2027-02-26'])
  C.push({ id: 'fp-' + d, q: 'std', down: 0.10, n: 24, rate: 0, now: d });

const READ = `(async function(b64){
  var raw = atob(b64), arr = new Uint8Array(raw.length);
  for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  var f = (await PDFLib.PDFDocument.load(arr, { ignoreEncryption: true })).getForm();
  var out = {};
  ['TotalCP','SubTotal','TaxAmount','DPAmount','TotalDP','UnpaidBalance','Finance Charge','FCAmount','TotalPayments',
   'Total Sales Price','FCAmount_TIL','UnpaidBalance_TIL','TotalPayments_TIL','TotalDP_TIL','TotalSalesPrice_TIL',
   'Terms','PaymentAmount1','Date of First Payment','Cash','Notes 5','Notes 6','Notes 7','Notes 8','Notes 9'].forEach(function(n){
    var v = null;
    try { v = f.getTextField(n).getText() || ''; } catch(e) { try { v = (f.getDropdown(n).getSelected() || [])[0] || ''; } catch(e2) { v = '(none)'; } }
    out[n] = v; });
  return out;
})`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true });
await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
page.on('dialog', async d => { errs.push('dialog: ' + d.message().slice(0, 160)); await d.accept(); });
await page.addInitScript(FAKE);
await page.addInitScript(`window.__fake.addAccount('${WHO}@bwquote.local','pw');`);
await page.goto(BASE + 'index.html', { waitUntil: 'load', timeout: 120000 });
await page.evaluate(w => _fbAuth.signInWithEmailAndPassword(w + '@bwquote.local', 'pw'), WHO);
await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });

const results = [];
for (const c of C) {
  errs.length = 0;
  const setup = await page.evaluate(({ c, lines }) => {
    show('ric-contract', null);
    ricClearAll();
    const total = Math.round((lines.reduce((s, l) => s + l.amount, 0) + _bwTaxOfLines(lines)) * 100) / 100;
    _cemLines = JSON.parse(JSON.stringify(lines)); _cemTotal = total;
    if (c.down === null || c.down === undefined || c.tabOnly) _finData = null;
    else {
      const downAmt = c.down <= 1 ? total * c.down : c.down;
      const r = c.rate / 100;
      _finData = { downPct: c.down, downAmt, months: c.n, rate: r, monthly: finMonthly(total - downAmt, c.n, r) };
    }
    // mock "today" for the first-payment suggestion
    const RealDate = Date;
    if (c.now) { const fixed = new RealDate(c.now + 'T12:00:00').getTime();
      window.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [fixed])); } static now() { return fixed; } }; }
    ricImportFromQuote();
    window.Date = RealDate;
    const set = (id, v) => { const e = el(id); if (e) { e.value = v; e.dispatchEvent(new Event('change')); } };
    set('ricName', 'Jordan Example'); set('ricStreet', '100 Example Way'); set('ricCity', 'Kent'); set('ricZip', '98031');
    set('ricControlNo', 'T-1120'); set('ricLocation', 'Garden 21, Section 5, Lot 12, Space 1');
    set('ricContractDate', c.now || '2026-11-20');
    if (c.tab) { set('ricDownAmt', String(c.down)); }
    if (c.tabOnly) { set('ricDownAmt', String(c.tabOnly.down)); set('ricFinMonths', String(c.tabOnly.n)); set('ricFinRate', String(c.tabOnly.rate));
      set('ricFirstPmtMonth', 'January'); set('ricFirstPmtDay', '10'); const y = el('ricFirstPmtYear'); y.value = '2027'; ricBuildFirstPmt(); }
    if (c.clear) { set('ricDownAmt', ''); set('ricFinMonths', ''); set('ricFinRate', ''); }
    ricCalcFinancing();
    const tab = { down: el('ricDownAmt').value, months: el('ricFinMonths').value, rate: el('ricFinRate').value,
      monthly: el('ricMonthlyAmt').value, first: el('ricFirstPmt').value, method: el('ricPayMethod').value };
    generateRICFromTab();
    return { total, tab };
  }, { c, lines: Q[c.q] }).catch(e => ({ error: e.message }));
  let pdf = null;
  try {
    const dl = await page.waitForEvent('download', { timeout: 60000 });
    const file = `${OUT}/${c.id}.pdf`; await dl.saveAs(file);
    pdf = await page.evaluate(`(${READ})(${JSON.stringify(fs.readFileSync(file).toString('base64'))})`);
  } catch (e) { pdf = { error: e.message }; }
  results.push({ c, setup, pdf, errs: errs.slice() });
  process.stdout.write('.');
}
await browser.close();
fs.writeFileSync(OUT + '/results.json', JSON.stringify(results, null, 1));
const rep = execFileSync('node', ['tests/_ric-fin-check.mjs', OUT + '/results.json']).toString();
const breaks = rep.split(/\n(?=BREAK|ok   )/).filter(b => b.startsWith('BREAK'))
  // the odd-first-period APR is Martice's call (11/20), not a failure here
  .filter(b => b.split('\n').filter(l => l.includes('!!')).some(l => !/true APR/.test(l)));
console.log(rep);
console.log(breaks.length ? breaks.length + ' case(s) broke' : results.length + ' cases, all add up');
process.exit(breaks.length ? 1 : 0);
