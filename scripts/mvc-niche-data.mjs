/**
 * MVC New Glass Front Niches — the single source of truth for the niche dataset.
 *
 * Prices / refs / rights are carried over VERBATIM from the pre-3D
 * MAPS/MVC_NewGlassFront_NicheMap_1.html, which was verified 1:1 against the
 * June 2026 price sheet earlier in sprint-06 (0 mismatches). Do not re-derive them.
 *
 * PHYSICAL dimensions are derived from the fabrication drawing (Matthews Gibraltar
 * K25-377, "WA Seatac - Washington Memorial Park GFN2026.02.24"). The drawing itself is
 * Matthews' copyrighted instrument of service: only the numbers below are ours, and no
 * part of its imagery is reproduced.
 *
 *   Unit B  = Back Wall (East)   51 niches   MVC-ISL-E-Level-Space
 *   Unit C  = Front Wall (West)  48 niches + 1 electrical access panel   MVC-ISL-W
 *   Unit A1 = Side A (North)     23 niches   MVC-ISL-N
 *   Unit A2 = Side B (South)     23 niches   MVC-ISL-S
 *                                ---
 *                                145 total openings
 *
 * Island:  11'-3 7/16" (135.4375") long  x  3'-9 1/8" (45.125") wide
 *          7'-4 3/4" (88.75") overall height, 6'-10 5/8" (82.625") trim height
 *          1'-0" niche depth.
 * Course heights, bottom up: 6" finished base panel, then 3 @ 10 1/2" (rows A,B,C),
 *          then 4 @ 12 1/2" (rows D,E,F,G).  6 + 31.5 + 50 = 87.5".
 * Column module: 10 7/8".  Long walls are 10 modules wide (9'-0 3/4" C/C);
 *          end walls are 4 modules wide (3'-7 1/2" C/C).
 */

// ── Physical constants (inches) ────────────────────────────────────────────
export const ISLAND = {
  length: 135.4375,   // 11'-3 7/16"  — the East/West (long) walls
  depth: 45.125,      // 3'-9 1/8"    — the North/South (end) walls
  trimHeight: 82.625, // 6'-10 5/8"
  overallHeight: 88.75, // 7'-4 3/4"
  nicheDepth: 12,     // 1'-0"
  basePanel: 6,       // finished base panel course
};

// Octagonal room, from the REQ'D FIELD DIM PLAN.
export const ROOM = {
  across: 288,     // 24'-0" concrete base to concrete base (long axis)
  between: 144,    // 12'-0" between side bases (short axis)
  baseLength: 168, // 14'-0" base length (the flat run of the long walls)
  sideFlat: 104,   // flat run of the short walls (see note in build script)
  wallHeight: 96, // not dimensioned on the drawing — a display value, see REPORT
};

// Grid rows are 1..7 from the TOP: G F E D C B A. Heights in inches.
export const ROW_LETTERS = ['G', 'F', 'E', 'D', 'C', 'B', 'A'];
export const ROW_HEIGHTS_IN = [12.5, 12.5, 12.5, 12.5, 10.5, 10.5, 10.5];

// Sub-column width in inches. Long walls use 20 sub-columns across 10 modules of
// 10 7/8"; end walls use 12 sub-columns across 4 modules of 10 7/8".
export const SUBCOL_IN = { long: 10.875 / 2, end: 10.875 / 3 };

// ── Fraction rendering ─────────────────────────────────────────────────────
const FRAC = {
  6: '6', 10.5: '10-1/2', 10.875: '10-7/8', 12.5: '12-1/2', 14.5: '14-1/2',
  16.3125: '16-5/16', 21.75: '21-3/4', 25: '25', 31.5: '31-1/2',
};
export const inches = (v) => (FRAC[v] ? FRAC[v] + '"' : v + '"');

// Inside niche dimension -> urn opening -> face plate, straight off the drawing's
// three per-unit tables.
const URN_W = { 10.875: '9-3/4', 14.5: '13-3/8', 16.3125: '15-3/16', 21.75: '20-5/8' };
const PLATE_W = { 10.875: '10-3/16', 14.5: '13-13/16', 16.3125: '15-5/8', 21.75: '21-1/16' };
const URN_H = { 10.5: '9-3/8', 12.5: '11-3/8', 25: '23-7/8', 31.5: '30-3/8' };
const PLATE_H = { 10.5: '9-13/16', 12.5: '11-13/16', 25: '24-5/16', 31.5: '30-13/16' };

// ── Walls ──────────────────────────────────────────────────────────────────
// cells: r1/r2 = grid rows (1-indexed, end exclusive, row 1 = G at the top)
//        c1/c2 = sub-columns (1-indexed, end exclusive)
export const WALLS = {
  west: {
    key: 'west', unit: 'C', label: 'Front Wall (West)', short: 'West',
    sub: 'Entry side · A = bottom · G = top · $42K D/E companions span rows E & D · Access panel center rows A–C',
    mis: 'MVC-ISL-W-Level-Space', subcols: 20, kind: 'long', widthIn: ISLAND.length,
    cells: [
      { id: 'G-1', price: 7000, urn: 2, r1: 1, r2: 2, c1: 1, c2: 3 },
      { id: 'G-2', price: 7000, urn: 2, r1: 1, r2: 2, c1: 3, c2: 5 },
      { id: 'G-3', price: 7000, urn: 2, r1: 1, r2: 2, c1: 5, c2: 7 },
      { id: 'G-4', price: 7000, urn: 2, r1: 1, r2: 2, c1: 7, c2: 9 },
      { id: 'G-5', price: 7000, urn: 2, r1: 1, r2: 2, c1: 9, c2: 11 },
      { id: 'G-6', price: 7000, urn: 2, r1: 1, r2: 2, c1: 11, c2: 13 },
      { id: 'G-7', price: 7000, urn: 2, r1: 1, r2: 2, c1: 13, c2: 15 },
      { id: 'G-8', price: 7000, urn: 2, r1: 1, r2: 2, c1: 15, c2: 17 },
      { id: 'G-9', price: 7000, urn: 2, r1: 1, r2: 2, c1: 17, c2: 19 },
      { id: 'G-10', price: 7000, urn: 2, r1: 1, r2: 2, c1: 19, c2: 21 },
      { id: 'F-1', price: 14000, urn: 2, r1: 2, r2: 3, c1: 1, c2: 4 },
      { id: 'F-2', price: 14000, urn: 2, r1: 2, r2: 3, c1: 4, c2: 7 },
      { id: 'F-3', price: 14000, urn: 2, r1: 2, r2: 3, c1: 7, c2: 10 },
      { id: 'F-4', price: 10000, urn: 2, r1: 2, r2: 3, c1: 10, c2: 12 },
      { id: 'F-5', price: 14000, urn: 2, r1: 2, r2: 3, c1: 12, c2: 15 },
      { id: 'F-6', price: 14000, urn: 2, r1: 2, r2: 3, c1: 15, c2: 18 },
      { id: 'F-7', price: 14000, urn: 2, r1: 2, r2: 3, c1: 18, c2: 21 },
      { id: 'E-1', price: 12000, urn: 2, r1: 3, r2: 4, c1: 1, c2: 3 },
      { id: 'D/E-1', price: 42000, urn: 4, r1: 3, r2: 5, c1: 3, c2: 7 },
      { id: 'E-2', price: 18000, urn: 2, r1: 3, r2: 4, c1: 7, c2: 11 },
      { id: 'E-3', price: 18000, urn: 2, r1: 3, r2: 4, c1: 11, c2: 15 },
      { id: 'D/E-2', price: 42000, urn: 4, r1: 3, r2: 5, c1: 15, c2: 19 },
      { id: 'E-4', price: 12000, urn: 2, r1: 3, r2: 4, c1: 19, c2: 21 },
      { id: 'D-1', price: 12000, urn: 2, r1: 4, r2: 5, c1: 1, c2: 3 },
      { id: 'D-2', price: 16000, urn: 2, r1: 4, r2: 5, c1: 7, c2: 10 },
      { id: 'D-3', price: 14000, urn: 2, r1: 4, r2: 5, c1: 10, c2: 12 },
      { id: 'D-4', price: 16000, urn: 2, r1: 4, r2: 5, c1: 12, c2: 15 },
      { id: 'D-5', price: 12000, urn: 2, r1: 4, r2: 5, c1: 19, c2: 21 },
      { panel: true, r1: 5, r2: 8, c1: 9, c2: 13 },
      { id: 'C-1', price: 14000, urn: 2, r1: 5, r2: 6, c1: 1, c2: 4 },
      { id: 'C-2', price: 14000, urn: 2, r1: 5, r2: 6, c1: 4, c2: 7 },
      { id: 'C-3', price: 10000, urn: 2, r1: 5, r2: 6, c1: 7, c2: 9 },
      { id: 'C-4', price: 10000, urn: 2, r1: 5, r2: 6, c1: 13, c2: 15 },
      { id: 'C-5', price: 14000, urn: 2, r1: 5, r2: 6, c1: 15, c2: 18 },
      { id: 'C-6', price: 14000, urn: 2, r1: 5, r2: 6, c1: 18, c2: 21 },
      { id: 'B-1', price: 10000, urn: 2, r1: 6, r2: 7, c1: 1, c2: 3 },
      { id: 'B-2', price: 12000, urn: 2, r1: 6, r2: 7, c1: 3, c2: 7 },
      { id: 'B-3', price: 10000, urn: 2, r1: 6, r2: 7, c1: 7, c2: 9 },
      { id: 'B-4', price: 10000, urn: 2, r1: 6, r2: 7, c1: 13, c2: 15 },
      { id: 'B-5', price: 12000, urn: 2, r1: 6, r2: 7, c1: 15, c2: 19 },
      { id: 'B-6', price: 10000, urn: 2, r1: 6, r2: 7, c1: 19, c2: 21 },
      { id: 'A-1', price: 7000, urn: 2, r1: 7, r2: 8, c1: 1, c2: 3 },
      { id: 'A-2', price: 7000, urn: 2, r1: 7, r2: 8, c1: 3, c2: 5 },
      { id: 'A-3', price: 7000, urn: 2, r1: 7, r2: 8, c1: 5, c2: 7 },
      { id: 'A-4', price: 7000, urn: 2, r1: 7, r2: 8, c1: 7, c2: 9 },
      { id: 'A-5', price: 7000, urn: 2, r1: 7, r2: 8, c1: 13, c2: 15 },
      { id: 'A-6', price: 7000, urn: 2, r1: 7, r2: 8, c1: 15, c2: 17 },
      { id: 'A-7', price: 7000, urn: 2, r1: 7, r2: 8, c1: 17, c2: 19 },
      { id: 'A-8', price: 7000, urn: 2, r1: 7, r2: 8, c1: 19, c2: 21 },
    ],
  },
  east: {
    key: 'east', unit: 'B', label: 'Back Wall (East)', short: 'East',
    sub: 'A = bottom · G = top · $48K D/E companion niches span rows E & D',
    mis: 'MVC-ISL-E-Level-Space', subcols: 20, kind: 'long', widthIn: ISLAND.length,
    cells: [
      { id: 'G-1', price: 8000, urn: 2, r1: 1, r2: 2, c1: 1, c2: 3 },
      { id: 'G-2', price: 8000, urn: 2, r1: 1, r2: 2, c1: 3, c2: 5 },
      { id: 'G-3', price: 8000, urn: 2, r1: 1, r2: 2, c1: 5, c2: 7 },
      { id: 'G-4', price: 8000, urn: 2, r1: 1, r2: 2, c1: 7, c2: 9 },
      { id: 'G-5', price: 8000, urn: 2, r1: 1, r2: 2, c1: 9, c2: 11 },
      { id: 'G-6', price: 8000, urn: 2, r1: 1, r2: 2, c1: 11, c2: 13 },
      { id: 'G-7', price: 8000, urn: 2, r1: 1, r2: 2, c1: 13, c2: 15 },
      { id: 'G-8', price: 8000, urn: 2, r1: 1, r2: 2, c1: 15, c2: 17 },
      { id: 'G-9', price: 8000, urn: 2, r1: 1, r2: 2, c1: 17, c2: 19 },
      { id: 'G-10', price: 8000, urn: 2, r1: 1, r2: 2, c1: 19, c2: 21 },
      { id: 'F-1', price: 16000, urn: 2, r1: 2, r2: 3, c1: 1, c2: 4 },
      { id: 'F-2', price: 16000, urn: 2, r1: 2, r2: 3, c1: 4, c2: 7 },
      { id: 'F-3', price: 16000, urn: 2, r1: 2, r2: 3, c1: 7, c2: 10 },
      { id: 'F-4', price: 12000, urn: 2, r1: 2, r2: 3, c1: 10, c2: 12 },
      { id: 'F-5', price: 16000, urn: 2, r1: 2, r2: 3, c1: 12, c2: 15 },
      { id: 'F-6', price: 16000, urn: 2, r1: 2, r2: 3, c1: 15, c2: 18 },
      { id: 'F-7', price: 16000, urn: 2, r1: 2, r2: 3, c1: 18, c2: 21 },
      { id: 'E-1', price: 14000, urn: 2, r1: 3, r2: 4, c1: 1, c2: 3 },
      { id: 'D/E-1', price: 48000, urn: 4, r1: 3, r2: 5, c1: 3, c2: 7 },
      { id: 'E-2', price: 20000, urn: 2, r1: 3, r2: 4, c1: 7, c2: 11 },
      { id: 'E-3', price: 20000, urn: 2, r1: 3, r2: 4, c1: 11, c2: 15 },
      { id: 'D/E-2', price: 48000, urn: 4, r1: 3, r2: 5, c1: 15, c2: 19 },
      { id: 'E-4', price: 14000, urn: 2, r1: 3, r2: 4, c1: 19, c2: 21 },
      { id: 'D-1', price: 14000, urn: 2, r1: 4, r2: 5, c1: 1, c2: 3 },
      { id: 'D-2', price: 18000, urn: 2, r1: 4, r2: 5, c1: 7, c2: 10 },
      { id: 'D-3', price: 16000, urn: 2, r1: 4, r2: 5, c1: 10, c2: 12 },
      { id: 'D-4', price: 18000, urn: 2, r1: 4, r2: 5, c1: 12, c2: 15 },
      { id: 'D-5', price: 14000, urn: 2, r1: 4, r2: 5, c1: 19, c2: 21 },
      { id: 'C-1', price: 16000, urn: 2, r1: 5, r2: 6, c1: 1, c2: 4 },
      { id: 'C-2', price: 16000, urn: 2, r1: 5, r2: 6, c1: 4, c2: 7 },
      { id: 'C-3', price: 20000, urn: 2, r1: 5, r2: 6, c1: 7, c2: 11 },
      { id: 'C-4', price: 20000, urn: 2, r1: 5, r2: 6, c1: 11, c2: 15 },
      { id: 'C-5', price: 16000, urn: 2, r1: 5, r2: 6, c1: 15, c2: 18 },
      { id: 'C-6', price: 16000, urn: 2, r1: 5, r2: 6, c1: 18, c2: 21 },
      { id: 'B-1', price: 10000, urn: 2, r1: 6, r2: 7, c1: 1, c2: 3 },
      { id: 'B-2', price: 16000, urn: 2, r1: 6, r2: 7, c1: 3, c2: 7 },
      { id: 'B-3', price: 14000, urn: 2, r1: 6, r2: 7, c1: 7, c2: 10 },
      { id: 'B-4', price: 12000, urn: 2, r1: 6, r2: 7, c1: 10, c2: 12 },
      { id: 'B-5', price: 14000, urn: 2, r1: 6, r2: 7, c1: 12, c2: 15 },
      { id: 'B-6', price: 16000, urn: 2, r1: 6, r2: 7, c1: 15, c2: 19 },
      { id: 'B-7', price: 10000, urn: 2, r1: 6, r2: 7, c1: 19, c2: 21 },
      { id: 'A-1', price: 8000, urn: 2, r1: 7, r2: 8, c1: 1, c2: 3 },
      { id: 'A-2', price: 8000, urn: 2, r1: 7, r2: 8, c1: 3, c2: 5 },
      { id: 'A-3', price: 8000, urn: 2, r1: 7, r2: 8, c1: 5, c2: 7 },
      { id: 'A-4', price: 8000, urn: 2, r1: 7, r2: 8, c1: 7, c2: 9 },
      { id: 'A-5', price: 8000, urn: 2, r1: 7, r2: 8, c1: 9, c2: 11 },
      { id: 'A-6', price: 8000, urn: 2, r1: 7, r2: 8, c1: 11, c2: 13 },
      { id: 'A-7', price: 8000, urn: 2, r1: 7, r2: 8, c1: 13, c2: 15 },
      { id: 'A-8', price: 8000, urn: 2, r1: 7, r2: 8, c1: 15, c2: 17 },
      { id: 'A-9', price: 8000, urn: 2, r1: 7, r2: 8, c1: 17, c2: 19 },
      { id: 'A-10', price: 8000, urn: 2, r1: 7, r2: 8, c1: 19, c2: 21 },
    ],
  },
  north: {
    key: 'north', unit: 'A1', label: 'Side A (North)', short: 'North',
    sub: 'A = bottom · G = top · Same dimensions as Side B (South)',
    mis: 'MVC-ISL-N-Level-Space', subcols: 12, kind: 'end', widthIn: ISLAND.depth,
    cells: [
      { id: 'G-1', price: 8000, urn: 2, r1: 1, r2: 2, c1: 1, c2: 4 },
      { id: 'G-2', price: 8000, urn: 2, r1: 1, r2: 2, c1: 4, c2: 7 },
      { id: 'G-3', price: 8000, urn: 2, r1: 1, r2: 2, c1: 7, c2: 10 },
      { id: 'G-4', price: 8000, urn: 2, r1: 1, r2: 2, c1: 10, c2: 13 },
      { id: 'F-1', price: 16000, urn: 2, r1: 2, r2: 3, c1: 1, c2: 5 },
      { id: 'F-2', price: 16000, urn: 2, r1: 2, r2: 3, c1: 5, c2: 9 },
      { id: 'F-3', price: 16000, urn: 2, r1: 2, r2: 3, c1: 9, c2: 13 },
      { id: 'E-1', price: 18000, urn: 2, r1: 3, r2: 4, c1: 1, c2: 7 },
      { id: 'E-2', price: 14000, urn: 2, r1: 3, r2: 4, c1: 7, c2: 10 },
      { id: 'E-3', price: 14000, urn: 2, r1: 3, r2: 4, c1: 10, c2: 13 },
      { id: 'D-1', price: 16000, urn: 2, r1: 4, r2: 5, c1: 1, c2: 5 },
      { id: 'D-2', price: 16000, urn: 2, r1: 4, r2: 5, c1: 5, c2: 9 },
      { id: 'D-3', price: 16000, urn: 2, r1: 4, r2: 5, c1: 9, c2: 13 },
      { id: 'C-1', price: 18000, urn: 2, r1: 5, r2: 6, c1: 1, c2: 7 },
      { id: 'C-2', price: 14000, urn: 2, r1: 5, r2: 6, c1: 7, c2: 10 },
      { id: 'C-3', price: 14000, urn: 2, r1: 5, r2: 6, c1: 10, c2: 13 },
      { id: 'B-1', price: 14000, urn: 2, r1: 6, r2: 7, c1: 1, c2: 5 },
      { id: 'B-2', price: 14000, urn: 2, r1: 6, r2: 7, c1: 5, c2: 9 },
      { id: 'B-3', price: 14000, urn: 2, r1: 6, r2: 7, c1: 9, c2: 13 },
      { id: 'A-1', price: 8000, urn: 2, r1: 7, r2: 8, c1: 1, c2: 4 },
      { id: 'A-2', price: 8000, urn: 2, r1: 7, r2: 8, c1: 4, c2: 7 },
      { id: 'A-3', price: 8000, urn: 2, r1: 7, r2: 8, c1: 7, c2: 10 },
      { id: 'A-4', price: 8000, urn: 2, r1: 7, r2: 8, c1: 10, c2: 13 },
    ],
  },
  south: {
    key: 'south', unit: 'A2', label: 'Side B (South)', short: 'South',
    sub: 'A = bottom · G = top · Same dimensions as Side A (North)',
    mis: 'MVC-ISL-S-Level-Space', subcols: 12, kind: 'end', widthIn: ISLAND.depth,
    cells: null, // mirrors north — filled in below
  },
};
WALLS.south.cells = WALLS.north.cells.map((c) => ({ ...c }));

export const WALL_ORDER = ['west', 'east', 'north', 'south'];

// ── Derived dimensions ─────────────────────────────────────────────────────
export function cellDims(wall, c) {
  const sub = SUBCOL_IN[wall.kind];
  const w = +((c.c2 - c.c1) * sub).toFixed(4);
  let h = 0;
  for (let r = c.r1; r < c.r2; r++) h += ROW_HEIGHTS_IN[r - 1];
  h = +h.toFixed(4);
  return {
    wIn: w,
    hIn: h,
    inside: `${inches(w)} W x ${inches(h)} H`,
    // NOT `urn` — a cell's own `urn` is its RIGHTS COUNT, and allNiches() spreads both.
    opening: URN_W[w] && URN_H[h] ? `${URN_W[w]}" W x ${URN_H[h]}" H` : null,
    plate: PLATE_W[w] && PLATE_H[h] ? `${PLATE_W[w]}" W x ${PLATE_H[h]}" H` : null,
    depth: `${ISLAND.nicheDepth}"`,
  };
}

/** Every sellable niche, flattened, with derived dimensions attached. */
export function allNiches() {
  const out = [];
  for (const key of WALL_ORDER) {
    const wall = WALLS[key];
    for (const c of wall.cells) {
      if (c.panel) continue;
      out.push({ wall: key, mis: wall.mis, ...cellDims(wall, c), ...c });
    }
  }
  return out;
}

// ── Fees / prices ──────────────────────────────────────────────────────────
export const FEES = { OC: 875, REC: 235, INSCR: 660, TAX: 0.104, ECF_RATE: 0.1 };
export const EFFECTIVE = 'June 2026';

export const TIERS = [
  { p: 7000, l: '$7,000', c: 'c7' }, { p: 8000, l: '$8,000', c: 'c8' },
  { p: 10000, l: '$10,000', c: 'c10' }, { p: 12000, l: '$12,000', c: 'c12' },
  { p: 14000, l: '$14,000', c: 'c14' }, { p: 16000, l: '$16,000', c: 'c16' },
  { p: 18000, l: '$18,000', c: 'c18' }, { p: 20000, l: '$20,000', c: 'c20' },
  { p: 42000, l: '$42,000 — 4-urn', c: 'c42' }, { p: 48000, l: '$48,000 — 4-urn', c: 'c48' },
];

// Terrace Garden Niches — outdoor granite-front wall, 8 cols x 5 rows.
export const TGN = {
  rows: ['E', 'D', 'C', 'B', 'A'],
  rowPrices: { E: 12000, D: 14000, C: 16000, B: 14000, A: 12000 },
  cols: 8,
  dim: '12.5" W x 12.5" H',
  depth: '12"',
};
