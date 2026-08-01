// Guard against the phantom-result failure this repo hit on 2026-07-26 — twice, in both
// directions, from two different sessions.
//
// `dev-server.mjs` serves the directory of the SCRIPT, not the caller's cwd. With several
// worktrees on one machine — a track's, another session's, and main — whichever server got to
// port 3737 first answers for everybody. Both directions are bad and one of them is silent:
//
//   loud   : a track's tests run against unpatched code and fail for no visible reason.
//   SILENT : a baseline capture reads MAIN and reports "14/14 identical" — which is
//            trivially true there, and looks exactly like a clean pass.
//
// Asking whether *something* answers on 3737 catches neither. Asking whether it returns
// byte-for-byte what is on disk here catches a tree at a DIFFERENT commit — but two trees
// at the SAME commit serve identical index.html, so the byte compare alone passed while
// files written into this tree were invisible to the server (sprint-08 Track H and
// sprint-09 Track C both hit this). The nonce probe below closes that: a random file is
// written into this tree and must come back over HTTP, which only this tree's server can do.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex').slice(0, 16);

/**
 * Throws unless `base` serves the same index.html that sits in `rootDir`.
 * Call before any capture or suite that reuses a server it did not start.
 */
export async function assertServesThisTree(base, rootDir, what = 'this run') {
  const localPath = path.join(rootDir, 'index.html');
  const local = fs.readFileSync(localPath);

  let served;
  try {
    const res = await fetch(new URL('index.html', base));
    if (!res.ok) throw new Error('HTTP ' + res.status);
    served = Buffer.from(await res.arrayBuffer());
  } catch (e) {
    throw new Error(
      'Cannot verify the server at ' + base + ': ' + e.message + '\n' +
      what + ' refuses to run against a server it cannot identify.');
  }

  if (served.equals(local)) {
    // Byte-identical index.html is NOT proof: two worktrees at the same commit serve
    // identical index.html, and sprint-08/09 both lost time to exactly that blind spot.
    // A nonce file written into THIS tree and read back over HTTP is proof.
    const nonce = crypto.randomBytes(16).toString('hex');
    const probeName = 'bw-served-tree-probe-' + nonce + '.txt';
    const probePath = path.join(rootDir, probeName);
    fs.writeFileSync(probePath, nonce);
    try {
      const res = await fetch(new URL(probeName, base), { cache: 'no-store' });
      const body = res.ok ? (await res.text()).trim() : null;
      if (body === nonce) return;
    } finally {
      fs.rmSync(probePath, { force: true });
    }
    throw new Error(
      'The server on ' + base + ' serves an index.html byte-identical to this tree\'s, ' +
      'but it is NOT rooted here: a probe file written to ' + rootDir + ' did not come ' +
      'back over HTTP.\n' +
      'That happens when two worktrees sit at the same commit and another tree\'s ' +
      'dev-server owns the port. Any file ' + what + ' writes into this tree ' +
      '(index.prices-test.html, captures) would be invisible to that server.\n\n' +
      'Find it with:  netstat -ano | findstr :3737\n' +
      'Then stop that server, or start this tree\'s own on a free port\n' +
      '(PORT=3838 node dev-server.mjs) and point the run at it.');
  }

  throw new Error(
    'The server on ' + base + ' is NOT serving this working tree.\n\n' +
    '  served : ' + served.length + ' bytes, sha ' + sha(served) + '\n' +
    '  on disk: ' + local.length + ' bytes, sha ' + sha(local) + '  (' + localPath + ')\n\n' +
    'dev-server.mjs serves the directory of the script, so a server started from another\n' +
    'worktree or from main answers here and produces results for the WRONG code.\n' +
    'A baseline capture in that state reports "identical" and means nothing.\n\n' +
    'Find it with:  netstat -ano | findstr :3737\n' +
    'Then stop that server, or start this tree\'s own on a free port\n' +
    '(PORT=3838 node dev-server.mjs) and point the run at it with BASELINE_BASE.');
}
