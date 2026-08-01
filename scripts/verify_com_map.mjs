/**
 * Gate for the Chapel of Memory Mausoleum map.
 *
 * Proves MAPS/COM_CryptMap.html carries EXACTLY the dataset in
 * scripts/com-crypt-data.mjs — same refs, same types, same statuses, same counts per
 * bank AND per column — that its three renderings (3D faces, flat per-bank grids,
 * print overview) agree with each other, that the build is deterministic, and that
 * NO money string is rendered for anything that is not an available, PRICED unit.
 *
 * Sabotage-proven: `node scripts/verify_com_map.mjs --sabotage` mutates the data module
 * once per run — an occupied / reserved / unlisted crypt flipped to available, two
 * statuses swapped between positions, a re-parse that drops rows, a niche price moved
 * to another valid row, a bank moved off its CAD line, a unit deleted — and asserts the
 * gate fails on each and passes again once restored.
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
  NICHE_FEES, CRYPT_FEES, MIS, STATUS_LABEL, PRICES, PRICE_BANDS, priceBand,
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
  // ── MIS-BACKED STATUS ANCHORS, replaced 2026-08-01 ──────────────────────────
  // Old (sheet of 2026-07-29):  available 51 / blocked 18 / unavailable 716,
  //                             cryptChecksum 374857 on weights {a:3,b:7,u:1}.
  // New: every crypt status comes from the MIS Lot Inquiry List printed 8/1/2026,
  // so `unavailable` splits into occupied / reserved / unlisted and 328 units MIS
  // itself calls Available stop being hidden. Derived from the PARSE, not from the
  // built page. Every non-status anchor in this file is byte-identical to before.
  available: 379,
  occupied: 229,
  reserved: 156,
  blocked: 3,
  unlisted: 18,
  // The data module stores status per UNIT, so a two-column companion crypt gives both
  // its spaces the more-committed of the two MIS rows. 17 companion units hold one
  // occupied space and one reserved space, which is why this differs from MIS.spaceStatus
  // by exactly 17 in those two buckets and by zero everywhere else.
  spaceHist: { available: 430, occupied: 261, reserved: 181, blocked: 3, unlisted: 18 },
  niches: 122,
  nichesAvail: 27,
  nicheValue: 233075,   // Radiance $156,115 + Serenity $76,960
  radValue: 156115,
  serValue: 76960,
  // ── CRYPT PRICE ANCHORS, new 2026-08-01 ────────────────────────────────────
  // Old: `cryptPriceStrings: 0` — no crypt rendered a dollar amount anywhere, because
  // the only price source was the 4px sheet. New: crypt prices come from the MIS
  // crypt-price export of 8/1/2026 and 377 of the 379 available units carry one.
  // EVERY figure below is derived from the CSV parse, not from the built page.
  priced: 377,           // available units MIS priced
  unpricedAvail: 2,      // COM-1-1-E-166 (MIS price 0), COM-1-1-A-183 (half-dollar split)
  distinctPrices: 29,
  availValue: 9111510,   // sum of the 377 unit prices
  // A plain total is blind to a price that MOVES between two units, and a multiset is
  // blind to a swap as well. sumSquares pins the multiset (any price changed to another
  // valid price breaks it) and priceChecksum pins POSITION: price x tierIndex x space.
  priceSumSquares: 257585486000,
  priceChecksum: 5166450550,
  bankValue: {
    '101-110': 1114820, '111-115': 577900, '116-123': 1109790, '124-140': 1338670,
    '141-148': 426895, '149-153': 169840, '154-158': 93965, '159-167': 161950,
    '168-172': 14995, '173-178': 532875, '179-184': 233930, '185-191': 1195795,
    '192-193': 173960, '194-200': 459915, '201-212': 725310, '213-219': 252835,
    '220-231': 528065,
  },
  // 377 priced units x the TWO renderings that show text: the 3D face and the flat
  // per-bank grid. The print-overview minis are label-only (they carry no badge either),
  // so they show no figure — but they DO carry the data-price attribute, hence two anchors.
  cryptPriceCells: 754,
  cryptPriceAttrs: 1131,   // 377 x 3 renderings
  // POSITIONAL anchors. A plain total is blind to a price that MOVES to another
  // valid row, so each available-$ figure is also pinned per row and by a
  // position-weighted checksum.
  radPerRow: { K: 41770, J: 47275, H: 67070 },
  serPerRow: { K: 6590, J: 14295, H: 29685, G: 16495, A: 9895 },
  radChecksum: 2596925,
  serChecksum: 2400750,
  cryptChecksum: 2439477,
};
// Position weights for the crypt status checksum. Five distinct values so that ANY
// swap between two statuses at two positions changes the sum.
const CW = { available: 3, unlisted: 5, blocked: 7, reserved: 11, occupied: 13 };

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
  chk(h.available === A.available && h.occupied === A.occupied && h.reserved === A.reserved
    && h.blocked === A.blocked && h.unlisted === A.unlisted && !h.unavailable,
    `crypt status histogram ${JSON.stringify(h)} matches the MIS list (${A.available} available / ${A.reserved} reserved / ${A.occupied} occupied / ${A.blocked} not selling / ${A.unlisted} unlisted)`);
  const sh = {};
  for (const s of cryptSpaces()) sh[s.st] = (sh[s.st] || 0) + 1;
  chk(JSON.stringify(Object.keys(A.spaceHist).sort().map((k) => [k, sh[k]]))
    === JSON.stringify(Object.keys(A.spaceHist).sort().map((k) => [k, A.spaceHist[k]])),
    `crypt SPACE status histogram ${JSON.stringify(sh)} matches the MIS list space by space`);
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
  let cc = 0, i = 0;
  for (const u of units) { i++; cc = (cc + i * CW[u.st]) % 1000000007; }
  chk(cc === A.cryptChecksum, `crypt status position checksum ${cc} (a status moved between two units breaks this)`);
}

// ── 2b. The MIS list's own arithmetic ─────────────────────────────────────────
// The source is E:\Downloads — local-only and full of real customer names, so it can
// never be committed and this gate can never re-read it. What CAN be pinned is the
// arithmetic the parse has to satisfy, written out as literals so a re-parse that
// silently drops rows (the CSV export of the same list is famously malformed) cannot
// be landed without these numbers moving too:
//     printed Results (1355) - depth rows (480) == spaces MIS covers (875)
//     spaces MIS covers      == every crypt space (893) - the unlisted 18
//     the per-space histogram of MIS-derived statuses sums to the same 875
console.log('\nMIS lot inquiry list arithmetic (printed ' + MIS.printed + ')');
{
  chk(MIS.resultRows === 1355 && MIS.criteria === 'Location = WMP, Section = COM',
    `the list printed "Results: ${MIS.resultRows}" for ${MIS.criteria}`);
  chk(MIS.resultRows - MIS.depthRows === MIS.spaces,
    `${MIS.resultRows} rows less ${MIS.depthRows} extra depth rows ((B), (2nd), (3rd)) = ${MIS.spaces} distinct crypt spaces (${MIS.resultRows - MIS.depthRows})`);
  const spaces = cryptSpaces();
  const unlisted = spaces.filter((s) => s.st === 'unlisted').length;
  chk(spaces.length - unlisted === MIS.spaces,
    `the ${spaces.length} crypt spaces less the ${unlisted} the list does not carry = ${MIS.spaces} (${spaces.length - unlisted})`);
  const sum = Object.values(MIS.spaceStatus).reduce((a, b) => a + b, 0);
  chk(sum === MIS.spaces, `the per-space MIS status counts sum to ${MIS.spaces} (${sum})`);
  // A companion crypt is ONE purchasable unit, so its two spaces take one status: the
  // more committed of the two MIS rows. That, and only that, is why the rendered
  // per-space counts differ from the parse — by exactly MIS.mergedSpaces, one way.
  const live = {};
  for (const s of spaces) if (s.st !== 'unlisted') live[s.st] = (live[s.st] || 0) + 1;
  chk(live.available === MIS.spaceStatus.available && live.blocked === MIS.spaceStatus.blocked
    && live.occupied === MIS.spaceStatus.occupied + MIS.mergedSpaces
    && live.reserved === MIS.spaceStatus.reserved - MIS.mergedSpaces,
    `the ${MIS.spaces} listed spaces render as ${JSON.stringify(live)} — the parse ${JSON.stringify(MIS.spaceStatus)} plus the ${MIS.mergedSpaces} reserved halves of a companion crypt whose other half is occupied`);
  const merged = units.filter((u) => u.cols.length > 1 && u.st === 'occupied').length;
  chk(merged >= MIS.mergedSpaces,
    `at least ${MIS.mergedSpaces} occupied units are two-column companions (${merged})`);
  chk(Object.values(MIS.blockedCodes).reduce((a, b) => a + b, 0) === MIS.spaceStatus.blocked,
    `the two ST codes that collapse into "not selling" ${JSON.stringify(MIS.blockedCodes)} sum to ${MIS.spaceStatus.blocked}`);
  chk(unlisted === A.unlisted && units.filter((u) => u.st === 'unlisted').length === A.unlisted,
    `all ${A.unlisted} unlisted crypts are single-column units above the two EMPTY-AREA voids (${unlisted})`);
  const stray = units.filter((u) => u.st === 'unlisted')
    .filter((u) => !['E', 'F', 'G'].includes(u.tier) || u.cols.some((c) => c < 138 || c > 143))
    .map((u) => u.ref);
  chk(stray.length === 0,
    `every unlisted crypt is tier E/F/G of columns 138-143${stray.length ? ': ' + stray.join(', ') : ''}`);
  // The fail-safe the whole pass exists to enforce.
  const sellableWithInterment = units.filter((u) => u.st === 'available'
    && cryptSpaces().some((s) => u.cols.includes(s.col) && s.tier === u.tier && s.st !== 'available'));
  chk(sellableWithInterment.length === 0,
    `no unit is marked available while one of its spaces is occupied, reserved or withheld${sellableWithInterment.length ? ': ' + sellableWithInterment.slice(0, 5).map((u) => u.ref).join(', ') : ''}`);
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

// ── 6. Money: shown where it must be, absent where it must never be ──────────
console.log('\nMoney discipline');
{
  // The ONE rule: a rendered $ amount inside a cell button belongs to an available
  // niche or an available, MIS-priced crypt, and equals that unit's exact price.
  const ok = new Map();
  for (const n of niches) if (n.st === 'available') ok.set(n.ref, '$' + n.p.toLocaleString('en-US'));
  for (const u of units) if (u.st === 'available' && u.p != null) ok.set(u.ref, '$' + u.p.toLocaleString('en-US'));
  const bad = [];
  for (const m of src.matchAll(/<button[^>]*data-ref="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g)) {
    const ref = m[1];
    for (const mm of m[2].matchAll(/\$[\d,]+/g)) {
      if (ok.get(ref) !== mm[0]) bad.push(`${ref} renders ${mm[0]} (expected ${ok.get(ref) || 'nothing'})`);
    }
  }
  chk(bad.length === 0, `every rendered cell price is the exact price of a sellable unit${bad.length ? ': ' + bad.slice(0, 6).join('; ') : ` (${A.priced} crypts + ${A.nichesAvail} niches)`}`);

  // Crypt price CELLS: present in the right number, and never on an unsellable unit.
  const cryptCells = [...src.matchAll(/<button[^>]*data-kind="crypt"[^>]*>([\s\S]*?)<\/button>/g)];
  const cryptPricedCells = cryptCells.filter((m) => /\$[\d,]/.test(m[1])).length;
  chk(cryptPricedCells === A.cryptPriceCells,
    `${cryptPricedCells} crypt cells render a price (expected ${A.cryptPriceCells} = ${A.priced} priced units x 2 text renderings)`);
  const moneyOnUnsellable = cryptCells.filter((m) => !/data-st="available"/.test(m[0]) && /\$[\d,]/.test(m[1])).length;
  chk(moneyOnUnsellable === 0, `no unsellable crypt renders money (${moneyOnUnsellable})`);

  // data-price is the card's only channel. It must exist for exactly the priced units,
  // must never exist on an unsellable one, and must carry the raw figure.
  const withAttr = [...src.matchAll(/<button[^>]*data-kind="crypt"[^>]*>/g)].filter((m) => /data-price=/.test(m[0]));
  chk(withAttr.length === A.cryptPriceAttrs, `${withAttr.length} crypt buttons carry data-price (expected ${A.cryptPriceAttrs})`);
  const attrBad = withAttr.filter((m) => !/data-st="available"/.test(m[0])).length;
  chk(attrBad === 0, `no unsellable crypt button carries a data-price attribute (${attrBad})`);
  const attrMismatch = withAttr.filter((m) => {
    const ref = /data-ref="([^"]+)"/.exec(m[0])[1];
    const p = /data-price="([^"]*)"/.exec(m[0])[1];
    const u = units.find((x) => x.ref === ref);
    return !u || String(u.p) !== p;
  }).length;
  chk(attrMismatch === 0, `every data-price equals the data module's unit price (${attrMismatch} mismatches)`);

  // Nothing is rounded: every rendered crypt amount is a price the export actually has.
  const realPrices = new Set(units.filter((u) => u.p != null).map((u) => '$' + u.p.toLocaleString('en-US')));
  const rounded = [...new Set([].concat(...cryptCells.map((m) => [...m[1].matchAll(/\$[\d,]+/g)].map((x) => x[0]))))]
    .filter((a) => !realPrices.has(a));
  chk(rounded.length === 0, `no crypt cell shows a rounded or invented figure${rounded.length ? ': ' + rounded.join(', ') : ` (${realPrices.size} exact values)`}`);

  // The 4px sheet decode is GONE from the data module, not merely unrendered.
  const dataSrc = fs.readFileSync(DATA, 'utf8');
  chk(!/sheetRaw:/.test(dataSrc) && !/'$[d?,]+'/.test(dataSrc),
    'the sheetRaw glyph-decode FIELD and all 51 decode strings are deleted from the data module');
  chk(!/\$[\d,?]*\?/.test(src), 'no ambiguous "$?" glyph decode survives anywhere in the HTML');
  chk(UNITS.every((u) => u[5] === null || typeof u[5] === 'number'),
    'every UNITS price slot is a number or null — no strings left over from the decode');
}

// ── 6a. The crypt price load, proven against the CSV parse ───────────────────
console.log('\nCrypt prices (MIS export ' + PRICES.exported + ')');
{
  const av = units.filter((u) => u.st === 'available');
  const priced = av.filter((u) => u.p != null);
  chk(av.length === A.available, `${av.length} available units (${A.available})`);
  chk(priced.length === A.priced, `${priced.length} of them priced (${A.priced})`);
  chk(av.length - priced.length === A.unpricedAvail,
    `${av.length - priced.length} available units carry no price and say so (${A.unpricedAvail})`);
  // Read the RAW UNITS rows, not cryptUnits(): the helper defensively nulls the price
  // on anything unsellable, so checking the helper would let a price typed onto an
  // occupied crypt sit in the source file unnoticed. The source must be clean too.
  const rawLeak = UNITS.filter((u) => u[4] !== 'available' && u[5] !== null)
    .map((u) => `COM-1-1-${u[1]}-${u[2][0]}=${u[5]}`);
  chk(rawLeak.length === 0, `no unsellable unit carries a price in the data at all${rawLeak.length ? ': ' + rawLeak.slice(0, 5).join(', ') : ''}`);
  chk(units.filter((u) => u.st !== 'available' && u.p != null).length === 0,
    'and none reaches the render layer either');
  const sum = priced.reduce((t, u) => t + u.p, 0);
  chk(sum === A.availValue, `available crypt value $${sum.toLocaleString('en-US')} (anchor $${A.availValue.toLocaleString('en-US')})`);
  const sq = priced.reduce((t, u) => t + u.p * u.p, 0);
  chk(sq === A.priceSumSquares, `price multiset checksum ${sq} (${A.priceSumSquares})`);
  const ck = priced.reduce((t, u) => t + u.p * (TIERS.indexOf(u.tier) + 1) * u.cols[0], 0);
  chk(ck === A.priceChecksum, `position-weighted price checksum ${ck} (${A.priceChecksum})`);
  chk(new Set(priced.map((u) => u.p)).size === A.distinctPrices,
    `${new Set(priced.map((u) => u.p)).size} distinct prices (${A.distinctPrices})`);
  chk(priced.every((u) => Number.isInteger(u.p) && u.p > 0), 'every price is a positive whole number of dollars');
  // Per bank, so a price that moves between banks cannot hide inside the grand total.
  const byBank = {};
  for (const u of priced) byBank[u.bank] = (byBank[u.bank] || 0) + u.p;
  const bankBad = Object.keys(A.bankValue).filter((b) => byBank[b] !== A.bankValue[b])
    .map((b) => `${b}: ${byBank[b]} != ${A.bankValue[b]}`);
  chk(bankBad.length === 0 && Object.keys(byBank).length === Object.keys(A.bankValue).length,
    `all 17 per-bank available totals match${bankBad.length ? ': ' + bankBad.join('; ') : ''}`);
  // The parse figures the data module records must stay self-consistent.
  chk(PRICES.rows === 695 && PRICES.posRows + PRICES.spaceRows === PRICES.rows,
    `the export reconciles: ${PRICES.posRows} position rows + ${PRICES.spaceRows} space rows = ${PRICES.rows}`);
  chk(PRICES.unitsPriced + PRICES.unitsUnpriced === PRICES.unitsCovered && PRICES.unitsCovered === A.available,
    `the export covers exactly the available units (${PRICES.unitsCovered})`);
  chk(PRICES.availableValue === A.availValue, `PRICES.availableValue agrees with the parse ($${PRICES.availableValue.toLocaleString('en-US')})`);
  // Every price falls in exactly one band, and every band is used.
  chk(priced.every((u) => priceBand(u.p)), 'every price falls in a declared price band');
  const used = new Set(priced.map((u) => priceBand(u.p).c));
  chk(used.size === PRICE_BANDS.length, `all ${PRICE_BANDS.length} price bands carry inventory (${used.size})`);
  chk(PRICE_BANDS.every((b, i) => i === 0 || b.lo > PRICE_BANDS[i - 1].hi), 'the price bands are ordered and do not overlap');
  // WCAG AA on the chip, recomputed here rather than trusted from a comment.
  const lum = (h) => {
    const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
  const lowC = PRICE_BANDS.filter((b) => ratio(b.bg, b.fg) < 4.5).map((b) => `${b.c} ${ratio(b.bg, b.fg).toFixed(2)}:1`);
  chk(lowC.length === 0, `every price chip clears WCAG AA 4.5:1${lowC.length ? ': ' + lowC.join(', ') : ' (' + PRICE_BANDS.map((b) => ratio(b.bg, b.fg).toFixed(2)).join(', ') + ')'}`);
  // The page renders the band palette and the legend that explains it.
  chk(PRICE_BANDS.every((b) => src.includes(`.${b.c}{background:${b.bg};color:${b.fg};}`)),
    'the built page carries every price-band colour rule verbatim');
  chk(PRICE_BANDS.every((b) => src.includes(`<span>${b.l}</span>`)), 'the price legend lists every band');
  // The banner that said prices were not shown is GONE.
  chk(!/Crypt prices are not shown on this page/.test(src),
    'the "crypt prices are not shown on this page" banner is gone');
  chk(!/too low-resolution to read its digits/.test(src), 'the 4px-sheet excuse is gone from every card');
  chk(/Crypt prices come from MIS and are exact/.test(src), 'the page states prices are MIS-sourced and exact');
  chk(new RegExp(`\\$${A.availValue.toLocaleString('en-US').replace(/,/g, ',')} listed`).test(src),
    `the footer prints the available crypt value $${A.availValue.toLocaleString('en-US')}`);
}

// ── 6a-ii. Card math (operator ruling 2026-08-01) ────────────────────────────
// "here all the crypt prices for the chapel of memories. the only other cost is the
//  crypt monobar price which lives in the quote tool."
// So a crypt card is price + 10% E.C.F. + $225 recording + the optional monobar, and
// carries NO opening & closing. The monobar figures are the QUOTE TOOL's: $1,445
// memorial (index.html BW_FEES 'MONOBAR:crypt') + $225 install (the literal index.html
// quotes, and the 2026-07-26 record in data/prices.json that overrides the 215 workbook
// figure). Literals are written out here so editing the data module alone fails.
console.log('\nCrypt card math');
{
  chk(CRYPT_FEES.RECORDING === 225, `crypt recording fee is $225 (got $${CRYPT_FEES.RECORDING})`);
  chk(CRYPT_FEES.MONOBAR === 1445, `crypt monobar memorial is $1,445 (got $${CRYPT_FEES.MONOBAR})`);
  chk(CRYPT_FEES.MONOBAR_INSTALL === 225, `crypt monobar install is $225 (got $${CRYPT_FEES.MONOBAR_INSTALL})`);
  chk(CRYPT_FEES.VASE === 415, `crypt vase is $415 (got $${CRYPT_FEES.VASE})`);
  chk(CRYPT_FEES.ECF_RATE === 0.1, `crypt E.C.F. rate is 10% (got ${CRYPT_FEES.ECF_RATE * 100}%)`);
  chk(/var REC = 225, MB = 1445, MBI = 225, VASE = 415;/.test(src),
    'the page script carries REC 225, MB 1445, MBI 225, VASE 415');
  chk(/Monobar — \$1,670 ea/.test(src) && /\$1,445 memorial \+ \$225 install/.test(src),
    'the fee bar sells the monobar as $1,670 = $1,445 memorial + $225 install');
  chk(/tot = price \+ e \+ REC;/.test(src), 'the card total is price + E.C.F. + recording');
  chk(/var e = Math\.round\(price \* 10\) \/ 100/.test(src),
    'the E.C.F. is an exact 10% of the price, matching the export ecf column, not a ceiling');
  chk(/minimumFractionDigits: n % 1 \? 2 : 0/.test(src),
    'a fractional amount renders as cents ($2,639.50), never as $2,639.5');
  chk(/tot \+= \(MB \+ MBI\) \* mq;/.test(src), 'and adds both monobar lines together at one quantity');
  // No opening & closing anywhere on the crypt side.
  chk(/none — a crypt carries no O&amp;C/.test(src), 'the fee bar states a crypt carries no O&C');
  chk(!/Open &amp; Closing<\/span><span class="cv">/.test(src), 'no crypt card row quotes an opening &amp; closing amount');
  chk(!/1,205|1205/.test(src), "the tool's mausoleum entombment O&C never leaks onto this page");
  // OMITTED_FEES is retired: both illegible rows are resolved, not hidden.
  chk(!/Omitted \(illegible on the sheet\)/.test(src), 'the "omitted (illegible)" fee row is gone');
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
  // Was: MONOBAR_INSTALL === 215, the workbook figure. Changed DELIBERATELY 2026-08-01 to
  // 225, the figure index.html quotes, per the operator's ruling that the monobar price
  // lives in the quote tool. The point of this check is unchanged: the NICHE schedule
  // ($875 / $235) must never leak onto the crypts, which are a different product.
  chk(CRYPT_FEES.RECORDING === 225 && CRYPT_FEES.MONOBAR_INSTALL === 225 && CRYPT_FEES.VASE === 415,
    `the CRYPT fee box is crypt-only ($${CRYPT_FEES.RECORDING} / $${CRYPT_FEES.MONOBAR_INSTALL} / $${CRYPT_FEES.VASE})`);
  chk(CRYPT_FEES.RECORDING !== NICHE_FEES.RECORDING && !("OC" in CRYPT_FEES),
    'the crypt fee box has no O&C and does not share the niche recording fee');
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
    // NEW 2026-08-01. The one thing that must never happen now that statuses are
    // MIS-backed: a crypt MIS says is sold, or held, or does not carry at all, coming
    // out of this build as sellable.
    ['an OCCUPIED crypt flipped to available (MIS records an interment there)',
      (s) => s.replace("['101-110', 'G', [103], 'tandem', 'occupied', null]", "['101-110', 'G', [103], 'tandem', 'available', null]")],
    ['a RESERVED crypt flipped to available (MIS holds it for an owner)',
      (s) => s.replace("['168-172', 'G', [168], 'single', 'reserved', null]", "['168-172', 'G', [168], 'single', 'available', null]")],
    ['an UNLISTED crypt flipped to available (the list does not carry it at all)',
      (s) => s.replace("['124-140', 'G', [138], 'tandem', 'unlisted', null]", "['124-140', 'G', [138], 'tandem', 'available', null]")],
    ['two statuses SWAPPED between positions — totals unchanged, checksum must break',
      (s) => s.replace("['168-172', 'G', [169], 'single', 'occupied', null],\r\n  ['168-172', 'G', [170], 'single', 'occupied', null],\r\n  ['168-172', 'G', [171], 'single', 'reserved', null]",
        "['168-172', 'G', [169], 'single', 'reserved', null],\r\n  ['168-172', 'G', [170], 'single', 'occupied', null],\r\n  ['168-172', 'G', [171], 'single', 'occupied', null]")],
    ['a re-parse that dropped rows: MIS.resultRows 1355 -> 1300',
      (s) => s.replace('resultRows: 1355,', 'resultRows: 1300,')],
    ['a re-parse that lost a space: MIS.spaces 875 -> 874',
      (s) => s.replace('spaces: 875,', 'spaces: 874,')],
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
      (s) => s.replace("  ['201-212', 'A', [212], 'tandem', 'available', 24995],\r\n", '')
        .replace("  ['201-212', 'A', [212], 'tandem', 'available', 24995],\n", '')],
    // NEW 2026-08-01, now that the page shows money. A wrong price is as damaging as a
    // wrong status, and two of these are invisible to any plain total.
    ['a price MOVED to another valid price, same bank: G-116 $45,990 <-> F-116 $51,990',
      (s) => s.replace("['116-123', 'G', [116], 'single', 'available', 45990]", "['116-123', 'G', [116], 'single', 'available', 51990]")
        .replace("['116-123', 'F', [116, 117], 'deluxe', 'available', 51990]", "['116-123', 'F', [116, 117], 'deluxe', 'available', 45990]")],
    ['an UNSELLABLE crypt given a price: the occupied 101-110 G-103',
      (s) => s.replace("['101-110', 'G', [103], 'tandem', 'occupied', null]", "['101-110', 'G', [103], 'tandem', 'occupied', 30995]")],
    ['a price ROUNDED: $26,395 -> $26,400',
      (s) => s.replace("['201-212', 'G', [206, 207], 'deluxe', 'available', 26395]", "['201-212', 'G', [206, 207], 'deluxe', 'available', 26400]")],
    ['the monobar memorial price dropped back out of the fee box',
      (s) => s.replace('MONOBAR: 1445,', 'MONOBAR: 0,')],
    ['the monobar install reverted to the workbook figure the tool overrides: 225 -> 215',
      (s) => s.replace('MONOBAR_INSTALL: 225,', 'MONOBAR_INSTALL: 215,')],
    ['a price chip palette entry dropped below WCAG AA contrast',
      (s) => s.replace("bg: '#23a06b', fg: '#0e1729'", "bg: '#2f7a55', fg: '#0e1729'")],
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
