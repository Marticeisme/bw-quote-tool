// ClearPoint contract, rebuilt field layer (2026-11): what the tool's download must carry.
//
// Guards, on synthetic fixtures only (invented names, 555 numbers; fake Firebase, nothing is
// ever written):
//   1. Guaranteed / Non-Guaranteed: exactly ONE box on. The old template shipped NG Box
//      pre-checked, so every guaranteed contract printed BOTH.
//   2. Single Payment Amount is a positive amount (it used to print as a negative).
//   3. The statement's own arithmetic: the services column adds up to TOTAL SERVICES. The
//      cremation fee used to be counted in the total but printed on no line.
//   4. Every filled box's appearance fits its box (text width <= box width).
//   5. Cremation: the 3-page Cremation Authorization follows, with Container and Urn from the
//      quote; blank when the quote has none. Burial: no authorization pages.
//   6. The ClearPoint ACH (T6017-05) page follows: holder name always, the monthly debit
//      ticked with the Funeral Plan Payment only on a payment plan.
//   7. The templates' printed pages: CP_ACH_PDF_B64 exists and CP_PDF_B64's check boxes carry
//      their own appearances (no drawn "X" overlays needed).
import { chromium } from 'playwright';
import fs from 'fs';
import { BASE } from './_base.mjs';

const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
const IDENT = 'martice@bwquote.local';
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };

const LINES_CREM = [
  { label: 'Basic Services of Funeral Director and Staff', amount: 2450, taxable: false },
  { label: 'Transfer of Deceased to Funeral Home', amount: 595, taxable: false },
  { label: 'Cremation & Processing', amount: 495, taxable: false },
  { label: 'Cremation Container: Alternative Container (Cardboard)', amount: 125, taxable: true },
  { label: 'Urn: Tribute Solid Cherry Wood Urn', amount: 895, taxable: true },
  { label: 'Certified Death Certificates ×3', amount: 75, taxable: false },
  { label: 'Pierce County - Medical Examiner Review & Burial-Transit Permit', amount: 115, taxable: false },
  { label: 'Memorial Service Savings', amount: -250, isDiscount: true },
];
const LINES_CREM_BARE = [
  { label: 'Basic Services of Funeral Director and Staff', amount: 1450, taxable: false },
  { label: 'Cremation Fee', amount: 395, taxable: false },
];
const LINES_BURIAL = [
  { label: 'Basic Services of Funeral Director and Staff', amount: 2450, taxable: false },
  { label: 'Embalming', amount: 995, taxable: false },
  { label: 'Use of Hearse', amount: 450, taxable: false },
  { label: 'Casket: Lyndon Bronze (#123456)', amount: 4295, taxable: true },
];

// Everything filled, on every page, read from the page annotations (attached pages' widgets
// are not in the AcroForm), with each appearance's widest drawn line measured.
const READ = `(async function(b64){
  var raw = atob(b64), arr = new Uint8Array(raw.length);
  for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  var doc = await PDFLib.PDFDocument.load(arr, { ignoreEncryption: true });
  var helv = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  var PN = PDFLib.PDFName, out = { pages: doc.getPageCount(), vals: {}, fit: [], heights: [] };
  doc.getPages().forEach(function(pg, pi){
    out.heights.push(Math.round(pg.getHeight()));
    var an = pg.node.Annots(); if (!an) return;
    for (var j = 0; j < an.size(); j++) {
      var a = an.lookup(j, PDFLib.PDFDict); if (!a) continue;
      var t = a.get(PN.of('T')), par = a.lookup(PN.of('Parent'));
      if (!t && par) t = par.get(PN.of('T'));
      if (!t) continue;
      var name = t.decodeText ? t.decodeText() : String(t);
      var v = a.get(PN.of('V')) || (par && par.get(PN.of('V')));
      // a check box's /V is a NAME (/Yes, /On, /Off); pdf-lib decodes names without the slash
      var val = v instanceof PDFLib.PDFName ? (String(v) === '/Off' ? '' : 'ON')
              : v ? (v.decodeText ? v.decodeText() : String(v)) : '';
      if (val) out.vals[pi + ':' + name] = val;
      var ap = a.lookup(PN.of('AP'));
      var n = ap && ap.lookup(PN.of('N'));
      if (n && n instanceof PDFLib.PDFRawStream && val && val !== 'ON') {
        var txt = PDFLib.decodePDFRawStream(n).decode();
        var s = ''; for (var k = 0; k < txt.length; k++) s += String.fromCharCode(txt[k]);
        var m = s.match(/([\\d.]+) Tf/), size = m ? parseFloat(m[1]) : 0;
        var rect = a.lookup(PN.of('Rect')).asRectangle();
        var lines = [], re = /<([0-9A-Fa-f]+)>\\s*Tj|\\(((?:[^()\\\\]|\\\\.)*)\\)\\s*Tj/g, mm;
        while ((mm = re.exec(s))) {
          if (mm[1]) { var h = mm[1], str = ''; for (var q = 0; q < h.length; q += 2) str += String.fromCharCode(parseInt(h.substr(q, 2), 16)); lines.push(str); }
          else lines.push(mm[2].replace(/\\\\(.)/g, '$1'));
        }
        var widest = 0;
        lines.forEach(function(L){ try { widest = Math.max(widest, helv.widthOfTextAtSize(L, size)); } catch(e) {} });
        if (lines.length && size) out.fit.push({ page: pi, name: name, size: size, widest: Math.round(widest * 10) / 10, box: Math.round(rect.width * 10) / 10 });
      }
    }
  });
  return out;
})`;

async function open(browser) {
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
  await page.evaluate(() => show('cp-contract', null));
  return { ctx, page, errs };
}

async function generate(page, sc) {
  await page.evaluate((sc) => {
    cpClearAll();
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    set('cpFirstName', 'Aaron'); set('cpLastName', 'Prescott'); set('cpPhone', '(206) 555-0142');
    set('cpContractDate', '2026-11-04'); set('cpDownPayment', sc.dp || ''); set('cpNumPayments', sc.n || '');
    set('cpContractNum', '7712045');
    document.querySelector('input[name="cpDisposition"][value="' + sc.disp + '"]').checked = true;
    document.querySelector('input[name="cpGuaranteed"][value="' + sc.guar + '"]').checked = true;
    const total = sc.lines.reduce((t, l) => t + l.amount, 0) + _bwTaxOfLines(sc.lines);
    window._cpPricing = { lines: JSON.parse(JSON.stringify(sc.lines)), total: total };
  }, sc);
  const dl = page.waitForEvent('download', { timeout: 90000 });
  const r = await page.evaluate(async () => { try { await window.generateClearPointContract(); return 'ok'; } catch (e) { return 'threw: ' + e.message; } });
  if (r !== 'ok') throw new Error(r);
  const d = await dl;
  const chunks = []; for await (const c of await d.createReadStream()) chunks.push(c);
  return page.evaluate(`(${READ})(${JSON.stringify(Buffer.concat(chunks).toString('base64'))})`);
}

const num = s => parseFloat(String(s || '').replace(/[^0-9.\-]/g, '')) || 0;
const browser = await chromium.launch();
const { ctx, page, errs } = await open(browser);

const SC = [
  { id: 'cremation, plan, guaranteed', disp: 'Cremation', guar: 'yes', dp: '1000', n: '36', lines: LINES_CREM },
  { id: 'cremation, no urn or container, pay in full', disp: 'Cremation', guar: 'yes', lines: LINES_CREM_BARE },
  { id: 'burial, pay in full, non-guaranteed', disp: 'Burial', guar: 'no', lines: LINES_BURIAL },
];
for (const sc of SC) {
  console.log('\n' + sc.id);
  const r = await generate(page, sc);
  const v = r.vals;
  const crem = sc.disp === 'Cremation';
  ok('pages: contract 3 + ' + (crem ? 'authorization 3 + ' : '') + 'ACH 1', r.pages === (crem ? 7 : 4), r.pages);
  // 1
  const g = v['0:G Box'] === 'ON', ng = v['0:NG Box'] === 'ON';
  ok('exactly one of Guaranteed / Non-Guaranteed is checked, the right one',
    (sc.guar === 'yes' ? g && !ng : ng && !g), { g, ng });
  // 2
  const sp = v['0:SinglePaymentAmount'] || '';
  ok('single payment amount is not negative', !/^-/.test(sp), sp);
  if (!sc.n) ok('pay in full: single payment = plan total', num(sp) === num(v['0:FPTotal']), [sp, v['0:FPTotal']]);
  // 3
  const left = ['Staff Services', 'Additional Staff Services', 'Embalming', 'undefined_4', 'undefined_5', 'undefined_6', 'undefined_7',
    'undefined_9', 'undefined_10', 'undefined_11', 'undefined_12', 'undefined_13', 'undefined_14', 'undefined_15']
    .reduce((t, n) => t + num(v['2:' + n]), 0);
  ok('the services column adds up to TOTAL SERVICES', Math.abs(left - num(v['2:fill_60'])) < 0.005, [left, v['2:fill_60']]);
  const merch = ['fill_57', 'fill_58', 'fill_59'].reduce((t, n) => t + num(v['2:' + n]), 0);
  ok('TOTAL FUNERAL PRICE = services + merchandise', Math.abs(num(v['2:fill_60']) + merch - num(v['2:FP'])) < 0.005);
  ok('FUNERAL PLAN TOTAL = funeral price + cash advances', Math.abs(num(v['2:FP']) + num(v['2:CATotal']) - num(v['2:FPTotal'])) < 0.005);
  // 4
  const over = r.fit.filter(f => f.widest > f.box - 2 + 0.05 || f.size < 4.5);
  ok('every filled box fits (' + r.fit.length + ' measured)', over.length === 0, over.slice(0, 4));
  // 5
  if (crem) {
    ok('authorization pages are Legal size', r.heights.slice(3, 6).every(h => h === 1008), r.heights);
    const want = sc.lines === LINES_CREM ? ['Alternative Container (Cardboard)', 'Tribute Solid Cherry Wood Urn'] : ['', ''];
    ok('authorization Container = ' + JSON.stringify(want[0]), (v['3:Container'] || '') === want[0], v['3:Container']);
    ok('authorization Urn = ' + JSON.stringify(want[1]), (v['3:Urn'] || '') === want[1], v['3:Urn']);
    ok('authorization decedent name', v['3:Decedent Name'] === 'Aaron Prescott', v['3:Decedent Name']);
  } else {
    ok('no authorization pages on a burial', !Object.keys(v).some(k => /:(Decedent Name|Container)$/.test(k)));
  }
  // 6
  const a = r.pages - 1;
  ok('ACH holder name', v[a + ':Name'] === 'Aaron Prescott', v[a + ':Name']);
  ok('ACH contract number', v[a + ':Contract Number'] === '7712045', v[a + ':Contract Number']);
  if (sc.n) {
    ok('ACH monthly debit ticked', v[a + ':Indicated belowfor'] === 'ON');
    ok('ACH monthly amount = Funeral Plan Payment',
      num(v[a + ':authorization is revoked']) === Math.round(num(v['0:The Funeral Plan Payment equals the Funeral Plan Balance divided by the']) * 100) / 100,
      [v[a + ':authorization is revoked'], v['0:The Funeral Plan Payment equals the Funeral Plan Balance divided by the']]);
  } else {
    ok('ACH monthly debit left blank (no plan)', !v[a + ':Indicated belowfor'] && !v[a + ':authorization is revoked']);
  }
  ok('ACH bank fields left for the family', !v[a + ':Account Number'] && !v[a + ':Routing'] && !v[a + ':Bank Name']);
}
ok('no page errors', errs.length === 0, errs.slice(0, 3));

// 7. the templates as served
console.log('\ntemplates');
const t = await page.evaluate(async () => {
  const cp = await PDFLib.PDFDocument.load(await bwTemplate('CP_PDF_B64'));
  const ach = await PDFLib.PDFDocument.load(await bwTemplate('CP_ACH_PDF_B64'));
  const f = cp.getForm(), PN = PDFLib.PDFName;
  const apOk = ['G Box', 'NG Box', 'Burial', 'Cremation', 'Other', 'None'].every(n => {
    const w = f.getCheckBox(n).acroField.getWidgets()[0]; const nn = w.getAppearances().normal;
    return nn instanceof PDFLib.PDFDict && nn.keys().length === 2;
  });
  return { cpPages: cp.getPageCount(), achPages: ach.getPageCount(), achFields: ach.getForm().getFields().length,
    ngOff: !f.getCheckBox('NG Box').isChecked(), apOk, sellers: !!f.getTextField('Sellers Number') };
});
ok('CP template: 3 pages, NG Box not pre-checked', t.cpPages === 3 && t.ngOff, t);
ok('CP template: check boxes carry their own on/off appearances', t.apOk);
ok('CP template: Sellers Number field exists', t.sellers);
ok('ClearPoint ACH template: 1 page, 28 fields', t.achPages === 1 && t.achFields === 28, t);

await ctx.close();
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
