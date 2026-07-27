# Roadmap — Sprint Arc

Confirmed 2026-07-25. Sprint-01 is detailed (`sprints/sprint-01/`); later milestones are
outlines that each closing director turns into detailed files. **Reality wins over this
outline** — the closing director redraws it from what actually shipped.

Martice's note on ordering, 2026-07-25: *"prices.json but some updates may be needed as we
go along."* Treat the arc below as a living outline, and treat S2 in particular as building
for **repeated** price updates rather than a one-time extraction.

## S1 — Externalize the embedded contract templates  [DETAILED → sprints/sprint-01/]

Stop shipping 9.4 MB of base64 to every visitor. The 11 large embedded templates become
binary files under `pdf-templates/embedded/`, fetched on demand and cached in memory for
the session. First load drops from **7.30 MB gzipped to ~0.67 MB (~11×)**, and the ~1 MB
of git growth per push stops.

One track (`s01/externalize-templates`). Gate 0 requires a generator baseline captured on
unmodified `main` — captured 2026-07-25, **rebuilt 2026-07-26** after the director's boot
audit found `GA_PDF` uncovered and the signatures drifting with the wall clock. Done means:
all **14** generator signatures identical to that baseline, `npm run check` (**8 blocks**) and
`npm test` green, and a template failure surfaces a visible error rather than a silent one —
including the ACH/Rules attachments, which previously swallowed failures. Close gate: merged
locally, then Martice pushes.

## S2 — `prices.json` as source of truth  [DETAILED → sprints/sprint-03/]

Today an annual price update means hand-editing hundreds of HTML lines in a
`"Name — $1,234"` format that silently breaks the regex-scraped search index if the dash or
spacing is wrong. Measured 2026-07-26: **1,180** hardcoded `$` literals (it has grown), and `PRICE_INDEX` (841
items) is built by regex-scraping rendered DOM text — so the `Name — $1,234` format is
load-bearing, and a wrong dash silently drops an item from search with no error.

Worse, the same fees now live in **three places and are already drifting**: the quote tool,
the WMP map's hardcoded `COLUMBARIUM_FEES`, and an older unused Rock of Ages sheet. Nothing
links them.

**MIS is the source of truth for price, and printed sheets are not** (Martice, 2026-07-26).
A Serenity wall pricing PDF turned out to price only 5 of 48 niches, and three of those five
are `reserved` in MIS — sold pre-need. Six niches MIS calls available carried no price at all,
and nothing on the sheet said whether a price meant the niche right alone or a bundle. Its
real value was geometry, not prices. **If a story here involves importing a price sheet, this
rule applies to it.** Related: `wmp-cemetery-map/scripts/build-prices.py` already encodes the
resolution rule — a price is ALWAYS today's price, read `current`, never resolve as-of a date.

**Build for repeated updates, not a one-time extraction** — the deliverable is a price file
plus an update path Martice can run himself each year, not just a refactor. Depends on S1
only for file-size headroom; otherwise independent.

## S3 — Saved-list focus bug and accumulated debt

The saved-quote search box rebuilds its list via `innerHTML` on every keystroke, destroying
and recreating the `<input>` and losing focus. Pre-existing, known, deferred for scope
discipline. Alongside it: the dead tracked `BW_Quote_Tool_merged_11.html` (6.3 MB) and the
duplicate root-level marker image. Cheap, self-contained, no dependencies.

## S4 — WMP map integration

Blocked on a decision, not on code. `wmp-cemetery-map/data/` holds real burial records
including living property owners' names, and the tool deploys to a public GitHub Pages
site. Three options in the order previously discussed: deep-link only (map stays on
localhost:8642), move both behind auth, or publish a de-identified layer (space IDs and
availability, no names). **Do not start this sprint until Martice picks one.**

## S5 — Code splitting the contract generators

Only if session collisions still hurt after S1 shrinks `index.html` to ~2.3 MB. The seam
already exists and is already a rule: the six contract generators (RIC, GA, ClearPoint,
CIRGAS) are scope-isolated from the quote builders. Pull the vendored minified libraries
(pdf-lib, firebase, jszip — 3.7 MB of the file) out to `<script src>` files at the same
time; that part is free and carries no behavioral risk.

**This is a maintenance sprint, not a performance one.** After S1 there is no size argument
left for it — only the two-sessions-one-file merge pain. If that pain has gone away, so has
the sprint.

## S6 — Multi-tenant readiness  [unscheduled; added 2026-07-26, rescoped same day]

**Rescoped:** this was written as "org readiness", meaning more users at one site. The actual
direction is **multi-tenant** — separate organisations, each with their own price book,
inventory, cemetery layout and carrier paperwork. Same rule as before: **not** licence to
pre-build. Account types, a manager role and rules-enforced ownership stay unbuilt until a
second organisation actually exists.

What this milestone owns is the *audit* — confirming nothing shipped meanwhile turned
multi-tenancy into a rewrite. But the rescope changes which invariants are load-bearing. It is
**not** primarily roles. It is:

- **No assumption of a single price book.** The blocker, and the reason S2 outranks its old
  position: 1,157 hardcoded `$` literals and a `PRICE_INDEX` scraped from rendered DOM text.
  Per-tenant pricing is impossible until that is data.
- **No assumption of a single site** — one cemetery's gardens, sections and structures are
  hardcoded vocabulary in places.
- **Tenant isolation in the data layer.** Rules are `auth !== null` on every node, which is
  correct for two trusted colleagues and completely inadequate across organisations, where one
  tenant reading another's records is the whole ballgame. Records keeping `ownerUid` and
  per-record `quotes/<type>/q<id>` storage is what leaves that door open — remember there is no
  migration mechanism, so a schema change is a code change.
- **A shared write path that does not race.** `persistSavedQuotes()` uses `.set()` on a whole
  node. Invisible with two people who never overlap; silent data loss with more. This one is
  worth fixing on its own merits long before any tenancy work.

Trigger when a second organisation is genuinely imminent. Until then it is a constraint on
other sprints, not work of its own.

## S7 — Map inventory styling  [DETAILED → sprints/sprint-02/; added 2026-07-26]

The map reads as a reference, not a sales surface: a counselor cannot see what is sellable
without clicking. Derived from a teardown of PlotBox/EverAfter's public map, which does the
base layer well — drone orthophoto, hairline plot outlines, labels rotated to each row's
bearing — and carries no inventory state at all.

One outline colour with state in the fill; six measured status values, not four; and the
distinctions needed at a distance getting fill and hatch while the fine one gets a glyph.
The real work is the verification: pixel-sampling to prove a 15%-alpha tint survives over
grass, and a coverage assertion that fails when a seventh status appears rather than
rendering it as nothing.

**Blocked on Gate 0:** `audit/map-bugs` must merge into the map's `main` first, and that is
waiting on another session's uncommitted work in the same file.

## S8 — Contacts becomes a CRM  [DETAILED → sprints/sprint-04/; added 2026-07-27]

The Contacts page is one search box over four fields and a 13-field record. Martice runs
Bonney Watson's book out of FuneralDecisionsCRM, and the ask is to take what is good there —
Source/Status/Category, flags, notes, to-dos, advanced filtering, saved searches, bulk actions,
CSV import — and leave what is not. His words: *"the main goal of this whole project is to make
the best tool in the industry not an identical one."*

The design bet, from the follow-up research rather than from FDCRM: 80% of pre-need sales take
five or more follow-ups and 44% of sellers stop after one, so the default view is **who is due**,
not "all contacts". Next action is a column and the default sort.

Three sequential tracks: the record (taxonomies, flags, notes, to-dos, derived next action), then
finding people (list, hash-encoded filters, saved views, bulk actions), then CSV in and out.
**The CSV importer is also the seeding mechanism** — the 30 demo contacts Martice asked for
reach production because he imports them himself through the UI, which is why no agent ever
writes to the live database. Every import is a batch and every batch is undoable.

Out: email blasts, letters, campaigns, landing pages, attachments, appointments and the
calendar, work orders, permission tiers.

## A note on numbering

**Roadmap milestone IDs and sprint numbers are not the same thing.** This file is a catalogue
of milestones; `sprints/sprint-NN/` is execution order. Sprint-01 ran S1. **Sprint-02 runs S7**,
ahead of S2, at Martice's direction on 2026-07-26. Milestone IDs stay stable so references to
them from `DESIGN.md` and elsewhere keep resolving.
