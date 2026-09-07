# TRACK B REPORT — s29/dt-joint

Worktree `C:\Users\Martice\bw-quote-tool-s29b`, branch `s29/dt-joint`, **one commit**,
**not pushed**. All work is in the Deed Transfer lane; no other lane, quote PDF, catalog or
guide was touched (every diff hunk is inside the `dt*` region — hunk list below).

I read the whole of `ops/sprints/sprint-29/` first — `TRACK-B.md`, `SPRINT.md`, `TRACK-A.md`,
`TRACK-A-REPORT.md`, `AMENDMENT.md` — then `ops/SPRINT_GUIDELINES.md`, `ops/DESIGN.md` and the
worktree's `CLAUDE.md`. The operator's 2026-09-07 ruling in `TRACK-B.md` governs; where
`SPRINT.md` and `TRACK-A.md` still describe per-co-owner copies, I followed the ruling.

---

## What shipped

**1. The per-copy assembly is gone.** Deleted `dtAppendCoOwnerCopies`, its helper
`dtFieldText`, `dtPerOwnerPages`, `dtTotalPages`, the `' co2'` / `' co3'` field-name suffix
logic, the `perOwner` flags in `dtDocList`, the "· one copy per co-owner (×N)" note, and the
`self` / `owners` split in `dtFillForm`. `dtBuildOnePacket(bytes, keep)` is the single build —
its s27 order is untouched (fill → `updateFieldAppearances()` while all ten pages exist →
back-to-front page removal → orphan-field prune → `save({updateFieldAppearances:false})`), and
the `doc.pageCache.invalidate()` line is kept with its comment as the brief asked, even though
nothing copies pages any more.

The on-screen list is the s27 wording and the s27 count again: *"The download will contain 5
pages:"* with no per-owner tag, at one co-owner or three (`scratch/s29-b-renders/form-doc-list.png`).

**2. Both names wherever the owner is named.** New `dtOwnerNames()` = the co-owner names joined
with `" & "` (one name → that name, unchanged). It now supplies:

| Where | Field | Before |
|---|---|---|
| Cover row | `Namephone  of current property ownerRow1` | joined already (Track A) |
| Release, notary | `day of` | the single grantor |
| Release, plain | `day of_2` | the single grantor |
| Release, plain | `2_2` (name typed on the rule) | the single grantor — **now only at 1 owner** |
| Affidavit for Loss | `being duly sworn deposes and says` / `NAME NUMERO2` (+`_2`) affiant default | the single grantor |
| Permission of Use | `I_2` / `Name_4` (+`I_3` / `Name_5`) signer default | the single grantor |
| Statement | `Current Name Print`, at ONE owner | the single grantor |

**EXCEPTION, as instructed:** the Affidavit of Heirs decedent default (`DEPOSES SAYS BLANK`,
and the Permission of Use's `the property that belonged to` which reads the same variable)
stays the **primary owner alone** — a joined string is not a decedent.

Phone, e-mail and the address have one box apiece on these forms, so they stay the primary's
and the shared address. **A co-owner's phone and e-mail are still collected and still saved on
the record; they print nowhere, because there is no box for them.** That is the operator's
"we can collect all the info it just doesn't need to print everywhere if there's not room".

**3. The Release signature line is split, in both variants.** At two or more co-owners the
Grantor's Signature line becomes N equal columns, a rule each with that owner's printed name
centred under it — the same treatment the statement's green box already had. The
`"(Grantor's Signature)"` caption is kept and is untouched. `Grantors Address` and
`Grantors Phone Num` stay single boxes below it. At one co-owner nothing is drawn and both
pages are byte-for-byte the s27 behaviour (pinned by a control assertion).

**4. p9** keeps Track A's split exactly. **Cover** keeps the joined row.

**5. Save / restore** unchanged from main: `coOwners: [{name, phone, email}]` and `coOwnerRows`
on the record; a pre-sprint-29 record restores as the one owner it was.

**6. Help text.** The three-sentence paragraph under the rows is replaced by one sentence:

> The address below is shared by everyone listed here, and a co-owner's phone and e-mail are
> kept on the record but do not print on the packet.

No other on-screen wording, form label, template text or document name was changed.

---

## The helper, generalized

`DT_P9` / `dtP9Axes` / `dtDrawStatementSplit` are replaced by:

- `DT_SPLIT_DEFAULTS` — `{ gap: 18, size: 9, minSize: 5, pad: 6, ellipsis: '...' }`, shared.
- `DT_SPLITS` — one geometry object per page (`statement`, `releaseNotary`, `releasePlain`),
  each carrying `page`, `left`, `right`, `ruleTop`, `ruleBottom`, `nameBaseline` and an
  `erase` list of `{x0, x1, top, bottom, color}` rectangles.
- `dtSplitAxes(page)` — reads the MediaBox off **the page being drawn on** and returns the two
  converters. Track A's scar generalized: the Release pages are `[0 0 612 792]` and the
  statement is `[-11.9622 11.9906 600.038 1019.99]`, so a single hardcoded origin would be
  wrong on one of them.
- `dtDrawSignatureSplit(doc, pageIndex, owners, G)` — erases, draws N rules, shrinks each name
  from 9 pt in 0.5 pt steps to a 5 pt floor and trims with `...` only if it still will not fit.
  Returns immediately at fewer than two owners.

The generator picks the release variant actually in the packet and calls it twice:

```js
var release = DT_SPLITS[sel.docusign ? 'releasePlain' : 'releaseNotary'];
await dtDrawSignatureSplit(doc, keepAll.indexOf(DT_PAGES.statement), owners, DT_SPLITS.statement);
await dtDrawSignatureSplit(doc, keepAll.indexOf(release.page),       owners, release);
```

---

## Release split geometry, per variant

Measured off `pdf-templates/Deed Transfer Fillable Forms 2026.pdf` with PyMuPDF (MuPDF page
coordinates, origin top-left, y downward; both Release pages are 612 × 792 with MediaBox
`[0 0 612 792]`, so user-space y = 792 − v):

| Feature | Notary (page idx 1) | Plain / DocuSign (page idx 2) |
|---|---|---|
| Template's Grantor's Signature rule | x 313.2–522.84, y **388.96–389.44** | x 313.2–522.84, y **390.96–391.44** |
| Caption `"(Grantor's Signature)"` — **kept, untouched** | bbox 366.48–472.44 × 390.12–406.28, baseline 402.6 | identical |
| `Grantors Address` widget | 313.283–523.043 × 406.82–419.54 | *(no equivalent on this variant)* |
| `Grantors Phone Num` widget | 313.2–522.96 × 421.2–433.92 | *(no equivalent)* |
| Widget that normally prints the name on the rule | — | `2_2` 313.2–522.96 × 376.92–390.96, **left empty at 2+** |
| **Erase rectangle drawn (white)** | x 312.8–523.3, y 388.7–389.7 | x 312.8–523.3, y **390.7–391.7** |
| **Split rules drawn** | x 313.2–522.84, y **371.0–371.48** | identical |
| **Printed-name baseline** | y **381.6** | identical |

**Why the rules move up 18 pt instead of staying put — the decision the brief could not have
known about.** The brief said to draw "a rule with that owner's printed name under it,
exactly the way `dtDrawStatementSplit` does p9". On p9 that works because the page has a
*separate printed-name row* below the kept caption — the `Current Name Print` widget — and
Track A drew into it. **The Release has no such row.** Its caption's ink starts ≈ 3.5 pt below
the rule and `Grantors Address` starts 0.5 pt below the caption; there is no vertical space
for a name at any legible size, and the brief also says those fields stay single. So the
original full-width rule is whited out and the N column rules are drawn 18 pt higher, into the
~90 pt of blank page above them. The result reads in the conventional order:

```
_________________        _________________
  Wendell Ashgrove         Beatrix Ashgrove-Hollowell
          (Grantor's Signature)
  4120 Larkspur Way, Burien, WA 98166
  206-555-0142
```

Nothing template-authored moves and no template text changes — one 210.5 × 1.0 pt white
rectangle over a hairline rule in an otherwise blank band. Verified by eye at 300 dpi
(`scratch/s29-b-renders/2co-notary-release-split.png`, `2co-docusign-release-split.png`) and at
900 dpi on the caption (`2co-docusign-caption-zoom.png`) — the plain variant's erase clears the
caption's ink by 0.2 pt, so I looked at it specifically; the caption is intact.

Measured in the produced files (PDF user space):

- **2 co-owners, either variant** — rules `x 313.20 w 95.82` and `x 427.02 w 95.82`, both
  `y 420.52 h 0.48`. Equal to two decimals, flush to 313.20 and 522.84. Names at `y 410.4`,
  9 pt and 8.5 pt.
- **3 co-owners** — widths 60.88 / 51.88 / 60.88 (the middle one loses a gap at each end),
  names 8.5 / 5.5 / 8.5 pt.
- The statement is unchanged from Track A: rules `x 332.5198 w 114.90` and `x 465.4198 w 114.90`
  at `y 436.56 h 0.72`.

The rules keep each page's own template thickness — 0.72 pt on the statement, 0.48 pt on the
Release — which is also how the assertion suite tells the two apart (`RULE_H`).

---

## Branch + commit

Branched from `7bd89821`, the tip of `main` (the Track A merge, then the amendment revert).

```
9e95f80d  [s29/dt-joint] Deed transfer: one packet for several co-owners, both names,
          split signature lines

          index.html                   | 262 +++++++++--------------
          tests/test-deed-transfer.mjs | 454 ++++++++++++++++++++-------------
          2 files changed, 409 insertions(+), 307 deletions(-)
```

Staged by explicit path, no bulk add, no AI trailer (`git log -1 --format=%b | grep -i
"co-authored\|generated with"` returns nothing). `ops/sprints/sprint-29/` — including this
report and `TRACK-B.md` — is left **uncommitted**: ops bookkeeping is the director's, under
`[s29/ops]`.

Every hunk in `index.html` is inside the lane:

```
@@ -3541,4 +3541,2 @@       the help text under the co-owner rows
@@ -21414..21499            dtOwnerNames, dtPerOwnerPages/dtTotalPages removed, dtDocList, dtUpdateDocs
@@ -21633..21809            dtFillForm
@@ -21835..22030            dtBuildOnePacket, DT_SPLITS/dtSplitAxes/dtDrawSignatureSplit, the generator
```

The identifiers touched are exclusively `dt*` / `DT_*` / `_dt*`. The generator baseline
(`scripts/baseline-capture.mjs`) lists 14 scenarios and the Deed Transfer generator is not one
of them; none of the 14 calls any `dt*` function, so their bytes cannot have moved.

---

## Verification — verbatim

Everything ran from the worktree root, `C:\Users\Martice\bw-quote-tool-s29b`. No dev server was
listening on 3737/3747 when I started (`netstat` clean — Track A's two servers were already
gone), so `npm test` started and stopped its own on 3737 each time. The single-suite runs used
a server **I** started on 3767 and stopped again.

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
   ok   test-deed-transfer.mjs        198 passed, 0 failed
...
3884 passed, 0 failed across 51 suites
```

**The brief's expected baseline was wrong, and in a way worth recording.** It said "main pin is
`3888 passed … across 51 suites`; a worktree reads −2 → expect 3886". That pin was taken with
Track A's amendment commit in place. `main` now carries `7bd89821 Revert "[s29/dt-co-owners]
Amendment: a co-owner is a name only"`, which put back the five-for-three assertion swap Track A
described — so this worktree's true untouched baseline is **3884 / 51**, with test-deed-transfer
at **198**, exactly the "pre-amendment build measured 3884 / 198" figure in TRACK-A-REPORT.md.
`DESIGN.md` §5's `3888 … worktree reads 3886` is therefore stale on main as well.

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
   ok   test-deed-transfer.mjs        226 passed, 0 failed
...
3912 passed, 0 failed across 51 suites
```

**3884 → 3912 is +28, and test-deed-transfer 198 → 226 is +28.** Nothing else moved.

### The count went UP, not down — the accounting

The brief predicted the deed-transfer count would drop when the per-copy assertions went. It
did not, and here is why, honestly:

- Sections 1–7 (the s27 pins: variants, notary blanks, toggles, page maths, save/restore, the
  negative control, the sparse-fill regression) are **untouched** — 108 assertion sites, the
  same before and after.
- The co-owner half (sections 8 onward) was **rewritten wholesale**: **90 executed assertions
  out, 118 in**. Out went everything about copies — page order `p1, [docs × A], [docs × B], …`,
  the `1 + N×docs + 2` arithmetic, `dtPerOwnerPages` / `dtTotalPages`, the `' co2'` / `' co3'`
  page fingerprints, "owner B's name appears nowhere on owner A's pages", the per-copy notary
  sweep and the per-copy phone rule. In came: the page set NOT growing with the owner count,
  the joined name in every box that carries it, the decedent exception, the Release split in
  both variants (rule count, equal widths, full-width span, the erase at each variant's own y,
  the names sitting below the rules and above the kept caption), the emptied `2_2`, "a
  co-owner's phone and e-mail print nowhere", and a **one-owner control** proving nothing is
  drawn on either page at a single owner.

The rewritten suite is 15 sections; the new ones are 11 (fallback names + the decedent
exception) and 13 (the one-owner control).

### Sabotage proof — two different breaks, both against the final tree

**Break 1 — the Release erase rectangle moved off the rule it is meant to cover**
(`top: 388.7, bottom: 389.7` → `288.7 / 289.7`). This would ship a Release page carrying the
template's original full-width rule *and* the two split rules above it. The syntax gate is
blind to it:

```
$ npm run check
index.html: 8 blocks, 0 errors

$ BW_BASE=http://localhost:3767/ node tests/test-deed-transfer.mjs
  FAIL  the template's own full-width Release rule was whited out at its own y (392.3 down to 402.3 in user space), so only one set of lines is on the page
225 passed, 1 failed
```

**Break 2 — the decedent exception removed** (`var decedent = _dtVal('dtDecedentName') ||
owners[0].name;` → `|| grantor`, i.e. the joined names). Syntax still clean:

```
$ npm run check
index.html: 8 blocks, 0 errors

$ BW_BASE=http://localhost:3767/ node tests/test-deed-transfer.mjs
  FAIL  EXCEPTION — the affidavit of heirs DECEDENT is the primary owner ALONE, never a joined string: a death is not recorded under two names
  FAIL  the permission-of-use deceased owner is the primary alone, for the same reason
224 passed, 2 failed
```

Restored from a pristine copy after each, and re-verified:

```
$ npm run check
index.html: 8 blocks, 0 errors
$ BW_BASE=http://localhost:3767/ node tests/test-deed-transfer.mjs
226 passed, 0 failed
```

### Rendered and looked at

`scratch/s29-b-renders/` (gitignored) holds the artefacts. **Every page of both required cases
was rasterised with PyMuPDF at 100 dpi and looked at**, plus 300 dpi crops of both split areas
and a 900 dpi crop of the kept caption.

| File | What it is |
|---|---|
| `2co-notary.pdf` | 2 co-owners, in person, all three toggles on — **7 pages** |
| `2co-docusign.pdf` | 2 co-owners, DocuSign, all three toggles on — **7 pages** |
| `3co-notary.pdf` | 3 co-owners, release only — 4 pages |
| `1co-notary.pdf` | 1 owner, all toggles — 7 pages, the control |
| `<case>-p01..p07.png` | every page of all four cases |
| `2co-notary-release-split.png`, `2co-docusign-release-split.png`, `3co-notary-release-split.png`, `1co-notary-release-split.png` | the Release signature block, 300 dpi |
| `2co-notary-statement-split.png`, `2co-docusign-statement-split.png`, `3co-notary-statement-split.png` | the green box, 300 dpi |
| `2co-notary-caption-zoom.png`, `2co-docusign-caption-zoom.png` | 900 dpi on `"(Grantor's Signature)"` |
| `form-co-owner-panel.png`, `form-doc-list.png` | the on-screen panel and the derived-document list |

What `2co-notary.pdf` shows, page by page:

- **p1 cover** — `Wendell Ashgrove & Beatrix Ashgrove-Hollowell · 206-555-0142`, one row, fits.
- **p2 Release (notary)** — `THE GRANTOR Wendell Ashgrove & Beatrix Ashgrove-Hollowell`, two
  signature rules with both printed names under them, the kept caption below, then the shared
  address and the primary phone. Notary block blank.
- **p3 Affidavit for Loss** — both names as affiant and in "That I, … reside at", the shared
  address. (This form already carries two blank signature rules, so it needed no split.)
- **p4 Affidavit of Heirs** — affiant `Wendell Ashgrove & Beatrix Ashgrove-Hollowell`,
  **decedent `Wendell Ashgrove` alone**. The exception, visible.
- **p5 Permission of Use** — signer both names, deceased owner the primary alone, the shared
  address and the primary phone under the signature.
- **p6 Statement** — two signature lines in the green box with both printed names beneath,
  *"Printed Name"* gone, the caption kept, one address block below.
- **p7 Terms** — untouched.

`2co-docusign.pdf` is the same with the plain variants, no notary page, and `2_2` left empty so
the split's own names are the only ones on the rule.

---

## Decisions & open questions

**Decisions (logged, not blocking):**

1. **The Release split rules are drawn 18 pt above the template's own rule, which is erased.**
   Reasoned above: there is no room under the rule for a printed name without moving or
   deleting the caption the brief says to keep, or the address/phone fields it says stay single.
   One constant (`ruleTop` / `ruleBottom` / `nameBaseline` in `DT_SPLITS`) moves them back if
   the operator prefers something else.
2. **`2_2` on the plain Release is left EMPTY at two or more owners**, exactly as
   `Current Name Print` is on the statement — otherwise the same names would print twice, once
   as a field value on the rule and once as drawn text. At one owner it is filled as before.
   `day of_2`, the body-text grantor box, carries the joined names on both variants.
3. **The Permission of Use "is the signer somebody else?" test now compares against the joined
   names**, not the primary's. So when the signer *is* the owners, the address and phone under
   the signature are the shared address and the primary phone (as before); when an heir signs,
   the block is still left for them, unchanged.
4. **The Affidavit for Loss and the Permission of Use are NOT split.** The operator named them
   as documents that get one copy with both names written in, and named only the Release as
   the one that "needs both of their signatures". The Loss affidavit happens to carry two blank
   signature rules already; the Permission of Use has one. If the operator wants either split,
   it is a new `DT_SPLITS` entry and one call — the helper is now generic.
5. **`dtCoOwnerNames()` is kept** even though only the tests and `dtOwnerNames()` call it; it is
   the natural seam and removing it would have been churn.
6. **Track A's `doc.pageCache.invalidate()` is kept with its comment**, per the brief, although
   with `copyPages` gone nothing now reads `getPages()` after the prune. It is harmless and it
   documents the scar.

**Open questions:**

1. **`DESIGN.md` §5 is stale on main.** It pins `3888 … worktree reads 3886`; the truth on
   `main` after the amendment revert is `3886 / 3884`, and after this branch merges it is
   **3914 on main / 3912 in a worktree** (the documented −2 for `test-contact-csv`'s absent
   map cross-check — this worktree reported 134 for that suite both before and after, i.e. the
   −2 did not appear here either; the number to write down is the one measured on main after
   the merge). Whoever merges updates §5, `DIRECTOR_GUIDELINES.md` Phase 0 and
   `SPRINT_GUIDELINES.md` rule 4 in the `[s29/ops]` commit.
2. **Track A's open question 1 still stands** — the "seven stray widgets on pages 3 and 6"
   comment inside `dtBuildOnePacket` is a diagnosis Track A could not reproduce against the
   current template. I did not touch it either; the s27 ordering it protects is preserved and
   the sparse-fill regression is green in both variants at two co-owners.
3. **Contact linking** — the `dt` lane is still absent from `BW_LINK_FIELDS`, so the s26
   fill-blanks-only autofill does not reach co-owners. Out of scope, worth a roadmap line.

**One hygiene slip, reported rather than buried.** While setting up the on-screen screenshots I
wrote a throwaway one-liner whose route filter was mis-escaped (`/gstatic\.\com\/firebasejs/`),
so the real Firebase SDK loaded and the script's `signInWithEmailAndPassword('martice@bwquote.local','pw')`
went to production auth. It failed with `auth/invalid-credential` and the script died there.
**No read succeeded and nothing was written** — rules are `auth !== null` and there was no
authenticated session — but it was a live call to production that should not have happened. I
rewrote it as `scratch/s29b/shot.mjs` with the correct filter. Every assertion run, before and
after, used `tests/test-deed-transfer.mjs`'s own abort route and the fake store.

---

## What the director must verify by hand

1. **The Release split, by eye, and rule on decision 1.** `2co-notary-release-split.png` and
   `2co-docusign-release-split.png` are the crops. The question for the operator is whether
   moving the signature rules up into the blank band (to make room for the printed names under
   them, with `"(Grantor's Signature)"` still captioning the block) is what he pictured when he
   said "just split the green box in half" about the Release.
2. **Open one two-co-owner packet in a real PDF viewer**, ideally Acrobat.
   `scratch/s29-b-renders/2co-notary.pdf` and `2co-docusign.pdf` are ready. This build no longer
   copies pages or renames fields, so it is a much smaller risk than Track A's — the AcroForm
   is the template's own, with pages pruned exactly the s27 way — but the drawn content on two
   pruned pages is new. Look for: 7 pages, every field selectable, no "this form has errors"
   banner, and both split lines rendering. *(CLAUDE.md's Acrobat gate is scoped to the RIC,
   whose bytes are untouched — this is prudence, not the RIC gate.)*
3. **The three-co-owner middle column.** `3co-notary-release-split.png` — at three owners the
   middle name shrinks to 5.5 pt on the Release and 6.5 pt on the statement. Confirm that is
   acceptable, or cap the lane at two.
4. **The decedent exception, on the page.** `2co-notary-p04.png`: affiant "A & B", decedent "A".
   That is the brief's instruction, but it is an operator-facing statement about who died, so
   it deserves one look.
5. **The one sentence of new help text** — `form-co-owner-panel.png`. It is the only
   user-facing wording this track wrote.
6. **The stale counts in `DESIGN.md` §5** — open question 1 above.
