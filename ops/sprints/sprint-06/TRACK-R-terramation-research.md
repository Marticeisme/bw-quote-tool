# TRACK R — Terramation research brief

You are a research track for sprint-06 of the BW Quote Tool project
(`C:\Users\Martice\bw-quote-tool`). Obey `ops/SPRINT_GUIDELINES.md` and `ops/DESIGN.md`.
You produce ONE deliverable and change nothing else:

**`ops/sprints/sprint-06/RESEARCH.md`** — a sourced research brief on terramation
(natural organic reduction), written to inform a family-facing Bonney Watson guide that
another track will build from your brief. You do not build the guide.

## Context

Bonney Watson is a Seattle-area funeral home + cemetery. It offers terramation through a
partnership with **Return Home** (a terramation provider in Auburn, WA). The tool's
General Price List (`pdf-assets/General Price List.pdf`, p13) prices it at **$7,795.00**
(includes basic services of funeral director and staff, transfer, bathing of the deceased,
natural organic reduction through a third party, utility vehicle) plus an optional
**$895.00 Laying in Ceremony** (video tribute, live webcast, two hours' use of Return Home
facility and staff). Verify both figures yourself from that PDF (PyMuPDF; the Read tool
cannot render PDFs here).

## On-hand source material (read all of it first)

All in `reference-docs/internal/` (LOCAL-ONLY, gitignored — quote from them, never copy
them anywhere, never commit them):

1. `Terramation Description.pdf` — 1 page, text. The process in BW's own words.
2. `Terramation Info Booklet (PDF).pdf` — 12 pages, image-only scans (BW-branded family
   booklet). Render pages with PyMuPDF (`get_pixmap(dpi=80)`) to the scratchpad and READ
   them as images — there is no text layer.
3. `Bonney Watson Return Home Partner Training Guide.pdf` — 13 pages, INTERNAL partner
   sales training. Mine it for the facts families ask about (process steps, laying-in
   ceremony, soil return in burlap bags, partnership mechanics). Its sales tactics and
   quiz material are context for YOU, and must not be presented as guide content.

## Research (web) — verify, never trust, cite everything

Use WebSearch/WebFetch. For every claim in your brief, record the source (URL + what it
says + date accessed). Where the on-hand material and an outside source disagree, flag
the disagreement explicitly rather than picking silently. Cover at least:

1. **What terramation/NOR is** — process, timeline (the on-hand material says 60 days
   total: ~30 in vessel + ~30 curing; check whether Return Home's published figures
   agree), organics used, screening of implants, bone reduction, soil output (~500 lb /
   0.75–1 cu yd claimed).
2. **Legal status** — Washington legalized NOR first (2019 law, effective 2020 — verify
   bill number and RCW citation from a primary source, do not trust this recital); which
   states allow it now; anything a WA family needs to know legally about placing soil on
   private/public land (landowner permission).
3. **Return Home specifically** — location, facility, their published process/pricing
   (public website), what a "laying-in" ceremony is, visitation during the process.
4. **Environmental claims, honestly** — energy vs cremation, emissions, what independent
   or journalistic sources actually support vs marketing language. The guide must not
   overclaim; note which claims are vendor-sourced only.
5. **What families commonly ask** — religious perspectives (note: several religious
   bodies have objected — report what's true, the guide will handle it gently or omit
   it), cost context vs cremation/burial (use the tool's own GPL for BW's other prices),
   whether soil can be buried/scattered at a cemetery (can WMP accept terramated soil in
   its gardens/graves? If you can't determine BW policy from the materials, list it as an
   OPEN QUESTION for Martice rather than guessing), pre-planning availability.
6. **Vocabulary** — terramation vs "human composting" vs NOR; which terms BW's own
   materials prefer (they say Terramation; note Recompose etc. use other terms).

## Deliverable shape (`RESEARCH.md`)

- **Facts for the guide** — organized by guide-section candidates (What it is / The
  process / The laying-in ceremony / Receiving the soil / What it costs / Legal &
  practical / FAQ), each fact with its source tag.
- **Claims to avoid or soften** — anything vendor-only, contested, or unverifiable.
- **Open questions for Martice** — anything only he can answer (e.g. WMP soil-placement
  policy, whether pre-need terramation contracts are sold).
- **Sources** — numbered list, URL + access date.

## Hard rules

- Read-only except for `ops/sprints/sprint-06/RESEARCH.md`. **No git commands at all** —
  the director commits your file.
- No production Firebase access, no edits to any HTML/JS, no pushes.
- Nothing from `wmp-cemetery-map/` data, no real customer names anywhere.
- Report format per `SPRINT_GUIDELINES.md` rule 8: what you produced, verbatim evidence
  for the two GPL figures, your open questions, and anything the director must verify.
