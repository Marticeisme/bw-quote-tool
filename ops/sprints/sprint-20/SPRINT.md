# Sprint-20 — dashboard.html redesign (full brief) + Pending Service status

**Opened 2026-08-06.** Director: Fable session. Tracks: Opus (operator's word).
Target: `dashboard.html` ONLY (2,565 lines at open, standalone, no build step).
**Do not touch `index.html`, the contract generators, or any Firebase write path.**

## Sources (pinned)

- `REDESIGN_BRIEF.md` (this folder) — the governing spec. Where anything conflicts, it wins.
- `CASE_DETAIL_MOCKUP.dc.html` (this folder) — the case-detail (2c) mockup as HTML.
- Mockup PNGs: `scratch/s20-mockups/` in the main tree (operator-local, NOT committed) —
  `1 - Martice view (light).png`, `2 - Chloe view (light).png`, `3 - Chloe view (dark mode).png`.
- `DESIGN_REFRESH.md` referenced by the brief DOES NOT EXIST anywhere findable —
  deviation logged; the brief's §6 "carried over from the audit" list governs instead.

## Operator rulings at open

1. **"Pending Service" status is Chloe-only** (hidden when viewing as Martice, mirroring
   how Pending Marker Order hides for Chloe). Ordered after 'Pending Docs'. SHIPPED as
   wave 0, director-direct, verified 13/13 (scratch/s20-wave0-verify.mjs). The redesign's
   pill map (brief §2) MUST carry a Pending Service row — Track B defines its token pair.
2. Full brief, all 8 phases, this sprint.
3. No push pre-authorization.

## Waves (sequential — one file, one track at a time, each based on prior merged main)

| Wave | Track | Brief phases | Branch |
|---|---|---|---|
| 0 | director-direct | Pending Service status (old UI) | main (done) |
| 1 | A shell-foundations | 1 + 2 (+ icon sprite subset, switchTab data-tab fix, sync-banner removal) | s20/shell |
| 2 | B table-views | 3 + 4 (Martice/Chloe/All columns, per-user stats+tabs, pill map incl. Pending Service) | s20/tables |
| 3 | C case-detail | 5 + 6 (detail screen replaces accordion, grouped collapsible checklist) | s20/detail |
| 4 | D polish-a11y | 7 + 8 (full emoji→SVG sweep, styles-out-of-JS for the non-case tabs, modals/focus/motion/print) | s20/polish |

Merge order = wave order, `--no-ff`. Never spawn wave N+1 before wave N is merged and
green. Each track works in a worktree (`../bw-quote-tool-s20<letter>`) because another
session shares the main working tree.

## Verification contract

- `node -e` syntax check for **dashboard.html** (2 blocks, 0 errors at open) AND the
  standard index.html check (8 blocks, 0 errors) — index.html must be byte-untouched.
- Playwright headless, repo root, at **1440px and 1280px, both themes**:
  Firebase BLOCKED (`page.route(/firebase|gstatic|googleapis/i, abort)`), data seeded
  via localStorage `bw:cases4` — pattern in `scratch/s20-wave0-verify.mjs`. Screenshots
  saved to `scratch/s20-<track>-renders/` for the director's eyeball.
- **NEVER call save()/pushToFirebase()/quickStatus() against an unblocked page. The
  `dashboard` Firebase node is live production data.** Test scripts read only.
- npm test (2598/40 at s19 close) must be unmoved — no suite reads dashboard.html.

## Do not change (brief §8, verbatim force)

Five sections + names (Cases, Tasks, Meals, Calendar, School); CASE_STATUSES strings
(now WITH 'Pending Service'); case types/dispositions/service types; CHLOE_CHECKLISTS +
MARTICE_CHECKLISTS; new-case wizard branching; payment methods/statuses; Firebase paths
+ `dashboard` node shape; percentage-and-bar progress indicator (it gets bigger).

## Close checklist

- All four waves merged, both syntax checks green, npm test unmoved.
- Director eyeballs renders from every wave in both themes.
- Brief §9 "done when" walked item by item.
- Operator gate: eyeball, then push word.
