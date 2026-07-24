// Verify guides.html — the hub that links every guide, catalog, map and form.
// Checks the things that silently rot as guides are added and catalogs change:
//   * each category's count pill matches the number of cards under it
//   * every "Open Guide" and "PDF" target actually exists on disk
//     (including the file= parameter inside viewer.html?file=... links)
//   * each catalog card's advertised product count matches the real catalog page
//   * search filters, shows nothing on a no-match, and restores on clear
//   * no broken images, no JS errors
//
// Exits non-zero if anything fails, so it can gate a push.
// Run from repo root:  node scripts/verify_guides_page.mjs
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

// Card title -> the catalog page whose product-card count it advertises.
const CATALOGS = {
  'Metal Caskets': 'metal-caskets.html',
  'Wood Caskets': 'wood-caskets.html',
  'All Caskets': 'all-caskets.html',
  'Urn Catalog': 'urns-guide.html',
  'Keepsake Urn Catalog': 'keepsake-urns-guide.html',
  'Cremation Containers & Rental Caskets': 'cremation-containers-rental-caskets.html',
};

const exists = p => fs.existsSync(path.resolve(p));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
await page.goto(pathToFileURL(path.resolve('guides.html')).href, { waitUntil: 'networkidle' });

let ok = true;
const fail = msg => { ok = false; console.log('BAD  ' + msg); };

// ---- categories: pill vs actual card count ----
const cats = await page.evaluate(() =>
  Array.from(document.querySelectorAll('.category')).map(c => ({
    name: c.querySelector('h2')?.textContent.trim(),
    pill: parseInt(c.querySelector('.cat-count')?.textContent || '-1', 10),
    actual: c.querySelectorAll('.guide-card').length,
  })));
console.log('=== CATEGORIES (count pill vs cards) ===');
for (const c of cats) {
  if (c.pill === c.actual) console.log(`OK   ${String(c.name).padEnd(26)} ${c.actual}`);
  else fail(`${c.name}: pill says ${c.pill}, found ${c.actual} cards`);
}
const totalCards = cats.reduce((s, c) => s + c.actual, 0);
console.log(`total cards: ${totalCards}`);

// ---- every card is complete and every link resolves ----
const cards = await page.evaluate(() =>
  Array.from(document.querySelectorAll('.guide-card')).map(card => ({
    title: card.querySelector('.guide-title')?.textContent.trim(),
    hasDesc: !!card.querySelector('.guide-desc')?.textContent.trim(),
    cta: card.querySelector('.guide-cta')?.getAttribute('href') || null,
    pdf: card.querySelector('.guide-pdf')?.getAttribute('href') || null,
    desc: card.querySelector('.guide-desc')?.textContent || '',
    meta: card.querySelector('.guide-meta-info')?.textContent || '',
  })));
console.log('\n=== CARD LINKS ===');
let broken = 0;
for (const c of cards) {
  if (!c.hasDesc) { fail(`${c.title}: no description`); broken++; }
  if (!c.cta) { fail(`${c.title}: no "Open Guide" link`); broken++; }
  for (const [kind, href] of [['cta', c.cta], ['pdf', c.pdf]]) {
    if (!href || /^https?:/i.test(href)) continue;
    const target = decodeURIComponent(href.split('#')[0].split('?')[0]);
    if (!exists(target)) { fail(`${c.title}: ${kind} target missing -> ${target}`); broken++; }
    // viewer.html?file=... — the viewer exists, but check what it is asked to open
    const m = /[?&]file=([^&]+)/.exec(href);
    if (m) {
      const inner = decodeURIComponent(m[1]);
      if (!exists(inner)) { fail(`${c.title}: viewer file missing -> ${inner}`); broken++; }
    }
  }
}
if (!broken) console.log(`OK   all ${cards.length} cards have a description and resolving links`);

// ---- advertised counts vs the real catalog pages ----
console.log('\n=== ADVERTISED COUNTS vs CATALOG PAGES ===');
for (const [title, file] of Object.entries(CATALOGS)) {
  const card = cards.find(c => c.title === title);
  if (!card) { fail(`no card titled "${title}"`); continue; }
  if (!exists(file)) { fail(`${title}: catalog page missing -> ${file}`); continue; }
  const html = fs.readFileSync(path.resolve(file), 'utf8');
  const actual = (html.match(/<div class="product-card"/g) || []).length;
  const text = `${card.desc} ${card.meta}`;
  // Count occurrences of the real number rather than pattern-matching a noun after it:
  // descriptions put adjectives in between ("63 wood caskets"), which a
  // number-then-noun regex silently misses — and missing a duplicate is exactly the
  // drift this check exists to catch.
  const occurrences = (text.match(new RegExp(`\\b${actual}\\b`, 'g')) || []).length;
  // any number explicitly presented as a product count, to catch a stale one
  const stated = [...text.matchAll(/(\d+)\s*products\b/gi)].map(m => +m[1]);
  const stale = stated.filter(n => n !== actual);

  if (stale.length) fail(`${title}: card says ${stale.join('/')} products, page has ${actual}`);
  else if (occurrences === 0) fail(`${title}: card states no count (page has ${actual})`);
  else if (occurrences > 1) fail(`${title}: count ${actual} appears ${occurrences}x — keep it in one place`);
  else console.log(`OK   ${title.padEnd(38)} ${actual}`);
}

// ---- search ----
const visible = () => page.evaluate(() =>
  Array.from(document.querySelectorAll('.guide-card')).filter(c => c.style.display !== 'none').length);
await page.fill('#filterInput', 'casket');
await page.waitForTimeout(200);
const hits = await visible();
await page.fill('#filterInput', 'zzzznotathing');
await page.waitForTimeout(200);
const none = await visible();
await page.fill('#filterInput', '');
await page.waitForTimeout(200);
const restored = await visible();
console.log('\n=== SEARCH ===');
if (hits > 0 && none === 0 && restored === totalCards) {
  console.log(`OK   "casket" -> ${hits}, no-match -> 0, cleared -> ${restored}/${totalCards}`);
} else {
  fail(`search: "casket" -> ${hits}, no-match -> ${none} (want 0), cleared -> ${restored} (want ${totalCards})`);
}

// ---- images + JS errors ----
const badImgs = await page.evaluate(() =>
  Array.from(document.images).filter(i => i.complete && i.naturalWidth === 0).length);
console.log('\n=== PAGE HEALTH ===');
if (badImgs) fail(`${badImgs} broken image(s)`); else console.log('OK   no broken images');
if (errors.length) { fail(`${errors.length} JS error(s)`); errors.forEach(e => console.log('     ' + e)); }
else console.log('OK   no JS errors');

await browser.close();
console.log(`\n${ok ? 'ALL OK' : 'ISSUES FOUND'}`);
process.exit(ok ? 0 : 1);
