// ZERO RENDERED "MIS" ON A FAMILY-FACING SURFACE.
//
// Operator, 2026-08-02: "Never mention the word MIS on any guide to a family or any live
// niche maps etc — that information does not need to be disclosed to families." MIS is the
// internal cemetery system of record. A family reading "confirm in MIS/Enterprise" learns
// the name of a system they cannot see, cannot check, and were never meant to know about;
// what they actually need is to be told to ask us.
//
// WHAT COUNTS AS RENDERED. Everything a browser could put in front of a reader: visible
// text, attribute values (aria-label, title, alt), and JS string literals, because these
// pages build their detail cards by assigning innerHTML from strings. What does NOT count
// is source commentary — the provenance notes in the generators and data modules are how
// the next person knows where a price came from, they never reach the page, and stripping
// the word out of them would cost real institutional memory for no family's benefit.
//
// So the scan removes comments and then looks for the word. That ordering is the whole
// design: it cannot be satisfied by moving the string somewhere less obvious, only by
// actually removing it from the rendered surface.
//
// Case-sensitive and word-bounded on purpose. `MISTAKES #18` (a real comment in three of
// these generators) and `class="cardmis"` are not the operator's MIS and must not be
// flagged — flagging them would train the next reader to wave the gate off.

const RE = /\bMIS\b/g;

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

/** Every rendered occurrence, as `{ line, text }` against the ORIGINAL line numbering. */
export function misHits(src) {
  const lines = stripUnrendered(src).split(/\r?\n/);
  const out = [];
  lines.forEach((text, i) => {
    RE.lastIndex = 0;
    if (RE.test(text)) out.push({ line: i + 1, text: text.trim().slice(0, 160) });
  });
  return out;
}

/**
 * Assert-and-report helper for a map/guide gate.
 * `ck` is the gate's own check function, `label` names the surface.
 */
export function assertNoMis(ck, label, src) {
  const hits = misHits(src);
  ck(hits.length === 0,
    hits.length === 0
      ? `${label}: no rendered "MIS" anywhere on the page (comments may keep it)`
      : `${label}: ${hits.length} rendered "MIS" — line ${hits.map((h) => h.line).join(', ')} :: ${hits[0].text}`);
  return hits;
}
