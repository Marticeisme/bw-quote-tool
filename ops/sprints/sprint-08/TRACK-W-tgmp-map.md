# TRACK W — Terrace Garden Memorial Path 3D map (TGN bank + TGMP properties)

Repo: `C:\Users\Martice\bw-quote-tool`; you run in the WORKTREE
`C:\Users\Martice\bw-quote-tool-tgmp` on branch `s08/tgmp-map` (node_modules junction
in place). ALWAYS `git -C C:\Users\Martice\bw-quote-tool-tgmp …`. Obey
`ops/SPRINT_GUIDELINES.md` + `ops/DESIGN.md`. Commit locally with explicit paths,
NEVER push. Never write to production Firebase; never read `wmp-cemetery-map/`.

## Operator request (2026-07-29, binding)

The Terrace Garden currently exposes only its NEW niche bank (TGN), as a tab on the
MVC map page. Build the full **Terrace Garden Memorial Path** as its own 3D map —
the TGN bank PLUS everything else in that area — and **MOVE the TGN out of the MVC
page** (operator ruling: one home; the MVC page drops its TGN tab and links to the
new map instead).

## Sources

`D:\Cemetery Photos Misc\Terrace Garden Memorial Path\`:
- `Screenshot 2026-07-29 203810.png` — the area sheet: **Niche bank (TGN)**: 8 cols ×
  5 rows = 40 niches, row pricing top→bottom $12k / $14k / $16k / $14k / $12k,
  **2 Rights per niche**. **Add'l Cremation Properties (TGMP)**, 9 items with Sales
  Price + Rights of Interment: Paradiso Pedestal Bench Seat 36x14x4 Pedestal 30x8x14
  $24,000 / 2; Paradiso Pedestal Bench Seat 48x14x4 Pedestal 40x8x14 $42,000 / 4;
  Classic Gray Companion Columbarium with Alcove and Paradiso Shutters 30x17x37
  $52,000 / 4; Paradiso Birdbath and Pedestal $52,000 / 4; Paradiso Cremation Posts
  with Absolute Black Shutter 12x9x18 $8,000 / 1; Paradiso Double Cremation Post with
  Absolute Black Shutters 18x9x18 $16,000 / 2; Paradiso Cremation Post with Carved
  Rose Antique Finish 6x6x10 $8,000 / 1; …Shaped Carved Antique Daffodils 9x9x12
  $8,000 / 1; …Shaped Carved Antique Birds 9x9x12 $8,000 / 1.
- `Terrace Garden Memorial Path Pricingffff.pdf` — Read it (the Read tool takes PDFs
  with a `pages` range). Where the PDF and the screenshot disagree, the PDF wins and
  the discrepancy goes in your report.
- `What was replaced in the terrac garden.png` — area layout: the reflection POOL and
  the **Terrace Garden Ossuary** block. Render pool + ossuary as context masses. If
  the pricing PDF prices ossuary placements, include them as inventory; otherwise the
  ossuary is a labelled mass only — report which.
- `COMING SOON Terrace Garden Memorial Path (Billboard...).png` — marketing reference
  for naming/tone only.
- 7 photos — geometry/materials, ESTIMATED; product dimensions from the sheet MAY be
  shown for the TGMP items (they are catalog dimensions printed on the sheet), but no
  invented site dimensions. PII rule: no legible plate names in anything committed.

## The TGN move — data continuity is the hard part

1. Find TGN in `scripts/mvc-niche-data.mjs` / `build_mvc_map.mjs`. **Carry its niche
   data (refs, prices, any hand-maintained statuses) into the new module by
   script-extraction, proven old-vs-new on ref+price+status** (the ROAC rebuild
   pattern — the extraction script and its output belong in your report). Cross-check
   against the sheet (40 niches, row pricing, 2 rights); discrepancies: report, do
   not silently "fix".
2. Remove the TGN tab/wall from the MVC page (edit its data module/builder, rebuild,
   `verify_mvc_map.mjs` must still PASS — adjust its TGN-specific expectations
   deliberately and minimally, NEVER its island anchors: 145 openings / $1,870,000
   price-set must be untouched). Leave a link/card on the MVC page pointing to the
   new map ("Terrace Garden niches have moved…" in the spot the tab occupied, or the
   header — your judgement, minimal).
3. New `scripts/tgmp-data.mjs` + `scripts/build_tgmp_map.mjs` +
   `scripts/verify_tgmp_map.mjs` → `MAPS/TGMP_Map.html`. 3D per the family stack
   (read `build_ecl_map.mjs` incl. Track F's champagne materials + fee-toggle
   pattern; outdoor garden setting like ROAC's courtyard). TGN bank face-on + the 9
   TGMP items placed as 3D objects along the path (photos guide placement; say
   placement is approximate), pool + ossuary as context. Every item clickable: price,
   rights count, dimensions (sheet's), card math per the pricing PDF's fee rules (use
   ONLY fees that document states for this area — never borrow another area's fees;
   if the PDF is silent on fees, card shows price + rights only and you report it).
4. Statuses: whatever the carried TGN data says (preserve sold marks); TGMP items are
   available unless the PDF marks otherwise. Fail-safe rule as always: nothing
   invented, no price on anything marked unavailable/sold.

## `guides.html`

ONE card appended in Maps, pill +1 from what you find. Tracks H/V also append Maps
cards on their branches — the director reconciles pills at merge; keep your diff to
one card + the pill.

## Verification gates (quote outputs verbatim)

1. `verify_tgmp_map.mjs`: determinism; TGN 40/8×5 with row-price pattern asserted;
   TGN old-vs-new parity vs the extracted MVC data (ref+price+status, 0 mismatches);
   9 TGMP items with their exact prices/rights; available-$ anchors; no price on
   unavailable; sabotage-proven ≥3 ways (exit 1, restored).
2. `verify_mvc_map.mjs` PASS after the TGN removal, island anchors byte-untouched —
   quote the relevant lines; plus a grep proving the MVC page no longer renders TGN
   niches but does carry the pointer link.
3. Playwright suite in `scratch/`: taps on the TGN bank AND on at least 3 TGMP
   objects, drag ≠ select, print scope, back button, zero page errors.
4. `npm run check` 8/0; `npm test` counts never fall from branch time (document the
   port-3737 worktree caveat the way Track F did if it bites);
   `verify_guides_page.mjs` ALL OK.
5. Screenshots: path overview, TGN bank face-on, one TGMP item card, MVC page where
   the tab used to be — LOOK at all of them.

## Report

What shipped; branch + commits; verbatim gates incl. the TGN parity proof; PDF-vs-
screenshot discrepancies; fee rules found in the PDF; decisions & open questions;
screenshots list.
