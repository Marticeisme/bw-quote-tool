// Reconcile every price figure printed on granite-niches-guide.html against the live
// datasets it is derived from. The page must never carry a range that was typed from
// memory: each one is recomputed here from the module and compared string-for-string.
//
//   ROAC  scripts/roac-niche-data.mjs   range = min/max price of AVAILABLE niches
//   GOMN  scripts/gomn-niche-data.mjs   range = min/max price of SELLABLE niches
//   TGN   scripts/tgmp-data.mjs         range = min/max price of available niches
//   TGMP  scripts/tgmp-data.mjs         band  = min/max price and min/max rights of the
//                                              nine additional path placements
//
// Fees are checked the same way, against each module's own FEES export — INCLUDING the
// Terrace Garden. Its own price sheet prints no fees, but the operator ruled on
// 2026-07-29 that the Mountain View Columbarium June-2026 schedule applies to the whole
// Terrace Garden Memorial Path, and `scripts/tgmp-data.mjs` carries that schedule as its
// FEES export. This gate used to assert the opposite ("fee abstinence") and now asserts
// the schedule IS present, complete, equal to the module, and — because the numbers are
// borrowed rather than printed — accompanied verbatim by the module's FEE_SOURCE
// provenance. An unsourced fee on this page is the mistake now being guarded against.
//
// Every checked figure is tagged in the HTML:
//   <span data-range="roac">$7,995–$17,595</span>
//   <td data-fee="roac.OC">$875</td>
//   <strong data-rights="tgmp">1–4 rights of interment</strong>
//
// Run from repo root:  node scripts/verify_granite_niche_ranges.mjs
import fs from 'fs';
import * as ROAC from './roac-niche-data.mjs';
import * as GOMN from './gomn-niche-data.mjs';
import * as TGMP from './tgmp-data.mjs';

const PAGE = 'granite-niches-guide.html';
const html = fs.readFileSync(PAGE, 'utf8');

let bad = 0;
const fail = (m) => { bad++; console.log('  FAIL  ' + m); };
const ok = (m) => console.log('   ok   ' + m);

const money = (n) => '$' + n.toLocaleString('en-US');
const rangeStr = (lo, hi) => `${money(lo)}&ndash;${money(hi)}`;
const minmax = (xs) => [Math.min(...xs), Math.max(...xs)];

// ── compute every expected figure from the modules ───────────────────────────
const roacAvail = ROAC.allNiches().filter((n) => n.st === 'available').map((n) => n.p);
const gomnAvail = GOMN.allNiches().filter(GOMN.sellable).map((n) => n.p);
const tgnAvail = TGMP.tgnNiches().filter(TGMP.sellable).map((n) => n.price);
const tgmpItems = TGMP.TGMP_ITEMS.filter(TGMP.sellable);

const [roacLo, roacHi] = minmax(roacAvail);
const [gomnLo, gomnHi] = minmax(gomnAvail);
const [tgnLo, tgnHi] = minmax(tgnAvail);
const [tgmpLo, tgmpHi] = minmax(tgmpItems.map((i) => i.price));
const [rightsLo, rightsHi] = minmax(tgmpItems.map((i) => i.rights));

console.log('=== DATASETS ===');
console.log(`   ROAC  ${ROAC.allNiches().length} niches, ${roacAvail.length} available`);
console.log(`   GOMN  ${GOMN.allNiches().length} niches, ${gomnAvail.length} sellable`);
console.log(`   TGN   ${TGMP.tgnNiches().length} niches, ${tgnAvail.length} available`);
console.log(`   TGMP  ${tgmpItems.length} additional path placements`);

// ── ranges ───────────────────────────────────────────────────────────────────
const RANGES = {
  roac: rangeStr(roacLo, roacHi),
  gomn: rangeStr(gomnLo, gomnHi),
  tgn: rangeStr(tgnLo, tgnHi),
  tgmp: rangeStr(tgmpLo, tgmpHi),
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
    if (got === want) ok(`data-range="${key}"`.padEnd(26) + `${got}`);
    else fail(`data-range="${key}": page prints "${got}", module says "${want}"`);
  }
}

// ── the TGMP rights band ─────────────────────────────────────────────────────
console.log('\n=== TGMP RIGHTS BAND ===');
{
  const want = `${rightsLo}&ndash;${rightsHi} rights of interment`;
  const found = tagged('data-rights', 'tgmp');
  if (!found.length) fail('no element carries data-rights="tgmp"');
  else for (const got of found) {
    if (got === want) ok(`data-rights="tgmp"`.padEnd(26) + got);
    else fail(`data-rights="tgmp": page prints "${got}", module says "${want}"`);
  }
}

// ── fees ─────────────────────────────────────────────────────────────────────
// A rate (0 < v < 1) prints as a percentage; anything else as dollars.
const feeStr = (v) => (v > 0 && v < 1 ? +(v * 100).toFixed(1) + '%' : money(v));
const FEE_SOURCES = { roac: ROAC.FEES, gomn: GOMN.FEES, tgmp: TGMP.FEES };

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

// ── the Terrace Garden carries the MVC schedule, in full, with its provenance ─
// Replaces the former "fee abstinence" pair of assertions. `QTY_MAX` lives in the same
// FEES export but is a quantity ceiling for the map's calculator, not a charge, so it is
// the one key the page is not expected to print.
const NOT_A_CHARGE = new Set(['QTY_MAX']);

console.log('\n=== TERRACE GARDEN FEE SCHEDULE vs tgmp-data FEES ===');
{
  const terrace = html.slice(html.indexOf('id="terrace"'), html.indexOf('id="glance"'));
  const tagsIn = (s) => Object.fromEntries(
    [...s.matchAll(/<[^>]*\bdata-fee="tgmp\.([A-Z_]+)"[^>]*>([\s\S]*?)<\//g)].map((m) => [m[1], m[2].trim()]),
  );
  const printed = tagsIn(terrace);

  // 1. every charge in the module is on the page, in the Terrace Garden section, equal.
  for (const key of Object.keys(TGMP.FEES)) {
    if (NOT_A_CHARGE.has(key)) continue;
    const want = feeStr(TGMP.FEES[key]);
    if (!(key in printed)) { fail(`tgmp-data FEES.${key} (${want}) is not printed in the Terrace Garden section`); continue; }
    if (printed[key] === want) ok(`data-fee="tgmp.${key}"`.padEnd(26) + printed[key]);
    else fail(`data-fee="tgmp.${key}": page prints "${printed[key]}", tgmp-data says "${want}"`);
  }
  const extra = Object.keys(printed).filter((k) => !(k in TGMP.FEES));
  if (extra.length) fail(`the Terrace Garden section tags fees tgmp-data has no key for: ${extra.join(', ')}`);
  else ok(`the section tags no fee tgmp-data does not define`);

  // 2. borrowed numbers must carry the module's own provenance, verbatim. The schedule
  //    string and the confirmation date come from FEE_SOURCE, and because
  //    printedOnThisSheet is false the page must say so in as many words.
  const src = TGMP.FEE_SOURCE;
  const needs = [
    [src.schedule, 'FEE_SOURCE.schedule'],
    [src.confirmedOn, 'FEE_SOURCE.confirmedOn'],
  ];
  for (const [needle, what] of needs) {
    if (terrace.includes(needle)) ok(`provenance names ${what}`.padEnd(26) + `"${needle}"`);
    else fail(`the Terrace Garden section never states ${what} ("${needle}")`);
  }
  if (src.printedOnThisSheet) fail('FEE_SOURCE.printedOnThisSheet flipped to true — this gate needs rewriting');
  else if (/no fees appear on it|not printed on this/i.test(terrace)) ok('provenance says the fees are NOT printed on this area\'s sheet');
  else fail('FEE_SOURCE.printedOnThisSheet is false, but the section does not say the sheet prints no fees');
}

// ── the at-a-glance table repeats the ranges in plain text; keep it honest ───
console.log('\n=== AT-A-GLANCE TABLE ===');
{
  const start = html.indexOf('id="glance"');
  const table = start < 0 ? '' : html.slice(start, html.indexOf('</table>', start));
  if (!table) fail('no section with id="glance"');
  else for (const [key, want] of Object.entries(RANGES)) {
    if (table.includes(want)) ok(`at-a-glance repeats the ${key} range correctly`);
    else fail(`at-a-glance is missing or misstates the ${key} range (${want})`);
  }
}

console.log('');
console.log(bad ? `${bad} check(s) failed` : 'all granite-niche price figures reconcile against the modules');
process.exit(bad ? 1 : 0);
