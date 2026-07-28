# Sprint-06 — Terramation guide + MVC glass-front niche map update

Opened 2026-07-28, from the operator directly (not the roadmap). Three asks:

1. **A new family-facing Terramation guide**, matching the existing Bonney Watson guide
   family, **preceded by real research** — the on-hand PDFs are source material to make a
   *better* guide from, explicitly **not** to be uploaded/published directly.
2. **Update the live MVC glass-front niche map**
   (`MAPS/MVC_NewGlassFront_NicheMap_1.html`, published on GitHub Pages) to the new
   June 2026 layout/price PDF, **and sync the internal map repo's `MVCN.json`** so the two
   never disagree (operator: "Sync both").
3. **Move the four source PDFs out of `E:\Downloads`** into their proper home. DONE at
   Gate 0: all four copied to `reference-docs/internal/` (gitignored — operator chose
   local-only), SHA-256 verified identical. Originals are deleted from Downloads at the
   close gate, after the sprint's deliverables are merged.

## Source material (all in `reference-docs/internal/`, LOCAL-ONLY, never commit)

| File | What it is |
|---|---|
| `Terramation Info Booklet (PDF).pdf` | BW-branded 12-page family booklet, image-only scans (no text layer). Photos inside are usable BW/Return Home marketing assets. |
| `Terramation Description.pdf` | 1-page family-facing text: what terramation is, the 60-day process, soil placement, ~3/4–1 cu yd / ~500 lb of soil. |
| `Bonney Watson Return Home Partner Training Guide.pdf` | 13-page INTERNAL partner sales training (quizzes, sales tactics). Content may inform tone/FAQ; **nothing identifiably "sales training" may appear in the family guide, and this file must never be published.** |
| `MVC_New_Glass_Front_Niches.pdf` | 1-page official layout+price sheet, "Prices effective: June 2026". Authoritative for Track M. |

## Verified facts (director-checked 2026-07-28; leads for tracks to re-verify, per MISTAKES #2/#14)

- **GPL already prices terramation** — `pdf-assets/General Price List.pdf` p13:
  TERRAMATION (Natural Organic Reduction) **$7,795.00**; Laying in Ceremony **$895.00**.
  The guide's pricing comes from there, verbatim, nowhere else.
- No page in the repo mentions terramation today (grep across *.html: 0 hits).
- The live niche map's walls are labelled Back/North/South/"Front Wall (Entry)" with no MIS
  location strings and no effective date; its price multiset differs from the new PDF
  (e.g. live has 3×$48K, PDF has 2×$48K + 2×$42K).
- New PDF wall naming: Back Wall (East) = `MVC-ISL-E-Level-Space`, Side A (North) =
  `MVC-ISL-N-Level-Space`, Side B (South) = `MVC-ISL-S-Level-Space`, Front Wall (West) =
  `MVC-ISL-W-Level-Space`. Colors encode rights-per-niche (pink = 4-right D/E companions,
  blue/green/light-blue = 2-right classes). West wall has black void cells (the entry).
- `wmp-cemetery-map/data/mausolea/MVCN.json`: 146 units across walls BW(51)/NW(23)/SW(23)/
  FW(49), each with `x/w/h`, `price`, `urns`, `dim`, `status`. 145 `available`,
  1 `not_for_sale`; its note records recent hand-edited sales. **Statuses/occ are
  hand-maintained truth and must survive the price/layout sync.**

## Tracks

| Track | Branch | Surface | Model |
|---|---|---|---|
| R — Terramation research | (no branch; writes `ops/sprints/sprint-06/RESEARCH.md` only, director commits) | web + local PDFs | opus |
| M — MVC niche map update | `s06/mvc-niche-map` (public repo) + a local commit in the map repo | `MAPS/MVC_NewGlassFront_NicheMap_1.html`, `wmp-cemetery-map/data/mausolea/MVCN.json` | opus |
| G — Terramation guide | `s06/terramation-guide` | new `terramation-guide.html`, `guides.html` card, extracted images, brand log entry | opus |

**Operator instruction 2026-07-28: track subagents run on Opus (not Fable).** Consistent
with the standing model policy in `SPRINT_GUIDELINES.md`.

**Parallelism:** R and M spawn together (R touches no repo file; M's files overlap with
nothing else). G spawns after R completes — the guide is written FROM the research. No
worktrees needed: M and G never run against the same files at the same time, and neither
touches `index.html`.

**Merge order:** M first, then G. Map repo commit is merged in its own repo by the track's
own local commit (no remote exists there).

## Gates

- **Gate 0 (done, director):** four PDFs copied to `reference-docs/internal/`, hashes
  verified, folder gitignored and proven ignored.
- **No track touches `index.html`.** The generator baseline is therefore not in play; if
  any track finds it must touch `index.html`, it stops and reports instead.
- **Close gate (operator):** review the rendered guide + niche map, approve the push
  (`git push origin main` — live immediately), then director deletes the four originals
  from `E:\Downloads` (copies already hash-verified), and Martice spot-checks the live
  pages once Pages deploys.

## Verification contract for this sprint

- `npm run check` → `index.html: 8 blocks, 0 errors` (unchanged — nothing edits it)
- `npm test` → counts compared against boot baseline (1300/26 with map present); count
  may rise if a track adds a suite, must never fall
- `scripts/verify_guides_page.mjs` green after Track G touches `guides.html`
- Map repo: `npm test` green (`19 passed` + `2/2 unit files valid, 2770 units checked,
  index ok`) after Track M touches `MVCN.json`
- **Render-and-look is mandatory** (MISTAKES #15/#16): Track G renders its guide page and
  its print/PDF output and looks at every page; Track M renders the updated niche map and
  compares it visually against the source PDF's rendering.
