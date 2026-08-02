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
 * ── AVAILABILITY PER OPERATOR MIS LIST 2026-08-01 ──────────────────────────────────
 * The operator supplied an updated MIS-style niche list on 2026-08-01, read as THE
 * available set as of that date: 21 niches, each with its price. Its notation maps
 * "Wall-N Lvl-C Sp-2" → ECL-1-N-C-2.
 *
 *   - Every one of the 21 listed niches was already available here at EXACTLY the
 *     listed price. Zero price changes, zero listed-but-sold. Checked, not assumed.
 *   - The 7 niches that were available on the July sheet and are absent from this list
 *     have SOLD since, and are recorded st:'sold' / p:null per ECL's convention (this
 *     sheet never prints a price for a sold niche):
 *       ECL-1-S-D-2 ($32,995)   ECL-1-S-B-6 ($15,395)
 *       ECL-1-N-D-1 ($28,595)   ECL-1-N-C-5 ($26,395)
 *       ECL-1-W-C-1 ($18,695)   ECL-1-W-B-2 ($14,295)   ECL-1-W-A-1 ($12,095)
 *   - Available inventory therefore falls 28 → 21 niches, $685,175 → $536,710.
 *   - E.C.F. on the operator's list is 10% of the price on all 21 rows, matching
 *     FEES.ECF_RATE. E.C.F. stays COMPUTED, never stored per niche.
 *
 * ── STATUSES ARE MIS-BACKED AS OF 2026-08-01 ───────────────────────────────────────
 * Source: MIS Lot Inquiry List for Bldg-ECL, exported 2026-08-01. Its grammar
 * "Wall-S Lvl-F Sp-1" maps to ECL-1-S-F-1, one row per RIGHT OF INTERMENT rather than
 * per niche: 97 rows over 85 niches, the extra 12 being second and third interments in
 * a niche already counted (they are marked "(2nd)" / "-3rd" and never carry a status of
 * their own that a base row does not already imply). Rolled up worst-status-wins, the
 * 85 niches reconcile EXACTLY with this file as it stood:
 *
 *   MIS Available 21  ==  the 21 niches this file already had available, ref for ref
 *   MIS Occupied  36  \  together the 64 this file carried as the single status 'sold'
 *   MIS Reserved  28  /
 *
 * Zero disagreements in either direction, so nothing about WHAT IS FOR SALE changed and
 * the availability anchors above stand untouched. What the inquiry adds is the split the
 * price sheet could never express — which of the 64 are interred and which are reserved
 * — and those two now render differently. Statuses remain hand-maintained: when a niche
 * sells, edit THIS file and rebuild.
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
  S: { label: 'South', caption: 'SOUTH', rotY: 0, wide: true },
  N: { label: 'Front (North)', caption: 'FRONT — NORTH', rotY: 180, wide: true },
  W: { label: 'West', caption: 'WEST', rotY: -90, wide: false },
  E: { label: 'East (Front Door)', caption: 'EAST — FRONT DOOR', rotY: 90, wide: false },
};

/**
 * Status vocabulary. Until 2026-08-01 this file had ONE unsellable status, 'sold' — the
 * price sheet cannot tell an interred niche from a reserved one, so both read the same.
 * The MIS lot inquiry can, so the vocabulary is extended the way ROAC's already was:
 *   occupied  an interment is present   reserved  sold, no interment yet
 * 'sold' stays defined (and styled) as the fallback for a niche recorded from a price
 * sheet alone; no niche carries it today.
 */
export const STATUS_LABEL = {
  occupied: 'Occupied', reserved: 'Reserved', sold: 'Sold', unpriced: 'Not Priced',
};
/** Statuses that must never render a price, anywhere, in any view. */
export const UNSELLABLE = ['occupied', 'reserved', 'sold', 'unpriced'];

/**
 * RIGHTS OF INTERMENT PER NICHE.
 *
 * OPERATOR RULING, 2026-08-01, verbatim: "ecl niches are two rights each."
 *
 * The ECL price sheet is silent on capacity, so until this ruling the page and the
 * glass-front guide said nothing at all about how many urns an ECL niche holds. It is
 * two, uniformly — including the large multi-row family units, which the ruling does
 * not carve out. The figure is stated on the detail card and in the guide; it is NOT a
 * dimension and does not fall under the no-dimensions rule.
 */
export const RIGHTS = 2;

// ── Fees ─────────────────────────────────────────────────────────────────────
// OPERATOR RULING, Map Issues 07.31.26 — supersedes the sheet footers this file
// originally carried ($835 / $225):
//
//   "All glass front niches should have the same opening and closing and recording
//    fee. Also there is no inscription fee on any glass front niche. The opening and
//    closing fee is 875 and the recording fee is 235 same 10% ecf applies. There will
//    be no tax on a glass front niche unless its ecl and they add the vase and scroll"
//
// So O&C $875 / recording $235 / E.C.F. 10% are IDENTICAL across ECL, the MVC island
// and the Radiance & Serenity walls. There is no inscription fee on any of them —
// glass plates are etched differently, so the line does not exist.
//
// ECL is the ONE glass-front surface that carries sales tax, and only on the two
// optional bronze add-ons (scroll and vase), which are taxable merchandise. The niche
// price, the E.C.F., the O&C and the recording fee are never taxed.
export const FEES = {
  ECF_RATE: 0.1,   // "E.C.F. 10% - E.C.F. not included is listed prices."
  OC: 875,         // Open & Closing, each — operator 2026-07-31 (was 835)
  REC: 235,        // Recording Fee, each — operator 2026-07-31 (was 225)
  SCROLL: 785,     // #5108 Bronze Scroll — optional add-on, taxable, NOT in per-niche math
  VASE: 370,       // Vase with Ring — optional add-on, taxable, NOT in per-niche math
  TAX: 0.104,      // applies to the scroll/vase add-ons only, nothing else
};

// ── Price tiers (one per distinct AVAILABLE price) ───────────────────────────
// The gate refuses a tier that no sellable niche carries — a legend swatch for a price
// nobody can buy is a colour an FSD would go looking for. The 2026-08-01 MIS list sold
// the last niche at $12,095 / $14,295 / $26,395 / $28,595, so those four tiers (r1, r2,
// r7, r8) are retired here. The SURVIVING tiers keep their original class names and
// hues, so no remaining niche changes colour and the measured contrast ratios stand;
// the gaps in the r-numbering are the retired tiers and are deliberate.
export const TIERS = [
  { p: 10995, l: '$10,995', c: 'r0', bg: '#1a6fae', fg: '#fff' },
  { p: 15395, l: '$15,395', c: 'r3', bg: '#237a3a', fg: '#fff' },
  { p: 17595, l: '$17,595', c: 'r4', bg: '#5c9022', fg: '#0e1729' },
  { p: 18695, l: '$18,695', c: 'r5', bg: '#7d9a18', fg: '#0e1729' },
  { p: 20895, l: '$20,895', c: 'r6', bg: '#a89f14', fg: '#0e1729' },
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
      { r: 'F', n: 1, c: 1, w: 3, p: null, st: 'occupied' },
      { r: 'F', n: 2, c: 4, w: 1, p: 18695, st: 'available' },
      { r: 'F', n: 3, c: 5, w: 2, p: 29695, st: 'available' },
      { r: 'F', n: 4, c: 7, w: 1, p: 18695, st: 'available' },
      { r: 'F', n: 5, c: 8, w: 3, p: null, st: 'occupied' },

      { r: 'E', n: 1, c: 1, w: 2, p: null, st: 'occupied' },
      { r: 'E', n: 2, c: 3, w: 1, p: null, st: 'reserved' },
      { r: 'E', n: 3, c: 4, w: 2, p: null, st: 'reserved' },
      { r: 'E', n: 4, c: 6, w: 2, p: null, st: 'reserved' },
      { r: 'E', n: 5, c: 8, w: 1, p: null, st: 'occupied' },
      { r: 'E', n: 6, c: 9, w: 2, p: null, st: 'occupied' },

      { r: 'D', n: 1, c: 1, w: 1, p: 17595, st: 'available' },
      { r: 'D', n: 2, c: 2, w: 3, p: null, st: 'reserved' }, // sold since July (was $32,995)
      { r: 'D', n: 3, c: 7, w: 3, p: 32995, st: 'available' },
      { r: 'D', n: 4, c: 10, w: 1, p: 17595, st: 'available' },

      { r: 'C', n: 1, c: 1, w: 3, p: 29695, st: 'available' },
      { r: 'C', n: 2, c: 4, w: 1, p: 17595, st: 'available' },
      // C-3 is the large two-row family unit in the centre of the south elevation.
      { r: 'C', n: 3, c: 5, w: 2, h: 2, p: 82500, st: 'available' },
      { r: 'C', n: 4, c: 7, w: 1, p: 17595, st: 'available' },
      { r: 'C', n: 5, c: 8, w: 3, p: null, st: 'occupied' },

      { r: 'B', n: 1, c: 1, w: 2, p: null, st: 'occupied' },
      { r: 'B', n: 2, c: 3, w: 1, p: null, st: 'reserved' },
      { r: 'B', n: 3, c: 4, w: 2, p: null, st: 'occupied' },
      { r: 'B', n: 4, c: 6, w: 2, p: null, st: 'occupied' },
      { r: 'B', n: 5, c: 8, w: 1, p: null, st: 'reserved' },
      { r: 'B', n: 6, c: 9, w: 2, p: null, st: 'reserved' }, // sold since July (was $15,395)

      { r: 'A', n: 1, c: 1, w: 3, p: null, st: 'occupied' },
      { r: 'A', n: 2, c: 4, w: 1, p: 10995, st: 'available' },
      { r: 'A', n: 3, c: 5, w: 2, p: null, st: 'reserved' },
      { r: 'A', n: 4, c: 7, w: 1, p: 10995, st: 'available' },
      { r: 'A', n: 5, c: 8, w: 3, p: null, st: 'occupied' },
    ],
  },

  // ── FRONT / NORTH (sheet header reads "ELC-1-N-X-X"; typo), COUNT: 30 ─────
  N: {
    cols: [70, 23, 23, 23, 46, 24, 24, 23, 23, 46, 23, 23, 23, 68],
    niches: [
      { r: 'F', n: 1, c: 1, w: 3, p: null, st: 'occupied' },
      { r: 'F', n: 2, c: 4, w: 3, p: null, st: 'reserved' },
      { r: 'F', n: 3, c: 7, w: 2, p: null, st: 'occupied' },
      { r: 'F', n: 4, c: 9, w: 3, p: null, st: 'occupied' },
      { r: 'F', n: 5, c: 12, w: 3, p: null, st: 'reserved' },

      { r: 'E', n: 1, c: 1, w: 1, p: 17595, st: 'available' },
      { r: 'E', n: 2, c: 2, w: 4, p: null, st: 'reserved' },
      { r: 'E', n: 3, c: 6, w: 2, p: null, st: 'occupied' },
      { r: 'E', n: 4, c: 8, w: 2, p: null, st: 'occupied' },
      { r: 'E', n: 5, c: 10, w: 4, p: null, st: 'reserved' },
      { r: 'E', n: 6, c: 14, w: 1, p: null, st: 'occupied' },

      { r: 'D', n: 1, c: 1, w: 2, p: null, st: 'occupied' }, // sold since July (was $28,595)
      { r: 'D', n: 2, c: 7, w: 2, p: null, st: 'occupied' },
      { r: 'D', n: 3, c: 13, w: 2, p: null, st: 'occupied' },

      { r: 'C', n: 1, c: 1, w: 2, p: null, st: 'reserved' },
      // C-2 and C-4 are the two large two-row family units on the front elevation.
      { r: 'C', n: 2, c: 3, w: 4, h: 2, p: 55000, st: 'available' },
      { r: 'C', n: 3, c: 7, w: 2, p: 17595, st: 'available' },
      { r: 'C', n: 4, c: 9, w: 4, h: 2, p: 55000, st: 'available' },
      { r: 'C', n: 5, c: 13, w: 2, p: null, st: 'reserved' }, // sold since July (was $26,395)

      { r: 'B', n: 1, c: 1, w: 3, p: null, st: 'reserved' },
      // Blank on the sheet; operator confirmed SOLD 2026-07-29. See the header.
      { r: 'B', n: 2, c: 4, w: 2, p: null, st: 'occupied' },
      { r: 'B', n: 3, c: 6, w: 4, p: null, st: 'reserved' },
      { r: 'B', n: 4, c: 10, w: 2, p: 15395, st: 'available' },
      { r: 'B', n: 5, c: 12, w: 3, p: null, st: 'occupied' },

      { r: 'A', n: 1, c: 1, w: 2, p: null, st: 'reserved' },
      { r: 'A', n: 2, c: 3, w: 2, p: 10995, st: 'available' },
      { r: 'A', n: 3, c: 5, w: 3, p: null, st: 'occupied' },
      { r: 'A', n: 4, c: 8, w: 3, p: null, st: 'reserved' },
      { r: 'A', n: 5, c: 11, w: 2, p: null, st: 'occupied' },
      { r: 'A', n: 6, c: 13, w: 2, p: null, st: 'reserved' },
    ],
  },

  // ── WEST (ECL-1-W-X-X), COUNT: 12 ─────────────────────────────────────────
  W: {
    cols: [1, 1, 1],
    niches: [
      { r: 'F', n: 1, c: 1, w: 2, p: null, st: 'occupied' },
      { r: 'F', n: 2, c: 3, w: 1, p: 20895, st: 'available' },
      { r: 'E', n: 1, c: 1, w: 1, p: null, st: 'occupied' },
      { r: 'E', n: 2, c: 2, w: 2, p: null, st: 'occupied' },
      { r: 'D', n: 1, c: 1, w: 2, p: null, st: 'occupied' },
      { r: 'D', n: 2, c: 3, w: 1, p: 18695, st: 'available' },
      { r: 'C', n: 1, c: 1, w: 1, p: null, st: 'occupied' }, // sold since July (was $18,695)
      { r: 'C', n: 2, c: 2, w: 2, p: null, st: 'occupied' },
      { r: 'B', n: 1, c: 1, w: 2, p: null, st: 'reserved' },
      { r: 'B', n: 2, c: 3, w: 1, p: null, st: 'reserved' }, // sold since July (was $14,295)
      { r: 'A', n: 1, c: 1, w: 1, p: null, st: 'reserved' }, // sold since July (was $12,095)
      { r: 'A', n: 2, c: 2, w: 2, p: null, st: 'reserved' },
    ],
  },

  // ── EAST (ECL-1-E-X-X), COUNT: 12 ─────────────────────────────────────────
  // The schematic marks FRONT DOOR below this elevation.
  E: {
    cols: [1, 1, 1],
    niches: [
      // Sheet note on E F-1: "SOLD Previoiusly was showing as available but sold 1/23".
      { r: 'F', n: 1, c: 1, w: 2, p: null, st: 'occupied' },
      { r: 'F', n: 2, c: 3, w: 1, p: 20895, st: 'available' },
      { r: 'E', n: 1, c: 1, w: 1, p: null, st: 'reserved' },
      { r: 'E', n: 2, c: 2, w: 2, p: null, st: 'reserved' },
      { r: 'D', n: 1, c: 1, w: 2, p: null, st: 'occupied' },
      { r: 'D', n: 2, c: 3, w: 1, p: null, st: 'reserved' },
      { r: 'C', n: 1, c: 1, w: 1, p: null, st: 'reserved' },
      { r: 'C', n: 2, c: 2, w: 2, p: null, st: 'occupied' },
      { r: 'B', n: 1, c: 1, w: 2, p: null, st: 'occupied' },
      { r: 'B', n: 2, c: 3, w: 1, p: null, st: 'occupied' },
      { r: 'A', n: 1, c: 1, w: 1, p: null, st: 'reserved' },
      { r: 'A', n: 2, c: 2, w: 2, p: null, st: 'occupied' },
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
