// Page-shape checks for the guides whose page count is part of the requirement,
// not an accident of layout. Punch list items 2, 3 and 21 (2026-07-27).
//
//   direct-cremation.html  — EXACTLY two pages. Page 1 the quote and the
//                            information about it; page 2 the cremation container,
//                            shown and explained.
//   vault-guide.html       — all seven urn vaults on ONE page, and "Complete
//                            Pricing at a Glance" on ONE page.
//
// Counts come from the BUILT PDF (pdf-lib), so this fails if somebody edits the
// page and forgets to rebuild as well as if the layout regresses. The
// "all on one page" assertions are measured in print layout: both sections carry
// `page-break-before:always`, so an element is on that section's page if and only
// if its bottom is within one Letter page of the section's top.
//
// Run from repo root:  node scripts/verify_guide_pages.mjs
import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
import zlib from 'zlib';
import { check as manifestCheck } from './_pdf_manifest.mjs';
import { tables, classify, money } from './guide-price-rule.mjs';
import { GUIDES } from './guide-print-meta.mjs';
import { assertFamilyRegister } from './_no_mis_assert.mjs';

// Decompressed content stream of every page, as latin-1 strings. pdf-lib hands back the
// RAW (Flate) bytes; inflating is what makes the operators readable.
//
// A page's /Contents may legally be an ARRAY of streams rather than one stream, and the
// reader here used to handle only the single-stream case: `c.contents` is undefined on a
// PDFArray, so such a page measured as ZERO BYTES. Every check built on this function —
// the stranded-sheet gate, the full-bleed gates — would then have reported a fabricated
// result about a page it had not read. Found in s12 while sabotage-testing the amended
// full-bleed gate: the sabotaged artifact came back through pdf-lib with an array, and the
// wrong assertion fired. Chromium happens to emit one stream per page, so nothing in
// pdf-assets/ has ever tripped it; that is luck, not a guarantee. Arrays are concatenated
// here, which is exactly how a PDF consumer is required to treat them.
const _streams = new Map();
async function pageStreams(file) {
  if (_streams.has(file)) return _streams.get(file);
  const doc = await PDFDocument.load(fs.readFileSync(file), { updateMetadata: false });
  // A page stream that will not decode must ABORT, never fall through as its own
  // compressed bytes. This used to be `catch { return raw; }`, and s14 Track H walked
  // straight into what that hides: Ghostscript emits some page streams with the final
  // flate block truncated, `zlib.inflateSync` throws "unexpected end of file", and the
  // page was then measured as 11,873 bytes of gzip noise. Every check built on
  // pageStreams — the full-bleed cream ground, the no-cover rule, the stranded-sheet
  // gate — then reported a fabricated result about a page it had not read. It surfaced
  // as `Veterans Guide.pdf: page 3 has no full-bleed cream ground` while the rasterised
  // page was cream to all four corners (248,246,242 = #f8f6f2 at every edge pixel).
  // This is the same failure the PDFArray note below records, one layer down.
  //
  // Z_SYNC_FLUSH decodes everything up to the truncation instead of rejecting the whole
  // stream, which is what every real PDF consumer does. If even that yields nothing, the
  // run stops: an unreadable page is an unverified page, and an unverified page must
  // never be scored as a pass.
  const inflate = (s) => {
    const raw = Buffer.from(s && s.contents ? s.contents : []);
    if (!raw.length) return raw;
    try { return zlib.inflateSync(raw); } catch { /* fall through */ }
    try {
      const out = zlib.inflateSync(raw, { finishFlush: zlib.constants.Z_SYNC_FLUSH });
      if (out.length) return out;
    } catch { /* fall through */ }
    console.error(`FATAL ${file}: a page content stream (${raw.length} bytes) could not be `
      + 'decompressed. Refusing to measure it — every assertion below would be fiction.');
    process.exit(2);
  };
  const out = doc.getPages().map((pg) => {
    const c = pg.node.Contents();
    const parts = c && typeof c.asArray === 'function'
      ? c.asArray().map((ref) => inflate(doc.context.lookup(ref)))
      : [inflate(c)];
    return Buffer.concat(parts).toString('latin1');
  });
  _streams.set(file, out);
  return out;
}

// Page boxes in PDF points, parallel to pageStreams(). The full-bleed checks measure
// against the real sheet rather than a hardcoded Letter constant.
const _boxes = new Map();
async function pageBoxes(file) {
  if (_boxes.has(file)) return _boxes.get(file);
  const doc = await PDFDocument.load(fs.readFileSync(file), { updateMetadata: false });
  const out = doc.getPages().map((pg) => pg.getSize());
  _boxes.set(file, out);
  return out;
}

// The live page box. Until sprint-10 Track P4 the guides printed at @page{margin:0}, so a
// page WAS 11in of content. guide-print.css now sets real margins (0.5in / 0.55in bottom)
// to make room for the running footer, so the content box is 11 - 1.05 = 9.95in. Measuring
// "does this section fit on one page" against 1056 after that change would pass sections
// that in fact spill by an inch.
const PAGE_PX = Math.round(9.95 * 96); // 955

// ── PAGE BUDGET, COUNTED AS TOTAL PAGES ─────────────────────────────────────────────
// s10 counted the budget as INTERIOR pages — `total - 1` — because every guide opened with
// a generated full-bleed cover that was a wrapper rather than content. Sprint-11 Track D
// removed the cover on the operator's direction of 2026-08-02 ("I don't like the idea of a
// cover page"), so interior and total are the same number again, and every count below is
// a TOTAL page count — which is also the number he sees in a PDF reader.
//
// The cap is unchanged in the only unit he ever stated it in: SIX PAGES, TOTAL. It simply
// no longer spends one of them on a cover, so a guide has six content pages where it had
// five. The per-guide equalities below were written as interior counts and are unchanged
// as numbers for exactly that reason.

const PDF_PAGES = [
  ['pdf-assets/Direct Cremation Plan Example.pdf', 2],
  // Burial Vault Guide was an EQUALITY at 4 pages, inherited from the 2026-07-29 condense
  // that brought it down from 10. It was never really an equality — the requirement was a
  // cap — and the pricing rule shrank it to 3 pages by removing the per-item
  // vault prices. Asserted by the shared cap below instead of pinning a number that only
  // ever meant 'no more than'.
  // Glass-Front Niche used to be pinned here at an EQUALITY of 3 pages (sprint-08 Track Q's
  // "exactly four printed pages", minus the cover s11 removed), with a note that growing it
  // back would be "a regression, not a redesign". The operator overruled that on 2026-08-03
  // — "same with glass front niches as well", meaning the granite guide's page-per-location
  // photo treatment — so it is a CAP of 8 in PER_GUIDE_CAPS now, not an equality here. The
  // equality is deleted rather than raised: what he asked for is room, not a fixed length.
  // Sprint-08 Track U: a ONE-page infographic covering the Lake and Rose urn gardens.
  // With the cover gone it is one page, full stop — which is what the requirement said.
  ['pdf-assets/Urn Gardens at Washington Memorial Park.pdf', 1],
];

// The page cap, asserted on the built artifact. Product catalogs (caskets, urns,
// keepsakes, cremation containers, the GPL, marker sizes) are deliberately NOT here:
// a catalog is as long as its catalog.
const GUIDE_MAX_PAGES = 6; // operator 2026-08-01: six pages TOTAL per guide. s11 removed the cover, so all six are content.
const CAPPED_GUIDES = [
  // markers-guide.html prints TWO PDFs (sprint-11 Track B) — sizes/colors and
  // photos/etching. Each carries the full six-page family-guide budget in its own right;
  // the operator asked for two separate documents, not one document in two files.
  'Granite Marker Sizes and Colors.pdf', 'Marker Photos and Etching.pdf',
  // The bronze companion (sprint-22 Track B). One PDF, its own cap below.
  'Bronze Markers.pdf',
  'Cremation Guide.pdf', 'Veterans Guide.pdf',
  'Who Decides.pdf', 'Burial Vault Guide.pdf', 'Terramation Guide.pdf',
  'Cemetery Property Guide.pdf', 'Medicaid and Planning Ahead.pdf',
  'Medicaid Professional Reference.pdf', 'Cremation or Burial.pdf',
  'Urn Placement Options.pdf', 'Scattering Garden Pricing.pdf', 'Burial Guide.pdf',
  'Granite Niches Guide.pdf', 'Glass-Front Niche Guide.pdf',
  'Urn Gardens at Washington Memorial Park.pdf',
  'Outside Marker Rules and Pricing.pdf', 'Pre-Planning Guide.pdf',
  'Direct Cremation Plan Example.pdf',
  // The five per-area photo guides (sprint-13, area-guides). They carry their own,
  // LOOSER cap — see PER_GUIDE_CAPS below — but they are in this list because everything
  // else it drives (the cream page ground, the no-cover rule, the stranded-sheet check,
  // the freshness manifest) applies to them exactly as to every other guide.
  'Rock of Ages Columbarium.pdf', 'Mountain View New Glass-Front Niches.pdf',
  'Eternal Light Columbarium.pdf', 'Garden of Meditation Niches.pdf',
  'Terrace Garden Memorial Path.pdf',
];

// ── PER-GUIDE CAPS ──────────────────────────────────────────────────────────────────
// A guide whose own requirement differs from the shared family-guide cap. This started as
// TIGHT_CAPS, holding only guides that had to be SHORTER; sprint-13 made it a two-way map,
// because the operator raised them.
//
// Operator, 2026-08-03: "the crops on the granite niches guide cut off a lot of the photos.
// This guide can be longer if we can have better quality photos for each section. maybe a
// page per columbarium or nich section each." Then: "same with glass front niches as well."
// Then: "larger more visual guides for each section that we still have a lot of inventory
// for ... all cleaned up and with the best photos from each folder included" — the five
// per-area guides.
//
// A photograph a family can actually judge a niche wall from is about a third of a page;
// a page per location plus the prices does not fit in six pages, and shrinking the photos
// back down is the exact complaint that opened this sprint. Eight pages each, BY NAME.
// `GUIDE_MAX_PAGES` is untouched at six and still governs every other guide — asserted
// below, so a future edit that "simplifies" this by bumping the shared cap fails instead
// of quietly giving every guide two extra pages nobody asked for.
//
// A cap here REPLACES the shared cap for that guide; it may be lower or higher.
const PER_GUIDE_CAPS = new Map([
  // Cemetery Property is the first guide built from the condensed `?print=family` cut
  // (sprint-16 Track A). It came down from four pages to two, and two is the requirement
  // rather than a happy accident — docs/PDF_DEBRIEF.md, rule 1: "A family PDF is two
  // pages ... If it does not fit, cut content, never type size." Held here at 2 so a
  // future edit that quietly re-lengthens it fails instead of drifting back toward the
  // shared six.
  ['Cemetery Property Guide.pdf', 2],
  // THE REMAINING SEVEN TIER-1 GUIDES (sprint-16 Track B), all now built from
  // `?print=family`. Same reasoning as Cemetery Property above, and the numbers are the
  // Tier-1 targets in docs/PDF_AUDIT.md rather than whatever each happened to build to:
  // Pre-Planning 4->2, Cremation or Burial 3->2, Cremation 4->2, Burial 2->2,
  // Direct Cremation 2->2, Who Decides 4->2, Urn Gardens 1->1.
  //
  // Direct Cremation and Urn Gardens were already at their targets before this sprint, but
  // they are named here anyway: both went up from 7.7pt to 10.5pt in the same change, and a
  // cap that is only asserted for the guides that moved would not catch the one that
  // matters most — a future edit re-lengthening a document that is currently just inside
  // its page. Urn Gardens at 1 is the tightest of the lot; it measured 967px against a
  // 972px page and only holds because content was cut for it (see the note in §8i of
  // guide-print.css).
  ['Pre-Planning Guide.pdf', 2],
  ['Cremation or Burial.pdf', 2],
  ['Cremation Guide.pdf', 2],
  ['Burial Guide.pdf', 2],
  ['Direct Cremation Plan Example.pdf', 2],
  ['Who Decides.pdf', 2],
  ['Urn Gardens at Washington Memorial Park.pdf', 1],
  // ── TIER 3 (sprint-16 Track E) ────────────────────────────────────────────────────
  // The Tier-3 rows of docs/PDF_AUDIT.md, all now built from `?print=family` (the two
  // marker PDFs from `?part=X&print=family`). Same reasoning as Tiers 1 and 2: the number
  // is the requirement, not what the layout happened to produce, so a future edit that
  // re-lengthens one of them fails here instead of drifting.
  ['Veterans Guide.pdf', 2],
  ['Medicaid and Planning Ahead.pdf', 2],
  ['Granite Marker Sizes and Colors.pdf', 2],
  ['Marker Photos and Etching.pdf', 2],
  ['Outside Marker Rules and Pricing.pdf', 2],
  // Bronze Markers (sprint-22 Track B) builds to 5 and is held at 5, not at the shared 6.
  // It is longer than the two-page Tier-1 cut on purpose: the park's marker rules are the
  // content, and there are three separate grave cases, each with four or five allowed
  // marker-and-base pairings. The condensing already applied is the same as everywhere
  // else (Section 2 summarised, one photograph dropped, photographs at 42% width); what
  // is left is rules and prices, and cutting those would be cutting the guide. Held at 5
  // so a future edit that re-lengthens it fails here rather than drifting to six.
  ['Bronze Markers.pdf', 5],
  ['Burial Vault Guide.pdf', 2],
  ['Terramation Guide.pdf', 2],
  // Medicaid Professional Reference is the audit's one "do not condense" row: its audience
  // is case workers and attorneys and the WAC/RCW citations are the product. It got the
  // two legibility fixes only (type to the 10.5pt floor, two-column flow off — see
  // guide-print.css §8j) and NO content selection, so it GREW: 3 pages to 5. That is the
  // honest measured count and it is recorded rather than engineered. It sits inside the
  // shared six-page cap, so no named exception is needed and none is added — writing one
  // would only pin a number that means nothing here. If a future edit takes it past six,
  // the right answer is to raise ITS cap, never to shrink the type back.
  // Granite and Glass-Front HOLD at eight. docs/PDF_AUDIT.md, Tier 2, marks both "8 hold —
  // already re-cut in s13 at 9pt for the photos. Do not shrink." Sprint-16 Track D
  // rasterised every page of both and confirmed the s13 crops are intact; neither guide
  // was converted and neither cap moved. They build to six today, which is the room the
  // operator asked for rather than a target to hit.
  ['Granite Niches Guide.pdf', 8],
  ['Glass-Front Niche Guide.pdf', 8],
  // ── THE TIER-2 PROPERTY GUIDES, CONDENSED (sprint-16 Track D) ─────────────────────
  // All seven now build from `?print=family`, and these are the audit's Tier-2 targets
  // rather than what each happened to build to. They came DOWN from the eight-page
  // area-guide allowance and from the shared six:
  //   Rock of Ages 5->3, Mountain View 5->3, Eternal Light 4->3, Terrace Garden 4->3,
  //   Garden of Meditation 3->2, Urn Placement 3->2, Scattering 1->1.
  //
  // Garden of Meditation builds to TWO against a cap of three, and the cap is deliberately
  // the target and not the build: the audit asked for the same three-page shape as the
  // other four area guides, and that guide simply has two photographs where the others
  // have four or five. Holding it at 2 would fail the moment a third photograph is added,
  // which is a change worth making, not a regression.
  //
  // Scattering at 1 is the tightest of the lot. It is a price sheet (audit: "Three plans.
  // It is a price sheet. One page.") and it holds one page only because the three
  // packages' line-item lists are dropped from the family cut — the pricing rule
  // suppresses every amount in them, so they printed as three identical columns of labels
  // beside blank space. The package totals still print, in the card footers, where they
  // were never chips.
  ['Rock of Ages Columbarium.pdf', 3],
  ['Mountain View New Glass-Front Niches.pdf', 3],
  ['Eternal Light Columbarium.pdf', 3],
  ['Garden of Meditation Niches.pdf', 3],
  ['Terrace Garden Memorial Path.pdf', 3],
  ['Urn Placement Options.pdf', 2],
  ['Scattering Garden Pricing.pdf', 1],
]);

// Every guide the print system covers, for the no-cover / blank-page / pricing-rule gates.
const ALL_GUIDE_PDFS = [...new Set([...CAPPED_GUIDES, 'Medicaid Professional Reference.pdf'])];

let bad = 0;
const fail = m => { bad++; console.log('  FAIL  ' + m); };
const ok = m => console.log('   ok   ' + m);

console.log('=== BUILT PDF PAGE COUNTS ===');
for (const [file, want] of PDF_PAGES) {
  if (!fs.existsSync(file)) { fail(`${file} does not exist — run scripts/build_guide_pdfs.mjs`); continue; }
  const n = (await PDFDocument.load(fs.readFileSync(file), { updateMetadata: false })).getPageCount();
  if (n === want) ok(`${path.basename(file).padEnd(36)} ${n} page(s)`);
  else fail(`${path.basename(file)}: expected ${want} pages, built PDF has ${n}`);
}

// The shared cap must stay six. If someone raises GUIDE_MAX_PAGES instead of adding a named
// entry to PER_GUIDE_CAPS, every guide silently gets longer and the named exceptions
// stop being exceptions.
console.log('\n=== THE SHARED CAP IS STILL SIX ===');
if (GUIDE_MAX_PAGES === 6) ok(`GUIDE_MAX_PAGES = 6, with ${PER_GUIDE_CAPS.size} named exception(s): ${[...PER_GUIDE_CAPS].map(([n, c]) => `${n} ${c}`).join(', ')}`);
else fail(`GUIDE_MAX_PAGES is ${GUIDE_MAX_PAGES}, not 6 — the operator's per-guide rulings must be named exceptions in PER_GUIDE_CAPS, not a bump to the shared cap`);

console.log(`\n=== FAMILY GUIDE PAGE CAP (<= ${GUIDE_MAX_PAGES} pages, total; named exceptions apply their own) ===`);
for (const name of CAPPED_GUIDES) {
  const file = `pdf-assets/${name}`;
  if (!fs.existsSync(file)) { fail(`${file} does not exist — run scripts/build_guide_pdfs.mjs`); continue; }
  const n = (await PDFDocument.load(fs.readFileSync(file), { updateMetadata: false })).getPageCount();
  const cap = PER_GUIDE_CAPS.has(name) ? PER_GUIDE_CAPS.get(name) : GUIDE_MAX_PAGES;
  const how = PER_GUIDE_CAPS.has(name) ? `own cap ${cap}` : `shared cap ${cap}`;
  if (n <= cap) ok(`${name.padEnd(44)} ${n} page(s) (${how})`);
  else fail(`${name}: ${n} pages, over its ${how}`);
}

// A cap for a PDF that is not in CAPPED_GUIDES asserts nothing at all. That is how an
// exception rots: the guide gets renamed, the entry stays, and the cap silently stops
// applying to anything.
for (const name of PER_GUIDE_CAPS.keys()) {
  if (!CAPPED_GUIDES.includes(name)) fail(`PER_GUIDE_CAPS names "${name}", which is not in CAPPED_GUIDES — that cap is checked against nothing`);
}

console.log('\n=== "ALL ON ONE PAGE" (print layout) ===');
const browser = await chromium.launch();

// `file` may carry a query — and for anything measured against a BUILT artifact it MUST.
// These assertions describe the PDF a family receives, and since sprint-16 that PDF is
// printed from `?print=family`, not from the bare page. The query was dropped here when the
// build moved and the checks went on measuring the uncondensed page; they kept passing only
// because guide-print.css §7 was shrinking that page to 7.7pt as well. Sprint-19 Track E
// made the bare page print at full size — which is the point — and these two immediately
// reported the uncondensed stack overflowing a sheet, for a PDF that is still exactly two
// pages. Measure the mode the artifact is built in.
async function onePage(file, sectionSel, childSel, label) {
  const [base, query] = file.split('?');
  const page = await browser.newPage({ viewport: { width: 816, height: PAGE_PX } });
  await page.goto(pathToFileURL(path.resolve(base)).href + (query ? '?' + query : ''), { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  const r = await page.evaluate(([s, c]) => {
    const sec = document.querySelector(s);
    if (!sec) return { missing: s };
    const top = sec.getBoundingClientRect().top;
    const kids = [...sec.querySelectorAll(c)];
    if (!kids.length) return { missing: c };
    const worst = Math.max(...kids.map(k => k.getBoundingClientRect().bottom));
    return { n: kids.length, span: +(worst - top).toFixed(1) };
  }, [sectionSel, childSel]);
  await page.close();
  if (r.missing) { fail(`${file}: nothing matches "${r.missing}"`); return; }
  // A non-positive span is NOT a pass. It is what you get when every element the check
  // names has been display:none-d — which is exactly what the pricing rule did to
  // `.vault-table`, turning two of these assertions into hollow gates that reported
  // "-3395.7px of a 955px page" as ok. Measure something, or fail.
  if (r.span <= 0) { fail(`${label}: span ${r.span}px — the selector matches nothing VISIBLE in print, so this assertion proves nothing`); return; }
  if (r.span <= PAGE_PX) ok(`${label.padEnd(46)} ${r.n} items, ${r.span}px of a ${PAGE_PX}px page`);
  else fail(`${label}: ${r.n} items span ${r.span}px, more than one ${PAGE_PX}px page`);
}

await onePage('vault-guide.html?print=family', '#urn-vaults', '.uv-card', 'vault-guide urn vault cards');
// `.vault-table` is suppressed in print by the pricing rule, so these two now measure what
// the family actually receives: the section plus the invitation that replaced its table.
await onePage('vault-guide.html?print=family', '#urn-vaults', '.uv-card, .print-invite', 'vault-guide urn vault section incl. invite');
// NO `?print=family` on this one, deliberately: `#all-pricing` is `data-pdf="drop"`, so it
// is not in the family PDF at all and the check would measure a display:none element and
// self-report as hollow. What it gates is the FULL print — the page a family gets from
// Ctrl+P on the site — where the section still has to hold together on one sheet.
await onePage('vault-guide.html', '#all-pricing', '.print-invite', 'vault-guide Complete Pricing at a Glance (full print)');
await onePage('direct-cremation.html?print=family', '#options', '.sidebar, .prose, .section-photo', 'direct-cremation container section');

// direct-cremation page 1 is the cover plus sections 1 and 2; if that stack is
// taller than a page, section 2 spills and the handout becomes three pages.
{
  const page = await browser.newPage({ viewport: { width: 816, height: PAGE_PX } });
  // `?print=family` for the same reason as onePage above: this measures the two-page
  // handout that is BUILT, not the full-size page a family gets from Ctrl+P.
  await page.goto(pathToFileURL(path.resolve('direct-cremation.html')).href + '?print=family', { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  const h = await page.evaluate(() => {
    const q = s => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().height : 0; };
    return +(q('.cover') + q('.contents') + q('#quote') + q('#about')).toFixed(1);
  });
  await page.close();
  if (h <= PAGE_PX) ok(`direct-cremation page 1 (cover + quote + about)  ${h}px of a ${PAGE_PX}px page`);
  else fail(`direct-cremation page 1 stack is ${h}px, more than one ${PAGE_PX}px page — section 2 will spill`);
}

// (browser stays open — the pricing-rule gate below also measures print layout)

// ===================================================================================
// NO file:// URI IN ANY BUILT PDF  (sprint-10 Track P4, commit 1)
//
// The builders used to print from `pathToFileURL(...)`, so every relative href became a
// `/URI` annotation holding the BUILD MACHINE'S ABSOLUTE PATH. Ten guide PDFs shipped one;
// `Glass-Front Niche Guide.pdf` shipped `file:///C:/Users/Martice/bw-quote-tool-mis3/...`,
// naming a git worktree. These PDFs are emailed to families.
//
// The scan walks pdf-lib's parsed indirect objects rather than raw bytes, because the
// annotations live inside Flate-compressed object streams — and it deliberately does NOT
// use a "list the links" API: PyMuPDF's `get_links()` returns NOTHING for these, since the
// anchors sit inside print-hidden chrome and their link rectangles are degenerate. The
// leak was invisible to the obvious check for months. Look at the objects, not the links.
// ===================================================================================

// ===================================================================================
// NO COVER PAGE ON ANY GUIDE  (sprint-11 Track D)
//
// The inverse of the s10 gate that stood here. That gate asserted page 1 WAS a generated
// full-bleed cover; the operator ruled on 2026-08-02 that he does not want one, so this
// now asserts that NO page of any guide PDF is full-bleed. Same measurement, opposite
// sense — which is the point: it makes the reversal load-bearing instead of a deletion
// nobody would notice being quietly undone.
//
// The marker is FULL-BLEED GEOMETRY, not colour, and that is worth keeping from the s10
// note. The first attempt at the original gate keyed on the navy plate fill and flagged
// all nineteen guides: #1e3a55 is also the masthead heading colour, so every content page
// paints it as text. Colour is not evidence of a cover.
//
// Geometry is. Measured on the s10 artifacts: covers carried a 6120 x 7920 rect (612 x
// 792pt at Chromium's 10x content scale) while content pages were clipped to the margined
// content box and topped out at 5400 x 7170.
//
// ── AMENDED, sprint-12 Track C ──────────────────────────────────────────────────────
// "No page is full-bleed" is no longer true and must not be, because the operator ruled on
// 2026-08-03 that the cream MUST reach the paper edge: "the margins are supposed to be
// stretched to the edge ... the footer should just overlap with the cream not sit outside
// separately." guide-print.css delivers that with `@page{background:#f8f6f2}`, which paints
// the whole sheet, margins included — so from s12 every page of every guide carries exactly
// the full-bleed rect this gate used to forbid.
//
// The check is NOT deleted, and it is not weakened to a colour heuristic either. It is
// SPLIT, and the split is what keeps its teeth:
//
//   1. PAGE GROUND (new, positive) — every page must carry a full-bleed rect and it must be
//      filled with the cream. This is a stronger assertion than the old one: it fails if the
//      bleed silently stops working, which is precisely the regression the operator reported
//      and which no gate would have caught. The old rule's second job — "the page margins are
//      still applying" — is replaced by an equally load-bearing "the page ground is still
//      applying", asserted rather than inferred.
//   2. NO COVER (kept, narrowed) — nothing ELSE may be painted full-bleed. Any full-bleed
//      rect in a colour other than the cream ground, and any full-bleed IMAGE, still fails.
//      A returning cover is a navy plate or a photograph across the whole sheet; both are
//      caught. The allowance is exactly one colour on exactly one shape, and it is the shape
//      the stylesheet is required to emit.
//
// Colour is read from the stream, not assumed: the fill in force at each `re` is tracked by
// walking `rg` and `re` operators in order. Chromium writes the cream as
// `0.972656 0.964844 0.949219 rg` (8-bit 248/246/242 = #f8f6f2); the tolerance is one 8-bit
// step so a re-encode cannot fail it and a different colour cannot pass.
const CREAM = [0.972656, 0.964844, 0.949219];
const isCream = (c) => c && c.every((v, i) => Math.abs(v - CREAM[i]) < 1 / 255);

// Chromium writes page content under a `q 0.1 0 0 0.1 0 0 cm` CTM, so a full sheet is
// 6120 x 7920 rather than 612 x 792. The old gate hardcoded 6000/7800 and therefore could
// only ever see a cover drawn in THAT convention — a full-bleed rectangle written in plain
// PDF units sailed straight through, which is exactly what happened the first time this
// amendment was sabotage-tested. Both conventions are accepted now: a paint counts as
// full-bleed if it covers >=98% of the sheet at 1x or at 10x.
// The window is two-sided on purpose. A one-sided ">= 0.98 x sheet" test looks right and is
// not: at 1x it also swallows every 10x-convention rect, so the margined content box
// (5400 x 7290 against a 612 x 792 sheet) reads as full-bleed and the gate fails everything.
const near = (v, t) => v >= 0.98 * t && v <= 1.05 * t;
const isBleed = (w, h, W, H) =>
  (near(Math.abs(w), W) && near(Math.abs(h), H)) ||
  (near(Math.abs(w), 10 * W) && near(Math.abs(h), 10 * H));

// Full-bleed paints on one page: how many are the cream ground, and what else is there.
//
// Two shapes of filled rectangle are recognised, because a cover can arrive in either.
// Chromium always writes `x y w h re` + `f`; other producers (pdf-lib among them, which is
// what stamped the sabotage fixtures) write the same rectangle as an explicit `m`/`l`/`h`
// subpath. The first sabotage run passed a navy full-sheet cover straight through a gate
// that only knew `re` — a gate that can be defeated by re-emitting the same geometry with
// different operators is not measuring geometry, it is measuring spelling.
function fullBleedPaints(stream, { width: W, height: H }) {
  let fill = null;
  let xs = [], ys = [];
  const ground = [], other = [];
  const flush = (painted) => {
    if (painted && xs.length >= 3
        && isBleed(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), W, H)) {
      (isCream(fill) ? ground : other).push(fill);
    }
    xs = []; ys = [];
  };
  const TOK = /(-?[0-9.]+) (-?[0-9.]+) (-?[0-9.]+)\s+rg|(-?[0-9.]+) (-?[0-9.]+) (-?[0-9.]+) (-?[0-9.]+)\s+re|(-?[0-9.]+) (-?[0-9.]+)\s+([ml])\b|\b(f\*|f|B\*|B|b\*|b)\s|\b([Sns])\s/g;
  for (const m of stream.matchAll(TOK)) {
    if (m[1] !== undefined) { fill = [+m[1], +m[2], +m[3]]; continue; }
    if (m[4] !== undefined) {                       // `re` — its own complete rectangle
      if (isBleed(+m[6], +m[7], W, H)) (isCream(fill) ? ground : other).push(fill);
      continue;
    }
    if (m[8] !== undefined) { xs.push(+m[8]); ys.push(+m[9]); continue; }  // m / l
    if (m[11] !== undefined) { flush(true); continue; }                    // a FILL op
    if (m[12] !== undefined) { flush(false); continue; }                   // stroke / no-op
  }
  // A full-sheet XObject draw — the shape a photographic cover takes. The scaling `cm` and
  // the `Do` are not necessarily adjacent: producers emit identity `cm`s and `gs` states in
  // between (pdf-lib emits two), and requiring adjacency let a stamped full-sheet photograph
  // through the first time this was sabotage-tested. Only whitespace, further `cm`s and `gs`
  // states may intervene, so this cannot drift into matching any `Do` that happens to follow
  // a scaled transform somewhere later on the page.
  // Every `cm` in that run is COMPOSED, not just the first one matched: producers emit
  // identity transforms around the real one, and a regex anchored on the first `cm` before
  // the `Do` reads the identity and measures the image as 1 x 1.
  const images = [...stream.matchAll(/((?:(?:-?[0-9.]+ ){6}cm\s*|\/[^\s]+ gs\s*)+)\/[^\s]+ Do/g)]
    .map((m) => {
      let sx = 1, sy = 1;
      for (const c of m[1].matchAll(/(-?[0-9.]+) -?[0-9.]+ -?[0-9.]+ (-?[0-9.]+) -?[0-9.]+ -?[0-9.]+ cm/g)) {
        sx *= +c[1]; sy *= +c[2];
      }
      return [sx, sy];
    })
    .filter(([sx, sy]) => isBleed(sx, sy, W, H)).length;
  return { ground: ground.length, other, images };
}

console.log('\n=== FULL-BLEED CREAM PAGE GROUND (operator 2026-08-03) ===');
for (const name of ALL_GUIDE_PDFS) {
  const file = `pdf-assets/${name}`;
  if (!fs.existsSync(file)) { fail(`${file} does not exist`); continue; }
  const streams = await pageStreams(file);
  const boxes = await pageBoxes(file);
  const naked = streams.map((x, i) => (fullBleedPaints(x, boxes[i]).ground ? 0 : i + 1)).filter(Boolean);
  if (naked.length) fail(`${name}: page(s) ${naked.join(', ')} have no full-bleed cream ground — the cream stopped reaching the paper edge`);
  else ok(`${name.padEnd(44)} cream to the edge on all ${streams.length} page(s)`);
}

console.log('\n=== NO COVER PAGE (nothing but the ground is full-bleed) ===');
for (const name of ALL_GUIDE_PDFS) {
  const file = `pdf-assets/${name}`;
  if (!fs.existsSync(file)) { fail(`${file} does not exist`); continue; }
  const streams = await pageStreams(file);
  const boxes = await pageBoxes(file);
  const bleeders = streams
    .map((x, i) => ({ i: i + 1, p: fullBleedPaints(x, boxes[i]) }))
    .filter((r) => r.p.other.length || r.p.images);
  if (bleeders.length) {
    fail(`${name}: page(s) ${bleeders.map((r) => `${r.i} (${r.p.other.length} non-cream fill(s), ${r.p.images} image(s))`).join(', ')} paint full-bleed — a cover page is back`);
  } else ok(`${name.padEnd(44)} no cover, ${streams.length} content page(s)`);
}

// ===================================================================================
// NO STRANDED SHEET  (sprint-10 Track P4, commit 2)
//
// The regression P3's audit caught: a guide whose last page carries nothing but the
// footer. Adding a full-page cover made it far worse — measured by rasterising while the
// work was done, eleven guides ended on a sheet of 0.6%-2.8% ink, and
// scattering-guide.html printed a page carrying literally only the running header and
// footer (0.4%). Root cause was `.doc-sheet{min-height:100vh}`, a SCREEN rule the guides'
// print CSS never reset; see guide-print.css.
//
// Rasterising needs a PDF renderer this repo has no Node binding for, so the gate uses the
// DECOMPRESSED content-stream length, calibrated against those rasterised measurements: a
// real content page runs 30,000-55,000 bytes; the thinnest page that survives review today is 6,230 (the outside-marker CTA,
// flagged in the track report as worth rebalancing); the furniture-only page that started all
// this ran under 4,000.
//
// s11: this used to skip page 1, because page 1 was the generated cover — one image and one
// fill, about 3,000 bytes, whose size said nothing about ink. With the cover gone page 1 is
// content like any other, so it is measured like any other. That also closes the hole the
// exemption left: a one-page guide had `slice(1)` return nothing, `Math.min()` of nothing is
// Infinity, and the check passed without measuring a single byte.
// ===================================================================================
const MIN_INTERIOR_STREAM = 5000;
console.log(`\n=== NO STRANDED SHEET (every page's stream >= ${MIN_INTERIOR_STREAM} bytes) ===`);
for (const name of ALL_GUIDE_PDFS) {
  const file = `pdf-assets/${name}`;
  if (!fs.existsSync(file)) { fail(`${file} does not exist`); continue; }
  const lens = (await pageStreams(file)).map((x) => x.length);
  if (!lens.length) { fail(`${name}: no pages at all`); continue; }
  const worst = Math.min(...lens);
  if (worst >= MIN_INTERIOR_STREAM) ok(`${name.padEnd(44)} thinnest page ${worst} bytes of ${lens.length}`);
  else fail(`${name}: a page holds only ${worst} bytes of content — a stranded sheet`);
}


// ===================================================================================
// THE PRICING RULE  (sprint-10 Track P4, commit 2)
//
// Operator, 2026-08-01: "we can keep price ranges just not very specific pricing so then
// they could ask me for an actual quote." Asserted in PRINT LAYOUT, per guide:
//
//   1. everything the rule marked is actually gone from the printed page (zero height);
//   2. every invitation that replaced it is actually visible;
//   3. every printed range still EQUALS the min-max recomputed from the rows that were
//      suppressed. This is the check that matters day to day: it fails the moment someone
//      edits a price in a table and does not re-run the generator, which is precisely how
//      a printed range drifts into being a figure nobody can vouch for.
//   4. and the mirror of it — screen is untouched: the same elements must have NON-zero
//      height in screen media. A rule that leaked out of @media print would take real
//      pricing off the website, and it would be found by a family, not by us.
// ===================================================================================
console.log('\n=== PRICING RULE (print layout) ===');
for (const g of GUIDES) {
  const html = fs.readFileSync(g, 'utf8');
  const marked = tables(html).filter((t) => /<table[^>]*data-print-suppress=/.test(t.html));
  const invites = [...html.matchAll(/data-print-range="([^"]+)">([^<]+)</g)];

  // 3 — recompute each generated range from the table it replaced.
  const drifted = [];
  const priced = marked.filter((t) => /data-print-suppress="price"/.test(t.html));
  if (priced.length === invites.length) {
    priced.forEach((t, i) => {
      const c = classify({ html: t.html.replace(/ data-print-suppress="[^"]*"/, '') });
      const want = `${money(c.lo)}&ndash;${money(c.hi)}`;
      if (invites[i] && invites[i][2] !== want) drifted.push(`${invites[i][1]}: prints ${invites[i][2]}, table says ${want}`);
    });
  }

  const page = await browser.newPage({ viewport: { width: 816, height: PAGE_PX } });
  await page.goto(pathToFileURL(path.resolve(g)).href, { waitUntil: 'networkidle' });
  const screen = await page.evaluate(() => ({
    sup: [...document.querySelectorAll('[data-print-suppress]')].filter((e) => e.getBoundingClientRect().height > 0).length,
    supTotal: document.querySelectorAll('[data-print-suppress]').length,
    inv: [...document.querySelectorAll('.print-invite')].filter((e) => e.getBoundingClientRect().height > 0).length,
    invTotal: document.querySelectorAll('.print-invite').length,
  }));
  await page.emulateMedia({ media: 'print' });
  const print = await page.evaluate(() => ({
    sup: [...document.querySelectorAll('[data-print-suppress]')].filter((e) => e.getBoundingClientRect().height > 0).length,
    inv: [...document.querySelectorAll('.print-invite')].filter((e) => e.getBoundingClientRect().height > 0).length,
  }));
  await page.close();

  const problems = [];
  if (print.sup !== 0) problems.push(`${print.sup} suppressed element(s) still print`);
  if (print.inv !== screen.invTotal) problems.push(`${screen.invTotal - print.inv} invitation(s) do not print`);
  if (screen.supTotal && screen.sup !== screen.supTotal) problems.push('the rule leaked onto SCREEN — priced tables are hidden on the website');
  if (screen.invTotal && screen.inv !== 0) problems.push('invitation blocks are visible on SCREEN');
  if (drifted.length) problems.push(drifted.join('; '));

  if (problems.length) fail(`${g}: ${problems.join('; ')}`);
  else ok(`${g.padEnd(38)} ${screen.supTotal} suppressed / ${screen.invTotal} invitation(s) / ${invites.length} computed range(s)`);
}

// ===================================================================================
// THE BRAND MARK IS ON THE PRINTED MASTHEAD  (sprint-12 Track C)
//
// Operator, 2026-08-03, first sentence of the complaint: "It's missing all bonney watson
// logoes." It had been print-hidden since s11 for page-budget reasons and nothing asserted
// either way, so its disappearance was invisible until he opened a PDF.
//
// Measured in PRINT layout, per guide: the mark must have real size, and it must be the
// NAVY cut. That second half matters — `logo.svg` is white artwork for a navy background
// and the printed masthead is a cream plate, so a guide that "has a logo" pointing at
// logo.svg has an invisible one. Exactly the trap s11 recorded and the reason it stayed
// hidden.
//
// ALL NINETEEN guides now carry an <img class="cover-logo">. Until sprint-16 Track E,
// vault-guide.html's masthead was `.hero`, had no <img>, and drew its mark as a `::before`
// — so this gate carried a second code path reading computed style off a pseudo-element,
// and guide-print.css carried a whole parallel `.hero` treatment to put a mark there at
// all. That guide was brought onto the shared `.cover` vocabulary (docs/PDF_AUDIT.md,
// Tier 3), so both the fallback and the parallel treatment are gone. A guide that loses
// its `.cover-logo` now FAILS here instead of quietly falling through to a `.hero` branch.
// ===================================================================================
console.log('\n=== BRAND MARK ON THE PRINTED MASTHEAD ===');
for (const g of GUIDES) {
  const page = await browser.newPage({ viewport: { width: 720, height: PAGE_PX } });
  await page.goto(pathToFileURL(path.resolve(g)).href, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  const r = await page.evaluate(() => {
    const img = document.querySelector('.cover-logo');
    if (!img) return { how: 'none' };
    const b = img.getBoundingClientRect();
    return { how: 'img.cover-logo', src: getComputedStyle(img).content, w: +b.width.toFixed(1), h: +b.height.toFixed(1) };
  });
  await page.close();
  if (r.how === 'none') { fail(`${g}: no masthead element to carry the brand mark`); continue; }
  if (!/logo-navy\.svg/.test(r.src || '')) {
    fail(`${g}: the printed mark is not the navy cut (${r.how} resolves to ${r.src || 'nothing'}) — a white logo on the cream masthead prints invisible`);
    continue;
  }
  if (!(r.w >= 40 && r.h >= 8)) { fail(`${g}: brand mark measures ${r.w}x${r.h}px in print — too small to be a mark`); continue; }
  ok(`${g.padEnd(38)} ${r.how} ${r.w}x${r.h}px, navy cut`);
}

await browser.close();

console.log('\n=== NO file:// URI IN ANY BUILT PDF ===');
{
  const pdfs = fs.readdirSync('pdf-assets').filter(f => f.toLowerCase().endsWith('.pdf')).sort();
  let clean = 0;
  for (const name of pdfs) {
    const doc = await PDFDocument.load(fs.readFileSync(path.join('pdf-assets', name)), { updateMetadata: false });
    const hits = new Set();
    for (const [, obj] of doc.context.enumerateIndirectObjects()) {
      for (const m of String(obj).matchAll(/file:[^\s()<>]{0,90}/g)) hits.add(m[0]);
    }
    if (hits.size) fail(`${name}: ${hits.size} file:// URI(s) — e.g. ${[...hits][0]}`);
    else clean++;
  }
  if (clean === pdfs.length) ok(`${pdfs.length} PDFs scanned, no file:// URI in any of them`);
}

// ===================================================================================
// STALENESS  (sprint-10 Track P4, commit 1)
// Every recorded build is re-checked against the CURRENT bytes of the pages it was
// printed from. Content hashes, not mtimes — see scripts/_pdf_manifest.mjs for why mtime
// is unusable across clones and worktrees.
// ===================================================================================
console.log('\n=== PDF FRESHNESS (source hash vs build manifest) ===');
{
  const r = manifestCheck();
  // An empty manifest is a HOLLOW GATE, not a pass — it is what you get when someone
  // deletes pdf-assets/.build-manifest.json instead of rebuilding. 32 = 25 guides + 6
  // catalogs + the marker guide's SECOND PDF (sprint-11 Track B prints markers-guide.html
  // twice, once per `?part=`); the General Price List is not generated and is deliberately
  // absent. It was 26 until sprint-13 added the five per-area photo guides, and 31 until
  // sprint-22 Track B added the bronze marker guide.
  // 32 since sprint-22 Track B added pdf-assets/Bronze Markers.pdf.
  if (r.jobs < 32) fail(`build manifest records only ${r.jobs} job(s); expected 32 — rerun both builders`);
  for (const m of r.missing) fail(`${m}: recorded in the manifest but the PDF is gone`);
  for (const s of r.stale) fail(`${s.out}: ${s.src} ${s.why} — rerun its builder`);
  if (!r.stale.length && !r.missing.length) ok(`${r.jobs} built PDFs match their sources (${r.checked} source hashes)`);
}

// ===================================================================================
// FAMILY REGISTER — no internal record-keeping language on any guide page.
//
// Added 2026-08-02 (s11/family-register). The map gates already carried this check; the
// guides did not, and two of them were citing "the price sheet" as the source of a
// figure. Every guide in GUIDES is scanned against the SHARED ban list in
// scripts/_no_mis_assert.mjs, so a guide added tomorrow inherits it with no edit here,
// and a term added to that list arms on all of them at once. Comments are stripped
// first: provenance belongs in the source, never on the page.
// ===================================================================================
console.log('\n=== FAMILY REGISTER (no internal jargon on a guide) ===');
for (const g of [...GUIDES, 'guides.html', 'pcm-design-catalog.html'].filter((f) => fs.existsSync(f))) {
  assertFamilyRegister((c, m) => (c ? ok : fail)(m), g, fs.readFileSync(g, 'utf8'));
}

console.log('');
console.log(bad ? `${bad} check(s) failed` : 'all page-shape checks passed');
if (bad) process.exit(1);
