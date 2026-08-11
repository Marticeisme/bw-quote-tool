// Table column alignment check for every guide/resource page.
//
// The defect this exists to stop (operator punch list, 2026-07-27):
//   "Tables for the marker guide are not over the right amount, 2220 should be
//    directly under color etc etc. this happens across multiple tables across the
//    resources guide please audit."
//
// Root cause found 2026-07-27: `.price-table th{text-align:left}` while
// `.price-table td:not(:first-child){text-align:right}`. Header text sat at the
// LEFT of the column and its numbers at the RIGHT, so "$2,200" was nowhere near
// under "Color". Nothing is wrong in the source — it only exists once rendered,
// which is why this is a render-and-measure check and not a grep.
//
// Two assertions per data cell, both measured from real layout boxes:
//   A. SHEAR  — the horizontal centre of the cell's text must fall inside the
//               header cell's column bounds. Catches a genuinely sheared column.
//   B. ANCHOR — the cell's text and its header's text must agree on an anchor
//               edge: left edges align, or right edges align, or centres align.
//               Catches the left-header/right-number mismatch above.
//
// Plus one assertion per TABLE (2026-08-04, urn-placement Section 4 defect):
//   C. WIDTH  — the table's rendered box must fit inside its parent's box.
//               A table wider than its container is clipped at the print-column
//               boundary (the screen wrapper scrolls; paper doesn't). The
//               urn-placement comparison table lost its whole Scattering column
//               this way while A and B still passed, because the grid itself
//               was internally consistent — just cut off.
//
// Measured at Letter print width in print media, because that is the artifact
// families are handed. Run from repo root:
//     node scripts/verify_table_alignment.mjs            (all pages)
//     node scripts/verify_table_alignment.mjs markers    (filter by filename)
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

// Every standalone family-facing page. index.html is the tool, not a guide, and is
// deliberately excluded — it is edited by other tracks and is not a printed handout.
const PAGES = [
  'markers-guide.html',
  'bronze-markers-guide.html',
  'vault-guide.html',
  'veterans-guide.html',
  'urn-placement-guide.html',
  'outside-marker-rules.html',
  'cremation-guide.html',
  'cremation-or-burial-guide.html',
  'cemetery-property-guide.html',
  'burial-guide.html',
  'scattering-guide.html',
  'medicaid-family-guide.html',
  'medicaid-professional-reference.html',
  'who-decides-guide.html',
  'pre-planning-guide.html',
  'urns-guide.html',
  'keepsake-urns-guide.html',
  'direct-cremation.html',
  // sprint-22: listed even though it ships zero tables today. The check is per-page, so
  // registering it now is what makes a table added to it tomorrow measured rather than
  // unmeasured — which is the whole reason check C exists.
  'inman-travel-plan-guide.html',
  'deed-transfer-letter.html',
  'vital-worksheet.html',
  'flush-markers.html',
];

const TOL = 1.5; // px — sub-pixel layout rounding only

const filters = process.argv.slice(2);
const pages = filters.length ? PAGES.filter(p => filters.some(f => p.includes(f))) : PAGES;

const AUDIT = (tol) => {
  const out = [];
  const rectsOf = (el) => {
    const r = document.createRange();
    r.selectNodeContents(el);
    return Array.from(r.getClientRects()).filter(x => x.width > 0 && x.height > 0);
  };
  document.querySelectorAll('table').forEach((table, ti) => {
    // Build a row grid. No page uses colspan/rowspan (asserted below), so a row's
    // cells map one-to-one onto column indexes.
    const rows = Array.from(table.rows);
    if (!rows.length) return;
    const spans = rows.some(r => Array.from(r.cells).some(c => c.colSpan > 1 || c.rowSpan > 1));
    const caption = (table.caption && table.caption.textContent.trim()) || '';

    // C. WIDTH — runs for every table, including ones the grid checks skip.
    const parent = table.parentElement;
    if (parent) {
      const tw = table.getBoundingClientRect().width;
      const pw = parent.getBoundingClientRect().width;
      if (tw > pw + tol) out.push({ ti, caption, width: { table: +tw.toFixed(1), box: +pw.toFixed(1) } });
    }

    if (spans) { out.push({ ti, caption, span: true }); return; }

    // The header row is the first row that is all <th>. A table whose <th> live in
    // the first COLUMN (the .compare row-header pattern) has no column header row,
    // so there is nothing to sit under and the table is skipped.
    let hIdx = -1;
    for (let i = 0; i < rows.length; i++) {
      const cells = Array.from(rows[i].cells);
      if (cells.length > 1 && cells.every(c => c.tagName === 'TH')) { hIdx = i; break; }
    }
    if (hIdx < 0) { out.push({ ti, caption, noHeader: true }); return; }

    const hdr = Array.from(rows[hIdx].cells);
    const hdrBox = hdr.map(c => c.getBoundingClientRect());
    const hdrTxt = hdr.map(c => { const r = rectsOf(c); return r.length ? r[0] : null; });

    for (let i = hIdx + 1; i < rows.length; i++) {
      const cells = Array.from(rows[i].cells);
      if (cells.length !== hdr.length) {
        out.push({ ti, caption, row: i, ragged: cells.length + ' vs ' + hdr.length });
        continue;
      }
      cells.forEach((cell, ci) => {
        const txt = rectsOf(cell);
        if (!txt.length || !cell.textContent.trim()) return; // empty / image-only
        const first = txt[0];
        const hb = hdrBox[ci], ht = hdrTxt[ci];
        const centre = first.left + first.width / 2;
        const rec = {
          ti, caption, row: i, col: ci,
          header: hdr[ci].textContent.trim(),
          cell: cell.textContent.trim().split('\n')[0].slice(0, 40),
          cellL: +first.left.toFixed(2), cellR: +first.right.toFixed(2),
          hdrL: ht ? +ht.left.toFixed(2) : null, hdrR: ht ? +ht.right.toFixed(2) : null,
          colL: +hb.left.toFixed(2), colR: +hb.right.toFixed(2),
        };
        if (centre < hb.left - tol || centre > hb.right + tol) { rec.fail = 'SHEAR'; out.push(rec); return; }
        if (!ht) return;
        const okL = Math.abs(first.left - ht.left) <= tol;
        const okR = Math.abs(first.right - ht.right) <= tol;
        const okC = Math.abs(centre - (ht.left + ht.width / 2)) <= tol;
        if (!okL && !okR && !okC) { rec.fail = 'ANCHOR'; out.push(rec); }
      });
    }
  });
  return out;
};

const browser = await chromium.launch();
let tables = 0, cellsChecked = 0, failures = 0, skipped = 0;
const report = [];

for (const p of pages) {
  const abs = path.resolve(p);
  if (!fs.existsSync(abs)) { console.error(`  !! missing page: ${p}`); failures++; continue; }
  const page = await browser.newPage({ viewport: { width: 816, height: 1056 } }); // Letter @96dpi
  await page.goto(pathToFileURL(abs).href, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = true));
  await page.emulateMedia({ media: 'print' });
  const nTables = await page.evaluate(() => document.querySelectorAll('table').length);
  const nCells = await page.evaluate(() => document.querySelectorAll('table td').length);
  const rows = await page.evaluate(AUDIT, TOL);
  await page.close();

  tables += nTables;
  cellsChecked += nCells;
  const bad = rows.filter(r => r.fail || r.span || r.ragged || r.width);
  const noHdr = rows.filter(r => r.noHeader).length;
  skipped += noHdr;
  failures += bad.length;
  const tag = bad.length ? 'FAIL' : ' ok ';
  console.log(`  ${tag}  ${p.padEnd(38)} ${String(nTables).padStart(2)} tables, ${String(nCells).padStart(4)} cells` +
              (noHdr ? `, ${noHdr} without a column-header row (skipped)` : ''));
  for (const b of bad) {
    if (b.width) { console.log(`        WIDTH  table ${b.ti} "${b.caption}" renders ${b.width.table}px wide in a ${b.width.box}px box — clipped in print`); report.push(b); continue; }
    if (b.span) { console.log(`        SPAN   table ${b.ti} "${b.caption}" uses colspan/rowspan — grid check not applicable`); continue; }
    if (b.ragged) { console.log(`        RAGGED table ${b.ti} "${b.caption}" row ${b.row}: ${b.ragged} cells`); continue; }
    console.log(`        ${b.fail}  table ${b.ti} "${b.caption}" row ${b.row} col ${b.col}` +
                ` header "${b.header}" cell "${b.cell}"`);
    console.log(`               cell text [${b.cellL}, ${b.cellR}]  header text [${b.hdrL}, ${b.hdrR}]  column [${b.colL}, ${b.colR}]`);
    report.push(b);
  }
}
await browser.close();

console.log('');
console.log(`${tables} tables, ${cellsChecked} cells checked across ${pages.length} pages, ` +
            `${skipped} tables skipped (no column-header row), ${failures} failed`);
if (failures) process.exit(1);
