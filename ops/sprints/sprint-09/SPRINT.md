# Sprint-09 — Quote-tool contract fixes, fee standardization, follow-up emails, COM/TGMP reworks

Opened 2026-07-31. Director: this session (Fable). Tracks: Opus (standing policy).
Sources: `E:\Downloads\Quote Tool Issues 07.30.26.docx` (with embedded screenshot),
`E:\Downloads\Map Issues 07.31.26.docx`, `E:\Downloads\followupemailtoolhandoff.md`,
`E:\Downloads\URN_GARDEN___GARDEN_OF_VERSES_PACKAGES_06_2026.xlsx` (supplied mid-boot).

**Boot audit 2026-07-31:** working tree clean, `main` == `origin/main` (0/0),
`8 blocks, 0 errors`, `1327 passed, 0 failed across 27 suites`, no stale worktrees,
port 3737 free (suite started/stopped its own server).

## Operator rulings at boot (2026-07-31, via AskUserQuestion)

1. **Interlude Urn (Matthews): $665.00** — ships on the GOMN map.
2. **Urn garden pricing supplied**: the 06/2026 packages workbook (extracted verbatim into
   TRACK-U). Rose Urn Garden = **$4,395 + $660 ECF** (resolves sprint-08 open item).
3. **GOMN fee schedule = MVC June-2026**: O&C $875 / Recording $235 / Inscription $660
   + 10.4% tax on the inscription alone; inscription is a TOGGLE addable ×2 (two fit on
   the front).
4. **COM rework AND TGMP rework both run this sprint.** COM is the flagship track.

## Standing fee ruling (operator, Map Issues doc — binds tracks C, D, and the guides)

**All glass-front niches share one fee schedule:** O&C **$875**, Recording **$235**,
**no inscription fee on any glass-front niche**, ECF **10%**. **No sales tax on a
glass-front niche** — except ECL when the Bronze Vase and/or Scroll add-ons are chosen
(those stay taxed). Applies to ECL, MVC island, Radiance, Serenity — maps, guides, and
their verifiers.

## Tracks (all branches `s09/<slug>`, Opus, worktrees when parallel)

| Track | Branch | Scope | File |
|---|---|---|---|
| A | `s09/quote-fixes` | index.html: at-need commission worksheet total, CIRGAS→IOA second signer, CIRGAS import decedent/purchaser, memorial-order-form banner removal | TRACK-A-quote-fixes.md |
| B | `s09/followup-emails` | new `followup-letter.html` + guides.html card | TRACK-B-followup-emails.md |
| C | `s09/glass-fees` | glass-front fee standardization everywhere + glass guide fixes + ECL price font | TRACK-C-glass-fees.md |
| D | `s09/gomn-granite` | GOMN map fees/font/inscription×2/Interlude $665 + granite guide photo & fees | TRACK-D-gomn-granite.md |
| U | `s09/urn-gardens-pricing` | urn-gardens guide + tool vs the 06/2026 package sheet; RUG price | TRACK-U-urn-gardens-pricing.md |
| S | `s09/scattering-move` | scattering options OFF the WMP map (map repo), quote-side placement with direct cremation | TRACK-S-scattering-move.md |
| T | `s09/tgmp-layout` | TGMP physical layout redo: pool is GONE, path per photos/mockup | TRACK-T-tgmp-layout.md |
| M | `s09/com-rework` | FLAGSHIP: Chapel of Memories map rework — walkthrough navigation, two entrances, chapel layout, placement audit | TRACK-M-com-rework.md |

## Spawn waves (max 2 parallel; same-repo parallels in worktrees)

1. **A ∥ B** — A owns `index.html` in the main tree; B builds a new file in a worktree.
2. **C ∥ D** — disjoint files (ECL/MVC/COM-niche data + glass guide vs GOMN data + granite
   guide). Both touch shared verifiers' *own* files only; guides.html not touched by either.
3. **M ∥ U** — M branches AFTER C merges (C edits Radiance/Serenity fee data that lives in
   the COM dataset). U touches urn-gardens guide + possibly index.html (after A merged).
4. **T ∥ S** — T is MAPS/TGMP only; S is map-repo + a small index.html region (after A, U merged).

## Merge order

A → B → C → D → U → S → T → M. Full verification contract after every merge:
`npm run check` (8/0), `npm test` (1327+/27+, counts compared not just exit codes),
map gates for any touched map, range verifiers for any touched guide, generator baseline
14/14 for any index.html-touching merge — **except Track A, whose fix is SUPPOSED to move
AN-contract output: the track must name exactly which signatures moved and why, and the
director confirms the diff is exactly the intended change and nothing else.**

## Gates

- **Gate 0:** none outstanding — all operator inputs received at boot.
- **Close gate (operator):** eyeball COM + TGMP maps, spot-check a CIRGAS import +
  commission worksheet on a real at-need case, then authorize `git push origin main`.
  **No push pre-authorization was given this sprint — the push is asked for explicitly.**
- **Acrobat gate:** NOT triggered — no track touches the RIC. (CIRGAS/AN is exercised via
  the baseline harness and Playwright, not Acrobat.)

## Known scars that bite this sprint

- Worktrees need `node_modules` (junction) and `git -C <abs-path>` always.
- `test-price-update-path.mjs` hardcodes port 3737 — a worktree suite is red while another
  tree's server owns the port; verify on the tree that owns it.
- guides.html Maps-pill collisions when two tracks append cards — only B touches
  guides.html this sprint (glass/granite guides already have cards).
- The Browser pane reloads `index.html` on Edit with live network: tracks editing
  index.html work via Node scripts after at most one Edit.
