# TRACK B — table card + the two per-user views (brief phases 3–4)

Autonomous track agent. Obey `ops/SPRINT_GUIDELINES.md`. Worktree
`C:\Users\Martice\bw-quote-tool-s20b`, branch `s20/tables`, based on main AFTER Track A
merged (stale-base check: your HEAD must contain Track A's merge commit — the director
gives you the hash; verify with `git -C <worktree> log --oneline -5`). Always `git -C`.
Junction node_modules from the main tree. Commit locally, never push.

## Read first

REDESIGN_BRIEF.md §3 (table card), §4 (the two views — the heart of the sprint), §2
(status pills, owner avatars); SPRINT.md (verification contract, do-not-change);
mockups 1 + 2 + 3 in `scratch/s20-mockups/`; Track A's merged shell code.

## Scope

- Replace the case-card accordion LIST with the §3 table card: filter row (pill tabs +
  current sort), eyebrow column header row, clickable rows, grid
  `2.25fr 1.45fr 1.75fr 1.3fr 1.3fr 158px` (status track sized for 'Pending Marker
  Order' — do not narrow).
- **Martice view** per §4: Type / Status / Interment / Follow-up / Packet-complete
  columns, urgency sort via existing `urgencyScore()`, stats (Waiting on a call ·
  Quotes out · Packets to submit) with context notes, tabs All · Needs a call ·
  Quotes out · Confirmed sales · Work orders.
- **Chloe view** per §4: Disposition / Status / Service / Certificates-&-permits /
  Checklist-complete, service-date sort (undated last), stats (Services this week ·
  Certificates pending · Items due today), tabs All · This week · Awaiting permits ·
  Cremation · Burial. Certificates column derives from the 'Death Certificates &
  Permits' checklist group (last completed or first incomplete, whichever reads better).
- **All view**: Case · Owner · Type/Disposition · Status · Date · Checklist.
- Status pills: replace `SC` with the §2 token-pair map. **Add a 'Pending Service' row
  (Chloe-only status, shipped wave 0): pick a soft bg/fg pair distinct from Pending
  Payment's green and Pending Family's amber in both themes — a rose/plum family fits;
  document your pair in the report.** `TYPE_COLORS`/`caseTypeColor` go away — type is
  plain text.
- Owner avatar tiles per §2 (two-letter initials, 34×34, r11).
- Checklist cell: 17px/800 percentage + count + 7px bar, `--ok` at 100%, N/A excluded
  from denominator exactly as today.
- Row click opens the case (modal edit for now — Track C builds the detail screen;
  leave a single `openCase(id)` seam for C to retarget).
- Chloe-only visibility rules carry over: 'Pending Marker Order' never shows in her
  view/tabs; 'Pending Service' never shows in Martice's. The 'All' view shows both.
- No money/value/pipeline column anywhere. No emoji in anything you build.

## Hard constraints

dashboard.html only; index.html byte-untouched; CASE_STATUSES strings/checklists/wizard/
Firebase paths unchanged; **Playwright blocks `/firebase|gstatic|googleapis/i`, seeds
localStorage, read-only** — production data lives behind save().

## Verification

1. Both syntax checks. 2. `scratch/s20-b-verify.mjs`: per-view column headers exact,
sort orders proven with seeded dates, each stat note non-bare, tab filters filter,
pill map covers all 8 statuses in both themes, Pending Service chip/pill Chloe-only,
PMO hidden for Chloe, percentage math with N/A items, 'value' absent from rendered UI.
3. Screenshots: Martice/Chloe/All × light/dark × 1440/1280 → `scratch/s20-b-renders/`
(main tree). 4. npm test unmoved.

## Report

Numbers, the Pending Service pill pair you chose, seams left for Track C, commit hash.
