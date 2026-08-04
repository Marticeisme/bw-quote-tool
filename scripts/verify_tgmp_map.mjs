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
import * as DATA from './tgmp-data.mjs';
import {
  TGN, TGMP_ITEMS, TIERS, FEES, FEE_SOURCE, ecf, estTotal,
  GEO, PLACEMENT, PLANTER, PLANTERS, INNER_X, INNER_Z, BANK_W,
  BANK_H, FAR_PLANTER, SCULPTURES, SCULPT, CTX_POST, CTX_POSTS,
  tgnNiches, tgnRef, sellable, allProperties,
} from './tgmp-data.mjs';
import { extractedTgn, MVC_REL } from './extract_tgn_from_mvc.mjs';
import { MOVEMENT_TOKENS } from './map-movement.mjs';
import { assertFamilyRegister, stripUnrendered } from './_no_mis_assert.mjs';

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
  ck(TGMP_ITEMS.every((it, i) => it.id === `TGMP-${i + 1}`),
    'the nine objects are numbered TGMP-1 … TGMP-9 in the pricing sheet\'s own order');
}
if (failures) { console.log(`\nRESULT: ${failures} FAILURE(S) — the page cannot be built from this data`); process.exit(1); }

// ── 0b. THE LAYOUT ───────────────────────────────────────────────────────────
// Rewritten 2026-07-31 (Track T) from a 1-D check to a 2-D footprint test.
//
// REWRITTEN AGAIN 2026-08-04 (sprint-14 Track E) against the walkthrough video
// `20260803_120633.mp4`, which did not exist when Track T built this scene from the
// marketing render. The footprint test is kept and extended; what changes is WHAT it
// asserts, because the video contradicts the render on the shape of the place. Each
// assertion below names the timestamp that justifies it. The video is in
// `D:\Cemetery Photos Misc\Terrace Garden Memorial Path\` and is not in this repo — it
// shows inscribed niche plates with real names.
console.log('\nLayout — footprints in plan, against the 2026-08-03 walkthrough');
{
  const rect = (cx, cz, w, d) => ({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2 });
  const hits = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;
  const objs = [
    ...TGMP_ITEMS.map((it) => ({ id: it.id, r: rect(it.x, it.z, it.w, it.d) })),
    ...PLANTERS.map((p, i) => ({ id: `planter-${i + 1}`, r: rect(p.x, p.z, PLANTER.w, PLANTER.d) })),
    ...CTX_POSTS.map((p, i) => ({ id: `ctx-post-${i + 1}`, r: rect(p.x, p.z, CTX_POST.w, CTX_POST.d) })),
    { id: 'far planter', r: rect(FAR_PLANTER.x, 0, FAR_PLANTER.w, FAR_PLANTER.d) },
    // The bank is turned a quarter turn, so its 110" face runs along z and its 10"
    // thickness along x.
    { id: 'TGN bank', r: rect(GEO.bankX, GEO.bankZ, GEO.bankT, BANK_W) },
  ];
  ck(TGMP_ITEMS.every((it) => Number.isFinite(it.x) && Number.isFinite(it.z)) &&
     TGMP_ITEMS.every((it) => PLACEMENT[it.id]),
  `all ${TGMP_ITEMS.length} properties have an x and a z from PLACEMENT`);

  const clash = [];
  for (let i = 0; i < objs.length; i++) {
    for (let j = i + 1; j < objs.length; j++) if (hits(objs[i].r, objs[j].r)) clash.push(`${objs[i].id}/${objs[j].id}`);
  }
  ck(clash.length === 0, `no two of the ${objs.length} standing objects overlap in plan${clash.length ? ' — ' + clash.slice(0, 6).join(', ') : ''}`);

  const out = objs.filter((o) => o.r.x0 < -INNER_X || o.r.x1 > INNER_X || o.r.z0 < -INNER_Z || o.r.z1 > INNER_Z);
  ck(out.length === 0, `everything stands inside the retaining kerb (${-INNER_X}..${INNER_X} by ${-INNER_Z}..${INNER_Z} in)` +
    (out.length ? ' — outside: ' + out.map((o) => o.id).join(', ') : ''));

  // Nothing may stand in the walking surface. The landing at the bank end is open
  // paving and objects do stand beside it, so the test is the walk and the turn-around.
  const walk = { x0: GEO.apronX1, x1: GEO.headX, z0: -GEO.pathW / 2, z1: GEO.pathW / 2 };
  const inWalk = objs.filter((o) => hits(o.r, walk));
  ck(inWalk.length === 0, `nothing stands in the ${GEO.pathW}" walk${inWalk.length ? ' — ' + inWalk.map((o) => o.id).join(', ') : ''}`);
  const nearHead = objs.filter((o) => {
    const nx = Math.max(o.r.x0, Math.min(GEO.headX, o.r.x1));
    const nz = Math.max(o.r.z0, Math.min(GEO.pathZ, o.r.z1));
    return Math.hypot(nx - GEO.headX, nz - GEO.pathZ) < GEO.headR;
  });
  ck(nearHead.length === 0, `nothing stands on the ${GEO.headR * 2}" turn-around${nearHead.length ? ' — ' + nearHead.map((o) => o.id).join(', ') : ''}`);

  // 07:32 / 07:36 — the turn-around is a lobed flagstone panel set INTO the walk about
  // three quarters along, roughly the walk's own width, with a bench and the far
  // planter beyond it. The render had it as a 136" circle closing the near end.
  ck(GEO.headR * 2 > GEO.pathW && GEO.headR * 2 < GEO.pathW * 1.5,
    `the turn-around is walk-sized: ${GEO.headR * 2}" across a ${GEO.pathW}" walk (07:32)`);
  ck(GEO.headX < INNER_X - 100 && GEO.headX > 0,
    `and sits MID-path at x=${GEO.headX}, not against the far kerb at ${INNER_X} (07:32, 07:36)`);
  ck(FAR_PLANTER.x - FAR_PLANTER.w / 2 > GEO.headX + GEO.headR,
    'the far sculpture planter stands beyond the turn-around (07:32)');

  // 07:32 / 07:36 — the properties LINE the walk in two rows, one down each bed's inner
  // edge, and exactly one of them stands on the centre line: the 48" bench facing back
  // down the path from in front of the far planter.
  const onAxis = TGMP_ITEMS.filter((it) => Math.abs(it.z) < GEO.pathW / 2);
  ck(onAxis.length === 1 && onAxis[0].id === 'TGMP-2',
    `exactly one property stands on the centre line, the 48" bench facing the bank (07:32) — got ${onAxis.map((i) => i.id).join(', ') || 'none'}`);
  const inRows = TGMP_ITEMS.filter((it) => it.id !== 'TGMP-2');
  ck(inRows.every((it) => Math.abs(it.z) === GEO.bedZ),
    `the other ${inRows.length} stand in the two bed rows at z = ±${GEO.bedZ}" (07:32, 07:36)` +
    (inRows.every((it) => Math.abs(it.z) === GEO.bedZ) ? '' : ' — off-row: ' + inRows.filter((it) => Math.abs(it.z) !== GEO.bedZ).map((i) => i.id).join(', ')));
  ck(inRows.filter((it) => it.z < 0).length === 4 && inRows.filter((it) => it.z > 0).length === 4,
    'four to a row, as the walkthrough shows them alternating across the walk');
  // 07:32 and 07:36 both frame the columbarium and the dove birdbath square on, facing
  // each other across the walk just short of the turn-around.
  const col = TGMP_ITEMS.find((i) => i.id === 'TGMP-3'), bath = TGMP_ITEMS.find((i) => i.id === 'TGMP-4');
  ck(col.x === bath.x && col.z === -bath.z,
    `TGMP-3 and TGMP-4 stand opposite each other across the walk at x=${col.x} (07:32, 07:36)`);
  ck(col.x < GEO.headX && col.x > GEO.headX - 120,
    'and just short of the turn-around, the way the walkthrough frames them');
  ck(bath.dove === true, 'the birdbath carries the carved dove the video shows on its rim (06:12)');

  // 06:56 / 07:00 — four large urn planters mark the two ends of the axis: two flanking
  // the bank steps, two at the front corners of the far planter. The render's eight
  // small planters strung along the kerbs are not there.
  ck(PLANTERS.length === 4, `${PLANTERS.length} urn planters (06:56, 07:32) — the render's eight kerb planters are gone`);
  ck(PLANTERS.filter((p) => p.x < 0).length === 2 && PLANTERS.filter((p) => p.x > 0).length === 2 &&
     PLANTERS.filter((p) => p.z > 0).length === 2,
  'two flanking the bank steps and two at the far planter, one either side of the axis');
  ck(PLANTERS.filter((p) => p.x < 0).every((p) => p.x > GEO.apronX0 && p.x < GEO.apronX1),
    'the bank-end pair stands on the paved landing at the foot of the steps (07:00)');

  // 04:36 / 06:56 / 07:00 — the bank stands on a plinth three risers above the walk.
  ck(GEO.podiumH > 0 && GEO.steps * GEO.stepRise === GEO.podiumH,
    `the bank podium is ${GEO.podiumH}" = ${GEO.steps} risers x ${GEO.stepRise}" (04:36, 07:00)`);
  ck(GEO.podiumW >= BANK_W && GEO.podiumD >= BANK_W,
    'and is wider and deeper than the wall it carries');

  // 05:20 / 05:36 / 07:32 — the court is ENCLOSED by the two mausoleum wings.
  ck(GEO.wallH > BANK_H, `the crypt walls enclosing the court stand ${GEO.wallH}" — over the ${BANK_H}" bank (05:20, 07:32)`);
  ck(GEO.apronSideD > 0, `and a ${GEO.apronSideD}" raised apron runs between each kerb and its wall (05:20, 07:32)`);

  // 07:32 — three wave sculptures, HONOR / CELEBRATE / REMEMBER, in the far planter.
  ck(SCULPTURES.length === 3 && SCULPTURES.map((s) => s.label).join('|') === 'HONOR|CELEBRATE|REMEMBER',
    `the far planter carries ${SCULPTURES.length} sculptures labelled ${SCULPTURES.map((s) => s.label).join(' / ')} (07:32)`);
  ck(SCULPTURES.every((s) => Math.abs(s.z) + SCULPT.w / 2 <= FAR_PLANTER.d / 2),
    'and all three stand inside the planter they are set in');

  // The installed memorials lining the beds are context and must never be inventory.
  ck(CTX_POSTS.length > TGMP_ITEMS.length,
    `${CTX_POSTS.length} already-set memorials line the beds — more than the sheet's ${TGMP_ITEMS.length} items, as the video shows (05:20, 06:16, 07:32)`);
  ck(CTX_POSTS.every((p) => Math.abs(p.z) === GEO.bedZ),
    'and every one of them stands in a bed row, never on the walk');
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

  // 8d. PROVENANCE — REPOINTED 2026-08-02 (s11/family-register).
  //
  // This block used to require the page to print which sheet the fees are NOT on, what
  // that sheet does contain, which schedule they are, and who ruled them across on which
  // date. That is our paperwork, and the operator caught the same voice on the COM map:
  // "Why does it say operator here?" The provenance is unchanged and still required — in
  // the data module, asserted here — and the page carries the family-facing half. The
  // FIGURES and the fee arithmetic below are untouched.
  const rendered = stripUnrendered(src);
  // NB `DATA` in this file is the imported MODULE namespace, not a path.
  const dataSrc = fs.readFileSync(path.join(ROOT, 'scripts', 'tgmp-data.mjs'), 'utf8');
  ck(dataSrc.includes(SCHEDULE_SOURCE), `the data module records the schedule (${SCHEDULE_SOURCE})`);
  ck(dataSrc.includes(SCHEDULE_RULED_ON), `and the date it was ruled across (${SCHEDULE_RULED_ON})`);
  ck(!rendered.includes(SCHEDULE_SOURCE) && !rendered.includes(SCHEDULE_RULED_ON)
    && !/price sheet/i.test(rendered),
    'and none of it renders: no schedule name, no ruling date, no "price sheet"');
  ck(/These are Bonney Watson&rsquo;s current charges/.test(src),
    'the footer states whose charges these are');
  ck(/the niche bank and the nine additional properties alike/.test(src),
    'and says they cover the niche bank and the nine properties alike');
  ck(/Ask us to confirm today&rsquo;s charges before writing/.test(src),
    'and tells the reader to ask us before writing');
  ck(/E\.C\.F\. is not included in the listed price\. Fees are Bonney Watson\\'s current charges/.test(src),
    'every detail card repeats the same statement in its own note');

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
  ck(/layout from a walkthrough, proportions estimated from photographs/i.test(src), "the header says the layout comes from a walkthrough and the proportions are estimated");
  ck(/placement along the path is approximate/i.test(src), 'the page says object placement is approximate');
  ck(/not priced here/.test(src) && /Terrace Garden Ossuary/.test(src),
    'the ossuary is named and explicitly not priced here');
  ck(/Layout .{0,20}the walk/.test(src) && /Every <i>number<\/i> is an estimate/.test(src),
    'the page separates what is sourced (the layout) from what is estimated (every number)');
  ck(/the built garden is bark mulch/.test(src),
    'and says the beds are bark, not the turf the marketing render draws');
  // Repointed 2026-08-04. The bank's position WAS the weakest estimate on this page —
  // the render floated it over the garden as a callout. The walkthrough shows it in
  // place at the head of the court, and its 8x5 grid is countable off the corner
  // rosettes on the face (05:40, 06:56, 07:00), so the page must no longer call it an
  // estimate. Keeping the old sentence would now be the dishonest option.
  ck(/niche bank&rsquo;s position and its eight-by-five grid are confirmed by the walkthrough/.test(src),
    "and states the niche bank's position and grid are footage-confirmed, not estimated");
  ck(!/bank&rsquo;s position across the far end is estimated/.test(src),
    'and no longer carries the superseded "position is estimated" sentence');
  ck(/filmed on 3 August 2026/.test(src), 'the page dates the walkthrough its layout comes from');
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
{
  // The camera presets, read back out of the page's own runtime.
  const vm = /var VIEWS = (\{.*?\});/.exec(src);
  ck(!!vm, 'the page carries its camera presets as plain numbers');
  if (vm) {
    const V = JSON.parse(vm[1]);
    const want = ['path', 'bank', 'props', 'over', 'midpath', 'stand'];
    const miss = want.filter((k) => !V[k]);
    ck(miss.length === 0, `${want.length} camera presets, including the two walk-through stops${miss.length ? ' — missing ' + miss.join(', ') : ' (' + want.join(', ') + ')'}`);
    // The bank now faces down +x, so its face-on preset must have turned with it: a
    // yaw of 0 would frame the wall edge-on and show nothing.
    ck(V.bank && V.bank.yaw === -90, `the "niche bank" preset turns to the wall's new facing (yaw ${V.bank && V.bank.yaw})`);
    ck(V.bank && V.bank.fit === '.bankface',
      'and re-fits itself by measuring the wall, because the closed-form solve cannot reach a target that far behind the origin');
    // Both stops stand on the walk at eye height, facing the bank, at different points.
    ck(V.midpath && V.stand && V.midpath.yaw === -90 && V.stand.yaw === -90,
      'both walk stops face the niche bank along the path');
    ck(V.midpath && V.stand && V.midpath.t[0] < V.stand.t[0] &&
       V.midpath.pitch > -12 && V.stand.pitch > -12 && V.midpath.t[1] < 0 && V.stand.t[1] < 0,
    'and stand at eye level, one half way up and one at the turn-around');
    for (const k of ['midpath', 'stand']) {
      ck(new RegExp(`data-viewbtn="${k}"`).test(src), `a toolbar button drives the "${k}" walk stop`);
    }
  }
}
ck(tgnRef('C', 4) === 'TGN-C-4', 'refOf helper spells references the way the footer says it does');

// ── 12. THERE IS NO POOL ─────────────────────────────────────────────────────
// Added 2026-07-31 (Track T) on the operator's Map Issues 07.31.26 note: "there is not
// pool anymore the path removed the pool entirely." The pool, its coping, its spout and
// the ossuary mass beside it were all built from a drawing titled WHAT WAS REPLACED.
// This section fails if any of them is reintroduced — in the data OR on the page.
console.log('\nNo pool — the path replaced it');
{
  const geoKeys = Object.keys(GEO).filter((k) => /pool|water|spout|coping|oss/i.test(k));
  ck(geoKeys.length === 0, `GEO carries no pool, spout, coping or ossuary geometry${geoKeys.length ? ' — ' + geoKeys.join(', ') : ` (${Object.keys(GEO).length} keys, none of them)`}`);
  const dataKeys = Object.keys(DATA).filter((k) => /^(POOL|WATER|SPOUT|OSS)/i.test(k));
  ck(dataKeys.length === 0, `the data module exports no pool/ossuary object${dataKeys.length ? ' — ' + dataKeys.join(', ') : ''}`);

  // On the page: no water surface, no coping ring, no spout or ossuary mass, and no
  // label naming a pool. Class names and the label are checked separately so a partial
  // revival cannot slip through on the strength of the other half being gone.
  const banned = [
    [/class="[^"]*\bwater\b/, 'a water surface'],
    [/class="[^"]*\bcoping\b/, 'a pool coping ring'],
    [/class="[^"]*\bspout\b/, 'a pool spout mass'],
    [/class="[^"]*\boss\b/, 'an ossuary mass'],
    [/\.water\{/, 'a .water rule in the stylesheet'],
    [/\.coping\{/, 'a .coping rule in the stylesheet'],
    [/REFLECTION POOL/, 'a REFLECTION POOL label'],
  ];
  const back = banned.filter(([re]) => re.test(src));
  ck(back.length === 0, `the page renders none of ${banned.length} pool/ossuary artefacts${back.length ? ' — back: ' + back.map(([, w]) => w).join(', ') : ''}`);
  // "Pool" may appear only in the sentence that says there isn't one.
  const pools = [...src.matchAll(/[^<>]{0,40}pool[^<>]{0,40}/gi)].map((m) => m[0].trim());
  const badPools = pools.filter((s) => !/no reflection pool/i.test(s));
  ck(badPools.length === 0, `the word "pool" appears only in the sentence saying there is none${badPools.length ? ' — ' + badPools.slice(0, 3).join(' | ') : ` (${pools.length} occurrence${pools.length === 1 ? '' : 's'})`}`);
  ck(/There is no reflection pool/.test(src), 'and the footer states it outright');

  // The context that IS there — kerb and planters — must stay context: no reference, no
  // price, no card. A context mass that gained a data-ref would be sellable inventory
  // the pricing sheet never priced.
  const ctxTags = [...src.matchAll(/<(?:div|button)[^>]*class="ctx[^"]*"[^>]*>/g)].map((m) => m[0]);
  const armed = ctxTags.filter((t) => /data-ref=|data-price=|<button/.test(t));
  ck(ctxTags.length > 0 && armed.length === 0,
    `all ${ctxTags.length} context faces are inert divs with no reference and no price${armed.length ? ' — armed: ' + armed.length : ''}`);
  // Widened 2026-08-04: the video added the enclosing crypt walls, the bank podium and
  // its risers, the far sculpture planter and the memorials already set in the beds.
  // Every one of them is scenery. If any ever gained a data-ref it would become
  // inventory the pricing sheet never priced — which is what the assert above catches
  // and what this exact count keeps honest.
  const KERB_FACES = 4 * 5;
  const PLANTER_FACES = PLANTERS.length * 5;
  // Two long walls of WALL_BAYS bays each, plus the back wall and the far low wall.
  // The bays are not decoration: one un-segmented 892" face crosses the eye plane at
  // both walk stops and CSS 3D, having no near clipping, then draws nothing at all.
  const WALL_BAYS = 8;
  const WALL_FACES = (2 * WALL_BAYS + 2) * 5;
  // The plinth plus its intermediate treads. Three risers from the walk to the plinth
  // means TWO masses between them — the third "step" is the walk itself, height 0, and
  // the builder drops it rather than emitting a flat plate at ground level.
  const PODIUM_FACES = (1 + (GEO.steps - 1)) * 5;
  const FAR_FACES = 5 + SCULPTURES.length * 5;          // planter kerb + three sculptures
  const PLAQUE_FACES = SCULPTURES.length;               // one flat plaque each
  const CPOST_FACES = CTX_POSTS.length * 5;
  const WANT = KERB_FACES + PLANTER_FACES + WALL_FACES + PODIUM_FACES + FAR_FACES + PLAQUE_FACES + CPOST_FACES;
  ck(ctxTags.length === WANT,
    `${KERB_FACES} kerb + ${PLANTER_FACES} planter + ${WALL_FACES} crypt-wall + ${PODIUM_FACES} podium/step + ${FAR_FACES} far-planter + ${PLAQUE_FACES} plaque + ${CPOST_FACES} set-memorial = ${WANT} context faces (got ${ctxTags.length})`);
}


// ── Movement runtime (ported from the COM map, sprint-10) ────────────────────
// The feel is generated from scripts/map-movement.mjs, so the only thing worth
// asserting here is that the page still CARRIES it: a build script edited to drop the
// interpolation would otherwise revert silently to cut transitions and no inertia, and
// nothing else on this page would notice. The two behavioural invariants are asserted
// too, because they are the ones a family sees go wrong: the tap detector's threshold
// must still be pointer TRAVEL, and inertia must not have widened the click-suppression
// window (a window that outlived the coast would swallow the next tap).
console.log('\nMovement runtime');
{
  const js = src.slice(src.lastIndexOf('<script>'));
  for (const [tok, what] of MOVEMENT_TOKENS) ck(js.indexOf(tok) > -1, what);
  const keys = ["yaw","pitch","zoom","panx","pany"];
  const m = /var CAM_KEYS = (\[[^\]]*\])/.exec(js);
  ck(!!m && JSON.stringify(JSON.parse(m[1])) === JSON.stringify(keys),
    `an eased transition carries the WHOLE camera: ${keys.join(', ')}` +
    (m ? ` (page: ${m[1]})` : ' — CAM_KEYS not found'));
  ck(/moved <= 8/.test(js), 'the tap detector still keys off POINTER TRAVEL (moved <= 8)');
  ck(/suppressUntil = performance\.now\(\) \+ 450;/.test(js),
    'the click-suppression window is still a flat 450 ms and is not tied to camera motion');
  ck(!/suppressUntil[^;]*(vYaw|vPitch|glideRaf|camT)/.test(js),
    'nothing about the glide can extend the suppression window');
  ck(/releaseGesture\(moved\);/.test(js), 'the release reads pointer travel and nothing else');
  ck(/stopGlide\(\);\s*\/\/ any touch interrupts/.test(js), 'a pointerdown stops the camera');
  ck(/ev\.preventDefault\(\); stopGlide\(\);/.test(js), 'the wheel stops the camera too');
  // The terrace has real ground, so a tap on it WALKS rather than dismissing.
  ck(/function floorPoint\(ev\)/.test(js), 'the ground plates are click targets (floorPoint)');
  ck((src.match(/data-fx="/g) || []).length === 5,
    `all five ground plates carry data-fx/data-fz (${(src.match(/data-fx="/g) || []).length})`);
  ck(/<div class="reticle" id="reticle"/.test(src), 'the walk-to reticle is rendered');
  ck(/travelTo\(downFloor\[0\], downFloor\[1\]\);/.test(js),
    'a tap on open ground walks there');
  ck(!/downFloor[\s\S]{0,80}hideCard\(\)/.test(js),
    'and does NOT dismiss a pinned card on the way');
}

// ── ZERO RENDERED "MIS" ─────────────────────────────────────────────────────
// Operator, 2026-08-02: "Never mention the word MIS on any guide to a family or any live
// niche maps etc — that information does not need to be disclosed to families." This map
// is a live niche map: he opens it in front of people. It used to send the reader to
// "MIS/Enterprise", which names an internal system a family can neither see nor check.
//
// The assertion is here rather than in the sweep commit's diff because a wording fix is
// exactly the kind of change that gets undone by the next person copying a sentence from
// a sibling generator. Comments keep the word on purpose — see scripts/_no_mis_assert.mjs.
console.log('\nFamily-facing wording');
assertFamilyRegister((c, m) => (c ? pass : fail)(m), 'TGMP_Map.html', src);

console.log(failures ? `\nRESULT: ${failures} FAILURE(S)` : '\nRESULT: PASS — 0 mismatches');
process.exit(failures ? 1 : 0);
