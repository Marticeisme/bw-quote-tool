/**
 * Gate for the Terrace Garden Memorial Path property map.
 *
 * Proves that MAPS/TGMP_Map.html is a faithful, deterministic rendering of
 * scripts/tgmp-data.mjs; that its niche bank carries EXACTLY the dataset the Mountain
 * View Columbarium page carried before the Terrace Garden moved off it; that the nine
 * additional properties match the pricing sheet line for line; and — the part that
 * matters in front of a family — that NOT ONE dollar figure is rendered for anything
 * that cannot be sold.
 *
 * FEES, INVERTED 2026-07-29. This gate used to assert that no MVC fee amount appeared
 * anywhere on the page, because the Terrace Garden sheet prints none. Martice then ruled
 * that the MVC schedule applies to the whole Terrace Garden Memorial Path, so the gate
 * now asserts the OPPOSITE for those amounts: the schedule must be present, exact, and
 * labelled with where it came from. The ECL amounts are still asserted absent — the
 * ruling named one schedule, not "any schedule". Section 8 also EXECUTES the page's own
 * emitted fee arithmetic and anchors a full card computation against it.
 *
 *   node scripts/verify_tgmp_map.mjs
 *
 * Exit 1 on any failure. Sabotage a price, a rights count, a status or a fee amount in
 * the data module and this must go red.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  TGN, TGMP_ITEMS, TIERS, FEES, FEE_SOURCE, ecf, estTotal,
  tgnNiches, tgnRef, sellable, allProperties,
} from './tgmp-data.mjs';
import { extractedTgn, MVC_REL } from './extract_tgn_from_mvc.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REL = 'MAPS/TGMP_Map.html';
const ABS = path.join(ROOT, REL);

// ── The pricing sheet, typed from the PDF ────────────────────────────────────
// NOT derived from the data module: these are the numbers a counselor reads off
// "Terrace Garden Memorial Path Pricingffff.pdf", so a transcription slip fails here.
// Rows top -> bottom, exactly as the sheet prints them.
const SHEET_ROW_PRICES = [12000, 14000, 16000, 14000, 12000];
const SHEET_COLS = 8;
const SHEET_RIGHTS_PER_NICHE = 2;
const SHEET_ITEMS = [
  ['Paradiso Pedestal Bench - Seat 36x14x4 Pedestal 30x8x14', 24000, 2],
  ['Paradiso Pedestal Bench - Seat 48x14x4 Pedestal 40x8x14', 42000, 4],
  ['Classic Gray Companion Columbarium with Alcove and Paradiso Shutters 30x17x37', 52000, 4],
  ['Paradiso Birdbath and Pedestal', 52000, 4],
  ['Paradiso Cremation Posts with Absolute Black Shutter12x9x18', 8000, 1],
  ['Paradiso Double Cremation Post with Absolute Black Shutters18x9x18', 16000, 2],
  ['Paradiso Cremation Post with Carved Rose Antique Finish 6x6x10', 8000, 1],
  ['Paradiso Cremation Post with Shaped Carved Antique Daffodils 9x9x12', 8000, 1],
  ['Paradiso Cremation Post with Shaped Carved Antique Birds 9x9x12', 8000, 1],
];
const TGN_TOTAL = 544000;     // 8 x (12+14+16+14+12) thousand
const ITEM_TOTAL = 218000;
const RIGHTS_TOTAL = 100;     // 40 x 2 + (2+4+4+4+1+2+1+1+1)

// ── The fee schedule, typed from the MVC June-2026 sheet ─────────────────────
// NOT read from the data module: these are the amounts a counselor reads off the
// Mountain View Columbarium schedule, which Martice ruled on 2026-07-29 applies to the
// whole Terrace Garden Memorial Path. Typing them here means a slip in tgmp-data.mjs
// fails, not propagates.
const SCHEDULE = { OC: 875, REC: 235, INSCR: 660, TAX: 0.104, ECF_RATE: 0.1 };
const SCHEDULE_SOURCE = 'Mountain View Columbarium, June 2026';
const SCHEDULE_RULED_ON = '2026-07-29';

// A FULL card computation, worked by hand off the schedule above and typed as a literal.
// TGN-C-4 is a row-C niche at $16,000, with one of each quantity fee turned on:
//   16,000 sales price
//  + 1,600 E.C.F. (10%, rounded up)
//  +   875 O&C x1
//  +   235 recording x1
//  +   660 inscription x1
//  + 68.64 sales tax (10.4% of the inscription only)
//  = 19,438.64 -> Est. Total $19,439 (rounded to the dollar)
const ANCHOR = { ref: 'TGN-C-4', price: 16000, q: { oc: 1, rec: 1, inscr: 1 }, total: 19439 };
// And the default state every card opens in: nothing toggled on, E.C.F. still shown.
const ANCHOR_OFF = { ref: 'TGN-C-4', q: {}, total: 17600 };
// The same schedule reaches the nine additional properties: TGMP-3 at $52,000, O&C x4.
//   52,000 + 5,200 E.C.F. + 3,500 O&C = 60,700
const ANCHOR_ITEM = { ref: 'TGMP-3', q: { oc: 4 }, total: 60700 };

// Fees belonging to OTHER areas' sheets. The 2026-07-29 ruling named the MVC schedule
// and only that one, so the East Chapel Lawn amounts must still never appear here:
// borrowing one is how a family gets quoted a charge that does not exist for them.
const FOREIGN_FEES = [
  ['835', 'ECL opening & closing'],
  ['225', 'ECL recording fee'],
  ['785', 'ECL bronze scroll'],
  ['370', 'ECL vase with ring'],
];

let failures = 0;
const fail = (m) => { failures++; console.log('  FAIL  ' + m); };
const pass = (m) => console.log('  ok    ' + m);
const ck = (ok, m) => (ok ? pass : fail)(m);
const money = (n) => '$' + n.toLocaleString('en-US');

console.log('\nTerrace Garden Memorial Path (TGN + TGMP) property-map gate\n');

// ── 0. Data module sanity (first: without it the build throws) ───────────────
console.log('Data module');
{
  const all = allProperties();
  const orphan = [...new Set(all.filter(sellable).map((n) => n.price))].filter((p) => !TIERS.some((t) => t.p === p));
  ck(orphan.length === 0, `every price has a colour tier${orphan.length ? ' — orphans: ' + orphan.join(', ') : ` (${TIERS.length} tiers)`}`);
  const ghost = TIERS.map((t) => t.p).filter((p) => !all.some((n) => sellable(n) && n.price === p));
  ck(ghost.length === 0, `no tier is defined for a price nothing carries${ghost.length ? ' — ' + ghost.join(', ') : ''}`);
  const priced = all.filter((n) => n.st !== 'available' && n.price !== null && n.price !== undefined);
  ck(priced.length === 0, `no unsellable property carries a price in the data${priced.length ? ' — ' + priced.map((n) => n.ref).join(', ') : ' (nothing is marked sold)'}`);
  const blank = all.filter((n) => n.st === 'available' && typeof n.price !== 'number');
  ck(blank.length === 0, `every available property has a price${blank.length ? ' — ' + blank.map((n) => n.ref).join(', ') : ''}`);
  const noRights = all.filter((n) => !Number.isInteger(n.rights) || n.rights < 1);
  ck(noRights.length === 0, `every property has a whole rights-of-interment count${noRights.length ? ' — ' + noRights.map((n) => n.ref).join(', ') : ''}`);
  const dup = [];
  const seen = new Set();
  for (const n of all) { if (seen.has(n.ref)) dup.push(n.ref); seen.add(n.ref); }
  ck(dup.length === 0, `all ${all.length} references unique${dup.length ? ' — dupes: ' + dup.join(', ') : ''}`);
  const badRef = all.filter((n) => !/^(TGN-[A-E]-[1-8]|TGMP-[1-9])$/.test(n.ref));
  ck(badRef.length === 0, `all refs match TGN-<row>-<n> or TGMP-<n>${badRef.length ? ' — ' + badRef.slice(0, 5).map((n) => n.ref).join(', ') : ''}`);
  // Nine objects in one line: none may occupy the same stretch of path as its neighbour.
  const xs = [...TGMP_ITEMS].sort((a, b) => a.x - b.x);
  const overlap = [];
  for (let i = 1; i < xs.length; i++) {
    if (xs[i].x - xs[i].w / 2 < xs[i - 1].x + xs[i - 1].w / 2) overlap.push(`${xs[i - 1].id}/${xs[i].id}`);
  }
  ck(overlap.length === 0, `the nine objects do not overlap on the path${overlap.length ? ' — ' + overlap.join(', ') : ''}`);
  ck(TGMP_ITEMS.every((it, i) => it.id === `TGMP-${i + 1}`) &&
     TGMP_ITEMS.every((it, i) => i === 0 || it.x > TGMP_ITEMS[i - 1].x),
  'the objects are laid out left to right in the pricing sheet\'s own order');
}
if (failures) { console.log(`\nRESULT: ${failures} FAILURE(S) — the page cannot be built from this data`); process.exit(1); }

// ── 1. Build determinism ─────────────────────────────────────────────────────
console.log('\nBuild determinism');
{
  const before = fs.readFileSync(ABS);
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'build_tgmp_map.mjs')], { cwd: ROOT, stdio: 'pipe' });
  const after = fs.readFileSync(ABS);
  ck(before.equals(after),
    `rebuilding from scripts/tgmp-data.mjs reproduces ${REL} byte for byte (${after.length} bytes)`);
}
const src = fs.readFileSync(ABS, 'utf8');
ck(/Generated by scripts\/build_tgmp_map\.mjs/.test(src), 'the page declares its generator and says not to hand-edit');

// ── 2. Parse the page back out ───────────────────────────────────────────────
function parseButtons(cls) {
  const out = [];
  const re = new RegExp(`<button[^>]*class="${cls}[^"]*"[^>]*>[\\s\\S]*?</button>`, 'g');
  for (const m of src.matchAll(re)) {
    const html = m[0];
    const tag = html.slice(0, html.indexOf('>') + 1);
    const at = (k) => { const r = new RegExp(`data-${k}="([^"]*)"`).exec(tag); return r ? r[1] : null; };
    if (at('ref') === null) continue;
    out.push({ ref: at('ref'), id: at('id'), price: at('price'), rights: at('rights'), st: at('st'), kind: at('kind'), html });
  }
  return out;
}
const from3d = parseButtons('n3 front3');
const fromFlat = parseButtons('n flatn');
const fromRows = parseButtons('irow');
const fromObjs = parseButtons('o3 obj');
const flatFull = [], flatMini = [];
{
  const seen = new Set();
  for (const c of fromFlat) { (seen.has(c.ref) ? flatMini : flatFull).push(c); seen.add(c.ref); }
}
const rowFull = [], rowMini = [];
{
  const seen = new Set();
  for (const c of fromRows) { (seen.has(c.ref) ? rowMini : rowFull).push(c); seen.add(c.ref); }
}

// ── 3. THE TGN PARITY PROOF: old MVC page vs the new module ──────────────────
// Extracted by script from the newest commit of the MVC page that still rendered the
// Terrace Garden — never retyped. ref + price + status must match, niche for niche.
console.log('\nTGN parity — the shipped MVC page vs this data module');
{
  const { sha, niches: old } = extractedTgn();
  console.log(`  base  ${sha}:${MVC_REL}`);
  const now = tgnNiches();
  const key = (c) => c.ref;
  const sig = (c) => `${c.ref}|${c.price}|${c.st}`;
  const oldMap = new Map(old.map((c) => [key(c), sig(c)]));
  ck(old.length === 40, `the old page rendered ${old.length} Terrace Garden niches (expected 40)`);
  ck(now.length === 40, `the new module carries ${now.length} Terrace Garden niches (expected 40)`);
  const bad = [];
  for (const c of now) {
    const o = oldMap.get(key(c));
    if (!o) bad.push(`extra ${key(c)}`);
    else if (o !== sig(c)) bad.push(`${key(c)}: old ${o} -> new ${sig(c)}`);
  }
  const have = new Set(now.map(key));
  for (const k of oldMap.keys()) if (!have.has(k)) bad.push(`missing ${k}`);
  ck(bad.length === 0, `all 40 niches identical on ref + price + status${bad.length ? ' — ' + bad.slice(0, 8).join('; ') : ' (0 mismatches)'}`);
  // Rights per niche came across too — the old page carried it as data-urn.
  const rightsBad = now.filter((c) => {
    const o = old.find((x) => x.ref === c.ref);
    return !o || o.rights !== c.rights;
  });
  ck(rightsBad.length === 0, `all 40 rights counts identical (${TGN.rights} per niche)${rightsBad.length ? ' — ' + rightsBad.map((c) => c.ref).join(', ') : ''}`);
  const oldTotal = old.reduce((a, c) => a + c.price, 0);
  const newTotal = now.reduce((a, c) => a + c.price, 0);
  ck(oldTotal === newTotal && newTotal === TGN_TOTAL,
    `listed value unchanged by the move: old ${money(oldTotal)} = new ${money(newTotal)}`);
  // The dimension string came across verbatim as well (the sheet prints none, so this
  // is carried data and the page must say so rather than invent a replacement).
  const oldDim = (old[0].inside || '').replace(/&quot;/g, '"');
  ck(oldDim === TGN.dim, `carried niche size unchanged: "${oldDim}"`);
  ck(/carried from|Carried|carried/.test(src) && src.includes('MVC_NewGlassFront_NicheMap_1.html'),
    'the page names where the carried niche size came from');
}

// ── 4. The niche bank vs the pricing sheet ───────────────────────────────────
console.log("\nNiche bank vs the pricing sheet's own grid");
{
  ck(TGN.cols === SHEET_COLS, `${SHEET_COLS} niches across (${TGN.cols})`);
  ck(TGN.rows.length === SHEET_ROW_PRICES.length, `${SHEET_ROW_PRICES.length} rows high (${TGN.rows.length})`);
  const got = TGN.rows.map((r) => TGN.rowPrices[r]);
  ck(got.length === SHEET_ROW_PRICES.length && got.every((v, i) => v === SHEET_ROW_PRICES[i]),
    `row prices top to bottom are ${SHEET_ROW_PRICES.map(money).join(' / ')} (got ${got.map(money).join(' / ')})`);
  ck(TGN.rights === SHEET_RIGHTS_PER_NICHE, `the sheet's "${SHEET_RIGHTS_PER_NICHE} Rights per niche" (${TGN.rights})`);
  const n = tgnNiches();
  ck(n.length === 40, `40 niches in the data module (${n.length})`);
  // Every row is complete and every niche in it carries that row's price.
  const rowBad = TGN.rows.filter((r) => {
    const row = n.filter((x) => x.row === r);
    return row.length !== SHEET_COLS || !row.every((x) => x.price === TGN.rowPrices[r]) ||
      row.map((x) => x.n).join() !== Array.from({ length: SHEET_COLS }, (_, i) => i + 1).join();
  });
  ck(rowBad.length === 0, `each row is 1..${SHEET_COLS} at a single price${rowBad.length ? ' — ' + rowBad.join(', ') : ''}`);
  for (const [name, list] of [['3D bank', from3d], ['flat grid', flatFull], ['overview', flatMini]]) {
    const mine = list.filter((c) => c.ref.startsWith('TGN-'));
    const ok = mine.length === 40 && mine.every((c) => {
      const d = n.find((x) => x.ref === c.ref);
      return d && +c.price === d.price && +c.rights === d.rights && c.st === d.st;
    });
    ck(ok, `${name.padEnd(10)} renders all 40 niches with the module's price, rights and status (${mine.length})`);
  }
}

// ── 5. The nine additional properties vs the pricing sheet ───────────────────
console.log('\nAdditional properties vs the pricing sheet, line by line');
{
  ck(TGMP_ITEMS.length === SHEET_ITEMS.length, `${SHEET_ITEMS.length} line items (${TGMP_ITEMS.length})`);
  SHEET_ITEMS.forEach(([line, price, rights], i) => {
    const it = TGMP_ITEMS[i];
    const ok = it && it.sheetLine === line && it.price === price && it.rights === rights;
    ck(ok, `${(it ? it.id : '?').padEnd(7)} ${money(price).padStart(8)}  ${rights} right${rights === 1 ? ' ' : 's'}  ${line}` +
      (ok ? '' : `  <-- got ${it ? `"${it.sheetLine}" ${money(it.price)} ${it.rights}` : 'nothing'}`));
  });
  for (const [name, list] of [['3D objects', fromObjs], ['list', rowFull], ['overview', rowMini]]) {
    const refs = [...new Set(list.map((c) => c.ref))].filter((r) => r.startsWith('TGMP-'));
    const ok = refs.length === 9 && refs.every((r) => {
      const d = TGMP_ITEMS.find((x) => x.id === r);
      const cells = list.filter((c) => c.ref === r);
      return d && cells.every((c) => +c.price === d.price && +c.rights === d.rights && c.st === d.st);
    });
    ck(ok, `${name.padEnd(11)} renders all 9 properties with the sheet's price, rights and status (${refs.length})`);
  }
  // Every object is tappable on all of its faces, not just one.
  const perObj = {};
  for (const c of fromObjs) perObj[c.ref] = (perObj[c.ref] || 0) + 1;
  const thin = Object.entries(perObj).filter(([, n]) => n < 5);
  ck(Object.keys(perObj).length === 9 && thin.length === 0,
    `each object is one button per face, so a tap anywhere on it selects it${thin.length ? ' — thin: ' + thin.map(([r, n]) => `${r}:${n}`).join(', ') : ` (${Object.values(perObj).reduce((a, b) => a + b, 0)} faces)`}`);
}

// ── 6. Money and rights anchors ──────────────────────────────────────────────
console.log('\nAvailable-inventory anchors');
{
  const all = allProperties();
  const tgnSum = tgnNiches().filter(sellable).reduce((a, n) => a + n.price, 0);
  const itemSum = TGMP_ITEMS.filter(sellable).reduce((a, n) => a + n.price, 0);
  const rights = all.filter(sellable).reduce((a, n) => a + n.rights, 0);
  ck(tgnSum === TGN_TOTAL, `niche bank available at list = ${money(TGN_TOTAL)} (got ${money(tgnSum)})`);
  ck(itemSum === ITEM_TOTAL, `additional properties available at list = ${money(ITEM_TOTAL)} (got ${money(itemSum)})`);
  ck(tgnSum + itemSum === TGN_TOTAL + ITEM_TOTAL, `whole path available at list = ${money(TGN_TOTAL + ITEM_TOTAL)}`);
  ck(rights === RIGHTS_TOTAL, `rights of interment across everything available = ${RIGHTS_TOTAL} (got ${rights})`);
  ck(all.filter(sellable).length === 49, `49 sellable properties (${all.filter(sellable).length})`);
  ck(src.includes(money(TGN_TOTAL + ITEM_TOTAL)), `the page prints ${money(TGN_TOTAL + ITEM_TOTAL)} as the available total`);
  ck(src.includes(`${RIGHTS_TOTAL} rights of interment`), `the page prints ${RIGHTS_TOTAL} rights of interment`);
}

// ── 7. THE SAFETY GATE: no price on anything unsellable ──────────────────────
console.log('\nNo price is rendered for anything unsellable');
{
  const unsell = new Set(allProperties().filter((n) => !sellable(n)).map((n) => n.ref));
  pass(`${unsell.size} propert${unsell.size === 1 ? 'y is' : 'ies are'} unsellable today (the sheet marks none sold)`);
  const offenders = [];
  for (const [name, list] of [['3D niche', from3d], ['3D object', fromObjs], ['flat', flatFull], ['list', rowFull], ['overview grid', flatMini], ['overview list', rowMini]]) {
    for (const c of list) {
      if (!unsell.has(c.ref)) continue;
      if (/\$\s*[\d,]+/.test(c.html)) offenders.push(`${name} ${c.ref} renders a dollar figure`);
      if (c.price !== '') offenders.push(`${name} ${c.ref} carries data-price="${c.price}"`);
    }
  }
  ck(offenders.length === 0, `zero dollar figures on unsellable renderings${offenders.length ? ' — ' + offenders.slice(0, 6).join('; ') : ''}`);
  const ariaBad = [...src.matchAll(/aria-label="([^"]*)"/g)].map((m) => m[1])
    .filter((l) => [...unsell].some((r) => l.startsWith(r + ',')) && /\$/.test(l));
  ck(ariaBad.length === 0, `zero dollar figures in the aria-labels of unsellable properties${ariaBad.length ? ' — ' + ariaBad.slice(0, 3).join('; ') : ''}`);
  // The card runtime must refuse to price a non-available record whatever the DOM says.
  const js = src.slice(src.lastIndexOf('<script>'));
  ck(/if \(m\.st !== 'available' \|\| m\.price === null\)/.test(js),
    'the detail card refuses to show pricing unless the record is available and priced');
  // And the status code is pattern, never hue — every hue here belongs to a price tier.
  ck(/repeating-linear-gradient\(135deg,rgba\(255,255,255,\.40\)/.test(src),
    'sold cells are coded by the frosted diagonal hatch (pattern, not hue)');
}

// ── 8. THE FEE SCHEDULE — present, exact, sourced, and arithmetically anchored ─
// Inverted 2026-07-29 (see the file header). The MVC June-2026 schedule now applies to
// this whole area by operator ruling, so its amounts MUST be here and MUST be right.
console.log('\nFee schedule — the MVC June-2026 amounts, applied by operator ruling');
{
  // 8a. The data module transcribed the schedule correctly.
  const sBad = Object.entries(SCHEDULE).filter(([k, v]) => FEES[k] !== v);
  ck(sBad.length === 0, `the data module carries the schedule as typed off the MVC sheet` +
    (sBad.length ? ' — ' + sBad.map(([k, v]) => `${k}: want ${v}, got ${FEES[k]}`).join('; ')
      : ` (O&C ${money(SCHEDULE.OC)} / recording ${money(SCHEDULE.REC)} / inscription ${money(SCHEDULE.INSCR)} / tax ${(SCHEDULE.TAX * 100).toFixed(1)}% / E.C.F. ${SCHEDULE.ECF_RATE * 100}%)`));
  ck(FEE_SOURCE.schedule === SCHEDULE_SOURCE && FEE_SOURCE.confirmedOn === SCHEDULE_RULED_ON &&
     FEE_SOURCE.printedOnThisSheet === false,
  `the module records the schedule as ${SCHEDULE_SOURCE}, ruled ${SCHEDULE_RULED_ON}, not printed on this sheet`);

  // 8b. Every amount is rendered on the page, as money, where a counselor can read it.
  const asMoney = (amt) => new RegExp(`\\$\\s?${String(amt).replace('.', '\\.')}(?![\\d.])`);
  for (const [amt, what] of [[SCHEDULE.OC, 'opening & closing'], [SCHEDULE.REC, 'recording fee'], [SCHEDULE.INSCR, 'inscription']]) {
    ck(asMoney(amt).test(src), `the page prints ${money(amt)} for ${what}`);
  }
  ck(/10\.4%/.test(src), 'the page prints the 10.4% sales-tax rate');
  ck(/10% of the sales price/.test(src), 'the page prints the E.C.F. as 10% of the sales price');
  ck(/not included in the listed price/.test(src), 'and says the E.C.F. is not included in the listed price');
  ck(/applies to the inscription only/.test(src), 'and that the tax applies to the inscription only');

  // 8c. The three quantity boxes exist, are labelled, and are DEFAULT-OFF.
  for (const [id, label] of [['oc-qty', 'Opening and closing'], ['rec-qty', 'Recording fee'], ['inscr-qty', 'Inscription']]) {
    const m = new RegExp(`<input type="number" id="${id}" min="0" max="${FEES.QTY_MAX}" value="0" aria-label="${label} quantity">`).test(src);
    ck(m, `#${id} is a 0..${FEES.QTY_MAX} quantity box defaulting to 0, labelled "${label} quantity"`);
  }
  ck(/\['oc-qty', 'rec-qty', 'inscr-qty'\]\.forEach/.test(src) && /if \(pinned\) showCard\(pinned, false\)/.test(src),
    'changing a quantity re-renders the pinned card (and showCard re-renders the print card with it)');
  ck(/closest\('#card, \.tab, \.tbtn, \.fees'\)/.test(src),
    'clicking into a quantity box does not unpin the card it is meant to update');

  // 8d. PROVENANCE — the one sentence that keeps this honest.
  ck(src.includes('not printed on the Terrace Garden Memorial Path price sheet'),
    "the footer says plainly that these fees are NOT printed on this area's sheet");
  ck(src.includes(SCHEDULE_SOURCE), `and names the schedule they came from (${SCHEDULE_SOURCE})`);
  ck(src.includes(`${FEE_SOURCE.confirmedBy} of ${SCHEDULE_RULED_ON}`),
    `and names the ${FEE_SOURCE.confirmedBy} of ${SCHEDULE_RULED_ON} as the authority`);
  ck(/the niche bank and the nine additional properties alike/.test(src),
    'and says the schedule covers the niche bank and the nine properties alike');
  ck(/Confirm current fees in MIS\/Enterprise/.test(src), 'and still sends the counselor to MIS for the current amounts');
  ck(/E\.C\.F\. is not included in the listed price\. Fees are the Mountain View Columbarium, June 2026 schedule/.test(src),
    'every detail card repeats the provenance in its own note');

  // 8e. THE ANCHOR. Extract the page's OWN emitted fee arithmetic and run it. This is
  // not a re-implementation of the math — it is the page's code, executed, with a
  // document stub standing in for the quantity boxes.
  const a = src.indexOf('// >>> FEE MATH >>>'), b = src.indexOf('// <<< FEE MATH <<<');
  ck(a > 0 && b > a, 'the page marks its fee-math block for extraction');
  if (a > 0 && b > a) {
    const block = src.slice(a, b);
    const makeCard = (q) => {
      const doc = { getElementById: (id) => (q[id] === undefined ? null : { value: String(q[id]) }) };
      // eslint-disable-next-line no-new-func
      return new Function('document', block + '\nreturn cardHtml;')(doc);
    };
    const totalOf = (ref, q) => {
      const html = makeCard({ 'oc-qty': q.oc || 0, 'rec-qty': q.rec || 0, 'inscr-qty': q.inscr || 0 })(ref);
      const m = /<span class="ctv">([^<]*)<\/span>/.exec(html);
      return { label: (/<span class="ctl">([^<]*)<\/span>/.exec(html) || [, ''])[1], total: m ? m[1] : null, html };
    };
    for (const A of [ANCHOR_OFF, ANCHOR, ANCHOR_ITEM]) {
      const got = totalOf(A.ref, A.q);
      const on = Object.entries(A.q).filter(([, v]) => v).map(([k, v]) => `${k}x${v}`).join(' + ') || 'nothing toggled on';
      ck(got.label === 'Est. Total' && got.total === money(A.total),
        `${A.ref} with ${on}: the page's own math gives Est. Total ${money(A.total)} (got ${got.label} ${got.total})`);
    }
    // The E.C.F. row is always present and never folded into the price.
    const base = totalOf(ANCHOR.ref, {});
    ck(/<span class="cl">E\.C\.F\. \(10%\)<\/span><span class="cv">\$1,600<\/span>/.test(base.html),
      `${ANCHOR.ref} shows a ${money(ecf(ANCHOR.price))} E.C.F. row even with every quantity at 0`);
    // A quantity of 0 must print NO row at all — a "$0" line reads as a real charge.
    ck(!/O&amp;C|Recording ×|Inscription ×|Sales Tax/.test(base.html),
      'and prints no O&C, recording, inscription or tax row until one is turned on');
    const full = totalOf(ANCHOR.ref, ANCHOR.q);
    ck(/<span class="cl">Sales Tax \(10\.4%\)<\/span><span class="cv">\$68\.64<\/span>/.test(full.html),
      'the tax row is 10.4% of the inscription alone ($68.64 on one $660 inscription), to the cent');
    ck(!/\$1,663\.60|\$2,020/.test(full.html), 'and the tax is not levied on the sales price or the whole subtotal');
  }
  // 8f. The module's own helper agrees with the page — two independent paths, one number.
  ck(estTotal(ANCHOR.price, ANCHOR.q) === ANCHOR.total,
    `the data module's estTotal() reaches the same ${money(ANCHOR.total)} the page does`);

  // 8g. Still no ECL fee. The ruling named one schedule, not "any schedule".
  const asFee = (amt) => new RegExp(`\\$\\s?${amt.replace('.', '\\.')}(?![\\d.])|(?<![\\d.])${amt.replace('.', '\\.')}\\s?(?:ea\\b|each\\b|%)`, 'i');
  const strays = FOREIGN_FEES.filter(([amt]) => asFee(amt).test(src));
  ck(strays.length === 0, `no East Chapel Lawn fee amount appears on the page${strays.length ? ' — ' + strays.map(([a2, w]) => `$${a2} (${w})`).join(', ') : ` (${FOREIGN_FEES.length} checked)`}`);
}

// ── 9. Sourcing honesty ──────────────────────────────────────────────────────
console.log('Sourcing honesty');
{
  ck(/layout estimated from photographs/i.test(src), 'the header says the layout is estimated from photographs');
  ck(/placement along the path is approximate/i.test(src), 'the page says object placement is approximate');
  ck(/not priced here/.test(src) && /Terrace Garden Ossuary/.test(src),
    'the ossuary is labelled and explicitly not priced here');
  const ossPriced = [...from3d, ...fromObjs, ...rowFull].some((c) => /ossuary/i.test(c.html));
  ck(!ossPriced, 'the ossuary is not rendered as a sellable property');
  const noDims = TGMP_ITEMS.filter((it) => !it.dims);
  ck(noDims.length === 1 && noDims[0].id === 'TGMP-4', 'exactly one item has no dimensions on the sheet (TGMP-4, the birdbath)');
  ck(/no dimensions on the sheet/.test(src), 'and the page says so rather than inventing one');
  // Exact prices only: no "$52K" style rounding anywhere.
  const rounded = [...src.matchAll(/\$\d+(?:\.\d+)?K\b/g)].map((m) => m[0]);
  ck(rounded.length === 0, `no rounded price labels${rounded.length ? ' — ' + rounded.join(', ') : ''}`);
  // No plate name, and no photograph, may reach a committed file.
  ck(!/\.jpe?g|\.png|data:image/i.test(src), 'the page embeds no photograph (the source photos show inscribed plates)');
}

// ── 10. Print path ───────────────────────────────────────────────────────────
console.log('\nPrint path');
{
  ck(/id="wall-tgn"/.test(src) && /id="wall-props"/.test(src), 'both flat views exist as static HTML');
  ck(/\.wview\{display:block!important/.test(src), 'print stylesheet reveals them without JS');
  ck(/body\.pv-one \.wview\.active\{display:block!important/.test(src), 'print scope follows the active tab');
  ck(/body\.pv-sel \.wview\.printsel\{display:block!important/.test(src), 'print scope follows a highlighted property');
  ck(/\.n\.sel,\.irow\.sel\{outline:4px solid #c8540a/.test(src), 'a selected property prints with the highlight ring');
  const scripts = (src.match(/<script/g) || []).length;
  ck(scripts === 1, `page has ${scripts} <script> block(s); none is needed to render the flat views`);
}

// ── 10b. The pinned card must never cover the tab bar ────────────────────────
console.log('\nPinned card vs the tab bar');
{
  // A pinned property in a hidden view has a ZERO rect, and a card placed against zero
  // lands on the tab bar and eats the tab clicks. Found by driving the GOMN page, 2026-07-31.
  const js = src.slice(src.lastIndexOf('<script>'));
  ck(/function visibleTwin\(el\)/.test(js), 'the card places itself against a rendering that is actually laid out');
  ck(/var t = visibleTwin\(el\);/.test(js) && /if \(!t\) \{ card\.style\.left/.test(js),
    'and parks in its default corner when no rendering of the pinned property is visible');
  ck(!/var r = el\.getBoundingClientRect\(\);\s*\r?\n\s*card\.style\.right = 'auto'/.test(js),
    'placeCard no longer measures the pinned element directly (the zero-rect path)');
}

// ── 11. House rules ──────────────────────────────────────────────────────────
console.log('\nHouse rules');
ck(/class="back-btn no-print" href="\.\.\/"/.test(src), '"← Quote Tool" back button in the header');
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
  pass(`worst tier chip contrast ${worst.toFixed(2)}:1 (${worstT}) — all ${TIERS.length} clear WCAG AA`);
}
ck(!src.includes('__VIEWS__'), 'the camera presets were substituted into the page runtime');
ck(tgnRef('C', 4) === 'TGN-C-4', 'refOf helper spells references the way the footer says it does');

console.log(failures ? `\nRESULT: ${failures} FAILURE(S)` : '\nRESULT: PASS — 0 mismatches');
process.exit(failures ? 1 : 0);
