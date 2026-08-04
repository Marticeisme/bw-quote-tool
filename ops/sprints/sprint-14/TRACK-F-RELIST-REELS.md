# TRACK F — Relist the COM and ELM reels; TG stays delisted (post-close operator round)

You are a track subagent for the BW Quote Tool. Obey `ops/SPRINT_GUIDELINES.md` and
`ops/DESIGN.md`. Worktree `../bw-quote-tool-s14f`, branch `s14/relist-reels`
(`git worktree add ../bw-quote-tool-s14f -b s14/relist-reels`); junction node_modules
from the main tree. Explicit-path commits only; NEVER push; `git -C <abs-path>` always.
No GPU.

## Operator ruling (2026-08-04, verbatim)

"the reels look good link the com and elm ones" — COM and ELM walkthroughs become
family-facing; **TG stays delisted** (its outdoor stretches are not showable; re-shoot
pending). Linking was always designed as this separate deliberate act — you are
executing the relist procedure the delisting comments describe.

## The design: per-scene listing, one source of truth

1. **`scripts/walkthrough-scenes.mjs`**: add `listed: true` (COM, ELM) / `listed:
   false` (TG) to each scene, and rewrite the header's DELISTED BY DESIGN paragraph to
   describe per-scene listing with the operator's 2026-08-04 word on the record. Every
   consumer below derives from this flag — no second copy of the decision anywhere.
2. **`tests/test-family-register.mjs`** (the fast assert): replace the all-three-
   delisted block with flag-derived semantics: for `listed:false` scenes, ZERO inbound
   links from any family-facing surface (as now); for `listed:true` scenes, POSITIVE
   asserts — guides.html carries exactly one card link to the reel, and the scene's
   sibling map page carries exactly one header link. A listed reel that silently loses
   its links must go red, exactly as a delisted reel that gains one does.
3. **`scripts/verify_walkthrough.mjs`** ("Nothing links a family…" section): same
   flag-derived split, per scene. Keep the scanner sabotage (injected card link IS
   caught). Update the header comment.
4. **`scripts/build_com_map.mjs`**: restore the walkthrough header button the
   delisting comment marks (the comment block around "WALKTHROUGH DELISTED 2026-08-02"
   tells you exactly what to restore; replace that comment with a short RELISTED
   2026-08-04 note keeping the history). Rebuild `MAPS/COM_CryptMap.html`.
5. **`scripts/build_elm_map.mjs`**: add an equivalent header button on the ELM map to
   `ELM_Walkthrough.html` (match the existing header-button style — the columbarium
   button is the model). Extend `scripts/verify_elm_map.mjs` to assert it (and keep
   its full 24-sabotage set green — needles must hit rules that APPLY; they are
   CRLF-tolerant, keep them so). Rebuild `MAPS/ELM_CryptMap.html`.
6. **`guides.html`** (hand-edited page — do NOT run scripts/build_guides_page.py):
   - Restore the Chapel of Memory walkthrough card at the spot the removal comment
     marks (~line 365). The s10 card markup for reference (REWORD the description to
     match what the CURRENT reel actually shows — the new path is 5 stops of marble
     crypt walls/corridor; if the chapel + stained glass are NOT on the current path,
     the card must not promise them):
     ```
     <div class="guide-card" data-name="chapel of memory mausoleum com photoreal walkthrough 3d gaussian splat interior virtual tour">
       <div class="guide-title">Chapel of Memory Mausoleum &mdash; Photoreal Walkthrough</div>
       <div class="guide-desc">…honest description…</div>
       <span class="guide-meta-info">Interactive &middot; 3D &middot; not printable</span>
       <div class="guide-actions"><a class="guide-cta" href="MAPS/COM_Walkthrough.html">Open Walkthrough →</a></div>
     </div>
     ```
   - Add a matching NEW card for the Eternal Light walkthrough (`MAPS/ELM_Walkthrough.html`),
     same honest-description rule (mausoleum corridors + the columbarium room).
   - Bump the Maps & Locations `.cat-count` pill accordingly (read its CURRENT value
     from the page, +2; the removal comment says it was dropped 9→8 in s11 — verify,
     don't assume).
   - Read the walkthrough pages' actual stop content from the preserved captures in
     `scratch/s14-renders/s14a-renders/` before writing descriptions.
7. Check for and update ANY other gate that pins guides.html card totals or the reels'
   linked/delisted state: `verify_guides_page.mjs` (pill vs cards is dynamic — confirm),
   `verify_photo_first.mjs`, `verify_guide_pages.mjs`, grep for hardcoded card counts
   (s13 recorded "guides-page 43 cards" somewhere). Whatever pins, update WITH the
   change, never after.

## Verification (all green before you report)

- `npm run check` 8/0; `npm test` exact count + env-pinned command (expect worktree
  wmp-variance: test-contact-csv 134 not 136). The family-register and guides-page
  suites are the ones your change moves — quote their per-suite numbers before/after.
- `verify_elm_map.mjs`, `verify_ecl_map.mjs`, `verify_guides_page.mjs`, and the COM
  map's own gate all green.
- **Both slow walkthrough gates, COM then ELM, SERIALLY, never overlapping**
  (`node scripts/verify_walkthrough.mjs COM` then `ELM`; ~25–45 min each — budget for
  it). TG's gate unchanged semantics (still delisted) — run it too if time allows,
  else state plainly it wasn't re-run and why that's safe (its inputs are untouched).
- Sabotages both directions on the NEW semantics: (a) inject a TG link into
  guides.html → register suite red by name; (b) remove the COM card → red; (c) remove
  the ELM map header button → verify_elm_map red. Restore green after each.
- Renders: guides.html Maps section with both new cards, COM map header, ELM map
  header — in `scratch/s14f-renders/`, eyeballed.

## Definition of done

Commits on `s14/relist-reels`; nothing pushed; report with exact commands + numbers,
per-suite before/after for the moved suites, the card wordings you chose and why, and
anything unverified stated plainly.
