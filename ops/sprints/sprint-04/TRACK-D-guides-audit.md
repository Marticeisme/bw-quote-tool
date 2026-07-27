# TRACK D — Guides audit and corrections

**Branch:** `s04/guides-audit` (already created). **Working directory:**
`C:\Users\Martice\bw-quote-tool-guides` — a git worktree, already set up with a `node_modules`
junction. **Use `git -C C:\Users\Martice\bw-quote-tool-guides` for every git call**; a bare `git`
in a stale shell has reset a branch mid-merge on this project before.
**Model:** Opus. **Read first:** `ops/DESIGN.md`, `ops/SPRINT_GUIDELINES.md`,
`ops/sprints/sprint-04/SPRINT.md`, and `docs/BRAND_AND_BUILD_LOG.md` (brand tokens, the card
contract, image conventions — **read it, do not rewrite it wholesale**).

**Runs ROADMAP milestone S9.** You are running in parallel with Track A, which is editing
`index.html` in a different tree. **You must not touch `index.html`.** Not once, not to read a
price out of it — if you need a number from the tool, read it and say so, but never edit it.
That file is the one place your two tracks could collide.

This work came from a written punch list the operator supplied on 2026-07-27
(`E:\Downloads\Guids Issues 07.25.26.docx`). Twenty-one items, below, in his priority order as
best it can be inferred. Several are content corrections in his own words — where the wording is
his, keep his meaning exactly and improve only the prose.

**Everything under "Director recon" is a LEAD, not a finding.** Verify before relying on it.

---

## Director recon — verified 2026-07-27, but check it anyway

- **Every passage he quoted exists where expected** in `veterans-guide.html`: the "Distance from
  Seattle" row at `~348`, "and they are usually the larger half of the two" at `~366`, "One
  conversation covers both" at `~381`, and the VA-emblem heading at `~478`.
- **`outside-marker-rules.html` is not registered in `scripts/build_guide_pdfs.mjs`** (the list
  at lines ~15–28). That is precisely why it has no PDF option — item 11 is a one-line
  registration plus a build and a check, not a mystery.
- **`markers-guide.html` has 10 tables; `vault-guide.html` has 3.** `cemetery-property-guide`,
  `burial-guide` and `scattering-guide` have none, so the "multiple tables across the resources
  guide" he refers to are almost certainly the marker guide's ten. Confirm rather than assume.
- **None of the marker guide's tables use `<thead>`/`<tbody>`,** and none carry the `data-label`
  attributes the veterans guide uses for responsive collapse. That is a strong candidate for the
  misalignment, and it is a rendering question — **you cannot diagnose it by reading source.
  Render it.**
- **A counted anomaly he did not report, which you should check against the price book.** In
  `markers-guide.html` `SINGLE-SPACE MARKERS`, every row runs Group 2 > G1 Tariffed > G1
  Non-Tariffed — except `32″ × 20″`, where G1 Tariffed is `$4,146.62` and Group 2 is `$3,875.04`.
  That is the shape of two values swapped between columns. **Do not "fix" it by assumption.**
  Check it against `E:\Downloads\2026 PCM Markers Price Book EFF 03.01.2026.xlsx` (2.7 MB,
  effective 2026-03-01) and report what you find. If the price book confirms a swap, fix it and
  say so loudly — it is a live price on a family-facing document. If the price book disagrees
  with the guide in either direction, **stop and escalate; do not change a price on your own
  judgement.**

---

## The 21 items

### Tables and layout

**1. Audit every table for column alignment.** His words: *"Tables for the marker guide are not
over the right amount, 2220 should be directly under color etc etc. this happens across multiple
tables across the resources guide please audit."* The symptom is values not sitting under their
header. Render each guide — **HTML at print width and the built PDF** — and measure: for every
table, assert that each cell's horizontal centre falls within its header's column bounds. Write
it as a check that runs, not a look. A guide where a price sits under the wrong heading is a
family reading the wrong number.

**2. `vault-guide.html` PDF: fit all urn vaults on one page.** Shrink sizes slightly. Measure
before and after — state the page count both ways.

**3. `vault-guide.html` "Pricing at a glance": condense to one page, and remove the service
fees.** His words: *"The setting fees for each vault take up half the page. I don't think service
fees need to be in this guide at all. It should only be a vault guide. Those service fees would
be discussed formally at any arrangement."*

> **SCAR — read this before you delete anything.** On 2026-07-26 a session removed seven prices
> from this exact guide as "discontinued", and two of them — the **$685 and $575 setting fees** —
> turned out to be live in the quote tool as components of the Standard Arrangement bundles.
> Commit `c7d521a` put them back. Removing them **from the guide** is presentation and is what he
> is asking for. **Removing or altering anything in the tool's pricing is not in your scope and
> would under-quote every standard arrangement on a signed contract.** You are not touching
> `index.html` at all, which is the structural guarantee — keep it that way.

**20. Print/PDF headers are too large.** His words: *"the header for all of the files when
printing or downloading to pdf should be a lot smaller. it is fine in html format but on print or
pdf it takes too much of a page up."* Fix in the print stylesheet only — the on-screen HTML must
not change. Report the reclaimed vertical space in millimetres and the page-count delta per
guide. **Do not touch `index.html`'s print CSS**; the tool's own header is a separate item held
for a later sprint.

**21. `direct-cremation.html` should be exactly 2 pages.** Page 1: the quote and the information
about it. Page 2: the cremation container, shown and explained. Assert the page count.

### Catalogs

**4. Cremation sorting on the casket catalogs.** `wood-caskets.html` and `all-caskets.html` gain
a facet for caskets that can be **cremated in full** — as opposed to using a cremation container
or a rental casket. **The authoritative list is `cremation-guide.html` §5, anchor `#caskets`,
"Caskets Suitable for Cremation"** — he confirmed those names are correct, so read them from
there rather than asking. The same caskets must also appear in
`cremation-containers-rental-caskets.html`. Match on name; **report any name in §5 that has no
match in a catalog, and any near-miss you resolved**, rather than silently fuzzy-matching.

**13. Urn catalog facets.** `urns-guide.html` gains sorting by **scattering** and by **urns for
ground burial**. Names come from `cremation-guide.html` §7 (`#urns-burial`, "Urns for Ground
Burial") and §9 (`#urns-scatter`, "Urns for Scattering & Biodegradable"). Same reporting rule on
unmatched names.

**12. Cremation container images are wrong.** His words: *"Cremation container images are very
off on the html version. Please fix these both as well as the pdf version. These photos should be
taken directly from the casket and cremation container catalogs, now the photos should not be
hard to match."* Source the images from the catalogs, rebuild both HTML and PDF, and **count**:
how many containers, how many images before, how many after, how many still unmatched. A guides
audit on 2026-07-26 found the Cremation Guide shipping **0 of 57 product photos** because lazy
images never loaded in a headless print — check that trap explicitly, it is in
`scripts/build_guide_pdfs.mjs`'s history.

**11. `outside-marker-rules.html` needs a PDF.** Register it in `scripts/build_guide_pdfs.mjs`,
build it, verify it renders, and make sure the download link is offered wherever the other guides
are offered (`guides.html`, and check `scripts/build_guides_page.py` / `verify_guides_page.mjs`
so the count stays in one place — commit `806fb23` made that a rule).

### Content corrections

**5. `vital-worksheet.html`: sex, and sex at birth.** Add **Sex**, and beneath it as a small
separate sub-category, **Sex at birth** — *"in the off chance someone has changed sex; this is
important for social security reasons."* Keep it discreet and matter-of-fact in tone.

**6. `veterans-guide.html`: replace the "Distance from Seattle" pro/con row** with one about
**how soon placement can happen**. Bonney Watson can schedule placement much sooner and complete
it much faster than the VA. Keep the row structure and the `data-label` attributes intact.

**7. `veterans-guide.html`: delete** *"and they are usually the larger half of the two."*
(sentence ending the paragraph at `~366`).

**8. `veterans-guide.html`, "One conversation covers both" — rewrite.** Three corrections, all
his:
   - **Say "we", not "I".** Other counselors use this guide; it is not Martice's personal voice.
   - **There genuinely are two sets of paperwork**, cemetery and funeral home. They can all be
     completed in one sitting. Say that, rather than implying one set.
   - **Stop pushing our cemetery.** His words: *"Don't have to push so hard to use our cemetery.
     It is perfectly acceptable for families to choose Tahoma and we're happy to help get them
     there, they just need to be aware about the pros and cons as well as the charges that Tahoma
     can't cover."* The current text leans hard; make it even-handed.

**9. `veterans-guide.html`, the granite section (`~478`).** Two changes:
   - **Add:** the VA headstone at Tahoma is **free — all of it** — and Tahoma works directly with
     the VA to get it ordered. Families need to know this.
   - **Remove the VA-emblem-on-granite passage entirely.** *"It's not something we do often and
     there is a charge for it that I'd prefer not to bring up."*

**10. `veterans-guide.html`: add a brief mention of pre-planning and flexible payment options** —
*"so the families understand they don't have to pay for this all up front if they cannot afford
to."* Brief. One short passage, in keeping with the guide's voice, not a sales pitch.

**14. `urn-placement-guide.html` (HTML and PDF) — the biggest content correction.** The guide
currently says urn garden burials take place in section 18. True, but badly incomplete. All of
the following must be covered:
   - An urn can be placed in a **standard grave space anywhere in the cemetery**. If a family
     wants to buy an available casket plot and place one urn in it, or two, or three, they can —
     **there are extra costs for the second and third urn placements.**
   - There are sections built specifically for urn burial, **one urn per space**, and they are
     **not** section 18 — they are the **Lake Urn Garden at the front of the cemetery**.
   - For ground placement you either **place the urn inside an urn vault** to be buried, **or**
     buy an urn rated for burial — the **marble urns** shown in the cremation guide and the urn
     catalog.

**15. Add: there is no cost to file wishes with us, and no obligation to prepay.** Place it where
it reads naturally — pre-planning guide and/or wherever filing wishes is discussed. Say where you
put it and why.

**16. `who-decides-guide.html`:** add that *"usually we only do this sort of paperwork if they
have made arrangements with us."*

**17. `who-decides-guide.html`: rebalance the cremation-prerequisites section.** It currently
leans heavily on the medical examiner. **It should talk less about the medical examiner and more
about the physician on the death certificate** — the doctor, or the hospice doctor or nurse —
signing their side of it. That is the step that actually holds most families up. Keep the RCW
citations accurate; the statutes cited (RCW 70.58A.200, 70.58A.210, 68.50.010) stay correct, only
the emphasis changes. **Do not invent a statute or a deadline** — if a claim needs a citation you
cannot verify, cut the claim rather than guessing.

**18. `who-decides-guide.html`: remove "The right to decide comes with the bill"** and its
RCW 68.50.160(6) citation entirely. *"This is not something that needs to be discussed in the
guide. There is a lot more nuance to this."*

**19. `who-decides-guide.html`: correct the urn-timing claim.** It currently says the urn must be
purchased or provided before the cremation can be scheduled. **That is wrong.** The urn must be
provided **before we release the remains** — not before the cremation.

---

## Hard constraints

- **Never touch `index.html`.** Track A is editing it in another tree right now.
- **Never write to production Firebase.** These are static pages; you have no reason to go near
  it. Reads only, if at all.
- **Never push.** Commit locally to `s04/guides-audit` and stop. Every push is an operator gate;
  this repo is public and `main` deploys to GitHub Pages immediately.
- **Stage explicit paths** — `git -C C:\Users\Martice\bw-quote-tool-guides add <file> …`. Never
  `git add -A`. A hook blocks bulk adds, blocks pushing a broken `index.html`, and blocks
  committing `wmp-cemetery-map/`.
- **Never commit `wmp-cemetery-map/`,** and never carry a name out of it into any file, comment
  or report.
- **No real customer data anywhere.**
- **`docs/BRAND_AND_BUILD_LOG.md` is the guides session's running log.** Read it first; append to
  it; do not rewrite it.
- **Prices are not yours to invent.** Item 1's anomaly and any other price disagreement gets
  checked against the price book and escalated, never guessed. **MIS is the pricing source of
  truth and a printed or PDF sheet is not** (`DESIGN.md` §8) — a Serenity wall sheet once priced
  5 of 48 niches and priced three that MIS called reserved.

---

## Verification

Static pages, so the tool-side gates mostly do not apply — but these do:

1. `npm run check` → `index.html: 8 blocks, 0 errors`. You did not touch it; this proves it.
2. `npm test` → counts at or above `636 passed, 0 failed across 19 suites`; none may fall.
3. `node scripts/verify_catalogs.mjs` and `node scripts/verify_guides_page.mjs` — both must pass.
   `verify_catalogs` already covers facets, enlarge and compare across all six catalogs
   (`4782984`), so your new facets must satisfy it or extend it.
4. **Rebuild every PDF you changed** — `node scripts/build_guide_pdfs.mjs [filter]` — and
   **rasterize and check them**, do not trust that they built. PyMuPDF or pdf.js under Playwright.
   Adobe Acrobat is required only for the RIC contract and nothing here goes near it.
5. **A new check for item 1**, permanent and runnable: table column alignment across every guide
   table, failing when a cell does not sit under its header. This is the one that stops the class
   of bug rather than the instance.
6. **Count everything you claim.** Images per page before and after; page counts before and
   after; caskets matched and unmatched; tables audited and tables failing. Every real defect
   this project has found came from counting something and comparing it to an expectation, and
   none came from looking at a thing and judging it. A guides audit on 2026-07-26 found 27
   missing granite swatches and 0-of-57 product photos exactly this way.
7. **Sabotage one new check** and report what went red, confirming you broke what you aimed at.

---

## Report format

What shipped, item by item with its number · branch + commits · verification output verbatim ·
files changed · **the price-book finding on item 1** · decisions and open questions · what the
director must verify by hand.

Say plainly what you could not verify or chose not to change. If any content correction left you
unsure of the operator's intent, write the sentence you produced and flag it rather than
smoothing over the doubt — these pages are read by families.
