/**
 * Verifies MAPS/COM_Walkthrough.html — the gaussian-splat walkthrough of the Chapel of
 * Memory Mausoleum — actually renders, actually responds to input, and actually links back.
 *
 * It is deliberately not a DOM-only check. A splat page can have perfect markup and draw a
 * black rectangle, so this reads real framebuffer pixels: it forces `preserveDrawingBuffer`
 * on the WebGL2 context via an init script, then calls `gl.readPixels` and computes coverage
 * and colour spread. And because the viewer auto-orbits on load, "the pixels changed" proves
 * nothing about the controls — so the drag test asserts against the live camera matrix that
 * the page exposes as `window.bwWalkthrough.view`.
 *
 * It also serves the asset the way PRODUCTION does. GitHub Pages gzips the .splat, so the
 * Content-Length header is the COMPRESSED byte count; the dev server sends it uncompressed,
 * where Content-Length happens to equal the decoded size. An earlier loader bug that derived
 * a buffer size from that header was therefore invisible here and black on the live site. So
 * the full render pass now runs behind a gzipping proxy, and the page must report a
 * vertexCount that is exactly assetBytes/32 — a number it can only get by counting whole
 * 32-byte rows off the wire. A short second pass re-checks the uncompressed path.
 *
 * Screenshots for a human to LOOK at are written to scratch/splat/shots/ (gitignored).
 *
 *   node scripts/verify_com_walkthrough.mjs
 */
import fs from 'node:fs';
import net from 'node:net';
import http from 'node:http';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'scratch', 'splat', 'shots');
const PAGE = 'MAPS/COM_Walkthrough.html';
const ASSET = path.join(ROOT, 'MAPS', 'COM_Walkthrough.splat');
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

// Named viewpoints, as camera-to-world matrices. Filled in from the trained scene; each is
// a place a counselor would actually stand.
const VIEWPOINTS = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'com-walkthrough-views.json'), 'utf8'));

async function pixelStats(page) {
  return page.evaluate(() => {
    const c = document.getElementById('canvas');
    const gl = c.getContext('webgl2');
    const w = Math.min(c.width, 480), h = Math.min(c.height, 480);
    const px = new Uint8Array(w * h * 4);
    gl.readPixels((c.width - w) >> 1, (c.height - h) >> 1, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let lit = 0, sum = 0, sum2 = 0, n = w * h;
    const hist = new Set();
    for (let i = 0; i < n; i++) {
      const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
      const v = (r + g + b) / 3;
      if (v > 12) lit++;
      sum += v; sum2 += v * v;
      hist.add((r >> 4) << 8 | (g >> 4) << 4 | (b >> 4));
    }
    const mean = sum / n;
    return { litFraction: lit / n, mean, stdev: Math.sqrt(sum2 / n - mean * mean), colours: hist.size };
  });
}

(async () => {
  head('Committed asset');
  if (!fs.existsSync(ASSET)) { fail(`${path.relative(ROOT, ASSET)} does not exist`); process.exit(1); }
  const bytes = fs.statSync(ASSET).size;
  const mb = (bytes / 1048576).toFixed(2);
  if (bytes <= MAX_ASSET_BYTES) ok(`MAPS/COM_Walkthrough.splat is ${mb} MB (cap 60.00 MB)`);
  else fail(`MAPS/COM_Walkthrough.splat is ${mb} MB — over the 60 MB cap`);
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

  head('Rendered pixels at each viewpoint');
  for (const [name, view] of Object.entries(VIEWPOINTS)) {
    await page.evaluate((v) => { window.bwWalkthrough.view = v; }, view);
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
    const s = await pixelStats(page);
    await page.screenshot({ path: path.join(SHOTS, `walkthrough-${name}.png`), timeout: 180000 });
    const desc = `${name}: lit ${(s.litFraction * 100).toFixed(1)}%, mean ${s.mean.toFixed(1)}, ` +
                 `stdev ${s.stdev.toFixed(1)}, ${s.colours} distinct colours`;
    if (s.litFraction > 0.25 && s.stdev > 12 && s.colours > 60) ok(desc);
    else fail(`${desc} — this viewpoint is blank or near-flat`);
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

  head('Links resolve both ways');
  for (const [label, sel, expect] of [
    ['Crypt & Niche Map', '.header a[href="COM_CryptMap.html"]', 'MAPS/COM_CryptMap.html'],
    ['← Quote Tool', '.header a[href="../"]', ''],
  ]) {
    const n = await page.locator(sel).count();
    if (n === 1) ok(`walkthrough header has exactly one "${label}" link`);
    else fail(`walkthrough header has ${n} "${label}" links, expected 1`);
    if (expect && !fs.existsSync(path.join(ROOT, expect))) fail(`${expect} does not exist`);
  }
  const cryptHtml = fs.readFileSync(path.join(ROOT, 'MAPS', 'COM_CryptMap.html'), 'utf8');
  if (/href="COM_Walkthrough\.html"/.test(cryptHtml)) ok('COM_CryptMap.html links back to the walkthrough');
  else fail('COM_CryptMap.html has no link to the walkthrough');
  const guides = fs.readFileSync(path.join(ROOT, 'guides.html'), 'utf8');
  if (/href="MAPS\/COM_Walkthrough\.html"/.test(guides)) ok('guides.html has a walkthrough card');
  else fail('guides.html has no walkthrough card');

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
  await page2.screenshot({ path: path.join(SHOTS, 'walkthrough-uncompressed.png'), timeout: 180000 });
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
  // uncompressed pass added three more.
  const CHECK_FLOOR = 20;
  if (checks < CHECK_FLOOR) fail(`only ${checks} checks ran (floor ${CHECK_FLOOR}) — the suite bailed early`);

  console.log(`\nScreenshots: ${path.relative(ROOT, SHOTS)}`);
  console.log(`\nRESULT: ${fails === 0 ? 'PASS' : 'FAIL'} — ${fails} mismatch${fails === 1 ? '' : 'es'}`);
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => {
  console.error(e);
  console.log('\nRESULT: FAIL — the suite crashed before completing');
  process.exit(1);
});
