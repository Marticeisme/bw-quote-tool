# TRACK C — Strip Acrobat's own JavaScript from the downloaded ClearPoint contract

Repo: `C:\Users\Martice\bw-quote-tool` (main working tree). Branch: `s07/cp-strip-acrojs`
from current `main`. Obey `ops/SPRINT_GUIDELINES.md` and `ops/DESIGN.md`. Commit locally,
NEVER push, never touch `main`.

## The bug (operator report, root cause already confirmed)

When Martice downloads the Pre-Need Contract (ClearPoint) and then edits ANYTHING in
Acrobat (contract number, an amount), Acrobat throws repeated warnings — "The value
entered does not match the format of the field [FPTotal]" (also `Amount Trusted`,
`fill_60`, `FP`, `Tax`) — and PLAN TOTAL collapses to `$1.#R` (Acrobat's NaN rendering).

Root cause: `pdf-templates/embedded/CP_PDF_B64.pdf` ships a live calculation chain —
AcroForm `/CO` with 6 entries (e.g. `Amount Trusted` runs
`AFSimple_Calculate("PRD", ["90%","FPTotal"])`) — plus AF number-format (`/F`) and
keystroke (`/K`) scripts on ~36 fields. The tool fills values like `1,234.56` via
`fmt$()`; any user edit re-fires Acrobat's chain, which can't parse the state and NaNs.

**Operator decision (2026-07-29): strip the template's field-level JavaScript from the
DOWNLOADED PDF.** Accepted trade-off: totals no longer auto-recalculate when he edits in
Acrobat. Values the tool fills must be byte-identical to today.

## What to do

In `index.html`, in the ClearPoint contract generator ONLY (the function filling the CP
form, region ≈ lines 19100–19400 — `setTF('FPTotal', …)` etc., loading `CP_PDF_B64` via
`bwTemplate`), after all fields are set and before/around `updateFieldAppearances`/save:

1. Remove each AcroForm field's (and widget's) `/AA` dictionary — Calculate, Format,
   Keystroke, Validate actions — using pdf-lib low-level API
   (`field.acroField.dict.delete(PDFName.of('AA'))`, and the same on each widget dict).
2. Delete the AcroForm dictionary's `/CO` (calculation order).
3. Remove document-level JavaScript if present (catalog `/Names` → `/JavaScript`), and any
   `/OpenAction` that is a JS action. Do NOT touch pages, appearances, or field values.
4. Leave the form editable (do not flatten — flattening is known to blank this template,
   see the comment already in the code).

**Scope discipline:** ClearPoint contract only. Do NOT touch the RIC, GA, CIRGAS or
checklist generators, the quote PDFs, or any template file on disk. The embedded template
itself stays as-is — stripping happens in-memory on the downloaded copy.

While you're there, CHECK (read-only, report only, change nothing) whether
`GA_PDF.pdf` and `RIC_PDF_B64.pdf` templates carry a `/CO` too — one paragraph in the
report so the director can raise it, no code.

## Verification gates (quote outputs verbatim in your report)

1. `npm run check` → `index.html: 8 blocks, 0 errors`.
2. `npm test` → counts must not fall (expect `1300 passed, 0 failed across 26 suites`,
   1298 without `wmp-cemetery-map/`).
3. **Generator baseline 14/14 IDENTICAL**: start the dev server (`node dev-server.mjs`,
   port 3737, from repo root; make sure nothing stale is listening first), run
   `TAG=after node scripts/baseline-capture.mjs`, compare against
   `%TEMP%\bw-baseline\before` signatures — all 14 scenarios identical. Stripping actions
   must not move a single field VALUE or text; if a ClearPoint signature covers /AA
   presence it may not — signatures compare values and page text.
4. **Prove the strip on the artifact**: a Python (PyMuPDF) check on a freshly generated
   ClearPoint PDF (both burial and cremation paths): zero fields with `/AA`, no `/CO` in
   the AcroForm, no doc-level JavaScript — AND the same check on today's output fails
   (i.e., the check can detect the unstripped state). Also assert `FPTotal`,
   `Amount Trusted`, `fill_60`, `Tax`, `FP` carry the same string values before/after
   the change.
5. Add a small permanent test if a natural home exists in `tests/` (e.g., extend an
   existing ClearPoint suite) asserting the generated CP PDF has no `/AA` and no `/CO`.
   Test scripts may READ Firebase, never write; block `gstatic.com/firebasejs` and use
   `tests/fake-firebase.js` like the existing suites.

## Report

What shipped; branch + commits; verbatim gate outputs; files changed; the GA/RIC `/CO`
recon paragraph; decisions & open questions; what only Acrobat can verify (the operator
will do the Acrobat edit test at close).
