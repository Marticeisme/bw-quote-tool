// More than one contact on a cemetery/FH quote (s23 Track B, operator issue 1).
//
// The join table always supported it — contractRoles is indexed per record as an ARRAY. The
// pending-link UI layer was the single slot. This suite covers the new list surface AND the
// two role-lifecycle bugs it exposed:
//
//   * unlinking a contact never deleted its contractRole (bwAttachToSavedRecord returned early
//     whenever nothing was pending), so the link outlived the unlink;
//   * every save mints a new record id, so reopening and re-saving a quote under the same label
//     overwrote the record but ORPHANED its roles — the family's holdings grew a phantom copy
//     of the same quote on every update.
//
// Fake Firebase only — production is never contacted.
import { chromium } from 'playwright';
import fs from 'fs';
import { BASE } from './_base.mjs';
const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };

// `label` names the quote at the save prompt; passing the SAME label twice and accepting the
// "already exists" confirm is how the operator updates a quote.
async function open(browser, label) {
  const ctx = await browser.newContext();
  await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  page.on('dialog', async d => {
    if (d.type() === 'prompt') await d.accept(label || 'Multi Link Quote');
    else await d.accept();          // includes "OK = overwrite it"
  });
  await page.addInitScript(FAKE);
  await page.addInitScript(`window.__fake.addAccount('t@bwquote.local','pw');`);
  await page.goto(BASE + 'index.html', { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('t@bwquote.local', 'pw'));
  await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
  await page.waitForTimeout(300);
  return { ctx, page, errs };
}

// Priced so the quote is savable; identical to the shape test-quote-link.mjs builds.
const buildAQuote = () => {
  show('cem-quote', null);
  const g = document.getElementById('qGarden');
  g.value = [...g.options].find(o => /\|/.test(o.value)).value;
  const oc = document.getElementById('qOCNiche'); if (oc) oc.checked = true;
  cemUpdateD();
};
const BUILD = buildAQuote.toString();

const browser = await chromium.launch();

// 1. Two contacts, two different roles, one quote
console.log('\n1. Two contacts with different roles');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async (fn) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const a = await saveParty({ given: 'Ida', family: 'Alvarez', phones: { p1: { value: '2065550188', isPrimary: true } } });
    const b = await saveParty({ given: 'Ruben', family: 'Alvarez' });
    eval('(' + fn + ')()');
    await sleep(200);
    bwAddPendingLink('cem', a.id);
    const afterFirst = document.getElementById('cemClientName').value;
    bwAddPendingLink('cem', b.id, 'co-purchaser');
    const afterSecond = document.getElementById('cemClientName').value;
    const box = document.getElementById('cemLinkedContact');
    const chips = box.querySelectorAll('.bw-link-chip').length;
    const selects = [...box.querySelectorAll('select')].map(s => s.value);
    saveCemQuote();
    await sleep(600);
    const roles = Object.values(window.__fake.get('contractRoles') || {});
    const recId = _cemSavedQuotes[0].id;
    const byRole = {}; roles.forEach(x => { byRole[x.role] = x; });
    return {
      afterFirst, afterSecond, chips, selects,
      count: roles.length,
      allOnRecord: roles.every(x => x.recordType === 'cem' && x.recordId === recId),
      purchaser: byRole['purchaser'] && byRole['purchaser'].partyId === a.id,
      coPurchaser: byRole['co-purchaser'] && byRole['co-purchaser'].partyId === b.id,
      bothLiable: byRole['purchaser'] && byRole['co-purchaser']
        && byRole['purchaser'].financiallyLiable === true && byRole['co-purchaser'].financiallyLiable === true,
      viaRecord: bwRolesForRecord('cem', recId).length,
      addStillOffered: /Link another contact/.test(box.textContent),
    };
  }, BUILD);
  ok('a chip per linked contact', r.chips === 2, r.chips);
  ok('each chip carries its own role dropdown', r.selects.length === 2 && r.selects[0] === 'purchaser' && r.selects[1] === 'co-purchaser', r.selects);
  ok('the add button is still offered after linking', r.addStillOffered, r.addStillOffered);
  ok('first link fills the client name', r.afterFirst === 'Ida Alvarez', r.afterFirst);
  ok('a SECOND link does not overwrite the client name', r.afterSecond === 'Ida Alvarez', r.afterSecond);
  ok('two contractRoles written', r.count === 2, r.count);
  ok('both point at the saved quote', r.allOnRecord, r.allOnRecord);
  ok('purchaser role holds the first contact', r.purchaser, r.purchaser);
  ok('co-purchaser role holds the second', r.coPurchaser, r.coPurchaser);
  ok('both roles are financially liable, per BW_ROLES', r.bothLiable, r.bothLiable);
  ok('both findable from the record', r.viaRecord === 2, r.viaRecord);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 2. Reopening restores every link, not just the first
console.log('\n2. Reopening restores ALL links');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async (fn) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const a = await saveParty({ given: 'Ida', family: 'Alvarez' });
    const b = await saveParty({ given: 'Ruben', family: 'Alvarez' });
    eval('(' + fn + ')()');
    await sleep(200);
    bwAddPendingLink('cem', a.id);
    bwAddPendingLink('cem', b.id, 'co-purchaser');
    saveCemQuote(); await sleep(600);
    const id = _cemSavedQuotes[0].id;
    resetCemQuote(); await sleep(200);
    const cleared = _bwPendingLink['cem'];
    loadSavedCemQuote(id); await sleep(500);
    const restored = (_bwPendingLink['cem'] || []).map(l => bwPartyName(bwPartyById(l.partyId)) + '/' + l.role).sort();
    return {
      cleared, restored,
      chips: document.getElementById('cemLinkedContact').querySelectorAll('.bw-link-chip').length,
    };
  }, BUILD);
  ok('reset clears the whole list', r.cleared === undefined, r.cleared);
  ok('both contacts come back with their roles', JSON.stringify(r.restored) === JSON.stringify(['Ida Alvarez/purchaser', 'Ruben Alvarez/co-purchaser']), r.restored);
  ok('and both chips are rendered', r.chips === 2, r.chips);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 3. THE BUG: unlink one, re-save — the role must actually be deleted
console.log('\n3. Unlinking one contact deletes only that role');
{
  const { ctx, page, errs } = await open(browser, 'Reconcile Me');
  const r = await page.evaluate(async (fn) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const a = await saveParty({ given: 'Ida', family: 'Alvarez' });
    const b = await saveParty({ given: 'Ruben', family: 'Alvarez' });
    eval('(' + fn + ')()');
    await sleep(200);
    bwAddPendingLink('cem', a.id);
    bwAddPendingLink('cem', b.id, 'co-purchaser');
    saveCemQuote(); await sleep(600);
    const before = Object.keys(window.__fake.get('contractRoles') || {}).length;
    loadSavedCemQuote(_cemSavedQuotes[0].id); await sleep(500);
    // drop Ruben — index 1 in the restored list
    const idx = (_bwPendingLink['cem'] || []).findIndex(l => l.partyId === b.id);
    bwRemovePendingLink('cem', idx);
    const chipsAfterUnlink = document.getElementById('cemLinkedContact').querySelectorAll('.bw-link-chip').length;
    saveCemQuote(); await sleep(700);
    const roles = Object.values(window.__fake.get('contractRoles') || {});
    const liveIds = _cemSavedQuotes.map(q => q.id);
    return {
      before, chipsAfterUnlink,
      after: roles.length,
      survivorIsIda: roles.length === 1 && roles[0].partyId === a.id && roles[0].role === 'purchaser',
      rubenGone: bwRolesForParty(b.id).length === 0,
      idaStillHasOne: bwRolesForParty(a.id).length === 1,
      orphans: roles.filter(x => x.recordType === 'cem' && liveIds.indexOf(x.recordId) === -1).length,
      records: _cemSavedQuotes.length,
    };
  }, BUILD);
  ok('started from two roles', r.before === 2, r.before);
  ok('unlinking removes the chip immediately', r.chipsAfterUnlink === 1, r.chipsAfterUnlink);
  ok('exactly one role survives the save', r.after === 1, r.after);
  ok('the survivor is the contact still linked', r.survivorIsIda, r.survivorIsIda);
  ok('the unlinked contact keeps NO role', r.rubenGone, r.rubenGone);
  ok('the remaining contact is untouched', r.idaStillHasOne, r.idaStillHasOne);
  ok('no orphaned roles left behind', r.orphans === 0, r.orphans);
  ok('still one saved record', r.records === 1, r.records);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 4. THE OTHER BUG: reopen + re-save must not orphan the role it already had
console.log('\n4. Re-saving a quote does not duplicate its links');
{
  const { ctx, page, errs } = await open(browser, 'Resave Me');
  const r = await page.evaluate(async (fn) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const a = await saveParty({ given: 'Ida', family: 'Alvarez' });
    eval('(' + fn + ')()');
    await sleep(200);
    bwAddPendingLink('cem', a.id);
    saveCemQuote(); await sleep(600);
    const holdings1 = bwRolesForParty(a.id).length;
    for (let i = 0; i < 2; i++) {
      loadSavedCemQuote(_cemSavedQuotes[0].id); await sleep(450);
      saveCemQuote(); await sleep(650);
    }
    const roles = Object.values(window.__fake.get('contractRoles') || {});
    const liveIds = _cemSavedQuotes.map(q => q.id);
    return {
      holdings1,
      holdings3: bwRolesForParty(a.id).length,
      roles: roles.length,
      orphans: roles.filter(x => x.recordType === 'cem' && liveIds.indexOf(x.recordId) === -1).length,
      records: _cemSavedQuotes.length,
      pointsAtLive: roles.length === 1 && liveIds.indexOf(roles[0].recordId) > -1,
    };
  }, BUILD);
  ok('one role after the first save', r.holdings1 === 1, r.holdings1);
  ok('still one saved record after two updates', r.records === 1, r.records);
  ok('still exactly one role after two updates', r.roles === 1, r.roles);
  ok('the family holds it ONCE, not three times', r.holdings3 === 1, r.holdings3);
  ok('no orphan roles pointing at deleted records', r.orphans === 0, r.orphans);
  ok('the surviving role points at the live record', r.pointsAtLive, r.pointsAtLive);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 5. Legacy single-link records still load
console.log('\n5. Legacy single-link records');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async (fn) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const a = await saveParty({ given: 'Solo', family: 'Legacy' });
    eval('(' + fn + ')()');
    await sleep(200);
    // Exactly what the old single-slot code wrote: one role, nothing else.
    bwSetPendingLink('cem', a.id);
    saveCemQuote(); await sleep(600);
    const id = _cemSavedQuotes[0].id;
    resetCemQuote(); await sleep(200);
    loadSavedCemQuote(id); await sleep(500);
    const list = _bwPendingLink['cem'];
    return {
      isArray: Array.isArray(list),
      len: list && list.length,
      name: list && list.length ? bwPartyName(bwPartyById(list[0].partyId)) : null,
      role: list && list.length ? list[0].role : null,
      chips: document.getElementById('cemLinkedContact').querySelectorAll('.bw-link-chip').length,
    };
  }, BUILD);
  ok('a one-role record restores as a one-item list', r.isArray && r.len === 1, r);
  ok('with the right contact', r.name === 'Solo Legacy', r.name);
  ok('and the right role', r.role === 'purchaser', r.role);
  ok('rendered as a single chip', r.chips === 1, r.chips);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 6. Role dropdown edits the pending link, and a role CHANGE reuses the row
console.log('\n6. Changing a role');
{
  const { ctx, page, errs } = await open(browser, 'Role Change');
  const r = await page.evaluate(async (fn) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const a = await saveParty({ given: 'Role', family: 'Shift' });
    eval('(' + fn + ')()');
    await sleep(200);
    bwAddPendingLink('cem', a.id);
    saveCemQuote(); await sleep(600);
    loadSavedCemQuote(_cemSavedQuotes[0].id); await sleep(500);
    bwSetPendingLinkRole('cem', 0, 'payer');
    const pending = JSON.parse(JSON.stringify(_bwPendingLink['cem']));
    const shown = [...document.getElementById('cemLinkedContact').querySelectorAll('select')].map(s => s.value);
    saveCemQuote(); await sleep(700);
    const roles = Object.values(window.__fake.get('contractRoles') || {});

    // Row REUSE is a property of the reconciler, not of the save button: every save mints a
    // new record id (id: Date.now()), so end-to-end the row is legitimately a new one and the
    // old record's row is cleaned up with the record. Drive the reconciler directly against a
    // STABLE id — that is the surface where reuse is observable and where it matters.
    const snap = { id: 987654321, label: 'stable', total: 1, date: 'x', state: {} };
    bwSetPendingLink('cem', a.id, 'purchaser');
    await bwAttachToSavedRecord('cem', snap);
    const stable1 = bwRolesForRecord('cem', snap.id);
    bwSetPendingLinkRole('cem', 0, 'beneficiary');
    await bwAttachToSavedRecord('cem', snap);
    const stable2 = bwRolesForRecord('cem', snap.id);
    // ...and dropping the link on a stable id must delete the row outright
    bwSetPendingLink('cem', null);
    await bwAttachToSavedRecord('cem', snap);
    const stable3 = bwRolesForRecord('cem', snap.id);

    return {
      pending, shown,
      count: roles.length,
      role: roles[0] && roles[0].role,
      liable: roles[0] && roles[0].financiallyLiable,
      stableOne: stable1.length === 1 && stable2.length === 1,
      stableSameRow: stable1.length === 1 && stable2.length === 1 && stable1[0].id === stable2[0].id,
      stableNewRole: stable2.length === 1 && stable2[0].role === 'beneficiary',
      stableCleared: stable3.length === 0,
    };
  }, BUILD);
  ok('the dropdown updates the pending link', r.pending.length === 1 && r.pending[0].role === 'payer', r.pending);
  ok('and re-renders as selected', JSON.stringify(r.shown) === JSON.stringify(['payer']), r.shown);
  ok('still one role after saving', r.count === 1, r.count);
  ok('saved with the new role', r.role === 'payer', r.role);
  ok('payer is not financially liable, per BW_ROLES', r.liable === false, r.liable);
  ok('reconciling a stable record keeps exactly one row', r.stableOne, r);
  ok('a role change UPDATES the existing row, not a new one', r.stableSameRow, r);
  ok('and the row carries the new role', r.stableNewRole, r);
  ok('reconciling with nothing pending deletes the row', r.stableCleared, r);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 7. Same person twice is one link; same person in two roles is two
console.log('\n7. Duplicate guard');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async (fn) => {
    const a = await saveParty({ given: 'Dee', family: 'Dupe' });
    eval('(' + fn + ')()');
    bwAddPendingLink('cem', a.id, 'purchaser');
    bwAddPendingLink('cem', a.id, 'purchaser');
    const afterSame = bwPendingLinks('cem').length;
    bwAddPendingLink('cem', a.id, 'insured');
    const afterOther = bwPendingLinks('cem').length;
    bwAddPendingLink('cem', null);
    return { afterSame, afterOther, afterNull: bwPendingLinks('cem').length };
  }, BUILD);
  ok('the same person in the same role does not double up', r.afterSame === 1, r.afterSame);
  ok('the same person in a DIFFERENT role is a second link', r.afterOther === 2, r.afterOther);
  ok('a null pick is ignored', r.afterNull === 2, r.afterNull);
  await ctx.close();
}

// 8. The standing decision: linking stays optional and per-module (DESIGN §8)
console.log('\n8. Still optional, still per-module');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async (fn) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const a = await saveParty({ given: 'Nobody', family: 'Linked' });
    eval('(' + fn + ')()');
    await sleep(200);
    const emptyBox = document.getElementById('cemLinkedContact').textContent;
    window.__fake.clearLog();
    saveCemQuote(); await sleep(500);
    const writes = window.__fake.log().filter(l => !['once', 'signIn', 'signOut'].includes(l.op)).length;
    const rolesAfterUnlinked = Object.keys(window.__fake.get('contractRoles') || {}).length;
    // and a link on the cemetery quote must not appear on the FH quote
    bwAddPendingLink('cem', a.id);
    return {
      emptyBox, writes, rolesAfterUnlinked,
      cem: bwPendingLinks('cem').length,
      fh: bwPendingLinks('fh').length,
      fhKeyAbsent: _bwPendingLink.fh === undefined,
    };
  }, BUILD);
  ok('an unlinked quote offers, never demands', /Link a contact/.test(r.emptyBox) && /optional/.test(r.emptyBox), r.emptyBox);
  ok('saves with exactly one write — the quote', r.writes === 1, r.writes);
  ok('and creates no contractRole', r.rolesAfterUnlinked === 0, r.rolesAfterUnlinked);
  ok('links stay scoped to their module', r.cem === 1 && r.fh === 0 && r.fhKeyAbsent, r);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 9. The picker is unchanged: caps at 60, still creates new
console.log('\n9. Picker unchanged');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async (fn) => {
    for (let i = 0; i < 65; i++) await saveParty({ given: 'Bulk' + i, family: 'Picker' });
    eval('(' + fn + ')()');
    let picked = null;
    openContactPicker(function (id) { bwAddPendingLink('cem', id); picked = id; });
    document.getElementById('cpSearch').value = '';
    renderContactPicker();
    const shown = document.getElementById('cpResults').children.length;
    const target = _parties.find(p => p.given === 'Bulk7').id;
    pickerChoose(target);
    await new Promise(r => setTimeout(r, 200));
    // and a second pick from the picker ADDS rather than replaces
    let picked2 = null;
    openContactPicker(function (id) { bwAddPendingLink('cem', id, 'co-purchaser'); picked2 = id; });
    pickerChoose(_parties.find(p => p.given === 'Bulk8').id);
    await new Promise(r => setTimeout(r, 200));
    return {
      shown, picked, picked2,
      links: bwPendingLinks('cem').length,
      chips: document.getElementById('cemLinkedContact').querySelectorAll('.bw-link-chip').length,
    };
  }, BUILD);
  ok('picker still caps the list at 60', r.shown === 60, r.shown);
  ok('first pick links', r.picked && r.links >= 1, r);
  ok('a second pick ADDS a link instead of replacing it', r.links === 2 && r.chips === 2, r);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
