/**
 * Generates MAPS/GOMN_NicheMap.html from scripts/gomn-niche-data.mjs.
 *
 * The Garden of Meditation niche wall is an OUTDOOR STEPPED GRANITE WALL, and the
 * operator's decision for it is 2D: no CSS-3D scene, just an accurate flat elevation in
 * the same flat-grid style the three glass-front maps use for their wall tabs and their
 * print output, with the same card / selection / print conventions.
 *
 * Everything on the page is STATIC HTML emitted from the one dataset, so the four views
 * cannot drift from each other. Statuses and prices are live hand-maintained data: edit
 * scripts/gomn-niche-data.mjs and rebuild — never hand-edit the HTML.
 *
 * No niche dimensions are shown anywhere: the sheets carry none. No photograph ships on
 * the page: the plates in every one of the operator's photos are legible names.
 *
 *   node scripts/build_gomn_map.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ROWS, BLOCK_ORDER, BLOCKS, ROW_RUNS, TIERS, FEES, FEE_SOURCE, INSCR_MAX, URN,
  SHEET_TEXT, COMPANION_NOTE, STATUS_LABEL, allNiches, sellable, runsIn,
  AVAILABILITY, LISTED_NO_PRICE, refOf,
} from './gomn-niche-data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'MAPS', 'GOMN_NicheMap.html');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = (n) => '$' + n.toLocaleString('en-US');
const tier = (p) => {
  const t = TIERS.find((x) => x.p === p);
  // A price with no tier means the data module and the tier ramp disagree — refuse to
  // emit a page rather than ship a colourless chip nobody notices.
  if (!t) throw new Error(`price ${p} has no entry in TIERS — add it to scripts/gomn-niche-data.mjs`);
  return t;
};

const ALL = allNiches();
const byBlock = (b) => (b === 'full' ? ALL : ALL.filter((n) => n.block === b));
const colRange = (b) => (b === 'full' ? [1, 32] : BLOCKS[b].cols);
const viewLabel = (b) => (b === 'full' ? 'Full Wall' : BLOCKS[b].label);

// ── One niche cell ────────────────────────────────────────────────────────────
function nicheAttrs(n, rend) {
  return `data-ref="${n.ref}" data-id="${n.id}" data-block="${n.block}" data-rend="${rend}"` +
    ` data-row="${n.row}" data-col="${n.col}" data-price="${sellable(n) ? n.p : ''}" data-st="${n.st}"`;
}
function ariaName(n) {
  // An unavailable niche carries no price in ANY rendering, screen readers included.
  if (!sellable(n)) return `${n.ref}, ${BLOCKS[n.block].label}, row ${n.row}, space ${n.col}, ${STATUS_LABEL[n.st]}`;
  return `${n.ref}, ${BLOCKS[n.block].label}, row ${n.row}, space ${n.col}, ${money(n.p)}, available`;
}

function cellHtml(n, rend, lo, rows) {
  const st = n.st !== 'available' ? ` st-${n.st}` : '';
  const chip = sellable(n) ? `<span class="nprice ${tier(n.p).c}">${money(n.p)}</span>` : '';
  const badge = n.st !== 'available' ? `<span class="nstatus">${esc(STATUS_LABEL[n.st])}</span>` : '';
  const gr = rows.indexOf(n.row) + 1;
  const gc = n.col - lo + 2;
  return `      <button type="button" class="n${st}" style="grid-row:${gr};grid-column:${gc}" ${nicheAttrs(n, rend)} aria-label="${esc(ariaName(n))}"><span class="nid">${n.row}-${n.col}</span>${chip}${badge}</button>`;
}

// ── The stepped wall grid ─────────────────────────────────────────────────────
/** The rows a block actually carries — the wings stop at E, so their views do too. */
const rowsIn = (block) => ROWS.filter((r) => runsIn(r, block).length > 0);

function grid(block) {
  const [lo, hi] = colRange(block);
  const nCols = hi - lo + 1;
  const rows = rowsIn(block);
  const parts = [];

  // The granite carcass behind each run of niches. A run whose columns are open sky in
  // the row above gets the stone coping band that makes the stepped silhouette read.
  rows.forEach((r, ri) => {
    for (const [a, b] of runsIn(r, block)) {
      const above = ri === 0 ? [] : runsIn(rows[ri - 1], block);
      const capped = !above.some(([x, y]) => x <= a && y >= b);
      parts.push(`      <div class="run${capped ? ' capped' : ''}" style="grid-row:${ri + 1};grid-column:${a - lo + 2}/span ${b - a + 1}" aria-hidden="true"></div>`);
    }
  });

  // Row letters down both sides, exactly as the sheet prints them.
  rows.forEach((r, ri) => {
    parts.push(`      <div class="rlbl" style="grid-row:${ri + 1};grid-column:1" aria-hidden="true">${r}</div>`);
    parts.push(`      <div class="rlbl" style="grid-row:${ri + 1};grid-column:${nCols + 2}" aria-hidden="true">${r}</div>`);
  });

  for (const n of byBlock(block)) parts.push(cellHtml(n, block, lo, rows));

  // Column numbers along the bottom.
  for (let c = lo; c <= hi; c++) {
    parts.push(`      <div class="clbl" style="grid-row:${rows.length + 1};grid-column:${c - lo + 2}" aria-hidden="true">${c}</div>`);
  }

  return `    <div class="fgrid fg-${block}" style="grid-template-columns:var(--lw) repeat(${nCols},var(--cw)) var(--lw);grid-template-rows:repeat(${rows.length},var(--rh)) var(--lh);">
${parts.join('\n')}
    </div>`;
}

function legendHtml(prices) {
  return TIERS.filter((t) => prices.includes(t.p))
    .map((t) => `<div class="li"><div class="ls ${t.c}"></div><span>${t.l}</span></div>`).join('');
}
const STATUS_LEG = `<div class="rightsleg">
      <div class="li"><div class="ls stleg-a"></div><span>Available &mdash; price shown</span></div>
      <div class="li"><div class="ls stleg-u"></div><span>Not available &mdash; confirm in MIS</span></div>
    </div>`;

function view(block) {
  const ns = byBlock(block);
  const avail = ns.filter(sellable);
  const [lo, hi] = colRange(block);
  const sub = block === 'full'
    ? `Spaces ${lo}&ndash;${hi} &nbsp;·&nbsp; Row A = bottom, G = top &nbsp;·&nbsp; ${ns.length} niches, ${avail.length} available`
    : `${esc(BLOCKS[block].short)} &nbsp;·&nbsp; Rows ${rowsIn(block)[rowsIn(block).length - 1]}&ndash;${rowsIn(block)[0]}, A = bottom &nbsp;·&nbsp; ${ns.length} niches, ${avail.length} available`;
  return `  <div class="wview${block === 'full' ? ' wfull active' : ''}" id="wall-${block}" data-wview="${block}">
    <div class="wlabel">${esc(viewLabel(block))}</div>
    <div class="wsub">${sub}</div>
    <div class="gwrap">
${grid(block)}
    </div>
    <div class="legend">${legendHtml(avail.map((n) => n.p))}</div>
    ${STATUS_LEG}
  </div>`;
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const TIER_CSS = TIERS.map((t) => `  .${t.c}{background:${t.bg};color:${t.fg};}`).join('\n');

const CSS = `
  :root{--navy:#1a2744;--navy-light:#243156;--gold:#c8a96e;--gold-light:#e8d5a8;--cream:#f7f4ef;--gb:rgba(200,169,110,0.45);
    --lw:20px;--lh:20px;--cw:50px;--rh:58px;}
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
  .wview{display:none;}.wview.active{display:block;}
  .wlabel{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:var(--gold);margin-bottom:2px;margin-top:10px;text-align:center;}
  .wsub{font-size:10px;color:var(--gold-light);letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px;text-align:center;}
  .gwrap{background:linear-gradient(160deg,#0f1a30,#1a2744 60%,#0d1528);border:1px solid var(--gb);border-radius:8px;
    padding:22px 16px 12px;overflow-x:auto;max-width:1800px;margin:0 auto;}
  .fgrid{display:grid;gap:3px;margin:0 auto;width:max-content;}
  .fg-L,.fg-R{--cw:88px;--rh:68px;}
  .fg-C{--cw:64px;--rh:68px;}
  .rlbl{display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:13px;font-weight:700;color:var(--gold);}
  .clbl{display:flex;align-items:flex-start;justify-content:center;font-size:9px;font-weight:600;color:var(--gold);letter-spacing:.02em;padding-top:3px;}

  /* ── The wall itself ──
     Polished black granite with bronze plates and bronze vase holders, taken from the
     operator's photographs of the Garden of Meditation wall. The carcass sits BEHIND
     the niche cells and shows through the 3px joints, so the wall reads as one stone
     mass rather than a table. A run whose columns are open sky above it gets the stone
     coping band — that band is what draws the stepped silhouette. */
  .run{background:linear-gradient(180deg,#22242a,#15161a);border-radius:2px;z-index:0;}
  .run.capped{box-shadow:0 -6px 0 0 #4e535c,0 -8px 0 0 #2b2e34;}

  /* A niche front: polished black granite, a bronze plate rule at the top edge, and the
     specular sheen the photographs show on the polished face. */
  .n{position:relative;z-index:1;border-radius:2px;border:1px solid #0b0c0e;cursor:pointer;
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
    transition:transform .15s,box-shadow .15s,filter .15s;text-align:center;padding:2px;
    line-height:1.25;font-size:8.5px;min-width:0;overflow:hidden;font-family:'Jost',sans-serif;color:#e6dcc6;
    background:
      linear-gradient(118deg,rgba(255,255,255,.13) 0%,rgba(255,255,255,.02) 26%,rgba(255,255,255,0) 46%),
      linear-gradient(180deg,#4a4d55 0%,#2e3138 42%,#191b1f 100%);
    box-shadow:inset 0 1px 0 rgba(214,178,110,.55),inset 0 -6px 10px -6px rgba(0,0,0,.85);}
  .n:hover{transform:scale(1.09);border-color:var(--gold);z-index:10;box-shadow:0 4px 16px rgba(0,0,0,.6),0 0 0 1px var(--gold);}
  .n:focus-visible{outline:2px solid #fff;outline-offset:1px;z-index:20;}
  .n.sel{outline:3px solid #fff;outline-offset:-3px;z-index:25;transform:scale(1.04);
    filter:brightness(1.2) saturate(1.1);
    box-shadow:0 0 0 2px var(--gold),0 0 22px 4px rgba(255,255,255,.42);}
  .nid{font-size:8.5px;opacity:.72;letter-spacing:.02em;}
  /* PRICE LEGIBILITY (operator, Map Issues 07.31.26: "very hard to read"). The chip is
     the one thing a counselor reads across the room, so it is sized first and the cell
     is tracked to fit it — full wall 9.5→12px, block views 11→14px, with the column
     width moved 44→50px (full) and 60/84→64/88px (blocks) so nothing clips. */
  .nprice{font-weight:600;font-size:12px;padding:0 4px;border-radius:3px;box-shadow:0 1px 2px rgba(0,0,0,.45);white-space:nowrap;letter-spacing:-.01em;}
  .nstatus{font-size:5.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;
    padding:0 3px;border-radius:2px;background:rgba(255,255,255,.86);color:#17181b;white-space:nowrap;}
  /* On the 32-space full wall a cell is 44px: "CONFIRM IN MIS" does not fit, so the
     badge is dropped there and the hatch, the dashed outline and the legend carry the
     status. The three block views are wide enough to spell it out. */
  .fg-full .nstatus{display:none;}
  .fg-L .nprice,.fg-R .nprice,.fg-C .nprice{font-size:14px;padding:0 6px;}
  .fg-L .nid,.fg-R .nid,.fg-C .nid{font-size:9.5px;}

  /* ── Status code (operator's fail-safe rule) ──
     A printed price means AVAILABLE; anything else means UNAVAILABLE. The two are
     separated by PATTERN and BRIGHTNESS, never by hue — every hue on this page belongs
     to a price tier. An unavailable niche is the same granite, gone matte and dull
     under a frosted diagonal hatch, with a white CONFIRM IN MIS badge and no money
     anywhere on it. */
  .st-unavailable{color:#cfc7b6;
    background:
      repeating-linear-gradient(135deg,rgba(255,255,255,.16) 0 3px,rgba(255,255,255,0) 3px 7px),
      linear-gradient(180deg,#3a3c40 0%,#2a2c30 55%,#202225 100%)!important;
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.06)!important;}
  .st-unavailable::before{content:'';position:absolute;inset:1px;pointer-events:none;
    border:1px dashed rgba(232,213,168,.34);border-radius:inherit;}

${TIER_CSS}
  .stleg-a{background:linear-gradient(180deg,#4a4d55,#191b1f);box-shadow:inset 0 1px 0 rgba(214,178,110,.7);}
  .stleg-u{background:
      repeating-linear-gradient(135deg,rgba(255,255,255,.16) 0 2px,rgba(255,255,255,0) 2px 4px),
      linear-gradient(180deg,#3a3c40,#202225);border:1px dashed rgba(232,213,168,.5)!important;}

  .legend{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px;justify-content:center;}
  .li{display:flex;align-items:center;gap:5px;font-size:10px;color:var(--gold-light);}
  .ls{width:13px;height:13px;border-radius:2px;border:1px solid rgba(255,255,255,.2);flex-shrink:0;}
  .rightsleg{display:flex;flex-wrap:wrap;gap:14px;margin-top:6px;justify-content:center;}
  .hint{text-align:center;font-size:10px;color:var(--gold-light);opacity:.7;margin-top:9px;letter-spacing:.05em;}

  /* ── Detail card ── */
  .card{position:fixed;right:16px;bottom:16px;width:296px;background:rgba(16,24,44,.97);border:1px solid var(--gold);
    border-radius:9px;padding:13px 15px;z-index:900;box-shadow:0 10px 40px rgba(0,0,0,.65);font-size:11px;display:none;}
  .card.show{display:block;}
  /* A HOVER card is display-only: taps pass through it to the niche beneath. Only a
     pinned card takes pointer events. */
  .card{pointer-events:none;}
  .card.pinned{pointer-events:auto;}
  .cardhd{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:2px;}
  .cardid{font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:700;color:var(--gold);}
  .cardwall{font-size:9px;color:var(--gold-light);letter-spacing:.1em;text-transform:uppercase;}
  .cardmis{font-size:9.5px;color:var(--gold-light);opacity:.8;letter-spacing:.05em;margin-bottom:7px;}
  .cardst{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#ffd9a0;margin-bottom:6px;}
  .cr{display:flex;justify-content:space-between;gap:10px;padding:2px 0;border-bottom:1px solid rgba(200,169,110,.1);}
  .cr:last-of-type{border:none;}
  .cl{color:var(--gold-light);}.cv{font-weight:600;color:var(--cream);text-align:right;}
  .ctot{margin-top:6px;padding-top:6px;border-top:1px solid var(--gold);display:flex;justify-content:space-between;}
  .ctl{color:var(--gold);font-weight:600;}.ctv{color:var(--gold);font-weight:700;font-size:13px;}
  .cnote{margin-top:5px;font-size:9px;color:var(--gold-light);opacity:.85;font-style:italic;line-height:1.45;}
  .cclose{background:none;border:none;color:var(--gold-light);font-size:17px;line-height:1;cursor:pointer;padding:0 2px;}
  .cclose:hover{color:var(--cream);}
  @media (max-width:700px){.card{right:8px;left:8px;bottom:8px;width:auto;}}

  /* ── Fees / rules footer ── */
  .fees{margin-top:14px;background:rgba(200,169,110,.07);border:1px solid var(--gb);border-radius:6px;padding:11px 13px;display:flex;flex-wrap:wrap;gap:12px;max-width:960px;margin-left:auto;margin-right:auto;justify-content:center;}
  .fi{font-size:11px;}.fl{color:var(--gold);font-weight:600;display:block;margin-bottom:1px;}.fv{color:var(--cream);}
  .fees input[type=number]{width:42px;background:rgba(200,169,110,.12);border:1px solid var(--gold);border-radius:3px;color:var(--cream);padding:2px 4px;font-family:'Jost',sans-serif;font-size:12px;text-align:center;}
  /* Every add-on is a QUANTITY box now — the inscription became one on 2026-07-31
     ("you can add two inscriptions on the front") and the Interlude Urn is one by
     nature. So the footer is a single uniform row of qty controls; the old checkbox
     chrome is gone. */
  .fnote{font-size:9px;color:var(--gold-light);opacity:.8;letter-spacing:.02em;}
  .fi-urn .fl{color:var(--gold-light);}
  .fi-urn{border-left:1px solid var(--gb);padding-left:12px;}
  .printcard{display:none;}
  .rules{max-width:960px;margin:12px auto 0;background:rgba(200,169,110,.05);border:1px solid var(--gb);border-radius:6px;padding:12px 16px;}
  .rules h3{font-family:'Cormorant Garamond',serif;font-size:14px;color:var(--gold);font-weight:600;margin-bottom:6px;letter-spacing:.04em;}
  .rules ul{list-style:none;}
  .rules li{font-size:10.5px;color:var(--gold-light);line-height:1.65;padding-left:13px;position:relative;}
  .rules li::before{content:'\\2022';position:absolute;left:0;color:var(--gold);}
  .rules li b{color:var(--cream);font-weight:600;}
  .rules .quote{color:var(--cream);font-style:italic;}
  .rules .shout{color:#ffcf7a;font-weight:700;letter-spacing:.08em;}
  .pfoot{max-width:960px;margin:10px auto 0;text-align:center;font-size:10px;color:var(--gold-light);line-height:1.6;}
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
    .gwrap{padding:18px 8px 10px;}
    .fg-L,.fg-R{--cw:80px;}
    .fg-C{--cw:62px;}
    .hint{font-size:9px;}
  }

  /* ── PRINT: the flat grids, no JS needed ──
     The wall is 32 spaces wide, so the sheet is landscape. The full-wall grid is
     re-tracked to fit the page rather than scaled, so the type stays crisp. */
  @page{size:landscape;margin:0.4in;}
  @media print {
    .no-print,.tabs,.card,.hint{display:none!important;}
    *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important;}
    body{background:#fff!important;color:#1a1a1a!important;}
    .header{background:#fff!important;border-bottom:2px solid #c8540a!important;padding:8px 0;}
    .htxt h1{color:#1a2744!important;}
    .htxt p{color:#555!important;}
    /* Default print = the full wall. A block tab narrows it to that block; a highlighted
       niche narrows it further to the block that niche is in (operator). The later
       rules outrank the earlier ones, so scope always follows the tighter intent. */
    .wview{display:none!important;}
    .wview.wfull{display:block!important;break-before:avoid!important;}
    body.pv-one .wview{display:none!important;}
    body.pv-one .wview.active{display:block!important;break-before:avoid!important;}
    body.pv-sel .wview{display:none!important;}
    body.pv-sel .wview.printsel{display:block!important;break-before:avoid!important;}
    /* The highlighted niche prints its full pricing card too. */
    body.has-printsel .printcard{display:block!important;border:2px solid #1a2744;border-radius:8px;
      padding:11px 15px;max-width:380px;margin:0 auto 12px;break-inside:avoid;font-size:11px;color:#1a1a1a;}
    .printcard .cclose{display:none!important;}
    .printcard .cardid{color:#1a2744!important;}
    .printcard .cardwall,.printcard .cardmis,.printcard .cl,.printcard .cnote{color:#444!important;}
    .printcard .cv{color:#111!important;}
    .printcard .cardst{color:#b02818!important;}
    .printcard .ctl,.printcard .ctv{color:#c8540a!important;}
    .printcard .ctot{border-top:1px solid #c8540a;}
    .printcard .cr{border-bottom:1px solid #ddd;}
    .wlabel{color:#1a2744!important;margin-top:4px;}
    .wsub,.li,.pfoot,.rules li{color:#444!important;}
    .gwrap{background:#fff!important;border:1px solid #999!important;overflow:visible!important;padding:16px 4px 8px;max-width:none;}
    .rlbl,.clbl,.pfoot b,.fl,.rules h3{color:#1a2744!important;}
    .rules{background:#f8f7f4!important;border-color:#c8a96e!important;}
    .rules li b,.rules .quote{color:#111!important;}
    .rules .shout{color:#b02818!important;}
    /* On paper the polished-granite wall becomes an outline drawing. A counselor prints
       this to hand to a family; 168 near-black cells is a toner brick and reads worse
       than line work. Status is still pattern-coded and the price chips keep their tier
       colours, so nothing the screen says is lost. */
    .run{background:#eceae5!important;}
    .run.capped{box-shadow:0 -5px 0 0 #cdcac3!important;}
    .n{background:#fff!important;color:#222!important;border:1px solid #8d8d8d!important;box-shadow:none!important;}
    .nid{color:#555!important;}
    .st-unavailable{color:#555!important;
      background:repeating-linear-gradient(135deg,rgba(0,0,0,.13) 0 3px,rgba(0,0,0,0) 3px 7px),#f2f1ee!important;}
    .st-unavailable::before{border-color:#a8a8a8!important;}
    .nstatus{background:#fff!important;color:#333!important;}
    .stleg-a{background:#fff!important;box-shadow:none!important;border:1px solid #8d8d8d!important;}
    .stleg-u{background:repeating-linear-gradient(135deg,rgba(0,0,0,.13) 0 2px,rgba(0,0,0,0) 2px 4px),#f2f1ee!important;border:1px dashed #a8a8a8!important;}
    /* Re-track for the page: 32 spaces have to fit inside a landscape Letter. */
    /* The paper track is the tight one: 32 spaces plus two row-letter gutters have to
       fit inside a landscape Letter page (10.2in ≈ 979px at 96dpi). 32×27 + 31×2 gaps +
       2×16 gutters = 958px, which is what lets the printed chip go 6.5→7.5px. */
    .fgrid{--lw:16px;--lh:15px;--cw:27px;--rh:36px;gap:2px;}
    .fg-L,.fg-R{--cw:70px;--rh:44px;}
    .fg-C{--cw:54px;--rh:44px;}
    .nid{font-size:6.5px;}
    .nprice{font-size:7.5px;padding:0 1px;box-shadow:none;}
    .nstatus{font-size:4.5px;padding:0 1px;}
    .fg-L .nid,.fg-R .nid,.fg-C .nid{font-size:8.5px;}
    .fg-L .nprice,.fg-R .nprice,.fg-C .nprice{font-size:11px;padding:0 3px;}
    .fg-L .nstatus,.fg-R .nstatus,.fg-C .nstatus{font-size:5.5px;padding:0 2px;}
    .n.sel{outline:4px solid #c8540a!important;outline-offset:-2px;
      box-shadow:0 0 0 2px #1a2744!important;filter:none!important;transform:none!important;}
    .fv{color:#333!important;}
    .fees{background:#f5f5f2!important;border-color:#c8a96e!important;}
    .fees input[type=number]{border:1px solid #999!important;background:#fff!important;color:#1a1a1a!important;}
    .fnote,.fi-urn .fl{color:#444!important;}
    .fi-urn{border-left-color:#c8a96e!important;}
    .printcard .cnote em{color:#444!important;}
  }
`;

// ── Page runtime ──────────────────────────────────────────────────────────────
const BLOCK_LABEL_JSON = JSON.stringify(
  Object.fromEntries(Object.keys(BLOCKS).map((b) => [b, BLOCKS[b].label])));

const JS = `
'use strict';
var OC = ${FEES.OC}, REC = ${FEES.REC}, INSCR = ${FEES.INSCR}, TAX = ${FEES.TAX};
var URN_NAME = ${JSON.stringify(URN.name)}, URN_PRICE = ${URN.price};
var STATUS_LABEL = ${JSON.stringify(STATUS_LABEL)};
var BLOCK_LABEL = ${BLOCK_LABEL_JSON};
var COMPANION_NOTE = ${JSON.stringify(COMPANION_NOTE)};
var fm = function (n) { return '$' + n.toLocaleString('en-US'); };
var fm2 = function (n) { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
var ecf = function (p) { return Math.ceil(p * ${FEES.ECF_RATE}); };
var qty = function (id) { var e = document.getElementById(id); return e ? (parseInt(e.value, 10) || 0) : 0; };

// ── Detail card ───────────────────────────────────────────────────────────────
var card = document.getElementById('card');
var pinned = null;

function cardHead(d) {
  return '<div class="cardhd"><span class="cardid">' + d.ref + '</span>' +
    '<span class="cardwall">' + (BLOCK_LABEL[d.block] || '') + '</span>' +
    '<button class="cclose" type="button" aria-label="Close">\\u00d7</button></div>' +
    '<div class="cardmis">Garden of Meditation \\u00b7 ' + (BLOCK_LABEL[d.block] || '') +
    ' \\u00b7 Row ' + d.row + ' \\u00b7 Space ' + d.col + '</div>';
}

function cardHtml(d) {
  // Not available: the card names the niche and its status, and shows NO pricing.
  if (d.st !== 'available' || !d.price) {
    return cardHead(d) +
      '<div class="cardst">' + (STATUS_LABEL[d.st] || d.st) + '</div>' +
      '<div class="cnote">No price is printed for this niche on the current price sheet, so it is not quotable here. Confirm its status in MIS/Enterprise before saying anything to a family.</div>';
  }
  var price = +d.price, e = ecf(price), tot = price + e, rows = '';
  rows += '<div class="cr"><span class="cl">Niche Price</span><span class="cv">' + fm(price) + '</span></div>';
  rows += '<div class="cr"><span class="cl">E.C.F. (10%)</span><span class="cv">' + fm(e) + '</span></div>';
  // Everything below the E.C.F. line is an ADD-ON and is summed after it: E.C.F. is 10%
  // of the NICHE PRICE alone and is never charged on an add-on.
  var oc = qty('oc-qty'), rc = qty('rec-qty'), ins = qty('insc-qty'), urn = qty('urn-qty');
  if (oc > 0) { rows += '<div class="cr"><span class="cl">Open &amp; Closing \\u00d7' + oc + '</span><span class="cv">' + fm(OC * oc) + '</span></div>'; tot += OC * oc; }
  if (rc > 0) { rows += '<div class="cr"><span class="cl">Recording Fee \\u00d7' + rc + '</span><span class="cv">' + fm(REC * rc) + '</span></div>'; tot += REC * rc; }
  if (ins > 0) {
    // Two inscriptions fit on the front of a companion niche (operator, 2026-07-31).
    var inscrSub = INSCR * ins;
    var tax = Math.round(inscrSub * TAX * 100) / 100;
    rows += '<div class="cr"><span class="cl">Inscription \\u00d7' + ins + '</span><span class="cv">' + fm(inscrSub) + '</span></div>';
    rows += '<div class="cr"><span class="cl">Sales tax on inscription (10.4%)</span><span class="cv">' + fm2(tax) + '</span></div>';
    tot += inscrSub + tax;
  }
  if (urn > 0) {
    // TAXED at 10.4%, exactly like the inscription (operator ruling 2026-07-31). The tax
    // is its own row so the family can see which subtotal it was computed on.
    var urnSub = URN_PRICE * urn;
    var urnTax = Math.round(urnSub * TAX * 100) / 100;
    rows += '<div class="cr"><span class="cl">' + URN_NAME + ' \\u00d7' + urn + ' <em>(merchandise)</em></span><span class="cv">' + fm(urnSub) + '</span></div>';
    rows += '<div class="cr"><span class="cl">Sales tax on urn (10.4%)</span><span class="cv">' + fm2(urnTax) + '</span></div>';
    tot += urnSub + urnTax;
  }
  return cardHead(d) + rows +
    '<div class="ctot"><span class="ctl">Est. Total</span><span class="ctv">' + fm(Math.round(tot)) + '</span></div>' +
    '<div class="cnote">' + COMPANION_NOTE + ' E.C.F. is 10% of the niche price only \\u2014 add-ons are not subject to it. ' +
    (urn > 0
      ? 'Both merchandise lines \\u2014 inscription and urn \\u2014 carry 10.4% sales tax.'
      : 'The Interlude urns are NOT included above \\u2014 add them with the urn box in the footer.') +
    '</div>';
}

function readNiche(el) {
  var d = {};
  ['ref', 'id', 'block', 'row', 'col', 'price', 'st'].forEach(function (k) {
    var v = el.getAttribute('data-' + k); if (v !== null) d[k] = v;
  });
  return d;
}

function clearSel() {
  var s = document.querySelectorAll('.sel');
  for (var i = 0; i < s.length; i++) s[i].classList.remove('sel');
}
// A niche is rendered twice — once on the full wall and once in its block view — so the
// highlight is applied to every element carrying the ref, and survives a tab switch.
function markSel(el) {
  clearSel();
  var ref = el.getAttribute('data-ref');
  var all = document.querySelectorAll('[data-ref="' + ref + '"]');
  for (var i = 0; i < all.length; i++) all[i].classList.add('sel');
}

// A niche is rendered twice. After a tab switch the pinned niche's OWN element may be
// inside a display:none view, where getBoundingClientRect() is all zeros — and a card
// placed against a zero rect lands at the top-left corner, on top of the tab bar, where
// (being pinned, and therefore pointer-events:auto) it swallowed the clicks meant for
// the tabs. Found 2026-07-31 by driving the page. So: always place against whichever
// rendering of this ref is actually laid out, and if none is, park the card in its
// default bottom-right corner rather than over the chrome.
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

// Card opens NEXT TO the niche (same behaviour as the three glass-front pages); phones
// keep the bottom sheet.
function placeCard(el) {
  if (window.matchMedia('(max-width:700px)').matches) {
    card.style.left = card.style.top = card.style.right = card.style.bottom = '';
    return;
  }
  var t = visibleTwin(el);
  if (!t) { card.style.left = card.style.top = card.style.right = card.style.bottom = ''; return; }
  var r = t.getBoundingClientRect();
  card.style.right = 'auto'; card.style.bottom = 'auto';
  var cw = card.offsetWidth || 296, ch = card.offsetHeight || 220;
  var x = r.right + 14, y = r.top + r.height / 2 - ch / 2;
  if (x + cw > window.innerWidth - 8) x = r.left - cw - 14;
  if (x < 8) x = Math.min(Math.max(8, r.right + 14), window.innerWidth - cw - 8);
  y = Math.max(8, Math.min(y, window.innerHeight - ch - 8));
  card.style.left = x + 'px'; card.style.top = y + 'px';
}

// The pinned niche's card also lands in a print-only block, and the print scope narrows
// to the block that niche lives in.
function setPrintCard(d) {
  document.getElementById('printcard').innerHTML = cardHtml(d);
  document.body.classList.add('has-printsel');
  var old = document.querySelectorAll('.wview.printsel');
  for (var i = 0; i < old.length; i++) old[i].classList.remove('printsel');
  var wv = document.getElementById('wall-' + d.block);
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

// ── Tap detector ──────────────────────────────────────────────────────────────
// 2D still needs one. The wall is 32 spaces wide, so every grid sits in a horizontally
// scrollable box: on a touch screen a swipe to scroll the wall ends with a native click
// on whichever niche the finger started on. Selection is decided HERE — a press that
// moved more than 8px, or lasted longer than 700ms, is a scroll and never a tap — and
// the native click that follows a pointer gesture is swallowed.
var downNiche = null, downX = 0, downY = 0, downAt = 0, movedPx = 0, suppressUntil = 0;
document.addEventListener('pointerdown', function (ev) {
  var n = ev.target.closest ? ev.target.closest('.n') : null;
  downNiche = (n && n.hasAttribute('data-ref')) ? n : null;
  downX = ev.clientX; downY = ev.clientY; downAt = performance.now(); movedPx = 0;
});
document.addEventListener('pointermove', function (ev) {
  if (!downNiche) return;
  movedPx = Math.abs(ev.clientX - downX) + Math.abs(ev.clientY - downY);
});
document.addEventListener('pointerup', function (ev) {
  suppressUntil = performance.now() + 400;
  if (downNiche && movedPx <= 8 && performance.now() - downAt < 700) showCard(downNiche, true);
  else if (!downNiche && movedPx <= 8 && !(ev.target.closest && ev.target.closest('#card, .tab, .fees, .cclose'))) hideCard();
  downNiche = null;
});
document.addEventListener('pointercancel', function () { downNiche = null; });
// Swallow the native click that follows a pointer gesture INSIDE A GRID — and only
// there. Suppressing document-wide would eat the tab, the qty boxes and the inscription
// toggle, since every one of those clicks is also preceded by a pointerup. A
// keyboard-generated click has no preceding pointer sequence, so it always passes.
document.addEventListener('click', function (ev) {
  if (ev.target.closest('.cclose')) { hideCard(); return; }
  if (ev.target.closest('.gwrap') && performance.now() < suppressUntil) {
    ev.stopPropagation(); ev.preventDefault(); return;
  }
  var n = ev.target.closest('.n');
  if (n && n.hasAttribute('data-ref')) { showCard(n, true); return; }
  // The fee footer is part of the card's math, so touching it must NOT dismiss the
  // pinned card the toggle is meant to update.
  if (!ev.target.closest('#card, .tab, .fees')) hideCard();
}, true);

document.addEventListener('mouseover', function (ev) {
  if (window.matchMedia('(hover: none)').matches) return;
  if (downNiche) return; // mid-drag: sweeping across niches must not hover-pop them
  var n = ev.target.closest('.n');
  if (n && n.hasAttribute('data-ref')) showCard(n, false);
  else if (pinned) showCard(pinned, false);
});
document.addEventListener('focusin', function (ev) {
  var n = ev.target.closest('.n');
  if (!n || !n.hasAttribute('data-ref')) return;
  var kb = true;
  try { kb = n.matches(':focus-visible'); } catch (e) { kb = true; }
  if (kb) showCard(n, true);
});
document.addEventListener('keydown', function (ev) {
  // Any key means the user has moved to the keyboard, so the pointer-gesture suppression
  // window is over. Without this, Enter on a focused niche within 400ms of any tap —
  // switching tabs and hitting Enter, say — was swallowed along with the phantom click.
  suppressUntil = 0;
  if (ev.key === 'Escape') hideCard();
});
// A fee change re-renders the pinned card AND its print block, so the printed pricing
// card always reflects the toggle state at print time.
['oc-qty', 'rec-qty', 'insc-qty', 'urn-qty'].forEach(function (id) {
  var e = document.getElementById(id);
  if (!e) return;
  var redraw = function () { if (pinned) showCard(pinned, false); };
  e.addEventListener('input', redraw);
  e.addEventListener('change', redraw);
});

// ── Tabs (selection survives a tab switch) ────────────────────────────────────
var BLOCKS = ${JSON.stringify(Object.keys(BLOCKS))};
function showView(v) {
  var views = document.querySelectorAll('.wview');
  for (var i = 0; i < views.length; i++) views[i].classList.remove('active');
  var el = document.getElementById('wall-' + v);
  if (el) el.classList.add('active');
  var tabs = document.querySelectorAll('.tabs .tab');
  for (var j = 0; j < tabs.length; j++) tabs[j].classList.toggle('active', tabs[j].getAttribute('data-view') === v);
  // On a block tab, print only that block.
  document.body.classList.toggle('pv-one', BLOCKS.indexOf(v) > -1);
}
document.querySelectorAll('.tabs .tab').forEach(function (t) {
  t.addEventListener('click', function () { showView(t.getAttribute('data-view')); });
});
`;

// ── Assemble ──────────────────────────────────────────────────────────────────
const LOGO = fs.readFileSync(path.join(ROOT, 'scripts', 'bw-logo.svg.txt'), 'utf8').trim();
const N_TOTAL = ALL.length;
const N_AVAIL = ALL.filter(sellable).length;
// The spaces MIS lists available at $0. Named on the page by REFERENCE only — never with
// a dollar figure, because $0 is not a price and the wall must never appear to quote one.
const NO_PRICE_REFS = LISTED_NO_PRICE
  .map((id) => refOf(id.split('-')[0], +id.split('-')[1]))
  .join(' and ');

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bonney Watson — Garden of Meditation Niche Map</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
<!-- Generated by scripts/build_gomn_map.mjs from scripts/gomn-niche-data.mjs. Do not hand-edit. -->
<style>${CSS}</style>
</head>
<body>
<div class="header">
  ${LOGO}
  <div class="htxt">
    <h1>Garden of Meditation — Niche Map</h1>
    <p>Washington Memorial Park &nbsp;·&nbsp; ${esc(SHEET_TEXT.address)}</p>
  </div>
  <a class="back-btn no-print" href="../">&larr; Quote Tool</a>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
</div>
<div class="tabs">
${BLOCK_ORDER.map((b) => `  <button class="tab${b === 'full' ? ' active' : ''}" data-view="${b}">${esc(viewLabel(b))}</button>`).join('\n')}
</div>
<div class="main">
  <div class="printcard" id="printcard" aria-hidden="true"></div>

${BLOCK_ORDER.map(view).join('\n')}

  <div class="hint no-print">Tap or hover a niche for pricing &nbsp;·&nbsp; the wall scrolls sideways &nbsp;·&nbsp; printing follows the highlighted niche</div>

  <div class="fees">
    <div class="fi"><span class="fl">Open &amp; Closing — $${FEES.OC} ea</span>
      <span class="fv">Qty: <input type="number" id="oc-qty" min="0" max="4" value="1" aria-label="Open and closing quantity"></span></div>
    <div class="fi"><span class="fl">Recording Fee — $${FEES.REC} ea</span>
      <span class="fv">Qty: <input type="number" id="rec-qty" min="0" max="4" value="1" aria-label="Recording fee quantity"></span></div>
    <div class="fi"><span class="fl">E.C.F.</span><span class="fv">10% of niche price — not included in listed prices</span></div>
    <div class="fi"><span class="fl">Inscription — $${FEES.INSCR} ea + 10.4% tax</span>
      <span class="fv">Qty: <input type="number" id="insc-qty" min="0" max="${INSCR_MAX}" value="0" aria-label="Inscription quantity, up to ${INSCR_MAX} on the niche front"> <span class="fnote">up to ${INSCR_MAX} on the front</span></span></div>
    <div class="fi fi-urn"><span class="fl">${esc(URN.name)} (${esc(URN.maker)}) — $${URN.price} ea + 10.4% tax</span>
      <span class="fv">Qty: <input type="number" id="urn-qty" min="0" max="${URN.maxQty}" value="0" aria-label="${esc(URN.name)} quantity, up to ${URN.maxQty} per niche"> <span class="fnote">merchandise, not a fee — ${URN.maxQty} fit per niche</span></span></div>
  </div>

  <div class="rules">
    <h3>From the price sheet — read these to the family</h3>
    <ul>
      <!-- This lead used to read "why only ONE urn fits", which contradicted the sentence
           right after it (two fit — that is the companion capacity). Corrected s09/D. -->
      <li><b>Companion niche, and why only the Interlude Urn fits.</b> ${esc(COMPANION_NOTE)}</li>
      <li>Sheet, verbatim: <span class="quote">&ldquo;${esc(SHEET_TEXT.companion)}&rdquo;</span></li>
      <li>Sheet, verbatim: <span class="quote">&ldquo;${esc(SHEET_TEXT.urn)}&rdquo;</span> The urn price list figure is <b>${esc(URN.name)} (${esc(URN.maker)}) $${URN.price}.00</b> each &mdash; merchandise, not a fee, and up to ${URN.maxQty} per niche. It carries <b>10.4% sales tax</b>, like the inscription (operator ruling ${esc(FEE_SOURCE.confirmedOn)}).</li>
      <li>Sheet, verbatim: <span class="quote">&ldquo;${esc(SHEET_TEXT.ecf)}&rdquo;</span></li>
      <li><span class="shout">${esc(SHEET_TEXT.photos)}</span></li>
    </ul>
  </div>

  <div class="rules">
    <h3>Fee schedule &mdash; where these numbers come from</h3>
    <ul>
      <li><b>Open &amp; Closing $${FEES.OC}.00ea &nbsp;·&nbsp; Recording Fee $${FEES.REC}.00ea &nbsp;·&nbsp; Inscription $${FEES.INSCR}.00ea &nbsp;·&nbsp; 10.4% sales tax on merchandise (inscription and urn) &nbsp;·&nbsp; E.C.F. 10%</b></li>
      <li><b>These are the ${esc(FEE_SOURCE.schedule)} schedule</b>, applied to the Garden of Meditation by ${esc(FEE_SOURCE.confirmedBy)} on ${esc(FEE_SOURCE.confirmedOn)}. <b>They are not printed on this area&rsquo;s own sheet</b> &mdash; that sheet prints ${esc(FEE_SOURCE.replaces)}, which these amounts replace. Confirm the current charges in MIS/Enterprise before quoting.</li>
      <li>The E.C.F. rate is the one fee figure still taken from this sheet, and it is unchanged at 10%.</li>
      <li><b>Two inscriptions may be added to the front</b> of a companion niche &mdash; the quantity box above goes to ${INSCR_MAX}.</li>
    </ul>
  </div>

  <div class="rules">
    <h3>Availability &mdash; where this reading comes from</h3>
    <ul>
      <li><b>Availability is the operator&rsquo;s MIS list of ${esc(AVAILABILITY.asOf)}</b> &mdash; ${esc(AVAILABILITY.source)}. It supersedes ${esc(AVAILABILITY.supersedes)}: every figure on this wall is still the price sheet&rsquo;s own, unchanged. A level the list does not carry has sold out, so <b>levels B and F are now sold out entirely</b>.</li>
      <li><b>${esc(NO_PRICE_REFS)}</b> ${LISTED_NO_PRICE.length === 1 ? 'is' : 'are'} listed in MIS as available <b>with no price attached</b>, so ${LISTED_NO_PRICE.length === 1 ? 'it is' : 'they are'} <b>not offered here</b> and ${LISTED_NO_PRICE.length === 1 ? 'shows' : 'show'} as not available. A niche is for sale when a price greater than zero is attached to it. Ask the operator for a figure before quoting ${LISTED_NO_PRICE.length === 1 ? 'it' : 'either'}.</li>
      <li><b>Unreconciled, ${esc(AVAILABILITY.asOf)}:</b> ${esc(AVAILABILITY.discrepancy)}</li>
    </ul>
  </div>

  <div class="pfoot">
    <b>${esc(SHEET_TEXT.effective)}</b><br>
    Row A is the bottom row; Row G the top. Spaces are numbered 1&ndash;32 left to right across the whole wall.<br>
    References read <b>GOM-1-1-&lt;row&gt;-&lt;space&gt;</b>. ${N_TOTAL} niches; ${N_AVAIL} are offered at a price on the ${esc(AVAILABILITY.asOf)} MIS list.<br>
    A niche with no price shown is <b>not quotable here</b> — confirm it in MIS/Enterprise. Availability is maintained by hand; always confirm before writing.
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
console.log(`wrote ${path.relative(ROOT, OUT)} — ${(fs.statSync(OUT).size / 1024).toFixed(1)} KB, ${N_TOTAL} niches across ${Object.keys(BLOCKS).length} blocks (${N_AVAIL} available)`);
