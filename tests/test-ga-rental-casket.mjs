// GA contract: a rental casket goes on the Casket row (Martice, 2026-11-04 — same ruling as the
// ClearPoint contract). The FH builder keeps rentals off the "Casket:" prefix (a rental is not a
// sale), so printGAContract dropped them and a viewing-then-cremation contract came out short by
// the rental ($1,930 on a real quote). Synthetic fixture (invented name); fake Firebase only,
// nothing is ever written.
import { chromium } from 'playwright';
import fs from 'fs';
import { BASE } from './_base.mjs';

const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
const IDENT = 'martice@bwquote.local';
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };

const BASE_LINES = [
  { label: 'Basic Services of Funeral Director & Staff', amount: 2425, taxable: false },
  { label: 'Cremation & Processing', amount: 385, taxable: false },
  { label: 'Viewing - Sunday-Thursday up to 3 hrs', amount: 515, taxable: false },
  { label: 'Cremation Container: Trayview Cremation Container #242414', amount: 480, taxable: true },
  { label: 'Viewing & Funeral Plan (Cremation) Discount', amount: -585, isDiscount: true },
];
const RENTAL = { label: 'Rental Casket: Brockton 27 Rental #246588', amount: 1930, taxable: true };

const READ = `(async function(b64){
  var raw = atob(b64), arr = new Uint8Array(raw.length);
  for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  var f = (await PDFLib.PDFDocument.load(arr, { ignoreEncryption: true })).getForm();
  var g = function(n){ try { return f.getTextField(n).getText() || ''; } catch(e) { return ''; } };
  return { grand: g('A4176-PG1-35'), casket: g('1002-14 - Casket'), model: g('1002-14 - Model # and Name') };
})`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true });
await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
page.on('dialog', async d => { errs.push('dialog: ' + d.message().slice(0, 120)); await d.accept(); });
await page.addInitScript(FAKE);
await page.addInitScript(`window.__fake.addAccount(${JSON.stringify(IDENT)},'pw');`);
await page.goto(BASE, { waitUntil: 'load', timeout: 120000 });
await page.evaluate(id => _fbAuth.signInWithEmailAndPassword(id, 'pw'), IDENT);
await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
await page.evaluate(() => show('ga-contract', null));

const num = s => parseFloat(String(s || '').replace(/[^0-9.\-]/g, '')) || 0;
async function gen(lines) {
  const total = await page.evaluate((lines) => {
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    set('gaInsuredName', 'Aaron Prescott'); set('gaPurchaserName', ''); set('gaContractDate', '2026-11-04');
    document.querySelector('input[name="gaDisposition"][value="Cremation"]').checked = true;
    const t = Math.round((lines.reduce((s, l) => s + l.amount, 0) + _bwTaxOfLines(lines)) * 100) / 100;
    window._gaPricing = { lines: JSON.parse(JSON.stringify(lines)), total: t };
    return t;
  }, lines);
  const dl = page.waitForEvent('download', { timeout: 90000 });
  const r = await page.evaluate(async () => { try { await window.printGAContract(); return 'ok'; } catch (e) { return 'threw: ' + e.message; } });
  if (r !== 'ok') throw new Error(r);
  const chunks = []; for await (const c of await (await dl).createReadStream()) chunks.push(c);
  return { total, ...(await page.evaluate(`(${READ})(${JSON.stringify(Buffer.concat(chunks).toString('base64'))})`)) };
}

console.log('\nrental casket + cremation container');
let r = await gen(BASE_LINES.concat([RENTAL]));
ok('Casket row = rental + container ($2,410.00)', num(r.casket) === 2410, r.casket);
ok('Model # and Name names the rental first', r.model === 'Brockton 27 Rental #246588 + Trayview Cremation Container #242414', r.model);
ok('grand total = the quote total to the cent', Math.abs(num(r.grand) - r.total) < 0.005, [r.grand, r.total]);

console.log('\nno rental (unchanged behaviour)');
r = await gen(BASE_LINES);
ok('Casket row = the container alone', num(r.casket) === 480, r.casket);
ok('Model # and Name keeps the container label as before', r.model === 'Cremation Container: Trayview Cremation Container #242414', r.model);
ok('grand total = the quote total to the cent', Math.abs(num(r.grand) - r.total) < 0.005, [r.grand, r.total]);
ok('no page errors', errs.length === 0, errs.slice(0, 3));

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
