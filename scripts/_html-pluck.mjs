// Depth-aware element extraction for the guide print generator.
//
// The obvious `/<div class="cover"[\s\S]*?<\/div>/` is wrong on every guide here: the
// masthead contains nested <div>s, so the non-greedy match ends at the FIRST inner
// closing tag. The first cut of the cover generator used it and every cover shipped with
// an empty subtitle — visible only because the covers were rendered and looked at.
// Counting tags is not optional; scan with a depth counter.

/** Inner HTML of the first element carrying `cls`, honouring nesting. `null` if absent.
 *
 *  The class test is TOKEN-exact, not `\b`-delimited. `\bcover\b` also matches
 *  `class="print-cover"`, because `-` is a word boundary — so the generator read the
 *  cover it had itself injected on the previous run, and the titles came back truncated
 *  and the subtitles empty. Match whole space-separated tokens only. */
export function pluckClass(html, cls) {
  const open = new RegExp(`<([a-z0-9]+)[^>]*\\sclass="(?:[^"]*\\s)?${cls}(?:\\s[^"]*)?"[^>]*>`, 'i');
  const m = html.match(open);
  if (!m) return null;
  return pluckFrom(html, m.index, m[0], m[1]);
}

/** Inner HTML of the first `<tag ...>` at or after `from`. `null` if absent. */
export function pluckTag(html, tag, from = 0) {
  const open = new RegExp(`<${tag}\\b[^>]*>`, 'i');
  const m = html.slice(from).match(open);
  if (!m) return null;
  return pluckFrom(html, from + m.index, m[0], tag);
}

/**
 * Index just BEFORE the matching close tag of the element starting at `at`.
 * Used to append inside an element instead of beside it — a `display:none` sibling is
 * still a sibling, and the guides style `.section-wrap + .section-wrap{border-top:...}`,
 * so inserting a hidden block BETWEEN two sections silently deleted a rule line on the
 * live website. The screen pixel diff caught it; nothing else would have.
 */
export function elementEnd(html, at) {
  const m = html.slice(at).match(/^<([a-z0-9]+)[^>]*>/i);
  if (!m) return -1;
  const inner = pluckFrom(html, at, m[0], m[1]);
  return inner === null ? -1 : at + m[0].length + inner.length;
}

function pluckFrom(html, at, openTag, tag) {
  if (/\/>$/.test(openTag)) return '';
  const re = new RegExp(`<${tag}\\b[^>]*>|<\\/${tag}\\s*>`, 'gi');
  re.lastIndex = at + openTag.length;
  let depth = 1, mm;
  while ((mm = re.exec(html))) {
    if (mm[0][1] === '/') { if (--depth === 0) return html.slice(at + openTag.length, mm.index); }
    else if (!/\/>$/.test(mm[0])) depth++;
  }
  return null; // unbalanced — caller treats as missing rather than guessing
}
