# TRACK M — Chapel of Memories map rework (FLAGSHIP) (`s09/com-rework`)

You are a track subagent. Read `ops/SPRINT_GUIDELINES.md` and `ops/DESIGN.md` and obey
them. Branch `s09/com-rework` from a `main` that already carries Track C's merge (C
touches the Radiance/Serenity fee data inside the COM dataset — do not undo it). You
touch the COM data module / build script / gate (`scripts/com-*`,
`scripts/build_com_map.mjs`, `scripts/verify_com_map.mjs`, `MAPS/COM_CryptMap.html` via
rebuild only). Nothing else. This is the sprint's biggest track — take the time.

## Operator's words (Map Issues 07.31.26 — this is the brief)

> "The niche walls are not in the right area. There are two entrances into the chapel
> of memories not one. The chapel area needs to be better laid out on the map with
> small chairs and I should be able to almost walk through the chapel and click through
> different areas not just the overview look. Review and audit your placements of
> locations as well. The biggest takeaway right now though is that the map is very hard
> to navigate through. Unlike most of our other 3d maps where it is just one contained
> unit this area is very spread out with many different maps. I know this will take
> some time and this will be the biggest project but we can do this."

Decompose:

1. **Placement audit, then fix:** the Radiance/Serenity niche walls are in the wrong
   area on the current map. Audit EVERY area placement against the sources below and
   correct them (per the MIS debrief: Serenity niches sit BETWEEN the COM building and
   the ELM complex; Radiance is on the far west side).
2. **Two entrances**, not one. Model both.
3. **The chapel worship space** gets a real layout: altar at the west end, rows of small
   chairs, the two central void areas as the worship space — so the room reads as a
   chapel, not an empty box.
4. **Walkthrough navigation:** the user should be able to "almost walk through" —
   navigate INTO and BETWEEN areas (chapel, each crypt bank area, niche walls, north/
   south wings), not just orbit an overview. Design an interior-view system: e.g.
   position presets per area with smooth transitions, clickable doorway/area hotspots
   that move the camera inside, a persistent area breadcrumb/switcher. Reuse the ROAC
   "Inside views" precedent (occluding structure fades to ghost, presets toggle back)
   and the champagne-cell tab pattern — the goal is ONE contained navigable unit, not
   many separate flat maps.
5. **Navigation simplification:** today's 6 area tabs + overview feel like "many
   different maps". Restructure so movement is spatial-first (click through the
   building) with tabs as secondary shortcuts.

## Sources

- `D:\Cemetery Photos Misc\Chapel of Memories\` — photos 2024→2026-07-29 including a
  walkthrough video (`20260729_124129.mp4` — sample frames with ffmpeg if useful).
  These show the real interior: entrances, chapel furniture, wall positions, materials.
- `E:\Downloads\WMP_Section_Layout_Debrief.md` §"COM — Chapel of Memories Mausoleum"
  (the MIS-observed wall layout: west wall 194–200, south 201–212 Delux Comp 12×7,
  north 220–231 mirrored, east 213–219+, north wing 116–137 with Hidden Companions,
  altar at west end of the north wing, rest rooms/storage between COM and ELM, Serenity
  between COM and ELM, Radiance far west). Also read its ELM/ECL/CN neighbors for
  context — but you are NOT building ELM/ECL/CN; show them at most as ghost context.
- The existing data module — inventory and statuses are LIVE hand-maintained data.

## Hard invariants

- **Inventory must not move:** 17 crypt banks / 785 purchasable / 893 spaces + Radiance
  74 + Serenity 48; refs, statuses, prices (crypt prices stay "confirm in MIS" —
  sprint-08 ruling stands; `sheetRaw` diagnostics stay never-rendered). Niche-wall
  price anchors RAD $156,115 / SER $76,960 — but Track C's fee changes are merged
  before you branch; take the anchors from YOUR branch-point gate run, and keep them.
- Status = pattern never hue; no price on sold/occupied; AA contrast; the pointer-
  capture/tap-detector/pinned-card interaction scars (STATE.md sprint-06 §M5/M6c) all
  apply — rerun and extend the existing Playwright suite.
- Geometry beyond the debrief + photos is ESTIMATED — no fabricated dimensions; the
  page states estimation the way ROAC does.
- Generated artifact discipline: data module → build script → gate; never hand-edit
  the HTML.

## Verification (verbatim outputs)

- `build_com_map.mjs` + `verify_com_map.mjs` PASS with inventory anchors unchanged from
  your branch point; extend the gate: two entrances present, chapel furniture objects
  present, Serenity/Radiance in their corrected areas (assert coordinates/containment,
  then sabotage: move a wall → exit 1 → restore).
- Playwright suite extended for walkthrough navigation (enter chapel, enter a wing,
  click a doorway hotspot, breadcrumb back, tap-select still works inside), all green.
- `npm run check` 8/0; `npm test` counts not falling.
- Screenshots: overview, both entrances, chapel interior with chairs/altar, one
  interior crypt-bank view, Serenity/Radiance corrected placement — in
  `scratch/s09m-renders/`. Compare against the photos and SAY what matches and what is
  estimated.

## Report

Standard format + the placement-audit table (area → old position → new position →
source that justified the move) + an honest "still estimated / needs Martice's eye"
list. If the walkthrough design forces a trade-off the operator should rule on, ship
your best judgement and flag it — no mid-flight questions.
