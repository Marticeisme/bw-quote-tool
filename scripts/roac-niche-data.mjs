/**
 * Rock of Ages Columbarium (ROAC) — the single source of truth for the niche dataset.
 *
 * Spaces and tiers are carried over VERBATIM from the pre-3D MAPS/ROAC_NicheMap.html
 * (extracted by script, not retyped). PRICES AND STATUSES ARE NOW MIS-BACKED — see the
 * next block. They remain LIVE HAND-MAINTAINED DATA: when a niche sells, edit THIS file
 * and rebuild; never hand-edit the HTML.
 *
 * ── PRICES AND STATUSES FROM MIS, 2026-08-01 ──────────────────────────────────────
 * Two operator-supplied exports, both dated 2026-08-01:
 *
 *   the LOT INQUIRY LIST for Bldg-ROAC — one row per right of interment, 706 rows over
 *   350 niches plus 4 bench rows. Grammar "Wall-A-EXT Lvl-A Sp-1 (A)"; the (A)/(B)
 *   suffix is the niche's two rights, so a niche is two rows. State per niche is the
 *   worse of its two rows: 12 niches read A=Occupied / B=Reserved, which is exactly what
 *   one interment against two rights looks like, and those count as occupied.
 *
 *   the AVAILABLE-PRICE EXPORT — 610 rows, again two per niche, covering the 305 niches
 *   MIS offers, WITH prices. Both rows of every pair are stamped identically (price,
 *   E.C.F. and sell-unit status) — checked on all 305, zero exceptions — and the E.C.F.
 *   is 10% of the price on every row, matching FEES.ECF_RATE. No name-like column exists
 *   in this export at all.
 *
 * WHAT THE HAND-MAINTAINED DATA GOT RIGHT. The statuses carried by hand since sprint-06
 * were 349 of 350 correct: 17 occupied, 27 reserved and 2 on hold, every one of them the
 * same niche MIS names, and the 2 on hold are precisely the 2 the price export flags
 * sell-unit-status H. ONE niche moved — G-EXT A-1, carried as available, which MIS calls
 * NOT FOR SALE. It is now unsellable and carries no price. Availability therefore falls
 * 304 → 303.
 *
 * WHAT MOVED IS PRICE. 118 of the 305 offered niches are repriced, all of them on the
 * PREMIUM INTERIOR faces and all of them DOWNWARD:
 *   A-INT, G-INT   12,095 / 13,195 / 14,295 / 15,395 / 16,495  ->  10,995 / 11,995 / 12,995 / 13,995 / 14,995
 *   B-INT, D-INT, F-INT  13,195 / 14,295 / 15,395 / 16,495 / 17,595  ->  11,995 / 12,995 / 13,995 / 14,995 / 15,995
 * Every exterior face and the two plain interiors (C-INT, E-INT) are unchanged to the
 * dollar. Available inventory at list: $3,626,785 over 303 niches.
 *
 * D-INT D-5: the export carried $16,495 while D-1/D-4 — same face, same level — came
 * across at $14,995. OPERATOR RULED 2026-08-01: "$14,995" — the export missed the
 * reprice; the ladder value ships. Every
 * other face/level in the export is uniform. MIS is the price authority here so $16,495
 * is what ships, and it is the only niche on the wall carrying that figure. It looks
 * like a row the reprice missed; Martice should confirm it.
 *
 * ── A SOLD NICHE NO LONGER CARRIES A PRICE ────────────────────────────────────────
 * The pre-3D page stored a price for every niche including the sold ones, and this file
 * inherited that. Those figures are now demonstrably stale — the interior schedule moved
 * under them by $1,100–$1,600 — and nothing renders them. So `p` is a number exactly for
 * the 305 niches MIS prices (303 available + the 2 on hold, which do render one) and
 * `null` for the 45 that are occupied, reserved or not for sale. This matches ECL's
 * convention. Nothing on the page may invent a price for an unsellable niche.
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

export const STATUS_LABEL = {
  reserved: 'Reserved', buried: 'Occupied', hold: 'On Hold', notforsale: 'Not For Sale',
};
/** Statuses that must never render a price, anywhere, in any view. */
export const UNSELLABLE = ['reserved', 'buried', 'notforsale'];
/** A niche may show a price only when it is available or on hold AND carries one. */
export const sellable = (n) => !UNSELLABLE.includes(n.st) && typeof n.p === 'number';

/** Rights of interment per niche — the page has said "up to 2 inurnments" since sprint-06. */
export const RIGHTS = 2;

/**
 * THE TWO MEMORIAL BENCHES in the courtyard.
 *
 * OPERATOR RULING, 2026-08-01, verbatim: "the benches are sold and they are 4 rights per
 * bench." Both facts were already on the page as generator literals ("Both memorial
 * benches have been sold", "Up to 4 inurnments"); they move here so they are DATA the
 * gate can hold the page to, and so the ruling has somewhere to live.
 *
 * The 2026-08-01 lot inquiry corroborates: it carries four bench rows, "Bench-1 (A)/(B)"
 * and "Bench-2 (A)/(B)", every one of them RESERVED — sold, no interment yet. Note the
 * inquiry exposes only TWO positions per bench where the ruling says four rights.
 * OPERATOR CONFIRMED 2026-08-01: "it's two benches but each bench can hold 4 urns
 * inside of it" — 4 rights per bench stands; the export's (A)/(B) is
 * almost certainly modelling depth rather than capacity. The RULING is authoritative on
 * capacity and the inquiry on state; they do not actually disagree, and neither reading
 * makes a bench sellable. Flagged for the operator all the same.
 *
 * A bench is SOLD. It is never inventory, never carries a price in any rendering, and
 * the benches view is a static panel — no card, no hover affordance — so the panel's own
 * text is where these facts are stated.
 */
export const BENCHES = {
  count: 2,
  rights: 4,
  status: 'sold',
  label: 'Sold',
  /** What the inquiry returned for every bench position. Unsellable either way. */
  misStatus: 'Reserved',
  ruling: 'operator, 2026-08-01',
};

// ── Fees (carried from the old page's estimate math) ───────────────────────
export const FEES = { OC: 875, REC: 235, INSCR: 660, VASE: 275, TAX: 0.104, ECF_RATE: 0.1 };

// ── Price tiers (14 distinct sellable prices; chip colour classes) ─────────
// REBUILT 2026-08-01 from the MIS available-price export. The interior schedule moved
// (see the header), so $14,295 / $15,395 / $17,595 are gone from the wall and $12,995 /
// $13,995 / $14,995 / $15,995 arrived.
//
// The ramp is a PRICE ORDERING — blue at the bottom, magenta at the top — so it is kept
// monotone rather than keeping class names pinned to hues. Every price that survived at
// its old rank keeps its old colour, so no cell whose price did not change changes
// appearance. The three retired hues are re-used at the same RANK positions they held
// ($13,995 takes the old r9 red-orange, $14,995 the old r10 red, $15,995 the old r11
// purple), one new hue r7b fills the gap $12,995 opened between amber and orange, and
// $16,495 moves up to the magenta that used to cap the ramp. Exactly one niche carries
// $16,495, so exactly one cell changes colour without its price changing.
//
// Every pair below clears WCAG AA (4.5:1) against its own foreground; the two new
// combinations measure r7b 6.42:1 and the magenta-on-white cap 5.27:1.
export const TIERS = [
  { p: 7995, l: '$7,995', c: 'r0', bg: '#1a6fae', fg: '#fff' },
  { p: 8795, l: '$8,795', c: 'r1', bg: '#0f8f96', fg: '#0e1729' },
  // #1f8f5e measured 4.39:1 against this foreground — under AA, and it had been on the
  // page since the pre-3D map. Lightened to #229864 (4.90:1) when the contrast assertion
  // was added, 2026-08-01. Same green, one step up.
  { p: 8995, l: '$8,995', c: 'r2', bg: '#229864', fg: '#0e1729' },
  { p: 9895, l: '$9,895', c: 'r3', bg: '#237a3a', fg: '#fff' },
  { p: 9995, l: '$9,995', c: 'r4', bg: '#5c9022', fg: '#0e1729' },
  { p: 10995, l: '$10,995', c: 'r5', bg: '#7d9a18', fg: '#0e1729' },
  { p: 11995, l: '$11,995', c: 'r6', bg: '#a89f14', fg: '#0e1729' },
  { p: 12095, l: '$12,095', c: 'r7', bg: '#c39a10', fg: '#0e1729' },
  { p: 12995, l: '$12,995', c: 'r7b', bg: '#d78a11', fg: '#0e1729' },
  { p: 13195, l: '$13,195', c: 'r8', bg: '#e07b12', fg: '#0e1729' },
  { p: 13995, l: '$13,995', c: 'r9', bg: '#cf4a1c', fg: '#fff' },
  { p: 14995, l: '$14,995', c: 'r10', bg: '#c2332b', fg: '#fff' },
  { p: 15995, l: '$15,995', c: 'r11', bg: '#8b4fbb', fg: '#fff' },
  // r12 $16,495 retired 2026-08-01: D-INT D-5 (its last holder) ruled down to $14,995.
];

// ── Walls: 14 faces x 25 niches, VERBATIM from the old page ────────────────
// side: which way the face looks in the scene. label matches the old page's wording.
export const WALLS = {
  'A-EXT': { section: 'A', face: 'EXT', label: "OUTSIDE - WALL A", niches: [
    { l: 'E', s: 1, p: null, st: 'reserved' }, { l: 'E', s: 2, p: 13195, st: 'available' }, { l: 'E', s: 3, p: 13195, st: 'available' }, { l: 'E', s: 4, p: 13195, st: 'available' }, { l: 'E', s: 5, p: null, st: 'buried' },
    { l: 'D', s: 1, p: 12095, st: 'available' }, { l: 'D', s: 2, p: 12095, st: 'available' }, { l: 'D', s: 3, p: 12095, st: 'available' }, { l: 'D', s: 4, p: 12095, st: 'available' }, { l: 'D', s: 5, p: 12095, st: 'available' },
    { l: 'C', s: 1, p: 10995, st: 'available' }, { l: 'C', s: 2, p: 10995, st: 'available' }, { l: 'C', s: 3, p: null, st: 'buried' }, { l: 'C', s: 4, p: 10995, st: 'available' }, { l: 'C', s: 5, p: 10995, st: 'available' },
    { l: 'B', s: 1, p: 9895, st: 'available' }, { l: 'B', s: 2, p: 9895, st: 'available' }, { l: 'B', s: 3, p: 9895, st: 'available' }, { l: 'B', s: 4, p: 9895, st: 'available' }, { l: 'B', s: 5, p: 9895, st: 'available' },
    { l: 'A', s: 1, p: 8795, st: 'available' }, { l: 'A', s: 2, p: 8795, st: 'available' }, { l: 'A', s: 3, p: 8795, st: 'available' }, { l: 'A', s: 4, p: 8795, st: 'available' }, { l: 'A', s: 5, p: 8795, st: 'available' },
  ] },
  'A-INT': { section: 'A', face: 'INT', label: "INSIDE - WALL A", niches: [
    { l: 'E', s: 1, p: 14995, st: 'available' }, { l: 'E', s: 2, p: 14995, st: 'available' }, { l: 'E', s: 3, p: 14995, st: 'available' }, { l: 'E', s: 4, p: 14995, st: 'available' }, { l: 'E', s: 5, p: 14995, st: 'hold' },
    { l: 'D', s: 1, p: 13995, st: 'available' }, { l: 'D', s: 2, p: 13995, st: 'available' }, { l: 'D', s: 3, p: 13995, st: 'available' }, { l: 'D', s: 4, p: 13995, st: 'available' }, { l: 'D', s: 5, p: 13995, st: 'available' },
    { l: 'C', s: 1, p: 12995, st: 'available' }, { l: 'C', s: 2, p: 12995, st: 'available' }, { l: 'C', s: 3, p: 12995, st: 'available' }, { l: 'C', s: 4, p: 12995, st: 'available' }, { l: 'C', s: 5, p: 12995, st: 'available' },
    { l: 'B', s: 1, p: 11995, st: 'available' }, { l: 'B', s: 2, p: 11995, st: 'available' }, { l: 'B', s: 3, p: 11995, st: 'available' }, { l: 'B', s: 4, p: 11995, st: 'available' }, { l: 'B', s: 5, p: 11995, st: 'available' },
    { l: 'A', s: 1, p: 10995, st: 'available' }, { l: 'A', s: 2, p: 10995, st: 'available' }, { l: 'A', s: 3, p: 10995, st: 'available' }, { l: 'A', s: 4, p: 10995, st: 'available' }, { l: 'A', s: 5, p: 10995, st: 'available' },
  ] },
  'B-EXT': { section: 'B', face: 'EXT', label: "OUTSIDE - WALL B", niches: [
    { l: 'E', s: 1, p: 13195, st: 'available' }, { l: 'E', s: 2, p: 13195, st: 'available' }, { l: 'E', s: 3, p: null, st: 'reserved' }, { l: 'E', s: 4, p: 13195, st: 'available' }, { l: 'E', s: 5, p: 13195, st: 'available' },
    { l: 'D', s: 1, p: 12095, st: 'available' }, { l: 'D', s: 2, p: 12095, st: 'available' }, { l: 'D', s: 3, p: 12095, st: 'available' }, { l: 'D', s: 4, p: 12095, st: 'available' }, { l: 'D', s: 5, p: 12095, st: 'available' },
    { l: 'C', s: 1, p: 10995, st: 'available' }, { l: 'C', s: 2, p: 10995, st: 'available' }, { l: 'C', s: 3, p: 10995, st: 'available' }, { l: 'C', s: 4, p: 10995, st: 'available' }, { l: 'C', s: 5, p: 10995, st: 'available' },
    { l: 'B', s: 1, p: 9895, st: 'available' }, { l: 'B', s: 2, p: 9895, st: 'available' }, { l: 'B', s: 3, p: 9895, st: 'available' }, { l: 'B', s: 4, p: 9895, st: 'available' }, { l: 'B', s: 5, p: 9895, st: 'available' },
    { l: 'A', s: 1, p: null, st: 'buried' }, { l: 'A', s: 2, p: null, st: 'reserved' }, { l: 'A', s: 3, p: 8795, st: 'available' }, { l: 'A', s: 4, p: 8795, st: 'available' }, { l: 'A', s: 5, p: 8795, st: 'available' },
  ] },
  'B-INT': { section: 'B', face: 'INT', label: "INSIDE - WALL B", niches: [
    { l: 'E', s: 1, p: 15995, st: 'available' }, { l: 'E', s: 2, p: 15995, st: 'available' }, { l: 'E', s: 3, p: 15995, st: 'available' }, { l: 'E', s: 4, p: 15995, st: 'available' }, { l: 'E', s: 5, p: 15995, st: 'available' },
    { l: 'D', s: 1, p: 14995, st: 'available' }, { l: 'D', s: 2, p: 14995, st: 'available' }, { l: 'D', s: 3, p: 14995, st: 'available' }, { l: 'D', s: 4, p: 14995, st: 'available' }, { l: 'D', s: 5, p: 14995, st: 'available' },
    { l: 'C', s: 1, p: 13995, st: 'available' }, { l: 'C', s: 2, p: 13995, st: 'available' }, { l: 'C', s: 3, p: 13995, st: 'available' }, { l: 'C', s: 4, p: 13995, st: 'available' }, { l: 'C', s: 5, p: 13995, st: 'available' },
    { l: 'B', s: 1, p: 12995, st: 'available' }, { l: 'B', s: 2, p: 12995, st: 'available' }, { l: 'B', s: 3, p: 12995, st: 'available' }, { l: 'B', s: 4, p: 12995, st: 'available' }, { l: 'B', s: 5, p: 12995, st: 'available' },
    { l: 'A', s: 1, p: 11995, st: 'available' }, { l: 'A', s: 2, p: 11995, st: 'available' }, { l: 'A', s: 3, p: 11995, st: 'available' }, { l: 'A', s: 4, p: 11995, st: 'available' }, { l: 'A', s: 5, p: 11995, st: 'available' },
  ] },
  'C-EXT': { section: 'C', face: 'EXT', label: "OUTSIDE - WALL C", niches: [
    { l: 'E', s: 1, p: 13195, st: 'available' }, { l: 'E', s: 2, p: 13195, st: 'available' }, { l: 'E', s: 3, p: 13195, st: 'available' }, { l: 'E', s: 4, p: 13195, st: 'available' }, { l: 'E', s: 5, p: 13195, st: 'available' },
    { l: 'D', s: 1, p: 12095, st: 'available' }, { l: 'D', s: 2, p: 12095, st: 'available' }, { l: 'D', s: 3, p: 12095, st: 'available' }, { l: 'D', s: 4, p: 12095, st: 'available' }, { l: 'D', s: 5, p: 12095, st: 'available' },
    { l: 'C', s: 1, p: null, st: 'reserved' }, { l: 'C', s: 2, p: 10995, st: 'available' }, { l: 'C', s: 3, p: 10995, st: 'available' }, { l: 'C', s: 4, p: 10995, st: 'available' }, { l: 'C', s: 5, p: 10995, st: 'available' },
    { l: 'B', s: 1, p: null, st: 'reserved' }, { l: 'B', s: 2, p: 9895, st: 'available' }, { l: 'B', s: 3, p: 9895, st: 'available' }, { l: 'B', s: 4, p: 9895, st: 'available' }, { l: 'B', s: 5, p: 9895, st: 'available' },
    { l: 'A', s: 1, p: null, st: 'reserved' }, { l: 'A', s: 2, p: 8795, st: 'available' }, { l: 'A', s: 3, p: 8795, st: 'available' }, { l: 'A', s: 4, p: null, st: 'reserved' }, { l: 'A', s: 5, p: null, st: 'buried' },
  ] },
  'C-INT': { section: 'C', face: 'INT', label: "INSIDE - WALL C", niches: [
    { l: 'E', s: 1, p: null, st: 'buried' }, { l: 'E', s: 2, p: 13195, st: 'available' }, { l: 'E', s: 3, p: 13195, st: 'available' }, { l: 'E', s: 4, p: 13195, st: 'available' }, { l: 'E', s: 5, p: 13195, st: 'available' },
    { l: 'D', s: 1, p: 12095, st: 'available' }, { l: 'D', s: 2, p: 12095, st: 'available' }, { l: 'D', s: 3, p: 12095, st: 'available' }, { l: 'D', s: 4, p: 12095, st: 'available' }, { l: 'D', s: 5, p: 12095, st: 'available' },
    { l: 'C', s: 1, p: null, st: 'reserved' }, { l: 'C', s: 2, p: null, st: 'buried' }, { l: 'C', s: 3, p: 10995, st: 'available' }, { l: 'C', s: 4, p: 10995, st: 'available' }, { l: 'C', s: 5, p: null, st: 'reserved' },
    { l: 'B', s: 1, p: null, st: 'buried' }, { l: 'B', s: 2, p: 9895, st: 'available' }, { l: 'B', s: 3, p: 9895, st: 'available' }, { l: 'B', s: 4, p: 9895, st: 'available' }, { l: 'B', s: 5, p: 9895, st: 'available' },
    { l: 'A', s: 1, p: null, st: 'reserved' }, { l: 'A', s: 2, p: 8795, st: 'available' }, { l: 'A', s: 3, p: 8795, st: 'available' }, { l: 'A', s: 4, p: 8795, st: 'available' }, { l: 'A', s: 5, p: 8795, st: 'available' },
  ] },
  'D-EXT': { section: 'D', face: 'EXT', label: "OUTSIDE - WALL D", niches: [
    { l: 'E', s: 1, p: 13195, st: 'available' }, { l: 'E', s: 2, p: 13195, st: 'available' }, { l: 'E', s: 3, p: null, st: 'reserved' }, { l: 'E', s: 4, p: 13195, st: 'available' }, { l: 'E', s: 5, p: null, st: 'reserved' },
    { l: 'D', s: 1, p: 12095, st: 'available' }, { l: 'D', s: 2, p: 12095, st: 'available' }, { l: 'D', s: 3, p: null, st: 'reserved' }, { l: 'D', s: 4, p: 12095, st: 'available' }, { l: 'D', s: 5, p: null, st: 'reserved' },
    { l: 'C', s: 1, p: null, st: 'buried' }, { l: 'C', s: 2, p: null, st: 'reserved' }, { l: 'C', s: 3, p: null, st: 'reserved' }, { l: 'C', s: 4, p: null, st: 'buried' }, { l: 'C', s: 5, p: null, st: 'buried' },
    { l: 'B', s: 1, p: 9895, st: 'available' }, { l: 'B', s: 2, p: 9895, st: 'available' }, { l: 'B', s: 3, p: 9895, st: 'available' }, { l: 'B', s: 4, p: 9895, st: 'available' }, { l: 'B', s: 5, p: null, st: 'buried' },
    { l: 'A', s: 1, p: null, st: 'reserved' }, { l: 'A', s: 2, p: 8795, st: 'available' }, { l: 'A', s: 3, p: null, st: 'reserved' }, { l: 'A', s: 4, p: null, st: 'reserved' }, { l: 'A', s: 5, p: 8795, st: 'available' },
  ] },
  'D-INT': { section: 'D', face: 'INT', label: "INSIDE - WALL D", niches: [
    { l: 'E', s: 1, p: 15995, st: 'available' }, { l: 'E', s: 2, p: 15995, st: 'available' }, { l: 'E', s: 3, p: 15995, st: 'hold' }, { l: 'E', s: 4, p: 15995, st: 'available' }, { l: 'E', s: 5, p: 15995, st: 'available' },
    { l: 'D', s: 1, p: 14995, st: 'available' }, { l: 'D', s: 2, p: null, st: 'buried' }, { l: 'D', s: 3, p: null, st: 'buried' }, { l: 'D', s: 4, p: 14995, st: 'available' }, { l: 'D', s: 5, p: 14995, st: 'available' }, // operator 2026-08-01: MIS's $16,495 was a reprice miss; ladder value rules
    { l: 'C', s: 1, p: 13995, st: 'available' }, { l: 'C', s: 2, p: 13995, st: 'available' }, { l: 'C', s: 3, p: null, st: 'reserved' }, { l: 'C', s: 4, p: 13995, st: 'available' }, { l: 'C', s: 5, p: 13995, st: 'available' },
    { l: 'B', s: 1, p: 12995, st: 'available' }, { l: 'B', s: 2, p: 12995, st: 'available' }, { l: 'B', s: 3, p: 12995, st: 'available' }, { l: 'B', s: 4, p: 12995, st: 'available' }, { l: 'B', s: 5, p: 12995, st: 'available' },
    { l: 'A', s: 1, p: 11995, st: 'available' }, { l: 'A', s: 2, p: 11995, st: 'available' }, { l: 'A', s: 3, p: 11995, st: 'available' }, { l: 'A', s: 4, p: 11995, st: 'available' }, { l: 'A', s: 5, p: 11995, st: 'available' },
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
    { l: 'C', s: 1, p: 10995, st: 'available' }, { l: 'C', s: 2, p: 10995, st: 'available' }, { l: 'C', s: 3, p: null, st: 'buried' }, { l: 'C', s: 4, p: 10995, st: 'available' }, { l: 'C', s: 5, p: null, st: 'buried' },
    { l: 'B', s: 1, p: 9895, st: 'available' }, { l: 'B', s: 2, p: 9895, st: 'available' }, { l: 'B', s: 3, p: 9895, st: 'available' }, { l: 'B', s: 4, p: 9895, st: 'available' }, { l: 'B', s: 5, p: null, st: 'reserved' },
    { l: 'A', s: 1, p: 8795, st: 'available' }, { l: 'A', s: 2, p: 8795, st: 'available' }, { l: 'A', s: 3, p: 8795, st: 'available' }, { l: 'A', s: 4, p: 8795, st: 'available' }, { l: 'A', s: 5, p: null, st: 'reserved' },
  ] },
  'F-EXT': { section: 'F', face: 'EXT', label: "OUTSIDE - WALL F", niches: [
    { l: 'E', s: 1, p: 13195, st: 'available' }, { l: 'E', s: 2, p: 13195, st: 'available' }, { l: 'E', s: 3, p: null, st: 'reserved' }, { l: 'E', s: 4, p: 13195, st: 'available' }, { l: 'E', s: 5, p: 13195, st: 'available' },
    { l: 'D', s: 1, p: 12095, st: 'available' }, { l: 'D', s: 2, p: 12095, st: 'available' }, { l: 'D', s: 3, p: 12095, st: 'available' }, { l: 'D', s: 4, p: 12095, st: 'available' }, { l: 'D', s: 5, p: 12095, st: 'available' },
    { l: 'C', s: 1, p: 10995, st: 'available' }, { l: 'C', s: 2, p: 10995, st: 'available' }, { l: 'C', s: 3, p: 10995, st: 'available' }, { l: 'C', s: 4, p: 10995, st: 'available' }, { l: 'C', s: 5, p: 10995, st: 'available' },
    { l: 'B', s: 1, p: 9895, st: 'available' }, { l: 'B', s: 2, p: 9895, st: 'available' }, { l: 'B', s: 3, p: 9895, st: 'available' }, { l: 'B', s: 4, p: 9895, st: 'available' }, { l: 'B', s: 5, p: 9895, st: 'available' },
    { l: 'A', s: 1, p: 8795, st: 'available' }, { l: 'A', s: 2, p: 8795, st: 'available' }, { l: 'A', s: 3, p: 8795, st: 'available' }, { l: 'A', s: 4, p: 8795, st: 'available' }, { l: 'A', s: 5, p: 8795, st: 'available' },
  ] },
  'F-INT': { section: 'F', face: 'INT', label: "INSIDE - WALL F", niches: [
    { l: 'E', s: 1, p: 15995, st: 'available' }, { l: 'E', s: 2, p: 15995, st: 'available' }, { l: 'E', s: 3, p: 15995, st: 'available' }, { l: 'E', s: 4, p: 15995, st: 'available' }, { l: 'E', s: 5, p: 15995, st: 'available' },
    { l: 'D', s: 1, p: 14995, st: 'available' }, { l: 'D', s: 2, p: 14995, st: 'available' }, { l: 'D', s: 3, p: null, st: 'buried' }, { l: 'D', s: 4, p: 14995, st: 'available' }, { l: 'D', s: 5, p: 14995, st: 'available' },
    { l: 'C', s: 1, p: 13995, st: 'available' }, { l: 'C', s: 2, p: 13995, st: 'available' }, { l: 'C', s: 3, p: 13995, st: 'available' }, { l: 'C', s: 4, p: 13995, st: 'available' }, { l: 'C', s: 5, p: 13995, st: 'available' },
    { l: 'B', s: 1, p: 12995, st: 'available' }, { l: 'B', s: 2, p: 12995, st: 'available' }, { l: 'B', s: 3, p: 12995, st: 'available' }, { l: 'B', s: 4, p: 12995, st: 'available' }, { l: 'B', s: 5, p: 12995, st: 'available' },
    { l: 'A', s: 1, p: 11995, st: 'available' }, { l: 'A', s: 2, p: 11995, st: 'available' }, { l: 'A', s: 3, p: 11995, st: 'available' }, { l: 'A', s: 4, p: 11995, st: 'available' }, { l: 'A', s: 5, p: 11995, st: 'available' },
  ] },
  'G-EXT': { section: 'G', face: 'EXT', label: "OUTSIDE - WALL G", niches: [
    { l: 'E', s: 1, p: 11995, st: 'available' }, { l: 'E', s: 2, p: 11995, st: 'available' }, { l: 'E', s: 3, p: 11995, st: 'available' }, { l: 'E', s: 4, p: 11995, st: 'available' }, { l: 'E', s: 5, p: 11995, st: 'available' },
    { l: 'D', s: 1, p: 10995, st: 'available' }, { l: 'D', s: 2, p: 10995, st: 'available' }, { l: 'D', s: 3, p: 10995, st: 'available' }, { l: 'D', s: 4, p: 10995, st: 'available' }, { l: 'D', s: 5, p: 10995, st: 'available' },
    { l: 'C', s: 1, p: 9995, st: 'available' }, { l: 'C', s: 2, p: 9995, st: 'available' }, { l: 'C', s: 3, p: 9995, st: 'available' }, { l: 'C', s: 4, p: 9995, st: 'available' }, { l: 'C', s: 5, p: 9995, st: 'available' },
    { l: 'B', s: 1, p: 8995, st: 'available' }, { l: 'B', s: 2, p: 8995, st: 'available' }, { l: 'B', s: 3, p: null, st: 'reserved' }, { l: 'B', s: 4, p: 8995, st: 'available' }, { l: 'B', s: 5, p: 8995, st: 'available' },
    { l: 'A', s: 1, p: null, st: 'notforsale' }, { l: 'A', s: 2, p: 7995, st: 'available' }, { l: 'A', s: 3, p: 7995, st: 'available' }, { l: 'A', s: 4, p: null, st: 'reserved' }, { l: 'A', s: 5, p: null, st: 'reserved' },
  ] },
  'G-INT': { section: 'G', face: 'INT', label: "INSIDE - WALL G", niches: [
    { l: 'E', s: 1, p: 14995, st: 'available' }, { l: 'E', s: 2, p: 14995, st: 'available' }, { l: 'E', s: 3, p: 14995, st: 'available' }, { l: 'E', s: 4, p: 14995, st: 'available' }, { l: 'E', s: 5, p: 14995, st: 'available' },
    { l: 'D', s: 1, p: 13995, st: 'available' }, { l: 'D', s: 2, p: 13995, st: 'available' }, { l: 'D', s: 3, p: 13995, st: 'available' }, { l: 'D', s: 4, p: 13995, st: 'available' }, { l: 'D', s: 5, p: 13995, st: 'available' },
    { l: 'C', s: 1, p: 12995, st: 'available' }, { l: 'C', s: 2, p: 12995, st: 'available' }, { l: 'C', s: 3, p: 12995, st: 'available' }, { l: 'C', s: 4, p: 12995, st: 'available' }, { l: 'C', s: 5, p: 12995, st: 'available' },
    { l: 'B', s: 1, p: 11995, st: 'available' }, { l: 'B', s: 2, p: 11995, st: 'available' }, { l: 'B', s: 3, p: null, st: 'buried' }, { l: 'B', s: 4, p: null, st: 'reserved' }, { l: 'B', s: 5, p: 11995, st: 'available' },
    { l: 'A', s: 1, p: 10995, st: 'available' }, { l: 'A', s: 2, p: 10995, st: 'available' }, { l: 'A', s: 3, p: 10995, st: 'available' }, { l: 'A', s: 4, p: 10995, st: 'available' }, { l: 'A', s: 5, p: 10995, st: 'available' },
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
