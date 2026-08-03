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
  NICHE_UPI, nicheSize, wallWidthIn, wallRowWidths,
  NICHE_FEES, CRYPT_FEES, CRYPT_FEE_SOURCE, MIS, STATUS_LABEL, PRICES, PRICE_BANDS, priceBand,
  PRICE_EXCEPTIONS, TIER_G_116_123,
} from './com-crypt-data.mjs';
import { assertFamilyRegister } from './_no_mis_assert.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REL = 'MAPS/COM_CryptMap.html';
const ABS = path.join(ROOT, REL);
const DATA = path.join(ROOT, 'scripts', 'com-crypt-data.mjs');
const BUILD = path.join(ROOT, 'scripts', 'build_com_map.mjs');
const SELF = fileURLToPath(import.meta.url);

// ── Anchors. These are the numbers the sabotage run must break. ───────────────
const A = {
  banks: 17,
  // 785 before 2026-08-01. Tier G of bank 116-123 was transcribed as the sheet DREW it,
  // eight single crypts; the operator ruled it is four companion pairs, so eight units
  // become four over the same eight spaces. `spaces` is unchanged at 893 on purpose —
  // no crypt appeared or vanished, four purchasable units merged into pairs.
  units: 781,
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
  // Old: available 379 / no `unpriced` class. New, after the operator's availability rule
  // ("available as long as a price is attached to it that is greater than 0") and the
  // tier-G consolidation: 379 - 8 tier-G singles + 4 tier-G pairs - 1 priceless = 374.
  available: 374,
  notOffered: 1,        // MIS says Available, MIS carries no price: COM-1-1-E-166
  occupied: 229,
  reserved: 156,
  blocked: 3,
  unlisted: 18,
  // The data module stores status per UNIT, so a two-column companion crypt gives both
  // its spaces the more-committed of the two MIS rows. 17 companion units hold one
  // occupied space and one reserved space, which is why this differs from MIS.spaceStatus
  // by exactly 17 in those two buckets and by zero everywhere else.
  // Old: { available: 430, occupied: 261, reserved: 181, blocked: 3, unlisted: 18 }.
  // One available SPACE moves to `unpriced` (E-166 is a one-space tandem); the tier-G
  // consolidation moves no space at all, which is the point of checking spaces as well
  // as units — a retyping must not change how much crypt exists.
  spaceHist: { available: 429, occupied: 261, reserved: 181, blocked: 3, unlisted: 18, unpriced: 1 },
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
  // Old: priced 377 / unpricedAvail 2 / availValue 9111510. The availability rule ended
  // the idea of an available-but-unpriced crypt: there are now ZERO of them by rule.
  priced: 374,           // = available. Every available unit is priced, or it is not available.
  unpricedAvail: 0,      // enforced as a RULE below, not merely observed
  distinctPrices: 29,    // unchanged: A-183 sums to $24,995, which already existed
  availValue: 8952545,   // was 9111510: +24,995 (A-183) -367,920 +183,960 (tier G)
  // A plain total is blind to a price that MOVES between two units, and a multiset is
  // blind to a swap as well. sumSquares pins the multiset (any price changed to another
  // valid price breaks it) and priceChecksum pins POSITION: price x tierIndex x space.
  priceSumSquares: 249749915625,   // was 257585486000
  priceChecksum: 5176393945,       // was 5166450550
  bankValue: {
    '101-110': 1114820, '111-115': 577900, '116-123': 925830, '124-140': 1338670,   // 116-123 was 1109790: 8 singles -> 4 pairs
    '141-148': 426895, '149-153': 169840, '154-158': 93965, '159-167': 161950,
    '168-172': 14995, '173-178': 532875, '179-184': 258925, '185-191': 1195795,   // 179-184 was 233930 (+A-183)
    '192-193': 173960, '194-200': 459915, '201-212': 725310, '213-219': 252835,
    '220-231': 528065,
  },
  // 377 priced units x the TWO renderings that show text: the 3D face and the flat
  // per-bank grid. The print-overview minis are label-only (they carry no badge either),
  // so they show no figure — but they DO carry the data-price attribute, hence two anchors.
  cryptPriceCells: 748,    // was 754
  cryptPriceAttrs: 1122,   // was 1131; 374 x 3 renderings
  // POSITIONAL anchors. A plain total is blind to a price that MOVES to another
  // valid row, so each available-$ figure is also pinned per row and by a
  // position-weighted checksum.
  radPerRow: { K: 41770, J: 47275, H: 67070 },
  serPerRow: { K: 6590, J: 14295, H: 29685, G: 16495, A: 9895 },
  radChecksum: 2596925,
  serChecksum: 2400750,
  cryptChecksum: 2422293,   // was 2439477 — unit count and one status both changed
};
// Position weights for the crypt status checksum. Five distinct values so that ANY
// swap between two statuses at two positions changes the sum.
const CW = { available: 3, unlisted: 5, blocked: 7, reserved: 11, occupied: 13, unpriced: 17 };

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
  // more committed of the two MIS rows. That is why the rendered per-space counts differ
  // from the parse — by exactly MIS.mergedSpaces, one way.
  //
  // AND, since 2026-08-01, by one more space in one more way: the operator's availability
  // rule takes a space MIS calls Available but carries no price for and renders it
  // `unpriced`. So the parse's `available` splits into rendered available + unpriced, and
  // the identity is available + unpriced, not available alone. Both sides are still tied
  // to MIS's own numbers — a dropped row still cannot hide here.
  const live = {};
  for (const s of spaces) if (s.st !== 'unlisted') live[s.st] = (live[s.st] || 0) + 1;
  chk(live.available + (live.unpriced || 0) === MIS.spaceStatus.available
    && (live.unpriced || 0) === A.notOffered
    && live.blocked === MIS.spaceStatus.blocked
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
  // ── THE AVAILABILITY RULE (operator, 2026-08-01) ─────────────────────────
  //   "yes all 379 are available as long as a price is attached to it that is
  //    greater than 0."
  // Asserted as a RULE over every unit, not as a count: no unit may render available
  // without a price greater than zero, now or after any future re-import.
  const sellableNoPrice = units.filter((u) => u.st === 'available' && !(u.p > 0)).map((u) => u.ref);
  chk(sellableNoPrice.length === A.unpricedAvail && sellableNoPrice.length === 0,
    `no unit renders available without a price > 0${sellableNoPrice.length ? ': ' + sellableNoPrice.slice(0, 5).join(', ') : ''}`);
  chk(priced.every((u) => u.p > 0), 'and every available price is strictly positive, not merely non-null');

  // EXCEPTION 1, pinned by REF so it cannot generalise: exactly one unit is priced by
  // SUMMING its two split rows. Every other multi-row unit takes the stamped value, and
  // summing one of those would double it.
  const summed = units.find((u) => u.ref === PRICE_EXCEPTIONS.summed.ref);
  chk(summed && summed.st === 'available' && summed.p === PRICE_EXCEPTIONS.summed.price,
    `${PRICE_EXCEPTIONS.summed.ref} is available at $${PRICE_EXCEPTIONS.summed.price.toLocaleString('en-US')} — the one summed unit`);
  chk(PRICE_EXCEPTIONS.summed.rows.reduce((a, b) => a + b, 0) === PRICE_EXCEPTIONS.summed.price,
    `and its price is exactly its two MIS rows added (${PRICE_EXCEPTIONS.summed.rows.join(' + ')})`);
  chk(PRICES.unitsSummed === 1, `exactly one unit in the building is priced by summation (${PRICES.unitsSummed})`);

  // EXCEPTION 2, also by ref: MIS says Available, MIS carries no price, so it is NOT
  // offered here and must not appear in the available histogram.
  const notOffered = units.filter((u) => u.st === PRICE_EXCEPTIONS.notOffered.status);
  chk(notOffered.length === A.notOffered && notOffered[0] && notOffered[0].ref === PRICE_EXCEPTIONS.notOffered.ref,
    `${PRICE_EXCEPTIONS.notOffered.ref} is the only not-offered unit (${notOffered.length})`);
  chk(notOffered.every((u) => u.p == null), 'and it carries no price at all');
  chk(!av.some((u) => u.ref === PRICE_EXCEPTIONS.notOffered.ref),
    'it does not count in the available histogram');
  chk(new RegExp(`data-ref="${PRICE_EXCEPTIONS.notOffered.ref}"[^>]*data-price=`).test(src) === false,
    'and no rendering of it carries a data-price attribute');
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
  chk(PRICES.unitsOffered + PRICES.unitsNotOffered === PRICES.unitsCovered,
    `the export lands on ${PRICES.unitsCovered} units: ${PRICES.unitsOffered} offered + ${PRICES.unitsNotOffered} not offered`);
  chk(PRICES.unitsOffered === A.available, `and the offered count is the available histogram (${PRICES.unitsOffered})`);
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
  // CONTRAST IS MEASURED OFF THE BUILT PAGE, not off PRICE_BANDS (changed 2026-08-01).
  // The band's RANGE is inventory and lives in the data module; the band's COLOUR is
  // presentation and lives in the build script's BAND_SKIN, because the operator's
  // "make the colros a little easier on the eyes" is a page decision, not a price
  // decision. Reading the ratios out of the data module would therefore have measured
  // a palette the page no longer uses — the exact shape of a check that passes while
  // the artefact is wrong. So: parse the rules the page actually ships.
  const skinned = new Map();
  for (const b of PRICE_BANDS) {
    const m = new RegExp(`\\.${b.c}\\{background:(#[0-9a-f]{6});color:(#[0-9a-f]{6});\\}`).exec(src);
    if (m) skinned.set(b.c, { bg: m[1], fg: m[2] });
  }
  chk(skinned.size === PRICE_BANDS.length,
    `the built page ships a colour rule for all ${PRICE_BANDS.length} price bands (${skinned.size})`);
  const lowC = [...skinned].filter(([, v]) => ratio(v.bg, v.fg) < 4.5).map(([c, v]) => `${c} ${ratio(v.bg, v.fg).toFixed(2)}:1`);
  chk(lowC.length === 0, `every price chip clears WCAG AA 4.5:1 AS RENDERED${lowC.length ? ': ' + lowC.join(', ') : ' (' + [...skinned].map(([c, v]) => `${c} ${ratio(v.bg, v.fg).toFixed(2)}`).join(', ') + ')'}`);
  // ...and the palette is MUTED. "Easier on the eyes" is not a matter of taste that a
  // future edit may quietly undo: the old chips were saturated signal colours (#23a06b,
  // #c39a10, #cf4a1c) and these are stone. Saturation here is HSL S; every band stays
  // under 0.34, which excludes anything that reads as a traffic light while leaving all
  // the room a marble/bronze family needs.
  const sat = (h) => {
    const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
    const mx = Math.max(...c), mn = Math.min(...c), l = (mx + mn) / 2;
    return mx === mn ? 0 : (mx - mn) / (l > 0.5 ? 2 - mx - mn : mx + mn);
  };
  const loud = [...skinned].filter(([, v]) => sat(v.bg) > 0.34).map(([c, v]) => `${c} S=${sat(v.bg).toFixed(2)}`);
  chk(loud.length === 0, `no price band is a saturated signal colour${loud.length ? ': ' + loud.join(', ') : ' (S ' + [...skinned].map(([, v]) => sat(v.bg).toFixed(2)).join(', ') + ')'}`);
  // The page renders the legend that explains the bands.
  chk(PRICE_BANDS.every((b) => src.includes(`<span>${b.l}</span>`)), 'the price legend lists every band');
  // The banner that said prices were not shown is GONE.
  chk(!/Crypt prices are not shown on this page/.test(src),
    'the "crypt prices are not shown on this page" banner is gone');
  chk(!/too low-resolution to read its digits/.test(src), 'the 4px-sheet excuse is gone from every card');
  // REMOVED 2026-08-01 at the operator's explicit instruction — he quoted the whole
  // price-provenance paragraph and said to take all of it off the page. This assertion
  // used to require the text; it now requires its ABSENCE, so it cannot creep back in.
  // NOTHING IT DESCRIBED WAS RELAXED: exact MIS prices, one price per tandem/companion
  // unit, no rounding, the price>0 availability rule and "nothing unsellable shows
  // money" are all still enforced — by the assertions above and in §6, against the
  // data, which is the only place a rule is worth anything. Only the prose is gone.
  const GONE = [
    'Crypt prices come from MIS and are exact',
    'priced positions over',
    'never split, never doubled',
    'Nothing is rounded',
    'A crypt is offered here only when a price greater than zero is attached to it',
    'is marked',
    'MIS calls it available but carries no price for it',
    'are from their own 2026-07-29 wall sheets',
    'Nothing unsellable shows money anywhere on this page',
  ].filter((t) => src.includes(t));
  chk(GONE.length === 0,
    `the price-provenance paragraph is gone from the page (operator, 2026-08-01)${GONE.length ? ' — still present: ' + GONE.map((t) => JSON.stringify(t)).join(', ') : ''}`);
  chk(!/class="warn"/.test(src), 'and its orange banner went with it');
  // The band LEGEND survives on its own: it is the key to reading the coloured chips,
  // not prose, and without it the six bands are unexplained.
  chk(/class="pricekey"/.test(src) && /class="plegend"/.test(src),
    'the price-band legend survives on its own outside the removed banner');
  chk(new RegExp(`\\$${A.availValue.toLocaleString('en-US').replace(/,/g, ',')} listed`).test(src),
    `the footer prints the available crypt value $${A.availValue.toLocaleString('en-US')}`);
}

// ── 6a-ii. Card math (operator rulings 2026-08-01) ───────────────────────────
// "here all the crypt prices for the chapel of memories. the only other cost is the
//  crypt monobar price which lives in the quote tool."
// "opening and clsoing and recording fee prices need to be taken from the quote tool
//  as well."
//
// So a crypt card is price + exact 10% E.C.F. + recording + entombment O&C + the
// optional monobar. EVERY fee but the vase is the QUOTE TOOL's figure:
//   RECORDING  $235  index.html BW_FEES 'RECORDING:all'          (was $225, the sheet)
//   OC         $1205 index.html BW_FEES 'OC:mausoleum_entombment' (was: no O&C at all)
//   MONOBAR    $1445 index.html BW_FEES 'MONOBAR:crypt'
//   INSTALL    $225  the literal index.html quotes, over the 215 in the workbook
// Literals are written out here so editing the data module alone fails this gate.
//
// SUPERSEDED, kept so the change is legible: this block used to assert RECORDING === 225,
// that no crypt card row quoted an O&C, and that "1205" appeared nowhere on the page.
// All three were the first ruling read too narrowly; the second ruling reverses them.
// ── 6a-iii. Bank 116-123 tier G — four companion pairs, not eight singles ────
// The sheet DREW eight single cells; the operator ruled 2026-08-01 "4 companion pairs."
// Pinned hard, because this is the one place in the file where the rendered inventory
// deliberately contradicts the source document it was transcribed from.
console.log('\nBank 116-123 tier G (operator override 2026-08-01)');
{
  const g = units.filter((u) => u.bank === '116-123' && u.tier === 'G');
  chk(g.length === TIER_G_116_123.units, `tier G is ${g.length} purchasable units, not 8 (${TIER_G_116_123.units})`);
  chk(g.every((u) => u.cols.length === 2), 'every one of them is a TWO-column companion');
  chk(g.every((u) => u.type !== 'single'), 'not one of them is typed single any more');
  chk(JSON.stringify(g.map((u) => u.cols)) === JSON.stringify(TIER_G_116_123.pairs),
    `paired 116+117, 118+119, 120+121, 122+123 (${JSON.stringify(g.map((u) => u.cols))})`);
  chk(JSON.stringify(g.map((u) => u.type)) === JSON.stringify(TIER_G_116_123.types),
    `typed deluxe / hidden / hidden / deluxe, from the bank segment header (${g.map((u) => u.type).join(', ')})`);
  // The pairing and typing must MATCH the bank's own segs, not be a parallel list.
  const segs = BANKS.find((b) => b.id === '116-123').segs;
  const typeAt = (c) => (segs.find((sg) => c >= sg[0] && c <= sg[1]) || [])[2];
  chk(g.every((u) => u.type === typeAt(u.cols[0]) && typeAt(u.cols[0]) === typeAt(u.cols[1])),
    'every tier-G pair takes its type from the bank segment that covers both its columns');
  // Same eight spaces as before, and the tiers below are paired the same way.
  chk(g.reduce((t, u) => t + u.cols.length, 0) === TIER_G_116_123.spaces,
    `still ${TIER_G_116_123.spaces} crypt spaces — units merged, no crypt appeared or vanished`);
  const f = units.filter((u) => u.bank === '116-123' && u.tier === 'F');
  chk(JSON.stringify(f.map((u) => u.cols)) === JSON.stringify(g.map((u) => u.cols)),
    'tier G is now paired exactly like tier F beneath it');
  // Stamped, not summed: the pair price is $45,990, not 2 x $45,990.
  chk(g.every((u) => u.p === TIER_G_116_123.unitPrice),
    `each pair is stamped $${TIER_G_116_123.unitPrice.toLocaleString('en-US')}, not doubled`);
  // And the ladder that proved the ruling right holds on the built page.
  const tierP = (t) => (units.find((u) => u.bank === '116-123' && u.tier === t && u.p) || {}).p;
  chk(tierP('G') < tierP('F') && tierP('F') < tierP('E') && tierP('E') < tierP('D'),
    `the bank ladder reads G $${tierP('G').toLocaleString('en-US')} < F $${tierP('F').toLocaleString('en-US')} < E $${tierP('E').toLocaleString('en-US')} < D $${tierP('D').toLocaleString('en-US')}`);
  chk(/8 single crypts/.test(fs.readFileSync(DATA, 'utf8')),
    'the data module records what the sheet drew, so the override stays legible');
}

console.log('\nCrypt card math');
{
  chk(CRYPT_FEES.RECORDING === 235, `crypt recording fee is the tool's $235 (got $${CRYPT_FEES.RECORDING})`);
  chk(CRYPT_FEES.OC === 1205, `crypt entombment O&C is the tool's $1,205 (got $${CRYPT_FEES.OC})`);
  chk(CRYPT_FEES.MONOBAR === 1445, `crypt monobar memorial is $1,445 (got $${CRYPT_FEES.MONOBAR})`);
  chk(CRYPT_FEES.MONOBAR_INSTALL === 225, `crypt monobar install is $225 (got $${CRYPT_FEES.MONOBAR_INSTALL})`);
  chk(CRYPT_FEES.VASE === 415, `crypt vase is $415 (got $${CRYPT_FEES.VASE})`);
  chk(CRYPT_FEES.ECF_RATE === 0.1, `crypt E.C.F. rate is 10% (got ${CRYPT_FEES.ECF_RATE * 100}%)`);
  chk(/var REC = 235, OC = 1205, MB = 1445, MBI = 225, VASE = 415;/.test(src),
    'the page script carries REC 235, OC 1205, MB 1445, MBI 225, VASE 415');
  chk(/Monobar — \$1,670 ea/.test(src) && /\$1,445 memorial \+ \$225 install/.test(src),
    'the fee bar sells the monobar as $1,670 = $1,445 memorial + $225 install');
  // ── The two fee toggles (operator, 2026-08-01) ───────────────────────────────
  // "the recording fee and entombment opening and closing need a toggle someone can
  //  purchase a crypt without those things if they would like." Then, same day,
  // reversing the first default: "they should start unchecked."
  //
  // So the card OPENS at property only — price + E.C.F. — and each toggle adds exactly
  // its own figure and nothing else. The E.C.F. is 10% of the CRYPT PRICE, so no toggle
  // may move it; that is asserted as the shape of the expression, not just its value.
  chk(/tot = price \+ e \+ \(recOn \? REC : 0\) \+ \(ocOn \? OC : 0\);/.test(src),
    'the card total is price + E.C.F., plus recording and entombment O&C only when toggled on');
  chk(/var e = Math\.round\(price \* 10\) \/ 100,/.test(src),
    'the E.C.F. is 10% of the crypt price alone — no fee toggle can move it');
  chk(/id="rec-on"/.test(src) && /id="oc-on"/.test(src), 'both fee toggles exist in the fee box');
  chk(!/id="rec-on" checked/.test(src) && !/id="oc-on" checked/.test(src),
    'and both START UNCHECKED (operator, 2026-08-01)');
  chk(/var feeOn = function \(id\) \{ var e = document\.getElementById\(id\); return !!\(e && e\.checked\); \};/.test(src),
    'a missing toggle element reads as OFF, matching the unchecked default');
  chk(/if \(recOn\) h \+= '<div class="cr"><span class="cl">Recording Fee/.test(src)
    && /if \(ocOn\) h \+= '<div class="cr"><span class="cl">Entombment O&amp;C/.test(src),
    'a toggled-off fee removes its LINE as well as its amount');
  chk(/<b>Property only\.<\/b>/.test(src),
    'and the card says so in as many words when either is off');
  chk(/'rec-on', 'oc-on'\]\.forEach/.test(src) && /setPrintCard\(readEl\(pinned\)\)/.test(src),
    'toggling re-renders the pinned card AND the print card');
  // Arithmetic, computed here rather than trusted: the four combinations of the two
  // toggles on one real priced crypt.
  {
    const P = 45990, E = Math.round(P * 10) / 100;
    const combos = [
      [false, false, P + E], [true, false, P + E + CRYPT_FEES.RECORDING],
      [false, true, P + E + CRYPT_FEES.OC], [true, true, P + E + CRYPT_FEES.RECORDING + CRYPT_FEES.OC],
    ];
    const bad = combos.filter(([r, o, want]) =>
      P + E + (r ? CRYPT_FEES.RECORDING : 0) + (o ? CRYPT_FEES.OC : 0) !== want);
    chk(bad.length === 0,
      `toggle arithmetic on a $${P.toLocaleString('en-US')} crypt: off/off $${combos[0][2].toLocaleString('en-US')}, `
      + `+rec $${combos[1][2].toLocaleString('en-US')}, +O&C $${combos[2][2].toLocaleString('en-US')}, `
      + `both $${combos[3][2].toLocaleString('en-US')}`);
  }
  chk(/Entombment O&amp;C<\/span><span class="cv">' \+ fm\(OC\)/.test(src),
    'the card prints the entombment O&C as its own line, twice (priced and unpriced cards)');
  chk(/var e = Math\.round\(price \* 10\) \/ 100/.test(src),
    'the E.C.F. is an exact 10% of the price, matching the export ecf column, not a ceiling');
  chk(/minimumFractionDigits: n % 1 \? 2 : 0/.test(src),
    'a fractional amount renders as cents ($2,639.50), never as $2,639.5');
  chk(/tot \+= \(MB \+ MBI\) \* mq;/.test(src), 'and adds both monobar lines together at one quantity');
  // Opening & closing IS quoted on a crypt now, and the page says where it came from.
  chk(/Entombment O&amp;C — \$1,205/.test(src), 'the fee bar prints Entombment O&C $1,205');
  chk(/Recording Fee — \$235/.test(src), 'the fee bar prints Recording Fee $235, the tool figure');
  chk(!/Recording Fee — \$225/.test(src) && !/Recording Fee<\/span><span class="cv">' \+ fm\(225\)/.test(src),
    'the superseded $225 sheet recording fee appears nowhere on the page');
  // REWORDED 2026-08-02 (s11/family-register). These used to assert that the page NAMED
  // the quote tool and called the crypt sheet's fee box "superseded" — our bookkeeping,
  // in front of a family. The invariant that matters is unchanged and still checked: the
  // fee bar states where the charges stand, as one string from the data module, and every
  // priced card repeats it. Only the words moved. The FIGURES are asserted above and are
  // untouched: recording $235, entombment O&C $1,205, and no $225 anywhere.
  chk(/Crypt fee source/.test(src) && /Bonney Watson’s current charges for this building/.test(src),
    'the fee bar names the charges as ours and current, without naming an internal source');
  chk(src.includes(CRYPT_FEE_SOURCE.replace(/&/g, '&amp;')),
    'the fee-source string is rendered verbatim from the data module');
  // ’ not ’ — the card is built in a JS string literal inside the page, so the
  // apostrophe reaches the HTML as its escape and only becomes a character at runtime.
  chk(/Recording, opening &amp; closing and the monobar are Bonney Watson\\u2019s current charges/.test(src),
    'every priced card carries the same statement of the fee source');
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
  chk(CRYPT_FEES.RECORDING === 235 && CRYPT_FEES.MONOBAR_INSTALL === 225 && CRYPT_FEES.VASE === 415,
    `the CRYPT fee box reads $${CRYPT_FEES.RECORDING} / $${CRYPT_FEES.MONOBAR_INSTALL} / $${CRYPT_FEES.VASE}`);
  // The two products now SHARE a recording fee — both take the tool's RECORDING:all —
  // so recording can no longer be the tell. The O&C is: a crypt entombment is $1,205
  // and a glass-front inurnment is $875, and swapping them is the leak that matters.
  chk(CRYPT_FEES.OC === 1205 && NICHE_FEES.OC === 875 && CRYPT_FEES.OC !== NICHE_FEES.OC,
    `crypt O&C $${CRYPT_FEES.OC} and niche O&C $${NICHE_FEES.OC} stay distinct`);
  chk(CRYPT_FEES.RECORDING === NICHE_FEES.RECORDING,
    'crypt and niche recording deliberately coincide at $235 — both are the tool\'s RECORDING:all');
  chk(!/Niche O&amp;C — \$1,205/.test(src) && !/Entombment O&amp;C — \$875/.test(src),
    'neither O&C figure is rendered against the other product');
  // THE MIRROR. Operator, 2026-08-01 (binding): the ruling that moved the CRYPT fees to
  // the quote tool's figures "only applies to the crypts not the niches." NICHE_FEES is
  // therefore frozen at the 2026-07-31 glass-front schedule, and the crypt-only fees must
  // not appear in it. Written as literals so a future crypt-side edit that reaches across
  // fails here, exactly as the niche-side check already fails a crypt-side leak.
  chk(JSON.stringify(NICHE_FEES) === JSON.stringify({ OC: 875, RECORDING: 235, ECF_RATE: 0.1 }),
    `NICHE_FEES is untouched by the crypt fee ruling (${JSON.stringify(NICHE_FEES)})`);
  const crypOnly = ['OC', 'MONOBAR', 'MONOBAR_INSTALL', 'VASE']
    .filter((k) => k !== 'OC' && k in NICHE_FEES)
    .concat(NICHE_FEES.OC === CRYPT_FEES.OC ? ['OC'] : []);
  chk(crypOnly.length === 0,
    `no crypt-only fee has bled into the niche schedule${crypOnly.length ? ': ' + crypOnly.join(', ') : ''}`);
  chk(!('MONOBAR' in NICHE_FEES) && !('MONOBAR_INSTALL' in NICHE_FEES) && !('VASE' in NICHE_FEES),
    'the niche schedule carries no monobar and no vase — those are crypt products');
  chk(Object.keys(CRYPT_FEES).length === 6 && Object.keys(NICHE_FEES).length === 3,
    `the two fee schedules stay separate objects (${Object.keys(CRYPT_FEES).length} crypt keys, ${Object.keys(NICHE_FEES).length} niche keys)`);
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

// ── 6d-ii. NO DECOR OBJECT MAY STAND ON SELLABLE INVENTORY ───────────────────
// Operator, 2026-08-02, from a screenshot of the live page: a teal-and-orange slab
// floating in front of the crypt fronts near the $61,990 chip, over RES/OCC cells and
// the chapel chairs. It was `window-sg`, the chapel's stained-glass window, laid flat
// against the SOUTH FACE of bank 116-123 — eight columns of purchasable crypt fronts —
// and 40 units tall, so from every chapel camera it hid the inventory the page exists
// to show. It had been there since the window was added, and nothing checked.
//
// The rule this installs is the general one, not a fix for the one object: a bank or
// niche wall's PURCHASABLE FRONT is a band of FRONT_DEPTH plan units standing off the
// face it is drawn on, and no decor rect — furniture, window, urn, bench, chair — may
// overlap any of those bands in plan space. Overlap is strict: touching the band's edge
// is allowed (the right-hand chapel chair block ends exactly on bank 194-200's band and
// is correct there), zero-area contact is not an occlusion.
//
// Plan-space overlap is not literally camera occlusion — an object could in principle
// hide a face from an oblique angle without standing on the band. It is the invariant
// that is checkable, deterministic, and that catches every case of the shape that
// actually occurred: something PLACED ON a face rather than in the room.
const FRONT_DEPTH = 6;
console.log('\nDecor never stands on a purchasable front');
{
  // The outward band for a rect drawn on `face`. 'S' means the fronts look SOUTH, so
  // the band lies at increasing y beyond the rect's bottom edge; and so on round.
  const band = (p, face) => ({
    N: { x0: p.x, x1: p.x + p.w, y0: p.y - FRONT_DEPTH, y1: p.y },
    S: { x0: p.x, x1: p.x + p.w, y0: p.y + p.h, y1: p.y + p.h + FRONT_DEPTH },
    W: { x0: p.x - FRONT_DEPTH, x1: p.x, y0: p.y, y1: p.y + p.h },
    E: { x0: p.x + p.w, x1: p.x + p.w + FRONT_DEPTH, y0: p.y, y1: p.y + p.h },
  }[face]);

  const fronts = [
    ...BANKS.map((b) => ({ id: `bank ${b.id}`, r: band(b.plan, b.face) })),
    ...['RAD', 'SER'].map((w) => ({ id: `${WALLS[w].name} wall`, r: band(WALLS[w].plan, WALLS[w].face) })),
  ];
  chk(fronts.length === BANKS.length + 2,
    `${fronts.length} purchasable-front bands checked — every crypt bank and both niche walls`);

  const decor = [
    ...FURNITURE.map((f) => ({ id: f.id, x0: f.x, x1: f.x + f.w, y0: f.y, y1: f.y + f.h })),
    ...chapelChairs().map((c) => ({ id: c.id, x0: c.x, x1: c.x + c.w, y0: c.y, y1: c.y + c.h })),
  ];
  const overlaps = [];
  for (const d of decor) {
    for (const f of fronts) {
      const ox = Math.min(d.x1, f.r.x1) - Math.max(d.x0, f.r.x0);
      const oy = Math.min(d.y1, f.r.y1) - Math.max(d.y0, f.r.y0);
      if (ox > 0 && oy > 0) overlaps.push(`${d.id} covers ${f.id} (${ox}x${oy} units)`);
    }
  }
  chk(overlaps.length === 0,
    overlaps.length === 0
      ? `no decor object stands on a purchasable front (${decor.length} objects x ${fronts.length} bands)`
      : `${overlaps.length} decor object(s) occlude sellable inventory: ${overlaps.slice(0, 4).join('; ')}`);

  // …and the specific object the operator caught, pinned where the video puts it: flush
  // against the WEST return of the recess, which is bank 111-115's blank east end wall.
  const sg = FURNITURE.find((f) => f.id === 'window-sg');
  const b111 = BANKS.find((b) => b.id === '111-115').plan;
  chk(!!sg && sg.x === b111.x + b111.w,
    `the stained-glass window stands flush on the recess's west wall at x=${sg && sg.x} (bank 111-115's east return, x=${b111.x + b111.w})`);
  chk(sg.w <= 4 && sg.h >= 20,
    `it is a tall narrow pane set into that wall (${sg.w} x ${sg.h}), not a slab lying across a crypt face`);
  const b116 = BANKS.find((b) => b.id === '116-123').plan;
  chk(sg.y > b116.y + b116.h,
    `and it is clear of bank 116-123's front line (window y${sg.y} vs face y${b116.y + b116.h})`);
  // The 3D treatment: stained glass, not a raw gradient. The old rule was one
  // linear-gradient in teal-to-orange with a mint glow, which read as an artefact.
  chk(/\.fk-window\{background:\s*[\r\n]?\s*repeating-linear-gradient/.test(src),
    'the window renders as leaded stained glass (repeating cames over the field), not a raw gradient');
  chk(!/#59c2a0/.test(src), 'the teal gradient stop that produced the floating slab is gone');
  chk(/\.fk-window\{[\s\S]{0,400}?border-radius:50% 50%/.test(src),
    'and it carries the same arched head as the alcove windows, so the two read as one building');
}

// ── 6e. Niche SIZES: measured per cell, drawn at true width ──────────────────
// Operator, 2026-08-02: "On both the 3D version and the floor plan the niches are not
// sized correctly — there are a few different sizes of glass front niches on each wall."
//
// The size classes were solved off the wall sheets by scripts/measure_niche_sheets.mjs.
// Those sheets are the operator's and are not in this repo, so this gate cannot re-read
// the pixels. What it CAN do is re-check the invariant the solve was pinned on — every
// row of a wall spans the same physical wall — plus coverage, the Family exception by
// ref, and that the built page draws each front at the width the data says. All four
// together mean a wrong pattern cannot land quietly: change one cell's class and the
// row sums stop matching; change a whole row and it stops matching the other rows.
console.log('\nNiche size classes (measured from the wall sheets, 2026-08-02)');
{
  // `checksum` is POSITIONAL — row index x column x width in sixteenths of an inch.
  // The histogram alone cannot see a row's classes PERMUTED (Radiance rows K and J hold
  // the same four Smalls and four Larges in opposite order, and both still sum to 165"),
  // so a swap that leaves every total intact still has to break something. This is it.
  const SIZE_ANCHOR = {
    RAD: { totalIn: 165, hist: { small: 32, large: 32, xlarge: 8, family: 2 }, classes: 4, checksum: 592888 },
    SER: { totalIn: 88.5, hist: { large: 32, small: 16 }, classes: 2, checksum: 225852 },
  };
  const sizeChecksum = (wid) => wallNiches(wid)
    .reduce((t, n) => t + (WALLS[wid].rows.indexOf(n.row) + 1) * n.col * Math.round(n.wIn * 16), 0);
  for (const wid of ['RAD', 'SER']) {
    const w = WALLS[wid], a = SIZE_ANCHOR[wid], ns = wallNiches(wid);
    const unclassed = ns.filter((n) => !n.sizeKey);
    chk(unclassed.length === 0,
      `${w.name}: every niche carries a measured size class (${ns.length - unclassed.length}/${ns.length})${unclassed.length ? ' — missing ' + unclassed.slice(0, 4).map((n) => n.ref).join(', ') : ''}`);

    // THE INVARIANT THE SOLVE WAS PINNED ON. Every row of one wall spans the same
    // physical wall, so every row's classes must sum to the same number of inches —
    // counting a Family cell on BOTH the rows it spans, which is what makes the
    // six-cell E/D pair come out equal to the eight-cell rows.
    const rows = wallRowWidths(wid);
    const off = rows.filter((r) => Math.abs(r.inches - a.totalIn) > 1e-9);
    chk(off.length === 0,
      `${w.name}: all ${rows.length} rows span the same ${a.totalIn}" of wall${off.length ? ' — ' + off.map((r) => r.row + '=' + r.inches).join(', ') : ` (${[...new Set(rows.map((r) => r.cells))].sort((x, y) => x - y).join(' and ')} cells per row)`}`);
    chk(wallWidthIn(wid) === a.totalIn, `${w.name} is ${a.totalIn}" wide (${wallWidthIn(wid)}")`);

    // The classes are the sheet's legend, exactly — no invented class, none dropped.
    chk(w.sizes.length === a.classes && w.sizes.every((s) => s.label && s.dims && s.w > 0 && s.h > 0 && s.d > 0),
      `${w.name}: ${a.classes} legend classes, each with a label, printed dimensions and h/w/d (${w.sizes.map((s) => s.k).join(', ')})`);
    const hist = {};
    for (const n of ns) hist[n.sizeKey] = (hist[n.sizeKey] || 0) + 1;
    chk(JSON.stringify(hist) === JSON.stringify(a.hist),
      `${w.name}: class histogram ${JSON.stringify(hist)}`);

    // THE OPERATOR'S ACTUAL COMPLAINT, asserted directly: the wall must not draw as one
    // uniform column width. A regression to a `repeat(n, 1fr)` grid fails right here.
    const widths = [...new Set(ns.map((n) => n.wIn))].sort((x, y) => x - y);
    chk(widths.length === a.classes, `${w.name}: ${widths.length} distinct drawn widths on the wall — ${widths.map((v) => v + '"').join(', ')}`);

    // Every cell's left edge + width must land inside the wall, and the last cell of a
    // row must land exactly on its right edge.
    const bad = ns.filter((n) => n.leftPct < -1e-6 || n.leftPct + n.widthPct > 100 + 1e-3);
    chk(bad.length === 0, `${w.name}: every front lies within the wall (${ns.length} checked)`);
    const ck = sizeChecksum(wid);
    chk(ck === a.checksum, `${w.name}: positional size checksum ${a.checksum} (${ck}) — pins WHICH column is which class, not just how many`);
  }

  // FAMILY IS PINNED BY REF, NOT BY COUNT. A count would let the class move to another
  // pair of cells as long as two of them carried it; these two are the cells the sheet
  // draws two rows tall, and nothing else may be Family.
  const fam = wallNiches('RAD').filter((n) => n.sizeKey === 'family').map((n) => n.ref).sort();
  chk(JSON.stringify(fam) === JSON.stringify(['RAD-1-1-E-2', 'RAD-1-1-E-5']),
    `the two Family niches are exactly RAD-1-1-E-2 and RAD-1-1-E-5 (${fam.join(', ') || 'none'})`);
  const famSpans = wallNiches('RAD').filter((n) => n.sizeKey === 'family')
    .every((n) => n.spanRows && n.spanRows.join('') === 'ED');
  chk(famSpans, 'and both are the cells the sheet draws two rows tall (span E/D)');
  const famRow = wallNiches('RAD').filter((n) => n.spanRows).map((n) => n.ref).sort();
  chk(JSON.stringify(famRow) === JSON.stringify(fam),
    'no OTHER niche spans two rows, on either wall');
  const serFam = wallNiches('SER').filter((n) => n.sizeKey === 'family' || n.spanRows);
  chk(serFam.length === 0, 'Serenity has no Family niche and no row-spanning cell (its sheet draws none)');

  // The wall's rendered face is now sized in real inches, so the two walls stand in
  // their true proportion instead of 8 columns against 6.
  const ratio = wallWidthIn('SER') / wallWidthIn('RAD');
  chk(Math.abs(ratio - 88.5 / 165) < 1e-9 && NICHE_UPI > 0,
    `Serenity is drawn ${(ratio * 100).toFixed(1)}% as wide as Radiance, which is what the sheets measure (it was 75%, i.e. 6 columns over 8)`);
}

// ── 6e-ii. …and the BUILT PAGE draws exactly those sizes ─────────────────────
console.log('\nNiche sizes, as rendered');
{
  // Both renderings place every front absolutely from its own measured left/width.
  const styleOf = (cls) => {
    const out = new Map();
    const re = new RegExp(`<button[^>]*class="${cls}[^"]*"[^>]*>`, 'g');
    for (const m of src.matchAll(re)) {
      const tag = m[0];
      const ref = /data-ref="([^"]*)"/.exec(tag);
      const st = /style="([^"]*)"/.exec(tag);
      const sz = /data-size="([^"]*)"/.exec(tag);
      const dm = /data-dims="([^"]*)"/.exec(tag);
      if (ref && !out.has(ref[1])) out.set(ref[1], { style: st ? st[1] : '', size: sz ? sz[1] : null, dims: dm ? dm[1] : null });
    }
    return out;
  };
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const byRef = new Map(allNiches().map((n) => [n.ref, n]));
  for (const [name, cls] of [['3D wall', 'c3 n3glass'], ['flat wall grid', 'c flatn']]) {
    const got = styleOf(cls);
    const bad = [];
    for (const [ref, n] of byRef) {
      const g = got.get(ref);
      if (!g) { bad.push(`${ref} missing`); continue; }
      if (g.size !== esc(n.size)) bad.push(`${ref} size ${g.size} != ${n.size}`);
      if (g.dims !== esc(n.dims)) bad.push(`${ref} dims mismatch`);
      if (!g.style.includes(`left:calc(${n.leftPct}% + 1px)`)) bad.push(`${ref} left`);
      if (!g.style.includes(`width:calc(${n.widthPct}% - 2px)`)) bad.push(`${ref} width`);
    }
    chk(bad.length === 0,
      `${name}: every front is drawn at its measured left and width and states its size class${bad.length ? ' — ' + bad.slice(0, 5).join('; ') : ` (${byRef.size})`}`);
  }
  // No niche rendering may fall back to a uniform grid.
  chk(!/class="face nichewall[^"]*"[^>]*grid-template-columns/.test(src),
    'the 3D niche wall is not laid out on uniform grid tracks any more');
  chk(/\.nwall\{position:relative/.test(src) && /\.flatn\{position:absolute/.test(src),
    'and neither is the flat wall grid');
  // The legend is a key to what is drawn: every class, its dimensions and its count.
  for (const wid of ['RAD', 'SER']) {
    const miss = WALLS[wid].sizes.filter((z) => !src.includes(esc(z.dims)) || !src.includes(esc(z.label)));
    chk(miss.length === 0, `${WALLS[wid].name}'s size legend prints every class's dimensions${miss.length ? ' — missing ' + miss.map((z) => z.k) : ''}`);
  }
  chk(new RegExp(`every row spans ${wallWidthIn('RAD')}&quot;`).test(src)
    && new RegExp(`every row spans ${wallWidthIn('SER')}&quot;`).test(src),
    'and states the wall width each row spans');
  // The card answers "which size is this one?" for every niche, not only the Family two.
  const js = src.slice(src.lastIndexOf('<script>'));
  chk(/function sizeRows\(d\)/.test(js) && /Dimensions<\/span>/.test(js),
    'the niche card states the size class AND its printed dimensions');
  chk(/'size', 'dims'\]/.test(js), 'and reads both off the cell it was opened from');
}

// ── 6f. One selectable area PER WALL ─────────────────────────────────────────
// Operator, 2026-08-02: "For the Chapel of Memory have one niche wall selection for
// Radiance and one for Serenity. Right now it is just one niche walls [selection]."
console.log('\nRadiance and Serenity are separately selectable');
{
  const ids = AREAS.map((a) => a.id);
  chk(ids.includes('rad') && ids.includes('ser') && !ids.includes('niches'),
    `the areas are ${ids.join(', ')} — the shared "niches" area is gone`);
  chk(WALLS.RAD.area === 'rad' && WALLS.SER.area === 'ser',
    'each wall carries its own area id');
  for (const [wid, aid] of [['RAD', 'rad'], ['SER', 'ser']]) {
    const w = WALLS[wid];
    // exactly ONE wall block in that area's view, and it is this wall's
    const view = src.slice(src.indexOf(`id="area-${aid}"`));
    const end = view.indexOf('<div class="wview"', 10);
    const body = end > 0 ? view.slice(0, end) : view;
    const blks = [...body.matchAll(/data-blk="([^"]+)"/g)].map((m) => m[1]);
    chk(blks.length === 1 && blks[0] === wid,
      `the ${w.name} view holds exactly one section, ${wid} (${blks.join(', ') || 'none'})`);
    chk(body.includes(`${w.name} Niche Wall`), `and is titled ${w.name}`);
    // a tab, a 3D fly-to button and a walkthrough stop each
    chk(src.includes(`class="tab" data-view="${aid}"`), `${w.name} has its own printable-list tab`);
    chk(src.includes(`data-viewbtn="${aid}"`), `${w.name} has its own 3D fly-to button`);
    const stop = STOPS.find((s) => s.id === w.stop);
    chk(!!stop && stop.area === aid, `and its walk-through stop "${w.stop}" belongs to it (${stop ? stop.area : 'missing'})`);
    // the wall's 3D face and its plan block both answer to that area
    chk(new RegExp(`data-bankface="${wid}" data-area="${aid}"`).test(src), `the ${w.name} 3D face is tagged ${aid}`);
    chk(new RegExp(`data-bank="${wid}" data-area="${aid}"`).test(src), `and so is its floor-plan block`);
    // ...but it still stands PHYSICALLY in another part of the building, which is what
    // keeps it solid rather than ghosted while you are standing there.
    chk(new RegExp(`data-homearea="${w.homeArea}"`).test(src), `${w.name} still reports its physical home area (${w.homeArea})`);
  }
  // Both walks are still reachable.
  chk(STOPS.filter((s) => s.id === 'radiance' || s.id === 'serenity').length === 2,
    'both niche walls keep a walk-through stop');
}

// ── 6g. Floor-plan SECTION ISOLATION ─────────────────────────────────────────
// Operator, 2026-08-02: "When clicking on a section on the floor plan just show that
// section, not the whole north wing (for example)."
console.log('\nFloor-plan section isolation');
{
  const js = src.slice(src.lastIndexOf('<script>'));
  const blks = [...src.matchAll(/<div class="bwrap" data-blk="([^"]+)"/g)].map((m) => m[1]);
  const want = BANKS.map((b) => b.id).concat(['RAD', 'SER']);
  chk(blks.length === want.length && want.every((id) => blks.includes(id)),
    `every section is individually addressable: ${blks.length} blocks for ${BANKS.length} banks + 2 niche walls`);
  chk(/function showView\(v, isolate\)/.test(js), 'showView takes the section to isolate');
  chk(/showView\(pb\.getAttribute\('data-area'\), pb\.getAttribute\('data-bank'\)\)/.test(js),
    'a click on a plan section passes THAT section, not just its wing');
  chk(/showView\(ev\.target\.getAttribute\('data-area'\), ev\.target\.getAttribute\('data-bank'\)\)/.test(js),
    'and so does Enter/Space on a focused plan section (keyboard parity)');
  chk(/\.wview\.isolated \.bwrap\{display:none;\}/.test(src) && /\.wview\.isolated \.bwrap\.iso\{display:block;\}/.test(src),
    'an isolated view hides every sibling section');
  chk(/\.wview\.isolated \.bwrap\{display:none!important;\}/.test(src),
    'and prints the same way it displays');
  const bars = (src.match(/class="isobar no-print"/g) || []).length;
  chk(bars === AREAS.length, `every one of the ${AREAS.length} area views carries a way back (${bars} isolation bars)`);
  chk(/data-iso="plan"/.test(src) && /data-iso="all"/.test(src),
    'the bar offers both "back to the floor plan" and "show the whole area"');
  chk(/function clearIso\(\)/.test(js) && /clearIso\(\);/.test(js),
    'and any other navigation clears the isolation rather than leaving a section stranded');
  chk(/Showing ' \+ \(BANK_LABEL\[isolate\] \|\| isolate\) \+ ' only'/.test(js),
    'the bar names the section you are looking at');
}

// ── 6h. No internal register anywhere a family can read it ───────────────────
// Sprint-11 ruling, widened 2026-08-02: it is not one word, it is a VOICE. The MIS sweep
// deleted "MIS" from this page and left "operator", "Lot Inquiry List", "crypt-price
// export", "wall sheet", "rows over" and "SNAPSHOT" standing in the same footer, which
// is what the operator saw and objected to. The ban list is now shared across every map
// gate and guide verifier — scripts/_no_mis_assert.mjs — so a surface added tomorrow
// inherits it. Code comments and never-rendered data may keep every one of these words.
console.log('\nNo internal register on a family-facing surface');
{
  assertFamilyRegister(chk, 'COM crypt map', src);
  // The replacements have to say something useful, not just delete the words.
  chk(/ask us for/i.test(src), 'the unavailable/no-price wording points a family at us instead');
  chk(/kept current against cemetery records/.test(src),
    'the permitted provenance sentence is what the footer and the priced cards now say');
  chk(/Crypt prices effective /.test(src),
    'and it carries a prices-effective date, which is the one date the register allows');
  // The words are still allowed — and still used — in the SOURCE, where they belong.
  const dataSrc = fs.readFileSync(DATA, 'utf8');
  chk(/\bMIS\b/.test(dataSrc) && /Lot Inquiry/i.test(fs.readFileSync(SELF, 'utf8') + dataSrc),
    'the data module keeps the provenance (it is a source citation, and it is never rendered)');
}

// ── 7. Print path ─────────────────────────────────────────────────────────────
console.log('\nPrint path');
{
  // SEVEN since 2026-08-02: the single "niches" area became one per wall (operator:
  // "have one niche wall selection for Radiance and one for Serenity").
  const areaIds = AREAS.map((a) => a.id);
  const areaHits = areaIds.filter((id) => src.includes(`id="area-${id}"`)).length;
  chk(areaHits === 7 && areaIds.length === 7, `all seven area views exist as static HTML (${areaHits} of ${areaIds.length})`);
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

// ── 7c. The jump box's search index ───────────────────────────────────────────
// Operator, 2026-08-01: "hard to find a specific crypt — no way to jump to a ref or
// search; you have to hunt tier by tier."
console.log('\nSearch index (jump box)');
{
  const js = src.slice(src.lastIndexOf('<script>'));
  const m = js.match(/var IDX = (\[[\s\S]*?\]);\r?\n/);
  chk(!!m, 'the page carries a search index');
  if (m) {
    const idx = JSON.parse(m[1]);
    const units = cryptUnits(), nn = allNiches();
    chk(idx.length === units.length + nn.length && idx.length === 903,
      `the index carries every sellable position: ${units.length} crypt units + ${nn.length} niches = ${idx.length} (expected 903)`);
    const refs = idx.map((e) => e.r);
    const seen = new Map();
    for (const r of refs) seen.set(r, (seen.get(r) || 0) + 1);
    const dup = [...seen].filter(([, v]) => v > 1);
    chk(dup.length === 0, `every ref appears EXACTLY once${dup.length ? ': ' + dup.slice(0, 4).map(([k, v]) => k + ' x' + v).join(', ') : ` (${seen.size} distinct)`}`);
    const want = new Set([...units.map((u) => u.ref), ...nn.map((x) => x.ref)]);
    const missing = [...want].filter((r) => !seen.has(r));
    const extra = refs.filter((r) => !want.has(r));
    chk(missing.length === 0 && extra.length === 0,
      `the index is exactly the data module's refs — no gaps, no strays${missing.length ? ' (missing ' + missing.slice(0, 3) + ')' : ''}${extra.length ? ' (extra ' + extra.slice(0, 3) + ')' : ''}`);

    // THE ANTI-DRIFT CHECK. Re-derive the whole array here from the data module and
    // require it BYTE FOR BYTE. A jump box whose index is maintained beside the data is
    // a jump box that one day flies the camera to a crypt that no longer exists, so the
    // build is required to have generated this from cryptUnits()/allNiches() and from
    // nothing else. Any hand-written or stale parallel list fails here.
    const areaOfBank = new Map(BANKS.map((b) => [b.id, b.area]));
    const rebuilt = units.map((u) => ({
      r: u.ref, k: 'c', t: u.tier, c: u.cols.slice(), b: u.bank, a: areaOfBank.get(u.bank),
      s: u.st, p: (u.st === 'available' && u.p > 0 ? u.p : 0), n: `Bank ${u.bank}`,
    })).concat(nn.map((x) => ({
      r: x.ref, k: 'n', t: x.row, c: [x.col], b: x.wall, a: WALLS[x.wall].area,
      s: x.st, p: x.p || 0, n: `${WALLS[x.wall].name} Niche Wall`,
    })));
    chk(JSON.stringify(rebuilt) === m[1],
      'the index is BYTE-IDENTICAL to a fresh derivation from com-crypt-data.mjs (not a parallel list)');

    // No index entry may carry money for something that is not sellable — the same rule
    // the cells obey, applied to the dropdown, which is a second place a price is shown.
    const leaks = idx.filter((e) => e.p > 0 && e.s !== 'available');
    chk(leaks.length === 0,
      `no unsellable position carries a price in the index${leaks.length ? ': ' + leaks.slice(0, 4).map((e) => e.r).join(', ') : ` (${idx.filter((e) => e.p > 0).length} priced, all available)`}`);

    // Shorthand must be unambiguous where the UI implies it is. Crypt tier+space is
    // unique across all 17 banks; niche row+column is NOT (both walls run K..A / 1..n),
    // which is exactly why the runtime also builds a wall-qualified key.
    const shortC = new Set(units.map((u) => u.tier + '-' + u.cols[0]));
    chk(shortC.size === units.length, `crypt shorthand (tier-space) is unique across all banks (${shortC.size}/${units.length})`);
    chk(/k\.push\(nrm\(e\.b\) \+ e\.t \+ e\.c\[i\]\);/.test(js),
      'and the two niche walls are separable by a wall-qualified key, since they share every row and column');
    chk(/function keysOf\(e\)/.test(js) && !/var KEYS = \[/.test(js),
      'match keys are derived from the index rows at runtime, not baked into a second list');
  }
  chk(/id="q"[\s\S]{0,400}role="combobox"/.test(src), 'the jump box is a labelled combobox in the header');
  chk(/id="qlist"[^>]*role="listbox"/.test(src), 'with a listbox of results');
  chk(/aria-activedescendant/.test(src) && /ev\.key === 'ArrowDown'/.test(src),
    'keyboard: arrows move the active option and it is announced');
  chk(/qList\.addEventListener\('pointerdown'/.test(src),
    'touch: results are picked on pointerdown, before a blur can tear the list down');
  chk(/Nothing matches/.test(src), 'a no-match query is handled and suggests the ref shapes');
  chk(/function jumpTo\(e\)/.test(src) && /showCard\(el, true\)/.test(src),
    'a pick lands through the SAME showCard a tap uses — one selection path, not two');
}

// ── 7d. Camera: fly-to, damping, walking ──────────────────────────────────────
// Operator, 2026-08-01: "moving in 3D is clumsy — the walk/orbit/zoom controls fight
// you; hard to get to the wall or view you want."
console.log('\nCamera navigation');
{
  const js = src.slice(src.lastIndexOf('<script>'));
  const m = js.match(/var FACES = (\{[\s\S]*?\});\r?\n/);
  chk(!!m, 'the page carries a face table');
  if (m) {
    const faces = JSON.parse(m[1]);
    const ids = Object.keys(faces);
    chk(ids.length === BANKS.length + 2,
      `every bank and both niche walls have a face-on standpoint (${ids.length} = ${BANKS.length} banks + 2 walls)`);
    const missing = BANKS.map((b) => b.id).concat(['RAD', 'SER']).filter((id) => !faces[id]);
    chk(missing.length === 0, `no face is missing${missing.length ? ': ' + missing.join(', ') : ''}`);

    // The face table must agree with the geometry the SCENE is built from, or the
    // camera flies to a wall that is not there. Recomputed from BANKS/WALLS here.
    const YAW = { N: 180, S: 0, E: -90, W: 90 };
    const at = (p, f) => (f === 'N' ? [p.x + p.w / 2, p.y] : f === 'S' ? [p.x + p.w / 2, p.y + p.h]
      : f === 'W' ? [p.x, p.y + p.h / 2] : [p.x + p.w, p.y + p.h / 2]);
    const bad = [];
    for (const b of BANKS) {
      const [x, z] = at(b.plan, b.face), f = faces[b.id];
      if (f.x !== x || f.z !== z || f.face !== b.face || f.yaw !== YAW[b.face]
        || f.n !== b.c1 - b.c0 + 1 || f.c0 !== b.c0) bad.push(b.id);
    }
    for (const wid of ['RAD', 'SER']) {
      const w = WALLS[wid], [x, z] = at(w.plan, w.face), f = faces[wid];
      if (f.x !== x || f.z !== z || f.face !== w.face || f.yaw !== YAW[w.face] || f.n !== w.cols) bad.push(wid);
    }
    chk(bad.length === 0,
      `every face-on standpoint matches the geometry the 3D scene is drawn from${bad.length ? ': ' + bad.join(', ') : ` (${ids.length} checked)`}`);

    // The 19 hand-tuned walkthrough stops are an independent witness for the yaw table:
    // each looks at a known wall, and the tuned yaw must equal the derived one.
    const witness = [['west-wall', '101-110'], ['north-wing', '124-140'], ['island-north', '220-231'],
      ['island-east', '213-219'], ['east-north', '141-148'], ['corner-168', '168-172'], ['radiance', 'RAD']];
    const off = witness.filter(([sid, fid]) => {
      const s = STOPS.find((x) => x.id === sid);
      return !s || !faces[fid] || s.yaw !== faces[fid].yaw;
    });
    chk(off.length === 0,
      `the derived yaws agree with all ${witness.length} hand-tuned stops that face a known wall${off.length ? ': ' + off.map((w) => w[0]).join(', ') : ''}`);
  }

  const solids = (js.match(/var SOLIDS = (\[[\s\S]*?\]);\r?\n/) || [])[1];
  chk(!!solids, 'the page carries a collision table');
  if (solids) {
    const rects = JSON.parse(solids);
    const halls = ROOMS.filter((r) => r.kind === 'hall' || r.kind === 'chapel').length;
    chk(rects.length === BANKS.length + 2 + (ROOMS.length - halls),
      `every crypt bank, both niche walls and the ${ROOMS.length - halls} service masses are solid; the ${halls} halls and the chapel are walkable (${rects.length} rects)`);
    // A walk-to position must not be inside a solid, or you spawn in a wall.
    const stuck = STOPS.filter((s) => rects.some((r) =>
      s.x > r[0] - 7 && s.x < r[0] + r[2] + 7 && s.z > r[1] - 7 && s.z < r[1] + r[3] + 7));
    chk(stuck.length === 0,
      `no walkthrough stop spawns inside a solid${stuck.length ? ': ' + stuck.map((s) => s.id).join(', ') : ` (${STOPS.length} checked)`}`);
  }

  chk(/function goFace\(id, ref, silent\)/.test(js), 'the camera can fly face-on to a wall');
  chk(/scene\.addEventListener\('dblclick'/.test(js), 'a double-click on a wall flies to it');
  chk(/lastTapFace === downFace && now - lastTapAt < 340/.test(js), 'and so does a double-TAP, for touch');
  chk(/function travelTo\(tx, tz\)/.test(js) && /function floorPoint\(ev\)/.test(js),
    'the whole floor is a walk-to target, not just the 19 markers');
  chk(/id="reticle"/.test(src) && /function showReticle\(pt\)/.test(js),
    'with a ground reticle under the pointer');
  chk(/var d = Math\.pow\(DAMP, dt \/ 16\.67\);/.test(js),
    'damping decays on ELAPSED TIME, so the glide feels the same at 30, 60 or 120 Hz');
  chk(/function rotScale\(\)/.test(js), 'rotation speed scales with zoom — fine-grained up close');
  chk(/if \(live\) glideRaf = requestAnimationFrame\(glide\);/.test(js),
    'and the rAF loop sleeps when motion settles rather than spinning forever');
  chk(/REDUCED/.test(js) && /prefers-reduced-motion/.test(js), 'prefers-reduced-motion turns the glide off');
  // The family contract. The tap detector must key off POINTER TRAVEL, never off camera
  // motion — the camera now keeps moving after the finger has left the glass.
  chk(/var isTap = ev\.type === 'pointerup' && moved <= 8;/.test(js),
    'a tap is still defined by pointer travel alone: drag never selects');
  chk(/lk === 'w' \|\| lk === 's'/.test(js) && /lk === 'a' \|\| lk === 'd'/.test(js),
    'WASD walks');
  chk(/k === 'Home' \|\| k === 'r' \|\| k === 'R'/.test(js), 'R and Home reset the view');
  chk(/function blocked\(x, z\)/.test(js) && /else if \(!blocked\(nx, cam\.ez\)\) cam\.ex = nx;/.test(js),
    'walls stop you, and you slide along them rather than sticking');
  chk(/function clampEye\(\)/.test(js), 'and you cannot walk out of the building and lose it');
  chk(/clamp\(d, -60, 60\) \* 0\.0007/.test(js) && /ev\.deltaMode === 1/.test(js),
    'the zoom curve is gentler and unit-agnostic (line/page scroll normalised, per-event cap)');

  // Readability, which is what all of this is FOR.
  chk(/--lod/.test(src) && /clamp\(cam\.zoom \* 1\.9, 1, 3\.2\)/.test(js),
    'cell labels grow with the camera (level of detail)');
  // 2026-08-01. The LOD machinery now drives the PRICE, because the ref is off the
  // fronts: "the locations do not have to be present on the crypt fronts just on the
  // hover. it takes up too much space just make the prices larger."
  chk(/\.c3p\{font-weight:700;font-size:min\(calc\(7px \* var\(--lod,1\)\),var\(--pmax,7px\)\)/.test(src),
    'the 3D crypt PRICE is the LOD-scaled label now, floored at its old fixed 7px');
  {
    // THE CAP HAS TO BE REAL. An LOD-scaled price with no ceiling overflowed every chip
    // on a wall by 2.3x at fly-to distance and the cell clipped it — "$24,9" in front of
    // a family. So every 3D price chip carries a --pmax computed from ITS figure and ITS
    // span, and this recomputes all of them from the data module rather than trusting
    // the build's arithmetic.
    const GLYPH_EM = { $: 0.60, ',': 0.31, 1: 0.49 };
    const emW = (s) => [...s].reduce((t, ch) => t + (GLYPH_EM[ch] ?? 0.635), 0);
    const want = (s, span) => Math.min(11, Math.floor(((36 * span - 3) / emW(s)) * 10) / 10);
    const chips = [...src.matchAll(/<span class="c3p pb\d" style="--pmax:([\d.]+)px">(\$[\d,]+)<\/span>/g)];
    chk(chips.length === A.priced,
      `every priced 3D crypt front carries a per-cell price ceiling (${chips.length} of ${A.priced})`);
    const byRef = new Map(units.filter((u) => u.p != null).map((u) => ['$' + u.p.toLocaleString('en-US'), u]));
    const capBad = [];
    let minCap = Infinity, maxCap = 0;
    for (const m of src.matchAll(/<button[^>]*class="c3 ty-[^"]*"[^>]*data-ref="([^"]+)"[^>]*data-cols="([^"]*)"[^>]*>[\s\S]*?<\/button>/g)) {
      const inner = /style="--pmax:([\d.]+)px">(\$[\d,]+)</.exec(m[0]);
      if (!inner) continue;
      const span = m[2].split('/').length;
      const w = want(inner[2], span);
      if (+inner[1] !== w) capBad.push(`${m[1]} ${inner[2]} span${span}: ${inner[1]} != ${w}`);
      minCap = Math.min(minCap, +inner[1]); maxCap = Math.max(maxCap, +inner[1]);
    }
    chk(capBad.length === 0,
      `every ceiling is the figure's own width in its own front${capBad.length ? ': ' + capBad.slice(0, 4).join('; ') : ` (${minCap}px on the tightest single, ${maxCap}px on the widest companion)`}`);
    chk(minCap >= 7, `and no ceiling is below the price's old fixed size, so nothing shrank anywhere (${minCap}px)`);
    chk(byRef.size > 0 && maxCap > 7 && maxCap <= 11,
      `while a companion front carries a larger one, under the 11px calm ceiling (${maxCap}px vs 7px)`);
  }
  chk(/\.c3st\{[^}]*font-size:calc\(3\.4px \* var\(--lod,1\)\)/.test(src),
    'the status badge is the quieter of the two (3.4px base, under the price)');
  chk(/id="callout"/.test(src) && /function setCallout\(d\)/.test(js),
    'the selected crypt gets a family-facing callout carrying its full ref');

  // ── The ref is OFF the crypt fronts and ON every identification channel ──────
  // Operator, 2026-08-01, verbatim: "the locations do not have to be present on the
  // crypt fronts just on the hover. it takes up too much space just make the prices
  // larger... reminder tehse are crypt fronts we're showing people."
  //
  // This is a pair of assertions, not one, and the pair is the point. Deleting a label
  // is trivial; deleting a label and leaving no way to name the crypt would be worse
  // than the crowding it fixed. So: absent from the 3D fronts, and present in ALL FOUR
  // of the places a person can still get it — the hover card, the pinned card, the
  // family callout, and the flat printable grids a counselor works down.
  {
    const c3crypt = [...src.matchAll(/<button[^>]*class="c3 ty-[^"]*"[^>]*>([\s\S]*?)<\/button>/g)];
    chk(c3crypt.length === A.units,
      `all ${c3crypt.length} 3D crypt fronts parsed (expected ${A.units})`);
    const stillLabelled = c3crypt.filter((m) => /c3id/.test(m[1])).length;
    chk(stillLabelled === 0,
      `no 3D crypt front prints its tier-space ref (${stillLabelled} of ${c3crypt.length} still do)`);
    // And nothing else sneaked a bare ref onto a front either — the only text a front
    // may carry is a price or a status word.
    const strayText = c3crypt.filter((m) => /(?:^|>)[^<>]*\b[A-G]-\d{3}\b/.test(m[1])).length;
    chk(strayText === 0, `and no front carries a tier-space string by any other route (${strayText})`);
    // The ref is still ON the element: the hover/click/focus path reads data-ref and
    // data-id off exactly these buttons, so identification-by-hover is intact.
    const withRef = c3crypt.filter((m) => /data-ref="COM-1-1-/.test(m[0]) && /data-id="[A-G]-\d/.test(m[0])).length;
    chk(withRef === c3crypt.length,
      `every front still carries data-ref + data-id for the hover card (${withRef})`);
    const inAria = c3crypt.filter((m) => /aria-label="[A-G]-\d{3}/.test(m[0])).length;
    chk(inAria === c3crypt.length, `and its aria-label still opens with the ref (${inAria})`);
    // Hover is a real, immediate path to that ref — no delay, no click required.
    chk(/document\.addEventListener\('mouseover'/.test(js) && /if \(n && n\.hasAttribute\('data-ref'\) && !n\.closest\('\.mini'\)\) showCard\(n, false\)/.test(js),
      'mouseover opens the card immediately — no hover delay to sit through');
    chk(/card\.innerHTML = cardHtml\(d\)/.test(js) && /'<div class="cardhd"><span class="cardid">' \+ id/.test(js),
      'and that card leads with the ref');
    // The FLAT grids are worklists, not fronts. They keep it.
    const flatCells = [...src.matchAll(/<button[^>]*class="c flatc[^"]*"[^>]*>([\s\S]*?)<\/button>/g)];
    const flatLabelled = flatCells.filter((m) => /<span class="cid">[A-G]-\d/.test(m[1])).length;
    chk(flatCells.length > 0 && flatLabelled === flatCells.length,
      `all ${flatCells.length} flat/printable crypt cells KEEP their ref (${flatLabelled})`);
    // The niche glass fronts are a different surface and were not in scope; they keep
    // their row-column label, which is why .c3id still exists in the stylesheet.
    const n3 = [...src.matchAll(/<button[^>]*class="c3 n3glass[^"]*"[^>]*>([\s\S]*?)<\/button>/g)];
    const n3Labelled = n3.filter((m) => /c3id/.test(m[1])).length;
    chk(n3.length === A.niches && n3Labelled === n3.length,
      `the ${n3.length} niche glass fronts are untouched and keep their label (${n3Labelled})`);
  }
  chk(/\.cotag\{[^}]*font-size:26px/.test(src), 'sized to be read across a desk (26px)');
  chk(/height:clamp\(400px,calc\(100vh - 300px\),1100px\)/.test(src),
    'the 3D scene takes the viewport height the chrome does not');
  // Nothing load-bearing under 12px. The mini overview grids are exempt: they are a
  // thumbnail index, and the print path renders them at page scale.
  {
    const small = [...src.matchAll(/font-size:(\d+(?:\.\d+)?)px/g)]
      .map((x) => +x[1]).filter((v) => v < 6);
    chk(small.length === 0,
      `no fixed font-size under 6px survives outside the LOD-scaled 3D labels${small.length ? ': ' + small.join(', ') : ''}`);
  }
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
    ['a ZERO-PRICED unit marked available (the rule: a price > 0 or it is not for sale)',
      (s) => s.replace("['159-167', 'E', [166], 'tandem', 'unpriced', null],", "['159-167', 'E', [166], 'tandem', 'available', null],")],
    ['an available unit given a price of exactly 0',
      (s) => s.replace("['168-172', 'C', [168], 'single', 'available', 14995]", "['168-172', 'C', [168], 'single', 'available', 0]")],
    ['bank 116-123 tier G re-split into the 8 singles the sheet drew',
      (s) => s.replace(
        "  ['116-123', 'G', [116, 117], 'deluxe', 'available', 45990],\r\n"
        + "  ['116-123', 'G', [118, 119], 'hidden', 'available', 45990],\r\n"
        + "  ['116-123', 'G', [120, 121], 'hidden', 'available', 45990],\r\n"
        + "  ['116-123', 'G', [122, 123], 'deluxe', 'available', 45990],",
        [116, 117, 118, 119, 120, 121, 122, 123]
          .map((c) => `  ['116-123', 'G', [${c}], 'single', 'available', 45990],`).join('\r\n'))],
    ['the summed A-183 exception generalised to a second unit',
      (s) => s.replace("['179-184', 'D', [183, 184], 'hidden', 'available', 24995]", "['179-184', 'D', [183, 184], 'hidden', 'available', 49990]")],
    ['the crypt fee ruling bled into the NICHES: niche O&C $875 -> the crypt $1,205',
      (s) => s.replace('NICHE_FEES = { OC: 875,', 'NICHE_FEES = { OC: 1205,')],
    ['a crypt-only fee added to the niche schedule (monobar)',
      (s) => s.replace('OC: 875, RECORDING: 235, ECF_RATE: 0.1 }', 'OC: 875, RECORDING: 235, MONOBAR: 1445, ECF_RATE: 0.1 }')],
    ['the crypt O&C swapped for the glass-front niche figure: $1,205 -> $875',
      (s) => s.replace('OC: 1205,', 'OC: 875,')],
    ['the recording fee reverted to the superseded crypt-sheet figure: $235 -> $225',
      (s) => s.replace('RECORDING: 235,', 'RECORDING: 225,')],
    ['the entombment O&C dropped out of the crypt fee box entirely',
      (s) => s.replace('  OC: 1205,\r\n', '').replace('  OC: 1205,\n', '')],
    ['the monobar memorial price dropped back out of the fee box',
      (s) => s.replace('MONOBAR: 1445,', 'MONOBAR: 0,')],
    ['the monobar install reverted to the workbook figure the tool overrides: 225 -> 215',
      (s) => s.replace('MONOBAR_INSTALL: 225,', 'MONOBAR_INSTALL: 215,')],
    // ── NEW 2026-08-02: the measured niche sizes ────────────────────────────
    ['one niche re-classed: Radiance column 1 Small -> Large (the row stops spanning 165")',
      (s) => s.replace("const RAD_P1 = ['small', 'large',", "const RAD_P1 = ['large', 'large',")],
    ['a Radiance row PERMUTED to the other valid pattern — every total intact, position must break',
      (s) => s.replace('  K: RAD_P1, J: RAD_P2,', '  K: RAD_P2, J: RAD_P1,')],
    ['a Serenity row re-classed: the four narrow spaces widened to Large',
      (s) => s.replace("const SER_P6 = ['large', 'small',", "const SER_P6 = ['large', 'large',")],
    ['the Family class moved off the two cells the sheet draws two rows tall',
      (s) => s.replace("const RAD_PE = ['xlarge', 'family', 'xlarge', 'xlarge', 'family', 'xlarge'];",
        "const RAD_PE = ['family', 'xlarge', 'xlarge', 'xlarge', 'xlarge', 'family'];")],
    ['a legend dimension mistyped: Radiance Large 23" -> 24"',
      (s) => s.replace("dims: '11 7/8\" x 23\" x 12 3/4\"', h: 11.875, w: 23,", "dims: '11 7/8\" x 24\" x 12 3/4\"', h: 11.875, w: 24,")],
    ['the two walls folded back into ONE shared "niches" selection',
      (s) => s.replace("cols: 8, area: 'rad', homeArea: 'west'", "cols: 8, area: 'ser', homeArea: 'west'")],
    ['a niche wall walk-through stop detached from its wall',
      (s) => s.replace("{ id: 'serenity', area: 'ser',", "{ id: 'serenity', area: 'rad',")],
    // NOTE 2026-08-01: the palette-contrast sabotage MOVED from here to the generator
    // phase below. The chip colours are no longer in the data module — they are the
    // build's BAND_SKIN — so mutating `bg:` here would no longer change the page, and a
    // mutation that does not alter the artefact proves nothing. See buildRuns.
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

  // ── 8b. Sabotage of the GENERATOR ──────────────────────────────────────────
  // The runs above all perturb the DATA, which is the right test for the inventory
  // anchors — but it cannot reach the navigation assertions added 2026-08-01, because
  // the search index and the face table are derived from that same data and move with
  // it. The failure those assertions exist to catch lives in the BUILD SCRIPT: a search
  // index that drifts from the data, a face-on yaw that points at the wrong wall, a
  // label that stops scaling. So this phase mutates the generator instead.
  console.log('\nSabotage of the generator (the navigation assertions must have teeth)');
  const origBuild = fs.readFileSync(BUILD, 'utf8');
  const buildRuns = [
    // NOTE: the first version of this mutation set G-116's price to $45,990 — which is
    // what it already is. It "passed" because nothing changed. A sabotage that does not
    // alter the artefact proves nothing; confirm the mutation actually bit before
    // concluding anything from it.
    ['the search index drifted from the data: one crypt filed under the wrong bank',
      (s) => s.replace('const SEARCH_JSON = JSON.stringify(searchIndex());',
        'const SEARCH_JSON = JSON.stringify(searchIndex().map((e) => (e.r === \'COM-1-1-G-116\' ? { ...e, b: \'111-115\' } : e)));')],
    ['one position dropped from the index (902, not 903)',
      (s) => s.replace('const SEARCH_JSON = JSON.stringify(searchIndex());',
        'const SEARCH_JSON = JSON.stringify(searchIndex().slice(1));')],
    ['a face-on yaw pointing at the wrong wall: east and west swapped',
      (s) => s.replace("const FACE_YAW = { N: 180, S: 0, E: -90, W: 90 };",
        "const FACE_YAW = { N: 180, S: 0, E: 90, W: -90 };")],
    ['a face placed at the bank CENTROID instead of its outward face',
      (s) => s.replace("  if (face === 'N') return [p.x + p.w / 2, p.y];",
        "  if (face === 'N') return [p.x + p.w / 2, p.y + p.h / 2];")],
    ['the halls made solid, so a counselor cannot walk down them',
      (s) => s.replace("for (const r of ROOMS) if (r.kind !== 'hall' && r.kind !== 'chapel') out.push([r.x, r.y, r.w, r.h]);",
        "for (const r of ROOMS) out.push([r.x, r.y, r.w, r.h]);")],
    ['level-of-detail removed: the crypt PRICE frozen at one size again',
      (s) => s.replace('font-size:min(calc(7px * var(--lod,1)),var(--pmax,7px))', 'font-size:7px')],
    ['the per-cell price ceiling removed, so a wide figure clips on a narrow front',
      (s) => s.replace('  Math.min(PMAX_CAP, Math.floor(((CELL_PX * span - CHIP_PAD) / emWidth(s)) * 10) / 10);',
        '  Math.floor((((CELL_PX + 20) * span - CHIP_PAD) / emWidth(s)) * 10) / 10;')],
    ['the status badge grown back over the price, so the front shouts OCC not money',
      (s) => s.replace('.c3st{font-size:calc(3.4px * var(--lod,1))', '.c3st{font-size:calc(7px * var(--lod,1))')],
    ['the tier-space ref put back on the crypt fronts',
      (s) => s.replace('aria-label="${esc(unitAria(u))}">${tag}</button>',
        'aria-label="${esc(unitAria(u))}"><span class="c3id">${unitLabel(u)}</span>${tag}</button>')],
    ['the ref stripped from the FLAT worklist grids too (it belongs there)',
      (s) => s.replace('<span class="cid">${unitLabel(u)}</span>${mini ? \'\' : badge}',
        '${mini ? \'\' : badge}')],
    ['a price chip palette entry dropped below WCAG AA contrast',
      (s) => s.replace("pb2: { bg: '#41695b', fg: '#ffffff' }", "pb2: { bg: '#7d9b8c', fg: '#ffffff' }")],
    ['the palette turned back up to signal colours (the operator asked for the opposite)',
      (s) => s.replace("pb5: { bg: '#8f6151', fg: '#ffffff' }", "pb5: { bg: '#cf4a1c', fg: '#ffffff' }")],
    ['frame-rate-dependent damping reinstated (a different gesture on a 120 Hz phone)',
      (s) => s.replace('var d = Math.pow(DAMP, dt / 16.67);', 'var d = DAMP;')],
    ['the tap detector keyed off camera motion instead of pointer travel (drag would select)',
      (s) => s.replace("var isTap = ev.type === 'pointerup' && moved <= 8;",
        "var isTap = ev.type === 'pointerup' && Math.abs(vYaw) < 0.2;")],
    ['the removed price-provenance paragraph put back on the page',
      (s) => s.replace('const PRICE_KEY = `<div class="pricekey">',
        'const PRICE_KEY = `<div class="pricekey">Crypt prices come from MIS and are exact.')],
    ['a fee toggle shipped pre-checked, silently restoring the old default total',
      (s) => s.replace('<input type="checkbox" id="oc-on">', '<input type="checkbox" id="oc-on" checked>')],
    // ── NEW 2026-08-02 ──────────────────────────────────────────────────────
    ['the niche walls drawn back on uniform columns, ignoring the measured sizes',
      (s) => s.replace('return `left:calc(${nn.leftPct}% + 1px);width:calc(${nn.widthPct}% - 2px);`',
        'return `left:calc(${((nn.col - 1) * 100) / 8}% + 1px);width:calc(${100 / 8}% - 2px);`')],
    ['the size class dropped off the niche cells again',
      (s) => s.replace("+ (n.size ? ` data-size=\"${esc(n.size)}\"` : '')", "+ ''")],
    ['"confirm in MIS" put back in front of a family',
      (s) => s.replace('<span>Unavailable — ask us</span>', '<span>Unavailable — confirm in MIS</span>')],
    ['a plan click reverted to opening the whole wing instead of the section',
      (s) => s.replace("showView(pb.getAttribute('data-area'), pb.getAttribute('data-bank'))", "showView(pb.getAttribute('data-area'))")],
    ['the per-section blocks left untagged, so nothing can be isolated',
      (s) => s.replace('`    <div class="bwrap" data-blk="${b.id}">', '`    <div class="bwrap">')],
    ['the way back out of an isolated section removed',
      (s) => s.replace('data-iso="plan">&larr; Floor plan', 'data-x="plan">&larr; Floor plan')],
  ];
  let bFail = 0;
  try {
    for (const [label, mut] of buildRuns) {
      const mutated = mut(origBuild);
      if (mutated === origBuild) { console.log('  FAIL  sabotage did not apply: ' + label); bFail++; continue; }
      fs.writeFileSync(BUILD, mutated, 'utf8');
      let code = 0;
      try {
        execFileSync(process.execPath, [BUILD], { cwd: ROOT, stdio: 'pipe' });
        execFileSync(process.execPath, [__filename()], { cwd: ROOT, stdio: 'pipe' });
      } catch (e) { code = e.status ?? 1; }
      (code === 1 ? pass : (() => { bFail++; return (m) => console.log('  FAIL  ' + m); })())(`${label} -> exit ${code}`);
      fs.writeFileSync(BUILD, origBuild, 'utf8');
      execFileSync(process.execPath, [BUILD], { cwd: ROOT, stdio: 'pipe' });
    }
  } finally {
    // The generator must be back on disk even if this phase throws.
    fs.writeFileSync(BUILD, origBuild, 'utf8');
    execFileSync(process.execPath, [BUILD], { cwd: ROOT, stdio: 'pipe' });
  }
  let brestored = 0;
  try { execFileSync(process.execPath, [__filename()], { cwd: ROOT, stdio: 'pipe' }); } catch (e) { brestored = e.status ?? 1; }
  (brestored === 0 ? pass : fail)(`generator restored, gate green again -> exit ${brestored}`);
  failures += bFail;
}
function __filename() { return fileURLToPath(import.meta.url); }

console.log(failures ? `\nRESULT: ${failures} FAILURE(S)` : '\nRESULT: PASS — 0 mismatches');
process.exit(failures ? 1 : 0);
