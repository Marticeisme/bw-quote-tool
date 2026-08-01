// The garden / Burial-and-Urn-Arrangement state machine in cemUpdate().
//
// Centre of gravity: clearing qGarden back to "— None —" while qBurialArrange or
// qUrnArrange is still ticked. The arrangement rows are hidden on that path but the
// checkboxes keep their checked state, so every later cemUpdate() re-enters the
// no-garden branch with a checkbox still on. cemUpdate() is wrapped in a try/catch that
// only console.error()s, so anything thrown there would be invisible to the counselor
// and would freeze the quote at its previous total. These tests assert it does not throw
// and that the quote genuinely recomputes.
//
// `qDeedChange` is the completion sentinel: it pushes its line at index.html:7142, well
// past both arrangement guards, and _cemLines is not assigned until ~7470. A Deed Change
// Fee line in _cemLines therefore proves cemUpdate() ran to the end rather than bailing
// into the catch.
//
// Fake Firebase only — production is never contacted, and nothing here writes.
import { chromium } from 'playwright';
import fs from 'fs';
const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };

async function open(browser) {
  const ctx = await browser.newContext();
  await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
  const page = await ctx.newPage();
  const errs = [];      // any page fault
  const cemErrs = [];   // specifically what cemUpdate()'s catch swallowed
  page.on('pageerror', e => { errs.push(e.message); });
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/Failed to load resource/.test(t)) return;
    if (/cemUpdate error/.test(t)) cemErrs.push(t.slice(0, 200));
    errs.push(t.slice(0, 200));
  });
  await page.addInitScript(FAKE);
  await page.addInitScript(`window.__fake.addAccount('t@bwquote.local','pw');`);
  await page.goto('http://localhost:' + (process.env.PORT || 3737) + '/', { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('t@bwquote.local', 'pw'));
  await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
  await page.waitForTimeout(250);

  // Helpers installed in page scope, shared by every block below.
  await page.evaluate(() => {
    show('cem-quote', null);
    window.__t = {
      gardens: () => {
        const g = document.getElementById('qGarden');
        const vals = [...g.options].map(o => o.value).filter(v => /\|/.test(v));
        return {
          plain: vals.find(v => !/^scatter_/.test(v.split('|')[0])),
          scatter: vals.find(v => /^scatter_/.test(v.split('|')[0])),
        };
      },
      setGarden: (v) => {
        const g = document.getElementById('qGarden');
        g.value = v;
        g.dispatchEvent(new Event('change', { bubbles: true }));
        cemUpdate();
      },
      tick: (id, on) => {
        const c = document.getElementById(id);
        c.checked = on;
        c.dispatchEvent(new Event('change', { bubbles: true }));
        cemUpdate();
      },
      snap: () => {
        const disp = (id) => { const e = document.getElementById(id); return e ? e.textContent.trim() : null; };
        const vis = (id) => { const e = document.getElementById(id); return e ? e.offsetParent !== null : null; };
        return {
          labels: (window._cemLines || []).map(l => l.label),
          total: window._cemTotal,
          burialDisp: disp('qBurialArrangeDisp'),
          urnDisp: disp('qUrnArrangeDisp'),
          secondDisp: disp('q2ndRightDisp'),
          thirdDisp: disp('q3rdRightDisp'),
          burialRow: vis('qBurialArrangeRow'),
          urnRow: vis('qUrnArrangeRow'),
          burialChecked: document.getElementById('qBurialArrange').checked,
          urnChecked: document.getElementById('qUrnArrange').checked,
        };
      },
    };
  });
  return { ctx, page, errs, cemErrs };
}

const BURIAL = ['Monticello Burial Vault', 'Burial Vault Setting', 'Recording Fee', 'Lawn Interment – Single Depth'];
const URN = ['Monticello Urn Vault', 'Cremation Vault Setting', 'Recording Fee', 'Ground Inurnment'];
// For "is it suppressed?" checks, drop Recording Fee: the scattering package quotes a line
// with that exact label, so its presence says nothing about the arrangements.
const BURIAL_ONLY = BURIAL.filter(l => l !== 'Recording Fee');
const URN_ONLY = URN.filter(l => l !== 'Recording Fee');
const has = (labels, needle) => labels.some(l => l.indexOf(needle) === 0);
const SENTINEL = 'Deed Change Fee';

const browser = await chromium.launch();

// ─────────────────────────────────────────────────────────────
console.log('\n1. Baseline: a garden, then the burial arrangement');
{
  const { ctx, page, errs, cemErrs } = await open(browser);
  const r = await page.evaluate(() => {
    const g = __t.gardens();
    const out = { picked: g.plain };
    out.empty = __t.snap();
    __t.setGarden(g.plain);           out.garden = __t.snap();
    __t.tick('qBurialArrange', true); out.ticked = __t.snap();
    return out;
  });
  ok('a non-scatter garden option exists to test with', !!r.picked, r.picked);
  ok('with no garden the quote starts empty', r.empty.labels.length === 0, r.empty.labels);
  ok('and both arrangement rows start hidden', r.empty.burialRow === false && r.empty.urnRow === false, r.empty);
  ok('selecting a garden quotes the space', r.garden.labels.length === 2, r.garden.labels);
  ok('including the ECF line', has(r.garden.labels, 'Endowment Care Fund'), r.garden.labels);
  ok('and reveals the burial arrangement row', r.garden.burialRow === true, r.garden);
  ok('and the urn arrangement row', r.garden.urnRow === true, r.garden);
  ok('ticking the burial arrangement adds its four items', BURIAL.every(l => has(r.ticked.labels, l)), r.ticked.labels);
  ok('the vault at $2,305', r.ticked.labels.length === 6, r.ticked.labels);
  ok('and shows the arrangement subtotal', r.ticked.burialDisp === '$4,760.00', r.ticked.burialDisp);
  ok('no cemUpdate error so far', cemErrs.length === 0, cemErrs);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────
console.log('\n2. THE BUG: clearing the garden with the burial arrangement still ticked');
{
  const { ctx, page, errs, cemErrs } = await open(browser);
  const r = await page.evaluate(() => {
    const g = __t.gardens();
    __t.setGarden(g.plain);
    __t.tick('qBurialArrange', true);
    __t.tick('qDeedChange', true);          // completion sentinel
    const before = __t.snap();
    __t.setGarden('');                      // back to "— None —"
    const cleared = __t.snap();
    cemUpdate(); const again = __t.snap();  // "every subsequent cemUpdate()"
    cemUpdate(); cemUpdate();
    const settled = __t.snap();
    return { before, cleared, again, settled };
  });
  ok('the checkbox stays ticked while its row is hidden',
    r.cleared.burialChecked === true && r.cleared.burialRow === false, r.cleared);
  ok('cemUpdate() does not throw on the cleared-garden path', cemErrs.length === 0, cemErrs);
  ok('it runs to completion — the sentinel line is still quoted', has(r.cleared.labels, SENTINEL), r.cleared.labels);
  ok('the space lines are gone', !has(r.cleared.labels, 'Endowment Care Fund'), r.cleared.labels);
  ok('the burial items are gone with the garden', BURIAL_ONLY.every(l => !has(r.cleared.labels, l)), r.cleared.labels);
  ok('the quote did not freeze at its previous lines',
    r.cleared.labels.join('|') !== r.before.labels.join('|'), { before: r.before.labels, after: r.cleared.labels });
  ok('the total recomputed rather than sticking', r.cleared.total !== r.before.total, { before: r.before.total, after: r.cleared.total });
  ok('the total is just the sentinel fee', Math.abs(r.cleared.total - 325) < 0.005, r.cleared.total);
  ok('the burial subtotal is cleared, not left stale', r.cleared.burialDisp === '—', r.cleared.burialDisp);
  ok('the urn subtotal is cleared', r.cleared.urnDisp === '—', r.cleared.urnDisp);
  ok('the second-right subtotal is cleared', r.cleared.secondDisp === '—', r.cleared.secondDisp);
  ok('the third-right subtotal is cleared', r.cleared.thirdDisp === '—', r.cleared.thirdDisp);
  ok('a second cemUpdate() still does not throw', cemErrs.length === 0, cemErrs);
  ok('and is idempotent', r.again.labels.join('|') === r.cleared.labels.join('|'), { a: r.cleared.labels, b: r.again.labels });
  ok('repeated updates stay stable', r.settled.total === r.cleared.total, { a: r.cleared.total, b: r.settled.total });
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────
console.log('\n3. Same path with the urn arrangement, and with both ticked');
{
  const { ctx, page, errs, cemErrs } = await open(browser);
  const r = await page.evaluate(() => {
    const g = __t.gardens();
    __t.setGarden(g.plain);
    __t.tick('qUrnArrange', true);
    const urnOn = __t.snap();
    __t.setGarden('');
    const urnCleared = __t.snap();
    __t.setGarden(g.plain);
    __t.tick('qBurialArrange', true);
    const both = __t.snap();
    __t.setGarden('');
    const bothCleared = __t.snap();
    return { urnOn, urnCleared, both, bothCleared };
  });
  ok('the urn arrangement adds its four items', URN.every(l => has(r.urnOn.labels, l)), r.urnOn.labels);
  ok('and shows its subtotal', r.urnOn.urnDisp === '$2,730.00', r.urnOn.urnDisp);
  ok('clearing the garden with the urn arrangement ticked does not throw', cemErrs.length === 0, cemErrs);
  ok('the urn items are gone', URN_ONLY.every(l => !has(r.urnCleared.labels, l)), r.urnCleared.labels);
  ok('the urn subtotal is cleared', r.urnCleared.urnDisp === '—', r.urnCleared.urnDisp);
  ok('the urn checkbox is still ticked underneath', r.urnCleared.urnChecked === true, r.urnCleared);
  ok('both arrangements can be quoted together', has(r.both.labels, 'Monticello Burial Vault') && has(r.both.labels, 'Monticello Urn Vault'), r.both.labels);
  ok('clearing with both ticked does not throw', cemErrs.length === 0, cemErrs);
  ok('and empties the quote', r.bothCleared.labels.length === 0, r.bothCleared.labels);
  ok('with both subtotals cleared', r.bothCleared.burialDisp === '—' && r.bothCleared.urnDisp === '—', r.bothCleared);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────
console.log('\n4. Re-selecting a garden restores the arrangement');
{
  const { ctx, page, errs, cemErrs } = await open(browser);
  const r = await page.evaluate(() => {
    const g = __t.gardens();
    __t.setGarden(g.plain);
    __t.tick('qBurialArrange', true);
    const first = __t.snap();
    __t.setGarden('');
    const cleared = __t.snap();
    __t.setGarden(g.plain);
    const back = __t.snap();
    return { first, cleared, back };
  });
  ok('re-selecting the garden re-quotes the space', has(r.back.labels, 'Endowment Care Fund'), r.back.labels);
  ok('the still-ticked arrangement comes back with it', BURIAL.every(l => has(r.back.labels, l)), r.back.labels);
  ok('the row is visible again', r.back.burialRow === true, r.back);
  ok('the subtotal is correct, not stale from before', r.back.burialDisp === '$4,760.00', r.back.burialDisp);
  ok('the quote matches the pre-clear state exactly', r.back.labels.join('|') === r.first.labels.join('|'), { first: r.first.labels, back: r.back.labels });
  ok('and so does the total', Math.abs(r.back.total - r.first.total) < 0.005, { first: r.first.total, back: r.back.total });
  ok('no cemUpdate error across the whole cycle', cemErrs.length === 0, cemErrs);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────
console.log('\n5. Scattering gardens suppress the arrangements');
{
  const { ctx, page, errs, cemErrs } = await open(browser);
  const r = await page.evaluate(() => {
    const g = __t.gardens();
    const out = { hasScatter: !!g.scatter };
    if (!g.scatter) return out;
    __t.setGarden(g.plain);
    __t.tick('qBurialArrange', true);
    __t.tick('qUrnArrange', true);
    __t.setGarden(g.scatter);
    out.scatter = __t.snap();
    __t.setGarden('');
    out.cleared = __t.snap();
    return out;
  });
  ok('a scattering option exists', r.hasScatter, r);
  ok('the arrangement rows are hidden for scattering', r.scatter.burialRow === false && r.scatter.urnRow === false, r.scatter);
  ok('the burial items are suppressed even though ticked', BURIAL_ONLY.every(l => !has(r.scatter.labels, l)), r.scatter.labels);
  ok('the urn items are suppressed too', URN_ONLY.every(l => !has(r.scatter.labels, l)), r.scatter.labels);
  ok('the checkboxes are left ticked underneath', r.scatter.burialChecked && r.scatter.urnChecked, r.scatter);
  ok('the subtotals read as cleared', r.scatter.burialDisp === '—' && r.scatter.urnDisp === '—', r.scatter);
  ok('scattering quotes its own service fee', has(r.scatter.labels, 'Scattering Service Fee'), r.scatter.labels);
  ok('clearing from a scattering garden does not throw', cemErrs.length === 0, cemErrs);
  ok('and empties the quote', r.cleared.labels.length === 0, r.cleared.labels);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────
console.log('\n6. Nothing is written to Firebase by any of this');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(() => {
    window.__fake.clearLog();
    const g = __t.gardens();
    __t.setGarden(g.plain);
    __t.tick('qBurialArrange', true);
    __t.setGarden('');
    cemUpdate();
    return { writes: window.__fake.log().filter(l => !['once', 'signIn', 'signOut'].includes(l.op)) };
  });
  ok('recalculating never touches the database', r.writes.length === 0, r.writes);
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
