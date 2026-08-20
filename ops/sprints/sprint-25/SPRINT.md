# Sprint-25 — Guides-site sidebar navigation

**Opened 2026-08-20.** Operator ask (in-chat): "i want a sidebar the same way the quote
tool has to make navigation easier on that site" — a persistent left sidebar across the
family-facing guides/catalog site, so moving between pages doesn't require bouncing
through guides.html.

**Operator rulings at open (in-chat 2026-08-20):**
1. Scope = **all guide + catalog pages** (the ~26 prose guides, the 6 product catalogs,
   and guides.html itself). Tools (letters, worksheet, dashboard) excluded.
2. Mobile = **slide-out drawer**: hidden by default on phones behind a menu button,
   slides in over the page. Full reading width preserved.
3. Same *pattern* as the quote tool (persistent left nav, grouped sections, active
   item); the *skin* is the guides brand (navy #466e86 / orange #e84610 / warm cream),
   not the quote tool's dark chrome — these pages are family-facing.

## Scope

**In:** new shared `guide-nav.js` (single source of truth: nav model + injected markup
+ injected CSS + drawer logic), its include across every in-scope page (hand-edit for
the hand-kept guides; **inside the Python generators** for the generated catalog pages
so rebuilds keep it), a new tracked gate `scripts/verify_guide_nav.mjs`, and regenerated
catalog pages.

**Out:** index.html (byte-untouched, sha256-audited), the guide PDFs' content (the
sidebar is screen-only; PDFs must come out byte-stable or the track stops), the PCM
`?family` view (deliberately navigation-free — the sidebar must NOT render there),
letters/tools/dashboard, wmp map pages.

## Tracks

- **A `s25/guide-sidebar`** (single track, Opus, worktree): build the component, wire
  every page, regenerate catalogs, write the gate.

## Gates

- Gate 0 (met at open): main green at 3063/46 + 8/0 (measured this session, s24 close);
  who-decides ruling commit present on main.
- Track + main after merge: `npm run check` 8/0; `npm test` 3063/46 +N for the new
  suite if it registers in the runner (report the honest number; never re-pin
  silently); verify_family_type 121/0; verify_guide_pages; verify_photo_first;
  verify_catalogs; the new verify_guide_nav gate green and sabotage-proven;
  **PDF byte-stability proof**: every guide/catalog PDF sha256-identical before vs
  after the sidebar lands (screen-only change), or page-count-identical where a
  catalog regen legitimately reflows — any PDF drift is a defect.
- Close gate (operator): eyeball desktop + drawer renders; push word. NO push
  pre-authorization. NOTE: the who-decides two-ways commit is also awaiting the push
  word and will ride the same push.
