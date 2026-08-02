# TRACK A — COM niche walls: true sizes, separate RAD/SER selections, section isolation

Branch `s11/com-niche-walls`, worktree (director supplies path). Obey
`ops/SPRINT_GUIDELINES.md` + `ops/DESIGN.md`. You touch ONLY the COM map family:
`scripts/com-crypt-data.mjs`, `scripts/build_com_map.mjs`, `scripts/verify_com_map.mjs`,
regenerated `MAPS/COM_CryptMap.html`. Never hand-edit the generated HTML.

## Operator request (2026-08-02, verbatim intent)

1. "For the Chapel of Memory have one niche wall selection for Radiance and one for
   Serenity. Right now it is just one niche walls [selection]."
2. "On both the 3D version and the floor plan the niches are not sized correctly —
   there are a few different sizes of glass front niches on each wall." He supplied
   the two MIS wall sheets: **`D:\Cemetery Photos Misc\Radiance and Serenity
   Niches\Radiance.png` and `Serenity.png`** (same folder holds three 2024 photos of
   the physical walls — useful cross-checks). **Ignore the sheets' prices — stale.
   The size information is accurate.**
3. "When clicking on a section on the floor plan just show that section, not the
   whole north wing (for example)."
4. Sprint-wide ruling: **the string "MIS" must not appear on any family-facing
   surface.** Sweep the COM map's rendered output (26 occurrences today, e.g.
   "confirm in MIS") — reword to "ask us for today's price/availability" or similar.
   Code comments / never-rendered data may keep the word.

## 1. Per-cell size classes (the core fix)

`RAD_CELLS` / `SER_CELLS` in `com-crypt-data.mjs` carry [row, col, price, span] but
NO size class, so both renderings draw uniform niches. The size legends exist:

- SER: Large (2) 10 1/2" × 22 1/8" × 12 3/4"; Small (2) 10 1/2" × 11 1/16" × 12 3/4"
- RAD: Family (2) 11 7/8" × 30 1/2" × 25 1/2"; X-Large (2) 11 7/8" × 26" × 12 3/4";
  Large (2) 11 7/8" × 23" × 12 3/4"; Small (2) 11 7/8" × 18 1/4" × 12 3/4"

**Method: pixel-measure the sheet PNGs.** Load each PNG (PyMuPDF/PIL/sharp — your
choice), detect the grid cell rectangles, and assign each cell a size class by
matching measured width ratios to the legend widths. Constraints that make this
solvable and checkable:

- Every row of one wall spans the same physical wall width — the per-row sum of
  legend widths must be ~constant. Director's spot check: SER rows K/J/B/A read
  [L,S,S,S,S,L] = 88.5" and rows H–C read [L,L,L,L] = 88.5". Verify, don't trust.
- RAD rows must solve the same way with the four-width alphabet (a row's classes
  must sum to the same total as every other RAD row).
- RAD's two double-row cells (E2/D and E5/D span) are the widest cells on the sheet
  → Family. Note the oddity: Family's H×W×D says height 11 7/8" like the others but
  the sheet draws it two rows tall and its DEPTH is 25 1/2" — measure what the sheet
  actually draws, model what the drawing shows, and record the discrepancy in your
  report rather than inventing a resolution.

Encode the result as a size-class field per cell (or per-row pattern) in the data
module WITH a comment naming the measurement script; commit the measurement script
under `scripts/` or `scratch/` (scratch is gitignored — prefer `scripts/` so the
gate can re-derive).

## 2. Render true sizes

- Floor plan and 3D wall grids: cell widths/heights proportional to real inches
  (use the legend dims), including the Family double cells. The niche detail card
  states the size class + dimensions.
- Inventory, refs (RAD-1-1-ROW-SPACE / SER-1-1-ROW-SPACE), statuses, prices are
  UNCHANGED — anchors RAD $156,115 / SER $76,960 available must hold. The sheets'
  prices are stale; do not load them (DESIGN §8 2026-07-26: never price from a sheet).

## 3. Separate selections

Split the single `niches` area ("Niche Walls") into two selectable entries —
Radiance and Serenity — in whatever selector surfaces areas (tabs, area list, walk
stops). Each shows its own wall; deep links / print scope follow. Keep the
walk-through stops both reachable.

## 4. Floor-plan section isolation

Clicking a section/area on the floor plan currently reveals a whole wing. Change:
clicking a section shows THAT section's contents only (its banks/walls), with an
obvious way back to the full plan. Apply to all COM floor-plan sections, not just
niches.

## Verification

- Extend `verify_com_map.mjs`: size-class coverage (every cell classed), per-row
  width-sum constancy per wall, Family cells exactly the two spans, anchors
  unchanged, zero "MIS" in rendered text/aria of the built page, RAD and SER
  independently selectable (gate may assert structure; interaction via Playwright).
- Sabotage the new checks both directions; quote exit codes.
- Playwright interaction checks: select Radiance only / Serenity only; click a
  floor-plan section → only that section rendered; niche card shows size class.
- Full contract: `npm run check` → `8 blocks, 0 errors`; `npm test` → ≥1538/31,
  count must not fall (quote verbatim). Screenshots of both walls (3D + plan) for
  the director, saved under `scratch/s11a-renders/`.

## Report

Standard format (SPRINT_GUIDELINES rule 8) + the measured size-class table for both
walls and any cells whose class was ambiguous.
