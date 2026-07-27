// Contact layer slice one: party store, contract roles, editor UI. Fake Firebase only.
import { chromium } from 'playwright';
import fs from 'fs';
const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };
const DB_OPS = l => !['once', 'signIn', 'signOut'].includes(l.op);

async function open(browser) {
  const ctx = await browser.newContext();
  await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  await page.addInitScript(FAKE);
  await page.addInitScript(`window.__fake.addAccount('tester@bwquote.local','pw');`);
  await page.goto('http://localhost:3737/', { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('tester@bwquote.local', 'pw'));
  await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
  await page.waitForTimeout(300);
  return { ctx, page, errs };
}

const browser = await chromium.launch();

// 1. Store: one record, one path
console.log('\n1. Party store');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async () => {
    window.__fake.clearLog();
    const p = await saveParty({ given: 'Thanh', family: 'Vu', phones: { p1: { value: '2065550147', isPrimary: true } } });
    return {
      id: p.id,
      writes: window.__fake.log().filter(l => !['once', 'signIn', 'signOut'].includes(l.op)),
      stored: window.__fake.get('parties/' + p.id),
      inMemory: _parties.length,
      ownerSet: !!p.ownerUid,
      prov: p._prov && p._prov.src,
      stamped: !!(p.createdAt && p.createdBy && p.updatedAt),
    };
  });
  ok('exactly one write', r.writes.length === 1, r.writes);
  ok('set on its own path', r.writes[0].op === 'set' && r.writes[0].path === 'parties/' + r.id, r.writes[0]);
  ok('stored and in memory', !!r.stored && r.inMemory === 1, { stored: !!r.stored, n: r.inMemory });
  ok('ownerUid stamped from the signed-in user', r.ownerSet);
  ok('provenance recorded', r.prov === 'manual', r.prov);
  ok('audit stamps present', r.stamped);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 2. Validation
console.log('\n2. Validation');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async () => {
    const out = {};
    try { await saveParty({}); out.empty = 'accepted'; } catch (e) { out.empty = 'rejected'; }
    try { const p = await saveParty({ phones: { p1: { value: '2065550134' } } }); out.phoneOnly = !!p.id; } catch (e) { out.phoneOnly = false; }
    try { await saveContractRole({ recordType: 'cem' }); out.roleNoRecord = 'accepted'; } catch (e) { out.roleNoRecord = 'rejected'; }
    try { await saveContractRole({ recordType: 'cem', recordId: 1, partyId: null, designation: '' }); out.roleNoParty = 'accepted'; } catch (e) { out.roleNoParty = 'rejected'; }
    return out;
  });
  ok('an empty contact is refused', r.empty === 'rejected', r);
  ok('phone-only is enough to save', r.phoneOnly === true, r);
  ok('a role without a record is refused', r.roleNoRecord === 'rejected', r);
  ok('a role with neither party nor designation is refused', r.roleNoParty === 'rejected', r);
  await ctx.close();
}

// 3. Dan and Ruth: three contracts, two people
console.log('\n3. Dan & Ruth — the case that proves the model');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async () => {
    const bob = await saveParty({ given: 'Dan', family: 'Prescott' });
    const mary = await saveParty({ given: 'Ruth', family: 'Prescott' });
    await saveContractRole({ partyId: bob.id, recordType: 'ric', recordId: 100, role: 'purchaser', financiallyLiable: true });
    await saveContractRole({ partyId: mary.id, recordType: 'ric', recordId: 100, role: 'co-purchaser', financiallyLiable: true });
    await saveContractRole({ partyId: bob.id, recordType: 'ga', recordId: 200, role: 'insured' });
    await saveContractRole({ partyId: bob.id, recordType: 'ga', recordId: 200, role: 'policy-owner' });
    await saveContractRole({ partyId: mary.id, recordType: 'ga', recordId: 200, role: 'beneficiary' });
    await saveContractRole({ partyId: mary.id, recordType: 'ga', recordId: 300, role: 'insured' });
    await saveContractRole({ partyId: mary.id, recordType: 'ga', recordId: 300, role: 'policy-owner' });
    await saveContractRole({ partyId: bob.id, recordType: 'ga', recordId: 300, role: 'beneficiary' });
    return {
      bobRoles: bwRolesForParty(bob.id).map(x => x.recordType + ':' + x.recordId + ':' + x.role).sort(),
      ric: bwRolesForRecord('ric', 100).map(x => x.role).sort(),
      hisPolicy: bwRolesForRecord('ga', 200).map(x => x.role).sort(),
      herPolicy: bwRolesForRecord('ga', 300).map(x => x.role).sort(),
      records: Object.keys(window.__fake.get('contractRoles') || {}).length,
    };
  });
  // 8 rows: RIC purchaser + co-purchaser, then insured/policy-owner/beneficiary on each policy
  ok('eight role rows, one node each', r.records === 8, r.records);
  ok('Dan is on three records in four roles', r.bobRoles.length === 4, r.bobRoles);
  ok('the RIC has purchaser + co-purchaser', r.ric.join() === 'co-purchaser,purchaser', r.ric);
  ok('his policy: insured, owner, beneficiary', r.hisPolicy.join() === 'beneficiary,insured,policy-owner', r.hisPolicy);
  ok('her policy is separate and complete', r.herPolicy.join() === 'beneficiary,insured,policy-owner', r.herPolicy);
  await ctx.close();
}

// 4. Estate beneficiary
console.log('\n4. Non-person beneficiary');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async () => {
    const m = await saveParty({ given: 'Ruth', family: 'Solo' });
    const role = await saveContractRole({ partyId: null, designation: 'Estate of the insured', recordType: 'ga', recordId: 400, role: 'beneficiary' });
    return { saved: !!role.id, onRecord: bwRolesForRecord('ga', 400).map(x => x.designation), byParty: bwRolesForParty(m.id).length };
  });
  ok('a designation-only role saves', r.saved);
  ok('it appears on the record', r.onRecord.join() === 'Estate of the insured', r.onRecord);
  ok('and is not attributed to a party', r.byParty === 0, r.byParty);
  await ctx.close();
}

// 5. Delete refused while linked
console.log('\n5. Referential safety');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async () => {
    const p = await saveParty({ given: 'Linked', family: 'Person' });
    const role = await saveContractRole({ partyId: p.id, recordType: 'cem', recordId: 500, role: 'purchaser' });
    let blocked = false;
    try { await deleteParty(p.id); } catch (e) { blocked = true; }
    await deleteContractRole(role.id);
    let after = false;
    try { await deleteParty(p.id); after = true; } catch (e) {}
    return { blocked, after, remaining: Object.keys(window.__fake.get('parties') || {}).length };
  });
  ok('delete refused while a role references the contact', r.blocked);
  ok('allowed once the role is gone', r.after);
  ok('record actually removed', r.remaining === 0, r.remaining);
  await ctx.close();
}

// 6. Salutation + duplicates
console.log('\n6. Salutation and duplicates');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async () => {
    const single = bwDefaultSalutation({ given: 'Dan' });
    const couple = bwDefaultSalutation({ given: 'Dan' }, { given: 'Ruth' });
    const nick = bwDefaultSalutation({ given: 'Robert', nickname: 'Dan' });
    await saveParty({ given: 'Robert', family: 'Bradley' });
    return {
      single, couple, nick,
      dupExact: bwFindPossibleDuplicates({ given: 'Robert', family: 'Bradley' }).length,
      dupInitial: bwFindPossibleDuplicates({ given: 'Rob', family: 'Bradley' }).length,
      dupOther: bwFindPossibleDuplicates({ given: 'Susan', family: 'Nguyen' }).length,
    };
  });
  ok('single salutation', r.single === 'Dear Dan,', r.single);
  ok('couple salutation', r.couple === 'Dear Dan & Ruth,', r.couple);
  ok('prefers the nickname', r.nick === 'Dear Dan,', r.nick);
  ok('flags an exact duplicate', r.dupExact === 1, r.dupExact);
  ok('flags a likely duplicate on first initial', r.dupInitial === 1, r.dupInitial);
  ok('does not flag an unrelated name', r.dupOther === 0, r.dupOther);
  await ctx.close();
}

// 7. UI end to end
console.log('\n7. Contacts UI');
{
  const { ctx, page, errs } = await open(browser);
  await page.evaluate(() => { location.hash = '#contacts'; });
  await page.waitForTimeout(250);
  const empty = await page.evaluate(() => ({
    visible: [...document.querySelectorAll('.section')].filter(s => s.offsetParent !== null).map(s => s.id),
    body: document.getElementById('contactsList').textContent,
  }));
  ok('#contacts routes to the section', empty.visible.includes('section-contacts'), empty.visible);
  ok('empty state explains what to do', /New Contact/.test(empty.body), empty.body.slice(0, 80));

  await page.click('button:has-text("+ New Contact")');
  await page.fill('#ceG', 'Thanh');
  await page.fill('#ceF', 'Vu');
  await page.waitForTimeout(150);
  const autoSal = await page.inputValue('#ceSal');
  ok('salutation auto-fills while typing', autoSal === 'Dear Thanh,', autoSal);

  await page.fill('#cePh', '(206) 555-0147');
  await page.fill('#ceEm', 'thanh@example.com');
  await page.click('button:has-text("Save Contact")');
  await page.waitForTimeout(400);

  const saved = await page.evaluate(() => {
    const p = _parties[0];
    return {
      count: _parties.length,
      name: bwPartyName(p),
      phoneStored: _bwPrimary(p.phones),
      listText: document.getElementById('contactsList').textContent,
      editorClosed: getComputedStyle(document.getElementById('contactEditor')).display === 'none',
    };
  });
  ok('contact created', saved.count === 1 && saved.name === 'Thanh Vu', saved);
  ok('phone stored as digits only', saved.phoneStored === '2065550147', saved.phoneStored);
  ok('list shows it formatted', /\(206\) 555-0147/.test(saved.listText), saved.listText.slice(0, 120));
  ok('editor closed on save', saved.editorClosed);

  // Driven through the box's own oninput handler rather than by poking the value and calling
  // the renderer: since sprint-04 Track B the search term lives in the view model (and the URL),
  // not in the DOM, so setting .value alone no longer means anything. Dispatching the event is
  // what a keystroke actually does.
  const search = await page.evaluate(async () => {
    await saveParty({ given: 'Nina', family: 'Prescott' });
    const box = document.getElementById('contactSearch');
    const type = (v) => { box.value = v; box.dispatchEvent(new Event('input', { bubbles: true })); };
    type('prescott');
    const a = document.getElementById('contactsList').textContent;
    type('5550147');
    const b = document.getElementById('contactsList').textContent;
    type('');
    return { byName: /Nina Prescott/.test(a) && !/Thanh Vu/.test(a), byDigits: /Thanh Vu/.test(b) && !/Nina Prescott/.test(b) };
  });
  ok('search by name', search.byName);
  ok('search by unformatted phone digits', search.byDigits);

  const edited = await page.evaluate(async () => {
    const id = _parties.find(p => p.family === 'Vu').id;
    openContactEditor(id);
    const title = document.getElementById('contactEditorTitle').textContent;
    const prefilled = document.getElementById('ceG').value;
    const delShown = getComputedStyle(document.getElementById('ceDelete')).display !== 'none';
    document.getElementById('ceN').value = 'Mo';
    submitContactEditor();
    await new Promise(r => setTimeout(r, 300));
    return { title, prefilled, delShown, nickname: bwPartyById(id).nickname, count: _parties.length };
  });
  ok('editor opens prefilled', edited.title === 'Edit Contact' && edited.prefilled === 'Thanh', edited);
  ok('delete offered only when editing', edited.delShown);
  ok('edit updates in place, no duplicate', edited.nickname === 'Mo' && edited.count === 2, edited);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 8. Remote changes
console.log('\n8. Randy edits arrive live');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async () => {
    await _fbDB.ref('parties/remote1').set({ id: 'remote1', given: 'Randy', family: 'Added', ownerUid: 'uid_randy@bwquote.local' });
    await new Promise(r => setTimeout(r, 200));
    const seen = _parties.map(p => bwPartyName(p));
    await _fbDB.ref('parties/remote1').remove();
    await new Promise(r => setTimeout(r, 200));
    return { seen, after: _parties.length };
  });
  ok('a contact added elsewhere appears', r.seen.join() === 'Randy Added', r.seen);
  ok('and disappears when removed', r.after === 0, r.after);
  await ctx.close();
}

// 9. Quoting is untouched
console.log('\n9. No collateral damage');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async () => {
    window.__fake.clearLog();
    await saveQuoteRecord('cem', { id: 777, label: 'Still Works', total: 1, date: 'x', state: {} }, 'Still Works');
    return {
      writes: window.__fake.log().filter(l => !['once', 'signIn', 'signOut'].includes(l.op)),
      quotes: (_cemSavedQuotes || []).length,
      parties: _parties.length,
    };
  });
  ok('saving a quote still writes one record', r.writes.length === 1 && /^quotes\/cem\//.test(r.writes[0].path), r.writes);
  ok('quote list unaffected by the contact layer', r.quotes === 1, r.quotes);
  ok('no stray parties created', r.parties === 0, r.parties);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
