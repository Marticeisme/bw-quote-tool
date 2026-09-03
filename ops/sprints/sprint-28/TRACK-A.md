# TRACK A — s28/compare-print

Bring the two Option Comparison prints — cemetery `printCompare()` (~index.html:8671)
and funeral home `printFhCompare()` (~18437) — up to the quality of the other quotes,
and tidy the Compare panels that feed them. Work in worktree
`/home/user/bw-quote-tool-s28a` on branch `s28/compare-print` (created; `node_modules`
symlinked). Run tests with `PORT=3747`. Obey `ops/SPRINT_GUIDELINES.md` and
`ops/DESIGN.md`. Never block on questions; log decisions in your report. Do NOT push.

## Target

The customer-facing quotes print through the `_fq*` family-quote system
(`_fqBuildModel` ~9536, `_fqRenderHTML` ~9753, `_fqPrint` ~9871; used by
`printCemQuote` ~10347 and `printFhQuote`). Read that system first and render one
cemetery quote and one FH quote with Playwright so you know the bar. Then:

1. **Cemetery `printCompare()`** currently uses the older `_printQuoteCSS()` steel/orange
   two-column layout. Rebuild it on the `_fq*` design language: same header/logo,
   typography, section labels, row/discount styling, tax line, totals, payment estimate
   treatment, footer, notes. Two columns (Option A = current quote, Option B) with a
   clear difference callout. Option A's full grouped breakdown and Option B's lines must
   both be complete (services / merchandise / discounts / tax / total) — today B lacks
   grouping and A lacks a tax line. At-Need: no payment estimate. Must fit one landscape
   or portrait page for typical quotes (use `_fqFitForPrint` or equivalent).
2. **FH `printFhCompare()`** is a hand-rolled navy inline-style page with no logo and a
   different header — bring it onto the same design as (1) so cem and FH compares are
   one document family. Keep its tax math correct (taxable discounts reduce the base).
3. **Compare panels** (`comparePanel` ~1012 and `fhComparePanel` ~2438 and their Option B
   builders): fix visual rough edges you find — alignment, spacing, label consistency,
   the print button — but do not redesign the app chrome and do not touch the discount
   `<select>` option TEXT in `cmpB_discType` (Track B owns those strings; you may
   restyle the control).
4. Leave `calcBTotal` / `calcFhBTotal` math alone except for bugs you can prove; if you
   change any number, pin it in a test.

## Constraints

- Quotes work must not touch contract download code (RIC/GA/CP/CIRGAS/DT).
- CRLF line endings; never `.replace('</body>',…)` — see CLAUDE.md.
- No `git add -A`; stage only files you changed. Commit locally on the track branch.

## Verification (you run it; the director re-runs it)

- `npm run check` → 8 blocks, 0 errors.
- Add `tests/test-compare-print.mjs`: open the app (fake Firebase — see
  `tests/test-august-promo.mjs` for the harness), build a cem quote + Option B, capture
  the print window HTML (stub `window.open`/`print` like other print tests do — see
  `tests/test-catalog-filter-print.mjs`), assert header, both option totals, difference,
  grouped rows, discount rows, tax line present; same for FH. Sabotage-prove (break the
  code, see red, restore).
- `PORT=3747 npm test` green, count ≥ the baseline the director reports.
- Rasterize both compare prints (Playwright screenshot of the print HTML) into
  `scratch/s28-a-renders/` and look at them. Report what you saw, honestly.

## Report

Files/functions changed, test counts before/after, render paths, decisions taken,
anything you could not verify.
