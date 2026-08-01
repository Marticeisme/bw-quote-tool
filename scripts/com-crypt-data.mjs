/**
 * Chapel of Memory Mausoleum (COM) — the single source of truth for the interior
 * crypt inventory and the two glass-front niche walls inside it (Radiance, Serenity).
 *
 * TRANSCRIBED BY SCRIPT, NOT BY EYE, from the operator's three MIS screenshots in
 * D:\Cemetery Photos Misc\Chapel of Memories (2026-07-29):
 *   COM Maus Crypts.png          the per-crypt price/status sheet (authoritative)
 *   Chapel Of Memories Overview.png   CAD floor plan (where each bank sits)
 *   CHapel of Memory Maus.png    colour plan with per-column type letters
 * and D:\Cemetery Photos Misc\Radiance and Serenity Niches\{Radiance,Serenity}.png.
 *
 * READING RULE (operator, 2026-07-29, binding): a PRINTED PRICE means AVAILABLE;
 * a "NOT SELLING" cell is BLOCKED; EVERYTHING ELSE IS UNAVAILABLE — "confirm in MIS",
 * with no claim of sold vs reserved. Cell colours and dotted marks carry NO meaning.
 *
 * ── WHY NO CRYPT CARRIES A PRICE ──────────────────────────────────────────────
 * The crypt sheet's price text is FOUR PIXELS tall. At that size its bold bitmap
 * font renders only EIGHT distinct 3x4 glyph shapes for the ten digits, so digit
 * pairs collide and a five-figure price cannot be read with certainty. Two proofs
 * from the sheet itself:
 *   - `###/###/.##/###` is provably '3' (it ends the date "11-22-23" in a cell
 *     note) and is also the only glyph that can be a '9'.
 *   - `.##/###/.##/.##` is provably '1' (it opens that same date) and is the only
 *     glyph that can be a '4'.
 * So `st` (available / blocked / unavailable) is transcribed with confidence and
 * IS shipped; the dollar amount is NOT. Every crypt therefore carries `p: null`,
 * which also satisfies the operator's "no price rendered for a non-available
 * crypt" rule trivially. `sheetRaw` keeps the ambiguous glyph decode ('?' = a
 * collided glyph) so the operator can fill the real figures in from MIS; the build
 * NEVER renders it and verify_com_map.mjs proves it never reaches the HTML.
 *
 * The two NICHE WALL sheets are ordinary-resolution and fully legible, so those
 * prices ARE real, transcribed exactly, and drive the card math.
 *
 * GEOMETRY IS ESTIMATED from the CAD plan and the operator's photographs — display
 * values for the 3D scene, not fabrication data. The page renders NO dimensions for
 * crypts. The niche-wall sheets DO print dimensions, so those appear as a per-wall
 * size-class legend.
 *
 * PII: the photographs and the walkthrough video show real occupant names on crypt
 * and niche fronts. Nothing derived from a name, plate, date or inscription appears
 * in this file, in the generated page, or in any committed screenshot. Textures are
 * procedural.
 */

// ── Tiers ─────────────────────────────────────────────────────────────────────
export const TIERS = ['G', 'F', 'E', 'D', 'C', 'B', 'A']; // G top, A bottom

export const TYPE_LABEL = {
  single: 'Single',
  tandem: 'True Companion (Tandem)',
  deluxe: 'Deluxe Companion',
  hidden: 'Hidden Companion',
};
export const TYPE_CAP = { single: '1 entombment', tandem: '2 entombments', deluxe: '2 entombments', hidden: '2 entombments' };

export const STATUS_LABEL = {
  available: 'Available',
  unavailable: 'Unavailable',
  blocked: 'Not Selling',
};

// ── Fees ──────────────────────────────────────────────────────────────────────
// Crypt fee box, COM Maus Crypts.png. Two rows print as ######## (column too
// narrow) and are OMITTED rather than guessed — see OMITTED_FEES.
export const CRYPT_FEES = {
  RECORDING: 225,
  MONOBAR_INSTALL: 215,
  VASE: 415,
  ECF_RATE: 0.1,
};
export const OMITTED_FEES = [
  'Open & Closing — printed as ######## on the sheet',
  'Monobar (each) — printed as ######## on the sheet',
];
// Radiance / Serenity fee box — both walls are GLASS-FRONT, so they carry the uniform
// glass-front schedule, not the figures printed on their own wall sheets ($835 / $225).
// OPERATOR RULING, Map Issues 07.31.26: "All glass front niches should have the same
// opening and closing and recording fee ... The opening and closing fee is 875 and the
// recording fee is 235 same 10% ecf applies." No inscription fee, and no sales tax —
// the tax exception is ECL's bronze add-ons only, which these walls do not offer.
// This schedule must never be applied to the COM CRYPTS above (CRYPT_FEES) — crypts are
// a different product with their own, unchanged fee box.
export const NICHE_FEES = { OC: 875, RECORDING: 235, ECF_RATE: 0.1 };
export const NICHE_PRICES_EFFECTIVE = 'Prices effective January 13, 2025';

// ── Geometry ──────────────────────────────────────────────────────────────────
/**
 * PLAN COORDINATES, REDERIVED 2026-07-31 (sprint-09 Track M).
 *
 * Every rectangle below is now measured off `Chapel Of Memories Overview.png` (the
 * MIS CAD floor plan) at ONE constant scale instead of being placed by eye, which is
 * what put the Serenity wall up by the rest rooms and left the chapel as a 150x100
 * box floating beside the island.
 *
 *   plan_x = round((cad_px_x - 55) * 0.40)      plan_y = round((cad_px_y - 20) * 0.40)
 *
 * The 0.40 comes from the drawing itself: a crypt space measures ~47 CAD px across and
 * a crypt space is ~3 ft, and COLW = 19 plan units already encodes 3 ft (7 tiers x
 * ROWH 16 = 112 units tall next to 19 units wide is the ~17.5 ft x 3 ft of a real
 * seven-high crypt bank). So 19/47.4 = 0.40 and the plan, the elevations and the 3D
 * model are all on one scale.
 *
 * A bank's `plan` is now its FOOTPRINT (the block the CAD draws, including depth), and
 * `face` says which edge of that footprint the crypt fronts are on — the 3D face is
 * built on that edge, not at the centroid. Depth therefore reads correctly: the tandem
 * (end-to-end) banks are drawn twice as deep as the single-depth ones, exactly as the
 * CAD draws them.
 *
 * STILL ESTIMATED: everything vertical, the chapel furniture, and the two niche walls'
 * facing directions (MIS draws a niche wall as an ELEVATION symbol dropped on the plan,
 * so its footprint carries no orientation — see WALLS).
 */
export const PLAN_W = 740;
export const PLAN_H = 500;
export const COLW = 19;      // one crypt space across, ~3 ft
export const NCOLW = 13;     // one niche column across, ~2 ft
export const DEPTH = 26;
export const ROWH = 16;      // one tier, ~2.5 ft
export const EYE_Y = 24;     // walkthrough eye height above the model's floor plane

export const AREAS = [
  { id: 'north', label: 'North Wing', sub: 'Altar end — banks 111-115, 116-123, 124-140', stop: 'north-wing' },
  { id: 'west', label: 'Chapel & West Wall', sub: 'The worship space and bank 101-110', stop: 'chapel' },
  { id: 'island', label: 'Centre Island', sub: 'Free-standing block — banks 194-200, 220-231, 201-212, 213-219', stop: 'island-west' },
  { id: 'south', label: 'South Wall', sub: 'Banks 192-193, 185-191, 179-184, 173-178, 168-172', stop: 'south-wall' },
  { id: 'east', label: 'East Corridor & Entrance', sub: 'Banks 141-148, 149-153, 154-158, 159-167', stop: 'entrance-main' },
  { id: 'niches', label: 'Niche Walls', sub: 'Radiance (north-west of the chapel) and Serenity (east passage, toward the Eternal Light complex)', stop: 'radiance' },
];

/**
 * Banks. `plan` is the CAD footprint in plan units; `face` is the edge of that
 * footprint the crypt fronts are on, and the compass direction they look toward.
 * `segs` are the header segments of the crypt sheet, in column order.
 */
export const BANKS = [
  // ── North wing ── (111-115 is double-depth: the CAD draws both halves of the tandems)
  { id: '111-115', area: 'north', c0: 111, c1: 115, face: 'S', plan: { x: 3, y: 3, w: 95, h: 95 }, segs: [[111, 115, 'tandem']] },
  { id: '116-123', area: 'north', c0: 116, c1: 123, face: 'S', plan: { x: 98, y: 3, w: 152, h: 47 }, segs: [[116, 117, 'deluxe'], [118, 121, 'hidden'], [122, 123, 'deluxe']] },
  { id: '124-140', area: 'north', c0: 124, c1: 140, face: 'S', plan: { x: 240, y: 50, w: 323, h: 48 }, segs: [[124, 140, 'tandem']] },
  // ── West wall ──
  { id: '101-110', area: 'west', c0: 101, c1: 110, face: 'E', plan: { x: 3, y: 172, w: 95, h: 190 }, segs: [[101, 102, 'deluxe'], [103, 110, 'tandem']] },
  // ── Centre island ── (footprint x 234-562, z 166-312)
  { id: '194-200', area: 'island', c0: 194, c1: 200, face: 'W', plan: { x: 234, y: 172, w: 54, h: 133 }, segs: [[194, 194, 'single'], [195, 196, 'deluxe'], [197, 197, 'single'], [198, 199, 'deluxe'], [200, 200, 'single']] },
  { id: '220-231', area: 'island', c0: 220, c1: 231, face: 'N', plan: { x: 290, y: 166, w: 228, h: 54 }, segs: [[220, 220, 'single'], [221, 222, 'deluxe'], [223, 223, 'single'], [224, 227, 'tandem'], [228, 228, 'single'], [229, 230, 'deluxe'], [231, 231, 'single']] },
  { id: '201-212', area: 'island', c0: 201, c1: 212, face: 'S', plan: { x: 290, y: 266, w: 228, h: 46 }, segs: [[201, 204, 'tandem'], [205, 205, 'single'], [206, 207, 'deluxe'], [208, 208, 'single'], [209, 212, 'tandem']] },
  { id: '213-219', area: 'island', c0: 213, c1: 219, face: 'E', plan: { x: 516, y: 172, w: 46, h: 133 }, segs: [[213, 213, 'single'], [214, 215, 'deluxe'], [216, 216, 'single'], [217, 218, 'deluxe'], [219, 219, 'single']] },
  // ── South wall ── (numbering runs east to west: 185 nearest the middle, 193 at the west end)
  { id: '192-193', area: 'south', c0: 192, c1: 193, face: 'N', plan: { x: 135, y: 378, w: 38, h: 48 }, segs: [[192, 193, 'single']] },
  { id: '185-191', area: 'south', c0: 185, c1: 191, face: 'N', plan: { x: 173, y: 378, w: 133, h: 48 }, segs: [[185, 191, 'tandem']] },
  { id: '179-184', area: 'south', c0: 179, c1: 184, face: 'N', plan: { x: 306, y: 426, w: 114, h: 50 }, segs: [[179, 180, 'hidden'], [181, 181, 'single'], [182, 182, 'single'], [183, 184, 'hidden']] },
  { id: '173-178', area: 'south', c0: 173, c1: 178, face: 'N', plan: { x: 404, y: 378, w: 114, h: 48 }, segs: [[173, 178, 'tandem']] },
  { id: '168-172', area: 'south', c0: 168, c1: 172, face: 'W', plan: { x: 518, y: 378, w: 46, h: 95 }, segs: [[168, 172, 'single']] },
  // ── East corridor & entrance ── (a separate wing east of the COM shell; the ENTRANCE
  //    is the gap between 149-153 and 154-158, shared with ELM-3)
  { id: '141-148', area: 'east', c0: 141, c1: 148, face: 'W', plan: { x: 638, y: 41, w: 50, h: 152 }, segs: [[141, 148, 'tandem']] },
  { id: '149-153', area: 'east', c0: 149, c1: 153, face: 'S', plan: { x: 638, y: 188, w: 95, h: 44 }, segs: [[149, 150, 'deluxe'], [151, 153, 'single']] },
  { id: '154-158', area: 'east', c0: 154, c1: 158, face: 'N', plan: { x: 638, y: 268, w: 95, h: 44 }, segs: [[154, 156, 'single'], [157, 158, 'deluxe']] },
  { id: '159-167', area: 'east', c0: 159, c1: 167, face: 'W', plan: { x: 638, y: 312, w: 50, h: 171 }, segs: [[159, 167, 'tandem']] },
];

/** Rooms and circulation, all measured off the CAD plan. */
export const ROOMS = [
  { id: 'chapel', label: 'Chapel — Worship Space', x: 98, y: 112, w: 136, h: 256, kind: 'chapel' },
  { id: 'restrooms', label: 'Rest Rooms', x: 506, y: 3, w: 56, h: 95, kind: 'service' },
  { id: 'storage', label: 'Storage Room', x: 630, y: 3, w: 97, h: 95, kind: 'service' },
  { id: 'hall-n', label: 'North Hall', x: 240, y: 98, w: 254, h: 68, kind: 'hall' },
  { id: 'hall-e', label: 'East Passage', x: 562, y: 98, w: 68, h: 386, kind: 'hall' },
  { id: 'hall-s', label: 'South Hall', x: 144, y: 312, w: 396, h: 66, kind: 'hall' },
];

/**
 * THE TWO ENTRANCES (operator, Map Issues 07.31.26: "There are two entrances into the
 * chapel of memories not one").
 *
 *  - MAIN, east: the corridor labelled ENTRANCE on the CAD, the gap between COM's
 *    149-153 and 154-158, shared with the Eternal Light Mausoleum (ELM-3).
 *  - CHAPEL, south-west: the CAD draws a two-leaf DOOR SWING on the diagonal exterior
 *    wall between bank 101-110's south end and bank 192-193's west end. It opens
 *    straight into the chapel; the walkthrough photographs show glass doors with an
 *    EXIT sign at that end of the worship space.
 */
export const ENTRANCES = [
  {
    id: 'entrance-main', label: 'Main Entrance', x: 638, y: 232, w: 95, h: 36, face: 'W',
    sub: 'East corridor, shared with the Eternal Light Mausoleum',
    note: 'Deluxe Companion crypts on both sides of the corridor — COM 149-153 on the west side, 154-158 on the east.',
  },
  {
    id: 'entrance-chapel', label: 'Chapel Entrance', x: 69, y: 379, w: 44, h: 42, face: 'N',
    sub: 'South-west doors, straight into the worship space',
    note: 'Drawn as a two-leaf door swing on the CAD plan; the walkthrough photographs show glass doors and an EXIT sign at this end of the chapel.',
  },
];

/**
 * CHAPEL FURNITURE (operator: "The chapel area needs to be better laid out on the map
 * with small chairs").
 *
 * The altar rectangle is the CAD's own ALTAR box, at the north end of the worship
 * space in the recess between banks 111-115 and 124-140. Everything else is placed
 * from the 2026-07-29 walkthrough photographs, which show: rows of individual light-
 * wood chairs (NOT pews) in two blocks either side of a centre aisle facing the altar
 * end, a grand piano and two armchairs beside the altar, cushioned benches at the
 * front, and a lectern. Counts and spacings are ESTIMATED — no dimension is rendered.
 */
export const CHAIR_BLOCKS = [
  { id: 'left', x0: 112, cols: 5, dx: 11 },
  { id: 'right', x0: 176, cols: 5, dx: 11 },
];
export const CHAIR_ROWS = { z0: 140, rows: 7, dz: 20, w: 8, d: 8 };

export const FURNITURE = [
  { id: 'altar', kind: 'altar', label: 'Altar', x: 148, y: 83, w: 35, h: 16, tall: 22 },
  { id: 'lectern', kind: 'lectern', label: 'Lectern', x: 122, y: 86, w: 11, h: 11, tall: 18 },
  { id: 'piano', kind: 'piano', label: 'Piano', x: 194, y: 92, w: 34, h: 24, tall: 14 },
  { id: 'armchair-a', kind: 'seat', label: '', x: 188, y: 118, w: 10, h: 10, tall: 13 },
  { id: 'armchair-b', kind: 'seat', label: '', x: 220, y: 100, w: 10, h: 10, tall: 13 },
  { id: 'bench-a', kind: 'bench', label: '', x: 112, y: 122, w: 40, h: 8, tall: 9 },
  { id: 'bench-b', kind: 'bench', label: '', x: 180, y: 122, w: 40, h: 8, tall: 9 },
];

/** Every chapel chair, generated from CHAIR_BLOCKS x CHAIR_ROWS. All face the altar. */
export function chapelChairs() {
  const out = [];
  for (const b of CHAIR_BLOCKS) {
    for (let c = 0; c < b.cols; c++) {
      for (let r = 0; r < CHAIR_ROWS.rows; r++) {
        out.push({
          id: `chair-${b.id}-${c}-${r}`,
          x: b.x0 + c * b.dx, y: CHAIR_ROWS.z0 + r * CHAIR_ROWS.dz,
          w: CHAIR_ROWS.w, h: CHAIR_ROWS.d, tall: 12, face: 'N',
        });
      }
    }
  }
  return out;
}

/**
 * WALKTHROUGH STOPS (operator: "I should be able to almost walk through the chapel and
 * click through different areas not just the overview look ... the map is very hard to
 * navigate through ... this area is very spread out with many different maps").
 *
 * Each stop puts the camera INSIDE the building at eye height (EYE_Y) at plan position
 * (x, z) looking along `yaw` — 0 = north, 90 = east, 180 = south, -90 = west, matching
 * the face rotations. `area` drives the breadcrumb and the ghosting of the walls you
 * are not standing in front of.
 */
export const STOPS = [
  { id: 'entrance-main', area: 'east', label: 'Main Entrance', sub: 'East corridor, shared with Eternal Light', x: 700, z: 250, yaw: -90, pitch: -8, zoom: 0.7 },
  { id: 'entrance-chapel', area: 'west', label: 'Chapel Entrance', sub: 'South-west doors', x: 96, z: 392, yaw: 20, pitch: -8, zoom: 0.75 },
  { id: 'chapel', area: 'west', label: 'Chapel — Worship Space', sub: 'Seating, looking toward the altar', x: 166, z: 292, yaw: 0, pitch: -8, zoom: 1.3 },
  { id: 'altar', area: 'north', label: 'Altar', sub: 'North end of the worship space', x: 166, z: 150, yaw: 0, pitch: -3 },
  { id: 'west-wall', area: 'west', label: 'West Wall — 101-110', sub: 'Deluxe Companion and tandem crypts', x: 150, z: 262, yaw: -90, pitch: -5 },
  { id: 'radiance', area: 'niches', label: 'Radiance Niche Wall', sub: 'North-west of the chapel', x: 58, z: 154, yaw: 0, pitch: -3 },
  { id: 'north-wing', area: 'north', label: 'North Wing — 124-140', sub: 'Tandem crypts along the north hall', x: 360, z: 150, yaw: 0, pitch: -5 },
  { id: 'north-hidden', area: 'north', label: 'North Wing — 116-123', sub: 'Hidden Companions and Deluxe Companions', x: 174, z: 96, yaw: 0, pitch: -4 },
  { id: 'island-west', area: 'island', label: 'Island — West Face 194-200', sub: 'Faces the chapel', x: 198, z: 240, yaw: 90, pitch: -5 },
  { id: 'island-north', area: 'island', label: 'Island — North Face 220-231', sub: 'Deluxe Companions', x: 404, z: 130, yaw: 180, pitch: -5 },
  { id: 'island-south', area: 'island', label: 'Island — South Face 201-212', sub: 'Deluxe Companions', x: 404, z: 350, yaw: 0, pitch: -5 },
  { id: 'island-east', area: 'island', label: 'Island — East Face 213-219', sub: 'Faces the east passage', x: 600, z: 240, yaw: -90, pitch: -5 },
  { id: 'serenity', area: 'niches', label: 'Serenity Niche Wall', sub: 'East passage, between COM and the Eternal Light complex', x: 606, z: 143, yaw: -90, pitch: -3 },
  { id: 'south-wall', area: 'south', label: 'South Wall — 185-193', sub: 'Tandem and single crypts', x: 240, z: 340, yaw: 180, pitch: -5 },
  { id: 'south-hidden', area: 'south', label: 'South Wall — 179-184', sub: 'Hidden Companions', x: 362, z: 396, yaw: 180, pitch: -5 },
  { id: 'south-east', area: 'south', label: 'South Wall — 173-178', sub: 'Tandem crypts', x: 470, z: 344, yaw: 180, pitch: -5 },
  { id: 'corner-168', area: 'south', label: 'South-East Corner — 168-172', sub: 'Single crypts', x: 484, z: 452, yaw: 90, pitch: -5 },
  { id: 'east-north', area: 'east', label: 'East Corridor — 141-148', sub: 'North of the entrance', x: 700, z: 120, yaw: 90, pitch: -5 },
  { id: 'east-south', area: 'east', label: 'East Corridor — 159-167', sub: 'South of the entrance', x: 700, z: 396, yaw: 90, pitch: -5 },
];
export const stopById = (id) => STOPS.find((s) => s.id === id);

/** The two "EMPTY AREA — NO CRYPTS IN THIS SECTION" voids on the crypt sheet. */
export const VOIDS = [
  { bank: '124-140', cols: [138, 139, 140], tiers: ['D', 'C', 'B', 'A'] },
  { bank: '141-148', cols: [141, 142, 143], tiers: ['D', 'C', 'B', 'A'] },
];

/**
 * Crypt units. One row per PURCHASABLE UNIT — a tandem or companion is ONE unit
 * over one or two column numbers and is never split.
 *   [bank, tier, columns, type, status, sheetRaw]
 * sheetRaw is the ambiguous glyph decode of the printed price ('?' = a glyph the
 * font collides). It is diagnostic only and is never rendered.
 */
export const UNITS = [
  ['101-110', 'G', [101, 102], 'deluxe', 'unavailable', null],
  ['101-110', 'G', [103], 'tandem', 'unavailable', null],
  ['101-110', 'G', [104], 'tandem', 'unavailable', null],
  ['101-110', 'G', [105], 'tandem', 'unavailable', null],
  ['101-110', 'G', [106], 'tandem', 'unavailable', null],
  ['101-110', 'G', [107], 'tandem', 'unavailable', null],
  ['101-110', 'G', [108], 'tandem', 'unavailable', null],
  ['101-110', 'G', [109], 'tandem', 'unavailable', null],
  ['101-110', 'G', [110], 'tandem', 'unavailable', null],
  ['101-110', 'F', [101, 102], 'deluxe', 'unavailable', null],
  ['101-110', 'F', [103], 'tandem', 'unavailable', null],
  ['101-110', 'F', [104], 'tandem', 'unavailable', null],
  ['101-110', 'F', [105], 'tandem', 'unavailable', null],
  ['101-110', 'F', [106], 'tandem', 'unavailable', null],
  ['101-110', 'F', [107], 'tandem', 'unavailable', null],
  ['101-110', 'F', [108], 'tandem', 'unavailable', null],
  ['101-110', 'F', [109], 'tandem', 'unavailable', null],
  ['101-110', 'F', [110], 'tandem', 'unavailable', null],
  ['101-110', 'E', [101, 102], 'deluxe', 'available', '$27,??5'],
  ['101-110', 'E', [103], 'tandem', 'unavailable', null],
  ['101-110', 'E', [104], 'tandem', 'unavailable', null],
  ['101-110', 'E', [105], 'tandem', 'unavailable', null],
  ['101-110', 'E', [106], 'tandem', 'unavailable', null],
  ['101-110', 'E', [107], 'tandem', 'unavailable', null],
  ['101-110', 'E', [108], 'tandem', 'unavailable', null],
  ['101-110', 'E', [109], 'tandem', 'unavailable', null],
  ['101-110', 'E', [110], 'tandem', 'unavailable', null],
  ['101-110', 'D', [101, 102], 'deluxe', 'available', '$?2,??5'],
  ['101-110', 'D', [103], 'tandem', 'unavailable', null],
  ['101-110', 'D', [104], 'tandem', 'unavailable', null],
  ['101-110', 'D', [105], 'tandem', 'unavailable', null],
  ['101-110', 'D', [106], 'tandem', 'unavailable', null],
  ['101-110', 'D', [107], 'tandem', 'unavailable', null],
  ['101-110', 'D', [108], 'tandem', 'unavailable', null],
  ['101-110', 'D', [109], 'tandem', 'unavailable', null],
  ['101-110', 'D', [110], 'tandem', 'unavailable', null],
  ['101-110', 'C', [101, 102], 'deluxe', 'unavailable', null],
  ['101-110', 'C', [103], 'tandem', 'unavailable', null],
  ['101-110', 'C', [104], 'tandem', 'unavailable', null],
  ['101-110', 'C', [105], 'tandem', 'unavailable', null],
  ['101-110', 'C', [106], 'tandem', 'unavailable', null],
  ['101-110', 'C', [107], 'tandem', 'unavailable', null],
  ['101-110', 'C', [108], 'tandem', 'unavailable', null],
  ['101-110', 'C', [109], 'tandem', 'unavailable', null],
  ['101-110', 'C', [110], 'tandem', 'unavailable', null],
  ['101-110', 'B', [101, 102], 'deluxe', 'unavailable', null],
  ['101-110', 'B', [103], 'tandem', 'unavailable', null],
  ['101-110', 'B', [104], 'tandem', 'unavailable', null],
  ['101-110', 'B', [105], 'tandem', 'unavailable', null],
  ['101-110', 'B', [106], 'tandem', 'unavailable', null],
  ['101-110', 'B', [107], 'tandem', 'unavailable', null],
  ['101-110', 'B', [108], 'tandem', 'unavailable', null],
  ['101-110', 'B', [109], 'tandem', 'unavailable', null],
  ['101-110', 'B', [110], 'tandem', 'unavailable', null],
  ['101-110', 'A', [101, 102], 'deluxe', 'unavailable', null],
  ['101-110', 'A', [103], 'tandem', 'unavailable', null],
  ['101-110', 'A', [104], 'tandem', 'unavailable', null],
  ['101-110', 'A', [105], 'tandem', 'unavailable', null],
  ['101-110', 'A', [106], 'tandem', 'unavailable', null],
  ['101-110', 'A', [107], 'tandem', 'unavailable', null],
  ['101-110', 'A', [108], 'tandem', 'unavailable', null],
  ['101-110', 'A', [109], 'tandem', 'unavailable', null],
  ['101-110', 'A', [110], 'tandem', 'unavailable', null],
  ['111-115', 'G', [111], 'tandem', 'unavailable', null],
  ['111-115', 'G', [112], 'tandem', 'unavailable', null],
  ['111-115', 'G', [113], 'tandem', 'unavailable', null],
  ['111-115', 'G', [114], 'tandem', 'unavailable', null],
  ['111-115', 'G', [115], 'tandem', 'unavailable', null],
  ['111-115', 'F', [111], 'tandem', 'unavailable', null],
  ['111-115', 'F', [112], 'tandem', 'unavailable', null],
  ['111-115', 'F', [113], 'tandem', 'unavailable', null],
  ['111-115', 'F', [114], 'tandem', 'unavailable', null],
  ['111-115', 'F', [115], 'tandem', 'unavailable', null],
  ['111-115', 'E', [111], 'tandem', 'unavailable', null],
  ['111-115', 'E', [112], 'tandem', 'unavailable', null],
  ['111-115', 'E', [113], 'tandem', 'unavailable', null],
  ['111-115', 'E', [114], 'tandem', 'unavailable', null],
  ['111-115', 'E', [115], 'tandem', 'unavailable', null],
  ['111-115', 'D', [111], 'tandem', 'unavailable', null],
  ['111-115', 'D', [112], 'tandem', 'unavailable', null],
  ['111-115', 'D', [113], 'tandem', 'unavailable', null],
  ['111-115', 'D', [114], 'tandem', 'unavailable', null],
  ['111-115', 'D', [115], 'tandem', 'unavailable', null],
  ['111-115', 'C', [111], 'tandem', 'unavailable', null],
  ['111-115', 'C', [112], 'tandem', 'unavailable', null],
  ['111-115', 'C', [113], 'tandem', 'unavailable', null],
  ['111-115', 'C', [114], 'tandem', 'unavailable', null],
  ['111-115', 'C', [115], 'tandem', 'unavailable', null],
  ['111-115', 'B', [111], 'tandem', 'unavailable', null],
  ['111-115', 'B', [112], 'tandem', 'unavailable', null],
  ['111-115', 'B', [113], 'tandem', 'unavailable', null],
  ['111-115', 'B', [114], 'tandem', 'unavailable', null],
  ['111-115', 'B', [115], 'tandem', 'unavailable', null],
  ['111-115', 'A', [111], 'tandem', 'unavailable', null],
  ['111-115', 'A', [112], 'tandem', 'unavailable', null],
  ['111-115', 'A', [113], 'tandem', 'unavailable', null],
  ['111-115', 'A', [114], 'tandem', 'unavailable', null],
  ['111-115', 'A', [115], 'tandem', 'unavailable', null],
  ['116-123', 'G', [116], 'single', 'unavailable', null],
  ['116-123', 'G', [117], 'single', 'unavailable', null],
  ['116-123', 'G', [118], 'single', 'unavailable', null],
  ['116-123', 'G', [119], 'single', 'unavailable', null],
  ['116-123', 'G', [120], 'single', 'unavailable', null],
  ['116-123', 'G', [121], 'single', 'unavailable', null],
  ['116-123', 'G', [122], 'single', 'unavailable', null],
  ['116-123', 'G', [123], 'single', 'unavailable', null],
  ['116-123', 'F', [116, 117], 'deluxe', 'available', '$??,5?5'],
  ['116-123', 'F', [118, 119], 'hidden', 'available', '$?5,??5'],
  ['116-123', 'F', [120, 121], 'hidden', 'available', '$?5,??5'],
  ['116-123', 'F', [122, 123], 'deluxe', 'available', '$?5,??5'],
  ['116-123', 'E', [116, 117], 'deluxe', 'available', '$50,5?5'],
  ['116-123', 'E', [118, 119], 'hidden', 'available', '$50,5?5'],
  ['116-123', 'E', [120, 121], 'hidden', 'available', '$50,5?5'],
  ['116-123', 'E', [122, 123], 'deluxe', 'available', '$50,5?5'],
  ['116-123', 'D', [116, 117], 'deluxe', 'available', '$61,155'],
  ['116-123', 'D', [118, 119], 'hidden', 'unavailable', null],
  ['116-123', 'D', [120, 121], 'hidden', 'unavailable', null],
  ['116-123', 'D', [122, 123], 'deluxe', 'available', '$61,155'],
  ['116-123', 'C', [116, 117], 'deluxe', 'unavailable', null],
  ['116-123', 'C', [118, 119], 'hidden', 'unavailable', null],
  ['116-123', 'C', [120, 121], 'hidden', 'unavailable', null],
  ['116-123', 'C', [122, 123], 'deluxe', 'unavailable', null],
  ['116-123', 'B', [116, 117], 'deluxe', 'unavailable', null],
  ['116-123', 'B', [118, 119], 'hidden', 'unavailable', null],
  ['116-123', 'B', [120, 121], 'hidden', 'unavailable', null],
  ['116-123', 'B', [122, 123], 'deluxe', 'unavailable', null],
  ['116-123', 'A', [116, 117], 'deluxe', 'available', '$65,??5'],
  ['116-123', 'A', [118, 119], 'hidden', 'available', '$65,??5'],
  ['116-123', 'A', [120, 121], 'hidden', 'unavailable', null],
  ['116-123', 'A', [122, 123], 'deluxe', 'available', '$65,??5'],
  ['124-140', 'G', [124], 'tandem', 'unavailable', null],
  ['124-140', 'G', [125], 'tandem', 'unavailable', null],
  ['124-140', 'G', [126], 'tandem', 'unavailable', null],
  ['124-140', 'G', [127], 'tandem', 'unavailable', null],
  ['124-140', 'G', [128], 'tandem', 'unavailable', null],
  ['124-140', 'G', [129], 'tandem', 'unavailable', null],
  ['124-140', 'G', [130], 'tandem', 'unavailable', null],
  ['124-140', 'G', [131], 'tandem', 'unavailable', null],
  ['124-140', 'G', [132], 'tandem', 'unavailable', null],
  ['124-140', 'G', [133], 'tandem', 'unavailable', null],
  ['124-140', 'G', [134], 'tandem', 'unavailable', null],
  ['124-140', 'G', [135], 'tandem', 'unavailable', null],
  ['124-140', 'G', [136], 'tandem', 'unavailable', null],
  ['124-140', 'G', [137], 'tandem', 'unavailable', null],
  ['124-140', 'G', [138], 'tandem', 'blocked', null],
  ['124-140', 'G', [139], 'tandem', 'blocked', null],
  ['124-140', 'G', [140], 'tandem', 'blocked', null],
  ['124-140', 'F', [124], 'tandem', 'unavailable', null],
  ['124-140', 'F', [125], 'tandem', 'unavailable', null],
  ['124-140', 'F', [126], 'tandem', 'unavailable', null],
  ['124-140', 'F', [127], 'tandem', 'unavailable', null],
  ['124-140', 'F', [128], 'tandem', 'unavailable', null],
  ['124-140', 'F', [129], 'tandem', 'unavailable', null],
  ['124-140', 'F', [130], 'tandem', 'unavailable', null],
  ['124-140', 'F', [131], 'tandem', 'unavailable', null],
  ['124-140', 'F', [132], 'tandem', 'unavailable', null],
  ['124-140', 'F', [133], 'tandem', 'unavailable', null],
  ['124-140', 'F', [134], 'tandem', 'unavailable', null],
  ['124-140', 'F', [135], 'tandem', 'unavailable', null],
  ['124-140', 'F', [136], 'tandem', 'unavailable', null],
  ['124-140', 'F', [137], 'tandem', 'unavailable', null],
  ['124-140', 'F', [138], 'tandem', 'blocked', null],
  ['124-140', 'F', [139], 'tandem', 'blocked', null],
  ['124-140', 'F', [140], 'tandem', 'blocked', null],
  ['124-140', 'E', [124], 'tandem', 'unavailable', null],
  ['124-140', 'E', [125], 'tandem', 'unavailable', null],
  ['124-140', 'E', [126], 'tandem', 'unavailable', null],
  ['124-140', 'E', [127], 'tandem', 'unavailable', null],
  ['124-140', 'E', [128], 'tandem', 'unavailable', null],
  ['124-140', 'E', [129], 'tandem', 'unavailable', null],
  ['124-140', 'E', [130], 'tandem', 'unavailable', null],
  ['124-140', 'E', [131], 'tandem', 'unavailable', null],
  ['124-140', 'E', [132], 'tandem', 'unavailable', null],
  ['124-140', 'E', [133], 'tandem', 'unavailable', null],
  ['124-140', 'E', [134], 'tandem', 'unavailable', null],
  ['124-140', 'E', [135], 'tandem', 'unavailable', null],
  ['124-140', 'E', [136], 'tandem', 'unavailable', null],
  ['124-140', 'E', [137], 'tandem', 'unavailable', null],
  ['124-140', 'E', [138], 'tandem', 'blocked', null],
  ['124-140', 'E', [139], 'tandem', 'blocked', null],
  ['124-140', 'E', [140], 'tandem', 'blocked', null],
  ['124-140', 'D', [124], 'tandem', 'unavailable', null],
  ['124-140', 'D', [125], 'tandem', 'unavailable', null],
  ['124-140', 'D', [126], 'tandem', 'unavailable', null],
  ['124-140', 'D', [127], 'tandem', 'unavailable', null],
  ['124-140', 'D', [128], 'tandem', 'unavailable', null],
  ['124-140', 'D', [129], 'tandem', 'unavailable', null],
  ['124-140', 'D', [130], 'tandem', 'unavailable', null],
  ['124-140', 'D', [131], 'tandem', 'unavailable', null],
  ['124-140', 'D', [132], 'tandem', 'unavailable', null],
  ['124-140', 'D', [133], 'tandem', 'unavailable', null],
  ['124-140', 'D', [134], 'tandem', 'unavailable', null],
  ['124-140', 'D', [135], 'tandem', 'unavailable', null],
  ['124-140', 'D', [136], 'tandem', 'unavailable', null],
  ['124-140', 'D', [137], 'tandem', 'unavailable', null],
  ['124-140', 'C', [124], 'tandem', 'unavailable', null],
  ['124-140', 'C', [125], 'tandem', 'unavailable', null],
  ['124-140', 'C', [126], 'tandem', 'unavailable', null],
  ['124-140', 'C', [127], 'tandem', 'unavailable', null],
  ['124-140', 'C', [128], 'tandem', 'unavailable', null],
  ['124-140', 'C', [129], 'tandem', 'unavailable', null],
  ['124-140', 'C', [130], 'tandem', 'unavailable', null],
  ['124-140', 'C', [131], 'tandem', 'unavailable', null],
  ['124-140', 'C', [132], 'tandem', 'unavailable', null],
  ['124-140', 'C', [133], 'tandem', 'unavailable', null],
  ['124-140', 'C', [134], 'tandem', 'unavailable', null],
  ['124-140', 'C', [135], 'tandem', 'unavailable', null],
  ['124-140', 'C', [136], 'tandem', 'unavailable', null],
  ['124-140', 'C', [137], 'tandem', 'unavailable', null],
  ['124-140', 'B', [124], 'tandem', 'unavailable', null],
  ['124-140', 'B', [125], 'tandem', 'unavailable', null],
  ['124-140', 'B', [126], 'tandem', 'unavailable', null],
  ['124-140', 'B', [127], 'tandem', 'unavailable', null],
  ['124-140', 'B', [128], 'tandem', 'unavailable', null],
  ['124-140', 'B', [129], 'tandem', 'unavailable', null],
  ['124-140', 'B', [130], 'tandem', 'unavailable', null],
  ['124-140', 'B', [131], 'tandem', 'unavailable', null],
  ['124-140', 'B', [132], 'tandem', 'unavailable', null],
  ['124-140', 'B', [133], 'tandem', 'unavailable', null],
  ['124-140', 'B', [134], 'tandem', 'unavailable', null],
  ['124-140', 'B', [135], 'tandem', 'unavailable', null],
  ['124-140', 'B', [136], 'tandem', 'unavailable', null],
  ['124-140', 'B', [137], 'tandem', 'unavailable', null],
  ['124-140', 'A', [124], 'tandem', 'unavailable', null],
  ['124-140', 'A', [125], 'tandem', 'unavailable', null],
  ['124-140', 'A', [126], 'tandem', 'unavailable', null],
  ['124-140', 'A', [127], 'tandem', 'unavailable', null],
  ['124-140', 'A', [128], 'tandem', 'unavailable', null],
  ['124-140', 'A', [129], 'tandem', 'unavailable', null],
  ['124-140', 'A', [130], 'tandem', 'unavailable', null],
  ['124-140', 'A', [131], 'tandem', 'unavailable', null],
  ['124-140', 'A', [132], 'tandem', 'unavailable', null],
  ['124-140', 'A', [133], 'tandem', 'unavailable', null],
  ['124-140', 'A', [134], 'tandem', 'unavailable', null],
  ['124-140', 'A', [135], 'tandem', 'unavailable', null],
  ['124-140', 'A', [136], 'tandem', 'unavailable', null],
  ['124-140', 'A', [137], 'tandem', 'unavailable', null],
  ['141-148', 'G', [141], 'tandem', 'blocked', null],
  ['141-148', 'G', [142], 'tandem', 'blocked', null],
  ['141-148', 'G', [143], 'tandem', 'blocked', null],
  ['141-148', 'G', [144], 'tandem', 'unavailable', null],
  ['141-148', 'G', [145], 'tandem', 'unavailable', null],
  ['141-148', 'G', [146], 'tandem', 'unavailable', null],
  ['141-148', 'G', [147], 'tandem', 'unavailable', null],
  ['141-148', 'G', [148], 'tandem', 'unavailable', null],
  ['141-148', 'F', [141], 'tandem', 'blocked', null],
  ['141-148', 'F', [142], 'tandem', 'blocked', null],
  ['141-148', 'F', [143], 'tandem', 'blocked', null],
  ['141-148', 'F', [144], 'tandem', 'unavailable', null],
  ['141-148', 'F', [145], 'tandem', 'unavailable', null],
  ['141-148', 'F', [146], 'tandem', 'unavailable', null],
  ['141-148', 'F', [147], 'tandem', 'unavailable', null],
  ['141-148', 'F', [148], 'tandem', 'unavailable', null],
  ['141-148', 'E', [141], 'tandem', 'blocked', null],
  ['141-148', 'E', [142], 'tandem', 'blocked', null],
  ['141-148', 'E', [143], 'tandem', 'blocked', null],
  ['141-148', 'E', [144], 'tandem', 'unavailable', null],
  ['141-148', 'E', [145], 'tandem', 'unavailable', null],
  ['141-148', 'E', [146], 'tandem', 'unavailable', null],
  ['141-148', 'E', [147], 'tandem', 'unavailable', null],
  ['141-148', 'E', [148], 'tandem', 'unavailable', null],
  ['141-148', 'D', [144], 'tandem', 'unavailable', null],
  ['141-148', 'D', [145], 'tandem', 'unavailable', null],
  ['141-148', 'D', [146], 'tandem', 'unavailable', null],
  ['141-148', 'D', [147], 'tandem', 'unavailable', null],
  ['141-148', 'D', [148], 'tandem', 'unavailable', null],
  ['141-148', 'C', [144], 'tandem', 'unavailable', null],
  ['141-148', 'C', [145], 'tandem', 'unavailable', null],
  ['141-148', 'C', [146], 'tandem', 'unavailable', null],
  ['141-148', 'C', [147], 'tandem', 'unavailable', null],
  ['141-148', 'C', [148], 'tandem', 'unavailable', null],
  ['141-148', 'B', [144], 'tandem', 'unavailable', null],
  ['141-148', 'B', [145], 'tandem', 'unavailable', null],
  ['141-148', 'B', [146], 'tandem', 'unavailable', null],
  ['141-148', 'B', [147], 'tandem', 'unavailable', null],
  ['141-148', 'B', [148], 'tandem', 'unavailable', null],
  ['141-148', 'A', [144], 'tandem', 'unavailable', null],
  ['141-148', 'A', [145], 'tandem', 'unavailable', null],
  ['141-148', 'A', [146], 'tandem', 'unavailable', null],
  ['141-148', 'A', [147], 'tandem', 'unavailable', null],
  ['141-148', 'A', [148], 'tandem', 'unavailable', null],
  ['149-153', 'G', [149, 150], 'deluxe', 'available', '$10,6?5'],
  ['149-153', 'G', [151], 'single', 'unavailable', null],
  ['149-153', 'G', [152], 'single', 'unavailable', null],
  ['149-153', 'G', [153], 'single', 'unavailable', null],
  ['149-153', 'F', [149, 150], 'deluxe', 'available', '$2?,0?5'],
  ['149-153', 'F', [151], 'single', 'unavailable', null],
  ['149-153', 'F', [152], 'single', 'unavailable', null],
  ['149-153', 'F', [153], 'single', 'unavailable', null],
  ['149-153', 'E', [149, 150], 'deluxe', 'available', '$20,5?5'],
  ['149-153', 'E', [151], 'single', 'unavailable', null],
  ['149-153', 'E', [152], 'single', 'unavailable', null],
  ['149-153', 'E', [153], 'single', 'unavailable', null],
  ['149-153', 'D', [149, 150], 'deluxe', 'unavailable', null],
  ['149-153', 'D', [151], 'single', 'unavailable', null],
  ['149-153', 'D', [152], 'single', 'unavailable', null],
  ['149-153', 'D', [153], 'single', 'unavailable', null],
  ['149-153', 'C', [149, 150], 'deluxe', 'unavailable', null],
  ['149-153', 'C', [151], 'single', 'unavailable', null],
  ['149-153', 'C', [152], 'single', 'unavailable', null],
  ['149-153', 'C', [153], 'single', 'unavailable', null],
  ['149-153', 'B', [149, 150], 'deluxe', 'unavailable', null],
  ['149-153', 'B', [151], 'single', 'unavailable', null],
  ['149-153', 'B', [152], 'single', 'unavailable', null],
  ['149-153', 'B', [153], 'single', 'unavailable', null],
  ['149-153', 'A', [149, 150], 'deluxe', 'unavailable', null],
  ['149-153', 'A', [151], 'single', 'unavailable', null],
  ['149-153', 'A', [152], 'single', 'unavailable', null],
  ['149-153', 'A', [153], 'single', 'unavailable', null],
  ['154-158', 'G', [154], 'single', 'unavailable', null],
  ['154-158', 'G', [155], 'single', 'unavailable', null],
  ['154-158', 'G', [156], 'single', 'unavailable', null],
  ['154-158', 'G', [157, 158], 'deluxe', 'unavailable', null],
  ['154-158', 'F', [154], 'single', 'unavailable', null],
  ['154-158', 'F', [155], 'single', 'unavailable', null],
  ['154-158', 'F', [156], 'single', 'unavailable', null],
  ['154-158', 'F', [157, 158], 'deluxe', 'unavailable', null],
  ['154-158', 'E', [154], 'single', 'unavailable', null],
  ['154-158', 'E', [155], 'single', 'unavailable', null],
  ['154-158', 'E', [156], 'single', 'unavailable', null],
  ['154-158', 'E', [157, 158], 'deluxe', 'available', '$20,5?5'],
  ['154-158', 'D', [154], 'single', 'unavailable', null],
  ['154-158', 'D', [155], 'single', 'unavailable', null],
  ['154-158', 'D', [156], 'single', 'unavailable', null],
  ['154-158', 'D', [157, 158], 'deluxe', 'unavailable', null],
  ['154-158', 'C', [154], 'single', 'unavailable', null],
  ['154-158', 'C', [155], 'single', 'unavailable', null],
  ['154-158', 'C', [156], 'single', 'unavailable', null],
  ['154-158', 'C', [157, 158], 'deluxe', 'unavailable', null],
  ['154-158', 'B', [154], 'single', 'unavailable', null],
  ['154-158', 'B', [155], 'single', 'unavailable', null],
  ['154-158', 'B', [156], 'single', 'unavailable', null],
  ['154-158', 'B', [157, 158], 'deluxe', 'unavailable', null],
  ['154-158', 'A', [154], 'single', 'unavailable', null],
  ['154-158', 'A', [155], 'single', 'unavailable', null],
  ['154-158', 'A', [156], 'single', 'unavailable', null],
  ['154-158', 'A', [157, 158], 'deluxe', 'unavailable', null],
  ['159-167', 'G', [159], 'tandem', 'unavailable', null],
  ['159-167', 'G', [160], 'tandem', 'unavailable', null],
  ['159-167', 'G', [161], 'tandem', 'unavailable', null],
  ['159-167', 'G', [162], 'tandem', 'unavailable', null],
  ['159-167', 'G', [163], 'tandem', 'unavailable', null],
  ['159-167', 'G', [164], 'tandem', 'unavailable', null],
  ['159-167', 'G', [165], 'tandem', 'unavailable', null],
  ['159-167', 'G', [166], 'tandem', 'unavailable', null],
  ['159-167', 'G', [167], 'tandem', 'unavailable', null],
  ['159-167', 'F', [159], 'tandem', 'unavailable', null],
  ['159-167', 'F', [160], 'tandem', 'unavailable', null],
  ['159-167', 'F', [161], 'tandem', 'unavailable', null],
  ['159-167', 'F', [162], 'tandem', 'unavailable', null],
  ['159-167', 'F', [163], 'tandem', 'unavailable', null],
  ['159-167', 'F', [164], 'tandem', 'unavailable', null],
  ['159-167', 'F', [165], 'tandem', 'unavailable', null],
  ['159-167', 'F', [166], 'tandem', 'unavailable', null],
  ['159-167', 'F', [167], 'tandem', 'unavailable', null],
  ['159-167', 'E', [159], 'tandem', 'unavailable', null],
  ['159-167', 'E', [160], 'tandem', 'unavailable', null],
  ['159-167', 'E', [161], 'tandem', 'unavailable', null],
  ['159-167', 'E', [162], 'tandem', 'unavailable', null],
  ['159-167', 'E', [163], 'tandem', 'unavailable', null],
  ['159-167', 'E', [164], 'tandem', 'unavailable', null],
  ['159-167', 'E', [165], 'tandem', 'unavailable', null],
  ['159-167', 'E', [166], 'tandem', 'unavailable', null],
  ['159-167', 'E', [167], 'tandem', 'unavailable', null],
  ['159-167', 'D', [159], 'tandem', 'unavailable', null],
  ['159-167', 'D', [160], 'tandem', 'unavailable', null],
  ['159-167', 'D', [161], 'tandem', 'unavailable', null],
  ['159-167', 'D', [162], 'tandem', 'unavailable', null],
  ['159-167', 'D', [163], 'tandem', 'unavailable', null],
  ['159-167', 'D', [164], 'tandem', 'unavailable', null],
  ['159-167', 'D', [165], 'tandem', 'unavailable', null],
  ['159-167', 'D', [166], 'tandem', 'unavailable', null],
  ['159-167', 'D', [167], 'tandem', 'unavailable', null],
  ['159-167', 'C', [159], 'tandem', 'unavailable', null],
  ['159-167', 'C', [160], 'tandem', 'unavailable', null],
  ['159-167', 'C', [161], 'tandem', 'unavailable', null],
  ['159-167', 'C', [162], 'tandem', 'unavailable', null],
  ['159-167', 'C', [163], 'tandem', 'unavailable', null],
  ['159-167', 'C', [164], 'tandem', 'unavailable', null],
  ['159-167', 'C', [165], 'tandem', 'unavailable', null],
  ['159-167', 'C', [166], 'tandem', 'unavailable', null],
  ['159-167', 'C', [167], 'tandem', 'unavailable', null],
  ['159-167', 'B', [159], 'tandem', 'unavailable', null],
  ['159-167', 'B', [160], 'tandem', 'unavailable', null],
  ['159-167', 'B', [161], 'tandem', 'unavailable', null],
  ['159-167', 'B', [162], 'tandem', 'unavailable', null],
  ['159-167', 'B', [163], 'tandem', 'unavailable', null],
  ['159-167', 'B', [164], 'tandem', 'unavailable', null],
  ['159-167', 'B', [165], 'tandem', 'unavailable', null],
  ['159-167', 'B', [166], 'tandem', 'unavailable', null],
  ['159-167', 'B', [167], 'tandem', 'unavailable', null],
  ['159-167', 'A', [159], 'tandem', 'unavailable', null],
  ['159-167', 'A', [160], 'tandem', 'unavailable', null],
  ['159-167', 'A', [161], 'tandem', 'unavailable', null],
  ['159-167', 'A', [162], 'tandem', 'unavailable', null],
  ['159-167', 'A', [163], 'tandem', 'unavailable', null],
  ['159-167', 'A', [164], 'tandem', 'unavailable', null],
  ['159-167', 'A', [165], 'tandem', 'unavailable', null],
  ['159-167', 'A', [166], 'tandem', 'unavailable', null],
  ['159-167', 'A', [167], 'tandem', 'unavailable', null],
  ['168-172', 'G', [168], 'single', 'unavailable', null],
  ['168-172', 'G', [169], 'single', 'unavailable', null],
  ['168-172', 'G', [170], 'single', 'unavailable', null],
  ['168-172', 'G', [171], 'single', 'unavailable', null],
  ['168-172', 'G', [172], 'single', 'unavailable', null],
  ['168-172', 'F', [168], 'single', 'unavailable', null],
  ['168-172', 'F', [169], 'single', 'unavailable', null],
  ['168-172', 'F', [170], 'single', 'unavailable', null],
  ['168-172', 'F', [171], 'single', 'unavailable', null],
  ['168-172', 'F', [172], 'single', 'unavailable', null],
  ['168-172', 'E', [168], 'single', 'unavailable', null],
  ['168-172', 'E', [169], 'single', 'unavailable', null],
  ['168-172', 'E', [170], 'single', 'unavailable', null],
  ['168-172', 'E', [171], 'single', 'unavailable', null],
  ['168-172', 'E', [172], 'single', 'unavailable', null],
  ['168-172', 'D', [168], 'single', 'unavailable', null],
  ['168-172', 'D', [169], 'single', 'unavailable', null],
  ['168-172', 'D', [170], 'single', 'unavailable', null],
  ['168-172', 'D', [171], 'single', 'unavailable', null],
  ['168-172', 'D', [172], 'single', 'unavailable', null],
  ['168-172', 'C', [168], 'single', 'unavailable', null],
  ['168-172', 'C', [169], 'single', 'unavailable', null],
  ['168-172', 'C', [170], 'single', 'unavailable', null],
  ['168-172', 'C', [171], 'single', 'unavailable', null],
  ['168-172', 'C', [172], 'single', 'unavailable', null],
  ['168-172', 'B', [168], 'single', 'unavailable', null],
  ['168-172', 'B', [169], 'single', 'unavailable', null],
  ['168-172', 'B', [170], 'single', 'unavailable', null],
  ['168-172', 'B', [171], 'single', 'unavailable', null],
  ['168-172', 'B', [172], 'single', 'unavailable', null],
  ['168-172', 'A', [168], 'single', 'unavailable', null],
  ['168-172', 'A', [169], 'single', 'unavailable', null],
  ['168-172', 'A', [170], 'single', 'unavailable', null],
  ['168-172', 'A', [171], 'single', 'unavailable', null],
  ['168-172', 'A', [172], 'single', 'unavailable', null],
  ['173-178', 'G', [173], 'tandem', 'unavailable', null],
  ['173-178', 'G', [174], 'tandem', 'unavailable', null],
  ['173-178', 'G', [175], 'tandem', 'unavailable', null],
  ['173-178', 'G', [176], 'tandem', 'unavailable', null],
  ['173-178', 'G', [177], 'tandem', 'unavailable', null],
  ['173-178', 'G', [178], 'tandem', 'unavailable', null],
  ['173-178', 'F', [173], 'tandem', 'unavailable', null],
  ['173-178', 'F', [174], 'tandem', 'unavailable', null],
  ['173-178', 'F', [175], 'tandem', 'unavailable', null],
  ['173-178', 'F', [176], 'tandem', 'unavailable', null],
  ['173-178', 'F', [177], 'tandem', 'unavailable', null],
  ['173-178', 'F', [178], 'tandem', 'unavailable', null],
  ['173-178', 'E', [173], 'tandem', 'unavailable', null],
  ['173-178', 'E', [174], 'tandem', 'unavailable', null],
  ['173-178', 'E', [175], 'tandem', 'unavailable', null],
  ['173-178', 'E', [176], 'tandem', 'unavailable', null],
  ['173-178', 'E', [177], 'tandem', 'unavailable', null],
  ['173-178', 'E', [178], 'tandem', 'unavailable', null],
  ['173-178', 'D', [173], 'tandem', 'unavailable', null],
  ['173-178', 'D', [174], 'tandem', 'unavailable', null],
  ['173-178', 'D', [175], 'tandem', 'unavailable', null],
  ['173-178', 'D', [176], 'tandem', 'unavailable', null],
  ['173-178', 'D', [177], 'tandem', 'unavailable', null],
  ['173-178', 'D', [178], 'tandem', 'unavailable', null],
  ['173-178', 'C', [173], 'tandem', 'unavailable', null],
  ['173-178', 'C', [174], 'tandem', 'unavailable', null],
  ['173-178', 'C', [175], 'tandem', 'unavailable', null],
  ['173-178', 'C', [176], 'tandem', 'unavailable', null],
  ['173-178', 'C', [177], 'tandem', 'unavailable', null],
  ['173-178', 'C', [178], 'tandem', 'unavailable', null],
  ['173-178', 'B', [173], 'tandem', 'unavailable', null],
  ['173-178', 'B', [174], 'tandem', 'unavailable', null],
  ['173-178', 'B', [175], 'tandem', 'unavailable', null],
  ['173-178', 'B', [176], 'tandem', 'unavailable', null],
  ['173-178', 'B', [177], 'tandem', 'unavailable', null],
  ['173-178', 'B', [178], 'tandem', 'unavailable', null],
  ['173-178', 'A', [173], 'tandem', 'unavailable', null],
  ['173-178', 'A', [174], 'tandem', 'unavailable', null],
  ['173-178', 'A', [175], 'tandem', 'unavailable', null],
  ['173-178', 'A', [176], 'tandem', 'unavailable', null],
  ['173-178', 'A', [177], 'tandem', 'unavailable', null],
  ['173-178', 'A', [178], 'tandem', 'unavailable', null],
  ['179-184', 'G', [179, 180], 'hidden', 'available', '$?????'],
  ['179-184', 'G', [181], 'single', 'unavailable', null],
  ['179-184', 'G', [182], 'single', 'unavailable', null],
  ['179-184', 'G', [183, 184], 'hidden', 'available', '$?????'],
  ['179-184', 'F', [179, 180], 'hidden', 'available', '$?????'],
  ['179-184', 'F', [181], 'single', 'unavailable', null],
  ['179-184', 'F', [182], 'single', 'unavailable', null],
  ['179-184', 'F', [183, 184], 'hidden', 'available', '$?????'],
  ['179-184', 'E', [179, 180], 'hidden', 'available', '$?????'],
  ['179-184', 'E', [181], 'single', 'unavailable', null],
  ['179-184', 'E', [182], 'single', 'unavailable', null],
  ['179-184', 'E', [183, 184], 'hidden', 'available', '$?????'],
  ['179-184', 'D', [179, 180], 'hidden', 'available', '$?????'],
  ['179-184', 'D', [181], 'single', 'unavailable', null],
  ['179-184', 'D', [182], 'single', 'unavailable', null],
  ['179-184', 'D', [183, 184], 'hidden', 'available', '$?????'],
  ['179-184', 'C', [179, 180], 'hidden', 'unavailable', null],
  ['179-184', 'C', [181], 'single', 'unavailable', null],
  ['179-184', 'C', [182], 'single', 'unavailable', null],
  ['179-184', 'C', [183, 184], 'hidden', 'unavailable', null],
  ['179-184', 'B', [179, 180], 'hidden', 'unavailable', null],
  ['179-184', 'B', [181], 'single', 'unavailable', null],
  ['179-184', 'B', [182], 'single', 'unavailable', null],
  ['179-184', 'B', [183, 184], 'hidden', 'unavailable', null],
  ['179-184', 'A', [179, 180], 'hidden', 'unavailable', null],
  ['179-184', 'A', [181], 'single', 'unavailable', null],
  ['179-184', 'A', [182], 'single', 'unavailable', null],
  ['179-184', 'A', [183, 184], 'hidden', 'available', '$?????'],
  ['185-191', 'G', [185], 'tandem', 'unavailable', null],
  ['185-191', 'G', [186], 'tandem', 'unavailable', null],
  ['185-191', 'G', [187], 'tandem', 'unavailable', null],
  ['185-191', 'G', [188], 'tandem', 'unavailable', null],
  ['185-191', 'G', [189], 'tandem', 'unavailable', null],
  ['185-191', 'G', [190], 'tandem', 'unavailable', null],
  ['185-191', 'G', [191], 'tandem', 'unavailable', null],
  ['185-191', 'F', [185], 'tandem', 'unavailable', null],
  ['185-191', 'F', [186], 'tandem', 'unavailable', null],
  ['185-191', 'F', [187], 'tandem', 'unavailable', null],
  ['185-191', 'F', [188], 'tandem', 'unavailable', null],
  ['185-191', 'F', [189], 'tandem', 'unavailable', null],
  ['185-191', 'F', [190], 'tandem', 'unavailable', null],
  ['185-191', 'F', [191], 'tandem', 'unavailable', null],
  ['185-191', 'E', [185], 'tandem', 'unavailable', null],
  ['185-191', 'E', [186], 'tandem', 'unavailable', null],
  ['185-191', 'E', [187], 'tandem', 'unavailable', null],
  ['185-191', 'E', [188], 'tandem', 'unavailable', null],
  ['185-191', 'E', [189], 'tandem', 'unavailable', null],
  ['185-191', 'E', [190], 'tandem', 'unavailable', null],
  ['185-191', 'E', [191], 'tandem', 'unavailable', null],
  ['185-191', 'D', [185], 'tandem', 'unavailable', null],
  ['185-191', 'D', [186], 'tandem', 'unavailable', null],
  ['185-191', 'D', [187], 'tandem', 'unavailable', null],
  ['185-191', 'D', [188], 'tandem', 'unavailable', null],
  ['185-191', 'D', [189], 'tandem', 'unavailable', null],
  ['185-191', 'D', [190], 'tandem', 'unavailable', null],
  ['185-191', 'D', [191], 'tandem', 'unavailable', null],
  ['185-191', 'C', [185], 'tandem', 'unavailable', null],
  ['185-191', 'C', [186], 'tandem', 'unavailable', null],
  ['185-191', 'C', [187], 'tandem', 'unavailable', null],
  ['185-191', 'C', [188], 'tandem', 'unavailable', null],
  ['185-191', 'C', [189], 'tandem', 'unavailable', null],
  ['185-191', 'C', [190], 'tandem', 'unavailable', null],
  ['185-191', 'C', [191], 'tandem', 'unavailable', null],
  ['185-191', 'B', [185], 'tandem', 'unavailable', null],
  ['185-191', 'B', [186], 'tandem', 'unavailable', null],
  ['185-191', 'B', [187], 'tandem', 'unavailable', null],
  ['185-191', 'B', [188], 'tandem', 'unavailable', null],
  ['185-191', 'B', [189], 'tandem', 'unavailable', null],
  ['185-191', 'B', [190], 'tandem', 'unavailable', null],
  ['185-191', 'B', [191], 'tandem', 'unavailable', null],
  ['185-191', 'A', [185], 'tandem', 'unavailable', null],
  ['185-191', 'A', [186], 'tandem', 'unavailable', null],
  ['185-191', 'A', [187], 'tandem', 'unavailable', null],
  ['185-191', 'A', [188], 'tandem', 'unavailable', null],
  ['185-191', 'A', [189], 'tandem', 'unavailable', null],
  ['185-191', 'A', [190], 'tandem', 'unavailable', null],
  ['185-191', 'A', [191], 'tandem', 'unavailable', null],
  ['192-193', 'G', [192], 'single', 'unavailable', null],
  ['192-193', 'G', [193], 'single', 'unavailable', null],
  ['192-193', 'F', [192], 'single', 'unavailable', null],
  ['192-193', 'F', [193], 'single', 'unavailable', null],
  ['192-193', 'E', [192], 'single', 'unavailable', null],
  ['192-193', 'E', [193], 'single', 'unavailable', null],
  ['192-193', 'D', [192], 'single', 'unavailable', null],
  ['192-193', 'D', [193], 'single', 'unavailable', null],
  ['192-193', 'C', [192], 'single', 'unavailable', null],
  ['192-193', 'C', [193], 'single', 'unavailable', null],
  ['192-193', 'B', [192], 'single', 'unavailable', null],
  ['192-193', 'B', [193], 'single', 'unavailable', null],
  ['192-193', 'A', [192], 'single', 'unavailable', null],
  ['192-193', 'A', [193], 'single', 'unavailable', null],
  ['194-200', 'G', [194], 'single', 'unavailable', null],
  ['194-200', 'G', [195, 196], 'deluxe', 'available', '$20,5?5'],
  ['194-200', 'G', [197], 'single', 'unavailable', null],
  ['194-200', 'G', [198, 199], 'deluxe', 'available', '$20,5?5'],
  ['194-200', 'G', [200], 'single', 'unavailable', null],
  ['194-200', 'F', [194], 'single', 'unavailable', null],
  ['194-200', 'F', [195, 196], 'deluxe', 'available', '$?2,??5'],
  ['194-200', 'F', [197], 'single', 'unavailable', null],
  ['194-200', 'F', [198, 199], 'deluxe', 'available', '$?2,??5'],
  ['194-200', 'F', [200], 'single', 'unavailable', null],
  ['194-200', 'E', [194], 'single', 'unavailable', null],
  ['194-200', 'E', [195, 196], 'deluxe', 'available', '$?0,??5'],
  ['194-200', 'E', [197], 'single', 'unavailable', null],
  ['194-200', 'E', [198, 199], 'deluxe', 'unavailable', null],
  ['194-200', 'E', [200], 'single', 'unavailable', null],
  ['194-200', 'D', [194], 'single', 'unavailable', null],
  ['194-200', 'D', [195, 196], 'deluxe', 'unavailable', null],
  ['194-200', 'D', [197], 'single', 'unavailable', null],
  ['194-200', 'D', [198, 199], 'deluxe', 'available', '$??,??5'],
  ['194-200', 'D', [200], 'single', 'unavailable', null],
  ['194-200', 'C', [194], 'single', 'unavailable', null],
  ['194-200', 'C', [195, 196], 'deluxe', 'unavailable', null],
  ['194-200', 'C', [197], 'single', 'unavailable', null],
  ['194-200', 'C', [198, 199], 'deluxe', 'unavailable', null],
  ['194-200', 'C', [200], 'single', 'unavailable', null],
  ['194-200', 'B', [194], 'single', 'unavailable', null],
  ['194-200', 'B', [195, 196], 'deluxe', 'unavailable', null],
  ['194-200', 'B', [197], 'single', 'unavailable', null],
  ['194-200', 'B', [198, 199], 'deluxe', 'unavailable', null],
  ['194-200', 'B', [200], 'single', 'unavailable', null],
  ['194-200', 'A', [194], 'single', 'unavailable', null],
  ['194-200', 'A', [195, 196], 'deluxe', 'available', '$??,??5'],
  ['194-200', 'A', [197], 'single', 'unavailable', null],
  ['194-200', 'A', [198, 199], 'deluxe', 'available', '$??,??5'],
  ['194-200', 'A', [200], 'single', 'unavailable', null],
  ['201-212', 'G', [201], 'tandem', 'unavailable', null],
  ['201-212', 'G', [202], 'tandem', 'unavailable', null],
  ['201-212', 'G', [203], 'tandem', 'unavailable', null],
  ['201-212', 'G', [204], 'tandem', 'unavailable', null],
  ['201-212', 'G', [205], 'single', 'unavailable', null],
  ['201-212', 'G', [206, 207], 'deluxe', 'available', '$26,??5'],
  ['201-212', 'G', [208], 'single', 'unavailable', null],
  ['201-212', 'G', [209], 'tandem', 'unavailable', null],
  ['201-212', 'G', [210], 'tandem', 'unavailable', null],
  ['201-212', 'G', [211], 'tandem', 'unavailable', null],
  ['201-212', 'G', [212], 'tandem', 'unavailable', null],
  ['201-212', 'F', [201], 'tandem', 'unavailable', null],
  ['201-212', 'F', [202], 'tandem', 'unavailable', null],
  ['201-212', 'F', [203], 'tandem', 'unavailable', null],
  ['201-212', 'F', [204], 'tandem', 'unavailable', null],
  ['201-212', 'F', [205], 'single', 'unavailable', null],
  ['201-212', 'F', [206, 207], 'deluxe', 'available', '$?0,7?5'],
  ['201-212', 'F', [208], 'single', 'unavailable', null],
  ['201-212', 'F', [209], 'tandem', 'unavailable', null],
  ['201-212', 'F', [210], 'tandem', 'unavailable', null],
  ['201-212', 'F', [211], 'tandem', 'unavailable', null],
  ['201-212', 'F', [212], 'tandem', 'unavailable', null],
  ['201-212', 'E', [201], 'tandem', 'unavailable', null],
  ['201-212', 'E', [202], 'tandem', 'unavailable', null],
  ['201-212', 'E', [203], 'tandem', 'unavailable', null],
  ['201-212', 'E', [204], 'tandem', 'unavailable', null],
  ['201-212', 'E', [205], 'single', 'unavailable', null],
  ['201-212', 'E', [206, 207], 'deluxe', 'available', '$?6,2?5'],
  ['201-212', 'E', [208], 'single', 'unavailable', null],
  ['201-212', 'E', [209], 'tandem', 'unavailable', null],
  ['201-212', 'E', [210], 'tandem', 'unavailable', null],
  ['201-212', 'E', [211], 'tandem', 'unavailable', null],
  ['201-212', 'E', [212], 'tandem', 'unavailable', null],
  ['201-212', 'D', [201], 'tandem', 'unavailable', null],
  ['201-212', 'D', [202], 'tandem', 'unavailable', null],
  ['201-212', 'D', [203], 'tandem', 'unavailable', null],
  ['201-212', 'D', [204], 'tandem', 'unavailable', null],
  ['201-212', 'D', [205], 'single', 'unavailable', null],
  ['201-212', 'D', [206, 207], 'deluxe', 'unavailable', null],
  ['201-212', 'D', [208], 'single', 'unavailable', null],
  ['201-212', 'D', [209], 'tandem', 'unavailable', null],
  ['201-212', 'D', [210], 'tandem', 'unavailable', null],
  ['201-212', 'D', [211], 'tandem', 'unavailable', null],
  ['201-212', 'D', [212], 'tandem', 'unavailable', null],
  ['201-212', 'C', [201], 'tandem', 'unavailable', null],
  ['201-212', 'C', [202], 'tandem', 'unavailable', null],
  ['201-212', 'C', [203], 'tandem', 'unavailable', null],
  ['201-212', 'C', [204], 'tandem', 'unavailable', null],
  ['201-212', 'C', [205], 'single', 'unavailable', null],
  ['201-212', 'C', [206, 207], 'deluxe', 'unavailable', null],
  ['201-212', 'C', [208], 'single', 'unavailable', null],
  ['201-212', 'C', [209], 'tandem', 'unavailable', null],
  ['201-212', 'C', [210], 'tandem', 'unavailable', null],
  ['201-212', 'C', [211], 'tandem', 'unavailable', null],
  ['201-212', 'C', [212], 'tandem', 'unavailable', null],
  ['201-212', 'B', [201], 'tandem', 'unavailable', null],
  ['201-212', 'B', [202], 'tandem', 'unavailable', null],
  ['201-212', 'B', [203], 'tandem', 'unavailable', null],
  ['201-212', 'B', [204], 'tandem', 'unavailable', null],
  ['201-212', 'B', [205], 'single', 'unavailable', null],
  ['201-212', 'B', [206, 207], 'deluxe', 'unavailable', null],
  ['201-212', 'B', [208], 'single', 'unavailable', null],
  ['201-212', 'B', [209], 'tandem', 'unavailable', null],
  ['201-212', 'B', [210], 'tandem', 'unavailable', null],
  ['201-212', 'B', [211], 'tandem', 'unavailable', null],
  ['201-212', 'B', [212], 'tandem', 'unavailable', null],
  ['201-212', 'A', [201], 'tandem', 'unavailable', null],
  ['201-212', 'A', [202], 'tandem', 'unavailable', null],
  ['201-212', 'A', [203], 'tandem', 'unavailable', null],
  ['201-212', 'A', [204], 'tandem', 'unavailable', null],
  ['201-212', 'A', [205], 'single', 'unavailable', null],
  ['201-212', 'A', [206, 207], 'deluxe', 'unavailable', null],
  ['201-212', 'A', [208], 'single', 'unavailable', null],
  ['201-212', 'A', [209], 'tandem', 'unavailable', null],
  ['201-212', 'A', [210], 'tandem', 'unavailable', null],
  ['201-212', 'A', [211], 'tandem', 'unavailable', null],
  ['201-212', 'A', [212], 'tandem', 'unavailable', null],
  ['213-219', 'G', [213], 'single', 'unavailable', null],
  ['213-219', 'G', [214, 215], 'deluxe', 'available', '$10,6?5'],
  ['213-219', 'G', [216], 'single', 'unavailable', null],
  ['213-219', 'G', [217, 218], 'deluxe', 'available', '$10,6?5'],
  ['213-219', 'G', [219], 'single', 'unavailable', null],
  ['213-219', 'F', [213], 'single', 'unavailable', null],
  ['213-219', 'F', [214, 215], 'deluxe', 'available', '$1?,?55'],
  ['213-219', 'F', [216], 'single', 'unavailable', null],
  ['213-219', 'F', [217, 218], 'deluxe', 'available', '$1?,?55'],
  ['213-219', 'F', [219], 'single', 'unavailable', null],
  ['213-219', 'E', [213], 'single', 'unavailable', null],
  ['213-219', 'E', [214, 215], 'deluxe', 'available', '$2?,0?5'],
  ['213-219', 'E', [216], 'single', 'unavailable', null],
  ['213-219', 'E', [217, 218], 'deluxe', 'available', '$2?,0?5'],
  ['213-219', 'E', [219], 'single', 'unavailable', null],
  ['213-219', 'D', [213], 'single', 'unavailable', null],
  ['213-219', 'D', [214, 215], 'deluxe', 'unavailable', null],
  ['213-219', 'D', [216], 'single', 'unavailable', null],
  ['213-219', 'D', [217, 218], 'deluxe', 'available', '$?0,7?5'],
  ['213-219', 'D', [219], 'single', 'unavailable', null],
  ['213-219', 'C', [213], 'single', 'unavailable', null],
  ['213-219', 'C', [214, 215], 'deluxe', 'unavailable', null],
  ['213-219', 'C', [216], 'single', 'unavailable', null],
  ['213-219', 'C', [217, 218], 'deluxe', 'unavailable', null],
  ['213-219', 'C', [219], 'single', 'unavailable', null],
  ['213-219', 'B', [213], 'single', 'unavailable', null],
  ['213-219', 'B', [214, 215], 'deluxe', 'unavailable', null],
  ['213-219', 'B', [216], 'single', 'unavailable', null],
  ['213-219', 'B', [217, 218], 'deluxe', 'unavailable', null],
  ['213-219', 'B', [219], 'single', 'unavailable', null],
  ['213-219', 'A', [213], 'single', 'unavailable', null],
  ['213-219', 'A', [214, 215], 'deluxe', 'unavailable', null],
  ['213-219', 'A', [216], 'single', 'unavailable', null],
  ['213-219', 'A', [217, 218], 'deluxe', 'unavailable', null],
  ['213-219', 'A', [219], 'single', 'unavailable', null],
  ['220-231', 'G', [220], 'single', 'unavailable', null],
  ['220-231', 'G', [221, 222], 'deluxe', 'available', '$26,??5'],
  ['220-231', 'G', [223], 'single', 'unavailable', null],
  ['220-231', 'G', [224], 'tandem', 'unavailable', null],
  ['220-231', 'G', [225], 'tandem', 'unavailable', null],
  ['220-231', 'G', [226], 'tandem', 'unavailable', null],
  ['220-231', 'G', [227], 'tandem', 'unavailable', null],
  ['220-231', 'G', [228], 'single', 'unavailable', null],
  ['220-231', 'G', [229, 230], 'deluxe', 'available', '$26,??5'],
  ['220-231', 'G', [231], 'single', 'unavailable', null],
  ['220-231', 'F', [220], 'single', 'unavailable', null],
  ['220-231', 'F', [221, 222], 'deluxe', 'available', '$?0,7?5'],
  ['220-231', 'F', [223], 'single', 'unavailable', null],
  ['220-231', 'F', [224], 'tandem', 'unavailable', null],
  ['220-231', 'F', [225], 'tandem', 'unavailable', null],
  ['220-231', 'F', [226], 'tandem', 'unavailable', null],
  ['220-231', 'F', [227], 'tandem', 'unavailable', null],
  ['220-231', 'F', [228], 'single', 'unavailable', null],
  ['220-231', 'F', [229, 230], 'deluxe', 'available', '$?0,7?5'],
  ['220-231', 'F', [231], 'single', 'unavailable', null],
  ['220-231', 'E', [220], 'single', 'unavailable', null],
  ['220-231', 'E', [221, 222], 'deluxe', 'available', '$?6,2?5'],
  ['220-231', 'E', [223], 'single', 'unavailable', null],
  ['220-231', 'E', [224], 'tandem', 'unavailable', null],
  ['220-231', 'E', [225], 'tandem', 'unavailable', null],
  ['220-231', 'E', [226], 'tandem', 'unavailable', null],
  ['220-231', 'E', [227], 'tandem', 'unavailable', null],
  ['220-231', 'E', [228], 'single', 'unavailable', null],
  ['220-231', 'E', [229, 230], 'deluxe', 'unavailable', null],
  ['220-231', 'E', [231], 'single', 'unavailable', null],
  ['220-231', 'D', [220], 'single', 'unavailable', null],
  ['220-231', 'D', [221, 222], 'deluxe', 'unavailable', null],
  ['220-231', 'D', [223], 'single', 'unavailable', null],
  ['220-231', 'D', [224], 'tandem', 'unavailable', null],
  ['220-231', 'D', [225], 'tandem', 'unavailable', null],
  ['220-231', 'D', [226], 'tandem', 'unavailable', null],
  ['220-231', 'D', [227], 'tandem', 'unavailable', null],
  ['220-231', 'D', [228], 'single', 'unavailable', null],
  ['220-231', 'D', [229, 230], 'deluxe', 'unavailable', null],
  ['220-231', 'D', [231], 'single', 'unavailable', null],
  ['220-231', 'C', [220], 'single', 'unavailable', null],
  ['220-231', 'C', [221, 222], 'deluxe', 'unavailable', null],
  ['220-231', 'C', [223], 'single', 'unavailable', null],
  ['220-231', 'C', [224], 'tandem', 'unavailable', null],
  ['220-231', 'C', [225], 'tandem', 'unavailable', null],
  ['220-231', 'C', [226], 'tandem', 'unavailable', null],
  ['220-231', 'C', [227], 'tandem', 'unavailable', null],
  ['220-231', 'C', [228], 'single', 'unavailable', null],
  ['220-231', 'C', [229, 230], 'deluxe', 'unavailable', null],
  ['220-231', 'C', [231], 'single', 'unavailable', null],
  ['220-231', 'B', [220], 'single', 'unavailable', null],
  ['220-231', 'B', [221, 222], 'deluxe', 'unavailable', null],
  ['220-231', 'B', [223], 'single', 'unavailable', null],
  ['220-231', 'B', [224], 'tandem', 'unavailable', null],
  ['220-231', 'B', [225], 'tandem', 'unavailable', null],
  ['220-231', 'B', [226], 'tandem', 'unavailable', null],
  ['220-231', 'B', [227], 'tandem', 'unavailable', null],
  ['220-231', 'B', [228], 'single', 'unavailable', null],
  ['220-231', 'B', [229, 230], 'deluxe', 'unavailable', null],
  ['220-231', 'B', [231], 'single', 'unavailable', null],
  ['220-231', 'A', [220], 'single', 'unavailable', null],
  ['220-231', 'A', [221, 222], 'deluxe', 'unavailable', null],
  ['220-231', 'A', [223], 'single', 'unavailable', null],
  ['220-231', 'A', [224], 'tandem', 'unavailable', null],
  ['220-231', 'A', [225], 'tandem', 'unavailable', null],
  ['220-231', 'A', [226], 'tandem', 'unavailable', null],
  ['220-231', 'A', [227], 'tandem', 'unavailable', null],
  ['220-231', 'A', [228], 'single', 'unavailable', null],
  ['220-231', 'A', [229, 230], 'deluxe', 'unavailable', null],
  ['220-231', 'A', [231], 'single', 'unavailable', null],
];

// ── Radiance niche wall (RAD-1-1-ROW-SPACE) ───────────────────────────────────
// Rows K (top) to A (bottom). Cells labelled -1- .. -8- on the sheet.
// Only the two double-height cells (E/D columns 2 and 5) are unambiguously a size
// class — they are the Family niches. Every other cell is legend-only.
export const RAD_ROWS = ['K', 'J', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'];
export const RAD_SIZES = [
  ['Family (2)', '11 7/8" x 30 1/2" x 25 1/2"'],
  ['X-Large (2)', '11 7/8" x 26" x 12 3/4"'],
  ['Large (2)', '11 7/8" x 23" x 12 3/4"'],
  ['Small (2)', '11 7/8" x 18 1/4" x 12 3/4"'],
];
// [row, col, price|null, spanRows|null]
export const RAD_CELLS = [
  ['K', 1, 5495], ['K', 2, 7695], ['K', 3, 5495], ['K', 4, 7695], ['K', 5, 7695], ['K', 6, null], ['K', 7, 7695], ['K', 8, null],
  ['J', 1, 9895], ['J', 2, null], ['J', 3, 9895], ['J', 4, null], ['J', 5, 9895], ['J', 6, 7695], ['J', 7, 9895], ['J', 8, null],
  ['H', 1, 10995], ['H', 2, 12095], ['H', 3, 10995], ['H', 4, 12095], ['H', 5, null], ['H', 6, 10995], ['H', 7, null], ['H', 8, 9895],
  ['G', 1, null], ['G', 2, null], ['G', 3, null], ['G', 4, null], ['G', 5, null], ['G', 6, null], ['G', 7, null], ['G', 8, null],
  ['F', 1, null], ['F', 2, null], ['F', 3, null], ['F', 4, null], ['F', 5, null], ['F', 6, null], ['F', 7, null], ['F', 8, null],
  ['E', 1, null], ['E', 2, null, ['E', 'D']], ['E', 3, null], ['E', 4, null], ['E', 5, null, ['E', 'D']], ['E', 6, null],
  ['D', 1, null], ['D', 3, null], ['D', 4, null], ['D', 6, null],
  ['C', 1, null], ['C', 2, null], ['C', 3, null], ['C', 4, null], ['C', 5, null], ['C', 6, null], ['C', 7, null], ['C', 8, null],
  ['B', 1, null], ['B', 2, null], ['B', 3, null], ['B', 4, null], ['B', 5, null], ['B', 6, null], ['B', 7, null], ['B', 8, null],
  ['A', 1, null], ['A', 2, null], ['A', 3, null], ['A', 4, null], ['A', 5, null], ['A', 6, null], ['A', 7, null], ['A', 8, null],
];

// ── Serenity niche wall (SER-1-1-ROW-SPACE) ───────────────────────────────────
export const SER_ROWS = ['K', 'J', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'];
export const SER_SIZES = [
  ['Large (2)', '10 1/2" x 22 1/8" x 12 3/4"'],
  ['Small (2)', '10 1/2" x 11 1/16" x 12 3/4"'],
];
export const SER_CELLS = [
  ['K', 1, 4395], ['K', 2, null], ['K', 3, null], ['K', 4, null], ['K', 5, 2195], ['K', 6, null],
  ['J', 1, null], ['J', 2, null], ['J', 3, null], ['J', 4, 3850], ['J', 5, 3850], ['J', 6, 6595],
  ['H', 1, 9895], ['H', 2, 9895], ['H', 3, 9895], ['H', 4, null],
  ['G', 1, null], ['G', 2, 16495], ['G', 3, null], ['G', 4, null],
  ['F', 1, null], ['F', 2, null], ['F', 3, null], ['F', 4, null],
  ['E', 1, null], ['E', 2, null], ['E', 3, null], ['E', 4, null],
  ['D', 1, null], ['D', 2, null], ['D', 3, null], ['D', 4, null],
  ['C', 1, null], ['C', 2, null], ['C', 3, null], ['C', 4, null],
  ['B', 1, null], ['B', 2, null], ['B', 3, null], ['B', 4, null], ['B', 5, null], ['B', 6, null],
  ['A', 1, null], ['A', 2, 9895], ['A', 3, null], ['A', 4, null], ['A', 5, null], ['A', 6, null],
];

/**
 * The two glass-front niche walls, REPLACED 2026-07-31.
 *
 * OPERATOR, Map Issues 07.31.26: "The niche walls are not in the right area."
 *
 * Corrected against the CAD plan and the MIS debrief:
 *  - RADIANCE is the magenta block at CAD (110,340)-(255,462), i.e. the far WEST side,
 *    in the bay between bank 111-115's south face and bank 101-110's north end, at the
 *    north-west corner of the chapel. The debrief's "RADIANCE label visible on the far
 *    west side" agrees. It was previously drawn as a thin north-south sliver on the
 *    plan's west margin, detached from the chapel.
 *  - SERENITY is the magenta block at CAD (1355,335)-(1455,440) — immediately NORTH of
 *    the island's north-east corner, on the east passage. The debrief: "SERENITY NICHES
 *    sit between the COM building and the ELM complex." It was previously drawn up
 *    beside the rest rooms, a full building-width north of where MIS draws it.
 *
 * `homeArea` is the area a counselor would walk to in order to stand in front of the
 * wall; the walls stay in the `niches` area for the printed lists so the two glass-front
 * walls still print together.
 *
 * FACING IS ESTIMATED. MIS draws a niche wall as an ELEVATION symbol dropped onto the
 * plan (the debrief says so explicitly for the Crystal Niches), so the symbol's
 * footprint gives position but not orientation. Each wall is oriented toward the space
 * a visitor stands in; NCOLW (~2 ft a niche column) sets the rendered width.
 */
export const WALLS = {
  RAD: {
    id: 'RAD', name: 'Radiance', prefix: 'RAD-1-1', rows: RAD_ROWS, cells: RAD_CELLS,
    sizes: RAD_SIZES, cols: 8, area: 'niches', homeArea: 'west', stop: 'radiance',
    plan: { x: 6, y: 112, w: 104, h: 20 }, face: 'S',
    note: 'Far west side, in the bay north of bank 101-110 — the north-west corner of the chapel.',
  },
  SER: {
    id: 'SER', name: 'Serenity', prefix: 'SER-1-1', rows: SER_ROWS, cells: SER_CELLS,
    sizes: SER_SIZES, cols: 6, area: 'niches', homeArea: 'island', stop: 'serenity',
    plan: { x: 552, y: 104, w: 20, h: 78 }, face: 'E',
    note: 'East passage, between the Chapel of Memories and the Eternal Light complex, just north of bank 213-219.',
  },
};

// ── Derived helpers ───────────────────────────────────────────────────────────
export const bankById = (id) => BANKS.find((b) => b.id === id);

/** Ref for a crypt unit: COM-1-1-<tier>-<lowest space number>. */
export const cryptRef = (u) => `COM-1-1-${u[1]}-${u[2][0]}`;

export function cryptUnits() {
  return UNITS.map((u) => ({
    bank: u[0], tier: u[1], cols: u[2], type: u[3], st: u[4], sheetRaw: u[5],
    ref: cryptRef(u), p: null,
  }));
}

export function wallNiches(wid) {
  const w = WALLS[wid];
  return w.cells.map((c) => ({
    wall: wid, row: c[0], col: c[1], p: c[2] == null ? null : c[2],
    spanRows: c[3] || null,
    st: c[2] == null ? 'unavailable' : 'available',
    size: c[3] ? 'Family (2)' : null,
    ref: `${w.prefix}-${c[0]}-${c[1]}`,
  }));
}

export function allNiches() {
  return [...wallNiches('RAD'), ...wallNiches('SER')];
}

/** Every crypt SPACE (column x tier), i.e. units expanded over their columns. */
export function cryptSpaces() {
  const out = [];
  for (const u of UNITS) for (const c of u[2]) out.push({ bank: u[0], tier: u[1], col: c, type: u[3], st: u[4] });
  return out;
}
