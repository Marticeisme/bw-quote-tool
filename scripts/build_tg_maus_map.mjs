/**
 * Generates MAPS/TG_Mausoleum_Map.html from scripts/tg-maus-data.mjs.
 *
 * Same architecture as build_com_map.mjs / build_ecl_map.mjs / build_gomn_map.mjs:
 * data module -> build script -> verification with sabotages. Never hand-edit the HTML.
 *
 *   node scripts/build_tg_maus_map.mjs
 *
 * ── THE 3D VIEW (added 2026-08-04) ───────────────────────────────────────────
 * This page originally shipped plan-only, and the note here argued that a whole building
 * is a plan-view question. That argument was made without having watched the building.
 * The 2026-08-03 walk-through settles what a plan cannot say: this is an OUTDOOR COURT,
 * the two wings face each other across it under long overhanging eaves, and the walkway
 * in front of the banks stands a step ABOVE the courtyard floor. A family standing in
 * that court sees walls and a sky-lit gap, not a floor plan. So the page now carries a
 * 3D view built the same way MAPS/ELM_CryptMap.html builds its — CSS-3D extruded blocks
 * from the one dataset, kind by hue, confidence by hatch, camera feel from
 * scripts/map-movement.mjs.
 *
 * The plan and the bank list are UNCHANGED and are still the print path. The 3D view is
 * an addition; nothing renders that the plan did not already render.
 *
 * WHAT THE 3D VIEW IS NOT ALLOWED TO INVENT: the footprints are still the cemetery's own
 * overview, untouched. The only NEW numbers are heights, they all live in ELEV in the
 * dataset with the footage timestamps that produced them, and not one of them is ever
 * printed on the page — they feed a CSS transform and nothing else.
 *
 * ── NO NUMBERS ───────────────────────────────────────────────────────────────
 * This ship renders no price, no status and no inventory count. That is not an oversight
 * to be tidied up by whoever reads this next: none of those figures is sourced for this
 * building yet, and a plausible-looking number in front of a family is worse than none.
 * Every selectable position renders the ASK wording instead.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SITE, GEO, WINGS, TANDEM, STRUCTURES, ROOFS, COURTYARD,
  CRYPT_KINDS, ASK, ASK_CHIP, STATUS_STYLE, allPositions,
  ELEV, CONF_LABEL, MATERIAL, blocks3d,
} from './tg-maus-data.mjs';
import { movementRuntime } from './map-movement.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'MAPS', 'TG_Mausoleum_Map.html');
const LOGO = fs.readFileSync(path.join(ROOT, 'scripts', 'bw-logo.svg.txt'), 'utf8').trim();

// Pixels per foot. 3.4 puts the 240 ft building at 816 px, which is the widest a plan can
// be and still fit a laptop without horizontal scrolling, and leaves the narrowest wing
// bank (the East Wing's 88/15 ft) about 20 px — enough for a two-digit number.
const PPF = 3.4;
const px = (v) => +(v * PPF).toFixed(2);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const PAD = 14;                                    // ft of apron drawn around the building
const PLAN_W = SITE.w + PAD * 2;
const PLAN_D = SITE.d + PAD * 2;
// Plan-space -> stage pixels. Origin is the building centre, so shift by half the plan.
const L = (x, w) => px(x - w / 2 + PLAN_W / 2);
const T = (y, d) => px(y - d / 2 + PLAN_D / 2);
const box = (o) => `left:${L(o.x, o.w)}px;top:${T(o.y, o.d)}px;width:${px(o.w)}px;height:${px(o.d)}px`;

// ── Plan pieces ──────────────────────────────────────────────────────────────
function bankBtn(b) {
  // Two data attributes carry the empty slots explicitly, as empty strings. A later load
  // fills them; a gate asserts they are empty today. An ABSENT attribute would be
  // indistinguishable from one that got dropped by an edit.
  return `      <button type="button" class="bk" style="${box(b)}"` +
    ` data-ref="${b.ref}" data-wing="${b.wing}" data-n="${b.n}" data-kind="bank"` +
    ` data-price="" data-status=""` +
    ` aria-label="${esc(`${b.ref}, ${b.wingLabel} bank ${b.n}, ${ASK_CHIP}`)}">` +
    `<span class="bkn">${b.n}</span></button>`;
}

function tandemBtn() {
  return `      <button type="button" class="bk tandem" style="${box(TANDEM)}"` +
    ` data-ref="${TANDEM.ref}" data-kind="tandem" data-price="" data-status=""` +
    ` aria-label="${esc(`${TANDEM.label}, ${TANDEM.sub}, ${ASK_CHIP}`)}">` +
    `<span class="bkl">${esc(TANDEM.label.toUpperCase())} &nbsp;·&nbsp; ${esc(TANDEM.sub)}</span></button>`;
}

const structDiv = (s) => `      <div class="ctx st-${s.kind}" style="${box(s)}" aria-hidden="true">` +
  `<span class="ctxl">${esc(s.label)}${s.note ? `<i>${esc(s.note)}</i>` : ''}</span></div>`;

const roofDiv = (r) => `      <div class="ctx roof" style="${box(r)}" aria-hidden="true">` +
  '<span class="roofl">COVERED WALKWAY</span></div>';

function courtyardLink() {
  return `      <a class="court" href="${COURTYARD.href}" style="${box(COURTYARD)}"` +
    ` aria-label="Open the ${esc(COURTYARD.label)} map">` +
    `<span class="courtt">${esc(COURTYARD.label)}</span>` +
    '<span class="courtc">Open this map &rarr;</span></a>';
}

function plan() {
  return `<div class="planwrap">
  <div class="plan" style="width:${px(PLAN_W)}px;height:${px(PLAN_D)}px">
      <div class="outline" style="${box({ x: 0, y: 0, w: SITE.w, d: SITE.d })}" aria-hidden="true"></div>
${ROOFS.map(roofDiv).join('\n')}
${STRUCTURES.map(structDiv).join('\n')}
${courtyardLink()}
${WINGS.flatMap((w) => w.banks).map(bankBtn).join('\n')}
${tandemBtn()}
      <div class="wingl wl-w" aria-hidden="true">WEST WING &nbsp;·&nbsp; ${WINGS[0].numbers[0]}&ndash;${WINGS[0].numbers[WINGS[0].numbers.length - 1]}</div>
      <div class="wingl wl-e" aria-hidden="true">EAST WING &nbsp;·&nbsp; ${WINGS[1].numbers[0]}&ndash;${WINGS[1].numbers[WINGS[1].numbers.length - 1]}</div>
      <div class="compass" aria-hidden="true"><b>N</b></div>
  </div>
</div>`;
}

// ── 3D scene ─────────────────────────────────────────────────────────────────
// Same idiom as build_elm_map.mjs: one extruded slab per block, a hit target floating a
// hair above each selectable one, and the courtyard as a click-through link zone on the
// ground. Plan `y` (south) becomes scene `z`; the ground plane is the WALKWAY level, and
// the courtyard floor sits one step below it, which is what the footage shows.
const BLOCKS = blocks3d();
const SITE_W_PX = px(PLAN_W), SITE_D_PX = px(PLAN_D);
const MAX_TOP = Math.max(...BLOCKS.map((b) => b.top));

/** Four sides and a top. `top` is the block's upper surface; `h` is how deep it extrudes. */
function slab(b) {
  const cls = `k-${b.kind} c-${b.conf}`;
  const mid = b.top - b.h / 2;
  const parts = [];
  // The top face carries the label a reader needs from directly above. For a numbered
  // bank that is the NUMBER, exactly as the plan draws it — the full TGM-W-13 reference
  // does not fit a bank that narrow and truncates to "GM-W", which reads as a different
  // reference rather than as a clipped one.
  const lbl = b.kind === 'bank' ? String(b.n) : b.ref || b.label;
  parts.push(`      <div class="face top ${cls}" data-blk="${b.id}" style="width:${px(b.w)}px;height:${px(b.d)}px;` +
    `transform:translate(-50%,-50%) translate3d(${px(b.x)}px,${px(-b.top)}px,${px(b.y)}px) rotateX(90deg)">` +
    `<span class="slabl${b.kind === 'bank' ? ' slabn' : ''}">${esc(lbl)}</span></div>`);
  for (const [sz, ry] of [[1, 0], [-1, 180]]) {
    parts.push(`      <div class="face side ${cls}" data-blk="${b.id}" style="width:${px(b.w)}px;height:${px(b.h)}px;` +
      `transform:translate(-50%,-50%) translate3d(${px(b.x)}px,${px(-mid)}px,${px(b.y + (sz * b.d) / 2)}px) rotateY(${ry}deg)"></div>`);
  }
  for (const [sx, ry] of [[1, 90], [-1, -90]]) {
    parts.push(`      <div class="face side ${cls}" data-blk="${b.id}" style="width:${px(b.d)}px;height:${px(b.h)}px;` +
      `transform:translate(-50%,-50%) translate3d(${px(b.x + (sx * b.w) / 2)}px,${px(-mid)}px,${px(b.y)}px) rotateY(${ry}deg)"></div>`);
  }
  return parts.join('\n');
}

/**
 * The hit target. Only a bank or the tandem run gets one — a family room, the ossuary,
 * the walkway roof and the joint to the building next door are context and must not look
 * purchasable. The empty price and status slots ride along exactly as they do on the
 * plan, so a later load fills all three renderings at once and the check that they are
 * empty covers all three too.
 */
function hit3d(b) {
  if (!b.sel) return '';
  const aria = b.kind === 'tandem'
    ? `${TANDEM.label}, ${TANDEM.sub}, ${ASK_CHIP}`
    : `${b.ref}, ${b.label}, ${ASK_CHIP}`;
  const wing = b.wing ? ` data-wing="${b.wing}"` : '';
  const n = b.n ? ` data-n="${b.n}"` : '';
  return `      <button type="button" class="hit h-${b.kind}" data-ref="${b.ref}"${wing}${n}` +
    ` data-kind="${b.kind === 'tandem' ? 'tandem' : 'bank'}" data-price="" data-status=""` +
    ` style="width:${px(b.w)}px;height:${px(b.d)}px;` +
    `transform:translate(-50%,-50%) translate3d(${px(b.x)}px,${px(-b.top - 0.25)}px,${px(b.y)}px) rotateX(90deg)"` +
    ` aria-label="${esc(aria)}"><span class="hitl">${esc(b.ref)}</span></button>`;
}

/** The courtyard: a floor plate one step down, and the click-through link zone on it. */
function court3d() {
  const y = COURTYARD.drop;
  return `      <div class="face court c-${COURTYARD.conf}" aria-hidden="true" style="width:${px(COURTYARD.w)}px;height:${px(COURTYARD.d)}px;` +
    `transform:translate(-50%,-50%) translate3d(${px(COURTYARD.x)}px,${px(y)}px,${px(COURTYARD.y)}px) rotateX(-90deg)"></div>
      <a class="hit h-court" href="${esc(COURTYARD.href)}" style="width:${px(COURTYARD.w)}px;height:${px(COURTYARD.d)}px;` +
    `transform:translate(-50%,-50%) translate3d(${px(COURTYARD.x)}px,${px(y - 0.25)}px,${px(COURTYARD.y)}px) rotateX(90deg)"` +
    ` aria-label="Open the ${esc(COURTYARD.label)} map"><span class="hitl"><b>${esc(COURTYARD.label)}</b>Open this map &rarr;</span></a>`;
}

function scene3d() {
  return `<div class="scene" id="scene" tabindex="0" role="application" aria-label="Three-dimensional view of the Terrace Garden Mausoleum. Use the view buttons below, or the arrow keys, to change the view.">
  <div class="stage" id="stage">
    <div class="yard">
      <div class="ground" style="width:${SITE_W_PX}px;height:${SITE_D_PX}px;transform:translate(-50%,-50%) translate3d(0,${px(ELEV.plinth)}px,0) rotateX(90deg)">
        <span class="fcomp fc-n">NORTH</span>
        <span class="fcomp fc-s">SOUTH</span>
      </div>
${court3d()}
${BLOCKS.map(slab).join('\n')}
${BLOCKS.map(hit3d).filter(Boolean).join('\n')}
    </div>
  </div>
</div>`;
}

const LEGEND3D = `<div class="legend3d">
      <div class="li"><div class="ls k-bank"></div><span>Crypt banks</span></div>
      <div class="li"><div class="ls k-tandem"></div><span>Tandem crypts</span></div>
      <div class="li"><div class="ls k-room"></div><span>Family rooms</span></div>
      <div class="li"><div class="ls k-roof"></div><span>Covered walkway</span></div>
      <div class="li"><div class="ls k-ossuary"></div><span>Ossuary &mdash; not priced here</span></div>
      <div class="li"><div class="ls k-entrance"></div><span>Entrance &amp; joining wall</span></div>
      <div class="li"><div class="ls ls-hatch"></div><span>Hatched = height estimated, please confirm with us</span></div>
    </div>`;

// ── Flat list (the print path, and the whole page without JS) ────────────────
function listRow(b) {
  return `    <button type="button" class="lrow" data-ref="${b.ref}" data-wing="${b.wing}" data-n="${b.n}"` +
    ` data-kind="bank" data-price="" data-status=""` +
    ` aria-label="${esc(`${b.ref}, ${b.wingLabel} bank ${b.n}, ${ASK_CHIP}`)}">` +
    `<span class="lref">${b.ref}</span><span class="lkinds">${esc(CRYPT_KINDS.join(' &middot; ').replace(/&middot;/g, '·'))}</span>` +
    `<span class="ask">${ASK_CHIP}</span></button>`;
}

function listView() {
  const wings = WINGS.map((w) => `  <div class="lgroup">
    <div class="lgtitle">${esc(w.label)} &nbsp;·&nbsp; banks ${w.numbers[0]}&ndash;${w.numbers[w.numbers.length - 1]}</div>
    <div class="lgrid">
${w.banks.map(listRow).join('\n')}
    </div>
  </div>`).join('\n');
  return `  <div class="wview" id="view-banks">
    <div class="wlabel">Crypt banks along the north face</div>
    <div class="wsub">${esc(CRYPT_KINDS.join(' · '))} crypts &nbsp;·&nbsp; ${ASK_CHIP} for availability and price</div>
${wings}
  <div class="lgroup">
    <div class="lgtitle">South edge</div>
    <div class="lgrid">
    <button type="button" class="lrow wide" data-ref="${TANDEM.ref}" data-kind="tandem" data-price="" data-status=""
      aria-label="${esc(`${TANDEM.label}, ${TANDEM.sub}, ${ASK_CHIP}`)}"><span class="lref">${esc(TANDEM.label)}</span><span class="lkinds">${esc(TANDEM.sub)}</span><span class="ask">${ASK_CHIP}</span></button>
    </div>
  </div>
  </div>`;
}

// ── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  :root{--navy:#1a2744;--navy-light:#243156;--gold:#c8a96e;--gold-light:#e8d5a8;--cream:#f7f4ef;--gb:rgba(200,169,110,0.45);}
  *{box-sizing:border-box;margin:0;padding:0;}
  html{overflow-x:hidden;}
  body{font-family:'Jost',sans-serif;background:var(--navy);color:var(--cream);min-height:100vh;overflow-x:hidden;max-width:100vw;}
  button{font-family:inherit;}
  .header{background:linear-gradient(135deg,var(--navy),var(--navy-light));border-bottom:2px solid var(--gold);padding:14px 20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;}
  .hlogo-svg{height:34px;flex-shrink:0;width:auto;}
  .htxt h1{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:var(--cream);}
  .htxt p{font-size:10px;font-weight:300;color:var(--gold);letter-spacing:.12em;text-transform:uppercase;margin-top:2px;}
  .back-btn{margin-left:auto;flex-shrink:0;background:none;border:1px solid var(--gb);color:var(--gold-light);padding:9px 14px;border-radius:6px;font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap;text-decoration:none;}
  .back-btn:hover{background:rgba(200,169,110,.15);color:var(--cream);}
  .path-btn{flex-shrink:0;background:rgba(200,169,110,.18);border:1px solid var(--gold);color:var(--gold);padding:9px 14px;border-radius:6px;font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap;text-decoration:none;}
  .path-btn:hover{background:rgba(200,169,110,.32);color:var(--cream);}
  .print-btn{flex-shrink:0;background:rgba(200,169,110,.15);border:1px solid var(--gold);color:var(--gold);padding:9px 16px;border-radius:6px;font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;cursor:pointer;white-space:nowrap;}
  .print-btn:hover{background:rgba(200,169,110,.28);}
  .tabs{display:flex;background:var(--navy-light);border-bottom:1px solid var(--gb);overflow-x:auto;}
  .tab{padding:10px 14px;font-size:11px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:var(--gold-light);cursor:pointer;border:none;border-bottom:3px solid transparent;white-space:nowrap;transition:all .2s;background:none;}
  .tab:hover{color:var(--cream);background:rgba(200,169,110,.08);}
  .tab.active{color:var(--gold);border-bottom-color:var(--gold);background:rgba(200,169,110,.12);}
  .main{padding:14px;}
  .wview,.view3d{display:none;}.wview.active,.view3d.active{display:block;}
  .wlabel{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:var(--gold);margin-bottom:2px;margin-top:10px;text-align:center;}
  .wsub{font-size:10px;color:var(--gold-light);letter-spacing:.1em;text-transform:uppercase;margin-bottom:12px;text-align:center;}

  /* ── The plan ── */
  .planwrap{overflow-x:auto;max-width:100%;padding:4px 0 10px;}
  .plan{position:relative;margin:0 auto;background:
      radial-gradient(ellipse at 50% 40%,#2b3450 0%,#18213a 55%,#0c1222 100%);
    border:1px solid var(--gb);border-radius:10px;}
  .outline{position:absolute;border:2px solid rgba(200,169,110,.55);border-radius:4px;background:rgba(200,169,110,.05);}
  .ctx{position:absolute;display:flex;align-items:center;justify-content:center;text-align:center;border-radius:3px;pointer-events:none;}
  .ctxl{font-size:9px;letter-spacing:.06em;color:var(--gold-light);line-height:1.25;padding:2px;}
  .ctxl i{display:block;font-size:7.5px;opacity:.8;font-style:italic;}
  .roof{background:repeating-linear-gradient(90deg,rgba(232,213,168,.16) 0 3px,rgba(232,213,168,0) 3px 8px);
    border:1px dashed rgba(232,213,168,.35);}
  .roofl{font-size:7px;letter-spacing:.18em;color:rgba(232,213,168,.65);}
  .st-room{background:linear-gradient(180deg,#39435f,#252e48);border:1px solid rgba(232,213,168,.4);}
  .st-water{background:linear-gradient(180deg,#2f5a6e,#1d3c4c);border:1px solid rgba(140,200,220,.45);}
  .st-ossuary{background:linear-gradient(180deg,#4a4535,#2e2b20);border:1px solid rgba(232,213,168,.45);}
  .st-entrance{background:linear-gradient(180deg,#33405e,#212a41);border:1px dashed rgba(232,213,168,.5);}
  .st-join{background:repeating-linear-gradient(135deg,rgba(232,213,168,.12) 0 4px,rgba(232,213,168,0) 4px 9px);
    border:1px dashed rgba(232,213,168,.4);}
  .st-join .ctxl{font-size:8px;opacity:.85;}

  /* A crypt bank. No hue carries meaning on this page — there are no statuses and no
     price tiers yet — so every bank is drawn identically and differs only by its number. */
  .bk{position:absolute;cursor:pointer;border:1px solid rgba(58,44,20,.5);border-radius:2px;
    display:flex;align-items:center;justify-content:center;padding:1px;color:#2f2512;
    transition:transform .15s,box-shadow .15s,filter .15s;
    background:linear-gradient(115deg,rgba(255,255,255,.18) 0%,rgba(255,255,255,0) 34%),
               linear-gradient(180deg,#e9dcc2 0%,#cfbc95 55%,#b7a179 100%);}
  .bk:hover{transform:scale(1.08);z-index:12;border-color:var(--gold);box-shadow:0 4px 16px rgba(0,0,0,.55),0 0 0 1px var(--gold);}
  .bk:focus-visible{outline:2px solid #fff;outline-offset:1px;z-index:20;}
  .bk.sel{outline:3px solid #fff;outline-offset:-3px;z-index:25;filter:brightness(1.14);
    box-shadow:0 0 0 2px var(--gold),0 0 20px 4px rgba(255,255,255,.4);}
  .bkn{font-size:11px;font-weight:700;}
  .bk.tandem{background:linear-gradient(115deg,rgba(255,255,255,.14) 0%,rgba(255,255,255,0) 30%),
               linear-gradient(180deg,#e2d4b8 0%,#c6b189 55%,#ab9670 100%);}
  .bkl{font-size:9px;font-weight:700;letter-spacing:.14em;white-space:nowrap;}

  /* The courtyard link zone — the whole point of this page's cross-link. */
  .court{position:absolute;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;
    text-decoration:none;border-radius:6px;border:2px dashed var(--gold);
    background:radial-gradient(ellipse at 50% 45%,rgba(200,169,110,.20),rgba(200,169,110,.06) 70%);
    transition:background .18s,box-shadow .18s;}
  .court:hover,.court:focus-visible{background:radial-gradient(ellipse at 50% 45%,rgba(200,169,110,.34),rgba(200,169,110,.12) 70%);
    box-shadow:0 0 0 2px var(--gold),0 8px 26px rgba(0,0,0,.5);outline:none;}
  .courtt{font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:600;color:var(--gold);text-align:center;padding:0 8px;}
  .courtc{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--cream);
    border:1px solid var(--gb);border-radius:4px;padding:3px 9px;background:rgba(26,39,68,.6);}
  .wingl{position:absolute;top:6px;font-size:9px;letter-spacing:.16em;color:var(--gold-light);opacity:.85;}
  .wl-w{left:14px;}.wl-e{right:14px;}
  .compass{position:absolute;left:50%;top:4px;transform:translateX(-50%);font-size:9px;color:var(--gold-light);letter-spacing:.1em;}
  .compass b{font-size:12px;color:var(--gold);}

  /* ── Flat list ── */
  .lgroup{max-width:940px;margin:0 auto 14px;}
  .lgtitle{font-family:'Cormorant Garamond',serif;font-size:15px;color:var(--gold);margin:10px 0 6px;text-align:center;}
  .lgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:6px;}
  .lrow{display:flex;align-items:center;gap:8px;text-align:left;cursor:pointer;
    background:rgba(200,169,110,.08);border:1px solid var(--gb);border-radius:5px;padding:7px 9px;color:var(--cream);}
  .lrow:hover{background:rgba(200,169,110,.18);}
  .lrow:focus-visible{outline:2px solid #fff;outline-offset:1px;}
  .lrow.sel{outline:2px solid var(--gold);background:rgba(200,169,110,.24);}
  .lrow.wide{grid-column:1/-1;}
  .lref{font-weight:700;color:var(--gold);font-size:12px;white-space:nowrap;}
  .lkinds{font-size:10px;color:var(--gold-light);flex:1;}
  .ask{font-size:9px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;
    background:rgba(247,244,239,.9);color:#17181b;border-radius:3px;padding:1px 6px;white-space:nowrap;}

  /* ── 3D scene ──────────────────────────────────────────────────────────────
     Materials follow the 2026-08-03 walk-through where it actually saw them: polished
     pink-and-grey speckled stone crypt fronts under pale cream stucco, a dark-edged
     eave over a pale soffit, stamped concrete and bark underfoot in the court.
     BLOCK KIND is carried by HUE; HEIGHT CONFIDENCE is carried by a hatch PATTERN, so
     the two codings never compete — the same rule the plan's status vocabulary states
     and the same one the sibling building map applies to placement. */
  .toolbar{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;align-items:center;max-width:900px;margin:10px auto 8px;}
  .tbtn{background:rgba(200,169,110,.12);border:1px solid var(--gb);color:var(--gold-light);padding:7px 13px;border-radius:5px;font-size:11px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:all .15s;}
  .tbtn:hover{background:rgba(200,169,110,.26);color:var(--cream);}
  .tbtn.on{background:rgba(200,169,110,.3);border-color:var(--gold);color:var(--gold);}
  .tbtn:focus-visible{outline:2px solid #fff;outline-offset:2px;}
  .tbsep{width:1px;height:22px;background:var(--gb);margin:0 4px;}
  .scene{position:relative;height:min(66vh,620px);min-height:340px;margin:0 auto;max-width:1100px;
    background:linear-gradient(180deg,#8fa4c4 0%,#5d7093 24%,#33415f 52%,#141c31 100%);
    border:1px solid var(--gb);border-radius:10px;overflow:hidden;cursor:grab;touch-action:none;
    perspective:1700px;perspective-origin:50% 42%;}
  .scene:active{cursor:grabbing;}
  .scene:focus-visible{outline:2px solid var(--gold);outline-offset:2px;}
  .stage{position:absolute;left:50%;top:58%;width:0;height:0;transform-style:preserve-3d;
    transform:translateY(var(--lift,0px)) scale(var(--zoom,1)) rotateX(var(--pitch,0deg)) rotateY(var(--yaw,0deg));}
  .yard{position:absolute;transform-style:preserve-3d;}
  /* The ground plate uses rotateX(90deg) — the SAME sense as a slab's top face, which is
     the only orientation that lays text out un-mirrored when you look straight down. The
     first version used rotateX(-90deg) and printed "HTRON" along the SOUTH edge: mirrored
     AND on the wrong side, so a reader checking which wing faced which way was told the
     opposite of the truth by a label they could not read anyway. Caught by looking at a
     render; no count would have found it. */
  .ground{position:absolute;left:0;top:0;background:
      radial-gradient(ellipse at 50% 50%,rgba(150,140,116,.30),rgba(34,32,26,.86) 80%),
      repeating-linear-gradient(90deg,rgba(255,255,255,.03) 0 3px,rgba(0,0,0,0) 3px 7px);
    border:1px solid rgba(180,168,140,.16);}
  .fcomp{position:absolute;left:50%;transform:translateX(-50%);color:rgba(232,213,168,.78);font-size:12px;letter-spacing:.14em;white-space:nowrap;}
  .fc-n{top:2%;}
  .fc-s{bottom:2%;}
  .face{position:absolute;left:0;top:0;backface-visibility:hidden;border:1px solid rgba(38,28,12,.5);}
  .face.side{filter:brightness(.8);}
  .face.top{display:flex;align-items:center;justify-content:center;overflow:hidden;}
  .slabl{font-size:7.5px;font-weight:700;color:#2f2413;letter-spacing:.02em;line-height:1.1;
    text-align:center;padding:0 1px;position:relative;z-index:1;}
  .slabn{font-size:10px;white-space:nowrap;}
  /* A crypt bank's SIDE faces are the crypt fronts a family actually stands in front of.
     The walk-through reads five courses from the paving to the soffit, so the face is
     ruled into five bands — the only thing in this scene that encodes a count, and it
     encodes the one count the footage genuinely gives. It is a texture, not a label: no
     number is printed and no individual crypt is selectable. */
  .face.side.k-bank,.face.side.k-tandem{background-image:
      repeating-linear-gradient(0deg,rgba(60,44,20,.34) 0 1px,rgba(0,0,0,0) 1px 20%),
      linear-gradient(180deg,#e9dcc2 0%,#cfbc95 55%,#b7a179 100%);}
  /* The courtyard floor: stamped concrete, river rock and bark, one step below the
     walkway. It is a FLOOR, so it gets no side faces and no label of its own — the link
     zone sitting on it carries the name. */
  .face.court{background:
      radial-gradient(ellipse at 50% 45%,rgba(214,203,180,.55),rgba(120,108,86,.5) 72%),
      repeating-linear-gradient(52deg,rgba(70,52,30,.22) 0 6px,rgba(0,0,0,0) 6px 15px);
    border:1px solid rgba(232,213,168,.3);border-radius:3px;}

  /* Kind hues — what a block IS. */
  .k-bank{background:linear-gradient(180deg,#e9dcc2 0%,#cfbc95 55%,#b7a179 100%);}
  .k-tandem{background:linear-gradient(180deg,#e2d4b8 0%,#c6b189 55%,#ab9670 100%);}
  .k-room{background:linear-gradient(180deg,#cdd3e0,#98a2bb);}
  .k-water{background:linear-gradient(180deg,#a8cbd8,#5f8ea3);}
  .k-ossuary{background:linear-gradient(180deg,#cfc9ae,#8e8a70);}
  .k-entrance{background:linear-gradient(180deg,#c3c8d6,#8d95ab);}
  .k-join{background:linear-gradient(180deg,#b6b3ab,#8a887f);}
  .k-roof{background:linear-gradient(180deg,#efe9dd,#b9b2a2);}
  /* ── Confidence: PATTERN, never hue. The hatch is an OVERLAY pseudo-element, not a
     background-image: setting background-image on a cell whose fill is a gradient
     REPLACES the gradient instead of layering over it, which wipes the kind hue off
     every estimated block. And the overlay must NOT set position — every carrier
     (.face) is already absolutely positioned, and a later position:relative at equal
     specificity drops the whole scene out of absolute layout. Both were real bugs on
     the sibling building map, both caught by looking at a render rather than by any
     count, and both are cheaper to inherit than to rediscover. ── */
  .c-medium::after,.c-low::after{content:'';position:absolute;inset:0;pointer-events:none;border-radius:inherit;}
  .c-medium::after{background:repeating-linear-gradient(135deg,rgba(255,255,255,.32) 0 2px,rgba(255,255,255,0) 2px 6px);}
  .c-low::after{background:repeating-linear-gradient(135deg,rgba(255,255,255,.46) 0 3px,rgba(255,255,255,0) 3px 6px);}
  .ls-hatch{background:
      repeating-linear-gradient(135deg,rgba(255,255,255,.46) 0 3px,rgba(255,255,255,0) 3px 6px),
      linear-gradient(180deg,#e9dcc2,#b7a179);}

  /* The hit target floats a hair above its slab so it never z-fights the top face. */
  .hit{position:absolute;left:0;top:0;background:transparent;border:none;padding:0;cursor:pointer;
    display:flex;align-items:center;justify-content:center;text-decoration:none;font-family:inherit;}
  .hit:hover{background:rgba(255,255,255,.18);box-shadow:0 0 0 1px var(--gold);}
  .hit:focus-visible{outline:2px solid #fff;outline-offset:1px;z-index:40;}
  .hit.sel{background:rgba(255,255,255,.22);box-shadow:0 0 0 2px var(--gold),0 0 20px 4px rgba(255,255,255,.35);}
  /* Mid-drag the pointer sweeps over blocks it never meant to touch. Freeze the hover
     highlight while the scene is being dragged, or the whole building flashes. */
  .scene.dragging .hit:hover{background:transparent!important;box-shadow:none!important;}
  .hitl{font-size:0;}
  .h-court{background:rgba(200,169,110,.2);box-shadow:inset 0 0 0 2px rgba(200,169,110,.9);border-radius:5px;}
  .h-court .hitl{font-size:10px;font-weight:700;color:#20180a;text-align:center;line-height:1.3;}
  .h-court .hitl b{display:block;font-family:'Cormorant Garamond',serif;font-size:15px;color:#17233c;}
  .hint{text-align:center;font-size:10px;color:var(--gold-light);opacity:.75;margin-top:7px;letter-spacing:.05em;}
  .modelnote{text-align:center;font-size:9.5px;color:var(--gold-light);opacity:.65;margin-top:3px;line-height:1.6;}
  .legend3d{display:flex;flex-wrap:wrap;gap:9px;margin-top:10px;justify-content:center;}
  .li{display:flex;align-items:center;gap:5px;font-size:10px;color:var(--gold-light);}
  .ls{width:13px;height:13px;border-radius:2px;border:1px solid rgba(255,255,255,.22);flex-shrink:0;}

  /* ── Detail card ── */
  .card{position:fixed;right:16px;bottom:16px;width:286px;background:rgba(16,24,44,.97);border:1px solid var(--gold);
    border-radius:9px;padding:13px 15px;z-index:900;box-shadow:0 10px 40px rgba(0,0,0,.65);font-size:11px;display:none;pointer-events:none;}
  .card.show{display:block;}
  .card.pinned{pointer-events:auto;}
  .cardhd{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:2px;}
  .cardid{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:700;color:var(--gold);}
  .cardwall{font-size:9px;color:var(--gold-light);letter-spacing:.1em;text-transform:uppercase;}
  .cardsub{font-size:9.5px;color:var(--gold-light);opacity:.85;letter-spacing:.05em;margin-bottom:7px;}
  .cardkinds{font-size:11px;color:var(--cream);margin-bottom:7px;line-height:1.5;}
  .cnote{margin-top:5px;font-size:9.5px;color:var(--gold-light);line-height:1.5;}
  .cclose{background:none;border:none;color:var(--gold-light);font-size:17px;line-height:1;cursor:pointer;padding:0 2px;}
  .cclose:hover{color:var(--cream);}
  @media (max-width:700px){.card{right:8px;left:8px;bottom:8px;width:auto;}}

  .pfoot{max-width:940px;margin:14px auto 0;text-align:center;font-size:10px;color:var(--gold-light);line-height:1.7;}
  .pfoot b{color:var(--gold);font-weight:600;}
  .pfoot p{margin-bottom:5px;}
  .pfoot a{color:var(--gold);text-decoration:underline;font-weight:600;}
  .pfoot a:hover{color:var(--cream);}
  .st-water .ctxl{font-size:7.5px;letter-spacing:0;}

  @media (max-width:640px){
    .header{padding:10px 12px;gap:9px;}
    .hlogo-svg{height:26px;}
    .htxt h1{font-size:14px;}
    .htxt p{font-size:9px;}
    .back-btn,.print-btn,.path-btn{margin-left:0;padding:6px 11px;font-size:11px;}
    .main{padding:8px;}
    .tab{padding:9px 11px;font-size:10px;}
  }

  @media print{
    .no-print,.tabs,.card,.toolbar,.view3d,.hint,.modelnote,.legend3d{display:none!important;}
    *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important;}
    body{background:#fff!important;color:#1a1a1a!important;}
    .header{background:#fff!important;border-bottom:2px solid #c8540a!important;padding:10px 0;}
    .htxt h1{color:#1a2744!important;}
    .htxt p{color:#555!important;}
    .wview{display:block!important;break-before:page;}
    #view-plan{break-before:avoid!important;}
    body.pv-one .wview{display:none!important;}
    body.pv-one .wview.active{display:block!important;break-before:avoid!important;}
    .wlabel{color:#1a2744!important;}
    .wsub,.pfoot,.lgtitle{color:#444!important;}
    .lgtitle,.pfoot b{color:#1a2744!important;}
    .plan{background:#fff!important;border:1px solid #999!important;}
    .outline{border-color:#1a2744!important;background:#fff!important;}
    .ctxl,.roofl,.wingl,.compass{color:#333!important;}
    .ctx{border-color:#999!important;background:#f2f0ec!important;}
    .bk{background:#e9e3d6!important;border-color:#8a7a58!important;color:#1a1a1a!important;}
    .bk.sel{outline:4px solid #c8540a!important;outline-offset:-2px;filter:none!important;transform:none!important;}
    .court{border-color:#c8540a!important;background:#fdf6ec!important;}
    .courtt{color:#1a2744!important;}
    .courtc{color:#1a1a1a!important;background:#fff!important;border-color:#999!important;}
    .lrow{background:#fff!important;border-color:#999!important;color:#1a1a1a!important;}
    .lref{color:#1a2744!important;}
    .lkinds{color:#444!important;}
    .ask{background:#1a2744!important;color:#fff!important;}
    .pfoot a{color:#c8540a!important;}
  }
`;

// ── Page runtime ─────────────────────────────────────────────────────────────
const KINDS_JSON = JSON.stringify(CRYPT_KINDS);
const WING_LABEL_JSON = JSON.stringify(Object.fromEntries(WINGS.map((w) => [w.id, w.label])));

const JS = `
'use strict';
var KINDS = ${KINDS_JSON};
var WING_LABEL = ${WING_LABEL_JSON};
var TANDEM = ${JSON.stringify({ ref: TANDEM.ref, label: TANDEM.label, sub: TANDEM.sub })};
var ASK = ${JSON.stringify(ASK)};
var MAT = ${JSON.stringify({ bank: MATERIAL.bank, tandem: MATERIAL.tandem })};
var card = document.getElementById('card');
var pinned = null;

// >>> CARD MATH >>>
// There is no math. This ship carries no price, no status and no count, so the card is a
// pure description — and it is written so that it CANNOT print a figure even if a stray
// data-price appeared in the DOM: nothing here reads data-price at all. When pricing
// lands, this is the one function that changes, and the check that no unsellable position
// renders a dollar figure is already written against it.
function cardHtml(d) {
  var head = '<div class="cardhd"><span class="cardid">' + d.ref + '</span>' +
    '<span class="cardwall">' + (d.kind === 'tandem' ? 'South edge' : (WING_LABEL[d.wing] || '')) + '</span>' +
    '<button class="cclose" type="button" aria-label="Close">\\u00d7</button></div>';
  if (d.kind === 'tandem') {
    return head +
      '<div class="cardsub">' + TANDEM.label + ' \\u00b7 ' + TANDEM.sub + '</div>' +
      '<div class="cardkinds">Companion crypts set head to head, in one long bank along the south edge.</div>' +
      '<div class="cnote">' + MAT.tandem + '</div>' +
      '<div class="cnote">' + ASK + ' The number of crypts still open in this bank is confirmed with us, not read off this map.</div>';
  }
  return head +
    '<div class="cardsub">' + (WING_LABEL[d.wing] || '') + ' \\u00b7 bank ' + d.n + '</div>' +
    '<div class="cardkinds">' + KINDS.join(' &middot; ') + ' crypts</div>' +
    '<div class="cnote">' + MAT.bank + '</div>' +
    '<div class="cnote">' + ASK + ' This map shows where a bank is, not what is open in it.</div>';
}
// <<< CARD MATH <<<

function read(el) {
  var d = {};
  ['ref', 'wing', 'n', 'kind'].forEach(function (k) {
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
  var ref = el.getAttribute('data-ref');
  var all = document.querySelectorAll('[data-ref="' + ref + '"]');
  for (var i = 0; i < all.length; i++) all[i].classList.add('sel');
}
// A bank is rendered twice — once in the plan, once in the list — and the copy in the
// hidden view measures as a zero rect. Placing a pinned card against zero parks it on the
// tab bar, where it eats the tab clicks (found on the GOMN page, 2026-07-31). So always
// measure whichever rendering is actually laid out, and otherwise park in the corner.
function visibleTwin(el) {
  var ref = el.getAttribute('data-ref');
  if (!ref) return el;
  var all = document.querySelectorAll('[data-ref="' + ref + '"]');
  for (var i = 0; i < all.length; i++) {
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
  var cw = card.offsetWidth || 286, ch = card.offsetHeight || 170;
  var x = r.right + 14, y = r.top + r.height / 2 - ch / 2;
  if (x + cw > window.innerWidth - 8) x = r.left - cw - 14;
  if (x < 8) x = Math.min(Math.max(8, r.right + 14), window.innerWidth - cw - 8);
  y = Math.max(8, Math.min(y, window.innerHeight - ch - 8));
  card.style.left = x + 'px'; card.style.top = y + 'px';
}
function showCard(el, pin) {
  card.innerHTML = cardHtml(read(el));
  card.classList.add('show');
  placeCard(el);
  if (pin) { pinned = el; markSel(el); }
  card.classList.toggle('pinned', pinned === el);
}
function hideCard() {
  card.classList.remove('show');
  card.classList.remove('pinned');
  pinned = null;
  clearSel();
}
document.addEventListener('click', function (ev) {
  if (ev.target.closest('.cclose')) { hideCard(); return; }
  // A link zone NAVIGATES. Never intercept one: the courtyard link is the whole point of
  // this page's cross-link, and it exists in BOTH the plan and the 3D view.
  if (ev.target.closest('a[href]')) return;
  // The courtyard link is a real navigation: never swallow it.
  if (ev.target.closest('.court')) return;
  var n = ev.target.closest('.bk, .lrow, .hit');
  if (n && n.hasAttribute('data-ref')) { showCard(n, true); return; }
  if (!ev.target.closest('#card, .tab, .tbtn')) hideCard();
});
document.addEventListener('mouseover', function (ev) {
  if (window.matchMedia('(hover: none)').matches) return;
  // A drag or a coasting camera slides blocks UNDER a stationary pointer, and the browser
  // fires mouseover for each one. Freeze the hover card while either is happening, or the
  // card flickers through half the building on one gesture.
  if (last || glideRaf) return;
  var n = ev.target.closest('.bk, .lrow, .hit');
  if (n && n.hasAttribute('data-ref')) showCard(n, false);
  else if (pinned) showCard(pinned, false);
});
document.addEventListener('focusin', function (ev) {
  var n = ev.target.closest('.bk, .lrow, .hit');
  if (!n || !n.hasAttribute('data-ref')) return;
  var kb = true;
  try { kb = n.matches(':focus-visible'); } catch (e) { kb = true; }
  if (kb) showCard(n, true);
});
document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') hideCard(); });

var VIEWS = ['plan', 'banks'];
function showView(v) {
  var views = document.querySelectorAll('.wview, .view3d');
  for (var i = 0; i < views.length; i++) views[i].classList.remove('active');
  var el = document.getElementById(v === '3d' ? 'view-3d' : 'view-' + v);
  if (el) el.classList.add('active');
  var tabs = document.querySelectorAll('.tabs .tab');
  for (var j = 0; j < tabs.length; j++) tabs[j].classList.toggle('active', tabs[j].getAttribute('data-view') === v);
  document.body.classList.toggle('pv-one', VIEWS.indexOf(v) > -1);
  if (v === '3d') fitScene();
  if (pinned) placeCard(pinned);
}
document.querySelectorAll('.tabs .tab').forEach(function (t) {
  t.addEventListener('click', function () { showView(t.getAttribute('data-view')); });
});

// ── 3D camera ─────────────────────────────────────────────────────────────────
var scene = document.getElementById('scene'), stage = document.getElementById('stage');
var cam = { yaw: -30, pitch: -42, zoom: 1, lift: 0 };
var ZMIN = 0.12, ZMAX = 3, PMIN = -90, PMAX = 0;
var HALF_PX = ${px(MAX_TOP / 2)};
var STAGE_TOP = 0.58;
var RAD = Math.PI / 180;
var clamp = function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; };
var curPreset = null;

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
  viewTo(curPreset || 'room', true);
}
window.addEventListener('resize', fitScene);

var SW = ${SITE_W_PX}, SD = ${SITE_D_PX}, FIT_H_PX = ${px(MAX_TOP)};
// Every preset is fitted against the ROTATED FOOTPRINT plus whatever the tallest block
// projects at that pitch, so nothing is ever cropped by the scene box at any angle.
function fp(yaw, pitch) {
  var cy = Math.abs(Math.cos(yaw * RAD)), sy = Math.abs(Math.sin(yaw * RAD));
  var w = SW * cy + SD * sy;
  var h = FIT_H_PX * Math.abs(Math.cos(pitch * RAD)) + (SW * sy + SD * cy) * Math.abs(Math.sin(pitch * RAD));
  return { yaw: yaw, pitch: pitch, w: w, h: h, dist: 0 };
}
var VIEWS3D = {
  room: fp(-30, -42),
  plan: fp(0, -88),
  // Face-on presets sit shallow but not flat: a few degrees of tilt keeps the covered
  // walkway and the courtyard floor in frame, which is what tells a reader the banks
  // stand a step above the path rather than on it.
  wings: fp(0, -16),
  tandem: fp(180, -16),
  east: fp(-90, -18),
};
function viewTo(k, quiet) {
  if (!pinned && !quiet) card.classList.remove('show');
  easeThrough(function () { setView(k); }, quiet);
}
function setView(k) {
  var v = VIEWS3D[k];
  curPreset = k;
  cam.yaw = v.yaw;
  cam.pitch = v.pitch;
  var Tw = scene.clientWidth * 0.95, Th = scene.clientHeight * 0.88, P = 1700;
  var zw = (Tw * P) / (v.w * P + Tw * v.dist);
  var zh = (Th * P) / (v.h * P + Th * v.dist);
  cam.zoom = clamp(Math.min(zw, zh), ZMIN, ZMAX);
  cam.lift = HALF_PX * Math.cos(v.pitch * RAD) * cam.zoom - (STAGE_TOP - 0.5) * scene.clientHeight;
  apply();
}
document.querySelectorAll('[data-viewbtn]').forEach(function (b) {
  b.addEventListener('click', function () {
    var k = b.getAttribute('data-viewbtn');
    viewTo(curPreset === k && k !== 'room' ? 'room' : k);
  });
});
document.getElementById('btn-reset').addEventListener('click', function () { viewTo('room'); });
document.getElementById('btn-in').addEventListener('click', function () { stopGlide(); cam.zoom *= 1.25; apply(); });
document.getElementById('btn-out').addEventListener('click', function () { stopGlide(); cam.zoom /= 1.25; apply(); });

// Drag to orbit, pinch to zoom. Capture is DEFERRED until a real drag (>8px) or a second
// finger: capturing on pointerdown retargets the click to the scene, and a tap on a bank
// then never reaches its button — the bug the sibling niche pages shipped once already.
var pts = {}, last = null, pinchStart = 0, zoomStart = 1, moved = 0, captured = false;
var downRef = null, downAt = 0, downHref = null;
${movementRuntime({ keys: ['yaw', 'pitch', 'zoom', 'lift'] })}
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
  stopGlide();
  if (Object.keys(pts).length === 0) {
    var n = ev.target.closest('.hit[data-ref]');
    downRef = (n && n.tagName === 'BUTTON') ? n : null;
    var a = ev.target.closest('a[href]');
    downHref = a ? a : null;
    downAt = performance.now();
  } else {
    downRef = null; downHref = null;
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
  orbitBy(dx, dy);
  last = { x: ev.clientX, y: ev.clientY };
});
var suppressUntil = 0;
function endPtr(ev) {
  delete pts[ev.pointerId];
  if (!Object.keys(pts).length) {
    suppressUntil = performance.now() + 450;
    releaseGesture(moved);
    var tap = ev.type === 'pointerup' && moved <= 8 && performance.now() - downAt < 700;
    // A tap on the courtyard must still NAVIGATE even though the scene swallows the
    // native click that follows a pointer gesture. Travel decides it is a tap; the
    // navigation is then performed explicitly.
    if (tap && downHref) { var h = downHref.getAttribute('href'); downRef = null; downHref = null; last = null; pinchStart = 0; moved = 0; window.location.href = h; return; }
    if (tap && downRef) showCard(downRef, true);
    else if (tap && !downRef && !ev.target.closest('#card')) hideCard();
    downRef = null; downHref = null;
    last = null; pinchStart = 0; moved = 0;
  }
}
scene.addEventListener('pointerup', endPtr);
scene.addEventListener('pointercancel', endPtr);
scene.addEventListener('click', function (ev) {
  if (performance.now() < suppressUntil) { ev.stopPropagation(); ev.preventDefault(); }
}, true);
scene.addEventListener('wheel', function (ev) {
  ev.preventDefault(); stopGlide();
  cam.zoom *= Math.exp(-ev.deltaY * 0.0012);
  apply();
}, { passive: false });
scene.addEventListener('keydown', function (ev) {
  var k = ev.key, step = (ev.shiftKey ? 15 : 5) * KICK_GAIN;
  if (k === 'ArrowLeft') kick(-step, 0);
  else if (k === 'ArrowRight') kick(step, 0);
  else if (k === 'ArrowUp') kick(0, step);
  else if (k === 'ArrowDown') kick(0, -step);
  else if (k === '+' || k === '=') { stopGlide(); cam.zoom *= 1.2; apply(); }
  else if (k === '-' || k === '_') { stopGlide(); cam.zoom /= 1.2; apply(); }
  else return;
  if (k.indexOf('Arrow') === 0) curPreset = null;
  ev.preventDefault();
});

showView('3d');
fitScene();
apply();
`;

// ── Page ─────────────────────────────────────────────────────────────────────
const HTML = `<!DOCTYPE html>
<!-- Generated by scripts/build_tg_maus_map.mjs from scripts/tg-maus-data.mjs.
     DO NOT HAND-EDIT: edit the dataset and rebuild. -->
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Terrace Garden Mausoleum &mdash; Property Map</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Jost:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<div class="header">
  ${LOGO}
  <div class="htxt">
    <h1>Terrace Garden Mausoleum &mdash; Property Map</h1>
    <p>Washington Memorial Park &nbsp;·&nbsp; crypt banks, family rooms &amp; the Memorial Path &nbsp;·&nbsp; layout estimated from photographs</p>
  </div>
  <a class="back-btn no-print" href="../">&larr; Quote Tool</a>
  <a class="path-btn no-print" href="${COURTYARD.href}">Memorial Path map &rarr;</a>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
</div>
<div class="tabs">
  <button class="tab active" data-view="3d">3D View</button>
  <button class="tab" data-view="plan">Site Plan</button>
  <button class="tab" data-view="banks">Crypt Banks</button>
</div>
<div class="main">
  <div class="view3d active" id="view-3d">
    <div class="wlabel">Terrace Garden Mausoleum</div>
    <div class="wsub">Two crypt wings facing each other across the Memorial Path &nbsp;·&nbsp; ${ASK_CHIP} for availability and price</div>
    <div class="toolbar no-print">
      <button class="tbtn" data-viewbtn="room" title="Three-quarter view of the whole building">Room view</button>
      <button class="tbtn" data-viewbtn="wings" title="Face on to the numbered crypt banks">Wing faces</button>
      <button class="tbtn" data-viewbtn="tandem" title="Face on to the tandem bank along the south edge">Tandem face</button>
      <button class="tbtn" data-viewbtn="east" title="Looking across from the entrance side">From the entrance</button>
      <button class="tbtn" data-viewbtn="plan" title="Straight down">Straight down</button>
      <div class="tbsep"></div>
      <button class="tbtn" id="btn-reset">Reset view</button>
      <div class="tbsep"></div>
      <button class="tbtn" id="btn-out" aria-label="Zoom out">&minus;</button>
      <button class="tbtn" id="btn-in" aria-label="Zoom in">+</button>
    </div>
${scene3d()}
    <div class="hint">Drag to orbit &nbsp;·&nbsp; scroll or pinch to zoom &nbsp;·&nbsp; tap a bank to see what it holds &nbsp;·&nbsp; arrow keys orbit, +/&minus; zoom</div>
    <div class="modelnote">${WINGS[0].banks.length + WINGS[1].banks.length} numbered crypt banks and the tandem bank are selectable &nbsp;·&nbsp; the outlined floor in the middle is the Memorial Path &mdash; tap it for its own map.<br>
      Heights are estimated from our own walk-through and the shapes are simplified; no dimension on this page is a measurement, and nothing here is to scale.</div>
    ${LEGEND3D}
    <div class="pfoot"><p><b>What you are looking at.</b> ${MATERIAL.bank} ${MATERIAL.roof} The walkway in front of the banks stands one step above the courtyard floor.</p></div>
  </div>

  <div class="wview" id="view-plan">
    <div class="wlabel">Terrace Garden Mausoleum</div>
    <div class="wsub">North is up &nbsp;·&nbsp; the Memorial Path fills the courtyard &nbsp;·&nbsp; ${ASK_CHIP} for availability and price</div>
${plan()}
  </div>
${listView()}
  <div class="pfoot">
    <p><b>What this map shows.</b> Where each crypt bank, family room and structure stands, and how the building wraps the Terrace Garden Memorial Path. <b>It shows no prices and no availability.</b> ${ASK}</p>
    <p><b>Layout is estimated from photographs</b> and from the cemetery&rsquo;s own overview of this building. Bank positions and sizes are approximate &mdash; walk the building with us before settling on a location.</p>
    <p><b>There is no reflection pool.</b> The Terrace Garden Memorial Path replaced it; the courtyard is now flagstone, planting beds and cremation properties. <a href="${COURTYARD.href}">Open the Memorial Path map &rarr;</a></p>
    <p><b>Terrace Garden Ossuary</b> is drawn where the cemetery&rsquo;s overview places it, east of the courtyard, and is <b>not priced here</b>.</p>
    <p>Availability and pricing are kept current against cemetery records &mdash; ask us to confirm today&rsquo;s status before writing.</p>
  </div>
</div>
<div class="card" id="card" role="dialog" aria-live="polite"></div>
<script>${JS}</script>
</body>
</html>
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
// CRLF, like every other generated page here. core.autocrlf is true on this machine, so
// git stores LF and checks CRLF back out; a builder emitting LF would produce a file that
// stops matching its own committed bytes after the next checkout, and the byte-for-byte
// determinism check would fail for the next person on a clean clone rather than for the
// person who introduced it.
fs.writeFileSync(OUT, HTML.replace(/\r?\n/g, '\r\n'), 'utf8');
const positions = allPositions();
console.log(`wrote ${path.relative(ROOT, OUT)} — ${WINGS[0].banks.length} west banks, ` +
  `${WINGS[1].banks.length} east banks, 1 tandem bank, ${STRUCTURES.length} inert structures, ` +
  `${positions.length} selectable positions, ${Object.keys(STATUS_STYLE).length} statuses defined and 0 used, ` +
  `${HTML.length} bytes`);
