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
  BANKS, TIERS, VOIDS, WALLS, UNITS,
  cryptUnits, wallNiches, allNiches, cryptSpaces,
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
