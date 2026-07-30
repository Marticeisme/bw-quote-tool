/**
 * Eternal Light Columbarium, ECL-1 (Washington Memorial Park) — the single source of
 * truth for the glass-front niche dataset.
 *
 * ── STATUSES AND PRICES ARE LIVE HAND-MAINTAINED DATA ──────────────────────────────
 * When a niche sells, edit THIS file and run `node scripts/build_ecl_map.mjs`.
 * NEVER hand-edit MAPS/ECL_NicheMap.html — it is generated and will be overwritten.
 *
 * Source: the operator's price/status sheet
 *   D:\Cemetery Photos Misc\Eternal Light Columbarium (NEW)\Screenshot 2026-07-29 165406.png
 * transcribed cell by cell 2026-07-29. The sheet's own printed COUNT fields
 * (South 31, Front/North 30, West 12, East 12 — 85 total) are asserted by
 * scripts/verify_ecl_map.mjs against this file.
 *
 * Operator rulings 2026-07-29 (binding):
 *   - A price printed in the cell means AVAILABLE. The word "SOLD" means SOLD.
 *   - The sheet's cell fill colours are spreadsheet noise and carry no meaning.
 *   - Four glass-front sides with CLEAR CORNERS: no niche is visible on two faces.
 *
 * The sheet header spells the north face "ELC-1-N-X-X". That is a typo for ECL; every
 * ref in this file uses ECL-1-N-<row>-<n>.
 *
 * ── NORTH B-2 ──────────────────────────────────────────────────────────────────────
 * The sheet's B-2 cell is blank (no price, not the word SOLD) although it sits inside
 * the sheet's own count of 30. It was first carried as a third status 'unpriced';
 * the operator confirmed on 2026-07-29 that it is in fact SOLD, and it is recorded as
 * such below. The 'unpriced' status stays defined in case a future sheet produces
 * another cell that fits neither status.
 *
 * ── PRICES OF SOLD NICHES ARE NOT KNOWN ────────────────────────────────────────────
 * Unlike ROAC, this sheet prints no price for a sold niche, so p is null for every one
 * of them. Nothing in the page may invent one.
 *
 * ── GEOMETRY IS ESTIMATED FROM PHOTOGRAPHS ─────────────────────────────────────────
 * There is no fabrication drawing for ECL-1. The sheet itself says "Sizes (front/back
 * to sides) are not to scale but general design is accurate." The values below are
 * display values for the 3D scene, derived from the twelve photographs in the same
 * folder plus the sheet's column spans. THE PAGE MUST NOT PRESENT NICHE DIMENSIONS.
 *
 * Column widths per face are taken from the sheet's own cell boundaries, measured in
 * sheet pixels and used as unitless `fr` tracks — so the relative widths are the
 * sheet's, exactly, while the absolute size is ours. Row heights are made UNIFORM: the
 * sheet's row heights are spreadsheet row heights and disagree face to face (the same
 * physical shelf is 66px on one elevation and 93px on another), so they carry no
 * information.
 */

// ── Scene constants (inches, ESTIMATED — never displayed) ────────────────────
export const GEO = {
  faceW: 92,     // glass field width on the broad (south / north) elevations
  faceD: 34,     // glass field width on the end (east / west) elevations
  post: 5,       // solid corner pilaster — the corners are CLEAR, no niche wraps them
  rowH: 13.5,    // niche row pitch (6 rows)
  baseH: 10,     // base band carrying the face caption
  crownH: 7,     // dark-wood cornice above the glass
  crownOver: 4,  // cornice overhang past the box on every side
  plinthH: 6,    // dark-wood plinth below the base band
  plinthOver: 3,
  floorPad: 150, // carpet beyond the structure
};
export const BOX_W = GEO.faceW + 2 * GEO.post;   // 102 — north/south outside width
export const BOX_D = GEO.faceD + 2 * GEO.post;   //  44 — east/west outside width
export const ROWS = ['F', 'E', 'D', 'C', 'B', 'A']; // top row first; A is the BOTTOM
export const FACE_H = ROWS.length * GEO.rowH + GEO.baseH; // 91

// ── Faces ────────────────────────────────────────────────────────────────────
// Sheet order: South, Front (North), West, East.
export const FACE_ORDER = ['S', 'N', 'W', 'E'];
export const FACE_META = {
  S: { label: 'South', caption: 'SOUTH ELEVATION', rotY: 0, wide: true },
  N: { label: 'Front (North)', caption: 'FRONT — NORTH ELEVATION', rotY: 180, wide: true },
  W: { label: 'West', caption: 'WEST ELEVATION', rotY: -90, wide: false },
  E: { label: 'East', caption: 'EAST ELEVATION', rotY: 90, wide: false },
};

export const STATUS_LABEL = { sold: 'Sold', unpriced: 'Not Priced' };
/** Statuses that must never render a price, anywhere, in any view. */
export const UNSELLABLE = ['sold', 'unpriced'];

// ── Fees (sheet footers, 2026-07-29) ─────────────────────────────────────────
export const FEES = {
  ECF_RATE: 0.1,   // "E.C.F. 10% - E.C.F. not included is listed prices."
  OC: 835,         // Open & Closing, each
  REC: 225,        // Recording Fee, each
  SCROLL: 785,     // #5108 Bronze Scroll — optional add-on, NOT in per-niche math
  VASE: 370,       // Vase with Ring — optional add-on, NOT in per-niche math
};

// ── Price tiers (13 distinct prices on the sheet) ────────────────────────────
export const TIERS = [
  { p: 10995, l: '$10,995', c: 'r0', bg: '#1a6fae', fg: '#fff' },
  { p: 12095, l: '$12,095', c: 'r1', bg: '#0f8f96', fg: '#0e1729' },
  { p: 14295, l: '$14,295', c: 'r2', bg: '#1f8f5e', fg: '#0e1729' },
  { p: 15395, l: '$15,395', c: 'r3', bg: '#237a3a', fg: '#fff' },
  { p: 17595, l: '$17,595', c: 'r4', bg: '#5c9022', fg: '#0e1729' },
  { p: 18695, l: '$18,695', c: 'r5', bg: '#7d9a18', fg: '#0e1729' },
  { p: 20895, l: '$20,895', c: 'r6', bg: '#a89f14', fg: '#0e1729' },
  { p: 26395, l: '$26,395', c: 'r7', bg: '#c39a10', fg: '#0e1729' },
  { p: 28595, l: '$28,595', c: 'r8', bg: '#e07b12', fg: '#0e1729' },
  { p: 29695, l: '$29,695', c: 'r9', bg: '#cf4a1c', fg: '#fff' },
  { p: 32995, l: '$32,995', c: 'r10', bg: '#c2332b', fg: '#fff' },
  { p: 55000, l: '$55,000', c: 'r11', bg: '#8b4fbb', fg: '#fff' },
  { p: 82500, l: '$82,500', c: 'r12', bg: '#c02f84', fg: '#fff' },
];

/**
 * WALLS — one entry per elevation.
 *
 *   cols  unitless column tracks, in the sheet's own pixel widths. Every niche starts
 *         and ends on a track boundary; the tracks are the union of all six rows'
 *         cell edges, so the widths ARE the sheet's.
 *   r     row letter (A bottom … F top)      n   niche number within the row
 *   c     1-based first column track          w   number of column tracks spanned
 *   h     rows spanned (2 = a multi-row family unit)
 *   p     price in whole dollars, or null when the sheet prints none
 *   st    'available' | 'sold' | 'unpriced'
 */
export const WALLS = {
  // ── SOUTH (ECL-1-S-X-X), sheet COUNT: 31 ──────────────────────────────────
  S: {
    cols: [47, 23, 46, 62, 69, 69, 56, 46, 23, 45],
    niches: [
      { r: 'F', n: 1, c: 1, w: 3, p: null, st: 'sold' },
      { r: 'F', n: 2, c: 4, w: 1, p: 18695, st: 'available' },
      { r: 'F', n: 3, c: 5, w: 2, p: 29695, st: 'available' },
      { r: 'F', n: 4, c: 7, w: 1, p: 18695, st: 'available' },
      { r: 'F', n: 5, c: 8, w: 3, p: null, st: 'sold' },

      { r: 'E', n: 1, c: 1, w: 2, p: null, st: 'sold' },
      { r: 'E', n: 2, c: 3, w: 1, p: null, st: 'sold' },
      { r: 'E', n: 3, c: 4, w: 2, p: null, st: 'sold' },
      { r: 'E', n: 4, c: 6, w: 2, p: null, st: 'sold' },
      { r: 'E', n: 5, c: 8, w: 1, p: null, st: 'sold' },
      { r: 'E', n: 6, c: 9, w: 2, p: null, st: 'sold' },

      { r: 'D', n: 1, c: 1, w: 1, p: 17595, st: 'available' },
      { r: 'D', n: 2, c: 2, w: 3, p: 32995, st: 'available' },
      { r: 'D', n: 3, c: 7, w: 3, p: 32995, st: 'available' },
      { r: 'D', n: 4, c: 10, w: 1, p: 17595, st: 'available' },

      { r: 'C', n: 1, c: 1, w: 3, p: 29695, st: 'available' },
      { r: 'C', n: 2, c: 4, w: 1, p: 17595, st: 'available' },
      // C-3 is the large two-row family unit in the centre of the south elevation.
      { r: 'C', n: 3, c: 5, w: 2, h: 2, p: 82500, st: 'available' },
      { r: 'C', n: 4, c: 7, w: 1, p: 17595, st: 'available' },
      { r: 'C', n: 5, c: 8, w: 3, p: null, st: 'sold' },

      { r: 'B', n: 1, c: 1, w: 2, p: null, st: 'sold' },
      { r: 'B', n: 2, c: 3, w: 1, p: null, st: 'sold' },
      { r: 'B', n: 3, c: 4, w: 2, p: null, st: 'sold' },
      { r: 'B', n: 4, c: 6, w: 2, p: null, st: 'sold' },
      { r: 'B', n: 5, c: 8, w: 1, p: null, st: 'sold' },
      { r: 'B', n: 6, c: 9, w: 2, p: 15395, st: 'available' },

      { r: 'A', n: 1, c: 1, w: 3, p: null, st: 'sold' },
      { r: 'A', n: 2, c: 4, w: 1, p: 10995, st: 'available' },
      { r: 'A', n: 3, c: 5, w: 2, p: null, st: 'sold' },
      { r: 'A', n: 4, c: 7, w: 1, p: 10995, st: 'available' },
      { r: 'A', n: 5, c: 8, w: 3, p: null, st: 'sold' },
    ],
  },

  // ── FRONT / NORTH (sheet header reads "ELC-1-N-X-X"; typo), COUNT: 30 ─────
  N: {
    cols: [70, 23, 23, 23, 46, 24, 24, 23, 23, 46, 23, 23, 23, 68],
    niches: [
      { r: 'F', n: 1, c: 1, w: 3, p: null, st: 'sold' },
      { r: 'F', n: 2, c: 4, w: 3, p: null, st: 'sold' },
      { r: 'F', n: 3, c: 7, w: 2, p: null, st: 'sold' },
      { r: 'F', n: 4, c: 9, w: 3, p: null, st: 'sold' },
      { r: 'F', n: 5, c: 12, w: 3, p: null, st: 'sold' },

      { r: 'E', n: 1, c: 1, w: 1, p: 17595, st: 'available' },
      { r: 'E', n: 2, c: 2, w: 4, p: null, st: 'sold' },
      { r: 'E', n: 3, c: 6, w: 2, p: null, st: 'sold' },
      { r: 'E', n: 4, c: 8, w: 2, p: null, st: 'sold' },
      { r: 'E', n: 5, c: 10, w: 4, p: null, st: 'sold' },
      { r: 'E', n: 6, c: 14, w: 1, p: null, st: 'sold' },

      { r: 'D', n: 1, c: 1, w: 2, p: 28595, st: 'available' },
      { r: 'D', n: 2, c: 7, w: 2, p: null, st: 'sold' },
      { r: 'D', n: 3, c: 13, w: 2, p: null, st: 'sold' },

      { r: 'C', n: 1, c: 1, w: 2, p: null, st: 'sold' },
      // C-2 and C-4 are the two large two-row family units on the front elevation.
      { r: 'C', n: 2, c: 3, w: 4, h: 2, p: 55000, st: 'available' },
      { r: 'C', n: 3, c: 7, w: 2, p: 17595, st: 'available' },
      { r: 'C', n: 4, c: 9, w: 4, h: 2, p: 55000, st: 'available' },
      { r: 'C', n: 5, c: 13, w: 2, p: 26395, st: 'available' },

      { r: 'B', n: 1, c: 1, w: 3, p: null, st: 'sold' },
      // Blank on the sheet; operator confirmed SOLD 2026-07-29. See the header.
      { r: 'B', n: 2, c: 4, w: 2, p: null, st: 'sold' },
      { r: 'B', n: 3, c: 6, w: 4, p: null, st: 'sold' },
      { r: 'B', n: 4, c: 10, w: 2, p: 15395, st: 'available' },
      { r: 'B', n: 5, c: 12, w: 3, p: null, st: 'sold' },

      { r: 'A', n: 1, c: 1, w: 2, p: null, st: 'sold' },
      { r: 'A', n: 2, c: 3, w: 2, p: 10995, st: 'available' },
      { r: 'A', n: 3, c: 5, w: 3, p: null, st: 'sold' },
      { r: 'A', n: 4, c: 8, w: 3, p: null, st: 'sold' },
      { r: 'A', n: 5, c: 11, w: 2, p: null, st: 'sold' },
      { r: 'A', n: 6, c: 13, w: 2, p: null, st: 'sold' },
    ],
  },

  // ── WEST (ECL-1-W-X-X), COUNT: 12 ─────────────────────────────────────────
  W: {
    cols: [1, 1, 1],
    niches: [
      { r: 'F', n: 1, c: 1, w: 2, p: null, st: 'sold' },
      { r: 'F', n: 2, c: 3, w: 1, p: 20895, st: 'available' },
      { r: 'E', n: 1, c: 1, w: 1, p: null, st: 'sold' },
      { r: 'E', n: 2, c: 2, w: 2, p: null, st: 'sold' },
      { r: 'D', n: 1, c: 1, w: 2, p: null, st: 'sold' },
      { r: 'D', n: 2, c: 3, w: 1, p: 18695, st: 'available' },
      { r: 'C', n: 1, c: 1, w: 1, p: 18695, st: 'available' },
      { r: 'C', n: 2, c: 2, w: 2, p: null, st: 'sold' },
      { r: 'B', n: 1, c: 1, w: 2, p: null, st: 'sold' },
      { r: 'B', n: 2, c: 3, w: 1, p: 14295, st: 'available' },
      { r: 'A', n: 1, c: 1, w: 1, p: 12095, st: 'available' },
      { r: 'A', n: 2, c: 2, w: 2, p: null, st: 'sold' },
    ],
  },

  // ── EAST (ECL-1-E-X-X), COUNT: 12 ─────────────────────────────────────────
  // The schematic marks FRONT DOOR below this elevation.
  E: {
    cols: [1, 1, 1],
    niches: [
      // Sheet note on E F-1: "SOLD Previoiusly was showing as available but sold 1/23".
      { r: 'F', n: 1, c: 1, w: 2, p: null, st: 'sold' },
      { r: 'F', n: 2, c: 3, w: 1, p: 20895, st: 'available' },
      { r: 'E', n: 1, c: 1, w: 1, p: null, st: 'sold' },
      { r: 'E', n: 2, c: 2, w: 2, p: null, st: 'sold' },
      { r: 'D', n: 1, c: 1, w: 2, p: null, st: 'sold' },
      { r: 'D', n: 2, c: 3, w: 1, p: null, st: 'sold' },
      { r: 'C', n: 1, c: 1, w: 1, p: null, st: 'sold' },
      { r: 'C', n: 2, c: 2, w: 2, p: null, st: 'sold' },
      { r: 'B', n: 1, c: 1, w: 2, p: null, st: 'sold' },
      { r: 'B', n: 2, c: 3, w: 1, p: null, st: 'sold' },
      { r: 'A', n: 1, c: 1, w: 1, p: null, st: 'sold' },
      { r: 'A', n: 2, c: 2, w: 2, p: null, st: 'sold' },
    ],
  },
};

/** `ECL-1-S-F-1` — the reference an FSD reads off the sheet. */
export const refOf = (face, r, n) => `ECL-1-${face}-${r}-${n}`;

/** Every niche, flattened, with its ref and face. */
export function allNiches() {
  const out = [];
  for (const f of FACE_ORDER) {
    for (const n of WALLS[f].niches) {
      out.push({ face: f, id: `${n.r}-${n.n}`, ref: refOf(f, n.r, n.n), ...n });
    }
  }
  return out;
}

/** A niche may show a price only when it is available AND has one. */
export const sellable = (n) => n.st === 'available' && typeof n.p === 'number';
