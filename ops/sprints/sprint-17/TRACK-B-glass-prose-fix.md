# TRACK B — Glass-Front Niches guide: fix the §5 slop prose + dead map link (s17/glass-prose-fix)

You are a track agent in an isolated git worktree. Repo: BW Quote Tool (public GitHub
Pages repo; CRLF line endings; never `git add -A`, stage explicit paths only).

**FIRST: stale-base check.** `git log --oneline -1` must show `4203070` or a
descendant. If your worktree branched from something older, reset onto local main
before touching anything and say so in your report.

## The complaint (operator, 2026-08-05)

In `glass-front-niches-guide.html`, section 5 (Radiance/Serenity, ~line 619-622), two
problems:

1. **The footnote paragraph is slop.** Current text: "Both walls carry the same fee
   box: the glass-front niche schedule, the same opening & closing, recording fee and
   Endowment Care Fund as at the Eternal Light and Mountain View columbaria. The Chapel
   of Memories crypts have their own, different schedule, and we do not carry one over
   to the other. Every niche on both walls carries 2 rights of interment: two urns in
   the same niche, usually a husband and wife, on one contract, the double-height
   Family niches included." He reads this as compressed jargon ("fee box", "carries",
   "we do not carry one over to the other").
2. **The map line is unclear and breaks on paper.** "Open the Chapel of Memories map
   for both walls, space by space, with prices." He says: "I don't really know what
   this is trying to say or why it's even there." And someone reading a downloaded,
   printed, or emailed copy of the guide cannot click it.

## The job

1. **Rewrite the footnote** as plain, clear sentences in Martice's voice — read
   `docs/GUIDES_VOICE_DEBRIEF_2026-08.md` FIRST and follow it (first person,
   contractions, NEVER em dashes, never "inventory"/"counselor", no marketing copy).
   The facts that must survive, each stated plainly:
   - The fees for both walls are the glass-front niche schedule — the same opening &
     closing, recording fee and Endowment Care Fund rate as the glass-front niches at
     Eternal Light and Mountain View.
   - The Chapel of Memories CRYPTS have a different fee schedule; it does not apply to
     these niches.
   - Every niche on both walls includes 2 rights of interment — two urns in one niche,
     usually a husband and wife, on one contract — including the double-height Family
     niches.
   - **HARD CONSTRAINT:** the exact span `<span data-rights="radser">2 rights of
     interment</span>` must survive with that exact inner text —
     `verify_glass_niche_ranges.mjs` asserts it (operator ruling 2026-08-04).
   Also sweep the REST of this guide for the same slop register and fix anything
   comparable, conservatively — prose only, never a printed number, fee, count or range
   (they are all gate-asserted).
2. **Fix the map line.** On screen: keep a link but say what it is, e.g. that the
   Chapel of Memories niche map shows every space on both walls with its price and
   whether it is available (write it in the voice, don't copy my phrasing). In the
   PRINT and FAMILY-PDF cut: a hyperlink is dead paper — use the guide's existing
   print-suppression / data-pdf mechanisms so the printed versions either drop the
   line or replace it with something that works on paper (the live URL spelled out,
   or "ask me and I'll walk the map with you" in voice — your call, pick ONE and
   justify it). Check how other guides handle live-map references in print and match
   the established mechanism.

## Constraints and gates

- Scope: `glass-front-niches-guide.html` + its rebuilt PDFs + (only if genuinely
  needed) matching assertion-text updates in `verify_glass_niche_ranges.mjs`. Do NOT
  touch prices, ranges, counts, fee values, plan-cards' data attributes, index.html,
  or other guides.
- Gates green on final bytes (run, quote exact commands + counts):
  `verify_glass_niche_ranges`, `verify_family_type` (111-assert lock-in),
  `verify_guide_pages` (incl. PDF staleness — rebuild this guide's PDFs),
  `verify_photo_first`, full `npm test` (baseline 2425/37; reconcile any delta exactly).
- **Verify by looking:** rasterize the rebuilt family PDF + full print PDF (PyMuPDF or
  pdf.js/Playwright from repo root; Read can't open PDFs) and eyeball the §5 pages;
  screenshot the screen section. Renders in `scratch/s17b-renders/`.
- Syntax check before any commit. CRLF (\r?\n in script matches). Commit on your
  branch, explicit paths. No push, no merge.

## Report back

The new prose verbatim, the print treatment you chose for the map line and why, any
other slop you fixed (before/after), gate outputs, render paths eyeballed, honest flags.
