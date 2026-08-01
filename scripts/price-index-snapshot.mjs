// Dump the tool's PRICE_INDEX — every {name, price} pair the price list and the top-bar
// search can find — to a JSON file.
//
// Why this exists: buildPriceIndex() does not read a data structure, it REGEX-SCRAPES the
// rendered DOM (index.html, buildPriceIndex). An item only enters the index if its label
// reads `Name — $1,234`. Change a dash, a space, or the position of the amount and the item
// vanishes from search and from the Price List with no error and no console warning. A
// refactor can therefore delete a price from the counselor's view while every contract still
// prints correctly, so the generator baseline cannot see it.
//
// Used two ways:
//   node scripts/price-index-snapshot.mjs <out.json>      ad-hoc before/after diff
//   node scripts/price-index-snapshot.mjs --golden        rewrite tests/fixtures/price-index-golden.json
//
// Regenerating the golden file is a deliberate act: it means "yes, this product list changed
// on purpose". tests/test-price-index-golden.mjs fails until you do it.
//
// Read-only against Firebase: the gstatic bundle is blocked and tests/fake-firebase.js is
// installed instead, so production cannot be contacted, let alone written.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { assertServesThisTree } from './served-tree-check.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASELINE_BASE || 'http://localhost:' + (process.env.PORT || 3737) + '/';

const golden = process.argv.includes('--golden');
const outArg = process.argv.slice(2).find((a) => !a.startsWith('--'));
const OUT = golden
  ? path.join(ROOT, 'tests', 'fixtures', 'price-index-golden.json')
  : (outArg || path.join(ROOT, 'price-index.json'));

// A snapshot taken against another worktree's server is worthless in exactly the way that
// looks like success: it reports the OTHER tree's prices as this tree's.
await assertServesThisTree(BASE, ROOT, 'price-index snapshot');

const FAKE = fs.readFileSync(path.join(ROOT, 'tests', 'fake-firebase.js'), 'utf8');

const browser = await chromium.launch();
const ctx = await browser.newContext();
await ctx.route(/gstatic\.com\/firebasejs/, (r) => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
await page.addInitScript(FAKE);
await page.addInitScript(`window.__fake.addAccount('t@bwquote.local','pw');`);
await page.goto(BASE, { waitUntil: 'load', timeout: 120000 });
await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('t@bwquote.local', 'pw'));
await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
await page.waitForTimeout(250);

const items = await page.evaluate(() => {
  buildPriceIndex();
  return PRICE_INDEX
    .map((i) => ({ name: i.name, price: i.price, cat: i.cat, venue: i.venue }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.price - b.price);
});

await browser.close();

if (errs.length) {
  console.error('page errors while snapshotting:\n  ' + errs.join('\n  '));
  process.exit(1);
}
if (!items.length) {
  console.error('PRICE_INDEX came back empty — refusing to write a snapshot.');
  process.exit(1);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(items, null, 1) + '\n');
console.log(items.length + ' items -> ' + OUT);
