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
import { assertPrintRule } from './_print_rule_assert.mjs';

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

// ── the Garden of Meditation carries the MVC schedule too, with its provenance ─
// Added sprint-09 Track D. The GOMN sheet DOES print fees ($835 / $225 / $605) and the
// operator replaced all three with the Mountain View Columbarium June-2026 schedule on
// 2026-07-31. That makes this page's fee table borrowed numbers standing in front of a
// sheet that says something else — so the provenance sentence is load-bearing, and the
// superseded amounts must not survive anywhere on the page.
const GOMN_SUPERSEDED = { OC: '$835', REC: '$225', INSCR: '$605' };

console.log('\n=== GARDEN OF MEDITATION FEE SCHEDULE vs gomn-niche-data FEES ===');
{
  const gomn = html.slice(html.indexOf('id="gomn"'), html.indexOf('id="terrace"'));
  const printed = Object.fromEntries(
    [...gomn.matchAll(/<[^>]*\bdata-fee="gomn\.([A-Z_]+)"[^>]*>([\s\S]*?)</g)].map((m) => [m[1], m[2].trim()]),
  );

  // 1. every charge the module defines is printed in the GOMN section, and equal.
  for (const key of Object.keys(GOMN.FEES)) {
    const want = feeStr(GOMN.FEES[key]);
    if (!(key in printed)) { fail(`gomn-niche-data FEES.${key} (${want}) is not printed in the Garden of Meditation section`); continue; }
    if (printed[key] === want) ok(`data-fee="gomn.${key}"`.padEnd(26) + printed[key]);
    else fail(`data-fee="gomn.${key}": page prints "${printed[key]}", gomn-niche-data says "${want}"`);
  }
  const extra = Object.keys(printed).filter((k) => !(k in GOMN.FEES));
  if (extra.length) fail(`the Garden of Meditation section tags fees gomn-niche-data has no key for: ${extra.join(', ')}`);
  else ok('the section tags no fee gomn-niche-data does not define');

  // 2. the superseded amounts printed on the sheet must be gone from the whole page.
  for (const [key, amount] of Object.entries(GOMN_SUPERSEDED)) {
    if (html.includes(amount)) fail(`the superseded GOMN ${key} amount ${amount} still appears on the page`);
    else ok(`superseded GOMN ${key} ${amount} is gone from the page`);
  }

  // 3. borrowed numbers carry the module's own provenance, verbatim.
  const src = GOMN.FEE_SOURCE;
  for (const [needle, what] of [[src.schedule, 'FEE_SOURCE.schedule'], [src.confirmedOn, 'FEE_SOURCE.confirmedOn']]) {
    if (gomn.includes(needle)) ok(`provenance names ${what}`.padEnd(26) + `"${needle}"`);
    else fail(`the Garden of Meditation section never states ${what} ("${needle}")`);
  }
  if (src.printedOnThisSheet) fail('GOMN FEE_SOURCE.printedOnThisSheet flipped to true — this gate needs rewriting');
  else if (/replace the older ones printed on the sheet|instead/i.test(gomn)) ok('provenance says these amounts replace the ones printed on the sheet');
  else fail('the section never says the printed amounts were replaced');
  // s11 Track D: the same assertion, minus the system name. The operator ruled on
  // 2026-08-02 that MIS is never named to a family, so the sentence now says a family
  // service director confirms the charges — which is the part a family can act on. The
  // check is kept (not deleted) because the failure it guards is real: a fee schedule
  // that came from a DIFFERENT area's sheet must always be presented as confirmable.
  if (/confirm the current charges before quoting/i.test(gomn)) ok('and tells the reader the charges are confirmed before quoting');
  else fail('the section never tells the reader the charges are confirmed before quoting');

  // 4. the ×2 inscription allowance, and the urn as merchandise at its module price.
  if (/up to two on the niche front/i.test(gomn) && /Two inscriptions may be added/i.test(gomn))
    ok('the page states the ×2 inscription allowance, in the table and in prose');
  else fail('the page does not state that two inscriptions may be added to the front');
  const urn = `$${GOMN.URN.price.toLocaleString('en-US')}`;
  if (gomn.includes(urn) && /merchandise/i.test(gomn)) ok(`the Interlude Urn is priced ${urn} and named as merchandise`);
  else fail(`the Garden of Meditation section does not price the Interlude Urn at ${urn} as merchandise`);

  // 5. THE URN IS TAXED (operator ruling 2026-07-31, superseding Track D's untaxed urn).
  //    Track D shipped this page saying the urn's tax was "confirmed at contract"; the
  //    ruling replaced that with a flat 10.4%, the same rate as the inscription. The
  //    taxed figure is asserted from the module's own TAX rate, and the withdrawn caveat
  //    must be gone from the whole page — a family reading "confirmed at contract" beside
  //    a taxed line is the exact confusion this check exists to prevent.
  const taxPct = feeStr(GOMN.FEES.TAX);                     // "10.4%"
  const urnTaxed = new RegExp(`${urn.replace('$', '\\$')}[^.]{0,80}\\b${taxPct.replace('.', '\\.')}\\s*sales tax`, 'i');
  if (urnTaxed.test(gomn)) ok(`the Interlude Urn is stated as ${urn} plus ${taxPct} sales tax`);
  else fail(`the Garden of Meditation section does not say the Interlude Urn carries ${taxPct} sales tax`);
  if (/sales tax[^<]*interlude urn/i.test(gomn)) ok('the fee table names the urn alongside the inscription on the tax row');
  else fail('the fee table\'s sales-tax row does not name the Interlude Urn');
  if (/confirmed at contract/i.test(html)) fail('the withdrawn "confirmed at contract" urn-tax caveat is still on the page');
  else ok('the withdrawn "confirmed at contract" urn-tax caveat is gone from the page');
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

console.log('\n=== PRINTED-GUIDE PRICING RULE ===');
assertPrintRule('granite-niches-guide.html', ok, fail);

console.log('');
console.log(bad ? `${bad} check(s) failed` : 'all granite-niche price figures reconcile against the modules');
process.exit(bad ? 1 : 0);
