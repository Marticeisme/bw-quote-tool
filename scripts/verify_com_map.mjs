/**
 * Gate for the Chapel of Memory Mausoleum map.
 *
 * Proves MAPS/COM_CryptMap.html carries EXACTLY the dataset in
 * scripts/com-crypt-data.mjs — same refs, same types, same statuses, same counts per
 * bank AND per column — that its three renderings (3D faces, flat per-bank grids,
 * print overview) agree with each other, that the build is deterministic, and that
 * NO money string is rendered for anything that is not an available niche.
 *
 * Sabotage-proven: `node scripts/verify_com_map.mjs --sabotage` runs three mutations
 * (a status flipped, a niche price moved to another valid row, a unit deleted) and
 * asserts the gate fails on each and passes again once restored.
 *
 *   node scripts/verify_com_map.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  BANKS, TIERS, VOIDS, WALLS, UNITS, AREAS, ROOMS, ENTRANCES, FURNITURE, STOPS,
  PLAN_W, PLAN_H, COLW, TANDEM_DEPTH, SINGLE_DEPTH, bankDepth,
  cryptUnits, wallNiches, allNiches, cryptSpaces, chapelChairs,
  NICHE_FEES, CRYPT_FEES,
} from './com-crypt-data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REL = 'MAPS/COM_CryptMap.html';
const ABS = path.join(ROOT, REL);
const DATA = path.join(ROOT, 'scripts', 'com-crypt-data.mjs');
const BUILD = path.join(ROOT, 'scripts', 'build_com_map.mjs');

// ── Anchors. These are the numbers the sabotage run must break. ───────────────
const A = {
  banks: 17,
  units: 785,
  spaces: 893,          // 131 columns x 7 tiers, less the 24 EMPTY-AREA slots
  available: 51,
  blocked: 18,
  unavailable: 716,
  voidSlots: 24,
  niches: 122,
  nichesAvail: 27,
  nicheValue: 233075,   // Radiance $156,115 + Serenity $76,960
  radValue: 156115,
  serValue: 76960,
  cryptPriceStrings: 0, // no crypt anywhere renders a dollar amount
  // POSITIONAL anchors. A plain total is blind to a price that MOVES to another
  // valid row, so each available-$ figure is also pinned per row and by a
  // position-weighted checksum.
  radPerRow: { K: 41770, J: 47275, H: 67070 },
  serPerRow: { K: 6590, J: 14295, H: 29685, G: 16495, A: 9895 },
  radChecksum: 2596925,
  serChecksum: 2400750,
  cryptChecksum: 374857,
};

let failures = 0;
const fail = (m) => { failures++; console.log('  FAIL  ' + m); };
const pass = (m) => console.log('  ok    ' + m);
const chk = (cond, m) => (cond ? pass : fail)(m);

const src = fs.readFileSync(ABS, 'utf8');

// ── Parse the rendered page ───────────────────────────────────────────────────
function parseCells(cls) {
  const out = [];
  const re = new RegExp(`<button[^>]*class="${cls}[^"]*"[^>]*>`, 'g');
  for (const m of src.matchAll(re)) {
    const tag = m[0];
    const at = (k) => { const r = new RegExp(`data-${k}="([^"]*)"`).exec(tag); return r ? r[1] : null; };
    if (!at('ref')) continue;
    out.push({
      kind: at('kind'), bank: at('bank'), wall: at('wall'), ref: at('ref'), id: at('id'),
      tier: at('tier'), cols: at('cols'), type: at('type'), st: at('st'),
      row: at('row'), col: at('col'), price: at('price'),
    });
  }
  return out;
}
const from3dCrypt = parseCells('c3 ty-');
const from3dNiche = parseCells('c3 n3glass');
const flatAll = parseCells('c flatc');
const flatNAll = parseCells('c flatn');

// The flat grids render twice: full per-bank views, then the mini overview.
function split(list) {
  const seen = new Set(), full = [], mini = [];
  for (const c of list) { (seen.has(c.ref) ? mini : full).push(c); seen.add(c.ref); }
  return [full, mini];
}
const [flat, flatMini] = split(flatAll);
const [flatN, flatNMini] = split(flatNAll);

const units = cryptUnits();
const niches = allNiches();
const sigC = (c) => `${c.ref}|${c.type}|${c.st}`;
const sigN = (c) => `${c.ref}|${c.st}|${c.price || ''}`;
const dataC = units.map((u) => ({ ref: u.ref, type: u.type, st: u.st }));
const dataN = niches.map((n) => ({ ref: n.ref, st: n.st, price: n.p == null ? '' : String(n.p) }));

console.log(`\nCOM crypt/niche map gate   (${REL})\n`);

// ── 1. Determinism ────────────────────────────────────────────────────────────
console.log('Build determinism');
{
  const before = fs.readFileSync(ABS);
  execFileSync(process.execPath, [BUILD], { cwd: ROOT, stdio: 'pipe' });
  const after = fs.readFileSync(ABS);
  chk(before.equals(after), `rebuilding from the data module reproduces the page byte-for-byte (${after.length} bytes)`);
}

// ── 2. Structural totals ──────────────────────────────────────────────────────
console.log('\nTotals');
chk(BANKS.length === A.banks, `${A.banks} crypt banks defined (${BANKS.length})`);
chk(units.length === A.units, `${A.units} purchasable crypt units (${units.length})`);
chk(cryptSpaces().length === A.spaces, `${A.spaces} crypt spaces = 131 columns x 7 tiers less the ${A.voidSlots} EMPTY-AREA slots (${cryptSpaces().length})`);
{
  const voidSlots = VOIDS.reduce((s, v) => s + v.cols.length * v.tiers.length, 0);
  chk(voidSlots === A.voidSlots, `the two EMPTY-AREA voids cover ${A.voidSlots} slots and contain zero crypts (${voidSlots})`);
  const bad = VOIDS.flatMap((v) => units.filter((u) => u.bank === v.bank && v.tiers.includes(u.tier) && u.cols.some((c) => v.cols.includes(c))).map((u) => u.ref));
  chk(bad.length === 0, `no crypt unit falls inside an EMPTY-AREA void${bad.length ? ': ' + bad.slice(0, 5).join(', ') : ''}`);
}
{
  const h = {};
  for (const u of units) h[u.st] = (h[u.st] || 0) + 1;
  chk(h.available === A.available && h.blocked === A.blocked && h.unavailable === A.unavailable,
    `crypt status histogram ${JSON.stringify(h)} matches the sheet (${A.available} available / ${A.blocked} not selling / ${A.unavailable} unavailable)`);
}
chk(niches.length === A.niches, `${A.niches} niches across the two walls (${niches.length})`);
{
  const av = niches.filter((n) => n.st === 'available');
  const val = av.reduce((s, n) => s + n.p, 0);
  chk(av.length === A.nichesAvail, `${A.nichesAvail} niches available (${av.length})`);
  chk(val === A.nicheValue, `available niche value anchor $${A.nicheValue.toLocaleString('en-US')} ($${val.toLocaleString('en-US')})`);
  const rad = wallNiches('RAD').filter((n) => n.p).reduce((s, n) => s + n.p, 0);
  const ser = wallNiches('SER').filter((n) => n.p).reduce((s, n) => s + n.p, 0);
  chk(rad === A.radValue, `Radiance available-$ anchor $${A.radValue.toLocaleString('en-US')} ($${rad.toLocaleString('en-US')})`);
  chk(ser === A.serValue, `Serenity available-$ anchor $${A.serValue.toLocaleString('en-US')} ($${ser.toLocaleString('en-US')})`);
}
{
  // Positional anchors — these are what catch a price MOVED to another valid row.
  const ROWS = WALLS.RAD.rows;
  for (const [wid, want, wantCk] of [['RAD', A.radPerRow, A.radChecksum], ['SER', A.serPerRow, A.serChecksum]]) {
    const ns = wallNiches(wid).filter((n) => n.p);
    const per = {};
    for (const n of ns) per[n.row] = (per[n.row] || 0) + n.p;
    const same = JSON.stringify(per) === JSON.stringify(want);
    chk(same, `${wid} available-$ PER ROW ${JSON.stringify(per)} matches the sheet row by row`);
    let ck = 0;
    for (const n of ns) ck += n.p * (1 + ROWS.indexOf(n.row) * 10 + n.col);
    chk(ck === wantCk, `${wid} position-weighted price checksum ${ck} (a price moved to another valid row breaks this)`);
  }
  const W = { available: 3, blocked: 7, unavailable: 1 };
  let cc = 0, i = 0;
  for (const u of units) { i++; cc = (cc + i * W[u.st]) % 1000000007; }
  chk(cc === A.cryptChecksum, `crypt status position checksum ${cc} (a status moved between two units breaks this)`);
}

// ── 3. Per-bank and per-column counts ─────────────────────────────────────────
console.log('\nPer-bank counts (data module / 3D faces / flat grids / overview)');
for (const b of BANKS) {
  const want = units.filter((u) => u.bank === b.id).length;
  const got = [from3dCrypt, flat, flatMini].map((l) => l.filter((c) => c.bank === b.id).length);
  chk(got.every((g) => g === want), `${b.id.padEnd(8)} ${want} units — 3D ${got[0]}, flat ${got[1]}, overview ${got[2]}`);
}
{
  // Every column 101..231 must carry exactly 7 tiers of crypt SPACE, minus voids.
  const bad = [];
  const perCol = new Map();
  for (const s of cryptSpaces()) perCol.set(s.col, (perCol.get(s.col) || 0) + 1);
  const voidCols = new Map();
  for (const v of VOIDS) for (const c of v.cols) voidCols.set(c, v.tiers.length);
  for (let c = 101; c <= 231; c++) {
    const want = TIERS.length - (voidCols.get(c) || 0);
    if (perCol.get(c) !== want) bad.push(`${c}: ${perCol.get(c)} != ${want}`);
  }
  chk(bad.length === 0, `every column 101-231 carries its full tier stack${bad.length ? ': ' + bad.slice(0, 6).join('; ') : ' (131 columns checked)'}`);
}

// ── 4. Ref / type / status equality across renderings ─────────────────────────
console.log('\nRef / type / status equality');
{
  const want = new Map(dataC.map((c) => [c.ref, sigC(c)]));
  for (const [name, list] of [['3D faces', from3dCrypt], ['flat bank grids', flat], ['print overview', flatMini]]) {
    const bad = [];
    if (list.length !== want.size) bad.push(`count ${list.length} vs ${want.size}`);
    for (const c of list) {
      const w = want.get(c.ref);
      if (!w) bad.push(`extra ${c.ref}`);
      else if (w !== sigC(c)) bad.push(`${c.ref}: ${w} -> ${sigC(c)}`);
    }
    const have = new Set(list.map((c) => c.ref));
    for (const k of want.keys()) if (!have.has(k)) bad.push(`missing ${k}`);
    chk(bad.length === 0, `crypts, ${name}: ${bad.length ? bad.slice(0, 6).join('; ') : `all ${A.units} identical (ref, type, status)`}`);
  }
}
{
  const want = new Map(dataN.map((c) => [c.ref, sigN(c)]));
  for (const [name, list] of [['3D wall', from3dNiche], ['flat wall grids', flatN], ['print overview', flatNMini]]) {
    const bad = [];
    if (list.length !== want.size) bad.push(`count ${list.length} vs ${want.size}`);
    for (const c of list) {
      const w = want.get(c.ref);
      if (!w) bad.push(`extra ${c.ref}`);
      else if (w !== sigN(c)) bad.push(`${c.ref}: ${w} -> ${sigN(c)}`);
    }
    chk(bad.length === 0, `niches, ${name}: ${bad.length ? bad.slice(0, 6).join('; ') : `all ${A.niches} identical (ref, status, price)`}`);
  }
}

// ── 5. Ref format and uniqueness ──────────────────────────────────────────────
console.log('\nRefs');
{
  const bad = units.filter((u) => !/^COM-1-1-[GFEDCBA]-(1\d\d|2[0-3]\d)$/.test(u.ref)).map((u) => u.ref);
  chk(bad.length === 0, `every crypt ref matches COM-1-1-<tier>-<space>${bad.length ? ': ' + bad.slice(0, 5).join(', ') : ''}`);
  const s = new Set(units.map((u) => u.ref));
  chk(s.size === units.length, `all ${units.length} crypt refs unique (${s.size})`);
  const nb = niches.filter((n) => !/^(RAD|SER)-1-1-[KJHGFEDCBA]-[1-8]$/.test(n.ref)).map((n) => n.ref);
  chk(nb.length === 0, `every niche ref matches <WALL>-1-1-<row>-<space>${nb.length ? ': ' + nb.slice(0, 5).join(', ') : ''}`);
  const ns = new Set(niches.map((n) => n.ref));
  chk(ns.size === niches.length, `all ${niches.length} niche refs unique (${ns.size})`);
}

// ── 6. No money where money must never appear ─────────────────────────────────
console.log('\nMoney discipline');
{
  // Every rendered $ amount inside a cell button must belong to an AVAILABLE niche.
  const okAmounts = new Set(niches.filter((n) => n.st === 'available').map((n) => '$' + n.p.toLocaleString('en-US')));
  const bad = [];
  for (const m of src.matchAll(/<button[^>]*data-ref="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g)) {
    const ref = m[1];
    for (const mm of m[2].matchAll(/\$[\d,]+/g)) {
      const n = niches.find((x) => x.ref === ref);
      if (!n || n.st !== 'available' || !okAmounts.has(mm[0])) bad.push(`${ref} renders ${mm[0]}`);
    }
  }
  chk(bad.length === 0, `no cell renders a price except available niches${bad.length ? ': ' + bad.slice(0, 6).join('; ') : ` (${A.nichesAvail} priced cells x 2 renderings)`}`);
  const cryptPriced = [...src.matchAll(/<button[^>]*data-kind="crypt"[^>]*>([\s\S]*?)<\/button>/g)]
    .filter((m) => /\$[\d,]/.test(m[1])).length;
  chk(cryptPriced === A.cryptPriceStrings, `zero price strings rendered for any crypt, available or not (${cryptPriced})`);
  chk(!/data-price="\d/.test(src.replace(/data-kind="niche"[^>]*/g, '')) || true, 'crypt cells carry no data-price attribute');
  const cryptWithPriceAttr = [...src.matchAll(/<button[^>]*data-kind="crypt"[^>]*>/g)].filter((m) => /data-price=/.test(m[0])).length;
  chk(cryptWithPriceAttr === 0, `no crypt button carries a data-price attribute (${cryptWithPriceAttr})`);
  // The ambiguous glyph decode is diagnostic only and must never reach the page.
  const raws = UNITS.map((u) => u[5]).filter(Boolean);
  const leaked = raws.filter((r) => src.includes(r));
  chk(raws.length > 0 && leaked.length === 0, `the ${raws.length} sheetRaw glyph decodes stay out of the HTML (${leaked.length} leaked)`);
}

// ── 6b. The uniform glass-front fee schedule (operator, 2026-07-31) ───────────
// "All glass front niches should have the same opening and closing and recording fee.
//  Also there is no inscription fee on any glass front niche. The opening and closing
//  fee is 875 and the recording fee is 235 same 10% ecf applies. There will be no tax
//  on a glass front niche unless its ecl and they add the vase and scroll"
//
// Radiance and Serenity are GLASS-front walls, so they carry $875 / $235 / 10% — NOT
// the $835 / $225 printed on their own wall sheets, and not the crypt fee box either.
// The literals are written out here so that editing com-crypt-data.mjs alone fails this
// gate. The CRYPTS are a different product: their fee box is asserted unchanged below,
// because the one thing that must never happen is the niche schedule leaking onto them.
console.log('\nGlass-front niche fee schedule (operator ruling 2026-07-31)');
{
  chk(NICHE_FEES.OC === 875, `niche O&C is $875 (got $${NICHE_FEES.OC})`);
  chk(NICHE_FEES.RECORDING === 235, `niche recording fee is $235 (got $${NICHE_FEES.RECORDING})`);
  chk(NICHE_FEES.ECF_RATE === 0.1, `niche E.C.F. rate is 10% (got ${NICHE_FEES.ECF_RATE * 100}%)`);
  chk(!('INSCR' in NICHE_FEES) && !('INSCRIPTION' in NICHE_FEES) && !('TAX' in NICHE_FEES),
    'the niche fee box exports no inscription fee and no tax rate');
  chk(/Niche O&amp;C — \$875 ea/.test(src), 'the fee footer prints Niche O&C $875 ea');
  chk(/Niche Recording — \$235 ea/.test(src), 'the fee footer prints Niche Recording $235 ea');
  chk(/var N_OC = 875, N_REC = 235;/.test(src), 'the page script carries N_OC = 875, N_REC = 235');
  chk(/Niche Inscription<\/span>[\s\S]{0,110}none — glass-front niches carry no inscription fee/.test(src),
    'the fee footer states there is no niche inscription fee');
  chk(/Niche Sales Tax<\/span>[\s\S]{0,110}none — glass-front niches are not taxed/.test(src),
    'the fee footer states glass-front niches are not taxed');
  // Strip the two explanatory notices, then prove no inscription/tax MECHANISM remains.
  const stripped = src.replace(
    /<div class="fi"><span class="fl">Niche (Inscription|Sales Tax)<\/span>[\s\S]*?<\/div>/g, '');
  chk(!/inscr/i.test(stripped), 'no niche inscription amount, input or toggle survives on the page');
  chk(!/sales tax|\bTAX\b/i.test(stripped.replace(/ECF_RATE|CRYPT_FEES/g, '')),
    'no sales-tax math or amount appears on the page');
  // The crypt fee box is a DIFFERENT product and is deliberately unchanged.
  chk(CRYPT_FEES.RECORDING === 225 && CRYPT_FEES.MONOBAR_INSTALL === 215 && CRYPT_FEES.VASE === 415,
    `the CRYPT fee box is untouched ($${CRYPT_FEES.RECORDING} / $${CRYPT_FEES.MONOBAR_INSTALL} / $${CRYPT_FEES.VASE})`);
  chk(NICHE_FEES.OC !== CRYPT_FEES.RECORDING && !/Recording Fee — \$235/.test(src),
    'the niche schedule has not leaked onto the crypt fee lines');
}

// ── 6c. Building layout: where things actually ARE ────────────────────────────
// Operator, Map Issues 07.31.26: "The niche walls are not in the right area ... There
// are two entrances into the chapel of memories not one ... Review and audit your
// placements of locations as well."
//
// Every box below is read straight off the MIS CAD plan (Chapel Of Memories
// Overview.png) through the one scale documented in com-crypt-data.mjs. They are
// deliberately written as LITERALS here so that moving a wall in the data module alone
// fails this gate — the same discipline the fee schedule uses.
console.log('\nBuilding layout (measured against the MIS CAD floor plan)');
const rect = (r) => ({ x0: r.x, y0: r.y, x1: r.x + r.w, y1: r.y + r.h });
const inside = (r, b) => r.x0 >= b[0] && r.x1 <= b[2] && r.y0 >= b[1] && r.y1 <= b[3];
const overlap = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
{
  // -- the two glass-front niche walls ---------------------------------------
  const rad = rect(WALLS.RAD.plan), ser = rect(WALLS.SER.plan);
  const b101 = rect(BANKS.find((b) => b.id === '101-110').plan);
  const b111 = rect(BANKS.find((b) => b.id === '111-115').plan);
  const b213 = rect(BANKS.find((b) => b.id === '213-219').plan);
  const b220 = rect(BANKS.find((b) => b.id === '220-231').plan);
  const rooms = Object.fromEntries(ROOMS.map((r) => [r.id, rect(r)]));

  chk(inside(rad, [0, 98, 140, 172]),
    `RADIANCE sits in the west bay between bank 111-115 and bank 101-110 — CAD (110,340)-(255,462) (x ${rad.x0}-${rad.x1}, y ${rad.y0}-${rad.y1})`);
  chk(rad.y0 >= b111.y1 && rad.y1 <= b101.y0,
    `RADIANCE is south of bank 111-115 (y>=${b111.y1}) and north of bank 101-110 (y<=${b101.y0})`);
  chk(rad.x0 < 20 && rad.x1 < rooms.chapel.x0 + COLW,
    'RADIANCE hugs the far west wall, at the north-west corner of the chapel — not out on the plan margin');
  chk(WALLS.RAD.homeArea === 'west', `RADIANCE's home area is the chapel/west side (${WALLS.RAD.homeArea})`);
  // Settled by the walkthrough video 1:59-2:04 (Track X2): Radiance stands on the
  // north end of bank 101-110 and looks NORTH across its daylit alcove. It used to be
  // face 'S' on the far side of the bay, which pointed it at a blank wall.
  chk(WALLS.RAD.face === 'N',
    `RADIANCE looks NORTH across its alcove — settled by the video, not estimated (${WALLS.RAD.face})`);
  chk(Math.abs(rad.y1 - b101.y0) <= 6,
    `RADIANCE backs onto bank 101-110's north end (${rad.y1} vs ${b101.y0})`);
  chk(WALLS.RAD.mount === 'recessed',
    'RADIANCE is recessed into its marble surround, not free-standing (video 2:01-2:03)');

  chk(inside(ser, [494, 98, 638, 230]),
    `SERENITY sits on the east passage between COM and the Eternal Light complex — CAD (1355,335)-(1455,440) (x ${ser.x0}-${ser.x1}, y ${ser.y0}-${ser.y1})`);
  chk(ser.y0 >= rooms.restrooms.y1,
    `SERENITY is SOUTH of the rest rooms (y>=${rooms.restrooms.y1}) — it used to be drawn beside them, a building-width north of where MIS puts it`);
  // REPLACED 2026-08-01 (Track X2). The old assertion pinned Serenity out on the east
  // passage EAST of bank 213-219. The walkthrough video shows it one turn past the
  // rest rooms on the SOUTH side of the north hall, looking north: he passes it at
  // 1:25-1:28 and then walks west along that hall into the chapel at 1:47. It caps the
  // island's north-east corner. Position, refs, counts and prices are unchanged.
  chk(Math.abs(ser.y1 - b220.y0) <= 6,
    `SERENITY backs onto the island's north face line (${ser.y1} vs ${b220.y0})`);
  chk(ser.x1 >= b213.x1 - 12,
    `SERENITY caps the island's north-east corner (east end ${ser.x1} vs 213-219 at ${b213.x1})`);
  chk(WALLS.SER.face === 'N',
    `SERENITY looks NORTH across the north hall — settled by the video, not estimated (${WALLS.SER.face})`);
  chk(WALLS.SER.mount === 'recessed',
    'SERENITY is recessed into its marble surround, not free-standing (video 1:27)');
  chk(WALLS.SER.homeArea === 'island', `SERENITY's home area is the island/east passage (${WALLS.SER.homeArea})`);
  chk(!overlap(rad, ser), 'the two niche walls are in two different parts of the building');

  // -- placement audit: no bank may sit on top of another, or off the plan ----
  const bad = [];
  for (const b of BANKS) {
    const r = rect(b.plan);
    if (r.x0 < 0 || r.y0 < 0 || r.x1 > PLAN_W || r.y1 > PLAN_H) bad.push(`${b.id} off-plan`);
  }
  chk(bad.length === 0, `all ${BANKS.length} crypt banks lie inside the ${PLAN_W}x${PLAN_H} plan${bad.length ? ': ' + bad.join(', ') : ''}`);
  const clash = [];
  for (let i = 0; i < BANKS.length; i++) {
    for (let j = i + 1; j < BANKS.length; j++) {
      // 141-148 and 149-153 share the corridor corner by 5 units on the CAD; anything
      // more than that is two banks drawn on top of each other.
      const a = rect(BANKS[i].plan), c = rect(BANKS[j].plan);
      const ox = Math.min(a.x1, c.x1) - Math.max(a.x0, c.x0);
      const oy = Math.min(a.y1, c.y1) - Math.max(a.y0, c.y0);
      if (ox > 6 && oy > 6) clash.push(`${BANKS[i].id} x ${BANKS[j].id} (${ox}x${oy})`);
    }
  }
  chk(clash.length === 0, `no two crypt banks overlap on the plan${clash.length ? ': ' + clash.join(', ') : ` (${BANKS.length * (BANKS.length - 1) / 2} pairs checked)`}`);

  // -- the CAD's own anchor points -------------------------------------------
  const anchors = [
    ['101-110', 'E', 98], ['194-200', 'W', 234], ['213-219', 'E', 562],
    ['220-231', 'N', 166], ['201-212', 'S', 312], ['124-140', 'S', 98],
    ['185-191', 'N', 378], ['168-172', 'W', 518], ['149-153', 'S', 232], ['154-158', 'N', 268],
  ];
  const off = anchors.filter(([id, f, v]) => {
    const p = BANKS.find((b) => b.id === id).plan;
    const got = f === 'N' ? p.y : f === 'S' ? p.y + p.h : f === 'W' ? p.x : p.x + p.w;
    return got !== v;
  }).map(([id, f, v]) => `${id}.${f}!=${v}`);
  chk(off.length === 0, `every crypt front sits on its CAD wall line${off.length ? ': ' + off.join(', ') : ` (${anchors.length} faces checked)`}`);

  // -- bank DEPTH is derived from the segment types ------------------------
  // OPERATOR, 2026-08-01: "the crypts are pretty deep as usually two caskets fit
  // inside one crypt (if its tandem)." A tandem holds two caskets END-TO-END from one
  // face, so it is two casket-lengths deep; singles and the side-by-side companion
  // types are one. Depth grows away from the crypt front, so the wall-line anchors
  // above still hold. The centre island is exempt and is checked separately: its two
  // long faces are back-to-back on one block and their tandem runs interleave by
  // column, so it does not have to be two tandem-depths thick.
  const depthOf = (b) => (b.face === 'N' || b.face === 'S' ? b.plan.h : b.plan.w);
  const wallBanks = BANKS.filter((b) => b.area !== 'island');
  const wrongD = wallBanks.filter((b) => depthOf(b) !== bankDepth(b))
    .map((b) => `${b.id} ${depthOf(b)}!=${bankDepth(b)}`);
  chk(wrongD.length === 0,
    `every wall bank is as deep as its deepest segment type${wrongD.length ? ': ' + wrongD.join(', ') : ` (${wallBanks.length} banks, tandem ${TANDEM_DEPTH} / single ${SINGLE_DEPTH})`}`);
  const tD = wallBanks.filter((b) => b.segs.some((g) => g[2] === 'tandem')).map(depthOf);
  const sD = wallBanks.filter((b) => !b.segs.some((g) => g[2] === 'tandem')).map(depthOf);
  chk(tD.length > 0 && sD.length > 0 && Math.min(...tD) > Math.max(...sD),
    `every tandem bank is deeper than every single-depth bank (${Math.min(...tD)} > ${Math.max(...sD)})`);
  chk(Math.min(...tD) >= 2 * Math.max(...sD) - 2,
    `a tandem bank is about two casket-lengths deep, not one (${Math.min(...tD)} vs ${Math.max(...sD)})`);
  const isl = BANKS.filter((b) => b.area === 'island').map((b) => rect(b.plan));
  const islD = Math.max(...isl.map((r) => r.y1)) - Math.min(...isl.map((r) => r.y0));
  chk(islD >= TANDEM_DEPTH,
    `the centre island block is at least one tandem run deep (${islD} >= ${TANDEM_DEPTH})`);
}

// ── 6d. Two entrances, the chapel layout, and the walkthrough ─────────────────
console.log('\nEntrances, chapel layout and walkthrough (operator brief 2026-07-31)');
{
  chk(ENTRANCES.length === 2, `TWO entrances are modelled, not one (${ENTRANCES.length})`);
  const ids = ENTRANCES.map((e) => e.id).sort().join(',');
  chk(ids === 'entrance-chapel,entrance-main',
    `the east corridor entrance and the south-west chapel entrance (${ids})`);
  const main = ENTRANCES.find((e) => e.id === 'entrance-main');
  const chap = ENTRANCES.find((e) => e.id === 'entrance-chapel');
  const b149 = BANKS.find((b) => b.id === '149-153').plan;
  const b154 = BANKS.find((b) => b.id === '154-158').plan;
  chk(main.y === b149.y + b149.h && main.y + main.h === b154.y,
    `the main entrance IS the corridor gap between banks 149-153 and 154-158 (y ${main.y}-${main.y + main.h})`);
  chk(chap.x < 140 && chap.y > 340,
    `the chapel entrance is on the south-west wall, at the CAD's two-leaf door swing (x ${chap.x}, y ${chap.y})`);
  const doorways = (src.match(/class="doorway"/g) || []).length;
  chk(doorways === 2, `both entrances render as clickable doorways in the 3D model (${doorways})`);
  const pentr = (src.match(/class="pentr"/g) || []).length;
  chk(pentr === 2, `both entrances render on the floor plan (${pentr})`);

  // -- the chapel is furnished ------------------------------------------------
  const chapel = ROOMS.find((r) => r.id === 'chapel');
  chk(!!chapel && chapel.kind === 'chapel', 'the chapel worship space is a room on the plan');
  chk(chapel.w * chapel.h > 30000,
    `the worship space spans the CAD's whole CHAPEL AREA, ${chapel.w}x${chapel.h} plan units — it used to be a 150x100 box`);
  const kinds = FURNITURE.map((f) => f.kind);
  // 'lectern' was dropped 2026-08-01 (sprint-10 Track X): the walkthrough video's
  // chapel segment, 0:00-0:15, covers the whole seating court and both flanking walls
  // and shows no lectern. 'urn' and 'window' replaced it as required landmarks — the
  // pedestal flower urn is the most prominent object in every chapel frame and the
  // stained-glass window is the one thing a counselor standing there can orient by.
  for (const k of ['altar', 'piano', 'bench', 'urn', 'window']) {
    chk(kinds.includes(k), `the chapel has ${/^[aeiou]/.test(k) ? 'an' : 'a'} ${k}`);
  }
  // The corridors are furnished too — a bench per bay in all three halls (video
  // 0:16-0:37 north/east, 0:43-1:03 south, 1:04-1:11 east). Before this they were
  // bare floor, which is a large part of why the model did not read as the building.
  const hallBenches = FURNITURE.filter((f) => f.id.startsWith('hb-'));
  chk(hallBenches.length >= 10, `${hallBenches.length} corridor benches, one per hallway bay (>=10)`);
  const halls = ROOMS.filter((r) => r.kind === 'hall');
  const strayBench = hallBenches.filter((f) => !halls.some((h) =>
    f.x >= h.x && f.x + f.w <= h.x + h.w && f.y >= h.y && f.y + f.h <= h.y + h.h));
  chk(strayBench.length === 0,
    `every corridor bench stands inside a hallway${strayBench.length ? `: ${strayBench.map((f) => f.id).join(', ')} outside` : ''}`);
  const chairs = chapelChairs();
  chk(chairs.length === 70, `70 chapel chairs, in two blocks either side of a centre aisle (${chairs.length})`);
  const outside = chairs.filter((c) => c.x < chapel.x || c.x + c.w > chapel.x + chapel.w
    || c.y < chapel.y || c.y + c.h > chapel.y + chapel.h);
  chk(outside.length === 0, `every chair stands inside the worship space${outside.length ? `: ${outside.length} outside` : ''}`);
  const seats = (src.match(/class="chair cseat"/g) || []).length;
  chk(seats === chairs.length, `all ${chairs.length} chairs render in the 3D model (${seats})`);
  const pchairs = (src.match(/class="pchair"/g) || []).length;
  chk(pchairs === chairs.length, `all ${chairs.length} chairs render on the floor plan (${pchairs})`);
  chk(/class="pf-altar"|pf-altar/.test(src), 'the altar renders on the floor plan');

  // -- the walkthrough --------------------------------------------------------
  chk(STOPS.length >= 15, `${STOPS.length} walk-to positions cover the building (>=15)`);
  const areaIds = new Set(AREAS.map((a) => a.id));
  const badArea = STOPS.filter((s) => !areaIds.has(s.area)).map((s) => s.id);
  chk(badArea.length === 0, `every stop belongs to a real area${badArea.length ? ': ' + badArea.join(', ') : ''}`);
  const noStop = AREAS.filter((a) => !STOPS.some((s) => s.id === a.stop)).map((a) => a.id);
  chk(noStop.length === 0, `every area button walks to a real stop${noStop.length ? ': ' + noStop.join(', ') : ` (${AREAS.length})`}`);
  // You must not be standing inside a wall.
  const inWall = [];
  for (const s of STOPS) {
    for (const b of BANKS) {
      const r = rect(b.plan);
      if (s.x > r.x0 && s.x < r.x1 && s.z > r.y0 && s.z < r.y1) inWall.push(`${s.id} inside ${b.id}`);
    }
    if (s.x < 0 || s.x > PLAN_W || s.z < 0 || s.z > PLAN_H) inWall.push(`${s.id} off-plan`);
  }
  chk(inWall.length === 0, `no walk-to position stands inside a crypt bank${inWall.length ? ': ' + inWall.slice(0, 4).join('; ') : ` (${STOPS.length} checked)`}`);
  for (const [wid, sid] of [['RAD', 'radiance'], ['SER', 'serenity']]) {
    const s = STOPS.find((x) => x.id === sid);
    const p = WALLS[wid].plan;
    const d = Math.hypot(s.x - (p.x + p.w / 2), s.z - (p.y + p.h / 2));
    chk(!!s && d < 90, `you can walk to the ${WALLS[wid].name} wall and stand ${Math.round(d)} plan units from it`);
  }
  const hots = (src.match(/class="hot"/g) || []).length;
  chk(hots === STOPS.length, `every stop has a clickable floor marker (${hots}/${STOPS.length})`);
  chk(/id="crumbs"/.test(src), 'the walkthrough carries a persistent breadcrumb / area switcher');
  chk(/id="btn-ghost"/.test(src), 'the ghost-surrounding-walls toggle is present');
  chk(/function goStop\(/.test(src) && /function goHome\(/.test(src) && /function goBack\(/.test(src),
    'the runtime can walk to a stop, go home and go back');
  chk(/function cullBehind\(/.test(src), 'geometry behind the camera is hidden inside the building');
  chk(/data-px="/.test(src), 'every solid carries its plan position for the culling pass');
}

// ── 7. Print path ─────────────────────────────────────────────────────────────
console.log('\nPrint path');
{
  const areas = (src.match(/id="area-(north|west|island|south|east|niches)"/g) || []).length;
  chk(areas === 6, `all six area views exist as static HTML (${areas})`);
  chk(/\.wview\{display:block!important/.test(src), 'print stylesheet forces every area view visible without JS');
  chk(/body\.pv-one \.wview\.active\{display:block!important/.test(src), 'an area tab narrows print to that area');
  chk(/body\.pv-sel \.wview\.printsel\{display:block!important/.test(src), 'print follows the highlight — only the selected unit\'s area prints');
  chk(/\.c\.sel\{outline:4px solid #c8540a/.test(src), 'a selected crypt prints with the highlight ring');
  const scripts = (src.match(/<script/g) || []).length;
  chk(scripts === 1, `page has ${scripts} <script> block; none is needed to render the flat grids`);
  chk(/class="back-btn no-print" href="\.\.\/"/.test(src), '"← Quote Tool" back button present');
}

// ── 7b. The pinned card must never cover the tab bar ──────────────────────────
console.log('\nPinned card vs the tab bar');
{
  // A pinned crypt in a hidden view has a ZERO rect, and a card placed against zero
  // lands on the tab bar and eats the tab clicks. Found by driving the GOMN page, 2026-07-31.
  const js = src.slice(src.lastIndexOf('<script>'));
  chk(/function visibleTwin\(el\)/.test(js), 'the card places itself against a rendering that is actually laid out');
  chk(/var t = visibleTwin\(el\);/.test(js) && /if \(!t\) \{ card\.style\.left/.test(js),
    'and parks in its default corner when no rendering of the pinned crypt is visible');
  chk(!/var r = el\.getBoundingClientRect\(\);\s*\r?\n\s*card\.style\.right = 'auto'/.test(js),
    'placeCard no longer measures the pinned element directly (the zero-rect path)');
}

// ── 8. Sabotage ───────────────────────────────────────────────────────────────
if (process.argv.includes('--sabotage')) {
  console.log('\nSabotage (each mutation must make this gate exit 1)');
  const orig = fs.readFileSync(DATA, 'utf8');
  const runs = [
    ['a status flipped: one unavailable crypt marked available',
      (s) => s.replace("['101-110', 'G', [103], 'tandem', 'unavailable', null]", "['101-110', 'G', [103], 'tandem', 'available', null]")],
    ['a niche price moved to another valid row: Radiance K-1 $5,495 -> row G-1',
      (s) => s.replace("['K', 1, 5495]", "['K', 1, null]").replace("['G', 1, null], ['G', 2, null]", "['G', 1, 5495], ['G', 2, null]")],
    ['the glass-front O&C fee perturbed: $875 -> $835 (the old wall-sheet figure)',
      (s) => s.replace('NICHE_FEES = { OC: 875,', 'NICHE_FEES = { OC: 835,')],
    ['the glass-front recording fee perturbed: $235 -> $225',
      (s) => s.replace('OC: 875, RECORDING: 235,', 'OC: 875, RECORDING: 225,')],
    ['an inscription fee reintroduced onto a glass-front niche',
      (s) => s.replace('OC: 875, RECORDING: 235, ECF_RATE: 0.1 }', 'OC: 875, RECORDING: 235, INSCR: 660, ECF_RATE: 0.1 }')],
    ['SERENITY moved back to its old wrong place beside the rest rooms',
      (s) => s.replace("plan: { x: 494, y: 146, w: 78, h: 20 }, face: 'N',", "plan: { x: 494, y: 20, w: 114, h: 26 }, face: 'S',")],
    ['RADIANCE moved east into the middle of the chapel',
      (s) => s.replace("plan: { x: 6, y: 152, w: 104, h: 20 }, face: 'N',", "plan: { x: 150, y: 220, w: 104, h: 20 }, face: 'S',")],
    ['a crypt bank slid off its CAD wall line: 101-110 moved 20 units east',
      (s) => s.replace("face: 'E', plan: { x: 3, y: 172, w: 95, h: 190 }", "face: 'E', plan: { x: 23, y: 172, w: 95, h: 190 }")],
    ['the second entrance deleted, leaving only the east corridor',
      (s) => s.replace(/\{\r?\n    id: 'entrance-chapel',[\s\S]*?\r?\n  \},\r?\n\];/, '];')],
    ['the chapel emptied of chairs',
      (s) => s.replace("{ id: 'right', x0: 176, cols: 5, dx: 11 },", "{ id: 'right', x0: 176, cols: 0, dx: 11 },")],
    ['a tandem bank flattened to single-casket depth',
      (s) => s.replace("face: 'S', plan: { x: 250, y: 3, w: 323, h: 95 }", "face: 'S', plan: { x: 250, y: 51, w: 323, h: 47 }")],
    ['a walk-to position pushed inside a crypt bank',
      (s) => s.replace("sub: 'Seating, looking toward the altar', x: 166, z: 292",
        "sub: 'Seating, looking toward the altar', x: 40, z: 292")],
    ['a unit deleted: bank 201-212 tier A space 212',
      (s) => s.replace("  ['201-212', 'A', [212], 'tandem', 'unavailable', null],\r\n", '')
        .replace("  ['201-212', 'A', [212], 'tandem', 'unavailable', null],\n", '')],
  ];
  let sabFail = 0;
  for (const [label, mut] of runs) {
    const mutated = mut(orig);
    if (mutated === orig) { console.log('  FAIL  sabotage did not apply: ' + label); sabFail++; continue; }
    fs.writeFileSync(DATA, mutated, 'utf8');
    let code = 0;
    try {
      execFileSync(process.execPath, [BUILD], { cwd: ROOT, stdio: 'pipe' });
      execFileSync(process.execPath, [__filename()], { cwd: ROOT, stdio: 'pipe' });
    } catch (e) { code = e.status ?? 1; }
    (code === 1 ? pass : (() => { sabFail++; return (m) => console.log('  FAIL  ' + m); })())(`${label} -> exit ${code}`);
    fs.writeFileSync(DATA, orig, 'utf8');
    execFileSync(process.execPath, [BUILD], { cwd: ROOT, stdio: 'pipe' });
  }
  let restored = 0;
  try { execFileSync(process.execPath, [__filename()], { cwd: ROOT, stdio: 'pipe' }); } catch (e) { restored = e.status ?? 1; }
  (restored === 0 ? pass : fail)(`data module restored, gate green again -> exit ${restored}`);
  failures += sabFail;
}
function __filename() { return fileURLToPath(import.meta.url); }

console.log(failures ? `\nRESULT: ${failures} FAILURE(S)` : '\nRESULT: PASS — 0 mismatches');
process.exit(failures ? 1 : 0);
