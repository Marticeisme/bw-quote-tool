# TRACK A — s29/dt-co-owners

Extend the Deed Transfer lane in `index.html` so the CURRENT owner side can be several
people (co-owners of the interment rights), and every co-owner gets a place to sign.
Work in the worktree `C:\Users\Martice\bw-quote-tool-s29a` on branch `s29/dt-co-owners`
(already created; `node_modules` junctioned). Obey `ops/SPRINT_GUIDELINES.md`,
`ops/DESIGN.md`, and `ops/sprints/sprint-29/SPRINT.md` (the operator rulings there are
binding). Never block on questions; log decisions in your report. Never kill processes
you did not start. Run all Node/Playwright from the worktree root.

## Where the lane lives

- Form markup: `id="dtGrantorName"` (~line 3519) and the surrounding `dt-f` fields.
- Fill: `dtFillForm(form)` (~21540), `dtPageIndexes`, `dtDocSet`, the generate handler
  (~21730) with the orphan-widget prune (`dtWidgetDoomed`) and the baked
  `updateFieldAppearances()` BEFORE page removal + `save({updateFieldAppearances:false})`.
  Keep that order — it is the s27 sparse-form hotfix (blank fields crash save otherwise).
- Save/restore: the `dt` capture/restore pair near ~21844 (`quotes/dt/q<id>`).
- Template: `pdf-templates/Deed Transfer Fillable Forms 2026.pdf`, embedded as
  DT_PDF_B64. Read pages with PyMuPDF before touching the fill map; field names are
  garbage strings, the commented map in the code says what each one is.
- Existing suite: `tests/test-deed-transfer.mjs` (113 assertions) — extend it, keep it
  green. Line endings are CRLF.

## Build

1. **Form.** Under Current Property Owner: the primary stays as is; add an
   "Add co-owner" button that appends a row (NAME ONLY — operator amendment 2026-09-07: co-owners carry no phone or email; the primary's phone/email are the only ones on the packet) — cap 3 total, remove
   button per row, same look as the heir rows. Address/city/state/zip/county remain ONE
   shared block. Helper `dtCoOwners()` returns `[{name}, ...]`, primary first, blank rows dropped.
2. **Per-co-owner copies.** For Release (p2/p3), Affidavit for Loss (p4/p5), Affidavit
   of Heirs (p6), Permission of Use (p7/p8): the download carries ONE COPY PER CO-OWNER
   of each included page, in co-owner order, each filled with that co-owner substituted
   wherever today's single `grantor` lands (phone/email stay the primary's on every copy). p1, p9, p10 stay single.
   Do this by loading the template once per co-owner with pdf-lib, filling and pruning
   each the s27 way, then assembling one output with `copyPages` in the order
   p1, [docs × owner 1], [docs × owner 2], ..., p9, p10 — or by another approach that
   keeps the s27 prune/appearance order intact. Prove page order and count with a test.
   Fallback names (affiant, decedent, permission signer) keep their current defaults but
   resolve per copy. Notary blocks: still never written.
3. **p9 Statement split.** At 2+ co-owners, the green Current Property Owner box gets N
   equal columns: each column a signature line with that co-owner's printed name under
   it (draw lines + text with pdf-lib in the template's font size; white-out the
   original single line and its "Printed Name" label, and empty the `Current Name Print`
   widget). The address block below (`Address Current`, `City/State/Zip Current`,
   `Email Current`, `Cell Phone Current`) stays one block filled from the shared address
   + the primary's email/phone. At 1 co-owner nothing changes on p9. Read p9's geometry
   with PyMuPDF first (widget rects + the text blocks "Current Property Owner
   Signature" ≈ y 583 and "Printed Name" ≈ y 605 on a 612×1008 page) and render your
   result to confirm the columns sit inside the green box.
4. **Cover p1.** `Namephone  of current property ownerRow1` = names joined with " & ",
   primary phone.
5. **Save/restore.** `coOwners` array (names only) on the record; restore rebuilds the rows; records
   without it load as before. Follow the existing capture/restore pair exactly.
6. **Clear** (`dtClearAll`) removes the extra rows.

## Hard rules

- No production Firebase writes from tests (tests/fake-firebase.js). No real names —
  fixtures are invented, 555 phones, @example.com.
- Scope: the Deed Transfer lane only. Other lanes, quote PDFs, catalogs, guides
  byte-untouched.
- Commit `[s29/dt-co-owners]`, explicit paths, no AI trailers, never push.

## Verification (quote outputs verbatim)

- Baseline first: on the untouched worktree run `npm run check` and `npm test`, record
  both counts (worktree reads may differ slightly from main; note the numbers).
- `npm run check` → `index.html: 8 blocks, 0 errors`.
- `npm test` rises by exactly your new assertions; test-deed-transfer stays green.
- New assertions at minimum: 1 co-owner produces the s27 page set unchanged; 2 co-owners
  → each included doc page appears twice in order (owner A copy then B), p1/p9/p10 once,
  total page count = 1 + N×|docs| + 2; each copy carries its own co-owner's name and the
  other's name is absent from it; p9 shows both printed names; cover row shows "A & B";
  SPARSE fill (only names + property) for 2 co-owners generates without throwing in both
  variants; save/restore round-trips coOwners; legacy record without coOwners restores
  one owner. Sabotage-proven red/green twice (two different breaks).
- Render a 2-co-owner notary case and a 2-co-owner DocuSign case with PyMuPDF into
  `scratch/s29-a-renders/` and LOOK at every page, especially the p9 split box.

## Report

What shipped; branch + commits; verbatim gate output with exact commands; files changed;
the p9 geometry you used; decisions & open questions; what the director must verify by
hand.
