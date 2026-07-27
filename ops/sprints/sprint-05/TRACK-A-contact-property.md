# TRACK A — What they own

**Branch:** `s05/contact-property`, cut from current `main`. **Working directory:**
`C:\Users\Martice\bw-quote-tool` (main tree — you are the only track running).
**Model:** Opus. **Read first:** `ops/DESIGN.md`, `ops/SPRINT_GUIDELINES.md`, and
`ops/sprints/sprint-05/SPRINT.md` — its measured reality and its PII rule bind you.

You are fixing the thing the operator called **"the most important part."** Right now the tool
cannot represent the property a family already owns, so every existing owner — the most valuable
contacts in the database — renders as *"Nothing on file yet — this contact is a prospect."*
All thirty contacts he imported on 2026-07-27 show that way. It is not missing data; it is
confidently wrong in the direction that loses business.

**Line numbers below are DIRECTOR RECON — a lead, not a finding.** Verify before relying on them.

---

## The three things to build

### 1. `BW_SECTION_TYPES` — the identifier the tool is missing

His words: *"make sure that there is an identifier (since the quote tool already has this data)
that in the contact tool it shows what each type of location is, burial plot, crypt, niche etc."*

The tool today treats section codes as **one opaque namespace** — see the integration comment
near `index.html:16052`, which says a section code covers lawn and indoor alike *"so a link can
be built without first classifying it."* Nothing classifies them. You are adding that.

Shape it like `BW_ROLES` (`~11597`) — an array of records, not a hardcoded enum, with a lookup
that returns the **raw code** when it does not resolve, never blank:

```
{ code: '18',  kind: 'grave',      label: 'Garden 18' }
{ code: 'MVC', kind: 'niche',      label: 'Mountain View Columbarium' }
{ code: 'LUG', kind: 'urn-garden', label: 'Lake Urn Garden' }
```

`kind` is one of `grave | crypt | niche | urn-garden | scattering | veteran`.

**The 57 real section codes**, measured from the source file (all `LocationCode = WMP`):

- **Numeric, 17 of them:** `06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 23` — gardens, i.e.
  `grave`. Row letters **A–D**, spaces **1–4** or **1–5**, a few sections up to 24.
- **Lettered, 40 of them:** `17S CC CN COH COM ECL ELBW ELM ELN GCM GCN GGBE GOG GOLN GOM GOVN
  LCG LCGB LGP LUG LUGB MVC RAD RGBE RH RHB ROA ROAC RUG SCER SCGF SCTG SER SHOW21 TGM VCUG
  VERSES VETS VETSM VETSN`

**Get the vocabulary from the map repo, do not invent it.**
`wmp-cemetery-map/docs/INDOOR_AND_NICHE_BUILDINGS.md` is authoritative: a **crypt** is one casket
chamber; a **niche** is one urn compartment. **Never say "bay"** — Martice corrected that twice.
Read that file and `wmp-cemetery-map/data/` for the real building names; **do not copy any
occupant name out of that repo into this one, in any form** (`DESIGN.md` §6).

Two specifics already settled and not to be re-litigated:

- **`ROA` and `ROAC` are separate — and this file originally had them BACKWARDS.**
  **`ROAC` is the Rock of Ages Columbarium** (it is the code in `garden19/columbarium.json`,
  352 features) and **`ROA` is the courtyard niches** — Martice's own words in
  `INDOOR_AND_NICHE_BUILDINGS.md`: *"roa is separate, its the courtyard niches"*. Track A caught
  the director's error by reading the map data instead of trusting this file. Corrected
  2026-07-27.
- **`COM` holds both products** — 301 niches and 574 crypts, separated by `angle` in the map
  data. A section code alone does not determine its kind. **Record that honestly** (e.g. `kind:
  'mixed'` with the per-position kind coming from the property record) rather than picking one
  and being wrong half the time.

Where you cannot confidently classify a code, say so in your report and give it a neutral kind
rather than guessing. An honest gap is worth more than a confident error.

### 2. `contactProperty/<id>` — property as a first-class record

Its own per-record Firebase node, beside `contactNotes` and `contactTasks`, registered in the
same `_bwListenerSpecs()` array. **Never `.set()` the collection node.**

```
{ id, partyId,
  sectionCode,                       // '18' | 'MVC' | 'LUG' — the real WMP namespace
  lot, lotAlpha, space,              // row letter A-D, position number
  sid,                               // per-position map key, when known
  kind,                              // resolved via BW_SECTION_TYPES, overridable per record
  spacesOwned, intermentsUsed,
  deedNumber, purchasedOn,           // 'YYYY-MM-DD'
  status,                            // 'owned' | 'partially-used' | 'fully-used'
  _prov }
```

**Why this is not derived from quotes:** a family who bought in 1998 has no saved quote in this
tool and never will. Property must stand alone. Existing holdings (`bwHoldingsFor`, via
`contractRoles`) stay exactly as they are — this sits **beside** them, and the detail view shows
both.

**Display**, in the contact detail:

```
Garden 18 · Row B · Space 3            [Burial plot]
Owns 4 · 2 interred · 2 available
```

That second line is the qualifying fact. A family with unused spaces is the most qualified lead
in the building, and nothing in the tool can currently say it.

Add a **View on map** link via `bwMapUrl('space', sid)` when a sid is present. `BW_MAP_BASE` is
`http://localhost:8642/index.html` — local-only. **The link must degrade gracefully off his
machine, not break or throw.**

**"Prospect" becomes a real state.** A contact with no property *and* no holdings says so; a
contact with property never does. That sentence is the bug he reported.

### 3. Demo property data — real locations, no real graves

**Source:** `E:\Downloads\LotInquiryList.csv`.

> **PII, absolute.** All **40,816** rows are real interments with names and birth, death and
> burial dates. Columns `FirstName, LastName, DeathDate, BornDate, BurialDate` are **never** read
> into anything printed, written, committed or reported. Only `Section`, `LotNumber`,
> `LotNumberAlpha`, `LotSpaceNumber` leave your parser, and only as aggregates.

**The file is malformed and will silently mis-parse.** The header row is **tab**-delimited; every
data row is **comma**-delimited and quoted. `csv.DictReader(delimiter='\t')` reads all 40,816
rows and returns **blank for every field without raising**. Skip the header line, parse the body
with a plain comma reader, and index columns positionally:
`0 ID, 1 FirstName, 2 LastName, 3 DeathDate, 4 BornDate, 5 BurialDate, 6 LocationCode,
7 Section, 8 LotNumber, 9 LotNumberAlpha, 10 LotSpaceNumber`.

**Demo positions must provably not collide with a real grave.** Martice asked for locations taken
from that file; taken literally, the public repo would carry a record asserting an invented
person owns a grave a real person is buried in. So: use the real section codes, the real row
letters and the real space ranges, and **generate positions absent from the occupied set**. The
file gives you every occupied `(section, alpha, space)` tuple, so zero collisions is checkable —
**assert it in a test against the source file**, and skip that assertion with a loud printed
NOTE when the file is absent, the way `test-contact-csv.mjs` handles the map cross-check.

Then:

- **`data/demo-contacts.csv` gains property columns** — roughly **two-thirds** of rows get
  property, so the existing-owner case is visible and the prospect case still exists.
- **The CSV importer gains those columns** in its synonym table and mapping UI, so a real owner
  book can be bulk-loaded later.
- **The generator lives in `scripts/`**, not `scratch/` — a committed artifact whose generator
  exists on one machine cannot be regenerated from a fresh clone (`DESIGN.md` §5). Regeneration
  must be byte-identical.
- Existing `importBatches` undo must cover property records too.

---

## Hard constraints

- **NEVER write to production Firebase.** Martice has now imported real demo data into the live
  database; a stray write is no longer hypothetical. Tests use `tests/fake-firebase.js` with
  `gstatic.com/firebasejs` aborted. If you think you need a live write, stop and say so.
- **Never `.set()` a whole collection node.** Only `contactProperty/<id>`.
- **Never commit `wmp-cemetery-map/`**, and never carry a name, occupant value or anything
  derived from it into this repo — not as a fixture, a comment, or a line in your report.
- **Do not touch** the quoting path, contract generators, `contractRoles`/`bwHoldingsFor`
  behaviour, `prices.json`, or `pdf-templates/`.
- **At most ONE `Edit` to `index.html`**, then Node scripts. Every `Edit` fires a harness-level
  `PostToolUse` hook that opens the file in the Browser pane with live network access.
- **`index.html` is CRLF.** A `\n` multi-line match in a Node script silently matches nothing.
- **Stage explicit paths**, never `git add -A`. **Never push.**
- Synthetic fixtures only: 555-range phones, `@example.com`, invented names.

## Verification — quote verbatim

1. `npm run check` → `index.html: 8 blocks, 0 errors`
2. `npm test` → at or above `1038 passed, 0 failed across 23 suites` (1036 without
   `wmp-cemetery-map/` present). Compare **per-suite** counts; none may fall.
3. Baseline **14/14 identical** — dev server on 3737 first, `TAG=s05-a node scripts/baseline-capture.mjs`,
   then `scripts/baseline-sign.mjs`, diffed **by content** against `%TEMP%\bw-baseline\before`.
   Never hash a serialization to compare.
4. **New suite `tests/test-contact-property.mjs`:**
   - every one of the 57 section codes resolves, or is explicitly listed as unclassified
   - an unknown code renders as the raw code, not blank
   - a property record survives a subsequent `saveParty()` on its party
   - `Owns 4 · 2 interred · 2 available` computes correctly, including the zero-available case
   - a contact **with** property never renders the "prospect" line; one without property and
     without holdings does
   - **zero demo positions collide** with an occupied tuple from the source file
   - the map link is absent or inert when `sid` is missing, and never throws
   - `data/demo-contacts.csv` regenerates byte-identically from `scripts/`
5. **Sabotage one gate and report what went red.** Suggested: make the collision check compare
   the wrong tuple field and confirm it fails. **Confirm the sabotage broke what you aimed at** —
   a sprint-02 sabotage hit the wrong object and "passed", and a director sabotage this sprint
   silently failed to apply because a search string omitted a trailing semicolon.

## Report format

What shipped · branch + commits · verification output **verbatim** · files changed · decisions
and open questions · what the director must verify by hand.

State plainly anything you could not verify, and list any section code you could not classify
with confidence. Where a number matters, put it in a test that runs every time — every real
defect this project has found came from counting something and comparing it to an expectation.
