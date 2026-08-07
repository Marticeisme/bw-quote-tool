# TRACK F — s19 operator round (`s19/operator-round`, index.html only)

Read first: `ops/SPRINT_GUIDELINES.md`, `ops/DESIGN.md`. Two operator requests,
2026-08-06 evening, both in the cemetery/fh quote lane of index.html. Pinned contract
at spawn: `npm run check` → 8 blocks 0 errors; `npm test` → **2598 passed, 0 failed
across 40 suites** (counts may rise, never fall; worktree −2 in test-contact-csv is
the documented wmp-map-absent variance — quote its NOTE line).

## Request 1 — summary sidebar shows ALL items (cem + fh + combined)

Track A (s19) implemented the design handoff's 3-line preview + "+ N more items" in
the fixed summary panel. The operator has overruled it: **every line item on the quote
must be visible in the sidebar**, all three panels. Remove the preview cap and the
"+N more" line entirely.

- Keep the s19 visual system: kicker, 30px total, split block, THEN the full item
  list, then Est. payment hint, then actions.
- Overflow: the panel is `position:fixed; width:260px`. With many items it will exceed
  the viewport. Give the ITEM LIST internal scroll (e.g. `max-height` from viewport
  math, `overflow-y:auto`) so the total block above and the action buttons below stay
  visible at all times. Long labels keep their existing truncation/ellipsis behavior.
  Geometry (260px width / 292px clearance) unchanged.
- `tests/test-family-quote-subtotal.mjs` §2 reads the panel innerText — it should keep
  passing (more text, same figures). If any assertion needs adjusting, adjust the
  READ, never the money rules; explain in the report.

## Request 2 — auto-resolve niche glass/granite + mausoleum indoor/outdoor

Today `qNicheName`/`qMausName` selections have zero effect on the Glass/Granite
(`qNicheGlassRow`/`qNicheGraniteRow`, logic ~7673–7691) and Indoor/Outdoor
(`qMausIndoorRow`/`qMausOutdoorRow`, ~7711–7729) arrangement rows — both rows always
show. Make the selection determine which arrangement row is offered.

**Operator's classification table (2026-08-06, binding):**

| qNicheName option | Type |
|---|---|
| Crystal Niches | glass |
| Court of Honor Niches | granite |
| Eternal Light Columbarium (New) | glass |
| Eternal Light Niches | glass |
| Garden Court Niches | granite |
| Terrace Garden Niches | granite |
| Garden of Gethsemane Niches | granite (sold out, classification still applies) |
| Garden of Meditation Niches | granite |
| Mountain View Columbarium | REPLACED by two options (operator 2026-08-06, sent mid-track): "Mountain View Columbarium (Inside)" = glass, "Mountain View Columbarium (Outside)" = granite. Legacy saved value "Mountain View Columbarium" must still load safely (untyped → both rows), asserted. |
| Mountain View Columbarium (New) | glass |
| Radiance Wall – Chapel of Memories | glass |
| Rock of Ages Columbarium | granite |
| Serenity Wall – Chapel of Memories | glass |
| __custom__ / empty | both rows |

| qMausName option | Type |
|---|---|
| Chapel of Memories | indoor |
| Eternal Light Mausoleum | indoor |
| Garden Court Mausoleum | outdoor |
| Terrace Garden Mausoleum | outdoor |
| __custom__ / empty | both rows |

**Behavior (director-ruled):**
- When the type is known: show ONLY the matching arrangement row; the hidden row's
  checkbox is UNCHECKED programmatically if it was checked (so no invisible charges —
  assert this in the gate). Mixed/custom/empty: both rows show, nothing auto-checked.
- Do NOT auto-check the visible row's checkbox — the counselor still opts in, exactly
  like Standard Burial/Urn today.
- Bundles themselves unchanged (glass = Recording + Niche Inurnment; granite adds
  Shutter Inscription; indoor adds Monobar Court + install; outdoor adds Maus/Colum
  Inscription).
- Implement as ONE data map (e.g. `BW_NICHE_TYPE` / `BW_MAUS_TYPE` keyed by the exact
  option values) near BW_FEES with a provenance comment (operator ruling 2026-08-06).
  Wire inside `cemUpdate()`'s existing niche/maus blocks. Update the reset/re-hide
  registries (~8879–8949, rows list) so cleared state is correct.
- The Compare tool (Option B, `cmpB_glassNiche`/`cmpB_graniteNiche`/`cmpB_indoorMaus`/
  `cmpB_outdoorMaus`, ~1091–1109, calc ~8461+) has NO location selects — leave it
  manual, untouched, and say so in the report.

## Constraints

- SEALED as all s19 tracks: `_printQuoteCSS`, `_FQ*`, `_buildQuotePDF`, contract
  generators, geometry couplings, `.section{display:none}`. No Firebase writes ever.
- CRLF; targeted edits; explicit-path staging; no pushes. `[s19/operator-round]`
  commits, Opus co-author line.
- Add/extend a test: new asserts proving (a) each mapped niche name shows exactly its
  row and hides+unchecks the other, (b) mixed/custom shows both, (c) all-items sidebar
  renders every line (build a quote with 12+ items via the fake harness and count),
  (d) hidden-row uncheck kills its charge. Sabotage-prove at least one assert each
  direction.

## Verify (verbatim in report)

`npm run check` 8/0; full `npm test` counts (2598 baseline + your new asserts);
family-quote parity suite line; PDF byte-proof as Track A did (fixture PDF sha256
before/after your diff, negative control); before/after screenshots of cem builder
with a 12-item quote (sidebar showing all), fh panel, and the niche/maus rows for a
glass pick, a granite pick, mixed, and custom (`scratch/s19-f-renders/`).
