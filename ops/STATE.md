# STATE — Living Ledger

**Current sprint:** **sprint-04 (S8) — Contacts becomes a CRM.** In flight as of 2026-07-27.
Three sequential tracks; Track A (`s04/contact-record`) spawned. See `sprints/sprint-04/SPRINT.md`.

sprint-01 (S1) and sprint-02 (S7) SHIPPED; sprint-03 (S2) **partially shipped** - the 11
overlapping fees are live, the remaining scope is recorded under "Open, and needing Martice".

**Last updated:** 2026-07-27. `main` = `413da08` (sprint-04 ops docs), pushed through `4fa7171`.

## Sprint-04 — opened 2026-07-27

**Boot audit found nothing wrong.** Working tree clean, `main` level with `origin/main` (0 ahead,
0 behind), `npm run check` → `index.html: 8 blocks, 0 errors`, `npm test` → `636 passed, 0 failed
across 19 suites` with every suite green, no stale worktrees, nothing listening on 3737, baseline
artifacts still at `%TEMP%\bw-baseline\before`. First boot in this project where the previous
close left the docs accurate.

**The sprint came from the operator mid-boot**, not from the roadmap: the Contacts page is *"just
a contacts page"* and needs to be *"much more robust"*, taking what is good from
FuneralDecisionsCRM. Source material: the **FDCRM Training Manual, 203 pp.**, at
`E:\Downloads\FDCRM Training Manualreduced.pdf`, plus a screenshot of Bonney Watson's own FDCRM
home screen. **That screenshot shows real customer names in "Recently Viewed Contacts" — none of
them may enter this repo in any form** (same rule as map data, `DESIGN.md` §6).

**Design authority was delegated to the director** (*"I'm giving you autonomy to make decisions on
exactly how this should look ... look online at other CRMs"*). The resulting decisions are
D1–D10 in `sprints/sprint-04/SPRINT.md` and bind the tracks. The load-bearing ones:

- **A view is a URL** (D1). Filters serialise into the existing hash router, so a filtered list
  survives navigation, is pasteable between counselors, and a saved view is just a stored hash —
  which deletes FDCRM's static-vs-dynamic distinction entirely.
- **`nextActionAt` / `lastActivityAt` are derived, never stored** (D4). There is no migration
  mechanism in this project; deriving means nothing to backfill and nothing to drift.
- **Every import is an undoable batch** (D7). This is what makes it acceptable to import into a
  live production database at all.
- **Our own ~60-line CSV parser, no vendored library** (D6). Sprint-01 spent a whole sprint
  removing 9.4 MB from this file.

**The seeding problem solved itself.** Martice asked for 30 live fake contacts to test with,
which would have meant an agent writing to production — the one absolute prohibition. His own
answer to the mechanism question (build CSV import first) removed the conflict: the demo file
ships in the repo, and **he** imports it through the UI after the push. No agent write, and the
batch-undo makes it reversible.

**Operator decisions taken 2026-07-27:** CSV import is generic, not FDCRM-shaped, but kept open
to an FDCRM export; taxonomies ship as sensible defaults, editable in-app; appointments and the
calendar are deferred; the drafted status list ships as-is and is renamed in-app.

**Deviation, logged: three tracks, not the 1–2 the guidelines allowed.** They run strictly
sequentially, each branching from a `main` carrying the previous merge, so they cannot conflict.
`SPRINT_GUIDELINES.md` is amended in the same commit — the cap was always about *parallel* edits
to one 18,000-line file, and three ~600-line diffs audit far better than one ~1,800-line one.

## Status

**2026-07-26 was a full day. Everything below is merged, pushed and verified live.**

| Shipped | What |
|---|---|
| sprint-01 (S1) | 11 contract templates externalized. `index.html` 11.96 MB to 2.55 MB raw, 7.30 to 0.88 MB gzipped (**8.3x**, not the 11x predicted - the target had omitted fonts it had already excluded). Verified live: all 11 templates resolve over HTTPS with SHA-256 matching the Gate 0 manifest, and a RIC generated from the deployed site is identical to the recorded baseline. |
| Guides audit | Granite swatches restored (27 lazy images never loaded in a headless print). **The Cremation Guide had 0 of 57 product photos.** 101 corrupt characters across 8 PDFs - a 2026-07-24 'fix' had been verified against the wrong codepoint. Burial Vault Guide rebuilt. |
| Advisor identity | Randy's own name, email and phone now reach his paperwork. The name was hardcoded at **37 sites**, including the Insurance Producer of record and the Overview contact panel that had been showing him Martice's details to read to a family. GA producer ID deliberately BLANK for anyone without one. |
| Map audit (S4 groundwork) | **`#space=<sid>` resolved for no unsold space at all** - 19,800 sids unindexed, including all 16,921 available ones. Three mausolea rendered 450px off-screen with Back unreachable. Niche lasso resolved nothing in 9 of 12 structures. |
| sprint-02 (S7) | Map inventory styling: one outline colour, state in the fill, labels rotated to each row's bearing. Gates proven by sabotage. |
| Discontinued vaults | Five products the tool was still offering families removed; the two setting fees KEPT, because they are components of the Standard Arrangement bundles. |
| cemUpdate | Stale arrangement subtotals cleared. **The reported crash did not exist** - closed as not-reproducible. |
| sprint-03 (S2), partial | 11 cemetery fees resolve from `data/prices.json`; `MONOBAR_INSTALL` corrected to 225; garden ECF carried as real per-garden amounts. |

**Verification contract moved from 368 assertions across 12 suites to 636 across 19**, and all 14
generator signatures are still byte-identical to the reference - so none of the day's work moved a
price on a contract.

**The apparatus is the real deliverable.** A generator baseline that runs on a frozen clock and
covers the scenario that was silently uncovered; a served-tree guard that refuses to test or
capture against another worktree's dev-server; a map suite that fails when sabotaged; a
data-integrity check that surfaced two possible double sales; and a screenshot guard that aborts
rather than redacting a name.

**Every real defect found today came from counting something and comparing it to an expectation** -
images per page, sids indexed, pages in a contract, dollar figures before and after, served bytes
versus disk bytes. None came from looking at the thing and judging it. See `MISTAKES.md`.

## Open, and needing Martice

1. **Two possible double sales** in CN and ELN - two spaces each recording two different people at
   one interment position. Nothing in the data was changed; only MIS settles it.
2. **`VASE` and the O&C write-back loop** - the file has one vase per structure, the tool sells
   three SKUs; and `build-prices.py` scrapes the eight O&C amounts out of `index.html`, so they
   cannot yet be changed from the file end (~20 lines map-side).
3. **The map tint** - measurably real (24.7/255) but subtle over bright dry grass. One token,
   `--tint-alpha`. Only Martice can judge the photo case.
4. **Randy's GA producer ID** - blank by design until he has one.
5. **`available` is cream outdoors, green indoors** - deliberate, worth a decision.
6. **Five parked niche accuracy items** - recorded as DEFERRED in the map's docs, not to be chased.

## Read this too: `MISTAKES.md`

A running record of director errors and what each one taught, kept because a mistake nobody
wrote down gets made again. Read it at boot alongside this file. The short version: every real
defect this project has found was found by **counting something and comparing it to an
expectation** — not by looking at the thing and judging it. Confident prose has been wrong more
often than measurements have.

## Background jobs

| Job | Status | Where | Notes |
|---|---|---|---|
| sprint-01 Track A | **shipped, live** | `s01/externalize-templates` | merge `4019c92` |
| Guides audit | **shipped, live** | `guides/marker-pdf-colors` | merge `1e39642` |
| Advisor identity | **shipped, live** | `fix/advisor-identity` | merge `cd16fdf` |
| Map audit | **merged, local-only** | map `audit/map-bugs` | merge `b9677db`; map repo has no remote |
| sprint-02 Track A | **merged, local-only** | map `s02/map-inventory-styling` | map repo has no remote |
| Discontinued vaults | **shipped, live** | `fix/discontinued-vault-products` | merge `3c0228c` |
| cemUpdate (other session) | **shipped, live** | `claude/awesome-cerf-226213` | merge `56e3d49` |
| sprint-03 Track A | **shipped, live** | `s03/prices-single-source` | merge `875bcaf` |
| sprint-04 Track A | **running** (spawned 2026-07-27) | `s04/contact-record` | main tree, no worktree — one track at a time |
| sprint-04 Track B | not spawned | `s04/contact-search` | blocked on A merging |
| sprint-04 Track C | not spawned | `s04/contact-csv` | blocked on A + B merging |

All worktrees removed at close except the map's, which stay until their branches are pruned.
**Every branch above is LOCAL ONLY** - none was pushed, per the corrected rule that every push is
an operator gate.
## Director's boot audit, 2026-07-26 — what changed before Track A spawned

The 2026-07-25 Gate 0 ticks did not survive re-verification. Three defects, all found by
checking artifacts instead of trusting the doc. Fixes landed in `scratch/` and `ops/` only —
`index.html` was not touched.

1. **`GA_PDF` had zero baseline coverage** while the baseline reported "12/12 captured".
   `printGAContract` (`index.html:4737`) — the only generator that produces the GA contract
   itself — was simply absent from the harness's list, because `gaLines()` needs an imported
   funeral-home quote and without it the function alerts and returns (the same fixture trap as
   the RIC). `GA_PDF`'s only other call site is ClearPoint's `!isBurial` branch
   (`index.html:15270`), which the burial-default fixture never reached. So the sprint's
   most important gate had a hole directly over the largest template (1.49 MB). **Fixed:**
   both scenarios added, baseline is now **14/14**.
2. **The baseline was not reproducible.** A re-capture on 07-26 against an unmodified
   `index.html` changed 5 of 12 signatures — all wall clock: the RIC's `Time` field (4:33 vs
   10:10), its AM/PM checkboxes, `25th July` ordinals, and `Valid through <today+30>` on the
   three quote PDFs. The RIC's 141-field map is the designated template-swap detector; a
   signature that drifts daily cannot detect anything, and would have taught whoever read it
   to dismiss RIC field diffs. **Fixed:** capture clock frozen at
   `CLOCK = '2026-07-01T10:00:00'` via `page.clock.setFixedTime`, installed before any app
   code runs. Verified by two independent full captures producing identical signatures for
   all 14.
3. **`npm run check` will legitimately print 8 blocks, not 9,** after this sprint.
   `GA_CL_PDF_B64` occupies a `<script>` block of its own (`index.html:17620`, the last before
   `</body>`) containing nothing else. The track file demanded "exactly 9 blocks", which was
   unsatisfiable without leaving a junk empty block. **Fixed** in `SPRINT.md` and the track file.

Also confirmed by direct check, not assumed: **all 13 extracted templates are byte-identical
to the base64 `index.html` ships today** (decoded the live literals and compared SHA-256s).
That is the assumption the entire sprint rests on, and it holds.

**Current reference baseline:** `%TEMP%\bw-baseline\before` — 14 artifacts + `manifest.json`
+ `signatures.json`. Superseded copy kept at `before-ARCHIVE-2026-07-25-unfrozen-clock`.

**Durability gap — RESOLVED 2026-07-26 (`b8528cb`).** The harness is now tracked at
`scripts/baseline-capture.mjs` and `scripts/baseline-sign.mjs`. It had lived in gitignored
`scratch/`, meaning the gate that decides whether a PDF-touching sprint may merge existed on
exactly one machine and a fresh clone could not verify a sprint at all.

Copied, not moved: Track A was already running against the `scratch/` paths named in its
prompt, and removing them mid-flight would have broken its gate 4. **Delete
`scratch/baseline-capture.mjs` and `scratch/baseline-sign.mjs` at sprint close**, once Track A
has merged and nothing references them. Neither copy is edited in the meantime, so they cannot
drift. Import resolution from `scripts/` is verified (playwright and jszip both load); a full
runtime capture from the new path is deferred to the close gate, since running one during the
track would fight it for port 3737 and read a half-edited `index.html`.

## Verified facts a director can rely on (2026-07-25, amended 2026-07-26)

Do not re-derive these.

- **Baseline captured, 14/14 scenarios**, on unmodified `main`, frozen clock. Artifacts,
  `manifest.json` and `signatures.json` in `%TEMP%\bw-baseline\before`. Harness:
  `scripts/baseline-capture.mjs` + `scripts/baseline-sign.mjs` (tracked as of `b8528cb`;
  `scratch/` copies survive only until sprint-01 closes). Re-run with `TAG=after` from the
  repo root; the dev server must already be listening on 3737 (the script does not start it).
  Key signatures: RIC 6 pages / **141 AcroForm fields**, ClearPoint burial 3 / 106,
  **ClearPoint cremation 4 / 151**, **`printGAContract` 11 / 261**, the four checklists
  1 page / 10–15 fields, the three quote PDFs 2/1/3 pages / 0 fields (drawn — text-hashed
  instead), CIRGAS 179 zip entries, commission worksheet 21.
- **Templates extracted, 13 files**, to `pdf-templates/embedded/` with SHA-256s in its
  `manifest.json`. 9.42 MB base64 → 7.06 MB binary. Untracked so far; `index.html` untouched.
- **Extraction came from the embedded base64, never from `pdf-templates/*.pdf`.** Verified
  by hash: `ClearPoint Contract 2026.pdf` (448 KB) and
  `WMP_Retail_Installment_Contract_2026.pdf` (1,128 KB) are **different bytes** from what
  ships (440 KB and 1,073 KB). Only `GA Document Quote Tool.pdf` matches its blob. Whether
  those two are newer templates or stale originals is an OPEN QUESTION (below).
- **Externalize 11, not 13.** `FQ_LOGO_WHITE_B64` / `FQ_LOGO_COLOR_B64` are 5 KB each and
  feed *synchronous* functions in the family-quote PDF builder; async would ripple for 0.1%
  of the payload. They stay inline. The 11 others are 9.40 of the 9.42 MB.
- **The 18 unnamed base64 blobs are fonts** (`FQ_FONTS` + pdf-lib standard-14 AFM data),
  0.29 MB total, needed synchronously during PDF generation. Out of scope, leave inline.
- **Two `atob(` calls must not be touched** — lines 8546 and 15714 decode canvas
  `toDataURL()` output, unrelated to templates.
- **Measured file shape:** 11.96 MB raw / 17,622 lines / 7.30 MB gzipped per load; base64
  is 81.2%; the app's own source is 2.30 MB raw → 670 KB gzipped; ~435 ms load, 0 console
  errors. There is no runtime performance problem.
- **The generators are drivable headlessly.** All 13 entry points exist on `window`;
  Firebase can be hard-blocked with `page.route()`; the sign-in gate does NOT block PDF
  generation (`PRICE_INDEX` still builds all 841 entries with Firebase dead); hiding
  `#bwGate` in the DOM is enough — no credentials involved.
- **Two fixture traps**, learned the hard way: the Combined quote keeps its own state
  (`_combCemLines`/`_combFhLines`) and needs `_syncCombinedCemetery()`,
  `_syncCombinedFuneral()`, `combUpdate()`; and **the RIC contract is generated FROM a
  cemetery quote** — without one it alerts and produces no download. A naive baseline
  silently captures nothing for 3 of 12 generators.
- **12 of the 13 generator entry points are already `async`** with `await` inside. Only
  `clDownloadFilledWorksheet` is synchronous.
- `npm run check` → `index.html: 9 blocks, 0 errors`. `npm test` → `368 passed, 0 failed
  across 12 suites`.
- Firebase auth usernames (`martice`, `randy`) and `BW_LOGIN_SUFFIX = '@bwquote.local'` are
  already public in `index.html`'s `BW_USERS` map. Committing them in test fixtures adds no
  new exposure.
- **The map repo is sprint-ready.** `wmp-cemetery-map/` is its own git repo with **no
  remote** (so map-side work can be committed locally but never pushed anywhere), and it
  already has a real `npm test` = `bake-alignment.test.mjs && npm run validate`. Green as of
  2026-07-25: **19 assertions + 2/2 unit files + 2,770 units + index ok**, exit 0.
- **`scripts/validate.mjs` was red and is fixed (2026-07-25, uncommitted).** Its file filter
  swept in every `.json` under `data/geojson/`, so the `areas.json` index was validated
  against `unit.schema.json` and failed for not being a FeatureCollection — a false alarm
  that trains people to ignore a red suite. It now validates `.geojson` only and checks
  `areas.json` as an index in both directions. Proven to fail correctly: a listed area with
  no build → exit 1; a valid build not listed → exit 1.
- **The map repo has other work in flight** — `data/garden-markers.json`, `data/mausolea/SER.json`,
  `docs/INDOOR_AND_NICHE_BUILDINGS.md`, `index.html`, plus untracked `MVCN.json`,
  `buildings/MVC.json`, `SER_SERENITY_PRICING.md`. Not ours. Stage by name there too.
- **`prices.json` already exists on the map side** — `wmp-cemetery-map/data/prices.json`,
  schema 2, generated 2026-07-25, purpose: "Single fee/price schedule shared by the cemetery
  map and the quote tool, replacing three copies that disagreed." **Sprint S2 is about making
  the TOOL consume it**, not about inventing a format.
- **The map/tool integration contract is now written down** in `DESIGN.md` §7, verified
  against both codebases rather than recalled. It previously existed only in session memory —
  the exact context rot this system exists to prevent.

## Decisions log

| Date | Decision | Where recorded |
|---|---|---|
| 2026-07-25 | Standing decisions from init interview | `DESIGN.md` §8 |
| 2026-07-25 | `ops/` tracked; bookkeeping under `[sNN/ops]` | `SPRINT_GUIDELINES.md` |
| 2026-07-25 | Opus for all tracks | `SPRINT_GUIDELINES.md` |
| 2026-07-25 | Sprint-02 is `prices.json`, built for repeated updates | `ROADMAP.md` S2 |
| 2026-07-25 | No `file://` support needed | `DESIGN.md` §8 |
| 2026-07-25 | Prefetch + retry + explicit error; no persistent cache | `DESIGN.md` §8 |
| 2026-07-25 | One change: loader in, literals out | `DESIGN.md` §8 |
| 2026-07-25 | Acrobat gate only when a change touches the RIC itself | `DESIGN.md` §5 |
| 2026-07-25 | Cross-repo sprints use ONE director and ONE `ops/`; tracks may target either repo | `DESIGN.md` §7 |
| 2026-07-25 | Map data never crosses into this repo in any form — not fixtures, comments, or reports | `DESIGN.md` §6 |
| 2026-07-26 | Org rollout is a future milestone, not a non-goal; no design may make it a rewrite | `DESIGN.md` §1, §8 |
| 2026-07-26 | Baseline covers 14 scenarios on a frozen clock; signature equality is exact | `DESIGN.md` §5 |
| 2026-07-26 | Template LOAD failures must surface by name; FILL failures may still warn | `DESIGN.md` §8, TRACK-A step 4b |
| 2026-07-26 | The baseline harness is tracked in `scripts/`, not gitignored `scratch/` | `DESIGN.md` §5, commit `b8528cb` |
| 2026-07-26 | Future state is **multi-tenant** (separate organisations), not more users at one site. Rescopes S6 and promotes the price-book work from tidying to structural blocker | `DESIGN.md` §1, `ROADMAP.md` S6 |
| 2026-07-27 | Contacts becomes a CRM (S8). Design authority delegated to the director; decisions D1–D10 | `sprints/sprint-04/SPRINT.md` |
| 2026-07-27 | A contacts view IS a URL — filters serialise into the hash, saved views are stored hashes, every view is dynamic | `sprints/sprint-04/SPRINT.md` D1 |
| 2026-07-27 | Next action and last activity are DERIVED from notes/tasks, never stored — no migration mechanism exists | `sprints/sprint-04/SPRINT.md` D4 |
| 2026-07-27 | Every CSV import is a batch and every batch is undoable; this is what makes importing into live data acceptable | `sprints/sprint-04/SPRINT.md` D7 |
| 2026-07-27 | The 30 demo contacts reach production by MARTICE importing them through the UI. No agent writes to production, ever | `sprints/sprint-04/SPRINT.md` close gate |
| 2026-07-27 | Taxonomies (source/status/category/flags/task kinds) are editable data with code defaults; a contact stores the CODE, never the label | `sprints/sprint-04/SPRINT.md` D5 |
| 2026-07-27 | Appointments and the calendar are deferred; to-dos with due dates cover follow-up for now | operator, 2026-07-27 |
| 2026-07-27 | The track cap is on PARALLELISM, not count — sequential tracks cannot conflict | `SPRINT_GUIDELINES.md` |
| 2026-07-26 | Field/offline capability is a **goal post, not a requirement** — not scheduled, not a non-goal. Sprint-01's no-persistent-cache decision stands; a service worker is the answer if field use becomes real | `DESIGN.md` §1 |

## Sprint history

| Sprint | Outcome |
|---|---|
| sprint-01 | **SHIPPED AND LIVE, verified on GitHub Pages 2026-07-26.** Eleven contract templates externalized to `pdf-templates/embedded/`, loaded on demand. `index.html` 11.96 MB → 2.554 MB raw, 7.30 → 0.879 MB gzipped (**8.3×**, not the 11× predicted — see below). All 14 generator signatures byte-identical, verified independently by the director. Merge `4019c92`; track commit `1e0c986` on `s01/externalize-templates`. |

### Sprint-01 live verification (close gate items 3, 3b and 5 — CLOSED 2026-07-26)

Pushed to `origin/main` and verified against the real deployment at
`https://marticeisme.github.io/bw-quote-tool/`. **Note the Pages URL** — an earlier session
message guessed `mmorrison-bw.github.io`, which is wrong; the GitHub account is `Marticeisme`.

- **All 11 externalized templates resolve over HTTPS**: HTTP 200, correct content types
  (`application/pdf`, xlsx), correct magic bytes (`%PDF` / `PK`), and **SHA-256 identical to
  the Gate 0 manifest** — 11 identical, 0 differing. This was the one thing localhost could not
  prove.
- **Live transfer size: 928,172 bytes gzipped** for `index.html`, against 7.30 MB before.
  Confirmed on the wire, not measured on disk — the dev server does not compress, so the local
  close-gate check (item 3) was never actually checkable; it needed the real host.
- **A full RIC generated end to end from the live site** (`scratch/live-contract-check.mjs`,
  Firebase blocked and stubbed, read-only): 1,923 KB download, `%PDF`, no dialogs, no page
  errors. The templates fetched were `RIC_PDF_B64`, `ACH_PDF_B64`, `RULES_PDF_B64` **and
  `RIC_CL_PDF_B64`** — the fourth arriving because `bwPrefetchTemplates('ric')` fires on
  section entry, i.e. the prefetch works in production as designed.
- **That live PDF is identical to the verified baseline** (`scratch/live-ric-signature.py`):
  6 pages, 141 AcroForm fields, **0 of 141 field values differing, 0 of 6 pages of text
  differing**. The contract a counselor gets from the live site is the contract that was
  verified locally.
- The harness ran from `scripts/`, closing item 3b.

**A scar worth keeping:** the first version of that comparison reported a MISMATCH on
`textHash`/`fieldsHash` while showing zero differing fields. The signatures were recorded by
Node (`JSON.stringify`) and recomputed in Python (`json.dumps`), which inserts spaces after
`:` and `,` — different strings, identical data. **Never compare hashes across two serializers;
compare the content.** `signatures.json` stores the full text array and field map precisely so
content comparison is possible.

### Sprint-01 close notes

**Verified by the director, not taken from the track's report:** `npm run check` →
`index.html: 8 blocks, 0 errors`; `npm test` → `368 passed, 0 failed across 12 suites` with
per-suite counts unchanged; a fresh `TAG=audit` capture diffed against the reference baseline →
**all 14 signatures identical**, including the RIC's 6 pages / 141 fields and
`printGAContract`'s 11 / 261; all 13 committed templates hash-match the Gate 0 manifest; no
contract-template base64 remains inline; no emails or phone numbers anywhere in the diff. The
merged `main` is byte-identical to the audited branch for `index.html` and every template
(`git diff` empty), so the branch verification carries over — and with the capture clock frozen
there is no nondeterminism a re-run could surface.

**Deviation — the gzip target was wrong, not the work.** DoD item 1 demanded ≤750 KB; the
result is 879 KB. The residual 0.303 MB of inline base64 is pdf-lib's standard-14 AFM metrics,
`FQ_FONTS` and the two SVG logos, all explicitly out of scope. Stripping only those gives
656 KB — exactly the "~0.67 MB" the sprint predicted. The target was the *font-free* number
applied to a file that always keeps its fonts. Corrected in `SPRINT.md` to 880 KB.
**Lesson: when a size target excludes something, state the target including what it excludes.**

**Three track decisions the director reviewed and accepted:**

1. **The loader checks magic numbers, not just `res.ok`** — because `dev-server.mjs`'s SPA
   fallback answers a missing file with `index.html` at **HTTP 200**. The track's first gate-5
   run reproduced the pre-fix bug exactly: a 4-page RIC downloaded with no alert. Now `%PDF` /
   `PK` is required. Independently corroborated — the served `index.html` is 2,678,324 bytes,
   the exact figure in the track's error message. A captive portal or proxy error page behaves
   the same way, so this earns its keep in production.
2. **ClearPoint's cremation-authorization page got the same load/fill split** as ACH and Rules,
   one call site beyond the letter of step 4b. Accepted: `atob(GA_PDF)` on an always-present
   literal could never fail, so leaving `await bwTemplate()` inside that `catch(e){warn}` would
   have *introduced* a new silent failure. The change preserves the invariant rather than
   altering behavior, and `DESIGN.md` §8 states the load/fill rule generally.
3. **Five entry points gained a `try/catch` + `alert`** (`riclGeneratePdf`, `anclGeneratePdf`,
   `gaclGeneratePdf`, `cpclGeneratePdf`, `clDownloadFilledWorksheet`). None had any catch, so a
   loader rejection would have escaped as an unhandled promise rejection with nothing on
   screen — which would defeat the whole point of deleting the old `typeof … === 'undefined'`
   alerts. Each is a minimal 3-line wrap; no function body re-indented.

**A track claim the director wrongly "corrected".** Track A reported the Browser pane opening
`index.html` "via the PostToolUse hook". The director looked for that hook in
`.claude/settings.json` and the user-level settings, found none, and recorded the track as
having misattributed the mechanism. **The track was right and the correction was wrong.** It is
a genuine `PostToolUse:Edit` hook, implemented at the *harness* level — which is exactly why it
is in no settings file and cannot be disabled from one. The director reproduced it minutes
later on `vault-guide.html`, where it announced itself verbatim: `PostToolUse:Edit hook
additional context: <file> is now visible in the Browser pane`. `DESIGN.md` §6 now records the
correct mechanism.

**Lesson, and it cuts the opposite way to the usual one:** "verify, don't trust" applies to a
director's own disconfirming evidence too. Absence from the two settings files did not prove
absence of the hook; it only proved absence *from those files*. A negative result across an
incomplete search space is not a refutation. When a report names a mechanism you cannot find,
the honest finding is "I could not confirm it", not "it does not exist".

## The map audit — MERGED into the map's `main` 2026-07-26 (`b9677db`)

Branch `audit/map-bugs`, 9 commits, merged as **`b9677db`**. It had been held back while the
other session finished; that session committed (`2afde80`, `36aacd3`) and the merge went ahead.

**It conflicted, and the resolution mattered.** Both sides had rewritten the same rendering
code in `wmp-cemetery-map/index.html`. Taking either side wholesale would have silently
destroyed the other's fix:

- **CSS block** — kept both. Their `--col-cell`/`--col-gap` variables (a double-width unit must
  be exactly two cells *plus* the gap between them) and the audit's
  `max-width: min(2400px, 100%)` (which stopped the three widest structures hanging 450px off
  the left edge with the Back button unreachable). Orthogonal changes.
- **`renderColumbarium`** — took their CSS-grid layout, which draws units at real size via
  `w`/`h` spans, and carried the audit's `data-wall`/`data-lvl`/`data-sp` attributes and
  `escapeHtml` calls into it. `runColLassoHit` reads those attributes instead of splitting an
  id on hyphens; dropping them re-breaks the lasso in 9 of 12 structures.

**Verified in a browser at 1500px and 1100px**, not just by suite: TGM 318 units, COM 875,
COH 304, GCM 1011, ELM 477 — every card on screen, Back reachable, every unit carrying
`data-wall`, zero overlapping grid placements, no page errors. TGM at 1100px now sits at
left=0 with Back at 16; it was at −450. And **MVCN, their brand-new glass-front wall, renders
146 units all carrying `data-wall`** — it inherits the lasso fix, which neither branch could
have demonstrated alone. Suite: 19 + 7 + 8 and `2/2 unit files valid, 2770 units checked,
index ok`. No screenshots captured — the wall view renders occupant names.

**Director-verified, not taken from the report:** sid entries 59,693 → 79,493, exactly +19,800
added and **zero removed** (purely additive, no existing lookup disturbed); suite 19 → 34
assertions, 0 failed; `KNOWN_CONFLICTS` holds position identifiers only, no names; nothing
crossed into this public repo.

**Two live data conflicts are escalated and unresolved — these need MIS and the paperwork.**
Two spaces each record two different people at the same interment position, which `validate.mjs`
treats as the data shape of a double sale. One is two interments both at depth "2nd"; the other
is an interment at "2nd" plus a different person's reserved right at "2nd". They are in **CN**
and **ELN**, identified by position key in `KNOWN_CONFLICTS` at the top of
`wmp-cemetery-map/scripts/data-integrity.test.mjs`. The suite fails on any new conflict AND on a
listed one that stops conflicting, so the list cannot go stale. **Nothing was changed in the
data.** Resolving which record is correct is Martice's, against MIS.

## Advisor identity — shipped to local `main` 2026-07-26 (merge `cd16fdf`)

Out-of-sprint, operator-requested. Branch `fix/advisor-identity`, 6 commits, never pushed.

**The bug:** the signed-in counselor's identity reached nothing that got generated. Randy
signed in and Martice's name came out on the paperwork — including `A4176-PG1-1`, the
Insurance Producer of record on the Global Atlantic application. Identity now resolves
through one accessor, `bwCurrentAdvisor()`, with **no fallback**: an account missing from
`BW_USERS`, or an entry missing a field, gets nothing for it and never another counselor's
value. Also fixed: Family Guides opens in its own tab instead of destroying in-progress work,
and closing with unsaved changes now warns.

**The GA producer ID is deliberately blank** for anyone without one on file (Martice,
2026-07-26). A wrong-but-plausible ID reads as a complete form and gets filed; a blank field
is self-evidently unfinished and gets caught. Same fail-visibly rule as sprint-01's
load-versus-fill split. **Randy hand-writes his on the generated PDF until an ID is added.**

**Director-verified, not taken from the report:** `8 blocks, 0 errors`; `467 passed, 0 failed
across 14 suites` (up from 368/12, no suite fell); **as martice 14 identical, 0 differing** —
his identity is on file, so nothing of his moved, which is what proves the change is scoped;
**as randy 0 structural changes**, 14 field changes and 20 changed page-texts, all 20 texts
explained entirely by advisor identity once identity tokens are normalised; the producer-ID
change isolated against the prior randy capture as **exactly one field**, `A4176-PG1-2`
`"183881"` → `""`, with `printGAContract` still 11 pages / 261 fields.

**Two director errors this work exposed — both worth keeping.**

1. **The recon handed to the track was wrong twice.** It listed ~19 hardcoded sites when there
   are 37, missing the advisor block printed on every family-quote PDF and the Insurance
   Producer email; and it asserted the sidebar at line 629 was already resolved at runtime.
   It was not — the Overview contact panel had been showing Randy the wrong email and phone
   to read out to a family. The track verified instead of trusting, which is the only reason
   both were caught. **A director's recon is a lead, not a finding; say so when handing it over.**
2. **A `[s01/ops]` commit landed on the feature branch instead of `main`** (`a7ba776`). The
   director left a shell `cd`'d into the worktree and used bare `git` — violating this
   project's own "with worktrees, ALWAYS `git -C <absolute-path>`" rule, which exists for
   precisely this. Staging explicit paths is the only reason it did not also sweep the
   track's in-flight edits into the commit. It was left in place rather than reset, because
   git surgery inside a worktree while an agent is live is the more dangerous move; it rode
   in with the merge and the merge message records it. **Use subshells — `( cd X && cmd )` —
   for anything needing a working directory, and `git -C` for every git call.**

**Still open:** `BW_DEFAULT_ADVISOR` is `martice`, so if the auth SDK is unreachable and
someone reaches generation without a signed-in user, documents carry Martice's full identity
**including his producer ID** — the exact bug just fixed, resurfacing on one edge path. The
sign-in gate normally prevents it. Worth deciding whether an unauthenticated generation should
instead produce a visibly blank advisor.

## Sprint-02 (map inventory styling) — MERGED 2026-07-26

Branch `s02/map-inventory-styling`, 3 commits, merged `--no-ff` in the map repo. That repo has
no remote, so nothing is pushed and nothing can be.

**Director-verified rather than taken from the report.** Both new gates were proven by
**sabotage**, which is the only way to know a verification gate is real:

- dropping `--tint-alpha` to `.02` → `render.test.mjs` **exits 1**, five assertions red,
  including the direction check flipping to `rgb -6.7,-5.8,-0.1`. That one fires if the
  available/buried difference ever starts coming from headstones rather than from the styling.
- removing one `STATUS_TREATMENT` entry → `status-coverage` **exits 1**, `no treatment for: tree`.
- restored → `npm test` exits 0. Suite is now **19 + 7 + 8 + 11 + 24** plus validate; counts rose,
  none fell.

A first sabotage attempt hit a colour table instead of `STATUS_TREATMENT` and passed, which
would have been reported as a toothless gate. **Confirm a sabotage actually broke what you aimed
at before concluding anything from it.**

**Twelve indoor and routing functions are byte-identical to `b9677db`** — verified by extracting
each function body and comparing, not by reading the claim. That matters because `b9677db` was
the hand-resolved merge; all three of its markers (`data-wall`, `min(2400px, 100%)`,
`var(--col-cell)`) survive.

**OPERATOR GATE, open.** The 15% tint is *measurably* real — 24.7/255 at overview, 16.5 at scan
zoom, with wide machine margins — but over bright dry grass at zoom 4–8 it reads as a light cast
across whole blocks rather than something that jumps out. In digital mode it is unmistakable.
**Only Martice can judge the photo case.** Tuning is one token, `--tint-alpha` in `:root`, and
the thresholds sit at roughly half the measured values so raising it stays green.

**Known inconsistency, deliberate:** `available` is cream outdoors and green indoors. The indoor
palette was left alone because the sprint's visual argument is about photographic ground, and
indoors there is no photo. Worth a decision; was not worth risking in this sprint.

**New coupling to watch:** the map suite now needs Playwright, which is *not* a declared
dependency — `scripts/playwright-resolve.mjs` borrows this repo's install and fails loudly rather
than skipping. So that repo can no longer run its own suite from a clean clone. Same class of
durability gap as the baseline harness moved into `scripts/` earlier today.

**Pre-existing bug fixed in passing:** per-label `font-size` never applied — an SVG presentation
attribute outranks an author CSS rule, so 3,148 Lake Urn Garden labels rendered 4.5× too large
and hid the outlines beneath them.

**Pre-existing bug found and deliberately NOT fixed:** re-entering `#space=<sid>` while that
garden is *already open* never highlights — `showDetail` rebuilds the overlay asynchronously and
the wait is satisfied by the outgoing garden's polygons. Confirmed identical on `b9677db`, so not
a regression. Cold-load deep links, the real path from the quote tool, work. Routing, not
styling — wants its own ticket.

## Open items for upcoming sprints

- **The two mismatched templates.** `pdf-templates/ClearPoint Contract 2026.pdf` and
  `WMP_Retail_Installment_Contract_2026.pdf` differ from the bytes actually shipping. Are
  they newer templates Martice meant to adopt, or stale pre-processing originals? **Resolve
  in its own sprint, never inside sprint-01** — adopting them silently would change a live
  contract.
- **The real customer names remain in git history** on `index.html`, in prior commits.
  The live page is clean as of `0174bf3`. Rewriting public history is impractical; noted,
  accepted, not scheduled.
- `BW_MAP_BASE` still points at `http://localhost:8642/index.html`.
- Quotes saved before `d2a1cb2` carry no `lines` and are exposed to the price-change bug.
  Export a backup before any price edit — relevant to sprint-02.
- Timing of the contact link offer: it appears *after* save, once the view has already
  switched. Might sit better before. Raised twice, unanswered, needs real use.
- Sign-in usernames are public in `index.html`; account security rests entirely on the two
  passwords. Pre-existing, not urgent, worth a thought.
