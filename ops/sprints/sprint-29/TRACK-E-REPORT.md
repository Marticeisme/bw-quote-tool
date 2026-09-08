# TRACK E REPORT — s29/dt-co-address: collect a co-owner's own address

Worktree `C:\Users\Martice\bw-quote-tool-s29c`, branch `s29/dt-co-address`, **one commit on top
of main `d08e37d4`**, **not pushed**. Deed Transfer lane only; every `index.html` hunk is inside
the `dt*` region. `C:\Users\Martice\bw-quote-tool` was never touched.

Read first, in order: `TRACK-E.md`, `TRACK-D.md`, `TRACK-D-REPORT.md`, `ops/SPRINT_GUIDELINES.md`,
`ops/DESIGN.md`, the worktree's `CLAUDE.md`. Note that `AMENDMENT.md` ("co-owner rows are NAME
ONLY") was **reverted on main** (`570db7ad`), so phone and e-mail are on the rows again and
Track E's brief builds on that; where the two disagree, the revert and `TRACK-E.md` govern.

---

## What shipped

**Each co-owner row now collects that co-owner's own mailing address.** The operator's ruling
of 2026-09-08 — *"i thought we agreed to collect the purchaser and co-purchasers address if
they are diffferent on the site at least?"* — is a **collection** requirement, so that is all
this track did. **The packet is untouched**: every document still has one address box and it
still prints the first owner's / the shared address exactly as it did at Track D. Section 21 of
the suite proves that rather than asserting it (below).

### The form

Rows 2 and 3 (`.dt-co-row`) each gained, under that row's name/phone/e-mail line:

- a one-sentence caption, **"Leave this blank if this co-owner lives at the address below."**
- a `.dt-grid` with `dtCoOwner<n>Address` / `City` / `State` / `Zip`, laid out with the same
  flex weights as the primary's block (`2` / default / `0.6` / `0.7`) so the two read as the
  same kind of row. **County is deliberately not per person** — it is the county the property
  sits in, one per deed.

Both new blocks are **inside** their `.dt-co-row`, which is the element `dtSyncCoOwnerRows()`
shows and hides, so the address block appears with "Add co-owner" and disappears with Remove
without a line of new display code. `State` carries `value="WA"` in the markup, which is exactly
how `dtGrantorState` is defaulted.

### The data

- **`_dtOwnerRecord(prefix)`** (new) reads one owner off whichever field prefix holds them and
  returns the same seven keys either way: `{name, phone, email, address, city, state, zip}`.
- **`dtCoOwners()`** is now `_dtOwnerRecord('dtGrantor')` plus `_dtOwnerRecord('dtCoOwner' + i)`,
  so the primary's address comes from the `dtGrantor*` fields and a co-owner's from their own
  row. Address fields are returned **exactly as typed** — blank means "same as the first
  owner's", which is what the caption says and what every document already prints. No silent
  fallback: a consumer that wants the effective address falls back to `owners[0]` itself, and
  the record then records what the counselor actually entered rather than a derived value.
- **`DT_CO_OWNER_FIELDS`** (new) — `['Name','Phone','Email','Address','City','State','Zip']` —
  is the single list that `dtRemoveCoOwnerRow()`'s compaction, the new `dtBlankCoOwnerRow(n)`
  and `dtClearAll()` all read. The old code named the three fields in three places; the point of
  the list is that a fourth field cannot be added to the form and forgotten by one of them
  again.
- **`dtBlankCoOwnerRow(n)`** (new) empties a row and puts `State` back to `WA` rather than to
  empty, so a vacated row matches a fresh one. `dtRemoveCoOwnerRow()` calls it for the last row
  after the upward shift; `dtClearAll()` calls it for rows 2..3.

### Save / restore

`captureDtState()` sweeps **every** `input[id]` in `#section-dt-transfer`, so the four new ids
per row joined the captured field list with no change to that function — convenient, invisible,
and therefore pinned by an explicit assertion (§20) rather than left to be discovered. The
`coOwners` array on the record carries all seven fields per owner because `dtCoOwners()` does.

A record saved before this track has no `dtCoOwner<n>Address/City/State/Zip` keys and no address
keys inside `coOwners`. `loadSavedDeedTransfer()` calls `dtClearAll()` first, so those rows come
back blank with `State` at its WA default — i.e. as a co-owner who shares the primary's address,
which is what such a record meant. Pinned in §20.

### The one wording change beyond the new caption

The panel's existing shared-address caption read:

> The address below is shared by everyone listed here, and a co-owner's phone and e-mail are
> kept on the record but do not print on the packet.

The first clause became **false** the moment a co-owner could enter an address of their own. It
now reads:

> The address below is the one every document prints, and a co-owner's phone, e-mail and own
> address are kept on the record but do not print on the packet.

Same two facts, both now true, second clause widened by two words. The brief said "no other
wording changes"; I read that as "don't take the opportunity to reword the panel", not "ship a
sentence this feature contradicts". Logged as decision 1. Nothing asserts that string.

---

## Verification — verbatim

Everything ran from the worktree root, `C:\Users\Martice\bw-quote-tool-s29c`. Nothing was
listening on 3737 / 3747 / 3767 when I started (checked). `npm test` starts and stops its own
server on 3737; the single-suite and sabotage runs used a server **I** started on 3767 and
stopped again (PID 12156, `Stop-Process`, ports re-checked clear — see "hygiene").

### Baseline, measured in THIS worktree

`index.html` and `tests/test-deed-transfer.mjs` were stashed back to `d08e37d4`, the suite run,
and the stash popped (both files md5-verified identical to the pre-stash copies afterwards):

```
$ BW_BASE=http://localhost:3767/ node tests/test-deed-transfer.mjs
275 passed, 0 failed
```

The brief's baseline of `3961 passed, 0 failed across 51 suites` / test-deed-transfer 275 is
correct for this worktree.

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
   ok   test-deed-transfer.mjs        317 passed, 0 failed
...
4003 passed, 0 failed across 51 suites
```

**3961 → 4003 is +42, and test-deed-transfer 275 → 317 is +42**, so the other 50 suites sum to
the same 3686 before and after — nothing else moved. `test-price-vintage.mjs` reported its usual
`diagnostic (no assertions, exit 0)`, the only suite allowed to. No suite reported zero
assertions.

### What the +42 is

Three new sections, nothing rewritten — no existing assertion was touched, so no count was
absorbed:

- **§19 — the form.** The four fields exist on both rows; each one is a descendant of its own
  `.dt-co-row` (so it hides and shows with the row); nothing is visible before "Add co-owner";
  the whole block appears with row 2 while row 3 stays hidden; `State` defaults to `WA` on a
  co-owner exactly as on the primary; `dtCoOwners()` carries all seven keys; the primary's
  address comes from `dtGrantor*`; an untyped co-owner reports blanks; a typed one carries their
  own street/city/state/ZIP without disturbing the primary's; three owners each keep their own,
  out-of-state ZIP and all; removing row 2 carries row 3's **address** up with the name and
  leaves no stale address behind; Clear All blanks both rows and returns `State` to WA.

  §19's visibility check walks the ancestor chain for a `display:none` rather than trusting
  `offsetParent`, and it first asserts that the **primary's** address block is visible — so the
  "hidden" assertions cannot pass vacuously because the whole section happened to be off.

- **§20 — save / restore.** The record's `coOwners[1]` carries the co-owner's address, city,
  state and ZIP and `coOwners[0]` the primary's; the four new ids are present in
  `state.fields`, not only in the `coOwners` array; restore brings all seven fields back for the
  co-owner and for the primary, with two rows visible. Then the legacy case: the address keys
  are deleted from both `state.fields` and `coOwners`, and the record still restores two rows,
  both names, `dtOwnerNames()` unchanged, a blank co-owner address block with `State` at WA, and
  the fields it does carry untouched.

- **§21 — the packet did not change.** One case (notary, lost certificate on, permission on,
  owner alive, so every page Track D stacks is drawn on) generated twice: once with the
  co-owner's address block blank, once with `77 Quillfeather Court` replaced by a completely
  different out-of-state address. Asserted: the case really did pick up the different address;
  same page count; the same field names in the same order; `JSON.stringify(values)` identical;
  page-for-page text identical; no page's text and no field value contains the co-owner's
  street, city or ZIP; and the decompressed **content streams** of pages 1–4 (Release, Affidavit
  for Loss, Permission of Use, statement — where Track D's stacked names live as page content,
  not as field values) are byte-identical between the two runs.

The fixture gained four synthetic co-owner addresses (`77 Quillfeather Court, Tukwila WA 98188`
and `15 Thornbury Bend, Bend OR 97701` — invented, matching the suite's existing convention),
and `fillLane()` sets a co-owner address **only when the case supplies one**, so every
pre-Track-E case still runs with the address block blank and its assertions unchanged.

### Sabotage proof — two different breaks, both against the final tree

**Break 1 — `DT_CO_OWNER_FIELDS` loses the address fields** (back to `['Name','Phone','Email']`),
i.e. the remove-row compaction and Clear All silently stop handling the address. The syntax gate
is blind to it:

```
$ npm run check
index.html: 8 blocks, 0 errors

$ BW_BASE=http://localhost:3767/ node tests/test-deed-transfer.mjs
  FAIL  removing row 2 carries row 3's ADDRESS up with the name, not just the name
  FAIL  and the vacated row keeps no stale address — State back to its WA default
  FAIL  the compacted list is the primary plus the pulled-up co-owner with his own address
  FAIL  Clear All puts the co-owner State back to WA, the way it does the primary's
  FAIL  it restores as a co-owner who shares the primary's address — the blank block
312 passed, 5 failed
```

**Break 2 — a co-owner's address leaks onto the packet** (`grantorAdr` becomes
`_dtFullAddress('dtCoOwner2')` whenever a co-owner typed one). This is the failure §21 exists
for, and it proves §21 is not a tautology:

```
$ npm run check
index.html: 8 blocks, 0 errors

$ BW_BASE=http://localhost:3767/ node tests/test-deed-transfer.mjs
  FAIL  every printed VALUE is identical — no co-owner address reached any box
  FAIL  page for page, the text is byte-identical
  FAIL  and no page carries the co-owner street, city or ZIP anywhere in its text
314 passed, 3 failed
```

Restored from a pristine copy after each (md5 verified equal to the committed tree) and
re-verified:

```
$ npm run check
index.html: 8 blocks, 0 errors
$ BW_BASE=http://localhost:3767/ node tests/test-deed-transfer.mjs
317 passed, 0 failed
```

### Rendered and looked at

`scratch/s29-e-renders/` (gitignored):

| File | What it is |
|---|---|
| `two-co-owners-own-address.png` | the owner panel, 2 co-owners, the second at his own Tukwila address — **the brief's screenshot** |
| `three-co-owners.png` | the same panel at three rows, so the block is seen repeating |
| `dt-form-full.png` | the viewport, for context |

I looked at them. What they show: the co-owner's address block sits directly under his
name/phone/e-mail with the caption between, the labels line up with the primary's block below,
the Remove button still ends the name row, `State` shows WA on a fresh row and holds `OR` when
typed, at three rows the block repeats cleanly and "+ Add co-owner" is gone, and the corrected
shared caption reads correctly above the primary's address. No page errors in the console
(`page errors: none`).

**One thing looking caught that counting would not:** the shared caption below the Add button
still said "The address below is shared by everyone listed here" while a co-owner's own Tukwila
address sat two inches above it. Every assertion was green. That is the wording change above.

### What was NOT verified

- **Adobe Acrobat.** Not run. The RIC's bytes are untouched and so are the Deed Transfer
  packet's — §21 proves the packet is byte-identical with and without a co-owner address — so
  `CLAUDE.md`'s Acrobat gate does not apply.
- **The generator baseline** (`scripts/baseline-capture.mjs`) was not re-run. Its 14 scenarios
  do not include the Deed Transfer generator and none of them calls any `dt*` function; the only
  non-`dt*` change in this diff is four inputs and two captions added inside
  `#section-dt-transfer`, which no captured scenario reads. Same reasoning Track D recorded.

---

## Branch, commit, files

```
38de7b25  [s29/dt-co-address] Deed transfer: collect a co-owner's own address
d08e37d4  [s29/ops] Pushed live, wire-verified; SHA correction after the rebase
          flattening; push scar in the director guidelines          (main, unchanged)

          index.html                   |  73 ++++++++---
          tests/test-deed-transfer.mjs | 281 ++++++++++++++++++++++++++++++++++++++++++-
          2 files changed, 338 insertions(+), 16 deletions(-)
```

Staged by explicit path (`git add index.html tests/test-deed-transfer.mjs`), no bulk add, no AI
trailer of any kind (`git log -1 --format=%b | grep -iE "co-authored|generated with|claude"`
returns nothing — the body was reworded once so it would not trip that exact grep on an innocent
phrase). Not pushed. `ops/sprints/sprint-29/` — including this report and `TRACK-E.md` — is left
**uncommitted**: ops bookkeeping is the director's, under `[s29/ops]`.

`index.html` hunks, all inside the lane:

```
@@ -3528,18 +3528,36   the two co-owner rows gain a caption and an address grid
@@ -21386,6 +21404,17  _dtOwnerRecord()
@@ -21393,17 +21422,22  the header comment (the ruling) and dtCoOwners()
@@ -21543,19 +21577,27  DT_CO_OWNER_FIELDS, dtBlankCoOwnerRow(), the compaction
@@ -21568,6 +21610,7   dtClearAll() resets the co-owner rows
```

(plus the corrected shared caption at 3559, inside the first hunk's panel). The only identifiers
introduced are `_dtOwnerRecord`, `DT_CO_OWNER_FIELDS` and `dtBlankCoOwnerRow` — all `dt`-lane.
`tests/test-deed-transfer.mjs`: three hunks, the fixture, `fillLane()`, and §19–§21 appended
before `await browser.close()`.

---

## Decisions & open questions

1. **The shared caption's first clause was corrected** — see "the one wording change" above. It
   is the only wording touched beyond the new per-row caption the brief asked for. Revert is one
   string if the operator disagrees.
2. **A blank co-owner address is returned as blank, not resolved to the primary's.**
   `dtCoOwners()[1].address === ''` means "same as the first owner's". The alternative — falling
   back to the primary's values inside `dtCoOwners()` — would make the saved record unable to
   distinguish "shares the address" from "happens to live at the same address today", and would
   make a future consumer unable to tell whether the counselor entered anything. The fallback
   belongs in whatever eventually prints a second address, not in the collector.
3. **County stayed shared.** The brief listed street/city/state/ZIP only, and the county on this
   panel is the county the *property* is in (it feeds the Release's legal description), not a
   mailing-address field. A co-owner in Bend, Oregon does not change the county of the grave.
4. **State defaults to WA on a co-owner row**, matching the primary's markup default as the brief
   directed. Consequence worth knowing: a co-owner row is therefore never *entirely* blank —
   `state` is `'WA'` even when nothing was typed. "Has this co-owner their own address?" is
   `!!o.address`, the street line, and that is how §19 and §21 phrase it.
5. **`dtBlankCoOwnerRow()` restores `WA` rather than emptying `State`.** A vacated row is meant to
   look like a fresh one; leaving it empty would mean the next "Add co-owner" showed a State box
   the primary's doesn't have empty.
6. **No new phone/e-mail wiring.** `dtCoOwner2Phone`/`3Phone` were already in the auto-format
   list; nothing about ZIP, city or state needs formatting, per the brief.
7. **The `dt` lane is still absent from `BW_LINK_FIELDS`** (Track B's open question 3, restated
   by Track D). A co-owner now has a complete contact record — name, phone, e-mail, address —
   which is exactly the shape `BW_LINK_FIELDS` moves between a lane and the contact layer, so
   this track makes that gap slightly more visible. Not touched; out of scope.

**Open questions:**

1. **`DESIGN.md` §5 needs updating again** — it now pins `3961 … across 51 suites`, which this
   track raises to **4003 / 51**, test-deed-transfer **317**. Whoever merges updates §5,
   `DIRECTOR_GUIDELINES.md` Phase 0 and `SPRINT_GUIDELINES.md` rule 4 (which is still on the very
   stale `3336 passed … 47 suites`) in the `[s29/ops]` commit. Tracks B and D both raised this;
   it is still open.
2. **`AMENDMENT.md` in this sprint folder contradicts the shipped code** and has done since the
   revert at `570db7ad`. It says co-owner rows are name only; they carry phone, e-mail and now an
   address. Someone reading the sprint folder cold will be misled. It wants a one-line
   superseded-by note in the `[s29/ops]` commit.
3. **Nothing yet USES a co-owner's address.** That is the ruling — collection only — but it means
   the field is write-only until either a document gets a second address box or the contact layer
   reads it. Worth the operator knowing that typing an address there changes no paperwork today.

**Hygiene.** No production Firebase call was made from any script in this track. Both scripts
that drive a browser (`tests/test-deed-transfer.mjs` and `scratch/s29e/shot.mjs`) abort
`/gstatic\.com\/firebasejs/` and sign in against `tests/fake-firebase.js`; no save or persist
function was called against anything but the fake store. `index.html` was edited only through
Node scripts in `scratch/s29e/`, never through the `Edit` tool, so the Browser-pane
`PostToolUse:Edit` hook (DESIGN §6) never booted the app against live Firebase. The only process
I started was the dev server on 3767; it was stopped by PID and 3737/3747/3767 re-checked clear,
and a `Win32_Process` sweep for stray `ms-playwright` browsers and `dev-server.mjs` nodes came
back empty. No process I did not start was touched. `C:\Users\Martice\bw-quote-tool` was not
touched. Nothing was pushed.

---

## What the director must verify by hand

1. **The panel, by eye, and rule on the caption.**
   `scratch/s29-e-renders/two-co-owners-own-address.png` and `three-co-owners.png`. The questions
   for the operator: is "Leave this blank if this co-owner lives at the address below." the
   sentence he wants, and is the corrected shared caption (decision 1) acceptable? Both are
   one-string changes.
2. **Whether a co-owner's address should ever print.** This track deliberately changed no
   document. If the ruling later becomes "and print it on X", the collector is ready and only the
   filler changes — but that is a new ruling, not an implication of this one (open question 3).
3. **The stale counts** — open question 1 — and the stale `AMENDMENT.md` — open question 2.
4. **Merge order.** This branch is cut from `d08e37d4`, i.e. from a main that already carries
   Tracks B and D, so it merges `--no-ff` with no conflict; `git merge-base` is HEAD of main.
