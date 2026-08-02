// Shared assertion for the range verifiers, sprint-10 Track P4.
//
// The three range verifiers (granite, glass, urn-garden) already reconcile every price
// figure ON THE PAGE against its data module. The printed guide is now a different
// document from the page: the operator's pricing rule suppresses fee tables and exact
// per-item prices in print and replaces them with an invitation.
//
// So each verifier now also checks the PRINT side of its own guide — that the fee figures
// it just proved correct are the ones the rule actually removed, and that nothing is left
// behind. Without this, a newly-added fee table would be verified as correct on screen and
// would print in a leave-behind the operator asked not to carry exact fees.
import fs from 'fs';
import { tables } from './guide-price-rule.mjs';

export function assertPrintRule(pageFile, ok, fail) {
  const html = fs.readFileSync(pageFile, 'utf8');
  const all = tables(html);
  const feeTables = all.filter((t) => /data-fee=/.test(t.html));
  // Compliant two ways: the whole table is suppressed, or — when the table also holds a
  // verified range that must survive — every one of its fee ROWS is.
  const feeRows = (t) => (t.html.match(/<tr\b[\s\S]*?<\/tr>/gi) || [])
    .filter((row) => /data-fee=/.test(row) && !/data-range=/.test(row));
  const compliant = (t) => /<table[^>]*data-print-suppress=/.test(t.html)
    || feeRows(t).every((row) => /<tr[^>]*data-print-suppress=/.test(row));
  const unsuppressed = feeTables.filter((t) => !compliant(t));
  const invites = (html.match(/class="print-invite"/g) || []).length;
  const ranges = [...html.matchAll(/data-range="([^"]+)"/g)].map((m) => m[1]);

  if (!feeTables.length) { fail(`${pageFile}: no fee table found at all — the tagging this gate depends on is gone`); return; }
  if (unsuppressed.length) fail(`${pageFile}: ${unsuppressed.length} fee table(s) are NOT marked data-print-suppress and will print exact fees`);
  else ok(`print rule: all ${feeTables.length} fee table(s) suppressed in print`);

  // An invitation is required only where a WHOLE table was removed. Where just the fee
  // rows went (the table had to survive because it also holds a verified range), the
  // guide keeps its own prose about the charges and an extra block would cost more space
  // than the rows saved — see the note in build_guide_print_system.mjs.
  const wholeTablesGone = feeTables.some((t) => /<table[^>]*data-print-suppress=/.test(t.html));
  if (wholeTablesGone && !invites) fail(`${pageFile}: fee tables are suppressed but no .print-invite replaces them — the printed guide just loses the information`);
  else if (!wholeTablesGone) ok('print rule: fee ROWS suppressed; the table and its range survive');
  else ok(`print rule: ${invites} invitation block(s) replace them`);

  // The verified ranges must survive into print. They live outside the suppressed tables
  // (or in a `compare` table the rule deliberately keeps), so a range that ended up inside
  // a suppressed table would be silently deleted from the leave-behind.
  const lost = ranges.filter((key) => {
    const re = new RegExp(`data-range="${key}"`);
    return all.some((t) => /<table[^>]*data-print-suppress="(?:fee|price)"/.test(t.html) && re.test(t.html));
  });
  if (lost.length) fail(`${pageFile}: verified range(s) ${lost.join(', ')} sit inside a suppressed table and will not print`);
  else ok(`print rule: all ${ranges.length} verified range(s) survive into print`);
}
