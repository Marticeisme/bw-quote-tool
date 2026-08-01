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
//   data/prices.json  current.fees → OC:boulder_inurnment, RECORDING:all. The canonical
//               shared schedule (DESIGN §7); never hand-edited, rebuilt by the map's
//               build-prices.py.
//
//   THE 2026-07-31 SHEET (added sprint-09 Track U). Operator-supplied, verbatim from
//               E:\Downloads\URN_GARDEN___GARDEN_OF_VERSES_PACKAGES_06_2026.xlsx — the
//               06/2026 urn-garden & Garden of Verses packages sheet. It is NEWER than
//               data/prices.json (generated 2026-07-26) and newer than the sprint-08
//               slide, so where it speaks it wins. Hardcoded in SHEET below because
//               there is no machine-readable copy of it in either repo; every figure
//               taken from it is dated in that block and cross-checked against
//               index.html wherever index.html carries the same figure.
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
//   <td data-fee="oc.ground">$875</td>
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

// ── THE 2026-07-31 SHEET (operator-supplied, 06/2026 packages) ───────────────
// Transcribed verbatim from URN_GARDEN___GARDEN_OF_VERSES_PACKAGES_06_2026.xlsx on
// 2026-07-31. Sprint-09 Track U. These are the EXPECTATION for every urn-garden figure
// the sheet speaks to; the sheet outranks data/prices.json (2026-07-26) and the
// sprint-08 slide. Anything the sheet is silent on (boulder inurnment, the boulder cap,
// the 2nd-right memorial) still comes from the in-repo sources above.
const SHEET = {
  lug_space: 5495, lug_ecf: 825,          // Lake Urn Garden, all four packages
  rug_space: 4395, rug_ecf: 660,          // Rose Urn Garden, inside AND outside perimeter
  coh_space: 4395, coh_ecf: 660,          // Court of Honor companion cremorial
  gov_space: 325,  gov_ecf: 50,           // Garden of Verses, burial and niches
  oc_each: 875,                           // O&C, every urn-garden column (flat)
  recording: 235,                         // Recording, every urn-garden column
  mem_setting: 495,                       // Memorial setting fee, every urn-garden column
  vault_setting: 575,                     // Urn vault setting, every urn-garden column
  // Memorial prices are the MARKER ONLY on the sheet; index.html's qBronze option value
  // is `total|marker|foundation|setting`, so total = marker + setting. Checked that way.
  mem_marker: {
    'mem.cremorial': 5175,                // Bronze Std Scroll #952 (Coldspring) 8.5x4.5
    'mem.lug':       2415,                // Scroll #30430 / Ribbon #S06 (Matthews) 2x8
    'mem.gasser':    2220,                // Flat Bronze (Matthews) 12x8, Gasser Olds only
  },
};

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

// `rose_urn|4395|660` — added to the tool by sprint-09 Track U off the 2026-07-31 sheet.
// Same two-place agreement check as the Lake Urn Garden.
const roseOpts = [...app.matchAll(/<option value="rose_urn\|(\d+)\|(\d+)"/g)]
  .map((m) => [Number(m[1]), Number(m[2])]);
if (!roseOpts.length) fail('index.html has no `rose_urn|<price>|<ecf>` option — the Rose Urn Garden is unpriced in the tool');
const uniqRose = [...new Set(roseOpts.map((p) => p.join('|')))];
if (uniqRose.length > 1) fail(`index.html prices the Rose Urn Garden inconsistently: ${uniqRose.join('  vs  ')}`);
const [ROSE_SPACE, ROSE_ECF] = roseOpts[0] || [0, 0];

// The five bronze memorials whose labels name an urn garden, plus the boulder cap and
// the second-right memorial that go with them. Matched on the LABEL, so a renamed or
// deleted product fails loudly instead of silently dropping out of the range.
// The option VALUE is `total|marker|foundation|setting`, all four captured so the sheet's
// marker-only prices and its $495 setting fee can be checked against the tool (Track U,
// sprint-09) — before this the script only read the total and could not see either.
const MEMORIALS = [
  ['mem.cremorial',   /<option value="([\d|]+)">Cremorial Unit \(Rose\/Lake\/Vets Urn Gardens\)/],
  ['mem.lug',         /<option value="([\d|]+)">Lake Urn Garden Memorial/],
  ['mem.gasser',      /<option value="([\d|]+)">Bronze Single &ndash; Gasser Olds \(Lake Urn Garden\)|<option value="([\d|]+)">Bronze Single – Gasser Olds \(Lake Urn Garden\)/],
  ['mem.second',      /<option value="([\d|]+)">2nd Right Memorial/],
  ['mem.bouldercap',  /<option value="([\d|]+)">Bronze Boulder Cap/],
];
const MEM = {};      // key → total
const MEM_PARTS = {};// key → [total, marker, foundation, setting]
for (const [key, re] of MEMORIALS) {
  const m = re.exec(app);
  if (!m) { fail(`index.html no longer offers the memorial behind data-price="${key}"`); continue; }
  const parts = (m[1] ?? m[2]).split('|').map(Number);
  MEM[key] = parts[0];
  MEM_PARTS[key] = parts;
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
console.log(`   index.html   Rose Urn Garden space ${money(ROSE_SPACE)}, endowment care ${money(ROSE_ECF)}` +
            ` (${roseOpts.length} option(s), in agreement)`);
console.log(`   index.html   ${memValues.length} urn-garden bronze memorials`);
console.log(`   SHEET        URN_GARDEN___GARDEN_OF_VERSES_PACKAGES_06_2026.xlsx, operator-supplied 2026-07-31`);
console.log(`   prices.json  schema ${prices.schema}, generated ${prices.generated}`);

// ── expected figures ─────────────────────────────────────────────────────────
const PRICES = {
  'lug.space': money(LUG_SPACE),
  'rug.space': money(ROSE_SPACE),
  ...Object.fromEntries(Object.entries(MEM).map(([k, v]) => [k, money(v)])),
};
const FEES = {
  'lug.ECF': money(LUG_ECF),
  'rug.ECF': money(ROSE_ECF),
  // The SHEET, not prices.json. The 06/2026 sheet prices O&C at a flat $875 in every
  // urn-garden column; data/prices.json still carries OC:ground_inurnment = $985 from
  // before the sheet existed. prices.json is a GENERATED file (DESIGN §7 — rebuilt by
  // the map's build-prices.py, never hand-edited), so it cannot be corrected from this
  // repo; the divergence is reported below and is an operator item.
  'oc.ground': money(SHEET.oc_each),
  // The sheet has no boulder column at all, so prices.json still governs here.
  'oc.boulder': money(feeOf('OC:boulder_inurnment')),
  'rec.all': money(feeOf('RECORDING:all')),
  'mem.setting': money(SHEET.mem_setting),
  'vault.setting': money(SHEET.vault_setting),
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

// ── the Rose Urn Garden now HAS a published price ────────────────────────────
// INVERTED, sprint-09 Track U, 2026-07-31. Until the 06/2026 packages sheet arrived no
// source in either repo priced the Rose Urn Garden, so this gate FAILED when a number
// was typed in and the page printed "Ask us today's price". The sheet publishes it —
// $4,395 space + $660 endowment care, inside and outside the rose perimeter alike — so
// the gate now asserts the opposite: the page must print the number, and it must be the
// sheet's number. A page that has gone back to "ask us" fails here.
console.log('\n=== ROSE URN GARDEN (published 06/2026) ===');
{
  const got = tagged('data-price', 'rug.space');
  if (!got.length) fail('no element carries data-price="rug.space"');
  else for (const g of got) {
    if (!/\$\s*[\d,]/.test(g)) fail(`data-price="rug.space" prints "${g}" — the 2026-07-31 sheet publishes ${money(SHEET.rug_space)}; it must print the price, not a prompt`);
    else if (g !== money(SHEET.rug_space)) fail(`data-price="rug.space": page prints "${g}", the 2026-07-31 sheet says "${money(SHEET.rug_space)}"`);
    else ok('data-price="rug.space"'.padEnd(30) + `${g} — the sheet's published price`);
  }
}

// ── guide ↔ SHEET ↔ index.html reconciliation ────────────────────────────────
// Everything above compares the PAGE against the TOOL. This block compares the TOOL
// against the SHEET, so a figure cannot be wrong in the same way in both places.
console.log('\n=== index.html vs THE 2026-07-31 SHEET ===');
{
  const cmp = (what, got, want) => {
    if (got === want) ok(`${what}`.padEnd(46) + money(got));
    else fail(`${what}: index.html says ${money(got)}, the 2026-07-31 sheet says ${money(want)}`);
  };
  cmp('Lake Urn Garden space', LUG_SPACE, SHEET.lug_space);
  cmp('Lake Urn Garden endowment care', LUG_ECF, SHEET.lug_ecf);
  cmp('Rose Urn Garden space', ROSE_SPACE, SHEET.rug_space);
  cmp('Rose Urn Garden endowment care', ROSE_ECF, SHEET.rug_ecf);

  // Court of Honor companion cremorial and the Garden of Verses packages.
  const opt = (code) => {
    const m = new RegExp(`<option value="${code}\\|(\\d+)\\|(\\d+)"`).exec(app);
    if (!m) { fail(`index.html has no \`${code}|<price>|<ecf>\` option — the sheet prices it`); return null; }
    return [Number(m[1]), Number(m[2])];
  };
  for (const [code, sp, ecf, label] of [
    ['coh_cremorial', SHEET.coh_space, SHEET.coh_ecf, 'Court of Honor comp. cremorial'],
    ['verses_burial', SHEET.gov_space, SHEET.gov_ecf, 'Garden of Verses – burial'],
    ['verses_niches', SHEET.gov_space, SHEET.gov_ecf, 'Garden of Verses – niches'],
  ]) {
    const v = opt(code);
    if (!v) continue;
    cmp(`${label} space`, v[0], sp);
    cmp(`${label} endowment care`, v[1], ecf);
  }

  // Memorials: the sheet prices the MARKER, the tool's option value is
  // `total|marker|foundation|setting`. Both halves are checked, which is what proves
  // the tool's totals ($5,670 / $2,910 / $2,715) are the sheet's markers plus $495.
  for (const [key, want] of Object.entries(SHEET.mem_marker)) {
    const parts = MEM_PARTS[key];
    if (!parts) { fail(`no index.html option behind ${key} — cannot check it against the sheet`); continue; }
    cmp(`${key} marker`, parts[1], want);
    cmp(`${key} setting fee`, parts[3], SHEET.mem_setting);
    if (parts[0] !== parts[1] + parts[2] + parts[3]) {
      fail(`${key}: option total ${money(parts[0])} != marker+foundation+setting ${money(parts[1] + parts[2] + parts[3])}`);
    } else ok(`${key} total = marker+foundation+setting`.padEnd(46) + money(parts[0]));
  }

  // The urn vault setting fee is hardcoded in the quote builder, not in prices.json.
  const vs = /<label for="qSettingCrem">Cremation Vault Setting &mdash; \$([\d,]+)<\/label>/.exec(app)
          || /<label for="qSettingCrem">Cremation Vault Setting — \$([\d,]+)<\/label>/.exec(app);
  if (!vs) fail('index.html no longer carries the Cremation Vault Setting label — cannot check the sheet\'s $575');
  else cmp('urn/cremation vault setting', Number(vs[1].replace(/,/g, '')), SHEET.vault_setting);
}

// ── where the sheet and data/prices.json disagree ────────────────────────────
// Reported, never auto-corrected: prices.json is generated by the map's
// build-prices.py (DESIGN §7) and cannot be fixed from this repo.
console.log('\n=== SHEET vs data/prices.json ===');
{
  const pjGround = prices.current.fees['OC:ground_inurnment'];
  if (pjGround === SHEET.oc_each) {
    ok('OC:ground_inurnment'.padEnd(30) + `${money(pjGround)} — agrees with the sheet`);
  } else {
    note(`data/prices.json OC:ground_inurnment = ${money(pjGround)}, the 2026-07-31 sheet prices`);
    note(`every urn-garden O&C at ${money(SHEET.oc_each)}. The guide prints the SHEET's figure.`);
    note('prices.json is GENERATED — fix the source and rerun the map\'s build-prices.py.');
    note('OPERATOR ITEM: until then the tool bills urn-garden ground inurnment at ' + money(pjGround) + '.');
  }
  const pjRec = prices.current.fees['RECORDING:all'];
  if (pjRec === SHEET.recording) ok('RECORDING:all'.padEnd(30) + `${money(pjRec)} — agrees with the sheet`);
  else fail(`data/prices.json RECORDING:all = ${money(pjRec)}, the sheet says ${money(SHEET.recording)}`);
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
