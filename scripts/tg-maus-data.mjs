/**
 * Terrace Garden Mausoleum — the geometry dataset.
 *
 * Source of truth for MAPS/TG_Mausoleum_Map.html. Edit this file and rebuild with
 * `node scripts/build_tg_maus_map.mjs`; NEVER hand-edit the generated page.
 *
 * ── WHAT THIS SHIP IS ────────────────────────────────────────────────────────
 * GEOMETRY ONLY. Real layout, section labels, bank shapes and cross-links — and NOT ONE
 * price, status or inventory count, because none of those is sourced yet for this
 * building. Every selectable position renders "ask us" wording instead. The empty
 * `price` / `status` slots below are deliberate and are the whole point: when the
 * cemetery's own price and lot-inquiry figures arrive they drop into those slots and the
 * page gains pricing without a redesign.
 *
 * The house conventions are encoded NOW even though nothing carries a status yet, so the
 * later load cannot quietly break them:
 *   - status is coded by PATTERN, never by hue (see STATUS_STYLE);
 *   - a sold or occupied position shows NO price in any rendering;
 *   - dollar figures are exact, never rounded to "$52K".
 *
 * ── SOURCES, IN ORDER OF AUTHORITY ───────────────────────────────────────────
 * 1. The MIS overview drawing for this building, transcribed by the sprint-14 director
 *    from the operator's screen (the on-disk property-card PNGs do not cover it). The
 *    transcription is what MIS_* below records. It is authoritative for LABELS and for
 *    the numbering of the crypt banks.
 * 2. The operator's 8:16 walk-through of the area, filmed 2026-08-03
 *    (D:\Cemetery Photos Misc\Terrace Garden Memorial Path\20260803_120633.mp4) plus the
 *    stills in that folder. Authoritative for WHAT PHYSICALLY EXISTS — the footage beats
 *    the drawing wherever they disagree, which is how the pool came out (see below).
 * 3. scripts/tgmp-data.mjs (sprint-09) for the Memorial Path itself. This map SURROUNDS
 *    that one and links to it; it does not restate it.
 *
 * ── THE POOL IS GONE ─────────────────────────────────────────────────────────
 * The MIS overview still draws a large "Pool" in the middle of the courtyard. There is no
 * pool. The Terrace Garden Memorial Path replaced it — confirmed on 2026-07-31 by the
 * operator ("the path removed the pool entirely"), and confirmed again in the 2026-08-03
 * footage: the courtyard floor is flagstone set in river rock, with bark beds, cremation
 * posts, benches and the glass-front niche bank. The courtyard footprint below is
 * therefore the PATH's footprint, and it is the link zone to MAPS/TGMP_Map.html.
 *
 * ── THE OSSUARY DISCREPANCY (open, needs an operator ruling) ─────────────────
 * MIS draws a "Terrace Garden Ossuary" box just east of the pool. Sprint-09 DELETED the
 * ossuary from the Memorial Path map on inference. But the MIS overview still draws it,
 * and the quote tool sells Terrace Ossuary scattering. Both cannot be right. Until the
 * operator rules, this map renders it as an INERT LABELLED STRUCTURE: it is drawn where
 * MIS draws it, it is named, it is not selectable, and it carries no price and no
 * capacity. Nothing here asserts that it exists — only that the drawing shows it.
 *
 * ── GEOMETRY UNITS ───────────────────────────────────────────────────────────
 * Plan view, FEET. `x` grows east, `y` grows south (down the screen), origin at the
 * centre of the building footprint. Every rectangle is {x, y, w, d} about its own centre.
 * The overall proportions are read off the MIS overview and sanity-checked against the
 * footage; they are ESTIMATES and the page says so. They are good enough to walk a family
 * around the building and wrong enough that nobody should scale a dimension off them.
 */

// ── The MIS transcription, kept verbatim as constants ─────────────────────────
// These are what the drawing says. The gate asserts the dataset against them, so a
// typo in the layout below fails rather than propagating into the page.
export const MIS_WEST_BANKS = [1, 13];        // left wing, numbered 1..13
export const MIS_EAST_BANKS = [14, 28];       // right wing, numbered 14..28 — the upper
                                              // bound is APPROXIMATE in the transcription
                                              // ("~14-28"); see EAST_BOUND_APPROX.
export const EAST_BOUND_APPROX = true;
export const MIS_BANK_LABEL = 'SINGLES / DELUX COMPANION / WESTMINSTER CRYPTS';
export const MIS_TANDEM_LABEL = 'TANDEM CRYPTS (HEAD TO HEAD)';
export const MIS_FAMILY_ROOMS = ['Family Room 1', 'Family Room 2'];

// The crypt kinds the wing banks offer, in the family-facing spelling. MIS prints
// "SINGLES / DELUX COMPANION / WESTMINSTER CRYPTS" in block capitals with its own
// abbreviation; a family reads English.
export const CRYPT_KINDS = ['Single', 'Deluxe companion', 'Westminster'];

// ── The one thing every selectable position says today ────────────────────────
// No price, no status, no count. s11 CONFIRM-chip wording.
export const ASK = 'Ask us for today’s availability and price.';
export const ASK_CHIP = 'Ask us';

// Status vocabulary, defined but UNUSED on this ship. Encoded now so the later load
// inherits the rules instead of reinventing them. Every entry is a PATTERN or a
// brightness, never a hue: hue is reserved for price tiers, which do not exist here yet.
export const STATUS_STYLE = {
  available: { label: 'Available', pattern: 'none' },
  reserved: { label: 'Reserved', pattern: 'hatch' },
  occupied: { label: 'Occupied', pattern: 'solid-dark' },
  sold: { label: 'Sold', pattern: 'hatch' },
  unpriced: { label: 'Not priced — ask us', pattern: 'hatch-dashed' },
};

/** A position is sellable only when it is priced AND available. Nothing is, yet. */
export const sellable = (p) => p.status === 'available' && typeof p.price === 'number';

// ── Footprint (feet) ─────────────────────────────────────────────────────────
export const SITE = {
  label: 'Terrace Garden Mausoleum',
  short: 'TGM',
  w: 240,      // east–west
  d: 120,      // north–south
  // The building is the RIGHTMOST of the three-building complex and is joined westward
  // to the Eternal Light Mausoleum. That neighbour is drawn as an edge, not a link:
  // its own map is another track's work and this page must not point at a page that
  // may not exist.
  westNeighbour: 'Eternal Light Mausoleum',
};

export const GEO = {
  // North face: the two crypt wings and, between them, the family rooms.
  wingY: -47,          // centre line of the wing banks
  wingD: 22,           // how deep a bank reads in plan
  westX0: -114, westX1: -26,
  eastX0: 26, eastX1: 114,
  // Family rooms sit top-centre with a small water feature between them.
  roomY: -45, roomD: 26, roomW: 20, roomGap: 9,
  // The covered walkway ("ROOF LINE" on both wings) in front of the banks.
  roofD: 9,
  // Courtyard = the Terrace Garden Memorial Path footprint. This is the link zone.
  courtX: -22, courtY: 6, courtW: 132, courtD: 52,
  // Ossuary, east of the courtyard, exactly where MIS draws it.
  ossX: 74, ossY: 6, ossW: 26, ossD: 26,
  // South edge: one long tandem-crypt bank.
  tandemY: 50, tandemD: 16, tandemX0: -114, tandemX1: 114,
  // East edge: the entrance and its decorative feature.
  entX: 108, entY: -8, entW: 22, entD: 26,
  // West edge: the joint to the neighbouring mausoleum.
  joinX: -118, joinY: 6, joinW: 12, joinD: 44,
};

// ── ELEVATION (feet, schematic) — added for the 3D view ──────────────────────
/**
 * The plan above is the cemetery's own overview. THESE numbers are not on any drawing:
 * they come from the 2026-08-03 walk-through, and they exist only so the 3D view stands
 * a block at a plausible height instead of an invented one.
 *
 * WHAT THE FOOTAGE ACTUALLY SETTLED, with timestamps into the 8:16 clip:
 *
 *   wingH   7:36 and 6:56 — the wing walls facing the courtyard read FIVE courses of
 *           crypt fronts from the paving to the soffit, with a sixth partly shaded by
 *           the overhang at the far end. The COUNT is what the footage gives. The
 *           2.6 ft per course that turns five courses into thirteen feet is a nominal
 *           crypt-front height and is NOT measured — which is why every wing bank is
 *           marked 'medium' below and why the page prints no dimension anywhere.
 *   roofH   7:36, 6:56, 7:20 (in the reflection) — each wing carries a LOW-PITCHED roof
 *           that slopes down toward the courtyard and overhangs the walkway by a long
 *           way, dark edge over a pale soffit, with downlights set into the soffit. It
 *           is the building's own eave, not a free-standing colonnade. Modelled as a
 *           thin slab floating over the walkway strip.
 *   plinth  7:36 and 6:56 — the courtyard is TERRACED: a low pale wall and two or three
 *           steps separate the walkway in front of the banks from the courtyard floor.
 *           One step is modelled; the full terracing is not.
 *   material 5:04 — the crypt fronts are a polished pink-and-grey speckled stone in
 *           butt-jointed panels with small round bronze rosettes at the corners and
 *           bronze cone vases. Walls above and around them are pale cream stucco.
 *
 * WHAT THE FOOTAGE DID NOT SETTLE, and is therefore marked 'low':
 *   - the tandem bank along the south edge is never walked end to end in the clip;
 *   - the family rooms are shut behind locked ironwork and were not entered, so their
 *     height is inferred from the wall plane they sit in;
 *   - the water feature and the ossuary are never identified on site at all.
 *
 * NO DIMENSION IS EVER RENDERED. These feed a transform and nothing else.
 */
export const ELEV = {
  plinth: 1.5,     // walkway terrace above the courtyard floor
  wingH: 13,       // five counted courses at a nominal course height
  roofH: 15.5,     // underside of the overhanging eave
  roofT: 0.9,      // how thick the eave slab reads
  roomH: 13,       // family rooms sit in the same wall plane as the banks
  waterH: 5,
  ossH: 6,
  entH: 10,
  joinH: 13,
  tandemH: 8,
};

/**
 * PLACEMENT-AND-HEIGHT CONFIDENCE. Carried per block and rendered as a HATCH PATTERN,
 * never as a hue — hue is spent on what a block IS, and two codings sharing one channel
 * is how a reader learns to trust neither. Same rule the status vocabulary above follows.
 */
export const CONF_LABEL = {
  high: 'Seen clearly in our walk-through',
  medium: 'Height estimated from our walk-through',
  low: 'Approximate — please confirm with us',
};

/** Family-facing one-liners about what a block is made of. Only what the footage saw. */
export const MATERIAL = {
  bank: 'Polished speckled stone fronts with bronze vases, under pale stucco.',
  tandem: 'Companion crypts set head to head. Not filmed end to end — ask us.',
  roof: 'A low-pitched roof sloping to the courtyard, overhanging the walkway.',
  room: 'A private room off the north face, closed behind locked ironwork.',
  water: 'A small feature the cemetery’s overview draws between the two rooms.',
  ossuary: 'Drawn where the cemetery’s overview places it. Not priced here.',
  entrance: 'The east approach into the courtyard.',
  join: 'Where this building meets the mausoleum next door.',
  court: 'Flagstone, river rock, planting beds and cremation properties.',
};

// ── The numbered crypt banks ─────────────────────────────────────────────────
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

function wing(id, label, [n0, n1], x0, x1) {
  const ns = range(n0, n1);
  const step = (x1 - x0) / ns.length;
  return {
    id,
    label,
    numbers: ns,
    banks: ns.map((n, i) => ({
      ref: `TGM-${id}-${n}`,
      n,
      wing: id,
      wingLabel: label,
      kinds: CRYPT_KINDS,
      // Plan rectangle. A 6" reveal each side keeps the drawn banks from touching.
      x: x0 + step * (i + 0.5),
      y: GEO.wingY,
      w: step - 0.5,
      d: GEO.wingD,
      // Elevation, for the 3D view only. `h` never reaches the page as a number.
      h: ELEV.wingH,
      conf: 'medium',
      material: MATERIAL.bank,
      // ── THE EMPTY SLOTS. Filled by a later, additive load; nothing reads them yet. ──
      price: null,
      status: null,
      positions: null,   // how many crypts the bank holds — not sourced
    })),
  };
}

export const WINGS = [
  wing('W', 'West Wing', MIS_WEST_BANKS, GEO.westX0, GEO.westX1),
  wing('E', 'East Wing', MIS_EAST_BANKS, GEO.eastX0, GEO.eastX1),
];

// ── The tandem bank ──────────────────────────────────────────────────────────
// MIS numbers this "~1-48". FORTY-EIGHT IS NOT SOURCED: the transcription says it is
// approximate, and the walk-through does not show the south run end to end at an angle
// anything could be counted from. So the bank is ONE selectable structure with its
// position count left null and the page saying, in family words, to ask. Inventing 48
// numbered crypts here would be inventing inventory.
export const TANDEM = {
  ref: 'TGM-T',
  label: 'Tandem Crypts',
  sub: 'head to head',
  x: 0,
  y: GEO.tandemY,
  w: GEO.tandemX1 - GEO.tandemX0,
  d: GEO.tandemD,
  h: ELEV.tandemH,
  // LOW: the south run is never walked end to end in the footage, so both its height and
  // its length are the drawing's, not ours.
  conf: 'low',
  material: MATERIAL.tandem,
  price: null,
  status: null,
  positions: null,
  positionsNote: 'the number of crypts in this bank is not sourced yet',
};

// ── Inert structures: drawn, named, never selectable, never priced ───────────
export const STRUCTURES = [
  {
    id: 'room-1',
    label: MIS_FAMILY_ROOMS[0],
    x: -(GEO.roomGap / 2 + GEO.roomW / 2), y: GEO.roomY, w: GEO.roomW, d: GEO.roomD,
    kind: 'room',
    h: ELEV.roomH, conf: 'medium', material: MATERIAL.room,
  },
  {
    id: 'water',
    label: 'Water feature',
    // MIS draws a small blue square between the two family rooms. The 2026-08-03 footage
    // never gets inside that court — both family rooms are behind locked wrought-iron
    // gates — so the FEATURE is drawn where the drawing puts it and is deliberately NOT
    // given the drawing's own name ("Water Wall / Hall", unreadable at that size and
    // unconfirmed on site). Naming it precisely would be inventing a fact.
    x: 0, y: GEO.roomY, w: GEO.roomGap - 1, d: 10,
    kind: 'water',
    h: ELEV.waterH, conf: 'low', material: MATERIAL.water,
  },
  {
    id: 'room-2',
    label: MIS_FAMILY_ROOMS[1],
    x: GEO.roomGap / 2 + GEO.roomW / 2, y: GEO.roomY, w: GEO.roomW, d: GEO.roomD,
    kind: 'room',
    h: ELEV.roomH, conf: 'medium', material: MATERIAL.room,
  },
  {
    id: 'ossuary',
    label: 'Terrace Garden Ossuary',
    x: GEO.ossX, y: GEO.ossY, w: GEO.ossW, d: GEO.ossD,
    kind: 'ossuary',
    // See the file header. Drawn because MIS draws it; inert because nobody has ruled.
    // LOW on both counts: nothing in the 2026-08-03 footage identifies it on site, so its
    // height is a placeholder for a structure whose EXISTENCE is itself unresolved.
    h: ELEV.ossH, conf: 'low', material: MATERIAL.ossuary,
    note: 'not priced here',
  },
  {
    id: 'entrance',
    label: 'Entrance',
    x: GEO.entX, y: GEO.entY, w: GEO.entW, d: GEO.entD,
    kind: 'entrance',
    h: ELEV.entH, conf: 'medium', material: MATERIAL.entrance,
  },
  {
    id: 'join',
    label: SITE.westNeighbour,
    x: GEO.joinX, y: GEO.joinY, w: GEO.joinW, d: GEO.joinD,
    kind: 'join',
    h: ELEV.joinH, conf: 'low', material: MATERIAL.join,
  },
];

// The covered walkway in front of each wing. Context, not inventory.
export const ROOFS = WINGS.map((w) => {
  const xs = w.banks.map((b) => b.x - b.w / 2);
  const xe = w.banks.map((b) => b.x + b.w / 2);
  const x0 = Math.min(...xs), x1 = Math.max(...xe);
  return {
    id: `roof-${w.id}`,
    wing: w.id,
    x: (x0 + x1) / 2,
    y: GEO.wingY + GEO.wingD / 2 + GEO.roofD / 2,
    w: x1 - x0,
    d: GEO.roofD,
    // The eave slab floats at roofH; it is not a block standing on the ground. HIGH:
    // the overhang, its slope toward the courtyard and its soffit downlights are the
    // clearest thing in the footage.
    h: ELEV.roofT,
    top: ELEV.roofH,
    conf: 'high',
    material: MATERIAL.roof,
  };
});

// ── The courtyard: the Memorial Path, and the link out to its own map ────────
export const COURTYARD = {
  id: 'tgmp',
  label: 'Terrace Garden Memorial Path',
  href: 'TGMP_Map.html',
  x: GEO.courtX, y: GEO.courtY, w: GEO.courtW, d: GEO.courtD,
  // The courtyard is a FLOOR, not a block: it sits one step below the walkway in front of
  // the banks (7:36, 6:56). HIGH — the whole clip is shot standing in it.
  h: 0,
  drop: ELEV.plinth,
  conf: 'high',
  material: MATERIAL.court,
};

/** Every selectable position on the page: the numbered banks plus the tandem bank. */
export function allPositions() {
  return [...WINGS.flatMap((w) => w.banks), TANDEM];
}

/** Spelling of a bank reference, so the page and the gate cannot disagree. */
export const bankRef = (wingId, n) => `TGM-${wingId}-${n}`;

/**
 * EVERY solid the 3D view extrudes, in one list, so the builder and the gate count the
 * same things. `sel` marks the ones a family can select — exactly the plan's selectable
 * positions and nothing else. The courtyard is NOT here: it is a floor plate and a link
 * zone, not a solid.
 */
export function blocks3d() {
  const banks = WINGS.flatMap((w) => w.banks).map((b) => ({
    id: b.ref, ref: b.ref, label: `${b.wingLabel} · bank ${b.n}`, kind: 'bank',
    x: b.x, y: b.y, w: b.w, d: b.d, h: b.h, top: b.h, conf: b.conf, material: b.material,
    wing: b.wing, n: b.n, sel: true,
  }));
  const tandem = {
    id: TANDEM.ref, ref: TANDEM.ref, label: `${TANDEM.label} · ${TANDEM.sub}`, kind: 'tandem',
    x: TANDEM.x, y: TANDEM.y, w: TANDEM.w, d: TANDEM.d, h: TANDEM.h, top: TANDEM.h,
    conf: TANDEM.conf, material: TANDEM.material, wing: null, n: null, sel: true,
  };
  const struct = STRUCTURES.map((s) => ({
    id: s.id, ref: null, label: s.label, kind: s.kind,
    x: s.x, y: s.y, w: s.w, d: s.d, h: s.h, top: s.h, conf: s.conf, material: s.material,
    wing: null, n: null, sel: false,
  }));
  const roofs = ROOFS.map((r) => ({
    id: r.id, ref: null, label: 'Covered walkway', kind: 'roof',
    x: r.x, y: r.y, w: r.w, d: r.d, h: r.h, top: r.top, conf: r.conf, material: r.material,
    wing: r.wing, n: null, sel: false,
  }));
  return [...banks, tandem, ...struct, ...roofs];
}
