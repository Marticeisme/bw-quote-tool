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

// THE WORKTREE LINE-ENDING TRAP (sprint-17, both guide tracks hit it independently).
// core.autocrlf=true means a fresh `git worktree add` checks text sources out CRLF,
// while the primary tree can hold the generator's LF bytes for a generated-but-tracked
// file (guide-print.css was the one of 31 sources affected). Raw-byte hashes then
// differ on PRISTINE code: ~25 staleness checks fail in every new worktree, and a
// rebuild there records the CRLF hash — poisoning the manifest for the primary tree
// after merge. Line endings never change what a page renders or prints, so for text
// sources the CR bytes are stripped before hashing; a CRLF and an LF checkout of the
// same file now hash identically. Binary sources (if a job ever lists one) keep the
// raw-byte hash — stripping 0x0D from an image would corrupt the digest's meaning.
const TEXT = new Set(['.html', '.css', '.mjs', '.js', '.json', '.svg', '.md', '.txt', '.csv']);

export const sha = (rel) => {
  let buf = fs.readFileSync(path.join(ROOT, rel));
  if (TEXT.has(path.extname(rel).toLowerCase())) {
    buf = Buffer.from(buf.toString('utf8').replace(/\r/g, ''), 'utf8');
  }
  return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
};

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
