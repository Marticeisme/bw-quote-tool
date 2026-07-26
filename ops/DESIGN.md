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

- **Not an org rollout.** Two users, Martice and Randy. Do not pre-build account types, a
  manager role, rules-enforced ownership, or a shared duplicate-detection directory. All
  are cheap to add when a second kind of user actually exists.
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
| JS syntax, every inline block | `npm run check` | `index.html: 9 blocks, 0 errors` |
| Assertion suites | `npm test` | `368 passed, 0 failed across 12 suites` |
| Page verifiers | `scripts/verify_catalogs.mjs`, `scripts/verify_guides_page.mjs` | run automatically by the push hook on touched surfaces |
| Generator output | `node scratch/baseline-capture.mjs` + `baseline-sign.mjs`, diff `signatures.json` | identical to the recorded baseline |
| **RIC in Adobe Acrobat** | by hand, operator only | **required only when a change touches the RIC itself** — its content, fields, or field mapping. Not required when the RIC's bytes are provably unchanged. |

`npm test` starts `dev-server.mjs` on 3737 if nothing is listening and stops it after.

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
  editing Firebase-touching code.
- Nothing in `ops/` may contain customer data.

## 7. Standing decisions ledger (operator-confirmed)

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
