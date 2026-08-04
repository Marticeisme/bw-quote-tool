/**
 * Gate for the Terrace Garden Mausoleum property map.
 *
 * Proves that MAPS/TG_Mausoleum_Map.html is a faithful, deterministic rendering of
 * scripts/tg-maus-data.mjs; that its section labels and bank numbering match the
 * transcription of the cemetery's own overview of this building; that the courtyard is
 * the Memorial Path and links BOTH WAYS to MAPS/TGMP_Map.html; and — the part that
 * matters in front of a family — that this geometry-first ship renders NO price, NO
 * status and NO inventory count anywhere, because none of those is sourced yet.
 *
 *   node scripts/verify_tg_maus_map.mjs
 *
 * Exit 1 on any failure. Sabotage a bank number, a label, a link, the pool sentence or
 * one of the empty price slots in the dataset and this must go red.
 *
 * READS FROM DISK ONLY. It never fetches a served page, so it does not need
 * scripts/served-tree-check.mjs — that rule binds verifiers that do both.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  SITE, GEO, WINGS, TANDEM, STRUCTURES, ROOFS, COURTYARD, CRYPT_KINDS,
  MIS_WEST_BANKS, MIS_EAST_BANKS, MIS_FAMILY_ROOMS, EAST_BOUND_APPROX,
  STATUS_STYLE, ASK, ASK_CHIP, allPositions, bankRef, sellable,
  ELEV, CONF_LABEL, MATERIAL, blocks3d,
} from './tg-maus-data.mjs';
import { assertFamilyRegister, stripUnrendered } from './_no_mis_assert.mjs';
import { MOVEMENT_TOKENS } from './map-movement.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REL = 'MAPS/TG_Mausoleum_Map.html';
const ABS = path.join(ROOT, REL);
const TGMP_REL = 'MAPS/TGMP_Map.html';
const TGMP_ABS = path.join(ROOT, TGMP_REL);

// ── What the source drawing says, typed here rather than read from the dataset ──
// These are the sprint-14 director's transcription of the cemetery's own overview of
// this building. Typing them independently means a slip in tg-maus-data.mjs fails here
// instead of propagating into the page.
const SRC_WEST = [1, 13];
const SRC_EAST = [14, 28];
const SRC_ROOMS = ['Family Room 1', 'Family Room 2'];
const SRC_KINDS = ['Single', 'Deluxe companion', 'Westminster'];
const SRC_STRUCTURES = ['Terrace Garden Ossuary', 'Entrance', 'Eternal Light Mausoleum', 'Water feature'];

let failures = 0;
const fail = (m) => { failures++; console.log('  FAIL  ' + m); };
const pass = (m) => console.log('  ok    ' + m);
const ck = (ok, m) => (ok ? pass : fail)(m);

console.log('\nTerrace Garden Mausoleum property-map gate\n');

// ── 0. Dataset sanity ────────────────────────────────────────────────────────
console.log('Dataset');
{
  const all = allPositions();
  const dup = [];
  const seen = new Set();
  for (const p of all) { if (seen.has(p.ref)) dup.push(p.ref); seen.add(p.ref); }
  ck(dup.length === 0, `all ${all.length} references unique${dup.length ? ' — dupes: ' + dup.join(', ') : ''}`);
  const badRef = all.filter((p) => !/^TGM-(?:[WE]-(?:[1-9]|1\d|2[0-8])|T)$/.test(p.ref));
  ck(badRef.length === 0, `all refs match TGM-<wing>-<n> or TGM-T${badRef.length ? ' — ' + badRef.map((p) => p.ref).join(', ') : ''}`);
  ck(bankRef('W', 7) === 'TGM-W-7', 'bankRef() spells a reference the way the page does');

  // THE EMPTY SLOTS. This ship carries no numbers, and the dataset must say so in a way
  // a later, additive load can fill. A price or a status appearing here is the signal
  // that someone started inventing inventory.
  const priced = all.filter((p) => p.price !== null);
  ck(priced.length === 0, `no position carries a price${priced.length ? ' — ' + priced.map((p) => p.ref).join(', ') : ` (all ${all.length} price slots empty)`}`);
  const stat = all.filter((p) => p.status !== null);
  ck(stat.length === 0, `no position carries a status${stat.length ? ' — ' + stat.map((p) => p.ref).join(', ') : ` (all ${all.length} status slots empty)`}`);
  const counted = all.filter((p) => p.positions !== null);
  ck(counted.length === 0, `no position claims an inventory count${counted.length ? ' — ' + counted.map((p) => p.ref).join(', ') : ''}`);
  ck(all.filter(sellable).length === 0, 'nothing is sellable yet, so nothing may be quoted off this map');
  ck(typeof TANDEM.positionsNote === 'string' && /not sourced/i.test(TANDEM.positionsNote),
    'the tandem bank records WHY its crypt count is blank rather than guessing one');

  // The status vocabulary is defined and unused — and every entry is a pattern, never a
  // hue, so the later load inherits the house rule instead of reinventing it.
  const hues = Object.entries(STATUS_STYLE).filter(([, s]) => !s.pattern || /#|rgb|hsl/.test(s.pattern));
  ck(Object.keys(STATUS_STYLE).length >= 4 && hues.length === 0,
    `${Object.keys(STATUS_STYLE).length} statuses defined, every one coded by pattern not hue${hues.length ? ' — ' + hues.map(([k]) => k).join(', ') : ''}`);
}
if (failures) { console.log(`\nRESULT: ${failures} FAILURE(S) — the page cannot be built from this data`); process.exit(1); }

// ── 1. The dataset vs the source drawing ─────────────────────────────────────
console.log('\nBank numbering and labels vs the source overview');
{
  ck(MIS_WEST_BANKS[0] === SRC_WEST[0] && MIS_WEST_BANKS[1] === SRC_WEST[1],
    `west wing is numbered ${SRC_WEST[0]}–${SRC_WEST[1]} (got ${MIS_WEST_BANKS.join('–')})`);
  ck(MIS_EAST_BANKS[0] === SRC_EAST[0] && MIS_EAST_BANKS[1] === SRC_EAST[1],
    `east wing is numbered ${SRC_EAST[0]}–${SRC_EAST[1]} (got ${MIS_EAST_BANKS.join('–')})`);
  ck(EAST_BOUND_APPROX === true,
    'the dataset records that the east wing\'s upper bound is approximate in the source, not measured');
  const [W, E] = WINGS;
  ck(W.banks.length === SRC_WEST[1] - SRC_WEST[0] + 1, `west wing carries ${SRC_WEST[1] - SRC_WEST[0] + 1} banks (${W.banks.length})`);
  ck(E.banks.length === SRC_EAST[1] - SRC_EAST[0] + 1, `east wing carries ${SRC_EAST[1] - SRC_EAST[0] + 1} banks (${E.banks.length})`);
  const gapW = W.banks.map((b) => b.n).join() !== W.numbers.join();
  const gapE = E.banks.map((b) => b.n).join() !== E.numbers.join();
  ck(!gapW && !gapE, 'both wings are numbered consecutively with no gap and no repeat');
  ck(CRYPT_KINDS.length === SRC_KINDS.length && CRYPT_KINDS.every((k, i) => k === SRC_KINDS[i]),
    `the banks offer ${SRC_KINDS.join(' / ')} crypts (got ${CRYPT_KINDS.join(' / ')})`);
  ck(MIS_FAMILY_ROOMS.length === 2 && MIS_FAMILY_ROOMS.every((r, i) => r === SRC_ROOMS[i]),
    `${SRC_ROOMS.join(' and ')} are named as the drawing names them`);
  for (const label of SRC_STRUCTURES) {
    ck(STRUCTURES.some((s) => s.label === label), `the plan carries a "${label}" structure`);
  }
  ck(STRUCTURES.every((s) => s.price === undefined && s.status === undefined),
    'no inert structure carries a price or a status field at all');
  ck(ROOFS.length === WINGS.length, `a covered walkway is drawn in front of each of the ${WINGS.length} wings (${ROOFS.length})`);
}

// ── 2. Layout — footprints in plan ───────────────────────────────────────────
// A plan whose pieces overlap or spill outside the building is a plan that will be read
// as fact and is wrong. This is the same 2-D footprint test the Memorial Path gate runs.
console.log('\nLayout — footprints in plan');
{
  const rect = (o) => ({ x0: o.x - o.w / 2, x1: o.x + o.w / 2, y0: o.y - o.d / 2, y1: o.y + o.d / 2 });
  const hits = (a, b) => a.x0 < b.x1 - 1e-9 && b.x0 < a.x1 - 1e-9 && a.y0 < b.y1 - 1e-9 && b.y0 < a.y1 - 1e-9;
  const named = [
    ...WINGS.flatMap((w) => w.banks).map((b) => ({ id: b.ref, r: rect(b) })),
    { id: TANDEM.ref, r: rect(TANDEM) },
    ...STRUCTURES.filter((s) => s.kind !== 'join').map((s) => ({ id: s.id, r: rect(s) })),
    { id: 'courtyard', r: rect(COURTYARD) },
  ];
  const clash = [];
  for (let i = 0; i < named.length; i++) {
    for (let j = i + 1; j < named.length; j++) if (hits(named[i].r, named[j].r)) clash.push(`${named[i].id}/${named[j].id}`);
  }
  ck(clash.length === 0, `no two of the ${named.length} drawn pieces overlap in plan${clash.length ? ' — ' + clash.slice(0, 6).join(', ') : ''}`);

  const half = { x: SITE.w / 2, y: SITE.d / 2 };
  const out = named.filter((o) => o.r.x0 < -half.x - 1e-9 || o.r.x1 > half.x + 1e-9 || o.r.y0 < -half.y - 1e-9 || o.r.y1 > half.y + 1e-9);
  ck(out.length === 0, `everything stands inside the ${SITE.w}×${SITE.d} ft footprint${out.length ? ' — outside: ' + out.map((o) => o.id).join(', ') : ''}`);

  // The wings run along the NORTH face, the tandem bank along the SOUTH edge, and the
  // courtyard sits between them. If that ordering ever inverts, the map is mirrored.
  const wingMax = Math.max(...WINGS.flatMap((w) => w.banks).map((b) => b.y + b.d / 2));
  const courtR = rect(COURTYARD);
  const tandemR = rect(TANDEM);
  ck(wingMax < courtR.y0 && courtR.y1 < tandemR.y0,
    `north to south the plan reads wings (${wingMax.toFixed(0)}) → courtyard (${courtR.y0}..${courtR.y1}) → tandem bank (${tandemR.y0})`);
  ck(rect(STRUCTURES.find((s) => s.id === 'ossuary')).x0 > courtR.x1,
    'the ossuary stands EAST of the courtyard, where the source drawing puts it');
  ck(STRUCTURES.find((s) => s.id === 'join').x < 0 && STRUCTURES.find((s) => s.id === 'entrance').x > 0,
    'the neighbouring mausoleum joins on the west and the entrance is on the east');
  ck(Math.abs(STRUCTURES.find((s) => s.id === 'water').x) < 1e-9 &&
     STRUCTURES.find((s) => s.id === 'room-1').x < 0 && STRUCTURES.find((s) => s.id === 'room-2').x > 0,
  'the water feature sits centred BETWEEN the two family rooms');
  ck(GEO.roofD > 0 && ROOFS.every((r) => r.y > GEO.wingY),
    'the covered walkway is drawn on the courtyard side of each wing');
}
if (failures) { console.log(`\nRESULT: ${failures} FAILURE(S) — the page cannot be built from this data`); process.exit(1); }

// ── 3. Build determinism ─────────────────────────────────────────────────────
console.log('\nBuild determinism');
{
  const before = fs.readFileSync(ABS);
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'build_tg_maus_map.mjs')], { cwd: ROOT, stdio: 'pipe' });
  const after = fs.readFileSync(ABS);
  ck(before.equals(after), `rebuilding from the dataset reproduces ${REL} byte for byte (${after.length} bytes)`);
}
const src = fs.readFileSync(ABS, 'utf8');
ck(/Generated by scripts\/build_tg_maus_map\.mjs/.test(src), 'the page declares its generator and says not to hand-edit');

// ── 4. Parse the page back out ───────────────────────────────────────────────
function parseButtons(cls) {
  const out = [];
  const re = new RegExp(`<button[^>]*class="${cls}[^"]*"[^>]*>[\\s\\S]*?</button>`, 'g');
  for (const m of src.matchAll(re)) {
    const html = m[0];
    const tag = html.slice(0, html.indexOf('>') + 1);
    const at = (k) => { const r = new RegExp(`data-${k}="([^"]*)"`).exec(tag); return r ? r[1] : null; };
    if (at('ref') === null) continue;
    out.push({ ref: at('ref'), wing: at('wing'), n: at('n'), kind: at('kind'), price: at('price'), status: at('status'), html });
  }
  return out;
}
const planBtns = parseButtons('bk');
const listBtns = parseButtons('lrow');
const hitBtns = parseButtons('hit');

console.log('\nThe page renders the dataset');
{
  const want = allPositions().map((p) => p.ref).sort();
  for (const [name, list] of [['site plan', planBtns], ['bank list', listBtns], ['3D view', hitBtns]]) {
    const got = [...new Set(list.map((c) => c.ref))].sort();
    ck(got.length === want.length && got.every((r, i) => r === want[i]),
      `${name.padEnd(9)} renders all ${want.length} selectable positions (${got.length})`);
  }
  const banks = WINGS.flatMap((w) => w.banks);
  const wrong = planBtns.filter((c) => c.kind === 'bank').filter((c) => {
    const b = banks.find((x) => x.ref === c.ref);
    return !b || +c.n !== b.n || c.wing !== b.wing;
  });
  ck(wrong.length === 0, `every plan bank carries the dataset's wing and number${wrong.length ? ' — ' + wrong.map((c) => c.ref).join(', ') : ''}`);
  const numbers = planBtns.filter((c) => c.kind === 'bank').map((c) => /<span class="bkn">(\d+)<\/span>/.exec(c.html)?.[1]);
  ck(numbers.every((v, i) => v === planBtns.filter((c) => c.kind === 'bank')[i].n),
    'and prints that same number in the plan, so the drawn label cannot drift from the reference');
  ck(planBtns.some((c) => c.ref === TANDEM.ref && /TANDEM CRYPTS/.test(c.html) && /head to head/.test(c.html)),
    'the tandem bank is drawn and labelled head to head');
  // Every wing label a counselor reads on the plan.
  ck(/WEST WING\s*&nbsp;·&nbsp;\s*1&ndash;13/.test(src) && /EAST WING\s*&nbsp;·&nbsp;\s*14&ndash;28/.test(src),
    'the plan prints both wing labels with their number ranges');
  for (const label of SRC_STRUCTURES.concat(MIS_FAMILY_ROOMS)) {
    ck(src.includes(label), `the plan prints "${label}"`);
  }
}

// ── 5. THE SAFETY GATE: no number is rendered anywhere ───────────────────────
// This is the whole promise of a geometry-first ship. A dollar figure, a status word or
// an inventory count on this page would be a figure nobody sourced.
console.log('\nNo price, no status, no count is rendered');
{
  const rendered = stripUnrendered(src);
  const dollars = [...rendered.matchAll(/\$\s?[\d,]+(?:\.\d+)?/g)].map((m) => m[0]);
  ck(dollars.length === 0, `zero dollar figures on the page${dollars.length ? ' — ' + dollars.slice(0, 6).join(', ') : ''}`);
  const rounded = [...rendered.matchAll(/\$\d+(?:\.\d+)?K\b/gi)].map((m) => m[0]);
  ck(rounded.length === 0, `no rounded price labels either${rounded.length ? ' — ' + rounded.join(', ') : ''}`);
  // Every selectable position's data-price and data-status are present AND empty. Present,
  // because a dropped attribute and an empty one must not look the same; empty, because
  // nothing is sourced.
  const armed = [...planBtns, ...listBtns, ...hitBtns].filter((c) => c.price !== '' || c.status !== '');
  ck(armed.length === 0, `all ${planBtns.length + listBtns.length + hitBtns.length} rendered positions carry empty price and status slots${armed.length ? ' — armed: ' + armed.slice(0, 5).map((c) => c.ref).join(', ') : ''}`);
  const missing = [...planBtns, ...listBtns, ...hitBtns].filter((c) => c.price === null || c.status === null);
  ck(missing.length === 0, `and none of them is MISSING those slots${missing.length ? ' — ' + missing.slice(0, 5).map((c) => c.ref).join(', ') : ''}`);
  // No status word may render, in any casing, anywhere a reader could see it. "not
  // priced" is deliberately NOT on this list: the ossuary line says "not priced here",
  // which is the opposite of a status claim — it is the page refusing to make one.
  const statusWords = ['available', 'reserved', 'occupied', 'sold'];
  const leaked = statusWords.filter((w) => new RegExp(`\\b${w}\\b`, 'i').test(rendered.replace(/availability/gi, '')));
  ck(leaked.length === 0, `no status word renders${leaked.length ? ' — ' + leaked.join(', ') : ` (${statusWords.length} checked)`}`);
  // The card runtime cannot print a figure: it never reads data-price at all. Comments
  // are stripped first — this file's own commentary explains why the attribute is unread,
  // and a gate that trips on the explanation teaches people to delete the explanation.
  const js = stripUnrendered(src.slice(src.lastIndexOf('<script>')));
  ck(!/data-price/.test(js) && !/toLocaleString/.test(js),
    'the detail card runtime never reads a price and has no money formatter');
  ck(new RegExp(ASK.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/’/g, '\\u2019|’')).test(src) || src.includes(ASK),
    `every card falls back to the ask wording: "${ASK}"`);
  ck((src.match(new RegExp(ASK_CHIP, 'g')) || []).length >= 3,
    `the "${ASK_CHIP}" chip appears on the plan, the list and the header sub-line`);
}

// ── 6. THE CROSS-LINK, BOTH DIRECTIONS ───────────────────────────────────────
// The operator's explicit requirement. A one-way link is half a feature: a counselor who
// lands on the Memorial Path map has no way back to the building around it.
console.log('\nCross-link with the Memorial Path map');
{
  ck(fs.existsSync(TGMP_ABS), `${TGMP_REL} exists to link to`);
  const nav = new RegExp(`<a class="path-btn no-print" href="${COURTYARD.href}">`).test(src);
  ck(nav, 'a persistent header button opens the Memorial Path map');
  const zone = /<a class="court" href="TGMP_Map\.html"[^>]*aria-label="Open the Terrace Garden Memorial Path map"/.test(src);
  ck(zone, 'and the courtyard itself is a link zone into the same map');
  ck(/<span class="courtt">Terrace Garden Memorial Path<\/span>/.test(src),
    'the link zone is named, so a reader knows what the courtyard is before clicking it');
  ck((src.match(/href="TGMP_Map\.html"/g) || []).length >= 3,
    `the page links to the path map from the header, the courtyard and the footer (${(src.match(/href="TGMP_Map\.html"/g) || []).length} links)`);
  // The click handler must not swallow the courtyard link on its way to opening a card.
  const js = src.slice(src.lastIndexOf('<script>'));
  ck(/if \(ev\.target\.closest\('\.court'\)\) return;/.test(js),
    'the card click handler lets the courtyard link navigate');

  // THE RECIPROCAL ANCHOR on the Memorial Path map. Smallest possible diff on that page.
  const tgmp = fs.readFileSync(TGMP_ABS, 'utf8');
  ck(/href="TG_Mausoleum_Map\.html"/.test(tgmp),
    `${TGMP_REL} carries an anchor back to this map`);
  ck(/class="path-btn no-print" href="TG_Mausoleum_Map\.html"/.test(tgmp),
    'and it is the same header affordance, not a stray inline link');
}

// ── 7. Sourcing honesty ──────────────────────────────────────────────────────
console.log('\nSourcing honesty');
{
  ck(/layout estimated from photographs/i.test(src), 'the header says the layout is estimated from photographs');
  ck(/Bank positions and sizes are approximate/.test(src), 'and the footer repeats it for the bank positions');
  ck(/It shows no prices and no availability/.test(src), 'the footer states outright that no prices are shown');
  ck(/not priced here/.test(src) && /Terrace Garden Ossuary/.test(src),
    'the ossuary is named and explicitly not priced here');
  const ossArmed = [...planBtns, ...listBtns].some((c) => /ossuary/i.test(c.html));
  ck(!ossArmed, 'and the ossuary is inert — it is not one of the selectable positions');
  ck(/Availability and pricing are kept current against cemetery records/.test(src),
    'provenance is stated in the one permitted family-facing sentence');
  ck(!/\.jpe?g|\.png|data:image\/(?:png|jpe?g)/i.test(src),
    'the page embeds no photograph (the source footage shows inscribed crypt fronts)');
}

// ── 8. THERE IS NO POOL ──────────────────────────────────────────────────────
// The source drawing still shows a large pool in the middle of this courtyard. There is
// none: the Memorial Path replaced it (operator, 2026-07-31; confirmed again in the
// 2026-08-03 footage). Rebuilding it here would contradict the sibling map, which has
// its own assertion saying the same thing.
console.log('\nNo pool — the path replaced it');
{
  const geoKeys = Object.keys(GEO).filter((k) => /pool|water(?!F)|spout|coping/i.test(k));
  ck(geoKeys.length === 0, `the geometry carries no pool, spout or coping${geoKeys.length ? ' — ' + geoKeys.join(', ') : ` (${Object.keys(GEO).length} keys, none of them)`}`);
  ck(!STRUCTURES.some((s) => /pool/i.test(s.label) || /pool/i.test(s.id)), 'and no structure is a pool');
  const pools = [...src.matchAll(/[^<>]{0,40}pool[^<>]{0,40}/gi)].map((m) => m[0].trim());
  const bad = pools.filter((s) => !/no reflection pool/i.test(s));
  ck(bad.length === 0, `the word "pool" appears only in the sentence saying there is none${bad.length ? ' — ' + bad.slice(0, 3).join(' | ') : ` (${pools.length} occurrence${pools.length === 1 ? '' : 's'})`}`);
  ck(/There is no reflection pool/.test(src), 'and the footer states it outright');
}

// ── 9. Inert context stays inert ─────────────────────────────────────────────
console.log('\nContext stays context');
{
  const ctx = [...src.matchAll(/<div class="ctx[^"]*"[^>]*>/g)].map((m) => m[0]);
  const armed = ctx.filter((t) => /data-ref=|data-price=|<button/.test(t));
  ck(ctx.length === STRUCTURES.length + ROOFS.length,
    `${STRUCTURES.length} structures + ${ROOFS.length} walkways = ${STRUCTURES.length + ROOFS.length} inert context blocks (got ${ctx.length})`);
  ck(armed.length === 0, `none of them carries a reference or a price${armed.length ? ' — armed: ' + armed.length : ''}`);
  ck(ctx.every((t) => /aria-hidden="true"/.test(t)),
    'and none of them is announced to a screen reader as if it were selectable');
}

// ── 10. Print path ───────────────────────────────────────────────────────────
console.log('\nPrint path');
{
  ck(/id="view-plan"/.test(src) && /id="view-banks"/.test(src), 'both views exist as static HTML');
  ck(/\.wview\{display:block!important/.test(src), 'the print stylesheet reveals them without JS');
  ck(/body\.pv-one \.wview\.active\{display:block!important/.test(src), 'print scope follows the active tab');
  ck(/\.bk\.sel\{outline:4px solid #c8540a/.test(src), 'a selected bank prints with the highlight ring');
  const scripts = (src.match(/<script/g) || []).length;
  ck(scripts === 1, `page has ${scripts} <script> block(s); none is needed to render the flat views`);
}

// ── 11. House rules ──────────────────────────────────────────────────────────
console.log('\nHouse rules');
ck(/class="back-btn no-print" href="\.\.\/"/.test(src), '"← Quote Tool" back button in the header');
{
  const js = src.slice(src.lastIndexOf('<script>'));
  ck(/function visibleTwin\(el\)/.test(js), 'the card places itself against a rendering that is actually laid out');
  ck(/if \(!t\) \{ card\.style\.left/.test(js), 'and parks in its default corner when no rendering of the pinned position is visible');
  ck(/'use strict'/.test(js), 'the page runtime is strict mode');
}

// ── 12. THE 3D VIEW ──────────────────────────────────────────────────────────
// The 3D view must be a rendering of the SAME dataset the plan renders — not a second,
// hand-tuned model that agrees with it today and drifts tomorrow. So the check is 1:1
// and it is on the exact transform strings: a block whose height, position or footprint
// was nudged in the page rather than in the dataset fails here.
const PPF = 3.4;
const gpx = (v) => +(v * PPF).toFixed(2);
const BLOCKS = blocks3d();

console.log('\nThe 3D view renders the same dataset, 1:1');
{
  const slabTops = [...src.matchAll(/<div class="face top ([^"]*)" data-blk="([^"]*)"/g)].map((m) => ({ cls: m[1], id: m[2] }));
  const wantIds = BLOCKS.map((b) => b.id).sort();
  const gotIds = slabTops.map((s) => s.id).sort();
  ck(gotIds.length === wantIds.length && gotIds.every((v, i) => v === wantIds[i]),
    `every one of the ${wantIds.length} blocks has exactly one 3D slab, and there are no extras (${gotIds.length})`);
  const sides = (src.match(/<div class="face side /g) || []).length;
  ck(sides === BLOCKS.length * 4, `every slab is closed on four sides (${sides} side faces, need ${BLOCKS.length * 4})`);

  // THE 1:1 CHECK. Recompute each block's top-face transform here, from the dataset,
  // and require the page to contain that exact string.
  const wrong = BLOCKS.filter((b) => !src.includes(
    `translate(-50%,-50%) translate3d(${gpx(b.x)}px,${gpx(-b.top)}px,${gpx(b.y)}px) rotateX(90deg)`));
  ck(wrong.length === 0,
    `every block stands at the dataset's own x, y and height${wrong.length ? ' — off: ' + wrong.slice(0, 5).map((b) => b.id).join(', ') : ` (${BLOCKS.length} transforms recomputed and matched)`}`);

  // Selectable is selectable, inert is inert — in the 3D view too. A family room or the
  // ossuary rendered as a button would look purchasable in the one view that looks real.
  const wantSel = BLOCKS.filter((b) => b.sel).map((b) => b.ref).sort();
  const gotSel = hitBtns.map((c) => c.ref).sort();
  ck(gotSel.length === wantSel.length && gotSel.every((v, i) => v === wantSel[i]),
    `exactly the ${wantSel.length} selectable positions are buttons in the 3D scene (${gotSel.length})`);
  const inertIds = BLOCKS.filter((b) => !b.sel).map((b) => b.id);
  const inertArmed = inertIds.filter((id) => new RegExp(`<(?:button|a)[^>]*data-blk="${id}"`).test(src));
  ck(inertArmed.length === 0,
    `the ${inertIds.length} inert blocks (family rooms, ossuary, entrance, walkways, the joining wall) are not selectable${inertArmed.length ? ' — armed: ' + inertArmed.join(', ') : ''}`);

  // The number drawn on a bank's top face is the DATASET's number, not a re-derived one.
  const drawn = [...src.matchAll(/data-blk="(TGM-[WE]-\d+)"[^>]*><span class="slabl slabn">(\d+)<\/span>/g)]
    .map((m) => ({ ref: m[1], n: +m[2] }));
  const banks = WINGS.flatMap((w) => w.banks);
  ck(drawn.length === banks.length && drawn.every((d) => banks.find((b) => b.ref === d.ref)?.n === d.n),
    `all ${banks.length} banks print their own number on the 3D slab (${drawn.length} matched)`);

  // Tap targets: a hit must have a real footprint, or the block is unclickable however
  // good it looks. Recomputed the same way as the slab.
  const noTarget = BLOCKS.filter((b) => b.sel).filter((b) => !src.includes(
    `translate(-50%,-50%) translate3d(${gpx(b.x)}px,${gpx(-b.top - 0.25)}px,${gpx(b.y)}px) rotateX(90deg)`));
  ck(noTarget.length === 0,
    `every selectable block carries a tap target floating just above its own top face${noTarget.length ? ' — ' + noTarget.map((b) => b.ref).join(', ') : ''}`);
}

console.log('\nThe courtyard is a link zone in the 3D view too');
{
  ck(/<a class="hit h-court" href="TGMP_Map\.html"/.test(src),
    'the courtyard floor carries a click-through link zone inside the 3D scene');
  ck((src.match(/<a class="hit h-court"/g) || []).length === 1, 'exactly one of them');
  ck(/<span class="hitl"><b>Terrace Garden Memorial Path<\/b>/.test(src),
    'and it is named, so a reader knows what the courtyard is before tapping it');
  ck((src.match(/href="TGMP_Map\.html"/g) || []).length >= 4,
    `the page now links to the path map from the header, the courtyard IN BOTH VIEWS and the footer (${(src.match(/href="TGMP_Map\.html"/g) || []).length} links)`);
  const js = src.slice(src.lastIndexOf('<script>'));
  ck(/if \(ev\.target\.closest\('a\[href\]'\)\) return;/.test(js),
    'the card click handler never intercepts a link');
  ck(/if \(tap && downHref\)/.test(js),
    'and a TAP on it navigates despite the scene swallowing the click that follows a gesture');
  // The courtyard floor plate itself must stay inert: it is scenery, the anchor on top of
  // it is the affordance.
  ck(/<div class="face court c-high" aria-hidden="true"/.test(src),
    'the courtyard floor plate itself is scenery and is not announced as selectable');
}

console.log('\nHeights are sourced, marked, and never printed');
{
  ck(ELEV.plinth > 0 && COURTYARD.drop === ELEV.plinth,
    `the courtyard floor sits one step below the walkway, as the footage shows (drop ${COURTYARD.drop})`);
  const bad = BLOCKS.filter((b) => !(typeof b.h === 'number' && b.h > 0) || !(typeof b.top === 'number' && b.top >= b.h));
  ck(bad.length === 0, `every block has a positive height and a top at or above it${bad.length ? ' — ' + bad.map((b) => b.id).join(', ') : ` (${BLOCKS.length} blocks)`}`);
  ck(ROOFS.every((r) => r.top > ELEV.wingH),
    'the covered walkway floats ABOVE the crypt banks — it is the building’s own overhanging eave, not a block on the ground');
  const conf = BLOCKS.filter((b) => !['high', 'medium', 'low'].includes(b.conf));
  ck(conf.length === 0, `every block records how sure we are of its height${conf.length ? ' — ' + conf.map((b) => b.id).join(', ') : ''}`);
  // The three things the walk-through could not settle must SAY they could not.
  ck(TANDEM.conf === 'low', 'the tandem bank is marked low — the footage never walks it end to end');
  ck(STRUCTURES.find((s) => s.id === 'ossuary').conf === 'low',
    'the ossuary is marked low — nothing on site identifies it, and its very existence is unresolved');
  ck(STRUCTURES.find((s) => s.id === 'water').conf === 'low', 'and so is the water feature, which was never seen');
  ck(ROOFS.every((r) => r.conf === 'high'), 'the overhanging walkway roof is marked high — it is the clearest thing in the footage');
  // NOT ONE of these numbers may reach the reader. They feed a transform; a rendered
  // figure would be a measurement nobody took.
  const rendered = stripUnrendered(src);
  // Word units are scanned over EVERYTHING a browser could show, attribute values
  // included. The inch mark is scanned only over tag-stripped text: every attribute in
  // this page ends in a double quote right after a number of pixels, so scanning `"`
  // across the raw source flags `width:56.42px"` and reports four dimensions on a page
  // that prints none — a gate that cries wolf gets waved off, which is worse than no gate.
  const dims = [...rendered.matchAll(/\d+(?:\.\d+)?\s*(?:ft\b|feet\b|foot\b|inch(?:es)?\b|yards?\b)/gi)].map((m) => m[0]);
  const textOnly = rendered.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]*>/g, ' ');
  const marks = [...textOnly.matchAll(/\d+(?:\.\d+)?\s*(?:&quot;|″|&#8243;)/g)].map((m) => m[0]);
  ck(dims.length === 0 && marks.length === 0,
    `no height or dimension is printed anywhere${dims.length || marks.length ? ' — ' + [...dims, ...marks].slice(0, 4).join(', ') : ''}`);
  ck(/Heights are estimated from our own walk-through/.test(src),
    'and the page says on its face that the heights are estimated, not measured');
  ck(/nothing here is to scale/i.test(src), 'and that nothing in the 3D view is to scale');
  for (const k of ['bank', 'roof']) {
    ck(src.includes(MATERIAL[k]), `the page states what a ${k} is made of, in the words the footage supports`);
  }
  ck(Object.keys(CONF_LABEL).length === 3, 'the confidence vocabulary is defined in one place');
}

console.log('\nConfidence is a PATTERN, never a hue');
{
  // Hue is spent on what a block IS. A second code sharing that channel is how a reader
  // learns to trust neither — the same rule the plan applies to status.
  ck(/\.c-medium::after,\.c-low::after\{content:'';position:absolute/.test(src),
    'the hatch is an overlay pseudo-element, so it cannot replace the kind hue');
  ck(!/\.c-(?:medium|low)\{background-image:/.test(src),
    'confidence never sets background-image directly (that would wipe the kind hue)');
  ck(!/\.c-medium,\.c-low\{position:/.test(src),
    'and never sets position on the block (that would drop the scene out of absolute layout)');
  for (const c of ['high', 'medium', 'low']) {
    const n = BLOCKS.filter((b) => b.conf === c).length;
    if (n) ck(src.includes(` c-${c}`), `the ${c}-confidence class reaches the page (${n} blocks)`);
  }
  ck(/Hatched = height estimated/.test(src), 'the legend explains what the hatch means');
  // Kind hue: one class per kind, and no kind may borrow a status class name.
  for (const k of [...new Set(BLOCKS.map((b) => b.kind))]) {
    ck(new RegExp(`\\.k-${k}\\{background`).test(src), `the ${k} hue is defined`);
  }
  ck(!/\bclass="[^"]*\b(?:st|k)-(?:available|occupied|reserved|sold|unpriced)\b/.test(src),
    'no block carries a status class — nothing on this page has a status');
}

console.log('\nMovement runtime and the interaction scars');
{
  const js = src.slice(src.lastIndexOf('<script>'));
  for (const [tok, what] of MOVEMENT_TOKENS) ck(js.indexOf(tok) > -1, what);
  const keys = ['yaw', 'pitch', 'zoom', 'lift'];
  const m = /var CAM_KEYS = (\[[^\]]*\])/.exec(js);
  ck(!!m && JSON.stringify(JSON.parse(m[1])) === JSON.stringify(keys),
    `an eased transition carries the WHOLE camera: ${keys.join(', ')}` + (m ? ` (page: ${m[1]})` : ' — CAM_KEYS not found'));
  ck(/moved <= 8/.test(js), 'the tap detector keys off POINTER TRAVEL (moved <= 8)');
  ck(/performance\.now\(\) - downAt < 700/.test(js), 'and off how long the finger was down (< 700 ms)');
  ck(/suppressUntil = performance\.now\(\) \+ 450;/.test(js),
    'the click-suppression window is a flat 450 ms and is not tied to camera motion');
  ck(!/suppressUntil[^;]*(vYaw|vPitch|glideRaf|camT)/.test(js), 'nothing about the glide can extend it');
  ck(/releaseGesture\(moved\);/.test(js), 'the release reads pointer travel and nothing else');
  // DEFERRED CAPTURE. Capturing on pointerdown retargets the click to the scene and a tap
  // on a bank never reaches its button — the bug the sibling niche pages shipped once.
  ck(/if \(moved > 8\) capturePts\(\);/.test(js), 'pointer capture is DEFERRED until a real drag');
  ck(!/pointerdown[\s\S]{0,400}setPointerCapture/.test(js), 'and is never taken on pointerdown itself');
  // SYNTHETIC HOVER. A drag or a coasting camera slides blocks under a stationary pointer
  // and the browser fires mouseover for each one.
  ck(/if \(last \|\| glideRaf\) return;/.test(js), 'the hover card is frozen while dragging or coasting');
  ck(/\.scene\.dragging \.hit:hover\{background:transparent!important/.test(src),
    'and the hover highlight is frozen mid-drag in CSS too');
}

console.log('\nThe plan and the list are untouched by the 3D view');
{
  ck(/<div class="wview" id="view-plan">/.test(src) && /<div class="wview" id="view-banks">/.test(src),
    'both flat views are still static HTML in the page');
  ck(/<div class="view3d active" id="view-3d">/.test(src), 'and the 3D view is the tab that opens first');
  ck(/\.no-print,\.tabs,\.card,\.toolbar,\.view3d,\.hint,\.modelnote,\.legend3d\{display:none!important/.test(src),
    'the 3D view, its toolbar and its notes are all hidden in print — the plan and the list are the print path');
  ck(/showView\('3d'\);/.test(src), 'the runtime opens on the 3D view');
  const tabs = (src.match(/<button class="tab[^"]*" data-view="/g) || []).length;
  ck(tabs === 3, `three tabs: 3D View, Site Plan, Crypt Banks (${tabs})`);
}

// ── ZERO INTERNAL REGISTER ───────────────────────────────────────────────────
console.log('\nFamily-facing wording');
assertFamilyRegister((c, m) => (c ? pass : fail)(m), 'TG_Mausoleum_Map.html', src);

// ── Sabotage: every mutation below must make this gate exit 1 ────────────────
// A gate that has never been made to fail is a gate nobody has tested. Each mutation is
// applied to a source, the page is rebuilt, this gate is re-run as a child, and the
// source is restored — including on a throw. The final line proves the tree is green
// again, so a sabotage run cannot leave the repo dirty.
//
// EVERY multi-line needle matches with \r?\n. These sources are CRLF; a literal '\n'
// silently matches nothing, and a mutation that does not apply proves nothing while
// still looking like a test. runSet reports a no-op mutation as a FAIL.
if (process.argv.includes('--sabotage')) {
  const DATA = path.join(ROOT, 'scripts', 'tg-maus-data.mjs');
  const BUILD = path.join(ROOT, 'scripts', 'build_tg_maus_map.mjs');
  const child = (args) => execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  const self = fileURLToPath(import.meta.url);
  let sabFail = 0;

  const runSet = (file, origSrc, list) => {
    try {
      for (const [label, mut] of list) {
        const mutated = mut(origSrc);
        if (mutated === origSrc) { console.log('  FAIL  mutation did not apply: ' + label); sabFail++; continue; }
        fs.writeFileSync(file, mutated, 'utf8');
        let code = 0;
        try { child([BUILD]); child([self]); } catch (e) { code = e.status ?? 1; }
        if (code === 1) pass(`${label} -> exit ${code}`);
        else { sabFail++; console.log(`  FAIL  ${label} -> exit ${code} (expected 1)`); }
        fs.writeFileSync(file, origSrc, 'utf8');
      }
    } finally {
      fs.writeFileSync(file, origSrc, 'utf8');
      child([BUILD]);
    }
  };

  console.log('\nMutations of the dataset (each must make this gate exit 1)');
  const origData = fs.readFileSync(DATA, 'utf8');
  runSet(DATA, origData, [
    ['a price introduced on a bank that has no price source',
      (s) => s.replace(/ {6}price: null,\r?\n {6}status: null,/, '      price: 8995,\n      status: null,')],
    ['a status invented for a bank',
      (s) => s.replace(/ {6}price: null,\r?\n {6}status: null,/, '      price: null,\n      status: \'available\',')],
    ['an inventory count guessed for a bank the drawing does not number',
      (s) => s.replace(/ {6}positions: null, {3}\/\/ how many crypts/, '      positions: 24,   // how many crypts')],
    ['the east wing widened past what the source drawing prints',
      (s) => s.replace('export const MIS_EAST_BANKS = [14, 28];', 'export const MIS_EAST_BANKS = [14, 30];')],
    ['a bank height zeroed, so the 3D view draws a flat plate and calls it a wall',
      (s) => s.replace('  wingH: 13,', '  wingH: 0,')],
    ['the walkway roof dropped BELOW the banks, contradicting the overhang in the footage',
      (s) => s.replace('  roofH: 15.5,', '  roofH: 6,')],
    ['the courtyard step removed, so the terraced court reads as flat ground',
      (s) => s.replace('  plinth: 1.5,', '  plinth: 0,')],
    ['the ossuary’s unresolved placement upgraded to a confirmed one',
      (s) => s.replace("h: ELEV.ossH, conf: 'low', material: MATERIAL.ossuary,", "h: ELEV.ossH, conf: 'high', material: MATERIAL.ossuary,")],
    ['the tandem bank’s unseen height upgraded to a confirmed one',
      (s) => s.replace(/ {2}conf: 'low',\r?\n {2}material: MATERIAL\.tandem,/, "  conf: 'high',\n  material: MATERIAL.tandem,")],
    ['the courtyard link pointed away from the Memorial Path map',
      (s) => s.replace("href: 'TGMP_Map.html',", "href: 'TGMP_Map.htm',")],
    ['the status vocabulary deleted as unused, so the next load re-invents it',
      (s) => s.replace(/export const STATUS_STYLE = \{[\s\S]*?\n\};/, 'export const STATUS_STYLE = {};')],
    ['a whole bank deleted from a wing',
      (s) => s.replace('export const MIS_WEST_BANKS = [1, 13];', 'export const MIS_WEST_BANKS = [1, 12];')],
  ]);

  console.log('\nMutations of the generator (the 3D assertions must have teeth)');
  const origBuild = fs.readFileSync(BUILD, 'utf8');
  runSet(BUILD, origBuild, [
    ['a family room rendered as a selectable block in the 3D view',
      (s) => s.replace('  if (!b.sel) return \'\';', '  if (false) return \'\';')],
    ['the 3D courtyard link zone downgraded to a plain block that cannot navigate',
      (s) => s.replace('<a class="hit h-court" href="${esc(COURTYARD.href)}"', '<div class="hit h-court" data-was="${esc(COURTYARD.href)}"')],
    ['a dollar figure put on the detail card',
      (s) => s.replace("'<div class=\"cardkinds\">' + KINDS.join(' &middot; ') + ' crypts</div>' +",
        "'<div class=\"cardkinds\">$8,995</div>' +")],
    ['the empty price and status slots dropped from the 3D tap targets',
      (s) => s.replace(/ data-price="" data-status=""` \+(\r?\n) {4}` style="width:\$\{px\(b\.w\)\}px/, '` +$1    ` style="width:${px(b.w)}px')],
    ['the shared movement runtime dropped, reverting to cut transitions and no inertia',
      (s) => s.replace("${movementRuntime({ keys: ['yaw', 'pitch', 'zoom', 'lift'] })}", 'function stopGlide(){} function easeThrough(f){f();} function kick(){} function orbitBy(){} function releaseGesture(){} var KICK_GAIN=1, glideRaf=0;')],
    ['pointer capture taken on pointerdown, so a tap on a bank never reaches its button',
      (s) => s.replace('  if (moved > 8) capturePts();', '  capturePts();')],
    ['the synthetic-hover guard removed, so the card flickers across the building mid-drag',
      (s) => s.replace(/ {2}if \(last \|\| glideRaf\) return;\r?\n/, '')],
    ['the confidence hatch reverted to background-image, wiping the kind hue',
      (s) => s.replace(/ {2}\.c-medium::after,\.c-low::after\{content:'';position:absolute;inset:0;pointer-events:none;border-radius:inherit;\}(\r?\n) {2}\.c-medium::after\{background:/,
        '  .c-medium{background-image:repeating-linear-gradient(135deg,rgba(255,255,255,.32) 0 2px,rgba(255,255,255,0) 2px 6px);}$1  .c-mediumX::after{background:')],
    ['a height printed on the page as if it had been measured',
      (s) => s.replace('the shapes are simplified', 'each bank stands 13 ft tall')],
    ['the 3D view left visible in print, where it renders as a pile of flat rectangles',
      (s) => s.replace('.no-print,.tabs,.card,.toolbar,.view3d,.hint,.modelnote,.legend3d{display:none!important;}',
        '.no-print,.tabs,.card{display:none!important;}')],
    ['the printable plan dropped, so a printout omits every bank',
      (s) => s.replace(/\$\{plan\(\)\}\r?\n/, '')],
    ['an internal register word put back into the page copy',
      (s) => s.replace('kept current against cemetery records', 'kept current against the MIS export')],
  ]);

  let restored = 0;
  try { child([self]); } catch (e) { restored = e.status ?? 1; }
  (restored === 0 ? pass : fail)(`sources restored, gate green again -> exit ${restored}`);
  failures += sabFail;
}

console.log(failures ? `\nRESULT: ${failures} FAILURE(S)` : '\nRESULT: PASS — 0 mismatches');
process.exit(failures ? 1 : 0);
