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
 * ── AVAILABILITY IS NOW THE OPERATOR'S MIS LIST, 2026-08-01 ───────────────────────
 * The Jan-30-2025 price sheet is still the PRICE authority — every figure below is the
 * sheet's own, unchanged. It is no longer the AVAILABILITY authority: the operator
 * supplied an MIS-style availability export on 2026-08-01 (Wall-1 = this GOM-1-1 wall,
 * Lvl = row, Sp = space), and that export supersedes the sheet's status reading. Statuses
 * remain hand-maintained — when a niche sells, edit this file and rebuild.
 *
 * The export, verbatim:
 *   Summary  Level B: 1 available, $0 | Level C: 12 available, $5,995
 *            Level D: 5 available, $6,995 (4 of 5) | Level G: 3 available, $8,995
 *   Detail   Wall-1 Lvl-B Sp-10 -> $0
 *            Lvl-C Sp-7, 9, 12, 13, 14, 18, 20, 22, 24, 25, 26 -> $5,995
 *            Lvl-D Sp-15, 20, 24, 26 -> $6,995
 *            Lvl-D Sp-18 -> $0
 *            Lvl-G Sp-13, 14, 15 -> $8,995
 *
 * ⚠ UNRECONCILED, FOR THE OPERATOR: the summary says **Level C: 12 available**, the
 * detail lists **11 C spaces**. The DETAIL is the per-space authority, so 11 ship. One C
 * space is either missing from the detail or miscounted in the summary — Martice must
 * reconcile which, in MIS. Until he does, this wall shows 11 available in row C.
 *
 * The list is treated as the COMPLETE available set as of 2026-08-01: a level absent from
 * it (all of F) has sold out. Nineteen niches the sheet priced are therefore gone, and
 * they are recorded in SOLD_SINCE_SHEET below rather than silently deleted, so a later
 * reader can see what moved and when.
 *
 * ── $0 IS NOT A PRICE (operator's standing COM rule, applied here) ────────────────
 * The export lists B-10 and D-18 as available at **$0**. The operator's rule from the
 * Columbarium — "available as long as a price greater than 0 is attached" — makes a $0
 * position NOT OFFERED. GOMN is two-status, so both render unavailable ("confirm in
 * MIS"); they are recorded in LISTED_NO_PRICE so they are findable the moment he supplies
 * prices. Nothing on the wall may ever print $0.
 *
 * ── THE FAIL-SAFE READING (operator's standing rule, 2026-07-29, binding) ──────────
 *   A PRINTED PRICE means AVAILABLE.  ANYTHING ELSE means UNAVAILABLE — "confirm in
 *   MIS". The sheet's cell fill colours (cream, salmon, purple, cyan, orange, pink,
 *   lime) carry NO meaning and are not interpreted here.
 * So `p` is a number exactly when the CURRENT reading of the wall offers that niche at a
 * price, and `null` for every other niche. Nothing on the page may invent a price for an
 * unavailable niche. (Until 2026-08-01 "current reading" meant the sheet's printed cells;
 * it now means the operator's MIS export, minus the $0 rows — see above.)
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
 * WHAT IS FOR SALE. Every space the operator's 2026-08-01 MIS export lists as available
 * AT A PRICE GREATER THAN ZERO, keyed `<row>-<column>`, at the Jan-30-2025 sheet's own
 * figure. A niche absent from this map is UNAVAILABLE by the fail-safe rule above — there
 * is no third state and no way to record a price for a niche that is not for sale.
 *
 * 18 entries: 1 in the left wing, 14 in the centre, 3 in the right wing.
 * Every price here is IDENTICAL to the sheet's — the export moved availability only.
 */
export const PRICES = {
  // ── Left wing (cols 1–8) ──
  'C-7': 5995,

  // ── Center section (cols 9–24) ──
  'G-13': 8995, 'G-14': 8995, 'G-15': 8995,
  'D-15': 6995, 'D-20': 6995, 'D-24': 6995,
  'C-9': 5995, 'C-12': 5995, 'C-13': 5995, 'C-14': 5995,
  'C-18': 5995, 'C-20': 5995, 'C-22': 5995, 'C-24': 5995,

  // ── Right wing (cols 25–32) ──
  'D-26': 6995,
  'C-25': 5995, 'C-26': 5995,
};

/**
 * Listed by MIS as AVAILABLE but with NO PRICE ($0) on 2026-08-01. Not offered — a price
 * greater than zero is what makes a position sellable (operator's standing COM rule). Kept
 * here, not in PRICES, so they cannot reach the wall as money; delete from this list and
 * add to PRICES the day the operator issues a figure.
 *
 * Both are NEW to the wall — neither carried a price on the Jan-30-2025 sheet either, so
 * "no price" is the only thing MIS has ever said about them.
 */
export const LISTED_NO_PRICE = ['B-10', 'D-18'];

/**
 * The 19 niches the Jan-30-2025 sheet priced that the 2026-08-01 export no longer lists.
 * Read as SOLD. Recorded rather than deleted so the change is auditable, and so the
 * emptied rows (all of level B, all of level F) read as history and not as a build bug.
 *   B ×9 @ $4,995 — 6, 7, 11, 12, 13, 15, 17, 18, 23  (level B is now sold out)
 *   C ×3 @ $5,995 — 10, 11, 19
 *   D ×1 @ $6,995 — 9
 *   F ×3 @ $7,995 — 13, 22, 23                        (level F is now sold out)
 *   G ×3 @ $8,995 — 16, 18, 19
 * $120,905 of the sheet's $241,815 sold; $120,910 remains at list.
 */
export const SOLD_SINCE_SHEET = [
  'B-6', 'B-7', 'B-11', 'B-12', 'B-13', 'B-15', 'B-17', 'B-18', 'B-23',
  'C-10', 'C-11', 'C-19',
  'D-9',
  'F-13', 'F-22', 'F-23',
  'G-16', 'G-18', 'G-19',
];

/** Provenance of the availability reading, rendered on the page. */
export const AVAILABILITY = {
  asOf: '2026-08-01',
  source: 'operator MIS availability export (Wall-1 = GOM-1-1; Lvl = row, Sp = space)',
  supersedes: "the Jan-30-2025 price sheet's status reading (prices unchanged)",
  /** The export's own summary line, per level. Detail counts are derived from PRICES. */
  summaryCounts: { B: 1, C: 12, D: 5, G: 3 },
  /**
   * The one place the export contradicts itself. Surfaced on purpose: the page and the
   * gate ship the DETAIL, and the operator has to reconcile the summary in MIS.
   */
  discrepancy:
    'The export summary says Level C has 12 available; its detail lists 11 C spaces. ' +
    'The detail is authoritative here, so 11 are shown — the twelfth is unreconciled.',
};

export const STATUS_LABEL = { unavailable: 'Confirm in MIS' };
/** Statuses that must never render a price, anywhere, in any view. */
export const UNSELLABLE = ['unavailable'];

// ── Fees ─────────────────────────────────────────────────────────────────────
// ── THESE ARE NO LONGER THE SHEET'S OWN NUMBERS (operator ruling 2026-07-31) ──
// The GOMN price sheet's right-hand boxes print Open & Closing $835.00ea, Recording Fee
// $225.00ea and Inscription $605.00ea. Martice ruled on 2026-07-31 that the **Mountain
// View Columbarium June-2026 schedule** applies to the Garden of Meditation, exactly as
// it already applies to the Terrace Garden Memorial Path. That schedule REPLACES the
// three amounts printed on this sheet:
//
//   E.C.F.       ceil(price × 10%) — unchanged, and the sheet's own sentence still
//                stands verbatim: not included in listed pricing
//   O&C          $875 each   (sheet said $835)
//   Recording    $235 each   (sheet said $225)
//   Inscription  $660 each   (sheet said $605) — TAXABLE, and addable ×2
//   Sales tax    10.4%, on MERCHANDISE — the inscription subtotal AND the urn subtotal
//
// The urn tax was an open question when this file was first written on 2026-07-31: the
// page said "sales tax on the Interlude Urn is confirmed at contract" and quoted the urn
// at list. Martice RULED later the same day that the Interlude Urn is taxed at 10.4%,
// exactly like the inscription. There is no longer an untaxed line on this card, and the
// "confirmed at contract" caveat is gone from the page and from the granite guide.
//
// The sheet's E.C.F. rate is untouched, so `SHEET_TEXT.ecf` is still a verbatim quote.
// The three dollar amounts are NOT, and the page must say where they come from — see
// FEE_SOURCE. Do not restate them as "the sheet's fees": that is the one sentence a
// family could be misled by.
export const FEES = {
  ECF_RATE: 0.1,   // "E.C.F: 10%  ***E.C.F is not included in listed pricing***" (sheet)
  OC: 875,         // MVC June-2026
  REC: 235,        // MVC June-2026
  INSCR: 660,      // MVC June-2026 — taxable merchandise
  TAX: 0.104,      // MVC June-2026 — applies to ALL merchandise: inscription AND urn
};

/** Where the schedule came from and what it is not. Rendered verbatim on the page. */
export const FEE_SOURCE = {
  schedule: 'Mountain View Columbarium, June 2026',
  confirmedOn: '2026-07-31',
  confirmedBy: 'operator ruling',
  printedOnThisSheet: false,
  replaces: 'Open & Closing $835 · Recording Fee $225 · Inscription $605',
};

/**
 * Inscriptions are a QUANTITY, not a yes/no (operator, 2026-07-31): "you can add two
 * inscriptions on the front". A companion niche carries two names, so the ceiling is the
 * niche's two rights of interment. Default 0.
 */
export const INSCR_MAX = 2;

/**
 * The Interlude Urn — a MERCHANDISE add-on, not a fee.
 * Price operator-supplied 2026-07-31. The sheet names the urn ("ONLY the Interlude Urn
 * is allowed in these Niches due to size. Refer to URN price list for price.") but does
 * not price it; this is the URN price list figure the sheet points at. Two fit per
 * niche, which is exactly why the wall is sold as a companion — so the quantity ceiling
 * is the niche's two rights.
 *
 * TAXED at 10.4%, like the inscription (operator ruling 2026-07-31). It is merchandise,
 * not a fee — that distinction is about which charges the E.C.F. is computed on, not
 * about tax.
 */
export const URN = {
  name: 'Interlude Urn',
  maker: 'Matthews',
  price: 665,
  maxQty: 2,
  source: 'operator-supplied 2026-07-31, from the urn price list',
};

/** E.C.F., rounded UP to the dollar — the same rule the MVC/TGMP cards use. */
export const ecf = (price) => Math.ceil(price * FEES.ECF_RATE);

/**
 * The card's arithmetic in one place, so the gate can anchor a full computation against
 * the same rules the page runs. `q` = { oc, rec, inscr, urn }, all defaulting to 0.
 *
 * Order matters and is asserted: E.C.F. is 10% of the NICHE PRICE alone and is never
 * charged on an add-on, so every add-on is summed AFTER it. Sales tax applies to BOTH
 * merchandise subtotals — the inscription and the urn — each rounded to the cent on its
 * own line, so the card shows where every figure came from.
 */
export function estTotal(price, q = {}) {
  const oc = q.oc || 0, rec = q.rec || 0, inscr = q.inscr || 0, urn = q.urn || 0;
  const inscrSub = FEES.INSCR * inscr;
  const tax = Math.round(inscrSub * FEES.TAX * 100) / 100;
  const urnSub = URN.price * urn;
  const urnTax = Math.round(urnSub * FEES.TAX * 100) / 100;
  return Math.round(price + ecf(price) + FEES.OC * oc + FEES.REC * rec + inscrSub + tax + urnSub + urnTax);
}

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
  `is required — two fit per niche. The ${URN.name} (${URN.maker}) is ` +
  `$${URN.price.toLocaleString('en-US')} each on the urn price list — merchandise, not a fee, ` +
  'and taxed at 10.4% like the inscription.';

// ── Price tiers (the 3 prices still for sale) ────────────────────────────────
// The tier hue lives on the price CHIP only, never on the cell fill — the cell fill is
// polished granite, and status is coded by pattern and brightness so no hue is ever
// doing two jobs.
//
// The sheet printed FIVE prices. Levels B ($4,995) and F ($7,995) sold out entirely on
// the 2026-08-01 export, so their tiers were removed: the gate refuses a tier no niche
// carries, and a legend swatch for a price a family cannot buy is a promise the wall
// can't keep. The class names of the surviving tiers are UNCHANGED (t1/t2/t4) so the
// green/olive/red ramp a counselor already knows still means the same three prices.
// If B or F is ever released again, restore its entry here — the old values were
// t0 $4,995 #1a6fae/#fff and t4 $7,995 #e07b12/#0e1729.
export const TIERS = [
  { p: 5995, l: '$5,995', c: 't1', bg: '#219866', fg: '#0e1729' },
  { p: 6995, l: '$6,995', c: 't2', bg: '#a89f14', fg: '#0e1729' },
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
