// The granite marker prices printed in markers-guide.html must equal what the quote
// tool would quote for the same marker. A family reads the guide; a counselor quotes
// from the tool; a disagreement between them is a disagreement in front of the family.
//
// The tool's flush-marker cost table lives in index.html as rows of
//   [size, G1 non-tariffed, G1 tariffed, Group 2, Group 3, Group 4 NT, Group 4 T, install]
// and the guide prints the installed, taxed price:  (base + install) * 1.104.
// This suite derives the guide's number from the TOOL's base figures and compares it to
// the string actually rendered on the page — neither side is read from a constant this
// file also owns.
//
// index.html is READ ONLY here. Nothing in this suite writes anything, anywhere.
//
// ── BOTH ESCALATIONS ARE NOW RESOLVED. The exception list is empty, and that is the point.
//
// 1. 32" x 20", G1 Tariffed — RESOLVED 2026-07-27 by Martice: the base is 2610.
//    The vendor price book (2026 PCM Markers, eff. 03/01/2026, sheet "Flush Markers",
//    cell C16) reads a hard-coded 32610. On the other thirteen rows of that sheet
//    G1 Tariffed is G1 Non-Tariffed x 1.20 (ratios 1.1978-1.2008), and 2175 x 1.20 =
//    2610 exactly, so "32610" is "2610" with a stray leading 3. The guide had printed
//    $4,146.62 — a third number again, the typo divided by ten — and now prints
//    (2610 + 495) x 1.104 = $3,427.92. The tool was always right and is unchanged.
//    THE VENDOR'S WORKBOOK STILL CARRIES THE TYPO. If a future price update reads that
//    sheet mechanically, it will reintroduce this. This suite is the thing that catches it.
//
// 2. 28" x 34" — RESOLVED 2026-07-27 (commit 2996575). index.html's row was a verbatim
//    copy of the 32" x 20" row, so the tool under-quoted the marker. Corrected to the
//    price book's row 15: 2735 / 3280 / 4110 / 5050 / 6010 / 7210.
//
// Both were escalated rather than guessed, which is the rule. An entry is deleted only
// when the operator rules — and because each exception asserts that it STILL disagrees,
// resolving one turns the exception itself red rather than letting the list go stale.
// That is how both of these came back to be closed.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const TAX = 1.104;   // 10.4% WA sales tax, stated on the guide itself

// Empty on purpose, as of 2026-07-27 — every cell in the guide now reconciles against
// index.html. Add an entry only when the operator has been asked and has not yet ruled;
// each one asserts that its disagreement is still real, so a resolved entry fails loudly
// instead of sitting here forever.
const ESCALATED = new Map([]);

let pass = 0, fail = 0;
const ok = (n, c, extra) => {
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (extra ? '  — ' + extra : '')); }
};

// ---- the tool's table, read out of index.html as text (never executed) ----
const src = fs.readFileSync('index.html', 'utf8');
const rows = new Map();
const re = /\['(\d+)\\?"x(\d+)\\?"x([\d/]+)\\?"',((?:(?:\d+|null),){6}(?:\d+|null))\]/g;
let m;
while ((m = re.exec(src))) {
  const nums = m[4].split(',').map(v => (v === 'null' ? null : Number(v)));
  if (m[3] !== '4') continue;                   // the guide prices the 4" thickness
  const key = `${m[1]}" x ${m[2]}"`;
  // A size can appear again further down under a different product block (uprights,
  // slants). The flush-marker table is first, and it is the one the guide prices.
  if (rows.has(key)) continue;
  rows.set(key, {
    'G1 Non-Tariffed': nums[0], 'G1 Tariffed': nums[1], 'Group 2': nums[2], install: nums[6],
  });
}
console.log(`tool: ${rows.size} flush-marker sizes read from index.html`);
ok('index.html yields a flush-marker cost table', rows.size >= 10, `got ${rows.size}`);

// ---- the guide's rendered prices ----
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await page.goto(pathToFileURL(path.resolve('markers-guide.html')).href, { waitUntil: 'networkidle' });
const printed = await page.evaluate(() => {
  const out = [];
  for (const t of document.querySelectorAll('table')) {
    const cap = (t.caption && t.caption.textContent.trim()) || '';
    if (!/MARKERS$|MARKERS \(/.test(cap)) continue;
    const rs = [...t.rows];
    const head = [...rs[0].cells].map(c => c.textContent.trim());
    for (const r of rs.slice(1)) {
      const cells = [...r.cells];
      // "28″ × 16″Single (1 grave)" -> the size only
      const size = cells[0].childNodes[0].textContent.trim();
      for (let i = 1; i < cells.length; i++) {
        out.push({ cap, size, col: head[i], text: cells[i].textContent.trim() });
      }
    }
  }
  return out;
});
await browser.close();

console.log(`guide: ${printed.length} price cells rendered`);
ok('markers-guide renders a full grid of marker prices', printed.length === 18, `got ${printed.length}` + ' (6 sizes x 3 colour groups)');

const norm = s => s.replace(/[″′"]/g, '"').replace(/\s*[×x]\s*/i, ' x ').replace(/"\s*$/, '"').trim();
const money = n => '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

let matched = 0, skipped = 0, unknown = 0;
for (const c of printed) {
  const size = norm(c.size);
  const row = rows.get(size);
  if (!row) { unknown++; ok(`size "${size}" exists in the tool's table`, false, 'no matching row in index.html'); continue; }
  const base = row[c.col];
  if (base === undefined) { unknown++; ok(`column "${c.col}" exists in the tool's table`, false); continue; }
  const want = money(Math.round((base + row.install) * TAX * 100) / 100);
  const key = `${size}|${c.col}`;
  if (ESCALATED.has(key)) {
    skipped++;
    console.log(`  SKIP  ${size} ${c.col}: guide ${c.text}, tool implies ${want} — ${ESCALATED.get(key)}`);
    // The exception must still be a real disagreement; if it ever agrees, delete it.
    ok(`escalated cell ${size} ${c.col} still disagrees (delete the exception once resolved)`, c.text !== want);
    continue;
  }
  matched++;
  ok(`${size} ${c.col} = ${want}`, c.text === want, `guide prints ${c.text}`);
}

console.log(`\nreconciled ${matched} cells, ${skipped} escalated, ${unknown} unmatched`);
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
