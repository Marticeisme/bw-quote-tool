# TRACK F — s29/dt-sign-room: room to sign, living owners sign, deceased co-owners on the Affidavit of Heirs

Read `TRACK-D.md`, `TRACK-D-REPORT.md`, `TRACK-E-REPORT.md` and this file, then
`ops/SPRINT_GUIDELINES.md`, `ops/DESIGN.md`, CLAUDE.md. Work in the worktree
`C:\Users\Martice\bw-quote-tool-s29d` on branch `s29/dt-sign-room` (from main after Track E
merged; `node_modules` junctioned), from the worktree root. Never push. Never kill
processes you did not start; leave none running. Never sign in to production Firebase from
any script — fake store only; check route filters before any Playwright one-liner. Edit
`index.html` through Node scripts (CRLF file, 12 MB).

## The rulings (operator, verbatim, 2026-09-08 — binding)

On the live Release (Acrobat screenshot, two owners, DocuSign variant): "there are three
lines on this one for some reason and still not enough room for each person to sign."
On the Loss affidavit: "Not enough room for each signature here."

"should also be able to list the current owners as the surviving heirs at law if
applicable."

"also when there is an affidavit of heirs and there are two owners that have passed the
page needs to change to support that." → asked how: **"One affidavit naming both"** (both
names in the decedent line, both dates in the date-of-death line, on the single page).

Whose signature lines when an owner has died: **"Living owners only"** (name boxes still
read both names as on the deed; lines drawn for the surviving owner(s) only; the heir
affiant signs the Affidavit of Heirs and, as today, the Permission of Use).

"NO regressions to my wordings" still stands: no template text, label or help text changes
beyond what this brief requires.

## Part 1 — room to sign (the geometry is the whole job; measure with PyMuPDF, convert
## through the MediaBox origin `[-11.96 11.99 600.04 1019.99]`)

Rule: **every signer gets a line at least as long as the template's original and at least
as much clear height above it as the original had.** Today's 30 pt stacked pitch with the
name hugging the rule leaves ~20 pt to sign in — that is the complaint.

- **Release p2 (notary) / p3 (plain)**: keep the stack in the blank band above the original
  rule (Track D's approach) but with an ADAPTIVE pitch: `pitch = min(48, floor((rule −
  bandTop) / n))` — two signers ≈ 45 pt apart. Printed name 7.5 pt, baseline 8 pt under its
  rule, so the clear signing height is pitch − ~10. "Three lines": the third is the
  template's own empty line under the "(Grantor's Signature)" caption — leave it (it is
  his form) but make sure our erase actually removed the ORIGINAL rule in both variants
  (his screenshot shows p3; verify at 300 dpi that no hairline remains).
- **Affidavit for Loss p4 / p5** and **Permission of Use p7 / p8**: the band above the line
  is short, but the full page width beside it is empty. Lay the signers out SIDE BY SIDE
  across the page's text width (left margin to right margin, measured), n columns with a
  ≥ 14 pt gutter, each column's rule at the original rule's y and its printed name under
  it. At two signers each column is ~250 pt — longer than the original — with the original
  band height above. Erase the original rule (both rules on the Loss page, as Track D
  found). The Permission's Name/Address/Phone rows below stay one block. Widgets that sit
  on or under the drawn areas (the p3 `2_2` grantor-name widget, the Loss affiant widgets
  `NAME NUMERO1/2` and the address widget beside them) must be **removed from the form
  (`form.removeField`) at 2+ signers** — the operator's Acrobat shows their empty
  highlight boxes over the new lines. At one signer nothing is drawn or removed.
- **p9 statement** stays as is (operator named the halves).
- Generalize `dtSplitSlots`/`DT_SPLITS` rather than special-casing; `layout: 'stack' |
  'columns'` already exists — add the adaptive pitch and a `full-width columns` geometry.

## Part 2 — living owners sign

- Each co-owner row (primary included) gains a **"Deceased" checkbox and a date of death**
  (`dtOwner<n>Deceased`, `dtOwner<n>Dod`; for the primary use ids in the same pattern).
  The existing situation toggle "The current property owner is deceased" keeps driving the
  document set; checking any owner's Deceased box checks it (and unchecking all clears
  it). Saved on the record; legacy records restore with nobody deceased.
- `dtSigners()` = living owners in order. All signature drawing (Release, Loss,
  Permission, p9) uses `dtSigners()`, not `dtCoOwners()`. Name boxes keep `dtOwnerNames()`
  (all owners, "A & B"). One living signer → the template's single line, nothing drawn,
  nothing removed. Zero living owners → nothing drawn (the heir affiant signs where the
  form gives an affiant line; leave those as today).

## Part 3 — Affidavit of Heirs

- **Decedent line** = deceased owners' names joined " & "; **date of death line** = their
  dates joined " & " (in the same order). A typed `dtDecedentName` / `dtDateOfDeath` still
  overrides. Nobody flagged but toggle on → today's behavior (the primary).
- **"List current owners as heirs" button** in the heirs panel: fills the next empty heir
  rows with each LIVING owner — name, and address from that owner's own address if typed
  else the shared one; relationship and age left for the counselor. Never duplicates a
  name already in a row; caps at 5 rows as today.

## Verification (verbatim outputs)

- `npm run check` → `index.html: 8 blocks, 0 errors`.
- `npm test`: baseline on this worktree from the merged main (Track E in) — measure and
  report it, then the after numbers; test-deed-transfer baseline 317.
- Assertions: Release two-signer rows ≥ 40 pt apart; Loss/Permission two-signer columns
  each ≥ 240 pt wide at the original rule's y; the named widgets are absent from the form
  at 2 signers and present at 1; one deceased of two → exactly one line drawn nowhere
  (template line intact) and the widgets intact; Heirs decedent/date lines join both when
  both flagged, override wins; owners-as-heirs fills living owners only, no duplicates,
  respects the cap; save/restore of the deceased flags and dates; legacy record restores
  nobody deceased. Sabotage-proven red/green twice.
- Render: 2-signer notary + DocuSign, 3-signer notary, and one-deceased-of-two into
  `scratch/s29-f-renders/`; LOOK at every drawn page at 150 dpi and the Release/Loss blocks
  at 300 dpi for hairlines and highlight-box widgets (open with PyMuPDF widget overlay to
  see remaining widgets).

Commit `[s29/dt-sign-room]`, explicit paths, no AI trailers. Report to
`ops/sprints/sprint-29/TRACK-F-REPORT.md` with the geometry per page.
