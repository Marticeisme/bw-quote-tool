# Handoff: Quote Tool chrome + Family Resources visual refresh

## Overview
A visual refresh — not a rebuild, not new features — of two surfaces in `marticeisme/bw-quote-tool`:

1. **The counselor app chrome** — `index.html` (sidebar, topbar, quote-builder panels, fixed summary panel, saved-quote lists, form controls).
2. **The family resources page** — `guides.html` (card grid of guides/catalogs).

The work is hierarchy, spacing, typography and consistency. The brand identity does not change: the same BW fleur logos, the same navy/orange pair. The one substantive color change is **unifying three drifted palettes onto the official brochure pair** (`#466e86` / `#e84610`) and deriving the dark chrome from that navy instead of the unrelated `#14304a`.

## About the design files
`Quote Tool Design Direction.dc.html` in this bundle is a **design reference document**, not production code. It contains the token block, five rendered component treatments, and rough CSS for each. The CSS in it is written to be pasted into the existing hand-written stylesheets in `index.html` and `guides.html` — it is not a component library and there is nothing to `npm install`.

Unlike a normal design handoff, the target environment here is **the existing single-file HTML/CSS/JS app**. Do not introduce a framework, a build step, a CSS preprocessor, or a component abstraction. Hand-written CSS classes, as today.

The `.dc.html` extension means the reference document opens directly in a browser — treat it as a document to read, not a file to port.

## Fidelity
**High-fidelity.** Every hex value, px value, font size, weight, line-height and radius in the direction document is final and should be implemented verbatim. Where the document shows a rendered mockup (summary panel, panel header, saved-list row, button set, guide card), that mockup is the intended result at 1:1 scale.

## Hard constraints (do not design or code against these)
- **Single-file HTML/CSS/JS. No build step, no frameworks.** Hand-written CSS classes.
- **Desktop-first.** Two expert users, used live in front of grieving families. Speed and scannability beat aesthetics. No onboarding scaffolding, no marketing chrome, no dark mode.
- **Tone:** dignified, warm, calm. Never salesy.
- **Brand fixed:** BW fleur logos, navy/orange per the token block.
- **Fonts:** Public Sans + Source Sans 3 (app), Cormorant Garamond + Source Sans 3 (guides). Weights and usage may change; **no new families.**
- **The family quote print/PDF pipeline is sealed.** Nothing in this refresh touches `_printQuoteCSS`, `_FQ*`, or `_buildQuotePDF`. The 2-page family quote and its PDFs are done and out of scope.
- **Load-bearing implementation realities:** the fixed summary panel is `position:fixed; width:260px` with a coupled 292px content clearance; view switching is `.section{display:none}`; there are ~226 JS-set inline styles; sidebar width 264px is load-bearing for contact-grid breakpoints. None of these change.

## Design tokens

Paste into `index.html`'s `:root`. `guides.html` takes the same block plus the warm override at the bottom.

```css
:root{
  /* brand — fixed */
  --bw-navy:#466e86;          /* official, 2026 GPL brochure */
  --bw-orange:#e84610;

  /* navy ramp — #466e86 scaled (dark) / mixed with white (light) */
  --navy-900:#1c2c36;   /* sidebar, topbar                         */
  --navy-800:#273d4a;   /* sidebar hover, active item, chrome rule */
  --navy-700:#314d5e;
  --navy-600:#3c5e72;
  --navy-500:#466e86;   /* links, focus ring, keylines             */
  --navy-400:#7492a4;   /* icons, secondary text on light          */
  --navy-300:#a3b7c3;   /* placeholder, disabled                   */
  --navy-200:#c8d4db;   /* input border on hover                   */
  --navy-150:#dde5e9;   /* default border, table rule              */
  --navy-100:#e3e9ec;   /* panel header fill, row hover            */
  --navy-50:#f2f5f6;    /* app background                          */

  --ink:#16242c;        /* headings, money                         */
  --body:#4a5a64;       /* body copy                               */
  --muted:#6d818c;      /* labels, meta, helper text               */

  --orange:#e84610;
  --orange-press:#c73a0c;
  --orange-tint:#fdf0ea;      /* only orange fill wider than a button */

  --ok:#2e6b52; --warn:#8a6414; --stop:#a33a25;  /* text/border only */

  /* type — Public Sans UI, Source Sans 3 numbers & tables */
  --t-xs:11px;   /* uppercase labels, .09em tracking, 600 */
  --t-sm:12.5px; /* meta, helper, table cells             */
  --t-base:14px; /* inputs, buttons, panel titles         */
  --t-md:15px;   /* body copy                             */
  --t-lg:17px;   /* section headings                      */
  --t-xl:21px;   /* view titles                           */
  --t-total:30px;/* the running total, and nothing else   */

  /* space — 4pt, and only these */
  --s1:4px; --s2:8px; --s3:12px; --s4:16px;
  --s5:20px; --s6:24px; --s8:32px; --s10:40px;

  --r-sm:6px;   /* inputs, chips */
  --r-md:8px;   /* buttons, panels, cards */
  --r-pill:999px;

  --sh-1:0 1px 2px rgba(22,36,44,.06);
  --sh-2:0 6px 18px rgba(22,36,44,.10);   /* fixed summary panel only */
  --ring:0 0 0 3px rgba(70,110,134,.28);  /* every focus state        */
}

/* guides.html — same tokens, warm skin */
:root{
  --paper:#f4efe6; --card:#fff;
  --card-border:#e7dcc7; --rule:#efe7d8;
  --meta:#9b8d6f; --body:#5a6b73;
}
```

### Palettes being replaced
| Was | Where | Becomes |
| --- | --- | --- |
| `#14304a` navy | `index.html` chrome | `--navy-900:#1c2c36` |
| `#E5480F` orange | `index.html` | `--orange:#e84610` |
| `#3d5a7a` navy | `guides.html` | `--navy-500:#466e86` (chrome uses `--navy-900`) |
| `#c8540a` orange | `guides.html` | `--orange:#e84610` |
| `#2c445e` navy-deep | `guides.html` | `--navy-800:#273d4a` |

`#1c2c36` is `#466e86` × 0.40 — same hue, deeper than the current chrome. Every dark step is a fixed multiplier of the brand navy (×0.40 / ×0.55 / ×0.70 / ×0.85), every light step is a white mix, so the ramp cannot drift off-hue and a future brand change is a one-line edit.

### Orange usage rules
- One filled orange button per visible view. Never two.
- Never behind money, totals, or status.
- Never as a panel or header fill. `--orange-tint` is the only exception, and only for the active discount banner.
- White text at 600 weight, 13px minimum, on `--orange` only.

## Component treatments

Each is rendered at 1:1 in the direction document; the CSS below is the same as shown there.

### 1. Summary panel (fixed right card)
**Purpose:** the running total the counselor turns toward a family, plus the five export/save actions.

**Before:** five equal emoji buttons in a row; the total competes with them for weight; the card is one flat value top to bottom.

**After:** an isolated white total block at the top — the only 30px type in the app — then a three-line item preview with a "+ N more" count, then actions below a rule, ranked.

Layout, top to bottom, inside the existing 260px fixed card:
- Kicker: `--t-xs` / 600 / `.09em` / uppercase / `--muted`. Content: quote type, e.g. "Cemetery quote · Pre-Need".
- Total: `--t-total` (30px) / 600 / Source Sans 3 / `--ink` / `font-variant-numeric:tabular-nums` / `letter-spacing:-.01em`.
- Split: `--t-sm` / 400 / `--muted`, two lines — "Subtotal $X" and "Sales tax (10.4%) $Y".
- Rule (`--navy-150`), then item preview: three rows of `--t-sm`, name left / amount right (tabular), then "+ N more items" in `--navy-400`.
- Rule, then actions in a column with `--s2` gap:
  - **Download PDF** — primary (orange, full width). The artifact the family leaves with.
  - **Save quote** — secondary (bordered, full width, equal size). Losing work is the other real risk.
  - **Print** / **Copy** — two quiet buttons side by side, `flex:1` each.
  - **Reset quote** — 12px `--navy-400` text link, centered, with a confirm. It currently sits one pixel from Save.
- **Empty state:** same layout. Total renders `$0.00` in `--navy-300`, one line of helper text, actions disabled at 45%. Never a different layout.

```css
.summary-panel{position:fixed;width:260px;background:#fff;border:1px solid var(--navy-150);
  border-radius:var(--r-md);box-shadow:var(--sh-2);overflow:hidden}   /* unchanged geometry */
.summary-total-block{padding:var(--s4) 18px 14px;border-bottom:1px solid var(--navy-150)}
.summary-kicker{font:600 var(--t-xs)/1 'Public Sans';letter-spacing:.09em;
  text-transform:uppercase;color:var(--muted);margin-bottom:10px}
.summary-total{font:600 var(--t-total)/1 'Source Sans 3';color:var(--ink);
  font-variant-numeric:tabular-nums;letter-spacing:-.01em}
.summary-split{font:400 var(--t-sm)/1.5 'Public Sans';color:var(--muted);margin-top:var(--s2)}
.summary-actions{padding:14px 18px var(--s4);display:flex;flex-direction:column;gap:var(--s2)}
```

### 2. Panel header + form controls (15+ collapsible quote panels)
**Before:** tinted icon chips, mixed paddings, a title that carries no state — so the counselor opens panels to find out whether he already filled them in.

**After:** a fixed 44px header row, the existing inline Lucide icon at 16px in `--navy-400` **with no chip behind it** (the chip fill is what read as emoji-era; the icon was never the problem), and a right-side value summary that persists open or closed — e.g. "Garden 19 · 1 space · $10,344", or "Not set" in `--navy-300`. Tax-exempt / Taxable become `.q-tag` pills in the header, not colored text.

Body padding standardizes at `--s5`, row gap `--s3`. Nothing else.

```css
.q-panel{background:#fff;border:1px solid var(--navy-150);border-radius:var(--r-md);
  box-shadow:var(--sh-1);margin-bottom:var(--s3)}
.q-panel-head{height:44px;display:flex;align-items:center;gap:10px;padding:0 var(--s4);
  cursor:pointer;user-select:none}
.q-panel[open] .q-panel-head{background:var(--navy-100);border-bottom:1px solid var(--navy-150)}
.q-panel-head svg{width:16px;height:16px;stroke:var(--navy-400);flex-shrink:0}  /* no chip */
.q-panel-title{font:600 var(--t-base)/1 'Public Sans';color:var(--ink)}
.q-panel-sum{margin-left:auto;font:400 var(--t-sm)/1 'Source Sans 3';color:var(--muted);
  font-variant-numeric:tabular-nums}                     /* persists when collapsed */
.q-panel-body{padding:var(--s5);display:flex;flex-direction:column;gap:var(--s3)}
.q-tag{font:600 10.5px/1 'Public Sans';letter-spacing:.07em;text-transform:uppercase;
  color:var(--muted);background:var(--navy-100);border-radius:var(--r-pill);padding:4px 8px}

/* controls */
input,select{height:36px;border:1px solid var(--navy-200);border-radius:var(--r-sm);
  background:#fff;padding:0 var(--s3);font:400 var(--t-base)/1 'Public Sans';color:var(--ink)}
input:focus,select:focus{outline:0;border-color:var(--navy-500);box-shadow:var(--ring)}
input[readonly]{background:var(--navy-50);border-color:var(--navy-150);color:var(--body)}
label{font:600 var(--t-xs)/1 'Public Sans';letter-spacing:.09em;text-transform:uppercase;
  color:var(--muted);margin-bottom:6px;display:block}
```

### 3. Button set
Four ranks. Every button in the app resolves to one of them. If a view seems to need two orange buttons, one of them is secondary. Height 38px primary/secondary, 34px quiet. Emoji come out of button labels; a 15px Lucide glyph goes in front only where the action is ambiguous (PDF, Print).

Order is consistent: primary **first** in the summary panel, primary **last** in a modal footer.

```css
.btn{font:600 13.5px/1 'Public Sans';border-radius:var(--r-md);padding:12px 18px;
  border:1px solid transparent;cursor:pointer;
  transition:background .12s ease,border-color .12s ease}   /* no transforms */
.btn:focus-visible{outline:0;box-shadow:var(--ring)}
.btn-primary{background:var(--orange);color:#fff}
.btn-primary:hover{background:var(--orange-press)}
.btn-secondary{background:#fff;color:var(--ink);border-color:var(--navy-200)}
.btn-secondary:hover{background:var(--navy-50);border-color:var(--navy-400)}
.btn-quiet{background:none;color:var(--navy-500);padding:10px 12px;font-size:13px}
.btn-quiet:hover{background:var(--navy-100)}
.btn-danger-quiet{background:none;color:var(--stop);padding:10px 12px;font-size:13px}
.btn:disabled{background:var(--navy-50);color:var(--navy-300);border-color:var(--navy-150)}
```

### 4. Saved-quote lists
**Before:** plain tables.

**After:** rows, not tables. Family name leads at 14.5px/600 — it is what you search by out loud. Meta line underneath (property · item count · Pre-Need/At-Need). Status pill. Money right-aligned, tabular, with the date beneath. Row actions (**Open**, **PDF**) always visible — not hover-revealed; hover-only actions cost a second every time and fail on a tablet.

List header: title at `--t-lg`, a plain count, and a single search field. Sorted newest first.

**Statuses — three, and the app sets two of them:**
| Status | Set by | Meaning |
| --- | --- | --- |
| **Draft** | app | saved, never exported |
| **With family · <date>** | app | PDF or Print fired at least once; stamp the date |
| **Contracted** | app, on RIC/CIRGAS generation from that quote | converted |

"Saved" is not a status — it is the fact that the row exists. Four hand-maintained states is more than a two-person shop will keep accurate.

**No status tabs.** Xero's tabs-with-counts earn their space at hundreds of quotes; here the list fits on one screen and tabs spend a click to hide four rows. Revisit above ~40 rows.

```css
.saved-row{display:flex;align-items:center;gap:var(--s4);padding:14px 18px;
  border-bottom:1px solid var(--navy-150)}
.saved-row:hover{background:var(--navy-50)}
.saved-name{font:600 14.5px/1.3 'Public Sans';color:var(--ink)}
.saved-meta{font:400 var(--t-sm)/1.4 'Public Sans';color:var(--muted);margin-top:3px}
.saved-total{font:600 15px/1 'Source Sans 3';color:var(--ink);font-variant-numeric:tabular-nums}

.pill{font:600 10.5px/1 'Public Sans';letter-spacing:.07em;text-transform:uppercase;
  border-radius:var(--r-pill);padding:5px 10px;border:1px solid}
.pill-draft{color:var(--muted);border-color:var(--navy-150);background:var(--navy-50)}
.pill-family{color:var(--navy-500);border-color:rgba(70,110,134,.35);background:rgba(70,110,134,.07)}
.pill-contracted{color:var(--ok);border-color:rgba(46,107,82,.30);background:rgba(46,107,82,.07)}

/* empty state — replaces the current bare sentence */
.empty{padding:var(--s10) var(--s6);text-align:center}
.empty h3{font:600 var(--t-lg)/1.3 'Public Sans';color:var(--ink);margin:0 0 6px}
.empty p{font:400 var(--t-base)/1.6 'Public Sans';color:var(--muted);margin:0 auto;max-width:340px}
```

### 5. Guide cards (`guides.html`)
**Before:** every card carries a filled orange CTA, so a 3-column grid of 45 cards is a field of orange and nothing is emphasized.

**After:** the whole card is the link. "Open guide →" demotes to a quiet `--navy-500` cue that turns `--orange` on card hover — so orange appears on exactly one card at a time, the one under the cursor. PDF sits beside it as a bordered chip. A category pill goes top-left with the existing meta (page count, product count) top-right: search is the primary way in, and the pill tells you what a result belongs to.

Drop the `translateY` on hover — border and shadow only, 120ms. This page gets shown to families; moving cards read as unserious.

```css
.guide-card{background:var(--card);border:1px solid var(--card-border);border-radius:12px;
  padding:var(--s5) 22px;display:flex;flex-direction:column;box-shadow:var(--sh-1);
  transition:box-shadow .12s ease,border-color .12s ease}   /* no translate */
.guide-card:hover{border-color:#c8bda3;box-shadow:0 6px 18px rgba(60,50,30,.10)}
.guide-card:hover .guide-cta{color:var(--orange)}
.guide-cat{font:600 10.5px/1 'Public Sans';letter-spacing:.08em;text-transform:uppercase;
  color:var(--meta);background:var(--paper);border-radius:var(--r-pill);padding:5px 10px}
.guide-title{font:600 19px/1.25 'Cormorant Garamond',serif;color:#2c4a5a;margin-bottom:var(--s2)}
.guide-actions{display:flex;align-items:center;gap:10px;
  border-top:1px solid var(--rule);padding-top:13px}
.guide-cta{font:600 13px/1 'Public Sans';color:var(--navy-500);transition:color .12s ease}
.guide-pdf{font:600 12px/1 'Public Sans';color:#6b7176;border:1px solid #e0d5bf;
  border-radius:var(--r-sm);padding:7px 11px}
```

## Interactions & motion
- **Cap every transition at 120ms**, restricted to `color`, `border-color`, `background`, `box-shadow`.
- **No transforms, no lifts, no collapse animations on the panels.** A 15-panel accordion that eases open is a screen that appears to hesitate while a family watches. Instant is the dignified choice here.
- Focus is always `--ring` (`0 0 0 3px rgba(70,110,134,.28)`) with `outline:0`. Never remove focus without replacing it.
- Reset actions confirm before clearing.
- No hover-only affordances anywhere — everything reachable is visible.

## Judgment calls to confirm with Martice
1. **PDF is the primary action in the summary panel**, Save is secondary-but-equal. If Save is the one he'd miss more, swap them; the ranks are symmetrical.
2. **Contracted is set automatically** when a RIC/CIRGAS is generated from a quote. If that link doesn't exist in the data model, it becomes the one manual toggle.

## Files in this bundle
- `Quote Tool Design Direction.dc.html` — the direction document, with all five treatments rendered at 1:1. Open it in a browser.
- `DEBRIEF_design_2026-08-06.md` — the original brief this responds to.
- `README.md` — this file.

## Repo
`github.com/marticeisme/bw-quote-tool`, branch `main`. App CSS is `index.html` lines ~9–429; `guides.html` is self-contained. `docs/UI_RESEARCH_2026-08-06.md` §3 holds the A–F change list this direction answers.

## Suggested sequence
1. Find-and-replace the three palettes onto the token block. Ships alone, changes everything, breaks nothing.
2. Summary panel — highest visibility per line of CSS, and the one component a family actually reads.
3. Button ranks. Do this before panel headers; it is what removes the emoji-era feel.
4. Panel headers and control styles across all 15+ panels. Longest job — the ~226 JS-set inline styles get audited here, not before.
5. Saved lists and empty states.
6. `guides.html`: palette swap, card actions, category pills.

Untouched throughout: `_printQuoteCSS`, `_FQ*`, `_buildQuotePDF`, the 264px sidebar width, the 260px/292px summary coupling, and `.section{display:none}` view switching.
