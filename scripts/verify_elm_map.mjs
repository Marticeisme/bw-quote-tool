/**
 * Gate for the Eternal Light Mausoleum building map.
 *
 *   node scripts/verify_elm_map.mjs
 *   node scripts/verify_elm_map.mjs --sabotage
 *
 * Proves that MAPS/ELM_CryptMap.html is a faithful, deterministic rendering of
 * scripts/elm-building-data.mjs, and — the part that matters in front of a family — that
 * this page makes NO CLAIM IT CANNOT BACK:
 *
 *   1. NOT ONE dollar figure anywhere. ELM's crypts have no per-position price source we
 *      have read, so an "Ask us" is the only honest thing a bank can say, and a page that
 *      could ever print a number without one is the failure this gate exists to prevent.
 *   2. NOT ONE status. The cemetery's drawing highlights several clusters pink and we do
 *      not know what the highlighting means; rendering it as sold/available would be
 *      inventing inventory out of a fill colour.
 *   3. No invented positions. A bank carries a numbered range ONLY where the drawing
 *      prints the numbers — three of them do; the other twenty-two say so.
 *   4. No dimensions. The coordinates are schematic, not surveyed.
 *   5. BOTH link directions between this map and the columbarium's own map.
 *   6. The photoreal walkthrough button matches `listed` in scripts/walkthrough-scenes.mjs
 *      — present exactly once while the reel is listed, absent entirely while it is not.
 *
 * Exit 1 on any failure.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  SECTIONS, SITE, GROUPS, KIND_LABEL, STATUS_LABEL, UNSELLABLE, HAS_INVENTORY, ASK_LABEL,
  isSelectable, sellable, positionsText, sectionById,
} from './elm-building-data.mjs';
import { MOVEMENT_TOKENS } from './map-movement.mjs';
import { assertFamilyRegister } from './_no_mis_assert.mjs';
import { scene } from './walkthrough-scenes.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REL = 'MAPS/ELM_CryptMap.html';
const ABS = path.join(ROOT, REL);
const ECL_REL = 'MAPS/ECL_NicheMap.html';
const ECL_ABS = path.join(ROOT, ECL_REL);

// ── ANCHORS — typed from the cemetery's own drawing of this building, NOT derived from
// the module, so a section that is silently added, dropped or relabelled fails here. ────
//
// The Garden Mausoleum lettering runs 1A,1B,1C,1D,1F,1G,1H,1I. There is NO 1E on the
// drawing. That gap is anchored EXPLICITLY, because "tidy up the sequence" is the single
// most likely well-meaning edit anyone will ever make to this file, and it would invent a
// bank of tandem crypts that does not exist.
const GARDEN_LETTERS = ['1A', '1B', '1C', '1D', '1F', '1G', '1H', '1I'];
const GARDEN_ABSENT = '1E';

// Every reference the drawing prints, transcribed exactly — ELN-W-1 included, prefix and
// all. Normalising it to ELM would hand a counselor a reference the cemetery office
// cannot find, so the odd prefix is anchored rather than corrected.
const DRAWING_REFS = [
  ...GARDEN_LETTERS,
  'ELM-W-1', 'ELN-W-1',
  'ELM-3-W', 'ELM-4-W', 'ELM-3-S', 'ELM-4-S', 'ELM-3-E', 'ELM-4-E', 'ELM-4-N',
  'CRYSTAL NICHES',
  'ELM-P-C', 'ELM-P-D',
];

// The only three numbered ranges the drawing prints.
const NUMBERED = { 'elm-w-1-left': [1, 14], 'elm-w-1-right': [15, 28], 'crystal-core': [1, 24] };

const N_SECTIONS = 28;
const N_SELECTABLE = 25;
const N_SLAB_FACES = 5;         // every section is drawn as a top face plus four sides
const CONF = ['high', 'medium', 'low'];

let failures = 0;
const fail = (m) => { failures++; console.log('  FAIL  ' + m); };
const pass = (m) => console.log('  ok    ' + m);
const ck = (ok, m) => (ok ? pass : fail)(m);

console.log('\nEternal Light Mausoleum (ELM) building-map gate\n');

// ── 1. The data module carries geometry and nothing else ─────────────────────
console.log('Data module — geometry only');
{
  ck(HAS_INVENTORY === false,
    `HAS_INVENTORY is false — there is no per-position price or status source for ELM (got ${HAS_INVENTORY})`);
  // A price or status field on ANY section is the whole failure mode this page guards
  // against, so it is checked as a key scan rather than a value scan: a `p: null` slot
  // that someone later fills is exactly as dangerous as a number typed today.
  const priceKeys = ['p', 'price', 'prices', 'st', 'status', 'tier', 'tiers', 'units'];
  const dirty = SECTIONS.filter((s) => priceKeys.some((k) => k in s));
  ck(dirty.length === 0,
    `no section carries a price or status field${dirty.length ? ' — ' + dirty.map((s) => s.id).join(', ') : ` (scanned ${priceKeys.join('/')})`}`);
  const ids = SECTIONS.map((s) => s.id);
  ck(new Set(ids).size === ids.length, `all ${ids.length} section ids are unique`);
  ck(SECTIONS.length === N_SECTIONS, `the drawing's ${N_SECTIONS} named elements are all present (${SECTIONS.length})`);
  ck(SECTIONS.filter(isSelectable).length === N_SELECTABLE,
    `${N_SELECTABLE} of them are selectable inventory; rest rooms and the link zone are not (${SECTIONS.filter(isSelectable).length})`);
  const badConf = SECTIONS.filter((s) => !CONF.includes(s.conf));
  ck(badConf.length === 0, `every section records a placement confidence of high / medium / low${badConf.length ? ' — ' + badConf.map((s) => s.id).join(', ') : ''}`);
  const badKind = SECTIONS.filter((s) => !(s.kind in KIND_LABEL));
  ck(badKind.length === 0, `every section's kind has a family-facing label${badKind.length ? ' — ' + badKind.map((s) => s.id).join(', ') : ''}`);
  const noNote = SECTIONS.filter((s) => !s.note || !s.label);
  ck(noNote.length === 0, 'every section has a label and a plain-English note');
  const ungrouped = SECTIONS.filter((s) => !GROUPS.some((g) => g.match(s)));
  ck(ungrouped.length === 0, `every section falls into one of the ${GROUPS.length} list groups${ungrouped.length ? ' — ' + ungrouped.map((s) => s.id).join(', ') : ''}`);
  // Geometry must be real numbers with real extent, or a bank renders as an invisible
  // zero-area cell that no one can click and no one notices is missing.
  const badGeo = SECTIONS.filter((s) => ![s.x, s.z, s.w, s.d, s.h].every((v) => typeof v === 'number' && isFinite(v)) || s.w <= 0 || s.d <= 0 || s.h <= 0);
  ck(badGeo.length === 0, `every section has finite, positive plan geometry${badGeo.length ? ' — ' + badGeo.map((s) => s.id).join(', ') : ''}`);
  const outside = SECTIONS.filter((s) => s.x - s.w / 2 < SITE.x0 - 4 || s.x + s.w / 2 > SITE.x1 + 4 || s.z - s.d / 2 < SITE.gardenZ - 4 || s.z + s.d / 2 > SITE.z1 + 4);
  ck(outside.length === 0, `every section sits inside the site envelope${outside.length ? ' — ' + outside.map((s) => s.id).join(', ') : ''}`);
}

// ── 1b. The status conventions are ENCODED even though nothing carries one ────
// When ELM's inventory arrives it must be a data change, not a fresh set of design
// decisions. These are the ECL/ROAC/COM conventions, asserted here so they cannot be
// quietly re-invented — or quietly deleted as "unused".
console.log('\nStatus conventions, encoded ahead of the inventory');
{
  for (const s of ['available', 'occupied', 'reserved', 'sold', 'unpriced']) {
    ck(typeof STATUS_LABEL[s] === 'string', `the status vocabulary defines '${s}'`);
  }
  ck(JSON.stringify(UNSELLABLE) === JSON.stringify(['occupied', 'reserved', 'sold', 'unpriced']),
    'the unsellable list is the house one: occupied, reserved, sold, unpriced');
  ck(sellable({ st: 'available', p: 100 }) === true, 'sellable() accepts an available position with a price');
  ck(sellable({ st: 'available', p: null }) === false, 'sellable() rejects an available position with no price');
  ck(sellable({ st: 'occupied', p: 100 }) === false, 'sellable() rejects an unsellable position even when it carries a price');
  ck(SECTIONS.every((s) => !sellable(s)), 'nothing in this building is sellable today, so nothing may print a price');
}

// ── 2. The drawing's own references ───────────────────────────────────────────
console.log("\nReferences, against the cemetery's drawing");
{
  const refs = SECTIONS.map((s) => s.ref).filter(Boolean);
  const missing = DRAWING_REFS.filter((r) => !refs.includes(r));
  ck(missing.length === 0, `all ${DRAWING_REFS.length} drawn references are modelled${missing.length ? ' — missing ' + missing.join(', ') : ''}`);
  const extra = [...new Set(refs)].filter((r) => !DRAWING_REFS.includes(r) && r !== 'ECL-1');
  ck(extra.length === 0, `no reference is modelled that the drawing does not print${extra.length ? ' — invented: ' + extra.join(', ') : ''}`);
  const garden = SECTIONS.filter((s) => s.kind === 'tandem').map((s) => s.ref).sort();
  ck(JSON.stringify(garden) === JSON.stringify([...GARDEN_LETTERS].sort()),
    `the Garden Mausoleum run is exactly ${GARDEN_LETTERS.join(', ')} (${garden.join(', ')})`);
  ck(!refs.includes(GARDEN_ABSENT),
    `${GARDEN_ABSENT} is NOT invented to close the gap in the lettering run`);
  // ELN-W-1 keeps its odd prefix AND is flagged as a reading to confirm.
  const eln = sectionById('eln-w-1');
  ck(!!eln && eln.ref === 'ELN-W-1', "the Pickel Wall keeps the drawing's ELN prefix, unnormalised");
  ck(!!eln && eln.labelUnverified === true, 'and is flagged as a reference to confirm, since no signage confirms it');
  ck(SECTIONS.filter((s) => s.labelUnverified).length === 1, 'exactly one reference is flagged unverified');
}

// ── 3. Numbered positions: only where the drawing prints them ────────────────
console.log('\nNumbered positions');
{
  const numbered = SECTIONS.filter((s) => s.positions);
  ck(numbered.length === Object.keys(NUMBERED).length,
    `exactly ${Object.keys(NUMBERED).length} sections carry a numbered range (${numbered.length})`);
  for (const [id, want] of Object.entries(NUMBERED)) {
    const s = sectionById(id);
    ck(!!s && JSON.stringify(s.positions) === JSON.stringify(want),
      `${id.padEnd(15)} positions ${want[0]}–${want[1]} (got ${s ? JSON.stringify(s.positions) : 'no such section'})`);
  }
  const unnumbered = SECTIONS.filter((s) => !s.positions && isSelectable(s));
  ck(unnumbered.every((s) => /confirmed with us/i.test(positionsText(s))),
    `the other ${unnumbered.length} selectable sections say their count comes from us, rather than guessing one`);
}
if (failures) { console.log(`\nRESULT: ${failures} FAILURE(S) — the page cannot be built from this data`); process.exit(1); }

// ── 4. Build determinism ──────────────────────────────────────────────────────
console.log('\nBuild determinism');
{
  const before = fs.readFileSync(ABS);
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'build_elm_map.mjs')], { cwd: ROOT, stdio: 'pipe' });
  const after = fs.readFileSync(ABS);
  ck(before.equals(after), `rebuilding reproduces ${REL} byte for byte (${after.length} bytes)`);
}
const src = fs.readFileSync(ABS, 'utf8');
const eclSrc = fs.readFileSync(ECL_ABS, 'utf8');
ck(/Generated by scripts\/build_elm_map\.mjs/.test(src), 'the page declares its generator and says not to hand-edit');

// ── 5. Every section is rendered, in every rendering ─────────────────────────
console.log('\nEvery section renders, in all three renderings');
{
  const count = (id) => (src.match(new RegExp(`data-sec="${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g')) || []).length;
  const slabs = [...src.matchAll(/<div class="face top ([^"]*)" data-sec="([^"]*)"/g)].map((m) => m[2]);
  ck(new Set(slabs).size === N_SECTIONS, `all ${N_SECTIONS} sections have a 3D slab (${new Set(slabs).size})`);
  const sides = (src.match(/<div class="face side /g) || []).length;
  ck(sides === N_SECTIONS * (N_SLAB_FACES - 1), `every slab is closed on four sides (${sides} side faces)`);
  const planCells = [...src.matchAll(/class="pcell [^"]*"(?: data-sec="([^"]*)")?/g)];
  ck(planCells.length === N_SECTIONS, `the flat plan draws all ${N_SECTIONS} sections (${planCells.length})`);
  const missing = SECTIONS.filter((s) => count(s.id) < 2);
  ck(missing.length === 0, `every section appears in at least the 3D scene and the plan${missing.length ? ' — ' + missing.map((s) => s.id).join(', ') : ''}`);
  // The list tab is the print surface: a section missing from it prints as if it did not
  // exist, which is how a counselor walks a family past a bank nobody mentioned.
  const rows = (src.match(/<tr>\s*\r?\n\s*<td class="rref">/g) || []).length;
  ck(rows === N_SECTIONS, `the printable section list has one row per section (${rows})`);
  for (const r of DRAWING_REFS) {
    ck(src.includes(`>${r}<`) || src.includes(`>${r}`), `the page renders the reference ${r}`);
  }
  ck(!new RegExp(`\\b${GARDEN_ABSENT}\\b`).test(src.replace(/<!--[\s\S]*?-->/g, '')),
    `the page never renders ${GARDEN_ABSENT}`);
  // Only a selectable section is a button; a rest room must not look purchasable.
  const buttons = [...src.matchAll(/<button type="button" class="(?:hit|pcell)[^"]*" data-sec="([^"]*)"/g)].map((m) => m[1]);
  const nonSel = [...new Set(buttons)].filter((id) => { const s = sectionById(id); return !s || !isSelectable(s); });
  ck(nonSel.length === 0, `nothing unsellable is rendered as a selectable button${nonSel.length ? ' — ' + nonSel.join(', ') : ''}`);
  ck(new Set(buttons).size === N_SELECTABLE, `all ${N_SELECTABLE} selectable sections are buttons (${new Set(buttons).size})`);
}

// ── 6. THE SAFETY GATE: no price, no status, no dimension, anywhere ──────────
console.log('\nNo price, no status, no dimension is rendered anywhere');
{
  const rendered = src.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
  const dollars = [...rendered.matchAll(/\$\s*[\d,]+/g)].map((m) => m[0]);
  ck(dollars.length === 0, `zero dollar figures on the whole page${dollars.length ? ' — ' + dollars.slice(0, 5).join(', ') : ''}`);
  ck(!/data-price=/.test(src), 'no element carries a data-price attribute a card could read');
  ck(!/\bclass="[^"]*\bst-(?:available|occupied|reserved|sold|unpriced)\b/.test(src),
    'no element carries a status class — the drawing’s pink highlighting is not modelled as a status');
  // The status WORDS must not be rendered either. They exist in the module (and in this
  // gate) as vocabulary for the future load; on the page today they would be a claim.
  const words = ['Occupied', 'Reserved', 'Not Priced'];
  const leaked = words.filter((w) => new RegExp(`>\\s*${w}\\s*<`).test(rendered));
  ck(leaked.length === 0, `no status word is rendered${leaked.length ? ' — ' + leaked.join(', ') : ''}`);
  const ask = (rendered.match(new RegExp(`>${ASK_LABEL}<`, 'g')) || []).length;
  ck(ask >= N_SELECTABLE, `"${ASK_LABEL}" is printed for every selectable section in the list (${ask} occurrences, need ≥ ${N_SELECTABLE})`);
  ck(new RegExp(`ASK = "${ASK_LABEL}"`).test(src) || new RegExp(`var ASK = ${JSON.stringify(ASK_LABEL)}`).test(src),
    `the detail card is driven by the same "${ASK_LABEL}" string, not a second copy`);
  ck(/HAS_INVENTORY = false/.test(src), 'the page script carries HAS_INVENTORY = false');
  // No dimensions: the coordinates are schematic, so a rendered size would be a lie with
  // a number on it. Same check the ECL page carries, plus a bare foot/inch scan.
  const dims = [...rendered.matchAll(/\d+\s*(?:"|&quot;|″|'|ft|feet|in\b|inches)\s*(?:x|×|by)\s*\d+/gi)].map((m) => m[0]);
  ck(dims.length === 0, `no dimensions rendered${dims.length ? ' — ' + dims.slice(0, 3).join(', ') : ''}`);
  ck(/not to scale/i.test(src), 'the page says on its face that it is not to scale');
  ck(/schematic/i.test(src), 'and that the plan is schematic');
}

// ── 7. Placement confidence is a PATTERN, never a hue ────────────────────────
// Hue is already spent on what a section holds. A second code sharing that channel is how
// a reader stops trusting either one — the same rule the niche pages apply to status.
console.log('\nPlacement confidence: pattern, not hue');
{
  const rule = (sel) => { const i = src.indexOf(sel); return i < 0 ? '' : src.slice(i, src.indexOf('}', i) + 1); };
  ck(/\.c-medium::after,\.c-low::after\{content:'';position:absolute/.test(src),
    'the hatch is an overlay pseudo-element, so it cannot replace the kind hue');
  // Anchored to the line start: a bare '.c-low::after{' also matches inside the combined
  // '.c-medium::after,.c-low::after{' rule above it, and would grade the wrong body.
  ck(/repeating-linear-gradient\(135deg/.test(rule('\n  .c-medium::after{')), 'medium confidence draws a hatch');
  ck(/repeating-linear-gradient\(135deg/.test(rule('\n  .c-low::after{')), 'low confidence draws a heavier hatch');
  // The regression this replaced: `background-image` on a gradient-filled cell REPLACES
  // the gradient rather than layering over it, so every approximate section lost its hue.
  ck(!/\.c-(?:medium|low)\{background-image:/.test(src),
    'confidence never sets background-image directly (that would wipe the kind hue)');
  // …and it must not set position either: .pcell / .face are already absolutely
  // positioned, and a later position:relative at equal specificity drops them out of
  // absolute layout and staggers the plan.
  ck(!/\.c-medium,\.c-low\{position:/.test(src),
    'confidence never sets position on the cell (that dropped the plan out of layout)');
  for (const c of CONF) {
    const n = SECTIONS.filter((s) => s.conf === c).length;
    if (n) ck(src.includes(` c-${c}`), `the ${c}-confidence class reaches the page (${n} sections)`);
  }
  ck(/Hatched = approximate placement/.test(src), 'the legend explains what the hatch means');
}

// ── 8. BOTH link directions between this map and the columbarium's ───────────
// The pair is the point: a counselor standing in the building needs the niche prices, and
// a counselor deep in the niche map needs to know which building they are in.
console.log('\nThe columbarium link, in both directions');
{
  const link = sectionById('link-ecl');
  ck(!!link && link.href === 'ECL_NicheMap.html', 'the module points the link zone at the columbarium map');
  ck(!!link && link.conf === 'low',
    'and records its placement as LOW confidence — the drawing does not mark the columbarium at all');
  ck(!!link && !isSelectable(link), 'the link zone is not sold as inventory on this page');
  // Forward, four ways: header button, the standing note, the 3D hit zone, the plan cell.
  ck(/<a class="ecl-btn no-print[^"]*" href="ECL_NicheMap\.html">/.test(src), 'a persistent header button links to the columbarium map');
  ck(/<div class="eclbar">[\s\S]{0,400}href="ECL_NicheMap\.html"/.test(src), 'a standing note under the scene links to it too');
  ck(/<a href="ECL_NicheMap\.html" class="hit h-link" data-sec="link-ecl"/.test(src), 'the columbarium is a click-through link zone inside the 3D scene');
  ck(/<a href="ECL_NicheMap\.html" class="pcell k-link[^"]*" data-sec="link-ecl"/.test(src), 'and a click-through cell on the flat plan');
  const fwd = (src.match(/href="ECL_NicheMap\.html"/g) || []).length;
  ck(fwd >= 4, `${fwd} links from this page to the columbarium map (need ≥ 4)`);
  // A tap inside the 3D scene must still navigate: the scene swallows the native click
  // that follows any pointer gesture, so the link zone needs the explicit path.
  ck(/if \(tap && downHref\)/.test(src), 'a tap on the link zone navigates despite the scene’s click suppression');
  ck(/if \(ev\.target\.closest\('a\[href\]'\)\) return;/.test(src), 'and the card handler never intercepts a link');
  // Reciprocal.
  ck(/<a class="back-btn no-print" href="ELM_CryptMap\.html">/.test(eclSrc),
    `${ECL_REL} carries the reciprocal anchor back to this building map`);
  ck((eclSrc.match(/href="ELM_CryptMap\.html"/g) || []).length === 1,
    'exactly one reciprocal anchor — the smallest diff that closes the loop');
  ck(/href="\.\.\/">&larr; Quote Tool<\/a>/.test(eclSrc), 'and the columbarium map keeps its own "← Quote Tool" button');
  ck(fs.existsSync(ECL_ABS), `${ECL_REL} exists, so neither link is a 404`);
  ck(fs.existsSync(ABS), `${REL} exists, so neither link is a 404`);
}

// ── 8b. The photoreal walkthrough button ──────────────────────────────────────
// Added 2026-08-04 with the relisting. Operator, having watched the sprint-14 reels: "the
// reels look good link the com and elm ones". The listing decision is NOT duplicated here:
// it lives once as `listed` in scripts/walkthrough-scenes.mjs and this section reads it, so
// a future de-listing flips this gate with no edit and cannot leave a stale button behind.
console.log('\nThe photoreal walkthrough link');
{
  const S = scene('ELM');
  const page = path.basename(S.page);
  const hrefs = [...src.matchAll(/<a\b[^>]*\bhref="([^"]*)"/gi)]
    .map((m) => m[1]).filter((h) => path.basename(h.split('#')[0].split('?')[0]) === page);
  if (S.listed) {
    ck(hrefs.length === 1, `exactly one header link to ${page} (found ${hrefs.length})`);
    ck(new RegExp(`<a class="walk-btn no-print" href="${page.replace('.', '\\.')}">`).test(src),
      'and it is a .walk-btn in the header, matching the columbarium button’s shape');
    ck(/\.walk-btn\{[^}]*text-decoration:none;\}/.test(src), '.walk-btn is actually styled, not an unstyled blue link');
    ck(/\.print-btn,\.back-btn,\.ecl-btn,\.walk-btn\{padding:6px 11px/.test(src),
      'and it shrinks with the rest of the header under 640px, instead of wrapping the bar');
    ck(fs.existsSync(path.join(ROOT, S.page)), `${S.page} exists, so the button is not a 404`);
  } else {
    ck(hrefs.length === 0, `the ELM reel is delisted: no link to ${page} on this page (found ${hrefs.length})`);
  }
}

// ── 9. House rules ────────────────────────────────────────────────────────────
console.log('\nHouse rules');
{
  ck(/class="back-btn no-print" href="\.\.\/"/.test(src), '"← Quote Tool" back button in the header');
  const rounded = [...src.matchAll(/\$\d+(?:\.\d+)?K/g)].map((m) => m[0]);
  ck(rounded.length === 0, `no rounded price labels${rounded.length ? ' — ' + rounded.join(', ') : ''}`);
  const scripts = (src.match(/<script/g) || []).length;
  ck(scripts === 1, `page has ${scripts} <script> block(s); none is needed to render the plan or the list`);
  ck(/\.wview\{display:block!important/.test(src), 'print stylesheet forces the plan and the list visible without JS');
  ck(/body\.pv-one \.wview\.active\{display:block!important/.test(src), 'print scope follows the active tab');
  ck(/<title>Bonney Watson — Eternal Light Mausoleum<\/title>/.test(src), 'the page is titled for the building it maps');
}

// ── 10. Movement runtime ──────────────────────────────────────────────────────
console.log('\nMovement runtime');
{
  const js = src.slice(src.lastIndexOf('<script>'));
  for (const [tok, what] of MOVEMENT_TOKENS) ck(js.indexOf(tok) > -1, what);
  const keys = ['yaw', 'pitch', 'zoom', 'lift'];
  const m = /var CAM_KEYS = (\[[^\]]*\])/.exec(js);
  ck(!!m && JSON.stringify(JSON.parse(m[1])) === JSON.stringify(keys),
    `an eased transition carries the WHOLE camera: ${keys.join(', ')}` + (m ? ` (page: ${m[1]})` : ' — CAM_KEYS not found'));
  ck(/moved <= 8/.test(js), 'the tap detector still keys off POINTER TRAVEL (moved <= 8)');
  ck(/suppressUntil = performance\.now\(\) \+ 450;/.test(js),
    'the click-suppression window is still a flat 450 ms and is not tied to camera motion');
  ck(!/suppressUntil[^;]*(vYaw|vPitch|glideRaf|camT)/.test(js), 'nothing about the glide can extend the suppression window');
  ck(/releaseGesture\(moved\);/.test(js), 'the release reads pointer travel and nothing else');
}

// ── 11. Family-facing wording ────────────────────────────────────────────────
console.log('\nFamily-facing wording');
assertFamilyRegister((c, m) => (c ? pass : fail)(m), 'ELM_CryptMap.html', src);

// ── Sabotage: every mutation below must make this gate exit 1 ────────────────
// A gate that has never been made to fail is a gate nobody has tested. Each mutation is
// applied to a source, the affected page is rebuilt, this gate is re-run as a child, and
// the source is restored — including on a throw. The final line proves the tree is green
// again, so a sabotage run cannot leave the repo dirty.
if (process.argv.includes('--sabotage')) {
  const DATA = path.join(ROOT, 'scripts', 'elm-building-data.mjs');
  const BUILD = path.join(ROOT, 'scripts', 'build_elm_map.mjs');
  const BUILD_ECL = path.join(ROOT, 'scripts', 'build_ecl_map.mjs');
  const child = (args) => execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  const self = fileURLToPath(import.meta.url);
  const rebuildAll = () => { child([BUILD_ECL]); child([BUILD]); };
  let sabFail = 0;

  const runSet = (file, origSrc, list) => {
    try {
      for (const [label, mut] of list) {
        const mutated = mut(origSrc);
        if (mutated === origSrc) { console.log('  FAIL  sabotage did not apply: ' + label); sabFail++; continue; }
        fs.writeFileSync(file, mutated, 'utf8');
        let code = 0;
        try { rebuildAll(); child([self]); } catch (e) { code = e.status ?? 1; }
        if (code === 1) pass(`${label} -> exit ${code}`);
        else { sabFail++; console.log(`  FAIL  ${label} -> exit ${code} (expected 1)`); }
        fs.writeFileSync(file, origSrc, 'utf8');
      }
    } finally {
      fs.writeFileSync(file, origSrc, 'utf8');
      rebuildAll();
    }
  };

  console.log('\nSabotage of the layout data (each mutation must make this gate exit 1)');
  const origData = fs.readFileSync(DATA, 'utf8');
  runSet(DATA, origData, [
    ['a price introduced on a bank that has no price source',
      (s) => s.replace("    positions: [1, 24], conf: 'high',", "    positions: [1, 24], conf: 'high', p: 8995,")],
    ['a status invented from the drawing’s pink highlighting',
      (s) => s.replace("    positions: [1, 24], conf: 'high',", "    positions: [1, 24], conf: 'high', st: 'available',")],
    ['HAS_INVENTORY flipped true while there is still no inventory',
      (s) => s.replace('export const HAS_INVENTORY = false;', 'export const HAS_INVENTORY = true;')],
    ['the missing 1E invented to tidy the lettering run',
      (s) => s.replace("['1I', '1H', '1G', '1F', '1D', '1C', '1B', '1A']", "['1I', '1H', '1G', '1F', '1E', '1D', '1C', '1B', '1A']")],
    ['the ELN-W-1 prefix silently normalised to ELM',
      (s) => s.replace("id: 'eln-w-1', ref: 'ELN-W-1'", "id: 'eln-w-1', ref: 'ELM-W-1'")],
    ['the unverified-reference flag dropped, so an unconfirmed label reads as confirmed',
      (s) => s.replace("conf: 'high', labelUnverified: true,", "conf: 'high',")],
    ['a position count guessed for a bank the drawing does not number',
      (s) => s.replace("x: -35, z: 40, w: 62, d: 5, h: SITE.wallH, positions: null, conf: 'high',",
        "x: -35, z: 40, w: 62, d: 5, h: SITE.wallH, positions: [1, 40], conf: 'high',")],
    ['the crystal-niche range widened past what the drawing prints',
      (s) => s.replace('positions: [1, 24], conf: \'high\',', 'positions: [1, 48], conf: \'high\',')],
    // EVERY multi-line needle below matches with \r?\n. This repo is CRLF, a literal '\n'
    // matches nothing in a checked-out file, and six of these mutations silently stopped
    // applying the moment these sources were normalised to CRLF — proving nothing while
    // still looking like a list of tests. runSet reports a no-op mutation as a FAIL, which
    // is the only reason it was caught.
    ['the columbarium’s guessed placement upgraded to a confirmed one',
      (s) => s.replace(/positions: null, conf: 'low',(\r?\n    href: 'ECL_NicheMap\.html',)/, "positions: null, conf: 'high',$1")],
    ['the link zone pointed away from the columbarium map',
      (s) => s.replace("href: 'ECL_NicheMap.html',", "href: 'ECL_NicheMap.htm',")],
    ['a whole bank deleted from the building',
      (s) => s.replace(/  \{\r?\n    id: 'elm-p-d',[\s\S]*?\n  \},\r?\n/, '')],
    ['the status vocabulary deleted as unused, so the next inventory load re-invents it',
      (s) => s.replace("export const UNSELLABLE = ['occupied', 'reserved', 'sold', 'unpriced'];",
        'export const UNSELLABLE = [];')],
  ]);

  console.log('\nSabotage of the generator (the rendering assertions must have teeth)');
  const origBuild = fs.readFileSync(BUILD, 'utf8');
  runSet(BUILD, origBuild, [
    ['the "Ask us" chip replaced with a dollar figure',
      (s) => s.replace("const ask = isSelectable(s) ? `<span class=\"ask\">${esc(ASK_LABEL)}</span>` : '';",
        "const ask = isSelectable(s) ? '<span class=\"ask\">$4,995</span>' : '';")],
    ['a rest room rendered as a selectable button',
      (s) => s.replace(/ {2}if \(!isSelectable\(s\)\) return '';\r?\n/, '')],
    ['the persistent columbarium button dropped from the header',
      (s) => s.replace(/ {2}<a class="ecl-btn no-print spacer" href="\$\{ECL_HREF\}">Columbarium niche map &rarr;<\/a>\r?\n/, '')],
    // The relisted reel's button, in both failure directions: gone, and doubled. CRLF-safe
    // like every needle here — a literal '\n' would match nothing and prove nothing.
    ['the photoreal walkthrough button dropped from the header while the reel is still listed',
      (s) => s.replace(/ {2}<a class="walk-btn no-print" href="\$\{WALK_HREF\}">Photoreal walkthrough<\/a>\r?\n/, '')],
    ['a second walkthrough button added, so the header offers the same reel twice',
      (s) => s.replace(/( {2}<a class="walk-btn no-print" href="\$\{WALK_HREF\}">Photoreal walkthrough<\/a>)(\r?\n)/,
        '$1$2  <a class="walk-btn no-print" href="${WALK_HREF}">Walkthrough</a>$2')],
    ['the walkthrough button left unstyled, so it renders as a bare browser link',
      (s) => s.replace(/ {2}\.walk-btn\{flex-shrink:0;[^\n]*text-decoration:none;\}\r?\n/, '')],
    // The first `if (s.kind === 'link') {` in the file is the one inside hit(); a string
    // needle replaces only that occurrence, leaving the flat plan's link cell alone. That
    // is deliberate — it isolates the 3D link zone, which is the assertion under test.
    ['the 3D link zone downgraded to a plain button that cannot navigate',
      (s) => s.replace("if (s.kind === 'link') {", 'if (false) {')],
    ['the confidence hatch reverted to background-image, wiping the kind hue',
      (s) => s.replace(/ {2}\.c-medium::after,\.c-low::after\{content:'';position:absolute;inset:0;pointer-events:none;border-radius:inherit;\}(\r?\n) {2}\.c-medium::after\{background:/,
        '  .c-medium{background-image:repeating-linear-gradient(135deg,rgba(255,255,255,.34) 0 2px,rgba(255,255,255,0) 2px 6px)!important;}$1  .c-mediumX::after{background:')],
    ['a dimension rendered on the page',
      (s) => s.replace('layout schematic, not to scale', 'each bank is 22 ft x 7 ft')],
    ['the printable section list dropped, so a printout omits every bank',
      (s) => s.replace(/\$\{planView\(\)\}\r?\n\$\{listView\(\)\}/, '${planView()}')],
    ['an internal register word put back into the page copy',
      (s) => s.replace('kept current against cemetery records', 'kept current against the MIS export')],
  ]);

  console.log('\nSabotage of the columbarium generator (the reciprocal half of the link pair)');
  const origEcl = fs.readFileSync(BUILD_ECL, 'utf8');
  runSet(BUILD_ECL, origEcl, [
    // Matched with \r?\n, not \n. build_ecl_map.mjs is CRLF like everything in this repo,
    // so a literal '\n' in the needle silently matches nothing — and a sabotage that does
    // not apply is a sabotage that proves nothing. Reported as a FAIL by runSet, which is
    // how this was caught rather than being quietly counted as a pass.
    ['the reciprocal anchor removed from the columbarium map, leaving a one-way link',
      (s) => s.replace(/ {2}<a class="back-btn no-print" href="ELM_CryptMap\.html">&larr; Eternal Light Mausoleum<\/a>\r?\n/, '')],
    ['the reciprocal anchor duplicated, so the columbarium map grows a second copy',
      (s) => s.replace(/( {2}<a class="back-btn no-print" href="ELM_CryptMap\.html">&larr; Eternal Light Mausoleum<\/a>)(\r?\n)/,
        '$1$2  <a class="back-btn no-print" href="ELM_CryptMap.html">&larr; Mausoleum</a>$2')],
  ]);

  let restored = 0;
  try { child([self]); } catch (e) { restored = e.status ?? 1; }
  (restored === 0 ? pass : fail)(`sources restored, gate green again -> exit ${restored}`);
  failures += sabFail;
}

console.log(failures ? `\nRESULT: ${failures} FAILURE(S)` : '\nRESULT: PASS — 0 mismatches');
process.exit(failures ? 1 : 0);
