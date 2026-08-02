// Staleness ledger for the generated PDFs (guides + catalogs).
//
// The problem it solves: `pdf-assets/*.pdf` are prints of the HTML pages, but nothing
// forced anyone to rebuild after editing a page. Six catalogs and ten guides were shipping
// content that no longer matched the page a family could see on the site.
//
// WHY A CONTENT HASH AND NOT MTIME. `PDF mtime >= source mtime` is the obvious check and
// it is wrong here: git does not preserve mtimes, so every fresh clone and every `git
// worktree add` stamps all files with the checkout time in arbitrary order. The gate would
// flip between pass and fail depending on which file the checkout happened to write last.
// A hash of the source bytes recorded next to the PDF is reproducible in any clone.
//
// What it CANNOT catch: an edit to something a page pulls in that is not listed in that
// job's `sources` (a shared image, say). Sources are declared per job by the builder, so
// adding a new shared input means adding it there — the guide jobs list the page plus the
// shared print stylesheet and the cover partial, which are the inputs that change.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ROOT } from './_print-server.mjs';

export const MANIFEST = path.join(ROOT, 'pdf-assets', '.build-manifest.json');

export const sha = (rel) => crypto.createHash('sha256')
  .update(fs.readFileSync(path.join(ROOT, rel))).digest('hex').slice(0, 16);

const load = () => (fs.existsSync(MANIFEST)
  ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : { note: 'generated — see scripts/_pdf_manifest.mjs', builds: {} });

/** Record one built PDF and the source files it was printed from. Merges, so a filtered
 *  partial build leaves every other job's entry untouched. */
export function record(out, sources) {
  const m = load();
  m.builds[out] = Object.fromEntries(sources.map(s => [s, sha(s)]));
  const keys = Object.keys(m.builds).sort();
  m.builds = Object.fromEntries(keys.map(k => [k, m.builds[k]]));
  fs.writeFileSync(MANIFEST, JSON.stringify(m, null, 2) + '\n');
}

/** Check every recorded build against the current source bytes.
 *  Returns `{ checked, stale: [{out, src}], missing: [out] }`. */
export function check() {
  const m = load();
  const stale = [], missing = [];
  let checked = 0;
  for (const [out, sources] of Object.entries(m.builds)) {
    if (!fs.existsSync(path.join(ROOT, out))) { missing.push(out); continue; }
    for (const [src, want] of Object.entries(sources)) {
      checked++;
      if (!fs.existsSync(path.join(ROOT, src))) { stale.push({ out, src, why: 'source gone' }); continue; }
      if (sha(src) !== want) stale.push({ out, src, why: 'source changed since build' });
    }
  }
  return { checked, stale, missing, jobs: Object.keys(m.builds).length };
}
