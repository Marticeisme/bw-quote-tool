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

if (current === block) {
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
  .map((k) => '  ' + k + ': ' + (k in oldFees ? oldFees[k] : '(new)') + ' -> ' + prices.current.fees[k]);

if (CHECK) {
  console.error('sync-prices --check: index.html is OUT OF DATE against ' + path.relative(ROOT, PRICES));
  if (moved.length) console.error(moved.join('\n'));
  console.error('Run: npm run sync-prices');
  process.exit(1);
}

fs.writeFileSync(TARGET, html.slice(0, b) + block + html.slice(e + END.length));
console.log('wrote ' + used.length + ' prices into ' + path.relative(ROOT, TARGET) +
  ' (generated ' + prices.generated + ')');
if (moved.length) { console.log('PRICES CHANGED:'); console.log(moved.join('\n')); }
else console.log('no price changed — metadata only');
if (unused.length) console.log('not used by the tool: ' + unused.join(', '));
