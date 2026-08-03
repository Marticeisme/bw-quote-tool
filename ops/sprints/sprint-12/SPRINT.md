# Sprint-12 — DRAFT (seeded at sprint-11 close, 2026-08-02)

Not yet opened. Amend at boot from reality + the operator's next notes.

## Candidates carried from sprint-11

1. **Photo-first rollout, wave 2** — apply the Track D card template (documented in
   BRAND_AND_BUILD_LOG "2026-08-02" entry) to the remaining guides. Photo gaps to
   fill first (operator supplies or shoots): lawn crypts, scattering gardens (the
   D:\ folder is EMPTY), a ground-burial scene, veterans sections.
2. **Walkthrough re-shoot** — slow orbiting passes per area (chapel, both niche
   walls, corridors); glass fronts need deliberate multi-angle coverage. Then
   re-run COLMAP+Brush on the 3090 and extend the 7-stop path. The ~45-min
   walkthrough gate is NOT in npm test — run deliberately.
3. **Operator rulings pending from s11:** RAD Family niche height/depth
   contradiction (needs an inventory-system answer); "CONFIRM" chip wording on
   unpriced niches; Design Inspiration placement in the sizes PDF; per-part
   running headers on the two marker PDFs; price-ladder break points/labels on
   catalog filters; boats under "fishing" in PCM search; PCM tag chips always
   visible vs search-only.
4. **Sprint-10 carried:** translated guide editions (KO/VI/ES/UK/ZH) once the
   operator "feels better about the state of the guides"; family packet (Option C);
   ROAC D-INT D-5 price discrepancy; GOM B-7/B-11 ruling; ROAC floor-walk camera
   model.
5. **Serenity 3D label crowding** — LOD floor raise on niche walls if the operator
   wants it.

## Standing facts for the next director

- Verification contract: `8 blocks, 0 errors`; `1845 passed, 0 failed across 34
  suites (1843 without the map repo)`.
- Push discipline: origin/main == local main at s11 close (`9a2e6ab`); another
  session may push out of band — fetch and check behind-count, integrate by MERGE,
  never rebase a main carrying --no-ff merges.
- Never spawn a main-tree track while merges remain (s11 deviation, twice-learned).
- Check `/__served-tree` before trusting anything on port 3737.
