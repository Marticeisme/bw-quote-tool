# TRACK B — The contact detail page

**Branch:** `s05/contact-detail`, cut from current `main` (Track A merged). **Working
directory:** `C:\Users\Martice\bw-quote-tool` (main tree — you are the only track running).
**Model:** Opus. **Read first:** `ops/DESIGN.md`, `ops/SPRINT_GUIDELINES.md`,
`ops/sprints/sprint-05/SPRINT.md`, and **Track A's merged diff** — its report is a claim, the
code is the fact.

The operator's complaint, verbatim: *"when clicking into a contact itself it needs to use better
use of the whole page. right now it is so small."*

---

## The cause, already measured — do not re-diagnose it

**It is NOT a width constraint.** `.main` is `padding` only; `.section` sets `display` only.
There is no `max-width` anywhere in the chain. The detail view is **a single stacked column of
cards that never lays out into width it already has.** The director's first guess was a max-width
and it was wrong; this was checked.

So the fix is a real layout, not removing a constraint.

## What the field has converged on

HubSpot's 2026 record redesign, Salesforce Lightning, Attio and Zoho have independently arrived
at the same shape, and it is the shape to build:

- **A header/highlight strip** — the record's name and primary properties, with one-click
  actions to log activity.
- **A left rail** — identity and key properties, editable in place.
- **A centre column, tabbed, with an activity timeline as the default** — every note, task,
  change and import in one chronological stream. This is the centre of gravity of a modern CRM
  record; it is what lets anyone pick up where the last person left off.
- **A right rail** — associations and related records.

## The layout to build

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ← All contacts                                                            │
│ NAME                    [status]   Next action: overdue 3d   [actions]    │  header strip
├───────────────────────────────────────────────────────────────────────────┤
│ PROPERTY BAND — full width                                                │  ← the answer to
│ Garden 12 · Row B · Space 5   [BURIAL PLOT]   View on map                 │    the first
│ Owns 4 · 2 interred · 2 available                                         │    question asked
├──────────────┬────────────────────────────────────┬───────────────────────┤
│ identity     │ Activity | Notes | To-Dos          │ What they own         │
│ phone/email  │                                    │ (quotes & contracts)  │
│ address      │ chronological stream, newest first │ related people        │
│ status/source│ notes · to-dos · property added ·  │                       │
│ category     │ imported · created                 │                       │
│ flags        │                                    │                       │
│ salutation   │                                    │                       │
└──────────────┴────────────────────────────────────┴───────────────────────┘
```

**The property band sits directly under the header, full width, above the columns.** It is the
first question a counselor asks about a family and it gets the most valuable real estate on the
page. Track A built it; you are re-siting and styling it, not rebuilding it.

**The activity timeline is new and is the centre column's default tab.** Merge, in one
chronological stream, newest first: notes (`contactNotes`), to-dos both open and completed
(`contactTasks`), property records added, the import batch that created the contact, and the
record's own creation. Each entry shows what it was, who did it, and when. Do **not** invent an
events collection — derive the stream from the records that already exist, the same way
`bwNextActionFor` and `bwLastActivityFor` derive rather than store.

**Left rail is inline-editable** — click a field, type, Enter, saved. The Data Health view Track B
of sprint-04 built already does this; reuse that interaction rather than inventing a second one.

**Right rail keeps holdings.** `bwHoldingsFor()` and `contractRoles` behaviour are untouched —
this is presentation only.

---

## Constraints that are not negotiable

- **Keep Track A's class hooks.** `.ct-prop`, `.ct-prop-loc`, `.ct-prop-counts`, `.ct-prop-sub`,
  `.ct-prop-map` and `#ctProperty` are read by `tests/test-contact-property.mjs`. Restyle them
  freely; **do not rename them** without updating that suite and saying so.
- **The letter is called a Tier in a wall, a Row on a lawn and a Face in the ROA courtyard** —
  Track A carries `alphaLabel` per section for exactly this. Use it. **Never say "bay"**;
  Martice corrected that twice.
- **Persistent controls stay OUTSIDE any container rebuilt with `innerHTML`.** This is how the
  contacts search box escapes the saved-list focus bug, and sprint-04 Track B asserted it.
  Keep it true and keep the assertion passing.
- **An in-page `element.focus()` is a NO-OP in headless Chromium.** If you test focus, drive it
  with real Playwright keyboard input or the test asserts nothing while appearing to pass.
- **Must work at 1100px** with no horizontal page scroll. Three columns collapse to two, then to
  one. Name and next action never truncate. Wide content scrolls inside its own container, never
  the page.
- **The detail is re-rendered on any store change** (`renderContactsList()` delegates when
  `_bwDetailId` is set). A half-typed note or inline edit must survive a re-render triggered by
  the other counselor's browser — sprint-04 Track A preserved draft, focus and caret; do not
  regress that.

## Hard rules

- **NEVER write to production Firebase.** Martice has real demo data in the live database now.
  Tests use `tests/fake-firebase.js` with `gstatic.com/firebasejs` aborted. Reads only.
- **Never `.set()` a whole collection node.**
- **Do not touch** the quoting path, contract generators, `contractRoles`/`bwHoldingsFor`
  behaviour, `prices.json`, `pdf-templates/`, or any `*-guide.html` / catalog file.
- **At most ONE `Edit` to `index.html`**, then Node scripts — every `Edit` fires a harness-level
  `PostToolUse` hook that opens the file in the Browser pane with live network access.
- **`index.html` is CRLF.** A `\n` multi-line match in a Node script silently matches nothing.
- **Stage explicit paths**, never `git add -A`. **Never push.**
- No real customer data; synthetic fixtures only.

## Verification — quote verbatim

1. `npm run check` → `index.html: 8 blocks, 0 errors`
2. `npm test` → at or above `1135 passed, 0 failed across 24 suites` (1133 without
   `wmp-cemetery-map/`). Compare **per-suite**; none may fall.
3. Baseline **14/14 identical by content** — dev server on 3737 first,
   `TAG=s05-b node scripts/baseline-capture.mjs`, then `scripts/baseline-sign.mjs`, diffed
   against `%TEMP%\bw-baseline\before`. Never hash a serialization to compare.
4. **Extend `tests/test-contact-property.mjs` or add `tests/test-contact-detail.mjs`:**
   - the property band renders **above** the three columns and spans the full width
   - all three regions render for a contact with property, notes, to-dos and holdings
   - the activity timeline is in true chronological order and contains an entry from **each**
     source — note, to-do, property, import, creation
   - **no horizontal page scroll at 1100px and at 1500px** — assert `document.documentElement`
     scrollWidth against clientWidth, not a screenshot
   - an inline edit saves and survives a re-render triggered by a store change
   - a half-typed note survives a re-render
   - `alphaLabel` is honoured: a wall section says Tier, a lawn section says Row
5. **Sabotage one gate and report what went red.** Suggested: force a fixed wide `min-width` on
   the centre column and confirm the 1100px no-scroll assertion fails. **Confirm the sabotage
   actually applied before concluding anything** — a sprint-02 sabotage hit the wrong object and
   "passed", and a director sabotage this sprint silently failed because a search string omitted
   a trailing semicolon.
6. **Screenshots at 1100px and 1500px**, saved under `scratch/`. The operator's complaint is
   visual; a number alone does not answer it. **Use synthetic fixture contacts only** — never
   screenshot real data from the live database.

## Report format

What shipped · branch + commits · verification output **verbatim** · files changed · decisions
and open questions · what the director must verify by hand.

State plainly anything you could not verify. If you renamed or restructured anything Track A's
suite reads, say so explicitly and show the suite still passing.
