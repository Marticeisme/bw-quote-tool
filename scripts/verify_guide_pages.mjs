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
  ['pdf-assets/Burial Vault Guide.pdf', 10],
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
