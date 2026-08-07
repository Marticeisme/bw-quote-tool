# TRACK C — case detail screen + grouped checklist (brief phases 5–6)

Autonomous track agent. Obey `ops/SPRINT_GUIDELINES.md`. Worktree
`C:\Users\Martice\bw-quote-tool-s20c`, branch `s20/detail`, based on main AFTER Track B
merged (director gives the hash; stale-base check first). Always `git -C`. Junction
node_modules. Commit locally, never push.

## Read first

REDESIGN_BRIEF.md §5 (case detail), §2; **`ops/sprints/sprint-20/CASE_DETAIL_MOCKUP.dc.html`
— open it in Playwright and LOOK at the 2c mockup; it is the visual truth for this
track**; SPRINT.md; Tracks A+B merged code (the `openCase(id)` seam B left you).

## Scope

- Case detail as its own SCREEN (sidebar stays; no modal, no accordion): breadcrumb,
  identity row (52×52 avatar, 28px/800 name, type + status pill, Print / Edit /
  Log-a-touchpoint actions), alert band ONLY when genuinely blocking (replaces
  smart-alert), four-up stat strip (Service · blocking dimension per owner ·
  Last touchpoint · Case number), contact strip, then 1.25fr/1fr checklist + touchpoints.
- Checklist per §5: groups as bordered blocks, **collapsed by default, ONE auto-open —
  the first incomplete blocking group** (Chloe: usually Death Certificates & Permits;
  Martice: Commission Packet). Group header: chevron, name, optional 'n N/A' note,
  64×5 bar, count. Items: 18×18 checkbox (`--ok` filled), strikethrough done, completion
  date, N/A button stays first-class and still adjusts the percentage.
- Touchpoints timeline per §5 (2px rule, newest accent) + composer.
- 'Edit' opens the EXISTING case modal (wizard untouched). 'Print' keeps working —
  printCase() output may be restyled but must still print the case.
- Toggling checks/N-A/touchpoints in the REAL app still calls the existing save path —
  do not add write sites; retarget the existing handlers into the new DOM.
- Delete `buildCaseCardHTML`'s accordion remnants ONLY if nothing else renders them;
  the old expandedCards state can go if unused after you land.
- Group names/item text/order from CHLOE_CHECKLISTS + MARTICE_CHECKLISTS unchanged.

## Hard constraints

dashboard.html only; index.html byte-untouched; **Playwright read-only, Firebase blocked**
(interaction tests click checkboxes — that fires save() → pushToFirebase(); it is safe
ONLY because the route-block aborts firebase; assert in your script that zero requests
escaped to any firebase host); checklists/wizard/Firebase node shape unchanged.

## Verification

1. Both syntax checks. 2. `scratch/s20-c-verify.mjs`: open a seeded 44-item Chloe
cremation case → exactly one group expanded, four collapsed each with bar; check an
item → percentage updates + localStorage reflects it + ZERO firebase requests escaped;
N/A excludes from denominator; alert band absent when nothing blocks, present when a
service is <48h with incomplete permits; breadcrumb navigates back; Edit opens the old
modal populated. 3. Screenshots: Chloe cremation + Martice RIC detail × light/dark ×
1440 → `scratch/s20-c-renders/` (main tree). 4. npm test unmoved.

## Report

Numbers, what you did with expandedCards/buildCaseCardHTML, deviations, commit hash.
