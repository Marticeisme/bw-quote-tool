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
// Fees are checked the same way, against each module's own FEES export. The Terrace
// Garden deliberately has NO fee schedule — its sheet prints none, and borrowing the MVC
// or ROAC schedule is the specific mistake this check also guards against, so any
// data-fee="tgmp.*" on the page is a failure.
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
const FEE_SOURCES = { roac: ROAC.FEES, gomn: GOMN.FEES };

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

// ── the Terrace Garden must carry no fee schedule at all ─────────────────────
console.log('\n=== TERRACE GARDEN FEE ABSTINENCE ===');
{
  const borrowed = [...html.matchAll(/data-fee="(tgmp|tgn|terrace)\./g)].map((m) => m[0]);
  if (borrowed.length) fail(`the Terrace Garden price sheet prints no fees, but the page tags ${borrowed.length}: ${borrowed.join(', ')}`);
  else ok('no fee is attributed to the Terrace Garden (its sheet prints none)');
  // The MVC schedule is the one that was wrongly applied to these niches before; make
  // sure none of its amounts drifted into the Terrace Garden section.
  const terrace = html.slice(html.indexOf('id="terrace"'), html.indexOf('id="glance"'));
  const mvcOnly = ['$875', '$235', '$660', '10.4%'];
  const leaked = mvcOnly.filter((s) => terrace.includes(s));
  if (leaked.length) fail(`MVC/ROAC fee amounts appear inside the Terrace Garden section: ${leaked.join(', ')}`);
  else ok('no MVC/ROAC fee amount appears inside the Terrace Garden section');
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
