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
const _streams = new Map();
async function pageStreams(file) {
  if (_streams.has(file)) return _streams.get(file);
  const doc = await PDFDocument.load(fs.readFileSync(file), { updateMetadata: false });
  const out = doc.getPages().map((pg) => {
    const c = pg.node.Contents();
    const raw = Buffer.from(c && c.contents ? c.contents : []);
    let inflated;
    try { inflated = zlib.inflateSync(raw); } catch { inflated = raw; }
    return inflated.toString('latin1');
  });
  _streams.set(file, out);
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
  // Sprint-08 Track Q: the operator asked for an infographic that is EXACTLY four printed
  // pages. s10's cover made it three interior + cover; s11 removed the cover, so it is
  // three pages total and the same amount of document. Held at three deliberately: this
  // is one of the five guides the photo-first template was applied to, and a photo-led
  // page that grows the document back to four would be a regression, not a redesign.
  ['pdf-assets/Glass-Front Niche Guide.pdf', 3],
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
  'Cremation Guide.pdf', 'Veterans Guide.pdf',
  'Who Decides.pdf', 'Burial Vault Guide.pdf', 'Terramation Guide.pdf',
  'Cemetery Property Guide.pdf', 'Medicaid and Planning Ahead.pdf',
  'Medicaid Professional Reference.pdf', 'Cremation or Burial.pdf',
  'Urn Placement Options.pdf', 'Scattering Garden Pricing.pdf', 'Burial Guide.pdf',
  'Granite Niches Guide.pdf', 'Glass-Front Niche Guide.pdf',
  'Urn Gardens at Washington Memorial Park.pdf',
  'Outside Marker Rules and Pricing.pdf', 'Pre-Planning Guide.pdf',
  'Direct Cremation Plan Example.pdf',
];

// Guides whose own requirement is tighter than the family-guide cap. The granite-niche
// guide is a one-page screen guide the operator asked to print to NO MORE THAN TWO pages
// (sprint-08 Track P) — two pages, and with the cover gone that is two pages total.
const TIGHT_CAPS = [
  ['Granite Niches Guide.pdf', 2],
];

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

console.log(`\n=== FAMILY GUIDE PAGE CAP (<= ${GUIDE_MAX_PAGES} pages, total) ===`);
for (const name of CAPPED_GUIDES) {
  const file = `pdf-assets/${name}`;
  if (!fs.existsSync(file)) { fail(`${file} does not exist — run scripts/build_guide_pdfs.mjs`); continue; }
  const n = (await PDFDocument.load(fs.readFileSync(file), { updateMetadata: false })).getPageCount();
  if (n <= GUIDE_MAX_PAGES) ok(`${name.padEnd(36)} ${n} page(s)`);
  else fail(`${name}: ${n} pages, over the ${GUIDE_MAX_PAGES}-page leave-behind cap`);
}

console.log('\n=== TIGHTER PER-GUIDE CAPS ===');
for (const [name, cap] of TIGHT_CAPS) {
  const file = `pdf-assets/${name}`;
  if (!fs.existsSync(file)) { fail(`${file} does not exist — run scripts/build_guide_pdfs.mjs`); continue; }
  const n = (await PDFDocument.load(fs.readFileSync(file), { updateMetadata: false })).getPageCount();
  if (n <= cap) ok(`${name.padEnd(36)} ${n} page(s) (cap ${cap})`);
  else fail(`${name}: ${n} pages, over its own ${cap}-page cap`);
}

console.log('\n=== "ALL ON ONE PAGE" (print layout) ===');
const browser = await chromium.launch();

async function onePage(file, sectionSel, childSel, label) {
  const page = await browser.newPage({ viewport: { width: 816, height: PAGE_PX } });
  await page.goto(pathToFileURL(path.resolve(file)).href, { waitUntil: 'networkidle' });
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

await onePage('vault-guide.html', '#urn-vaults', '.uv-card', 'vault-guide urn vault cards');
// `.vault-table` is suppressed in print by the pricing rule, so these two now measure what
// the family actually receives: the section plus the invitation that replaced its table.
await onePage('vault-guide.html', '#urn-vaults', '.uv-card, .print-invite', 'vault-guide urn vault section incl. invite');
await onePage('vault-guide.html', '#all-pricing', '.print-invite', 'vault-guide Complete Pricing at a Glance');
await onePage('direct-cremation.html', '#options', '.sidebar, .prose, .section-photo', 'direct-cremation container section');

// direct-cremation page 1 is the cover plus sections 1 and 2; if that stack is
// taller than a page, section 2 spills and the handout becomes three pages.
{
  const page = await browser.newPage({ viewport: { width: 816, height: PAGE_PX } });
  await page.goto(pathToFileURL(path.resolve('direct-cremation.html')).href, { waitUntil: 'networkidle' });
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
// Geometry is. Only an `@page{margin:0}` rule can produce a painted box the size of the
// whole sheet; a normal content page is clipped to the 0.5in-margined content box.
// Measured on the s10 artifacts: covers carried a 6120 x 7920 rect (612 x 792pt at
// Chromium's 10x content scale) while content pages topped out at 5400 x 7170. So this
// asserts both "no cover came back" and "the page margins are still applying" — the
// second of which silently broke once already.
const fullBleed = (stream) => [...stream.matchAll(/(-?[0-9.]+) (-?[0-9.]+) (-?[0-9.]+) (-?[0-9.]+) re/g)]
  .some((m) => Math.abs(parseFloat(m[3])) > 6000 && Math.abs(parseFloat(m[4])) > 7800);

console.log('\n=== NO COVER PAGE (no page is full-bleed) ===');
for (const name of ALL_GUIDE_PDFS) {
  const file = `pdf-assets/${name}`;
  if (!fs.existsSync(file)) { fail(`${file} does not exist`); continue; }
  const streams = await pageStreams(file);
  const bleeders = streams.map((x, i) => (fullBleed(x) ? i + 1 : 0)).filter(Boolean);
  if (bleeders.length) fail(`${name}: page(s) ${bleeders.join(', ')} are full-bleed — a cover page is back, or the page margins stopped applying`);
  else ok(`${name.padEnd(44)} no cover, ${streams.length} content page(s)`);
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
  // deletes pdf-assets/.build-manifest.json instead of rebuilding. 26 = 19 guides + 6
  // catalogs + the marker guide's SECOND PDF (sprint-11 Track B prints markers-guide.html
  // twice, once per `?part=`); the General Price List is not generated and is deliberately
  // absent.
  if (r.jobs < 26) fail(`build manifest records only ${r.jobs} job(s); expected 26 — rerun both builders`);
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
