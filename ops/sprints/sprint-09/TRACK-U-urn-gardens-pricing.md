# TRACK U — Urn-garden pricing update (`s09/urn-gardens-pricing`)

You are a track subagent. Read `ops/SPRINT_GUIDELINES.md` and `ops/DESIGN.md` and obey
them. Branch `s09/urn-gardens-pricing` from a `main` that already carries Track A's
merge. You touch: `urn-gardens-guide.html`, its verifier
(`scripts/verify_urn_garden*.mjs` — find the exact name), and — ONLY where the sheet
contradicts it — the urn-garden options in `index.html` (targeted edits, at most one
Edit call then Node scripts; Browser-pane hazard per DESIGN §6).

## Source of truth (operator-supplied 2026-07-31)

`E:\Downloads\URN_GARDEN___GARDEN_OF_VERSES_PACKAGES_06_2026.xlsx` — extracted verbatim:

| | GoV Burial (Infant) | GoV Niches (Infant) | Rest Haven | Lake UG Williamsburg Comp. Cremorial | Lake UG Companion Cremorial | Lake UG Bronze Single (encased in concrete only) | Lake UG Granite Single | Court of Honor Comp. Cremorial | Rose UG (inside/outside perimeter) Comp. Cremorial |
|---|---|---|---|---|---|---|---|---|---|
| Space | 325 | 325 | **SOLD OUT** | 5495 | 5495 | 5495 | 5495 | 4395 | 4395 |
| E.C.F. | 50 | 50 | | 825 | 825 | 825 | 825 | 660 | 660 |
| O&C (each) | No charge | No charge | | 875 | 875 | 875 | 875 | 875 | 875 |
| Recording (each) | No charge | No charge | | 235 | 235 | 235 | 235 | 235 | 235 |
| Urn Vault (each) | 505 | | | see Batesville Catalog | | see Batesville Catalog | see Batesville Catalog | | |
| Urn Vault Setting (each) | No charge | | | 575 | 575 | 575 | 575 | 575 | 575 |
| Memorial type | Granite Marker (PCM) | Bronze Scroll #5108 (Matthews) 4-3/4"×2-5/8" | | Scroll #30430/Ribbon #S06 (Matthews) 2"×8" | Bronze Standard Scroll #952 (Coldspring) 8.5"×4.5" | Flat Bronze (Matthews) 12"×8" | Flat Granite (PCM) 15×10 | Bronze Std Scroll #952 (Coldspring) 8.5"×4.5" | Bronze Std Scroll #952 (Coldspring) 8.5"×4.5" |
| Memorial price | see PCM catalog | 355 | | 2415 | 5175 | 2220 | see PCM catalog | 5175 | 5175 |
| Foundation | | | | Concrete, Included | Granite (PCM) 17"×23" Barrell Gray, Included | Concrete, Included | | Granite 17"×23", Included | Granite 17"×23", Included |
| Memorial setting fee | No charge | | | 495 | 495 | 495 | 495 | 495 | 495 |

Footnote: "*Gasser Olds Only (Lake Urn Garden) — ORDER FROM MATTHEWS". Sheet header
says it's the 2026 packages sheet.

## What to do

1. **Rose Urn Garden finally has a price: $4,395 + $660 ECF** (companion cremorial,
   inside/outside perimeter alike). Replace the guide's "Ask us today's price" with real
   figures; the sprint-08 gate that FAILS when a number is typed in must be inverted to
   assert these numbers.
2. Reconcile EVERY figure on `urn-gardens-guide.html` against the sheet (LUG $5,495 +
   $825 ECF already matches; O&C ground $985/boulder $1,425 from sprint-08 vs the
   sheet's flat $875 — **the sheet wins where it speaks**; keep anything the sheet is
   silent on, flagged in your report). Add memorial-package rows where the guide's
   scope calls for them (memorial + setting $495, urn vault setting $575) — use
   judgement on layout, keep the 1-page PDF cap.
3. Reconcile `index.html`'s urn-garden options (LUG space options, Court of Honor, Rose
   UG if present) against the sheet. Where the tool disagrees with the sheet, fix the
   tool. Where the tool lacks Rose UG pricing, add it following the existing option
   pattern. Rest Haven: mark/keep SOLD OUT — do not delete records.
4. Update the urn-garden verifier to reconcile guide ↔ sheet figures (hardcode the
   sheet's numbers as the expectation with a dated comment) and rerun green.
5. LUG rights conflict (sprint-08 open: slide said 1–2 rights/space, tool says capacity
   1): the sheet doesn't rule on it — leave as-is, restate as open in your report.

## Verification (verbatim outputs)

- Urn-garden verifier green with the new assertions; sabotage the RUG price → exit 1 →
  restore.
- Guide PDF regenerated, still exactly 1 page.
- `npm run check` 8/0. `npm test` counts not falling.
- **Generator baseline 14/14** if you touched `index.html` — urn-garden options are
  quote-side; no baseline scenario should move. If one moves, STOP and report.
- Screenshot of the updated guide in `scratch/s09u-renders/` — look at it.

## Report

Standard format + a guide↔sheet↔tool reconciliation table (every figure, three columns,
agree/fixed/flagged).
