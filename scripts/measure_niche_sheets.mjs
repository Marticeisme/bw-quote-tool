/**
 * Measures the two Chapel of Memory glass-front niche wall sheets and DERIVES the
 * per-cell size class that `com-crypt-data.mjs` carries.
 *
 *   node scripts/measure_niche_sheets.mjs          human-readable table
 *   node scripts/measure_niche_sheets.mjs --json   the row-class patterns, for pasting
 *
 * THE SHEETS ARE THE OPERATOR'S, NOT THE REPO'S. They live at
 *   D:\Cemetery Photos Misc\Radiance and Serenity Niches\{Radiance,Serenity}.png
 * (override with --dir). They are not committed: this repo is public and the folder
 * beside them holds photographs of the physical walls with names on the fronts. So
 * this script is a DERIVATION tool run by hand when the sheets change, not a gate —
 * the gate (`verify_com_map.mjs`) re-derives what it can from the data module alone,
 * namely that every cell is classed and that every row of a wall sums to the same
 * physical width out of the printed legend.
 *
 * ── WHAT IT DOES ─────────────────────────────────────────────────────────────
 * 1. Decodes the PNG with zlib alone (no dependency): both sheets are 8-bit RGBA.
 * 2. Finds the table's horizontal rules, which gives the ten row bands K..A.
 * 3. Inside each band, finds the x positions that are dark for >=85% of the band's
 *    height — those are that ROW's cell borders. Column widths vary BY ROW on both
 *    sheets, which is exactly why a single `repeat(n, 1fr)` grid drew them wrong.
 * 4. Solves the drawn widths against the sheet's own printed size legend.
 *
 * ── WHY STEP 4 IS A SOLVE AND NOT A LOOKUP ───────────────────────────────────
 * SERENITY is drawn to scale: 416 px spans 88.5", i.e. 4.70 px/inch, and the two
 * drawn widths 104 px / 52 px read back as exactly 22 1/8" (Large) and 11 1/16"
 * (Small). Nothing to solve.
 *
 * RADIANCE is NOT drawn to scale. It has FOUR legend classes but only THREE drawn
 * widths — 86, 129 and 172 px, a clean 2:3:4 on a 43 px Excel-column unit. So the
 * class of a cell cannot be read off its width directly. What pins it is that every
 * row of one wall spans the same physical wall, so every row's classes must sum to
 * the same number of inches. Search all assignments of the four legend widths to the
 * three drawn widths (allowing the 8-cell rows and the 6-cell rows to resolve the
 * shared 129 px width differently, since the drawing cannot separate 23" from 26"),
 * keep those that are width-ordered and give a constant row sum, and exactly ONE
 * survives:
 *
 *     8-cell rows   4 x Small 18 1/4" + 4 x Large 23"      = 73  + 92 = 165"
 *     6-cell rows   4 x X-Large 26"   + 2 x Family 30 1/2" = 104 + 61 = 165"
 *
 * All four legend classes are used, and the totals agree to the inch. The script
 * prints the full candidate search so the uniqueness is visible, not asserted.
 *
 * ── THE FAMILY DISCREPANCY, RECORDED NOT RESOLVED ────────────────────────────
 * The legend gives Family as 11 7/8" x 30 1/2" x 25 1/2" — the same 11 7/8" HEIGHT as
 * every other Radiance class, and twice the 12 3/4" DEPTH. The sheet nevertheless
 * draws the two Family cells TWO ROWS TALL. Both cannot be true. This script reports
 * what the sheet draws (two rows tall, 4 units wide) and the data module models the
 * drawing, because the drawing is what the operator and the family both look at; the
 * legend's height/depth figures are carried through untouched beside it. Nobody has
 * invented a reconciliation.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const argv = process.argv.slice(2);
const wantJson = argv.includes('--json');
const dirArg = argv.indexOf('--dir');
const DIR = dirArg > -1 ? argv[dirArg + 1] : 'D:\\Cemetery Photos Misc\\Radiance and Serenity Niches';

// ── PNG ───────────────────────────────────────────────────────────────────────
/** Minimal 8-bit truecolour(+alpha) PNG decode. Returns {w,h,dark(x,y)}. */
function readPng(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error(`${file} is not a PNG`);
  let off = 8, ihdr = null;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('latin1', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      ihdr = { w: data.readUInt32BE(0), h: data.readUInt32BE(4), depth: data[8], color: data[9], interlace: data[12] };
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (!ihdr) throw new Error('no IHDR');
  if (ihdr.depth !== 8 || ihdr.interlace !== 0 || (ihdr.color !== 2 && ihdr.color !== 6)) {
    throw new Error(`unsupported PNG: depth ${ihdr.depth}, colour type ${ihdr.color}, interlace ${ihdr.interlace}`);
  }
  const bpp = ihdr.color === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = ihdr.w * bpp;
  const out = Buffer.alloc(ihdr.h * stride);
  let p = 0;
  for (let y = 0; y < ihdr.h; y++) {
    const ft = raw[p++];
    const line = raw.subarray(p, p + stride); p += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = prev ? prev[i] : 0;
      const c = prev && i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (ft === 1) v += a;
      else if (ft === 2) v += b;
      else if (ft === 3) v += (a + b) >> 1;
      else if (ft === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[i] = v & 255;
    }
  }
  const dark = (x, y) => {
    const i = y * stride + x * bpp;
    return out[i] + out[i + 1] + out[i + 2] < 300;   // near-black rule, not a wash
  };
  return { w: ihdr.w, h: ihdr.h, dark };
}

/** Runs of adjacent values collapsed to their centres. */
function centres(xs, slack = 2) {
  const g = [];
  for (const x of xs) {
    if (g.length && x - g[g.length - 1][g[g.length - 1].length - 1] <= slack) g[g.length - 1].push(x);
    else g.push([x]);
  }
  return g.map((r) => r.reduce((a, b) => a + b, 0) / r.length);
}

/** The ten row bands and, inside each, that row's own cell borders. */
function gridOf(img, rows) {
  // 1. Long verticals give the table's vertical extent. Both the outer box and the
  //    grid's own columns qualify; the grid is the taller structure's inner one.
  const colDark = [];
  for (let x = 0; x < img.w; x++) { let n = 0; for (let y = 0; y < img.h; y++) if (img.dark(x, y)) n++; colDark.push(n); }
  const tallV = centres([...colDark.keys()].filter((x) => colDark[x] > img.h * 0.5));
  if (tallV.length < 2) throw new Error('no full-height table verticals found');
  const vx0 = Math.round(tallV[0]), vx1 = Math.round(tallV[tallV.length - 1]);

  // 2. Horizontal rules, counted ONLY across the table, so the fee/legend boxes off to
  //    the right cannot contribute. The threshold is deliberately half the table width,
  //    not most of it: on Radiance the E/D rule is BROKEN by the two Family cells, which
  //    span both rows, so a "nearly full width" test would drop the very rule that
  //    proves the span. Even spacing is what identifies the grid, not completeness.
  const rowDark = [];
  for (let y = 0; y < img.h; y++) { let n = 0; for (let x = vx0; x <= vx1; x++) if (img.dark(x, y)) n++; rowDark.push(n); }
  const hRules = centres([...rowDark.keys()].filter((y) => rowDark[y] > (vx1 - vx0) * 0.5));
  let best = null;
  for (let i = 0; i + rows < hRules.length; i++) {
    const seg = hRules.slice(i, i + rows + 1);
    const gaps = seg.slice(1).map((v, k) => v - seg[k]);
    const spread = Math.max(...gaps) - Math.min(...gaps);
    if (spread <= 3 && (!best || seg[rows] - seg[0] > best[rows] - best[0])) best = seg;
  }
  if (!best) throw new Error(`could not find ${rows + 1} evenly spaced horizontal rules`);

  // 3. The GRID's own left/right edges, as opposed to the outer box's: a grid column
  //    starts at the top rule, the outer box is drawn above it.
  const top = Math.round(best[0]), bot = Math.round(best[rows]);
  const gridV = tallV.filter((x) => {
    const xi = Math.round(x);
    return img.dark(xi, top + 3) && img.dark(xi, bot - 3) && !img.dark(xi, top - 6);
  });
  if (gridV.length < 2) throw new Error('could not separate the grid edges from the outer box');
  const x0 = gridV[0], x1 = gridV[gridV.length - 1];

  const out = [];
  for (let r = 0; r < rows; r++) {
    const y0 = Math.round(best[r]) + 4, y1 = Math.round(best[r + 1]) - 4;
    const need = (y1 - y0) * 0.85;
    const xs = [];
    for (let x = Math.floor(x0) - 2; x <= Math.ceil(x1) + 2; x++) {
      let n = 0; for (let y = y0; y < y1; y++) if (img.dark(x, y)) n++;
      if (n >= need) xs.push(x);
    }
    const c = centres(xs);
    out.push({ edges: c, widths: c.slice(1).map((v, k) => +(v - c[k]).toFixed(1)), total: +(c[c.length - 1] - c[0]).toFixed(1) });
  }
  return out;
}

// ── The printed legends (transcribed from the sheets; widths in inches) ───────
const LEGEND = {
  Radiance: [
    { k: 'family', label: 'Family (2)', w: 30.5, h: 11.875, d: 25.5 },
    { k: 'xlarge', label: 'X-Large (2)', w: 26, h: 11.875, d: 12.75 },
    { k: 'large', label: 'Large (2)', w: 23, h: 11.875, d: 12.75 },
    { k: 'small', label: 'Small (2)', w: 18.25, h: 11.875, d: 12.75 },
  ],
  Serenity: [
    { k: 'large', label: 'Large (2)', w: 22.125, h: 10.5, d: 12.75 },
    { k: 'small', label: 'Small (2)', w: 11.0625, h: 10.5, d: 12.75 },
  ],
};
const ROWS = ['K', 'J', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'];

/**
 * Assign a legend class to each DRAWN width so that every row sums to one constant.
 * `shapes` groups the rows by their drawn-width signature; a shape may resolve a drawn
 * width differently from another shape (Radiance draws 23" and 26" identically), so the
 * search is over (shape, drawnWidth) pairs, subject to: within a shape, wider drawn =>
 * wider or equal real; and every shape's total identical.
 */
function solve(shapes, legend) {
  const keys = [];
  for (const s of shapes) for (const w of s.drawn) keys.push(`${s.sig}|${w}`);
  const sols = [];
  const pick = (i, map) => {
    if (i === keys.length) {
      let total = null;
      for (const s of shapes) {
        const t = s.widths.reduce((sum, w) => sum + map[`${s.sig}|${w}`].w, 0);
        if (total === null) total = t; else if (Math.abs(t - total) > 1e-9) return;
      }
      // width order must be respected inside every shape
      for (const s of shapes) {
        const seq = s.drawn.map((w) => map[`${s.sig}|${w}`].w);
        for (let k = 1; k < seq.length; k++) if (seq[k] <= seq[k - 1]) return;
      }
      sols.push({ map: { ...map }, total });
      return;
    }
    for (const c of legend) pick(i + 1, { ...map, [keys[i]]: c });
  };
  pick(0, {});
  return sols;
}

// ── Run ───────────────────────────────────────────────────────────────────────
const result = {};
let bad = 0;
for (const name of ['Radiance', 'Serenity']) {
  const file = path.join(DIR, `${name}.png`);
  if (!fs.existsSync(file)) {
    console.error(`MISSING  ${file}\n         The wall sheets are the operator's and are not committed. Pass --dir <folder>.`);
    process.exit(2);
  }
  const img = readPng(file);
  const grid = gridOf(img, ROWS.length);
  const legend = LEGEND[name];

  // group rows by drawn-width signature
  const byShape = new Map();
  grid.forEach((g, i) => {
    const sig = g.widths.join(',');
    if (!byShape.has(sig)) byShape.set(sig, { sig, widths: g.widths, drawn: [...new Set(g.widths)].sort((a, b) => a - b), rows: [] });
    byShape.get(sig).rows.push(ROWS[i]);
  });
  const shapes = [...byShape.values()];

  console.log(`\n${name}.png  ${img.w}x${img.h}`);
  for (const s of shapes) console.log(`  rows ${s.rows.join(' ')}  ${s.widths.length} cells  drawn px [${s.widths.join(', ')}]  total ${s.widths.reduce((a, b) => a + b, 0)}`);

  const sols = solve(shapes, legend);
  console.log(`  candidate class assignments satisfying constant row width: ${sols.length}`);
  if (sols.length !== 1) { bad++; console.log('  AMBIGUOUS — not encoding a guess'); continue; }
  const { map, total } = sols[0];
  console.log(`  SOLVED · every row spans ${total}"`);
  const patterns = {};
  for (const s of shapes) {
    const cls = s.widths.map((w) => map[`${s.sig}|${w}`]);
    console.log(`    rows ${s.rows.join(' ')}: ${cls.map((c, i) => `${c.label} ${c.w}"(${s.widths[i]}px)`).join(' | ')}  = ${cls.reduce((a, c) => a + c.w, 0)}"`);
    for (const r of s.rows) patterns[r] = cls.map((c) => c.k);
  }
  result[name] = { total, patterns, legend };
}

if (wantJson) console.log('\n' + JSON.stringify(result, null, 2));
if (bad) { console.log(`\n${bad} wall(s) ambiguous`); process.exit(1); }
console.log('\nboth walls solved uniquely');
