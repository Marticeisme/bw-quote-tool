/**
 * Generates MAPS/TG_Mausoleum_Map.html from scripts/tg-maus-data.mjs.
 *
 * Same architecture as build_com_map.mjs / build_ecl_map.mjs / build_gomn_map.mjs:
 * data module -> build script -> verification with sabotages. Never hand-edit the HTML.
 *
 *   node scripts/build_tg_maus_map.mjs
 *
 * ── WHY THIS ONE IS A PLAN AND NOT A 3D SCENE ────────────────────────────────
 * The niche pages model ONE cabinet or ONE wall, where a CSS-3D orbit earns its keep: a
 * counselor is choosing between niches on faces they cannot all see at once. This page
 * models a WHOLE BUILDING — two wings, a family-room block, a courtyard and a long
 * tandem bank — and the question it answers is "where in the building is this, and what
 * is next to it". That is a plan-view question. An orbit would add
 * scripts/map-movement.mjs's inertia, gesture and hover machinery to a page with nothing
 * to orbit, and would make the one thing that matters — the relationship between the
 * courtyard and the path map it links to — harder to read, not easier. Revisit if a
 * later ship gives individual crypts their own faces.
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
} from './tg-maus-data.mjs';

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
  .wview{display:none;}.wview.active{display:block;}
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
    .no-print,.tabs,.card{display:none!important;}
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
      '<div class="cnote">' + ASK + ' The number of crypts still open in this bank is confirmed with us, not read off this map.</div>';
  }
  return head +
    '<div class="cardsub">' + (WING_LABEL[d.wing] || '') + ' \\u00b7 bank ' + d.n + '</div>' +
    '<div class="cardkinds">' + KINDS.join(' &middot; ') + ' crypts</div>' +
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
  // The courtyard link is a real navigation: never swallow it.
  if (ev.target.closest('.court')) return;
  var n = ev.target.closest('.bk, .lrow');
  if (n && n.hasAttribute('data-ref')) { showCard(n, true); return; }
  if (!ev.target.closest('#card, .tab')) hideCard();
});
document.addEventListener('mouseover', function (ev) {
  if (window.matchMedia('(hover: none)').matches) return;
  var n = ev.target.closest('.bk, .lrow');
  if (n && n.hasAttribute('data-ref')) showCard(n, false);
  else if (pinned) showCard(pinned, false);
});
document.addEventListener('focusin', function (ev) {
  var n = ev.target.closest('.bk, .lrow');
  if (!n || !n.hasAttribute('data-ref')) return;
  var kb = true;
  try { kb = n.matches(':focus-visible'); } catch (e) { kb = true; }
  if (kb) showCard(n, true);
});
document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') hideCard(); });

var VIEWS = ['plan', 'banks'];
function showView(v) {
  var views = document.querySelectorAll('.wview');
  for (var i = 0; i < views.length; i++) views[i].classList.remove('active');
  var el = document.getElementById('view-' + v);
  if (el) el.classList.add('active');
  var tabs = document.querySelectorAll('.tabs .tab');
  for (var j = 0; j < tabs.length; j++) tabs[j].classList.toggle('active', tabs[j].getAttribute('data-view') === v);
  document.body.classList.toggle('pv-one', VIEWS.indexOf(v) > -1);
  if (pinned) placeCard(pinned);
}
document.querySelectorAll('.tabs .tab').forEach(function (t) {
  t.addEventListener('click', function () { showView(t.getAttribute('data-view')); });
});
showView('plan');
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
  <button class="tab active" data-view="plan">Site Plan</button>
  <button class="tab" data-view="banks">Crypt Banks</button>
</div>
<div class="main">
  <div class="wview active" id="view-plan">
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
