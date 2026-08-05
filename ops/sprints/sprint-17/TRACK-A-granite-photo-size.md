# TRACK A — Granite Niches guide: photos render too small (s17/granite-photo-size)

You are a track agent in an isolated git worktree. Repo: BW Quote Tool (public GitHub
Pages repo; CRLF line endings; never `git add -A`, stage explicit paths only).

**FIRST: stale-base check.** Run `git log --oneline -1`. Your HEAD must be `4203070`
("[s16/ops] Record the push + live verification") or a descendant of it. If your
worktree branched from anything older (origin/main lag), reset your branch onto local
main before touching anything, and say so in your report.

## The complaint (operator, 2026-08-05, with screenshots)

The Granite Niches guide's photos are too small. His screenshots show the PRINT/FAMILY
layout (cream sheet, "BONNEY WATSON FAMILY GUIDE" kicker): a portrait photo of the
Rock of Ages wall renders ~2.7in tall and narrow-centered on a full-width page, and the
TGMP terrace portrait shot the same. Root cause is in the guide's own embedded print
CSS: `.figure img{max-width:100%;max-height:2.55in;…;margin:0 auto}` (and 2.75in for
`.figure-pair`) — a box, not a crop, which is correct policy, but the box is far too
small for portrait-orientation photographs. On screen, `.figure-tall{max-width:330px;
float:right}` is also small.

## The job

Make the photographs in `granite-niches-guide.html` read at a usable size on BOTH
surfaces — the browser page, the Ctrl+P print, and the downloaded family PDF — without
reintroducing crops:

- **Never reintroduce `object-fit:cover` or any crop.** The box model stays
  (max-width/max-height, width/height:auto). The s13 crop scar comments in the file
  explain why — keep them, update them if the numbers change.
- Raise the print photo boxes substantially (think 3.5–4.5in max-height for portrait
  singles; use your eyes, not a number I picked). Landscape shots should run the full
  column width. A portrait single centered at a bigger size is fine.
- Screen: `.figure-tall` at 330px is small on a 960px sheet — enlarge or drop the
  float. Your call, verified by looking.
- Page-count reality: the family PDF and the print cap (this guide has the 8-page
  per-guide exception in PER_GUIDE_CAPS, family cut is condensed per s16) may grow when
  photos grow. Bigger photos are the operator's explicit priority. If a page target
  must move, move it CONSCIOUSLY in the gate/caps with a comment, and put the
  before/after page counts in your report. Do not shrink photos to protect a cap.

## Constraints and gates

- Scope: `granite-niches-guide.html` (its own embedded screen+print CSS), its rebuilt
  PDFs under pdf-assets, and any cap/gate values that must consciously move. Do NOT
  touch shared `guide-print.css` global rules — if you need a shared-file change, use
  the `body[data-guide]` per-guide scoping mechanism (s13 precedent) or stop and report.
- Do NOT touch index.html, contract generators, or other guides.
- Gates that must be green on your final bytes (run them, quote the exact commands):
  `node scripts/verify_family_type.mjs` (111-assert lock-in: ≥10pt prose, one column,
  no column-span — your photo work must not disturb type), `verify_granite_niche_ranges`,
  `verify_guide_pages` (incl. PDF staleness — rebuild this guide's PDFs),
  `verify_photo_first`, and the full `npm test` (expect 2425/37 baseline; if your cap
  change moves a number, reconcile it exactly in your report).
- **Verify by looking** (binding practice): rasterize the rebuilt family PDF and the
  full print PDF (PyMuPDF or pdf.js under Playwright, run from repo root; the Read tool
  cannot open PDFs) and EYEBALL every page. Also screenshot the screen page at desktop
  and mobile widths via Playwright headless. Keep renders in `scratch/s17a-renders/`.
- Syntax check before any commit (the repo-standard node one-liner from CLAUDE.md).
- Line endings CRLF; multi-line script matches must use \r?\n.
- Commit on your branch with explicit paths. Do NOT push. Do NOT merge.

## Report back

Root cause confirmed/corrected, exact CSS deltas, page counts before/after per PDF,
gate outputs (exact commands + pass counts), render paths you eyeballed, anything you
could not verify, honest flags.
