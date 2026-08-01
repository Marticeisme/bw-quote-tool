# Sprint-10 — DRAFT (seeded at sprint-09 close, 2026-07-31)

Not yet scoped with the operator. This is the accumulation of everything sprint-09
surfaced but did not ship. A fresh director session boots via `/sprint direct`,
prunes this list with Martice, and writes real TRACK files.

## Operator rulings needed first (cheap, may dissolve tracks)

1. **COM map judgement calls (Track M's flags):** chapel located at the CAD's "CHAPEL
   AREA" west of the island (vs the debrief's island-voids reading); seating faces
   north (photo readable as west — one-line change); both niche walls' facing
   directions estimated; banks 154-158 kept in COM though the MIS debrief says
   ELM-3-S.
2. **TGMP (Track T's flags):** ossuary removed on inference — confirm; bark vs turf
   if Phase 2 installs differently; the TGN bank's position needs MIS or a photo;
   are the sheet's post line-items TYPES stocked in quantity (mockup draws more posts
   than the sheet prices)?
3. **GOMN O&C qty default** on an all-companion wall: 1 or 2? (open since s08).
4. **LUG rights conflict:** slide says 1–2 rights/space; tool records capacity 1.
5. **GoV urn vault $505** has no product name in the tool — name it or drop it.
6. **Rest Haven** is SOLD OUT on the sheet but has no tool record — add a sold-out
   record or leave absent?

## Carried defects / follow-ups

- **Zero-rect pinned-card backport** to COM/ECL/MVC/ROAC/TGMP — a chip session was
  started 2026-07-31; verify what it landed and REBASE over the M and T reworks
  (both rebuilt the affected build scripts).
- **Garden qty display reads as a double-count** (space+ECF total directly above a
  separate ECF row) — Track S's observation, every garden, cosmetic but confusing.
- **Compare-overlay ~23px overflow** on the 8-row casket pages (pre-existing,
  unchanged by Track K).
- **`build_all_caskets.py` warning** `!! wood FACETS block not matched uniquely` —
  pre-existing, unowned.
- **docs/PRICE_UPDATE.md** stale "Known gaps" row for MONOBAR_INSTALL (both sides
  are 225 since 2026-07-26).
- **COM crypt prices** still "confirm in MIS" awaiting a legible source (s08).
- **Mixed-rate RIC discount label** (August promo, e.g. `13.3% Prop Disc`) — if the
  close-gate Acrobat eyeball shows overflow, a tool-side track shortens the label.

## Process debt

- **Reconcile CLAUDE.md's "git pull --rebase before you start" with
  SPRINT_GUIDELINES' no-rebase-on-merge-carrying-main rule** — the collision
  flattened sprint-09's history when a chip session booted mid-sprint. Proposal:
  CLAUDE.md wording becomes "git fetch + fast-forward only; never rebase a main that
  carries unpushed merges".
- Sprint-skill promotion candidates from s09 (see STATE close entry): the
  wrong-base-diff trap (`git diff main..branch` after main moves — always use the
  merge base), the ops-commit-in-a-shared-tree scar, and the detached-chain
  background-command footgun (twice in one sprint).
