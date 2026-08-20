# Track B — s25/sidebar-redesign (operator round)

You are the operator-round track for sprint-25 of the BW Quote Tool. Obey
`ops/SPRINT_GUIDELINES.md` and `ops/DESIGN.md`. Repo root:
`C:\Users\Martice\bw-quote-tool`; worktree `..\bw-quote-tool-s25b` on branch
`s25/sidebar-redesign` (director-created; node_modules junctioned). FIRST ACTION:
verify the worktree base matches local main's tip. Dev server: start
`PORT=3791 node dev-server.mjs` FIRST, then `PORT=3791 npm test` (a pinned-port run
with nothing listening exits 0 having run nothing; judge by assertion count —
worktree expects the documented −2).

## The operator's feedback on the shipped sidebar (verbatim intent)

1. **"The sidebar should not show up on the guides, just the main page."** The
   sidebar renders ONLY on guides.html. Every other page shows nothing — no nav, no
   drawer, no menu button.
2. **"It does not look very good... have it match the rest of the design, it feels
   plain, and it should have a logo."** Redesign it to belong to guides.html's own
   design language, with the brand logo.

## How to scope it

- **Hub-only via the script, not by unwiring pages.** Keep the one-tag-per-page
  wiring (and the generator emissions) exactly as they are — guide-nav.js itself
  decides: inject only when `location.pathname` resolves to guides.html (handle `/`,
  `/guides.html`, and the local dev-server equivalents; nothing else matches). This
  keeps the change one file, keeps rebuilds stable, and makes a future re-enable a
  one-line ruling. Keep the existing `?family` / `family-view` bail-out (it applies
  to the hub too).
- **Redesign, on guides.html's own terms.** Study guides.html's shipped design
  before styling anything: its tokens and skin are the s19 refresh (brand navy
  #466e86, orange #e84610, warm cream, Cormorant Garamond display over Source Sans
  3, category pills, stretched-link cards with hover-only orange). The sidebar must
  read as part of THAT page, not a generic list. Required elements:
  - A masthead: `logo.svg` (the white-on-navy lockup guides.html's own header uses —
    verify which file is which by looking) on a navy block, with the same
    Est. 1868 / serif treatment the site's headers carry. The logo is the ask —
    make it feel like the page's header, not a bolted-on strip.
  - Orange accent used the way guides.html uses it (rules/hovers), Cormorant
    Garamond category headings, refined spacing and type scale, an active/hover
    treatment consistent with the cards' hover language.
  - Keep it functional: same NAV model (don't re-taxonomize), active item = All
    Guides on the hub, sections scrollable, drawer behavior on <1100px preserved
    (hub only now).
  - `prefers-reduced-motion`, focus states, print-hidden, data-pdf="drop" — all as
    before.
- **Re-pin the gate to the new intent** (the s20 gate-maintenance rule:
  update-the-probe-to-the-same-intent-at-the-new-surface, never delete asserts
  wholesale). test-guide-nav.mjs now asserts: guides.html injects the sidebar
  (masthead logo img present, one active item); EVERY other in-scope page still
  serves exactly one tag but injects ZERO nav DOM; hrefs still resolve; ?family on
  the hub injects nothing; drawer works at 375px on the hub. Report the honest new
  assert count — the suite pin (currently 3484/47) will move; quote old and new and
  let the director re-pin the governing docs.
- **Sabotage-prove the rewritten gate** (2× red/green: e.g. force-inject on a guide
  page; break the masthead logo) and quote both runs.

## Hard rules

- index.html byte-untouched (sha256 before/after in the report). PDFs must stay
  byte-stable — the sidebar was already proven print-invisible; your change must not
  touch any PDF or the manifest. No Firebase contact.
- Voice rules for any visible text (docs/GUIDES_VOICE_DEBRIEF_2026-08.md): no em
  dashes, family-facing words.
- Playwright headless for verification; Node from repo root; CRLF awareness.
- Commits: explicit paths, `[s25/sidebar-redesign]` tag, NO AI trailer. Do NOT push.

## Report

Before/after renders (desktop hub, drawer open at 375px, one guide page proving NO
sidebar, hub ?family) to `scratch/s25-b-renders/`; gate outputs verbatim (check,
suite with old→new count reconciled, guide_nav incl. sabotage, family_type,
guide_pages, photo_first, catalogs); index sha; branch + commits; decisions & open
questions.
