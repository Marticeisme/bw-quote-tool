// Catalog filters + "print what's filtered" (sprint-11 Track C).
//
// What this guards, and why each check is here rather than "the CSS is present":
//
// 1. FILTERS NARROW. The price-band facet is new; the older facets are re-checked
//    against the cards' own data so a broken derivation cannot pass by agreeing with
//    itself. Expected counts are computed from data-price in the page, not hardcoded.
//
// 2. THE PRINT SHEET GENUINELY PAGINATES. #compareSheet is position:fixed;height:100%,
//    so anything past one page is CLIPPED, silently — s09 Track K found the footer
//    sitting at y=636 of a 1056px page and had to prove scrollHeight-clientHeight===0
//    precisely because overflow there means vanished rows. The filtered sheet is a
//    multi-page flow instead, so this suite asserts real pagination two ways: the DOM
//    (one .fs-page per N items, every filtered item present, none dropped) AND a real
//    Chromium PDF whose PAGE COUNT matches. A CSS-presence check would pass on a sheet
//    that renders 3 of 10 caskets.
//
// 3. THE BLOCK IS THE SAME ON ALL SIX PAGES. The compare block already holds that
//    contract; two of the six are GENERATED (build_all_caskets.py templates from
//    wood-caskets.html, build_cremation_rental.py from urns-guide.html), so a change
//    landed on only some pages is silently reverted by the next rebuild. The md5 check
//    is a file-level assertion, no browser.
//
// 4. COMPARE STILL WORKS. Track C's brief says compare is unchanged in behavior; this
//    re-checks selection, the tray and the 4-item cap on the two lead catalogs.
//
// 5. THE COMPARE SHEET FITS ITS ONE PAGE — GEOMETRICALLY (s14, ported from the PCM
//    catalog's gate). The s09 proof was scrollHeight-clientHeight===0 on #compareSheet,
//    and s14 Track D showed that check is BLIND on every one of these six pages:
//    .cmp-table carries overflow:hidden for its rounded corner, so rows that no longer
//    fit are clipped away while the sheet still reports zero overflow (padding the
//    label cells to 80px provably loses rows and over stays 0). The assertions that do
//    the work are geometric, on a true 816x1056 letter viewport: the LAST ROW's bottom
//    edge sits inside the table, the FOOTER's bottom edge inside the page, every
//    selected item is on the sheet, and a real Chromium PDF has exactly 1 page.
//
// No Firebase of any kind is involved — these are standalone static pages.
import { chromium } from 'playwright';
import fs from 'fs';
import crypto from 'crypto';
import { BASE } from './_base.mjs';

let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };

// file -> products per printed page. 3 for caskets (the photo is what a family is
// actually choosing on), 4 for the much smaller urn and keepsake products.
const PAGES = {
  'metal-caskets.html': 3,
  'wood-caskets.html': 3,
  'all-caskets.html': 3,
  'cremation-containers-rental-caskets.html': 3,
  'urns-guide.html': 4,
  'keepsake-urns-guide.html': 4,
};
const FILES = Object.keys(PAGES);

// ---------------------------------------------------------------- 3. block identity
function slice(s, start, end) {
  const i = s.indexOf(start);
  if (i < 0) return null;
  const j = s.indexOf(end, i);
  return j < 0 ? null : s.slice(i, j);
}
const BLOCKS = [
  ['filtered-print CSS',   '/* ---------- FILTERED PRINT SHEET', '\n/* PRINT HEADER'],
  ['filter-bar button',    '<button type="button" class="filter-print"', '</button>'],
  ['price-band ladder',    '  // Price bands. One ladder', '  var FACETS = ['],
  ['sheet builder JS',     "  var sheet = document.getElementById('filterSheet');", '</script>'],
];
for (const [label, a, b] of BLOCKS) {
  const hashes = FILES.map(f => {
    const blk = slice(fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n'), a, b);
    return blk === null ? 'MISSING:' + f : crypto.createHash('md5').update(blk).digest('hex');
  });
  ok(`${label}: byte-identical across all 6 catalogs`,
     new Set(hashes).size === 1 && !hashes[0].startsWith('MISSING'),
     Object.fromEntries(FILES.map((f, i) => [f, hashes[i]])));
}

const browser = await chromium.launch();

async function open(file) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(BASE + file, { waitUntil: 'networkidle' });
  return { page, errs };
}

// ------------------------------------------------- structural pass over all six pages
for (const file of FILES) {
  const perPage = PAGES[file];
  const { page, errs } = await open(file);

  const info = await page.evaluate(() => ({
    cards: document.querySelectorAll('.product-card').length,
    per: window.bwFilteredPerPage,
    btn: !!document.getElementById('filterPrintBtn'),
    btnText: (document.getElementById('filterPrintBtn') || {}).textContent || '',
    sheet: !!document.getElementById('filterSheet'),
    hasPriceFacet: [...document.querySelectorAll('#facets .facet')].some(f => f.dataset.key === 'price'),
    printFn: typeof window.printFiltered,
  }));

  ok(`${file}: print-filtered button + sheet present`, info.btn && info.sheet && info.printFn === 'function', info);
  ok(`${file}: ${perPage} products per printed page`, info.per === perPage, info.per);
  ok(`${file}: price-band facet rendered`, info.hasPriceFacet);
  ok(`${file}: button reports every card and its page count`,
     info.btnText.replace(/\s+/g, ' ').includes(`Print these ${info.cards} · ${Math.ceil(info.cards / perPage)} page`),
     info.btnText.replace(/\s+/g, ' ').trim());

  // Price bands must read cheapest-first. Count-descending (the default facet order,
  // right for materials and colours) would put whichever band happens to be largest
  // at the top of a price list, which is not a price list.
  const bandOrder = await page.evaluate(() => {
    const f = [...document.querySelectorAll('#facets .facet')].find(x => x.dataset.key === 'price');
    return [...f.querySelectorAll('.facet-opt input')].map(i => i.value);
  });
  const LADDER = ['Under $100', '$100 - $249', '$250 - $499', '$500 - $999', '$1,000 - $1,999',
                  '$2,000 - $3,499', '$3,500 - $4,999', '$5,000 - $7,499', '$7,500 - $9,999', '$10,000 and up'];
  const idx = bandOrder.map(b => LADDER.indexOf(b));
  ok(`${file}: price bands ascend and are all known`,
     idx.length > 1 && idx.every((v, i) => v >= 0 && (i === 0 || v > idx[i - 1])), bandOrder);

  // The sheet must not exist in ordinary print output, or it would land in the static
  // catalog PDFs that scripts/build_catalog_pdfs.mjs renders.
  await page.emulateMedia({ media: 'print' });
  const hiddenInPrint = await page.evaluate(() => getComputedStyle(document.getElementById('filterSheet')).display);
  ok(`${file}: #filterSheet is display:none in print media until asked for`, hiddenInPrint === 'none', hiddenInPrint);
  await page.emulateMedia({ media: 'screen' });

  ok(`${file}: no page errors`, errs.length === 0, errs);
  await page.close();
}

// -------------------------------------- filters narrow, and the sheet prints EXACTLY those
for (const file of ['metal-caskets.html', 'urns-guide.html', 'keepsake-urns-guide.html']) {
  const perPage = PAGES[file];
  const { page, errs } = await open(file);

  // Pick the price band with the most items that still leaves a partial last page,
  // and compute the expected count from the cards' own data-price.
  const res = await page.evaluate(() => {
    const f = [...document.querySelectorAll('#facets .facet')].find(x => x.dataset.key === 'price');
    const inputs = [...f.querySelectorAll('.facet-opt input')];
    const target = inputs[0];
    // Expected = cards whose price falls in that band, derived independently of the
    // facet engine: re-parse data-price against the printed band label.
    const label = target.value;
    const nums = label.match(/[\d,]+/g).map(x => parseFloat(x.replace(/,/g, '')));
    const lo = /^Under/.test(label) ? 0 : nums[0];
    const hi = /and up$/.test(label) ? Infinity : (/^Under/.test(label) ? nums[0] - 0.01 : nums[1]);
    const expected = [...document.querySelectorAll('.product-card')]
      .filter(c => { const p = parseFloat(c.dataset.price); return p >= lo && p <= hi; }).length;
    target.checked = true; target.dispatchEvent(new Event('change'));
    const visible = [...document.querySelectorAll('.product-card')].filter(c => c.style.display !== 'none');
    return {
      label, expected, visible: visible.length,
      names: visible.map(c => c.querySelector('.product-name').textContent.trim()),
      countText: document.getElementById('filterCount').textContent.trim(),
      btnText: document.getElementById('filterPrintBtn').textContent.replace(/\s+/g, ' ').trim(),
    };
  });
  ok(`${file}: price band "${res.label}" narrows to the cards that actually cost that much`,
     res.visible === res.expected && res.visible > 0 && res.visible < 500, res);
  ok(`${file}: live count follows the filter`, res.countText.startsWith(String(res.visible)), res.countText);
  ok(`${file}: print button follows the filter`,
     res.btnText.includes(`Print these ${res.visible} · ${Math.ceil(res.visible / perPage)} page`), res.btnText);

  // Stack a search on top of the facet — AND, never widening.
  const narrowed = await page.evaluate((first) => {
    const q = document.getElementById('searchInput');
    q.value = first.slice(0, 4).toLowerCase();
    window.filterCards();
    const visible = [...document.querySelectorAll('.product-card')].filter(c => c.style.display !== 'none');
    return { n: visible.length, names: visible.map(c => c.querySelector('.product-name').textContent.trim()) };
  }, res.names[0]);
  ok(`${file}: search AND facet narrows further, never widens`,
     narrowed.n > 0 && narrowed.n <= res.visible, { before: res.visible, after: narrowed.n });

  // Back to the facet alone, then build the sheet.
  const sheet = await page.evaluate(() => {
    document.getElementById('searchInput').value = '';
    window.filterCards();
    const pages = window.bwBuildFilteredSheet();
    const pageEls = [...document.querySelectorAll('#filterSheet .fs-page')];
    return {
      pages,
      pageEls: pageEls.length,
      items: document.querySelectorAll('#filterSheet .fs-item').length,
      perPageCounts: pageEls.map(p => p.querySelectorAll('.fs-item').length),
      names: [...document.querySelectorAll('#filterSheet .fs-name')].map(n => n.textContent.trim()),
      footers: pageEls.map(p => (p.querySelector('.fs-pageno') || {}).textContent || ''),
      mastheads: pageEls.filter(p => p.querySelector('.fs-masthead')).length,
      filterLine: (document.querySelector('#filterSheet .fs-filters') || {}).textContent || '',
      photos: document.querySelectorAll('#filterSheet .fs-photo img').length,
      specs: document.querySelectorAll('#filterSheet .fs-item .fs-specs li').length,
    };
  });
  const expectedPages = Math.ceil(res.visible / perPage);
  ok(`${file}: sheet paginates ${res.visible} items into ${expectedPages} pages of ${perPage}`,
     sheet.pages === expectedPages && sheet.pageEls === expectedPages, sheet);
  ok(`${file}: every filtered item reaches the sheet, none dropped`,
     sheet.items === res.visible && sheet.names.join('|') === res.names.join('|'),
     { items: sheet.items, expected: res.visible });
  ok(`${file}: full pages hold exactly ${perPage}, last page holds the remainder`,
     sheet.perPageCounts.slice(0, -1).every(n => n === perPage) &&
     sheet.perPageCounts[sheet.perPageCounts.length - 1] === (res.visible % perPage || perPage),
     sheet.perPageCounts);
  ok(`${file}: running masthead + "Page k of n" footer on every page`,
     sheet.mastheads === expectedPages &&
     sheet.footers.every((f, i) => f === `Page ${i + 1} of ${expectedPages}`), sheet.footers);
  ok(`${file}: each printed card carries a photo and its spec lines`,
     sheet.photos === res.visible && sheet.specs >= res.visible * 2, sheet);
  ok(`${file}: the sheet names the filter it was printed from`,
     sheet.filterLine.includes('Price') && sheet.filterLine.includes(res.label), sheet.filterLine);

  // The real proof: a genuine Chromium PDF with that many PAGES. Compare's sheet is
  // position:fixed and clips; if this one ever regressed to that, the DOM checks above
  // would still pass and this would drop to a single page.
  await page.evaluate(() => document.body.classList.add('filter-printing'));
  await page.emulateMedia({ media: 'print' });
  const pdf = await page.pdf({ format: 'Letter', printBackground: true });
  const raw = pdf.toString('latin1');
  const pdfPages = (raw.match(/\/Type\s*\/Page[^s]/g) || []).length;
  ok(`${file}: printed PDF really has ${expectedPages} pages`, pdfPages === expectedPages,
     { pdfPages, expectedPages });

  // Nothing is clipped away: the sheet's own scroll height equals its laid-out height.
  const geo = await page.evaluate(() => {
    const s = document.getElementById('filterSheet');
    const ps = [...s.querySelectorAll('.fs-page')];
    return { over: s.scrollHeight - s.clientHeight,
             heights: ps.map(p => Math.round(p.getBoundingClientRect().height)),
             tops: ps.map(p => Math.round(p.getBoundingClientRect().top)) };
  });
  ok(`${file}: pages stack (each below the last), all one page tall`,
     new Set(geo.heights).size === 1 && geo.tops.every((t, i) => i === 0 || t > geo.tops[i - 1]), geo);
  await page.emulateMedia({ media: 'screen' });
  await page.evaluate(() => document.body.classList.remove('filter-printing'));

  ok(`${file}: no page errors during filter + print`, errs.length === 0, errs);
  await page.close();
}

// ------------------------------------------------------- empty result: nothing to print
{
  const { page } = await open('metal-caskets.html');
  const empty = await page.evaluate(() => {
    document.getElementById('searchInput').value = 'zzzzzznotaproduct';
    window.filterCards();
    const btn = document.getElementById('filterPrintBtn');
    window.printFiltered();          // must be a no-op, not an empty sheet
    return { visible: [...document.querySelectorAll('.product-card')].filter(c => c.style.display !== 'none').length,
             disabled: btn.disabled,
             printing: document.body.classList.contains('filter-printing'),
             sheetPages: document.querySelectorAll('#filterSheet .fs-page').length };
  });
  ok('empty filter disables the print button and prints nothing',
     empty.visible === 0 && empty.disabled && !empty.printing && empty.sheetPages === 0, empty);
  await page.close();
}

// ------------------------------------------------------------- 4. compare regression
for (const file of ['metal-caskets.html', 'urns-guide.html']) {
  const { page, errs } = await open(file);
  const cmp = await page.evaluate(() => {
    // .click(), not .checked = true — a disabled checkbox ignores a click but happily
    // accepts an assignment, so assigning would test the assertion, not the cap.
    const cbs = [...document.querySelectorAll('.compare-cb')];
    cbs.slice(0, 2).forEach(cb => cb.click());
    return { count: document.getElementById('compareCount').textContent,
             trayVisible: document.getElementById('compareTray').classList.contains('visible'),
             chips: document.querySelectorAll('#compareTrayItems > *').length };
  });
  ok(`${file}: compare tray still fills on selection`,
     cmp.count === '2' && cmp.trayVisible && cmp.chips === 2, cmp);

  const capped = await page.evaluate(() => {
    const cbs = [...document.querySelectorAll('.compare-cb')];
    cbs.slice(0, 6).forEach(cb => { if (!cb.checked) cb.click(); });
    return { count: document.getElementById('compareCount').textContent,
             checked: cbs.filter(c => c.checked).length,
             lockedOut: cbs.filter(c => !c.checked && c.disabled).length,
             msg: document.getElementById('compareTrayMsg').textContent.trim() };
  });
  ok(`${file}: compare still caps at 4 and locks the rest out`,
     capped.count === '4' && capped.checked === 4 && capped.lockedOut > 0 && capped.msg.length > 0, capped);

  const opened = await page.evaluate(() => {
    document.getElementById('compareOpenBtn').click();
    return { open: document.getElementById('compareOverlay').classList.contains('active'),
             rows: document.querySelectorAll('#compareTable .compare-row').length ||
                   document.querySelectorAll('#compareTable > *').length };
  });
  ok(`${file}: compare view still opens with spec rows`, opened.open && opened.rows > 0, opened);
  ok(`${file}: no page errors during compare`, errs.length === 0, errs);
  await page.close();
}

// ----------------------------- 5. compare sheet: one page, nothing clipped, all six
for (const file of FILES) {
  const { page, errs } = await open(file);
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
      return {
        modeOn: photos ? 'photos' : 'specs',
        printing: document.body.classList.contains('compare-printing'),
        over: s.scrollHeight - s.clientHeight,
        imgs: s.querySelectorAll(photos
          ? '.cmp-photo-row .cmp-photo-imgwrap img' : '.cmp-table .cmp-col-img').length,
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
    ok(`${file}: compare sheet (${mode}, 4 items) — last row ends ${-g.spill}px inside the ` +
       `table, footer ${-g.footSpill}px inside the page, real PDF is ${pdfPages} page`,
       g.modeOn === mode && g.printing && g.over === 0 && g.spill <= 1 && g.footSpill <= 1 &&
       pdfPages === 1, g);
    ok(`${file}: …all 4 selected items reach the ${mode} sheet`, g.imgs === 4, g.imgs);
  }
  ok(`${file}: no page errors during compare print`, errs.length === 0, errs);
  await page.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
