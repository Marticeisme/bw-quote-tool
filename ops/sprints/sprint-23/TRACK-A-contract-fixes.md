# TRACK A — s23/contract-fixes (contract-lane bug fixes)

You are a track subagent in sprint-23 of the BW Quote Tool. Obey
`ops/SPRINT_GUIDELINES.md` and `ops/DESIGN.md` (read both first). Your working
directory is the worktree `C:\Users\Martice\bw-quote-tool-s23a` (already created,
branch `s23/contract-fixes`, node_modules junctioned). ALWAYS
`git -C C:\Users\Martice\bw-quote-tool-s23a` for git commands. Commit locally to
your branch; NEVER push, never touch main. Stage explicit paths only.

**Stale-base check FIRST:** `git -C <worktree> log -1 --oneline` must show
`fbeefab7` ("[s22/ops] Record the tax-fold round…") or a descendant of it. If your
base is older, STOP and report.

All line numbers below were verified 2026-08-15 against index.html at fbeefab7.
Line numbers drift as you edit — re-grep before each edit. index.html is ~23k
lines, CRLF, one giant file: use targeted Edit calls or short Node scripts, never
whole-file rewrites. At most ONE direct Edit to index.html (the Browser-pane hook
boots the app against production Firebase on every Edit); prefer Node scripts for
subsequent changes, or navigate the pane away first. NEVER write to production
Firebase; never run save/persist functions from scripts.

## Fix 1 — RIC quantity shows 1 for two O&C / recording fees (operator issue 3)

Root cause: `labelQty(l)` (index.html:18406) re-derives quantity from a literal
`×N` in the line label. The RIC O&C/Recording row aggregation at 18367–18378 sums
`labelQty` across bucketed lines. Builders that multiply the AMOUNT by qty but
omit the `×N` label suffix produce qty 1 with a doubled dollar figure.

Confirmed offenders:
- **Scatter garden** (index.html:7691): `lines.push({label: 'Recording Fee',
  amount: bwFee('RECORDING:all') * gardenQty, taxable: false})` — no `×N` suffix.
  Compare its sibling at 7692 (plaque) which does append `' ×' + gardenQty`.
  Fix: append `(gardenQty > 1 ? ' ×' + gardenQty : '')` to the label, matching
  house style everywhere else (burial/urn packages 7703/7713, niche 7783/7791,
  mausoleum 7825/7835, standalone panels 7848–7862).
- **Compare-Options builder** (8684, 8691, 8696, 8701, 8707, 8714): pushes
  `Recording Fee – …` / `Ground Inurnment` / `Niche Inurnment O&C` lines at 1×
  amount with NO qty at all, ignoring the garden qty (`cmpB_gardenQty`, ~8640).
  This is a real money bug (undercharge), worse than the label defect. Fix both
  the amount (× qty) and the label suffix on every line where quantity applies.
  Read the surrounding builder carefully to confirm which lines scale with qty
  and which are genuinely one-per-quote — do not blindly multiply.

**Sweep:** grep every `lines.push` site whose amount expression contains `* `
and a qty-like variable; verify each either appends `×N` or is genuinely qty-1.
List the sites you checked in your report (site → verdict).

**Verify:** a Playwright script (fake-firebase harness like the existing tests —
see tests/ for the pattern) that builds a scatter-garden quote with gardenQty=2,
imports to RIC, generates, and asserts pdf-lib reads `Qty 3`/`Qty 4` = '2' with
the correct doubled amounts; plus a qty=1 control asserting no `×1` suffix ever
appears. Add these assertions as a new suite or extend an existing RIC suite —
follow the tests/ conventions; the suite count in npm test must RISE, and you pin
the new number in your report.

## Fix 2 — CIRGAS IOA additional-signatures tab placement (operator issue 4)

Root cause: the workbook.xml `<sheets>` reorder in `_fillCirgasXlsx` at
index.html:22722–22749 uses a static `priority` array (22736–22741) that parks
`'IOA ADDL SIGNERS'` at index 12 — ten tabs after `'INTERMENT AUTH NEW'` (the
IOA, index 2). Deliberate on 2026-07-22; the operator now wants it adjacent when
a co-signer exists.

Fix: `data.iaMinSignatures` (computed at 22810, in `data` at 22847) is in scope
at the reorder block. When `data.iaMinSignatures > 1`, splice
`'IOA ADDL SIGNERS'` into the priority list immediately after
`'INTERMENT AUTH NEW'`; otherwise leave it at the end. Same treatment for
`'Mem Order Form Addl Signers'` is NOT requested — leave it where it is. Update
the 2026-07-22 comment at 22734 to record the new conditional rule.

**Verify:** script that runs `generateCirgasPacket` paths (or `_fillCirgasXlsx`
directly with synthetic data) for (a) purchaser-only and (b) purchaser +
co-purchaser; unzip the output workbook.xml and assert the sheet order: (a) ADDL
SIGNERS at the end, (b) ADDL SIGNERS immediately after INTERMENT AUTH NEW, all 30
sheets present both times, r:ids untouched. Assert Excel-validity by checking the
XML parses and sheet count/name set is unchanged.

## Fix 3 — Generated commission worksheet fails to print in Excel (operator issue 5)

Symptom (operator screenshot): Excel's own print-error dialog on
`\\us-sea-v-file01\WMP - Cascade` when printing a tool-GENERATED (not imported)
commission worksheet; convert-to-PDF also fails. Imported ones print.

Confirmed divergences (2026-08-15 exploration):
1. `_fillWorksheetXlsx` (index.html:22122) leaves the template's stale
   `xl/calcChain.xml` in place. The CIRGAS generator strips calcChain + its
   `[Content_Types].xml` override + the workbook rel at 22752–22767, with a
   comment naming it as the Excel repair-on-open trigger. Port exactly that
   treatment into `_fillWorksheetXlsx`.
2. The template's `<pageSetup scale="62" orientation="landscape" r:id="rId1"/>`
   has NO `paperSize` attribute — paper comes solely from
   `xl/printerSettings/printerSettings1.bin` (a captured DEVMODE for some
   long-gone printer). Add `paperSize="1"` (US Letter) to the pageSetup in the
   generated sheet1.xml, and REMOVE the `r:id` printer-settings reference + the
   printerSettings part + its rel + content-type entry, so Excel falls back to
   the user's default printer instead of a stale DEVMODE. Do this to the
   GENERATED output only — never modify the shipped template file.
3. Mark-of-the-Web/Protected View on blob downloads cannot be fixed from the
   tool — state that plainly in your report as the residual risk; the operator
   tests on the office printer at the close gate.

**Verify:** generate a filled worksheet via the existing harness pattern, unzip,
assert: no calcChain part/override/rel; pageSetup carries paperSize; no
printerSettings part/rel/override; all filled cell values still present at their
coords (spot-check the cell map at 21956–21969); the zip opens cleanly. Confirm
the CIRGAS generator's own output is untouched by your change (its packet builds
byte-identical for a fixed input before/after, or explain any diff).

## Track-wide gates (quote outputs verbatim in your report)

- `npm run check` → `index.html: 8 blocks, 0 errors`
- `npm test` → all green; count must be ≥ 2854 and you pin the new number
  (your new RIC assertions raise it)
- Generator baseline (`scripts/baseline-capture.mjs` + `baseline-sign.mjs`,
  server on 3737, repo root, frozen clock): diff signatures.json. Expected: RIC
  signatures change ONLY if a scenario carries multi-garden scatter or
  Compare-Options fee lines — explain every changed field; anything else
  byte-identical. If ALL 14 are byte-identical, say so.
- Quote the exact commands + env pins. Any verifier reading disk AND a served
  page calls served-tree-check.mjs first. Do not start a suite while another is
  running; do not stop a dev server you did not start (pin your own PORT if 3737
  is busy — see the s22 scar).

## Report format

Per SPRINT_GUIDELINES rule 8: what shipped; branch + commits; verbatim gate
output; files changed; the lines.push sweep table; decisions & open questions;
what the director must verify by hand (include: RIC Acrobat check is required at
the close gate since RIC field values change).
