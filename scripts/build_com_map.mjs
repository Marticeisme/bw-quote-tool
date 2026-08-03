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
 * CRYPTS CARRY MIS PRICES since 2026-08-01 (the 8/1 crypt-price export). Only an
 * font collides digits; see the header of com-crypt-data.mjs for the proof. The two
 * niche walls' sheets are legible, so those prices are real and drive the card math.
 *
 * Geometry is ESTIMATED from the CAD plan and photographs; no dimensions are rendered
 * for crypts. THE TWO NICHE WALLS ARE THE EXCEPTION and, since 2026-08-02, are drawn at
 * TRUE SIZE: every glass front is placed from its own measured width (see wallGrid /
 * wall3d and RAD_ROW_CLASSES in the data module), each wall is one selectable area, and
 * clicking a section on the floor plan opens that section alone.
 *
 * NOTHING RENDERED HERE NAMES AN INTERNAL SYSTEM. The word "MIS" may appear in comments
 * and in the data module's source citations; it must not reach any text, label, aria
 * string or card a family reads. verify_com_map.mjs strips the comments and asserts it.
 *
 *   node scripts/build_com_map.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TIERS, TYPE_LABEL, TYPE_CAP, STATUS_LABEL, MIS, CRYPT_FEES, NICHE_FEES,
  PRICES, PRICE_BANDS, priceBand, CRYPT_FEE_SOURCE,
  NICHE_PRICES_EFFECTIVE, AREAS, BANKS, ROOMS, VOIDS, WALLS, UNITS,
  ENTRANCES, FURNITURE, STOPS, EYE_Y, NCOLW, NICHE_UPI, wallWidthIn,
  PLAN_W, PLAN_H, COLW, DEPTH, ROWH,
  cryptUnits, wallNiches, allNiches, cryptSpaces, chapelChairs, materialAt, MATERIAL_ZONES,
} from './com-crypt-data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'MAPS', 'COM_CryptMap.html');

const PPI = 2.0;                    // plan units -> screen px in the 3D scene
const px = (v) => +(v * PPI).toFixed(2);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = (n) => '$' + n.toLocaleString('en-US');

/**
 * BAND_SKIN — the price-band PALETTE, 2026-08-01.
 *
 * Operator: "make the colros a little easier on the eyes. reminder tehse are crypt
 * fronts we're showing people." The bands' MEANING (the six ranges, their edges and
 * their labels) is inventory and stays in `com-crypt-data.mjs`, untouched. What a band
 * LOOKS like is presentation and belongs to the page, so it lives here.
 *
 * The old palette was a six-hue chip scale — #1a6fae blue, #23a06b green, #7d9a18
 * olive, #c39a10 yellow, #cf4a1c orange, #8b4fbb purple. Correct information design,
 * wrong room: 781 of them tiled across a wall read as a dashboard, and a family is
 * looking at the place they will bury someone. These are the same six steps desaturated
 * and darkened into materials that exist in the building — slate, verdigris, moss,
 * bronze, terracotta, aged porphyry. Ordinal and distinguishable, but quiet.
 *
 * Every band takes WHITE text, which makes the wall uniform instead of half the chips
 * flipping to dark type. Measured ratios, recomputed by verify_com_map.mjs from the
 * BUILT PAGE rather than from this table: 7.22, 6.18, 5.32, 5.22, 5.25, 7.52 : 1, and every
 * band is desaturated to HSL S 0.18-0.29 where the old chips ran 0.44-0.85.
 * Smallest separation between any two bands is 14.7 CIELAB dE (pb3/pb4).
 */
const BAND_SKIN = {
  pb1: { bg: '#3f5a70', fg: '#ffffff' },   // slate
  pb2: { bg: '#41695b', fg: '#ffffff' },   // verdigris
  pb3: { bg: '#63704a', fg: '#ffffff' },   // moss
  pb4: { bg: '#7d6a45', fg: '#ffffff' },   // bronze
  pb5: { bg: '#8f6151', fg: '#ffffff' },   // terracotta
  pb6: { bg: '#6a4a68', fg: '#ffffff' },   // aged porphyry
};
const skin = (b) => BAND_SKIN[b.c] || { bg: b.bg, fg: b.fg };

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

/**
 * Per-bank availability line. The money is the sum of the bank's PRICED available
 * units only, and it says so when MIS left one of them without a figure, so a
 * counselor never reads the total as "everything available in this bank".
 */
function bankRollup(b) {
  const av = (unitsByBank.get(b.id) || []).filter((u) => u.st === 'available');
  if (!av.length) return 'Nothing available in this bank';
  const priced = av.filter((u) => u.p != null);
  const sum = priced.reduce((t, u) => t + u.p, 0);
  const gap = av.length - priced.length;
  return `${av.length} available · ${money(sum)} listed`
    + (gap ? ` · ${gap} with no listed price — ask us` : '');
}

function unitLabel(u) {
  return u.cols.length > 1 ? `${u.tier}-${u.cols[0]}/${u.cols[1]}` : `${u.tier}-${u.cols[0]}`;
}
function unitAria(u) {
  const p = cryptPrice(u);
  return `${unitLabel(u)}, bank ${u.bank}, ${TYPE_LABEL[u.type]}, ${STATUS_LABEL[u.st]}`
    + (p == null ? (u.st === 'available' ? ', price on request' : '') : `, ${money(p)}`);
}
function nicheAria(n) {
  const w = WALLS[n.wall];
  const p = n.p ? `, ${money(n.p)}` : '';
  // The size class is spoken as well as drawn: the whole point of the 2026-08-02 pass is
  // that these fronts are not all one size, and a screen reader gets no help from width.
  const sz = n.size ? `, ${n.size} ${n.dims}` : '';
  return `${w.name} ${n.row}-${n.col}${sz}${p}, ${STATUS_LABEL[n.st]}`;
}

// ── cell attribute payloads (the ONLY channel to the runtime card) ────────────
// A crypt carries data-price ONLY when it is available AND MIS priced it. An unsellable
// unit has no price attribute at all, so no card, no screen reader and no copy-paste can
// surface a figure for it — the gate proves the attribute is absent, not merely unused.
function cryptAttrs(u) {
  return `data-kind="crypt" data-bank="${u.bank}" data-id="${unitLabel(u)}" data-ref="${u.ref}"`
    + ` data-tier="${u.tier}" data-cols="${u.cols.join('/')}" data-type="${u.type}" data-st="${u.st}"`
    + (cryptPrice(u) == null ? '' : ` data-price="${cryptPrice(u)}"`);
}
/**
 * The one place "does this unit show money?" is decided, and the one place the
 * operator's availability rule is applied on the render side: "yes all 379 are
 * available as long as a price is attached to it that is greater than 0."
 * A unit with no price, or a price of zero, has no business rendering a figure —
 * and by the same rule it has no business rendering as available either, which is
 * why COM-1-1-E-166 carries the `unpriced` status in the data instead of a special
 * case here. This stays as a belt-and-braces guard.
 */
const cryptPrice = (u) => (u.st === 'available' && u.p > 0 ? u.p : null);
/**
 * How large this exact figure may be printed on THIS crypt's front.
 *
 * "just make the prices larger" has a hard ceiling nobody can wish away: a one-space
 * front is 38 layout px across, and "$24,995" is seven glyphs. Growing the label with
 * --lod alone overflowed every chip on a wall by 2.3x at fly-to distance — the cell
 * clipped it, so the family read "$24,9". Found by MEASURING the built page, not by
 * reading the CSS; the gate could not have caught it, which is why the Playwright pass
 * exists alongside it.
 *
 * So the cap is computed per cell, at build time, from the actual string and the actual
 * span: a companion front is two spaces wide and can carry a figure twice the size of a
 * single's. Advance widths are Jost 700 at letter-spacing -.01em, measured in-browser
 * (a '1' is much narrower than a '0', and '$26,395' is genuinely narrower than
 * '$24,995'); the default is rounded UP from the widest digit so the estimate errs
 * toward fitting. verify_com_map.mjs recomputes every cap independently.
 */
const GLYPH_EM = { $: 0.60, ',': 0.31, 1: 0.49 };
const emWidth = (s) => [...s].reduce((t, ch) => t + (GLYPH_EM[ch] ?? 0.635), 0);
const CELL_PX = 36;      // usable width of one crypt space inside the 3D face grid
const CHIP_PAD = 3;      // the chip's own horizontal padding, plus a pixel of slack
/**
 * ...and a HARD CEILING over the geometric one, at 11px.
 *
 * Letting each front use all the width it has looked right in the arithmetic and wrong
 * on the wall: a companion crypt is two spaces across, so its figure came out at 17.5px
 * beside an 8px single, and the two companions on bank 101-110 read as the wall's
 * headline. They are not a headline. They are just wider crypts, and a family scanning
 * for what they can afford should not have their eye pulled to the $36,995 because it
 * happens to sit on a double-width front. 11px keeps a companion at most ~1.4x a single
 * — still visibly the bigger plaque, no longer an announcement.
 *
 * Caught by looking at the render, not by any assertion. The gate can only check that
 * the number is what the formula says; whether the formula produces a calm wall is a
 * thing you have to open the screenshot and see.
 */
const PMAX_CAP = 11;
const priceMaxPx = (s, span) =>
  Math.min(PMAX_CAP, Math.floor(((CELL_PX * span - CHIP_PAD) / emWidth(s)) * 10) / 10);

const priceChip = (u, cls) => {
  const p = cryptPrice(u);
  if (p == null) return '';
  const t = money(p);
  const cap = cls === 'c3p' ? ` style="--pmax:${priceMaxPx(t, u.cols.length)}px"` : '';
  return `<span class="${cls} ${priceBand(p).c}"${cap}>${t}</span>`;
};
function nicheAttrs(n) {
  return `data-kind="niche" data-wall="${n.wall}" data-id="${n.row}-${n.col}" data-ref="${n.ref}"`
    + ` data-row="${n.row}" data-col="${n.col}" data-price="${n.p == null ? '' : n.p}" data-st="${n.st}"`
    + (n.size ? ` data-size="${esc(n.size)}"` : '')
    + (n.dims ? ` data-dims="${esc(n.dims)}"` : '');
}

// ── Search index ──────────────────────────────────────────────────────────────
/**
 * ONE entry per SELLABLE POSITION — 781 crypt units + 122 niches = 903 — derived
 * here from the same `cryptUnits()` / `allNiches()` the page is rendered from.
 *
 * There is deliberately NO second list. The operator's complaint was that finding a
 * named crypt meant hunting tier by tier; the fix is a jump box, and a jump box whose
 * index is hand-maintained beside the data is a jump box that will one day fly the
 * camera to a crypt that no longer exists. `verify_com_map.mjs` re-derives this array
 * from the data module and compares it BYTE FOR BYTE against what the page carries,
 * so a parallel list cannot survive a build.
 *
 * The runtime does not carry pre-baked match keys either: it derives them from these
 * fields (see `keysOf` in the runtime), so "D-116", "d116", "116 D" and the full
 * "COM-1-1-D-116" are four spellings of one row rather than four rows.
 */
function searchIndex() {
  const areaOfBank = new Map(BANKS.map((b) => [b.id, b.area]));
  const rows = units.map((u) => ({
    r: u.ref, k: 'c', t: u.tier, c: u.cols.slice(), b: u.bank, a: areaOfBank.get(u.bank),
    s: u.st, p: cryptPrice(u) || 0, n: `Bank ${u.bank}`,
  }));
  for (const nn of allNiches()) {
    rows.push({
      r: nn.ref, k: 'n', t: nn.row, c: [nn.col], b: nn.wall, a: WALLS[nn.wall].area,
      s: nn.st, p: nn.p || 0, n: `${WALLS[nn.wall].name} Niche Wall`,
    });
  }
  return rows;
}

// ── Where every face physically is ────────────────────────────────────────────
/**
 * A face-on camera and the wall it flies to must come from ONE geometry. These four
 * tables are the same numbers `bank3d()` builds the scene from, re-expressed as
 * "stand here, look this way":
 *
 *   FACE_NORMAL  the outward direction you must stand on to see the face at all
 *   FACE_ALONG   the world direction the face's COLUMNS run in — a rotateY(180) face
 *                mirrors, so bank 124-140's spaces climb in -x while 111-115's climb
 *                in +x, and centring a search hit on the wrong one puts the crypt off
 *                the far edge of the frame
 *   FACE_YAW     the camera yaw that puts the face square to the viewer. Confirmed
 *                against all 19 hand-tuned walkthrough stops, which agree exactly.
 *   FACE_STANDOFF how far in front to stand. The tuned stops sit 22-52 plan units off
 *                their wall; 46 is inside that range and leaves the face filling the
 *                frame at the same zoom the presets use.
 */
const FACE_NORMAL = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
const FACE_ALONG = { N: [-1, 0], S: [1, 0], E: [0, -1], W: [0, 1] };
const FACE_YAW = { N: 180, S: 0, E: -90, W: 90 };
const FACE_STANDOFF = 46;

function facePlan(p, face) {
  if (face === 'N') return [p.x + p.w / 2, p.y];
  if (face === 'S') return [p.x + p.w / 2, p.y + p.h];
  if (face === 'W') return [p.x, p.y + p.h / 2];
  return [p.x + p.w, p.y + p.h / 2];
}

function faceTable() {
  const out = {};
  for (const b of BANKS) {
    const [fx, fz] = facePlan(b.plan, b.face);
    out[b.id] = {
      area: b.area, face: b.face, x: fx, z: fz, yaw: FACE_YAW[b.face],
      n: b.c1 - b.c0 + 1, c0: b.c0, cw: COLW, label: bankLabel(b),
    };
  }
  for (const wid of ['RAD', 'SER']) {
    const w = WALLS[wid];
    const [fx, fz] = facePlan(w.plan, w.face);
    out[wid] = {
      area: w.area, face: w.face, x: fx, z: fz, yaw: FACE_YAW[w.face],
      // Niche columns are no longer uniform, so cw is the wall's MEAN column width —
      // enough to centre the camera on a column, which is all fly-to uses it for.
      n: w.cols, c0: 1, cw: +((wallWidthIn(wid) * NICHE_UPI) / w.cols).toFixed(3),
      label: `${w.name} Niche Wall`,
    };
  }
  return out;
}

/**
 * What WASD must not walk through. The crypt banks and the niche walls are the ones
 * that matter — walking through a bank puts you inside a solid block of masonry with
 * the culling pass hiding the wall you came to look at — plus the rest rooms and the
 * storage room, which are real masses. Halls and the chapel are floor pads: you are
 * meant to walk across those.
 */
function solidRects() {
  const out = BANKS.map((b) => [b.plan.x, b.plan.y, b.plan.w, b.plan.h]);
  for (const wid of ['RAD', 'SER']) out.push([WALLS[wid].plan.x, WALLS[wid].plan.y, WALLS[wid].plan.w, WALLS[wid].plan.h]);
  for (const r of ROOMS) if (r.kind !== 'hall' && r.kind !== 'chapel') out.push([r.x, r.y, r.w, r.h]);
  return out;
}

/**
 * Cell badge per status. MIS-backed since 2026-08-01: a counselor reading a cell must
 * be able to tell SOLD from HELD from NOT-KNOWN without opening the card, and none of
 * these may read as sellable. Colour carries no meaning here — the badges are all
 * neutral white-on-dark or dark-on-white; the CELL pattern is the status code.
 */
const CRYPT_BADGE = {
  available: '<span class="cstat cs-a">Avail</span>',
  occupied: '<span class="cstat cs-o">Occupied</span>',
  reserved: '<span class="cstat cs-r">Reserved</span>',
  blocked: '<span class="cstat cs-x">Not selling</span>',
  unlisted: '<span class="cstat cs-u">Confirm</span>',
  // MIS says Available but attaches no price, so it is not on the market here.
  unpriced: '<span class="cstat cs-u">No price</span>',
};

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
    // A priced cell shows the figure INSTEAD of the "Avail" badge: the chip already says
    // available (only an available crypt can carry one) and two badges would not fit.
    const badge = cryptPrice(u) != null ? priceChip(u, 'cprice') : CRYPT_BADGE[u.st];
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
/**
 * TRUE SIZES, NOT A UNIFORM GRID (operator, 2026-08-02: "the niches are not sized
 * correctly — there are a few different sizes of glass front niches on each wall").
 *
 * A CSS grid cannot do this. Column boundaries differ FROM ROW TO ROW on both walls —
 * Radiance row K starts with an 18 1/4" Small where row J starts with a 23" Large, and
 * rows E/D drop to six cells of 26" and 30 1/2" — so there is no set of column tracks
 * that all ten rows share. Every cell is therefore placed absolutely from its own
 * measured left edge and width, both expressed as a percentage of the wall's real
 * width (165" for Radiance, 88.5" for Serenity). One geometry, used by this flat grid
 * and by the 3D face alike, so the two renderings cannot disagree.
 *
 * The 1px insets are the old grid `gap` kept as a visible mortar line between fronts.
 */
const nicheBox = (nn, ri, span, nRows) => {
  const top = (ri / nRows) * 100, hgt = (span / nRows) * 100;
  return `left:calc(${nn.leftPct}% + 1px);width:calc(${nn.widthPct}% - 2px);`
    + `top:calc(${top.toFixed(4)}% + 1px);height:calc(${hgt.toFixed(4)}% - 2px)`;
};

function wallGrid(wid, { mini = false } = {}) {
  const w = WALLS[wid];
  const niches = wallNiches(wid);
  const rowPx = mini ? 20 : 46;
  const nRows = w.rows.length;
  const cells = niches.map((nn) => {
    const ri = w.rows.indexOf(nn.row);
    const span = nn.spanRows ? nn.spanRows.length : 1;
    const st = nn.st !== 'available' ? ` st-${nn.st}` : '';
    const body = nn.p != null && !mini ? `<span class="nprice">${money(nn.p)}</span>` : '';
    const badge = mini ? '' : (nn.st === 'available' ? '' : '<span class="cstat cs-u">Confirm</span>');
    return `    <button type="button" class="c flatn sz-${nn.sizeKey}${st}" style="${nicheBox(nn, ri, span, nRows)}" ${nicheAttrs(nn)} aria-label="${esc(nicheAria(nn))}"><span class="cid">${nn.row}-${nn.col}</span>${body}${badge}</button>`;
  }).join('\n');
  const rl = w.rows.map((r, i) => `    <div class="rlbl nrl" style="top:${((i / nRows) * 100).toFixed(4)}%;height:${(100 / nRows).toFixed(4)}%">${r}</div>`).join('\n');
  return `  <div class="nwall${mini ? ' mini' : ''}" style="height:${rowPx * nRows}px;max-width:${mini ? 260 : 520}px;">
${rl}
    <div class="nface">
${cells}
    </div>
  </div>`;
}

/**
 * The plan footprint MINUS the EMPTY-AREA void columns at either end. MIS does not draw
 * those columns at all — bank 124-140's 138/139/140 and 141-148's 141/142/143 are
 * "EMPTY AREA — NO CRYPTS IN THIS SECTION" — and drawing them pushed the rectangle over
 * the Rest Rooms and the Storage Room. The 3D face still carries the full column count
 * with the void cells rendered as voids, exactly as the crypt sheet prints them.
 */
function drawnPlan(b) {
  const p = b.plan;
  const vs = VOIDS.filter((v) => v.bank === b.id);
  if (!vs.length) return p;
  const cols = new Set(vs.flatMap((v) => v.cols));
  let lead = 0, trail = 0;
  for (let c = b.c0; cols.has(c); c++) lead++;
  for (let c = b.c1; cols.has(c); c--) trail++;
  const cut = (lead + trail) * COLW;
  if (!cut) return p;
  const along = b.face === 'N' || b.face === 'S' ? 'x' : 'y';
  const size = along === 'x' ? 'w' : 'h';
  return { ...p, [along]: p[along] + lead * COLW, [size]: p[size] - cut };
}

// ── floor plan SVG ────────────────────────────────────────────────────────────
function planSvg() {
  const parts = [];
  parts.push(`<rect class="pshell" x="1" y="1" width="${PLAN_W - 2}" height="${PLAN_H - 2}" rx="6"/>`);
  // Rose-marble wash: the north-east wing and the Radiance alcove are finished in a
  // different stone from the chapel end (walkthrough video, see MATERIAL_ZONES).
  for (const z of MATERIAL_ZONES) {
    parts.push(`<rect class="pzone pz-${z.mat}" x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="4"/>`);
  }
  for (const r of ROOMS) {
    // The chapel label goes at the TOP of its pad — the seating fills the middle.
    const ly = r.kind === 'chapel' ? r.y + r.h - 9 : r.y + r.h / 2 + 4;
    parts.push(`<g class="proom pr-${r.kind}"><rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="3"/><text x="${r.x + r.w / 2}" y="${ly}">${esc(r.label)}</text></g>`);
  }
  // Chapel furniture, so the plan reads as a chapel and not an empty box.
  for (const c of chapelChairs()) {
    parts.push(`<rect class="pchair" x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="1.5"/>`);
  }
  for (const f of FURNITURE) {
    parts.push(`<g class="pfurn pf-${f.kind}"><rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" rx="2"/>`
      + (f.label ? `<text x="${f.x + f.w / 2}" y="${f.y + f.h / 2 + 3.5}">${esc(f.label)}</text>` : '') + `</g>`);
  }
  for (const e of ENTRANCES) {
    parts.push(`<g class="pentr" data-stop="${e.id}" tabindex="0" role="button" aria-label="${esc(e.label + ' — ' + e.sub + '. Walk in from here.')}">`
      + `<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" rx="3"/>`
      + `<text x="${e.x + e.w / 2}" y="${e.y + e.h / 2 + 4}"${e.w < e.h ? ` transform="rotate(-90 ${e.x + e.w / 2} ${e.y + e.h / 2})"` : ''}>${esc(e.label)}</text></g>`);
  }
  for (const b of BANKS) {
    const list = unitsByBank.get(b.id);
    const av = list.filter((u) => u.st === 'available').length;
    const p = drawnPlan(b);
    parts.push(`<g class="pbank mt-${materialAt(p.x + p.w / 2, p.y + p.h / 2)}${av ? ' has-av' : ''}" data-bank="${b.id}" data-area="${b.area}" tabindex="0" role="button" aria-label="${esc(bankLabel(b) + ', ' + bankSub(b) + ', ' + av + ' available')}">`
      + `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="2"/>`
      + `<text class="pblab" x="${p.x + p.w / 2}" y="${p.y + p.h / 2 + 4}"${p.w < p.h ? ` transform="rotate(-90 ${p.x + p.w / 2} ${p.y + p.h / 2})"` : ''}>${b.id}${av ? ` · ${av}` : ''}</text>`
      + `</g>`);
  }
  for (const wid of ['RAD', 'SER']) {
    const w = WALLS[wid], p = w.plan;
    const av = wallNiches(wid).filter((n) => n.st === 'available').length;
    parts.push(`<g class="pbank pniche mt-${materialAt(p.x + p.w / 2, p.y + p.h / 2)} has-av" data-bank="${wid}" data-area="${w.area}" tabindex="0" role="button" aria-label="${esc(w.name + ' niche wall, ' + av + ' available')}">`
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

/**
 * The crypt fronts sit on the OUTWARD EDGE of the bank's footprint, not at its
 * centroid. Placing them at the centroid is what buried the deep (tandem) banks half
 * inside their own block and left the shallow ones floating off their wall.
 */
/**
 * Every solid in the scene carries its PLAN position. CSS 3D has no view frustum: a
 * wall standing behind the camera is still projected, and at interior range it lands
 * across the screen as a huge slab. The runtime uses these two numbers to hide
 * whatever is behind you at a walkthrough stop.
 */
const at = (x, z) => ` data-px="${Math.round(x)}" data-pz="${Math.round(z)}"`;
const atR = (r) => at(r.x + r.w / 2, r.y + r.h / 2);

function faceCentre(p, face) {
  const mx = p.x + p.w / 2 - PLAN_W / 2, mz = p.y + p.h / 2 - PLAN_H / 2;
  if (face === 'N') return [mx, p.y - PLAN_H / 2];
  if (face === 'S') return [mx, p.y + p.h - PLAN_H / 2];
  if (face === 'W') return [p.x - PLAN_W / 2, mz];
  return [p.x + p.w - PLAN_W / 2, mz];
}

/** 3D face tags. Only three fit at face scale; the rest read from the cell pattern. */
const C3_TAG = {
  available: '<span class="c3st c3av">AVAIL</span>',
  blocked: '<span class="c3st">NS</span>',
  occupied: '<span class="c3st">OCC</span>',
  reserved: '<span class="c3st">RES</span>',
};

function bank3d(b) {
  const n = b.c1 - b.c0 + 1;
  const faceW = n * COLW;
  const list = unitsByBank.get(b.id);
  const cells = list.map((u) => {
    const ri = TIERS.indexOf(u.tier) + 1;
    const ci = u.cols[0] - b.c0 + 1;
    const st = u.st !== 'available' ? ` st-${u.st}` : '';
    const tag = cryptPrice(u) != null ? priceChip(u, 'c3p') : (C3_TAG[u.st] || '');
    // NO REF ON THE FRONT (2026-08-01). Operator: "the locations do not have to be
    // present on the crypt fronts just on the hover. it takes up too much space just
    // make the prices larger." A crypt front in the real building carries a name, not
    // a grid coordinate; G-111 painted across 781 of them is a spreadsheet. The ref is
    // still on the element (data-ref, data-id and the aria-label) and still reaches a
    // person three ways — the hover card, the pinned card, and the family callout —
    // so nothing is lost but the ink. The FLAT grids keep their ref: those are
    // worklists a counselor reads down, not fronts a family looks at.
    return `      <button type="button" class="c3 ty-${u.type}${st}" style="grid-row:${ri};grid-column:${ci}/span ${u.cols.length}" ${cryptAttrs(u)} aria-label="${esc(unitAria(u))}">${tag}</button>`;
  });
  for (const v of VOIDS.filter((v) => v.bank === b.id)) {
    cells.push(`      <div class="c3void" style="grid-row:${TIERS.indexOf(v.tiers[0]) + 1}/span ${v.tiers.length};grid-column:${v.cols[0] - b.c0 + 1}/span ${v.cols.length}"></div>`);
  }
  const p = b.plan;
  const [fx, fz] = faceCentre(p, b.face);
  const [bx, bz] = [cx(p), cz(p)];
  const mt = materialAt(p.x + p.w / 2, p.y + p.h / 2);
  return `    <div class="blk mt-${mt} ar-${b.area}" data-blk="${b.id}"${atR(p)} style="width:${px(p.w)}px;height:${px(p.h)}px;transform:translate(-50%,-50%) translate3d(${px(bx)}px,${px(FACE_H / 2)}px,${px(bz)}px) rotateX(-90deg)"></div>
    <div class="face mt-${mt} ar-${b.area}" data-bankface="${b.id}" data-area="${b.area}"${at(fx + PLAN_W / 2, fz + PLAN_H / 2)} style="width:${px(faceW)}px;height:${px(FACE_H)}px;grid-template-columns:repeat(${n},1fr);grid-template-rows:repeat(${TIERS.length},1fr);transform:translate(-50%,-50%) translate3d(${px(fx)}px,0,${px(fz)}px) rotateY(${ROT[b.face]}deg)">
${cells.join('\n')}
    </div>
    <div class="fbase mt-${mt} ar-${b.area}" data-area="${b.area}"${at(fx + PLAN_W / 2, fz + PLAN_H / 2)} style="width:${px(faceW)}px;height:14px;transform:translate(-50%,-50%) translate3d(${px(fx)}px,${px(FACE_H / 2) + 7}px,${px(fz)}px) rotateY(${ROT[b.face]}deg)"><b>${b.id}</b></div>`;
}

function wall3d(wid) {
  const w = WALLS[wid], p = w.plan;
  // The face is now as wide as the wall really is — 165" of Radiance against 88.5" of
  // Serenity — instead of `columns x NCOLW`, which drew Serenity at 75% of Radiance
  // because it has 6 columns to Radiance's 8 rather than because it is 54% as wide.
  const faceW = wallWidthIn(wid) * NICHE_UPI;
  const rows = w.rows.length;
  const h = rows * (ROWH * 0.72);
  const cells = wallNiches(wid).map((nn) => {
    const ri = w.rows.indexOf(nn.row);
    const span = nn.spanRows ? nn.spanRows.length : 1;
    const st = nn.st !== 'available' ? ` st-${nn.st}` : '';
    const chip = nn.p != null ? `<span class="n3p">${money(nn.p)}</span>` : '';
    return `      <button type="button" class="c3 n3glass sz-${nn.sizeKey}${st}" style="${nicheBox(nn, ri, span, rows)}" ${nicheAttrs(nn)} aria-label="${esc(nicheAria(nn))}"><span class="c3id">${nn.row}-${nn.col}</span>${chip}</button>`;
  }).join('\n');
  const [fx, fz] = faceCentre(p, w.face);
  // RECESSED, not free-standing (video 1:27 and 2:01-2:03): the surrounding marble
  // wall runs past the glass on both sides and carries on above it, and a marble
  // plinth returns at the floor. Draw that reveal so the wall reads as built in.
  const mt = materialAt(p.x + p.w / 2, p.y + p.h / 2);
  const rev = w.mount === 'recessed'
    ? `    <div class="nreveal mt-${mt}"${at(fx + PLAN_W / 2, fz + PLAN_H / 2)} style="width:${px(faceW + NCOLW * 1.6)}px;height:${px(FACE_H)}px;transform:translate(-50%,-50%) translate3d(${px(fx)}px,0,${px(fz)}px) rotateY(${ROT[w.face]}deg)"></div>\n`
    : '';
  return rev + `    <div class="face nichewall mt-${mt} ar-${w.area}" data-bankface="${wid}" data-area="${w.area}" data-homearea="${w.homeArea}"${at(fx + PLAN_W / 2, fz + PLAN_H / 2)} style="width:${px(faceW)}px;height:${px(h)}px;transform:translate(-50%,-50%) translate3d(${px(fx)}px,${px((FACE_H - h) / 2)}px,${px(fz)}px) rotateY(${ROT[w.face]}deg)">
${cells}
    </div>
    <div class="fbase nplinth mt-${mt} ar-${w.area}" data-area="${w.area}"${at(fx + PLAN_W / 2, fz + PLAN_H / 2)} style="width:${px(faceW + NCOLW * 1.6)}px;height:14px;transform:translate(-50%,-50%) translate3d(${px(fx)}px,${px(FACE_H / 2) + 7}px,${px(fz)}px) rotateY(${ROT[w.face]}deg)"><b>${w.name}</b></div>`;
}

// ── Entrances, furniture, chairs and walk-in hotspots ────────────────────────
/** A small solid box: four sides plus a lid, sitting ON the floor plane. */
function box3d(o, cls, label) {
  const w = o.w, d = o.h, mh = o.tall;
  const x = o.x + w / 2 - PLAN_W / 2, z = o.y + d / 2 - PLAN_H / 2;
  const y = FACE_H / 2 - mh / 2;
  const out = [];
  for (const [sw, ry, off] of [[w, 0, [0, d / 2]], [w, 180, [0, -d / 2]], [d, 90, [w / 2, 0]], [d, -90, [-w / 2, 0]]]) {
    out.push(`    <div class="${cls}"${atR(o)} style="width:${px(sw)}px;height:${px(mh)}px;transform:translate(-50%,-50%) translate3d(${px(x + off[0])}px,${px(y)}px,${px(z + off[1])}px) rotateY(${ry}deg)">${label ? `<span>${esc(label)}</span>` : ''}</div>`);
  }
  out.push(`    <div class="${cls} btop"${atR(o)} style="width:${px(w)}px;height:${px(d)}px;transform:translate(-50%,-50%) translate3d(${px(x)}px,${px(y - mh / 2)}px,${px(z)}px) rotateX(90deg)"></div>`);
  return out.join('\n');
}

/** A chapel chair: a seat pad and an upright back on the side away from the altar. */
function chair3d(c) {
  const x = c.x + c.w / 2 - PLAN_W / 2, z = c.y + c.h / 2 - PLAN_H / 2;
  const seatY = FACE_H / 2 - c.tall * 0.45;
  const backY = FACE_H / 2 - c.tall * 0.78;
  return `    <div class="chair cseat" data-chair="${c.id}"${atR(c)} style="width:${px(c.w)}px;height:${px(c.h)}px;transform:translate(-50%,-50%) translate3d(${px(x)}px,${px(seatY)}px,${px(z)}px) rotateX(90deg)"></div>
    <div class="chair cback"${atR(c)} style="width:${px(c.w)}px;height:${px(c.tall * 0.62)}px;transform:translate(-50%,-50%) translate3d(${px(x)}px,${px(backY)}px,${px(z + c.h / 2)}px)"></div>`;
}

function entrance3d(e) {
  const x = e.x + e.w / 2 - PLAN_W / 2, z = e.y + e.h / 2 - PLAN_H / 2;
  const mh = FACE_H * 0.42;
  const y = FACE_H / 2 - mh / 2;
  const [sw, ry] = e.face === 'W' || e.face === 'E' ? [e.h, ROT[e.face]] : [e.w, ROT[e.face]];
  return `    <div class="doorway" data-stop="${e.id}"${atR(e)} role="button" tabindex="0" aria-label="${esc(e.label + ' — ' + e.sub + '. Walk in from here.')}" style="width:${px(sw)}px;height:${px(mh)}px;transform:translate(-50%,-50%) translate3d(${px(x)}px,${px(y)}px,${px(z)}px) rotateY(${ry}deg)"><span>${esc(e.label)}</span></div>
    <div class="doormat"${atR(e)} data-fx="${e.x + e.w / 2}" data-fz="${e.y + e.h / 2}" style="width:${px(e.w)}px;height:${px(e.h)}px;transform:translate(-50%,-50%) translate3d(${px(x)}px,${px(FACE_H / 2 - 0.6)}px,${px(z)}px) rotateX(-90deg)"></div>`;
}

/** A floor disc you can click to walk to that stop. */
function hotspot3d(s) {
  const x = s.x - PLAN_W / 2, z = s.z - PLAN_H / 2;
  return `    <button type="button" class="hot" data-stop="${s.id}" data-area="${s.area}"${at(s.x, s.z)} aria-label="${esc('Walk to ' + s.label + ' — ' + s.sub)}" style="transform:translate(-50%,-50%) translate3d(${px(x)}px,${px(FACE_H / 2 - 1.2)}px,${px(z)}px) rotateX(-90deg)"><span>${esc(s.label)}</span></button>`;
}

function mass3d(r) {
  const w = r.w, d = r.h, x = r.x + w / 2 - PLAN_W / 2, z = r.y + d / 2 - PLAN_H / 2;
  const mh = (r.kind === 'hall' || r.kind === 'chapel') ? 0 : FACE_H * 0.55;
  if (!mh) {
    return `    <div class="hallpad hp-${r.kind}"${atR(r)} data-fx="${r.x + r.w / 2}" data-fz="${r.y + r.h / 2}" style="width:${px(w)}px;height:${px(d)}px;transform:translate(-50%,-50%) translate3d(${px(x)}px,${px(FACE_H / 2 - 0.4)}px,${px(z)}px) rotateX(-90deg)"><span>${esc(r.label)}</span></div>`;
  }
  const y = FACE_H / 2 - mh / 2;
  const out = [];
  for (const [sw, ry, off] of [[w, 0, [0, d / 2]], [w, 180, [0, -d / 2]], [d, 90, [w / 2, 0]], [d, -90, [-w / 2, 0]]]) {
    out.push(`    <div class="mass mk-${r.kind}"${atR(r)} style="width:${px(sw)}px;height:${px(mh)}px;transform:translate(-50%,-50%) translate3d(${px(x + off[0])}px,${px(y)}px,${px(z + off[1])}px) rotateY(${ry}deg)"><span>${esc(r.label)}</span></div>`);
  }
  out.push(`    <div class="mass mtop mk-${r.kind}"${atR(r)} style="width:${px(w)}px;height:${px(d)}px;transform:translate(-50%,-50%) translate3d(${px(x)}px,${px(y - mh / 2)}px,${px(z)}px) rotateX(90deg)"></div>`);
  return out.join('\n');
}

function scene3d() {
  const chairs = chapelChairs();
  return `<div class="scene" id="scene" tabindex="0" role="application" aria-label="Three-dimensional walk-through model of the Chapel of Memory Mausoleum interior. Click a doorway or a floor marker to walk to that part of the building; drag to look around.">
  <div class="stage" id="stage">
    <div class="bldg" id="bldg">
    <div class="floor" data-fx="${PLAN_W / 2}" data-fz="${PLAN_H / 2}" style="width:${px(PLAN_W)}px;height:${px(PLAN_H)}px;transform:translate(-50%,-50%) translate3d(0,${px(FACE_H / 2) + 1}px,0) rotateX(-90deg)"></div>
${ROOMS.map(mass3d).join('\n')}
${BANKS.map(bank3d).join('\n')}
${['RAD', 'SER'].map(wall3d).join('\n')}
${ENTRANCES.map(entrance3d).join('\n')}
${FURNITURE.map((f) => box3d(f, `furn fk-${f.kind}`, f.label)).join('\n')}
${chairs.map(chair3d).join('\n')}
${STOPS.map(hotspot3d).join('\n')}
    <div class="reticle" id="reticle" aria-hidden="true"></div>
    </div>
  </div>
</div>
<div class="callout no-print" id="callout" aria-hidden="true"></div>`;
}

// ── views ─────────────────────────────────────────────────────────────────────
/**
 * The per-wall size legend, now a REAL key to what is drawn rather than a footnote.
 * Each row carries the class, its printed dimensions, and how many of that class the
 * wall actually holds — so a counselor can see at a glance that Radiance is 32 Smalls,
 * 32 Larges, 8 X-Larges and 2 Family niches, and match the swatch to the wall.
 */
function sizeLegend(wid) {
  const w = WALLS[wid];
  const ns = wallNiches(wid);
  const rows = w.sizes.map((s) => {
    const n = ns.filter((x) => x.sizeKey === s.k).length;
    return `<span class="szi"><i class="szs sz-${s.k}"></i><b>${esc(s.label)}</b> ${esc(s.dims)} <em>&times;${n}</em></span>`;
  }).join('');
  const fam = w.sizes.find((s) => s.k === 'family');
  // The one thing the sheet contradicts itself about, said out loud rather than papered
  // over: the legend gives every Radiance class the same 11 7/8" height, yet the sheet
  // draws the Family niches two rows tall (their DEPTH is doubled, 25 1/2").
  const note = fam
    ? `<em class="szn">Height &times; width &times; depth, as printed on the wall sheet. Every niche holds two inurnments. The two Family niches (E/D, spaces 2 and 5) are full double-height compartments &mdash; confirmed from photographs of the wall &mdash; and are twice as deep as the rest.</em>`
    : `<em class="szn">Height &times; width &times; depth, as printed on the wall sheet. Every niche holds two inurnments. A Small is exactly half a Large, so the four narrow spaces in rows K, J, B and A fill the same wall as two wide ones.</em>`;
  return `      <div class="sizeleg"><b>Niche sizes on this wall — every row spans ${wallWidthIn(wid)}&quot;</b>${rows}${note}</div>`;
}

function wallBlock(wid) {
  const w = WALLS[wid];
  const av = wallNiches(wid).filter((n) => n.st === 'available');
  return `    <div class="bwrap" data-blk="${wid}">
      <div class="btitle">${esc(w.name)} Niche Wall</div>
      <div class="bsub">${esc(w.prefix)}-ROW-SPACE · rows K (top) to A (bottom) · ${esc(w.note)}</div>
      <div class="gwrap">
${wallGrid(wid)}
      </div>
${sizeLegend(wid)}
      <div class="bsub">${av.length} available · ${money(av.reduce((s, n) => s + n.p, 0))} listed · ${esc(NICHE_PRICES_EFFECTIVE)}</div>
    </div>`;
}

/**
 * SECTION ISOLATION (operator, 2026-08-02: "When clicking on a section on the floor plan
 * just show that section, not the whole north wing (for example)").
 *
 * Every block in an area view is tagged with the bank or wall it draws, and the bar
 * below is what the runtime shows once one of them has been isolated: the name of the
 * section you are looking at, a way back up to the whole area, and a way back out to the
 * floor plan. It is emitted on EVERY area, not just the niche ones, because the request
 * was about the plan's behaviour and the plan's sections are all of them.
 */
function isoBar(a) {
  return `    <div class="isobar no-print" hidden>
      <button type="button" class="isob" data-iso="plan">&larr; Floor plan</button>
      <span class="isotxt" id="isotxt-${a.id}"></span>
      <button type="button" class="isob isoall" data-iso="all">Show all of ${esc(a.label)}</button>
    </div>`;
}

function areaView(a) {
  const banks = BANKS.filter((b) => b.area === a.id);
  const blocks = banks.map((b) => `    <div class="bwrap" data-blk="${b.id}">
      <div class="btitle">${esc(bankLabel(b))}</div>
      <div class="bsub">${esc(bankSub(b))}</div>
      <div class="gwrap">
${bankGrid(b)}
      </div>
      <div class="bsub bmoney">${bankRollup(b)}</div>
    </div>`);
  for (const wid of ['RAD', 'SER']) if (WALLS[wid].area === a.id) blocks.push(wallBlock(wid));
  return `  <div class="wview" id="area-${a.id}" data-area="${a.id}">
    <div class="wlabel">${esc(a.label)}</div>
    <div class="wsub">${esc(a.sub)}</div>
${isoBar(a)}
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
  .htxt p{font-size:11px;font-weight:300;color:var(--gold);letter-spacing:.12em;text-transform:uppercase;margin-top:2px;}

  /* ── Find a crypt: the jump box ──────────────────────────────────────────────
     Operator, 2026-08-01: "no way to jump to a ref or search; you have to hunt tier
     by tier." It lives in the HEADER, not in a tab, because it is the one control
     that works from every view. ── */
  .srch{position:relative;flex:1 1 240px;min-width:180px;max-width:340px;margin-left:auto;}
  .srch input{width:100%;background:rgba(255,255,255,.07);border:1px solid var(--gb);border-radius:6px;
    color:var(--cream);font-family:'Jost',sans-serif;font-size:13px;padding:8px 30px 8px 11px;
    -webkit-appearance:none;appearance:none;}
  .srch input::placeholder{color:var(--gold-light);opacity:.6;}
  .srch input:focus{outline:none;border-color:var(--gold);background:rgba(255,255,255,.12);}
  .srch input::-webkit-search-cancel-button{-webkit-appearance:none;}
  .qclear{position:absolute;right:4px;top:50%;transform:translateY(-50%);background:none;border:none;
    color:var(--gold-light);font-size:16px;line-height:1;cursor:pointer;padding:3px 6px;display:none;}
  .srch.has-q .qclear{display:block;}
  .qclear:hover{color:var(--cream);}
  .qlist{position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:1000;list-style:none;margin:0;padding:4px;
    background:rgba(12,19,38,.985);border:1px solid var(--gold);border-radius:7px;max-height:min(58vh,340px);
    overflow-y:auto;box-shadow:0 12px 38px rgba(0,0,0,.7);-webkit-overflow-scrolling:touch;}
  .qlist[hidden]{display:none;}
  .qopt{display:flex;align-items:center;gap:8px;padding:8px 9px;border-radius:5px;cursor:pointer;
    font-size:12px;color:var(--cream);}
  .qopt:hover,.qopt.on{background:rgba(200,169,110,.26);}
  .qoid{font-family:'Cormorant Garamond',serif;font-weight:700;font-size:14px;color:var(--gold);
    min-width:62px;flex-shrink:0;}
  .qowhere{flex:1;font-size:10.5px;color:var(--gold-light);opacity:.85;letter-spacing:.03em;
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .qop{font-weight:700;font-size:10.5px;padding:1px 4px;border-radius:3px;flex-shrink:0;
    background:rgba(255,255,255,.9);color:#123a24;}
  .qost{font-size:8.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;flex-shrink:0;
    padding:1px 4px;border-radius:3px;background:rgba(255,255,255,.16);color:#e6e3dc;}
  .qmsg{padding:10px 10px;font-size:11.5px;color:var(--gold-light);line-height:1.5;}
  .qmsg b{color:var(--gold);}
  .qsr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;}

  .tabs{display:flex;background:var(--navy-light);border-bottom:1px solid var(--gb);overflow-x:auto;}
  .tab{padding:10px 14px;font-size:12px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--gold-light);cursor:pointer;border:none;border-bottom:3px solid transparent;white-space:nowrap;transition:all .2s;background:none;}
  .tab:hover{color:var(--cream);background:rgba(200,169,110,.08);}
  .tab.active{color:var(--gold);border-bottom-color:var(--gold);background:rgba(200,169,110,.12);}
  .tabs2{background:rgba(15,23,44,.85);border-bottom:1px solid var(--gb);align-items:center;}
  .tabs2 .tab{font-size:11px;padding:8px 12px;opacity:.9;}
  .tabl{flex-shrink:0;padding:0 12px 0 20px;font-size:10px;letter-spacing:.14em;text-transform:uppercase;
    color:var(--gold);opacity:.85;white-space:nowrap;}
  .main{padding:14px;}
  .wview,.view3d{display:none;}.wview.active,.view3d.active{display:block;}
  .wlabel{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:var(--gold);margin:14px 0 2px;text-align:center;}
  .wsub{font-size:12px;color:var(--gold-light);letter-spacing:.08em;margin-bottom:10px;text-align:center;}
  .btitle{font-family:'Cormorant Garamond',serif;font-size:15px;font-weight:600;color:var(--gold);text-align:center;margin:16px 0 1px;}
  .bsub{font-size:11px;color:var(--gold-light);opacity:.9;letter-spacing:.06em;text-align:center;margin-bottom:6px;text-transform:uppercase;}
  .bwrap{max-width:1100px;margin:0 auto 6px;}
  .gwrap{background:linear-gradient(160deg,#0f1a30,#1a2744 60%,#0d1528);border:1px solid var(--gb);border-radius:8px;padding:12px 14px;overflow-x:auto;margin:0 auto;}
  .cgrid{display:grid;gap:2px;margin:0 auto;width:100%;min-width:220px;}
  .cgrid.mini{gap:1px;}
  /* ── Niche wall: true sizes, so absolute boxes rather than grid tracks ──
     Column boundaries differ from row to row on both walls (see wallGrid), which no
     set of shared grid tracks can express. The wall is a positioned box; every front
     sits at its own measured left/width as a percentage of the wall's real width.
     .c and .c3 both set position:relative, and both are declared after this block, so
     the absolute placement has to out-specify them or every front stacks in document
     flow and the wall cascades diagonally down the page (seen, 2026-08-02). Hence the
     two-class selectors rather than a bare .flatn. */
  .nwall{position:relative;margin:0 auto;width:100%;min-width:220px;}
  .nwall .nrl{position:absolute;left:0;width:20px;}
  .nface{position:absolute;left:20px;right:0;top:0;bottom:0;}
  .nface .flatn{position:absolute;}
  .face.nichewall .c3{position:absolute;}
  /* The print-overview mini. It used to inherit .cgrid.mini's 6.5px label; a niche wall
     mini is 8 columns in the same panel a 17-column crypt bank fills, so its fronts are
     twice as wide and can carry a slightly larger label without crowding. */
  .nwall.mini .rlbl{font-size:8px;}
  .nwall.mini .cid{font-size:7.5px;opacity:.9;text-shadow:none;}
  .rlbl,.clbl{display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:12px;font-weight:700;color:var(--gold);}
  .clbl{font-size:9.5px;font-family:'Jost',sans-serif;opacity:.95;}
  .cgrid.mini .rlbl{font-size:8px;}
  .ovgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;max-width:1200px;margin:0 auto;}
  .ovp{background:linear-gradient(160deg,#0f1a30,#1a2744 60%,#0d1528);border:1px solid var(--gb);border-radius:7px;padding:8px 9px;overflow:hidden;}
  .ovt{font-family:'Cormorant Garamond',serif;font-size:13px;font-weight:600;color:var(--gold);margin-bottom:4px;text-align:center;}

  /* ── Crypt cell: polished marble front, bronze frame ── */
  .c{border-radius:2px;border:1px solid rgba(0,0,0,.5);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;
    transition:transform .15s,box-shadow .15s,filter .15s;text-align:center;padding:1px;line-height:1.15;font-size:8px;min-width:0;
    color:#f6f4ef;gap:1px;overflow:hidden;position:relative;
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
  .cid{font-size:9.5px;opacity:1;font-weight:500;white-space:nowrap;text-shadow:0 1px 1px rgba(0,0,0,.6);}
  .cgrid.mini .cid{font-size:6.5px;opacity:.85;text-shadow:none;}
  .nprice{font-weight:700;font-size:10px;padding:0 4px;border-radius:3px;background:#0f7a4a;color:#fff;box-shadow:0 1px 2px rgba(0,0,0,.35);}
  /* ── Crypt price chip. HUE MEANS MONEY on this page and means nothing else:
     status is carried by pattern and darkness (see the status block below), so a
     coloured chip can only ever be an available, MIS-priced crypt. Six bands over
     29 distinct prices; the chip TEXT is always the exact figure, never rounded and
     never a band label. Contrast is recomputed by verify_com_map.mjs. ── */
  .cprice{font-weight:700;font-size:10px;padding:0 3px;border-radius:3px;white-space:nowrap;
    max-width:100%;overflow:hidden;text-overflow:clip;box-shadow:0 1px 2px rgba(0,0,0,.4);}
  /* The price on a 3D crypt front. It is the ONLY thing written there now, so it takes
     the LOD scaling the ref used to have — and a base of 7px, which is exactly what the
     price was FIXED at before, so no price is ever smaller than it used to be at any
     zoom. It grows from there until it reaches --pmax, the per-cell ceiling the build
     computes from this figure's own glyphs and this front's own width (see priceMaxPx).
     A one-space front tops out near 8px, a companion front at the 11px hard ceiling.
     max-width + the cell's overflow:hidden are the belt-and-braces behind the cap. */
  .c3p{font-weight:700;font-size:min(calc(7px * var(--lod,1)),var(--pmax,7px));
    padding:0 1px;border-radius:2px;white-space:nowrap;
    max-width:100%;overflow:hidden;letter-spacing:-.01em;box-shadow:0 1px 2px rgba(0,0,0,.35);}
${PRICE_BANDS.map((b) => `  .${b.c}{background:${skin(b).bg};color:${skin(b).fg};}`).join('\n')}
  .plegend{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:10px auto 0;max-width:1000px;}
  .pli{display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--gold-light);}
  .pls{width:14px;height:14px;border-radius:3px;border:1px solid rgba(255,255,255,.2);flex-shrink:0;}
  .cstat{font-size:7.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:0 3px;border-radius:2px;}
  .cs-a{background:rgba(255,255,255,.92);color:#123a24;}
  .cs-u{background:rgba(255,255,255,.16);color:#e6e3dc;}
  .cs-r{background:rgba(255,255,255,.30);color:#f2f0ec;}
  .cs-o{background:rgba(255,255,255,.72);color:#16171a;}
  .cs-x{background:rgba(255,255,255,.9);color:#3a1212;}
  .cvoid,.c3void{display:flex;align-items:center;justify-content:center;border:1px dashed rgba(232,213,168,.35);border-radius:2px;
    background:repeating-linear-gradient(45deg,rgba(255,255,255,.04) 0 6px,rgba(255,255,255,0) 6px 12px);
    color:var(--gold-light);font-size:8.5px;letter-spacing:.06em;text-align:center;opacity:.9;text-transform:uppercase;}
  .c3void{border-color:rgba(0,0,0,.3);}

  /* ── Status code: PATTERN + darkness, never hue. Nothing here shares a colour
     with anything that means money. Crypt statuses became MIS-backed on 2026-08-01,
     so the single old "unavailable" cell now splits three ways and each has to be
     distinguishable from the others WITHOUT hue:
       occupied  = blacked out, flat and closed (same family as ROAC's buried cell)
       reserved  = diagonal stripe over a cool grey (same family as ROAC's reserved)
       unlisted  = the ORIGINAL "Unavailable — confirm in MIS" cell, unchanged: the
                   same stripe geometry over the warmer brown-grey. Kept identical on
                   purpose — for those 18 crypts nothing about what we know changed.
       unavailable = niches only. The MIS list covers Section = COM, so the RAD/SER
                   walls are still sheet-derived and keep the old class.
     reserved and unlisted share a stripe angle, so their BADGES carry the
     distinction at cell scale ("Reserved" vs "Confirm") and their cards differ.

     SOFTENED 2026-08-01, same operator note about the colours. The four treatments
     were pitched near black — occupied bottomed out at #0e0f12 — which punched holes
     in the wall and made a bank of sold crypts look damaged rather than simply taken.
     Every value is lifted a full step into dark STONE, and the distinctions are
     untouched because none of them was ever carried by how dark the cell was:
       occupied  = flat, no stripe, coolest and darkest of the four
       blocked   = flat + the diagonal slash, and warm where occupied is cool
       reserved  = stripe over a cool grey
       unlisted  = the same stripe over a warm brown-grey
     Occupied is still visibly the closed one; nothing now reads as a void. ── */
  .st-unavailable,.st-unlisted,.st-unpriced{background:
      repeating-linear-gradient(135deg,rgba(255,255,255,.10) 0 4px,rgba(255,255,255,0) 4px 9px),
      linear-gradient(180deg,#413e37 0%,#2c2924 100%)!important;color:#cfcbc2;}
  .st-reserved{background:
      repeating-linear-gradient(135deg,rgba(255,255,255,.10) 0 4px,rgba(255,255,255,0) 4px 9px),
      linear-gradient(180deg,#3d4047 0%,#292b30 100%)!important;color:#d3d2ce;}
  .st-occupied{background:linear-gradient(180deg,#33353b 0%,#212328 100%)!important;color:#b9b7b1;
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.09)!important;}
  .st-blocked{background:linear-gradient(180deg,#332f2a 0%,#201d19 100%)!important;color:#c6c1b8;
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.11)!important;}
  .st-blocked::after{content:'';position:absolute;inset:0;pointer-events:none;
    background:linear-gradient(135deg,transparent 47%,rgba(255,255,255,.28) 47%,rgba(255,255,255,.28) 53%,transparent 53%);}
  .flatc:not(.st-unavailable):not(.st-unlisted):not(.st-reserved):not(.st-occupied):not(.st-blocked)::before,
  .c3:not(.st-unavailable):not(.st-unlisted):not(.st-reserved):not(.st-occupied):not(.st-blocked):not(.n3glass)::before{
    content:'';position:absolute;inset:1px;pointer-events:none;border:1px solid rgba(255,255,255,.55);border-radius:2px;}

  .legend{display:flex;flex-wrap:wrap;gap:9px;margin-top:10px;justify-content:center;}
  .li{display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--gold-light);}
  .ls{width:14px;height:14px;border-radius:2px;border:1px solid rgba(255,255,255,.2);flex-shrink:0;}
  .lg-a{background:linear-gradient(180deg,#6d6a63,#403d36);box-shadow:inset 0 0 0 1px rgba(255,255,255,.55);}
  .lg-u{background:repeating-linear-gradient(135deg,rgba(255,255,255,.10) 0 3px,rgba(255,255,255,0) 3px 6px),linear-gradient(180deg,#413e37,#2c2924);}
  .lg-r{background:repeating-linear-gradient(135deg,rgba(255,255,255,.10) 0 3px,rgba(255,255,255,0) 3px 6px),linear-gradient(180deg,#3d4047,#292b30);}
  .lg-o{background:linear-gradient(180deg,#33353b,#212328);}
  .lg-x{background:linear-gradient(180deg,#332f2a,#201d19);}
  .lg-v{background:repeating-linear-gradient(45deg,rgba(255,255,255,.12) 0 3px,rgba(255,255,255,0) 3px 6px);border-style:dashed!important;}

  /* ── Floor plan ── */
  .planwrap{background:linear-gradient(160deg,#0f1a30,#1a2744 60%,#0d1528);border:1px solid var(--gb);border-radius:9px;padding:12px;max-width:1150px;margin:0 auto;overflow-x:auto;}
  .plansvg{width:100%;height:auto;display:block;min-width:560px;}
  .pshell{fill:rgba(255,255,255,.03);stroke:var(--gb);stroke-width:2;}
  .proom rect{fill:rgba(200,169,110,.09);stroke:rgba(200,169,110,.35);stroke-width:1;}
  .pr-hall rect{fill:rgba(255,255,255,.03);stroke-dasharray:4 4;}
  .pr-chapel rect{fill:rgba(200,169,110,.05);stroke-dasharray:5 4;}
  .pchair{fill:#8a6640;stroke:#3a2a1a;stroke-width:.6;}
  .pfurn rect{fill:#6d4f31;stroke:#2a1d11;stroke-width:.8;}
  .pf-altar rect{fill:#b9a06a;} .pf-piano rect{fill:#2a1d13;}
  .pf-urn rect{fill:#191919;} .pf-window rect{fill:#2f8f79;stroke:#8d6a3a;}
  .pf-archwin rect{fill:#bcdcf2;stroke:#6f8fa6;}
  .pfurn text{fill:#f7f4ef;font-size:7px;font-family:'Jost',sans-serif;text-anchor:middle;}
  .pentr rect{fill:rgba(200,169,110,.4);stroke:var(--gold);stroke-width:1.5;}
  .pentr text{fill:var(--cream);font-size:10px;font-family:'Jost',sans-serif;text-anchor:middle;font-weight:600;}
  .pentr{cursor:pointer;} .pentr:hover rect{fill:var(--gold);} .pentr:hover text{fill:#16203a;}
  .pentr:focus{outline:none;} .pentr:focus rect{stroke:#fff;stroke-width:2.5;}
  .proom text{fill:var(--gold-light);font-size:12px;font-family:'Jost',sans-serif;text-anchor:middle;opacity:.85;}
  .pbank rect{fill:#4a463d;stroke:#20304f;stroke-width:1.5;}
  /* Two stones, not one: rose marble through the north-east wing and the Radiance
     alcove, cream travertine at the chapel end (walkthrough video 1:12 onward). */
  .pzone{pointer-events:none;}
  .pz-rose{fill:rgba(150,72,52,.16);stroke:rgba(178,96,72,.35);stroke-width:1;}
  .pbank.mt-rose rect{fill:#5c3b31;stroke:#2b1a15;}
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
  .tbtn{background:rgba(200,169,110,.12);border:1px solid var(--gold-light);color:var(--gold-light);padding:7px 12px;border-radius:5px;font-size:12px;font-weight:500;letter-spacing:.05em;text-transform:uppercase;cursor:pointer;transition:all .15s;}
  .tbtn:hover{background:rgba(200,169,110,.26);color:var(--cream);}
  .tbtn.on{background:rgba(200,169,110,.3);border-color:var(--gold);color:var(--gold);}
  .tbtn:focus-visible{outline:2px solid #fff;outline-offset:2px;}
  .tbsep{width:1px;height:22px;background:var(--gb);margin:0 4px;}
  /* THE SCENE OWNS THE SCREEN. Operator, 2026-08-01: "maybe increasing the size and
     then being able to click and move inside with a larger view as if it were google
     maps may help." The old min(66vh,600px) letterbox inside a 1200px column was a
     postage stamp you had to lean into; a counselor is showing this to a family across
     a desk. It now takes whatever viewport height the chrome above it does not. */
  .scene{position:relative;height:clamp(400px,calc(100vh - 300px),1100px);margin:0 auto;max-width:1500px;
    background:radial-gradient(ellipse at 50% 30%,#2a3550 0%,#161f38 48%,#080d18 100%);
    border:1px solid var(--gb);border-radius:10px;overflow:hidden;cursor:grab;touch-action:none;
    perspective:1900px;perspective-origin:50% 44%;}
  .scene:active{cursor:grabbing;}
  .scene:focus-visible{outline:2px solid var(--gold);outline-offset:2px;}
  .stage{position:absolute;left:50%;top:70%;width:0;height:0;transform-style:preserve-3d;
    transform:translateY(var(--lift,0px)) scale(var(--zoom,1)) rotateX(var(--pitch,0deg)) rotateY(var(--yaw,0deg));
    transition:transform .55s cubic-bezier(.4,0,.2,1);}
  .bldg{position:absolute;transform-style:preserve-3d;
    transform:translate3d(var(--px,0px),0,var(--pz,0px));
    transition:transform .55s cubic-bezier(.4,0,.2,1);}
  .scene.dragging .stage,.scene.dragging .bldg{transition:none;}
  @media (prefers-reduced-motion:reduce){.stage,.bldg{transition:none;}}
  .floor{position:absolute;left:0;top:0;background:
      linear-gradient(135deg,rgba(196,190,178,.22),rgba(120,116,108,.16) 60%,rgba(88,85,79,.2));
    border:1px solid rgba(200,196,186,.22);}
  .face{position:absolute;left:0;top:0;display:grid;gap:1.5px;
    background:linear-gradient(180deg,#a9a396,#8b8478);padding:2px;border:1px solid #6f695e;
    backface-visibility:hidden;box-shadow:0 0 20px rgba(0,0,0,.45);}
  .face.nichewall{background:linear-gradient(180deg,#8d7a52,#6a5a3c);}
  .face.mt-rose{background:linear-gradient(180deg,#8c5342,#5d372c);border-color:#4a2b22;}
  .face.nichewall.mt-rose{background:linear-gradient(180deg,#6b4436,#41281f);}
  /* The marble the recessed niche walls are set into, carried past the glass. */
  .nreveal{position:absolute;left:0;top:0;background:linear-gradient(180deg,#9a6250,#5d372c);
    border:1px solid #4a2b22;backface-visibility:hidden;box-shadow:inset 0 0 24px rgba(0,0,0,.5);}
  .nreveal.mt-cream{background:linear-gradient(180deg,#a9a396,#8b8478);border-color:#6f695e;}
  .fbase{position:absolute;left:0;top:0;background:linear-gradient(180deg,#8a8478,#605b52);
    display:flex;align-items:center;justify-content:center;color:#1d1b17;font-size:7.5px;letter-spacing:.1em;
    font-weight:700;backface-visibility:hidden;overflow:hidden;}
  .mass{position:absolute;left:0;top:0;background:linear-gradient(180deg,rgba(52,66,96,.55),rgba(28,38,60,.6));
    border:1px solid rgba(200,169,110,.3);backface-visibility:hidden;display:flex;align-items:flex-start;justify-content:center;}
  .mass span{font-size:10px;letter-spacing:.1em;color:rgba(240,228,200,.96);text-transform:uppercase;margin-top:4px;}
  .mtop{background:linear-gradient(135deg,rgba(70,86,120,.55),rgba(38,50,76,.6));}
  .mtop span{display:none;}
  .mk-feature{background:linear-gradient(180deg,rgba(200,169,110,.5),rgba(140,116,70,.55));}
  .mk-entrance{background:linear-gradient(180deg,rgba(200,169,110,.35),rgba(120,100,60,.4));}
  .hallpad{position:absolute;left:0;top:0;background:rgba(255,255,255,.05);border:1px dashed rgba(232,213,168,.25);
    display:flex;align-items:center;justify-content:center;}
  .hallpad span{pointer-events:none;font-size:11px;letter-spacing:.16em;color:rgba(232,213,168,.8);text-transform:uppercase;}
  .c3{border:none;border-radius:1px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;
    overflow:hidden;line-height:1.05;padding:0;min-width:0;transition:filter .15s,transform .15s;gap:0;position:relative;
    color:#efece5;
    background:linear-gradient(118deg,rgba(255,255,255,.17) 0%,rgba(255,255,255,0) 34%),linear-gradient(180deg,#6d6a63 0%,#54504a 55%,#3f3c36 100%);
    box-shadow:inset 0 1px 1px rgba(255,255,255,.2),inset 0 -3px 6px -3px rgba(0,0,0,.6);}
  .c3:hover{filter:brightness(1.2) saturate(1.06);transform:scale(1.6);z-index:30;box-shadow:0 4px 18px rgba(0,0,0,.55);}
  .scene.dragging .c3:hover{transform:none!important;filter:none!important;}
  /* LEVEL OF DETAIL. Operator: "its just hard to identify a single crypt for a family
     right now. it's also a little hard to read." The stage's own scale() already grows
     the label geometrically, but 4.6px x a 1.3 interior zoom is still ~6px on glass.
     --lod is set from the camera in apply(): 1 out on the whole-building orbit (where a
     legible label per crypt would be 781 overlapping labels) rising to ~3.2 standing at
     a wall, where the label has to be readable to someone sitting beside you.

     2026-08-01: the machinery now drives the PRICE, not the ref. The ref is off the
     fronts entirely, so the price is the front's single text element and gets the whole
     cell — see .c3p, which keeps the price's old FIXED 7px as its floor and grows from
     there to a per-cell ceiling, instead of sharing the line with a ref at 4.6px.
     .c3id survives for the NICHE glass fronts, which still carry their row-column
     label; it does not appear on a crypt front any more. */
  .c3id{font-size:calc(4.6px * var(--lod,1));opacity:1;letter-spacing:-.02em;white-space:nowrap;
    font-weight:500;text-shadow:0 0 calc(1px * var(--lod,1)) rgba(0,0,0,.85);}
  /* The badge is now the quieter half. With the pattern carrying status (blacked out,
     striped, slashed) an OCC/RES badge only has to confirm what the cell already says,
     so it is smaller than the price and its chip is barely there — 3.4px base against
     4px, and a .12 wash instead of .2. */
  .c3st{font-size:calc(3.4px * var(--lod,1));font-weight:700;letter-spacing:.04em;padding:0 1px;border-radius:1px;
    background:rgba(255,255,255,.12);color:rgba(240,237,230,.82);}
  .c3av{background:rgba(255,255,255,.92);color:#123a24;}
  .n3glass{background:
      linear-gradient(118deg,rgba(255,255,255,.4) 0%,rgba(255,255,255,.05) 40%),
      linear-gradient(180deg,#f0dcb0 0%,#d8bd85 55%,#b99e68 100%);color:#2a2213;}
  .n3glass.st-unavailable{background:
      repeating-linear-gradient(135deg,rgba(0,0,0,.16) 0 4px,rgba(0,0,0,0) 4px 9px),
      linear-gradient(180deg,#8a8272 0%,#6a6355 100%)!important;color:#efece5;}
  .n3p{font-size:6px;font-weight:700;white-space:nowrap;}
  /* ── Walkthrough: structure blocks, chapel furniture, doorways, floor markers ── */
  .blk{position:absolute;left:0;top:0;background:rgba(150,144,132,.16);border:1px solid rgba(200,196,186,.22);}
  .blk.mt-rose{background:rgba(150,72,52,.20);border-color:rgba(198,120,96,.28);}
  .fbase.mt-rose{background:linear-gradient(180deg,#8a5646,#4f2f26);color:#f0ddd4;}
  .furn{position:absolute;left:0;top:0;background:linear-gradient(180deg,#7a5a38,#4d3722);border:1px solid rgba(0,0,0,.35);
    backface-visibility:hidden;display:flex;align-items:center;justify-content:center;}
  .furn.btop{background:linear-gradient(135deg,#8c6a42,#5b4128);}
  .furn span{font-size:6px;letter-spacing:.12em;color:#f7ecdc;text-transform:uppercase;}
  .fk-altar{background:linear-gradient(180deg,#b9a06a,#7d6738);} .fk-altar.btop{background:linear-gradient(135deg,#cdb37a,#8d7643);}
  .fk-piano{background:linear-gradient(180deg,#3a2a1c,#1e150e);} .fk-piano.btop{background:linear-gradient(135deg,#4a3524,#241a11);}
  .fk-bench{background:linear-gradient(180deg,#8d7f5f,#5d523a);} .fk-bench.btop{background:linear-gradient(135deg,#a1946f,#6b5f44);}
  /* Pedestal flower urn and the chapel's stained-glass window — both taken from the
     2026-07-29 walkthrough video; the window is the interior's one orientation landmark. */
  .fk-urn{background:linear-gradient(180deg,#3a3330,#141110);} .fk-urn.btop{background:radial-gradient(circle at 40% 35%,#c46a52,#6d3a2c 60%,#2a1a14);}
  .fk-window{background:linear-gradient(200deg,#59c2a0 0%,#2f86ad 40%,#c9843a 72%,#7c4f2a 100%);
    box-shadow:0 0 10px rgba(120,220,190,.35);border-color:#6d4f2a;}
  .fk-window.btop{background:linear-gradient(135deg,#6d4f2a,#3c2a16);}
  /* The Radiance alcove's two arched clear-glazed windows (video 2:00 and 2:04) --
     daylight is the thing that tells this room apart from every other bay. */
  .fk-archwin{background:linear-gradient(180deg,#dff1ff 0%,#a8d6f2 46%,#7fae7a 74%,#4d7a52 100%);
    border-color:#2a2723;border-radius:50% 50% 3px 3px / 26% 26% 3px 3px;
    box-shadow:0 0 22px rgba(190,225,255,.55);}
  .fk-archwin.btop{background:linear-gradient(135deg,#5d4a3a,#33291f);border-radius:0;}
  .chair{position:absolute;left:0;top:0;backface-visibility:hidden;border:1px solid rgba(0,0,0,.3);}
  .cseat{background:linear-gradient(135deg,#b98f60,#8a6640);}
  .cback{background:linear-gradient(180deg,#a87d52,#6d4f31);}
  .doorway{position:absolute;left:0;top:0;cursor:pointer;backface-visibility:hidden;
    background:linear-gradient(180deg,rgba(232,213,168,.5),rgba(160,132,74,.35));
    border:2px solid var(--gold);display:flex;align-items:flex-end;justify-content:center;padding-bottom:3px;}
  .doorway span{font-size:9px;font-weight:700;letter-spacing:.1em;color:#1b2338;text-transform:uppercase;
    background:var(--gold-light);padding:1px 4px;border-radius:2px;}
  .doorway:hover{filter:brightness(1.25);} .doorway:focus-visible{outline:2px solid #fff;outline-offset:2px;}
  .doormat{position:absolute;left:0;top:0;background:rgba(200,169,110,.3);border:1px dashed var(--gold);}
  .hot{position:absolute;left:0;top:0;width:34px;height:34px;margin:-17px 0 0 -17px;padding:0;border-radius:50%;
    background:rgba(200,169,110,.24);border:1.5px solid var(--gold);cursor:pointer;
    display:flex;align-items:center;justify-content:center;transition:background .15s,transform .15s;}
  .hot span{position:absolute;top:34px;white-space:nowrap;font-size:9px;letter-spacing:.06em;text-transform:uppercase;
    color:var(--cream);background:rgba(10,16,32,.9);padding:2px 5px;border-radius:3px;pointer-events:none;}
  .hot::before{content:'';width:9px;height:9px;border-radius:50%;background:var(--gold);}
  .hot:hover{background:rgba(200,169,110,.55);}
  .hot:focus-visible{outline:2px solid #fff;outline-offset:2px;}
  .hot.here{background:rgba(255,255,255,.4);border-color:#fff;}
  .hot.here::before{background:#fff;}
  /* ── Walk-anywhere reticle. Operator: "being able to click and move inside with a
     larger view as if it were google maps." Street View puts a chevron on the ground
     under the pointer; this is the same idea drawn on the floor plane itself, so it
     sits in the room rather than floating over it. ── */
  .reticle{position:absolute;left:0;top:0;width:40px;height:40px;margin:-20px 0 0 -20px;pointer-events:none;
    border-radius:50%;border:2px solid rgba(255,255,255,.85);background:rgba(200,169,110,.22);
    box-shadow:0 0 14px rgba(255,255,255,.35);opacity:0;transition:opacity .12s;}
  .reticle::after{content:'';position:absolute;left:50%;top:50%;width:9px;height:9px;margin:-4.5px 0 0 -4.5px;
    border-radius:50%;background:#fff;}
  .reticle.on{opacity:.9;}
  .scene.dragging .reticle{opacity:0;}
  .floor,.hallpad,.doormat{cursor:pointer;}

  /* ── The family-facing callout. A counselor is pointing at ONE crypt across a desk;
     the 3-4px cell label is for scanning a wall, not for that moment. This rides above
     the selected cell in screen space, big enough to read from the other side of the
     table, and carries the full MIS ref so what is on screen and what goes on the
     contract are visibly the same string. ── */
  .callout{position:fixed;z-index:880;transform:translate(-50%,-100%);pointer-events:none;display:none;
    background:rgba(12,19,38,.96);border:2px solid var(--gold);border-radius:9px;padding:7px 12px 8px;
    box-shadow:0 8px 30px rgba(0,0,0,.7);text-align:center;white-space:nowrap;transition:opacity .12s;}
  .callout.show{display:block;}
  .callout::after{content:'';position:absolute;left:50%;bottom:-9px;margin-left:-8px;width:0;height:0;
    border:8px solid transparent;border-top-color:var(--gold);border-bottom:0;}
  .cotag{display:block;font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:700;
    color:var(--gold);line-height:1.05;}
  .coprice{display:inline-block;margin-top:3px;font-size:15px;font-weight:700;padding:1px 7px;border-radius:4px;
    background:rgba(255,255,255,.93);color:#123a24;}
  .cowhere{display:block;margin-top:3px;font-size:11px;letter-spacing:.09em;color:var(--gold-light);opacity:.9;}
  @media (max-width:640px){.cotag{font-size:21px;}.coprice{font-size:13px;}.cowhere{font-size:10px;}}

  .ghost{opacity:.16!important;pointer-events:none!important;}
  .behind{display:none!important;}
  .scene.inside .floor{filter:brightness(1.15);}

  /* ── Breadcrumb / area switcher ── */
  .crumbs{display:flex;flex-wrap:wrap;align-items:center;gap:6px;max-width:1200px;margin:0 auto 6px;padding:7px 11px;
    background:rgba(200,169,110,.09);border:1px solid var(--gb);border-radius:6px;}
  .crumb{background:none;border:none;color:var(--gold-light);font-size:12px;font-weight:600;letter-spacing:.05em;
    cursor:pointer;padding:2px 5px;border-radius:3px;text-transform:uppercase;}
  .crumb:hover:not(.cur):not([disabled]){background:rgba(200,169,110,.22);color:var(--cream);}
  .crumb.cur{color:var(--gold);cursor:default;}
  .crumb[disabled]{opacity:.35;cursor:default;}
  .csep{color:var(--gold);opacity:.6;font-size:12px;}
  .cnote2{font-size:11px;color:var(--gold-light);opacity:.85;font-style:italic;margin-left:4px;}
  .cback2{margin-left:auto;border:1px solid var(--gb);}

  .hint{text-align:center;font-size:12px;color:var(--gold-light);opacity:.88;margin-top:7px;letter-spacing:.05em;}
  .modelnote{text-align:center;font-size:10.5px;color:var(--gold-light);opacity:.7;margin-top:3px;max-width:1100px;margin-left:auto;margin-right:auto;}

  /* ── Detail card ── */
  .card{position:fixed;right:16px;bottom:16px;width:286px;background:rgba(16,24,44,.97);border:1px solid var(--gold);
    border-radius:9px;padding:13px 15px;z-index:900;box-shadow:0 10px 40px rgba(0,0,0,.65);font-size:12.5px;display:none;pointer-events:none;}
  .card.show{display:block;}
  .card.pinned{pointer-events:auto;}
  .cardhd{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:2px;}
  .cardid{font-family:'Cormorant Garamond',serif;font-size:19px;font-weight:700;color:var(--gold);}
  .cardwall{font-size:10.5px;color:var(--gold-light);letter-spacing:.08em;text-transform:uppercase;}
  .cardmis{font-size:11px;color:var(--gold-light);opacity:.9;letter-spacing:.04em;margin-bottom:7px;}
  .cardst{font-size:11.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#ffd9a0;margin-bottom:6px;}
  .cr{display:flex;justify-content:space-between;gap:10px;padding:2px 0;border-bottom:1px solid rgba(200,169,110,.1);}
  .cr:last-of-type{border:none;}
  .cl{color:var(--gold-light);}.cv{font-weight:600;color:var(--cream);text-align:right;}
  .ctot{margin-top:6px;padding-top:6px;border-top:1px solid var(--gold);display:flex;justify-content:space-between;}
  .ctl{color:var(--gold);font-weight:600;}.ctv{color:var(--gold);font-weight:700;font-size:13px;}
  .cnote{margin-top:5px;font-size:10.5px;color:var(--gold-light);opacity:.92;font-style:italic;line-height:1.5;}
  .cclose{background:none;border:none;color:var(--gold-light);font-size:17px;line-height:1;cursor:pointer;padding:0 2px;}
  .cclose:hover{color:var(--cream);}
  /* On a phone the card is a BOTTOM SHEET, not a takeover. Full-height it covered the
     model completely, so a search jump flew the camera to a crypt and then hid it —
     and hid the callout with it. Cap it and let it scroll; the model stays visible. */
  @media (max-width:700px){
    .card{right:6px;left:6px;bottom:6px;width:auto;max-height:44vh;overflow-y:auto;
      -webkit-overflow-scrolling:touch;padding:11px 13px;}
    .cardid{font-size:17px;}
  }

  .fees{margin-top:14px;background:rgba(200,169,110,.07);border:1px solid var(--gb);border-radius:6px;padding:11px 13px;display:flex;flex-wrap:wrap;gap:12px;max-width:1000px;margin-left:auto;margin-right:auto;justify-content:center;}
  .fi{font-size:12.5px;}.fl{color:var(--gold);font-weight:600;display:block;margin-bottom:1px;}.fv{color:var(--cream);}
  .fchk{display:inline-flex;align-items:center;gap:5px;cursor:pointer;user-select:none;}
  .fees input[type=checkbox]{width:15px;height:15px;accent-color:var(--gold);cursor:pointer;padding:0;}
  .fees input[type=number]{width:42px;}
  .fees input{width:42px;background:rgba(200,169,110,.12);border:1px solid var(--gold);border-radius:3px;color:var(--cream);padding:2px 4px;font-family:'Jost',sans-serif;font-size:12px;text-align:center;}
  .sizeleg{max-width:760px;margin:8px auto 0;font-size:11.5px;color:var(--gold-light);text-align:center;line-height:1.7;}
  .sizeleg>b{display:block;color:var(--gold);letter-spacing:.08em;text-transform:uppercase;font-size:10.5px;margin-bottom:3px;}
  .szi{display:inline-flex;align-items:center;gap:5px;margin:0 8px;}
  .szi b{color:var(--gold);font-weight:600;}
  .szi em{font-style:normal;opacity:.72;}
  /* The swatch is the SAME width ratio the wall draws, so the key and the wall agree:
     a Family swatch really is wider than a Small one. Height is fixed — on both walls
     every class is the same height, which is itself worth showing. */
  .szs{display:inline-block;height:11px;border-radius:2px;border:1px solid rgba(0,0,0,.5);
    background:linear-gradient(118deg,rgba(255,255,255,.4) 0%,rgba(255,255,255,.05) 40%),
      linear-gradient(180deg,#f0dcb0 0%,#d8bd85 55%,#b99e68 100%);flex-shrink:0;}
  .szs.sz-small{width:11px;} .szs.sz-large{width:15px;}
  .szs.sz-xlarge{width:17px;} .szs.sz-family{width:20px;}
  .szn{display:block;opacity:.8;font-size:10.5px;margin-top:4px;font-style:normal;}

  /* ── Section isolation ──
     Operator, 2026-08-02: "When clicking on a section on the floor plan just show that
     section, not the whole north wing." A plan click opens the section's AREA and then
     hides every block in it but the one clicked; the bar is the way back. */
  /* The bar is ALWAYS on an area view: "back to the floor plan" is the way out
     whether or not a single section is isolated, and hiding it once you widened back
     to the whole wing left you standing in a room with the door painted over. Only
     the isolation-specific half of it comes and goes. */
  .isobar{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;
    max-width:900px;margin:0 auto 4px;padding:7px 12px;border:1px solid var(--gb);border-radius:7px;
    background:rgba(200,169,110,.09);}
  .isobar .isotxt,.isobar .isoall{display:none;}
  .wview.isolated .isobar .isotxt{display:inline;}
  .wview.isolated .isobar .isoall{display:inline-block;}
  .isotxt{font-size:12px;color:var(--cream);letter-spacing:.05em;}
  .isob{background:rgba(200,169,110,.16);border:1px solid var(--gold-light);color:var(--gold-light);
    padding:5px 11px;border-radius:5px;font-size:11.5px;font-weight:500;letter-spacing:.05em;cursor:pointer;transition:all .15s;}
  .isob:hover{background:rgba(200,169,110,.32);color:var(--cream);}
  .isob:focus-visible{outline:2px solid #fff;outline-offset:2px;}
  .wview.isolated .bwrap{display:none;}
  .wview.isolated .bwrap.iso{display:block;}
  .warn{max-width:1000px;margin:12px auto 0;background:rgba(200,120,60,.14);border:1px solid rgba(232,170,110,.55);
    border-radius:7px;padding:10px 14px;font-size:11px;color:#ffe2be;line-height:1.6;}
  .warn b{color:#ffd08a;}
  .printcard{display:none;}
  .pfoot{max-width:1000px;margin:12px auto 0;text-align:center;font-size:11.5px;color:var(--gold-light);line-height:1.7;}
  .pfoot b{color:var(--gold);font-weight:600;}
  .back-btn{margin-left:auto;flex-shrink:0;background:none;border:1px solid var(--gb);color:var(--gold-light);padding:9px 14px;border-radius:6px;font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap;text-decoration:none;}
  .back-btn:hover{background:rgba(200,169,110,.15);color:var(--cream);}
  .walk-btn{margin-left:auto;flex-shrink:0;background:rgba(200,169,110,.15);border:1px solid var(--gold);color:var(--gold);padding:9px 14px;border-radius:6px;font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap;text-decoration:none;}
  .walk-btn:hover{background:rgba(200,169,110,.28);color:var(--cream);}
  .walk-btn ~ .back-btn{margin-left:0;}
  .srch ~ .walk-btn{margin-left:0;}
  .print-btn{flex-shrink:0;background:rgba(200,169,110,.15);border:1px solid var(--gold);color:var(--gold);padding:9px 16px;border-radius:6px;font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;cursor:pointer;white-space:nowrap;}
  .print-btn:hover{background:rgba(200,169,110,.28);}

  @media (max-width:640px){
    /* Phone chrome budget. Before this the header alone was ~200px of an 844px screen —
       logo row, title, TWO wrapped button rows and the jump box — and with the tabs and
       toolbar under it the model started below 410px, i.e. mostly off-screen. The
       subtitle is redundant with the title, the logo can be smaller, and the three
       actions fit one row at 10px. */
    .header{flex-wrap:wrap;padding:6px 10px;gap:5px;}
    .hlogo-svg{height:20px;}
    .htxt{flex:1 1 auto;min-width:0;} .htxt h1{font-size:12.5px;line-height:1.2;} .htxt p{display:none;}
    .print-btn,.back-btn,.walk-btn{margin-left:0;padding:4px 7px;font-size:9.5px;flex:0 0 auto;}
    .main{padding:8px;} .tab{padding:9px 10px;font-size:10px;}
    /* The jump box gets its own full-width row on a phone — it is the control the
       operator reaches for first, and 180px squeezed beside three buttons is not it. */
    .srch{order:9;flex:1 1 100%;max-width:none;margin-left:0;}
    .srch input{font-size:16px;padding:9px 30px 9px 11px;}  /* 16px: iOS zooms below it */
    .qopt{padding:10px 9px;font-size:12.5px;}
    .qoid{font-size:15px;min-width:66px;}
    /* One scrolling row, not four stacked ones: the toolbar was pushing the model
       below the fold on a 390px phone. */
    .toolbar{gap:5px;margin:7px 0 6px;flex-wrap:nowrap;overflow-x:auto;justify-content:flex-start;
      padding:0 8px 2px;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
    .toolbar::-webkit-scrollbar{display:none;}
    .tbtn{padding:7px 10px;font-size:11px;flex-shrink:0;white-space:nowrap;} .tbsep{display:none;}
    .crumbs{padding:6px 9px;gap:5px;}
    .header{padding:8px 11px;gap:7px;}
    .htxt h1{font-size:13px;line-height:1.25;} .htxt p{font-size:9.5px;}
    /* On a phone the chrome is taller (the header wraps and the jump box takes a row),
       but the scene still gets everything left over rather than half of it. */
    /* The breadcrumb's trailing hint wraps to two extra lines at 390px; the same
       guidance lives under the scene in .hint, so drop it here and give the model the
       pixels instead. */
    .cnote2{display:none;}
    .scene{height:clamp(320px,calc(100vh - 340px),820px);border-radius:8px;}
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
    /* An isolated section prints as that section, matching what is on screen. */
    .wview.isolated .bwrap{display:none!important;}
    .wview.isolated .bwrap.iso{display:block!important;}
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
  BANKS.map((b) => [b.id, b.area]).concat([['RAD', WALLS.RAD.area], ['SER', WALLS.SER.area]])));
const BANK_LABEL = JSON.stringify(Object.fromEntries(
  BANKS.map((b) => [b.id, bankLabel(b)]).concat([['RAD', 'Radiance Niche Wall'], ['SER', 'Serenity Niche Wall']])));
const AREA_LABEL = JSON.stringify(Object.fromEntries(AREAS.map((a) => [a.id, a.label])));
const AREA_STOP = JSON.stringify(Object.fromEntries(AREAS.map((a) => [a.id, a.stop])));
// The whole-building orbit. Everything else is a WALKTHROUGH STOP, below.
const HOME_JSON = JSON.stringify({ yaw: -30, pitch: -52 });
const STOPS_JSON = JSON.stringify(Object.fromEntries(STOPS.map((s) => [s.id, s])));
const STOP_ORDER = JSON.stringify(STOPS.map((s) => s.id));
const SEARCH_JSON = JSON.stringify(searchIndex());
const FACES_JSON = JSON.stringify(faceTable());
const SOLIDS_JSON = JSON.stringify(solidRects());

/**
 * The jump box's runtime. Deliberately a normalised-substring + ref-shape matcher and
 * NOT a fuzzy engine: the corpus is 903 short, highly structured strings, every one of
 * which the operator can already half-remember ("D-116", "the 116 one"), so exactness
 * is worth more than typo tolerance — a fuzzy hit that flies the camera to the wrong
 * crypt is worse than no hit. uFuzzy was scouted and declined on that basis; if typo
 * tolerance is ever wanted, vendor it rather than growing this.
 */
const SEARCH_RUNTIME = `
// ── FIND A CRYPT OR NICHE ─────────────────────────────────────────────────────
var IDX = ${SEARCH_JSON};
var BY_REF = {};
for (var qi = 0; qi < IDX.length; qi++) BY_REF[IDX[qi].r] = IDX[qi];

var qEl = document.getElementById('q'), qList = document.getElementById('qlist');
var qSr = document.getElementById('qsr'), qWrap = document.getElementById('srch');
var qHits = [], qActive = -1;

var nrm = function (s) { return String(s).toUpperCase().replace(/[^A-Z0-9]/g, ''); };

/**
 * Match keys are DERIVED from the index row every time, never stored beside it — the
 * four spellings of one crypt are four views of one row, not four rows to keep in step.
 *   COM11D116   the full ref, punctuation-blind
 *   D116        tier + space
 *   116D        space + tier, so "116 D" works
 *   SERK1       wall/bank qualified, which is the only way to tell Radiance K-1 from
 *               Serenity K-1 — the two walls share every row and column label.
 */
function keysOf(e) {
  if (e.__k) return e.__k;
  var k = [nrm(e.r)], i;
  for (i = 0; i < e.c.length; i++) {
    k.push(e.t + e.c[i]);
    k.push(e.c[i] + e.t);
    k.push(nrm(e.b) + e.t + e.c[i]);
  }
  e.__k = k;
  return k;
}
function score(e, q, raw) {
  var k = keysOf(e), best = 0, i;
  for (i = 0; i < k.length; i++) {
    if (k[i] === q) return 100;
    if (k[i].indexOf(q) === 0) best = 70;
  }
  if (best) return best;
  if (nrm(e.r).indexOf(q) >= 0) return 40;
  if (e.n.toUpperCase().indexOf(raw) >= 0) return 20;
  return 0;
}

// The result chip is deliberately NEUTRAL, not band-coloured. On this page hue means
// money in ONE scale, the six crypt bands, and the niche walls are priced far below
// band 1 — colouring a $4,395 niche as "band 1" would be inventing a meaning. The
// dropdown is a picker; the map is where the bands live.
function optHtml(e, i) {
  var lab = e.t + '-' + e.c.join('/');
  var money = e.p > 0 ? '<span class="qop">' + fm(e.p) + '</span>' : '';
  var st = e.s === 'available' ? '' : '<span class="qost">' + (STATUS_LABEL[e.s] || e.s) + '</span>';
  return '<li class="qopt" role="option" id="qo-' + i + '" data-i="' + i + '"'
    + ' aria-selected="' + (i === qActive ? 'true' : 'false') + '">'
    + '<span class="qoid">' + lab + '</span>'
    + '<span class="qowhere">' + e.n + '</span>' + money + st + '</li>';
}
function closeList() {
  qList.hidden = true; qList.innerHTML = ''; qActive = -1;
  qEl.setAttribute('aria-expanded', 'false');
  qEl.removeAttribute('aria-activedescendant');
}
function paintActive() {
  var opts = qList.querySelectorAll('.qopt');
  for (var i = 0; i < opts.length; i++) {
    var on = +opts[i].getAttribute('data-i') === qActive;
    opts[i].classList.toggle('on', on);
    opts[i].setAttribute('aria-selected', on ? 'true' : 'false');
    if (on) {
      qEl.setAttribute('aria-activedescendant', opts[i].id);
      if (opts[i].scrollIntoView) opts[i].scrollIntoView({ block: 'nearest' });
    }
  }
}
function runQuery() {
  var raw = qEl.value.trim();
  qWrap.classList.toggle('has-q', !!raw);
  var q = nrm(raw);
  qActive = -1;
  if (!q) { closeList(); qSr.textContent = ''; return; }
  var up = raw.toUpperCase(), hits = [], i, s;
  for (i = 0; i < IDX.length; i++) {
    s = score(IDX[i], q, up);
    if (s) hits.push([s, IDX[i]]);
  }
  hits.sort(function (a, b) {
    if (b[0] !== a[0]) return b[0] - a[0];
    var av = (b[1].s === 'available' ? 1 : 0) - (a[1].s === 'available' ? 1 : 0);
    if (av) return av;
    return a[1].r < b[1].r ? -1 : 1;
  });
  qHits = [];
  for (i = 0; i < hits.length && i < 10; i++) qHits.push(hits[i][1]);
  if (!qHits.length) {
    qList.innerHTML = '<li class="qmsg" role="presentation">Nothing matches \\u201c' + qEl.value.replace(/</g, '&lt;')
      + '\\u201d.<br>Try a tier and space \\u2014 <b>D-116</b>, <b>116 D</b> or the full <b>COM-1-1-D-116</b>'
      + ' \\u2014 or a niche such as <b>RAD K-1</b>.</li>';
    qSr.textContent = 'No matches';
  } else {
    var h = '';
    for (i = 0; i < qHits.length; i++) h += optHtml(qHits[i], i);
    if (hits.length > qHits.length) {
      h += '<li class="qmsg" role="presentation">' + (hits.length - qHits.length) + ' more \\u2014 keep typing to narrow it.</li>';
    }
    qList.innerHTML = h;
    qSr.textContent = qHits.length + (qHits.length === 1 ? ' match' : ' matches');
  }
  qList.hidden = false;
  qEl.setAttribute('aria-expanded', 'true');
}

/**
 * Land on a unit: swing the camera face-on with the unit centred, then select it with
 * exactly the state a tap produces — pinned card, the highlight on EVERY rendering of
 * that ref (3D face and flat grid alike), and the print scope narrowed to its area.
 * There is no second selection path; this calls the same showCard the family contract
 * is written against.
 */
function jumpTo(e) {
  if (!e) return;
  showView('3d');
  goFace(e.b, e.r);
  var el = document.querySelector('.c3[data-ref="' + e.r + '"]');
  if (!el) return;
  showCard(el, true);
  // The camera eases over ~0.55s; re-place the card once it has arrived so it is not
  // pinned to where the crypt used to be.
  setTimeout(function () { if (pinned === el) placeCard(el); }, 600);
}
var qPickedAt = 0;
function pick(i) {
  var e = qHits[i];
  if (!e) return;
  // A tap on a result fires pointerdown (which picks) and THEN a click, whose target is
  // whatever is under the finger once the list has gone — usually the page background.
  // The document handler would read that as "clicked outside the card" and tear down the
  // selection the pick had just made. Found by driving a niche jump by tap, 2026-08-01.
  qPickedAt = performance.now();
  qEl.value = e.r;
  qWrap.classList.add('has-q');
  closeList();
  qSr.textContent = 'Showing ' + e.t + '-' + e.c.join('/') + ', ' + e.n;
  jumpTo(e);
}
function moveActive(d) {
  if (qList.hidden) { runQuery(); return; }
  if (!qHits.length) return;
  qActive = (qActive + d + qHits.length + 1) % (qHits.length + 1);
  if (qActive === qHits.length) qActive = d > 0 ? 0 : qHits.length - 1;
  paintActive();
}
if (qEl) {
  qEl.addEventListener('input', runQuery);
  qEl.addEventListener('focus', function () { if (qEl.value.trim()) runQuery(); });
  qEl.addEventListener('keydown', function (ev) {
    if (ev.key === 'ArrowDown') { ev.preventDefault(); moveActive(1); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); moveActive(-1); }
    else if (ev.key === 'Enter') { ev.preventDefault(); pick(qActive < 0 ? 0 : qActive); }
    else if (ev.key === 'Escape') {
      ev.stopPropagation();          // Escape closes the list, not the pinned card
      if (!qList.hidden) closeList();
      else { qEl.value = ''; runQuery(); }
    }
  });
  // pointerdown, not click: a blur would tear the list down before the click landed,
  // which is exactly how a tap on a phone misses.
  qList.addEventListener('pointerdown', function (ev) {
    var li = ev.target.closest('.qopt');
    if (!li) return;
    ev.preventDefault();
    pick(+li.getAttribute('data-i'));
  });
  document.getElementById('qclear').addEventListener('click', function () {
    qEl.value = ''; runQuery(); qEl.focus();
  });
  document.addEventListener('pointerdown', function (ev) {
    if (!ev.target.closest('#srch')) closeList();
  });
  // Swallow the click that trails a tap on a result. The list is already gone by then,
  // so that click lands on whatever the dropdown was covering — and on a phone, where
  // the header wraps and the list overlays the tab bar, that is a TAB: picking a niche
  // by tap flew the camera and then immediately switched the page to a printable list.
  // Found at the 390x844 viewport, 2026-08-01; invisible at desktop width.
  document.addEventListener('click', function (ev) {
    if (performance.now() - qPickedAt > 600) return;
    if (ev.target.closest('#srch')) return;
    ev.stopPropagation(); ev.preventDefault();
  }, true);
}
`;

const JS = `
'use strict';
var REC = ${CRYPT_FEES.RECORDING}, OC = ${CRYPT_FEES.OC}, MB = ${CRYPT_FEES.MONOBAR}, MBI = ${CRYPT_FEES.MONOBAR_INSTALL}, VASE = ${CRYPT_FEES.VASE};
var N_OC = ${NICHE_FEES.OC}, N_REC = ${NICHE_FEES.RECORDING};
var ECF_RATE = ${CRYPT_FEES.ECF_RATE};
var TYPE_LABEL = ${JSON.stringify(TYPE_LABEL)};
var TYPE_CAP = ${JSON.stringify(TYPE_CAP)};
var STATUS_LABEL = ${JSON.stringify(STATUS_LABEL)};
var BANK_AREA = ${BANK_AREA};
var BANK_LABEL = ${BANK_LABEL};
var AREA_LABEL = ${AREA_LABEL};
var WALL_NAME = { RAD: 'Radiance', SER: 'Serenity' };
// Cents appear only where MIS itself has them: a 10% E.C.F. on a price ending in 5 is
// an exact .50, and the export's own ecf column carries it. Whole amounts stay whole.
var fm = function (n) { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); };
var ecf = function (p) { return Math.ceil(p * ECF_RATE); };
var qty = function (id) { var e = document.getElementById(id); return e ? (parseInt(e.value, 10) || 0) : 0; };
// Operator, 2026-08-01: "the recording fee and entombment opening and closing need a
// toggle someone can purchase a crypt without those things if they would like."
// DEFAULT OFF, both — operator's ruling, same day, reversing the first call: "they
// should start unchecked." So a crypt card opens at PROPERTY ONLY: price + E.C.F.,
// and the counselor adds the recording fee and the entombment O&C when the family is
// buying them. A missing element reads as OFF for the same reason.
var feeOn = function (id) { var e = document.getElementById(id); return !!(e && e.checked); };

var card = document.getElementById('card');
var pinned = null;

function head(id, sub, mis) {
  return '<div class="cardhd"><span class="cardid">' + id + '</span><span class="cardwall">' + sub + '</span>' +
    '<button class="cclose" type="button" aria-label="Close">\\u00d7</button></div>' +
    '<div class="cardmis">' + mis + '</div>';
}

var SNAP_PRINTED = '${MIS.printed}';
var ST_NOTE = {
  occupied: 'Occupied \\u2014 an interment is recorded at this crypt in the cemetery inventory records printed ' + SNAP_PRINTED + '. Not sellable. No pricing shown.',
  reserved: 'Reserved \\u2014 held for an owner in the cemetery inventory records as of ' + SNAP_PRINTED + ', with no interment recorded. Not sellable. No pricing shown.',
  blocked: 'Not for sale \\u2014 this crypt is withheld from sale. No pricing shown.',
  unlisted: 'Unavailable \\u2014 ask us for current availability. The crypt sheet marked it NOT SELLING and the cemetery inventory records do not carry it at all, so there is no positive statement that it is for sale. No pricing shown.',
  unpriced: 'Not offered \\u2014 The cemetery inventory records list this crypt as AVAILABLE on ' + SNAP_PRINTED + ' but carries NO PRICE for it (the price and E.C.F. fields are both zero). A crypt is only on the market here when a price greater than zero is attached to it, so nothing is quoted and no total is shown. Ask us for the current price before offering it.'
};

function cryptCard(d) {
  var spaces = d.cols.split('/');
  var mis = d.ref + (spaces.length > 1 ? ' &amp; ' + d.ref.replace(/\\d+$/, spaces[1]) : '');
  var h = head(d.id, BANK_LABEL[d.bank] || d.bank, 'COM \\u00b7 ' + mis);
  h += '<div class="cardst">' + (STATUS_LABEL[d.st] || d.st) + '</div>';
  h += '<div class="cr"><span class="cl">Type</span><span class="cv">' + (TYPE_LABEL[d.type] || d.type) + '</span></div>';
  h += '<div class="cr"><span class="cl">Capacity</span><span class="cv">' + (TYPE_CAP[d.type] || '') + '</span></div>';
  if (d.st !== 'available') {
    h += '<div class="cnote">' + (ST_NOTE[d.st] || ST_NOTE.unlisted) + '</div>';
    return h;
  }
  // AVAILABLE. Card math, per the two operator rulings of 2026-08-01: crypt price, its
  // exact 10% E.C.F., and then the fees THE QUOTE TOOL carries \u2014 recording $235,
  // mausoleum entombment O&C $1,205, and the monobar if the counselor adds one.
  // "opening and clsoing and recording fee prices need to be taken from the quote tool
  //  as well." The crypt sheet's own $225 recording row is superseded, and the earlier
  // reading that a crypt carries no O&C is withdrawn: it carries the tool's $1,205.
  // Two available crypts have no price in MIS and say so.
  var recOn = feeOn('rec-on'), ocOn = feeOn('oc-on');
  var price = d.price ? +d.price : null;
  if (price === null) {
    h += '<div class="cr"><span class="cl">Crypt price</span><span class="cv">Ask us</span></div>';
    h += '<div class="cr"><span class="cl">E.C.F.</span><span class="cv">10% of price</span></div>';
    if (recOn) h += '<div class="cr"><span class="cl">Recording Fee</span><span class="cv">' + fm(REC) + '</span></div>';
    if (ocOn) h += '<div class="cr"><span class="cl">Entombment O&amp;C</span><span class="cv">' + fm(OC) + '</span></div>';
    h += '<div class="cnote">The cemetery inventory records list this crypt as AVAILABLE on ' + SNAP_PRINTED + ' but carries no usable price for it \\u2014 ask us for the current price before quoting. No total is shown here rather than a guessed one.</div>';
    return h;
  }
  // The E.C.F. is 10% of the CRYPT PRICE and nothing else, so a fee toggle cannot move it.
  var e = Math.round(price * 10) / 100, tot = price + e + (recOn ? REC : 0) + (ocOn ? OC : 0);
  h += '<div class="cr"><span class="cl">Crypt price</span><span class="cv">' + fm(price) + '</span></div>';
  h += '<div class="cr"><span class="cl">E.C.F. (10%)</span><span class="cv">' + fm(e) + '</span></div>';
  if (recOn) h += '<div class="cr"><span class="cl">Recording Fee</span><span class="cv">' + fm(REC) + '</span></div>';
  if (ocOn) h += '<div class="cr"><span class="cl">Entombment O&amp;C</span><span class="cv">' + fm(OC) + '</span></div>';
  var mq = qty('mb-qty'), vq = qty('vase-qty');
  if (mq > 0) {
    h += '<div class="cr"><span class="cl">Monobar Memorial \\u00d7' + mq + '</span><span class="cv">' + fm(MB * mq) + '</span></div>';
    h += '<div class="cr"><span class="cl">Monobar Install \\u00d7' + mq + '</span><span class="cv">' + fm(MBI * mq) + '</span></div>';
    tot += (MB + MBI) * mq;
  }
  if (vq > 0) {
    h += '<div class="cr"><span class="cl">Vase \\u00d7' + vq + '</span><span class="cv">' + fm(VASE * vq) + '</span></div>';
    tot += VASE * vq;
  }
  h += '<div class="ctot"><span class="ctl">Est. Total</span><span class="ctv">' + fm(tot) + '</span></div>';
  if (!recOn || !ocOn) {
    h += '<div class="cnote"><b>Property only.</b> This total EXCLUDES ' +
      (!recOn && !ocOn ? 'the recording fee and the entombment opening &amp; closing'
        : (!recOn ? 'the recording fee' : 'the entombment opening &amp; closing')) +
      ' \\u2014 switch ' + (!recOn && !ocOn ? 'them' : 'it') + ' on in the fee box below to add '
      + (!recOn && !ocOn ? fm(REC + OC) : fm(!recOn ? REC : OC)) + '.</div>';
  }
  h += '<div class="cnote">The cemetery inventory records listed this crypt as AVAILABLE and priced it on ' + SNAP_PRINTED + '. One unit, one price \\u2014 a tandem or companion crypt is never split. The E.C.F. is not included in the listed price. Recording, opening &amp; closing and the monobar are the QUOTE TOOL\\u2019s figures (operator, ' + SNAP_PRINTED + '), not the crypt sheet\\u2019s. Always confirm current status and price with us before writing.</div>';
  return h;
}

// The size class and its printed dimensions, on every niche card. Before 2026-08-02
// only the two Family cells carried a size at all; now every front is measured, so the
// card is where "which of the four is this one?" gets answered.
function sizeRows(d) {
  var h = '';
  if (d.size) h += '<div class="cr"><span class="cl">Size</span><span class="cv">' + d.size + '</span></div>';
  if (d.dims) h += '<div class="cr"><span class="cl">Dimensions</span><span class="cv">' + d.dims + '</span></div>';
  return h;
}
function nicheCard(d) {
  var h = head(d.id, WALL_NAME[d.wall] + ' Niche Wall', d.ref);
  if (d.st !== 'available') {
    h += '<div class="cardst">' + (STATUS_LABEL[d.st] || d.st) + '</div>';
    h += sizeRows(d);
    h += '<div class="cnote">Not available on the wall sheet \\u2014 ask us for today\\u2019s availability. No pricing shown.</div>';
    return h;
  }
  var price = +d.price, e = ecf(price), tot = price + e;
  h += '<div class="cr"><span class="cl">Niche Price</span><span class="cv">' + fm(price) + '</span></div>';
  h += '<div class="cr"><span class="cl">ECF (10%)</span><span class="cv">' + fm(e) + '</span></div>';
  var oc = qty('noc-qty'), rc = qty('nrec-qty');
  if (oc > 0) { h += '<div class="cr"><span class="cl">O&amp;C \\u00d7' + oc + '</span><span class="cv">' + fm(N_OC * oc) + '</span></div>'; tot += N_OC * oc; }
  if (rc > 0) { h += '<div class="cr"><span class="cl">Recording \\u00d7' + rc + '</span><span class="cv">' + fm(N_REC * rc) + '</span></div>'; tot += N_REC * rc; }
  h += sizeRows(d);
  h += '<div class="ctot"><span class="ctl">Est. Total</span><span class="ctv">' + fm(Math.round(tot)) + '</span></div>';
  h += '<div class="cnote">Two inurnments per niche. ECF is not included in the listed price. ${esc(NICHE_PRICES_EFFECTIVE)}.</div>';
  return h;
}

function readEl(el) {
  var d = {};
  ['kind', 'bank', 'wall', 'id', 'ref', 'tier', 'cols', 'type', 'st', 'row', 'col', 'price', 'size', 'dims'].forEach(function (k) {
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
// A crypt is rendered twice. After a tab switch the pinned crypt's OWN element may be
// inside a display:none view, where getBoundingClientRect() is all zeros — and a card
// placed against a zero rect lands at the top-left corner, on top of the tab bar, where
// (being pinned, and therefore pointer-events:auto) it swallowed the clicks meant for
// the tabs. Found 2026-07-31 by driving the GOMN page; the same code lived here. So:
// always place against whichever rendering of this ref is actually laid out (skipping
// the non-interactive minis), and if none is, park the card in its default bottom-right
// corner rather than over the chrome.
function visibleTwin(el) {
  var ref = el.getAttribute('data-ref');
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
/**
 * THE FAMILY-FACING CALLOUT. Operator, 2026-08-01: "its just hard to identify a single
 * crypt for a family right now." The cell label is sized for scanning a wall; this is
 * sized for the moment a counselor says "that one" to someone sitting across a desk.
 * It tracks the selected cell in screen space — the cell is a 3D-transformed element,
 * so there is no static position to anchor to — and carries the full MIS ref so the
 * screen and the contract visibly say the same string.
 */
var callout = document.getElementById('callout'), calloutEl = null, coRaf = 0;
function tickCallout() {
  coRaf = 0;
  if (!calloutEl) { callout.classList.remove('show'); return; }
  var v3 = document.getElementById('view-3d');
  if (!v3 || !v3.classList.contains('active')) { callout.classList.remove('show'); calloutEl = null; return; }
  var r = calloutEl.getBoundingClientRect(), sr = scene.getBoundingClientRect();
  var mx = r.left + r.width / 2, my = r.top;
  var off = r.width < 0.5 || mx < sr.left - 30 || mx > sr.right + 30 || my < sr.top - 30 || my > sr.bottom + 30;
  callout.style.opacity = off ? '0' : '1';
  if (!off) {
    callout.style.left = clamp(mx, sr.left + 70, sr.right - 70) + 'px';
    callout.style.top = Math.max(sr.top + 12, my - 8) + 'px';
  }
  coRaf = requestAnimationFrame(tickCallout);
}
function setCallout(d) {
  var el = d ? document.querySelector('.c3[data-ref="' + d.ref + '"]') : null;
  calloutEl = el;
  if (coRaf) { cancelAnimationFrame(coRaf); coRaf = 0; }
  if (!el) { callout.classList.remove('show'); return; }
  var money = (d.st === 'available' && d.price) ? '<span class="coprice">' + fm(+d.price) + '</span>' : '';
  callout.innerHTML = '<span class="cotag">' + (d.kind === 'niche' ? WALL_NAME[d.wall] + ' ' + d.id : d.id) + '</span>'
    + money + '<span class="cowhere">' + d.ref + '</span>';
  callout.classList.add('show');
  tickCallout();
}

function showCard(el, pin) {
  var d = readEl(el);
  card.innerHTML = cardHtml(d);
  card.classList.add('show');
  placeCard(el);
  if (pin) { pinned = el; markSel(el); setCallout(d); }
  card.classList.toggle('pinned', pinned === el);
  if (pinned === el) setPrintCard(d);
}
function hideCard() {
  card.classList.remove('show'); card.classList.remove('pinned');
  pinned = null; clearSel(); setCallout(null);
  document.getElementById('printcard').innerHTML = '';
  document.body.classList.remove('has-printsel');
  document.body.classList.remove('pv-sel');
  var old = document.querySelectorAll('.wview.printsel');
  for (var i = 0; i < old.length; i++) old[i].classList.remove('printsel');
}

document.addEventListener('click', function (ev) {
  if (ev.target.closest('.cclose')) { hideCard(); return; }
  // A plan section opens ITS OWN block, not the whole wing it happens to sit in.
  var pb = ev.target.closest('.pbank');
  if (pb) { showView(pb.getAttribute('data-area'), pb.getAttribute('data-bank')); return; }
  var n = ev.target.closest('.c, .c3');
  if (n && n.hasAttribute('data-ref') && !n.closest('.mini')) { showCard(n, true); return; }
  // The fee quantity inputs must NOT close a pinned card — changing a quantity is
  // how the card's math is driven, and a stray hideCard() made it uneditable.
  // '#srch' joins this list for the same reason '.fees' did: a click in the jump box
  // must not tear down the card the jump box just pinned — nor may the stray click that
  // follows a tap on a result after the list has already closed.
  if (typeof qPickedAt === 'number' && performance.now() - qPickedAt < 600) return;
  if (!ev.target.closest('#card, .tab, .tbtn, .fees, #srch')) hideCard();
});
document.addEventListener('keydown', function (ev) {
  if (ev.key === 'Escape') { hideCard(); return; }
  if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.classList && ev.target.classList.contains('pbank')) {
    ev.preventDefault(); showView(ev.target.getAttribute('data-area'), ev.target.getAttribute('data-bank'));
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
['mb-qty', 'vase-qty', 'noc-qty', 'nrec-qty', 'rec-on', 'oc-on'].forEach(function (id) {
  var e = document.getElementById(id);
  if (!e) return;
  var redraw = function () { if (pinned) { showCard(pinned, false); setPrintCard(readEl(pinned)); } };
  e.addEventListener('input', redraw);
  e.addEventListener('change', redraw);   // checkboxes in older engines
});

// ── Tabs ──────────────────────────────────────────────────────────────────────
var AREA_IDS = ${JSON.stringify(AREAS.map((a) => a.id))};
/**
 * SECTION ISOLATION. Operator, 2026-08-02: "When clicking on a section on the floor
 * plan just show that section, not the whole north wing (for example)."
 *
 * A section still lives inside its area view — that is where its grid, its rollup and
 * its print rules already are — so isolating is a matter of showing ONE block of that
 * view rather than building 19 more views. \`isolate\` names the bank or wall id;
 * passing nothing clears it, which is what the tabs and the breadcrumb do.
 */
function clearIso() {
  var v = document.querySelectorAll('.wview.isolated');
  for (var i = 0; i < v.length; i++) v[i].classList.remove('isolated');
  var b = document.querySelectorAll('.bwrap.iso');
  for (var k = 0; k < b.length; k++) b[k].classList.remove('iso');
}
function showView(v, isolate) {
  var views = document.querySelectorAll('.wview, .view3d');
  for (var i = 0; i < views.length; i++) views[i].classList.remove('active');
  var el = document.getElementById(v === '3d' ? 'view-3d' : 'area-' + v);
  if (el) el.classList.add('active');
  var tabs = document.querySelectorAll('.tabs .tab');
  for (var j = 0; j < tabs.length; j++) tabs[j].classList.toggle('active', tabs[j].getAttribute('data-view') === v);
  document.body.classList.toggle('pv-one', AREA_IDS.indexOf(v) > -1);
  clearIso();
  if (el && isolate) {
    var blk = el.querySelector('.bwrap[data-blk="' + isolate + '"]');
    if (blk) {
      blk.classList.add('iso');
      el.classList.add('isolated');
      var t = el.querySelector('.isotxt');
      if (t) t.textContent = 'Showing ' + (BANK_LABEL[isolate] || isolate) + ' only';
    }
  }
  if (v === '3d') { fitScene(); if (pinned) setCallout(readEl(pinned)); }
  else setCallout(null);
  window.scrollTo(0, 0);
}
document.querySelectorAll('.tabs .tab').forEach(function (t) {
  t.addEventListener('click', function () { showView(t.getAttribute('data-view')); });
});
document.addEventListener('click', function (ev) {
  var b = ev.target.closest('.isob');
  if (!b) return;
  if (b.getAttribute('data-iso') === 'plan') { showView('plan'); return; }
  var wv = b.closest('.wview');
  showView(wv ? wv.getAttribute('data-area') : 'plan');
});

// ── 3D camera + WALKTHROUGH ───────────────────────────────────────────────────
// The camera has two modes. HOME is the old orbit: the whole building from above.
// A STOP puts you INSIDE — the building is panned so the stop's floor position sits
// under the camera, the eye drops to EYE_Y above the floor, and the walls you are not
// standing in front of fade to ghosts so you can see out of the room you are in.
var scene = document.getElementById('scene'), stage = document.getElementById('stage');
var bldg = document.getElementById('bldg');
var HOME = ${HOME_JSON};
var STOPS = ${STOPS_JSON};
var STOP_ORDER = ${STOP_ORDER};
var AREA_STOP = ${AREA_STOP};
var FACES = ${FACES_JSON};
var SOLIDS = ${SOLIDS_JSON};
var FACE_NORMAL = ${JSON.stringify(FACE_NORMAL)};
var FACE_ALONG = ${JSON.stringify(FACE_ALONG)};
var STANDOFF = ${FACE_STANDOFF};
// cam.ex / cam.ez are WHERE YOU ARE STANDING, in plan units. px/pz are derived from
// them, never set directly. Before 2026-08-01 the pan offsets WERE the state and the
// only way to be somewhere was to be exactly at a hand-tuned stop; WASD, the fly-to
// and the search jump all need a free eye position, and the culling pass needs to know
// where your head is rather than which preset you last pressed.
var cam = { yaw: HOME.yaw, pitch: HOME.pitch, zoom: 1, lift: 0, px: 0, pz: 0,
  ex: ${PLAN_W / 2}, ez: ${PLAN_H / 2} };
var ZMIN = 0.18, ZMAX = 3.2, PMIN = -90, PMAX = 0;
var HALF_PX = ${px(FACE_H / 2)};
var STAGE_TOP = 0.70;
var PLAN_PX = ${px(PLAN_W)}, PLAN_D_PX = ${px(PLAN_H)};
var PPI = ${PPI}, PLAN_W = ${PLAN_W}, PLAN_H = ${PLAN_H}, EYE_Y = ${EYE_Y}, FACE_H = ${FACE_H};
var curStop = null;          // null = the home orbit
var curFace = null;          // a face-on standpoint (fly-to / search jump), id or null
var curFree = false;         // standing somewhere you walked to on the floor
var ghostOn = true;
var trail = [];              // breadcrumb history for the Back button
var clamp = function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; };
var inside = function () { return !!(curStop || curFace || curFree); };
/** Which part of the building a free-walked position counts as, for ghosting. */
function nearestArea() {
  var best = null, bd = Infinity;
  for (var i = 0; i < STOP_ORDER.length; i++) {
    var s = STOPS[STOP_ORDER[i]];
    var d = (s.x - cam.ex) * (s.x - cam.ex) + (s.z - cam.ez) * (s.z - cam.ez);
    if (d < bd) { bd = d; best = s.area; }
  }
  return best;
}

// The eye is the source of truth; the pan offsets follow it.
function applyEye() {
  cam.px = -(cam.ex - PLAN_W / 2) * PPI;
  cam.pz = -(cam.ez - PLAN_H / 2) * PPI;
}
function clampEye() {
  // You cannot walk out of the building and lose it behind you.
  cam.ex = clamp(cam.ex, 12, PLAN_W - 12);
  cam.ez = clamp(cam.ez, 12, PLAN_H - 12);
}
/** Crypt banks, niche walls and the two service masses are solid. Halls are not. */
function blocked(x, z) {
  for (var i = 0; i < SOLIDS.length; i++) {
    var s = SOLIDS[i];
    if (x > s[0] - 7 && x < s[0] + s[2] + 7 && z > s[1] - 7 && z < s[1] + s[3] + 7) return true;
  }
  return false;
}
/** Move the eye, sliding along a wall rather than stopping dead against it. */
function moveEye(dx, dz) {
  var nx = cam.ex + dx, nz = cam.ez + dz;
  if (!inside() || !blocked(nx, nz)) { cam.ex = nx; cam.ez = nz; }
  else if (!blocked(nx, cam.ez)) cam.ex = nx;
  else if (!blocked(cam.ex, nz)) cam.ez = nz;
  clampEye(); applyEye();
}

function apply() {
  cam.pitch = clamp(cam.pitch, PMIN, PMAX);
  cam.zoom = clamp(cam.zoom, ZMIN, ZMAX);
  stage.style.setProperty('--yaw', cam.yaw.toFixed(2) + 'deg');
  stage.style.setProperty('--pitch', cam.pitch.toFixed(2) + 'deg');
  stage.style.setProperty('--zoom', cam.zoom.toFixed(3));
  stage.style.setProperty('--lift', cam.lift.toFixed(1) + 'px');
  // LEVEL OF DETAIL. The stage's scale() already grows cell labels geometrically; this
  // multiplies on top, so a ref that is a 2px smudge on the whole-building orbit is
  // ~15px standing at the wall. 1.0 out on the orbit is deliberate — 781 legible
  // labels at once is noise, not detail.
  stage.style.setProperty('--lod', clamp(cam.zoom * 1.9, 1, 3.2).toFixed(2));
  bldg.style.setProperty('--px', cam.px.toFixed(1) + 'px');
  bldg.style.setProperty('--pz', cam.pz.toFixed(1) + 'px');
  var area = curStop ? STOPS[curStop].area
    : (curFace ? FACES[curFace].area : (curFree ? nearestArea() : null));
  cullBehind();
  document.querySelectorAll('[data-viewbtn]').forEach(function (b) {
    var k = b.getAttribute('data-viewbtn');
    b.classList.toggle('on', k === 'home' ? !inside() : k === area);
  });
  document.querySelectorAll('.hot').forEach(function (h) {
    h.classList.toggle('here', h.getAttribute('data-stop') === curStop);
  });
  scene.classList.toggle('inside', inside());
  paintGhosts(area);
  paintCrumbs();
}

// CSS 3D has no view frustum. Standing inside the building, anything BEHIND the camera
// is still projected — and at interior range a wall two metres behind your head lands
// across the whole screen as a bright slab. So at a stop we hide whatever is behind.
// z' = -x*sin(yaw) + z*cos(yaw) in stop-local plan coords; z' > 0 is behind you.
var solids = null, culled = false;
function cullBehind() {
  if (!solids) {
    solids = [].slice.call(document.querySelectorAll('[data-px]')).map(function (el) {
      return { el: el, x: +el.getAttribute('data-px'), z: +el.getAttribute('data-pz'), off: false };
    });
  }
  var i, o;
  if (!inside()) {
    if (culled) { for (i = 0; i < solids.length; i++) { o = solids[i]; if (o.off) { o.el.classList.remove('behind'); o.off = false; } } culled = false; }
    return;
  }
  culled = true;
  // Measured from WHERE YOU ARE STANDING, not from the preset you arrived by — WASD
  // and the fly-to both move the eye away from any stop.
  var r = cam.yaw * Math.PI / 180, si = Math.sin(r), co = Math.cos(r);
  for (i = 0; i < solids.length; i++) {
    o = solids[i];
    var want = (-(o.x - cam.ex) * si + (o.z - cam.ez) * co) > 26;
    if (want !== o.off) { o.el.classList.toggle('behind', want); o.off = want; }
  }
}

// Ghosting. A niche wall belongs to the "niches" list but PHYSICALLY stands in another
// area, so it stays solid when you are standing in that area too.
function paintGhosts(area) {
  var on = ghostOn && !!area;
  document.querySelectorAll('.face, .fbase, .mass, .mtop, .blk').forEach(function (el) {
    var a = el.getAttribute('data-area');
    if (!a) { for (var i = 0; i < el.classList.length; i++) { var c = el.classList[i]; if (c.indexOf('ar-') === 0) { a = c.slice(3); break; } } }
    var home = el.getAttribute('data-homearea');
    var mine = a === area || home === area;
    el.classList.toggle('ghost', on && !mine);
  });
}

function paintCrumbs() {
  var bar = document.getElementById('crumbs');
  var s = curStop ? STOPS[curStop] : null;
  var h = '<button type="button" class="crumb" data-crumb="home">Whole Building</button>';
  if (!s && !curFace && curFree) {
    h += '<span class="csep">\u203a</span><span class="crumb cur">Walking</span>';
    h += '<span class="cnote2">Click the floor to walk \u00b7 drag to look \u00b7 double-click a wall to face it</span>';
  } else if (!s && curFace) {
    var f = FACES[curFace];
    h += '<span class="csep">\\u203a</span><button type="button" class="crumb" data-crumb="area:' + f.area + '">' +
      (AREA_LABEL[f.area] || f.area) + '</button>';
    h += '<span class="csep">\\u203a</span><span class="crumb cur">' + f.label + '</span>';
    h += '<span class="cnote2">Face-on \\u00b7 W A S D or the arrow keys to move and look</span>';
  } else if (s) {
    h += '<span class="csep">\\u203a</span><button type="button" class="crumb" data-crumb="area:' + s.area + '">' +
      (AREA_LABEL[s.area] || s.area) + '</button>';
    h += '<span class="csep">\\u203a</span><span class="crumb cur">' + s.label + '</span>';
    h += '<span class="cnote2">' + s.sub + '</span>';
  } else {
    h += '<span class="cnote2">Click a doorway or a floor marker to walk in</span>';
  }
  h += '<button type="button" class="crumb cback2" id="btn-back"' + (trail.length ? '' : ' disabled') + '>\\u2190 Back</button>';
  bar.innerHTML = h;
}

function homeZoom() {
  var w = scene.clientWidth || 900, h = scene.clientHeight || 480;
  return clamp(Math.min(w * 0.80 / PLAN_PX, h * 0.80 / (PLAN_D_PX * 0.72)), ZMIN, ZMAX);
}
function insideZoom() {
  return clamp(Math.min(scene.clientHeight * 0.62 / (FACE_H * PPI), scene.clientWidth * 0.62 / (150 * PPI)), ZMIN, ZMAX);
}
/**
 * Zoom for a FACE-ON standpoint. Deliberately NOT insideZoom(): that one also budgets
 * 150 plan units of width, which on a 390px phone binds first and parks you so far back
 * that the crypt refs render at 5px — measured, and the operator's complaint in one
 * number. Face-on, width does not matter (turn your head); the wall's HEIGHT filling
 * the frame is what makes a ref readable, so that is the only term.
 */
function faceZoom() {
  return clamp(scene.clientHeight * 0.62 / (FACE_H * PPI), ZMIN, ZMAX);
}
function fitScene() {
  if (!scene.offsetWidth) return;
  if (curFace) goFace(curFace, faceRef, true);
  else if (curStop) goStop(curStop, true, true);
  else goHome(true);
}
window.addEventListener('resize', fitScene);

function dropCard() {
  // A camera jump moves the model under a stationary cursor; Chrome then fires a
  // synthetic hover that can park a stale card over the model. Drop it.
  if (!pinned) card.classList.remove('show');
}

function goHome(keep) {
  dropCard(); stopGlide();
  if (inside() && !keep) trail.push(curStop);
  curStop = null; curFace = null; faceRef = null; curFree = false;
  cam.yaw = HOME.yaw; cam.pitch = HOME.pitch;
  cam.ex = PLAN_W / 2; cam.ez = PLAN_H / 2; applyEye();
  cam.zoom = homeZoom();
  cam.lift = HALF_PX * cam.zoom * 0.5 - (STAGE_TOP - 0.5) * scene.clientHeight * 0.5;
  apply();
}

function goStop(id, keep, silent) {
  var s = STOPS[id];
  if (!s) return goHome(keep);
  dropCard(); stopGlide();
  if (!silent && curStop !== id) trail.push(curStop);
  curStop = id; curFace = null; faceRef = null; curFree = false;
  cam.yaw = s.yaw; cam.pitch = s.pitch == null ? -5 : s.pitch;
  cam.zoom = insideZoom() * (s.zoom || 1);
  cam.ex = s.x; cam.ez = s.z; applyEye();
  cam.lift = (0.5 - STAGE_TOP) * scene.clientHeight - EYE_Y * PPI * cam.zoom;
  apply();
  if (!keep) window.scrollTo(0, 0);
}

/**
 * Stand square in front of a bank face or a niche wall. This is the "fly to the view
 * you want" the operator asked for: a double-click / double-tap on a wall, and the
 * landing pad for every search jump.
 *
 * With a ref, the standpoint slides ALONG the face so that unit is centred in frame
 * rather than merely somewhere on the wall — which is the whole point when a bank is
 * 17 columns wide. FACE_ALONG carries the mirroring: on a rotateY(180) face the
 * columns climb in -x, and using +x there would centre the far end of the bank.
 */
var faceRef = null;
function goFace(id, ref, silent) {
  var f = FACES[id];
  if (!f) return;
  dropCard(); stopGlide();
  if (!silent) trail.push(curStop);
  curStop = null; curFace = id; faceRef = ref || null; curFree = false;
  var off = 0;
  var e = ref ? BY_REF[ref] : null;
  if (e) off = (e.c[0] - f.c0 + e.c.length / 2 - f.n / 2) * f.cw;
  var al = FACE_ALONG[f.face], nm = FACE_NORMAL[f.face];
  cam.ex = f.x + al[0] * off + nm[0] * STANDOFF;
  cam.ez = f.z + al[1] * off + nm[1] * STANDOFF;
  clampEye(); applyEye();
  cam.yaw = f.yaw; cam.pitch = -4;
  cam.zoom = faceZoom();
  cam.lift = (0.5 - STAGE_TOP) * scene.clientHeight - EYE_Y * PPI * cam.zoom;
  apply();
}

function goBack() {
  if (!trail.length) return;
  var prev = trail.pop();
  prev ? goStop(prev, true, true) : goHome(true);
  paintCrumbs();
}

// Doorways, floor markers, breadcrumbs and the area buttons all move the camera.
document.addEventListener('click', function (ev) {
  var t = ev.target.closest('[data-stop]');
  if (t) { ev.stopPropagation(); goStop(t.getAttribute('data-stop')); showView('3d'); return; }
  var c = ev.target.closest('[data-crumb]');
  if (c) {
    var v = c.getAttribute('data-crumb');
    if (v === 'home') goHome();
    else goStop(AREA_STOP[v.slice(5)]);
    return;
  }
  if (ev.target.closest('#btn-back')) goBack();
}, true);
document.addEventListener('keydown', function (ev) {
  if (ev.key !== 'Enter' && ev.key !== ' ') return;
  var t = ev.target.closest && ev.target.closest('[data-stop]');
  if (t) { ev.preventDefault(); goStop(t.getAttribute('data-stop')); showView('3d'); }
});

document.querySelectorAll('[data-viewbtn]').forEach(function (b) {
  b.addEventListener('click', function () {
    var k = b.getAttribute('data-viewbtn');
    if (k === 'home') return goHome();
    goStop(AREA_STOP[k]);
  });
});
document.getElementById('btn-reset').addEventListener('click', function () { goHome(); });
document.getElementById('btn-ghost').addEventListener('click', function () {
  ghostOn = !ghostOn;
  this.classList.toggle('on', ghostOn);
  this.setAttribute('aria-pressed', ghostOn ? 'true' : 'false');
  apply();
});
document.getElementById('btn-in').addEventListener('click', function () { cam.zoom *= 1.25; apply(); });
document.getElementById('btn-out').addEventListener('click', function () { cam.zoom /= 1.25; apply(); });

// Drag to orbit / pinch to zoom. Capture is DEFERRED until a real drag (>8px) or a
// second finger — capturing on pointerdown retargets the click to the scene and a
// tap on a crypt never reaches the button (MISTAKES #18).
var pts = {}, last = null, pinchStart = 0, zoomStart = 1, moved = 0, captured = false;
var downCell = null, downAt = 0;

// ── Damping ───────────────────────────────────────────────────────────────────
// Semantics borrowed from yomotsu/camera-controls (three.js-bound, so not vendorable
// onto a CSS-3D scene — only the behaviour is taken): per-frame exponential decay so
// the camera glides to a stop with weight, a settle threshold that ends the rAF loop
// rather than spinning forever, rotate speed that scales with zoom so close-in control
// stays fine-grained, and any user input interrupting the glide immediately.
//
// The one contract this must not touch: DRAG NEVER SELECTS. The tap detector keys off
// POINTER TRAVEL (the 'moved' accumulator) and always has; it is NOT keyed off camera
// motion, because the camera now keeps moving after your finger has left the glass.
var DAMP = 0.90, SETTLE = 0.045;
var vYaw = 0, vPitch = 0, vX = 0, vZ = 0, glideRaf = 0;
var REDUCED = false;
try { REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { REDUCED = false; }
/** Finer rotation the closer you are standing; coarser out on the whole-building orbit. */
function rotScale() { return clamp(1.1 / (0.4 + cam.zoom), 0.35, 1.4); }
var travelX = null, travelZ = 0, lastGlideAt = 0;
// ENTRY EASE. Walking in from the whole-building orbit is not just a translation: the
// pitch flattens, the zoom drops you to eye height and the lift re-centres the stage.
// Those three used to be assigned instantly while only ex/ez eased, which read as a
// hard cut on the first click into the building. They now interpolate alongside the
// travel, over ~0.6s (slower than the 0.35s floor walk — it is a bigger change), with
// the same interruptible damping: stopGlide() clears them exactly like travelX, so any
// drag, key or tap during the entry leaves the camera where you grabbed it.
var camT = null;             // { pitch, zoom, lift } or null
var CAM_EASE = 0.916;        // per-60Hz-frame retention -> settles in ~0.6s
function stopGlide() {
  vYaw = vPitch = vX = vZ = 0; travelX = null; camT = null;
  if (glideRaf) { cancelAnimationFrame(glideRaf); glideRaf = 0; }
  lastGlideAt = 0;
  if (!captured) scene.classList.remove('dragging');
}
function glide(ts) {
  glideRaf = 0;
  var live = false;
  // TIME-BASED decay, not per-frame. A fixed 0.90 per frame is a different gesture on a
  // 120 Hz phone than on a throttled tab; normalising to 60 Hz makes the glide last the
  // same ~0.7 s everywhere. dt is clamped so a backgrounded tab does not teleport.
  var now = typeof ts === 'number' ? ts : performance.now();
  var dt = clamp(now - (lastGlideAt || now), 1, 100);
  lastGlideAt = now;
  var d = Math.pow(DAMP, dt / 16.67);
  // Travelling to a clicked floor point: ease in, never teleport, and any input during
  // the walk interrupts it (stopGlide clears the target) — camera-controls' moveTo.
  if (travelX !== null) {
    var dx = travelX - cam.ex, dz = travelZ - cam.ez;
    if (Math.abs(dx) + Math.abs(dz) < 1.2) { cam.ex = travelX; cam.ez = travelZ; clampEye(); applyEye(); travelX = null; }
    else { var ease = 1 - Math.pow(0.86, dt / 16.67); moveEye(dx * ease, dz * ease); live = true; }
  }
  // ...and the rest of the camera state eases with it on the way in.
  if (camT) {
    var ce = 1 - Math.pow(CAM_EASE, dt / 16.67);
    var dp = camT.pitch - cam.pitch, dzm = camT.zoom - cam.zoom, dl = camT.lift - cam.lift;
    if (Math.abs(dp) < 0.05 && Math.abs(dzm) < 0.002 && Math.abs(dl) < 0.5) {
      cam.pitch = camT.pitch; cam.zoom = camT.zoom; cam.lift = camT.lift; camT = null;
    } else {
      cam.pitch += dp * ce; cam.zoom += dzm * ce; cam.lift += dl * ce; live = true;
    }
  }
  vYaw *= d; vPitch *= d; vX *= d; vZ *= d;
  if (Math.abs(vYaw) >= SETTLE || Math.abs(vPitch) >= SETTLE
    || Math.abs(vX) >= SETTLE || Math.abs(vZ) >= SETTLE) {
    cam.yaw += vYaw; cam.pitch += vPitch;
    if (vX || vZ) moveEye(vX, vZ);
    live = true;
  } else { vYaw = vPitch = vX = vZ = 0; }
  apply();
  if (live) glideRaf = requestAnimationFrame(glide);
  else if (!captured) scene.classList.remove('dragging');
}

/**
 * WALK TO A POINT ON THE FLOOR. Operator, 2026-08-01: "being able to click and move
 * inside with a larger view as if it were google maps may help." The whole floor plane
 * is the target, not the 19 discrete markers — those stay, as named shortcuts.
 *
 * Clicking in from the whole-building orbit drops you to eye height on the way; from
 * inside it keeps your heading, so clicking down a hall walks you along it.
 */
function travelTo(tx, tz) {
  dropCard();
  var wasInside = inside();
  if (!wasInside) trail.push(null);
  curStop = null; curFace = null; faceRef = null; curFree = true;
  var enterT = null;
  if (!wasInside) {
    var ez2 = clamp(insideZoom(), ZMIN, ZMAX);
    enterT = { pitch: -5, zoom: ez2,
      lift: (0.5 - STAGE_TOP) * scene.clientHeight - EYE_Y * PPI * ez2 };
  }
  vYaw = vPitch = vX = vZ = 0;
  if (REDUCED) {
    travelX = null; camT = null;
    if (enterT) { cam.pitch = enterT.pitch; cam.zoom = enterT.zoom; cam.lift = enterT.lift; }
    cam.ex = tx; cam.ez = tz; clampEye(); applyEye(); apply();
    return;
  }
  if (enterT) camT = enterT;
  travelX = tx; travelZ = tz;
  scene.classList.add('dragging');
  if (!glideRaf) glideRaf = requestAnimationFrame(glide);
  apply();
}

/**
 * Turn a pointer event over a floor surface into a plan coordinate.
 *
 * offsetX and offsetY are reported in the target element's OWN untransformed box even
 * when that box is under a 3D transform, which is the whole trick — no ray casting.
 * The floor and the hall pads are laid with rotateX(-90deg), under which local +y maps
 * to world -z, so the vertical axis is subtracted rather than added. That sign is the
 * one thing here that is easy to get backwards, so the Playwright suite clicks a known
 * quarter of the floor and asserts which quarter of the plan it lands in.
 */
function floorPoint(ev) {
  var el = ev.target;
  if (!el || !el.getAttribute || el.getAttribute('data-fx') === null) return null;
  var w = el.offsetWidth, h = el.offsetHeight;
  if (!w || !h) return null;
  return [+el.getAttribute('data-fx') + (ev.offsetX - w / 2) / PPI,
    +el.getAttribute('data-fz') - (ev.offsetY - h / 2) / PPI];
}
var reticle = document.getElementById('reticle');
function showReticle(pt) {
  if (!pt) { reticle.classList.remove('on'); return; }
  reticle.style.transform = 'translate(-50%,-50%) translate3d(' + ((pt[0] - PLAN_W / 2) * PPI).toFixed(1)
    + 'px,' + ((FACE_H / 2 - 1.4) * PPI).toFixed(1) + 'px,' + ((pt[1] - PLAN_H / 2) * PPI).toFixed(1)
    + 'px) rotateX(-90deg)';
  reticle.classList.add('on');
}
scene.addEventListener('pointermove', function (ev) {
  if (captured || Object.keys(pts).length) return;
  showReticle(floorPoint(ev));
});
scene.addEventListener('pointerleave', function () { showReticle(null); });
function kick(dYaw, dPitch, dX, dZ) {
  if (REDUCED) {
    cam.yaw += dYaw; cam.pitch += dPitch;
    if (dX || dZ) moveEye(dX, dZ);
    apply(); return;
  }
  vYaw = clamp(vYaw + dYaw, -14, 14); vPitch = clamp(vPitch + dPitch, -14, 14);
  vX = clamp(vX + dX, -26, 26); vZ = clamp(vZ + dZ, -26, 26);
  scene.classList.add('dragging');     // kills the CSS transition; the rAF loop drives
  if (!glideRaf) glideRaf = requestAnimationFrame(glide);
}
/** Where "forward" is, at the current yaw. Matches the culling pass's convention. */
function fwd() { var r = cam.yaw * Math.PI / 180; return [Math.sin(r), -Math.cos(r)]; }
function rgt() { var r = cam.yaw * Math.PI / 180; return [Math.cos(r), Math.sin(r)]; }

function capturePts() {
  if (captured) return;
  captured = true;
  scene.classList.add('dragging');
  // Dragging inside a stop is LOOKING AROUND, not leaving: the stop (and therefore the
  // breadcrumb and the ghosting) survives a drag. Only a doorway, a marker, a
  // breadcrumb or Reset moves you.
  if (!pinned) card.classList.remove('show');
  Object.keys(pts).forEach(function (id) { try { scene.setPointerCapture(+id); } catch (e) { /* gone */ } });
}
scene.addEventListener('pointerdown', function (ev) {
  stopGlide();                       // any touch interrupts the glide, camera-controls style
  if (Object.keys(pts).length === 0) {
    var n = ev.target.closest('.c3');
    downCell = (n && n.hasAttribute('data-ref')) ? n : null;
    downFace = faceIdAt(ev.target);
    downFloor = floorPoint(ev);
    downAt = performance.now();
  } else { downCell = null; downFace = null; downFloor = null; }
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
  var k = rotScale();
  var dYaw = dx * 0.35 * k, dPitch = -dy * 0.28 * k;
  cam.yaw += dYaw; cam.pitch += dPitch;   // apply() clamps pitch
  // Remember the LAST frame's motion, and when it happened, so a flick releases into a
  // glide but a slow careful drag that stopped before you lifted does not.
  vYaw = dYaw; vPitch = dPitch; lastMoveAt = performance.now();
  last = { x: ev.clientX, y: ev.clientY };
  apply();
});
var suppressUntil = 0, downFace = null, downFloor = null, lastMoveAt = 0;
var lastTapAt = 0, lastTapFace = null, lastTapX = 0, lastTapY = 0;
function endPtr(ev) {
  delete pts[ev.pointerId];
  if (!Object.keys(pts).length) {
    suppressUntil = performance.now() + 450;
    var now = performance.now();
    var isTap = ev.type === 'pointerup' && moved <= 8;
    // Settle the CAMERA first, then dispatch the tap. The other order looked fine and
    // was not: a tap on the floor started a travel, and the stopGlide() two lines below
    // — which is there to make sure a tap never nudges the camera — cancelled the travel
    // it had just started, so clicking the floor set every flag and moved nothing.
    var flick = captured && moved > 8 && now - lastMoveAt < 90 && !REDUCED
      && (Math.abs(vYaw) > 0.25 || Math.abs(vPitch) > 0.25);
    captured = false;
    if (flick) {
      scene.classList.add('dragging');
      if (!glideRaf) glideRaf = requestAnimationFrame(glide);
    } else {
      stopGlide();
      scene.classList.remove('dragging');
    }
    if (isTap && downCell && now - downAt < 700) {
      showCard(downCell, true);
    } else if (isTap && downFloor) {
      // A tap on open floor is a WALK, not a dismissal. It deliberately does not
      // clear a pinned card: you walk over to look at the crypt you just selected.
      travelTo(downFloor[0], downFloor[1]);
    } else if (isTap && !downCell && !ev.target.closest('#card')) {
      hideCard();
    }
    // DOUBLE-TAP A WALL TO FLY FACE-ON. Touch only gets a dblclick unreliably, so the
    // second tap is detected here — same wall, within 340 ms, and the finger did not
    // travel. The first tap has already selected whatever it landed on; that is the
    // family contract and it is left exactly as it was.
    if (isTap && downFace) {
      if (lastTapFace === downFace && now - lastTapAt < 340
        && Math.abs(ev.clientX - lastTapX) < 24 && Math.abs(ev.clientY - lastTapY) < 24) {
        goFace(downFace, downCell ? downCell.getAttribute('data-ref') : null);
        lastTapFace = null; lastTapAt = 0;
      } else {
        lastTapFace = downFace; lastTapAt = now; lastTapX = ev.clientX; lastTapY = ev.clientY;
      }
    } else if (isTap) { lastTapFace = null; lastTapAt = 0; }
    downCell = null; downFace = null; downFloor = null; last = null; pinchStart = 0; moved = 0;
  }
}
scene.addEventListener('pointerup', endPtr);
scene.addEventListener('pointercancel', endPtr);
scene.addEventListener('click', function (ev) {
  if (performance.now() < suppressUntil) { ev.stopPropagation(); ev.preventDefault(); }
}, true);
// Gentler, and unit-agnostic. The old curve read raw deltaY, so a trackpad flick (which
// arrives as a few hundred pixels in one event) crossed the whole zoom range in one
// gesture and a mouse set to scroll by LINES barely moved at all. Normalise the unit,
// cap what one event may do, and halve the rate.
scene.addEventListener('wheel', function (ev) {
  ev.preventDefault(); stopGlide();
  var d = ev.deltaY;
  if (ev.deltaMode === 1) d *= 16; else if (ev.deltaMode === 2) d *= 400;
  cam.zoom *= Math.exp(-clamp(d, -60, 60) * 0.0007);
  apply();
}, { passive: false });

// DOUBLE-CLICK A WALL TO FLY FACE-ON (mouse; touch is handled in endPtr).
function faceIdAt(el) {
  if (!el || !el.closest) return null;
  var f = el.closest('[data-bankface]');
  if (f) return f.getAttribute('data-bankface');
  // Out on the orbit the bank's solid BLOCK is what your pointer lands on, not the thin
  // face plate. Double-clicking the block plainly means "take me to that bank".
  var b = el.closest('[data-blk]');
  return b ? b.getAttribute('data-blk') : null;
}
scene.addEventListener('dblclick', function (ev) {
  var id = faceIdAt(ev.target);
  if (!id) return;
  ev.preventDefault();
  var cell = ev.target.closest('.c3');
  goFace(id, cell ? cell.getAttribute('data-ref') : null);
});

// ARROWS LOOK, WASD MOVES, +/- ZOOM, R RESETS — the same four jobs everywhere, at a
// stop or out on the orbit. Out on the orbit "moving" pans the building, which is the
// honest analogue and keeps one key doing one thing.
scene.addEventListener('keydown', function (ev) {
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
  var k = ev.key, look = ev.shiftKey ? 15 : 5, step = ev.shiftKey ? 22 : 9;
  var f, r;
  if (k === 'ArrowLeft') kick(-look, 0, 0, 0);
  else if (k === 'ArrowRight') kick(look, 0, 0, 0);
  else if (k === 'ArrowUp') kick(0, look, 0, 0);
  else if (k === 'ArrowDown') kick(0, -look, 0, 0);
  else if (k === '+' || k === '=') { stopGlide(); cam.zoom *= 1.18; apply(); }
  else if (k === '-' || k === '_') { stopGlide(); cam.zoom /= 1.18; apply(); }
  else if (k === 'Home' || k === 'r' || k === 'R') goHome();
  else {
    var lk = k.length === 1 ? k.toLowerCase() : k;
    if (lk === 'w' || lk === 's') { f = fwd(); r = lk === 'w' ? step : -step; kick(0, 0, f[0] * r, f[1] * r); }
    else if (lk === 'a' || lk === 'd') { f = rgt(); r = lk === 'd' ? step : -step; kick(0, 0, f[0] * r, f[1] * r); }
    else return;
  }
  ev.preventDefault();
});

${SEARCH_RUNTIME}

goHome(true);
`;

// ── Assemble ──────────────────────────────────────────────────────────────────
const LOGO = fs.readFileSync(path.join(ROOT, 'scripts', 'bw-logo.svg.txt'), 'utf8').trim();
const N_UNITS = units.length;
const N_SPACES = cryptSpaces().length;
const N_AVAIL = units.filter((u) => u.st === 'available').length;
const PRICED = units.filter((u) => u.st === 'available' && u.p != null);
const N_PRICED = PRICED.length;
const AVAIL_VALUE = PRICED.reduce((t, u) => t + u.p, 0);
const N_BLOCK = units.filter((u) => u.st === 'blocked').length;
const N_OCC = units.filter((u) => u.st === 'occupied').length;
const N_RES = units.filter((u) => u.st === 'reserved').length;
const N_UNL = units.filter((u) => u.st === 'unlisted').length;
const N_NOPRICE = units.filter((u) => u.st === 'unpriced').length;
const niches = allNiches();
const N_NICHE = niches.length;
const N_NAVAIL = niches.filter((n) => n.st === 'available').length;
const NICHE_VALUE = niches.filter((n) => n.p).reduce((s, n) => s + n.p, 0);

const LEGEND = `<div class="legend">
      <div class="li"><div class="ls lg-a"></div><span>Available</span></div>
      <div class="li"><div class="ls lg-r"></div><span>Reserved — held, no interment</span></div>
      <div class="li"><div class="ls lg-o"></div><span>Occupied — interment recorded</span></div>
      <div class="li"><div class="ls lg-x"></div><span>Not Selling</span></div>
      <div class="li"><div class="ls lg-u"></div><span>Unavailable — ask us</span></div>
      <div class="li"><div class="ls lg-u"></div><span>Not offered — no listed price</span></div>
      <div class="li"><div class="ls lg-v"></div><span>Empty area — no crypts</span></div>
    </div>`;

// The "crypt prices are not shown on this page" banner is GONE: as of 2026-08-01 they
// are shown, from MIS. What replaces it is the price legend plus the two things a
// counselor still has to know — the snapshot date and the two crypts MIS could not price.
const PRICE_LEGEND = `<div class="plegend">
${PRICE_BANDS.map((b) => `      <div class="pli"><div class="pls ${b.c}"></div><span>${b.l}</span></div>`).join('\n')}
    </div>`;

// REMOVED 2026-08-01 at the operator's explicit instruction: the price-provenance
// paragraph that used to sit here ("Crypt prices come from MIS and are exact\u2026
// Nothing unsellable shows money anywhere on this page") is gone from the page. He
// quoted the excerpt and said remove all of it.
//
// NOTHING IT DESCRIBED WAS RELAXED. Every rule the paragraph narrated is enforced by
// verify_com_map.mjs against the data, which is where a rule belongs \u2014 exact MIS
// prices, one price per tandem/companion unit, no rounding, the price>0 availability
// rule, the sheet-derived niche prices, and no money on anything unsellable. Only the
// prose went. verify_com_map.mjs now asserts the text is ABSENT so it cannot creep back.
//
// The price-band LEGEND survives on its own: it is not prose, it is the key to reading
// the coloured chips, and without it the six bands are unexplained.
const PRICE_KEY = `<div class="pricekey">
${PRICE_LEGEND}
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
  <div class="srch no-print" id="srch">
    <input id="q" type="search" autocomplete="off" autocapitalize="off" spellcheck="false"
      role="combobox" aria-expanded="false" aria-controls="qlist" aria-autocomplete="list"
      aria-label="Find a crypt or niche by reference"
      placeholder="Find a crypt or niche — D-116">
    <button class="qclear" type="button" id="qclear" aria-label="Clear search" tabindex="-1">&times;</button>
    <ul class="qlist" id="qlist" role="listbox" aria-label="Matching crypts and niches" hidden></ul>
    <div class="qsr" id="qsr" role="status" aria-live="polite"></div>
  </div>
  <a class="walk-btn no-print" href="COM_Walkthrough.html">Photoreal walkthrough</a>
  <a class="back-btn no-print" href="../">&larr; Quote Tool</a>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
</div>
<div class="tabs">
  <button class="tab active" data-view="3d">Walk Through</button>
  <button class="tab" data-view="plan">Floor Plan</button>
  <button class="tab" data-view="overview" style="margin-left:auto;border-left:1px solid var(--gb);">All Banks</button>
</div>
<div class="tabs tabs2">
  <span class="tabl">Printable lists</span>
${AREAS.map((a) => `  <button class="tab" data-view="${a.id}">${esc(a.label)}</button>`).join('\n')}
</div>
<div class="main">
  <div class="printcard" id="printcard" aria-hidden="true"></div>

  <div class="view3d active" id="view-3d">
    <div class="toolbar no-print">
      <button class="tbtn" data-viewbtn="home" title="The whole building from above">Whole Building</button>
${AREAS.map((a) => `      <button class="tbtn" data-viewbtn="${a.id}" title="${esc(a.sub)}">${esc(a.label)}</button>`).join('\n')}
      <div class="tbsep"></div>
      <button class="tbtn on" id="btn-ghost" aria-pressed="true" title="Fade the walls you are not standing in front of">Ghost other walls</button>
      <button class="tbtn" id="btn-reset">Reset view</button>
      <div class="tbsep"></div>
      <button class="tbtn" id="btn-out" aria-label="Zoom out">&minus;</button>
      <button class="tbtn" id="btn-in" aria-label="Zoom in">+</button>
    </div>
    <nav class="crumbs no-print" id="crumbs" aria-label="Where you are in the building"></nav>
${scene3d()}
    <div class="hint"><b>Click anywhere on the floor</b> to walk there &nbsp;·&nbsp; <b>double-click a wall</b> to swing face-on to it &nbsp;·&nbsp; drag to look around &nbsp;·&nbsp; scroll or pinch to zoom &nbsp;·&nbsp; tap a crypt to select it<br>
      <b>W A S D</b> walks &nbsp;·&nbsp; arrow keys look &nbsp;·&nbsp; <b>+ /&minus;</b> zoom &nbsp;·&nbsp; <b>R</b> resets the view &nbsp;·&nbsp; or type a reference such as <b>D-116</b> into <b>Find a crypt or niche</b>, up in the header</div>
    <div class="modelnote">${ENTRANCES.length} entrances &nbsp;·&nbsp; ${STOPS.length} walk-to positions &nbsp;·&nbsp; ${BANKS.length} crypt banks (${N_UNITS} purchasable units over ${N_SPACES} crypt spaces) plus the Radiance and Serenity niche walls (${N_NICHE} niches) &nbsp;·&nbsp; wall POSITIONS are measured off the cemetery CAD floor plan and bank DEPTHS follow the crypt type (a tandem holds two caskets end to end); both niche walls' positions, facings, mounting and the stone each part of the building is finished in come from the 2026-07-29 walk-through video. Heights and the chapel furniture layout are still ESTIMATED. No dimensions are implied.</div>
    ${LEGEND}
  </div>

${planView()}
${AREAS.map(areaView).join('\n')}
${overviewView()}

  ${PRICE_KEY}

  <div class="fees">
    <div class="fi"><span class="fl">Recording Fee — ${money(CRYPT_FEES.RECORDING)}</span>
      <span class="fv"><label class="fchk"><input type="checkbox" id="rec-on"> Add to crypt cards</label></span></div>
    <div class="fi"><span class="fl">Entombment O&amp;C — ${money(CRYPT_FEES.OC)}</span>
      <span class="fv"><label class="fchk"><input type="checkbox" id="oc-on"> Add to crypt cards</label></span></div>
    <div class="fi"><span class="fl">Monobar — ${money(CRYPT_FEES.MONOBAR + CRYPT_FEES.MONOBAR_INSTALL)} ea</span>
      <span class="fv">${money(CRYPT_FEES.MONOBAR)} memorial + ${money(CRYPT_FEES.MONOBAR_INSTALL)} install ·
      Qty: <input type="number" id="mb-qty" min="0" max="4" value="0" aria-label="Monobar quantity"></span></div>
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
    <div class="fi"><span class="fl">Crypt fee source</span>
      <span class="fv">${esc(CRYPT_FEE_SOURCE)}</span></div>
  </div>
  <div class="pfoot">
    <b>Tier G is the top row, tier A the bottom. Space numbers run 101–231 around the building.</b><br>
    A tandem or companion is ONE purchasable unit at one price and is never split.<br>
    ${N_AVAIL} crypt units available, ${money(AVAIL_VALUE)} listed &nbsp;·&nbsp;
    ${N_NOPRICE} not offered (listed available, no price) &nbsp;·&nbsp; ${N_RES} reserved &nbsp;·&nbsp; ${N_OCC} occupied &nbsp;·&nbsp;
    ${N_BLOCK} not selling &nbsp;·&nbsp; ${N_UNL} unavailable — ask us &nbsp;·&nbsp;
    ${N_NAVAIL} niches available, ${money(NICHE_VALUE)} listed &nbsp;·&nbsp; ${esc(NICHE_PRICES_EFFECTIVE)}<br>
    Crypt availability comes from the cemetery Lot Inquiry List printed ${MIS.printed} (${MIS.resultRows.toLocaleString('en-US')} rows over ${MIS.spaces} crypt spaces) and crypt PRICES from the cemetery crypt-price export of ${PRICES.exported} (${PRICES.rows} priced positions); the niche walls are from the 2026-07-29 wall sheets. It is a SNAPSHOT and is not updated automatically — ask us for today&rsquo;s status and price before writing.
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
