# TRACK G — The Terramation Guide

You are a build track for sprint-06 of the BW Quote Tool
(`C:\Users\Martice\bw-quote-tool`). Obey `ops/SPRINT_GUIDELINES.md` and `ops/DESIGN.md`.
Branch: **`s06/terramation-guide`** from current `main` (which already carries Track M's
merge — do not touch anything under `MAPS/`).

## The job

Build **`terramation-guide.html`** — a new family-facing guide in the existing Bonney
Watson guide family — and add its card to **`guides.html`**. The operator's instruction,
verbatim in spirit: *make a better guide out of the on-hand materials; do not upload the
materials directly.* The guide must look and behave like a sibling of the existing
guides, not like a new species.

## Read these FIRST, in order

1. `docs/BRAND_AND_BUILD_LOG.md` — brand tokens (`--navy #3d5a7a`, `--orange #c8540a`,
   Cormorant Garamond + Source Sans 3, logo conventions), the card contract, print/PDF
   conventions, and the static-PDF trap. **Append your build-log entry when done; never
   rewrite existing entries.**
2. `ops/sprints/sprint-06/RESEARCH.md` — the sourced research brief this guide is written
   from. Its "claims to avoid" and "open questions" bind you: an open question's answer
   does NOT go in the guide; write around it.
3. Two or three sibling guides as structural reference — `scattering-guide.html` and
   `cremation-guide.html` are the closest in kind (cremation-family, photo-bearing).
   Match their section structure, print CSS, nav/footer, and PDF behavior.
4. `guides.html` — the `guide-card` markup contract and which section the card joins
   (the cremation/burial group alongside the cremation guides).

## Source material (LOCAL-ONLY, `reference-docs/internal/` — never commit, never copy into a tracked path)

- `Terramation Description.pdf` (text, 1 p) and `Terramation Info Booklet (PDF).pdf`
  (12 image-only pages — render with PyMuPDF to view; the Read tool cannot open PDFs
  here) are the BW-voice source content.
- `Bonney Watson Return Home Partner Training Guide.pdf` is internal sales training:
  facts in it may inform the guide, but nothing that reads as sales training, quizzes,
  or "affinity test" segmentation may appear.
- **Photos:** the booklet's pages contain BW/Return Home marketing photography. Extract
  the usable photos (PyMuPDF image extraction from the PDF's embedded images, not screen
  grabs of whole pages), select the genuinely family-appropriate ones, and place them in
  a new **`terramation-images/`** folder at web-appropriate sizes (match how sibling
  guides size their images; keep files reasonable — recompress to JPEG, no multi-MB
  originals). These extracted derivatives ARE committed (they are BW's own marketing
  assets for families); the source PDFs are not.

## Operator rulings 2026-07-28 (these settle RESEARCH.md's blocking questions — binding)

1. **Soil amount: print ~250 lb** plus the agreed volume (about a cubic yard, returned in
   10–15 breathable burlap bags). The Description sheet's 500 lb figure is superseded — do
   not print it.
2. **WMP placement:** terramated remains CAN be placed at Washington Memorial Park in a
   **standard-size plot**. The guide may say exactly that, and directs the family to their
   family service director for specifics — print no gardens, fees, or container rules
   beyond it.
3. **Religious perspectives: omitted entirely.** No religious section, no claims about
   any tradition's position.

## Content requirements

- **Pricing: only the two GPL figures, verbatim** — Terramation (Natural Organic
  Reduction) **$7,795.00** and Laying in Ceremony **$895.00**, described the way the GPL
  describes what each includes (`pdf-assets/General Price List.pdf` p13 — re-verify
  yourself with PyMuPDF). No other dollar amounts anywhere, no invented package names.
- Structure from RESEARCH.md's guide-section candidates (what it is / process & timeline
  / laying-in ceremony / receiving the soil / cost / practical & legal / FAQ), adapted to
  the sibling guides' idiom.
- Tone: the existing guides' — warm, plain, factual, family-facing. Environmental claims
  only as far as RESEARCH.md supports them; soften or drop vendor-only claims.
- Mention the Return Home partnership the way BW's own booklet does.
- No customer data, no map data, nothing from `wmp-cemetery-map/`.

## guides.html card

One new `guide-card` in the appropriate section, following the exact existing markup
contract, with a rich `data-name` keyword string (terramation, natural organic reduction,
human composting, soil, green burial alternative, eco, return home…). Touch nothing else
on that page.

## PDF / print

Whatever the sibling guides do for print/PDF, this guide does identically — including the
print-header height conventions (sprint-04 capped guide print headers ≤ 40 mm) and the
static-PDF trap recorded in the brand log: if guides ship a pre-built PDF, build this
one the same way and verify it; if they print via CSS, verify the print rendering.

## Hard rules

- Branch `s06/terramation-guide`; stage EXPLICIT paths only (`terramation-guide.html`,
  `guides.html`, `terramation-images/<files>`, `docs/BRAND_AND_BUILD_LOG.md`, plus any
  PDF artifact the conventions require); commit locally; **never push**; never touch
  `main`, `index.html`, `MAPS/`, or `ops/` outside nothing — you don't edit ops at all.
- `git rev-parse --abbrev-ref HEAD` before every commit.
- Commits: `[s06/terramation-guide] <imperative>` +
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- No production Firebase access. No pushes. No account signups.

## Verify (quote outputs verbatim)

1. `npm run check` → `index.html: 8 blocks, 0 errors` (proof you didn't touch it)
2. `npm test` → counts vs the boot baseline `1300 passed, 0 failed across 26 suites`;
   never fall (add a suite only if the sibling guides have one to mirror)
3. `node scripts/verify_guides_page.mjs` → green (you changed `guides.html`)
4. **Render and LOOK** (ops/MISTAKES.md #15/#16 — page counts alone have shipped broken
   family documents twice): screenshot the guide page (Playwright headless, repo root),
   view every page of the print/PDF output, check images actually render (not stamps in
   grey boxes), check the card on guides.html. Say in your report what you looked at.
5. Every extracted image referenced by the page exists on disk and loads (count
   `<img>` refs vs files; then look).

## Report

Per `SPRINT_GUIDELINES.md` rule 8: shipped, branch+commits, verbatim gate outputs, files
changed, content decisions (what you left out and why — especially anything from the
training guide you deliberately excluded), open questions, what the director must verify.
