# TRACK F REPORT — s29/dt-sign-room: room to sign, living owners sign, deceased co-owners on the Affidavit of Heirs

Worktree `C:\Users\Martice\bw-quote-tool-s29d`, branch `s29/dt-sign-room`, **one commit
`12cafff7` on top of main `5f9ffc09`** (the merge of Track E), **not pushed**. Deed Transfer
lane only; every `index.html` hunk is inside `#section-dt-transfer` or the `dt*` function
region. `C:\Users\Martice\bw-quote-tool` was never touched.

Read first, in order: `TRACK-F.md`, `TRACK-D.md`, `TRACK-D-REPORT.md`, `TRACK-E-REPORT.md`,
`ops/SPRINT_GUIDELINES.md`, `ops/DESIGN.md`, the worktree's `CLAUDE.md`.

---

## What shipped

### Part 1 — room to sign

The operator's two complaints, verbatim: on the Release, *"there are three lines on this one
for some reason and still not enough room for each person to sign"*; on the Affidavit for Loss,
*"Not enough room for each signature here."* Track D's fixed 30 pt stack with a 9 pt name
10.6 pt under the rule leaves **~20 pt** to write in. That is the number this track moves.

**The Release keeps its stack, at an adaptive pitch.** The Grantor's block is a 209.64 pt
column with a tall blank band above it; splitting that column in two would give 98 pt a signer,
so stacking is right and the pitch is what was wrong.

```
pitch = min(48, floor((ruleTop − bandTop) / n))
```

Dividing by **n**, not n−1, is the whole point: it reserves a full pitch of blank above the
TOPMOST row as well, and the top signer has no row above him to borrow from. The bottom row
also moved 11 pt lower (382.0 instead of Track D's 371.0) and the printed name is **7.5 pt on a
baseline 8 pt under its rule**, whose descender still lands 2.7 pt clear of the kept
`(Grantor's Signature)` caption. Those 11 pt buy the same again in pitch.

**"Three lines."** The third is the template's own blank rule at y 433.04, below the caption,
on the plain variant only. It is his form and it stays, per the brief. What the operator was
also seeing — and what is now gone — is checked below under *hairlines* and *widgets*.

**The Affidavit for Loss and the Permission of Use go side by side.** On both, the blank band
above the rule is one signer's worth, so a stack there gives each of two people **less** room
than one had, not more:

| Page | band above the rule | best equal pitch for 2 stacked signers |
|---|---|---|
| Affidavit for Loss | 51.3 pt (body ink 409.67 → rule 461) | 24 pt — worse than Track D's 30 |
| Permission of Use | 53.8 pt (body ink 336.67 → rule 390.5) | 24 pt — worse than Track D's 30 |

But the width of the page beside those rules is empty. So both pages now put the signers on
**one line, side by side**, each column with the whole band above it to sign in.

**The statement (p9) is untouched** — the operator named those halves himself, and its drawn
output is byte-identical to Track D's.

### Part 2 — living owners sign

Every owner row — the primary included — gained a **Deceased** tick (`dtOwner<n>Deceased`) and a
**Date of death** (`dtOwner<n>Dod`). Ticking any of them turns the existing situation toggle
"The current property owner is deceased" on; clearing the last one turns it off. Nobody flagged
with the toggle ticked by hand is still a valid state and behaves exactly as it did before this
track.

`dtSigners()` is the living owners in deed order, and **every** signature block — Release, Loss,
Permission, statement — is drawn for them. Name boxes keep `dtOwnerNames()`, all owners joined,
because that is how the deed reads. Two owners one of whom has died is therefore **one signer**:
nothing drawn, nothing erased, no widget removed, and `2_2` / `Current Name Print` carry the
joined names again, because there is no drawn block over them any more. Zero living owners
draws nothing at all.

### Part 3 — Affidavit of Heirs

Asked how a packet should handle two owners who have both died, the operator ruled **"One
affidavit naming both"**. So the decedent line joins the deceased owners' names with `" & "` and
the date-of-death line joins their dates **in the same order**. A typed `dtDecedentName` /
`dtDateOfDeath` still overrides; nobody flagged falls back to the primary owner alone.

A **"List current owners as heirs"** button in the heirs panel fills the next empty heir rows
with each **living** owner — name, and that owner's own address if they typed one, else the
shared address. Relationship and age are left empty on purpose (decision 5). It never repeats a
name already in a row and stops at the form's five.

**No template text, label or help text changed anywhere in this track.** Two code comments that
Track D wrote and this track made untrue were corrected; that is all.

---

## Geometry, per page

Measured with PyMuPDF off `pdf-templates/Deed Transfer Fillable Forms 2026.pdf`
(`scratch/s29f/measure.py`, `txt.py`, `ink.py`): rules from `get_drawings()`, band floors as
**real ink** from a 432 dpi raster taken inside each block's own x-range. Template numbers are
MuPDF page coordinates (origin top-left, y down); "drawn" numbers are PDF user space
(`y_user = 792 − y_mupdf`), read back out of the produced files.

### The template, measured

| Page | signature rule(s), ink | first ink above | first ink below |
|---|---|---|---|
| Release notary (idx 1) | x 313.2–522.84, y 388.83–389.50 | body para 253.50 | `(Grantor's Signature)` 394.33–405.33 |
| Release plain (idx 2) | x 313.2–522.84, y 390.83–391.50 | body para 290.50 | the same caption, same y |
| Loss notary (idx 3) | x 279–527.4 at 430.67–431.33 **and** 450.00–450.67 | body para 409.67 | notary block 481.00 |
| Loss plain (idx 4) | first rule identical; second at 466.00–466.67 | body para 409.67 | nothing |
| Permission notary (idx 6) | x 72–306, y 390.50–391.17 | body para 336.67 | `Name:` row 395.00–403.17 |
| Permission plain (idx 7) | identical to the point | identical | identical |

Two facts that shaped the answer and are not in the brief:

- **The Permission of Use's `Date:` rule shares the signature rule's y** (x 386–540) and its
  `Date:` label's ink starts at **x 360**. Full-page-width columns there would run a signature
  line straight through the printed date.
- **This page set's own text margins are x 83.88 and x 527.40** (the widest rule on the Loss
  page; the body text runs 90 → 515.64). Two columns inside those margins are 214.76 pt each,
  not the ~250 pt the brief expected — see decision 1.

### What is drawn

| Entry | layout | span | rule y (MuPDF) | name baseline / size | band floor | 2 signers | 3 signers |
|---|---|---|---|---|---|---|---|
| `releaseNotary` | stack | 313.2–522.84 | 382.0–382.48 | 390.0 / 7.5 pt | 260.0 | pitch **48** | pitch 40 |
| `releasePlain` | stack | 313.2–522.84 | 382.0–382.48 | 390.0 / 7.5 pt | 297.0 | pitch **42** | pitch 28 |
| `lossNotary` | columns, gap 14 | 83.88–527.4 | 461.0–461.48 | 470.0 / 9 pt | — | 214.76 pt each | 140.84 / 133.84 / 140.84 |
| `lossPlain` | columns, gap 14 | 83.88–527.4 | 461.0–461.48 | 470.0 / 9 pt | — | 214.76 pt each | as above |
| `permissionNotary` | columns, gap 14, no names | 72.0–348.0 | 390.5–391.1 | — | — | 131.0 pt each | 85 / 78 / 85 |
| `permissionPlain` | columns, gap 14, no names | 72.0–348.0 | 390.5–391.1 | — | — | 131.0 pt each | as above |
| `statement` | columns, gap 18 | 344.482–592.282 | 582.71–583.43 | 602.3 / 9 pt | — | **unchanged from Track D** | unchanged |

Erase rectangles (MuPDF, all white), every one now **0.5–0.6 pt proud of the rule's ink on each
side** — Track B's release erases left only 0.15 pt, and a rule erased that tightly leaves an
antialiased hairline:

| Entry | rectangles |
|---|---|
| `releaseNotary` | 312.5–523.5 × 388.3–390.0 |
| `releasePlain` | 312.5–523.5 × 390.3–392.0 |
| `lossNotary` | 277.5–528.0 × 430.0–432.0 and 277.5–528.0 × 449.4–451.3 |
| `lossPlain` | 277.5–528.0 × 430.0–432.0 and 277.5–528.0 × 465.4–467.3 |
| `permission*` | 71.5–306.5 × 390.0–391.7 |
| `statement` | unchanged |

Fields removed from the form at two or more signers (`drop`): `2_2` on the plain Release,
`1_3`/`2_3` on the notary Loss affidavit, `1_4`/`2_4` on the plain one. See decision 2.

### Measured in the produced files (PDF user space)

| Page | 2 signers | 3 signers |
|---|---|---|
| Release notary | rules x 313.20 w 209.64 h 0.48 at y **457.52, 409.52**; names 7.5 pt at y 450, 402 | 489.52 / 449.52 / 409.52 |
| Release plain | the same rules at y **451.52, 409.52**; names at 444, 402 | 489.52 / 449.52 / 409.52 (pitch 28: 465.52/437.52/409.52) |
| Loss (both) | rules h 0.48 at y **330.52**, x 83.88 w 214.76 and x 312.64 w 214.76; names 9 pt at y 322 | x 83.88 w 140.84 / x 238.72 w 133.84 / x 386.56 w 140.84 |
| Permission (both) | rules h 0.60 at y **400.90**, x 72 w 131 and x 217 w 131; no names drawn | x 72 w 85 / x 171 w 78 / x 263 w 85 |
| Statement | x 332.52 / 465.42 w 114.90 h 0.72 at y 436.56 — Track D's numbers | three columns, middle name 6.5 pt |

**Clear signing height, before and after** (the number the operator's complaint is about):

| Page | Track D, 2 signers | Track F, 2 signers |
|---|---|---|
| Release notary | ~20 pt | **~38 pt** |
| Release plain | ~20 pt | **~32 pt** |
| Affidavit for Loss | ~20 pt | **51.3 pt** each (whole band, side by side) |
| Permission of Use | ~20 pt | **53.8 pt** each (whole band, side by side) |

Nothing is drawn or erased right of **x 348** on the Permission of Use, so the `Date:` rule and
label are untouched — a pinned assertion, not an observation.

---

## Verification — verbatim

Everything ran from the worktree root, `C:\Users\Martice\bw-quote-tool-s29d`. Nothing was
listening on 3737 / 3747 / 3767 when I started (checked). `npm test` starts and stops its own
server on 3737; every single-suite and sabotage run used a server **I** started on 3767 and
stopped again (PID 36300, `Stop-Process`, ports re-checked clear — see "hygiene").

### Baseline, measured on THIS worktree at `5f9ffc09` before any edit

```
$ npm test
...
4003 passed, 0 failed across 51 suites
```

The brief's expected `test-deed-transfer` baseline of 317 is confirmed by
`TRACK-E-REPORT.md` and by the arithmetic below (382 − 65 = 317, and no other suite moved).

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
   ok   test-deed-transfer.mjs        382 passed, 0 failed
...
4068 passed, 0 failed across 51 suites
```

**4003 → 4068 is +65, and test-deed-transfer 317 → 382 is +65. Nothing else moved.**
`test-price-vintage.mjs` reported its usual `diagnostic (no assertions, exit 0)`, the only suite
allowed to. No suite reported zero assertions.

### What the +65 is

Re-aimed in place at the new geometry (12 sites in §9, §10, §11, §12, §14, §16, §17 — no net
change in count for the ones that stayed one assertion), plus:

- **§9** — the Release pitch as an explicit `>= 40` ("THE OPERATOR'S COMPLAINT, pinned"), the
  7.5 pt names, the widened erase by width AND height; the Loss affidavit re-expressed as
  columns (span, per-column width `> 210`, both names on ONE baseline in owner order, both
  template rules erased, the line at the bottom of its band), and `1_3`/`2_3` **absent** from
  the form.
- **§10** — the same for the plain variants, `2_2` **removed from the form** rather than merely
  emptied, the plain Release's own 42 pt pitch (and its own `>= 40`), `1_4`/`2_4` absent.
- **§12 / §17** — three signers: the 40 pt Release pitch, the divide-by-n clearance above the
  top row, the three Loss columns and the three Permission columns, and that no name had to
  shrink.
- **§16** — the Permission of Use as columns on the rule's own y, both columns on ONE y, no
  drawn name, the erase, and the `Date:` rule untouched right of x 348.
- **§22 new** — the other half of the widget removal: at ONE signer `1_3`/`2_3`, `1_4`/`2_4` and
  `2_2` are all still in the form and nothing is drawn or erased. Without this, §9/§10's
  "gone from the form" would pass just as happily on a generator that always strips.
- **§23 new** — living owners sign: ticking a box turns the situation toggle on; `dtSigners()` /
  `dtDeceasedOwners()`; the name boxes still read both; nothing drawn on any of the four pages
  at one living signer and no widget removed; the Heirs decedent and date come off the dead
  owner's own row; **both** dead gives one affidavit naming both with both dates joined in
  order and still nothing drawn; a typed override wins; clearing the last box clears the toggle
  and both owners get their lines back; nobody flagged with the toggle ticked by hand falls back
  to the primary.
- **§24 new** — "List current owners as heirs": living owners only, in deed order, own address
  where typed and the shared one where not, relationship and age left empty, rows revealed,
  pressing it twice adds nobody twice, and with all five rows taken it adds and overwrites
  nobody.
- **§25 new** — save / restore of the flags and dates (both in `coOwners` and in
  `state.fields`), the remove-row compaction carrying a flag up and clearing the toggle behind
  it, and a record saved before this track restoring with **nobody** deceased.

Two helpers were added to the suite: `colsOK` (N rules on one y sharing left..right with an even
gutter) and `pitchOf`. `fillLane()` gained a `dead: [rowNumbers]` option, and the fixture a
second invented date of death.

### Sabotage proof — two different breaks, both against the final tree

**Break 1 — the adaptive pitch back to a fixed 30** (`dtSplitSlots`'s `pitch = Math.min(...)`
→ `pitch = 30`). This ships exactly the geometry the operator complained about. The syntax gate
is blind to it:

```
$ npm run check
index.html: 8 blocks, 0 errors

$ BW_BASE=http://localhost:3767/ node tests/test-deed-transfer.mjs
  FAIL  the two Release lines are STACKED, not side by side: same x, and 48pt apart in y — ...
  FAIL  THE OPERATOR'S COMPLAINT, pinned: two Release signers are at least 40pt apart — ...
  FAIL  the two drawn names sit at DIFFERENT y — the proof they are not columns — ...
  FAIL  the plain Release stack shares the notary one's BOTTOM row (y 409.52) but pitches 42pt ...
  FAIL  and it is still at least 40pt — the operator's complaint was made against THIS variant ...
  FAIL  the three Release lines are at y 489.52 / 449.52 / 409.52 — a 40pt pitch ...
  FAIL  even at THREE signers the rows are 40pt apart — the adaptive pitch divides the band by n ...
  FAIL  the Release stacks three full-width rows 40pt apart
374 passed, 8 failed
```

**Break 2 — draw for every owner, dead ones included** (`var signers = dtSigners();` →
`dtCoOwners()` in the generator), i.e. a signature line and a printed name for a person who has
died:

```
$ npm run check
index.html: 8 blocks, 0 errors

$ BW_BASE=http://localhost:3767/ node tests/test-deed-transfer.mjs
  FAIL  NOTHING is drawn on the Release — one living signer signs the template's own line
  FAIL  nothing on the Affidavit for Loss, nothing on the Permission of Use, nothing on the statement either
  FAIL  and no widget was removed — the Loss affidavit still carries '1_3' and '2_3'
  FAIL  BOTH dead: zero living signers, so nothing is drawn on the Release, the Loss affidavit, the Permission of Use or the statement
378 passed, 4 failed
```

Restored from a pristine copy after each (md5 verified equal to the committed tree,
`8b4c465a4d4efda554e108eb10a87a74`) and re-verified:

```
$ npm run check
index.html: 8 blocks, 0 errors
$ BW_BASE=http://localhost:3767/ node tests/test-deed-transfer.mjs
382 passed, 0 failed
```

### Rendered and looked at

`scratch/s29-f-renders/` (gitignored). Four cases generated through the real generator, every
page rasterised at 150 dpi, every drawn block cropped at 300 dpi, and **looked at**:

| File | What it is |
|---|---|
| `2sign-notary.pdf` | 2 owners both living, in person, lost + permission — 6 pages |
| `2sign-docusign.pdf` | the same, DocuSign |
| `3sign-notary.pdf` | 3 owners all living, in person |
| `1dead-of-2.pdf` | 2 owners, the PRIMARY deceased with a date, heir affiant, 2 heirs — 7 pages |
| `<case>-p00..-<tag>.png` | every page, 150 dpi |
| `<case>-<tag>-block300.png` | the Release / Loss / Permission blocks, 300 dpi |
| `owner-panel-deceased.png`, `owner-panel-three-rows.png`, `heirs-panel-owners-listed.png` | the form |

What they show:

- **Release (plain, the page in the operator's screenshot)** — two clean lines 42 pt apart, a
  name under each, then the kept `(Grantor's Signature)` caption. **The template's own rule is
  gone with no hairline.** The third line the operator counted is the template's own blank rule
  further down, left alone.
- **Affidavit for Loss** — two 214.76 pt lines side by side with the names under them, 51 pt of
  clear white above, both template rules gone, and the notary block untouched below. At three
  signers the same line splits three ways and still reads.
- **Permission of Use** — two lines side by side under a completely empty band, the `Date:`
  label and rule untouched to their right, the `Name:` / `Address:` / `Phone:` block below
  unchanged with both names joined in the Name row.
- **`1dead-of-2`** — the Release, the Loss affidavit and the Permission of Use are the pristine
  template: one line each, nothing drawn, nothing erased, the address and phone rows intact.
  The Affidavit of Heirs names the dead owner and his date of death; the statement prints both
  names in `Current Name Print`.
- **The form** — the Deceased tick and Date of death sit on every owner row, aligned with the
  rest of the row, appearing and disappearing with "Add co-owner" / "Remove" like the address
  block Track E added. `List current owners as heirs` filled one row for the living co-owner
  and none for the dead one, with her own Tukwila address.

**Two things looking caught that counting would not.**

1. The `Deceased` tick was **5.5 px taller than every input beside it**, so its caption sat
   above the rest of the row's captions. Every assertion was green. Measured
   (`scratch/s29f/measure-ui.mjs`: input 31 px, tick block 36.5 px) and pinned to 31 px.
2. `List current owners as heirs` carried a `margin-left:8px` that does nothing when the button
   is a stretched flex child — it just made the new button 8 px narrower than "+ Add another
   heir" and visibly misaligned under it. Removed. `+ Add another heir` is untouched, full
   width as it has always been.

### The hairline scan — the scar Track D left, checked directly

Track D's own report records a grey-239 hairline that survived a geometrically-correct erase and
that **every assertion was green through**. So each erased rule is checked as pixels:
`scratch/s29f/hairline.py` rasterises, at **600 dpi greyscale**, a strip of page containing only
the template rule this track claims to have erased, and reads the darkest pixel in it.

```
1dead-of-2.pdf     releaseNotary  erases=0  template grantor rule, left of the names   darkest=  0  INK
1dead-of-2.pdf     lossNotary     erases=0  template rule 1, full width                darkest=  0  INK
1dead-of-2.pdf     lossNotary     erases=0  template rule 2, full width                darkest=  0  INK
2sign-notary.pdf   releaseNotary  erases=1  template grantor rule, left of the names   darkest=255  CLEAN
2sign-notary.pdf   lossNotary     erases=2  template rule 1, full width                darkest=255  CLEAN
2sign-notary.pdf   lossNotary     erases=2  template rule 2, full width                darkest=255  CLEAN
2sign-notary.pdf   permNotary     erases=1  signer rule, gutter 1 of 2 columns         darkest=255  CLEAN
2sign-docusign.pdf releasePlain   erases=1  template grantor rule, left of the names   darkest=255  CLEAN
2sign-docusign.pdf lossPlain      erases=2  template rule 1, full width                darkest=255  CLEAN
2sign-docusign.pdf lossPlain      erases=2  template rule 2, clear of both names       darkest=255  CLEAN
2sign-docusign.pdf lossPlain      erases=2  template rule 2, right of both names       darkest=255  CLEAN
2sign-docusign.pdf permPlain      erases=1  signer rule, gutter 1 of 2 columns         darkest=255  CLEAN
3sign-notary.pdf   releaseNotary  erases=1  template grantor rule, left of the names   darkest=255  CLEAN
3sign-notary.pdf   lossNotary     erases=2  template rule 1, full width                darkest=255  CLEAN
3sign-notary.pdf   lossNotary     erases=2  template rule 2, full width                darkest=255  CLEAN
3sign-notary.pdf   permNotary     erases=1  signer rule, gutter 1 of 3 columns         darkest=255  CLEAN
3sign-notary.pdf   permNotary     erases=1  signer rule, gutter 2 of 3 columns         darkest=255  CLEAN
```

Every band this track erases is **pure white at 600 dpi**. The three `INK` rows are the
**control**: `1dead-of-2` has one living signer, so `erases=0` — nothing is erased and the
template's own rules are correctly still on the page. `erases` is counted off the page's own
white rectangles, so a run where the erases silently stopped happening would show `erases=0`
beside a two-signer file rather than quietly reporting clean.

**The scar this track adds, and it is a counting-vs-looking one.** My first version of this
scanner filtered out "everything this track drew" by asking `get_drawings()` for thin black
rules and skipping those x-ranges — and **an erased rule is still a black path in the content
stream**, covered by a white rectangle painted after it. So the filter excluded the very rule
under test, and the scan reported `CLEAN` for bands it had never actually looked at (`where=-`,
i.e. zero pixels sampled). It also reported `INK STILL THERE` for the Release and the Loss
affidavit in cases where the only ink present was the printed name this track draws. Both
readings were wrong in opposite directions and both looked plausible. The rewrite above filters
nothing: each strip is chosen by hand to contain the erased rule and nothing else, and the
Permission of Use's gutters — the only part of its rule not covered by a drawn column — are
computed from the columns actually on that page rather than hardcoded, which is why the 3-column
case now scans two gutters instead of one wrong one.

### What was NOT verified

- **Adobe Acrobat.** Not run. The RIC's bytes are untouched, so `CLAUDE.md`'s Acrobat gate does
  not apply. But **this is the first Deed Transfer change that removes fields from the AcroForm
  at generation time**, and the operator's own complaint came out of Acrobat — so opening one
  two-signer packet in Acrobat is item 2 below.
- **The generator baseline** (`scripts/baseline-capture.mjs`) was not re-run, for the same
  reason Tracks D and E recorded: its 14 scenarios do not include the Deed Transfer generator
  and none of them calls any `dt*` function. Every non-`dt*` change in this diff is one CSS rule
  scoped to `#section-dt-transfer .dt-dead` and markup inside `#section-dt-transfer`, which no
  captured scenario reads. There is also no recorded `signatures.json` in this worktree, so a
  meaningful diff would have meant two full captures; the 51-suite run is the evidence offered
  instead, and it moved by exactly the +65 this track added.

---

## Branch, commit, files

```
12cafff7  [s29/dt-sign-room] Deed transfer: room to sign, and only living owners sign
5f9ffc09  Merge s29/dt-co-address: collect a co-owner's own address   (main, unchanged)

          index.html                   | 401 +++++++++++++++++++++----------
          tests/test-deed-transfer.mjs | 544 +++++++++++++++++++++++++++++++++++--------
          2 files changed, 726 insertions(+), 219 deletions(-)
```

Staged by explicit path (`git add index.html tests/test-deed-transfer.mjs`), no bulk add, no AI
trailer of any kind (`git log -1 --format=%B | grep -iE "co-authored|generated with|claude"`
returns nothing). **Not pushed.** `ops/sprints/sprint-29/` — including this report and
`TRACK-F.md` — is left **uncommitted**: ops bookkeeping is the director's, under `[s29/ops]`.

`index.html` hunks, all inside the lane:

```
@@ 3457      #section-dt-transfer .dt-dead — two CSS rules, section-scoped
@@ 3524-3553 the three owner rows gain a Deceased tick and a Date of death
@@ 3666      the heirs panel gains the owners-as-heirs button
@@ 21408-21431  _dtOwnerRecord(prefix, n) reads the row's flag and date
@@ 21438-21457  dtCoOwners() passes each row's number
@@ 21454-21472  dtSigners(), dtDeceasedOwners(), dtOwnerDeceasedChanged(), _dtOwnerAddress()
@@ 21557-21598  dtHeirsFromOwners()
@@ 21588-21680  dtBlankCoOwnerRow() / dtRemoveCoOwnerRow() carry the flag and the date
@@ 21686-21944  dtFillForm(): signers, the joined decedent and dates, the two widget guards
@@ 21960-22222  the DT_SPLITS header comment and all seven entries
@@ 22091-22261  dtSplitSlots(): adaptive pitch, per-entry gutter
@@ 22145-22295  dtDrawSignatureSplit(): per-entry size, names:false, the widget drop
@@ 22172-22341  the generator draws for the SIGNERS
```

Identifiers introduced: `dtSigners`, `dtDeceasedOwners`, `dtOwnerDeceasedChanged`,
`_dtOwnerAddress`, `dtHeirsFromOwners` — all `dt`-lane.

---

## Decisions & open questions

1. **The brief's "each column is ~250 pt … ≥ 240 pt wide" is arithmetically impossible inside
   this page set's own margins, and I did not go outside them.** The Loss page's text width,
   measured, is x 83.88 → 527.40 = 443.52 pt; two columns with the specified 14 pt gutter are
   **214.76 pt** each. Reaching 240 would need a 494 pt span — x 54 → 548 — which overhangs
   every other rule and every line of body text on the page by ~30 pt on each side. I judged a
   3-inch signature line inside the form's own margins better than a 3.4-inch one sticking out
   of them, and the assertion is written to the measured truth (`> 210`) with this note attached.
   One number in `DT_SPLITS` changes it if the operator disagrees.

2. **The widgets removed are the ones that actually sit on the erased rules, not the ones the
   brief names.** The brief says to remove "the Loss affiant widgets `NAME NUMERO1/2` and the
   address widget beside them". Those three are at **y 200–217** — the affidavit's own "That I,
   ______ reside at ______" line, at the top of the page — and they are **filled** with the
   affiant's name and address. Removing them would blank the affidavit's own recital. The
   widgets that sit on the signature rules, are never filled, and therefore show in Acrobat as
   empty highlight boxes over the new line, are `1_3`/`2_3` (notary) and `1_4`/`2_4` (plain).
   Those are what `drop` removes, along with the `2_2` the brief names correctly. Pinned in both
   directions: absent at 2 signers (§9, §10), present at 1 (§22).

3. **The Permission of Use's columns stop at x 348, and nothing is printed under them.** Its
   signature rule shares its y with the **`Date:` rule at x 386–540**, whose label's ink starts
   at x 360 — so "the full page width beside it" is not empty on this one page, and full-width
   columns there would run a signature line through the printed date. The columns therefore run
   from the left margin to 12 pt clear of the label: **131 pt** a column at two signers, shorter
   than the template's single 234 pt rule. That is the trade this page forces, and it buys
   **53.8 pt of clear signing height each instead of ~20**. No printed name is drawn because the
   row immediately below the rules is the form's own captioned `Name:` row and `Name_4`/`Name_5`
   already carries both names joined — Track D's decision 5, unchanged. If the operator would
   rather have longer lines than taller ones on this page, the alternative is a stack at a 24 pt
   pitch, which is worse than what Track D shipped; the real fix would be moving the `Date:`
   block, which is a change to his form.

4. **The Affidavit for Loss's columns sit at y 461, not at the template rule's own y (430.8).**
   The brief says "each column's rule at the original rule's y". That page has **two** original
   rules and both are erased; putting the line at 430.8 would give each signer the original's
   21 pt of clear height, while 461 — the lowest the page allows, 10.4 pt above the notary
   block's first ink — gives **51.3 pt**. Since the whole point of the track is room to sign, I
   took the room. It is also the y Track D already proved safe by rendering, and it is held
   identical between the notary and plain variants on purpose.

5. **Relationship and age are left empty by "List current owners as heirs".** The tool does not
   know how one owner is related to the owner who died, and the Affidavit of Heirs is sworn. A
   guessed relationship on a sworn document is invented evidence, so the counselor types it.

6. **A blank date of death is dropped from the joined line rather than joined as an empty slot.**
   Two dead owners with one date typed print `January 12, 2026`, not ` & January 12, 2026`. The
   names line still names both people, so nothing is hidden; a ragged line on a sworn document
   is worse than a short one. One `.filter(Boolean)` reverses it.

7. **Printed-name sizes now differ by page: 7.5 pt on the Release, 9 pt on the Loss affidavit,
   none on the Permission of Use, 9 pt on the statement.** 7.5 is the brief's number and is
   forced on the Release by the `(Grantor's Signature)` caption 2.7 pt under the name's
   descender. The Loss page has 10.4 pt of clear space below its names and no caption, so it
   keeps the more legible 9 and matches the statement.

8. **The situation toggle can still be ticked by hand with nobody flagged**, and then behaves
   exactly as it did before this track (the primary is the decedent). Only the per-owner boxes
   drive it automatically. Pinned in §23.

9. **Removing a co-owner's row removes their death with it** and clears the situation toggle if
   they were the only one flagged. That is the compaction being consistent, but it is a
   behaviour worth knowing: removing the wrong row silently un-deceases somebody.

**Open questions:**

1. **`DESIGN.md` §5 is stale again** — it pins `3961 … across 51 suites`. Measured truth in this
   worktree: **4003** before this track, **4068** after; test-deed-transfer **382**. Whoever
   merges updates §5, `DIRECTOR_GUIDELINES.md` Phase 0 and `SPRINT_GUIDELINES.md` rule 4 (still
   on the very stale `3336 … 47 suites`) in the `[s29/ops]` commit. Tracks B, D and E all raised
   this; it is still open.
2. **`AMENDMENT.md` in this sprint folder still contradicts the shipped code** (Track E's open
   question 2). Untouched.
3. **The `dt` lane is still absent from `BW_LINK_FIELDS`** (Track B's open question 3, restated
   by D and E). Untouched.
4. **Nothing consumes a co-owner's own address on the packet** (Track E's open question 3) —
   except that as of this track the owners-as-heirs button does, on the Affidavit of Heirs. That
   is the first place a co-owner's own address reaches paper. Worth the operator knowing.

**Hygiene.** No production Firebase call was made from any script in this track. Every script
that drives a browser (`tests/test-deed-transfer.mjs`, `scratch/s29f/render.mjs`,
`scratch/s29f/shot.mjs`, `scratch/s29f/measure-ui.mjs`) aborts `/gstatic\.com\/firebasejs/` and
signs in against `tests/fake-firebase.js`; no save or persist function was called against
anything but the fake store. `index.html` was edited only through Node scripts in
`scratch/s29f/`, never through the `Edit` or `Write` tools, so the Browser-pane
`PostToolUse:Edit` hook (DESIGN §6) never booted the app against live Firebase. The only process
I started was the dev server on 3767; it was stopped by PID and 3737/3747/3767 re-checked clear.
Three `chrome-headless-shell.exe` processes are running on this machine, all created
**2026-09-07**, i.e. before this session — not mine, not touched.
`C:\Users\Martice\bw-quote-tool` was not touched. Nothing was pushed.

---

## What the director must verify by hand

1. **The blocks, by eye, and rule on the shape.** `scratch/s29-f-renders/`:
   `2sign-docusign-releasePlain-block300.png` (the page his screenshot came from),
   `2sign-notary-lossNotary-block300.png` and `2sign-notary-permNotary-block300.png`. The
   questions for the operator: is 48/42 pt between the Release lines enough room now, and does
   he accept **side by side** on the Loss affidavit and the Permission of Use rather than
   stacked? Those two pages cannot do both — see decisions 3 and 4.
2. **Open one two-signer packet in Adobe Acrobat.** `scratch/s29-f-renders/2sign-notary.pdf` and
   `2sign-docusign.pdf`. This is the first Deed Transfer change that **removes fields from the
   AcroForm**, and the whole point of it was the empty highlight boxes his Acrobat was drawing
   over the new lines. Look for: no highlight box on or above any signature line, every other
   field still fillable, no "this form has errors" banner. *(Prudence, not the RIC gate — the
   RIC's bytes are untouched.)*
3. **Three signers on the Permission of Use.** `3sign-notary-permNotary-block300.png`: three
   85/78/85 pt lines. Legible and each with the full band above, but it is the tightest thing in
   the packet. If he does not like it, the choices are the same as Track D's: cap that document
   at two, or accept it.
4. **The Deceased tick and the date of death, on the form.** `owner-panel-deceased.png` and
   `owner-panel-three-rows.png` — is "Deceased / Yes" the control he wants on every owner row,
   including the primary's?
5. **"List current owners as heirs"** — `heirs-panel-owners-listed.png`. Confirm that leaving
   relationship and age blank is right (decision 5), and that the label reads the way he wants.
6. **The stale counts** — open question 1.
