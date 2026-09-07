# Sprint 29 — Deed Transfer: multiple current co-owners

**Opened 2026-09-07.** Director: Fable session. One track (A), Opus, worktree
`C:\Users\Martice\bw-quote-tool-s29a`, branch `s29/dt-co-owners`.

## Goal

When the interment rights being transferred are held by more than one person, every
co-owner must have a place to sign on every document they sign. Today the lane knows
one grantor and the template carries one signature line per role.

## Operator rulings (2026-09-07)

1. **Release, Affidavit for Loss, Affidavit of Heirs, Permission of Use: one copy per
   co-owner** ("there will need to be different versions of them"). Both variants
   (notary and DocuSign). Each copy substitutes that co-owner wherever the single
   `grantor` value lands today; the notary block stays unfilled as before.
2. **p9 Statement ("the form that looks like the CIRGAS"): both co-owners sign in the
   green Current Property Owner box — split it in two.** One shared address block; each
   signature gets its own printed name.
3. **New owner side stays single** this sprint.
4. Cover page (p1) has one current-owner row: join the names with " & " there
   (director call, not an operator ruling).

## FINAL RULING 2026-09-07 (supersedes 1–4 above; Track B implements it)

Track A's per-copy assembly was the director's misreading. The operator, verbatim:
"We can collect all the info it just doesn't need to print everywhere if there's not
room." / "Some of these on the forms should be as simple as giving both names." /
Permission of Use, Affidavit of Heirs, Affidavit for Loss are ONE copy with both names;
"Release if Interment rights needs both of their signatures just split the green box in
half. This is what I said from the get go. NO regressions to my wordings please." /
"Push when these changes are in." → packet = the s27 page set, names joined wherever
the owner is named, Release signature line split per co-owner, p9 split kept, co-owner
phone/email collected + saved but printed only where a box exists. Push authorized once
Track B is audited and merged.

## Track A scope (as built, then superseded)

- Form: current owner becomes a small list (primary + "Add co-owner", cap 3). Each
  co-owner is a NAME ONLY (operator amendment 2026-09-07: no per-co-owner phone or
  email); phone, email, address/city/state/zip/county stay the primary's single block.
- Download assembly: for each included document page, emit one page per co-owner (in
  co-owner order) instead of one; Statement p9 and Terms p10 stay single.
- p9: at 2+ co-owners, split the Current Property Owner signature/printed-name area
  into N equal columns (signature line + printed name each); address, city/state/zip,
  email, phone stay one block (primary's). At 1 co-owner the page is the s27 behavior.
- Saves: `dt` record gains `coOwners: [{name}]`; restore round-trips;
  old records with no `coOwners` load exactly as before.
- Sparse-form regression (s27 scar) must run for the multi-copy path too.

## Merge order

A only, `--no-ff` onto main after audit.

## Close checklist

- index 8/0; full suite: baseline + the new assertions exactly.
- Director rasterizes a 2-co-owner notary case and a 2-co-owner DocuSign case and
  LOOKS at every page (page count = 1 + N×docs + 2).
- STATE.md updated; push only on the operator's word.
