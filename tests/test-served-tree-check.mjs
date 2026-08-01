// Regression suite for scripts/served-tree-check.mjs — the guard that stops a run from
// silently using another worktree's dev-server.
//
// The scenario that burned sprint-09 Track D on 2026-07-31: two trees with IDENTICAL
// index.html but a different scripts/*.mjs. The old single-file check blessed the wrong
// server and the suite went red for invisible reasons. This suite builds exactly that
// fixture in temp and proves the checker now fails loudly, in both server generations:
//
//   · new dev-server (has /__served-tree): foreign tree rejected by root identity
//   · old-style server (no identity route, SPA fallback): foreign tree rejected — the
//     nonce probe proves it foreign, and the byte-compare names the mismatching file
//   · old-style server on a byte-identical TWIN tree (the same-commit trap that burned
//     sprint-08 Track H and sprint-09 Track C): rejected by the nonce probe alone
//   · this tree's own server: accepted, both generations
//
// No browser, no Firebase, no writes inside the repo — the fixture lives in the OS temp dir.
import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { assertServesThisTree } from '../scripts/served-tree-check.mjs';

const ROOT = process.cwd();
let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + String(x).split('\n')[0] : '')); }
};

const freePort = () => new Promise((res) => {
  const s = http.createServer().listen(0, () => {
    const p = s.address().port; s.close(() => res(p));
  });
});
const up = async (base) => {
  for (let i = 0; i < 60; i++) {
    try { await fetch(base); return; } catch { await new Promise((r) => setTimeout(r, 250)); }
  }
  throw new Error('server never came up at ' + base);
};

// ---- fixture: a foreign tree whose observable files all match this one, except ONE ----
const FIX = fs.mkdtempSync(path.join(os.tmpdir(), 'bw-served-tree-'));
const copyRel = (rel) => {
  const dst = path.join(FIX, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(path.join(ROOT, rel), dst);
};
copyRel('index.html');
copyRel('dev-server.mjs');
for (const dir of ['scripts', 'MAPS']) {
  for (const f of fs.readdirSync(path.join(ROOT, dir))) {
    if (/\.(mjs|html)$/i.test(f)) copyRel(dir + '/' + f);
  }
}
for (const f of fs.readdirSync(ROOT)) {
  if (/\.html$/i.test(f) && f !== 'index.html') copyRel(f);
}
const MUTATED = 'scripts/gomn-niche-data.mjs';
fs.appendFileSync(path.join(FIX, MUTATED), '\r\n// foreign-tree marker\r\n');

// ---- second fixture: a TWIN — every observable file byte-identical (same-commit case) ----
// This is the form that burned sprint-08 Track H and sprint-09 Track C: two worktrees at
// one commit, nothing to byte-compare apart, yet files a suite writes into its own tree
// are invisible to the other tree's server. Only the nonce probe can catch it.
const TWIN = fs.mkdtempSync(path.join(os.tmpdir(), 'bw-served-twin-'));
const copyTwin = (rel) => {
  const dst = path.join(TWIN, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(path.join(ROOT, rel), dst);
};
copyTwin('index.html');
for (const dir of ['scripts', 'MAPS']) {
  for (const f of fs.readdirSync(path.join(ROOT, dir))) {
    if (/\.(mjs|html)$/i.test(f)) copyTwin(dir + '/' + f);
  }
}
for (const f of fs.readdirSync(ROOT)) {
  if (/\.html$/i.test(f) && f !== 'index.html') copyTwin(f);
}

// Old-generation server: serves a directory with SPA fallback, NO /__served-tree route —
// the behavior of every dev-server.mjs older than 2026-07-31.
const oldServer = (root, port) => new Promise((res) => {
  const s = http.createServer((req, rsp) => {
    let fp = path.join(root, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
    if (!fs.existsSync(fp)) fp = path.join(root, 'index.html');
    try { rsp.writeHead(200); rsp.end(fs.readFileSync(fp)); }
    catch { rsp.writeHead(404); rsp.end('not found'); }
  });
  s.listen(port, () => res(s));
});

const throws = async (base, root) => {
  try { await assertServesThisTree(base, root, 'test'); return null; }
  catch (e) { return e.message; }
};

const procs = [], servers = [];
try {
  // 1 + 2: the real (new) dev-server, serving this tree and the foreign tree
  const [pMine, pForeign, pOld, pOldMine] =
    [await freePort(), await freePort(), await freePort(), await freePort()];
  for (const [cwd, port] of [[ROOT, pMine], [FIX, pForeign]]) {
    procs.push(spawn(process.execPath, ['dev-server.mjs'],
      { cwd, stdio: 'ignore', env: { ...process.env, PORT: String(port) } }));
    await up('http://localhost:' + port + '/');
  }

  ok('new server, own tree: accepted',
    (await throws('http://localhost:' + pMine + '/', ROOT)) === null);

  const eForeign = await throws('http://localhost:' + pForeign + '/', ROOT);
  ok('new server, foreign tree: rejected', eForeign !== null);
  ok('  …by root identity, naming both roots',
    eForeign !== null && eForeign.includes('it serves') && eForeign.includes(FIX), eForeign);

  // 3 + 4: old-generation server (no identity route) — the Track D blind spot
  servers.push(await oldServer(FIX, pOld));
  const eOld = await throws('http://localhost:' + pOld + '/', ROOT);
  ok('old server, foreign tree with IDENTICAL index.html: rejected', eOld !== null);
  ok('  …and the error names the mismatching file',
    eOld !== null && eOld.includes(MUTATED), eOld);

  servers.push(await oldServer(ROOT, pOldMine));
  ok('old server, own tree: accepted',
    (await throws('http://localhost:' + pOldMine + '/', ROOT)) === null);

  // 5: old server on a TWIN tree — byte-identical everywhere, still foreign. The probe is
  // the only thing that can see it (the Track H / Track C same-commit trap).
  const pTwin = await freePort();
  servers.push(await oldServer(TWIN, pTwin));
  const eTwin = await throws('http://localhost:' + pTwin + '/', ROOT);
  ok('old server, byte-identical TWIN tree: rejected', eTwin !== null);
  ok('  …and the error says the probe file did not come back',
    eTwin !== null && /probe file/.test(eTwin) && /twins|identical/.test(eTwin), eTwin);
} finally {
  // Wait for the spawned servers to actually exit — on Windows a just-killed process still
  // holds its cwd, and removing the fixture under it is EPERM until it lets go.
  await Promise.all(procs.map((p) => new Promise((r) => { p.once('exit', r); p.kill(); })));
  await Promise.all(servers.map((s) => new Promise((r) => s.close(r))));
  fs.rmSync(FIX, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  fs.rmSync(TWIN, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
