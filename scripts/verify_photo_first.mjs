// THE PHOTO-FIRST CARD TEMPLATE — structural gate + range reconciliation.
//
// Operator, 2026-08-02: "When it comes to property they would be interested in purchasing,
// photos are key. They want to SEE what they would be buying and then be given a price
// range of it. They don't want to read how much it is and then not come away with an idea
// of what it looks like." And: "Families don't want to be reading paragraphs... they
// prefer stuff emailed to them to be explained concisely and plainly."
//
// So a photo-first card is FOUR things and no more: a photograph, a name, a one-line kind,
// one or two plain sentences, and a price. This file is what stops that decaying back into
// the bullet-list-of-features cards it replaced — which is the realistic failure, because
// the next person to add a location will copy the nearest card and then "just add" the
// detail they happen to know.
//
// Two kinds of assertion:
//
//   STRUCTURE   every .pf-card carries a real <img> whose file exists on disk, a name, a
//               kind, a price block, and a description within the sentence budget.
//   RANGES      every data-range / data-price figure is RECOMPUTED from the live data
//               module and compared string-for-string, exactly the way
//               verify_granite_niche_ranges.mjs and verify_glass_niche_ranges.mjs do it.
//               A range that was typed from memory, or one that went stale when a niche
//               sold, fails here.
//
// Wave 1 pages are listed in PAGES. The rollout track adds its guides to that array and
// nothing else — that is the whole point of putting the template behind a gate.
//
// Run from repo root:  node scripts/verify_photo_first.mjs
import fs from 'fs';
import path from 'path';
import * as ROAC from './roac-niche-data.mjs';
import * as GOMN from './gomn-niche-data.mjs';
import * as TGMP from './tgmp-data.mjs';
import * as MVC from './mvc-niche-data.mjs';
import * as ECL from './ecl-niche-data.mjs';
import * as COM from './com-crypt-data.mjs';
import { typicalStr } from './_typical_band.mjs';

// Wave 1 (sprint-11) plus the five per-area photo guides added in sprint-13. The area
// guides adopt the template's MARKUP and its budgets — one photograph, a name, a kind, at
// most two plain sentences, a verified price — but deliberately override the component's
// aspect-ratio boxes in their own BW:PHOTO-FIRST-CSS block, because the operator's
// complaint on 2026-08-03 was precisely that the boxed frames "cut off a lot of the
// photos". The structural assertions below do not care about the box, which is the right
// place for the line: the template is about what a card SAYS, not how tall it is.
const PAGES = [
  'urn-placement-guide.html', 'cemetery-property-guide.html',
  'roac-guide.html', 'mvc-niches-guide.html', 'ecl-guide.html', 'gomn-guide.html',
  'terrace-garden-guide.html',
];

// The description budget. Two sentences, and a hard character ceiling so that "two
// sentences" cannot be satisfied by two very long ones — which is how a paragraph budget
// is always defeated.
const MAX_SENTENCES = 2;
const MAX_CHARS = 240;

let bad = 0;
const fail = (m) => { bad++; console.log('  FAIL  ' + m); };
const ok = (m) => console.log('   ok   ' + m);

const money = (n) => '$' + n.toLocaleString('en-US');
const minmax = (xs) => [Math.min(...xs), Math.max(...xs)];
const rangeStr = (xs) => { const [lo, hi] = minmax(xs); return `${money(lo)}&ndash;${money(hi)}`; };

// ── every expected figure, recomputed from the modules ───────────────────────
const gomn = GOMN.allNiches().filter(GOMN.sellable).map((n) => n.p);
const roac = ROAC.allNiches().filter((n) => n.st === 'available').map((n) => n.p);
const mvc = MVC.allNiches().map((n) => n.price);
const ecl = Object.values(ECL.WALLS).flatMap((w) => w.niches).filter((n) => n.st === 'available').map((n) => n.p);
const tgn = TGMP.tgnNiches().filter(TGMP.sellable).map((n) => n.price);
const radser = [...COM.wallNiches('RAD'), ...COM.wallNiches('SER')].filter((n) => n.st === 'available').map((n) => n.p);
const tgmp = TGMP.TGMP_ITEMS.filter(TGMP.sellable).map((i) => i.price);

// ── GROUND BURIAL: the quote tool's own garden price list ────────────────────
// Operator, 2026-08-04: "you can keep the price ranges that's fine, maybe include a median
// price range as well for each." That closed the two cards on the Cemetery Property Guide
// that still said "Ask us for today's figures" — ground burial and mausoleum crypts — but
// only if a machine-readable source exists for each. For ground burial it does:
// index.html's `<select id="qGarden">`, the tool's live cemetery price list, which
// verify_urn_garden_ranges.mjs already treats as the authority for the Lake Urn Garden.
//
// POPULATION: the NUMBERED GARDENS, which is exactly what the card says a ground burial
// space is ("a lawn space in one of the numbered gardens"). Mechanically that is every
// option whose key starts with a digit — Garden 6 through Garden 23, including the graded
// options (Good / Better / Best / Reserved) and Gethsemane uprights, because each of those
// is a separately priced ground offering a family can actually buy.
//
// Deliberately OUT: the urn gardens and the Court of Honor cremorial (cremation, and the
// Lake Urn Garden has its own card), the Garden of Verses, the scattering optgroup, the
// Garden 21 lawn crypt (a different product, described separately on the card page), and
// the two veterans gardens (the space is given at no charge to a qualifying veteran, so
// printing its list price inside a ground-burial range would misdescribe both).
//
// ONE CAVEAT, STATED HONESTLY: this population is one entry per PRICE-LIST OFFERING, not
// one entry per available space — the tool carries no per-space garden availability. So
// the band is "most gardens", not "most spaces", and the page says exactly that. The niche
// and crypt bands below are per available unit and say "most niches" / "most crypts".
const app = fs.readFileSync('index.html', 'utf8');
const gardenOpts = (selId) => {
  const i = app.indexOf(`id="${selId}"`);
  if (i < 0) return null;
  const block = app.slice(i, app.indexOf('</select>', i));
  return new Map([...block.matchAll(/<option value="([^"|]+)\|(\d+)\|(\d+)"/g)]
    .filter((m) => /^\d/.test(m[1]))
    .map((m) => [m[1], Number(m[2])]));
};
const gardens = (() => {
  const q = gardenOpts('qGarden');
  if (!q) { fail('index.html has no <select id="qGarden"> — the ground-burial price list moved'); return []; }
  // A floor, not a count: the exact number of graded options changes when a garden opens
  // or closes, but a parse that suddenly returns three of them has broken, not sold out.
  if (q.size < 15) fail(`only ${q.size} numbered-garden option(s) parsed out of index.html — the price list changed shape`);

  // THE SECOND COPY. index.html carries the garden list TWICE: the quote builder's
  // `qGarden`, and an abridged copy in the A/B comparison panel (`cmpA_garden` /
  // `cmpB_garden`) that appears EARLIER in the file. Whichever one this gate happened to
  // read, believing it alone would mean printing a range off a list the tool might already
  // disagree with — the same trap verify_urn_garden_ranges.mjs closes for `lake_urn` by
  // requiring its two option copies to agree before either is trusted. So the copies are
  // reconciled here on the keys they share; the comparison panel is allowed to be shorter,
  // never to price a garden differently. (Side A of that panel is the SAVED quote, so it
  // has no select of its own — `cmpB_garden` is the only second copy in the file.)
  for (const sel of ['cmpB_garden']) {
    const c = gardenOpts(sel);
    if (!c) { fail(`index.html has no <select id="${sel}"> — the comparison panel's garden list moved, so the price list can no longer be cross-checked`); continue; }
    const off = [...c].filter(([k, p]) => q.has(k) && q.get(k) !== p);
    if (off.length) fail(`index.html prices ${off.length} garden(s) differently in ${sel} than in qGarden: ` +
      off.map(([k, p]) => `${k} ${money(p)} vs ${money(q.get(k))}`).join(', '));
    else ok(`index.html ${sel} agrees with qGarden on all ${[...c].filter(([k]) => q.has(k)).length} shared garden(s)`);
  }
  return [...q.values()];
})();

// ── MAUSOLEUM CRYPTS: Chapel of Memories, MIS-backed ─────────────────────────
// The crypt card is the one place a source had to be FOUND rather than assumed. index.html
// does not price crypts at all: the quote builder's crypt block is `Mausoleum Crypt
// (manual price)` — a free-text `<input id="qMausPrice">` the counsellor types into — and
// data/prices.json's `inventory` carries only ROAC niches. So there is no park-wide crypt
// price list anywhere in this repo.
//
// What there IS, is scripts/com-crypt-data.mjs: 374 available Chapel of Memories crypt
// units priced from the MIS available-crypts export of 2026-08-01, under the operator's
// own availability rule ("yes all 379 are available as long as a price is attached to it
// that is greater than 0"). Same population verify_com_map.mjs draws the public map from.
//
// The other three mausolea are NOT priced here and are not guessed at: elm-building-data
// and tg-maus-data both carry an ASK label and no figures. So the card names the building
// its range comes from and invites the family to ask about the rest. A range labelled
// "mausoleum crypts" that silently meant one of four buildings would be the invented
// number this gate exists to prevent.
const comCrypts = COM.cryptUnits().filter((u) => u.st === 'available' && u.p > 0).map((u) => u.p);

const EXPECT = {
  gardens: gardens.length ? rangeStr(gardens) : null,
  'com-crypts': rangeStr(comCrypts),
  gomn: rangeStr(gomn),
  roac: rangeStr(roac),
  mvc: rangeStr(mvc),
  ecl: rangeStr(ecl),
  tgn: rangeStr(tgn),
  radser: rangeStr(radser),
  tgmp: rangeStr(tgmp),
  // Every sellable niche the repo has data for, across all six columbariums. This is the
  // one figure that is an AGGREGATE of the others rather than a wall's own range, and it
  // is computed here for the same reason as the rest: so it cannot drift from them.
  'all-niches': rangeStr([...gomn, ...roac, ...mvc, ...ecl, ...tgn, ...radser]),
};

// ── THE TYPICAL BAND ─────────────────────────────────────────────────────────
// Operator, 2026-08-02, on $2,195-$82,500: "a very wide price range — also give a median
// price range on the glass front niches." A card that leads with a 38x span tells a family
// nothing, so the wide ones lead with the middle 50% of what is actually for sale and keep
// the full span as a secondary line. Same populations as EXPECT above, same string
// comparison — a hand-typed band fails here exactly as a hand-typed range does.
//
// `glass` is the aggregate the ruling was about: every currently-available GLASS-front
// niche the repo has data for (ECL + the MVC island + Radiance + Serenity). Granite fronts
// — ROAC, GOMN, TGN — are a different product and are deliberately out of it.
//
// AMENDED 2026-08-04 (s16 Track P). The operator extended the ruling from the glass-front
// niches to every property card on the Cemetery Property Guide: "you can keep the price
// ranges that's fine, maybe include a median price range as well for each." So the band is
// no longer reserved for spans the WIDE test below judges worth narrowing — a card may
// carry one either way, and two cards that previously printed no figure at all now print
// both. The WIDE test is unchanged in what it FORBIDS (a wide span with no band where a
// band would help); it simply no longer implies that a narrower span must go bare.
const GLASS = [...ecl, ...mvc, ...radser];
const EXPECT_TYPICAL = {
  glass: typicalStr(GLASS),
  gardens: gardens.length ? typicalStr(gardens) : null,
  'com-crypts': typicalStr(comCrypts),
  ecl: typicalStr(ecl),
  mvc: typicalStr(mvc),
  radser: typicalStr(radser),
  gomn: typicalStr(gomn),
  roac: typicalStr(roac),
  tgn: typicalStr(tgn),
  tgmp: typicalStr(tgmp),
  'all-niches': typicalStr([...gomn, ...roac, ...mvc, ...ecl, ...tgn, ...radser]),
};
// data-price keys are single figures, not ranges.
const EXPECT_PRICE = {
  // The Lake Urn Garden ground space. verify_urn_garden_ranges.mjs is the authority on
  // this figure — it reads it out of index.html's own <select id="qGarden"> — and the
  // value is repeated here rather than re-scraped so the two gates disagree loudly if
  // one is updated without the other.
  'lug.space': money(5495),
};

console.log('=== DATASETS ===');
console.log(`   GOMN ${gomn.length} sellable · ROAC ${roac.length} available · MVC ${mvc.length} openings`);
console.log(`   ECL ${ecl.length} available · TGN ${tgn.length} available · RAD+SER ${radser.length} available`);
console.log(`   all-niches aggregate over ${gomn.length + roac.length + mvc.length + ecl.length + tgn.length + radser.length} niches`);
console.log(`   glass-front population ${GLASS.length} (ECL ${ecl.length} + MVC ${mvc.length} + RAD/SER ${radser.length}) · typical band ${EXPECT_TYPICAL.glass.replace('&ndash;', '-')}`);
console.log(`   gardens ${gardens.length} numbered-garden offerings from index.html <select id="qGarden">` +
            (gardens.length ? ` · range ${EXPECT.gardens.replace('&ndash;', '-')} · band ${EXPECT_TYPICAL.gardens.replace('&ndash;', '-')}` : ' — UNAVAILABLE'));
console.log(`   com-crypts ${comCrypts.length} available Chapel of Memories units (MIS export ${COM.PRICES.exported})` +
            ` · range ${EXPECT['com-crypts'].replace('&ndash;', '-')} · band ${EXPECT_TYPICAL['com-crypts'].replace('&ndash;', '-')}`);

// ── card parsing ─────────────────────────────────────────────────────────────
function cards(html) {
  const out = [];
  const re = /<div class="pf-card[^"]*">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
  for (const m of html.matchAll(re)) out.push(m[1]);
  return out;
}
const pluck = (s, re) => { const m = re.exec(s); return m ? m[1].trim() : null; };
const textOf = (s) => s.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();

let totalCards = 0;
for (const page of PAGES) {
  console.log(`\n=== ${page} ===`);
  const html = fs.readFileSync(page, 'utf8');

  if (!html.includes('<!-- BW:PHOTO-FIRST-CSS:START')) {
    fail(`${page}: no BW:PHOTO-FIRST-CSS block — the card markup would render unstyled`);
  }
  // The screen block's rules are unconditional, so a copy sitting AFTER the print sheet
  // silently overrides guide-print.css's own @media print rules at equal specificity.
  // That shipped once: the printed price ranges stayed clipped mid-number after the fix
  // that was supposed to unclip them, and only rasterising the PDF found it.
  const iPf = html.indexOf('<!-- BW:PHOTO-FIRST-CSS:START');
  const iPrint = html.indexOf('<!-- BW:PRINT-CSS:START');
  if (iPf > -1 && iPrint > -1 && iPf > iPrint) {
    fail(`${page}: the photo-first CSS block sits AFTER the guide-print.css link, so it overrides the print rules`);
  } else if (iPf > -1) {
    ok('the photo-first CSS block precedes the print stylesheet link');
  }

  const list = cards(html);
  if (!list.length) { fail(`${page}: no .pf-card found`); continue; }
  totalCards += list.length;

  for (const c of list) {
    const name = textOf(pluck(c, /<h3>([\s\S]*?)<\/h3>/) || '');
    const label = name || '(unnamed card)';

    const img = pluck(c, /<img src="([^"]+)"/);
    if (!img) { fail(`${label}: no photograph — a photo-first card without a photo is the thing this template exists to prevent`); continue; }
    if (!fs.existsSync(path.resolve(img))) { fail(`${label}: photo ${img} does not exist on disk`); continue; }
    const alt = pluck(c, /<img [^>]*alt="([^"]*)"/);
    if (!alt || alt.length < 12) fail(`${label}: photo has no usable alt text (${JSON.stringify(alt)})`);

    if (!name) fail('a card has no <h3> name');
    const kind = textOf(pluck(c, /<div class="pf-kind">([\s\S]*?)<\/div>/) || '');
    if (!kind) fail(`${label}: no pf-kind line`);

    // The card sentence, as the WEBSITE shows it. Two things had to change here in
    // sprint-16, both from the condensed-PDF convention (docs/PDF_DEBRIEF.md):
    //   - a card paragraph may now carry `data-pdf="summary"`, so the opening tag is no
    //     longer literally `<p>`. Matching only `<p>` reported "no description" on four
    //     cards that plainly have one;
    //   - where it does, the paragraph holds BOTH versions, and the short one is
    //     `.pdf-summary`, hidden everywhere except the `?print=family` build. It is
    //     stripped before measuring, or every such card reads as double the length it is.
    const cScreen = c.replace(/<span class="pdf-summary">[\s\S]*?<\/span>/g, '');
    const blurb = textOf(pluck(cScreen, /<p\b[^>]*>([\s\S]*?)<\/p>/) || '');
    if (!blurb) fail(`${label}: no description`);
    else {
      const sentences = blurb.split(/[.!?](?:\s|$)/).filter((s) => s.trim().length > 1).length;
      if (sentences > MAX_SENTENCES) fail(`${label}: ${sentences} sentences, over the ${MAX_SENTENCES}-sentence budget — "${blurb.slice(0, 70)}..."`);
      else if (blurb.length > MAX_CHARS) fail(`${label}: description is ${blurb.length} chars, over the ${MAX_CHARS}-char ceiling`);
      else ok(`${label.padEnd(30)} photo ${img.padEnd(46)} ${sentences} sentence(s), ${blurb.length} chars`);
    }

    const price = pluck(c, /<div class="pf-price[^"]*">([\s\S]*?)<\/div>\s*$/) || c.slice(c.indexOf('pf-price'));
    if (!/pf-price/.test(c)) fail(`${label}: no price block — the operator's rule is photo THEN price, never a photo alone`);
    else if (!/data-range="|data-price="|pf-ask/.test(price)) {
      fail(`${label}: price block carries neither a data-range/data-price key nor pf-ask — an unverifiable figure`);
    }
  }

  // ── ranges ────────────────────────────────────────────────────────────────
  for (const [attr, table] of [['data-range', EXPECT], ['data-price', EXPECT_PRICE], ['data-typical', EXPECT_TYPICAL]]) {
    const re = new RegExp(`<[^>]*\\b${attr}="([^"]+)"[^>]*>([\\s\\S]*?)</`, 'g');
    for (const m of html.matchAll(re)) {
      const [, key, raw] = m;
      const printed = raw.trim();
      if (!(key in table)) {
        // A data-typical key with no population behind it is a band nobody can recompute —
        // which is the failure this whole mechanism exists to prevent. data-range/data-price
        // keys may legitimately belong to another gate.
        if (attr === 'data-typical') fail(`data-typical="${key}": no population is defined for that key, so the band is unverifiable`);
        continue;
      }
      if (table[key] === null) {
        // The key is known but its SOURCE did not yield a population this run. That is not
        // a pass with a warning: the page is printing a figure nothing can confirm.
        fail(`${attr}="${key}" prints ${printed}, but its source produced no population this run — the figure is unverifiable`);
        continue;
      }
      if (printed === table[key]) ok(`${attr}="${key}" prints ${printed}, recomputed from the module`);
      else fail(`${attr}="${key}" prints ${printed}, the module says ${table[key]}`);
    }
  }

  // ── a wide span may never lead alone ──────────────────────────────────────
  // The ruling was about $2,195-$82,500 specifically, but the fix has to be a rule or the
  // next wide range ships bare. Two conditions, both computed from the modules so there is
  // no per-key allow-list to rot:
  //
  //   WIDE      the full span runs more than 4x from end to end, and
  //   USEFUL    the middle 50% is at least twice as tight as that span.
  //
  // The second condition is not softness, it is the difference between helping and
  // pretending to. `tgmp` (nine path placements, $8,000-$52,000) has a middle 50% of
  // $8,000-$42,000 — same floor, 5.3x instead of 6.5x. Printing that under "Most of
  // these" would put a second near-identical range on the card and tell a family nothing
  // it did not already know. Where the band cannot narrow the answer, the honest card is
  // the range plus the invitation to call, which is what that card already carries.
  const WIDE = 4;
  const span = (s) => { const [lo, hi] = s.split('&ndash;').map((x) => +x.replace(/[$,]/g, '')); return hi / lo; };
  const typicalKeys = new Set([...html.matchAll(/\bdata-typical="([^"]+)"/g)].map((m) => m[1]));
  for (const key of new Set([...html.matchAll(/\bdata-range="([^"]+)"/g)].map((m) => m[1]))) {
    // `EXPECT[key] == null` is a key whose source yielded no population this run. The
    // string comparison above has already failed it by name; measuring a span off null
    // would crash the gate here and turn a clean named failure into a stack trace.
    if (!EXPECT[key]) continue;
    const full = span(EXPECT[key]);
    if (full <= WIDE) continue;
    const band = EXPECT_TYPICAL[key] ? span(EXPECT_TYPICAL[key]) : Infinity;
    const useful = band <= full / 2;
    if (typicalKeys.has(key)) {
      ok(`data-range="${key}" spans ${full.toFixed(1)}x and is led by a typical band spanning ${band.toFixed(1)}x` +
         (useful ? '' : ' — which barely narrows it, kept under the 2026-08-04 "a median range as well for each" ruling'));
    } else if (!useful) {
      ok(`data-range="${key}" spans ${full.toFixed(1)}x; its middle 50% spans ${band.toFixed(1)}x and would not narrow it — no band required`);
    } else {
      fail(`data-range="${key}" spans ${full.toFixed(1)}x with no data-typical band beside it — the operator's 2026-08-02 ruling`);
    }
  }

  // ── a band must sit INSIDE its own range ──────────────────────────────────
  // The two figures on a banded card come from the same population, so the band is
  // arithmetically bound to fall within the span. That makes this cheap to check and
  // worth checking: it is what catches a band and a range wired to DIFFERENT keys, which
  // is the realistic way this markup gets copied wrong — the numbers would each verify
  // against their own population and the card would still be nonsense.
  for (const key of typicalKeys) {
    if (!EXPECT_TYPICAL[key] || !EXPECT[key]) continue;
    const num = (s) => s.split('&ndash;').map((x) => +x.replace(/[$,]/g, ''));
    const [blo, bhi] = num(EXPECT_TYPICAL[key]);
    const [rlo, rhi] = num(EXPECT[key]);
    if (blo >= rlo && bhi <= rhi) ok(`the "${key}" band sits inside its own full range`);
    else fail(`the "${key}" band ${EXPECT_TYPICAL[key]} is not contained in its range ${EXPECT[key]} — the two figures are not from the same population`);
  }
}

console.log('');
console.log(bad
  ? `${bad} check(s) failed`
  : `all photo-first checks passed — ${totalCards} card(s) across ${PAGES.length} page(s)`);
if (bad) process.exit(1);
