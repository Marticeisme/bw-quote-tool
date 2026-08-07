// THE FAMILY REGISTER — zero internal record-keeping language on a family-facing surface.
//
// Operator, 2026-08-02, reading the live COM crypt map over a counselor's shoulder:
// "Why does it say operator here?" and, of the walkthrough, "This is not something I can
// show to families." The page was telling a family the name of the internal role that
// made a ruling, the name of the report a status came from, how many ROWS that report
// had, and that what they were reading was a SNAPSHOT. Every one of those is a sentence
// about our record-keeping, not about their crypt.
//
// This file was originally `_no_mis_assert.mjs` and banned exactly one word. That was the
// wrong shape of gate: the MIS sweep removed "MIS" and left "operator", "Lot Inquiry
// List", "crypt-price export", "wall sheet", "rows over" and "SNAPSHOT" standing in the
// same paragraph. A one-word ban teaches the next person that one word is the problem.
// The problem is a REGISTER — the internal voice — so the ban list is a list, it lives in
// ONE file, and every map gate and guide verifier reads it from here. A surface added
// tomorrow inherits the whole list by importing one function.
//
// WHAT A FAMILY-FACING LINE MAY SAY about provenance, in full:
//
//     "Availability and pricing are kept current against cemetery records — ask us to
//      confirm today's status before writing."
//
// plus a prices-effective date. That is the entire permitted vocabulary. Everything else
// — which report, printed when, how many rows, who ruled what on which date — is real
// institutional memory and belongs in a CODE COMMENT, where the next person maintaining
// the generator will actually look for it and no family will ever read it.
//
// WHAT COUNTS AS RENDERED. Everything a browser could put in front of a reader: visible
// text, attribute values (aria-label, title, alt), and JS string literals, because these
// pages build their detail cards by assigning innerHTML from strings. What does NOT count
// is source commentary — the provenance notes in the generators and data modules are how
// the next person knows where a price came from, they never reach the page, and stripping
// the word out of them would cost real institutional memory for no family's benefit.
//
// So the scan removes comments and then looks for the words. That ordering is the whole
// design: it cannot be satisfied by moving the string somewhere less obvious, only by
// actually removing it from the rendered surface.
//
// THE ALLOWLIST IS NOT A LOOPHOLE. It exists because two entries collide with legitimate
// family-facing English, and a gate that cries wolf gets waved off:
//   * "← Quote Tool" is the back button. It is a NAVIGATION LABEL naming where the reader
//     came from, not a citation of where a price came from. Banning it would delete the
//     only way back.
//   * The PCM marker-design catalog sells designs called "gate", "gates of heaven" and
//     "railroad tracks", and its search index carries every such tag as a string literal.
//     Those are product names. They are allowlisted to that ONE file, by span, so a real
//     "sabotage gate" sentence appearing anywhere in it would still be caught.
// Allowlisted spans are blanked BEFORE the scan, so a line may hold both an allowed span
// and a banned word and still fail on the banned word.
//
// Case-insensitive except where noted. `MIS` stays case-sensitive and word-bounded on
// purpose: `MISTAKES #18` (a real comment in three of these generators) and
// `class="cardmis"` are not the operator's MIS and must not be flagged.

/**
 * The ban list. `id` is what the gate prints, `re` must be global.
 * Adding a term here arms it on EVERY surface that calls the assert — that is the point.
 */
export const BANNED = [
  { id: 'MIS', re: /\bMIS\b/g, why: 'the internal system of record, by name' },
  { id: 'operator', re: /\boperator(?:s|['’]s)?\b/gi, why: 'the internal role that made a ruling' },
  { id: 'Lot Inquiry', re: /\blot\s+inquir(?:y|ies)\b/gi, why: 'the name of an internal report' },
  { id: 'export', re: /\bexport(?:s|ed|ing)?\b/gi, why: 'how data got out of a system' },
  { id: 'snapshot', re: /\bsnapshots?\b/gi, why: 'tells a family the page may be stale' },
  { id: 'rows over', re: /\brows\s+over\b/gi, why: 'row counts of an internal report' },
  { id: 'data module', re: /\bdata\s+modules?\b/gi, why: 'our source tree' },
  { id: 'wall sheet', re: /\bwall\s+sheets?\b/gi, why: 'an internal document name' },
  { id: 'price sheet', re: /\bprice\s+sheets?\b/gi, why: 'an internal document name' },
  { id: 'crypt sheet', re: /\bcrypt\s+sheets?\b/gi, why: 'an internal document name' },
  { id: 'quote tool', re: /\bquote\s+tool\b/gi, why: 'naming our tool as a data source' },
  { id: 'sprint', re: /\bsprints?\b/gi, why: 'our development process' },
  { id: 'track', re: /\btracks?\b/gi, why: 'our development process' },
  { id: 'gate', re: /\bgates?\b/gi, why: 'our development process' },
  { id: 'verifier', re: /\bverifiers?\b/gi, why: 'our development process' },
  { id: 'sabotage', re: /\bsabotage[ds]?\b/gi, why: 'our development process' },
  { id: 'Enterprise', re: /\bEnterprise\b/g, why: 'the internal system of record, by name' },
  { id: 'CAD', re: /\bCAD\b/g, why: 'internal drafting jargon' },
  { id: 'read to the family', re: /\bread\s+(?:these|this|it|them)\s+to\s+the\s+famil(?:y|ies)\b/gi,
    why: 'a counselor instruction, rendered where the family can read it' },
  { id: 'dated provenance', re: /\b(?:printed|exported|captured|pulled|dated)\s+(?:on\s+)?(?:\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})/gi,
    why: 'when we last pulled the numbers — say "prices effective" instead' },
];

/**
 * Spans that are legitimate and are blanked before the scan.
 * `file` (optional) is a regex the surface LABEL must match, so a per-surface exception
 * cannot silently widen to every other page.
 */
export const ALLOW = [
  {
    id: 'quote-tool-nav',
    re: /<a[^>]*>\s*(?:&larr;|←)\s*Quote\s+Tool\s*<\/a>/gi,
    why: 'the back button — a navigation label, not a data-source citation',
  },
  {
    id: 'pcm-design-tags',
    file: /pcm-design-catalog/i,
    re: /<span class="tag"[^>]*>[^<]*<\/span>|\bdata-(?:tag|tags|name|cat|sub|color)="[^"]*"/gi,
    why: 'marker-design motif names ("gate", "gates of heaven") are products, not jargon',
  },
  {
    id: 'pcm-proof-text',
    file: /pcm-design-catalog/i,
    re: /<div class="product-detail proof-title">[^<]*<\/div>|<div class="proof-desc">[^<]*<\/div>/gi,
    why: 'the curated title and one-sentence description on a full-colour proof card ' +
         '(s21). Same reason as the motif tags above and the same narrowness: four of the ' +
         '619 say "gate", because four of the designs draw a garden gate. Allowed BY SPAN ' +
         'and to this one file, so a banned word anywhere else on the page — including in ' +
         'the section prose right above these cards — still fails',
  },
  {
    id: 'pcm-search-index',
    file: /pcm-design-catalog/i,
    re: /\bvar\s+(?:ELEMENTS|STEM_TAGS|SYNONYMS|TAGS|DESIGNS)\s*=[\s\S]*?;\s*$/gm,
    why: 'the same motif names again, as the search index the page ships',
  },
];

// A comment is replaced by its OWN newlines, never by nothing. Collapsing a 40-line block
// comment to an empty string shifts every line number after it, and the first version of
// this file did exactly that: it reported a hit on GOMN line 842, where line 842 holds no
// such word. A gate that points at the wrong line is worse than one that prints no line —
// it sends the reader to innocent code and costs the report its credibility.
const blank = (m) => m.replace(/[^\r\n]/g, '');

/** Strip the things a browser never renders, leaving everything it might. */
export function stripUnrendered(src) {
  return src
    // HTML comments
    .replace(/<!--[\s\S]*?-->/g, blank)
    // block comments (JS and CSS share the syntax)
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    // full-line // comments ONLY. A general `//`-to-end-of-line strip would eat the tail
    // of every `https://` URL and every regex, and could hide a real hit behind one.
    .replace(/^[ \t]*\/\/.*$/gm, '');
}

/** Blank every allowlisted span, preserving line numbering. */
export function stripAllowed(src, label = '') {
  let out = src;
  for (const a of ALLOW) {
    if (a.file && !a.file.test(label)) continue;
    a.re.lastIndex = 0;
    out = out.replace(a.re, blank);
  }
  return out;
}

/**
 * Every rendered occurrence of a banned term, as `{ line, term, text }` against the
 * ORIGINAL line numbering. `only` optionally restricts to a subset of ban ids.
 */
export function registerHits(src, label = '', only = null) {
  const lines = stripAllowed(stripUnrendered(src), label).split(/\r?\n/);
  const terms = only ? BANNED.filter((b) => only.includes(b.id)) : BANNED;
  const out = [];
  lines.forEach((text, i) => {
    for (const b of terms) {
      b.re.lastIndex = 0;
      const m = b.re.exec(text);
      if (m) out.push({ line: i + 1, term: b.id, match: m[0], text: text.trim().slice(0, 200) });
    }
  });
  return out;
}

/** Back-compat: the original MIS-only scan, still used by tests/test-marker-guide-prices.mjs. */
export function misHits(src) {
  return registerHits(src, '', ['MIS']);
}

/**
 * Assert-and-report helper for a map/guide gate.
 * `ck` is the gate's own check function, `label` names the surface.
 */
export function assertNoMis(ck, label, src) {
  return assertFamilyRegister(ck, label, src);
}

/**
 * THE GATE. One call per family-facing surface.
 * `ck(bool, message)` is the caller's own check function; `label` names the surface and
 * is what the per-file allowlist entries are matched against.
 */
export function assertFamilyRegister(ck, label, src) {
  const hits = registerHits(src, label);
  ck(hits.length === 0,
    hits.length === 0
      ? `${label}: no internal register on the page — none of ${BANNED.length} banned terms rendered (comments may keep them)`
      : `${label}: ${hits.length} rendered internal term(s) — `
        + hits.slice(0, 6).map((h) => `line ${h.line} [${h.term}] ${JSON.stringify(h.match)}`).join('; ')
        + (hits.length > 6 ? ` … +${hits.length - 6} more` : '')
        + ` :: ${hits[0].text}`);
  return hits;
}
