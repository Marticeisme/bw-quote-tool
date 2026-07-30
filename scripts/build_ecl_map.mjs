/**
 * Generates MAPS/ECL_NicheMap.html from scripts/ecl-niche-data.mjs.
 *
 * Third of the three glass-front niche maps, same architecture as
 * build_mvc_map.mjs and build_roac_map.mjs: a CSS-3D scene on screen (here a
 * freestanding four-sided island cabinet with CLEAR CORNERS — no niche wraps a
 * corner, so there are no corner side-glass strips), flat per-face grids for the tabs
 * and for print, both emitted as STATIC HTML from the one dataset so they cannot drift.
 *
 * Statuses and prices are live hand-maintained data: edit scripts/ecl-niche-data.mjs
 * and rebuild — never hand-edit the HTML.
 *
 * Geometry is ESTIMATED from the operator's photographs (there is no fabrication
 * drawing for ECL-1), so the page shows no niche dimensions anywhere.
 *
 *   node scripts/build_ecl_map.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  WALLS, FACE_ORDER, FACE_META, ROWS, GEO, FACE_H, BOX_W, BOX_D,
  TIERS, FEES, STATUS_LABEL, allNiches, refOf, sellable,
} from './ecl-niche-data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'MAPS', 'ECL_NicheMap.html');

// The narrowest AVAILABLE cell on the south elevation is 47/486 of a 92" face — about
// 8.9". At ROAC's 2.7 px/in that is a 24px cell, far too narrow for a "$17,595" chip
// once rounded prices are banned. 5.5 gives it 49px. The camera's fit-zoom scales the
// larger scene straight back down, so nothing else changes.
const PPI = 5.5;
const px = (v) => +(v * PPI).toFixed(2);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = (n) => '$' + n.toLocaleString('en-US');
const tier = (p) => {
  const t = TIERS.find((x) => x.p === p);
  // A price with no tier means the data module and the tier ramp disagree — refuse to
  // emit a page rather than crash halfway through with an unreadable stack.
  if (!t) throw new Error(`price ${p} has no entry in TIERS — add it to scripts/ecl-niche-data.mjs`);
  return t;
};

// ── Box layout (inches; see ecl-niche-data GEO) ───────────────────────────────
const H = FACE_H + GEO.plinthH;          // structure height below the cornice
const FACE_Y = -GEO.plinthH / 2;         // face centre inside .yard (y grows downward)
const PLINTH_Y = FACE_H / 2;             // plinth band centre
const TOP_Y = -H / 2;                    // top of the box
const CROWN_W = BOX_W + 2 * GEO.crownOver;
const CROWN_D = BOX_D + 2 * GEO.crownOver;
const FIT_H = H + GEO.crownH;

// face placements: [cx, cz, rotY]. Outward normal: 0=+z, 180=-z, 90=+x, -90=-x.
const FACE_POS = {
  S: [0, BOX_D / 2, 0],
  N: [0, -BOX_D / 2, 180],
  E: [BOX_W / 2, 0, 90],
  W: [-BOX_W / 2, 0, -90],
};
const faceWidth = (f) => (FACE_META[f].wide ? GEO.faceW : GEO.faceD);

const GRID_ROWS_FR = [...ROWS.map(() => GEO.rowH), GEO.baseH].map((h) => h + 'fr').join(' ');
const colsFr = (f) => WALLS[f].cols.map((c) => c + 'fr').join(' ');

const faceLabel = (f) => FACE_META[f].label;
const misOf = (f, n) => `ECL-1 · ${faceLabel(f)} · Row ${n.r} · Niche ${n.n}`;

function nicheAttrs(f, n) {
  return `data-face="${f}" data-id="${n.r}-${n.n}" data-ref="${refOf(f, n.r, n.n)}"` +
    ` data-price="${sellable(n) ? n.p : ''}" data-st="${n.st}" data-row="${n.r}" data-n="${n.n}"`;
}
function ariaName(f, n) {
  // A niche that is not sellable carries no price in ANY rendering, screen readers
  // included — there is nothing to mis-quote.
  if (!sellable(n)) return `${refOf(f, n.r, n.n)}, ${faceLabel(f)}, ${STATUS_LABEL[n.st] || n.st}`;
  return `${refOf(f, n.r, n.n)}, ${faceLabel(f)}, ${money(n.p)}, available`;
}
const gridRow = (n) => {
  const end = ROWS.indexOf(n.r) + 1;
  const span = n.h || 1;
  return span > 1 ? `${end - span + 1}/span ${span}` : String(end);
};
const gridCol = (n) => (n.w > 1 ? `${n.c}/span ${n.w}` : String(n.c));

// ── 3D pieces ─────────────────────────────────────────────────────────────────
function face3d(f) {
  const [cx, cz, ry] = FACE_POS[f];
  const cells = WALLS[f].niches.map((n) => {
    const st = n.st !== 'available' ? ` st-${n.st}` : '';
    const stTag = n.st !== 'available' ? `<span class="n3st">${STATUS_LABEL[n.st]}</span>` : '';
    // Full dollar figures, never rounded — $18,695, not "$18.7K" (operator).
    const chip = sellable(n) ? `<span class="n3p ${tier(n.p).c}">${money(n.p)}</span>` : '';
    return `      <button type="button" class="n3 front3${st}" style="grid-row:${gridRow(n)};grid-column:${gridCol(n)}" ${nicheAttrs(f, n)} aria-label="${esc(ariaName(f, n))}"><span class="n3id">${n.r}-${n.n}</span>${chip}${stTag}</button>`;
  }).join('\n');
  return `    <div class="face" data-face3d="${f}" style="width:${px(faceWidth(f))}px;height:${px(FACE_H)}px;grid-template-columns:${colsFr(f)};grid-template-rows:${GRID_ROWS_FR};transform:translate(-50%,-50%) translate3d(${px(cx)}px,${px(FACE_Y)}px,${px(cz)}px) rotateY(${ry}deg)">
${cells}
      <div class="baseband" style="grid-row:${ROWS.length + 1};grid-column:1/-1"><b>${esc(FACE_META[f].caption)}</b></div>
    </div>`;
}

function shell3d() {
  const p = [];
  // CLEAR CORNERS: the four corners are solid stucco pilasters, not glass. Each corner
  // shows one strip on the broad plane and one on the end plane, which is why no niche
  // is ever visible from two sides.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      p.push(`      <div class="post" style="width:${px(GEO.post)}px;height:${px(FACE_H)}px;transform:translate(-50%,-50%) translate3d(${px(sx * (GEO.faceW / 2 + GEO.post / 2))}px,${px(FACE_Y)}px,${px(sz * BOX_D / 2)}px) rotateY(${sz > 0 ? 0 : 180}deg)"></div>`);
      p.push(`      <div class="post" style="width:${px(GEO.post)}px;height:${px(FACE_H)}px;transform:translate(-50%,-50%) translate3d(${px(sx * BOX_W / 2)}px,${px(FACE_Y)}px,${px(sz * (GEO.faceD / 2 + GEO.post / 2))}px) rotateY(${sx > 0 ? 90 : -90}deg)"></div>`);
    }
  }
  // Dark-wood cornice: four bands plus the top slab.
  for (const sz of [1, -1]) {
    p.push(`      <div class="crown" style="width:${px(CROWN_W)}px;height:${px(GEO.crownH)}px;transform:translate(-50%,-50%) translate3d(0,${px(TOP_Y - GEO.crownH / 2)}px,${px(sz * CROWN_D / 2)}px) rotateY(${sz > 0 ? 0 : 180}deg)"></div>`);
  }
  for (const sx of [1, -1]) {
    p.push(`      <div class="crown" style="width:${px(CROWN_D)}px;height:${px(GEO.crownH)}px;transform:translate(-50%,-50%) translate3d(${px(sx * CROWN_W / 2)}px,${px(TOP_Y - GEO.crownH / 2)}px,0) rotateY(${sx > 0 ? 90 : -90}deg)"></div>`);
  }
  p.push(`      <div class="crowntop" style="width:${px(CROWN_W)}px;height:${px(CROWN_D)}px;transform:translate(-50%,-50%) translate3d(0,${px(TOP_Y - GEO.crownH)}px,0) rotateX(90deg)"></div>`);
  // Dark-wood plinth at the floor.
  const pw = BOX_W + 2 * GEO.plinthOver, pd = BOX_D + 2 * GEO.plinthOver;
  for (const sz of [1, -1]) {
    p.push(`      <div class="plinth" style="width:${px(pw)}px;height:${px(GEO.plinthH)}px;transform:translate(-50%,-50%) translate3d(0,${px(PLINTH_Y)}px,${px(sz * pd / 2)}px) rotateY(${sz > 0 ? 0 : 180}deg)"></div>`);
  }
  for (const sx of [1, -1]) {
    p.push(`      <div class="plinth" style="width:${px(pd)}px;height:${px(GEO.plinthH)}px;transform:translate(-50%,-50%) translate3d(${px(sx * pw / 2)}px,${px(PLINTH_Y)}px,0) rotateY(${sx > 0 ? 90 : -90}deg)"></div>`);
  }
  return p.join('\n');
}

function scene3d() {
  const fw = CROWN_W + 2 * GEO.floorPad, fd = CROWN_D + 2 * GEO.floorPad;
  return `<div class="scene" id="scene" tabindex="0" role="application" aria-label="Three-dimensional model of the Eternal Light Columbarium ECL-1 glass-front cabinet. Use the view buttons below, or arrow keys, to change the view.">
  <div class="stage" id="stage">
    <div class="floor" style="width:${px(fw)}px;height:${px(fd)}px;transform:translate(-50%,-50%) translate3d(0,1px,0) rotateX(-90deg)">
      <span class="fcomp fc-n">FRONT (NORTH)</span>
      <span class="fcomp fc-s">SOUTH</span>
      <span class="fcomp fc-w">WEST</span>
      <span class="fcomp fc-e">EAST &nbsp;·&nbsp; FRONT DOOR</span>
    </div>
    <div class="yard" style="transform:translateY(${px(-H / 2)}px)">
${FACE_ORDER.map(face3d).join('\n')}
${shell3d()}
    </div>
  </div>
</div>`;
}

// ── Flat grids ────────────────────────────────────────────────────────────────
function flatGrid(f, { mini = false } = {}) {
  const rowPx = mini ? 34 : 64;
  const labels = ROWS.map((L, i) => `    <div class="rlbl" style="grid-column:1;grid-row:${i + 1}">${L}</div>`).join('\n');
  const cells = WALLS[f].niches.map((n) => {
    const st = n.st !== 'available' ? ` st-${n.st}` : '';
    const stTag = n.st !== 'available' ? `<span class="nstatus">${STATUS_LABEL[n.st]}</span>` : '';
    const body = sellable(n) ? `<span class="nprice ${tier(n.p).c}">${money(n.p)}</span>` : '';
    const gc = n.w > 1 ? `${n.c + 1}/span ${n.w}` : String(n.c + 1);
    return `    <button type="button" class="n flatn${st}" style="grid-row:${gridRow(n)};grid-column:${gc}" ${nicheAttrs(f, n)} aria-label="${esc(ariaName(f, n))}"><span class="nid">${n.r}-${n.n}</span>${body}${stTag}</button>`;
  }).join('\n');
  const wide = FACE_META[f].wide;
  const maxW = mini ? (wide ? 330 : 150) : (wide ? 560 : 260);
  return `  <div class="fgrid${mini ? ' mini' : ''}" style="grid-template-columns:22px ${colsFr(f)};grid-template-rows:repeat(${ROWS.length},${rowPx}px);max-width:${maxW}px;">
${labels}
${cells}
  </div>`;
}

function legendHtml(prices) {
  return TIERS.filter((t) => prices.includes(t.p))
    .map((t) => `<div class="li"><div class="ls ${t.c}"></div><span>${t.l}</span></div>`).join('');
}
const STATUS_LEG = `<div class="rightsleg">
      <div class="li"><div class="ls stleg-a"></div><span>Available</span></div>
      <div class="li"><div class="ls stleg-s"></div><span>Sold</span></div>
      <div class="li"><div class="ls stleg-u"></div><span>Not Priced &mdash; confirm in MIS</span></div>
    </div>`;

function faceView(f) {
  const prices = WALLS[f].niches.filter(sellable).map((n) => n.p);
  const avail = WALLS[f].niches.filter(sellable).length;
  return `  <div class="wview" id="wall-${f}">
    <div class="wlabel">${esc(faceLabel(f))}</div>
    <div class="wsub">ECL-1-${f}-X-X &nbsp;·&nbsp; Row A = bottom, F = top &nbsp;·&nbsp; ${WALLS[f].niches.length} niches, ${avail} available</div>
    <div class="gwrap">
${flatGrid(f)}
    </div>
    <div class="legend">${legendHtml(prices)}</div>
    ${STATUS_LEG}
  </div>`;
}

function overviewView() {
  const panels = FACE_ORDER.map((f) => `      <div class="overview-panel">
        <div class="ovtitle">${esc(faceLabel(f))} &nbsp;·&nbsp; ECL-1-${f}</div>
        <div class="gwrap" style="padding:8px 10px;">
${flatGrid(f, { mini: true })}
        </div>
      </div>`).join('\n');
  return `  <div class="wview" id="wall-overview">
    <div class="wlabel">All Four Sides</div>
    <div class="wsub">The whole cabinet at a glance &nbsp;·&nbsp; corners are solid: no niche appears on two faces</div>
    <div class="ovgrid">
${panels}
    </div>
    <div class="legend">${legendHtml(TIERS.map((t) => t.p))}</div>
    ${STATUS_LEG}
  </div>`;
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const TIER_CSS = TIERS.map((t) => `  .${t.c}{background:${t.bg};color:${t.fg};}`).join('\n');

const CSS = `
  :root{--navy:#1a2744;--navy-light:#243156;--gold:#c8a96e;--gold-light:#e8d5a8;--cream:#f7f4ef;--gb:rgba(200,169,110,0.45);}
  *{box-sizing:border-box;margin:0;padding:0;}
  html{overflow-x:hidden;}
  body{font-family:'Jost',sans-serif;background:var(--navy);color:var(--cream);min-height:100vh;overflow-x:hidden;max-width:100vw;}
  button{font-family:inherit;}
  .header{background:linear-gradient(135deg,var(--navy),var(--navy-light));border-bottom:2px solid var(--gold);padding:14px 20px;display:flex;align-items:center;gap:14px;}
  .hlogo-svg{height:34px;flex-shrink:0;width:auto;}
  .htxt h1{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:var(--cream);}
  .htxt p{font-size:10px;font-weight:300;color:var(--gold);letter-spacing:.12em;text-transform:uppercase;margin-top:2px;}
  .tabs{display:flex;background:var(--navy-light);border-bottom:1px solid var(--gb);overflow-x:auto;}
  .tab{padding:10px 14px;font-size:11px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:var(--gold-light);cursor:pointer;border:none;border-bottom:3px solid transparent;white-space:nowrap;transition:all .2s;background:none;}
  .tab:hover{color:var(--cream);background:rgba(200,169,110,.08);}
  .tab.active{color:var(--gold);border-bottom-color:var(--gold);background:rgba(200,169,110,.12);}
  .main{padding:14px;}
  .wview,.view3d{display:none;}.wview.active,.view3d.active{display:block;}
  .wlabel{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:var(--gold);margin-bottom:2px;margin-top:14px;text-align:center;}
  .wsub{font-size:10px;color:var(--gold-light);letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px;text-align:center;}
  .gwrap{background:linear-gradient(160deg,#0f1a30,#1a2744 60%,#0d1528);border:1px solid var(--gb);border-radius:8px;padding:16px 18px;overflow-x:auto;max-width:640px;margin:0 auto;}
  .fgrid{display:grid;gap:3px;margin:0 auto;width:100%;}
  .fgrid.mini{gap:1px;font-size:6px;}
  .rlbl{display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:13px;font-weight:700;color:var(--gold);}
  .fgrid.mini .rlbl{font-size:9px;}
  .ovgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;max-width:1100px;margin:0 auto;align-items:start;}
  .ovtitle{font-family:'Cormorant Garamond',serif;font-size:13px;font-weight:600;color:var(--gold);margin-bottom:5px;text-align:center;}

  /* ── Flat niche cell: bronze frame + dark glass (photos) ── */
  .n{border-radius:3px;border:1px solid rgba(0,0,0,.45);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;transition:transform .15s,box-shadow .15s,filter .15s;text-align:center;padding:2px;line-height:1.25;font-size:8.5px;min-width:0;font-family:'Jost',sans-serif;
    color:#e9e8e4;gap:2px;
    background:
      linear-gradient(115deg,rgba(255,255,255,.14) 0%,rgba(255,255,255,0) 32%),
      linear-gradient(180deg,#3b3a37 0%,#2b2a27 55%,#1f1e1c 100%);}
  .n:hover{transform:scale(1.1);border-color:var(--gold);z-index:10;box-shadow:0 4px 16px rgba(0,0,0,.5),0 0 0 1px var(--gold);}
  .n:focus-visible,.n3:focus-visible{outline:2px solid #fff;outline-offset:1px;z-index:20;}
  .n.sel,.n3.sel{outline:3px solid #fff;outline-offset:-3px;z-index:25;
    filter:brightness(1.28) saturate(1.15);
    box-shadow:0 0 0 2px var(--gold),0 0 22px 4px rgba(255,255,255,.45);}
  .n.sel{transform:scale(1.04);}
  .nid{font-size:8px;opacity:.65;}
  .nprice{font-weight:600;font-size:10.5px;padding:0 5px;border-radius:3px;box-shadow:0 1px 2px rgba(0,0,0,.3);}
  .nstatus,.n3st{font-size:6px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
    padding:0 3px;border-radius:2px;background:rgba(255,255,255,.88);color:#17181b;}
  .fgrid.mini .nid{font-size:5px;}.fgrid.mini .nprice{font-size:6.5px;padding:0 2px;}.fgrid.mini .nstatus{display:none;}
  .fgrid.mini .n{padding:1px;cursor:default;}
  .fgrid.mini .n:hover{transform:none;box-shadow:none;border-color:rgba(0,0,0,.45);}
  /* ── Status code (operator: an FSD must never mistake these for sellable).
     PATTERN + darkness, never hue — every hue on this page belongs to a price tier.
       Sold        = blacked-out cell (closed), white badge
       Not Priced  = blacked-out cell + dashed outline, white badge
     Neither renders a price anywhere. */
  .n,.n3{position:relative;}
  .st-sold,.st-unpriced{color:#d9d8d4;}
  .st-sold,.st-unpriced{background:linear-gradient(180deg,#1b1c20 0%,#0e0f12 100%)!important;
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)!important;}
  .st-unpriced::before{content:'';position:absolute;inset:1px;pointer-events:none;
    border:2px dashed rgba(255,255,255,.65);border-radius:inherit;}
  .fgrid.mini .st-unpriced::before{border-width:1px;}

${TIER_CSS}
  .stleg-a{background:linear-gradient(180deg,#3b3a37,#1f1e1c);}
  .stleg-s{background:linear-gradient(180deg,#1b1c20,#0e0f12);}
  .stleg-u{background:linear-gradient(180deg,#1b1c20,#0e0f12);border:2px dashed rgba(255,255,255,.65)!important;}

  .legend{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px;justify-content:center;}
  .li{display:flex;align-items:center;gap:5px;font-size:10px;color:var(--gold-light);}
  .ls{width:13px;height:13px;border-radius:2px;border:1px solid rgba(255,255,255,.2);flex-shrink:0;}
  .rightsleg{display:flex;flex-wrap:wrap;gap:14px;margin-top:6px;justify-content:center;}

  /* ── 3D scene ── */
  .toolbar{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;align-items:center;max-width:900px;margin:10px auto 8px;}
  .tbtn{background:rgba(200,169,110,.12);border:1px solid var(--gb);color:var(--gold-light);padding:7px 13px;border-radius:5px;font-size:11px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:all .15s;}
  .tbtn:hover{background:rgba(200,169,110,.26);color:var(--cream);}
  .tbtn.on{background:rgba(200,169,110,.3);border-color:var(--gold);color:var(--gold);}
  .tbtn:focus-visible{outline:2px solid #fff;outline-offset:2px;}
  .tbsep{width:1px;height:22px;background:var(--gb);margin:0 4px;}
  .scene{position:relative;height:min(66vh,600px);min-height:340px;margin:0 auto;max-width:1100px;
    background:radial-gradient(ellipse at 50% 26%,#2b3450 0%,#18213a 48%,#0a1020 100%);
    border:1px solid var(--gb);border-radius:10px;overflow:hidden;cursor:grab;touch-action:none;
    perspective:1700px;perspective-origin:50% 42%;}
  .scene:active{cursor:grabbing;}
  .scene:focus-visible{outline:2px solid var(--gold);outline-offset:2px;}
  .stage{position:absolute;left:50%;top:72%;width:0;height:0;transform-style:preserve-3d;
    transform:translateY(var(--lift,0px)) scale(var(--zoom,1)) rotateX(var(--pitch,0deg)) rotateY(var(--yaw,0deg));}
  .yard{position:absolute;transform-style:preserve-3d;}
  /* The cabinet stands indoors on the mausoleum's carpet, not on a lawn. */
  .floor{position:absolute;left:0;top:0;background:
      radial-gradient(ellipse at 50% 50%,rgba(150,140,116,.34),rgba(46,42,34,.86) 78%),
      repeating-linear-gradient(90deg,rgba(255,255,255,.035) 0 3px,rgba(0,0,0,0) 3px 7px);
    border:1px solid rgba(180,168,140,.16);}
  .fcomp{position:absolute;color:rgba(232,213,168,.8);font-size:12px;letter-spacing:.14em;white-space:nowrap;}
  .fc-n{left:50%;top:8%;transform:translateX(-50%) rotate(180deg);}
  .fc-s{left:50%;bottom:8%;transform:translateX(-50%);}
  .fc-w{left:7%;top:50%;transform:translateY(-50%) rotate(-90deg);transform-origin:center;}
  .fc-e{right:7%;top:50%;transform:translateY(-50%) rotate(90deg);transform-origin:center;}
  /* bronze-framed glass front */
  .face{position:absolute;left:0;top:0;display:grid;gap:3px;
    background:linear-gradient(180deg,#6b6152,#4a4338);
    padding:3px;border:1px solid #3a352c;
    backface-visibility:hidden;box-shadow:0 0 26px rgba(0,0,0,.5);}
  /* CLEAR CORNERS — solid stucco pilasters, deliberately NOT glass */
  .post{position:absolute;left:0;top:0;background:linear-gradient(180deg,#ded5c2,#b9b0a0);border:1px solid #9a9284;backface-visibility:hidden;}
  .crown{position:absolute;left:0;top:0;background:linear-gradient(180deg,#5c3620,#41240f);border:1px solid #2e1a0b;backface-visibility:hidden;}
  .crowntop{position:absolute;left:0;top:0;background:linear-gradient(135deg,#6d4227,#4a2a14);border:1px solid #2e1a0b;}
  .plinth{position:absolute;left:0;top:0;background:linear-gradient(180deg,#4a2a14,#331c0c);border:1px solid #241307;backface-visibility:hidden;}
  .n3{border:none;border-radius:1px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;
    overflow:hidden;line-height:1.1;padding:0;min-width:0;transition:filter .15s,transform .15s;gap:1px;
    color:#e9e8e4;
    background:
      linear-gradient(115deg,rgba(255,255,255,.17) 0%,rgba(255,255,255,0) 34%),
      linear-gradient(180deg,#3b3a37 0%,#2b2a27 55%,#1f1e1c 100%);
    box-shadow:inset 0 1px 1px rgba(255,255,255,.18),inset 0 -3px 6px -3px rgba(0,0,0,.6);}
  .n3:hover{filter:brightness(1.18) saturate(1.08);transform:scale(1.25);z-index:30;
    box-shadow:0 4px 18px rgba(0,0,0,.55),inset 0 1px 1px rgba(255,255,255,.18);}
  /* While orbiting, niches under the moving cursor must not pop. */
  .scene.dragging .n3:hover{transform:none!important;filter:none!important;}
  .n3id{font-size:7px;opacity:.7;letter-spacing:.02em;}
  .n3p{font-size:7.5px;font-weight:600;padding:0 2px;border-radius:2px;box-shadow:0 1px 2px rgba(0,0,0,.4);letter-spacing:-.02em;white-space:nowrap;}
  .n3st{font-size:5.5px;letter-spacing:.06em;}
  .baseband{background:linear-gradient(180deg,#8d8577,#655e53);
    display:flex;align-items:center;justify-content:center;color:#211e18;
    font-size:7.5px;letter-spacing:.1em;white-space:nowrap;overflow:hidden;font-weight:600;}
  .hint{text-align:center;font-size:10px;color:var(--gold-light);opacity:.7;margin-top:7px;letter-spacing:.05em;}
  .modelnote{text-align:center;font-size:9.5px;color:var(--gold-light);opacity:.55;margin-top:3px;}

  /* ── Detail card ── */
  .card{position:fixed;right:16px;bottom:16px;width:280px;background:rgba(16,24,44,.97);border:1px solid var(--gold);
    border-radius:9px;padding:13px 15px;z-index:900;box-shadow:0 10px 40px rgba(0,0,0,.65);font-size:11px;display:none;}
  .card.show{display:block;}
  /* A HOVER card is display-only: taps pass through it to the niche beneath (a camera
     move can leave it parked over the model). Only a pinned card takes pointer events. */
  .card{pointer-events:none;}
  .card.pinned{pointer-events:auto;}
  .cardhd{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:2px;}
  .cardid{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:700;color:var(--gold);}
  .cardwall{font-size:9px;color:var(--gold-light);letter-spacing:.1em;text-transform:uppercase;}
  .cardmis{font-size:9.5px;color:var(--gold-light);opacity:.8;letter-spacing:.05em;margin-bottom:7px;}
  .cardst{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#ffd9a0;margin-bottom:6px;}
  .cr{display:flex;justify-content:space-between;gap:10px;padding:2px 0;border-bottom:1px solid rgba(200,169,110,.1);}
  .cr:last-of-type{border:none;}
  .cl{color:var(--gold-light);}.cv{font-weight:600;color:var(--cream);text-align:right;}
  .ctot{margin-top:6px;padding-top:6px;border-top:1px solid var(--gold);display:flex;justify-content:space-between;}
  .ctl{color:var(--gold);font-weight:600;}.ctv{color:var(--gold);font-weight:700;font-size:13px;}
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

  @media (max-width:640px){
    .header{flex-wrap:wrap;padding:10px 12px;gap:9px;}
    .hlogo-svg{height:26px;}
    .htxt h1{font-size:14px;}
    .htxt p{font-size:9px;}
    .print-btn{margin-left:0;padding:6px 12px;font-size:11px;}
    .back-btn{margin-left:0;padding:6px 10px;font-size:11px;}
    .main{padding:8px;}
    .tab{padding:9px 11px;font-size:10px;}
    .toolbar{gap:5px;margin:8px auto 6px;}
    .tbtn{padding:6px 9px;font-size:10px;}
    .tbsep{display:none;}
    .scene{height:min(52vh,420px);min-height:300px;border-radius:8px;}
    .gwrap{padding:12px 10px;}
    .hint,.modelnote{font-size:9px;}
  }

  /* ── PRINT: the flat per-face grids, no JS needed ── */
  @media print {
    .no-print,.tabs,.card,.toolbar,.view3d,.hint,.modelnote{display:none!important;}
    *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important;}
    body{background:#fff!important;color:#1a1a1a!important;}
    .header{background:#fff!important;border-bottom:2px solid #c8540a!important;padding:10px 0;}
    .htxt h1{color:#1a2744!important;}
    .htxt p{color:#555!important;}
    .wview{display:block!important;break-before:page;}
    #wall-S{break-before:avoid!important;}
    #wall-overview{display:none!important;}
    /* On an elevation tab, print ONLY that elevation (operator). From the 3D view or
       the overview, print keeps all four. */
    body.pv-one .wview{display:none!important;}
    body.pv-one .wview.active{display:block!important;break-before:avoid!important;}
    /* A highlighted niche narrows it further: only ITS elevation prints (operator).
       This outranks the tab scope — the rules sit later, so they win. */
    body.pv-sel .wview{display:none!important;}
    body.pv-sel .wview.printsel{display:block!important;break-before:avoid!important;}
    /* The highlighted niche prints its full pricing card too. */
    body.has-printsel .printcard{display:block!important;border:2px solid #1a2744;border-radius:8px;
      padding:12px 16px;max-width:360px;margin:0 auto 14px;break-inside:avoid;font-size:11px;color:#1a1a1a;}
    .printcard .cclose{display:none!important;}
    .printcard .cardid{color:#1a2744!important;}
    .printcard .cardwall,.printcard .cardmis,.printcard .cl,.printcard .cnote{color:#444!important;}
    .printcard .cv{color:#111!important;}
    .printcard .cardst{color:#b02818!important;}
    .printcard .ctl,.printcard .ctv{color:#c8540a!important;}
    .printcard .ctot{border-top:1px solid #c8540a;}
    .printcard .cr{border-bottom:1px solid #ddd;}
    .wlabel{color:#1a2744!important;}
    .wsub,.li,.pfoot{color:#444!important;}
    .gwrap{background:#fff!important;border:1px solid #999!important;}
    .rlbl,.pfoot b,.fl{color:#1a2744!important;}
    .n{border-color:#00000030!important;}
    .n.sel{outline:4px solid #c8540a!important;outline-offset:-2px;
      box-shadow:0 0 0 2px #1a2744!important;filter:none!important;transform:none!important;}
    .fv{color:#333!important;}
    .fees{background:#f5f5f2!important;border-color:#c8a96e!important;}
    .fees input{border:1px solid #999!important;background:#fff!important;color:#1a1a1a!important;}
  }
`;

// ── Page runtime ──────────────────────────────────────────────────────────────
const FACE_LABEL_JSON = JSON.stringify(Object.fromEntries(FACE_ORDER.map((f) => [f, faceLabel(f)])));

const JS = `
'use strict';
var OC = ${FEES.OC}, REC = ${FEES.REC};
var STATUS_LABEL = ${JSON.stringify(STATUS_LABEL)};
var FACE_LABEL = ${FACE_LABEL_JSON};
var fm = function (n) { return '$' + n.toLocaleString('en-US'); };
var ecf = function (p) { return Math.ceil(p * ${FEES.ECF_RATE}); };
var qty = function (id) { var e = document.getElementById(id); return e ? (parseInt(e.value, 10) || 0) : 0; };

// ── Detail card ───────────────────────────────────────────────────────────────
var card = document.getElementById('card');
var pinned = null;

function cardHead(d) {
  return '<div class="cardhd"><span class="cardid">' + d.ref + '</span>' +
    '<span class="cardwall">' + (FACE_LABEL[d.face] || '') + '</span>' +
    '<button class="cclose" type="button" aria-label="Close">\\u00d7</button></div>' +
    '<div class="cardmis">ECL-1 \\u00b7 ' + (FACE_LABEL[d.face] || '') + ' \\u00b7 Row ' + d.row + ' \\u00b7 Niche ' + d.n + '</div>';
}

function cardHtml(d) {
  // Sold or not priced: the card names the niche and its status, and shows NO pricing.
  if (d.st !== 'available' || !d.price) {
    var note = d.st === 'unpriced'
      ? 'This niche carries no price on the price sheet and is not marked sold. Confirm in MIS/Enterprise before quoting.'
      : 'Not available \\u2014 no pricing shown. Confirm in MIS/Enterprise.';
    return cardHead(d) +
      '<div class="cardst">' + (STATUS_LABEL[d.st] || d.st) + '</div>' +
      '<div class="cnote">' + note + '</div>';
  }
  var price = +d.price, e = ecf(price), tot = price + e, rows = '';
  rows += '<div class="cr"><span class="cl">Niche Price</span><span class="cv">' + fm(price) + '</span></div>';
  rows += '<div class="cr"><span class="cl">E.C.F. (10%)</span><span class="cv">' + fm(e) + '</span></div>';
  var oc = qty('oc-qty'), rc = qty('rec-qty');
  if (oc > 0) { rows += '<div class="cr"><span class="cl">Open &amp; Closing \\u00d7' + oc + '</span><span class="cv">' + fm(OC * oc) + '</span></div>'; tot += OC * oc; }
  if (rc > 0) { rows += '<div class="cr"><span class="cl">Recording Fee \\u00d7' + rc + '</span><span class="cv">' + fm(REC * rc) + '</span></div>'; tot += REC * rc; }
  return cardHead(d) + rows +
    '<div class="ctot"><span class="ctl">Est. Total</span><span class="ctv">' + fm(Math.round(tot)) + '</span></div>' +
    '<div class="cnote">E.C.F. is not included in the listed price. Bronze scroll and vase are optional add-ons \\u2014 see the footer.</div>';
}

function readNiche(el) {
  var d = {};
  ['face', 'id', 'ref', 'price', 'st', 'row', 'n'].forEach(function (k) {
    var v = el.getAttribute('data-' + k); if (v !== null) d[k] = v;
  });
  return d;
}

function clearSel() {
  var s = document.querySelectorAll('.sel');
  for (var i = 0; i < s.length; i++) s[i].classList.remove('sel');
}
function markSel(el) {
  clearSel();
  var f = el.getAttribute('data-face'), id = el.getAttribute('data-id');
  var all = document.querySelectorAll('[data-face="' + f + '"][data-id="' + id + '"]');
  for (var i = 0; i < all.length; i++) if (!all[i].closest('.mini')) all[i].classList.add('sel');
}

// Card opens NEXT TO the niche (same behavior as the MVC/ROAC pages); phones keep the
// bottom sheet.
function placeCard(el) {
  if (window.matchMedia('(max-width:700px)').matches) {
    card.style.left = card.style.top = card.style.right = card.style.bottom = '';
    return;
  }
  var r = el.getBoundingClientRect();
  card.style.right = 'auto'; card.style.bottom = 'auto';
  var cw = card.offsetWidth || 280, ch = card.offsetHeight || 220;
  var x = r.right + 14, y = r.top + r.height / 2 - ch / 2;
  if (x + cw > window.innerWidth - 8) x = r.left - cw - 14;
  if (x < 8) x = Math.min(Math.max(8, r.right + 14), window.innerWidth - cw - 8);
  y = Math.max(8, Math.min(y, window.innerHeight - ch - 8));
  card.style.left = x + 'px'; card.style.top = y + 'px';
}

// The pinned niche's card also lands in a print-only block, so the printout carries the
// same information the card shows on screen.
function setPrintCard(d) {
  document.getElementById('printcard').innerHTML = cardHtml(d);
  document.body.classList.add('has-printsel');
  var old = document.querySelectorAll('.wview.printsel');
  for (var i = 0; i < old.length; i++) old[i].classList.remove('printsel');
  var wv = document.getElementById('wall-' + d.face);
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
  var n = ev.target.closest('.n, .n3');
  if (n && n.hasAttribute('data-id') && !n.closest('.mini')) { showCard(n, true); return; }
  if (!ev.target.closest('#card, .tab, .tbtn')) hideCard();
});
document.addEventListener('mouseover', function (ev) {
  if (window.matchMedia('(hover: none)').matches) return;
  if (last) return; // mid-drag: sweeping across niches must not hover-pop them
  var n = ev.target.closest('.n, .n3');
  if (n && n.hasAttribute('data-id') && !n.closest('.mini')) showCard(n, false);
  else if (pinned) showCard(pinned, false);
});
document.addEventListener('focusin', function (ev) {
  var n = ev.target.closest('.n, .n3');
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

// ── Tabs (selection survives tab switches, same as the MVC/ROAC pages) ────────
var FACES = ${JSON.stringify(FACE_ORDER)};
function showView(v) {
  var views = document.querySelectorAll('.wview, .view3d');
  for (var i = 0; i < views.length; i++) views[i].classList.remove('active');
  var el = document.getElementById(v === '3d' ? 'view-3d' : 'wall-' + v);
  if (el) el.classList.add('active');
  var tabs = document.querySelectorAll('.tabs .tab');
  for (var j = 0; j < tabs.length; j++) tabs[j].classList.toggle('active', tabs[j].getAttribute('data-view') === v);
  // On an elevation tab, print only that elevation.
  document.body.classList.toggle('pv-one', FACES.indexOf(v) > -1);
  if (v === '3d') fitScene();
}
document.querySelectorAll('.tabs .tab').forEach(function (t) {
  t.addEventListener('click', function () { showView(t.getAttribute('data-view')); });
});

// ── 3D camera (same clamps and deferred pointer capture as the MVC/ROAC pages) ─
var scene = document.getElementById('scene'), stage = document.getElementById('stage');
var cam = { yaw: -36, pitch: -18, zoom: 1, lift: 0 };
var ZMIN = 0.2, ZMAX = 2.6, PMIN = -90, PMAX = 0;
var HALF_PX = ${px(H / 2)};
var STAGE_TOP = 0.72;
var RAD = Math.PI / 180;

var clamp = function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; };

function apply() {
  cam.pitch = clamp(cam.pitch, PMIN, PMAX);
  cam.zoom = clamp(cam.zoom, ZMIN, ZMAX);
  stage.style.setProperty('--yaw', cam.yaw.toFixed(2) + 'deg');
  stage.style.setProperty('--pitch', cam.pitch.toFixed(2) + 'deg');
  stage.style.setProperty('--zoom', cam.zoom.toFixed(3));
  stage.style.setProperty('--lift', cam.lift.toFixed(1) + 'px');
  document.querySelectorAll('[data-viewbtn]').forEach(function (b) {
    b.classList.toggle('on', b.getAttribute('data-viewbtn') === curPreset);
  });
}

// Every preset — including the three-quarter room view — is fitted with the same exact
// perspective solve, so nothing is ever cropped by the scene box. A resize re-fits the
// active preset and leaves a hand-orbited camera alone.
function fitScene() {
  if (!scene.offsetWidth) return;
  viewTo(curPreset || 'room', true);
}
window.addEventListener('resize', fitScene);

// dist is the viewed plane's SIGNED offset toward the camera from the stage origin:
// perspective (1700px) magnifies a positive dist, so the fit compensates. The room view
// looks at the box centre, so its dist is 0 and its extents are the rotated footprint.
var curPreset = null;
var BROAD_W = ${px(CROWN_W)}, END_W = ${px(CROWN_D)}, FIT_H_PX = ${px(FIT_H)};
var ROOM_YAW = -36, ROOM_PITCH = -18;
var ROOM_W = BROAD_W * Math.abs(Math.cos(ROOM_YAW * RAD)) + END_W * Math.abs(Math.sin(ROOM_YAW * RAD));
var ROOM_H = FIT_H_PX * Math.abs(Math.cos(ROOM_PITCH * RAD)) +
  (BROAD_W * Math.abs(Math.sin(ROOM_YAW * RAD)) + END_W * Math.abs(Math.cos(ROOM_YAW * RAD))) * Math.abs(Math.sin(ROOM_PITCH * RAD));
var VIEWS = {
  room:  { yaw: ROOM_YAW, pitch: ROOM_PITCH, w: ROOM_W,  h: ROOM_H,   dist: 0 },
  'f-s': { yaw: 0,        pitch: 0,          w: BROAD_W, h: FIT_H_PX, dist: ${px(BOX_D / 2)} },
  'f-n': { yaw: 180,      pitch: 0,          w: BROAD_W, h: FIT_H_PX, dist: ${px(BOX_D / 2)} },
  'f-e': { yaw: -90,      pitch: 0,          w: END_W,   h: FIT_H_PX, dist: ${px(BOX_W / 2)} },
  'f-w': { yaw: 90,       pitch: 0,          w: END_W,   h: FIT_H_PX, dist: ${px(BOX_W / 2)} },
};
function viewTo(k, quiet) {
  // A camera jump moves the model under a stationary cursor; Chrome then fires a
  // synthetic hover that can park a stale card over the niches. Drop it.
  if (!pinned && !quiet) card.classList.remove('show');
  var v = VIEWS[k];
  curPreset = k;
  cam.yaw = v.yaw;
  cam.pitch = v.pitch;
  // Exact perspective fit: displayed size = real * z * P/(P - dist*z), so the z that
  // hits a target T is z = T*P / (real*P + T*dist).
  var Tw = scene.clientWidth * 0.86, Th = scene.clientHeight * 0.80, P = 1700;
  var zw = (Tw * P) / (v.w * P + Tw * v.dist);
  var zh = (Th * P) / (v.h * P + Th * v.dist);
  cam.zoom = clamp(Math.min(zw, zh), ZMIN, ZMAX);
  cam.lift = HALF_PX * Math.cos(v.pitch * RAD) * cam.zoom - (STAGE_TOP - 0.5) * scene.clientHeight;
  apply();
}
// A lit preset button is a TOGGLE: tap South again and the camera returns to the
// standard three-quarter room view (operator).
document.querySelectorAll('[data-viewbtn]').forEach(function (b) {
  b.addEventListener('click', function () {
    var k = b.getAttribute('data-viewbtn');
    viewTo(curPreset === k && k !== 'room' ? 'room' : k);
  });
});
document.getElementById('btn-reset').addEventListener('click', function () { viewTo('room'); });
document.getElementById('btn-in').addEventListener('click', function () { cam.zoom *= 1.25; apply(); });
document.getElementById('btn-out').addEventListener('click', function () { cam.zoom /= 1.25; apply(); });

// Drag to orbit / pinch to zoom. Capture is DEFERRED until a real drag (>8px) or a
// second finger — capturing on pointerdown retargets the click to the scene and a tap
// on a niche never reaches the button (the MVC page's tap bug, MISTAKES #18).
var pts = {}, last = null, pinchStart = 0, zoomStart = 1, moved = 0, captured = false;
var downNiche = null, downAt = 0;
function capturePts() {
  if (captured) return;
  captured = true;
  scene.classList.add('dragging');
  curPreset = null; // orbiting away from a preset: no button stays lit
  // A lingering HOVER card must not ride along under the drag; a pinned one stays.
  if (!pinned) card.classList.remove('show');
  Object.keys(pts).forEach(function (id) {
    try { scene.setPointerCapture(+id); } catch (e) { /* pointer already gone */ }
  });
}
scene.addEventListener('pointerdown', function (ev) {
  // Selection inside the scene is decided by OUR tap detector in endPtr, never by the
  // native click that follows — a micro-drag under the threshold used to count as a
  // click and pin whatever niche it started on.
  if (Object.keys(pts).length === 0) {
    var n = ev.target.closest('.n3');
    downNiche = (n && n.hasAttribute('data-id')) ? n : null;
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
// Every native click after a pointer gesture is swallowed; the tap detector is the only
// path from a gesture to a selection. Keyboard clicks still pass (no gesture).
var suppressUntil = 0;
function endPtr(ev) {
  delete pts[ev.pointerId];
  if (!Object.keys(pts).length) {
    suppressUntil = performance.now() + 450;
    if (ev.type === 'pointerup' && downNiche && moved <= 8 && performance.now() - downAt < 700) {
      showCard(downNiche, true);
    } else if (ev.type === 'pointerup' && !downNiche && moved <= 8 && !ev.target.closest('#card')) {
      hideCard();
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
  if (k.indexOf('Arrow') === 0) curPreset = null;
  ev.preventDefault();
  apply();
});

// Home: a three-quarter view showing the south elevation and one end.
fitScene();
apply();
`;

// ── Assemble ──────────────────────────────────────────────────────────────────
const LOGO = fs.readFileSync(path.join(ROOT, 'scripts', 'bw-logo.svg.txt'), 'utf8').trim();
const ALL = allNiches();
const N_TOTAL = ALL.length;
const N_AVAIL = ALL.filter(sellable).length;

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bonney Watson — Eternal Light Columbarium</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
<!-- Generated by scripts/build_ecl_map.mjs from scripts/ecl-niche-data.mjs. Do not hand-edit. -->
<style>${CSS}</style>
</head>
<body>
<div class="header">
  ${LOGO}
  <div class="htxt">
    <h1>Eternal Light Columbarium — Glass-Front Niche Map</h1>
    <p>Washington Memorial Park &nbsp;·&nbsp; ECL-1 &nbsp;·&nbsp; proportions estimated from photographs</p>
  </div>
  <a class="back-btn no-print" href="../">&larr; Quote Tool</a>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
</div>
<div class="tabs">
  <button class="tab active" data-view="3d">3D View</button>
${FACE_ORDER.map((f) => `  <button class="tab" data-view="${f}">${esc(faceLabel(f))}</button>`).join('\n')}
  <button class="tab" data-view="overview" style="margin-left:auto;border-left:1px solid var(--gb);">Overview</button>
</div>
<div class="main">
  <div class="printcard" id="printcard" aria-hidden="true"></div>

  <div class="view3d active" id="view-3d">
    <div class="toolbar no-print">
      <button class="tbtn" data-viewbtn="room" title="Three-quarter view of the cabinet in the room">Room view</button>
      <button class="tbtn" data-viewbtn="f-s" title="South side, face on">South</button>
      <button class="tbtn" data-viewbtn="f-n" title="Front (north) side, face on">Front (North)</button>
      <button class="tbtn" data-viewbtn="f-w" title="West side, face on">West</button>
      <button class="tbtn" data-viewbtn="f-e" title="East side, face on — the front door side">East (Front Door)</button>
      <div class="tbsep"></div>
      <button class="tbtn" id="btn-reset">Reset view</button>
      <div class="tbsep"></div>
      <button class="tbtn" id="btn-out" aria-label="Zoom out">&minus;</button>
      <button class="tbtn" id="btn-in" aria-label="Zoom in">+</button>
    </div>
${scene3d()}
    <div class="hint">Drag to orbit &nbsp;·&nbsp; scroll or pinch to zoom &nbsp;·&nbsp; tap a niche to select it &nbsp;·&nbsp; arrow keys orbit, +/&minus; zoom</div>
    <div class="modelnote">One freestanding four-sided cabinet, ${N_TOTAL} glass-front niches, ${N_AVAIL} available &nbsp;·&nbsp; the corners are solid, so no niche is visible from two sides &nbsp;·&nbsp; model proportions estimated from photographs</div>
    <div class="legend">${legendHtml(TIERS.map((t) => t.p))}</div>
    ${STATUS_LEG}
  </div>

${FACE_ORDER.map(faceView).join('\n')}
${overviewView()}

  <div class="fees">
    <div class="fi"><span class="fl">Open &amp; Closing — $${FEES.OC} ea</span>
      <span class="fv">Qty: <input type="number" id="oc-qty" min="0" max="4" value="1" aria-label="Open and closing quantity"></span></div>
    <div class="fi"><span class="fl">Recording Fee — $${FEES.REC} ea</span>
      <span class="fv">Qty: <input type="number" id="rec-qty" min="0" max="4" value="1" aria-label="Recording fee quantity"></span></div>
    <div class="fi"><span class="fl">E.C.F.</span><span class="fv">10% of niche price — not included in listed prices</span></div>
    <div class="fi"><span class="fl">#5108 Bronze Scroll — $${FEES.SCROLL}</span><span class="fv">Optional add-on</span></div>
    <div class="fi"><span class="fl">Vase with Ring — $${FEES.VASE}</span><span class="fv">Optional add-on</span></div>
  </div>
  <div class="pfoot">
    <b>Row A is the bottom row; Row F the top. Niches are numbered left to right facing each side.</b><br>
    References read <b>ECL-1-&lt;S/N/W/E&gt;-&lt;row&gt;-&lt;niche&gt;</b>. The four corners are solid — no niche appears on two sides.<br>
    Niche availability shown is maintained by hand — always confirm current status in MIS/Enterprise before writing.
  </div>
</div><!-- /main -->

<aside class="card no-print" id="card" role="dialog" aria-live="polite" aria-label="Niche detail"></aside>

<script>
${JS}
</script>
</body>
</html>
`;

fs.writeFileSync(OUT, HTML.replace(/\r?\n/g, '\r\n'), 'utf8');
console.log(`wrote ${path.relative(ROOT, OUT)} — ${(fs.statSync(OUT).size / 1024).toFixed(1)} KB, ${N_TOTAL} niches across ${FACE_ORDER.length} faces (${N_AVAIL} available)`);
