// Regenerate the downloadable catalog PDFs straight from the live HTML pages,
// so the PDF and the web page can never drift apart again.
//
// Uses each page's own print stylesheet (@page{size:letter;margin:0}) via
// preferCSSPageSize, with printBackground so the navy/cream brand colours survive.
// The filter bar and other .no-print chrome drop out automatically.
//
// Run from the repo root:  node scripts/build_catalog_pdfs.mjs
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { execFileSync } from 'child_process';
import { startPrintServer, pointLinksAtPages } from './_print-server.mjs';
import { record } from './_pdf_manifest.mjs';

// Chromium embeds the full 800px source images even though print shows them at
// ~200pt, which triples the file size for no visible gain. Downsample to 170dpi
// with Ghostscript if it's installed; skip quietly if it isn't.
const GS = ['C:/Program Files/gs/gs10.07.0/bin/gswin64c.exe', 'gswin64c', 'gs']
  .find(p => { try { execFileSync(p, ['--version'], { stdio: 'ignore' }); return true; } catch { return false; } });

function shrink(file) {
  if (!GS) return null;
  const tmp = file + '.tmp';
  execFileSync(GS, [
    '-q', '-sDEVICE=pdfwrite', '-dCompatibilityLevel=1.5',
    '-dDownsampleColorImages=true', '-dColorImageResolution=170',
    '-dColorImageDownsampleType=/Bicubic',
    '-sColorConversionStrategy=LeaveColorUnchanged',
    '-dNOPAUSE', '-dBATCH', `-sOutputFile=${tmp}`, file,
  ], { stdio: 'ignore' });
  if (fs.existsSync(tmp) && fs.statSync(tmp).size > 1024) {
    fs.renameSync(tmp, file);
    return true;
  }
  if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  return false;
}

const JOBS = [
  ['metal-caskets.html',                       'pdf-assets/Metal Caskets.pdf'],
  ['wood-caskets.html',                        'pdf-assets/Wood Caskets.pdf'],
  ['all-caskets.html',                         'pdf-assets/All Caskets.pdf'],
  ['urns-guide.html',                          'pdf-assets/Urn Catalog.pdf'],
  ['keepsake-urns-guide.html',                 'pdf-assets/Keepsake Urn Catalog.pdf'],
  ['cremation-containers-rental-caskets.html', 'pdf-assets/Cremation Containers and Rental Caskets.pdf'],
];

// Optional filter: `node scripts/build_catalog_pdfs.mjs metal wood` rebuilds only the
// jobs whose source filename contains one of the given substrings. No args = all.
const filters = process.argv.slice(2);
const jobs = filters.length ? JOBS.filter(([src]) => filters.some(f => src.includes(f))) : JOBS;

// Printed over HTTP from this tree's own dev-server, never from file:// — see the header
// of scripts/_print-server.mjs. Keeps the two builders mirrored, as the comments promise.
const server = await startPrintServer();
const browser = await chromium.launch();
for (const [src, out] of jobs) {
  const page = await browser.newPage();
  await page.goto(`${server.base}/${src}`, { waitUntil: 'networkidle' });

  // make sure every lazy image has actually decoded before printing
  await page.evaluate(async () => {
    document.querySelectorAll('img[loading="lazy"]').forEach(i => i.loading = 'eager');
    await Promise.all([...document.images]
      .filter(i => !i.complete)
      .map(i => new Promise(r => { i.onload = i.onerror = r; })));
  });
  await page.emulateMedia({ media: 'print' });
  await pointLinksAtPages(page, server.base);

  await page.pdf({
    path: out,
    printBackground: true,
    preferCSSPageSize: true,   // honours @page{size:letter;margin:0}
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });
  await page.close();

  const raw = Math.round(fs.statSync(out).size / 1024);
  const did = shrink(out);
  const kb = Math.round(fs.statSync(out).size / 1024);
  record(out, [src]);
  const note = did ? `(${raw} KB before downsample)` : GS ? '(downsample skipped)' : '(no ghostscript)';
  console.log(`${path.basename(out).padEnd(46)} ${String(kb).padStart(6)} KB  ${note}`);
}
await browser.close();
server.stop();
console.log(GS ? 'done' : 'done - Ghostscript not found, PDFs left full size');
