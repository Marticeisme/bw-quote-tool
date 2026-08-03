# TRACK-A — Granite Niches guide: photo-first, page-per-section

You are a track subagent in sprint-13 of the BW Quote Tool. Obey
`ops/SPRINT_GUIDELINES.md` and `ops/DESIGN.md`; read the s12 close entry in
`ops/STATE.md` (the guide print system just changed: logo top-right, full-bleed cream
via @page background, footer on the cream — your work inherits it, do not fight it).
Work ONLY in your worktree (`git -C` absolute paths always). Branch:
`s13/granite-niches-photos`. Commit locally with `[s13/granite-niches-photos]`
prefixes; NEVER push; NEVER write to Firebase.

## The operator's complaint (2026-08-03, verbatim)

"the crops on the granite niches guide cut off a lot of the photos. This guide can be
longer if we can have better quality photos for each section. maybe a page per
columbarium or nich section each."

## What to build

`granite-niches-guide.html` becomes a photo-first guide where **each columbarium /
niche area gets its own printed page** with photos shown properly:

1. **Curate new photos** from the operator's own folders on
   `D:\Cemetery Photos Misc\`: `ROAC Photos`, `GOMN Niches`,
   `Terrace Garden Memorial Path`, `Cremation Posts`, `Garden Court and Terrace
   Garden Maus`. Look at candidates AT FULL SIZE and pick for: shows the actual
   product (niche fronts, the setting, scale), good light, level horizon, no
   operational clutter. THE ONE HARD PII RULE: legible memorial names/dates in his
   property photos are FINE (operator ruling 2026-07-29) — but NO operational
   sticky notes / staff paperwork / scheduling info (an s09 crop was rejected for
   exactly that), no people's faces without reason, nothing that reads as a private
   record. State a per-photo verdict in your report.
2. **Cut them for the guide** into `granite-niche-images/` (keep existing names
   stable where reused; new files kebab-case). Target ~1400px long edge, JPEG
   quality tuned — the whole dir should stay lean (report the size delta; the s12
   photo budget discipline applies in spirit; there is no hard number for this dir
   but justify what you ship).
3. **Kill the cropping.** Frames follow the photos: use the photo-first card
   template documented in `docs/BRAND_AND_BUILD_LOG.md` ("2026-08-02" entry, built
   by s11 Track D) — aspect-ratio-preserving containers, no fixed-height
   object-fit:cover fragments for hero/section photos. Small thumbnails may still
   crop IF the full image appears elsewhere on the page.
4. **Page per section in print**: ROAC, GOMN, Terrace Garden (TGN bank), TGMP
   path/posts each get a full page led by photography; intro + at-a-glance/closing
   material arranged around them. Screen layout stays a normal scrolling page —
   this is print structure, not a screen rewrite.
5. **Per-guide page cap**: this guide's cap is now **8 TOTAL pages** (operator
   ruling). Implement as a per-guide exception in the print system / gate config —
   every other guide MUST keep 6, asserted unchanged. Update
   `scripts/verify_guide_pages.mjs` accordingly (cap map, not a global bump).
6. **Prices**: the guide's computed ranges and the range-only pricing rule are
   UNTOUCHED. Every printed figure must still reconcile via
   `scripts/verify_granite_niche_ranges.mjs` — extend it only if section pages
   print figures it doesn't already check.
7. **Rebuild the PDF** (+ `.build-manifest.json`). The s12 print system applies
   (logo, cream, footer); the P4 scar holds: CSS-background heroes need the
   builder's explicit wait before page.pdf().

## Verify — look at your work

- Rasterize EVERY page of the new PDF at ~150dpi into `scratch/s13a-renders/` and
  LOOK: no photo cut to a fragment, each section page reads as that area's page,
  logo/cream/footer intact, nothing clipped, page count ≤8.
- Screen view: before/after full-page screenshots; layout may change (this is a
  redesign) but must stay on-brand (#466e86/#e84610, existing typography) and the
  family-register gate must stay clean.
- Gates: verify_guide_pages (with your cap map — sabotage-prove it BOTH directions:
  this guide at 9 pages must FAIL, another guide at 7 must FAIL), photo-first
  verifier, guides-page verifier, granite-niche ranges, staleness gate.
- `npm run check` (8 blocks, 0 errors) and full `npm test` in the worktree
  (junction node_modules first; quote the EXACT commands incl. any BW_BASE pin —
  s12 lesson).

## Report

What shipped; per-photo curation verdicts; page map of the PDF; size delta of
granite-niche-images/; sabotage transcript; verbatim suite counts; render paths;
honest caveats. Raw facts over polish.
