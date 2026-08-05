# TRACK C — PCM catalog: add the new COMPANION design class (s17/pcm-companion)

You are a track agent in an isolated git worktree. Repo: BW Quote Tool (public GitHub
Pages repo; CRLF; never `git add -A`, explicit paths only).

**FIRST: stale-base check.** `git log --oneline -1` must show `4203070` or a
descendant; if older, reset onto local main first and say so.

## The operator's brief (2026-08-05, verbatim intent)

New folder: `D:\Cemetery Photos Misc\PCM COMPANION` — 245 files, names like
`Headstone-Design-PCM-2100.jpg` and GUID-suffixed `.webp` twins of the same numbers.
"These are additional PCM designs that can be uploaded to the PCM catalog. The photos
on these ones do NOT need to be removed as the quality of these images should be
better than what you did before."

That ruling is scoped: **this new image class ships with its photographs intact** —
no masking, no roundel/oval placeholders. The 84 existing masked plates STAY masked
(s15 ruling stands). Do not touch existing plate images.

## The job

1. **Survey the folder READ-ONLY.** Dedupe: many numbers exist as both .jpg and .webp
   (GUID-suffixed) — pick one per design number (prefer the higher-quality/larger
   source; record the rule). Check for overlap with design numbers already in the
   catalog data — if a number already exists as a book plate, the new image is an
   ADDITIONAL view or a better replacement: report the overlap set and ship them as a
   distinct source class rather than silently replacing plates.
2. **Normalize and import** into the PCM catalog pipeline
   (`scripts/pcm_extract.py --data` / `build_pcm_catalog.mjs` /
   `verify_pcm_catalog.mjs` — read them first; the catalog page, data module and gate
   are one system, never hand-edit generated output). Encode to the catalog's webp
   convention (~720px class, byte-deterministic encode). Watch repo growth: measure
   the exact MB delta and report it — it is a push-gate flag, not your call.
3. **Category/search:** these are COMPANION designs — they must surface under the
   "companion" format search (that facet exists; extend the data so these carry it).
   Give the class an honest label in the UI (e.g. a distinct source tag so families
   can tell a photographed companion design from a book plate — match the catalog's
   existing idiom for classes).
4. **Gate:** extend `verify_pcm_catalog.mjs` for the new class (counts both
   directions, no-masking is EXPECTED here — make sure EXPECT_PHOTO_MASKED logic or
   its equivalent does not misfire on the new class), plus at least one sabotage
   proven red/green ON THE RULE THAT APPLIES (check specificity; a needle that hits a
   shadowed rule is a dud — s14 scar).
5. **Served-tree discipline:** the gate reads disk AND fetches — `assertServesThisTree`
   must be its first effective act; run BW_BASE-pinned against a server rooted in YOUR
   worktree, never the main tree's 3737. Quote the exact env-pinned command.

## Constraints

- PII check by eye across the imported set: these photograph real installed memorials —
  the standing photo-PII ruling (2026-07-30, relaxed for his property photos) applies,
  but NO operational paperwork, no faces of living people in frame; flag anything
  doubtful rather than shipping it.
- D:\ is read-only source. Do not reorganize it (Property Cards layout is load-bearing).
- Full `npm test` green (baseline 2425/37; reconcile your delta exactly). Syntax check
  before commit. Renders: eyeball the catalog page fold, the companion search results,
  and a handful of lightboxes at full size; keep screenshots in `scratch/s17c-renders/`.
- Commit on your branch, explicit paths. No push, no merge.

## Report back

Import count + dedupe/overlap tables, MB delta, gate extension + sabotage proof, the
exact commands run, renders eyeballed, PII flags, honest limits.
