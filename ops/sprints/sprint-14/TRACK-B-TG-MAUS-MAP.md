# TRACK B — Terrace Garden Mausoleum map (generated, geometry-first)

You are a track subagent in sprint-14 of the BW Quote Tool. Obey
`ops/SPRINT_GUIDELINES.md` and `ops/DESIGN.md`. Work in the worktree
`../bw-quote-tool-s14b` on branch `s14/tg-maus-map`
(`git worktree add ../bw-quote-tool-s14b -b s14/tg-maus-map`); junction node_modules from
the main tree. Commit locally with explicit paths; NEVER push; `git -C <abs-path>` always.

## Mission

Build `MAPS/TG_Mausoleum_Map.html` as a GENERATED page (data module → build script →
verification gate with sabotages — the COM/ECL/GOMN pattern; read
`scripts/build_*_map.mjs` + `scripts/verify_*_map.mjs` for the house style, and
`MAPS/COM_CryptMap.html` for the interaction model incl. `scripts/map-movement.mjs`).

**GEOMETRY-FIRST (operator ruling):** real layout, section labels, bank shapes, and
cross-links — but NO prices, NO statuses, NO inventory counts you cannot source. Every
selectable position renders "ask us"-style wording (s11 CONFIRM-chip pattern; see the COM
unpriced-niche chip). NEVER invent a number. MIS lot-inquiry/price exports come later; the
data module must have obvious empty slots for price/status so the later load is additive.

## Geometry sources (in order of authority)

1. **The MIS overview transcription below** (director's read of the operator's MIS
   screenshot; the on-disk PNGs don't cover this building).
2. **Video frames**: `D:\Cemetery Photos Misc\Terrace Garden Memorial Path\20260803_120633.mp4`
   (8:16, walks the whole area) + the stills in that folder.
3. The existing `MAPS/TGMP_Map.html` + `scripts/*tgmp*` data (s09 Track T) for the
   memorial-path area itself — do NOT rebuild TGMP; your map surrounds it.

### MIS overview transcription (Terrace Garden Mausoleum, rightmost building of the
three-building complex; connected westward to Eternal Light Maus)

- **Top center:** "Family Room 1" and "Family Room 2", side by side, a small water
  feature between them (small blue square labeled Water Wall/Hall — verify name from
  footage if visible).
- **Two crypt wings flanking the family rooms**, along the north face: left wing bank
  numbered 1–13, right wing numbered ~14–28, both labeled
  "SINGLES / DELUX COMPANION / WESTMINSTER CRYPTS". "ROOF LINE" notations run along both
  wings (covered walkway — outdoor mausoleum).
- **Center courtyard:** MIS draws a large "Pool" — **THE POOL IS GONE**, replaced by the
  Terrace Garden Memorial Path. Model the TGMP footprint there and make it the LINK ZONE
  to `MAPS/TGMP_Map.html` (see Links below). To the pool's right MIS draws a
  "Terrace Garden Ossuary" box — NOTE: s09 deleted the ossuary from the TGMP map on
  inference, but the MIS overview still draws it and the quote tool sells Terrace Ossuary
  scattering. Render the ossuary as an inert labeled structure (no price), and flag the
  discrepancy in your report for the operator's ruling.
- **South edge:** one long bank labeled "TANDEM CRYPTS (HEAD TO HEAD)", numbered ~1–48
  (count from footage; the transcription is approximate — the video is authoritative for
  what physically exists).
- **East edge:** entrance / decorative feature (fountain-like outline in MIS).
- Some MIS cells are pink-highlighted — meaning unknown; do NOT model as status.

## Links (the operator's explicit requirement)

- This map carries a clearly-visible link/button to the **Terrace Garden Memorial Path
  map** (`TGMP_Map.html`) — both a persistent nav affordance and the courtyard link zone.
- Add ONE minimal reciprocal anchor on `TGMP_Map.html` back to this map (smallest
  possible diff; gate-assert it; touch nothing else on that page — its own gate
  `verify_tgmp_map` must stay green).
- "← Quote Tool" back button (href="../") like every map.

## Rules that bind you

- Statuses (when they exist someday) are pattern-never-hue; no price on sold/occupied;
  exact dollars never rounded — encode the conventions now even though this ship is
  unpriced.
- "MIS" must never render family-facing; wire `scripts/_no_mis_assert.mjs` (20-term
  family register) into your gate.
- Never hand-edit the generated HTML; the data module + builder are the source of truth.
- Gate: structural assertions (bank counts, section labels, link presence both
  directions, no-price-anywhere assert for this geometry-first ship) + ≥6 sabotages
  proven BOTH directions.
- Don't touch index.html, guides, contract code, other maps (beyond the one TGMP anchor),
  or anything Track A/C owns (walkthrough pages; ELM/ECL pages).

## Definition of done

- Data module + builder + gate + page committed; gate green (quote numbers); npm run
  check 8/0; npm test with your exact count + env-pinned command (worktree variance
  documented in STATE.md is acceptable — report YOUR number).
- Renders (Playwright screenshots) of: overview, a wing bank face-on, the courtyard TGMP
  link zone — in `scratch/s14b-renders/`.
- Report: geometry decisions + confidence per section, the ossuary discrepancy, any
  MIS-vs-footage conflicts (footage wins for existence, MIS for labeling), exact
  commands run.
