# Sprint 05 — The tool's print surfaces, and paying off debt

**DRAFT, written 2026-07-27 while sprint-04 was still running.** It exists so the items held back
from sprint-04 are not lost, and so the operator can see what is queued. **The closing director
of sprint-04 reconciles this against what actually shipped before spawning anything** — reality
wins over a plan written in advance, and this one was written before Tracks B, C and D reported.

**Runs ROADMAP milestone S3** (the saved-list focus bug and accumulated debt) **plus the
tool-side half of S9**, which sprint-04 could not take because Tracks A–C owned `index.html` for
its whole duration.

---

## Where this came from

Martice's punch list of 2026-07-27 (`E:\Downloads\Guids Issues 07.25.26.docx`) had 23 items.
Twenty-one lived in the guides and catalogs and went to sprint-04 Track D. **Two needed
`index.html` and were deliberately held**, because three sequential tracks were already queued
against that file and a fourth would have been a merge fight for no benefit.

They are the two below, plus the debt S3 has been carrying since the roadmap was written.

---

## Scope

### 1. Comparison print — the operator's words, and his choice

*"Quote tool comparison function when pressing the print button needs to do a better job of using
the available space. Two options. Either show the payment options for each method that have no
ACH for both. Or enlarge each option significantly."*

**He chose enlargement** (2026-07-27). Payment options stay as they are; the space comes from
laying the comparison out properly rather than from deleting rows. The test of success is a
counselor reading it across a table, sometimes upside down, while talking — so type size and
whitespace are the deliverable, not density.

### 2. Naming the compared options

*"Also give the ability to name each option so instead of it showing a vs b it can be option:
casket vs option: urn etc etc."*

Free text per option, defaulting to the current A / B labels so nothing breaks if it is left
alone. The name has to reach the printed output, which is the whole point — it is what the family
takes home and reads a week later.

### 3. The print header on the tool itself

*"I think the header for all of the files when printing or downloading to pdf should be a lot
smaller. it is fine in html format but on print or pdf it takes too much of a page up."*

Sprint-04 Track D fixed this across the guides. **The same complaint applies to the tool's own
printed surfaces and was not in that track's scope** — it was explicitly forbidden from touching
`index.html`. Whatever approach Track D landed on for the guides is the reference; match it
rather than inventing a second convention, and say in the report how the two now compare.

### 4. S3 debt — cheap, self-contained, no dependencies

- **The saved-quote search focus bug.** The saved-list search box rebuilds its list via
  `innerHTML` on every keystroke, destroying and recreating the `<input>` and losing focus.
  Pre-existing and known. **Contacts escapes this only because its search input sits outside the
  rebuilt container** — that is the fix pattern, and sprint-04 Track B has an assertion for it
  worth copying.
- **Delete `BW_Quote_Tool_merged_11.html`.** Verified dead 2026-07-27: **6,286,954 bytes**,
  tracked since `7f5e944`, and referenced by nothing that runs — the only mentions are
  `.claude/settings.local.json`, a June debrief, `ops/ROADMAP.md`, and a scratch draft. No HTML,
  JS, script or test loads it.
- **The duplicate root-level marker image.** Confirm it is genuinely a duplicate before removing
  it, and say what you compared — a filename match is not proof.

---

## Out of scope

- Anything in the contact layer. Sprint-04 owns it end to end.
- The remaining ~750 non-overlapping prices (caskets, urns, vaults, FH packages). They have real
  sources — the two 2026-03-01 price books named in `sprints/sprint-03/SPRINT.md` — and deserve
  their own sprint, not a corner of this one.
- **The two mismatched templates.** `pdf-templates/ClearPoint Contract 2026.pdf` and
  `WMP_Retail_Installment_Contract_2026.pdf` differ from the bytes actually shipping. Adopting
  them silently would change a live contract. Its own sprint, never a side errand.

---

## Verification

Standing gates, unchanged in kind:

- `npm run check` → `index.html: 8 blocks, 0 errors`
- `npm test` → at or above whatever sprint-04 left on `main`; counts rise, never fall
- **Generator baseline 14/14 identical** — and this sprint touches print paths, so that gate is
  doing real work rather than standing by. A comparison print change that moves a number on a
  contract is exactly what it exists to catch.

Specific to this sprint, and the reason it needs care despite looking cosmetic:

- **Print layout is not testable by looking at it.** Assert page counts and measured element
  sizes, the way Track D's `verify_print_header.mjs` does for the guides. "It looks better" is
  not a gate.
- **Deleting a 6.29 MB tracked file is a git operation on a public repo.** It removes the file
  going forward; it does not remove it from history, and **history is not to be rewritten**
  (`DESIGN.md` §1). Say so plainly rather than implying the bytes are gone.
- The option-name field is free text that reaches a printed document — **escape it**. The
  contact layer's `_ceEsc()` is the existing helper.

---

## Operator gates

1. Review the merges on local `main`.
2. `git push origin main` — **only on Martice's explicit go.**
3. The comparison print is a judgement call about what reads well in front of a family. **Print
   one and look at it.** No amount of measurement settles whether it is legible across a table.
