# Changing a cemetery fee

Eleven cemetery service fees have exactly one source: **`data/prices.json`**. This page is how
you change one, what is *not* covered, and the one thing that still has to be fixed before the
path works end to end for opening & closing.

## The eleven

| Key in `prices.json` | Today | Where it shows up in the tool |
|---|---|---|
| `OC:lawn_single` | 1,535 | O&C checkbox, Standard Burial bundle, comparison panel |
| `OC:lawn_double_1st` | 2,085 | O&C checkbox |
| `OC:lawn_double_2nd` | 1,535 | O&C checkbox |
| `OC:mausoleum_entombment` | 1,205 | O&C checkbox, both mausoleum bundles, comparison panel |
| `OC:ground_inurnment` | 985 | O&C checkbox, Standard Urn bundle, comparison panel |
| `OC:boulder_inurnment` | 1,425 | O&C checkbox |
| `OC:niche_inurnment` | 875 | O&C checkbox, both niche bundles, comparison panel |
| `OC:niche_non_inurnment` | 375 | O&C checkbox |
| `RECORDING:all` | 235 | recording checkboxes, every bundle, scattering package, comparison panel |
| `INSCRIPTION:all` | 660 | granite-niche and outdoor-mausoleum bundles, comparison panel |
| `MONOBAR:crypt` | 1,445 | indoor-mausoleum bundle, comparison panel |

Everything else the tool prices — caskets, urns, vaults, markers, funeral-home packages, the
inscription and vase menus, garden space prices — is still typed into `index.html` and is out
of scope here. `prices.json` has no schema for them and no source behind them.

## The update path

**Step 1 — change the price at the source and rebuild.**

```
cd wmp-cemetery-map
python scripts/build-prices.py
```

`build-prices.py` writes **both** `wmp-cemetery-map/data/prices.json` and
`bw-quote-tool/data/prices.json` in one run, which is what makes "single source" true rather
than aspirational: two files that are never written separately cannot drift.

Prices are **appended, never edited** — an increase is a new record with a later `effective`,
and the newest wins. `current` is resolved at build time so neither app implements the rule.
**Never hand-edit either copy of `prices.json`.**

**Step 2 — sync the tool.**

```
cd bw-quote-tool
npm run sync-prices
```

It rewrites the `BW_FEES` block in `index.html` and the eight O&C label amounts, prints every
amount that moved, and names any `prices.json` key the tool does not read.
`npm run sync-prices -- --check` reports without writing.

**Step 3 — verify, then deploy.**

```
npm run check     # index.html: 8 blocks, 0 errors
npm test          # the price suites are part of this
```

`npm test` includes three suites that exist for exactly this change:

- `test-prices-source.mjs` — every price the page quotes equals `prices.json`, read off the
  rendered quote lines rather than off a constant.
- `test-price-index-golden.mjs` — the 838 items the Price List and top-bar search can find.
  **A price change moves this fixture.** Regenerate it deliberately, and say why in the commit:
  `node scripts/price-index-snapshot.mjs --golden`
- `test-price-update-path.mjs` — runs this whole path against scratch copies.

The generator baseline (`scripts/baseline-capture.mjs` + `baseline-sign.mjs`) will also go red,
because contracts print dollar amounts. **On a real price change that is correct** — read the
diff, confirm only the intended amounts moved, then re-record the reference. On a refactor it
is a bug.

## MIS is the source of truth

Never load a price out of a printed or PDF sheet (Martice, 2026-07-26). A Serenity wall sheet
priced 5 of 48 niches and called three MIS-live spaces `reserved`. Claude cannot reach MIS —
every route failed on 2026-07-18 — so step 1 is always operator-driven.

## The loop, and the fix that closes it

`build-prices.py` produces the **O&C half of `prices.json` by scraping `index.html`**:

```python
rx = re.compile(r'<label for="qOC(?P<id>\w+)">(?P<label>[^<]*?)\s*[-—]+\s*\$(?P<amt>[\d,]+)</label>')
```

That is why those eight labels are literal text while every other displayed fee in the tool is
a `<span data-fee>` filled at boot. Making them spans returns **zero** matches — measured — and
the next rebuild would drop all eight O&C fees out of the file both apps read, with no error,
because the function returns an empty list rather than failing.

`sync-prices` therefore regenerates those eight amounts as text, and
`test-prices-source.mjs` section 8 runs the same regex over `index.html` so a tidy-up cannot
re-break it.

**The consequence, stated plainly: an O&C price cannot yet be changed from the file end.**
Step 1 would rebuild `prices.json` by reading the old amount straight back out of `index.html`.
The other three (`RECORDING`, `INSCRIPTION`, `MONOBAR`) come from workbooks and
`MAPS/MVC_NewGlassFront_NicheMap_1.html` and are unaffected.

**The fix** is about twenty lines, map-side, in `build-prices.py`: replace `quote_tool_oc()`'s
scrape with an explicit table of the eight amounts, keeping the same `label`, `product`,
`effective: null` and `source` strings so the emitted file stays byte-identical. `prices.json`
then becomes genuinely upstream and the eight labels can become `data-fee` spans like the
rest. It was deliberately not done in this sprint: different repo, and verifying it properly
means running the full price build, which writes both copies of `prices.json` and reads
workbooks from `E:/Documents/CEMETERY MAPS`.

## Known gaps — open questions for MIS, not oversights

| Key | Situation |
|---|---|
| `MONOBAR_INSTALL:crypt` | `prices.json` says **215**; the tool quotes **225**. A real disagreement, sourced from the Eternal Light workbook on one side and the tool on the other. Neither was moved. The tool keeps 225 and a test pins that, so when MIS settles it the suite says so. |
| `VASE:crypt` (415), `VASE:niche` (260) | The file carries one vase per structure. The tool sells three distinct vase SKUs — Niche Vase w/ Ring $375, Niche Vase (ROAC) $275, Crypt Vase $195. Not confidently the same item, so not wired up. |
| `ROAC:*` — 70 niche prices | The tool has **no per-niche price at all**: the counselor types the niche price into the Price/Niche box. There is nothing to reconcile yet; wiring these up would be a new feature (pick a wall and level, get a price), not a de-duplication. |
| `ECF` 10%, `TAX` 10.4% | The file says ECF is 10% of "all property". The tool uses 10% for niches and crypts and **15% for garden spaces**, baked into each garden `<option>`, and its own reference card says 15%. The file cannot express that, so the rates are not sourced. |

## How the tool holds it

- `BW_FEES` in `index.html` is a **generated mirror** of `current.fees`, written by
  `scripts/sync-prices.mjs`. Never edit it by hand.
- It is inline rather than fetched because pricing has to be synchronous — `cemUpdate()` runs
  on every keystroke, and "not here yet" would be a `$0` line on a quote in front of a family.
- `bwFee(key)` is the only way a fee reaches a quote line. A missing key throws rather than
  returning 0: silently under-quoting is the one outcome worse than a visible error.
- `bwVerifyPriceFile()` re-checks the page against the **deployed** `data/prices.json` after
  load and shows a banner on a mismatch — that is what catches a deploy that shipped one file
  without the other. A fetch failure is a console error only, because nothing the counselor is
  about to do depends on that file arriving.
- Displayed amounts are `<span data-fee="KEY">`, filled synchronously at the end of the app
  script block. The Price List and top-bar search **regex-scrape those labels**
  (`buildPriceIndex`), so an item enters search only if its label reads `Name — $1,234`. Change
  the dash or the spacing and it vanishes with no error. That is why the format is asserted,
  with a negative control.
