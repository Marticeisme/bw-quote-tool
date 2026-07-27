# Sprint Director Guidelines (runbook)

You are a fresh Claude Code session directing the current sprint end to end: analyze →
gates → tracks → audit → merge → close. You write code only to resolve merge conflicts or
trivial audit fixes; tracks build.

## Phase 0 — Boot & analyze

1. Read `STATE.md`, `DESIGN.md`, `SPRINT_GUIDELINES.md`, then the current
   `sprints/sprint-NN/SPRINT.md` + its `TRACK-*.md` files.
2. Analyze sprint requirements **vs reality**:
   - `git fetch`; `git log origin/main..main`; `git status --short`. Compare repo
     state against the sprint doc's assumptions. **Read the other sessions' recent commits**
     — someone else works on `docs/` and `*-guide.html` in this same tree.
   - Verify claimed prior state against actual artifacts:
     - `npm run check` → `index.html: 8 blocks, 0 errors`
     - `npm test` → `636 passed, 0 failed across 19 suites`
     - if a sprint depends on a captured baseline, confirm the artifacts and
       `signatures.json` still exist where `STATE.md` says
     - if a sprint depends on extracted templates, re-verify their SHA-256s against
       `pdf-templates/embedded/manifest.json` — never assume
   - Background jobs in `STATE.md`: check each source — progressed, stalled, failed?
   - Confirm the dev server can start on 3737 and nothing stale is already listening.
     A zombie dev server from a dead agent produces phantom results.
3. **If reality contradicts the sprint doc: amend `SPRINT.md`, log the deviation in
   `STATE.md`, THEN proceed.** Fiction in docs poisons the next session.

## Phase 1 — Clarify, reconcile, plan

1. Ask ALL blocking/open/clarifying questions (batched, concrete options, each leading with
   your recommended answer; genuine operator decisions only — not reassurance).
2. **Reconcile & re-present.** If answers shift scope, amend `SPRINT.md` (and log in
   `STATE.md`), then re-surface any new ambiguity — loop until the sprint is unambiguous
   BEFORE planning. A track must never inherit a question you could have closed here.
3. Present Gate 0 items from `SPRINT.md`. Don't spawn tracks that depend on unmet gates.
4. Present the execution plan (plan mode where available): spawn order, parallelism, merge
   order, audit checks. On approval, execute.

## Phase 2 — Spawn tracks

- One subagent per track, prompt = absolute path to its `TRACK-*.md` + instruction to obey
  `SPRINT_GUIDELINES.md`. Opus per DESIGN §model policy.
- Same-repo parallel tracks: worktree isolation; each commits locally to its own `sNN/<slug>`
  branch and **does not push it** (see SPRINT_GUIDELINES §3 — the repo is public and every
  push is an operator gate, including a mere feature branch).
  **A worktree has no `node_modules`** — junction or install it, or every suite crashes and
  the track cannot run its own gates.
- Independent tracks spawn in ONE message. While they run: handle gate items; never
  duplicate track work.
- **Before a track edits `index.html`, navigate the Claude Code Browser pane away from it.**
  The pane reloads the file after every Edit with live network access, which boots the app
  against production Firebase.

## Phase 3 — Audit & merge (in SPRINT.md's merge order)

1. Fetch the branch; review the FULL diff against `DESIGN.md`: contract conformance, no
   secrets, no real customer data, no scope creep.
2. **Re-run the track's verification gates yourself** against real state. Reports are
   claims; your audit produces facts. Specifically:
   - re-run `npm run check` and `npm test` and compare the **counts**, not just the exit
     code — a falling assertion count is a silent regression
   - re-run the generator baseline diff if the sprint specifies one
3. Rebase onto main if needed; resolve conflicts yourself; re-run the verification contract
   on the branch; merge `--no-ff`; re-run on main.
4. **Do not push.** Pushing is the operator's gate.

## Phase 4 — Close

1. Walk the operator through the close gate as an actionable checklist (exact commands),
   including the push command he will run or approve.
2. Update `STATE.md`: shipped-per-track, deviations, background jobs, learnings (update
   GUIDELINES/DESIGN if warranted — log that you did). Propose promoting project-agnostic
   learnings to the sprint skill's templates.
3. Draft/amend the NEXT sprint's files from what actually happened (ROADMAP is the
   skeleton; reality wins).
4. Final report: outcomes, merge summary, gate status, next-sprint pointer + kickoff.

## Respawn protocol

Resuming a half-finished sprint: `STATE.md` + `git branch -a` + `git worktree list` tell
you where it stopped. Track branches are durable; re-audit anything unmerged rather than
trusting prior-session memory.

## Hard rules

- All `SPRINT_GUIDELINES.md` git rules. Verify "pushed"/"loaded"/"done" claims against
  git/store/process state yourself.
- Never merge red; never spawn tracks on a red main.
- **Never write to production Firebase**, and never let a track do so. There is no staging.
- **Never push without an explicit go from Martice.** Push to `main` is an immediate public
  deploy of a tool used in front of families.
- **Never commit `wmp-cemetery-map/`**, and never weaken `.gitignore` to make something
  easier.
- Never move `scratch/name-fixtures.local.mjs` (or the other real-data files listed in
  DESIGN §6) out of `scratch/`.
- Keep token use lean: direct, audit, merge — don't rebuild.
