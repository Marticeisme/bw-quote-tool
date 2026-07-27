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
// byte-for-byte what is on disk here is what actually closes it.
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

  if (served.equals(local)) return;

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
