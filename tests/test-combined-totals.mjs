// Cemetery + funeral-home + grand totals on every COMBINED surface (s23 Track B, operator
// issue 9). Before this, a combined family quote's payment page announced one blended
// "Estimated total" and the funeral-home section carried no figure at all, so a family could
// not see which half was which. The combined email had the same gap, and read its totals back
// out of the summary panel's DOM — which returns nothing when the panel has not been painted.
//
// The arithmetic trap this suite exists to hold: pay.cemBase / pay.fhBase are TAX-INCLUSIVE
// surface totals, while surfaces[].subtotal is the PRE-tax net. The three published figures
// must reconcile to the cent, and single-surface quotes must be untouched.
//
// Fake Firebase only — production is never contacted, and nothing here writes.
import { chromium } from 'playwright';
import fs from 'fs';
import { BASE } from './_base.mjs';
const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };
const m2 = n => Math.round(n * 100) / 100;

const CEM = [
  { label: 'Companion Lawn Crypt',   amount: 6500, taxable: false },
  { label: 'Endowment Care Fund',    amount: 650,  taxable: false },
  { label: 'Granite Flush Marker',   amount: 1000, taxable: true  },
];
const FH = [
  { label: 'Basic Services of Funeral Director & Staff', amount: 2425, taxable: false },
  { label: 'Casket: Wilbert Bronze',                     amount: 3200, taxable: true  },
];

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

await page.evaluate(([cem, fh]) => {
  _cemLines = cem; _cemTotal = renderSummary('cemSummary', _cemLines, 0, '', '');
  _fhLines  = fh;  _fhTotal  = renderSummary('fhSummary',  _fhLines,  0, '', '');
  const age = document.getElementById('fhInsAge'); if (age) age.value = '72';
}, [CEM, FH]);

const mk = `(o) => _fqBuildModel(Object.assign({ scopeLabel:'WMP', clientName:'Test Family', notes:'', showPayment:true }, o))`;

// ── 1. The three figures reconcile exactly ────────────────────────────────────────
console.log('\n1. Cemetery + Funeral Home = Estimated total');
{
  const r = await page.evaluate((mkSrc) => {
    const mk = eval(mkSrc);
    const cb = mk({ typeLabel:'Combined Family Quote', maxima:_fqMaximaPlans(72, 0, _fhTotal),
      surfaces:[{ kind:'cem', name:'Cemetery', tagline:'WMP', lines:_cemLines, total:_cemTotal },
                { kind:'fh',  name:'Funeral Home', tagline:'S', lines:_fhLines,  total:_fhTotal }] });
    return { scope: cb.pay.scope, cemBase: cb.pay.cemBase, fhBase: cb.pay.fhBase,
             grand: cb.grandTotal, cemTotal: _cemTotal, fhTotal: _fhTotal,
             subtotals: cb.surfaces.map(s => s.subtotal),
             subtitle: _fqPaySubtitle(cb, ' · ') };
  }, mk);
  ok('scope is combined', r.scope === 'combined', r.scope);
  ok('cemBase is the tax-inclusive cemetery total', m2(r.cemBase) === m2(r.cemTotal), [r.cemBase, r.cemTotal]);
  ok('fhBase is the tax-inclusive funeral-home total', m2(r.fhBase) === m2(r.fhTotal), [r.fhBase, r.fhTotal]);
  ok('THE INVARIANT: cemBase + fhBase === grandTotal', m2(r.cemBase + r.fhBase) === m2(r.grand), [r.cemBase, r.fhBase, r.grand]);
  ok('and they are NOT the pre-tax subtotals', m2(r.subtotals[0]) !== m2(r.cemBase) && m2(r.subtotals[1]) !== m2(r.fhBase), r.subtotals);
  ok('subtitle names all three figures', /Cemetery \$/.test(r.subtitle) && /Funeral Home \$/.test(r.subtitle) && /Estimated total \$/.test(r.subtitle), r.subtitle);
  ok('subtitle figures are the model figures', r.subtitle.indexOf('$' + r.cemBase.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})) > -1, r.subtitle);
}

// ── 2. Single-surface quotes keep exactly one figure ──────────────────────────────
console.log('\n2. Single-surface scopes are untouched');
{
  const r = await page.evaluate((mkSrc) => {
    const mk = eval(mkSrc);
    const cem = mk({ typeLabel:'Cemetery Quote',
      surfaces:[{ kind:'cem', name:'Cemetery', tagline:'WMP', lines:_cemLines, total:_cemTotal }] });
    const fh = mk({ typeLabel:'Funeral Home Quote', maxima:_fqMaximaPlans(72, 0, _fhTotal),
      surfaces:[{ kind:'fh', name:'Funeral Home', tagline:'S', lines:_fhLines, total:_fhTotal }] });
    return { cemScope: cem.pay.scope, fhScope: fh.pay.scope,
             cemSub: _fqPaySubtitle(cem, ' · '), fhSub: _fqPaySubtitle(fh, ' · '),
             cemGrand: cem.grandTotal, fhGrand: fh.grandTotal };
  }, mk);
  ok('cemetery-only scope is cem', r.cemScope === 'cem', r.cemScope);
  ok('cemetery-only subtitle is the single figure it always was', r.cemSub === 'Estimated total $' + r.cemGrand.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}), r.cemSub);
  ok('no Cemetery/Funeral Home split leaks into a single-surface quote', !/Funeral Home \$/.test(r.cemSub), r.cemSub);
  ok('fh-only scope is fh', r.fhScope === 'fh', r.fhScope);
  ok('fh-only subtitle is the single figure it always was', r.fhSub === 'Estimated total $' + r.fhGrand.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}), r.fhSub);
}

// ── 3. The rendered HTML page 2 ───────────────────────────────────────────────────
console.log('\n3. HTML payment page');
{
  const r = await page.evaluate((mkSrc) => {
    const mk = eval(mkSrc);
    const money = n => '$' + n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
    const cbMx = mk({ typeLabel:'Combined Family Quote', maxima:_fqMaximaPlans(72, 0, _fhTotal),
      surfaces:[{ kind:'cem', name:'Cemetery', tagline:'WMP', lines:_cemLines, total:_cemTotal },
                { kind:'fh',  name:'Funeral Home', tagline:'S', lines:_fhLines,  total:_fhTotal }] });
    // ...and the same quote with no age entered, which takes the other funeral-home branch.
    const cbNoMx = mk({ typeLabel:'Combined Family Quote',
      surfaces:[{ kind:'cem', name:'Cemetery', tagline:'WMP', lines:_cemLines, total:_cemTotal },
                { kind:'fh',  name:'Funeral Home', tagline:'S', lines:_fhLines,  total:_fhTotal }] });
    const cemOnly = mk({ typeLabel:'Cemetery Quote',
      surfaces:[{ kind:'cem', name:'Cemetery', tagline:'WMP', lines:_cemLines, total:_cemTotal }] });
    const strip = h => h.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
    return {
      mx: strip(_fqRenderHTML(cbMx)), noMx: strip(_fqRenderHTML(cbNoMx)), cemOnly: strip(_fqRenderHTML(cemOnly)),
      cemMoney: money(cbMx.pay.cemBase), fhMoney: money(cbMx.pay.fhBase), grandMoney: money(cbMx.grandTotal),
    };
  }, mk);
  ok('page-2 header carries the cemetery figure', r.mx.indexOf('Cemetery ' + r.cemMoney) > -1, r.cemMoney);
  ok('page-2 header carries the funeral-home figure', r.mx.indexOf('Funeral Home ' + r.fhMoney) > -1, r.fhMoney);
  ok('page-2 header carries the estimated total', r.mx.indexOf('Estimated total ' + r.grandMoney) > -1, r.grandMoney);
  ok('cemetery section label still shows its amount', r.mx.indexOf('Financing options · ' + r.cemMoney) > -1, r.cemMoney);
  ok('funeral-home section label NOW shows its amount', r.mx.indexOf('Payment plans · ' + r.fhMoney) > -1, r.fhMoney);
  ok('funeral-home label keeps the age it always showed', /Payment plans · \$[\d,.]+ · age 72/.test(r.mx), r.mx.slice(0, 200));
  ok('the no-age branch also shows the funeral-home amount', r.noMx.indexOf('Funeral home ' + r.fhMoney) > -1, r.fhMoney);
  ok('a cemetery-only quote shows no funeral-home figure', !/Funeral Home \$/.test(r.cemOnly), 'leaked');
  ok('cemetery-only page 2 still shows its own total', r.cemOnly.indexOf('Estimated total ') > -1);
}

// ── 4. The generated PDF ──────────────────────────────────────────────────────────
console.log('\n4. Payment page in the PDF');
{
  const r = await page.evaluate(async (mkSrc) => {
    const mk = eval(mkSrc);
    const money = n => '$' + n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
    const cb = mk({ typeLabel:'Combined Family Quote', maxima:_fqMaximaPlans(72, 0, _fhTotal),
      surfaces:[{ kind:'cem', name:'Cemetery', tagline:'WMP', lines:_cemLines, total:_cemTotal },
                { kind:'fh',  name:'Funeral Home', tagline:'S', lines:_fhLines,  total:_fhTotal }] });
    // Capture what actually reaches the page rather than trusting the model: wrap drawText.
    const drawn = [];
    const PDFLib = window.PDFLib;
    const origSave = PDFLib.PDFDocument.create;
    PDFLib.PDFDocument.create = async function () {
      const doc = await origSave.apply(this, arguments);
      const addPage = doc.addPage.bind(doc);
      doc.addPage = function () {
        const pg = addPage.apply(this, arguments);
        const dt = pg.drawText.bind(pg);
        pg.drawText = function (t) { drawn.push(String(t)); return dt.apply(this, arguments); };
        return pg;
      };
      return doc;
    };
    try { await _fqBuildPDFBytes(cb); } finally { PDFLib.PDFDocument.create = origSave; }
    return { drawn, cemMoney: money(cb.pay.cemBase), fhMoney: money(cb.pay.fhBase), grandMoney: money(cb.grandTotal) };
  }, mk);
  const all = r.drawn.join(' | ');
  ok('the PDF actually drew text', r.drawn.length > 50, r.drawn.length);
  ok('masthead line carries all three figures', r.drawn.some(t => t.indexOf('Cemetery ' + r.cemMoney) > -1 && t.indexOf('Funeral Home ' + r.fhMoney) > -1 && t.indexOf('Estimated total ' + r.grandMoney) > -1), r.drawn.filter(t => /Estimated total/.test(t)));
  ok('funeral-home section label drew its amount', r.drawn.some(t => /^Payment plans/.test(t) && t.indexOf(r.fhMoney) > -1), r.drawn.filter(t => /^Payment plans/.test(t)));
  ok('cemetery section label kept its amount', r.drawn.some(t => /^Financing options/.test(t) && t.indexOf(r.cemMoney) > -1), r.drawn.filter(t => /^Financing options/.test(t)));
  ok('no page error while building the PDF', all.length > 0);
}

// ── 5. The combined email ─────────────────────────────────────────────────────────
console.log('\n5. Combined email totals');
{
  const r = await page.evaluate(() => {
    _combCemLines = _cemLines.slice(); _combCemTotal = _cemTotal;
    _combFhLines  = _fhLines.slice();  _combFhTotal  = _fhTotal;
    show('combined-quote', null);
    combUpdate();
    const withPanel = buildCombExportText();
    const grand = _combGrandTotal, tax = _combTaxTotal;
    // THE OLD BUG: the totals were scraped out of the panel's DOM. Blow the panel away and the
    // email must still carry every figure.
    document.getElementById('combSummary').innerHTML = '';
    document.getElementById('combSummarySplit').innerHTML = '';
    document.getElementById('combSummaryTotal').textContent = '';
    const withoutPanel = buildCombExportText();
    return { withPanel, withoutPanel, grand, tax, cem: _combCemTotal, fh: _combFhTotal };
  });
  const money = n => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  ok('email has a CEMETERY TOTAL line', r.withPanel.indexOf('CEMETERY TOTAL') > -1, r.withPanel.slice(-400));
  ok('email has a FUNERAL HOME TOTAL line', r.withPanel.indexOf('FUNERAL HOME TOTAL') > -1, r.withPanel.slice(-400));
  ok('email still has COMBINED TOTAL', r.withPanel.indexOf('COMBINED TOTAL') > -1, r.withPanel.slice(-400));
  ok('cemetery figure is the cemetery total', r.withPanel.indexOf('CEMETERY TOTAL' + ' '.repeat(Math.max(1, 42 - 'CEMETERY TOTAL'.length)) + money(r.cem)) > -1, [money(r.cem), r.withPanel.slice(-400)]);
  ok('funeral-home figure is the funeral-home total', r.withPanel.indexOf(money(r.fh)) > -1, money(r.fh));
  ok('combined figure is the panel grand total', r.withPanel.indexOf(money(r.grand)) > -1, money(r.grand));
  ok('THE ARITHMETIC CLOSES: cemetery + funeral home = combined', m2(r.cem + r.fh) === m2(r.grand), [r.cem, r.fh, r.grand]);
  ok('side totals are listed before the combined total',
     r.withPanel.indexOf('CEMETERY TOTAL') < r.withPanel.indexOf('COMBINED TOTAL')
     && r.withPanel.indexOf('FUNERAL HOME TOTAL') < r.withPanel.indexOf('COMBINED TOTAL'), 'order');
  ok('NO DOM SCRAPING: identical text with the panel wiped', r.withoutPanel === r.withPanel, [r.withoutPanel.slice(-300), r.withPanel.slice(-300)]);
  ok('the tax line survives without the panel', r.withoutPanel.indexOf('Sales tax') > -1, r.withoutPanel.slice(-400));
  ok('no page errors', errs.length === 0, errs);
}

// ── 6. The payment-options letter ─────────────────────────────────────────────────
console.log('\n6. payment-options-letter.html');
{
  const lp = await ctx.newPage();
  const lerrs = [];
  lp.on('pageerror', e => lerrs.push(e.message));
  await lp.goto(BASE + 'payment-options-letter.html', { waitUntil: 'load', timeout: 60000 });

  const baseline = await lp.evaluate(() => {
    document.getElementById('recipientName').value = 'Delphine';
    document.getElementById('paymentAmount').value = '$3,500.00';
    document.getElementById('paymentFor').value = 'burial services';
    document.getElementById('contractNum').value = '12345';
    render();
    return { atneed: document.getElementById('letter').innerText,
             hasBlock: !!document.getElementById('splitBlock') };
  });
  ok('both split fields exist', await lp.evaluate(() => !!document.getElementById('cemAmount') && !!document.getElementById('fhAmount')));
  ok('blank split adds NO block', baseline.hasBlock === false, baseline.hasBlock);
  ok('blank split keeps the single amount in the prose', /\$3,500\.00/.test(baseline.atneed), baseline.atneed.slice(0, 300));

  const filled = await lp.evaluate(() => {
    document.getElementById('cemAmount').value = '2100';
    document.getElementById('fhAmount').value = '$1,400.00';
    render();
    const t = document.getElementById('letter').innerText;
    setMode('preneed');
    const p = document.getElementById('letter').innerText;
    setMode('atneed');
    return { atneed: t, preneed: p, hasBlock: !!document.getElementById('splitBlock') };
  });
  ok('filling the split adds the block', filled.hasBlock === true);
  ok('at-need letter shows the cemetery figure', /Cemetery:\s*\$2,100\.00/.test(filled.atneed), filled.atneed.slice(0, 600));
  ok('at-need letter shows the funeral-home figure', /Funeral home:\s*\$1,400\.00/.test(filled.atneed), filled.atneed.slice(0, 600));
  ok('at-need letter shows their sum as the total', /Total:\s*\$3,500\.00/.test(filled.atneed), filled.atneed.slice(0, 600));
  ok('pre-need letter shows the same three figures',
     /Cemetery:\s*\$2,100\.00/.test(filled.preneed) && /Funeral home:\s*\$1,400\.00/.test(filled.preneed) && /Total:\s*\$3,500\.00/.test(filled.preneed),
     filled.preneed.slice(0, 600));

  const overrides = await lp.evaluate(() => {
    document.getElementById('paymentAmount').value = '$99.00';   // stale single amount
    document.getElementById('cemAmount').value = '2100';
    document.getElementById('fhAmount').value = '1400';
    render();
    const t = document.getElementById('letter').innerText;
    // one side only
    document.getElementById('fhAmount').value = '';
    render();
    return { both: t, oneSide: document.getElementById('letter').innerText };
  });
  ok('the split sum wins over a stale single amount', /\$3,500\.00/.test(overrides.both) && !/\$99\.00/.test(overrides.both), overrides.both.slice(0, 600));
  ok('one side alone still renders and totals', /Cemetery:\s*\$2,100\.00/.test(overrides.oneSide) && /Total:\s*\$2,100\.00/.test(overrides.oneSide) && !/Funeral home:/.test(overrides.oneSide), overrides.oneSide.slice(0, 600));

  const cleared = await lp.evaluate(() => {
    document.getElementById('cemAmount').value = '';
    document.getElementById('fhAmount').value = '';
    document.getElementById('paymentAmount').value = '$3,500.00';
    render();
    return { text: document.getElementById('letter').innerText, hasBlock: !!document.getElementById('splitBlock') };
  });
  ok('clearing the split restores the original letter exactly', cleared.text === baseline.atneed, 'differs');
  ok('and removes the block again', cleared.hasBlock === false);
  ok('no page errors in the letter', lerrs.length === 0, lerrs);
  await lp.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
