// Runs the whole verification suite. From the repo root: `npm test`
//
// Starts dev-server.mjs on $PORT (default 3737) if nothing is listening — or on a free
// port when 3737 is owned by another tree's server — and stops it again afterwards
// (a zombie dev server from an earlier run produces phantom results, so this never
// reuses a server it cannot account for — it only reuses one that already answers).
//
// Every suite drives the real index.html in headless Chromium against tests/fake-firebase.js,
// an in-memory stub. Production Firebase is never contacted: each suite aborts the
// gstatic firebasejs request and installs the stub via addInitScript.
//
// A suite counts as passing ONLY if it exits 0 AND prints "N passed, M failed" with M = 0.
// Anything else fails loudly. An earlier version treated "no assertion output" as a
// harmless diagnostic — in a worktree without node_modules every suite crashed, printed
// nothing, and the run reported green. Silence is now a failure, not a pass.
import { spawn } from 'child_process';
import { assertServesThisTree } from '../scripts/served-tree-check.mjs';
import fs from 'fs';
import net from 'net';
import path from 'path';

const ROOT = process.cwd();
let PORT = parseInt(process.env.PORT, 10) || 3737;
const urlFor = (p) => 'http://localhost:' + p + '/';

// An OS-assigned free port, for when 3737 is owned by another tree's server.
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer();
  s.on('error', reject);
  s.listen(0, () => { const p = s.address().port; s.close(() => resolve(p)); });
});

// Scripts that legitimately print values instead of asserting. Explicit allowlist:
// a suite that merely *stops* producing assertions must never quietly land here.
const DIAGNOSTICS = new Set(['test-price-vintage.mjs']);

if (!fs.existsSync(path.join(ROOT, 'index.html'))) {
  console.error('Run from the repo root (index.html not found here).');
  process.exit(2);
}
if (!fs.existsSync(path.join(ROOT, 'node_modules', 'playwright'))) {
  console.error('playwright is not installed here.\n' +
    'Every suite drives a real browser, so this tree needs its own dependencies:\n\n' +
    '    npm install\n\n' +
    'In a git worktree node_modules is not checked out (it is gitignored), and ESM\n' +
    'resolves imports from the script\'s own path — not the working directory — so the\n' +
    'main repo\'s copy will not be found.\n\n' +
    'Faster than a full install, on Windows, point the worktree at the main copy:\n\n' +
    '    New-Item -ItemType Junction -Path "<worktree>\\node_modules" `\n' +
    '             -Target "<main repo>\\node_modules"\n\n' +
    'Remove that junction with [System.IO.Directory]::Delete(path, $false) before\n' +
    'deleting the worktree — a recursive delete can follow it into the real node_modules.');
  process.exit(2);
}

const up = async (p) => {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 1500);
    await fetch(urlFor(p), { signal: c.signal });
    clearTimeout(t);
    return true;
  } catch { return false; }
};

let server = null;
const startOwn = async (p) => {
  server = spawn(process.execPath, ['dev-server.mjs'],
    { cwd: ROOT, stdio: 'ignore', env: { ...process.env, PORT: String(p) } });
  const started = Date.now();
  while (!(await up(p))) {
    if (Date.now() - started > 20000) {
      console.error('dev-server did not come up on ' + p);
      server.kill();
      process.exit(2);
    }
    await new Promise((r) => setTimeout(r, 300));
  }
};

if (await up(PORT)) {
  // Reusing a server we did not start is only safe if it serves THIS tree. dev-server.mjs
  // serves the directory of the SCRIPT, so a server from another worktree answers here and
  // the suite silently tests the wrong code. Hit on 2026-07-26, in both directions — and
  // again on 2026-07-30/31 from worktrees at the SAME commit, where index.html bytes match
  // but files this tree writes (index.prices-test.html) are invisible to the other server.
  // When the check fails, don't die: this tree gets its own server on a free port.
  try {
    await assertServesThisTree(urlFor(PORT), ROOT, 'npm test');
    console.log('dev-server already listening on ' + PORT + ' (reusing, verified as this tree)\n');
  } catch (e) {
    console.log('the server on ' + PORT + ' is not this tree\'s — starting our own.\n(' +
      String(e.message).split('\n')[0] + ')\n');
    PORT = await freePort();
    await startOwn(PORT);
    console.log('started this tree\'s dev-server on ' + PORT + '\n');
  }
} else {
  await startOwn(PORT);
  console.log('started dev-server on ' + PORT + '\n');
}

// Every suite reads the port from the environment (default 3737), so the whole run —
// including one rerouted to a free port above — drives one known-good server.
process.env.PORT = String(PORT);

const files = fs.readdirSync(path.join(ROOT, 'tests'))
  .filter((f) => /^test-.*\.mjs$/.test(f)).sort();

const run = (f) => new Promise((resolve) => {
  const p = spawn(process.execPath, ['tests/' + f], { cwd: ROOT });
  let out = '';
  p.stdout.on('data', (d) => (out += d));
  p.stderr.on('data', (d) => (out += d));
  p.on('close', (code) => resolve({ out, code }));
});

let pass = 0, fail = 0;
const failed = [], ran = [];

for (const f of files) {
  const { out, code } = await run(f);
  const m = out.match(/(\d+) passed, (\d+) failed/);
  const isDiag = DIAGNOSTICS.has(f);

  if (!m) {
    if (isDiag && code === 0) {
      console.log('  ---- ' + f.padEnd(30) + 'diagnostic (no assertions, exit 0)');
      continue;
    }
    // crashed, or an assertion suite that printed nothing — never a pass
    failed.push(f);
    console.log('  FAIL  ' + f.padEnd(30) +
      (code === 0 ? 'no assertion output' : 'exited ' + code));
    console.log(out.trim().split('\n').slice(-4).map((l) => '        ' + l).join('\n'));
    continue;
  }

  const p = +m[1], q = +m[2];
  pass += p; fail += q; ran.push(f);
  const bad = q > 0 || code !== 0;
  if (bad) {
    failed.push(f);
    console.log(out.split('\n').filter((l) => /FAIL/.test(l)).join('\n'));
  }
  console.log('  ' + (bad ? 'FAIL' : ' ok ') + '  ' + f.padEnd(30) +
    p + ' passed, ' + q + ' failed' + (code !== 0 ? ' (exit ' + code + ')' : ''));
}

console.log('\n' + pass + ' passed, ' + fail + ' failed across ' + ran.length + ' suites');
if (failed.length) console.log('FAILING: ' + failed.join(', '));

if (server) { server.kill(); console.log('stopped dev-server'); }
process.exit(fail || failed.length ? 1 : 0);
