// The golden PRICE_INDEX: every {name, price} the Price List and the top-bar search can find.
//
// This exists because the generator baseline cannot see search. Contracts and quote PDFs print
// dollar amounts, so a price that MOVES turns those 14 signatures red — but a price that
// silently DISAPPEARS from the counselor's lookup leaves every contract byte-identical. And
// disappearing is the easy accident here: buildPriceIndex() regex-scrapes rendered label text,
// so a reformatted label, a changed dash, or an <option> that stops rendering its amount drops
// the item with no error and no console warning.
//
// So the whole set is pinned. If this suite fails, read the diff:
//   REMOVED  a product is no longer findable. Intentional (discontinued) or a scrape break?
//   ADDED    a new product, or a label that started matching by accident.
// When the change is intended, regenerate the fixture deliberately:
//
//     node scripts/price-index-snapshot.mjs --golden
//
// and say in the commit why the list moved. Regenerating without reading the diff turns this
// file into decoration.
//
// Fake Firebase only; production is never contacted.
import { chromium } from 'playwright';
import fs from 'fs';

const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
const GOLDEN = JSON.parse(fs.readFileSync('tests/fixtures/price-index-golden.json', 'utf8'));

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); }
};

const browser = await chromium.launch();
const ctx = await browser.newContext();
await ctx.route(/gstatic\.com\/firebasejs/, (r) => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 200)); });
await page.addInitScript(FAKE);
await page.addInitScript(`window.__fake.addAccount('t@bwquote.local','pw');`);
await page.goto('http://localhost:' + (process.env.PORT || 3737) + '/', { waitUntil: 'load', timeout: 120000 });
await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('t@bwquote.local', 'pw'));
await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
await page.waitForTimeout(250);

const live = await page.evaluate(() => {
  buildPriceIndex();
  return PRICE_INDEX.map((i) => ({ name: i.name, price: i.price, cat: i.cat, venue: i.venue }));
});
await browser.close();

console.log('\nPRICE_INDEX vs tests/fixtures/price-index-golden.json');

const key = (i) => i.name + ' | $' + i.price + ' | ' + i.cat + ' | ' + i.venue;
const G = new Set(GOLDEN.map(key));
const L = new Set(live.map(key));
const removed = [...G].filter((k) => !L.has(k)).sort();
const added = [...L].filter((k) => !G.has(k)).sort();

ok('the index is populated at all', live.length > 300, live.length);
ok('no item lost its place in search or the Price List', removed.length === 0, removed.slice(0, 40));
ok('no unexpected item appeared', added.length === 0, added.slice(0, 40));
ok('the count still matches the fixture (' + GOLDEN.length + ')', live.length === GOLDEN.length,
  { golden: GOLDEN.length, live: live.length });

// The name→price map has to be single-valued for the ones that matter: two entries with the
// same name at different prices is what a half-finished price change looks like.
const byName = {};
live.forEach((i) => { (byName[i.name] = byName[i.name] || new Set()).add(i.price); });
const doubled = Object.keys(byName).filter((n) => byName[n].size > 1)
  .map((n) => n + ' = ' + [...byName[n]].join(' / '));
const goldenByName = {};
GOLDEN.forEach((i) => { (goldenByName[i.name] = goldenByName[i.name] || new Set()).add(i.price); });
const goldenDoubled = Object.keys(goldenByName).filter((n) => goldenByName[n].size > 1);
ok('no product gained a second, different price', doubled.length <= goldenDoubled.length, doubled);

ok('no page errors', errs.length === 0, errs);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
