// Contact auto-import between the contacts layer and the four contract lanes (s26 Track A).
//
// Two directions, both fill-blanks-only:
//   1. linking a contact fills that role's EMPTY address/phone/email fields from the party;
//   2. saving a contract copies typed values back onto the linked party, only where the
//      party's own phones/emails/addresses sub-object is empty.
//
// The traps this pins:
//   * a typed field must survive a link — never overwritten;
//   * a role change fills the NEW block and leaves the old one alone;
//   * a CIRGAS co-purchaser lands in anCoPurch*, not anPurch*;
//   * REOPENING a saved record must NOT fill — the record's own fields are authoritative,
//     and a fill there would mutate a contract the counselor merely opened;
//   * write-back never touches a party value that already exists, and a save that changes
//     nothing issues NO party write at all (counted in the fake store's log).
//
// Fake Firebase only — production is never contacted. Fixtures are synthetic by rule:
// 555-range phones, @example.com, invented names.
import { chromium } from 'playwright';
import fs from 'fs';
import { BASE } from './_base.mjs';
const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };

async function open(browser, label) {
  const ctx = await browser.newContext();
  await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  page.on('dialog', async d => { if (d.type() === 'prompt') await d.accept(label || 'Autofill Test'); else await d.accept(); });
  await page.addInitScript(FAKE);
  await page.addInitScript(`window.__fake.addAccount('t@bwquote.local','pw');`);
  await page.goto(BASE + 'index.html', { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('t@bwquote.local', 'pw'));
  await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
  await page.waitForTimeout(300);
  return { ctx, page, errs };
}

// One fully-populated synthetic party. 555 phone, @example.com, invented name.
const FULL = {
  given: 'Dolores', family: 'Renwick',
  phones: { p1: { value: '2065550143', type: 'mobile', isPrimary: true, note: '' } },
  emails: { e1: { value: 'dolores.renwick@example.com', isPrimary: true, note: '' } },
  addresses: { a1: { type: 'mailing', street1: '4218 Marigold Ln', street2: '', city: 'Renton',
                     state: 'WA', postal: '98058', isPrimary: true } }
};

const browser = await chromium.launch();

// ── 1. Linking fills the empty block, in all four lanes ───────────────────────────────
console.log('\n1. Linking a contact fills the empty block (ric / an / ga / cp)');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async (P) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const v = id => { const e = document.getElementById(id); return e ? e.value : null; };
    const p = await saveParty(JSON.parse(JSON.stringify(P)));
    const out = {};
    for (const [type, section, ids] of [
      ['ric', 'ric-contract', ['ricStreet', 'ricCity', 'ricZip', 'ricPhone', 'ricDayPhone']],
      ['an',  'an-contract',  ['anPurchStreet', 'anPurchCity', 'anPurchState', 'anPurchZip', 'anPurchHomePhone', 'anPurchEmail']],
      ['ga',  'ga-contract',  ['gaInsuredStreet', 'gaInsuredCity', 'gaInsuredState', 'gaInsuredZip', 'gaInsuredPhone']],
      ['cp',  'cp-contract',  ['cpAddress', 'cpCity', 'cpState', 'cpZip', 'cpPhone']],
    ]) {
      show(section, null);
      await sleep(60);
      bwAddPendingLink(type, p.id);
      const got = {}; ids.forEach(i => { got[i] = v(i); });
      out[type] = got;
    }
    return out;
  }, FULL);

  ok('ric street/city/zip filled', r.ric.ricStreet === '4218 Marigold Ln' && r.ric.ricCity === 'Renton' && r.ric.ricZip === '98058', r.ric);
  ok('ric phone formatted from digits', r.ric.ricPhone === '(206) 555-0143', r.ric);
  ok('ric combined Email/Day-Phone took the email', r.ric.ricDayPhone === 'dolores.renwick@example.com', r.ric);
  ok('an purchaser block filled incl. email', r.an.anPurchStreet === '4218 Marigold Ln' && r.an.anPurchCity === 'Renton'
      && r.an.anPurchZip === '98058' && r.an.anPurchHomePhone === '(206) 555-0143'
      && r.an.anPurchEmail === 'dolores.renwick@example.com', r.an);
  ok('ga insured block filled (default role maps to insured)', r.ga.gaInsuredStreet === '4218 Marigold Ln'
      && r.ga.gaInsuredCity === 'Renton' && r.ga.gaInsuredState === 'WA' && r.ga.gaInsuredZip === '98058'
      && r.ga.gaInsuredPhone === '(206) 555-0143', r.ga);
  ok('cp block 1 (Funeral Recipient) filled', r.cp.cpAddress === '4218 Marigold Ln' && r.cp.cpCity === 'Renton'
      && r.cp.cpState === 'WA' && r.cp.cpZip === '98058' && r.cp.cpPhone === '(206) 555-0143', r.cp);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ── 2. A typed field is never overwritten ─────────────────────────────────────────────
console.log('\n2. A field the counselor already typed survives the link');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async (P) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const p = await saveParty(JSON.parse(JSON.stringify(P)));
    show('ric-contract', null); await sleep(60);
    document.getElementById('ricStreet').value = '77 Typed First St';
    document.getElementById('ricPhone').value = '(206) 555-0199';
    bwAddPendingLink('ric', p.id);
    return {
      street: document.getElementById('ricStreet').value,
      phone:  document.getElementById('ricPhone').value,
      city:   document.getElementById('ricCity').value,   // was blank → still fills
      zip:    document.getElementById('ricZip').value,
    };
  }, FULL);
  ok('typed street kept', r.street === '77 Typed First St', r);
  ok('typed phone kept', r.phone === '(206) 555-0199', r);
  ok('blank city still filled alongside', r.city === 'Renton', r);
  ok('blank zip still filled alongside', r.zip === '98058', r);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ── 3. Role change fills the new block, leaves the old one untouched ──────────────────
console.log('\n3. Changing a chip\'s role fills the NEW block only');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async (P) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const v = id => document.getElementById(id).value;
    const p = await saveParty(JSON.parse(JSON.stringify(P)));
    show('an-contract', null); await sleep(60);
    bwAddPendingLink('an', p.id);                       // purchaser → anPurch*
    const before = { s: v('anPurchStreet'), co: v('anCoPurchStreet') };
    bwSetPendingLinkRole('an', 0, 'co-purchaser');      // → anCoPurch*
    return {
      before,
      purchStreet: v('anPurchStreet'), purchPhone: v('anPurchHomePhone'),
      coStreet: v('anCoPurchStreet'), coCity: v('anCoPurchCity'),
      coZip: v('anCoPurchZip'), coPhone: v('anCoPurchHomePhone'), coEmail: v('anCoPurchEmail'),
    };
  }, FULL);
  ok('new (co-purchaser) block filled on role change', r.coStreet === '4218 Marigold Ln' && r.coCity === 'Renton'
      && r.coZip === '98058' && r.coPhone === '(206) 555-0143' && r.coEmail === 'dolores.renwick@example.com', r);
  ok('old (purchaser) block NOT cleared', r.purchStreet === '4218 Marigold Ln' && r.purchPhone === '(206) 555-0143', r);
  ok('co block really was empty before the change', r.before.co === '' && r.before.s === '4218 Marigold Ln', r.before);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ── 4. A CIRGAS co-purchaser lands in anCoPurch*, not anPurch* ────────────────────────
console.log('\n4. CIRGAS: a second person linked as co-purchaser lands in the co block');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async (P) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const v = id => document.getElementById(id).value;
    const a = await saveParty(JSON.parse(JSON.stringify(P)));
    const b = await saveParty({
      given: 'Harold', family: 'Renwick',
      phones: { p1: { value: '2065550176', type: 'mobile', isPrimary: true, note: '' } },
      emails: { e1: { value: 'harold.renwick@example.com', isPrimary: true, note: '' } },
      addresses: { a1: { type: 'mailing', street1: '910 Cedar Hollow Rd', street2: '', city: 'Kent',
                         state: 'WA', postal: '98032', isPrimary: true } }
    });
    show('an-contract', null); await sleep(60);
    bwAddPendingLink('an', a.id);
    bwAddPendingLink('an', b.id, 'co-purchaser');
    return {
      purchStreet: v('anPurchStreet'), purchPhone: v('anPurchHomePhone'), purchEmail: v('anPurchEmail'),
      coStreet: v('anCoPurchStreet'), coCity: v('anCoPurchCity'), coZip: v('anCoPurchZip'),
      coPhone: v('anCoPurchHomePhone'), coEmail: v('anCoPurchEmail'),
    };
  }, FULL);
  ok('co-purchaser address in anCoPurch*', r.coStreet === '910 Cedar Hollow Rd' && r.coCity === 'Kent' && r.coZip === '98032', r);
  ok('co-purchaser phone/email in anCoPurch*', r.coPhone === '(206) 555-0176' && r.coEmail === 'harold.renwick@example.com', r);
  ok('purchaser block still holds the FIRST person', r.purchStreet === '4218 Marigold Ln'
      && r.purchPhone === '(206) 555-0143' && r.purchEmail === 'dolores.renwick@example.com', r);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ── 5. Reopening a saved record does NOT fill ─────────────────────────────────────────
console.log('\n5. Restoring a saved record does not fill anything');
{
  const { ctx, page, errs } = await open(browser, 'Autofill Restore');
  const r = await page.evaluate(async (P) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const v = id => document.getElementById(id).value;
    const p = await saveParty(JSON.parse(JSON.stringify(P)));
    show('ric-contract', null); await sleep(60);
    document.getElementById('ricName').value = 'Dolores Renwick';
    bwAddPendingLink('ric', p.id);
    // Blank the block back out so the SAVED record legitimately carries empty address fields.
    ['ricStreet', 'ricCity', 'ricZip', 'ricPhone', 'ricDayPhone'].forEach(i => { document.getElementById(i).value = ''; });
    saveRicContract();
    await sleep(700);
    const id = _ricSavedContracts[0].id;
    // Now clear the form entirely and reopen the record.
    ricClearAll();
    await sleep(60);
    loadSavedRicContract(id);
    await sleep(400);
    return {
      linked: bwPendingLinks('ric').length,
      street: v('ricStreet'), city: v('ricCity'), zip: v('ricZip'),
      phone: v('ricPhone'), day: v('ricDayPhone'),
    };
  }, FULL);
  ok('the link was restored', r.linked === 1, r);
  ok('restore left the address block empty', r.street === '' && r.city === '' && r.zip === '', r);
  ok('restore left phone/email empty', r.phone === '' && r.day === '', r);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ── 6. Write-back fills an EMPTY party from the form at save ──────────────────────────
console.log('\n6. Write-back: an empty party gains phone/email/address from the contract');
{
  const { ctx, page, errs } = await open(browser, 'Autofill Writeback');
  const r = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const bare = await saveParty({ given: 'Marisol', family: 'Aguirre' });
    show('an-contract', null); await sleep(60);
    bwAddPendingLink('an', bare.id);
    const set = (id, val) => { document.getElementById(id).value = val; };
    set('anPurchName', 'Marisol Aguirre');
    set('anPurchStreet', '1533 Aspen Ct'); set('anPurchCity', 'Auburn');
    set('anPurchState', 'WA'); set('anPurchZip', '98002');
    set('anPurchHomePhone', '(206) 555-0121');
    set('anPurchEmail', 'marisol.aguirre@example.com');
    saveAnContract();
    await sleep(800);
    const p = window.__fake.get('parties/' + bare.id);
    return {
      phone: p && p.phones ? Object.values(p.phones)[0].value : null,
      phoneKeys: p && p.phones ? Object.keys(p.phones) : [],
      email: p && p.emails ? Object.values(p.emails)[0].value : null,
      addr: p && p.addresses ? Object.values(p.addresses)[0] : null,
      addrKeys: p && p.addresses ? Object.keys(p.addresses) : [],
    };
  });
  ok('phone written back as DIGITS ONLY', r.phone === '2065550121', r);
  ok('phone stored under p1, no variant appended', r.phoneKeys.join(',') === 'p1', r);
  ok('email written back', r.email === 'marisol.aguirre@example.com', r);
  ok('address written back in the a1 mailing shape',
      !!r.addr && r.addr.street1 === '1533 Aspen Ct' && r.addr.city === 'Auburn'
      && r.addr.state === 'WA' && r.addr.postal === '98002' && r.addr.type === 'mailing'
      && r.addr.isPrimary === true && r.addr.street2 === '' && r.addrKeys.join(',') === 'a1', r);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ── 7. Write-back never overwrites, and a no-change save writes no party ──────────────
console.log('\n7. Write-back never overwrites an existing party value; a no-change save writes no party');
{
  const { ctx, page, errs } = await open(browser, 'Autofill NoChange');
  const r = await page.evaluate(async (P) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const full = await saveParty(JSON.parse(JSON.stringify(P)));
    show('an-contract', null); await sleep(60);
    bwAddPendingLink('an', full.id);              // fills the block from the party
    document.getElementById('anPurchName').value = 'Dolores Renwick';
    // Now type DIFFERENT values over the whole block. The party already holds its own, so
    // write-back must not touch a single one of them.
    const set = (id, val) => { document.getElementById(id).value = val; };
    set('anPurchStreet', '999 Different Ave'); set('anPurchCity', 'Tacoma');
    set('anPurchState', 'OR'); set('anPurchZip', '97201');
    set('anPurchHomePhone', '(206) 555-0188');
    set('anPurchEmail', 'someone.else@example.com');
    window.__fake.clearLog();
    saveAnContract();
    await sleep(800);
    const p = window.__fake.get('parties/' + full.id);
    const partyWrites = window.__fake.log().filter(e => e.op === 'set' && /^parties\//.test(e.path));
    return {
      phone: p && p.phones ? Object.values(p.phones)[0].value : null,
      email: p && p.emails ? Object.values(p.emails)[0].value : null,
      street: p && p.addresses ? Object.values(p.addresses)[0].street1 : null,
      state: p && p.addresses ? Object.values(p.addresses)[0].state : null,
      phoneKeys: p && p.phones ? Object.keys(p.phones) : [],
      addrKeys: p && p.addresses ? Object.keys(p.addresses) : [],
      partyWrites: partyWrites.length,
    };
  }, FULL);
  ok('existing party phone untouched', r.phone === '2065550143', r);
  ok('existing party email untouched', r.email === 'dolores.renwick@example.com', r);
  ok('existing party address untouched', r.street === '4218 Marigold Ln' && r.state === 'WA', r);
  ok('no p2/a2 variant appended', r.phoneKeys.join(',') === 'p1' && r.addrKeys.join(',') === 'a1', r);
  ok('a save that changes nothing issues NO party write', r.partyWrites === 0, r);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ── 8. The map is one table, and it is data ───────────────────────────────────────────
console.log('\n8. One declarative map drives both directions');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(() => {
    const bad = [];
    Object.keys(BW_LINK_FIELDS).forEach(type => {
      const cfg = BW_LINK_FIELDS[type];
      Object.keys(cfg.blocks).forEach(bk => {
        const b = cfg.blocks[bk];
        Object.keys(b).forEach(f => { if (!document.getElementById(b[f])) bad.push(type + '.' + bk + '.' + f + '=' + b[f]); });
      });
      Object.keys(cfg.roles).forEach(rc => {
        const target = cfg.roles[rc];
        if (target && !cfg.blocks[target]) bad.push(type + ' role ' + rc + ' → unknown block ' + target);
        if (!BW_ROLES.some(x => x.code === rc)) bad.push(type + ' role ' + rc + ' is not in BW_ROLES');
      });
      (cfg.order || []).forEach(bk => { if (!cfg.blocks[bk]) bad.push(type + ' order names unknown block ' + bk); });
    });
    return {
      bad,
      lanes: Object.keys(BW_LINK_FIELDS).sort().join(','),
      cpFallback: [_bwLinkBlockKey('cp', 'purchaser', 0), _bwLinkBlockKey('cp', 'purchaser', 1), _bwLinkBlockKey('cp', 'purchaser', 2)],
      ricCoPurch: _bwLinkBlockKey('ric', 'co-purchaser', 0),
      gaRoles: [_bwLinkBlockKey('ga', 'purchaser', 0), _bwLinkBlockKey('ga', 'policy-owner', 0), _bwLinkBlockKey('ga', 'beneficiary', 0)],
    };
  });
  ok('every mapped field id exists in the live form, and every role is a BW_ROLES code', r.bad.length === 0, r.bad);
  ok('the four contract lanes are mapped', r.lanes === 'an,cp,ga,ric', r);
  ok('cp falls back to link order: first → block 1, second → block 2, third → none',
      r.cpFallback[0] === 'recipient' && r.cpFallback[1] === 'purchaser' && r.cpFallback[2] === null, r.cpFallback);
  ok('ric co-purchaser is deliberately unmapped (one address block only)', r.ricCoPurch === null, r);
  ok('ga roles resolve to insured / owner / beneficiary',
      r.gaRoles.join(',') === 'insured,owner,beneficiary', r.gaRoles);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

await browser.close();
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
