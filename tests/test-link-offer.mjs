// Offered linking: read the people the form already names, ask before creating anything.
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
  page.on('dialog', async d => { if (d.type() === 'prompt') await d.accept('T'); else await d.accept(); });
  await page.addInitScript(FAKE);
  await page.addInitScript(`window.__fake.addAccount('t@bwquote.local','pw');`);
  await page.goto('http://localhost:' + (process.env.PORT || 3737) + '/', { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('t@bwquote.local', 'pw'));
  await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
  await page.waitForTimeout(300);
  return { ctx, page, errs };
}

const browser = await chromium.launch();

// 1. Reading people off a CIRGAS — the case that needs it most
console.log('\n1. Reading the CIRGAS form');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async () => {
    show('an-contract', null);
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    set('anPurchName', 'Minh Nguyen');
    set('anPurchCellPhone', '(206) 555-0147');
    set('anPurchEmail', 'minh@example.com');
    set('anPurchStreet', '12345 SW 150th St');
    set('anPurchCity', 'Burien'); set('anPurchState', 'WA'); set('anPurchZip', '98168');
    set('anCoPurchName', 'Kim Nguyen');
    set('anDecFirst', 'Linh'); set('anDecLast', 'Nguyen');
    const people = bwPeopleOnRecord('an');
    return { people, roles: people.map(p => p.role), names: people.map(p => p.given + ' ' + p.family) };
  });
  ok('finds all three people', r.people.length === 3, r.names);
  ok('purchaser, co-purchaser, decedent', r.roles.join(',') === 'purchaser,co-purchaser,decedent', r.roles);
  ok('names split correctly', r.names.join('|') === 'Minh Nguyen|Kim Nguyen|Linh Nguyen', r.names);
  ok('carries the phone', r.people[0].phone === '(206) 555-0147', r.people[0]);
  ok('carries the email', r.people[0].email === 'minh@example.com', r.people[0]);
  ok('carries the address', r.people[0].city === 'Burien' && r.people[0].zip === '98168', r.people[0]);
  ok('decedent has no contact details, correctly', !r.people[2].phone && !r.people[2].email, r.people[2]);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 2. Offered, never automatic
console.log('\n2. Offered, not automatic');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async () => {
    show('an-contract', null);
    document.getElementById('anPurchName').value = 'Minh Nguyen';
    document.getElementById('anDecFirst').value = 'Linh';
    document.getElementById('anDecLast').value = 'Nguyen';
    saveAnContract();
    await new Promise(r => setTimeout(r, 400));
    const dialogUp = getComputedStyle(document.getElementById('linkOffer')).display !== 'none';
    const partiesBefore = _parties.length;
    const rolesBefore = Object.keys(window.__fake.get('contractRoles') || {}).length;
    return { dialogUp, partiesBefore, rolesBefore, body: document.getElementById('linkOfferBody').textContent.replace(/\s+/g, ' ') };
  });
  ok('the dialog is shown', r.dialogUp);
  ok('nothing created before you confirm', r.partiesBefore === 0 && r.rolesBefore === 0, r);
  ok('lists both people with roles', /Minh Nguyen/.test(r.body) && /Linh Nguyen/.test(r.body) && /Decedent/.test(r.body), r.body);
  ok('marks them as new', /new/.test(r.body), r.body);
  await ctx.close();
}

// 3. "Not now" creates nothing
console.log('\n3. Declining');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async () => {
    show('an-contract', null);
    document.getElementById('anPurchName').value = 'Declined Person';
    saveAnContract();
    await new Promise(r => setTimeout(r, 350));
    closeLinkOffer();
    await new Promise(r => setTimeout(r, 200));
    return {
      parties: _parties.length,
      roles: Object.keys(window.__fake.get('contractRoles') || {}).length,
      quotes: Object.keys(window.__fake.get('quotes/an') || {}).length,
    };
  });
  ok('no contacts created', r.parties === 0, r.parties);
  ok('no roles created', r.roles === 0, r.roles);
  ok('but the contract still saved', r.quotes === 1, r.quotes);
  await ctx.close();
}

// 4. Confirming creates and links
console.log('\n4. Confirming');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async () => {
    show('an-contract', null);
    const set = (id, v) => { document.getElementById(id).value = v; };
    set('anPurchName', 'Minh Nguyen');
    set('anPurchCellPhone', '2065550147');
    set('anPurchEmail', 'minh@example.com');
    set('anCoPurchName', 'Kim Nguyen');
    set('anDecFirst', 'Linh'); set('anDecLast', 'Nguyen');
    saveAnContract();
    await new Promise(r => setTimeout(r, 350));
    bwConfirmLinkOffer();
    await new Promise(r => setTimeout(r, 600));
    const recId = _anSavedContracts[0].id;
    const roles = bwRolesForRecord('an', recId);
    const minh = _parties.find(p => p.given === 'Minh');
    return {
      parties: _parties.map(p => bwPartyName(p)).sort(),
      roles: roles.map(x => x.role).sort(),
      phoneStored: minh && _bwPrimary(minh.phones),
      emailStored: minh && _bwPrimary(minh.emails),
      prov: minh && minh._prov && minh._prov.src,
      salutation: minh && minh.salutation,
    };
  });
  ok('three contacts created', r.parties.join('|') === 'Kim Nguyen|Linh Nguyen|Minh Nguyen', r.parties);
  ok('all three linked to the contract', r.roles.join(',') === 'co-purchaser,decedent,purchaser', r.roles);
  ok('phone carried across as digits', r.phoneStored === '2065550147', r.phoneStored);
  ok('email carried across', r.emailStored === 'minh@example.com', r.emailStored);
  ok('provenance says quote_tool', r.prov === 'quote_tool', r.prov);
  ok('salutation auto-filled', r.salutation === 'Dear Minh,', r.salutation);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 5. Existing contacts are matched, not duplicated
console.log('\n5. No duplicates');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async () => {
    const existing = await saveParty({ given: 'Minh', family: 'Nguyen', phones: { p1: { value: '2065550000', isPrimary: true } } });
    show('an-contract', null);
    document.getElementById('anPurchName').value = 'Minh Nguyen';
    saveAnContract();
    await new Promise(r => setTimeout(r, 350));
    const body = document.getElementById('linkOfferBody').textContent.replace(/\s+/g, ' ');
    bwConfirmLinkOffer();
    await new Promise(r => setTimeout(r, 500));
    return {
      body,
      partyCount: _parties.length,
      linkedToExisting: bwRolesForParty(existing.id).length,
      phoneUnchanged: _bwPrimary(bwPartyById(existing.id).phones),
    };
  });
  ok('marked as an existing contact', /existing contact/.test(r.body), r.body);
  ok('no duplicate created', r.partyCount === 1, r.partyCount);
  ok('linked to the one that existed', r.linkedToExisting === 1, r.linkedToExisting);
  ok('their details were not overwritten', r.phoneUnchanged === '2065550000', r.phoneUnchanged);
  await ctx.close();
}

// 6. Unchecking a row
console.log('\n6. Choosing which');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async () => {
    show('an-contract', null);
    document.getElementById('anPurchName').value = 'Keep Me';
    document.getElementById('anDecFirst').value = 'Skip';
    document.getElementById('anDecLast').value = 'Me';
    saveAnContract();
    await new Promise(r => setTimeout(r, 350));
    _bwOffer.rows.find(x => x.person.role === 'decedent').checked = false;
    bwConfirmLinkOffer();
    await new Promise(r => setTimeout(r, 500));
    return { parties: _parties.map(p => bwPartyName(p)) };
  });
  ok('only the checked person is created', r.parties.join('|') === 'Keep Me', r.parties);
  await ctx.close();
}

// 7. Nothing typed, nothing offered
console.log('\n7. Quiet when there is nothing to offer');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async () => {
    show('cem-quote', null);
    const g = document.getElementById('qGarden');
    g.value = [...g.options].find(o => /\|/.test(o.value)).value;
    cemUpdateD();
    await new Promise(r => setTimeout(r, 150));
    saveCemQuote();
    await new Promise(r => setTimeout(r, 400));
    return { shown: getComputedStyle(document.getElementById('linkOffer')).display !== 'none' };
  });
  ok('no dialog when no name was typed', r.shown === false);
  await ctx.close();
}

// 8. Already linked is not offered again
console.log('\n8. Not offered twice');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async () => {
    const p = await saveParty({ given: 'Thanh', family: 'Vu' });
    show('cem-quote', null);
    const g = document.getElementById('qGarden');
    g.value = [...g.options].find(o => /\|/.test(o.value)).value;
    cemUpdateD();
    bwSetPendingLink('cem', p.id);       // manual link, purchaser
    await new Promise(r => setTimeout(r, 150));
    saveCemQuote();
    await new Promise(r => setTimeout(r, 450));
    return {
      shown: getComputedStyle(document.getElementById('linkOffer')).display !== 'none',
      roles: bwRolesForParty(p.id).length,
    };
  });
  ok('no offer for someone already linked in that role', r.shown === false, r);
  ok('and only one role exists', r.roles === 1, r.roles);
  await ctx.close();
}

// 9. GA — insured and purchaser can be the same person in two roles
console.log('\n9. GA: one person, two roles');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async () => {
    show('ga-contract', null);
    document.getElementById('gaInsuredName').value = 'Dan Prescott';
    document.getElementById('gaPurchaserName').value = 'Dan Prescott';
    document.getElementById('gaBenefName').value = 'Ruth Prescott';
    saveGaContract();
    await new Promise(r => setTimeout(r, 350));
    bwConfirmLinkOffer();
    await new Promise(r => setTimeout(r, 600));
    const bob = _parties.find(p => p.given === 'Dan');
    const recId = _gaSavedContracts[0].id;
    return {
      parties: _parties.map(p => bwPartyName(p)).sort(),
      bobRoles: bwRolesForParty(bob.id).map(x => x.role).sort(),
      onRecord: bwRolesForRecord('ga', recId).map(x => x.role).sort(),
    };
  });
  ok('Dan created once, not twice', r.parties.join('|') === 'Dan Prescott|Ruth Prescott', r.parties);
  ok('and holds both roles', r.bobRoles.join(',') === 'insured,purchaser', r.bobRoles);
  ok('beneficiary linked too', r.onRecord.join(',') === 'beneficiary,insured,purchaser', r.onRecord);
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
