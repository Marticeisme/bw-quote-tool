# TRACK H — Implement the voice debrief across all family-facing guides

You are a track subagent for the BW Quote Tool. Obey `ops/SPRINT_GUIDELINES.md` and
`ops/DESIGN.md`. Worktree `../bw-quote-tool-s14h`, branch `s14/voice-sweep`
(`git worktree add ../bw-quote-tool-s14h -b s14/voice-sweep`); junction node_modules
from the main tree. Explicit-path commits only; NEVER push; `git -C <abs>` always. No GPU.

## Operator request (2026-08-04)

"make sure the current guides are updated to match the debrief regarding my voice
please." The debrief is **`docs/GUIDES_VOICE_DEBRIEF_2026-08.md`** — read it FIRST,
in full. It is the complete spec: voice rules, global find-and-replace items, a
tiered per-guide punch list, gold-standard tone models, and the priority order.
Execute it entirely.

## Scope and fences

- IN SCOPE: every `*-guide.html` the debrief names, `direct-cremation.html`,
  `outside-marker-rules.html`, `scattering-guide.html`, `urn-placement-guide.html`,
  `vault-guide.html`, `urn-gardens-guide.html` — i.e. the debrief's Tier 1/2/3 lists.
- OUT OF SCOPE (the debrief's own exemptions + active fences): the GPL, all product
  catalogs, maps, `vital-worksheet.html`, letters/emails, `medicaid-professional-
  reference.html`; **`guides.html` (Track F owns it right now — do not touch it)**;
  walkthrough pages; index.html; contract code. If a global sweep would touch an
  out-of-scope file, skip it and note it.

## The trap this work is famous for (read carefully)

Several verification gates ASSERT EXACT SENTENCES that your sweep will change — the
s11 register sweep deleted fee-provenance sentences that `verify_granite_niche_ranges`
asserts, and those checks sat red on main for ~36 hours. The em-dash boilerplate
("… what you choose — call or email me …") is asserted in range/guide verifiers, and
`verify_photo_first`, the typical-band wording, and the guide-price-rule machinery all
pin prose. THE RULE: when a gate asserts a sentence the voice rules forbid, update the
GUIDE and the GATE in the same commit — voice wins, the gate follows. NEVER weaken
what a gate proves (figures, provenance, both-directions fee statements); only reword
the sentence it looks for. Run ALL SEVEN guide/range verifiers (page-shape incl.
PDF staleness + family register, area ranges, granite ranges, glass ranges,
photo-first, guides-page, print header) plus `npm test` — before your first edit
(baseline) and after.

## Mechanics

- Line endings are CRLF — multi-line `\n` matching silently fails; em dashes are
  multi-byte UTF-8. Prefer targeted Edit calls / short Node scripts with explicit
  encodings.
- Em-dash sweep: HTML guides only, PROSE only — do not touch em dashes inside code,
  CSS, comments, or data attributes; and check for en-dashes used as em dashes too.
  Number ranges like "$8,000–$16,000" use EN dashes and are asserted by gates —
  LEAVE RANGES ALONE; the debrief bans the em dash as punctuation, not the en dash
  in a numeric range.
- Rewrites (vault, urn-placement, scattering, outside-marker-rules): the debrief
  gives before/after examples and names the gold-standard guides — read two of those
  models first, match their register. Keep every FACT (prices, fees, rules, the
  install + 50% inspection + $250 admin structure) exactly; only the voice changes.
  Page structure/layout/photos stay; this is prose surgery, not redesign.
- **PDF rebuild is mandatory:** any changed guide requires its PDF rebuilt through
  `scripts/guide-print-system` / `build_guide_pdfs.mjs` on your final bytes; the
  `.build-manifest.json` staleness gate must be green; page caps hold (6 total; the
  seven named 8-page exceptions in the cap map). Print output follows the same voice
  rules (guide-price-rule range wording included — if you reword a range sentence,
  the range verifiers' expectations move with it).
- Eyeball at least the four rewritten guides' PDFs page-by-page (PyMuPDF raster) and
  keep renders in `scratch/s14h-renders/`.

## Definition of done

- Zero em dashes in prose across all in-scope guides (prove with a sweep script whose
  output you quote — count before, count after, exemptions listed); zero "inventory";
  zero "counselor"; the four rewrites read like the gold-standard guides.
- All seven verifiers + `npm run check` + `npm test` green with exact numbers +
  env-pinned commands (worktree wmp-variance expected); all changed PDFs rebuilt,
  staleness gate green; per-suite before/after for every suite your change moved.
- Report: per-guide change summary, every gate expectation you moved and why, the
  before/after em-dash and banned-word counts, anything unverified stated plainly.
