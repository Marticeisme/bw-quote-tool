# Sprint 03 — `prices.json` as the source of truth

**Runs ROADMAP milestone S2.** Sprint numbers and milestone IDs differ; sprint-02 ran S7 ahead
of this at Martice's direction.

**Goal:** a price lives in exactly one place, and the annual update is something Martice runs
himself instead of hand-editing hundreds of HTML lines. The deliverable is **a price file plus
an update path**, not a refactor.

## Measured reality — checked 2026-07-26, not inherited from the roadmap

Everything below was verified against the code and data. Two of these numbers change the shape
of the sprint, so read them before planning.

| Claim | Measured |
|---|---|
| Hardcoded `$` literals in `index.html` | **1,180** (ROADMAP said 1,157 — it has grown) |
| `PRICE_INDEX` items | 841, built by `buildPriceIndex()` (`index.html:6386`) |
| How `PRICE_INDEX` is built | **regex-scraped from rendered DOM text** |
| `prices.json` entries | **18 fees + 70 inventory = ~88** |
| Does the tool read `prices.json` today? | **No. Zero references.** |

**The two findings that reshape this sprint:**

**1. `prices.json` is nowhere near a whole price book.** Its 70 inventory keys are all
`ROAC:<wall>:<level>` — niche pricing for one columbarium. Its 18 fee keys are cemetery service
fees: `OC:*` (opening/closing), `INSCRIPTION`, `MONOBAR`, `RECORDING`, `VASE`. The tool prices
**841** things, the rest being caskets, urns, vaults, markers and funeral-home packages that
have no external source at all and no schema in `prices.json` to hold them.

So "make the tool consume `prices.json`" is not one job. It is a small, valuable one sitting
inside a much larger one, and **this sprint does only the small one.**

**2. The scrape format is load-bearing and undocumented.** `buildPriceIndex()` matches:

```
/^(.*?)\s*[—–-]\s*\$\s*([\d,]+(?:\.\d{1,2})?)(?:\s+(?:each|ea\.?|per\s+[\w-]+|\/\s*mo|\+))?\s*$/i
```

A price only enters the index if its label reads `Name — $1,234` with an em dash, en dash or
hyphen. **Get the dash or the spacing wrong and the item silently vanishes from search and from
the price list** — no error, no log. That is the actual danger in editing prices by hand today,
and it is worth fixing whether or not the rest of this sprint happens.

## Gate 0 — ANSWERED and DONE 2026-07-26

**Martice chose option 1: the canonical `prices.json` lives in this repo**, at `data/prices.json`,
served from Pages alongside the tool. In place and committed. PII re-checked on the copy that
goes public — the only name-shaped string in 26 KB is the fee label "Endowment Care Fund".

**One adjustment reality forced, and it is worth knowing.** The map *reads* `data/prices.json` at
runtime (`loadPrices`, map `index.html:3984`) and falls back to a hardcoded table when it is
missing — the very table this file exists to replace. So the map's copy could not simply be
deleted. `scripts/build-prices.py` now writes **both copies in one run** (map commit `c7d31af`).
That is what makes "single source of truth" true rather than aspirational: two files that are
never written separately cannot drift. **Neither copy may be hand-edited** — change the source
and rebuild.

Verified: a real rebuild produces byte-identical files in both locations, and the only difference
against the previously committed version is the `generated` date — **no price moved.** Map suite
green at 19 + 7 + 8 + 11 + 24 plus validate.

**What remains for the track:** make the tool actually read `data/prices.json` instead of its own
literals, for the overlapping ~88 prices. The file being present changes nothing on its own — the
tool still has zero references to it.

### The decision as it was originally posed

**`prices.json` lives in `wmp-cemetery-map/data/`, which is gitignored from this repo and whose
own repo has no remote. The deployed tool therefore cannot fetch it — there is no URL.**

The file itself is safe to publish: 26 KB of structure codes, fee labels ("Boulder Inurnment",
"Mausoleum Entombment") and amounts. **No names, no PII** — verified. And the tool already
publishes prices publicly in its guides and catalogs.

But a machine-readable complete fee schedule on a public site is a different thing from a
brochure, and that is Martice's call, not a director's. **Options:**

1. **Move/copy `prices.json` into this repo** and serve it from Pages alongside the tool. Both
   apps read one file over HTTP. Simplest, and consistent with how templates now load.
2. **Keep it map-side and generate a copy into this repo at build time** — one source, two
   artifacts, and the map keeps its own. Avoids the map repo becoming a dependency of a public
   deploy.
3. **Neither** — the tool keeps its own price file and `prices.json` stays the map's. Accepts
   two files, but with a shared schema and a single update path.

**Do not spawn a track until this is answered.** Everything else depends on where the file lives.

## Scope — the overlap only

**In:** the ~88 prices that exist in **both** places and can therefore disagree — the `OC:*`,
`INSCRIPTION`, `MONOBAR`, `RECORDING`, `VASE` fees and the ROAC niche inventory. The tool
mentions these concepts 129 times; the map has `COLUMBARIUM_FEES`. That is the drift the roadmap
flagged, and it is small enough to do correctly.

**Out:** the remaining ~750 priced items. They need a schema `prices.json` does not have and a
source that is not MIS. A later sprint.

## Operator resolutions, 2026-07-26 — the tool is right, the FILE is wrong

Track A escalated four disagreements rather than guessing. Martice settled two, and both land
in `prices.json`, not in the code. **Neither is fixed yet** — `prices.json` is generated, so the
correction belongs in `wmp-cemetery-map/scripts/build-prices.py` followed by a rebuild, never a
hand-edit.

**1. `MONOBAR_INSTALL:crypt` is 225.** The file says 215; the tool quotes 225. The tool is
correct. The amount comes from `workbook_fees()`, so the fix is a dated correction record that
wins under the file's own "append and rebuild, newest wins" rule. Track A pinned the
disagreement in a test, so that test flips to asserting agreement once this lands.

**2. ECF — the file's SHAPE is wrong, not just its number.** `build-prices.py` hardcodes
`{rate: 0.10, appliesTo: "all property"}`. Reality, confirmed against the tool:

- **Niches and crypts: exactly 10%.**
- **Garden spaces: a stored per-garden AMOUNT, not a rate.** The option values carry it
  literally — `6_good|14995|2250`, `10_good|8995|1350`, `23_uprights|11995|1800`. Those land at
  0.1500–0.1501, so **"15%" is a rounded label on real amounts, not the calculation.**

**Do not "fix" this by setting `rate: 0.15`.** 15% of 8,995 is 1,349.25; the real figure is
1,350. A rate cannot express this and should not pretend to. The tool's calculation is
authoritative (Martice, 2026-07-26).

Still open, both needing MIS: **`VASE`** (one vase per structure in the file, three distinct
SKUs in the tool at $375/$275/$195 — not the same item) and the **O&C write-back loop**, where
`build-prices.py` scrapes the eight O&C amounts out of `index.html`, so a price cannot yet be
changed from the file end.

## Sources for the ~750 out-of-scope prices — they DO exist

This document originally scoped them out as having "no external source at all". That was wrong
(see `ops/MISTAKES.md` #9). Martice supplied two current price books, both effective 2026-03-01:

- `E:\Downloads\2026 PCM Markers Price Book EFF 03.01.2026.xlsx` — most marker pricing, 2.7 MB
- `E:\Downloads\CEMETERY MERCH & SERVICES PRICE LIST EFF-03.01.2026.xlsx` — most merch and service
  pricing, 67 KB

They are the input for a later sprint, not this one. Note `build-prices.py` already reads
workbooks from `E:/Documents/CEMETERY MAPS`, so a workbook-ingest path exists to extend rather
than invent.

## The rule that governs this sprint

**MIS is the pricing source of truth** (Martice, 2026-07-26). Never load prices out of a printed
or PDF sheet — a Serenity wall sheet priced 5 of 48 niches and priced three MIS calls `reserved`.
`prices.json`'s own `resolve` rule already says: **read `current`; a price is always today's
price**; `fees`/`inventory` keep dated history as provenance only. To change a price you append
a record and rebuild — the newest wins.

**Claude cannot reach MIS.** Every route failed on 2026-07-18. So the update path must be
something Martice drives, and the sprint must not pretend otherwise.

## Definition of done

1. Every overlapping price resolves from **one** place. No fee or niche price is defined twice.
2. **Zero prices change.** This is a plumbing change; a refactor that silently moves a number is
   the failure mode that reaches a family.
3. A **documented, runnable update path**: Martice changes a price in one file, runs one command,
   and both apps show the new number. Tested by actually doing it.
4. A label whose format breaks the scrape **fails a test** instead of silently vanishing.
5. `npm run check` → `index.html: 8 blocks, 0 errors`. `npm test` → at least `467 passed across
   14 suites`; counts may rise, never fall.
6. All **14 generator signatures unchanged** — see below.

## Verification — the strong gate already exists

**The generator baseline protects prices for free.** Contracts and quote PDFs print dollar
amounts, so those amounts are inside the 14 recorded signatures. If this refactor moves a single
price on any generated document, `scripts/baseline-capture.mjs` + `baseline-sign.mjs` go red
against `%TEMP%\bw-baseline\before`. **That is the primary gate and it needs no new work.**

Add three:

- **Golden `PRICE_INDEX` diff.** Capture all 841 `{name, price}` pairs before, and assert the
  set is identical after. This catches a price vanishing from search — which the baseline cannot
  see, because search is not on a contract.
- **Drift assertion.** For every key present in both the tool and `prices.json`, assert the
  amounts agree. This is the test that makes the whole sprint permanent: it fails the day
  someone edits one copy again.
- **Update-path test.** Change a price in the source file, run the update command, assert the
  new number appears in both apps — then revert. Proves item 3 rather than describing it.

**Do not write a test that reads the price from the same constant the code reads.** It will pass
forever and prove nothing. Assert against the generated artifact or the rendered DOM.

## Tracks

| Track | Branch | Model | Scope |
|---|---|---|---|
| A | `s03/prices-single-source` | Opus | The overlap, the loader, the update path, the four gates. Single track — it all lands in `index.html` plus one data file. |

A second track is not justified: `SPRINT_GUIDELINES.md` allows one only when the work genuinely
lives elsewhere, and this does not.

## Risks

| Risk | Mitigation |
|---|---|
| A price silently changes | The 14 generator signatures + the golden `PRICE_INDEX` diff. Both must be green before merge. |
| A label's dash gets normalised and the item drops out of search | Gate 4 — the scrape-format test. This is the pre-existing bug; do not make it worse. |
| The tool ends up depending on a repo it cannot reach | Gate 0. Answer it first. |
| Someone "tidies" a price back into HTML later | The drift assertion fails on the next run. |
| MIS and the file disagree | MIS wins, always. The file records what MIS said and when. |

## Out of scope

- The ~750 non-overlapping prices (caskets, urns, vaults, FH packages).
- The map's own price rendering — sprint-02 deliberately left prices alone.
- Restoring the "Search prices" quick lookup (a separate pending UI request).
- Anything touching MIS directly. It is unreachable; the update path is operator-driven.
