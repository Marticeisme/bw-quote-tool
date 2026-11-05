// Rebuilt RIC — 2026-11-05.
//
// Martice's RIC tab makes the rebuilt RIC (pdf-templates/embedded/RIC_REBUILT_PDF.pdf: today's wording,
// redrawn, with real boxes for city/state/zip and the signing dates). Every other FSD keeps today's
// RIC until Ray approves the switch for everyone (Martice: "rays approval is to fully replace it with
// the current ric and all fsds not me"). This suite pins both halves:
//   1. martice: the switch shows, the rebuilt form is used and filled (dates, city/state/zip, "$" on
//      money boxes, Contract No, conveyance name & address, O/C and recording descriptions)
//   2. martice with the switch unticked: today's form
//   3. another FSD: the switch is hidden and today's form comes out with today's values
//   4. an interest plan on the rebuilt form: finance charge and total sale price add up
// (2026-11-05 one-off proof, scratch/ric-adopt/cmp_old_path.py: another FSD's RIC from this code was
// identical to the same RIC from the previous commit, every page and all 146 boxes, in 3 cases.)
//
// Drives the real UI, generates the real RIC PDF and reads the boxes out of the downloaded bytes.
// Fake Firebase only: production is never contacted, and nothing here writes.
import { chromium } from 'playwright';
import fs from 'fs';
import { PDFDocument } from 'pdf-lib';
import { BASE } from './_base.mjs';
const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };

async function ric(browser, who, { untick = false, rate = 0 } = {}) {
  const ctx = await browser.newContext({ acceptDownloads: true });
  await ctx.route(/gstatic\.com\/firebasejs/, (r) => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('dialog', async (d) => { errs.push('dialog: ' + d.message().slice(0, 140)); await d.accept(); });
  await page.addInitScript(FAKE);
  await page.addInitScript(`window.__fake.addAccount('${who}@bwquote.local','pw');`);
  await page.goto(BASE, { waitUntil: 'load', timeout: 120000 });
  await page.evaluate((w) => _fbAuth.signInWithEmailAndPassword(w + '@bwquote.local', 'pw'), who);
  await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
  const switchShown = await page.evaluate(() => el('ricUseRebuiltRow').style.display !== 'none');
  const dl = page.waitForEvent('download', { timeout: 90000 });
  await page.evaluate(([untick, rate]) => {
    show('cem-quote', null);
    const g = el('qGarden');
    g.value = [...g.options].find((o) => (o.value || '').split('|').length >= 2 && parseFloat(o.value.split('|')[1]) > 0).value;
    el('qOCLawnSingle').checked = true; el('qRecGround').checked = true;
    cemUpdate();
    const total = _cemTotal, down = Math.round(total * 0.10 * 100) / 100, n = rate ? 72 : 60, r = rate / 100, P = total - down;
    const monthly = r ? Math.round(P * (r / 12) / (1 - Math.pow(1 + r / 12, -n)) * 100) / 100 : Math.round(P / n * 100) / 100;
    _finData = { downPct: 0.10, downAmt: down, months: n, rate: r, monthly };
    show('ric-contract', null);
    ricImportFromQuote();
    const set = (id, v) => { el(id).value = v; el(id).dispatchEvent(new Event('change')); };
    set('ricName', 'Avery Example'); set('ricStreet', '100 Example Way'); set('ricCity', 'SeaTac'); set('ricZip', '98188');
    set('ricControlNo', 'T-24680'); set('ricContractDate', '2026-11-05'); set('ricDayPhone', '2065550199');
    if (untick) el('ricUseRebuilt').checked = false;
    generateRICFromTab();
  }, [untick, rate]);
  const bytes = await (await dl).createReadStream().then((s) => new Promise((res) => { const b = []; s.on('data', (c) => b.push(c)); s.on('end', () => res(Buffer.concat(b))); }));
  await ctx.close();
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = doc.getForm();
  const has = (n) => { try { form.getField(n); return true; } catch (e) { return false; } };
  const txt = (n) => { try { return form.getTextField(n).getText() || ''; } catch (e) { return null; } };
  const num = (n) => +String(txt(n) || '0').replace(/[$,]/g, '');
  return { switchShown, errs, has, txt, num, pages: doc.getPageCount() };
}

const browser = await chromium.launch();

console.log('\n1. Martice: the rebuilt RIC, filled');
{
  const r = await ric(browser, 'martice');
  ok('the switch shows for Martice', r.switchShown);
  ok('the rebuilt form is used (it has a City box; today\'s form does not)', r.has('City') && r.has('Signed Day') && !r.has('Text3'));
  ok('6 pages: front, back, 2 consent, ACH, Rules', r.pages === 6, r.pages);
  ok('City / State / Zip filled', r.txt('City') === 'SeaTac' && r.txt('State') === 'WA' && r.txt('Zip Code') === '98188', [r.txt('City'), r.txt('State'), r.txt('Zip Code')]);
  ok('Signed and Accepted dates filled', r.txt('Signed Day') === '5th' && r.txt('Month') === 'November' && r.txt('Signed Year') === '2026'
    && r.txt('Accepted Day') === '5th' && r.txt('Accepted Month') === 'November' && r.txt('Accepted Year') === '2026',
    ['Signed Day', 'Month', 'Signed Year', 'Accepted Day', 'Accepted Month', 'Accepted Year'].map(r.txt));
  ok('money boxes carry "$"', /^\$[\d,]+\.\d\d$/.test(r.txt('TotalCP')) && /^\$/.test(r.txt('NonTax1')) && /^\$/.test(r.txt('PaymentAmount1')), [r.txt('TotalCP'), r.txt('NonTax1')]);
  ok('Contract No = Control #', r.txt('Contract No') === 'T-24680');
  ok('conveyance name and address', r.txt('Name & Address') === 'Avery Example, 100 Example Way, SeaTac, WA 98188', r.txt('Name & Address'));
  ok('O/C and recording descriptions', /Lawn Interment/.test(r.txt('Opening/Closing Description')) && r.txt('Recording Fee Description') === 'Interment',
    [r.txt('Opening/Closing Description'), r.txt('Recording Fee Description')]);
  ok('day phone formatted', r.txt('Day Telephone No') === '(206) 555-0199', r.txt('Day Telephone No'));
  ok('no page errors', r.errs.length === 0, r.errs);
}

console.log('\n2. Martice with the switch unticked: today\'s form');
{
  const r = await ric(browser, 'martice', { untick: true });
  ok('today\'s form is used', !r.has('City') && r.has('Text3'));
  ok('no "$" written (today\'s form prints its own)', /^[\d,]+\.\d\d$/.test(r.txt('TotalCP')), r.txt('TotalCP'));
  ok('no page errors', r.errs.length === 0, r.errs);
}

console.log('\n3. Another FSD: today\'s RIC, unchanged');
{
  const r = await ric(browser, 'randy');
  ok('the switch is hidden', !r.switchShown);
  ok('today\'s form is used', !r.has('City') && r.has('Text3'));
  ok('today\'s values: FCAmount_TIL "0", no "$", day phone as typed', r.txt('FCAmount_TIL') === '0' && !/\$/.test(r.txt('TotalCP')) && r.txt('Day Telephone No') === '2065550199',
    [r.txt('FCAmount_TIL'), r.txt('TotalCP'), r.txt('Day Telephone No')]);
  ok('no page errors', r.errs.length === 0, r.errs);
}

console.log('\n4. Martice, 10% interest plan: the disclosure box adds up');
{
  const r = await ric(browser, 'martice', { rate: 10 });
  const fc = r.num('FCAmount'), tp = r.num('TotalPayments'), up = r.num('UnpaidBalance'), cp = r.num('TotalCP'), tsp = r.num('Total Sales Price');
  ok('finance charge = total of payments - amount financed (> 0)', fc > 0 && Math.abs(fc - (tp - up)) < 0.005, { fc, tp, up });
  ok('total sale price = cash price + finance charge', Math.abs(tsp - (cp + fc)) < 0.005, { tsp, cp, fc });
  ok('the TIL copies match', r.num('FCAmount_TIL') === fc && r.num('TotalSalesPrice_TIL') === tsp);
  ok('no page errors', r.errs.length === 0, r.errs);
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
