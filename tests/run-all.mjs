// Runs the whole verification suite. From the repo root: `npm test`
//
// Starts dev-server.mjs on 3737 if nothing is listening, and stops it again afterwards
// (a zombie dev server from an earlier run produces phantom results, so this never
// reuses a server it cannot account for — it only reuses one that already answers).
//
// Every suite drives the real index.html in headless Chromium against tests/fake-firebase.js,
// an in-memory stub. Production Firebase is never contacted: each suite aborts the
// gstatic firebasejs request and installs the stub via addInitScript.
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const PORT = 3737;
const URL_ = 'http://localhost:' + PORT + '/';

if (!fs.existsSync(path.join(ROOT, 'index.html'))) {
  console.error('Run from the repo root (index.html not found here).');
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

let server = null;
if (await up()) {
  console.log('dev-server already listening on ' + PORT + ' (reusing)\n');
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

let pass = 0, fail = 0, failed = [], diagnostics = [];

for (const f of files) {
  const { out, code } = await run(f);
  const m = out.match(/(\d+) passed, (\d+) failed/);
  if (!m) {
    // no assertions — a diagnostic script, not part of the verdict
    diagnostics.push(f);
    console.log('  ---- ' + f.padEnd(30) + 'diagnostic (no assertions)');
    continue;
  }
  const p = +m[1], q = +m[2];
  pass += p; fail += q;
  const bad = q > 0 || code !== 0;
  if (bad) { failed.push(f); console.log(out.split('\n').filter((l) => /FAIL/.test(l)).join('\n')); }
  console.log('  ' + (bad ? 'FAIL' : ' ok ') + '  ' + f.padEnd(30) + p + ' passed, ' + q + ' failed');
}

console.log('\n' + pass + ' passed, ' + fail + ' failed across ' + (files.length - diagnostics.length) + ' suites');
if (diagnostics.length) console.log('(' + diagnostics.length + ' diagnostic script not counted: ' + diagnostics.join(', ') + ')');
if (failed.length) console.log('failing: ' + failed.join(', '));

if (server) { server.kill(); console.log('stopped dev-server'); }
process.exit(fail || failed.length ? 1 : 0);
