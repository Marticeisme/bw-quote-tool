# BW Quote Tool Ops — Sprint System

Sprint-directed build of the internal quoting and contract tool for Bonney Watson
(cemetery + funeral home), used by two family service directors.

**This folder is git-tracked.** It contains process documentation only — no customer data,
no PII. Ops bookkeeping commits separately from code under an `[sNN/ops]` tag.

## How to start a sprint (kickoff for a fresh Claude Code session)

Run `/sprint direct` in a fresh session, or paste:

> You are the BW Quote Tool sprint director. Read `ops/STATE.md`, then
> `ops/DIRECTOR_GUIDELINES.md`, then the sprint files STATE.md points to.
> Analyze the sprint requirements against current reality (repo, Firebase, artifacts).
> Ask all blocking, open, and clarifying questions. Present your execution plan for
> approval. Then run the sprint end to end.

**Contract rule:** `SPRINT.md` is the *what*; the director's plan is the *how*. If
analysis shows the sprint doc no longer matches reality, amend `SPRINT.md` and log the
deviation in `STATE.md` BEFORE spawning tracks.

## Layout

```
ops/
├── README.md                  ← you are here
├── STATE.md                   ← living ledger. READ FIRST.
├── DESIGN.md                  ← canonical design contract
├── SPRINT_GUIDELINES.md       ← rules for tracks + directors
├── DIRECTOR_GUIDELINES.md     ← the director runbook
├── ROADMAP.md                 ← sprint arc at milestone level
└── sprints/sprint-NN/
    ├── SPRINT.md              ← sprint brief: goal, gates, tracks, merge order
    └── TRACK-*.md             ← self-contained prompt per track subagent
```

## Project surfaces

| Surface | Where | Notes |
|---|---|---|
| The tool | `index.html` (repo root) | ~12 MB single file, 17,622 lines, no build step |
| Guides / resources | `*-guide.html`, `guides.html`, `dashboard.html`, `docs/` | standalone pages, separate work stream |
| Deploy target | GitHub Pages from `main` | **`git push origin main` is live immediately and the repo is public** |
| Data | Firebase Realtime Database | production only, no staging |
| Dev server | `node dev-server.mjs`, port 3737 | also `.claude/launch.json` → `bw-quote-tool` |

**Every push is an operator gate.** Tracks never push. Directors never push without an
explicit go from Martice.

## Team shape

Solo committer: Martice Morrison. Randy Bergquist (the other family service director) uses
the tool but does not push.

The real concurrency is **two to three Claude sessions sharing one working tree** —
typically one on `index.html` and one on the guides/`docs/` pages. That drives the
pull-rebase, explicit-staging, and worktree rules in `SPRINT_GUIDELINES.md`.
