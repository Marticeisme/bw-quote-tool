# Track A — s25/guide-sidebar

You are the build track for sprint-25 of the BW Quote Tool. Obey
`ops/SPRINT_GUIDELINES.md` and `ops/DESIGN.md`. Repo root:
`C:\Users\Martice\bw-quote-tool`; you work in the worktree the director created at
`..\bw-quote-tool-s25a` on branch `s25/guide-sidebar`. FIRST ACTION: verify the
worktree base matches local main's tip; if not, STOP and reset (the stale-base scar).
node_modules is a junction the director made; verify `npm test` can START (start your
own dev server FIRST with `PORT=3781 node dev-server.mjs`, then `PORT=3781 npm test` —
a pinned-port run with nothing listening EXITS 0 HAVING RUN NOTHING; judge by the
assertion count, expected 3061/46 in a worktree, the documented −2).

## The ask

The operator wants a persistent left sidebar across the family-facing guides site,
the same *pattern* as the quote tool's sidebar (grouped nav, active item, always
there), so families and counselors can move between pages without bouncing through
guides.html. Skin = the guides brand (navy #466e86, orange #e84610, warm cream/offwhite
surfaces, Cormorant Garamond headings / Source Sans 3 body — read any guide's :root
block), NOT the quote tool's dark chrome. Mobile = slide-out drawer behind a menu
button; hidden by default, full reading width preserved (operator ruling).

## In-scope pages (35)

All 26 prose guides: every `*-guide.html` EXCEPT urns-guide.html and
keepsake-urns-guide.html, PLUS direct-cremation.html, outside-marker-rules.html,
flush-markers.html. All 8 catalog pages: urns-guide.html, keepsake-urns-guide.html,
all-caskets.html, metal-caskets.html, wood-caskets.html,
cremation-containers-rental-caskets.html, pcm-design-catalog.html, plus guides.html
(the hub) itself. NOT in scope: index.html (byte-untouched — record sha256 before/after
and assert identical), payment-options-letter.html, deed-transfer letter,
vital-worksheet.html, dashboard.html, viewer.html, any map page,
medicaid-professional-reference.html (internal).

## Build

1. **One shared file, `guide-nav.js` at repo root** — the single source of truth:
   - A NAV model: sections mirroring guides.html's category groupings (read
     guides.html's quick-jump pills + card sections and reuse its category names and
     page order; don't invent a new taxonomy). Each entry: href, short label.
   - On DOMContentLoaded it injects: a `<style>` block (all CSS — nothing added to the
     35 pages beyond the one script tag), the sidebar `<nav>`, and on small screens a
     menu button + backdrop for the drawer.
   - Active page highlighted by matching location.pathname.
   - Desktop (≥1100px): fixed left sidebar ~250px, page content shifted right (a class
     on <html> or body padding — must not break any page's own sticky headers or print
     CSS). Sticky, own scroll, the page's existing headers stay functional.
   - Phone/tablet (<1100px): NOTHING visible except one unobtrusive menu button
     (respect each page's existing header layouts); tapping opens the drawer over a
     backdrop; Escape and backdrop-click close; focus is trapped while open;
     `prefers-reduced-motion` honored.
   - **Bail-outs (return before injecting anything):** `window.matchMedia('print')`
     contexts don't matter if the CSS hides it, but ALSO: if
     `document.documentElement.classList.contains('family-view')` OR the URL has a
     `family` query param → inject NOTHING (the PCM `?family` link is deliberately
     navigation-free; the head script that sets family-view is emitted by
     build_pcm_catalog.py and runs before you).
   - `@media print { … display:none !important }` on everything you inject, and inject
     with `data-pdf="drop"` on the container for the guide-PDF pipeline.
2. **Include it everywhere in scope.** Hand-kept guides: add ONE line
   (`<script src="guide-nav.js" defer></script>`) before `</body>` — remember CRLF and
   the multiple-`</body>` trap (`lastIndexOf`). Generated pages: add the tag in the
   GENERATORS — build_pcm_catalog.py, build_all_caskets.py, build_metal_caskets.py,
   build_catalogs.py, build_cremation_rental.py, build_urn_options.py,
   build_sectioned_catalogs.py (check which of these actually emit the in-scope
   catalog HTML; some may be superseded — wire the ones that own the shipped pages,
   note the dead ones) — then REGENERATE the pages so the shipped HTML carries it.
   Hand-editing generated HTML is a defect: the next rebuild would silently drop the
   sidebar.
3. **PDF byte-stability proof.** The sidebar is screen-only. Capture sha256 of every
   PDF in pdf-assets/ BEFORE your change; after wiring, re-run the builders'
   freshness check (scripts/_pdf_manifest.mjs `check()` → 60/0/0) and assert no PDF
   changed. If a catalog regen legitimately rewrites its PDF, page counts and content
   must be identical — explain any byte drift or stop.
4. **New tracked gate `scripts/verify_guide_nav.mjs`** (register it the way other
   verify_* suites run; if it joins `npm test`, report the new honest suite count —
   never silently re-pin): served-tree check FIRST (the standing rule), then assert:
   every in-scope page serves exactly one guide-nav script tag; every NAV model href
   resolves 200 on the dev server; the nav model covers every in-scope page (no
   orphans — flush-markers.html included per the s24 finding); active-item logic
   matches per page; under print emulation nothing injected is visible; the PCM
   `?family` view renders ZERO nav DOM (and the lookalike `?familyx=1` still shows
   it); drawer opens/closes on a 375px viewport (Playwright). Sabotage-prove it
   red/green at least twice (remove a script tag; break an href) and quote both runs.
5. **Renders for the operator:** desktop sidebar on 3 representative pages, drawer
   open + closed on a phone viewport, `?family` PCM with no nav — to
   `scratch/s25-a-renders/`.

## Rules

- Voice: any visible label follows docs/GUIDES_VOICE_DEBRIEF_2026-08.md (no em dashes,
  family-facing words only). Nav labels are short page names, not descriptions.
- Never touch index.html, letters, worksheet, dashboard, maps.
- Playwright headless for all verification (MCP screenshots time out here); Node from
  the repo root.
- Commits: explicit paths, `[s25/guide-sidebar]` tag, NO AI trailer. Do NOT push.
- Firebase: zero writes (nothing in scope talks to it; keep it that way).

## Report

What shipped; the NAV model (sections + counts); generator wiring per catalog page;
gate outputs verbatim (check 8/0, suite count + explanation, family_type 121/0,
guide_pages, photo_first, catalogs, guide_nav incl. sabotage runs); PDF stability
proof; index.html sha256 before/after; branch + commits; renders list; decisions &
open questions.
