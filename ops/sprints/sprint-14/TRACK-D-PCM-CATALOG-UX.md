# TRACK D — PCM catalog: compare + print like the casket catalogs; Real Examples toggle

You are a track subagent in sprint-14 of the BW Quote Tool (mid-sprint operator
addition, 2026-08-03). Obey `ops/SPRINT_GUIDELINES.md` and `ops/DESIGN.md`. Work in the
worktree `../bw-quote-tool-s14d` on branch `s14/pcm-catalog-ux`
(`git worktree add ../bw-quote-tool-s14d -b s14/pcm-catalog-ux`); junction node_modules
from the main tree
(`New-Item -ItemType Junction -Path <wt>\node_modules -Target C:\Users\Martice\bw-quote-tool\node_modules`).
Commit locally with explicit paths; NEVER push; `git -C <abs-path>` for every git command.

## Operator request (verbatim intent)

"pcm catalog book should function similarly to the all caskets catalog in terms of print
and compare options. also the real examples needs to have its own toggle option just
like the design books and elements do."

Two deliverables on `pcm-design-catalog.html`:

1. **Compare + print parity with the casket catalogs.** Study how the six catalog pages
   (e.g. `wood-caskets.html`, `metal-caskets.html`) do it — the s09 Track K compare
   sheet (`cmp-cols-N` sizing: photos 334px at 2 items / 218 at 3 / 161 at 4, footer at
   the true page bottom, position:fixed sheet CLIPS so overflow must be 0) and the s11
   Track C print-what's-filtered (`#filterSheet` as static-flow pages with break-after
   and fixed item heights — NOT the compare sheet's fixed positioning; "Print these
   N · k pages" button wording; sabotage asserts a REAL Chromium PDF page count).
   Adapt, don't blindly copy: PCM cards are design plates (portrait-ish ~700px webp),
   so pick per-count photo sizes that fill the page for plates, and decide a sane
   items-per-page for print (casket pages use 3/page at 3.1in photos; plates likely
   support more). Compare should work across categories (a 2020 design vs a 2011 design
   vs an element is a legitimate comparison; if you scope compare to designs-only,
   say so and why).
2. **Real Examples as a toggle.** The page already has toggle affordances for the two
   design books and the elements categories; the 30 curated real photos ("Real
   Examples") must become the same kind of toggle instead of whatever fixed placement
   it has now. Same interaction, same chip/count styling, OFF/ON state consistent with
   how the books toggle. Verify with the real toggles' behavior — read the built page,
   don't guess.

## Hard constraints

- `pcm-design-catalog.html` is GENERATED (`scripts/build_pcm_catalog.py` from the
  pcm_extract data; byte-deterministic). Change the BUILDER, never the page by hand.
  NEVER re-run the AI upscale pipeline (`pcm_upscale*.py`) — the plates on disk are
  final (22 hand-ruled fallbacks among them); your work must not touch
  `pcm-catalog-images/`.
- `scripts/verify_pcm_catalog.mjs` (154 checks) must stay green and grow to cover your
  two features with sabotages proven both directions (compare-sheet overflow, print
  page-count real-PDF assert, real-examples toggle wired). ITS FIRST STATEMENT IS
  `assertServesThisTree` — keep it first, and quote the EXACT env-pinned command you
  run (BW_BASE pin on your own port; NEVER trust a bare 3737 — the main tree owns it).
- The subject/format/category search (s11 E2 + s12 A) must keep working — search and
  your toggles compose; the 130-card "companion" search and lit-chip behavior are
  gate-anchored. Run the existing suite before you change anything to know your
  baseline (`test-pcm-catalog.mjs`).
- Catalog-PDF staleness: check whether `pcm-design-catalog.html` participates in any
  built-PDF manifest (the static-PDF trap — if a downloadable PDF is built from this
  page, rebuild it and keep the staleness gate green; if not, prove it and say so).
- Print-media page-1 byte-comparison trick (Track K/C precedent): if your change should
  not alter the default print rendering beyond the new sheets, PROVE it the same way.
- Don't touch: index.html, guides, maps, walkthrough pages, contract code, other
  catalogs' HTML (shared blocks on casket pages are THEIRS; you read, not write).

## Definition of done

- Builder + gate + rebuilt page committed on `s14/pcm-catalog-ux`; gate green with new
  checks (quote numbers); `npm run check` 8/0; `npm test` with your exact count +
  env-pinned command (expect the documented worktree wmp-variance; main contract is
  2092/36 as of `ca0a057`).
- Renders in `scratch/s14d-renders/`: compare sheet at 2/3/4 items, the print sheet's
  first page, Real Examples toggled off and on (with the rest of the page state
  visible), all EYEBALLED by you before reporting.
- Report: what you adapted vs copied from the casket pattern, items-per-page choice and
  why, compare scope decision, exact commands + numbers, anything unverified stated
  plainly.
