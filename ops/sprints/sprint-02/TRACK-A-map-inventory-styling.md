# Track A — Map inventory styling

Branch `s02/map-inventory-styling`, in the **map repo**:
`C:\Users\Martice\bw-quote-tool\wmp-cemetery-map` — its own git repo, **no remote**, gitignored
by the parent. Read `ops/DESIGN.md` §6 (security) and §7 (the map/tool contract) in
`C:\Users\Martice\bw-quote-tool\` first. Read them; do not edit them.

You are restyling how the map draws inventory so a counselor can see what is sellable without
clicking. The base layer — drone orthophoto with hairline plot outlines — is already good. What
is missing is state.

## THE ABSOLUTE RULE — real burial data

`data/` holds **real burial records, including the names of living property owners**, and the
parent directory is a **public GitHub repository**. Nothing from this repo leaves it: not in a
commit, not in a fixture, not in a comment, not as an example in your report. Use a synthetic
sid and an invented name when you need to demonstrate something.

**And a rule this sprint adds: no screenshot may contain a real name.** The wall view and the
cremation card render occupant names. A screenshot is a file that can be copied and pasted, and
it escapes every guard we have — `.gitignore` protects the data directory, not an image of it.
Capture the **plot overview only**, or mask names before saving. If a view cannot be captured
without a name in frame, describe it instead of capturing it.

Do not create files anywhere under `C:\Users\Martice\bw-quote-tool` outside the map repo.

## What exists (verified 2026-07-26 — do not re-derive)

- **`status` is a property on every plot feature**, alongside `sec`, `loc`, `sid`, `category`,
  `grave_type`, `lot`, `row`, `space`, `occ`, `source`. Indoor files add `building`, `wall`,
  `face`, `level`.
- **Six distinct values exist in the data.** Measured shares from a 5,975-record sample (the
  full corpus is ~79,493 positions, so treat ratios as indicative, the value set as real):
  `buried` 61.4%, `available` 20.1%, `reserved` 18.2%, then `tree` (8), `hold` (5),
  `not_for_sale` (3) — **16 records total across the three exception states.**
- `status` already appears ~88 times in the map's `index.html`, so there is existing handling
  to extend rather than invent.
- `scripts/validate.mjs` already enforces that status and roster agree — an "available" space
  holding a named person is a validation failure, because that is how a plot gets sold twice.
- **Your branch point already contains `audit/map-bugs`** (Gate 0). That work fixed the niche
  lasso across all 12 structures, wall-view rendering, HTML escaping, and `sid-index` coverage.
  You will be editing the same rendering code. **Do not undo those fixes** — the verification
  section makes you prove you didn't.

## Build

### 1. One outline colour; state lives in the fill

Plot polygons: hairline stroke, **`#e84610`** (brand orange), **no fill by default**. The
orthophoto must read through — you see the headstone *and* its boundary.

Circulation (paths, roads): **`#466e86`** (brand navy), drawn as a **double stroke**, not a
filled band, so the actual surface stays visible between the lines.

Never encode status in stroke colour. That decision is made and recorded in `SPRINT.md`.

### 2. Status treatments — all six values

| Status | Treatment |
|---|---|
| `available` | low-alpha fill (~15%), pale cream/white. **No glyph.** |
| `reserved` | no fill, **hollow ring** glyph |
| `buried` | no fill, **filled dot or small cross** glyph |
| `hold`, `not_for_sale`, `tree` | **diagonal hatch**, precise reason on hover/tooltip |

**`hold` must never receive the available tint.** It is conditionally sellable, and tinting it
as available is a double-sale waiting to happen.

Do not invent a distinct visual language for the three exception states — 16 records between
them. One hatch, with the reason carried in the tooltip.

**The ordering principle, if you have to make a judgement call: fill > texture > glyph, by
zoom-robustness.** At 4px a fill reads, a hatch reads as different texture, a glyph collapses to
a dot. Distinctions needed at a distance get fill or hatch; the fine one that only matters up
close gets the glyph.

Tint colour is pale cream/white deliberately — green is invisible on grass and green/red is the
colourblind trap. White also *means* unclaimed.

### 3. Labels

- **Rotate each label to its row's bearing** and place it at the **plot edge**, not the centre,
  so the monument stays visible. The grids are rotated; you already have the bearing from the
  geometry. This is what makes a rotated grid legible without leader lines.
- Add a **subtle light halo** (or thin outline). Plain dark text works over uniform grass and
  vanishes over a dark headstone or a shadow — the reference product has exactly this bug.
- **Thin labels out as zoom decreases.** Drop below a zoom threshold, or label every *n*th plot.
  Fixed density collides at overview zoom.

### 4. Two-state default, six-state toggle

Default the view to **sellable vs not**. A counselor scanning for inventory does not need six
categories; records work does. Provide a toggle to the full breakdown. Persist the choice for
the session if that is cheap; do not build settings storage for it.

### 5. Selection stays in its own channel

A pin, or a heavier stroke — **never a colour change**. The moment selection borrows a status
colour, the two start lying about each other.

## Verification — "it looks right" is not a gate

### Automated invariants — write these; they are the deliverable as much as the styling is

1. **Status coverage.** Assert the styling map handles every distinct `status` value present in
   the data, and **fails when an unknown value appears.** A future status rendering as nothing
   is precisely the silent failure this sprint must not introduce.
2. **Distinguishability.** Render a fixed area at overview zoom, sample pixels inside known
   `available` polygons versus known `buried` polygons, and assert the mean difference exceeds a
   threshold. This is the check that proves a 15%-alpha tint actually survives over grass — no
   reviewer can judge that from a thumbnail, and it is the single most likely thing to be
   subtly wrong.
3. **Label density.** At overview zoom, assert the drawn-label count is under a collision
   threshold and that no two label bounding boxes overlap.
4. **No regression on the audit fixes.** `#space=<sid>` resolves for an **unsold** sid (the
   whole class that was broken before `audit/map-bugs`), and the niche lasso resolves in all 12
   structures.

Wire them into `npm test` alongside the existing suites.

### Existing gates that must stay green

```
19 passed, 0 failed
 7 passed, 0 failed
 8 passed, 0 failed
2/2 unit files valid, 2770 units checked, index ok
```

Counts may rise as you add coverage; **they must never fall.** A suite printing no assertions is
a failure, not a pass. Judge by exit code, and never chain a commit after a piped test command —
the pipe masks the status.

### Screenshots

Fixed zoom and centre, the same frames every run so they diff meaningfully. **Plot overview
only — no names in frame.** Port discipline: the map convention is **8642**; check nothing is
listening before you bind and leave nothing running.

## Git

- Commit locally to `s02/map-inventory-styling`. **This repo has no remote; do not add one.**
- **Never `git add -A` / `git add .`** — explicit paths only.
- One logical change per commit, tagged `[s02/map-styling]`, ending
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- **Always `git -C "C:\Users\Martice\bw-quote-tool\wmp-cemetery-map"`** rather than `cd`-ing and
  using bare git. A stale shell cwd put a commit on the wrong branch in this project on
  2026-07-26. If you need a working directory for a command, use a subshell: `( cd X && cmd )`.
- Commit incrementally as each piece lands. An interruption should cost one item, not all of them.

## Out of scope

- Hosting, auth, the de-identified-export question — undecided and unrelated.
- Drone capture, orthomosaic processing, control-point alignment.
- `prices.json`, and the map→tool "send selection to quote" return path. That return path is the
  highest-value map work *after* this one, but it spans both repos and is its own sprint.
- The ~2.7 m imagery offset. Deliberate and hand-corrected; raise it, never "fix" it.
- The two escalated position conflicts in CN and ELN. Operator and MIS only.

## Report

What changed and why; branch and commits; the four automated invariants with their actual
output; the existing gates verbatim; which screenshots you captured and confirmation that none
contains a name; anything you could not verify, stated plainly. Flag any of the seven
previously-in-flight files you had to touch.
