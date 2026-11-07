// Builds BW_SPACE_INV — the per-space availability + price list behind the quote tool's
// "Space" dropdowns under Columbarium (qNicheName) and Mausoleum (qMausName) — from the
// Property Cards session's live-MIS price pull, and writes it INLINE into index.html between
// the GENERATED SPACE INVENTORY markers.
//
//   node scripts/build-space-inventory.mjs [folder-with-the-csvs] [YYYY-MM-DD]
//
// Defaults to D:\Property Cards\out\review\price_lists and 2026-11-06. The inputs are the two
// per-sheet CSVs WMP_Cemetery_Prices_MIS_<date>__Niches_Columbaria.csv and
// __Crypts_Mausoleums.csv: one row per Available / Un-Sold space, MIS Property Info price.
//
// RULES (Martice, 2026-07-25: "we should follow pricing from MIS"):
//   - the MIS price is THE price; map data-price and printed sheets are not consulted.
//   - $0.00 in MIS = no price set yet → left out of the dropdown, counted in `unpriced`.
//   - a price with cents (e.g. $12,497.50) is kept but FLAGGED: several look like half of a
//     normal price and need checking in MIS before a family sees them.
//   - sections the tool has no building option for are reported and skipped, never guessed.
//
// Read-only on the CSVs. Rewrites only the marked block of index.html (CRLF preserved).
import fs from 'fs';
import path from 'path';

const DIR = process.argv[2] || 'D:/Property Cards/out/review/price_lists';
const AS_OF = process.argv[3] || '2026-11-06';
const INDEX = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', 'index.html');

// MIS section (+ wall test) → the tool's exact <option value>. Order inside a section matters:
// first match wins.
const NICHE_MAP = [
  ['CN',   null,            'Crystal Niches'],
  ['COH',  null,            'Court of Honor Niches'],
  ['ECL',  null,            'Eternal Light Columbarium (New)'],
  ['ELN',  null,            'Eternal Light Niches'],
  ['GOM',  null,            'Garden of Meditation Niches'],
  ['TGN',  null,            'Terrace Garden Niches'],
  ['RAD',  null,            'Radiance Wall \u2013 Chapel of Memories'],
  ['SER',  null,            'Serenity Wall \u2013 Chapel of Memories'],
  ['ROAC', null,            'Rock of Ages Columbarium'],
  ['MVC',  /^ISL-/,         'Mountain View Columbarium (New)'],
  ['MVC',  /-INT$/,         'Mountain View Columbarium (Inside)'],
  ['MVC',  /-EXT$/,         'Mountain View Columbarium (Outside)'],
  ['LCG',  null,            'Lake Cremation Garden'],
  ['LUGB', null,            'Lake Urn Boulder Garden'],
];
// Every niche carries 2 rights. These span two tiers and carry 4 (Martice 2026-11-06: "wall e int
// level e d spaces 2 and 3 is for four rights the space is quite large"; the island D/E doubles
// are the 4-urn companions). Stored as a 6th unit element only when it is not 2.
const FOUR_RIGHTS = [
  ['MVC', /^E-INT$/, /^ED$/],
  ['MVC', /^ISL-/,   /^D\/E$/],
];
// Operator rulings that override a known-bad MIS row. Keep this list short and dated: the
// fix belongs in MIS, and the script reports when MIS starts agreeing so a row can be dropped.
//   ROAC D-INT D-5: ruled $14,995 on 2026-08-01 (MIS missed the interior reprice — every other
//   interior Level D niche is $14,995); MIS still said $16,495 on 11/06; ruling reaffirmed 11/06.
const PRICE_OVERRIDES = [
  { sec: 'ROAC', wall: 'D-INT', lvl: 'D', sp: '5', price: 14995, ruled: '2026-08-01, reaffirmed 2026-11-06' },
];
const MAUS_MAP = [
  ['COM', null, 'Chapel of Memories'],
  ['ELM', null, 'Eternal Light Mausoleum'],
  ['GCM', null, 'Garden Court Mausoleum'],
  ['TGM', null, 'Terrace Garden Mausoleum'],
];

function parseCsv(text) {
  text = text.replace(/^\uFEFF/, '');
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = ''; if (row.length > 1 || row[0] !== '') rows.push(row); row = [];
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const head = rows.shift();
  return rows.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

const natural = (a, b) => String(a).localeCompare(String(b), 'en', { numeric: true });

function build(file, map) {
  const rows = parseCsv(fs.readFileSync(path.join(DIR, file), 'utf8'));
  const out = {}, skipped = {}, unpriced = {};
  let flagged = 0, ecfOff = 0;
  for (const r of rows) {
    const sec = r['Section'], wall = r['Wall/Block'];
    const hit = map.find(([s, re]) => s === sec && (!re || re.test(wall)));
    if (!hit) { skipped[sec] = (skipped[sec] || 0) + 1; continue; }
    const name = hit[2];
    let price = Number(r['MIS price']);
    if (!(price > 0)) { unpriced[name] = (unpriced[name] || 0) + 1; continue; }
    const ecf = Number(r['MIS ECF']);
    if (Math.abs(ecf - price * 0.1) > 0.005) { ecfOff++; console.warn('  ECF not 10%:', r['Lot Location (example)'], price, ecf); }
    const ov = PRICE_OVERRIDES.find((o) => o.sec === sec && o.wall === wall && o.lvl === r['Level/Lot'] && o.sp === r['Space']);
    if (ov) {
      console.log(`  override ${sec} ${wall} ${ov.lvl}-${ov.sp}: MIS $${price} -> $${ov.price} (ruled ${ov.ruled})`
        + (price === ov.price ? '  ** MIS now agrees — this override can be removed **' : ''));
      price = ov.price;
    }
    const flag = price % 1 !== 0 ? 1 : 0;
    flagged += flag;
    const unit = [wall, r['Level/Lot'], r['Space'], price, flag];
    if (FOUR_RIGHTS.some(([s, w, l]) => s === sec && w.test(wall) && l.test(r['Level/Lot']))) unit.push(4);
    (out[name] ||= { code: sec, units: [] }).units.push(unit);
  }
  for (const b of Object.values(out)) {
    b.units.sort((a, c) => natural(a[0], c[0]) || natural(a[1], c[1]) || natural(a[2], c[2]));
  }
  return { out, skipped, unpriced, flagged, ecfOff, total: rows.length };
}

const niche = build(`WMP_Cemetery_Prices_MIS_${AS_OF}__Niches_Columbaria.csv`, NICHE_MAP);
const maus = build(`WMP_Cemetery_Prices_MIS_${AS_OF}__Crypts_Mausoleums.csv`, MAUS_MAP);

const unpriced = { ...niche.unpriced, ...maus.unpriced };
const inv = { asOf: AS_OF, source: 'MIS Property Info, every Available / Un-Sold space', niche: niche.out, maus: maus.out, unpriced };
const json = JSON.stringify(inv);

const BEGIN = '// \u2500\u2500 GENERATED SPACE INVENTORY \u2014 scripts/build-space-inventory.mjs \u2014 DO NOT EDIT BY HAND \u2500\u2500';
const END = '// \u2500\u2500 END GENERATED SPACE INVENTORY \u2500\u2500';
const block = [BEGIN,
  `// MIS snapshot ${AS_OF}. units: [wall, level, space, price, flag, rights?]; flag 1 = price has cents, verify in MIS; rights only when not 2.`,
  `var BW_SPACE_INV = ${json};`,
  END].join('\r\n');

let s = fs.readFileSync(INDEX, 'utf8');
const a = s.indexOf(BEGIN), b = s.indexOf(END);
if (a >= 0 && b > a) {
  s = s.slice(0, a) + block + s.slice(b + END.length);
} else {
  const anchor = s.indexOf('var BW_NICHE_TYPE = {');
  if (anchor < 0) throw new Error('anchor var BW_NICHE_TYPE not found');
  s = s.slice(0, anchor) + block + '\r\n' + s.slice(anchor);
}
fs.writeFileSync(INDEX, s);

const count = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.units.length]));
console.log('as of', AS_OF);
console.log('niches  :', count(niche.out));
console.log('crypts  :', count(maus.out));
console.log('no price in MIS (left out):', unpriced);
console.log('skipped (no building option in the tool):', { ...niche.skipped, ...maus.skipped });
console.log('flagged (cents in price):', niche.flagged + maus.flagged, '| ECF not 10%:', niche.ecfOff + maus.ecfOff);
console.log('block bytes:', block.length);
