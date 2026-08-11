// Print-header height check for every guide/resource page.
//
// Operator punch list, 2026-07-27: "the header for all of the files when printing
// or downloading to pdf should be a lot smaller. it is fine in html format but on
// print or pdf it takes too much of a page up."
//
// The on-screen header must not change — only the @media print rules. So this
// measures the header block in PRINT media at Letter width and reports its height
// in millimetres, and fails if any page's header eats more than CAP mm of an 11in
// (279.4 mm) page. It also prints the SCREEN height beside it, so a regression that
// shrank the web page instead of the print page is visible rather than silent.
//
// Run from repo root:  node scripts/verify_print_header.mjs
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

// The printed masthead is `.cover` on most guides and `.hero` on vault-guide.html.
const HEADER_SELECTOR = '.cover, .hero';
// Tightened from 40 mm to 33 mm at sprint-10 Track P4, deliberately. The 40 mm cap was set
// in 2026-07-27 against the navy masthead slab. That masthead is now the cream plate (the
// contrast fix — 55%-opacity white on navy was under 4.5:1 and was the first thing a family
// read), and the logo moved to the generated cover, so every guide measures 17.7-26.4 mm and
// the catalogues 31.3 mm. Leaving the cap at 40 would have left 14 mm of slack in which the
// masthead could grow back unnoticed; a cap nobody can hit is not a gate.
const CAP_MM = 33;          // of a 279.4 mm page
const MM_PER_PX = 25.4 / 96; // CSS px at 96 dpi

const PAGES = [
  'veterans-guide.html', 'cemetery-property-guide.html', 'cremation-or-burial-guide.html',
  'markers-guide.html', 'medicaid-family-guide.html', 'medicaid-professional-reference.html',
  'who-decides-guide.html', 'urn-placement-guide.html', 'pre-planning-guide.html',
  'burial-guide.html', 'cremation-guide.html', 'scattering-guide.html',
  'direct-cremation.html', 'vault-guide.html', 'outside-marker-rules.html',
  'terramation-guide.html', 'granite-niches-guide.html', 'glass-front-niches-guide.html',
  'urn-gardens-guide.html',
  'inman-travel-plan-guide.html',
  // Catalogs print and download as PDFs too, so item 20 applies to them equally.
  'urns-guide.html', 'keepsake-urns-guide.html', 'wood-caskets.html', 'metal-caskets.html',
  'all-caskets.html', 'cremation-containers-rental-caskets.html',
];

const filters = process.argv.slice(2);
const pages = filters.length ? PAGES.filter(p => filters.some(f => p.includes(f))) : PAGES;

const measure = (sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { h: +r.height.toFixed(2) };
};

const browser = await chromium.launch();
let over = 0, missing = 0;
console.log(`  ${'page'.padEnd(38)} ${'print'.padStart(8)} ${'screen'.padStart(8)}   (mm, cap ${CAP_MM})`);
for (const p of pages) {
  const abs = path.resolve(p);
  if (!fs.existsSync(abs)) { console.error(`  !! missing page: ${p}`); missing++; continue; }
  const page = await browser.newPage({ viewport: { width: 816, height: 1056 } });
  await page.goto(pathToFileURL(abs).href, { waitUntil: 'networkidle' });
  const screen = await page.evaluate(measure, HEADER_SELECTOR);
  await page.emulateMedia({ media: 'print' });
  const print = await page.evaluate(measure, HEADER_SELECTOR);
  await page.close();
  if (!print) { console.error(`  !! ${p}: no element matching "${HEADER_SELECTOR}"`); missing++; continue; }
  const mmP = print.h * MM_PER_PX, mmS = screen.h * MM_PER_PX;
  const bad = mmP > CAP_MM;
  if (bad) over++;
  console.log(`  ${bad ? 'FAIL' : ' ok '} ${p.padEnd(38)} ${mmP.toFixed(1).padStart(6)}   ${mmS.toFixed(1).padStart(6)}`);
}
await browser.close();
console.log('');
console.log(`${pages.length} pages measured, ${over} over the ${CAP_MM} mm print cap, ${missing} unmeasurable`);
if (over || missing) process.exit(1);
