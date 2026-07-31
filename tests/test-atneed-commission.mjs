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
// generateCirgasPacket legitimately confirms before generating a packet with no pricing
// imported — these cases exercise the signature block, not the price grid, so that one
// prompt is expected. Everything else in errs is a real page error.
const unexpected = errs => errs.filter(e => !/No pricing imported yet/.test(e));

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

// ─────────────────────────────────────────────────────────────────────────────
// Generates the real CIRGAS packet and reads cells straight out of the workbook.
// Helpers below resolve a sheet by NAME (the packet has 31 sheets and sheetN.xml order is
// not tab order) and read shared strings, exactly as Excel would render them.
async function cirgasSheets(buf) {
  const zip = await JSZip.loadAsync(buf);
  const wb = await zip.file('xl/workbook.xml').async('string');
  const rels = await zip.file('xl/_rels/workbook.xml.rels').async('string');
  const relMap = {};
  for (const m of rels.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)) relMap[m[1]] = m[2];
  const paths = {};
  for (const m of wb.matchAll(/<sheet name="([^"]+)"[^>]*r:id="(rId\d+)"/g)) {
    paths[m[1].replace(/&amp;/g, '&')] = 'xl/' + relMap[m[2]].replace(/^\.?\/?/, '');
  }
  const ssXml = await zip.file('xl/sharedStrings.xml').async('string');
  const ss = [];
  for (const m of ssXml.matchAll(/<si>([\s\S]*?)<\/si>/g)) ss.push([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x => x[1]).join(''));
  const cache = {};
  return async (sheet, coord) => {
    if (!(sheet in cache)) cache[sheet] = paths[sheet] ? await zip.file(paths[sheet]).async('string') : null;
    const xml = cache[sheet];
    if (!xml) return undefined;
    const m = xml.match(new RegExp('<c r="' + coord + '"([^>]*?)(?:/>|>([\\s\\S]*?)</c>)'));
    if (!m) return undefined;
    const inner = m[2] || '';
    const t = (m[1].match(/\bt="([^"]+)"/) || [])[1];
    if (t === 'inlineStr' || /<is>/.test(inner)) return [...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x => x[1]).join('');
    const v = inner.match(/<v>([\s\S]*?)<\/v>/);
    if (!v) return '';
    return t === 's' ? ss[+v[1]] : v[1];
  };
}

const fillCirgasContract = async (page, fx, opts) => page.evaluate(([fx, opts]) => {
  show('an-contract', null);
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
  set('anDecFirst', fx.decFirst); set('anDecMiddle', fx.decMiddle); set('anDecLast', fx.decLast);
  set('anPurchName', fx.purchName); set('anPurchRelation', fx.purchRelation);
  set('anPurchStreet', fx.purchStreet); set('anPurchCity', fx.purchCity);
  set('anPurchState', fx.purchState); set('anPurchZip', fx.purchZip);
  set('anPurchCellPhone', fx.purchCell); set('anPurchEmail', fx.purchEmail);
  if (opts.coPurchaser) {
    set('anCoPurchName', fx.coPurchName); set('anCoPurchRelation', fx.coPurchRelation);
    set('anCoPurchStreet', fx.coPurchStreet); set('anCoPurchCity', fx.coPurchCity);
    set('anCoPurchState', fx.coPurchState); set('anCoPurchZip', fx.coPurchZip);
    set('anCoPurchCellPhone', fx.coPurchCell); set('anCoPurchEmail', fx.coPurchEmail);
  }
  return true;
}, [fx, opts]);

console.log('\n4. A Co-Purchaser becomes the IOA\'s SECOND signer');
{
  const { ctx, page, errs } = await open(browser);
  await fillCirgasContract(page, FX, { coPurchaser: true });
  const dl = page.waitForEvent('download', { timeout: 60000 });
  await page.evaluate(() => generateCirgasPacket());
  const d = await dl;
  const tmp = (process.env.TEMP || '/tmp') + '/bw-cirgas-co-' + process.pid + '.xlsx';
  await d.saveAs(tmp);
  const cell = await cirgasSheets(fs.readFileSync(tmp));
  fs.unlinkSync(tmp);

  // SIGNATURE #1 — the purchaser, on the Interment Auth sheet itself. Must NOT move.
  ok('IOA signature #1 is still the purchaser',
    (await cell('INTERMENT AUTH NEW', 'B69')) === FX.purchName, await cell('INTERMENT AUTH NEW', 'B69'));
  ok('IOA signature #1 relationship is the purchaser\'s',
    (await cell('INTERMENT AUTH NEW', 'O69')) === FX.purchRelation, await cell('INTERMENT AUTH NEW', 'O69'));
  // SIGNATURE #2 — rows 8..13 of IOA ADDL SIGNERS: name B10, relation O10, address B12, phone Q12.
  ok('IOA signature #2 printed name is the co-purchaser',
    (await cell('IOA ADDL SIGNERS', 'B10')) === FX.coPurchName, await cell('IOA ADDL SIGNERS', 'B10'));
  ok('IOA signature #2 relationship is the co-purchaser\'s',
    (await cell('IOA ADDL SIGNERS', 'O10')) === FX.coPurchRelation, await cell('IOA ADDL SIGNERS', 'O10'));
  ok('IOA signature #2 address is the co-purchaser\'s',
    (await cell('IOA ADDL SIGNERS', 'B12')) === [FX.coPurchStreet, FX.coPurchCity, FX.coPurchState, FX.coPurchZip].join(', '),
    await cell('IOA ADDL SIGNERS', 'B12'));
  ok('IOA signature #2 phone is the co-purchaser\'s',
    (await cell('IOA ADDL SIGNERS', 'Q12')) === FX.coPurchCell, await cell('IOA ADDL SIGNERS', 'Q12'));
  ok('"Number of Signatures required" rises to 2', +(await cell('INTERMENT AUTH NEW', 'I65')) === 2,
    await cell('INTERMENT AUTH NEW', 'I65'));
  ok('signature #3 stays empty (the co-purchaser is not duplicated down the sheet)',
    !(await cell('IOA ADDL SIGNERS', 'B18')), await cell('IOA ADDL SIGNERS', 'B18'));
  // The co-purchaser's own block on the Information / Cemetery Contract sheets is untouched.
  ok('the Information sheet still carries the co-purchaser in their own block',
    (await cell('Information', 'E25')) === FX.coPurchName, await cell('Information', 'E25'));
  ok('the Information sheet additional-signer list is NOT hijacked',
    !(await cell('Information', 'D48')), await cell('Information', 'D48'));
  ok('no page errors', unexpected(errs).length === 0, errs);
  await ctx.close();
}

console.log('\n5. With no Co-Purchaser the IOA is unchanged');
{
  const { ctx, page, errs } = await open(browser);
  await fillCirgasContract(page, FX, { coPurchaser: false });
  const dl = page.waitForEvent('download', { timeout: 60000 });
  await page.evaluate(() => generateCirgasPacket());
  const d = await dl;
  const tmp = (process.env.TEMP || '/tmp') + '/bw-cirgas-noco-' + process.pid + '.xlsx';
  await d.saveAs(tmp);
  const cell = await cirgasSheets(fs.readFileSync(tmp));
  fs.unlinkSync(tmp);
  ok('IOA signature #1 is the purchaser',
    (await cell('INTERMENT AUTH NEW', 'B69')) === FX.purchName, await cell('INTERMENT AUTH NEW', 'B69'));
  ok('IOA signature #2 stays blank', !(await cell('IOA ADDL SIGNERS', 'B10')), await cell('IOA ADDL SIGNERS', 'B10'));
  ok('"Number of Signatures required" stays 1', +(await cell('INTERMENT AUTH NEW', 'I65')) === 1,
    await cell('INTERMENT AUTH NEW', 'I65'));
  ok('no page errors', unexpected(errs).length === 0, errs);
  await ctx.close();
}

await browser.close();
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
