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
  WALLS, WALL_ORDER, ISLAND, ROOM, ROW_LETTERS, ROW_HEIGHTS_IN,
  cellDims, TIERS, FEES, EFFECTIVE, TGN,
} from './mvc-niche-data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'MAPS', 'MVC_NewGlassFront_NicheMap_1.html');

const PPI = 3.6;            // px per inch in the 3D scene
const FLAT_PPI = 4.6;       // px per inch in the flat print grids
const px = (v) => +(v * PPI).toFixed(2);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = (n) => '$' + n.toLocaleString('en-US');
const shortMoney = (n) => '$' + (n / 1000) + 'K';
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

function face3d(wall) {
  const w = px(wall.widthIn), h = px(FACE_H_IN);
  const cells = wall.cells.map((c) => {
    if (c.panel) {
      return `      <div class="n3 pnl3" style="grid-row:${c.r1}/${c.r2};grid-column:${c.c1}/${c.c2}" aria-hidden="true"><span>ACCESS<br>PANEL</span></div>`;
    }
    return `      <button type="button" class="n3 ${tierClass(c.price)}" style="grid-row:${c.r1}/${c.r2};grid-column:${c.c1}/${c.c2}" ${nicheAttrs(wall, c)} aria-label="${esc(ariaName(wall, c))}"><span class="n3id">${esc(c.id)}</span><span class="n3p">${shortMoney(c.price)}</span></button>`;
  }).join('\n');
  return `    <div class="face face-${wall.key}" data-face="${wall.key}" style="width:${w}px;height:${h}px;grid-template-columns:repeat(${wall.subcols},1fr);grid-template-rows:${GRID_ROWS_FR};transform:translate(-50%,-50%) ${FACE_TRANSFORM[wall.key]}">
${cells}
      <div class="baseband" style="grid-row:8/9;grid-column:1/${wall.subcols + 1}"><span>${esc(wall.short.toUpperCase())}</span></div>
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
        <span class="fcomp fc-e">BACK &middot; EAST</span>
        <span class="fcomp fc-w">FRONT &middot; WEST &middot; ENTRY</span>
        <span class="fcomp fc-n">SIDE A &middot; NORTH</span>
        <span class="fcomp fc-s">SIDE B &middot; SOUTH</span>
      </div>
${edges}
    </div>
    <div class="island" style="transform:translateY(${px(-FACE_H_IN / 2)}px)">
${WALL_ORDER.map((k) => face3d(WALLS[k])).join('\n')}
${cap}
    </div>
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
    return `    <button type="button" class="n ${tierClass(c.price)}" style="grid-row:${c.r1}/${c.r2};grid-column:${c.c1 + 1}/${c.c2 + 1}" ${nicheAttrs(wall, c)} aria-label="${esc(ariaName(wall, c))}"><span class="nid">${esc(c.id)}</span><span class="nprice">${money(c.price)}</span><span class="ncap">${c.urn}-urn</span></button>`;
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

// ── Terrace Garden ─────────────────────────────────────────────────────────
function tgnGrid() {
  const rowStr = TGN.rows.map(() => '64px').join(' ');
  const labels = TGN.rows.map((L, i) => `    <div class="rlbl" style="grid-column:1;grid-row:${i + 1}/${i + 2}">${L}</div>`).join('\n');
  const cells = TGN.rows.flatMap((L, ri) => Array.from({ length: TGN.cols }, (_, ci) => {
    const p = TGN.rowPrices[L], id = `${L}-${ci + 1}`;
    return `    <button type="button" class="n ${tierClass(p)}" style="grid-row:${ri + 1}/${ri + 2};grid-column:${ci + 2}/${ci + 3}" data-wall="tgn" data-id="${id}" data-price="${p}" data-urn="2" data-mis="Terrace Garden Niches" data-inside="${esc(TGN.dim)}" aria-label="${id}, Terrace Garden Niches, ${money(p)}, 2 rights"><span class="nid">${id}</span><span class="nprice">${money(p)}</span><span class="ncap">2-urn</span></button>`;
  })).join('\n');
  return `  <div class="fgrid" style="grid-template-columns:24px repeat(${TGN.cols},1fr);grid-template-rows:${rowStr};max-width:780px;">
${labels}
${cells}
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
  .ptab{padding:12px 22px;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--gold-light);cursor:pointer;border:none;border-bottom:3px solid transparent;white-space:nowrap;transition:all .2s;background:none;}
  .ptab:hover{color:var(--cream);background:rgba(200,169,110,.06);}
  .ptab.active{color:var(--gold);border-bottom-color:var(--gold);background:rgba(200,169,110,.1);}
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

  /* ── Flat niche cell ── */
  .n{border-radius:3px;border:1px solid rgba(200,169,110,.3);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;transition:transform .15s,box-shadow .15s;text-align:center;padding:2px;line-height:1.2;color:rgba(255,255,255,.92);font-size:8.5px;min-width:0;font-family:'Jost',sans-serif;}
  .n:hover{transform:scale(1.04);border-color:var(--gold);z-index:10;box-shadow:0 4px 16px rgba(0,0,0,.5),0 0 0 1px var(--gold);}
  .n:focus-visible,.n3:focus-visible{outline:2px solid #fff;outline-offset:1px;z-index:20;}
  .n.sel,.n3.sel{box-shadow:0 0 0 2px #fff,0 0 18px rgba(255,255,255,.5);z-index:15;}
  .pnl{background:#0d111a!important;border-color:rgba(255,255,255,.06)!important;cursor:default;color:rgba(255,255,255,.18);font-size:7px;letter-spacing:.06em;text-transform:uppercase;}
  .pnl:hover{transform:none!important;box-shadow:none!important;}
  .nid{font-size:8px;opacity:.6;}
  .nprice{font-weight:600;font-size:11px;}
  .fgrid.mini .nid{font-size:5px;}.fgrid.mini .nprice{font-size:7px;}.fgrid.mini .ncap{font-size:5px;}
  .fgrid.mini .n{padding:1px;cursor:default;}
  .fgrid.mini .n:hover{transform:none;box-shadow:none;border-color:rgba(200,169,110,.3);}
  .ncap{font-size:8px;opacity:.72;}

  /* ── Price colours (shared by flat + 3D) ── */
  .c7{background:linear-gradient(135deg,rgba(50,100,65,.78),rgba(50,100,65,.58));border-color:rgba(50,100,65,.7);}
  .c8{background:linear-gradient(135deg,rgba(74,124,92,.78),rgba(74,124,92,.58));border-color:rgba(74,124,92,.7);}
  .c10{background:linear-gradient(135deg,rgba(90,120,170,.75),rgba(90,120,170,.55));border-color:rgba(90,120,170,.68);}
  .c12{background:linear-gradient(135deg,rgba(80,138,105,.75),rgba(80,138,105,.55));border-color:rgba(80,138,105,.68);}
  .c14{background:linear-gradient(135deg,rgba(115,105,162,.75),rgba(115,105,162,.55));border-color:rgba(115,105,162,.68);}
  .c16{background:linear-gradient(135deg,rgba(190,78,10,.78),rgba(190,78,10,.58));border-color:rgba(190,78,10,.7);}
  .c18{background:linear-gradient(135deg,rgba(170,60,0,.78),rgba(170,60,0,.58));border-color:rgba(170,60,0,.7);}
  .c20{background:linear-gradient(135deg,rgba(130,25,0,.78),rgba(130,25,0,.58));border-color:rgba(130,25,0,.7);}
  .c42{background:linear-gradient(135deg,rgba(20,32,60,.96),rgba(10,18,38,.96));border:2px solid var(--gold);}
  .c48{background:linear-gradient(135deg,rgba(8,14,30,.97),rgba(3,7,18,.97));border:2px solid var(--gold);}

  .legend{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px;justify-content:center;}
  .li{display:flex;align-items:center;gap:5px;font-size:10px;color:var(--gold-light);}
  .ls{width:13px;height:13px;border-radius:2px;border:1px solid rgba(255,255,255,.2);flex-shrink:0;}
  .rightsleg{display:flex;flex-wrap:wrap;gap:14px;margin-top:6px;justify-content:center;}
  .rs2{background:linear-gradient(135deg,rgba(90,120,170,.75),rgba(90,120,170,.55));border-color:rgba(90,120,170,.68);}
  .rs4{background:linear-gradient(135deg,rgba(8,14,30,.97),rgba(3,7,18,.97));border:1px solid var(--gold);}

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
  .floor{position:absolute;left:0;top:0;background:
      repeating-linear-gradient(90deg,rgba(200,169,110,.07) 0 38px,transparent 38px 76px),
      radial-gradient(ellipse at 50% 50%,rgba(200,169,110,.3),rgba(14,22,42,.85) 76%);}
  .rwall{position:absolute;left:0;top:0;background:linear-gradient(180deg,rgba(44,60,102,.34),rgba(22,33,60,.72));
    border:1px solid rgba(200,169,110,.28);border-bottom:2px solid rgba(200,169,110,.4);backface-visibility:hidden;}
  .rwall.entry{background:linear-gradient(180deg,rgba(36,49,86,.1),rgba(20,30,54,.4));}
  .doorway{position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:38%;height:74%;
    background:linear-gradient(180deg,rgba(200,169,110,.06),rgba(200,169,110,.22));
    border:1px solid rgba(200,169,110,.5);border-bottom:none;border-radius:3px 3px 0 0;
    color:var(--gold);font-size:11px;letter-spacing:.14em;display:flex;align-items:flex-start;justify-content:center;padding-top:6px;}
  .cap{position:absolute;left:0;top:0;background:linear-gradient(135deg,rgba(74,61,43,.82),rgba(42,34,24,.82));border:1px solid rgba(200,169,110,.35);}
  /* Compass labels painted flat on the room floor — the point of the overhead view. */
  .fcomp{position:absolute;color:rgba(200,169,110,.72);font-size:13px;letter-spacing:.18em;white-space:nowrap;}
  .fc-e{top:10px;left:50%;transform:translateX(-50%);}
  .fc-w{bottom:10px;left:50%;transform:translateX(-50%);}
  .fc-n{left:16px;top:50%;transform:translateY(-50%) rotate(-90deg);}
  .fc-s{right:16px;top:50%;transform:translateY(-50%) rotate(90deg);}
  .face{position:absolute;left:0;top:0;display:grid;gap:1.5px;background:var(--bronze);
    padding:1.5px;border:1.5px solid #57462f;
    backface-visibility:hidden;box-shadow:0 0 26px rgba(0,0,0,.55);}
  .n3{border:none;border-radius:1px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;
    overflow:hidden;line-height:1.05;color:rgba(255,255,255,.95);padding:0;min-width:0;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.22),inset 0 -2px 4px rgba(0,0,0,.4);}
  .n3:hover{filter:brightness(1.45);}
  .n3id{font-size:7px;opacity:.72;letter-spacing:.02em;}
  .n3p{font-size:9px;font-weight:600;}
  .pnl3{background:#241d14;color:rgba(255,255,255,.3);font-size:6px;letter-spacing:.06em;text-align:center;
    display:flex;align-items:center;justify-content:center;box-shadow:inset 0 0 8px rgba(0,0,0,.6);}
  .baseband{background:linear-gradient(180deg,#3d3225,#241c12);
    display:flex;align-items:center;justify-content:center;color:rgba(200,169,110,.5);font-size:8px;letter-spacing:.3em;}
  .hint{text-align:center;font-size:10px;color:var(--gold-light);opacity:.7;margin-top:7px;letter-spacing:.05em;}
  .modelnote{text-align:center;font-size:9.5px;color:var(--gold-light);opacity:.55;margin-top:3px;}

  /* ── Detail card ── */
  .card{position:fixed;right:16px;bottom:16px;width:274px;background:rgba(16,24,44,.97);border:1px solid var(--gold);
    border-radius:9px;padding:13px 15px;z-index:900;box-shadow:0 10px 40px rgba(0,0,0,.65);font-size:11px;display:none;}
  .card.show{display:block;}
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
  .pfoot{max-width:900px;margin:12px auto 0;text-align:center;font-size:10px;color:var(--gold-light);line-height:1.6;}
  .pfoot b{color:var(--gold);font-weight:600;}
  .print-btn{margin-left:auto;flex-shrink:0;background:rgba(200,169,110,.15);border:1px solid var(--gold);color:var(--gold);padding:9px 16px;border-radius:6px;font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;cursor:pointer;white-space:nowrap;}
  .print-btn:hover{background:rgba(200,169,110,.28);}

  /* ── Phone (counselors hold this in the columbarium) ── */
  @media (max-width:640px){
    .header{flex-wrap:wrap;padding:10px 12px;gap:9px;}
    .hlogo-svg{height:26px;}
    .htxt h1{font-size:14px;}
    .htxt p{font-size:9px;}
    .print-btn{margin-left:0;padding:6px 12px;font-size:11px;}
    .main{padding:8px;}
    .ptab{padding:10px 14px;font-size:11px;}
    .tab{padding:9px 12px;font-size:10px;}
    .toolbar{gap:5px;margin:8px auto 6px;}
    .tbtn{padding:6px 9px;font-size:10px;}
    .tbsep{display:none;}
    .scene{height:min(52vh,420px);min-height:300px;border-radius:8px;}
    .gwrap{padding:12px 10px;}
    .hint,.modelnote{font-size:9px;}
  }

  /* ── PRINT ────────────────────────────────────────────────────────────
     Screen gets the 3D model; print gets the flat per-wall grids, which is
     the working reference counselors carry. Needs no JavaScript: every wall
     view is real static HTML and print forces them all visible. */
  @media print {
    .no-print,.ptabs,.tabs,.card,.toolbar,.view3d,.owrap,.hint,.modelnote{display:none!important;}
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
    .wlabel{color:#1a2744!important;}
    .wsub,.mis,.li,.pfoot{color:#444!important;}
    .gwrap{background:#fff!important;border:1px solid #999!important;}
    .rlbl,.pfoot b,.fl,.ovtitle{color:#1a2744!important;}
    .n{border-color:#00000030!important;}
    .fv{color:#333!important;}
    .fees{background:#f5f5f2!important;border-color:#c8a96e!important;}
    .fees input{border:1px solid #999!important;background:#fff!important;color:#1a1a1a!important;}
  }
`;

// ── Page runtime ───────────────────────────────────────────────────────────
const JS = `
'use strict';
var OC = ${FEES.OC}, REC = ${FEES.REC}, INSCR = ${FEES.INSCR}, TAX = ${FEES.TAX};
var fm = function (n) { return '$' + n.toLocaleString('en-US'); };
var ecf = function (p) { return Math.ceil(p * ${FEES.ECF_RATE}); };
var qty = function (id) { var e = document.getElementById(id); return e ? (parseInt(e.value, 10) || 0) : 0; };

// ── Detail card ────────────────────────────────────────────────────────────
var card = document.getElementById('card');
var pinned = null;

function cardHtml(d) {
  var price = +d.price, e = ecf(price), tot = price + e, rows = '';
  var tgn = d.wall === 'tgn';
  rows += '<div class="cr"><span class="cl">Niche Price</span><span class="cv">' + fm(price) + '</span></div>';
  rows += '<div class="cr"><span class="cl">ECF (10%)</span><span class="cv">' + fm(e) + '</span></div>';
  var oc = qty(tgn ? 'tgn-oc-qty' : 'oc-qty'), rc = qty(tgn ? 'tgn-rec-qty' : 'rec-qty');
  if (oc > 0) { rows += '<div class="cr"><span class="cl">O&amp;C \\u00d7' + oc + '</span><span class="cv">' + fm(OC * oc) + '</span></div>'; tot += OC * oc; }
  if (rc > 0) { rows += '<div class="cr"><span class="cl">Recording \\u00d7' + rc + '</span><span class="cv">' + fm(REC * rc) + '</span></div>'; tot += REC * rc; }
  if (tgn) {
    var iq = qty('tgn-inscr-qty');
    if (iq > 0) {
      var sub = INSCR * iq, tx = Math.round(sub * TAX * 100) / 100;
      rows += '<div class="cr"><span class="cl">Inscription \\u00d7' + iq + '</span><span class="cv">' + fm(sub) + '</span></div>';
      rows += '<div class="cr"><span class="cl">Sales Tax (10.4%)</span><span class="cv">$' + tx.toFixed(2) + '</span></div>';
      tot += sub + tx;
    }
  }
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

var WALL_LABEL = { west: 'Front Wall (West)', east: 'Back Wall (East)', north: 'Side A (North)', south: 'Side B (South)', tgn: 'Terrace Garden' };

function readNiche(el) {
  var d = {};
  ['wall', 'id', 'price', 'urn', 'mis', 'inside', 'opening', 'plate'].forEach(function (k) {
    var v = el.getAttribute('data-' + k); if (v !== null) d[k] = v;
  });
  d.walllabel = WALL_LABEL[d.wall] || '';
  return d;
}

function showCard(el, pin) {
  var d = readNiche(el);
  card.innerHTML = cardHtml(d);
  card.classList.add('show');
  if (pin) {
    if (pinned) pinned.classList.remove('sel');
    pinned = el; el.classList.add('sel');
  }
}
function hideCard() {
  card.classList.remove('show');
  if (pinned) { pinned.classList.remove('sel'); pinned = null; }
}

document.addEventListener('click', function (ev) {
  if (ev.target.closest('.cclose')) { hideCard(); return; }
  var n = ev.target.closest('.n:not(.pnl), .n3:not(.pnl3)');
  if (n && n.hasAttribute('data-id')) { showCard(n, true); return; }
  if (!ev.target.closest('#card')) hideCard();
});
document.addEventListener('mouseover', function (ev) {
  if (window.matchMedia('(hover: none)').matches) return;
  var n = ev.target.closest('.n:not(.pnl), .n3:not(.pnl3)');
  if (n && n.hasAttribute('data-id') && !n.closest('.mini')) showCard(n, false);
  else if (pinned) showCard(pinned, false);
});
document.addEventListener('focusin', function (ev) {
  var n = ev.target.closest('.n:not(.pnl), .n3:not(.pnl3)');
  if (n && n.hasAttribute('data-id')) showCard(n, true);
});
document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') hideCard(); });
['oc-qty', 'rec-qty', 'tgn-oc-qty', 'tgn-rec-qty', 'tgn-inscr-qty'].forEach(function (id) {
  var e = document.getElementById(id);
  if (e) e.addEventListener('input', function () { if (pinned) showCard(pinned, false); });
});

// ── Tabs ───────────────────────────────────────────────────────────────────
function showView(v) {
  hideCard();
  var views = document.querySelectorAll('.wview, .view3d');
  for (var i = 0; i < views.length; i++) views[i].classList.remove('active');
  var el = document.getElementById(v === '3d' ? 'view-3d' : 'wall-' + v);
  if (el) el.classList.add('active');
  var tabs = document.querySelectorAll('#mvc-tabs .tab');
  for (var j = 0; j < tabs.length; j++) tabs[j].classList.toggle('active', tabs[j].getAttribute('data-view') === v);
  if (v === '3d') fitScene();
}
document.querySelectorAll('#mvc-tabs .tab').forEach(function (t) {
  t.addEventListener('click', function () { showView(t.getAttribute('data-view')); });
});

var HEAD = {
  mvc: ['Mountain View Columbarium \\u2014 New Glass Front Niches', 'Washington Memorial Park \\u00b7 Center Island Structure'],
  tgn: ['Terrace Garden Niches', 'Washington Memorial Park \\u00b7 Terrace Garden Memorial Path']
};
document.querySelectorAll('.ptab').forEach(function (t) {
  t.addEventListener('click', function () {
    var p = t.getAttribute('data-prop');
    hideCard();
    document.querySelectorAll('.psec').forEach(function (s) { s.classList.remove('active'); });
    document.querySelectorAll('.ptab').forEach(function (x) { x.classList.remove('active'); });
    document.getElementById('psec-' + p).classList.add('active');
    t.classList.add('active');
    document.getElementById('mvc-tabs').style.display = (p === 'mvc') ? 'flex' : 'none';
    document.getElementById('header-txt').innerHTML = '<h1>' + HEAD[p][0] + '</h1><p>' + HEAD[p][1] + '</p>';
    if (p === 'mvc') fitScene();
  });
});

// ── 3D camera ──────────────────────────────────────────────────────────────
var scene = document.getElementById('scene'), stage = document.getElementById('stage');
var DEF = { yaw: -28, pitch: 16, zoom: 1 };
var cam = { yaw: DEF.yaw, pitch: DEF.pitch, zoom: DEF.zoom, lift: 0 };
var ZMIN = 0.32, ZMAX = 2.6, PMIN = -12, PMAX = 84;
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
  apply();
}
window.addEventListener('resize', fitScene);

// Square-on to one wall: zoom so the WHOLE wall fits the scene box (row G used to
// clip off the top), and lift the stage so the wall sits centred rather than
// hanging above the floor origin.
function faceOn(k) {
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
// Overhead is an ORIENTATION view, not a niche view: straight down you only see the
// island's lid. 54 degrees keeps the wall faces readable while showing the whole room.
document.getElementById('btn-aerial').addEventListener('click', function () {
  cam.yaw = 0; cam.pitch = 54;
  var floorW = ${px(ROOM.across)}, floorD = ${px(ROOM.between)};
  var pr = 54 * Math.PI / 180;
  cam.zoom = clamp(Math.min(scene.clientWidth * 0.92 / floorW,
                            scene.clientHeight * 0.82 / (floorD * Math.sin(pr) + ISLAND_HALF_PX * 2 * Math.cos(pr))), ZMIN, ZMAX);
  cam.lift = ISLAND_HALF_PX * cam.zoom * Math.cos(pr) - (STAGE_TOP - 0.5) * scene.clientHeight;
  apply();
});
document.getElementById('btn-reset').addEventListener('click', function () {
  cam.yaw = DEF.yaw; cam.pitch = DEF.pitch; cam.zoom = fitZoom; cam.lift = 0; apply();
});
document.getElementById('btn-in').addEventListener('click', function () { cam.zoom *= 1.25; apply(); });
document.getElementById('btn-out').addEventListener('click', function () { cam.zoom /= 1.25; apply(); });

// Drag to orbit / pinch to zoom. Zoom is CLAMPED at both ends.
var pts = {}, last = null, pinchStart = 0, zoomStart = 1, moved = 0;
scene.addEventListener('pointerdown', function (ev) {
  if (ev.target.closest('.n3')) { /* still allow drag-from-niche */ }
  pts[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
  scene.setPointerCapture(ev.pointerId);
  var ids = Object.keys(pts);
  if (ids.length === 1) { last = { x: ev.clientX, y: ev.clientY }; moved = 0; }
  else if (ids.length === 2) { pinchStart = dist(); zoomStart = cam.zoom; }
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
  cam.yaw += dx * 0.35;
  cam.pitch -= dy * 0.28;
  last = { x: ev.clientX, y: ev.clientY };
  apply();
});
// A drag must not also count as a niche tap — but a TOUCH drag fires no click at
// all, so the suppression has to expire on its own clock. Latching a flag until the
// next click swallowed the first tap after every touch orbit.
var suppressUntil = 0;
function endPtr(ev) {
  delete pts[ev.pointerId];
  if (!Object.keys(pts).length) {
    if (moved > 8) suppressUntil = performance.now() + 300;
    last = null; pinchStart = 0; moved = 0;
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

fitScene();
apply();
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
  <button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
</div>
<div class="ptabs">
  <button class="ptab active" data-prop="mvc">Mountain View Columbarium</button>
  <button class="ptab" data-prop="tgn">Terrace Garden Niches</button>
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
<div class="psec active" id="psec-mvc">

  <div class="view3d active" id="view-3d">
    <div class="toolbar no-print">
      <button class="tbtn" data-facebtn="west">Front · West</button>
      <button class="tbtn" data-facebtn="east">Back · East</button>
      <button class="tbtn" data-facebtn="north">Side A · North</button>
      <button class="tbtn" data-facebtn="south">Side B · South</button>
      <div class="tbsep"></div>
      <button class="tbtn" id="btn-aerial">Overhead</button>
      <button class="tbtn" id="btn-reset">Reset view</button>
      <div class="tbsep"></div>
      <button class="tbtn" id="btn-out" aria-label="Zoom out">&minus;</button>
      <button class="tbtn" id="btn-in" aria-label="Zoom in">+</button>
    </div>
${scene3d()}
    <div class="hint">Drag to orbit &nbsp;·&nbsp; scroll or pinch to zoom &nbsp;·&nbsp; tap a niche for price &amp; dimensions &nbsp;·&nbsp; arrow keys orbit, +/&minus; zoom</div>
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

<div class="psec" id="psec-tgn">
  <div class="wlabel" style="margin-top:0;">Terrace Garden Niches</div>
  <div class="wsub">A = bottom · E = top · Outdoor granite-front niche wall · Single wall, no sections</div>
  <div class="gwrap">
${tgnGrid()}
  </div>
  <div class="legend">${legendHtml([12000, 14000, 16000])}</div>
  <div class="fees">
    <div class="fi"><span class="fl">Niche Inurnment O&amp;C — $${FEES.OC} ea</span>
      <span class="fv">Qty: <input type="number" id="tgn-oc-qty" min="0" max="4" value="0" aria-label="Opening and closing quantity"></span></div>
    <div class="fi"><span class="fl">Recording Fee — $${FEES.REC} ea</span>
      <span class="fv">Qty: <input type="number" id="tgn-rec-qty" min="0" max="4" value="0" aria-label="Recording fee quantity"></span></div>
    <div class="fi"><span class="fl">Niche Inscription — $${FEES.INSCR} ea (taxable)</span>
      <span class="fv">Qty: <input type="number" id="tgn-inscr-qty" min="0" max="4" value="0" aria-label="Inscription quantity"></span></div>
    <div class="fi"><span class="fl">ECF</span><span class="fv">10% of niche price — not included in listed prices</span></div>
    <div class="fi"><span class="fl">Sales Tax</span><span class="fv">10.4% — applies to inscription only (taxable merchandise)</span></div>
    <div class="fi"><span class="fl">Standard Niches</span><span class="fv">Up to 2 inurnments</span></div>
  </div>
</div><!-- /psec-tgn -->

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
