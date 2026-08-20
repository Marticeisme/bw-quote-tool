# Track A — s24/voice-decision-guides

You are a rewrite track for sprint-24 of the BW Quote Tool. Obey
`ops/SPRINT_GUIDELINES.md` and `ops/DESIGN.md`. Repo root:
`C:\Users\Martice\bw-quote-tool`; you work in the worktree the director created at
`..\bw-quote-tool-s24a` on branch `s24/voice-decision-guides`. FIRST ACTION: verify your
worktree base — `git -C <worktree> log -1 --oneline` must match the repo's local `main`
tip; if not, STOP and reset to local main (the stale-base scar has hit four sprints).
The worktree's `node_modules` is a junction the director made; verify `npm test` can
start before editing.

## Your guides (12)

burial-guide.html, cremation-guide.html, cremation-or-burial-guide.html,
pre-planning-guide.html, who-decides-guide.html, veterans-guide.html,
medicaid-family-guide.html, cemetery-property-guide.html, inman-travel-plan-guide.html,
urn-placement-guide.html, scattering-guide.html, direct-cremation.html.

Note: direct-cremation.html and (Track B's) outside-marker-rules.html are Tier 1/2
offenders in the voice debrief — they get the DEEPER treatment the debrief prescribes
for them, not the light touch. urn-placement and scattering are Tier 1 rewrites per the
debrief too: their "weak passages" are most of the guide, and the debrief's per-guide
notes govern.

## The task

Apply `docs/GUIDE_STYLE_2026-08.md` (this sprint's researched style reference — read it
in full first) and `docs/GUIDES_VOICE_DEBRIEF_2026-08.md` (the operator's BINDING voice
rules — the hard filter over everything) to each guide. Depth per the operator's ruling:
**openings + weak passages, not a full rewrite.**

Per guide:
1. **Rewrite the opening** (the first prose the family reads after the title/hero) per
   the style doc's "opening moves" section. The banned-opener class is defined there;
   `cemetery-property-guide.html` carries the named live instance ("This is the thing
   families most often have wrong, and it shapes nearly everything else in this guide.")
   — the operator rejected this pattern explicitly. No opening may editorialize about
   the guide itself, rank its own importance, or tell the reader how wrong most
   families are. Open with the useful thing itself.
2. **Fix the weakest passages** — sweep the guide for meta-commentary hooks anywhere
   ("the one thing…", "what most families don't realize…", "this changes everything"
   used as drama rather than fact), stiff or brochure-flavored sentences, and choppy
   transitions. Rewrite only what's weak; leave strong prose alone. Gold-standard
   guides (medicaid, who-decides, cemetery-property, cremation-or-burial, burial,
   veterans, pre-planning per the debrief) get a LIGHT touch: opening + genuine
   weak spots only.
3. **Change no facts.** Prices, statutes, procedures, names, phone numbers, section
   structure, ids, data-* attributes, print annotations (data-pdf/data-print-*) and
   the family-PDF cut markers all stay. If a fact reads wrong, flag it in your report;
   never "fix" it.

## Hard voice rules (from the debrief — violations fail audit)

First person as Martice; contractions; short plain sentences; NEVER em dashes (also
check you don't introduce `&mdash;`); NEVER "inventory", "counselor", "deeply personal
decision"; no stacked adjectives; no marketing/brochure copy; "family service director"
is the title. Would Martice say it to a family at his table? If not, rewrite.

## Mechanics & scars

- CRLF line endings; a multi-line `\n` match in a script silently fails.
- Targeted Edit calls, never whole-file rewrites.
- After prose edits, REBUILD your guides' PDFs (`node scripts/build_guide_pdfs.mjs` —
  check its per-guide invocation; the static-PDF trap means unbuilt downloads go stale)
  and confirm each stays within its page cap.
- index.html is byte-untouched: record `sha256` before you start, assert unchanged in
  your report.
- Commits: explicit paths only, `[s24/voice-decision-guides]` tag, NO AI co-author
  trailer (standing operator rule 2026-08-08 overrides the stale line in
  SPRINT_GUIDELINES). Do NOT push. Never touch main.

## Gates (quote verbatim output in your report)

- `npm run check` → `index.html: 8 blocks, 0 errors`
- `npm test` → `3063 passed, 0 failed across 46 suites` (prose edits change no assert
  counts; any drift = stop and diagnose, never re-pin yourself)
- `node scripts/verify_family_type.mjs` and `node scripts/verify_guide_pages.mjs` → green
- Rebuilt PDF page counts per guide, before vs after.
- Render each rewritten opening (Playwright headless, repo-root node) to
  `scratch/s24-a-renders/` for the operator's eyeball.

## Report

Per guide: old opening (verbatim) → new opening (verbatim); list of weak passages
rewritten; facts flagged; gate outputs verbatim; branch + commits; index.html sha256
before/after; open questions.
