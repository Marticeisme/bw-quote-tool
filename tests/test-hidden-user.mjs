// The chloe account (added 2026-10-26): full admin capabilities, but hidden from the non-admin.
//
// Martice: "it needs full capabilities like mine, keep it hidden from Randy". So chloe signs in,
// her name and title go on her paperwork, she sees every record like the admin — and Randy's
// view reads exactly as it did with two accounts: the contact owner filter still says "Martice",
// and nothing chloe owns shows up in his lists.
//
// Fake Firebase only — production is never contacted.
import { chromium } from 'playwright';
import fs from 'fs';
import { BASE } from './_base.mjs';

const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };

const UID = h => 'uid_' + h + '@bwquote.local';
function seed() {
  const own = h => ({ ownerUid: UID(h), ownerHandle: h });
  return {
    quotes: { fh: {
      q1: { id: 1, label: 'FH Alder',    total: 1000, date: 'Oct 1, 2026', state: { fields: {} }, ...own('martice') },
      q2: { id: 2, label: 'FH Birchall', total: 2000, date: 'Oct 1, 2026', state: { fields: {} }, ...own('randy') },
      q3: { id: 3, label: 'FH Corwin',   total: 3000, date: 'Oct 1, 2026', state: { fields: {} }, ...own('chloe') },
    } },
    parties: {
      pM: { id: 'pM', kind: 'person', given: 'Mona', family: 'Alder',    ...own('martice') },
      pR: { id: 'pR', kind: 'person', given: 'Rhea', family: 'Birchall', ...own('randy') },
      pC: { id: 'pC', kind: 'person', given: 'Cleo', family: 'Corwin',   ...own('chloe') },
    },
  };
}

// typed: what goes in the password box. stored: the password the Firebase account holds.
// A short typed password reaches Firebase padded, so the account holds the padded form.
async function signedInAs(browser, handle, typed = 'pw', stored = typed.length < 6 ? typed + '#bwqt' : typed) {
  const pw = stored;
  const ctx = await browser.newContext();
  await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(FAKE);
  await page.addInitScript(`(${(s, id, p) => { window.__fake.seed(s); window.__fake.addAccount(id, p); }})`
    + `.call(null, ${JSON.stringify(seed())}, ${JSON.stringify(handle + '@bwquote.local')}, ${JSON.stringify(pw)});`);
  await page.goto(BASE, { waitUntil: 'load', timeout: 120000 });
  // Typed the way she will: capitalised username.
  await page.fill('#bwUser', handle.charAt(0).toUpperCase() + handle.slice(1));
  await page.fill('#bwPass', typed);
  await page.click('#bwGateBtn');
  await page.waitForTimeout(700);
  return { ctx, page, errs };
}

const view = page => page.evaluate(() => ({
  gateShown: getComputedStyle(document.getElementById('bwGate')).display !== 'none',
  advisor: bwCurrentAdvisor(),
  canSeeAll: bwCanSeeAll(),
  fh: _fhSavedQuotes.map(q => q.label).sort(),
  parties: _parties.map(p => p.family).sort(),
  otherLabel: _bwCtOtherOwnerLabel(),
  visibleUsers: bwVisibleUserKeys(),
  pickerNames: (bwCanSeeAll() ? bwOwnerSelectHtml({}, '') : ''),
}));

const browser = await chromium.launch();

console.log('\n1. Chloe signs in with full capabilities');
{
  // She types the 4-digit PIN; the account holds the padded form Firebase would accept.
  const { ctx, page, errs } = await signedInAs(browser, 'chloe', '4321', '4321#bwqt');
  const v = await view(page);
  ok('gate clears for "Chloe" / her PIN', v.gateShown === false, v.gateShown);
  ok('her name on her paperwork', v.advisor.name === 'Chloe Frink', v.advisor);
  ok('her title', v.advisor.role === 'Funeral Director Intern', v.advisor.role);
  ok('her email', v.advisor.email === 'cfrink@bonneywatson.com', v.advisor.email);
  ok('no producer ID borrowed from anyone', v.advisor.producerId === '', v.advisor.producerId);
  ok('admin: sees every record', v.canSeeAll === true);
  ok('sees all three FH quotes', v.fh.join() === 'FH Alder,FH Birchall,FH Corwin', v.fh);
  ok('sees all three contacts', v.parties.join() === 'Alder,Birchall,Corwin', v.parties);
  ok('owner picker offers Martice and Randy', /Martice Morrison/.test(v.pickerNames) && /Randy Bergquist/.test(v.pickerNames));
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

console.log('\n1b. A wrong PIN is still refused');
{
  const { ctx, page } = await signedInAs(browser, 'chloe', '4320', '4321#bwqt');
  const gate = await page.evaluate(() => getComputedStyle(document.getElementById('bwGate')).display !== 'none');
  const err = await page.evaluate(() => document.getElementById('bwGateErr').textContent);
  ok('gate stays up', gate === true);
  ok('shows the not-recognised message', /not recognised/.test(err), err);
  await ctx.close();
}

console.log('\n2. Martice still sees everything and can hand records to Chloe');
{
  const { ctx, page, errs } = await signedInAs(browser, 'martice');
  const v = await view(page);
  ok('admin sees all three FH quotes', v.fh.length === 3, v.fh);
  ok('owner picker lists Chloe', /Chloe Frink/.test(v.pickerNames), v.pickerNames);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

console.log('\n3. Randy: nothing of Chloe shows');
{
  const { ctx, page, errs } = await signedInAs(browser, 'randy');
  const v = await view(page);
  ok('still not admin', v.canSeeAll === false);
  ok('FH: his own only — not Chloe\'s', v.fh.join() === 'FH Birchall', v.fh);
  ok('contacts: his own only — not Chloe\'s', v.parties.join() === 'Birchall', v.parties);
  ok('owner filter still reads "Martice", not "Someone else"', v.otherLabel === 'Martice', v.otherLabel);
  ok('chloe is not among the users he is shown', v.visibleUsers.indexOf('chloe') === -1, v.visibleUsers);
  ok('no owner picker at all', v.pickerNames === '', v.pickerNames);
  const body = await page.evaluate(() => document.body.innerText);
  ok('"Chloe" appears nowhere on his screen', !/chloe/i.test(body));
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

await browser.close();
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
