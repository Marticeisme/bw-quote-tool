/**
 * Derives a walkthrough's stop polyline from the reconstruction's OWN camera track, then
 * writes scripts/<scene>-walkthrough-path.json.
 *
 * WHY IT IS DERIVED RATHER THAN PLACED. Sprint-11 hand-placed the Chapel of Memory's seven
 * stops along a line between two chosen poses, and the sprint-11 delisting was in part a
 * consequence: a hand-placed stop can sit anywhere, including in fog. Every stop this script
 * emits is a position the camera provably occupied — a registered COLMAP pose — carrying that
 * pose's own world-to-camera matrix. So "is this viewpoint reconstructed?" stops being a
 * judgement call: the operator stood there with the camera running, which is exactly the
 * condition under which a gaussian splat is photographic.
 *
 * The polyline BETWEEN stops is the part that can still leave the reconstruction, if two
 * neighbouring stops are far apart and the walk between them curved. Two defences:
 *   - stops are resampled at even arc length along the pose track in time order, so the
 *     polyline follows the walk rather than cutting across the building, and
 *   - the track is cut wherever two consecutive registered frames are further apart than
 *     `--hop-factor` times the model's own median step, and only the longest surviving run
 *     is used. A walk that teleports (a tracking failure, a second disconnected sub-model)
 *     therefore yields a SHORTER honest path, not a long dishonest one that flies through
 *     unreconstructed space between two islands of good geometry.
 *
 * The stops are CANDIDATES until scripts/verify_walkthrough.mjs renders and measures every
 * one of them. Stops that fall below the pixel floors are culled with --drop and the page
 * rebuilt. Nothing here decides a stop looks good; it only decides where the camera went.
 *
 *   node scripts/build_walkthrough_path.mjs <SCENE> <colmap-txt-dir> [--stops N]
 *        [--hop-factor F | --max-hop M] [--drop name,name]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scene, SCENE_KEYS } from './walkthrough-scenes.mjs';

const args = process.argv.slice(2);
const KEY = args[0];
const TXT = args[1];
if (!KEY || !TXT) {
  console.error(`usage: node scripts/build_walkthrough_path.mjs <${SCENE_KEYS.join('|')}> <colmap-txt-dir> [--stops N] [--max-hop M] [--drop a,b]`);
  process.exit(2);
}
const S = scene(KEY);
const flag = (name, def, parse = Number) => {
  const i = args.indexOf(name);
  return i >= 0 ? parse(args[i + 1]) : def;
};
const WANT = flag('--stops', 9, (v) => parseInt(v, 10));
// COLMAP's world units are metres only up to an unknown global scale, so a fixed hop limit
// means something different in every scene. The default is therefore a MULTIPLE of the model's
// own median step between consecutive registered frames: at a steady walking pace that median
// is one half-second of walking, and anything eight times that is a registration gap, not a
// stride. Pass a number to override with an absolute distance.
const HOP_FACTOR = flag('--hop-factor', 8);
const MAX_HOP_ABS = flag('--max-hop', null, (v) => (v == null ? null : Number(v)));
const DROP = new Set(flag('--drop', '', String).split(',').filter(Boolean));

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'scripts', S.pathFile);

// ---- read the COLMAP model ---------------------------------------------------------------
// images.txt stores the WORLD-TO-CAMERA rotation (quaternion) and translation, which is
// exactly what the viewer's shader wants — no convention guessing.
const lines = fs.readFileSync(path.join(TXT, 'images.txt'), 'utf8').split(/\r?\n/);
const poses = [];
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (!l || l.startsWith('#')) continue;
  const p = l.trim().split(/\s+/);
  if (p.length < 10) continue;                 // the POINTS2D line
  const [, qw, qx, qy, qz, tx, ty, tz] = p.map(Number);
  poses.push({ name: p[9], q: [qw, qx, qy, qz], t: [tx, ty, tz] });
  i++;                                          // skip the POINTS2D line
}
// Frame names are zero-padded f_NNNN.jpg, so a lexical sort is the order they were filmed in.
poses.sort((a, b) => a.name.localeCompare(b.name));
if (poses.length < 4) throw new Error(`only ${poses.length} registered poses in ${TXT}`);

/** Column-major world-to-camera 4x4, the matrix the viewer draws from. */
const rot = ({ q: [w, x, y, z] }) => [
  1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y),
  2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x),
  2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y),
];
const viewMatrix = (p) => {
  const R = rot(p);
  return [R[0], R[3], R[6], 0, R[1], R[4], R[7], 0, R[2], R[5], R[8], 0, p.t[0], p.t[1], p.t[2], 1];
};
/** Camera centre in world space: C = -R^T t. */
const centre = (p) => {
  const R = rot(p);
  const [a, b, c] = p.t;
  return [
    -(R[0] * a + R[3] * b + R[6] * c),
    -(R[1] * a + R[4] * b + R[7] * c),
    -(R[2] * a + R[5] * b + R[8] * c),
  ];
};
for (const p of poses) { p.c = centre(p); p.view = viewMatrix(p); }

// ---- outlier rejection -------------------------------------------------------------------
// A badly registered frame lands somewhere absurd. Drop any pose more than 6 median-absolute
// deviations from the track's median centre before measuring anything else, so one flyaway
// cannot stretch the arc length and starve the middle of the walk of stops.
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[s.length >> 1]; };
const mc = [0, 1, 2].map((k) => med(poses.map((p) => p.c[k])));
const dists = poses.map((p) => Math.hypot(p.c[0] - mc[0], p.c[1] - mc[1], p.c[2] - mc[2]));
const mad = med(dists.map((d) => Math.abs(d - med(dists)))) || 1e-6;
const limit = med(dists) + 6 * mad;
const clean = poses.filter((p, i) => dists[i] <= limit);
console.log(`${poses.length} registered poses, ${poses.length - clean.length} rejected as outliers ` +
  `(> ${limit.toFixed(2)} from the track median)`);

// ---- split the track into runs of continuous walking ------------------------------------
const steps = clean.slice(1).map((p, i) =>
  Math.hypot(p.c[0] - clean[i].c[0], p.c[1] - clean[i].c[1], p.c[2] - clean[i].c[2]));
const MAX_HOP = MAX_HOP_ABS ?? med(steps) * HOP_FACTOR;
console.log(`median step between consecutive registered frames ${med(steps).toFixed(3)}; ` +
  `hop limit ${MAX_HOP.toFixed(3)}${MAX_HOP_ABS == null ? ` (${HOP_FACTOR}x median)` : ' (absolute)'}`);

const runs = [];
let cur = [clean[0]];
for (let i = 1; i < clean.length; i++) {
  const a = clean[i - 1].c, b = clean[i].c;
  if (Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) > MAX_HOP) { runs.push(cur); cur = []; }
  cur.push(clean[i]);
}
runs.push(cur);
const runLen = (r) => r.slice(1).reduce((s, p, i) =>
  s + Math.hypot(p.c[0] - r[i].c[0], p.c[1] - r[i].c[1], p.c[2] - r[i].c[2]), 0);
runs.sort((a, b) => runLen(b) - runLen(a));
const run = runs[0];
console.log(`${runs.length} continuous run(s); longest has ` +
  `${run.length} poses over ${runLen(run).toFixed(2)} units`);
if (run.length < WANT) throw new Error(`longest run has only ${run.length} poses, wanted ${WANT} stops`);

// ---- resample at even arc length ---------------------------------------------------------
const cum = [0];
for (let i = 1; i < run.length; i++) {
  const a = run[i - 1].c, b = run[i].c;
  cum.push(cum[i - 1] + Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
}
const total = cum[cum.length - 1];
const picks = [];
for (let k = 0; k < WANT; k++) {
  const want = (total * k) / (WANT - 1);
  let best = 0;
  for (let i = 1; i < cum.length; i++) if (Math.abs(cum[i] - want) < Math.abs(cum[best] - want)) best = i;
  if (!picks.includes(best)) picks.push(best);
}
picks.sort((a, b) => a - b);

const stops = picks.map((i, k) => ({
  name: `stop-${String(k + 1).padStart(2, '0')}`,
  frame: run[i].name,
  view: run[i].view,
  pos: run[i].c,
})).filter((s) => !DROP.has(s.name) && !DROP.has(s.frame));

// Renaming after a --drop would renumber every later stop and silently invalidate a report
// that named one; keep the original numbers and let the sequence have gaps.
if (stops.length < 2) throw new Error(`only ${stops.length} stops left after --drop`);

let minHop = Infinity, maxHop = 0;
for (let i = 1; i < stops.length; i++) {
  const d = Math.hypot(...[0, 1, 2].map((k) => stops[i].pos[k] - stops[i - 1].pos[k]));
  minHop = Math.min(minHop, d); maxHop = Math.max(maxHop, d);
}

const data = {
  note: `Generated by scripts/build_walkthrough_path.mjs ${S.key} from the reconstruction's own ` +
    `registered camera poses — every stop is a place the camera provably stood. ` +
    `scripts/verify_walkthrough.mjs ${S.key} renders and measures all of them; a stop below the ` +
    `pixel floors is culled with --drop and the page rebuilt. Do not hand-place a stop.`,
  scene: S.key,
  source: S.source,
  model: { registeredPoses: poses.length, usedPoses: run.length, trackLength: +runLen(run).toFixed(3) },
  hops: { shortest: +minHop.toFixed(3), longest: +maxHop.toFixed(3) },
  dropped: [...DROP],
  openIndex: 0,
  stops,
};
fs.writeFileSync(OUT, JSON.stringify(data, null, 2).replace(/\r?\n/g, '\r\n') + '\r\n');
console.log(`wrote ${path.relative(ROOT, OUT)}: ${stops.length} stops, hops ${minHop.toFixed(2)}–${maxHop.toFixed(2)}`);
console.log(stops.map((s) => `  ${s.name}  ${s.frame}  [${s.pos.map((n) => n.toFixed(2)).join(', ')}]`).join('\n'));
