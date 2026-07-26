# STATE — Living Ledger

**Current sprint:** sprint-01 **MERGED to local `main` and green — awaiting Martice's push.**
Next: `sprints/sprint-02/` (to be drafted).
**Last updated:** 2026-07-26 (Track A audited and merged; two out-of-sprint audits still running)

## Status

The contact/CRM layer shipped 2026-07-24 (12 commits). On 2026-07-25 the verification
contract was made real: the 13 test suites moved out of gitignored `scratch/` into `tests/`
with a single runner (`npm test`, 368 assertions), real customer data was scrubbed from
them and from `index.html`'s comments, and both fixes are pushed and live.

Sprint-01 (externalize the embedded base64) is drafted and **Gate 0 is already complete** —
the generator baseline was captured on unmodified `main` and the 13 templates were
extracted and hash-verified. `index.html` is unmodified. The next action is `/sprint direct`
to plan and spawn Track A.

## Background jobs

| Job | Status | Manifest/where to check | Started | Notes |
|---|---|---|---|---|
| Track A — externalize templates | **DONE, merged `4019c92`** | branch `s01/externalize-templates` (kept; durable) | 2026-07-26 | Audited and merged. Port 3737 released. |
| Guides audit + granite marker PDF | **DONE, merged** | branch `guides/marker-pdf-colors`, own worktree | 2026-07-26 | **Out-of-sprint**, operator-requested. Not part of sprint-01's definition of done — merge and audit it separately so S1 stays auditable. Fixes the granite-swatch bug **and everything else it finds** (scope widened by the operator mid-flight); escalates rather than guesses on anything needing a business decision — prices, policy, which page is source of truth. Worktree + its `node_modules` junction need director cleanup. |
| Map bug audit + fix | **DONE, NOT merged — see below** | map branch `audit/map-bugs`, worktree at `C:\Users\Martice\map-audit\wmp-cemetery-map` | 2026-07-26 | **Out-of-sprint**, operator-requested. Deliberately placed OUTSIDE `bw-quote-tool` — a map worktree inside the parent would fall outside both the `.gitignore` entry and the guard hook's `wmp-cemetery-map` basename check, putting real burial PII in a public repo's working tree as untracked files. Worktree kept the `wmp-cemetery-map` basename so the hook still treats it as its own repo. Director must `git worktree remove` at cleanup. |

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

## Sprint history

| Sprint | Outcome |
|---|---|
| sprint-01 | **Shipped to local `main`, not yet pushed.** Eleven contract templates externalized to `pdf-templates/embedded/`, loaded on demand. `index.html` 11.96 MB → 2.554 MB raw, 7.30 → 0.879 MB gzipped (**8.3×**, not the 11× predicted — see below). All 14 generator signatures byte-identical, verified independently by the director. Merge `4019c92`; track commit `1e0c986` on `s01/externalize-templates`. |

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

## The map audit — done, merged nowhere, and two things need Martice

Branch `audit/map-bugs` in the map repo (9 commits, no remote). **Deliberately NOT merged:** it
touches `wmp-cemetery-map/index.html`, and the other session still has that file plus six others
uncommitted in the primary map tree. That merge is theirs to sequence — a director must not
resolve another session's in-flight work. `main` there is still `2bf09c0`.

**To merge, once the other session has committed:**
`git -C wmp-cemetery-map merge --no-ff audit/map-bugs` then `npm test` (expect 19 + 7 + 8
assertions and `2/2 unit files valid, 2770 units checked, index ok`). The worktree at
`C:\Users\Martice\map-audit\wmp-cemetery-map` can then be removed with
`git -C wmp-cemetery-map worktree remove ../../map-audit/wmp-cemetery-map`.

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
