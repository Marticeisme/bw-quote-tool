# TRACK B — s28/sept-incentives

Roll the cemetery incentives from August 2026 to September 2026 and add a Veteran
space credit. Work in worktree `/home/user/bw-quote-tool-s28b` on branch
`s28/sept-incentives` (created; `node_modules` symlinked). Run tests with `PORT=3757`.
Obey `ops/SPRINT_GUIDELINES.md` and `ops/DESIGN.md`. Never block on questions; log
decisions in your report. Do NOT push.

## 1. September 2026 incentives (new property only, Sept 1–30)

Operator's sheet: 10% off new pre-need burial property · 20% off select Mausoleum Rows
E, F & G · 20% off cremation property · $1,000 off burial Opening & Closing · $500 off
cremation Opening & Closing · 0% financing for 60 months with 10% down and ACH.
**Second Rights are NOT included in any property discount.**

That is rate-for-rate the August logic already in `cemUpdate()` (~index.html:8332) and
in the compare Option B (`calcBTotal` ~9066). Do NOT change mode ids
(`promo_burial`/`promo_crem`/`promo_property` are persisted in saved quotes). Change:
- every user-facing "August" string: discount `<select>` options in `addCemDiscount`
  (~8560) and `cmpB_discType` (~1234), the incentive note `#aprilPromoNote` (~2339,
  validity → September 30, 2026), code comments/labels ("August incentive" fallback
  label ~8369), the E/F/G chip title, and anything else `grep -n -i august` finds in
  index.html that is incentive-related (leave unrelated "August" dates alone).
- Make the "Second Rights are not included" rule explicit in the note and confirm with
  a test that a 2nd-right line is excluded from every property rate (August already did
  this — pin it under the September name).
- Rename/refresh `tests/test-august-promo.mjs` → `tests/test-september-promo.mjs`
  (update its header comments; keep every existing assertion that still holds).
- Check `dashboard.html` and any guide/page that lists monthly incentives
  (`grep -il "incentive" *.html docs/*.md`) — update only incentive text, and leave
  `docs/BRAND_AND_BUILD_LOG.md` alone (another session's log).

## 2. Veteran space credit — $5,995 off one space, DD-214 required, pre-need OR at-need

Director assumptions (log them as such in your report; operator rules at close):
- New discount mode `promo_veteran` under a new optgroup "🎖️ Veteran" in
  `addCemDiscount` and as an option in `cmpB_discType` (Option B compare) — label
  "Veteran Space Credit — $5,995 off one space (DD-214 required)".
- Amount = `min(5995, price of ONE space)` where the space is the ground space, niche,
  or crypt on the quote (if several kinds are present, credit the highest-priced single
  space). Never touches ECF, O&C, markers, merchandise, or additional/2nd rights. One
  credit per veteran; a second row would be a second veteran — allow it, cap each.
- Works on pre-need and at-need cemetery quotes (`cemQuoteType()`); at-need commission
  math (`tests/test-atneed-commission.mjs`) must treat it as a property discount for
  `propDiscPortion`, like the promos.
- A **"DD-214 received"** checkbox on the discount row (reuse the `.disc-efg-wrap`
  chip pattern, its own class). Until checked the credit still computes but the row
  shows a red "DD-214 required" hint and the printed line reads "(DD-214 required)";
  when checked it reads "(DD-214 on file)". Persist the checkbox with the row (see the
  saved-quote serialize/restore of `.disc-mode` rows ~12296–12310 and the efg chip's
  path) — a restored quote must bring the flag back.
- Customer-facing label: "Veteran Space Credit — $5,995 off one space (DD-214 on file)".
  The RIC `compactDiscLabel` (~18542) truncates non-% labels to 28 chars; verify what it
  produces and make it sensible (a structured field like the promos' `propDiscPct` is
  acceptable) — but change nothing else in contract code.
- Warn (not block) when a veteran row and a monthly-incentive row coexist: the
  incentive note already says they don't combine; surface an inline warning in the
  discount panel.

## Constraints

- Quotes work must not touch contract download code beyond the label verification above.
- CRLF line endings; never `.replace('</body>',…)`; no `git add -A`. Commit locally.
- Never call save/persist functions from a test (production Firebase). Read-only tests.

## Verification (you run it; the director re-runs it)

- `npm run check` → 8/0.
- `tests/test-september-promo.mjs` (renamed) green; add veteran cases: pre-need space
  $9,995 → credit $5,995; Veterans Garden $5,995 → credit $5,995; niche only; at-need
  path; 2nd right present → untouched; save → reload restores mode + DD-214 flag (fake
  Firebase); Option B compare veteran mode. Sabotage-prove.
- `PORT=3757 npm test` green, count ≥ baseline the director reports.
- Playwright screenshot of the Discounts panel with a veteran row (checked and
  unchecked) into `scratch/s28-b-renders/`.

## Report

Files/functions changed, counts before/after, render paths, assumptions logged,
anything unverified.
