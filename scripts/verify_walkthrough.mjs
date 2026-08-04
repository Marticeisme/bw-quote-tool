/**
 * Verifies one gaussian-splat walkthrough page — MAPS/<SCENE>_Walkthrough.html — actually
 * renders, actually responds to input, and is actually still delisted.
 *
 * It is deliberately not a DOM-only check. A splat page can have perfect markup and draw a
 * black rectangle, so this reads real framebuffer pixels: it forces `preserveDrawingBuffer`
 * on the WebGL2 context via an init script, then calls `gl.readPixels` and computes coverage,
 * colour spread and fine detail. "The pixels changed" proves nothing about the controls, so
 * every control assertion reads the live camera matrix the page exposes as
 * `window.bwWalkthrough.view`.
 *
 * Since sprint-11 the camera is CONFINED to the filmed path (scripts/<scene>-walkthrough-path.json
 * — the reconstruction is only photographic near where the operator walked). Two consequences
 * for this file: it parks the camera at every stop on that path and asserts each one still
 * renders like a photograph rather than fog, which is what makes "it looks decent" a gate
 * instead of an opinion; and it tries to escape the path with everything a viewer has —
 * right-drag, modifier-scroll, pinch, jump, a matrix in the URL hash — and asserts the camera
 * is still on the polyline afterwards.
 *
 * It also serves the asset the way PRODUCTION does. GitHub Pages gzips the .splat, so the
 * Content-Length header is the COMPRESSED byte count; the dev server sends it uncompressed,
 * where Content-Length happens to equal the decoded size. An earlier loader bug that derived
 * a buffer size from that header was therefore invisible here and black on the live site. So
 * the full render pass now runs behind a gzipping proxy, and the page must report a
 * vertexCount that is exactly assetBytes/32 — a number it can only get by counting whole
 * 32-byte rows off the wire. A short second pass re-checks the uncompressed path.
 *
 * Screenshots for a human to LOOK at are written to scratch/s14a-renders/ (gitignored) —
 * one per stop on the filmed path, named for the scene and the stop. The numbers below are a
 * floor, not a verdict: they catch a black or fogged frame, and a person looking at these
 * catches the rest.
 *
 * RUNTIME: roughly 25–45 minutes per scene under SwiftShader (software WebGL2 drawing ~750k
 * splats at one to three frames a second). That is why this is NOT wired into `npm test` —
 * run it deliberately when a walkthrough surface changes. The parts that CAN run in
 * milliseconds live in tests/test-walkthrough-path.mjs and tests/test-family-register.mjs,
 * and the delisting is asserted in both places on purpose.
 *
 *   node scripts/verify_walkthrough.mjs COM|TG|ELM
 */
import fs from 'node:fs';
import net from 'node:net';
import http from 'node:http';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { loadPath, pathFileFor } from './walkthrough-path.mjs';
import { scene, SCENES, SCENE_KEYS } from './walkthrough-scenes.mjs';

const KEY = process.argv[2];
if (!KEY) {
  console.error(`usage: node scripts/verify_walkthrough.mjs <${SCENE_KEYS.join('|')}>`);
  process.exit(2);
}
const S = scene(KEY);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'scratch', 's14a-renders');
const PAGE = S.page;
const ASSET = path.join(ROOT, 'MAPS', S.asset);
// 30 MB is the sprint-14 budget per scene; 60 MB is the hard ceiling the loader was measured
// against. Both are asserted so a scene that creeps over budget is visible before it is huge.
const BUDGET_BYTES = 30 * 1024 * 1024;
const MAX_ASSET_BYTES = 60 * 1024 * 1024;

let fails = 0;
let checks = 0;
const ok = (m) => { checks++; console.log(`  ok    ${m}`); };
const fail = (m) => { fails++; checks++; console.log(`  FAIL  ${m}`); };
const head = (m) => console.log(`\n${m}`);

const freePort = () => new Promise((res, rej) => {
  const s = net.createServer();
  s.on('error', rej);
  s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
});

/**
 * Production-shaped front end for the dev server: everything is passed through untouched
 * except the .splat, which is gzipped with `Content-Encoding: gzip` and a `Content-Length`
 * equal to the COMPRESSED size — exactly what GitHub Pages sends.
 */
function startGzipProxy(upstreamPort, port) {
  let cached = null;
  const server = http.createServer(async (req, res) => {
    try {
      const up = await fetch(`http://127.0.0.1:${upstreamPort}${req.url}`);
      const raw = Buffer.from(await up.arrayBuffer());
      const headers = { 'Content-Type': up.headers.get('content-type') || 'application/octet-stream' };
      let body = raw;
      if (req.url.split('?')[0].endsWith('.splat')) {
        body = cached ||= zlib.gzipSync(raw, { level: 6 });
        headers['Content-Encoding'] = 'gzip';
      }
      headers['Content-Length'] = String(body.length);
      res.writeHead(up.status, headers);
      res.end(body);
    } catch (e) {
      res.writeHead(502);
      res.end(String(e));
    }
  });
  return new Promise((r) => server.listen(port, '127.0.0.1', () => r(server)));
}

/** What the page says it loaded, and how the asset actually arrived over the wire. */
const loadFacts = (page) => page.evaluate(() => {
  const e = performance.getEntriesByType('resource').find((r) => r.name.endsWith('.splat'));
  return {
    vertexCount: window.bwWalkthrough?.vertexCount ?? null,
    bytesRead: window.bwWalkthrough?.bytesRead ?? null,
    transferSize: e ? e.transferSize : null,
    decodedBodySize: e ? e.decodedBodySize : null,
  };
});

// The filmed path: the ONLY viewpoints the page can occupy. Same file the builder reads, so
// a stop that ships is a stop that gets screenshotted and measured here.
const WALK = loadPath(pathFileFor(S.key));
const STOPS = WALK.stops;

// What "this stop still looks like a photograph" means numerically. Derived from measuring
// the real thing (sprint-11 scratch/s11f-renders/): every shipped stop clears these with margin, while
// a position pushed off the path into the fog or the void does not.
//
// `lit` is the floor against a black or near-black frame — the failure a position outside the
// reconstruction produces. `detail` is the mean absolute Laplacian: fog is smooth, a
// photograph has edges, so it is the one number that separates "reconstructed" from "smeared"
// rather than merely "not blank". Neither is a substitute for looking at the screenshots,
// which is why every stop still writes one.
//
// Measured under SwiftShader, 2026-08-02: the shipped stops run lit 88.9–99.8% and detail
// 7.71–11.67. `mid-room` is the floor on both — it looks down a dark aisle, so a fifth of the
// frame is genuinely unlit, which is why LIT_MIN is 0.85 and not the 0.90 first tried. A
// position outside the reconstruction is nowhere near either number.
const LIT_MIN = 0.85;
const STDEV_MIN = 12;
const COLOURS_MIN = 60;
const DETAIL_MIN = 6.0;

async function pixelStats(page) {
  return page.evaluate(() => {
    const c = document.getElementById('canvas');
    const gl = c.getContext('webgl2');
    const w = Math.min(c.width, 480), h = Math.min(c.height, 480);
    const px = new Uint8Array(w * h * 4);
    gl.readPixels((c.width - w) >> 1, (c.height - h) >> 1, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let lit = 0, sum = 0, sum2 = 0, n = w * h;
    const hist = new Set();
    const lum = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
      const v = (r + g + b) / 3;
      lum[i] = v;
      if (v > 12) lit++;
      sum += v; sum2 += v * v;
      hist.add((r >> 4) << 8 | (g >> 4) << 4 | (b >> 4));
    }
    // Mean absolute Laplacian — fine detail. Smeared fog is locally smooth; a reconstructed
    // surface (a stained-glass came, a name plate, a chair leg) is not.
    let dsum = 0, dn = 0;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        dsum += Math.abs(4 * lum[i] - lum[i - 1] - lum[i + 1] - lum[i - w] - lum[i + w]);
        dn++;
      }
    }
    const mean = sum / n;
    return {
      litFraction: lit / n, mean, stdev: Math.sqrt(sum2 / n - mean * mean),
      colours: hist.size, detail: dsum / dn,
    };
  });
}

/** One line describing a rendered frame, used in every pass/fail message below. */
const describe = (name, s) =>
  `${name}: lit ${(s.litFraction * 100).toFixed(1)}%, mean ${s.mean.toFixed(1)}, ` +
  `stdev ${s.stdev.toFixed(1)}, ${s.colours} distinct colours, detail ${s.detail.toFixed(2)}`;

(async () => {
  head('Committed asset');
  if (!fs.existsSync(ASSET)) { fail(`${path.relative(ROOT, ASSET)} does not exist`); process.exit(1); }
  const bytes = fs.statSync(ASSET).size;
  const mb = (bytes / 1048576).toFixed(2);
  if (bytes <= BUDGET_BYTES) ok(`MAPS/${S.asset} is ${mb} MB (sprint-14 budget 30.00 MB)`);
  else if (bytes <= MAX_ASSET_BYTES) fail(`MAPS/${S.asset} is ${mb} MB — over the 30 MB budget`);
  else fail(`MAPS/${S.asset} is ${mb} MB — over the 60 MB hard cap`);
  if (bytes % 32 === 0) ok(`asset is a whole number of 32-byte splats (${bytes / 32})`);
  else fail(`asset size ${bytes} is not a multiple of the 32-byte splat row`);

  head('Self-containment');
  const html = fs.readFileSync(path.join(ROOT, PAGE), 'utf8');
  const ext = [...html.matchAll(/https?:\/\/[^\s"'<>)]+/g)].map((m) => m[0]);
  if (ext.length === 0) ok('page contains no http(s) URL at all — nothing can load cross-origin');
  else fail(`page references ${ext.length} external URL(s): ${ext.slice(0, 3).join(', ')}`);

  const port = await freePort();
  const server = spawn(process.execPath, [path.join(ROOT, 'dev-server.mjs')], {
    env: { ...process.env, PORT: String(port) }, stdio: 'ignore',
  });
  const plainBase = `http://127.0.0.1:${port}`;
  await new Promise((r) => setTimeout(r, 700));

  // The whole suite below runs production-shaped: the .splat arrives gzipped.
  const proxyPort = await freePort();
  const proxy = await startGzipProxy(port, proxyPort);
  const base = `http://127.0.0.1:${proxyPort}`;

  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 }, deviceScaleFactor: 1 });
  const errors = [];
  ctx.on('weberror', (e) => errors.push(String(e.error())));

  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('requestfailed', (r) => errors.push(`request failed: ${r.url()}`));

  // The viewer creates its context without preserveDrawingBuffer, which would make
  // readPixels return a cleared buffer. Force it on before any page script runs — on the
  // CONTEXT, so the second (uncompressed-transport) page gets it too. Adding it to the first
  // page only made that page's readPixels honest and the second page's silently all-zero.
  await ctx.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, attrs) {
      if (type === 'webgl2' || type === 'webgl') attrs = { ...(attrs || {}), preserveDrawingBuffer: true };
      return orig.call(this, type, attrs);
    };
  });

  head('Served tree');
  const served = await (await page.request.get(`${base}/__served-tree`)).json();
  if (path.resolve(served.servedTreeRoot) === ROOT) ok(`dev-server on ${port} serves this tree`);
  else fail(`dev-server serves ${served.servedTreeRoot}, not ${ROOT}`);

  head('Page load and first render (asset served GZIPPED, as production does)');
  await page.goto(`${base}/${PAGE}`, { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.getElementById('spinner')?.style.display === 'none',
    null, { timeout: 120000 },
  ).then(() => ok('loader finished (spinner hidden)'), () => fail('splat never finished loading'));
  await page.waitForTimeout(2500);

  const msg = (await page.locator('#message').innerText()).trim();
  if (!msg) ok('no error message on the page');
  else fail(`page shows an error: ${msg}`);

  // The reason this whole gzip apparatus exists. If any sizing still came from
  // Content-Length, this is the number that would come back fractional or short.
  head('Sizing comes from bytes received, not from Content-Length');
  const gz = await loadFacts(page);
  if (gz.transferSize !== null && gz.decodedBodySize === bytes && gz.transferSize < bytes) {
    ok(`asset really arrived compressed: ${gz.transferSize} bytes on the wire, ${gz.decodedBodySize} decoded`);
  } else {
    fail(`asset did not arrive gzipped as production serves it: ${JSON.stringify(gz)} (asset is ${bytes} bytes)`);
  }
  const expectVerts = bytes / 32;
  if (gz.vertexCount === expectVerts && Number.isInteger(gz.vertexCount)) {
    ok(`page reports vertexCount ${gz.vertexCount} — exactly assetBytes/32, an integer`);
  } else {
    fail(`page reports vertexCount ${gz.vertexCount}, expected exactly ${expectVerts} (assetBytes/32)`);
  }
  if (gz.bytesRead === bytes) ok(`page read all ${gz.bytesRead} decoded bytes off the stream`);
  else fail(`page read ${gz.bytesRead} bytes, expected ${bytes}`);

  fs.mkdirSync(SHOTS, { recursive: true });

  // Any real click stops the auto-orbit, so the named viewpoints hold still.
  await page.mouse.click(550, 400);
  await page.waitForTimeout(300);

  head('Rendered pixels at every stop on the filmed path');
  for (let si = 0; si < STOPS.length; si++) {
    const { name, view, pos } = STOPS[si];
    // Setting the view matrix alone is NOT enough any more: the page overwrites the camera
    // position from the path on every frame, so a matrix pushed in from outside contributes
    // only its rotation. Without the snap, all seven "stops" would render at the opening
    // position wearing seven different headings — seven passing checks of one place.
    await page.evaluate(([v, i]) => {
      window.bwWalkthrough.view = v;
      window.bwWalkthrough.snap(i);
    }, [view, si]);
    // Headless runs on SwiftShader (software WebGL2), one to two orders of magnitude slower
    // than the GPU a family actually uses — a fixed sleep is not enough. Wait for real
    // rendered frames instead. A first pass used `waitForTimeout(6000)` and two different
    // viewpoints came back with byte-identical pixel statistics: the screenshots were of a
    // stale frame, and the check "passed" without ever drawing the view it named.
    await page.evaluate(() => new Promise((resolve) => {
      let n = 0;
      const tick = () => (++n >= 10 ? resolve(n) : requestAnimationFrame(tick));
      requestAnimationFrame(tick);
    }), { timeout: 180000 });
    // Prove the frame just measured is of THIS stop, not of wherever the camera happened to
    // be: read the position back out of the matrix the renderer drew from.
    const where = await page.evaluate(() => invert4(window.bwWalkthrough.view).slice(12, 15));
    const off = Math.hypot(where[0] - pos[0], where[1] - pos[1], where[2] - pos[2]);
    if (off < 1e-4) ok(`camera is standing at "${name}" (${off.toExponential(1)} m off)`);
    else fail(`camera is ${off.toFixed(3)} m from stop "${name}" — the frame below is of somewhere else`);

    const s = await pixelStats(page);
    await page.screenshot({ path: path.join(SHOTS, `${S.key}-${name}.png`), timeout: 180000 });
    const desc = describe(name, s);
    if (s.litFraction >= LIT_MIN && s.stdev > STDEV_MIN && s.colours > COLOURS_MIN && s.detail >= DETAIL_MIN) {
      ok(desc);
    } else {
      fail(`${desc} — below the floor (lit ${(LIT_MIN * 100).toFixed(0)}%, stdev ${STDEV_MIN}, ` +
           `${COLOURS_MIN} colours, detail ${DETAIL_MIN}): this stop is blank, flat or fogged`);
    }
  }

  head('Controls');
  const before = await page.evaluate(() => window.bwWalkthrough.view);
  await page.mouse.move(550, 400);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(550 + i * 14, 400 + i * 3);
  await page.mouse.up();
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => window.bwWalkthrough.view);
  const delta = before.reduce((a, v, i) => a + Math.abs(v - after[i]), 0);
  if (delta > 0.05) ok(`mouse drag rotated the camera (matrix delta ${delta.toFixed(3)})`);
  else fail(`mouse drag did not move the camera (matrix delta ${delta.toFixed(3)})`);

  const beforeT = await page.evaluate(() => window.bwWalkthrough.view);
  await page.touchscreen.tap(550, 400).catch(() => {});
  await page.evaluate(() => {
    const c = document.getElementById('canvas');
    const mk = (type, x, y) => {
      const t = new Touch({ identifier: 1, target: c, clientX: x, clientY: y });
      return new TouchEvent(type, { touches: type === 'touchend' ? [] : [t], targetTouches: type === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true });
    };
    c.dispatchEvent(mk('touchstart', 550, 400));
    for (let i = 1; i <= 10; i++) c.dispatchEvent(mk('touchmove', 550 - i * 12, 400 + i * 2));
    c.dispatchEvent(mk('touchend', 430, 420));
  });
  await page.waitForTimeout(400);
  const afterT = await page.evaluate(() => window.bwWalkthrough.view);
  const deltaT = beforeT.reduce((a, v, i) => a + Math.abs(v - afterT[i]), 0);
  if (deltaT > 0.05) ok(`single-finger touch drag rotated the camera (matrix delta ${deltaT.toFixed(3)})`);
  else fail(`single-finger touch drag did not move the camera (matrix delta ${deltaT.toFixed(3)})`);

  head('The camera is confined to the filmed path');
  // The page's own invert4 turns the view matrix back into a world position — the same number
  // the renderer draws from, not a variable the path code keeps for its own convenience.
  const camPos = () => page.evaluate(() => invert4(window.bwWalkthrough.view).slice(12, 15));
  // Frames are EXPENSIVE here: SwiftShader draws 750,000 splats at one to three frames a
  // second, so a 90-frame wait is a minute of wall clock. Everything below therefore waits
  // for the fewest frames that prove the point — the target moves on the input event itself,
  // and the eased position only has to be seen following it. (That the easing converges
  // exactly is proved without a browser in tests/test-walkthrough-path.mjs.)
  // page.evaluate takes ONE argument — a third parameter is an error, not an options bag.
  const settle = (frames = 12) => page.evaluate((f) => new Promise((res) => {
    let n = 0;
    const tick = () => (++n >= f ? res(n) : requestAnimationFrame(tick));
    requestAnimationFrame(tick);
  }), frames);
  const walkState = () => page.evaluate(() => ({
    t: window.bwWalkthrough.pathT, target: window.bwWalkthrough.pathTarget,
  }));
  const offPath = (p) => {
    let best = Infinity;
    for (let i = 0; i + 1 < STOPS.length; i++) {
      const a = STOPS[i].pos, b = STOPS[i + 1].pos;
      const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
      const len2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
      const t = Math.max(0, Math.min(1, len2 ? (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / len2 : 0));
      const d = Math.hypot(ap[0] - ab[0] * t, ap[1] - ab[1] * t, ap[2] - ab[2] * t);
      if (d < best) best = d;
    }
    return best;
  };

  await page.evaluate(() => window.bwWalkthrough.snap(0));
  await settle(3);
  const start = await walkState();
  await page.mouse.move(550, 400);
  await page.mouse.wheel(0, -400);
  await settle(12);
  const wheeled = await walkState();
  if (wheeled.target > start.target + 0.2 && wheeled.t > start.t + 0.05) {
    ok(`scroll walked forward along the path (stop ${start.t.toFixed(2)} → ${wheeled.t.toFixed(2)}, ` +
       `heading for ${wheeled.target.toFixed(2)})`);
  } else {
    fail(`scroll did not advance along the path (${JSON.stringify(start)} → ${JSON.stringify(wheeled)})`);
  }

  await page.keyboard.down('ArrowUp');
  await settle(15);
  await page.keyboard.up('ArrowUp');
  await settle(6);
  const walked = await walkState();
  if (walked.target > wheeled.target + 0.05 && walked.t > wheeled.t) {
    ok(`arrow key walked forward along the path (stop ${wheeled.t.toFixed(2)} → ${walked.t.toFixed(2)})`);
  } else {
    fail(`arrow key did not advance along the path (${JSON.stringify(wheeled)} → ${JSON.stringify(walked)})`);
  }

  await page.keyboard.down('ArrowDown');
  await settle(20);
  await page.keyboard.up('ArrowDown');
  await settle(6);
  const backed = await walkState();
  if (backed.target < walked.target - 0.05 && backed.t < walked.t) {
    ok(`arrow key walked back along the path (stop ${walked.t.toFixed(2)} → ${backed.t.toFixed(2)})`);
  } else {
    fail(`arrow key did not retreat along the path (${JSON.stringify(walked)} → ${JSON.stringify(backed)})`);
  }

  // The ends are ends. Walking on past the last stop for a solid minute of key-holding must
  // leave the viewer standing at the last stop, not out in the car park.
  await page.evaluate(() => { for (let i = 0; i < 4000; i++) window.bwWalkthrough.advance(0.014); });
  const far = await walkState();
  if (Math.abs(far.target - (STOPS.length - 1)) < 1e-9) ok(`walking forward forever stops at the last stop (${far.target})`);
  else fail(`walking forward left the path: target ${far.target}`);
  await page.evaluate(() => { for (let i = 0; i < 4000; i++) window.bwWalkthrough.advance(-0.014); });
  const near = await walkState();
  if (Math.abs(near.target) < 1e-9) ok(`walking back forever stops at the first stop (${near.target})`);
  else fail(`walking back left the path: target ${near.target}`);

  // The escape attempt. Everything a determined viewer can do at once: right-drag pan,
  // shift/ctrl scroll (upstream's dolly and pan), two-finger pinch, jump, WASD, a view matrix
  // shoved straight into the URL hash. The camera must still be on the polyline afterwards.
  await page.evaluate(() => {
    const c = document.getElementById('canvas');
    const ev = (type, init) => c.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, ...init }));
    for (let i = 0; i < 12; i++) {
      ev('mousedown', { clientX: 500, clientY: 400, button: 2, ctrlKey: true });
      ev('mousemove', { clientX: 500 + i * 40, clientY: 400 - i * 30, ctrlKey: true });
      ev('mouseup', { clientX: 900, clientY: 100 });
      window.dispatchEvent(new WheelEvent('wheel', { deltaY: -900, deltaX: 400, shiftKey: true, bubbles: true, cancelable: true }));
      window.dispatchEvent(new WheelEvent('wheel', { deltaY: 900, ctrlKey: true, bubbles: true, cancelable: true }));
    }
    const two = (type, a, b) => {
      const t = (x, y, id) => new Touch({ identifier: id, target: c, clientX: x, clientY: y });
      const ts = type === 'touchend' ? [] : [t(a[0], a[1], 1), t(b[0], b[1], 2)];
      c.dispatchEvent(new TouchEvent(type, { touches: ts, targetTouches: ts, changedTouches: ts.length ? ts : [t(a[0], a[1], 1)], bubbles: true, cancelable: true }));
    };
    two('touchstart', [400, 400], [600, 400]);
    for (let i = 1; i <= 10; i++) two('touchmove', [400 - i * 20, 400 - i * 20], [600 + i * 20, 400 + i * 20]);
    two('touchend', [200, 200], [800, 600]);
    location.hash = JSON.stringify([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 40, -30, 90, 1]);
  });
  for (const k of ['Space', 'KeyW', 'KeyA', 'ShiftLeft']) await page.keyboard.down(k);
  await settle(10);
  for (const k of ['Space', 'KeyW', 'KeyA', 'ShiftLeft']) await page.keyboard.up(k);
  await settle(6);
  const escaped = await camPos();
  const dist = offPath(escaped);
  if (dist < 1e-6) ok(`after a full escape attempt the camera is still on the path (${dist.toExponential(1)} m off)`);
  else fail(`the camera left the path: ${dist.toFixed(3)} m off, at [${escaped.map((n) => n.toFixed(2)).join(', ')}]`);

  // Looking is free, so the frame after that mauling may well point at a ceiling. What must
  // survive is the state: park at a stop again and it renders exactly as it did before.
  await page.evaluate((v) => { window.bwWalkthrough.view = v; }, STOPS[WALK.openIndex].view);
  await page.evaluate(() => window.bwWalkthrough.snap(window.bwWalkthrough.openIndex));
  await settle(10);
  const recovered = await pixelStats(page);
  await page.screenshot({ path: path.join(SHOTS, `${S.key}-after-escape-attempt.png`), timeout: 180000 });
  if (recovered.litFraction >= LIT_MIN && recovered.detail >= DETAIL_MIN) {
    ok(describe(`recovered to the opening stop after the escape attempt`, recovered));
  } else {
    fail(`${describe('recovered to the opening stop after the escape attempt', recovered)} — the page did not recover`);
  }

  head('Links out of the page resolve');
  for (const [label, sel, expect] of [
    [S.sibling.href, `.header a[href="${S.sibling.href}"]`, `MAPS/${S.sibling.href}`],
    ['← Quote Tool', '.header a[href="../"]', ''],
  ]) {
    const n = await page.locator(sel).count();
    if (n === 1) ok(`walkthrough header has exactly one "${label}" link`);
    else fail(`walkthrough header has ${n} "${label}" links, expected 1`);
    if (expect && !fs.existsSync(path.join(ROOT, expect))) fail(`${expect} does not exist`);
  }

  // DELISTED BY DESIGN. Sprint-11 withdrew the Chapel of Memory walkthrough from family view
  // — "This is not something I can show to families" — and sprint-14 ships all three reels the
  // same way: the operator eyeballs a reel before it is offered to anyone. So the requirement
  // is inverted, not absent: the page and this gate stay green and keep proving the
  // walkthrough works, while the gate proves nothing LINKS a family to it. Direct URL access
  // is intentionally unaffected.
  //
  // What is banned is a LINK, not the filename. Several files carry a COMMENT naming a
  // walkthrough page to explain why the card and the button are gone and how to put them
  // back — and a bare-string test flagged exactly one of those comments on its first run,
  // which is the same mistake the register assert exists to avoid. So: parse hrefs.
  head('Nothing links a family to any walkthrough');
  const WALK_PAGES = SCENE_KEYS.map((k) => path.basename(SCENES[k].page));
  const linksToWalk = (html) => [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/gi)]
    .map((m) => m[1]).filter((h) => WALK_PAGES.some((p) => h.includes(p)));
  const surfaces = [
    ...fs.readdirSync(path.join(ROOT, 'MAPS')).filter((f) => f.endsWith('.html')).map((f) => 'MAPS/' + f),
    ...fs.readdirSync(ROOT).filter((f) => /-guide\.html$/.test(f)),
    'guides.html', 'index.html', 'dashboard.html',
  ].filter((f) => fs.existsSync(path.join(ROOT, f)) && !WALK_PAGES.includes(path.basename(f)));
  const linked = [];
  for (const f of surfaces) {
    const hrefs = linksToWalk(fs.readFileSync(path.join(ROOT, f), 'utf8'));
    if (hrefs.length) linked.push(`${f} -> ${hrefs.join(', ')}`);
  }
  if (!linked.length) ok(`no walkthrough link on any of ${surfaces.length} surfaces (all three reels delisted)`);
  else fail(`a family-facing surface links to a delisted walkthrough: ${linked.join('; ')}`);
  // …and the scanner has to actually catch a link, or the check above is decorative.
  if (linksToWalk(`<a class="guide-cta" href="MAPS/${path.basename(S.page)}">Open →</a>`).length === 1) {
    ok('sabotage: an injected card link to this reel IS caught');
  } else {
    fail('sabotage: an injected card link to this reel was NOT caught — the scanner is broken');
  }

  // The gzip path is the one production uses, but the uncompressed path is what anyone
  // opening the file locally gets, and it must not regress either.
  head('Uncompressed transport still renders');
  const page2 = await ctx.newPage();
  page2.on('pageerror', (e) => errors.push(`[plain] ${e}`));
  page2.on('console', (m) => { if (m.type() === 'error') errors.push(`[plain] ${m.text()}`); });
  await page2.goto(`${plainBase}/${PAGE}`, { waitUntil: 'load' });
  await page2.waitForFunction(
    () => document.getElementById('spinner')?.style.display === 'none',
    null, { timeout: 120000 },
  ).then(() => ok('uncompressed: loader finished (spinner hidden)'), () => fail('uncompressed: splat never finished loading'));
  await page2.evaluate(() => new Promise((resolve) => {
    let n = 0;
    const tick = () => (++n >= 10 ? resolve(n) : requestAnimationFrame(tick));
    requestAnimationFrame(tick);
  }), { timeout: 180000 });
  const plain = await loadFacts(page2);
  if (plain.vertexCount === expectVerts && plain.transferSize >= bytes) {
    ok(`uncompressed: ${plain.transferSize} bytes on the wire, vertexCount ${plain.vertexCount}`);
  } else {
    fail(`uncompressed: ${JSON.stringify(plain)}, expected vertexCount ${expectVerts} and an uncompressed transfer`);
  }
  const ps = await pixelStats(page2);
  await page2.screenshot({ path: path.join(SHOTS, `${S.key}-uncompressed.png`), timeout: 180000 });
  const pdesc = `uncompressed: lit ${(ps.litFraction * 100).toFixed(1)}%, stdev ${ps.stdev.toFixed(1)}, ${ps.colours} distinct colours`;
  if (ps.litFraction > 0.25 && ps.stdev > 12 && ps.colours > 60) ok(pdesc);
  else fail(`${pdesc} — blank or near-flat over the uncompressed transport`);
  await page2.close();

  head('Page errors');
  if (errors.length === 0) ok('zero page errors');
  else { fail(`${errors.length} page error(s):`); errors.slice(0, 8).forEach((e) => console.log(`        ${e}`)); }

  await browser.close();
  proxy.close();
  server.kill();

  // A crashed/closed browser must never read as green: every run of this suite exercises
  // a fixed set of assertions, so a run that produced fewer than the floor bailed early
  // somewhere (SwiftShader crash, page closed, skipped loop) even if nothing threw.
  // Raised from 14 when the gzip transport pass added three sizing checks and the
  // uncompressed pass added three more; then made a function of the path, since the
  // per-stop pass runs one check per stop and the confinement pass adds seven.
  const CHECK_FLOOR = 23 + 2 * STOPS.length;
  if (checks < CHECK_FLOOR) fail(`only ${checks} checks ran (floor ${CHECK_FLOOR}) — the suite bailed early`);

  console.log(`\nScreenshots: ${path.relative(ROOT, SHOTS)}`);
  console.log(`\nRESULT: ${fails === 0 ? 'PASS' : 'FAIL'} — ${fails} mismatch${fails === 1 ? '' : 'es'}`);
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => {
  console.error(e);
  console.log('\nRESULT: FAIL — the suite crashed before completing');
  process.exit(1);
});
