# TRACK I — August incentives replace July (`s09/august-incentives`)

You are a track subagent. Read `ops/SPRINT_GUIDELINES.md` and `ops/DESIGN.md` and obey
them. All work is in `index.html` (Browser-pane hazard: at most one Edit call, then Node
scripts). Do NOT touch maps, guides, contract templates, or the RIC/GA/CP generators —
the promo flows into generated documents only through the existing discount-line
plumbing, which you must not restructure.

## Operator instruction (2026-07-31, verbatim)

> Here are the August Incentives for New Pre-Need Property Sales:
> * 10% Off Burial Property
> * 20% Off Select Mausoleum Rows: E, F & G
> * 20% Off Cremation Property (2nd rights not included)
> * 0% Financing for 60 Months with 10% Down (ACH Required)
> * $1,000 Off Burial Opening & Closing
> * $500 Off Cremation Opening & Closing
> ** Incentives are only applicable to purchases of new Pre-Need property.
> ** ECF must always be paid in full - do not include it in the property discount.
>
> remove july incentives and update with these. the opening and closing fees stack on
> the urn placement or burial placement just like previous months

## Where July lives today (director recon — verify, don't trust)

- Dropdown options `promo_burial` / `promo_crem` / `promo_property` at
  `index.html:1070-1072` and in the dynamically built optgroup at `:7962`.
- Banner `#aprilPromoNote` (sic — the id is historic) in `#cemDiscountPanel` at `:2162`.
- Financing note "July Special: 0% for 60 months…" in `#cemFinancingPanel` (~`:2183`).
- Discount math at `:7750-7830`: `propPct = 0.10` on property **and** additional
  rights; burial −$1,000 × spaces capped at actual O&C; cremation −$500 × spaces
  capped; structured promo fields feed the RIC label builder at `:17196` — keep that
  contract intact.

## August semantics (implement exactly)

1. **Burial property: 10%** off ground-burial + mausoleum-crypt property. The August
   sheet does NOT mention additional rights for burial — **rights are no longer
   discounted** (July's rights-fold-in comes out). Log this as a decision; if the tool
   has burial 2nd-right lines they are excluded.
2. **Mausoleum rows E, F, G: 20%** instead of 10%. The quote builder does not know a
   crypt's row — add a small checkbox/select revealed when the burial promo is active
   and a mausoleum line has value: "Crypt in Row E, F or G — 20% August rate". Applies
   20% to the MAUSOLEUM property portion only (ground stays 10%).
3. **Cremation property: 20%**, and **2nd rights explicitly excluded** (label says so).
4. **O&C stacking unchanged from July** (operator: "just like previous months"):
   burial promo −$1,000 × qualifying spaces capped at actual Interment/Entombment O&C;
   cremation promo −$500 × qualifying spaces capped at actual Inurnment O&C.
5. **ECF never discounted** (already excluded from `totalSP` — keep it that way and
   keep the banner sentence).
6. **Financing note**: same 0%/60mo/10% down/ACH terms, relabeled August, "valid
   through August 31, 2026".
7. Banner: rewrite for August (all six bullets + the two rules), "Valid through
   August 31, 2026". Keep "cannot be combined" sentence. Rename visible "July"
   strings to August everywhere a user sees them; internal ids/mode names may stay
   (`promo_burial` etc.) — they're persisted in saved quotes; document that choice.
   Check what a SAVED July-promo quote loads as after the change: it must still open
   without error and show a sensible label (it re-computes at August rates — note this
   in the report; the operator accepts recompute-on-load as previous months did the
   same).
8. **Family 45-Day Certificate (`promo_family45`) is untouched.**

## Verification

- `npm run check` → `8 blocks, 0 errors`.
- Extend/adjust the discount tests: find the suites covering promo math (grep
  `promo_` under `tests/`), update expectations deliberately (July 10% → August rates),
  and ADD cases: maus row-EFG 20% vs ground 10% in one quote; cremation 20% with a 2nd
  right present (right excluded, label says so); O&C caps at actual; ECF unchanged by
  promo. Full `npm test` — name the expected new count; nothing falls silently.
- **Generator baseline 14/14 IDENTICAL required** — the baseline fixtures apply no
  promo, so no scenario may move. If one moves, STOP and report.
- Playwright screenshots into `scratch/s09i-renders/`: the August banner, a burial
  quote with row-EFG checkbox on, a cremation quote showing 20% + $500 O&C line — and
  LOOK at them.

## Report

Standard format + before/after table of every user-visible July→August string, the
saved-July-quote load behavior, and the rights-handling decision stated plainly.
