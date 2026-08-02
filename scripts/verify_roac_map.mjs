/**
 * Data equality gate for the ROAC 3D rebuild.
 *
 * Proves the rebuilt MAPS/ROAC_NicheMap.html carries EXACTLY the niche dataset of the
 * pre-rewrite page — same tier/space refs, same prices, same STATUSES, same counts —
 * and that the page's three renderings (3D faces, flat wall grids, print overview)
 * agree with each other and with scripts/roac-niche-data.mjs.
 *
 *   node scripts/verify_roac_map.mjs [<git-ref-of-old-page>]
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { FACE_ORDER, allNiches } from './roac-niche-data.mjs';
import { MOVEMENT_TOKENS } from './map-movement.mjs';

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
const BASE = process.argv[2] || findBaseline();

const EXPECTED_PER_FACE = 25;
const EXPECTED_TOTAL = 350;
const EXPECTED_SUM = 4318250;
const EXPECTED_ST = { available: 304, reserved: 27, buried: 17, hold: 2 };

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
    out.push({ wall: at('wall'), id: at('id'), price: +at('price'), st: at('st') });
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

// ── 4. Ref / price / STATUS equality ──────────────────────────────────────
console.log('\nRef / price / status equality (old page vs rebuilt page)');
const oldSet = new Map(Object.values(oldWalls).flat().map((c) => [key(c), sig(c)]));
for (const [name, list] of [['3D faces', from3d], ['flat wall grids', flatFull], ['print overview', flatMini], ['data module', dataMod]]) {
  const bad = [];
  if (list.length !== oldSet.size) bad.push(`count ${list.length} vs ${oldSet.size}`);
  for (const c of list) {
    const o = oldSet.get(key(c));
    if (!o) bad.push(`extra ${key(c)}`);
    else if (o !== sig(c)) bad.push(`${key(c)}: old ${o} -> new ${sig(c)}`);
  }
  const have = new Set(list.map(key));
  for (const k of oldSet.keys()) if (!have.has(k)) bad.push(`missing ${k}`);
  (bad.length === 0 ? pass : fail)(`${name}: ${bad.length ? bad.slice(0, 8).join('; ') : 'all 350 identical (ref, price, status)'}`);
}

// ── 5. Money + status totals ──────────────────────────────────────────────
const sum = (l) => l.reduce((a, c) => a + c.price, 0);
const oldSum = sum(Object.values(oldWalls).flat());
(oldSum === EXPECTED_SUM && sum(from3d) === EXPECTED_SUM && sum(flatFull) === EXPECTED_SUM ? pass : fail)(
  `total listed value unchanged: $${EXPECTED_SUM.toLocaleString('en-US')} (old $${oldSum.toLocaleString('en-US')})`);
{
  const hist = {};
  for (const c of dataMod) hist[c.st] = (hist[c.st] || 0) + 1;
  const ok = Object.keys(EXPECTED_ST).every((k) => hist[k] === EXPECTED_ST[k]) &&
    Object.keys(hist).every((k) => k in EXPECTED_ST);
  (ok ? pass : fail)(`status histogram unchanged: ${JSON.stringify(hist)} (hand-maintained live data)`);
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

console.log(failures ? `\nRESULT: ${failures} FAILURE(S)` : '\nRESULT: PASS — 0 mismatches');
process.exit(failures ? 1 : 0);
