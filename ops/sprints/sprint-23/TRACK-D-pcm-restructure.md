# TRACK D — s23/pcm-restructure (PCM catalog: two family-facing sections)

You are a track subagent in sprint-23 of the BW Quote Tool. Obey
`ops/SPRINT_GUIDELINES.md` and `ops/DESIGN.md` (read both first). Working
directory: worktree `C:\Users\Martice\bw-quote-tool-s23d` (already created,
branch `s23/pcm-restructure`, node_modules junctioned). ALWAYS
`git -C C:\Users\Martice\bw-quote-tool-s23d`. Commit locally; NEVER push. Stage
explicit paths only. You own: `scripts/build_pcm_catalog.py`,
`scripts/pcm_extract.py` (and/or a new override data file),
`pcm-design-catalog.html` (GENERATED — never hand-edit),
`scripts/verify_pcm_catalog.mjs`, `data/pcm-catalog.json` if regenerated. You do
NOT touch index.html, guides.html, or vital-worksheet.html.

**Stale-base check FIRST:** base commit `fbeefab7` or a descendant.

## Operator ruling (2026-08-15, supersedes the s21 two-proof-sections layout)

Families don't care which book a design came from. Restructure to TWO top-level
design sections:

1. **Single Marker Designs** — full-colour single proofs FIRST, then all
   single/individual book plates grouped by theme (Classic, Religious,
   Outdoors, Floral, Misc, Child, …).
2. **Companion Designs** — full-colour companion proofs FIRST, then all
   companion book plates grouped by theme (incl. companion ledgers).

Book identity (2020/2011) survives ONLY as the `#bookFilter` dropdown and the
detail-panel Book row. `sec-elements`, `sec-examples`, `sec-reference` stay as
they are, after the two design sections.

## The hard prerequisite: classify the 2020 book's 354 plates

`pcm_extract.py:258` assigns the 2020 book's `cat/sub` from aspect ratio only —
its companions are mixed into "Flat Markers". You must produce a real
single/companion classification for all 354 by LOOKING at each plate image
(the s21 by-looking method): a companion carries two name panels / two
given-name+date blocks; a single carries one. Ledger vs flat is already known
(`fmt`). Rules:

- Write the classification into a CHECKED-IN override file (e.g.
  `data/pcm-2020-family.json`: num → 'single'|'companion') that
  `pcm_extract.py` consumes — never bake judgments invisibly into the extractor.
- Uncertain plates (ambiguous art, single plate memorializing two people with
  one panel, etc.): list them in the report with your call and reasoning. If
  more than ~25 are genuinely ambiguous, STOP and report before building.
- The 2011 book already distinguishes (CAT_2011 regex, pcm_extract.py:265;
  `fmt` 281–282; the 130-companion ruling — 124 fmt=companion + 6 companion
  ledgers, verify_pcm_catalog.mjs:111–120). Preserve that census exactly: all
  130 must land in the Companion section.

## Builder restructure (`scripts/build_pcm_catalog.py`)

Everything below verified 2026-08-15:

- `GROUP_ORDER` 129–133 (the book split) → replace with the two-section theme
  axis. The missing-pair guard at 1257–1259 stays (adapted).
- `PROOF_CLASSES` 50–55 + proof loop 1321–1344 + `PROSE` 1305–1320: proofs
  become the leading subsection INSIDE each new section rather than separate
  top-level sections.
- Page shell f-string 1430–1437 (+ groups at 1438), TOC `.contents` 1419–1426
  (new anchor set: Single, Companion, Elements, Examples, Reference — plus
  per-theme sub-anchors if it reads well), cover census 1385.
- Filters 1388–1417: `#bookFilter` KEEPS `['', '2020', '2011']` semantics for
  plates; decide and document what the two proof options become (proofs have no
  book — either keep 'single-proofs'/'companion-proofs' options as "proofs
  only" filters or fold into a new format filter; your call, log it).
  `#catFilter` (1402–1404) repopulates from the new axis. `#fmtFilter` stays.
- `design_facets()` 107–125 + chip emission 1075–1078: re-derive what
  "contributes a new word" means under the new sections; the group chip's
  6-companion-ledger job (comment 113–115) is superseded by real placement.
- Detail panel rows 1019 / `BOOK_LABELS` 1585: Book row stays for plates,
  DASH for proofs (631).
- `CROSS_LISTED` ('2011-2271' in both Religious and Outdoors,
  verify_pcm_catalog.mjs:97–99, pcm_extract.py:649): inside ONE Companion
  section this becomes a duplicate. RULING DELEGATED: keep it in ONE theme
  group (pick the better fit by looking at the plate; Religious was its
  original home) and record the change in report + gate comment. The
  `groupDupes` check (gate 266) must stay meaningful.
- Jump-precedence (gate 852–876: a number that is both proof and plate lands
  on the plate) — preserve the intent at the new structure.

## Gate rework (`scripts/verify_pcm_catalog.mjs`)

Re-pin, never delete intent (the s20 gate-maintenance scar: update the probe to
the same intent at the new surface):

- `wantOrder` 732–735 → the new section list/order.
- `panelBeforeBooks` 736–739 → per-section: proofs precede plates INSIDE each
  section (same 2026-08-07 ruling, new geometry).
- Group census loop 828–837, `bookOptions` 823–826, PROOF_CLASSES mirror 40–49
  + 742–760, CENSUS 88–92 (2020: 354, 2011: 346 — totals unchanged, split by
  your classification and pinned exactly), the 130-companion assertion 111–120
  (now: exactly 130 2011 companions + your pinned 2020 companion count in the
  Companion section), bothClasses 537.
- ADD: every plate appears in exactly ONE of the two sections; section totals
  sum to 700; the override file's nums all exist and cover exactly the 2020
  census.
- Sabotage-prove the reworked gate red/green at least twice (e.g. move one
  companion plate into Singles → named FAIL; restore → green). Quote both runs.

## Verify (verbatim outputs in report)

- Rebuild: `python scripts/pcm_extract.py --data` semantics unchanged for
  2011/elements/reference (byte-compare those data regions if practical), then
  `python scripts/build_pcm_catalog.py`.
- `node scripts/verify_pcm_catalog.mjs` green, BW_BASE-pinned to your OWN fresh
  server (own port; never stop a server you didn't start;
  served-tree-check.mjs before first assertion).
- `npm run check` (index untouched, still run) + `npm test` ≥ 2854, pinned.
- Playwright renders: both new section heads, one theme group per section, the
  detail panel for a 2020 companion plate, filter dropdowns open;
  search 'companion' behavior. Save to scratch/s23-d-renders/.
- Page weight: report the built page's size delta (restructure should be
  roughly neutral; flag anything > ±5%).

## Report format

Per SPRINT_GUIDELINES rule 8, plus: the 2020 classification census
(singles/companions/ambiguous counts + the ambiguous list), the CROSS_LISTED
ruling you made, filter-semantics decisions, gate sabotage proof, renders list.
