# TRACK B2 — s21/desc-companions — describe + tag all 254 companion proofs BY LOOKING

You are an Opus track agent in the BW Quote Tool sprint system. Branch
`s21/desc-companions` in your own worktree. DATA-ONLY track: one curated JSON file. Do
NOT touch the catalog page, the builder, index.html, or any image. Always
`git -C <absolute-worktree-path>`; stage explicit paths only.

## Stale-base check (FIRST)

Your branch must contain local main's tip (`git -C C:\Users\Martice\bw-quote-tool rev-parse main`).
If not, STOP and reset to local main.

## The job

Same ruling as Track B1 (read `TRACK-B1-desc-singles.md` §"The job" and §"Output" — the
schema, voice rules, tag-vocabulary discipline, language field, and method discipline all
apply identically). Your scope is the COMPANION proof class, which after Track A lands is
**254 designs**:

- The 232 already shipped (originals: `D:\Cemetery Photos Misc\PCM COMPANION\Headstone-Design-PCM-<num>.jpg`
  / `.webp`; the repo's `pcm-companion-images/` lists the shipped numbers — that dir is
  your authoritative number census for the 232).
- 10 new + 12 released: 245, 258, 2260, 2261, 2263, 2267, 2343, 2352, 2355, 2538, 2500,
  2501, 2503, 2504, 2506, 2508, 2509, 2510, 2514, 2515, 2516, 2529 — sources in
  `D:\Cemetery Photos Misc\PCM COMPANION NEW\PCM<num>.jpg`.

**The 12 released numbers (2500–2516 odd set, 2529) carry REAL identities** — names,
dates, portraits. Operator ruling 2026-08-07: they SHIP. Describe the DESIGN (stone
shape, artwork, layout), set `"piiFlag": true` on each, and never put the family's name,
dates, or hometown in your text. For their `language`: most are Vietnamese — that's
exactly what the operator wants findable ("Sample lettering in Vietnamese." in the desc).

Also sweep the OTHER 242 for non-English lettering — some stock-name proofs may be
Vietnamese too; tag every one you find.

## Output: `data/pcm-desc-companions.json`

Same schema as B1 (numbers as keys, count 254). Use `scripts/verify_pcm_desc.mjs` from
Track B1 — it merges before you. If it isn't on your base yet, write your validation
inline and note it; the director reconciles at merge.

## Definition of done

- 254/254 entries, validator (or inline equivalent) green, 12-random spot-check recorded.
- Language census in the report (the operator specifically asked for the Vietnamese view).
- Full `npm test` green from the worktree (never overlap runs; never call Firebase
  save/persist).
- Commit `data/pcm-desc-companions.json` by explicit path.
- Report: tag frequencies, language census, piiFlag list (should be ≥ the 12), proposed
  vocab additions, deviations.
