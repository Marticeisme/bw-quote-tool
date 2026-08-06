# UI Research — Quote Tool + Family Resources refresh (2026-08-06)

Research-phase notes before any code changes. Constraint from Martice: **keep the BW
color schemes and logos**; the refresh is about layout, hierarchy, and consistency.
Companion to `DEBRIEF_design_2026-07-17.md` (the earlier design consult — most of its
family-quote recommendations already shipped; the counselor app chrome is what's left).

## 1. Where the app stands today (measured, not guessed)

- `index.html` is 22.5k lines; **all app chrome CSS lives at lines 9–429** plus a small
  appended block at 20352–20392. Tokens at `:root` lines 10–20.
- **The app and the print/PDF layer use different palettes.** App tokens: navy
  `#14304a`, orange `#E5480F`. Print/family-quote layer (`_FQ` at ~8840): navy
  `#466e86`, orange `#e84610` — the official brand values from the GPL. There's also a
  third navy `#557d95` in `_printQuoteCSS()` and a fourth `#1B2A4A` in the FH compare
  print. **Unifying on the official #466e86/#e84610 pair is the single clearest
  "keep the colors but clean them up" move.**
- `guides.html` has its **own** token set (navy `#3d5a7a`, orange `#c8540a`, warm paper
  `#f4efe6`, Cormorant Garamond) — none of its hexes match index.html despite shared
  token names. Different fonts too (index: Public Sans; guides: Cormorant + Source Sans 3).
- The current shell is already close to modern convention: navy sidebar, breadcrumb
  topbar with one orange primary action, white cards on a gray canvas, fixed summary
  panel with PDF/Print buttons. This is a *polish* job, not a rebuild.

### Fragile things any restyle must respect (from the code map)
- `.section{display:none}` / `.section.active` view switching (`show()` at ~16958).
- `.summary-fixed` is `position:fixed; width:260px` and the three quote sections
  hardcode `padding-right:292px` (lines 152–155) — change together.
- 226 places where JS sets inline styles (gate, compare panel, plan areas, contacts) —
  CSS-only edits won't move those; several home-screen blocks are inline-styled in markup.
- Print/PDF windows build their own HTML+CSS strings — app CSS changes never touch
  printed output (good: quote output is protected from this refresh).
- Icon spans `data-lc` are hydrated to SVG at runtime — don't strip.
- Sidebar width 264px is baked into `.ct-grid` breakpoint math (lines 336–341, 364–365).
- guides.html filter script toggles `card.style.display` — keep `.guide-card` display
  semantics compatible.

## 2. Industry patterns (Jobber, Housecall Pro, QuickBooks, FreshBooks/Wave, PandaDoc,
Oracle CPQ, Baymard checkout research)

Recurring patterns, ranked by fit for a two-person desktop tool:

1. **Sticky running total always visible** (subtotal → discounts → tax → total) — we
   have this; theirs add per-section subtotals and a visually isolated grand total
   (biggest number on screen, tabular figures).
2. **One filled accent button per screen; everything else outline/ghost.** Orange =
   "go", scarce by design. Our summary panel currently has two big filled buttons
   (orange PDF + navy Print) competing.
3. **Muted gray canvas, white cards, brand color only on chrome/headings/primary** —
   never colored backgrounds behind data or money.
4. **Line items as disciplined tables**: right-aligned money with
   `font-variant-numeric: tabular-nums`, ~44–52px rows, hover-revealed row actions,
   headers aligned with their columns. Cards-per-row is a mobile pattern — skip.
5. **Type scale discipline**: page title ~20–24px, section headers 14–16px semibold
   (often uppercase + letterspaced), body 13–14px, meta 12px muted. Consistency beats
   any flourish.
6. **8px spacing grid**, 16–24px card padding, 24–32px between sections, 36–40px inputs.
7. **Quiet inputs**: 1px light border, accent focus ring; in-table inputs look like
   cells until focused.
8. **Status pills** (Draft/Saved/Converted) on saved-quote lists — tinted bg + dark
   text of same hue.
9. **Empty states that point at the action** ("No items yet — add from the price
   list"), never blank space.
10. **Good/better/best comparison columns** (Jobber options, HCP proposals) — a feature,
    not CSS; defer.

**What not to copy:** marketing chrome, onboarding/upsell machinery, client-portal
cover pages, mobile card layouts, template galleries, dark mode/glass/gradients that
fight the brand. The tools praised for UX are the sparse ones — restraint *is* the look.

## 3. Proposed change list (for the sprint; not yet implemented)

Keeping brand colors + logos everywhere. Order = impact.

**A. Palette unification (app chrome → official brand).** Move index.html tokens to the
GPL-official navy `#466e86` family + orange `#e84610` (deriving the dark sidebar shade
from the same hue instead of the current near-black `#14304a`), and tokenize the ~200
hardcoded hexes the map found so future changes are one-line. This also delivers the
still-pending "deeper-navy chrome" request from 2026-07-17 in a principled way.

**B. Button hierarchy.** One orange filled primary per view (summary PDF); Print/Copy/
Save/Reset become navy outline / ghost. Same treatment on topbar (New Cemetery Quote
stays primary; New FH Quote becomes outline — or context-dependent).

**C. Type + spacing pass.** Small `:root` scale (--fs-*, --sp-*), uppercase letterspaced
section labels, tabular-nums on all money, consistent card padding/radius/shadow (kill
the 12px-vs-14px radius fight at lines 118/120).

**D. Summary panel polish.** Isolated grand total (largest number on screen), per-section
subtotals, muted sub-lines; sticky behavior kept.

**E. Inputs + tables.** Quiet borders, navy focus ring, zebra/hover rows from tokens,
hover row actions in saved lists; status pills on saved quotes; empty states.

**F. guides.html alignment.** Keep its warm paper/Cormorant character (it's the
family-facing voice) but move its navy/orange to the same official brand pair, and
mirror the button hierarchy (one orange primary per card is already right). Shared
header geometry with the tool where sensible.

**G. Deferred:** good/better/best compare view; dark mode (needs full tokenization
first); nav regrouping.

## 4. Open items

- **Mobbin** (Martice's suggestion) is login-walled; a tab is open in his Chrome — with
  a logged-in session we can pull real screenshots from their Finance / Payment Method /
  Dashboard shelves to sanity-check A–E before building.
- Claude-design consult (claude.ai) can re-review via the public repo/live URLs; ask it
  for a written direction doc against this file.
- Before-screenshots: `scratch/_ui-before/` (00 gate, 01 home, 02–03 cem builder,
  04–05 guides), capture script `scratch/_ui-before-shots.mjs`.
