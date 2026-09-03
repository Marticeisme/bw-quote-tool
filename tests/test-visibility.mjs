// Per-user visibility of saved records and contacts.
//
// Martice, 2026-09-03: "I'd like for Randy to not be able to see all of my quotes or contacts,
// but mine can stay the same where I can see everything." The admin (martice) sees everything;
// anyone else sees a record only when it names him — ownerUid or ownerHandle.
//
// A record naming NOBODY is legacy, and Martice ruled the same day that those stay visible to
// BOTH counselors: the back catalogue is shared work, and the split applies to the new book.
//
// The assertion this file exists for is the LAST section: filtering a VIEW must never feed a
// WRITE. If it ever did, a non-admin's save would write back a store missing every record he
// cannot see — the 2026-07-11 wipe, one level up. Every write is checked against the fake DB's
// own contents and its write log, not against what the page thinks it has.
//
// Fake Firebase only — production is never contacted.
import { chromium } from 'playwright';
import fs from 'fs';
import { BASE } from './_base.mjs';

const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };

const UID = h => 'uid_' + h + '@bwquote.local';
const TYPES = ['cem', 'fh', 'ric', 'ga', 'cp', 'an', 'dt'];

// One record per type per owner: the admin's, the other counselor's, and a legacy one saved
// before ownership existed. Synthetic names throughout — no real family appears in a fixture.
function seed() {
  const quotes = {};
  TYPES.forEach((t, i) => {
    const b = 100 + i * 10;
    quotes[t] = {
      ['q' + (b + 1)]: { id: b + 1, label: t.toUpperCase() + ' Alder',   total: 1000, date: 'Sep 1, 2026', state: { fields: {} }, ownerUid: UID('martice'), ownerHandle: 'martice' },
      ['q' + (b + 2)]: { id: b + 2, label: t.toUpperCase() + ' Birchall', total: 2000, date: 'Sep 1, 2026', state: { fields: {} }, ownerUid: UID('randy'),   ownerHandle: 'randy' },
      ['q' + (b + 3)]: { id: b + 3, label: t.toUpperCase() + ' Cavendish', total: 3000, date: 'Sep 1, 2026', state: { fields: {} } },
    };
  });
  return {
    quotes,
    parties: {
      pAdmin:  { id: 'pAdmin',  kind: 'person', given: 'Mona',  family: 'Alder',     ownerUid: UID('martice'), ownerHandle: 'martice' },
      pOther:  { id: 'pOther',  kind: 'person', given: 'Rhea',  family: 'Birchall',  ownerUid: UID('randy'),   ownerHandle: 'randy' },
      pLegacy: { id: 'pLegacy', kind: 'person', given: 'Lena',  family: 'Cavendish' },
    },
    // Randy's own contact is named on BOTH his cem quote and the admin's, so holdings has
    // something to filter that the contact list itself does not.
    contractRoles: {
      rA: { id: 'rA', partyId: 'pOther', recordType: 'cem', recordId: 101, role: 'purchaser' },
      rB: { id: 'rB', partyId: 'pOther', recordType: 'cem', recordId: 102, role: 'purchaser' },
      rC: { id: 'rC', partyId: 'pOther', recordType: 'cem', recordId: 103, role: 'purchaser' },
    },
  };
}

async function signedInAs(browser, handle, tree) {
  const ctx = await browser.newContext();
  await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 160)); });
  await page.addInitScript(FAKE);
  await page.addInitScript(`(${(s, id) => { window.__fake.seed(s); window.__fake.addAccount(id, 'pw'); }})`
    + `.call(null, ${JSON.stringify(tree === undefined ? seed() : tree)}, ${JSON.stringify(handle + '@bwquote.local')});`);
  await page.goto(BASE, { waitUntil: 'load', timeout: 120000 });
  await page.fill('#bwUser', handle);
  await page.fill('#bwPass', 'pw');
  await page.click('#bwGateBtn');
  await page.waitForTimeout(700);
  return { ctx, page, errs };
}

// Every derived view in one pass, plus the two accessors behind them.
const readView = page => page.evaluate(() => {
  const arr = { cem: _cemSavedQuotes, fh: _fhSavedQuotes, ric: _ricSavedContracts, ga: _gaSavedContracts,
                cp: _cpSavedContracts, an: _anSavedContracts, dt: _dtSavedTransfers };
  const out = { canSeeAll: bwCanSeeAll(), labels: {}, storeCounts: {} };
  Object.keys(arr).forEach(t => { out.labels[t] = (arr[t] || []).map(q => q.label).sort(); });
  Object.keys(_quoteStore).forEach(t => { out.storeCounts[t] = Object.keys(_quoteStore[t] || {}).length; });
  out.parties = _parties.map(p => p.family).sort();
  out.partyStoreCount = Object.keys(_partyStore).length;
  out.holdings = bwHoldingsFor('pOther').cemetery.map(h => h.rec.label).sort();
  out.holdingsMissing = bwHoldingsFor('pOther').missing.length;
  return out;
});

const browser = await chromium.launch();

// ── 1. The admin sees everything, exactly as before ──────────────────────────────────
console.log('\n1. Admin (martice)');
{
  const { ctx, page, errs } = await signedInAs(browser, 'martice');
  const v = await readView(page);
  ok('bwCanSeeAll() is true for the admin', v.canSeeAll === true, v.canSeeAll);
  TYPES.forEach(t => ok('admin sees all three ' + t + ' records', v.labels[t].length === 3, v.labels[t]));
  ok('admin sees all three contacts', v.parties.join() === 'Alder,Birchall,Cavendish', v.parties);
  ok('admin holdings show every linked record', v.holdings.length === 3, v.holdings);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ── 2. A second counselor sees only his own ──────────────────────────────────────────
console.log('\n2. Non-admin (randy)');
{
  const { ctx, page, errs } = await signedInAs(browser, 'randy');
  const v = await readView(page);
  ok('bwCanSeeAll() is false for a non-admin', v.canSeeAll === false, v.canSeeAll);
  TYPES.forEach(t => {
    const T = t.toUpperCase();
    ok(t + ': his own and the unclaimed one, not the admin\'s',
      v.labels[t].join() === T + ' Birchall,' + T + ' Cavendish', v.labels[t]);
  });
  ok('contacts: his own and the unclaimed one', v.parties.join() === 'Birchall,Cavendish', v.parties);

  // The point of enforcing at the derived-view layer: the STORES still hold everything, so
  // nothing a write reads has been narrowed. This is the invariant the last section leans on.
  TYPES.forEach(t => ok(t + ': the underlying store still holds all three', v.storeCounts[t] === 3, v.storeCounts));
  ok('the party store still holds all three', v.partyStoreCount === 3, v.partyStoreCount);

  ok('holdings drop the records he may not see',
    v.holdings.join() === 'CEM Birchall,CEM Cavendish', v.holdings);
  ok('a hidden record is dropped, not reported as deleted', v.holdingsMissing === 0, v.holdingsMissing);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ── 3. The rule itself, one record at a time ─────────────────────────────────────────
// Operator ruling, 2026-09-03: an unclaimed record (no ownerUid AND no ownerHandle) stays
// visible to everyone. Only a record that NAMES an owner is filtered.
console.log('\n3. bwCanSeeRecord, case by case');
{
  const { ctx, page } = await signedInAs(browser, 'randy');
  const r = await page.evaluate(() => ({
    legacyQuote:  bwCanSeeRecord({ id: 1, label: 'x' }),
    legacyParty:  bwCanSeeRecord({ id: 'p', given: 'x' }),
    blankOwner:   bwCanSeeRecord({ ownerUid: '', ownerHandle: '' }),
    ownedByOther: bwCanSeeRecord({ ownerUid: 'uid_martice@bwquote.local', ownerHandle: 'martice' }),
    otherUidOnly: bwCanSeeRecord({ ownerUid: 'uid_martice@bwquote.local' }),
    otherHandleOnly: bwCanSeeRecord({ ownerHandle: 'martice' }),
    ownedByMeUid: bwCanSeeRecord({ ownerUid: window._bwUser.uid }),
    ownedByMeHandle: bwCanSeeRecord({ ownerHandle: 'randy' }),
    ownedByMeHandleCased: bwCanSeeRecord({ ownerHandle: 'RANDY' }),
    nothing: bwCanSeeRecord(null),
    // The admin's rows really are in the store; they are filtered, not absent.
    adminInStore: !!_quoteStore.cem.q101,
    adminInView: _cemSavedQuotes.some(q => q.id === 101),
    legacyInView: _cemSavedQuotes.some(q => q.id === 103),
  }));
  ok('an unclaimed quote is visible to everyone', r.legacyQuote === true, r);
  ok('an unclaimed contact is visible to everyone', r.legacyParty === true, r);
  ok('empty owner fields count as unclaimed', r.blankOwner === true, r);
  ok('another counselor\'s record is hidden', r.ownedByOther === false, r);
  ok('...by uid alone', r.otherUidOnly === false, r);
  ok('...and by handle alone', r.otherHandleOnly === false, r);
  ok('his own by uid is visible', r.ownedByMeUid === true, r);
  ok('his own by handle alone is visible', r.ownedByMeHandle === true, r);
  ok('handle match is case-insensitive', r.ownedByMeHandleCased === true, r);
  ok('a missing record is not visible', r.nothing === false, r);
  ok('the admin\'s record is still in the store', r.adminInStore === true, r);
  ok('...and only filtered out of the view', r.adminInView === false, r);
  ok('the unclaimed record is in the view', r.legacyInView === true, r);
  await ctx.close();
}

// ── 4. Saving stamps ownership, blanks only ──────────────────────────────────────────
console.log('\n4. Ownership is stamped on save');
{
  const { ctx, page } = await signedInAs(browser, 'randy');
  const r = await page.evaluate(async () => {
    await saveQuoteRecord('cem', { id: 900, label: 'Fresh Dunmore', total: 42, date: 'Sep 3, 2026', state: {} }, 'Fresh Dunmore');
    // An owner already on the snapshot must survive: re-saving someone else's record must not
    // silently transfer it, which is what a blind stamp would do.
    await saveQuoteRecord('dt', { id: 901, label: 'Kept Elmsworth', total: 0, date: 'Sep 3, 2026', state: {},
                                  ownerUid: 'uid_martice@bwquote.local', ownerHandle: 'martice' }, 'Kept Elmsworth');
    return { fresh: window.__fake.get('quotes/cem/q900'), kept: window.__fake.get('quotes/dt/q901'),
             visible: _cemSavedQuotes.some(q => q.id === 900) };
  });
  ok('a new save carries ownerUid', r.fresh.ownerUid === UID('randy'), r.fresh);
  ok('a new save carries ownerHandle', r.fresh.ownerHandle === 'randy', r.fresh);
  ok('the saver can see what he just saved', r.visible === true, r.visible);
  ok('an existing ownerUid survives the save', r.kept.ownerUid === UID('martice'), r.kept);
  ok('an existing ownerHandle survives the save', r.kept.ownerHandle === 'martice', r.kept);
  await ctx.close();
}

// ── 5. The admin moves a record between books ────────────────────────────────────────
console.log('\n5. Owner hand-off');
let handedOff = null;
{
  const { ctx, page } = await signedInAs(browser, 'martice');
  const r = await page.evaluate(() => {
    bwSetRecordOwner('cem', 101, 'randy');     // his own cem quote, handed over
    bwSetPartyOwner('pAdmin', 'randy');        // and his own contact
    bwSetRecordOwner('fh', 113, 'martice');    // an unclaimed one, CLAIMED: leaves the shared pool
    bwSetRecordOwner('cem', 102, 'nobody');    // a handle nobody can sign in as: refused
    return {
      quote:  window.__fake.get('quotes/cem/q101'),
      party:  window.__fake.get('parties/pAdmin'),
      claimed: window.__fake.get('quotes/fh/q113'),
      untouched: window.__fake.get('quotes/cem/q102'),
      others: Object.keys(window.__fake.get('quotes/cem')).sort(),
      dump: window.__fake.dump(),
    };
  });
  ok('the handed-over quote now names the new owner', r.quote.ownerHandle === 'randy', r.quote);
  ok('the handed-over contact now names the new owner', r.party.ownerHandle === 'randy', r.party);
  // The admin cannot know another account's uid first-hand, but one is already on the other
  // records in the store, so the reverse lookup finds it rather than guessing.
  ok('ownerUid is resolved from a record that account already stamped', r.quote.ownerUid === UID('randy'), r.quote);
  ok('an unclaimed record can be claimed', r.claimed.ownerHandle === 'martice', r.claimed);
  ok('an unknown handle is refused outright', r.untouched.ownerHandle === 'randy', r.untouched);
  ok('every other record in the node is still there', r.others.length === 3, r.others);
  handedOff = r.dump;
  await ctx.close();
}
{
  const { ctx, page } = await signedInAs(browser, 'randy', handedOff);
  const v = await readView(page);
  ok('the handed-over quote now appears for the new owner',
    v.labels.cem.join() === 'CEM Alder,CEM Birchall,CEM Cavendish', v.labels.cem);
  ok('the handed-over contact now appears too',
    v.parties.join() === 'Alder,Birchall,Cavendish', v.parties);
  ok('a record the admin claimed drops out of the shared pool',
    v.labels.fh.join() === 'FH Birchall', v.labels.fh);
  ok('nothing else moved', v.labels.ric.join() === 'RIC Birchall,RIC Cavendish', v.labels.ric);
  await ctx.close();
}

// ── 6. The hand-off control is the admin's alone ─────────────────────────────────────
console.log('\n6. The owner control is admin-only');
{
  const { ctx, page } = await signedInAs(browser, 'martice');
  const r = await page.evaluate(() => {
    show('cem-saved', document.getElementById('navCemSaved'));
    renderSavedQuotesList('cem');
    openContactDetail('pAdmin');
    return { rows: document.querySelectorAll('#cemSavedQuotes .owner-pick').length,
             detail: document.querySelectorAll('#contactDetail .owner-pick').length };
  });
  ok('the admin gets an owner picker on every saved row', r.rows === 3, r);
  ok('...and on the contact detail', r.detail === 1, r);
  await ctx.close();
}
{
  const { ctx, page } = await signedInAs(browser, 'randy');
  const r = await page.evaluate(() => {
    show('cem-saved', document.getElementById('navCemSaved'));
    renderSavedQuotesList('cem');
    openContactDetail('pOther');
    const before = JSON.stringify(window.__fake.get('quotes/cem/q101'));
    bwSetRecordOwner('cem', 101, 'randy');   // refused: not the admin
    bwSetPartyOwner('pAdmin', 'randy');      // refused: not the admin
    return { rows: document.querySelectorAll('#cemSavedQuotes .owner-pick').length,
             detail: document.querySelectorAll('#contactDetail .owner-pick').length,
             quoteUnchanged: JSON.stringify(window.__fake.get('quotes/cem/q101')) === before,
             partyUnchanged: window.__fake.get('parties/pAdmin').ownerHandle === 'martice' };
  });
  ok('a non-admin gets no owner picker on a saved row', r.rows === 0, r);
  ok('...and none on the contact detail', r.detail === 0, r);
  ok('calling the setter directly changes nothing (quote)', r.quoteUnchanged === true, r);
  ok('calling the setter directly changes nothing (contact)', r.partyUnchanged === true, r);
  await ctx.close();
}

// ── 7. A hidden contact stays hidden when reached by URL ─────────────────────────────
console.log('\n7. Direct link to a hidden contact');
{
  const { ctx, page } = await signedInAs(browser, 'randy');
  const r = await page.evaluate(() => {
    openContactDetail('pAdmin');
    const hidden = _bwDetailId;
    openContactDetail('pOther');
    return { hidden: hidden, own: _bwDetailId };
  });
  ok('the detail panel refuses to open a contact he may not see', r.hidden === null, r);
  ok('...and still opens his own', r.own === 'pOther', r);
  await ctx.close();
}

// ── 8. Counts on the contact home respect the filter ─────────────────────────────────
console.log('\n8. Contact home counts');
{
  const { ctx, page } = await signedInAs(browser, 'martice');
  const r = await page.evaluate(() => { renderContactsHome(); return _parties.length; });
  ok('admin count is every contact', r === 3, r);
  await ctx.close();
}
{
  const { ctx, page } = await signedInAs(browser, 'randy');
  const r = await page.evaluate(() => {
    renderContactsHome();
    return { n: _parties.length, store: Object.keys(_partyStore).length };
  });
  ok('non-admin count drops the admin\'s contact', r.n === 2, r);
  ok('the store behind it is untouched', r.store === 3, r);
  await ctx.close();
}

// ── 9. THE HAZARD: a filtered view must never feed a write ───────────────────────────
// This is the section that has to stay red if anyone ever points a write at a derived array.
// Everything is asserted against the fake DB's own contents, so a page that merely *believes*
// it kept the other records cannot pass.
console.log('\n9. Writes read the full store, never the filtered view');
{
  const { ctx, page } = await signedInAs(browser, 'randy');
  const r = await page.evaluate(async () => {
    const keysBefore = {};
    Object.keys(window.__fake.get('quotes')).forEach(t => { keysBefore[t] = Object.keys(window.__fake.get('quotes/' + t)).sort(); });
    const partiesBefore = Object.keys(window.__fake.get('parties')).sort();
    window.__fake.clearLog();

    // A save from every one of the seven lanes, by the production entry point.
    for (const t of ['cem', 'fh', 'ric', 'ga', 'cp', 'an', 'dt']) {
      await saveQuoteRecord(t, { id: 500, label: 'New ' + t, total: 7, date: 'Sep 3, 2026', state: {} }, 'New ' + t);
    }
    await saveParty({ given: 'Nolan', family: 'Fairweather' });
    // ...and a delete, the other write a filtered view could poison.
    deleteQuoteRecord('cem', 102);

    const keysAfter = {};
    Object.keys(window.__fake.get('quotes')).forEach(t => { keysAfter[t] = Object.keys(window.__fake.get('quotes/' + t)).sort(); });
    return {
      keysBefore, keysAfter,
      partiesBefore, partiesAfter: Object.keys(window.__fake.get('parties')).sort(),
      // Every path written, so a whole-node .set() shows up as a bare 'quotes' or 'parties'.
      writes: window.__fake.log().filter(e => e.op === 'set' || e.op === 'update' || e.op === 'remove')
                                 .map(e => e.op + ' ' + e.path),
    };
  });

  // Every record the non-admin could NOT see is still in the database, byte for byte present.
  let survived = 0, lost = [];
  Object.keys(r.keysBefore).forEach(t => {
    r.keysBefore[t].forEach(k => { if (r.keysAfter[t].indexOf(k) > -1) survived++; else if (!(t === 'cem' && k === 'q102')) lost.push(t + '/' + k); });
  });
  ok('every pre-existing saved record survived a non-admin save', lost.length === 0, lost);
  ok('...all 21 of them, minus the one deliberately deleted', survived === 20, { survived, lost });
  ok('the admin\'s own records are still there', r.keysAfter.cem.indexOf('q101') > -1 && r.keysAfter.cem.indexOf('q103') > -1, r.keysAfter.cem);
  ok('the new record was added', r.keysAfter.cem.indexOf('q500') > -1, r.keysAfter.cem);
  ok('the deleted record is the only one gone', r.keysAfter.cem.length === 3, r.keysAfter.cem);
  ok('every pre-existing contact survived', r.partiesBefore.every(k => r.partiesAfter.indexOf(k) > -1), { before: r.partiesBefore, after: r.partiesAfter });

  // Every write must name ONE record. A saved record lives at quotes/<type>/<key> — three
  // segments, never two — and a contact at parties/<id>. Anything shorter is a node-wide write,
  // the shape that erased real quotes on 2026-07-11.
  const paths = r.writes.map(w => w.split(' ')[1]);
  const wide = paths.filter(p => {
    const seg = p.split('/').filter(Boolean);
    return seg[0] === 'quotes' ? seg.length !== 3 : seg.length < 2;
  });
  ok('no write addressed a whole node or a whole type', wide.length === 0, wide);
  ok('every write named one record', paths.length > 0 && wide.length === 0, paths);
  ok('the legacy savedQuotes node was never written', paths.every(p => p.indexOf('savedQuotes') === -1), paths);
  await ctx.close();
}

// ── 10. The overwrite prompt cannot reach a record he may not see ────────────────────
console.log('\n10. Overwrite-by-name is scoped too');
{
  const { ctx, page } = await signedInAs(browser, 'randy');
  const r = await page.evaluate(async () => {
    // The admin's cem quote is 'CEM Alder'. Saving under the same name must not offer — or
    // take — his record, so the duplicate scan is scoped to what this user can see.
    const dupOther = _dupKeysByLabel('cem', 'CEM Alder');
    const dupOwn   = _dupKeysByLabel('cem', 'CEM Birchall');
    await saveQuoteRecord('cem', { id: 700, label: 'CEM Alder', total: 9, date: 'Sep 3, 2026', state: {} }, 'CEM Alder');
    return { dupOther, dupOwn, adminRecord: window.__fake.get('quotes/cem/q101'),
             keys: Object.keys(window.__fake.get('quotes/cem')).sort() };
  });
  ok('a name held only by a hidden record scans as no duplicate', r.dupOther.length === 0, r.dupOther);
  ok('his own duplicate is still found', r.dupOwn.join() === 'q102', r.dupOwn);
  ok('the hidden record with that name survives the save', r.adminRecord !== null && r.adminRecord.label === 'CEM Alder', r.adminRecord);
  ok('both records now exist', r.keys.length === 4, r.keys);
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
