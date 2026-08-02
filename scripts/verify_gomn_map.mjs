/**
 * Gate for the Garden of Meditation niche map.
 *
 * Proves that MAPS/GOMN_NicheMap.html is a faithful, deterministic rendering of
 * scripts/gomn-niche-data.mjs, that the stepped wall has exactly the shape both source
 * sheets draw, and — the part that matters in front of a family — that NOT ONE dollar
 * figure is rendered for a niche the sheet does not price.
 *
 *   node scripts/verify_gomn_map.mjs
 *
 * Exit 1 on any failure. Sabotage a price, a status, or the wall's shape in the data
 * module and this must go red.
 *
 * Sabotage-proven: `node scripts/verify_gomn_map.mjs --sabotage` mutates the data module
 * one perturbation at a time, rebuilds, and requires this gate to exit 1 on every one.
 *
 * ── WHY THIS GATE CARRIES ITS OWN NUMBERS ─────────────────────────────────────────
 * The ECL sheet printed COUNT fields the gate could check against. The Garden of
 * Meditation sheet prints none. So the anchors below are TYPED BY HAND from the source
 * of record, and are deliberately NOT derived from the data module — if they were, a
 * mistyped cell would move the anchor with it and the gate would agree with the bug.
 *
 * ── THE ANCHORS SPLIT IN TWO ON 2026-08-01 ────────────────────────────────────────
 * They used to come from one document. They now come from two, and the split is the
 * point:
 *   SHAPE and PRICES        still the Jan-30-2025 price sheet (GOMN MAP.png) — the wall
 *                           is 168 niches and $5,995 still means $5,995.
 *   AVAILABILITY            the operator's MIS export of 2026-08-01, typed out below
 *                           space by space from the list he sent.
 * The inventory anchors therefore MOVED, deliberately, and each old value is quoted
 * beside its replacement so a reader can audit the change rather than take it on trust.
 * Re-derive the price anchors if the sheet is reissued; re-type the availability anchors
 * from the next export.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  ROWS, BLOCKS, ROW_RUNS, TIERS, FEES, FEE_SOURCE, INSCR_MAX, URN,
  SHEET_TEXT, COMPANION_NOTE, allNiches, refOf, sellable, ecf, estTotal,
  PRICES, AVAILABILITY, LISTED_NO_PRICE, SOLD_SINCE_SHEET,
} from './gomn-niche-data.mjs';

const DATA = path.join(path.dirname(fileURLToPath(import.meta.url)), 'gomn-niche-data.mjs');
const BUILD = path.join(path.dirname(fileURLToPath(import.meta.url)), 'build_gomn_map.mjs');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REL = 'MAPS/GOMN_NicheMap.html';
const ABS = path.join(ROOT, REL);

// ── ANCHORS, typed from D:\Cemetery Photos Misc\GOMN Niches\GOMN MAP.png ─────
// The wall's shape, independently retyped from the outline sheet GOMN NICHE MAP.png.
const SHEET_RUNS = {
  G: [[9, 24]],
  F: [[9, 24]],
  E: [[5, 8], [9, 24], [25, 28]],
  D: [[5, 8], [9, 24], [25, 28]],
  C: [[5, 8], [9, 24], [25, 28]],
  B: [[1, 32]],
  A: [[1, 32]],
};
const SHEET_TOTAL = 168;
const SHEET_ROW_COUNT = { G: 16, F: 16, E: 24, D: 24, C: 24, B: 32, A: 32 };
const SHEET_BLOCK_COUNT = { L: 28, C: 112, R: 28 };

// ── AVAILABILITY ANCHORS, typed from the operator's MIS export of 2026-08-01 ──
// Wall-1 is this GOM-1-1 wall; Lvl is the row, Sp the space. Typed out here in full, from
// the list itself, so this gate does not simply agree with whatever the data module says.
//
//   Lvl-B Sp-10                                        -> $0     NOT OFFERED
//   Lvl-C Sp-7, 9, 12, 13, 14, 18, 20, 22, 24, 25, 26  -> $5,995
//   Lvl-D Sp-15, 20, 24, 26                            -> $6,995
//   Lvl-D Sp-18                                        -> $0     NOT OFFERED
//   Lvl-G Sp-13, 14, 15                                -> $8,995
const LIST_OFFERED = {
  C: [7, 9, 12, 13, 14, 18, 20, 22, 24, 25, 26],
  D: [15, 20, 24, 26],
  G: [13, 14, 15],
};
const LIST_PRICE_BY_ROW = { C: 5995, D: 6995, G: 8995 };
// The export lists these two as available at $0. A price greater than zero is what makes a
// position sellable (the operator's standing rule), so they must render UNAVAILABLE and
// must never carry a figure. The gate checks both halves of that.
const LIST_ZERO_PRICED = ['B-10', 'D-18'];
// The export's own summary line. Level C is the one that does NOT agree with the detail —
// summary 12, detail 11 — and that disagreement is asserted, not smoothed over: if a later
// edit quietly makes them agree, the operator's open question has been answered by a
// script instead of by MIS, and this gate goes red until someone says which way.
const LIST_SUMMARY = { B: 1, C: 12, D: 5, G: 3 };
const LIST_SUMMARY_UNRECONCILED = { row: 'C', summary: 12, detail: 11 };

// ── INVENTORY ANCHORS — MOVED 2026-08-01, old value quoted beside each ────────
// 19 of the sheet's 37 priced niches are gone from the export and are read as SOLD:
//   B ×9 @$4,995 (6,7,11,12,13,15,17,18,23) — level B sold out
//   C ×3 @$5,995 (10,11,19)
//   D ×1 @$6,995 (9)
//   F ×3 @$7,995 (13,22,23)                 — level F sold out
//   G ×3 @$8,995 (16,18,19)
// $120,905 of the sheet's $241,815 sold; $120,910 remains.
const SHEET_AVAIL = 18;                                    // was 37 (sheet, Jan-30-2025)
const SHEET_AVAIL_BY_BLOCK = { L: 1, C: 14, R: 3 };        // was { L: 3, C: 31, R: 3 }
const SHEET_AVAIL_TOTAL = 120910;                          // was 241815
const SHEET_PRICE_MULTISET = { 5995: 11, 6995: 4, 8995: 3 };
// was { 4995: 9, 5995: 14, 6995: 5, 7995: 3, 8995: 6 } — the $4,995 and $7,995 bands are
// empty now, and their colour tiers were removed with them (a legend swatch for a price
// nobody can buy is a promise the wall cannot keep).
const SOLD_SINCE_SHEET_COUNT = 19;
const SHEET_PRICED_COUNT = 37;   // what the Jan-30-2025 sheet printed, for the arithmetic
const SOLD_AT_LIST = 120905;     // 241815 − 120910

// ── FEE ANCHORS, typed from the operator's 2026-07-31 ruling ─────────────────
// NOT from the GOMN sheet — the sheet prints O&C $835 / Recording $225 / Inscription
// $605, and the ruling replaces all three with the Mountain View Columbarium June-2026
// schedule. Typed here by hand for the same reason as the counts above: derived anchors
// agree with their own bugs.
const RULED = { OC: 875, REC: 235, INSCR: 660, TAX: 0.104, ECF_RATE: 0.1 };
const SHEET_PRINTS = { OC: 835, REC: 225, INSCR: 605 };   // superseded, must not appear
const RULED_INSCR_MAX = 2;      // "you can add two inscriptions on the front"
const RULED_URN_PRICE = 665;    // Interlude (Matthews), operator-supplied 2026-07-31
const RULED_URN_MAX = 2;        // two Interlude urns fit — that IS the companion capacity

// Two full card computations, arithmetic done by hand off the ruled schedule.
//
// ── THE URN IS TAXED (operator ruling 2026-07-31, second ruling of that day) ──────
// Track D shipped the Interlude Urn untaxed, with the card saying its tax was "confirmed
// at contract". Martice then ruled that it IS taxed at 10.4%, exactly like the
// inscription. Both anchors below were RE-DERIVED by hand under that ruling; the C-7
// figure moved by the urn tax and nothing else.
//
//   C-7 $5,995, O&C ×1, Recording ×1, Inscription ×2, Interlude ×2
//     5995 + ecf 600 + 875 + 235
//          + inscription 1320 + inscription tax 137.28
//          + urns        1330 + urn tax         138.32   = 10630.60 → rounds to 10631
//     (it was 10492.28 → 10492 before the urn tax; the delta is exactly $138.32)
//   G-13 $8,995, nothing but one inscription — unchanged by this ruling
//     8995 + ecf 900 + 660 + tax 68.64 = 10623.64 → 10624
const CARD_ANCHORS = [
  { ref: 'GOM-1-1-C-7', price: 5995, q: { oc: 1, rec: 1, inscr: 2, urn: 2 }, total: 10631 },
  { ref: 'GOM-1-1-G-13', price: 8995, q: { inscr: 1 }, total: 10624 },
];
// The urn tax on the C-7 anchor, typed separately so the gate can assert the DELTA as
// well as the total — a total can be right for the wrong reason.
const C7_URN_TAX = 138.32;   // 2 × $665 × 10.4%

let failures = 0;
const fail = (m) => { failures++; console.log('  FAIL  ' + m); };
const pass = (m) => console.log('  ok    ' + m);
const ck = (ok, m) => (ok ? pass : fail)(m);
const money = (n) => '$' + n.toLocaleString('en-US');

console.log('\nGarden of Meditation (GOM-1-1) niche-map gate\n');

// ── 0. Data module (checked first: without it the build throws) ──────────────
console.log('Data module');
{
  const data = allNiches();
  const orphan = [...new Set(data.filter(sellable).map((n) => n.p))]
    .filter((p) => !TIERS.some((t) => t.p === p));
  ck(orphan.length === 0, `every price has a colour tier${orphan.length ? ' — orphans: ' + orphan.join(', ') : ` (${TIERS.length} tiers)`}`);
  const ghost = TIERS.map((t) => t.p).filter((p) => !data.some((n) => sellable(n) && n.p === p));
  ck(ghost.length === 0, `no tier is defined for a price that no niche carries${ghost.length ? ' — ' + ghost.join(', ') : ''}`);
  // The fail-safe rule made mechanical: priced <=> available, in both directions.
  const pricedUnavail = data.filter((n) => n.st !== 'available' && n.p !== null);
  ck(pricedUnavail.length === 0, `no unavailable niche carries a price${pricedUnavail.length ? ' — ' + pricedUnavail.map((n) => n.ref).join(', ') : ' (fail-safe rule holds)'}`);
  const blank = data.filter((n) => n.st === 'available' && typeof n.p !== 'number');
  ck(blank.length === 0, `every available niche has a price${blank.length ? ' — ' + blank.map((n) => n.ref).join(', ') : ''}`);
  const known = new Set(['available', 'unavailable']);
  const oddSt = data.filter((n) => !known.has(n.st));
  ck(oddSt.length === 0, `every status is available or unavailable${oddSt.length ? ' — ' + oddSt.map((n) => n.ref + ':' + n.st).join(', ') : ''}`);
  // ROW_RUNS in the data module must be the shape typed from the outline sheet.
  ck(JSON.stringify(ROW_RUNS) === JSON.stringify(SHEET_RUNS),
    "the data module's ROW_RUNS is the wall shape typed from GOMN NICHE MAP.png");
}
if (failures) { console.log(`\nRESULT: ${failures} FAILURE(S) — the page cannot be built from this data`); process.exit(1); }

// ── 1. Build determinism ──────────────────────────────────────────────────────
console.log('\nBuild determinism');
{
  const before = fs.readFileSync(ABS);
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'build_gomn_map.mjs')], { cwd: ROOT, stdio: 'pipe' });
  const after = fs.readFileSync(ABS);
  ck(before.equals(after),
    `rebuilding from scripts/gomn-niche-data.mjs reproduces ${REL} byte for byte (${after.length} bytes)`);
}
const src = fs.readFileSync(ABS, 'utf8');
ck(/Generated by scripts\/build_gomn_map\.mjs/.test(src), 'the page declares its generator and says not to hand-edit');

// ── Parse every rendered niche back out of the HTML ───────────────────────────
function parseCells() {
  const out = [];
  const re = /<button[^>]*class="n[^"]*"[^>]*>[\s\S]*?<\/button>/g;
  for (const m of src.matchAll(re)) {
    const html = m[0];
    const tag = html.slice(0, html.indexOf('>') + 1);
    const at = (k) => { const r = new RegExp(`data-${k}="([^"]*)"`).exec(tag); return r ? r[1] : null; };
    if (at('ref') === null) continue;
    out.push({
      ref: at('ref'), id: at('id'), block: at('block'), rend: at('rend'),
      row: at('row'), col: +at('col'), price: at('price'), st: at('st'), html,
    });
  }
  return out;
}
const cells = parseCells();
const onFull = cells.filter((c) => c.rend === 'full');
const onBlock = cells.filter((c) => c.rend !== 'full');
const data = allNiches();

// ── 2. THE STEPPED SHAPE: voids carry no niches ───────────────────────────────
console.log('\nThe stepped wall shape (voids must be empty)');
{
  const want = new Set();
  let wantN = 0;
  for (const r of ROWS) for (const [a, b] of SHEET_RUNS[r]) for (let c = a; c <= b; c++) { want.add(`${r}-${c}`); wantN++; }
  ck(wantN === SHEET_TOTAL, `the typed shape yields ${SHEET_TOTAL} niches (${wantN})`);

  for (const [name, list] of [['full wall', onFull], ['block views', onBlock]]) {
    const got = new Set(list.map((c) => `${c.row}-${c.col}`));
    const extra = [...got].filter((k) => !want.has(k));
    const missing = [...want].filter((k) => !got.has(k));
    ck(extra.length === 0 && missing.length === 0,
      `${name.padEnd(11)} renders exactly the ${wantN} niches the shape allows` +
      (extra.length ? ` — IN A VOID: ${extra.slice(0, 6).join(', ')}` : '') +
      (missing.length ? ` — missing: ${missing.slice(0, 6).join(', ')}` : ''));
  }
  // Name the voids explicitly, so a future reader can see what is being asserted.
  const voids = [];
  for (const r of ROWS) {
    for (let c = 1; c <= 32; c++) {
      if (!want.has(`${r}-${c}`)) voids.push(`${r}-${c}`);
    }
  }
  ck(voids.length === 7 * 32 - SHEET_TOTAL, `${voids.length} of the 224 grid positions are open sky (7 rows × 32 spaces − ${SHEET_TOTAL})`);
  const inVoid = cells.filter((c) => voids.includes(`${c.row}-${c.col}`));
  ck(inVoid.length === 0, `zero cells sit in a void${inVoid.length ? ' — ' + inVoid.slice(0, 6).map((c) => c.ref).join(', ') : ''}`);
  pass('rows G,F carry only 9–24; rows E,D,C carry 5–8, 9–24 and 25–28; rows B,A carry 1–32');
}

// ── 3. Counts vs the typed anchors ────────────────────────────────────────────
console.log('\nCounts vs the transcription anchors');
for (const r of ROWS) {
  const d = data.filter((n) => n.row === r).length;
  const a = onFull.filter((c) => c.row === r).length;
  const b = onBlock.filter((c) => c.row === r).length;
  ck([d, a, b].every((v) => v === SHEET_ROW_COUNT[r]),
    `row ${r}   anchor ${String(SHEET_ROW_COUNT[r]).padStart(3)}   data ${d}   full wall ${a}   block views ${b}`);
}
for (const b of ['L', 'C', 'R']) {
  const d = data.filter((n) => n.block === b).length;
  const f = onFull.filter((c) => c.block === b).length;
  const v = onBlock.filter((c) => c.block === b).length;
  ck([d, f, v].every((x) => x === SHEET_BLOCK_COUNT[b]),
    `${BLOCKS[b].label.padEnd(15)} anchor ${String(SHEET_BLOCK_COUNT[b]).padStart(3)}   data ${d}   full wall ${f}   block view ${v}`);
}
ck([data.length, onFull.length, onBlock.length].every((v) => v === SHEET_TOTAL),
  `total = ${SHEET_TOTAL} in the data module, on the full wall and across the block views ` +
  `(${[data.length, onFull.length, onBlock.length].join('/')})`);

// ── 4. References ─────────────────────────────────────────────────────────────
console.log('\nReferences (OFFICIAL PROPERTY ADDRESS GOM-1-1-ROW-SPACE)');
{
  const pat = /^GOM-1-1-[A-G]-(?:[1-9]|[12][0-9]|3[0-2])$/;
  const badPat = data.filter((n) => !pat.test(n.ref));
  ck(badPat.length === 0, `all ${data.length} refs match GOM-1-1-<row>-<space>${badPat.length ? ' — ' + badPat.slice(0, 5).map((n) => n.ref).join(', ') : ''}`);
  const seen = new Set(); const dup = [];
  for (const n of data) { if (seen.has(n.ref)) dup.push(n.ref); seen.add(n.ref); }
  ck(dup.length === 0, `all ${data.length} refs unique${dup.length ? ' — dupes: ' + dup.join(', ') : ''}`);
  const rendered = new Set(onFull.map((c) => c.ref));
  const missing = data.filter((n) => !rendered.has(n.ref)).map((n) => n.ref);
  ck(missing.length === 0, `every data-module ref is on the full wall${missing.length ? ' — missing ' + missing.slice(0, 5).join(', ') : ''}`);
  const inBlocks = new Set(onBlock.map((c) => c.ref));
  const missing2 = data.filter((n) => !inBlocks.has(n.ref)).map((n) => n.ref);
  ck(missing2.length === 0, `every data-module ref is in its block view${missing2.length ? ' — missing ' + missing2.slice(0, 5).join(', ') : ''}`);
  ck(cells.every((c) => c.ref === refOf(c.row, c.col)),
    'every rendered ref is self-consistent with its row/space attributes');
}

// ── 5. Prices ─────────────────────────────────────────────────────────────────
console.log('\nPrices');
const dataPrices = data.filter(sellable).map((n) => n.p).sort((a, b) => a - b);
const AVAIL_TOTAL = dataPrices.reduce((a, b) => a + b, 0);
ck(dataPrices.length === SHEET_AVAIL, `${SHEET_AVAIL} niches carry a printed price (${dataPrices.length})`);
for (const [name, list] of [['full wall', onFull], ['block views', onBlock]]) {
  const got = list.filter((c) => c.st === 'available' && c.price).map((c) => +c.price).sort((a, b) => a - b);
  ck(got.length === dataPrices.length && got.every((v, i) => v === dataPrices[i]),
    `${name.padEnd(11)} price multiset identical to the data module (${got.length} priced niches)`);
}
{
  const got = {};
  for (const p of dataPrices) got[p] = (got[p] || 0) + 1;
  const keys = [...new Set([...Object.keys(got), ...Object.keys(SHEET_PRICE_MULTISET)])].sort((a, b) => a - b);
  for (const k of keys) {
    ck(got[k] === SHEET_PRICE_MULTISET[k],
      `${money(+k)} × ${SHEET_PRICE_MULTISET[k]} on the sheet, × ${got[k] || 0} in the data`);
  }
}
for (const b of ['L', 'C', 'R']) {
  const n = data.filter((x) => x.block === b && sellable(x)).length;
  ck(n === SHEET_AVAIL_BY_BLOCK[b], `${BLOCKS[b].label.padEnd(15)} anchor ${SHEET_AVAIL_BY_BLOCK[b]} available, data ${n}`);
}
ck(AVAIL_TOTAL === SHEET_AVAIL_TOTAL,
  `available inventory at list = ${money(SHEET_AVAIL_TOTAL)} (got ${money(AVAIL_TOTAL)})`);
{
  // The chips actually printed, read back out of the HTML: once on the full wall, once
  // in the block views.
  const chips = [...src.matchAll(/<span class="nprice [^"]*">\$([\d,]+)<\/span>/g)]
    .map((m) => +m[1].replace(/,/g, '')).sort((a, b) => a - b);
  const wanted = dataPrices.concat(dataPrices).sort((a, b) => a - b);
  ck(chips.length === wanted.length && chips.every((v, i) => v === wanted[i]),
    `rendered price chips = ${chips.length} (${SHEET_AVAIL} per rendering × 2 renderings), all matching`);
}

// ── 5b. THE MIS EXPORT OF 2026-08-01, space by space ─────────────────────────
// The anchors above are aggregate; these are per-space. An aggregate can be right while
// every space is wrong, and on a wall a family reads by position that is the failure that
// matters. LIST_OFFERED is typed from the operator's list, not read from the module.
console.log('\nThe operator MIS availability export (2026-08-01), space by space');
{
  const want = new Map();
  for (const [row, spaces] of Object.entries(LIST_OFFERED)) {
    for (const c of spaces) want.set(`${row}-${c}`, LIST_PRICE_BY_ROW[row]);
  }
  ck(want.size === SHEET_AVAIL, `the typed list offers ${SHEET_AVAIL} spaces (${want.size})`);

  const got = new Map(Object.entries(PRICES));
  const missing = [...want.keys()].filter((k) => !got.has(k));
  const extra = [...got.keys()].filter((k) => !want.has(k));
  ck(missing.length === 0, `every listed space is in the data module${missing.length ? ' — missing ' + missing.join(', ') : ''}`);
  ck(extra.length === 0, `the data module offers nothing the list does not${extra.length ? ' — extra ' + extra.join(', ') : ''}`);
  const wrong = [...want.entries()].filter(([k, p]) => got.has(k) && got.get(k) !== p);
  ck(wrong.length === 0,
    `every listed space carries the list's price${wrong.length ? ' — ' + wrong.map(([k, p]) => `${k}: list ${money(p)}, module ${money(got.get(k))}`).join('; ') : ' (prices unchanged from the sheet)'}`);
  for (const [row, spaces] of Object.entries(LIST_OFFERED)) {
    const n = data.filter((x) => x.row === row && sellable(x)).length;
    ck(n === spaces.length, `level ${row}   list ${String(spaces.length).padStart(2)} offered   data ${n}   all at ${money(LIST_PRICE_BY_ROW[row])}`);
  }
  const otherRows = ROWS.filter((r) => !(r in LIST_OFFERED));
  const leaked = data.filter((n) => otherRows.includes(n.row) && sellable(n));
  ck(leaked.length === 0,
    `levels ${otherRows.join(', ')} are absent from the export and offer nothing${leaked.length ? ' — ' + leaked.map((n) => n.ref).join(', ') : ' (A, B, E and F are sold out or unlisted)'}`);

  // --- $0 is not a price -----------------------------------------------------
  ck(JSON.stringify([...LISTED_NO_PRICE].sort()) === JSON.stringify([...LIST_ZERO_PRICED].sort()),
    `the module records exactly the ${LIST_ZERO_PRICED.length} spaces MIS lists at $0 (${LISTED_NO_PRICE.join(', ')})`);
  for (const id of LIST_ZERO_PRICED) {
    const n = data.find((x) => x.id === id);
    ck(!!n && !sellable(n) && n.p === null,
      `${refOf(id.split('-')[0], +id.split('-')[1])} is listed available at $0 and is therefore NOT offered here`);
    ck(!(id in PRICES), `${id} is absent from PRICES — a $0 row can never become a chip`);
  }
  const zeroPriced = data.filter((n) => n.p === 0);
  ck(zeroPriced.length === 0, `no niche carries a price of exactly 0${zeroPriced.length ? ' — ' + zeroPriced.map((n) => n.ref).join(', ') : ''}`);
  ck(!/\$0\b/.test(src), 'the string "$0" appears nowhere on the page');

  // --- what sold ------------------------------------------------------------
  ck(SOLD_SINCE_SHEET.length === SOLD_SINCE_SHEET_COUNT,
    `${SOLD_SINCE_SHEET_COUNT} of the sheet's ${SHEET_PRICED_COUNT} priced niches are gone from the export (${SOLD_SINCE_SHEET.length})`);
  ck(SHEET_PRICED_COUNT - SOLD_SINCE_SHEET_COUNT === SHEET_AVAIL,
    `${SHEET_PRICED_COUNT} − ${SOLD_SINCE_SHEET_COUNT} = ${SHEET_AVAIL} still offered`);
  const stillListed = SOLD_SINCE_SHEET.filter((k) => k in PRICES || LISTED_NO_PRICE.includes(k));
  ck(stillListed.length === 0, `no sold niche is still offered${stillListed.length ? ' — ' + stillListed.join(', ') : ''}`);
  const soldDupes = SOLD_SINCE_SHEET.filter((k, i) => SOLD_SINCE_SHEET.indexOf(k) !== i);
  ck(soldDupes.length === 0, `the sold list has no duplicates${soldDupes.length ? ' — ' + soldDupes.join(', ') : ''}`);
  ck(SHEET_AVAIL_TOTAL + SOLD_AT_LIST === 241815,
    `${money(SOLD_AT_LIST)} sold + ${money(SHEET_AVAIL_TOTAL)} remaining = the sheet's ${money(241815)}`);
  for (const r of ['B', 'F']) {
    const left = data.filter((n) => n.row === r && sellable(n)).length;
    ck(left === 0, `level ${r} is sold out — the export does not list it and the wall offers nothing there`);
  }

  // --- the summary line the operator must reconcile --------------------------
  ck(JSON.stringify(AVAILABILITY.summaryCounts) === JSON.stringify(LIST_SUMMARY),
    `the module records the export's summary counts verbatim (${Object.entries(LIST_SUMMARY).map(([k, v]) => k + ':' + v).join(' ')})`);
  {
    const { row, summary, detail } = LIST_SUMMARY_UNRECONCILED;
    const shipped = LIST_OFFERED[row].length;
    ck(shipped === detail && detail !== summary,
      `level ${row}: summary says ${summary}, detail lists ${detail} — the DETAIL ships (${shipped}), the gap is UNRECONCILED`);
    // Both counts and the level must be NAMED. "Something doesn't add up in row C" is not
    // a reconcilable statement; "summary 12, detail 11" is what he takes to MIS.
    const d = AVAILABILITY.discrepancy;
    ck(new RegExp(`Level ${row}\\b`).test(d) && d.includes(String(summary)) && d.includes(String(detail)),
      `the data module names the level and BOTH counts (${row}: ${summary} vs ${detail}) for whoever reads it next`);
    ck(src.includes(AVAILABILITY.discrepancy),
      'and the page carries the same sentence, so a counselor sees it before quoting row C');
    for (const [r, n] of Object.entries(LIST_SUMMARY)) {
      if (r === row) continue;
      const off = (LIST_OFFERED[r] || []).length;
      const zero = LIST_ZERO_PRICED.filter((k) => k[0] === r).length;
      ck(off + zero === n, `level ${r}: summary ${n} = ${off} offered + ${zero} listed at $0`);
    }
  }

  // --- provenance on the page ------------------------------------------------
  // Scoped to the availability block, not to the whole page: every niche button carries a
  // data-ref, so `src.includes('GOM-1-1-B-10')` is true whatever the prose says. A check
  // that cannot fail is not a check.
  const AV_H3 = '<h3>Availability &mdash; where this reading comes from</h3>';
  const avStart = src.indexOf(AV_H3);
  const avBlock = avStart < 0 ? '' : src.slice(avStart, src.indexOf('</div>', avStart));
  ck(avBlock !== '', 'the page carries an availability-provenance block');
  ck(avBlock.includes(AVAILABILITY.asOf), `it dates the availability reading (${AVAILABILITY.asOf})`);
  ck(avBlock.includes(AVAILABILITY.source), 'it names the MIS export as the source of availability');
  ck(avBlock.includes(AVAILABILITY.supersedes), "and says it supersedes the sheet's status reading");
  for (const id of LIST_ZERO_PRICED) {
    const ref = refOf(id.split('-')[0], +id.split('-')[1]);
    ck(avBlock.includes(ref), `it names ${ref} as listed-without-a-price, so it is findable when a figure arrives`);
  }
  ck(/no price attached/i.test(avBlock) && /price greater than zero/i.test(avBlock),
    'it states the rule: a niche is for sale when a price greater than zero is attached');
}

// ── 6. THE SAFETY GATE: no price anywhere on an unavailable niche ─────────────
console.log('\nNo price is rendered for a niche the sheet does not price');
{
  const unsell = new Set(data.filter((n) => !sellable(n)).map((n) => n.ref));
  ck(unsell.size === SHEET_TOTAL - SHEET_AVAIL, `${unsell.size} niches are not quotable here (${SHEET_TOTAL} − ${SHEET_AVAIL})`);
  const offenders = [];
  for (const c of cells) {
    if (!unsell.has(c.ref)) continue;
    if (/\$\s*[\d,]+/.test(c.html)) offenders.push(`${c.rend} ${c.ref} renders a dollar figure`);
    if (c.price !== '') offenders.push(`${c.rend} ${c.ref} carries data-price="${c.price}"`);
  }
  ck(offenders.length === 0, `zero dollar figures across all ${unsell.size * 2} unavailable renderings${offenders.length ? ' — ' + offenders.slice(0, 6).join('; ') : ''}`);
  const ariaBad = [...src.matchAll(/aria-label="(GOM-1-1-[^"]*)"/g)]
    .map((m) => m[1])
    .filter((l) => unsell.has(l.split(',')[0]) && /\$/.test(l));
  ck(ariaBad.length === 0, `zero dollar figures in the aria-labels of unavailable niches${ariaBad.length ? ' — ' + ariaBad.slice(0, 3).join('; ') : ''}`);
  const notMarked = cells.filter((c) => unsell.has(c.ref) && !/class="n st-unavailable"/.test(c.html));
  ck(notMarked.length === 0, 'every unavailable niche carries the hatched st-unavailable class in both renderings');
  // Status is coded by PATTERN and BRIGHTNESS, never by hue — every hue belongs to a tier.
  const rule = (sel) => { const i = src.indexOf(sel); return i < 0 ? '' : src.slice(i, src.indexOf('}', i) + 1); };
  const st = rule('\r\n  .st-unavailable{color');
  ck(/repeating-linear-gradient\(135deg/.test(st), 'unavailable cells carry the frosted diagonal hatch (pattern, not hue)');
  ck(/#3a3c40[\s\S]{0,120}#202225/.test(st), 'unavailable cells are the dimmed granite #3a3c40→#202225');
  ck(/border:1px dashed/.test(rule('\r\n  .st-unavailable::before')), 'unavailable cells also carry the dashed outline');
}

// ── 7. The sheet's own rules reach the page ───────────────────────────────────
console.log("\nThe price sheet's rules, carried onto the page");
{
  const has = (s) => src.includes(s.replace(/&/g, '&amp;'));
  ck(has(SHEET_TEXT.photos), `"${SHEET_TEXT.photos}" appears verbatim`);
  ck(has(SHEET_TEXT.companion), `"${SHEET_TEXT.companion}" appears verbatim`);
  ck(has(SHEET_TEXT.urn), 'the Interlude-urn sentence appears verbatim');
  ck(has(SHEET_TEXT.ecf), 'the E.C.F. sentence appears verbatim');
  ck(has(SHEET_TEXT.effective), `the effective date appears verbatim ("${SHEET_TEXT.effective}")`);
  ck(has(SHEET_TEXT.address), 'the OFFICIAL PROPERTY ADDRESS line appears in the header');
  // The companion capacity and the urn requirement are ONE fact (operator, 2026-07-29):
  // it must be stated that way on the page AND inside every card.
  ck(has(COMPANION_NOTE), 'the one-fact companion/Interlude explanation is on the page');
  ck(src.slice(src.lastIndexOf('<script>')).includes(JSON.stringify(COMPANION_NOTE)),
    'and the same sentence is carried into every available card');
  ck(/two fit per niche/.test(src), 'the page says two Interlude urns fit per niche');
  ck(new RegExp(`Open &amp; Closing — \\$${FEES.OC} ea`).test(src), `Open & Closing $${FEES.OC} ea is in the fee footer`);
  ck(new RegExp(`Recording Fee — \\$${FEES.REC} ea`).test(src), `Recording Fee $${FEES.REC} ea is in the fee footer`);
  ck(new RegExp(`Inscription — \\$${FEES.INSCR} ea`).test(src), `Inscription $${FEES.INSCR} ea is in the fee footer`);
}

// ── 7b. THE RULED FEE SCHEDULE, and its provenance ───────────────────────────
// The three dollar amounts are NOT this sheet's. A page that prints them without saying
// so is the specific way a family gets misled here, so provenance is a gate item.
console.log('\nThe ruled fee schedule (MVC June-2026), and where the page says it came from');
{
  for (const k of Object.keys(RULED)) {
    ck(FEES[k] === RULED[k],
      `FEES.${k.padEnd(9)} = ${RULED[k]} as ruled 2026-07-31 (module says ${FEES[k]})`);
  }
  ck(!('INSCRIPTION' in FEES), 'the superseded FEES.INSCRIPTION key is gone (renamed INSCR, as ROAC/TGMP spell it)');
  // The sheet's own superseded amounts may appear in exactly ONE place: the provenance
  // sentence that names what the ruling replaced. Anywhere else they would read as a
  // live charge. Strip that sentence and nothing may be left.
  {
    const replaces = FEE_SOURCE.replaces.replace(/&/g, '&amp;');
    const rest = src.split(replaces).join('');
    for (const [k, v] of Object.entries(SHEET_PRINTS)) {
      ck(replaces.includes(`$${v}`), `the provenance sentence names the superseded $${v} (${k})`);
      const hit = new RegExp(`\\$${v}(?:\\.00)?\\b`).test(rest);
      ck(!hit, `and $${v} appears NOWHERE else on the page — it is not a live charge`);
    }
  }
  ck(src.includes(FEE_SOURCE.schedule), `provenance names the schedule ("${FEE_SOURCE.schedule}")`);
  ck(src.includes(FEE_SOURCE.confirmedOn), `provenance names the confirmation date (${FEE_SOURCE.confirmedOn})`);
  ck(src.includes(FEE_SOURCE.replaces.replace(/&/g, '&amp;')), 'provenance names the three sheet amounts it replaces');
  ck(FEE_SOURCE.printedOnThisSheet === false && /not printed on this area/i.test(src),
    'the page says in as many words that these fees are NOT printed on this area\'s sheet');
  ck(/Confirm the current charges in MIS/i.test(src), 'and tells the counselor to confirm them in MIS');
  ck(new RegExp(`E\\.C\\.F\\. rate is the one fee figure still taken from this sheet`).test(src),
    'the page distinguishes the E.C.F. (still the sheet\'s) from the three replaced amounts');
}

// ── 8. Inscription ×2, the urn add-on, and the card arithmetic ───────────────
console.log('\nInscription quantity (×2), the Interlude Urn add-on, and the card math');
{
  const js = src.slice(src.lastIndexOf('<script>'));
  ck(new RegExp(`INSCR = ${FEES.INSCR}`).test(js), `the page carries INSCR = ${FEES.INSCR}`);
  ck(new RegExp(`TAX = ${FEES.TAX}`).test(js), `the page carries TAX = ${FEES.TAX}`);
  ck(new RegExp(`URN_PRICE = ${URN.price}`).test(js), `the page carries URN_PRICE = ${URN.price}`);

  // --- Inscription is a QUANTITY now, 0..2, defaulting to 0 -------------------
  ck(INSCR_MAX === RULED_INSCR_MAX, `the module's INSCR_MAX is ${RULED_INSCR_MAX} ("you can add two inscriptions on the front")`);
  const ins = /<input type="number" id="insc-qty"([^>]*)>/.exec(src);
  ck(!!ins, 'Inscription renders a number input #insc-qty (no longer a checkbox)');
  ck(!/id="insc-on"/.test(src), 'the old #insc-on checkbox is gone from the page');
  ck(!/addOn\(/.test(js), 'the old addOn() boolean helper is gone from the runtime');
  ck(!!ins && /min="0"/.test(ins[1]), 'inscription quantity floors at 0');
  ck(!!ins && new RegExp(`max="${RULED_INSCR_MAX}"`).test(ins[1]), `inscription quantity is capped at ${RULED_INSCR_MAX}`);
  ck(!!ins && /value="0"/.test(ins[1]), 'inscription defaults to 0 — nothing is added unless the counselor asks');
  ck(/var inscrSub = INSCR \* ins;/.test(js), 'the card multiplies the inscription charge by the quantity');
  ck(/var tax = Math\.round\(inscrSub \* TAX \* 100\) \/ 100;/.test(js),
    'sales tax is computed on the inscription subtotal alone, to the cent');
  ck(/tot \+= inscrSub \+ tax;/.test(js), 'inscription and its tax both reach the card total');

  // --- The Interlude Urn is MERCHANDISE, not a fee ---------------------------
  ck(URN.price === RULED_URN_PRICE, `the module prices the Interlude Urn at $${RULED_URN_PRICE} (operator-supplied 2026-07-31)`);
  ck(URN.maxQty === RULED_URN_MAX, `up to ${RULED_URN_MAX} Interlude urns per niche — the companion capacity itself`);
  const urn = /<input type="number" id="urn-qty"([^>]*)>/.exec(src);
  ck(!!urn, 'the Interlude Urn renders a number input #urn-qty');
  ck(!!urn && new RegExp(`max="${RULED_URN_MAX}"`).test(urn[1]), `urn quantity is capped at the ${RULED_URN_MAX} rights the niche carries`);
  ck(!!urn && /value="0"/.test(urn[1]), 'urn quantity defaults to 0');
  ck(new RegExp(`\\$${URN.price} ea`).test(src), `the footer prints the Interlude Urn at $${URN.price} ea`);
  ck(/merchandise, not a fee/.test(src), 'the page says in as many words that the urn is merchandise, not a fee');
  ck(/\(merchandise\)/.test(js), 'the card line itself is labelled merchandise');
  // --- ...and it is TAXED at 10.4%, like the inscription (ruling 2026-07-31) ---
  // These four assertions are the INVERSION of Track D's, which asserted no urn tax
  // existed anywhere in the runtime. The ruling reversed that; an untaxed urn line is now
  // the bug, and removing the tax must take this gate red.
  ck(/var urnSub = URN_PRICE \* urn;/.test(js), 'the card computes an urn subtotal at list × quantity');
  ck(/var urnTax = Math\.round\(urnSub \* TAX \* 100\) \/ 100;/.test(js),
    'sales tax is computed on the urn subtotal, to the cent, at the same TAX rate as the inscription');
  ck(/Sales tax on urn \(10\.4%\)/.test(js), 'the urn tax is its own visible card row, not folded into another line');
  ck(/tot \+= urnSub \+ urnTax;/.test(js), 'the urn AND its tax both reach the card total');
  ck(!/confirmed at contract/.test(src),
    'the superseded "sales tax on the urn is confirmed at contract" caveat is gone from the page');
  ck(/carry 10\.4% sales tax/.test(js), 'and the card note says both merchandise lines carry the tax');
  ck(new RegExp(`\\$${URN.price} ea \\+ 10\\.4% tax`).test(src), 'the fee footer prices the urn at list plus tax');

  // --- Order of operations: E.C.F. never touches an add-on -------------------
  ck(/var price = \+d\.price, e = ecf\(price\), tot = price \+ e,/.test(js),
    'E.C.F. is computed once, from the niche price alone');
  ck(!/ecf\((?!price\))/.test(js), 'ecf() is never called on anything but the niche price');
  const ecfAt = js.indexOf('e = ecf(price)');
  for (const [what, needle] of [['inscription', 'tot += inscrSub + tax;'], ['urn', 'tot += urnSub + urnTax;']]) {
    const at = js.indexOf(needle);
    ck(ecfAt > -1 && at > ecfAt, `the ${what} is added AFTER the E.C.F. line, never into its base`);
  }
  ck(/'oc-qty', 'rec-qty', 'insc-qty', 'urn-qty'/.test(js),
    'all four quantity boxes re-render the pinned card (and therefore its print block)');
  ck(/closest\('#card, \.tab, \.fees'\)/.test(js), 'clicking the fee footer does not unpin the card the boxes are updating');
  // A pinned niche in a hidden view has a ZERO rect, and a card placed against zero
  // lands on the tab bar and eats the tab clicks. Found by driving the page, 2026-07-31.
  ck(/function visibleTwin\(el\)/.test(js), 'the card places itself against a rendering that is actually laid out');
  ck(/var t = visibleTwin\(el\);/.test(js) && /if \(!t\) \{ card\.style\.left/.test(js),
    'and parks in its default corner when no rendering of the pinned niche is visible');
  ck(!/var r = el\.getBoundingClientRect\(\);\s*\r?\n\s*card\.style\.right = 'auto'/.test(js),
    'placeCard no longer measures the pinned element directly (the zero-rect path)');
  // The tap suppressor must not eat clicks on the chrome — it did, and the tabs died.
  ck(/closest\('\.gwrap'\) && performance\.now\(\) < suppressUntil/.test(js),
    'the tap suppressor is scoped to the grid, so tabs and fee controls still receive clicks');
}

// ── 8b. The card arithmetic, computed end to end ─────────────────────────────
console.log('\nCard arithmetic vs hand-typed totals');
{
  for (const a of CARD_ANCHORS) {
    const n = data.find((x) => x.ref === a.ref);
    ck(!!n && n.p === a.price, `${a.ref} carries $${a.price.toLocaleString('en-US')} in the data module`);
    const got = estTotal(a.price, a.q);
    const q = Object.entries(a.q).map(([k, v]) => `${k}×${v}`).join(' ');
    ck(got === a.total, `${a.ref}  ${q.padEnd(28)} anchor ${money(a.total)}, estTotal ${money(got)}`);
  }
  // The urn tax, isolated. The same card with the urn quantity at 0 is
  //   5995 + 600 + 875 + 235 + 1320 + 137.28 = 9162.28 → 9162
  // so the ruling's whole effect on this card is one subtraction. Note the two totals are
  // each rounded on their own — the un-urned card ends .28 and the full one .60 — so the
  // difference of the ROUNDED totals is $1,469 while the exact merchandise charge is
  // $1,330 + $138.32 = $1,468.32. Both numbers are typed here on purpose.
  {
    const a = CARD_ANCHORS[0];
    const NO_URN_TOTAL = 9162;         // same card, urn quantity 0
    const ROUNDED_DELTA = 1469;        // 10631 − 9162, each total rounded separately
    const noUrn = estTotal(a.price, { ...a.q, urn: 0 });
    ck(noUrn === NO_URN_TOTAL, `${a.ref} with the urns removed is still ${money(NO_URN_TOTAL)} (got ${money(noUrn)})`);
    // COMPUTED minus computed, not typed minus computed: an untaxed urn must move this.
    ck(estTotal(a.price, a.q) - noUrn === ROUNDED_DELTA,
      `adding the 2 urns moves the card by ${money(ROUNDED_DELTA)} — ${money(URN.price * a.q.urn)} merchandise + ${money(C7_URN_TAX)} tax, each total rounded on its own`);
    ck(Math.round(URN.price * a.q.urn * FEES.TAX * 100) / 100 === C7_URN_TAX,
      `the urn tax on that card is ${money(C7_URN_TAX)} — ${a.q.urn} × $${URN.price} at ${FEES.TAX * 100}%`);
    ck(estTotal(a.price, { urn: 1 }) === Math.round(a.price + ecf(a.price) + URN.price + Math.round(URN.price * FEES.TAX * 100) / 100),
      'a niche with one urn and nothing else is price + E.C.F. + urn + urn tax');
    // And the ruling really did change something: an untaxed urn cannot reach the anchor.
    ck(Math.round(a.price + ecf(a.price) + FEES.OC + FEES.REC + FEES.INSCR * 2
      + Math.round(FEES.INSCR * 2 * FEES.TAX * 100) / 100 + URN.price * 2) !== a.total,
      'the untaxed-urn arithmetic Track D shipped no longer reaches the anchor');
  }
  // E.C.F. rounds UP to the dollar, as every other niche page does.
  ck(ecf(5995) === 600 && ecf(8995) === 900, 'E.C.F. rounds UP to the dollar (5995→600, 8995→900)');
  // A niche with no add-ons is price + E.C.F. and nothing else.
  ck(estTotal(4995) === 4995 + 500, 'with every quantity at 0 the total is the price plus E.C.F. alone');
}

// ── 9. Print path ─────────────────────────────────────────────────────────────
console.log('\nPrint path');
{
  const views = (src.match(/id="wall-(?:full|L|C|R)"/g) || []).length;
  ck(views === 4, `all four views exist as static HTML (${views})`);
  ck(/\.wview\{display:none;\}/.test(src), 'views are hidden on screen and revealed by the tab / print rules');
  ck(/\.wview\.wfull\{display:block!important/.test(src), 'print stylesheet shows the full wall without JS');
  ck(/body\.pv-one \.wview\.active\{display:block!important/.test(src), 'print scope follows the active block tab');
  ck(/body\.pv-sel \.wview\.printsel\{display:block!important/.test(src), 'print scope follows a highlighted niche');
  ck(src.indexOf('body.pv-sel .wview.printsel') > src.indexOf('body.pv-one .wview.active'),
    'the selection rule sits AFTER the tab rule, so a highlight wins');
  ck(/\.n\.sel\{outline:4px solid #c8540a/.test(src), 'a selected niche prints with the highlight ring');
  ck(/@page\{size:landscape/.test(src), 'the sheet prints landscape — the wall is 32 spaces wide');
  const scripts = (src.match(/<script/g) || []).length;
  ck(scripts === 1, `page has ${scripts} <script> block(s); none is needed to render the grids`);
}

// ── 10. House rules ───────────────────────────────────────────────────────────
console.log('\nHouse rules');
ck(/class="back-btn no-print" href="\.\.\/"/.test(src), '"← Quote Tool" back button in the header');
{
  const dims = [...src.matchAll(/\d+\s*(?:"|&quot;|″)\s*(?:x|×)\s*\d+/gi)].map((m) => m[0]);
  ck(dims.length === 0, `no niche dimensions rendered${dims.length ? ' — ' + dims.slice(0, 3).join(', ') : ''}`);
}
{
  const rounded = [...src.matchAll(/\$\d+(?:\.\d+)?K/g)].map((m) => m[0]);
  ck(rounded.length === 0, `no rounded price labels${rounded.length ? ' — ' + rounded.join(', ') : ''}`);
}
// NO PHOTOGRAPH SHIPS: the plates in every operator photo are legible names, and the
// sheet's own rule for this garden is NO PHOTOS ALLOWED.
{
  const imgs = [...src.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  ck(imgs.length === 0, `no <img> on the page${imgs.length ? ' — ' + imgs.slice(0, 2).join(' ') : ' (no photograph ships)'}`);
  ck(!/\.jpe?g|\.png/i.test(src), 'no photograph is referenced anywhere in the page source');
}

// ── 10b. Price-chip SIZE (operator: "very hard to read", 07.31.26) ───────────
// Anchored so a later tidy-up cannot quietly shrink the one number a counselor reads
// across the room. The cell widths are anchored with them because the chip only fits if
// the track was widened for it.
console.log('\nPrice-chip size (operator complaint 2026-07-31)');
{
  const px = (re) => { const m = re.exec(src); return m ? parseFloat(m[1]) : NaN; };
  const full = px(/\.nprice\{font-weight:600;font-size:([\d.]+)px/);
  const block = px(/\.fg-L \.nprice,\.fg-R \.nprice,\.fg-C \.nprice\{font-size:([\d.]+)px/);
  const print = px(/\.nprice\{font-size:([\d.]+)px;padding:0 1px;box-shadow:none;\}/);
  ck(full >= 12, `full-wall chip is ${full}px — at least 12px (was 9.5px)`);
  ck(block >= 14, `block-view chip is ${block}px — at least 14px (was 11px)`);
  ck(print >= 7.5, `printed chip is ${print}px — at least 7.5px (was 6.5px)`);
  const cw = px(/--lw:20px;--lh:20px;--cw:(\d+)px/);
  ck(cw >= 50, `the full-wall column is ${cw}px, widened from 44px so the bigger chip cannot clip`);
  const pcw = px(/\.fgrid\{--lw:16px;--lh:15px;--cw:(\d+)px/);
  // 32 spaces + 33 gaps + two 16px row-letter gutters must stay inside a landscape
  // Letter page: 11in − 0.8in margin = 10.2in ≈ 979px at 96dpi.
  const paperWidth = 32 * pcw + 33 * 2 + 2 * 16;
  ck(paperWidth <= 979, `the printed wall is ${paperWidth}px wide — inside the 979px landscape Letter track`);
}

// ── 11. Price-chip contrast (WCAG AA, 4.5:1) ──────────────────────────────────
console.log('\nPrice-chip contrast (WCAG AA, 4.5:1)');
{
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const lum = (hex) => {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    const [r, g, b] = [0, 2, 4].map((i) => lin(parseInt(h.slice(i, i + 2), 16) / 255));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  let worst = 99, worstT = '';
  for (const t of TIERS) {
    const r = ratio(t.bg, t.fg);
    if (r < worst) { worst = r; worstT = t.l; }
    ck(r >= 4.5, `${t.l.padEnd(8)} ${t.fg} on ${t.bg} = ${r.toFixed(2)}:1`);
  }
  pass(`worst tier chip contrast ${worst.toFixed(2)}:1 (${worstT}) — all ${TIERS.length} clear AA`);
}

// ── 12. Sabotage ──────────────────────────────────────────────────────────────
// Every check above is a claim that something WOULD be caught. This proves it: each
// mutation is written to the real file, the page is rebuilt from it, and this gate is
// re-run as a child process. Anything that does not come back exit 1 is a check with no
// teeth. The file is restored and rebuilt after every run, including on a throw.
//
// Re-pointed 2026-08-01: the old runs perturbed sheet-derived cells (B-6, F-13, the
// $4,995 band) that no longer exist. They now perturb the MIS export's own spaces, and
// the set gained the run this update exists for — a $0-listed space rendered with money.
if (process.argv.includes('--sabotage')) {
  console.log('\nSabotage of the data module (each mutation must make this gate exit 1)');
  const orig = fs.readFileSync(DATA, 'utf8');
  const runs = [
    // THE run for this update. MIS lists B-10 and D-18 available at $0; the operator's
    // rule is that a price greater than zero is what makes a position sellable. A figure
    // invented for either of them is the specific harm this track guards against.
    ['a $0-LISTED space given a price: D-18 quoted at $6,995',
      (s) => s.replace("  'D-26': 6995,", "  'D-18': 6995,\r\n  'D-26': 6995,")],
    ['a $0-listed space given a price of exactly 0 (available at nothing)',
      (s) => s.replace("  'D-26': 6995,", "  'D-18': 0,\r\n  'D-26': 6995,")],
    ['the $0 record erased, so the two spaces become invisible instead of pending',
      (s) => s.replace("export const LISTED_NO_PRICE = ['B-10', 'D-18'];", 'export const LISTED_NO_PRICE = [];')],
    ['a SOLD niche resurrected: B-6 back on the wall at the old $4,995',
      (s) => s.replace("  'C-7': 5995,", "  'C-7': 5995, 'B-6': 4995,")],
    ['a listed space dropped: C-22 quietly gone from the export',
      (s) => s.replace("'C-20': 5995, 'C-22': 5995, 'C-24': 5995,", "'C-20': 5995, 'C-24': 5995,")],
    ['a price MOVED between listed spaces: C-9 charged the level-D price',
      (s) => s.replace("'C-9': 5995,", "'C-9': 6995,")],
    ['a price ROUNDED: the level-G niches at $9,000',
      (s) => s.replace("'G-13': 8995, 'G-14': 8995, 'G-15': 8995,", "'G-13': 9000, 'G-14': 9000, 'G-15': 9000,")],
    ['a space invented in a level the export does not list at all: E-12',
      (s) => s.replace("  'C-7': 5995,", "  'C-7': 5995, 'E-12': 5995,")],
    ['the sold list shortened, so the arithmetic no longer reconciles',
      (s) => s.replace("  'D-9',\r\n", '')],
    ["the level-C discrepancy 'reconciled' by editing the summary instead of MIS",
      (s) => s.replace('summaryCounts: { B: 1, C: 12, D: 5, G: 3 }', 'summaryCounts: { B: 1, C: 11, D: 5, G: 3 }')],
    ['the discrepancy sentence softened away, so nobody is told to reconcile it',
      (s) => s.replace(
        "    'The export summary says Level C has 12 available; its detail lists 11 C spaces. ' +",
        "    'Every level reconciles. ' +")],
    ['a colour tier restored for a price no niche carries any more ($4,995)',
      (s) => s.replace("  { p: 5995, l: '$5,995', c: 't1'", "  { p: 4995, l: '$4,995', c: 't0', bg: '#1a6fae', fg: '#fff' },\r\n  { p: 5995, l: '$5,995', c: 't1'")],
    ['the wall shape narrowed: level G one space short',
      (s) => s.replace('  G: [[9, 24]],', '  G: [[9, 23]],')],
    ['the O&C fee reverted to the superseded sheet figure: $875 -> $835',
      (s) => s.replace('  OC: 875,', '  OC: 835,')],
    ['the inscription reverted to the superseded sheet figure: $660 -> $605',
      (s) => s.replace('  INSCR: 660,', '  INSCR: 605,')],
    ['sales tax zeroed on the merchandise lines',
      (s) => s.replace('  TAX: 0.104,', '  TAX: 0,')],
    ['the Interlude Urn repriced away from the urn price list',
      (s) => s.replace('  price: 665,', '  price: 595,')],
    ['the E.C.F. rate cut to 5% — the one fee figure still taken from this sheet',
      (s) => s.replace('  ECF_RATE: 0.1,', '  ECF_RATE: 0.05,')],
  ];
  const child = (args) => execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  const self = fileURLToPath(import.meta.url);
  let sabFail = 0;
  const runSet = (file, origSrc, list) => {
    try {
      for (const [label, mut] of list) {
        const mutated = mut(origSrc);
        if (mutated === origSrc) { console.log('  FAIL  sabotage did not apply: ' + label); sabFail++; continue; }
        fs.writeFileSync(file, mutated, 'utf8');
        let code = 0;
        try { child([BUILD]); child([self]); } catch (e) { code = e.status ?? 1; }
        if (code === 1) pass(`${label} -> exit ${code}`);
        else { sabFail++; console.log(`  FAIL  ${label} -> exit ${code} (expected 1)`); }
        fs.writeFileSync(file, origSrc, 'utf8');
      }
    } finally {
      // The source must be back on disk even if this phase throws.
      fs.writeFileSync(file, origSrc, 'utf8');
      child([BUILD]);
    }
  };
  runSet(DATA, orig, runs);

  // ── 12b. Sabotage of the GENERATOR ────────────────────────────────────────
  // The provenance assertions cannot be reached by perturbing the data: the page renders
  // those sentences FROM the module, so a mutated module moves the page with it and the
  // comparison still holds. The failure they exist to catch — a build that stops telling
  // the counselor where availability came from, or one that prints $0 as if it were a
  // price — lives in the generator.
  console.log('\nSabotage of the generator (the provenance assertions must have teeth)');
  const origBuild = fs.readFileSync(BUILD, 'utf8');
  runSet(BUILD, origBuild, [
    ['the availability source unnamed — the page stops saying where this reading came from',
      (s) => s.replace('${esc(AVAILABILITY.source)}', 'the current list')],
    ['the whole availability provenance block deleted',
      (s) => s.replace('    <h3>Availability &mdash; where this reading comes from</h3>', '    <h3>Availability</h3>')],
    ['the unreconciled level-C note dropped from the page',
      (s) => s.replace('${esc(AVAILABILITY.discrepancy)}', 'See MIS.')],
    ['the $0-listed spaces printed with their $0 figure, as if it were a price',
      (s) => s.replace('with no price attached', 'at $0')],
    ['the $0-listed spaces no longer named, so nobody can find them again',
      (s) => s.replace('<b>${esc(NO_PRICE_REFS)}</b>', '<b>Two spaces</b>')],
    ['an unavailable niche leaking a data-price attribute the card could read',
      (s) => s.replace('data-price="${sellable(n) ? n.p : \'\'}"', 'data-price="${n.p}"')],
    ['an unavailable niche given the aria-label of an available one (price read aloud)',
      (s) => s.replace('  if (!sellable(n)) return `${n.ref}, ${BLOCKS[n.block].label}, row ${n.row}, space ${n.col}, ${STATUS_LABEL[n.st]}`;',
        '  if (false) return `${n.ref}, ${BLOCKS[n.block].label}, row ${n.row}, space ${n.col}, ${STATUS_LABEL[n.st]}`;')],
  ]);

  let restored = 0;
  try { child([self]); } catch (e) { restored = e.status ?? 1; }
  (restored === 0 ? pass : fail)(`sources restored, gate green again -> exit ${restored}`);
  failures += sabFail;
}

console.log(failures ? `\nRESULT: ${failures} FAILURE(S)` : '\nRESULT: PASS — 0 mismatches');
process.exit(failures ? 1 : 0);
