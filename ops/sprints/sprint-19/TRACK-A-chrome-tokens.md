# TRACK A — chrome-tokens (`s19/chrome-tokens`, index.html only)

Read first: `ops/SPRINT_GUIDELINES.md`, `ops/DESIGN.md`, `ops/sprints/sprint-19/SPRINT.md`,
`ops/sprints/sprint-19/DESIGN_HANDOFF.md` (the spec — implement its values VERBATIM),
`docs/UI_RESEARCH_2026-08-06.md` §1 (the code map with line anchors).

## Mission

Handoff steps 1–3 in index.html: (1) the `:root` token block + unify the app's drifted
palette (`#14304a` navy family, `#E5480F` orange, and the ~200 hardcoded hexes the map
lists) onto the handoff ramp; (2) rebuild the fixed summary panel per the handoff's 1:1
mockup (total block with the app's ONLY 30px type, 3-line item preview + "+N more",
ranked actions: **Download PDF = orange primary** (operator's call), Save secondary,
Print/Copy quiet pair, Reset = confirm-gated text link, empty state same-layout); (3)
the four-rank button system app-wide (emoji out of button labels; 15px Lucide glyph only
where ambiguous).

## Hard constraints

- Geometry unchanged: `.summary-fixed` stays `position:fixed; width:260px` and the
  292px `padding-right` coupling on the three quote sections stays as-is.
- SEALED: `_printQuoteCSS` (~line 8777), `_FQ*` (~8840+), `_buildQuotePDF`, all print
  window template strings, the contract-generator code (RIC/GA/CP/CIRGAS), sidebar
  width 264px, `.section{display:none}` switching, `data-lc` icon spans (restyle
  their containers, never strip attributes).
- App CSS lives at lines ~9–429 + appended block ~20352–20392. Beware: 226 JS-set
  inline styles win over CSS — check `.style.` writes before assuming a class change
  lands; heavy inline-styled markup (sign-in gate 631–650, Home quick-launch, compare
  panel ~850) may need inline edits. `--gold`/`--gold-light` are aliases still
  referenced by `.callout-gold` + Print Comparison button — repoint, don't delete.
- The three summary-panel instances are keyed `data-for` at ~2225 (cem), ~2970 (fh),
  ~4182 (combined) — all three get the treatment; the JS that writes totals/lines into
  them must keep working (adapt the JS's target elements if you restructure markup —
  find the updaters by grepping the summary element ids/classes).
- The "+N more items" line preview is NEW behavior: derive it from the same data the
  existing summary-line renderer uses; keep it dumb (first 3 lines + count).
- index.html is CRLF; `</body>` occurs in template strings (lastIndexOf). Targeted
  edits only. No pushes. Commit to `s19/chrome-tokens` with explicit paths,
  `[s19/chrome-tokens]` prefix, Opus co-author line.

## Steps

1. Stale-base check: `git -C <worktree> merge-base --is-ancestor <local main HEAD> HEAD`
   — if the worktree branched from origin/main instead, reset onto local main first.
   Junction/install node_modules.
2. BEFORE screenshots (Playwright headless, repo root, dev server on a free port with
   BW_BASE pinned; hide `#bwGate` via style.display for captures; NEVER call save/persist
   functions — Firebase is production): home, cem builder top, summary panel, fh builder,
   a saved list. Save to `scratch/s19-a-renders/before/`.
3. Insert the handoff token block into the main `<style>`; migrate existing var
   definitions/aliases onto it; sweep hardcoded hexes (the research doc lists the hot
   spots: sidebar 56–70, icon chips 81/115/121, zebra 89–90, placeholders 47/161–162,
   hero 238 (dead — delete with its markupless friends `.site-header`/`.hero*` per map),
   gate/home/compare inline styles).
4. Summary panel + buttons per handoff CSS. Reset gets `confirm()` if it lacks one.
5. AFTER screenshots, same views, `scratch/s19-a-renders/after/`.
6. Family-quote parity proof: generate a cemetery quote PDF via the existing test
   harness (`tests/test-family-quote-subtotal.mjs` covers parity — run it and quote) and
   rasterize page 1 before/after your diff (PyMuPDF) — byte-identical or pixel-identical
   required. The PDF path must be untouched by your diff (grep your diff for `_fq`,
   `_print`, `_buildQuote` — expect zero hits).

## Verify (quote verbatim in report)

- `npm run check` → `index.html: 8 blocks, 0 errors`
- `npm test` → full counts (pin from SPRINT.md Gate 0; must not fall)
- The parity suite line, the zero-hit greps, before/after screenshot listing.

## Report

Shipped, branch+commits, verbatim outputs, files changed, decisions & open questions,
what the director must eyeball (screenshot pairs).
