# Sprint 04 — Contacts becomes a CRM

**Runs ROADMAP milestone S8** (added by this sprint; see the numbering note in `ROADMAP.md`).

**Goal:** the Contacts page stops being a list of people and becomes the surface a counselor
works *from* — classification, notes, follow-ups, real search, saved views, and a generic CSV
import so a book of contacts can get in and out without hand-typing.

**Operator brief, 2026-07-27, verbatim in substance:** *"our contacts page needs to be much more
robust. I want it to take some things from funeraldecisions ... but then make some of the
searches better. right now it is just a contacts page."* And: *"a generic csv import would help,
not necessarily specific to FDCRM but keep it open to this. remember the main goal of this whole
project is to make the best tool in the industry not an identical one. we can take from what is
good and remove what is bad."*

Design authority for the details was delegated to the director on 2026-07-27 (*"I'm giving you
autonomy to make decisions on exactly how this should look"*), with a standing instruction to
look at CRMs inside and outside the industry for reference. The decisions that came out of that
are recorded in **§Design decisions** below and are binding on the tracks.

---

## Measured reality — checked 2026-07-27, not inherited

Everything here was read out of the code, not recalled. Numbers are the population unless the
line says otherwise.

| Thing | Measured |
|---|---|
| `index.html` | 2,545,399 bytes raw, **18,091 lines** |
| Contacts section markup | `index.html:2820–2837` (`#section-contacts`), editor overlay `2840–2894`, link offer `2896–2909`, picker `2911–2926` |
| Contact layer JS | `index.html:11572–12200` ish — store, roles, holdings, list, detail, editor, picker |
| Party fields the editor actually writes | `prefix, given, family, suffix, middle, nickname, salutation, dob, engagement, interest, phones, emails, addresses` — **13**, and that is the whole record |
| Search today | ONE box, `index.html:11827`, substring over name + nickname + primary phone + primary email. Plus an "Only mine" checkbox. |
| `contactNotes` / `contactTasks` / `savedViews` / `nextAction` in the file | **0 occurrences each** |
| `section-settings` | **0** — there is no settings screen to hang taxonomies off |
| `type="file"` / CSV parser / papaparse | **0 / 0 / 0** — no upload path of any kind exists |
| `test-contacts.mjs` | 277 lines, 47 assertions |
| Suite on `main` at boot | `8 blocks, 0 errors`; `636 passed, 0 failed across 19 suites` |

**Existing pieces the tracks build ON, not around:**

- `saveParty()` / `deleteParty()` (`11724`, `11740`) — per-record `parties/<id>.set()`. Correct
  already; do not replace.
- `contractRoles` + `bwHoldingsFor()` (`11898`) — "what this family owns". Untouched by this
  sprint.
- `bwFindPossibleDuplicates()` (`11791`) — last-name + first-initial match. Soft, warns, never
  blocks. Track C reuses it; nobody rewrites it.
- `bwPartyIsValid()` (`11647`) — a contact needs a name **or** a contact method. This is why the
  tool has no junk records, and it is load-bearing for §Design decision D10.
- `BW_ROLES` (`11597`) — the existing precedent for "taxonomy as data, not an enum". Every new
  taxonomy copies its shape.
- `BW_RECORD_TYPES` (`11877`), `_ceEsc` (`11804`), `.ct-card` / `.ct-pill` / `.ce-lbl` / `.ce-in`
  (`index.html:255–261`) — reuse, don't reinvent.

---

## What we took from FuneralDecisions, and what we deliberately left

Read from the **FDCRM Training Manual** (203 pp.) plus a screenshot of Bonney Watson's own home
screen, both supplied 2026-07-27.

**Taken — these are genuinely good and we have nothing like them:**

| FDCRM | Why it earns its place here |
|---|---|
| Source / Status / Category on every contact | Three orthogonal axes. Without them there is nothing to filter *on*, which is the whole complaint. |
| Flags | Free tagging, many-per-contact, for the groupings the three axes don't predict. |
| Notes, timestamped, newest first, pinnable | The actual record of a relationship. |
| To-Dos with a due date | Turns "I should call them" into something the tool can count. |
| Advanced filter: field + operator + value | is / is not / contains / doesn't contain / begins / ends. Real query building. |
| Saved searches, pinned to the home screen | His FDCRM home shows 12 of them. This is how he actually navigates. |
| Bulk action on a filtered set | Batch note, set status, add flag, export. |
| Generic CSV import with column mapping | The only way a book of contacts ever gets in. |

**Left out on purpose — "remove what is bad":**

| Not building | Why |
|---|---|
| **Work Groups as a destination** | FDCRM makes you *send results to a Work Group*, a separate screen with its own state, before you can act. Modern list UX (and every CRM UX study in the 2026 round-up) selects rows in place and shows an action bar. Same power, one screen fewer, no stale group to forget about. |
| **Static vs dynamic saved groups** | Two concepts for one job. Every view here is dynamic because a view IS a query (D1). "Static" is what a flag is for. |
| **The `#GroupName` note-hashtag hack** | Manual p.99 tells *counselors* to type `#GroupName` into a note because they aren't allowed to create flags. That is a permissions workaround leaking into the data model. Both our users can create flags. |
| **A separate "Search for Duplicates" screen** | The check belongs at the moment of creation and at import, not as an errand. `bwFindPossibleDuplicates()` already runs inline in the editor. |
| **"Missing Email Address" / "No Salutation" / "No Comma"** as saved searches | Four of the twelve saved searches on his home screen are janitorial — they exist because FDCRM lets you save a blank contact. This tool refuses to (`bwPartyIsValid`). Replaced by **one** Data Health view that lists what is incomplete and lets him fix it inline (D10). |
| Email blasts, letter templates, autoresponders, autoflows, landing pages, mail merge, digital signatures, self-scheduler | Each is its own sprint or its own product. Out. |
| Appointments + calendar | Operator decision, 2026-07-27: **later**. To-Dos with due dates cover the follow-up need now. |
| Attachments | Needs Firebase Storage, which is not enabled. Out until it is. |
| Work Orders | `DESIGN.md` §1 standing non-goal. Do not re-propose. |
| Administrator vs Counselor tiers | `DESIGN.md` §1 — two users, no roles until a second *kind* of user exists. |

**And one thing neither FDCRM nor most of the field does, which we are building because the
research says it is the whole game:** 80% of pre-need sales take five or more follow-ups and 44%
of sellers stop after one. So the default view is not "all contacts" — it is **who is due**.
See D4 and the Needs-Follow-Up view.

---

## Design decisions (director, under delegated authority 2026-07-27)

These are binding. A track that wants to deviate escalates in its report; it does not just choose.

**D1 — A view is a URL. Filters live in the hash.**
`#contacts?status=active&source=walk-in&flag=veteran&q=smith&sort=next`. The tool already has a
hash router with exactly this grammar (`DESIGN.md` §7 — split on the first `?`, unknown params
ignored, unknown route falls back). Consequences, all of them wanted: a filtered list survives
opening a contact and coming back (the single most-cited CRM list complaint in the 2026 UX
round-up); a view is bookmarkable and pasteable to Randy; and **a saved view is just a stored
hash**, which means every saved view is dynamic by construction and there is no second "static"
concept to build. Unknown filter params must be ignored, never fatal — a saved view from a
future version must not white-screen an older one.

**D2 — Selection is in place; there is no work-group screen.**
Checkbox column on the list. Selecting anything raises a sticky action bar reporting the count,
with: Add note to all · Set a to-do for all · Change status / source / category · Add or remove
a flag · Export CSV · Clear. Bulk writes go one record at a time through `saveParty()`.

**D3 — Every new store is per-record, one Firebase node per record.**
`contactNotes/<id>`, `contactTasks/<id>`, `savedViews/<id>`, `crmTaxonomy/<kind>/<code>`. Child
listeners, in-memory derived views — the exact pattern `_attachContactListeners()` already uses.
**No new code may `.set()` a whole collection node.** That call shape has destroyed real data
twice on this project (2026-07-11, 2026-07-16) and `persistSavedQuotes()` is the one remaining
example, not a template.

**D4 — `nextActionAt` and `lastActivityAt` are DERIVED, never stored.**
`nextActionAt(party)` = earliest `dueOn` among that party's **open** tasks, else null.
`lastActivityAt(party)` = max of `updatedAt`, newest note `createdAt`, newest task `doneAt`.
Storing either means backfilling records that already exist and then keeping two things in sync
forever; deriving means they cannot drift and there is no migration (and there is no migration
mechanism — `DESIGN.md` §3). With two users and a few thousand contacts the cost is nothing.

**D5 — Taxonomies are editable data with code defaults.**
`BW_SOURCES`, `BW_STATUSES`, `BW_CATEGORIES`, `BW_FLAGS` ship as arrays shaped like `BW_ROLES`
and are the fallback. A Settings screen edits them into `crmTaxonomy/<kind>/<code>`; the live
list is the Firebase set if present, else the code array. **A contact stores the code, never the
label** — renaming "Walk-in" to "Walk In" must not orphan 200 records, and per `DESIGN.md` §1
nothing may assume a single site's vocabulary. A code that no longer resolves renders as the raw
code with a muted style, never as blank.

**D6 — We write our own CSV parser. No vendored library.**
~60 lines, RFC 4180: quoted fields, embedded commas, `""` escapes, CRLF, a BOM on the front
because Excel puts one there. Sprint-01 spent a whole sprint taking 9.4 MB out of this file;
adding PapaParse back to save an hour is the wrong trade. Parser is pure and gets its own unit
assertions, including the Excel BOM and a quoted field containing a newline.

**D7 — Every import is one batch, and every batch is undoable.**
Each imported record carries `_prov = { src: 'csv-import', ref: <batchId>, at: <ts> }`. The
batch is recorded at `importBatches/<id>` with the filename, row count, timestamp and the list
of created party ids. "Undo this import" deletes exactly those ids and nothing else. This is
what makes it acceptable to import into a live database at all, it is the property the demo data
depends on, and FDCRM has no equivalent.

**D8 — Import duplicate policy: skip on exact contact-method match, and say so.**
A row is a duplicate if its email matches an existing email exactly (case-insensitive), or its
phone matches an existing phone on all 10 digits. Those rows are **skipped by default** and
listed by name and row number in the result. A name-only match is *not* a duplicate — it warns,
and the row imports. A checkbox allows importing duplicates anyway. Never merge automatically.

**D9 — The list is the product; the detail is a panel.**
Columns: Name · Status · Source · Next action · Last activity · Owner. Sortable. Next action
renders as a relative badge — red overdue, amber today, plain future, muted "none". A counselor
should be able to answer "who do I call today" without typing anything.

**D10 — One Data Health view replaces four janitorial saved searches.**
Rows where: no email AND no phone · no source · no status · no salutation · a phone that isn't
10 digits. Each row is fixable inline from that view. It is a worklist, not a filter you have to
remember to run.

---

## Scope

**In:** everything in the three track files below — classification, flags, notes, to-dos,
derived next-action, settings screen, list rewrite with selection and bulk actions, basic and
advanced filtering, hash-encoded views, saved views, the five default views, CSV import with
column mapping and undo, CSV export, and a 30-row synthetic demo file.

**Out:** everything in the "left out on purpose" table. Also out: any change to the quoting
path, the contract generators, `contractRoles`/holdings behaviour, or `prices.json`. The
contact layer is standalone by design (`index.html:2818`) and stays that way.

---

## Gate 0 — clear

Nothing blocks the first track. Verified 2026-07-27 at boot: working tree clean, `main` level
with `origin/main` (0 ahead, 0 behind), `npm run check` → `index.html: 8 blocks, 0 errors`,
`npm test` → `636 passed, 0 failed across 19 suites`, no stale worktrees, no listener on 3737.

The operator questions this sprint needed were asked and answered on 2026-07-27:

| Question | Answer |
|---|---|
| Replace FDCRM or complement it? | *Generic* CSV import, kept open to an FDCRM export. Goal is the best tool in the industry, not a clone. |
| How do 30 live fake contacts get in? | **Build CSV import first; Martice imports a demo file himself.** No agent ever writes to production. |
| Where do Source/Status/Category values come from? | Sensible cemetery/funeral defaults, editable in-app. |
| Appointments and calendar? | Later. |

---

## Tracks — three, sequential

| # | Track | Branch | Model | Depends on |
|---|---|---|---|---|
| A | The contact record — taxonomies, flags, notes, to-dos, settings | `s04/contact-record` | Opus | — |
| B | Finding people — list, filters, saved views | `s04/contact-search` | Opus | A merged |
| C | CSV in and out — import, mapping, undo, export, demo file | `s04/contact-csv` | Opus | A + B merged |

**Deviation from `SPRINT_GUIDELINES.md` §"What a sprint is", logged here and in `STATE.md`.**
That rule caps a sprint at 1–2 tracks, and its stated reason is that *parallel* tracks in one
17k-line CRLF file produce two large diffs that merge by hand. These three run **strictly
sequentially**, each branching from a `main` that already carries the previous merge, so they
can never conflict with each other. Three reviewable diffs of ~600 lines audit far better than
one of ~1,800. The guideline is being read as a cap on parallelism, not on sequence; the wording
is amended in the same `[s04/ops]` commit.

**Merge order: A, then B, then C.** Each is audited and merged before the next spawns. Nothing
runs in a worktree — there is never more than one track live, so they all work in the main tree.

---

## Verification

**The generator baseline is the safety net and it costs nothing.** This sprint must not move a
single number on any generated document. All 14 signatures stay byte-identical to
`%TEMP%\bw-baseline\before`. If a contact-layer change reaches a contract, that gate goes red —
which is exactly what should happen, because it would mean the scope boundary broke.

Standing gates, every track, quoted verbatim in its report:

- `npm run check` → `index.html: 8 blocks, 0 errors`
- `npm test` → at least `636 passed, 0 failed across 19 suites`; counts rise, never fall
- `node scripts/baseline-capture.mjs` with `TAG=s04-<track>` + `scripts/baseline-sign.mjs`,
  diffed against the reference → **14/14 identical**

New gates this sprint, one per track, each named in its track file:

- **A** — a taxonomy code that no longer resolves still renders (never blank); a note and a task
  survive a `saveParty()` on their party (proves D3 — they are not nested and cannot be wiped);
  derived `nextActionAt` matches a hand-computed expectation over a fixture.
- **B** — every filter round-trips through the hash: build a filter, read `location.hash`, reload
  from that hash alone, assert the same id set. An unknown param is ignored, not fatal.
- **C** — parser unit cases (BOM, quoted comma, quoted newline, CRLF, ragged row); and the
  end-to-end one that matters: **import `data/demo-contacts.csv` into a fake DB, assert 30
  parties created, assert the five default views return their expected counts, then undo the
  batch and assert the store is byte-identical to before the import.**

**No test may read a value from the same constant the code reads** — assert against rendered DOM
or a generated artifact. That rule caught a hollow test in sprint-03.

---

## Definition of done

1. A contact carries source, status, category and flags; all four are editable in-app and stored
   as codes.
2. Notes and to-dos exist per contact, in their own nodes, and survive a party save.
3. The list answers "who do I call today" without typing — next action is a column and the
   default sort.
4. A filter is expressible in the URL, survives navigation, and can be saved by name.
5. The five default views ship and are correct against the demo data.
6. A CSV of contacts imports with column mapping, skips exact-contact-method duplicates, reports
   what it skipped, and **can be undone completely**.
7. `data/demo-contacts.csv` exists: 30 synthetic contacts, 555-range phones, `@example.com`,
   invented names, shaped so each of the five views is non-empty.
8. Zero production Firebase writes by any agent, at any point.
9. `npm run check` and `npm test` green with counts risen, and 14/14 baseline signatures identical.

## Close gate — operator

1. Review the three merges on local `main`.
2. `git push origin main` — **only on Martice's explicit go.** Live public deploy.
3. On the live site: Contacts → Import → pick `data/demo-contacts.csv` (or the "Load demo data"
   link) → map → preview → import. **That is the first and only write of demo data, and it is
   his.**
4. Confirm the 30 land, the views light up, then either keep them or hit **Undo this import**.

## Risks

| Risk | Mitigation |
|---|---|
| A change leaks into the quoting path | The 14 generator signatures. Green before every merge. |
| Import writes badly into live data | D7 batch undo; D8 duplicate skip; per-record writes only; and the operator drives the import himself. |
| Whole-node `.set()` creeps back in | D3, and an assertion that the new stores are only ever written per-record. |
| The list rewrite reintroduces the focus bug | The search input stays **outside** the container that `innerHTML` rebuilds — it is outside today (`#contactSearch` at `2827`, `#contactsList` at `2835`) and that is the only reason contacts don't have the saved-list focus bug (ROADMAP S3). Track B must keep it that way and assert it. |
| Scope inflation into email/campaigns | The "left out on purpose" table is binding. |
