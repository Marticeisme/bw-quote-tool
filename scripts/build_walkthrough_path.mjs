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
// How much faster than the track's own median pace a step may be before the pose that
// produced it is treated as mis-registered rather than as brisk walking.
const SPEED_FACTOR = flag('--speed-factor', 4);
// Frames of unregistered footage a single path segment may bridge.
const MAX_BRIDGE = flag('--max-bridge', 6, (v) => parseInt(v, 10));
const MAX_HOP_ABS = flag('--max-hop', null, (v) => (v == null ? null : Number(v)));
const DROP = new Set(flag('--drop', '', String).split(',').filter(Boolean));
// Re-aiming. `--aim "stop-03=0,25;stop-07=-20,15"` yaws/pitches a stop's opening look
// direction, in degrees, WITHOUT moving the camera.
//
// WHY THIS IS NEEDED. A stop inherits the orientation of the frame it came from, which is
// wherever the operator's phone happened to point — and while walking a memorial path that is
// mostly DOWNWARD, at flat ground markers. Ground reconstructs as a field of spikes: high
// contrast, high Laplacian, and so it clears every statistical floor while being the single
// most obviously-wrong thing a family could be shown. Position is what the reconstruction
// constrains; look direction is free, so aim it at the architecture.
// `--aim-all yaw,pitch` applies to every stop, for the common case: a whole walk filmed with
// the phone angled down at the ground. Per-stop `--aim` overrides it.
const AIM_ALL = (() => {
  const v = flag('--aim-all', '', String);
  if (!v) return null;
  const [yaw, pitch] = v.split(',').map(Number);
  return { yaw: yaw || 0, pitch: pitch || 0 };
})();
const AIM = new Map(flag('--aim', '', String).split(';').filter(Boolean).map((s) => {
  const [name, deg] = s.split('=');
  const [yaw, pitch] = String(deg).split(',').map(Number);
  return [name.trim(), { yaw: yaw || 0, pitch: pitch || 0 }];
}));

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
// "Registered" does not mean "registered CORRECTLY". A mausoleum interior is the worst case
// for structure-from-motion: crypt fronts repeat down a corridor, so a frame can match a
// different bay of the same wall and be placed metres from where it was actually shot. On the
// Chapel of Memory model 35 of 441 consecutive pairs — frames HALF A SECOND apart — came out
// 5 to 8 units apart. That is not walking, and a stop placed on one of those poses would look
// into unreconstructed space.
//
// Distance from the track's median centre does NOT catch them: they are scattered through the
// walk, not one flyaway. What catches them is TIME. The frames are a video, so a pose has an
// expected neighbourhood — a pose n frames after its predecessor cannot be further away than n
// frames' worth of walking. So reject on speed, measured against the track's own robust median
// speed rather than an absolute number (COLMAP units are metres only up to an unknown scale).
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[s.length >> 1]; };
const frameNo = (n) => parseInt(/(\d+)/.exec(n)[1], 10);
const dist = (a, b) => Math.hypot(a.c[0] - b.c[0], a.c[1] - b.c[1], a.c[2] - b.c[2]);

const speeds = poses.slice(1).map((p, i) => dist(p, poses[i]) / Math.max(1, frameNo(p.name) - frameNo(poses[i].name)));
const SPEED_CAP = med(speeds) * SPEED_FACTOR;

// Greedy walk in time order: keep a pose only if it is reachable from the last KEPT pose at no
// more than SPEED_CAP per frame. A single bad pose is skipped and the walk continues from the
// last good one, so one mis-registration costs one frame rather than cutting the path in two.
const clean = [poses[0]];
let skipped = 0;
for (let i = 1; i < poses.length; i++) {
  const prev = clean[clean.length - 1];
  const gap = Math.max(1, frameNo(poses[i].name) - frameNo(prev.name));
  if (dist(poses[i], prev) <= SPEED_CAP * gap) clean.push(poses[i]);
  else skipped++;
}
console.log(`${poses.length} registered poses; median speed ${med(speeds).toFixed(3)}/frame, ` +
  `cap ${SPEED_CAP.toFixed(3)}/frame (${SPEED_FACTOR}x); ${skipped} rejected as mis-registered, ` +
  `${clean.length} kept`);
if (clean.length < 4) throw new Error(`only ${clean.length} poses survived speed filtering`);

// ---- split the track into runs of continuous walking ------------------------------------
// After speed filtering, a large spatial step between two KEPT poses can only mean poses in
// between were rejected — the camera was somewhere we could not reconstruct. The polyline
// would cross that stretch in a straight line, which is precisely the assumption that puts a
// viewer inside a wall. So the cut is on the SIZE OF THE BRIDGE, in frames of unregistered
// footage, not on distance: over a couple of frames the straight line is a fair approximation
// of a walk, over twenty it is a guess.
const steps = clean.slice(1).map((p, i) => dist(p, clean[i]));
const MAX_HOP = MAX_HOP_ABS ?? med(steps) * HOP_FACTOR;
console.log(`median step between consecutive kept frames ${med(steps).toFixed(3)}; ` +
  `hop limit ${MAX_HOP.toFixed(3)}${MAX_HOP_ABS == null ? ` (${HOP_FACTOR}x median)` : ' (absolute)'}, ` +
  `bridge limit ${MAX_BRIDGE} frames`);

const runs = [];
let cur = [clean[0]];
for (let i = 1; i < clean.length; i++) {
  const bridge = frameNo(clean[i].name) - frameNo(clean[i - 1].name);
  if (bridge > MAX_BRIDGE || dist(clean[i], clean[i - 1]) > MAX_HOP) { runs.push(cur); cur = []; }
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

// ---- how much of the building each pose can actually SEE ---------------------------------
// Being a place the camera stood is necessary but not sufficient. The Chapel of Memory footage
// is largely the operator panning along a crypt wall at arm's length, and a pose taken from
// the middle of that pan renders a flat sheet of marble 40 cm away: correctly reconstructed,
// completely uninformative, and below the gate's detail floor because polished marble has no
// fine structure. The first COM path built this way failed its own gate at three stops out of
// three measured.
//
// The model already knows which viewpoints open out. Every registered image lists the 3D
// points it observes, so for each pose we have (a) how many points it sees — a direct measure
// of how much reconstructed geometry is in frame — and (b) the median distance to them, which
// separates "looking down a room" from "looking at a wall". Score rewards both, with depth
// capped so a pose staring across an unreconstructed void does not win on distance alone.
const pts = new Map();
for (const line of fs.readFileSync(path.join(TXT, 'points3D.txt'), 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const p = line.trim().split(/\s+/);
  if (p.length < 4) continue;
  pts.set(p[0], [Number(p[1]), Number(p[2]), Number(p[3])]);
}
// Re-read images.txt for the POINTS2D lines this time: each is "x y POINT3D_ID" triplets,
// with -1 for a feature that never triangulated.
{
  const L = fs.readFileSync(path.join(TXT, 'images.txt'), 'utf8').split(/\r?\n/);
  const byName = new Map(poses.map((p) => [p.name, p]));
  for (let i = 0; i < L.length; i++) {
    if (!L[i] || L[i].startsWith('#')) continue;
    const head = L[i].trim().split(/\s+/);
    if (head.length < 10) continue;
    const pose = byName.get(head[9]);
    const obs = (L[i + 1] || '').trim().split(/\s+/);
    i++;
    if (!pose) continue;
    const depths = [];
    for (let k = 2; k < obs.length; k += 3) {
      const xyz = obs[k] !== '-1' && pts.get(obs[k]);
      if (!xyz) continue;
      depths.push(Math.hypot(xyz[0] - pose.c[0], xyz[1] - pose.c[1], xyz[2] - pose.c[2]));
    }
    pose.nPoints = depths.length;
    pose.depth = depths.length ? med(depths) : 0;
  }
}
const depthCap = med(poses.filter((p) => p.depth).map((p) => p.depth)) * 2;
const openness = (p) => (p.nPoints || 0) * Math.min(p.depth || 0, depthCap);
console.log(`view scoring: median observed points ${med(poses.map((p) => p.nPoints || 0))}, ` +
  `median depth ${med(poses.filter((p) => p.depth).map((p) => p.depth)).toFixed(2)}, ` +
  `depth cap ${depthCap.toFixed(2)}`);

// ---- resample at even arc length ---------------------------------------------------------
const cum = [0];
for (let i = 1; i < run.length; i++) {
  const a = run[i - 1].c, b = run[i].c;
  cum.push(cum[i - 1] + Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
}
const total = cum[cum.length - 1];
// WHERE the stops go is a geometry problem, not a spacing problem. Even arc-length spacing
// says nothing about whether the straight line BETWEEN two stops follows the walk: the
// Terrace Garden path had a 3-unit segment standing in for 35 frames of curved walking, and
// the viewer eased along it would have travelled through whatever was inside that curve.
//
// Douglas-Peucker answers the actual question. It keeps exactly the vertices needed for the
// simplified polyline to stay within TOL of the real camera track, so the guarantee is
// explicit and measurable: no point on the shipped path is further than TOL from somewhere
// the camera actually was. Straight corridors cost two stops; a walk around a garden gets as
// many as its curvature demands. TOL is raised until the stop count fits the budget, so the
// number of stops is an output of the geometry rather than an input to it.
const segDist = (p, a, b) => {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const l2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
  const t = l2 ? Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / l2)) : 0;
  return Math.hypot(ap[0] - ab[0] * t, ap[1] - ab[1] * t, ap[2] - ab[2] * t);
};
const dp = (lo, hi, tol, out) => {
  let worst = -1, wi = -1;
  for (let i = lo + 1; i < hi; i++) {
    const d = segDist(run[i].c, run[lo].c, run[hi].c);
    if (d > worst) { worst = d; wi = i; }
  }
  if (worst > tol) { dp(lo, wi, tol, out); out.push(wi); dp(wi, hi, tol, out); }
};
const simplify = (tol) => {
  const mid = [];
  dp(0, run.length - 1, tol, mid);
  return [0, ...mid, run.length - 1].sort((a, b) => a - b);
};
// Start tight and relax until the path fits the stop budget.
let TOL = med(steps) * 0.5;
let keptIdx = simplify(TOL);
while (keptIdx.length > WANT && TOL < total) { TOL *= 1.3; keptIdx = simplify(TOL); }
console.log(`Douglas-Peucker: tolerance ${TOL.toFixed(3)} keeps ${keptIdx.length} vertices ` +
  `— no shipped path point is further than that from the real camera track`);

// Each retained vertex may be swapped for a nearby pose with a better view, but only one that
// is still within TOL of the vertex it replaces — so improving the view can never break the
// geometric guarantee above.
const picks = keptIdx.map((i) => {
  let best = i;
  for (let j = Math.max(0, i - 6); j <= Math.min(run.length - 1, i + 6); j++) {
    if (segDist(run[j].c, run[i].c, run[i].c) > TOL) continue;
    if (openness(run[j]) > openness(run[best])) best = j;
  }
  return best;
});
picks.sort((a, b) => a - b);
// Two adjacent buckets can both pick a pose near their shared boundary, leaving a "hop" of a
// few centimetres — a stop the viewer cannot tell they have arrived at, and one that trips
// test-walkthrough-path's distinctness check. Drop any pick that is not at least a quarter of
// the nominal spacing from the one before it.
const MIN_SEP = (total / WANT) * 0.25;
const spaced = [];
for (const i of picks) {
  if (!spaced.length || dist(run[i], run[spaced[spaced.length - 1]]) >= MIN_SEP) spaced.push(i);
}
picks.length = 0;
picks.push(...spaced);

// Positions are rounded to SIX DECIMALS here, because that is exactly the precision
// pathRuntimeSource() emits into the page (`n.toFixed(6)`). Writing full float precision into
// the data file makes the file and the page disagree in the seventh decimal — invisible to a
// viewer, but it means the shipped polyline is not the polyline the tests reason about, and
// tests/test-walkthrough-path.mjs checks that agreement to 1e-9. Round once, at the source.
const r6 = (n) => +n.toFixed(6);

/**
 * Rotate a stop's look direction without moving it.
 *
 * The view matrix is world-to-camera, [R | t] with camera centre C = -R^T t. Applying a
 * rotation Q in CAMERA space gives R' = Q R and t' = Q t, and then
 *   C' = -(QR)^T (Qt) = -R^T Q^T Q t = -R^T t = C
 * so the camera turns on the spot and the position the path clamp enforces is untouched.
 * That matters: the position is the part the reconstruction constrains, and re-aiming must
 * not quietly move a stop off the filmed line to get a better picture.
 */
const aimView = (view, { yaw, pitch }) => {
  const cy = Math.cos(yaw * Math.PI / 180), sy = Math.sin(yaw * Math.PI / 180);
  const cp = Math.cos(pitch * Math.PI / 180), sp = Math.sin(pitch * Math.PI / 180);
  const Ry = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]];   // about the camera's up axis
  const Rx = [[1, 0, 0], [0, cp, -sp], [0, sp, cp]];   // about the camera's right axis
  const Q = Rx.map((r) => [0, 1, 2].map((j) => r[0] * Ry[0][j] + r[1] * Ry[1][j] + r[2] * Ry[2][j]));
  // view is column-major: columns 0,1,2 hold R's columns; column 3 holds t.
  const R = [0, 1, 2].map((r) => [view[r], view[4 + r], view[8 + r]]);
  const t = [view[12], view[13], view[14]];
  const QR = Q.map((qr) => [0, 1, 2].map((j) => qr[0] * R[0][j] + qr[1] * R[1][j] + qr[2] * R[2][j]));
  const Qt = Q.map((qr) => qr[0] * t[0] + qr[1] * t[1] + qr[2] * t[2]);
  return [
    QR[0][0], QR[1][0], QR[2][0], 0,
    QR[0][1], QR[1][1], QR[2][1], 0,
    QR[0][2], QR[1][2], QR[2][2], 0,
    Qt[0], Qt[1], Qt[2], 1,
  ];
};

const stops = picks.map((i, k) => {
  const name = `stop-${String(k + 1).padStart(2, '0')}`;
  const aim = AIM.get(name) || AIM_ALL;
  const view = aim ? aimView(run[i].view, aim) : run[i].view;
  return {
    name,
    frame: run[i].name,
    ...(aim ? { aim } : {}),
    view: view.map(r6),
    pos: run[i].c.map(r6),
  };
}).filter((s) => !DROP.has(s.name) && !DROP.has(s.frame));

// Renaming after a --drop would renumber every later stop and silently invalidate a report
// that named one; keep the original numbers and let the sequence have gaps.
//
// BUT A GAP IS NOT A DELETION. Dropping a stop the gate measured as fog does not remove the
// fog — it removes the place the viewer would have STOPPED in it, and leaves a longer, straighter
// segment running right through it. Culling the Chapel of Memory's stops 08 and 09 turned two
// short hops into one 3.95-unit glide across the exact stretch that failed. That is the sprint-11
// delisting rebuilt by hand.
//
// So a cull SPLITS the path. Consecutive survivors that were not adjacent before the drop are no
// longer one walk, and only the longest surviving stretch ships. The reel gets shorter, which is
// the honest outcome: the footage did not cover that ground well enough to walk a family through.
if (DROP.size) {
  const groups = [[stops[0]]];
  for (let i = 1; i < stops.length; i++) {
    const prev = Number(/(\d+)/.exec(stops[i - 1].name)[1]);
    const here = Number(/(\d+)/.exec(stops[i].name)[1]);
    if (here !== prev + 1) groups.push([]);
    groups[groups.length - 1].push(stops[i]);
  }
  groups.sort((a, b) => b.length - a.length);
  if (groups.length > 1) {
    console.log(`--drop split the path into ${groups.length} stretches ` +
      `(${groups.map((g) => g.length).join(', ')} stops); keeping the longest — a culled stop is a ` +
      `region the path must not cross, not merely one it must not stand in`);
  }
  stops.length = 0;
  stops.push(...groups[0]);
}
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
  // The Douglas-Peucker tolerance this path was simplified at: the maximum distance between
  // any point on the shipped polyline and the camera track it was derived from. This is the
  // number that makes "the path never leaves the filmed line" a measurement, not a claim.
  geometry: { dpTolerance: +TOL.toFixed(4), speedCap: +SPEED_CAP.toFixed(4), maxBridge: MAX_BRIDGE },
  hops: { shortest: +minHop.toFixed(3), longest: +maxHop.toFixed(3) },
  dropped: [...DROP],
  openIndex: 0,
  stops,
};
fs.writeFileSync(OUT, JSON.stringify(data, null, 2).replace(/\r?\n/g, '\r\n') + '\r\n');
console.log(`wrote ${path.relative(ROOT, OUT)}: ${stops.length} stops, hops ${minHop.toFixed(2)}–${maxHop.toFixed(2)}`);
console.log(stops.map((s) => `  ${s.name}  ${s.frame}  [${s.pos.map((n) => n.toFixed(2)).join(', ')}]`).join('\n'));
