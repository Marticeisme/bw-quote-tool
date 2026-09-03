// September 2026 pre-need incentives + the Veteran Space Credit — the discount math in
// cemUpdate(), the compare Option B builder, and the discount panel's own wording.
//
// The September sheet is rate-for-rate identical to August: only the month, the validity
// date (September 30, 2026) and the user-facing strings moved. The rules it encodes:
//   • the property rate is no longer one flat 10%. Burial property is 10%, cremation
//     property is 20%, and a mausoleum crypt in Rows E/F/G is 20% (counselor opt-in,
//     because the builder does not know a crypt's row).
//   • additional (2nd/3rd) interment rights are NO LONGER discounted. July folded them
//     into the same 10% base.
//   • O&C stacking is unchanged: -$1,000/space burial and -$500/space cremation, each
//     capped at the O&C actually quoted.
//   • ECF is never in the discount base, on any promo, and its own line never moves.
//   • the Family 45-Day Certificate (promo_family45) is untouched at 15%, no O&C.
//   • SECOND RIGHTS ARE NOT INCLUDED IN ANY PROPERTY DISCOUNT — pinned under the September
//     name in section 2, and stated on the panel note itself (section 11).
//
// New in September: the VETERAN SPACE CREDIT (promo_veteran) — a flat $5,995 against ONE
// space (the highest-priced ground space, niche or crypt on the quote), capped at that
// space's price, never touching ECF / O&C / merchandise / additional rights. It is
// available on pre-need AND at-need cemetery quotes, and the counselor attests a DD-214
// was received with a checkbox on the row: unchecked, the credit still computes but the
// row shows a red "DD-214 required" hint and the printed line says so. Sections 12–19.
//
// The internal mode ids (promo_burial / promo_crem / promo_property) are deliberately
// unchanged — they are persisted inside saved quotes. A saved July- or August-promo quote
// therefore reloads as a September-promo quote and recomputes at September rates; section
// 9 proves it loads without error rather than asserting a rate that no longer exists.
//
// Fake Firebase only — production is never contacted, and nothing here writes.
import { chromium } from 'playwright';
import fs from 'fs';
import { BASE } from './_base.mjs';
const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };
const near = (a, b, eps = 0.51) => Math.abs(a - b) < eps;

async function open(browser) {
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

  // Page-scope harness. build({...}) resets the cemetery builder, applies a scenario and
  // returns the computed discount line plus the raw inputs it was derived from, so every
  // expectation below is computed from what the app itself priced, not from a copied
  // constant that would rot at the next price update.
  await page.evaluate(() => {
    window.__T = {
      reset() {
        show('cem-quote', null);
        // At-Need is sticky and drops discount rows on the way in, so every scenario starts
        // from Pre-Need unless it asks for At-Need.
        const pn = document.getElementById('cemTypePN');
        if (pn && !pn.checked) { pn.checked = true; cemQuoteTypeChange(); }
        const g = document.getElementById('qGarden'); if (g) g.value = '';
        ['qNichePrice', 'qMausPrice'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
        ['qGardenQty', 'qNicheQty', 'qMausQty'].forEach(id => { const e = document.getElementById(id); if (e) e.value = '1'; });
        ['q2ndRight', 'q3rdRight', 'qBurialArrange', 'qUrnArrange', 'qNicheGlass', 'qNicheGranite',
         'qMausIndoor', 'qMausOutdoor', 'qSpaceOwned', 'qNicheOwned'].forEach(id => {
          const e = document.getElementById(id); if (e) e.checked = false;
        });
        document.getElementById('cemDiscountList').innerHTML = '';
      },
      // First garden option that carries a "key|space|ecf" value.
      firstGarden() {
        const g = document.getElementById('qGarden');
        return [...g.options].find(o => (o.value || '').split('|').length >= 2 && parseFloat(o.value.split('|')[1]) > 0).value;
      },
      // The garden option whose value key is exactly `key` — used where a scenario needs a
      // specific price ($9,995 Sunset, the $5,995 Veterans Garden, the $325 Verses space)
      // and reads the price back off the option so a price update cannot silently rot it.
      gardenByKey(key) {
        const g = document.getElementById('qGarden');
        const o = [...g.options].find(o => (o.value || '').split('|')[0] === key);
        return o ? o.value : null;
      },
      gardenPrice(key) { const v = this.gardenByKey(key); return v ? parseFloat(v.split('|')[1]) : 0; },
      async build(s) {
        this.reset();
        if (s.atneed) {
          const an = document.getElementById('cemTypeAN');
          if (an) { an.checked = true; cemQuoteTypeChange(); }
        }
        if (s.garden) {
          const g = document.getElementById('qGarden');
          g.value = s.gardenKey ? this.gardenByKey(s.gardenKey) : this.firstGarden();
        }
        if (s.gardenQty) document.getElementById('qGardenQty').value = String(s.gardenQty);
        if (s.niche)   { document.getElementById('qNichePrice').value = String(s.niche); }
        if (s.nicheQty) document.getElementById('qNicheQty').value = String(s.nicheQty);
        if (s.maus)    { document.getElementById('qMausPrice').value = String(s.maus); }
        if (s.mausQty) document.getElementById('qMausQty').value = String(s.mausQty);
        (s.check || []).forEach(id => { const e = document.getElementById(id); if (e) e.checked = true; });
        if (s.mode) {
          addCemDiscount();
          const row = document.querySelector('#cemDiscountList .disc-row');
          row.querySelector('.disc-mode').value = s.mode;
          cemDiscModeChange(row.querySelector('.disc-mode'));
          if (s.efg) row.querySelector('.disc-efg').checked = true;
          if (s.dd214) { const dd = row.querySelector('.disc-dd214'); if (dd) dd.checked = true; }
        }
        (s.own || []).forEach(id => { const e = document.getElementById(id); if (e) e.checked = true; });
        cemUpdate();
        await new Promise(r => setTimeout(r, 60));
        cemUpdate(); // second pass: the E/F/G chip's visibility is settled by the first
        await new Promise(r => setTimeout(r, 60));
        const lines = (window._cemLines || []).map(l => ({ ...l }));
        const disc = lines.find(l => l.isDiscount) || null;
        const sum = re => lines.filter(l => !l.isDiscount && re.test(l.label)).reduce((a, l) => a + l.amount, 0);
        const row = document.querySelector('#cemDiscountList .disc-row');
        const wrap = row ? row.querySelector('.disc-efg-wrap') : null;
        const ddw  = row ? row.querySelector('.disc-dd214-wrap') : null;
        const ddh  = row ? row.querySelector('.disc-dd214-hint') : null;
        const warn = document.getElementById('cemVetPromoWarn');
        return {
          disc,
          quoteType: cemQuoteType(),
          discPanelVisible: document.getElementById('cemDiscountPanel').style.display !== 'none',
          noteVisible: document.getElementById('aprilPromoNote').style.display === 'block',
          ddVisible:     ddw ? ddw.style.display === 'inline-flex' : false,
          ddHintVisible: ddh ? ddh.style.display === 'inline' : false,
          ddOnClass:     ddw ? /(^|\s)on(\s|$)/.test(ddw.className) : false,
          warnVisible: warn ? warn.style.display === 'block' : false,
          warnText:    warn ? warn.textContent : '',
          propTotal: (typeof clPropertyTotal === 'function') ? clPropertyTotal(lines) : null,
          merchSum: lines.filter(l => l.taxable && !l.isDiscount).reduce((a, l) => a + l.amount, 0),
          labels: lines.map(l => l.label),
          total: window._cemTotal,
          spaceSum:  lines.filter(l => l.isSpace && !/ECF/i.test(l.label) && !l.isSecondRight).reduce((a, l) => a + l.amount, 0),
          rightsSum: lines.filter(l => l.isSecondRight).reduce((a, l) => a + l.amount, 0),
          ecfSum: sum(/ECF|Endowment Care/i),
          burialOC: sum(/Interment|Entombment/i) - sum(/Recording/i) * 0,
          efgVisible: wrap ? (wrap.style.display !== 'none' && wrap.style.display !== '') : false,
        };
      },
    };
  });
  return { ctx, page, errs };
}

const browser = await chromium.launch();
const { ctx, page, errs } = await open(browser);

// ── 1. Burial property is 10% ─────────────────────────────────────────────
console.log('\n1. Burial property — 10%');
{
  const r = await page.evaluate(() => __T.build({ garden: true, mode: 'promo_burial' }));
  ok('a discount line was produced', !!r.disc, r.labels);
  ok('10% of the ground space', near(-r.disc.amount, r.spaceSum * 0.10), { amt: r.disc.amount, space: r.spaceSum });
  ok('label names burial property at 10%', /10% off burial property/.test(r.disc.label), r.disc.label);
  ok('structured propDiscPct is 10', r.disc.propDiscPct === 10, r.disc.propDiscPct);
  ok('ECF is not in the base', near(-r.disc.amount, (r.spaceSum) * 0.10) && r.ecfSum > 0, { ecf: r.ecfSum });
}

// ── 2. Additional rights are NOT discounted (changed from July) ────────────
console.log('\n2. Additional rights are excluded');
{
  const r = await page.evaluate(() => __T.build({ garden: true, mode: 'promo_burial', check: ['q2ndRight'] }));
  ok('a 2nd right is on the quote', r.rightsSum > 0, r.rightsSum);
  ok('discount still only 10% of the SPACE', near(-r.disc.amount, r.spaceSum * 0.10), { amt: r.disc.amount, space: r.spaceSum, rights: r.rightsSum });
  ok('and NOT of space + rights (the July behaviour)', !near(-r.disc.amount, (r.spaceSum + r.rightsSum) * 0.10), -r.disc.amount);
  ok('label says rights are excluded', /additional rights not included/.test(r.disc.label), r.disc.label);
}

// ── 3. Cremation property is 20%, 2nd rights excluded ─────────────────────
console.log('\n3. Cremation property — 20%, 2nd rights excluded');
{
  const r = await page.evaluate(() => __T.build({ niche: 10000, mode: 'promo_crem' }));
  ok('20% of the niche', near(-r.disc.amount, 2000), r.disc);
  ok('label names cremation property at 20%', /20% off cremation property/.test(r.disc.label), r.disc.label);
  ok('structured propDiscPct is 20', r.disc.propDiscPct === 20, r.disc.propDiscPct);
  ok('niche ECF (10%) is untouched by the promo', near(r.ecfSum, 1000), r.ecfSum);

  const r2 = await page.evaluate(() => __T.build({ garden: true, niche: 10000, mode: 'promo_crem', check: ['q2ndRight'] }));
  ok('with a 2nd right present, the right is not in the base',
     near(-r2.disc.amount, r2.spaceSum * 0.20), { amt: r2.disc.amount, space: r2.spaceSum, rights: r2.rightsSum });
  ok('and the label says so', /additional rights not included/.test(r2.disc.label), r2.disc.label);
  ok('a ground space under the cremation promo takes the 20% cremation rate',
     /20% off cremation property/.test(r2.disc.label) && !/off burial property/.test(r2.disc.label), r2.disc.label);
}

// ── 4. Mausoleum Rows E/F/G — 20% vs 10%, in one quote with ground at 10% ──
console.log('\n4. Mausoleum Rows E, F & G — 20% while ground stays 10%');
{
  const off = await page.evaluate(() => __T.build({ garden: true, maus: 20000, mode: 'promo_burial' }));
  const ground = off.spaceSum - 20000;
  ok('chip is visible once a promo row has mausoleum property', off.efgVisible === true, off.efgVisible);
  ok('unchecked: everything at 10%', near(-off.disc.amount, ground * 0.10 + 20000 * 0.10), { amt: off.disc.amount, ground });
  ok('unchecked label has no row mention', !/Row E\/F\/G/.test(off.disc.label), off.disc.label);

  const on = await page.evaluate(() => __T.build({ garden: true, maus: 20000, mode: 'promo_burial', efg: true }));
  const ground2 = on.spaceSum - 20000;
  ok('checked: crypt 20%, ground still 10%', near(-on.disc.amount, ground2 * 0.10 + 20000 * 0.20), { amt: on.disc.amount, ground: ground2 });
  ok('label shows both rates', /10% off burial property/.test(on.disc.label) && /20% off mausoleum crypt \(Row E\/F\/G\)/.test(on.disc.label), on.disc.label);
  ok('blended propDiscPct is reported, not a single rate',
     on.disc.propDiscPct > 10 && on.disc.propDiscPct < 20, on.disc.propDiscPct);

  const noMaus = await page.evaluate(() => __T.build({ garden: true, mode: 'promo_burial' }));
  ok('chip hidden when there is no mausoleum line', noMaus.efgVisible === false, noMaus.efgVisible);
}

// ── 5. O&C stacking, capped at the O&C actually quoted ────────────────────
console.log('\n5. O&C stacking caps at the actual fee');
{
  // Burial: Standard Burial Arrangement adds a Lawn Interment O&C well under $1,000.
  const r = await page.evaluate(() => __T.build({ garden: true, mode: 'promo_burial', check: ['qBurialArrange'] }));
  const ocActual = await page.evaluate(() => (window._cemLines || [])
    .filter(l => !l.isDiscount && /Interment|Entombment/i.test(l.label) && !/ECF|Inurn|Recording/i.test(l.label))
    .reduce((a, l) => a + l.amount, 0));
  ok('an interment O&C is on the quote', ocActual > 0, ocActual);
  ok('O&C discount is capped at the actual fee, not $1,000', near(r.disc.ocDiscAmount, Math.min(1000, ocActual)), { oc: r.disc.ocDiscAmount, actual: ocActual });
  ok('total discount = property + capped O&C', near(-r.disc.amount, r.spaceSum * 0.10 + Math.min(1000, ocActual)), r.disc);
  ok('label names the burial O&C', /Burial O&C/.test(r.disc.label), r.disc.label);
  ok('no cremation O&C component', !r.disc.inurnDiscAmount, r.disc.inurnDiscAmount);

  // Cremation: glass-front niche arrangement adds a Niche Inurnment O&C.
  const c = await page.evaluate(() => __T.build({ niche: 10000, mode: 'promo_crem', check: ['qNicheGlass'] }));
  const inActual = await page.evaluate(() => (window._cemLines || [])
    .filter(l => !l.isDiscount && /Inurnment/i.test(l.label) && !/ECF|Recording/i.test(l.label))
    .reduce((a, l) => a + l.amount, 0));
  ok('an inurnment O&C is on the quote', inActual > 0, inActual);
  ok('cremation O&C discount capped at min($500, actual)', near(c.disc.inurnDiscAmount, Math.min(500, inActual)), { d: c.disc.inurnDiscAmount, actual: inActual });
  ok('total = 20% property + capped O&C', near(-c.disc.amount, 2000 + Math.min(500, inActual)), c.disc);
  ok('label names the cremation O&C', /Cremation O&C/.test(c.disc.label), c.disc.label);

  // Two spaces: the cap scales per space.
  const two = await page.evaluate(() => __T.build({ garden: true, gardenQty: 2, mode: 'promo_burial', check: ['qBurialArrange'] }));
  const ocTwo = await page.evaluate(() => (window._cemLines || [])
    .filter(l => !l.isDiscount && /Interment|Entombment/i.test(l.label) && !/ECF|Inurn|Recording/i.test(l.label))
    .reduce((a, l) => a + l.amount, 0));
  ok('two spaces: cap is $1,000 x 2, still capped at actual', near(two.disc.ocDiscAmount, Math.min(2000, ocTwo)), { d: two.disc.ocDiscAmount, actual: ocTwo });
}

// ── 6. Property-only mode takes no O&C ────────────────────────────────────
console.log('\n6. Property-only mode');
{
  const r = await page.evaluate(() => __T.build({ garden: true, mode: 'promo_property', check: ['qBurialArrange'] }));
  ok('no O&C component', !r.disc.ocDiscAmount && !r.disc.inurnDiscAmount, r.disc);
  ok('property only, at the burial rate', near(-r.disc.amount, r.spaceSum * 0.10), { amt: r.disc.amount, space: r.spaceSum });

  const n = await page.evaluate(() => __T.build({ niche: 10000, mode: 'promo_property' }));
  ok('a niche under property-only takes the 20% cremation rate', near(-n.disc.amount, 2000), n.disc);
}

// ── 7. ECF is never discounted ────────────────────────────────────────────
console.log('\n7. ECF is never discounted');
{
  const noPromo = await page.evaluate(() => __T.build({ garden: true, maus: 20000 }));
  const promo   = await page.evaluate(() => __T.build({ garden: true, maus: 20000, mode: 'promo_burial', efg: true }));
  ok('the ECF lines are identical with and without the promo', near(noPromo.ecfSum, promo.ecfSum) && promo.ecfSum > 0, { a: noPromo.ecfSum, b: promo.ecfSum });
  ok('the discount base excludes ECF entirely',
     near(-promo.disc.amount, (promo.spaceSum - 20000) * 0.10 + 20000 * 0.20), { amt: promo.disc.amount, space: promo.spaceSum, ecf: promo.ecfSum });
}

// ── 8. Family 45-Day Certificate is untouched ─────────────────────────────
console.log('\n8. Family 45-Day Certificate untouched');
{
  const r = await page.evaluate(() => __T.build({ garden: true, maus: 20000, mode: 'promo_family45', check: ['q2ndRight', 'qBurialArrange'] }));
  ok('still 15% of property', near(-r.disc.amount, r.spaceSum * 0.15), { amt: r.disc.amount, space: r.spaceSum });
  ok('still excludes rights', !near(-r.disc.amount, (r.spaceSum + r.rightsSum) * 0.15), -r.disc.amount);
  ok('still no O&C component', !r.disc.ocDiscAmount && !r.disc.inurnDiscAmount, r.disc);
  ok('label unchanged', r.disc.label === '15% off pre-need property — Family 45-Day Certificate', r.disc.label);
  ok('propDiscPct is 15', r.disc.propDiscPct === 15, r.disc.propDiscPct);
  ok('the E/F/G chip is never offered on the certificate', r.efgVisible === false, r.efgVisible);
}

// ── 9. A quote saved under an earlier month's promo still loads ──────────
console.log('\n9. A quote saved under an earlier promo still loads');
{
  const r = await page.evaluate(async () => {
    __T.reset();
    document.getElementById('qGarden').value = __T.firstGarden();
    // Both persisted shapes: the object form captureDiscountRows() writes today, and the
    // legacy plain-string form restoreDiscountRows() still accepts.
    restoreDiscountRows('cemDiscountList', [{ 'disc-mode': 'promo_burial', 'disc-amt': '', 'disc-note': '' }]);
    cemUpdate();
    await new Promise(r => setTimeout(r, 60));
    const objForm = (window._cemLines || []).find(l => l.isDiscount);
    document.getElementById('cemDiscountList').innerHTML = '';
    restoreDiscountRows('cemDiscountList', ['promo_crem']);
    cemUpdate();
    await new Promise(r => setTimeout(r, 60));
    const strForm = (window._cemLines || []).find(l => l.isDiscount);
    return {
      objMode: document.querySelector('#cemDiscountList .disc-mode') ? 'ok' : 'missing',
      objForm, strForm,
      efgPresent: !!document.querySelector('#cemDiscountList .disc-efg'),
    };
  });
  ok('an object-form saved promo row rebuilds and prices', !!r.objForm && r.objForm.amount < 0, r.objForm);
  ok('it recomputes at the September burial rate (10%)', r.objForm.propDiscPct === 10, r.objForm.propDiscPct);
  ok('a legacy string-form saved promo row rebuilds and prices', !!r.strForm && r.strForm.amount < 0, r.strForm);
  ok('it recomputes at the September cremation rate (20%)', r.strForm.propDiscPct === 20, r.strForm.propDiscPct);
  ok('the restored row carries the new E/F/G control', r.efgPresent === true, r.efgPresent);
}

// ── 10. The E/F/G choice survives save/restore ────────────────────────────
console.log('\n10. The E/F/G choice round-trips through a saved quote');
{
  const r = await page.evaluate(async () => {
    await __T.build({ garden: true, maus: 20000, mode: 'promo_burial', efg: true });
    const rows = captureDiscountRows('cemDiscountList');
    document.getElementById('cemDiscountList').innerHTML = '';
    restoreDiscountRows('cemDiscountList', rows);
    cemUpdate();
    await new Promise(r => setTimeout(r, 60));
    return { rows, disc: (window._cemLines || []).find(l => l.isDiscount) };
  });
  ok('the checkbox is captured', r.rows[0]['disc-efg'] === true, r.rows[0]);
  ok('and restored, so the 20% row rate survives', /Row E\/F\/G/.test(r.disc.label), r.disc.label);
}

// ── 11. The September banner text ─────────────────────────────────────────
console.log('\n11. September banner, financing note and discount options');
{
  const t = await page.evaluate(async () => {
    await __T.build({ garden: true, mode: 'promo_burial' });
    const sel = document.querySelector('#cemDiscountList .disc-mode');
    return {
      banner: document.getElementById('aprilPromoNote').innerText,
      fin: document.getElementById('cemFinancingPanel').innerText,
      optgroups: [...sel.querySelectorAll('optgroup')].map(o => o.label),
      options: [...sel.options].map(o => o.value + '\u0000' + o.text),
      cmpOptions: [...document.getElementById('cmpB_discType').options].map(o => o.value + '\u0000' + o.text),
    };
  });
  ok('banner says September 2026', /September 2026 Pre-Need Sales Incentives/.test(t.banner), t.banner.slice(0, 80));
  ok('banner has no "August" or "July"', !/August|July/.test(t.banner), t.banner);
  ok('all six incentive bullets', ['10% off Burial Property', '20% off Select Mausoleum Rows: E, F & G',
      '20% off Cremation Property', '0% Financing for 60 Months with 10% Down',
      '$1,000 off Burial Opening & Closing', '$500 off Cremation Opening & Closing']
      .every(s => t.banner.indexOf(s) !== -1), t.banner);
  ok('the standing rules are stated', /only applicable to purchases of new Pre-Need property/.test(t.banner) && /ECF must always be paid in full/.test(t.banner), t.banner);
  ok('SECOND RIGHTS exclusion is explicit on the note',
     /Second Rights are NOT included in any property discount/.test(t.banner), t.banner);
  ok('valid through September 30, 2026', /Valid through September 30, 2026/.test(t.banner), t.banner);
  ok('financing note relabelled September', /September Special/.test(t.fin) && /Valid through September 30, 2026/.test(t.fin) && !/August|July/.test(t.fin), t.fin.slice(0, 200));
  ok('the discount optgroup is labelled September 2026', t.optgroups.some(l => /September 2026 Incentives/.test(l)), t.optgroups);
  ok('a Veteran optgroup exists', t.optgroups.some(l => /Veteran/.test(l)), t.optgroups);
  ok('no discount option still says "August"', !t.options.some(o => /August/.test(o)), t.options.filter(o => /August/.test(o)));
  ok('the three incentive modes keep their persisted ids',
     ['promo_burial', 'promo_crem', 'promo_property'].every(v => t.options.some(o => o.split('\u0000')[0] === v)), t.options);
  ok('all three are relabelled September',
     t.options.filter(o => /^promo_(burial|crem|property)\u0000/.test(o)).every(o => /September Incentive/.test(o)), t.options);
  ok('the veteran mode is offered, with its DD-214 requirement in the label',
     t.options.some(o => /^promo_veteran\u0000Veteran Space Credit — \$5,995 off one space \(DD-214 required\)$/.test(o)), t.options);
  ok('compare Option B is relabelled September too', !t.cmpOptions.some(o => /August/.test(o))
     && t.cmpOptions.filter(o => /^promo_(burial|crem|property)\u0000/.test(o)).every(o => /September Incentive/.test(o)), t.cmpOptions);
  ok('compare Option B offers the veteran mode',
     t.cmpOptions.some(o => /^promo_veteran\u0000Veteran Space Credit/.test(o)), t.cmpOptions);
}

// ══════════════════════════════════════════════════════════════════════════
// VETERAN SPACE CREDIT
// ══════════════════════════════════════════════════════════════════════════

// ── 12. $5,995 off one space, capped at that space's price ────────────────
console.log('\n12. Veteran Space Credit — $5,995 against one space');
{
  // Garden 16 – Sunset Garden, $9,995: a space worth more than the credit.
  const r = await page.evaluate(() => __T.build({ garden: true, gardenKey: '16', mode: 'promo_veteran' }));
  const price = await page.evaluate(() => __T.gardenPrice('16'));
  ok('the fixture space really is $9,995', price === 9995, price);
  ok('a credit line was produced', !!r.disc, r.labels);
  ok('the credit is exactly $5,995', near(-r.disc.amount, 5995), r.disc);
  ok('not the whole space', -r.disc.amount < price, { amt: -r.disc.amount, price });
  ok('label names the credit and the amount', /^Veteran Space Credit — \$5,995 off one space \(/.test(r.disc.label), r.disc.label);
  ok('no property percentage is claimed', r.disc.propDiscPct === null, r.disc.propDiscPct);
  ok('the structured veteran amount is carried on the line', near(r.disc.vetCreditAmount, 5995), r.disc.vetCreditAmount);
  ok('no O&C component', !r.disc.ocDiscAmount && !r.disc.inurnDiscAmount, r.disc);
  ok('it counts as a property discount for the commission worksheet',
     near(r.disc.propertyDiscPortion, 5995), r.disc.propertyDiscPortion);
  ok('the September incentive note is NOT raised by a veteran row on its own', r.noteVisible === false, r.noteVisible);

  // Veterans Garden, $5,995 exactly: the credit is the whole space, never more.
  const v = await page.evaluate(() => __T.build({ garden: true, gardenKey: 'vets', mode: 'promo_veteran' }));
  const vPrice = await page.evaluate(() => __T.gardenPrice('vets'));
  ok('the Veterans Garden space is $5,995', vPrice === 5995, vPrice);
  ok('credit is $5,995 — the entire space', near(-v.disc.amount, 5995), v.disc);
  ok('and never more than the space', -v.disc.amount <= vPrice, { amt: -v.disc.amount, price: vPrice });

  // Garden of Verses, $325: cheaper than the credit, so the credit is capped at the space.
  const c = await page.evaluate(() => __T.build({ garden: true, gardenKey: 'verses_burial', mode: 'promo_veteran' }));
  const cPrice = await page.evaluate(() => __T.gardenPrice('verses_burial'));
  ok('the fixture space is $325', cPrice === 325, cPrice);
  ok('credit is capped at the price of the one space', near(-c.disc.amount, 325), c.disc);
  ok('the label reports the capped amount, not $5,995', /\$325 off one space/.test(c.disc.label), c.disc.label);
  ok('the total never goes negative from the credit', c.total > 0, c.total);
}

// ── 13. Niche only, crypt only, and the highest-priced space wins ─────────
console.log('\n13. Niche, crypt, and picking the highest-priced single space');
{
  const n = await page.evaluate(() => __T.build({ niche: 10000, mode: 'promo_veteran' }));
  ok('a niche alone earns the credit', near(-n.disc.amount, 5995), n.disc);
  ok('the niche ECF is untouched', near(n.ecfSum, 1000), n.ecfSum);

  const nSmall = await page.evaluate(() => __T.build({ niche: 4000, mode: 'promo_veteran' }));
  ok('a $4,000 niche caps the credit at $4,000', near(-nSmall.disc.amount, 4000), nSmall.disc);

  const m = await page.evaluate(() => __T.build({ maus: 20000, mode: 'promo_veteran' }));
  ok('a crypt alone earns the credit', near(-m.disc.amount, 5995), m.disc);
  ok('the E/F/G chip is never offered on a veteran row', m.efgVisible === false, m.efgVisible);

  // Several kinds present, all cheaper than the credit: the HIGHEST-priced one is credited,
  // and only one of them — this is the assertion that would catch a sum-of-spaces bug.
  const mix = await page.evaluate(() => __T.build({ garden: true, gardenKey: 'verses_burial', niche: 1500, maus: 2500, mode: 'promo_veteran' }));
  ok('the highest-priced single space is credited', near(-mix.disc.amount, 2500), mix.disc);
  ok('and NOT the sum of the three spaces', !near(-mix.disc.amount, 325 + 1500 + 2500), -mix.disc.amount);

  // Quantity is deliberately ignored: one credit is one veteran, one space.
  const two = await page.evaluate(() => __T.build({ garden: true, gardenKey: '16', gardenQty: 2, mode: 'promo_veteran' }));
  ok('two spaces still earn ONE credit', near(-two.disc.amount, 5995), two.disc);

  // A space the family already owns is not on the quote and cannot be credited.
  const owned = await page.evaluate(() => __T.build({ garden: true, gardenKey: '16', mode: 'promo_veteran', own: ['qSpaceOwned'] }));
  ok('an already-owned space earns no credit', !owned.disc, owned.disc);
}

// ── 14. The credit never touches ECF, O&C, merchandise or 2nd rights ──────
console.log('\n14. What the credit must never touch');
{
  const base = await page.evaluate(() => __T.build({ garden: true, gardenKey: '16', check: ['q2ndRight', 'qBurialArrange'] }));
  const vet  = await page.evaluate(() => __T.build({ garden: true, gardenKey: '16', mode: 'promo_veteran', check: ['q2ndRight', 'qBurialArrange'] }));
  ok('the fixture carries a 2nd right', vet.rightsSum > 0, vet.rightsSum);
  ok('the fixture carries an O&C charge', vet.burialOC > 0, vet.burialOC);
  ok('the fixture carries taxable merchandise', vet.merchSum > 0, vet.merchSum);
  ok('the credit is still exactly $5,995 with all of it present', near(-vet.disc.amount, 5995), vet.disc);
  ok('ECF is identical with and without the credit', near(base.ecfSum, vet.ecfSum) && vet.ecfSum > 0, { a: base.ecfSum, b: vet.ecfSum });
  ok('the O&C lines are identical', near(base.burialOC, vet.burialOC), { a: base.burialOC, b: vet.burialOC });
  ok('the merchandise lines are identical', near(base.merchSum, vet.merchSum), { a: base.merchSum, b: vet.merchSum });
  ok('the 2nd-right lines are identical', near(base.rightsSum, vet.rightsSum), { a: base.rightsSum, b: vet.rightsSum });
  ok('the whole quote drops by exactly the credit', near(base.total - vet.total, 5995), { base: base.total, vet: vet.total });
}

// ── 15. DD-214 attestation ────────────────────────────────────────────────
console.log('\n15. DD-214 attestation chip');
{
  const off = await page.evaluate(() => __T.build({ garden: true, gardenKey: '16', mode: 'promo_veteran' }));
  ok('the chip is shown on a veteran row', off.ddVisible === true, off.ddVisible);
  ok('unchecked: the red "DD-214 required" hint is shown', off.ddHintVisible === true, off.ddHintVisible);
  ok('unchecked: the printed line reads "(DD-214 required)"', /\(DD-214 required\)$/.test(off.disc.label), off.disc.label);
  ok('unchecked: the credit still computes', near(-off.disc.amount, 5995), off.disc);

  const on = await page.evaluate(() => __T.build({ garden: true, gardenKey: '16', mode: 'promo_veteran', dd214: true }));
  ok('checked: the hint is gone', on.ddHintVisible === false, on.ddHintVisible);
  ok('checked: the chip is marked attested', on.ddOnClass === true, on.ddOnClass);
  ok('checked: the printed line reads "(DD-214 on file)"', /\(DD-214 on file\)$/.test(on.disc.label), on.disc.label);
  ok('checked: the customer-facing label is the one the sheet specifies',
     on.disc.label === 'Veteran Space Credit — $5,995 off one space (DD-214 on file)', on.disc.label);
  ok('checking the box does not change the money', near(off.disc.amount, on.disc.amount), { a: off.disc.amount, b: on.disc.amount });

  const other = await page.evaluate(() => __T.build({ garden: true, mode: 'promo_burial' }));
  ok('the chip is hidden on a non-veteran row', other.ddVisible === false, other.ddVisible);
  ok('and so is the hint', other.ddHintVisible === false, other.ddHintVisible);
}

// ── 16. Save → reload restores the mode AND the DD-214 flag ───────────────
console.log('\n16. A saved veteran row round-trips through the quote store');
{
  const r = await page.evaluate(async () => {
    await __T.build({ garden: true, gardenKey: '16', mode: 'promo_veteran', dd214: true });
    // Exactly what captureCemState() persists for the discount panel, and exactly what a
    // reload feeds back in. Fake Firebase only — nothing here writes to production.
    const rows = captureDiscountRows('cemDiscountList');
    document.getElementById('cemDiscountList').innerHTML = '';
    cemUpdate();
    await new Promise(r => setTimeout(r, 60));
    const cleared = (window._cemLines || []).find(l => l.isDiscount) || null;
    restoreDiscountRows('cemDiscountList', rows);
    cemUpdate();
    await new Promise(r => setTimeout(r, 60));
    const row = document.querySelector('#cemDiscountList .disc-row');
    return {
      rows, cleared,
      mode: row.querySelector('.disc-mode').value,
      dd: (row.querySelector('.disc-dd214') || {}).checked === true,
      hint: (row.querySelector('.disc-dd214-hint') || { style: {} }).style.display,
      disc: (window._cemLines || []).find(l => l.isDiscount) || null,
    };
  });
  ok('the mode is captured', r.rows[0]['disc-mode'] === 'promo_veteran', r.rows[0]);
  ok('the DD-214 flag is captured', r.rows[0]['disc-dd214'] === true, r.rows[0]);
  ok('clearing the panel really did drop the credit first', r.cleared === null, r.cleared);
  ok('the restored row carries the veteran mode', r.mode === 'promo_veteran', r.mode);
  ok('the restored row brings the DD-214 flag back', r.dd === true, r.dd);
  ok('so the hint stays hidden after the reload', r.hint === 'none', r.hint);
  ok('and the credit reprices to $5,995', near(-r.disc.amount, 5995), r.disc);
  ok('with the attested label', /\(DD-214 on file\)$/.test(r.disc.label), r.disc.label);

  // An unattested row round-trips as unattested — the flag is not defaulted on.
  const u = await page.evaluate(async () => {
    await __T.build({ garden: true, gardenKey: '16', mode: 'promo_veteran' });
    const rows = captureDiscountRows('cemDiscountList');
    document.getElementById('cemDiscountList').innerHTML = '';
    restoreDiscountRows('cemDiscountList', rows);
    cemUpdate();
    await new Promise(r => setTimeout(r, 60));
    return {
      dd: (document.querySelector('#cemDiscountList .disc-dd214') || {}).checked === true,
      disc: (window._cemLines || []).find(l => l.isDiscount) || null,
    };
  });
  ok('an unattested row is captured as unattested', u.dd === false, u.dd);
  ok('and restores reading "(DD-214 required)"', /\(DD-214 required\)$/.test(u.disc.label), u.disc.label);
}

// ── 17. At-Need ───────────────────────────────────────────────────────────
console.log('\n17. The credit works on an At-Need quote');
{
  const r = await page.evaluate(() => __T.build({ atneed: true, garden: true, gardenKey: '16', mode: 'promo_veteran', dd214: true, check: ['qBurialArrange'] }));
  ok('the quote really is At-Need', r.quoteType === 'atneed', r.quoteType);
  ok('the Discounts panel is available at At-Need', r.discPanelVisible === true, r.discPanelVisible);
  ok('the credit is $5,995 at At-Need too', near(-r.disc.amount, 5995), r.disc);
  ok('the September Pre-Need note is not shown on an At-Need quote', r.noteVisible === false, r.noteVisible);
  ok('the commission worksheet sees it as a property discount',
     near(r.propTotal, r.spaceSum - 5995), { propTotal: r.propTotal, space: r.spaceSum });

  // The monthly incentives are still Pre-Need only: switching to At-Need drops such a row.
  const dropped = await page.evaluate(async () => {
    await __T.build({ garden: true, mode: 'promo_burial' });
    const before = document.querySelectorAll('#cemDiscountList .disc-row').length;
    const an = document.getElementById('cemTypeAN');
    an.checked = true; cemQuoteTypeChange();
    await new Promise(r => setTimeout(r, 60));
    return { before, after: document.querySelectorAll('#cemDiscountList .disc-row').length };
  });
  ok('a monthly-incentive row is dropped when the quote turns At-Need',
     dropped.before === 1 && dropped.after === 0, dropped);

  const kept = await page.evaluate(async () => {
    await __T.build({ garden: true, gardenKey: '16', mode: 'promo_veteran', dd214: true });
    const an = document.getElementById('cemTypeAN');
    an.checked = true; cemQuoteTypeChange();
    await new Promise(r => setTimeout(r, 80));
    const row = document.querySelector('#cemDiscountList .disc-row');
    return {
      rows: document.querySelectorAll('#cemDiscountList .disc-row').length,
      mode: row ? row.querySelector('.disc-mode').value : null,
      dd: row ? (row.querySelector('.disc-dd214') || {}).checked === true : null,
      disc: (window._cemLines || []).find(l => l.isDiscount) || null,
    };
  });
  ok('a veteran row SURVIVES the switch to At-Need', kept.rows === 1 && kept.mode === 'promo_veteran', kept);
  ok('with its DD-214 attestation intact', kept.dd === true, kept.dd);
  ok('and it is still priced', !!kept.disc && near(-kept.disc.amount, 5995), kept.disc);
}

// ── 18. It does not combine with the monthly incentive — warn, not block ──
console.log('\n18. Veteran + monthly incentive raises a warning');
{
  const r = await page.evaluate(async () => {
    await __T.build({ garden: true, gardenKey: '16', mode: 'promo_burial' });
    addCemDiscount();
    const rows = document.querySelectorAll('#cemDiscountList .disc-row');
    const row = rows[rows.length - 1];
    row.querySelector('.disc-mode').value = 'promo_veteran';
    cemDiscModeChange(row.querySelector('.disc-mode'));
    cemUpdate();
    await new Promise(r => setTimeout(r, 60));
    const warn = document.getElementById('cemVetPromoWarn');
    const discs = (window._cemLines || []).filter(l => l.isDiscount);
    return { visible: warn.style.display === 'block', text: warn.textContent, discs };
  });
  ok('the warning is shown', r.visible === true, r.text);
  ok('it names the conflict', /does not combine/i.test(r.text) && /Veteran Space Credit/.test(r.text), r.text);
  ok('but nothing is blocked — both discounts still price', r.discs.length === 2, r.discs.map(d => d.label));
  ok('the veteran credit is still $5,995', r.discs.some(d => near(-d.amount, 5995)), r.discs);

  const solo = await page.evaluate(() => __T.build({ garden: true, gardenKey: '16', mode: 'promo_veteran' }));
  ok('a veteran row alone raises no warning', solo.warnVisible === false, solo.warnText);
  const promoSolo = await page.evaluate(() => __T.build({ garden: true, mode: 'promo_burial' }));
  ok('an incentive row alone raises no warning', promoSolo.warnVisible === false, promoSolo.warnText);

  const anWarn = await page.evaluate(() => __T.build({ atneed: true, garden: true, mode: 'promo_burial' }));
  ok('a monthly incentive added on an At-Need quote is flagged as ineligible',
     anWarn.warnVisible === true && /At-Need property is not eligible/.test(anWarn.warnText), anWarn.warnText);
}

// ── 19. Compare Option B, and the RIC's compact label ────────────────────
console.log('\n19. Compare Option B + the RIC contract label');
{
  const b = await page.evaluate(async () => {
    const out = {};
    const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; } };
    const g = document.getElementById('cmpB_garden');
    const opt = [...g.options].find(o => (o.value || '').split('|')[0] === '16');
    out.optPrice = opt ? parseFloat(opt.value.split('|')[1]) : 0;
    g.value = opt.value;
    ['cmpB_niche', 'cmpB_maus'].forEach(id => set(id, ''));
    const mir = document.getElementById('cmpB_mirror'); if (mir) mir.checked = false;
    const own = document.getElementById('cmpB_spaceOwned'); if (own) own.checked = false;
    set('cmpB_discType', 'promo_veteran');
    const res = calcBTotal();
    out.disc = res.lines.filter(l => l.isDiscount).map(l => ({ label: l.label, amount: l.amount }));

    // Cheap space: the credit caps at the space price on the compare side too.
    const cheap = [...g.options].find(o => (o.value || '').split('|')[0] === 'rose_urn');
    g.value = cheap.value;
    out.cheapPrice = parseFloat(cheap.value.split('|')[1]);
    out.cheapDisc = calcBTotal().lines.filter(l => l.isDiscount).map(l => ({ label: l.label, amount: l.amount }));

    // Owned space: nothing to credit.
    g.value = opt.value;
    if (own) own.checked = true;
    out.ownedDisc = calcBTotal().lines.filter(l => l.isDiscount).length;
    if (own) own.checked = false;
    set('cmpB_discType', '');
    calcBTotal();
    return out;
  });
  ok('Option B has the $9,995 garden', b.optPrice === 9995, b.optPrice);
  ok('Option B credits $5,995', b.disc.length === 1 && near(-b.disc[0].amount, 5995), b.disc);
  ok('with a label a family can read', b.disc.length === 1 && /^Veteran Space Credit — \$5,995 off one space$/.test(b.disc[0].label), b.disc);
  ok('Option B caps the credit at a cheaper space', b.cheapDisc.length === 1 && near(-b.cheapDisc[0].amount, b.cheapPrice), b.cheapDisc);
  ok('Option B credits nothing on an already-owned space', b.ownedDisc === 0, b.ownedDisc);

  // The RIC's compactDiscLabel is a closure inside generateRICContractCore, so it is lifted
  // out of the function source and exercised directly. Read-only: no contract is generated.
  const ric = await page.evaluate(() => {
    const src = generateRICContractCore.toString();
    const i = src.indexOf('function compactDiscLabel');
    let depth = 0, end = i;
    for (let k = src.indexOf('{', i); k < src.length; k++) {
      if (src[k] === '{') depth++;
      else if (src[k] === '}') { depth--; if (!depth) { end = k; break; } }
    }
    const fn = new Function('sanitizeForPdf', src.slice(i, end + 1) + '\nreturn compactDiscLabel;')(s => s);
    return {
      vet:  fn({ vetCreditAmount: 5995, propDiscPct: null, label: 'Veteran Space Credit — $5,995 off one space (DD-214 on file)' }),
      capped: fn({ vetCreditAmount: 325, propDiscPct: null, label: 'Veteran Space Credit — $325 off one space (DD-214 required)' }),
      promo: fn({ propDiscPct: 10, ocDiscAmount: 1000, inurnDiscAmount: 0, label: '10% off burial property + −$1,000 Burial O&C' }),
      plain: fn({ label: 'Courtesy Discount' }),
      noField: fn({ label: 'Veteran Space Credit — $5,995 off one space (DD-214 on file)' }),
    };
  });
  ok('the RIC label names the veteran credit and its amount', ric.vet === 'Veteran Credit $5,995', ric.vet);
  ok('and fits the RIC field (28 chars)', ric.vet.length <= 28, ric.vet.length);
  ok('a capped credit reports its real amount', ric.capped === 'Veteran Credit $325', ric.capped);
  ok('the monthly-incentive label is unchanged', ric.promo === '10% Prop Disc + $1k O/C Disc', ric.promo);
  ok('a plain discount label is unchanged', ric.plain === 'Courtesy Discount', ric.plain);
  ok('without the structured field the 28-char fallback would truncate mid-number — which is why it exists',
     /^Veteran Space Credit/.test(ric.noField) && ric.noField.length === 28 && !/5,995/.test(ric.noField), ric.noField);
}

ok('no page errors', errs.length === 0, errs);

await ctx.close();
await browser.close();
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
