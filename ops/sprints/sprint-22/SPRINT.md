# Sprint 22 — Inman Travel Plan guide + Bronze Marker guide

Opened 2026-08-10. Director: Fable session. Tracks: Opus (policy).

## Goal

Two new family-facing guide pages, their PDFs, and their guides.html cards:

- **Track A** `s22/inman-travel-plan` — `inman-travel-plan-guide.html`: the Travel Plan
  by Inman (Martice is a licensed Inman agent). Will anchor a future email campaign, so
  the PDF must stand alone when attached to an email.
- **Track B** `s22/bronze-markers` — `bronze-markers-guide.html`: the bronze companion
  to the granite marker guide (markers-guide.html). Matthews + Coldspring partnerships,
  WMP bronze rules (sizes + required foundations), all-in prices from the tool's own
  bronze dropdown, vendor design imagery incl. the government bronze match for veteran
  spouses (ordered through Coldspring).

## Operator rulings at open (all in-chat 2026-08-10)

1. Travel Plan prices printed = the LIVE enrollment page: **$499 individual / $974
   couple**, 3-month ($166.33/mo) and 12-month ($41.58/mo) plans, forgiveness clause.
   (The travelplanbyinman.com FAQ's $495/$990 is stale; the deck's $475 additional-person
   structure is not what his link sells.)
2. Martice's personalized enrollment link appears **everywhere** (guide page + PDF).
3. Bronze design imagery is **pulled from the vendors' public sites** (Matthews,
   Coldspring). One image MUST be a government-match bronze (veteran-spouse matching
   headstone, ordered through Coldspring).
4. Bronze guide carries **all-in BW prices** like the granite guide. Source = the qBronze
   dropdown in index.html (READ ONLY — pinned verbatim in the Track B brief).
5. Scope: **guides only.** index.html stays byte-untouched all sprint (sha256 audit).
   No email draft this sprint (guide + PDF only).

## Gate 0 (before tracks spawn)

- [x] `npm run check` → `index.html: 8 blocks, 0 errors` (measured 2026-08-10)
- [x] `npm test` → `2842 passed, 0 failed across 42 suites` (measured 2026-08-10)
- [x] main == origin/main, tree clean (stray `scripts/__pycache__/` untracked, ignore)
- [x] Worktrees `../bw-quote-tool-s22a`, `../bw-quote-tool-s22b` pre-created by the
      DIRECTOR from LOCAL main (stale-base scar), node_modules junctioned.

## Tracks

| Track | Branch | Worktree | Files owned |
|---|---|---|---|
| A | `s22/inman-travel-plan` | ../bw-quote-tool-s22a | inman-travel-plan-guide.html (new), inman-images/ (new, optional), guides.html (its own card only), scripts/guide-print-meta.mjs + verify caps (its own entries), pdf-assets/Travel Plan by Inman.pdf |
| B | `s22/bronze-markers` | ../bw-quote-tool-s22b | bronze-markers-guide.html (new), bronze-images/ (new), guides.html (its own card only), scripts/guide-print-meta.mjs + verify caps (its own entries), pdf-assets/Bronze Markers.pdf |

Parallel is justified: the work lives in separate new files. Both touch guides.html and
guide-print-meta.mjs with a one-card / one-entry addition; the director resolves the
trivial add/add conflicts at the B merge.

## Merge order

A → B. `--no-ff`. Contract re-run on main after each merge; index.html sha256 compared
against the pre-sprint blob at both merges.

## Verification contract (per track, quoted verbatim in reports)

- `npm run check` → `index.html: 8 blocks, 0 errors`
- `npm test` → `2842 passed, 0 failed across 42 suites` (must not fall; no suite reads
  the new guide pages)
- `node scripts/verify_guides_page.mjs` green with the new card
- `node scripts/verify_guide_pages.mjs` green including the new guide (register its cap)
- `node scripts/verify_family_type.mjs` green including the new guide
- PDF manifest fresh (0 stale / 0 missing) after `build_guide_print_system.mjs`
- index.html byte-identical: `git diff --stat main -- index.html` empty on the branch

## Close gate (operator)

- Eyeball both guide pages + both PDFs (renders in scratch/s22-*-renders/)
- Rule on any imagery the tracks flag (vendor watermarks, quality)
- Push word (separate gate, never assumed)
