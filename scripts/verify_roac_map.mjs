/**
 * Data equality gate for the ROAC 3D rebuild.
 *
 * Proves that MAPS/ROAC_NicheMap.html is a faithful rendering of
 * scripts/roac-niche-data.mjs, that the wall still has the SHAPE the pre-3D page had —
 * the same 350 tier/space refs and no others — and that the prices and statuses it
 * carries are the ones MIS exported on 2026-08-01. The part that matters in front of a
 * family: not one dollar figure renders for a niche that cannot be sold.
 *
 * The three renderings (3D faces, flat wall grids, print overview) must also agree with
 * each other and with the data module exactly.
 *
 *   node scripts/verify_roac_map.mjs [<git-ref-of-old-page>] [--sabotage]
 *
 * Exit 1 on any failure. `--sabotage` proves each assertion has teeth.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { FACE_ORDER, TIERS, FEES, UNSELLABLE, BENCHES, RIGHTS, allNiches } from './roac-niche-data.mjs';
import { MOVEMENT_TOKENS } from './map-movement.mjs';
import { assertFamilyRegister } from './_no_mis_assert.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REL = 'MAPS/ROAC_NicheMap.html';

// Baseline: the NEWEST commit whose copy of the page still uses buildWallGrid() —
// the last flat version.
function findBaseline() {
  const log = execFileSync('git', ['-C', ROOT, 'log', '--format=%H', '--', REL], { encoding: 'utf8' });
  for (const sha of log.trim().split('\n')) {
    try {
      const blob = execFileSync('git', ['-C', ROOT, 'show', `${sha}:${REL}`], { encoding: 'utf8', maxBuffer: 1 << 28 });
      if (blob.includes('function buildWallGrid')) return sha.slice(0, 7);
    } catch { /* file absent in that commit */ }
  }
  throw new Error('no pre-rewrite version of ' + REL + ' found in history');
}
const BASE = process.argv.slice(2).find((a) => !a.startsWith('--')) || findBaseline();

const EXPECTED_PER_FACE = 25;
const EXPECTED_TOTAL = 350;

// ── MIS ANCHORS, 2026-08-01 ──────────────────────────────────────────────────
// Until this date the gate proved the rebuilt page carried the pre-3D page's dataset
// byte for byte — refs, PRICES and STATUSES. That gate did its job: the 3D rewrite lost
// nothing. It cannot survive a live MIS reading, because MIS legitimately moves prices
// and statuses and the old page is frozen in git. So the comparison is SPLIT:
//
//   the old page still anchors the SHAPE — every ref, and only those refs. A niche that
//   appears, disappears or is renamed since the rewrite still fails.
//   MIS anchors the MONEY and the STATE, typed below from the two 2026-08-01 exports
//   rather than read back out of the data module.
//
// The lot inquiry is one row per right of interment (two per niche, the (A)/(B) suffix),
// so its arithmetic is stated here too: a re-parse that drops rows fails.
const MIS_INQUIRY_ROWS = 706;     // 702 wall rows + 4 bench rows
const MIS_RIGHTS_PER_NICHE = 2;
const MIS_EXTRA_INTERMENTS = 2;   // rows suffixed -2nd, both on G-INT
const MIS_BENCH_ROWS = 4;
const MIS_PRICE_ROWS = 610;       // available-price export, two rows per priced niche

// Old histogram (hand-maintained since sprint-06): available 304, reserved 27,
// buried 17, hold 2. ONE niche moved — G-EXT A-1, available -> not for sale.
const EXPECTED_ST = { available: 303, reserved: 27, buried: 17, hold: 2, notforsale: 1 };
const MIS_MOVED = { ref: 'G-EXT|A-1', from: 'available', to: 'notforsale' };
// 305 niches are priced by MIS (303 available + the 2 on hold); the other 45 carry null.
const EXPECTED_PRICED = 305;
const EXPECTED_UNPRICED = 45;
const AVAIL_TOTAL = 3625285;      // 303 available at list — operator 2026-08-01 ruled D-INT D-5 to $14,995 (was 3,626,785 on MIS's export figure)
// The available price multiset, typed from the export. Old ramp had 13 distinct prices;
// $14,295 / $15,395 / $17,595 are gone and $12,995 / $13,995 / $14,995 / $15,995 arrived.
const AVAIL_MULTISET = {
  7995: 2, 8795: 30, 8995: 4, 9895: 36, 9995: 5, 10995: 43, 11995: 28,
  12095: 38, 12995: 25, 13195: 33, 13995: 24, 14995: 21, 15995: 14,
};
// Per face: available count and the sum of those niches at list.
const PER_FACE_ANCHOR = {
  'A-EXT': [22, 237490], 'A-INT': [24, 309880], 'B-EXT': [22, 244090], 'B-INT': [25, 349875],
  'C-EXT': [20, 227600], 'C-INT': [19, 210005], 'D-EXT': [12, 133040], 'D-INT': [21, 289895],
  'E-EXT': [25, 274875], 'E-INT': [21, 234195], 'F-EXT': [24, 261680], 'F-INT': [24, 334880],
  'G-EXT': [21, 216895], 'G-INT': [23, 300885],
};
// The schedule the export carries, face by face, level A..E. Typed out because it is the
// thing that moved: reading it back from the module would agree with its own bug.
const MIS_SCHEDULE = {
  EXT_STD: [8795, 9895, 10995, 12095, 13195],   // every exterior except G
  'G-EXT': [7995, 8995, 9995, 10995, 11995],
  INT_PLAIN: [8795, 9895, 10995, 12095, 13195], // C-INT and E-INT price as exteriors
  INT_MID: [10995, 11995, 12995, 13995, 14995], // A-INT, G-INT
  INT_TOP: [11995, 12995, 13995, 14995, 15995], // B-INT, D-INT, F-INT
};
const SCHEDULE_OF = {
  'A-EXT': 'EXT_STD', 'B-EXT': 'EXT_STD', 'C-EXT': 'EXT_STD', 'D-EXT': 'EXT_STD',
  'E-EXT': 'EXT_STD', 'F-EXT': 'EXT_STD', 'G-EXT': 'G-EXT',
  'C-INT': 'INT_PLAIN', 'E-INT': 'INT_PLAIN',
  'A-INT': 'INT_MID', 'G-INT': 'INT_MID',
  'B-INT': 'INT_TOP', 'D-INT': 'INT_TOP', 'F-INT': 'INT_TOP',
};
// ⚠ THE ONE EXCEPTION. D-INT D-5 comes across at $16,495 while D-INT D-1 and D-4 — same
// face, same level — are $14,995. Every other face/level in the export is uniform. MIS is
// the price authority so $16,495 ships, and this anchor is what keeps it from being
// "tidied" to match its neighbours without the operator confirming it first.
// Operator ruled 2026-08-01: MIS's $16,495 on D-INT D-5 was a reprice miss — the ladder's
// $14,995 ships. The assertion below now guards the RULED value against a 'helpful' revert.
const SCHEDULE_EXCEPTION = { wall: 'D-INT', id: 'D-5', price: 14995, scheduleSays: 14995 };

let failures = 0;
const fail = (m) => { failures++; console.log('  FAIL  ' + m); };
const pass = (m) => console.log('  ok    ' + m);

// ── 1. The OLD page, straight out of git ──────────────────────────────────
const oldSrc = execFileSync('git', ['-C', ROOT, 'show', `${BASE}:${REL}`], { encoding: 'utf8', maxBuffer: 1 << 28 });
function parseOld(src) {
  const start = src.indexOf('var WALLS = {');
  const end = src.indexOf('\nvar LEVELS', start);
  if (start < 0 || end < 0) throw new Error('old page: WALLS object not found');
  const out = {};
  let cur = null;
  for (const line of src.slice(start, end).split('\n')) {
    const h = line.match(/^\s*"([A-G]-(?:EXT|INT))":\{/);
    if (h) { cur = h[1]; out[cur] = []; continue; }
    if (!cur) continue;
    for (const m of line.matchAll(/\{l:"([A-E])",s:"(\d)",p:(\d+),st:"(\w+)"\}/g)) {
      out[cur].push({ wall: cur, id: `${m[1]}-${m[2]}`, price: +m[3], st: m[4] });
    }
  }
  return out;
}
const oldWalls = parseOld(oldSrc);

// ── 2. The NEW page ───────────────────────────────────────────────────────
const newSrc = fs.readFileSync(path.join(ROOT, REL), 'utf8');
function parseRendered(src, cls) {
  const out = [];
  for (const m of src.matchAll(new RegExp(`<button[^>]*class="${cls}[^"]*"[^>]*>`, 'g'))) {
    const tag = m[0];
    const at = (k) => { const r = new RegExp(`data-${k}="([^"]*)"`).exec(tag); return r ? r[1] : null; };
    if (!at('id')) continue;
    // An unsellable niche emits data-price="" — that is ABSENCE of a price, not zero.
    const p = at('price');
    out.push({ wall: at('wall'), id: at('id'), price: p === '' ? null : +p, st: at('st') });
  }
  return out;
}
const from3d = parseRendered(newSrc, 'n3 front3');
const fromFlat = parseRendered(newSrc, 'n flatn');
const key = (c) => `${c.wall}|${c.id}`;
const sig = (c) => `${c.wall}|${c.id}|${c.price}|${c.st}`;

// flat grids appear twice: full wall views, then mini overview
const flatFull = [], flatMini = [];
{
  const seen = new Set();
  for (const c of fromFlat) { (seen.has(key(c)) ? flatMini : flatFull).push(c); seen.add(key(c)); }
}
const dataMod = allNiches().map((n) => ({ wall: n.wall, id: n.id, price: n.p, st: n.st }));

console.log(`\nROAC niche-map data equality gate   (old page: ${BASE}:${REL})\n`);

// ── 3. Counts ─────────────────────────────────────────────────────────────
console.log('Per-face counts');
for (const w of FACE_ORDER) {
  const o = oldWalls[w].length;
  const n3 = from3d.filter((c) => c.wall === w).length;
  const nf = flatFull.filter((c) => c.wall === w).length;
  const nm = flatMini.filter((c) => c.wall === w).length;
  const ok = [o, n3, nf, nm].every((v) => v === EXPECTED_PER_FACE);
  (ok ? pass : fail)(`${w.padEnd(6)} old ${o}  3D ${n3}  flat ${nf}  overview ${nm}`);
}
const totals = [Object.values(oldWalls).flat().length, from3d.length, flatFull.length, flatMini.length, dataMod.length];
(totals.every((t) => t === EXPECTED_TOTAL) ? pass : fail)(
  `total niches = ${EXPECTED_TOTAL} in all of: old page, 3D faces, flat grids, overview, data module (${totals.join('/')})`);

// ── 4. SHAPE equality against the old page (refs only) ────────────────────
// Prices and statuses are MIS's now and are checked in §5; what the old page still
// proves is that the WALL has not changed shape since the 3D rewrite.
console.log('\nShape equality (old page vs rebuilt page — every ref, and only those refs)');
const oldSet = new Map(Object.values(oldWalls).flat().map((c) => [key(c), sig(c)]));
for (const [name, list] of [['3D faces', from3d], ['flat wall grids', flatFull], ['print overview', flatMini], ['data module', dataMod]]) {
  const bad = [];
  if (list.length !== oldSet.size) bad.push(`count ${list.length} vs ${oldSet.size}`);
  for (const c of list) if (!oldSet.has(key(c))) bad.push(`extra ${key(c)}`);
  const have = new Set(list.map(key));
  for (const k of oldSet.keys()) if (!have.has(k)) bad.push(`missing ${k}`);
  (bad.length === 0 ? pass : fail)(`${name}: ${bad.length ? bad.slice(0, 8).join('; ') : 'the same 350 refs as the pre-3D page'}`);
}
// The three renderings and the module must still agree with EACH OTHER exactly — that
// check never depended on the old page and is the one that catches a build that drifts.
{
  const base = new Map(dataMod.map((c) => [key(c), sig(c)]));
  for (const [name, list] of [['3D faces', from3d], ['flat wall grids', flatFull], ['print overview', flatMini]]) {
    const bad = list.filter((c) => base.get(key(c)) !== sig(c))
      .map((c) => `${key(c)}: module ${base.get(key(c))} -> page ${sig(c)}`);
    (bad.length === 0 ? pass : fail)(`${name} match the data module exactly${bad.length ? ' — ' + bad.slice(0, 6).join('; ') : ' (ref, price, status)'}`);
  }
}

// ── 5. MIS money + status ─────────────────────────────────────────────────
console.log('\nStatuses (MIS Lot Inquiry List, 2026-08-01)');
{
  const hist = {};
  for (const c of dataMod) hist[c.st] = (hist[c.st] || 0) + 1;
  const ok = Object.keys(EXPECTED_ST).every((k) => hist[k] === EXPECTED_ST[k]) &&
    Object.keys(hist).every((k) => k in EXPECTED_ST);
  (ok ? pass : fail)(`status histogram: ${JSON.stringify(EXPECTED_ST)} (got ${JSON.stringify(hist)})`);
  // The inquiry's own arithmetic — one row per right of interment, two per niche.
  const derived = EXPECTED_TOTAL * MIS_RIGHTS_PER_NICHE + MIS_EXTRA_INTERMENTS + MIS_BENCH_ROWS;
  (derived === MIS_INQUIRY_ROWS ? pass : fail)(
    `${EXPECTED_TOTAL} niches x ${MIS_RIGHTS_PER_NICHE} rights + ${MIS_EXTRA_INTERMENTS} second interments + ` +
    `${MIS_BENCH_ROWS} bench rows = the export's ${MIS_INQUIRY_ROWS} rows (${derived})`);
  // THE one niche that moved. Named, so the drift is auditable rather than absorbed.
  const moved = dataMod.find((c) => key(c) === MIS_MOVED.ref);
  (moved && moved.st === MIS_MOVED.to ? pass : fail)(
    `the single status that moved since the hand-maintained reading: ${MIS_MOVED.ref} ` +
    `${MIS_MOVED.from} -> ${MIS_MOVED.to} (got ${moved && moved.st})`);
  const oldMoved = oldSet.get(MIS_MOVED.ref);
  (oldMoved && oldMoved.endsWith('|' + MIS_MOVED.from) ? pass : fail)(
    `and the old page really did carry it as ${MIS_MOVED.from}, so the drift is one niche and not a coincidence`);
  // Every OTHER status matches what was carried by hand — 349 of 350 were already right.
  const drifted = dataMod.filter((c) => {
    const o = oldSet.get(key(c));
    return o && o.split('|')[3] !== c.st;
  }).map((c) => key(c));
  (drifted.length === 1 && drifted[0] === MIS_MOVED.ref ? pass : fail)(
    `exactly one status differs from the pre-MIS reading${drifted.length === 1 ? '' : ' — ' + drifted.join(', ')}`);
}

console.log('\nPrices (MIS available-price export, 2026-08-01)');
{
  const priced = dataMod.filter((c) => typeof c.price === 'number' && !Number.isNaN(c.price) && c.price > 0);
  const unpriced = dataMod.filter((c) => !(c.price > 0));
  (priced.length === EXPECTED_PRICED ? pass : fail)(
    `${EXPECTED_PRICED} niches carry a price — the ${EXPECTED_ST.available} available plus the ${EXPECTED_ST.hold} on hold (${priced.length})`);
  (unpriced.length === EXPECTED_UNPRICED ? pass : fail)(
    `${EXPECTED_UNPRICED} unsellable niches carry NO price at all (${unpriced.length})`);
  (EXPECTED_PRICED * MIS_RIGHTS_PER_NICHE === MIS_PRICE_ROWS ? pass : fail)(
    `${EXPECTED_PRICED} priced niches x ${MIS_RIGHTS_PER_NICHE} rights = the price export's ${MIS_PRICE_ROWS} rows`);
  // Nothing occupied, reserved or not-for-sale may carry a figure anywhere.
  const leak = dataMod.filter((c) => ['buried', 'reserved', 'notforsale'].includes(c.st) && c.price > 0);
  (leak.length === 0 ? pass : fail)(
    `no occupied / reserved / not-for-sale niche carries a price${leak.length ? ' — ' + leak.map(key).join(', ') : ''}`);

  const avail = dataMod.filter((c) => c.st === 'available');
  const total = avail.reduce((a, c) => a + c.price, 0);
  (total === AVAIL_TOTAL ? pass : fail)(
    `available inventory at list = $${AVAIL_TOTAL.toLocaleString('en-US')} (got $${total.toLocaleString('en-US')})`);
  const ms = {};
  for (const c of avail) ms[c.price] = (ms[c.price] || 0) + 1;
  (JSON.stringify(ms) === JSON.stringify(AVAIL_MULTISET) ? pass : fail)(
    `the available price multiset is the export's${JSON.stringify(ms) === JSON.stringify(AVAIL_MULTISET) ? ` (${Object.keys(ms).length} distinct prices)` : ` — got ${JSON.stringify(ms)}`}`);
  for (const w of FACE_ORDER) {
    const [wantN, wantSum] = PER_FACE_ANCHOR[w];
    const g = avail.filter((c) => c.wall === w);
    const s = g.reduce((a, c) => a + c.price, 0);
    (g.length === wantN && s === wantSum ? pass : fail)(
      `${w.padEnd(6)} ${wantN} available, $${wantSum.toLocaleString('en-US')} (got ${g.length}, $${s.toLocaleString('en-US')})`);
  }
  // Every price is the export's schedule for its face — except the one flagged row.
  const off = [];
  for (const c of dataMod) {
    if (!(c.price > 0)) continue;
    if (c.wall === SCHEDULE_EXCEPTION.wall && c.id === SCHEDULE_EXCEPTION.id) continue;
    const want = MIS_SCHEDULE[SCHEDULE_OF[c.wall]][['A', 'B', 'C', 'D', 'E'].indexOf(c.id.split('-')[0])];
    if (c.price !== want) off.push(`${key(c)} ${c.price} (schedule ${want})`);
  }
  (off.length === 0 ? pass : fail)(
    `every priced niche is on its face's export schedule${off.length ? ' — ' + off.slice(0, 6).join('; ') : ''}`);
  const ex = dataMod.find((c) => c.wall === SCHEDULE_EXCEPTION.wall && c.id === SCHEDULE_EXCEPTION.id);
  (ex && ex.price === SCHEDULE_EXCEPTION.price ? pass : fail)(
    `${SCHEDULE_EXCEPTION.wall} ${SCHEDULE_EXCEPTION.id} ships the operator-ruled $${SCHEDULE_EXCEPTION.price.toLocaleString('en-US')} ` +
    `(2026-08-01; MIS's $16,495 was a reprice miss — this guards against reverting it) (got ${ex && ex.price})`);
  // Tiers: one per sellable price, none for a price nobody can buy.
  const sellPrices = new Set(priced.map((c) => c.price));
  const orphan = [...sellPrices].filter((p) => !TIERS.some((t) => t.p === p));
  const ghost = TIERS.filter((t) => !sellPrices.has(t.p)).map((t) => t.p);
  (orphan.length === 0 ? pass : fail)(`every sellable price has a colour tier${orphan.length ? ' — ' + orphan.join(', ') : ` (${TIERS.length} tiers)`}`);
  (ghost.length === 0 ? pass : fail)(`no tier is defined for a price no niche carries${ghost.length ? ' — ' + ghost.join(', ') : ''}`);
  // The ramp is a price ordering; a tier list out of order reads as a random palette.
  const ordered = TIERS.every((t, i) => i === 0 || TIERS[i - 1].p < t.p);
  (ordered ? pass : fail)('the tier ramp is strictly ascending in price');
  // Contrast, WCAG AA, on every chip — two combinations are new this update.
  const lin = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const lum = (hex) => {
    let h = hex.replace('#', '');
    if (h.length === 3) h = [...h].map((x) => x + x).join('');
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map(lin);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const low = TIERS.filter((t) => ratio(t.bg, t.fg) < 4.5).map((t) => `${t.l} ${ratio(t.bg, t.fg).toFixed(2)}:1`);
  (low.length === 0 ? pass : fail)(`every price chip clears WCAG AA 4.5:1${low.length ? ' — ' + low.join(', ') : ` (worst ${Math.min(...TIERS.map((t) => ratio(t.bg, t.fg))).toFixed(2)}:1)`}`);
}

// ── 5b. No price renders on an unsellable niche, anywhere ─────────────────
console.log('\nNo price is rendered for an unsellable niche');
{
  const unsell = new Set(dataMod.filter((c) => UNSELLABLE.includes(c.st)).map(key));
  const offenders = [];
  for (const [name, list] of [['3D', from3d], ['flat', flatFull], ['overview', flatMini]]) {
    for (const c of list) {
      if (!unsell.has(key(c))) continue;
      if (c.price > 0) offenders.push(`${name} ${key(c)} carries data-price="${c.price}"`);
    }
  }
  (offenders.length === 0 ? pass : fail)(
    `zero prices across all ${unsell.size * 3} unsellable renderings${offenders.length ? ' — ' + offenders.slice(0, 6).join('; ') : ''}`);
  const ariaBad = [...newSrc.matchAll(/aria-label="([^"]*)"/g)].map((m) => m[1])
    .filter((l) => /\$/.test(l) && /(Reserved|Occupied|Not For Sale)/.test(l));
  (ariaBad.length === 0 ? pass : fail)(
    `no screen reader hears a price on an unsellable niche${ariaBad.length ? ' — ' + ariaBad.slice(0, 3).join('; ') : ''}`);
  // Not-for-sale is its OWN code: it must not render as reserved or occupied.
  const nfs = dataMod.filter((c) => c.st === 'notforsale').map(key);
  const marked = [...newSrc.matchAll(/<button[^>]*class="[^"]*st-notforsale[^"]*"[^>]*>/g)].length;
  (marked === nfs.length * 3 ? pass : fail)(
    `the ${nfs.length} not-for-sale niche renders with st-notforsale in all three renderings (${marked})`);
  (/<span>Not for sale<\/span>/.test(newSrc) ? pass : fail)('the legend names the not-for-sale code');
  (/\.st-notforsale\{background:/.test(newSrc) ? pass : fail)('and it has a treatment of its own, distinct from reserved and occupied');
  (/Not for sale \\u2014 this space is not currently being offered/.test(newSrc) ? pass : fail)(
    'the card says the space is not being offered — not that someone bought it (and does not name MIS)');
}

// ── 5b2. The fee schedule ─────────────────────────────────────────────────
// Not previously asserted at all — sabotage found it: cutting the E.C.F. to 5% or
// reverting O&C to the superseded $835 left this gate green. Every figure is typed here,
// not read back from FEES, and every one of them must reach the page.
console.log('\nFee schedule');
{
  const RULED = { OC: 875, REC: 235, INSCR: 660, VASE: 275, TAX: 0.104, ECF_RATE: 0.1 };
  for (const [k, want] of Object.entries(RULED)) {
    (FEES[k] === want ? pass : fail)(`FEES.${k} = ${want} (got ${FEES[k]})`);
  }
  const money = (n) => '$' + n.toLocaleString('en-US');
  for (const k of ['OC', 'REC', 'INSCR', 'VASE']) {
    (newSrc.includes(money(RULED[k])) ? pass : fail)(`the page prints ${k} as ${money(RULED[k])}`);
  }
  (/10\.4%/.test(newSrc) ? pass : fail)('the page prints sales tax as 10.4%');
  (/10%/.test(newSrc) ? pass : fail)('the page prints the E.C.F. as 10%');
  // The superseded figures must not survive anywhere.
  for (const [k, gone] of [['O&C', 835], ['recording', 225], ['inscription', 605]]) {
    (!newSrc.includes(money(gone)) ? pass : fail)(`the superseded ${k} figure ${money(gone)} appears nowhere`);
  }
  (RIGHTS === 2 ? pass : fail)(`a niche carries ${RIGHTS} rights of interment (got ${RIGHTS})`);
  (new RegExp(`${RIGHTS}-urn`).test(newSrc) ? pass : fail)(`available cells carry the ${RIGHTS}-urn capacity tag`);
}

// ── 5c. The memorial benches (operator ruling 2026-08-01) ─────────────────
// "the benches are sold and they are 4 rights per bench."
console.log('\nMemorial benches');
{
  (BENCHES.status === 'sold' ? pass : fail)(`both benches are SOLD (${BENCHES.status})`);
  (BENCHES.rights === 4 ? pass : fail)(`each bench carries 4 rights of interment (${BENCHES.rights})`);
  (BENCHES.count === 2 ? pass : fail)(`there are 2 benches (${BENCHES.count})`);
  (BENCHES.misStatus === 'Reserved' ? pass : fail)(
    `the lot inquiry returns every bench position as ${BENCHES.misStatus} — sold, unsellable either way`);
  const panels = (newSrc.match(/Bench #\d/g) || []).length;
  (panels === BENCHES.count ? pass : fail)(`the benches view shows ${BENCHES.count} bench panels (${panels})`);
  // Once in the view subtitle, once inside EACH bench panel. Asserting the COUNT is what
  // catches the panel line being dropped while the subtitle still carries the phrase.
  const rightsLines = (newSrc.match(new RegExp(`${BENCHES.rights} rights of interment`, 'g')) || []).length;
  (rightsLines === BENCHES.count + 1 ? pass : fail)(
    `every bench panel states ${BENCHES.rights} rights of interment, and so does the subtitle (${rightsLines} of ${BENCHES.count + 1})`);
  (/benches have been sold/.test(newSrc) ? pass : fail)('and states that both are sold');
  // A bench is never inventory. No price, no niche cell, no data-price.
  const benchBlock = newSrc.slice(newSrc.indexOf('id="wall-bench"'), newSrc.indexOf('id="wall-bench"') + 2200);
  (!/\$[\d,]/.test(benchBlock) ? pass : fail)('no dollar figure appears anywhere in the benches view');
  (!/data-price/.test(benchBlock) ? pass : fail)('and no bench carries a data-price attribute');
  (!/<button/.test(benchBlock) ? pass : fail)('the benches view is a static panel — no card affordance to mis-read');
}

// ── 6. Print path ─────────────────────────────────────────────────────────
console.log('\nPrint path');
const wallViews = (newSrc.match(/id="wall-[A-G]"/g) || []).length;
(wallViews === 7 ? pass : fail)(`all seven wall views exist as static HTML (${wallViews})`);
(/\.wview\{display:block!important/.test(newSrc) ? pass : fail)('print stylesheet forces every wall view visible without JS');
(/\.n\.sel\{outline:4px solid #c8540a/.test(newSrc) ? pass : fail)('a selected niche prints with the highlight ring');
const scripts = (newSrc.match(/<script/g) || []).length;
(scripts === 1 ? pass : fail)(`page has ${scripts} <script> block(s); none is needed to render the flat grids`);

// ── 7. The pinned card must never cover the tab bar ───────────────────────
console.log('\nPinned card vs the tab bar');
{
  // A pinned space in a hidden view has a ZERO rect, and a card placed against zero
  // lands on the tab bar and eats the tab clicks. Found by driving the GOMN page, 2026-07-31.
  const js = newSrc.slice(newSrc.lastIndexOf('<script>'));
  (/function visibleTwin\(el\)/.test(js) ? pass : fail)('the card places itself against a rendering that is actually laid out');
  (/var t = visibleTwin\(el\);/.test(js) && /if \(!t\) \{ card\.style\.left/.test(js) ? pass : fail)(
    'and parks in its default corner when no rendering of the pinned space is visible');
  (!/var r = el\.getBoundingClientRect\(\);\s*\r?\n\s*card\.style\.right = 'auto'/.test(js) ? pass : fail)(
    'placeCard no longer measures the pinned element directly (the zero-rect path)');
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
  const js = newSrc.slice(newSrc.lastIndexOf('<script>'));
  // This gate reports through pass/fail; ck is the same shape the other gates use.
  const ck = (c, m) => (c ? pass : fail)(m);
  for (const [tok, what] of MOVEMENT_TOKENS) ck(js.indexOf(tok) > -1, what);
  const keys = ["yaw","pitch","zoom","lift"];
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
  ck(!/function floorPoint\(/.test(js), 'no floor-travel on an orbit-a-cabinet page (presets + inertia only)');
}

// ── Sabotage: every mutation below must make this gate exit 1 ────────────────
// `node scripts/verify_roac_map.mjs --sabotage` perturbs the data module and the
// generator, rebuilds, re-runs this gate against each, and restores the sources — on a
// throw too. Added 2026-08-01 with the MIS refresh: while the gate was a pure equality
// check against the frozen old page it could not be sabotaged meaningfully, because any
// mutation moved the page away from a fixed target. Now that the anchors are typed MIS
// figures, each one needs teeth of its own.
//
// NOTE the second positional argument: this gate takes a git ref, so the sabotage child
// is invoked with the SAME baseline to keep it deterministic.
if (process.argv.includes('--sabotage')) {
  const DATA = path.join(ROOT, 'scripts', 'roac-niche-data.mjs');
  const BUILD = path.join(ROOT, 'scripts', 'build_roac_map.mjs');
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
        try { child([BUILD]); child([self, BASE]); } catch (e) { code = e.status ?? 1; }
        if (code === 1) pass(`${label} -> exit ${code}`);
        else { sabFail++; console.log(`  FAIL  ${label} -> exit ${code} (expected 1)`); }
        fs.writeFileSync(file, origSrc, 'utf8');
      }
    } finally {
      fs.writeFileSync(file, origSrc, 'utf8');
      child([BUILD]);
    }
  };

  console.log('\nSabotage of the data module (each mutation must make this gate exit 1)');
  const origData = fs.readFileSync(DATA, 'utf8');
  runSet(DATA, origData, [
    // THE runs for this update: the MIS reprice and the one status that moved.
    ["the interior reprice reverted — B-INT tier E back at the superseded $17,595",
      (s) => s.replace("{ l: 'E', s: 1, p: 15995, st: 'available' }", "{ l: 'E', s: 1, p: 17595, st: 'available' }")],
    ['a repriced niche left on its OLD figure, so one cell quotes the superseded schedule',
      (s) => s.replace("{ l: 'A', s: 1, p: 10995, st: 'available' }, { l: 'A', s: 2, p: 10995", "{ l: 'A', s: 1, p: 12095, st: 'available' }, { l: 'A', s: 2, p: 10995")],
    ['the one niche MIS pulled put back on sale: G-EXT A-1 available again',
      (s) => s.replace("{ l: 'A', s: 1, p: null, st: 'notforsale' }", "{ l: 'A', s: 1, p: 7995, st: 'available' }")],
    ['not-for-sale relabelled reserved, so nobody learns MIS simply is not offering it',
      (s) => s.replace("st: 'notforsale' }", "st: 'reserved' }")],
    ['a not-for-sale niche given a price it must never render',
      (s) => s.replace("{ l: 'A', s: 1, p: null, st: 'notforsale' }", "{ l: 'A', s: 1, p: 7995, st: 'notforsale' }")],
    ['an OCCUPIED niche resurrected as available at the face price',
      (s) => s.replace("{ l: 'E', s: 5, p: null, st: 'buried' }", "{ l: 'E', s: 5, p: 13195, st: 'available' }")],
    ['a RESERVED niche resurrected as available',
      (s) => s.replace("{ l: 'E', s: 1, p: null, st: 'reserved' }", "{ l: 'E', s: 1, p: 13195, st: 'available' }")],
    ['a sold niche given back the stale price the pre-3D page carried',
      (s) => s.replace("{ l: 'E', s: 5, p: null, st: 'buried' }", "{ l: 'E', s: 5, p: 13195, st: 'buried' }")],
    ['an ON-HOLD niche stripped of the price it is allowed to show',
      (s) => s.replace("{ l: 'E', s: 5, p: 14995, st: 'hold' }", "{ l: 'E', s: 5, p: null, st: 'hold' }")],
    // The flagged exception — the specific "tidy" this track guards against.
    ["D-INT D-5 'tidied' to match its neighbours, past the operator",
      (s) => s.replace("{ l: 'D', s: 5, p: 14995, st: 'available' }", "{ l: 'D', s: 5, p: 16495, st: 'available' }")],
    // Tiers.
    ['a colour tier kept for a price no niche carries any more ($17,595)',
      (s) => s.replace("];\r\n\r\n// ── Walls", "  { p: 17595, l: '$17,595', c: 'r13', bg: '#c02f84', fg: '#fff' },\r\n];\r\n\r\n// ── Walls")],
    ['the ramp scrambled out of price order',
      (s) => s.replace("  { p: 12995, l: '$12,995', c: 'r7b', bg: '#d78a11', fg: '#0e1729' },\r\n", '')
        .replace("  { p: 16495, l: '$16,495', c: 'r12'", "  { p: 12995, l: '$12,995', c: 'r7b', bg: '#d78a11', fg: '#0e1729' },\r\n  { p: 16495, l: '$16,495', c: 'r12'")],
    ['a chip colour taken back below WCAG AA',
      (s) => s.replace("{ p: 8995, l: '$8,995', c: 'r2', bg: '#229864', fg: '#0e1729' }", "{ p: 8995, l: '$8,995', c: 'r2', bg: '#1f8f5e', fg: '#0e1729' }")],
    // The bench ruling.
    ['the benches made sellable inventory',
      (s) => s.replace("  status: 'sold',", "  status: 'available',")],
    ['the bench capacity changed from the ruling: 4 rights -> 2',
      (s) => s.replace('  rights: 4,', '  rights: 2,')],
    ['a third bench invented',
      (s) => s.replace('  count: 2,', '  count: 3,')],
    ['the inquiry reading of the benches rewritten to something sellable',
      (s) => s.replace("  misStatus: 'Reserved',", "  misStatus: 'Available',")],
    // Fees.
    ['the E.C.F. rate cut to 5%',
      (s) => s.replace('ECF_RATE: 0.1', 'ECF_RATE: 0.05')],
    ['the O&C fee moved off the schedule',
      (s) => s.replace('OC: 875,', 'OC: 835,')],
  ]);

  console.log('\nSabotage of the generator (the rendering assertions must have teeth)');
  const origBuild = fs.readFileSync(BUILD, 'utf8');
  runSet(BUILD, origBuild, [
    ['an unsellable niche leaking a data-price attribute the card could read',
      (s) => s.replace("data-price=\"${sellable(n) ? n.p : ''}\"", 'data-price="${n.p}"')],
    ['an unsellable niche given the aria-label of an available one (price read aloud)',
      (s) => s.replace('  if (!sellable(n)) return `${n.l}-${n.s}, ${faceLabel(k)}, ${st}`;',
        '  if (false) return `${n.l}-${n.s}, ${faceLabel(k)}, ${st}`;')],
    ['not-for-sale rendered exactly like reserved, so the two states merge on the wall',
      (s) => s.replace('  .st-notforsale{background:', '  .st-notforsale{display:none;background:')],
    ['the not-for-sale legend entry dropped, so the wall shows a code it never explains',
      (s) => s.replace('<div class="li"><div class="ls stleg-n"></div><span>Not for sale</span></div>\r\n      ', '')],
    ['the not-for-sale card wording replaced by the reserved one',
      (s) => s.replace('this space is not currently being offered.', 'Reserved, sold.')],
    ['the bench rights line dropped from the panel',
      (s) => s.replace('${BENCHES.rights} rights of interment</div>', '</div>')],
    ['the bench panel no longer says the benches are sold',
      (s) => s.replace('Both memorial benches have been sold', 'Memorial benches')],
    ['the bench count hard-coded past the module',
      (s) => s.replace('Array.from({ length: BENCHES.count }, (_, j) => j + 1)', '[1, 2, 3]')],
    ['a price chip rendered on an unsellable niche again',
      (s) => s.replace("const chip = sellable(n) ? `<span class=\"n3p ${tier(n.p).c}\">${money(n.p)}</span>` : '';",
        "const chip = `<span class=\"n3p ${tier(n.p).c}\">${money(n.p)}</span>`;")],
    ['a rendered "MIS" put back into the page copy (operator: never name it to a family)',
      (s) => s.replace('with the cemetery office', 'in MIS/Enterprise')],
  ]);

  let restored = 0;
  try { child([self, BASE]); } catch (e) { restored = e.status ?? 1; }
  (restored === 0 ? pass : fail)(`sources restored, gate green again -> exit ${restored}`);
  failures += sabFail;
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
assertFamilyRegister((c, m) => (c ? pass : fail)(m), 'ROAC_NicheMap.html', newSrc);

console.log(failures ? `\nRESULT: ${failures} FAILURE(S)` : '\nRESULT: PASS — 0 mismatches');
process.exit(failures ? 1 : 0);
