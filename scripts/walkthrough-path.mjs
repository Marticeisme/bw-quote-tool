/**
 * The camera path for MAPS/COM_Walkthrough.html, and the runtime code that enforces it.
 *
 * WHY THIS EXISTS. The gaussian-splat reconstruction of the Chapel of Memory is only
 * photographic near the line the operator actually walked while filming. A few metres off
 * that line it dissolves into fog, and the glass-front walls never reconstructed at all
 * (a re-shoot is queued). So the page does not offer free movement it cannot honour:
 * translation is not a free variable. Every frame, immediately before anything is drawn,
 * the camera position is snapped back onto a polyline through curated stops. Looking around
 * — drag, swipe, A/D/W/S — stays completely free.
 *
 * The stops themselves live in scripts/com-walkthrough-path.json, derived from the
 * reconstruction's own camera poses. Both the builder and the verifier read that one file,
 * so the page and the screenshots that gate it cannot drift apart.
 *
 * `pathRuntimeSource()` returns the browser source injected by build_com_walkthrough.mjs.
 * It is a string rather than a file so that tests/test-walkthrough-path.mjs can evaluate the
 * SAME text the page ships and assert the clamping arithmetic directly — a presence check on
 * the built HTML would prove only that the code is there, not that it clamps.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PATH_FILE = path.join(ROOT, 'scripts', 'com-walkthrough-path.json');

/** Reads and validates scripts/com-walkthrough-path.json. */
export function loadPath(file = PATH_FILE) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const stops = data.stops;
  if (!Array.isArray(stops) || stops.length < 2) {
    throw new Error('com-walkthrough-path.json: "stops" must be an array of at least 2 stops');
  }
  stops.forEach((s, i) => {
    if (!s || typeof s.name !== 'string' || !s.name) throw new Error(`stop ${i} has no name`);
    if (!Array.isArray(s.view) || s.view.length !== 16 || s.view.some((n) => !Number.isFinite(n))) {
      throw new Error(`stop "${s.name}" must carry a 16-number view matrix`);
    }
    if (!Array.isArray(s.pos) || s.pos.length !== 3 || s.pos.some((n) => !Number.isFinite(n))) {
      throw new Error(`stop "${s.name}" must carry a 3-number camera position`);
    }
  });
  const openIndex = data.openIndex ?? 0;
  if (!Number.isInteger(openIndex) || openIndex < 0 || openIndex >= stops.length) {
    throw new Error(`openIndex ${openIndex} is not a stop index`);
  }
  return { stops, openIndex };
}

/**
 * The browser-side path constraint. Depends on nothing but the numbers passed in; the
 * viewer's own `invert4` does the matrix work at the call site in frame().
 */
export function pathRuntimeSource({ stops, openIndex }) {
  const pts = stops.map((s) => `[${s.pos.map((n) => n.toFixed(6)).join(', ')}]`).join(',\n  ');
  const names = stops.map((s) => JSON.stringify(s.name)).join(', ');
  return `// --- The filmed path -------------------------------------------------------------
// The reconstruction is photographic only near where the camera actually walked. These are
// curated viewpoints along that line; the camera is put back on this polyline every frame,
// so no gesture, key, drag or URL hash can wander off into the unreconstructed fog.
const BW_PATH = [
  ${pts}
];
const BW_PATH_NAMES = [${names}];
const BW_PATH_OPEN = ${openIndex};
let bwPathTarget = BW_PATH_OPEN;  // the stop the viewer has asked for (fractional)
let bwPathT = BW_PATH_OPEN;       // where the camera actually is; eases toward the target
// Anything not a number — a corrupt hash, a NaN out of a gesture — resolves to the opening
// stop rather than to an undefined position.
function bwClampT(t) {
    if (typeof t !== "number" || !isFinite(t)) return BW_PATH_OPEN;
    return Math.max(0, Math.min(BW_PATH.length - 1, t));
}
function bwPathPos(t) {
    t = bwClampT(t);
    const i = Math.max(0, Math.min(BW_PATH.length - 2, Math.floor(t)));
    const f = t - i;
    const a = BW_PATH[i];
    const b = BW_PATH[i + 1];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}
function bwPathAdvance(d) { bwPathTarget = bwClampT(bwPathTarget + d); }
function bwPathGo(i) { bwPathTarget = bwClampT(i); }
// Arrive immediately, with no easing. Nothing on the page calls this — it exists so the gate
// can park the camera AT a stop instead of watching it ease toward one, and so a screenshot
// is of the stop it is named after.
function bwPathSnap(i) { bwPathTarget = bwClampT(i); bwPathT = bwPathTarget; }
// Easing: the camera chases the target rather than snapping, so a scroll notch reads as a
// step forward rather than a jump cut. Snap the last fraction so it settles exactly.
function bwPathStep() {
    bwPathT = bwClampT(bwPathT + (bwPathTarget - bwPathT) * 0.09);
    if (Math.abs(bwPathTarget - bwPathT) < 5e-4) bwPathT = bwPathTarget;
    return bwPathPos(bwPathT);
}
function bwStopLabel() {
    const i = Math.max(0, Math.min(BW_PATH.length - 1, Math.round(bwPathT)));
    return "stop " + (i + 1) + " of " + BW_PATH.length;
}
function bwSyncStopLabel() {
    if (typeof document === "undefined") return;
    const el = document.getElementById("camid");
    const s = bwStopLabel();
    if (el && el.textContent !== s) el.textContent = s;
}
`;
}
