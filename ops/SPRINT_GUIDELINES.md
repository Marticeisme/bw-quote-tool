# Sprint Guidelines

Rules of work for every sprint, track, and director. Director runbook:
`DIRECTOR_GUIDELINES.md`. Both obey this file and `DESIGN.md`.

## What a sprint is

- One bounded milestone, run end-to-end by ONE fresh Claude Code session (the
  **director**), which spawns each **track** as a subagent.
- **At most 2 tracks running in PARALLEL.** This project is single-file shaped: nearly all
  work lands in `index.html`, so two tracks editing it at the same time would produce two
  large diffs into the same ~18,000-line CRLF file and merge by hand — strictly worse than
  sequential. A second *concurrent* track is justified only when the work genuinely lives
  elsewhere (the guides/`docs/` pages, `scripts/`, `tests/`, the map repo).

  **Clarified 2026-07-27:** the cap is on parallelism, not on count. A sprint may run three or
  more tracks **sequentially**, each branching from a `main` that already carries the previous
  merge — they cannot conflict, and three reviewable ~600-line diffs audit far better than one
  of ~1,800. Sprint-04 is the first to do this. The old wording said "1–2 tracks per sprint",
  which would have forced one oversized track for no safety benefit.
- Sprints contain **operator gates** — explicit pauses for Martice: pushing to `main`
  (a live public deploy), the Adobe Acrobat check when a change touches the RIC itself,
  Firebase console work, and any decision that changes what a family sees. Gates live in
  `SPRINT.md`, never inside track prompts. Gate 0 runs before tracks spawn; the close gate
  runs after merges.

## Track rules

1. **Self-contained prompts.** A track reads its `TRACK-*.md` + `DESIGN.md` and needs
   nothing else. Mid-flight human input required = the sprint was planned wrong.
2. **No blocking questions.** Ambiguity → decide per `DESIGN.md`, log under "Decisions &
   open questions" in the track report.
3. **Branch discipline.** One branch per track: `sNN/<slug>`, from latest `origin/main`.
   Commit locally; **never merge, never touch `main`, never deploy.** Same-repo parallel
   tracks run in worktrees — and a worktree needs its own `node_modules` (see DESIGN §5).

   **Do NOT push the branch.** Corrected 2026-07-26: this file previously said "push the
   branch", which contradicted Martice's standing rule in `CLAUDE.md` — *"Commit or push only
   when I ask. Don't push on your own initiative."* Two track branches reached the public
   origin under the old wording before anyone noticed, and were deleted at his instruction.
   **This repo is public: a pushed branch is fetchable by anyone, even though only `main`
   deploys.** Branch commits are durable in the local repo; the director merges locally and
   **every** push, `main` or otherwise, is an operator gate. This applies to directors too.
4. **The verification contract (DESIGN §5) is the gate.** Concretely, every track runs and
   quotes verbatim:
   - `npm run check` → must print `index.html: 8 blocks, 0 errors`
   - `npm test` → must print `2085 passed, 0 failed across 36 suites`
     (the count rises as suites are added; it must never fall silently — updated s09
     close: +57 atneed-commission, +70 followup, +13 fee pins, +59 august-promo,
     +8 served-tree)
   - any generator-signature diff its sprint file specifies
5. **Never trust, always verify.** "Done"/"pushed"/"loaded" are claims; the report quotes
   command output, not assertions. Directors re-verify at audit.
   - **Quote the EXACT command you ran, env pins included** (`BW_BASE=...` etc.). The s12
     Track A false-alarm was a green run reported without its own pin — the director's
     bare re-run graded the wrong tree and manufactured a believable regression.
   - **Any verifier that reads files from disk AND fetches a served page must call
     `served-tree-check.mjs` BEFORE its first assertion** (s12 lesson: the director was
     the one port-3737 caught this time; the PCM gate was the last one missing it).
6. **No production Firebase writes, ever.** Tests use `tests/fake-firebase.js` and block
   `gstatic.com/firebasejs`. Reads are permitted; writes are not. This has destroyed real
   data twice (2026-07-11, 2026-07-16).
7. **No fabricated data, ever,** outside clearly-marked test fixtures under `tests/`.
   Fixtures are synthetic by rule: 555-range phones, `@example.com`, invented names.
   Never copy a real customer name, phone, or address into a file that can be committed.
8. **Report format:** what shipped; branch + commits; verification outputs (verbatim);
   files changed; decisions & open questions; what the director must verify by hand.

## Definition of done (sprint)

- All track branches audited, merged `--no-ff` to main in SPRINT.md's order; verification
  contract green on main after each merge.
- Operator close-gate checklist delivered/executed.
- **Push is a separate operator gate.** A sprint is "done" when merged locally and green;
  it is not done-and-deployed until Martice says push.
- `STATE.md` updated; next sprint's files drafted or amended from reality.

## Token discipline

- One subagent per track; no orchestration frameworks unless the operator explicitly asks.
- Director audits diffs directly; at most ONE review subagent per sprint, only for a
  genuinely risky merge.
- Tracks read what their file points to; no exploratory fan-outs — `DESIGN.md` is the map.
- Model policy: **Opus for all tracks.** `index.html` is one file, ~1,400 functions in
  global scope, no build step and no type checking; a single JS error takes the tool down
  for both counselors at once. There is no cheap-and-safe tier of work here. Directors run
  on the strongest available tier.

## Git conventions

- Commits: imperative summary, prefixed with the track tag `[sNN/<slug>]` (director
  ops/merge commits use `[sNN/ops]`); end with:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`
- **Stage with EXPLICIT paths — never `git add -A` / `git add .`.** Two other sessions have
  in-flight edits in this working tree. `.claude/hooks/pre-git-guard.js` blocks bulk adds,
  blocks a push when `index.html` has a syntax error, and blocks any attempt to commit
  `wmp-cemetery-map/`.
- **`git fetch` before any push, then check the BEHIND count** — `git rev-list --count main..origin/main`.
  Integrate only if it is non-zero.

  **Do NOT `git pull --rebase` on a `main` that carries merge commits.** This file used to say
  exactly that, and on 2026-07-26 it tried to LINEARISE three `--no-ff` track merges — while the
  branch was 15 ahead and 0 behind, so there was nothing to integrate at all. It conflicted
  mid-replay; had it succeeded it would have destroyed the merge structure this same file tells
  you to preserve. `git rebase --abort` restored it. `--rebase` is right for a linear branch and
  wrong for an integration branch.
- **Ops bookkeeping stays out of code commits.** `ops/` churn (STATE.md / SPRINT.md /
  TRACK-*.md) commits SEPARATELY from code, tagged `[sNN/ops]` — never mixed into a code or
  merge commit. Keeps the code history clean and bisectable.
- With worktrees, ALWAYS `git -C <absolute-path>`.
- Never chain push/merge after a PIPED build/test in one compound — pipes mask exit codes.
  Verify, check the exit code, THEN push. Judge builds by exit code, not stderr noise.
- Director merges `--no-ff` per track; never force-push main; never rewrite public history.
- **Other sessions push out of band.** At boot, pull and read their recent commits. Never
  clobber; rebase, don't force; keep changes to their hot files (`docs/`, `*-guide.html`)
  minimal and flagged in the report.
