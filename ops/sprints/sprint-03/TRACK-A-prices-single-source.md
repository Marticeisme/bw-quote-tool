# Track A — `prices.json` as the single source for the overlapping prices

Branch `s03/prices-single-source`, **from `fix/discontinued-vault-products` (`c7d521a`), not from
`main`.** That branch removes five discontinued vault products, and those removals are
themselves price-bearing `<option>` elements — branching from `main` would mean refactoring
options that are being deleted. It is audited and green; treat it as your base.

Read `ops/sprints/sprint-03/SPRINT.md` first — the measured reality, the scope boundary and the
verification design live there. Then `ops/DESIGN.md` §4 (conventions), §5 (verification), §7
(the map/tool contract, especially the `prices.json` row).

## What you are changing, and what you are not

**In scope: only the prices that exist in BOTH the tool and `prices.json`** — the ones that can
therefore disagree. That is ~88 values:

- `OC:*` — opening/closing/interment/inurnment/entombment fees
- `INSCRIPTION`, `MONOBAR`, `MONOBAR_INSTALL`, `RECORDING`, `VASE`
- the ROAC niche inventory, keyed `ROAC:<wall>:<level>`

**Out of scope: the other ~750 priced items** — caskets, urns, vaults, markers, funeral-home
packages. They have no external source and no schema in `prices.json` to hold them. Do not
invent one. Do not "while I'm here" them.

**Also out of scope:** restoring the "Search prices" quick lookup, the map's own price
rendering, and anything touching MIS (it is unreachable — every route failed 2026-07-18).

## What already exists — verified, do not re-derive

- **`data/prices.json` is in THIS repo now** (Martice's Gate 0 answer). 26 KB, schema 2. It is
  served from GitHub Pages alongside the tool, so a relative fetch works in production. The tool
  currently has **zero references to it** — that is your job.
- **It is generated, never hand-written.** `wmp-cemetery-map/scripts/build-prices.py` writes
  **both** this copy and the map's in one run, so they cannot drift. **The tool must never write
  `prices.json`**, and you must never hand-edit either copy. To change a price you append a
  record to the source and rebuild.
- **Read `current`.** A price is always today's price — do not resolve a fee as-of a date.
  `fees`/`inventory` hold dated history as provenance only. The file's own `resolve` field says
  this; obey it.
- **`buildPriceIndex()` (`index.html:6386`) scrapes rendered DOM text** with:
  `/^(.*?)\s*[—–-]\s*\$\s*([\d,]+(?:\.\d{1,2})?)…/i`
  An item only enters `PRICE_INDEX` if its label reads `Name — $1,234`. Wrong dash, wrong
  spacing → it silently vanishes from search and the price list. **No error, no log.**
- **Anchors in your base** (line numbers from `c7d521a`): the two Standard Arrangement bundles at
  **6986** and **6996** — `(2305 + 685 + 235 + 1535)` = 4760 and `(935 + 575 + 235 + 985)` =
  2730. `Recording Fee` appears on 34 lines, the setting fees on 11, `Vase Block Install` at
  7171/7966/17124, and OC-family labels on 67. Read before you edit; several are display copy,
  several are line-item builders, and they are not interchangeable.

## The failure mode this sprint exists to avoid

**A price that silently changes.** A refactor that moves one number reaches a family on a signed
contract. Everything below is arranged around making that impossible rather than unlikely.

Related, and just as bad: **a price that silently disappears** — from the price list, from
search, or from a bundle. The scrape regex makes this easy to do by accident.

## Build

1. **Fetch `data/prices.json` once and cache it for the session.** Follow the shape of
   `bwTemplate()` (the contract-template loader) for the failure path: one retry, then a
   **visible, specific error** naming the file. A missing price file must never silently yield
   `$0` or a blank line — that is worse than not loading.
2. **Resolve the overlapping prices from it** instead of from literals. Keep the existing
   labels and formatting exactly as they are: `PRICE_INDEX` depends on the rendered text, and
   changing a dash breaks search silently.
3. **Leave every other price alone.**
4. **Deliver the update path.** The roadmap's actual ask: Martice changes a price in the source,
   runs one command, and both apps show the new number. Document it in the repo, and **prove it
   works by doing it** (see gate 4). If the command needs to live somewhere, `scripts/` is fine.

## Gates — quote actual output

1. `npm run check` → `index.html: 8 blocks, 0 errors`
2. `npm test` → at least `504 passed, 0 failed across 15 suites` (your base's count). May rise,
   **never** fall. Note `npm test` now **refuses to run against a server serving another
   worktree** — if it aborts naming two hashes, that is the guard working; start your own server
   or free the port.
3. **All 14 generator signatures byte-identical.** Harness `scripts/baseline-capture.mjs` +
   `scripts/baseline-sign.mjs`, reference `%TEMP%\bw-baseline\before`, frozen clock,
   `BASELINE_USER` defaults to `martice`. Contracts print dollar amounts, so **this is what
   catches a moved price** — it needs no new work from you. `BASELINE_BASE` lets you point at a
   server on another port. **If a signature changes, stop and report. Do not re-record the
   reference.**
4. **Golden `PRICE_INDEX` diff.** Capture all `{name, price}` pairs on your base, then again
   after, and assert the sets are identical. This catches a price vanishing from *search*, which
   the baseline cannot see because search is not on a contract.
5. **Drift assertion.** For every key present in both the tool and `prices.json`, assert the
   amounts agree. This is the test that makes the sprint permanent — it fails the day someone
   edits one copy again.
6. **Update-path test.** Change a price in the source, run the update command, assert the new
   number appears in the tool, then revert. Proves gate 4 of the sprint rather than describing
   it.
7. **Scrape-format test.** A label that breaks the `Name — $1,234` pattern must **fail a test**
   instead of silently dropping out of `PRICE_INDEX`.

**Do not write a test that reads the price from the same constant the code reads.** It will pass
forever and prove nothing. Assert against the generated artifact, the rendered DOM, or the JSON.

## Constraints

- **Never write to production Firebase.** Reads only. Tests use `tests/fake-firebase.js` and
  block `gstatic.com/firebasejs`. A write from a test script has destroyed real data twice.
- **The Browser pane opens `index.html` after every `Edit`** — a harness-level `PostToolUse:Edit`
  hook that cannot be disabled — booting the app against production Firebase. **At most ONE
  `Edit` call against `index.html`;** do the rest through short Node scripts. Report how many.
- **Never `git add -A` / `git add .`** — explicit paths only.
- **Do not push anything, anywhere.** Commit locally; every push is Martice's gate.
- Never commit `wmp-cemetery-map/`; no real customer data in any committed file.
- Your worktree has no `node_modules`. Junction it:
  `New-Item -ItemType Junction -Path "<worktree>\node_modules" -Target "C:\Users\Martice\bw-quote-tool\node_modules"`.
  **Do not delete the worktree or the junction** — a recursive delete can follow it into the real
  one. The director cleans up.
- **Always `git -C <absolute-worktree-path>`** rather than `cd` plus bare git. A stale cwd put a
  commit on the wrong branch here on 2026-07-26.
- Commit incrementally, one logical change per commit, tagged `[s03/prices]`, ending
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## Report

What shipped; branch and commits; all seven gates with actual output; the update path and
evidence you ran it; how many direct `Edit` calls you made to `index.html`; decisions and open
questions; and anything you could not verify — stated plainly rather than implied.

If the scope turns out to be wrong — if an "overlapping" price is not really the same thing in
both places, or if `prices.json` is missing something the tool needs — **say so and stop rather
than inventing a value.** MIS is the source of truth and neither you nor the director can reach
it.
