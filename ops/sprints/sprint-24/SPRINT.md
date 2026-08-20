# Sprint-24 — Guide voice & style round

**Opened 2026-08-20.** Operator ask (in-chat): sample funeral-industry articles and news
sources, distill their writing styles, and apply them to the family guides **while keeping
the prose in his voice**. One named defect: guides must stop opening with meta-hook
sentences like *"This is the thing families most often have wrong, and it shapes nearly
everything else in this guide"* (live today in cemetery-property-guide.html:440; the
pattern, not just the instance, is the target).

**Operator rulings at open (in-chat 2026-08-20):**
1. Depth = **openings + weak passages** on all prose guides. Gold-standard guides
   (per docs/GUIDES_VOICE_DEBRIEF_2026-08.md) get a light touch. Facts, prices, and page
   structure untouched.
2. Style research samples **consumer death-care journalism first** (NYT/Atlantic-class
   features, TalkDeath, Modern Loss, Funeral Consumers Alliance, Order of the Good Death),
   plus a few trade pieces (NFDA, Connecting Directors) for contrast.
3. The binding voice rules in docs/GUIDES_VOICE_DEBRIEF_2026-08.md are a hard filter over
   anything borrowed: first person, contractions, NEVER em dashes / "inventory" /
   "counselor" / marketing copy. Borrowed style loses to his voice every time.

## Scope

**In:** the 26 prose guides — all `*-guide.html` EXCEPT urns-guide.html and
keepsake-urns-guide.html (catalogs), PLUS direct-cremation.html,
outside-marker-rules.html, and flush-markers.html (prose guides outside the naming
pattern; the first two are Tier 1/2 offenders in the voice debrief — amendment logged
at spawn, found during the Track R audit). Their rebuilt PDFs, and the new checked-in
style reference `docs/GUIDE_STYLE_2026-08.md`. GPL and all catalogs stay as-is per the
standing debrief.

**Out:** index.html (byte-untouched all sprint, sha256-audited at merge), guides.html
card copy (unless a rewritten guide's summary line goes stale), contract generators,
letters/tools.

## Tracks

- **R `s24/style-research`** (runs first; web-enabled): sample ≥12 published pieces per
  ruling 2, distill into `docs/GUIDE_STYLE_2026-08.md` — opening moves that work, cadence,
  transition techniques, what to steal and what the voice rules ban. Director audits the
  doc before Wave 1 spawns.
- **A `s24/voice-decision-guides`** ∥ **B `s24/voice-location-guides`** (parallel
  worktrees; guides only, no shared files): apply the style doc. A takes the 12
  decision/planning guides (incl. direct-cremation.html), B the 14 location/product
  guides (incl. outside-marker-rules.html and flush-markers.html). Each rebuilds its guides'
  PDFs and runs the full gate set.

Merge order: R → A → B.

## Gates

- Gate 0 (met at open): origin/main..main = 0; index 8/0; full suite green at the
  3063/46 pin (measured this session).
- Per track + on main after each merge: `npm run check` 8/0; `npm test` 3063/46 (prose
  edits change no assert counts — any drift is a defect, stop and diagnose);
  `node scripts/verify_family_type.mjs`; `node scripts/verify_guide_pages.mjs`; rebuilt
  PDFs within each guide's page cap; index.html sha256 unchanged vs pre-sprint.
- Close gate (operator): eyeball renders of every rewritten opening; push word. NO push
  pre-authorization.

## Notes

- The working tree carries this session's uncommitted payment-options-letter.html fix
  (verified 20/20) — separate deliverable, not sprint scope, awaiting the operator's
  commit/push word. Tracks work in worktrees and never touch it.
- SPRINT_GUIDELINES.md's git-conventions section still instructs a Co-Authored-By
  trailer; the 2026-08-08 standing operator rule bans all AI co-author trailers. The
  standing rule wins; guideline line corrected this sprint as ops bookkeeping.
