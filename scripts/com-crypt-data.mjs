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
 * READING RULE (operator, 2026-07-29): a PRINTED PRICE means AVAILABLE; a "NOT SELLING"
 * cell is BLOCKED; EVERYTHING ELSE IS UNAVAILABLE — "confirm in MIS", with no claim of
 * sold vs reserved. Cell colours and dotted marks carry NO meaning.
 *
 * SUPERSEDED FOR CRYPT STATUSES ONLY, 2026-08-01: every crypt status now comes from the
 * MIS Lot Inquiry List printed 8/1/2026 (see `MIS` below), which states sold / reserved /
 * available per position instead of leaving it at "confirm in MIS". The reading rule
 * still governs everything else the sheet supplied — the geometry, the segment types and
 * the withheld prices. Niche-wall statuses are still sheet-derived; the list does not
 * cover sections RAD and SER.
 *
 * ── CRYPT PRICES, LOADED FROM MIS 2026-08-01 ─────────────────────────────────
 * Crypts now carry REAL prices. They come from the operator-supplied MIS export
 * `available-crypts-prices.csv` (2026-08-01) — one row per available crypt POSITION,
 * 695 rows, columns lot_location / level / space / price / ecf. See `PRICES` below
 * for the parse, the per-unit derivation and the two units MIS could not price.
 *
 * THE 4px SHEET DECODE IS RETIRED. Until today the only price source was the crypt
 * sheet, whose price text is FOUR PIXELS tall: at that size its bold bitmap font draws
 * only EIGHT distinct 3x4 glyph shapes for ten digits, so '3'/'9' and '1'/'4' collide
 * and a five-figure amount cannot be read with certainty. That call was right — and it
 * was worse than it looked. Checked against MIS, only 5 of the 51 transcribed decodes
 * survive; the other 46 are contradicted outright, and the failure is not only digit
 * collision but COLUMN mis-registration (tier F of columns 221 and 229 both decoded
 * "$?0,7?5"; MIS prices them $25,995 and $30,795). The `sheetRaw` field is therefore
 * DELETED rather than kept as a hint — every unit it covered is now priced from MIS,
 * and a decode that is wrong nine times in ten is not a diagnostic, it is a trap.
 *
 * The two NICHE WALL sheets are ordinary-resolution and fully legible, so those
 * prices ARE real, transcribed exactly, and drive the card math.
 *
 * GEOMETRY IS ESTIMATED from the CAD plan and the operator's photographs — display
 * values for the 3D scene, not fabrication data. The page renders NO dimensions for
 * crypts.
 *
 * THE NICHE WALLS ARE THE EXCEPTION, AND SINCE 2026-08-02 THEY ARE MEASURED. Their
 * sheets print real dimensions, and every niche now carries the size class it is drawn
 * at — see RAD_ROW_CLASSES / SER_ROW_CLASSES below and scripts/measure_niche_sheets.mjs,
 * which derives them from the sheet pixels. Both walls render at true relative widths.
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
  occupied: 'Occupied',
  reserved: 'Reserved',
  blocked: 'Not Selling',
  unlisted: 'Unavailable',
  unpriced: 'Not Offered',
  unavailable: 'Unavailable',
};

/**
 * STATUS SOURCE — MIS Lot Inquiry List, printed 8/1/2026, criteria Location = WMP,
 * Section = COM. Every CRYPT status below is MIS-backed as of that date. Statuses are
 * still HAND-MAINTAINED going forward: nothing re-reads MIS, so a sale made after
 * 8/1/2026 is not reflected until someone re-runs the list and updates this file.
 *
 * The list is per POSITION, not per space: a tandem crypt prints two rows, (A) and (B),
 * and an extra interment in an already-used position prints as (2nd) / (3rd). Collapsed
 * to one status per space, the 1,355 printed rows are 875 distinct spaces. A space takes
 * the status of its most-committed position, and a two-column unit (Deluxe / Hidden
 * Companion) takes the most-committed status of its two spaces.
 *
 * ST CODE VOCABULARY, exactly the five codes the list prints:
 *   Available     -> `available`  a position MIS itself offers for sale
 *   Reserved      -> `reserved`   held for an owner, no interment recorded
 *   Occupied      -> `occupied`   an interment is recorded
 *   Not For Sale  -> `blocked`    withheld from sale by the cemetery
 *   Not Assigned  -> `blocked`    one position; not offered, treated as unsellable
 *   (absent)      -> `unlisted`   see below
 *
 * `unlisted` is the fail-safe class: a position the 2026-07-29 crypt sheet called NOT
 * SELLING that the MIS list does not carry at all. Absence from an inventory list is
 * NOT proof a space is for sale, so these stay unsellable and render exactly like the
 * old "Unavailable — confirm in MIS" cell. All 18 are tiers E/F/G of columns 138-143,
 * directly above the two EMPTY-AREA voids — the sheet and MIS agree by two independent
 * routes that nothing there is sellable.
 *
 * WHAT THE MIS LIST DOES NOT COVER: the two glass-front niche walls. Their refs are
 * sections RAD and SER, and the list was run for Section = COM only, so RAD_CELLS /
 * SER_CELLS statuses are UNCHANGED and remain sheet-derived. Absence there is a
 * query-scope artifact, not evidence.
 *
 * NO PERSONAL DATA CROSSED. The list carries owner names, owner ids, interment numbers
 * and ages; the parser read the ST column and the Lot Location column and nothing else.
 * Nothing identifying appears in this file, in the generated page, or in any commit.
 */
export const MIS = {
  printed: '2026-08-01',
  criteria: 'Location = WMP, Section = COM',
  resultRows: 1355,   // the list's own printed "Results:" figure
  depthRows: 480,     // rows beyond the first for a space: (B), (2nd), (3rd), (A-2nd)…
  spaces: 875,        // distinct crypt spaces the list covers = resultRows - depthRows
  // per-SPACE status counts, straight off the parse. These sum to `spaces`.
  spaceStatus: { available: 430, occupied: 244, reserved: 198, blocked: 3 },
  // the two ST codes that collapse into `blocked`, kept so the split is not lost
  blockedCodes: { 'Not For Sale': 2, 'Not Assigned': 1 },
  // Companion crypts (Deluxe / Hidden) are ONE purchasable unit over TWO space numbers,
  // so the unit takes the more-committed of its two MIS rows. 17 of them hold one
  // occupied space and one reserved space; those 17 reserved spaces render as occupied.
  // Nothing else in the rendering differs from the parse.
  mergedSpaces: 17,
};

/**
 * PRICE SOURCE — MIS export `available-crypts-prices.csv`, supplied 2026-08-01,
 * columns lot_space_id, lot_location, building, level, space, property_type,
 * sell_unit_status, space_status, price, ecf, use_inventory_price, item_price,
 * inventory_price. Every row is `space_status = Available`, `property_type = CRYPT`,
 * `building = COM`. It carries NO name, owner id, interment number or age — checked
 * column by column, every field is an id, an enum or a number — so unlike the lot
 * inquiry list it is not PII-bearing at all.
 *
 * PARSE RECONCILIATION. 695 data rows, every `lot_location` matching
 * `Bldg-COM Lvl-<A-G> Sp-<nnn>[ (A|B)]`, 0 unparsed, 0 rows that fail to land on a
 * known unit, and they land on EXACTLY the 379 units this file already called
 * `available` from the 8/1/2026 lot inquiry list — no more, no fewer. The two MIS
 * exports were run the same day and agree completely; that is the reconciliation.
 *   530 rows carry a position suffix (265 (A) + 265 (B)) = the 265 tandem units.
 *   165 rows carry none = 55 single units + 39 deluxe + 16 hidden — two rows for a
 *     companion (one per space number), one row for a single. (55 + 2x39 + 2x16 = 165.
 *     Tier G of bank 116-123 accounts for the shift from the 63/37/14 this file first
 * `price` on all 695 (`use_inventory_price` is 1 everywhere, `item_price` 0).
 *
 * PER-UNIT PRICE = THE VALUE MIS STAMPS ON THE UNIT'S ROWS, NOT THEIR SUM.
 * All 316 multi-row units carry the SAME figure on both rows: MIS stamps the whole
 * unit's price on every space/position record belonging to it, which is the same
 * "one unit, one price, never split" rule this file already applies. Three
 * independent checks, because summing instead would have doubled 316 of 377 prices:
 *   1. TIER LADDER. Bank 116-123 reads G $45,990 < F $51,990 < E $55,990 <
 *      D $61,990 = A $61,990 — the same shape every other bank has. Summing the
 *      companion tiers gives G $45,990 -> F $103,980, a 2.3x jump between adjacent
 *      tiers that no other bank in the building shows.
 *   2. THE SHEET DECODE. Of the 51 old `sheetRaw` decodes, the 5 that match MIS at
 *      all match the ROW value exactly under the documented glyph collisions
 *      ($?6,2?5 -> $36,295; $?0,7?5 -> $30,795; $26,??5 -> $26,395) and the SUM
 *      never — for 13 of them the sum is six digits against a five-digit decode.
 *   3. PRODUCT SHAPE. A True Companion (tandem) is two entombments behind ONE crypt
 *      front; a Deluxe/Hidden Companion is two entombments over TWO fronts. Read as
 *      stamped, bank 201-212 tier G prices them $12,995 and $26,395 against a $9,995
 *      single — the ordinary one-front / two-front spread.
 *
 * ── THE AVAILABILITY RULE (operator, 2026-08-01, binding) ────────────────────
 *   "yes all 379 are available as long as a price is attached to it that is
 *    greater than 0."
 *
 * So a unit renders AVAILABLE if and only if MIS says Available AND it carries a
 * unit price > 0. Both halves are required; neither alone is enough. This is the
 * rule, not a description of the current data — verify_com_map.mjs enforces it over
 * every unit, so a future re-import cannot put a priceless crypt on the market.
 *
 * It decides the two units the export could not price straightforwardly, and it
 * decides them in OPPOSITE directions:
 *
 *   COM-1-1-E-166  NOT OFFERED. Both rows carry price 0 and ecf 0, and zero is not
 *                  a price greater than zero. MIS calls the space Available; this
 *                  map does not, because there is nothing to sell it at. It takes
 *                  the `unpriced` status, renders in the unsellable family with no
 *                  figure, and does NOT count in the available histogram. Its card
 *                  says exactly what is true: MIS lists it as available but carries
 *                  no price — confirm in MIS before offering it.
 *
 *   COM-1-1-A-183  AVAILABLE at $24,995. Both rows carry 12497.5, and 12497.5 IS a
 *                  price greater than zero, so the rule puts the unit on the market.
 *                  This is the ONE unit where MIS SPLIT a unit price across its two
 *                  space records instead of STAMPING it on both (see the derivation
 *                  above), so the unit price is their SUM, 2 x 12497.5 = $24,995 —
 *                  not 12497.5, which is half a crypt and a half-dollar amount no
 *                  list price in this building has. $24,995 also equals the tier-D
 *                  hidden companion in the same bank, and bank 173-178 shows the
 *                  same tier A = tier D shape.
 *
 *                  PRICED BY SUMMATION IS AN EXCEPTION OF EXACTLY ONE UNIT. Every
 *                  other multi-row unit is priced by the stamped value and summing
 *                  it would DOUBLE the price. The gate asserts this by ref, so the
 *                  exception cannot silently generalise to a second unit.
 *
 * Prices are HAND-MAINTAINED from here, exactly like the statuses: nothing re-reads
 * MIS, so a price change after 8/1/2026 is invisible until someone re-runs the export.
 */
export const PRICES = {
  source: 'MIS available-crypts price export',
  exported: '2026-08-01',
  rows: 695,            // data rows in the export
  posRows: 530,         // rows carrying an (A)/(B) tandem position suffix
  spaceRows: 165,       // rows carrying no suffix — one per space number
  unitsCovered: 375,    // rows in the export land on 375 MIS-Available UNITS (379 before
                        // tier G of bank 116-123 became 4 companion pairs, not 8 singles)...
  unitsOffered: 374,    // ...of which 374 clear the price > 0 rule and render available
  unitsNotOffered: 1,   // COM-1-1-E-166, MIS price 0 — see the availability rule above
  unitsSummed: 1,       // COM-1-1-A-183, the single split-row unit priced by summation
  distinctPrices: 29,   // $24,995 already existed, so summing A-183 adds no new value
  availableValue: 8952545,   // sum of the 374 shipped unit prices
  ECF_RATE: 0.1,        // the export's own `ecf` column: 10% of price on every row
};

/**
 * PRICE BANDS — the chip colour on an available crypt cell.
 *
 * 29 distinct prices is far too many for one hue each (ROAC's 12-value tier palette
 * does not scale here), so the CHIP carries a band and the chip TEXT carries the exact
 * figure. Nothing is ever rounded: a $26,395 crypt reads "$26,395" and sits in the
 * $22,995–$26,395 band. Band edges are OBSERVED prices, not round numbers, so the
 * legend describes real inventory instead of an invented scale.
 *
 * Hue means money and only money — status is pattern and darkness (see the build's
 * cell CSS). Every fg/bg pair below is >= 4.5:1; verify_com_map.mjs recomputes the
 * contrast ratios rather than trusting this comment.
 */
export const PRICE_BANDS = [
  { c: 'pb1', lo: 9895,  hi: 12995, l: '$9,895 – $12,995',  bg: '#1a6fae', fg: '#ffffff' },
  { c: 'pb2', lo: 13995, hi: 16995, l: '$13,995 – $16,995', bg: '#23a06b', fg: '#0e1729' },
  { c: 'pb3', lo: 18995, hi: 21995, l: '$18,995 – $21,995', bg: '#7d9a18', fg: '#0e1729' },
  { c: 'pb4', lo: 22995, hi: 26395, l: '$22,995 – $26,395', bg: '#c39a10', fg: '#0e1729' },
  { c: 'pb5', lo: 27995, hi: 33995, l: '$27,995 – $33,995', bg: '#cf4a1c', fg: '#ffffff' },
  { c: 'pb6', lo: 36295, hi: 61990, l: '$36,295 – $61,990', bg: '#8b4fbb', fg: '#ffffff' },
];
export const priceBand = (p) => PRICE_BANDS.find((b) => p >= b.lo && p <= b.hi);

/**
 * The two units the availability rule decides, named so the gate can pin them by ref
 * instead of by count. A count would let a SECOND summed unit or a SECOND priceless
 * one appear as long as one of these was fixed; pinning the refs will not.
 */
/**
 * BANK 116-123, TIER G — the sheet drew it wrong and the operator corrected it.
 *
 * The 2026-07-29 crypt sheet draws tier G of this bank as EIGHT separate single-space
 * cells, and this file transcribed what was drawn. Two things then disagreed with it:
 *
 *   1. The MIS price export stamps $45,990 on each of the eight spaces. Read as eight
 *      singles that is a $45,990 SINGLE crypt sitting directly above $51,990 PAIRS at
 *      tier F — i.e. a single costing 88% of a two-space companion, and a per-space
 *      price of $45,990 against tier F's $25,995. Read as four pairs the bank reads
 *      G $45,990 < F $51,990 < E $55,990 < D $61,990 = A $61,990: one clean ladder.
 *   2. Every other tier of this bank is companion pairs on the same eight columns.
 *
 * OPERATOR RULING, 2026-08-01, verbatim: "4 companion pairs." So tier G is FOUR
 * two-column companion units, and the sheet's eight drawn cells are wrong.
 *
 * PAIRING AND TYPE come from the bank's own `segs` header — [[116,117,deluxe],
 * [118,121,hidden],[122,123,deluxe]] — which is the same source that types tiers F, E,
 * D and A, and which pairs them identically. So tier G is 116+117 Deluxe Companion,
 * 118+119 and 120+121 Hidden Companion, 122+123 Deluxe Companion. Nothing here is
 * invented: the pairing is the header's, the types are the header's, and the tier now
 * matches the four tiers below it column for column.
 *
 * PRICE IS STAMPED, NOT SUMMED, like every other multi-row unit in this file: the pair
 * price is $45,990, not 2 x $45,990. Capacity is 2 entombments, as for any companion.
 */
export const TIER_G_116_123 = {
  sheetDrew: '8 single crypts',
  operatorRuled: '4 companion pairs (2026-08-01)',
  units: 4,
  spaces: 8,
  unitPrice: 45990,
  pairs: [[116, 117], [118, 119], [120, 121], [122, 123]],
  types: ['deluxe', 'hidden', 'hidden', 'deluxe'],   // from BANKS['116-123'].segs
};

export const PRICE_EXCEPTIONS = {
  // Priced by SUMMING its two split rows. Exactly one unit, ever.
  summed: { ref: 'COM-1-1-A-183', rows: [12497.5, 12497.5], price: 24995 },
  // MIS says Available but carries no price, so this map does not offer it.
  notOffered: { ref: 'COM-1-1-E-166', misPrice: 0, status: 'unpriced' },
};

// ── Fees ──────────────────────────────────────────────────────────────────────
/**
 * Crypt fee box. THE QUOTE TOOL IS THE SOURCE for recording, opening & closing and
 * the monobar; only VASE is still read off the sheet (COM Maus Crypts.png). The
 * sheet's recording row was legible at $225 and its O&C and monobar rows printed as
 * ######## (column too narrow) and were carried here as OMITTED_FEES. The operator
 * settled all three across two rulings on 2026-08-01, verbatim:
 *
 *   "here all the crypt prices for the chapel of memories. the only other cost is
 *    the crypt monobar price which lives in the quote tool."
 *   "opening and clsoing and recording fee prices need to be taken from the quote
 *    tool as well."
 *
 * The second ruling SUPERSEDES the first reading of the first. On 2026-08-01 this
 * file briefly recorded "a crypt carries no O&C" — that inference from "the only
 * other cost" was wrong, and it is corrected here: crypts DO carry an opening &
 * closing, and it comes from the tool like the rest. The crypt sheet's fee box is
 * SUPERSEDED except for the vase.
 *
 * Every figure below that comes from the tool, with where it is written down:
 *      RECORDING        index.html BW_FEES key 'RECORDING:all' = 235, generated from
 *                       data/prices.json. SUPERSEDES the $225 the crypt sheet printed
 *                       (this file carried 225 until the 2026-08-01 ruling). The tool
 *                       quotes it as "Recording Fee – Entombment".
 *      OC               index.html BW_FEES key 'OC:mausoleum_entombment' = 1205, from
 *                       data/prices.json, quoted by the tool as "Mausoleum Entombment
 *                       O&C" on both its Indoor and Outdoor Mausoleum arrangements.
 *                       This is a DIFFERENT fee from the glass-front niche O&C of $875
 *                       in NICHE_FEES, and the two must never be interchanged.
 *  - the MONOBAR rows are sourced FROM THE QUOTE TOOL too, which the ruling
 *    names and which is the only place those two figures are written down:
 *      MONOBAR          index.html's BW_FEES key 'MONOBAR:crypt' = 1445, generated
 *                       from data/prices.json (source: CRYPTS - ETERNAL LIGHT
 *                       MAUSOLEUM_01-2025.xlsx, also_in GARDEN COURT -2025.xlsx).
 *      MONOBAR_INSTALL  225 — the literal index.html quotes at all four of its
 *                       monobar call sites, e.g. the option "Monobar Court O / Crypt
 *                       — $1,670" (= 1445 + 225). data/prices.json carries BOTH 215
 *                       (the workbook) and a later 225 record dated 2026-07-26 whose
 *                       note reads "The workbook prints 215. The tool quotes 225 and
 *                       is correct." This file used to carry the workbook's 215; it
 *                       now follows the tool, as the ruling directs.
 * The tool sells the monobar as ONE optional add-on at one quantity (its "Indoor
 * Mausoleum Arrangement" checkbox), billed as two taxable lines. The card mirrors
 * that framing exactly: optional, one quantity, two lines. Recording and O&C are not
 * optional and are not a quantity — the card applies each once, as the tool does per
 * arrangement.
 *
 * WHAT IS STILL THE SHEET'S: the vase only. And the E.C.F., which the MIS price export
 * carries in its own `ecf` column at 10% of price and which agrees with the sheet.
 */
export const CRYPT_FEES = {
  RECORDING: 235,
  OC: 1205,
  MONOBAR: 1445,
  MONOBAR_INSTALL: 225,
  VASE: 415,
  ECF_RATE: 0.1,
};
/**
 * Where each crypt fee came from, rendered on the page so a counselor reading a total
 * can see which book it was priced out of without opening this file.
 */
export const CRYPT_FEE_SOURCE = 'Recording, opening & closing and monobar come from the quote tool (operator, 2026-08-01); the crypt sheet’s fee box is superseded. The vase is the sheet’s.';
// Radiance / Serenity fee box — both walls are GLASS-FRONT, so they carry the uniform
// glass-front schedule, not the figures printed on their own wall sheets ($835 / $225).
// OPERATOR RULING, Map Issues 07.31.26: "All glass front niches should have the same
// opening and closing and recording fee ... The opening and closing fee is 875 and the
// recording fee is 235 same 10% ecf applies." No inscription fee, and no sales tax —
// the tax exception is ECL's bronze add-ons only, which these walls do not offer.
// This schedule must never be applied to the COM CRYPTS above (CRYPT_FEES) — crypts are
// a different product with their own fee box.
//
// AND THE MIRROR, operator 2026-08-01 (binding): the ruling that recording and opening &
// closing "need to be taken from the quote tool as well" — the one that moved CRYPT_FEES
// to $235 / $1,205 — "only applies to the crypts not the niches." So NICHE_FEES is
// UNCHANGED by that ruling and stays exactly as the 2026-07-31 glass-front ruling set it:
// O&C $875, recording $235, 10% E.C.F., no inscription, no tax. The two schedules move
// independently in BOTH directions, and verify_com_map.mjs asserts it both ways.
//
// The recording fees coinciding at $235 is not a shared value — it is two books that
// happen to agree. The tell that they are separate is the O&C: $1,205 to entomb in a
// crypt, $875 to inurn in a glass-front niche. Never interchange them.
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

/**
 * BANK DEPTH IS DERIVED, NOT DRAWN (operator ruling, 2026-08-01):
 *   "the crypts are pretty deep as usually two caskets fit inside one crypt
 *    (if its tandem)."
 *
 * A True Companion (tandem) crypt is entered from ONE face and holds two caskets
 * END-TO-END, so the bank block is two casket-lengths deep (~15 ft). Singles and the
 * side-by-side companion types (Deluxe Companion, Hidden Companion) are one casket
 * deep (~7.5 ft). COLW 19 = 3 ft, so 1 ft = 6.33 plan units.
 *
 * This REPLACES the per-bank rectangle depths that were read off the CAD by eye: MIS
 * draws some tandem banks with both halves (111-115, 124-140) and others as a single
 * band, so the drawing is not a reliable depth source. `bankDepth` is. A bank with a
 * mix of segment types takes the DEEPEST type present, because the deep run has to fit.
 *
 * Depth always grows AWAY from `face` — the crypt-front line stays exactly where the
 * CAD puts it, which is what the wall-line anchors in verify_com_map.mjs check.
 *
 * EXEMPT: the centre island. It is a free-standing block whose outline a counselor
 * walks around, and its two long faces are back-to-back on ONE ~23 ft block. The
 * tandem runs on those two faces INTERLEAVE by column — 220-231's tandem is 224-227
 * while 201-212 carries singles/deluxe there, and 201-212's tandems 201-204 / 209-212
 * sit behind 220-231's singles/deluxe — so no column is tandem from both sides and the
 * block does not need to be two tandem-depths thick. Its footprint stays as the CAD
 * draws it; see the depth gate in verify_com_map.mjs, which scopes the rule to the
 * wall-mounted banks and checks the island's block depth separately.
 */
export const TANDEM_DEPTH = 95;   // two caskets end-to-end, ~15 ft
export const SINGLE_DEPTH = 47;   // one casket, ~7.5 ft
export const bankDepth = (b) => (b.segs.some((s) => s[2] === 'tandem') ? TANDEM_DEPTH : SINGLE_DEPTH);
export const ROWH = 16;      // one tier, ~2.5 ft
export const EYE_Y = 24;     // walkthrough eye height above the model's floor plane

export const AREAS = [
  { id: 'north', label: 'North Wing', sub: 'Altar end — banks 111-115, 116-123, 124-140', stop: 'north-wing' },
  { id: 'west', label: 'Chapel & West Wall', sub: 'The worship space and bank 101-110', stop: 'chapel' },
  { id: 'island', label: 'Centre Island', sub: 'Free-standing block — banks 194-200, 220-231, 201-212, 213-219', stop: 'island-west' },
  { id: 'south', label: 'South Wall', sub: 'Banks 192-193, 185-191, 179-184, 173-178, 168-172', stop: 'south-wall' },
  { id: 'east', label: 'East Corridor & Entrance', sub: 'Banks 141-148, 149-153, 154-158, 159-167', stop: 'entrance-main' },
  // ONE ENTRY PER NICHE WALL (operator, 2026-08-02) — these two used to be a single
  // "Niche Walls" area, so choosing Radiance always brought Serenity with it.
  { id: 'rad', label: 'Radiance Niche Wall', sub: 'Glass-front columbarium in the daylit alcove north-west of the chapel', stop: 'radiance' },
  { id: 'ser', label: 'Serenity Niche Wall', sub: "Glass-front columbarium in the north hall, at the island’s north-east corner", stop: 'serenity' },
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
  { id: '124-140', area: 'north', c0: 124, c1: 140, face: 'S', plan: { x: 250, y: 3, w: 323, h: 95 }, segs: [[124, 140, 'tandem']] },
  // ── West wall ──
  { id: '101-110', area: 'west', c0: 101, c1: 110, face: 'E', plan: { x: 3, y: 172, w: 95, h: 190 }, segs: [[101, 102, 'deluxe'], [103, 110, 'tandem']] },
  // ── Centre island ── (footprint x 234-562, z 166-312)
  { id: '194-200', area: 'island', c0: 194, c1: 200, face: 'W', plan: { x: 234, y: 172, w: 54, h: 133 }, segs: [[194, 194, 'single'], [195, 196, 'deluxe'], [197, 197, 'single'], [198, 199, 'deluxe'], [200, 200, 'single']] },
  { id: '220-231', area: 'island', c0: 220, c1: 231, face: 'N', plan: { x: 290, y: 166, w: 228, h: 54 }, segs: [[220, 220, 'single'], [221, 222, 'deluxe'], [223, 223, 'single'], [224, 227, 'tandem'], [228, 228, 'single'], [229, 230, 'deluxe'], [231, 231, 'single']] },
  { id: '201-212', area: 'island', c0: 201, c1: 212, face: 'S', plan: { x: 290, y: 266, w: 228, h: 46 }, segs: [[201, 204, 'tandem'], [205, 205, 'single'], [206, 207, 'deluxe'], [208, 208, 'single'], [209, 212, 'tandem']] },
  { id: '213-219', area: 'island', c0: 213, c1: 219, face: 'E', plan: { x: 516, y: 172, w: 46, h: 133 }, segs: [[213, 213, 'single'], [214, 215, 'deluxe'], [216, 216, 'single'], [217, 218, 'deluxe'], [219, 219, 'single']] },
  // ── South wall ── (numbering runs east to west: 185 nearest the middle, 193 at the west end)
  { id: '192-193', area: 'south', c0: 192, c1: 193, face: 'N', plan: { x: 135, y: 378, w: 38, h: 47 }, segs: [[192, 193, 'single']] },
  { id: '185-191', area: 'south', c0: 185, c1: 191, face: 'N', plan: { x: 169, y: 378, w: 133, h: 95 }, segs: [[185, 191, 'tandem']] },
  { id: '179-184', area: 'south', c0: 179, c1: 184, face: 'N', plan: { x: 296, y: 426, w: 114, h: 47 }, segs: [[179, 180, 'hidden'], [181, 181, 'single'], [182, 182, 'single'], [183, 184, 'hidden']] },
  { id: '173-178', area: 'south', c0: 173, c1: 178, face: 'N', plan: { x: 404, y: 378, w: 114, h: 95 }, segs: [[173, 178, 'tandem']] },
  { id: '168-172', area: 'south', c0: 168, c1: 172, face: 'W', plan: { x: 518, y: 378, w: 47, h: 95 }, segs: [[168, 172, 'single']] },
  // ── East corridor & entrance ── (a separate wing east of the COM shell; the ENTRANCE
  //    is the gap between 149-153 and 154-158, shared with ELM-3)
  { id: '141-148', area: 'east', c0: 141, c1: 148, face: 'W', plan: { x: 638, y: 38, w: 95, h: 152 }, segs: [[141, 148, 'tandem']] },
  { id: '149-153', area: 'east', c0: 149, c1: 153, face: 'S', plan: { x: 638, y: 185, w: 95, h: 47 }, segs: [[149, 150, 'deluxe'], [151, 153, 'single']] },
  { id: '154-158', area: 'east', c0: 154, c1: 158, face: 'N', plan: { x: 638, y: 268, w: 95, h: 47 }, segs: [[154, 156, 'single'], [157, 158, 'deluxe']] },
  { id: '159-167', area: 'east', c0: 159, c1: 167, face: 'W', plan: { x: 638, y: 312, w: 95, h: 171 }, segs: [[159, 167, 'tandem']] },
];

/** Rooms and circulation, all measured off the CAD plan. */
export const ROOMS = [
  { id: 'chapel', label: 'Chapel — Worship Space', x: 98, y: 112, w: 136, h: 256, kind: 'chapel' },
  { id: 'restrooms', label: 'Rest Rooms', x: 573, y: 3, w: 56, h: 95, kind: 'service' },
  { id: 'storage', label: 'Storage Room', x: 630, y: 3, w: 97, h: 95, kind: 'service' },
  { id: 'hall-n', label: 'North Hall', x: 240, y: 98, w: 254, h: 68, kind: 'hall' },
  // The daylit alcove the Radiance wall stands in — video 1:59-2:04: carpeted floor,
  // rose-marble walls, two arched windows in the west exterior wall, two armchairs and
  // a small table under them. The model had this bay as bare plan.
  { id: 'alcove-rad', label: 'Radiance Alcove', x: 3, y: 98, w: 107, h: 74, kind: 'hall' },
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
 * space in the recess in front of bank 116-123, between banks 111-115 and 124-140.
 *
 * ── REWORKED 2026-08-01 FROM THE WALKTHROUGH VIDEO (sprint-10 Track X) ────────
 * `D:\Cemetery Photos Misc\Chapel of Memories\20260729_124129.mp4`, frames at 1 fps.
 * The video's chapel segment runs 0:00-0:15 and shows the whole seating court and both
 * flanking walls. Against the sprint-09 placement (which came from stills):
 *
 *  - CONFIRMED: the seating is loose rows of individual chairs in two blocks either
 *    side of a centre aisle, all facing NORTH toward the recess. Frames 0:03 and 0:06
 *    look along the rows at the recess; frame 0:03 (chair crop) shows the row pitch.
 *  - DROPPED, `lectern`: no lectern stands anywhere in the court in 0:00-0:15. It was
 *    inferred from a still; the video's wider coverage of the same room shows none.
 *  - CORRECTED, `piano`: it is a SQUARE GRAND (rectangular case, carved cabriole legs,
 *    ~6'8" x 3'4"), long axis running east-west across the front of the seating, not
 *    the 34x24 block used before. Frames 0:04-0:07 show the case end-on and in plan.
 *  - ADDED, `urn`: a tall black pedestal urn carrying a large floral arrangement stands
 *    between the piano and the recess and is the most prominent object in every chapel
 *    frame (0:01, 0:04, 0:06, 0:07). Its absence is why the rendered chapel read empty.
 *  - CORRECTED, benches: ONE long upholstered bench runs across the front of the left
 *    seating block (0:03, 0:04) and a short striped piano bench sits at the piano
 *    (0:05-0:07) — not two matching benches.
 *  - ADDED, `window`: a tall stained-glass window is set into the wall the seating
 *    faces, immediately west of the recess (0:01, 0:03, 0:06; the same window family
 *    appears again at 1:52-1:58). It is the one fixed landmark a counselor standing in
 *    the chapel can orient by, and nothing represented it before.
 *
 * The altar box is KEPT: the CAD prints ALTAR in this recess, and in every video frame
 * the recess floor is masked by the piano and the urn, so the video neither confirms
 * nor denies a table there. Chair counts and spacings remain ESTIMATED — the video's
 * angles are too oblique to count rows reliably, so the 5 x 7 x 2 grid is UNCHANGED
 * rather than replaced with a worse guess. No dimension is rendered.
 */
export const CHAIR_BLOCKS = [
  { id: 'left', x0: 112, cols: 5, dx: 11 },
  { id: 'right', x0: 176, cols: 5, dx: 11 },
];
export const CHAIR_ROWS = { z0: 140, rows: 7, dz: 20, w: 8, d: 8 };

export const FURNITURE = [
  { id: 'altar', kind: 'altar', label: 'Altar', x: 148, y: 83, w: 35, h: 16, tall: 22 },
  { id: 'window-sg', kind: 'window', label: '', x: 104, y: 51, w: 24, h: 5, tall: 40 },
  { id: 'piano', kind: 'piano', label: 'Piano', x: 182, y: 100, w: 42, h: 22, tall: 14 },
  { id: 'urn', kind: 'urn', label: '', x: 166, y: 101, w: 12, h: 12, tall: 26 },
  { id: 'armchair-a', kind: 'seat', label: '', x: 160, y: 126, w: 11, h: 11, tall: 13 },
  { id: 'armchair-b', kind: 'seat', label: '', x: 228, y: 108, w: 11, h: 11, tall: 13 },
  { id: 'bench-front', kind: 'bench', label: '', x: 110, y: 128, w: 46, h: 9, tall: 9 },
  { id: 'bench-piano', kind: 'bench', label: '', x: 194, y: 126, w: 22, h: 8, tall: 8 },
  // ── Corridor benches ────────────────────────────────────────────────────────
  // Every hallway bay in the video has a low upholstered bench standing free in the
  // middle of the floor, facing the crypt wall: north hall 0:16-0:23, east passage
  // 0:24-0:37 and 1:04-1:11, south hall 0:43-1:03. They are what the corridors are
  // furnished with, and the model had bare floor. Positions are one per bay and
  // ESTIMATED; the fact of a bench in each bay is not.
  { id: 'hb-n1', kind: 'bench', label: '', x: 292, y: 127, w: 32, h: 10, tall: 9 },
  { id: 'hb-n2', kind: 'bench', label: '', x: 372, y: 127, w: 32, h: 10, tall: 9 },
  { id: 'hb-n3', kind: 'bench', label: '', x: 448, y: 127, w: 32, h: 10, tall: 9 },
  { id: 'hb-e1', kind: 'bench', label: '', x: 591, y: 158, w: 10, h: 32, tall: 9 },
  { id: 'hb-e2', kind: 'bench', label: '', x: 591, y: 246, w: 10, h: 32, tall: 9 },
  { id: 'hb-e3', kind: 'bench', label: '', x: 591, y: 334, w: 10, h: 32, tall: 9 },
  { id: 'hb-e4', kind: 'bench', label: '', x: 591, y: 422, w: 10, h: 32, tall: 9 },
  { id: 'hb-s1', kind: 'bench', label: '', x: 186, y: 340, w: 32, h: 10, tall: 9 },
  { id: 'hb-s2', kind: 'bench', label: '', x: 278, y: 340, w: 32, h: 10, tall: 9 },
  { id: 'hb-s3', kind: 'bench', label: '', x: 372, y: 340, w: 32, h: 10, tall: 9 },
  { id: 'hb-s4', kind: 'bench', label: '', x: 466, y: 340, w: 32, h: 10, tall: 9 },
  // -- Radiance alcove, from the video at 1:59-2:04 -------------------------
  // TWO arched clear-glazed windows in the west exterior wall (2:00, 2:04 show them
  // side by side, full height, with a semicircular head), and the two armchairs and
  // the small round table that stand under them (2:00). This is the brightest room in
  // the building and the model rendered it as bare floor.
  { id: 'archwin-rad-n', kind: 'archwin', label: '', x: 3, y: 104, w: 5, h: 28, tall: 46 },
  { id: 'archwin-rad-s', kind: 'archwin', label: '', x: 3, y: 138, w: 5, h: 28, tall: 46 },
  { id: 'alcove-chair-a', kind: 'seat', label: '', x: 14, y: 108, w: 11, h: 11, tall: 13 },
  { id: 'alcove-chair-b', kind: 'seat', label: '', x: 14, y: 142, w: 11, h: 11, tall: 13 },
  { id: 'alcove-table', kind: 'bench', label: '', x: 15, y: 126, w: 9, h: 9, tall: 8 },
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
/**
 * MATERIAL ZONES (walkthrough video, 2026-08-01).
 *
 * The model rendered every wall in one cream stone. The building is two stones and
 * the change is abrupt and obvious on film:
 *
 *  - CREAM TRAVERTINE, pale with rust veining: the chapel and everything around it --
 *    the worship space and its two flanking walls (0:00-0:14), the corridors leading
 *    out of it (0:15-1:11), and the stained-glass wall on the chapel west side
 *    (1:52-1:58).
 *  - ROSE MARBLE, deep red-brown with white veining and a dark speckled base course:
 *    the whole north-east wing beyond the glazed interior screen at 1:12 -- the rest
 *    room hall (1:16-1:24), the Serenity end (1:25-1:28), the long north hall
 * The east corridor is NOT rose: 0:54-1:11 is cream travertine end to end, with rose
 * only in the door surrounds and pilasters.
 *    (1:29-1:46) -- and the Radiance alcove (1:59-2:04).
 *
 * A zone is a plan rectangle; anything whose centre falls in one is drawn in that
 * stone, and everything else stays cream. This is appearance only: no ref, count,
 * status or price depends on it.
 */
export const MATERIALS = { DEFAULT: 'cream' };
export const MATERIAL_ZONES = [
  // north-east wing: north hall, rest rooms, east passage and the Serenity end
  { id: 'rose-ne', mat: 'rose', x: 240, y: 3, w: 400, h: 230 },
  // the Radiance alcove
  { id: 'rose-alcove', mat: 'rose', x: 3, y: 98, w: 107, h: 74 },
];
/** Which stone a plan point is finished in. */
export function materialAt(x, y) {
  for (const z of MATERIAL_ZONES) {
    if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) return z.mat;
  }
  return MATERIALS.DEFAULT;
}
export const STOPS = [
  { id: 'entrance-main', area: 'east', label: 'Main Entrance', sub: 'East corridor, shared with Eternal Light', x: 700, z: 250, yaw: -90, pitch: -8, zoom: 0.7 },
  { id: 'entrance-chapel', area: 'west', label: 'Chapel Entrance', sub: 'South-west doors', x: 96, z: 392, yaw: 20, pitch: -8, zoom: 0.75 },
  { id: 'chapel', area: 'west', label: 'Chapel — Worship Space', sub: 'Seating, looking toward the altar', x: 166, z: 292, yaw: 0, pitch: -8, zoom: 1.3 },
  { id: 'altar', area: 'north', label: 'Altar', sub: 'North end of the worship space', x: 166, z: 150, yaw: 0, pitch: -3 },
  { id: 'west-wall', area: 'west', label: 'West Wall — 101-110', sub: 'Deluxe Companion and tandem crypts', x: 150, z: 262, yaw: -90, pitch: -5 },
  { id: 'radiance', area: 'rad', label: 'Radiance Niche Wall', sub: "Daylit alcove at the chapel’s north-west corner", x: 58, z: 120, yaw: 180, pitch: -3 },
  { id: 'north-wing', area: 'north', label: 'North Wing — 124-140', sub: 'Tandem crypts along the north hall', x: 360, z: 150, yaw: 0, pitch: -5 },
  { id: 'north-hidden', area: 'north', label: 'North Wing — 116-123', sub: 'Hidden Companions and Deluxe Companions', x: 174, z: 96, yaw: 0, pitch: -4 },
  { id: 'island-west', area: 'island', label: 'Island — West Face 194-200', sub: 'Faces the chapel', x: 198, z: 240, yaw: 90, pitch: -5 },
  { id: 'island-north', area: 'island', label: 'Island — North Face 220-231', sub: 'Deluxe Companions', x: 404, z: 130, yaw: 180, pitch: -5 },
  { id: 'island-south', area: 'island', label: 'Island — South Face 201-212', sub: 'Deluxe Companions', x: 404, z: 350, yaw: 0, pitch: -5 },
  { id: 'island-east', area: 'island', label: 'Island — East Face 213-219', sub: 'Faces the east passage', x: 600, z: 240, yaw: -90, pitch: -5 },
  { id: 'serenity', area: 'ser', label: 'Serenity Niche Wall', sub: "North hall, capping the island’s north-east corner", x: 533, z: 118, yaw: 180, pitch: -3 },
  { id: 'south-wall', area: 'south', label: 'South Wall — 185-193', sub: 'Tandem and single crypts', x: 240, z: 340, yaw: 180, pitch: -5 },
  { id: 'south-hidden', area: 'south', label: 'South Wall — 179-184', sub: 'Hidden Companions', x: 362, z: 396, yaw: 180, pitch: -5 },
  { id: 'south-east', area: 'south', label: 'South Wall — 173-178', sub: 'Tandem crypts', x: 470, z: 344, yaw: 180, pitch: -5 },
  { id: 'corner-168', area: 'south', label: 'South-East Corner — 168-172', sub: 'Single crypts', x: 496, z: 486, yaw: 90, pitch: -5 },
  { id: 'east-north', area: 'east', label: 'East Corridor — 141-148', sub: 'North of the entrance', x: 610, z: 120, yaw: 90, pitch: -5 },
  { id: 'east-south', area: 'east', label: 'East Corridor — 159-167', sub: 'South of the entrance', x: 610, z: 396, yaw: 90, pitch: -5 },
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
 *   [bank, tier, columns, type, status, price]
 * `status` is MIS-backed as of 8/1/2026 — see `MIS` and STATUS_LABEL above.
 * `price` is the unit price from the 8/1/2026 MIS crypt-price export — see `PRICES`.
 * It is a number ONLY on an available unit MIS priced, and `null` on every unsellable
 * unit and on the two available units MIS could not price. Nothing rounds it.
 */
export const UNITS = [
  ['101-110', 'G', [101, 102], 'deluxe', 'occupied', null],
  ['101-110', 'G', [103], 'tandem', 'occupied', null],
  ['101-110', 'G', [104], 'tandem', 'occupied', null],
  ['101-110', 'G', [105], 'tandem', 'reserved', null],
  ['101-110', 'G', [106], 'tandem', 'reserved', null],
  ['101-110', 'G', [107], 'tandem', 'occupied', null],
  ['101-110', 'G', [108], 'tandem', 'occupied', null],
  ['101-110', 'G', [109], 'tandem', 'reserved', null],
  ['101-110', 'G', [110], 'tandem', 'reserved', null],
  ['101-110', 'F', [101, 102], 'deluxe', 'occupied', null],
  ['101-110', 'F', [103], 'tandem', 'reserved', null],
  ['101-110', 'F', [104], 'tandem', 'available', 27995],
  ['101-110', 'F', [105], 'tandem', 'available', 27995],
  ['101-110', 'F', [106], 'tandem', 'available', 27995],
  ['101-110', 'F', [107], 'tandem', 'available', 27995],
  ['101-110', 'F', [108], 'tandem', 'occupied', null],
  ['101-110', 'F', [109], 'tandem', 'available', 27995],
  ['101-110', 'F', [110], 'tandem', 'occupied', null],
  ['101-110', 'E', [101, 102], 'deluxe', 'available', 33995],
  ['101-110', 'E', [103], 'tandem', 'available', 27995],
  ['101-110', 'E', [104], 'tandem', 'available', 27995],
  ['101-110', 'E', [105], 'tandem', 'occupied', null],
  ['101-110', 'E', [106], 'tandem', 'available', 27995],
  ['101-110', 'E', [107], 'tandem', 'available', 27995],
  ['101-110', 'E', [108], 'tandem', 'available', 27995],
  ['101-110', 'E', [109], 'tandem', 'available', 27995],
  ['101-110', 'E', [110], 'tandem', 'available', 27995],
  ['101-110', 'D', [101, 102], 'deluxe', 'available', 36995],
  ['101-110', 'D', [103], 'tandem', 'available', 30995],
  ['101-110', 'D', [104], 'tandem', 'available', 30995],
  ['101-110', 'D', [105], 'tandem', 'available', 30995],
  ['101-110', 'D', [106], 'tandem', 'reserved', null],
  ['101-110', 'D', [107], 'tandem', 'available', 30995],
  ['101-110', 'D', [108], 'tandem', 'available', 30995],
  ['101-110', 'D', [109], 'tandem', 'available', 30995],
  ['101-110', 'D', [110], 'tandem', 'available', 30995],
  ['101-110', 'C', [101, 102], 'deluxe', 'reserved', null],
  ['101-110', 'C', [103], 'tandem', 'available', 32995],
  ['101-110', 'C', [104], 'tandem', 'available', 32995],
  ['101-110', 'C', [105], 'tandem', 'available', 32995],
  ['101-110', 'C', [106], 'tandem', 'available', 32995],
  ['101-110', 'C', [107], 'tandem', 'occupied', null],
  ['101-110', 'C', [108], 'tandem', 'available', 32995],
  ['101-110', 'C', [109], 'tandem', 'available', 32995],
  ['101-110', 'C', [110], 'tandem', 'available', 32995],
  ['101-110', 'B', [101, 102], 'deluxe', 'reserved', null],
  ['101-110', 'B', [103], 'tandem', 'reserved', null],
  ['101-110', 'B', [104], 'tandem', 'available', 32995],
  ['101-110', 'B', [105], 'tandem', 'available', 32995],
  ['101-110', 'B', [106], 'tandem', 'available', 32995],
  ['101-110', 'B', [107], 'tandem', 'available', 32995],
  ['101-110', 'B', [108], 'tandem', 'available', 32995],
  ['101-110', 'B', [109], 'tandem', 'available', 32995],
  ['101-110', 'B', [110], 'tandem', 'occupied', null],
  ['101-110', 'A', [101, 102], 'deluxe', 'reserved', null],
  ['101-110', 'A', [103], 'tandem', 'occupied', null],
  ['101-110', 'A', [104], 'tandem', 'available', 30995],
  ['101-110', 'A', [105], 'tandem', 'occupied', null],
  ['101-110', 'A', [106], 'tandem', 'reserved', null],
  ['101-110', 'A', [107], 'tandem', 'occupied', null],
  ['101-110', 'A', [108], 'tandem', 'occupied', null],
  ['101-110', 'A', [109], 'tandem', 'occupied', null],
  ['101-110', 'A', [110], 'tandem', 'available', 30995],
  ['111-115', 'G', [111], 'tandem', 'occupied', null],
  ['111-115', 'G', [112], 'tandem', 'available', 22995],
  ['111-115', 'G', [113], 'tandem', 'available', 22995],
  ['111-115', 'G', [114], 'tandem', 'occupied', null],
  ['111-115', 'G', [115], 'tandem', 'occupied', null],
  ['111-115', 'F', [111], 'tandem', 'available', 27995],
  ['111-115', 'F', [112], 'tandem', 'available', 27995],
  ['111-115', 'F', [113], 'tandem', 'available', 27995],
  ['111-115', 'F', [114], 'tandem', 'available', 27995],
  ['111-115', 'F', [115], 'tandem', 'available', 27995],
  ['111-115', 'E', [111], 'tandem', 'available', 27995],
  ['111-115', 'E', [112], 'tandem', 'available', 27995],
  ['111-115', 'E', [113], 'tandem', 'available', 27995],
  ['111-115', 'E', [114], 'tandem', 'available', 27995],
  ['111-115', 'E', [115], 'tandem', 'available', 27995],
  ['111-115', 'D', [111], 'tandem', 'available', 30995],
  ['111-115', 'D', [112], 'tandem', 'available', 30995],
  ['111-115', 'D', [113], 'tandem', 'available', 30995],
  ['111-115', 'D', [114], 'tandem', 'available', 30995],
  ['111-115', 'D', [115], 'tandem', 'available', 30995],
  ['111-115', 'C', [111], 'tandem', 'reserved', null],
  ['111-115', 'C', [112], 'tandem', 'occupied', null],
  ['111-115', 'C', [113], 'tandem', 'available', 32995],
  ['111-115', 'C', [114], 'tandem', 'available', 32995],
  ['111-115', 'C', [115], 'tandem', 'occupied', null],
  ['111-115', 'B', [111], 'tandem', 'occupied', null],
  ['111-115', 'B', [112], 'tandem', 'reserved', null],
  ['111-115', 'B', [113], 'tandem', 'occupied', null],
  ['111-115', 'B', [114], 'tandem', 'occupied', null],
  ['111-115', 'B', [115], 'tandem', 'reserved', null],
  ['111-115', 'A', [111], 'tandem', 'reserved', null],
  ['111-115', 'A', [112], 'tandem', 'reserved', null],
  ['111-115', 'A', [113], 'tandem', 'reserved', null],
  ['111-115', 'A', [114], 'tandem', 'reserved', null],
  ['111-115', 'A', [115], 'tandem', 'available', 30995],
  // OPERATOR OVERRIDE 2026-08-01 — see TIER_G_116_123 below. The sheet drew tier G of
  // this bank as EIGHT single crypts; it is FOUR companion pairs, paired and typed by
  // the bank's own segment header, exactly like tiers F/E/D/A below them.
  ['116-123', 'G', [116, 117], 'deluxe', 'available', 45990],
  ['116-123', 'G', [118, 119], 'hidden', 'available', 45990],
  ['116-123', 'G', [120, 121], 'hidden', 'available', 45990],
  ['116-123', 'G', [122, 123], 'deluxe', 'available', 45990],
  ['116-123', 'F', [116, 117], 'deluxe', 'available', 51990],
  ['116-123', 'F', [118, 119], 'hidden', 'available', 51990],
  ['116-123', 'F', [120, 121], 'hidden', 'available', 51990],
  ['116-123', 'F', [122, 123], 'deluxe', 'available', 51990],
  ['116-123', 'E', [116, 117], 'deluxe', 'available', 55990],
  ['116-123', 'E', [118, 119], 'hidden', 'available', 55990],
  ['116-123', 'E', [120, 121], 'hidden', 'available', 55990],
  ['116-123', 'E', [122, 123], 'deluxe', 'available', 55990],
  ['116-123', 'D', [116, 117], 'deluxe', 'available', 61990],
  ['116-123', 'D', [118, 119], 'hidden', 'reserved', null],
  ['116-123', 'D', [120, 121], 'hidden', 'occupied', null],
  ['116-123', 'D', [122, 123], 'deluxe', 'available', 61990],
  ['116-123', 'C', [116, 117], 'deluxe', 'reserved', null],
  ['116-123', 'C', [118, 119], 'hidden', 'occupied', null],
  ['116-123', 'C', [120, 121], 'hidden', 'reserved', null],
  ['116-123', 'C', [122, 123], 'deluxe', 'reserved', null],
  ['116-123', 'B', [116, 117], 'deluxe', 'occupied', null],
  ['116-123', 'B', [118, 119], 'hidden', 'occupied', null],
  ['116-123', 'B', [120, 121], 'hidden', 'reserved', null],
  ['116-123', 'B', [122, 123], 'deluxe', 'occupied', null],
  ['116-123', 'A', [116, 117], 'deluxe', 'available', 61990],
  ['116-123', 'A', [118, 119], 'hidden', 'available', 61990],
  ['116-123', 'A', [120, 121], 'hidden', 'reserved', null],
  ['116-123', 'A', [122, 123], 'deluxe', 'available', 61990],
  ['124-140', 'G', [124], 'tandem', 'available', 12995],
  ['124-140', 'G', [125], 'tandem', 'available', 12995],
  ['124-140', 'G', [126], 'tandem', 'available', 12995],
  ['124-140', 'G', [127], 'tandem', 'available', 12995],
  ['124-140', 'G', [128], 'tandem', 'available', 12995],
  ['124-140', 'G', [129], 'tandem', 'available', 12995],
  ['124-140', 'G', [130], 'tandem', 'available', 12995],
  ['124-140', 'G', [131], 'tandem', 'available', 12995],
  ['124-140', 'G', [132], 'tandem', 'available', 12995],
  ['124-140', 'G', [133], 'tandem', 'available', 12995],
  ['124-140', 'G', [134], 'tandem', 'available', 12995],
  ['124-140', 'G', [135], 'tandem', 'available', 12995],
  ['124-140', 'G', [136], 'tandem', 'available', 12995],
  ['124-140', 'G', [137], 'tandem', 'reserved', null],
  ['124-140', 'G', [138], 'tandem', 'unlisted', null],
  ['124-140', 'G', [139], 'tandem', 'unlisted', null],
  ['124-140', 'G', [140], 'tandem', 'unlisted', null],
  ['124-140', 'F', [124], 'tandem', 'available', 15995],
  ['124-140', 'F', [125], 'tandem', 'available', 15995],
  ['124-140', 'F', [126], 'tandem', 'available', 15995],
  ['124-140', 'F', [127], 'tandem', 'available', 15995],
  ['124-140', 'F', [128], 'tandem', 'available', 15995],
  ['124-140', 'F', [129], 'tandem', 'available', 15995],
  ['124-140', 'F', [130], 'tandem', 'available', 15995],
  ['124-140', 'F', [131], 'tandem', 'available', 15995],
  ['124-140', 'F', [132], 'tandem', 'available', 15995],
  ['124-140', 'F', [133], 'tandem', 'available', 15995],
  ['124-140', 'F', [134], 'tandem', 'available', 15995],
  ['124-140', 'F', [135], 'tandem', 'available', 15995],
  ['124-140', 'F', [136], 'tandem', 'available', 15995],
  ['124-140', 'F', [137], 'tandem', 'occupied', null],
  ['124-140', 'F', [138], 'tandem', 'unlisted', null],
  ['124-140', 'F', [139], 'tandem', 'unlisted', null],
  ['124-140', 'F', [140], 'tandem', 'unlisted', null],
  ['124-140', 'E', [124], 'tandem', 'available', 18995],
  ['124-140', 'E', [125], 'tandem', 'available', 18995],
  ['124-140', 'E', [126], 'tandem', 'available', 18995],
  ['124-140', 'E', [127], 'tandem', 'available', 18995],
  ['124-140', 'E', [128], 'tandem', 'available', 18995],
  ['124-140', 'E', [129], 'tandem', 'occupied', null],
  ['124-140', 'E', [130], 'tandem', 'available', 18995],
  ['124-140', 'E', [131], 'tandem', 'available', 18995],
  ['124-140', 'E', [132], 'tandem', 'available', 18995],
  ['124-140', 'E', [133], 'tandem', 'available', 18995],
  ['124-140', 'E', [134], 'tandem', 'available', 18995],
  ['124-140', 'E', [135], 'tandem', 'available', 18995],
  ['124-140', 'E', [136], 'tandem', 'available', 18995],
  ['124-140', 'E', [137], 'tandem', 'available', 18995],
  ['124-140', 'E', [138], 'tandem', 'unlisted', null],
  ['124-140', 'E', [139], 'tandem', 'unlisted', null],
  ['124-140', 'E', [140], 'tandem', 'unlisted', null],
  ['124-140', 'D', [124], 'tandem', 'available', 24995],
  ['124-140', 'D', [125], 'tandem', 'occupied', null],
  ['124-140', 'D', [126], 'tandem', 'reserved', null],
  ['124-140', 'D', [127], 'tandem', 'reserved', null],
  ['124-140', 'D', [128], 'tandem', 'available', 24995],
  ['124-140', 'D', [129], 'tandem', 'available', 24995],
  ['124-140', 'D', [130], 'tandem', 'available', 24995],
  ['124-140', 'D', [131], 'tandem', 'available', 24995],
  ['124-140', 'D', [132], 'tandem', 'available', 24995],
  ['124-140', 'D', [133], 'tandem', 'available', 24995],
  ['124-140', 'D', [134], 'tandem', 'available', 24995],
  ['124-140', 'D', [135], 'tandem', 'available', 24995],
  ['124-140', 'D', [136], 'tandem', 'available', 24995],
  ['124-140', 'D', [137], 'tandem', 'available', 24995],
  ['124-140', 'C', [124], 'tandem', 'available', 28995],
  ['124-140', 'C', [125], 'tandem', 'reserved', null],
  ['124-140', 'C', [126], 'tandem', 'reserved', null],
  ['124-140', 'C', [127], 'tandem', 'occupied', null],
  ['124-140', 'C', [128], 'tandem', 'occupied', null],
  ['124-140', 'C', [129], 'tandem', 'available', 28995],
  ['124-140', 'C', [130], 'tandem', 'occupied', null],
  ['124-140', 'C', [131], 'tandem', 'available', 28995],
  ['124-140', 'C', [132], 'tandem', 'reserved', null],
  ['124-140', 'C', [133], 'tandem', 'available', 28995],
  ['124-140', 'C', [134], 'tandem', 'available', 28995],
  ['124-140', 'C', [135], 'tandem', 'available', 28995],
  ['124-140', 'C', [136], 'tandem', 'available', 28995],
  ['124-140', 'C', [137], 'tandem', 'available', 28995],
  ['124-140', 'B', [124], 'tandem', 'occupied', null],
  ['124-140', 'B', [125], 'tandem', 'occupied', null],
  ['124-140', 'B', [126], 'tandem', 'reserved', null],
  ['124-140', 'B', [127], 'tandem', 'occupied', null],
  ['124-140', 'B', [128], 'tandem', 'available', 28995],
  ['124-140', 'B', [129], 'tandem', 'reserved', null],
  ['124-140', 'B', [130], 'tandem', 'occupied', null],
  ['124-140', 'B', [131], 'tandem', 'occupied', null],
  ['124-140', 'B', [132], 'tandem', 'occupied', null],
  ['124-140', 'B', [133], 'tandem', 'occupied', null],
  ['124-140', 'B', [134], 'tandem', 'occupied', null],
  ['124-140', 'B', [135], 'tandem', 'available', 28995],
  ['124-140', 'B', [136], 'tandem', 'occupied', null],
  ['124-140', 'B', [137], 'tandem', 'occupied', null],
  ['124-140', 'A', [124], 'tandem', 'available', 24995],
  ['124-140', 'A', [125], 'tandem', 'occupied', null],
  ['124-140', 'A', [126], 'tandem', 'occupied', null],
  ['124-140', 'A', [127], 'tandem', 'reserved', null],
  ['124-140', 'A', [128], 'tandem', 'occupied', null],
  ['124-140', 'A', [129], 'tandem', 'occupied', null],
  ['124-140', 'A', [130], 'tandem', 'reserved', null],
  ['124-140', 'A', [131], 'tandem', 'reserved', null],
  ['124-140', 'A', [132], 'tandem', 'occupied', null],
  ['124-140', 'A', [133], 'tandem', 'available', 24995],
  ['124-140', 'A', [134], 'tandem', 'available', 24995],
  ['124-140', 'A', [135], 'tandem', 'available', 24995],
  ['124-140', 'A', [136], 'tandem', 'available', 24995],
  ['124-140', 'A', [137], 'tandem', 'available', 24995],
  ['141-148', 'G', [141], 'tandem', 'unlisted', null],
  ['141-148', 'G', [142], 'tandem', 'unlisted', null],
  ['141-148', 'G', [143], 'tandem', 'unlisted', null],
  ['141-148', 'G', [144], 'tandem', 'available', 12995],
  ['141-148', 'G', [145], 'tandem', 'available', 12995],
  ['141-148', 'G', [146], 'tandem', 'reserved', null],
  ['141-148', 'G', [147], 'tandem', 'available', 12995],
  ['141-148', 'G', [148], 'tandem', 'available', 12995],
  ['141-148', 'F', [141], 'tandem', 'unlisted', null],
  ['141-148', 'F', [142], 'tandem', 'unlisted', null],
  ['141-148', 'F', [143], 'tandem', 'unlisted', null],
  ['141-148', 'F', [144], 'tandem', 'reserved', null],
  ['141-148', 'F', [145], 'tandem', 'available', 15995],
  ['141-148', 'F', [146], 'tandem', 'available', 15995],
  ['141-148', 'F', [147], 'tandem', 'available', 15995],
  ['141-148', 'F', [148], 'tandem', 'available', 15995],
  ['141-148', 'E', [141], 'tandem', 'unlisted', null],
  ['141-148', 'E', [142], 'tandem', 'unlisted', null],
  ['141-148', 'E', [143], 'tandem', 'unlisted', null],
  ['141-148', 'E', [144], 'tandem', 'available', 18995],
  ['141-148', 'E', [145], 'tandem', 'available', 18995],
  ['141-148', 'E', [146], 'tandem', 'available', 18995],
  ['141-148', 'E', [147], 'tandem', 'available', 18995],
  ['141-148', 'E', [148], 'tandem', 'available', 18995],
  ['141-148', 'D', [144], 'tandem', 'reserved', null],
  ['141-148', 'D', [145], 'tandem', 'available', 24995],
  ['141-148', 'D', [146], 'tandem', 'available', 24995],
  ['141-148', 'D', [147], 'tandem', 'available', 24995],
  ['141-148', 'D', [148], 'tandem', 'available', 24995],
  ['141-148', 'C', [144], 'tandem', 'available', 28995],
  ['141-148', 'C', [145], 'tandem', 'available', 28995],
  ['141-148', 'C', [146], 'tandem', 'occupied', null],
  ['141-148', 'C', [147], 'tandem', 'available', 28995],
  ['141-148', 'C', [148], 'tandem', 'reserved', null],
  ['141-148', 'B', [144], 'tandem', 'occupied', null],
  ['141-148', 'B', [145], 'tandem', 'reserved', null],
  ['141-148', 'B', [146], 'tandem', 'available', 28995],
  ['141-148', 'B', [147], 'tandem', 'occupied', null],
  ['141-148', 'B', [148], 'tandem', 'occupied', null],
  ['141-148', 'A', [144], 'tandem', 'reserved', null],
  ['141-148', 'A', [145], 'tandem', 'reserved', null],
  ['141-148', 'A', [146], 'tandem', 'occupied', null],
  ['141-148', 'A', [147], 'tandem', 'occupied', null],
  ['141-148', 'A', [148], 'tandem', 'occupied', null],
  ['149-153', 'G', [149, 150], 'deluxe', 'available', 16995],
  ['149-153', 'G', [151], 'single', 'available', 9995],
  ['149-153', 'G', [152], 'single', 'available', 9995],
  ['149-153', 'G', [153], 'single', 'available', 9995],
  ['149-153', 'F', [149, 150], 'deluxe', 'available', 19995],
  ['149-153', 'F', [151], 'single', 'reserved', null],
  ['149-153', 'F', [152], 'single', 'occupied', null],
  ['149-153', 'F', [153], 'single', 'available', 9995],
  ['149-153', 'E', [149, 150], 'deluxe', 'available', 19995],
  ['149-153', 'E', [151], 'single', 'available', 12995],
  ['149-153', 'E', [152], 'single', 'available', 12995],
  ['149-153', 'E', [153], 'single', 'reserved', null],
  ['149-153', 'D', [149, 150], 'deluxe', 'occupied', null],
  ['149-153', 'D', [151], 'single', 'occupied', null],
  ['149-153', 'D', [152], 'single', 'available', 20895],
  ['149-153', 'D', [153], 'single', 'reserved', null],
  ['149-153', 'C', [149, 150], 'deluxe', 'occupied', null],
  ['149-153', 'C', [151], 'single', 'occupied', null],
  ['149-153', 'C', [152], 'single', 'occupied', null],
  ['149-153', 'C', [153], 'single', 'occupied', null],
  ['149-153', 'B', [149, 150], 'deluxe', 'reserved', null],
  ['149-153', 'B', [151], 'single', 'occupied', null],
  ['149-153', 'B', [152], 'single', 'occupied', null],
  ['149-153', 'B', [153], 'single', 'occupied', null],
  ['149-153', 'A', [149, 150], 'deluxe', 'reserved', null],
  ['149-153', 'A', [151], 'single', 'occupied', null],
  ['149-153', 'A', [152], 'single', 'available', 12995],
  ['149-153', 'A', [153], 'single', 'available', 12995],
  ['154-158', 'G', [154], 'single', 'reserved', null],
  ['154-158', 'G', [155], 'single', 'occupied', null],
  ['154-158', 'G', [156], 'single', 'reserved', null],
  ['154-158', 'G', [157, 158], 'deluxe', 'reserved', null],
  ['154-158', 'F', [154], 'single', 'occupied', null],
  ['154-158', 'F', [155], 'single', 'available', 9995],
  ['154-158', 'F', [156], 'single', 'available', 9995],
  ['154-158', 'F', [157, 158], 'deluxe', 'occupied', null],
  ['154-158', 'E', [154], 'single', 'available', 12995],
  ['154-158', 'E', [155], 'single', 'available', 12995],
  ['154-158', 'E', [156], 'single', 'occupied', null],
  ['154-158', 'E', [157, 158], 'deluxe', 'available', 19995],
  ['154-158', 'D', [154], 'single', 'occupied', null],
  ['154-158', 'D', [155], 'single', 'occupied', null],
  ['154-158', 'D', [156], 'single', 'occupied', null],
  ['154-158', 'D', [157, 158], 'deluxe', 'occupied', null],
  ['154-158', 'C', [154], 'single', 'occupied', null],
  ['154-158', 'C', [155], 'single', 'available', 14995],
  ['154-158', 'C', [156], 'single', 'reserved', null],
  ['154-158', 'C', [157, 158], 'deluxe', 'occupied', null],
  ['154-158', 'B', [154], 'single', 'reserved', null],
  ['154-158', 'B', [155], 'single', 'occupied', null],
  ['154-158', 'B', [156], 'single', 'reserved', null],
  ['154-158', 'B', [157, 158], 'deluxe', 'reserved', null],
  ['154-158', 'A', [154], 'single', 'occupied', null],
  ['154-158', 'A', [155], 'single', 'available', 12995],
  ['154-158', 'A', [156], 'single', 'occupied', null],
  ['154-158', 'A', [157, 158], 'deluxe', 'occupied', null],
  ['159-167', 'G', [159], 'tandem', 'occupied', null],
  ['159-167', 'G', [160], 'tandem', 'occupied', null],
  ['159-167', 'G', [161], 'tandem', 'reserved', null],
  ['159-167', 'G', [162], 'tandem', 'available', 12995],
  ['159-167', 'G', [163], 'tandem', 'occupied', null],
  ['159-167', 'G', [164], 'tandem', 'available', 12995],
  ['159-167', 'G', [165], 'tandem', 'available', 12995],
  ['159-167', 'G', [166], 'tandem', 'reserved', null],
  ['159-167', 'G', [167], 'tandem', 'reserved', null],
  ['159-167', 'F', [159], 'tandem', 'reserved', null],
  ['159-167', 'F', [160], 'tandem', 'occupied', null],
  ['159-167', 'F', [161], 'tandem', 'reserved', null],
  ['159-167', 'F', [162], 'tandem', 'available', 15995],
  ['159-167', 'F', [163], 'tandem', 'reserved', null],
  ['159-167', 'F', [164], 'tandem', 'available', 15995],
  ['159-167', 'F', [165], 'tandem', 'occupied', null],
  ['159-167', 'F', [166], 'tandem', 'reserved', null],
  ['159-167', 'F', [167], 'tandem', 'occupied', null],
  ['159-167', 'E', [159], 'tandem', 'occupied', null],
  ['159-167', 'E', [160], 'tandem', 'available', 15995],
  ['159-167', 'E', [161], 'tandem', 'available', 15995],
  ['159-167', 'E', [162], 'tandem', 'reserved', null],
  ['159-167', 'E', [163], 'tandem', 'reserved', null],
  ['159-167', 'E', [164], 'tandem', 'reserved', null],
  ['159-167', 'E', [165], 'tandem', 'reserved', null],
  ['159-167', 'E', [166], 'tandem', 'unpriced', null],   // MIS price 0 — see PRICE_EXCEPTIONS
  ['159-167', 'E', [167], 'tandem', 'reserved', null],
  ['159-167', 'D', [159], 'tandem', 'reserved', null],
  ['159-167', 'D', [160], 'tandem', 'occupied', null],
  ['159-167', 'D', [161], 'tandem', 'occupied', null],
  ['159-167', 'D', [162], 'tandem', 'reserved', null],
  ['159-167', 'D', [163], 'tandem', 'reserved', null],
  ['159-167', 'D', [164], 'tandem', 'reserved', null],
  ['159-167', 'D', [165], 'tandem', 'reserved', null],
  ['159-167', 'D', [166], 'tandem', 'reserved', null],
  ['159-167', 'D', [167], 'tandem', 'reserved', null],
  ['159-167', 'C', [159], 'tandem', 'occupied', null],
  ['159-167', 'C', [160], 'tandem', 'occupied', null],
  ['159-167', 'C', [161], 'tandem', 'reserved', null],
  ['159-167', 'C', [162], 'tandem', 'occupied', null],
  ['159-167', 'C', [163], 'tandem', 'reserved', null],
  ['159-167', 'C', [164], 'tandem', 'occupied', null],
  ['159-167', 'C', [165], 'tandem', 'occupied', null],
  ['159-167', 'C', [166], 'tandem', 'occupied', null],
  ['159-167', 'C', [167], 'tandem', 'occupied', null],
  ['159-167', 'B', [159], 'tandem', 'occupied', null],
  ['159-167', 'B', [160], 'tandem', 'reserved', null],
  ['159-167', 'B', [161], 'tandem', 'occupied', null],
  ['159-167', 'B', [162], 'tandem', 'occupied', null],
  ['159-167', 'B', [163], 'tandem', 'occupied', null],
  ['159-167', 'B', [164], 'tandem', 'occupied', null],
  ['159-167', 'B', [165], 'tandem', 'occupied', null],
  ['159-167', 'B', [166], 'tandem', 'reserved', null],
  ['159-167', 'B', [167], 'tandem', 'available', 20995],
  ['159-167', 'A', [159], 'tandem', 'occupied', null],
  ['159-167', 'A', [160], 'tandem', 'available', 18995],
  ['159-167', 'A', [161], 'tandem', 'available', 18995],
  ['159-167', 'A', [162], 'tandem', 'occupied', null],
  ['159-167', 'A', [163], 'tandem', 'reserved', null],
  ['159-167', 'A', [164], 'tandem', 'occupied', null],
  ['159-167', 'A', [165], 'tandem', 'occupied', null],
  ['159-167', 'A', [166], 'tandem', 'occupied', null],
  ['159-167', 'A', [167], 'tandem', 'blocked', null],
  ['168-172', 'G', [168], 'single', 'reserved', null],
  ['168-172', 'G', [169], 'single', 'occupied', null],
  ['168-172', 'G', [170], 'single', 'occupied', null],
  ['168-172', 'G', [171], 'single', 'reserved', null],
  ['168-172', 'G', [172], 'single', 'occupied', null],
  ['168-172', 'F', [168], 'single', 'reserved', null],
  ['168-172', 'F', [169], 'single', 'reserved', null],
  ['168-172', 'F', [170], 'single', 'occupied', null],
  ['168-172', 'F', [171], 'single', 'occupied', null],
  ['168-172', 'F', [172], 'single', 'occupied', null],
  ['168-172', 'E', [168], 'single', 'reserved', null],
  ['168-172', 'E', [169], 'single', 'occupied', null],
  ['168-172', 'E', [170], 'single', 'occupied', null],
  ['168-172', 'E', [171], 'single', 'occupied', null],
  ['168-172', 'E', [172], 'single', 'occupied', null],
  ['168-172', 'D', [168], 'single', 'occupied', null],
  ['168-172', 'D', [169], 'single', 'reserved', null],
  ['168-172', 'D', [170], 'single', 'reserved', null],
  ['168-172', 'D', [171], 'single', 'occupied', null],
  ['168-172', 'D', [172], 'single', 'occupied', null],
  ['168-172', 'C', [168], 'single', 'available', 14995],
  ['168-172', 'C', [169], 'single', 'occupied', null],
  ['168-172', 'C', [170], 'single', 'occupied', null],
  ['168-172', 'C', [171], 'single', 'reserved', null],
  ['168-172', 'C', [172], 'single', 'occupied', null],
  ['168-172', 'B', [168], 'single', 'occupied', null],
  ['168-172', 'B', [169], 'single', 'occupied', null],
  ['168-172', 'B', [170], 'single', 'occupied', null],
  ['168-172', 'B', [171], 'single', 'occupied', null],
  ['168-172', 'B', [172], 'single', 'reserved', null],
  ['168-172', 'A', [168], 'single', 'reserved', null],
  ['168-172', 'A', [169], 'single', 'occupied', null],
  ['168-172', 'A', [170], 'single', 'reserved', null],
  ['168-172', 'A', [171], 'single', 'occupied', null],
  ['168-172', 'A', [172], 'single', 'occupied', null],
  ['173-178', 'G', [173], 'tandem', 'blocked', null],
  ['173-178', 'G', [174], 'tandem', 'available', 12995],
  ['173-178', 'G', [175], 'tandem', 'available', 12995],
  ['173-178', 'G', [176], 'tandem', 'available', 12995],
  ['173-178', 'G', [177], 'tandem', 'available', 12995],
  ['173-178', 'G', [178], 'tandem', 'occupied', null],
  ['173-178', 'F', [173], 'tandem', 'available', 15995],
  ['173-178', 'F', [174], 'tandem', 'available', 15995],
  ['173-178', 'F', [175], 'tandem', 'available', 15995],
  ['173-178', 'F', [176], 'tandem', 'available', 15995],
  ['173-178', 'F', [177], 'tandem', 'available', 15995],
  ['173-178', 'F', [178], 'tandem', 'available', 15995],
  ['173-178', 'E', [173], 'tandem', 'occupied', null],
  ['173-178', 'E', [174], 'tandem', 'reserved', null],
  ['173-178', 'E', [175], 'tandem', 'reserved', null],
  ['173-178', 'E', [176], 'tandem', 'occupied', null],
  ['173-178', 'E', [177], 'tandem', 'available', 21995],
  ['173-178', 'E', [178], 'tandem', 'available', 21995],
  ['173-178', 'D', [173], 'tandem', 'occupied', null],
  ['173-178', 'D', [174], 'tandem', 'available', 24995],
  ['173-178', 'D', [175], 'tandem', 'available', 24995],
  ['173-178', 'D', [176], 'tandem', 'available', 24995],
  ['173-178', 'D', [177], 'tandem', 'available', 24995],
  ['173-178', 'D', [178], 'tandem', 'occupied', null],
  ['173-178', 'C', [173], 'tandem', 'occupied', null],
  ['173-178', 'C', [174], 'tandem', 'reserved', null],
  ['173-178', 'C', [175], 'tandem', 'occupied', null],
  ['173-178', 'C', [176], 'tandem', 'available', 28995],
  ['173-178', 'C', [177], 'tandem', 'occupied', null],
  ['173-178', 'C', [178], 'tandem', 'occupied', null],
  ['173-178', 'B', [173], 'tandem', 'available', 28995],
  ['173-178', 'B', [174], 'tandem', 'occupied', null],
  ['173-178', 'B', [175], 'tandem', 'available', 28995],
  ['173-178', 'B', [176], 'tandem', 'available', 28995],
  ['173-178', 'B', [177], 'tandem', 'occupied', null],
  ['173-178', 'B', [178], 'tandem', 'reserved', null],
  ['173-178', 'A', [173], 'tandem', 'available', 24995],
  ['173-178', 'A', [174], 'tandem', 'reserved', null],
  ['173-178', 'A', [175], 'tandem', 'available', 24995],
  ['173-178', 'A', [176], 'tandem', 'available', 24995],
  ['173-178', 'A', [177], 'tandem', 'available', 24995],
  ['173-178', 'A', [178], 'tandem', 'available', 24995],
  ['179-184', 'G', [179, 180], 'hidden', 'available', 16995],
  ['179-184', 'G', [181], 'single', 'available', 9995],
  ['179-184', 'G', [182], 'single', 'available', 9995],
  ['179-184', 'G', [183, 184], 'hidden', 'available', 16995],
  ['179-184', 'F', [179, 180], 'hidden', 'available', 18995],
  ['179-184', 'F', [181], 'single', 'available', 10995],
  ['179-184', 'F', [182], 'single', 'available', 10995],
  ['179-184', 'F', [183, 184], 'hidden', 'available', 18995],
  ['179-184', 'E', [179, 180], 'hidden', 'available', 21995],
  ['179-184', 'E', [181], 'single', 'available', 12995],
  ['179-184', 'E', [182], 'single', 'available', 12995],
  ['179-184', 'E', [183, 184], 'hidden', 'available', 21995],
  ['179-184', 'D', [179, 180], 'hidden', 'available', 24995],
  ['179-184', 'D', [181], 'single', 'occupied', null],
  ['179-184', 'D', [182], 'single', 'occupied', null],
  ['179-184', 'D', [183, 184], 'hidden', 'available', 24995],
  ['179-184', 'C', [179, 180], 'hidden', 'reserved', null],
  ['179-184', 'C', [181], 'single', 'reserved', null],
  ['179-184', 'C', [182], 'single', 'reserved', null],
  ['179-184', 'C', [183, 184], 'hidden', 'occupied', null],
  ['179-184', 'B', [179, 180], 'hidden', 'occupied', null],
  ['179-184', 'B', [181], 'single', 'occupied', null],
  ['179-184', 'B', [182], 'single', 'occupied', null],
  ['179-184', 'B', [183, 184], 'hidden', 'occupied', null],
  ['179-184', 'A', [179, 180], 'hidden', 'occupied', null],
  ['179-184', 'A', [181], 'single', 'reserved', null],
  ['179-184', 'A', [182], 'single', 'occupied', null],
  ['179-184', 'A', [183, 184], 'hidden', 'available', 24995],  // summed, see PRICE_EXCEPTIONS
  ['185-191', 'G', [185], 'tandem', 'reserved', null],
  ['185-191', 'G', [186], 'tandem', 'available', 22995],
  ['185-191', 'G', [187], 'tandem', 'available', 22995],
  ['185-191', 'G', [188], 'tandem', 'available', 22995],
  ['185-191', 'G', [189], 'tandem', 'available', 22995],
  ['185-191', 'G', [190], 'tandem', 'available', 22995],
  ['185-191', 'G', [191], 'tandem', 'occupied', null],
  ['185-191', 'F', [185], 'tandem', 'available', 25995],
  ['185-191', 'F', [186], 'tandem', 'available', 25995],
  ['185-191', 'F', [187], 'tandem', 'available', 25995],
  ['185-191', 'F', [188], 'tandem', 'available', 25995],
  ['185-191', 'F', [189], 'tandem', 'available', 25995],
  ['185-191', 'F', [190], 'tandem', 'available', 25995],
  ['185-191', 'F', [191], 'tandem', 'available', 25995],
  ['185-191', 'E', [185], 'tandem', 'occupied', null],
  ['185-191', 'E', [186], 'tandem', 'available', 27995],
  ['185-191', 'E', [187], 'tandem', 'available', 27995],
  ['185-191', 'E', [188], 'tandem', 'available', 27995],
  ['185-191', 'E', [189], 'tandem', 'available', 27995],
  ['185-191', 'E', [190], 'tandem', 'available', 27995],
  ['185-191', 'E', [191], 'tandem', 'available', 27995],
  ['185-191', 'D', [185], 'tandem', 'available', 30995],
  ['185-191', 'D', [186], 'tandem', 'available', 30995],
  ['185-191', 'D', [187], 'tandem', 'available', 30995],
  ['185-191', 'D', [188], 'tandem', 'available', 30995],
  ['185-191', 'D', [189], 'tandem', 'available', 30995],
  ['185-191', 'D', [190], 'tandem', 'available', 30995],
  ['185-191', 'D', [191], 'tandem', 'available', 30995],
  ['185-191', 'C', [185], 'tandem', 'available', 32995],
  ['185-191', 'C', [186], 'tandem', 'available', 32995],
  ['185-191', 'C', [187], 'tandem', 'available', 32995],
  ['185-191', 'C', [188], 'tandem', 'available', 32995],
  ['185-191', 'C', [189], 'tandem', 'occupied', null],
  ['185-191', 'C', [190], 'tandem', 'available', 32995],
  ['185-191', 'C', [191], 'tandem', 'available', 32995],
  ['185-191', 'B', [185], 'tandem', 'occupied', null],
  ['185-191', 'B', [186], 'tandem', 'reserved', null],
  ['185-191', 'B', [187], 'tandem', 'available', 32995],
  ['185-191', 'B', [188], 'tandem', 'available', 32995],
  ['185-191', 'B', [189], 'tandem', 'available', 32995],
  ['185-191', 'B', [190], 'tandem', 'reserved', null],
  ['185-191', 'B', [191], 'tandem', 'occupied', null],
  ['185-191', 'A', [185], 'tandem', 'available', 30995],
  ['185-191', 'A', [186], 'tandem', 'available', 30995],
  ['185-191', 'A', [187], 'tandem', 'available', 30995],
  ['185-191', 'A', [188], 'tandem', 'available', 30995],
  ['185-191', 'A', [189], 'tandem', 'available', 30995],
  ['185-191', 'A', [190], 'tandem', 'available', 30995],
  ['185-191', 'A', [191], 'tandem', 'available', 30995],
  ['192-193', 'G', [192], 'single', 'reserved', null],
  ['192-193', 'G', [193], 'single', 'reserved', null],
  ['192-193', 'F', [192], 'single', 'available', 19995],
  ['192-193', 'F', [193], 'single', 'available', 19995],
  ['192-193', 'E', [192], 'single', 'available', 19995],
  ['192-193', 'E', [193], 'single', 'available', 19995],
  ['192-193', 'D', [192], 'single', 'available', 22995],
  ['192-193', 'D', [193], 'single', 'reserved', null],
  ['192-193', 'C', [192], 'single', 'occupied', null],
  ['192-193', 'C', [193], 'single', 'available', 24995],
  ['192-193', 'B', [192], 'single', 'occupied', null],
  ['192-193', 'B', [193], 'single', 'occupied', null],
  ['192-193', 'A', [192], 'single', 'available', 22995],
  ['192-193', 'A', [193], 'single', 'available', 22995],
  ['194-200', 'G', [194], 'single', 'available', 16995],
  ['194-200', 'G', [195, 196], 'deluxe', 'available', 30995],
  ['194-200', 'G', [197], 'single', 'available', 16995],
  ['194-200', 'G', [198, 199], 'deluxe', 'available', 30995],
  ['194-200', 'G', [200], 'single', 'occupied', null],
  ['194-200', 'F', [194], 'single', 'reserved', null],
  ['194-200', 'F', [195, 196], 'deluxe', 'available', 33995],
  ['194-200', 'F', [197], 'single', 'available', 19995],
  ['194-200', 'F', [198, 199], 'deluxe', 'available', 33995],
  ['194-200', 'F', [200], 'single', 'available', 19995],
  ['194-200', 'E', [194], 'single', 'available', 19995],
  ['194-200', 'E', [195, 196], 'deluxe', 'available', 33995],
  ['194-200', 'E', [197], 'single', 'available', 19995],
  ['194-200', 'E', [198, 199], 'deluxe', 'reserved', null],
  ['194-200', 'E', [200], 'single', 'reserved', null],
  ['194-200', 'D', [194], 'single', 'reserved', null],
  ['194-200', 'D', [195, 196], 'deluxe', 'occupied', null],
  ['194-200', 'D', [197], 'single', 'available', 22995],
  ['194-200', 'D', [198, 199], 'deluxe', 'available', 36995],
  ['194-200', 'D', [200], 'single', 'occupied', null],
  ['194-200', 'C', [194], 'single', 'occupied', null],
  ['194-200', 'C', [195, 196], 'deluxe', 'occupied', null],
  ['194-200', 'C', [197], 'single', 'reserved', null],
  ['194-200', 'C', [198, 199], 'deluxe', 'occupied', null],
  ['194-200', 'C', [200], 'single', 'occupied', null],
  ['194-200', 'B', [194], 'single', 'occupied', null],
  ['194-200', 'B', [195, 196], 'deluxe', 'occupied', null],
  ['194-200', 'B', [197], 'single', 'reserved', null],
  ['194-200', 'B', [198, 199], 'deluxe', 'reserved', null],
  ['194-200', 'B', [200], 'single', 'available', 24995],
  ['194-200', 'A', [194], 'single', 'occupied', null],
  ['194-200', 'A', [195, 196], 'deluxe', 'available', 36995],
  ['194-200', 'A', [197], 'single', 'reserved', null],
  ['194-200', 'A', [198, 199], 'deluxe', 'available', 36995],
  ['194-200', 'A', [200], 'single', 'available', 22995],
  ['201-212', 'G', [201], 'tandem', 'occupied', null],
  ['201-212', 'G', [202], 'tandem', 'available', 12995],
  ['201-212', 'G', [203], 'tandem', 'available', 12995],
  ['201-212', 'G', [204], 'tandem', 'reserved', null],
  ['201-212', 'G', [205], 'single', 'occupied', null],
  ['201-212', 'G', [206, 207], 'deluxe', 'available', 26395],
  ['201-212', 'G', [208], 'single', 'available', 9995],
  ['201-212', 'G', [209], 'tandem', 'available', 12995],
  ['201-212', 'G', [210], 'tandem', 'available', 12995],
  ['201-212', 'G', [211], 'tandem', 'available', 12995],
  ['201-212', 'G', [212], 'tandem', 'available', 12995],
  ['201-212', 'F', [201], 'tandem', 'available', 13995],
  ['201-212', 'F', [202], 'tandem', 'available', 15995],
  ['201-212', 'F', [203], 'tandem', 'available', 15995],
  ['201-212', 'F', [204], 'tandem', 'available', 15995],
  ['201-212', 'F', [205], 'single', 'occupied', null],
  ['201-212', 'F', [206, 207], 'deluxe', 'available', 30795],
  ['201-212', 'F', [208], 'single', 'available', 12995],
  ['201-212', 'F', [209], 'tandem', 'available', 15995],
  ['201-212', 'F', [210], 'tandem', 'available', 15995],
  ['201-212', 'F', [211], 'tandem', 'available', 15995],
  ['201-212', 'F', [212], 'tandem', 'available', 15995],
  ['201-212', 'E', [201], 'tandem', 'reserved', null],
  ['201-212', 'E', [202], 'tandem', 'available', 18995],
  ['201-212', 'E', [203], 'tandem', 'available', 18995],
  ['201-212', 'E', [204], 'tandem', 'available', 18995],
  ['201-212', 'E', [205], 'single', 'available', 14995],
  ['201-212', 'E', [206, 207], 'deluxe', 'available', 36295],
  ['201-212', 'E', [208], 'single', 'available', 14995],
  ['201-212', 'E', [209], 'tandem', 'available', 18995],
  ['201-212', 'E', [210], 'tandem', 'available', 18995],
  ['201-212', 'E', [211], 'tandem', 'available', 18995],
  ['201-212', 'E', [212], 'tandem', 'available', 18995],
  ['201-212', 'D', [201], 'tandem', 'occupied', null],
  ['201-212', 'D', [202], 'tandem', 'reserved', null],
  ['201-212', 'D', [203], 'tandem', 'occupied', null],
  ['201-212', 'D', [204], 'tandem', 'reserved', null],
  ['201-212', 'D', [205], 'single', 'available', 16995],
  ['201-212', 'D', [206, 207], 'deluxe', 'occupied', null],
  ['201-212', 'D', [208], 'single', 'reserved', null],
  ['201-212', 'D', [209], 'tandem', 'reserved', null],
  ['201-212', 'D', [210], 'tandem', 'occupied', null],
  ['201-212', 'D', [211], 'tandem', 'available', 24995],
  ['201-212', 'D', [212], 'tandem', 'occupied', null],
  ['201-212', 'C', [201], 'tandem', 'reserved', null],
  ['201-212', 'C', [202], 'tandem', 'occupied', null],
  ['201-212', 'C', [203], 'tandem', 'occupied', null],
  ['201-212', 'C', [204], 'tandem', 'reserved', null],
  ['201-212', 'C', [205], 'single', 'occupied', null],
  ['201-212', 'C', [206, 207], 'deluxe', 'occupied', null],
  ['201-212', 'C', [208], 'single', 'occupied', null],
  ['201-212', 'C', [209], 'tandem', 'occupied', null],
  ['201-212', 'C', [210], 'tandem', 'occupied', null],
  ['201-212', 'C', [211], 'tandem', 'reserved', null],
  ['201-212', 'C', [212], 'tandem', 'reserved', null],
  ['201-212', 'B', [201], 'tandem', 'occupied', null],
  ['201-212', 'B', [202], 'tandem', 'occupied', null],
  ['201-212', 'B', [203], 'tandem', 'reserved', null],
  ['201-212', 'B', [204], 'tandem', 'reserved', null],
  ['201-212', 'B', [205], 'single', 'occupied', null],
  ['201-212', 'B', [206, 207], 'deluxe', 'occupied', null],
  ['201-212', 'B', [208], 'single', 'occupied', null],
  ['201-212', 'B', [209], 'tandem', 'reserved', null],
  ['201-212', 'B', [210], 'tandem', 'reserved', null],
  ['201-212', 'B', [211], 'tandem', 'reserved', null],
  ['201-212', 'B', [212], 'tandem', 'reserved', null],
  ['201-212', 'A', [201], 'tandem', 'available', 24995],
  ['201-212', 'A', [202], 'tandem', 'available', 24995],
  ['201-212', 'A', [203], 'tandem', 'available', 24995],
  ['201-212', 'A', [204], 'tandem', 'available', 24995],
  ['201-212', 'A', [205], 'single', 'occupied', null],
  ['201-212', 'A', [206, 207], 'deluxe', 'occupied', null],
  ['201-212', 'A', [208], 'single', 'reserved', null],
  ['201-212', 'A', [209], 'tandem', 'available', 24995],
  ['201-212', 'A', [210], 'tandem', 'available', 24995],
  ['201-212', 'A', [211], 'tandem', 'available', 24995],
  ['201-212', 'A', [212], 'tandem', 'available', 24995],
  ['213-219', 'G', [213], 'single', 'available', 9995],
  ['213-219', 'G', [214, 215], 'deluxe', 'available', 22995],
  ['213-219', 'G', [216], 'single', 'available', 9895],
  ['213-219', 'G', [217, 218], 'deluxe', 'available', 22995],
  ['213-219', 'G', [219], 'single', 'available', 9995],
  ['213-219', 'F', [213], 'single', 'occupied', null],
  ['213-219', 'F', [214, 215], 'deluxe', 'available', 25995],
  ['213-219', 'F', [216], 'single', 'occupied', null],
  ['213-219', 'F', [217, 218], 'deluxe', 'available', 25995],
  ['213-219', 'F', [219], 'single', 'available', 13995],
  ['213-219', 'E', [213], 'single', 'available', 13995],
  ['213-219', 'E', [214, 215], 'deluxe', 'available', 25995],
  ['213-219', 'E', [216], 'single', 'available', 15995],
  ['213-219', 'E', [217, 218], 'deluxe', 'available', 25995],
  ['213-219', 'E', [219], 'single', 'occupied', null],
  ['213-219', 'D', [213], 'single', 'occupied', null],
  ['213-219', 'D', [214, 215], 'deluxe', 'occupied', null],
  ['213-219', 'D', [216], 'single', 'reserved', null],
  ['213-219', 'D', [217, 218], 'deluxe', 'available', 28995],
  ['213-219', 'D', [219], 'single', 'occupied', null],
  ['213-219', 'C', [213], 'single', 'reserved', null],
  ['213-219', 'C', [214, 215], 'deluxe', 'occupied', null],
  ['213-219', 'C', [216], 'single', 'occupied', null],
  ['213-219', 'C', [217, 218], 'deluxe', 'reserved', null],
  ['213-219', 'C', [219], 'single', 'reserved', null],
  ['213-219', 'B', [213], 'single', 'occupied', null],
  ['213-219', 'B', [214, 215], 'deluxe', 'reserved', null],
  ['213-219', 'B', [216], 'single', 'reserved', null],
  ['213-219', 'B', [217, 218], 'deluxe', 'reserved', null],
  ['213-219', 'B', [219], 'single', 'blocked', null],
  ['213-219', 'A', [213], 'single', 'reserved', null],
  ['213-219', 'A', [214, 215], 'deluxe', 'reserved', null],
  ['213-219', 'A', [216], 'single', 'occupied', null],
  ['213-219', 'A', [217, 218], 'deluxe', 'reserved', null],
  ['213-219', 'A', [219], 'single', 'occupied', null],
  ['220-231', 'G', [220], 'single', 'occupied', null],
  ['220-231', 'G', [221, 222], 'deluxe', 'available', 22995],
  ['220-231', 'G', [223], 'single', 'available', 9995],
  ['220-231', 'G', [224], 'tandem', 'available', 12995],
  ['220-231', 'G', [225], 'tandem', 'available', 12995],
  ['220-231', 'G', [226], 'tandem', 'available', 12995],
  ['220-231', 'G', [227], 'tandem', 'available', 12995],
  ['220-231', 'G', [228], 'single', 'available', 9995],
  ['220-231', 'G', [229, 230], 'deluxe', 'available', 26395],
  ['220-231', 'G', [231], 'single', 'available', 9995],
  ['220-231', 'F', [220], 'single', 'available', 13995],
  ['220-231', 'F', [221, 222], 'deluxe', 'available', 25995],
  ['220-231', 'F', [223], 'single', 'occupied', null],
  ['220-231', 'F', [224], 'tandem', 'available', 15995],
  ['220-231', 'F', [225], 'tandem', 'available', 15995],
  ['220-231', 'F', [226], 'tandem', 'available', 15995],
  ['220-231', 'F', [227], 'tandem', 'available', 15995],
  ['220-231', 'F', [228], 'single', 'reserved', null],
  ['220-231', 'F', [229, 230], 'deluxe', 'available', 30795],
  ['220-231', 'F', [231], 'single', 'occupied', null],
  ['220-231', 'E', [220], 'single', 'reserved', null],
  ['220-231', 'E', [221, 222], 'deluxe', 'available', 25995],
  ['220-231', 'E', [223], 'single', 'occupied', null],
  ['220-231', 'E', [224], 'tandem', 'occupied', null],
  ['220-231', 'E', [225], 'tandem', 'available', 18995],
  ['220-231', 'E', [226], 'tandem', 'available', 18995],
  ['220-231', 'E', [227], 'tandem', 'occupied', null],
  ['220-231', 'E', [228], 'single', 'available', 14995],
  ['220-231', 'E', [229, 230], 'deluxe', 'occupied', null],
  ['220-231', 'E', [231], 'single', 'reserved', null],
  ['220-231', 'D', [220], 'single', 'occupied', null],
  ['220-231', 'D', [221, 222], 'deluxe', 'occupied', null],
  ['220-231', 'D', [223], 'single', 'reserved', null],
  ['220-231', 'D', [224], 'tandem', 'occupied', null],
  ['220-231', 'D', [225], 'tandem', 'available', 24995],
  ['220-231', 'D', [226], 'tandem', 'available', 24995],
  ['220-231', 'D', [227], 'tandem', 'occupied', null],
  ['220-231', 'D', [228], 'single', 'occupied', null],
  ['220-231', 'D', [229, 230], 'deluxe', 'occupied', null],
  ['220-231', 'D', [231], 'single', 'occupied', null],
  ['220-231', 'C', [220], 'single', 'occupied', null],
  ['220-231', 'C', [221, 222], 'deluxe', 'reserved', null],
  ['220-231', 'C', [223], 'single', 'occupied', null],
  ['220-231', 'C', [224], 'tandem', 'reserved', null],
  ['220-231', 'C', [225], 'tandem', 'available', 28995],
  ['220-231', 'C', [226], 'tandem', 'reserved', null],
  ['220-231', 'C', [227], 'tandem', 'reserved', null],
  ['220-231', 'C', [228], 'single', 'reserved', null],
  ['220-231', 'C', [229, 230], 'deluxe', 'occupied', null],
  ['220-231', 'C', [231], 'single', 'occupied', null],
  ['220-231', 'B', [220], 'single', 'occupied', null],
  ['220-231', 'B', [221, 222], 'deluxe', 'reserved', null],
  ['220-231', 'B', [223], 'single', 'reserved', null],
  ['220-231', 'B', [224], 'tandem', 'reserved', null],
  ['220-231', 'B', [225], 'tandem', 'occupied', null],
  ['220-231', 'B', [226], 'tandem', 'reserved', null],
  ['220-231', 'B', [227], 'tandem', 'available', 28995],
  ['220-231', 'B', [228], 'single', 'reserved', null],
  ['220-231', 'B', [229, 230], 'deluxe', 'reserved', null],
  ['220-231', 'B', [231], 'single', 'occupied', null],
  ['220-231', 'A', [220], 'single', 'occupied', null],
  ['220-231', 'A', [221, 222], 'deluxe', 'occupied', null],
  ['220-231', 'A', [223], 'single', 'occupied', null],
  ['220-231', 'A', [224], 'tandem', 'available', 24995],
  ['220-231', 'A', [225], 'tandem', 'available', 24995],
  ['220-231', 'A', [226], 'tandem', 'available', 24995],
  ['220-231', 'A', [227], 'tandem', 'occupied', null],
  ['220-231', 'A', [228], 'single', 'occupied', null],
  ['220-231', 'A', [229, 230], 'deluxe', 'reserved', null],
  ['220-231', 'A', [231], 'single', 'reserved', null],
];

/**
 * ── NICHE SIZE CLASSES, MEASURED 2026-08-02 (sprint-11 Track A) ──────────────
 *
 * OPERATOR: "On both the 3D version and the floor plan the niches are not sized
 * correctly — there are a few different sizes of glass front niches on each wall."
 * He was right, and the reason was structural: the cell rows below carried price and
 * row-span but NO size, so both the flat grid and the 3D wall drew every niche in one
 * uniform column. The sizes are now per cell.
 *
 * DERIVED BY PIXEL MEASUREMENT, NOT BY EYE. `scripts/measure_niche_sheets.mjs` decodes
 * the operator's two wall sheets (D:\Cemetery Photos Misc\Radiance and Serenity
 * Niches\{Radiance,Serenity}.png — his files, deliberately NOT committed to a public
 * repo), finds each row's own cell borders, and solves the drawn widths against the
 * sheet's printed legend under the one constraint that makes it checkable: every row of
 * a wall spans the same physical wall, so every row's classes must sum to the same
 * number of inches. Re-run it to re-derive; never hand-edit the patterns.
 *
 * SERENITY is drawn to scale — 416 px = 88.5" at 4.70 px/inch, and the two drawn widths
 * read back as exactly Large 22 1/8" and Small 11 1/16". Rows K/J/B/A are
 * [L,S,S,S,S,L] = 88.5" and rows H-C are [L,L,L,L] = 88.5". (Director's spot check,
 * confirmed rather than assumed.)
 *
 * RADIANCE is NOT drawn to scale: four legend classes but only three drawn widths, a
 * 2:3:4 ratio on a 43 px spreadsheet-column unit, so a cell's class cannot be read off
 * its width. The constant-row-width solve has exactly ONE answer over the four legend
 * widths (the measurement script prints the whole candidate search):
 *
 *     rows K H F C A   S L S L L S L S   4 x 18 1/4" + 4 x 23"        = 165"
 *     rows J G B       L S L S L S L S   same multiset, permuted      = 165"
 *     rows E D         X F X X F X       4 x 26" + 2 x 30 1/2"        = 165"
 *
 * All four classes are used and every row lands on 165" to the inch. The 129 px drawn
 * width therefore means Large (23") on an eight-cell row and X-Large (26") on the E/D
 * row-pair — the sheet's column grid simply cannot separate those two.
 *
 * THE FAMILY DISCREPANCY, RECORDED AND NOT RESOLVED. The legend gives Family as
 * 11 7/8" x 30 1/2" x 25 1/2": the same HEIGHT as every other Radiance class, and twice
 * the DEPTH. The sheet nevertheless draws its two Family cells TWO ROWS TALL. Both
 * cannot be true. This file models what the sheet DRAWS (two rows tall, widest on the
 * wall) because that is the drawing the operator and the family both look at, and
 * carries the legend's height and depth figures beside it unaltered. Nobody has invented
 * a reconciliation; if MIS settles it, change `spanRows` or `h`, not both silently.
 *
 * PRICES ARE UNTOUCHED BY THIS PASS. The sheets print prices; those are stale and were
 * not read (DESIGN §8, 2026-07-26: never price from a sheet). Only geometry was taken.
 */

// ── Radiance niche wall (RAD-1-1-ROW-SPACE) ───────────────────────────────────
// Rows K (top) to A (bottom). Cells labelled -1- .. -8- on the sheet.
export const RAD_ROWS = ['K', 'J', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'];
export const RAD_SIZES = [
  { k: 'family', label: 'Family (2)', dims: '11 7/8" x 30 1/2" x 25 1/2"', h: 11.875, w: 30.5, d: 25.5 },
  { k: 'xlarge', label: 'X-Large (2)', dims: '11 7/8" x 26" x 12 3/4"', h: 11.875, w: 26, d: 12.75 },
  { k: 'large', label: 'Large (2)', dims: '11 7/8" x 23" x 12 3/4"', h: 11.875, w: 23, d: 12.75 },
  { k: 'small', label: 'Small (2)', dims: '11 7/8" x 18 1/4" x 12 3/4"', h: 11.875, w: 18.25, d: 12.75 },
];
/**
 * Class per COLUMN, per row — the three measured row shapes. A row's array is indexed by
 * (column - 1) and covers every column that OCCUPIES the row, including the two Family
 * cells that start in E and span into D, which is what makes the per-row width sum come
 * out constant on both rows of the pair.
 */
const RAD_P1 = ['small', 'large', 'small', 'large', 'large', 'small', 'large', 'small'];
const RAD_P2 = ['large', 'small', 'large', 'small', 'large', 'small', 'large', 'small'];
const RAD_PE = ['xlarge', 'family', 'xlarge', 'xlarge', 'family', 'xlarge'];
export const RAD_ROW_CLASSES = {
  K: RAD_P1, J: RAD_P2, H: RAD_P1, G: RAD_P2, F: RAD_P1,
  E: RAD_PE, D: RAD_PE,
  C: RAD_P1, B: RAD_P2, A: RAD_P1,
};
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
  { k: 'large', label: 'Large (2)', dims: '10 1/2" x 22 1/8" x 12 3/4"', h: 10.5, w: 22.125, d: 12.75 },
  { k: 'small', label: 'Small (2)', dims: '10 1/2" x 11 1/16" x 12 3/4"', h: 10.5, w: 11.0625, d: 12.75 },
];
// Two measured row shapes. A Small is exactly half a Large, which is why this wall IS
// drawn to scale and why both shapes land on 88.5" without any solving.
const SER_P6 = ['large', 'small', 'small', 'small', 'small', 'large'];
const SER_P4 = ['large', 'large', 'large', 'large'];
export const SER_ROW_CLASSES = {
  K: SER_P6, J: SER_P6,
  H: SER_P4, G: SER_P4, F: SER_P4, E: SER_P4, D: SER_P4, C: SER_P4,
  B: SER_P6, A: SER_P6,
};
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
/**
 * -- BOTH NICHE WALLS RE-BOUND FROM THE WALKTHROUGH VIDEO, 2026-08-01 (Track X2) --
 *
 * OPERATOR CORRECTION (binding): Track X read the material change at 1:12 as the
 * boundary to a different building and concluded the only glass-front columbaria on
 * film were outside COM. They are not: "yes both are inside the chapel of memories
 * and are blatantly shown multiple times." The ENTIRE walk
 * (D:\Cemetery Photos Misc\Chapel of Memories\20260729_124129.mp4, frames at 1 fps)
 * is COM interior; 1:12 is a glazed interior screen between the cream-travertine wing
 * and the rose-marble wing, not an exterior door.
 *
 * WHICH WALL IS WHICH -- two independent lines agree:
 *
 *  SERENITY = the wall at 1:25-1:28.
 *    - Route: he leaves the rest rooms (1:16-1:24; the restroom door with its
 *      pictogram and the open sink alcove are on the left of frame at 1:16, matching
 *      the CAD REST ROOMS), turns, and this wall is the first thing on his left.
 *      SERENITY NICHES is the only niche block the CAD puts next to the rest rooms.
 *    - He then walks WEST down the north hall (1:29-1:46) and arrives in the chapel
 *      (1:47-1:51), so the wall was on the SOUTH side of that hall: it faces NORTH.
 *    - Structure: 1:27 is near-frontal -- a bronze-framed grid about six columns wide
 *      and ten rows tall, recessed into the wall with a marble jamb each side (pale
 *      travertine left, rose marble right). SER is the 6-wide sheet.
 *
 *  RADIANCE = the wall at 1:59-2:04.
 *    - Route: from the chapel he walks along the cream-travertine wall carrying the
 *      tall stained-glass windows (1:52-1:58 -- the same window family as 0:01-0:07,
 *      i.e. bank 101-110, the chapel west wall) and turns into an alcove at its north
 *      end. RADIANCE NICHES is the CAD block at exactly that corner.
 *    - The alcove is daylit: two arched clear-glazed windows in the exterior wall
 *      (2:00 and 2:04 show them side by side), two upholstered armchairs and a small
 *      round table beneath them (2:00). Radiance is the only niche block the CAD puts
 *      against an exterior wall, so it is the only one that can be daylit.
 *    - Structure: the grid is visibly WIDER than Serenity's over the same ten-row
 *      height (2:01-2:03), consistent with the 8-wide RAD sheet against 6-wide SER.
 *
 * FACINGS ARE NO LONGER ESTIMATED. Both walls read as face 'N':
 *  - Serenity: south side of the north hall, back on the island's north line.
 *  - Radiance: north end of bank 101-110, looking north across the alcove at the
 *    arched windows.
 *
 * MOUNTING. Neither wall is free-standing. Both are RECESSED into a marble wall, with
 * a marble reveal each side and a marble plinth at the floor (1:27, 2:01-2:03), the
 * surrounding wall carried past them full height. mount/surround record that so the
 * renderer draws the reveal instead of a floating slab.
 *
 * COUNTS, REFS, PRICES AND STATUSES ARE UNTOUCHED by this pass. Column counts on film
 * come from oblique hand-held frames and are corroborating only -- they were NOT used
 * to change any sheet grid.
 */
/**
 * ONE SELECTABLE AREA PER WALL, 2026-08-02 (sprint-11 Track A).
 *
 * OPERATOR: "For the Chapel of Memory have one niche wall selection for Radiance and
 * one for Serenity. Right now it is just one niche walls [selection]."
 *
 * So `area` is now the wall's OWN area id (`rad` / `ser`) instead of a shared `niches`,
 * and AREAS carries an entry for each. Everything that keys off an area — the printable
 * list tabs, the 3D fly-to buttons, the breadcrumb, the ghosting, the print scope and
 * the search index — follows from that one field, so nothing had to learn about niches
 * specially. `homeArea` is unchanged and still says which part of the building a
 * counselor physically walks to in order to stand in front of the wall, which is what
 * keeps the wall solid (not ghosted) while you are standing there.
 */
export const WALLS = {
  RAD: {
    id: 'RAD', name: 'Radiance', prefix: 'RAD-1-1', rows: RAD_ROWS, cells: RAD_CELLS,
    sizes: RAD_SIZES, rowClasses: RAD_ROW_CLASSES,
    cols: 8, area: 'rad', homeArea: 'west', stop: 'radiance',
    plan: { x: 6, y: 152, w: 104, h: 20 }, face: 'N', mount: 'recessed', surround: 'rose',
    note: "Daylit alcove at the chapel’s north-west corner: it stands on the north end of bank 101-110 and looks NORTH across the alcove to the arched windows in the west exterior wall.",
  },
  SER: {
    id: 'SER', name: 'Serenity', prefix: 'SER-1-1', rows: SER_ROWS, cells: SER_CELLS,
    sizes: SER_SIZES, rowClasses: SER_ROW_CLASSES,
    cols: 6, area: 'ser', homeArea: 'island', stop: 'serenity',
    plan: { x: 494, y: 146, w: 78, h: 20 }, face: 'N', mount: 'recessed', surround: 'rose',
    note: "North hall, capping the island’s north-east corner: its back sits on the island’s north line and it looks NORTH across the hall at bank 124-140.",
  },
};

/**
 * Plan units per INCH of niche wall. The two walls are now drawn at their real relative
 * widths — Radiance spans 165", Serenity 88.5", so Serenity is a little over half as
 * wide, where before both were drawn as `cols x NCOLW` and Serenity came out 75% of
 * Radiance because it happened to have 6 columns to Radiance's 8.
 *
 * The value keeps Radiance's rendered face at exactly the width it already had
 * (165 x 0.63 = 103.95, against 8 x NCOLW = 104), so nothing in the north-west alcove
 * moved; only Serenity narrowed, and it narrowed toward the truth. The walls' PLAN
 * FOOTPRINTS are untouched — those are measured off the CAD and are not this scale's
 * business; a recessed panel narrower than the wall it is set into is what the building
 * actually looks like.
 */
export const NICHE_UPI = 0.63;

/** The size class of one niche, straight off the measured row pattern. */
export function nicheSize(wid, row, col) {
  const w = WALLS[wid];
  const k = (w.rowClasses[row] || [])[col - 1];
  return w.sizes.find((s) => s.k === k) || null;
}

/** Total physical width of a wall, in inches. Constant across its rows by construction. */
export function wallWidthIn(wid) {
  const w = WALLS[wid];
  return (w.rowClasses[w.rows[0]] || []).reduce((t, k) => t + w.sizes.find((s) => s.k === k).w, 0);
}

/**
 * Every row's width in inches, counting each cell that OCCUPIES the row — including a
 * Family cell that starts one row above. This is the invariant the size classes were
 * solved against, so the gate re-checks it here rather than trusting the patterns.
 */
export function wallRowWidths(wid) {
  const w = WALLS[wid];
  return w.rows.map((r) => ({
    row: r,
    cells: (w.rowClasses[r] || []).length,
    inches: (w.rowClasses[r] || []).reduce((t, k) => t + w.sizes.find((s) => s.k === k).w, 0),
  }));
}

/** Left edge of a column, in inches from the wall's left end. */
export function nicheLeftIn(wid, row, col) {
  const w = WALLS[wid];
  const pat = w.rowClasses[row] || [];
  let x = 0;
  for (let i = 0; i < col - 1; i++) x += w.sizes.find((s) => s.k === pat[i]).w;
  return x;
}

// ── Derived helpers ───────────────────────────────────────────────────────────
export const bankById = (id) => BANKS.find((b) => b.id === id);

/** Ref for a crypt unit: COM-1-1-<tier>-<lowest space number>. */
export const cryptRef = (u) => `COM-1-1-${u[1]}-${u[2][0]}`;

export function cryptUnits() {
  return UNITS.map((u) => ({
    bank: u[0], tier: u[1], cols: u[2], type: u[3], st: u[4],
    ref: cryptRef(u), p: u[4] === 'available' ? u[5] : null,
  }));
}

export function wallNiches(wid) {
  const w = WALLS[wid];
  const total = wallWidthIn(wid);
  return w.cells.map((c) => {
    const sz = nicheSize(wid, c[0], c[1]);
    const left = nicheLeftIn(wid, c[0], c[1]);
    return {
      wall: wid, row: c[0], col: c[1], p: c[2] == null ? null : c[2],
      spanRows: c[3] || null,
      st: c[2] == null ? 'unavailable' : 'available',
      // Size is now MEASURED per cell, not "Family or nothing" — see RAD_ROW_CLASSES.
      sizeKey: sz ? sz.k : null,
      size: sz ? sz.label : null,
      dims: sz ? sz.dims : null,
      wIn: sz ? sz.w : null,
      // fractions of the wall's width, for drawing the cell at its true size
      leftPct: +((left / total) * 100).toFixed(4),
      widthPct: sz ? +((sz.w / total) * 100).toFixed(4) : null,
      ref: `${w.prefix}-${c[0]}-${c[1]}`,
    };
  });
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
