# TRACK A — shell + foundations (brief phases 1–2)

You are an autonomous track agent. Obey `ops/SPRINT_GUIDELINES.md`. Your worktree is
`C:\Users\Martice\bw-quote-tool-s20a`, branch `s20/shell`. ALWAYS
`git -C C:\Users\Martice\bw-quote-tool-s20a ...` — never bare git. Commit locally; NEVER
push. **Stale-base check first:** `git -C <worktree> merge-base --is-ancestor main HEAD`
equivalent — your branch tip must contain main's tip commit; if not, reset onto main.
Junction node_modules: `cmd /c mklink /J <worktree>\node_modules C:\Users\Martice\bw-quote-tool\node_modules`.

## Read first

1. `ops/sprints/sprint-20/REDESIGN_BRIEF.md` — §2 Foundations, §3 Shell, §6, §8. It governs.
2. `ops/sprints/sprint-20/SPRINT.md` — verification contract + do-not-change list.
3. Mockup PNGs at `C:\Users\Martice\bw-quote-tool\scratch\s20-mockups\` (all three).
4. `dashboard.html` — the whole file is in scope for you to understand; edit only what
   your phases need.

## Scope — phases 1 and 2, shippable alone

**Phase 1 — tokens + theme:**
- Add the brief §2 token block verbatim (`:root` light + `html[data-theme="dark"]`).
- Light is the DEFAULT. Delete the entire `body.light-mode` block (~45 rules, lines
  ~194–240) and the `filter:invert(.6)` calendar-icon hack.
- `<head>` script sets `data-theme` before the stylesheet from localStorage falling back
  to `prefers-color-scheme`; add `<meta name="color-scheme" content="light dark">`.
- Rewire `toggleDashMode()` to flip `data-theme` + persist. Old dark-first CSS variables:
  repoint the existing var names to the new semantic tokens where components still read
  them (the s19 lesson: repoint, don't delete, until every consumer migrates).
- Typeface: Plus Jakarta Sans per §2 (Google Fonts link), remove other font families.
  `font-variant-numeric: tabular-nums` on numeric UI. Type scale per §2's table.

**Phase 2 — shell:**
- Delete the `<header>` element + tab strip; build the 240px sidebar per §3: brand block
  ("MF" tile + "Morrison Frink"), five nav items (Cases, Tasks, Meals, Calendar, School —
  names unchanged) with icon + label + count, bottom block with "Viewing" eyebrow +
  three-way user switcher segmented control + dark-mode toggle row.
- Page header: 26px/800 title + subtitle line, 200px search, primary `New case` button.
- Stat row: three cards, icon tile + label + 28px value + context note. EVERY note
  carries context (brief §3) — wire real numbers from the existing data (overdue days
  via the existing reminder logic). Per-user stat DEFINITIONS land in Track B; for now
  render the three cards with sensible shared stats (cases needing a call / services
  this week / items due) so the shell is complete — Track B swaps the definitions.
- `switchTab()` moves to `data-tab` attributes (no positional index).
- Remove the stale `sync-banner` + `showSyncHelp` UI (Firebase sync is automatic).
- Under 1100px: 64px icon rail. Desktop only, no mobile layout.
- Inline `<svg><symbol>` sprite at top of `<body>`, Lucide geometry, ONLY the icons your
  shell needs (folder, check-square, utensils, calendar, graduation-cap, search, plus,
  moon, sun, chevron-down + any you use). Track D finishes the sweep — leave other
  emoji alone unless they're inside elements you rebuild.
- The case LIST below the header may stay the old card accordion this wave (Tracks B/C
  rebuild it) — but it must still render and function against the new tokens.

## Hard constraints

- dashboard.html ONLY. index.html byte-untouched (`git status` must not show it).
- Do-not-change list in SPRINT.md §"Do not change".
- 'Pending Service' (Chloe-only, wave 0) must keep working: chips/quick-status/modal
  gating — your verify script asserts it (reuse `scratch/s20-wave0-verify.mjs` asserts).
- **Firebase is production. Playwright must block `/firebase|gstatic|googleapis/i` and
  never trigger save paths.** Read-only tests.

## Verification (all green before you report)

1. Both syntax checks (dashboard 2 blocks 0 errors — count may grow if you add a script
   block, report the number; index.html 8 blocks 0 errors).
2. A `scratch/s20-a-verify.mjs` Playwright script (pattern: s20-wave0-verify.mjs):
   sidebar exists with 5 nav items + counts, header/tab-strip GONE, `data-theme`
   defaulting light, toggle flips + persists, `body.light-mode` selector absent from
   the stylesheet, no `<header>` element, search + New case present, 3 stat cards each
   with a non-bare-number note, switchTab works by data-tab for all five panels,
   wave-0 Pending Service asserts still green.
3. Screenshots at 1440 + 1280, light + dark, Cases tab + one other tab →
   `scratch/s20-a-renders/` (in the MAIN tree so the director sees them).
4. npm test in the worktree: same pass/fail as main (document the known
   test-contact-csv worktree −2 variance if it appears).

## Report

Numbers, deviations, anything the brief got wrong about the file, commit hash. Your
final message is the audit input — claims will be re-verified.
