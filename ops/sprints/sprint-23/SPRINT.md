# Sprint-23 — Operator issue round: quotes, contracts, resources, PCM categories

**Opened 2026-08-15.** Source: the operator's issue list
`E:\Downloads\QUote tool issues and resources issues.docx` (9 items + 2 screenshots),
handed to the director with "boot as director and use opus sprinters."

## Goal

Close all nine operator issues in four Opus tracks: contract-lane fixes (RIC qty,
CIRGAS IOA sheet order, commission-worksheet print), quote-lane features
(multi-contact linking, sidebar readability, payment-options split totals),
resources fixes (death-cert worksheet PDF mapping + input masks, guides quick-jump
nav), and the PCM catalog Single/Companion restructure.

## Operator rulings at open (in-chat 2026-08-15)

1. **Payment split = ALL combined surfaces:** family-quote Payment Options page
   header shows Cemetery + Funeral Home + Grand total; combined-quote email prints
   per-side totals + grand; payment-options-letter.html gets optional separate
   cem/FH amount fields.
2. **PCM catalog = TWO top-level design sections** — "Single Marker Designs" and
   "Companion Designs"; inside each, full-colour proofs first, then book plates
   grouped by theme (Classic, Religious, Outdoors, Floral, …). Book (2020/2011)
   survives as a filter dropdown + detail-panel row only. The 354 plates of the
   2020 book get a by-looking single/companion classification (name-count per
   plate, the s21 proof-description method). Gate re-pinned to the new structure.

## Contract at open (Gate 0, measured 2026-08-15)

- `npm run check` → `index.html: 8 blocks, 0 errors`
- `npm test` → `2854 passed, 0 failed across 42 suites`
- main == origin/main, tree clean (only gitignored `scripts/__pycache__/`)
- Generator baseline: 14/14 scenarios, signatures.json current

## Tracks & waves

| Wave | Track | Branch | Surface | Worktree |
|---|---|---|---|---|
| 1 | A contract-fixes | `s23/contract-fixes` | index.html (contract lane) | ../bw-quote-tool-s23a |
| 1 | C resources | `s23/resources` | vital-worksheet.html, guides.html, scripts/verify_guides_page.mjs | ../bw-quote-tool-s23c |
| 2 | B quote-lane | `s23/quote-lane` | index.html (quote lane), payment-options-letter.html | ../bw-quote-tool-s23b (base = post-A main) |
| 2 | D pcm-restructure | `s23/pcm-restructure` | scripts/build_pcm_catalog.py, pcm_extract.py, pcm-design-catalog.html (generated), verify_pcm_catalog.mjs | ../bw-quote-tool-s23d |

Max 2 parallel (A∥C, then B∥D). **Merge order: A → C → B → D.** B branches only
after A is merged (same file). Worktrees pre-created by the director from LOCAL
main (stale-base scar), node_modules junctioned.

## Issue → track map

| # | Issue (docx) | Track |
|---|---|---|
| 1 | Link more than one contact to a cem/FH quote | B |
| 2 | Sidebar preview: see everything while adding items (labels truncate, qty cut off) | B |
| 3 | RIC qty shows 1 for two O&C / two recording fees | A |
| 4 | CIRGAS: IOA additional-signatures sheet next to the IOA | A |
| 5 | Commission worksheet (generated) fails to print / convert to PDF in Excel | A |
| 6 | Death-cert worksheet: PDF checkboxes scattered + no phone/date auto-format | C |
| 7 | Guides page: quicker section/category lookup | C |
| 8 | PCM catalog: merge single/companion categories, book split irrelevant to families | D |
| 9 | Payment options: FH total + cemetery total + grand total | B |

## Gates

- **Gate 0 (done):** contract measured green, main clean.
- **Close gate (operator):**
  - Push authorization (NONE pre-authorized).
  - **RIC Adobe Acrobat check** — Track A changes the values written into RIC qty
    fields (not the template or field map). Acrobat gate applies per DESIGN §5;
    operator opens one generated RIC with a 2-garden scatter quote.
  - Commission-worksheet print test on the office printer
    (`\\us-sea-v-file01\WMP - Cascade`) — the one thing no track can test here.
  - Eyeball renders: guides nav, PCM two-section catalog, death-cert PDF,
    payment-options page.

## Baseline notes (expected signature diffs — NOT regressions if they match intent)

- Track A: RIC signatures change ONLY if a baseline scenario carries a
  multi-garden scatter or Compare-Options fee lines; track must diff and explain
  every changed field (expected: Qty 3/Qty 4 values, nothing else).
- Track B: combined family-quote PDF signature changes (page-2 header + FH section
  label). Track re-captures the baseline deliberately, diffs, and explains every
  changed byte region; all non-combined scenarios must stay byte-identical.

## Close checklist

- [ ] All four tracks audited (full diff vs DESIGN.md), merged --no-ff in order
- [ ] `npm run check` 8/0 + `npm test` green on main after EACH merge; count never falls
- [ ] Baseline 14/14 re-verified on final main; diffs explained per track
- [ ] verify_guides_page.mjs + verify_pcm_catalog.mjs green on final bytes
- [ ] STATE.md updated; next sprint drafted from reality
- [ ] Operator close gate delivered (push word, Acrobat RIC check, printer test)
