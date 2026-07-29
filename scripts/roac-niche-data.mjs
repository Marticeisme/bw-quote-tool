/**
 * Rock of Ages Columbarium (ROAC) — the single source of truth for the niche dataset.
 *
 * Prices, statuses, tiers and spaces are carried over VERBATIM from the pre-3D
 * MAPS/ROAC_NicheMap.html (extracted by script, not retyped). The operator confirmed
 * 2026-07-29 that those prices are live and accurate. STATUSES ARE LIVE HAND-MAINTAINED
 * DATA — when a niche sells, edit THIS file and rebuild; never hand-edit the HTML.
 *
 * Structure (from the operator's photos + the MIS plan screenshot,
 * D:Cemetery Photos MiscROAC Photos — there is NO fabrication drawing):
 * a granite courtyard columbarium. Seven double-sided sections, each 5 tiers x 5
 * spaces per face (25 + 25): the south bank C-B-A (west to east), the north bank
 * E-F-G (west to east), and Wall D freestanding across the west head. INTERIOR faces
 * look into the courtyard (two memorial benches, both sold); EXTERIOR faces look out.
 * Tier A is the BOTTOM row, E the top (operator-confirmed); spaces run 1-5
 * left-to-right facing each wall.
 *
 * GEOMETRY IS ESTIMATED from photographs — dimensions below are display values for
 * the 3D scene, not fabrication data, and the page must not present niche dimensions.
 */

// ── Scene constants (inches, estimated) ────────────────────────────────────
export const GEO = {
  faceW: 78.5,        // 5 modules ~11.5" + 6 mullions ~3.5"
  rowH: 15,           // niche row pitch
  baseH: 10,          // granite base course
  capH: 4,            // cap slab
  slabT: 26,          // section thickness (two 12" niches back to back + core)
  gap: 18,            // granite pier between niche fields — banks are ONE continuous structure
  courtW: 150,        // courtyard width between the two banks' interior faces
  dGap: 24,           // gap from the banks' west ends to Wall D
  benchW: 60, benchD: 18, benchH: 17,
  padMargin: 40,      // concrete pad beyond the structures
};
export const FACE_H = 5 * GEO.rowH + GEO.baseH; // grid height incl. base band

export const LEVELS = ['E', 'D', 'C', 'B', 'A']; // top row first
export const SECTION_ORDER = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
export const FACE_ORDER = SECTION_ORDER.flatMap((s) => [s + '-EXT', s + '-INT']);

export const STATUS_LABEL = { reserved: 'Reserved', buried: 'Occupied', hold: 'On Hold' };

// ── Fees (carried from the old page's estimate math) ───────────────────────
export const FEES = { OC: 875, REC: 235, INSCR: 660, VASE: 275, TAX: 0.104, ECF_RATE: 0.1 };

// ── Price tiers (13 distinct prices; chip colour classes) ─────────────────
export const TIERS = [
  { p: 7995, l: '$7,995', c: 'r0', bg: '#1a6fae', fg: '#fff' },
  { p: 8795, l: '$8,795', c: 'r1', bg: '#0f8f96', fg: '#0e1729' },
  { p: 8995, l: '$8,995', c: 'r2', bg: '#1f8f5e', fg: '#0e1729' },
  { p: 9895, l: '$9,895', c: 'r3', bg: '#237a3a', fg: '#fff' },
  { p: 9995, l: '$9,995', c: 'r4', bg: '#5c9022', fg: '#0e1729' },
  { p: 10995, l: '$10,995', c: 'r5', bg: '#7d9a18', fg: '#0e1729' },
  { p: 11995, l: '$11,995', c: 'r6', bg: '#a89f14', fg: '#0e1729' },
  { p: 12095, l: '$12,095', c: 'r7', bg: '#c39a10', fg: '#0e1729' },
  { p: 13195, l: '$13,195', c: 'r8', bg: '#e07b12', fg: '#0e1729' },
  { p: 14295, l: '$14,295', c: 'r9', bg: '#cf4a1c', fg: '#fff' },
  { p: 15395, l: '$15,395', c: 'r10', bg: '#c2332b', fg: '#fff' },
  { p: 16495, l: '$16,495', c: 'r11', bg: '#8b4fbb', fg: '#fff' },
  { p: 17595, l: '$17,595', c: 'r12', bg: '#c02f84', fg: '#fff' },
];

// ── Walls: 14 faces x 25 niches, VERBATIM from the old page ────────────────
// side: which way the face looks in the scene. label matches the old page's wording.
export const WALLS = {
  'A-EXT': { section: 'A', face: 'EXT', label: "OUTSIDE - WALL A", niches: [
    { l: 'E', s: 1, p: 13195, st: 'reserved' }, { l: 'E', s: 2, p: 13195, st: 'available' }, { l: 'E', s: 3, p: 13195, st: 'available' }, { l: 'E', s: 4, p: 13195, st: 'available' }, { l: 'E', s: 5, p: 13195, st: 'buried' },
    { l: 'D', s: 1, p: 12095, st: 'available' }, { l: 'D', s: 2, p: 12095, st: 'available' }, { l: 'D', s: 3, p: 12095, st: 'available' }, { l: 'D', s: 4, p: 12095, st: 'available' }, { l: 'D', s: 5, p: 12095, st: 'available' },
    { l: 'C', s: 1, p: 10995, st: 'available' }, { l: 'C', s: 2, p: 10995, st: 'available' }, { l: 'C', s: 3, p: 10995, st: 'buried' }, { l: 'C', s: 4, p: 10995, st: 'available' }, { l: 'C', s: 5, p: 10995, st: 'available' },
    { l: 'B', s: 1, p: 9895, st: 'available' }, { l: 'B', s: 2, p: 9895, st: 'available' }, { l: 'B', s: 3, p: 9895, st: 'available' }, { l: 'B', s: 4, p: 9895, st: 'available' }, { l: 'B', s: 5, p: 9895, st: 'available' },
    { l: 'A', s: 1, p: 8795, st: 'available' }, { l: 'A', s: 2, p: 8795, st: 'available' }, { l: 'A', s: 3, p: 8795, st: 'available' }, { l: 'A', s: 4, p: 8795, st: 'available' }, { l: 'A', s: 5, p: 8795, st: 'available' },
  ] },
  'A-INT': { section: 'A', face: 'INT', label: "INSIDE - WALL A", niches: [
    { l: 'E', s: 1, p: 16495, st: 'available' }, { l: 'E', s: 2, p: 16495, st: 'available' }, { l: 'E', s: 3, p: 16495, st: 'available' }, { l: 'E', s: 4, p: 16495, st: 'available' }, { l: 'E', s: 5, p: 16495, st: 'hold' },
    { l: 'D', s: 1, p: 15395, st: 'available' }, { l: 'D', s: 2, p: 15395, st: 'available' }, { l: 'D', s: 3, p: 15395, st: 'available' }, { l: 'D', s: 4, p: 15395, st: 'available' }, { l: 'D', s: 5, p: 15395, st: 'available' },
    { l: 'C', s: 1, p: 14295, st: 'available' }, { l: 'C', s: 2, p: 14295, st: 'available' }, { l: 'C', s: 3, p: 14295, st: 'available' }, { l: 'C', s: 4, p: 14295, st: 'available' }, { l: 'C', s: 5, p: 14295, st: 'available' },
    { l: 'B', s: 1, p: 13195, st: 'available' }, { l: 'B', s: 2, p: 13195, st: 'available' }, { l: 'B', s: 3, p: 13195, st: 'available' }, { l: 'B', s: 4, p: 13195, st: 'available' }, { l: 'B', s: 5, p: 13195, st: 'available' },
    { l: 'A', s: 1, p: 12095, st: 'available' }, { l: 'A', s: 2, p: 12095, st: 'available' }, { l: 'A', s: 3, p: 12095, st: 'available' }, { l: 'A', s: 4, p: 12095, st: 'available' }, { l: 'A', s: 5, p: 12095, st: 'available' },
  ] },
  'B-EXT': { section: 'B', face: 'EXT', label: "OUTSIDE - WALL B", niches: [
    { l: 'E', s: 1, p: 13195, st: 'available' }, { l: 'E', s: 2, p: 13195, st: 'available' }, { l: 'E', s: 3, p: 13195, st: 'reserved' }, { l: 'E', s: 4, p: 13195, st: 'available' }, { l: 'E', s: 5, p: 13195, st: 'available' },
    { l: 'D', s: 1, p: 12095, st: 'available' }, { l: 'D', s: 2, p: 12095, st: 'available' }, { l: 'D', s: 3, p: 12095, st: 'available' }, { l: 'D', s: 4, p: 12095, st: 'available' }, { l: 'D', s: 5, p: 12095, st: 'available' },
    { l: 'C', s: 1, p: 10995, st: 'available' }, { l: 'C', s: 2, p: 10995, st: 'available' }, { l: 'C', s: 3, p: 10995, st: 'available' }, { l: 'C', s: 4, p: 10995, st: 'available' }, { l: 'C', s: 5, p: 10995, st: 'available' },
    { l: 'B', s: 1, p: 9895, st: 'available' }, { l: 'B', s: 2, p: 9895, st: 'available' }, { l: 'B', s: 3, p: 9895, st: 'available' }, { l: 'B', s: 4, p: 9895, st: 'available' }, { l: 'B', s: 5, p: 9895, st: 'available' },
    { l: 'A', s: 1, p: 8795, st: 'buried' }, { l: 'A', s: 2, p: 8795, st: 'reserved' }, { l: 'A', s: 3, p: 8795, st: 'available' }, { l: 'A', s: 4, p: 8795, st: 'available' }, { l: 'A', s: 5, p: 8795, st: 'available' },
  ] },
  'B-INT': { section: 'B', face: 'INT', label: "INSIDE - WALL B", niches: [
    { l: 'E', s: 1, p: 17595, st: 'available' }, { l: 'E', s: 2, p: 17595, st: 'available' }, { l: 'E', s: 3, p: 17595, st: 'available' }, { l: 'E', s: 4, p: 17595, st: 'available' }, { l: 'E', s: 5, p: 17595, st: 'available' },
    { l: 'D', s: 1, p: 16495, st: 'available' }, { l: 'D', s: 2, p: 16495, st: 'available' }, { l: 'D', s: 3, p: 16495, st: 'available' }, { l: 'D', s: 4, p: 16495, st: 'available' }, { l: 'D', s: 5, p: 16495, st: 'available' },
    { l: 'C', s: 1, p: 15395, st: 'available' }, { l: 'C', s: 2, p: 15395, st: 'available' }, { l: 'C', s: 3, p: 15395, st: 'available' }, { l: 'C', s: 4, p: 15395, st: 'available' }, { l: 'C', s: 5, p: 15395, st: 'available' },
    { l: 'B', s: 1, p: 14295, st: 'available' }, { l: 'B', s: 2, p: 14295, st: 'available' }, { l: 'B', s: 3, p: 14295, st: 'available' }, { l: 'B', s: 4, p: 14295, st: 'available' }, { l: 'B', s: 5, p: 14295, st: 'available' },
    { l: 'A', s: 1, p: 13195, st: 'available' }, { l: 'A', s: 2, p: 13195, st: 'available' }, { l: 'A', s: 3, p: 13195, st: 'available' }, { l: 'A', s: 4, p: 13195, st: 'available' }, { l: 'A', s: 5, p: 13195, st: 'available' },
  ] },
  'C-EXT': { section: 'C', face: 'EXT', label: "OUTSIDE - WALL C", niches: [
    { l: 'E', s: 1, p: 13195, st: 'available' }, { l: 'E', s: 2, p: 13195, st: 'available' }, { l: 'E', s: 3, p: 13195, st: 'available' }, { l: 'E', s: 4, p: 13195, st: 'available' }, { l: 'E', s: 5, p: 13195, st: 'available' },
    { l: 'D', s: 1, p: 12095, st: 'available' }, { l: 'D', s: 2, p: 12095, st: 'available' }, { l: 'D', s: 3, p: 12095, st: 'available' }, { l: 'D', s: 4, p: 12095, st: 'available' }, { l: 'D', s: 5, p: 12095, st: 'available' },
    { l: 'C', s: 1, p: 10995, st: 'reserved' }, { l: 'C', s: 2, p: 10995, st: 'available' }, { l: 'C', s: 3, p: 10995, st: 'available' }, { l: 'C', s: 4, p: 10995, st: 'available' }, { l: 'C', s: 5, p: 10995, st: 'available' },
    { l: 'B', s: 1, p: 9895, st: 'reserved' }, { l: 'B', s: 2, p: 9895, st: 'available' }, { l: 'B', s: 3, p: 9895, st: 'available' }, { l: 'B', s: 4, p: 9895, st: 'available' }, { l: 'B', s: 5, p: 9895, st: 'available' },
    { l: 'A', s: 1, p: 8795, st: 'reserved' }, { l: 'A', s: 2, p: 8795, st: 'available' }, { l: 'A', s: 3, p: 8795, st: 'available' }, { l: 'A', s: 4, p: 8795, st: 'reserved' }, { l: 'A', s: 5, p: 8795, st: 'buried' },
  ] },
  'C-INT': { section: 'C', face: 'INT', label: "INSIDE - WALL C", niches: [
    { l: 'E', s: 1, p: 13195, st: 'buried' }, { l: 'E', s: 2, p: 13195, st: 'available' }, { l: 'E', s: 3, p: 13195, st: 'available' }, { l: 'E', s: 4, p: 13195, st: 'available' }, { l: 'E', s: 5, p: 13195, st: 'available' },
    { l: 'D', s: 1, p: 12095, st: 'available' }, { l: 'D', s: 2, p: 12095, st: 'available' }, { l: 'D', s: 3, p: 12095, st: 'available' }, { l: 'D', s: 4, p: 12095, st: 'available' }, { l: 'D', s: 5, p: 12095, st: 'available' },
    { l: 'C', s: 1, p: 10995, st: 'reserved' }, { l: 'C', s: 2, p: 10995, st: 'buried' }, { l: 'C', s: 3, p: 10995, st: 'available' }, { l: 'C', s: 4, p: 10995, st: 'available' }, { l: 'C', s: 5, p: 10995, st: 'reserved' },
    { l: 'B', s: 1, p: 9895, st: 'buried' }, { l: 'B', s: 2, p: 9895, st: 'available' }, { l: 'B', s: 3, p: 9895, st: 'available' }, { l: 'B', s: 4, p: 9895, st: 'available' }, { l: 'B', s: 5, p: 9895, st: 'available' },
    { l: 'A', s: 1, p: 8795, st: 'reserved' }, { l: 'A', s: 2, p: 8795, st: 'available' }, { l: 'A', s: 3, p: 8795, st: 'available' }, { l: 'A', s: 4, p: 8795, st: 'available' }, { l: 'A', s: 5, p: 8795, st: 'available' },
  ] },
  'D-EXT': { section: 'D', face: 'EXT', label: "OUTSIDE - WALL D", niches: [
    { l: 'E', s: 1, p: 13195, st: 'available' }, { l: 'E', s: 2, p: 13195, st: 'available' }, { l: 'E', s: 3, p: 13195, st: 'reserved' }, { l: 'E', s: 4, p: 13195, st: 'available' }, { l: 'E', s: 5, p: 13195, st: 'reserved' },
    { l: 'D', s: 1, p: 12095, st: 'available' }, { l: 'D', s: 2, p: 12095, st: 'available' }, { l: 'D', s: 3, p: 12095, st: 'reserved' }, { l: 'D', s: 4, p: 12095, st: 'available' }, { l: 'D', s: 5, p: 12095, st: 'reserved' },
    { l: 'C', s: 1, p: 10995, st: 'buried' }, { l: 'C', s: 2, p: 10995, st: 'reserved' }, { l: 'C', s: 3, p: 10995, st: 'reserved' }, { l: 'C', s: 4, p: 10995, st: 'buried' }, { l: 'C', s: 5, p: 10995, st: 'buried' },
    { l: 'B', s: 1, p: 9895, st: 'available' }, { l: 'B', s: 2, p: 9895, st: 'available' }, { l: 'B', s: 3, p: 9895, st: 'available' }, { l: 'B', s: 4, p: 9895, st: 'available' }, { l: 'B', s: 5, p: 9895, st: 'buried' },
    { l: 'A', s: 1, p: 8795, st: 'reserved' }, { l: 'A', s: 2, p: 8795, st: 'available' }, { l: 'A', s: 3, p: 8795, st: 'reserved' }, { l: 'A', s: 4, p: 8795, st: 'reserved' }, { l: 'A', s: 5, p: 8795, st: 'available' },
  ] },
  'D-INT': { section: 'D', face: 'INT', label: "INSIDE - WALL D", niches: [
    { l: 'E', s: 1, p: 17595, st: 'available' }, { l: 'E', s: 2, p: 17595, st: 'available' }, { l: 'E', s: 3, p: 17595, st: 'hold' }, { l: 'E', s: 4, p: 17595, st: 'available' }, { l: 'E', s: 5, p: 17595, st: 'available' },
    { l: 'D', s: 1, p: 16495, st: 'available' }, { l: 'D', s: 2, p: 16495, st: 'buried' }, { l: 'D', s: 3, p: 16495, st: 'buried' }, { l: 'D', s: 4, p: 16495, st: 'available' }, { l: 'D', s: 5, p: 16495, st: 'available' },
    { l: 'C', s: 1, p: 15395, st: 'available' }, { l: 'C', s: 2, p: 15395, st: 'available' }, { l: 'C', s: 3, p: 15395, st: 'reserved' }, { l: 'C', s: 4, p: 15395, st: 'available' }, { l: 'C', s: 5, p: 15395, st: 'available' },
    { l: 'B', s: 1, p: 14295, st: 'available' }, { l: 'B', s: 2, p: 14295, st: 'available' }, { l: 'B', s: 3, p: 14295, st: 'available' }, { l: 'B', s: 4, p: 14295, st: 'available' }, { l: 'B', s: 5, p: 14295, st: 'available' },
    { l: 'A', s: 1, p: 13195, st: 'available' }, { l: 'A', s: 2, p: 13195, st: 'available' }, { l: 'A', s: 3, p: 13195, st: 'available' }, { l: 'A', s: 4, p: 13195, st: 'available' }, { l: 'A', s: 5, p: 13195, st: 'available' },
  ] },
  'E-EXT': { section: 'E', face: 'EXT', label: "OUTSIDE - WALL E", niches: [
    { l: 'E', s: 1, p: 13195, st: 'available' }, { l: 'E', s: 2, p: 13195, st: 'available' }, { l: 'E', s: 3, p: 13195, st: 'available' }, { l: 'E', s: 4, p: 13195, st: 'available' }, { l: 'E', s: 5, p: 13195, st: 'available' },
    { l: 'D', s: 1, p: 12095, st: 'available' }, { l: 'D', s: 2, p: 12095, st: 'available' }, { l: 'D', s: 3, p: 12095, st: 'available' }, { l: 'D', s: 4, p: 12095, st: 'available' }, { l: 'D', s: 5, p: 12095, st: 'available' },
    { l: 'C', s: 1, p: 10995, st: 'available' }, { l: 'C', s: 2, p: 10995, st: 'available' }, { l: 'C', s: 3, p: 10995, st: 'available' }, { l: 'C', s: 4, p: 10995, st: 'available' }, { l: 'C', s: 5, p: 10995, st: 'available' },
    { l: 'B', s: 1, p: 9895, st: 'available' }, { l: 'B', s: 2, p: 9895, st: 'available' }, { l: 'B', s: 3, p: 9895, st: 'available' }, { l: 'B', s: 4, p: 9895, st: 'available' }, { l: 'B', s: 5, p: 9895, st: 'available' },
    { l: 'A', s: 1, p: 8795, st: 'available' }, { l: 'A', s: 2, p: 8795, st: 'available' }, { l: 'A', s: 3, p: 8795, st: 'available' }, { l: 'A', s: 4, p: 8795, st: 'available' }, { l: 'A', s: 5, p: 8795, st: 'available' },
  ] },
  'E-INT': { section: 'E', face: 'INT', label: "INSIDE - WALL E", niches: [
    { l: 'E', s: 1, p: 13195, st: 'available' }, { l: 'E', s: 2, p: 13195, st: 'available' }, { l: 'E', s: 3, p: 13195, st: 'available' }, { l: 'E', s: 4, p: 13195, st: 'available' }, { l: 'E', s: 5, p: 13195, st: 'available' },
    { l: 'D', s: 1, p: 12095, st: 'available' }, { l: 'D', s: 2, p: 12095, st: 'available' }, { l: 'D', s: 3, p: 12095, st: 'available' }, { l: 'D', s: 4, p: 12095, st: 'available' }, { l: 'D', s: 5, p: 12095, st: 'available' },
    { l: 'C', s: 1, p: 10995, st: 'available' }, { l: 'C', s: 2, p: 10995, st: 'available' }, { l: 'C', s: 3, p: 10995, st: 'buried' }, { l: 'C', s: 4, p: 10995, st: 'available' }, { l: 'C', s: 5, p: 10995, st: 'buried' },
    { l: 'B', s: 1, p: 9895, st: 'available' }, { l: 'B', s: 2, p: 9895, st: 'available' }, { l: 'B', s: 3, p: 9895, st: 'available' }, { l: 'B', s: 4, p: 9895, st: 'available' }, { l: 'B', s: 5, p: 9895, st: 'reserved' },
    { l: 'A', s: 1, p: 8795, st: 'available' }, { l: 'A', s: 2, p: 8795, st: 'available' }, { l: 'A', s: 3, p: 8795, st: 'available' }, { l: 'A', s: 4, p: 8795, st: 'available' }, { l: 'A', s: 5, p: 8795, st: 'reserved' },
  ] },
  'F-EXT': { section: 'F', face: 'EXT', label: "OUTSIDE - WALL F", niches: [
    { l: 'E', s: 1, p: 13195, st: 'available' }, { l: 'E', s: 2, p: 13195, st: 'available' }, { l: 'E', s: 3, p: 13195, st: 'reserved' }, { l: 'E', s: 4, p: 13195, st: 'available' }, { l: 'E', s: 5, p: 13195, st: 'available' },
    { l: 'D', s: 1, p: 12095, st: 'available' }, { l: 'D', s: 2, p: 12095, st: 'available' }, { l: 'D', s: 3, p: 12095, st: 'available' }, { l: 'D', s: 4, p: 12095, st: 'available' }, { l: 'D', s: 5, p: 12095, st: 'available' },
    { l: 'C', s: 1, p: 10995, st: 'available' }, { l: 'C', s: 2, p: 10995, st: 'available' }, { l: 'C', s: 3, p: 10995, st: 'available' }, { l: 'C', s: 4, p: 10995, st: 'available' }, { l: 'C', s: 5, p: 10995, st: 'available' },
    { l: 'B', s: 1, p: 9895, st: 'available' }, { l: 'B', s: 2, p: 9895, st: 'available' }, { l: 'B', s: 3, p: 9895, st: 'available' }, { l: 'B', s: 4, p: 9895, st: 'available' }, { l: 'B', s: 5, p: 9895, st: 'available' },
    { l: 'A', s: 1, p: 8795, st: 'available' }, { l: 'A', s: 2, p: 8795, st: 'available' }, { l: 'A', s: 3, p: 8795, st: 'available' }, { l: 'A', s: 4, p: 8795, st: 'available' }, { l: 'A', s: 5, p: 8795, st: 'available' },
  ] },
  'F-INT': { section: 'F', face: 'INT', label: "INSIDE - WALL F", niches: [
    { l: 'E', s: 1, p: 17595, st: 'available' }, { l: 'E', s: 2, p: 17595, st: 'available' }, { l: 'E', s: 3, p: 17595, st: 'available' }, { l: 'E', s: 4, p: 17595, st: 'available' }, { l: 'E', s: 5, p: 17595, st: 'available' },
    { l: 'D', s: 1, p: 16495, st: 'available' }, { l: 'D', s: 2, p: 16495, st: 'available' }, { l: 'D', s: 3, p: 16495, st: 'buried' }, { l: 'D', s: 4, p: 16495, st: 'available' }, { l: 'D', s: 5, p: 16495, st: 'available' },
    { l: 'C', s: 1, p: 15395, st: 'available' }, { l: 'C', s: 2, p: 15395, st: 'available' }, { l: 'C', s: 3, p: 15395, st: 'available' }, { l: 'C', s: 4, p: 15395, st: 'available' }, { l: 'C', s: 5, p: 15395, st: 'available' },
    { l: 'B', s: 1, p: 14295, st: 'available' }, { l: 'B', s: 2, p: 14295, st: 'available' }, { l: 'B', s: 3, p: 14295, st: 'available' }, { l: 'B', s: 4, p: 14295, st: 'available' }, { l: 'B', s: 5, p: 14295, st: 'available' },
    { l: 'A', s: 1, p: 13195, st: 'available' }, { l: 'A', s: 2, p: 13195, st: 'available' }, { l: 'A', s: 3, p: 13195, st: 'available' }, { l: 'A', s: 4, p: 13195, st: 'available' }, { l: 'A', s: 5, p: 13195, st: 'available' },
  ] },
  'G-EXT': { section: 'G', face: 'EXT', label: "OUTSIDE - WALL G", niches: [
    { l: 'E', s: 1, p: 11995, st: 'available' }, { l: 'E', s: 2, p: 11995, st: 'available' }, { l: 'E', s: 3, p: 11995, st: 'available' }, { l: 'E', s: 4, p: 11995, st: 'available' }, { l: 'E', s: 5, p: 11995, st: 'available' },
    { l: 'D', s: 1, p: 10995, st: 'available' }, { l: 'D', s: 2, p: 10995, st: 'available' }, { l: 'D', s: 3, p: 10995, st: 'available' }, { l: 'D', s: 4, p: 10995, st: 'available' }, { l: 'D', s: 5, p: 10995, st: 'available' },
    { l: 'C', s: 1, p: 9995, st: 'available' }, { l: 'C', s: 2, p: 9995, st: 'available' }, { l: 'C', s: 3, p: 9995, st: 'available' }, { l: 'C', s: 4, p: 9995, st: 'available' }, { l: 'C', s: 5, p: 9995, st: 'available' },
    { l: 'B', s: 1, p: 8995, st: 'available' }, { l: 'B', s: 2, p: 8995, st: 'available' }, { l: 'B', s: 3, p: 8995, st: 'reserved' }, { l: 'B', s: 4, p: 8995, st: 'available' }, { l: 'B', s: 5, p: 8995, st: 'available' },
    { l: 'A', s: 1, p: 7995, st: 'available' }, { l: 'A', s: 2, p: 7995, st: 'available' }, { l: 'A', s: 3, p: 7995, st: 'available' }, { l: 'A', s: 4, p: 7995, st: 'reserved' }, { l: 'A', s: 5, p: 7995, st: 'reserved' },
  ] },
  'G-INT': { section: 'G', face: 'INT', label: "INSIDE - WALL G", niches: [
    { l: 'E', s: 1, p: 16495, st: 'available' }, { l: 'E', s: 2, p: 16495, st: 'available' }, { l: 'E', s: 3, p: 16495, st: 'available' }, { l: 'E', s: 4, p: 16495, st: 'available' }, { l: 'E', s: 5, p: 16495, st: 'available' },
    { l: 'D', s: 1, p: 15395, st: 'available' }, { l: 'D', s: 2, p: 15395, st: 'available' }, { l: 'D', s: 3, p: 15395, st: 'available' }, { l: 'D', s: 4, p: 15395, st: 'available' }, { l: 'D', s: 5, p: 15395, st: 'available' },
    { l: 'C', s: 1, p: 14295, st: 'available' }, { l: 'C', s: 2, p: 14295, st: 'available' }, { l: 'C', s: 3, p: 14295, st: 'available' }, { l: 'C', s: 4, p: 14295, st: 'available' }, { l: 'C', s: 5, p: 14295, st: 'available' },
    { l: 'B', s: 1, p: 13195, st: 'available' }, { l: 'B', s: 2, p: 13195, st: 'available' }, { l: 'B', s: 3, p: 13195, st: 'buried' }, { l: 'B', s: 4, p: 13195, st: 'reserved' }, { l: 'B', s: 5, p: 13195, st: 'available' },
    { l: 'A', s: 1, p: 12095, st: 'available' }, { l: 'A', s: 2, p: 12095, st: 'available' }, { l: 'A', s: 3, p: 12095, st: 'available' }, { l: 'A', s: 4, p: 12095, st: 'available' }, { l: 'A', s: 5, p: 12095, st: 'available' },
  ] },
};

/** Every niche, flattened. id is "Tier-Space", e.g. "C-4". */
export function allNiches() {
  const out2 = [];
  for (const k of FACE_ORDER) {
    for (const n of WALLS[k].niches) out2.push({ wall: k, id: n.l + '-' + n.s, ...n });
  }
  return out2;
}
