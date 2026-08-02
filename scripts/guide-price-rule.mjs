// The operator's printed-pricing rule, 2026-08-01, verbatim intent:
//
//   "we can keep price ranges just not very specific pricing so then they could ask me
//    for an actual quote"
//
// So in the PRINTED guide: price RANGES stay, exact per-item prices and itemized fee
// tables go, and a short warm invitation to call takes their place. On SCREEN nothing
// changes at all — the whole mechanism is inside `@media print`, and the screen proof is
// a 0.0000% pixel diff against main.
//
// WHAT COUNTS AS "SPECIFIC PRICING" — the rule, applied mechanically so it is auditable:
//
//   FEE TABLE   any <table> containing a `data-fee` cell. These are the itemised
//               opening-and-closing / recording / inscription / endowment schedules.
//               Suppressed whole; replaced by a fee invitation that names the KINDS of
//               charge without any figure.
//
//   PRICE TABLE any other <table> holding three or more money tokens. These are the
//               per-item price lists (marker sizes, vault models, plan tiers).
//               Suppressed whole; replaced by an invitation carrying the min–max RANGE
//               of the very rows that were suppressed — computed at build time from the
//               page's own bytes, never typed. verify_guide_pages.mjs recomputes it.
//
// Everything else is left alone, deliberately:
//
//   - INLINE fee mentions in running prose ("Endowment care of $825 is added to the space
//     price"). Deleting a figure out of the middle of a sentence leaves broken copy, and
//     inventing replacement prose per guide is not something a generator should do. Six
//     occurrences, all in urn-gardens-guide.html. Listed for the operator to rule on.
//   - PRODUCT CARDS (`.product-price`, `.urn-price`) in cremation-guide.html. That guide
//     embeds a product catalogue, and the operator's ruling exempts catalogues — "they
//     exist to be price lists".
//   - direct-cremation.html entirely. Its title is "Direct Cremation Plan · SAMPLE QUOTE ·
//     FOR REFERENCE" and it is one worked itemised example; suppressing the itemisation
//     would leave a guide about a quote with no quote in it. This is a judgement call and
//     is flagged in the track report rather than made silently.
import { pluckTag } from './_html-pluck.mjs';

export const EXEMPT = new Set([
  'direct-cremation.html',   // the guide IS a sample itemisation — see header
]);

const MONEY = /\$[0-9][0-9,]*(?:\.[0-9]{2})?/g;

export const money = (n) => '$' + n.toLocaleString('en-US');

/** Every <table> in the document, as {start, end, html}. Depth-aware (tables nest). */
export function tables(html) {
  const out = [];
  const re = /<table\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const inner = pluckTag(html, 'table', m.index);
    if (inner === null) continue;
    const end = html.indexOf('</table>', m.index + m[0].length + inner.length) + '</table>'.length;
    out.push({ start: m.index, end, html: html.slice(m.index, end) });
    re.lastIndex = end;
  }
  return out;
}

const RANGE_CELL = /\$[0-9][0-9,]*(?:\.\d{2})?\s*(?:&ndash;|&mdash;|–|—|-)\s*\$[0-9]/;

/**
 * Classify one table.
 *
 * Three kinds, because a blanket "suppress every table with money in it" was wrong in
 * both directions when it was tried and the output was looked at:
 *
 *   fee      an itemised charge schedule (`data-fee` cells). Suppressed whole.
 *   compare  a side-by-side table whose price column is already RANGES — the granite and
 *            glass guides' "at a glance" tables. Suppressing these would delete exactly
 *            the ranges the operator asked to keep. Kept; only the itemised
 *            "Other charges" COLUMN inside them is suppressed.
 *   price    a per-item price list. Suppressed whole, replaced by the min–max of the rows
 *            that were suppressed.
 *
 * Returns null when the rule does not touch the table.
 */
export function classify(t) {
  // A fee table that ALSO carries a verified `data-range` cannot be suppressed whole:
  // urn-gardens-guide.html keeps its bronze-memorial range ($2,015-$5,670) inside a row of
  // the fee schedule, and blanking the table deleted a range the operator explicitly asked
  // to KEEP. Caught by the extended range verifier, not by eye. Such tables lose their fee
  // ROWS instead, so the range row survives.
  if (/data-fee=/.test(t.html)) return { kind: 'fee', rowsOnly: /data-range=/.test(t.html) };

  const ranges = (t.html.match(new RegExp(RANGE_CELL.source, 'g')) || []).length;
  if (ranges >= 2) return { kind: 'compare' };

  const amounts = [...t.html.matchAll(MONEY)].map((m) => +m[0].slice(1).replace(/,/g, ''));
  if (amounts.length < 3) return null;
  const lo = Math.floor(Math.min(...amounts)), hi = Math.ceil(Math.max(...amounts));
  // A range is only worth printing if it describes ONE family of things. A table that
  // mixes a $235 recording fee with a $52,000 crypt produces a technically-correct range
  // that tells a family nothing; print the invitation with no figure instead. The
  // threshold is a judgement call, recorded here rather than buried in the caller.
  const coherent = hi / Math.max(lo, 1) <= 25;
  return { kind: 'price', lo, hi, n: amounts.length, coherent };
}

/**
 * Column index of the itemised-charges column in a `compare` table: the one whose cells
 * carry two or more money/percent figures that are NOT a range. Returns -1 if there is
 * none, in which case the table is left completely alone.
 */
export function chargeColumn(tableHtml) {
  const rows = tableHtml.match(/<tr\b[\s\S]*?<\/tr>/gi) || [];
  const score = [];
  for (const row of rows) {
    const cells = row.match(/<t[dh]\b[^>]*>[\s\S]*?<\/t[dh]>/gi) || [];
    cells.forEach((c, i) => {
      const figs = (c.match(/\$[0-9]|[0-9]+(?:\.[0-9]+)?%/g) || []).length;
      if (figs >= 2 && !RANGE_CELL.test(c)) score[i] = (score[i] || 0) + 1;
    });
  }
  let best = -1, n = 0;
  score.forEach((v, i) => { if (v > n) { n = v; best = i; } });
  return n >= 2 ? best : -1;
}

/** Tag every cell at `col` (header included) so print hides the whole column. */
export function suppressColumn(tableHtml, col) {
  return tableHtml.replace(/<tr\b[\s\S]*?<\/tr>/gi, (row) => {
    let i = -1;
    return row.replace(/<t([dh])\b([^>]*)>/gi, (m, td, attrs) => {
      i++;
      return i === col ? `<t${td}${attrs} data-print-suppress="cell">` : m;
    });
  });
}

/** The invitation that replaces a suppressed table, in print only. */
export function invite(cls, id, c) {
  const withRange = c.kind === 'price' && c.coherent;
  const range = withRange
    ? `<span class="pi-range" data-print-range="${id}">${money(c.lo)}&ndash;${money(c.hi)}</span>`
    : '';
  const label = withRange ? 'Generally' : c.kind === 'price' ? 'Pricing' : 'Additional charges';
  const body = withRange
    ? 'Where a particular one falls in that range depends on the size, the location and the options you choose. I would rather give you a real number than a guess &mdash; call or email me and I will put an exact quote in writing for you, with no obligation.'
    : c.kind === 'price'
    ? 'The prices here vary a good deal by size, location and the options you choose, so a single figure would be misleading. Call or email me and I will put an exact quote in writing for you, with no obligation.'
    : 'Opening and closing, recording, endowment care and any inscription are charged in addition to the price of the space. They are straightforward, and they differ by location and by what you choose &mdash; call or email me and I will put the exact figures in writing for you, with no obligation.';
  // The compact variant is for the case where the rule removed only the fee ROWS of a
  // table that had to survive. There the full paragraph costs more room than the rows it
  // replaced, which on urn-gardens-guide.html turned a deliberately ONE-page infographic
  // into two — caught by the page-budget gate, not by eye.
  if (c.compact) {
    return `<div class="${cls} pi-compact" data-print-invite="${id}">`
      + `<span class="pi-label">${label}</span>`
      + '<p>Opening and closing, recording and endowment care are charged in addition to '
      + 'the space. Call or email me and I will put the exact figures in writing for you.</p>'
      + '</div>';
  }
  return [
    `<div class="${cls}" data-print-invite="${id}">`,
    `<span class="pi-label">${label}</span>`,
    range,
    `<p>${body}</p>`,
    '</div>',
  ].join('');
}

/** Tag every <tr> that carries a fee figure but no verified range. Used for a fee table
 *  that must survive whole because it also holds a range the operator wants printed. */
export function suppressFeeRows(tableHtml) {
  return tableHtml.replace(/<tr\b[\s\S]*?<\/tr>/gi, (row) =>
    (/data-fee=/.test(row) && !/data-range=/.test(row))
      ? row.replace(/<tr\b/i, '<tr data-print-suppress="cell"')
      : row);
}

// ── PER-ITEM PRICE CHIPS ─────────────────────────────────────────────────────────────
// Rendering the guides and LOOKING at them is what found this: suppressing the price
// TABLES left the per-item price chips in product-style cards untouched, so
// vault-guide.html printed seven urn vaults at $1,885 / $1,675 / $935 and then, directly
// underneath, an invitation announcing "Generally $935-$1,885" — the exact figures sitting
// next to the sentence that claims to have replaced them. markers-guide.html did the same
// with its "from $2,429" size-scale labels. Every page-count and table-level check was
// green throughout.
//
// These are the classes that carry an exact per-item figure across the nineteen guides.
// An element is only suppressed if it holds a money token and is not itself a verified
// range.
export const CHIP_CLASSES = [
  'uv-card-price', 'sm-price', 'product-price', 'urn-price', 'opt-price',
  'plan-price', 'direct-price', 'amount',
];

// cremation-guide.html embeds a product CATALOGUE — 56 cards with prices — and the
// operator's ruling exempts catalogues ("they exist to be price lists"). Stripping its
// card prices would leave a browse page with nothing to browse.
export const CHIP_EXEMPT = new Set(['cremation-guide.html']);

/** Tag per-item price chips so print hides them. Skips anything carrying a data-range.
 *  Also returns where the first one was and the min-max of everything it took, so the
 *  caller can put an invitation there when the guide has no other one — scattering-guide
 *  .html has eighteen price chips and not one price TABLE, so chip suppression alone left
 *  its printed version with no pricing information and nothing inviting the family to ask
 *  for any. */
export function suppressChips(html) {
  const sel = CHIP_CLASSES.join('|');
  const re = new RegExp(
    `<([a-z0-9]+)((?:[^>]*?)\\sclass="(?:[^"]*\\s)?(?:${sel})(?:\\s[^"]*)?"[^>]*)>([\\s\\S]{0,300}?)</\\1>`, 'gi');
  let n = 0, at = -1;
  const amounts = [];
  const out = html.replace(re, (m, tag, attrs, inner, offset) => {
    if (/data-range=/.test(attrs) || /data-print-suppress=/.test(attrs)) return m;
    if (!/\$[0-9]/.test(inner)) return m;
    n++;
    if (at < 0) at = offset;
    for (const a of inner.match(MONEY) || []) amounts.push(+a.slice(1).replace(/,/g, ''));
    return `<${tag}${attrs} data-print-suppress="chip">${inner}</${tag}>`;
  });
  const lo = amounts.length ? Math.floor(Math.min(...amounts)) : 0;
  const hi = amounts.length ? Math.ceil(Math.max(...amounts)) : 0;
  return { html: out, n, at, lo, hi, coherent: !!amounts.length && hi / Math.max(lo, 1) <= 25 };
}

/**
 * Merge priced tables that sit next to each other with nothing but whitespace between.
 * markers-guide.html has two, vault-guide.html three; each got its own invitation and the
 * page printed two or three near-identical paragraphs in a row. One table group, one
 * invitation, one range spanning the lot.
 */
export function groupAdjacent(found, html) {
  const groups = [];
  for (const f of found) {
    const prev = groups[groups.length - 1];
    const between = prev ? html.slice(prev.end, f.t.start) : null;
    const adjacent = prev && f.c.kind === 'price' && prev.kind === 'price'
      && /^[\s]*$/.test(between.replace(/<\/?(?:div|section)[^>]*>/gi, ''));
    if (adjacent) {
      prev.tables.push(f.t);
      prev.end = f.t.end;
      prev.lo = Math.min(prev.lo, f.c.lo);
      prev.hi = Math.max(prev.hi, f.c.hi);
      prev.coherent = prev.hi / Math.max(prev.lo, 1) <= 25;
    } else {
      groups.push({ kind: f.c.kind, c: f.c, tables: [f.t], start: f.t.start, end: f.t.end,
                    lo: f.c.lo, hi: f.c.hi, coherent: f.c.coherent, rowsOnly: f.c.rowsOnly });
    }
  }
  return groups;
}
