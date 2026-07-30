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
// Fees are checked the same way against each location's own FEES export. **Fees differ
// between these locations and must never be cross-applied** — ECL's vase is $370 while
// the Chapel of Memories CRYPT vase is $415, and the MVC schedule (O&C $875 / recording
// $235 / inscription $660 / tax 10.4%) is not the ECL or Radiance/Serenity schedule
// ($835 / $225 / no tax line). Dedicated cross-contamination checks are below.
//
// Every checked figure is tagged in the HTML:
//   <div data-range="ecl">$10,995–$82,500</div>
//   <td data-fee="ecl.OC">$835</td>
//   <b data-count="ecl.available">28</b>
//   <span data-rights="mvc">2–4 rights of interment</span>
//
// Run from repo root:  node scripts/verify_glass_niche_ranges.mjs
import fs from 'fs';
import * as ECL from './ecl-niche-data.mjs';
import * as MVC from './mvc-niche-data.mjs';
import * as COM from './com-crypt-data.mjs';

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
const RANGES = {
  ecl: rangeStr(eclLo, eclHi),
  mvc: rangeStr(mvcLo, mvcHi),
  rad: rangeStr(radLo, radHi),
  ser: rangeStr(serLo, serHi),
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

// ── no fee schedule may leak from one location into another ──────────────────
// ECL vase $370 vs Chapel of Memories CRYPT vase $415 is the named trap; the MVC-only
// amounts are the second. Each is checked inside the OTHER locations' sections.
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

  const mvcOnly = [money(MVC.FEES.OC), money(MVC.FEES.REC), money(MVC.FEES.INSCR), feeStr(MVC.FEES.TAX)];
  for (const s of ['ecl', 'com']) {
    const leaked = mvcOnly.filter((v) => SECTIONS[s].includes(v));
    if (leaked.length) fail(`MVC-only fee amounts appear in the ${s} section: ${leaked.join(', ')}`);
    else ok(`no MVC-only fee amount appears in the ${s} section`);
  }
}

// ── the size tables are static HTML; check them row for row ─────────────────
// Section 6 prints every MVC opening size and both Chapel of Memories size legends.
// They are hand-written rows in the page, so they can rot; these two checks rebuild the
// expected rows from the modules and compare the whole table, in order.
const tableRows = (id) => {
  const start = html.indexOf(`id="${id}"`);
  if (start < 0) return null;
  const body = html.slice(html.indexOf('<tbody>', start), html.indexOf('</tbody>', start));
  return [...body.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((m) =>
    [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
      .map((c) => c[1].replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').trim()));
};

console.log('\n=== SIZE TABLES vs MODULES ===');
{
  const by = new Map();
  for (const n of mvcAll) {
    const k = `${n.inside}|${n.opening}|${n.plate}|${n.urn}`;
    if (!by.has(k)) by.set(k, { inside: n.inside, opening: n.opening, plate: n.plate, rights: n.urn, n: 0 });
    by.get(k).n++;
  }
  const want = [...by.values()].sort((a, b) => b.n - a.n || b.rights - a.rights)
    .map((r) => [r.inside, r.opening, r.plate, String(r.n), String(r.rights)]);
  const got = tableRows('mvc-sizes');
  if (!got) fail('no table with id="mvc-sizes"');
  else if (JSON.stringify(got) !== JSON.stringify(want)) {
    fail(`#mvc-sizes does not match the module (${got.length} rows printed, ${want.length} expected)`);
    for (let i = 0; i < Math.max(got.length, want.length); i++) {
      const a = JSON.stringify(got[i] || null), b = JSON.stringify(want[i] || null);
      if (a !== b) console.log(`        row ${i + 1}: page ${a}\n                 module ${b}`);
    }
  } else {
    ok(`#mvc-sizes ${want.length} opening sizes, ${want.reduce((s, r) => s + +r[3], 0)} openings`);
  }

  const wantCom = [];
  for (const [wid, name] of [['RAD', 'Radiance'], ['SER', 'Serenity']])
    for (const [cls, dim] of COM.WALLS[wid].sizes) wantCom.push([name, cls, dim]);
  const gotCom = tableRows('com-sizes');
  if (!gotCom) fail('no table with id="com-sizes"');
  else if (JSON.stringify(gotCom) !== JSON.stringify(wantCom)) {
    fail('#com-sizes does not match the RAD/SER size legends');
    for (let i = 0; i < Math.max(gotCom.length, wantCom.length); i++) {
      const a = JSON.stringify(gotCom[i] || null), b = JSON.stringify(wantCom[i] || null);
      if (a !== b) console.log(`        row ${i + 1}: page ${a}\n                 module ${b}`);
    }
  } else {
    ok(`#com-sizes ${wantCom.length} size classes, verbatim from the wall sheets`);
  }
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
console.log(bad ? `${bad} check(s) failed` : 'all glass-front niche figures reconcile against the modules');
process.exit(bad ? 1 : 0);
