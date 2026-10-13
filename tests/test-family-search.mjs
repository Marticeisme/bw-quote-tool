// Family search: the top-bar price search also finds contacts and saved records by name.
//
// Fake Firebase only (gstatic SDK aborted); production is never contacted. Synthetic names.
import { chromium } from 'playwright';
import fs from 'fs';
import { BASE } from './_base.mjs';

const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };

const rec = (id, label, extra) => Object.assign({ id, label, total: 5000 + id, date: 'Oct 1, 2026' }, extra || {});
const SEED = {
  parties: {
    z1: { id: 'z1', given: 'Prue', family: 'Quennell', kind: 'person', createdAt: 1, updatedAt: 1 },
    z2: { id: 'z2', given: 'Hal', family: 'Brisco', kind: 'person', createdAt: 1, updatedAt: 1 },
  },
  quotes: {
    cem: { q801: rec(801, 'Quennell Family - Oct 1'), q802: rec(802, 'Brisco - Garden 7'),
           q803: rec(803, 'Quennell old', { deletedAt: '2026-10-02T00:00:00.000Z' }) },
    fh:  { q811: rec(811, 'Quennell Family FH') },
    ric: { q821: rec(821, 'Quennell, Prue RIC', { archivedAt: '2026-09-01T00:00:00.000Z' }) },
    ga: {}, cp: {}, an: {},
    dt:  { q831: rec(831, 'Quennell to Brisco transfer') },
  },
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.dismiss());
await page.addInitScript(FAKE);
await page.addInitScript(`window.__fake.addAccount('martice@bwquote.local', 'pw');`);
await page.addInitScript(`(${(s) => window.__fake.seed(s)}).call(null, ${JSON.stringify(SEED)});`);
await page.goto(BASE + 'index.html', { waitUntil: 'load', timeout: 120000 });
await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('martice@bwquote.local', 'pw'));
await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
await page.waitForTimeout(400);

const hits = () => page.evaluate(() => [...document.querySelectorAll('#searchDropdown .bw-fam-hit')].map(h => h.textContent));

console.log('\n1. Typing a family name lists the contact and every saved record');
{
  await page.fill('#searchInput', 'quen');
  await page.waitForTimeout(150);
  const h = await hits();
  ok('the contact is found', h.some(x => x.includes('Prue Quennell') && x.includes('Contact')), h);
  ok('the cemetery quote is found, with type, date and total', h.some(x => x.includes('Quennell Family - Oct 1') && x.includes('Cemetery quote') && x.includes('$5,801.00')), h);
  ok('the funeral home quote is found', h.some(x => x.includes('Quennell Family FH') && x.includes('Funeral home quote')), h);
  ok('an archived RIC is found and says archived', h.some(x => x.includes('Quennell, Prue RIC') && x.includes('archived')), h);
  ok('the deed transfer is found', h.some(x => x.includes('Quennell to Brisco transfer')), h);
  ok('a Recently deleted quote is NOT found', !h.some(x => x.includes('Quennell old')), h);
  ok('the Families group comes before Prices', await page.evaluate(() => /^Families/.test(document.getElementById('searchDropdown').textContent)));
}

console.log('\n2. Picking a result opens it');
{
  await page.evaluate(() => [...document.querySelectorAll('#searchDropdown .bw-fam-hit')].find(h => h.textContent.includes('Contact')).click());
  await page.waitForTimeout(250);
  ok('a contact opens its record', await page.evaluate(() => document.getElementById('section-contacts').classList.contains('active') && _bwDetailId === 'z1'));
  ok('the search box clears and the list closes', await page.evaluate(() => document.getElementById('searchInput').value === '' && document.getElementById('searchDropdown').style.display === 'none'));
  await page.fill('#searchInput', 'brisco - gar');
  await page.waitForTimeout(150);
  await page.evaluate(() => document.querySelector('#searchDropdown .bw-fam-hit').click());
  await page.waitForTimeout(250);
  // the seeded record has no builder state, so it lands on its saved list instead of an empty builder
  ok('a record with no saved builder state lands on its saved list', await page.evaluate(() => document.getElementById('section-cem-saved').classList.contains('active')));
}

console.log('\n3. Prices still work, and a one-letter query does nothing');
{
  await page.fill('#searchInput', 'q');
  await page.waitForTimeout(100);
  ok('one letter shows nothing', await page.evaluate(() => { const d = document.getElementById('searchDropdown'); return !d || d.style.display === 'none'; }));
  await page.fill('#searchInput', 'vault');
  await page.waitForTimeout(150);
  ok('a price term still lists prices', await page.evaluate(() => /Prices/.test(document.getElementById('searchDropdown').textContent)));
  ok('the search wrote nothing', await page.evaluate(() => window.__fake.log().filter(l => ['set', 'update', 'remove'].includes(l.op)).length === 0));
}

ok('no page errors', errs.length === 0, errs);
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
