# TRACK D — s29/dt-joint, part 2: STACKED signature lines (supersedes Track C)

Read `TRACK-B.md`, `TRACK-B-REPORT.md` and this file, then `ops/SPRINT_GUIDELINES.md`,
`ops/DESIGN.md`, CLAUDE.md. Work in the worktree `C:\Users\Martice\bw-quote-tool-s29b` on
branch `s29/dt-joint` (HEAD `9e95f80d`, clean), from the worktree root. Never push. Never
kill processes you did not start; leave none running. Never sign in to production Firebase
from any script — fake store only, check your route filters.

## The rulings (operator, verbatim, in order — the last one wins)

> "it's important we give somewhere for both of them to sign but if there's on addresss on
> the form and not both thats ok as long as it reads as purcsher & co-purchaser."

> "No I think it should separate lines so they don't have to sign so small"

So: every document the owners sign gives each co-owner a **separate full-width signature
line, stacked one under the other**, each with that owner's printed name under it — NOT
narrow side-by-side columns. The statement's green box (p9) is the one exception: the
operator ruled "split the green box in half" for it and the band is only ~24 pt tall, so
p9 keeps Track B's side-by-side split unchanged.

## Build

`DT_SPLITS` (~line 21928 of `index.html`) holds one geometry entry per page and
`dtDrawSignatureSplit(doc, pageIndex, owners, G)` draws it. Change the drawing for every
entry EXCEPT `statement` from N columns to N stacked rows: full-width rule, name centred
(or left-aligned, match the form) under it, rows `rowPitch` apart, the first row placed so
the LAST row lands where the original rule was (or the original rule erased and the stack
drawn in the blank band above it, the way Track B did the Release — see its report for
why). Add a `layout: 'stack' | 'columns'` (or equivalent) to the geometry so the statement
keeps columns. Cap is 3 owners; make sure 3 stacked rows fit on every page.

Pages to cover, each measured with PyMuPDF and converted through the MediaBox origin
(MediaBox `[-11.96 11.99 600.04 1019.99]`, Track B's scar):

- Release p2 (notary) and p3 (plain): convert the existing column split to stacked rows.
- Affidavit for Loss p4 (notary) and p5 (plain): the affiant's signature line. If a widget
  prints the affiant's typed name ON that rule, leave it empty at 2+ owners.
- Permission of Use p7 (notary) and p8 (plain): the signer's line — ONLY when the signers
  are the owners. When the owner is deceased the Permission is signed by the heir affiant
  (`dtHeirAffiant` set), so draw nothing there and leave the single line for the heir.
  (Track C found this: its aborted diff is at `C:\Users\Martice\bw-quote-tool\scratch\s29c-partial.diff`,
  read it for the p4/p5/p7/p8 measurements it already took, but do not apply it — it drew
  columns.)
- Affidavit of Heirs: signed by an heir, untouched. Cover, terms: untouched.

Address/phone boxes stay single. At one owner nothing is drawn anywhere. Change no wording.

## Verification (verbatim outputs)

- `npm run check` → `index.html: 8 blocks, 0 errors`.
- `npm test`: baseline on this worktree `3912 passed, 0 failed across 51 suites`,
  test-deed-transfer 226; report the new numbers.
- Assertions: at 2 owners both printed names are drawn on p2/p3, p4/p5 (loss on), p7/p8
  (permission on, owner alive) per variant, and their drawn y-positions DIFFER (stacked,
  not side by side); at 2 owners with owner deceased nothing is drawn on p7/p8; at 1 owner
  nothing is drawn on any of them; p9 still shows both names side by side; 3 owners fit
  (three names drawn, all inside the page's blank band). Sabotage-proven red/green once.
- Render 2-owner notary + DocuSign (loss + permission on, owner alive) and a 3-owner case
  into `scratch/s29-d-renders/` and LOOK at p2/p3/p4/p5/p7/p8 at 150 dpi: rows inside the
  block, names clear of captions and widgets, lines long enough to sign on.

Commit `[s29/dt-joint]`, explicit paths, no AI trailers. Report to
`ops/sprints/sprint-29/TRACK-D-REPORT.md`: geometry per page, gate output, decisions.
