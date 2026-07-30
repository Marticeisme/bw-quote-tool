# Sprint-07 — ClearPoint Acrobat-JS fix, Eternal Light 3D map, condensed guide PDFs

Operator request 2026-07-29, three parts, decisions taken at boot via AskUserQuestion:

1. **ClearPoint contract PDF errors on edit** (screenshots: "value entered does not match
   the format of the field [FPTotal / Amount Trusted / fill_60 / FP / Tax]", Plan Total
   showing `$1.#R`). Root cause confirmed by director inspection of
   `pdf-templates/embedded/CP_PDF_B64.pdf`: the template ships a live Acrobat calc chain
   (`/CO`, 6 entries — e.g. `Amount Trusted = AFSimple_Calculate("PRD", ["90%","FPTotal"])`)
   plus AF number-format/keystroke scripts on ~36 fields. The tool fills comma-formatted
   strings; any edit in Acrobat re-fires the chain, which chokes and NaNs (`1.#R`).
   **Operator decision: STRIP the template's field JavaScript from the downloaded PDF**
   (no auto-recalc after manual edits — accepted trade-off).
2. **Eternal Light Columbarium 3D niche map** — same family as MVC/ROAC. Sources:
   `D:\Cemetery Photos Misc\Eternal Light Columbarium (NEW)` — 12 photos (geometry,
   materials, estimated only; NO fabrication drawing, so show no niche dimensions) and two
   screenshots: a layout schematic and a full price/status sheet (ECL-1; South 31,
   North/Front 30, West 12, East 12 = **85 niches**; ECF 10% not included in listed prices;
   O&C $835; Recording $225; #5108 Bronze Scroll $785; Vase with Ring $370).
   **Operator decisions:** price shown ⇒ AVAILABLE, "SOLD" text ⇒ SOLD; cell background
   colors are spreadsheet noise, ignore. Four glass-front sides with CLEAR CORNERS — no
   niche shows on two faces (unlike MVC's corner strips). Niche sizes differ from MVC.
3. **Condensed guide PDFs.** The downloadable PDFs print the full web pages and run up to
   20 pages. **Operator decision: every family guide whose PDF exceeds 4 pages gets a
   compact ≤4-page print layout** (13 guides). Web/screen rendering unchanged; product
   catalogs (All Caskets, Urn Catalog, Keepsake, Metal/Wood Caskets, Cremation Containers,
   GPL) untouched.

## Tracks

| Track | Branch | Files | Model |
|---|---|---|---|
| C — ClearPoint strip | `s07/cp-strip-acrojs` | `index.html` only (ClearPoint generator region ~19100–19400) | Opus |
| E — Eternal Light map | `s07/ecl-map` | NEW `scripts/ecl-niche-data.mjs`, `scripts/build_ecl_map.mjs`, `scripts/verify_ecl_map.mjs`, `MAPS/ECL_NicheMap.html`; one appended card in `guides.html` | Opus |
| G — condensed guide PDFs | `s07/guide-pdf-condense` | the 13 `*-guide.html` print stylesheets, rebuilt `pdf-assets/*.pdf`, appended entry in `docs/BRAND_AND_BUILD_LOG.md` | Opus |

**Parallelism:** C + E spawn together (disjoint files; E in a worktree). G spawns after C
completes and runs in the main tree. Merge order: **C → E → G**.

## Gates

- **Gate 0 (met at boot):** repo clean, `origin/main` level, `npm run check` = 8 blocks 0
  errors; CP template inspected; ECL source sheet readable; operator decisions recorded.
- **Track gates:** per TRACK files. Universal: `npm run check` 8/0; `npm test` counts never
  fall (1300/26 with map repo present, 1298 without); generator baseline 14/14 IDENTICAL
  for Track C (stripping actions must not move a single field value); ECL count gate
  85 = 31+30+12+12 proven against the sheet; guide PDFs ≤4 pages each with price content
  preserved.
- **Close gate (operator):** eyeball ECL map on phone, open a condensed PDF or two,
  download a ClearPoint contract and EDIT the contract number + an amount in Acrobat —
  no warnings must appear. Then push (operator-only).

## Close checklist

1. Director re-runs all gates on merged main.
2. STATE.md updated; MISTAKES.md if warranted.
3. Operator: Acrobat edit test on ClearPoint (the one check agents cannot run — Acrobat
   behavior), phone check on ECL map, then `git push origin main`.
