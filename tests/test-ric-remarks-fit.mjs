// RIC remarks fit — 2026-10-18.
//
// The RIC's Remarks box is five separate one-line fields (Notes 5-9). The contract code used to
// wrap the remark at fixed character counts (48/60/60/60/60 at 8 pt) and pile any leftover onto
// Notes 9, where it printed cut off: a real 350-character remark lost its last ~120 characters
// ("...(deeded to Francis" and nothing after). Now the remark is laid out by measured width at the
// largest size up to 8 pt at which all of it fits.
//
// Also: the disclosure box's Finance Charge read "0" beside "0.00" everywhere else; on an interest
// plan the finance charge and total sale price were fixed at 0.00 / the cash price while the total
// of payments included the interest; the ACH remark printed on paid-in-full contracts; and "Name and
// address" (who the interment rights go to) was left blank.
//
// 2026-11-05: these fixes ship with the REBUILT RIC, which only Martice's account uses until Ray
// approves it for every FSD (bwRicUseRebuilt), so this suite signs in as martice. Other FSDs keep
// today's RIC unchanged; tests/test-ric-rebuilt.mjs proves that part.
//
// Drives the real UI, generates the real RIC PDF and reads the fields out of the downloaded bytes.
// Fake Firebase only: production is never contacted, and nothing here writes.
import { chromium } from 'playwright';
import fs from 'fs';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { BASE } from './_base.mjs';
const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };

const ACH = 'ACH bank withdrawals required to receive 0 percent financing and discount if applicable.';
const LONG = 'For the benefit of Avery Example (Jordan Example, daughter and POA, purchaser). Ground inurnment of a ' +
  'synthetic marble urn (serves as the vault) in the family space 12-34-C-2 (deeded to Morgan Example), recording ' +
  'fee, and a 28x16x4 Group 2 flush granite marker with installation.';

const measure = await (async () => { const d = await PDFDocument.create(); return d.embedFont(StandardFonts.Helvetica); })();

// plan: { downPct, months, rate } sets a payment plan on the RIC tab; null = paid in full
async function ric(browser, remarks, day = '2065550199', plan = null) {
  const ctx = await browser.newContext({ acceptDownloads: true });
  await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  page.on('dialog', async d => { errs.push('dialog: ' + d.message().slice(0, 140)); await d.accept(); });
  await page.addInitScript(FAKE);
  await page.addInitScript(`window.__fake.addAccount('martice@bwquote.local','pw');`);
  await page.goto(BASE, { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('martice@bwquote.local', 'pw'));
  await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
  const dl = page.waitForEvent('download', { timeout: 90000 });
  await page.evaluate(async ([remarks, day, plan]) => {
    show('cem-quote', null);
    const g = document.getElementById('qGarden');
    g.value = [...g.options].find(o => (o.value || '').split('|').length >= 2 && parseFloat(o.value.split('|')[1]) > 0).value;
    cemUpdate();
    show('ric-contract', null);
    ricImportFromQuote();
    document.getElementById('ricName').value = 'Remarks Fit Test';
    document.getElementById('ricRemarks').value = remarks;
    document.getElementById('ricControlNo').value = 'C-12345';
    document.getElementById('ricDayPhone').value = day;
    document.getElementById('ricStreet').value = '100 Example Way';
    document.getElementById('ricCity').value = 'Seattle';
    document.getElementById('ricZip').value = '98101';
    if (plan) {
      document.getElementById('ricDownAmt').value = String(Math.ceil(_ricPricing.total * plan.downPct));
      document.getElementById('ricFinMonths').value = String(plan.months);
      document.getElementById('ricFinRate').value = String(plan.rate);
      ricCalcFinancing();
    }
    await generateRICFromTab();
  }, [remarks, day, plan]);
  const d = await dl;
  const tmp = (process.env.TEMP || '/tmp') + '/bw-ric-remarks-' + process.pid + '-' + Date.now() + '.pdf';
  await d.saveAs(tmp);
  const doc = await PDFDocument.load(fs.readFileSync(tmp));
  fs.unlinkSync(tmp);
  const form = doc.getForm();
  const lines = [5, 6, 7, 8, 9].map(n => {
    const f = form.getTextField('Notes ' + n);
    const da = f.acroField.getDefaultAppearance() || '';
    const size = +((da.match(/([\d.]+)\s+Tf/) || [])[1] || 0);
    return { text: f.getText() || '', size, width: f.acroField.getWidgets()[0].getRectangle().width };
  });
  const fcTil = form.getTextField('FCAmount_TIL').getText();
  const num = n => +String(form.getTextField(n).getText() || '0').replace(/[$,]/g, '');
  const money = Object.fromEntries(['TotalCP', 'UnpaidBalance', 'FCAmount', 'TotalPayments', 'Total Sales Price', 'FCAmount_TIL',
    'UnpaidBalance_TIL', 'TotalPayments_TIL', 'TotalSalesPrice_TIL', 'PaymentAmount1'].map(n => [n, num(n)]));
  const nameAddr = form.getTextField('Name & Address').getText() || '';
  const contractNo = form.getTextField('Contract No').getText();
  const dayPhone = form.getTextField('Day Telephone No').getText();
  const dayF = form.getTextField('Day Telephone No');
  const dayInfo = { text: dayPhone, width: dayF.acroField.getWidgets()[0].getRectangle().width,
                size: +(((dayF.acroField.getDefaultAppearance() || '').match(/([\d.]+)\s+Tf/) || [])[1] || 0) };
  await ctx.close();
  return { lines, fcTil, contractNo, dayPhone, day: dayInfo, money, nameAddr, errs };
}

const words = s => s.replace(/\s+/g, ' ').trim().split(' ');
const browser = await chromium.launch();

const ZERO = { downPct: 0.10, months: 24, rate: 0 };

console.log('\n1. A long remark on a 0% plan: every word prints, in order, inside the five lines');
{
  const r = await ric(browser, LONG, '2065550199', ZERO);
  const printed = words(r.lines.map(l => l.text).join(' '));
  ok('all of the remark (with the ACH line) is on the contract, in order',
     printed.join(' ') === words(ACH + ' ' + LONG).join(' '), printed.slice(-12).join(' '));
  ok('the end of the remark is there (it used to be cut off)', /with installation\.$/.test(r.lines[4].text), r.lines[4].text);
  const over = r.lines.filter(l => l.text && measure.widthOfTextAtSize(l.text, l.size) > l.width - 6 + 0.01);
  ok('every line fits its box at its font size', over.length === 0, over);
  const sizes = [...new Set(r.lines.map(l => l.size))];
  ok('one size for all five lines, between 5 and 8 pt', sizes.length === 1 && sizes[0] >= 5 && sizes[0] <= 8, sizes);
  ok('the size is below 8 pt (this remark does not fit at 8)', sizes[0] < 8, sizes);
  ok('disclosure box Finance Charge reads $0.00 (rebuilt form writes the $)', r.fcTil === '$0.00', r.fcTil);
  ok('Contract No. prints the Control No.', r.contractNo === 'C-12345', r.contractNo);
  ok('day phone typed as digits prints formatted', r.dayPhone === '(206) 555-0199', r.dayPhone);
  ok('0% plan: total of payments = amount financed', r.money.TotalPayments === r.money.UnpaidBalance && r.money.UnpaidBalance > 0, r.money);
  ok('0% plan: total sale price = cash price', r.money['Total Sales Price'] === r.money.TotalCP, r.money);
  ok('Name and address: the purchaser with their address', r.nameAddr === 'Remarks Fit Test, 100 Example Way, Seattle, WA 98101', r.nameAddr);
  ok('no page errors', r.errs.length === 0, r.errs);
}

console.log('\n2. Paid in full: a short remark keeps the readable 8 pt, and no ACH line');
{
  const r = await ric(browser, 'For the benefit of: Avery Example');
  ok('all five lines at 8 pt', r.lines.every(l => l.size === 8), r.lines.map(l => l.size));
  ok('only the remark (the ACH line is for payment plans)', words(r.lines.map(l => l.text).join(' ')).join(' ') === words('For the benefit of: Avery Example').join(' '),
     r.lines.map(l => l.text));
  ok('no finance charge; total sale price = cash price', r.money.FCAmount === 0 && r.fcTil === '$0.00' && r.money['Total Sales Price'] === r.money.TotalCP, r.money);
  ok('no page errors', r.errs.length === 0, r.errs);
}

console.log('\n3. A remark too long for five lines at any size still generates the contract');
{
  const r = await ric(browser, (LONG + ' ').repeat(4));
  ok('the contract still generated, at the 5 pt floor', r.lines.every(l => l.size === 5), r.lines.map(l => l.size));
  ok('no page errors', r.errs.length === 0, r.errs);
}

console.log('\n4. The day phone usually holds an email: a long one fits its box');
{
  const email = 'margaret.vandervort.loosmore@outlook.com';
  const r = await ric(browser, 'For the benefit of: Avery Example', email);
  ok('the email prints as typed', r.day.text === email, r.day.text);
  ok('it fits the box at its size', measure.widthOfTextAtSize(email, r.day.size) <= r.day.width - 6 + 0.01, r.day);
  ok('and is no bigger than 9 pt', r.day.size > 0 && r.day.size <= 9, r.day.size);
  ok('no page errors', r.errs.length === 0, r.errs);
}

console.log('\n5. An interest plan (20% down, 72 months at 8%): the disclosure box adds up');
{
  const r = await ric(browser, 'For the benefit of: Avery Example', '2065550199', { downPct: 0.20, months: 72, rate: 8 });
  const m = r.money, r2 = x => Math.round(x * 100) / 100;
  // Martice 11/14: the ACH line prints only when ACH is required (a 0% plan or a discount).
  ok('no ACH line on an interest plan with no discount', !r.lines.some(l => /ACH bank withdrawals/.test(l.text)), r.lines.map(l => l.text));
  ok('total of payments = payment x 72, more than the amount financed', m.TotalPayments === r2(m.PaymentAmount1 * 72) && m.TotalPayments > m.UnpaidBalance, m);
  ok('(d) finance charge = total of payments - amount financed', m.FCAmount > 0 && m.FCAmount === r2(m.TotalPayments - m.UnpaidBalance), m);
  ok('(f) total sale price = cash price + finance charge', m['Total Sales Price'] === r2(m.TotalCP + m.FCAmount), m);
  ok('the disclosure box copies all four', m.FCAmount_TIL === m.FCAmount && m.UnpaidBalance_TIL === m.UnpaidBalance &&
     m.TotalPayments_TIL === m.TotalPayments && m.TotalSalesPrice_TIL === m['Total Sales Price'], m);
  ok('no page errors', r.errs.length === 0, r.errs);
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
