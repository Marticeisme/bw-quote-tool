# Sprint-28 — Compare-print parity + September 2026 incentives + Veteran space credit

**Opened 2026-09-03.** Director: Fable remote session (branch
`claude/print-comparison-september-incentives-sv23lk`). Tracks: Opus, worktree-isolated.
Operator's ask, in-chat 2026-09-03 (token-conscious sprint):

1. "The comparison options and more specifically the print comparison functions do not
   look the highest of quality compared to our other quotes. Fix that."
2. Add a **Veterans discount: $5,995 off a space, requires a DD-214, pre-need OR at-need.**
3. **September Customer Incentives** (new property only, Sept 1–30):
   10% off new pre-need burial property · 20% off select Mausoleum Rows E, F & G ·
   20% off cremation property · $1,000 off burial Opening & Closing · $500 off cremation
   Opening & Closing · 0% financing 60 months with 10% down and ACH.
   **Second Rights are NOT included in any property discount.**

## Director assumptions (not operator rulings — logged for the close gate)

- The September sheet is rate-for-rate identical to August; the change is the month,
  the validity date (Sept 30, 2026) and every user-facing "August" string. Mode ids
  (`promo_burial` / `promo_crem` / `promo_property`) stay — they live in saved quotes.
- Veteran credit = a flat **$5,995 credit against ONE space** (any garden / niche /
  crypt), capped at the price of one space, never touching ECF, O&C, or 2nd rights.
  Available on pre-need and at-need cemetery quotes. Requires the counselor to attest a
  DD-214 was received (checkbox on the discount row; the printed line says "DD-214 on
  file"). Per the standing incentive note it does not combine with the monthly property
  incentive — warn, do not block.
- "Comparison options" = the cemetery Compare panel + its Option B builder, the FH
  Compare panel, and both print functions. Parity target = the `_fq*` family-quote print
  system used by `printCemQuote` / `printFhQuote`.

## Reality at open

main == origin/main `43482dd`. Gate 0: `index.html: 8 blocks, 0 errors`; full suite
baseline being measured at spawn (STATE pin 3514/49).

## Tracks

- **A `s28/compare-print`**, worktree `../bw-quote-tool-s28a`, `PORT=3747`. Brief `TRACK-A.md`.
- **B `s28/sept-incentives`**, worktree `../bw-quote-tool-s28b`, `PORT=3757`. Brief `TRACK-B.md`.

Both edit `index.html`; A owns `printCompare`/`printFhCompare`/the compare panels'
print path; B owns discount options, promo math, the incentive note, and the Option B
discount select's option TEXT (A must not edit those option strings).

## Gates

- Track: 8/0; full suite green with count ≥ baseline; new/updated suites sabotage-proven;
  Playwright renders of the print output eyeballed and left in `scratch/s28-<x>-renders`.
- Close (operator): push word for `main`; eyeball a compare print (cem + FH); ruling on
  the veteran-credit assumptions above.

## Merge order

B then A, `--no-ff`. Director pushes ONLY the session's designated `claude/...` branch
(the remote container is ephemeral); `main` stays an operator gate.

## Amendment 2026-09-03 (operator, in-chat, mid-sprint)

"Randy should not see all of my quotes or contacts; mine stay the same — I see
everything." → **Track C `s28/visibility`**, worktree `../bw-quote-tool-s28c`,
`PORT=3777`, brief `TRACK-C.md`. Director assumptions for the close gate: admin = the
`martice` account; visibility = record `ownerUid` (or `ownerHandle`) equals the signed-in
user; legacy records without an owner are visible to the admin only, with an admin-only
owner hand-off control; Firebase rules unchanged (UI-level split, trusted colleague).
Merge order becomes **B, A, C**.

Environment note: in this remote container `test-catalog-filter-print.mjs` loses 17
assertions on untouched main because headless Chromium's Google Fonts request resets
(no proxy); the Playwright browser build also had to be aliased (1223 → installed 1194).
