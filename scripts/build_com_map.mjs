/**
 * Generates MAPS/COM_CryptMap.html from scripts/com-crypt-data.mjs.
 *
 * Fourth member of the map family (MVC / ROAC / ECL / COM) and the first that is a
 * WALK-IN BUILDING rather than a single structure: ~25 bank faces on the perimeter
 * walls, a free-standing centre island, two glass-front niche walls, plus the chapel,
 * altar, hallways, rest rooms, storage and entrance masses so the operator can orient.
 *
 * Renderings, all emitted as STATIC HTML from the one dataset so they cannot drift:
 *   1. a floor-plan SVG overview where every bank is clickable
 *   2. one CSS-3D model of the whole interior, with a face-on camera preset per area
 *   3. flat per-bank grids, which are also what prints (no JS needed to render them)
 *
 * Statuses are live hand-maintained data: edit scripts/com-crypt-data.mjs and
 * rebuild — never hand-edit the HTML.
 *
 * NO CRYPT CARRIES A PRICE. The crypt sheet's price text is four pixels tall and its
 * font collides digits; see the header of com-crypt-data.mjs for the proof. The two
 * niche walls' sheets are legible, so those prices are real and drive the card math.
 *
 * Geometry is ESTIMATED from the CAD plan and photographs; no dimensions are rendered
 * for crypts.
 *
 *   node scripts/build_com_map.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TIERS, TYPE_LABEL, TYPE_CAP, STATUS_LABEL, CRYPT_FEES, OMITTED_FEES, NICHE_FEES,
  NICHE_PRICES_EFFECTIVE, AREAS, BANKS, ROOMS, VOIDS, WALLS, UNITS,
  PLAN_W, PLAN_H, COLW, DEPTH, ROWH,
  cryptUnits, wallNiches, allNiches, cryptSpaces,
} from './com-crypt-data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'MAPS', 'COM_CryptMap.html');

const PPI = 2.0;                    // plan units -> screen px in the 3D scene
const px = (v) => +(v * PPI).toFixed(2);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = (n) => '$' + n.toLocaleString('en-US');

const FACE_H = TIERS.length * ROWH;                 // 112 plan units
const ROT = { N: 180, S: 0, E: 90, W: -90 };        // outward normal, degrees about Y
const FACE_DIR = { N: 'facing north', S: 'facing south', E: 'facing east', W: 'facing west' };

const units = cryptUnits();
const unitsByBank = new Map(BANKS.map((b) => [b.id, units.filter((u) => u.bank === b.id)]));
const voidKey = new Set(VOIDS.flatMap((v) => v.tiers.flatMap((t) => v.cols.map((c) => `${v.bank}|${t}|${c}`))));

// ── labels ────────────────────────────────────────────────────────────────────
const bankLabel = (b) => `Bank ${b.id}`;
const bankSub = (b) => {
  const kinds = [...new Set(b.segs.map((s) => TYPE_LABEL[s[2]]))];
  return `${FACE_DIR[b.face]} · ${kinds.join(' · ')}`;
};
const areaOf = (id) => AREAS.find((a) => a.id === id);

function unitLabel(u) {
  return u.cols.length > 1 ? `${u.tier}-${u.cols[0]}/${u.cols[1]}` : `${u.tier}-${u.cols[0]}`;
}
function unitAria(u) {
  return `${unitLabel(u)}, bank ${u.bank}, ${TYPE_LABEL[u.type]}, ${STATUS_LABEL[u.st]}`;
}
function nicheAria(n) {
  const w = WALLS[n.wall];
  const p = n.p ? `, ${money(n.p)}` : '';
  return `${w.name} ${n.row}-${n.col}${p}, ${STATUS_LABEL[n.st]}`;
}

// ── cell attribute payloads (the ONLY channel to the runtime card) ────────────
function cryptAttrs(u) {
  return `data-kind="crypt" data-bank="${u.bank}" data-id="${unitLabel(u)}" data-ref="${u.ref}"`
    + ` data-tier="${u.tier}" data-cols="${u.cols.join('/')}" data-type="${u.type}" data-st="${u.st}"`;
}
function nicheAttrs(n) {
  return `data-kind="niche" data-wall="${n.wall}" data-id="${n.row}-${n.col}" data-ref="${n.ref}"`
    + ` data-row="${n.row}" data-col="${n.col}" data-price="${n.p == null ? '' : n.p}" data-st="${n.st}"`
    + (n.size ? ` data-size="${esc(n.size)}"` : '');
}

// ── flat per-bank grid (screen + print) ───────────────────────────────────────
function bankGrid(b, { mini = false } = {}) {
  const n = b.c1 - b.c0 + 1;
  const rowPx = mini ? 20 : 40;
  const list = unitsByBank.get(b.id);
  const cells = [];
  for (const u of list) {
    const ri = TIERS.indexOf(u.tier) + 1;
    const ci = u.cols[0] - b.c0 + 2;
    const span = u.cols.length;
    const st = u.st !== 'available' ? ` st-${u.st}` : '';
    const badge = u.st === 'available'
      ? '<span class="cstat cs-a">Avail</span>'
      : (u.st === 'blocked' ? '<span class="cstat cs-x">Not selling</span>' : '<span class="cstat cs-u">Confirm</span>');
    cells.push(`    <button type="button" class="c flatc ty-${u.type}${st}" style="grid-row:${ri};grid-column:${ci}/span ${span}" ${cryptAttrs(u)} aria-label="${esc(unitAria(u))}"><span class="cid">${unitLabel(u)}</span>${mini ? '' : badge}</button>`);
  }
  // voids
  for (const v of VOIDS.filter((v) => v.bank === b.id)) {
    const r0 = TIERS.indexOf(v.tiers[0]) + 1;
    cells.push(`    <div class="cvoid" style="grid-row:${r0}/span ${v.tiers.length};grid-column:${v.cols[0] - b.c0 + 2}/span ${v.cols.length}"><span>EMPTY AREA<br>no crypts</span></div>`);
  }
  const rl = TIERS.map((t, i) => `    <div class="rlbl" style="grid-column:1;grid-row:${i + 1}">${t}</div>`).join('\n');
  const cl = Array.from({ length: n }, (_, i) => `    <div class="clbl" style="grid-column:${i + 2};grid-row:${TIERS.length + 1}">${b.c0 + i}</div>`).join('\n');
  return `  <div class="cgrid${mini ? ' mini' : ''}" style="grid-template-columns:20px repeat(${n},minmax(0,1fr));grid-template-rows:repeat(${TIERS.length},${rowPx}px) 14px;">
${rl}
${cells.join('\n')}
${cl}
  </div>`;
}

// ── flat niche-wall grid ──────────────────────────────────────────────────────
function wallGrid(wid, { mini = false } = {}) {
  const w = WALLS[wid];
  const niches = wallNiches(wid);
  const rowPx = mini ? 20 : 46;
  const cells = niches.map((nn) => {
    const ri = w.rows.indexOf(nn.row) + 1;
    const span = nn.spanRows ? nn.spanRows.length : 1;
    const st = nn.st !== 'available' ? ` st-${nn.st}` : '';
    const body = nn.p != null && !mini ? `<span class="nprice">${money(nn.p)}</span>` : '';
    const badge = mini ? '' : (nn.st === 'available' ? '' : '<span class="cstat cs-u">Confirm</span>');
    return `    <button type="button" class="c flatn${st}" style="grid-row:${ri}/span ${span};grid-column:${nn.col + 1}" ${nicheAttrs(nn)} aria-label="${esc(nicheAria(nn))}"><span class="cid">${nn.row}-${nn.col}</span>${body}${badge}</button>`;
  }).join('\n');
  const rl = w.rows.map((r, i) => `    <div class="rlbl" style="grid-column:1;grid-row:${i + 1}">${r}</div>`).join('\n');
  return `  <div class="cgrid${mini ? ' mini' : ''}" style="grid-template-columns:20px repeat(${w.cols},minmax(0,1fr));grid-template-rows:repeat(${w.rows.length},${rowPx}px);max-width:${mini ? 260 : 520}px;">
${rl}
${cells}
  </div>`;
}

// ── floor plan SVG ────────────────────────────────────────────────────────────
function planSvg() {
  const parts = [];
  parts.push(`<rect class="pshell" x="6" y="6" width="${PLAN_W - 12}" height="${PLAN_H - 12}" rx="6"/>`);
  for (const r of ROOMS) {
    parts.push(`<g class="proom pr-${r.kind}"><rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="3"/><text x="${r.x + r.w / 2}" y="${r.y + r.h / 2 + 4}">${esc(r.label)}</text></g>`);
  }
  for (const b of BANKS) {
    const list = unitsByBank.get(b.id);
    const av = list.filter((u) => u.st === 'available').length;
    const p = b.plan;
    parts.push(`<g class="pbank${av ? ' has-av' : ''}" data-bank="${b.id}" data-area="${b.area}" tabindex="0" role="button" aria-label="${esc(bankLabel(b) + ', ' + bankSub(b) + ', ' + av + ' available')}">`
      + `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="2"/>`
      + `<text class="pblab" x="${p.x + p.w / 2}" y="${p.y + p.h / 2 + 4}"${p.w < p.h ? ` transform="rotate(-90 ${p.x + p.w / 2} ${p.y + p.h / 2})"` : ''}>${b.id}${av ? ` · ${av}` : ''}</text>`
      + `</g>`);
  }
  for (const wid of ['RAD', 'SER']) {
    const w = WALLS[wid], p = w.plan;
    const av = wallNiches(wid).filter((n) => n.st === 'available').length;
    parts.push(`<g class="pbank pniche has-av" data-bank="${wid}" data-area="niches" tabindex="0" role="button" aria-label="${esc(w.name + ' niche wall, ' + av + ' available')}">`
      + `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="2"/>`
      + `<text class="pblab" x="${p.x + p.w / 2}" y="${p.y + p.h / 2 + 4}"${p.w < p.h ? ` transform="rotate(-90 ${p.x + p.w / 2} ${p.y + p.h / 2})"` : ''}>${w.name} · ${av}</text>`
      + `</g>`);
  }
  return `<svg class="plansvg" viewBox="0 0 ${PLAN_W} ${PLAN_H}" role="img" aria-label="Floor plan of the Chapel of Memory Mausoleum. Every crypt bank and both niche walls are selectable.">
${parts.map((s) => '    ' + s).join('\n')}
  </svg>`;
}

// ── 3D ────────────────────────────────────────────────────────────────────────
const cx = (p) => p.x + p.w / 2 - PLAN_W / 2;
const cz = (p) => p.y + p.h / 2 - PLAN_H / 2;

function bank3d(b) {
  const n = b.c1 - b.c0 + 1;
  const faceW = n * COLW;
  const list = unitsByBank.get(b.id);
  const cells = list.map((u) => {
    const ri = TIERS.indexOf(u.tier) + 1;
    const ci = u.cols[0] - b.c0 + 1;
    const st = u.st !== 'available' ? ` st-${u.st}` : '';
    const tag = u.st === 'blocked' ? '<span class="c3st">NS</span>' : (u.st === 'available' ? '<span class="c3st c3av">AVAIL</span>' : '');
    return `      <button type="button" class="c3 ty-${u.type}${st}" style="grid-row:${ri};grid-column:${ci}/span ${u.cols.length}" ${cryptAttrs(u)} aria-label="${esc(unitAria(u))}"><span class="c3id">${unitLabel(u)}</span>${tag}</button>`;
  });
  for (const v of VOIDS.filter((v) => v.bank === b.id)) {
    cells.push(`      <div class="c3void" style="grid-row:${TIERS.indexOf(v.tiers[0]) + 1}/span ${v.tiers.length};grid-column:${v.cols[0] - b.c0 + 1}/span ${v.cols.length}"></div>`);
  }
  const p = b.plan;
  return `    <div class="face ar-${b.area}" data-bankface="${b.id}" style="width:${px(faceW)}px;height:${px(FACE_H)}px;grid-template-columns:repeat(${n},1fr);grid-template-rows:repeat(${TIERS.length},1fr);transform:translate(-50%,-50%) translate3d(${px(cx(p))}px,0,${px(cz(p))}px) rotateY(${ROT[b.face]}deg)">
${cells.join('\n')}
    </div>
    <div class="fbase ar-${b.area}" style="width:${px(faceW)}px;height:14px;transform:translate(-50%,-50%) translate3d(${px(cx(p))}px,${px(FACE_H / 2) + 7}px,${px(cz(p))}px) rotateY(${ROT[b.face]}deg)"><b>${b.id}</b></div>`;
}

function wall3d(wid) {
  const w = WALLS[wid], p = w.plan;
  const faceW = w.cols * COLW;
  const rows = w.rows.length;
  const h = rows * (ROWH * 0.72);
  const cells = wallNiches(wid).map((nn) => {
    const ri = w.rows.indexOf(nn.row) + 1;
    const span = nn.spanRows ? nn.spanRows.length : 1;
    const st = nn.st !== 'available' ? ` st-${nn.st}` : '';
    const chip = nn.p != null ? `<span class="n3p">${money(nn.p)}</span>` : '';
    return `      <button type="button" class="c3 n3glass${st}" style="grid-row:${ri}/span ${span};grid-column:${nn.col}" ${nicheAttrs(nn)} aria-label="${esc(nicheAria(nn))}"><span class="c3id">${nn.row}-${nn.col}</span>${chip}</button>`;
  }).join('\n');
  return `    <div class="face nichewall ar-niches" data-bankface="${wid}" style="width:${px(faceW)}px;height:${px(h)}px;grid-template-columns:repeat(${w.cols},1fr);grid-template-rows:repeat(${rows},1fr);transform:translate(-50%,-50%) translate3d(${px(cx(p))}px,${px((FACE_H - h) / 2)}px,${px(cz(p))}px) rotateY(${ROT[w.face]}deg)">
${cells}
    </div>
    <div class="fbase ar-niches" style="width:${px(faceW)}px;height:14px;transform:translate(-50%,-50%) translate3d(${px(cx(p))}px,${px(FACE_H / 2) + 7}px,${px(cz(p))}px) rotateY(${ROT[w.face]}deg)"><b>${w.name}</b></div>`;
}

function mass3d(r) {
  const w = r.w, d = r.h, x = r.x + w / 2 - PLAN_W / 2, z = r.y + d / 2 - PLAN_H / 2;
  const mh = r.kind === 'hall' ? 0 : (r.kind === 'feature' ? 34 : FACE_H * 0.55);
  if (!mh) {
    return `    <div class="hallpad" style="width:${px(w)}px;height:${px(d)}px;transform:translate(-50%,-50%) translate3d(${px(x)}px,${px(FACE_H / 2)}px,${px(z)}px) rotateX(-90deg)"><span>${esc(r.label)}</span></div>`;
  }
  const y = FACE_H / 2 - mh / 2;
  const out = [];
  for (const [sw, ry, off] of [[w, 0, [0, d / 2]], [w, 180, [0, -d / 2]], [d, 90, [w / 2, 0]], [d, -90, [-w / 2, 0]]]) {
    out.push(`    <div class="mass mk-${r.kind}" style="width:${px(sw)}px;height:${px(mh)}px;transform:translate(-50%,-50%) translate3d(${px(x + off[0])}px,${px(y)}px,${px(z + off[1])}px) rotateY(${ry}deg)"><span>${esc(r.label)}</span></div>`);
  }
  out.push(`    <div class="mass mtop mk-${r.kind}" style="width:${px(w)}px;height:${px(d)}px;transform:translate(-50%,-50%) translate3d(${px(x)}px,${px(y - mh / 2)}px,${px(z)}px) rotateX(90deg)"></div>`);
  return out.join('\n');
}

function scene3d() {
  return `<div class="scene" id="scene" tabindex="0" role="application" aria-label="Three-dimensional model of the Chapel of Memory Mausoleum interior. Use the area buttons below, or arrow keys, to change the view.">
  <div class="stage" id="stage">
    <div class="floor" style="width:${px(PLAN_W)}px;height:${px(PLAN_H)}px;transform:translate(-50%,-50%) translate3d(0,${px(FACE_H / 2) + 1}px,0) rotateX(-90deg)"></div>
    <div class="bldg">
${BANKS.map(bank3d).join('\n')}
${['RAD', 'SER'].map(wall3d).join('\n')}
${ROOMS.map(mass3d).join('\n')}
    </div>
  </div>
</div>`;
}

// ── views ─────────────────────────────────────────────────────────────────────
function areaView(a) {
  const banks = BANKS.filter((b) => b.area === a.id);
  const blocks = banks.map((b) => `    <div class="bwrap">
      <div class="btitle">${esc(bankLabel(b))}</div>
      <div class="bsub">${esc(bankSub(b))}</div>
      <div class="gwrap">
${bankGrid(b)}
      </div>
    </div>`);
  if (a.id === 'niches') {
    for (const wid of ['RAD', 'SER']) {
      const w = WALLS[wid];
      const av = wallNiches(wid).filter((n) => n.st === 'available');
      blocks.push(`    <div class="bwrap">
      <div class="btitle">${esc(w.name)} Niche Wall</div>
      <div class="bsub">${esc(w.prefix)}-ROW-SPACE · rows K (top) to A (bottom) · ${esc(w.note)}</div>
      <div class="gwrap">
${wallGrid(wid)}
      </div>
      <div class="sizeleg"><b>Size classes (from the wall sheet)</b>${w.sizes.map((s) => `<span><i>${esc(s[0])}</i> ${esc(s[1])}</span>`).join('')}
        <em>Only the two double-height cells (E/D · ${wid === 'RAD' ? 'spaces 2 and 5' : 'none on this wall'}) are unambiguously a size class on the sheet; the rest are legend-only.</em></div>
      <div class="bsub">${av.length} available · ${money(av.reduce((s, n) => s + n.p, 0))} listed · ${esc(NICHE_PRICES_EFFECTIVE)}</div>
    </div>`);
    }
  }
  return `  <div class="wview" id="area-${a.id}">
    <div class="wlabel">${esc(a.label)}</div>
    <div class="wsub">${esc(a.sub)}</div>
${blocks.join('\n')}
  </div>`;
}

function planView() {
  return `  <div class="wview" id="area-plan">
    <div class="wlabel">Floor Plan</div>
    <div class="wsub">Chapel of Memory Mausoleum — every bank and both niche walls are selectable · the number after each bank id is how many units are available</div>
    <div class="planwrap">
${planSvg()}
    </div>
    <div class="hint">Click a bank to open its area · the 3D tab swings the camera to the same place</div>
  </div>`;
}

function overviewView() {
  const panels = BANKS.map((b) => `      <div class="ovp">
        <div class="ovt">${esc(bankLabel(b))}</div>
${bankGrid(b, { mini: true })}
      </div>`).concat(['RAD', 'SER'].map((wid) => `      <div class="ovp">
        <div class="ovt">${esc(WALLS[wid].name)} Niche Wall</div>
${wallGrid(wid, { mini: true })}
      </div>`)).join('\n');
  return `  <div class="wview" id="area-overview">
    <div class="wlabel">All Banks — Overview</div>
    <div class="wsub">Every bank and both niche walls at a glance</div>
    <div class="ovgrid">
${panels}
    </div>
  </div>`;
}

// ── CSS ───────────────────────────────────────────────────────────────────────
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
  .tab{padding:10px 13px;font-size:11px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--gold-light);cursor:pointer;border:none;border-bottom:3px solid transparent;white-space:nowrap;transition:all .2s;background:none;}
  .tab:hover{color:var(--cream);background:rgba(200,169,110,.08);}
  .tab.active{color:var(--gold);border-bottom-color:var(--gold);background:rgba(200,169,110,.12);}
  .main{padding:14px;}
  .wview,.view3d{display:none;}.wview.active,.view3d.active{display:block;}
  .wlabel{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:var(--gold);margin:14px 0 2px;text-align:center;}
  .wsub{font-size:10px;color:var(--gold-light);letter-spacing:.08em;margin-bottom:10px;text-align:center;}
  .btitle{font-family:'Cormorant Garamond',serif;font-size:15px;font-weight:600;color:var(--gold);text-align:center;margin:16px 0 1px;}
  .bsub{font-size:9.5px;color:var(--gold-light);opacity:.85;letter-spacing:.06em;text-align:center;margin-bottom:6px;text-transform:uppercase;}
  .bwrap{max-width:1100px;margin:0 auto 6px;}
  .gwrap{background:linear-gradient(160deg,#0f1a30,#1a2744 60%,#0d1528);border:1px solid var(--gb);border-radius:8px;padding:12px 14px;overflow-x:auto;margin:0 auto;}
  .cgrid{display:grid;gap:2px;margin:0 auto;width:100%;min-width:220px;}
  .cgrid.mini{gap:1px;}
  .rlbl,.clbl{display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:11px;font-weight:700;color:var(--gold);}
  .clbl{font-size:8px;font-family:'Jost',sans-serif;opacity:.8;}
  .cgrid.mini .rlbl{font-size:8px;}
  .ovgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;max-width:1200px;margin:0 auto;}
  .ovp{background:linear-gradient(160deg,#0f1a30,#1a2744 60%,#0d1528);border:1px solid var(--gb);border-radius:7px;padding:8px 9px;overflow:hidden;}
  .ovt{font-family:'Cormorant Garamond',serif;font-size:12px;font-weight:600;color:var(--gold);margin-bottom:4px;text-align:center;}

  /* ── Crypt cell: polished marble front, bronze frame ── */
  .c{border-radius:2px;border:1px solid rgba(0,0,0,.5);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;
    transition:transform .15s,box-shadow .15s,filter .15s;text-align:center;padding:1px;line-height:1.15;font-size:8px;min-width:0;
    color:#efece5;gap:1px;overflow:hidden;position:relative;
    background:
      linear-gradient(118deg,rgba(255,255,255,.16) 0%,rgba(255,255,255,0) 34%),
      linear-gradient(180deg,#6d6a63 0%,#575349 52%,#403d36 100%);}
  .ty-tandem{background:linear-gradient(118deg,rgba(255,255,255,.15) 0%,rgba(255,255,255,0) 34%),linear-gradient(180deg,#6a675f 0%,#544f46 52%,#3d3a33 100%);}
  .ty-deluxe{background:linear-gradient(118deg,rgba(255,255,255,.19) 0%,rgba(255,255,255,0) 34%),linear-gradient(180deg,#7a7568 0%,#5f594c 52%,#46423a 100%);}
  .ty-hidden{background:linear-gradient(118deg,rgba(255,255,255,.13) 0%,rgba(255,255,255,0) 34%),linear-gradient(180deg,#615e57 0%,#4b473f 52%,#37342e 100%);}
  .c:hover{transform:scale(1.12);border-color:var(--gold);z-index:10;box-shadow:0 4px 16px rgba(0,0,0,.5),0 0 0 1px var(--gold);}
  .c:focus-visible,.c3:focus-visible{outline:2px solid #fff;outline-offset:1px;z-index:20;}
  .c.sel,.c3.sel{outline:3px solid #fff;outline-offset:-3px;z-index:25;filter:brightness(1.3) saturate(1.1);
    box-shadow:0 0 0 2px var(--gold),0 0 22px 4px rgba(255,255,255,.45);}
  .cid{font-size:8px;opacity:.85;font-weight:500;white-space:nowrap;}
  .cgrid.mini .cid{font-size:6px;}
  .nprice{font-weight:700;font-size:10px;padding:0 4px;border-radius:3px;background:#0f7a4a;color:#fff;box-shadow:0 1px 2px rgba(0,0,0,.35);}
  .cstat{font-size:6px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:0 3px;border-radius:2px;}
  .cs-a{background:rgba(255,255,255,.92);color:#123a24;}
  .cs-u{background:rgba(255,255,255,.16);color:#e6e3dc;}
  .cs-x{background:rgba(255,255,255,.9);color:#3a1212;}
  .cvoid,.c3void{display:flex;align-items:center;justify-content:center;border:1px dashed rgba(232,213,168,.35);border-radius:2px;
    background:repeating-linear-gradient(45deg,rgba(255,255,255,.04) 0 6px,rgba(255,255,255,0) 6px 12px);
    color:var(--gold-light);font-size:7.5px;letter-spacing:.06em;text-align:center;opacity:.75;text-transform:uppercase;}
  .c3void{border-color:rgba(0,0,0,.3);}

  /* ── Status code: PATTERN + darkness, never hue. Nothing here shares a colour
     with anything that means money. ── */
  .st-unavailable{background:
      repeating-linear-gradient(135deg,rgba(255,255,255,.13) 0 4px,rgba(255,255,255,0) 4px 9px),
      linear-gradient(180deg,#3a3833 0%,#25231f 100%)!important;color:#cfccc5;}
  .st-blocked{background:linear-gradient(180deg,#1a1917 0%,#0d0c0b 100%)!important;color:#b8b5ae;
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)!important;}
  .st-blocked::after{content:'';position:absolute;inset:0;pointer-events:none;
    background:linear-gradient(135deg,transparent 47%,rgba(255,255,255,.35) 47%,rgba(255,255,255,.35) 53%,transparent 53%);}
  .flatc:not(.st-unavailable):not(.st-blocked)::before,.c3:not(.st-unavailable):not(.st-blocked):not(.n3glass)::before{
    content:'';position:absolute;inset:1px;pointer-events:none;border:1px solid rgba(255,255,255,.55);border-radius:2px;}

  .legend{display:flex;flex-wrap:wrap;gap:9px;margin-top:10px;justify-content:center;}
  .li{display:flex;align-items:center;gap:5px;font-size:10px;color:var(--gold-light);}
  .ls{width:14px;height:14px;border-radius:2px;border:1px solid rgba(255,255,255,.2);flex-shrink:0;}
  .lg-a{background:linear-gradient(180deg,#6d6a63,#403d36);box-shadow:inset 0 0 0 1px rgba(255,255,255,.55);}
  .lg-u{background:repeating-linear-gradient(135deg,rgba(255,255,255,.13) 0 3px,rgba(255,255,255,0) 3px 6px),linear-gradient(180deg,#3a3833,#25231f);}
  .lg-x{background:linear-gradient(180deg,#1a1917,#0d0c0b);}
  .lg-v{background:repeating-linear-gradient(45deg,rgba(255,255,255,.12) 0 3px,rgba(255,255,255,0) 3px 6px);border-style:dashed!important;}

  /* ── Floor plan ── */
  .planwrap{background:linear-gradient(160deg,#0f1a30,#1a2744 60%,#0d1528);border:1px solid var(--gb);border-radius:9px;padding:12px;max-width:1150px;margin:0 auto;overflow-x:auto;}
  .plansvg{width:100%;height:auto;display:block;min-width:560px;}
  .pshell{fill:rgba(255,255,255,.03);stroke:var(--gb);stroke-width:2;}
  .proom rect{fill:rgba(200,169,110,.09);stroke:rgba(200,169,110,.35);stroke-width:1;}
  .pr-hall rect{fill:rgba(255,255,255,.03);stroke-dasharray:4 4;}
  .pr-entrance rect{fill:rgba(200,169,110,.18);}
  .proom text{fill:var(--gold-light);font-size:12px;font-family:'Jost',sans-serif;text-anchor:middle;opacity:.85;}
  .pbank rect{fill:#4a463d;stroke:#20304f;stroke-width:1.5;}
  .pbank.has-av rect{fill:#6f6a5c;stroke:var(--gold);}
  .pbank.pniche rect{fill:#2f5f6d;stroke:var(--gold);}
  .pbank{cursor:pointer;}
  .pbank:hover rect,.pbank:focus rect{fill:var(--gold);}
  .pbank:hover .pblab,.pbank:focus .pblab{fill:#16203a;}
  .pbank:focus{outline:none;}
  .pbank:focus rect{stroke:#fff;stroke-width:2.5;}
  .pblab{fill:var(--cream);font-size:11px;font-family:'Jost',sans-serif;text-anchor:middle;pointer-events:none;font-weight:500;}

  /* ── 3D ── */
  .toolbar{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;align-items:center;max-width:1000px;margin:10px auto 8px;}
  .tbtn{background:rgba(200,169,110,.12);border:1px solid var(--gb);color:var(--gold-light);padding:7px 12px;border-radius:5px;font-size:11px;font-weight:500;letter-spacing:.05em;text-transform:uppercase;cursor:pointer;transition:all .15s;}
  .tbtn:hover{background:rgba(200,169,110,.26);color:var(--cream);}
  .tbtn.on{background:rgba(200,169,110,.3);border-color:var(--gold);color:var(--gold);}
  .tbtn:focus-visible{outline:2px solid #fff;outline-offset:2px;}
  .tbsep{width:1px;height:22px;background:var(--gb);margin:0 4px;}
  .scene{position:relative;height:min(66vh,600px);min-height:340px;margin:0 auto;max-width:1200px;
    background:radial-gradient(ellipse at 50% 30%,#2a3550 0%,#161f38 48%,#080d18 100%);
    border:1px solid var(--gb);border-radius:10px;overflow:hidden;cursor:grab;touch-action:none;
    perspective:1900px;perspective-origin:50% 44%;}
  .scene:active{cursor:grabbing;}
  .scene:focus-visible{outline:2px solid var(--gold);outline-offset:2px;}
  .stage{position:absolute;left:50%;top:70%;width:0;height:0;transform-style:preserve-3d;
    transform:translateY(var(--lift,0px)) scale(var(--zoom,1)) rotateX(var(--pitch,0deg)) rotateY(var(--yaw,0deg));}
  .bldg{position:absolute;transform-style:preserve-3d;}
  .floor{position:absolute;left:0;top:0;background:
      linear-gradient(135deg,rgba(196,190,178,.22),rgba(120,116,108,.16) 60%,rgba(88,85,79,.2));
    border:1px solid rgba(200,196,186,.22);}
  .face{position:absolute;left:0;top:0;display:grid;gap:1.5px;
    background:linear-gradient(180deg,#a9a396,#8b8478);padding:2px;border:1px solid #6f695e;
    backface-visibility:hidden;box-shadow:0 0 20px rgba(0,0,0,.45);}
  .face.nichewall{background:linear-gradient(180deg,#8d7a52,#6a5a3c);}
  .fbase{position:absolute;left:0;top:0;background:linear-gradient(180deg,#8a8478,#605b52);
    display:flex;align-items:center;justify-content:center;color:#1d1b17;font-size:7.5px;letter-spacing:.1em;
    font-weight:700;backface-visibility:hidden;overflow:hidden;}
  .mass{position:absolute;left:0;top:0;background:linear-gradient(180deg,rgba(52,66,96,.55),rgba(28,38,60,.6));
    border:1px solid rgba(200,169,110,.3);backface-visibility:hidden;display:flex;align-items:flex-start;justify-content:center;}
  .mass span{font-size:8px;letter-spacing:.1em;color:rgba(232,213,168,.9);text-transform:uppercase;margin-top:4px;}
  .mtop{background:linear-gradient(135deg,rgba(70,86,120,.55),rgba(38,50,76,.6));}
  .mtop span{display:none;}
  .mk-feature{background:linear-gradient(180deg,rgba(200,169,110,.5),rgba(140,116,70,.55));}
  .mk-entrance{background:linear-gradient(180deg,rgba(200,169,110,.35),rgba(120,100,60,.4));}
  .hallpad{position:absolute;left:0;top:0;background:rgba(255,255,255,.05);border:1px dashed rgba(232,213,168,.25);
    display:flex;align-items:center;justify-content:center;}
  .hallpad span{font-size:9px;letter-spacing:.16em;color:rgba(232,213,168,.6);text-transform:uppercase;}
  .c3{border:none;border-radius:1px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;
    overflow:hidden;line-height:1.05;padding:0;min-width:0;transition:filter .15s,transform .15s;gap:0;position:relative;
    color:#efece5;
    background:linear-gradient(118deg,rgba(255,255,255,.17) 0%,rgba(255,255,255,0) 34%),linear-gradient(180deg,#6d6a63 0%,#54504a 55%,#3f3c36 100%);
    box-shadow:inset 0 1px 1px rgba(255,255,255,.2),inset 0 -3px 6px -3px rgba(0,0,0,.6);}
  .c3:hover{filter:brightness(1.2) saturate(1.06);transform:scale(1.6);z-index:30;box-shadow:0 4px 18px rgba(0,0,0,.55);}
  .scene.dragging .c3:hover{transform:none!important;filter:none!important;}
  .c3id{font-size:4.6px;opacity:.8;letter-spacing:-.02em;white-space:nowrap;}
  .c3st{font-size:4px;font-weight:700;letter-spacing:.04em;padding:0 1px;border-radius:1px;background:rgba(255,255,255,.2);}
  .c3av{background:rgba(255,255,255,.92);color:#123a24;}
  .n3glass{background:
      linear-gradient(118deg,rgba(255,255,255,.4) 0%,rgba(255,255,255,.05) 40%),
      linear-gradient(180deg,#f0dcb0 0%,#d8bd85 55%,#b99e68 100%);color:#2a2213;}
  .n3glass.st-unavailable{background:
      repeating-linear-gradient(135deg,rgba(0,0,0,.16) 0 4px,rgba(0,0,0,0) 4px 9px),
      linear-gradient(180deg,#8a8272 0%,#6a6355 100%)!important;color:#efece5;}
  .n3p{font-size:4.4px;font-weight:700;white-space:nowrap;}
  .hint{text-align:center;font-size:10px;color:var(--gold-light);opacity:.72;margin-top:7px;letter-spacing:.05em;}
  .modelnote{text-align:center;font-size:9.5px;color:var(--gold-light);opacity:.55;margin-top:3px;}

  /* ── Detail card ── */
  .card{position:fixed;right:16px;bottom:16px;width:286px;background:rgba(16,24,44,.97);border:1px solid var(--gold);
    border-radius:9px;padding:13px 15px;z-index:900;box-shadow:0 10px 40px rgba(0,0,0,.65);font-size:11px;display:none;pointer-events:none;}
  .card.show{display:block;}
  .card.pinned{pointer-events:auto;}
  .cardhd{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:2px;}
  .cardid{font-family:'Cormorant Garamond',serif;font-size:19px;font-weight:700;color:var(--gold);}
  .cardwall{font-size:9px;color:var(--gold-light);letter-spacing:.08em;text-transform:uppercase;}
  .cardmis{font-size:9.5px;color:var(--gold-light);opacity:.85;letter-spacing:.04em;margin-bottom:7px;}
  .cardst{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#ffd9a0;margin-bottom:6px;}
  .cr{display:flex;justify-content:space-between;gap:10px;padding:2px 0;border-bottom:1px solid rgba(200,169,110,.1);}
  .cr:last-of-type{border:none;}
  .cl{color:var(--gold-light);}.cv{font-weight:600;color:var(--cream);text-align:right;}
  .ctot{margin-top:6px;padding-top:6px;border-top:1px solid var(--gold);display:flex;justify-content:space-between;}
  .ctl{color:var(--gold);font-weight:600;}.ctv{color:var(--gold);font-weight:700;font-size:13px;}
  .cnote{margin-top:5px;font-size:9px;color:var(--gold-light);opacity:.85;font-style:italic;}
  .cclose{background:none;border:none;color:var(--gold-light);font-size:17px;line-height:1;cursor:pointer;padding:0 2px;}
  .cclose:hover{color:var(--cream);}
  @media (max-width:700px){.card{right:8px;left:8px;bottom:8px;width:auto;}}

  .fees{margin-top:14px;background:rgba(200,169,110,.07);border:1px solid var(--gb);border-radius:6px;padding:11px 13px;display:flex;flex-wrap:wrap;gap:12px;max-width:1000px;margin-left:auto;margin-right:auto;justify-content:center;}
  .fi{font-size:11px;}.fl{color:var(--gold);font-weight:600;display:block;margin-bottom:1px;}.fv{color:var(--cream);}
  .fees input{width:42px;background:rgba(200,169,110,.12);border:1px solid var(--gold);border-radius:3px;color:var(--cream);padding:2px 4px;font-family:'Jost',sans-serif;font-size:12px;text-align:center;}
  .sizeleg{max-width:640px;margin:8px auto 0;font-size:10px;color:var(--gold-light);text-align:center;line-height:1.7;}
  .sizeleg b{display:block;color:var(--gold);letter-spacing:.08em;text-transform:uppercase;font-size:9px;margin-bottom:2px;}
  .sizeleg span{display:inline-block;margin:0 7px;}
  .sizeleg i{color:var(--gold);font-style:normal;font-weight:600;}
  .sizeleg em{display:block;opacity:.7;font-size:9px;margin-top:3px;}
  .warn{max-width:1000px;margin:12px auto 0;background:rgba(200,120,60,.14);border:1px solid rgba(232,170,110,.55);
    border-radius:7px;padding:10px 14px;font-size:11px;color:#ffe2be;line-height:1.6;}
  .warn b{color:#ffd08a;}
  .printcard{display:none;}
  .pfoot{max-width:1000px;margin:12px auto 0;text-align:center;font-size:10px;color:var(--gold-light);line-height:1.6;}
  .pfoot b{color:var(--gold);font-weight:600;}
  .back-btn{margin-left:auto;flex-shrink:0;background:none;border:1px solid var(--gb);color:var(--gold-light);padding:9px 14px;border-radius:6px;font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap;text-decoration:none;}
  .back-btn:hover{background:rgba(200,169,110,.15);color:var(--cream);}
  .print-btn{flex-shrink:0;background:rgba(200,169,110,.15);border:1px solid var(--gold);color:var(--gold);padding:9px 16px;border-radius:6px;font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;cursor:pointer;white-space:nowrap;}
  .print-btn:hover{background:rgba(200,169,110,.28);}

  @media (max-width:640px){
    .header{flex-wrap:wrap;padding:10px 12px;gap:9px;}
    .hlogo-svg{height:26px;} .htxt h1{font-size:14px;} .htxt p{font-size:9px;}
    .print-btn,.back-btn{margin-left:0;padding:6px 11px;font-size:11px;}
    .main{padding:8px;} .tab{padding:9px 10px;font-size:10px;}
    .toolbar{gap:5px;margin:8px auto 6px;} .tbtn{padding:6px 9px;font-size:10px;} .tbsep{display:none;}
    .scene{height:min(52vh,430px);min-height:300px;border-radius:8px;}
    .gwrap{padding:10px 8px;} .hint,.modelnote{font-size:9px;}
  }

  /* ── PRINT: the flat per-bank grids, no JS needed ── */
  @media print {
    .no-print,.tabs,.card,.toolbar,.view3d,.hint,.modelnote,.planwrap{display:none!important;}
    *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important;}
    body{background:#fff!important;color:#1a1a1a!important;}
    .header{background:#fff!important;border-bottom:2px solid #c8540a!important;padding:10px 0;}
    .htxt h1{color:#1a2744!important;} .htxt p{color:#555!important;}
    .wview{display:block!important;break-before:page;}
    #area-north{break-before:avoid!important;}
    #area-overview,#area-plan{display:none!important;}
    /* On an area tab, print ONLY that area. */
    body.pv-one .wview{display:none!important;}
    body.pv-one .wview.active{display:block!important;break-before:avoid!important;}
    /* A highlighted unit narrows it further: only ITS area prints. These rules sit
       later, so they outrank the tab scope. */
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
    .printcard .ctot{border-top:1px solid #c8540a;} .printcard .cr{border-bottom:1px solid #ddd;}
    .wlabel,.btitle{color:#1a2744!important;}
    .wsub,.bsub,.li,.pfoot,.sizeleg{color:#444!important;}
    .gwrap,.ovp{background:#fff!important;border:1px solid #999!important;}
    .rlbl,.clbl,.pfoot b,.fl,.ovt,.sizeleg b,.sizeleg i{color:#1a2744!important;}
    .c{border-color:#00000030!important;}
    .c.sel{outline:4px solid #c8540a!important;outline-offset:-2px;box-shadow:0 0 0 2px #1a2744!important;filter:none!important;transform:none!important;}
    .warn{background:#fff6ec!important;border-color:#c8540a!important;color:#5a2c05!important;}
    .warn b{color:#a83c06!important;}
    .fv{color:#333!important;}
    .fees{background:#f5f5f2!important;border-color:#c8a96e!important;}
    .fees input{border:1px solid #999!important;background:#fff!important;color:#1a1a1a!important;}
  }
`;

// ── Runtime ───────────────────────────────────────────────────────────────────
const BANK_AREA = JSON.stringify(Object.fromEntries(
  BANKS.map((b) => [b.id, b.area]).concat([['RAD', 'niches'], ['SER', 'niches']])));
const BANK_LABEL = JSON.stringify(Object.fromEntries(
  BANKS.map((b) => [b.id, bankLabel(b)]).concat([['RAD', 'Radiance Niche Wall'], ['SER', 'Serenity Niche Wall']])));
const AREA_LABEL = JSON.stringify(Object.fromEntries(AREAS.map((a) => [a.id, a.label])));
// Camera presets: [yaw, pitch] per area, plus the whole-building home view.
const VIEW_JSON = JSON.stringify({
  home: { yaw: -30, pitch: -52, zoom: null },
  north: { yaw: 0, pitch: -8 },
  west: { yaw: -90, pitch: -8 },
  island: { yaw: -20, pitch: -34 },
  south: { yaw: 180, pitch: -8 },
  east: { yaw: 90, pitch: -8 },
  niches: { yaw: -60, pitch: -14 },
});

const JS = `
'use strict';
var REC = ${CRYPT_FEES.RECORDING}, MBI = ${CRYPT_FEES.MONOBAR_INSTALL}, VASE = ${CRYPT_FEES.VASE};
var N_OC = ${NICHE_FEES.OC}, N_REC = ${NICHE_FEES.RECORDING};
var ECF_RATE = ${CRYPT_FEES.ECF_RATE};
var TYPE_LABEL = ${JSON.stringify(TYPE_LABEL)};
var TYPE_CAP = ${JSON.stringify(TYPE_CAP)};
var STATUS_LABEL = ${JSON.stringify(STATUS_LABEL)};
var BANK_AREA = ${BANK_AREA};
var BANK_LABEL = ${BANK_LABEL};
var AREA_LABEL = ${AREA_LABEL};
var WALL_NAME = { RAD: 'Radiance', SER: 'Serenity' };
var fm = function (n) { return '$' + n.toLocaleString('en-US'); };
var ecf = function (p) { return Math.ceil(p * ECF_RATE); };
var qty = function (id) { var e = document.getElementById(id); return e ? (parseInt(e.value, 10) || 0) : 0; };

var card = document.getElementById('card');
var pinned = null;

function head(id, sub, mis) {
  return '<div class="cardhd"><span class="cardid">' + id + '</span><span class="cardwall">' + sub + '</span>' +
    '<button class="cclose" type="button" aria-label="Close">\\u00d7</button></div>' +
    '<div class="cardmis">' + mis + '</div>';
}

function cryptCard(d) {
  var spaces = d.cols.split('/');
  var mis = d.ref + (spaces.length > 1 ? ' &amp; ' + d.ref.replace(/\\d+$/, spaces[1]) : '');
  var h = head(d.id, BANK_LABEL[d.bank] || d.bank, 'COM \\u00b7 ' + mis);
  h += '<div class="cardst">' + (STATUS_LABEL[d.st] || d.st) + '</div>';
  h += '<div class="cr"><span class="cl">Type</span><span class="cv">' + (TYPE_LABEL[d.type] || d.type) + '</span></div>';
  h += '<div class="cr"><span class="cl">Capacity</span><span class="cv">' + (TYPE_CAP[d.type] || '') + '</span></div>';
  if (d.st !== 'available') {
    h += '<div class="cnote">' + (d.st === 'blocked'
      ? 'Marked NOT SELLING on the crypt sheet \\u2014 this crypt is not sellable. No pricing shown.'
      : 'Unavailable \\u2014 confirm in MIS. The sheet does not say whether it is sold or reserved. No pricing shown.') + '</div>';
    return h;
  }
  // Available, but the crypt sheet's price text is unreadable at source resolution:
  // the page states that instead of guessing a five-figure number.
  h += '<div class="cr"><span class="cl">Crypt price</span><span class="cv">Confirm in MIS</span></div>';
  h += '<div class="cr"><span class="cl">E.C.F.</span><span class="cv">10% of price</span></div>';
  h += '<div class="cr"><span class="cl">Recording Fee</span><span class="cv">' + fm(REC) + '</span></div>';
  var mq = qty('mbi-qty'), vq = qty('vase-qty');
  if (mq > 0) h += '<div class="cr"><span class="cl">Monobar Install \\u00d7' + mq + '</span><span class="cv">' + fm(MBI * mq) + '</span></div>';
  if (vq > 0) h += '<div class="cr"><span class="cl">Vase \\u00d7' + vq + '</span><span class="cv">' + fm(VASE * vq) + '</span></div>';
  h += '<div class="cnote">A price IS printed for this crypt on the MIS sheet, but the sheet supplied is too low-resolution to read the digits with certainty, so no figure is shown here. Read the price from MIS. Open &amp; Closing and Monobar are obscured on the sheet and are not included.</div>';
  return h;
}

function nicheCard(d) {
  var h = head(d.id, WALL_NAME[d.wall] + ' Niche Wall', d.ref);
  if (d.st !== 'available') {
    h += '<div class="cardst">' + (STATUS_LABEL[d.st] || d.st) + '</div>';
    if (d.size) h += '<div class="cr"><span class="cl">Size</span><span class="cv">' + d.size + '</span></div>';
    h += '<div class="cnote">Unavailable \\u2014 confirm in MIS. No pricing shown.</div>';
    return h;
  }
  var price = +d.price, e = ecf(price), tot = price + e;
  h += '<div class="cr"><span class="cl">Niche Price</span><span class="cv">' + fm(price) + '</span></div>';
  h += '<div class="cr"><span class="cl">ECF (10%)</span><span class="cv">' + fm(e) + '</span></div>';
  var oc = qty('noc-qty'), rc = qty('nrec-qty');
  if (oc > 0) { h += '<div class="cr"><span class="cl">O&amp;C \\u00d7' + oc + '</span><span class="cv">' + fm(N_OC * oc) + '</span></div>'; tot += N_OC * oc; }
  if (rc > 0) { h += '<div class="cr"><span class="cl">Recording \\u00d7' + rc + '</span><span class="cv">' + fm(N_REC * rc) + '</span></div>'; tot += N_REC * rc; }
  if (d.size) h += '<div class="cr"><span class="cl">Size</span><span class="cv">' + d.size + '</span></div>';
  h += '<div class="ctot"><span class="ctl">Est. Total</span><span class="ctv">' + fm(Math.round(tot)) + '</span></div>';
  h += '<div class="cnote">Two inurnments per niche. ECF is not included in the listed price. ${esc(NICHE_PRICES_EFFECTIVE)}.</div>';
  return h;
}

function readEl(el) {
  var d = {};
  ['kind', 'bank', 'wall', 'id', 'ref', 'tier', 'cols', 'type', 'st', 'row', 'col', 'price', 'size'].forEach(function (k) {
    var v = el.getAttribute('data-' + k); if (v !== null) d[k] = v;
  });
  return d;
}
function cardHtml(d) { return d.kind === 'niche' ? nicheCard(d) : cryptCard(d); }
function areaOfEl(d) { return BANK_AREA[d.kind === 'niche' ? d.wall : d.bank]; }

function clearSel() {
  var s = document.querySelectorAll('.sel');
  for (var i = 0; i < s.length; i++) s[i].classList.remove('sel');
}
function markSel(el) {
  clearSel();
  var r = el.getAttribute('data-ref');
  var all = document.querySelectorAll('[data-ref="' + r + '"]');
  for (var i = 0; i < all.length; i++) if (!all[i].closest('.mini')) all[i].classList.add('sel');
}
function placeCard(el) {
  if (window.matchMedia('(max-width:700px)').matches) {
    card.style.left = card.style.top = card.style.right = card.style.bottom = '';
    return;
  }
  var r = el.getBoundingClientRect();
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
  var old = document.querySelectorAll('.wview.printsel');
  for (var i = 0; i < old.length; i++) old[i].classList.remove('printsel');
  var wv = document.getElementById('area-' + areaOfEl(d));
  if (wv) { wv.classList.add('printsel'); document.body.classList.add('pv-sel'); }
}
function showCard(el, pin) {
  var d = readEl(el);
  card.innerHTML = cardHtml(d);
  card.classList.add('show');
  placeCard(el);
  if (pin) { pinned = el; markSel(el); }
  card.classList.toggle('pinned', pinned === el);
  if (pinned === el) setPrintCard(d);
}
function hideCard() {
  card.classList.remove('show'); card.classList.remove('pinned');
  pinned = null; clearSel();
  document.getElementById('printcard').innerHTML = '';
  document.body.classList.remove('has-printsel');
  document.body.classList.remove('pv-sel');
  var old = document.querySelectorAll('.wview.printsel');
  for (var i = 0; i < old.length; i++) old[i].classList.remove('printsel');
}

document.addEventListener('click', function (ev) {
  if (ev.target.closest('.cclose')) { hideCard(); return; }
  var pb = ev.target.closest('.pbank');
  if (pb) { showView(pb.getAttribute('data-area')); return; }
  var n = ev.target.closest('.c, .c3');
  if (n && n.hasAttribute('data-ref') && !n.closest('.mini')) { showCard(n, true); return; }
  // The fee quantity inputs must NOT close a pinned card — changing a quantity is
  // how the card's math is driven, and a stray hideCard() made it uneditable.
  if (!ev.target.closest('#card, .tab, .tbtn, .fees')) hideCard();
});
document.addEventListener('keydown', function (ev) {
  if (ev.key === 'Escape') { hideCard(); return; }
  if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.classList && ev.target.classList.contains('pbank')) {
    ev.preventDefault(); showView(ev.target.getAttribute('data-area'));
  }
});
document.addEventListener('mouseover', function (ev) {
  if (window.matchMedia('(hover: none)').matches) return;
  if (last) return;   // mid-drag: sweeping across crypts must not hover-pop them
  if (pinned) return; // A PINNED card stays put. The ROAC/MVC pages let a hover
                      // preview overwrite the pinned card and restore it on the way
                      // out; that leaves the card showing whatever the pointer last
                      // crossed on its way to the fee inputs, so changing a quantity
                      // edited the wrong space. Once something is pinned, only Escape,
                      // the close button or another click changes it.
  var n = ev.target.closest('.c, .c3');
  if (n && n.hasAttribute('data-ref') && !n.closest('.mini')) showCard(n, false);
});
document.addEventListener('focusin', function (ev) {
  var n = ev.target.closest('.c, .c3');
  if (!n || !n.hasAttribute('data-ref')) return;
  var kb = true;
  try { kb = n.matches(':focus-visible'); } catch (e) { kb = true; }
  if (kb) showCard(n, true);
});
['mbi-qty', 'vase-qty', 'noc-qty', 'nrec-qty'].forEach(function (id) {
  var e = document.getElementById(id);
  if (e) e.addEventListener('input', function () { if (pinned) showCard(pinned, false); });
});

// ── Tabs ──────────────────────────────────────────────────────────────────────
var AREA_IDS = ${JSON.stringify(AREAS.map((a) => a.id))};
function showView(v) {
  var views = document.querySelectorAll('.wview, .view3d');
  for (var i = 0; i < views.length; i++) views[i].classList.remove('active');
  var el = document.getElementById(v === '3d' ? 'view-3d' : 'area-' + v);
  if (el) el.classList.add('active');
  var tabs = document.querySelectorAll('.tabs .tab');
  for (var j = 0; j < tabs.length; j++) tabs[j].classList.toggle('active', tabs[j].getAttribute('data-view') === v);
  document.body.classList.toggle('pv-one', AREA_IDS.indexOf(v) > -1);
  if (v === '3d') fitScene();
  window.scrollTo(0, 0);
}
document.querySelectorAll('.tabs .tab').forEach(function (t) {
  t.addEventListener('click', function () { showView(t.getAttribute('data-view')); });
});

// ── 3D camera ─────────────────────────────────────────────────────────────────
var scene = document.getElementById('scene'), stage = document.getElementById('stage');
var VIEWS = ${VIEW_JSON};
var cam = { yaw: VIEWS.home.yaw, pitch: VIEWS.home.pitch, zoom: 1, lift: 0 };
var ZMIN = 0.18, ZMAX = 3.2, PMIN = -90, PMAX = 0;
var HALF_PX = ${px(FACE_H / 2)};
var STAGE_TOP = 0.70;
var PLAN_PX = ${px(PLAN_W)}, PLAN_D_PX = ${px(PLAN_H)};
var curPreset = 'home';
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
function homeZoom() {
  var w = scene.clientWidth || 900, h = scene.clientHeight || 480;
  return clamp(Math.min(w * 0.80 / PLAN_PX, h * 0.80 / (PLAN_D_PX * 0.72)), ZMIN, ZMAX);
}
function fitScene() { if (scene.offsetWidth) { viewTo(curPreset, true); } }
window.addEventListener('resize', fitScene);

function viewTo(k, keep) {
  // A camera jump moves the model under a stationary cursor; Chrome then fires a
  // synthetic hover that can park a stale card over the model. Drop it.
  if (!pinned) card.classList.remove('show');
  var v = VIEWS[k] || VIEWS.home;
  curPreset = k;
  cam.yaw = v.yaw; cam.pitch = v.pitch;
  if (k === 'home') {
    cam.zoom = homeZoom();
    cam.lift = HALF_PX * cam.zoom * 0.5 - (STAGE_TOP - 0.5) * scene.clientHeight * 0.5;
  } else {
    cam.zoom = clamp(Math.min(scene.clientWidth * 0.9 / (PLAN_PX * 0.62), scene.clientHeight * 0.8 / (${px(FACE_H)} * 1.9)), ZMIN, ZMAX);
    cam.lift = HALF_PX * cam.zoom - (STAGE_TOP - 0.5) * scene.clientHeight;
  }
  apply();
  if (!keep) window.scrollTo(0, 0);
}
document.querySelectorAll('[data-viewbtn]').forEach(function (b) {
  b.addEventListener('click', function () {
    var k = b.getAttribute('data-viewbtn');
    viewTo(curPreset === k && k !== 'home' ? 'home' : k, true);
  });
});
document.getElementById('btn-reset').addEventListener('click', function () { viewTo('home', true); });
document.getElementById('btn-in').addEventListener('click', function () { cam.zoom *= 1.25; apply(); });
document.getElementById('btn-out').addEventListener('click', function () { cam.zoom /= 1.25; apply(); });

// Drag to orbit / pinch to zoom. Capture is DEFERRED until a real drag (>8px) or a
// second finger — capturing on pointerdown retargets the click to the scene and a
// tap on a crypt never reaches the button (MISTAKES #18).
var pts = {}, last = null, pinchStart = 0, zoomStart = 1, moved = 0, captured = false;
var downCell = null, downAt = 0;
function capturePts() {
  if (captured) return;
  captured = true;
  scene.classList.add('dragging');
  curPreset = null;
  if (!pinned) card.classList.remove('show');
  Object.keys(pts).forEach(function (id) { try { scene.setPointerCapture(+id); } catch (e) { /* gone */ } });
}
scene.addEventListener('pointerdown', function (ev) {
  if (Object.keys(pts).length === 0) {
    var n = ev.target.closest('.c3');
    downCell = (n && n.hasAttribute('data-ref')) ? n : null;
    downAt = performance.now();
  } else { downCell = null; }
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
  if (Object.keys(pts).length >= 2) {
    var d = dist();
    if (pinchStart > 8) { cam.zoom = zoomStart * (d / pinchStart); apply(); }
    moved = 99; return;
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
    if (ev.type === 'pointerup' && downCell && moved <= 8 && performance.now() - downAt < 700) {
      showCard(downCell, true);
    } else if (ev.type === 'pointerup' && !downCell && moved <= 8 && !ev.target.closest('#card')) {
      hideCard();
    }
    downCell = null; last = null; pinchStart = 0; moved = 0; captured = false;
    scene.classList.remove('dragging');
  }
}
scene.addEventListener('pointerup', endPtr);
scene.addEventListener('pointercancel', endPtr);
scene.addEventListener('click', function (ev) {
  if (performance.now() < suppressUntil) { ev.stopPropagation(); ev.preventDefault(); }
}, true);
scene.addEventListener('wheel', function (ev) {
  ev.preventDefault(); cam.zoom *= Math.exp(-ev.deltaY * 0.0012); apply();
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
viewTo('home', true);
`;

// ── Assemble ──────────────────────────────────────────────────────────────────
const LOGO = fs.readFileSync(path.join(ROOT, 'scripts', 'bw-logo.svg.txt'), 'utf8').trim();
const N_UNITS = units.length;
const N_SPACES = cryptSpaces().length;
const N_AVAIL = units.filter((u) => u.st === 'available').length;
const N_BLOCK = units.filter((u) => u.st === 'blocked').length;
const niches = allNiches();
const N_NICHE = niches.length;
const N_NAVAIL = niches.filter((n) => n.st === 'available').length;
const NICHE_VALUE = niches.filter((n) => n.p).reduce((s, n) => s + n.p, 0);

const LEGEND = `<div class="legend">
      <div class="li"><div class="ls lg-a"></div><span>Available (price printed on the sheet)</span></div>
      <div class="li"><div class="ls lg-u"></div><span>Unavailable — confirm in MIS</span></div>
      <div class="li"><div class="ls lg-x"></div><span>Not Selling</span></div>
      <div class="li"><div class="ls lg-v"></div><span>Empty area — no crypts</span></div>
    </div>`;

const WARN = `<div class="warn">
    <b>Crypt prices are not shown on this page.</b> The MIS crypt sheet supplied renders its
    price text four pixels tall, and at that size its font draws only eight distinct shapes
    for ten digits — a five-figure amount cannot be read from it with certainty, so no figure
    is printed here rather than a wrong one. A crypt marked <b>Available</b> does carry a
    printed price on the sheet; read the exact amount from MIS. The
    <b>Radiance and Serenity niche-wall prices are legible and are exact.</b>
    <b>Open &amp; Closing</b> and <b>Monobar</b> print as <code>########</code> on the crypt sheet
    and are omitted from every total.
  </div>`;

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bonney Watson — Chapel of Memory Mausoleum</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
<!-- Generated by scripts/build_com_map.mjs from scripts/com-crypt-data.mjs. Do not hand-edit. -->
<style>${CSS}</style>
</head>
<body>
<div class="header">
  ${LOGO}
  <div class="htxt">
    <h1>Chapel of Memory Mausoleum — Crypt &amp; Niche Map</h1>
    <p>Washington Memorial Park &nbsp;·&nbsp; COM-1-1-ROW-SPACE</p>
  </div>
  <a class="back-btn no-print" href="../">&larr; Quote Tool</a>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
</div>
<div class="tabs">
  <button class="tab" data-view="plan">Floor Plan</button>
  <button class="tab active" data-view="3d">3D View</button>
${AREAS.map((a) => `  <button class="tab" data-view="${a.id}">${esc(a.label)}</button>`).join('\n')}
  <button class="tab" data-view="overview" style="margin-left:auto;border-left:1px solid var(--gb);">Overview</button>
</div>
<div class="main">
  <div class="printcard" id="printcard" aria-hidden="true"></div>

  <div class="view3d active" id="view-3d">
    <div class="toolbar no-print">
      <button class="tbtn" data-viewbtn="home" title="The whole building from above">Whole Building</button>
${AREAS.map((a) => `      <button class="tbtn" data-viewbtn="${a.id}" title="${esc(a.sub)}">${esc(a.label)}</button>`).join('\n')}
      <div class="tbsep"></div>
      <button class="tbtn" id="btn-reset">Reset view</button>
      <div class="tbsep"></div>
      <button class="tbtn" id="btn-out" aria-label="Zoom out">&minus;</button>
      <button class="tbtn" id="btn-in" aria-label="Zoom in">+</button>
    </div>
${scene3d()}
    <div class="hint">Drag to orbit &nbsp;·&nbsp; scroll or pinch to zoom &nbsp;·&nbsp; tap a crypt to select it &nbsp;·&nbsp; arrow keys orbit, +/&minus; zoom</div>
    <div class="modelnote">${BANKS.length} crypt banks (${N_UNITS} purchasable units over ${N_SPACES} crypt spaces) plus the Radiance and Serenity niche walls (${N_NICHE} niches) &nbsp;·&nbsp; model proportions estimated from the CAD plan and photographs; no dimensions are implied</div>
    ${LEGEND}
  </div>

${planView()}
${AREAS.map(areaView).join('\n')}
${overviewView()}

  ${WARN}

  <div class="fees">
    <div class="fi"><span class="fl">Recording Fee — ${money(CRYPT_FEES.RECORDING)}</span><span class="fv">applies to every crypt</span></div>
    <div class="fi"><span class="fl">Monobar Install Fee — ${money(CRYPT_FEES.MONOBAR_INSTALL)} ea</span>
      <span class="fv">Qty: <input type="number" id="mbi-qty" min="0" max="4" value="0" aria-label="Monobar install quantity"></span></div>
    <div class="fi"><span class="fl">Crypt Vase — ${money(CRYPT_FEES.VASE)} ea</span>
      <span class="fv">Qty: <input type="number" id="vase-qty" min="0" max="4" value="0" aria-label="Crypt vase quantity"></span></div>
    <div class="fi"><span class="fl">Niche O&amp;C — ${money(NICHE_FEES.OC)} ea</span>
      <span class="fv">Qty: <input type="number" id="noc-qty" min="0" max="4" value="0" aria-label="Niche opening and closing quantity"></span></div>
    <div class="fi"><span class="fl">Niche Recording — ${money(NICHE_FEES.RECORDING)} ea</span>
      <span class="fv">Qty: <input type="number" id="nrec-qty" min="0" max="4" value="0" aria-label="Niche recording quantity"></span></div>
    <div class="fi"><span class="fl">E.C.F.</span><span class="fv">10% — not included in listed prices</span></div>
    <div class="fi"><span class="fl">Niche Inscription</span>
      <span class="fv">none — glass-front niches carry no inscription fee</span></div>
    <div class="fi"><span class="fl">Niche Sales Tax</span>
      <span class="fv">none — glass-front niches are not taxed</span></div>
    <div class="fi"><span class="fl">Omitted (illegible on the sheet)</span><span class="fv">${OMITTED_FEES.map((f) => esc(f.split(' — ')[0])).join(' · ')}</span></div>
  </div>
  <div class="pfoot">
    <b>Tier G is the top row, tier A the bottom. Space numbers run 101–231 around the building.</b><br>
    A tandem or companion is ONE purchasable unit at one price and is never split.<br>
    ${N_AVAIL} crypt units marked available &nbsp;·&nbsp; ${N_BLOCK} not selling &nbsp;·&nbsp;
    ${N_NAVAIL} niches available, ${money(NICHE_VALUE)} listed &nbsp;·&nbsp; ${esc(NICHE_PRICES_EFFECTIVE)}<br>
    Availability shown is transcribed from the MIS sheets of 2026-07-29 — always confirm current status and price in MIS before writing.
  </div>
</div><!-- /main -->

<aside class="card no-print" id="card" role="dialog" aria-live="polite" aria-label="Crypt detail"></aside>

<script>
${JS}
</script>
</body>
</html>
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, HTML.replace(/\r?\n/g, '\r\n'), 'utf8');
console.log(`wrote ${path.relative(ROOT, OUT).replace(/\\/g, '/')} — ${(fs.statSync(OUT).size / 1024).toFixed(1)} KB, `
  + `${N_UNITS} crypt units / ${N_SPACES} spaces across ${BANKS.length} banks, ${N_NICHE} niches across 2 walls`);
