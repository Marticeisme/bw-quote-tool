# Design Consult Brief — Niche & Crypt Map Readability (screen + print)

**Prepared for:** a Claude design consultation (separate ask from
`DEBRIEF_design_2026-08-06.md`; Martice may run this now or later)
**Prepared by:** Claude (engineering session), for Martice Morrison
**Date:** August 6, 2026

## What these are

**Scope: the maps linked from the Family Guides & Resources page**
(https://marticeisme.github.io/bw-quote-tool/guides.html, Maps section) — these are
the family-facing set. Generated interactive maps of niche/crypt structures at
Washington Memorial Park, in `MAPS/` on the public repo
(https://github.com/marticeisme/bw-quote-tool → live at
https://marticeisme.github.io/bw-quote-tool/MAPS/<file>):

- `COM_CryptMap.html` — Chapel of Memories mausoleum crypts
- `MVC_NewGlassFront_NicheMap_1.html` — Mountain View Columbarium glass-front niches
- `ECL_NicheMap.html`, `GOMN_NicheMap.html`, `ROAC_NicheMap.html` — Eternal Light /
  Garden of Meditation / Rock of Ages niche walls
- `TGMP_Map.html` — Terrace Garden Memorial Path

(`COM_Walkthrough.html` / `ELM_Walkthrough.html` are 3D splat walkthroughs, also on
the resources page but **out of scope** for this print/readability consult. The other
generated maps in `MAPS/` — `ELM_CryptMap.html`, `TG_Mausoleum_Map.html` — aren't on
the resources page; apply the resulting template to them too, but they're not the
review targets.)

Each is generated from a data module (`scripts/*-data.mjs`) by a build script
(`scripts/build_*_map.mjs`) and checked by a verify gate — so **feedback lands as
changes to the build templates, not hand-edits**. Any consistent design language you
propose can be applied across all eight in one pass per builder.

## Who reads them, and the two reading modes

A sales counselor uses these **live in front of a family** choosing a niche/crypt, on
a laptop; and **prints them** (or prints the guide PDFs that embed the same views) to
hand across the desk or mark up. So every map has two renderings that must both work:

1. **Screen** — interactive: hover/tap a unit for a card (location id, availability,
   price when showable), search, level/face switching.
2. **Paper** — the print stylesheet: static, monochrome-safe, no hover affordances.
   Some maps use a screen-half/paper-half pattern (separate blocks shown per medium).

**The print versions are the priority of this consult.** They're functional but read
as engineering output — dense unit grids, small labels, legends that assume the
interactive context.

## The design problem, honestly stated

These maps are **seating charts, not floor plans**: abstract grids of units organized
by wall/face/level/row. Families (often older adults, often grieving) need to answer,
at a glance, on paper:

- Where is this wall/bank physically in the building or garden? (orientation)
- Which spaces are available vs sold/reserved? (status)
- Which row height am I looking at? (niche row = eye level vs bottom row matters)
- What does an available space cost? (when a price is shown at all)
- Which exact space is "mine"? (the one the counselor circled/discussed)

## Established conventions — keep unless you argue otherwise

These came from earlier design/build rounds and have reasons behind them:

- **Status is pattern, never hue alone** (prints monochrome, accessible): available =
  clean/white, sold/occupied = hatched or filled pattern. No third state gets color.
- **No price is displayed on sold/occupied units.** Ever.
- Some structures deliberately **withhold prices** pending source-data verification
  (e.g. COM crypt prices), and some products have **no published price** (e.g. RUG) —
  the design must have a graceful "price on request" state, not an empty gap.
- Unit ids follow the location grammar (Section/Building · Face/Bank · Level/Row ·
  Space). Ids must remain findable — counselors search by them.
- Brand: BW navy/orange, but maps are data surfaces — brand color belongs in the
  page chrome/legend, not the unit fills.

## What we'd most value

1. **A print-first visual language for the unit grids**: line weights, label sizes,
   hatch patterns, row/level headers, and a legend treatment that a 70-year-old can
   read across a desk on US Letter. Concrete values (pt sizes, stroke px, pattern
   specs) — these go into build templates.
2. **Orientation devices**: small locator inlays ("you are looking at the north wall"),
   face/elevation labels, entrance markers — how do we anchor an abstract grid to the
   real building without redrawing architecture?
3. **A "this one" affordance for print**: a printed map's job often ends with one
   circled unit. Should the print view support a highlighted-unit state (star/heavy
   ring + callout) the counselor sets before printing?
4. **Hierarchy between map and metadata**: where do title, building name, date printed,
   price table / range, and the price-on-request note live on the printed sheet?
5. **Consistency audit**: the eight maps evolved over sprints and differ in legend
   placement, label density, and print handling. A single template spec we can apply
   to all builders.
6. **Screen-side quick wins** are welcome (hover card layout, search affordance,
   level-switch controls), but paper is the priority.

## Constraints

- Static HTML/CSS/JS, no build step beyond the Node generator scripts; print via the
  browser print stylesheet. SVG/absolutely-positioned divs per unit.
- Must stay legible in **grayscale** print and photocopy.
- Data-accuracy rules are hard: statuses come from the data modules (sourced from
  MIS); the design never implies availability it doesn't have.
- Don't propose renaming/moving files — the maps are linked from guides and the tool.
- The private WMP master map (separate, localhost-only, contains burial PII) is out
  of scope and cannot be shared.

## What to return

A written spec: the print template (layout regions, type scale, line/pattern values,
legend), the orientation device, the highlighted-unit treatment, and per-map notes
where a structure needs an exception (e.g. hexagonal MVC vs flat walls). Rough CSS or
SVG pattern snippets welcome — we implement in the build scripts.
