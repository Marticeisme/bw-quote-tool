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
import { startPrintServer, pointLinksAtPages } from './_print-server.mjs';
import { record } from './_pdf_manifest.mjs';

const JOBS = [
  ['veterans-guide.html',          'pdf-assets/Veterans Guide.pdf'],
  ['cemetery-property-guide.html', 'pdf-assets/Cemetery Property Guide.pdf'],
  ['cremation-or-burial-guide.html', 'pdf-assets/Cremation or Burial.pdf'],
  // TWO PDFs FROM ONE PAGE — sprint-11 Track B. Operator, 2026-08-02: "separate the PDF
  // version entirely. One of the marker guides will focus on the marker sizes and colors
  // while the other focuses just on the photos, diamond etching, and the sizes of photos."
  // The `?part=` query marks the document (a five-line script at the foot of the guide sets
  // data-print-part on <html>) and the guide's own print CSS drops the other half. One
  // source page, so the two PDFs cannot drift from each other or from the website; the
  // staleness manifest keys both on the same file, so editing the guide marks both stale.
  ['markers-guide.html?part=sizes',  'pdf-assets/Granite Marker Sizes and Colors.pdf'],
  ['markers-guide.html?part=photos', 'pdf-assets/Marker Photos and Etching.pdf'],
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
  // THE FIVE PER-AREA PHOTO GUIDES — sprint-13, area-guides. Operator, 2026-08-03:
  // "larger more visual guides for each section that we still have a lot of inventory
  // for." One document per area, photo-led, capped at 8 printed pages each in
  // verify_guide_pages.mjs (PER_GUIDE_CAPS) rather than the standard 6 — the photographs
  // are the point of these and six pages cannot hold them at a size worth looking at.
  ['roac-guide.html',               'pdf-assets/Rock of Ages Columbarium.pdf'],
  ['mvc-niches-guide.html',         'pdf-assets/Mountain View New Glass-Front Niches.pdf'],
  ['ecl-guide.html',                'pdf-assets/Eternal Light Columbarium.pdf'],
  ['gomn-guide.html',               'pdf-assets/Garden of Meditation Niches.pdf'],
  ['terrace-garden-guide.html',     'pdf-assets/Terrace Garden Memorial Path.pdf'],
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
// Inputs shared by every guide, recorded in the staleness manifest alongside the page
// itself so editing one of them marks all nineteen PDFs stale.
const GUIDE_SHARED_SOURCES = ['guide-print.css'];

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
  // Keep the rewrite only if it is actually SMALLER. Ghostscript re-encodes every image
  // even when it is already under the target resolution, and on a photo-heavy page that
  // costs size instead of saving it: Cemetery Property Guide went 1,937 KB in and came
  // out 2,248 KB, and the old test — "the temp file exists and is over 1 KB" — accepted
  // it. The point of this step is a smaller email attachment; a step that makes the file
  // bigger has failed, however successfully it ran.
  if (fs.existsSync(tmp)) {
    if (fs.statSync(tmp).size > 1024 && fs.statSync(tmp).size < fs.statSync(file).size) {
      fs.renameSync(tmp, file);
      return true;
    }
    fs.unlinkSync(tmp);
  }
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

// Printed over HTTP from this tree's own dev-server, never from file:// — see the header
// of scripts/_print-server.mjs for the leak this closes. Gated by verify_guide_pages.mjs.
const server = await startPrintServer();
const browser = await chromium.launch();
let failures = 0;
for (const [src, out, opts = {}] of jobs) {
  const page = await browser.newPage();
  await page.goto(`${server.base}/${src}`, { waitUntil: 'networkidle' });
  // force <details> open so FAQ answers print (belt-and-suspenders with the CSS)
  await page.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = true));
  const badImages = await loadAllImages(page);
  if (badImages.length) {
    failures++;
    console.error(`  !! ${src}: ${badImages.length} image(s) failed to load:`);
    badImages.forEach(s => console.error('     - ' + s));
  }
  await page.emulateMedia({ media: 'print' });
  // Print-media-only background images and print-only image swaps only START their request
  // once print media is emulated, and page.pdf() does not wait for either. loadAllImages()
  // above cannot see them (it walks document.images before any swap, and a CSS background
  // is not an <img> at all). The s10 cover's hero photo was one such asset and printed as
  // blank navy until this wait was added; a print-only `content:url()` logo swap was tried
  // and dropped in s11 (see guide-print.css §3). No such asset ships right now, so this
  // loop is a no-op today — kept anyway, because the failure mode is deterministic, silent,
  // and only visible by rasterising the PDF and looking at it.
  await page.evaluate(() => Promise.all(
    Array.from(document.querySelectorAll('.cover-logo, .pc-photo')).map((el) => {
      const cs = getComputedStyle(el);
      const m = (cs.content + ' ' + cs.backgroundImage).match(/url\("?([^")]+)"?\)/);
      if (!m) return Promise.resolve();
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = img.onerror = resolve;
        img.src = m[1];
        setTimeout(resolve, 15000);
      });
    }),
  ));
  await pointLinksAtPages(page, server.base);
  // NO `margin` option. Passing one — even zeroes — makes Chromium use it INSTEAD of the
  // CSS @page margins, which leaves the @top-*/@bottom-* margin boxes with no area to
  // live in. The symptom is subtle and was caught only by dumping word coordinates: the
  // running header rendered at x=0,y=2, overlapping the body text in the very corner,
  // while the footer boxes silently never rendered at all. guide-print.css owns the page
  // geometry now, so let preferCSSPageSize carry both size and margins.
  // (build_catalog_pdfs.mjs keeps margin:0 on purpose — catalogs are full-bleed.)
  await page.pdf({ path: out, printBackground: true, preferCSSPageSize: true });
  await page.close();
  const raw = Math.round(fs.statSync(out).size / 1024);
  const did = opts.noShrink ? false : shrink(out);
  const kb = Math.round(fs.statSync(out).size / 1024);
  // A job's source may carry a `?part=` query (see the markers-guide entries above); the
  // manifest records FILES, so strip it. Left in, `fs.existsSync` would drop the page from
  // the recorded sources and the staleness gate would stop watching the guide entirely.
  record(out, [src.split('?')[0], ...GUIDE_SHARED_SOURCES].filter(f => fs.existsSync(f)));
  const note = opts.noShrink ? '(no downsample - keeps ligature text intact)'
             : did ? `(${raw} KB before downsample)` : '';
  console.log(`${path.basename(out).padEnd(30)} ${String(kb).padStart(5)} KB  ${note}`);
}
await browser.close();
server.stop();
if (failures) {
  console.error(`done with ${failures} job(s) that had unloadable images`);
  process.exit(1);
}
console.log('done');
