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
 * ✔ RESOLVED 2026-08-01 — the level-C discrepancy. The export's summary said **Level C:
 * 12 available** while its detail listed **11 C spaces**, and this file shipped the
 * detail's 11 with the difference flagged for the operator. The MIS WALL VIEW settles
 * it: row C's available set is exactly those 11 spaces (7, 9, 12, 13, 14, 18, 20, 22,
 * 24, 25, 26) and there is no twelfth. THE SUMMARY'S "12" WAS WRONG. The lot inquiry
 * exported the same day agrees independently — it returns 11 Available rows in row C,
 * and shows the three C spaces this file records as sold since the sheet (10, 11, 19)
 * carrying owners. Nothing about what ships changes; the flag comes off.
 * Level D corroborates too: available = 15, 20, 24, 26 plus the on-hold 18.
 *
 * The list is treated as the COMPLETE available set as of 2026-08-01: a level absent from
 * it (all of F) has sold out. Nineteen niches the sheet priced are therefore gone, and
 * they are recorded in SOLD_SINCE_SHEET below rather than silently deleted, so a later
 * reader can see what moved and when.
 *
 * ── $0 IS NOT A PRICE → AND THESE TWO ARE ON HOLD (operator ruling 2026-08-01) ────
 * The export lists B-10 and D-18 as available at **$0**. The operator's rule from the
 * Columbarium — "available as long as a price greater than 0 is attached" — makes a $0
 * position NOT OFFERED, and that still holds: nothing on this wall may ever print $0.
 *
 * Asked what those two actually are, the operator RULED on 2026-08-01, verbatim:
 *
 *     "just put that theyr are on hold right now."
 *
 * So they are no longer collapsed into the generic "confirm in MIS" — they carry an
 * explicit ON HOLD status with the family's established on-hold treatment (dashed
 * outline; pattern, never hue), and the card says the space is on hold rather than
 * sending the counselor to MIS for a state MIS has already given us. They stay in
 * LISTED_NO_PRICE and out of PRICES, so no figure can reach them; delete from that list
 * and add to PRICES the day he issues one. The 2026-08-01 lot inquiry independently
 * returns both as Available, which is consistent: held, unsold, and unpriced.
 *
 * ── STATUSES ARE MIS-BACKED AS OF 2026-08-01 ──────────────────────────────────────
 * Until now this wall was TWO-STATUS: priced/available, or "confirm in MIS". The MIS Lot
 * Inquiry List for Bldg-GOM, exported the same day (grammar "Wall-1 Lvl-C Sp-7" →
 * GOM-1-1-C-7), gives the state of every one of the 168 spaces, so the unavailable side
 * is now split the way ROAC's and ECL's are: OCCUPIED (an interment is present) and
 * RESERVED (sold, no interment yet). The inquiry is one row per right of interment —
 * 200 rows over 168 spaces, the surplus being second interments — and rolled up
 * worst-status-wins it reconciles with this file EXACTLY:
 *
 *   MIS Available 20  ==  the 18 in PRICES + the 2 in LISTED_NO_PRICE. Not one space
 *                         the inquiry calls available is missing from this file, and
 *                         not one space this file offers is anything but Available in
 *                         the inquiry. The available set does not move.
 *   MIS Occupied  92  \  the 146 this file carried as the single 'unavailable'
 *   MIS Reserved  54  /
 *   MIS Not For Sale 2   B-7 and B-11 — see below
 *
 * An interment list can only ever REMOVE availability, never add it (absence from it is
 * not proof a space is for sale). Nothing here needed removing.
 *
 * ── B-7 AND B-11: "NOT FOR SALE", NO RULING YET ───────────────────────────────────
 * Two sources now agree that B-7 and B-11 are NOT FOR SALE, a state distinct from B-10's
 * on-hold: the lot inquiry returns them with status "Not For Sale", and the operator's
 * MIS wall view marks both with the X marker. This file previously read them as SOLD
 * (they are in SOLD_SINCE_SHEET, having carried a price on the Jan-30-2025 sheet and
 * dropped off the availability export).
 *
 * NO NOT-FOR-SALE STATE SHIPS FOR THEM YET — the operator has not ruled on what it means
 * here, and every reading of it is unsellable anyway, so the safe states are identical.
 * They stay exactly as they were. Recorded here so the observation is not lost, and
 * open in the sprint report.
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
 * ON HOLD — operator ruling 2026-08-01, verbatim: "just put that theyr are on hold right
 * now." Exactly the two $0 spaces above; the list is derived from LISTED_NO_PRICE rather
 * than retyped so the two can never drift apart. An on-hold space is UNSELLABLE and
 * carries no price anywhere, but it is a different thing from "confirm in MIS": MIS has
 * already told us what it is.
 */
export const ON_HOLD = [...LISTED_NO_PRICE];

/**
 * MIS-BACKED STATUSES, Lot Inquiry List for Bldg-GOM exported 2026-08-01 (see the
 * header). Keyed `<row>-<column>`, in the wall's own reading order. Together with PRICES
 * and ON_HOLD these cover all 168 spaces; anything left over is 'unavailable', which
 * today is B-7 and B-11 alone.
 *
 * These are LIVE HAND-MAINTAINED DATA like everything else here: when a niche sells or an
 * interment is made, edit this file and rebuild.
 */
export const OCCUPIED = [
  'G-9', 'G-12', 'G-18', 'G-20', 'G-21', 'G-22', 'G-24', 'F-9', 'F-11', 'F-12', 'F-13', 'F-16',
  'F-17', 'F-18', 'F-20', 'F-22', 'F-23', 'E-5', 'E-6', 'E-7', 'E-8', 'E-9', 'E-10', 'E-12',
  'E-13', 'E-15', 'E-17', 'E-18', 'E-19', 'E-21', 'E-22', 'E-24', 'E-26', 'E-27', 'E-28',
  'D-5', 'D-6', 'D-7', 'D-9', 'D-10', 'D-11', 'D-12', 'D-13', 'D-14', 'D-16', 'D-17', 'D-19',
  'D-23', 'D-25', 'D-27', 'D-28', 'C-5', 'C-6', 'C-8', 'C-10', 'C-11', 'C-15', 'C-17', 'C-23',
  'C-27', 'C-28', 'B-2', 'B-4', 'B-5', 'B-6', 'B-8', 'B-12', 'B-16', 'B-23', 'B-24', 'B-26',
  'B-27', 'B-29', 'B-30', 'B-31', 'A-1', 'A-2', 'A-3', 'A-7', 'A-9', 'A-10', 'A-11', 'A-12',
  'A-13', 'A-14', 'A-20', 'A-25', 'A-26', 'A-27', 'A-29', 'A-30', 'A-31',
];
export const RESERVED = [
  'G-10', 'G-11', 'G-16', 'G-17', 'G-19', 'G-23', 'F-10', 'F-14', 'F-15', 'F-19', 'F-21',
  'F-24', 'E-11', 'E-14', 'E-16', 'E-20', 'E-23', 'E-25', 'D-8', 'D-21', 'D-22', 'C-16',
  'C-19', 'C-21', 'B-1', 'B-3', 'B-9', 'B-13', 'B-14', 'B-15', 'B-17', 'B-18', 'B-19', 'B-20',
  'B-21', 'B-22', 'B-25', 'B-28', 'B-32', 'A-4', 'A-5', 'A-6', 'A-8', 'A-15', 'A-16', 'A-17',
  'A-18', 'A-19', 'A-21', 'A-22', 'A-23', 'A-24', 'A-28', 'A-32',
];

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
  /** Where the statuses (not the availability) come from. */
  statusSource: 'MIS Lot Inquiry List for Bldg-GOM, 2026-08-01',
  /**
   * The one place the export contradicted itself, and how it was settled. This field
   * used to carry an UNRECONCILED warning; it now carries the finding, and the page
   * prints it as a resolution rather than as a caveat. It is kept — rather than deleted
   * — because a counselor who read the old page needs to see the summary's 12 explained,
   * not silently vanish.
   */
  resolved: {
    on: '2026-08-01',
    source: 'MIS wall view, corroborated by the same-day lot inquiry',
    finding:
      'The export summary said Level C had 12 available while its detail listed 11. ' +
      'The MIS wall view shows row C’s available set is exactly those 11 spaces — ' +
      'the summary’s twelfth does not exist. Nothing shown here changed.',
  },
};

/**
 * Status vocabulary. Extended 2026-08-01 from ONE unsellable status to four — the MIS
 * lot inquiry can tell an interment from a reservation and the price sheet cannot, and
 * the operator has ruled the two $0 spaces are on hold. 'unavailable' survives as the
 * fail-safe for a space no source accounts for.
 */
export const STATUS_LABEL = {
  occupied: 'Occupied', reserved: 'Reserved', hold: 'On Hold', unavailable: 'Confirm in MIS',
};
/** Statuses that must never render a price, anywhere, in any view. */
export const UNSELLABLE = ['occupied', 'reserved', 'hold', 'unavailable'];

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

/**
 * The unsellable status of a space that carries no price. ON HOLD is checked BEFORE the
 * inquiry's own reading, because the operator's ruling about those two outranks it (the
 * inquiry calls them Available, which they are not — they are held and unpriced).
 * A space in none of the lists falls through to 'unavailable', the original fail-safe.
 */
const HOLD_SET = new Set(ON_HOLD), OCC_SET = new Set(OCCUPIED), RES_SET = new Set(RESERVED);
function statusOf(id) {
  if (HOLD_SET.has(id)) return 'hold';
  if (OCC_SET.has(id)) return 'occupied';
  if (RES_SET.has(id)) return 'reserved';
  return 'unavailable';
}

/** Every niche the wall carries, in reading order (top row first, left to right). */
export function allNiches() {
  const out = [];
  for (const r of ROWS) {
    for (const [a, b] of ROW_RUNS[r]) {
      for (let c = a; c <= b; c++) {
        const id = `${r}-${c}`;
        const p = Object.prototype.hasOwnProperty.call(PRICES, id) ? PRICES[id] : null;
        // A PRICE is what makes a space sellable — that rule is unchanged and comes
        // first, so no MIS status can ever turn a priced space unsellable-by-accident or
        // an unpriced one into money. Everything below only refines WHY a space is not
        // for sale, and every branch of it is unsellable.
        out.push({
          row: r, col: c, block: blockOf(c), id, ref: refOf(r, c),
          p, st: p !== null ? 'available' : statusOf(id),
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
