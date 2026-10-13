// Deed Transfer page -> "Deed Letter" opens deed-transfer-letter.html filled in.
//
// Fake Firebase only (gstatic SDK aborted); production is never contacted. Synthetic names.
import { chromium } from 'playwright';
import fs from 'fs';
import { BASE } from './_base.mjs';

const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
await ctx.route(/fonts\.googleapis\.com|fonts\.gstatic\.com/, r => r.abort());
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.dismiss());
await page.addInitScript(FAKE);
await page.addInitScript(`window.__fake.addAccount('martice@bwquote.local', 'pw');`);
await page.goto(BASE + 'index.html', { waitUntil: 'load', timeout: 120000 });
await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('martice@bwquote.local', 'pw'));
await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });

console.log('\n1. The button hands the owners and property to the letter');
{
  await page.evaluate(() => {
    show('dt-transfer', el('navDtTransfer'));
    el('dtGrantorName').value = 'Jordan Avery';
    dtAddCoOwnerRow();
    el('dtCoOwner2Name').value = 'Casey Avery';
    el('dtSection').value = '12'; el('dtLot').value = '42';
  });
  const [letter] = await Promise.all([ctx.waitForEvent('page'), page.click('button[onclick="bwOpenDeedLetter()"]')]);
  const lerrs = []; letter.on('pageerror', e => lerrs.push(e.message));
  await letter.waitForLoadState('load');
  await letter.waitForTimeout(300);
  const r = await letter.evaluate(() => ({
    url: location.href,
    recipient: document.getElementById('recipientName').value,
    owners: document.getElementById('propertyOwners').value,
    desc: document.getElementById('propertyDescription').value,
    sentBy: document.getElementById('sentBy').value,
    left: localStorage.getItem('bwDeedLetterPrefill'),
    preview: document.getElementById('letter').innerText,
  }));
  ok('recipient is both living owners', r.recipient === 'Jordan Avery & Casey Avery', r.recipient);
  ok('owners line names every owner', r.owners === 'Jordan Avery & Casey Avery', r.owners);
  ok('property comes from the section and lot', r.desc === 'Section 12, Lot 42', r.desc);
  ok('sent by the signed-in counselor', r.sentBy === 'Martice Morrison', r.sentBy);
  ok('the letter preview uses them', r.preview.includes('Dear Jordan Avery & Casey Avery') && r.preview.includes('Section 12, Lot 42'));
  ok('no names in the web address', !/Avery|Section|\?/.test(r.url), r.url);
  ok('the hand-off is deleted once read', r.left === null, r.left);
  ok('no errors on the letter page', lerrs.length === 0, lerrs);
  await letter.close();
}

console.log('\n2. A deceased owner is not addressed; a stale hand-off is ignored');
{
  await page.evaluate(() => { const c = el('dtOwner1Deceased'); if (c) { c.checked = true; if (typeof dtOwnerDeceasedChanged === 'function') dtOwnerDeceasedChanged(); } });
  const [letter] = await Promise.all([ctx.waitForEvent('page'), page.click('button[onclick="bwOpenDeedLetter()"]')]);
  await letter.waitForLoadState('load'); await letter.waitForTimeout(300);
  const r = await letter.evaluate(() => ({ recipient: document.getElementById('recipientName').value, owners: document.getElementById('propertyOwners').value }));
  ok('only the living owner is addressed', r.recipient === 'Casey Avery', r);
  ok('the owners line still reads the deed (both names)', r.owners === 'Jordan Avery & Casey Avery', r);
  // a hand-off older than five minutes
  await letter.evaluate(() => localStorage.setItem('bwDeedLetterPrefill', JSON.stringify({ at: Date.now() - 10 * 60 * 1000, recipientName: 'Old Data' })));
  await letter.reload({ waitUntil: 'load' }); await letter.waitForTimeout(200);
  const r2 = await letter.evaluate(() => ({ recipient: document.getElementById('recipientName').value, left: localStorage.getItem('bwDeedLetterPrefill') }));
  ok('a stale hand-off is not used', r2.recipient === '', r2);
  ok('and is cleaned up', r2.left === null, r2);
  await letter.close();
}

console.log('\n3. Nothing to hand over');
{
  await page.evaluate(() => dtClearAll());
  const msgs = []; page.removeAllListeners('dialog'); page.on('dialog', d => { msgs.push(d.message()); d.dismiss(); });
  await page.click('button[onclick="bwOpenDeedLetter()"]');
  await page.waitForTimeout(200);
  ok('an empty deed transfer asks for the owner first', msgs.some(m => /owner or the property/.test(m)), msgs);
  ok('the button wrote nothing to the database', await page.evaluate(() => window.__fake.log().filter(l => ['set', 'update', 'remove'].includes(l.op)).length === 0));
}

ok('no page errors', errs.length === 0, errs);
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
