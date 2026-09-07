# TRACK D REPORT — s29/dt-joint, part 2: stacked signature lines

Worktree `C:\Users\Martice\bw-quote-tool-s29b`, branch `s29/dt-joint`, **one commit on top of
Track B's**, **not pushed**. Deed Transfer lane only; every hunk in `index.html` is inside the
`dt*` region (hunk list below). Track C's aborted diff was read for its measurements and **not
applied** — it drew columns.

Read first, in order: `TRACK-D.md`, `TRACK-B.md` (including the AMENDMENT), `TRACK-B-REPORT.md`,
`TRACK-C.md`, `ops/SPRINT_GUIDELINES.md`, `ops/DESIGN.md`, the worktree's `CLAUDE.md`. Where
`TRACK-B.md` and `TRACK-C.md` still say "columns", the operator's later ruling in `TRACK-D.md`
governs.

---

## What shipped

**Every document the owners sign now gives each co-owner a separate full-width signature line,
stacked, with that owner's printed name under it.** That is the Release (notary p2 and plain
p3), the Affidavit for Loss of Certificate (notary p4, plain p5) and the Permission of Use
(notary p7, plain p8). The statement's green box (p9) is unchanged from Track B — side-by-side
columns, because the operator ruled "split the green box in half" for that box by name and its
band is only ~24 pt tall, one row's worth. The Affidavit of Heirs is signed by an heir and was
not touched. No wording, label, help text or document name changed anywhere.

**Two documents are only stacked when the CO-OWNERS are the people who sign them.**
`dtFillForm()` already lets one named person take over each of them, and a stack of owner lines
under an affidavit sworn by somebody else would be a false document:

| Document | Signed by the owners when… | Otherwise |
|---|---|---|
| Affidavit for Loss | `dtAffiantName` blank, or equal to the joined names | that one affiant signs; nothing drawn |
| Permission of Use | `dtHeirAffiant` blank, or equal to the joined names (owner alive) | the heir signs; nothing drawn |

The brief named only the Permission of Use guard. I applied the same test to the Loss affidavit
because `dtFillForm()` gives it the same "or somebody else" default; it is logged as decision 2
below and pinned by an assertion that fails both ways round.

### The build

- `DT_SPLITS` entries gained **`layout`** (`'stack'` for the six pages above, `'columns'` for
  the statement), **`rowPitch`** (preferred vertical distance between rows, 30 pt everywhere)
  and **`bandTop`** (the highest y a rule may take — the floor of the blank band above, measured
  as real ink).
- New **`dtSplitSlots(G, n)`** returns the geometry of each owner's slot. For a stack: N
  full-width rows, the LAST on the entry's own `ruleTop`, earlier rows stacked upward, with the
  pitch squeezed to `(ruleTop − bandTop) / (n − 1)` when the full 30 would overrun the band. For
  columns: exactly the arithmetic Track B had, moved verbatim, so the statement's output is
  byte-identical.
- New **`dtSplitSigners(named, joined, owners)`** — one line, returns `[]` when a different
  person is named, which `dtDrawSignatureSplit()` already treats like a single owner.
- `dtDrawSignatureSplit()` now draws whatever `dtSplitSlots()` returns. Everything else about it
  is unchanged: erase first, then rule, then the name centred under it, shrink-to-fit then
  ellipsis. At fewer than two owners it still returns immediately and the page is byte-for-byte
  the s27 behaviour.
- The generator calls it four times instead of two, picking each document's variant from
  `sel.docusign` and relying on `keepAll.indexOf() === -1` for a document whose toggle is off.

Names are **centred** under their line, as Track B centred them in the statement's columns. The
brief allowed centred or left-aligned; centred keeps one code path and matches p9.

---

## Geometry, per page

All six pages are 612 × 792 with MediaBox `[0 0 612 792]`; only the statement carries the
`[-11.96 11.99 600.04 1019.99]` box, which is why `dtSplitAxes()` reads the box off the page
being drawn on. Template numbers below are **MuPDF page coordinates** (origin top-left, y down),
measured with PyMuPDF; drawn numbers are **PDF user space** (`y_user = 792 − y_mupdf`), read back
out of the produced files' content streams.

### Template, measured (`scratch/s29d/measure.py`, `ink.py`, `ink2.py`)

The band boundaries are **real ink**, found by rasterising the template at 432 dpi inside the
split's own x-range and reading dark pixel rows — not text-line boxes, which overstate a line's
extent by several points.

| Page | Template rule(s) | What is immediately below | Blank band above (ink to ink) |
|---|---|---|---|
| Release notary (idx 1) | x 313.2–522.84, y 388.83–389.33 | `(Grantor's Signature)` ink 394.33–405.17, then `Grantors Address` at 406.8 | 253.33 → 388.83 (135.5 pt) |
| Release plain (idx 2) | x 313.2–522.84, y 390.83–391.33 | the same caption; `2_2` widget prints the name ON the rule | 290.33 → 390.83 (100.5 pt) |
| Loss notary (idx 3) | x 279–527.4 at y 430.67–431.17 **and** 450.00–450.50 (widgets `1_3`/`2_3` over them, never filled) | nothing until the notary block, first ink y 481.0 | 398.17 → 430.67, and the whole band 398.17 → 481.0 (82.8 pt) |
| Loss plain (idx 4) | same first rule; second at 466.00–466.50 | nothing at all | 398.17 → open |
| Permission notary (idx 6) | x 72–306, y 390.50–391.00 (the `Date:` rule shares that y at x 386–540) | `Name:` label ink from 395.0, `Name_4` widget at 391.3, then Address:/Phone: | 336.50 → 390.50 (54.0 pt) |
| Permission plain (idx 7) | identical to the point | identical | identical |

### What is drawn

`ruleTop`/`nameBaseline` are the BOTTOM row; rows stack upward at `pitch`.

| Entry | left–right | bottom rule (MuPDF) | name baseline | rowPitch | bandTop | pitch at 3 owners |
|---|---|---|---|---|---|---|
| `releaseNotary` | 313.2–522.84 | 371.0–371.48 | 381.6 | 30 | 281.0 | 30 |
| `releasePlain` | 313.2–522.84 | 371.0–371.48 | 381.6 | 30 | 298.0 | 30 |
| `lossNotary` | 279.0–527.4 | 461.0–461.48 | 471.6 | 30 | 405.0 | 28 |
| `lossPlain` | 279.0–527.4 | 461.0–461.48 | 471.6 | 30 | 405.0 | 28 |
| `permissionNotary` | 72.0–306.0 | 377.0–377.6 | 387.2 | 30 | 341.0 | 18 |
| `permissionPlain` | 72.0–306.0 | 377.0–377.6 | 387.2 | 30 | 341.0 | 18 |
| `statement` (columns, unchanged) | 344.482–592.282 | 582.71–583.43 | 602.3 | — | — | — |

Erase rectangles (MuPDF, all white unless noted):

| Entry | rectangles |
|---|---|
| `releaseNotary` | 312.8–523.3 × 388.7–389.7 *(Track B's, unchanged)* |
| `releasePlain` | 312.8–523.3 × 390.7–391.7 *(unchanged)* |
| `lossNotary` | 278.6–527.8 × 430.3–431.7 and 277.9–527.8 × 449.5–451.0 |
| `lossPlain` | 278.6–527.8 × 430.3–431.7 and 277.9–527.8 × 465.5–467.0 |
| `permission*` | 71.6–306.4 × 390.3–391.2 |
| `statement` | unchanged (green, white, and the "Printed Name" patch) |

### Measured in the produced files (PDF user space)

| Page | 2 owners — rules | names | 3 owners — rules |
|---|---|---|---|
| Release (both variants) | x 313.20 w 209.64 h 0.48 at y **450.52, 420.52** | y 440.40, 410.40, 9 pt | 480.52, 450.52, 420.52 |
| Loss (both variants) | x 279.00 w 248.40 h 0.48 at y **360.52, 330.52** | y 350.40, 320.40, 9 pt | 386.52, 358.52, 330.52 |
| Permission (both variants) | x 72.00 w 234.00 h 0.60 at y **444.40, 414.40** | y 434.80, 404.80, 9 pt | 450.40, 432.40, 414.40 |
| Statement (columns) | x 332.52 / 465.42 w 114.90 h 0.72 at y 436.56 | y 417.69 | three columns, middle name 6.5 pt |

Each page keeps its own template's rule thickness — 0.48 on the Release and the Loss affidavit,
0.60 on the Permission of Use, 0.72 on the statement — which is also how the assertion suite
tells the pages apart (`RULE_H`).

**Nothing was drawn or erased right of x 306.41 on the Permission of Use**, so the `Date:` rule
that shares the signature rule's y is untouched; that is a pinned assertion, not an observation.

### The two decisions the geometry forced

**Why the rules move up instead of staying put (Release and Permission of Use).** On both, the
next thing under the template's rule is a caption the brief says to keep — `(Grantor's
Signature)` 3.5 pt below on the Release, `Name:` 4 pt below on the Permission — so there is no
room for a printed name at any legible size. Both erase the template rule and draw the stack in
the blank band above it, which is Track B's Release pattern. The Loss affidavit needed the same
treatment for a different reason: it has TWO blank uncaptioned rules, and leaving either one in
place would hang a full-width line among the printed names and invite a signature somewhere
nothing labels. Both are erased and the stack replaces the whole block.

**Why the pitch is squeezed rather than fixed.** Three rows at 30 pt need 70.6 pt of band. The
Release has 135 (notary) / 100 (plain) and keeps 30. The Loss affidavit has 82.8 and goes to 28.
**The Permission of Use has 54 and goes to 18** — see "what the director must verify", item 3.
At two owners, the realistic case, every page uses the full 30 pt.

---

## Verification — verbatim

Everything ran from the worktree root, `C:\Users\Martice\bw-quote-tool-s29b`. Nothing was
listening on 3737/3747/3767 when I started. `npm test` started and stopped its own server on
3737; the single-suite runs used a server **I** started on 3767 and stopped again (PID 37108,
`Stop-Process`, ports re-checked clear — see "hygiene" below).

### Baseline, measured on this worktree with `index.html` stashed back to `9e95f80d`

```
$ npm test
...
3912 passed, 0 failed across 51 suites
```

with `test-deed-transfer.mjs  226 passed, 0 failed`. The brief's expected baseline was correct.

### After

```
$ npm run check

> check
> node scripts/syntax-check.mjs

index.html: 8 blocks, 0 errors
```

```
$ npm test
...
   ok   test-deed-transfer.mjs        275 passed, 0 failed
...
3961 passed, 0 failed across 51 suites
```

**3912 → 3961 is +49, and test-deed-transfer 226 → 275 is +49. Nothing else moved.**

### What the +49 is

Rewritten in place (no net change in count, same sites re-aimed at rows instead of columns):
the Release assertions in sections 9, 10 and 12, and the sparse-fill release check in 14.
Added:

- §9 (2 owners, notary): the Release stack shape, its y positions, **the two names at different
  y — the explicit proof they are not columns** — the whole stack clearing the kept caption and
  the body text; the Loss affidavit's stack, its pitch, both template rules erased, the stack
  inside its band; the Permission of Use naming the heir and therefore **not** drawn on.
- §10 (2 owners, DocuSign): the same for the plain variants, including the plain Loss
  affidavit's second rule being erased 16 pt lower than the notary one.
- §11: the signer guard both ways round — with no affiant typed the Loss affidavit stacks; with
  a different affiant named nothing is drawn.
- §12 (3 owners): the Release stacking three rows at the full pitch, all three names at 9 pt.
- §13 (1 owner control): nothing drawn on the Loss affidavit or the Permission of Use either.
- §14 (sparse fill): the Loss affidavit stacks too.
- **§16 new** — the Permission of Use signed by the owners themselves (owner alive, heir affiant
  cleared), both variants: both names as signer, the stack, the erase, the band, the untouched
  `Date:` rule.
- **§17 new** — three co-owners on all three stacked documents at once, pinning each page's own
  squeezed pitch (30 / 28 / 18) and that no name ever has to shrink below 9 pt.
- **§18 new** — one owner, owner alive, loss and permission both on: nothing drawn anywhere.

Two helpers were added to the suite: `sigRows`/`nameRows` (the same rects read top-to-bottom
instead of left-to-right) and `stackOK`, which asserts the whole shape at once — N full-width
rules at one x, evenly pitched, each with its owner's name below it and above the next rule.
Row baselines are compared with a tolerance, never as strings: pdf-lib writes whatever the float
arithmetic produced, and 480.52 can reach the stream as `480.52000000000004`.

### Sabotage proof — two different breaks, both against the final tree

**Break 1 — the Permission of Use erase rectangle moved 100 pt off its rule** (`top: 390.3` →
`290.3`, both variants). This would ship a page carrying the template's original signature rule
*and* the stack above it. The syntax gate is blind to it:

```
$ npm run check
index.html: 8 blocks, 0 errors

$ BW_BASE=http://localhost:3767/ node tests/test-deed-transfer.mjs
  FAIL  notary: the template's own signer rule was whited out at its own y (user space 400.8) and the stack drawn above it, because "Name:" starts immediately under it
  FAIL  DocuSign: the template's own signer rule was whited out at its own y (user space 400.8) and the stack drawn above it, because "Name:" starts immediately under it
273 passed, 2 failed
```

**Break 2 — the heir-signer guard removed** (`var permOwners = dtSplitSigners(...)` →
`var permOwners = owners`), i.e. two dead owners' names printed under lines an heir signs:

```
$ npm run check
index.html: 8 blocks, 0 errors

$ BW_BASE=http://localhost:3767/ node tests/test-deed-transfer.mjs
  FAIL  so nothing is drawn on it — one signer, the template's own single line
  FAIL  the plain Permission of Use is not stacked either — the heir signs it in this case too
273 passed, 2 failed
```

Restored from a pristine copy after each, and re-verified:

```
$ npm run check
index.html: 8 blocks, 0 errors
$ BW_BASE=http://localhost:3767/ node tests/test-deed-transfer.mjs
275 passed, 0 failed
```

### Rendered and looked at

`scratch/s29-d-renders/` (gitignored) holds the artefacts. Five cases were generated through the
real generator, every page rasterised with PyMuPDF at 150 dpi, and the three signature blocks
cropped at 300 dpi and **looked at**:

| File | What it is |
|---|---|
| `2co-notary.pdf` | 2 co-owners, in person, lost + permission, owner ALIVE — 6 pages |
| `2co-docusign.pdf` | the same, DocuSign — 6 pages |
| `3co-notary.pdf` | 3 co-owners, in person, lost + permission, owner alive — 6 pages |
| `2co-heir.pdf` | 2 co-owners, owner DECEASED, heir affiant — 7 pages |
| `1co-notary.pdf` | 1 owner, the control — 6 pages |
| `<case>-p00..p06.png` | every page of every case, 150 dpi |
| `<case>-release-block.png`, `-loss-block.png`, `-perm-block.png` | the signature blocks, 300 dpi |
| `2co-heir-permission-page-block.png` | the heir case's real Permission page (its `-perm-block` crop lands on the Heirs page, which the extra page shifts into that slot) |

What they show:

- **Release** — two (or three) full-width rules stacked 30 pt apart, a name centred under each,
  then the kept `(Grantor's Signature)` caption, then the shared address and the primary phone.
  The template's own rule is gone; there is no orphan line.
- **Loss affidavit** — two (or three) rules in the band between the body paragraph and the
  notary block, names under each, both of the template's blank rules gone.
- **Permission of Use** — the stack sits above the kept `Name:` / `Address:` / `Phone:` block,
  the `Date:` rule to its right untouched, and `Name_4` still carries the joined names because
  that row is the form's own captioned printed-name line.
- **`2co-heir`** — the Permission page is the untouched template with a single line and the
  heir named. The Release and the Loss affidavit still stack, correctly: the owners sign those.
- **`1co-notary`** — nothing drawn on any page.

**One thing looking caught that counting would not.** The first cut left a **grey-239 hairline**
across the Loss affidavit at y 450.56, a ~6 % residue of the erased second template rule: the
erase cleared the rule geometrically but not the rule's antialiasing at the 300 dpi pixel grid.
Every assertion was green, and a pixel scan of the crops is what found it. The loss erases were
widened (0.2 pt margins → 0.5 pt) and the scan re-run clean. The Release, Permission and
statement erases showed no residue and were left exactly as Track B measured them.

### What was NOT verified

- **Adobe Acrobat.** The RIC's bytes are untouched, so `CLAUDE.md`'s Acrobat gate does not
  apply. This packet has not been opened in Acrobat — see "what the director must verify".
- **The generator baseline** (`scripts/baseline-capture.mjs`) was not re-run. Its 14 scenarios do
  not include the Deed Transfer generator and none of them calls any `dt*` function, so their
  bytes cannot have moved; every hunk in this diff is inside the `dt*` region.

---

## Branch, commit, files

```
06995900  [s29/dt-joint] Deed transfer: a separate stacked signature line for each co-owner
9e95f80d  [s29/dt-joint] Deed transfer: one packet for several co-owners, both names,
          split signature lines           (Track B, unchanged)

          index.html                   | 206 ++++++++++++++++++++++++------
          tests/test-deed-transfer.mjs | 298 +++++++++++++++++++++++++++++++++++++------
          2 files changed, 424 insertions(+), 80 deletions(-)
```

Staged by explicit path, no bulk add, no AI trailer of any kind (`git log -1 --format=%b | grep
-iE "co-authored|generated with|claude"` returns nothing). Not pushed. `ops/sprints/sprint-29/`
— including this report — is left **uncommitted**: ops bookkeeping is the director's, under
`[s29/ops]`.

Every `index.html` hunk is inside the lane, lines 21917–22157:

```
@@ -21917..21927   the DT_SPLITS header comment (the three rulings, in order)
@@ -21929..21960   layout/rowPitch/bandTop on the statement and both Release entries
@@ -21960..22048   the four new entries: lossNotary, lossPlain, permissionNotary, permissionPlain
@@ -21969..22048   dtSplitSlots(), dtSplitSigners()
@@ -21984..22117   dtDrawSignatureSplit() draws whatever dtSplitSlots() returns
@@ -22023..22157   the generator: four calls, the two signer guards
```

The only identifiers introduced are `dtSplitSlots` and `dtSplitSigners`, both `dt*`.

---

## Decisions & open questions

1. **Names are centred under their full-width line**, not left-aligned. The brief allowed
   either; centred keeps one code path with the statement's columns and reads as the same
   family of block. One line in `dtDrawSignatureSplit()` changes it if the operator prefers
   left.
2. **The Loss affidavit gets the same "is the signer somebody else?" guard as the Permission of
   Use**, which the brief specified only for the Permission. `dtFillForm()` gives the Loss
   affidavit the identical `_dtVal('dtAffiantName') || grantor` default, so without the guard a
   packet with a named affiant would have printed a line and a name for each co-owner under an
   affidavit that one other person swears. Pinned by an assertion that fails in both
   directions.
3. **Both of the Loss affidavit's blank template rules are erased**, not just the one the stack
   replaces. Leaving the second would hang an uncaptioned full-width line among the printed
   names. Consequence worth knowing: at one owner that page is untouched and still offers the
   template's two blank rules, and at two or more it offers exactly N.
4. **The Loss affidavit's geometry is held identical between the notary and plain variants**
   even though the plain one has no notary block below and could go lower. Two copies of the
   same document that sit at different heights would look like two different forms.
5. **`Name_4` / `Name_5` on the Permission of Use keep the joined names.** That row is the
   form's own printed-name line, captioned `Name:` by the template — not a name typed on the
   signature rule the way `2_2` and `Current Name Print` are, and those two are still emptied at
   two or more owners exactly as Track B left them.
6. **The statement's drawn output is byte-identical to Track B's.** The columns arithmetic moved
   into `dtSplitSlots()` unchanged, and §9/§10/§12's statement assertions (rule x/w/y, the green
   and white restores, the "Printed Name" patch, the 6.5 pt middle name at three owners) are
   untouched and green.
7. **The `rowPitch` of 30 pt is a judgement, not a measurement.** It gives ~19 pt of clear
   height to sign in, which is the pitch this template itself uses between the Loss affidavit's
   two blank rules (19.32 pt). Raising it would push the Release's three-row stack further up an
   empty page and squeeze the other two.

**Open questions:**

1. **`DESIGN.md` §5 is stale** — it pins `3888 … worktree reads 3886`. Measured truth in this
   worktree: `3912` before this track, `3961` after. Whoever merges updates §5,
   `DIRECTOR_GUIDELINES.md` Phase 0 and `SPRINT_GUIDELINES.md` rule 4 in the `[s29/ops]` commit.
   Track B raised this too; it is still open.
2. **Track B's open questions 2 and 3 still stand** (the "seven stray widgets" comment inside
   `dtBuildOnePacket`, and the `dt` lane's absence from `BW_LINK_FIELDS`). Neither was touched.
3. **Three co-owners on the Permission of Use is the tight case** — item 3 below.

**Hygiene.** No production Firebase call was made from any script in this track: every
Playwright script here (`tests/test-deed-transfer.mjs` and `scratch/s29d/probe.mjs`) aborts
`/gstatic\.com\/firebasejs/` and signs in against `tests/fake-firebase.js`. No save or persist
function was called. The only process I started was a dev server on 3767; it was stopped by PID
and 3737/3747/3767 were re-checked clear. No process I did not start was touched.

---

## What the director must verify by hand

1. **The stacked blocks, by eye, and rule on the shape.** The crops are
   `2co-notary-release-block.png`, `2co-notary-loss-block.png`, `2co-notary-perm-block.png` and
   their `2co-docusign-` twins. The question for the operator is whether this is what he meant
   by "separate lines so they don't have to sign so small" — full-width line, printed name
   under it, 30 pt apart.
2. **Open one two-co-owner packet in a real PDF viewer, ideally Acrobat.**
   `scratch/s29-d-renders/2co-notary.pdf` and `2co-docusign.pdf`. Three more pages now carry
   drawn content than did at Track B. Look for: 6 pages, every field still selectable, no "this
   form has errors" banner, all stacks rendering. *(Prudence, not the RIC gate — the RIC's bytes
   are untouched.)*
3. **Three co-owners on the Permission of Use — the one place that crowds.**
   `3co-notary-perm-block.png`. That form's blank band is 54 pt, so three rows land 18 pt apart
   and each signer has ~7.8 pt of clear height above his line. It is legible and every name is
   still 9 pt, but it is the tightest thing in the packet. If the operator does not like it, the
   choices are: cap the co-owner list at two for that document, drop the printed names on that
   page only, or accept it. The Release (30 pt) and the Loss affidavit (28 pt) are comfortable
   at three.
4. **The heir case.** `2co-heir-permission-page-block.png`: when the owner has died, the
   Permission of Use is the untouched template with the heir named on its single line, while the
   Release and the Loss affidavit still stack for the owners. Confirm that is the intended
   division.
5. **The stale counts in `DESIGN.md` §5** — open question 1.
