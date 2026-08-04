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
} from './tg-maus-data.mjs';
import { assertFamilyRegister, stripUnrendered } from './_no_mis_assert.mjs';

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

console.log('\nThe page renders the dataset');
{
  const want = allPositions().map((p) => p.ref).sort();
  for (const [name, list] of [['site plan', planBtns], ['bank list', listBtns]]) {
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
  const armed = [...planBtns, ...listBtns].filter((c) => c.price !== '' || c.status !== '');
  ck(armed.length === 0, `all ${planBtns.length + listBtns.length} rendered positions carry empty price and status slots${armed.length ? ' — armed: ' + armed.slice(0, 5).map((c) => c.ref).join(', ') : ''}`);
  const missing = [...planBtns, ...listBtns].filter((c) => c.price === null || c.status === null);
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

// ── ZERO INTERNAL REGISTER ───────────────────────────────────────────────────
console.log('\nFamily-facing wording');
assertFamilyRegister((c, m) => (c ? pass : fail)(m), 'TG_Mausoleum_Map.html', src);

console.log(failures ? `\nRESULT: ${failures} FAILURE(S)` : '\nRESULT: PASS — 0 mismatches');
process.exit(failures ? 1 : 0);
