# TRACK Q — Glass-front niche infographic (4 printed pages, all four locations)

Repo: `C:\Users\Martice\bw-quote-tool`; you run in the WORKTREE
`C:\Users\Martice\bw-quote-tool-glassinfo` on branch `s08/glass-infographic`
(node_modules junction in place). ALWAYS `git -C C:\Users\Martice\bw-quote-tool-glassinfo …`.
Obey `ops/SPRINT_GUIDELINES.md` + `ops/DESIGN.md`. Commit locally with explicit paths,
NEVER push. Never write to production Firebase.

**Read `docs/BRAND_AND_BUILD_LOG.md` FIRST**; append your entry when done. You branch
from a main that already carries sprint-08 Tracks F (ECL champagne), P (ROAC guide) and
H (COM map with the RAD/SER data modules) — read their landed files, don't rebuild them.

## Operator request (2026-07-29, verbatim intent)

A glass-front niche INFOGRAPHIC — exactly **4 pages when printed** — covering all four
glass-front locations: **Eternal Light Columbarium, Mountain View Columbarium (new
niches), Serenity niches, and Radiance niches**. With photos. It explains the
ADVANTAGES of glass-front niches as opposed to GRANITE(-front) niches, and states the
appropriate PRICE RANGE for each area.

## Content sources — nothing invented

- **Price ranges, computed never typed:** min/max of AVAILABLE niches per location,
  from the repo's own data modules — `scripts/ecl-niche-data.mjs`,
  `scripts/mvc-niche-data.mjs`, and the RAD/SER data landed by Track H (find it in
  `scripts/com-crypt-data.mjs` or its sibling — read what actually landed). A
  reconciliation script asserts every printed range equals the module's min/max; if a
  location has few availables left, the range is still the truth — print it with
  "current availability" wording. ECF/O&C/recording fees mentioned only as each
  location's module/map carries them (they differ: ECL vase $370 vs COM vase $415 —
  never cross-apply).
- **Glass vs granite comparison:** granite-front = ROAC and GOMN (WMP's two granite
  locations — Track P's guide covers them; link it). Verifiable contrasts only: glass front shows the urns and personal
  items (photos, keepsakes) — personalization visible; granite front presents an
  engraved/bronze exterior face. Interior placement (MVC/RAD/SER; ECL per its photos)
  vs ROAC's open-air courtyard where true. NO claims of superiority on durability,
  value, weather, or maintenance that the repo cannot back — frame as "different
  families prefer…" where honest. Tone matches the guide family.
- **Capacity/rights:** state two inurnment rights per niche ONLY for locations whose
  data/tool model supports it (ROAC/MVC niches hold 2 per the tool's capacity model;
  verify what ECL/RAD/SER sheets say — if silent, say nothing for those).
- **Cross-links:** each location's live map page (`MAPS/MVC_NewGlassFront_NicheMap_1.html`,
  `MAPS/ECL_NicheMap.html`, `MAPS/COM_CryptMap.html` for RAD/SER).

## Photos — his real ones, PII-guarded

Sources: `D:\Cemetery Photos Misc\Eternal Light Columbarium (NEW)`, `D:\Cemetery
Photos Misc\New MVC Photos`, `D:\Cemetery Photos Misc\Radiance and Serenity Niches`,
plus RAD/SER shots among `D:\Cemetery Photos Misc\Chapel of Memories`. Pick the best
1–2 per location. **HARD RULE (same as Track P): no legible occupant name, plate text,
dates, or person's face in any published image** — crop/choose angles, zoom the final
render to verify, drop any photo in doubt. Resize/compress per repo image conventions;
stage each file by name.

## Deliverables

1. `glass-front-niches-guide.html` — infographic-style page in the family brand
   (bolder visual layout is welcome: per-location panels, comparison table
   glass-vs-granite, price-range bands). Print stylesheet = **exactly 4 pages**.
2. PDF registered in `scripts/build_guide_pdfs.mjs` (e.g.
   `pdf-assets/Glass-Front Niche Guide.pdf`), rebuilt; added to
   `scripts/verify_guide_pages.mjs`'s cap list with a ==4-or-less assertion (target 4).
3. `guides.html`: ONE card, appropriate category, pill bumped. Coordinate nothing —
   Tracks P and H have already merged; append after their cards.

## Verification gates (quote outputs verbatim)

1. Range-reconciliation script: four printed ranges == module min/max, run and quoted.
2. PDF page count ≤4 (state the exact count; 4 is the target), `verify_guide_pages.mjs`
   + `verify_guides_page.mjs` + `verify_print_header.mjs` green.
3. `npm run check` 8/0; `npm test` counts never fall from what you find at branch time.
4. Render every PDF page and LOOK; zoom every photo — PII check per photo in the report.
5. No edits outside your file set (page, photos folder, the two scripts' registrations,
   guides.html card, build log).

## Report

What shipped; branch + commits; verbatim gates; the four computed ranges; photos chosen
+ PII check each; glass-vs-granite claims list (each with its backing); decisions &
open questions.
