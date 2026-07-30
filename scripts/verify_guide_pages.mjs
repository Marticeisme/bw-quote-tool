// Page-shape checks for the guides whose page count is part of the requirement,
// not an accident of layout. Punch list items 2, 3 and 21 (2026-07-27).
//
//   direct-cremation.html  — EXACTLY two pages. Page 1 the quote and the
//                            information about it; page 2 the cremation container,
//                            shown and explained.
//   vault-guide.html       — all seven urn vaults on ONE page, and "Complete
//                            Pricing at a Glance" on ONE page.
//
// Counts come from the BUILT PDF (pdf-lib), so this fails if somebody edits the
// page and forgets to rebuild as well as if the layout regresses. The
// "all on one page" assertions are measured in print layout: both sections carry
// `page-break-before:always`, so an element is on that section's page if and only
// if its bottom is within one Letter page of the section's top.
//
// Run from repo root:  node scripts/verify_guide_pages.mjs
import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

const PAGE_PX = 1056; // 11in at 96dpi, matching @page{size:letter;margin:0}

const PDF_PAGES = [
  ['pdf-assets/Direct Cremation Plan Example.pdf', 2],
  // Was 10 until 2026-07-29. Operator decision that day: every family guide whose
  // PDF ran past 4 pages gets a compact PRINT layout capped at 4, because these are
  // emailed and printed for families as leave-behinds. See GUIDE_MAX_PAGES below.
  ['pdf-assets/Burial Vault Guide.pdf', 4],
];

// The 4-page cap, asserted on the built artifact. Product catalogs (caskets, urns,
// keepsakes, cremation containers, the GPL, marker sizes) are deliberately NOT here:
// a catalog is as long as its catalog.
const GUIDE_MAX_PAGES = 4;
const CAPPED_GUIDES = [
  'Granite Marker Guide.pdf', 'Cremation Guide.pdf', 'Veterans Guide.pdf',
  'Who Decides.pdf', 'Burial Vault Guide.pdf', 'Terramation Guide.pdf',
  'Cemetery Property Guide.pdf', 'Medicaid and Planning Ahead.pdf',
  'Medicaid Professional Reference.pdf', 'Cremation or Burial.pdf',
  'Urn Placement Options.pdf', 'Scattering Garden Pricing.pdf', 'Burial Guide.pdf',
  'Granite Niches Guide.pdf',
];

// Guides whose own requirement is tighter than the family-guide cap. The granite-niche
// guide is a one-page screen guide that the operator asked to print to NO MORE THAN TWO
// pages (sprint-08 Track P), so 3 pages is a regression even though it clears the 4-page
// cap above.
const TIGHT_CAPS = [
  ['Granite Niches Guide.pdf', 2],
];

let bad = 0;
const fail = m => { bad++; console.log('  FAIL  ' + m); };
const ok = m => console.log('   ok   ' + m);

console.log('=== BUILT PDF PAGE COUNTS ===');
for (const [file, want] of PDF_PAGES) {
  if (!fs.existsSync(file)) { fail(`${file} does not exist — run scripts/build_guide_pdfs.mjs`); continue; }
  const n = (await PDFDocument.load(fs.readFileSync(file), { updateMetadata: false })).getPageCount();
  if (n === want) ok(`${path.basename(file).padEnd(36)} ${n} pages`);
  else fail(`${path.basename(file)}: expected ${want} pages, built PDF has ${n}`);
}

console.log(`\n=== FAMILY GUIDE PAGE CAP (<= ${GUIDE_MAX_PAGES} pages) ===`);
for (const name of CAPPED_GUIDES) {
  const file = `pdf-assets/${name}`;
  if (!fs.existsSync(file)) { fail(`${file} does not exist — run scripts/build_guide_pdfs.mjs`); continue; }
  const n = (await PDFDocument.load(fs.readFileSync(file), { updateMetadata: false })).getPageCount();
  if (n <= GUIDE_MAX_PAGES) ok(`${name.padEnd(36)} ${n} pages`);
  else fail(`${name}: ${n} pages, over the ${GUIDE_MAX_PAGES}-page leave-behind cap`);
}

console.log('\n=== TIGHTER PER-GUIDE CAPS ===');
for (const [name, cap] of TIGHT_CAPS) {
  const file = `pdf-assets/${name}`;
  if (!fs.existsSync(file)) { fail(`${file} does not exist — run scripts/build_guide_pdfs.mjs`); continue; }
  const n = (await PDFDocument.load(fs.readFileSync(file), { updateMetadata: false })).getPageCount();
  if (n <= cap) ok(`${name.padEnd(36)} ${n} pages (cap ${cap})`);
  else fail(`${name}: ${n} pages, over its own ${cap}-page cap`);
}

console.log('\n=== "ALL ON ONE PAGE" (print layout) ===');
const browser = await chromium.launch();

async function onePage(file, sectionSel, childSel, label) {
  const page = await browser.newPage({ viewport: { width: 816, height: PAGE_PX } });
  await page.goto(pathToFileURL(path.resolve(file)).href, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  const r = await page.evaluate(([s, c]) => {
    const sec = document.querySelector(s);
    if (!sec) return { missing: s };
    const top = sec.getBoundingClientRect().top;
    const kids = [...sec.querySelectorAll(c)];
    if (!kids.length) return { missing: c };
    const worst = Math.max(...kids.map(k => k.getBoundingClientRect().bottom));
    return { n: kids.length, span: +(worst - top).toFixed(1) };
  }, [sectionSel, childSel]);
  await page.close();
  if (r.missing) { fail(`${file}: nothing matches "${r.missing}"`); return; }
  if (r.span <= PAGE_PX) ok(`${label.padEnd(46)} ${r.n} items, ${r.span}px of a ${PAGE_PX}px page`);
  else fail(`${label}: ${r.n} items span ${r.span}px, more than one ${PAGE_PX}px page`);
}

await onePage('vault-guide.html', '#urn-vaults', '.uv-card', 'vault-guide urn vault cards');
await onePage('vault-guide.html', '#urn-vaults', '.vault-table', 'vault-guide urn vault section incl. table');
await onePage('vault-guide.html', '#all-pricing', '.vault-table', 'vault-guide Complete Pricing at a Glance');
await onePage('direct-cremation.html', '#options', '.sidebar, .prose, .section-photo', 'direct-cremation container section');

// direct-cremation page 1 is the cover plus sections 1 and 2; if that stack is
// taller than a page, section 2 spills and the handout becomes three pages.
{
  const page = await browser.newPage({ viewport: { width: 816, height: PAGE_PX } });
  await page.goto(pathToFileURL(path.resolve('direct-cremation.html')).href, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  const h = await page.evaluate(() => {
    const q = s => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().height : 0; };
    return +(q('.cover') + q('.contents') + q('#quote') + q('#about')).toFixed(1);
  });
  await page.close();
  if (h <= PAGE_PX) ok(`direct-cremation page 1 (cover + quote + about)  ${h}px of a ${PAGE_PX}px page`);
  else fail(`direct-cremation page 1 stack is ${h}px, more than one ${PAGE_PX}px page — section 2 will spill`);
}

await browser.close();
console.log('');
console.log(bad ? `${bad} check(s) failed` : 'all page-shape checks passed');
if (bad) process.exit(1);
