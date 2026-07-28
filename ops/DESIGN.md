# DESIGN — BW Quote Tool Contract

Canonical design contract. Tracks and directors obey this file; changes are
operator-approved and logged in `STATE.md`.

## 1. Mission & scope boundary

An internal tool that lets two family service directors build cemetery and funeral-home
quotes and generate the six contract types Bonney Watson uses, plus a contact layer that
ties people to the records they appear on. It is used in front of families, so a broken
deploy is not an inconvenience — it is a counselor standing in someone's living room
unable to produce a contract.

**Non-goals. Scope creep dies here.**

- **Not an org rollout *yet* — but no dead ends.** Two users today, Martice and Randy. Do
  not pre-build account types, a manager role, rules-enforced ownership, or a shared
  duplicate-detection directory: they are cheap to add later and expensive to carry now for
  users who do not exist. But this is a **sequencing decision, not a permanent ceiling** —
  Martice intends an org rollout eventually (confirmed 2026-07-26), so it is an explicit
  roadmap milestone rather than a non-goal. The standing constraint that follows: **nothing
  may be designed so that multi-tenancy would require a rewrite.** Concretely — records keep
  `ownerUid`, roles stay data (`BW_ROLES`) rather than a hardcoded enum, and per-record
  storage stays `quotes/<type>/q<id>` so rules can later scope by owner without a migration.
  Build those primitives when a second kind of user actually exists; until then, just don't
  build a wall in front of them.

  **Corrected 2026-07-26: the future state is MULTI-TENANT, not "more users at one site."**
  The earlier wording said "org rollout", which pointed future work at the wrong problem —
  adding a manager role to one deployment. The actual direction is separate organisations with
  their own price books, inventory, cemetery layouts and carrier paperwork. That changes which
  invariants matter: the load-bearing one is **not** roles, it is that **nothing may assume a
  single price book or a single site.** Which is why the hardcoded `$` literals and the
  DOM-scraped `PRICE_INDEX` are a structural blocker rather than tidying — see ROADMAP S2.

- **Field/offline capability is a GOAL POST, not a requirement.** Deliberately not a
  non-goal, and deliberately not scheduled. The tool is a single static file, which makes it
  unusually well placed to work with no signal — an advantage worth not squandering, since
  poor cemetery signal is a live complaint against comparable products. Note the tension:
  sprint-01 moved 9.4 MB of contract templates from inline to fetched-on-demand with an
  explicit **no persistent cache** decision (§8, 2026-07-25). That is correct for two
  counselors at desks and wrong for anything used walking a cemetery. **Do not undo it** —
  but if field use becomes real, a service worker plus a persistent template cache is the
  answer, and that is a deliberate later decision rather than an oversight to be discovered.
- **No React / build step / framework rewrite.** Measured: the app's own source is 2.30 MB
  raw, 670 KB gzipped, and loads in ~435 ms with zero console errors. There is no runtime
  problem to solve. Proposals to "modernize" the architecture are out of scope.
- **No `work_order` entity.** Explicitly deprioritized by Martice on 2026-07-24
  ("we don't need to do work orders anytime soon"). Do not re-propose it. Revisit only if
  he raises marker/foundation/deed-transfer tracking himself.
- **No migration off Realtime Database.** Decided 2026-07-24: stay on RTDB and filter
  client-side. Firestore is a fallback only if this grows past a handful of users.
  Do not re-litigate.
- **No history rewrite** on the public repo.

## 2. Architecture

```
index.html  (11.96 MB, 17,622 lines, no build step)
├── 9 inline <script> blocks
│   ├── block 2 (line ~4514, 3.1 MB)  vendored minified libs: pdf-lib, fontkit
│   ├── block 3 (line ~5642, 7.0 MB)  THE APP  + most embedded base64
│   ├── block 4 (line ~15694, 129 KB) quote-PDF download logic
│   └── block 7 (line ~17608, 606 KB) vendored: firebase, jszip
├── 6 <style> blocks (23 KB total)
└── 31 base64 blobs, 9.71 MB = 81% of the file
    ├── 13 named globals  → contract/xlsx/logo templates
    └── 18 unnamed        → FQ_FONTS + pdf-lib standard-14 AFM data (0.29 MB, leave inline)

~1,400 named functions, ALL in global scope. No modules.
19 sections, all live in the DOM at load (5,027 nodes, 677 inputs).
Navigation: show(id, navEl) → mirrors into location.hash; bwRoute() handles back/forward.
```

Deployed as static files to GitHub Pages from `main`. No server, no CI, no build.

## 3. Stores & surfaces

**Firebase Realtime Database — production, no staging environment.**

| Node | Shape | Notes |
|---|---|---|
| `quotes/<type>/q<id>` | per-record | types: `cem`, `fh`, `ric`, `ga`, `cp`, `an` |
| `savedQuotes` | legacy whole-node | kept alongside; `persistSavedQuotes()` uses `.set()` and replaces the WHOLE node |
| `parties/$id` | person records | the central entity; merge tombstones followed by `bwPartyById` |
| `contractRoles/$id` | join | party ↔ record, with a role from the `BW_ROLES` array (data, not an enum) |

Auth: email/password, non-routable `@bwquote.local` handles (`martice`, `randy`), rules are
`auth !== null` on every node. Google/OAuth is out — Martice cannot sign into a Google
account on the work laptop. There is no reset-by-email; resets happen in the console.

**There is no migration mechanism.** Schema changes are code changes. The one-time
`savedQuotes`→`quotes` migration has already run and must not run again.

**Production-write rule (absolute):** tracks and tests NEVER write to production Firebase.
Reads only. Tests run against `tests/fake-firebase.js`, an in-memory stub, and block the
`gstatic.com/firebasejs` request. A save/persist call from a test script wiped real quote
data on 2026-07-11; a similar incident destroyed `garden-markers.json` on 2026-07-16.

## 4. Conventions & reference constants

- **Line endings are CRLF.** A multi-line match using `\n` in a script silently fails.
- **`</body>` appears more than once** — the first is inside a print-window template
  string. Use `s.lastIndexOf('</body>')`, never `.replace('</body>', …)`.
- Section ids are `#section-<id>`; `show('cem-quote')` is the navigation entry point.
- Money: integer cents. Dates: ISO. Phones: digits only in storage, formatted for display.
- `snap.spaces` is an **array** of `{sid, loc}` — a companion purchase is one contract over
  two spaces.
- Dev server port **3737**. The WMP map server is 8642 and is local-only.
- Run Node from the repo root. **ESM resolves imports from the script's own path, not cwd**
  — a `.mjs` outside the repo cannot find `playwright`.
- Editing tools that load the whole of `index.html` will struggle. Prefer targeted edits or
  short Node scripts over whole-file rewrites.

## 5. Verification contract

A track's work is provably done when all of these are green and its report quotes the
actual output.

| Gate | Command | Expected |
|---|---|---|
| JS syntax, every inline block | `npm run check` | `index.html: 8 blocks, 0 errors` |
| Assertion suites | `npm test` | `1300 passed, 0 failed across 26 suites (1298 without wmp-cemetery-map/)` |
| Page verifiers | `scripts/verify_catalogs.mjs`, `scripts/verify_guides_page.mjs` | run automatically by the push hook on touched surfaces |
| Generator output | `node scripts/baseline-capture.mjs` + `scripts/baseline-sign.mjs`, diff `signatures.json` | **14/14 scenarios, every signature byte-identical** to the recorded baseline |
| **RIC in Adobe Acrobat** | by hand, operator only | **required only when a change touches the RIC itself** — its content, fields, or field mapping. Not required when the RIC's bytes are provably unchanged. |

**These two numbers go stale every time a sprint lands, and a stale expectation is worse than
none** — a track told to expect `9 blocks` when the truth is 8 either wastes time or, worse,
manufactures an empty `<script>` block to satisfy the doc. Whoever merges a sprint updates them
here, in `DIRECTOR_GUIDELINES.md` Phase 0 and in `SPRINT_GUIDELINES.md` rule 4, in the same
`[sNN/ops]` commit. Sprint files and `STATE.md` history keep the numbers that were true when
written — those are records, not expectations. Counts may rise as suites are added and must
never fall silently.

**The generator baseline covers 14 scenarios, not 12** (corrected 2026-07-26). The key names
the *scenario*, not the function, so one generator can be captured on two paths. The two added:

- **`printGAContract`** — the only generator that exercises `GA_PDF`'s main path. It reads
  `gaLines()`, which reads the `_gaPricing` snapshot that `gaImportFromFH()` freezes off
  `_fhLines`; with no funeral-home quote imported it alerts and returns, producing no
  download. Same fixture trap as the RIC. Signature: 11 pages, 261 fields.
- **`generateClearPointContract_cremation`** — ClearPoint's `!isBurial` branch appends page
  index 8 of `GA_PDF` as the Cremation Authorization. The burial default never loads `GA_PDF`
  at all. Signature: 4 pages, 151 fields, vs burial's 3/106.

Before this correction `GA_PDF` — the largest template at 1.49 MB — had **zero** coverage in a
baseline that reported "12/12 captured".

**The harness is tracked, in `scripts/`** (moved there 2026-07-26). It is the gate that decides
whether a sprint touching PDF generation may merge, and it previously lived in gitignored
`scratch/` — existing on exactly one machine, so a fresh clone could not verify a sprint at
all. `scripts/baseline-capture.mjs` needs the dev server already listening on 3737; it does not
start one. Run both from the repo root: ESM resolves imports from the script's own path, but
`baseline-capture.mjs` reads `tests/fake-firebase.js` relative to cwd. The superseded `scratch/`
copies were deleted at sprint-01 close; `scripts/` is the only home.

**The capture clock is frozen** at `CLOCK = '2026-07-01T10:00:00'` via Playwright's
`page.clock.setFixedTime`, installed before any app code runs. Without it the baseline is not
reproducible: the RIC stamps a `Time` field and AM/PM checkboxes off the wall clock and a
`25th July` ordinal off the date, and the quote PDFs print `Valid through <today+30>`. Captures
one day apart differed on 5 of 12 signatures with `index.html` untouched — which would have made
the 141-field RIC map, the designated template-swap detector, useless as an equality check and
trained readers to wave off RIC field diffs as "probably just the clock". Two independent
captures now produce identical signatures for all 14. **Changing `CLOCK` invalidates the
recorded baseline — re-capture both sides if you ever do.**

**Map repo (`wmp-cemetery-map/`, its own git repo, no remote):**

| Gate | Command | Expected |
|---|---|---|
| Alignment baking | `npm test` (runs first) | `19 passed, 0 failed` |
| GeoJSON + index | `npm run validate` (second half of `npm test`) | `2/2 unit files valid, 2770 units checked, index ok` |
| Inventory counts | `npm run counts` | informational |

`npm test` in the map repo runs `bake-alignment.test.mjs && npm run validate` and exits
non-zero on failure — verified 2026-07-25 by perturbing `areas.json` in both directions.

`validate.mjs` checks what a generic GeoJSON validator would not: coordinates inside the WMP
parcel (so an x/y swap fails instead of rendering the cemetery into the Pacific), closed
rings, `occ[].d` on every occupant, no duplicate position `sid`, and status/roster agreement
(an "available" space holding a named person is how a plot gets sold twice). It also checks
`areas.json` both ways — a listed area with no valid build is a 404 on the overview; a valid
build not listed is work that shipped unreachable.

`npm test` starts `dev-server.mjs` on 3737 if nothing is listening and stops it after.

**The runner swallows a suite's own stdout, so an announced skip is INVISIBLE** (found
2026-07-27 at the sprint-04 Track C merge). `tests/test-contact-csv.mjs` cross-checks its demo
names against the map's real burial records, and when `wmp-cemetery-map/` is absent — which it is
in every worktree and every fresh clone, since it is gitignored and local-only — it prints
`NOTE ... the map cross-check DID NOT RUN`. `run-all.mjs` prints only the per-suite summary line,
so that notice never reaches the screen. **The assertion count dropping from 1038 to 1036 was the
only visible signal**, and it was only visible because the director compared counts between two
trees rather than reading exit codes. Two consequences: the expected count is
environment-dependent and is written that way above, and **comparing counts is not a nicety, it
is the only thing standing between a silently-skipped subtree and a green run.**

**A suite that prints no assertions is a FAILURE, not a pass.** Only
`tests/test-price-vintage.mjs` may report no assertions, and only on exit 0 — it is a
diagnostic that prints values. This rule exists because a worktree without `node_modules`
made every suite crash silently and the runner reported green.

**A worktree needs its own `node_modules`** (gitignored, so not checked out). Either
`npm install` there, or junction it:
`New-Item -ItemType Junction -Path "<worktree>\node_modules" -Target "<main>\node_modules"`.
Delete that junction with `[System.IO.Directory]::Delete($p, $false)` **before** removing
the worktree — a recursive delete can follow it into the real `node_modules`.

## 6. Security & hygiene

- Tracks NEVER read or commit secrets/credential files; never weaken `.gitignore`.
- External account signups are operator gates — agents never create accounts.
- **`wmp-cemetery-map/` must never be committed.** It holds real burial records including
  living property owners' names, and this repo is public. It is gitignored and has its own
  local-only repo. The `.claude/hooks/pre-git-guard.js` hook blocks it.
- **Never `git add -A` / `git add .`.** Two other sessions have in-flight edits in the same
  working tree. The hook blocks bulk adds.
- **No real customer data in committed files.** Test fixtures are synthetic: 555-range
  phone numbers, `@example.com` emails, invented names. The real name-parser cases live in
  `scratch/name-fixtures.local.mjs`, which is gitignored and must never move out of
  `scratch/`. Also still holding real names and confined to `scratch/`:
  `scrub-fixtures*.mjs`, `check-live-names.mjs`, `CRM_SCHEMA_v1.md`, `CRM_SCHEMA_v2.md`,
  `index.html.bak-pre-quotestore`.
- **The Claude Code Browser pane reloads `index.html` after every Edit with live network
  access**, which boots the app against production Firebase. Navigate it away before
  editing Firebase-touching code. Confirmed 2026-07-26 and **it is a real `PostToolUse:Edit`
  hook** — a harness-level one, which is why it appears in NEITHER `.claude/settings.json` nor
  the user-level settings and cannot be disabled from either. It announces itself as
  `PostToolUse:Edit hook additional context: <file> is now visible in the Browser pane`.
  Every `Edit` to any file in this repo opens that file in the pane; for `index.html` that
  means booting the app with live network access. It fires even when you are deliberately
  avoiding the pane — Track A tripped it on its one `Edit` to `index.html` and the director
  tripped it on `vault-guide.html`. The practical mitigation is **at most one `Edit` to
  `index.html`, then work via Node scripts**. The real backstop is that Firebase rules are
  `auth !== null`: a page booted with no signed-in user can neither read nor write.
- Nothing in `ops/` may contain customer data.

### Map-side tracks — the rule the hook cannot enforce

`.claude/hooks/pre-git-guard.js` blocks committing `wmp-cemetery-map/` into this repo. It
does **not** stop a track from reading a name out of the map's data and pasting it into a
source file, a test fixture, a comment, or an `ops/` doc — which is exactly how real
customer names ended up in `index.html`'s comments and in the test suites, found and fixed
2026-07-25.

So, absolutely: **a track working in the map repo may never carry map data across into this
repo in any form.** Not as a fixture, not as an example in a comment, not as a sample in a
report. Interned names, plot owners, `occ[].n` values and anything derived from them stay in
`wmp-cemetery-map/`, which is gitignored here and has no remote of its own.

When an integration needs to demonstrate a real record, use a synthetic `sid` and an
invented name. If a track cannot do its job without a real one, it stops and says so — that
is an operator gate, not a judgement call for the track.

## 7. Map / quote-tool integration contract

Two repos, one integration. This section is the shared contract; both sides' tracks read it
here rather than re-deriving it. Verified against both codebases 2026-07-25.

**The two entry points.** `BW_MAP_BASE = 'http://localhost:8642/index.html'`
(`index.html:12682`, with `bwMapUrl(route, value)` beside it) and
`BW_TOOL_BASE = 'http://localhost:3737/index.html'` (map `index.html:1904`). Both are
localhost today because the map is local-only; each is a single constant precisely so a
future move is a one-line change.

**Hash grammar — identical on both sides:**

```
#route=value                 shorthand, single value
#route?key=value&key=value   full form
#route                       bare
```

Split on the first `?`. No `?` but a `=` before it means shorthand. **Unknown params are
ignored and an unknown route falls back to the overview** — a stale link must never leave a
white screen. `+` means space in a query string, so decoding needs the `+`→space pass, not
`decodeURIComponent` alone. Map side: `bwParseHash` / `bwSetRoute` (map `index.html:1908`),
guarded by a `bwRouting` flag against setRoute→hashchange→applyRoute loops. Tool side:
`show()` mirrors into `location.hash` and `bwRoute(fallbackId)` handles hashchange.

**Param vocabulary (identical both sides):** `space` (a sid), `section`, `building`, `loc`,
`q`, `kind`. Section codes are the URL-safe sanitized form, so `VETS_N` and `17_S_Sundial`
need no escaping.

**`sid` is a PER-POSITION key, not per-space.** A space can hold several interments at
different depths; each position gets its own sid, so a contract line keys one place and only
one. Duplicate position sids are a validated failure in the map (`validate.mjs`) because two
contract lines keying the same place is the data shape of a double sale.

**Shared data files, all under `wmp-cemetery-map/data/`:**

| File | Contract |
|---|---|
| `sid-index.json` | `sid → locator`, so a `#space=<sid>` route resolves without loading every section. **~2.6 MB (79,493 entries), lazily fetched only when a `#space` route arrives** — do not load it eagerly. |
| `search/` + `search-index-manifest.json` | sharded by the first character of the **normalised** surname `ln` (A–Z plus `_other`). `l` = surname as MIS spells it, for DISPLAY; `ln` = normalised for MATCHING (upper, suffixes and punctuation stripped). Never match on `l`. |
| `prices.json` | **schema 2**, the single fee/price schedule shared by both apps. **Canonical copy now lives in THIS repo at `data/prices.json`** (Martice, 2026-07-26) because the deployed tool cannot fetch anything out of the gitignored, remote-less map repo. `scripts/build-prices.py` in the map writes **both** copies in one run — the map still reads its own at runtime, and two files that are never written separately cannot drift. **Never hand-edit either; change the source and rebuild.** **Read `current`.** A price is always today's price — do not resolve a fee as-of a date. `fees`/`inventory` keep dated history for reference only. |

**`prices.json` already exists and the map already emits it.** Sprint S2 is therefore about
making the *tool* consume it, not about inventing the format.

**`#space=<sid>` was broken for every unsold space until 2026-07-26 — and this section said it
worked.** `build-search-index.py` wrote the sid→locator entry *inside* the function that indexes
people, which returns early when there is nobody to name, so **19,800 sids had no entry at all:
all 16,921 available spaces plus every one of Lake Urn Garden's 2,512.** A tool-side deep link
into sellable inventory — the common case for a counselor pricing a space — silently landed on
the overview. Fixed on the map's `audit/map-bugs` branch (59,693 → 79,493 entries, +19,800 added
and zero removed, verified by the director). **The lesson for this section: it was written by
reading both codebases and confirming the grammar matched on each side, which proved the two
*agreed* — not that either one worked. A contract verified only for internal consistency is not
verified. Deep-link routes need an end-to-end check against real sids, including an unsold one.**

**Coordinate caveat.** The map's lat/lon and MIS's differ by a consistent ~2.7 m — an imagery
offset Martice hand-corrected against the aerial photo. The map's position matches the
headstone visible in the imagery; MIS's is where MIS's own link sends you. At 2.7 m the
difference is inside phone-GPS noise, but our map and our links must at least agree with each
other. Do not "fix" one side toward the other without raising it.

**Sprints that span both repos:** one director, one `ops/` (this one), the map declared as a
surface in `README.md`. Tracks may target either repo — a `TRACK-*.md` names its working
directory. This is the one case where parallel tracks genuinely fit, because the two sides
touch different files in different repos and cannot conflict. Merge each in its own repo; the
map has no remote, so map-side work is committed locally and never pushed.

## 8. Standing decisions ledger (operator-confirmed)

| Date | Decision |
|---|---|
| 2026-07-24 | Stay on Realtime Database; filter client-side. Not Firestore. |
| 2026-07-24 | Ownership is soft — `ownerUid` is a field the UI filters on; rules stay `auth !== null`. |
| 2026-07-24 | Roles are data (`BW_ROLES` array), not a hardcoded enum. |
| 2026-07-24 | Salutation is free text, auto-filled from a template on create. |
| 2026-07-24 | Contact linking is OPTIONAL and offered, never automatic or gating. A test asserts it. |
| 2026-07-24 | `purchaser` is the correct default role on all six modules. |
| 2026-07-24 | Org parties deferred; `kind` stays a one-word field defaulting to `person`. |
| 2026-07-24 | `work_order` deprioritized. Do not re-propose. |
| 2026-07-25 | `ops/` is git-tracked; bookkeeping commits separately under `[sNN/ops]`. |
| 2026-07-25 | Track subagents run on Opus — one file, global scope, no build step, both counselors affected by any error. |
| 2026-07-25 | The tool is opened only from the web address. No `file://` support required. |
| 2026-07-25 | Template fetch failure is mitigated by prefetch-on-section-entry + one retry + explicit error. No persistent cache. |
| 2026-07-25 | Sprint-01 ships as one change: loader in, base64 literals out. No two-phase fallback. |
| 2026-07-25 | The Adobe Acrobat gate applies only when a change touches the RIC itself, not when its bytes are provably unchanged. |
| 2026-07-26 | Two-user scope is sequencing, not a ceiling. Org rollout is a roadmap milestone; nothing may be designed that makes org-readiness a rewrite. |
| 2026-07-26 | The generator baseline covers 14 scenarios and runs on a frozen clock. Signature equality is exact — a diff is a real diff. |
| 2026-07-26 | A template LOAD failure must surface by name; a field-FILL failure may still be warned and swallowed. Widens "loader in, literals out" by design. |
| 2026-07-26 | **MIS is the pricing source of truth. Never load prices out of a printed or PDF sheet** into the map or the tool. A Serenity wall sheet priced 5 of 48 niches and priced three MIS calls `reserved`. |
