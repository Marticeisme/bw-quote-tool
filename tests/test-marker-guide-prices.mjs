// The granite marker prices printed in markers-guide.html must equal what the quote
// tool would quote for the same marker. A family reads the guide; a counselor quotes
// from the tool; a disagreement between them is a disagreement in front of the family.
//
// The tool's flush-marker cost table lives in index.html as rows of
//   [size, G1 non-tariffed, G1 tariffed, Group 2, Group 3, Group 4 NT, Group 4 T, install]
// and the guide prints the installed, taxed price:  (base + install) * 1.104.
// This suite derives the guide's number from the TOOL's base figures and compares it to
// the string actually rendered on the page — neither side is read from a constant this
// file also owns.
//
// index.html is READ ONLY here. Nothing in this suite writes anything, anywhere.
//
// ── BOTH ESCALATIONS ARE NOW RESOLVED. The exception list is empty, and that is the point.
//
// 1. 32" x 20", G1 Tariffed — RESOLVED 2026-07-27 by Martice: the base is 2610.
//    The vendor price book (2026 PCM Markers, eff. 03/01/2026, sheet "Flush Markers",
//    cell C16) reads a hard-coded 32610. On the other thirteen rows of that sheet
//    G1 Tariffed is G1 Non-Tariffed x 1.20 (ratios 1.1978-1.2008), and 2175 x 1.20 =
//    2610 exactly, so "32610" is "2610" with a stray leading 3. The guide had printed
//    $4,146.62 — a third number again, the typo divided by ten — and now prints
//    (2610 + 495) x 1.104 = $3,427.92. The tool was always right and is unchanged.
//    THE VENDOR'S WORKBOOK STILL CARRIES THE TYPO. If a future price update reads that
//    sheet mechanically, it will reintroduce this. This suite is the thing that catches it.
//
// 2. 28" x 34" — RESOLVED 2026-07-27 (commit 2996575). index.html's row was a verbatim
//    copy of the 32" x 20" row, so the tool under-quoted the marker. Corrected to the
//    price book's row 15: 2735 / 3280 / 4110 / 5050 / 6010 / 7210.
//
// Both were escalated rather than guessed, which is the rule. An entry is deleted only
// when the operator rules — and because each exception asserts that it STILL disagrees,
// resolving one turns the exception itself red rather than letting the list go stale.
// That is how both of these came back to be closed.
import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { BASE } from './_base.mjs';
import { misHits } from '../scripts/_no_mis_assert.mjs';

const TAX = 1.104;   // 10.4% WA sales tax, stated on the guide itself

// Empty on purpose, as of 2026-07-27 — every cell in the guide now reconciles against
// index.html. Add an entry only when the operator has been asked and has not yet ruled;
// each one asserts that its disagreement is still real, so a resolved entry fails loudly
// instead of sitting here forever.
const ESCALATED = new Map([]);

let pass = 0, fail = 0;
const ok = (n, c, extra) => {
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (extra ? '  — ' + extra : '')); }
};

// ---- the tool's table, read out of index.html as text (never executed) ----
const src = fs.readFileSync('index.html', 'utf8');
const rows = new Map();
const re = /\['(\d+)\\?"x(\d+)\\?"x([\d/]+)\\?"',((?:(?:\d+|null),){6}(?:\d+|null))\]/g;
let m;
while ((m = re.exec(src))) {
  const nums = m[4].split(',').map(v => (v === 'null' ? null : Number(v)));
  if (m[3] !== '4') continue;                   // the guide prices the 4" thickness
  const key = `${m[1]}" x ${m[2]}"`;
  // A size can appear again further down under a different product block (uprights,
  // slants). The flush-marker table is first, and it is the one the guide prices.
  if (rows.has(key)) continue;
  rows.set(key, {
    'G1 Non-Tariffed': nums[0], 'G1 Tariffed': nums[1], 'Group 2': nums[2], install: nums[6],
  });
}
console.log(`tool: ${rows.size} flush-marker sizes read from index.html`);
ok('index.html yields a flush-marker cost table', rows.size >= 10, `got ${rows.size}`);

// ---- the guide's rendered prices ----
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await page.goto(pathToFileURL(path.resolve('markers-guide.html')).href, { waitUntil: 'networkidle' });
const printed = await page.evaluate(() => {
  const out = [];
  for (const t of document.querySelectorAll('table')) {
    const cap = (t.caption && t.caption.textContent.trim()) || '';
    if (!/MARKERS$|MARKERS \(/.test(cap)) continue;
    const rs = [...t.rows];
    const head = [...rs[0].cells].map(c => c.textContent.trim());
    for (const r of rs.slice(1)) {
      const cells = [...r.cells];
      // "28″ × 16″Single (1 grave)" -> the size only
      const size = cells[0].childNodes[0].textContent.trim();
      for (let i = 1; i < cells.length; i++) {
        out.push({ cap, size, col: head[i], text: cells[i].textContent.trim() });
      }
    }
  }
  return out;
});
await browser.close();

console.log(`guide: ${printed.length} price cells rendered`);
ok('markers-guide renders a full grid of marker prices', printed.length === 18, `got ${printed.length}` + ' (6 sizes x 3 colour groups)');

const norm = s => s.replace(/[″′"]/g, '"').replace(/\s*[×x]\s*/i, ' x ').replace(/"\s*$/, '"').trim();
const money = n => '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

let matched = 0, skipped = 0, unknown = 0;
for (const c of printed) {
  const size = norm(c.size);
  const row = rows.get(size);
  if (!row) { unknown++; ok(`size "${size}" exists in the tool's table`, false, 'no matching row in index.html'); continue; }
  const base = row[c.col];
  if (base === undefined) { unknown++; ok(`column "${c.col}" exists in the tool's table`, false); continue; }
  const want = money(Math.round((base + row.install) * TAX * 100) / 100);
  const key = `${size}|${c.col}`;
  if (ESCALATED.has(key)) {
    skipped++;
    console.log(`  SKIP  ${size} ${c.col}: guide ${c.text}, tool implies ${want} — ${ESCALATED.get(key)}`);
    // The exception must still be a real disagreement; if it ever agrees, delete it.
    ok(`escalated cell ${size} ${c.col} still disagrees (delete the exception once resolved)`, c.text !== want);
    continue;
  }
  matched++;
  ok(`${size} ${c.col} = ${want}`, c.text === want, `guide prints ${c.text}`);
}

console.log(`\nreconciled ${matched} cells, ${skipped} escalated, ${unknown} unmatched`);

// ═══════════════════════════════════════════════════════════════════════════════════
// SPRINT-11 TRACK B — TWO PDFs, AND THE ALL-IN TOTALS INSIDE THE MARKER
//
// Operator, 2026-08-02, near-verbatim:
//   "separate the PDF version entirely. One of the marker guides will focus on the
//    marker sizes and colors while the other focuses just on the photos, diamond
//    etching, and the sizes of photos."
//   "I want to very clearly mark the total price of Group 1, Group 2 and Group 1
//    Non-Tariffed markers. The prices should display directly on the marker scale
//    guide INSIDE the marker to save room."
//
// THE ALL-IN COMPOSITION, stated once so nobody has to infer it: marker + standard
// engraving + setting/foundation, times 1.104 for WA sales tax. In index.html's
// FLUSH_SIZES a row is [size, g1nt, g1t, g2, g3, g4nt, g4t, install]; the stone figure
// already includes the standard engraving (the guide's own footnote and the tool's
// "All-Inclusive Pricing" card both say so), and `install` IS the setting/foundation
// fee. markerAdd() charges (price + install) and the cemetery summary taxes it at
// 0.104, so an all-in figure printed inside a marker is EXACTLY what a counselor's
// quote would say for that line. That is the property asserted below, cell by cell,
// off index.html's own bytes — never off a printed sheet.
//
// These eighteen figures are the ONE operator-ordered exception to the range-only
// printing rule (scripts/guide-price-rule.mjs). So this suite asserts both halves:
// they must print, and nothing else that looks like a per-marker price may.
// ═══════════════════════════════════════════════════════════════════════════════════

const PARTS = { sizes: ['#overview', '#why-granite', '#sizes', '#colors', '#pcm-designs'],
                photos: ['#photos', '#etching', '#true-size'] };
const ALL_SECTIONS = [...PARTS.sizes, ...PARTS.photos];

const b2 = await chromium.launch();

// ── 1. every in-marker figure, recomputed from index.html ──────────────────────────
{
  const p = await b2.newPage();
  await p.goto(BASE + 'markers-guide.html', { waitUntil: 'networkidle' });
  const chips = await p.evaluate(() => [...document.querySelectorAll('[data-allin]')]
    .map((e) => ({ key: e.getAttribute('data-allin'), text: e.textContent.trim(),
                   suppressed: e.hasAttribute('data-print-suppress') })));
  await p.close();

  ok('the scale guide carries 18 all-in figures (6 sizes x 3 colour groups)',
     chips.length === 18, `got ${chips.length}`);

  const COL = { g1nt: 'G1 Non-Tariffed', g1t: 'G1 Tariffed', g2: 'Group 2' };
  for (const c of chips) {
    const [size, col] = c.key.split('|');
    const row = rows.get(size.replace('x', '" x ') + '"');
    if (!row) { ok(`all-in key ${c.key} names a size index.html knows`, false); continue; }
    const base = row[COL[col]];
    if (base === undefined) { ok(`all-in key ${c.key} names a colour group index.html knows`, false); continue; }
    const want = money(Math.round((base + row.install) * TAX * 100) / 100);
    ok(`in-marker all-in ${size} ${COL[col]} = ${want}`, c.text === want, `marker prints ${c.text}`);
  }

  // The exception has to stay an exception. If the price rule ever tags these, the
  // printed scale guide silently loses the only pricing the operator asked it to carry.
  ok('no all-in figure is tagged for print suppression',
     chips.every((c) => !c.suppressed));

  // Guide table and marker outline must agree with each other, not only with the tool.
  const tableSizes = new Set(printed.map((c) => norm(c.size).replace(/"/g, '').replace(' x ', 'x')));
  const chipSizes = new Set(chips.map((c) => c.key.split('|')[0]));
  ok('the scale guide prices exactly the sizes the tables price',
     tableSizes.size === chipSizes.size && [...chipSizes].every((k) => tableSizes.has(k)),
     `tables ${[...tableSizes].join(',')} vs markers ${[...chipSizes].join(',')}`);
}

// ── 2. the split: each ?part= prints its own half and only its own half ────────────
async function partLayout(part) {
  const p = await b2.newPage({ viewport: { width: 816, height: 955 } });
  await p.goto(BASE + 'markers-guide.html' + (part ? '?part=' + part : ''), { waitUntil: 'networkidle' });
  await p.emulateMedia({ media: 'print' });
  const r = await p.evaluate((sel) => {
    const h = (s) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().height : -1; };
    const vis = {};
    for (const s of sel) vis[s] = h(s);
    return {
      vis,
      allIn: [...document.querySelectorAll('[data-allin]')]
        .filter((e) => e.getBoundingClientRect().height > 0).map((e) => e.textContent.trim()),
      text: document.body.innerText,
      download: h('.dl-block'),
    };
  }, ALL_SECTIONS);
  await p.close();
  return r;
}

const MONEY_RE = /\$[0-9][0-9,]*(?:\.[0-9]{2})?/g;

for (const part of ['sizes', 'photos']) {
  const r = await partLayout(part);
  const mine = PARTS[part], theirs = PARTS[part === 'sizes' ? 'photos' : 'sizes'];
  for (const s of mine) ok(`?part=${part}: ${s} prints`, r.vis[s] > 0, `height ${r.vis[s]}`);
  for (const s of theirs) ok(`?part=${part}: ${s} does NOT print`, r.vis[s] === 0, `height ${r.vis[s]}`);
  ok(`?part=${part}: the on-screen download block never prints`, r.download === 0);

  // Nothing on a family-facing surface may name the internal system of record.
  ok(`?part=${part}: zero rendered "MIS"`, misHits(r.text).length === 0);

  if (part === 'sizes') {
    ok('?part=sizes: all 18 all-in totals print', r.allIn.length === 18, `${r.allIn.length} printed`);
    // The range-only rule, asserted from the other side: every money token on the printed
    // sizes guide is either one of the eighteen all-in totals or an endpoint of the
    // generated range invitation. A per-item marker price that crept back in fails here.
    const seen = r.text.match(MONEY_RE) || [];
    const allowed = new Set([...r.allIn, '$2,428', '$17,714']);
    const stray = seen.filter((m) => !allowed.has(m));
    ok('?part=sizes: no per-item marker price prints outside the all-in totals',
       stray.length === 0, `stray: ${stray.join(', ')}`);
  } else {
    ok('?part=photos: no all-in marker total prints', r.allIn.length === 0, `${r.allIn.length} printed`);
  }
}

// With no ?part= — which is every visit to the website — the page is whole. The split
// must never be able to take half the guide off the live site.
{
  const r = await partLayout(null);
  for (const s of ALL_SECTIONS) ok(`no ?part=: ${s} still prints`, r.vis[s] > 0, `height ${r.vis[s]}`);
  ok('no ?part=: all 18 all-in totals still print', r.allIn.length === 18, `${r.allIn.length} printed`);
}

// The screen page is untouched by any of it — the surface a family actually browses.
{
  const p = await b2.newPage({ viewport: { width: 1200, height: 900 } });
  await p.goto(BASE + 'markers-guide.html?part=sizes', { waitUntil: 'networkidle' });
  const r = await p.evaluate((sel) => sel.map((s) => {
    const e = document.querySelector(s); return e ? e.getBoundingClientRect().height : -1;
  }), ALL_SECTIONS);
  const dl = await p.evaluate(() => document.querySelectorAll('.dl-block a[href$=".pdf"]').length);
  await p.close();
  ok('on SCREEN a ?part= link still shows the whole guide', r.every((h) => h > 0), r.join(','));
  ok('the web page offers both PDF downloads', dl === 2, `${dl} download link(s)`);
}

await b2.close();

// ═══════════════════════════════════════════════════════════════════════════════════
// SPRINT-16 TRACK E — THE CONDENSED CUT IS WHAT ACTUALLY GETS BUILT
//
// The two PDFs are now printed from `?part=X&print=family`, not `?part=X`. Everything
// above still drives `?part=X` alone and still passes, because the family annotations are
// inert without the second query — but everything above therefore no longer describes the
// artifact. These are the assertions about the document that is actually emailed.
//
// The one that matters most: THE EIGHTEEN ALL-IN TOTALS MUST SURVIVE THE CONVERSION
// EXACTLY. They are the operator-ordered exception to the range-only pricing rule, they
// are recomputed cell by cell from index.html above, and a condensing pass is exactly the
// kind of change that could drop them without any page-count gate noticing.
// ═══════════════════════════════════════════════════════════════════════════════════
const b3 = await chromium.launch();
async function familyLayout(part) {
  const p = await b3.newPage({ viewport: { width: 720, height: 955 } });
  await p.goto(BASE + `markers-guide.html?part=${part}&print=family`, { waitUntil: 'networkidle' });
  await p.emulateMedia({ media: 'print' });
  const r = await p.evaluate((sel) => {
    const h = (s) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().height : -1; };
    const vis = {};
    for (const s of sel) vis[s] = h(s);
    return {
      vis,
      allIn: [...document.querySelectorAll('[data-allin]')]
        .filter((e) => e.getBoundingClientRect().height > 0).map((e) => e.textContent.trim()),
      contents: h('.contents'),
      famNext: h('.fam-next'),
    };
  }, ALL_SECTIONS);
  await p.close();
  return r;
}

for (const part of ['sizes', 'photos']) {
  const r = await familyLayout(part);
  // The audit's cross-cutting item 2: the TOC has no place in a selected document.
  ok(`?part=${part}&print=family: the contents list does not print`, r.contents === 0, `height ${r.contents}`);
  // Debrief rule 4: every condensed PDF ends with Martice's contact block.
  ok(`?part=${part}&print=family: the printed close is present`, r.famNext > 0, `height ${r.famNext}`);
  if (part === 'sizes') {
    // THE LOAD-BEARING ONE. Every all-in total survives the condense, unchanged.
    ok('?part=sizes&print=family: all 18 all-in totals survive the condensed cut',
       r.allIn.length === 18, `${r.allIn.length} printed`);
    // Design Inspiration is a link, not a page (audit, Tier 3) — dropped from this cut
    // and ONLY from this cut.
    ok('?part=sizes&print=family: Design Inspiration is dropped',
       r.vis['#pcm-designs'] === 0, `height ${r.vis['#pcm-designs']}`);
  } else {
    ok('?part=photos&print=family: no all-in marker total prints', r.allIn.length === 0, `${r.allIn.length} printed`);
  }
}

// GENERATED SECTION NUMBERS — the audit's defect was a printed run of "1, 2, 3, 4, 8".
//
// What is asserted, and why it is equivalent to reading the paper: for every section that
// PRINTS, (a) its kicker's own hard-coded text is zeroed, so the markup number cannot be
// what appears, and (b) its `::before` resolves to the counter expression, so the number
// that appears is the counter's. The counter is reset once on `.doc-sheet` and incremented
// once per section, and a `display:none` section generates no box and does not increment —
// therefore the painted numbers over the visible sections are 1..N with no gap.
//
// That last step is a CSS-spec claim, so it was not taken on trust: it was verified by
// printing a probe page with sections 3 and 4 hidden and reading the PAINTED text back out
// of the PDF with PyMuPDF, which returned "SECTION 1 / SECTION 2 / SECTION 3". The built
// marker PDFs were then rasterised and read the same way. getComputedStyle alone would
// only ever have confirmed that a rule matched, never what it produced.
for (const part of ['sizes', 'photos']) {
  const p = await b3.newPage({ viewport: { width: 720, height: 955 } });
  await p.goto(BASE + `markers-guide.html?part=${part}&print=family`, { waitUntil: 'networkidle' });
  await p.emulateMedia({ media: 'print' });
  const r = await p.evaluate(() => {
    const out = [];
    for (const sec of document.querySelectorAll('.section-wrap, .section')) {
      if (sec.getBoundingClientRect().height <= 0) continue;      // dropped by the selection
      const k = sec.querySelector('.section-kicker, .section-label');
      if (!k) continue;
      const cs = getComputedStyle(k);
      out.push({
        id: sec.id,
        own: cs.fontSize,                                          // must be 0px
        gen: getComputedStyle(k, '::before').content,              // must be the counter
      });
    }
    return out;
  });
  await p.close();
  ok(`?part=${part}&print=family: every printed section carries a generated number`,
     r.length > 0 && r.every((x) => x.gen.includes('counter(bw-section)')),
     JSON.stringify(r));
  ok(`?part=${part}&print=family: no hard-coded "SECTION n" survives in print`,
     r.every((x) => parseFloat(x.own) === 0),
     r.map((x) => `${x.id}:${x.own}`).join(', '));
}

await b3.close();

// ── 3. the two built PDFs ─────────────────────────────────────────────────────────
// Cap was 6, the shared family-guide budget. Sprint-16 Track E: the Tier-3 target in
// docs/PDF_AUDIT.md is TWO pages for each of these, and PER_GUIDE_CAPS in
// verify_guide_pages.mjs holds the same number. Asserted here as well because this is the
// suite that owns the marker guide.
for (const [file, cap] of [['pdf-assets/Granite Marker Sizes and Colors.pdf', 2],
                           ['pdf-assets/Marker Photos and Etching.pdf', 2]]) {
  if (!fs.existsSync(file)) { ok(`${file} exists`, false, 'run scripts/build_guide_pdfs.mjs'); continue; }
  const n = (await PDFDocument.load(fs.readFileSync(file), { updateMetadata: false })).getPageCount();
  ok(`${path.basename(file)} is ${n} page(s), within the ${cap}-page leave-behind cap`, n <= cap);
}
// The single combined PDF the operator asked to replace must be gone, not left orphaned
// beside its replacements — guides.html would still be able to link a stale document.
ok('the old combined Granite Marker Guide.pdf is gone',
   !fs.existsSync('pdf-assets/Granite Marker Guide.pdf'));

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
