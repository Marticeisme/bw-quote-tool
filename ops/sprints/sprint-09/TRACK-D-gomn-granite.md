# TRACK D — GOMN map update + granite guide fixes (`s09/gomn-granite`)

You are a track subagent. Read `ops/SPRINT_GUIDELINES.md` and `ops/DESIGN.md` and obey
them. Branch `s09/gomn-granite` in your assigned worktree. You touch: the GOMN data
module + build script + gate (`scripts/gomn-*`, `scripts/build_gomn_map.mjs`,
`scripts/verify_gomn_map.mjs`, `MAPS/GOMN_NicheMap.html` via rebuild only),
`granite-niches-guide.html`, `scripts/verify_granite_niche_ranges.mjs`. You do NOT
touch `index.html`, guides.html, or any glass-front surface.

## GOMN map (Garden of Meditation, granite niche wall)

Operator (Map Issues 07.31.26 + boot rulings 2026-07-31):

1. **Price font size on the niches must increase** — "very hard to read". Bump, rebuild,
   screenshot, and LOOK; keep AA contrast.
2. **Fee schedule → the MVC June-2026 schedule** (operator-confirmed at boot):
   O&C **$875** / Recording **$235** / Inscription **$660 + 10.4% tax on the
   inscription alone** / ECF stays **10%**. Replaces the current fees (Inscription $605
   etc.). State provenance on the page as the TGMP map does.
3. **Inscription is a TOGGLE, addable ×2** — "you can add two inscriptions on the
   front". Quantity 0/1/2, card math updates, print mirrors it. (This supersedes
   sprint-08's open question about O&C qty defaults only if the operator's ruling
   touches it — it doesn't; leave O&C qty behavior as-is.)
4. **Add Interlude Urn pricing: Interlude (Matthews) $665.00** (operator-supplied at
   boot). GOMN's sheet rules say Companions-2 because two Interlude Urns fit — offer the
   urn as an add-on line (qty up to rights) on the niche card, clearly a merchandise
   add-on, not a fee.
5. Extend `verify_gomn_map.mjs`: assert the new schedule, the ×2 inscription math, and
   the $665 urn line; sabotage each (perturb → exit 1 → restore). Anchors
   (168 niches, 37 priced $241,815 list) must hold unless a fee change legitimately
   moves a derived figure — name any moved anchor and why.

## Granite guide (`granite-niches-guide.html`)

1. **Replace the first photo** — "does not look very good". Pick a better one from
   `D:\Cemetery Photos Misc\` (`GOMN Niches`, `ROAC Photos`, `Garden Court and Terrace
   Garden Maus`). Names on memorial plates are FINE (operator ruling); no living
   people's faces. Look at the result at page scale before committing.
2. **Update GOMN's printed fees** to the schedule above (inscription $660 +10.4%,
   O&C $875, Rec $235) and note the ×2 inscription option.
3. Regenerate the guide PDF (2-page cap stands); extend
   `scripts/verify_granite_niche_ranges.mjs` to assert the new GOMN fees; rerun green.

## Verification (verbatim outputs)

- `node scripts/build_gomn_map.mjs` + `node scripts/verify_gomn_map.mjs` PASS; sabotage
  evidence; the 48-check GOMN Playwright suite extended for the inscription toggle ×2
  and urn line, rerun green.
- `scripts/verify_granite_niche_ranges.mjs` green with new assertions.
- `npm run check` 8/0; `npm test` counts not falling (name the new expected count).
- Screenshots (font before/after, fee card with 2 inscriptions + urn, guide first photo
  old/new) in `scratch/s09d-renders/` — look at them.

## Report

Standard format: shipped, branch+commits, verbatim gates, fee before/after, files
changed, decisions & open questions, director hand-checks.
