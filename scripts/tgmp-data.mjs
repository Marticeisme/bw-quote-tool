/**
 * Terrace Garden Memorial Path (Washington Memorial Park) — the single source of truth
 * for the whole area: the TGN niche bank plus the nine additional cremation properties.
 *
 * Rebuild with `node scripts/build_tgmp_map.mjs`; NEVER hand-edit MAPS/TGMP_Map.html.
 *
 * ── SOURCES ────────────────────────────────────────────────────────────────────────
 *   D:\Cemetery Photos Misc\Terrace Garden Memorial Path\
 *     Terrace Garden Memorial Path Pricingffff.pdf   the pricing sheet — AUTHORITATIVE
 *     Screenshot 2026-07-29 203810.png               the same sheet as an image
 *     What was replaced in the terrac garden.png     area layout: pool + ossuary
 *     7 photographs                                  geometry and materials only
 *
 * Where the PDF and the screenshot disagree the PDF wins. Compared word for word
 * 2026-07-29: they carry identical prices, identical rights counts and identical row
 * pricing. The only differences are typographic (the PDF prints
 * "Shutter12x9x18" / "Shutters18x9x18" with no space before the dimensions).
 *
 * ── FEES: THE SHEET PRINTS NONE ────────────────────────────────────────────────────
 * The pricing PDF states a Sales Price and a Rights-of-Interment count and nothing
 * else. There is no E.C.F. line, no opening & closing, no recording fee, no inscription
 * charge and no tax note anywhere on it. Per the track ruling, fees from another area
 * are NEVER borrowed: the MVC page's Terrace Garden tab applied the MVC June-2026
 * schedule (O&C $875 / recording $235 / inscription $660 / 10.4% tax / 10% E.C.F.) to
 * these niches, and that schedule belongs to the Mountain View Columbarium sheet, not
 * to this one. This page therefore shows price + rights only and says so in its footer.
 *
 * ── THE TERRACE GARDEN OSSUARY IS NOT INVENTORY HERE ───────────────────────────────
 * The layout drawing names an ossuary block beside the reflection pool, but the pricing
 * PDF prices no ossuary placement. It is rendered as a LABELLED CONTEXT MASS with no
 * price, no rights count and no detail card. (Terrace Garden Ossuary scattering plans
 * are priced on the separate Scattering Garden sheet, reachable from guides.html.)
 *
 * ── GEOMETRY ───────────────────────────────────────────────────────────────────────
 * There is no site plan and no fabrication drawing. Every SITE dimension below — the
 * terrace, the pool, the ossuary block, the niche-bank frame, and every object's place
 * along the path — is an ESTIMATE for the 3D scene, derived from the photographs and
 * the layout drawing. The page says so, and PLACEMENT IS APPROXIMATE.
 *
 * The nine TGMP objects' own sizes are NOT estimated: they are the catalog dimensions
 * printed on the pricing sheet, read as W x D x H inches. Two exceptions, both flagged
 * with `dimsFromSheet: false` and both marked on the page:
 *   - Paradiso Birdbath and Pedestal — the sheet prints no dimensions at all.
 *   - the two pedestal benches print seat AND pedestal dimensions; the overall height
 *     used here is seat thickness + pedestal height, which is arithmetic on the sheet's
 *     own numbers rather than a number the sheet states.
 *
 * ── PII ────────────────────────────────────────────────────────────────────────────
 * The source photographs show inscribed plates on the mausoleum wall behind the path.
 * No photograph, crop or transcription of any plate is reproduced here or anywhere in
 * this repo. The scene is drawn from primitives.
 */

// ── Niche bank (TGN) ─────────────────────────────────────────────────────────
// Rows are listed TOP first, exactly as the sheet prints them: $12k / $14K / $16K /
// $14K / $12k. A is the bottom row, matching every other niche map in this repo.
//
// Prices, the 8x5 shape and the 2-rights count are CARRIED from the Terrace Garden tab
// of MAPS/MVC_NewGlassFront_NicheMap_1.html (scripts/mvc-niche-data.mjs `TGN`), proven
// niche-for-niche by scripts/extract_tgn_from_mvc.mjs and gated in
// scripts/verify_tgmp_map.mjs. They are independently confirmed against this area's own
// pricing sheet, which prints the same five row prices and the same "2 Rights per niche".
export const TGN = {
  rows: ['E', 'D', 'C', 'B', 'A'],           // top -> bottom
  rowPrices: { E: 12000, D: 14000, C: 16000, B: 14000, A: 12000 },
  cols: 8,
  rights: 2,
  // Carried verbatim from the MVC page's Terrace Garden tab. The Terrace Garden pricing
  // sheet prints no niche dimensions, so the page labels this as carried, not as sheet
  // data. Do not invent a replacement; correct it only from MIS.
  dim: '12.5" W x 12.5" H',
  depth: '12"',
  carriedFrom: 'MAPS/MVC_NewGlassFront_NicheMap_1.html (Terrace Garden Niches tab)',
};

/** `TGN-E-1` … `TGN-A-8`. The row letter and the column number, left to right. */
export const tgnRef = (row, n) => `TGN-${row}-${n}`;

/** All 40 niches, flattened, top row first. */
export function tgnNiches() {
  const out = [];
  for (const r of TGN.rows) {
    for (let n = 1; n <= TGN.cols; n++) {
      out.push({
        kind: 'niche',
        id: `${r}-${n}`,
        ref: tgnRef(r, n),
        row: r,
        n,
        price: TGN.rowPrices[r],
        rights: TGN.rights,
        st: 'available',
      });
    }
  }
  return out;
}

// ── Additional cremation properties (TGMP) ───────────────────────────────────
// Nine line items, in the sheet's own printed order. `name` is the sheet's wording with
// the dimensions split off; `sheetLine` is the line exactly as the PDF prints it, so a
// counselor can match it to the sheet in front of them.
//
//   w/d/h   inches, from the sheet's printed dimensions (see the header for the two
//           exceptions). Used for the 3D mass and shown on the card.
//   shape   which primitive the builder draws: 'bench' | 'cabinet' | 'birdbath' | 'post'
//   x       position along the path, inches from the centre of the terrace. APPROXIMATE.
export const TGMP_ITEMS = [
  {
    id: 'TGMP-1', shape: 'bench',
    name: 'Paradiso Pedestal Bench',
    sheetLine: 'Paradiso Pedestal Bench - Seat 36x14x4 Pedestal 30x8x14',
    dims: 'Seat 36x14x4 · Pedestal 30x8x14',
    price: 24000, rights: 2, st: 'available',
    w: 36, d: 14, h: 18, seatT: 4, pedW: 30, pedD: 8, pedH: 14,
    dimsFromSheet: false,
    dimNote: 'Overall height 18" = 4" seat + 14" pedestal (the sheet prints the two parts, not a total).',
  },
  {
    id: 'TGMP-2', shape: 'bench',
    name: 'Paradiso Pedestal Bench',
    sheetLine: 'Paradiso Pedestal Bench - Seat 48x14x4 Pedestal 40x8x14',
    dims: 'Seat 48x14x4 · Pedestal 40x8x14',
    price: 42000, rights: 4, st: 'available',
    w: 48, d: 14, h: 18, seatT: 4, pedW: 40, pedD: 8, pedH: 14,
    dimsFromSheet: false,
    dimNote: 'Overall height 18" = 4" seat + 14" pedestal (the sheet prints the two parts, not a total).',
  },
  {
    id: 'TGMP-3', shape: 'cabinet',
    name: 'Classic Gray Companion Columbarium with Alcove and Paradiso Shutters',
    sheetLine: 'Classic Gray Companion Columbarium with Alcove and Paradiso Shutters 30x17x37',
    dims: '30x17x37',
    price: 52000, rights: 4, st: 'available',
    w: 30, d: 17, h: 37, dimsFromSheet: true,
  },
  {
    id: 'TGMP-4', shape: 'birdbath',
    name: 'Paradiso Birdbath and Pedestal',
    sheetLine: 'Paradiso Birdbath and Pedestal',
    dims: null,
    price: 52000, rights: 4, st: 'available',
    // ESTIMATED from the photographs — the sheet prints no dimensions for this item.
    w: 26, d: 26, h: 36, dimsFromSheet: false,
    dimNote: 'The pricing sheet prints no dimensions for this item.',
  },
  {
    id: 'TGMP-5', shape: 'post',
    name: 'Paradiso Cremation Posts with Absolute Black Shutter',
    sheetLine: 'Paradiso Cremation Posts with Absolute Black Shutter12x9x18',
    dims: '12x9x18',
    price: 8000, rights: 1, st: 'available',
    w: 12, d: 9, h: 18, dimsFromSheet: true,
  },
  {
    id: 'TGMP-6', shape: 'post',
    name: 'Paradiso Double Cremation Post with Absolute Black Shutters',
    sheetLine: 'Paradiso Double Cremation Post with Absolute Black Shutters18x9x18',
    dims: '18x9x18',
    price: 16000, rights: 2, st: 'available',
    w: 18, d: 9, h: 18, dimsFromSheet: true, shutters: 2,
  },
  {
    id: 'TGMP-7', shape: 'post',
    name: 'Paradiso Cremation Post with Carved Rose, Antique Finish',
    sheetLine: 'Paradiso Cremation Post with Carved Rose Antique Finish 6x6x10',
    dims: '6x6x10',
    price: 8000, rights: 1, st: 'available',
    w: 6, d: 6, h: 10, dimsFromSheet: true, carved: 'rose',
  },
  {
    id: 'TGMP-8', shape: 'post',
    name: 'Paradiso Cremation Post with Shaped Carved Antique Daffodils',
    sheetLine: 'Paradiso Cremation Post with Shaped Carved Antique Daffodils 9x9x12',
    dims: '9x9x12',
    price: 8000, rights: 1, st: 'available',
    w: 9, d: 9, h: 12, dimsFromSheet: true, carved: 'daffodils',
  },
  {
    id: 'TGMP-9', shape: 'post',
    name: 'Paradiso Cremation Post with Shaped Carved Antique Birds',
    sheetLine: 'Paradiso Cremation Post with Shaped Carved Antique Birds 9x9x12',
    dims: '9x9x12',
    price: 8000, rights: 1, st: 'available',
    w: 9, d: 9, h: 12, dimsFromSheet: true, carved: 'birds',
  },
];

// The nine properties stand in one line along the path, in the sheet's order, at the
// tight spacing the photographs show (posts roughly a post-width apart in one bed) —
// NOT spread across the whole terrace. Positions are computed from the items' own
// widths, so they can never overlap and can never drift out of sheet order.
export const ROW_GAP = 16;      // inches between neighbouring properties
export const ROW_START = -330;  // left edge of the first property, inches from centre
{
  let left = ROW_START;
  for (const it of TGMP_ITEMS) {
    it.x = +(left + it.w / 2).toFixed(2);
    left += it.w + ROW_GAP;
  }
}

// ── Scene geometry (inches, ESTIMATED — the page says so) ────────────────────
export const GEO = {
  terraceW: 700, terraceD: 220,   // the paved terrace the path runs along
  terraceRise: 8,                 // low stucco kerb around it
  pathZ: 70,                      // centre line the TGMP objects stand on
  // Reflection pool, from the layout drawing's proportions.
  poolW: 260, poolD: 90, poolX: 55, poolZ: -30, poolDepth: 10,
  spoutW: 34, spoutD: 26, spoutH: 12,
  // Terrace Garden Ossuary — a labelled context mass, never inventory.
  ossW: 96, ossD: 96, ossH: 42, ossX: 270, ossZ: -30,
  // TGN bank: a freestanding granite wall standing at the back of the terrace.
  bankX: -215, bankZ: -88,
  nicheW: 12.5, nicheH: 12.5,     // the carried module size, used as the 3D grid pitch
  bankFrame: 5,                   // polished Paradiso surround
  bankBase: 12,                   // base course under the niche field
  bankT: 10,                      // wall thickness
};
export const BANK_FIELD_W = GEO.nicheW * TGN.cols;               // 100
export const BANK_FIELD_H = GEO.nicheH * TGN.rows.length;        // 62.5
export const BANK_W = BANK_FIELD_W + 2 * GEO.bankFrame;          // 110
export const BANK_H = BANK_FIELD_H + 2 * GEO.bankFrame + GEO.bankBase; // 84.5

// ── Price tiers ──────────────────────────────────────────────────────────────
// Six distinct prices across both halves of the sheet. Hue carries PRICE and nothing
// else on this page — status is carried by pattern, per the house rule.
export const TIERS = [
  { p: 8000, l: '$8,000', c: 't0', bg: '#1a6fae', fg: '#fff' },
  { p: 12000, l: '$12,000', c: 't1', bg: '#219866', fg: '#0e1729' },
  { p: 14000, l: '$14,000', c: 't2', bg: '#7d9a18', fg: '#0e1729' },
  { p: 16000, l: '$16,000', c: 't3', bg: '#c39a10', fg: '#0e1729' },
  { p: 24000, l: '$24,000', c: 't4', bg: '#e07b12', fg: '#0e1729' },
  { p: 42000, l: '$42,000', c: 't5', bg: '#c2332b', fg: '#fff' },
  { p: 52000, l: '$52,000', c: 't6', bg: '#8b4fbb', fg: '#fff' },
];

export const STATUS_LABEL = { sold: 'Sold', unpriced: 'Not Priced' };

/** A property may show a price only when it is available AND has one. */
export const sellable = (x) => x.st === 'available' && typeof x.price === 'number';

/** Every sellable property on the path: 40 niches + 9 additional properties. */
export function allProperties() {
  return [
    ...tgnNiches(),
    ...TGMP_ITEMS.map((it) => ({ kind: 'item', ref: it.id, ...it })),
  ];
}
