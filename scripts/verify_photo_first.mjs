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

const PAGES = ['urn-placement-guide.html', 'cemetery-property-guide.html'];

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

const EXPECT = {
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

    const blurb = textOf(pluck(c, /<p>([\s\S]*?)<\/p>/) || '');
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
  for (const [attr, table] of [['data-range', EXPECT], ['data-price', EXPECT_PRICE]]) {
    const re = new RegExp(`<[^>]*\\b${attr}="([^"]+)"[^>]*>([\\s\\S]*?)</`, 'g');
    for (const m of html.matchAll(re)) {
      const [, key, raw] = m;
      const printed = raw.trim();
      if (!(key in table)) continue;   // another gate owns this key
      if (printed === table[key]) ok(`${attr}="${key}" prints ${printed}, recomputed from the module`);
      else fail(`${attr}="${key}" prints ${printed}, the module says ${table[key]}`);
    }
  }
}

console.log('');
console.log(bad
  ? `${bad} check(s) failed`
  : `all photo-first checks passed — ${totalCards} card(s) across ${PAGES.length} page(s)`);
if (bad) process.exit(1);
