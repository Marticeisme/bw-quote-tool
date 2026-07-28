# TRACK C — The Contacts home screen

**Branch:** `s05/contact-home`. **Working directory:** `C:\Users\Martice\bw-quote-tool-home`
— a git worktree, already created, with a `node_modules` junction in place. **Use
`git -C C:\Users\Martice\bw-quote-tool-home` for every git call**; a bare `git` in a stale cwd
has reset a branch mid-merge on this project.
**Model:** Opus. **Read first:** `ops/DESIGN.md`, `ops/SPRINT_GUIDELINES.md`,
`ops/sprints/sprint-05/SPRINT.md`.

The operator's complaint, verbatim: *"there is still no home screen when clicking on contacts. it
just shows a running list of all of the contacts that you can sort by. it still needs some sort
of home screen with different options (even if some of those options aren't available yet)."*

---

## ⚠ You are running in parallel with Track B. Read this before you touch anything.

**Track B is rebuilding the contact DETAIL page in `index.html` at the same time**, in a separate
tree. You are both editing the same 18,000-line CRLF file, which the sprint guidelines normally
forbid. The operator asked for it anyway, and the director's mitigation is a hard boundary:

**Yours:** a brand-new section, its own render functions, its own CSS block appended at the end
of the last `<style>` block, and the minimum possible routing change.

**NOT yours — Track B owns these and will be rewriting them:**

- `renderContactDetail()` and everything it renders
- the contact detail markup, the tab strip, the property band
- the `.ct-prop*` classes and `#ctProperty`
- `renderContactsList()`'s internals — **you may call it, you may not restructure it**
- the `#contactSearch` / `#ctChrome` / `#contactsList` markup

If you believe you need to change one of those, **stop and say so in your report** instead. A
conflict there is resolved by hand by the director and costs more than the change is worth.

**Append, do not interleave.** New CSS goes in one contiguous block at the end. New markup goes
in one contiguous new section. New functions go together in one place. A diff that is three
contiguous additions merges cleanly; one that is forty scattered edits does not.

---

## What to build

The strongest 2026 dashboard pattern is **progressive disclosure**: answer *"is everything
okay?"* first, then let the user drill in. Not a wall of widgets.

A new section, `#section-contacts-home`, which is what **Contacts** in the nav now opens. The
list becomes a destination reached *from* it, not the landing page.

```
CONTACTS
┌────────────────────────────────────────────────────────────────┐
│  NEEDS ATTENTION                                               │
│   [ 6 ]        [ 3 ]        [ 11 ]        [ 16 ]               │   live counts,
│   Overdue    Due today     Unworked    No next action          │   each a link
├────────────────────────────────────────────────────────────────┤
│  QUICK ACTIONS                                                 │
│   + New contact   ⭱ Import   ⭳ Export   ⚙ Settings   🔍 All   │
├───────────────────────────────┬────────────────────────────────┤
│  VIEWS                        │  RECENTLY VIEWED               │
│   Needs follow-up        6    │   (last 10, most recent first) │
│   Unworked              11    │                                │
│   New this week         30    ├────────────────────────────────┤
│   No next action        16    │  SAVED VIEWS                   │
│   Data health            5    │   pinned first                 │
├───────────────────────────────┴────────────────────────────────┤
│  COMING SOON — Calendar · Letters · Email · Reports            │
└────────────────────────────────────────────────────────────────┘
```

**Every count must equal the row count of the view it links to.** A card that says 6 must open a
list of 6. Assert that against the rendered DOM, not against the function that computes it —
a test that reads the same constant the code reads passes forever and proves nothing.

The five built-in views and the saved-views store already exist on `main` from sprint-04. **Read
them; do not reimplement them.** Clicking a card navigates to the list with that view's hash
applied — the hash grammar is the existing one (`DESIGN.md` §7, and sprint-04 Track B's
serialiser).

**Recently viewed** is new. Keep it client-side and simple — the last 10 contact ids opened,
newest first, in `localStorage`, not Firebase. It is a convenience, not a record, and it must not
become another node to keep consistent.

**Placeholders.** Martice asked for options *"even if some of those options aren't available
yet."* They must read as **coming**, not as broken: visibly inert, clearly labelled, and **never
a dead link or a JS error**. Candidates: Calendar, Letters, Email, Reports. Assert that none of
them navigates anywhere or throws.

**Routing.** `Contacts` in the nav opens the home screen. The list must still be reachable by its
existing hash — a saved view someone bookmarked yesterday, or pasted to the other counselor, must
still land on the filtered list and not bounce to the home screen. **This is the one routing rule
that matters, and it needs a test.**

---

## Hard rules

- **NEVER write to production Firebase.** Martice has real demo data in the live database now.
  Tests use `tests/fake-firebase.js` with `gstatic.com/firebasejs` aborted. Reads only.
- **Never `.set()` a whole collection node.**
- **Do not touch** the quoting path, contract generators, `contractRoles`/`bwHoldingsFor`,
  `prices.json`, `pdf-templates/`, or any `*-guide.html` / catalog file.
- **At most ONE `Edit` to `index.html`**, then Node scripts — every `Edit` fires a harness-level
  `PostToolUse` hook that opens the file in the Browser pane with live network access.
- **`index.html` is CRLF.** A `\n` multi-line match in a Node script silently matches nothing.
- **`</body>` appears more than once** — the first is inside a print-window template string. Use
  `lastIndexOf`.
- **Do not add a 37th top-level nav item.** The home screen replaces what `Contacts` opens.
- **Stage explicit paths**, never `git add -A`. **Never push.**
- No real customer data, including in screenshots. Synthetic fixtures only.

## Verification — quote verbatim

1. `npm run check` → `index.html: 8 blocks, 0 errors`
2. `npm test` → at or above `1135 passed, 0 failed across 24 suites` (1133 without
   `wmp-cemetery-map/`). Compare **per-suite**; none may fall.
3. Baseline **14/14 identical by content** — dev server on 3737 first,
   `TAG=s05-c node scripts/baseline-capture.mjs`, then `scripts/baseline-sign.mjs`, diffed
   against `%TEMP%\bw-baseline\before`. **Never hash a serialization to compare** — Node and
   Python space JSON differently and that nearly got a good deploy declared broken.
   **Note the port:** Track B may be using 3737. Check first; if it is busy, run your server on
   another port and pass `BASELINE_BASE=http://localhost:<port>/`. Do **not** kill a server you
   did not start.
4. **New suite `tests/test-contact-home.mjs`:**
   - every needs-attention count equals the number of rows the list shows when that card is
     clicked — assert against rendered DOM on both sides
   - the same for all five view cards
   - an existing saved-view hash still lands on the filtered list, not the home screen
   - every placeholder is inert: no navigation, no console error, no thrown exception
   - recently-viewed records an opened contact, caps at 10, and survives a reload
   - the home screen renders with **zero contacts** without throwing (a fresh database)
5. **Sabotage one gate and report what went red.** Suggested: make one card's count read from a
   different view than it links to, and confirm the count-equals-rows assertion fails.
   **Confirm the mutation actually applied before concluding anything** — a sprint-02 sabotage
   hit the wrong object and "passed", and a director sabotage this sprint silently failed
   because a search string omitted a trailing semicolon.
6. **Screenshots at 1100px and 1500px** under `scratch/`, from synthetic fixtures only.

## Report format

What shipped · branch + commits · verification output **verbatim** · files changed · decisions
and open questions · what the director must verify by hand.

**Say explicitly whether you touched anything on the Track B boundary list above**, and name
every function and markup region you modified — the director merges Track B first and needs to
know exactly where to look for conflicts.
