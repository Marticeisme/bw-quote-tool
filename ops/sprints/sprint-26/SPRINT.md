# Sprint-26 — Contact auto-import on contract linking

**Opened 2026-08-25.** Director: Fable session (same session also shipped the two at-need
guides + the one-page What-to-Do-First rework, all pushed with operator word before this
sprint opened). Tracks: Opus per policy. Operator's ask, in-chat 2026-08-25 (verbatim
intent): "when you link a contact to a cirgas ric etc. it does not auto import their
address phone number etc. but i believe this should happen if i save a contact from a
cirgas or ric previously and have filled that information out."

## Operator rulings at open (in-chat 2026-08-25)

1. **Import rule: fill blanks only.** Linking a contact fills any EMPTY address/phone/
   email field in that person's role block. Nothing already typed is ever overwritten.
2. **Write-back at save: fill the contact's blanks.** Saving a contract copies typed
   address/phone/email onto each linked contact's record ONLY where the contact record
   has nothing yet. Hand-entered contact data is never overwritten. (This is the half
   that makes the data exist to import next time.)
3. **Scope: all four contract lanes** — RIC, CIRGAS (purchaser + co-purchaser by role),
   Global Atlantic (insured/owner/beneficiary by role), ClearPoint. Cemetery/FH quote
   lanes keep the existing name-only fill (they have no address fields).

## Reality at open (director-measured)

- `npm run check`: `index.html: 8 blocks, 0 errors` (measured this session).
- Full suite: run in progress at spawn time (background log `scratch/s26-gate0-suite.log`);
  spawn is conditional on it printing the 3336/47 pin green.
- Linking today fills only the NAME via `_bwFillNameFromLink` (index.html ~16577),
  driven by `BW_LINK_MODULES` (~16552). `contractRoles` join is saved; no field
  harvesting exists in either direction.
- Every lane has per-person field blocks: `anPurch*`/`anCoPurch*`,
  `gaInsured*`/`gaOwner*`/`gaBenef*`, `cpAddress/cpPhone` + `cpAddress2/cpPhone2`,
  `ric{Street,City,Zip,Phone,DayPhone}`. `ricDayPhone` is a combined Email/Day-Phone
  field with a standing don't-mask rule at ~20736.
- Party schema (from `submitContactEditor` ~16480): `phones {p1:{value: digitsOnly}}`,
  `emails {e1:{value}}`, `addresses {a1:{street1,street2,city,state,postal}}`.

## Tracks

One track (all work is in index.html): **A `s26/contact-autofill`**, worktree
`../bw-quote-tool-s26a` from local main. Brief: `TRACK-A.md`.

## Gates

- Gate 0 RESULT (measured 2026-08-25): 8/0; first full run read `3359 passed, 1 failed
  across 47 suites` — the one red was the DIRECTOR'S OWN pre-sprint one-pager (52
  elements under test-family-type's 10pt floor), fixed director-direct and pushed
  (`d9c82503`), gate suite then 131/0. **Working pin for this sprint: 3360/47.** The
  +24 over the old 3336 pin is the two new guides' family-type registers.
- Track gate: 8/0, full suite (pin RISES with the new suite — re-pin at close),
  new `tests/test-contact-autofill.mjs` sabotage-proven red/green.
- Close gate (operator): push word; a hands-on link/save round-trip in his browser on a
  CIRGAS + RIC with a real contact (director cannot exercise production Firebase).

## Merge order

A alone, `--no-ff`.

**NO push pre-authorization** for this sprint's code. (The guide/quote deliverables
earlier this session carried their own push words and are already live.)
