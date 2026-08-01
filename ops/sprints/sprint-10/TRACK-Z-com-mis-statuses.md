# TRACK Z — COM statuses from the MIS lot inquiry list

Repo: `C:\Users\Martice\bw-quote-tool`; you run in the WORKTREE
`C:\Users\Martice\bw-quote-tool-comstat` on branch `s10/com-mis-statuses`
(node_modules junction in place). ALWAYS `git -C C:\Users\Martice\bw-quote-tool-comstat …`.
Obey `ops/SPRINT_GUIDELINES.md` + `ops/DESIGN.md`. Commit locally with explicit paths,
NEVER push; never write production Firebase; never read `wmp-cemetery-map/`.

## Source (operator-supplied 2026-08-01)

`E:\Downloads\LotInqResList (20).pdf` — MIS "LOT INQUIRY LIST", 51 pages, printed
8/1/2026, criteria `Location = WMP, Section = COM`, **1,355 result rows**. Columns
include Owner Id, Deceased/Reserved (a NAME — see PII), ST (status code), Lot
Location, Buried, Property Owner (a NAME), Interment #, Age. Parse with PyMuPDF from
the PDF's text layout — build the parser defensively (the sibling LotInquiryList CSV
export is famously malformed; the PDF's columnar text may interleave. Prove your
parser: row count must reconcile to the printed "Results: 1355", and every parsed Lot
Location must match a known COM/RAD/SER position or be listed as unmatched in the
report).

**PII, absolute:** the list is full of real customer names. Names and Owner Ids may
be used TRANSIENTLY in your gitignored `scratch/` parsing workspace only. NO name,
Owner Id, interment number, or age reaches: committed files, code comments, the data
module, your report, or ops docs. What crosses is per-space STATUS (and dates only if
a status needs one — prefer not). `scratch/` stays gitignored; double-check with
`git status` before every commit.

## What to produce

1. A per-position status map for COM's 893 crypt spaces and the RAD (74) / SER (48)
   niches, derived from the list: which positions are OCCUPIED (interment present),
   which RESERVED (reserved row, no interment), and which do not appear (candidate
   available — see the reconciliation rule). Understand the ST codes from the data
   itself; report the code vocabulary you found and how you read each.
2. Reconcile against `scripts/com-crypt-data.mjs`'s current statuses (from the
   2026-07-29 sheets): the sheet said 51 crypts available / 18 not-selling / 716
   unavailable; RAD 17 and SER 10 priced-available. Report every disagreement in
   CLASS terms (e.g. "sheet says available, MIS shows an interment: refs X, Y").
   **Fail-safe rules:** a position with an MIS interment or reservation is NEVER
   sellable regardless of the sheet; a position the sheet called
   unavailable/not-selling but MIS does not list stays unsellable BUT gets status
   `unlisted` internally — rendered exactly like today's "Unavailable — confirm in
   MIS" (absence from an interment list is not proof it is for sale — the standing
   scar: "not occupied" is not "not sold"). A sheet-available position that MIS
   also does not list keeps its available status and price.
3. Update `scripts/com-crypt-data.mjs` statuses accordingly (statuses only — prices,
   refs, tiers, geometry untouched), extend the status vocabulary/rendering per the
   family rules (pattern/brightness never hue; occupied = the blacked-out treatment,
   reserved = the stripe treatment like ROAC; no price rendered on any unsellable),
   rebuild, and update `verify_com_map.mjs` anchors DELIBERATELY: the histogram and
   position checksum will legitimately change — quote old and new, derive the new
   anchors from your parsed data (not from the built page), and keep every other
   anchor identical. Add a gate assertion tying the new histogram to the MIS list's
   printed result count arithmetic (so a re-parse that drops rows fails).
4. Record in the data module header: source = MIS Lot Inquiry List printed 8/1/2026
   (no filename with the "(20)" suffix needed), statuses now MIS-backed as of that
   date, still hand-maintained going forward.

## Verification gates (quote outputs verbatim)

1. Parser reconciliation: parsed rows == 1355; unmatched lot locations listed (should
   be 0 or explained); per-tier/per-bank roll-ups sane.
2. `node scripts/verify_com_map.mjs` PASS with the new anchors; `--sabotage` still
   all-exit-1 including at least one NEW mutation (an occupied position flipped to
   available must fail); determinism.
3. `npm run check` 8/0; `npm test` counts never fall (contract 1534/31; 1532 without
   the map repo; port-3737 artifact documented).
4. PII sweep, mechanical: over your full `git diff`, grep for capitalized-surname
   patterns, the Owner Id numeric shapes you saw, "Interment", and age-like tokens —
   quote the grep commands and their empty results. Screenshots of one occupied, one
   reserved, one available card — LOOK, and confirm no name anywhere.
5. Report: status vocabulary found; the class-level reconciliation table
   (counts per class, refs only for the surprising classes); new-vs-old histogram;
   verbatim gates; open questions.
