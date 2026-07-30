/**
 * Extract the Terrace Garden (TGN) niche dataset out of the SHIPPED Mountain View
 * Columbarium niche map, so the Terrace Garden Memorial Path map can be proven to carry
 * exactly what the MVC page carried before the TGN moved off it.
 *
 * This is the ROAC-rebuild pattern: the old data is never retyped, it is extracted by
 * script from the artefact that was live, and the new module is diffed against that
 * extraction on ref + price + status.
 *
 * The extraction reads the newest commit of MAPS/MVC_NewGlassFront_NicheMap_1.html that
 * still renders `data-wall="tgn"` buttons — deliberately NOT the working copy, which
 * loses the TGN in this very branch, and deliberately not a fixed SHA, which stops
 * meaning anything after the next rebuild. Same shape as verify_mvc_map.mjs's
 * findBaseline().
 *
 *   node scripts/extract_tgn_from_mvc.mjs          print the 40 extracted niches
 *   node scripts/extract_tgn_from_mvc.mjs --json   emit them as JSON
 */
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const MVC_REL = 'MAPS/MVC_NewGlassFront_NicheMap_1.html';

/** Newest commit of the MVC page that still carries a TGN niche. */
export function findTgnBaseline() {
  const log = execFileSync('git', ['-C', ROOT, 'log', '--format=%H', '--', MVC_REL], { encoding: 'utf8' });
  for (const sha of log.trim().split('\n').filter(Boolean)) {
    let blob;
    try {
      blob = execFileSync('git', ['-C', ROOT, 'show', `${sha}:${MVC_REL}`], { encoding: 'utf8', maxBuffer: 1 << 28 });
    } catch { continue; } // file absent in that commit
    if (blob.includes('data-wall="tgn"')) return { sha: sha.slice(0, 7), blob };
  }
  throw new Error('no commit of ' + MVC_REL + ' carries data-wall="tgn"');
}

/**
 * Every `data-wall="tgn"` button in an MVC page, as {ref, id, row, n, price, rights, st}.
 *
 * The old page had no status attribute at all: a rendered TGN niche was, by
 * construction, sellable. That absence is recorded explicitly as 'available' rather
 * than left undefined, so the parity comparison is over a real three-field tuple.
 */
export function extractTgn(src) {
  const out = [];
  for (const m of src.matchAll(/<button[^>]*data-wall="tgn"[^>]*>/g)) {
    const tag = m[0];
    const at = (k) => { const r = new RegExp(`data-${k}="([^"]*)"`).exec(tag); return r ? r[1] : null; };
    const id = at('id');
    if (!id) continue;
    const [row, n] = id.split('-');
    out.push({
      ref: `TGN-${id}`,
      id,
      row,
      n: +n,
      price: +at('price'),
      rights: +at('urn'),
      st: at('st') || 'available',
      mis: at('mis'),
      inside: at('inside'),
    });
  }
  return out;
}

/** The extraction, deduplicated — the MVC page renders the TGN grid exactly once. */
export function extractedTgn() {
  const { sha, blob } = findTgnBaseline();
  const raw = extractTgn(blob);
  const seen = new Map();
  for (const c of raw) if (!seen.has(c.ref)) seen.set(c.ref, c);
  return { sha, raw, niches: [...seen.values()] };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { sha, raw, niches } = extractedTgn();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ source: `${sha}:${MVC_REL}`, niches }, null, 2));
  } else {
    console.log(`\nTGN extracted from ${sha}:${MVC_REL}`);
    console.log(`${raw.length} rendered button(s), ${niches.length} distinct niche(s)\n`);
    console.log('  ref          id     row  n   price    rights  status     MIS location            inside');
    for (const c of niches) {
      console.log(`  ${c.ref.padEnd(12)} ${c.id.padEnd(6)} ${c.row}    ${String(c.n).padEnd(3)} ` +
        `$${String(c.price).padStart(6)}  ${String(c.rights).padEnd(6)}  ${c.st.padEnd(10)} ${(c.mis || '').padEnd(23)} ${c.inside || ''}`);
    }
    const total = niches.reduce((a, c) => a + c.price, 0);
    const rights = niches.reduce((a, c) => a + c.rights, 0);
    const byRow = {};
    for (const c of niches) (byRow[c.row] ||= new Set()).add(c.price);
    console.log('\n  row prices: ' + Object.keys(byRow).map((r) => `${r}=${[...byRow[r]].map((p) => '$' + p.toLocaleString('en-US')).join('/')}`).join('  '));
    console.log(`  total listed value $${total.toLocaleString('en-US')}   total rights of interment ${rights}\n`);
  }
}
