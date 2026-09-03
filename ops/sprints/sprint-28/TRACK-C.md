# TRACK C — s28/visibility

Per-user visibility of saved records. Operator's ask, in-chat 2026-09-03: "I'd like for
Randy to not be able to see all of my quotes or contacts, but mine can stay the same
where I can see everything." Work in worktree `/home/user/bw-quote-tool-s28c` on branch
`s28/visibility` (created; `node_modules` symlinked). Run tests with `PORT=3777`. Obey
`ops/SPRINT_GUIDELINES.md`, `ops/DESIGN.md`, `CLAUDE.md`. Never block on questions; log
decisions in your report. Do NOT push.

## Rule

- `BW_USERS` (~index.html:12659) gains `admin: true` on `martice`. One accessor,
  `bwCanSeeAll()` → true for an admin handle (resolved via `bwCurrentAdvisor().handle`),
  false otherwise. No other role logic.
- A non-admin sees ONLY records whose `ownerUid` equals their own `window._bwUser.uid`.
  An admin sees everything, exactly as today.
- Applies to: all seven saved-record types in the quote store (`quotes/<type>/…`:
  cem, fh, ric, ga, cp, an, dt — the arrays `_cemSavedQuotes`, `_fhSavedQuotes`,
  `_ricSavedContracts`, `_gaSavedContracts`, `_cpSavedContracts`, `_anSavedContracts`,
  `_dtSavedTransfers`) and to contacts (`_partyStore` → `_parties`, ~12812), plus every
  child of a hidden contact (notes, tasks, property, roles) simply because the contact is
  hidden.
- Enforce at the DERIVED-VIEW layer — `_rebuildTypeArray(type)` for quotes and the
  `_parties` derivation for contacts — so every surface inherits it: saved lists, search,
  the contact home/attention counts, holdings, compare pickers, the sidebar/overview
  counts, dashboard counts if they read these arrays. Do not sprinkle per-surface filters.
- Firebase rules are NOT changed (Randy is a trusted colleague; this is a UI-level
  book split, same stance as the existing `ownerUid` comment at ~12810). Say so in the
  report.

## Ownership stamping

- Saved quotes/contracts: verify whether the record snapshots (`saveCemQuote` ~17478,
  `saveFhQuote`, the RIC/GA/CP/AN/DT save paths that reach `saveQuoteRecord` ~12592 and
  `bwSaveRecordAndWriteBack` ~17206) already carry a uid. If not, stamp `ownerUid` in
  ONE place — `saveQuoteRecord` — blanks-only (an existing ownerUid survives a re-save by
  the admin). Contacts already stamp `ownerUid` on create (~14192).
- **Legacy records with no `ownerUid`** (director assumption, operator rules at close):
  visible to the ADMIN ONLY. So the admin never loses anything, and Randy's list starts
  with what he saves from now on. Give the admin a way to hand a legacy record to a
  user: an "Owner" control on the saved-record row (admin-only, the seven lists share
  `renderSavedQuotesList` ~17916) that sets `ownerUid` to a BW_USERS account's uid.
  Since production uids are opaque, resolve a handle → uid the way `bwUidName` (~13202)
  does in reverse: store `ownerHandle` alongside `ownerUid` on every stamp, and let the
  visibility test accept EITHER `ownerUid === me.uid` OR `ownerHandle === me.handle`.
  Contacts already expose an Owner field in the contact editor — leave it; confirm it is
  admin-usable.

## THE hazard — read before touching any write path

`persistSavedQuotes()` and any other whole-node `.set()` replaced the entire node and
wiped real data on 2026-07-11 (CLAUDE.md §3). If a filtered VIEW ever feeds a WRITE, a
non-admin's save would erase every record he cannot see. Therefore:
- Filtering must live only in the derived arrays. Every write must read from the full
  stores (`_quoteStore[type]`, `_partyStore`) — audit every `.set(` / `.update(` /
  `.remove(` on quotes and parties and list each one in your report with "reads from
  full store: yes".
- Pin it with a sabotage-proof test: sign in as a NON-admin with the fake Firebase
  holding records of both users; save a new quote; assert the fake DB still holds every
  other user's record. Then break the filter (feed the view to a write) and watch the
  test go red; restore.
- Tests use `tests/fake-firebase.js`; never touch production. Look at
  `tests/test-advisor-identity.mjs` and `tests/test-signin-gate.mjs` for the two-account
  sign-in pattern.

## Verification (you run it; the director re-runs it)

- `npm run check` → 8/0.
- New `tests/test-visibility.mjs`: admin sees all; non-admin sees only own across every
  type and contacts; legacy unowned → admin only; save stamps ownerUid+ownerHandle;
  admin owner hand-off makes a record appear for the non-admin; the persist hazard case
  above; counts on the contact home respect the filter. Sabotage-prove at least two.
- `PORT=3777 npm test` green, count ≥ baseline the director reports (note: in this
  container 17 assertions in `test-catalog-filter-print.mjs` fail for a network reason —
  Google Fonts resets in headless — on untouched main too; that is the only accepted red).
- Constraints: CRLF; never `.replace('</body>',…)`; no `git add -A`; contract download
  code untouched; commit messages without any AI model name.

## Report

Files/functions changed, the write-path audit table, counts before/after, assumptions
relied on, anything unverified.
