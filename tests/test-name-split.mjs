// Name splitting.
//
// Ships with a SYNTHETIC case set — no real client data, safe for a public repo.
// If scratch/name-fixtures.local.mjs exists (gitignored), its real-record cases are used
// instead, so the parser is still validated against the strings Martice actually types.
// Both sets cover the same shapes: & / and / or separators, shared-surname backfill,
// trailing initial as middle initial, SURNAME-first, hyphens, apostrophes, multi-token
// givens, "Family" suffix, bare single word, and empty input.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { BASE } from './_base.mjs';

const SYNTHETIC = {
  LABEL: 'synthetic',
  // [input, expected "given/family" per person]
  CASES: [
    // couples — the case that prompted this
    ['Aaron & Nina Prescott',          ['Aaron/Prescott', 'Nina/Prescott']],
    ['John Smith & Jane Smith',        ['John/Smith', 'Jane/Smith']],
    ['John Smith and Jane Doe',        ['John/Smith', 'Jane/Doe']],
    ['Peter H. & Clara J. Whitfield',  ['Peter/Whitfield', 'Clara/Whitfield']],
    ['Dan and Ruth Prescott',          ['Dan/Prescott', 'Ruth/Prescott']],
    ['Edith A or Harold T Vance',      ['Edith/Vance', 'Harold/Vance']],
    ['Wai Kit Cheung & Xiuling Zhou',  ['Wai/Cheung', 'Xiuling/Zhou']],
    // single people
    ['Thanh Vu',                       ['Thanh/Vu']],
    ['Irene Novak',                    ['Irene/Novak']],
    ['Diane Ruth Holloway',            ['Diane/Holloway']],
    ['Nancy Jean Calloway',            ['Nancy/Calloway']],
    ['Tavita Malietoa Faleolo',        ['Tavita/Faleolo']],
    ["Sina'ese Tui",                   ["Sina'ese/Tui"]],
    ['Marjorie Ashby-Vaughn',          ['Marjorie/Ashby-Vaughn']],
    ['Kim Lan Pham',                   ['Kim/Pham']],
    // household labels
    ['Smith Family',                   ['/Smith']],
    ['David Ng Family',                ['David/Ng']],
    // surname-first
    ['VANCE, EDITH A',                 ['EDITH/VANCE']],
    // degenerate
    ['Cher',                           ['/Cher']],
    ['',                               []],
    ['   ',                            []],
  ],
  MIDDLES: {
    couple: 'Peter H. & Clara J. Whitfield',
    coupleMiddles: ['H.', 'J.'],
    single: 'Diane Ruth Holloway',
    singleMiddle: 'Ruth',
  },
  COUPLE: {
    input: 'Aaron & Nina Prescott',
    parties: ['Aaron Prescott', 'Nina Prescott'],
    people: 'Aaron Prescott:purchaser|Nina Prescott:purchaser',
    match: [/Aaron Prescott/, /Nina Prescott/],
  },
  HOUSEHOLD: {
    input: 'Peter H. & Clara J. Whitfield',
    phone: '2065550147',
    city: 'Seattle',
    first: 'Peter',
    second: 'Clara',
    rendered: /Peter H\. Whitfield/,
  },
  DUPLICATE: 'Dan Prescott',
};

// Prefer the local real-record fixture when it exists.
const LOCAL = path.join(process.cwd(), 'scratch', 'name-fixtures.local.mjs');
let FIX = SYNTHETIC;
if (fs.existsSync(LOCAL)) {
  try {
    const m = await import(pathToFileURL(LOCAL).href);
    FIX = { ...SYNTHETIC, ...m };
  } catch (e) {
    console.log('  (local fixture present but failed to load: ' + e.message + ')');
  }
}
console.log('case set: ' + FIX.LABEL + '  (' + FIX.CASES.length + ' cases)');

const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        got ' + JSON.stringify(x) : '')); } };

const browser = await chromium.launch();
const ctx = await browser.newContext();
await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
page.on('dialog', async d => { if (d.type() === 'prompt') await d.accept('T'); else await d.accept(); });
await page.addInitScript(FAKE);
await page.addInitScript(`window.__fake.addAccount('t@bwquote.local','pw');`);
await page.goto(BASE, { waitUntil: 'load', timeout: 120000 });
await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('t@bwquote.local', 'pw'));
await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });

const CASES = FIX.CASES;

console.log('\n1. Parsing');
{
  const got = await page.evaluate((cases) => cases.map(([input]) =>
    bwSplitPeople(input).map(p => (p.given || '') + '/' + (p.family || ''))
  ), CASES);
  CASES.forEach(([input, want], i) => {
    ok(JSON.stringify(input).padEnd(32) + '→ ' + want.join(' + '), JSON.stringify(got[i]) === JSON.stringify(want), got[i]);
  });
}

console.log('\n2. Middle names kept');
{
  const M = FIX.MIDDLES;
  const r = await page.evaluate((m) => ({
    couple: bwSplitPeople(m.couple),
    single: bwSplitPeople(m.single),
  }), M);
  ok('middle initial retained', r.couple[0].middle === M.coupleMiddles[0] && r.couple[1].middle === M.coupleMiddles[1], r.couple);
  ok('middle name retained', r.single[0].middle === M.singleMiddle, r.single);
}

console.log('\n3. A couple in one field becomes two contacts');
{
  const C = FIX.COUPLE;
  const r = await page.evaluate(async (c) => {
    show('ric-contract', null);
    document.getElementById('ricName').value = c.input;
    const people = bwPeopleOnRecord('ric');
    saveRicContract();
    await new Promise(r => setTimeout(r, 350));
    const body = document.getElementById('linkOfferBody').textContent.replace(/\s+/g, ' ');
    bwConfirmLinkOffer();
    await new Promise(r => setTimeout(r, 600));
    const recId = _ricSavedContracts[0].id;
    return {
      people: people.map(p => p.given + ' ' + p.family + ':' + p.role),
      body,
      parties: _parties.map(p => bwPartyName(p)).sort(),
      roles: bwRolesForRecord('ric', recId).map(x => x.role).sort(),
    };
  }, C);
  ok('read as two purchasers', r.people.join('|') === C.people, r.people);
  ok('both offered by name', C.match[0].test(r.body) && C.match[1].test(r.body), r.body);
  ok('two contacts created', r.parties.join('|') === C.parties.join('|'), r.parties);
  ok('both linked as purchaser', r.roles.join(',') === 'purchaser,purchaser', r.roles);
}

console.log('\n4. Shared details apply to both');
{
  const H = FIX.HOUSEHOLD;
  const r = await page.evaluate(async (h) => {
    show('an-contract', null);
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    set('anPurchName', h.input);
    set('anPurchCellPhone', h.phone);
    set('anPurchCity', h.city);
    saveAnContract();
    await new Promise(r => setTimeout(r, 350));
    bwConfirmLinkOffer();
    await new Promise(r => setTimeout(r, 600));
    const a = _parties.find(p => p.given === h.first);
    const b = _parties.find(p => p.given === h.second);
    return {
      names: [bwPartyName(a), bwPartyName(b)],
      firstPhone: _bwPrimary(a.phones),
      secondPhone: _bwPrimary(b.phones),
      secondCity: b.addresses ? b.addresses[Object.keys(b.addresses)[0]].city : null,
    };
  }, H);
  ok('both carry the household phone', r.firstPhone === H.phone && r.secondPhone === H.phone, r);
  ok('and the household address', r.secondCity === H.city, r.secondCity);
  ok('middle initials preserved on the contact', H.rendered.test(r.names[0]), r.names);
}

console.log('\n5. Duplicates within one record collapse');
{
  const r = await page.evaluate(async (dup) => {
    show('ga-contract', null);
    document.getElementById('gaInsuredName').value = dup;
    document.getElementById('gaInsuredName2').value = dup;   // same person, same role
    const people = bwPeopleOnRecord('ga');
    return people.map(p => p.given + ' ' + p.family + ':' + p.role);
  }, FIX.DUPLICATE);
  ok('the same name in the same role appears once', r.length === 1, r);
}

ok('no page errors', errs.length === 0, errs);
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
