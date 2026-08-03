# TRACK-A — Native-resolution re-extraction (elements, photos, references) + format search

You are a track subagent in sprint-12 of the BW Quote Tool. Obey
`ops/SPRINT_GUIDELINES.md` and `ops/DESIGN.md`. Work ONLY in your worktree
(`git -C` absolute paths always). Branch: `s12/pcm-native-res`. Commit locally with
`[s12/pcm-native-res]` prefixes; NEVER push; NEVER write to Firebase; never call any
save/persist function.

## The problem

`pcm-design-catalog.html` ships images well below the detail its sources actually
contain, and the operator finds the enlarged views "not very good at all":

- **Elements** (`pcm-element-images/`, 3,973 files): extracted by
  `scripts/pcm_extract.py` at `ELEM_PX = 150` and crushed to 1-bit PNG. The Elements
  book (`D:\Cemetery Photos Misc\Markers\comp-2019-Design-Elements-Book-Final-Revised-Singles.pdf`)
  embeds the tiles at 270×270 / 360×360 — a genuine ~2× native gain by re-extraction.
- **Example photos** (`pcm-example-images/`, 30 files): cut at `PHOTO_PX = 760` from
  ~4000px originals in the same D:\ folder.
- **Reference plates** (`pcm-reference-images/`, 13 files): rendered small from book
  pages that carry 150-dpi full-page art.

Separately, the operator ruled mid-boot: **typing "companion" in the catalog search must
show all companion designs** — and by extension, format/category words must work.

## Operator rulings binding this track

- Size budgets, hard: `pcm-element-images/` ≤ 28 MB · `pcm-example-images/` ≤ 9 MB ·
  `pcm-reference-images/` ≤ 1 MB (post-work totals). Tune encodings to fit.
- Do NOT touch `pcm-design-images/` or create `scripts/pcm_plate_export.py` /
  `scripts/pcm_upscale.py` / `scripts/verify_pcm_upscale.mjs` /
  `tests/test-pcm-upscale.mjs` / `data/pcm-upscale-manifest.json` — Track B owns the
  design plates in a parallel worktree and will merge BEFORE you; expect its files at
  your merge time, and your rebuilt `data/pcm-catalog.json` must keep design `img`
  paths exactly as they are (`pcm-design-images/<book>/<num>.webp`).
- No AI upscaling in this track — your sources are genuinely high-res; extract, don't
  hallucinate. (If you judge specific reference plates would still benefit from AI,
  flag it in your report; don't do it.)

## Build it

1. **Elements at native resolution** in `scripts/pcm_extract.py`:
   - Raise `ELEM_PX` to 300 (measure a sample first — if the placed tiles are 360px
     native and budget allows, justify a higher number with arithmetic).
   - Replace the 1-bit output with anti-aliased line art that survives the page's
     card/lightbox enlargement: grayscale (or palette) encoding chosen by MEASURED
     size — the budget is 28 MB over 3,973 files (~7 KB avg). Candidates: optimized
     grayscale PNG, lossless webp, lossy webp q80+. Pick by rendering AND by totals;
     keep the ink-on-white look (trim() stays).
   - Keep filenames/paths identical (`pcm-element-images/<cat-slug>/<slug>.png` — if
     you change the extension you must update every reference: data JSONs, built HTML,
     gates; grep first, decide then, and say what you chose).
2. **Photos**: `PHOTO_PX` 760 → 1600, re-run the photo cut. Same 30 files, same names.
   JPEG quality tuned to the 9 MB budget. The curated set and crops must not change —
   only resolution. (The 5 markers-guide photos referenced by the page live elsewhere
   and are out of scope.)
3. **Reference plates**: re-render the 13 at ~2× their current pixel size within the
   1 MB budget (they are small; this is easy). Note: some current files report
   nonsense dimension metadata (e.g. font-styles-1.webp claims 35124×42846) — make the
   new ones sane and gate-checked.
4. **Format/category search** (in `scripts/build_pcm_catalog.py` /
   `scripts/pcm_tags.py`, wherever the E2 search pipeline lives — read it first):
   - "companion" → all designs with fmt `companion`; "individual" → `individual`;
     "ledger" → `ledger`; "flat"/"flat marker" → `flat`; category/sub words from the
     books' own vocabulary (e.g. "hearts", "crosses" already work via tags — do not
     regress them).
   - Layer on TOP of subject-tag search: a query should match designs whose tags OR
     fmt/cat/sub match, with the existing lit-chip explanation extended so a
     "companion" hit shows WHY (a chip reading e.g. `format: companion`).
   - Plural/singular tolerant like the E2 synonyms ("companions" works).
5. **Rebuild** `data/pcm-catalog.json` (`--data` mode reuses images where unchanged)
   and the page via `scripts/build_pcm_catalog.py`. Never hand-edit the built HTML.
6. **Gates** — extend `scripts/verify_pcm_catalog.mjs` (113 checks today; keep every
   existing check green or consciously update it with justification):
   - element/photo/reference dimension floors (element long edge ≥ 280 except tiles
     whose native source is smaller — derive, don't hardcode a lie), per-dir size
     budgets, sane dimension metadata on all reference images;
   - format-search checks: "companion" returns exactly the count of fmt=companion
     designs in the data (compute both sides), "ledger" likewise, a subject query
     ("roses") still returns its E2 baseline (51 designs + 116 elements — verify
     against current data rather than trusting this note), and a nonsense query
     returns 0.
   - Sabotage-prove new checks both directions; transcript in the report.
7. **Suite** — extend `tests/test-pcm-catalog.mjs` for the search behavior at the
   rendered-page level (type "companion", assert result count and a lit format chip).
8. **Verify**: `npm run check` (`8 blocks, 0 errors`), full `npm test` in the worktree
   (junction `node_modules` first; record counts), `node scripts/verify_pcm_catalog.mjs`
   PASS, size arithmetic per dir, and LOOK at renders: ≥6 elements before/after at
   lightbox size, ≥3 photos, the "companion" search result page — screenshots into
   `scratch/s12a-renders/`.

## Report

Deliver: what shipped, encodings chosen with size arithmetic, search semantics
implemented, render paths, sabotage transcript, suite counts, and every honest caveat.
Your final text is the report — raw facts over polish.
