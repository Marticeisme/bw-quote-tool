/**
 * Generates MAPS/MVC_NewGlassFront_NicheMap_1.html from scripts/mvc-niche-data.mjs.
 *
 * The page renders a CSS-3D model of the columbarium island on screen and the flat
 * per-wall grids for print. Both are emitted as STATIC HTML from the one dataset, so
 * the print view needs no JavaScript and the two views cannot drift apart.
 *
 *   node scripts/build_mvc_map.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  WALLS, WALL_ORDER, ISLAND, ROOM, ROW_LETTERS, ROW_HEIGHTS_IN, SUBCOL_IN,
  cellDims, TIERS, FEES, EFFECTIVE,
} from './mvc-niche-data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'MAPS', 'MVC_NewGlassFront_NicheMap_1.html');

const PPI = 3.6;            // px per inch in the 3D scene
const FLAT_PPI = 4.6;       // px per inch in the flat print grids
const px = (v) => +(v * PPI).toFixed(2);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = (n) => '$' + n.toLocaleString('en-US');
// Full dollar figures on the 3D chips too — "$7,000", never "$7K" (operator, 2026-07-29).
const tierClass = (p) => (TIERS.find((t) => t.p === p) || { c: 'c8' }).c;
const misOf = (wall, id) => wall.mis.replace(/-Level-Space$/, '') + '-' + id;

// ── Octagonal room geometry ────────────────────────────────────────────────
function roomEdges() {
  const hx = ROOM.across / 2, hz = ROOM.between / 2;
  const fx = ROOM.baseLength / 2, fz = ROOM.sideFlat / 2;
  const v = [
    [-fx, -hz], [fx, -hz], [hx, -fz], [hx, fz],
    [fx, hz], [-fx, hz], [-hx, fz], [-hx, -fz],
  ];
  return v.map((p1, i) => {
    const p2 = v[(i + 1) % v.length];
    const dx = p2[0] - p1[0], dz = p2[1] - p1[1];
    const len = Math.hypot(dx, dz);
    const mx = (p1[0] + p2[0]) / 2, mz = (p1[1] + p2[1]) / 2;
    // inward normal
    let nx = dz / len, nz = -dx / len;
    if (nx * -mx + nz * -mz < 0) { nx = -nx; nz = -nz; }
    const yaw = +(Math.atan2(nx, nz) * 180 / Math.PI).toFixed(2);
    // z = +hz is the entry (front / West) side of the room
    const isEntry = Math.abs(mz - hz) < 0.01 && len > 100;
    return { len, mx, mz, yaw, isEntry };
  });
}

// ── 3D island faces ────────────────────────────────────────────────────────
const FACE_TRANSFORM = {
  west: `rotateY(0deg) translateZ(${px(ISLAND.depth / 2)}px)`,
  east: `rotateY(180deg) translateZ(${px(ISLAND.depth / 2)}px)`,
  north: `rotateY(-90deg) translateZ(${px(ISLAND.length / 2)}px)`,
  south: `rotateY(90deg) translateZ(${px(ISLAND.length / 2)}px)`,
};

const GRID_ROWS_FR = [...ROW_HEIGHTS_IN, ISLAND.basePanel].map((h) => h + 'fr').join(' ');
const FACE_H_IN = ROW_HEIGHTS_IN.reduce((a, b) => a + b, 0) + ISLAND.basePanel; // 87.5

// Unfolded-plan offsets: each wall hinges down into the floor plane, its inner edge
// meeting the island footprint, so the panel centre sits half a wall-height out.
const H_PX = px(FACE_H_IN);
const PLAN_Y = +(H_PX / 2).toFixed(2);                          // floor plane, island-local
const PLAN_Z = +(px(ISLAND.depth) / 2 + H_PX / 2).toFixed(2);   // West / East panels
const PLAN_X = +(px(ISLAND.length) / 2 + H_PX / 2).toFixed(2);  // North / South panels
const PLAN_W = +(px(ISLAND.length) + 2 * H_PX).toFixed(2);      // unfolded extent, x
const PLAN_D = +(px(ISLAND.depth) + 2 * H_PX).toFixed(2);       // unfolded extent, z

function nicheAttrs(wall, c) {
  const d = cellDims(wall, c);
  return [
    `data-wall="${wall.key}"`,
    `data-id="${esc(c.id)}"`,
    `data-price="${c.price}"`,
    `data-urn="${c.urn}"`,
    `data-mis="${esc(misOf(wall, c.id))}"`,
    `data-inside="${esc(d.inside)}"`,
    d.opening ? `data-opening="${esc(d.opening)}"` : '',
    d.plate ? `data-plate="${esc(d.plate)}"` : '',
  ].filter(Boolean).join(' ');
}

function ariaName(wall, c) {
  return `${c.id}, ${wall.label}, ${money(c.price)}, ${c.urn} rights`;
}

// ── Corner returns ─────────────────────────────────────────────────────────
// The long walls' niche field is 20 sub-columns x 5.4375" = 108.75" (9'-0 3/4" C/C),
// but the island is 135.4375" long. The ~13.34" left over at EACH end is not framing:
// it is where the end walls' 12"-deep corner niches meet the long face, and their
// SIDE panels are glass — stand at the Front wall and you see straight through the
// corner into the lit interior of Side A/B's edge niches (operator photos,
// D:\Cemetery Photos Misc\New MVC Photos). The old build stretched the 20-column
// grid across the full face, so every front/back niche drew ~24% too wide and the
// corners read as solid niche fronts instead of glass returns.
const SIDE_STRIP_IN = +((ISLAND.length - 20 * SUBCOL_IN.long) / 2).toFixed(4); // 13.34
// Which end-wall column adjoins which long-face edge (verified against the scene
// transforms: north sits at -x and renders on the WEST face's screen-left; east
// views mirror). 'first' = the wall's c1===1 column, 'last' = its c2===subcols+1.
const CORNER_ADJ = {
  west: { left: ['north', 'last'], right: ['south', 'first'] },
  east: { left: ['south', 'last'], right: ['north', 'first'] },
};
function edgeCells(wallKey, side) {
  const w = WALLS[wallKey];
  return w.cells.filter((c) => !c.panel && (side === 'first' ? c.c1 === 1 : c.c2 === w.subcols + 1));
}
function cornerStrip(faceKey, edge, gridCol) {
  const [adjKey, side] = CORNER_ADJ[faceKey][edge];
  const adj = WALLS[adjKey];
  return edgeCells(adjKey, side).map((c) =>
    `      <button type="button" class="n3 side3" style="grid-row:${c.r1}/${c.r2};grid-column:${gridCol}" ${nicheAttrs(adj, c)} aria-label="${esc(ariaName(adj, c))}, seen through its glass side"><span class="s3id">${esc(c.id)}</span></button>`
  ).join('\n');
}

function face3d(wall) {
  const w = px(wall.widthIn), h = px(FACE_H_IN);
  const long = wall.kind === 'long';
  // Long faces: true-width niche field flanked by the two glass corner returns.
  const colTemplate = long
    ? `${SIDE_STRIP_IN}fr repeat(${wall.subcols},${SUBCOL_IN.long}fr) ${SIDE_STRIP_IN}fr`
    : `repeat(${wall.subcols},1fr)`;
  const off = long ? 1 : 0;
  const totalCols = wall.subcols + 2 * off;
  const cells = wall.cells.map((c) => {
    if (c.panel) {
      return `      <div class="n3 pnl3" style="grid-row:${c.r1}/${c.r2};grid-column:${c.c1 + off}/${c.c2 + off}" aria-hidden="true"><span>ACCESS<br>PANEL</span></div>`;
    }
    return `      <button type="button" class="n3 front3" style="grid-row:${c.r1}/${c.r2};grid-column:${c.c1 + off}/${c.c2 + off}" ${nicheAttrs(wall, c)} aria-label="${esc(ariaName(wall, c))}"><span class="n3id">${esc(c.id)}</span><span class="n3p ${tierClass(c.price)}">${money(c.price)}</span></button>`;
  }).join('\n');
  const strips = long
    ? cornerStrip(wall.key, 'left', 1) + '\n' + cornerStrip(wall.key, 'right', totalCols)
    : '';
  return `    <div class="face face-${wall.key}" data-face="${wall.key}" style="width:${w}px;height:${h}px;grid-template-columns:${colTemplate};grid-template-rows:${GRID_ROWS_FR};transform:translate(-50%,-50%) ${FACE_TRANSFORM[wall.key]}">
${cells}
${strips}
      <div class="baseband" style="grid-row:8/9;grid-column:1/${totalCols + 1}"><b>${esc(wall.label.toUpperCase())}</b><span>${esc(wall.mis)}</span></div>
    </div>`;
}

function scene3d() {
  const edges = roomEdges().map((e) => {
    const cls = e.isEntry ? 'rwall entry' : 'rwall';
    const label = e.isEntry ? '<span class="doorway">ENTRY DOORS</span>' : '';
    return `      <div class="${cls}" style="width:${px(e.len)}px;height:${px(ROOM.wallHeight)}px;transform:translate(-50%,-50%) translate3d(${px(e.mx)}px,${px(-ROOM.wallHeight / 2)}px,${px(e.mz)}px) rotateY(${e.yaw}deg)">${label}</div>`;
  }).join('\n');

  // Octagonal floor: chamfer the four corners by the drawing's own offsets.
  const cx = ((ROOM.across - ROOM.baseLength) / 2 / ROOM.across * 100).toFixed(3);
  const cz = ((ROOM.between - ROOM.sideFlat) / 2 / ROOM.between * 100).toFixed(3);
  const oct = `polygon(${cx}% 0,${100 - cx}% 0,100% ${cz}%,100% ${100 - cz}%,${100 - cx}% 100%,${cx}% 100%,0 ${100 - cz}%,0 ${cz}%)`;

  const cap = `      <div class="cap" style="width:${px(ISLAND.length)}px;height:${px(ISLAND.depth)}px;transform:translate(-50%,-50%) translateY(${px(-FACE_H_IN / 2)}px) rotateX(90deg)"></div>`;

  return `<div class="scene" id="scene" tabindex="0" role="application" aria-label="Three-dimensional model of the Mountain View Columbarium island. Use the wall buttons below, or arrow keys, to change the view.">
  <div class="stage" id="stage">
    <div class="room">
      <div class="floor" style="width:${px(ROOM.across)}px;height:${px(ROOM.between)}px;clip-path:${oct};transform:translate(-50%,-50%) translateY(${px(1)}px) rotateX(-90deg)">
${WALL_ORDER.map((k) => {
    const w = WALLS[k];
    const extra = k === 'west' ? ' &middot; ENTRY' : '';
    return `        <span class="fcomp fc-${k[0]}"><b>${esc(w.label.toUpperCase())}${extra}</b><i>${esc(w.mis)}</i></span>`;
  }).join('\n')}
      </div>
${edges}
    </div>
    <div class="island" style="transform:translateY(${px(-FACE_H_IN / 2)}px)">
${WALL_ORDER.map((k) => face3d(WALLS[k])).join('\n')}
${cap}
    </div>
  </div>
  <div class="planlabels" aria-hidden="true">
${[['e', 'east'], ['w', 'west'], ['n', 'north'], ['s', 'south']].map(([abbr, k]) => {
    const w = WALLS[k];
    const extra = k === 'west' ? ' &middot; ENTRY' : '';
    return `    <span class="pl-${abbr}">${esc(w.label.toUpperCase())}${extra}<i>${esc(w.mis)}</i></span>`;
  }).join('\n')}
  </div>
</div>`;
}

// ── Flat grids (screen fallback + print) ───────────────────────────────────
function flatGrid(wall, { mini = false } = {}) {
  const rowStr = ROW_HEIGHTS_IN.map((h) => (h * FLAT_PPI * (mini ? 0.52 : 1)).toFixed(1) + 'px').join(' ');
  const labels = ROW_LETTERS.map((L, i) => `    <div class="rlbl" style="grid-column:1;grid-row:${i + 1}/${i + 2}">${L}</div>`).join('\n');
  const cells = wall.cells.map((c) => {
    if (c.panel) {
      return `    <div class="n pnl" style="grid-row:${c.r1}/${c.r2};grid-column:${c.c1 + 1}/${c.c2 + 1}">CONTROL<br>PANEL</div>`;
    }
    return `    <button type="button" class="n flatn" style="grid-row:${c.r1}/${c.r2};grid-column:${c.c1 + 1}/${c.c2 + 1}" ${nicheAttrs(wall, c)} aria-label="${esc(ariaName(wall, c))}"><span class="nid">${esc(c.id)}</span><span class="nprice ${tierClass(c.price)}">${money(c.price)}</span><span class="ncap">${c.urn}-urn</span></button>`;
  }).join('\n');
  const maxw = wall.kind === 'end' ? 'max-width:420px;' : '';
  return `  <div class="fgrid${mini ? ' mini' : ''}" style="grid-template-columns:24px repeat(${wall.subcols},1fr);grid-template-rows:${rowStr};${maxw}">
${labels}
${cells}
  </div>`;
}

function legendHtml(prices) {
  return TIERS.filter((t) => prices.includes(t.p))
    .map((t) => `<div class="li"><div class="ls ${t.c}"></div><span>${t.l}</span></div>`).join('');
}
const wallPrices = (w) => [...new Set(w.cells.filter((c) => !c.panel).map((c) => c.price))];

const RIGHTS_LEG = (four) => `<div class="rightsleg">
      <div class="li"><div class="ls rs2"></div><span>(2) Rights per Niche — standard</span></div>
      ${four ? '<div class="li"><div class="ls rs4"></div><span>(4) Rights per Niche — D/E companion</span></div>' : ''}
    </div>`;

function wallView(wall) {
  return `  <div class="wview" id="wall-${wall.key}">
    <div class="wlabel">${esc(wall.label)}</div>
    <div class="wsub">${wall.sub}</div>
    <div class="mis">${esc(wall.mis)} &nbsp;·&nbsp; Unit ${wall.unit} &nbsp;·&nbsp; ${wall.cells.filter((c) => !c.panel).length} niches</div>
    <div class="gwrap">
${flatGrid(wall)}
    </div>
    <div class="legend">${legendHtml(wallPrices(wall))}</div>
    ${RIGHTS_LEG(wallPrices(wall).some((p) => p >= 42000))}
  </div>`;
}

function overviewView() {
  const panels = WALL_ORDER.map((k) => {
    const w = WALLS[k];
    return `      <div class="overview-panel">
        <div class="ovtitle">${esc(w.label)} — ${esc(w.mis)}</div>
        <div class="gwrap" style="padding:10px 12px;">
${flatGrid(w, { mini: true })}
        </div>
      </div>`;
  }).join('\n');
  return `  <div class="wview" id="wall-overview">
    <div class="wlabel">All Walls — Overview</div>
    <div class="wsub">Print this page for a complete reference of all four walls</div>
    <div class="ovgrid">
${panels}
    </div>
    <div class="legend">${legendHtml(TIERS.map((t) => t.p))}</div>
    ${RIGHTS_LEG(true)}
  </div>`;
}

// ── Assemble ───────────────────────────────────────────────────────────────
const LOGO = fs.readFileSync(path.join(ROOT, 'scripts', 'bw-logo.svg.txt'), 'utf8').trim();

const CSS = `
  :root{--navy:#1a2744;--navy-light:#243156;--gold:#c8a96e;--gold-light:#e8d5a8;--cream:#f7f4ef;--gb:rgba(200,169,110,0.45);--bronze:#3a2f22;}
  *{box-sizing:border-box;margin:0;padding:0;}
  html{overflow-x:hidden;}
  body{font-family:'Jost',sans-serif;background:var(--navy);color:var(--cream);min-height:100vh;overflow-x:hidden;max-width:100vw;}
  button{font-family:inherit;}
  .header{background:linear-gradient(135deg,var(--navy),var(--navy-light));border-bottom:2px solid var(--gold);padding:14px 20px;display:flex;align-items:center;gap:14px;}
  .hlogo-svg{height:34px;flex-shrink:0;width:auto;}
  .htxt h1{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:var(--cream);}
  .htxt p{font-size:10px;font-weight:300;color:var(--gold);letter-spacing:.12em;text-transform:uppercase;margin-top:2px;}
  .ptabs{display:flex;background:#0f1830;border-bottom:1px solid var(--gb);overflow-x:auto;}
  .moved{padding:10px 20px;font-size:11.5px;color:var(--gold-light);letter-spacing:.03em;display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline;}
  .movedlink{color:var(--gold);font-weight:600;text-decoration:none;border-bottom:1px solid var(--gb);white-space:nowrap;}
  .movedlink:hover{color:var(--cream);border-bottom-color:var(--cream);}
  .psec{display:none;}.psec.active{display:block;}
  .tabs{display:flex;background:var(--navy-light);border-bottom:1px solid var(--gb);overflow-x:auto;}
  .tab{padding:10px 18px;font-size:11px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:var(--gold-light);cursor:pointer;border:none;border-bottom:3px solid transparent;white-space:nowrap;transition:all .2s;background:none;}
  .tab:hover{color:var(--cream);background:rgba(200,169,110,.08);}
  .tab.active{color:var(--gold);border-bottom-color:var(--gold);background:rgba(200,169,110,.12);}
  .main{padding:14px;}
  .wview,.view3d{display:none;}.wview.active,.view3d.active{display:block;}
  .wlabel{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:var(--gold);margin-bottom:2px;margin-top:14px;text-align:center;}
  .wsub{font-size:10px;color:var(--gold-light);letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px;text-align:center;}
  .gwrap{background:linear-gradient(160deg,#0f1a30,#1a2744 60%,#0d1528);border:1px solid var(--gb);border-radius:8px;padding:20px 24px;overflow-x:auto;max-width:900px;margin:0 auto;}
  .fgrid{display:grid;gap:3px;margin:0 auto;width:100%;}
  .fgrid.mini{gap:1px;font-size:6px;}
  .mis{font-size:10px;color:var(--gold-light);letter-spacing:.08em;text-align:center;margin-bottom:10px;opacity:.85;}
  .rlbl{display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:13px;font-weight:700;color:var(--gold);}
  .fgrid.mini .rlbl{font-size:9px;}
  .ovgrid{display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:900px;margin:0 auto;}
  .ovtitle{font-family:'Cormorant Garamond',serif;font-size:14px;font-weight:600;color:var(--gold);margin-bottom:6px;text-align:center;}
  @media (max-width:760px){.ovgrid{grid-template-columns:1fr;}}

  /* ── Flat niche cell ──
     Champagne like the 3D faces (operator: one look everywhere, print included);
     the price tier lives on the chip, not the cell fill. */
  .n{border-radius:3px;border:1px solid rgba(58,44,20,.4);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;transition:transform .15s,box-shadow .15s,filter .15s;text-align:center;padding:2px;line-height:1.2;font-size:8.5px;min-width:0;font-family:'Jost',sans-serif;
    color:#3a2c14;gap:1px;
    background:
      linear-gradient(115deg,rgba(255,255,255,.20) 0%,rgba(255,255,255,0) 30%),
      linear-gradient(180deg,#f2dda6 0%,#e2bd79 38%,#cd9d58 100%);}
  .n:hover{transform:scale(1.18);border-color:var(--gold);z-index:10;box-shadow:0 4px 16px rgba(0,0,0,.5),0 0 0 1px var(--gold);}
  .n:focus-visible,.n3:focus-visible{outline:2px solid #fff;outline-offset:1px;z-index:20;}
  /* SELECTED (clicked/tapped) — deliberately louder than hover, and drawn with an
     INSET outline so it survives the tight 1.5px gaps and the 3D stacking order
     that were clipping the old outer ring. Mirrored into the flat wall tabs. */
  .n.sel,.n3.sel{outline:3px solid #fff;outline-offset:-3px;z-index:25;
    filter:brightness(1.28) saturate(1.15);
    box-shadow:0 0 0 2px var(--gold),0 0 22px 4px rgba(255,255,255,.45);}
  .n.sel{transform:scale(1.06);}
  .pnl{background:#0d111a!important;border-color:rgba(255,255,255,.06)!important;cursor:default;color:rgba(255,255,255,.18);font-size:7px;letter-spacing:.06em;text-transform:uppercase;}
  .pnl:hover{transform:none!important;box-shadow:none!important;}
  .nid{font-size:8px;opacity:.65;}
  .nprice{font-weight:600;font-size:11px;padding:0 5px;border-radius:3px;box-shadow:0 1px 2px rgba(0,0,0,.3);}
  .fgrid.mini .nid{font-size:5px;}.fgrid.mini .nprice{font-size:7px;padding:0 2px;}.fgrid.mini .ncap{font-size:5px;}
  .fgrid.mini .n{padding:1px;cursor:default;}
  .fgrid.mini .n:hover{transform:none;box-shadow:none;border-color:rgba(200,169,110,.3);}
  .ncap{font-size:8px;opacity:.72;}

  /* ── Price colours (shared by flat + 3D) ─────────────────────────────
     OPAQUE fills on a measured ramp. The previous set was translucent
     (alpha .55–.78) over a dark room, which is what made the classes read
     "muddy and low-contrast" on the operator's phone: every tier was
     dragged toward the same navy and the labels floated on top of it.
     Each fill now carries its own label colour, and every pair clears
     WCAG AA (worst 4.52:1); every fill clears 3.0:1 against the backdrop.
     See scratch/_mvc3dpolish/contrast.mjs for the measurement. */
  .c7{background:#1a6fae;border-color:#63a8dd;color:#fff;}
  .c8{background:#0f8f96;border-color:#5fd0d6;color:#0e1729;}
  .c10{background:#237a3a;border-color:#5fc077;color:#fff;}
  .c12{background:#7d9a18;border-color:#c3dc5e;color:#0e1729;}
  .c14{background:#c39a10;border-color:#f0cf5c;color:#0e1729;}
  .c16{background:#e07b12;border-color:#ffb964;color:#0e1729;}
  .c18{background:#cf4a1c;border-color:#ff9469;color:#fff;}
  .c20{background:#c2332b;border-color:#ff8378;color:#fff;}
  .c42{background:#8b4fbb;border:2px solid var(--gold);color:#fff;}
  .c48{background:#c02f84;border:2px solid var(--gold);color:#fff;}

  .legend{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px;justify-content:center;}
  .li{display:flex;align-items:center;gap:5px;font-size:10px;color:var(--gold-light);}
  .ls{width:13px;height:13px;border-radius:2px;border:1px solid rgba(255,255,255,.2);flex-shrink:0;}
  .rightsleg{display:flex;flex-wrap:wrap;gap:14px;margin-top:6px;justify-content:center;}
  .rs2{background:#237a3a;border-color:#5fc077;}
  .rs4{background:#c02f84;border:1px solid var(--gold);}

  /* ── 3D scene ── */
  .toolbar{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;align-items:center;max-width:900px;margin:10px auto 8px;}
  .tbtn{background:rgba(200,169,110,.12);border:1px solid var(--gb);color:var(--gold-light);padding:7px 13px;border-radius:5px;font-size:11px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:all .15s;}
  .tbtn:hover{background:rgba(200,169,110,.26);color:var(--cream);}
  .tbtn.on{background:rgba(200,169,110,.3);border-color:var(--gold);color:var(--gold);}
  .tbtn:focus-visible{outline:2px solid #fff;outline-offset:2px;}
  .tbsep{width:1px;height:22px;background:var(--gb);margin:0 4px;}
  .scene{position:relative;height:min(64vh,580px);min-height:330px;margin:0 auto;max-width:1100px;
    background:radial-gradient(ellipse at 50% 40%,#1d2b4c 0%,#141e36 46%,#0a1020 100%);
    border:1px solid var(--gb);border-radius:10px;overflow:hidden;cursor:grab;touch-action:none;
    perspective:1600px;perspective-origin:50% 46%;}
  .scene:active{cursor:grabbing;}
  .scene:focus-visible{outline:2px solid var(--gold);outline-offset:2px;}
  .stage{position:absolute;left:50%;top:74%;width:0;height:0;transform-style:preserve-3d;
    transform:translateY(var(--lift,0px)) scale(var(--zoom,1)) rotateX(var(--pitch,16deg)) rotateY(var(--yaw,-28deg));}
  .room,.island{position:absolute;transform-style:preserve-3d;}
  /* The room is CONTEXT, not the subject. The lit-floor stripes read as glare in
     the operator's screenshot, so the floor is now a single quiet wash and the
     room walls sit well back in value. */
  /* Carpet in the room is a mauve-taupe (photos), not blue. */
  .floor{position:absolute;left:0;top:0;background:
      radial-gradient(ellipse at 50% 50%,rgba(162,140,148,.18),rgba(16,12,16,.9) 78%);
    border:1px solid rgba(200,169,110,.10);}
  .rwall{position:absolute;left:0;top:0;background:linear-gradient(180deg,rgba(30,42,72,.30),rgba(14,22,42,.62));
    border:1px solid rgba(200,169,110,.14);border-bottom:1px solid rgba(200,169,110,.2);backface-visibility:hidden;}
  .rwall.entry{background:linear-gradient(180deg,rgba(28,38,66,.08),rgba(14,22,42,.28));}
  .doorway{position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:38%;height:74%;
    background:linear-gradient(180deg,rgba(200,169,110,.06),rgba(200,169,110,.22));
    border:1px solid rgba(200,169,110,.5);border-bottom:none;border-radius:3px 3px 0 0;
    color:var(--gold);font-size:11px;letter-spacing:.14em;display:flex;align-items:flex-start;justify-content:center;padding-top:6px;}
  .cap{position:absolute;left:0;top:0;background:linear-gradient(135deg,#262014,#120f09);border:1px solid rgba(200,169,110,.45);}
  /* Orientation labels painted flat on the room floor. They carry the FULL MIS
     location string, not a bare compass word — a director reading the floor must
     be able to name the location exactly as the price sheet spells it. */
  .fcomp{position:absolute;color:rgba(232,213,168,.9);font-size:12px;letter-spacing:.1em;white-space:nowrap;text-align:center;line-height:1.35;}
  .fcomp b{display:block;color:var(--gold);font-weight:600;letter-spacing:.16em;font-size:12px;}
  .fcomp i{display:block;font-style:normal;font-size:11px;letter-spacing:.04em;color:rgba(232,213,168,.78);}
  .fc-e{top:8px;left:50%;transform:translateX(-50%);}
  .fc-w{bottom:8px;left:50%;transform:translateX(-50%);}
  .fc-n{left:4px;top:50%;transform:translateY(-50%) rotate(-90deg);}
  .fc-s{right:4px;top:50%;transform:translateY(-50%) rotate(90deg);}
  /* ── Real materials (operator photos, D:\\Cemetery Photos Misc\\New MVC Photos) ──
     Near-black bronze frame with a brass trim line; every niche is champagne-gold
     satin metal lit from above by its LED strip, behind glass. Price tier moves from
     the full cell onto a compact chip so the island reads as the real structure. */
  .face{position:absolute;left:0;top:0;display:grid;gap:2px;background:#15120d;
    padding:2px;border:2px solid #8a7147;
    backface-visibility:hidden;box-shadow:0 0 26px rgba(0,0,0,.55),inset 0 0 0 1px #2b2417;
    transition:transform .55s cubic-bezier(.4,.1,.2,1);}
  .n3{border:none;border-radius:1px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;
    overflow:hidden;line-height:1.05;padding:0;min-width:0;transition:filter .15s;gap:1px;
    color:#3a2c14;
    background:
      linear-gradient(115deg,rgba(255,255,255,.22) 0%,rgba(255,255,255,0) 30%),
      linear-gradient(180deg,#f2dda6 0%,#e2bd79 38%,#cd9d58 100%);
    box-shadow:inset 0 2px 3px rgba(255,248,225,.8),inset 0 -6px 10px -5px rgba(96,58,12,.55),inset 0 0 0 1px rgba(58,44,20,.28);}
  /* Hover pops the space itself — the 7.5px labels are unreadable at rest and the
     operator asked for the space to appear LARGER, not for a corner card. */
  .n3{transition:filter .15s,transform .15s;}
  .n3:not(.pnl3):hover{filter:brightness(1.12) saturate(1.08);transform:scale(1.5);z-index:30;
    box-shadow:0 4px 18px rgba(0,0,0,.55),inset 0 2px 3px rgba(255,248,225,.8),inset 0 0 0 1px rgba(58,44,20,.28);}
  /* While orbiting, niches under the moving cursor must not pop. */
  .scene.dragging .n3:hover{transform:none!important;filter:none!important;}
  .n3id{font-size:7.5px;opacity:.8;letter-spacing:.02em;font-weight:500;}
  .n3p{font-size:7.5px;font-weight:600;padding:0 2px;border-radius:3px;line-height:1.4;
    letter-spacing:-.02em;white-space:nowrap;box-shadow:0 1px 2px rgba(0,0,0,.35);}
  .n3p.c42,.n3p.c48{border-width:1px;}
  /* Glass corner returns: the SIDE of the adjacent end-wall niche, seen through the
     corner. Slightly cooler and dimmer than a lit front, darkening toward the inner
     (deep) edge, with the brass mullion reading at the corner itself. */
  .side3{background:
      linear-gradient(90deg,rgba(20,14,6,.42),rgba(20,14,6,0) 42% 58%,rgba(20,14,6,.42)),
      linear-gradient(180deg,#e0c58e 0%,#c8a266 50%,#a97f45 100%);
    color:#4a3818;box-shadow:inset 0 2px 3px rgba(255,244,214,.5),inset 0 0 0 1px rgba(30,22,10,.4);}
  .s3id{font-size:6.5px;opacity:.65;letter-spacing:.02em;writing-mode:vertical-rl;}
  .pnl3{background:#2e2b27;color:rgba(255,255,255,.32);font-size:6px;letter-spacing:.06em;text-align:center;
    display:flex;align-items:center;justify-content:center;box-shadow:inset 0 0 10px rgba(0,0,0,.55),inset 0 0 0 1px rgba(255,255,255,.05);}
  /* The base course doubles as each wall's nameplate: friendly name + the full MIS
     location string, so no face is ever identified by a bare compass word. */
  .baseband{background:linear-gradient(180deg,#2b251c,#131007);
    display:flex;align-items:center;justify-content:center;gap:8px;color:var(--gold-light);
    font-size:8.5px;letter-spacing:.1em;white-space:nowrap;overflow:hidden;
    box-shadow:inset 0 1px 0 rgba(200,169,110,.5);}
  .baseband b{color:var(--gold);font-weight:600;letter-spacing:.16em;}
  .face-north .baseband,.face-south .baseband{font-size:6.5px;letter-spacing:.02em;gap:4px;}
  /* ── Unfolded plan view ──────────────────────────────────────────────
     Replaces the old "Overhead" button, which showed only the island's lid and
     was — the operator's words — a view that "doesn't really work functionally".
     Here the four walls hinge down flat around the island footprint, so all 145
     openings are visible at once in their true compass positions, each panel
     captioned with its full MIS location string. Because a niche front points
     AWAY from the island, a panel laid face-up necessarily meets the footprint
     at its TOP course (row G) and ends outward at its base band — the nameplate
     therefore lands on the outside edge of each panel, which is where it reads
     best anyway. Inline transforms must be beaten, hence !important. */
  #stage.plan .face-west{transform:translate(-50%,-50%) translate3d(0,${PLAN_Y}px,${PLAN_Z}px) rotateX(90deg)!important;}
  #stage.plan .face-east{transform:translate(-50%,-50%) translate3d(0,${PLAN_Y}px,${-PLAN_Z}px) rotateY(180deg) rotateX(90deg)!important;}
  #stage.plan .face-north{transform:translate(-50%,-50%) translate3d(${-PLAN_X}px,${PLAN_Y}px,0) rotateY(-90deg) rotateX(90deg)!important;}
  #stage.plan .face-south{transform:translate(-50%,-50%) translate3d(${PLAN_X}px,${PLAN_Y}px,0) rotateY(90deg) rotateX(90deg)!important;}
  #stage.plan .cap{transform:translate(-50%,-50%) translateY(${PLAN_Y}px) rotateX(90deg)!important;
    background:linear-gradient(135deg,#332a1c,#1a150c);border:1.5px solid rgba(200,169,110,.75);}
  #stage.plan .room{opacity:.14;}
  #stage.plan .face{box-shadow:0 14px 40px rgba(0,0,0,.6);}
  .cap{transition:transform .55s cubic-bezier(.4,.1,.2,1);}
  /* Upright orientation labels for the plan view. The panels themselves land rotated —
     the far wall inverts and the end walls turn on their side, which is what an
     unfolded interior elevation always does — so the captions live in SCREEN space
     instead, where they always read the right way up. They hide the moment the camera
     leaves the plan angle, because then they would be pointing at nothing. */
  .planlabels{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .3s;z-index:5;}
  .view3d.planmode .scene.plansquare .planlabels{opacity:1;}
  /* Chipped, not bare text: on a narrow screen the net fills the box and these
     captions land on top of the end panels. */
  .planlabels span{position:absolute;color:var(--gold);font-size:11px;letter-spacing:.14em;white-space:nowrap;text-align:center;line-height:1.4;
    background:rgba(7,12,24,.86);border:1px solid rgba(200,169,110,.4);border-radius:4px;padding:3px 9px;}
  .planlabels i{display:block;font-style:normal;font-size:10px;letter-spacing:.03em;color:var(--gold-light);}
  .pl-e{top:6px;left:50%;transform:translateX(-50%);}
  .pl-w{bottom:6px;left:50%;transform:translateX(-50%);}
  .pl-n{left:6px;top:50%;transform:translateY(-50%) rotate(-90deg);transform-origin:center;}
  .pl-s{right:6px;top:50%;transform:translateY(-50%) rotate(90deg);transform-origin:center;}
  /* Seen edge-on at eye level the floor captions collapse into an unreadable smear
     across the bottom of the scene. Hide them until the camera is actually looking down. */
  #stage.flat .fcomp{opacity:0;}
  .fcomp{transition:opacity .25s;}
  .planhint{display:none;text-align:center;font-size:10px;color:var(--gold);margin-top:7px;letter-spacing:.05em;}
  .view3d.planmode .planhint{display:block;}
  .view3d.planmode .hint{display:none;}
  .view3d.planmode .scene{height:min(78vh,760px);}
  .hint{text-align:center;font-size:10px;color:var(--gold-light);opacity:.7;margin-top:7px;letter-spacing:.05em;}
  .modelnote{text-align:center;font-size:9.5px;color:var(--gold-light);opacity:.55;margin-top:3px;}

  /* ── Detail card ── */
  .card{position:fixed;right:16px;bottom:16px;width:274px;background:rgba(16,24,44,.97);border:1px solid var(--gold);
    border-radius:9px;padding:13px 15px;z-index:900;box-shadow:0 10px 40px rgba(0,0,0,.65);font-size:11px;display:none;}
  .card.show{display:block;}
  /* A HOVER card is display-only: taps pass through it to the niche beneath (a camera
     move can leave it parked over the model). Only a pinned card takes pointer events. */
  .card{pointer-events:none;}
  .card.pinned{pointer-events:auto;}
  .cardhd{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:2px;}
  .cardid{font-family:'Cormorant Garamond',serif;font-size:19px;font-weight:700;color:var(--gold);}
  .cardwall{font-size:9px;color:var(--gold-light);letter-spacing:.1em;text-transform:uppercase;}
  .cardmis{font-size:9.5px;color:var(--gold-light);opacity:.8;letter-spacing:.05em;margin-bottom:7px;word-break:break-all;}
  .cr{display:flex;justify-content:space-between;gap:10px;padding:2px 0;border-bottom:1px solid rgba(200,169,110,.1);}
  .cr:last-of-type{border:none;}
  .cl{color:var(--gold-light);}.cv{font-weight:600;color:var(--cream);text-align:right;}
  .ctot{margin-top:6px;padding-top:6px;border-top:1px solid var(--gold);display:flex;justify-content:space-between;}
  .ctl{color:var(--gold);font-weight:600;}.ctv{color:var(--gold);font-weight:700;font-size:13px;}
  .cdim{margin-top:7px;padding-top:6px;border-top:1px dashed rgba(200,169,110,.25);font-size:9.5px;color:var(--gold);}
  .cdim div{padding:1px 0;}
  .cnote{margin-top:5px;font-size:9px;color:var(--gold-light);opacity:.8;font-style:italic;}
  .cclose{background:none;border:none;color:var(--gold-light);font-size:17px;line-height:1;cursor:pointer;padding:0 2px;}
  .cclose:hover{color:var(--cream);}
  @media (max-width:700px){.card{right:8px;left:8px;bottom:8px;width:auto;}}

  /* ── Fees / footer ── */
  .fees{margin-top:14px;background:rgba(200,169,110,.07);border:1px solid var(--gb);border-radius:6px;padding:11px 13px;display:flex;flex-wrap:wrap;gap:12px;max-width:900px;margin-left:auto;margin-right:auto;justify-content:center;}
  .fi{font-size:11px;}.fl{color:var(--gold);font-weight:600;display:block;margin-bottom:1px;}.fv{color:var(--cream);}
  .fees input{width:42px;background:rgba(200,169,110,.12);border:1px solid var(--gold);border-radius:3px;color:var(--cream);padding:2px 4px;font-family:'Jost',sans-serif;font-size:12px;text-align:center;}
  .printcard{display:none;}
  .pfoot{max-width:900px;margin:12px auto 0;text-align:center;font-size:10px;color:var(--gold-light);line-height:1.6;}
  .pfoot b{color:var(--gold);font-weight:600;}
  .back-btn{margin-left:auto;flex-shrink:0;background:none;border:1px solid var(--gb);color:var(--gold-light);padding:9px 14px;border-radius:6px;font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap;text-decoration:none;}
  .back-btn:hover{background:rgba(200,169,110,.15);color:var(--cream);}
  .print-btn{flex-shrink:0;background:rgba(200,169,110,.15);border:1px solid var(--gold);color:var(--gold);padding:9px 16px;border-radius:6px;font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;cursor:pointer;white-space:nowrap;}
  .print-btn:hover{background:rgba(200,169,110,.28);}

  /* ── Phone (counselors hold this in the columbarium) ── */
  @media (max-width:640px){
    .header{flex-wrap:wrap;padding:10px 12px;gap:9px;}
    .hlogo-svg{height:26px;}
    .htxt h1{font-size:14px;}
    .htxt p{font-size:9px;}
    .print-btn{margin-left:0;padding:6px 12px;font-size:11px;}
    .back-btn{margin-left:0;padding:6px 10px;font-size:11px;}
    .main{padding:8px;}
    .moved{padding:9px 12px;font-size:10.5px;}
    .tab{padding:9px 12px;font-size:10px;}
    .toolbar{gap:5px;margin:8px auto 6px;}
    .tbtn{padding:6px 9px;font-size:10px;}
    .tbsep{display:none;}
    .scene{height:min(52vh,420px);min-height:300px;border-radius:8px;}
    .view3d.planmode .scene{height:min(70vh,560px);}
    .planlabels span{font-size:9px;letter-spacing:.06em;padding:2px 6px;}
    .planlabels i{font-size:8.5px;}
    .gwrap{padding:12px 10px;}
    .hint,.modelnote{font-size:9px;}
  }

  /* ── PRINT ────────────────────────────────────────────────────────────
     Screen gets the 3D model; print gets the flat per-wall grids, which is
     the working reference counselors carry. Needs no JavaScript: every wall
     view is real static HTML and print forces them all visible. */
  @media print {
    .no-print,.tabs,.card,.toolbar,.view3d,.owrap,.hint,.modelnote{display:none!important;}
    .ptabs{border:none!important;background:#fff!important;}
    .moved{color:#444!important;padding:6px 0;font-size:10px;}
    .movedlink{color:#1a2744!important;}
    *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important;}
    body{background:#fff!important;color:#1a1a1a!important;}
    .header{background:#fff!important;border-bottom:2px solid #c8540a!important;padding:10px 0;}
    .htxt h1{color:#1a2744!important;}
    .htxt p{color:#555!important;}
    .psec.active .wview{display:block!important;break-before:page;}
    /* #view-3d is also a div, so :first-of-type would not match the first WALL and
       print started with a blank page. Name it. */
    #wall-west{break-before:avoid!important;}
    #wall-overview{display:none!important;}
    /* On a wall tab, print ONLY that wall (operator). From the 3D view or the
       overview, print keeps all four. */
    body.pv-one .psec.active .wview{display:none!important;}
    body.pv-one .psec.active .wview.active{display:block!important;break-before:avoid!important;}
    /* A highlighted space narrows it further: only ITS wall prints (operator). */
    body.pv-sel .psec.active .wview{display:none!important;}
    body.pv-sel .psec.active .wview.printsel{display:block!important;break-before:avoid!important;}
    /* The highlighted space prints its full pricing card too. */
    body.has-printsel .printcard{display:block!important;border:2px solid #1a2744;border-radius:8px;
      padding:12px 16px;max-width:360px;margin:0 auto 14px;break-inside:avoid;font-size:11px;color:#1a1a1a;}
    .printcard .cclose{display:none!important;}
    .printcard .cardid{color:#1a2744!important;}
    .printcard .cardwall,.printcard .cardmis,.printcard .cl,.printcard .cnote{color:#444!important;}
    .printcard .cv{color:#111!important;}
    .printcard .cdim,.printcard .cdim b{color:#1a2744!important;}
    .printcard .ctl,.printcard .ctv{color:#c8540a!important;}
    .printcard .ctot{border-top:1px solid #c8540a;}
    .printcard .cr{border-bottom:1px solid #ddd;}
    .wlabel{color:#1a2744!important;}
    .wsub,.mis,.li,.pfoot{color:#444!important;}
    .gwrap{background:#fff!important;border:1px solid #999!important;}
    .rlbl,.pfoot b,.fl,.ovtitle{color:#1a2744!important;}
    .n{border-color:#00000030!important;}
    /* A space highlighted on screen prints highlighted: the .sel class is mirrored
       onto the flat grid cell, which is exactly what the printer renders. */
    .n.sel{outline:4px solid #c8540a!important;outline-offset:-2px;
      box-shadow:0 0 0 2px #1a2744!important;filter:none!important;transform:none!important;}
    .fv{color:#333!important;}
    .fees{background:#f5f5f2!important;border-color:#c8a96e!important;}
    .fees input{border:1px solid #999!important;background:#fff!important;color:#1a1a1a!important;}
  }
`;

// ── Page runtime ───────────────────────────────────────────────────────────
const JS = `
'use strict';
var OC = ${FEES.OC}, REC = ${FEES.REC};
var fm = function (n) { return '$' + n.toLocaleString('en-US'); };
var ecf = function (p) { return Math.ceil(p * ${FEES.ECF_RATE}); };
var qty = function (id) { var e = document.getElementById(id); return e ? (parseInt(e.value, 10) || 0) : 0; };

// ── Detail card ────────────────────────────────────────────────────────────
var card = document.getElementById('card');
var pinned = null;

function cardHtml(d) {
  var price = +d.price, e = ecf(price), tot = price + e, rows = '';
  rows += '<div class="cr"><span class="cl">Niche Price</span><span class="cv">' + fm(price) + '</span></div>';
  rows += '<div class="cr"><span class="cl">ECF (10%)</span><span class="cv">' + fm(e) + '</span></div>';
  var oc = qty('oc-qty'), rc = qty('rec-qty');
  if (oc > 0) { rows += '<div class="cr"><span class="cl">O&amp;C \\u00d7' + oc + '</span><span class="cv">' + fm(OC * oc) + '</span></div>'; tot += OC * oc; }
  if (rc > 0) { rows += '<div class="cr"><span class="cl">Recording \\u00d7' + rc + '</span><span class="cv">' + fm(REC * rc) + '</span></div>'; tot += REC * rc; }
  var dims = '<div class="cdim"><div>Inside niche: <b>' + d.inside + '</b></div>';
  if (d.opening) dims += '<div>Urn opening: ' + d.opening + '</div>';
  if (d.plate) dims += '<div>Face plate: ' + d.plate + '</div>';
  dims += '<div>Depth: 12&quot;</div></div>';
  return '<div class="cardhd"><span class="cardid">' + d.id + '</span>' +
    '<span class="cardwall">' + (d.walllabel || '') + '</span>' +
    '<button class="cclose" type="button" aria-label="Close">\\u00d7</button></div>' +
    '<div class="cardmis">' + d.mis + '</div>' + rows +
    '<div class="ctot"><span class="ctl">Est. Total</span><span class="ctv">' + fm(Math.round(tot)) + '</span></div>' +
    (+d.urn >= 4 ? '<div class="cnote">Companion niche \\u2014 up to 4 inurnments.</div>' : '') +
    '<div class="cnote">ECF is not included in the listed price.</div>' + dims;
}

var WALL_LABEL = { west: 'Front Wall (West)', east: 'Back Wall (East)', north: 'Side A (North)', south: 'Side B (South)' };

function readNiche(el) {
  var d = {};
  ['wall', 'id', 'price', 'urn', 'mis', 'inside', 'opening', 'plate'].forEach(function (k) {
    var v = el.getAttribute('data-' + k); if (v !== null) d[k] = v;
  });
  d.walllabel = WALL_LABEL[d.wall] || '';
  return d;
}

// Selection lights up EVERY rendering of the same opening — the 3D face and the flat
// wall tab both carry data-wall/data-id, so mirroring costs one querySelectorAll. The
// mini overview grids are excluded: they are a print artefact, not a control surface.
function clearSel() {
  var s = document.querySelectorAll('.sel');
  for (var i = 0; i < s.length; i++) s[i].classList.remove('sel');
}
function markSel(el) {
  clearSel();
  var w = el.getAttribute('data-wall'), id = el.getAttribute('data-id');
  var all = document.querySelectorAll('[data-wall="' + w + '"][data-id="' + id + '"]');
  for (var i = 0; i < all.length; i++) if (!all[i].closest('.mini')) all[i].classList.add('sel');
}

// The card opens NEXT TO the space it describes (operator: "not in the far right
// corner"), preferring the right side of the niche, flipping left when cramped,
// always clamped on screen. Phones keep the fixed bottom sheet: on a small screen
// "beside the niche" and "over the niche map" are the same place.
function placeCard(el) {
  if (window.matchMedia('(max-width:700px)').matches) {
    card.style.left = card.style.top = card.style.right = card.style.bottom = '';
    return;
  }
  var r = el.getBoundingClientRect();
  card.style.right = 'auto'; card.style.bottom = 'auto';
  var cw = card.offsetWidth || 274, ch = card.offsetHeight || 240;
  var x = r.right + 14, y = r.top + r.height / 2 - ch / 2;
  if (x + cw > window.innerWidth - 8) x = r.left - cw - 14;
  if (x < 8) x = Math.min(Math.max(8, r.right + 14), window.innerWidth - cw - 8);
  y = Math.max(8, Math.min(y, window.innerHeight - ch - 8));
  card.style.left = x + 'px'; card.style.top = y + 'px';
}

// The pinned space's pricing card also lands in a print-only block, so the printout
// carries the same information the hover card shows on screen.
function setPrintCard(d) {
  document.getElementById('printcard').innerHTML = cardHtml(d);
  document.body.classList.add('has-printsel');
  // Print follows the highlight: only the wall carrying the selected space prints.
  var old = document.querySelectorAll('.wview.printsel');
  for (var i = 0; i < old.length; i++) old[i].classList.remove('printsel');
  var wv = document.getElementById('wall-' + d.wall);
  if (wv) { wv.classList.add('printsel'); document.body.classList.add('pv-sel'); }
}
function showCard(el, pin) {
  var d = readNiche(el);
  card.innerHTML = cardHtml(d);
  card.classList.add('show');
  placeCard(el);
  if (pin) { pinned = el; markSel(el); }
  card.classList.toggle('pinned', pinned === el);
  if (pinned === el) setPrintCard(d);
}
function hideCard() {
  card.classList.remove('show');
  card.classList.remove('pinned');
  pinned = null;
  clearSel();
  document.getElementById('printcard').innerHTML = '';
  document.body.classList.remove('has-printsel');
  document.body.classList.remove('pv-sel');
  var old = document.querySelectorAll('.wview.printsel');
  for (var i = 0; i < old.length; i++) old[i].classList.remove('printsel');
}

document.addEventListener('click', function (ev) {
  if (ev.target.closest('.cclose')) { hideCard(); return; }
  var n = ev.target.closest('.n:not(.pnl), .n3:not(.pnl3)');
  if (n && n.hasAttribute('data-id')) { showCard(n, true); return; }
  // Clicking the chrome — a wall tab, a camera button — must not drop the selection.
  // Switching to the flat wall tab to see the niche you just picked in 3D is the whole
  // point of mirroring the selected state across both renderings.
  if (!ev.target.closest('#card, .tab, .tbtn')) hideCard();
});
document.addEventListener('mouseover', function (ev) {
  if (window.matchMedia('(hover: none)').matches) return;
  if (last) return; // mid-drag: sweeping the cursor across niches must not hover-pop them
  var n = ev.target.closest('.n:not(.pnl), .n3:not(.pnl3)');
  if (n && n.hasAttribute('data-id') && !n.closest('.mini')) showCard(n, false);
  else if (pinned) showCard(pinned, false);
});
// Keyboard focus pins; a MOUSE press must not. Chromium focuses a <button> on
// mousedown, so without the :focus-visible test, starting an orbit drag on top of a
// niche silently selected it — visible as a stray highlight the moment click=highlight
// was made loud enough to notice.
document.addEventListener('focusin', function (ev) {
  var n = ev.target.closest('.n:not(.pnl), .n3:not(.pnl3)');
  if (!n || !n.hasAttribute('data-id')) return;
  var kb = true;
  try { kb = n.matches(':focus-visible'); } catch (e) { kb = true; }
  if (kb) showCard(n, true);
});
document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') hideCard(); });
['oc-qty', 'rec-qty'].forEach(function (id) {
  var e = document.getElementById(id);
  if (e) e.addEventListener('input', function () { if (pinned) showCard(pinned, false); });
});

// ── Tabs ───────────────────────────────────────────────────────────────────
// NOTE: this deliberately does NOT hide the card. A selection made in the 3D view is
// mirrored onto the same niche in the flat wall tab, and clearing it on every tab
// switch made that mirroring unobservable — the two renderings are never on screen at
// the same time. Select in 3D, switch to the wall tab, the niche is still lit.
function showView(v) {
  var views = document.querySelectorAll('.wview, .view3d');
  for (var i = 0; i < views.length; i++) views[i].classList.remove('active');
  var el = document.getElementById(v === '3d' ? 'view-3d' : 'wall-' + v);
  if (el) el.classList.add('active');
  var tabs = document.querySelectorAll('#mvc-tabs .tab');
  for (var j = 0; j < tabs.length; j++) tabs[j].classList.toggle('active', tabs[j].getAttribute('data-view') === v);
  // On a wall tab, print only that wall.
  document.body.classList.toggle('pv-one', ['west', 'east', 'north', 'south'].indexOf(v) > -1);
  if (v === '3d') fitScene();
}
document.querySelectorAll('#mvc-tabs .tab').forEach(function (t) {
  t.addEventListener('click', function () { showView(t.getAttribute('data-view')); });
});

// ── 3D camera ──────────────────────────────────────────────────────────────
var scene = document.getElementById('scene'), stage = document.getElementById('stage'), view3d = document.getElementById('view-3d');
// NEGATIVE pitch is ABOVE the island, positive is BELOW it — measured, not assumed
// (scratch/_mvc3dpolish/probe2.mjs projects the island's cap and compares it with the
// west face). The shipped defaults had this backwards: pitch +16 opened the page
// looking UP at the island from under the floor, and "Overhead" at +54 was further
// underneath still. PMAX is therefore 0 — dead eye level, the lowest the camera may
// ever sit — and the eye can rise to straight down at -90.
var DEF = { yaw: 0, pitch: 0, zoom: 1 };
var cam = { yaw: DEF.yaw, pitch: DEF.pitch, zoom: DEF.zoom, lift: 0 };
var ZMIN = 0.32, ZMAX = 2.6, PMIN = -90, PMAX = 0;
var fitZoom = 1;
var ISLAND_HALF_PX = ${px(FACE_H_IN / 2)};   // island centre height above the floor
var STAGE_TOP = 0.74;                        // must match .stage{top:}

var clamp = function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; };

function apply() {
  cam.pitch = clamp(cam.pitch, PMIN, PMAX);
  cam.zoom = clamp(cam.zoom, ZMIN, ZMAX);
  stage.style.setProperty('--yaw', cam.yaw.toFixed(2) + 'deg');
  stage.style.setProperty('--pitch', cam.pitch.toFixed(2) + 'deg');
  stage.style.setProperty('--zoom', cam.zoom.toFixed(3));
  stage.style.setProperty('--lift', cam.lift.toFixed(1) + 'px');
  // Floor captions are only legible from above; the screen-space plan captions are
  // only true while the camera is square over the net.
  stage.classList.toggle('flat', cam.pitch > -14);
  scene.classList.toggle('plansquare', Math.abs(cam.pitch + 90) < 8 && Math.abs(cam.yaw % 360) < 8);
  var f = null, best = -2;
  ['west', 'east', 'north', 'south'].forEach(function (k) {
    var normal = { west: 0, east: 180, north: 270, south: 90 }[k];
    var a = (normal + cam.yaw) * Math.PI / 180;
    var d = Math.cos(a) * Math.cos(cam.pitch * Math.PI / 180);
    if (d > best) { best = d; f = k; }
  });
  document.querySelectorAll('[data-facebtn]').forEach(function (b) {
    b.classList.toggle('on', b.getAttribute('data-facebtn') === f && best > 0.86);
  });
}

// Scale so the island fills a sensible share of the viewport at any width.
function fitScene() {
  if (!scene.offsetWidth) return;
  fitZoom = clamp(scene.offsetWidth / 900, 0.58, 1);
  if (Math.abs(cam.zoom - DEF.zoom) < 0.001 || cam.zoom === fitZoom) { cam.zoom = fitZoom; }
  DEF.zoom = fitZoom;
  if (planOn) { planView(); return; }
  apply();
}
window.addEventListener('resize', fitScene);

// Square-on to one wall: zoom so the WHOLE wall fits the scene box (row G used to
// clip off the top), and lift the stage so the wall sits centred rather than
// hanging above the floor origin.
function faceOn(k) {
  setPlan(false);
  // A camera jump moves the model under a stationary cursor; Chrome then fires a
  // synthetic hover that can park a stale card over the niches. Drop it.
  if (!pinned) card.classList.remove('show');
  cam.yaw = { west: 0, east: 180, north: 90, south: -90 }[k];
  cam.pitch = 0;
  var f = document.querySelector('.face-' + k);
  var fw = f.offsetWidth || 480, fh = f.offsetHeight || 315;
  var z = Math.min(scene.clientWidth * 0.84 / fw, scene.clientHeight * 0.8 / fh);
  cam.zoom = clamp(z, ZMIN, ZMAX);
  cam.lift = ISLAND_HALF_PX * cam.zoom - (STAGE_TOP - 0.5) * scene.clientHeight;
  apply();
}
document.querySelectorAll('[data-facebtn]').forEach(function (b) {
  b.addEventListener('click', function () { faceOn(b.getAttribute('data-facebtn')); });
});
// UNFOLDED PLAN — the replacement for the old "Overhead" button. Straight down on a
// closed island shows nothing but the lid, so the four walls hinge flat into the floor
// plane and the camera looks straight down at the resulting net: all 145 openings at
// once, in their true compass positions, each panel captioned with its MIS string.
var planOn = false;
function setPlan(on) {
  if (planOn === on) return;
  planOn = on;
  stage.classList.toggle('plan', on);
  view3d.classList.toggle('planmode', on);
  document.getElementById('btn-plan').classList.toggle('on', on);
}
function planView() {
  setPlan(true);
  if (!pinned) card.classList.remove('show');
  cam.yaw = 0; cam.pitch = -90;
  cam.zoom = clamp(Math.min(scene.clientWidth * 0.94 / ${PLAN_W},
                            scene.clientHeight * 0.92 / ${PLAN_D}), ZMIN, ZMAX);
  // At -90 the island's own height projects to nothing, so only the stage offset matters.
  cam.lift = -(STAGE_TOP - 0.5) * scene.clientHeight;
  apply();
}
document.getElementById('btn-plan').addEventListener('click', function () {
  if (planOn) { faceOn('west'); } else { planView(); }
});
// The FRONT (West) face-on view is the page's home view: it is what a counselor sees
// walking in the entry doors. Reset returns to it.
document.getElementById('btn-reset').addEventListener('click', function () { faceOn('west'); });
document.getElementById('btn-in').addEventListener('click', function () { cam.zoom *= 1.25; apply(); });
document.getElementById('btn-out').addEventListener('click', function () { cam.zoom /= 1.25; apply(); });

// Drag to orbit / pinch to zoom. Zoom is CLAMPED at both ends.
var pts = {}, last = null, pinchStart = 0, zoomStart = 1, moved = 0, captured = false;
var downNiche = null, downAt = 0;
// Capture is deferred until a drag is REAL (or a second finger lands). Capturing on
// pointerdown retargeted the subsequent click event to the scene itself, so a tap on
// a 3D niche never reached the niche button — the document click handler saw only
// "scene", missed, and closed the card. That is why click-to-highlight worked in the
// flat wall tabs but never from a tap in the 3D view.
function capturePts() {
  if (captured) return;
  captured = true;
  scene.classList.add('dragging');
  // A lingering HOVER card must not ride along under the drag; a pinned one stays.
  if (!pinned) card.classList.remove('show');
  Object.keys(pts).forEach(function (id) {
    try { scene.setPointerCapture(+id); } catch (e) { /* pointer already gone */ }
  });
}
scene.addEventListener('pointerdown', function (ev) {
  // Selection inside the scene is decided by OUR tap detector in endPtr, never by the
  // native click that follows — a micro-drag that stayed under the threshold used to
  // count as a click and pin whatever niche it started on (the operator's "I highlight
  // things accidentally when I move around"). Remember where the gesture began.
  if (Object.keys(pts).length === 0) {
    var n = ev.target.closest('.n3');
    downNiche = (n && !n.classList.contains('pnl3') && n.hasAttribute('data-id')) ? n : null;
    downAt = performance.now();
  } else {
    downNiche = null; // a second finger means pinch, never a tap
  }
  pts[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
  var ids = Object.keys(pts);
  if (ids.length === 1) { last = { x: ev.clientX, y: ev.clientY }; moved = 0; }
  else if (ids.length === 2) { pinchStart = dist(); zoomStart = cam.zoom; capturePts(); }
});
function dist() {
  var k = Object.keys(pts); if (k.length < 2) return 0;
  return Math.hypot(pts[k[0]].x - pts[k[1]].x, pts[k[0]].y - pts[k[1]].y);
}
scene.addEventListener('pointermove', function (ev) {
  if (!pts[ev.pointerId]) return;
  pts[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
  var ids = Object.keys(pts);
  if (ids.length >= 2) {
    var d = dist();
    if (pinchStart > 8) { cam.zoom = zoomStart * (d / pinchStart); apply(); }
    moved = 99;
    return;
  }
  if (!last) return;
  var dx = ev.clientX - last.x, dy = ev.clientY - last.y;
  moved += Math.abs(dx) + Math.abs(dy);
  if (moved > 8) capturePts();
  cam.yaw += dx * 0.35;
  cam.pitch -= dy * 0.28;
  last = { x: ev.clientX, y: ev.clientY };
  apply();
});
// EVERY native click that follows a pointer gesture in the scene is swallowed — the
// tap detector below is the only way a gesture selects a niche. (Keyboard activation
// still works: Enter fires a click with no preceding pointer gesture, so the window
// has long expired.) The window must outlive the click's dispatch on slow phones.
var suppressUntil = 0;
function endPtr(ev) {
  delete pts[ev.pointerId];
  if (!Object.keys(pts).length) {
    suppressUntil = performance.now() + 450;
    // A clean tap: one finger, started on a niche, barely moved, briefly held.
    if (ev.type === 'pointerup' && downNiche && moved <= 8 && performance.now() - downAt < 700) {
      showCard(downNiche, true);
    } else if (ev.type === 'pointerup' && !downNiche && moved <= 8 && !ev.target.closest('#card')) {
      hideCard(); // a tap on empty scene still clears, as a native click used to
    }
    downNiche = null;
    last = null; pinchStart = 0; moved = 0; captured = false;
    scene.classList.remove('dragging');
  }
}
scene.addEventListener('pointerup', endPtr);
scene.addEventListener('pointercancel', endPtr);
scene.addEventListener('click', function (ev) {
  if (performance.now() < suppressUntil) { ev.stopPropagation(); ev.preventDefault(); }
}, true);

scene.addEventListener('wheel', function (ev) {
  ev.preventDefault();
  cam.zoom *= Math.exp(-ev.deltaY * 0.0012);
  apply();
}, { passive: false });

scene.addEventListener('keydown', function (ev) {
  var k = ev.key, step = ev.shiftKey ? 15 : 5;
  if (k === 'ArrowLeft') cam.yaw -= step;
  else if (k === 'ArrowRight') cam.yaw += step;
  else if (k === 'ArrowUp') cam.pitch += step;
  else if (k === 'ArrowDown') cam.pitch -= step;
  else if (k === '+' || k === '=') cam.zoom *= 1.2;
  else if (k === '-' || k === '_') cam.zoom /= 1.2;
  else return;
  ev.preventDefault();
  apply();
});

// Home view: Front (West), face on. Not a 3/4 orbit — the operator opens this page to
// the wall he is standing in front of.
fitScene();
faceOn('west');
`;

const FEES_MVC = `<div class="fees">
    <div class="fi"><span class="fl">Niche Inurnment O&amp;C — $${FEES.OC} ea</span>
      <span class="fv">Qty: <input type="number" id="oc-qty" min="0" max="4" value="0" aria-label="Opening and closing quantity"></span></div>
    <div class="fi"><span class="fl">Recording Fee — $${FEES.REC} ea</span>
      <span class="fv">Qty: <input type="number" id="rec-qty" min="0" max="4" value="0" aria-label="Recording fee quantity"></span></div>
    <div class="fi"><span class="fl">ECF</span><span class="fv">10% of niche price — not included in listed prices</span></div>
    <div class="fi"><span class="fl">Standard Niches</span><span class="fv">Up to 2 inurnments</span></div>
    <div class="fi"><span class="fl">Companion Niches ($42K/$48K)</span><span class="fv">Up to 4 inurnments</span></div>
  </div>`;

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bonney Watson — Niche Maps</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
<!-- Generated by scripts/build_mvc_map.mjs from scripts/mvc-niche-data.mjs. Do not hand-edit. -->
<style>${CSS}</style>
</head>
<body>
<div class="header">
  ${LOGO}
  <div class="htxt" id="header-txt">
    <h1>Mountain View Columbarium — New Glass Front Niches</h1>
    <p>Washington Memorial Park &nbsp;·&nbsp; Center Island Structure</p>
  </div>
  <a class="back-btn no-print" href="../">&larr; Quote Tool</a>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
</div>
<div class="ptabs">
  <div class="moved">Terrace Garden niches have moved &mdash; they now live with the rest of the Terrace Garden Memorial Path.
    <a class="movedlink" href="TGMP_Map.html">Open the Terrace Garden Memorial Path map &rarr;</a></div>
</div>
<div class="tabs" id="mvc-tabs">
  <button class="tab active" data-view="3d">3D View</button>
  <button class="tab" data-view="west">Front Wall (West)</button>
  <button class="tab" data-view="east">Back Wall (East)</button>
  <button class="tab" data-view="north">Side A (North)</button>
  <button class="tab" data-view="south">Side B (South)</button>
  <button class="tab" data-view="overview" style="margin-left:auto;border-left:1px solid var(--gb);">Overview (All Walls)</button>
</div>
<div class="main">
<div class="printcard" id="printcard" aria-hidden="true"></div>
<div class="psec active" id="psec-mvc">

  <div class="view3d active" id="view-3d">
    <div class="toolbar no-print">
${WALL_ORDER.map((k) => {
    const w = WALLS[k];
    return `      <button class="tbtn" data-facebtn="${k}" title="${esc(w.label)} — ${esc(w.mis)}" aria-label="${esc(w.label)}, ${esc(w.mis)}">${esc(w.label.replace(' Wall', '').replace(' (', ' · ').replace(')', ''))}</button>`;
  }).join('\n')}
      <div class="tbsep"></div>
      <button class="tbtn" id="btn-plan" title="Unfold all four walls flat around the island footprint">Unfolded plan</button>
      <button class="tbtn" id="btn-reset">Reset view</button>
      <div class="tbsep"></div>
      <button class="tbtn" id="btn-out" aria-label="Zoom out">&minus;</button>
      <button class="tbtn" id="btn-in" aria-label="Zoom in">+</button>
    </div>
${scene3d()}
    <div class="hint">Drag to orbit &nbsp;·&nbsp; scroll or pinch to zoom &nbsp;·&nbsp; tap a niche to select it &nbsp;·&nbsp; arrow keys orbit, +/&minus; zoom</div>
    <div class="planhint">Unfolded plan — all four walls laid flat around the island footprint, seen from above. Each panel meets the island at its top course (row G) and ends at its base band, which names the wall and its MIS location. Tap any niche; press “Unfolded plan” again to fold the island back up.</div>
    <div class="modelnote">Island ${ISLAND.length}&Prime; long &times; ${ISLAND.depth}&Prime; deep &times; 7&prime;-4&frac34;&Prime; tall &nbsp;·&nbsp; 145 openings &nbsp;·&nbsp; niche depth 1&prime;-0&Prime; &nbsp;·&nbsp; octagonal room 24&prime;-0&Prime; &times; 12&prime;-0&Prime;, entry doors on the West side, electrical access panel behind the West wall</div>
    <div class="legend">${legendHtml(TIERS.map((t) => t.p))}</div>
    ${RIGHTS_LEG(true)}
  </div>

${WALL_ORDER.map((k) => wallView(WALLS[k])).join('\n')}
${overviewView()}

  ${FEES_MVC}
  <div class="pfoot">
    <b>Prices effective: ${EFFECTIVE}</b><br>
    Individual niche dimensions are available in MIS/Enterprise (Advantage\\Cemetery\\Property).<br>
    Structure dimensions on this page are taken from the Matthews Gibraltar fabrication drawing K25-377.
  </div>
</div><!-- /psec-mvc -->

</div><!-- /main -->

<aside class="card no-print" id="card" role="dialog" aria-live="polite" aria-label="Niche detail"></aside>

<script>
${JS}
</script>
</body>
</html>
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, HTML.replace(/\r?\n/g, '\r\n'), 'utf8');
const n = Object.values(WALLS).reduce((a, w) => a + w.cells.filter((c) => !c.panel).length, 0);
console.log(`wrote ${path.relative(ROOT, OUT)} — ${(fs.statSync(OUT).size / 1024).toFixed(1)} KB, ${n} sellable niches`);
