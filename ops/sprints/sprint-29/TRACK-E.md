# TRACK E — s29/dt-co-address: collect a co-owner's own address

Read `TRACK-D.md`, `TRACK-D-REPORT.md` and this file, then `ops/SPRINT_GUIDELINES.md`,
`ops/DESIGN.md`, CLAUDE.md. Work in the worktree `C:\Users\Martice\bw-quote-tool-s29c` on
branch `s29/dt-co-address` (from main `d08e37d4`; `node_modules` junctioned), from the
worktree root. Never push. Never kill processes you did not start; leave none running.
Never sign in to production Firebase from any script — fake store only; check route
filters before any Playwright one-liner.

## The ruling (operator, verbatim, 2026-09-08)

> "i thought we agreed to collect the purchaser and co-purchasers address if they are
> diffferent on the site at least?"

Earlier: "We can collect all the info it just doesn't need to print everywhere if there's
not room."

So: the FORM collects a co-owner's own address when it differs from the first owner's.
The PACKET does not change — every form has one address box and it keeps printing the
first owner's / the shared address exactly as today. Collection and saving only.

## Build (Deed Transfer lane only, `index.html`)

1. Each co-owner row (rows 2 and 3, `dtCoOwner<n>Name/Phone/Email`) gains an address
   block: street, city, state, ZIP (`dtCoOwner<n>Address/City/State/Zip`), same look as the
   primary's block, placed under that row's name/phone/email. Default blank = same as the
   first owner's; a short caption says so in one plain sentence (no other wording changes).
   State defaults the way the primary's does (check how `dtGrantorState` is defaulted and
   match it). Phones already auto-format; ZIP/city/state need nothing special.
2. `dtCoOwners()` returns `{name, phone, email, address, city, state, zip}` per owner; the
   primary's come from `dtGrantor*`. Remove-row compaction (`dtRemoveCoOwnerRow`) and
   `dtClearAll` must move/clear the new fields too.
3. Save/restore: the new ids join the captured field list so `captureDtState()` /
   `loadSavedDeedTransfer()` round-trip them, and `coOwners` on the record carries them.
   Records saved before this track restore unchanged.
4. Packet: NO change. Add one assertion that proves it — a co-owner with a different
   address typed produces byte-identical page text to the same case with it blank.

## Verification (verbatim outputs)

- `npm run check` → `index.html: 8 blocks, 0 errors`.
- `npm test`: baseline on main is `3961 passed, 0 failed across 51 suites`,
  test-deed-transfer 275; report the new numbers.
- New assertions: co-owner address fields exist and hide/show with the row; remove-row
  compaction carries the address up; Clear All blanks them; save/restore round-trips all
  seven fields per co-owner via the fake store; a legacy record (no address keys) restores
  cleanly; packet text unchanged with a different co-owner address. Sabotage-proven
  red/green once.
- One Playwright screenshot of the form with two co-owners and a different second address
  into `scratch/s29-e-renders/`, and look at it.

Commit `[s29/dt-co-address]`, explicit paths, no AI trailers. Report to
`ops/sprints/sprint-29/TRACK-E-REPORT.md`.
