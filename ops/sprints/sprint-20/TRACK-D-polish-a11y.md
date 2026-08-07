# TRACK D — icons, modals, focus, motion, print (brief phases 7–8)

Autonomous track agent. Obey `ops/SPRINT_GUIDELINES.md`. Worktree
`C:\Users\Martice\bw-quote-tool-s20d`, branch `s20/polish`, based on main AFTER Track C
merged (director gives the hash; stale-base check first). Always `git -C`. Junction
node_modules. Commit locally, never push.

## Read first

REDESIGN_BRIEF.md §2 (icons), §6 (the audit carry-overs — your checklist); SPRINT.md;
the merged A+B+C code.

## Scope

- **Icon sweep:** every remaining emoji out of the rendered UI — wizard disposition
  buttons, meal grid, due banner, Tasks/Calendar/School, empty states, toasts. Extend
  Track A's sprite (Lucide geometry) with what you need (§2 lists the full set). No
  emoji anywhere in rendered output when you're done.
- **Styles out of JS:** `renderCalendar`, `renderSchool`, `renderMeals`,
  `renderRecipeLibrary`, `renderDueBanner` (+ whatever survives of case rendering)
  emit no inline `style=` with baked hex/font values — promote to classes; data-driven
  color rides a `--pill` custom property only. These four tabs also need to actually
  READ the new tokens so both themes work (they were dark-hex-baked).
- Delete the `FONT / SPACING IMPROVEMENTS` override block — fold into base rules.
- **Modals:** sticky header/footer, scrolling body, `min(880px,94vw)`, Escape closes,
  focus trap, `role="dialog"` — the CIRGAS form's Save button must be reachable
  without scrolling it out of view.
- **Focus:** `:focus-visible` styles everywhere; remove every `outline:none` that
  lacks a replacement. Tab through the whole app in both themes.
- **Motion:** named transition properties (no `transition:all`); honor
  `prefers-reduced-motion`.
- **Print:** scope the print rule to `body > *:not(#printArea)`; printCase output
  still prints correctly.
- Nothing below 11px, no monospace, `text-wrap:pretty` on note/remark blocks.

## Hard constraints

dashboard.html only; index.html byte-untouched; Playwright read-only, Firebase blocked;
wizard branching/checklists/statuses/Firebase paths unchanged.

## Verification

1. Both syntax checks. 2. `scratch/s20-d-verify.mjs`: regex over rendered DOM of all
five tabs for emoji ranges → zero; the five render functions' output carries no
`style="...#`hex; CIRGAS modal opened at 800px viewport height → Save button visible
without body scroll + Escape closes + focus stays trapped; `:focus-visible` rule count
> 0 and first Tab stop visibly ringed (screenshot); `transition:all` absent;
reduced-motion media block present; print rule scoped. 3. Screenshots: all five tabs ×
light/dark at 1440 + the CIRGAS modal + a focus-ring shot → `scratch/s20-d-renders/`
(main tree). 4. npm test unmoved. 5. Walk brief §9's done-when list and report each item.

## Report

Numbers, §9 item-by-item status, anything left undone, commit hash.
