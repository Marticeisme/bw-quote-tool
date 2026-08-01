// Guard against the phantom-result failure this repo hit on 2026-07-26 — twice, in both
// directions, from two different sessions — and AGAIN on 2026-07-31 in two forms the first
// version of this file could not see.
//
// `dev-server.mjs` serves the directory of the SCRIPT, not the caller's cwd. With several
// worktrees on one machine — a track's, another session's, and main — whichever server got to
// port 3737 first answers for everybody. Both directions are bad and one of them is silent:
//
//   loud   : a track's tests run against unpatched code and fail for no visible reason.
//   SILENT : a baseline capture reads MAIN and reports "14/14 identical" — which is
//            trivially true there, and looks exactly like a clean pass.
//
// The first version compared exactly one file, index.html. That missed both 2026-07-31 forms:
// a scripts/-only change left the two trees' index.html identical (sprint-09 Track D), and
// two worktrees at the SAME COMMIT are identical in every tracked file, yet anything a suite
// WRITES into its tree (index.prices-test.html) is invisible to the other tree's server
// (sprint-08 Track H, sprint-09 Track C). So the server is now identified three ways, in
// order of strength:
//
//   1. Ask it. dev-server.mjs answers /__served-tree with the absolute path of the
//      directory it serves. Same tree → done; different tree → fail naming both roots.
//   2. Older servers (without that route) answer it with index.html. For those, write a
//      nonce file into THIS tree and fetch it back: only a server rooted here can return
//      it. That is decisive for identity even when every tracked file matches.
//   3. If the probe does not come back, the server is foreign — byte-compare a broad set
//      (index.html, every scripts/*.mjs, every root *.html, every MAPS/*.html, plus any
//      caller-nominated paths) so the error can NAME what differs, or say explicitly that
//      the trees are twins at the same commit.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex').slice(0, 16);

// Case-insensitive on win32 — two spellings of one worktree path must not read as foreign.
const normRoot = (p) => {
  let r = path.resolve(p);
  try { r = fs.realpathSync(r); } catch { /* keep the resolved form */ }
  return process.platform === 'win32' ? r.toLowerCase() : r;
};

const fetchBuf = async (base, rel, what) => {
  try {
    const res = await fetch(new URL(rel.replace(/\\/g, '/'), base));
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return Buffer.from(await res.arrayBuffer());
  } catch (e) {
    throw new Error(
      'Cannot verify the server at ' + base + ' (fetching ' + rel + '): ' + e.message + '\n' +
      what + ' refuses to run against a server it cannot identify.');
  }
};

// The default comparison set for naming what differs when the server is foreign: broad
// enough that a change ANYWHERE the tests can observe shows up. Only files that exist here
// are listed; a file that exists here but not in the foreign tree comes back as its
// index.html (old SPA fallback) or a 404 (2026-07-31 servers) and mismatches loudly.
const defaultPaths = (rootDir) => {
  const out = ['index.html'];
  const add = (dir, re) => {
    const abs = path.join(rootDir, dir);
    if (!fs.existsSync(abs)) return;
    for (const f of fs.readdirSync(abs).sort()) {
      if (re.test(f)) out.push(dir ? dir + '/' + f : f);
    }
  };
  add('scripts', /\.mjs$/);
  add('MAPS', /\.html$/i);
  add('', /\.html$/i);
  return out.filter((p, i) => out.indexOf(p) === i); // index.html listed once
};

const HOWTO = (base) =>
  'dev-server.mjs serves the directory of the script, so a server started from another\n' +
  'worktree or from main answers here and produces results for the WRONG code.\n' +
  'A baseline capture in that state reports "identical" and means nothing.\n\n' +
  'Find it with:  netstat -ano | findstr :' + (new URL(base).port || 80) + '\n' +
  'Then stop that server, or start this tree\'s own on a free port\n' +
  '(e.g. PORT=3838 node dev-server.mjs) and point the run at it —\n' +
  '`npm test` reroutes to a free port automatically.';

/**
 * Throws unless `base` serves this working tree (`rootDir`).
 * Call before any capture or suite that reuses a server it did not start.
 * `extraPaths` (repo-relative) are byte-compared in addition to the default set when a
 * foreign server has to be described — nominate the files your change actually touched.
 */
export async function assertServesThisTree(base, rootDir, what = 'this run', extraPaths = []) {
  // 1. The server can simply tell us which directory it serves.
  const idBuf = await fetchBuf(base, '__served-tree', what);
  let id = null;
  try { id = JSON.parse(idBuf.toString('utf8')); } catch { /* old server: not the route */ }
  if (id && typeof id.servedTreeRoot === 'string') {
    if (normRoot(id.servedTreeRoot) === normRoot(rootDir)) return;
    throw new Error(
      'The server on ' + base + ' is NOT serving this working tree.\n\n' +
      '  it serves : ' + id.servedTreeRoot + '\n' +
      '  this tree : ' + path.resolve(rootDir) + '\n\n' + HOWTO(base));
  }

  // 2. Old server without the identity route — the nonce probe is decisive: only a server
  //    rooted HERE can return a file that exists only here, whatever the commit says.
  const nonce = crypto.randomBytes(16).toString('hex');
  const probeName = 'bw-served-tree-probe-' + nonce + '.txt';
  const probePath = path.join(rootDir, probeName);
  fs.writeFileSync(probePath, nonce);
  try {
    const res = await fetch(new URL(probeName, base), { cache: 'no-store' });
    const body = res.ok ? (await res.text()).trim() : null;
    if (body === nonce) return;
  } catch (e) {
    throw new Error(
      'Cannot verify the server at ' + base + ' (fetching ' + probeName + '): ' + e.message + '\n' +
      what + ' refuses to run against a server it cannot identify.');
  } finally {
    fs.rmSync(probePath, { force: true });
  }

  // 3. The probe did not come back, so the server is foreign. Byte-compare a broad set so
  //    the error names what differs — or says the trees are twins.
  const paths = defaultPaths(rootDir).concat(extraPaths)
    .filter((p, i, a) => a.indexOf(p) === i);
  const bad = [];
  for (const rel of paths) {
    const localPath = path.join(rootDir, rel);
    let local;
    try { local = fs.readFileSync(localPath); } catch (e) {
      throw new Error(what + ': nominated path does not exist on disk: ' + localPath);
    }
    let served = null;
    try { served = await fetchBuf(base, rel, what); } catch (e) { /* 404 over there */ }
    if (!served || !served.equals(local)) {
      bad.push({ rel, served, local });
      if (bad.length >= 10) break; // enough to name the culprit; stop hammering the server
    }
  }

  const detail = bad.length
    ? bad.length + (bad.length >= 10 ? '+' : '') + ' of ' + paths.length +
      ' compared files differ from disk:\n\n' +
      bad.map((b) =>
        '  ' + b.rel + '\n' +
        '    served : ' + (b.served ? b.served.length + ' bytes, sha ' + sha(b.served) : 'not served (404)') + '\n' +
        '    on disk: ' + b.local.length + ' bytes, sha ' + sha(b.local)).join('\n')
    : 'all ' + paths.length + ' compared files are byte-identical — the trees are twins ' +
      '(same commit), but a probe file written into this tree did not come back over HTTP, ' +
      'so anything ' + what + ' writes here is invisible to that server.';

  throw new Error(
    'The server on ' + base + ' is NOT serving this working tree.\n' +
    'It does not answer the /__served-tree identity route (older dev-server.mjs), it did ' +
    'not return this tree\'s probe file, and ' + detail + '\n\n' + HOWTO(base));
}
