# TRACK D — guides-refresh (`s19/guides-refresh`, guides.html only)

Read first: `ops/SPRINT_GUIDELINES.md`, `ops/DESIGN.md`, `ops/sprints/sprint-19/SPRINT.md`,
`ops/sprints/sprint-19/DESIGN_HANDOFF.md` (spec — VERBATIM values, §5 guide cards +
token block), `docs/UI_RESEARCH_2026-08-06.md` §1 (guides.html map: styles lines 8–86,
cards 50–60, filter script 476–504).

## Mission

Handoff step 6 on guides.html: adopt the shared token block + warm-skin override
(`--paper:#f4efe6` etc. — the page KEEPS its Cormorant serif, paper ground, warm
borders); palette moves off `#3d5a7a`/`#c8540a`/`#2c445e` onto the ramp
(`--navy-900` chrome, `--navy-500` links); cards per the 1:1 mockup: whole card =
link, "Open guide →" quiet `--navy-500` turning `--orange` on card hover (orange on
exactly one card at a time), PDF as bordered chip, category pill top-left + existing
meta top-right, hover = border+shadow only (NO translateY), 120ms transitions.

## Hard constraints

- The filter script toggles `card.style.display` and checks `!== 'none'` — keep
  `.guide-card` display semantics compatible and don't inline-set display in markup.
- `_hay` search text builds from `data-name` + textContent — adding a category pill
  changes card text; verify search still matches what it used to (spot-check
  "cremation", "map", "marker" queries) and that pill text doesn't pollute matches
  wrongly (if it does, exclude it from _hay or accept+document).
- Cat-count pills in section headers are hand-maintained — don't touch counts.
- Making the whole card a link must not break the inner PDF anchor (nested-anchor is
  invalid HTML — use a stretched-link pattern or JS card click, PDF chip stopPropagation).
- Print rules (lines 80–85) keep working: cards break-inside avoid, header hidden.
- The other session works these files — keep the diff minimal and flagged; guides.html
  only, no *-guide.html edits.
- No pushes. `[s19/guides-refresh]` commits, explicit paths, Opus co-author.

## Steps

1. Stale-base check (as TRACK A). node_modules junction.
2. BEFORE screenshots: guides top, one category grid, one card hover state, print
   emulation of the grid → `scratch/s19-d-renders/before/`.
3. Implement. 4. AFTER screenshots. 5. Verify.

## Verify (verbatim)

- `node scripts/verify_guides_page.mjs` (or the gate npm test runs — find it by
  grepping package.json/tests for guides-page; quote its counts) — card count must be
  unchanged.
- Full `npm test` counts + `npm run check` (index.html untouched → still 8/0).
- Search spot-checks (3 queries, result counts before vs after).
- Screenshot pair listing.

## Report

Standard format per SPRINT_GUIDELINES §8.
