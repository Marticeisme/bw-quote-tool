/**
 * Generates MAPS/COM_Walkthrough.html — the photoreal gaussian-splat walkthrough of the
 * Chapel of Memory Mausoleum, sitting beside the clickable crypt map MAPS/COM_CryptMap.html.
 *
 * The renderer is antimatter15/splat (MIT, Kevin Kwok), vendored UNMODIFIED at
 * scripts/vendor/antimatter15-splat.js with its licence beside it. This script inlines it
 * into a single self-contained page and applies a short, explicit patch list. Every patch
 * asserts its anchor text is present and unique, so refreshing the vendored file can never
 * silently no-op a patch — it fails the build instead.
 *
 * The splat asset itself is built separately by scripts/build_com_splat.mjs from the
 * Postshot .ply. It is fetched at runtime from the same directory; nothing on this page
 * loads from another origin (no CDN fonts, no CDN scripts) — house rule.
 *
 *   node scripts/build_com_walkthrough.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'scripts', 'vendor', 'antimatter15-splat.js');
const OUT = path.join(ROOT, 'MAPS', 'COM_Walkthrough.html');
const ASSET = 'COM_Walkthrough.splat';

// A .splat file is a flat array of 32-byte rows. The committed asset's real splat count is
// known here, on disk, so the page never has to infer it from a response header.
const ROW_LENGTH = 32;
const ASSET_PATH = path.join(ROOT, 'MAPS', ASSET);
if (!fs.existsSync(ASSET_PATH)) {
  throw new Error(`asset ${ASSET} is missing — run scripts/build_com_splat.mjs first`);
}
const ASSET_BYTES = fs.statSync(ASSET_PATH).size;
if (ASSET_BYTES === 0 || ASSET_BYTES % ROW_LENGTH !== 0) {
  throw new Error(`asset ${ASSET} is ${ASSET_BYTES} bytes — not a whole number of ${ROW_LENGTH}-byte splat rows`);
}
const ASSET_SPLATS = ASSET_BYTES / ROW_LENGTH;

// Camera intrinsics for the viewer's projection. The source clip is a 1080x1920 portrait
// phone capture; 26 mm-equivalent gives a ~68 deg horizontal field of view, so
// fx = (w/2) / tan(hfov/2). fy is set to the same focal in pixels (square pixels).
const VIEW_W = 1080, VIEW_H = 1920;
const FOCAL = (VIEW_W / 2) / Math.tan((68 * Math.PI / 180) / 2);

// Opening pose. Rather than invent a matrix and tune it, the page opens standing where the
// operator actually stood: `chapel` in scripts/com-walkthrough-views.json is one of the
// reconstruction's own camera poses, so the first thing a family sees is a real vantage
// point looking at the chapel and its stained glass. That same file drives the verifier's
// named viewpoints, so the page and its screenshots can never drift apart.
const VIEWS = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'com-walkthrough-views.json'), 'utf8'));
const DEFAULT_VIEW = VIEWS.chapel;
if (!Array.isArray(DEFAULT_VIEW) || DEFAULT_VIEW.length !== 16) {
  throw new Error('com-walkthrough-views.json must define a 16-element "chapel" matrix');
}

let js = fs.readFileSync(SRC, 'utf8');

/** Replace `find` with `repl`, asserting it occurs exactly once. */
function patch(label, find, repl) {
  const n = js.split(find).length - 1;
  if (n !== 1) throw new Error(`patch "${label}": anchor found ${n} times, expected exactly 1`);
  js = js.replace(find, repl);
}

// 1. The upstream file opens with ~157 lines of COLMAP cameras for the demo scene (a Lego
//    truck) and ends that block with `let camera = cameras[0];`. We keep only the shape the
//    rest of the file reads — fx, fy, width, height — and drop the demo poses.
const camAnchor = 'let camera = cameras[0];';
const camIdx = js.indexOf(camAnchor);
if (camIdx < 0) throw new Error('patch "cameras": could not find `let camera = cameras[0];`');
js = [
  `// Demo camera list from upstream replaced by the intrinsics of the source capture.`,
  `let cameras = [{ id: 0, img_name: "com", width: ${VIEW_W}, height: ${VIEW_H},`,
  `  position: [0, 0, 0], rotation: [[1,0,0],[0,1,0],[0,0,1]],`,
  `  fx: ${FOCAL.toFixed(4)}, fy: ${FOCAL.toFixed(4)} }];`,
  camAnchor,
].join('\n') + js.slice(camIdx + camAnchor.length);

// 2. Point the loader at our own asset instead of the upstream HuggingFace bucket.
patch(
  'asset url',
  `    const url = new URL(
        // "nike.splat",
        // location.href,
        params.get("url") || "train.splat",
        "https://huggingface.co/cakewalk/splat-data/resolve/main/",
    );`,
  `    // Same-origin only: the asset sits next to this page. No cross-origin loads anywhere.\n` +
  `    const url = new URL(${JSON.stringify(ASSET)}, location.href);`,
);

// 3. Same-origin fetch — drop the CORS mode the upstream needed for the remote bucket.
patch(
  'fetch mode',
  `    const req = await fetch(url, {
        mode: "cors", // no-cors, *cors, same-origin
        credentials: "omit", // include, *same-origin, omit
    });`,
  `    const req = await fetch(url);`,
);

// 4. Starting pose.
patch(
  'default view matrix',
  `let defaultViewMatrix = [
    0.47, 0.04, 0.88, 0, -0.11, 0.99, 0.02, 0, -0.88, -0.11, 0.47, 0, 0.07,
    0.03, 6.55, 1,
];`,
  `let defaultViewMatrix = [${DEFAULT_VIEW.join(', ')}];`,
);

// 5. NOTHING may be derived from the Content-Length header.
//
//    Upstream allocates the receive buffer at exactly `Content-Length` bytes and then hands
//    `splatData.buffer` — the whole raw capacity — to the sorting worker on every progress
//    tick. That is fine only while Content-Length equals the decoded size. GitHub Pages
//    serves this asset GZIPPED, so Content-Length is the COMPRESSED count (23,174,686 for a
//    24,000,000-byte asset). The worker's generateTexture() opens the buffer it was given
//    with `new Float32Array(buffer)`, which throws
//        RangeError: byte length of Float32Array should be a multiple of 4
//    on any capacity that is not 4-aligned. That kills the worker's first message, so it
//    never posts a texture back, so the main thread's `vertexCount` stays 0 forever, so
//    `if (vertexCount > 0)` never draws: a black canvas and a spinner that never hides.
//
//    A previous pass patched the *growth* and *trim* paths but left Content-Length as the
//    initial capacity and left both postMessage sites sending `splatData.buffer`, so the
//    unaligned capacity still reached the worker. The dev server serves the asset
//    uncompressed, where capacity == decoded size == a multiple of 32, which is exactly why
//    the local gate stayed green while production was black.
//
//    So: fixed row-aligned starting capacity, grow on demand, and tell the worker only about
//    whole 32-byte rows actually received, in a buffer trimmed to exactly that many rows.
patch(
  'row-aligned receive buffer',
  `    let splatData = new Uint8Array(req.headers.get("content-length"));

    const downsample =
        splatData.length / rowLength > 500000 ? 1 : 1 / devicePixelRatio;
    console.log(splatData.length / rowLength, downsample);`,
  `    // 4 MiB, a whole multiple of rowLength; doubling keeps it so. Never Content-Length.
    let splatData = new Uint8Array(1 << 22);
    const growSplatData = (needed) => {
        if (needed <= splatData.length) return;
        let cap = splatData.length || 1 << 22;
        while (cap < needed) cap *= 2;
        const grown = new Uint8Array(cap);
        grown.set(splatData);
        splatData = grown;
    };
    // The only two facts the worker is ever told, both from bytes actually received.
    const receivedRows = () => Math.floor(bytesRead / rowLength);
    const rowAlignedBuffer = () => splatData.buffer.slice(0, receivedRows() * rowLength);

    // Render scale and the progress bar both need a total up front. Upstream took it from the
    // receive-buffer size, i.e. from Content-Length; the committed asset's real splat count is
    // known at build time, so use that and leave the header out of it entirely.
    const ASSET_SPLATS = ${ASSET_SPLATS};
    const downsample = ASSET_SPLATS > 500000 ? 1 : 1 / devicePixelRatio;
    console.log("COM walkthrough: " + ASSET_SPLATS + " splats expected, downsample " + downsample);`,
);
patch(
  'grow before write',
  `        splatData.set(value, bytesRead);
        bytesRead += value.length;`,
  `        growSplatData(bytesRead + value.length);
        splatData.set(value, bytesRead);
        bytesRead += value.length;`,
);
patch(
  'mid-stream buffer handoff',
  `                worker.postMessage({
                    buffer: splatData.buffer,
                    vertexCount: Math.floor(bytesRead / rowLength),
                });`,
  `                worker.postMessage({
                    buffer: rowAlignedBuffer(),
                    vertexCount: receivedRows(),
                });`,
);
patch(
  'finalise on stream end',
  `    if (!stopLoading) {
        if (isPly(splatData)) {`,
  `    // Stream end: keep exactly the whole rows received, never a declared length.
    const finalBytes = receivedRows() * rowLength;
    if (splatData.length !== finalBytes) splatData = splatData.slice(0, finalBytes);
    window.bwWalkthrough.bytesRead = bytesRead;
    window.bwWalkthrough.vertexCount = finalBytes / rowLength;
    if (!stopLoading) {
        if (isPly(splatData)) {`,
);
patch(
  'final buffer handoff',
  `            worker.postMessage({
                buffer: splatData.buffer,
                vertexCount: Math.floor(bytesRead / rowLength),
            });`,
  `            worker.postMessage({
                buffer: rowAlignedBuffer(),
                vertexCount: receivedRows(),
            });`,
);
// The progress bar divided by the receive-buffer capacity, which was Content-Length. Use the
// known asset total so the bar reflects loading rather than the allocator.
patch(
  'progress denominator',
  `        const progress = (100 * vertexCount) / (splatData.length / rowLength);`,
  `        const progress = (100 * vertexCount) / ${ASSET_SPLATS};`,
);

// 6. Expose the live camera to the page so scripts/verify_com_walkthrough.mjs can park the
//    view at named viewpoints and assert that dragging actually moved it. Without this the
//    only observable is pixels, and the auto-orbit makes pixels change whether or not the
//    drag was handled — i.e. a broken control would still "pass".
patch(
  'test hook',
  `let viewMatrix = defaultViewMatrix;`,
  `let viewMatrix = defaultViewMatrix;\n` +
  `// bytesRead/vertexCount are filled in when the stream ends. They exist so the gate can\n` +
  `// assert the page counted whole 32-byte rows off the wire and not a header value.\n` +
  `window.bwWalkthrough = { bytesRead: null, vertexCount: null, expectedSplats: ${ASSET_SPLATS},\n` +
  `  get view() { return viewMatrix.slice(); }, set view(m) { viewMatrix = m; } };`,
);

const CSS = `
*{box-sizing:border-box;}
html,body{margin:0;height:100%;overflow:hidden;background:#0d1520;color:#f4efe6;
  font-family:"Segoe UI",Roboto,-apple-system,"Helvetica Neue",Arial,sans-serif;
  text-shadow:0 1px 3px rgba(0,0,0,.8);-webkit-text-size-adjust:100%;}
#canvas{position:fixed;inset:0;width:100%;height:100%;display:block;touch-action:none;}
.header{position:fixed;top:0;left:0;right:0;z-index:20;display:flex;align-items:center;gap:12px;
  padding:10px 16px;background:linear-gradient(180deg,rgba(13,21,32,.92),rgba(13,21,32,0));
  pointer-events:none;}
.header a,.header button{pointer-events:auto;}
.htxt{min-width:0;}
.htxt h1{margin:0;font-size:15px;font-weight:600;letter-spacing:.01em;white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis;}
.htxt p{margin:2px 0 0;font-size:11px;letter-spacing:.06em;text-transform:uppercase;
  color:#c8a96e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.hbtn{margin-left:auto;flex-shrink:0;background:rgba(13,21,32,.55);border:1px solid rgba(200,169,110,.5);
  color:#e8dcc4;padding:8px 13px;border-radius:6px;font-size:11px;font-weight:600;letter-spacing:.05em;
  text-transform:uppercase;white-space:nowrap;text-decoration:none;cursor:pointer;}
.hbtn+.hbtn{margin-left:8px;}
.hbtn:hover{background:rgba(200,169,110,.22);color:#fff;}
.note{position:fixed;left:0;right:0;bottom:0;z-index:20;padding:10px 16px 14px;
  background:linear-gradient(0deg,rgba(13,21,32,.92),rgba(13,21,32,0));
  font-size:11.5px;line-height:1.5;text-align:center;}
.note b{color:#c8a96e;font-weight:600;}
.hint{display:block;margin-top:3px;color:#b9c6d4;font-size:10.5px;}
#progress{position:fixed;top:0;left:0;height:3px;width:0;background:#c8a96e;z-index:30;
  transition:width .15s linear;}
/* The status overlays must never eat a drag: an error banner sitting across the middle of
   the screen would otherwise swallow every mousedown and freeze the view. */
#message{position:fixed;top:46%;left:0;right:0;z-index:30;text-align:center;padding:0 24px;
  font-size:13px;color:#ffb4a2;pointer-events:none;}
#spinner,#progress,#quality,#caminfo{pointer-events:none;}
#spinner{position:fixed;top:50%;left:50%;z-index:25;width:34px;height:34px;margin:-17px 0 0 -17px;
  border:3px solid rgba(200,169,110,.25);border-top-color:#c8a96e;border-radius:50%;
  animation:spin 1s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}
#quality,#caminfo{position:fixed;bottom:2px;right:6px;z-index:20;font-size:10px;color:#5d7285;}
#caminfo{right:60px;}
@media (max-width:520px){
  .htxt h1{font-size:13px;}
  .hbtn{padding:7px 10px;font-size:10px;}
  .note{font-size:10.5px;}
}
@media print{ body::after{content:"This page is an interactive 3D walkthrough and cannot be printed. Use the Crypt & Niche Map for printable sheets.";} }
`.trim();

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<title>Bonney Watson — Chapel of Memory Mausoleum: Photoreal Walkthrough</title>
<!-- Generated by scripts/build_com_walkthrough.mjs. Do not hand-edit. -->
<!-- Renderer: antimatter15/splat, MIT (c) 2023 Kevin Kwok — vendored unmodified at
     scripts/vendor/antimatter15-splat.js, licence at scripts/vendor/antimatter15-splat.LICENSE.
     Patched at build time only to load a same-origin asset and set the opening pose. -->
<style>${CSS}</style>
</head>
<body>
<div id="progress"></div>
<canvas id="canvas"></canvas>
<div id="spinner"></div>
<div id="message"></div>

<div class="header">
  <div class="htxt">
    <h1>Chapel of Memory Mausoleum</h1>
    <p>Photoreal walkthrough &middot; Washington Memorial Park</p>
  </div>
  <a class="hbtn" href="COM_CryptMap.html">Crypt &amp; Niche Map</a>
  <a class="hbtn" href="../">&larr; Quote Tool</a>
</div>

<div class="note">
  <b>This is a photographic reconstruction</b> of the inside of the building, not a survey drawing.
  For crypt and niche availability, locations and pricing, please use the
  <a href="COM_CryptMap.html" style="color:#e8dcc4">Crypt &amp; Niche Map</a>.
  <span class="hint">Drag or swipe to look &middot; two fingers or scroll to move &middot; arrow keys to walk</span>
</div>

<div id="quality"><span id="fps"></span></div>
<div id="caminfo"><span id="camid"></span></div>

<script>
${js}
</script>
</body>
</html>
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, HTML.replace(/\r?\n/g, '\r\n'));
console.log(`wrote ${path.relative(ROOT, OUT)} (${(HTML.length / 1024).toFixed(1)} KB), asset ${ASSET}`);
