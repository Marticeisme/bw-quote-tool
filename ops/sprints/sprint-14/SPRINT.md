# Sprint-14 — Photoreal walkthrough reels ×3 + two new mausoleum maps (geometry-first)

**Opened 2026-08-03.** Director: Fable session. Tracks: Opus (operator instruction).
Source: operator brief 2026-08-03 (new videos shot this morning) + the MIS three-building
overview screenshot (transcribed into the track briefs — the on-disk PNGs are
single-building only).

## Goal

1. **Three interactive photoreal walkthrough reels** (Gaussian splats, COLMAP + Brush on
   the operator's RTX 3090 — the proven s10 pipeline) from today's videos:
   - `D:\Cemetery Photos Misc\Chapel of Memories\20260803_122734.mp4` (14:22) → Chapel of
     Memories reel (REPLACES the delisted s10 walkthrough — this is the re-shoot).
   - `D:\Cemetery Photos Misc\Terrace Garden Memorial Path\20260803_120633.mp4` (8:16) →
     Terrace Garden reel (mausoleum + memorial path together — TGMP is inside the TG area).
   - `D:\Cemetery Photos Misc\Eteernal Light Maus\20260803_121735.mp4` (9:29) → Eternal
     Light reel (mausoleum + columbarium together — ECL is inside the ELM building).
   One reel per video (operator ruling). All 1080p30 HEVC, single continuous shoot
   (12:06 → 12:17 → 12:27), so scenes may share transitional footage.
2. **Terrace Garden Mausoleum map** (`MAPS/TG_Mausoleum_Map.html`, generated) — geometry
   from the MIS overview + video frames; the POOL IS GONE, replaced by the Terrace Garden
   Memorial Path; the map links to `MAPS/TGMP_Map.html`.
3. **Eternal Light Mausoleum map** (`MAPS/ELM_CryptMap.html`, generated) — geometry from
   the MIS overview + video frames; links to `MAPS/ECL_NicheMap.html` (the columbarium,
   which physically sits inside the ELM building).

## Operator rulings at boot (2026-08-03, all binding)

- **One reel per video, 3 total.** Reels may be separate; the connectedness lives inside
  each scene.
- **Geometry-first maps, data later:** the two new maps ship real layout, section labels,
  and cross-links, but positions are UNPRICED and UN-STATUSED ("ask us" wording, s11
  CONFIRM-chip pattern). NO INVENTED NUMBERS — prices/statuses arrive when the operator
  supplies MIS lot-inquiry + price exports (future sprint or mid-sprint drop).
- **Publish gate for reels: operator eyeballs before linking.** Reel pages + splat assets
  are committed but NOT linked from any family-facing surface (no cards, no header links,
  no map buttons) until he drives each one and gives the word. The delisted COM
  walkthrough card stays delisted.
- **Pool → TGMP:** where MIS says "Pool" the model is the Memorial Path area.
- 3090 + software installs authorized (standing s10 ruling; installs live under
  `bw-quote-tool-splat/scratch/splat/dl` if still present — verify, else re-fetch).
- **NO push pre-authorization.** Push is an explicit close-gate ask.

## Gate 0 (operator, non-blocking for spawn)

- OPTIONAL: drop the full three-building MIS overview screenshot as a PNG into
  `D:\Cemetery Photos Misc\Eteernal Light Maus\` — tracks otherwise work from the
  director's transcription (in the track briefs) + video frames.
- The 3090 must be free during Track A's training runs (~20–60 min per scene, serial).

## Tracks

| Track | Branch | Worktree | Scope |
|---|---|---|---|
| A | `s14/photoreels` | `../bw-quote-tool-s14a` | 3 splat reels + walkthrough pages + gates; GPU owner |
| B | `s14/tg-maus-map` | `../bw-quote-tool-s14b` | Terrace Garden Mausoleum map (generated, geometry-first) |
| C | `s14/elm-map` | `../bw-quote-tool-s14c` | Eternal Light Mausoleum map (generated, geometry-first) |

All three spawn in parallel (disjoint file ownership; only A touches the GPU).
File-ownership fences: A owns `MAPS/*Walkthrough*` + new reel pages/assets + their
builders/gates; B owns `MAPS/TG_Mausoleum_Map.html` + its data module/builder/gate; C owns
`MAPS/ELM_CryptMap.html` + its module/builder/gate. NOBODY touches index.html, the quote
generators, contract code, guides, or existing map pages except: B may add the one
cross-link on TGMP_Map.html back to the TG Maus map, C the same on ECL_NicheMap.html —
each a minimal, gate-asserted anchor.

## Mid-sprint addition (operator, 2026-08-03)

**Track D** `s14/pcm-catalog-ux` (`../bw-quote-tool-s14d`): PCM design catalog gets
compare + print parity with the casket catalogs (s09 Track K compare sheet, s11
Track C print-what's-filtered), and Real Examples becomes a toggle like the design
books/elements. See `TRACK-D-PCM-CATALOG-UX.md`. File-disjoint from A (walkthroughs
only); B and C already merged.

## Merge order

B → C → A (`--no-ff`, suites green on main after each). D merges when ready relative
to A — the two are file-disjoint, first-finished-first-audited.

## Verification contract

- `npm run check` → `index.html: 8 blocks, 0 errors`
- `npm test` → **2090 passed, 0 failed across 36 suites** on main (worktree runs may show
  the documented wmp-map-absent variance; report YOUR exact number + the env-pinned
  command)
- New map gates + sabotages green; family-register gate (`_no_mis_assert.mjs` 20-term)
  wired into every NEW family-facing surface; "MIS" never rendered.
- Reel gates: gzip-proxy render pass, `vertexCount === assetBytes/32`, never size from
  Content-Length, per-stop pixel floors (lit %, stdev/colour/detail, camera readback from
  the draw matrix). Presence is NOT pixels.
- Repo growth: splats ~25–30 MB each (≈90 MB total incl. replacing the 22.9 MB COM splat)
  — flag exact numbers at the push gate; this is the biggest delta any sprint has added.

## Close checklist (draft)

1. Director re-runs contract + all new gates on merged main.
2. Operator drives all three reels locally (the eyeball gate) — linking is a SEPARATE
   future word, not part of this sprint's push.
3. Operator eyes: TG Ossuary discrepancy (MIS overview still draws it; s09 Track T deleted
   it from the TGMP map on inference — ruling wanted), pink-highlighted MIS clusters
   (meaning unknown, not modeled as status).
4. Push word → syntax check → push → live verification (pixel readback on any rendering
   page, byte-checks on new assets).
