# TRACK B — s29/dt-joint (supersedes Track A's per-copy assembly)

Read the WHOLE directory `ops/sprints/sprint-29/` first (SPRINT.md, TRACK-A.md,
TRACK-A-REPORT.md, AMENDMENT.md, this file). Work in the worktree
`C:\Users\Martice\bw-quote-tool-s29b` on branch `s29/dt-joint` (created; `node_modules`
junctioned). Obey `ops/SPRINT_GUIDELINES.md`, `ops/DESIGN.md`, the worktree's CLAUDE.md.
Never block; log decisions in your report. Never kill processes you did not start. Run
every Node/Playwright/npm command from the worktree root. Never push.

## The operator's final ruling (verbatim, 2026-09-07 — binding, do not reinterpret)

> "We can collect all the info it just doesn't need to print everywhere if there's not room."

> "Some of these on the forms should be as simple as giving both names."

> Which documents should be ONE copy with both names written in? — "Permission of Use,
> Affidavit of Heirs, Affidavit for Loss of Certificate, Release if Interment rights needs
> both of their signatures just split the green box in half. This is what I said from the
> get go. NO regressions to my wordings please."

So: **no per-co-owner copies of anything.** The packet is the s27 page set again (cover,
the applicable documents once each, statement, terms). Where a document names the owner,
it names ALL co-owners. Where they must both sign (the Release, and the statement's green
box which Track A already split), the single signature line is split into one column per
co-owner with each printed name under it.

"NO regressions to my wordings": change no template text, no form label, no help text,
no document name and no on-screen wording beyond what this brief requires. Where you
must write new user-facing text (the co-owner help line), keep it to one plain sentence.

## Current state of main (`7bd89821`) that you start from

Track A shipped (merged) then the name-only amendment was reverted, so today:
co-owner rows carry name + phone + email (cap 3, primary in `dtGrantor*`); `dtCoOwners()`
returns `[{name, phone, email}]`; `dtBuildOnePacket` builds one filled packet;
`dtAppendCoOwnerCopies` splices in per-owner copies with `' co2'`-suffixed fields;
`dtPerOwnerPages`/`dtTotalPages` count pages as `1 + N×docs + 2`; `dtDrawStatementSplit`
splits p9's green box; `dtDocList` notes "one copy per co-owner (×N)"; tests pin all of
that (test-deed-transfer 200 assertions). TRACK-A-REPORT.md has the p9 geometry, the
MediaBox scar and the page-cache scar — read it.

## Build

1. **Remove the per-copy assembly.** Delete `dtAppendCoOwnerCopies`, `dtPerOwnerPages`,
   `dtTotalPages`, the `perOwner` flags and the "(×N)" note in `dtDocList`, the `' co2'`
   suffix logic, and the `owners`/`self` split in `dtFillForm` — one fill, one packet.
   Keep `dtBuildOnePacket` as the single build (its bake-before-remove order and the
   orphan prune are the s27 hotfix; keep the `pageCache.invalidate()` line with its
   comment — harmless, and it documents the scar). Page count on screen = the s27 count.
2. **Both names wherever the owner is named.** Define `dtOwnerNames()` = co-owner names
   joined with `" & "` (one name → unchanged). Use it wherever `grantor` printed before
   Track A: the Release grantor fields (both variants), the Loss Affidavit affiant default,
   the Permission of Use signer default, the cover row, the statement's `Current Name
   Print` at ONE owner. EXCEPTION: the Affidavit of Heirs decedent default stays the
   PRIMARY's name alone — a joined string is not a decedent. Phone/email/address boxes that
   exist once stay the primary's / the shared address (Track A behavior). Co-owner
   phone/email are collected and saved but print nowhere this sprint — there is no box.
3. **Release signature split (both p2 notary and p3 plain).** At 2+ co-owners, split the
   Grantor's Signature line into N equal columns, each a rule with that owner's printed
   name under it, exactly the way `dtDrawStatementSplit` does p9 — measure the line and
   its caption with PyMuPDF and convert through the MediaBox origin (the template's
   MediaBox is `[-11.96 11.99 600.04 1019.99]`, Track A's scar). Keep the "(Grantor's
   Signature)" caption. The fields under it (`Grantors Address`, `Grantors Phone Num` on
   p2; the p3 equivalents) stay single. At 1 owner nothing is drawn. Generalize the
   drawing helper (geometry object per page) rather than copy-pasting it.
4. **p9** keeps Track A's split. **Cover** keeps the joined row.
5. **Save/restore** unchanged from main (`coOwners` with name/phone/email, `coOwnerRows`).
6. **Help text** under the rows: one sentence saying the address is shared and a
   co-owner's phone and e-mail are kept on the record. Do not touch any other wording.

## Verification (quote outputs verbatim)

- Baseline on the untouched worktree: `npm run check`, `npm test` (main pin is
  `3888 passed, 0 failed across 51 suites`; a worktree reads −2 → expect 3886).
- After: `index.html: 8 blocks, 0 errors`; `npm test` green, and you report the new total
  and the new test-deed-transfer count (it will DROP — the per-copy assertions go; say by
  how much and why).
- Rework `tests/test-deed-transfer.mjs`: 2 co-owners → page count equals the 1-owner count
  for the same situation; Release/Loss/Permission carry "A & B"; the Heirs decedent
  default is the primary alone; the Release page (both variants) shows both printed
  names under the split line at 2 owners and no drawn names at 1; p9 shows both; cover
  row "A & B"; SPARSE fill for 2 co-owners generates without throwing in both variants
  (the s27 scar); save/restore round-trips name/phone/email; a legacy record restores one
  owner. Sabotage-proven red/green twice (two different breaks).
- Render a 2-co-owner notary case and a 2-co-owner DocuSign case with PyMuPDF into
  `scratch/s29-b-renders/` and LOOK at every page, especially both Release variants'
  split line and p9.
- Leave no dev-server running when you finish (check 3737/3747 with netstat).

## Hard rules

No production Firebase writes from tests. No real names. Deed Transfer lane only; other
lanes, quote PDFs, catalogs, guides byte-untouched. Commit `[s29/dt-joint]`, explicit
paths, no AI trailers, never push.

## Report

`ops/sprints/sprint-29/TRACK-B-REPORT.md`: what shipped; commits; verbatim gate output;
files changed; Release split geometry per variant; decisions; what the director must
verify by hand.

## AMENDMENT (operator, 2026-09-07, after spawn — binding)

> "What you seem to misunderstanding is that it's important we give somewhere for both of
> them to sign but if there's on addresss on the form and not both thats ok as long as it
> reads as purcsher & co-purchaser."

So step 3 applies to EVERY document the owners sign, not just the Release: split the
owner/affiant signature line into one column per co-owner with printed names on the
Affidavit for Loss (p4 notary, p5 plain) and the Permission of Use (p7 notary, p8 plain)
too, the same helper, geometry measured per page. The Affidavit of Heirs is signed by an
heir, not the owners — leave its line alone. Address/phone boxes stay single as before.
Add the matching assertions (both names drawn on each of those pages at 2 owners, none
at 1) and render them.
