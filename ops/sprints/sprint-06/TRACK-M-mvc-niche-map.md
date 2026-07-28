# TRACK M — MVC glass-front niche map: June 2026 update

You are a build track for sprint-06 of the BW Quote Tool
(`C:\Users\Martice\bw-quote-tool`). Obey `ops/SPRINT_GUIDELINES.md` and `ops/DESIGN.md`
(especially §6 — map-data hygiene). Branch: **`s06/mvc-niche-map`** from current `main`
in the public repo. The map repo half is committed in ITS OWN repo (see below).

## The job

The authoritative source is **`reference-docs/internal/MVC_New_Glass_Front_Niches.pdf`**
("Prices effective: June 2026", 1 page, local-only — NEVER commit it or copy it into a
tracked path). Update both representations of the MVC new glass-front niche island to
match it exactly:

1. **`MAPS/MVC_NewGlassFront_NicheMap_1.html`** — the LIVE published page (GitHub Pages,
   linked from the guides). This is what Martice means by "change the locations".
2. **`wmp-cemetery-map/data/mausolea/MVCN.json`** — the internal map's dataset, built
   from the old version of that page. Operator ruled 2026-07-28: sync both so they never
   disagree.

## What the June 2026 PDF changes (director's recon — a LEAD, re-derive it yourself)

- **Wall naming now carries MIS location strings and compass directions:**
  Back Wall (East) = `MVC-ISL-E-Level-Space`; Side A (North) = `MVC-ISL-N-Level-Space`;
  Side B (South) = `MVC-ISL-S-Level-Space`; Front Wall (West) = `MVC-ISL-W-Level-Space`.
  The live page currently says Back/North/South/"Front Wall (Entry)" with no MIS strings.
- **Prices changed** (e.g. the live page has 3×$48K; the PDF has 2×$48K on the East wall
  and 2×$42K D/E companions on the West wall; West-wall G-level is $7K vs East's $8K).
- **Rights-per-niche is color-coded** in the PDF (pink = (4) rights D/E companions;
  blue / green / light-blue classes = (2) rights). Carry whatever legend the live page
  needs so a reader can tell rights classes apart.
- The West (front/entry) wall has **black void cells** where the entry opening is.
- The PDF's footer: "Prices effective: June 2026" and "Individual niche dimensions are
  available in MIS/Enterprise (Advantage\Cemetery\Property)".

Extract the PDF's full ref→price grid yourself with PyMuPDF (text + a rendered image —
the Read tool cannot open PDFs in this environment; render to PNG and look). Build a
machine-readable extraction (scratch script) and work from that, not from eyeballing.

## Requirements

### The live HTML page
- Preserve the page's existing structure/style conventions (read it first) — this is an
  update, not a redesign. Update wall titles, MIS location lines, per-niche prices, any
  layout deltas (voids, spans), the rights legend, and the effective date.
- Every niche ref and price on the page must match the PDF **1:1 — proven by a script**
  that parses both your updated HTML and the PDF extraction and diffs them (0 mismatches,
  and counts per wall equal). Quote that output verbatim in your report.
- Render the updated page (Playwright, headless, from the repo root) and LOOK at it next
  to a rendering of the PDF. Counting is necessary and not sufficient (ops/MISTAKES.md
  #15/#16).

### MVCN.json (map repo — separate git repo, no remote)
- Current shape: 146 units, walls `BW`(51)/`NW`(23)/`SW`(23)/`FW`(49), units carry
  `x/w/h/lvl/sp/ref/price/urns/dim/status/occ/loc`. Keep the x/w/h unit-size model and
  the invariant that every level covers its wall's full column count exactly.
- Update prices (and layout if the PDF's differs from the stored geometry), wall labels,
  and the `source`/`note` fields to name the June 2026 PDF. Record the E/N/S/W ↔
  BW/NW/SW/FW correspondence explicitly in the wall metadata (do not silently re-key
  walls — `loc` strings like `Bldg-MVCN Wall-BW Lvl-G Sp-6` are existing keys; if you
  believe re-keying to MIS names is right, do it consistently INCLUDING sid-index
  implications, or keep keys stable and add the MIS string as a field — state which you
  chose and why).
- **`status` and `occ` are hand-maintained truth (recent sales) — they must survive
  untouched.** Prove it: before/after diff shows only the fields you intended.
- `urns` (rights per niche) must agree with the PDF's color legend.
- Map repo gates: `npm test` in `wmp-cemetery-map/` green — `19 passed` +
  `2/2 unit files valid, 2770 units checked, index ok` (counts may rise, never fall).
- Commit in the map repo with `git -C C:\Users\Martice\bw-quote-tool\wmp-cemetery-map`
  (ALWAYS `-C`, never a bare `git` after `cd`), explicit paths, local only — that repo
  has no remote and must never get one.

### Hygiene (absolute)
- **Nothing from `wmp-cemetery-map/` data may enter the public repo** — no names, no
  occupancy, nothing derived. (MVCN has no occupants today; the rule still stands.)
- Public-repo work: branch `s06/mvc-niche-map`, stage EXPLICIT paths only, commit
  locally, **never push**, never touch `main`, never touch `index.html`.
- `.gitignore` stays as-is. The source PDF stays in `reference-docs/internal/`.
- Check `git rev-parse --abbrev-ref HEAD` before every commit.
- Commits: `[s06/mvc-niche-map] <imperative>` +
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## Verify (quote outputs verbatim in your report)

1. `npm run check` → `index.html: 8 blocks, 0 errors` (you changed nothing there; prove it)
2. `npm test` → counts vs `1300 passed, 0 failed across 26 suites`; never fall
3. Your HTML↔PDF diff script → 0 mismatches, per-wall counts
4. Map repo `npm test` → green, counts quoted
5. MVCN before/after field-level diff → only intended fields changed; statuses preserved
6. Rendered screenshots examined — say what you looked at and what you saw

## Report

Per `SPRINT_GUIDELINES.md` rule 8: shipped, branch+commits (both repos), verbatim gate
outputs, files changed, decisions & open questions, what the director must verify by hand.
