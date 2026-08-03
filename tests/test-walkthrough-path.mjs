// The camera-path constraint for MAPS/COM_Walkthrough.html.
//
// The walkthrough's gate (scripts/verify_com_walkthrough.mjs) drives a real browser and reads
// real pixels; it is slow and needs a GPU stack, so it is not part of `npm test`. This suite
// covers the part that can be checked in milliseconds and is the part most likely to break
// silently: the arithmetic that keeps the camera on the filmed path, and the agreement
// between the path data, the built page and the renderer's own maths.
//
// It evaluates the SAME source string that build_com_walkthrough.mjs injects into the page —
// not a copy — so a change to the clamp that a presence check would wave through fails here.
import fs from 'fs';
import path from 'path';
import { loadPath, pathRuntimeSource, PATH_FILE } from '../scripts/walkthrough-path.mjs';

const ROOT = process.cwd();
let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + String(x).split('\n')[0] : '')); }
};

// ---- the shipped path data ------------------------------------------------------------
const WALK = loadPath();
const STOPS = WALK.stops;
ok('com-walkthrough-path.json loads and validates', STOPS.length >= 2);
ok('the page opens at a real stop', STOPS[WALK.openIndex] !== undefined);

// Every stop's stored 16-number view must actually place the camera at the stored position —
// they are two views of one fact, and the gate screenshots the matrix while the runtime uses
// the position. If they drift, the pictures stop describing the walk.
const src = fs.readFileSync(path.join(ROOT, 'scripts', 'vendor', 'antimatter15-splat.js'), 'utf8');
const invert4 = new Function(src.match(/function invert4\([\s\S]*?\n}/)[0] + '; return invert4;')();
let worst = 0, worstName = '';
for (const s of STOPS) {
  const p = invert4(s.view).slice(12, 15);
  const d = Math.hypot(p[0] - s.pos[0], p[1] - s.pos[1], p[2] - s.pos[2]);
  if (d > worst) { worst = d; worstName = s.name; }
}
ok(`every stop's view matrix sits at its recorded position (worst ${worst.toExponential(1)} m, ${worstName})`, worst < 1e-4);

// Neighbouring stops must be distinct and close enough that walking between them is a step,
// not a teleport across the building.
let minHop = Infinity, maxHop = 0;
for (let i = 1; i < STOPS.length; i++) {
  const a = STOPS[i - 1].pos, b = STOPS[i].pos;
  const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  minHop = Math.min(minHop, d); maxHop = Math.max(maxHop, d);
}
ok(`stops are distinct (shortest hop ${minHop.toFixed(2)} m)`, minHop > 0.1);
ok(`no hop is a teleport (longest hop ${maxHop.toFixed(2)} m)`, maxHop < 6);
ok('stop names are unique', new Set(STOPS.map((s) => s.name)).size === STOPS.length);

// ---- the runtime arithmetic, evaluated as the page will run it -------------------------
const RUNTIME = pathRuntimeSource(WALK);
const api = new Function(
  RUNTIME + '\nreturn { bwClampT, bwPathPos, bwPathAdvance, bwPathGo, bwPathStep, bwStopLabel,' +
  ' get t() { return bwPathT; }, get target() { return bwPathTarget; }, BW_PATH, BW_PATH_OPEN };',
)();

ok('the runtime path matches the data file', JSON.stringify(api.BW_PATH.map((p) => p.map((n) => +n.toFixed(4))))
  === JSON.stringify(STOPS.map((s) => s.pos.map((n) => +n.toFixed(4)))));
ok('the runtime opens at the recorded stop', api.BW_PATH_OPEN === WALK.openIndex && api.t === WALK.openIndex);

const last = STOPS.length - 1;
ok('clamp holds the low end', api.bwClampT(-9999) === 0);
ok('clamp holds the high end', api.bwClampT(9999) === last);
ok('clamp passes an interior value through', Math.abs(api.bwClampT(1.25) - 1.25) < 1e-12);
// A NaN reaching the position maths would render the camera to nowhere and draw a black
// frame — the exact failure this page must never show a family.
ok('a NaN resolves to the opening stop, not to nowhere', api.bwClampT(NaN) === WALK.openIndex);
ok('a non-number resolves to the opening stop', api.bwClampT('over there') === WALK.openIndex);

const eq = (a, b, tol = 1e-9) => a.every((v, i) => Math.abs(v - b[i]) < tol);
ok('t at a stop index is exactly that stop', eq(api.bwPathPos(0), STOPS[0].pos) && eq(api.bwPathPos(last), STOPS[last].pos));
const mid = api.bwPathPos(0.5);
ok('t between stops is the midpoint of that segment',
  eq(mid, STOPS[0].pos.map((v, i) => (v + STOPS[1].pos[i]) / 2)));
ok('t beyond the end is the last stop, never past it', eq(api.bwPathPos(last + 50), STOPS[last].pos));
ok('t before the start is the first stop', eq(api.bwPathPos(-50), STOPS[0].pos));

// Distance-to-polyline: sample the whole parameter range, including out of range, and check
// nothing the page can produce is ever off the line.
const offPath = (p) => {
  let best = Infinity;
  for (let i = 0; i + 1 < STOPS.length; i++) {
    const a = STOPS[i].pos, b = STOPS[i + 1].pos;
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
    const l2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
    const t = Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / l2));
    best = Math.min(best, Math.hypot(ap[0] - ab[0] * t, ap[1] - ab[1] * t, ap[2] - ab[2] * t));
  }
  return best;
};
let offWorst = 0;
for (let t = -3; t <= last + 3; t += 0.017) offWorst = Math.max(offWorst, offPath(api.bwPathPos(t)));
ok(`no parameter value, in range or out, leaves the polyline (worst ${offWorst.toExponential(1)} m)`, offWorst < 1e-9);

// Advancing: a viewer holding the key down for a minute still ends on the path, at the end.
for (let i = 0; i < 5000; i++) api.bwPathAdvance(0.014);
ok('advancing forever stops at the last stop', api.target === last);
for (let i = 0; i < 400; i++) api.bwPathStep();
ok('the eased position catches up to the last stop', Math.abs(api.t - last) < 1e-3);
for (let i = 0; i < 5000; i++) api.bwPathAdvance(-0.014);
ok('retreating forever stops at the first stop', api.target === 0);
api.bwPathGo(999);
ok('jumping past the end lands on the last stop', api.target === last);
api.bwPathGo(-999);
ok('jumping before the start lands on the first stop', api.target === 0);

// Easing must actually converge, and must not overshoot on the way.
api.bwPathGo(0);
for (let i = 0; i < 400; i++) api.bwPathStep();
api.bwPathGo(last);
let steps = 0, overshoot = 0, prev = api.t;
while (Math.abs(api.t - last) > 1e-3 && steps < 5000) {
  api.bwPathStep();
  if (api.t < prev - 1e-12) overshoot++;
  prev = api.t; steps++;
}
ok(`easing converges on the target (${steps} frames, about ${(steps / 60).toFixed(1)}s at 60 fps)`, steps > 1 && steps < 400);
ok('easing never overshoots or reverses', overshoot === 0);

api.bwPathGo(2);
for (let i = 0; i < 300; i++) api.bwPathStep();
ok('the stop label counts from one', api.bwStopLabel() === `stop 3 of ${STOPS.length}`);

// ---- the built page carries this exact path --------------------------------------------
// Not a "does the file mention the path" check: the page's numbers are compared against the
// data file's, so a rebuild that never happened (or a hand-edit of the generated page) fails.
const html = fs.readFileSync(path.join(ROOT, 'MAPS', 'COM_Walkthrough.html'), 'utf8');
const m = html.match(/const BW_PATH = \[([\s\S]*?)\n\];/);
ok('the built page declares a path', !!m);
if (m) {
  const built = JSON.parse('[' + m[1].replace(/\s+/g, ' ').trim() + ']');
  ok(`the built page carries all ${STOPS.length} stops`, built.length === STOPS.length);
  let bad = 0;
  built.forEach((p, i) => {
    const q = STOPS[i]?.pos || [];
    if (!p.every((v, k) => Math.abs(v - q[k]) < 1e-5)) bad++;
  });
  ok('the built page is in sync with com-walkthrough-path.json', bad === 0,
    `${bad} stop(s) differ — run: node scripts/build_com_walkthrough.mjs`);
  const names = html.match(/const BW_PATH_NAMES = \[(.*?)\];/);
  ok('the built page carries the stop names',
    !!names && JSON.parse('[' + names[1] + ']').join('|') === STOPS.map((s) => s.name).join('|'));
  const open = html.match(/const BW_PATH_OPEN = (\d+);/);
  ok('the built page opens at the recorded stop', !!open && +open[1] === WALK.openIndex);
}

// The upstream free-flight controls must be gone from the shipped page, not merely overridden
// somewhere later: any one of them left in place is a way off the path. (Drag-to-look keeps
// its translate4/rotate4/translate4 pivot — that is a rotation about a point in front of the
// camera, and the clamp puts the position back regardless.)
const wheel = (html.match(/window\.addEventListener\(\s*"wheel",([\s\S]*?)\{ passive: false \},\s*\);/) || [])[1] || '';
ok('the wheel handler moves along the path and nowhere else',
  /bwPathAdvance\(/.test(wheel) && !/translate4|rotate4/.test(wheel));
ok('the page no longer translates on the arrow keys', !/inv = translate4\(inv, 0, 0, 0\.1\);/.test(html));
ok('the page no longer offsets the eye on a jump', !/translate4\(inv2, 0, -jumpDelta, 0\)/.test(html));
ok('the page draws through the path clamp', /bwPathStep\(\)/.test(html) && /let actualViewMatrix = viewMatrix;/.test(html));

// The label a family reads. Preview wording, no jargon, no "MIS".
// Matched against the note with runs of whitespace collapsed, because that is what a reader
// actually sees: HTML folds newlines into spaces. Asserting on the raw source instead would
// make these checks fail whenever the builder's paragraph happens to rewrap — which is a
// change to nothing at all, and the sort of false alarm that teaches people to edit the test.
const note = (html.match(/<div class="note">([\s\S]*?)<\/div>/) || [])[1] || '';
const noteText = note.replace(/\s+/g, ' ');
ok('the page calls itself a preview', /photographic preview/i.test(noteText));
ok('the page still says it is not a survey drawing', /not a survey drawing/i.test(noteText));
ok('the page says more of the building is coming', /still to come|more of the building/i.test(noteText));
ok('the page still points at the crypt map', /COM_CryptMap\.html/.test(noteText));
ok('the page never says MIS', !/\bMIS\b/.test(html));
ok('the movement hint matches what the controls now do',
  /scroll[^<]*arrow keys/i.test(noteText) && !/two fingers or scroll to move/i.test(noteText));

ok('the path file is where the builder and the verifier both look', fs.existsSync(PATH_FILE));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
