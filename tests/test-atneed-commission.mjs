// At-Need (CIRGAS) commission packet — the three defects reported 2026-07-30.
//
// 1. The commission worksheet under-reported what the family pays. "Total Payment Received"
//    (worksheet cell F6) was derived by ADDING the three Commissionable Sale boxes, but a
//    commissionable sale deliberately excludes ECF, discounts, opening & closing, recording
//    and install/setting fees — so a case where the family paid $5,070.96 printed $2,305
//    (the vault alone). The total paid must now be its own figure, ALONGSIDE the
//    commissionable subset, never instead of it.
//
// 2. A Co-Purchaser entered on the CIRGAS contract must arrive as the IOA's SECOND signer
//    (SIGNATURE #2 on the "IOA ADDL SIGNERS" sheet — signature #1 is the purchaser, on the
//    Interment Auth sheet itself), instead of being left for the counselor to retype.
//
// 3. The CIRGAS import must keep decedent and purchaser apart: purchaser -> Purchaser,
//    decedent -> Recipient / Deceased. It previously put "purchaser OR decedent" into
//    Purchaser and left Recipient empty, so the checklist PDF and the worksheet both named
//    the wrong person.
//
// Every name/phone/email below is synthetic (555-range, @example.com, invented names).
// Fake Firebase only — production is never contacted, and nothing here writes.
import { chromium } from 'playwright';
import fs from 'fs';
import JSZip from 'jszip';
const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };

// Synthetic family: the decedent and the purchaser are DIFFERENT people, which is the whole
// point of case 3 — a conflating import looks correct whenever they happen to match.
const FX = {
  decFirst: 'Marguerite', decMiddle: 'Elspeth', decLast: 'Thornbury',
  purchName: 'Callum Thornbury', purchRelation: 'Son',
  purchStreet: '1400 Kestrel Lane', purchCity: 'Renton', purchState: 'WA', purchZip: '98055',
  purchCell: '(206) 555-0132', purchEmail: 'cthornbury@example.com',
  coPurchName: 'Rosalind Vayne', coPurchRelation: 'Daughter',
  coPurchStreet: '22 Alder Court', coPurchCity: 'Kent', coPurchState: 'WA', coPurchZip: '98032',
  coPurchCell: '(206) 555-0178', coPurchEmail: 'rvayne@example.com',
};

async function open(browser) {
  const ctx = await browser.newContext({ acceptDownloads: true });
  await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  page.on('dialog', async d => { errs.push('dialog: ' + d.message().slice(0, 140)); await d.accept(); });
  await page.addInitScript(FAKE);
  await page.addInitScript(`window.__fake.addAccount('t@bwquote.local','pw');`);
  await page.goto('http://localhost:3737/', { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('t@bwquote.local', 'pw'));
  await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
  await page.waitForTimeout(250);
  return { ctx, page, errs };
}

// Builds a real At-Need cemetery quote: a garden space (which carries an ECF line and an
// opening & closing charge — the non-commissionable money) plus a vault (commissionable
// merchandise). That mix is exactly the shape of the reported case.
const buildAtNeedQuote = async (page) => page.evaluate(async (fx) => {
  show('cem-quote', null);
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
  const an = document.getElementById('cemTypeAN');
  if (an) { an.checked = true; cemQuoteTypeChange(); }
  set('cemClientName', fx.decFirst + ' ' + fx.decLast);
  const g = document.getElementById('qGarden');
  const opt = [...g.options].find(o => /\|/.test(o.value));
  g.value = opt.value;
  const oc = document.getElementById('qOCGround') || document.getElementById('qOCNiche');
  if (oc) oc.checked = true;
  const vault = document.getElementById('qVault');
  if (vault) {
    const vo = [...vault.options].find(o => /\d{3,}/.test(o.value));
    if (vo) vault.value = vo.value;
  }
  cemUpdateD();
  await new Promise(r => setTimeout(r, 300));
  return {
    atneed: cemQuoteType(),
    total: window._cemTotal,
    lines: (window._cemLines || []).map(l => ({ label: l.label, amount: l.amount, taxable: !!l.taxable, isSpace: !!l.isSpace, isDiscount: !!l.isDiscount })),
  };
}, FX);

const browser = await chromium.launch();

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n1. Commission worksheet reports the TOTAL paid, not just the commissionable part');
{
  const { ctx, page, errs } = await open(browser);
  const q = await buildAtNeedQuote(page);
  ok('the fixture really is an At-Need quote', q.atneed === 'atneed', q.atneed);
  ok('the quote has a non-zero total', q.total > 0, q.total);
  const hasNonCommissionable = q.lines.some(l => /endowment care|\becf\b/i.test(l.label))
    || q.lines.some(l => !l.taxable && !l.isSpace && !l.isDiscount);
  ok('the fixture contains money that is NOT commissionable (ECF / O&C / fees)', hasNonCommissionable,
    q.lines.map(l => l.label));

  const r = await page.evaluate(() => {
    show('atneed-checklist', null);
    anclImport();
    const v = id => { const e = document.getElementById(id); return e ? e.value : null; };
    const d = anclWorksheetData();
    return {
      fieldExists: !!document.getElementById('anclPmtReceived'),
      pmtField: v('anclPmtReceived'),
      crem: +v('anclCremSale'), noncrem: +v('anclNoncremSale'), merch: +v('anclMerchSale'),
      pmtReceived: d.pmtReceived, commissionableTotal: d.commissionableTotal,
      copyText: document.getElementById('anclCopyPanelPre').textContent,
      cemTotal: window._cemTotal,
    };
  });
  ok('a Total Contract Amount Paid field exists on the At-Need worksheet', r.fieldExists);
  ok('import fills it with the quote grand total',
    Math.abs(+r.pmtField - r.cemTotal) < 0.005, { field: r.pmtField, cemTotal: r.cemTotal });
  ok('worksheet F6 = the total the family pays',
    Math.abs(r.pmtReceived - r.cemTotal) < 0.005, { pmtReceived: r.pmtReceived, cemTotal: r.cemTotal });
  ok('the commissionable subset is still reported separately',
    Math.abs(r.commissionableTotal - (r.crem + r.noncrem + r.merch)) < 0.005,
    { commissionableTotal: r.commissionableTotal, rows: [r.crem, r.noncrem, r.merch] });
  // THE REGRESSION GUARD. This is the bug verbatim: the two figures were the same number.
  ok('total paid is STRICTLY GREATER than the commissionable subset for this fixture',
    r.pmtReceived > r.commissionableTotal + 0.005,
    { pmtReceived: r.pmtReceived, commissionableTotal: r.commissionableTotal });
  ok('the copy/reference panel prints BOTH figures',
    /Total Payment Received:/.test(r.copyText) && /of which Commissionable Sale:/.test(r.copyText),
    r.copyText.split('\n').slice(0, 8));
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n2. The commissionable rows themselves are untouched by the fix');
{
  const { ctx, page, errs } = await open(browser);
  await buildAtNeedQuote(page);
  const r = await page.evaluate(() => {
    show('atneed-checklist', null);
    anclImport();
    const lines = window._cemLines || [];
    return {
      propTotal: clPropertyTotal(lines),
      merchTotal: clMerchTotal(lines),
      crem: +document.getElementById('anclCremSale').value,
      noncrem: +document.getElementById('anclNoncremSale').value,
      merch: +document.getElementById('anclMerchSale').value,
      bucket: clCremationBucket(lines),
    };
  });
  ok('property commissionable sale still lands in the bucket clCremationBucket picks',
    Math.abs((r.bucket === 'crem' ? r.crem : r.noncrem) - r.propTotal) < 0.005, r);
  ok('the other property row is still zero',
    (r.bucket === 'crem' ? r.noncrem : r.crem) === 0, r);
  ok('merchandise commissionable sale unchanged', Math.abs(r.merch - r.merchTotal) < 0.005, r);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────
// The operator's actual complaint was about the DOWNLOADED file, so assert on the real
// Commission_Worksheet_2026.xlsx bytes, not just the in-page model.
console.log('\n3. The downloaded Commission Worksheet .xlsx carries the total in F6');
{
  const { ctx, page, errs } = await open(browser);
  const q = await buildAtNeedQuote(page);
  const dl = page.waitForEvent('download', { timeout: 30000 });
  await page.evaluate(async () => {
    show('atneed-checklist', null);
    anclImport();
    await clDownloadFilledWorksheet('ancl');
  });
  const d = await dl;
  const tmp = (process.env.TEMP || '/tmp') + '/bw-atneed-ws-' + process.pid + '.xlsx';
  await d.saveAs(tmp);
  const zip = await JSZip.loadAsync(fs.readFileSync(tmp));
  const xml = await zip.file('xl/worksheets/sheet1.xml').async('string');
  fs.unlinkSync(tmp);
  const cellNum = (coord) => {
    const m = xml.match(new RegExp('<c r="' + coord + '"[^>]*?(?:/>|>([\\s\\S]*?)</c>)'));
    if (!m || !m[1]) return null;
    const v = m[1].match(/<v>([\s\S]*?)<\/v>/);
    return v ? +v[1] : null;
  };
  const f6 = cellNum('F6');
  // AT NEED section rows are 10-12; only rows with a sale amount are consumed, in order.
  const rows = ['F10', 'F11', 'F12'].map(cellNum).filter(v => v !== null);
  const rowSum = rows.reduce((a, b) => a + b, 0);
  ok('F6 is present in the generated workbook', f6 !== null, { f6 });
  ok('F6 equals the quote grand total', Math.abs(f6 - q.total) < 0.005, { f6, quoteTotal: q.total });
  ok('the AT NEED commissionable rows are still written', rows.length > 0, rows);
  ok('F6 is greater than the sum of the commissionable rows (the reported bug)',
    f6 > rowSum + 0.005, { f6, rowSum, rows });
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

await browser.close();
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
