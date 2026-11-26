# Planning Ahead ending: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the results screen + guide walk-through + close screen with: Let's go over your plan -> Did we miss anything? -> Here's what we'll do next, plus an FSD print sheet.

**Architecture:** All in `planning-ahead.html` (single-file app, no build). Screens are `cur.t` values rendered by
`render()`. Keep the screen id `yours` for the plan screen (every "Your plan"/qNext route already points at it),
add `missed`, and reuse `close` for the next-steps screen. Marks live in `A.marks` (visit only).

**Tech Stack:** vanilla JS/CSS in one HTML file; Playwright tests in `scratch/planning-ahead/*.mjs`.

**Spec:** docs/superpowers/specs/2026-11-25-planning-ahead-ending-design.md

## Global Constraints

- CRLF line endings; edit with node scripts / Edit tool, never `sed -i`. Syntax check (CLAUDE.md one-liner) after every task.
- His voice: first person, contractions, no em dashes; never a guessed pronoun (name / they); never "separate plans".
- No prices, no links or URLs on the print sheet. Nothing stored (A.marks cleared by Start over / Plan for someone else).
- Talking points state only facts already in the page's guides or his recorded rulings.
- Commit/push only on Martice's word.

## Review Focus

- Couple / both-parents visits: rows show each person's picks with initials; one shared mark per row.
- Funeral-only track: cemetery rows "Already taken care of" count as handled, no mark buttons.
- Nothing highlighted at all: every row dimmed "Not chosen yet", still markable, Back to the questions offered.
- Going Back from a guide opened off a row returns to the plan with marks intact.
- Print: only the sheet prints (no TV screen behind it), names typed during the visit appear on it.

---

### Task 1: Plan screen with marks (replaces yoursHTML)

**Files:** Modify `planning-ahead.html` (`fresh()`, `yoursHTML()`, `wheelSVG()`, `wire()`, CSS). Test: rewrite `scratch/planning-ahead/results.mjs`.

**Interfaces:**
- Produces: `planRows() -> [{id, side, label, why, per:[{i, items:[{b,g}], na}], g, auto:bool}]` (cemetery rows, funeral rows, then faith / vet / wishes when they apply); `markOf(id) -> 'done'|'think'|'no'|undefined`; `planCount() -> {done, total}`; `A.marks` object.
- Wheel: `wheelSVG(size, mini, marks)`; when `marks` is true a slice's center text is ✓ (done) / ? (think) / – (no).

- [ ] Test `results.mjs`: last Next lands on `yours`; >= 8 `.prow` rows; tapping `[data-mark="vault:done"]` sets it (aria-pressed) and the count text changes; second tap clears; tapping a row's guide opens it and Back returns with the mark kept; couple shows initials in rows; other-track headline uses the name ("Mom"); funeral track: cemetery rows have no mark buttons; empty plan offers `[data-go=resumeQs]`; "Still to decide" lists rows marked Still thinking; no `[data-go=pathStart]`.
- [ ] Run it: fails.
- [ ] Implement. Row guide when nothing chosen: property compare-place, oc oc-other, vault vault, memorial markers, service compare-service, touches tributes, casket caskets (urns for cremation-only), travel travel, vet veterans, wishes their-wishes, faith = the tradition's guide. Below the fold keep plain words / Also planned today, Still to decide, Go deeper in our guides (existing helpers). Primary button "Did we miss anything?" -> `missed`.
- [ ] Run: passes; syntax check.

### Task 2: "Did we miss anything?" and "Here's what we'll do next"

**Files:** Modify `planning-ahead.html` (`render()`, `go()`, new `missedHTML()`, `closeHTML()` rewritten). Test: `scratch/planning-ahead/ending.mjs` (new).

- [ ] Test: plan -> missed shows the five prompts (spec wording) and Back to the plan / Plan for someone else too / Here's what we'll do next; next shows 4 steps for a scratch-track plan with a place, step 1 absent on the funeral track, owners' step 1 says "your family's place"; Start over still needs two taps.
- [ ] Implement; steps copy from the spec.
- [ ] Run: passes; syntax check.

### Task 3: FSD print sheet

**Files:** Modify `planning-ahead.html` (`#sheet` element, `sheetHTML()`, `TALK` data, `@media print` CSS, `go('print')`). Test: add to `ending.mjs`.

- [ ] Test: `page.emulateMedia({media:'print'})` shows `#sheet` and hides `#stage`; sheet has a block per non-auto row with talking points; names typed are in the header; family pins print under "Loved ones already resting here"; no `http`, `bwquotetool`, or `$` in the sheet text.
- [ ] Implement `TALK = {property:{pts:[..], miss:'..', pull:'..'}, ...}` from guides/rulings only.
- [ ] Run: passes; syntax check.

### Task 4: Bring the old tests along

- [ ] Update walk2/4/7, tracks, back-walk, back-shots where they used `.rrow`, `pathStart`, the old close headline.
- [ ] Full suite + crop audit + 0 console errors; screenshots to Martice.
