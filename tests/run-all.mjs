// Runs the whole verification suite. From the repo root: `npm test`
//
// Starts dev-server.mjs on 3737 if nothing is listening, and stops it again afterwards
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
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const PORT = 3737;
const URL_ = 'http://localhost:' + PORT + '/';

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

const up = async () => {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 1500);
    await fetch(URL_, { signal: c.signal });
    clearTimeout(t);
    return true;
  } catch { return false; }
};

// A listener on 3737 is not proof it is OUR listener. Martice runs parallel sessions, and a
// dev-server started from another worktree serves THAT tree's index.html on the same port —
// so the whole suite silently tests someone else's file and reports green. Reuse a server
// only if the bytes it serves at / are this tree's index.html, to the byte.
const servesThisTree = async () => {
  try {
    const body = Buffer.from(await (await fetch(URL_)).arrayBuffer());
    return body.equals(fs.readFileSync(path.join(ROOT, 'index.html')));
  } catch { return false; }
};

let server = null;
if (await up()) {
  if (!(await servesThisTree())) {
    console.error('Something else is already listening on ' + PORT + ', and it is not serving\n' +
      'this working tree\'s index.html. That is almost certainly a dev-server from another\n' +
      'worktree or a parallel session. Reusing it would test the wrong file and report green.\n\n' +
      'Find it with:  netstat -ano | findstr :' + PORT + '\n' +
      'Then stop that server, or run this suite once the other session is finished.');
    process.exit(2);
  }
  console.log('dev-server already listening on ' + PORT + ' (reusing, verified)\n');
} else {
  server = spawn(process.execPath, ['dev-server.mjs'], { cwd: ROOT, stdio: 'ignore' });
  const started = Date.now();
  while (!(await up())) {
    if (Date.now() - started > 20000) {
      console.error('dev-server did not come up on ' + PORT);
      server.kill();
      process.exit(2);
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log('started dev-server on ' + PORT + '\n');
}

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
