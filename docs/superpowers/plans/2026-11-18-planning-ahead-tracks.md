# Planning Ahead tracks: implementation plan

> For agentic workers: executed natively in session (Martice said "Yes, build it", 2026-11-18). Steps use checkboxes.

**Goal:** Open the presentation on "What brings you in today?" and run six tracks over the existing engine.
**Architecture:** One file, `planning-ahead.html`. A `TRACKS` table lists each track's step ids; `askable()` walks that list instead of `QUESTIONS` order. Non-question steps (`pins`, `tour`, `bridge`) are `QUESTIONS` entries with a `screen` field, so `nextFrom`, the dots and `A.seen` work unchanged.
**Tech:** vanilla JS, Playwright tests (main repo `node_modules`).
**Spec:** `docs/superpowers/specs/2026-11-17-planning-ahead-tracks-design.md`

## Global constraints
- CRLF after every edit. His voice, no em dashes. No prices. No drawn cemetery images. Pronouns: name, "your mom/dad/parents", or they/them.
- State lives only in `A` (`fresh()`); Start over clears it, including pins.

## Review focus
1. Switching track mid-visit keeps answers and resumes at the first unseen step (test: switch own → scratch).
2. Owner with cremation in an owned grave gets an urn vault, not a burial vault (test).
3. Couple where one owns and one picks "Nothing yet": only the second gets the place question (test).
4. Both parents: no "Does your parents", no "Both of you" (test titles).
5. Funeral track never shows cemetery guides in the walk-through (test path()).

## Tasks
- [ ] **1. Engine + opening.** State `track, before, parents, pins`; `TRACKS`; `askable()` from track; screens `t:'track'`, `t:'before'`; Home Begin → track; keys 1-6 on Home; top-bar "Change" button (`#bTrack`); remove "Go straight to the questions". Cemetery-first order in `path()` and results.
- [ ] **2. Owners.** `own` PER question (`o-grave, o-lawncrypt, o-estate, o-crypt, o-glass, o-granite, o-urnground, o-none`, none exclusive); `effPlace(i)`; place cards empty for owners; "Already yours".
- [ ] **3. Family pins, tour pause, bridge.** `A.pins=[{x,y,name}]`; click on aerial adds; pins drawn on every map; `mapSVG` accepts a focus object; tour shows highlighted places + pins.
- [ ] **4. Parents.** `parents` question (`p-mom, p-dad, p-both`) sets `who` (`other` / `parents`); wording helpers plural-aware; POA line on "who signs".
- [ ] **5. Funeral track + one-thing + still to decide.** "Already taken care of"; `Q_OF` + "Add this to the plan"; `GOES_WITH`; still-to-decide list.
- [ ] **6. Tests.** Copy suite to `scratch/planning-ahead/`, enter via scratch track, reorder for cemetery-first; new `tracks.mjs`. Syntax check. Screenshots to Martice.
