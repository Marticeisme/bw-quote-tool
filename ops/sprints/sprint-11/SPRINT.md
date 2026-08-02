# Sprint-11 — niche-wall accuracy, guide overhaul wave 1, PCM design catalog

Opened 2026-08-02. Director: Fable session. Tracks: Opus. Source: the operator's
session notes (verbatim in the conversation) + two wall-sheet screenshots whose
originals live at `D:\Cemetery Photos Misc\Radiance and Serenity Niches\{Radiance,Serenity}.png`.

Boot audit (director, 2026-08-02): tree clean, main == origin/main at `9e9dd34`,
`8 blocks, 0 errors`, `1538 passed, 0 failed across 31 suites`. Walkthrough driven
by the director headless: renders 56fps, camera works, reconstruction smeary on the
filmed path and fog off it — capture-data problem, not code.

## Operator rulings at boot (2026-08-02, all via AskUserQuestion)

1. **Guide PDFs: covers OFF everywhere + photo-first redesign of the key
   property/product guides this sprint**; remaining guides adopt the template next
   sprint. (Reverses the s10 generated-cover decision — logged.)
2. **Marker scale-guide prices are ALL-IN totals** (marker + standard engraving +
   setting/foundation), labeled as such, one per group G1T / G1NT / G2, printed
   INSIDE each marker outline.
3. **PCM design catalog publishes like the other catalogs** (Batesville precedent:
   supplier imagery used to sell that supplier's product).
4. **Walkthrough: constrain to filmed-path viewpoints, label it a preview, keep the
   link.** Proper multi-pass re-shoot queued for later.
5. From the notes verbatim: **never mention "MIS" on any family-facing surface**
   (guides, maps, PDFs); niche PRICES on the two screenshots are stale — ignore
   them, sizes are accurate; casket print groups 3–4 per page is track judgement.

## Tracks

| Track | Branch | Scope | Files |
|---|---|---|---|
| A | `s11/com-niche-walls` | RAD/SER separate selections, true niche sizing from the sheet PNGs, floor-plan section isolation, COM MIS sweep | `scripts/com-crypt-data.mjs`, `scripts/build_com_map.mjs`, `scripts/verify_com_map.mjs`, `MAPS/COM_CryptMap.html` |
| D | `s11/guides-photo-first` | Covers off all guide PDFs, MIS sweep everywhere family-facing except COM map, photo-first redesign of the 5 property/product guides | `scripts/guide-print-system/*`, `*-guide.html` (targets listed in track file), other MAPS builders for MIS only |
| B | `s11/marker-guides` | markers-guide split into TWO PDFs (sizes+colors+all-in group prices in-marker; photos/etching/photo-sizes), no cover, no MIS | `markers-guide.html`, marker PDF build, `docs/` outputs |
| E | `s11/pcm-catalog` | New PCM flat-marker design catalog from the three PCM books + 30 curated real photos + both PCM websites scoped | new `pcm-design-catalog.html` + build script + gate |
| C | `s11/catalog-filter-print` | Filters on casket + urn catalogs, print-what's-filtered at 3/page (4/page urns ok) | catalog HTMLs via their build scripts (`build_all_caskets.py` templates from wood!) |
| F | `s11/walkthrough-path` | Constrain walkthrough camera to filmed-path stops, "preview" label | `MAPS/COM_Walkthrough.html` + its builder/gate |

## Waves & merge order

Max 2 parallel (guidelines). Wave 1: **A + D** (disjoint). Wave 2: **B + E**
(B needs D's generator merged first). Wave 3: **C + F**.
Merge order: A → D → B → E → C → F (adjust to completion order only within a wave;
log any deviation).

Conflict guards: Track A owns everything COM; Track D must not touch
`markers-guide.html` (Track B owns it, including its cover removal and MIS sweep);
Track D's MAPS edits are MIS-wording only.

## Gates

- Gate 0: none.
- Verification contract per DESIGN §5: `8 blocks, 0 errors`; suite count must not
  fall below 1538/31 and rises with new suites; map gates for any touched map;
  guide verifiers; catalog verifier for Track C; generator baseline only if
  `index.html` is touched (no track plans to touch it except C is FORBIDDEN to —
  catalogs only).
- Close gate (operator): eyeball the rebuilt surfaces, then push — **no push
  pre-authorization was given this sprint; push is an explicit ask at close.**

## Close checklist (draft)

1. Director re-runs full contract on final main; all track gates green.
2. Operator eyeballs: COM map RAD/SER, the two marker PDFs, one redesigned guide
   PDF, PCM catalog, a filtered casket print.
3. Operator: push ruling.
4. STATE.md close entry; sprint-12 seeded (guide template rollout to remaining
   guides, walkthrough re-shoot, sprint-10 carried items).
