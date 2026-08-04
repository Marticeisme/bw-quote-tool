/**
 * Eternal Light Mausoleum (ELM), Washington Memorial Park — the single source of truth
 * for the building's LAYOUT.
 *
 * ── WHAT THIS FILE IS, AND DELIBERATELY IS NOT ─────────────────────────────────
 * GEOMETRY ONLY. Not one price, not one status, not one invented crypt count. Every
 * sellable position on the generated page reads "Ask us" and the gate
 * (scripts/verify_elm_map.mjs) fails the build if a dollar sign reaches the HTML.
 *
 * That is a deliberate ruling, not an oversight. ELM has no per-position price/status
 * source we have read: the columbarium inside it (ECL-1) does — that inventory lives in
 * scripts/ecl-niche-data.mjs and renders on its own page — but the CRYPT mausoleum around
 * it does not. Inventing a crypt count to fill a bank would be fabricated data in front of
 * a family. So each bank carries `positions: null` unless the cemetery's own drawing
 * prints the numbers, and `price` / `status` slots stay empty, ready for the later load.
 *
 * WHEN THE INVENTORY ARRIVES: fill `positions`, add a `units` array per section shaped
 * like ecl-niche-data's `niches` ({ id, p, st }), flip HAS_INVENTORY to true, and rebuild.
 * The status vocabulary, the unsellable list and the sellable() predicate below are
 * already the ECL/ROAC/COM ones, so nothing about the conventions has to be invented then
 * either — see the STATUS block.
 *
 * ── SOURCES, IN ORDER OF AUTHORITY ─────────────────────────────────────────────
 * 1. The cemetery's own overview drawing of the Eternal Light Maus (centre building; the
 *    Chapel of Memories sits to its west, Terrace Garden Maus to its east), transcribed
 *    2026-08-03. It is the only source for the SECTION LABELS and for which bank sits
 *    where. No on-disk image covers this building, so the transcription is the record.
 * 2. Walkthrough footage, D:\Cemetery Photos Misc\Eteernal Light Maus\20260803_121735.mp4
 *    (9:29, 2026-08-03), walked corridor by corridor. Used to confirm the BUILDING TYPE of
 *    each element — long marble crypt corridors, the free-standing glass-front columbarium
 *    island — and nothing else. The crystal-niches room itself was NOT entered (see below).
 *    The five 2024 stills in the same folder were NOT used: the two dated 2024-04-04 had
 *    already been identified in sprint-13 as the Chapel of Memories' Serenity wall, and
 *    the rest could not be placed in this building with confidence.
 *
 * ── COORDINATES ARE SCHEMATIC ──────────────────────────────────────────────────
 * `x` runs east (right on the drawing), `z` runs south (down the drawing), both in feet.
 * They reproduce the drawing's TOPOLOGY — which bank is north of which, what flanks what,
 * which corner holds which — at plausible mausoleum proportions. They are NOT surveyed and
 * NOT to scale, so the page says so on its face and RENDERS NO DIMENSIONS ANYWHERE. The
 * gate asserts both.
 *
 * ── THE COLUMBARIUM INSIDE THIS BUILDING ───────────────────────────────────────
 * The Eternal Light Columbarium (ECL-1) is a free-standing four-sided glass-front cabinet
 * standing INSIDE this mausoleum, and it has its own live map at MAPS/ECL_NicheMap.html
 * with its own inventory. It is modelled here as ONE labelled link zone and nothing more —
 * its 85 niches are not re-modelled, re-priced or re-counted on this page.
 * Its position in the plan below is the lowest-confidence thing in this file: see the
 * `link-ecl` entry.
 *
 * ── THE CRYSTAL NICHES ARE NOT THE COLUMBARIUM ─────────────────────────────────
 * The drawing marks "CRYSTAL NICHES" at the heart of the building, with an elevation
 * showing a numbered row 1-24 and clusters arranged in a plus/cross around the centre.
 * OPERATOR CORRECTION 2026-08-03: the crystal-niches room sits BEHIND A GLASS DOOR, it
 * is dark inside, and the operator did not go in — so the footage shows NOTHING of the
 * room's interior. The dark-wood, bronze-mullioned keepsake banks seen along the central
 * corridors (mp4 4:52-5:52) were an earlier, WRONG identification and must not be
 * described as the crystal niches; what those corridor banks are is itself unconfirmed.
 * The crystal niches remain a DIFFERENT FEATURE from ECL-1 (the painted free-standing
 * island cabinet with brass mullions seen near the entry, mp4 0:28) — that distinction
 * stands on the drawing alone. Sprint-13's caution also holds: the archive photo folder
 * named "Crystal Niche" is the old brass room, not this room and not the ECL.
 * Confidence: PLACEMENT is the drawing's (unchanged); the interior is UNSEEN, so every
 * note below says only what the drawing prints. Arms carry `positions: null` and only
 * the elevation row carries 1-24.
 *
 * ── "ELN-W-1" ──────────────────────────────────────────────────────────────────
 * The drawing labels the highlighted central segment of the north wall
 * "Pickel Wall ELN-W-1" — an ELN prefix where every neighbouring label reads ELM. It is
 * transcribed EXACTLY as the drawing gives it and is NOT normalised to ELM: a label is a
 * label, and silently correcting one is how a counselor ends up quoting a reference the
 * cemetery office cannot find. No signage in the footage shows the string, so the reading
 * is unverified character by character and is flagged `labelUnverified: true`, which the
 * page surfaces as a plain "confirm this reference with us" note.
 */

// ── Status vocabulary — the house conventions, encoded before they are needed ──
// Identical to ecl-niche-data.mjs. Nothing on this ship carries a status; these exist so
// that the inventory load is a data change and not a design decision.
export const STATUS_LABEL = {
  available: 'Available', occupied: 'Occupied', reserved: 'Reserved', sold: 'Sold', unpriced: 'Not Priced',
};
/** Statuses that must never render a price, anywhere, in any view. */
export const UNSELLABLE = ['occupied', 'reserved', 'sold', 'unpriced'];
/** A position may show a price only when it is available AND has one. */
export const sellable = (u) => !!u && u.st === 'available' && typeof u.p === 'number';

/**
 * FALSE until a per-position price/status source for ELM's crypts has actually been read.
 * While it is false the page renders "Ask us" on every selectable position and the gate
 * refuses any dollar figure. Flipping it is a code change AND a data change, on purpose.
 */
export const HAS_INVENTORY = false;

/** What a selectable position says while there is no inventory. */
export const ASK_LABEL = 'Ask us';

// ── Building envelope (feet, schematic — NEVER displayed) ─────────────────────
export const SITE = {
  x0: -112, x1: 112,   // west / east extent of the enclosed building
  z0: 0, z1: 156,      // north wall / south face
  gardenZ: -14,        // the exterior Garden Mausoleum row stands north of the building
  wallH: 9,            // display height of a crypt bank
  lowH: 4.5,           // display height of an inert block (rest rooms, plinths)
};

/** Neighbouring buildings, for orientation only. Inert, unlabelled as inventory. */
export const NEIGHBOURS = [
  { id: 'nb-com', label: 'Chapel of Memories', side: 'west' },
  { id: 'nb-tgm', label: 'Terrace Garden Mausoleum', side: 'east' },
];

/**
 * SECTIONS — one entry per element the drawing names.
 *
 *   id          our stable key
 *   ref         the reference EXACTLY as the cemetery's drawing prints it, or null for
 *               an element the drawing does not label with one (rest rooms, the link zone)
 *   label       what a family reads
 *   kind        'tandem' | 'wall' | 'crypt' | 'crystal' | 'link' | 'amenity'
 *   x, z, w, d  schematic plan rectangle, in feet, centred on (x, z)
 *   h           display height
 *   positions   [first, last] ONLY where the drawing prints the numbers; otherwise null
 *   conf        'high' | 'medium' | 'low' — how sure we are of this element's PLACEMENT
 *   note        family-safe one-liner shown on the detail card
 *
 * `conf` is recorded per element because the drawing is far more definite about some
 * elements than others, and a map that presents a guess and a certainty identically is
 * the kind of map a counselor stops trusting the first time one guess is wrong.
 */
export const SECTIONS = [
  // ── Garden Mausoleum: the exterior tandem-crypt row along the north face ─────
  // The drawing prints them left to right as 1I, 1H, 1G, 1F, 1D, 1C, 1B, 1A, with
  // "Tandem Crypts" noted at both ends. There is NO 1E in the drawing and none is
  // invented here — a gap in a lettering run is a fact about the building, and filling it
  // to make the sequence tidy would be fabricated inventory.
  ...['1I', '1H', '1G', '1F', '1D', '1C', '1B', '1A'].map((code, i) => ({
    id: `gm-${code}`,
    ref: code,
    label: `Garden Mausoleum ${code}`,
    kind: 'tandem',
    x: -98 + i * 28, z: SITE.gardenZ, w: 22, d: 7, h: SITE.wallH,
    positions: null,
    conf: 'medium',
    note: 'Tandem crypts, outdoors along the north face.',
  })),

  // ── North wall, inside: two long wall banks flanking the highlighted centre ──
  {
    id: 'elm-w-1-left', ref: 'ELM-W-1', label: 'ELM-W-1 · West Segment', kind: 'wall',
    x: -70, z: 6, w: 72, d: 5, h: SITE.wallH,
    positions: [1, 14], conf: 'high',
    note: 'Wall crypts along the north wall, positions 1 to 14.',
  },
  {
    id: 'eln-w-1', ref: 'ELN-W-1', label: 'Pickel Wall · ELN-W-1', kind: 'glass',
    x: 0, z: 6, w: 44, d: 5, h: SITE.wallH,
    positions: null, conf: 'high', labelUnverified: true,
    // Operator, 2026-08-03: "the pickel wall is the glass wall that has what looks like
    // crystals inside" — it appears briefly in the walkthrough footage. That is the whole
    // footage-backed claim; what the pieces are and what the wall holds is unconfirmed.
    note: 'The Pickel Wall — a glass wall with what look like crystals displayed inside, at the centre of the north wall. Ask us what it holds.',
  },
  {
    id: 'elm-w-1-right', ref: 'ELM-W-1', label: 'ELM-W-1 · East Segment', kind: 'wall',
    x: 70, z: 6, w: 72, d: 5, h: SITE.wallH,
    positions: [15, 28], conf: 'high',
    note: 'Wall crypts along the north wall, positions 15 to 28.',
  },

  // ── The central block: banks around a cross-shaped interior ──────────────────
  // Two of these labels are drawn MIRRORED on the plan (ELM-3-W and ELM-4-W). Mirrored
  // text is a drafting artefact of a wall seen from its far side; it says nothing about
  // the bank, so the labels are transcribed the right way round and the fact lives here.
  {
    id: 'elm-3-w', ref: 'ELM-3-W', label: 'ELM-3-W', kind: 'crypt',
    x: -35, z: 40, w: 62, d: 5, h: SITE.wallH, positions: null, conf: 'high',
    note: 'Crypt bank along the north side of the central block.',
  },
  {
    id: 'elm-4-w', ref: 'ELM-4-W', label: 'ELM-4-W', kind: 'crypt',
    x: 35, z: 40, w: 62, d: 5, h: SITE.wallH, positions: null, conf: 'high',
    note: 'Crypt bank along the north side of the central block.',
  },
  {
    id: 'elm-3-s', ref: 'ELM-3-S', label: 'ELM-3-S', kind: 'crypt',
    x: -68, z: 78, w: 5, d: 68, h: SITE.wallH, positions: null, conf: 'high',
    note: 'Crypt bank running north to south on the west side of the central block.',
  },
  {
    id: 'elm-4-s', ref: 'ELM-4-S', label: 'ELM-4-S', kind: 'crypt',
    x: 68, z: 78, w: 5, d: 68, h: SITE.wallH, positions: null, conf: 'high',
    note: 'Crypt bank running north to south on the east side of the central block.',
  },
  {
    id: 'elm-3-e', ref: 'ELM-3-E', label: 'ELM-3-E', kind: 'crypt',
    x: -35, z: 116, w: 62, d: 5, h: SITE.wallH, positions: null, conf: 'high',
    note: 'Crypt bank along the south side of the central block.',
  },
  {
    id: 'elm-4-e', ref: 'ELM-4-E', label: 'ELM-4-E', kind: 'crypt',
    x: 35, z: 116, w: 62, d: 5, h: SITE.wallH, positions: null, conf: 'high',
    note: 'Crypt bank along the south side of the central block.',
  },
  {
    id: 'elm-4-n', ref: 'ELM-4-N', label: 'ELM-4-N', kind: 'crypt',
    x: 96, z: 78, w: 5, d: 68, h: SITE.wallH, positions: null, conf: 'medium',
    note: 'Crypt bank running north to south along the far east side.',
  },

  // ── The heart of the building: the crystal niches ────────────────────────────
  // The drawing shows an elevation with a numbered row 1-24 plus clusters set out in a
  // plus/cross around the centre. The elevation is the only place a NUMBER is printed, so
  // it is the only element here that carries a position range. Several clusters are
  // highlighted pink on the drawing; the highlighting's meaning is unknown and is NOT
  // modelled as a status — see the gate, which asserts no status is derived from it.
  {
    id: 'crystal-core', ref: 'CRYSTAL NICHES', label: 'Crystal Niches', kind: 'crystal',
    x: 0, z: 78, w: 30, d: 12, h: SITE.wallH,
    positions: [1, 24], conf: 'high',
    note: 'Niche room at the centre of the building, positions 1 to 24. It sits behind a glass door and our walkthrough did not go inside — ask us to walk it with you.',
  },
  {
    id: 'crystal-n', ref: 'CRYSTAL NICHES', label: 'Crystal Niches · North Arm', kind: 'crystal',
    x: 0, z: 58, w: 12, d: 14, h: SITE.wallH, positions: null, conf: 'medium',
    note: 'Niches north of the centre, as the cemetery’s drawing places them. Not filmed inside — ask us to walk it with you.',
  },
  {
    id: 'crystal-s', ref: 'CRYSTAL NICHES', label: 'Crystal Niches · South Arm', kind: 'crystal',
    x: 0, z: 98, w: 12, d: 14, h: SITE.wallH, positions: null, conf: 'medium',
    note: 'Niches south of the centre, as the cemetery’s drawing places them. Not filmed inside — ask us to walk it with you.',
  },
  {
    id: 'crystal-w', ref: 'CRYSTAL NICHES', label: 'Crystal Niches · West Arm', kind: 'crystal',
    x: -26, z: 78, w: 14, d: 12, h: SITE.wallH, positions: null, conf: 'medium',
    note: 'Niches west of the centre, as the cemetery’s drawing places them. Not filmed inside — ask us to walk it with you.',
  },
  {
    id: 'crystal-e', ref: 'CRYSTAL NICHES', label: 'Crystal Niches · East Arm', kind: 'crystal',
    x: 26, z: 78, w: 14, d: 12, h: SITE.wallH, positions: null, conf: 'medium',
    note: 'Niches east of the centre, as the cemetery’s drawing places them. Not filmed inside — ask us to walk it with you.',
  },

  // ── The two bottom-corner banks, each beside a rest room ─────────────────────
  {
    id: 'elm-p-c', ref: 'ELM-P-C', label: 'ELM-P-C', kind: 'crypt',
    x: -88, z: 140, w: 34, d: 5, h: SITE.wallH, positions: null, conf: 'high',
    note: 'Crypt bank in the south-west corner.',
  },
  {
    id: 'elm-p-d', ref: 'ELM-P-D', label: 'ELM-P-D', kind: 'crypt',
    x: 88, z: 140, w: 34, d: 5, h: SITE.wallH, positions: null, conf: 'high',
    note: 'Crypt bank in the south-east corner.',
  },
  {
    id: 'rest-w', ref: null, label: 'Rest Room', kind: 'amenity',
    x: -58, z: 142, w: 16, d: 12, h: SITE.lowH, positions: null, conf: 'high',
    note: 'Rest room.',
  },
  {
    id: 'rest-e', ref: null, label: 'Rest Room', kind: 'amenity',
    x: 58, z: 142, w: 16, d: 12, h: SITE.lowH, positions: null, conf: 'high',
    note: 'Rest room.',
  },

  // ── The columbarium, as a link zone and nothing else ─────────────────────────
  // PLACEMENT CONFIDENCE: LOW, and said so on the page. The drawing does not mark the
  // columbarium at all, so its position here comes only from the footage, where the
  // free-standing island cabinet stands in the open entry area a few paces inside the
  // south doors (mp4 0:16-0:32, and again at 9:16-9:28 on the way out). North/south of
  // that we are sure; how far east or west it sits is a guess, and the note says to
  // confirm it. What is NOT a guess is that it is inside this building and that its own
  // map is the place to price it.
  {
    id: 'link-ecl', ref: 'ECL-1', label: 'Eternal Light Columbarium', kind: 'link',
    x: 0, z: 138, w: 20, d: 10, h: 7.5,
    positions: null, conf: 'low',
    href: 'ECL_NicheMap.html',
    note: 'The glass-front columbarium standing inside this mausoleum. Open its own map for niches and pricing.',
  },
];

/** Everything a visitor can select and ask about. Rest rooms are not inventory. */
export const SELECTABLE_KINDS = ['tandem', 'wall', 'crypt', 'crystal', 'glass'];

export const KIND_LABEL = {
  tandem: 'Tandem crypts',
  wall: 'Wall crypts',
  crypt: 'Crypts',
  crystal: 'Crystal niches',
  glass: 'Glass wall',
  link: 'Columbarium',
  amenity: 'Facility',
};

/** Sections grouped the way the page's list tab reads them out. */
export const GROUPS = [
  { id: 'garden', label: 'Garden Mausoleum — Tandem Crypts', match: (s) => s.kind === 'tandem' },
  { id: 'northwall', label: 'North Wall', match: (s) => s.kind === 'wall' || s.kind === 'glass' },
  { id: 'central', label: 'Central Block', match: (s) => s.kind === 'crypt' && s.id.startsWith('elm-') && !s.id.startsWith('elm-p-') },
  { id: 'crystal', label: 'Crystal Niches', match: (s) => s.kind === 'crystal' },
  { id: 'corners', label: 'South Corners', match: (s) => s.id.startsWith('elm-p-') },
  { id: 'other', label: 'Columbarium & Facilities', match: (s) => s.kind === 'link' || s.kind === 'amenity' },
];

export const isSelectable = (s) => SELECTABLE_KINDS.includes(s.kind);
export const sectionById = (id) => SECTIONS.find((s) => s.id === id) || null;
export const positionsText = (s) =>
  s.positions ? `Positions ${s.positions[0]}\u2013${s.positions[1]}` : 'Count confirmed with us';
