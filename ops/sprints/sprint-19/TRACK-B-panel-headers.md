# TRACK B — panel-headers (`s19/panel-headers`, index.html only; branches from post-A main)

Read first: `ops/SPRINT_GUIDELINES.md`, `ops/DESIGN.md`, `ops/sprints/sprint-19/SPRINT.md`,
`ops/sprints/sprint-19/DESIGN_HANDOFF.md` §2 (panel header + controls — VERBATIM),
`docs/UI_RESEARCH_2026-08-06.md` §1. Track A's tokens are already on main — use them.

## Mission

Handoff step 4 across ALL quote-builder panels (cem, fh, combined — 15+ `.q-panel`s):
44px header row; Lucide icon inline 16px `--navy-400` with NO chip fill behind it;
right-side persistent value summary (`.q-panel-sum`) that renders whether the panel is
open or collapsed — e.g. "Garden 19 · 1 space · $10,344", or "Not set" in `--navy-300`;
Tax-exempt/Taxable as `.q-tag` pills in the header; body padding `--s5`, row gap `--s3`;
control styles (36px inputs, `--ring` focus, readonly treatment, uppercase 11px labels).
Kill the 118/120 border-radius !important fight. This is also where the ~226 JS-set
inline styles get AUDITED: for each `.style.` write that fights the new CSS, either
migrate it to a class toggle or document it as compatible — list every one touched.

## The value-summary JS (the real work)

- One updater per panel, driven off the SAME state/recalc path that feeds the running
  total (find the recalc function(s) that update the summary panel; hook there — do NOT
  build a parallel state system).
- Summary content rule: the 1–3 most identifying facts + the panel's dollar
  contribution when it has one; "Not set" when empty. Keep strings short (truncate with
  ellipsis at ~40ch). Money via the app's existing formatter, tabular-nums class.
- Panels whose contribution is not cleanly derivable: ship "Not set"/item-count only
  and log the panel in the report rather than inventing numbers.

## Hard constraints

- Collapse behavior (`.q-panel.collapsed`, `.q-chev` rotation, click-to-collapse)
  keeps working; NO collapse animations (handoff motion rules: ≤120ms, color/border/
  shadow only, no transforms).
- Same sealed list as TRACK A (print/PDF/contract code, geometry couplings, data-lc).
- Steppers `.bw-stepper` restyle to tokens but their JS `on` toggling stays.
- CRLF, lastIndexOf, targeted edits, no pushes, `[s19/panel-headers]`, Opus co-author.

## Steps

1. Stale-base check against post-A main. node_modules.
2. BEFORE screenshots: each builder's full panel stack open+collapsed samples
   (`scratch/s19-b-renders/before/`).
3. Implement CSS + markup + updaters. 4. AFTER screenshots incl. a collapsed-all view
   showing value summaries. 5. Family-quote parity re-proof (as TRACK A step 6).

## Verify (verbatim)

`npm run check` 8/0; full `npm test` counts (must not fall); parity suite line; the
inline-style audit table (element/id → migrated-to-class | compatible | untouched);
zero-hit greps on `_fq|_printQuote|_buildQuote` in the diff.
