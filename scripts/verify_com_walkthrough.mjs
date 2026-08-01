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
 * Screenshots for a human to LOOK at are written to scratch/splat/shots/ (gitignored).
 *
 *   node scripts/verify_com_walkthrough.mjs
 */
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
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
  const base = `http://127.0.0.1:${port}`;
  await new Promise((r) => setTimeout(r, 700));

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
  // readPixels return a cleared buffer. Force it on before any page script runs.
  await page.addInitScript(() => {
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

  head('Page load and first render');
  await page.goto(`${base}/${PAGE}`, { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.getElementById('spinner')?.style.display === 'none',
    null, { timeout: 120000 },
  ).then(() => ok('loader finished (spinner hidden)'), () => fail('splat never finished loading'));
  await page.waitForTimeout(2500);

  const msg = (await page.locator('#message').innerText()).trim();
  if (!msg) ok('no error message on the page');
  else fail(`page shows an error: ${msg}`);

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

  head('Page errors');
  if (errors.length === 0) ok('zero page errors');
  else { fail(`${errors.length} page error(s):`); errors.slice(0, 8).forEach((e) => console.log(`        ${e}`)); }

  await browser.close();
  server.kill();

  // A crashed/closed browser must never read as green: every run of this suite exercises
  // a fixed set of assertions, so a run that produced fewer than the floor bailed early
  // somewhere (SwiftShader crash, page closed, skipped loop) even if nothing threw.
  const CHECK_FLOOR = 14;
  if (checks < CHECK_FLOOR) fail(`only ${checks} checks ran (floor ${CHECK_FLOOR}) — the suite bailed early`);

  console.log(`\nScreenshots: ${path.relative(ROOT, SHOTS)}`);
  console.log(`\nRESULT: ${fails === 0 ? 'PASS' : 'FAIL'} — ${fails} mismatch${fails === 1 ? '' : 'es'}`);
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => {
  console.error(e);
  console.log('\nRESULT: FAIL — the suite crashed before completing');
  process.exit(1);
});
