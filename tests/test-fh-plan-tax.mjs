// FH package rows carry their own Taxable/Exempt picker: an added row (or an edited one) is
// taxed the way it is set, not by a name guess. Fake Firebase only — nothing is saved.
import { chromium } from 'playwright';
import fs from 'fs';
import { BASE } from './_base.mjs';
const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };

const browser = await chromium.launch();
const ctx = await browser.newContext();
await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.addInitScript(FAKE);
await page.addInitScript(`window.__fake.addAccount('t@bwquote.local','pw');`);
await page.goto(BASE, { waitUntil: 'load', timeout: 120000 });
await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('t@bwquote.local', 'pw'));
await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });

const r = await page.evaluate(() => {
  const out = {};
  const rows = () => [...document.querySelectorAll('#fhPlanItems .plan-item-row')];
  const line = lbl => (_fhLines || []).find(l => l.label === lbl);
  show('fh-quote', null);
  resetFHQuote();
  el('fhBurialPlan').value = '7220'; fhPlanChange('burial');
  out.pickers = rows().map(r => [r.querySelector('.pi-label').value, r.querySelector('.pi-tax').value]);
  const total0 = _fhTotal;

  fhAddPlanItem();
  const added = rows().at(-1);
  out.addedDefault = added.querySelector('.pi-tax').value;
  added.querySelector('.pi-label').value = 'Crucifix';
  added.querySelector('.pi-amount').value = '100';
  fhUpdate();
  out.addedTaxable = line('Crucifix')?.taxable;
  const totalTaxed = _fhTotal;
  added.querySelector('.pi-tax').value = 'exempt'; fhUpdate();
  out.addedExempt = line('Crucifix')?.taxable;
  const totalExempt = _fhTotal;
  out.taxOn100 = +(totalTaxed - totalExempt).toFixed(2);
  out.exemptAdds100 = +(totalExempt - total0).toFixed(2);

  // An exempt choice is respected even when the name looks like merchandise
  fhAddPlanItem();
  const u = rows().at(-1);
  u.querySelector('.pi-label').value = 'Urn Upgrade'; u.querySelector('.pi-amount').value = '50';
  u.querySelector('.pi-tax').value = 'exempt'; fhUpdate();
  out.urnExempt = line('Urn Upgrade')?.taxable;
  // And a package service can be switched to taxable
  rows()[0].querySelector('.pi-tax').value = 'taxable'; fhUpdate();
  out.basicTaxable = line('Basic Services of Funeral Director & Staff')?.taxable;

  // Save → reset → restore round trip
  const st = captureFhState();
  out.savedTax = st.planItems.map(i => i.tax);
  const before = { total: _fhTotal, lines: _fhLines.map(l => l.label + '|' + l.taxable) };
  resetFHQuote();
  _bwRestoreFhState(st); fhUpdate();
  out.roundTrip = JSON.stringify(before) === JSON.stringify({ total: _fhTotal, lines: _fhLines.map(l => l.label + '|' + l.taxable) });

  // Old saves (no `tax` field) keep the old behavior
  resetFHQuote();
  _bwRestoreFhState({ activePlanKey: '7220', activePlanType: 'burial', lockedPlanDiscount: 0,
    planItems: [{ label: 'Flower Allowance', amount: '350', taxable: false },
                { label: 'Prayer Cards', amount: '40', taxable: false },
                { label: 'Use of Hearse', amount: '705', taxable: false },
                { label: 'Something Taxed', amount: '10', taxable: true }] });
  fhUpdate();
  out.legacy = rows().map(r => r.querySelector('.pi-tax').value);
  resetFHQuote();
  return out;
});

const want = { 'Simply Treasured Memorial Package': 'taxable', 'Flower Allowance': 'taxable', 'Embalming': 'exempt', 'Use of Hearse': 'exempt' };
ok('every package row has a picker set from the package', Object.entries(want).every(([k, v]) => r.pickers.find(p => p[0] === k)?.[1] === v), r.pickers);
ok('added row defaults to Taxable', r.addedDefault === 'taxable', r.addedDefault);
ok('added row is taxed', r.addedTaxable === true);
ok('switching it to Exempt removes the tax', r.addedExempt === false && r.taxOn100 > 0 && r.exemptAdds100 === 100, r);
ok('Exempt is respected on a merchandise-sounding name', r.urnExempt === false);
ok('a package service can be set Taxable', r.basicTaxable === true);
ok('saves write the setting', r.savedTax.every(t => t === 'taxable' || t === 'exempt'), r.savedTax);
ok('save/restore round trip keeps lines, tax and total', r.roundTrip);
ok('old saves restore as before', JSON.stringify(r.legacy) === JSON.stringify(['taxable', 'taxable', 'exempt', 'taxable']), r.legacy);
ok('no page errors', errs.length === 0, errs);

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
