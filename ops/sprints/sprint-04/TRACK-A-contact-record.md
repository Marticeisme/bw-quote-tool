# TRACK A — The contact record

**Branch:** `s04/contact-record`, cut from current `main`. **Working directory:**
`C:\Users\Martice\bw-quote-tool` (main tree — no worktree; you are the only track running).
**Model:** Opus. **Read first:** `ops/DESIGN.md`, `ops/SPRINT_GUIDELINES.md`, and
`ops/sprints/sprint-04/SPRINT.md` — its **§Design decisions D1–D10 are binding on you.**

You are giving the contact record the fields and the activity history it does not have.
Track B (search) and Track C (CSV import) build directly on what you define here, so your
data shapes are a contract, not an implementation detail.

**Everything under "The ground you're standing on" is DIRECTOR RECON — a lead, not a finding.**
Line numbers were read on 2026-07-27 and drift with every edit. Verify each one before you rely
on it. A previous sprint's recon on this file was wrong twice (it undercounted 37 hardcoded
sites as ~19 and asserted a runtime behaviour that did not exist); the only reason it was caught
is that the track checked instead of building on it. Do the same.

---

## The ground you're standing on

- Contact layer JS starts at `index.html:11572` with a comment block stating the conventions —
  money in integer cents in a field ending `Cents`, calendar dates as `YYYY-MM-DD`, timestamps
  as epoch ms, every record carries `_prov`, every record carries `ownerUid`. **Obey all of
  them.** A to-do's `dueOn` is a DAY (`YYYY-MM-DD`), not a timestamp.
- `BW_ROLES` (`~11597`) is the precedent for every taxonomy you add: an array of
  `{ code, label, ... }` in code, looked up by a `bwXLabel(code)` helper that returns the raw
  code when it doesn't resolve. Copy that shape exactly.
- `_attachContactListeners()` (`~11691`) is the precedent for every store you add: `child_added`
  / `child_changed` / `child_removed` on a collection path, an echo guard that compares
  `JSON.stringify`, a store object keyed by id, and a rebuild function. Copy that shape exactly.
- `saveParty()` (`~11724`) writes `parties/<id>.set(p)`. `_bwStamp()` (`~11625`) sets
  `createdAt/createdBy/updatedAt/updatedBy`. `bwProv(src)` (`~11622`) builds `_prov`.
- `_ceEsc()` (`~11804`) is the HTML escaper. **Every string you interpolate into `innerHTML`
  goes through it** — notes are free text typed by a user and will eventually contain `&` and
  `<`.
- CSS you should reuse rather than invent: `.ct-card`, `.ct-pill`, `.ce-lbl`, `.ce-in`
  (`index.html:255–261`). Colour tokens `--navy`, `--orange-dark`, `--orange-tint`,
  `--blue-light`, `--gray-light`, `--gray-mid`, `--border`, `--text-light`, `--ink`.
- The contact detail view is `renderContactDetail()` (`~11942`); it currently renders an
  identity card plus "What this family owns". The editor overlay markup is `index.html:2840`,
  its logic `openContactEditor()` (`~12006`) / `submitContactEditor()` (`~12047`).
- There is **no settings section anywhere in the file** — `section-settings` matches 0 times.
  You are creating the first one.

---

## What to build

### 1. Four taxonomies, as data (D5)

Add alongside `BW_ROLES`:

```
BW_SOURCES     — where the contact came from
BW_STATUSES    — where they are in the relationship
BW_CATEGORIES  — what kind of business they represent
BW_FLAGS       — free tags, many per contact, each with a colour
```

Ship these defaults. They are the director's call under delegated authority; Martice renames
them in the UI without a code change, which is the point.

- **Sources:** `walk-in`, `referral`, `direct-mail`, `web-lead`, `phone-in`, `at-need-family`,
  `community-event`, `existing-owner`, `cold-call`, `other`
- **Statuses:** `new`, `working`, `appointment-set`, `presented`, `sold`, `idle`, `not-interested`,
  `do-not-contact`
- **Categories:** `pre-need-cemetery`, `pre-need-funeral`, `at-need`, `existing-owner`,
  `veteran`, `family-of-record`, `other`
- **Flags:** `veteran`, `spanish-speaking`, `payment-plan`, `vip`, `estate`, `do-not-mail` —
  each `{ code, label, color }`, colour from the existing token set.

Rules:

- A party stores **the code**, never the label. `p.source`, `p.status`, `p.category` are single
  codes; `p.flags` is an array of codes (omit the key entirely when empty — Firebase drops empty
  arrays, so read it as `(p.flags || [])` everywhere).
- `bwSourceLabel()` / `bwStatusLabel()` / `bwCategoryLabel()` / `bwFlagLabel()` return the label,
  or **the raw code** when it doesn't resolve, styled muted. Never blank. Assert this.
- The live list for each kind is the Firebase set at `crmTaxonomy/<kind>/<code>` if any record
  exists there, else the code array. One accessor — `bwTaxonomy('sources')` — and everything
  reads through it.
- `p.engagement` already exists with values `active` / `idle` / `do-not-contact` and is used at
  `renderContactDetail` (~11955) to show a "Do not contact" pill. **Statuses subsume it.**
  Migrate it: keep reading `p.engagement` as a fallback when `p.status` is absent, map
  `do-not-contact`→`do-not-contact` and `idle`→`idle`, and write only `p.status` going forward.
  Do NOT bulk-rewrite existing records — there is no migration mechanism (`DESIGN.md` §3), and a
  read-time fallback costs one line. Say in your report exactly how you handled it.

### 2. Notes — `contactNotes/<id>` (D3)

```
{ id, partyId, body, pinned:false, createdAt, createdBy, updatedAt, updatedBy, _prov }
```

- Store `_noteStore`, index `_notesByParty`, listener in the same registration array as `parties`
  and `contractRoles`.
- `saveContactNote(n)` / `deleteContactNote(id)`, per-record `.set()` / `.remove()`.
- Newest first; pinned notes above everything, then by `createdAt` descending.
- UI in the contact detail: a **Notes** tab, an "Add note" textarea that expands, each note
  showing body, author (resolve the uid through `BW_USERS` the way the advisor work does — if
  that is awkward, show the uid rather than nothing), timestamp, a pin toggle and a delete.

### 3. To-dos — `contactTasks/<id>` (D3)

```
{ id, partyId, summary, dueOn:'YYYY-MM-DD', category, status:'open'|'done',
  doneAt, assignedTo, createdAt, createdBy, updatedAt, updatedBy, _prov }
```

- `saveContactTask(t)` / `completeContactTask(id)` / `deleteContactTask(id)`. Completing sets
  `status:'done'` and `doneAt`; it never deletes.
- `category` reuses `BW_CATEGORIES`? **No** — a to-do category is a different vocabulary. Add a
  fifth small taxonomy `BW_TASK_KINDS`: `call`, `email`, `letter`, `visit`, `follow-up`,
  `paperwork`, `other`. Same data-not-enum rule.
- UI: a **To-Dos** tab in the contact detail — open ones first sorted by `dueOn` ascending,
  completed ones collapsed below. Add form: summary, due date, kind. One-click complete.

### 4. Derived next action and last activity (D4)

```
bwNextActionFor(partyId)   -> { dueOn, summary, taskId } | null   // earliest OPEN task
bwLastActivityFor(partyId) -> epoch ms                            // max(updatedAt,
                                                                  //     newest note createdAt,
                                                                  //     newest task doneAt)
```

**Store neither.** Both are pure functions over the in-memory stores. Track B's whole list view
depends on these two, so they must be correct and they must be cheap — index by party, don't
scan every task per row.

Also add `bwNextActionState(dueOn)` returning `'overdue' | 'today' | 'future' | 'none'` against
**local** today. Track B renders the badge from it; you own the rule so there is exactly one.

### 5. Editor and detail

- Contact editor overlay (`index.html:2840`) gains **Source**, **Status**, **Category** selects
  and a flag multi-select, populated from `bwTaxonomy()`. Replace the existing `Engagement`
  select with `Status`. Keep `Interested in` as-is — Track B filters on it.
- Contact detail gains a tab strip: **Overview** (what exists today) · **Notes** · **To-Dos**.
  Pills for status / source / category / flags under the name.
- The detail is re-rendered by `renderContactsList()` when `_bwDetailId` is set (`~11825`).
  Your new stores' rebuild functions must trigger the same refresh, or a note added in one
  browser won't appear in the other.

### 6. Settings screen

A new section `#section-crm-settings`, reachable from the Contacts page (a small "Settings" link
in the header row — do **not** add a top-level nav item; there are 36 already). Four editable
lists: add, rename, remove, reorder. Writes per-record to `crmTaxonomy/<kind>/<code>`.

**Removing a taxonomy value must not silently orphan contacts.** Before removing, count the
contacts using it and say so ("3 contacts use Walk-in — remove anyway? They will show the raw
code until you reassign them."). Removal is allowed; silence is not.

---

## Hard constraints

- **No production Firebase writes.** Not to check something works, not once. Tests run against
  `tests/fake-firebase.js`. Reads are fine; writes have destroyed real data on this project
  twice. If you think you need a live write, you are wrong — stop and say so in your report.
- **Never `.set()` a whole collection node.** Only `<collection>/<id>.set(record)`.
- **Do not touch** the quoting path, any contract generator, `contractRoles`, `bwHoldingsFor`,
  `prices.json`, or anything under `pdf-templates/`. If your diff touches a generator, you have
  broken the scope boundary.
- **At most ONE `Edit` to `index.html`**, then work through Node scripts. Every `Edit` fires a
  harness-level `PostToolUse:Edit` hook that opens the file in the Browser pane with live
  network access, booting the app against production Firebase (`DESIGN.md` §6). Firebase rules
  are `auth !== null` so an unauthenticated boot can't read or write, but don't lean on that.
- **Line endings are CRLF.** A multi-line match using `\n` in a Node script silently matches
  nothing. Match on `\r\n` or normalise deliberately.
- **`</body>` appears more than once** — the first is inside a print-window template string. Use
  `lastIndexOf`, never `.replace('</body>', …)`.
- **Stage explicit paths.** Never `git add -A` / `git add .` — another session has in-flight
  edits in this tree, and the pre-git hook blocks bulk adds anyway.
- **Never push.** Commit locally to `s04/contact-record` and stop. Every push is an operator
  gate, feature branches included.
- **No real customer data.** Fixtures are synthetic: 555-range phones, `@example.com`, invented
  names. Nothing from `wmp-cemetery-map/` crosses into this repo in any form.

---

## Verification — quote all of it verbatim in your report

1. `npm run check` → must print `index.html: 8 blocks, 0 errors`
2. `npm test` → at least `636 passed, 0 failed across 19 suites`. Counts rise; **none may fall**.
   Compare per-suite numbers, not just the exit code.
3. Generator baseline, all 14 identical:
   ```
   node dev-server.mjs            # in the background, port 3737, must be listening first
   TAG=s04-a node scripts/baseline-capture.mjs
   node scripts/baseline-sign.mjs
   ```
   then diff `signatures.json` against `%TEMP%\bw-baseline\before\signatures.json`. **Compare
   content, not hashes across serializers** — a previous session nearly declared a good build
   broken because Node's `JSON.stringify` and Python's `json.dumps` space things differently.
4. **New suite `tests/test-contact-record.mjs`**, and it must include:
   - a taxonomy code with no matching entry renders as the raw code, not blank
   - a note and a task both survive a subsequent `saveParty()` on their party (proves D3)
   - `bwNextActionFor` returns the earliest **open** task and ignores completed ones
   - `bwNextActionState` is correct for yesterday / today / tomorrow / no-task
   - `bwLastActivityFor` picks the newest of the three sources
   - removing a taxonomy value in use reports the count rather than failing silently
   - a party with `engagement:'do-not-contact'` and no `status` still reads as do-not-contact
5. Prove one thing by **sabotage**, and say what you broke and what went red: delete a
   `BW_STATUSES` entry that a fixture uses and confirm the render-the-raw-code assertion fires.
   A gate you haven't seen fail is not a gate. Confirm the sabotage broke what you aimed at
   before concluding anything — a sprint-02 sabotage hit the wrong object and "passed".

---

## Report format

What shipped · branch + commit list · verification output **verbatim** · files changed ·
decisions and open questions · what the director must verify by hand.

State plainly anything you could not verify. "I could not confirm it" is a finding; implying
you checked is not. Every real defect this project has found came from counting something and
comparing it to an expectation — so where a number matters, put it in a test that runs every
time, not in a sentence.
