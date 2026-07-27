# Sprint 05 — What they own, and a page worth looking at

**Supersedes the mid-sprint-04 draft of this file.** That draft held the two `index.html` items
pulled out of the guides punch list. They are still here, at the back, but the sprint's centre of
gravity moved after Martice imported the demo contacts on 2026-07-27 and reported what was
missing.

**Runs ROADMAP milestone S10** (new) plus the tool half of S9 and the S3 debt.

---

## What he said, and why the third item reorders the sprint

Verbatim, 2026-07-27, after importing the 30 demo contacts:

1. *"there is still no home screen when clicking on contacts. it just shows a running list of all
   of the contacts that you can sort by. it still needs some sort of home screen with different
   options (even if some of those options aren't available yet)."*
2. *"when clicking into a contact itself it needs to use better use of the whole page. right now
   it is so small."*
3. *"also where is the location for existing owners etc etc? **that's the most important part**
   (even if they're fake for this)."*
4. *"make sure that there is an identifier (since the quote tool already has this data) that in
   the contact tool it shows what each type of location is, burial plot, crypt, niche etc etc."*

**Item 3 is not a layout problem, it is a missing entity**, and it inverts the priority. Martice
chose the order himself: **property, then detail layout, then home.**

---

## Measured reality — 2026-07-27, after the sprint-04 push

| Thing | Measured |
|---|---|
| Property location in the tool today | **Derived only.** contact → `contractRoles` → a saved quote → `rec.spaces[0].loc`, rendered as a grey subtitle in `_bwHoldingRow` |
| A contact with no linked quote | Renders **"Nothing on file yet — this contact is a prospect."** |
| The 30 imported demo contacts | **All 30 show as prospects.** `data/demo-contacts.csv` has no property columns at all |
| Section → property-type classification | **Does not exist.** `index.html` treats section codes as one opaque namespace (see the integration comment at ~16052) |
| Why the detail view is cramped | **NOT a max-width.** `.main` is `padding` only and `.section` sets `display` only. The detail is a single stacked column of cards that never lays out into width it already has. *(The director's first guess was a width constraint; checked, and wrong.)* |
| Contact detail render | `renderContactDetail()`, tab strip from Track A, holdings from `bwHoldingsFor()` |

**The consequence, stated plainly:** the tool describes its most valuable contacts — families who
already own property — as prospects with nothing on file. That is worse than missing data; it is
confidently wrong in the direction that loses business.

---

## The location data, and the rule attached to it

Source supplied by Martice: **`E:\Downloads\LotInquiryList.csv`**.

**It is malformed and will silently mis-parse.** The header row is **tab**-delimited; every data
row is **comma**-delimited and quoted. A `DictReader(delimiter='\t')` reads 40,816 rows and
returns blank for every field without erroring. Skip the header line and parse the body with a
plain comma reader.

Column order: `ID, FirstName, LastName, DeathDate, BornDate, BurialDate, LocationCode, Section,
LotNumber, LotNumberAlpha, LotSpaceNumber, Created, Updated`.

> **PII — absolute.** Every one of the 40,816 rows is a **real interment**, with names and birth,
> death and burial dates. Columns 1–5 are never read into anything printed, written, committed or
> reported. Only `Section` / `LotNumber` / `LotNumberAlpha` / `LotSpaceNumber` leave the parsing
> script, and only as aggregates. Same rule as `wmp-cemetery-map/` (`DESIGN.md` §6).

**Measured vocabulary — 57 sections, all `LocationCode = WMP`:**

- **17 numeric sections** (`06`–`23`): gardens. Row letters **A–D**, spaces **1–4** or **1–5**,
  a few to 24.
- **40 lettered sections**: mausolea, niche walls, urn gardens, memorial boulders and veterans
  sections. **The director's groupings in the first draft of this line were wrong in three
  places** and were corrected by Track A against the map data: `MVC` is Mountain View
  Columbarium (a niche wall, not a chapel or crypt), `GOM` is Garden of Meditation Niches
  (not a mausoleum), and `ROAC`/`ROA` were swapped. The authoritative classification now
  lives in `BW_SECTION_TYPES` in `index.html`, where every entry carries a `src` naming the
  evidence behind it. **Read that, not this paragraph.**

**Authoritative type vocabulary comes from the map repo, not from invention**
(`wmp-cemetery-map/docs/INDOOR_AND_NICHE_BUILDINGS.md`): a **crypt** is one casket chamber; a
**niche** is one urn compartment. **Never say "bay"** — Martice corrected that twice. **`ROAC` (Rock
of Ages Columbarium) and `ROA` (the courtyard niches) are separate** — and note the direction:
an earlier draft of this file had them the wrong way round. `COM`
contains both products — 301 niches and 574 crypts, separated by `angle`, so a section code alone
does not always determine the product.

### Demo positions must not collide with real graves

Martice asked for locations taken from that file. **Taking them literally would publish, in a
public repo, a record asserting that an invented person owns a grave a real person is buried in.**

So: use the real section codes, the real row letters and the real space-number ranges, and
**generate positions that provably do not collide with any occupied `(section, alpha, space)`
tuple in the file.** The file supplies every occupied tuple, so zero collisions is checkable —
**and must be asserted in a test**, not assumed. Same realism, no false claim about a real grave.
Director's call, 2026-07-27; flagged to Martice in the same message.

---

## Tracks — three, sequential, in Martice's stated order

| # | Track | Branch | Depends on |
|---|---|---|---|
| A | Property as a first-class record + section-type identifier + demo property data | `s05/contact-property` | — |
| B | The contact detail page — full-width, three-column | `s05/contact-detail` | A merged |
| C | The Contacts home screen | `s05/contact-home` | A + B merged |

Sequential because all three land in `index.html`. Per `SPRINT_GUIDELINES.md` the cap is on
parallelism, not count.

### Track A — property

- **`BW_SECTION_TYPES`**: all 57 real section codes → `{ kind, label }` where `kind` is
  `grave | crypt | niche | urn-garden | scattering | veteran`. Data, not an enum, exactly like
  `BW_ROLES`. An unknown code renders as the raw code, never blank. **`COM` cannot be classified
  by section alone** — record that honestly rather than guessing a single kind for it.
- **`contactProperty/<id>`**, its own per-record node beside `contactNotes` / `contactTasks`:
  `{ id, partyId, sectionCode, lot, lotAlpha, space, sid, kind, spacesOwned, intermentsUsed,
  deedNumber, purchasedOn, status, _prov }`.
- **Display**: `Garden 18 · Row B · Space 3` with a type pill, and the qualifying line
  **`Owns 4 · 2 interred · 2 available`**. A **View on map** link via `bwMapUrl('space', sid)`
  when a sid is known — `BW_MAP_BASE` is still localhost, so the link must degrade, not break.
- **CSV import gains property columns** so a real owner book can be bulk-loaded later, and
  `data/demo-contacts.csv` gains property for roughly two-thirds of its rows — enough that the
  existing-owner case is visible and the prospect case still exists.
- **The generator lives in `scripts/`**, not `scratch/`, so the demo file can be regenerated from
  a fresh clone (the rule `DESIGN.md` §5 sets for the baseline harness).
- **A "prospect" is now a real state, not a default.** A contact with no property and no holdings
  says so; a contact with property never does.

### Track B — the detail page

Three-column, which is where HubSpot's 2026 redesign, Salesforce Lightning, Attio and Zoho have
all independently converged:

- **Header strip** — name, status, next action, and one-click actions (log note, add to-do, edit).
- **Property band directly under the header** — full width. It is the first question a counselor
  asks and it gets the most valuable real estate.
- **Left rail** — identity, contact methods, classification, salutation. Inline edit.
- **Centre** — tabs, with an **activity timeline** as the default: notes, to-dos, imports and
  changes merged into one chronological stream. This is the pattern every major CRM settled on.
- **Right rail** — holdings (quotes and contracts), related people, attachments-later placeholder.

Must work at 1100px. Must not reintroduce the focus bug: persistent controls stay outside any
container rebuilt with `innerHTML`.

### Track C — the home screen

Progressive disclosure, the strongest 2026 dashboard pattern: answer *"is everything okay?"*
first, then let him drill in.

- **A needs-attention strip** — Overdue · Due today · Unworked · No next action, as live counts
  that are also links.
- **The five built-in views as cards**, with counts.
- **Saved views**, pinned first.
- **Recently viewed contacts.**
- **Quick actions** — Add contact, Import, Export, Settings.
- **Placeholders for what is not built yet** — Martice asked for these explicitly (*"even if some
  of those options aren't available yet"*). They must read as *coming*, not as broken: visibly
  inert, labelled, and never a dead link. Candidates: Calendar, Letters, Email, Reports.

---

## Verification

Standing gates, every track, quoted verbatim:

- `npm run check` → `index.html: 8 blocks, 0 errors`
- `npm test` → at or above `1038 passed across 23 suites` (1036 without `wmp-cemetery-map/`);
  counts rise, never fall
- Generator baseline **14/14 identical** — this sprint must not move a number on any document

Per track:

- **A** — every one of the 57 section codes classifies or is explicitly recorded as unclassifiable;
  an unknown code renders raw, not blank; **zero demo positions collide with a real occupied
  tuple**, asserted against the source file; a property record survives a `saveParty()`; the
  demo file regenerates byte-identically from `scripts/`.
- **B** — renders at 1100px and 1500px with no horizontal page scroll; the search input keeps
  focus across a re-render; property band present whenever a contact has property.
- **C** — every count on the home screen equals the row count of the view it links to. A card
  that says 6 must open a list of 6. Placeholders are inert and none is a dead link.

**No test may read a value from the same constant the code reads.** Assert against rendered DOM.

## Then, and only then — the sprint-04 leftovers

- **Comparison print**: significantly enlarged options (his choice over trimming ACH rows), and
  the ability to name each one — "Option: Casket" vs "Option: Urn" rather than A vs B.
- **The tool's own print header**, matching the convention Track D landed for the guides.
- **S3 debt**: the saved-quote search focus bug; delete `BW_Quote_Tool_merged_11.html`
  (6,286,954 bytes, verified dead); the duplicate root-level marker image.

## Out of scope

- The contact layer's storage model, the quoting path, contract generators, `prices.json`.
- Reading the map at runtime. It is localhost-only with no remote; a deployed tool cannot fetch
  it. Property is entered or imported, and the map is a *link out*.
- Anything touching MIS directly. Unreachable from here.
