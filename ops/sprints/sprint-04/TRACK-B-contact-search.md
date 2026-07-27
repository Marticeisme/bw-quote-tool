# TRACK B — Finding people

**Branch:** `s04/contact-search`, cut from `main` **after Track A has merged**. **Working
directory:** `C:\Users\Martice\bw-quote-tool` (main tree — you are the only track running).
**Model:** Opus. **Read first:** `ops/DESIGN.md`, `ops/SPRINT_GUIDELINES.md`,
`ops/sprints/sprint-04/SPRINT.md` (**§Design decisions D1–D10 bind you**), and
`ops/sprints/sprint-04/TRACK-A-contact-record.md` plus Track A's actual merged diff — A defines
the fields you filter on, and **A's report is a claim; the code is the fact.**

The complaint you are fixing, in the operator's words: *"right now it is just a contacts page."*
It has one search box doing substring matching over four fields. You are turning it into the
surface he works from.

**Line numbers below are DIRECTOR RECON — a lead, not a finding.** They were read on 2026-07-27,
before Track A edited the file. Verify every one.

---

## What exists

- `#section-contacts` markup at `index.html:2820–2837`: a search input (`#contactSearch`), an
  "Only mine" checkbox, a "+ New Contact" button, `#contactsList`, `#contactDetail`.
- `renderContactsList()` (`~11822`): if a contact is open it defers to `renderContactDetail()`;
  otherwise it filters `_parties` by substring and rebuilds `#contactsList.innerHTML`.
- **The search input is OUTSIDE `#contactsList`.** That is the only reason Contacts does not have
  the saved-quote focus bug (ROADMAP S3), where an `innerHTML` rebuild on every keystroke
  destroys and recreates the `<input>` and loses focus. **Keep every persistent control outside
  the rebuilt container, and assert it.**
- Routing: `show(id, navEl)` mirrors into `location.hash`; `bwRoute(fallbackId)` handles
  `hashchange`. The grammar is in `DESIGN.md` §7 — split on the first `?`; `#route=value` is
  shorthand; **unknown params are ignored and an unknown route falls back to the overview**;
  `+` means space, so decode with a `+`→space pass, not `decodeURIComponent` alone. There is a
  re-entrancy guard pattern on the map side (`bwRouting`) worth copying so
  setRoute→hashchange→applyRoute cannot loop.
- From Track A: `p.source`, `p.status`, `p.category`, `p.flags[]`, `bwTaxonomy(kind)`,
  `bwNextActionFor(partyId)`, `bwLastActivityFor(partyId)`, `bwNextActionState(dueOn)`,
  the note and task stores and their by-party indexes.

---

## What to build

### 1. The list (D9)

Replace the card list with a table: **Name · Status · Source · Next action · Last activity ·
Owner**, plus a leading checkbox column. Sortable by clicking a header; default sort is next
action ascending with overdue first, so the top of the screen answers "who do I call today".

Next action renders from `bwNextActionState`: red = overdue, amber = today, plain = future,
muted "—" = none. Last activity renders relative ("12 days ago").

Keep it readable at 1100px. Name and next action are the two columns that must never truncate.

### 2. Filters (D1)

**Basic bar**, always visible: Status · Source · Category · Flag · Owner (Mine / Randy / Anyone),
each a select; plus the free-text box that already exists, now searching name, nickname, **all**
phones and emails (not just primary), and note bodies.

**Advanced builder**, behind a "＋ Add filter" control: rows of *field · operator · value*, joined
by AND or OR (one join mode for the whole set — do not build a nested tree). No cap on rows;
FDCRM's limit of 6 is a server-side constraint we don't have.

Operators: `is`, `is not`, `contains`, `doesn't contain`, `begins with`, `ends with`,
`is empty`, `is not empty`; and for dates `before`, `after`, `on`. The value control is a select
when the field is a taxonomy and a text/date input otherwise — mirror the manual's behaviour
(p.91), it is the right call.

Filterable fields at minimum: name, first, last, email, phone, city, state, ZIP, source, status,
category, flag, owner, interest, date of birth, created date, last activity, next action date,
open to-do count, note text.

**Active filters show as chips** with an × on each and a "Clear all". A user must be able to see
what is being applied without opening the builder.

### 3. Filters live in the URL (D1)

Every filter serialises into the hash: `#contacts?status=working&source=walk-in&flag=veteran&q=smith&sort=next&dir=asc`.
Advanced rows serialise compactly and reversibly — you choose the encoding, document it in a
comment, and prove the round-trip in a test.

Consequences that are requirements, not side effects:

- Opening a contact and closing it returns to the **same filtered list**. This is the most-cited
  complaint about CRM lists and the tool gets it free from the router.
- A view is pasteable to the other counselor.
- **An unrecognised param is ignored, never fatal.** A saved view written by a later version must
  not white-screen an earlier one.

### 4. Saved views — `savedViews/<id>` (D3)

```
{ id, name, hash, pinned, ownerUid, createdAt, createdBy, updatedAt, updatedBy, _prov }
```

Per-record writes only. "Save this view" names the current hash. Saved views list in a panel on
the Contacts page; pinned ones surface at the top. Rename and delete. Because a view **is** a
query, every one is dynamic — there is no static variant to build (D1).

### 5. The five default views

Ship as built-ins, always present, not stored records:

| View | Definition |
|---|---|
| **Needs follow-up** | has an open to-do with `dueOn` ≤ today |
| **Unworked** | status is `new` or `working`, **no** open to-do, and no note in 30 days |
| **New this week** | `createdAt` within the last 7 days |
| **No next action** | status not `sold` / `not-interested` / `do-not-contact`, and zero open to-dos |
| **Data health** (D10) | no email AND no phone · or no source · or no status · or no salutation · or a phone that isn't 10 digits |

Each shows a live count. **Data health rows are fixable inline** — click the missing field, type,
Enter, saved. That is the whole point of it being a worklist rather than a filter.

### 6. Selection and bulk actions (D2)

Checkbox per row, select-all-in-view in the header. Any selection raises a sticky bar: *"7
selected"* — Add note to all · Set a to-do for all · Change status / source / category · Add or
remove a flag · Export CSV · Clear.

Bulk writes go **one record at a time** through `saveParty()` / `saveContactNote()` /
`saveContactTask()`. Never a whole-node write. Show progress and report partial failure honestly
— "5 of 7 updated, 2 failed" beats a spinner that lies.

Export CSV here is a plain client-side download of the selected rows; Track C owns the full
import/export path and will reuse whatever you write, so keep it in one function with a clear
name.

---

## Hard constraints

- **No production Firebase writes.** Ever, for any reason. Tests use `tests/fake-firebase.js`.
  A save/persist call from a test script wiped real data on 2026-07-11.
- **Never `.set()` a whole collection node** — only `savedViews/<id>.set(record)`.
- **Do not touch** the quoting path, contract generators, `contractRoles`/`bwHoldingsFor`,
  `prices.json`, `pdf-templates/`. A generator in your diff means the scope boundary broke.
- **Keep persistent controls outside the `innerHTML`-rebuilt container.** Assert it.
- **At most ONE `Edit` to `index.html`**, then Node scripts — every `Edit` fires a harness-level
  `PostToolUse:Edit` hook that opens the file in the Browser pane against live network
  (`DESIGN.md` §6).
- **CRLF line endings.** A `\n` multi-line match silently fails.
- **`</body>` appears more than once** — use `lastIndexOf`.
- **Stage explicit paths**, never `git add -A`. **Never push** — commit locally and stop.
- **No real customer data**; synthetic fixtures only (555 phones, `@example.com`, invented names).

---

## Verification — quote verbatim

1. `npm run check` → `index.html: 8 blocks, 0 errors`
2. `npm test` → at least whatever Track A left it at; counts rise, none fall. Compare per-suite.
3. Baseline, 14/14 identical — dev server listening on 3737 first, then
   `TAG=s04-b node scripts/baseline-capture.mjs` + `node scripts/baseline-sign.mjs`, diffed
   against `%TEMP%\bw-baseline\before\signatures.json`. **Compare content, not hashes across two
   serializers.**
4. **New suite `tests/test-contact-search.mjs`**, including:
   - **the round-trip**: build a filter set in the UI, read `location.hash`, reload the page from
     that hash alone, assert the resulting id set is identical. Do this for a basic filter, an
     advanced multi-row filter, and a sort.
   - an unknown param (`&zzz=1`) is ignored and the view still renders
   - each of the five default views returns the hand-computed expected ids over a fixture
   - every operator is exercised at least once, including `is empty` and the date comparators
   - selection survives a re-render; bulk status change writes N individual records and zero
     collection-level writes (assert against the fake DB's call log)
   - the search input keeps focus across a re-render triggered by typing
5. **Sabotage one gate and report what went red.** Suggested: break the hash serialiser so one
   filter is dropped, and confirm the round-trip assertion fails. Confirm the sabotage broke what
   you aimed at — a sprint-02 sabotage hit the wrong object and passed, which would have been
   reported as a working gate.

---

## Report format

What shipped · branch + commits · verification output verbatim · files changed · decisions and
open questions · what the director must verify by hand. Say plainly what you could not verify.
