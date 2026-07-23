// Verify catalog pages render and behave. Run from repo root:
//   node scripts/verify_catalogs.mjs [page.html ...]
import { chromium } from 'playwright';
import path from 'path';
import { pathToFileURL } from 'url';

const pages = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['metal-caskets.html', 'wood-caskets.html', 'urns-guide.html', 'keepsake-urns-guide.html'];

const browser = await chromium.launch();
let failures = 0;

for (const file of pages) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto(pathToFileURL(path.resolve(file)).href, { waitUntil: 'networkidle' });

  const cards = await page.locator('.product-card').count();
  const cover = (await page.locator('.cover-footer').textContent()).trim();
  const count = (await page.locator('#filterCount').textContent()).trim();

  const broken = await page.evaluate(() =>
    [...document.querySelectorAll('.product-card img')]
      .filter(i => i.complete && i.naturalWidth === 0).map(i => i.getAttribute('src')));

  const dup = await page.evaluate(() => {
    const seen = {}, dups = [];
    document.querySelectorAll('.product-card').forEach(c => {
      const k = c.dataset.item;
      if (seen[k]) dups.push(k); else seen[k] = 1;
    });
    return dups;
  });

  // Cards keyed by a real Batesville SKU must show the item number. Preserved
  // non-Batesville products (slug-keyed) legitimately have none.
  const missingMeta = await page.evaluate(() =>
    [...document.querySelectorAll('.product-card')]
      .filter(c => /^\d+$/.test(c.dataset.item || '') && !c.querySelector('.product-meta')).length);
  const noSkuCards = await page.evaluate(() =>
    [...document.querySelectorAll('.product-card')]
      .filter(c => !/^\d+$/.test(c.dataset.item || '')).length);

  const noPrice = await page.evaluate(() =>
    [...document.querySelectorAll('.product-card')]
      .filter(c => !/\$[\d,]+\.\d\d/.test(c.querySelector('.product-price')?.textContent || '')).length);

  // sections, if any
  const sections = await page.evaluate(() =>
    [...document.querySelectorAll('.product-grid[id^="grid-cat-"]')]
      .map(g => [g.id.replace('grid-', ''), g.querySelectorAll('.product-card').length]));

  // search
  await page.fill('#searchInput', 'zzzznomatch');
  await page.waitForTimeout(150);
  const noneVisible = await page.locator('.product-card:visible').count();
  await page.fill('#searchInput', '');
  await page.waitForTimeout(150);
  const allBack = await page.locator('.product-card:visible').count();

  // sort
  await page.selectOption('#sortSelect', 'price-asc');
  await page.waitForTimeout(200);
  const firstAsc = (await page.locator('.product-card:visible .product-price').first().textContent()).trim();

  const bad = errors.length || broken.length || dup.length || missingMeta || noPrice || noneVisible !== 0 || allBack !== cards;
  if (bad) failures++;

  console.log(`\n=== ${file} ${bad ? 'FAIL' : 'OK'}`);
  console.log(`  cards ${cards} | cover "${cover}" | filterCount "${count}"`);
  if (sections.length) console.log('  sections:', sections.map(([a, b]) => `${a}=${b}`).join(' '));
  console.log(`  broken imgs ${broken.length} | dup SKUs ${dup.length} | missing meta ${missingMeta} | no-SKU cards ${noSkuCards} | bad price ${noPrice}`);
  console.log(`  search no-match -> ${noneVisible} visible | cleared -> ${allBack}/${cards} | sort asc first ${firstAsc}`);
  if (broken.length) console.log('   broken:', broken.slice(0, 4));
  if (dup.length) console.log('   dups:', dup.slice(0, 6));
  if (errors.length) console.log('   errors:', errors.slice(0, 4));

  await page.close();
}

await browser.close();
console.log(`\n${failures === 0 ? 'ALL PAGES OK' : failures + ' PAGE(S) FAILED'}`);
process.exit(failures ? 1 : 0);
