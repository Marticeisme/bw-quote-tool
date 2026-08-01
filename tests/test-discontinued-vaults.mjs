// Five vault products were discontinued on 2026-07-26 and must never be quotable again:
//   Loved & Cherished 19" ($505), 2' ($715), 3' ($925)  — infant/child vaults, in TWO selects
//   Oversize Monticello ($4,085), 40# Oversize Rough Box ($3,355)
//
// The other half of this suite is the one that matters more. Three live figures look exactly
// like the discontinued ones and were nearly swept up with them:
//   Burial Vault Setting $685 and Cremation Vault Setting $575 are COMPONENTS of the two
//   Standard Arrangement bundles ($4,760 and $2,730). Deleting them under-quotes every
//   standard arrangement on a signed contract.
//   The $715 Mausoleum/Columbarium on-site shutter merely shares a price with the 2' vault.
// A future "remove the discontinued item" pass that searches by dollar amount fails here.
//
// Fake Firebase only — production is never contacted.
import { chromium } from 'playwright';
import fs from 'fs';
const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };

async function open(browser) {
  const ctx = await browser.newContext();
  await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  await page.addInitScript(FAKE);
  await page.addInitScript(`window.__fake.addAccount('t@bwquote.local','pw');`);
  await page.goto('http://localhost:' + (process.env.PORT || 3737) + '/', { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('t@bwquote.local', 'pw'));
  await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
  await page.waitForTimeout(250);
  return { ctx, page, errs };
}

const browser = await chromium.launch();

// 1. Gone from every dropdown in the app, not just the two we knew about
console.log('\n1. The five discontinued products are unquotable');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(() => {
    const opts = [...document.querySelectorAll('select option')]
      .map(o => ({ sel: (o.closest('select') || {}).id || '?', text: (o.textContent || '').replace(/\s+/g, ' ').trim(), value: o.value }));
    const hit = re => opts.filter(o => re.test(o.text));
    return {
      lovedCherished: hit(/loved\s*(&|and)\s*cherished/i),
      oversizeMonticello: hit(/oversize\s+monticello/i),
      roughBox: hit(/rough\s+box/i),
      lcOptgroups: [...document.querySelectorAll('select optgroup')]
        .filter(g => /loved/i.test(g.label || '')).map(g => g.label),
      // the parent selects must still exist and still be usable
      cmpBCount: (document.getElementById('cmpB_vault') || { options: [] }).options.length,
      qVaultCount: (document.getElementById('qVault') || { options: [] }).options.length,
    };
  });
  ok('no "Loved & Cherished" option anywhere', r.lovedCherished.length === 0, r.lovedCherished);
  ok('no "Oversize Monticello" option anywhere', r.oversizeMonticello.length === 0, r.oversizeMonticello);
  ok('no "Rough Box" option anywhere', r.roughBox.length === 0, r.roughBox);
  ok('the empty Loved & Cherished optgroup is gone too', r.lcOptgroups.length === 0, r.lcOptgroups);
  ok('cmpB_vault still offers the surviving vaults', r.cmpBCount === 13, r.cmpBCount);
  ok('qVault still offers the surviving vaults', r.qVaultCount === 21, r.qVaultCount);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 2. THE OVER-EAGER-REMOVAL GUARD. These three share a price with a discontinued item.
console.log('\n2. The look-alike LIVE figures survived');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async () => {
    show('cem-quote', null);
    // The two Standard Arrangement rows only appear once a garden is chosen.
    const g = document.getElementById('qGarden');
    g.value = [...g.options].find(o => /\|/.test(o.value)).value;
    const set = (id, v) => { const e = document.getElementById(id); if (e) { e.checked = v; } return !!e; };
    const has = set('qBurialArrange', true) && set('qUrnArrange', true);
    cemUpdateD();
    await new Promise(r => setTimeout(r, 250));
    const byLabel = {};
    (_cemLines || []).forEach(l => { byLabel[l.label] = l.amount; });
    const shutter = [...(document.getElementById('qInscType') || { options: [] }).options]
      .find(o => /on-site niche or crypt shutter/i.test(o.textContent));
    return {
      has,
      burialSetting: byLabel['Burial Vault Setting'],
      cremSetting: byLabel['Cremation Vault Setting'],
      burialBundle: (document.getElementById('qBurialArrangeDisp') || {}).textContent,
      urnBundle: (document.getElementById('qUrnArrangeDisp') || {}).textContent,
      shutter: shutter ? { text: shutter.textContent.replace(/\s+/g, ' ').trim(), value: shutter.value } : null,
      labels: Object.keys(byLabel),
    };
  });
  ok('both Standard Arrangement checkboxes still exist', r.has, r);
  ok('Burial Vault Setting still prices at $685', r.burialSetting === 685, { got: r.burialSetting, labels: r.labels });
  ok('Cremation Vault Setting still prices at $575', r.cremSetting === 575, { got: r.cremSetting, labels: r.labels });
  ok('Standard Burial Arrangement still totals $4,760', /4,?760/.test(r.burialBundle || ''), r.burialBundle);
  ok('Standard Urn Arrangement still totals $2,730', /2,?730/.test(r.urnBundle || ''), r.urnBundle);
  ok('the $715 on-site shutter inscription is untouched', r.shutter && r.shutter.value === '715', r.shutter);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 3. A saved quote that still names a discontinued vault must not quietly re-price.
//    vaultItems store name+price, so the amount comes from the record, not the dropdown.
console.log('\n3. A saved quote holding a discontinued vault keeps its money');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async () => {
    show('cem-quote', null);
    vaultItems = [{ name: '19" Loved and Cherished', price: 505, qty: 1 }];
    vaultRender();
    cemUpdateD();
    await new Promise(r => setTimeout(r, 200));
    const snap = { id: 71, label: 'Legacy L&C', total: _cemTotal, state: captureCemState(), date: 'Jan 5, 2026' };
    _quoteStore.cem['q71'] = snap; _rebuildTypeArray('cem');
    resetCemQuote();
    loadSavedCemQuote(71);
    await new Promise(r => setTimeout(r, 300));
    const line = (_cemLines || []).find(l => /loved and cherished/i.test(l.label));
    const banner = document.getElementById('bwVintageBanner');
    return {
      line: line || null,
      total: _cemTotal,
      savedTotal: snap.total,
      rendered: /Loved and Cherished/i.test((document.getElementById('vaultList') || {}).innerHTML || ''),
      banner: banner ? banner.textContent.replace(/\s+/g, ' ').trim() : '',
    };
  });
  ok('the discontinued vault line is still there', !!r.line, r);
  ok('at exactly the amount that was quoted', r.line && r.line.amount === 505, r.line);
  ok('the reloaded total is unchanged', Math.abs(r.total - r.savedTotal) < 0.005, r);
  ok('and it is visible in the vault list', r.rendered, r.rendered);
  ok('no "could not be rebuilt" warning — nothing was lost', !/could not be rebuilt/.test(r.banner), r.banner.slice(0, 160));
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 4. The comparison panel's vault IS a plain <select>. Its stored value no longer resolves,
//    and its lines are recomputed on every render — nothing snapshots them. Without the
//    restoreFieldState guard the $505 would just evaporate.
console.log('\n4. A retired <select> value is preserved and flagged, not dropped');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async () => {
    show('cem-quote', null);
    restoreFieldState({ cmpB_vault: '505' });
    const sel = document.getElementById('cmpB_vault');
    const b = calcBTotal();
    const line = (b.lines || []).find(l => Math.abs(l.amount - 505) < 0.005);
    const marker = sel.querySelector('option.bw-retired-option');
    const restored = {
      value: sel.value,
      amount: line ? line.amount : null,
      label: line ? line.label : null,
      markerText: marker ? marker.textContent : null,
      markerDisabled: marker ? marker.disabled : null,
    };
    // restoring a live value afterwards must clean the marker up
    restoreFieldState({ cmpB_vault: '2305' });
    restored.after = { value: sel.value, markers: sel.querySelectorAll('option.bw-retired-option').length };
    return restored;
  });
  ok('the stored value survives the reload', r.value === '505', r);
  ok('so the amount is still $505, not $0', r.amount === 505, r);
  ok('and it is labelled as no longer offered', /no longer offered/i.test(r.markerText || ''), r.markerText);
  ok('the placeholder cannot be picked for a NEW quote', r.markerDisabled === true, r.markerDisabled);
  ok('the line inherits that warning rather than a live product name', /no longer offered/i.test(r.label || ''), r.label);
  ok('restoring a live value clears the placeholder', r.after.value === '2305' && r.after.markers === 0, r.after);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 5. A value that still exists must behave exactly as before — no stray placeholders.
console.log('\n5. Normal restores are unaffected');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async () => {
    show('cem-quote', null);
    restoreFieldState({ cmpB_vault: '2305', qVaultQty: '3', cmpB_2ndRight: true });
    return {
      vault: document.getElementById('cmpB_vault').value,
      qty: document.getElementById('qVaultQty').value,
      chk: document.getElementById('cmpB_2ndRight').checked,
      strays: document.querySelectorAll('option.bw-retired-option').length,
    };
  });
  ok('live select value restores', r.vault === '2305', r);
  ok('text input restores', r.qty === '3', r);
  ok('checkbox restores', r.chk === true, r);
  ok('no placeholder options created', r.strays === 0, r.strays);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 6. The price list and top-bar search are DOM-scraped, so they must have dropped these too.
console.log('\n6. Price list and search no longer advertise them');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(() => {
    buildPriceIndex();
    // Narrow on purpose: "A Life Loved Casket Spray" and "Cherished Reflections Biodegradable
    // Urn" are live funeral-home products whose names collide with the discontinued vaults.
    const gone = PRICE_INDEX.filter(i => /loved\s*(&|and)\s*cherished|oversize monticello|rough box/i.test(i.name));
    const settings = PRICE_INDEX.filter(i => /vault setting/i.test(i.name)).map(i => i.name + '=' + i.price);
    const syn = (typeof SEARCH_INDEX !== 'undefined' ? SEARCH_INDEX : [])
      .filter(e => (e.terms || []).some(t => /loved and cherished|infant vault|baby vault/.test(t)));
    return { gone, settings, syn, size: PRICE_INDEX.length };
  });
  ok('no discontinued product in the price index', r.gone.length === 0, r.gone);
  ok('the two setting fees are still indexed', r.settings.length >= 2, r.settings);
  ok('the dead search synonym row is gone', r.syn.length === 0, r.syn);
  ok('the price index is otherwise populated', r.size > 300, r.size);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
