# TRACK C — Glass-front fee standardization + glass guide fixes + ECL font (`s09/glass-fees`)

You are a track subagent. Read `ops/SPRINT_GUIDELINES.md` and `ops/DESIGN.md` and obey
them. Branch `s09/glass-fees` in your assigned worktree. You touch: the ECL / MVC / COM
map data modules + build scripts' fee sections, `glass-front-niches-guide.html`,
`scripts/verify_glass_niche_ranges.mjs`, and the map gates. You do NOT touch
`index.html`, guides.html, or the granite guide.

## Operator fee ruling (verbatim authority, Map Issues 07.31.26)

> "All glass front niches should have the same opening and closing and recording fee.
> Also there is no inscription fee on any glass front niche. The opening and closing fee
> is 875 and the recording fee is 235 same 10% ecf applies. There will be no tax on a
> glass front niche unless its ecl and they add the vase and scroll"

Apply to **every glass-front surface**: ECL map, MVC island map, Radiance + Serenity
walls (inside the COM map dataset), and `glass-front-niches-guide.html`:

- O&C **$875**, Recording **$235**, ECF **10%**.
- **Remove any inscription fee/toggle from every glass-front niche** (glass plates are
  etched differently — no inscription line at all).
- **No sales tax** anywhere on glass-front pricing — EXCEPT the ECL Bronze Vase /
  Bronze Scroll add-on toggles, which keep their tax treatment.
- Maps are GENERATED: edit the data module / build script, rebuild, never hand-edit the
  HTML. Update each map's verifier so the fee schedule is ASSERTED (and sabotage-test it:
  perturb a fee, gate must exit 1, restore).

Check what each surface carries today and change only what disagrees. Keep a small
before/after table per surface in your report.

## Glass guide fixes (`glass-front-niches-guide.html`)

1. **Remove the "Size and what fits" section** entirely (operator instruction).
2. **Photos: the glass-vs-granite comparison must use closer zooms** of each niche type
   to highlight the material difference. Names visible in photos are FINE (operator
   photo-PII ruling 2026-07-29, reconfirmed in this doc: "It doesn't matter if names
   show on either"). Source photos: `D:\Cemetery Photos Misc\` — `Eternal Light
   Columbarium (NEW)`, `New MVC Photos`, `Radiance and Serenity Niches` for glass;
   `GOMN Niches`, `ROAC Photos` for granite. Crop tight on one niche/space per shot.
   Do NOT include living people's faces.
3. Update the guide's printed fees to the ruling above; regenerate its PDF exactly as
   the existing build does (4-page cap stands); rerun
   `scripts/verify_glass_niche_ranges.mjs` — extend it to assert the new fee schedule
   and the no-inscription rule.

## ECL price font

> "Eternal light columbarium map looks great but the font size for the prices on the
> niche need to be increased right now they are very hard to read."

Increase the per-niche price text size on the ECL map (3D faces and flat/print grids)
until legible at normal phone/desktop zoom — then LOOK at a rendered screenshot to
judge, don't just bump a number. Keep contrast ratios AA (the $14,295 chip was measured
4.90:1 in sprint-08 — don't regress it).

## Verification (verbatim outputs)

- Rebuild + gate each touched map: `verify_ecl_map` / `verify_mvc_map` / COM gate — all
  PASS with anchors unchanged where prices didn't change (ECL 85/28/$685,175; MVC
  145/$1,870,000; RAD $156,115 / SER $76,960 — if a fee change moves an anchor, say
  exactly why).
- Fee sabotage per gate (perturb → exit 1 → restore).
- `scripts/verify_glass_niche_ranges.mjs` green with new fee assertions.
- `npm run check` 8/0; `npm test` counts not falling.
- Screenshots (ECL font before/after, guide photo section, each map's fee card) in
  `scratch/s09c-renders/` — and look at them.

## Report

Standard format: shipped, branch+commits, verbatim gates, per-surface fee before/after
table, files changed, decisions & open questions, director hand-checks.
