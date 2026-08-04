// Reconcile every price figure, fee and count printed on glass-front-niches-guide.html
// against the live datasets it is derived from. The page must never carry a range that
// was typed from memory: each one is recomputed here from the module and compared
// string-for-string. Mirrors scripts/verify_granite_niche_ranges.mjs (Track P).
//
//   ECL   scripts/ecl-niche-data.mjs    range = min/max price of AVAILABLE niches
//   MVC   scripts/mvc-niche-data.mjs    range = min/max price of the 145 island openings
//                                       (the module carries no per-niche status: the
//                                       island is new inventory. The Terrace Garden was
//                                       moved OUT of this module in sprint-08, so the
//                                       range is the 145-opening island and nothing else.)
//   RAD   scripts/com-crypt-data.mjs    range = min/max price of AVAILABLE Radiance cells
//   SER   scripts/com-crypt-data.mjs    range = min/max price of AVAILABLE Serenity cells
//
// Fees are checked the same way against each location's own FEES export. **The core
// schedule is now IDENTICAL at all three locations** — operator ruling, Map Issues
// 07.31.26: O&C $875, recording $235, E.C.F. 10%, no inscription fee anywhere, and no
// sales tax on a glass-front niche except ECL's optional bronze scroll and vase. Before
// that ruling the three carried three different schedules read off three sheet footers.
//
// What must still never be cross-applied is what remains LOCAL: the Chapel of Memories
// CRYPT vase ($415, a different product), the ECL vase ($370) and the ECL-only 10.4%
// add-on tax. Dedicated cross-contamination checks are below.
//
// Every checked figure is tagged in the HTML:
//   <div data-range="ecl">$10,995–$82,500</div>
//   <td data-fee="ecl.OC">$875</td>
//   <b data-count="ecl.available">28</b>
//   <span data-rights="mvc">2–4 rights of interment</span>
//
// Run from repo root:  node scripts/verify_glass_niche_ranges.mjs
import fs from 'fs';
import * as ECL from './ecl-niche-data.mjs';
import * as MVC from './mvc-niche-data.mjs';
import * as COM from './com-crypt-data.mjs';
import { assertPrintRule } from './_print_rule_assert.mjs';
import { typicalStr } from './_typical_band.mjs';

const PAGE = 'glass-front-niches-guide.html';
const html = fs.readFileSync(PAGE, 'utf8');

let bad = 0;
const fail = (m) => { bad++; console.log('  FAIL  ' + m); };
const ok = (m) => console.log('   ok   ' + m);

const money = (n) => '$' + n.toLocaleString('en-US');
const rangeStr = (lo, hi) => `${money(lo)}&ndash;${money(hi)}`;
const minmax = (xs) => [Math.min(...xs), Math.max(...xs)];

// ── compute every expected figure from the modules ───────────────────────────
const eclAll = Object.entries(ECL.WALLS).flatMap(([f, w]) => w.niches.map((n) => ({ f, ...n })));
const eclAvail = eclAll.filter((n) => n.st === 'available');
const mvcAll = MVC.allNiches();
const radAll = COM.wallNiches('RAD');
const serAll = COM.wallNiches('SER');
const radAvail = radAll.filter((n) => n.st === 'available');
const serAvail = serAll.filter((n) => n.st === 'available');

const [eclLo, eclHi] = minmax(eclAvail.map((n) => n.p));
const [mvcLo, mvcHi] = minmax(mvcAll.map((n) => n.price));
const [radLo, radHi] = minmax(radAvail.map((n) => n.p));
const [serLo, serHi] = minmax(serAvail.map((n) => n.p));
// `urn` on an MVC cell is its RIGHTS COUNT, not an urn dimension (see mvc-niche-data.mjs).
const [rightsLo, rightsHi] = minmax(mvcAll.map((n) => n.urn));

console.log('=== DATASETS ===');
console.log(`   ECL   ${eclAll.length} niches, ${eclAvail.length} available`);
console.log(`   MVC   ${mvcAll.length} island openings`);
console.log(`   RAD   ${radAll.length} cells, ${radAvail.length} available`);
console.log(`   SER   ${serAll.length} cells, ${serAvail.length} available`);

// ── ranges ───────────────────────────────────────────────────────────────────
const eclP = eclAvail.map((n) => n.p);
const mvcP = mvcAll.map((n) => n.price);
const radP = radAvail.map((n) => n.p);
const serP = serAvail.map((n) => n.p);
const glassP = [...eclP, ...mvcP, ...radP, ...serP];
const [glassLo, glassHi] = minmax(glassP);

const RANGES = {
  ecl: rangeStr(eclLo, eclHi),
  mvc: rangeStr(mvcLo, mvcHi),
  rad: rangeStr(radLo, radHi),
  ser: rangeStr(serLo, serHi),
  // The whole glass-front population, the figure the 2026-08-02 ruling was aimed at.
  glass: rangeStr(glassLo, glassHi),
};

// ── THE TYPICAL BAND (operator ruling, 2026-08-02) ───────────────────────────
// "a very wide price range — also give a median price range on the glass front niches."
// Each location's card, and the at-a-glance table, now LEAD with the middle 50% of the
// prices that are actually for sale there and keep the full span as a secondary line.
// Method and reasoning: scripts/_typical_band.mjs. Recomputed here from the same arrays
// the ranges come from, and compared string-for-string, so a hand-typed band fails.
const TYPICAL = {
  ecl: typicalStr(eclP),
  mvc: typicalStr(mvcP),
  rad: typicalStr(radP),
  ser: typicalStr(serP),
  glass: typicalStr(glassP),
};

const tagged = (attr, key) => {
  const re = new RegExp(`<[^>]*\\b${attr}="${key}"[^>]*>([\\s\\S]*?)</`, 'g');
  return [...html.matchAll(re)].map((m) => m[1].trim());
};

console.log('\n=== PRINTED RANGES vs MODULES ===');
for (const [key, want] of Object.entries(RANGES)) {
  const found = tagged('data-range', key);
  if (!found.length) { fail(`no element carries data-range="${key}"`); continue; }
  for (const got of found) {
    if (got === want) ok(`data-range="${key}"`.padEnd(26) + got);
    else fail(`data-range="${key}": page prints "${got}", module says "${want}"`);
  }
}

console.log('\n=== PRINTED TYPICAL BANDS vs MODULES ===');
{
  const seen = new Set();
  for (const [key, want] of Object.entries(TYPICAL)) {
    const found = tagged('data-typical', key);
    if (!found.length) { fail(`no element carries data-typical="${key}"`); continue; }
    seen.add(key);
    for (const got of found) {
      if (got === want) ok(`data-typical="${key}"`.padEnd(26) + got);
      else fail(`data-typical="${key}": page prints "${got}", module says "${want}"`);
    }
  }
  // A band nobody can recompute is worse than no band — it looks authoritative and is not.
  for (const m of html.matchAll(/\bdata-typical="([^"]+)"/g)) {
    if (!(m[1] in TYPICAL)) fail(`data-typical="${m[1]}": no population is defined for that key`);
  }
  // The band must be TIGHTER than the span it leads, or it is decoration.
  const span = (s) => { const [lo, hi] = s.split('&ndash;').map((x) => +x.replace(/[$,]/g, '')); return hi / lo; };
  for (const key of seen) {
    const f = span(RANGES[key]), t = span(TYPICAL[key]);
    if (t < f) ok(`the ${key} band spans ${t.toFixed(1)}x inside a full range of ${f.toFixed(1)}x`);
    else fail(`the ${key} band spans ${t.toFixed(1)}x, no tighter than its ${f.toFixed(1)}x full range`);
  }
  // The band leads and the full range follows. Asserted by position, because the whole
  // point of the ruling is which number a family reads first.
  for (const key of ['ecl', 'mvc', 'rad', 'ser', 'glass']) {
    const iT = html.indexOf(`data-typical="${key}"`);
    const iR = html.indexOf(`data-range="${key}"`);
    if (iT > -1 && iR > -1 && iT < iR) ok(`the ${key} band is printed BEFORE its full range`);
    else fail(`the ${key} full range appears before its typical band — the wide span leads again`);
  }
}

// ── counts ───────────────────────────────────────────────────────────────────
// A count printed as reassurance ("28 of 85 available") rots exactly as fast as a price.
const faceCount = (f) => ECL.WALLS[f].niches.length;
const COUNTS = {
  'ecl.S': faceCount('S'), 'ecl.N': faceCount('N'), 'ecl.W': faceCount('W'), 'ecl.E': faceCount('E'),
  'ecl.total': eclAll.length, 'ecl.available': eclAvail.length,
  'mvc.east': mvcAll.filter((n) => n.wall === 'east').length,
  'mvc.west': mvcAll.filter((n) => n.wall === 'west').length,
  'mvc.north': mvcAll.filter((n) => n.wall === 'north').length,
  'mvc.south': mvcAll.filter((n) => n.wall === 'south').length,
  'mvc.total': mvcAll.length,
  'rad.total': radAll.length, 'rad.available': radAvail.length,
  'ser.total': serAll.length, 'ser.available': serAvail.length,
};

console.log('\n=== PRINTED COUNTS vs MODULES ===');
for (const [key, want] of Object.entries(COUNTS)) {
  const found = tagged('data-count', key);
  if (!found.length) { fail(`no element carries data-count="${key}"`); continue; }
  for (const got of found) {
    if (got === String(want)) ok(`data-count="${key}"`.padEnd(26) + got);
    else fail(`data-count="${key}": page prints "${got}", module says "${want}"`);
  }
}

// ── the MVC rights band ──────────────────────────────────────────────────────
console.log('\n=== MVC RIGHTS BAND ===');
{
  const want = `${rightsLo}&ndash;${rightsHi} rights of interment`;
  const found = tagged('data-rights', 'mvc');
  if (!found.length) fail('no element carries data-rights="mvc"');
  else for (const got of found) {
    if (got === want) ok(`data-rights="mvc"`.padEnd(26) + got);
    else fail(`data-rights="mvc": page prints "${got}", module says "${want}"`);
  }
}

// ── the ECL rights figure (operator ruling 2026-08-01) ───────────────────────
// "ecl niches are two rights each." Before that ruling this guide deliberately said
// NOTHING about ECL capacity, because the ECL sheet is silent.
//
// RAD/SER RULED 2026-08-04. Until today this block asserted the guide stayed SILENT on
// Radiance/Serenity capacity, because their sheets' "(2)" was unexplained. The operator
// has now ruled: "The radiance and serenity niche walls both come with the rights for
// two urns placed inside. every niche in our cemetery for that matter comes with the
// rights for two urns." So the footnote must STATE two rights, tagged
// data-rights="radser", and the old silence assertion inverts.
console.log('\n=== ECL RIGHTS (operator ruling 2026-08-01) ===');
{
  const want = `${ECL.RIGHTS} rights of interment`;
  const found = tagged('data-rights', 'ecl');
  if (!found.length) fail('no element carries data-rights="ecl"');
  else for (const got of found) {
    if (got === want) ok(`data-rights="ecl"`.padEnd(26) + got);
    else fail(`data-rights="ecl": page prints "${got}", module says "${want}"`);
  }
  const rs = tagged('data-rights', 'radser');
  if (!rs.length) fail('no element carries data-rights="radser" (operator ruling 2026-08-04: two rights per niche)');
  else for (const got of rs) {
    if (got === '2 rights of interment') ok(`data-rights="radser"`.padEnd(26) + got);
    else fail(`data-rights="radser": page prints "${got}", the 2026-08-04 ruling says "2 rights of interment"`);
  }
  const silent = /Neither niche sheet states how many people may be placed in one niche/.test(html);
  (silent ? fail : ok)('the old capacity-silence sentence is gone (superseded by the 2026-08-04 ruling)');
}

// ── fees ─────────────────────────────────────────────────────────────────────
// A rate (0 < v < 1) prints as a percentage; anything else as dollars.
const feeStr = (v) => (v > 0 && v < 1 ? +(v * 100).toFixed(1) + '%' : money(v));
// Radiance and Serenity share ONE fee box (com-crypt-data.mjs NICHE_FEES) — the page
// prints it once and tags it `rad.*`.
const FEE_SOURCES = { ecl: ECL.FEES, mvc: MVC.FEES, rad: COM.NICHE_FEES, ser: COM.NICHE_FEES };

console.log('\n=== FEES vs MODULES ===');
for (const m of html.matchAll(/<[^>]*\bdata-fee="([a-z]+)\.([A-Z_]+)"[^>]*>([\s\S]*?)<\//g)) {
  const [, area, key, raw] = m;
  const got = raw.trim();
  const src = FEE_SOURCES[area];
  if (!src) { fail(`data-fee="${area}.${key}": no fee schedule exists for "${area}"`); continue; }
  if (!(key in src)) { fail(`data-fee="${area}.${key}": ${area} module has no FEES.${key}`); continue; }
  const want = feeStr(src[key]);
  if (got === want) ok(`data-fee="${area}.${key}"`.padEnd(26) + got);
  else fail(`data-fee="${area}.${key}": page prints "${got}", module says "${want}"`);
}

// ── the uniform glass-front schedule (operator, Map Issues 07.31.26) ─────────
// "All glass front niches should have the same opening and closing and recording fee.
//  Also there is no inscription fee on any glass front niche. The opening and closing
//  fee is 875 and the recording fee is 235 same 10% ecf applies. There will be no tax
//  on a glass front niche unless its ecl and they add the vase and scroll"
//
// Before 2026-07-31 the three locations carried three different schedules, taken from
// three different sheet footers ($835/$225 at ECL and Radiance/Serenity, $875/$235 plus
// a $660 inscription and 10.4% tax at MVC). They are now ONE schedule, and this section
// asserts that with literals rather than by echoing the modules back at themselves.
console.log('\n=== UNIFORM GLASS-FRONT FEE SCHEDULE ===');
{
  const SCHEDULE = [
    ['ECL', ECL.FEES.OC, ECL.FEES.REC, ECL.FEES.ECF_RATE],
    ['MVC', MVC.FEES.OC, MVC.FEES.REC, MVC.FEES.ECF_RATE],
    ['RAD/SER', COM.NICHE_FEES.OC, COM.NICHE_FEES.RECORDING, COM.NICHE_FEES.ECF_RATE],
  ];
  for (const [name, oc, rec, ecf] of SCHEDULE) {
    if (oc === 875 && rec === 235 && ecf === 0.1) ok(`${name.padEnd(8)} O&C $875 · recording $235 · E.C.F. 10%`);
    else fail(`${name}: schedule is ${money(oc)} / ${money(rec)} / ${ecf * 100}%, must be $875 / $235 / 10%`);
  }

  // No inscription fee exists on any glass-front niche, in any module or on the page.
  for (const [name, fees] of [['ECL', ECL.FEES], ['MVC', MVC.FEES], ['RAD/SER', COM.NICHE_FEES]]) {
    const has = Object.keys(fees).filter((k) => /INSCR/i.test(k));
    if (has.length) fail(`${name} still exports an inscription fee (${has.join(', ')})`);
    else ok(`${name.padEnd(8)} exports no inscription fee`);
  }
  const inscrAmounts = [...html.matchAll(/Inscription[^<]*<\/td>\s*<td[^>]*>([^<]*)</g)].map((m) => m[1].trim());
  if (inscrAmounts.length !== 3) fail(`expected 3 "Inscription" fee rows (one per location), found ${inscrAmounts.length}`);
  else if (inscrAmounts.every((v) => v === 'none')) ok('all three fee tables print Inscription = none');
  else fail(`an Inscription row prints an amount: ${inscrAmounts.join(', ')}`);
  if (html.includes('$660')) fail('the $660 granite-front inscription fee appears on this glass-front page');
  else ok('the $660 granite-front inscription fee appears nowhere on this page');

  // Tax: ECL's two bronze add-ons and nothing else.
  if (!('TAX' in MVC.FEES) && !('TAX' in COM.NICHE_FEES)) ok('MVC and Radiance/Serenity export no tax rate at all');
  else fail('MVC or Radiance/Serenity still exports a tax rate — glass-front niches are not taxed');
  if (ECL.FEES.TAX === 0.104) ok('ECL exports the 10.4% add-on tax rate for the scroll and vase');
  else fail(`ECL add-on tax rate is ${ECL.FEES.TAX}, must be 0.104`);
}

// ── no fee schedule may leak from one location into another ──────────────────
// The O&C, recording fee and E.C.F. are now deliberately IDENTICAL everywhere, so the
// cross-contamination risk has moved: what must not leak is the crypt fee box, the ECL
// vase, and the ECL-only tax line.
console.log('\n=== NO CROSS-APPLIED FEES ===');
{
  const at = (id) => html.indexOf(`id="${id}"`);
  const slice = (a, b) => html.slice(at(a), at(b));
  const SECTIONS = { ecl: slice('ecl', 'mvc'), mvc: slice('mvc', 'com'), com: slice('com', 'glance') };

  const cryptVase = money(COM.CRYPT_FEES.VASE);
  if (html.includes(cryptVase)) fail(`the Chapel of Memories CRYPT vase (${cryptVase}) appears on a NICHE page`);
  else ok(`the crypt vase (${cryptVase}) appears nowhere — this page prices niches, not crypts`);

  const eclVase = money(ECL.FEES.VASE);
  const strays = ['mvc', 'com'].filter((s) => SECTIONS[s].includes(eclVase));
  if (strays.length) fail(`the ECL vase (${eclVase}) appears in the ${strays.join(', ')} section(s)`);
  else ok(`the ECL vase (${eclVase}) stays inside the Eternal Light section`);

  const taxRate = feeStr(ECL.FEES.TAX);
  const taxStrays = ['mvc', 'com'].filter((s) => SECTIONS[s].includes(taxRate));
  if (taxStrays.length) fail(`the ${taxRate} add-on tax appears in the ${taxStrays.join(', ')} section(s) — only ECL is taxed`);
  else ok(`the ${taxRate} add-on tax stays inside the Eternal Light section`);
}

// ── the "Sizes, and What Fits" section is GONE (operator, 2026-07-31) ────────
// Section 6 printed every MVC opening size and both Chapel of Memories size legends.
// The operator removed it outright; these checks now assert its ABSENCE, so nobody
// reinstates a size table without the ruling being revisited.
console.log('\n=== SIZE SECTION REMOVED ===');
{
  for (const id of ['sizes', 'mvc-sizes', 'com-sizes']) {
    if (html.includes(`id="${id}"`)) fail(`the removed size section is back: id="${id}"`);
    else ok(`no element carries id="${id}"`);
  }
  const nums = [...html.matchAll(/<span class="contents-num">(\d+)<\/span>/g)].map((m) => +m[1]);
  const want = nums.map((_, i) => i + 1);
  if (JSON.stringify(nums) === JSON.stringify(want)) ok(`the contents list is numbered 1-${nums.length} with no gap`);
  else fail(`the contents list is numbered ${nums.join(', ')} — renumbering was missed`);
  const kick = [...html.matchAll(/<div class="section-kicker">SECTION (\d+)<\/div>/g)].map((m) => +m[1]);
  if (JSON.stringify(kick) === JSON.stringify(want)) ok(`section kickers run SECTION 1-${kick.length} with no gap`);
  else fail(`section kickers run ${kick.join(', ')} — renumbering was missed`);
}

// ── the at-a-glance table repeats the ranges in plain text; keep it honest ───
console.log('\n=== AT-A-GLANCE TABLE ===');
{
  const start = html.indexOf('id="glance"');
  const table = start < 0 ? '' : html.slice(start, html.indexOf('</table>', start));
  if (!table) fail('no section with id="glance"');
  else for (const key of ['ecl', 'mvc', 'rad', 'ser']) {
    // `glass` is the whole-population aggregate; it leads the SECTION, not a table row,
    // and is checked below.
    if (table.includes(RANGES[key])) ok(`at-a-glance repeats the ${key} range correctly`);
    else fail(`at-a-glance is missing or misstates the ${key} range (${RANGES[key]})`);
    if (table.includes(TYPICAL[key])) ok(`at-a-glance repeats the ${key} typical band correctly`);
    else fail(`at-a-glance is missing or misstates the ${key} typical band (${TYPICAL[key]})`);
  }

  // The section lead carries the aggregate: the one figure the operator's ruling named.
  const lead = start < 0 ? '' : html.slice(start, html.indexOf('<table', start));
  if (lead.includes(TYPICAL.glass) && lead.includes(RANGES.glass)) ok('the section lead carries the glass-front typical band and the full span');
  else fail(`the section lead must carry both the glass typical band (${TYPICAL.glass}) and the full span (${RANGES.glass})`);

  // No percentile jargon reaches a family, anywhere on the page (operator, 2026-08-02).
  const jargon = /percentile|quartile|interquartile|25th|75th|median/i.exec(html.replace(/<!--[\s\S]*?-->/g, ''));
  if (jargon) fail(`the page uses statistical jargon in rendered text: "${jargon[0]}"`);
  else ok('no percentile / quartile / median jargon appears in rendered text');
}

console.log('\n=== PRINTED-GUIDE PRICING RULE ===');
assertPrintRule('glass-front-niches-guide.html', ok, fail);

console.log('');
console.log(bad ? `${bad} check(s) failed` : 'all glass-front niche figures reconcile against the modules');
process.exit(bad ? 1 : 0);
