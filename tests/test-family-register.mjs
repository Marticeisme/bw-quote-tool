// THE FAMILY-REGISTER BAN LIST, proven in both directions.
//
// Operator, 2026-08-02: "Why does it say operator here?" — of the live COM crypt map,
// whose footer told a family which internal report the availability came from, how many
// rows that report had, and that the page was a SNAPSHOT. The MIS sweep before it had
// removed one word and left the rest of the paragraph standing, which is the failure mode
// this suite exists to prevent: a one-word gate teaches everyone that one word is the
// problem, when the problem is a VOICE.
//
// So this proves the shared assert in scripts/_no_mis_assert.mjs both ways, which is the
// only thing that makes it worth having:
//
//   CATCHES   every banned term, in rendered text, in an attribute, and in a JS string
//             literal, because these pages build their cards by assigning innerHTML.
//   PASSES    the same words when they appear only in an HTML comment, a block comment or
//             a whole-line // comment — provenance in the source is the POINT, not a leak.
//   PASSES    the allowlisted spans: the "← Quote Tool" back button, and the PCM marker
//             catalog's design motifs ("gate", "gates of heaven", "railroad tracks").
//   CATCHES   a banned word on the SAME LINE as an allowlisted span, so blanking the span
//             can never be used to smuggle one in.
//   CATCHES   a per-file allowlist used on the wrong file.
//
// And it re-asserts on the LIVE built surfaces, so a rebuild that reintroduces the
// register fails here as well as in the map gate.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BANNED, ALLOW, registerHits, stripUnrendered, stripAllowed, assertFamilyRegister,
} from '../scripts/_no_mis_assert.mjs';
import { SCENES, SCENE_KEYS } from '../scripts/walkthrough-scenes.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL ' + m); } };

// ── the list itself is well formed ───────────────────────────────────────────
ok(BANNED.length >= 18, `the ban list carries ${BANNED.length} terms (>=18)`);
ok(new Set(BANNED.map((b) => b.id)).size === BANNED.length, 'every ban id is unique');
for (const b of BANNED) {
  ok(b.re.flags.includes('g'), `${b.id}: regex is global (lastIndex is reset per line)`);
  ok(typeof b.why === 'string' && b.why.length > 8, `${b.id}: says WHY it is banned`);
}
for (const a of ALLOW) {
  ok(a.re.flags.includes('g'), `allow ${a.id}: regex is global`);
  ok(typeof a.why === 'string' && a.why.length > 8, `allow ${a.id}: says why it is allowed`);
}

// ── SABOTAGE 1: every banned term is caught in rendered text ─────────────────
// One sentence per term, in the shape it actually appeared on a page.
const SPECIMENS = {
  MIS: '<p>Confirm in MIS before writing.</p>',
  operator: '<p>Applied by operator ruling on 2026-07-31.</p>',
  'Lot Inquiry': '<p>Statuses come from the Lot Inquiry List for Bldg-GOM.</p>',
  export: '<p>Prices from the cemetery crypt-price export.</p>',
  snapshot: '<p>It is a SNAPSHOT and is not updated automatically.</p>',
  'rows over': '<p>1,355 rows over 875 crypt spaces.</p>',
  'data module': '<p>Rendered verbatim from the data module.</p>',
  'wall sheet': '<p>Not available on the wall sheet.</p>',
  'price sheet': '<p>No price is printed on the current price sheet.</p>',
  'crypt sheet': '<p>The crypt sheet marked it NOT SELLING.</p>',
  'quote tool': '<p>These fees come from the quote tool.</p>',
  sprint: '<p>Reworked in sprint-10.</p>',
  track: '<p>Rebuilt by track X2.</p>',
  gate: '<p>This page has its own gate.</p>',
  verifier: '<p>See the verifier for details.</p>',
  sabotage: '<p>Sabotage-proven in both directions.</p>',
  Enterprise: '<p>Look it up in Enterprise.</p>',
  CAD: '<p>Measured off the cemetery CAD floor plan.</p>',
  'read to the family': '<h3>From the sheet — read these to the family</h3>',
  'dated provenance': '<p>The list was printed 2026-08-01.</p>',
};
for (const b of BANNED) {
  const s = SPECIMENS[b.id];
  ok(!!s, `${b.id}: has a sabotage specimen`);
  if (!s) continue;
  const hits = registerHits(s, 'sabotage.html');
  ok(hits.some((h) => h.term === b.id), `${b.id}: caught in rendered text — ${JSON.stringify(s.slice(0, 48))}`);
}

// ── SABOTAGE 2: caught in an attribute and in a JS string literal ────────────
for (const [what, src] of [
  ['an aria-label', '<button aria-label="Confirm in MIS">x</button>'],
  ['a title attribute', '<span title="from the operator\'s list">x</span>'],
  ['an alt attribute', '<img alt="the wall sheet" src="a.png">'],
  ['a JS string literal', "var NOTE = 'Not available on the wall sheet — ask us.';"],
  ['a template literal', 'const n = `printed 2026-08-01`;'],
]) {
  ok(registerHits(src, 'sabotage.html').length > 0, `caught in ${what}`);
}

// ── SABOTAGE 3 (the mirror): comments keep every word ───────────────────────
// This is the half that makes the gate survivable. If comments failed, the only way to
// green would be to delete the institutional memory, and the next person would lose the
// answer to "where did this price come from?".
for (const [what, src] of [
  ['an HTML comment', '<!-- availability: the Lot Inquiry List printed 2026-08-01, operator ruling -->'],
  ['a block comment', '/* the crypt sheet is superseded; the quote tool wins. Sabotage-proven. */'],
  ['a whole-line // comment', '// operator, 2026-08-01: take the fee from the quote tool (MIS export)'],
  ['a multi-line block comment', '/*\n * MIS wall sheet price sheet export snapshot\n * operator ruling, sprint-11 track A2\n */'],
]) {
  const hits = registerHits(src, 'sabotage.html');
  ok(hits.length === 0, `${what} keeps the provenance (got ${hits.length} hit(s): ${hits.map((h) => h.term).join(',')})`);
}
// …and comment-stripping must not move line numbers, or the gate points at innocent code.
{
  const src = '/*\n * MIS\n * operator\n */\n<p>the wall sheet</p>';
  const hits = registerHits(src, 'sabotage.html');
  ok(hits.length === 1 && hits[0].line === 5,
    `a hit after a 4-line block comment reports line 5, not line 1 (got ${hits.map((h) => h.line).join(',')})`);
  ok(stripUnrendered(src).split('\n').length === src.split('\n').length,
    'stripping comments preserves the line count exactly');
}

// ── SABOTAGE 4: the allowlist allows, and only what it should ────────────────
{
  const nav = '<a class="back-btn no-print" href="../">&larr; Quote Tool</a>';
  ok(registerHits(nav, 'MAPS/COM_CryptMap.html').length === 0,
    'the "← Quote Tool" back button passes — it is a navigation label');
  ok(registerHits('<a class="hbtn" href="../">← Quote Tool</a>', 'MAPS/COM_Walkthrough.html').length === 0,
    'and passes with a literal arrow character too');
  // …but the same words as a CITATION still fail, on the same page.
  ok(registerHits(nav + '\n<p>Fees come from the quote tool.</p>', 'MAPS/COM_CryptMap.html').length === 1,
    'while "come from the quote tool" on the next line still fails');
  // …and on the SAME LINE as the allowlisted span, so blanking cannot smuggle one in.
  ok(registerHits(nav + ' <span>priced from the quote tool</span>', 'MAPS/COM_CryptMap.html').length === 1,
    'and on the SAME LINE as the back button it still fails');
}
{
  const tags = '<div class="tag-row"><span class="tag" data-tag="gate">gate</span>'
    + '<span class="tag" data-tag="gates-of-heaven">gates of heaven</span></div>';
  ok(registerHits(tags, 'pcm-design-catalog.html').length === 0,
    'PCM design motifs "gate" / "gates of heaven" pass on the PCM catalog');
  // The per-file allowlist is scoped. The same markup on a map is NOT excused.
  ok(registerHits(tags, 'MAPS/COM_CryptMap.html').length > 0,
    'the PCM allowlist does not apply to any other surface');
  ok(registerHits('<p>The sabotage gate is green.</p>', 'pcm-design-catalog.html').length === 2,
    'and a real "sabotage gate" sentence is still caught INSIDE the PCM catalog');
}
ok(stripAllowed('x gate x', 'MAPS/COM_CryptMap.html') === 'x gate x',
  'stripAllowed leaves an unscoped file untouched');

// ── SABOTAGE 5: the assert reports, and reports usefully ────────────────────
{
  const msgs = [];
  const ck = (c, m) => msgs.push([c, m]);
  assertFamilyRegister(ck, 'clean.html', '<p>Ask us to confirm today’s status before writing.</p>');
  ok(msgs.length === 1 && msgs[0][0] === true, 'a clean surface passes with one check');
  msgs.length = 0;
  assertFamilyRegister(ck, 'dirty.html', '<p>the operator’s snapshot</p>');
  ok(msgs[0][0] === false, 'a dirty surface fails');
  ok(/line 1/.test(msgs[0][1]) && /operator/.test(msgs[0][1]) && /snapshot/.test(msgs[0][1]),
    'and the message names the line and every term found');
}

// ── THE LIVE SURFACES ───────────────────────────────────────────────────────
// The suite is not a unit test of a regex; it is the standing guarantee on the pages
// themselves. A rebuild that puts the register back fails here.
const SURFACES = [
  ...fs.readdirSync(path.join(ROOT, 'MAPS')).filter((f) => f.endsWith('.html')).map((f) => 'MAPS/' + f),
  ...fs.readdirSync(ROOT).filter((f) => /-guide\.html$/.test(f)),
  'guides.html', 'pcm-design-catalog.html', 'flush-markers.html', 'outside-marker-rules.html',
  'direct-cremation.html', 'medicaid-family-guide.html', 'medicaid-professional-reference.html',
  'vital-worksheet.html', 'viewer.html',
].filter((f) => fs.existsSync(path.join(ROOT, f)));
ok(SURFACES.length >= 30, `${SURFACES.length} family-facing surfaces scanned (>=30)`);
for (const f of SURFACES) {
  const hits = registerHits(fs.readFileSync(path.join(ROOT, f), 'utf8'), f);
  ok(hits.length === 0,
    `${f}: clean${hits.length ? ' — ' + hits.slice(0, 3).map((h) => `line ${h.line} [${h.term}] ${h.match}`).join('; ') : ''}`);
}

// ── THE WALKTHROUGH IS DELISTED ─────────────────────────────────────────────
// Operator, 2026-08-02, of MAPS/COM_Walkthrough.html: "This is not something I can show
// to families." The page, its builder and its two gates all stay — it returns when the
// building is re-shot — so what has to hold is narrower and needs its own guarantee: no
// family-facing surface may LINK to it. Direct URL access is deliberately still fine.
//
// Widened in sprint-14: there are now THREE walkthroughs (Chapel of Memory, Terrace Garden,
// Eternal Light), all shipped delisted for the same reason — the operator looks at a reel
// before it is offered to a family, and linking is a separate deliberate act.
//
// This lives here rather than only in verify_walkthrough.mjs because that gate takes tens of
// minutes PER SCENE (it screenshots a multi-megabyte gaussian splat at every camera stop),
// which is too slow to be the only thing standing between an edit and a relisted page.
// The same fact is asserted in both places on purpose.
const WALK_PAGES = SCENE_KEYS.map((k) => path.basename(SCENES[k].page));
const WALK = new RegExp(WALK_PAGES.map((p) => p.replace('.', '\\.')).join('|'));
const linkTo = (html) => [...html.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>/gi)]
  .map((m) => m[1]).filter((h) => WALK.test(h));
{
  ok(WALK_PAGES.length === 3, `three walkthrough reels are declared (${WALK_PAGES.join(', ')})`);
  const linked = [];
  for (const f of SURFACES) {
    // a page's own back button is not a link TO it
    if (WALK_PAGES.includes(path.basename(f))) continue;
    const hrefs = linkTo(fs.readFileSync(path.join(ROOT, f), 'utf8'));
    if (hrefs.length) linked.push(`${f} -> ${hrefs.join(', ')}`);
  }
  ok(linked.length === 0,
    `no family-facing surface links to any delisted walkthrough${linked.length ? ': ' + linked.join('; ') : ` (${SURFACES.length} checked)`}`);
  // The pages are NOT deleted — delisting is not removal, and asserting their absence
  // would quietly turn "hide the link" into "throw away the work".
  for (const k of SCENE_KEYS) {
    ok(fs.existsSync(path.join(ROOT, SCENES[k].page)),
      `${SCENES[k].page} still exists and is reachable by direct URL`);
    ok(fs.existsSync(path.join(ROOT, 'scripts', SCENES[k].pathFile)),
      `scripts/${SCENES[k].pathFile} — its stop polyline is tracked`);
  }
  ok(fs.existsSync(path.join(ROOT, 'scripts', 'build_walkthrough.mjs'))
    && fs.existsSync(path.join(ROOT, 'scripts', 'verify_walkthrough.mjs'))
    && fs.existsSync(path.join(ROOT, 'scripts', 'build_walkthrough_path.mjs')),
    'the shared builder, path builder and gate are all still in the tree');
  // …and the scanner has to actually catch a link, or the check above is decorative.
  ok(linkTo('<a class="guide-cta" href="MAPS/COM_Walkthrough.html">Open Walkthrough →</a>').length === 1,
    'sabotage: an injected guides.html card link IS caught');
  ok(linkTo('<a class="walk-btn no-print" href="COM_Walkthrough.html">Photoreal walkthrough</a>').length === 1,
    'sabotage: an injected COM map header link IS caught');
  ok(linkTo('<a class="walk-btn" href="TG_Walkthrough.html">Walkthrough</a>').length === 1,
    'sabotage: an injected Terrace Garden link IS caught');
  ok(linkTo('<a class="guide-cta" href="MAPS/ELM_Walkthrough.html">Eternal Light →</a>').length === 1,
    'sabotage: an injected Eternal Light link IS caught');
  ok(linkTo('<a href="COM_CryptMap.html">Crypt map</a>').length === 0,
    'and an unrelated map link is not');
  // The COM map's own header, specifically — that is where the button was.
  const com = fs.readFileSync(path.join(ROOT, 'MAPS', 'COM_CryptMap.html'), 'utf8');
  ok(!/class="walk-btn"/.test(com), 'the COM map header carries no walkthrough button');
  const guides = fs.readFileSync(path.join(ROOT, 'guides.html'), 'utf8');
  ok(!/Photoreal Walkthrough<\/div>/.test(guides), 'guides.html carries no walkthrough card');
  // The Maps pill has to agree with the cards under it, or the hub lies about itself.
  const maps = /<h2>Maps<\/h2>[\s\S]*?<span class="cat-count">(\d+)<\/span>([\s\S]*?)<\/div>\s*<\/div>\s*<div class="category"/.exec(guides);
  ok(!!maps, 'the Maps category is parseable out of guides.html');
  if (maps) {
    const cards = (maps[2].match(/class="guide-card"/g) || []).length;
    ok(Number(maps[1]) === cards, `the Maps pill says ${maps[1]} and there are ${cards} map cards`);
  }
}

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
