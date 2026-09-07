# TRACK C — s29/dt-joint, part 2: split the signature line on the Loss Affidavit and Permission of Use

Track B built the generalized split helper but finished before the operator's amendment
at the bottom of `TRACK-B.md` reached it. Read `TRACK-B.md` (all of it, the AMENDMENT
section is the ruling), `TRACK-B-REPORT.md` (the Release geometry and how it was measured),
`ops/SPRINT_GUIDELINES.md`, `ops/DESIGN.md`, CLAUDE.md. Work in the worktree
`C:\Users\Martice\bw-quote-tool-s29b` on branch `s29/dt-joint` (HEAD `9e95f80d`), from
the worktree root. Never push. Never kill processes you did not start; leave none running.

## The ruling (operator, verbatim)

> "it's important we give somewhere for both of them to sign but if there's on addresss on
> the form and not both thats ok as long as it reads as purcsher & co-purchaser."

## Build

In `index.html`, `DT_SPLITS` (~line 21928) has geometry entries for the statement and both
Release variants, and `dtDrawSignatureSplit(doc, pageIndex, owners, G)` draws one. Add four
entries and four calls, nothing else:

- `lossNotary` (p4) and `lossPlain` (p5): the affiant's signature line.
- `permissionNotary` (p7) and `permissionPlain` (p8): the owner/signer's signature line.

For each: measure the rule, its caption and the nearest widgets with PyMuPDF the way Track
B did (its report shows the method; convert through the MediaBox origin — the template's
MediaBox is `[-11.96 11.99 600.04 1019.99]`). If there is room under the rule for printed
names, draw the N columns on the rule and names beneath; if the caption sits tight under it
the way the Release's does, use Track B's Release pattern (erase the rule, draw the columns
in the blank band above, keep the caption). If a widget prints the signer's typed name ON
that rule, leave it empty at 2+ owners the way `'2_2'` and `'Current Name Print'` are.
Address/phone boxes stay single. At one owner nothing is drawn. The Affidavit of Heirs is
signed by an heir — do not touch it. Change no wording anywhere.

Call the helper from the generate path next to the existing statement/Release calls, only
for pages that are in `keepAll`.

## Verification (verbatim outputs)

- `npm run check` → `index.html: 8 blocks, 0 errors`.
- `npm test`: baseline on this worktree is `3912 passed, 0 failed across 51 suites`,
  test-deed-transfer 226; report the new numbers.
- New assertions in `tests/test-deed-transfer.mjs`: at 2 owners both printed names are drawn
  on p4/p5 (loss on) and p7/p8 (permission on), per variant; at 1 owner none are drawn on
  those pages; the 1-owner page is unchanged from the control. Sabotage-proven red/green
  once (move an erase rect off its rule).
- Render 2-co-owner notary and DocuSign cases with loss + permission on into
  `scratch/s29-c-renders/` and LOOK at p4/p5/p7/p8 at 150 dpi: columns inside the block,
  names not colliding with captions or widgets.

Commit `[s29/dt-joint]`, explicit paths, no AI trailers. Report to
`ops/sprints/sprint-29/TRACK-C-REPORT.md`: geometry per page, gate output, decisions.
