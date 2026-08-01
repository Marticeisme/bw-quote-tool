/**
 * Data equality gate for the MVC 3D rebuild.
 *
 * Proves the rebuilt MAPS/MVC_NewGlassFront_NicheMap_1.html carries EXACTLY the niche
 * dataset of the pre-rewrite page — same refs, same prices, same rights, same wall,
 * same counts — and that the page's three renderings of that data (the 3D faces, the
 * flat wall grids, and the print overview) agree with each other and with
 * scripts/mvc-niche-data.mjs.
 *
 * Geometry differences against the old page are reported in full but are NOT failures:
 * the old page's inside-dimension strings were hand-entered before the fabrication
 * drawing was available, and several contradicted the page's own column spans.
 *
 *   node scripts/verify_mvc_map.mjs [<git-ref-of-old-page>]
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { WALLS, WALL_ORDER, allNiches, cellDims, FEES } from './mvc-niche-data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REL = 'MAPS/MVC_NewGlassFront_NicheMap_1.html';
// The baseline is the NEWEST commit whose copy of the page still uses buildGrid() —
// i.e. the last flat version, which is sprint-06's `901f4d5 [s06/mvc-niche-map] Bring
// the MVC glass-front niche map level with June 2026`.
//
// Deliberately NOT origin/main: 901f4d5 is merged locally and not pushed, so
// origin/main still carries the pre-verification page (E&D-2 refs, $1,878,000 total)
// and comparing against it reports five false failures. And deliberately not a fixed
// HEAD~n, which stops meaning anything after the rebuild lands.
function findBaseline() {
  const log = execFileSync('git', ['-C', ROOT, 'log', '--format=%H', '--', REL], { encoding: 'utf8' });
  for (const sha of log.trim().split('\n')) {
    try {
      const blob = execFileSync('git', ['-C', ROOT, 'show', `${sha}:${REL}`], { encoding: 'utf8', maxBuffer: 1 << 28 });
      if (blob.includes("buildGrid('fw'")) return sha.slice(0, 7);
    } catch { /* file absent in that commit */ }
  }
  throw new Error('no pre-rewrite version of ' + REL + ' found in history');
}
const BASE = process.argv[2] || findBaseline();

const EXPECTED = { west: 48, east: 51, north: 23, south: 23 };
const EXPECTED_TOTAL = 145;

let failures = 0;
const fail = (m) => { failures++; console.log('  FAIL  ' + m); };
const pass = (m) => console.log('  ok    ' + m);

// ── 1. The OLD page, straight out of git ──────────────────────────────────
function parseOld(src) {
  const out = {};
  const map = { fw: 'west', bw: 'east', nw: 'north', sww: 'south' };
  for (const key of Object.keys(map)) {
    const i = src.indexOf(`buildGrid('${key}'`);
    if (i < 0) throw new Error('old page: no buildGrid for ' + key);
    const body = src.slice(i, src.indexOf('\n});', i));
    const cells = [];
    for (const m of body.matchAll(/\{([^{}]*)\}/g)) {
      const t = m[1];
      if (!/c1:/.test(t)) continue;                 // skip rowDefs / labels
      if (/panel:\s*true/.test(t)) continue;        // the access panel is not sellable
      const g = (k) => { const r = new RegExp(k + ":\\s*'?([^,']*)'?").exec(t); return r ? r[1] : null; };
      cells.push({
        wall: map[key], id: g('id'), price: +g('price'), urn: +g('urn'), dim: g('dim'),
        r1: +g('r1'), r2: +g('r2'), c1: +g('c1'), c2: +g('c2'),
      });
    }
    out[map[key]] = cells;
  }
  return out;
}

const oldSrc = execFileSync('git', ['-C', ROOT, 'show', `${BASE}:${REL}`], { encoding: 'utf8', maxBuffer: 1 << 28 });
const oldWalls = parseOld(oldSrc);

// ── 2. The NEW page, parsed back out of the emitted HTML ──────────────────
const newSrc = fs.readFileSync(path.join(ROOT, REL), 'utf8');

function parseRendered(src, scopeRe, cls) {
  const out = [];
  for (const m of src.matchAll(new RegExp(`<button[^>]*class="${cls}[^"]*"[^>]*>`, 'g'))) {
    const tag = m[0];
    const at = (k) => { const r = new RegExp(`data-${k}="([^"]*)"`).exec(tag); return r ? r[1] : null; };
    if (!at('id')) continue;
    out.push({ wall: at('wall'), id: at('id'), price: +at('price'), urn: +at('urn'), mis: at('mis'), inside: at('inside') });
  }
  return out;
}
// 3D niche FRONTS only. 'n3 side3' buttons are the glass corner returns — a second
// rendering of the end walls' edge-column niches seen through the long faces — and
// they are verified separately below, never counted as openings.
const from3d = parseRendered(newSrc, null, 'n3 front3');
const fromSides = parseRendered(newSrc, null, 'n3 side3');
// The Terrace Garden niches moved off this page in sprint-08 (operator ruling: one
// home). This filter used to exclude them from the island's counts; it is kept as a
// tripwire — if a TGN cell ever comes back to this page it must not be silently folded
// into the island totals — and the move itself is asserted just below.
const fromFlat = parseRendered(newSrc, null, 'n ').filter((c) => c.wall !== 'tgn');

const key = (c) => `${c.wall}|${c.id}`;
const sig = (c) => `${c.wall}|${c.id}|${c.price}|${c.urn}`;

// The flat grids appear twice: once as the full wall view, once mini in the overview.
const flatFull = [], flatMini = [];
{
  const seen = new Set();
  for (const c of fromFlat) { (seen.has(key(c)) ? flatMini : flatFull).push(c); seen.add(key(c)); }
}

console.log(`\nMVC niche-map data equality gate   (old page: ${BASE}:${REL})\n`);

// ── 3. Counts ─────────────────────────────────────────────────────────────
console.log('Per-wall counts');
for (const w of WALL_ORDER) {
  const o = oldWalls[w].length;
  const n3 = from3d.filter((c) => c.wall === w).length;
  const nf = flatFull.filter((c) => c.wall === w).length;
  const nm = flatMini.filter((c) => c.wall === w).length;
  const ok = o === EXPECTED[w] && n3 === EXPECTED[w] && nf === EXPECTED[w] && nm === EXPECTED[w];
  (ok ? pass : fail)(`${w.padEnd(6)} expected ${String(EXPECTED[w]).padStart(3)}  old ${String(o).padStart(3)}  3D ${String(n3).padStart(3)}  flat ${String(nf).padStart(3)}  overview ${String(nm).padStart(3)}`);
}
const totals = [Object.values(oldWalls).flat().length, from3d.length, flatFull.length, flatMini.length, allNiches().length];
(totals.every((t) => t === EXPECTED_TOTAL) ? pass : fail)(`total sellable openings = ${EXPECTED_TOTAL} in all of: old page, 3D faces, flat grids, print overview, data module (${totals.join('/')})`);

const panels = (newSrc.match(/class="n3 pnl3"/g) || []).length + (newSrc.match(/class="n pnl"/g) || []).length;
(panels === 3 ? pass : fail)(`electrical access panel present once per rendering (3D + flat + overview) — found ${panels}`);

// ── 4. Ref / price / rights equality, old vs new ──────────────────────────
console.log('\nRef / price / rights equality (old page vs rebuilt page)');
const oldSet = new Map(Object.values(oldWalls).flat().map((c) => [key(c), sig(c)]));
for (const [name, list] of [['3D faces', from3d], ['flat wall grids', flatFull], ['print overview', flatMini], ['data module', allNiches().map((n) => ({ wall: n.wall, id: n.id, price: n.price, urn: n.urn }))]]) {
  const bad = [];
  if (list.length !== oldSet.size) bad.push(`count ${list.length} vs ${oldSet.size}`);
  for (const c of list) {
    const o = oldSet.get(key(c));
    if (!o) bad.push(`extra ${key(c)}`);
    else if (o !== sig(c)) bad.push(`${key(c)}: old ${o} -> new ${sig(c)}`);
  }
  const have = new Set(list.map(key));
  for (const k of oldSet.keys()) if (!have.has(k)) bad.push(`missing ${k}`);
  (bad.length === 0 ? pass : fail)(`${name}: ${bad.length ? bad.slice(0, 8).join('; ') : 'all 145 identical (ref, price, rights, wall)'}`);
}

// ── 4b. Glass corner returns ──────────────────────────────────────────────
// The long faces carry 4 corner strips x 7 rows = 28 side-glass buttons, each a
// SECOND rendering of an end-wall edge-column niche. Every one must point at a niche
// that exists in the data module with identical price/rights, the set must be exactly
// the four edge columns (c1===1 or c2===subcols+1 on north/south), and each niche must
// appear exactly once as a strip.
console.log('\nGlass corner returns (side3 strips on the long faces)');
{
  const dataSet = new Map(allNiches().map((n) => [`${n.wall}|${n.id}`, `${n.wall}|${n.id}|${n.price}|${n.urn}`]));
  const expect = new Set();
  for (const w of ['north', 'south']) {
    for (const c of WALLS[w].cells) {
      if (c.panel) continue;
      if (c.c1 === 1 || c.c2 === WALLS[w].subcols + 1) expect.add(`${w}|${c.id}`);
    }
  }
  const bad = [];
  if (fromSides.length !== 28) bad.push(`count ${fromSides.length} vs 28`);
  const seen = new Map();
  for (const c of fromSides) {
    const k = key(c);
    seen.set(k, (seen.get(k) || 0) + 1);
    if (!expect.has(k)) bad.push(`not an edge-column niche: ${k}`);
    else if (dataSet.get(k) !== sig(c)) bad.push(`${k}: data ${dataSet.get(k)} -> strip ${sig(c)}`);
  }
  for (const k of expect) if (!seen.has(k)) bad.push(`edge niche missing a strip: ${k}`);
  for (const [k, n] of seen) if (n !== 1) bad.push(`${k} rendered ${n} strips`);
  (bad.length === 0 ? pass : fail)(bad.length
    ? bad.slice(0, 8).join('; ')
    : 'all 28 strips match the four end-wall edge columns 1:1 (ref, price, rights)');
}

// ── 5. Money totals ───────────────────────────────────────────────────────
const sum = (l) => l.reduce((a, c) => a + c.price, 0);
const oldSum = sum(Object.values(oldWalls).flat());
(sum(from3d) === oldSum && sum(flatFull) === oldSum ? pass : fail)(
  `total listed value unchanged: $${oldSum.toLocaleString('en-US')}`);

// ── 6. Grid placement equality ────────────────────────────────────────────
console.log('\nGrid placement (row / column spans), old page vs data module');
const geomDeltas = [];
for (const w of WALL_ORDER) {
  const oldByRef = new Map(oldWalls[w].map((c) => [c.id, c]));
  for (const c of WALLS[w].cells) {
    if (c.panel) continue;
    const o = oldByRef.get(c.id);
    if (!o) continue;
    if (o.r1 !== c.r1 || o.r2 !== c.r2 || o.c1 !== c.c1 || o.c2 !== c.c2) {
      geomDeltas.push({ w, id: c.id, old: `r${o.r1}-${o.r2} c${o.c1}-${o.c2}`, now: `r${c.r1}-${c.r2} c${c.c1}-${c.c2}` });
    }
  }
}
if (geomDeltas.length === 0) pass('every niche occupies the same grid rows and columns as before');
else {
  console.log(`  note  ${geomDeltas.length} niche(s) re-spanned to match the fabrication drawing (prices unchanged):`);
  for (const d of geomDeltas) console.log(`          ${d.w}/${d.id}: ${d.old}  ->  ${d.now}`);
}

// ── 7. Inside-dimension deltas vs the old hand-entered strings ────────────
console.log('\nInside-dimension strings, old page vs fabrication drawing');
const dimDeltas = [];
for (const w of WALL_ORDER) {
  const oldByRef = new Map(oldWalls[w].map((c) => [c.id, c]));
  for (const c of WALLS[w].cells) {
    if (c.panel) continue;
    const o = oldByRef.get(c.id);
    if (!o || !o.dim) continue;
    const d = cellDims(WALLS[w], c);
    const oldNorm = o.dim.replace(/\s*x\s*/, ' x ').trim();
    const newNorm = d.inside.replace(/ W x /, ' x ').replace(/ H$/, '');
    if (oldNorm !== newNorm) dimDeltas.push(`${w}/${c.id}: "${oldNorm}"  ->  "${newNorm}"`);
  }
}
if (dimDeltas.length === 0) pass('all inside dimensions unchanged');
else {
  console.log(`  note  ${dimDeltas.length} inside-dimension string(s) corrected from drawing K25-377:`);
  for (const d of dimDeltas) console.log('          ' + d);
}

// ── 8. Derived dimensions vs the drawing's own per-unit tables ────────────
console.log("\nDerived dimensions vs drawing K25-377 per-unit tables");
const TABLES = {
  west: { '10-7/8"x10-1/2"': 14, '16-5/16"x10-1/2"': 4, '21-3/4"x10-1/2"': 2, '10-7/8"x12-1/2"': 16, '16-5/16"x12-1/2"': 8, '21-3/4"x12-1/2"': 2, '21-3/4"x25"': 2, '21-3/4"x31-1/2"': 1 },
  east: { '10-7/8"x10-1/2"': 13, '16-5/16"x10-1/2"': 6, '21-3/4"x10-1/2"': 4, '10-7/8"x12-1/2"': 16, '16-5/16"x12-1/2"': 8, '21-3/4"x12-1/2"': 2, '21-3/4"x25"': 2 },
  north: { '10-7/8"x10-1/2"': 6, '14-1/2"x10-1/2"': 3, '21-3/4"x10-1/2"': 1, '10-7/8"x12-1/2"': 6, '14-1/2"x12-1/2"': 6, '21-3/4"x12-1/2"': 1 },
};
TABLES.south = TABLES.north;
for (const w of WALL_ORDER) {
  const got = {};
  for (const c of WALLS[w].cells) {
    const d = cellDims(WALLS[w], c);
    const k = d.inside.replace(' W x ', 'x').replace(' H', '');
    got[k] = (got[k] || 0) + 1;
  }
  const keys = new Set([...Object.keys(TABLES[w]), ...Object.keys(got)]);
  const bad = [...keys].filter((k) => (TABLES[w][k] || 0) !== (got[k] || 0));
  (bad.length === 0 ? pass : fail)(`Unit ${WALLS[w].unit} (${w}): ${bad.length ? bad.map((k) => `${k} drawing=${TABLES[w][k] || 0} page=${got[k] || 0}`).join('; ') : `all ${Object.values(TABLES[w]).reduce((a, b) => a + b, 0)} openings match the drawing's dimension table`}`);
}

// ── 8b. The Terrace Garden has left this page ─────────────────────────────
// Operator ruling, sprint-08: one home per property. The TGN tab, its grid and its
// fee boxes come off the MVC page and a pointer to MAPS/TGMP_Map.html takes their
// place, so a counselor who knows the old route is not left at a dead end.
console.log('\nTerrace Garden moved to MAPS/TGMP_Map.html');
{
  const tgnCells = (newSrc.match(/data-wall="tgn"/g) || []).length;
  (tgnCells === 0 ? pass : fail)(`no Terrace Garden niche is rendered on this page (found ${tgnCells})`);
  const stragglers = ['psec-tgn', 'tgn-oc-qty', 'tgn-rec-qty', 'tgn-inscr-qty', 'data-prop="tgn"']
    .filter((t) => newSrc.includes(t));
  (stragglers.length === 0 ? pass : fail)(`no Terrace Garden tab, section or fee box remains${stragglers.length ? ' — ' + stragglers.join(', ') : ''}`);
  (/href="TGMP_Map\.html"/.test(newSrc) ? pass : fail)('the page links to MAPS/TGMP_Map.html in the spot the tab occupied');
  (/Terrace Garden niches have moved/.test(newSrc) ? pass : fail)('the pointer says the Terrace Garden niches have moved');
  (fs.existsSync(path.join(ROOT, 'MAPS', 'TGMP_Map.html')) ? pass : fail)('MAPS/TGMP_Map.html exists on disk');
  // The pointer must survive the printout: a printed MVC map that still advertised a
  // Terrace Garden tab would send an FSD to a page that no longer has one.
  (/\.ptabs\{border:none!important/.test(newSrc) ? pass : fail)('the pointer is not hidden by the print stylesheet');
}

// ── 8c. The uniform glass-front fee schedule (operator, 2026-07-31) ───────
// "All glass front niches should have the same opening and closing and recording fee.
//  Also there is no inscription fee on any glass front niche. The opening and closing
//  fee is 875 and the recording fee is 235 same 10% ecf applies. There will be no tax
//  on a glass front niche unless its ecl and they add the vase and scroll"
//
// The island is glass on all four faces, so: O&C $875, recording $235, E.C.F. 10%, and
// nothing else. The $660 inscription and the 10.4% tax this module used to export
// belong to the GRANITE-front locations (ROAC, Terrace Garden) and were removed here on
// 2026-07-31 — they must not come back. The literals are written out below so that
// editing mvc-niche-data.mjs alone fails this gate.
console.log('\nGlass-front fee schedule (operator ruling 2026-07-31)');
{
  (FEES.OC === 875 ? pass : fail)(`module O&C is $875 (got $${FEES.OC})`);
  (FEES.REC === 235 ? pass : fail)(`module recording fee is $235 (got $${FEES.REC})`);
  (FEES.ECF_RATE === 0.1 ? pass : fail)(`module E.C.F. rate is 10% (got ${FEES.ECF_RATE * 100}%)`);
  (!('INSCR' in FEES) ? pass : fail)('the module exports no inscription fee');
  (!('TAX' in FEES) ? pass : fail)('the module exports no sales-tax rate');
  (/Niche Inurnment O&amp;C — \$875 ea/.test(newSrc) ? pass : fail)('the fee footer prints O&C $875 ea');
  (/Recording Fee — \$235 ea/.test(newSrc) ? pass : fail)('the fee footer prints Recording Fee $235 ea');
  (/var OC = 875, REC = 235;/.test(newSrc) ? pass : fail)('the page script carries OC = 875, REC = 235');
  // Strip the two explanatory "none — ..." footer lines first, so the search for a
  // surviving inscription/tax mechanism cannot be satisfied by the notices denying one.
  const stripped = newSrc.replace(
    /<div class="fi"><span class="fl">(Inscription|Sales Tax)<\/span>[\s\S]*?<\/div>/g, '');
  (!/inscr/i.test(stripped) ? pass : fail)('no inscription amount, input or toggle survives anywhere on the page');
  (!/\bTAX\b|Sales Tax —|sales tax/i.test(stripped) ? pass : fail)('no sales-tax math or amount appears on the page');
  (/Inscription<\/span>[\s\S]{0,90}none — glass-front niches carry no inscription fee/.test(newSrc) ? pass : fail)(
    'the fee footer states there is no inscription fee');
  (/Sales Tax<\/span>[\s\S]{0,90}none — glass-front niches are not taxed/.test(newSrc) ? pass : fail)(
    'the fee footer states glass-front niches are not taxed');
}

// ── 9. Print path needs no JS ─────────────────────────────────────────────
console.log('\nPrint path');
const scripts = (newSrc.match(/<script/g) || []).length;
const printGrids = WALL_ORDER.every((w) => new RegExp(`id="wall-${w}"`).test(newSrc));
(printGrids ? pass : fail)('all four flat wall views exist as static HTML in the document');
(/@media print/.test(newSrc) && /\.psec\.active \.wview\{display:block!important/.test(newSrc) ? pass : fail)('print stylesheet forces every wall view visible without JS');
pass(`page has ${scripts} <script> block(s); none is needed to render the flat grids`);

// ── 10. The pinned card must never cover the tab bar ──────────────────────
console.log('\nPinned card vs the tab bar');
{
  // A pinned niche in a hidden view has a ZERO rect, and a card placed against zero
  // lands on the tab bar and eats the tab clicks. Found by driving the GOMN page, 2026-07-31.
  const js = newSrc.slice(newSrc.lastIndexOf('<script>'));
  (/function visibleTwin\(el\)/.test(js) ? pass : fail)('the card places itself against a rendering that is actually laid out');
  (/var t = visibleTwin\(el\);/.test(js) && /if \(!t\) \{ card\.style\.left/.test(js) ? pass : fail)(
    'and parks in its default corner when no rendering of the pinned niche is visible');
  (!/var r = el\.getBoundingClientRect\(\);\s*\r?\n\s*card\.style\.right = 'auto'/.test(js) ? pass : fail)(
    'placeCard no longer measures the pinned element directly (the zero-rect path)');
}

console.log('\n' + (failures ? `RESULT: ${failures} FAILURE(S)` : 'RESULT: PASS — 0 mismatches') + '\n');
process.exit(failures ? 1 : 0);
