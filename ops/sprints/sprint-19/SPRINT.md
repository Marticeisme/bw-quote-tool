# Sprint 19 — UI refresh: quote-tool chrome + family resources

**Opened:** 2026-08-06. Director: Fable session (same session that ran the research
phase). Tracks: **Opus** (operator's word + standing model policy).

## Goal

Implement the Claude-Design direction (`DESIGN_HANDOFF.md`, in this folder — verbatim
token/value fidelity) across index.html and guides.html, plus one operator-added fix:
in-HTML/viewer printing of family guides must produce the FULL guide at full-page
margins (downloads stay condensed). **Colors and logos stay BW brand; the family quote
print/PDF pipeline is sealed** (`_printQuoteCSS`, `_FQ*`, `_buildQuotePDF` untouched).

Operator decisions on record (2026-08-06):
- Summary panel primary = **Download PDF** (orange); Save = secondary.
- **Contracted status auto-stamps** when a RIC/CIRGAS is generated from a saved quote.
- Greenlit as a sprint; nothing pushes without his word (standing rule anyway).

## Gate 0 (before tracks)

- Contract re-measured on clean main 2026-08-06: **`2501 passed, 0 failed across 38
  suites`** — this is the pinned number for every s19 track (supersedes 2461/37 and
  2492/38 per the s18 STATE note). `npm run check` → 8 blocks, 0 errors.
- 8 blocks / 0 errors on main. Main == origin/main.
- Working tree carries three untracked docs/ research files (this session's) — fine;
  tracks stage explicit paths only.

## Tracks

| Track | Branch | Files | Scope |
|---|---|---|---|
| **A chrome-tokens** | `s19/chrome-tokens` | index.html only | Handoff steps 1–3: token block + palette unification (three drifted palettes → official ramp), summary panel, button ranks. |
| **D guides-refresh** | `s19/guides-refresh` | guides.html only | Handoff step 6: shared tokens + warm skin, whole-card link, quiet CTA that oranges on hover, PDF chip, category pills, no translateY. |
| **B panel-headers** | `s19/panel-headers` | index.html only | Handoff step 4: 44px headers, no icon chips, persistent value summaries, control styles, the ~226 inline-style audit. |
| **E guide-full-print** | `s19/guide-full-print` | viewer.html, guide-print.css, *-guide.html (minimal) | Operator fix: printing from the open guide (incl. the viewer's Print button) = FULL guide content, margins using the whole page. PDF downloads stay the condensed family cut. If guide-print.css changes, the 31-PDF manifest/staleness system must stay green (rebuild or prove untouched). |
| **C saved-lists** | `s19/saved-lists` | index.html only | Handoff step 5: saved rows, three derived status pills (Draft / With family / Contracted), empty states. Status stamping is ADDITIVE fields only (`exportedAt`, `contractedAt` or equiv.) written through the existing save path — **no changes to persistSavedQuotes / no test-script writes to Firebase, ever.** Old quotes without fields render Draft. |

**Parallelism (cap 2):** wave 1 = A ∥ D (different files, worktrees). Wave 2 = B ∥ E
(B branches from post-A main; E is guides-side). Wave 3 = C (branches from post-B main;
same-file sequential).

**Merge order:** A → D → B → E → C, `--no-ff`, contract green on main after each.

## Track-global rules

- Read `ops/SPRINT_GUIDELINES.md` + `ops/DESIGN.md` + this folder's `DESIGN_HANDOFF.md`.
- Verbatim fidelity to the handoff's values; its "Untouched throughout" list is law:
  `_printQuoteCSS`, `_FQ*`, `_buildQuotePDF`, 264px sidebar, 260/292px summary
  coupling, `.section{display:none}` switching.
- index.html is CRLF, `</body>` appears in template strings (use lastIndexOf), edit
  with targeted Edit calls or scripts — never whole-file rewrites.
- Stale-base check FIRST: worktree must branch from local main's HEAD, not origin/main.
- Playwright before/after screenshots of every touched view (repo-root scratch/,
  s19-<track>-renders/); rasterize a family quote PDF and byte/pixel-prove it unchanged
  where the track touches index.html.
- Verification contract per brief + `npm run check` 8/0 + full `npm test` (quote the
  counts; never overlap runs).

## Close gate (operator)

- Eyeball each view (before/after screenshot pairs provided).
- Rule on any flagged judgment calls in track reports.
- Push word (separate, explicit).
