// August 2026 pre-need incentives — the promo discount math in cemUpdate().
//
// What changed from July 2026 (and therefore what these assertions pin):
//   • the property rate is no longer one flat 10%. Burial property is 10%, cremation
//     property is 20%, and a mausoleum crypt in Rows E/F/G is 20% (counselor opt-in,
//     because the builder does not know a crypt's row).
//   • additional (2nd/3rd) interment rights are NO LONGER discounted. July folded them
//     into the same 10% base.
//   • O&C stacking is unchanged: -$1,000/space burial and -$500/space cremation, each
//     capped at the O&C actually quoted.
//   • ECF is never in the discount base, on any promo, and its own line never moves.
//   • the Family 45-Day Certificate (promo_family45) is untouched at 15%, no O&C.
//
// The internal mode ids (promo_burial / promo_crem / promo_property) are deliberately
// unchanged — they are persisted inside saved quotes. A saved July-promo quote therefore
// reloads as an August-promo quote and recomputes at August rates; the last block proves
// it loads without error rather than asserting a July number that no longer exists.
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
      async build(s) {
        this.reset();
        if (s.garden) {
          const g = document.getElementById('qGarden');
          g.value = this.firstGarden();
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
        }
        cemUpdate();
        await new Promise(r => setTimeout(r, 60));
        cemUpdate(); // second pass: the E/F/G chip's visibility is settled by the first
        await new Promise(r => setTimeout(r, 60));
        const lines = (window._cemLines || []).map(l => ({ ...l }));
        const disc = lines.find(l => l.isDiscount) || null;
        const sum = re => lines.filter(l => !l.isDiscount && re.test(l.label)).reduce((a, l) => a + l.amount, 0);
        const row = document.querySelector('#cemDiscountList .disc-row');
        const wrap = row ? row.querySelector('.disc-efg-wrap') : null;
        return {
          disc,
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

// ── 9. A saved July-promo quote still loads ───────────────────────────────
console.log('\n9. A quote saved under the July promo still loads');
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
  ok('it recomputes at the August burial rate (10%)', r.objForm.propDiscPct === 10, r.objForm.propDiscPct);
  ok('a legacy string-form saved promo row rebuilds and prices', !!r.strForm && r.strForm.amount < 0, r.strForm);
  ok('it recomputes at the August cremation rate (20%)', r.strForm.propDiscPct === 20, r.strForm.propDiscPct);
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

// ── 11. The August banner text ────────────────────────────────────────────
console.log('\n11. August banner and financing note');
{
  const t = await page.evaluate(() => ({
    banner: document.getElementById('aprilPromoNote').innerText,
    fin: document.getElementById('cemFinancingPanel').innerText,
    optgroups: [...document.querySelectorAll('#cemDiscountList optgroup')].map(o => o.label),
  }));
  ok('banner says August 2026', /August 2026 Pre-Need Sales Incentives/.test(t.banner), t.banner.slice(0, 80));
  ok('banner has no "July"', !/July/.test(t.banner), t.banner);
  ok('all six incentive bullets', ['10% off Burial Property', '20% off Select Mausoleum Rows: E, F & G',
      '20% off Cremation Property', '0% Financing for 60 Months with 10% Down',
      '$1,000 off Burial Opening & Closing', '$500 off Cremation Opening & Closing']
      .every(s => t.banner.indexOf(s) !== -1), t.banner);
  ok('the two standing rules are stated', /only applicable to purchases of new Pre-Need property/.test(t.banner) && /ECF must always be paid in full/.test(t.banner), t.banner);
  ok('valid through August 31, 2026', /Valid through August 31, 2026/.test(t.banner), t.banner);
  ok('financing note relabelled August', /August Special/.test(t.fin) && /Valid through August 31, 2026/.test(t.fin) && !/July/.test(t.fin), t.fin.slice(0, 200));
  ok('the discount optgroup is labelled August 2026', t.optgroups.some(l => /August 2026 Incentives/.test(l)), t.optgroups);
}

ok('no page errors', errs.length === 0, errs);

await ctx.close();
await browser.close();
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
