# TRACK E — guide-full-print (`s19/guide-full-print`; guides side: viewer.html,
# guide-print.css, *-guide.html minimal, build scripts if needed)

Read first: `ops/SPRINT_GUIDELINES.md`, `ops/DESIGN.md`, `ops/sprints/sprint-19/SPRINT.md`,
the top comments of `guide-print.css` (the print architecture: @page background, margin
boxes, `?print=family` selection, data-pdf keep/drop/summary), `viewer.html` (all of it
— it's small), `docs/BRAND_AND_BUILD_LOG.md` recent entries (the guides session's log).

## Operator's words (2026-08-06, verbatim intent)

"The PDF versions of files on the family resources are different from the HTMLs which
was the point. But when I print inside the HTML I want it to be the same as the HTML,
not some reduced version. Just make sure the margins fit the whole page."

## The mechanism (director's diagnosis — VERIFY before building)

- The condensed "family cut" is param-gated: `?print=family` sets
  `html[data-print-mode="family"]`; guide-print.css §family rules then drop/summarize
  sections. A guide page opened plain and Ctrl+P'd should already print full content.
- BUT the resources page's "Open Guide" goes to `viewer.html`, which displays the BUILT
  (condensed) PDF and whose Print button (`printPDF()`, ~line 166) prints THAT PDF.
  So "printing inside the HTML" as the operator experiences it = printing the reduced
  family cut.

## Mission

1. Reproduce both paths first (Playwright print-to-PDF): (a) guide HTML plain Ctrl+P,
   (b) viewer.html Print button. Record page counts + a content probe (a known
   `data-pdf="drop"` section present/absent). Report what each actually produces.
2. Make the family-resources print experience deliver the FULL guide:
   - Preferred shape (decide from what you find, log the decision): the viewer's Print
     button prints the guide HTML in full-print mode instead of the condensed PDF —
     e.g. open the guide page (no `?print=family`) and invoke print, or print an
     embedded full render. Downloads (`PDF ↓`) stay the condensed family cut — that
     difference is DELIBERATE and must survive.
   - Plain Ctrl+P on a guide page stays/becomes full content.
3. "Margins fit the whole page": the full-print rendering must use the sheet — verify
   the @page margins in the non-family path give edge-reasonable margins (the cream
   full-bleed + margin-box footer architecture must keep working; do NOT regress the
   s12 cover/footer system). If full-print type sizes currently inherit family-cut
   shrinking (10.5pt rules are `[data-print-mode="family"]`-scoped — confirm), plain
   print should render at the guide's normal print scale.

## Hard constraints

- The 31-PDF build/staleness system: if `guide-print.css` or any generator input
  changes, rebuild per the manifest flow and leave staleness green (0 stale / 0
  missing) — or prove your diff touches no manifest source. Never hand-edit generated
  artifacts. eol: guide-print.css is pinned LF by .gitattributes — keep it LF.
- Downloads stay condensed; guides.html cards are TRACK D's file — do not edit
  guides.html (if the fix needs a card-level change, STOP and report; the director
  coordinates).
- The other session owns these files day-to-day: minimal diff, flag everything.
- No pushes. `[s19/guide-full-print]`, explicit paths, Opus co-author.

## Verify (verbatim)

- The reproduce matrix (before) and the same matrix after: viewer print = full content
  (drop-section probe PRESENT, page count > condensed), download = condensed
  (probe ABSENT), Ctrl+P full.
- `npm test` full counts (guide gates included — verify_guide_pages, family-type,
  staleness all green); `npm run check` 8/0 (index untouched).
- Rasterized first pages of one guide in both modes attached
  (`scratch/s19-e-renders/`).
