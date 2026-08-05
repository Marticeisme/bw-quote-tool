# Per-guide PDF audit

25 family-guide PDFs, from `pdf-assets/.build-manifest.json`. The six catalog PDFs
(All / Metal / Wood Caskets, Urn Catalog, Keepsake Urns, Cremation Containers) are out of
scope — Martice: *"anything that's catalog based does not need you to look at."*

**Target** is the condensed `?print=family` build. **Now** is the current page count
(`verify_guide_pages.mjs` caps, or the built file). Work top to bottom — the first eight
are what actually get emailed.

---

## Tier 1 — emailed constantly. Do these first.

| Guide | Source | Now | Target | What to cut |
|---|---|---|---|---|
| **Pre-Planning Guide** | `pre-planning-guide.html` | 6 | **2** | Drop the 8-card *Decisions to Make* grid to 4. Keep the 3-step process — it is the clearest thing in the guide. FAQ 5 → 2. Cut §4 Cremation & Burial Options entirely; it duplicates *Cremation or Burial*. **Add a photograph** — this guide currently has none, and it is the first thing a family receives. |
| **Cemetery Property Guide** | `cemetery-property-guide.html` | 4 (8pt, 2-col) | **2** | See the reference build. Keep §1 (interment rights), the five property cards, the charge list, endowment care, 2 FAQ. Drop §3 capacity, §6 owning over time, §7 why prices rise. |
| **Cremation or Burial** | `cremation-or-burial-guide.html` | 6 | **2** | The comparison table is the whole document. Keep it, one page. Second page: where cremated remains can go, with photos, and the next step. |
| **Cremation Guide** | `cremation-guide.html` | 6 | **2** | Plans and pricing only. Containers, caskets, rental caskets and urns all have their own catalogs — link, don't reprint. Two paragraphs are hard-coded `font-size:14px`/`13.5px` inline (see `guide-print.css` §7); fix at source. |
| **Burial Guide** | `burial-guide.html` | 6 | **2** | Keep: what to do when a death occurs, burial vs. entombment, death certificates. Drop the casket and vault sections to links. |
| **Direct Cremation Plan Example** | `direct-cremation.html` | 2 | **2** ✓ | Closest to right already. Raise type to 10.5pt and confirm it still holds 2 pages. |
| **Urn Gardens** | `urn-gardens-guide.html` | 1 | **1** ✓ | Works. The one-page infographic is the format everything else should aspire to. Leave alone except type size. |
| **Who Decides** | `who-decides-guide.html` | 6 | **2** | Legal authority order is a list — set it as one. Keep the WA statute reference verbatim. |

## Tier 2 — property guides. Photos carry these.

| Guide | Source | Now | Target | Notes |
|---|---|---|---|---|
| **Granite Niches** | `granite-niches-guide.html` | 8 | **8** hold | Already re-cut in s13 at 9pt for the photos. Do not shrink. Verify the crops Martice flagged are actually fixed. |
| **Glass-Front Niches** | `glass-front-niches-guide.html` | 8 | **8** hold | Same. |
| **Rock of Ages Columbarium** | `roac-guide.html` | 8 | **3** | Photo-led area guide. A family looking at one columbarium does not need eight pages. Page per: the courtyard, the faces, what it costs. |
| **Mountain View New Glass-Front** | `mvc-niches-guide.html` | 8 | **3** | Same shape. |
| **Eternal Light Columbarium** | `ecl-guide.html` | 8 | **3** | Same shape. |
| **Garden of Meditation Niches** | `gomn-guide.html` | 8 | **3** | Same shape. Keep the Interlude Urn requirement and the two rules — those are the questions. |
| **Terrace Garden Memorial Path** | `terrace-garden-guide.html` | 8 | **3** | Same shape. Nine individual memorials → one photo grid, not nine sections. |
| **Urn Placement Options** | `urn-placement-guide.html` | 6 | **2** | This is a comparison document. One page of photo cards with ranges, one page of the comparison. |
| **Scattering Garden Pricing** | `scattering-guide.html` | 6 | **1** | Three plans. It is a price sheet. One page. |

## Tier 3 — reference and specialist.

| Guide | Source | Now | Target | Notes |
|---|---|---|---|---|
| **Veterans Guide** | `veterans-guide.html` | 6 | **2** | VA benefits + the two veterans sections + what is free. Marker options link out. High-value, frequently emailed — treat as Tier 1 if Martice agrees. |
| **Medicaid and Planning Ahead** | `medicaid-family-guide.html` | 6 | **2** | Family-facing. Plain language, no citations. |
| **Medicaid Professional Reference** | `medicaid-professional-reference.html` | 6 | **6** hold | **Do not condense.** Audience is case workers and attorneys; WAC/RCW citations are the product. Only fix type size and drop the two-column flow. |
| **Granite Marker Sizes and Colors** | `markers-guide.html?part=sizes` | 3 | **2** | Fix the section-number gap (1,2,3,4,**8**). Drop the "Design Inspiration" section — it is a link, not a page. The scale-drawn size cards are excellent; give them room. |
| **Marker Photos and Etching** | `markers-guide.html?part=photos` | 3 | **2** | Same numbering fix. |
| **Outside Marker Rules and Pricing** | `outside-marker-rules.html` | 3 | **2** | Rules document — keep it complete, just legible. |
| **Burial Vault Guide** | `vault-guide.html` | 3 | **2** | Uses `.hero`, not `.cover` — the one guide off the shared masthead pattern. Bring it in line while you are here. |
| **Terramation Guide** | `terramation-guide.html` | 6 | **2** | Process, ceremony, where the soil can go, cost. Return Home partnership stays. |
| **General Price List** | (not built here) | 17 | **17** ✓ | Regulatory document. Never touch. |

---

## Cross-cutting defects to fix once

- [ ] Section numbers are hard-coded markup — generate them or remove them, or every
      selection leaves a gap.
- [ ] `.contents` (In This Guide) still prints in `?part=` mode on `markers-guide.html`.
      Confirm it is hidden in every mode.
- [ ] Two-column flow (`column-count:2`) removed everywhere.
- [ ] Nineteen `/* === PRINT CONDENSE === */` blocks deleted; `guide-print.css` §7
      deleted with them.
- [ ] Body type ≥ 10pt asserted in `verify_guide_pages.mjs`.
- [ ] Every `pf-card` price carries a range or a band — audit for `pf-ask`.
- [ ] Every condensed PDF ends with Martice's contact block. No "see the full guide
online" panel — the guides site is not public.
- [ ] Rasterise each rebuilt PDF and look at it before reporting done.
