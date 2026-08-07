# Sprint-21 — PCM proofs: singles import, companion top-off, top-of-page restructure

**Opened 2026-08-07. Director: Fable session. Tracks: Opus (operator's word).**
Contract at open: index.html 8 blocks 0 errors; full suite pin 2685/41 (re-measure at
first merge); verify_pcm_catalog 238/0 (BW_BASE-pinned, fresh server).

## Operator brief (2026-08-07, verbatim intent)

Two new folders join the PCM catalog, same no-enhancement regime as the s17 companion
proofs (no upscaling, no masking — these are PCM's own full-colour design proofs, the
highest-quality images we have and PCM's newest designs):

- `D:\Cemetery Photos Misc\PCM SINGLE` — 373 jpgs (PCM 1100-series singles) + PCM's own
  index CSV (`PCM_Headstone_Index.csv`, generic names + public gallery URLs — these
  images are already public on pacificcoastmemorials.com).
- `D:\Cemetery Photos Misc\PCM COMPANION NEW` — 252 jpgs; **230 are repeats** of the 232
  already shipped (operator: keep the uploaded one, no extra work); 10 genuinely new;
  **12 are the s17 PII-held set**.

## Operator rulings at open (all on the record)

1. **RELEASE ALL 12 held proofs** (2500,2501,2503,2504,2506,2508,2509,2510,2514,2515,
   2516,2529). Asked with the PII risk spelled out (real names, exact dates, hometowns,
   portrait photos, public repo); operator chose full release. Mitigating fact found in
   survey: every one of these is already published on PCM's public gallery site.
2. **Two sections at the TOP of the catalog** (singles, then companions), ABOVE the book
   plates — "these are our highest quality images and the newest designs." No bespoke
   per-section subject/language filter UI. Instead they integrate into the EXISTING
   controls: the design-books dropdown gets entries for both sets, the format categories
   include them, and the search bar finds them.
3. **Descriptions by looking.** Every proof gets a short family-friendly description and
   subject tags from the EXISTING vocabulary (data/pcm-subject-tags.json) so they land in
   the same categories as the book designs. The `source: full-colour proof` chip is
   REMOVED ("not helpful to a family").
4. **Language tagging:** designs with non-English (esp. Vietnamese) lettering are tagged
   so families can find Vietnamese design examples (searchable; no dedicated filter).
5. Repeats: the already-shipped file wins; no re-encode, no byte churn on the 232.

## Tracks and waves

Wave 1 (parallel, worktrees):
- **A `s21/import`** — importer generalization: PCM SINGLE class (373) + 10 new
  companions + the 12 released; manifests, byte-deterministic encode, existing 232
  byte-untouched. TRACK-A-import.md
- **B1 `s21/desc-singles`** — descriptions + tags for all 373 singles, by looking at the
  D: sources. Data-only output. TRACK-B1-desc-singles.md
- **B2 `s21/desc-companions`** — descriptions + tags for all 254 companions (232 shipped
  + 10 new + 12 released), by looking. Data-only output. TRACK-B2-desc-companions.md

Wave 2 (after A+B1+B2 merge):
- **C `s21/catalog`** — builder restructure: two sections at top, dropdown + format +
  search integration, chip removal, descriptions on cards, gate re-pin + sabotage.
  TRACK-C-catalog.md

**Merge order: A → B1 → B2 → C.** Suite green on main after each merge.

## Gates

- Gate 0 (director, done): folders surveyed, overlap computed, rulings taken, tree clean.
- Per-track gates in each brief; director re-runs them on merged main.
- Close: verify_pcm_catalog green at new pin on final bytes, full suite green, index.html
  byte-untouched all sprint, renders eyeballed (fold + both new sections + a Vietnamese
  card). NO push pre-authorization — push is a separate operator word.
