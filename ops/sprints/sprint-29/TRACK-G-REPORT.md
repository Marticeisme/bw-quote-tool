# TRACK G REPORT — s29/dt-permission-per-owner: one Permission of Use per living owner

Worktree `C:\Users\Martice\bw-quote-tool-s29e`, branch `s29/dt-permission-per-owner`, **one
commit `7e5a569a` on top of main `7860c82d`**, **not pushed**. Deed Transfer lane only; every
`index.html` hunk is inside `#section-dt-transfer` or the `dt*` function region.
`C:\Users\Martice\bw-quote-tool` was never touched.

Read first, in order: `TRACK-G.md`, `TRACK-F.md`, `TRACK-F-REPORT.md`, `TRACK-A-REPORT.md`,
`ops/SPRINT_GUIDELINES.md`, `ops/DESIGN.md`, the worktree's `CLAUDE.md`.

---

## What shipped

The operator's ruling, verbatim: *"Permission of use would only be one per"* — and, asked which
of the two readings, **"One Permission of Use per owner."**

So the side-by-side columns Track F drew on that page are **gone**. The packet now carries one
whole filled **copy** of the Permission of Use per living owner, contiguous, where the single
Permission sat. Each copy is the template's page with:

- the signer boxes (`I_2`/`I_3`, `Name_4`/`Name_5`) carrying **that owner's name alone** —
  never the joined "A & B" string the rest of the packet uses;
- the **Address** line that owner's own address if they typed one, else the shared address;
- the **Phone** that owner's own phone;
- the decedent, the person to be interred, the new owner and the date reading **the same on
  every copy** — only the signer changes.

**Nothing is drawn or erased on the Permission of Use any more.** `DT_SPLITS.permissionNotary`
and `permissionPlain` are deleted and so is the call that used them; each signer gets the
template's own full-width 234 pt line with the whole 53.8 pt band above it, rather than a 131 pt
column. No widget is removed from that page either (see decision 2 — the brief expected an
"on-rule widget removal" here and there never was one).

Unchanged, and pinned in both directions:

- **One living signer** → one page, the pristine template, no renamed field anywhere.
- **The heir-affiant case** (owner deceased, `dtHeirAffiant` naming somebody who is not the
  owners) → **one copy signed by the heir**, with the heir's own address, exactly as before.
  The guard is `dtSplitSigners()` — the same test the split it replaces used, so the two can
  never disagree.
- **The Permission not in the document set** → nothing is copied.
- **Save / restore** — untouched.

**Screen.** `dtDocList()`'s Permission row, and only that row, reads
`notarized copy · one per owner (×2)`, and the header line counts the copies: *"The download
will contain 7 pages"* at two living owners, 8 at three, 6 at one. `dtTotalPages(sel)` is the new
helper; `dtPageIndexes()` still means "the template pages the packet is pruned to" and did not
change.

**Assembly.** Each copy is built by `dtBuildOnePacket(bytes, [permPage], owner)` — the same
proven path the whole packet takes, so the bake-before-page-removal order, the two-route orphan
prune (`/Annots` and `/P`) and `doc.pageCache.invalidate()` all run for every copy — then
`copyPages` into the base document and `insertPage` at `basePermIndex + i`. `copyPages()` brings
the widget annotations but not the `/Fields` tree, so each copied widget's `/T` is rewritten with
a `' po2'` / `' po3'` suffix, its `/P` re-pointed at its new page, and its ref added to the base
AcroForm. This is Track A's `dtAppendCoOwnerCopies` pattern, reused rather than reinvented.

**The one wording that changed, and why.** The note under the owner list said *"a co-owner's
phone, e-mail and own address are kept on the record but do not print on the packet."* This track
makes that false — a co-owner's own address and phone now print on their own copy. It now reads
*"The address below is the one every document prints. A co-owner's own address and phone print
only on their own copy of the Permission of Use; their e-mail is kept on the record and does not
print."* No other label, help text or template string moved. "NO regressions to my wordings"
was read as: do not change his wordings, and do not leave a sentence on screen that the change
has made untrue.

---

## Order of the packet

Today's order is kept exactly, which is template order:

```
cover · Release · Loss · Affidavit of Heirs · Permission ×N · Statement · Terms
```

The brief's sketch listed `Permission×N` before `Heirs`, which contradicts its own instruction to
"keep today's order"; `dtPageIndexes()` sorts ascending by template page index and the Heirs page
(5) precedes both Permission variants (6/7). Nothing was reordered. See decision 1.

---

## Verification — verbatim

Everything ran from the worktree root, `C:\Users\Martice\bw-quote-tool-s29e`. **Nothing was
listening on 3737 / 3747 / 3767 / 3787 when I started** (checked). `npm test` starts and stops
its own server on 3737; every single-suite run, every render and every screenshot used a server
**I** started on **3787**, whose identity was asserted before the first assertion and which is
stopped again (see "hygiene").

```
$ curl -s http://localhost:3787/__served-tree
{"servedTreeRoot":"C:\\Users\\Martice\\bw-quote-tool-s29e"}

$ node scratch/s29g/render.mjs …        # calls assertServesThisTree() before anything else
http://localhost:3787/ serves THIS tree
```

### Baseline, measured on THIS worktree at `7860c82d` before any edit

```
$ npm run check

> check
> node scripts/syntax-check.mjs

index.html: 8 blocks, 0 errors
```

```
$ npm test
...
4068 passed, 0 failed across 51 suites
```

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
   ok   test-deed-transfer.mjs        412 passed, 0 failed
  ---- test-price-vintage.mjs        diagnostic (no assertions, exit 0)
...
4098 passed, 0 failed across 51 suites
```

**4068 → 4098 is +30, and test-deed-transfer 382 → 412 is +30. Nothing else moved.**
`test-price-vintage.mjs` reported its usual diagnostic line, the only suite allowed to. No suite
reported zero assertions.

### What the +30 is

- **§11** — the permission-of-use fallback re-aimed: neither copy carries the joined string, copy
  1 names the primary alone and copy 2 the co-owner alone; plus the new fallback pin, that a
  co-owner with no address and no phone of her own gets the **shared address** and a **blank
  phone** on her copy rather than somebody else's number.
- **§16** — rewritten from "two columns on one page" to eleven pins on the copies: the page count
  (6, the one extra page being the second owner's copy), contiguity and deed order with the
  statement still after them, copy 1 naming the first owner alone, copy 2 the second, each
  copy's own address (shared / Quillfeather) and own phone, the decedent-interred-new-owner text
  identical across copies, **nothing drawn or erased on either copy**, the copy being the WHOLE
  template page field-for-field (suffix-stripped set equality against copy 1, so the notary
  block's own empty widgets are proven present), the fields registered on the form under their
  `' po2'` names, and that they are SEPARATE fields carrying different values. Both variants.
- **§17** — three owners: 8 pages, three contiguous copies naming Wendell / Beatrix / Cormac,
  nothing drawn on any of them, `' po3'` registered, and the third owner's copy falling back to
  the shared address while keeping his own phone.
- **§21** — Track E's "a different co-owner address changes NOTHING" re-aimed to the truth this
  track creates: **exactly one printed value changes and it is `Address 1 po2`**; every page but
  that one copy is byte-identical; her street/ZIP appear on her copy and on no other page.
- **§26 new** — the copies in depth, in four cases: the one-owner control (6 pages, pristine, no
  renamed field, screen says 6 and does not claim a copy per owner); two living owners (7 pages
  = the one-owner count + 1, contiguity, the screen text, and the object graph read out of the
  **saved bytes** — a full pdf-lib re-save with no error, every `' po2'` field's widget on the
  copy's own page via its own `/P` and nowhere else, the copy's field count equal to the base
  page's, and no duplicated field name in the form); one of the two dead (back to one copy, one
  page shorter, pristine); the heir-affiant case (one copy, the heir named, her address, nothing
  drawn) **and its other half** — two LIVING owners with a different person named as the
  Permission signer still produces ONE copy; and the permission-toggle-off control.

New helpers in the suite: `poSfx`, `permIs`, `permVal`, `permBaseNames`, and `DEEP`/`deep()` — a
second reader that answers "is the object graph sound" rather than "what is in the form".

### Sabotage proof — three breaks, all against the final tree

**Break 1 — drop the field rename** (`dtFieldText(t) + suffix` → `dtFieldText(t)`). The copies'
fields then collide with the base page's: two AcroForm fields with one fully-qualified name are
ONE field, so both owners are forced to share every value. The syntax gate is blind to it:

```
$ npm run check
index.html: 8 blocks, 0 errors

$ BW_BASE=http://localhost:3787/ node tests/test-deed-transfer.mjs
  FAIL  notary: copy 2 names the SECOND owner alone, in deed order
  FAIL  notary: each copy carries its OWN owner's address — the shared one on copy 1, and on copy 2 the address this co-owner typed for herself
  FAIL  notary: the copy's fields are REGISTERED on the form under their ' po2' names — getFields() on the saved bytes returns them, so the copy is fillable and not an orphan
  FAIL  notary: and they are SEPARATE fields, not one field with two widgets — same-named AcroForm fields are one field and would have forced both owners to share a value
  FAIL  no field name is duplicated in the form — two AcroForm fields with one name are ONE field and the two owners would have been forced to share every value
  … 26 FAIL lines in all
386 passed, 26 failed
```

**Break 2 — every copy filled for the FIRST owner** (`dtBuildOnePacket(bytes, [permPage],
owners[i])` → `owners[0]`). The packet then ships N identical pages instead of one per owner —
the exact failure the ruling is about, and the one a page count alone would wave through:

```
$ npm run check
index.html: 8 blocks, 0 errors

$ BW_BASE=http://localhost:3787/ node tests/test-deed-transfer.mjs
  FAIL  notary: copy 2 names the SECOND owner alone, in deed order
  FAIL  notary: and its own owner's phone
  FAIL  the Permission of Use is not split at all — it is COPIED, three contiguous pages in deed order, each naming one owner alone and each keeping the template's own full line
  FAIL  the co-owner street, city and ZIP appear on HER copy and on no other page — the Release, the Loss affidavit, the statement and the first owner's copy still print the shared address
  … 14 FAIL lines in all
398 passed, 14 failed
```

**Break 3 — remove `doc.pageCache.invalidate()`** from `dtBuildOnePacket` (Track A's scar, and
the line this track's copy path leans on hardest). Caught, but **not cleanly**: the suite prints
six FAIL lines and then *crashes*, because an existing helper in §9 indexes into an empty rule
array —

```
$ npm run check
index.html: 8 blocks, 0 errors

$ BW_BASE=http://localhost:3787/ node tests/test-deed-transfer.mjs
  FAIL  BOTH printed names are DRAWN into the split statement box
  FAIL  the statement box is split into TWO signature lines of equal width
  FAIL  the two statement lines sit inside the green box, left edge to right edge
  FAIL  the original full-width statement rule was erased and its background restored: green above the fill boundary, white below
  FAIL  the "Printed Name" caption was whited out — each column is captioned by its own name
  FAIL  the Loss affidavit puts the two signers SIDE BY SIDE across the page — 83.88 to 527.4, the span of the page's own widest rule, two columns with a 14pt gutter
TypeError: Cannot read properties of undefined (reading 'y')
    at file:///C:/Users/Martice/bw-quote-tool-s29e/tests/test-deed-transfer.mjs:924:33
```

That crash is a pre-existing fragility in a Track F/D helper (`sigRows(...)[0].y` with no rows),
not something this track introduced or fixed — a broken build is loudly red either way, but the
run does not reach a summary line. Recorded rather than papered over; see open question 2.

Restored from a pristine copy after each break (`md5 1249b4a0ca94d75c2e5512d23087cd47`, verified
equal to the committed tree) and re-verified:

```
$ npm run check
index.html: 8 blocks, 0 errors
$ BW_BASE=http://localhost:3787/ node tests/test-deed-transfer.mjs
412 passed, 0 failed
```

### Rendered, read back, and LOOKED at

`scratch/s29-g-renders/` (gitignored). Five cases through the real generator, every page at
150 dpi, the Permission signature block at 300 dpi, and the on-screen panels:

| File | What it is | Pages |
|---|---|---|
| `2sign-notary.pdf` | 2 living owners, in person, lost cert + permission; co-owner has her own address | 7 |
| `2sign-docusign.pdf` | the same, DocuSign | 7 |
| `3sign-notary.pdf` | 3 living owners; the third has a phone but no address of his own | 8 |
| `1sign-notary.pdf` | one owner — the control | 6 |
| `heir-signs.pdf` | primary deceased, heir affiant, 2 heirs | 7 |
| `before/*.pdf` | the SAME five cases generated on `7860c82d` (see below) | |
| `<case>-pNN.png`, `<case>-pNN-permblock300.png` | every page, and the signer block | |
| `doclist-1owner.png`, `-2owner.png`, `-3owner.png`, `owner-panel-note.png` | the screen | |

**PyMuPDF, on every produced file** (`scratch/s29g/audit.py` — opens without repair, renders every
page, reads every widget, then reads MuPDF's own warning buffer):

```
=== scratch/s29-g-renders/2sign-notary.pdf  7 pages  repaired=False
   p0  cover         widgets=24  612x792
   p1  releaseNotary widgets=30  612x792
   p2  lossNotary    widgets=23  612x792
   p3  permission    widgets=17  612x792
   p4  permission    widgets=17  612x792
   p5  statement     widgets=19  612x1008
   p6  terms         widgets=0   612x798
   MuPDF warnings: (none)
```

…and the same shape for the other four: `3sign-notary` p3/p4/p5 permission, `1sign-notary` a
single p3, `heir-signs` a single p4, **`MuPDF warnings: (none)` on all five, `repaired=False` on
all five**. The Permission page carries **17 widgets in every case** — one signer, two or three —
which is the direct evidence that nothing was removed from that page.

Field values read back off the copies (PyMuPDF, `2sign-notary.pdf`):

```
p3  I_2        = Wendell Ashgrove          Address 1     = 4120 Larkspur Way, Burien, WA 98166   Phone     = 206-555-0142
p4  I_2 po2    = Beatrix Ashgrove-Hollowell Address 1 po2 = 77 Quillfeather Court, Tukwila, WA 98188  Phone po2 = 206-555-0188
    the property belonged to / now deceased to / interred: identical on both
```

**The measurement that would have lied, and was thrown away.** My first "dangling reference"
check walked `doc.xref_length()` and called `xref_object()` on every slot, counting the failures.
It reported **143 bad objects** on a two-copy packet — and then reported **143 on Track F's own
pre-Track-G packet too**. pdf-lib leaves free/deleted slots in the table and MuPDF reports those
exactly like a missing object, so the number was noise dressed as a finding. The check that
replaced it renders every page (forcing a full parse of every content stream and resource) and
reads MuPDF's warning buffer, and the suite adds the harder half: **loading the saved bytes back
into pdf-lib and re-serialising them**, which walks the whole object graph and throws on a
dangling reference (`§26: resaveError === null`).

**The rest of the packet is byte-identical to the pre-Track-G build.** Rather than compare against
Track F's stored renders — a different fixture, a different worktree — I generated the same five
cases twice: once with `git show HEAD:index.html` in place (`before/`) and once with this track's,
then compared page by page on the decompressed **content stream hash** and on **every widget's
name and value** (`scratch/s29g/compare.py`, pages fingerprinted by a field only that page
carries, the way the suite does it):

```
-------- 2sign-notary
  A p0  / B p0   cover         stream=SAME widgets=SAME
  A p1  / B p1   releaseNotary stream=SAME widgets=SAME
  A p2  / B p2   lossNotary    stream=SAME widgets=SAME
  A p3  / B p3   permission    stream=DIFF widgets=DIFF
        I_2      'Wendell Ashgrove & Beatrix Ashgrove-Hollowell' -> 'Wendell Ashgrove'
        Name_4   'Wendell Ashgrove & Beatrix Ashgrove-Hollowell' -> 'Wendell Ashgrove'
  --          B p4   permission  EXTRA in B (a per-owner copy)
  A p4  / B p5   statement     stream=SAME widgets=SAME
  A p5  / B p6   terms         stream=SAME widgets=SAME
```

`2sign-docusign` is the same with `I_3`/`Name_5`; `3sign-notary` differs on the same two fields
and gains two pages; **`1sign-notary` and `heir-signs` are SAME on every page, stream and
widgets, from end to end.** Two fields on one page, plus the appended copies. That is the whole
diff.

**What the pages look like.** Both copies of `2sign-notary` and `2sign-docusign` at 300 dpi: the
template's own full-width signature rule, unbroken and unerased, with `Name: / Address: / Phone:`
under it carrying that owner alone — Wendell + Larkspur + 0142 on copy 1, Beatrix + Quillfeather +
0188 on copy 2 — and the `Date:` rule untouched to the right. The 3-signer third copy shows Cormac
with the shared Burien address and his own 0199. The whole page 4 of `2sign-notary` at 150 dpi
reads as a complete Permission of Use with a blank notary block. For contrast,
`before/2sign-notary-p03-permblock300.png` is Track F's two 131 pt columns with both names joined
in the `Name:` row — the thing the operator ruled against.

**The screen.** `doclist-2owner.png` reads *"The download will contain 7 pages"* with
`Permission of Use  notarized copy · one per owner (×2)` and no note on any other row;
`doclist-3owner.png` says 8 and `(×3)`; `doclist-1owner.png` says 6 and carries no note.
`owner-panel-note.png` shows the corrected sentence sitting where the old one did.

### What was NOT verified

- **Adobe Acrobat.** Not run — I cannot. `CLAUDE.md`'s Acrobat gate is scoped to the RIC, whose
  bytes are untouched, so the gate does not apply. But this track **adds pages and registers
  renamed fields on the AcroForm**, which is the same class of change Track A flagged and Track F
  repeated, and the operator's own complaints in this sprint came out of Acrobat. One look is
  item 2 below.
- **The generator baseline** (`scripts/baseline-capture.mjs`) was not re-run, for the reason
  Tracks D, E and F recorded: its 14 scenarios do not include the Deed Transfer generator and
  none of them calls any `dt*` function. Every non-`dt*` change in this diff is one sentence of
  help text inside `#section-dt-transfer`, which no captured scenario reads. There is no recorded
  `signatures.json` in this worktree, so a meaningful diff would have meant two full captures;
  the 51-suite run and the before/after packet comparison above are the evidence offered instead.
- **DocuSign's own field mapping** over the `' po2'` / `' po3'` names. Track A raised this as an
  operator question about a downstream tool; it now applies to the Permission of Use as well.

---

## Branch, commit, files

```
7e5a569a  [s29/dt-permission-per-owner] Deed transfer: one Permission of Use per living owner
7860c82d  [s29/ops] Round 2 pushed live, wire-verified   (main, unchanged)

          index.html                   | 159 +++++++++++++-----
          tests/test-deed-transfer.mjs | 381 +++++++++++++++++++++++++++++++++++--------
          2 files changed, 432 insertions(+), 108 deletions(-)
```

Staged by explicit path (`git add index.html tests/test-deed-transfer.mjs`), no bulk add, no AI
trailer of any kind (`git log -1 --format=%B | grep -iE "co-authored|generated with|claude"`
returns nothing, exit 1). **Not pushed.** `ops/sprints/sprint-29/` — including this report and
`TRACK-G.md` — is left **uncommitted**: ops bookkeeping is the director's, under `[s29/ops]`.

`index.html` hunks, all inside the lane:

```
@@ 3567       the owner-panel note, corrected (the one wording change)
@@ 21519      dtPermissionCopyOwners(), dtPermissionCopies(), dtTotalPages()
@@ 21552      dtDocList(): the Permission row's "one per owner (xN)"
@@ 21600      dtUpdateDocs(): the page count counts the copies
@@ 21782      dtFillForm(form, permOwner) — the signature and its comment
@@ 21939      dtFillForm(): the Permission signer, address and phone for THIS owner
@@ 22016      dtBuildOnePacket(bytes, keep, permOwner) and its fill call
@@ 22094      dtAppendPermissionCopies() + dtFieldText()
@@ 22167      the DT_SPLITS header comment: the Permission leaves the table
@@ 22277      DT_SPLITS.permissionNotary / permissionPlain deleted
@@ 22386      the generator: permOwners / permFirst
@@ 22400      the generator: the permission variant lookup and split call removed
@@ 22411      the generator: dtAppendPermissionCopies()
```

Identifiers introduced: `dtPermissionCopyOwners`, `dtPermissionCopies`, `dtTotalPages`,
`dtAppendPermissionCopies`, `dtFieldText` — all `dt`-lane. `dtFieldText` is Track A's helper,
restored verbatim from `a93f8c33`.

---

## Decisions & open questions

**Decisions (logged, not blocking):**

1. **The packet order is today's, not the brief's sketch.** The brief lists "cover, Release, Loss,
   Permission×N, Heirs, Statement, Terms" and, in the same sentence, "keep today's order". Those
   two disagree: `dtPageIndexes()` sorts by template page index, and the Affidavit of Heirs (page
   5) comes before both Permission variants (6/7). I kept today's order, since the instruction to
   keep it is the explicit one and reordering documents is not something a track should decide.

2. **There was no "on-rule widget removal" on the Permission of Use to remove.** The brief says to
   remove it along with the split. `DT_SPLITS.permissionNotary` / `permissionPlain` carried
   `layout`, `names: false`, the span, the rule and one `erase` rectangle — and **no `drop` key**;
   Track F's `drop` lists are `['2_2']` on the plain Release and `['1_3','2_3']` / `['1_4','2_4']`
   on the two Loss variants only. Deleting the two entries therefore removed the erase and the
   columns and nothing else. Pinned by measurement, not by reading: the Permission page carries
   **17 widgets at one signer, 17 at two and 17 at three**.

3. **A co-owner with no phone of their own gets a BLANK phone on their copy, not the primary's.**
   That is Track A's decision 4, and the rule `dtFillForm()` already followed for an heir signer:
   a household number printed under somebody else's signature is wrong on the face of the
   document. An owner with no *address* of their own does get the shared address, because the
   brief says so and because the shared address is the address of record for the property.
   Both halves are pinned (§11, §17).

4. **The first living owner's copy is the base packet's own page**, not an appended one. It costs
   one template load fewer, and — more usefully — it means that at one living signer the code path
   is byte-for-byte the one that shipped before this track, which the `1sign-notary` and
   `heir-signs` comparisons above prove end to end.

5. **The copy suffix is `' po2'` / `' po3'`**, per the brief, and it is applied to *every* field on
   the copied page including the notary block's empty widgets. Leaving any of them unrenamed would
   silently merge that field with the base copy's.

6. **The owner-panel help text was corrected** — see "What shipped". It is the only wording change
   in the diff, and it exists because this track made the old sentence untrue.

7. **`dtPermissionCopyOwners()` reuses `dtSplitSigners()`** rather than re-deriving "who signs the
   Permission". The copies and the (now removed) split therefore cannot disagree about the
   heir-affiant case, and §26 pins that guard in both directions — heir named with an owner dead,
   and heir named with both owners living.

**Open questions:**

1. **`DESIGN.md` §5, `DIRECTOR_GUIDELINES.md` Phase 0 and `SPRINT_GUIDELINES.md` rule 4 all pin
   `4068 … across 51 suites`,** which this track moves to **4098**; `test-deed-transfer` is now
   **412**. Whoever merges updates all three in the `[s29/ops]` commit. (This one is at least
   current rather than stale — Tracks B, D, E and F all raised it against much older numbers.)
2. **`tests/test-deed-transfer.mjs` crashes instead of failing when a break removes every drawn
   rule.** `stackOK`/`sigRows` helpers index `[0].y` on an empty array (line ~924). A broken build
   is red either way, but the run does not reach its summary line, and a suite that dies mid-way
   hides every assertion after the crash. Worth a guard in the helpers; not fixed here because it
   is Track D/F code and outside this track's scope.
3. **`AMENDMENT.md` in this sprint folder still contradicts the shipped code** (Track E's open
   question 2, restated by F). Untouched — and note that this track goes *further* from it: the
   amendment says a co-owner is a name only, while a co-owner's own address and phone now print
   on their copy of the Permission of Use, under the later 2026-09-08 rulings.
4. **The `dt` lane is still absent from `BW_LINK_FIELDS`** (Track B's open question 3, restated by
   D, E and F). Untouched.
5. **`the property that belonged to <primary>, now deceased`** prints on every Permission copy
   whether or not that owner has died, because `permDecedent` falls back to the decedent, which
   falls back to the primary owner. That is pre-Track-G behaviour and out of scope here, but it
   reads oddly in a two-living-owner packet: the first copy says the property belonged to the man
   signing it, "now deceased". `dtPermDecedent` overrides it, so the counselor can fix it, but it
   is a bad default. Worth an operator ruling.

**Hygiene.** No production Firebase call was made from any script in this track. Every script that
drives a browser (`tests/test-deed-transfer.mjs`, `scratch/s29g/render.mjs`, `shot-ui.mjs`,
`shot-panel.mjs`) aborts `/gstatic\.com\/firebasejs/` and signs in against
`tests/fake-firebase.js`; no save or persist function was called against anything but the fake
store. `index.html` was edited **only** through Node scripts in `scratch/s29g/`, never through the
`Edit` or `Write` tools, so the Browser-pane `PostToolUse:Edit` hook (DESIGN §6) never booted the
app against live Firebase. The only process I started was the dev server on **3787** (PID 34692);
it was stopped by PID and 3737/3747/3767/3787 re-checked with no LISTENING socket left. Every
other `node` and `chrome` process on this machine was started before this session (checked by
start time and command line — they belong to another session's price-transparency pipeline and to
Chrome itself) and none was touched. `C:\Users\Martice\bw-quote-tool` was not touched. Nothing was
pushed.

---

## What the director must verify by hand

1. **The copies, by eye, and the ruling behind them.** `scratch/s29-g-renders/`:
   `2sign-notary-p03-permblock300.png` and `-p04-permblock300.png` (the two copies side by side in
   time), with `before/2sign-notary-p03-permblock300.png` for the shape they replace. The question
   for the operator: is one whole page per owner what he meant by *"one per"* — and is he content
   that the second owner's page repeats the decedent, the interred person and the new owner, which
   is what makes it a standalone signed document?
2. **Open one two-signer packet in Adobe Acrobat.** `scratch/s29-g-renders/2sign-notary.pdf` and
   `2sign-docusign.pdf`. The packet now carries **duplicated-but-renamed AcroForm fields on
   copied pages** — the thing I can prove is sound in pdf-lib and MuPDF and cannot prove in
   Acrobat. Look for: 7 pages, both Permission pages fillable and independent (typing in one must
   not change the other), no "this form has errors" banner. *(Prudence, not the RIC gate — the
   RIC's bytes are untouched.)*
3. **Three owners.** `3sign-notary.pdf` is 8 pages, three of them the Permission of Use. Is that
   the right trade against Track F's three 85/78/85 pt columns on one page? It is more paper for
   a longer line each.
4. **A co-owner's own address and phone now print** — on their copy and nowhere else (decision 3,
   §21). Confirm that is what he wants, and that a co-owner with no phone on the record should
   leave that box blank rather than carry the household number.
5. **The corrected owner-panel sentence.** `owner-panel-note.png`. It is the only wording this
   track changed, and it changed because the old one became false.
6. **Open question 5** — the "now deceased" default on a packet where nobody has died.
7. **The stale counts** — open question 1: `4098 / 51`, test-deed-transfer `412`.
