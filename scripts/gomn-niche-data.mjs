/**
 * Garden of Meditation niche wall, GOM-1-1 (Washington Memorial Park) — the single
 * source of truth for the Garden of Meditation dataset.
 *
 * ── STATUSES AND PRICES ARE LIVE HAND-MAINTAINED DATA ──────────────────────────────
 * When a niche sells, or when a new price sheet is issued, edit THIS file and run
 * `node scripts/build_gomn_map.mjs`. NEVER hand-edit MAPS/GOMN_NicheMap.html — it is
 * generated and will be overwritten on the next build.
 *
 * Source: the operator's price sheet
 *   D:\Cemetery Photos Misc\GOMN Niches\GOMN MAP.png
 *   "NOTE: NEW PROPERTY PRICES EFFECTIVE JANUARY 30, 2025"
 *   OFFICIAL PROPERTY ADDRESS: GOM-1-1-ROW-SPACE
 * transcribed cell by cell 2026-07-29 from 4x crops, every cell fill and every price
 * string read back out of the PNG programmatically rather than by eye.
 *
 * The wall outline sheet `GOMN NICHE MAP.png` ("GARDEN OF MEDITATION NICHES") was used
 * to cross-check the stepped shape and the row/column extents of all three blocks. It
 * agrees with the price sheet on every block: left wing cols 1–8 (rows A–B full width,
 * a raised block on cols 5–8 for rows C–E), centre cols 9–24 rows A–G, right wing cols
 * 25–32 (rows A–B full width, a raised block on cols 25–28 for rows C–E). No
 * discrepancy was found; had there been one, the PRICE sheet would win.
 *
 * ── THE FAIL-SAFE READING (operator's standing rule, 2026-07-29, binding) ──────────
 *   A PRINTED PRICE means AVAILABLE.  ANYTHING ELSE means UNAVAILABLE — "confirm in
 *   MIS". The sheet's cell fill colours (cream, salmon, purple, cyan, orange, pink,
 *   lime) carry NO meaning and are not interpreted here.
 * So `p` is a number exactly when the sheet printed one, and `null` for every other
 * niche. Nothing on the page may invent a price for an unavailable niche.
 *
 * Measured while transcribing, and recorded here as a fact about the source: on this
 * sheet every cell carrying text has the light-green fill (198,224,180) and every
 * light-green cell carries text — 37 of them. No priced cell was missed by the colour
 * pass and no green cell was blank.
 *
 * ── GEOMETRY ──────────────────────────────────────────────────────────────────────
 * This is a 2D map by operator decision: an outdoor stepped granite wall is rendered as
 * an accurate flat elevation, not a 3D scene. The page therefore shows NO niche
 * dimensions — the sheets carry none and there is no fabrication drawing.
 * Appearance (polished black granite, bronze plates and bronze vase holders) is taken
 * from the operator's photographs in the same folder. NO PHOTOGRAPH SHIPS ON THE PAGE:
 * the plates in every one of them are legible names.
 */

// ── Rows, top to bottom. A is the BOTTOM row; G the top. ─────────────────────
export const ROWS = ['G', 'F', 'E', 'D', 'C', 'B', 'A'];
export const COL_MIN = 1;
export const COL_MAX = 32;

// ── Blocks ───────────────────────────────────────────────────────────────────
// `cols` is the inclusive column range the block occupies on the sheet.
export const BLOCK_ORDER = ['full', 'L', 'C', 'R'];
export const BLOCKS = {
  L: { label: 'Left Wing', short: 'Left Wing · 1–8', cols: [1, 8] },
  C: { label: 'Center Section', short: 'Center · 9–24', cols: [9, 24] },
  R: { label: 'Right Wing', short: 'Right Wing · 25–32', cols: [25, 32] },
};
/** Which block a column belongs to. */
export const blockOf = (col) => (col <= 8 ? 'L' : col <= 24 ? 'C' : 'R');

/**
 * THE STEPPED SHAPE. For each row, the inclusive column runs that actually carry
 * niches. Everything outside these runs is a VOID — open sky beside a lower step — and
 * must never render a cell. This is the shape both sheets draw.
 *
 *   G, F        centre only            (cols 9–24)
 *   E, D, C     centre + both raised wing blocks (5–8, 9–24, 25–28)
 *   B, A        the full wall          (cols 1–32)
 */
export const ROW_RUNS = {
  G: [[9, 24]],
  F: [[9, 24]],
  E: [[5, 8], [9, 24], [25, 28]],
  D: [[5, 8], [9, 24], [25, 28]],
  C: [[5, 8], [9, 24], [25, 28]],
  B: [[1, 32]],
  A: [[1, 32]],
};

/**
 * THE TRANSCRIPTION. Every cell on the sheet that printed a price, keyed
 * `<row>-<column>`. A niche absent from this map is UNAVAILABLE by the fail-safe rule
 * above — there is no third state and no way to record a price for a niche that is not
 * for sale.
 *
 * 37 entries: 3 in the left wing, 31 in the centre, 3 in the right wing.
 */
export const PRICES = {
  // ── Left wing (cols 1–8) ──
  'C-7': 5995,
  'B-6': 4995, 'B-7': 4995,

  // ── Center section (cols 9–24) ──
  'G-13': 8995, 'G-14': 8995, 'G-15': 8995, 'G-16': 8995, 'G-18': 8995, 'G-19': 8995,
  'F-13': 7995, 'F-22': 7995, 'F-23': 7995,
  'D-9': 6995, 'D-15': 6995, 'D-20': 6995, 'D-24': 6995,
  'C-9': 5995, 'C-10': 5995, 'C-11': 5995, 'C-12': 5995, 'C-13': 5995, 'C-14': 5995,
  'C-18': 5995, 'C-19': 5995, 'C-20': 5995, 'C-22': 5995, 'C-24': 5995,
  'B-11': 4995, 'B-12': 4995, 'B-13': 4995, 'B-15': 4995, 'B-17': 4995, 'B-18': 4995,
  'B-23': 4995,

  // ── Right wing (cols 25–32) ──
  'D-26': 6995,
  'C-25': 5995, 'C-26': 5995,
};

export const STATUS_LABEL = { unavailable: 'Confirm in MIS' };
/** Statuses that must never render a price, anywhere, in any view. */
export const UNSELLABLE = ['unavailable'];

// ── Fees, verbatim off the sheet's right-hand boxes (2026-07-29) ─────────────
export const FEES = {
  ECF_RATE: 0.1,     // "E.C.F: 10%  ***E.C.F is not included in listed pricing***"
  OC: 835,           // "Open & Closing:  $835.00ea"
  REC: 225,          // "Recording Fee:   $225.00ea"
  INSCRIPTION: 605,  // "Inscription:     $605.00ea"  — optional toggle, default OFF
};

/** The sheet's own sentences. Carried onto the page verbatim; do not reinterpret. */
export const SHEET_TEXT = {
  effective: 'NOTE: NEW PROPERTY PRICES EFFECTIVE JANUARY 30, 2025',
  address: 'OFFICIAL PROPERTY ADDRESS — GOM-1-1-ROW-SPACE',
  ecf: 'E.C.F: 10% — ***E.C.F is not included in listed pricing***',
  companion: 'All Niches Sold as Companions (2) and includes one niche vase',
  urn: 'ONLY the Interlude Urn is allowed in these Niches due to size. Refer to URN price list for price.',
  photos: 'NO PHOTOS ALLOWED',
};

/**
 * The companion capacity and the urn requirement are ONE fact, not two (operator
 * clarification 2026-07-29). Stated this way on the page and in every card.
 */
export const COMPANION_NOTE =
  'Sold as a companion niche (2 inurnment rights). Due to niche size, the Interlude Urn ' +
  'is required — two fit per niche. See the urn price list for Interlude pricing.';

// ── Price tiers (5 distinct prices on the sheet) ─────────────────────────────
// The tier hue lives on the price CHIP only, never on the cell fill — the cell fill is
// polished granite, and status is coded by pattern and brightness so no hue is ever
// doing two jobs.
export const TIERS = [
  { p: 4995, l: '$4,995', c: 't0', bg: '#1a6fae', fg: '#fff' },
  { p: 5995, l: '$5,995', c: 't1', bg: '#219866', fg: '#0e1729' },
  { p: 6995, l: '$6,995', c: 't2', bg: '#a89f14', fg: '#0e1729' },
  { p: 7995, l: '$7,995', c: 't3', bg: '#e07b12', fg: '#0e1729' },
  { p: 8995, l: '$8,995', c: 't4', bg: '#c2332b', fg: '#fff' },
];

/** `GOM-1-1-C-7` — the OFFICIAL PROPERTY ADDRESS format printed on the sheet. */
export const refOf = (row, col) => `GOM-1-1-${row}-${col}`;

/** Every niche the wall carries, in reading order (top row first, left to right). */
export function allNiches() {
  const out = [];
  for (const r of ROWS) {
    for (const [a, b] of ROW_RUNS[r]) {
      for (let c = a; c <= b; c++) {
        const p = Object.prototype.hasOwnProperty.call(PRICES, `${r}-${c}`) ? PRICES[`${r}-${c}`] : null;
        out.push({
          row: r, col: c, block: blockOf(c), id: `${r}-${c}`, ref: refOf(r, c),
          p, st: p === null ? 'unavailable' : 'available',
        });
      }
    }
  }
  return out;
}

/** True only when a niche may show money: available AND carrying a real price. */
export const sellable = (n) => n.st === 'available' && typeof n.p === 'number';

/** The runs of a row that fall inside a block's column range, clipped to it. */
export function runsIn(row, block) {
  if (block === 'full') return ROW_RUNS[row];
  const [lo, hi] = BLOCKS[block].cols;
  return ROW_RUNS[row]
    .map(([a, b]) => [Math.max(a, lo), Math.min(b, hi)])
    .filter(([a, b]) => a <= b);
}
