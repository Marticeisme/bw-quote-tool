// Verify the rebuilt metal casket catalog. Run from repo root:
//   node scripts/verify_metal_caskets.mjs
import { chromium } from 'playwright';
import path from 'path';
import { pathToFileURL } from 'url';

const url = pathToFileURL(path.resolve('metal-caskets.html')).href;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });

const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(url, { waitUntil: 'networkidle' });

const cards = await page.locator('.product-card').count();
const coverFooter = (await page.locator('.cover-footer').textContent()).trim();
const filterCount = (await page.locator('#filterCount').textContent()).trim();
const colorOpts = await page.locator('#colorFilter option').allTextContents();

// broken images
const broken = await page.evaluate(() =>
  [...document.querySelectorAll('.product-card img')]
    .filter(i => i.complete && i.naturalWidth === 0)
    .map(i => i.getAttribute('src')));

// enrichment coverage
const enrich = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('.product-card')];
  const dims = cards.filter(c => [...c.querySelectorAll('.product-detail')]
    .some(d => / in L x .* in W x .* in H/.test(d.textContent))).length;
  const wt = cards.filter(c => [...c.querySelectorAll('.product-detail')]
    .some(d => /\blbs$/.test(d.textContent.trim()))).length;
  const counts = {};
  cards.forEach(c => { const n = c.querySelectorAll('.product-detail').length; counts[n] = (counts[n] || 0) + 1; });
  return { dims, wt, detailLineCounts: counts };
});

console.log('cards            :', cards);
console.log('cover footer     :', coverFooter);
console.log('filter count     :', filterCount);
console.log('colour options   :', colorOpts.length, '->', colorOpts.join(', '));
console.log('broken images    :', broken.length, broken.slice(0, 3));
console.log('with dimensions  :', enrich.dims);
console.log('with weight      :', enrich.wt);
console.log('detail line count:', JSON.stringify(enrich.detailLineCounts));

// --- search ---
await page.fill('#searchInput', 'virgo');
await page.waitForTimeout(150);
const afterSearch = await page.locator('.product-card:visible').count();
console.log('search "virgo"   :', afterSearch, '|', (await page.locator('#filterCount').textContent()).trim());

// --- search by item number ---
await page.fill('#searchInput', '279131');
await page.waitForTimeout(150);
console.log('search "279131"  :', await page.locator('.product-card:visible').count());
await page.fill('#searchInput', '');
await page.waitForTimeout(150);

// --- colour filter ---
await page.selectOption('#colorFilter', 'blue');
await page.waitForTimeout(150);
console.log('filter blue      :', await page.locator('.product-card:visible').count());
await page.selectOption('#colorFilter', '');
await page.waitForTimeout(150);

// --- sort ---
await page.selectOption('#sortSelect', 'price-desc');
await page.waitForTimeout(200);
const firstDesc = await page.locator('.product-card:visible .product-price').first().textContent();
await page.selectOption('#sortSelect', 'price-asc');
await page.waitForTimeout(200);
const firstAsc = await page.locator('.product-card:visible .product-price').first().textContent();
console.log('sort desc first  :', firstDesc.trim(), '| asc first:', firstAsc.trim());

// --- modal + spec labels ---
await page.locator('.product-card').first().click();
await page.waitForTimeout(300);
const modalOpen = await page.locator('#productModal.active').count();
const modalSpecs = await page.locator('#modalSpecs li').allTextContents();
console.log('modal open       :', !!modalOpen, '| specs:', modalSpecs.length);
modalSpecs.forEach(s => console.log('   -', s.trim()));

await page.screenshot({ path: 'scratch/_verify/metal_grid.png', fullPage: false });
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
await page.screenshot({ path: 'scratch/_verify/metal_top.png', clip: { x: 0, y: 0, width: 1280, height: 1000 } });

console.log('\nJS errors        :', errors.length);
errors.slice(0, 5).forEach(e => console.log('   ', e));

await browser.close();
