// Regenerate index.html's BW_FEES block from data/prices.json.
//
//   npm run sync-prices              rewrite the block from data/prices.json
//   npm run sync-prices -- --check   fail (exit 1) if the block is out of date; write nothing
//   node scripts/sync-prices.mjs --from <prices.json> --into <index.html>
//
// This is step 2 of the price update path — see docs/PRICE_UPDATE.md. Step 1 is rebuilding
// data/prices.json from the map's price source; that script writes this repo's copy and the
// map's in the same run, so the two apps cannot drift. Neither copy is ever hand-edited, and
// neither is this block.
//
// WHICH KEYS GET EMITTED IS NOT A LIST IN THIS FILE. It is read out of index.html: every
// bwFee('KEY') call site. That way the generated object holds exactly the prices the app
// actually asks for — no more (a constant nobody reads looks authoritative and isn't) and no
// fewer (a call with no price throws at runtime, so this catches it at build time instead).
//
// prices.json holds a few keys the tool deliberately does not source — MONOBAR_INSTALL, the
// two VASE keys, the 70 ROAC niche prices, the ECF/TAX rates. Those are reported below as
// "not used by the tool" rather than silently emitted; the reasons are in index.html's price
// block and in docs/PRICE_UPDATE.md.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf('--' + name);
  return i > -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt;
};
const CHECK = argv.includes('--check');
const PRICES = path.resolve(flag('from', path.join(ROOT, 'data', 'prices.json')));
const TARGET = path.resolve(flag('into', path.join(ROOT, 'index.html')));

const BEGIN = '// ── GENERATED FROM data/prices.json — DO NOT EDIT BY HAND ─────────────────────';
const END = '// ── END GENERATED ─────────────────────────────────────────────────────────────';

const die = (msg) => { console.error('sync-prices: ' + msg); process.exit(1); };

const prices = JSON.parse(fs.readFileSync(PRICES, 'utf8'));
if (!prices.current || !prices.current.fees) die(PRICES + ' has no `current.fees` — wrong schema?');

let html = fs.readFileSync(TARGET, 'utf8');
const b = html.indexOf(BEGIN);
const e = html.indexOf(END);
if (b < 0 || e < 0 || e < b) die('could not find the GENERATED markers in ' + TARGET);

// Which prices does the app actually ask for? Read the call sites, ignoring the block we are
// about to rewrite (it contains none, but a future edit might).
const rest = html.slice(0, b) + html.slice(e);
const used = [...new Set([...rest.matchAll(/bwFee\('([^']+)'\)/g)].map((m) => m[1]))].sort();
if (!used.length) die('no bwFee(\'…\') call sites found in ' + TARGET + ' — refusing to empty BW_FEES');

const missing = used.filter((k) => typeof prices.current.fees[k] !== 'number' || !(prices.current.fees[k] > 0));
if (missing.length) {
  die('the app asks for prices that ' + PRICES + ' does not have:\n  ' + missing.join('\n  ') +
    '\nAdd them at the source and rebuild — never hand-edit prices.json.');
}

// CRLF throughout: this repo's index.html is CRLF and a mixed file breaks later scripted edits.
const block = [
  BEGIN,
  '// Regenerate with:  npm run sync-prices',
  "var BW_PRICES_URL = 'data/prices.json';",
  "var BW_PRICES_GENERATED = '" + prices.generated + "';",
  'var BW_FEES = {',
  ...used.map((k) => "  '" + k + "': " + prices.current.fees[k] + ','),
  '};',
  END,
].join('\r\n');

const current = html.slice(b, e + END.length);
const unused = Object.keys(prices.current.fees).filter((k) => used.indexOf(k) < 0).sort();

let out = html.slice(0, b) + block + html.slice(e + END.length);

// ── the eight O&C checkbox labels, which are generated TEXT, not <span data-fee> ──────────
//
// Every other displayed fee in the app is a <span data-fee="KEY"> filled at boot. These eight
// are literals on purpose, and the reason is a loop worth knowing about:
//
//   the map's scripts/build-prices.py produces the O&C half of data/prices.json by SCRAPING
//   these very labels — `<label for="qOCLawnSingle">… — $1,535</label>` — because the tool is
//   the only place those eight amounts have ever been written down. Replace the amount with an
//   empty span and that scrape silently matches nothing, and the next rebuild drops all eight
//   O&C fees out of the file both apps read.
//
// So they stay readable as text, and this script keeps them in step with prices.json instead
// of a person doing it. The loop is stable — prices.json → these labels → prices.json returns
// the same number — but it does mean an O&C price cannot yet be changed from the file end.
// docs/PRICE_UPDATE.md records the fix (give build-prices.py an explicit O&C table instead of
// scraping), after which these can become spans like everything else.
const OC_LABEL_KEY = {
  LawnSingle: 'OC:lawn_single', LawnDouble1: 'OC:lawn_double_1st',
  LawnDouble2: 'OC:lawn_double_2nd', Maus: 'OC:mausoleum_entombment',
  Ground: 'OC:ground_inurnment', Boulder: 'OC:boulder_inurnment',
  Niche: 'OC:niche_inurnment', NicheNon: 'OC:niche_non_inurnment',
};
let labelsSeen = 0;
const labelMoved = [];
out = out.replace(/(<label for="qOC(\w+)">[^<]*?[—–-]\s*\$)([\d,]+)(<\/label>)/g,
  (m, head, id, amt, tail) => {
    const key = OC_LABEL_KEY[id];
    if (!key) die('unmapped O&C label qOC' + id + ' — add it to OC_LABEL_KEY (and to the map\'s OC_PRODUCTS)');
    const want = prices.current.fees[key];
    if (typeof want !== 'number') die(PRICES + ' has no current fee ' + key + ' for label qOC' + id);
    labelsSeen++;
    const had = Number(amt.replace(/,/g, ''));
    if (had !== want) labelMoved.push('  ' + key + ' (label qOC' + id + '): ' + had + ' -> ' + want);
    return head + want.toLocaleString('en-US') + tail;
  });
if (labelsSeen !== 8) {
  die('found ' + labelsSeen + ' O&C labels, expected 8. If one was renamed, the map\'s ' +
    'build-prices.py can no longer read it either — fix both.');
}

if (out === html) {
  console.log('already in sync — ' + used.length + ' prices, generated ' + prices.generated);
  if (unused.length) console.log('  (not used by the tool: ' + unused.join(', ') + ')');
  process.exit(0);
}

// Report what actually moves. A price change is the whole point of running this, and it is
// also the thing that reaches a family, so it is printed rather than applied quietly.
const oldFees = {};
for (const m of current.matchAll(/'([^']+)':\s*(\d+(?:\.\d+)?),/g)) oldFees[m[1]] = Number(m[2]);
const moved = used
  .filter((k) => oldFees[k] !== prices.current.fees[k])
  .map((k) => '  ' + k + ': ' + (k in oldFees ? oldFees[k] : '(new)') + ' -> ' + prices.current.fees[k])
  .concat(labelMoved);

if (CHECK) {
  console.error('sync-prices --check: ' + path.relative(ROOT, TARGET) + ' is OUT OF DATE against ' +
    path.relative(ROOT, PRICES));
  if (moved.length) console.error(moved.join('\n'));
  console.error('Run: npm run sync-prices');
  process.exit(1);
}

fs.writeFileSync(TARGET, out);
console.log('wrote ' + used.length + ' prices into ' + path.relative(ROOT, TARGET) +
  ' (generated ' + prices.generated + ') — plus ' + labelsSeen + ' O&C labels');
if (moved.length) { console.log('PRICES CHANGED:'); console.log(moved.join('\n')); }
else console.log('no price changed — metadata only');
if (unused.length) console.log('not used by the tool: ' + unused.join(', '));
