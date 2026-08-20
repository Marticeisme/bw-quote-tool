# Track B — s24/voice-location-guides

You are a rewrite track for sprint-24 of the BW Quote Tool. Obey
`ops/SPRINT_GUIDELINES.md` and `ops/DESIGN.md`. Repo root:
`C:\Users\Martice\bw-quote-tool`; you work in the worktree the director created at
`..\bw-quote-tool-s24b` on branch `s24/voice-location-guides`. FIRST ACTION: verify your
worktree base — `git -C <worktree> log -1 --oneline` must match the repo's local `main`
tip; if not, STOP and reset to local main (the stale-base scar has hit four sprints).
The worktree's `node_modules` is a junction the director made; verify `npm test` can
start before editing.

## Your guides (14)

ecl-guide.html, glass-front-niches-guide.html, gomn-guide.html,
granite-niches-guide.html, mvc-niches-guide.html, roac-guide.html,
terrace-garden-guide.html, urn-gardens-guide.html, terramation-guide.html,
markers-guide.html, bronze-markers-guide.html, vault-guide.html,
outside-marker-rules.html, flush-markers.html.

Note: vault-guide.html and outside-marker-rules.html are Tier 1 offenders in the voice
debrief (manufacturer-brochure voice / compliance-memo voice) — they get the DEEPER
treatment the debrief prescribes for them, not the light touch. The style doc's §7
carries a rewritten opening for each.

## The task

Apply `docs/GUIDE_STYLE_2026-08.md` (this sprint's researched style reference — read it
in full first) and `docs/GUIDES_VOICE_DEBRIEF_2026-08.md` (the operator's BINDING voice
rules — the hard filter over everything) to each guide. Depth per the operator's ruling:
**openings + weak passages, not a full rewrite.**

Per guide:
1. **Rewrite the opening** (the first prose the family reads after the title/hero) per
   the style doc's "opening moves" section. The banned-opener class: any opening that
   editorializes about the guide itself, ranks its own importance, or tells the reader
   how wrong most families are, before saying anything useful (the operator rejected
   the pattern explicitly, live example in cemetery-property-guide.html — Track A's
   file, cited here so you recognize the class). Open with the useful thing itself.
   Note: many of your guides already open with a concrete physical description of the
   place — that register is CORRECT; improve cadence, don't replace the move.
2. **Fix the weakest passages** — meta-commentary hooks used as drama ("the one
   thing…", "this changes everything"), stiff or brochure-flavored sentences, choppy
   transitions, spec-sheet monotony (several location guides read as a run of same-
   length declarative sentences; the style doc's cadence section addresses this).
   Rewrite only what's weak; leave strong prose alone.
3. **Change no facts.** Prices, dimensions, niche counts, wall letters, availability,
   section structure, ids, data-* attributes (including data-rights spans and other
   gate-pinned markup), print annotations and family-PDF cut markers all stay. The
   gates pin some of this markup — verify_guide_pages and verify_family_type will
   catch you if a pinned span is lost. If a fact reads wrong, flag it in your report;
   never "fix" it.

## Hard voice rules (from the debrief — violations fail audit)

First person as Martice; contractions; short plain sentences; NEVER em dashes (also
check you don't introduce `&mdash;` — roac/scattering currently carry legacy ones your
sweep should remove where they sit in YOUR files); NEVER "inventory", "counselor",
"deeply personal decision"; no stacked adjectives; no marketing/brochure copy; "family
service director" is the title. Would Martice say it to a family at his table? If not,
rewrite.

## Mechanics & scars

- CRLF line endings; a multi-line `\n` match in a script silently fails.
- Targeted Edit calls, never whole-file rewrites.
- After prose edits, REBUILD your guides' PDFs (`node scripts/build_guide_pdfs.mjs` —
  check its per-guide invocation; the static-PDF trap means unbuilt downloads go stale)
  and confirm each stays within its page cap (granite 8, bronze 5, inman 4; others per
  the manifest).
- index.html is byte-untouched: record `sha256` before you start, assert unchanged in
  your report.
- Commits: explicit paths only, `[s24/voice-location-guides]` tag, NO AI co-author
  trailer (standing operator rule 2026-08-08 overrides the stale line in
  SPRINT_GUIDELINES). Do NOT push. Never touch main.

## Gates (quote verbatim output in your report)

- `npm run check` → `index.html: 8 blocks, 0 errors`
- `npm test` → `3063 passed, 0 failed across 46 suites` (prose edits change no assert
  counts; any drift = stop and diagnose, never re-pin yourself)
- `node scripts/verify_family_type.mjs` and `node scripts/verify_guide_pages.mjs` → green
- Rebuilt PDF page counts per guide, before vs after.
- Render each rewritten opening (Playwright headless, repo-root node) to
  `scratch/s24-b-renders/` for the operator's eyeball.

## Report

Per guide: old opening (verbatim) → new opening (verbatim); list of weak passages
rewritten; facts flagged; gate outputs verbatim; branch + commits; index.html sha256
before/after; open questions.
