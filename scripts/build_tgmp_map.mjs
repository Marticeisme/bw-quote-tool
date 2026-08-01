/**
 * Generates MAPS/TGMP_Map.html from scripts/tgmp-data.mjs.
 *
 * Fourth of the family (build_mvc_map / build_roac_map / build_ecl_map / build_com_map):
 * a CSS-3D scene on screen, flat grids and lists for the tabs and for print, both
 * emitted as STATIC HTML from the one dataset so they cannot drift.
 *
 * This one is an OUTDOOR scene — the Terrace Garden Memorial Path: a long kerbed garden
 * strip with a concrete walk down the middle ending in a round turn-around, bark beds
 * either side of it, the TGN niche bank across the far end, the nine additional
 * cremation properties set in the beds and on the apron, and cast planters along both
 * kerbs. Object PLACEMENT IS APPROXIMATE and the page says so.
 *
 * REBUILT 2026-07-31 (sprint-09 Track T). There is NO reflection pool and no ossuary
 * mass: see the header of scripts/tgmp-data.mjs. scripts/verify_tgmp_map.mjs §12 fails
 * if either comes back.
 *
 * Prices and rights are hand-maintained data: edit scripts/tgmp-data.mjs and rebuild —
 * never hand-edit the HTML.
 *
 *   node scripts/build_tgmp_map.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TGN, TGMP_ITEMS, GEO, TIERS, STATUS_LABEL, FEES, FEE_SOURCE,
  BANK_FIELD_W, BANK_FIELD_H, BANK_W, BANK_H, INNER_Z, PLANTER, PLANTERS,
  tgnNiches, tgnRef, sellable, allProperties,
} from './tgmp-data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'MAPS', 'TGMP_Map.html');

// A 12.5" niche must hold a "$16,000" chip. At 5.0 px/in it is 62px wide — the same
// working size the ECL page settled on. The camera's fit-zoom scales the scene back.
const PPI = 5.0;
const px = (v) => +(v * PPI).toFixed(2);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = (n) => '$' + n.toLocaleString('en-US');
const tier = (p) => {
  const t = TIERS.find((x) => x.p === p);
  if (!t) throw new Error(`price ${p} has no entry in TIERS — add it to scripts/tgmp-data.mjs`);
  return t;
};

// ── Stage coordinates ─────────────────────────────────────────────────────────
// Stage y = 0 is the GROUND plane and up is negative, matching the CSS-3D convention
// used by the other map pages. `.yard` is lifted by SCENE_H/2, so a child's local y is
// its stage y plus that offset.
const SCENE_H = BANK_H;                 // tallest structure on the terrace
const Y = (yStage) => yStage + SCENE_H / 2;

/** Four sides + a top for a rectangular mass standing on the ground. */
function mass(cx, cz, w, d, h, cls, { btn = null, label = '', topCls = '' } = {}) {
  const p = [];
  const tag = btn ? 'button' : 'div';
  const attrs = btn ? ` type="button" ${btn}` : '';
  const face = (wIn, hIn, x, y, z, ry, extra, body) => `      <${tag} class="${cls}${extra}"${attrs} style="width:${px(wIn)}px;height:${px(hIn)}px;transform:translate(-50%,-50%) translate3d(${px(x)}px,${px(y)}px,${px(z)}px) rotateY(${ry}deg)">${body}</${tag}>`;
  p.push(face(w, h, cx, Y(-h / 2), cz + d / 2, 0, ' m-front', label));
  p.push(face(w, h, cx, Y(-h / 2), cz - d / 2, 180, ' m-back', ''));
  p.push(face(d, h, cx + w / 2, Y(-h / 2), cz, 90, ' m-side', ''));
  p.push(face(d, h, cx - w / 2, Y(-h / 2), cz, -90, ' m-side', ''));
  p.push(`      <${tag} class="${cls} m-top ${topCls}"${attrs} style="width:${px(w)}px;height:${px(d)}px;transform:translate(-50%,-50%) translate3d(${px(cx)}px,${px(Y(-h))}px,${px(cz)}px) rotateX(90deg)"></${tag}>`);
  return p.join('\n');
}

/** A flat horizontal panel lying on (or just below) the ground — beds, paving. */
// rotateX(+90), not -90: a ground plate turned the other way shows the camera its BACK
// face, and any text on it comes out mirrored — which is exactly how the old MEMORIAL
// PATH label printed in the overhead view.
function slab(cx, cz, w, d, yStage, cls, body = '') {
  return `      <div class="${cls}" style="width:${px(w)}px;height:${px(d)}px;transform:translate(-50%,-50%) translate3d(${px(cx)}px,${px(Y(yStage))}px,${px(cz)}px) rotateX(90deg)">${body}</div>`;
}

/** The same, round: the flagstone-and-cobble turn-around at the end of the walk. */
function disc(cx, cz, dia, yStage, cls, body = '') {
  return slab(cx, cz, dia, dia, yStage, cls, body);
}

// ── The TGN bank ──────────────────────────────────────────────────────────────
function nicheAttrs(n) {
  return `data-kind="niche" data-ref="${n.ref}" data-id="${n.id}" data-row="${n.row}" data-n="${n.n}"` +
    ` data-price="${sellable(n) ? n.price : ''}" data-rights="${n.rights}" data-st="${n.st}"`;
}
function nicheAria(n) {
  if (!sellable(n)) return `${n.ref}, Terrace Garden niche bank, ${STATUS_LABEL[n.st] || n.st}`;
  return `${n.ref}, Terrace Garden niche bank, ${money(n.price)}, ${n.rights} rights of interment, available`;
}

/**
 * The bank is built at the GROUP's local origin and the group is then translated and
 * turned, because this wall does not face the way the other maps' walls do: it stands
 * ACROSS the far end of the strip looking back down the path, so its face normal has to
 * swing from +z to +x. Rotating a group is the only way to do that here — every element
 * in the scene carries its own absolute transform, so there is nothing else to hang a
 * rotation on.
 */
function bankGroup(inner) {
  return `      <div class="bankgrp" style="transform:translate3d(${px(GEO.bankX)}px,0px,${px(GEO.bankZ)}px) rotateY(${GEO.bankRotY}deg)">
${inner}
      </div>`;
}

function bank3d() {
  const p = [];
  // The wall body: everything except the front plane, which the niche field covers.
  const cx = 0, cz = 0, t = GEO.bankT;
  p.push(`      <div class="bankbody" style="width:${px(BANK_W)}px;height:${px(BANK_H)}px;transform:translate(-50%,-50%) translate3d(${px(cx)}px,${px(Y(-BANK_H / 2))}px,${px(cz - t / 2)}px) rotateY(180deg)"></div>`);
  for (const sx of [-1, 1]) {
    p.push(`      <div class="bankbody" style="width:${px(t)}px;height:${px(BANK_H)}px;transform:translate(-50%,-50%) translate3d(${px(cx + sx * BANK_W / 2)}px,${px(Y(-BANK_H / 2))}px,${px(cz)}px) rotateY(${sx > 0 ? 90 : -90}deg)"></div>`);
  }
  p.push(`      <div class="bankcap" style="width:${px(BANK_W)}px;height:${px(t)}px;transform:translate(-50%,-50%) translate3d(${px(cx)}px,${px(Y(-BANK_H))}px,${px(cz)}px) rotateX(90deg)"></div>`);

  const cells = tgnNiches().map((n) => {
    const ri = TGN.rows.indexOf(n.row) + 1;
    const chip = sellable(n) ? `<span class="n3p ${tier(n.price).c}">${money(n.price)}</span>` : '';
    const st = n.st !== 'available' ? ` st-${n.st}` : '';
    const stTag = n.st !== 'available' ? `<span class="n3st">${STATUS_LABEL[n.st]}</span>` : '';
    return `        <button type="button" class="n3 front3${st}" style="grid-row:${ri};grid-column:${n.n}" ${nicheAttrs(n)} aria-label="${esc(nicheAria(n))}"><span class="n3id">${n.id}</span>${chip}${stTag}</button>`;
  }).join('\n');

  p.push(`      <div class="bankface" style="width:${px(BANK_W)}px;height:${px(BANK_H)}px;padding:${px(GEO.bankFrame)}px;grid-template-columns:repeat(${TGN.cols},1fr);grid-template-rows:repeat(${TGN.rows.length},${GEO.nicheH}fr) ${GEO.bankBase}fr;transform:translate(-50%,-50%) translate3d(${px(cx)}px,${px(Y(-BANK_H / 2))}px,${px(cz + t / 2)}px)">
${cells}
        <div class="bankband" style="grid-row:${TGN.rows.length + 1};grid-column:1/-1"><b>TERRACE GARDEN NICHES</b></div>
      </div>`);
  return bankGroup(p.join('\n'));
}

// ── The nine additional properties ────────────────────────────────────────────
const itemAttrs = (it) => `data-kind="item" data-ref="${it.id}" data-id="${it.id}"` +
  ` data-price="${sellable(it) ? it.price : ''}" data-rights="${it.rights}" data-st="${it.st}"`;
const itemAria = (it) => (sellable(it)
  ? `${it.name}, ${money(it.price)}, ${it.rights} rights of interment, available`
  : `${it.name}, ${STATUS_LABEL[it.st] || it.st}`);

function item3d(it) {
  const attrs = `${itemAttrs(it)} aria-label="${esc(itemAria(it))}"`;
  const chip = sellable(it) ? `<span class="o3p ${tier(it.price).c}">${money(it.price)}</span>` : '';
  const label = `<span class="o3lab"><span class="o3id">${it.id}</span>${chip}</span>`;
  // Each object carries its OWN z now: the nine are set in the two beds and on the
  // apron, the way the PHASE 2 render arranges them, not strung along one line.
  const z = it.z;
  const p = [];
  if (it.shape === 'bench') {
    // Slab seat carried on a single pedestal, per the sheet's two-part dimensions.
    p.push(mass(it.x, z, it.pedW, it.pedD, it.pedH, 'o3 obj ped', { btn: attrs }));
    p.push(seatSlab(it, z, attrs, label));
  } else if (it.shape === 'birdbath') {
    const pedW = Math.round(it.w * 0.45);
    p.push(mass(it.x, z, pedW, pedW, it.h - 6, 'o3 obj ped', { btn: attrs }));
    p.push(bowl(it, z, attrs, label));
  } else {
    // Cabinet / post: one mass with a shutter plate on its front face.
    p.push(mass(it.x, z, it.w, it.d, it.h, 'o3 obj gran', { btn: attrs, label: shutter(it, label) }));
  }
  p.push(`      <div class="olabel" style="transform:translate(-50%,-50%) translate3d(${px(it.x)}px,${px(Y(-it.h - 9))}px,${px(z)}px)">${esc(it.id)}</div>`);
  return p.join('\n');
}

/** The polished top slab of a pedestal bench, floating on its pedestal. */
function seatSlab(it, z, attrs, label) {
  const y0 = -it.pedH;
  const p = [];
  p.push(`      <button type="button" class="o3 obj seat m-front" ${attrs} style="width:${px(it.w)}px;height:${px(it.seatT)}px;transform:translate(-50%,-50%) translate3d(${px(it.x)}px,${px(Y(y0 - it.seatT / 2))}px,${px(z + it.d / 2)}px)">${label}</button>`);
  p.push(`      <button type="button" class="o3 obj seat" ${attrs} style="width:${px(it.w)}px;height:${px(it.seatT)}px;transform:translate(-50%,-50%) translate3d(${px(it.x)}px,${px(Y(y0 - it.seatT / 2))}px,${px(z - it.d / 2)}px) rotateY(180deg)"></button>`);
  for (const sx of [-1, 1]) {
    p.push(`      <button type="button" class="o3 obj seat" ${attrs} style="width:${px(it.d)}px;height:${px(it.seatT)}px;transform:translate(-50%,-50%) translate3d(${px(it.x + sx * it.w / 2)}px,${px(Y(y0 - it.seatT / 2))}px,${px(z)}px) rotateY(${sx * 90}deg)"></button>`);
  }
  p.push(`      <button type="button" class="o3 obj seat m-top" ${attrs} style="width:${px(it.w)}px;height:${px(it.d)}px;transform:translate(-50%,-50%) translate3d(${px(it.x)}px,${px(Y(y0 - it.seatT))}px,${px(z)}px) rotateX(90deg)"></button>`);
  return p.join('\n');
}

/** The birdbath's bowl: a shallow round dish sitting on the pedestal. */
function bowl(it, z, attrs, label) {
  const y0 = -(it.h - 6);
  const p = [];
  p.push(`      <button type="button" class="o3 obj bowl m-front" ${attrs} style="width:${px(it.w)}px;height:${px(6)}px;transform:translate(-50%,-50%) translate3d(${px(it.x)}px,${px(Y(y0 - 3))}px,${px(z + it.d / 2)}px)">${label}</button>`);
  p.push(`      <button type="button" class="o3 obj bowl" ${attrs} style="width:${px(it.w)}px;height:${px(6)}px;transform:translate(-50%,-50%) translate3d(${px(it.x)}px,${px(Y(y0 - 3))}px,${px(z - it.d / 2)}px) rotateY(180deg)"></button>`);
  for (const sx of [-1, 1]) {
    p.push(`      <button type="button" class="o3 obj bowl" ${attrs} style="width:${px(it.d)}px;height:${px(6)}px;transform:translate(-50%,-50%) translate3d(${px(it.x + sx * it.w / 2)}px,${px(Y(y0 - 3))}px,${px(z)}px) rotateY(${sx * 90}deg)"></button>`);
  }
  p.push(`      <button type="button" class="o3 obj bowltop" ${attrs} style="width:${px(it.w)}px;height:${px(it.d)}px;transform:translate(-50%,-50%) translate3d(${px(it.x)}px,${px(Y(y0 - 6))}px,${px(z)}px) rotateX(90deg)"></button>`);
  return p.join('\n');
}

/** The Absolute Black shutter (or carved panel) on the front of a post / cabinet. */
function shutter(it, label) {
  const n = it.shutters || 1;
  const cls = it.carved ? 'shut carved' : 'shut';
  const plates = Array.from({ length: n }, () => `<span class="${cls}"><span class="rose"></span><span class="rose"></span></span>`).join('');
  const alcove = it.shape === 'cabinet' ? '<span class="alcove"></span>' : '';
  return `<span class="shutwrap">${alcove}${plates}</span>${label}`;
}

// ── Context masses: the kerb wall and the planters ───────────────────────────
// Nothing in here is inventory. Context carries no data-ref, so it can never be
// selected, can never open a card, and can never show a price — §12 of the gate proves
// it. The reflection pool and the ossuary block used to be built here; they are gone.
function kerb3d() {
  const { terraceW: tw, terraceD: td, kerbT: kt, kerbH: kh } = GEO;
  const inner = td - 2 * kt;
  return [
    mass(0, td / 2 - kt / 2, tw, kt, kh, 'ctx kerb'),
    mass(0, -(td / 2 - kt / 2), tw, kt, kh, 'ctx kerb'),
    mass(tw / 2 - kt / 2, 0, kt, inner, kh, 'ctx kerb'),
    mass(-(tw / 2 - kt / 2), 0, kt, inner, kh, 'ctx kerb'),
  ].join('\n');
}

function planters3d() {
  return PLANTERS
    .map((p) => mass(p.x, p.z, PLANTER.w, PLANTER.d, PLANTER.h, 'ctx planter'))
    .join('\n');
}

function ground3d() {
  const { terraceW: tw, terraceD: td, apronX0: a0, apronX1: a1, pathW: pw, headX, headR } = GEO;
  return [
    // The mausoleum's own concrete, all around the strip.
    slab(0, 0, tw + 340, td + 320, 1.5, 'ground'),
    // The strip itself: bark mulch, wall to wall, with the paving laid on top of it.
    slab(0, 0, tw, td, 0.9, 'bed'),
    // The open paved apron at the far end, where the bank, the 36" bench, the
    // columbarium and the birdbath stand.
    slab((a0 + a1) / 2, 0, a1 - a0, INNER_Z * 2, 0.5, 'paving'),
    // The walk, from the apron to the middle of the turn-around.
    slab((a1 + headX) / 2, GEO.pathZ, headX - a1, pw, 0.4, 'walk',
      '<span class="ctxlab tl-path">MEMORIAL PATH</span>'),
    // The turn-around: flagstone with cobble between, per the 2026-06-01 photograph.
    disc(headX, GEO.pathZ, headR * 2, 0.3, 'headslab'),
  ].join('\n');
}

function scene3d() {
  return `<div class="scene" id="scene" tabindex="0" role="application" aria-label="Three-dimensional model of the Terrace Garden Memorial Path: the memorial walk and its turn-around, the Terrace Garden niche bank across the far end, and the nine additional cremation properties set in the beds either side. Use the view buttons below, or arrow keys, to change the view.">
  <div class="stage" id="stage">
    <div class="yard" style="transform:translateY(${px(-SCENE_H / 2)}px)">
${ground3d()}
${kerb3d()}
${planters3d()}
${bank3d()}
${TGMP_ITEMS.map(item3d).join('\n')}
    </div>
  </div>
</div>`;
}

// ── Flat renderings ───────────────────────────────────────────────────────────
function tgnGrid({ mini = false } = {}) {
  const rowPx = mini ? 34 : 64;
  const labels = TGN.rows.map((L, i) => `    <div class="rlbl" style="grid-column:1;grid-row:${i + 1}">${L}</div>`).join('\n');
  const cells = tgnNiches().map((n) => {
    const ri = TGN.rows.indexOf(n.row) + 1;
    const st = n.st !== 'available' ? ` st-${n.st}` : '';
    const stTag = n.st !== 'available' ? `<span class="nstatus">${STATUS_LABEL[n.st]}</span>` : '';
    const body = sellable(n) ? `<span class="nprice ${tier(n.price).c}">${money(n.price)}</span>` : '';
    return `    <button type="button" class="n flatn${st}" style="grid-row:${ri};grid-column:${n.n + 1}" ${nicheAttrs(n)} aria-label="${esc(nicheAria(n))}"><span class="nid">${n.id}</span>${body}${stTag}</button>`;
  }).join('\n');
  return `  <div class="fgrid${mini ? ' mini' : ''}" style="grid-template-columns:24px repeat(${TGN.cols},1fr);grid-template-rows:repeat(${TGN.rows.length},${rowPx}px);max-width:${mini ? 380 : 760}px;">
${labels}
${cells}
  </div>`;
}

function itemRows({ mini = false } = {}) {
  return TGMP_ITEMS.map((it) => {
    const st = it.st !== 'available' ? ` st-${it.st}` : '';
    const body = sellable(it)
      ? `<span class="iprice ${tier(it.price).c}">${money(it.price)}</span><span class="irights">${it.rights} right${it.rights === 1 ? '' : 's'}</span>`
      : `<span class="nstatus">${STATUS_LABEL[it.st]}</span>`;
    const dim = it.dims ? `<span class="idim">${esc(it.dims)}</span>` : '<span class="idim idim-none">no dimensions on the sheet</span>';
    return `    <button type="button" class="irow${st}" ${itemAttrs(it)} aria-label="${esc(itemAria(it))}">` +
      `<span class="iid">${it.id}</span>` +
      `<span class="iname">${esc(it.name)}${mini ? '' : dim}</span>` +
      `<span class="ivals">${body}</span></button>`;
  }).join('\n');
}

function legendHtml(prices) {
  return TIERS.filter((t) => prices.includes(t.p))
    .map((t) => `<div class="li"><div class="ls ${t.c}"></div><span>${t.l}</span></div>`).join('');
}
const STATUS_LEG = `<div class="rightsleg">
      <div class="li"><div class="ls stleg-a"></div><span>Available</span></div>
      <div class="li"><div class="ls stleg-s"></div><span>Sold &mdash; no price shown</span></div>
    </div>`;

const TGN_TOTAL = tgnNiches().filter(sellable).reduce((a, n) => a + n.price, 0);
const ITEM_TOTAL = TGMP_ITEMS.filter(sellable).reduce((a, n) => a + n.price, 0);

function bankView() {
  const avail = tgnNiches().filter(sellable).length;
  return `  <div class="wview" id="wall-tgn">
    <div class="wlabel">Terrace Garden Niche Bank</div>
    <div class="wsub">TGN-&lt;row&gt;-&lt;n&gt; &nbsp;·&nbsp; Row A = bottom, E = top &nbsp;·&nbsp; ${TGN.cols} across &times; ${TGN.rows.length} high = ${TGN.cols * TGN.rows.length} niches, ${avail} available &nbsp;·&nbsp; ${TGN.rights} rights of interment per niche</div>
    <div class="gwrap">
${tgnGrid()}
    </div>
    <div class="legend">${legendHtml([...new Set(Object.values(TGN.rowPrices))])}</div>
    ${STATUS_LEG}
  </div>`;
}

function itemsView() {
  const avail = TGMP_ITEMS.filter(sellable).length;
  return `  <div class="wview" id="wall-props">
    <div class="wlabel">Additional Cremation Properties</div>
    <div class="wsub">The pricing sheet's nine TGMP line items, in its own order &nbsp;·&nbsp; ${avail} of ${TGMP_ITEMS.length} available &nbsp;·&nbsp; dimensions as printed on the sheet</div>
    <div class="gwrap ilist">
${itemRows()}
    </div>
    <div class="legend">${legendHtml([...new Set(TGMP_ITEMS.map((i) => i.price))])}</div>
    ${STATUS_LEG}
  </div>`;
}

function overviewView() {
  return `  <div class="wview" id="wall-overview">
    <div class="wlabel">The Whole Path</div>
    <div class="wsub">Niche bank and additional properties on one page &nbsp;·&nbsp; ${money(TGN_TOTAL + ITEM_TOTAL)} available at list</div>
    <div class="ovgrid">
      <div class="overview-panel">
        <div class="ovtitle">Niche Bank (TGN) &nbsp;·&nbsp; ${money(TGN_TOTAL)}</div>
        <div class="gwrap" style="padding:8px 10px;">
${tgnGrid({ mini: true })}
        </div>
      </div>
      <div class="overview-panel">
        <div class="ovtitle">Additional Properties (TGMP) &nbsp;·&nbsp; ${money(ITEM_TOTAL)}</div>
        <div class="gwrap ilist mini" style="padding:8px 10px;">
${itemRows({ mini: true })}
        </div>
      </div>
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
  .gwrap{background:linear-gradient(160deg,#0f1a30,#1a2744 60%,#0d1528);border:1px solid var(--gb);border-radius:8px;padding:16px 18px;overflow-x:auto;max-width:820px;margin:0 auto;}
  .fgrid{display:grid;gap:3px;margin:0 auto;width:100%;}
  .fgrid.mini{gap:1px;font-size:6px;}
  .rlbl{display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:13px;font-weight:700;color:var(--gold);}
  .fgrid.mini .rlbl{font-size:9px;}
  .ovgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));gap:14px;max-width:1100px;margin:0 auto;align-items:start;}
  .ovtitle{font-family:'Cormorant Garamond',serif;font-size:13px;font-weight:600;color:var(--gold);margin-bottom:5px;text-align:center;}

  /* ── Flat niche cell — the same champagne-lit granite family as the ECL/MVC pages.
     Hue belongs to the PRICE CHIP only; a cell's own fill never carries price. */
  .n{border-radius:3px;border:1px solid rgba(58,44,20,.42);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;transition:transform .15s,box-shadow .15s,filter .15s;text-align:center;padding:2px;line-height:1.25;font-size:8.5px;min-width:0;font-family:'Jost',sans-serif;
    color:#3a2c14;gap:2px;
    background:
      linear-gradient(115deg,rgba(255,255,255,.20) 0%,rgba(255,255,255,0) 32%),
      linear-gradient(180deg,#f2dda6 0%,#e2bd79 38%,#cd9d58 100%);}
  .n:hover{transform:scale(1.1);border-color:var(--gold);z-index:10;box-shadow:0 4px 16px rgba(0,0,0,.5),0 0 0 1px var(--gold);}
  .n:focus-visible,.n3:focus-visible,.o3:focus-visible,.irow:focus-visible{outline:2px solid #fff;outline-offset:1px;z-index:20;}
  .n.sel,.n3.sel,.o3.sel,.irow.sel{outline:3px solid #fff;outline-offset:-3px;z-index:25;
    filter:brightness(1.16) saturate(1.12);
    box-shadow:0 0 0 2px var(--gold),0 0 22px 4px rgba(255,255,255,.45);}
  .n.sel{transform:scale(1.04);}
  .nid{font-size:8px;opacity:.7;}
  .nprice{font-weight:600;font-size:10.5px;padding:0 5px;border-radius:3px;box-shadow:0 1px 2px rgba(0,0,0,.3);}
  .nstatus,.n3st{font-size:6px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
    padding:0 3px;border-radius:2px;background:rgba(255,255,255,.88);color:#17181b;}
  .fgrid.mini .nid{font-size:5px;}.fgrid.mini .nprice{font-size:6.5px;padding:0 2px;}.fgrid.mini .nstatus{display:none;}
  .fgrid.mini .n{padding:1px;cursor:default;}
  .fgrid.mini .n:hover{transform:none;box-shadow:none;border-color:rgba(0,0,0,.45);}
  /* Status is PATTERN + brightness, never hue: every hue on this page is a price. */
  .n,.n3,.o3,.irow{position:relative;}
  .st-sold,.st-unpriced{color:#463d2d;
    background:
      repeating-linear-gradient(135deg,rgba(255,255,255,.40) 0 3px,rgba(255,255,255,0) 3px 7px),
      linear-gradient(180deg,#b0a389 0%,#928670 55%,#786f5b 100%)!important;
    box-shadow:inset 0 0 0 1px rgba(46,35,16,.38)!important;}

${TIER_CSS}
  .stleg-a{background:linear-gradient(180deg,#f2dda6,#cd9d58);}
  .stleg-s{background:
      repeating-linear-gradient(135deg,rgba(255,255,255,.40) 0 2px,rgba(255,255,255,0) 2px 4px),
      linear-gradient(180deg,#b0a389,#786f5b);}

  .legend{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px;justify-content:center;}
  .li{display:flex;align-items:center;gap:5px;font-size:10px;color:var(--gold-light);}
  .ls{width:13px;height:13px;border-radius:2px;border:1px solid rgba(255,255,255,.2);flex-shrink:0;}
  .rightsleg{display:flex;flex-wrap:wrap;gap:14px;margin-top:6px;justify-content:center;}

  /* ── Additional-property list ── */
  .ilist{display:flex;flex-direction:column;gap:5px;}
  .irow{display:grid;grid-template-columns:64px 1fr auto;gap:10px;align-items:center;text-align:left;cursor:pointer;
    background:linear-gradient(180deg,rgba(242,221,166,.14),rgba(205,157,88,.12));
    border:1px solid rgba(200,169,110,.4);border-radius:5px;padding:7px 11px;color:var(--cream);font-size:11.5px;
    transition:background .15s,box-shadow .15s;}
  .irow:hover{background:linear-gradient(180deg,rgba(242,221,166,.28),rgba(205,157,88,.22));box-shadow:0 3px 12px rgba(0,0,0,.4);}
  .iid{font-family:'Cormorant Garamond',serif;font-weight:700;color:var(--gold);font-size:13px;}
  .iname{line-height:1.35;}
  .idim{display:block;font-size:9.5px;color:var(--gold-light);opacity:.85;letter-spacing:.03em;}
  .idim-none{font-style:italic;opacity:.7;}
  .ivals{display:flex;align-items:center;gap:8px;white-space:nowrap;}
  .iprice{font-weight:600;font-size:11.5px;padding:1px 7px;border-radius:3px;box-shadow:0 1px 2px rgba(0,0,0,.3);}
  .irights{font-size:10px;color:var(--gold-light);}
  .ilist.mini .irow{grid-template-columns:56px 1fr auto;padding:4px 8px;font-size:10px;cursor:default;}
  .ilist.mini .irow:hover{background:linear-gradient(180deg,rgba(242,221,166,.14),rgba(205,157,88,.12));box-shadow:none;}
  .ilist.mini .iprice{font-size:9.5px;padding:0 4px;}

  /* ── 3D scene ── */
  .toolbar{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;align-items:center;max-width:900px;margin:10px auto 8px;}
  .tbtn{background:rgba(200,169,110,.12);border:1px solid var(--gb);color:var(--gold-light);padding:7px 13px;border-radius:5px;font-size:11px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:all .15s;}
  .tbtn:hover{background:rgba(200,169,110,.26);color:var(--cream);}
  .tbtn.on{background:rgba(200,169,110,.3);border-color:var(--gold);color:var(--gold);}
  .tbtn:focus-visible{outline:2px solid #fff;outline-offset:2px;}
  .tbsep{width:1px;height:22px;background:var(--gb);margin:0 4px;}
  /* Outdoors: a daylight sky rather than the mausoleum interiors' dark rooms. */
  .scene{position:relative;height:min(66vh,600px);min-height:340px;margin:0 auto;max-width:1100px;
    background:linear-gradient(180deg,#2d4468 0%,#3c5c7e 42%,#4a6b76 72%,#2c3a34 100%);
    border:1px solid var(--gb);border-radius:10px;overflow:hidden;cursor:grab;touch-action:none;
    perspective:2200px;perspective-origin:50% 42%;}
  .scene:active{cursor:grabbing;}
  .scene:focus-visible{outline:2px solid var(--gold);outline-offset:2px;}
  .stage{position:absolute;left:50%;top:50%;width:0;height:0;transform-style:preserve-3d;
    transform:translate(var(--panx,0px),var(--pany,0px)) scale(var(--zoom,1)) rotateX(var(--pitch,0deg)) rotateY(var(--yaw,0deg));}
  .yard{position:absolute;transform-style:preserve-3d;}
  /* Ground surfaces, in the order they are laid: the mausoleum's concrete all round,
     the bark bed wall to wall inside the kerb, then the paving on top of it. The bed is
     BARK, not turf — the marketing render draws turf, every photograph of the built
     garden shows dark bark mulch around the posts. */
  .ground{position:absolute;left:0;top:0;background:
      linear-gradient(135deg,rgba(196,188,172,.42),rgba(158,152,140,.36) 60%,rgba(126,122,112,.4));
    border:1px solid rgba(200,194,180,.2);}
  .bed{position:absolute;left:0;top:0;background:
      repeating-linear-gradient(24deg,rgba(255,255,255,.045) 0 3px,rgba(0,0,0,.05) 3px 7px),
      linear-gradient(160deg,#4a3a2c 0%,#3a2d22 55%,#2c2219 100%);
    border:1px solid rgba(90,72,54,.6);}
  .paving{position:absolute;left:0;top:0;background:
      linear-gradient(135deg,rgba(214,208,194,.68),rgba(176,170,158,.62) 55%,rgba(150,145,134,.66));
    border:1px solid rgba(224,216,198,.42);}
  /* The concrete walk down the middle of the strip. */
  .walk{position:absolute;left:0;top:0;background:
      repeating-linear-gradient(90deg,rgba(206,201,188,.72) 0 78px,rgba(168,163,151,.72) 78px 82px);
    border:1px solid rgba(224,216,198,.4);}
  /* The round turn-around: flagstone slabs with river cobble between them. */
  .headslab{position:absolute;left:0;top:0;border-radius:50%;background:
      radial-gradient(circle at 50% 50%,rgba(198,203,193,.85) 0 42%,rgba(122,124,118,.8) 42% 52%,rgba(190,195,185,.85) 52% 78%,rgba(122,124,118,.8) 78% 100%);
    border:1px solid rgba(224,216,198,.4);}
  .ctxlab{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
    color:rgba(255,255,255,.72);font-size:11px;letter-spacing:.22em;white-space:nowrap;}
  .tl-path{color:rgba(46,42,34,.62);}
  /* Context masses are deliberately MATTE and unlit — they are not for sale, and must
     never read as one of the champagne-lit properties beside them. */
  .ctx{position:absolute;left:0;top:0;background:linear-gradient(180deg,#9a958a,#6f6b62);
    border:1px solid #5d5a52;backface-visibility:hidden;}
  .ctx.m-top{background:linear-gradient(135deg,#a8a297,#7d786e);}
  /* The cream stucco kerb wall around the strip. */
  .ctx.kerb{background:linear-gradient(180deg,#ddd6c6,#b6afa0);border-color:#9b9486;}
  .ctx.kerb.m-top{background:linear-gradient(135deg,#e8e1d1,#c2bbac);}
  /* Cast planters along both kerbs — dark, matte, and round-mouthed. */
  .ctx.planter{background:linear-gradient(180deg,#5c5b57,#3b3a37);border-color:#2e2d2b;}
  .ctx.planter.m-top{background:radial-gradient(circle at 50% 50%,#14140f 0 34%,#4c4b46 34% 100%);}
  .olabel{position:absolute;left:0;top:0;color:rgba(240,232,212,.9);font-size:10px;letter-spacing:.1em;white-space:nowrap;
    transform-style:preserve-3d;text-shadow:0 1px 3px rgba(0,0,0,.85);}
  .ctxname{color:rgba(226,220,205,.78);font-size:9.5px;letter-spacing:.16em;}

  /* Granite: the Paradiso family — a mauve/grey marbled stone with black shutters. */
  .bankgrp{position:absolute;left:0;top:0;width:0;height:0;transform-style:preserve-3d;}
  .bankbody{position:absolute;left:0;top:0;background:linear-gradient(180deg,#8e8290,#5f5763);border:1px solid #4a4450;backface-visibility:hidden;}
  .bankcap{position:absolute;left:0;top:0;background:linear-gradient(135deg,#9c8f9e,#6a6270);border:1px solid #4a4450;}
  .bankface{position:absolute;left:0;top:0;display:grid;gap:2.5px;
    background:linear-gradient(160deg,#9b8d9d 0%,#7a7180 45%,#5d5666 100%);
    border:1px solid #4a4450;backface-visibility:hidden;box-shadow:0 0 26px rgba(0,0,0,.5);}
  .bankband{background:linear-gradient(180deg,#4a4350,#2b2731);display:flex;align-items:center;justify-content:center;
    color:var(--gold-light);font-size:7.5px;letter-spacing:.14em;white-space:nowrap;overflow:hidden;font-weight:600;}
  .bankband b{color:var(--gold);font-weight:600;}
  .n3{border:none;border-radius:1px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;
    overflow:hidden;line-height:1.1;padding:0;min-width:0;transition:filter .15s,transform .15s;gap:1px;
    color:#3a2c14;
    background:
      linear-gradient(115deg,rgba(255,255,255,.22) 0%,rgba(255,255,255,0) 30%),
      linear-gradient(180deg,#f2dda6 0%,#e2bd79 38%,#cd9d58 100%);
    box-shadow:inset 0 2px 3px rgba(255,248,225,.8),inset 0 -6px 10px -5px rgba(96,58,12,.55),inset 0 0 0 1px rgba(58,44,20,.28);}
  .n3:hover,.o3:hover{filter:brightness(1.14) saturate(1.08);z-index:30;}
  .n3:hover{transform:scale(1.2);}
  .scene.dragging .n3:hover,.scene.dragging .o3:hover{transform:none!important;filter:none!important;}
  .n3id{font-size:7px;opacity:.8;letter-spacing:.02em;font-weight:500;}
  .n3p{font-size:7.5px;font-weight:600;padding:0 2px;border-radius:2px;box-shadow:0 1px 2px rgba(0,0,0,.4);letter-spacing:-.02em;white-space:nowrap;}

  /* Sellable objects along the path. Every face of an object is the same button target,
     so a tap anywhere on it opens its card. */
  .o3{position:absolute;left:0;top:0;border:1px solid #4a4450;padding:0;cursor:pointer;backface-visibility:hidden;
    display:flex;align-items:flex-start;justify-content:center;transition:filter .15s;}
  .o3.gran{background:linear-gradient(170deg,#a2919f 0%,#7d7183 48%,#5b5364 100%);}
  .o3.ped{background:linear-gradient(170deg,#9b8a99 0%,#74697d 55%,#564e60 100%);}
  .o3.seat{background:linear-gradient(150deg,#b0a0ae,#8a7f92 60%,#6b6274);}
  .o3.bowl{background:linear-gradient(180deg,#a2919f,#6b6274);border-radius:40% 40% 6% 6%/22% 22% 6% 6%;}
  .o3.bowltop{background:radial-gradient(ellipse at 50% 50%,#4e4757 0%,#8d8296 62%,#a89bab 100%);border-radius:50%;}
  .o3.m-top{background:linear-gradient(135deg,#b3a3b1,#7b7183);}
  .shutwrap{display:flex;gap:6%;align-items:center;justify-content:center;width:100%;height:64%;margin-top:9%;pointer-events:none;}
  .shut{flex:1;height:100%;background:linear-gradient(155deg,#20222a,#0b0c10 60%);border:1px solid #3b3d46;
    display:flex;align-items:center;justify-content:space-around;box-shadow:inset 0 1px 2px rgba(255,255,255,.12);}
  .shut.carved{background:linear-gradient(155deg,#8e8296,#615869 65%);}
  .rose{width:16%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,#c48a4a 30%,#7d5426 75%);opacity:.9;}
  .shut.carved .rose{background:radial-gradient(circle,#cfc4d4 25%,#8a7f92 80%);}
  .alcove{position:absolute;left:16%;right:16%;top:8%;height:22%;background:linear-gradient(180deg,#191b21,#2c2f38);
    border:1px solid #43464f;border-radius:40% 40% 4% 4%/60% 60% 4% 4%;}
  .o3lab{position:absolute;left:50%;bottom:-1px;transform:translate(-50%,110%);display:flex;gap:3px;align-items:center;pointer-events:none;white-space:nowrap;}
  .o3id{font-size:7px;color:rgba(240,232,212,.9);letter-spacing:.04em;text-shadow:0 1px 3px rgba(0,0,0,.9);}
  .o3p{font-size:7.5px;font-weight:600;padding:0 3px;border-radius:2px;box-shadow:0 1px 2px rgba(0,0,0,.4);white-space:nowrap;}

  .hint{text-align:center;font-size:10px;color:var(--gold-light);opacity:.7;margin-top:7px;letter-spacing:.05em;}
  .modelnote{text-align:center;font-size:9.5px;color:var(--gold-light);opacity:.55;margin-top:3px;}

  /* ── Detail card ── */
  .card{position:fixed;right:16px;bottom:16px;width:290px;background:rgba(16,24,44,.97);border:1px solid var(--gold);
    border-radius:9px;padding:13px 15px;z-index:900;box-shadow:0 10px 40px rgba(0,0,0,.65);font-size:11px;display:none;}
  .card.show{display:block;}
  .card{pointer-events:none;}
  .card.pinned{pointer-events:auto;}
  .cardhd{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:2px;}
  .cardid{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:700;color:var(--gold);}
  .cardwall{font-size:9px;color:var(--gold-light);letter-spacing:.1em;text-transform:uppercase;}
  .cardmis{font-size:9.5px;color:var(--gold-light);opacity:.85;letter-spacing:.03em;margin-bottom:7px;line-height:1.4;}
  .cardst{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#ffd9a0;margin-bottom:6px;}
  .cr{display:flex;justify-content:space-between;gap:10px;padding:2px 0;border-bottom:1px solid rgba(200,169,110,.1);}
  .cr:last-of-type{border:none;}
  .cl{color:var(--gold-light);}.cv{font-weight:600;color:var(--cream);text-align:right;}
  .ctot{margin-top:6px;padding-top:6px;border-top:1px solid var(--gold);display:flex;justify-content:space-between;}
  .ctl{color:var(--gold);font-weight:600;}.ctv{color:var(--gold);font-weight:700;font-size:13px;}
  .cnote{margin-top:5px;font-size:9px;color:var(--gold-light);opacity:.8;font-style:italic;line-height:1.45;}
  .cclose{background:none;border:none;color:var(--gold-light);font-size:17px;line-height:1;cursor:pointer;padding:0 2px;}
  .cclose:hover{color:var(--cream);}
  @media (max-width:700px){.card{right:8px;left:8px;bottom:8px;width:auto;}}

  /* ── Footer ── */
  .fees{margin-top:14px;background:rgba(200,169,110,.07);border:1px solid var(--gb);border-radius:6px;padding:11px 14px;max-width:900px;margin-left:auto;margin-right:auto;
    display:flex;flex-wrap:wrap;gap:12px 16px;justify-content:center;}
  .fi{font-size:11px;}
  .fl{color:var(--gold);font-weight:600;display:block;margin-bottom:2px;font-size:11px;letter-spacing:.04em;}
  .fv{color:var(--cream);font-size:11px;line-height:1.6;}
  .fees input{width:44px;background:rgba(200,169,110,.14);border:1px solid var(--gold);border-radius:3px;color:var(--cream);padding:2px 4px;font-family:'Jost',sans-serif;font-size:12px;text-align:center;}
  .fsrc{flex:1 0 100%;text-align:center;font-size:10px;line-height:1.6;color:var(--gold-light);border-top:1px solid var(--gb);padding-top:9px;margin-top:1px;}
  .fsrc b{color:var(--gold);}
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
    .print-btn,.back-btn{margin-left:0;padding:6px 11px;font-size:11px;}
    .main{padding:8px;}
    .tab{padding:9px 11px;font-size:10px;}
    .toolbar{gap:5px;margin:8px auto 6px;}
    .tbtn{padding:6px 9px;font-size:10px;}
    .tbsep{display:none;}
    .scene{height:min(52vh,420px);min-height:300px;border-radius:8px;}
    .gwrap{padding:12px 10px;}
    .irow{grid-template-columns:52px 1fr;row-gap:4px;}
    .ivals{grid-column:1/-1;}
    .hint,.modelnote{font-size:9px;}
  }

  /* ── PRINT: the flat grids and the list, no JS needed ── */
  @media print {
    .no-print,.tabs,.card,.toolbar,.view3d,.hint,.modelnote{display:none!important;}
    *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important;}
    body{background:#fff!important;color:#1a1a1a!important;}
    .header{background:#fff!important;border-bottom:2px solid #c8540a!important;padding:10px 0;}
    .htxt h1{color:#1a2744!important;}
    .htxt p{color:#555!important;}
    .wview{display:block!important;break-before:page;}
    #wall-tgn{break-before:avoid!important;}
    #wall-overview{display:none!important;}
    body.pv-one .wview{display:none!important;}
    body.pv-one .wview.active{display:block!important;break-before:avoid!important;}
    body.pv-sel .wview{display:none!important;}
    body.pv-sel .wview.printsel{display:block!important;break-before:avoid!important;}
    body.has-printsel .printcard{display:block!important;border:2px solid #1a2744;border-radius:8px;
      padding:12px 16px;max-width:380px;margin:0 auto 14px;break-inside:avoid;font-size:11px;color:#1a1a1a;}
    .printcard .cclose{display:none!important;}
    .printcard .cardid{color:#1a2744!important;}
    .printcard .cardwall,.printcard .cardmis,.printcard .cl,.printcard .cnote{color:#444!important;}
    .printcard .cv{color:#111!important;}
    .printcard .cardst{color:#b02818!important;}
    .printcard .ctl,.printcard .ctv{color:#c8540a!important;}
    .printcard .ctot{border-top:1px solid #c8540a;}
    .printcard .cr{border-bottom:1px solid #ddd;}
    .wlabel{color:#1a2744!important;}
    .wsub,.li,.pfoot,.irights{color:#444!important;}
    .gwrap{background:#fff!important;border:1px solid #999!important;}
    .rlbl,.pfoot b,.fl{color:#1a2744!important;}
    .n{border-color:#00000030!important;}
    .irow{background:#fff!important;border-color:#999!important;color:#1a1a1a!important;}
    .idim{color:#555!important;}
    .n.sel,.irow.sel{outline:4px solid #c8540a!important;outline-offset:-2px;
      box-shadow:0 0 0 2px #1a2744!important;filter:none!important;transform:none!important;}
    .fees{background:#f5f5f2!important;border-color:#c8a96e!important;}
    .fv{color:#333!important;}
    .fees input{border:1px solid #999!important;background:#fff!important;color:#1a1a1a!important;}
    .fsrc{color:#444!important;border-top-color:#c8a96e!important;}
    .fsrc b{color:#1a2744!important;}
  }
`;

// ── Page runtime ──────────────────────────────────────────────────────────────
const CARD_META = Object.fromEntries([
  ...tgnNiches().map((n) => [n.ref, {
    title: n.ref,
    where: 'Niche Bank',
    sub: `Terrace Garden Memorial Path · Niche bank · Row ${n.row} · Niche ${n.n}`,
    price: sellable(n) ? n.price : null,
    rights: n.rights,
    st: n.st,
    dims: TGN.dim,
    depth: TGN.depth,
    dimNote: `Niche size carried from ${TGN.carriedFrom}; the Terrace Garden pricing sheet prints no niche dimensions.`,
  }]),
  ...TGMP_ITEMS.map((it) => [it.id, {
    title: it.id,
    where: 'Additional Property',
    sub: it.sheetLine,
    price: sellable(it) ? it.price : null,
    rights: it.rights,
    st: it.st,
    dims: it.dims,
    depth: null,
    dimNote: it.dimNote || null,
  }]),
]);

const JS = `
'use strict';
// ── Detail card + fee math ────────────────────────────────────────────────────
// The Terrace Garden Memorial Path pricing sheet prints a Sales Price and a Rights of
// Interment count and NOTHING else. The fee schedule applied below is the Mountain View
// Columbarium June-2026 schedule, applied to this whole area on the operator's ruling of
// ${FEE_SOURCE.confirmedOn}. It is NOT printed on this area's sheet, and the card says so.
// Applied exactly as the MVC page's Terrace Garden tab applied it: E.C.F. always, the
// three quantity fees only when the counselor turns them on, tax on inscription only.
//
// EVERYTHING BETWEEN THE TWO MARKERS IS EXTRACTED AND EXECUTED BY
// scripts/verify_tgmp_map.mjs, which anchors a full card computation against it. Keep
// this block free of anything that touches the DOM at load time.
// >>> FEE MATH >>>
var META = ${JSON.stringify(CARD_META)};
var STATUS_LABEL = ${JSON.stringify(STATUS_LABEL)};
var OC = ${FEES.OC}, REC = ${FEES.REC}, INSCR = ${FEES.INSCR}, TAX = ${FEES.TAX}, ECF_RATE = ${FEES.ECF_RATE};
var FEE_NOTE = 'E.C.F. is not included in the listed price. Fees are the ${FEE_SOURCE.schedule} schedule, applied to the Terrace Garden Memorial Path by ${FEE_SOURCE.confirmedBy} of ${FEE_SOURCE.confirmedOn} \\u2014 they are NOT printed on this area\\'s price sheet. Confirm current fees in MIS/Enterprise before writing.';
var fm = function (n) { return '$' + n.toLocaleString('en-US'); };
var ecf = function (p) { return Math.ceil(p * ECF_RATE); };
var qty = function (id) { var e = document.getElementById(id); return e ? (parseInt(e.value, 10) || 0) : 0; };

function cardHtml(ref) {
  var m = META[ref];
  if (!m) return '';
  var head = '<div class="cardhd"><span class="cardid">' + m.title + '</span>' +
    '<span class="cardwall">' + m.where + '</span>' +
    '<button class="cclose" type="button" aria-label="Close">\\u00d7</button></div>' +
    '<div class="cardmis">' + m.sub + '</div>';
  if (m.st !== 'available' || m.price === null) {
    return head + '<div class="cardst">' + (STATUS_LABEL[m.st] || m.st) + '</div>' +
      '<div class="cnote">Not available \\u2014 no pricing shown. Confirm in MIS/Enterprise.</div>';
  }
  var price = +m.price, e = ecf(price), tot = price + e;
  var rows = '<div class="cr"><span class="cl">Sales Price</span><span class="cv">' + fm(price) + '</span></div>';
  rows += '<div class="cr"><span class="cl">E.C.F. (10%)</span><span class="cv">' + fm(e) + '</span></div>';
  var oc = qty('oc-qty'), rc = qty('rec-qty'), iq = qty('inscr-qty');
  if (oc > 0) { rows += '<div class="cr"><span class="cl">O&amp;C \\u00d7' + oc + '</span><span class="cv">' + fm(OC * oc) + '</span></div>'; tot += OC * oc; }
  if (rc > 0) { rows += '<div class="cr"><span class="cl">Recording \\u00d7' + rc + '</span><span class="cv">' + fm(REC * rc) + '</span></div>'; tot += REC * rc; }
  if (iq > 0) {
    var sub = INSCR * iq, tx = Math.round(sub * TAX * 100) / 100;
    rows += '<div class="cr"><span class="cl">Inscription \\u00d7' + iq + '</span><span class="cv">' + fm(sub) + '</span></div>';
    rows += '<div class="cr"><span class="cl">Sales Tax (10.4%)</span><span class="cv">$' + tx.toFixed(2) + '</span></div>';
    tot += sub + tx;
  }
  rows += '<div class="cr"><span class="cl">Rights of Interment</span><span class="cv">' + m.rights + '</span></div>';
  if (m.dims) rows += '<div class="cr"><span class="cl">Dimensions</span><span class="cv">' + m.dims + '</span></div>';
  if (m.depth) rows += '<div class="cr"><span class="cl">Depth</span><span class="cv">' + m.depth + '</span></div>';
  var note = m.dimNote ? m.dimNote + ' ' + FEE_NOTE : FEE_NOTE;
  return head + rows +
    '<div class="ctot"><span class="ctl">Est. Total</span><span class="ctv">' + fm(Math.round(tot)) + '</span></div>' +
    '<div class="cnote">' + note + '</div>';
}
// <<< FEE MATH <<<

var card = document.getElementById('card');
var pinned = null;

function refOfEl(el) { return el.getAttribute('data-ref'); }

function clearSel() {
  var s = document.querySelectorAll('.sel');
  for (var i = 0; i < s.length; i++) s[i].classList.remove('sel');
}
function markSel(el) {
  clearSel();
  var r = refOfEl(el);
  var all = document.querySelectorAll('[data-ref="' + r + '"]');
  for (var i = 0; i < all.length; i++) if (!all[i].closest('.mini')) all[i].classList.add('sel');
}

// A property is rendered twice. After a tab switch the pinned property's OWN element may
// be inside a display:none view, where getBoundingClientRect() is all zeros — and a card
// placed against a zero rect lands at the top-left corner, on top of the tab bar, where
// (being pinned, and therefore pointer-events:auto) it swallowed the clicks meant for
// the tabs. Found 2026-07-31 by driving the GOMN page; the same code lived here. So:
// always place against whichever rendering of this ref is actually laid out (skipping
// the non-interactive minis), and if none is, park the card in its default bottom-right
// corner rather than over the chrome.
function visibleTwin(el) {
  var ref = refOfEl(el);
  if (!ref) return el;
  var all = document.querySelectorAll('[data-ref="' + ref + '"]');
  for (var i = 0; i < all.length; i++) {
    if (all[i].closest('.mini')) continue;
    var b = all[i].getBoundingClientRect();
    if (b.width > 0 && b.height > 0) return all[i];
  }
  return null;
}

function placeCard(el) {
  if (window.matchMedia('(max-width:700px)').matches) {
    card.style.left = card.style.top = card.style.right = card.style.bottom = '';
    return;
  }
  var t = visibleTwin(el);
  if (!t) { card.style.left = card.style.top = card.style.right = card.style.bottom = ''; return; }
  var r = t.getBoundingClientRect();
  card.style.right = 'auto'; card.style.bottom = 'auto';
  var cw = card.offsetWidth || 290, ch = card.offsetHeight || 220;
  var x = r.right + 14, y = r.top + r.height / 2 - ch / 2;
  if (x + cw > window.innerWidth - 8) x = r.left - cw - 14;
  if (x < 8) x = Math.min(Math.max(8, r.right + 14), window.innerWidth - cw - 8);
  y = Math.max(8, Math.min(y, window.innerHeight - ch - 8));
  card.style.left = x + 'px'; card.style.top = y + 'px';
}

function setPrintCard(ref) {
  document.getElementById('printcard').innerHTML = cardHtml(ref);
  document.body.classList.add('has-printsel');
  var old = document.querySelectorAll('.wview.printsel');
  for (var i = 0; i < old.length; i++) old[i].classList.remove('printsel');
  var wv = document.getElementById(META[ref] && META[ref].where === 'Niche Bank' ? 'wall-tgn' : 'wall-props');
  if (wv) { wv.classList.add('printsel'); document.body.classList.add('pv-sel'); }
}
function showCard(el, pin) {
  var ref = refOfEl(el);
  if (!ref) return;
  card.innerHTML = cardHtml(ref);
  card.classList.add('show');
  placeCard(el);
  if (pin) { pinned = el; markSel(el); }
  card.classList.toggle('pinned', pinned === el);
  if (pinned === el) setPrintCard(ref);
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

var SEL = '.n, .n3, .o3, .irow';
document.addEventListener('click', function (ev) {
  if (ev.target.closest('.cclose')) { hideCard(); return; }
  var n = ev.target.closest(SEL);
  if (n && n.hasAttribute('data-ref') && !n.closest('.mini')) { showCard(n, true); return; }
  // Clicking the chrome must not drop the selection. '.fees' is in this list because
  // without it, clicking into a quantity box unpins the very card the box is meant to
  // update — the input listener then sees pinned === null and does nothing. (The old
  // MVC page had exactly that defect; its live re-render was unreachable with a mouse.)
  if (!ev.target.closest('#card, .tab, .tbtn, .fees')) hideCard();
});
document.addEventListener('mouseover', function (ev) {
  if (window.matchMedia('(hover: none)').matches) return;
  if (last) return; // mid-drag: sweeping across objects must not hover-pop them
  var n = ev.target.closest(SEL);
  if (n && n.hasAttribute('data-ref') && !n.closest('.mini')) showCard(n, false);
  else if (pinned) showCard(pinned, false);
});
document.addEventListener('focusin', function (ev) {
  var n = ev.target.closest(SEL);
  if (!n || !n.hasAttribute('data-ref')) return;
  var kb = true;
  try { kb = n.matches(':focus-visible'); } catch (e) { kb = true; }
  if (kb) showCard(n, true);
});
document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') hideCard(); });

// ── Tabs ──────────────────────────────────────────────────────────────────────
var FLATS = ['tgn', 'props'];
function showView(v) {
  var views = document.querySelectorAll('.wview, .view3d');
  for (var i = 0; i < views.length; i++) views[i].classList.remove('active');
  var el = document.getElementById(v === '3d' ? 'view-3d' : 'wall-' + v);
  if (el) el.classList.add('active');
  var tabs = document.querySelectorAll('.tabs .tab');
  for (var j = 0; j < tabs.length; j++) tabs[j].classList.toggle('active', tabs[j].getAttribute('data-view') === v);
  document.body.classList.toggle('pv-one', FLATS.indexOf(v) > -1);
  if (v === '3d') fitScene();
}
document.querySelectorAll('.tabs .tab').forEach(function (t) {
  t.addEventListener('click', function () { showView(t.getAttribute('data-view')); });
});

// ── 3D camera ─────────────────────────────────────────────────────────────────
// Same clamps, deferred pointer capture and tap detector as the MVC/ROAC/ECL pages.
// This scene is WIDE and its subjects are off-centre, so a preset also PANS: the
// target point is rotated by the current yaw/pitch and then translated to the middle
// of the viewport. Stage y = 0 is the ground plane; up is negative.
var scene = document.getElementById('scene'), stage = document.getElementById('stage');
var cam = { yaw: -30, pitch: -22, zoom: 1, panx: 0, pany: 0 };
var ZMIN = 0.05, ZMAX = 3.2, PMIN = -90, PMAX = 0;
var RAD = Math.PI / 180, PERSP = 2200;
var clamp = function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; };

function apply() {
  cam.pitch = clamp(cam.pitch, PMIN, PMAX);
  cam.zoom = clamp(cam.zoom, ZMIN, ZMAX);
  stage.style.setProperty('--yaw', cam.yaw.toFixed(2) + 'deg');
  stage.style.setProperty('--pitch', cam.pitch.toFixed(2) + 'deg');
  stage.style.setProperty('--zoom', cam.zoom.toFixed(4));
  stage.style.setProperty('--panx', cam.panx.toFixed(1) + 'px');
  stage.style.setProperty('--pany', cam.pany.toFixed(1) + 'px');
  document.querySelectorAll('[data-viewbtn]').forEach(function (b) {
    b.classList.toggle('on', b.getAttribute('data-viewbtn') === curPreset);
  });
}

// Rotate a stage-space point by the camera and return {x,y,z} in pre-zoom pixels.
function project(t, yaw, pitch) {
  var cy = Math.cos(yaw * RAD), sy = Math.sin(yaw * RAD);
  var cp = Math.cos(pitch * RAD), sp = Math.sin(pitch * RAD);
  var x1 = t[0] * cy + t[2] * sy, z1 = -t[0] * sy + t[2] * cy;
  return { x: x1, y: t[1] * cp - z1 * sp, z: t[1] * sp + z1 * cp };
}

var curPreset = null;
var VIEWS = __VIEWS__;
function viewTo(k, quiet) {
  if (!pinned && !quiet) card.classList.remove('show');
  var v = VIEWS[k];
  curPreset = k;
  cam.yaw = v.yaw;
  cam.pitch = v.pitch;
  var p = project(v.t, v.yaw, v.pitch);
  // Exact perspective fit: displayed size = real * z * P/(P - dist*z), so the zoom that
  // hits a target T is z = T*P / (real*P + T*dist).
  var Tw = scene.clientWidth * 0.88, Th = scene.clientHeight * 0.80;
  var zw = (Tw * PERSP) / (v.w * PERSP + Tw * p.z);
  var zh = (Th * PERSP) / (v.h * PERSP + Th * p.z);
  // A target that rotates FAR BEHIND the stage origin — the niche bank does, because it
  // stands at one end of a 58-foot strip and its preset turns the strip end-on — can be
  // unreachable: zooming in also pushes it further away, so past a point the apparent
  // size stops growing and the solve returns a negative or infinite root. Take the
  // largest zoom we are allowed instead of the nonsense one, and let the pan below do
  // the centring. Without this the bank preset silently clamped to ZMIN and showed the
  // whole cemetery from orbit.
  var z = Math.min(zw, zh);
  if (!isFinite(z) || z <= 0) z = ZMAX;
  cam.zoom = clamp(z, ZMIN, ZMAX);
  // Perspective scales the on-screen offset of an off-centre target too.
  var k2 = PERSP / (PERSP - p.z * cam.zoom);
  cam.panx = -p.x * cam.zoom * k2;
  cam.pany = -p.y * cam.zoom * k2;
  apply();
  if (v.fit) refit(v.fit);
}

// The closed-form solve above assumes the target sits near the stage origin. The niche
// bank does not: it stands at one end of a 58-foot strip, and its preset turns that
// strip end-on, so the target lands ~1,650 stage-pixels behind the origin where the
// solve returns a negative root and the pan lands the wall off the top of the frame.
// For those presets, MEASURE the thing and correct — two passes converge, and it cannot
// be wrong about where the element actually ended up because it is reading the element.
function refit(sel) {
  var el = document.querySelector(sel);
  if (!el) return;
  for (var i = 0; i < 3; i++) {
    var s = scene.getBoundingClientRect(), r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    cam.zoom = clamp(cam.zoom * Math.min(s.width * 0.86 / r.width, s.height * 0.80 / r.height), ZMIN, ZMAX);
    apply();
    s = scene.getBoundingClientRect(); r = el.getBoundingClientRect();
    cam.panx += (s.left + s.width / 2) - (r.left + r.width / 2);
    cam.pany += (s.top + s.height / 2) - (r.top + r.height / 2);
    apply();
  }
}
function fitScene() { if (scene.offsetWidth) viewTo(curPreset || 'path', true); }
window.addEventListener('resize', fitScene);

document.querySelectorAll('[data-viewbtn]').forEach(function (b) {
  b.addEventListener('click', function () {
    var k = b.getAttribute('data-viewbtn');
    viewTo(curPreset === k && k !== 'path' ? 'path' : k);
  });
});
document.getElementById('btn-reset').addEventListener('click', function () { viewTo('path'); });
document.getElementById('btn-in').addEventListener('click', function () { cam.zoom *= 1.25; apply(); });
document.getElementById('btn-out').addEventListener('click', function () { cam.zoom /= 1.25; apply(); });

// Drag to orbit / pinch to zoom. Capture is DEFERRED until a real drag (>8px) or a
// second finger — capturing on pointerdown retargets the click to the scene and a tap
// on an object never reaches the button (the MVC page's tap bug, MISTAKES #18).
var pts = {}, last = null, pinchStart = 0, zoomStart = 1, moved = 0, captured = false;
var downObj = null, downAt = 0;
function capturePts() {
  if (captured) return;
  captured = true;
  scene.classList.add('dragging');
  curPreset = null;
  if (!pinned) card.classList.remove('show');
  Object.keys(pts).forEach(function (id) {
    try { scene.setPointerCapture(+id); } catch (e) { /* pointer already gone */ }
  });
}
scene.addEventListener('pointerdown', function (ev) {
  if (Object.keys(pts).length === 0) {
    var n = ev.target.closest('.n3, .o3');
    downObj = (n && n.hasAttribute('data-ref')) ? n : null;
    downAt = performance.now();
  } else {
    downObj = null; // a second finger means pinch, never a tap
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
var suppressUntil = 0;
function endPtr(ev) {
  delete pts[ev.pointerId];
  if (!Object.keys(pts).length) {
    suppressUntil = performance.now() + 450;
    if (ev.type === 'pointerup' && downObj && moved <= 8 && performance.now() - downAt < 700) {
      showCard(downObj, true);
    } else if (ev.type === 'pointerup' && !downObj && moved <= 8 && !ev.target.closest('#card')) {
      hideCard();
    }
    downObj = null;
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

// ── Fee quantities ────────────────────────────────────────────────────────────
// All three default to 0, so a card opens showing price + E.C.F. and nothing else —
// the counselor turns on what the family is actually buying. Changing a quantity
// re-renders the pinned card, and showCard() re-renders the print card with it, so the
// printout can never disagree with the screen.
['oc-qty', 'rec-qty', 'inscr-qty'].forEach(function (id) {
  var e = document.getElementById(id);
  if (e) e.addEventListener('input', function () { if (pinned) showCard(pinned, false); });
});

fitScene();
apply();
`;

// ── Camera presets (computed here so the page carries plain numbers) ──────────
const ITEM_X = TGMP_ITEMS.map((i) => i.x);
const PROPS_CX = (Math.min(...ITEM_X) + Math.max(...ITEM_X)) / 2;
const PROPS_W = Math.max(...ITEM_X) - Math.min(...ITEM_X) + 90;
const PROPS_H = Math.max(...TGMP_ITEMS.map((i) => i.h)) + 30;
// Walk-through stops. Yaw -90 turns the strip's long axis toward the camera, so you are
// looking BACK UP the path at the niche bank; yaw +90 turns you round to look down it.
// Pitch near level and a tight fit box put the eye roughly where a visitor's would be.
const EYE = -62;                                       // eye height above the walk
const WALK_W = GEO.terraceD + 40, WALK_H = 132;        // what one stop frames
// `t` is the point the camera centres on, in STAGE PIXELS (ground plane y = 0, up is
// negative) — the same units as `w`/`h`, which is what the fit solve mixes them with.
// The first cut left `t` in inches while w/h were px; the page then centred on a point
// five times too close to the origin.
const V = (yaw, pitch, t, w, h, extra) => ({ yaw, pitch, t: t.map(px), w: px(w), h: px(h), ...(extra || {}) });
const VIEWS = {
  // Three-quarter view of the whole terrace.
  path: V(-30, -22, [0, -30, 0],
    GEO.terraceW * Math.cos(30 * Math.PI / 180) + GEO.terraceD * Math.sin(30 * Math.PI / 180),
    GEO.terraceD * Math.sin(22 * Math.PI / 180) + BANK_H * Math.cos(22 * Math.PI / 180) + 60),
  // The niche bank, face on. Its face now points down +x, so the camera turns with it.
  bank: V(-90, -3, [GEO.bankX + GEO.bankT / 2, -BANK_H / 2, GEO.bankZ], BANK_W + 20, BANK_H + 20, { fit: '.bankface' }),
  // Along the row of additional properties.
  props: V(0, -10, [PROPS_CX, -PROPS_H / 2, GEO.pathZ], PROPS_W, PROPS_H + 40),
  // Down on the terrace. -80 rather than -88: at 2 degrees off vertical the seven-foot
  // niche bank leans right out over the kerb and reads as if it stood outside the
  // garden, which is a projection artefact and not where it is.
  over: V(0, -80, [0, 0, 0], GEO.terraceW + 40, GEO.terraceD + 60),
  // Two walk-through stops, both at eye height on the walk itself, both facing the
  // niche bank across the far end — you advance up the path from the turn-around.
  //
  // They face the SAME way on purpose. A stop looking the other way, down the path from
  // the apron, puts the seven-foot niche bank behind the camera, and CSS 3D has no near
  // clipping: the wall is still drawn, back-first, magnified by the perspective divide
  // because it is nearer the eye than anything else. Every attempt at that view was
  // either a purple wall across the lower third of the frame or, once the zoom was
  // raised far enough to push the wall past the perspective plane, an empty sky.
  stand: V(-90, -4, [GEO.headX - 40, EYE, GEO.pathZ], WALK_W, WALK_H),
  midpath: V(-90, -4, [0, EYE, GEO.pathZ], WALK_W, WALK_H),
};

// ── Assemble ──────────────────────────────────────────────────────────────────
const LOGO = fs.readFileSync(path.join(ROOT, 'scripts', 'bw-logo.svg.txt'), 'utf8').trim();
const ALL = allProperties();
const N_TOTAL = ALL.length;
const N_AVAIL = ALL.filter(sellable).length;
const RIGHTS_TOTAL = ALL.filter(sellable).reduce((a, x) => a + x.rights, 0);
const AVAIL_TOTAL = TGN_TOTAL + ITEM_TOTAL;

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bonney Watson — Terrace Garden Memorial Path</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
<!-- Generated by scripts/build_tgmp_map.mjs from scripts/tgmp-data.mjs. Do not hand-edit. -->
<style>${CSS}</style>
</head>
<body>
<div class="header">
  ${LOGO}
  <div class="htxt">
    <h1>Terrace Garden Memorial Path — Property Map</h1>
    <p>Washington Memorial Park &nbsp;·&nbsp; niche bank &amp; cremation properties &nbsp;·&nbsp; layout estimated from photographs</p>
  </div>
  <a class="back-btn no-print" href="../">&larr; Quote Tool</a>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
</div>
<div class="tabs">
  <button class="tab active" data-view="3d">3D View</button>
  <button class="tab" data-view="tgn">Niche Bank (TGN)</button>
  <button class="tab" data-view="props">Cremation Properties</button>
  <button class="tab" data-view="overview" style="margin-left:auto;border-left:1px solid var(--gb);">Overview</button>
</div>
<div class="main">
  <div class="printcard" id="printcard" aria-hidden="true"></div>

  <div class="view3d active" id="view-3d">
    <div class="toolbar no-print">
      <button class="tbtn" data-viewbtn="path" title="Three-quarter view of the whole terrace">Path view</button>
      <button class="tbtn" data-viewbtn="bank" title="The Terrace Garden niche bank, face on">Niche bank</button>
      <button class="tbtn" data-viewbtn="props" title="Along the row of additional cremation properties">Along the path</button>
      <button class="tbtn" data-viewbtn="over" title="Straight down on the terrace">Overhead</button>
      <div class="tbsep"></div>
      <button class="tbtn" data-viewbtn="stand" title="Standing at the turn-around, looking up the path at the niche bank">Walk: turn-around</button>
      <button class="tbtn" data-viewbtn="midpath" title="Half way up the path, looking at the niche bank">Walk: half way</button>
      <div class="tbsep"></div>
      <button class="tbtn" id="btn-reset">Reset view</button>
      <div class="tbsep"></div>
      <button class="tbtn" id="btn-out" aria-label="Zoom out">&minus;</button>
      <button class="tbtn" id="btn-in" aria-label="Zoom in">+</button>
    </div>
${scene3d()}
    <div class="hint">Drag to orbit &nbsp;·&nbsp; scroll or pinch to zoom &nbsp;·&nbsp; tap the niche bank or any property to select it &nbsp;·&nbsp; arrow keys orbit, +/&minus; zoom</div>
    <div class="modelnote">${TGN.cols * TGN.rows.length} niches in the bank plus ${TGMP_ITEMS.length} additional cremation properties, ${N_AVAIL} of ${N_TOTAL} available &nbsp;·&nbsp; the kerb wall and the planters are context and are not priced here &nbsp;·&nbsp; <b>object placement along the path is approximate</b> and the terrace proportions are estimated from photographs</div>
    <div class="legend">${legendHtml(TIERS.map((t) => t.p))}</div>
    ${STATUS_LEG}
  </div>

${bankView()}
${itemsView()}
${overviewView()}

  <div class="fees">
    <div class="fi"><span class="fl">Inurnment O&amp;C — ${money(FEES.OC)} ea</span>
      <span class="fv">Qty: <input type="number" id="oc-qty" min="0" max="${FEES.QTY_MAX}" value="0" aria-label="Opening and closing quantity"></span></div>
    <div class="fi"><span class="fl">Recording Fee — ${money(FEES.REC)} ea</span>
      <span class="fv">Qty: <input type="number" id="rec-qty" min="0" max="${FEES.QTY_MAX}" value="0" aria-label="Recording fee quantity"></span></div>
    <div class="fi"><span class="fl">Inscription — ${money(FEES.INSCR)} ea (taxable)</span>
      <span class="fv">Qty: <input type="number" id="inscr-qty" min="0" max="${FEES.QTY_MAX}" value="0" aria-label="Inscription quantity"></span></div>
    <div class="fi"><span class="fl">E.C.F.</span>
      <span class="fv">${FEES.ECF_RATE * 100}% of the sales price — not included in the listed prices</span></div>
    <div class="fi"><span class="fl">Sales Tax</span>
      <span class="fv">${(FEES.TAX * 100).toFixed(1)}% — applies to the inscription only (taxable merchandise)</span></div>
    <div class="fsrc">These fees are <b>not printed on the Terrace Garden Memorial Path price sheet</b>, which states a sales price and a rights-of-interment count and nothing else.
      They are the <b>${FEE_SOURCE.schedule}</b> schedule, applied to this whole area — the niche bank and the nine additional properties alike — by <b>${FEE_SOURCE.confirmedBy} of ${FEE_SOURCE.confirmedOn}</b>.
      Confirm current fees in MIS/Enterprise before writing.</div>
  </div>
  <div class="pfoot">
    <b>Niche bank: row A is the bottom row, row E the top; niches are numbered 1–${TGN.cols} left to right. References read TGN-&lt;row&gt;-&lt;n&gt;.</b><br>
    Additional properties are numbered TGMP-1 … TGMP-${TGMP_ITEMS.length} in the order the pricing sheet prints them; their dimensions are the sheet's own catalog dimensions.<br>
    ${money(AVAIL_TOTAL)} available at list across ${N_AVAIL} properties, ${RIGHTS_TOTAL} rights of interment — sales prices only, E.C.F. and fees are additional. Availability shown is maintained by hand — always confirm current status in MIS/Enterprise before writing.<br>
    <b>There is no reflection pool.</b> The path replaced it, and the ossuary block beside it, in full; both were drawn on the older &ldquo;what was replaced&rdquo; layout sketch and appear in neither the PHASE 2 render nor any 2026 site photograph. Terrace Garden Ossuary scattering is priced on the separate Scattering Garden sheet and is not priced here.<br>
    Layout — the walk, its round turn-around, the paved apron, the beds either side and which object stands where — is read off the official PHASE 2 overhead render and the June/July 2026 photographs. Every <i>number</i> is an estimate: there is no site plan. The render draws the beds as turf; the built garden is bark mulch, and the model follows the photographs. <b>The niche bank&rsquo;s position across the far end is estimated</b> — the render floats it over the garden as a callout rather than showing it in place.
  </div>
</div><!-- /main -->

<aside class="card no-print" id="card" role="dialog" aria-live="polite" aria-label="Property detail"></aside>

<script>
${JS.replace('__VIEWS__', JSON.stringify(VIEWS))}
</script>
</body>
</html>
`;

// A placeholder that survives into the page is a ReferenceError at load, and the page
// would still render its flat grids — i.e. it would look fine and the 3D view would be
// dead. Refuse to write it. (This happened once: the token was interpolated without its
// quotes, the replace matched nothing, and every camera preset was silently inert.)
if (HTML.includes('__VIEWS__')) throw new Error('camera presets were not substituted into the page runtime');

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, HTML.replace(/\r?\n/g, '\r\n'), 'utf8');
console.log(`wrote ${path.relative(ROOT, OUT)} — ${(fs.statSync(OUT).size / 1024).toFixed(1)} KB, ` +
  `${TGN.cols * TGN.rows.length} TGN niches + ${TGMP_ITEMS.length} TGMP properties (${N_AVAIL} available, ${money(AVAIL_TOTAL)} at list)`);
