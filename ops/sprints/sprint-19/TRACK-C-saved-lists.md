# TRACK C — saved-lists (`s19/saved-lists`, index.html only; branches from post-B main)

**Pinned contract (re-measured on main 2026-08-06 after the B+E merges, commit
09e37d0e): `2519 passed, 0 failed across 39 suites`** — supersedes any 2501/38
reference below. Worktree −2 in test-contact-csv (wmp-map-absent NOTE) is documented.

Read first: `ops/SPRINT_GUIDELINES.md`, `ops/DESIGN.md` (ESPECIALLY the Firebase rules
and saved-quote node structure), `ops/sprints/sprint-19/SPRINT.md`,
`ops/sprints/sprint-19/DESIGN_HANDOFF.md` §4 (saved lists — VERBATIM).

## Mission

Handoff step 5 on all saved lists (cem, fh, RIC, CIRGAS, GA, CP): rows not tables
(name 14.5px/600 leading, meta line, status pill, right-aligned tabular money + date,
Open/PDF actions ALWAYS visible), list header (title + count + one search field,
newest first), `.empty` states. NO status tabs (explicitly rejected — revisit at ~40
rows).

Three statuses, two derived, per the operator's confirmed rulings:
- **Draft** — saved, never exported.
- **With family · <date>** — PDF or Print fired at least once for that quote; stamp
  the first such date.
- **Contracted** — stamped automatically when a RIC or CIRGAS is generated FROM that
  saved quote (operator chose automatic).

## THE DANGER ZONE — read twice

Saved quotes are LIVE PRODUCTION DATA in Firebase (`savedQuotes` + mirrors).
`persistSavedQuotes()` uses `.set()` — a wrong write wipes real families' quotes
(it happened 2026-07-11).
- Stamping is ADDITIVE-ONLY: new optional fields (e.g. `exportedAt`, `contractedAt`)
  attached to the quote object at the moments the app ALREADY saves through its
  existing flow. You may add fields to the object the existing save writes; you may
  NOT restructure the node, rename fields, touch persist internals, or add new
  `.set()`/`.update()` call sites without flagging in the report.
- Export/print/contract-generation handlers may fire when the quote is NOT saved —
  stamp only what's in memory; it persists whenever the user saves. Do not auto-save
  on export without flagging (that's a behavior change — default NO).
- Absent fields ⇒ Draft. Old quotes must render correctly with zero migration.
- Tests: fake-firebase only; NEVER a live write from any script. Reads permitted.
- Contract linkage: find where RIC/CIRGAS generation reads the loaded quote; stamp
  `contractedAt` there IF the generated contract demonstrably came from a loaded saved
  quote (the existing load-into-contract flow). If no reliable linkage exists in code,
  DO NOT invent one — ship the pill derived from the other two fields and report it;
  the director takes it to the operator (fallback ruling on record: manual toggle).

## Hard constraints

- Search filters the rows client-side (name + property text); keep it dumb.
- PDF row-action reuses the existing download path for that quote type.
- Sealed list as TRACK A; CRLF; targeted edits; no pushes; `[s19/saved-lists]`; Opus
  co-author.

## Steps

1. Stale-base check vs post-B main. node_modules.
2. BEFORE screenshots of all six saved lists (may be empty — capture anyway;
   fake-firebase fixtures in tests give populated states for test screenshots).
3. Implement. 4. AFTER screenshots (populated via the test harness, NOT live writes).
5. Verify.

## Verify (verbatim)

`npm run check` 8/0; full `npm test` counts; a written walk of every new field-write
site (file:line, which handler, proof it rides an existing save); grep proof of zero
new `.set(`/`.update(` calls in the diff; screenshot pairs.
