// Reconcile every price and fee printed on urn-gardens-guide.html against the sources
// it is derived from. The page must never carry a figure that was typed from memory:
// each one is recomputed here and compared string-for-string. Mirrors the shape of
// scripts/verify_granite_niche_ranges.mjs (Track P) and verify_glass_niche_ranges.mjs
// (Track Q), but the SOURCES are different — see below.
//
// WHERE THE FIGURES COME FROM
//
//   index.html  <select id="qGarden">  option `lake_urn|<price>|<ecf>`
//               → the Lake Urn Garden ground-space price and its endowment care.
//               This is the tool's own live cemetery price list, so if Martice changes
//               the price in the tool this gate fails until the guide is brought level.
//
//   index.html  <select id="qBronze">  the five bronze memorials used in the urn
//               gardens, matched by their option LABELS (the labels name the gardens).
//               The printed memorial RANGE is the min/max across those five.
//
//   data/prices.json  current.fees → OC:ground_inurnment, OC:boulder_inurnment,
//               RECORDING:all. The canonical shared schedule (DESIGN §7); never
//               hand-edited, rebuilt by the map's build-prices.py.
//
// WHY NOT THE MAP REPO. Sprint-08 Track U was authorised to read price aggregates out
// of the gitignored map repo because data/prices.json carries no urn-garden prices.
// It was read (2026-07-29) and it carries none either: the ONLY files under
// wmp-cemetery-map/data/ with a `price` field are garden19/columbarium.json (Rock of
// Ages) and mausolea/MVCN.json (the Mountain View island) — neither is an urn garden.
// So the exception yielded nothing and no map data crossed into this repo. The probe
// below keeps that finding honest: it re-checks the map repo at gate time and FAILS if
// urn-garden prices ever appear there, because at that point the page has a better
// source than the one it is using. It skips with a clear NOTE when the folder is
// absent, which it is in every worktree and every fresh clone (it is gitignored and
// local-only). Aggregates only: the probe prints file names and counts, never a space
// reference, a status, a name or a coordinate.
//
// Every checked figure is tagged in the HTML:
//   <div data-price="lug.space">$5,495</div>
//   <td data-fee="oc.ground">$985</td>
//   <td data-range="memorials">$2,015&ndash;$5,670</td>
//   <div data-rights="urn-garden">1 or 2 rights per space</div>
//
// Run from repo root:  node scripts/verify_urn_garden_ranges.mjs
import fs from 'fs';
import path from 'path';

const PAGE = 'urn-gardens-guide.html';
const html = fs.readFileSync(PAGE, 'utf8');
const app = fs.readFileSync('index.html', 'utf8');
const prices = JSON.parse(fs.readFileSync('data/prices.json', 'utf8'));

let bad = 0;
const fail = (m) => { bad++; console.log('  FAIL  ' + m); };
const ok = (m) => console.log('   ok   ' + m);
const note = (m) => console.log('  NOTE  ' + m);

const money = (n) => '$' + n.toLocaleString('en-US');
const rangeStr = (lo, hi) => `${money(lo)}&ndash;${money(hi)}`;

// ── the tool's own cemetery price list ───────────────────────────────────────
// `lake_urn|5495|825` — value, then the space price, then endowment care. The option
// appears more than once (the quote builder and the comparison panel); they must agree
// with each other before either is believed.
const lakeOpts = [...app.matchAll(/<option value="lake_urn\|(\d+)\|(\d+)"/g)]
  .map((m) => [Number(m[1]), Number(m[2])]);
if (!lakeOpts.length) fail('index.html has no `lake_urn|<price>|<ecf>` option — the price list moved');
const uniq = [...new Set(lakeOpts.map((p) => p.join('|')))];
if (uniq.length > 1) fail(`index.html prices the Lake Urn Garden inconsistently: ${uniq.join('  vs  ')}`);
const [LUG_SPACE, LUG_ECF] = lakeOpts[0] || [0, 0];

// The five bronze memorials whose labels name an urn garden, plus the boulder cap and
// the second-right memorial that go with them. Matched on the LABEL, so a renamed or
// deleted product fails loudly instead of silently dropping out of the range.
const MEMORIALS = [
  ['mem.cremorial',   /<option value="(\d+)\|[^"]*">Cremorial Unit \(Rose\/Lake\/Vets Urn Gardens\)/],
  ['mem.lug',         /<option value="(\d+)\|[^"]*">Lake Urn Garden Memorial/],
  ['mem.gasser',      /<option value="(\d+)\|[^"]*">Bronze Single &ndash; Gasser Olds \(Lake Urn Garden\)|<option value="(\d+)\|[^"]*">Bronze Single – Gasser Olds \(Lake Urn Garden\)/],
  ['mem.second',      /<option value="(\d+)\|[^"]*">2nd Right Memorial/],
  ['mem.bouldercap',  /<option value="(\d+)\|[^"]*">Bronze Boulder Cap/],
];
const MEM = {};
for (const [key, re] of MEMORIALS) {
  const m = re.exec(app);
  if (!m) { fail(`index.html no longer offers the memorial behind data-price="${key}"`); continue; }
  MEM[key] = Number(m[1] ?? m[2]);
}
const memValues = Object.values(MEM);

// ── data/prices.json ─────────────────────────────────────────────────────────
const feeOf = (k) => {
  const v = prices.current.fees[k];
  if (v === undefined) { fail(`data/prices.json has no current fee "${k}"`); return 0; }
  return v;
};

console.log('=== SOURCES ===');
console.log(`   index.html   Lake Urn Garden space ${money(LUG_SPACE)}, endowment care ${money(LUG_ECF)}` +
            ` (${lakeOpts.length} option(s), in agreement)`);
console.log(`   index.html   ${memValues.length} urn-garden bronze memorials`);
console.log(`   prices.json  schema ${prices.schema}, generated ${prices.generated}`);

// ── expected figures ─────────────────────────────────────────────────────────
const PRICES = {
  'lug.space': money(LUG_SPACE),
  ...Object.fromEntries(Object.entries(MEM).map(([k, v]) => [k, money(v)])),
};
const FEES = {
  'lug.ECF': money(LUG_ECF),
  'oc.ground': money(feeOf('OC:ground_inurnment')),
  'oc.boulder': money(feeOf('OC:boulder_inurnment')),
  'rec.all': money(feeOf('RECORDING:all')),
};
const RANGES = {
  memorials: memValues.length ? rangeStr(Math.min(...memValues), Math.max(...memValues)) : null,
};

const tagged = (attr, key) => {
  const re = new RegExp(`<[^>]*\\b${attr}="${key}"[^>]*>([\\s\\S]*?)</`, 'g');
  return [...html.matchAll(re)].map((m) => m[1].trim());
};

function compare(label, attr, table) {
  console.log(`\n=== ${label} ===`);
  for (const [key, want] of Object.entries(table)) {
    if (want === null) { fail(`cannot compute ${attr}="${key}" — a source is missing`); continue; }
    const found = tagged(attr, key);
    if (!found.length) { fail(`no element carries ${attr}="${key}"`); continue; }
    for (const got of found) {
      if (got === want) ok(`${attr}="${key}"`.padEnd(30) + got);
      else fail(`${attr}="${key}": page prints "${got}", source says "${want}"`);
    }
  }
}

compare('PRINTED PRICES vs index.html', 'data-price', PRICES);
compare('PRINTED FEES vs SOURCES', 'data-fee', FEES);
compare('PRINTED RANGES', 'data-range', RANGES);

// ── the Rose Urn Garden has no published price, and must not grow one ────────
// The one figure on this page that is NOT computed is the Rose Urn Garden's, because
// no source in either repo carries it. The page therefore prints a prompt to ask,
// not a number. If somebody types a price in, this fires: a hand-typed price is
// exactly what the rest of this script exists to prevent.
console.log('\n=== ROSE URN GARDEN (no published price) ===');
{
  const got = tagged('data-price', 'rug.space');
  if (!got.length) fail('no element carries data-price="rug.space"');
  else for (const g of got) {
    if (/\$\s*[\d,]/.test(g)) fail(`data-price="rug.space" prints a price ("${g}") — no source publishes one; it must stay a prompt to ask`);
    else ok('data-price="rug.space"'.padEnd(30) + `"${g}" — a prompt, not a number`);
  }
}

// ── the rights band ──────────────────────────────────────────────────────────
// The operator's slide, 2026-07-29: "1 OR 2 Rights Per Space". Asserted verbatim so it
// cannot drift, and because index.html's own SECTION_SHAPES entry records the Lake Urn
// Garden as capacity 1 (2026-07-27) — the two disagree and the operator's later slide
// governs this page. Pinning the string makes the disagreement visible if either moves.
console.log('\n=== RIGHTS BAND ===');
{
  const want = '1 or 2 rights per space';
  const got = tagged('data-rights', 'urn-garden');
  if (!got.length) fail('no element carries data-rights="urn-garden"');
  else for (const g of got) {
    if (g.toLowerCase() === want) ok('data-rights="urn-garden"'.padEnd(30) + g);
    else fail(`data-rights="urn-garden": page prints "${g}", the operator's slide says "${want}"`);
  }
}

// ── map-repo probe (price aggregates only) ───────────────────────────────────
console.log('\n=== MAP REPO PROBE (price aggregates only) ===');
{
  const MAP_DATA = path.resolve('..', 'bw-quote-tool', 'wmp-cemetery-map', 'data');
  const ALT = 'C:/Users/Martice/bw-quote-tool/wmp-cemetery-map/data';
  const root = fs.existsSync(MAP_DATA) ? MAP_DATA : (fs.existsSync(ALT) ? ALT : null);
  if (!root) {
    note('wmp-cemetery-map/ is not present — the map-repo price probe DID NOT RUN.');
    note('That is expected in a worktree or a fresh clone: the map repo is gitignored');
    note('and local-only. Every figure above still reconciled against in-repo sources.');
  } else {
    // Urn-garden data lives under gardenLUG/ (Lake) and garden18/ (the Rose Urn Garden
    // sits in the Garden of Flowers, section 18). Walk every JSON and record only
    // WHICH FILES carry a `price` field and how many — no values, no space references.
    const priced = [];
    (function walk(d) {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) { if (e.name !== 'search' && e.name !== 'aerial') walk(p); continue; }
        if (!e.name.endsWith('.json')) continue;
        const n = (fs.readFileSync(p, 'utf8').match(/"price"/g) || []).length;
        if (n) priced.push([path.relative(root, p).replace(/\\/g, '/'), n]);
      }
    })(root);

    console.log(`        files under wmp-cemetery-map/data/ carrying a price field: ${priced.length}`);
    for (const [f, n] of priced) console.log(`          ${f.padEnd(30)} ${n} priced records`);

    const URN = /^(gardenLUG|garden18)\//;
    const urnPriced = priced.filter(([f]) => URN.test(f));
    if (urnPriced.length) {
      fail(`the map repo now prices urn-garden data (${urnPriced.map(([f]) => f).join(', ')}) —`);
      fail('  it is a better source than the tool price list this page uses. Recompute the');
      fail('  ranges from it, per the sprint-08 Track U price exception, and update this probe.');
    } else {
      ok('no urn-garden file in the map repo carries a price — the page\'s in-repo sources stand');
    }
  }
}

console.log('');
console.log(bad ? `${bad} check(s) failed` : 'all urn-garden figures reconcile against their sources');
process.exit(bad ? 1 : 0);
