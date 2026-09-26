// Three operator changes from 2026-09-25, held together:
//
// 1. Accounting email (3rd Party / outside-vendor memorials): the Inspection & Review fee is a
//    cemetery SERVICE and is not taxable. Only the Installation stays in Merchandise with tax.
//    On the CIRGAS, Other 1 = "3rd Party Administrative Fee", Other 2 = "3rd Party Inspection &
//    Review Fee", Installation on the merchandise Installation row. Accounting's worked example
//    (32x20 flat): services $700, merchandise $900 + $93.60 tax, total $1,693.60.
// 2. Rose Scattering Garden ECF went from $80 to $85.
// 3. A printed COMBINED quote shows each half with its own sales tax and its own total (they
//    are written on separate contracts), not one blended tax line. Page 1 stays one page.
//
// Fake Firebase only — production is never contacted, and nothing here writes.
import { chromium } from 'playwright';
import fs from 'fs';
import { BASE } from './_base.mjs';
const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };
const m2 = n => Math.round(n * 100) / 100;

const browser = await chromium.launch();
const ctx = await browser.newContext();
await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 200)); });
await page.addInitScript(FAKE);
await page.addInitScript(`window.__fake.addAccount('t@bwquote.local','pw');`);
await page.goto(BASE + 'index.html', { waitUntil: 'load', timeout: 120000 });
await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('t@bwquote.local', 'pw'));
await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
await page.evaluate(() => show('cem-quote', null));

// ── 1. 3rd Party fees on the quote ───────────────────────────────────────────────
console.log('\n1. 3rd Party: inspection fee is not taxed');
const pick3p = (re) => page.evaluate((src) => {
  const s = document.getElementById('q3pSize');
  const o = [...s.options].find(o => new RegExp(src).test(o.value));
  s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true }));
  const l = _cemLines.filter(l => /^3rd Party/.test(l.label));
  return { lines: l.map(x => ({ label: x.label, amount: x.amount, taxable: !!x.taxable })),
           tax: _fqTaxOf(l), total: _cemTotal };
}, re.source);
{
  const r = await pick3p(/\|32″×20″×4″$/);
  const ins = r.lines.find(l => /Installation/.test(l.label));
  const insp = r.lines.find(l => /Inspection/.test(l.label));
  const adm = r.lines.find(l => /Admin/.test(l.label));
  ok('installation $900 stays taxable', ins && ins.amount === 900 && ins.taxable, ins);
  ok('inspection $450 is NOT taxable', insp && insp.amount === 450 && !insp.taxable, insp);
  ok('admin $250 is not taxable', adm && adm.amount === 250 && !adm.taxable, adm);
  ok('tax on the 3rd-party lines is $93.60 (900 x 10.4%), as Accounting shows', m2(r.tax) === 93.6, r.tax);
  ok('quote total is $1,693.60, matching Accounting\'s CIRGAS', m2(r.total) === 1693.6, r.total);
}

// ── 2. The same lines on a real generated CIRGAS ──────────────────────────────────
console.log('\n2. CIRGAS: services Other 1/2, installation in merchandise');
const cirgas = (re) => page.evaluate(async (src) => {
  const s = document.getElementById('q3pSize');
  const o = [...s.options].find(o => new RegExp(src).test(o.value));
  s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true }));
  const lines = _cemLines.map(l => Object.assign({}, l));
  const bytes = await _fillCirgasXlsx({ lines: lines, contractType: 'original' });
  const zip = await JSZip.loadAsync(bytes);
  const map = await _xlsxSheetPathMap(zip);
  const path = map['Cemetery Contract'];
  const xml = await zip.file(path).async('string');
  const cell = (c) => {
    const m = xml.match(new RegExp('<c r="' + c + '"[^>]*?(?:/>|>([\\s\\S]*?)</c>)'));
    if (!m || !m[1]) return null;
    const t = m[1].match(/<t[^>]*>([\s\S]*?)<\/t>/); if (t) return t[1].replace(/&amp;/g, '&');
    const v = m[1].match(/<v>([\s\S]*?)<\/v>/); return v ? v[1] : null;
  };
  const out = {};
  ['C27','I27','C28','I28','I39','I40','I41','I45','I46'].forEach(c => out[c] = cell(c));
  return out;
}, re.source);
{
  const r = await cirgas(/\|32″×20″×4″$/);
  ok('Other 1 reads "3rd Party Administrative Fee"', r.C27 === '3rd Party Administrative Fee', r);
  ok('Other 1 amount is 250', r.I27 === '250', r.I27);
  ok('Other 2 reads "3rd Party Inspection & Review Fee"', r.C28 === '3rd Party Inspection & Review Fee', r.C28);
  ok('Other 2 amount is 450', r.I28 === '450', r.I28);
  ok('Installation row (merchandise) is 900', r.I41 === '900', r.I41);
  ok('nothing lands on Memorial / Memorial Base / Other merch', ['I39','I40','I45','I46'].every(c => r[c] === 'N/A'), r);
}
{
  // An upright's size text carries "Base 26″×12″×6″" — it used to route all three fees onto
  // the Memorial Base row.
  const r = await cirgas(/Upright: 18″×6″×24″/);
  ok('upright: Other 1 admin 250 / Other 2 inspection 800', r.I27 === '250' && r.I28 === '800' && /Inspection/.test(r.C28), r);
  ok('upright: installation 1600 on the Installation row', r.I41 === '1600', r.I41);
  ok('upright: Memorial Base row stays N/A', r.I40 === 'N/A', r.I40);
}
await page.evaluate(() => { const s = document.getElementById('q3pSize'); s.value = ''; s.dispatchEvent(new Event('change', { bubbles: true })); });

// ── 3. Rose Scattering Garden ECF ─────────────────────────────────────────────────
console.log('\n3. Rose Scattering Garden ECF is $85');
{
  const r = await page.evaluate(() => {
    const g = document.getElementById('qGarden');
    const o = [...g.options].find(o => /^scatter_rose\|/.test(o.value));
    g.value = o.value; cemUpdate();   // the select's own onchange is debounced
    const ecf = _cemLines.find(l => /ECF|Endowment/i.test(l.label));
    const out = { value: o.value, ecf: ecf ? ecf.amount : null };
    g.value = ''; cemUpdate();
    return out;
  });
  ok('option carries 545 space + 85 ECF', r.value === 'scatter_rose|545|85', r.value);
  ok('the quote prices the ECF line at $85', r.ecf === 85, r);
}

// ── 4. Combined print: separate taxes and totals ──────────────────────────────────
console.log('\n4. Combined quote: each half taxed and totalled on its own');
const CEM = [
  { label: 'Companion Lawn Crypt',  amount: 6500, taxable: false },
  { label: 'Endowment Care Fund',   amount: 650,  taxable: false },
  { label: 'Granite Flush Marker',  amount: 1000, taxable: true  },
];
const FH = [
  { label: 'Basic Services of Funeral Director & Staff', amount: 2425, taxable: false },
  { label: 'Casket: Wilbert Bronze',                     amount: 3200, taxable: true  },
];
const r4 = await page.evaluate(async ([cem, fh]) => {
  _cemLines = cem; _cemTotal = renderSummary('cemSummary', _cemLines, 0, '', '');
  _fhLines  = fh;  _fhTotal  = renderSummary('fhSummary',  _fhLines,  0, '', '');
  const base = { scopeLabel:'Cemetery & Funeral Home', clientName:'Test Family', notes:'', showPayment:true };
  const cb = _fqBuildModel({ ...base, typeLabel:'Combined Family Quote',
    surfaces:[{ kind:'cem', name:'Cemetery', tagline:'WMP', lines:_cemLines, total:_cemTotal },
              { kind:'fh',  name:'Funeral Home', tagline:'S', lines:_fhLines,  total:_fhTotal }] });
  const single = _fqBuildModel({ ...base, typeLabel:'Cemetery Quote',
    surfaces:[{ kind:'cem', name:'Cemetery', tagline:'WMP', lines:_cemLines, total:_cemTotal }] });
  const doc = new DOMParser().parseFromString(_fqRenderHTML(cb), 'text/html');
  // leaf text joined with spaces: label and figure sit in adjacent spans with no gap between them
  const txt = el => [...el.querySelectorAll('*')].filter(e => !e.children.length).map(e => e.textContent).join(' ').replace(/\s+/g, ' ');
  const p1 = txt(doc.querySelector('.sheet'));
  const sdoc = new DOMParser().parseFromString(_fqRenderHTML(single), 'text/html');
  const s1 = txt(sdoc.querySelector('.sheet'));
  // what the PDF draws on page 1
  const proto = PDFLib.PDFPage.prototype, realDraw = proto.drawText, pages = [], perPage = {};
  proto.drawText = function (t) { let i = pages.indexOf(this); if (i === -1) { pages.push(this); i = pages.length - 1; } perPage[i] = (perPage[i] || '') + String(t) + ' | '; return realDraw.apply(this, arguments); };
  let pdfBytes;
  try { pdfBytes = await _fqBuildPDFBytes(cb); } finally { proto.drawText = realDraw; }
  let b = ''; const u = new Uint8Array(pdfBytes); for (let i = 0; i < u.length; i++) b += String.fromCharCode(u[i]);
  return { sf: cb.surfaces.map(s => ({ name: s.name, subtotal: s.subtotal, tax: s.tax, total: s.total })),
           grand: cb.grandTotal, combined: cb.combined, singleCombined: single.combined,
           p1, s1, pdf1: perPage[0] || '', pdfB64: btoa(b) };
}, [CEM, FH]);
fs.mkdirSync('scratch', { recursive: true });
fs.writeFileSync('scratch/combined-split-check.pdf', Buffer.from(r4.pdfB64, 'base64'));
{
  const money = n => '$' + Math.abs(m2(n)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const [c, f] = r4.sf;
  ok('model flags combined; a single-surface quote is not', r4.combined === true && r4.singleCombined === false);
  ok('each half reconciles: subtotal + own tax = own total', r4.sf.every(s => m2(s.subtotal + s.tax) === m2(s.total)), r4.sf);
  ok('cemetery tax is on the cemetery marker only ($104.00)', m2(c.tax) === 104, c);
  ok('funeral-home tax is on the casket only ($332.80)', m2(f.tax) === 332.8, f);
  ok('printed: "Cemetery total" with its own figure', r4.p1.indexOf('Cemetery total ' + money(c.total)) > -1, money(c.total));
  ok('printed: "Funeral Home total" with its own figure', r4.p1.indexOf('Funeral Home total ' + money(f.total)) > -1, money(f.total));
  ok('printed: each half shows its own sales-tax line', (r4.p1.match(/Sales tax \(10\.4% · merchandise only\)/g) || []).length === 2, r4.p1.slice(0, 400));
  ok('printed: each tax figure appears', r4.p1.indexOf(money(c.tax)) > -1 && r4.p1.indexOf(money(f.tax)) > -1);
  ok('printed: no blended tax figure', r4.p1.indexOf(money(c.tax + f.tax)) === -1, money(c.tax + f.tax));
  ok('printed: band names both halves', r4.p1.indexOf('Cemetery ' + money(c.total) + ' + Funeral Home ' + money(f.total)) > -1);
  ok('printed: separate-contracts note', /separate contracts, each with its own sales tax/.test(r4.p1));
  ok('printed: grand total still shown', r4.p1.indexOf('Total ' + money(r4.grand)) > -1, money(r4.grand));
  ok('PDF page 1 draws both totals and both taxes', [c.total, f.total, c.tax, f.tax].every(v => r4.pdf1.indexOf(money(v)) > -1), r4.pdf1.slice(0, 300));
  ok('PDF page 1 draws no blended tax figure', r4.pdf1.indexOf(money(c.tax + f.tax)) === -1);
  ok('single-surface quote keeps its old one tax line + tax note', /Sales tax \(10\.4% · merchandise only\)/.test(r4.s1) && /Tax applies to merchandise and its installation/.test(r4.s1) && !/Cemetery total/.test(r4.s1));
}

// ── 5. Page 1 stays one page, printed and PDF, on a long combined quote ──────────
console.log('\n5. A long combined quote still fits page 1');
{
  const r = await page.evaluate(async () => {
    const cem = [], fh = [];
    for (let i = 0; i < 9; i++) cem.push({ label: 'Cemetery item ' + (i + 1) + (i % 2 ? ' Marker' : ' Interment'), amount: 300 + i * 10, taxable: i % 2 === 1 });
    for (let i = 0; i < 9; i++) fh.push({ label: 'Funeral item ' + (i + 1) + (i % 2 ? ' Casket' : ' Services'), amount: 400 + i * 10, taxable: i % 2 === 1 });
    const cemT = renderSummary('cemSummary', cem, 0, '', ''), fhT = renderSummary('fhSummary', fh, 0, '', '');
    const m = _fqBuildModel({ scopeLabel:'X', clientName:'Long Family', notes:'', showPayment:false, typeLabel:'Combined Family Quote',
      surfaces:[{ kind:'cem', name:'Cemetery', tagline:'WMP', lines:cem, total:cemT },
                { kind:'fh',  name:'Funeral Home', tagline:'S', lines:fh, total:fhT }] });
    const bytes = await _fqBuildPDFBytes(m);
    const doc = await PDFLib.PDFDocument.load(bytes);
    // printed page: render into a real window and run the same fit pass Print uses
    const w = window.open('', '_blank'); w.document.open(); w.document.write(_fqRenderHTML(m)); w.document.close();
    await new Promise(res => setTimeout(res, 600));
    const css = _fqFitForPrint(w.document);
    const sheet = w.document.querySelector('.sheet');
    const out = { pdfPages: doc.getPageCount(), fitCss: css, h: sheet.offsetHeight };
    w.close();
    return out;
  });
  ok('PDF with no payment page is exactly one page', r.pdfPages === 1, r);
  ok('printed page 1 fit pass ran without error', typeof r.fitCss === 'string', r);
}

ok('no page errors', errs.length === 0, errs.slice(0, 3));
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
