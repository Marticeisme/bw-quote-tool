// GA contract (11/13, Binder): a custom FH line the mapper already places on its own ("1 Hour
// Additional Funeral Director Time" -> Funeral Director Time) was ALSO offered in the custom-item
// review and, assigned to Left Other, printed a second $205 (GA $6,299.08 vs quote $6,094.08).
// Also: the disposition "Other" radio ticks Check Box45 (body donation). Synthetic fixture
// (invented name); fake Firebase only, nothing is ever written.
import { chromium } from 'playwright';
import fs from 'fs';
import { BASE } from './_base.mjs';

const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
const IDENT = 'martice@bwquote.local';
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };

const FD_CUSTOM = { label: '1 Hour Additional Funeral Director Time (family meeting)', amount: 205, taxable: false, custom: true };
const OTHER_CUSTOM = { label: 'Parking Attendant', amount: 150, taxable: false, custom: true };
const LINES = [
  { label: 'Basic Services of Funeral Director & Staff', amount: 2425, taxable: false },
  { label: 'Cremation & Processing', amount: 385, taxable: false },
  { label: 'Cremation Container: Trayview Cremation Container #242414', amount: 480, taxable: true },
  FD_CUSTOM, OTHER_CUSTOM,
];

const READ = `(async function(b64){
  var raw = atob(b64), arr = new Uint8Array(raw.length);
  for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  var f = (await PDFLib.PDFDocument.load(arr, { ignoreEncryption: true })).getForm();
  var g = function(n){ try { return f.getTextField(n).getText() || ''; } catch(e) { return ''; } };
  var c = function(n){ try { return f.getCheckBox(n).isChecked(); } catch(e) { return null; } };
  var all = {}; f.getFields().forEach(function(x){ try { if (x.getText && x.getText()) all[x.getName()] = x.getText(); } catch(e) {} });
  return { grand: g('A4176-PG1-35'), b43: c('Check Box43'), b44: c('Check Box44'), b45: c('Check Box45'), all: all };
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
async function gen(disp, staleLeft) {
  const out = await page.evaluate(({ lines, disp, staleLeft }) => {
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    set('gaInsuredName', 'Aaron Prescott'); set('gaPurchaserName', ''); set('gaContractDate', '2026-11-13');
    document.querySelector('input[name="gaDisposition"][value="' + disp + '"]').checked = true;
    const t = Math.round((lines.reduce((s, l) => s + l.amount, 0) + _bwTaxOfLines(lines)) * 100) / 100;
    window._gaPricing = { lines: JSON.parse(JSON.stringify(lines)), total: t };
    gaRenderCustomReview();
    const offered = [...document.querySelectorAll('#gaCustomReview [data-ga-cust-label]')].map(s => decodeURIComponent(s.getAttribute('data-ga-cust-label')));
    document.querySelectorAll('#gaCustomReview .ga-cust-dest').forEach(s => { s.value = 'left'; });
    if (staleLeft) {
      // A review row saved before the fix: the FD line assigned to Left Other.
      const box = document.getElementById('gaCustomReview');
      const d = document.createElement('div');
      d.innerHTML = '<span data-ga-cust-label="' + encodeURIComponent(staleLeft.label) + '" data-ga-cust-amt="' + staleLeft.amount + '"></span><select class="ga-cust-dest"><option value="left" selected>L</option></select>';
      box.appendChild(d);
    }
    return { total: t, offered };
  }, { lines: LINES, disp, staleLeft });
  const dl = page.waitForEvent('download', { timeout: 90000 });
  const r = await page.evaluate(async () => { try { await window.printGAContract(); return 'ok'; } catch (e) { return 'threw: ' + e.message; } });
  if (r !== 'ok') throw new Error(r);
  const chunks = []; for await (const c of await (await dl).createReadStream()) chunks.push(c);
  return { ...out, ...(await page.evaluate(`(${READ})(${JSON.stringify(Buffer.concat(chunks).toString('base64'))})`)) };
}

console.log('\ncustom FD-time line + an unrecognized custom line, cremation');
let r = await gen('Cremation', null);
ok('FD-time custom line is NOT offered in the review', !r.offered.includes(FD_CUSTOM.label), r.offered);
ok('the unrecognized custom line still is', r.offered.includes(OTHER_CUSTOM.label), r.offered);
ok('grand total = the quote total to the cent (no second $205)', Math.abs(num(r.grand) - r.total) < 0.005, [r.grand, r.total]);
const fdVals = Object.entries(r.all).filter(([k, v]) => /Funeral Director Time/i.test(v));
ok('Funeral Director Time printed once', fdVals.length === 1, fdVals);
ok('Cremation box ticked, Other not', r.b44 === true && r.b45 === false, [r.b43, r.b44, r.b45]);

console.log('\nstale review row assigns the FD line to Left Other');
r = await gen('Cremation', FD_CUSTOM);
ok('stale assignment skipped: total still matches', Math.abs(num(r.grand) - r.total) < 0.005, [r.grand, r.total]);

console.log('\ndisposition Other (body donation)');
r = await gen('Other', null);
ok('Check Box45 ticked, Burial/Cremation not', r.b45 === true && r.b43 === false && r.b44 === false, [r.b43, r.b44, r.b45]);
// ClearPoint had the same double count: its custom-item review offered lines its mapper places.
console.log('\nClearPoint: same custom FD-time line, every offered line assigned Left Other');
await page.evaluate(() => show('cp-contract', null));
const cp = await page.evaluate((lines) => {
  cpClearAll();
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
  set('cpFirstName', 'Aaron'); set('cpLastName', 'Prescott'); set('cpPhone', '(206) 555-0142');
  set('cpContractDate', '2026-11-14'); set('cpContractNum', '7712045');
  document.querySelector('input[name="cpDisposition"][value="Cremation"]').checked = true;
  document.querySelector('input[name="cpGuaranteed"][value="yes"]').checked = true;
  window._cpPricing = { lines: JSON.parse(JSON.stringify(lines)), total: 0 };
  cpRenderCustomReview();
  const offered = [...document.querySelectorAll('#cpCustomReview [data-cp-cust-label]')].map(s => decodeURIComponent(s.getAttribute('data-cp-cust-label')));
  document.querySelectorAll('#cpCustomReview select').forEach(s => { s.value = 'left'; });
  return { offered, total: Math.round((lines.reduce((t, l) => t + l.amount, 0) + _bwTaxOfLines(lines)) * 100) / 100 };
}, LINES);
ok('CP: FD-time custom line is NOT offered', !cp.offered.includes(FD_CUSTOM.label), cp.offered);
ok('CP: the unrecognized custom line still is', cp.offered.includes(OTHER_CUSTOM.label), cp.offered);
{
  const dl = page.waitForEvent('download', { timeout: 90000 });
  const r = await page.evaluate(async () => { try { await window.generateClearPointContract(); return 'ok'; } catch (e) { return 'threw: ' + e.message; } });
  if (r !== 'ok') throw new Error(r);
  const chunks = []; for await (const c of await (await dl).createReadStream()) chunks.push(c);
  const fp = await page.evaluate(async (b64) => {
    const raw = atob(b64), arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    const f = (await PDFLib.PDFDocument.load(arr, { ignoreEncryption: true })).getForm();
    try { return f.getTextField('FPTotal').getText(); } catch (e) { return 'missing'; }
  }, Buffer.concat(chunks).toString('base64'));
  ok('CP: FUNERAL PLAN TOTAL = the quote total (no second $205)', Math.abs(num(fp) - cp.total) < 0.005, [fp, cp.total]);
}
ok('no page errors', errs.length === 0, errs.slice(0, 3));

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
