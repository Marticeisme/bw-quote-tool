/**
 * Generates MAPS/ROAC_NicheMap.html from scripts/roac-niche-data.mjs.
 *
 * Same architecture as build_mvc_map.mjs: a CSS-3D scene on screen (the granite
 * courtyard — two banks A-B-C and E-F-G, Wall D across the head, two benches),
 * flat per-wall grids for the tabs and for print, both emitted as STATIC HTML from
 * the one dataset so they cannot drift. Statuses are live hand-maintained data:
 * edit scripts/roac-niche-data.mjs and rebuild — never hand-edit the HTML.
 *
 * Geometry is ESTIMATED from the operator's photographs (no fabrication drawing
 * exists for this structure), so the page shows no niche dimensions.
 *
 *   node scripts/build_roac_map.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  WALLS, FACE_ORDER, SECTION_ORDER, LEVELS, GEO, FACE_H,
  TIERS, FEES, STATUS_LABEL, allNiches,
} from './roac-niche-data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'MAPS', 'ROAC_NicheMap.html');

// 2.2 left a 5-space cell ~32px wide — too narrow for a full "$13,195" chip once the
// operator banned rounded prices. 2.7 gives the chip room; the camera's fit-zoom
// scales the larger scene back down, so nothing else changes.
const PPI = 2.7;
const px = (v) => +(v * PPI).toFixed(2);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = (n) => '$' + n.toLocaleString('en-US');
const tier = (p) => TIERS.find((t) => t.p === p);

// ── Courtyard layout (all inches; see roac-niche-data GEO) ────────────────
const BANK_W = 3 * GEO.faceW + 2 * GEO.gap;                 // 271.5
const SEC_X = [-(GEO.faceW + GEO.gap), 0, GEO.faceW + GEO.gap]; // west, mid, east
const BANK_Z = GEO.courtW / 2 + GEO.slabT / 2;              // 88
const D_X = -(BANK_W / 2 + GEO.dGap + GEO.slabT / 2);       // -172.75
const H = FACE_H;                                            // 85

// face placements: [cx, cz, rotY]. Outward normal: 0=+z, 180=-z, 90=+x, -90=-x.
const FACE_POS = {
  'C-EXT': [SEC_X[0], BANK_Z + GEO.slabT / 2, 0], 'C-INT': [SEC_X[0], BANK_Z - GEO.slabT / 2, 180],
  'B-EXT': [SEC_X[1], BANK_Z + GEO.slabT / 2, 0], 'B-INT': [SEC_X[1], BANK_Z - GEO.slabT / 2, 180],
  'A-EXT': [SEC_X[2], BANK_Z + GEO.slabT / 2, 0], 'A-INT': [SEC_X[2], BANK_Z - GEO.slabT / 2, 180],
  'E-EXT': [SEC_X[0], -(BANK_Z + GEO.slabT / 2), 180], 'E-INT': [SEC_X[0], -(BANK_Z - GEO.slabT / 2), 0],
  'F-EXT': [SEC_X[1], -(BANK_Z + GEO.slabT / 2), 180], 'F-INT': [SEC_X[1], -(BANK_Z - GEO.slabT / 2), 0],
  'G-EXT': [SEC_X[2], -(BANK_Z + GEO.slabT / 2), 180], 'G-INT': [SEC_X[2], -(BANK_Z - GEO.slabT / 2), 0],
  'D-EXT': [D_X - GEO.slabT / 2, 0, -90], 'D-INT': [D_X + GEO.slabT / 2, 0, 90],
};

const GRID_ROWS_FR = [...LEVELS.map(() => GEO.rowH), GEO.baseH].map((h) => h + 'fr').join(' ');

function faceLabel(k) {
  const w = WALLS[k];
  return `Wall ${w.section} — ${w.face === 'EXT' ? 'Outside' : 'Inside'}`;
}
function misOf(k, id) {
  const w = WALLS[k];
  const [l, s] = id.split('-');
  return `ROAC · Wall ${w.section} ${w.face === 'EXT' ? 'Exterior' : 'Interior'} · Tier ${l} · Space ${s}`;
}

function nicheAttrs(k, n) {
  const id = `${n.l}-${n.s}`;
  return `data-wall="${k}" data-id="${id}" data-price="${n.p}" data-st="${n.st}" data-lvl="${n.l}" data-sp="${n.s}"`;
}
function ariaName(k, n) {
  const st = n.st === 'available' ? 'available' : (STATUS_LABEL[n.st] || n.st);
  // Sold/occupied spaces carry no price in any rendering, screen readers included.
  if (n.st === 'reserved' || n.st === 'buried') return `${n.l}-${n.s}, ${faceLabel(k)}, ${st}`;
  return `${n.l}-${n.s}, ${faceLabel(k)}, ${money(n.p)}, ${st}`;
}

// ── 3D pieces ──────────────────────────────────────────────────────────────
// Which structure an element belongs to, for the inside views: looking face-on at a
// bank's INTERIOR puts the OTHER bank between camera and subject, so the occluding
// bank fades out. bk-s = C/B/A bank, bk-n = E/F/G bank, bk-d = Wall D.
const bankOf = (section) => 'DEFG'.includes(section) && section !== 'D'
  ? 'bk-n' : (section === 'D' ? 'bk-d' : 'bk-s');

function face3d(k) {
  const [cx, cz, ry] = FACE_POS[k];
  const w = WALLS[k];
  const cells = w.niches.map((n) => {
    const ri = LEVELS.indexOf(n.l) + 1;
    const st = n.st !== 'available' ? ` st-${n.st}` : '';
    const stTag = n.st !== 'available' ? `<span class="n3st">${STATUS_LABEL[n.st]}</span>` : '';
    // Sold (reserved) or occupied: no price shown anywhere — nothing to mis-quote.
    // The data-price attribute stays so the equality gate can still prove the data.
    // Full dollar figures, never rounded — $13,195, not "$13.2K" (operator).
    const chip = (n.st === 'reserved' || n.st === 'buried') ? '' : `<span class="n3p ${tier(n.p).c}">${money(n.p)}</span>`;
    return `      <button type="button" class="n3 front3${st}" style="grid-row:${ri};grid-column:${n.s}" ${nicheAttrs(k, n)} aria-label="${esc(ariaName(k, n))}"><span class="n3id">${n.l}-${n.s}</span>${chip}${stTag}</button>`;
  }).join('\n');
  return `    <div class="face ${bankOf(w.section)}" data-face="${k}" style="width:${px(GEO.faceW)}px;height:${px(H)}px;grid-template-columns:repeat(5,1fr);grid-template-rows:${GRID_ROWS_FR};transform:translate(-50%,-50%) translate3d(${px(cx)}px,0,${px(cz)}px) rotateY(${ry}deg)">
${cells}
      <div class="baseband" style="grid-row:6;grid-column:1/6"><b>${esc(faceLabel(k).toUpperCase())}</b></div>
    </div>`;
}

function slab3d() {
  const parts = [];
  // Each bank is ONE CONTINUOUS granite structure (operator, from the photos): the
  // separation between Walls C/B/A and E/F/G is just granite piers between the niche
  // fields, not air. So a bank gets end panels only at its outer ends, ONE cap running
  // its full length, and pier strips filling the gaps on both face planes. Only Wall D
  // stands free.
  for (const bz of [BANK_Z, -BANK_Z]) {
    const bk = bz > 0 ? 'bk-s' : 'bk-n';
    for (const sgn of [-1, 1]) {
      parts.push(`      <div class="gside ${bk}" style="width:${px(GEO.slabT)}px;height:${px(H)}px;transform:translate(-50%,-50%) translate3d(${px(sgn * BANK_W / 2)}px,0,${px(bz)}px) rotateY(${sgn * 90}deg)"></div>`);
    }
    parts.push(`      <div class="gcap ${bk}" style="width:${px(BANK_W)}px;height:${px(GEO.slabT)}px;transform:translate(-50%,-50%) translate3d(0,${px(-H / 2)}px,${px(bz)}px) rotateX(90deg)"></div>`);
    const extZ = bz + Math.sign(bz) * GEO.slabT / 2, intZ = bz - Math.sign(bz) * GEO.slabT / 2;
    const extRy = bz > 0 ? 0 : 180, intRy = bz > 0 ? 180 : 0;
    for (const gx of [-(GEO.faceW + GEO.gap) / 2, (GEO.faceW + GEO.gap) / 2]) {
      parts.push(`      <div class="gpier ${bk}" style="width:${px(GEO.gap)}px;height:${px(H)}px;transform:translate(-50%,-50%) translate3d(${px(gx)}px,0,${px(extZ)}px) rotateY(${extRy}deg)"></div>`);
      parts.push(`      <div class="gpier ${bk}" style="width:${px(GEO.gap)}px;height:${px(H)}px;transform:translate(-50%,-50%) translate3d(${px(gx)}px,0,${px(intZ)}px) rotateY(${intRy}deg)"></div>`);
    }
  }
  // Wall D ends + cap (freestanding)
  for (const sgn of [-1, 1]) {
    parts.push(`      <div class="gside bk-d" style="width:${px(GEO.slabT)}px;height:${px(H)}px;transform:translate(-50%,-50%) translate3d(${px(D_X)}px,0,${px(sgn * GEO.faceW / 2)}px) rotateY(${sgn === 1 ? 0 : 180}deg)"></div>`);
  }
  parts.push(`      <div class="gcap bk-d" style="width:${px(GEO.slabT)}px;height:${px(GEO.faceW)}px;transform:translate(-50%,-50%) translate3d(${px(D_X)}px,${px(-H / 2)}px,0) rotateX(90deg)"></div>`);
  return parts.join('\n');
}

// The two benches face one another across the courtyard's centre line: one against
// Inside B (south bank middle), one against Inside F (north bank middle) — operator.
function bench3d(cx, cz) {
  const { benchW: bw, benchD: bd, benchH: bh } = GEO;
  // Inside .yard the FLOOR is at y = +H/2 (the wrapper lifts everything by H/2 so the
  // walls' bottoms meet the ground). A bench "sitting on the floor" therefore centres
  // at H/2 - bh/2, NOT at -bh/2 — the first build got this wrong and both benches
  // floated at wall mid-height.
  const y = H / 2 - bh / 2;
  const p = [];
  p.push(`      <div class="bench" style="width:${px(bw)}px;height:${px(bh)}px;transform:translate(-50%,-50%) translate3d(${px(cx)}px,${px(y)}px,${px(cz + bd / 2)}px)"></div>`);
  p.push(`      <div class="bench" style="width:${px(bw)}px;height:${px(bh)}px;transform:translate(-50%,-50%) translate3d(${px(cx)}px,${px(y)}px,${px(cz - bd / 2)}px) rotateY(180deg)"></div>`);
  for (const sgn of [-1, 1]) {
    p.push(`      <div class="bench" style="width:${px(bd)}px;height:${px(bh)}px;transform:translate(-50%,-50%) translate3d(${px(cx + sgn * bw / 2)}px,${px(y)}px,${px(cz)}px) rotateY(${sgn * 90}deg)"></div>`);
  }
  p.push(`      <div class="bench btop" style="width:${px(bw)}px;height:${px(bd)}px;transform:translate(-50%,-50%) translate3d(${px(cx)}px,${px(y - bh / 2)}px,${px(cz)}px) rotateX(90deg)"></div>`);
  return p.join('\n');
}

function scene3d() {
  const padW = BANK_W + 2 * (GEO.dGap + GEO.slabT + GEO.padMargin);
  const padD = 2 * (BANK_Z + GEO.slabT / 2 + GEO.padMargin);
  const padX = -(GEO.dGap + GEO.slabT) / 2 - 6;
  return `<div class="scene" id="scene" tabindex="0" role="application" aria-label="Three-dimensional model of the Rock of Ages Columbarium courtyard. Use the view buttons below, or arrow keys, to change the view.">
  <div class="stage" id="stage">
    <div class="grass" style="width:${px(padW + 260)}px;height:${px(padD + 220)}px;transform:translate(-50%,-50%) translate3d(${px(padX)}px,2px,0) rotateX(-90deg)"></div>
    <div class="pad" style="width:${px(padW)}px;height:${px(padD)}px;transform:translate(-50%,-50%) translate3d(${px(padX)}px,1px,0) rotateX(-90deg)">
      <span class="fcomp fc-in">COURTYARD — INSIDE FACES</span>
      <span class="fcomp fc-out-n">OUTSIDE — WALLS E · F · G</span>
      <span class="fcomp fc-out-s">OUTSIDE — WALLS C · B · A</span>
    </div>
    <div class="yard" style="transform:translateY(${px(-H / 2)}px)">
${FACE_ORDER.map(face3d).join('\n')}
${slab3d()}
${bench3d(0, GEO.courtW / 2 - GEO.benchD / 2 - 26)}
${bench3d(0, -(GEO.courtW / 2 - GEO.benchD / 2 - 26))}
    </div>
  </div>
</div>`;
}

// ── Flat grids ─────────────────────────────────────────────────────────────
function flatGrid(k, { mini = false } = {}) {
  const w = WALLS[k];
  const rowPx = mini ? 34 : 62;
  const labels = LEVELS.map((L, i) => `    <div class="rlbl" style="grid-column:1;grid-row:${i + 1}">${L}</div>`).join('\n');
  const cells = w.niches.map((n) => {
    const ri = LEVELS.indexOf(n.l) + 1;
    const st = n.st !== 'available' ? ` st-${n.st}` : '';
    const stTag = n.st !== 'available' ? `<span class="nstatus">${STATUS_LABEL[n.st]}</span>` : '';
    const priced = !(n.st === 'reserved' || n.st === 'buried');
    const body = priced
      ? `<span class="nprice ${tier(n.p).c}">${money(n.p)}</span><span class="ncap">2-urn</span>`
      : '';
    return `    <button type="button" class="n flatn${st}" style="grid-row:${ri};grid-column:${n.s + 1}" ${nicheAttrs(k, n)} aria-label="${esc(ariaName(k, n))}"><span class="nid">${n.l}-${n.s}</span>${body}${stTag}</button>`;
  }).join('\n');
  return `  <div class="fgrid${mini ? ' mini' : ''}" style="grid-template-columns:24px repeat(5,1fr);grid-template-rows:repeat(5,${rowPx}px);max-width:${mini ? 300 : 460}px;">
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
      <div class="li"><div class="ls stleg-r"></div><span>Reserved</span></div>
      <div class="li"><div class="ls stleg-b"></div><span>Occupied</span></div>
      <div class="li"><div class="ls stleg-h"></div><span>On Hold</span></div>
    </div>`;

function sectionView(s) {
  const prices = [...new Set([...WALLS[s + '-EXT'].niches, ...WALLS[s + '-INT'].niches].map((n) => n.p))];
  return `  <div class="wview" id="wall-${s}">
    <div class="wlabel">Wall ${s}</div>
    <div class="wsub">Outside &amp; inside faces · Tier A = bottom, E = top · Spaces 1–5 left to right</div>
${['EXT', 'INT'].map((f) => `    <div class="sideT">${f === 'EXT' ? 'Outside face' : 'Inside face (courtyard)'} — ${s}-${f}</div>
    <div class="gwrap">
${flatGrid(s + '-' + f)}
    </div>`).join('\n')}
    <div class="legend">${legendHtml(prices)}</div>
    ${STATUS_LEG}
  </div>`;
}

function overviewView() {
  const panels = FACE_ORDER.map((k) => `      <div class="overview-panel">
        <div class="ovtitle">${esc(faceLabel(k))}</div>
        <div class="gwrap" style="padding:8px 10px;">
${flatGrid(k, { mini: true })}
        </div>
      </div>`).join('\n');
  return `  <div class="wview" id="wall-overview">
    <div class="wlabel">All Walls — Overview</div>
    <div class="wsub">All fourteen faces at a glance</div>
    <div class="ovgrid">
${panels}
    </div>
    <div class="legend">${legendHtml(TIERS.map((t) => t.p))}</div>
    ${STATUS_LEG}
  </div>`;
}

const BENCH_VIEW = `  <div class="wview" id="wall-bench">
    <div style="max-width:460px;margin:0 auto;text-align:center;">
      <div class="wlabel">Memorial Benches</div>
      <div class="wsub" style="margin-bottom:16px;">Both memorial benches have been sold</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
${[1, 2].map((i) => `        <div class="gwrap" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;opacity:.5;">
          <div style="font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:600;color:var(--gold);margin-bottom:4px;">Bench #${i}</div>
          <div style="font-size:11px;color:var(--gold-light);margin-bottom:2px;">Up to 4 inurnments</div>
          <div style="font-size:10px;color:rgba(200,169,110,.5);font-weight:600;letter-spacing:.06em;text-transform:uppercase;margin-top:6px;">Sold</div>
        </div>`).join('\n')}
      </div>
    </div>
  </div>`;

// ── CSS ────────────────────────────────────────────────────────────────────
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
  .sideT{font-family:'Cormorant Garamond',serif;font-size:15px;font-weight:600;color:var(--gold);text-align:center;margin:12px 0 6px;}
  .gwrap{background:linear-gradient(160deg,#0f1a30,#1a2744 60%,#0d1528);border:1px solid var(--gb);border-radius:8px;padding:16px 18px;overflow-x:auto;max-width:560px;margin:0 auto;}
  .fgrid{display:grid;gap:3px;margin:0 auto;width:100%;}
  .fgrid.mini{gap:1px;font-size:6px;}
  .rlbl{display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:13px;font-weight:700;color:var(--gold);}
  .fgrid.mini .rlbl{font-size:9px;}
  .ovgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px;max-width:1100px;margin:0 auto;}
  .ovtitle{font-family:'Cormorant Garamond',serif;font-size:13px;font-weight:600;color:var(--gold);margin-bottom:5px;text-align:center;}

  /* ── Flat niche cell: outdoor granite (photos) — light speckled frame page-side,
     dark polished front, tier on the chip ── */
  .n{border-radius:3px;border:1px solid rgba(0,0,0,.45);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;transition:transform .15s,box-shadow .15s,filter .15s;text-align:center;padding:2px;line-height:1.25;font-size:8.5px;min-width:0;font-family:'Jost',sans-serif;
    color:#e9e8e4;gap:1px;
    background:
      linear-gradient(115deg,rgba(255,255,255,.14) 0%,rgba(255,255,255,0) 32%),
      linear-gradient(180deg,#3d4046 0%,#2c2f35 55%,#212329 100%);}
  .n:hover{transform:scale(1.18);border-color:var(--gold);z-index:10;box-shadow:0 4px 16px rgba(0,0,0,.5),0 0 0 1px var(--gold);}
  .n:focus-visible,.n3:focus-visible{outline:2px solid #fff;outline-offset:1px;z-index:20;}
  .n.sel,.n3.sel{outline:3px solid #fff;outline-offset:-3px;z-index:25;
    filter:brightness(1.28) saturate(1.15);
    box-shadow:0 0 0 2px var(--gold),0 0 22px 4px rgba(255,255,255,.45);}
  .n.sel{transform:scale(1.06);}
  .nid{font-size:8px;opacity:.65;}
  .nprice{font-weight:600;font-size:10.5px;padding:0 5px;border-radius:3px;box-shadow:0 1px 2px rgba(0,0,0,.3);}
  .ncap{font-size:7.5px;opacity:.7;}
  .nstatus,.n3st{font-size:6px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
    padding:0 3px;border-radius:2px;background:rgba(255,255,255,.88);color:#17181b;}
  .fgrid.mini .nid{font-size:5px;}.fgrid.mini .nprice{font-size:6.5px;padding:0 2px;}.fgrid.mini .ncap,.fgrid.mini .nstatus{display:none;}
  .fgrid.mini .n{padding:1px;cursor:default;}
  .fgrid.mini .n:hover{transform:none;box-shadow:none;border-color:rgba(0,0,0,.45);}
  /* ── Status code (operator: an FSD must never mistake these for sellable).
     PATTERN + darkness, never hue — every hue on this page belongs to a price tier,
     and the first cut (amber/red rings) sat right next to the $12-15K chip colours.
       Occupied  = blacked-out cell (closed)
       Reserved  = diagonal-striped grey
       On Hold   = dashed outline, price still shown
     All badges neutral white-on-dark; nothing here shares a colour with a price. */
  .n,.n3{position:relative;}
  .st-reserved,.st-buried,.st-hold{color:#d9d8d4;}
  .st-buried{background:linear-gradient(180deg,#1b1c20 0%,#0e0f12 100%)!important;
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)!important;}
  .st-reserved{background:
      repeating-linear-gradient(135deg,rgba(255,255,255,.15) 0 4px,rgba(255,255,255,0) 4px 9px),
      linear-gradient(180deg,#35373c 0%,#222428 100%)!important;}
  .st-hold{opacity:.85;}
  .st-hold::before{content:'';position:absolute;inset:1px;pointer-events:none;
    border:2px dashed rgba(255,255,255,.7);border-radius:inherit;}
  .st-hold .nprice{filter:saturate(.45);}
  .fgrid.mini .st-hold::before{border-width:1px;}

${TIER_CSS}
  .stleg-a{background:linear-gradient(180deg,#3d4046,#212329);}
  .stleg-r{background:
      repeating-linear-gradient(135deg,rgba(255,255,255,.15) 0 3px,rgba(255,255,255,0) 3px 6px),
      linear-gradient(180deg,#35373c,#222428);}
  .stleg-b{background:linear-gradient(180deg,#1b1c20,#0e0f12);}
  .stleg-h{background:linear-gradient(180deg,#3d4046,#212329);border:2px dashed rgba(255,255,255,.7)!important;}

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
  .scene{position:relative;height:min(64vh,580px);min-height:330px;margin:0 auto;max-width:1100px;
    background:radial-gradient(ellipse at 50% 30%,#27354f 0%,#16203a 48%,#0a1020 100%);
    border:1px solid var(--gb);border-radius:10px;overflow:hidden;cursor:grab;touch-action:none;
    perspective:1700px;perspective-origin:50% 42%;}
  .scene:active{cursor:grabbing;}
  .scene:focus-visible{outline:2px solid var(--gold);outline-offset:2px;}
  .stage{position:absolute;left:50%;top:72%;width:0;height:0;transform-style:preserve-3d;
    transform:translateY(var(--lift,0px)) scale(var(--zoom,1)) rotateX(var(--pitch,0deg)) rotateY(var(--yaw,0deg));}
  .yard{position:absolute;transform-style:preserve-3d;}
  .grass{position:absolute;left:0;top:0;background:
      radial-gradient(ellipse at 50% 50%,rgba(74,110,58,.30),rgba(20,32,18,.85) 80%);
    border:1px solid rgba(120,150,100,.15);}
  .pad{position:absolute;left:0;top:0;background:
      linear-gradient(135deg,rgba(150,152,148,.28),rgba(96,99,97,.22) 60%,rgba(70,72,70,.24));
    border:1px solid rgba(190,190,185,.25);}
  .fcomp{position:absolute;color:rgba(232,213,168,.85);font-size:12px;letter-spacing:.14em;white-space:nowrap;}
  .fc-in{left:56%;top:50%;transform:translate(-50%,-50%);}
  .fc-out-n{left:56%;top:7%;transform:translateX(-50%) rotate(180deg);}
  .fc-out-s{left:56%;bottom:7%;transform:translateX(-50%);}
  /* granite */
  .face{position:absolute;left:0;top:0;display:grid;gap:2.5px;
    background:linear-gradient(180deg,#c6c3bb,#aeaba2);
    padding:3px;border:1px solid #8f8c84;
    backface-visibility:hidden;box-shadow:0 0 22px rgba(0,0,0,.45);}
  .gside{position:absolute;left:0;top:0;background:linear-gradient(180deg,#bdbab2,#95928a);border:1px solid #86837b;backface-visibility:hidden;}
  .gcap{position:absolute;left:0;top:0;background:linear-gradient(135deg,#cfccc4,#a5a29a);border:1px solid #8f8c84;}
  /* granite pier between two niche fields — same stone as the frames, so a bank
     reads as the single continuous structure it is */
  .gpier{position:absolute;left:0;top:0;background:linear-gradient(180deg,#c6c3bb,#aeaba2);border:1px solid #8f8c84;backface-visibility:hidden;}
  /* Inside views: the bank between the camera and the subject fades to a ghost so
     the interior faces are actually visible face-on. */
  .face,.gside,.gcap,.gpier{transition:opacity .3s;}
  #stage.hide-bkn .bk-n,#stage.hide-bks .bk-s{opacity:.05;pointer-events:none;}
  .bench{position:absolute;left:0;top:0;background:linear-gradient(180deg,#b5ae9e,#8f887a);border:1px solid #7d7669;backface-visibility:hidden;}
  .btop{background:linear-gradient(135deg,#c4bdad,#9a9385);}
  .n3{border:none;border-radius:1px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;
    overflow:hidden;line-height:1.1;padding:0;min-width:0;transition:filter .15s,transform .15s;gap:1px;
    color:#e9e8e4;
    background:
      linear-gradient(115deg,rgba(255,255,255,.16) 0%,rgba(255,255,255,0) 32%),
      linear-gradient(180deg,#3d4046 0%,#2c2f35 55%,#212329 100%);
    box-shadow:inset 0 1px 1px rgba(255,255,255,.18),inset 0 -3px 6px -3px rgba(0,0,0,.6);}
  .n3:hover{filter:brightness(1.18) saturate(1.08);transform:scale(1.5);z-index:30;
    box-shadow:0 4px 18px rgba(0,0,0,.55),inset 0 1px 1px rgba(255,255,255,.18);}
  /* While orbiting, niches under the moving cursor must not pop. */
  .scene.dragging .n3:hover{transform:none!important;filter:none!important;}
  .n3id{font-size:7px;opacity:.7;letter-spacing:.02em;}
  .n3p{font-size:7.5px;font-weight:600;padding:0 2px;border-radius:2px;box-shadow:0 1px 2px rgba(0,0,0,.4);letter-spacing:-.02em;white-space:nowrap;}
  .n3st{font-size:5.5px;letter-spacing:.06em;}
  .baseband{background:linear-gradient(180deg,#93908a,#6d6a64);
    display:flex;align-items:center;justify-content:center;color:#26241f;
    font-size:7.5px;letter-spacing:.1em;white-space:nowrap;overflow:hidden;font-weight:600;}
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

  /* ── PRINT: the flat per-wall grids, all seven sections, no JS needed ── */
  @media print {
    .no-print,.tabs,.card,.toolbar,.view3d,.hint,.modelnote{display:none!important;}
    *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important;}
    body{background:#fff!important;color:#1a1a1a!important;}
    .header{background:#fff!important;border-bottom:2px solid #c8540a!important;padding:10px 0;}
    .htxt h1{color:#1a2744!important;}
    .htxt p{color:#555!important;}
    .wview{display:block!important;break-before:page;}
    #wall-A{break-before:avoid!important;}
    #wall-overview,#wall-bench{display:none!important;}
    /* On a wall tab, print ONLY that wall (operator). From the 3D view / overview /
       benches, print keeps all seven. */
    body.pv-one .wview{display:none!important;}
    body.pv-one .wview.active{display:block!important;break-before:avoid!important;}
    /* A highlighted space narrows it further: only ITS wall prints (operator). This
       outranks the tab scope — the rules sit later, so they win. */
    body.pv-sel .wview{display:none!important;}
    body.pv-sel .wview.printsel{display:block!important;break-before:avoid!important;}
    /* The highlighted space prints its full pricing card too. */
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
    .wlabel,.sideT{color:#1a2744!important;}
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

// ── Page runtime ───────────────────────────────────────────────────────────
const FACE_LABEL_JSON = JSON.stringify(Object.fromEntries(FACE_ORDER.map((k) => [k, faceLabel(k)])));
const MIS_SECTION_JSON = JSON.stringify(Object.fromEntries(FACE_ORDER.map((k) => [k, `Wall ${WALLS[k].section} ${WALLS[k].face === 'EXT' ? 'Exterior' : 'Interior'}`])));

const JS = `
'use strict';
var OC = ${FEES.OC}, REC = ${FEES.REC}, INSCR = ${FEES.INSCR}, VASE = ${FEES.VASE}, TAX = ${FEES.TAX};
var STATUS_LABEL = ${JSON.stringify(STATUS_LABEL)};
var WALL_LABEL = ${FACE_LABEL_JSON};
var MIS_SECTION = ${MIS_SECTION_JSON};
var fm = function (n) { return '$' + n.toLocaleString('en-US'); };
var ecf = function (p) { return Math.ceil(p * ${FEES.ECF_RATE}); };
var qty = function (id) { var e = document.getElementById(id); return e ? (parseInt(e.value, 10) || 0) : 0; };

// ── Detail card ────────────────────────────────────────────────────────────
var card = document.getElementById('card');
var pinned = null;

function cardHtml(d) {
  // Sold or occupied: the card names the space and its status, and shows NO pricing.
  if (d.st === 'reserved' || d.st === 'buried') {
    return '<div class="cardhd"><span class="cardid">' + d.id + '</span>' +
      '<span class="cardwall">' + (WALL_LABEL[d.wall] || '') + '</span>' +
      '<button class="cclose" type="button" aria-label="Close">\\u00d7</button></div>' +
      '<div class="cardmis">ROAC \\u00b7 ' + (MIS_SECTION[d.wall] || '') + ' \\u00b7 Tier ' + d.lvl + ' \\u00b7 Space ' + d.sp + '</div>' +
      '<div class="cardst">' + (STATUS_LABEL[d.st] || d.st) + '</div>' +
      '<div class="cnote">Not available \\u2014 no pricing shown. Confirm in MIS/Enterprise.</div>';
  }
  var price = +d.price, e = ecf(price), tot = price + e, rows = '';
  rows += '<div class="cr"><span class="cl">Niche Price</span><span class="cv">' + fm(price) + '</span></div>';
  rows += '<div class="cr"><span class="cl">ECF (10%)</span><span class="cv">' + fm(e) + '</span></div>';
  var oc = qty('oc-qty'), rc = qty('rec-qty'), iq = qty('inscr-qty'), vq = qty('vase-qty');
  if (oc > 0) { rows += '<div class="cr"><span class="cl">O&amp;C \\u00d7' + oc + '</span><span class="cv">' + fm(OC * oc) + '</span></div>'; tot += OC * oc; }
  if (rc > 0) { rows += '<div class="cr"><span class="cl">Recording \\u00d7' + rc + '</span><span class="cv">' + fm(REC * rc) + '</span></div>'; tot += REC * rc; }
  var taxable = INSCR * iq + VASE * vq;
  if (iq > 0) { rows += '<div class="cr"><span class="cl">Inscription \\u00d7' + iq + '</span><span class="cv">' + fm(INSCR * iq) + '</span></div>'; }
  if (vq > 0) { rows += '<div class="cr"><span class="cl">Vase \\u00d7' + vq + '</span><span class="cv">' + fm(VASE * vq) + '</span></div>'; }
  if (taxable > 0) {
    var tx = Math.round(taxable * TAX * 100) / 100;
    rows += '<div class="cr"><span class="cl">Sales Tax (10.4%)</span><span class="cv">$' + tx.toFixed(2) + '</span></div>';
    tot += taxable + tx;
  }
  var st = d.st !== 'available' ? '<div class="cardst">' + (STATUS_LABEL[d.st] || d.st) + '</div>' : '';
  return '<div class="cardhd"><span class="cardid">' + d.id + '</span>' +
    '<span class="cardwall">' + (WALL_LABEL[d.wall] || '') + '</span>' +
    '<button class="cclose" type="button" aria-label="Close">\\u00d7</button></div>' +
    '<div class="cardmis">ROAC \\u00b7 ' + (MIS_SECTION[d.wall] || '') + ' \\u00b7 Tier ' + d.lvl + ' \\u00b7 Space ' + d.sp + '</div>' +
    st + rows +
    '<div class="ctot"><span class="ctl">Est. Total</span><span class="ctv">' + fm(Math.round(tot)) + '</span></div>' +
    '<div class="cnote">Up to 2 inurnments per niche. ECF is not included in the listed price.</div>';
}

function readNiche(el) {
  var d = {};
  ['wall', 'id', 'price', 'st', 'lvl', 'sp'].forEach(function (k) {
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
  var w = el.getAttribute('data-wall'), id = el.getAttribute('data-id');
  var all = document.querySelectorAll('[data-wall="' + w + '"][data-id="' + id + '"]');
  for (var i = 0; i < all.length; i++) if (!all[i].closest('.mini')) all[i].classList.add('sel');
}

// Card opens NEXT TO the space (same behavior as the MVC page); phones keep the sheet.
function placeCard(el) {
  if (window.matchMedia('(max-width:700px)').matches) {
    card.style.left = card.style.top = card.style.right = card.style.bottom = '';
    return;
  }
  var r = el.getBoundingClientRect();
  card.style.right = 'auto'; card.style.bottom = 'auto';
  var cw = card.offsetWidth || 274, ch = card.offsetHeight || 220;
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
  var wv = document.getElementById('wall-' + d.wall.charAt(0));
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
['oc-qty', 'rec-qty', 'inscr-qty', 'vase-qty'].forEach(function (id) {
  var e = document.getElementById(id);
  if (e) e.addEventListener('input', function () { if (pinned) showCard(pinned, false); });
});

// ── Tabs (selection survives tab switches, same as the MVC page) ───────────
function showView(v) {
  var views = document.querySelectorAll('.wview, .view3d');
  for (var i = 0; i < views.length; i++) views[i].classList.remove('active');
  var el = document.getElementById(v === '3d' ? 'view-3d' : 'wall-' + v);
  if (el) el.classList.add('active');
  var tabs = document.querySelectorAll('.tabs .tab');
  for (var j = 0; j < tabs.length; j++) tabs[j].classList.toggle('active', tabs[j].getAttribute('data-view') === v);
  // On a wall tab, print only that wall.
  document.body.classList.toggle('pv-one', ${JSON.stringify(SECTION_ORDER)}.indexOf(v) > -1);
  if (v === '3d') fitScene();
}
document.querySelectorAll('.tabs .tab').forEach(function (t) {
  t.addEventListener('click', function () { showView(t.getAttribute('data-view')); });
});

// ── 3D camera (same clamps and deferred pointer capture as the MVC page) ───
var scene = document.getElementById('scene'), stage = document.getElementById('stage');
var DEF = { yaw: -58, pitch: -26, zoom: 1 };
var cam = { yaw: DEF.yaw, pitch: DEF.pitch, zoom: DEF.zoom, lift: 0 };
var ZMIN = 0.3, ZMAX = 2.8, PMIN = -90, PMAX = 0;
var fitZoom = 1;
var HALF_PX = ${px(H / 2)};
var STAGE_TOP = 0.72;
var BANK_W_PX = ${px(BANK_W)}, YARD_D_PX = ${px(2 * (BANK_Z + GEO.slabT / 2))};

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

function fitScene() {
  if (!scene.offsetWidth) return;
  fitZoom = clamp(scene.offsetWidth / 1150, 0.5, 1);
  if (Math.abs(cam.zoom - DEF.zoom) < 0.001 || cam.zoom === fitZoom) { cam.zoom = fitZoom; }
  DEF.zoom = fitZoom;
  apply();
}
window.addEventListener('resize', fitScene);

// Presets. Every bank face — outside AND inside — gets a square-on view; the inside
// ones fade the occluding bank (hide). dist is the viewed face plane's SIGNED offset
// toward the camera from the stage origin: perspective (1700px) magnifies a positive
// dist and shrinks a negative one, so the fit compensates once either way.
var curPreset = null;
var VIEWS = {
  court:   { yaw: -90 },
  'out-s': { yaw: 0,   w: BANK_W_PX,        dist: ${px(BANK_Z + GEO.slabT / 2)} },
  'in-s':  { yaw: 180, w: BANK_W_PX,        dist: ${-px(BANK_Z - GEO.slabT / 2)}, hide: 'bk-n' },
  'out-n': { yaw: 180, w: BANK_W_PX,        dist: ${px(BANK_Z + GEO.slabT / 2)} },
  'in-n':  { yaw: 0,   w: BANK_W_PX,        dist: ${-px(BANK_Z - GEO.slabT / 2)}, hide: 'bk-s' },
  'd-out': { yaw: 90,  w: ${px(GEO.faceW)}, dist: ${px(-D_X + GEO.slabT / 2)} },
  'd-in':  { yaw: -90, w: ${px(GEO.faceW)}, dist: ${-px(-D_X - GEO.slabT / 2)} },
};
function viewTo(k) {
  // A camera jump moves the model under a stationary cursor; Chrome then fires a
  // synthetic hover that can park a stale card over the niches. Drop it.
  if (!pinned) card.classList.remove('show');
  var v = VIEWS[k];
  curPreset = k;
  stage.classList.toggle('hide-bkn', v.hide === 'bk-n');
  stage.classList.toggle('hide-bks', v.hide === 'bk-s');
  cam.yaw = v.yaw;
  if (k === 'court') {
    cam.pitch = -22;
    cam.zoom = clamp(scene.clientHeight * 0.9 / (YARD_D_PX * 1.15), ZMIN, ZMAX);
    cam.lift = HALF_PX * cam.zoom * 0.4 - (STAGE_TOP - 0.5) * scene.clientHeight * 0.5;
  } else {
    cam.pitch = 0;
    // Exact perspective fit: displayed size = real * z * P/(P - dist*z), so the z
    // that hits a target T is z = T*P / (real*P + T*dist). dist is SIGNED toward
    // the camera; the earlier one-step correction under-zoomed Wall D badly.
    var Tw = scene.clientWidth * 0.86, Th = scene.clientHeight * 0.72, P = 1700;
    var zw = (Tw * P) / (v.w * P + Tw * v.dist);
    var zh = (Th * P) / (${px(H)} * P + Th * v.dist);
    cam.zoom = clamp(Math.min(zw, zh), ZMIN, ZMAX);
    cam.lift = HALF_PX * cam.zoom - (STAGE_TOP - 0.5) * scene.clientHeight;
  }
  apply();
}
// A lit preset button is a TOGGLE: tap Inside C·B·A again (or any active view) and
// the camera returns to the standard courtyard view (operator).
document.querySelectorAll('[data-viewbtn]').forEach(function (b) {
  b.addEventListener('click', function () {
    var k = b.getAttribute('data-viewbtn');
    viewTo(curPreset === k && k !== 'court' ? 'court' : k);
  });
});
document.getElementById('btn-reset').addEventListener('click', function () { viewTo('court'); });
document.getElementById('btn-in').addEventListener('click', function () { cam.zoom *= 1.25; apply(); });
document.getElementById('btn-out').addEventListener('click', function () { cam.zoom /= 1.25; apply(); });

// Drag to orbit / pinch to zoom. Capture is DEFERRED until a real drag (>8px) or a
// second finger — capturing on pointerdown retargets the click to the scene and a
// tap on a niche never reaches the button (the MVC page's tap bug, MISTAKES #18).
var pts = {}, last = null, pinchStart = 0, zoomStart = 1, moved = 0, captured = false;
var downNiche = null, downAt = 0;
function capturePts() {
  if (captured) return;
  captured = true;
  scene.classList.add('dragging');
  // Orbiting away from a preset: the faded bank comes back and no button stays lit.
  curPreset = null;
  stage.classList.remove('hide-bkn');
  stage.classList.remove('hide-bks');
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
// Every native click after a pointer gesture is swallowed; the tap detector is the
// only path from a gesture to a selection. Keyboard clicks still pass (no gesture).
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
  if (k.indexOf('Arrow') === 0) {
    curPreset = null;
    stage.classList.remove('hide-bkn');
    stage.classList.remove('hide-bks');
  }
  ev.preventDefault();
  apply();
});

// Home: a three-quarter view into the courtyard from the entry corner.
fitScene();
apply();
`;

// ── Assemble ───────────────────────────────────────────────────────────────
const LOGO = fs.readFileSync(path.join(ROOT, 'scripts', 'bw-logo.svg.txt'), 'utf8').trim();
const N_TOTAL = allNiches().length;

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bonney Watson — Rock of Ages Columbarium</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
<!-- Generated by scripts/build_roac_map.mjs from scripts/roac-niche-data.mjs. Do not hand-edit. -->
<style>${CSS}</style>
</head>
<body>
<div class="header">
  ${LOGO}
  <div class="htxt">
    <h1>Rock of Ages Columbarium — Niche Map</h1>
    <p>Washington Memorial Park &nbsp;·&nbsp; Garden 19</p>
  </div>
  <a class="back-btn no-print" href="../">&larr; Quote Tool</a>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
</div>
<div class="tabs">
  <button class="tab active" data-view="3d">3D View</button>
${SECTION_ORDER.map((s) => `  <button class="tab" data-view="${s}">Wall ${s}</button>`).join('\n')}
  <button class="tab" data-view="bench">Benches</button>
  <button class="tab" data-view="overview" style="margin-left:auto;border-left:1px solid var(--gb);">Overview</button>
</div>
<div class="main">
  <div class="printcard" id="printcard" aria-hidden="true"></div>

  <div class="view3d active" id="view-3d">
    <div class="toolbar no-print">
      <button class="tbtn" data-viewbtn="court" title="Into the courtyard from the entry">Courtyard</button>
      <button class="tbtn" data-viewbtn="out-s" title="Outside faces of Walls C, B, A">Outside C·B·A</button>
      <button class="tbtn" data-viewbtn="in-s" title="Inside (courtyard) faces of Walls C, B, A — the E·F·G bank fades out of the way">Inside C·B·A</button>
      <button class="tbtn" data-viewbtn="out-n" title="Outside faces of Walls E, F, G">Outside E·F·G</button>
      <button class="tbtn" data-viewbtn="in-n" title="Inside (courtyard) faces of Walls E, F, G — the C·B·A bank fades out of the way">Inside E·F·G</button>
      <button class="tbtn" data-viewbtn="d-out" title="Wall D, outside face">Wall D · Out</button>
      <button class="tbtn" data-viewbtn="d-in" title="Wall D, inside (courtyard) face, seen down the courtyard">Wall D · In</button>
      <div class="tbsep"></div>
      <button class="tbtn" id="btn-reset">Reset view</button>
      <div class="tbsep"></div>
      <button class="tbtn" id="btn-out" aria-label="Zoom out">&minus;</button>
      <button class="tbtn" id="btn-in" aria-label="Zoom in">+</button>
    </div>
${scene3d()}
    <div class="hint">Drag to orbit &nbsp;·&nbsp; scroll or pinch to zoom &nbsp;·&nbsp; tap a niche to select it &nbsp;·&nbsp; arrow keys orbit, +/&minus; zoom</div>
    <div class="modelnote">Seven granite sections, ${N_TOTAL} niches: banks C·B·A and E·F·G with Wall D across the head &nbsp;·&nbsp; interior faces look into the bench courtyard &nbsp;·&nbsp; model proportions estimated from photographs</div>
    <div class="legend">${legendHtml(TIERS.map((t) => t.p))}</div>
    ${STATUS_LEG}
  </div>

${SECTION_ORDER.map(sectionView).join('\n')}
${BENCH_VIEW}
${overviewView()}

  <div class="fees">
    <div class="fi"><span class="fl">Niche Inurnment O&amp;C — $${FEES.OC} ea</span>
      <span class="fv">Qty: <input type="number" id="oc-qty" min="0" max="4" value="0" aria-label="Opening and closing quantity"></span></div>
    <div class="fi"><span class="fl">Recording Fee — $${FEES.REC} ea</span>
      <span class="fv">Qty: <input type="number" id="rec-qty" min="0" max="4" value="0" aria-label="Recording fee quantity"></span></div>
    <div class="fi"><span class="fl">Niche Inscription — $${FEES.INSCR} ea (taxable)</span>
      <span class="fv">Qty: <input type="number" id="inscr-qty" min="0" max="4" value="0" aria-label="Inscription quantity"></span></div>
    <div class="fi"><span class="fl">Niche Vase — $${FEES.VASE} ea (taxable)</span>
      <span class="fv">Qty: <input type="number" id="vase-qty" min="0" max="4" value="0" aria-label="Vase quantity"></span></div>
    <div class="fi"><span class="fl">ECF</span><span class="fv">10% of niche price — not included in listed prices</span></div>
    <div class="fi"><span class="fl">Sales Tax</span><span class="fv">10.4% — applies to inscription and vase</span></div>
    <div class="fi"><span class="fl">Standard Niches</span><span class="fv">Up to 2 inurnments</span></div>
  </div>
  <div class="pfoot">
    <b>Tier A is the bottom row; Tier E the top. Spaces run 1–5 left to right facing each wall.</b><br>
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
console.log(`wrote ${path.relative(ROOT, OUT)} — ${(fs.statSync(OUT).size / 1024).toFixed(1)} KB, ${N_TOTAL} niches across ${FACE_ORDER.length} faces`);
