# Track A — Externalize the embedded contract templates

Branch `s01/externalize-templates`. Read `ops/DESIGN.md` (§2 architecture, §4 conventions,
§5 verification contract, §6 security) first.

`index.html` currently carries 9.40 MB of base64 contract templates inline, which every
visitor downloads on every load. You replace them with an on-demand loader that fetches the
already-extracted binary files, then delete the literals. The generated contracts must come
out byte-identical — this changes how bytes reach `PDFLib.PDFDocument.load()`, nothing else.

## What exists (verified 2026-07-25 — do not re-derive)

- **The templates are already extracted.** `pdf-templates/embedded/` holds 13 files named
  by their global (`GA_PDF.pdf`, `RIC_PDF_B64.pdf`, `CIRGAS_XLSX_B64.xlsx`, …) plus
  `manifest.json` with a SHA-256 for each. They were extracted from the embedded base64 —
  **never regenerate them from `pdf-templates/*.pdf`**, two of which are verifiably
  different bytes from what ships.
- **Externalize 11, not 13.** Leave `FQ_LOGO_WHITE_B64` and `FQ_LOGO_COLOR_B64` inline:
  5 KB each, consumed by the *synchronous* `_fqWhiteLogoSVG()` / `_fqColorLogoSVG()`
  (lines 17602–17603) which feed the family-quote PDF builder. Making them async would
  ripple through `_fqBuildModel` / `_fqBuildPDFBytes` for 0.1% of the payload.
- **The baseline to verify against** is in `%TEMP%\bw-baseline\before` — artifacts,
  `manifest.json`, `signatures.json`. Harness: `scratch/baseline-capture.mjs` and
  `scratch/baseline-sign.mjs`.
- **12 of the 13 generator entry points are already `async`** with `await` inside. Only
  `clDownloadFilledWorksheet` is synchronous.
- **`_fillChecklistTemplate(pdfB64, …)` (line 16578) takes the base64 as its FIRST
  PARAMETER.** Its four callers each pass a different blob: `riclGeneratePdf` (16225),
  `anclGeneratePdf` (16337), `gaclGeneratePdf` (16472/16480), `cpclGeneratePdf` (16496).
  It is already `async`.
- **The RIC decode is already async and two-branch** (lines 13147–13160): it builds a
  `data:application/pdf;base64,…` URL and `fetch`es *that* to avoid `atob` overhead on a
  1.4 MB string, with a manual `atob` fallback. This is a decode trick, not file-loading.
- **Line endings are CRLF.** A multi-line match using `\n` in a script silently fails.
- The dev server is `node dev-server.mjs` on port 3737. `npm test` starts and stops it
  itself.

### The 9 call sites to rewire

| Line | Global | Shape today |
|---|---|---|
| 5027 | `GA_PDF` | `var pdfB64 = GA_PDF; var pdfBytes = Uint8Array.from(atob(pdfB64), c => c.charCodeAt(0));` |
| 13147–13160 | `RIC_PDF_B64` | the two-branch data-URL/atob block |
| 13874 | `ACH_PDF_B64` | `Uint8Array.from(atob(ACH_PDF_B64), …)` inside `PDFLib.PDFDocument.load(…)` |
| 13911 | `RULES_PDF_B64` | same shape |
| 15044 | `CP_PDF_B64` | `var cpBytes = Uint8Array.from(atob(CP_PDF_B64), …)` |
| 15270 | `GA_PDF` | same shape, inside the `!isBurial` branch |
| 16579 | *(parameter)* | `_fillChecklistTemplate` — change the param to a template NAME |
| 16768 | `COMM_WS_XLSX_B64` | `_fillWorksheetXlsx` |
| 16873 | `CIRGAS_XLSX_B64` | `_fillCirgasXlsx` |

### DO NOT TOUCH

- **Lines 8546 and 15714** — these `atob()` calls decode a canvas `toDataURL()` result.
  Nothing to do with templates. Rewiring them breaks image embedding.
- `_fqB64ToBytes` (17618) and `FQ_FONTS` (17612–17616) — fonts, needed synchronously.
- The pdf-lib standard-14 AFM data around line 4529.

## Build

1. **Branch** from latest `origin/main`: `git pull --rebase` then
   `git checkout -b s01/externalize-templates`.
   **Navigate the Claude Code Browser pane away from `index.html` before your first edit** —
   it reloads the file after every Edit with live network access and boots the app against
   production Firebase.

2. **Add the loader**, near the top of the main app script block (block 3, after the other
   top-level `var` declarations). Shape:
   - `BW_TEMPLATE_FILES` — a map from global name to filename, matching
     `pdf-templates/embedded/manifest.json` exactly.
   - `async function bwTemplate(name)` → `Uint8Array`. **Cache the promise, not the bytes**,
     in a module-level object, so two concurrent callers dedupe instead of double-fetching.
     One retry on failure. On final failure `throw new Error('Could not load template ' +
     file + ' — ' + reason)`.
   - `function bwPrefetchTemplates(moduleType)` — fires `bwTemplate()` for that module's
     templates without awaiting, swallowing rejection (the real call will retry and report).
     Call it from `show()` on section entry. Map: `ric` → RIC_PDF_B64, ACH_PDF_B64,
     RULES_PDF_B64, RIC_CL_PDF_B64; `ga` → GA_PDF, GA_CL_PDF_B64; `cp` → CP_PDF_B64,
     CP_CL_PDF_B64; `an` → CIRGAS_XLSX_B64, AN_CL_PDF_B64.
   - Resolve paths relative to the page: `'pdf-templates/embedded/' + file`.

3. **Rewire the 9 call sites** in the table above. Each becomes
   `var bytes = await bwTemplate('<GLOBAL_NAME>');`. For line 13147–13160, replace the whole
   two-branch block — and delete the three `console.log('[RIC] …')` debug lines and the
   `if (typeof RIC_PDF_B64 === 'undefined')` guard with it; the loader's error path replaces
   them. For `_fillChecklistTemplate`, change the first parameter from the base64 string to
   the template name and `await bwTemplate(name)` inside — one edit instead of four, and
   update the four callers to pass `'RIC_CL_PDF_B64'` etc.

4. **Make `clDownloadFilledWorksheet` async** and audit its callers — it is the only one of
   the 13 that is not already async. An un-awaited caller ships an empty file.

5. **Delete the 11 base64 literals.** Keep `GA_PDF_BURIAL` / `GA_PDF_CREMATION` working —
   line 4552 aliases them to `GA_PDF`; they must now resolve through the loader, not to a
   deleted variable.

6. **Verify** (below). Commit with explicit paths only, tagged `[s01/externalize-templates]`,
   ending with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. Push the branch.
   **Do not merge. Do not touch main. Do not push to main.**

## Acceptance gates (quote actual outputs in your report)

1. `npm run check` → exactly `index.html: 9 blocks, 0 errors`
2. `npm test` → exactly `368 passed, 0 failed across 12 suites`
3. File size — quote the numbers:
   `node -e "const z=require('zlib'),f=require('fs');const s=f.readFileSync('index.html');console.log('raw',(s.length/1048576).toFixed(2),'MB gzip',(z.gzipSync(s,{level:9}).length/1048576).toFixed(2),'MB')"`
   → raw ≤ 2.6 MB, gzip ≤ 0.75 MB
4. Generator baseline — the gate that matters most:
   `TAG=after node scratch/baseline-capture.mjs` then
   `node scratch/baseline-sign.mjs "%TEMP%\bw-baseline\after"`, then diff
   `after/signatures.json` against `%TEMP%\bw-baseline\before\signatures.json`.
   → **12/12 captured, every signature identical.** Quote the RIC line specifically:
   6 pages, 141 AcroForm fields, unchanged `fieldsHash`.
5. Failure path — prove the error is visible. Temporarily rename one file in
   `pdf-templates/embedded/`, trigger that generator, confirm a specific error naming the
   template reaches the user rather than a silent failure or an empty download. **Rename it
   back** and re-run gate 4.

## Out of scope

- The two SVG logos, `FQ_FONTS`, and the pdf-lib AFM data — all stay inline.
- The two mismatched files in `pdf-templates/` (`ClearPoint Contract 2026.pdf`,
  `WMP_Retail_Installment_Contract_2026.pdf`). Do not adopt, delete, or "fix" them. They are
  a separate sprint's question.
- Contract field mapping, tax/pricing math, saved-data structure, quote PDF layout,
  dropdown options, field behavior, IDs and data hooks.
- The vendored minified libraries (pdf-lib, firebase, jszip). Moving them to `<script src>`
  is free and safe but is a *different* change — sprint S5.
- Any Firebase code. This sprint touches none, which is why it is a good first one.
- `prices.json`, the saved-list focus bug, and anything else on the roadmap.
