// Discount → tax buckets (_bwNetBuckets). The bug: a discount bigger than its own bucket was
// clamped to zero and the rest thrown away. On a merchandise-only cemetery quote (vault setting +
// inscription, all taxable, zero exempt services) a flat discount came off nothing at all: the
// total was identical to the same quote with no discount, while the quote printed the discount.
// The rule kept: services discounts come off services first, merchandise discounts off merchandise
// first. Only the OVERFLOW moves now, so every quote whose discount fits is unchanged (section 2/5).
//
// Expectations are computed from the prices the app itself produced, never from copied constants,
// so a price update can't rot this suite. Fake Firebase only — production is never contacted, and
// nothing here calls a save/persist function.
import { chromium } from 'playwright';
import fs from 'fs';
import { BASE } from './_base.mjs';

const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };
const near = (a, b, t = 0.02) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= t;

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
await page.waitForTimeout(250);

// Page-scope harness. cem() builds a cemetery quote from real UI controls and returns the bucket
// figures the app derived, so every assertion below is checked against the app's own pricing.
await page.evaluate(() => {
  window.__D = {
    resetCem() {
      show('cem-quote', null);
      const g = document.getElementById('qGarden'); if (g) g.value = '';
      ['qNichePrice', 'qMausPrice'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
      ['qGardenQty', 'qNicheQty', 'qMausQty'].forEach(id => { const e = document.getElementById(id); if (e) e.value = '1'; });
      ['q2ndRight', 'q3rdRight', 'qSettingBurial', 'qInscPoem', 'qSpaceOwned'].forEach(id => {
        const e = document.getElementById(id); if (e) e.checked = false;
      });
      document.getElementById('cemDiscountList').innerHTML = '';
    },
    firstGarden() {
      const g = document.getElementById('qGarden');
      return [...g.options].find(o => (o.value || '').split('|').length >= 2 && parseFloat(o.value.split('|')[1]) > 0).value;
    },
    // s: { garden?, merch?: true, mode?, amt? }
    async cem(s) {
      this.resetCem();
      if (s.garden) document.getElementById('qGarden').value = this.firstGarden();
      if (s.merch) { // taxable-only items: vault setting + an inscription
        ['qSettingBurial', 'qInscPoem'].forEach(id => { const e = document.getElementById(id); if (e) e.checked = true; });
      }
      if (s.mode) {
        addCemDiscount();
        const row = document.querySelector('#cemDiscountList .disc-row');
        row.querySelector('.disc-mode').value = s.mode;
        cemDiscModeChange(row.querySelector('.disc-mode'));
        if (s.amt != null) row.querySelector('.disc-amt').value = String(s.amt);
      }
      cemUpdate();
      await new Promise(r => setTimeout(r, 60));
      cemUpdate();
      await new Promise(r => setTimeout(r, 60));
      return this.read(window._cemLines, window._cemTotal);
    },
    async fh(s) {
      show('fh-quote', null);
      document.getElementById('fhDiscountList').innerHTML = '';
      // exempt services + taxable engraving items (plain checkboxes, no sub-widgets to drive)
      ['fhBasicSvc', 'fhEmbalming'].forEach(id => { const e = document.getElementById(id); if (e) e.checked = !!s.svc; });
      ['fhEngravOptCustom', 'fhEngravNonOptStd'].forEach(id => { const e = document.getElementById(id); if (e) e.checked = !!s.merch; });
      if (s.applies) {
        addFhDiscount();
        const row = document.querySelector('#fhDiscountList .disc-row');
        row.querySelector('.disc-applies').value = s.applies;
        row.querySelector('.disc-mode-fh').value = s.mode || 'flat';
        row.querySelector('.disc-amt').value = String(s.amt);
      }
      fhUpdate();
      await new Promise(r => setTimeout(r, 60));
      return this.read(window._fhLines, window._fhTotal);
    },
    read(lines, total) {
      lines = (lines || []).map(l => ({ ...l }));
      const items = lines.filter(l => !l.isDiscount && !l.isTax);
      const disc = lines.find(l => l.isDiscount) || null;
      return {
        taxableSub: items.filter(l => l.taxable).reduce((a, l) => a + l.amount, 0),
        exemptSub:  items.filter(l => !l.taxable).reduce((a, l) => a + l.amount, 0),
        disc, total,
        net: _fqNetOf(lines),
        tax: _fqTaxOf(lines),
        TAX: (typeof TAX !== 'undefined' ? TAX : null),   // `const TAX` is not a window property
      };
    },
  };
});

const cem = s => page.evaluate(x => __D.cem(x), s);
const fh  = s => page.evaluate(x => __D.fh(x), s);

// ── 1. The reported bug: a merchandise-only quote ───────────────────────────────────────────────
console.log('\n1. Merchandise-only cemetery quote (zero exempt services)');
{
  const base = await cem({ merch: true });
  const D = 500;
  const withD = await cem({ merch: true, mode: 'flat', amt: D });

  ok('the scenario really has no exempt services', near(base.exemptSub, 0), base);
  ok('it has taxable merchandise', base.taxableSub > 0, base);
  ok('a discount line was produced', !!withD.disc, withD);

  // The bug: this used to equal base.total exactly — the discount came off nothing.
  ok('the discount actually changes the total', !near(withD.total, base.total), { base: base.total, withD: withD.total });
  const expTax = Math.round((base.taxableSub - D) * base.TAX * 100) / 100;
  ok('all $500 comes off the taxable bucket', near(withD.tax, expTax), { got: withD.tax, exp: expTax });
  ok('total = discounted merchandise + tax on it',
     near(withD.total, (base.taxableSub - D) + expTax), { got: withD.total, exp: (base.taxableSub - D) + expTax });
  ok('the family saves the discount plus the tax on it',
     near(base.total - withD.total, D + Math.round(D * base.TAX * 100) / 100), { saved: base.total - withD.total });
}

// ── 2. A discount that fits the services side changes nothing about the tax ────────────────────
console.log('\n2. Mixed quote: "% all items" that fits the services is unchanged');
{
  const base = await cem({ garden: true, merch: true });
  const P = 10;
  const withD = await cem({ garden: true, merch: true, mode: 'percent', amt: P });
  ok('the scenario has both exempt and taxable items', base.exemptSub > 0 && base.taxableSub > 0, base);
  ok('the 10% fits inside the services', withD.disc && Math.abs(withD.disc.amount) <= base.exemptSub, withD.disc);
  ok('tax is exactly what it was before the fix (all of it off services)', near(withD.tax, base.tax), { got: withD.tax, exp: base.tax });
  ok('total = items less 10% + unchanged tax',
     near(withD.total, (base.exemptSub + base.taxableSub) * (1 - P / 100) + base.tax), withD);
}

// ── 3. The print invariant: subtotal + tax == total ─────────────────────────────────────────────
console.log('\n3. Printed quote reconciles (net + tax == total)');
for (const s of [
  { name: 'merchandise-only + flat',   sc: { merch: true, mode: 'flat', amt: 500 } },
  { name: 'mixed + % all items',        sc: { garden: true, merch: true, mode: 'percent', amt: 10 } },
  { name: 'mixed + flat all items',     sc: { garden: true, merch: true, mode: 'flat', amt: 2500 } },
  { name: 'mixed + exempt-only',        sc: { garden: true, merch: true, mode: 'flat_exempt', amt: 500 } },
  { name: 'mixed + taxable-only',       sc: { garden: true, merch: true, mode: 'flat_taxable', amt: 300 } },
  { name: 'mixed, no discount',         sc: { garden: true, merch: true } },
]) {
  const r = await cem(s.sc);
  ok(s.name + ': net + tax == total', near(r.net + r.tax, r.total), { net: r.net, tax: r.tax, total: r.total });
}

// ── 4. No regression on the bucket-specific and promo modes ─────────────────────────────────────
console.log('\n4. Bucket-specific and promo modes are unchanged');
{
  const base = await cem({ garden: true, merch: true });

  const ex = await cem({ garden: true, merch: true, mode: 'flat_exempt', amt: 500 });
  ok('exempt-only discount leaves the tax untouched', near(ex.tax, base.tax), { got: ex.tax, exp: base.tax });

  const tx = await cem({ garden: true, merch: true, mode: 'flat_taxable', amt: 300 });
  const expTax = Math.round((base.taxableSub - 300) * base.TAX * 100) / 100;
  ok('taxable-only discount takes the full 300 off the tax base', near(tx.tax, expTax), { got: tx.tax, exp: expTax });

  const promo = await cem({ garden: true, merch: true, mode: 'promo_burial' });
  ok('promo (property + O&C, both exempt) leaves the tax untouched', near(promo.tax, base.tax), { got: promo.tax, exp: base.tax });
}

// ── 5. Funeral home: "All Services" applies-to ──────────────────────────────────────────────────
console.log('\n5. Funeral home — applies-to "All Services"');
{
  const base = await fh({ svc: true, merch: true });
  ok('FH scenario has both buckets', base.exemptSub > 0 && base.taxableSub > 0, base);

  const all = await fh({ svc: true, merch: true, applies: 'all', mode: 'flat', amt: 400 });
  ok('FH all-services $400 fits the services: tax unchanged', near(all.tax, base.tax), { got: all.tax, exp: base.tax });
  ok('FH net + tax == total', near(all.net + all.tax, all.total), all);

  const exOnly = await fh({ svc: true, merch: true, applies: 'exempt', mode: 'flat', amt: 400 });
  ok('FH exempt-only leaves tax untouched', near(exOnly.tax, base.tax), { got: exOnly.tax, exp: base.tax });
}

// ── 6. The helper itself: overflow spills instead of vanishing ──────────────────────────────────
console.log('\n6. _bwNetBuckets: overflow spills instead of vanishing');
{
  const r = await page.evaluate(() => {
    const D = (amt, f) => Object.assign({ amount: -amt, isDiscount: true }, f || {});
    return {
      spill:     _bwNetBuckets(1000, 200, [D(500)]),
      merchOnly: _bwNetBuckets(3895, 0, [D(500)]),
      fits:      _bwNetBuckets(3895, 9125, [D(1302)]),
      over:      _bwNetBuckets(100, 100, [D(500)]),
      txSpill:   _bwNetBuckets(200, 1000, [D(500, { taxableDiscount: true })]),
      txFits:    _bwNetBuckets(2000, 1000, [D(500, { taxableDiscount: true })]),
    };
  });
  ok('services overflow spills into merchandise (nothing lost)', near(r.spill.taxable, 700) && near(r.spill.exempt, 0), r.spill);
  ok('merchandise-only: the whole discount lands on merchandise', near(r.merchOnly.taxable, 3395) && near(r.merchOnly.exempt, 0), r.merchOnly);
  ok('a discount that fits the services leaves merchandise alone', near(r.fits.taxable, 3895) && near(r.fits.exempt, 7823), r.fits);
  ok('an over-large discount clamps at zero, never negative', r.over.taxable === 0 && r.over.exempt === 0, r.over);
  ok('merchandise overflow spills into services', near(r.txSpill.taxable, 0) && near(r.txSpill.exempt, 700), r.txSpill);
  ok('a merchandise discount that fits leaves services alone', near(r.txFits.taxable, 1500) && near(r.txFits.exempt, 1000), r.txFits);
}

// ── 7. Every other place that figures tax uses the same rule ───────────────────────────────────
console.log('\n7. Copied text and the combined quote');
{
  const r = await page.evaluate(() => {
    const lines = [{ label: 'Vault', amount: 1000, taxable: true }, { label: '10% off Merchandise', amount: -100, isDiscount: true, taxableDiscount: true }];
    const text = buildExportText(lines, 900 * (1 + TAX), 'Test', 'Cemetery Quote');
    const taxLine = (text.match(/Sales Tax \(10\.4%\)\s+\$([\d,.]+)/) || [])[1];
    // Combined: $5,000 services + $1,000 merchandise on the cemetery side, no FH side.
    show('combined-quote', null);
    _combCemLines = [{ label: 'Space', amount: 5000, taxable: false }, { label: 'Vault', amount: 1000, taxable: true }];
    _combCemTotal = 6000 + Math.round(1000 * TAX * 100) / 100;
    _combFhLines = []; _combFhTotal = 0;
    document.getElementById('combDiscMode').value = 'percent';
    document.getElementById('combDiscValue').value = '10';
    combUpdate();
    const pct = { disc: _combDiscountAmt, tax: _combTaxTotal, total: _combGrandTotal };
    document.getElementById('combDiscMode').value = 'flat';
    document.getElementById('combDiscValue').value = '5500';
    combUpdate();
    const big = { disc: _combDiscountAmt, tax: _combTaxTotal, total: _combGrandTotal };
    document.getElementById('combDiscMode').value = ''; combUpdate();
    return { taxLine, pct, big };
  });
  ok('copied text taxes merchandise after its discount ($900 → $93.60)', r.taxLine === '93.60', r.taxLine);
  ok('combined 10% is 10% of the pre-tax $6,000, not of the tax-inclusive total', near(r.pct.disc, 600), r.pct);
  ok('combined 10% that fits the services leaves the tax alone', near(r.pct.tax, 104) && near(r.pct.total, 5504), r.pct);
  ok('combined $5,500 overflows $500 into merchandise: tax drops to $52', near(r.big.tax, 52) && near(r.big.total, 552), r.big);
}

ok('no page errors', errs.length === 0, errs);
console.log('\n' + pass + ' passed, ' + fail + ' failed');
await browser.close();
process.exit(fail ? 1 : 0);
