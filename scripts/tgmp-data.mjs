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
 *     COMING SOON Terrace Garden Memorial Path
 *       (Billboard (Landscape)) (1).png              the official overhead PHASE 2
 *                                                    render — AUTHORITATIVE FOR LAYOUT
 *     What was replaced in the terrac garden.png     the OLD contents: pool + ossuary
 *     7 photographs (2026-06-01 … 2026-07-03)        the built state; geometry and
 *                                                    materials only
 *
 * Where the PDF and the screenshot disagree the PDF wins. Compared word for word
 * 2026-07-29: they carry identical prices, identical rights counts and identical row
 * pricing. The only differences are typographic (the PDF prints
 * "Shutter12x9x18" / "Shutters18x9x18" with no space before the dimensions).
 *
 * ── FEES: OPERATOR-CONFIRMED, NOT PRINTED ON THIS SHEET ────────────────────────────
 * The Terrace Garden Memorial Path pricing PDF states a Sales Price and a
 * Rights-of-Interment count and NOTHING else. There is no E.C.F. line, no opening &
 * closing, no recording fee, no inscription charge and no tax note anywhere on it.
 *
 * The fee schedule below is therefore NOT sheet data. It is the Mountain View
 * Columbarium June-2026 schedule, which the MVC page's Terrace Garden tab applied to
 * these niches before the area moved onto its own page. Martice ruled on 2026-07-29
 * that "MVC schedule applies" to the whole Terrace Garden Memorial Path — the niche
 * bank AND the nine additional cremation properties. That ruling is what authorises it;
 * nothing on this area's own sheet does.
 *
 *   schedule           MVC June-2026 (scripts/mvc-niche-data.mjs FEES)
 *   operator-confirmed 2026-07-29, Martice Morrison
 *   printed on the TGMP sheet?  NO — confirm current fees in MIS/Enterprise
 *
 * The page footer and every detail card must say exactly that. Do not restate it as
 * "the sheet's fees": that is the one sentence a family could be misled by.
 *
 * ── THERE IS NO POOL. REBUILT 2026-07-31 (sprint-09 Track T) ───────────────────────
 * The first cut of this scene rendered a reflection pool with a spout and a Terrace
 * Garden Ossuary block, both taken from `What was replaced in the terrac garden.png`.
 * That drawing is titled WHAT WAS REPLACED: it is the OLD contents of the terrace, not
 * the built garden. Operator, Map Issues 07.31.26:
 *
 *   "Terrace garden memorial path also looks like its going to need a lot of work
 *    there is not pool anymore the path removed the pool entirely."
 *
 * So the pool, its coping and its spout are gone from the data and from the page, and
 * `scripts/verify_tgmp_map.mjs` §12 fails if any of them comes back.
 *
 * The ossuary block went with it. It appears in NEITHER the PHASE 2 render NOR any of
 * the seven site photographs, and the same drawing lists it beside the pool as replaced
 * content. It was never inventory here in any case — Terrace Garden Ossuary scattering
 * is priced on the separate Scattering Garden sheet, reachable from guides.html — so
 * removing the mass removes a context object, not a property. OPEN QUESTION for the
 * operator: confirm the ossuary is gone from this footprint rather than merely absent
 * from the render.
 *
 * ── GEOMETRY ───────────────────────────────────────────────────────────────────────
 * There is no site plan and no fabrication drawing, so every SITE dimension below is an
 * ESTIMATE for the 3D scene. What is SOURCED is the LAYOUT — which object stands where
 * relative to the path — read off the PHASE 2 overhead render and confirmed against the
 * June/July 2026 photographs:
 *
 *   sourced (shape/topology)   a long kerbed strip beside the mausoleum walkway; a
 *                              concrete walk down the middle of it ending in a ROUND
 *                              turn-around near the near end; planting beds either side
 *                              of the walk; the far end paved as an open apron; the TGN
 *                              bank standing across the far end facing down the path;
 *                              benches, columbarium, birdbath and posts set in the beds
 *                              and on the apron; planters along both kerbs.
 *   estimated (every number)   the strip's 700x180 in footprint, the 60 in walk width,
 *                              the 136 in turn-around, the kerb, and every x/z.
 *
 * The page says so, and PLACEMENT IS APPROXIMATE.
 *
 * ── BED FINISH ─────────────────────────────────────────────────────────────────────
 * The PHASE 2 render draws the beds as bright artificial turf. Every photograph of the
 * built garden (2026-06-01, 2026-06-13, 2026-07-03) shows DARK BARK MULCH around the
 * posts instead. The scene follows the photographs, because that is what is on the
 * ground; the page notes that the marketing render shows turf.
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
//   x/z     where the object stands, filled in from PLACEMENT below. APPROXIMATE.
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

// ── Scene geometry (inches, ESTIMATED — the page says so) ────────────────────
// The strip runs along x. z = 0 is the walk's centre line; +z is the MAUSOLEUM side
// (the render's upper border, where the walkway and the crypt wall are) and -z is the
// road side. The far end of the path — where it meets the mausoleum apron and where
// the niche bank stands — is -x; the turn-around is at +x.
export const GEO = {
  terraceW: 700, terraceD: 180,   // the kerbed garden strip, outside face to outside face
  kerbT: 8, kerbH: 14,            // the low cream stucco kerb wall around it
  // The memorial path: a concrete walk down the middle, an open paved apron at the far
  // end, and a round flagstone-and-cobble turn-around near the near end. All three are
  // shapes the render and the 2026-06-01 photograph agree on; the numbers are estimates.
  pathW: 56,
  apronX0: -350, apronX1: -186,   // the fully paved far end
  headX: 244, headR: 50,          // the round turn-around
  pathZ: 0,                       // the walk's centre line
  bedZ: 56,                       // centre line of each planting bed
  // TGN bank: a freestanding granite wall standing ACROSS the far end of the strip,
  // facing back down the path. rotY turns its face from +z to +x.
  bankX: -336, bankZ: 0, bankRotY: 90,
  nicheW: 12.5, nicheH: 12.5,     // the carried module size, used as the 3D grid pitch
  bankFrame: 5,                   // polished Paradiso surround
  bankBase: 12,                   // base course under the niche field
  bankT: 10,                      // wall thickness
};

/** Inner face of the kerb, either side of the walk. Beds live between this and pathW/2. */
export const INNER_Z = GEO.terraceD / 2 - GEO.kerbT;   // 82
export const INNER_X = GEO.terraceW / 2 - GEO.kerbT;   // 342

// Where each of the nine properties stands, read off the PHASE 2 overhead render:
//   the 36" bench and the columbarium flank the paved apron at the far end, with the
//   birdbath just off it on the walk's edge; the five posts alternate between the two
//   beds working toward the turn-around; the 48" bench sits along the mausoleum-side
//   kerb at the near end, where the render draws a long low slab seat.
// x ascends with the sheet's own numbering so "along the path" still reads in sheet
// order; z is which bed. Both are APPROXIMATE — see the header.
export const PLACEMENT = {
  'TGMP-1': { x: -300, z: -48 },   // 36" pedestal bench, apron, road side
  'TGMP-2': { x: 250, z: 60 },     // 48" pedestal bench, near end, mausoleum side
  'TGMP-3': { x: -262, z: 50 },    // columbarium with alcove, apron, mausoleum side
  'TGMP-4': { x: -206, z: -34 },   // birdbath, on the apron beside the walk's mouth
  'TGMP-5': { x: -150, z: -56 },   // single post, road-side bed
  'TGMP-6': { x: -90, z: 56 },     // double post, mausoleum-side bed
  'TGMP-7': { x: 20, z: -56 },     // carved-rose post, road-side bed
  'TGMP-8': { x: 96, z: -56 },     // daffodil post, road-side bed
  'TGMP-9': { x: 156, z: 56 },     // bird post, mausoleum-side bed
};
for (const it of TGMP_ITEMS) {
  const p = PLACEMENT[it.id];
  if (!p) throw new Error(`${it.id} has no entry in PLACEMENT`);
  it.x = p.x;
  it.z = p.z;
}

// ── Planters (context, never inventory) ──────────────────────────────────────
// The render draws two runs of dark cast planters — square blocks with a round mouth —
// standing tight against the kerb, four to a side. They hold plants, they hold nothing
// else: no price, no rights count, no reference, no detail card. Sizes estimated.
export const PLANTER = { w: 14, d: 14, h: 16 };
export const PLANTERS = [
  ...[-40, 4, 48, 92].map((x) => ({ x, z: 70 })),      // mausoleum-side kerb
  ...[160, 202, 244, 286].map((x) => ({ x, z: -70 })), // road-side kerb
];
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

// ── Fee schedule ─────────────────────────────────────────────────────────────
// See the header. These amounts come from the Mountain View Columbarium June-2026
// schedule and are applied here on the operator's 2026-07-29 ruling — they are NOT
// printed on the Terrace Garden Memorial Path sheet. Same schedule for the TGN niches
// and for the nine additional properties.
//
// Applied exactly as the old MVC page's Terrace Garden tab applied it:
//   E.C.F.       ceil(price x 10%), always shown, never included in the listed price
//   O&C          $875 each, quantity chosen by the counselor, default 0
//   Recording    $235 each, quantity chosen by the counselor, default 0
//   Inscription  $660 each, quantity chosen by the counselor, default 0 — TAXABLE
//   Sales tax    10.4%, on the inscription subtotal ONLY (taxable merchandise)
// Est. Total is the rounded sum of the price, the E.C.F. and whichever fees are on.
export const FEES = {
  OC: 875,
  REC: 235,
  INSCR: 660,
  TAX: 0.104,
  ECF_RATE: 0.1,
  QTY_MAX: 4,
};

/** Where the schedule came from and what it is not. Rendered verbatim on the page. */
export const FEE_SOURCE = {
  schedule: 'Mountain View Columbarium, June 2026',
  confirmedOn: '2026-07-29',
  confirmedBy: 'operator ruling',
  printedOnThisSheet: false,
};

/** E.C.F. as the old MVC card computed it — rounded UP to the dollar. */
export const ecf = (price) => Math.ceil(price * FEES.ECF_RATE);

/**
 * The card's arithmetic, in one place, so the gate can anchor a full computation
 * against the same rules the page runs. `q` = { oc, rec, inscr }, all defaulting to 0.
 * Tax applies to the inscription subtotal only. Est. Total is rounded to the dollar.
 */
export function estTotal(price, q = {}) {
  const oc = q.oc || 0, rec = q.rec || 0, inscr = q.inscr || 0;
  const inscrSub = FEES.INSCR * inscr;
  const tax = Math.round(inscrSub * FEES.TAX * 100) / 100;
  return Math.round(price + ecf(price) + FEES.OC * oc + FEES.REC * rec + inscrSub + tax);
}

/** A property may show a price only when it is available AND has one. */
export const sellable = (x) => x.st === 'available' && typeof x.price === 'number';

/** Every sellable property on the path: 40 niches + 9 additional properties. */
export function allProperties() {
  return [
    ...tgnNiches(),
    ...TGMP_ITEMS.map((it) => ({ kind: 'item', ref: it.id, ...it })),
  ];
}
