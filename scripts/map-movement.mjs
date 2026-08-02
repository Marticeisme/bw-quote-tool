/**
 * SHARED 3D-CAMERA MOVEMENT RUNTIME for the generated map pages.
 *
 * The COM walkthrough (scripts/build_com_map.mjs) is the source of truth for how a
 * Bonney Watson 3D map is supposed to FEEL. Its movement block was written against
 * yomotsu/camera-controls' semantics — that library is three.js-bound and so cannot be
 * vendored onto a CSS-3D scene, only its behaviour can be taken:
 *
 *   1. TIME-BASED exponential damping, normalised to wall-clock rather than to frames,
 *      so the same gesture lasts the same ~0.7 s on a 120 Hz phone and in a throttled
 *      tab, with dt clamped so a backgrounded tab cannot teleport the camera.
 *   2. A SETTLE threshold that ends the rAF loop instead of spinning at ever-smaller
 *      deltas forever.
 *   3. DRAG INERTIA: a flick releases into a coast that decays to a stop; a slow,
 *      careful drag that had already stopped before you lifted your finger does not.
 *   4. EASED, INTERRUPTIBLE transitions to a preset — covering the FULL camera state,
 *      not just the two angles — so a preset arrives instead of cutting.
 *   5. ZOOM-SCALED rotate speed, so close-in control stays fine-grained.
 *   6. prefers-reduced-motion: every one of the above becomes an instant assignment.
 *   7. stopGlide() on ANY input — pointer, wheel or key — so the camera stops exactly
 *      where you grabbed it and never fights you.
 *
 * ── THE CONTRACT THIS MUST NOT BREAK ──────────────────────────────────────────
 * DRAG NEVER SELECTS. The tap detector on every one of these pages keys off POINTER
 * TRAVEL (the `moved` accumulator) and off nothing else. It must NOT be keyed off
 * camera motion, and the inertia must NOT extend the click-suppression window, because
 * the camera now keeps moving after the finger has left the glass — a suppression
 * window tied to camera motion would swallow the NEXT tap. `moved <= 8` and
 * `suppressUntil = now + 450` are left exactly as they were on all four pages.
 *
 * ── HOW A PRESET IS EASED ─────────────────────────────────────────────────────
 * `easeThrough(fn)` runs the page's OWN, unmodified preset solve to find where the
 * camera should end up, reads the result off `cam`, puts the camera back, and eases to
 * it. The fit maths is never re-derived or duplicated here — which also means a solve
 * that MEASURES the DOM (TGMP's `refit`) still measures at the final camera state and
 * stays exactly as accurate as it was when the transition was a cut.
 *
 * Anything the solve did that is NOT camera state — lighting a preset button, fading an
 * occluding bank, switching MVC into plan mode — is deliberately left applied
 * immediately. Only the camera eases.
 *
 * Consumers: build_ecl_map.mjs, build_mvc_map.mjs, build_roac_map.mjs,
 * build_tgmp_map.mjs. The COM page keeps its own copy: it is a first-person walkthrough
 * with an eye position and a floor-travel target, a strictly larger camera than these
 * four orbit cameras, and collapsing the two would mean carrying COM's eye maths into
 * pages that have no eye.
 */

/**
 * Per-key settle epsilon: how close is "arrived". Degrees for angles, a bare zoom
 * factor for zoom, pixels for the translational keys.
 */
const EPS = { yaw: 0.05, pitch: 0.05, zoom: 0.002, lift: 0.5, panx: 0.5, pany: 0.5 };

/**
 * Emit the movement runtime.
 *
 * @param {string[]} keys  every camera field an eased transition must carry. Pass the
 *                         page's WHOLE camera: leaving one out means that field cuts
 *                         while the others glide, which is the bug this replaced.
 * @param {number}  rotYaw    page's existing degrees-of-yaw per pixel of drag
 * @param {number}  rotPitch  page's existing degrees-of-pitch per pixel of drag
 */
export function movementRuntime({ keys, rotYaw = 0.35, rotPitch = 0.28 }) {
  for (const k of keys) {
    if (!(k in EPS)) throw new Error(`map-movement: no settle epsilon for camera key '${k}'`);
  }
  const epsLit = keys.map((k) => `${k}: ${EPS[k]}`).join(', ');
  return `
// ── MOVEMENT ─────────────────────────────────────────────────────────────────
// Generated from scripts/map-movement.mjs — camera-controls semantics ported from the
// COM walkthrough. Damping is TIME-based, the glide settles instead of spinning, a
// flick coasts, presets ease and are interruptible, rotate speed scales with zoom, and
// prefers-reduced-motion turns all of it into instant assignment.
//
// DRAG NEVER SELECTS: the tap detector below keys off POINTER TRAVEL only. Nothing in
// here touches \`moved\` or \`suppressUntil\`.
var DAMP = 0.90, SETTLE = 0.045, CAM_EASE = 0.916;
// One arrow press is an IMPULSE, not a jump. Scaling it by (1 - DAMP) makes the coast
// it produces sum to the same travel the old instant step had, so the keyboard still
// moves exactly as far per press as the page's hint text has always promised — it just
// arrives smoothly now.
var KICK_GAIN = 1 - DAMP;
var CAM_KEYS = ${JSON.stringify(keys)}, CAM_EPS = { ${epsLit} };
var vYaw = 0, vPitch = 0, glideRaf = 0, lastGlideAt = 0, lastMoveAt = 0, camT = null;
var REDUCED = false;
try { REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { REDUCED = false; }
/** Finer rotation the closer you are standing; coarser out on the wide view. */
function rotScale() { return clamp(1.1 / (0.4 + cam.zoom), 0.35, 1.4); }
function camState() { var s = {}, i; for (i = 0; i < CAM_KEYS.length; i++) s[CAM_KEYS[i]] = cam[CAM_KEYS[i]]; return s; }
function setCam(s) { for (var i = 0; i < CAM_KEYS.length; i++) cam[CAM_KEYS[i]] = s[CAM_KEYS[i]]; }
/** Shortest way round: yaw accumulates without bound, so -36 -> 180 must turn 144, not 216. */
function wrap180(a) { a = a % 360; if (a > 180) a -= 360; if (a < -180) a += 360; return a; }

function stopGlide() {
  vYaw = vPitch = 0; camT = null;
  if (glideRaf) { cancelAnimationFrame(glideRaf); glideRaf = 0; }
  lastGlideAt = 0;
  if (!captured) scene.classList.remove('dragging');
}
function startGlide() {
  scene.classList.add('dragging');   // kills the CSS transition; the rAF loop drives
  lastGlideAt = 0;
  if (!glideRaf) glideRaf = requestAnimationFrame(glide);
}
function glide(ts) {
  glideRaf = 0;
  var live = false, i, k;
  // TIME-BASED decay. A fixed per-frame factor is a different gesture on a 120 Hz phone
  // than in a throttled tab; normalising to 60 Hz makes the glide last the same
  // everywhere. dt is clamped so a backgrounded tab does not teleport the camera.
  var now = typeof ts === 'number' ? ts : performance.now();
  var dt = clamp(now - (lastGlideAt || now), 1, 100);
  lastGlideAt = now;
  var d = Math.pow(DAMP, dt / 16.67);
  if (camT) {
    var ce = 1 - Math.pow(CAM_EASE, dt / 16.67), done = true;
    for (i = 0; i < CAM_KEYS.length; i++) {
      k = CAM_KEYS[i];
      if (Math.abs(camT[k] - cam[k]) >= CAM_EPS[k]) { done = false; break; }
    }
    if (done) { setCam(camT); camT = null; }
    else {
      for (i = 0; i < CAM_KEYS.length; i++) { k = CAM_KEYS[i]; cam[k] += (camT[k] - cam[k]) * ce; }
      live = true;
    }
  }
  vYaw *= d; vPitch *= d;
  if (Math.abs(vYaw) >= SETTLE || Math.abs(vPitch) >= SETTLE) {
    cam.yaw += vYaw; cam.pitch += vPitch;
    live = true;
  } else { vYaw = vPitch = 0; }
  apply();
  if (live) glideRaf = requestAnimationFrame(glide);
  else if (!captured) scene.classList.remove('dragging');
}

/**
 * Ease to wherever \`fn\` puts the camera. \`fn\` is the page's own preset solve and is
 * run unmodified — including any solve that measures the DOM, which therefore still
 * measures at the final state. Pass quiet = true to snap instead (resize, first paint):
 * a window resize must not animate.
 */
function easeThrough(fn, quiet) {
  var from = camState();
  stopGlide();
  fn();
  if (quiet || REDUCED) return;
  var to = camState();
  to.yaw = from.yaw + wrap180(to.yaw - from.yaw);
  setCam(from); apply();
  camT = to;
  startGlide();
}

/** An input impulse: pushes the camera and lets it coast to a stop. */
function kick(dYaw, dPitch) {
  if (REDUCED) { cam.yaw += dYaw / KICK_GAIN; cam.pitch += dPitch / KICK_GAIN; apply(); return; }
  camT = null;
  vYaw = clamp(vYaw + dYaw, -14, 14);
  vPitch = clamp(vPitch + dPitch, -14, 14);
  startGlide();
}

/** Drag deltas -> camera, at a rotate speed that scales with how close you are. */
function orbitBy(dx, dy) {
  var k = rotScale();
  var dYaw = dx * ${rotYaw} * k, dPitch = -dy * ${rotPitch} * k;
  cam.yaw += dYaw; cam.pitch += dPitch;   // apply() clamps pitch
  // Remember the LAST frame's motion and when it happened, so a flick releases into a
  // glide but a slow careful drag that had stopped before you lifted does not.
  vYaw = dYaw; vPitch = dPitch; lastMoveAt = performance.now();
  apply();
}

/**
 * Called from endPtr the moment the last pointer lifts, BEFORE the tap is dispatched.
 * Returns nothing and reads nothing but pointer travel, so it cannot change whether a
 * gesture counted as a tap.
 */
function releaseGesture(movedPx) {
  var flick = captured && movedPx > 8 && performance.now() - lastMoveAt < 90 && !REDUCED
    && (Math.abs(vYaw) > 0.25 || Math.abs(vPitch) > 0.25);
  captured = false;
  if (flick) startGlide();
  else { stopGlide(); scene.classList.remove('dragging'); }
}
// ── end MOVEMENT ─────────────────────────────────────────────────────────────
`;
}

/**
 * Tokens every consumer page must carry. The per-map gates assert these so that a page
 * regenerated from a build script that quietly dropped the block fails loudly instead of
 * silently reverting to cut transitions and no inertia.
 */
export const MOVEMENT_TOKENS = [
  ['var DAMP = 0.90, SETTLE = 0.045, CAM_EASE = 0.916;', 'the damping, settle and ease constants'],
  // Each of these is a whole EXPRESSION, not a function name. A name-only token passes
  // against a function whose body has been gutted — proven on 2026-08-01 by flattening
  // rotScale() to `return 1` and watching all four gates stay green.
  ['Math.pow(DAMP, dt / 16.67)', 'the inertia decay is normalised to wall-clock, not to frames'],
  ['Math.pow(CAM_EASE, dt / 16.67)', 'and so is the preset ease'],
  ['clamp(now - (lastGlideAt || now), 1, 100)', 'a backgrounded tab cannot teleport the camera'],
  ['clamp(1.1 / (0.4 + cam.zoom), 0.35, 1.4)', 'rotate speed scales with zoom'],
  ['var k = rotScale();', 'and the drag handler actually applies that scale'],
  ['Math.abs(vYaw) >= SETTLE || Math.abs(vPitch) >= SETTLE', 'the glide settles instead of spinning'],
  ['setCam(from); apply();', "a preset eases FROM where the camera is, through the page's own solve"],
  ['cam[k] += (camT[k] - cam[k]) * ce;', 'and interpolates every camera key on the way'],
  ['if (glideRaf) { cancelAnimationFrame(glideRaf); glideRaf = 0; }', 'any input can stop the camera dead'],
  ['prefers-reduced-motion: reduce', 'reduced motion is honoured'],
  ['movedPx > 8', 'the flick test reads POINTER TRAVEL, never camera motion'],
  ['a = a % 360; if (a > 180) a -= 360;', 'a preset turns the short way round'],
];
