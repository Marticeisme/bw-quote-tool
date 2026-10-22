// Ground inurnment opening & closing follows where the urn goes and what it goes in.
//
// Martice, 2026-10-22: "When placing urn and urn vault in the ground they dig the space larger
// and we charge more for the opening and closing, but when using the combo urn vault we've
// always charged less for the opening and closing because the digging is less."
//
//   urn garden (Lake / Rest Haven, Rose, Court of Honor, Garden of Verses)   $875, vault or not
//   lawn space + separate urn vault, or an urn vault setting                 $985
//   lawn space + combination urn vault (the urn is its own vault)            $875
//     (Martice's practice, 10/22/2026; no printed price for this case)
//
// Sprint-09 (2026-07-31) set every ground inurnment to $875, so every lawn space quoted with a
// separate urn vault came out $110 low until a contract (Monticello urn vault, lawn space) was
// caught at contracts. THE CHECK THIS SUITE EXISTS FOR: no cemetery quote may carry a separate
// urn vault in a lawn space together with the $875 ground-inurnment O&C (section 1, and
// bwGroundOCLow on every built quote).
//
// Fake Firebase only; production is never contacted, and nothing here saves or persists.
import { chromium } from 'playwright';
import fs from 'fs';
import { BASE } from './_base.mjs';

const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
const FEES = JSON.parse(fs.readFileSync('data/prices.json', 'utf8')).current.fees;
let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); }
};

const browser = await chromium.launch();
const ctx = await browser.newContext();
await ctx.route(/gstatic\.com\/firebasejs/, (r) => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 200)); });
await page.addInitScript(FAKE);
await page.addInitScript(`window.__fake.addAccount('t@bwquote.local','pw');`);
await page.goto(BASE, { waitUntil: 'load', timeout: 120000 });
await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('t@bwquote.local', 'pw'));
await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
await page.waitForTimeout(250);

// Build one cemetery quote from a clean form and return its lines and the guard's UI state.
async function quote(o) {
  return page.evaluate(async (o) => {
    show('cem-quote', null);
    resetCemQuote();
    vaultItems.length = 0;
    ['qOCGround', 'qOCGroundVault', 'qSettingCrem', 'qUrnArrange'].forEach((id) => { document.getElementById(id).checked = false; });
    document.getElementById('qGarden').value = o.garden || '';
    document.getElementById('qSpaceLocation').value = o.loc || '';
    if (o.vault) { const v = document.getElementById('qVault'); v.value = '935'; v.selectedIndex = [...v.options].findIndex((x) => /Monticello Urn Vault/.test(x.text)); vaultAdd(); }
    if (o.setting) document.getElementById('qSettingCrem').checked = true;
    if (o.combo) document.getElementById('qOCGround').checked = true;
    if (o.sep) document.getElementById('qOCGroundVault').checked = true;
    if (o.arrange) document.getElementById('qUrnArrange').checked = true;
    cemUpdate();
    const L = (_cemLines || []).map((l) => ({ label: l.label, amount: l.amount }));
    const note = document.getElementById('qOCGroundNote');
    return {
      lines: L,
      ground: L.filter((l) => /ground inurnment/i.test(l.label)),
      combo: document.getElementById('qOCGround').checked,
      sep: document.getElementById('qOCGroundVault').checked,
      note: note.style.display === 'none' ? '' : note.textContent,
      uaFee: document.getElementById('qUAItemOCFee').textContent,
      uaDisp: document.getElementById('qUrnArrangeDisp').textContent,
      low: bwGroundOCLow(_cemLines, (document.getElementById('qGarden').value || '').split('|')[0], document.getElementById('qSpaceLocation').value),
    };
  }, o);
}
const LAWN = '18|6995|1050', LAKE = 'lake_urn|5495|825', ROSE = 'rose_urn|4395|660', COH = 'coh_cremorial|4395|660';
const amts = (r) => r.ground.map((l) => l.amount);

console.log('\n0. The two fees');
ok('OC:ground_inurnment_vault is $985 in data/prices.json', FEES['OC:ground_inurnment_vault'] === 985, FEES['OC:ground_inurnment_vault']);
ok('OC:ground_inurnment is $875 in data/prices.json', FEES['OC:ground_inurnment'] === 875, FEES['OC:ground_inurnment']);
ok('the page carries both', await page.evaluate(() => BW_FEES['OC:ground_inurnment_vault'] === 985 && BW_FEES['OC:ground_inurnment'] === 875));

console.log('\n1. Lawn space with a separate urn vault can never quote $875');
{
  let r = await quote({ garden: LAWN, vault: true, combo: true });
  ok('$875 box + Monticello urn vault in Garden 18 quotes $985', amts(r).join() === '985', r.ground);
  ok('the line says Lawn Space, the price list wording', (r.ground[0] || {}).label === 'Ground Inurnment – Lawn Space', r.ground);
  ok('the checkbox moved to the $985 box', r.sep && !r.combo, r);
  ok('and the counselor is told why', /separate urn vault/i.test(r.note), r.note);
  ok('bwGroundOCLow finds nothing on the built quote', r.low === false);
  const later = await page.evaluate(async () => {
    await new Promise((res) => setTimeout(res, 900));   // cemUpdateD's redraw pass
    const panel = document.getElementById('qOCGroundVault').closest('.q-panel');
    const note = document.getElementById('qOCGroundNote');
    return { head: panel.querySelector('.q-panel-header').textContent, note: note.style.display !== 'none' };
  });
  ok('after the redraw the collapsed panel summary says $985', /\$985/.test(later.head) && !/\$875/.test(later.head), later.head);
  ok('and the note is still showing', later.note === true);

  r = await quote({ garden: LAWN, setting: true, combo: true });
  ok('a cremation vault setting alone (vault bought elsewhere) also means $985', amts(r).join() === '985', r.ground);

  r = await quote({ garden: '', loc: '18-227-B-4', vault: true, combo: true });
  ok('no garden picked, lawn location 18-227-B-4 + urn vault: $985', amts(r).join() === '985', r.ground);

  r = await quote({ garden: LAWN, vault: true, sep: true });
  ok('the $985 box with an urn vault stays $985, no note', amts(r).join() === '985' && !r.note, r);
}

console.log('\n2. Combination urn vault in a lawn space stays $875');
{
  const r = await quote({ garden: LAWN, combo: true });
  ok('no vault, no setting: $875', amts(r).join() === '875', r.ground);
  ok('label unchanged ("Ground Inurnment")', (r.ground[0] || {}).label === 'Ground Inurnment', r.ground);
  ok('no note', !r.note, r.note);
}

console.log('\n3. Urn gardens are $875 with or without an urn vault');
for (const [name, g] of [['Lake Urn Garden', LAKE], ['Rose Urn Garden', ROSE], ['Court of Honor', COH]]) {
  let r = await quote({ garden: g, vault: true, combo: true });
  ok(name + ' + urn vault: $875', amts(r).join() === '875', r.ground);
  r = await quote({ garden: g, vault: true, sep: true });
  ok(name + ' + urn vault, $985 box picked: corrected to $875', amts(r).join() === '875' && r.combo && !r.sep, r);
}
{
  const r = await quote({ garden: '', loc: 'Lake Urn Garden, LUG 14', vault: true, combo: true });
  ok('no garden picked, urn-garden location typed: $875', amts(r).join() === '875', r.ground);
}

console.log('\n4. Standard Urn Burial Arrangement (it includes a Monticello urn vault)');
{
  let r = await quote({ garden: LAWN, arrange: true });
  ok('lawn space: the arrangement O&C is $985', amts(r).join() === '985', r.ground);
  ok('the item label shows $985', r.uaFee === '$985', r.uaFee);
  ok('the arrangement total is 935 + 575 + 235 + 985 = $2,730', /2,730/.test(r.uaDisp), r.uaDisp);
  r = await quote({ garden: LAKE, arrange: true });
  ok('Lake Urn Garden: the arrangement O&C is $875', amts(r).join() === '875', r.ground);
  ok('the item label shows $875', r.uaFee === '$875', r.uaFee);
  ok('the arrangement total is $2,620', /2,620/.test(r.uaDisp), r.uaDisp);
}

console.log('\n5. Comparison panel, Standard Urn Burial');
{
  const cmp = async (g) => page.evaluate((g) => {
    document.getElementById('cmpB_garden').value = g;
    document.getElementById('cmpB_stdUrn').checked = true;
    calcBTotal();
    const t = document.getElementById('cmpB_breakdown').textContent;
    const m = /Ground Inurnment[^—]*—\s*\$([\d,]+)/.exec(t);
    return m ? Number(m[1].replace(/,/g, '')) : null;
  }, g);
  ok('lawn garden: $985', (await cmp('18|6995|1050')) === 985);
  ok('Lake Urn Garden: $875', (await cmp('lake_urn|5495|825')) === 875);
}

console.log('\n6. At-Need CIRGAS tab');
{
  const r = await page.evaluate(() => {
    show('an-contract', null);
    const sel = document.getElementById('anAmtOpening').parentElement.querySelector('select');
    const opts = [...sel.options].map((o) => o.value + ' ' + o.text);
    const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); };
    const warn = () => document.getElementById('anOCWarn').style.display !== 'none';
    set('anVault', 'Monticello Urn Vault'); set('anPropertyLocation', '18-227-B-4'); set('anAmtOpening', '875');
    const lawn875 = warn();
    set('anAmtOpening', '985'); const lawn985 = warn();
    set('anAmtOpening', '875'); set('anPropertyLocation', 'Rose Urn Garden'); const garden875 = warn();
    set('anPropertyLocation', '18-227-B-4'); set('anVault', ''); const combo875 = warn();
    ['anVault', 'anPropertyLocation', 'anAmtOpening'].forEach((id) => set(id, ''));
    return { opts, lawn875, lawn985, garden875, combo875 };
  });
  ok('quick-fill offers the $985 lawn + separate urn vault option', r.opts.some((o) => /^985 Ground Inurnment, lawn \+ separate urn vault/.test(o)), r.opts);
  ok('and the $875 urn garden / combination option', r.opts.some((o) => /^875 Ground Inurnment, urn garden or combination urn vault/.test(o)), r.opts);
  ok('no bare "Ground Inurnment $875" option is left', !r.opts.some((o) => /^875 Ground Inurnment \$875$/.test(o)), r.opts);
  ok('urn vault + lawn location + $875: warns', r.lawn875 === true);
  ok('urn vault + lawn location + $985: no warning', r.lawn985 === false);
  ok('urn vault + urn garden + $875: no warning', r.garden875 === false);
  ok('no urn vault + $875 (combination urn): no warning', r.combo875 === false);
}

console.log('\n7. bwGroundOCLow, the check the impact list runs over saved quotes');
{
  const r = await page.evaluate(() => {
    const V = { label: 'Monticello Urn Vault', amount: 935, taxable: true };
    const S = { label: 'Cremation Vault Setting', amount: 575, taxable: true };
    return {
      lawnLow: bwGroundOCLow([V, S, { label: 'Ground Inurnment', amount: 875 }], '18'),
      lawnLowQty: bwGroundOCLow([V, { label: 'Ground Inurnment ×2', amount: 1750 }], '18'),
      lawnOk: bwGroundOCLow([V, S, { label: 'Ground Inurnment – Lawn Space', amount: 985 }], '18'),
      combo: bwGroundOCLow([{ label: 'Meadow Green Synthetic Marble Companion Urn', amount: 595 }, { label: 'Ground Inurnment', amount: 875 }], '18'),
      garden: bwGroundOCLow([V, S, { label: 'Ground Inurnment', amount: 875 }], 'lake_urn'),
      gardenText: bwGroundOCLow([V, { label: 'Ground Inurnment', amount: 875 }], '', 'Rose Urn Garden 4'),
    };
  });
  ok('negative control: lawn + urn vault + $875 IS flagged', r.lawnLow === true);
  ok('negative control: ×2 at $875 each IS flagged', r.lawnLowQty === true);
  ok('lawn + urn vault + $985: not flagged', r.lawnOk === false);
  ok('combination urn + $875: not flagged', r.combo === false);
  ok('urn garden + urn vault + $875: not flagged', r.garden === false && r.gardenText === false);
}

console.log('\n8. Downstream sorters still see the $985 line as O&C, never as a vault');
{
  // The line deliberately avoids the word "vault": the At-Need categorizer checks /vault|container/
  // before O&C, and the RIC/print grouping checks /Vault/ right after it.
  const r = await page.evaluate(() => {
    const l = { label: 'Ground Inurnment – Lawn Space', amount: 985, taxable: false };
    const g = categorizeCemLines([l]);
    return { an: _anCategorizeLine(l), cem: g.map((x) => x.title) };
  });
  ok('At-Need categorizer: oc', r.an === 'oc', r.an);
  ok('quote grouping: Cemetery Services', r.cem.join() === 'Cemetery Services', r.cem);
}

ok('no page errors', errs.length === 0, errs);
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
