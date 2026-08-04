// Verify catalog pages render and behave. Run from repo root:
//   node scripts/verify_catalogs.mjs [page.html ...]
import { chromium } from 'playwright';
import path from 'path';
import { pathToFileURL } from 'url';

// Every live catalog. Keep this list complete — running the script bare is the common
// case, and a catalog missing from here is simply never checked.
const pages = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['metal-caskets.html', 'wood-caskets.html', 'urns-guide.html', 'keepsake-urns-guide.html',
     'cremation-containers-rental-caskets.html', 'all-caskets.html'];

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

  // ---- facet filters (multi-select) ----
  // Driven by dispatching 'change' rather than clicking: the facet panels overlap each
  // other, so a real click on a second facet's button hits the first panel in headless.
  const facet = await page.evaluate(() => {
    const out = { facets: 0, notes: [] };
    const list = [...document.querySelectorAll('.facet')];
    out.facets = list.length;
    if (!list.length) { out.notes.push('no facets rendered'); return out; }

    const vis = () => [...document.querySelectorAll('.product-card')].filter(c => c.style.display !== 'none').length;
    const boxes = f => [...f.querySelectorAll('.facet-opt input')];
    const label = (f, i) => f.querySelectorAll('.facet-opt .facet-opt-label')[i].textContent.trim();
    const stated = (f, i) => +f.querySelectorAll('.facet-opt .facet-opt-count')[i].textContent;
    const set = (f, i, on) => { const cb = boxes(f)[i]; cb.checked = on; cb.dispatchEvent(new Event('change')); };

    const f0 = list[0];
    // 1. an option's stated count must equal what it actually filters to
    const n0 = stated(f0, 0);
    set(f0, 0, true);
    out.one = `${vis()}/${n0}`;
    if (vis() !== n0) out.notes.push(`"${label(f0, 0)}" states ${n0} but filters to ${vis()}`);

    // 2. OR within one facet: two options together = the sum of their counts
    if (boxes(f0).length > 1) {
      const n1 = stated(f0, 1);
      set(f0, 1, true);
      out.or = `${vis()}/${n0 + n1}`;
      if (vis() !== n0 + n1) out.notes.push(`OR within facet: expected ${n0 + n1}, got ${vis()}`);
      set(f0, 1, false);
    }

    // 3. AND across facets: adding a second facet can only narrow, and every remaining
    //    card must still match the first facet's selection
    if (list.length > 1) {
      const before = vis();
      const f1 = list[1];
      set(f1, 0, true);
      const after = vis();
      out.and = `${after}<=${before}`;
      if (after > before) out.notes.push(`AND across facets widened results (${before} -> ${after})`);
      set(f1, 0, false);
    }

    // 4. clear restores everything
    const clear = document.getElementById('facetClear');
    if (clear) clear.click(); else out.notes.push('no #facetClear button');
    out.cleared = vis();
    return out;
  });
  const facetBad = facet.notes.length || facet.cleared !== cards;

  // ---- click-to-enlarge on the product modal ----
  await page.locator('.product-card').first().click();
  await page.waitForSelector('#productModal.active', { timeout: 3000 });
  await page.locator('#modalImg').click();
  await page.waitForSelector('#photoLightbox.active', { timeout: 3000 });
  const zoom = await page.evaluate(() => {
    const lb = document.getElementById('photoLightbox');
    const modal = document.getElementById('productModal');
    return {
      srcMatch: document.getElementById('lightboxImg').src === document.getElementById('modalImg').src,
      above: parseInt(getComputedStyle(lb).zIndex, 10) > parseInt(getComputedStyle(modal).zIndex, 10),
    };
  });
  await page.keyboard.press('Escape');            // closes the lightbox only
  await page.waitForTimeout(150);
  const escStep = await page.evaluate(() => ({
    lightboxClosed: !document.getElementById('photoLightbox').classList.contains('active'),
    modalStillOpen: document.getElementById('productModal').classList.contains('active'),
  }));
  await page.keyboard.press('Escape');            // then the modal
  await page.waitForTimeout(150);
  const modalClosed = await page.evaluate(() => !document.getElementById('productModal').classList.contains('active'));
  const zoomBad = !zoom.srcMatch || !zoom.above || !escStep.lightboxClosed || !escStep.modalStillOpen || !modalClosed;

  // ---- compare tray + overlay ----
  const compare = await page.evaluate(() => {
    const cbs = [...document.querySelectorAll('.compare-cb')];
    if (cbs.length < 2) return { skipped: true };
    cbs[0].click(); cbs[1].click();
    return { picked: document.querySelectorAll('.compare-chip').length || 2 };
  });
  let compareBad = false, compareInfo = 'skipped';
  if (!compare.skipped) {
    await page.waitForTimeout(200);
    await page.locator('#compareOpenBtn').click();
    await page.waitForTimeout(300);
    const cmp = await page.evaluate(() => ({
      open: document.getElementById('compareOverlay').classList.contains('active'),
      rows: document.querySelectorAll('#compareTable .compare-table-row').length,
    }));
    compareBad = !cmp.open || cmp.rows < 2;
    compareInfo = `open=${cmp.open} rows=${cmp.rows}`;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
  }

  // ---- compare PRINT sheet fits one page, nothing clipped (s14, ported from PCM) ----
  // #compareSheet is position:fixed;height:100% and .cmp-table carries overflow:hidden
  // for its rounded corner, so `scrollHeight - clientHeight === 0` — the s09 Track K
  // proof — is BLIND here: rows that no longer fit are clipped away and the sheet still
  // reports no overflow. The assertions that do the work are geometric, on a true
  // 816x1056 letter viewport: the last row's bottom edge sits inside the table, the
  // footer's bottom edge inside the page, and a real Chromium PDF has exactly 1 page.
  let printBad = false;
  const printInfo = [];
  if (!compare.skipped) {
    await page.setViewportSize({ width: 816, height: 1056 });
    await page.evaluate(() => {
      window.print = () => {};        // the real button calls window.print()
      [...document.querySelectorAll('.compare-cb')].slice(0, 4)
        .forEach(cb => { if (!cb.checked) cb.click(); });
      document.getElementById('compareOpenBtn').click();
    });
    for (const mode of ['specs', 'photos']) {
      await page.evaluate((mode) => {
        document.getElementById(mode === 'photos' ? 'compareTabPhotos' : 'compareTabSpecs').click();
        document.getElementById('comparePrintBtn').click();
      }, mode);
      await page.waitForTimeout(250);
      await page.emulateMedia({ media: 'print' });
      await page.waitForTimeout(120);
      const g = await page.evaluate(() => {
        const s = document.getElementById('compareSheet');
        const photos = s.classList.contains('cmp-mode-photos');
        const box = s.querySelector(photos ? '.cmp-photo-row' : '.cmp-table');
        const cells = [...s.querySelectorAll(photos ? '.cmp-photo-col' : '.cmp-value-cell')];
        const last = cells[cells.length - 1];
        const foot = s.querySelector('.cmp-footer');
        const imgs = s.querySelectorAll(photos
          ? '.cmp-photo-row .cmp-photo-imgwrap img' : '.cmp-table .cmp-col-img').length;
        return {
          mode: photos ? 'photos' : 'specs',
          printing: document.body.classList.contains('compare-printing'),
          over: s.scrollHeight - s.clientHeight,
          imgs,
          spill: last && box
            ? Math.round(last.getBoundingClientRect().bottom - box.getBoundingClientRect().bottom)
            : 999,
          footSpill: foot ? Math.round(foot.getBoundingClientRect().bottom - s.clientHeight) : 999,
        };
      });
      const pdf = await page.pdf({ format: 'Letter', printBackground: true });
      const pdfPages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
      await page.emulateMedia({ media: 'screen' });
      await page.evaluate(() => document.body.classList.remove('compare-printing'));
      const bad = !g.printing || g.over !== 0 || g.spill > 1 || g.footSpill > 1
        || g.imgs !== 4 || pdfPages !== 1;
      if (bad) printBad = true;
      printInfo.push(`${g.mode}: last row ${-g.spill}px inside table, footer ${-g.footSpill}px inside page, `
        + `${g.imgs}/4 items, pdf=${pdfPages}p${bad ? ' <-- CLIPPED/BAD' : ''}`);
    }
  }

  const bad = errors.length || broken.length || dup.length || missingMeta || noPrice || noneVisible !== 0 || allBack !== cards
    || facetBad || zoomBad || compareBad || printBad;
  if (bad) failures++;

  console.log(`\n=== ${file} ${bad ? 'FAIL' : 'OK'}`);
  console.log(`  cards ${cards} | cover "${cover}" | filterCount "${count}"`);
  if (sections.length) console.log('  sections:', sections.map(([a, b]) => `${a}=${b}`).join(' '));
  console.log(`  broken imgs ${broken.length} | dup SKUs ${dup.length} | missing meta ${missingMeta} | no-SKU cards ${noSkuCards} | bad price ${noPrice}`);
  console.log(`  search no-match -> ${noneVisible} visible | cleared -> ${allBack}/${cards} | sort asc first ${firstAsc}`);
  console.log(`  facets ${facet.facets} | first opt ${facet.one || '-'} | OR ${facet.or || 'n/a'} | AND ${facet.and || 'n/a'} | cleared ${facet.cleared}/${cards}`);
  console.log(`  enlarge: src match ${zoom.srcMatch}, above modal ${zoom.above}, esc closes lightbox then modal ${escStep.lightboxClosed && escStep.modalStillOpen && modalClosed} | compare: ${compareInfo}`);
  for (const line of printInfo) console.log(`  compare print sheet, 4 items, ${line}`);
  if (facet.notes.length) console.log('   facet issues:', facet.notes);
  if (broken.length) console.log('   broken:', broken.slice(0, 4));
  if (dup.length) console.log('   dups:', dup.slice(0, 6));
  if (errors.length) console.log('   errors:', errors.slice(0, 4));

  await page.close();
}

await browser.close();
console.log(`\n${failures === 0 ? 'ALL PAGES OK' : failures + ' PAGE(S) FAILED'}`);
process.exit(failures ? 1 : 0);
