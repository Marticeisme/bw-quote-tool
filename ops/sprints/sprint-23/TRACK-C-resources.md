# TRACK C — s23/resources (death-cert worksheet + guides quick-jump)

You are a track subagent in sprint-23 of the BW Quote Tool. Obey
`ops/SPRINT_GUIDELINES.md` and `ops/DESIGN.md` (read both first). Working
directory: worktree `C:\Users\Martice\bw-quote-tool-s23c` (already created,
branch `s23/resources`, node_modules junctioned). ALWAYS
`git -C C:\Users\Martice\bw-quote-tool-s23c`. Commit locally; NEVER push. Stage
explicit paths only. **You do NOT touch index.html or pcm files** — other tracks
own them.

**Stale-base check FIRST:** base commit must be `fbeefab7` or a descendant.

## Fix 1 — Vital Information Worksheet (`vital-worksheet.html`, operator issue 6)

The page (723 lines; at-need/pre-need modes) builds its PDF from scratch with
pdf-lib in `saveFillablePDF()` (lines 454–712). Two defects:

### (a) Checkboxes scattered in the PDF — CONFIRMED root cause

The screen→PDF pre-fill maps by POSITIONAL INDEX (lines 461–464): all
`.sheet input[type=checkbox]` zipped against `CHECK_KEYS` (449–452, 53 keys).
The DOM has 55 checkboxes — the "Sex at birth" Male/Female pair added 2026-07-27
at lines 128–131 was never added to CHECK_KEYS, so every checkbox from index 4
on is off by two and the last two fall off the end.

Fix properly, not by re-counting: give every checkbox AND text input in `.sheet`
a `data-key` attribute; build `chkByKey`/text values by key lookup, killing the
positional pattern for both (TEXT_KEYS at 444–448 currently matches by luck).
Add `sex_birth_male`/`sex_birth_female` keys and a PDF block for them in BOTH
layout engines if the field belongs in both modes (check the mode gating at
lines 123–131; if the sub-group is at-need-only, only `buildTwoCol` needs it —
say which in your report). Keep key names stable for the 53 existing keys.

### (b) No input auto-formatting

- **Phone:** port the live mask pattern from index.html:20572–20592
  (`formatPhoneInput` — digits only, cap 10, re-render `(XXX) XXX-XXXX` per
  keystroke) into vital-worksheet.html for every phone input.
- **Dates:** the page uses bare text inputs with `MM/DD/YYYY` placeholders
  (e.g. DOB line 135). Add a typed mask: digits auto-insert the two slashes
  (2→2, 4th digit→`MM/DD/`…), cap 10 chars, allow backspace through
  separators. Do NOT switch to `<input type="date">` — the page prints and the
  operator types dates as MM/DD/YYYY; keep the visible format identical.
- **SSN (line 136):** same treatment, `XXX-XX-XXXX` mask. Cheap, same pattern,
  obviously wanted alongside.
- Masks must not break the PDF transfer (values flow through as displayed).

### Verify (Playwright, headless, from repo root)

Serve via dev server (own port if 3737 busy — never stop a server you didn't
start). Script: check every relevant box on the page with a distinct pattern,
fill texts, run `saveFillablePDF()`, capture the produced PDF bytes, and with
pdf-lib assert EVERY checkbox field's checked state matches its DOM source BY
KEY (both modes). Rasterize one page per mode (pdf.js or PyMuPDF) and eyeball
the render yourself — checked boxes must sit beside their own labels. Assert the
masks: type raw digits into phone/date/SSN, assert formatted values. Note: the
page loads pdf-lib from CDN at runtime (line 413) — Playwright needs network, or
route the CDN request to the local vendored copy; say what you did.

## Fix 2 — Guides quick-jump nav (`guides.html`, operator issue 7)

guides.html (579 lines): 7 `.category` blocks (Getting Started 16, Burial &
Cremation 4, Markers & Memorials 5, Caskets/Urns/Vaults 7, Maps 10, Letters &
Forms 4, Sample Quotes 1 — 47 cards), a search input (`#filterInput`), no
anchors, no category nav.

Build a category quick-jump: a pill row (label + count per category) that
scrolls to the category. Copy the proven pattern from
`pcm-design-catalog.html:490-496` (`.contents` pill anchors, styled per
`build_pcm_catalog.py:178-180`), restyled with guides.html's own tokens. Make it
sticky under the header if that reads well at both desktop and phone widths —
your call, show renders. Requirements:

- Add `id` attributes to the 7 `.category` divs (they have bare `data-cat`
  today, line 174 etc.).
- Pills also act as filters is NOT required — anchor-jump only; the search box
  already matches category names via `_hay` (script at 548–577).
- Hide the nav in the print stylesheet (the `.search` hide-list, line ~140).
- **`scripts/build_guides_page.py` is ROTTED** (its CARD_RE predates
  `.guide-cardtop`; cards are hand-edited now — s22 finding). Hand-edit
  guides.html like the last two sprints did. Do NOT run the builder. If your
  change would break a future builder run, note it in the report; do not
  attempt to fix the builder (out of scope).
- Update `scripts/verify_guides_page.mjs`: keep every existing assertion
  passing (`.category` line 40, `.cat-count` 42, `.guide-card` 43/55, search
  simulation 108) and ADD assertions pinning the nav: 7 pills, each href
  resolves to an existing category id, counts match card counts. Suite count
  must rise, never fall.

### Verify

- `node scripts/verify_guides_page.mjs` green, quote the output.
- Playwright: click each pill, assert the target category's heading is in the
  viewport; render screen + print-emulation screenshots (the nav must be absent
  in print).

## Fix 3 — MID-SPRINT AMENDMENT (operator, in-chat 2026-08-15): printing the
## worksheet page directly must match the fillable PDF (2–3 pages max)

Printing vital-worksheet.html straight from the browser (Ctrl+P / the HTML
link) currently spans too many pages. Requirement: the direct print matches
the fillable PDF's layout economy — **hard cap 3 pages, target 2** — in both
modes. Approach is yours (print stylesheet: two-column at-need like
`buildTwoCol`, compact type ≥ the readability floor, kill dead vertical space,
hide chrome/buttons; keep every field and label present and legible). Verify
with Playwright `page.pdf()` per mode, assert the page counts, rasterize and
eyeball every page, add renders to scratch/s23-c-renders/. Known scars that
apply: `break-after: avoid` is ignored before unbreakable blocks (use
keep-together wrappers); a `<script>` inside a document.write'd window never
runs; `column-span: all` after a page break strands empty pages.

## Track-wide gates (verbatim in report)

- `npm run check` → `index.html: 8 blocks, 0 errors` (you didn't touch it — the
  gate still runs)
- `npm test` → green, ≥ 2854; pin the number. (verify_guides_page.mjs runs from
  the push hook, not npm test — run it yourself and quote it.)
- No production Firebase traffic; the worksheet page has no Firebase — keep it
  that way.

## Report format

Per SPRINT_GUIDELINES rule 8. Include renders (screen + print + one rasterized
PDF page per worksheet mode) under scratch/s23-c-renders/ in the worktree, and
list them; the director copies them out for the operator eyeball.
