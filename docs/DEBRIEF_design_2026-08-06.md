# Design Consult Brief — Quote Tool chrome + Family Resources refresh

**Prepared for:** a Claude design consultation
**Prepared by:** Claude (engineering session), for Martice Morrison
**Date:** August 6, 2026
**Predecessor:** `DEBRIEF_design_2026-07-17.md` — that consult's family-quote
recommendations shipped (2-page family quote, unified print/PDF system, brochure
palette). **This round is the two surfaces that consult didn't get to: the counselor
app's own chrome, and the family resources page.** The family-facing quote PDFs are
DONE and out of scope — do not redesign them.

## What we want from you

Inspiration and a concrete direction for a **visual refresh** (not a rebuild, not new
features) of:

1. **The counselor app chrome** — `index.html` at
   https://marticeisme.github.io/bw-quote-tool/ (sidebar, topbar, quote-builder
   panels, fixed summary panel, saved-quote lists, form controls).
2. **The family resources page** — https://marticeisme.github.io/bw-quote-tool/guides.html
   (card grid of guides/catalogs; warmer, serif, family-facing voice).

The repo is public (https://github.com/marticeisme/bw-quote-tool) — you can read all
the code. App CSS is `index.html` lines ~9–429; guides.html is self-contained.

**Hard constraint from Martice: keep the color schemes and logos.** The refresh is
hierarchy, spacing, typography, and consistency — not a new identity.

## What our research already found (build on it, challenge it where you disagree)

We researched Jobber/Housecall Pro/QuickBooks/Xero/PandaDoc patterns, browsed Mobbin,
and walked through both industry incumbents live (Passare, Batesville MIS). Full notes:
`docs/UI_RESEARCH_2026-08-06.md`. Headlines:

- Both incumbents are 2005–2012-era enterprise UIs; the quote tool is already the most
  modern surface in the building. The refresh widens a lead, it doesn't chase anyone.
- The strongest reference screens found: Xero's invoice editor (one filled primary
  action, quiet bordered line-item table, isolated Subtotal/Total block, Draft status
  pill) and Xero's quotes list (status tabs with counts); Dialpad checkout (sections
  get a checkmark + "Edit" when complete; right-rail total isolated).
- **Color drift is real and is our opening move**: the app chrome runs navy `#14304a` /
  orange `#E5480F`, the family PDFs run the official brand navy `#466e86` / orange
  `#e84610` (from the 2026 GPL brochure), and guides.html runs a third pair
  (`#3d5a7a` / `#c8540a`). Plan A is unifying everything on the official
  `#466e86` / `#e84610` pair — "keep the colors" means the *brand's* colors.
  **Open design question for you: derive the dark sidebar/topbar shade from the
  official navy hue — what exactly?** (Current sidebar is near-black `#14304a`;
  July's still-open request was a "deeper navy" chrome that doesn't feel washed out.)

Our current change list (sequenced A–F) is in `UI_RESEARCH_2026-08-06.md` §3 —
palette unification, one-primary-button discipline, type/spacing scale, summary-panel
polish, quiet inputs/tables/status pills/empty states, guides alignment.

## What we'd most value your judgment on

1. **The exact token set.** A small `:root` scale (type, spacing, radius, shadow,
   the navy ramp from `#466e86`, orange usage rules) that both index.html and
   guides.html share — while guides.html keeps its warm paper + Cormorant character.
   Concrete hex/px values please; we implement verbatim.
2. **The summary panel** (fixed right card with running total + PDF/Print/Copy/Save/
   Reset). How should the total read, and how do five actions become one primary +
   quiet rest?
3. **Panel headers and density** in the quote builders: 15+ collapsible panels with
   emoji-era icon chips, uneven paddings. What's the calm version? (Icons are inline
   Lucide SVGs now — keep them.)
4. **Saved-quote lists** — plain tables today. Status tabs? Pills? What statuses make
   sense for a two-person shop (Draft / Saved / Printed / Converted-to-contract)?
5. **guides.html cards** — currently good; what would make them excellent? (Category
   pills, card hover, CTA hierarchy of Open Guide vs PDF.)
6. **Anything we're wrong about.** If a pattern in our list doesn't fit a tool used
   live in front of grieving families, say so.

## Constraints (same as last time, still hard)

- Single-file HTML/CSS/JS, no build step, no frameworks. Hand-written CSS classes.
- Desktop-first; two expert users; speed and scannability in front of a family beat
  aesthetics. No onboarding scaffolding, no marketing chrome, no dark mode this round.
- Tone: dignified, warm, calm. Never salesy. This is end-of-life work.
- Brand fixed: BW fleur logo(s), navy/orange per above. Fonts currently: Public Sans +
  Source Sans 3 (app), Cormorant Garamond + Source Sans 3 (guides) — proposals may
  adjust usage/weights but not introduce new families.
- The family quote print/PDF pipeline is sealed — nothing you propose should touch
  `_printQuoteCSS`, `_FQ*`, or `_buildQuotePDF`.
- Implementation realities the engineer must honor (don't design against them):
  fixed summary panel is `position:fixed; width:260px` with a coupled 292px content
  clearance; `.section{display:none}` view switching; ~226 JS-set inline styles;
  sidebar width 264px is load-bearing for contact-grid breakpoints.

## What to return

A short written direction: token values, 3–5 component treatments (summary panel,
panel header, saved list row, button set, guide card), each with before→after
rationale and rough CSS. Mockups welcome but optional — precise values beat pictures.
