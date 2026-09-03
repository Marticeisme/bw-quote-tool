// Option Comparison prints — cemetery printCompare() and funeral-home printFhCompare().
//
// Both used to be their own documents: the cemetery one printed on the retired steel/orange
// _printQuoteCSS() sheet (full breakdown for Option A, an ungrouped list for B, and NO tax line on
// A at all), the funeral-home one was a hand-rolled navy page with no logo and a different header.
// s28 rebuilt both on the _fq* family-quote design language, through one shared renderer, so a
// comparison is the same document family as the quote it came from.
//
// What is pinned here:
//   • both prints open a real HTML page (not a blob: PDF), raise the print dialog, and fit to ONE
//     landscape sheet;
//   • the _fq masthead (logo + type label + scope line), the "Prepared with care for" block and
//     the shared footer are present on both;
//   • BOTH option columns carry the complete breakdown — grouped kickers, discount credit, a
//     subtotal, a sales-tax line and a total — and each column's subtotal + tax === its total;
//   • the difference is stated as a figure AND as a sentence, and it equals B − A;
//   • At-Need drops the payment estimate; pre-need cemetery shows 10% / 60 mo / 0% ACH;
//   • funeral-home tax math survives a taxable discount (the discount reduces the taxable base
//     before tax, it is not applied after).
//
// Fake Firebase only — production is never contacted, and nothing here writes.
import { chromium } from 'playwright';
import fs from 'fs';
import { BASE } from './_base.mjs';
const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };
const m2 = n => Math.round(n * 100) / 100;
const money = s => { const m = String(s).match(/\$([\d,]+\.\d\d)/); return m ? parseFloat(m[1].replace(/,/g, '')) : null; };

// Synthetic fixture — invented labels and round prices, nothing from a real record.
const CEM = [
  { label: 'Garden 17 – Sundial',            amount: 4995, taxable: false, isSpace: true },
  { label: 'Endowment Care Fund (ECF)',      amount: 750,  taxable: false, isSpace: true },
  { label: 'Lawn Interment – Single Depth',  amount: 1895, taxable: false },
  { label: 'Recording Fee – Interment',      amount: 235,  taxable: false },
  { label: 'Monticello Burial Vault',        amount: 2305, taxable: true  },
  { label: 'Granite Flush Marker',           amount: 1200, taxable: true  },
  { label: 'Pre-Need Discount', amount: -500, isDiscount: true, taxableDiscount: false },
];
const CEM_NET = 10880, CEM_TAX = 364.52, CEM_TOTAL = 11244.52;   // (2305+1200) × 10.4%
const FH = [
  { label: 'Basic Services of Funeral Director & Staff', amount: 2425, taxable: false, planItem: true },
  { label: 'Transfer of Deceased to Funeral Home',       amount: 715,  taxable: false },
  { label: 'Use of Hearse',                              amount: 705,  taxable: false },
  { label: 'Casket: Sheltered Poplar',                   amount: 3200, taxable: true  },
  { label: 'Urn: Classic Bronze',                        amount: 480,  taxable: true  },
];
const FH_NET = 7525, FH_TAX = 382.72, FH_TOTAL = 7907.72;        // (3200+480) × 10.4%

const browser = await chromium.launch();
const ctx = await browser.newContext();
await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 200)); });
await page.addInitScript(FAKE);
await page.addInitScript(`window.__fake.addAccount('t@bwquote.local','pw');`);
await page.goto(BASE, { waitUntil: 'load', timeout: 120000 });
await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('t@bwquote.local', 'pw'));
await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });

// Load Option A on both surfaces, and stub window.open once so every print in this file lands in a
// popup whose print() we can observe instead of a real dialog.
await page.evaluate(([cem, fh]) => {
  _cemLines = cem; _cemTotal = renderSummary('cemSummary', _cemLines, 0, '', '');
  _fhLines  = fh;  _fhTotal  = renderSummary('fhSummary',  _fhLines,  0, '', '');
  document.getElementById('cemClientName').value = 'Rivera Family';
  document.getElementById('fhClientName').value  = 'Rivera Family';
  const ro = window.open;
  window.open = function () { const w = ro.apply(window, arguments); try { w.print = function () { w.__printed = true; }; } catch (e) {} return w; };
}, [CEM, FH]);

// Grab the popup a print function opens and read everything we assert on out of it.
async function capture(fn) {
  const pp = ctx.waitForEvent('page', { timeout: 20000 });
  await page.evaluate(fn);
  const pop = await pp;
  await pop.waitForLoadState('domcontentloaded');
  await pop.waitForFunction(() => !!window.__printed, { timeout: 15000 }).catch(() => {});
  const out = await pop.evaluate(() => {
    const cols = [...document.querySelectorAll('.cmpcol')].map(c => c.innerText.replace(/\s+/g, ' '));
    const st = document.getElementById('fqFitStyle');
    return {
      url: location.href, ct: document.contentType,
      sheets: document.querySelectorAll('.sheet').length,
      cols: cols, colCount: cols.length,
      logos: document.querySelectorAll('img[alt="Bonney Watson"]').length,
      title: document.title,
      text: document.body.innerText.replace(/\s+/g, ' '),
      html: document.documentElement.innerHTML,
      printed: !!window.__printed,
      fit: !!st, fitCss: st ? st.textContent : '',
      sheetBox: (() => { const r = document.querySelector('.sheet').getBoundingClientRect(); return { w: r.width, h: r.height }; })(),
      embed: !!document.querySelector('embed,object[type="application/pdf"]'),
    };
  });
  await pop.close();
  return out;
}
// The fit pass adds a print-only zoom; the sheet at that zoom must sit inside the 725x952 box
// _fqFitForPrint targets (Letter at the 0.45in @page margin, less headroom).
function fitsOnePage(s) {
  const m = String(s.fitCss).match(/zoom:([\d.]+)/);
  const k = m ? parseFloat(m[1]) : 1;
  return s.sheetBox.w * k <= 726 && s.sheetBox.h * k <= 953;
}
// Every column must show its own complete money block and reconcile inside itself.
function assertColumnMath(tag, col) {
  // innerText renders the label's text-transform, so the subtotal reads "SUBTOTAL"; the total
  // row is mixed case, which is what keeps these two regexes from matching each other.
  const sub = money((col.match(/SUBTOTAL \$[\d,]+\.\d\d/) || [''])[0]);
  const tax = money((col.match(/merchandise only\) \$[\d,]+\.\d\d/) || [''])[0]);
  const tot = money((col.match(/Total \$[\d,]+\.\d\d/) || [''])[0]);
  ok(tag + ' shows a subtotal', sub !== null, col.slice(0, 200));
  ok(tag + ' shows a sales-tax line', tax !== null, col.slice(-220));
  ok(tag + ' shows a total', tot !== null, col.slice(-220));
  ok(tag + ' subtotal + tax === total', sub !== null && tax !== null && m2(sub + tax) === m2(tot), [sub, tax, tot]);
  return { sub, tax, tot };
}

// ── 1. The cemetery model ──────────────────────────────────────────────────────
console.log('\n1. Cemetery compare model');
{
  const r = await page.evaluate(() => {
    // Option B: a different garden, the standard burial arrangement, 10% off merchandise.
    const g = document.getElementById('cmpB_garden');
    g.value = [...g.options].find(o => (o.value || '').split('|').length >= 3 && parseFloat(o.value.split('|')[1]) > 0).value;
    document.getElementById('cmpB_gardenQty').value = '1';
    document.getElementById('cmpB_mirror').checked = false;
    document.getElementById('cmpB_stdBurial').checked = true;
    document.getElementById('cmpB_loc').value = 'Lot 4, Section C';
    document.getElementById('cmpB_discType').value = 'pct10_merch';
    const b = calcBTotal();
    const m = _fqCompareModel({
      typeLabel: 'Cemetery Option Comparison', scopeLabel: 'Washington Memorial Park',
      clientName: 'Rivera Family', kind: 'cem', showPayment: true,
      options: [
        { letter: 'A', label: 'Garden 17 – Sundial', lines: _cemLines, total: _cemTotal },
        { letter: 'B', label: b.label, lines: b.lines, total: b.total },
      ],
    });
    return {
      bTotal: b.total, bTax: b.tax,
      opts: m.options.map(o => ({ letter: o.letter, sub: o.subtotal, tax: o.tax, total: o.total,
                                  kickers: o.groups.map(g2 => g2.kicker), rows: o.groups.reduce((a, g2) => a + g2.rows.length, 0),
                                  disc: o.discount ? o.discount.amount : 0, pay: o.pay })),
      diff: m.diff, scope: m.scopeLine, venue: m.venueLine,
    };
  });
  const [A, B] = r.opts;
  ok('Option A subtotal is the pre-tax net', m2(A.sub) === CEM_NET, A.sub);
  ok('Option A tax is the embedded merchandise tax', m2(A.tax) === CEM_TAX, A.tax);
  ok('Option A subtotal + tax === its total', m2(A.sub + A.tax) === m2(A.total) && m2(A.total) === CEM_TOTAL, [A.sub, A.tax, A.total]);
  ok('Option A carries its discount credit', m2(A.disc) === 500, A.disc);
  ok('Option A is grouped, not one flat list', A.kickers.length >= 3 && A.kickers.indexOf('Cemetery Property') === 0, A.kickers);
  ok('Option B is grouped too', B.kickers.length >= 2, B.kickers);
  ok('Option B total is exactly what calcBTotal computed', m2(B.total) === m2(r.bTotal), [B.total, r.bTotal]);
  ok('Option B tax is exactly what calcBTotal computed', m2(B.tax) === m2(r.bTax), [B.tax, r.bTax]);
  ok('Option B subtotal + tax === its total', m2(B.sub + B.tax) === m2(B.total), [B.sub, B.tax, B.total]);
  ok('Option B carries its discount credit', B.disc > 0, B.disc);
  ok('the difference is B − A', m2(r.diff) === m2(B.total - A.total), [r.diff, B.total, A.total]);
  ok('pre-need options carry a payment estimate', !!A.pay && !!B.pay, [A.pay, B.pay]);
  ok('the payment estimate is 10% down over 60 months', !!A.pay && A.pay.months === 60 && A.pay.down === Math.ceil(A.total * 0.10), A.pay);
  ok('the monthly is the balance over 60 at 0%', !!A.pay && m2(A.pay.monthly) === m2((A.total - A.pay.down) / 60), A.pay);
  ok('the scope line carries the park and a validity date', /Washington Memorial Park · .* · Valid through /.test(r.scope), r.scope);
  ok('the venue line names the advisor', /Prepared by .+, Family Service Advisor/.test(r.venue), r.venue);
}

// ── 2. The cemetery print ──────────────────────────────────────────────────────
console.log('\n2. Cemetery compare print');
let cemPrint;
{
  cemPrint = await capture(() => { printCompare(); });
  const s = cemPrint;
  ok('print window is not a blob: URL', !/^blob:/.test(s.url), s.url.slice(0, 60));
  ok('print window is text/html', s.ct === 'text/html', s.ct);
  ok('print window has no PDF embed', s.embed === false);
  ok('the browser print dialog was raised', s.printed === true);
  ok('it is ONE sheet, not two', s.sheets === 1, s.sheets);
  ok('a fit-to-page rule was installed', s.fit === true);
  ok('the page is set portrait Letter', /@page\{size:letter;/.test(s.html) && !/landscape/.test(s.html),
     (s.html.match(/@page\{[^}]*\}/) || ['(missing)'])[0]);
  ok('the fitted sheet lands inside one Letter page', fitsOnePage(s), [s.sheetBox, s.fitCss]);
  ok('the Bonney Watson logo is in the masthead', s.logos === 1, s.logos);
  ok('the document is titled as a comparison', /Cemetery Option Comparison/.test(s.title), s.title);
  ok('the _fq masthead type label is present', /Cemetery Option Comparison/.test(s.text));
  ok('the family is named the _fq way', /PREPARED WITH CARE FOR Rivera Family/.test(s.text), s.text.slice(0, 300));
  ok('the venue/advisor line is present', /Prepared by .+, Family Service Advisor/.test(s.text));
  ok('there are exactly two option columns', s.colCount === 2, s.colCount);
  ok('Option A is marked as the current quote', /OPTION A · CURRENT QUOTE/i.test(s.cols[0]), s.cols[0].slice(0, 120));
  ok('Option B is labelled', /OPTION B/i.test(s.cols[1]), s.cols[1].slice(0, 120));
  ok("Option B's location rides along", /Lot 4, Section C/.test(s.cols[1]), s.cols[1].slice(0, 160));
  ok('Option A shows its grouped kickers', /CEMETERY PROPERTY/i.test(s.cols[0]) && /CEMETERY SERVICES/i.test(s.cols[0]), s.cols[0].slice(0, 300));
  ok('Option B shows grouped kickers too', /CEMETERY PROPERTY/i.test(s.cols[1]), s.cols[1].slice(0, 300));
  ok('Option A shows its discount as a credit', /Pre-Need Discountsavings applied −\$500\.00/.test(s.cols[0]), (s.cols[0].match(/.{0,24}savings applied[^A-Z]{0,20}/) || ['(missing)'])[0]);
  ok('Option B shows its discount as a credit', /savings applied −\$/.test(s.cols[1]), (s.cols[1].match(/savings applied[^A-Z]{0,20}/) || ['(missing)'])[0]);
  const a = assertColumnMath('Option A', s.cols[0]);
  const b = assertColumnMath('Option B', s.cols[1]);
  ok('Option A prints the fixture total', a.tot === CEM_TOTAL, a);
  ok('the tax line appears in BOTH columns', (s.text.match(/merchandise only/g) || []).length === 2,
     (s.text.match(/merchandise only/g) || []).length);
  ok('the difference is stated as a sentence', /Option B is \$[\d,]+\.\d\d (more|less) than Option A\./.test(s.text),
     (s.text.match(/Option B is [^.]*\./) || ['(missing)'])[0]);
  ok('the difference figure equals B − A', money((s.text.match(/DIFFERENCE [+−]\$[\d,]+\.\d\d/) || [''])[0]) === Math.abs(m2(b.tot - a.tot)),
     [(s.text.match(/DIFFERENCE [+−]\$[\d,]+\.\d\d/) || ['(missing)'])[0], b.tot, a.tot]);
  ok('the difference figure carries the right sign',
     s.text.indexOf('DIFFERENCE ' + (b.tot > a.tot ? '+' : '\u2212') + '$') !== -1,
     (s.text.match(/DIFFERENCE .\$[\d,]+\.\d\d/) || ['(missing)'])[0]);
  ok('both totals are repeated in the callout band', s.text.indexOf('OPTION A') !== -1 && s.text.indexOf('OPTION B') !== -1);
  ok('a payment estimate is shown on a pre-need compare', /\/mo · \$[\d,]+\.\d\d down · 60 mo at 0% ACH/.test(s.text),
     (s.text.match(/\/mo[^A-Z]{0,60}/) || ['(missing)'])[0]);
  ok('the shared footer is present', /16445 International Blvd, SeaTac, WA 98188/.test(s.text));
  ok('the estimate note is present', /not a contract/.test(s.text));
  ok('no steel/orange legacy compare markup survives', !/col-hdr|diff-row|col-breakdown/.test(s.html));
}

// ── 3. At-Need drops the payment estimate ──────────────────────────────────────
console.log('\n3. Cemetery At-Need compare');
{
  const s = await capture(() => {
    document.getElementById('cemTypeAN').checked = true;
    printCompare();
  });
  ok('At-Need is named in the masthead', /Cemetery At-Need Comparison/.test(s.text), s.title);
  ok('At-Need shows NO monthly estimate', !/\/mo ·/.test(s.text), (s.text.match(/\/mo[^A-Z]{0,60}/) || ['(none)'])[0]);
  ok('At-Need shows no ACH financing footnote', !/0% with ACH/.test(s.text));
  ok('At-Need still shows both totals and the difference', /Option B is \$[\d,]+\.\d\d (more|less) than Option A\./.test(s.text));
  ok('At-Need still shows the tax line in both columns', (s.text.match(/merchandise only/g) || []).length === 2);
  await page.evaluate(() => { document.getElementById('cemTypePN').checked = true; document.getElementById('cemTypeAN').checked = false; });
}

// ── 4. The funeral-home compare ────────────────────────────────────────────────
console.log('\n4. Funeral-home compare print');
{
  const b = await page.evaluate(() => {
    const p = document.getElementById('fhCmpB_plan');
    p.value = [...p.options].find(o => (o.value || '').split('|').length >= 3).value;
    document.getElementById('fhCmpB_mirror').checked = false;
    document.getElementById('fhCmpB_basicSvc').checked = true;
    document.getElementById('fhCmpB_casket').value = '1800';
    document.getElementById('fhCmpB_discType').value = 'pct10_merch';
    const r = calcFhBTotal();
    return { total: r.total, tax: r.tax, label: r.label,
             taxable: r.lines.filter(l => l.taxable && !l.isDiscount).reduce((a, l) => a + l.amount, 0),
             taxDisc: r.lines.filter(l => l.isDiscount && l.taxableDiscount).reduce((a, l) => a + Math.abs(l.amount), 0) };
  });
  ok('FH Option B taxable discount reduces the tax BASE', m2(b.tax) === m2(Math.round((b.taxable - b.taxDisc) * 0.104 * 100) / 100), [b.tax, b.taxable, b.taxDisc]);

  const s = await capture(() => { printFhCompare(); });
  ok('FH print is text/html, not a blob', s.ct === 'text/html' && !/^blob:/.test(s.url), s.url.slice(0, 60));
  ok('FH print raised the print dialog', s.printed === true);
  ok('FH print is ONE sheet that fits one page', s.sheets === 1 && fitsOnePage(s), [s.sheets, s.sheetBox, s.fitCss]);
  ok('FH print carries the Bonney Watson logo — the old one had none', s.logos === 1, s.logos);
  ok('FH print uses the same masthead label shape', /Funeral Home Option Comparison/.test(s.text), s.title);
  ok('FH print names the family the _fq way', /PREPARED WITH CARE FOR Rivera Family/.test(s.text));
  ok('FH print has two option columns', s.colCount === 2, s.colCount);
  ok('FH Option A is grouped by service category', /PROFESSIONAL SERVICES/i.test(s.cols[0]) && /TRANSPORTATION/i.test(s.cols[0]), s.cols[0].slice(0, 300));
  ok('FH Option A groups its merchandise', /CASKETS/i.test(s.cols[0]) && /URNS/i.test(s.cols[0]), s.cols[0].slice(0, 400));
  ok('FH Option B is grouped too', /PROFESSIONAL SERVICES/i.test(s.cols[1]), s.cols[1].slice(0, 300));
  ok('FH Option B shows its discount credit', /savings applied −\$/.test(s.cols[1]), (s.cols[1].match(/savings applied[^A-Z]{0,20}/) || ['(missing)'])[0]);
  const fa = assertColumnMath('FH Option A', s.cols[0]);
  const fb = assertColumnMath('FH Option B', s.cols[1]);
  ok('FH Option A prints the fixture subtotal', fa.sub === FH_NET, fa);
  ok('FH Option A prints the fixture tax', fa.tax === FH_TAX, fa);
  ok('FH Option A prints the fixture total', fa.tot === FH_TOTAL, fa);
  ok('FH Option B print total === calcFhBTotal', fb.tot === m2(b.total), [fb.tot, b.total]);
  ok('FH Option B print tax === calcFhBTotal', fb.tax === m2(b.tax), [fb.tax, b.tax]);
  ok('the FH difference is stated as a sentence', /Option B is \$[\d,]+\.\d\d (more|less) than Option A\./.test(s.text),
     (s.text.match(/Option B is [^.]*\./) || ['(missing)'])[0]);
  ok('the FH difference figure equals B − A', money((s.text.match(/DIFFERENCE [+−]\$[\d,]+\.\d\d/) || [''])[0]) === Math.abs(m2(fb.tot - fa.tot)), [fb.tot, fa.tot]);
  ok('FH shows no cemetery financing estimate', !/\/mo ·/.test(s.text), (s.text.match(/\/mo[^A-Z]{0,60}/) || ['(none)'])[0]);
  ok('FH carries the shared footer', /16445 International Blvd, SeaTac, WA 98188/.test(s.text));
  ok('the FH tax note is the funeral-home one', /Services & transportation are exempt/.test(s.text), (s.text.match(/Tax applies[^.]*\./) || ['(missing)'])[0]);
  ok('no hand-rolled navy header survives', !/#1B2A4A/i.test(s.html) && !/FH Compare —/.test(s.html));
}

// ── 5. Empty Option B is refused on FH and handled on cemetery ──────────────────
console.log('\n5. Guards');
{
  const alerted = await page.evaluate(() => {
    const ra = window.alert; let msg = '';
    window.alert = m => { msg = m; };
    ['fhCmpB_plan', 'fhCmpB_discType'].forEach(id => { document.getElementById(id).value = ''; });
    ['fhCmpB_basicSvc'].forEach(id => { document.getElementById(id).checked = false; });
    document.getElementById('fhCmpB_casket').value = '';
    let opened = 0; const ro = window.open;
    window.open = function () { opened++; return ro.apply(window, arguments); };
    printFhCompare();
    window.alert = ra; window.open = ro;
    return { msg: msg, opened: opened };
  });
  ok('an empty FH Option B is refused, not printed', /Build Option B first/.test(alerted.msg) && alerted.opened === 0, alerted);
}

// ── 6. The Compare panels on screen ────────────────────────────────────────────
console.log('\n6. Compare panels');
{
  // Opening a panel runs cemUpdate()/fhUpdate() off the (empty) form, so do the toggle-label
  // reading first and re-seed both quotes afterwards before reading the painted panels.
  const btns = await page.evaluate(() => {
    const o = {};
    toggleCompare();   o.cemOpen   = document.getElementById('compareToggleBtn').textContent.trim();
    toggleCompare();   o.cemClosed = document.getElementById('compareToggleBtn').textContent.trim();
    toggleFhCompare(); o.fhOpen    = document.getElementById('fhCompareToggleBtn').textContent.trim();
    toggleFhCompare(); o.fhClosed  = document.getElementById('fhCompareToggleBtn').textContent.trim();
    return o;
  });
  ok('the two compare toggles say the same thing when open', btns.cemOpen === btns.fhOpen, [btns.cemOpen, btns.fhOpen]);
  ok('and the same thing when closed', btns.cemClosed === btns.fhClosed, [btns.cemClosed, btns.fhClosed]);
  ok('no emoji leaks into either toggle label',
     !/[\u2696\u2716\uFE0F]/.test(btns.cemOpen + btns.cemClosed + btns.fhOpen + btns.fhClosed), btns);

  const r = await page.evaluate(([cem, fh]) => {
    _cemLines = cem; _cemTotal = renderSummary('cemSummary', _cemLines, 0, '', '');
    _fhLines  = fh;  _fhTotal  = renderSummary('fhSummary',  _fhLines,  0, '', '');
    updateCompare();
    fhCompareUpdate();
    const bCard = document.getElementById('comparePanel').querySelectorAll('[style*="dashed"]')[0];
    const order = [...bCard.querySelectorAll('[id^="cmpB_"]')].map(e => e.id);
    return {
      aBreak: document.getElementById('cmpA_breakdown').innerText.replace(/\s+/g, ' '),
      bBreak: document.getElementById('cmpB_breakdown').innerText.replace(/\s+/g, ' '),
      fhABreak: document.getElementById('fhCmpA_breakdown').innerText.replace(/\s+/g, ' '),
      fhALabel: document.getElementById('fhCmpA_label').textContent.trim(),
      diffInHeader: order.indexOf('cmpB_diff') >= 0 && order.indexOf('cmpB_diff') < order.indexOf('cmpB_breakdown'),
      totalAboveBreakdown: order.indexOf('cmpB_total') < order.indexOf('cmpB_breakdown'),
      diffPill: document.getElementById('cmpB_diff').getAttribute('style') || '',
    };
  }, [CEM, FH]);
  ok('cemetery Option A breakdown now discloses sales tax', /Sales Tax \(10\.4%\) — \$364\.52/.test(r.aBreak), r.aBreak.slice(-90));
  ok('cemetery Option B breakdown still discloses sales tax', /Sales Tax \(10\.4%\)/.test(r.bBreak), r.bBreak.slice(-90));
  ok('FH Option A breakdown now discloses sales tax', /Sales Tax \(10\.4%\) — \$382\.72/.test(r.fhABreak), r.fhABreak.slice(-90));
  ok("FH Option A is labelled by its arrangement, not by the family's name",
     r.fhALabel !== 'Rivera Family' && r.fhALabel.length > 0, r.fhALabel);
  ok('Option B total sits above the breakdown, level with Option A', r.totalAboveBreakdown === true, r);
  ok('the difference badge is a pill in the Option B header', r.diffInHeader === true && /border-radius:\s*20px/.test(r.diffPill), r.diffPill);
}

// ── 7. At-Need funeral home drops the panel's monthly estimate too ─────────────
console.log('\n7. FH At-Need panel');
{
  const r = await page.evaluate(() => {
    // Section 5 emptied Option B; rebuild it so its monthly line has something to suppress.
    const p2 = document.getElementById('fhCmpB_plan');
    p2.value = [...p2.options].find(o => (o.value || '').split('|').length >= 3).value;
    calcFhBTotal();
    document.getElementById('fhTypeAN').checked = true;
    fhCompareUpdate();
    const an = { a: document.getElementById('fhCmpA_monthly').textContent.trim(),
                 b: document.getElementById('fhCmpB_monthly').textContent.trim() };
    document.getElementById('fhTypeAN').checked = false;
    document.getElementById('fhTypePN').checked = true;
    fhCompareUpdate();
    return { an: an, pn: document.getElementById('fhCmpA_monthly').textContent.trim(),
             pnB: document.getElementById('fhCmpB_monthly').textContent.trim(), total: _fhTotal };
  });
  ok('At-Need FH panel shows no monthly for Option A', r.an.a === '', r);
  ok('At-Need FH panel shows no monthly for Option B', r.an.b === '', r);
  ok('pre-need FH panel still shows one for Option A', /\/mo/.test(r.pn), r);
  ok('pre-need FH panel still shows one for Option B', /\/mo/.test(r.pnB), r);
}

// ── 8. It still fits one page at a realistic length, and says so when B is empty ───────────
console.log('\n8. Length and empty-B behaviour');
{
  const r = await page.evaluate(() => {
    // 12 priced rows per column plus property, ECF and a discount — a long but ordinary quote.
    const lines = [{ label: 'Garden 17 – Sundial', amount: 4995, taxable: false, isSpace: true },
                   { label: 'Endowment Care Fund (ECF)', amount: 750, taxable: false, isSpace: true }];
    for (let i = 0; i < 12; i++) lines.push({ label: 'Memorial Bronze Plaque Number ' + (i + 1), amount: 400 + i, taxable: true });
    lines.push({ label: 'Pre-Need Discount', amount: -500, isDiscount: true });
    const total = lines.reduce((a, l) => a + (l.isDiscount ? -Math.abs(l.amount) : l.amount), 0)
                + Math.round(lines.filter(l => l.taxable).reduce((a, l) => a + l.amount, 0) * 0.104 * 100) / 100;
    const m = _fqCompareModel({ typeLabel: 'Cemetery Option Comparison', scopeLabel: 'Washington Memorial Park',
      clientName: 'Rivera Family', kind: 'cem', showPayment: true,
      options: [{ letter: 'A', label: 'Garden 17', lines: lines, total: total },
                { letter: 'B', label: 'Garden 6', lines: lines, total: total }] });
    const w = window.open('', '_blank'); w.print = function () {};
    w.document.open(); w.document.write(_fqRenderCompareHTML(m)); w.document.close();
    const css = _fqFitForPrint(w.document);
    const rect = w.document.querySelector('.sheet').getBoundingClientRect();
    const k = parseFloat((String(css).match(/zoom:([\d.]+)/) || [0, '1'])[1]);
    w.close();
    return { h: rect.height, w: rect.width, k: k, tierPicked: _fqPickCompareTier(m).base };
  });
  ok('a 14-row-per-column comparison still fits one Letter page',
     r.h * r.k <= 953 && r.w * r.k <= 726, r);
  ok('and it does that by tightening the density tier, not by clipping', r.tierPicked <= 13.5, r);

  // Empty Option B: the cemetery compare still prints (the FH one refuses — see 5), and says
  // plainly that there is nothing to compare rather than showing a bogus difference.
  const s2 = await capture(() => {
    resetOptionB();
    printCompare();
  });
  ok('an empty Option B prints an honest column', /Nothing selected for this option yet/.test(s2.text),
     s2.cols[1].slice(0, 120));
  ok('and no difference is claimed', /Both options need pricing before they can be compared\./.test(s2.text),
     (s2.text.match(/Two options, side by side[^.]*\./) || ['(missing)'])[0]);
  ok('the difference figure reads as a dash', /DIFFERENCE —/.test(s2.text), (s2.text.match(/DIFFERENCE .{0,12}/) || ['(missing)'])[0]);
}

ok('no page errors', errs.length === 0, errs);

await ctx.close();
await browser.close();
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
