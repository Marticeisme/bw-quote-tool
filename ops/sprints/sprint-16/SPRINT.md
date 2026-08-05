# Sprint 16 — condensed family PDFs, Track 1: mechanism + Cemetery Property

**Opened 2026-08-04.** Source: the design review's handoff (E:\Downloads\HANDOFF.md),
now in-repo as docs/PDF_DEBRIEF.md + docs/PDF_AUDIT.md, with the rendered reference at
reference-docs/cemetery-property-condensed.pdf. Operator: "Don't sweep all 25 at once.
Build the mechanism and convert one guide — Cemetery Property, to match the reference —
then [I] look at the actual PDF before 24 more get built to the same pattern."

## Track A `s16/condensed-pdf-mechanism` (Opus, worktree)

The handoff's paste-ready prompt, verbatim scope: extend `?part=`'s script to also set
`data-print-mode` from `?print=`; add the `[data-print-mode="family"]` selection rules +
`.pdf-summary` convention to guide-print.css per the debrief; annotate
cemetery-property-guide.html with data-pdf="keep|drop|summary" per the audit row; register
`cemetery-property-guide.html?print=family` in build_guide_pdfs.mjs (replacing that
guide's existing job per the debrief's example — flipping to a side-by-side "short
version" is the operator's open decision 2); build, rasterize, compare to the reference.
No other guides, no screen-rendering changes.

## Operator gate after the track

Martice reads the built PDF on his phone (handoff step 3) and rules on: (1) ranges for
ground burial + mausoleum crypts, (2) replace vs sit-beside on guides.html, (3) the five
8-page area guides. Tiers 1-3 + the verify_guide_pages lock-in assertions come AFTER his
approval, one prompt per tier.

## Gates

Full guide verifier set + npm suite green; page count 2; measured body ≥10.5pt; no
column-count in the family mode; rasterized pages eyeballed against the reference.
NO PUSH without the operator's word.
