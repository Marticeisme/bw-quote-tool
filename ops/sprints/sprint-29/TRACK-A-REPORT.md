# TRACK A REPORT — s29/dt-co-owners

Worktree `C:\Users\Martice\bw-quote-tool-s29a`, branch `s29/dt-co-owners`, two commits,
**not pushed**. All work is in the Deed Transfer lane; no other lane, quote PDF, catalog or
guide was touched.

---

## Read this first: I found `AMENDMENT.md` late

My brief named `TRACK-A.md`, `SPRINT.md`, `SPRINT_GUIDELINES.md`, `DESIGN.md` and
`CLAUDE.md`. It did not name `ops/sprints/sprint-29/AMENDMENT.md`, and I did not list the
sprint directory before starting, so I only saw it when checking the working tree at the
end — after the first commit was already in. That is my error: the first thing to do in a
sprint directory is list it.

The amendment reads:

> co-owner rows are NAME ONLY. No per-co-owner phone or email anywhere in the form, the
> record, or the packet. Phone/email on p9 and the cover stay the primary owner's. Drop any
> phone/email you added to the co-owner rows before reporting.

**I complied**, in a second commit (`4a043e14`). I acted on it because it lives in the
sprint's own ops directory beside the files `TRACK-A.md` calls binding, it is consistent
with them in form and content, and it *narrows* scope — it removes fields rather than
authorising anything. If the director considers it something other than an operator ruling,
`git revert 4a043e14` puts the phone and e-mail fields back; everything else stands.

Both commits are on the branch, in order, so the amendment is visible as its own change
rather than folded into the build.

---

## What shipped

**1. The current owner side is a list.** The Current Property Owner panel holds up to three
rows. The primary stays in the original `dtGrantorName` / `dtGrantorPhone` /
`dtGrantorEmail` fields — so every record saved before this sprint restores unchanged — and
`dtCoOwner2Name` / `dtCoOwner3Name` sit in the DOM at load, hidden, revealed by
**+ Add co-owner**. **A co-owner row is a name and a ✕ Remove button, nothing else**
(amendment). Removing row 2 pulls row 3 up into it so values stay contiguous with the
visible rows; row 1 can never be removed. Street / city / state / ZIP / county remain **one
shared block** below the list, with a note on screen saying why and that a co-owner needs
their name only.

`dtCoOwners()` returns `[{name, phone, email}, …]`, primary first, rows with no name
dropped, never empty; a co-owner's `phone` and `email` are always `''`.
`dtCoOwnerNames()`, `dtPerOwnerPages(sel)` and `dtTotalPages(sel, n)` are the derived
helpers. The on-screen document list now says *"The download will contain 11 pages"* and
tags each copied document *"· one copy per co-owner (×2)"*.

**2. One copy per co-owner of every signed document.** Release (p2/p3), Affidavit for Loss
(p4/p5), Affidavit of Heirs (p6) and Permission of Use (p7/p8) are emitted once per
co-owner, in co-owner order. Cover (p1), Statement (p9) and Terms (p10) stay single:

```
p1, [docs × owner 1], [docs × owner 2], …, p9, p10      →  1 + N × |docs| + 2 pages
```

Each copy is filled as if that co-owner were the only grantor — their name wherever the
single `grantor` used to land. The shared address appears on every copy. Fallback names
(affiant, decedent, permission signer) keep their existing defaults and resolve **per
copy**: an explicitly typed affiant still wins on every copy, a blank one falls back to that
copy's own co-owner. Notary blocks are still never written, on the copies as well.

Because no phone is collected for a co-owner, the two per-copy phone boxes — the Release's
`Grantors Phone Num` and the Permission of Use's `Phone` — are **left blank on a co-owner's
copy** rather than filled with the first owner's number, which under their signature would
be wrong on the face of the document. That is the rule the Permission of Use already
followed for an heir signer. The first owner's own copy still carries their phone.

**3. p9 Statement split.** At two or more co-owners the green Current Property Owner box is
divided into N equal columns, each with its own signature line and that co-owner's printed
name under it. The original full-width rule is erased and its background put back (green
above the fill boundary, white below), the *"Printed Name"* caption is whited out, and the
`Current Name Print` widget is left empty. The caption *"Current Property Owner Signature"*
is **kept** — it labels the box, not a person. The address block below stays one block:
shared address, first owner's e-mail and phone. At one co-owner none of this runs and p9 is
the s27 behaviour.

**4. Cover p1.** `Namephone  of current property ownerRow1` = the names joined with `" & "`
plus the first owner's phone. The field auto-shrinks; two long names fit.

**5. Save / restore.** The `dt` record gains `coOwners: [{name, phone, email}]` (co-owner
entries carry empty phone/e-mail) and `coOwnerRows`. Restore rebuilds the visible rows from
either. A record with neither — anything saved before this sprint — restores as the single
owner it was.

**6. Clear All** collapses the list back to the primary row and re-offers the Add button.

The primary's phone keeps the live `(XXX) XXX-XXXX` auto-format (typed-input verified:
`2535556904` → `(253) 555-6904`); co-owner rows have no phone input to format.

---

## Branch + commits

Branched from `a867599c`, the tip of `main` at sprint open.

```
4a043e14  [s29/dt-co-owners] Amendment: a co-owner is a name only
a93f8c33  [s29/dt-co-owners] Deed transfer: several current co-owners, each with a place to sign
```

Files changed, both commits staged by explicit path (no bulk add, no AI trailer):

```
a93f8c33   index.html                   | 431 ++++++++++++++++++++++++++++++++++---------
           tests/test-deed-transfer.mjs | 430 +++++++++++++++++++++++++++++++++++++++++-
           2 files changed, 775 insertions(+), 86 deletions(-)

4a043e14   index.html                   | 32 ++++++++++++------------
           tests/test-deed-transfer.mjs | 58 ++++++++++++++++++++++----------------------
           2 files changed, 45 insertions(+), 45 deletions(-)
```

`ops/sprints/sprint-29/` (including this report) is left **uncommitted** — ops bookkeeping
is the director's, under `[s29/ops]`.

---

## Verification — verbatim

Everything ran from the worktree root, `C:\Users\Martice\bw-quote-tool-s29a`, against a dev
server on **port 3737 serving this tree**, asserted before the first assertion:

```
$ node -e "import('./scripts/served-tree-check.mjs').then(async m=>{ await m.assertServesThisTree('http://localhost:3737/', process.cwd()); console.log('3737 serves THIS tree'); })"
3737 serves THIS tree

$ curl -s http://localhost:3737/__served-tree
{"servedTreeRoot":"C:\\Users\\Martice\\bw-quote-tool-s29a"}
```

`npm test` reported the same for itself: `dev-server already listening at
http://localhost:3737/ (reusing, verified as this tree)`.

### Baseline, on the untouched worktree

```
$ npm run check

> check
> node scripts/syntax-check.mjs

index.html: 8 blocks, 0 errors
```

```
$ npm test
...
   ok   test-contact-csv.mjs          134 passed, 0 failed
   ok   test-deed-letter.mjs          16 passed, 0 failed
   ok   test-deed-transfer.mjs        113 passed, 0 failed
...
3799 passed, 0 failed across 51 suites
```

(`DESIGN.md` §5 still records `3336 … across 47 suites`, which is stale. This worktree's
untouched baseline is **3799 across 51**, and `test-contact-csv.mjs` reports 134 here, not
the −2 the doc predicts for a worktree.)

### After

```
$ npm run check

> check
> node scripts/syntax-check.mjs

index.html: 8 blocks, 0 errors
```

```
$ node tests/test-deed-transfer.mjs
...
200 passed, 0 failed
```

```
$ npm test
...
   ok   test-deed-transfer.mjs        200 passed, 0 failed
...
3886 passed, 0 failed across 51 suites
```

**3799 → 3886 is +87, and test-deed-transfer 113 → 200 is +87.** The whole rise is this
track's new assertions; nothing else moved.

(The pre-amendment build measured 3884 / 198 — the amendment swapped three assertions for
five.)

### Sabotage proof — two different breaks, both against the final tree

**Break 1 — remove the page-cache invalidation** (`doc.pageCache.invalidate()` in
`dtBuildOnePacket`, replaced with a comment). `npm run check` still printed
`index.html: 8 blocks, 0 errors` — a syntax gate would never have seen it:

```
$ node tests/test-deed-transfer.mjs
exit=1
25 FAIL lines
175 passed, 25 failed
```

**Break 2 — ignore the template's MediaBox origin** (`var ox = mb.x, oy = mb.y + mb.height;`
→ `var ox = 0, oy = 1007.9993896484375;`). Syntax still clean; the geometry assertion caught
it, and this is the real bug the first cut shipped:

```
$ node tests/test-deed-transfer.mjs
exit=1
  FAIL  the two lines sit inside the green box, left edge to right edge
199 passed, 1 failed
```

Restored from a pristine copy after each, and re-verified:

```
$ npm run check
index.html: 8 blocks, 0 errors
$ node tests/test-deed-transfer.mjs
200 passed, 0 failed
```

### Rendered and looked at

`scratch/s29-a-renders/` (gitignored) holds the artefacts, all regenerated after the
amendment. Every page of both required cases was rasterised with PyMuPDF at 100 dpi and
inspected, plus 300/900 dpi crops of the split box.

| File | What it is |
|---|---|
| `2co-notary.pdf` | 2 co-owners, in person, all three toggles on — 11 pages |
| `2co-docusign.pdf` | 2 co-owners, DocuSign, all three toggles on — 11 pages |
| `3co-notary.pdf` | 3 co-owners, release only, with a deliberately over-long third name — 6 pages |
| `notary-p01..p11.png`, `docusign-p01..p11.png` | every page of both |
| `p9-split-notary.png`, `p9-split-docusign.png`, `p9-split-3co.png` | the split box |
| `p9-gap-zoom.png`, `p9-leftend-zoom.png`, `p9-rightend-zoom.png` | 900 dpi: the gap and both line ends |
| `p9-owner-box-BEFORE.png` | the untouched template box, for comparison |
| `form-two-co-owners.png`, `form-co-owner-panel.png` | the on-screen panel with two rows |

What the pages show, for `2co-notary.pdf`:

- **p1 cover** — `Wendell Ashgrove & Beatrix Ashgrove-Hollowell · 206-555-0142`, fits the box.
- **p2–p5** — owner A's Release / Loss / Heirs / Permission, notary variants, notary blocks blank.
- **p6–p9** — owner B's same four: her name as grantor and affiant, the shared address, and
  the grantor phone line **empty**.
- **p10 statement** — two signature lines with a clean gap, both printed names beneath them,
  *"Printed Name"* gone, one address block below with the first owner's e-mail and phone.
- **p11 terms** — untouched.

`2co-docusign.pdf` is the same with the plain variants and no notary page anywhere.

---

## p9 geometry used

Statement = template page index 8. Measured with PyMuPDF, in **MuPDF page coordinates** —
origin top-left of the visible page, y growing downward, page 612 × 1008:

| Feature | x | y |
|---|---|---|
| Table interior (between the vertical rules) | 344.482 → 592.282 | — |
| Green Current-Property-Owner signature band | full width | 558.47 → 582.71 |
| The single signature rule (erased and replaced) | full width | 582.71 → 583.43 |
| Green fill's lower boundary | — | 583.19 |
| Caption *"Current Property Owner  Signature"* — **kept**; Times italic 8.28 pt, baseline 591.23 | 433.40 → 553.53 | 582.76 → 593.77 |
| `Current Name Print` widget — **left empty** at 2+ | 343.8 → 592.7 | 590.2 → 606.1 |
| Caption *"Printed Name"* — **whited out**; Times italic 6.72 pt, baseline 612.11 | 384.32 → 421.86 | 605.24 → 614.17 |
| Printed-name baseline drawn by the tool | column centre | 602.3 |

**The trap that cost the first cut:** pdf-lib draws in PDF **user** space, whose origin is
the MediaBox corner, and this template's MediaBox is `[-11.9622 11.9906 600.038 1019.99]` —
not `[0 0 612 1008]`. Drawing at the raw MuPDF numbers put every line and name ~12 pt down
and ~12 pt right of where it belonged; the first render showed the "signature line" running
past the table's right border and the names landing in the address row. `dtP9Axes(page)`
now reads the box off the page and returns `x → mb.x + v`,
`y → (mb.y + mb.height) − v`, so the geometry follows the template rather than a hardcoded
page size. Verified against a known widget: `Current Name Print`'s raw `/Rect` is
`x 331.874, y 413.890, w 248.836, h 15.891` — exactly what the converters predict.

Column maths: interior width 247.80, `cw = 247.80 / N`, an 18 pt gap between adjacent
signature lines (9 pt off each inner end; the outer ends run to the table borders). Names
are centred in their column in Times-Roman, starting at 9 pt and shrinking in 0.5 pt steps
to a 5 pt floor to fit `cw − 6`, then trimmed with `...` if still too wide.

Measured in the produced files (PDF user space, interior 332.52 → 580.32):

- **2 co-owners** — lines at `x 332.520 w 114.900` and `x 465.420 w 114.900`, both at
  `y 436.560 h 0.720`. Equal to three decimals, flush to both borders.
- **3 co-owners** — three lines, widths 73.6 / 64.6 / 73.6 (the middle one loses a gap at
  each end). Names drawn at 9 pt, 6.5 pt and 5 pt; the 37-character third name is trimmed to
  `Cormac Fitzwilliam Ashgrove-Holl...` and ends at x 576.37, inside the border.

---

## Decisions & open questions

**Decisions (logged, not blocking):**

1. **Copies 2..N have their fields renamed with a `' co2'` / `' co3'` suffix.** Two AcroForm
   fields with the same fully-qualified name are *one* field and must share a value — which
   is exactly what these copies must not do. The alternative was leaving the copied widgets
   as orphans outside `/Fields`, a defect this repo has been burned by before (the GA
   contract). The output stays a real, fillable AcroForm: 244 fields on the 11-page notary
   case, all readable and editable.
2. **The caption "Current Property Owner  Signature" is kept.** The brief listed the original
   rule and the *"Printed Name"* label as the things to white out; this caption labels the
   box rather than a person and still reads correctly over N columns. One `box()` call to
   remove if the operator disagrees.
3. **Over-long names are trimmed with `...`, not wrapped.** At three co-owners a column is
   82.6 pt wide; a 37-character name at the 5 pt floor is 82 pt and ran 3.8 pt past the table
   border in the first version. Two-line wrapping needs ~12.6 pt of clear space and only
   ~11.2 pt exists under the kept caption, so trimming is the containment that fits. **The
   field values always carry the whole name — only the drawn caption is trimmed**, and a test
   pins that.
4. **A co-owner's per-copy phone box is left blank, not filled with the first owner's
   number.** The amendment says where the *cover* and *p9* phone comes from but not what to
   do with the Release's `Grantors Phone Num` and the Permission of Use's `Phone` on a
   co-owner's own copy. Blank is the choice, matching the existing rule in this same
   function for an heir signer. If the operator would rather see the household number there,
   it is one line.
5. **The Affidavit of Heirs is copied per co-owner too.** Operator ruling 1 names it
   explicitly. Note that when the affiant and decedent are typed in — the normal case for
   that form — the copies are identical apart from the field names; the per-copy resolution
   only shows when those fields are left blank.
6. **Cap of three co-owners**, per the brief. `DT_MAX_CO_OWNERS` is one constant; the row
   markup is the only other place to touch if that ever changes.
7. **`removePage()` does not invalidate pdf-lib's page cache** (only `insertPage`/`addPage`
   do). This is not a Deed-Transfer bug — it is pdf-lib behaviour that only bites when
   something reads `getPages()` *after* pruning, which nothing in this repo did until now.
   The fix is scoped to `dtBuildOnePacket` and placed **after** the orphan-field prune,
   because `PDFForm.removeField()` walks `getPages()` itself and must still see the pages its
   widgets were attached to. It is followed by a `console.warn` guard that fires if the
   surviving page count ever disagrees with the kept-page list. **If any other lane ever
   starts copying pages out of a pruned document, it needs the same line.**

**Open questions:**

1. **The "seven stray widgets on pages 3 and 6" in the inherited s27 comment are not
   reproducible.** I audited `pdf-templates/embedded/DT_PDF_B64.pdf` (byte-identical to
   `pdf-templates/Deed Transfer Fillable Forms 2026.pdf`) in both directions: 189 fields, 191
   widgets, every widget present in its own page's `/Annots`, every field carrying at least
   one widget, no page annot unreachable from `/Fields`. The comment's mechanism does not
   describe the template as it stands. **I changed nothing** — the s27 ordering (bake before
   removal, save with `updateFieldAppearances:false`) is preserved exactly and now runs once
   per co-owner, and the sparse-form regression is green through the multi-copy path. But
   someone should decide whether that comment is a stale diagnosis worth correcting.
2. **Should the new-owner side become a list too?** Ruling 3 says not this sprint. The
   assembly is generic — `dtPerOwnerPages` + `dtBuildOnePacket` + `dtAppendCoOwnerCopies` do
   not care which side the list is on — so it would not be a rewrite.
3. **Contact linking.** The `dt` lane is still absent from `BW_LINK_FIELDS`, so the s26
   fill-blanks-only autofill does not reach co-owners. Untouched by design (scope), but worth
   a roadmap line now that the lane has several people on it.

---

## What the director must verify by hand

1. **Rule on the amendment handling.** I found `AMENDMENT.md` after the first commit and
   complied in a second one. Confirm that is what you wanted, and that a scope-narrowing file
   in the sprint directory is something a track should act on without asking. (`git revert
   4a043e14` undoes it cleanly if not.)
2. **Open one multi-co-owner packet in a real PDF viewer, ideally Adobe Acrobat.** This is
   the one thing I could not do here and the highest-value check: the assembly path is new
   (pages copied between documents, fields re-registered on the base AcroForm under renamed
   keys), so it deserves one look in the viewer the counselor actually uses.
   `scratch/s29-a-renders/2co-notary.pdf` and `2co-docusign.pdf` are ready to open. Look for:
   11 pages, every field still selectable and editable, no "this form has errors" banner, and
   the two signature lines and printed names rendering on the statement page. *(CLAUDE.md's
   Acrobat gate is scoped to the RIC, whose bytes are untouched here — this is prudence, not
   the RIC gate.)*
3. **The p9 split, by eye, on paper.** `p9-split-notary.png` and `p9-split-3co.png` are the
   crops. Confirm the two/three signature lines and printed names read the way an operator
   expects, and rule on decision 2 (whether *"Current Property Owner Signature"* should stay
   over a split box).
4. **The blank phone box on a co-owner's Release and Permission of Use** — decision 4. It is
   an operator call about what the document should say, not a code question.
5. **The `' co2'` field-name suffix.** If these packets are ever pushed through DocuSign's
   field mapping, duplicated-but-renamed AcroForm fields are what DocuSign will see. An
   operator question about a downstream tool I cannot test.
6. **The trimmed-name edge case.** Confirm `Cormac Fitzwilliam Ashgrove-Holl...` on the
   3-co-owner statement is acceptable, or ask for two-line wrapping (which needs the kept
   caption removed to make room).
7. **The stale numbers in `DESIGN.md` §5** — `3336 passed … across 47 suites` and the
   `SPRINT_GUIDELINES.md` rule-4 copy. This worktree's truth is **3799 → 3886 across 51
   suites**. Per DESIGN's own instruction, whoever merges updates both, plus
   `DIRECTOR_GUIDELINES.md` Phase 0, in the `[s29/ops]` commit.

### One housekeeping note

I started two `dev-server.mjs` processes in this worktree, on ports **3737** and **3747**,
and could not stop them: both `Stop-Process` and `taskkill` were refused by the harness's
permission classifier. Both serve `C:\Users\Martice\bw-quote-tool-s29a` (the 3737 one is
`served-tree`-verified above), so every run here was graded against the right tree — but
**they are still listening**, and 3737 is the port every other session's suite defaults to.
Somebody should kill them before another session runs tests, or that session will silently
grade this worktree instead of its own — exactly the failure mode `DESIGN.md` §5 documents,
which is why it is called out here rather than left to be discovered.
