// Family-quote money and print path. Guards the two bugs fixed 2026-08-05:
//
//   1. Every surface's "subtotal" was set to s.total — the TAX-INCLUSIVE grand total — so the
//      printed line "Cemetery subtotal $X" repeated the grand total and the item rows above it
//      never added up to it. The subtotal must be the pre-tax net; financing/insurance bases
//      must stay on the post-tax total so no payment figure moves.
//   2. The Print button aliased _fqOpenForPrint(), which window.open()s a blob: PDF — browsers
//      DOWNLOAD that. Print must open a real HTML page and raise the print dialog, and its
//      payment page must show the same figures as the pdf-lib artifact.
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
  { label: 'Interment Service (Saturday)', amount: 2000, taxable: false },
  { label: 'Companion Lawn Crypt',          amount: 6500, taxable: false },
  { label: 'Granite Flush Marker',          amount: 1000, taxable: true  },
  { label: 'Marker Installation',           amount: 500,  taxable: true  },
  { label: 'Pre-Need Discount', amount: -300, isDiscount: true, taxableDiscount: false },
];
const FH = [
  { label: 'Basic Services of Funeral Director & Staff', amount: 2425, taxable: false },
  { label: 'Transfer of Deceased to Funeral Home',       amount: 715,  taxable: false },
  { label: 'Casket: Wilbert Bronze',                     amount: 3200, taxable: true  },
  { label: 'Urn: Classic Bronze',                        amount: 480,  taxable: true  },
];
const CEM_NET = 9700, FH_NET = 6820;

const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true });
await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.addInitScript(FAKE);
await page.addInitScript(`window.__fake.addAccount('t@bwquote.local','pw');`);
await page.goto(BASE, { waitUntil: 'load', timeout: 120000 });
await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('t@bwquote.local', 'pw'));
await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });

await page.evaluate(([cem, fh]) => {
  _cemLines = cem; _cemTotal = renderSummary('cemSummary', _cemLines, 0, '', '');
  _fhLines  = fh;  _fhTotal  = renderSummary('fhSummary',  _fhLines,  0, '', '');
  _combCemLines = _cemLines.slice(); _combCemTotal = _cemTotal;
  _combFhLines  = _fhLines.slice();  _combFhTotal  = _fhTotal;
  const age = document.getElementById('fhInsAge'); if (age) age.value = '72';
  const bud = document.getElementById('combTargetBudget'); if (bud) bud.value = '450';
}, [CEM, FH]);

// ── 1. The model ───────────────────────────────────────────────────────────────
console.log('\n1. Surface subtotal is the pre-tax net, total stays tax-inclusive');
{
  const r = await page.evaluate(() => {
    const mk = (o) => _fqBuildModel(Object.assign({ scopeLabel: 'WMP', clientName: 'T', notes: '', showPayment: true }, o));
    const cem = mk({ typeLabel: 'Cemetery Quote', surfaces: [{ kind:'cem', name:'Cemetery', tagline:'WMP', lines:_cemLines, total:_cemTotal }] });
    const fh  = mk({ typeLabel: 'Funeral Home Quote', maxima: _fqMaximaPlans(72, 0, _fhTotal),
                     surfaces: [{ kind:'fh', name:'Funeral Home', tagline:'S', lines:_fhLines, total:_fhTotal }] });
    const cb  = mk({ typeLabel: 'Combined Family Quote', maxima: _fqMaximaPlans(72, 0, _fhTotal), combBudget: 450,
                     surfaces: [{ kind:'cem', name:'Cemetery', tagline:'WMP', lines:_cemLines, total:_cemTotal },
                                { kind:'fh', name:'Funeral Home', tagline:'S', lines:_fhLines, total:_fhTotal }] });
    const pick = m => ({ subs: m.surfaces.map(s => s.subtotal), tots: m.surfaces.map(s => s.total),
                         rowSums: m.surfaces.map(s => s.groups.reduce((a,g)=>a+g.rows.reduce((b,x)=>b+x.amount,0),0)),
                         discs: m.surfaces.map(s => s.discount ? s.discount.amount : 0),
                         taxRows: m.surfaces.some(s => s.groups.some(g => g.rows.some(x => /^sales tax/i.test(x.name)))),
                         tax: m.taxAmount, grand: m.grandTotal, cemBase: m.pay.cemBase, fhBase: m.pay.fhBase, scope: m.pay.scope });
    return { cem: pick(cem), fh: pick(fh), cb: pick(cb), cemTotal: _cemTotal, fhTotal: _fhTotal };
  });

  ok('cemetery subtotal is the pre-tax net', m2(r.cem.subs[0]) === CEM_NET, r.cem.subs);
  ok('cemetery subtotal is NOT the tax-inclusive total', m2(r.cem.subs[0]) !== m2(r.cemTotal), [r.cem.subs[0], r.cemTotal]);
  ok('cemetery subtotal + tax reconciles to the total', m2(r.cem.subs[0] + r.cem.tax) === m2(r.cem.grand), [r.cem.subs[0], r.cem.tax, r.cem.grand]);
  ok('cemetery printed rows less discount equal the subtotal', m2(r.cem.rowSums[0] - r.cem.discs[0]) === m2(r.cem.subs[0]), [r.cem.rowSums[0], r.cem.discs[0]]);
  ok('no sales-tax row is hidden inside the item list', r.cem.taxRows === false);

  ok('funeral-home subtotal is the pre-tax net', m2(r.fh.subs[0]) === FH_NET, r.fh.subs);
  ok('funeral-home subtotal + tax reconciles to the total', m2(r.fh.subs[0] + r.fh.tax) === m2(r.fh.grand));

  ok('combined subtotals are both pre-tax nets', m2(r.cb.subs[0]) === CEM_NET && m2(r.cb.subs[1]) === FH_NET, r.cb.subs);
  ok('combined subtotals + tax reconcile to the grand total',
     m2(r.cb.subs[0] + r.cb.subs[1] + r.cb.tax) === m2(r.cb.grand), [r.cb.subs, r.cb.tax, r.cb.grand]);

  // The whole point of keeping `total` alongside `subtotal`: payment math must not move.
  ok('cemetery financing base is still the POST-tax total', m2(r.cem.cemBase) === m2(r.cem.tots[0]), [r.cem.cemBase, r.cem.tots[0]]);
  ok('funeral-home insurance base is still the POST-tax total', m2(r.fh.fhBase) === m2(r.fh.tots[0]), [r.fh.fhBase, r.fh.tots[0]]);
  ok('combined payment bases are still the POST-tax totals',
     m2(r.cb.cemBase) === m2(r.cb.tots[0]) && m2(r.cb.fhBase) === m2(r.cb.tots[1]), [r.cb.cemBase, r.cb.fhBase, r.cb.tots]);
}

// ── 2. The on-screen combined panel ────────────────────────────────────────────
console.log('\n2. Combined panel shows subtotal + tax + total, and adds up');
{
  const txt = await page.evaluate(() => { combUpdate(); return document.getElementById('combSummary').innerText; });
  const num = (l) => { const m = txt.match(new RegExp(l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\$([\\d,]+\\.\\d\\d)')); return m ? parseFloat(m[1].replace(/,/g, '')) : null; };
  const tax = num('Sales tax (10.4% · merchandise only)');
  ok('panel Cemetery Subtotal is the pre-tax net', num('Cemetery Subtotal') === CEM_NET, num('Cemetery Subtotal'));
  ok('panel Funeral Home Subtotal is the pre-tax net', num('Funeral Home Subtotal') === FH_NET, num('Funeral Home Subtotal'));
  ok('panel discloses sales tax on its own line', tax !== null && tax > 0, tax);
  ok('panel subtotals + tax equal the Combined Total',
     m2(num('Cemetery Subtotal') + num('Funeral Home Subtotal') + tax) === m2(num('Combined Total')),
     [num('Cemetery Subtotal'), num('Funeral Home Subtotal'), tax, num('Combined Total')]);
  ok('the misleading "Tax included in each subtotal" footnote is gone', !/Tax included in each subtotal/.test(txt));
}

// ── 3. Print opens an HTML page, not a download ────────────────────────────────
console.log('\n3. Print opens a printable browser page');
{
  let downloaded = false;
  page.on('download', () => { downloaded = true; });
  const pp = ctx.waitForEvent('page', { timeout: 20000 });
  await page.evaluate(() => {
    const ro = window.open;
    window.open = function () { const w = ro.apply(window, arguments); try { w.print = function () { w.__printed = true; }; } catch (e) {} return w; };
    printCemQuote();
  });
  const pop = await pp;
  await pop.waitForLoadState('domcontentloaded');
  await pop.waitForFunction(() => !!window.__printed, { timeout: 15000 }).catch(() => {});
  const s = await pop.evaluate(() => ({
    url: location.href, ct: document.contentType, sheets: document.querySelectorAll('.sheet').length,
    embed: !!document.querySelector('embed,object[type="application/pdf"]'),
    printed: !!window.__printed, fit: !!document.getElementById('fqFitStyle'),
    text: document.body.innerText.replace(/\s+/g, ' '),
  }));
  ok('print window is not a blob: URL', !/^blob:/.test(s.url), s.url.slice(0, 60));
  ok('print window is text/html', s.ct === 'text/html', s.ct);
  ok('print window has no PDF embed', s.embed === false);
  ok('print window renders both quote sheets', s.sheets === 2, s.sheets);
  ok('no file was downloaded', downloaded === false);
  ok('the browser print dialog was raised', s.printed === true);
  ok('a fit-to-page rule was installed', s.fit === true);
  ok('printed page shows the pre-tax subtotal', /Cemetery subtotal \$9,700\.00/i.test(s.text),
     (s.text.match(/Cemetery subtotal \$[\d,.]+/i) || ['(missing)'])[0]);
  await pop.close();
}

// ── 4. Printed page 2 vs the PDF, figure for figure ────────────────────────────
console.log('\n4. Printed payment page matches the PDF');
{
  const r = await page.evaluate(() => {
    const money = n => '$' + Math.abs(Math.round(n * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const cemS = { kind:'cem', name:'Cemetery', tagline:'WMP', lines:_cemLines, total:_cemTotal };
    const fhS  = { kind:'fh',  name:'Funeral Home', tagline:'S', lines:_fhLines, total:_fhTotal };
    const base = { scopeLabel:'WMP', clientName:'T', notes:'', showPayment:true };
    const models = {
      cem:      _fqBuildModel({ ...base, typeLabel:'Cemetery Quote', surfaces:[cemS] }),
      fh:       _fqBuildModel({ ...base, typeLabel:'Funeral Home Quote', maxima:_fqMaximaPlans(72, 500, _fhTotal), surfaces:[fhS] }),
      combined: _fqBuildModel({ ...base, typeLabel:'Combined Family Quote', maxima:_fqMaximaPlans(72, 0, _fhTotal), combBudget:450, surfaces:[cemS, fhS] }),
    };
    const out = {};
    Object.keys(models).forEach(k => {
      const m = models[k], pay = m.pay, exp = [];
      // Recompute every payment figure the way the pdf-lib page-2 code does.
      if (pay.scope !== 'fh') {
        [0.10, 0.20, 0.25].forEach(d => {
          const tiers = FIN_TIERS[d]; if (!tiers) return;
          const down = Math.ceil(pay.cemBase * d), bal = pay.cemBase - down; if (bal <= 0) return;
          exp.push(money(down), money(bal));
          tiers.forEach(t => { const mo = finMonthly(bal, t[0], t[1]); exp.push(money(mo) + '/mo', money(down + mo * t[0])); });
        });
      }
      if (pay.maxima && pay.maxima.plans.length) {
        pay.maxima.plans.forEach(p => { if (!p.oneTime) exp.push(money(p.monthly) + '/mo'); exp.push(money(p.totalPaid)); });
      }
      const doc = new DOMParser().parseFromString(_fqRenderHTML(m), 'text/html');
      const p2 = doc.querySelector('.page2');
      const flat = (p2 ? (p2.innerText || p2.textContent) : '').replace(/\s+/g, ' ');
      out[k] = { scope: pay.scope, hasPage2: m.hasPage2, expected: exp.length, missing: exp.filter(v => flat.indexOf(v) === -1) };
    });
    return out;
  });
  Object.keys(r).forEach(k => {
    const p = r[k];
    ok(`${k} (scope=${p.scope}): all ${p.expected} payment figures present on the printed page`,
       p.hasPage2 && p.expected > 0 && p.missing.length === 0, p.missing.slice(0, 6));
  });

  // Payment figures come from the real rate table, not a flat-0% stand-in.
  const apr = await page.evaluate(() => {
    const m = _fqBuildModel({ scopeLabel:'WMP', clientName:'T', notes:'', showPayment:true, typeLabel:'Cemetery Quote',
      surfaces:[{ kind:'cem', name:'Cemetery', tagline:'WMP', lines:_cemLines, total:_cemTotal }] });
    const h = _fqRenderHTML(m);
    return { hasApr: /APR/.test(h), hasAch: /0% · ACH/.test(h), has72: /72 months/.test(h), has24: /24 months/.test(h) };
  });
  ok('printed page shows the real FIN_TIERS terms (24 and 72 months)', apr.has24 && apr.has72, apr);
  ok('printed page shows APR rates as well as 0%/ACH', apr.hasApr && apr.hasAch, apr);
}

ok('no page errors', errs.length === 0, errs.slice(0, 3));

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
