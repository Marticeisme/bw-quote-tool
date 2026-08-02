// THE TYPICAL BAND — the middle 50% of a price population.
//
// Operator ruling, 2026-08-02, on the all-glass-front span of $2,195-$82,500:
// "a very wide price range — also give a median price range on the glass front niches."
//
// A range that runs 38x from end to end is technically true and useless to a family: it
// answers "what could this cost" with "anything". So every wide span now LEADS with a
// typical band and keeps the full range as a secondary line. The band is the 25th to 75th
// percentile of the prices of the niches that are actually FOR SALE — half of what is
// available falls inside it.
//
// METHOD: nearest-rank, deliberately.
//
//   p(q) = the q-th percentile = sorted[ceil(q * N) - 1]
//
// Both endpoints are therefore prices that a real, currently-available niche actually
// carries. Linear interpolation would be equally defensible statistically and would print
// figures like $3,986 and $7,145 for the Serenity and Radiance+Serenity populations —
// numbers no niche in the park is priced at, on a page a family buys from. Given the
// choice between a smoother estimator and a printed figure someone can be shown, this
// project takes the figure someone can be shown.
//
// The word "percentile" never reaches a page. On-page wording is "Most niches here" over
// the band and "Full range" over the span.
//
// Used by scripts/verify_photo_first.mjs and scripts/verify_glass_niche_ranges.mjs so the
// two cannot compute the same band two different ways.

/** The middle-50% band of a price population, as [lo, hi]. */
export function typicalBand(prices) {
  if (!prices.length) throw new Error('typicalBand: empty population');
  const a = [...prices].sort((x, y) => x - y);
  const at = (q) => a[Math.ceil(q * a.length) - 1];
  return [at(0.25), at(0.75)];
}

const money = (n) => '$' + n.toLocaleString('en-US');

/** The band formatted exactly as a page prints it. */
export function typicalStr(prices) {
  const [lo, hi] = typicalBand(prices);
  return `${money(lo)}&ndash;${money(hi)}`;
}
