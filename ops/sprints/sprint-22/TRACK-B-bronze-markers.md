# TRACK B — Bronze marker guide (`s22/bronze-markers`)

You are an Opus track subagent. Work ONLY in the worktree `../bw-quote-tool-s22b`
(absolute: `C:\Users\Martice\bw-quote-tool-s22b`), branch `s22/bronze-markers`.
Obey `ops/SPRINT_GUIDELINES.md` and `ops/DESIGN.md`. Use `git -C <absolute-path>` for
every git command. NEVER push. NEVER edit index.html (you READ prices out of it only).
NEVER write to Firebase.

**Stale-base check first:** worktree HEAD must equal local main's HEAD. If not, STOP and
report. Verify the worktree has `node_modules` (junction) before running suites.

## Deliverable

`bronze-markers-guide.html` — the bronze companion to the granite marker guide. Study
`markers-guide.html` closely: this guide should read and look like its sibling (same
tokens, same masthead/footer pattern, same to-scale drawing idiom if you can reuse it).
Plus its PDF and one card on guides.html under **Markers & Memorials**.

## Voice — BINDING

Same rules as every guide: `docs/GUIDES_VOICE_DEBRIEF_2026-08.md`. First person, plain
sentences, WHY not just what. NEVER em dashes / "inventory" / "counselor" / marketing
copy. Contact/footer blocks copied from markers-guide.html.

## Content (pinned facts)

**Partners.** Bonney Watson orders bronze markers through **Matthews** (Matthews
Memorialization/Bronze) and **Coldspring**. The government bronze match for veteran
spouses is ordered through **Coldspring**.

**The WMP rules — every bronze option and what it must sit on (from WMP Marker Rules &
Regulations; reproduce faithfully, in the voice):**

Single grave, one interment right:
- 24 x 12 Govt. bronze with a 28 x 16 granite or concrete foundation (in Vets or
  Vets North, 24 x 12 on a concrete foundation is the standard)
- 24 x 14 bronze single with a 28 x 18 Barrell Gray granite foundation
- 28 x 16 bronze single, concrete foundation only, unless upgraded to a 32 x 20
  foundation
- 32 x 72 bronze single ledger with a 36 x 76 Barrell Gray foundation

Single grave, two interment rights:
- 24 x 12 Govt. bronze on a 28 x 16 Barrell Gray foundation at the head, plus the same
  again in the center
- Two 24 x 12 Govt. bronzes on one 28 x 38 Barrell Gray foundation
- 28 x 16 bronze companion, concrete foundation only
- 24 x 30 bronze companion with a 28 x 34 Barrell Gray foundation
- 32 x 72 bronze companion ledger with a 36 x 76 Barrell Gray foundation
- 16 x 8 or 18 x 10 bronze second-right marker, placed below the primary headstone only

Companion markers embracing two graves (both plots paid in full):
- 44 x 14 bronze with a 48 x 18 Barrell Gray foundation
- 56 x 16 bronze with a 64 x 20 Barrell Gray foundation
- 60 x 16 Barrell Gray foundation for two 24 x 12 Govt. bronzes (no vase)
- 64 x 20 Barrell Gray foundation for two 24 x 12 Govt. bronzes (6" vase hole)
- 32 x 72 bronze companion full ledger with a 36 x 76 Barrell Gray foundation

Also true: Lake Urn Garden markers are 15 x 10 singles (except pre-placed Williamsburg
companion blocks); infant sections are 18 x 10 (Garden of Verses granite only, so no
bronze there). The pattern to teach: **at WMP, bronze never sits on bare lawn — it is
mounted on a granite (usually Barrell Gray) or concrete foundation, and the foundation
is part of the price below.**

**All-in prices (operator-ruled; source = index.html's qBronze dropdown, pinned here.
RE-READ the dropdown in your worktree's index.html to confirm before publishing — if
any figure differs from this pin, the file wins and you flag it in your report):**

Standard bronze:
- Government Bronze, Match (24x12 bronze on granite foundation) — $3,190
- Installation only, Gov't bronze supplied by the VA — $1,185
- Single 24x14 (no vase) — $4,105
- Single 28x16 concrete foundation (no vase) — $3,830
- Single 28x16 granite foundation (no vase) — $4,820
- Companion 44x14 (no vase) — $7,645 / (with vase core) — $7,860
- Companion 56x16 (no vase) — $9,600 / (with vase core) — $9,755
- Companion 60x20 (no vase) — $12,315 / (with vase core) — $12,475
- Half Ledger (no vase core) — $6,525 / (with vase core) — $6,780
- Full Ledger (no vase core) — $25,060 / (with vase core) — $25,220
- Lake Urn Garden: Bronze Single, Gasser Olds — $2,715; Lake Urn Garden Memorial —
  $2,910; Cremorial Unit (Rose/Lake/Vets Urn Gardens) — $5,670
- 2nd Right Memorial — $2,145
- Lawn Crypt (no vase) — $4,280 / (with vase core) — $4,785

Expressions in Bronze (Matthews' personalized line — sculpted custom artwork):
- Single 24x14 (no vase) — $6,560 / (with vase core) — $6,715
- Single 28x16 (no vase) — $7,170 / concrete foundation — $6,180
- Companion 44x14 (no vase) — $10,055 / (with vase core) — $10,275
- Companion 56x16 (no vase) — $11,175 / (with vase core) — $11,330

There is also a Veterans optgroup in the same dropdown — read it and include what fits.
Prices are all-in the same way the granite guide's are (marker + foundation + install);
say so. Present a granite-vs-bronze paragraph consistent with markers-guide.html and
outside-marker-rules.html: granite wins on personalization (colors, photos, etching);
bronze is the traditional cast look, the government match, and the Expressions line.

**The government bronze match story (must be its own section with an image):** a veteran
buried with a free Government bronze from the VA gets a 24 x 12 bronze; when the spouse
wants a MATCHING headstone, BW orders a matching 24 x 12 government-style bronze through
Coldspring, mounted on a granite or concrete foundation — $3,190 all-in, or $1,185 to
install one the VA supplies. The image for this section must show a government-style
bronze marker.

## Imagery (operator-ruled: pull from the vendors' public sites)

Create `bronze-images/`. Source representative design photos from Matthews
Memorialization (matw.com / matthewsbronze product imagery) and Coldspring
(coldspringusa.com), including at least: one classic single bronze, one companion
bronze, one Expressions in Bronze style example, and one government-style bronze for
the match section. Rules:
- Verify magic bytes on every download (a saved HTML error body as .jpg is a known
  scar); re-encode to webp at sensible web sizes (~1200px max, keep the folder small).
- Credit the source vendor in a caption or small print line ("Design example, Matthews"
  / "Coldspring") — these are partner products we sell.
- If you cannot obtain a usable image for a slot (watermark, quality, blocked), leave a
  clean placeholder block and FLAG it in your report — do not fabricate or AI-generate
  imagery, and do not ship a watermarked file.

## Page + PDF mechanics

Same pipeline as every guide:
- Register in `scripts/guide-print-meta.mjs` GUIDES; build job → `pdf-assets/Bronze
  Markers.pdf`; target ≤6 pages, cap registered in `verify_guide_pages.mjs`.
- Satisfy `verify_family_type.mjs`; print tables must not clip
  (`verify_table_alignment` check C); no column-span:all after a page break.
- guides.html: ONE card under Markers & Memorials (data-name terms: bronze marker
  matthews coldspring government match veteran spouse foundation barrell gray
  expressions companion ledger). Touch nothing else there.
- CRLF repo: never match multi-line content with bare `\n` in scripts.

## Verification (quote outputs verbatim)

1. `npm run check` → `index.html: 8 blocks, 0 errors`
2. `npm test` → `2842 passed, 0 failed across 42 suites` (never overlap a running suite)
3. `node scripts/verify_guides_page.mjs`
4. `node scripts/verify_guide_pages.mjs`
5. `node scripts/verify_family_type.mjs`
6. PDF manifest 0 stale / 0 missing after your build
7. `git -C <worktree> diff --stat main -- index.html` → empty
8. Rasterize the PDF and eyeball every page; renders to `scratch/s22-b-renders/`.
   Every image renders (no broken slots), every price matches the pin or is flagged,
   no em dashes in prose, foundations named on every bronze option.

Commit locally on the branch with tag `[s22/bronze-markers]`, explicit paths only, NO
co-author trailers (operator standing rule 2026-08-08). Report per SPRINT_GUIDELINES
rule 8.
