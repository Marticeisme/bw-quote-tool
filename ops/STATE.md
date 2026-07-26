# STATE — Living Ledger

**Current sprint:** sprint-01 (drafted, Gate 0 COMPLETE, tracks NOT yet spawned) →
`sprints/sprint-01/SPRINT.md`
**Last updated:** 2026-07-25 (init — system scaffolded, Gate 0 pre-completed)

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
| (none) | | | | |

## Verified facts a director can rely on (2026-07-25)

Do not re-derive these.

- **Baseline captured, 12/12 generators**, on unmodified `main`. Artifacts, `manifest.json`
  and `signatures.json` in `%TEMP%\bw-baseline\before` (9.1 MB). Harness:
  `scratch/baseline-capture.mjs` + `scratch/baseline-sign.mjs`. Re-run with `TAG=after`.
  Key signatures: RIC 6 pages / **141 AcroForm fields**, ClearPoint 3 / 106, the four
  checklists 1 page / 10–15 fields, the three quote PDFs 2/1/3 pages / 0 fields
  (drawn — text-hashed instead), CIRGAS 179 zip entries, commission worksheet 21.
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

## Decisions log

| Date | Decision | Where recorded |
|---|---|---|
| 2026-07-25 | Standing decisions from init interview | `DESIGN.md` §7 |
| 2026-07-25 | `ops/` tracked; bookkeeping under `[sNN/ops]` | `SPRINT_GUIDELINES.md` |
| 2026-07-25 | Opus for all tracks | `SPRINT_GUIDELINES.md` |
| 2026-07-25 | Sprint-02 is `prices.json`, built for repeated updates | `ROADMAP.md` S2 |
| 2026-07-25 | No `file://` support needed | `DESIGN.md` §7 |
| 2026-07-25 | Prefetch + retry + explicit error; no persistent cache | `DESIGN.md` §7 |
| 2026-07-25 | One change: loader in, literals out | `DESIGN.md` §7 |
| 2026-07-25 | Acrobat gate only when a change touches the RIC itself | `DESIGN.md` §5 |

## Sprint history

| Sprint | Outcome |
|---|---|
| (none run yet) | sprint-01 drafted, Gate 0 complete |

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
