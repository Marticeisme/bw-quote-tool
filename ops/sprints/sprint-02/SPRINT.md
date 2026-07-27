# Sprint 02 — Map inventory styling

**Goal:** the WMP map reads at a glance as a *sales* surface. A counselor opens a garden and
sees immediately what is sellable, without clicking anything; a family sees their actual
ground, not a diagram. Derived from a teardown of PlotBox/EverAfter's public map, which does
the base layer well and carries no inventory state at all.

**Runs the ROADMAP milestone S7.** Sprint numbers and roadmap milestone IDs are not the same
thing — this runs ahead of S2 (`prices.json`) at Martice's direction, 2026-07-26.

**Repo: `wmp-cemetery-map/`** — its own git repo, **no remote**, gitignored by this one. All
work is committed locally there and pushed nowhere, because there is nowhere to push.

## Definition of done

1. Plot polygons carry **one** outline colour. Status is never encoded in stroke colour.
2. Every one of the **six** status values in the data renders a defined treatment, and a
   seventh value appearing later **fails a test** rather than rendering as nothing.
3. At overview zoom, available and buried plots are **measurably** distinguishable — asserted
   by pixel sampling, not by eye.
4. Labels rotate to their row's bearing, sit at the plot edge, survive a dark background, and
   thin out as zoom decreases instead of colliding.
5. `npm test` in the map repo stays green — currently **19 + 7 + 8 assertions** and
   `2/2 unit files valid, 2770 units checked, index ok`. Counts may rise, never fall.
6. No regression in the `audit/map-bugs` fixes: `#space=<sid>` still resolves for an unsold
   space, the niche lasso still resolves in all 12 structures.
7. **No screenshot committed or produced anywhere contains a real name.**

## The status vocabulary — measured, not assumed

Sampled from the map data on 2026-07-26. Percentages are from the 5,975 records whose file
shape a quick walker matched; the full corpus is ~79,493 positions, so treat the ratios as
indicative and the **value set** as authoritative.

| Status | Share | Treatment | Why |
|---|---|---|---|
| `buried` | 61.4% | no fill, **filled dot or small cross** glyph | the photo shows a real marker — don't cover it |
| `available` | 20.1% | **low-alpha tint (~15%)**, no glyph | the question being asked; the photo underneath is just grass, so nothing is lost |
| `reserved` | 18.2% | no fill, **hollow ring** glyph | "claimed but empty" — the distinction counselors get wrong |
| `hold` | 5 records | **diagonal hatch** + reason on hover | conditionally sellable. **Must NOT get the available tint** — that is a double-sale waiting to happen |
| `not_for_sale` | 3 records | diagonal hatch + reason on hover | excluded ground |
| `tree` | 8 records | diagonal hatch + reason on hover | excluded ground, different reason |

**The three exception states are 16 records in total.** They do not each earn a distinct visual
language; one hatch treatment with the precise reason in the hover/tooltip is proportionate.

**Ranking that drives the whole design: fill > texture > glyph, by zoom-robustness.** At 4px a
fill still reads, a hatch still reads as *different texture*, and a glyph collapses to a dot. So
the distinctions needed from a distance (sellable, excluded) get fill and hatch; the fine
distinction that only matters up close (reserved vs buried) gets the glyph.

## Design decisions (already made — do not re-litigate)

- **Outline = feature class, fill = state.** Plot outlines are `#e84610` (brand orange);
  circulation is `#466e86` (brand navy) as a **double stroke**, not a filled band, so the path
  surface stays visible. Four outline colours was considered and rejected: hairlines are the
  worst carrier of colour over photographic ground, red/green is the colourblind trap, adjacent
  coloured hairlines blend to mud at overview zoom, and nothing rests.
- **Available tint is pale cream/white, not green.** Green on grass is invisible and green/red
  is the colourblind failure. White also *means* the right thing — blank, unclaimed. It keeps
  navy free for circulation, so navy is always a stroke and the tint is always a fill.
- **Default the view to two states** — sellable versus not — with a toggle to the full six.
  Scanning for inventory does not need six categories; records work does.
- **Selection is its own channel** — a pin or a heavier stroke, never a colour change. The
  moment selection borrows a status colour the two start lying about each other.
- **Do not touch the ~2.7 m imagery offset.** Deliberate, hand-corrected against the aerial.

## Gate 0 — MET 2026-07-26

**All three items are now satisfied.** The other session committed its in-flight work
(`2afde80`, `36aacd3`) and `audit/map-bugs` was merged as **`b9677db`** — a hand-resolved
conflict, because both sides had rewritten the same rendering code. The merge kept main's
CSS-grid unit sizing AND the audit's off-screen fix and `data-*` lasso attributes; dropping
either would have silently re-broken the lasso in 9 of 12 structures. Verified in a browser
at 1500px and 1100px across six structures: every card on screen, Back reachable, all units
carrying `data-wall`, zero overlapping placements, no page errors. Suite green at 19 + 7 + 8
and `2/2 unit files valid, 2770 units checked, index ok`.

**Track A branches from `b9677db` or later.** The original blocking text is kept below as the
record of what had to clear.

### What had to clear (historical)

1. **`audit/map-bugs` must be merged into the map's `main` first.** It is 9 commits and it
   touches `index.html` — wall-view, routing, the niche lasso, HTML escaping — plus it adds
   `scripts/data-integrity.test.mjs` and `scripts/sid-index.test.mjs` to `npm test`. Styling on
   top of unmerged audit work guarantees a hand merge in the same file.
2. **That merge is blocked on another session.** The primary map tree has uncommitted work in
   `data/garden-markers.json`, `data/mausolea/SER.json`, `docs/INDOOR_AND_NICHE_BUILDINGS.md`,
   `index.html`, plus untracked `MVCN.json`, `buildings/MVC.json`, `SER_SERENITY_PRICING.md`.
   A director must not resolve another session's in-flight work. **Do not spawn this track
   until that tree is clean and `audit/map-bugs` is merged.**
3. Confirm `npm test` in the map repo is green at the post-merge commit, and that nothing is
   listening on 8642.

## Tracks

| Track | Branch | Model | Scope |
|---|---|---|---|
| A | `s02/map-inventory-styling` | Opus | Outline/label/status rendering + the verification harness. Single track — it is all one rendering path in one file. |

## Verification — the part that needs designing, because this is visual work

"It looks right" is not a gate. Three layers:

**Automated invariants (the real gate):**

- **Status coverage:** assert the styling map handles every distinct `status` value present in
  the data, and **fails when an unknown one appears**. A new status rendering as nothing is the
  silent failure this sprint must not create.
- **Distinguishability:** render a fixed area at overview zoom, sample pixels inside known
  `available` versus known `buried` polygons, and assert the mean difference exceeds a
  threshold. This is what proves the tint survives being 15% alpha over grass — the thing
  reviewers cannot judge from a thumbnail.
- **Label density:** at overview zoom, assert the count of drawn labels is below a collision
  threshold and no two label bounding boxes overlap.
- **No regression:** `#space=<sid>` resolves for an unsold sid; the lasso resolves in all 12
  structures. Both were fixed on `audit/map-bugs` and both live in the code being restyled.

**Screenshots for human judgement** — at fixed zoom and centre, same frames every run, so they
diff meaningfully across iterations.

**Operator sign-off (gate):** only Martice can say whether it reads correctly over *his*
imagery. Dry summer grass, long shadows, gravel and pale stone each fight a low-alpha tint
differently, and the reference imagery in the teardown was flown with a low sun. Treat the
palette as a first pass to tune on real ground, not a spec to trust unseen.

## The PII rule this sprint adds

**No screenshot may contain a real name.** The wall view and the cremation card render occupant
names; the map repo holds real burial records for living property owners. A screenshot is a file
that can be copied, attached or pasted, and it escapes every guard we have — `.gitignore`
protects the data directory, not an image of it.

So: capture the **plot overview only**, or mask names before saving. If a view under test cannot
be captured without a name in frame, do not capture it — describe it instead. This applies to
the track's report as much as to committed files.

## Merge order

Single track. Merge `s02/map-inventory-styling` `--no-ff` into the map's `main`, re-run
`npm test` there. Nothing is pushed; the map repo has no remote.

## Out of scope

- Map hosting, auth and the de-identified-export question — undecided, and unrelated.
- Drone imagery capture, orthomosaic processing, control-point alignment.
- `prices.json` consumption (ROADMAP S2), the quote-tool side of the integration, and the
  map→tool "send selection to quote" return path. **That return path is the highest-value map
  work after this**, but it is a separate sprint that spans both repos.
- The two escalated position conflicts in CN and ELN. Operator + MIS, never a track.
