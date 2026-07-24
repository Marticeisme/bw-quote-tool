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
];

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

const browser = await chromium.launch();
for (const [src, out] of jobs) {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(path.resolve(src)).href, { waitUntil: 'networkidle' });
  // force <details> open so FAQ answers print (belt-and-suspenders with the CSS)
  await page.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = true));
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: out, printBackground: true, preferCSSPageSize: true,
                   margin: { top: '0', right: '0', bottom: '0', left: '0' } });
  await page.close();
  const raw = Math.round(fs.statSync(out).size / 1024);
  const did = shrink(out);
  const kb = Math.round(fs.statSync(out).size / 1024);
  console.log(`${path.basename(out).padEnd(30)} ${String(kb).padStart(5)} KB  ${did ? `(${raw} KB before downsample)` : ''}`);
}
await browser.close();
console.log('done');
