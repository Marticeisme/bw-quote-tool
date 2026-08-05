# Debrief: the family-guide PDFs

**For:** the guides session (Claude Code)
**From:** design review, 2026-08-05
**Repo:** `Marticeisme/bw-quote-tool` @ `main`
**Reference build:** `Cemetery Property — Condensed PDF.dc.html` (this project)

---

## The one-sentence version

The PDFs are bad because **there is no PDF**. `scripts/build_guide_pdfs.mjs` prints the
web page. The web guides are excellent and long; the PDFs are therefore excellent and
long, set in 8pt type. Every sprint since s07 has tried to solve a *content* problem with
*typography*, and the type has now been squeezed as far as it can go.

Martice's actual brief: *"the pdf versions are supposed to be condensed and easier to read
so I can quickly email them to families."* Nothing in the pipeline condenses anything. It
only shrinks.

---

## What the evidence says

### 1. The type is below the legibility floor

| | Screen | Print |
|---|---|---|
| `guide-print.css` §7 default | 15px | **7.7pt** |
| `cemetery-property-guide.html` condense block | 15px | **8pt** |
| Reference floor for a document emailed to families | — | 10.5pt |

7.7pt is roughly 10.3px. These documents are read by grieving people, many of them
elderly, often on a phone. §7 even acknowledges the discomfort — *"Nothing drops below
7.6pt — these are read by grieving families"* — which is the right instinct applied to
the wrong variable. 7.6pt is not a floor anyone would choose; it is the smallest size
that still fits everything, and "fits everything" is the assumption to drop.

### 2. Two-column flow was added to buy pages, and it costs more than it buys

`cemetery-property-guide.html` sets `.doc-sheet{column-count:2}` across the whole
document. Consequences, all observable in the built PDFs:

- Extracted reading order is scrambled. In `Granite Marker Sizes and Colors.pdf` the
  document title lands in the *middle of page 1*, after Section 3's body copy.
- Components split across the column and page boundary — the marker size cards and the
  price table straddle the page 1/2 break.
- A two-column 8pt broadsheet is the visual language of a classified-ads page, not of a
  document about where someone will be buried.

### 3. Nothing is ever dropped

Every section, every FAQ answer, every card in the web guide appears in the PDF. The
Cemetery Property Guide ships all 8 sections and all 8 FAQ entries. Pre-Planning ships all
6 sections and all 5 FAQ entries. A family who asked "what does a niche cost" receives
2,900 words.

### 4. Selection is already solved — and used once

```js
['markers-guide.html?part=sizes',  'pdf-assets/Granite Marker Sizes and Colors.pdf'],
['markers-guide.html?part=photos', 'pdf-assets/Marker Photos and Etching.pdf'],
```

`?part=` sets `data-print-part` on `<html>` and print CSS drops the other half. One source,
two PDFs, no drift. This is the right mechanism and it is applied to exactly one guide.

### 5. Section numbering is hard-coded, so selection leaves holes

Sections are literal markup — `<p class="section-label">Section 1</p>`. When `?part=sizes`
drops sections 5–7, the PDF runs **1, 2, 3, 4, 8**. Any content selection will produce this
until numbering is generated or removed.

### 6. The pricing rule has over-corrected

In the flagship Cemetery Property Guide, the two largest property types — ground burial
spaces and mausoleum crypts — both read *"Ask us for today's figures."* Four pages of 8pt
type return one firm price. The operator's instruction was *"we can keep price ranges just
not very specific pricing"* — that is an argument for a **range on every card**, not for no
number at all. A range beats silence; silence sends the family to a competitor's website
where the number is printed.

### 7. Nineteen condense blocks have drifted

Each guide carries its own `/* === PRINT CONDENSE === */` block, and `guide-print.css`
says so itself: *"nineteen slightly-different copies of the same idea."* §7 exists purely
to override them. `.doc-footer` is styled in every guide and then hidden by the shared
sheet. This is dead weight that makes every future change a 19-file edit.

---

## The fix

**Stop condensing. Start selecting.** Then the type can go back up.

A condensed PDF is not a smaller version of the web guide. It is a different document
with a different job: *get a family to the one or two decisions that matter, show them
what it looks like, give them a number, and tell them where the full version lives.*

The web guide stays exactly as it is. It is already perfect, and it is where Martice reads
from when he is sitting with a family.

> **The guides site is not public.** A condensed PDF cannot lean on "the full version is
> online" — for the family, this PDF *is* the document. Cut to what answers their
> question, and end with a way to reach Martice.

### Mechanism: `?print=family`

Extend the existing `data-print-part` script to also set `data-print-mode`:

```
markers-guide.html?part=sizes&print=family
cemetery-property-guide.html?print=family
```

Register a second job per guide in `build_guide_pdfs.mjs`:

```js
['cemetery-property-guide.html?print=family', 'pdf-assets/Cemetery Property Guide.pdf'],
```

The condensed version becomes **the** emailed PDF. The full-length print stays reachable
by the family hitting Ctrl+P on the web page, which is what that path is for.

### Markup convention

Annotate sections in the guide rather than writing per-guide print CSS:

```html
<div class="section" id="charges" data-pdf="keep">…</div>
<div class="section" id="rising"  data-pdf="drop">…</div>

<div class="section" id="owning" data-pdf="summary">
  …full web content…
  <div class="pdf-summary">
    <p>Your rights stay yours if you move. They can be transferred or sold;
       every transfer comes through us.</p>
  </div>
</div>
```

Shared rules in `guide-print.css`:

```css
[data-print-mode="family"] [data-pdf="drop"] { display: none !important; }
[data-print-mode="family"] [data-pdf="summary"] > *:not(.pdf-summary) { display: none !important; }
[data-print-mode="family"] .pdf-summary { display: block !important; }
.pdf-summary { display: none; }              /* screen — same trick as .print-invite */
```

The short version lives **inside the guide, next to the long version**. It cannot drift.
This is the same anti-drift logic the repo already applies everywhere else.

### The condensed structure

Every family PDF, in this order. Two pages unless the guide is photo-led.

1. **Masthead** — logo, title, one line saying what the document answers. No cover page
   (already ruled out), no table of contents.
2. **The answer, up front** — 40–60 words. The single fact the guide exists to convey,
   set larger than body copy. Not "Section 1."
3. **The choices, as photographs** — 3–6 `pf-card`s. Photo, name, one sentence, a price
   range. Never a paragraph.
4. **What else you pay for** — the charges as a two-column name-and-half-sentence list.
5. **Two or three questions** — chosen, not all of them.
6. **Next step** — Martice's block: what to do now, and how to reach him.

### Type and geometry, once, for every guide

| | Value |
|---|---|
| Body | **10.5pt** / 1.5 |
| Columns | **one** — delete `column-count` |
| Section heading | 25px Cormorant, navy `#1e3a55` |
| Card sentence | 12px |
| Photo | 16:9, full column width, never a thumbnail |
| Page | letter, `0.42in 0.5in 0.46in` (unchanged) |
| Running footer | unchanged — it works |

### Delete on the way through

- All nineteen `/* === PRINT CONDENSE === */` blocks, and §7 of `guide-print.css` which
  exists only to fight them.
- `.doc-footer` rules in every guide (the shared sheet already hides it).
- `.contents` print rules — the TOC has no place in a two-page document.

---

## Rules to hold the line

1. **A family PDF is two pages.** Three if it is photo-led; the five area guides keep
   their eight. If it does not fit, cut content — never type size.
2. **Never below 10pt.** `verify_guide_pages.mjs` should assert this the way it asserts
   page counts.
3. **Every property card carries a number.** A range, a "from", or a typical band. "Ask
   us" is a last resort, not a default.
4. **Every PDF ends with the next step** — Martice's name, phone and email, and an
   invitation to ask for a real quote. Do **not** point families at the guides site; it is
   not public. Cutting is made safe by the PDF answering the question it was sent to
   answer, not by an escape hatch.
5. **One column.**
6. **Nothing is condensed by CSS that could be selected in markup.** Shrinking is the
   last tool, not the first.
7. **Rasterise and look at it.** The build log is full of defects that no assertion
   caught and one glance would have — clipped prices, blank pages, a logo printing
   "BONNEY (fleur) WATSO". Keep doing that.

---

## Open questions for Martice

- Ground burial and mausoleum crypts currently print no price at all. Can we publish a
  range for both, even a wide one?
- Should the condensed PDF replace the current download on `guides.html`, or sit beside
  it as a second "Short version ↓" link?
- The five photo-led area guides (ROAC, MVC, ECL, GOMN, Terrace Garden) were deliberately
  given eight pages. Do those stay long, or do they also get a two-page emailable cut?
