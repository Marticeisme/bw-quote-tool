# TRACK C — CSV in and out, and the demo data

**Branch:** `s04/contact-csv`, cut from `main` **after Tracks A and B have merged**. **Working
directory:** `C:\Users\Martice\bw-quote-tool` (main tree — you are the only track running).
**Model:** Opus. **Read first:** `ops/DESIGN.md`, `ops/SPRINT_GUIDELINES.md`,
`ops/sprints/sprint-04/SPRINT.md` (**§Design decisions D1–D10 bind you**, especially **D6, D7,
D8**), and both earlier track files plus their merged diffs. **Their reports are claims; the
merged code is the fact.**

This track carries an unusual weight: **its output is what the operator imports into the live
production database.** He asked for 30 fake contacts to test with, and the answer to how they
get there is *he imports them himself through the UI you build.* No agent writes to production
at any point. That means your import path has to be right the first time, and undoable if it
isn't.

**Line numbers are DIRECTOR RECON — a lead, not a finding**, and stale by two merges. Verify.

---

## What to build

### 1. A CSV parser, ours (D6)

~60 lines, pure, no dependency. Sprint-01 spent an entire sprint removing 9.4 MB of vendored
payload from this file; adding PapaParse back to save an hour is the wrong trade.

RFC 4180 plus the real world: quoted fields, embedded commas, `""` as an escaped quote, embedded
newlines inside quotes, CRLF **and** LF line endings, a UTF-8 BOM on the front because that is
what Excel writes, ragged rows (fewer or more cells than the header), and trailing blank lines.

It gets its own unit assertions. Every one of those cases.

Also write the inverse — `bwToCsv(rows, columns)` — quoting only what needs it, and prove
`parse(serialise(x)) === x` over a fixture containing a comma, a quote, a newline and a leading
`+`.

### 1b. A trap the director measured for you, 2026-07-27 — do not skip this

`dev-server.mjs` has an SPA fallback. **A missing file under `data/` does not 404 — it returns
HTTP 200 with the entire 2,750,192-byte `index.html`.** Verified directly:

```
data/does-not-exist.csv  ->  HTTP 200, 2750192 bytes, body begins "<!DOCTYPE html>"
```

So the **"Load demo data"** fetch must never trust `res.ok`. If the file is missing, misspelled,
or the deploy is stale, a naive `fetch().then(r => r.text()).then(parseCsv)` hands your parser
2.75 MB of HTML, which will produce a large number of nonsense rows — and the operator is
importing into a **live production database**. Validate the content: reject a body that starts
with `<!DOCTYPE` or `<html`, and require the expected header row before entering the mapping
step. Fail with a visible, named error, exactly as sprint-01's template loader had to
(`DESIGN.md` §8: a LOAD failure must surface by name).

This is the same defect class sprint-01 hit — its first gate run produced a silently wrong
4-page RIC because a 200 response was trusted. A captive portal or proxy error page behaves the
same way in production. **Assert it: a test that points the loader at a missing path must fail
loudly rather than importing anything.**

Also measured: `data/*.csv` is served at `Content-Type: application/octet-stream`, not
`text/csv`. That is fine for `fetch().text()` — do not chase it — but do not branch on the
content type either. And `data/demo-contacts.csv` is **not gitignored**, so it commits normally.

### 2. Import — file to contacts

A new **Import** screen reachable from the Contacts page header (a link, not a 37th nav item).
Four steps, each of which the user can back out of:

1. **Pick a file** — `<input type="file" accept=".csv,text/csv">`, read with `FileReader` as
   text. Also a **"Load demo data"** link that fetches `data/demo-contacts.csv` and enters the
   same flow at step 2. It must go through preview and confirm like any other file — a one-click
   "seed my live database" button is a foot-gun, and this is a live production tool.
2. **Map columns** — one row per CSV column: the header, the first value as a sample, and a
   select of tool fields defaulting to an auto-mapped guess, with "Skip this column" as an
   option. Auto-map on a normalised header (lowercase, strip spaces/underscores/punctuation)
   against a synonym table: `first/fname/firstname/given`, `last/lname/lastname/surname/family`,
   `middle`, `prefix/title`, `suffix`, `nickname/goesby`, `email/emailaddress/email1`,
   `phone/phonenumber/mobile/cell/home/homephone`, `street/address/address1/addressline1`,
   `city`, `state/st`, `zip/zipcode/postal/postalcode`, `dob/dateofbirth/birthdate`,
   `source`, `status`, `category`, `flags/tags`, `salutation`, `note/notes/comment`,
   `nextaction/nextactiondate/followup/followupdate`, `owner`.
   **Unmapped columns are skipped, and the screen says how many** — silently dropping a column is
   how an import looks successful and loses half the data.
3. **Preview** — the first 5 rows as they would land, plus counts: *N rows · M will import · K
   skipped as duplicates · J rows with no name and no contact method (cannot import)*. Duplicate
   rows are listed by row number and name so he can see what he'd lose.
4. **Import** — writes per record, progress shown, then a result screen: created, skipped,
   failed, with the reason for each failure.

**Taxonomy values arriving as labels** ("Walk-in") must resolve to codes (`walk-in`) by
case-insensitive label match; an unrecognised value is imported as-is only if it is already a
valid code, otherwise it is dropped **and reported**, never silently invented.

**Notes and next actions:** a mapped `note` column creates one `contactNotes` record;
a mapped `next action` + `next action date` pair creates one open `contactTasks` record. That
keeps the format generic — any CRM export has a notes column — while making the demo file able
to light up the follow-up views.

### 3. Duplicates (D8)

A row is a duplicate when its email matches an existing contact's email exactly
(case-insensitive) **or** its phone matches on all 10 digits. Those rows are **skipped by
default** and listed. A name-only match is **not** a duplicate — it warns and imports; reuse
`bwFindPossibleDuplicates()` rather than writing a second rule. A checkbox allows importing
duplicates anyway. **Never merge automatically.**

### 4. Undo — the property that makes this safe (D7)

Every imported record gets `_prov = { src: 'csv-import', ref: <batchId>, at: <ts> }`, and the
batch is written to `importBatches/<batchId>`:

```
{ id, filename, at, by, rowCount, createdPartyIds:[], createdNoteIds:[], createdTaskIds:[] }
```

The result screen and an "Imports" list both offer **Undo this import**, which deletes exactly
the ids in that batch — parties, their notes, their tasks — and then the batch record. It
deletes nothing else, and it refuses to delete a party that has since gained a `contractRole`
(the existing `deleteParty()` already refuses that; surface the refusal, don't work around it).

This is the reason it is acceptable to import into a live database at all. Test it hard.

### 5. Export

Export the current view or the current selection to a CSV that this importer can read back
without loss — same column names the auto-mapper recognises. Track B built a selection export;
fold it into this one function rather than keeping two.

### 6. `data/demo-contacts.csv` — 30 rows

Committed to the repo, served from Pages alongside `data/prices.json`, so it is reachable from
the live site.

**Synthetic by rule** (`DESIGN.md` §6): invented names, `@example.com` emails, phones in the
reserved fictional range `(206) 555-01xx`, plausible Seattle-area street addresses that are not
real people's. **Nothing from `wmp-cemetery-map/` and nothing from any real record, in any
form** — not as a name, not as an example in a comment, not in your report.

Columns: `first,last,email,phone,street,city,state,zip,source,status,category,flags,salutation,note,next_action,next_action_date`.

Shape it so **every one of Track B's five default views is non-empty**, and write the expected
counts into the test as exact numbers:

- several rows with `next_action_date` in the past → **Needs follow-up**
- several `new`/`working` rows with no next action and no note → **Unworked** and **No next action**
- **New this week** is satisfied by the import itself (`createdAt` is import time)
- a few rows deliberately missing email and phone, or missing source, or with a 7-digit phone →
  **Data health**
- a spread across sources, statuses, categories and flags so the basic filters have something to
  bite on
- at least one row that is an exact duplicate of another by email, so the duplicate skip is
  visible in the preview during his real import
- at least one field containing a comma inside quotes, and one containing an apostrophe, so the
  parser is exercised by the real file and not only by unit fixtures

---

## Hard constraints

- **No production Firebase writes. This one is the whole point of the track's design** — the
  operator does the only real import, himself, after the push. If at any moment you feel you
  need to write to production to verify something, you are wrong: use `tests/fake-firebase.js`
  and say so in your report.
- **Never `.set()` a whole collection node.** Import writes `parties/<id>`, `contactNotes/<id>`,
  `contactTasks/<id>`, `importBatches/<id>` — one record at a time, always.
- **Do not touch** the quoting path, contract generators, `contractRoles`/`bwHoldingsFor`,
  `prices.json`, `pdf-templates/`.
- **At most ONE `Edit` to `index.html`**, then Node scripts (`PostToolUse:Edit` opens the file in
  the Browser pane with live network — `DESIGN.md` §6).
- **CRLF line endings** in `index.html`; a `\n` multi-line match silently fails. Note the irony
  that your parser must handle both — that is data, not source.
- **`</body>` appears more than once** — use `lastIndexOf`.
- **Stage explicit paths**, never `git add -A`. **Never push.**

---

## Verification — quote verbatim

1. `npm run check` → `index.html: 8 blocks, 0 errors`
2. `npm test` → counts at or above where Track B left them; none may fall. Compare per-suite.
3. Baseline 14/14 identical — dev server on 3737 first, `TAG=s04-c node scripts/baseline-capture.mjs`
   + `node scripts/baseline-sign.mjs`, diffed by **content** against
   `%TEMP%\bw-baseline\before\signatures.json`.
4. **New suite `tests/test-contact-csv.mjs`:**
   - parser: BOM, quoted comma, quoted newline, `""` escape, CRLF, LF, ragged row, trailing blank
   - `parse(serialise(x))` round-trips a fixture with a comma, a quote, a newline, a leading `+`
   - auto-mapper maps a realistic foreign header set, and **reports** the columns it skipped
   - a label-valued taxonomy cell resolves to its code; an unrecognised one is dropped **and
     counted**, not invented
   - duplicate skip fires on exact email and on 10-digit phone; a name-only match does **not**
     skip
   - **the end-to-end one that matters:** import `data/demo-contacts.csv` into a fake DB →
     assert exactly 30 parties created (or 29 + 1 duplicate skipped, whichever your file
     specifies — state the number and assert it) → assert each of the five default views returns
     its expected count → **undo the batch** → assert the store is byte-identical to its state
     before the import, and that the batch record is gone
   - undo refuses to delete a party that has gained a `contractRole`, and says so
5. **Sabotage:** make undo skip one id and confirm the byte-identical assertion goes red. Confirm
   you broke what you aimed at.
6. **Read the demo file back and prove it is clean**: no `@` domain other than `example.com`, no
   phone outside `555-01xx`, and diff its names against nothing in `wmp-cemetery-map/` (do this
   as a check that no name in the CSV appears in the map data — and do **not** print any map name
   in your report, only the count).

---

## Report format

What shipped · branch + commits · verification output verbatim · files changed · decisions and
open questions · what the director must verify by hand.

State plainly anything unverified. The operator will run your import against real production
data on the strength of this report — if any part of the undo path is untested, that sentence is
the most important one in it.
