# Sprint-13 — Granite + Glass-Front Niches guides: photo-first, page-per-section

**OPENED 2026-08-03** (director: same Fable session as s12; tracks: Opus). Operator:
"the crops on the granite niches guide cut off a lot of the photos. This guide can be
longer if we can have better quality photos for each section. maybe a page per
columbarium or niche section each."

## Reality at boot

- Tree clean, main==origin/main (`67e5b78`). Contract 2085/36 green as of the s12
  close (~today).
- `granite-niches-guide.html`: 6 sections (What a Niche Is / ROAC / GOMN / Terrace
  Garden Memorial Path / Three at a Glance / Talking It Over), 7 content photos,
  PDF is 2 pages — photos are decent resolution (900–1400px) but the layout's fixed
  frames crop them hard.
- Source photos on `D:\Cemetery Photos Misc\`: `ROAC Photos`, `GOMN Niches`,
  `Terrace Garden Memorial Path`, `Cremation Posts`, `Garden Court and Terrace
  Garden Maus` — the operator's own property photos (photo-PII relaxed ruling
  2026-07-29 applies).

## Operator ruling

- These guides MAY exceed the 6-page cap: a page per columbarium/niche section. Cap
  for the granite-niches AND glass-front guides set to **8 total pages each**
  (per-guide exceptions, gated); every other guide keeps 6.
- Mid-boot extension (operator): "same with glass front niches as well" — folded into
  Track A (shared cap map / template / manifest; a second parallel track would
  collide in the print system).
- Photos must not be cropped to fragments — frames follow the photos.

## Tracks

- **TRACK-A — combined niche guides photo-first** (`s13/granite-niches-photos`,
  worktree, Opus). granite-niches + glass-front guides redesigned page-per-section,
  cap 8 each. Owns those two guides, their image dirs, the cap-map creation.
- **TRACK-B — five per-area guides** (`s13/area-guides`, worktree, Opus; ADDED
  mid-sprint on the operator's request: "larger more visual guides for each section
  that we still have a lot of inventory for"). NEW roac-guide / mvc-niches-guide /
  ecl-guide / gomn-guide / terrace-garden-guide, photo-led, ≤8pp each, figures
  computed from the live data modules and verifier-pinned, best photos curated from
  the matching D:\ folders. Known merge collisions (director resolves): guides.html
  cards, cap map, .build-manifest.

Merge order A → B.

## Close checklist

Merge --no-ff; director re-runs contract + guide gates, eyeballs every new page at
print size; repo delta reported; push only on operator word.

## Candidates from sprint-12

1. **Element AI upscale** — the s12 re-extraction hit the Elements book's true raster
   ceiling (270–360px @150ppi); elements still soften at full lightbox zoom (~3× at
   ~890 CSS px). Real-ESRGAN on line art is the candidate (the x4 pipeline, cache and
   fallback machinery all exist in scripts/pcm_upscale*.py); Borders & Panels pages
   are VECTOR in the PDF and could re-render at any dpi with no AI. Budget question
   for the operator first — the +30 MB s12 cap is nearly spent.
2. **`guide-print-meta.mjs` cleanup** — `extract`, `HERO`, `PLACE` are fully dead
   (covers gone since s11, header gone since s12); only `GUIDES` is still imported.
3. **Operator eyes on s12 output:** the 22 fallback plates ship softer-but-honest —
   flag if any specific plate deserves a hand re-do; the guide logo placement/size;
   whether "flat" should also match the 2011 book's 340 physically-flat designs
   (data carries no flat flag for them — semantic change, needs a ruling).

## Candidates carried from sprint-11/10 (unchanged)

4. Photo-first rollout wave 2 (photo gaps: lawn crypts, scattering gardens folder
   EMPTY, ground-burial scene, veterans).
5. Walkthrough re-shoot → COLMAP+Brush rerun → extend the 7-stop path (~45-min gate,
   not in npm test).
6. s11 rulings pending: RAD Family niche height/depth; "CONFIRM" chip wording; Design
   Inspiration placement; per-part marker-PDF headers; price-ladder labels; boats
   under "fishing" in PCM search; tag chips always-visible vs search-only.
7. s10 carried: translated guides (KO/VI/ES/UK/ZH); family packet C; ROAC D-INT D-5;
   GOM B-7/B-11; ROAC floor-walk camera.
8. Serenity 3D label crowding (LOD floor raise).

## Standing facts for the next director

- Verification contract: see STATE.md sprint-12 close entry for the current suite
  number (DESIGN §5 was corrected at s12 close after two sprints of drift).
- **Served-tree discipline is now enforced by the PCM gate itself** (s12 lesson: the
  DIRECTOR was the one caught by port 3737 this time). Any verifier that reads disk
  AND fetches a served page must call served-tree-check before its first assert.
- Track reports must quote the EXACT env-pinned command they ran (BW_BASE etc.) —
  the s12 Track A false-alarm was a report omitting its own pin.
- Guide PDFs are Chromium-only: `@page{background}` paints the full-bleed cream;
  other browsers' Ctrl+P shows white margins (documented in guide-print.css).
- Worktree node_modules junctions: delete with `[System.IO.Directory]::Delete($p,$false)`,
  NEVER recursively.
- Push discipline: fetch and check behind-count before push; integrate out-of-band
  pushes by MERGE, never rebase a main carrying --no-ff merges.
