// Reconcile EVERY printed figure on the five per-area photo guides against the live
// datasets they are derived from. Same shape and same discipline as
// verify_granite_niche_ranges.mjs and verify_glass_niche_ranges.mjs: nothing on these
// pages may be a number somebody typed from memory, and nothing may quietly go stale when
// a niche sells.
//
//   roac-guide.html            scripts/roac-niche-data.mjs
//   mvc-niches-guide.html      scripts/mvc-niche-data.mjs
//   ecl-guide.html             scripts/ecl-niche-data.mjs
//   gomn-guide.html            scripts/gomn-niche-data.mjs
//   terrace-garden-guide.html  scripts/tgmp-data.mjs
//
// Four kinds of tagged figure, all recomputed here and compared string-for-string:
//
//   data-range="<key>"    a min–max computed over a named population
//   data-typical="<key>"  the middle-50% band (scripts/_typical_band.mjs), required
//                         beside any range that spans more than 4x — the operator's
//                         ruling of 2026-08-02 that a wide span may never lead alone
//   data-count="<key>"    an inventory count. A count printed as reassurance ("303 of
//                         350 available") rots exactly as fast as a price does.
//   data-fee="<area>.<K>" one line of a charge schedule, against that module's own FEES
//   data-rights="<key>"   the rights-of-interment figure or band
//
// Plus the per-guide facts that are not numbers but are just as easy to get wrong: the
// borrowed fee schedules must carry their provenance, no location's local charge may leak
// onto another location's page, and the Garden of Meditation's two verbatim rules must
// still be on its page word for word.
//
// `--sabotage` runs the built-in self-test: it perturbs the page bytes in memory, seven
// ways, and asserts that each perturbation is CAUGHT. A gate nobody has tried to defeat
// is a gate nobody knows the strength of.
//
// Run from repo root:  node scripts/verify_area_guide_ranges.mjs [--sabotage]
import fs from 'fs';
import * as ROAC from './roac-niche-data.mjs';
import * as MVC from './mvc-niche-data.mjs';
import * as ECL from './ecl-niche-data.mjs';
import * as GOMN from './gomn-niche-data.mjs';
import * as TGMP from './tgmp-data.mjs';
import { typicalStr } from './_typical_band.mjs';
import { assertPrintRule } from './_print_rule_assert.mjs';

const PAGES = {
  roac: 'roac-guide.html',
  mvc: 'mvc-niches-guide.html',
  ecl: 'ecl-guide.html',
  gomn: 'gomn-guide.html',
  tgmp: 'terrace-garden-guide.html',
};

const money = (n) => '$' + n.toLocaleString('en-US');
const rangeStr = (xs) => `${money(Math.min(...xs))}&ndash;${money(Math.max(...xs))}`;
const feeStr = (v) => (v > 0 && v < 1 ? +(v * 100).toFixed(1) + '%' : money(v));

// ── the populations, computed once ───────────────────────────────────────────
const roacAll = ROAC.allNiches();
const roacAv = roacAll.filter((n) => n.st === 'available');
const roacInt = roacAv.filter((n) => n.wall.endsWith('INT'));
const roacExt = roacAv.filter((n) => n.wall.endsWith('EXT'));

const mvcAll = MVC.allNiches();
const mvcFam = mvcAll.filter((n) => n.urn === 4);

const eclAll = Object.values(ECL.WALLS).flatMap((w) => w.niches);
const eclAv = eclAll.filter((n) => n.st === 'available');

const gomnAll = GOMN.allNiches();
const gomnSell = gomnAll.filter(GOMN.sellable);

const tgnAll = TGMP.tgnNiches();
const tgn = tgnAll.filter(TGMP.sellable);
const items = TGMP.TGMP_ITEMS.filter(TGMP.sellable);
const posts = items.filter((i) => i.shape === 'post');
const large = items.filter((i) => i.shape !== 'post');

const RANGES = {
  roac: rangeStr(roacAv.map((n) => n.p)),
  'roac.int': rangeStr(roacInt.map((n) => n.p)),
  'roac.ext': rangeStr(roacExt.map((n) => n.p)),
  mvc: rangeStr(mvcAll.map((n) => n.price)),
  'mvc.family': rangeStr(mvcFam.map((n) => n.price)),
  ecl: rangeStr(eclAv.map((n) => n.p)),
  gomn: rangeStr(gomnSell.map((n) => n.p)),
  tgn: rangeStr(tgn.map((n) => n.price)),
  tgmp: rangeStr(items.map((i) => i.price)),
  'tgmp.posts': rangeStr(posts.map((i) => i.price)),
  'tgmp.large': rangeStr(large.map((i) => i.price)),
};

const TYPICAL = {
  roac: typicalStr(roacAv.map((n) => n.p)),
  'roac.int': typicalStr(roacInt.map((n) => n.p)),
  'roac.ext': typicalStr(roacExt.map((n) => n.p)),
  mvc: typicalStr(mvcAll.map((n) => n.price)),
  'mvc.family': typicalStr(mvcFam.map((n) => n.price)),
  ecl: typicalStr(eclAv.map((n) => n.p)),
  gomn: typicalStr(gomnSell.map((n) => n.p)),
  tgn: typicalStr(tgn.map((n) => n.price)),
  tgmp: typicalStr(items.map((i) => i.price)),
  'tgmp.posts': typicalStr(posts.map((i) => i.price)),
  'tgmp.large': typicalStr(large.map((i) => i.price)),
};

const COUNTS = {
  'roac.total': roacAll.length, 'roac.available': roacAv.length,
  'roac.int': roacInt.length, 'roac.ext': roacExt.length,
  'mvc.total': mvcAll.length,
  'mvc.west': mvcAll.filter((n) => n.wall === 'west').length,
  'mvc.east': mvcAll.filter((n) => n.wall === 'east').length,
  'mvc.north': mvcAll.filter((n) => n.wall === 'north').length,
  'mvc.south': mvcAll.filter((n) => n.wall === 'south').length,
  'mvc.family': mvcFam.length,
  'mvc.sizes': new Set(mvcAll.map((n) => n.wIn + 'x' + n.hIn)).size,
  'ecl.total': eclAll.length, 'ecl.available': eclAv.length,
  'ecl.S': ECL.WALLS.S.niches.length, 'ecl.N': ECL.WALLS.N.niches.length,
  'ecl.W': ECL.WALLS.W.niches.length, 'ecl.E': ECL.WALLS.E.niches.length,
  'gomn.total': gomnAll.length, 'gomn.available': gomnSell.length,
  'tgn.total': tgnAll.length,
  'tgmp.items': items.length, 'tgmp.posts': posts.length, 'tgmp.large': large.length,
};

const RIGHTS = {
  roac: `${ROAC.RIGHTS} rights of interment`,
  ecl: `${ECL.RIGHTS} rights of interment`,
  mvc: `${Math.min(...mvcAll.map((n) => n.urn))}&ndash;${Math.max(...mvcAll.map((n) => n.urn))} rights of interment`,
  tgn: `${TGMP.TGN.rights} rights of interment`,
  tgmp: `${Math.min(...items.map((i) => i.rights))}&ndash;${Math.max(...items.map((i) => i.rights))} rights of interment`,
};

const FEE_SOURCES = { roac: ROAC.FEES, mvc: MVC.FEES, ecl: ECL.FEES, gomn: GOMN.FEES, tgmp: TGMP.FEES };
// `QTY_MAX` lives in TGMP.FEES but is a quantity ceiling for the map's calculator, not a
// charge, so it is the one key a page is not expected to print.
const NOT_A_CHARGE = new Set(['QTY_MAX']);

// Which module each guide draws its keys from, so a key printed on the WRONG page fails.
const OWNS = {
  roac: ['roac'], mvc: ['mvc'], ecl: ['ecl'], gomn: ['gomn'], tgmp: ['tgn', 'tgmp'],
};

// ── the run ──────────────────────────────────────────────────────────────────
function run(sources) {
  let bad = 0;
  const fail = (m) => { bad++; console.log('  FAIL  ' + m); };
  const ok = (m) => console.log('   ok   ' + m);

  const tagged = (html, attr, key) => {
    const re = new RegExp(`<[^>]*\\b${attr}="${key.replace('.', '\\.')}"[^>]*>([\\s\\S]*?)</`, 'g');
    return [...html.matchAll(re)].map((m) => m[1].trim());
  };
  const keysOf = (html, attr) =>
    [...new Set([...html.matchAll(new RegExp(`\\b${attr}="([^"]+)"`, 'g'))].map((m) => m[1]))];

  console.log('=== DATASETS ===');
  console.log(`   ROAC  ${roacAll.length} niches, ${roacAv.length} available (${roacInt.length} courtyard / ${roacExt.length} outward)`);
  console.log(`   MVC   ${mvcAll.length} island openings, ${mvcFam.length} four-right family units`);
  console.log(`   ECL   ${eclAll.length} niches, ${eclAv.length} available`);
  console.log(`   GOMN  ${gomnAll.length} niches, ${gomnSell.length} for sale`);
  console.log(`   TGMP  ${tgnAll.length} bank niches, ${items.length} path memorials`);

  for (const [area, file] of Object.entries(PAGES)) {
    const html = sources[file];
    console.log(`\n=== ${file} ===`);
    if (!html) { fail(`${file}: the page does not exist`); continue; }

    // ── ranges ──────────────────────────────────────────────────────────────
    for (const key of keysOf(html, 'data-range')) {
      if (!(key in RANGES)) { fail(`data-range="${key}": no population is defined for that key, so the figure is unverifiable`); continue; }
      if (!OWNS[area].some((p) => key === p || key.startsWith(p + '.'))) {
        fail(`${file} prints data-range="${key}", which belongs to another location`); continue;
      }
      for (const got of tagged(html, 'data-range', key)) {
        if (got === RANGES[key]) ok(`data-range="${key}"`.padEnd(24) + got);
        else fail(`data-range="${key}": page prints "${got}", the module says "${RANGES[key]}"`);
      }
    }

    // ── typical bands ───────────────────────────────────────────────────────
    for (const key of keysOf(html, 'data-typical')) {
      if (!(key in TYPICAL)) { fail(`data-typical="${key}": no population is defined for that key, so the band is unverifiable`); continue; }
      for (const got of tagged(html, 'data-typical', key)) {
        if (got === TYPICAL[key]) ok(`data-typical="${key}"`.padEnd(24) + got);
        else fail(`data-typical="${key}": page prints "${got}", the module says "${TYPICAL[key]}"`);
      }
    }

    // ── THE WIDE-SPAN RULE (operator, 2026-08-02) ───────────────────────────
    // A range spanning more than 4x may not lead alone WHEN a middle-50% band would
    // actually narrow it (at least halve the span). Where the band cannot narrow the
    // answer, printing it twice tells a family nothing and the honest card is the range
    // plus the invitation to call. Both conditions are computed, so there is no
    // per-key allow-list to rot.
    const span = (s) => { const [lo, hi] = s.split('&ndash;').map((x) => +x.replace(/[$,]/g, '')); return hi / lo; };
    const bands = new Set(keysOf(html, 'data-typical'));
    for (const key of keysOf(html, 'data-range')) {
      if (!(key in RANGES)) continue;
      const full = span(RANGES[key]);
      if (full <= 4) continue;
      const band = span(TYPICAL[key]);
      if (band > full / 2) ok(`data-range="${key}" spans ${full.toFixed(1)}x; its middle 50% spans ${band.toFixed(1)}x and would not narrow it — no band required`);
      else if (bands.has(key)) ok(`data-range="${key}" spans ${full.toFixed(1)}x and is led by a band spanning ${band.toFixed(1)}x`);
      else fail(`data-range="${key}" spans ${full.toFixed(1)}x with no data-typical band beside it — the wide span leads alone`);
    }
    // and the band must be printed BEFORE the span it leads, because the whole point of
    // the ruling is which number a family reads first.
    for (const key of bands) {
      const iT = html.indexOf(`data-typical="${key}"`);
      const iR = html.indexOf(`data-range="${key}"`);
      if (iR < 0 || iT < iR) ok(`the ${key} band is printed before its full range`);
      else fail(`${file}: the ${key} full range appears before its typical band`);
    }

    // ── counts ──────────────────────────────────────────────────────────────
    for (const key of keysOf(html, 'data-count')) {
      if (!(key in COUNTS)) { fail(`data-count="${key}": no count is defined for that key`); continue; }
      for (const got of tagged(html, 'data-count', key)) {
        if (got === String(COUNTS[key])) ok(`data-count="${key}"`.padEnd(24) + got);
        else fail(`data-count="${key}": page prints "${got}", the module says "${COUNTS[key]}"`);
      }
    }

    // ── rights ──────────────────────────────────────────────────────────────
    for (const key of keysOf(html, 'data-rights')) {
      if (!(key in RIGHTS)) { fail(`data-rights="${key}": no rights figure is defined for that key`); continue; }
      for (const got of tagged(html, 'data-rights', key)) {
        if (got === RIGHTS[key]) ok(`data-rights="${key}"`.padEnd(24) + got);
        else fail(`data-rights="${key}": page prints "${got}", the module says "${RIGHTS[key]}"`);
      }
    }

    // ── fees ────────────────────────────────────────────────────────────────
    const printed = {};
    for (const m of html.matchAll(/<[^>]*\bdata-fee="([a-z]+)\.([A-Z_]+)"[^>]*>([\s\S]*?)<\//g)) {
      const [, a, key, raw] = m;
      const got = raw.trim();
      const src = FEE_SOURCES[a];
      if (!src) { fail(`data-fee="${a}.${key}": no schedule exists for "${a}"`); continue; }
      if (a !== area) { fail(`${file} prints data-fee="${a}.${key}" — another location's schedule`); continue; }
      if (!(key in src)) { fail(`data-fee="${a}.${key}": the ${a} module has no FEES.${key}`); continue; }
      printed[key] = got;
      const want = feeStr(src[key]);
      if (got === want) ok(`data-fee="${a}.${key}"`.padEnd(24) + got);
      else fail(`data-fee="${a}.${key}": page prints "${got}", the module says "${want}"`);
    }
    // Completeness, both ways: every charge the module defines is on its own guide, and
    // the guide tags nothing the module does not define. A schedule that is 90% printed
    // is the shape a family gets surprised by at signing.
    const missing = Object.keys(FEE_SOURCES[area]).filter((k) => !NOT_A_CHARGE.has(k) && !(k in printed));
    if (missing.length) fail(`${file} does not print ${area} FEES.${missing.join(', FEES.')}`);
    else ok(`every charge the ${area} schedule defines is printed on this guide`);

    // ── the printed-guide pricing rule ──────────────────────────────────────
    assertPrintRule(file, ok, fail);
  }

  // ── per-location facts that are not numbers ───────────────────────────────
  console.log('\n=== BORROWED SCHEDULES CARRY THEIR PROVENANCE ===');
  for (const [area, mod] of [['gomn', GOMN], ['tgmp', TGMP]]) {
    const html = sources[PAGES[area]] || '';
    const src = mod.FEE_SOURCE;
    for (const [needle, what] of [[src.schedule, 'FEE_SOURCE.schedule'], [src.confirmedOn, 'FEE_SOURCE.confirmedOn']]) {
      if (html.includes(needle)) ok(`${PAGES[area]} names ${what}`.padEnd(58) + `"${needle}"`);
      else fail(`${PAGES[area]} never states ${what} ("${needle}")`);
    }
    if (src.printedOnThisSheet) fail(`${area} FEE_SOURCE.printedOnThisSheet flipped to true — this check needs rewriting`);
    else if (/not the older amounts printed on this location|no fees appear on this location/i.test(html))
      ok(`${PAGES[area]} says the amounts are not this location's own printed ones`);
    else fail(`${PAGES[area]}: the schedule is borrowed but the page does not say so`);
  }
  // The three amounts the Garden of Meditation schedule REPLACED must be gone from its
  // page entirely. A family reading a superseded figure beside a current one is the exact
  // confusion the replacement was meant to end.
  {
    const html = sources[PAGES.gomn] || '';
    for (const [k, amount] of Object.entries({ OC: '$835', REC: '$225', INSCR: '$605' })) {
      if (html.includes(amount)) fail(`the superseded Garden of Meditation ${k} amount ${amount} is on the page`);
      else ok(`superseded ${k} ${amount} is absent`.padEnd(58) + PAGES.gomn);
    }
  }

  console.log('\n=== NO LOCAL CHARGE LEAKS ONTO ANOTHER LOCATION ===');
  {
    // What is genuinely LOCAL. The core glass-front schedule is deliberately identical
    // everywhere (operator, 2026-07-31), so the leak risk is not O&C or recording — it is
    // the granite-front inscription fee turning up on a glass-front page, ECL's optional
    // bronzes turning up anywhere else, and the Garden of Meditation's required urn
    // turning up at a location that does not require it.
    const glassPages = [PAGES.mvc, PAGES.ecl];
    for (const p of glassPages) {
      const html = sources[p] || '';
      if (html.includes(money(ROAC.FEES.INSCR))) fail(`${p}: the ${money(ROAC.FEES.INSCR)} granite-front inscription fee appears on a glass-front guide`);
      else ok(`${p.padEnd(28)} carries no granite-front inscription fee`);
      if (/data-fee="[a-z]+\.INSCR"/.test(html)) fail(`${p}: tags an inscription fee — there is none on a glass-front niche`);
      else ok(`${p.padEnd(28)} tags no inscription fee`);
    }
    for (const [label, p] of [['MVC', PAGES.mvc], ['ROAC', PAGES.roac], ['GOMN', PAGES.gomn], ['TGMP', PAGES.tgmp]]) {
      const html = sources[p] || '';
      for (const [what, amount] of [['bronze scroll', money(ECL.FEES.SCROLL)], ['ECL vase', money(ECL.FEES.VASE)]]) {
        if (html.includes(amount)) fail(`${p}: the Eternal Light ${what} (${amount}) appears on the ${label} guide`);
      }
    }
    ok('the Eternal Light bronzes stay on the Eternal Light guide');
    const urn = money(GOMN.URN.price);
    for (const [label, p] of Object.entries(PAGES)) {
      if (label === 'gomn') continue;
      if ((sources[p] || '').includes(urn)) fail(`${p}: the required ${GOMN.URN.name} price ${urn} appears outside the Garden of Meditation guide`);
    }
    ok(`the required ${GOMN.URN.name} price ${urn} stays on the Garden of Meditation guide`);
  }

  console.log('\n=== THE GARDEN OF MEDITATION\'S TWO RULES, WORD FOR WORD ===');
  {
    const html = sources[PAGES.gomn] || '';
    for (const [k, text] of [['photos', GOMN.SHEET_TEXT.photos], ['ecf', GOMN.SHEET_TEXT.ecf]]) {
      if (html.includes(text)) ok(`SHEET_TEXT.${k} appears verbatim`.padEnd(58) + `"${text}"`);
      else fail(`the Garden of Meditation guide does not carry SHEET_TEXT.${k} verbatim ("${text}")`);
    }
    // "NO PHOTOS ALLOWED" is about what may go ON a niche front, not about photography in
    // the garden, and a family that reads it the other way is being told something untrue.
    // The existing pages say so; this one must too.
    if (/what may go <em>on<\/em> the niche front|goes <em>on<\/em> the niche/i.test(html))
      ok('the page explains the rule is about what goes ON the niche front');
    else fail('the Garden of Meditation guide states the photo rule without saying it is about the niche front');
    if (new RegExp(`${GOMN.INSCR_MAX === 2 ? 'two inscriptions' : 'inscriptions'}`, 'i').test(html))
      ok(`the ×${GOMN.INSCR_MAX} inscription allowance is stated`);
    else fail(`the guide does not state the ×${GOMN.INSCR_MAX} inscription allowance`);
    const urn = money(GOMN.URN.price);
    const taxPct = feeStr(GOMN.FEES.TAX);
    if (new RegExp(`${urn.replace('$', '\\$')}[^.]{0,90}\\b${taxPct.replace('.', '\\.')} sales tax`, 'i').test(html))
      ok(`the ${GOMN.URN.name} is stated as ${urn} plus ${taxPct} sales tax`);
    else fail(`the guide does not state the ${GOMN.URN.name} as ${urn} plus ${taxPct} sales tax`);
  }

  console.log('\n=== THE TERRACE GARDEN IS HONEST ABOUT WHAT IS ON THE GROUND ===');
  {
    // The marketing artwork draws the beds as turf; every photograph of the built garden
    // shows bark. The map already says so and so must the guide — a family who is shown
    // the render and then walks the garden should not be the one to notice.
    const html = sources[PAGES.tgmp] || '';
    if (/bark/i.test(html) && /turf/i.test(html)) ok('the guide says the beds are bark, not the turf the artwork draws');
    else fail('the Terrace Garden guide does not reconcile the artwork\'s turf with the bark on the ground');
    if (/no pool/i.test(html)) ok('the guide says the pool is gone');
    else fail('the Terrace Garden guide does not say the pool the earlier plan showed is gone');
  }

  console.log('\n=== EVERY PHOTOGRAPH EXISTS AND IS DESCRIBED ===');
  for (const file of Object.values(PAGES)) {
    const html = sources[file] || '';
    const imgs = [...html.matchAll(/<img\s+src="([^"]+)"[^>]*\balt="([^"]*)"/g)];
    const missing = imgs.filter(([, src]) => !fs.existsSync(src)).map(([, src]) => src);
    const thin = imgs.filter(([, , alt]) => alt.trim().length < 12).map(([, src]) => src);
    if (missing.length) fail(`${file}: ${missing.length} image(s) not on disk — ${missing.join(', ')}`);
    else if (thin.length) fail(`${file}: ${thin.length} image(s) with no usable alt text — ${thin.join(', ')}`);
    else ok(`${file.padEnd(28)} ${imgs.length} photograph(s), all on disk, all described`);
  }

  return bad;
}

// ── main ─────────────────────────────────────────────────────────────────────
const read = () => Object.fromEntries(Object.values(PAGES)
  .filter((f) => fs.existsSync(f)).map((f) => [f, fs.readFileSync(f, 'utf8')]));

const SABOTAGE = [
  ['a niche price moved under the page', (s) => ({ ...s, [PAGES.roac]: s[PAGES.roac].replace(RANGES.roac, RANGES.roac.replace('$7,995', '$6,995')) })],
  ['an availability count went stale', (s) => ({ ...s, [PAGES.ecl]: s[PAGES.ecl].replace(/(data-count="ecl.available">)\d+/g, '$142') })],
  ['a charge was edited by hand', (s) => ({ ...s, [PAGES.gomn]: s[PAGES.gomn].replace(/(data-fee="gomn\.OC">)\$875/, '$1$895') })],
  ['a rights count was overstated', (s) => ({ ...s, [PAGES.tgmp]: s[PAGES.tgmp].replace(/(data-rights="tgn">)[^<]*/, '$14 rights of interment') })],
  ['a wide span lost its typical band', (s) => ({ ...s, [PAGES.mvc]: s[PAGES.mvc].replace(/ data-typical="mvc"/g, '') })],
  // replaceALL, not replace. Sprint-16 Track D gave the Terrace Garden footnote a short
  // `.pdf-summary` twin for the condensed PDF, so the schedule name is now on the page
  // TWICE — and a sabotage that renamed only the first occurrence left the second one
  // standing, the gate correctly said the page still names its source, and the self-test
  // scored that as MISSED. The sabotage was the thing that was weak: "lost its
  // provenance" means gone, not "gone from one of the two places it is written".
  ['the borrowed schedule lost its provenance', (s) => ({ ...s, [PAGES.tgmp]: s[PAGES.tgmp].replaceAll(TGMP.FEE_SOURCE.schedule, 'our schedule') })],
  ['a superseded charge came back', (s) => ({ ...s, [PAGES.gomn]: s[PAGES.gomn].replace('confirmed 2026-07-31', 'confirmed 2026-07-31 (was $835)') })],
  ['a photograph was renamed but not moved', (s) => ({ ...s, [PAGES.roac]: s[PAGES.roac].replace('roac-images/roac-wall-d.jpg', 'roac-images/roac-wall-dd.jpg') })],
];

if (process.argv.includes('--sabotage')) {
  const base = read();
  let bad = 0;
  const quiet = () => { const w = console.log; console.log = () => {}; return () => { console.log = w; }; };
  for (const [what, mangle] of SABOTAGE) {
    const restore = quiet();
    const n = run(mangle(structuredClone(base)));
    restore();
    if (n > 0) console.log(`   ok   CAUGHT  ${what} (${n} failure(s))`);
    else { bad++; console.log(`  FAIL  MISSED  ${what} — the check does not hold`); }
  }
  console.log('');
  console.log(bad ? `${bad} sabotage(s) went undetected` : `all ${SABOTAGE.length} sabotages caught`);
  process.exit(bad ? 1 : 0);
}

const bad = run(read());
console.log('');
console.log(bad ? `${bad} check(s) failed` : 'every figure on the five area guides reconciles against its module');
process.exit(bad ? 1 : 0);
