# TRACK B — s23/quote-lane (multi-contact, sidebar readability, payment split)

You are a track subagent in sprint-23 of the BW Quote Tool. Obey
`ops/SPRINT_GUIDELINES.md` and `ops/DESIGN.md` (read both first). Working
directory: worktree `C:\Users\Martice\bw-quote-tool-s23b` (already created,
branch `s23/quote-lane`, node_modules junctioned). ALWAYS
`git -C C:\Users\Martice\bw-quote-tool-s23b`. Commit locally; NEVER push. Stage
explicit paths only.

**Stale-base check FIRST:** your base MUST include Track A's merge (a commit
whose history contains branch `s23/contract-fixes` merged to main). Run
`git -C <worktree> log --oneline -5` — if you don't see the s23 Track A merge,
STOP and report.

Line numbers below were verified 2026-08-15 at fbeefab7 and will have drifted
slightly after Track A's merge — re-grep before each edit. index.html rules: at
most ONE direct Edit (Browser-pane hook boots the app against production
Firebase); prefer Node scripts; NEVER write to production Firebase; never call
save/persist functions from scripts (tests use tests/fake-firebase.js).

**Scope fence:** you do NOT touch the contract download code (RIC/GA/CP/CIRGAS
generators) — Track A owned the contract lane and it's merged; your changes stay
in the quote lane + family-quote PDF + emails + payment-options-letter.html.

## Feature 1 — Link MORE THAN ONE contact to a cem/FH quote (operator issue 1)

The data model already supports this: links are `contractRoles/<id>` records
(join party↔record), indexed per record as an ARRAY (`_rolesByRecord`,
index.html:12492–12494; accessors 13814/13818; save/delete 13893–13918). The
bottleneck is the pending-link UI layer, which is single-slot:

- `_bwPendingLink[type]` = ONE `{partyId, role}` (16467). Convert to an array of
  `{partyId, role}`. Every read: 16483–16484, 16505/16508/16514/16515, 16535,
  16595/16601–16607, 16853.
- `bwRenderLink(type)` (16503–16533): render a CHIP PER LINK plus a persistent
  "+ Link a contact" button. Give each chip a small role dropdown (roles from
  `BW_ROLES` — data, not enum; default 'purchaser', currently hardcoded at
  16483 and picker callback 16518) and a per-chip unlink ×.
- `bwAttachToSavedRecord(type, snap)` (16594–16615): write ALL pending links
  (Promise.all), and add RECONCILIATION — roles that existed on the record but
  were removed in the UI get `deleteContractRole()`. Today unlink never deletes
  (early return at 16601) and stale roles accumulate — fix this real bug.
- `bwRestoreLinkFor(type, snap)` (16850–16859): restores only `roles[0]` —
  restore ALL roles.
- Name auto-fill (16490–16499): fire only for the FIRST/primary link; a second
  pick must not overwrite the client-name field.
- `BW_PEOPLE_FIELDS.cem`/.fh (16627–16628) carry only purchaser — the cem/fh
  forms have no co-purchaser field, so leave BW_PEOPLE_FIELDS alone unless you
  find matching form fields; note the decision.
- Display surfaces (contact detail 16265, holdings 16080, same-records
  16178–16185) already iterate arrays — verify, don't rewrite.
- Standing decision (DESIGN §8): contact linking is OPTIONAL and offered, never
  automatic or gating; a test asserts it. Keep that test green.

Verify: extend/add a suite (fake-firebase) covering: link two contacts with
different roles → save → two contractRoles rows with correct roles; reopen →
both chips restored; unlink one → save → role deleted, other intact; legacy
single-link records load correctly; the picker still caps at 60 and creates-new.
Pin the risen suite count.

## Feature 2 — Sidebar summary readability (operator issue 2)

The panel DOES list all items (s19 F); the operator can't verify items because:
- `.s-prev-lbl` (index.html CSS line 234) is `white-space:nowrap` +
  `text-overflow:ellipsis` in a 260px panel → long labels clip, and the `×N`
  qty suffix (string-appended at ~40 lines.push sites, e.g. 7692, 7701–7713)
  is the FIRST thing cut.
- On long quotes `.s-items` (232) shrinks to a small inner scroll window
  between the fixed total and actions blocks.

Fix, keeping the panel geometry (260px, s19 design locked):
1. Let `.s-prev-lbl` wrap to up to 2 lines (`white-space:normal` +
   `-webkit-line-clamp:2` or equivalent) with `title` attr for the full label
   (add in `_sumItems`, 7346–7353) — qty suffix must survive visually; if you
   clamp, ensure the suffix is not the clipped part (e.g. render `×N` as its own
   small span pinned before the amount).
2. Give `.s-items` more room: raise `.summary-panel` max-height usage — e.g.
   `max-height:calc(100vh - 90px)` already exists (214); the est-payment hint
   (7397–7406) and actions block are the space eaters. Move `#estPaymentHint`
   above the actions but OUTSIDE `.s-items`' flex-shrink path only if it helps;
   keep total + Download PDF always visible (s19 contract).
3. Apply to all three panels (cem 2392, fh 3142, combined 4358; combined items
   via combUpdate 10885–10945).

Do NOT restructure line objects to add qty fields — the `×N` label convention
is load-bearing (Track A's RIC labelQty reads it). Renders required: short
quote, 12+ item quote, at 1366×768 and a narrow laptop height; screenshots in
scratch/s23-b-renders/.

## Feature 3 — Payment options: FH + cemetery + grand totals (operator issue 9)

Operator ruling 2026-08-15: ALL combined surfaces.

1. **Family-quote Payment Options page (page 2).** `pay.cemBase`/`pay.fhBase`
   (tax-inclusive, built at 9278–9292) already exist; `pay.fhBase` is never
   rendered. When `pay.scope==='combined'`: header at 9502 (HTML) and masthead
   at 9847 (PDF) show three figures — Cemetery $X · Funeral Home $Y · Estimated
   total $Z (Z = model.grandTotal); FH section label (9522 HTML / ~10005 PDF)
   gains its amount like the cemetery label already has (9519/10002). Single-
   surface scopes keep today's single figure. CAUTION: cemBase/fhBase are
   tax-inclusive, surfaces[].subtotal is pre-tax — the three figures must sum
   exactly (comments at 9268/9280 exist because this was once gotten wrong).
2. **Combined email** (`buildCombExportText` 10123–10147): add CEMETERY TOTAL
   and FUNERAL HOME TOTAL lines before COMBINED TOTAL, computed from
   `_combCemTotal`/`_combFhTotal` globals (10907/10913) — replace the DOM
   scraping at 10142–10145 with those globals while you're in there (it breaks
   silently when the panel isn't rendered).
3. **payment-options-letter.html:** add OPTIONAL cemetery-amount and FH-amount
   inputs; when either is filled, the letter renders the two side totals and
   their sum as the grand total (both at-need `renderAtNeed` ~:339 and pre-need
   ~:400 templates); when left blank, the letter renders exactly as today from
   the single amount. Keep the page's existing look and voice.

## Track-wide gates (verbatim in report)

- `npm run check` → 8 blocks, 0 errors
- `npm test` → green, count ≥ Track A's pin, never falls; your new suites raise
  it — pin the number
- Family-quote parity suite must pass; if your page-2 change moves drawn bytes,
  the parity gate diffs drawTexted bytes — update expectations honestly (same
  intent, new surface), never delete asserts
- Generator baseline: re-capture deliberately; combined-scenario signatures WILL
  change (page-2 header/FH label) — diff and explain every change; all
  non-combined scenarios byte-identical
- served-tree-check before any disk+served verifier; own PORT if 3737 busy;
  never stop a server you didn't start

## Report format

Per SPRINT_GUIDELINES rule 8, with renders listed (scratch/s23-b-renders/),
the reconciliation-bug before/after proof, and the baseline diff explanation.
