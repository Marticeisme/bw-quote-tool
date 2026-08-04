/**
 * Generates MAPS/ELM_CryptMap.html from scripts/elm-building-data.mjs.
 *
 * Same architecture as build_ecl_map.mjs / build_gomn_map.mjs: a CSS-3D scene on screen
 * plus flat, static HTML for the tabs and for print, all emitted from the one dataset so
 * the two renderings cannot drift. Camera feel comes from scripts/map-movement.mjs.
 *
 * The difference from its siblings is the SUBJECT. ECL, MVC, ROAC and GOMN each model one
 * wall or cabinet whose every niche is priced. This models a BUILDING: where each named
 * bank sits, what shape it is, what it is made of, and how to get from here to the
 * columbarium's own map. There is no per-position inventory for ELM's crypts, so there is
 * no price and no status anywhere on the page — every selectable bank says "Ask us".
 * scripts/verify_elm_map.mjs fails the build if a dollar figure ever appears.
 *
 * Never hand-edit MAPS/ELM_CryptMap.html.
 *
 *   node scripts/build_elm_map.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SECTIONS, SITE, NEIGHBOURS, GROUPS, KIND_LABEL,
  HAS_INVENTORY, ASK_LABEL, isSelectable, positionsText,
} from './elm-building-data.mjs';
import { movementRuntime } from './map-movement.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'MAPS', 'ELM_CryptMap.html');
const ECL_HREF = 'ECL_NicheMap.html';

// Pixels per schematic foot. 4 gives the 224 ft envelope an 896 px model, wide enough for
// a bank label to sit inside its own footprint on the plan tab; the camera's fit-zoom
// scales it back to whatever the scene box is.
const PPF = 4;
const px = (v) => +(v * PPF).toFixed(2);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ── Site extents, with a margin of floor around the building ──────────────────
const PAD = 24;
const X0 = SITE.x0 - PAD, X1 = SITE.x1 + PAD;
const Z0 = SITE.gardenZ - PAD, Z1 = SITE.z1 + PAD;
const SITE_W = X1 - X0, SITE_D = Z1 - Z0;
const CX = (X0 + X1) / 2, CZ = (Z0 + Z1) / 2;
const MAX_H = Math.max(...SECTIONS.map((s) => s.h));

const CONF_LABEL = { high: 'Confirmed on the cemetery drawing', medium: 'Approximate placement', low: 'Approximate placement — confirm with us' };

// ── 3D: one section is an extruded slab ───────────────────────────────────────
function slab(s) {
  const cls = `sec k-${s.kind} c-${s.conf}`;
  const attrs = `data-sec="${s.id}" data-kind="${s.kind}"`;
  const x = s.x - CX, z = s.z - CZ;
  const parts = [];
  const top = `translate(-50%,-50%) translate3d(${px(x)}px,${px(-s.h)}px,${px(z)}px) rotateX(90deg)`;
  // The top face carries the label, so a plan-view reader sees the reference without
  // hovering anything. Long labels are trimmed by the cell, never abbreviated with a
  // dollar-free ellipsis that could be mistaken for a truncated price.
  parts.push(`      <div class="face top ${cls}" ${attrs} style="width:${px(s.w)}px;height:${px(s.d)}px;transform:${top}"><span class="slab-lbl">${esc(s.ref || s.label)}</span></div>`);
  for (const [sz, ry] of [[1, 0], [-1, 180]]) {
    parts.push(`      <div class="face side ${cls}" ${attrs} style="width:${px(s.w)}px;height:${px(s.h)}px;transform:translate(-50%,-50%) translate3d(${px(x)}px,${px(-s.h / 2)}px,${px(z + (sz * s.d) / 2)}px) rotateY(${ry}deg)"></div>`);
  }
  for (const [sx, ry] of [[1, 90], [-1, -90]]) {
    parts.push(`      <div class="face side ${cls}" ${attrs} style="width:${px(s.d)}px;height:${px(s.h)}px;transform:translate(-50%,-50%) translate3d(${px(x + (sx * s.w) / 2)}px,${px(-s.h / 2)}px,${px(z)}px) rotateY(${ry}deg)"></div>`);
  }
  return parts.join('\n');
}

/**
 * The hit target. A selectable bank is a <button>; the columbarium is an <a> that
 * NAVIGATES — the click-through link zone the page is required to carry — and a rest room
 * is neither, so it cannot be selected at all.
 */
function hit(s) {
  const x = s.x - CX, z = s.z - CZ;
  const t = `translate(-50%,-50%) translate3d(${px(x)}px,${px(-s.h - 0.2)}px,${px(z)}px) rotateX(90deg)`;
  const style = `width:${px(s.w)}px;height:${px(s.d)}px;transform:${t}`;
  const common = `class="hit h-${s.kind}" data-sec="${s.id}" data-kind="${s.kind}" style="${style}"`;
  if (s.kind === 'link') {
    return `      <a href="${esc(s.href)}" ${common} aria-label="${esc(s.label)} — open its own niche map"><span class="hit-lbl">${esc(s.label)}<b>Open map \u2192</b></span></a>`;
  }
  if (!isSelectable(s)) return '';
  return `      <button type="button" ${common} aria-label="${esc(ariaName(s))}"><span class="hit-lbl">${esc(s.ref || s.label)}</span></button>`;
}

function ariaName(s) {
  // No inventory exists, so there is nothing to read out but the reference, what it holds
  // and the fact that the count comes from us.
  return `${s.ref || s.label}, ${KIND_LABEL[s.kind]}, ${positionsText(s)}, ${ASK_LABEL}`;
}

function scene3d() {
  return `<div class="scene" id="scene" tabindex="0" role="application" aria-label="Three-dimensional plan of the Eternal Light Mausoleum. Use the view buttons below, or arrow keys, to change the view.">
  <div class="stage" id="stage">
    <div class="yard">
      <div class="floor" style="width:${px(SITE_W)}px;height:${px(SITE_D)}px;transform:translate(-50%,-50%) translate3d(0,1px,0) rotateX(-90deg)">
        <span class="fcomp fc-n">NORTH</span>
        <span class="fcomp fc-s">SOUTH</span>
        <span class="fcomp fc-w">WEST &nbsp;\u00b7&nbsp; ${esc(NEIGHBOURS[0].label)}</span>
        <span class="fcomp fc-e">EAST &nbsp;\u00b7&nbsp; ${esc(NEIGHBOURS[1].label)}</span>
      </div>
${SECTIONS.map(slab).join('\n')}
${SECTIONS.map(hit).filter(Boolean).join('\n')}
    </div>
  </div>
</div>`;
}

// ── Flat plan (static HTML, no JS, prints) ────────────────────────────────────
const PLAN_W = 980;
const PLAN_SCALE = PLAN_W / SITE_W;
const PLAN_H = Math.round(SITE_D * PLAN_SCALE);
const pl = (v) => +(v * PLAN_SCALE).toFixed(2);

function planCell(s) {
  const left = pl(s.x - s.w / 2 - X0), top = pl(s.z - s.d / 2 - Z0);
  const w = pl(s.w), h = pl(s.d);
  const style = `left:${left}px;top:${top}px;width:${w}px;height:${h}px`;
  const cls = `pcell k-${s.kind} c-${s.conf}`;
  if (s.kind === 'link') {
    return `      <a href="${esc(s.href)}" class="${cls}" data-sec="${s.id}" style="${style}" aria-label="${esc(s.label)} — open its own niche map"><span>${esc(s.label)}</span></a>`;
  }
  if (!isSelectable(s)) {
    return `      <div class="${cls}" style="${style}"><span>${esc(s.label)}</span></div>`;
  }
  return `      <button type="button" class="${cls}" data-sec="${s.id}" data-kind="${s.kind}" style="${style}" aria-label="${esc(ariaName(s))}"><span>${esc(s.ref || s.label)}</span></button>`;
}

function planView() {
  return `  <div class="wview" id="wall-plan">
    <div class="wlabel">Building Plan</div>
    <div class="wsub">North at the top &nbsp;\u00b7&nbsp; schematic: relative positions follow the cemetery's own drawing, and are not to scale</div>
    <div class="gwrap">
      <div class="plan" style="width:${PLAN_W}px;height:${PLAN_H}px">
        <span class="pcomp pc-n">NORTH</span>
        <span class="pcomp pc-s">SOUTH</span>
${SECTIONS.map(planCell).join('\n')}
      </div>
    </div>
    ${LEGEND}
  </div>`;
}

// ── Section list (static HTML, prints) ────────────────────────────────────────
function listRow(s) {
  const ask = isSelectable(s) ? `<span class="ask">${esc(ASK_LABEL)}</span>` : '';
  const flag = s.labelUnverified ? ' <em class="unv">reference to confirm with us</em>' : '';
  const link = s.kind === 'link' ? ` <a class="rowlink" href="${esc(s.href)}">Open its map \u2192</a>` : '';
  return `      <tr>
        <td class="rref">${esc(s.ref || '\u2014')}${flag}</td>
        <td>${esc(s.label)}${link}</td>
        <td>${esc(KIND_LABEL[s.kind])}</td>
        <td>${esc(positionsText(s))}</td>
        <td>${ask}</td>
      </tr>`;
}

function listView() {
  const blocks = GROUPS.map((g) => {
    const rows = SECTIONS.filter(g.match);
    if (!rows.length) return '';
    return `    <div class="grp">
      <div class="grphd">${esc(g.label)}</div>
      <table class="stab">
        <thead><tr><th>Reference</th><th>Section</th><th>Holds</th><th>Positions</th><th>Pricing</th></tr></thead>
        <tbody>
${rows.map(listRow).join('\n')}
        </tbody>
      </table>
    </div>`;
  }).filter(Boolean).join('\n');
  return `  <div class="wview" id="wall-list">
    <div class="wlabel">Sections</div>
    <div class="wsub">Every named section in the building &nbsp;\u00b7&nbsp; ask us for availability and pricing</div>
${blocks}
  </div>`;
}

// ── Legend ────────────────────────────────────────────────────────────────────
const LEGEND = `<div class="legend">
      <div class="li"><div class="ls k-tandem"></div><span>${KIND_LABEL.tandem}</span></div>
      <div class="li"><div class="ls k-wall"></div><span>${KIND_LABEL.wall}</span></div>
      <div class="li"><div class="ls k-crypt"></div><span>${KIND_LABEL.crypt}</span></div>
      <div class="li"><div class="ls k-crystal"></div><span>${KIND_LABEL.crystal}</span></div>
      <div class="li"><div class="ls k-glass"></div><span>${KIND_LABEL.glass}</span></div>
      <div class="li"><div class="ls k-link"></div><span>${KIND_LABEL.link}</span></div>
      <div class="li"><div class="ls k-amenity"></div><span>${KIND_LABEL.amenity}</span></div>
      <div class="li"><div class="ls c-swatch-low"></div><span>Hatched = approximate placement</span></div>
    </div>`;

// ── CSS ───────────────────────────────────────────────────────────────────────
// Materials follow the walkthrough footage where it actually saw them: warm
// rose-and-cream marble crypt fronts, olive carpet underfoot. The crystal-niches hue is
// a palette choice only — that room sits behind a glass door and was not filmed inside
// (operator, 2026-08-03), so no material claim is made for it.
// Section KIND is carried by hue; placement CONFIDENCE is carried by a hatch PATTERN, so
// the two codings never compete — the same rule the niche pages use for status.
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
  .tabs{display:flex;background:var(--navy-light);border-bottom:1px solid var(--gb);overflow-x:auto;}
  .tab{padding:10px 14px;font-size:11px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:var(--gold-light);cursor:pointer;border:none;border-bottom:3px solid transparent;white-space:nowrap;transition:all .2s;background:none;}
  .tab:hover{color:var(--cream);background:rgba(200,169,110,.08);}
  .tab.active{color:var(--gold);border-bottom-color:var(--gold);background:rgba(200,169,110,.12);}
  .main{padding:14px;}
  .wview,.view3d{display:none;}.wview.active,.view3d.active{display:block;}
  .wlabel{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:var(--gold);margin-bottom:2px;margin-top:14px;text-align:center;}
  .wsub{font-size:10px;color:var(--gold-light);letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px;text-align:center;}
  .gwrap{background:linear-gradient(160deg,#0f1a30,#1a2744 60%,#0d1528);border:1px solid var(--gb);border-radius:8px;padding:16px 18px;overflow-x:auto;max-width:1060px;margin:0 auto;}

  /* ── The persistent columbarium link ── */
  .ecl-btn{flex-shrink:0;background:rgba(200,169,110,.2);border:1px solid var(--gold);color:var(--gold);padding:9px 15px;border-radius:6px;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap;text-decoration:none;}
  .ecl-btn:hover{background:rgba(200,169,110,.36);color:var(--cream);}
  .ecl-btn:focus-visible{outline:2px solid #fff;outline-offset:2px;}
  .eclbar{max-width:1060px;margin:10px auto 0;background:rgba(200,169,110,.09);border:1px solid var(--gb);border-radius:6px;padding:9px 13px;font-size:11.5px;color:var(--gold-light);text-align:center;}
  .eclbar a{color:var(--gold);font-weight:700;text-decoration:underline;}

  /* ── Flat plan ── */
  .plan{position:relative;margin:0 auto;background:
      repeating-linear-gradient(90deg,rgba(255,255,255,.035) 0 3px,rgba(0,0,0,0) 3px 8px),
      radial-gradient(ellipse at 50% 45%,rgba(150,140,116,.22),rgba(30,28,22,.7) 80%);
    border:1px solid rgba(180,168,140,.2);border-radius:4px;}
  .pcomp{position:absolute;left:50%;transform:translateX(-50%);color:rgba(232,213,168,.7);font-size:10px;letter-spacing:.2em;}
  .pc-n{top:3px;}.pc-s{bottom:3px;}
  .pcell{position:absolute;display:flex;align-items:center;justify-content:center;text-align:center;
    border-radius:2px;font-size:8.5px;font-weight:600;line-height:1.05;overflow:hidden;padding:1px;
    border:1px solid rgba(40,30,14,.5);color:#2f2413;font-family:'Jost',sans-serif;}
  button.pcell,a.pcell{cursor:pointer;}
  button.pcell:hover,a.pcell:hover{filter:brightness(1.14);box-shadow:0 0 0 1px var(--gold);z-index:6;}
  .pcell:focus-visible{outline:2px solid #fff;outline-offset:1px;z-index:9;}
  .pcell.sel{outline:3px solid #fff;outline-offset:-2px;z-index:8;box-shadow:0 0 0 2px var(--gold),0 0 18px 3px rgba(255,255,255,.4);}

  /* ── Kind hues ── */
  .k-tandem{background:linear-gradient(180deg,#e6cfa6,#c6a677);}
  .k-wall{background:linear-gradient(180deg,#e3c3b0,#bf9781);}
  .k-crypt{background:linear-gradient(180deg,#ddd0c0,#b4a08c);}
  .k-crystal{background:linear-gradient(180deg,#cbd8c4,#9db195);}
  .k-glass{background:linear-gradient(180deg,#c9d6e2,#93a8bd);}
  .k-link{background:linear-gradient(180deg,#bcd0e6,#8aa7c6);}
  .k-amenity{background:linear-gradient(180deg,#b9b6ae,#8d8b84);}
  /* ── Confidence: PATTERN, never hue. An approximate placement is hatched; a confirmed
     one is flat. Hue is already spent on what a section HOLDS, and two codings sharing
     one channel is how a reader learns to trust neither.
     The hatch is an OVERLAY, not a background-image. The first version of this rule set
     background-image directly, which on a cell whose fill is a linear-gradient does not
     add a layer — it REPLACES the gradient. Every approximate section rendered as bare
     white hatch with its kind hue gone and its label unreadable, on both the plan and the
     3D slabs. Caught by looking at the render, not by any count.
     The overlay deliberately does NOT set position:relative on the cell. Every carrier of
     .c-medium / .c-low (.pcell, .face, .hit) is already absolutely positioned, so ::after
     already resolves against it — and a later .c-medium position:relative outranks
     .pcell position:absolute at equal specificity, which dropped every approximate
     section out of absolute layout and staggered the eight Garden Mausoleum banks down
     the plan diagonally. Also caught by looking, one render after the first fix. ── */
  .c-medium::after,.c-low::after{content:'';position:absolute;inset:0;pointer-events:none;border-radius:inherit;}
  .c-medium::after{background:repeating-linear-gradient(135deg,rgba(255,255,255,.34) 0 2px,rgba(255,255,255,0) 2px 6px);}
  .c-low::after{background:repeating-linear-gradient(135deg,rgba(255,255,255,.46) 0 3px,rgba(255,255,255,0) 3px 6px);}
  .pcell span,.slab-lbl{position:relative;z-index:1;}
  .c-swatch-low{background:
      repeating-linear-gradient(135deg,rgba(255,255,255,.46) 0 3px,rgba(255,255,255,0) 3px 6px),
      linear-gradient(180deg,#ddd0c0,#b4a08c);}

  .legend{display:flex;flex-wrap:wrap;gap:9px;margin-top:10px;justify-content:center;}
  .li{display:flex;align-items:center;gap:5px;font-size:10px;color:var(--gold-light);}
  .ls{width:13px;height:13px;border-radius:2px;border:1px solid rgba(255,255,255,.22);flex-shrink:0;}

  /* ── Section list ── */
  .grp{max-width:1060px;margin:0 auto 16px;}
  .grphd{font-family:'Cormorant Garamond',serif;font-size:16px;color:var(--gold);margin:12px 0 4px;}
  .stab{width:100%;border-collapse:collapse;font-size:11.5px;background:rgba(255,255,255,.03);border:1px solid var(--gb);border-radius:6px;overflow:hidden;}
  .stab th{text-align:left;padding:6px 9px;background:rgba(200,169,110,.14);color:var(--gold);font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;font-weight:600;}
  .stab td{padding:6px 9px;border-top:1px solid rgba(200,169,110,.14);color:var(--cream);vertical-align:top;}
  .rref{font-weight:700;color:var(--gold-light);white-space:nowrap;}
  .unv{color:var(--gold);font-style:italic;font-size:9.5px;font-weight:400;display:block;}
  .ask{display:inline-block;background:rgba(200,169,110,.22);border:1px solid var(--gold);color:var(--gold);border-radius:3px;padding:1px 7px;font-weight:700;font-size:10.5px;letter-spacing:.04em;}
  .rowlink{color:var(--gold);font-weight:700;text-decoration:underline;white-space:nowrap;}

  /* ── 3D scene ── */
  .toolbar{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;align-items:center;max-width:900px;margin:10px auto 8px;}
  .tbtn{background:rgba(200,169,110,.12);border:1px solid var(--gb);color:var(--gold-light);padding:7px 13px;border-radius:5px;font-size:11px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:all .15s;}
  .tbtn:hover{background:rgba(200,169,110,.26);color:var(--cream);}
  .tbtn.on{background:rgba(200,169,110,.3);border-color:var(--gold);color:var(--gold);}
  .tbtn:focus-visible{outline:2px solid #fff;outline-offset:2px;}
  .tbsep{width:1px;height:22px;background:var(--gb);margin:0 4px;}
  .scene{position:relative;height:min(66vh,620px);min-height:340px;margin:0 auto;max-width:1100px;
    background:radial-gradient(ellipse at 50% 26%,#2b3450 0%,#18213a 48%,#0a1020 100%);
    border:1px solid var(--gb);border-radius:10px;overflow:hidden;cursor:grab;touch-action:none;
    perspective:1700px;perspective-origin:50% 42%;}
  .scene:active{cursor:grabbing;}
  .scene:focus-visible{outline:2px solid var(--gold);outline-offset:2px;}
  .stage{position:absolute;left:50%;top:58%;width:0;height:0;transform-style:preserve-3d;
    transform:translateY(var(--lift,0px)) scale(var(--zoom,1)) rotateX(var(--pitch,0deg)) rotateY(var(--yaw,0deg));}
  .yard{position:absolute;transform-style:preserve-3d;}
  /* Olive carpet indoors, per the footage. */
  .floor{position:absolute;left:0;top:0;background:
      radial-gradient(ellipse at 50% 50%,rgba(146,142,104,.32),rgba(42,42,30,.88) 78%),
      repeating-linear-gradient(90deg,rgba(255,255,255,.03) 0 3px,rgba(0,0,0,0) 3px 7px);
    border:1px solid rgba(180,168,140,.16);}
  .fcomp{position:absolute;color:rgba(232,213,168,.78);font-size:12px;letter-spacing:.14em;white-space:nowrap;}
  .fc-n{left:50%;top:2%;transform:translateX(-50%) rotate(180deg);}
  .fc-s{left:50%;bottom:2%;transform:translateX(-50%);}
  .fc-w{left:5%;top:50%;transform:translateY(-50%) rotate(-90deg);transform-origin:center;}
  .fc-e{right:5%;top:50%;transform:translateY(-50%) rotate(90deg);transform-origin:center;}
  .face{position:absolute;left:0;top:0;backface-visibility:hidden;border:1px solid rgba(38,28,12,.55);}
  .face.side{filter:brightness(.82);}
  .face.top{display:flex;align-items:center;justify-content:center;overflow:hidden;}
  .slab-lbl{font-size:9px;font-weight:700;color:#2f2413;letter-spacing:.02em;white-space:nowrap;}
  /* The hit target floats a hair above the slab so it is never z-fighting the top face. */
  .hit{position:absolute;left:0;top:0;background:transparent;border:none;padding:0;cursor:pointer;
    display:flex;align-items:center;justify-content:center;text-decoration:none;}
  .hit:hover{background:rgba(255,255,255,.16);box-shadow:0 0 0 1px var(--gold);}
  .hit:focus-visible{outline:2px solid #fff;outline-offset:1px;z-index:40;}
  .hit.sel{background:rgba(255,255,255,.22);box-shadow:0 0 0 2px var(--gold),0 0 20px 4px rgba(255,255,255,.35);}
  .scene.dragging .hit:hover{background:transparent!important;box-shadow:none!important;}
  .hit-lbl{font-size:0;}
  .h-link{background:rgba(138,167,198,.28);box-shadow:inset 0 0 0 2px rgba(200,169,110,.85);}
  .h-link .hit-lbl{font-size:9px;font-weight:700;color:#0e1729;text-align:center;line-height:1.15;}
  .h-link .hit-lbl b{display:block;font-size:8px;color:#1a2744;}
  .hint{text-align:center;font-size:10px;color:var(--gold-light);opacity:.7;margin-top:7px;letter-spacing:.05em;}
  .modelnote{text-align:center;font-size:9.5px;color:var(--gold-light);opacity:.6;margin-top:3px;}

  /* ── Detail card ── */
  .card{position:fixed;right:16px;bottom:16px;width:286px;background:rgba(16,24,44,.97);border:1px solid var(--gold);
    border-radius:9px;padding:13px 15px;z-index:900;box-shadow:0 10px 40px rgba(0,0,0,.65);font-size:11px;display:none;pointer-events:none;}
  .card.show{display:block;}
  .card.pinned{pointer-events:auto;}
  .cardhd{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:2px;}
  .cardid{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:700;color:var(--gold);}
  .cardwall{font-size:9px;color:var(--gold-light);letter-spacing:.1em;text-transform:uppercase;}
  .cardsub{font-size:9.5px;color:var(--gold-light);opacity:.85;letter-spacing:.05em;margin-bottom:7px;}
  .cardask{display:inline-block;background:rgba(200,169,110,.22);border:1px solid var(--gold);color:var(--gold);
    border-radius:3px;padding:2px 9px;font-weight:700;font-size:12px;letter-spacing:.05em;margin-bottom:7px;}
  .cr{display:flex;justify-content:space-between;gap:10px;padding:2px 0;border-bottom:1px solid rgba(200,169,110,.1);}
  .cr:last-of-type{border:none;}
  .cl{color:var(--gold-light);}.cv{font-weight:600;color:var(--cream);text-align:right;}
  .cnote{margin-top:6px;font-size:9.5px;color:var(--gold-light);opacity:.85;font-style:italic;}
  .cardlink{display:inline-block;margin-top:8px;background:rgba(200,169,110,.2);border:1px solid var(--gold);
    color:var(--gold);border-radius:4px;padding:5px 10px;font-size:11px;font-weight:700;text-decoration:none;}
  .cclose{background:none;border:none;color:var(--gold-light);font-size:17px;line-height:1;cursor:pointer;padding:0 2px;}
  .cclose:hover{color:var(--cream);}
  @media (max-width:700px){.card{right:8px;left:8px;bottom:8px;width:auto;}}

  .printcard{display:none;}
  .pfoot{max-width:1000px;margin:14px auto 0;text-align:center;font-size:10px;color:var(--gold-light);line-height:1.6;}
  .pfoot b{color:var(--gold);font-weight:600;}
  .back-btn{flex-shrink:0;background:none;border:1px solid var(--gb);color:var(--gold-light);padding:9px 14px;border-radius:6px;font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap;text-decoration:none;}
  .back-btn:hover{background:rgba(200,169,110,.15);color:var(--cream);}
  .spacer{margin-left:auto;}
  .print-btn{flex-shrink:0;background:rgba(200,169,110,.15);border:1px solid var(--gold);color:var(--gold);padding:9px 16px;border-radius:6px;font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;cursor:pointer;white-space:nowrap;}
  .print-btn:hover{background:rgba(200,169,110,.28);}

  @media (max-width:640px){
    .header{padding:10px 12px;gap:9px;}
    .hlogo-svg{height:26px;}
    .htxt h1{font-size:14px;}
    .htxt p{font-size:9px;}
    .print-btn,.back-btn,.ecl-btn{padding:6px 11px;font-size:11px;}
    .spacer{margin-left:0;}
    .main{padding:8px;}
    .tab{padding:9px 11px;font-size:10px;}
    .toolbar{gap:5px;margin:8px auto 6px;}
    .tbtn{padding:6px 9px;font-size:10px;}
    .tbsep{display:none;}
    .scene{height:min(52vh,430px);min-height:300px;border-radius:8px;}
    .gwrap{padding:12px 10px;}
    .hint,.modelnote{font-size:9px;}
  }

  /* ── PRINT: the plan and the section list, no JS needed ── */
  @media print {
    .no-print,.tabs,.card,.toolbar,.view3d,.hint,.modelnote{display:none!important;}
    *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important;}
    body{background:#fff!important;color:#1a1a1a!important;}
    .header{background:#fff!important;border-bottom:2px solid #c8540a!important;padding:10px 0;}
    .htxt h1{color:#1a2744!important;}
    .htxt p{color:#555!important;}
    .wview{display:block!important;break-before:page;}
    #wall-plan{break-before:avoid!important;}
    body.pv-one .wview{display:none!important;}
    body.pv-one .wview.active{display:block!important;break-before:avoid!important;}
    body.has-printsel .printcard{display:block!important;border:2px solid #1a2744;border-radius:8px;
      padding:12px 16px;max-width:360px;margin:0 auto 14px;break-inside:avoid;font-size:11px;color:#1a1a1a;}
    .printcard .cclose{display:none!important;}
    .printcard .cardid{color:#1a2744!important;}
    .printcard .cardwall,.printcard .cardsub,.printcard .cl,.printcard .cnote{color:#444!important;}
    .printcard .cv{color:#111!important;}
    .printcard .cardask{color:#c8540a!important;border-color:#c8540a!important;background:#fff!important;}
    .wlabel{color:#1a2744!important;}
    .wsub,.li,.pfoot,.grphd{color:#444!important;}
    .gwrap{background:#fff!important;border:1px solid #999!important;}
    .plan{background:#fff!important;}
    .pcomp{color:#555!important;}
    .pfoot b,.rref{color:#1a2744!important;}
    .stab{background:#fff!important;border-color:#999!important;}
    .stab th{background:#eee!important;color:#1a2744!important;}
    .stab td{color:#1a1a1a!important;border-top-color:#ccc!important;}
    .ask{color:#c8540a!important;border-color:#c8540a!important;background:#fff!important;}
    .pcell.sel{outline:4px solid #c8540a!important;outline-offset:-2px;box-shadow:0 0 0 2px #1a2744!important;}
  }
`;

// ── Page runtime ──────────────────────────────────────────────────────────────
const SEC_JSON = JSON.stringify(Object.fromEntries(SECTIONS.map((s) => [s.id, {
  ref: s.ref, label: s.label, kind: s.kind, conf: s.conf,
  pos: positionsText(s), note: s.note, href: s.href || null,
  unv: !!s.labelUnverified, sel: isSelectable(s),
}])));

const JS = `
'use strict';
var SEC = ${SEC_JSON};
var KIND_LABEL = ${JSON.stringify(KIND_LABEL)};
var CONF_LABEL = ${JSON.stringify(CONF_LABEL)};
var ASK = ${JSON.stringify(ASK_LABEL)};
var HAS_INVENTORY = ${HAS_INVENTORY};

// ── Detail card ───────────────────────────────────────────────────────────────
var card = document.getElementById('card');
var pinned = null;

// THERE IS NO PRICE PATH. This page has no inventory: the card states what a section
// holds, how it is numbered when the drawing numbers it, and that availability and
// pricing come from us. When ELM's inventory is loaded, HAS_INVENTORY flips and a priced
// branch goes HERE — with the same rule the niche pages carry, that an unsellable
// position renders no dollar figure anywhere, aria-labels included.
function cardHtml(d) {
  var h = '<div class="cardhd"><span class="cardid">' + (d.ref || d.label) + '</span>' +
    '<span class="cardwall">' + (KIND_LABEL[d.kind] || '') + '</span>' +
    '<button class="cclose" type="button" aria-label="Close">\\u00d7</button></div>';
  h += '<div class="cardsub">' + d.label + '</div>';
  if (d.sel) h += '<div class="cardask">' + ASK + '</div>';
  h += '<div class="cr"><span class="cl">Holds</span><span class="cv">' + (KIND_LABEL[d.kind] || '') + '</span></div>';
  h += '<div class="cr"><span class="cl">Positions</span><span class="cv">' + d.pos + '</span></div>';
  h += '<div class="cr"><span class="cl">Placement</span><span class="cv">' + (CONF_LABEL[d.conf] || '') + '</span></div>';
  h += '<div class="cnote">' + d.note + '</div>';
  if (d.unv) h += '<div class="cnote">Please confirm this reference with us before writing it down.</div>';
  if (d.href) h += '<a class="cardlink" href="' + d.href + '">Open the columbarium map \\u2192</a>';
  else if (d.sel) h += '<div class="cnote">Availability and pricing are kept current against cemetery records \\u2014 ask us to confirm today\\u2019s status before writing.</div>';
  return h;
}

function clearSel() {
  var s = document.querySelectorAll('.sel');
  for (var i = 0; i < s.length; i++) s[i].classList.remove('sel');
}
function markSel(el) {
  clearSel();
  var id = el.getAttribute('data-sec');
  var all = document.querySelectorAll('[data-sec="' + id + '"]');
  for (var i = 0; i < all.length; i++) all[i].classList.add('sel');
}

// A section is rendered twice (3D hit target and flat plan cell). After a tab switch the
// element you clicked may sit inside a display:none view, where getBoundingClientRect()
// is all zeros — and a card placed against a zero rect lands on the tab bar and, being
// pinned and therefore pointer-events:auto, eats the tab clicks. Same fix as the GOMN and
// ECL pages: place against whichever rendering is actually laid out, else park the card.
function visibleTwin(el) {
  var id = el.getAttribute('data-sec');
  if (!id) return el;
  var all = document.querySelectorAll('[data-sec="' + id + '"]');
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
  var cw = card.offsetWidth || 286, ch = card.offsetHeight || 220;
  var x = r.right + 14, y = r.top + r.height / 2 - ch / 2;
  if (x + cw > window.innerWidth - 8) x = r.left - cw - 14;
  if (x < 8) x = Math.min(Math.max(8, r.right + 14), window.innerWidth - cw - 8);
  y = Math.max(8, Math.min(y, window.innerHeight - ch - 8));
  card.style.left = x + 'px'; card.style.top = y + 'px';
}
function setPrintCard(d) {
  document.getElementById('printcard').innerHTML = cardHtml(d);
  document.body.classList.add('has-printsel');
}
function showCard(el, pin) {
  var d = SEC[el.getAttribute('data-sec')];
  if (!d) return;
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
}

document.addEventListener('click', function (ev) {
  if (ev.target.closest('.cclose')) { hideCard(); return; }
  // A link zone NAVIGATES. Never intercept it: the whole point of the zone is that it
  // takes you to the columbarium's own map.
  if (ev.target.closest('a[href]')) return;
  var n = ev.target.closest('button[data-sec]');
  if (n) { showCard(n, true); return; }
  if (!ev.target.closest('#card, .tab, .tbtn')) hideCard();
});
document.addEventListener('mouseover', function (ev) {
  if (window.matchMedia('(hover: none)').matches) return;
  if (last || glideRaf) return;
  var n = ev.target.closest('[data-sec]');
  if (n && SEC[n.getAttribute('data-sec')]) showCard(n, false);
  else if (pinned) showCard(pinned, false);
});
document.addEventListener('focusin', function (ev) {
  var n = ev.target.closest('button[data-sec]');
  if (!n) return;
  var kb = true;
  try { kb = n.matches(':focus-visible'); } catch (e) { kb = true; }
  if (kb) showCard(n, true);
});
document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') hideCard(); });

// ── Tabs ──────────────────────────────────────────────────────────────────────
function showView(v) {
  var views = document.querySelectorAll('.wview, .view3d');
  for (var i = 0; i < views.length; i++) views[i].classList.remove('active');
  var el = document.getElementById(v === '3d' ? 'view-3d' : 'wall-' + v);
  if (el) el.classList.add('active');
  var tabs = document.querySelectorAll('.tabs .tab');
  for (var j = 0; j < tabs.length; j++) tabs[j].classList.toggle('active', tabs[j].getAttribute('data-view') === v);
  document.body.classList.toggle('pv-one', v !== '3d');
  if (v === '3d') fitScene();
}
document.querySelectorAll('.tabs .tab').forEach(function (t) {
  t.addEventListener('click', function () { showView(t.getAttribute('data-view')); });
});

// ── 3D camera ─────────────────────────────────────────────────────────────────
var scene = document.getElementById('scene'), stage = document.getElementById('stage');
var cam = { yaw: -28, pitch: -46, zoom: 1, lift: 0 };
var ZMIN = 0.12, ZMAX = 3, PMIN = -90, PMAX = 0;
var HALF_PX = ${px(MAX_H / 2)};
var STAGE_TOP = 0.58;
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
function fitScene() {
  if (!scene.offsetWidth) return;
  viewTo(curPreset || 'room', true);
}
window.addEventListener('resize', fitScene);

var curPreset = null;
var SW = ${px(SITE_W)}, SD = ${px(SITE_D)}, FIT_H_PX = ${px(MAX_H)};
// The plan is flat and wide, so every preset is fitted against the ROTATED FOOTPRINT plus
// whatever the tallest bank projects at that pitch — the same exact perspective solve the
// niche pages use, so nothing is ever cropped by the scene box.
function fp(yaw, pitch) {
  var cy = Math.abs(Math.cos(yaw * RAD)), sy = Math.abs(Math.sin(yaw * RAD));
  var w = SW * cy + SD * sy;
  var h = FIT_H_PX * Math.abs(Math.cos(pitch * RAD)) + (SW * sy + SD * cy) * Math.abs(Math.sin(pitch * RAD));
  return { yaw: yaw, pitch: pitch, w: w, h: h, dist: 0 };
}
var VIEWS = {
  room: fp(-28, -46),
  plan: fp(0, -88),
  north: fp(0, -22),
  south: fp(180, -22),
  west: fp(-90, -22),
};
function viewTo(k, quiet) {
  if (!pinned && !quiet) card.classList.remove('show');
  easeThrough(function () { setView(k); }, quiet);
}
function setView(k) {
  var v = VIEWS[k];
  curPreset = k;
  cam.yaw = v.yaw;
  cam.pitch = v.pitch;
  var Tw = scene.clientWidth * 0.90, Th = scene.clientHeight * 0.84, P = 1700;
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

// Drag to orbit / pinch to zoom. Capture is DEFERRED until a real drag (>8px) or a second
// finger — capturing on pointerdown retargets the click to the scene and a tap on a bank
// never reaches the button (the MVC page's tap bug, MISTAKES #18).
var pts = {}, last = null, pinchStart = 0, zoomStart = 1, moved = 0, captured = false;
var downSec = null, downAt = 0, downHref = null;
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
    var n = ev.target.closest('[data-sec]');
    downSec = (n && n.tagName === 'BUTTON') ? n : null;
    var a = ev.target.closest('a[href]');
    downHref = a ? a : null;
    downAt = performance.now();
  } else {
    downSec = null; downHref = null;
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
    // A tap on the columbarium zone must still NAVIGATE even though the scene swallows
    // the native click that follows a pointer gesture. Travel decides it is a tap; the
    // navigation is then performed explicitly.
    if (tap && downHref) { var h = downHref.getAttribute('href'); downSec = null; downHref = null; last = null; pinchStart = 0; moved = 0; window.location.href = h; return; }
    if (tap && downSec) showCard(downSec, true);
    else if (tap && !downSec && !ev.target.closest('#card')) hideCard();
    downSec = null; downHref = null;
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

fitScene();
apply();
`;

// ── Assemble ──────────────────────────────────────────────────────────────────
const LOGO = fs.readFileSync(path.join(ROOT, 'scripts', 'bw-logo.svg.txt'), 'utf8').trim();
const N_SEC = SECTIONS.length;
const N_SEL = SECTIONS.filter(isSelectable).length;

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bonney Watson — Eternal Light Mausoleum</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
<!-- Generated by scripts/build_elm_map.mjs from scripts/elm-building-data.mjs. Do not hand-edit. -->
<style>${CSS}</style>
</head>
<body>
<div class="header">
  ${LOGO}
  <div class="htxt">
    <h1>Eternal Light Mausoleum — Crypt Map</h1>
    <p>Washington Memorial Park &nbsp;·&nbsp; layout schematic, not to scale</p>
  </div>
  <a class="ecl-btn no-print spacer" href="${ECL_HREF}">Columbarium niche map &rarr;</a>
  <a class="back-btn no-print" href="../">&larr; Quote Tool</a>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
</div>
<div class="tabs">
  <button class="tab active" data-view="3d">3D View</button>
  <button class="tab" data-view="plan">Plan</button>
  <button class="tab" data-view="list">Sections</button>
</div>
<div class="main">
  <div class="printcard" id="printcard" aria-hidden="true"></div>

  <div class="view3d active" id="view-3d">
    <div class="toolbar no-print">
      <button class="tbtn" data-viewbtn="room" title="Three-quarter view of the whole building">Room view</button>
      <button class="tbtn" data-viewbtn="plan" title="Straight down">Plan</button>
      <button class="tbtn" data-viewbtn="north" title="Looking from the north">From north</button>
      <button class="tbtn" data-viewbtn="south" title="Looking from the south">From south</button>
      <button class="tbtn" data-viewbtn="west" title="Looking from the west">From west</button>
      <div class="tbsep"></div>
      <button class="tbtn" id="btn-reset">Reset view</button>
      <div class="tbsep"></div>
      <button class="tbtn" id="btn-out" aria-label="Zoom out">&minus;</button>
      <button class="tbtn" id="btn-in" aria-label="Zoom in">+</button>
    </div>
${scene3d()}
    <div class="hint">Drag to orbit &nbsp;·&nbsp; scroll or pinch to zoom &nbsp;·&nbsp; tap a section to see what it holds &nbsp;·&nbsp; arrow keys orbit, +/&minus; zoom</div>
    <div class="modelnote">${N_SEC} named sections, ${N_SEL} of them selectable &nbsp;·&nbsp; the highlighted block at the south end is the columbarium — tap it for its own niche map &nbsp;·&nbsp; layout schematic, not to scale, and no dimensions are shown</div>
    <div class="eclbar">The <b>Eternal Light Columbarium</b> stands inside this building and has its own glass-front niche map. <a href="${ECL_HREF}">Open the columbarium niche map &rarr;</a></div>
    ${LEGEND}
  </div>

${planView()}
${listView()}

  <div class="pfoot">
    <b>This map shows WHERE each section is, not what is for sale in it.</b><br>
    Availability and pricing are kept current against cemetery records — ask us to confirm today’s status before writing.<br>
    Relative positions follow the cemetery’s own drawing of this building; the plan is schematic and is not to scale.
  </div>
</div><!-- /main -->

<aside class="card no-print" id="card" role="dialog" aria-live="polite" aria-label="Section detail"></aside>

<script>
${JS}
</script>
</body>
</html>
`;

fs.writeFileSync(OUT, HTML.replace(/\r?\n/g, '\r\n'), 'utf8');
console.log(`wrote ${path.relative(ROOT, OUT)} — ${(fs.statSync(OUT).size / 1024).toFixed(1)} KB, ${N_SEC} sections (${N_SEL} selectable), 0 prices, 0 statuses`);
