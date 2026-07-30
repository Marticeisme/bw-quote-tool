// Generate the downloadable PDFs for the reference guides, printed straight from
// the HTML pages so page and PDF can't drift. Mirrors build_catalog_pdfs.mjs:
// each page's own print stylesheet (@page{size:letter;margin:0}) via
// preferCSSPageSize, printBackground on so the navy cover/callouts survive, then
// Ghostscript downsampling if available.
//
// Run from repo root:  node scripts/build_guide_pdfs.mjs
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { execFileSync } from 'child_process';
import { pathToFileURL } from 'url';

const JOBS = [
  ['veterans-guide.html',          'pdf-assets/Veterans Guide.pdf'],
  ['cemetery-property-guide.html', 'pdf-assets/Cemetery Property Guide.pdf'],
  ['cremation-or-burial-guide.html', 'pdf-assets/Cremation or Burial.pdf'],
  ['markers-guide.html',           'pdf-assets/Granite Marker Guide.pdf'],
  ['medicaid-family-guide.html',   'pdf-assets/Medicaid and Planning Ahead.pdf'],
  ['medicaid-professional-reference.html', 'pdf-assets/Medicaid Professional Reference.pdf'],
  ['who-decides-guide.html',        'pdf-assets/Who Decides.pdf'],
  ['urn-placement-guide.html',      'pdf-assets/Urn Placement Options.pdf'],
  ['pre-planning-guide.html',       'pdf-assets/Pre-Planning Guide.pdf'],
  ['burial-guide.html',             'pdf-assets/Burial Guide.pdf'],
  ['cremation-guide.html',          'pdf-assets/Cremation Guide.pdf'],
  ['scattering-guide.html',         'pdf-assets/Scattering Garden Pricing.pdf'],
  ['direct-cremation.html',         'pdf-assets/Direct Cremation Plan Example.pdf'],
  ['vault-guide.html',              'pdf-assets/Burial Vault Guide.pdf'],
  ['outside-marker-rules.html',     'pdf-assets/Outside Marker Rules and Pricing.pdf'],
  ['terramation-guide.html',        'pdf-assets/Terramation Guide.pdf'],
  ['granite-niches-guide.html',     'pdf-assets/Granite Niches Guide.pdf'],
  ['glass-front-niches-guide.html', 'pdf-assets/Glass-Front Niche Guide.pdf'],
  ['urn-gardens-guide.html',        'pdf-assets/Urn Gardens at Washington Memorial Park.pdf'],
];
// outside-marker-rules.html was never registered here, which is the whole reason its
// card on guides.html offered no PDF download while every other guide did. Added
// 2026-07-27 (punch list item 11) together with the `guide-pdf` link on the card.
// vault-guide.html was deliberately unregistered until 2026-07-26. The committed PDF was not
// a print of the page: it carried three sections the page has never contained (verified with
// `git log -S`) — OVERSIZE OPTIONS (Oversize Monticello $4,085, 40# Oversize Rough Box
// $3,355), INFANT & CHILD "Loved & Cherished" (19" $505, 2' $715, 3' $925) and SERVICE FEES
// (Burial Vault Setting $685, Cremation Vault Setting $575) — so any rebuild would delete
// them. Martice confirmed 2026-07-26 that all seven are **discontinued products**: the PDF had
// been advertising dead prices to families, which is worse than the stale images it also had.
// Registered and rebuilt on that decision. If a price here ever needs to outlive the page,
// put it ON the page — never leave it only in a generated artifact.

// Optional filter: `node scripts/build_guide_pdfs.mjs who-decides` builds only matching
// jobs (source filename contains one of the given substrings). No args = all.
const filters = process.argv.slice(2);
const jobs = filters.length ? JOBS.filter(([src]) => filters.some(f => src.includes(f))) : JOBS;

const GS = ['C:/Program Files/gs/gs10.07.0/bin/gswin64c.exe', 'gswin64c', 'gs']
  .find(p => { try { execFileSync(p, ['--version'], { stdio: 'ignore' }); return true; } catch { return false; } });

function shrink(file) {
  if (!GS) return false;
  const tmp = file + '.tmp';
  execFileSync(GS, [
    '-q', '-sDEVICE=pdfwrite', '-dCompatibilityLevel=1.5',
    '-dDownsampleColorImages=true', '-dColorImageResolution=170',
    '-dColorImageDownsampleType=/Bicubic',
    '-sColorConversionStrategy=LeaveColorUnchanged',
    '-dNOPAUSE', '-dBATCH', `-sOutputFile=${tmp}`, file,
  ], { stdio: 'ignore' });
  if (fs.existsSync(tmp) && fs.statSync(tmp).size > 1024) { fs.renameSync(tmp, file); return true; }
  if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  return false;
}

// page.pdf() renders the whole document without ever scrolling, so an image
// carrying loading="lazy" below the fold never enters the viewport, never starts
// a request, and prints blank. waitUntil:'networkidle' does not help — there is
// no request in flight to wait for. Flip them eager here, at build time only, so
// the pages keep lazy loading in a browser. Mirrors build_catalog_pdfs.mjs.
async function loadAllImages(page) {
  return page.evaluate(async () => {
    // Skip src-less placeholders: the product-modal and print-sheet <img> are
    // filled in by JS on click and are legitimately empty at print time.
    const imgs = Array.from(document.images).filter(i => (i.getAttribute('src') || '').trim());
    for (const img of imgs) {
      if (img.loading === 'lazy') img.loading = 'eager';
      if (!img.complete && !img.currentSrc) img.src = img.src;
    }
    await Promise.all(imgs.map(img => (
      img.complete && img.naturalWidth > 0
        ? Promise.resolve()
        : new Promise(resolve => {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', resolve, { once: true });
            setTimeout(resolve, 15000);
          })
    )));
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    return imgs.filter(i => !(i.complete && i.naturalWidth > 0))
               .map(i => i.getAttribute('src'));
  });
}

const browser = await chromium.launch();
let failures = 0;
for (const [src, out, opts = {}] of jobs) {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(path.resolve(src)).href, { waitUntil: 'networkidle' });
  // force <details> open so FAQ answers print (belt-and-suspenders with the CSS)
  await page.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = true));
  const badImages = await loadAllImages(page);
  if (badImages.length) {
    failures++;
    console.error(`  !! ${src}: ${badImages.length} image(s) failed to load:`);
    badImages.forEach(s => console.error('     - ' + s));
  }
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: out, printBackground: true, preferCSSPageSize: true,
                   margin: { top: '0', right: '0', bottom: '0', left: '0' } });
  await page.close();
  const raw = Math.round(fs.statSync(out).size / 1024);
  const did = opts.noShrink ? false : shrink(out);
  const kb = Math.round(fs.statSync(out).size / 1024);
  const note = opts.noShrink ? '(no downsample - keeps ligature text intact)'
             : did ? `(${raw} KB before downsample)` : '';
  console.log(`${path.basename(out).padEnd(30)} ${String(kb).padStart(5)} KB  ${note}`);
}
await browser.close();
if (failures) {
  console.error(`done with ${failures} job(s) that had unloadable images`);
  process.exit(1);
}
console.log('done');
