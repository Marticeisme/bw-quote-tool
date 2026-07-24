#!/usr/bin/env node
/*
 * pre-git-guard.js — PreToolUse hook enforcing this repo's CLAUDE.md non-negotiables
 * as hard gates instead of prose the model is merely asked to follow.
 *
 * Registered in .claude/settings.json for the Bash and PowerShell tools. It reads the
 * pending shell command from stdin (Claude Code hook payload) and BLOCKS (exit 2) when:
 *
 *   1. `git push`   and index.html has a JS syntax error in any inline <script> block.
 *   2. `git add -A` / `git add .` / `git add --all` — clobbers the other session's
 *      in-flight edits (two sessions share this working tree).
 *   3. any git add/commit/push that would put wmp-cemetery-map/ into THIS (public) repo —
 *      real burial PII. Since 2026-07-24 that directory has its own local-only repo, so
 *      the rule resolves which repository the command actually targets and only blocks
 *      when the target is not that repo. Undeterminable target -> still blocked.
 *
 * Exit 0 = allow. Exit 2 = block; stderr is shown back to Claude as the reason.
 * Anything unexpected -> exit 0 (fail-open) so the hook never wedges normal work.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function allow() { process.exit(0); }
function block(msg) { process.stderr.write('[pre-git-guard] ' + msg + '\n'); process.exit(2); }

let raw = '';
try {
  raw = fs.readFileSync(0, 'utf8'); // stdin
} catch (e) {
  allow(); // no payload -> don't interfere
}

let cmd = '';
let baseCwd = process.cwd();
try {
  const payload = JSON.parse(raw);
  cmd = (payload && payload.tool_input && payload.tool_input.command) || '';
  if (payload && typeof payload.cwd === 'string' && payload.cwd) baseCwd = payload.cwd;
} catch (e) {
  allow();
}

if (!cmd || !/\bgit\b/i.test(cmd)) allow(); // only care about git commands

// A `git` verb only counts when it's actually being *invoked*: at the start of the
// command or right after a shell separator ( ; & | ( newline ). This keeps the guard
// from firing on commands that merely mention "git add -A" inside a quoted echo/grep
// argument or a doc string.
const GIT = '(?:^|[\\n;&|(])\\s*git\\s+';

// --- Rule 2: git add -A / . / --all -------------------------------------------------
if (new RegExp(GIT + 'add\\b[^\\n;&|]*?(\\s-A\\b|\\s--all\\b|\\s\\.(?:\\s|$))', 'i').test(cmd)) {
  block(
    'Refusing `git add -A` / `git add .` / `git add --all`.\n' +
    'Two sessions share this working tree — stage only the files you changed, by name.'
  );
}

// --- Rule 3: keep wmp-cemetery-map/ out of THIS repo --------------------------------
// The danger is that directory's real burial PII entering the PUBLIC bw-quote-tool
// history. Since 2026-07-24 it has its own local-only repo (no remote, pre-push hook),
// so committing it *there* is exactly right and must not be blocked. Decide by which
// repository the command actually targets, not by whether the text mentions the path.

// Git Bash hands us MSYS paths (/c/Users/...) that Node would resolve against the
// current drive (C:\c\Users\...). Convert to a real Windows path first.
function fromMsys(p) {
  const m = /^\/([a-zA-Z])(\/.*)?$/.exec(p);
  return m ? m[1].toUpperCase() + ':' + (m[2] || '\\').replace(/\//g, '\\') : p;
}
function unquote(s) {
  const m = /^"(.*)"$/.exec(s) || /^'(.*)'$/.exec(s);
  return m ? m[1] : s;
}

// Replay the command's `cd`s, then let an explicit `git -C <path>` win.
function targetDir(command, startDir) {
  let dir = startDir;
  const cdRe = /(?:^|[\n;&|(])\s*cd\s+("[^"]*"|'[^']*'|[^\s;&|]+)/gi;
  let m;
  while ((m = cdRe.exec(command))) {
    const t = unquote(m[1]);
    if (!t || t === '-' || t.startsWith('-')) continue;
    dir = path.resolve(dir, fromMsys(t));
  }
  const cm = /(?:^|[\n;&|(])\s*git\s+(?:[^\n;&|]*?\s)?-C\s+("[^"]*"|'[^']*'|[^\s;&|]+)/i.exec(command);
  if (cm) dir = path.resolve(dir, fromMsys(unquote(cm[1])));
  return dir;
}

function repoRootOf(dir) {
  try {
    return execFileSync('git', ['-C', dir, 'rev-parse', '--show-toplevel'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch (e) {
    return null; // not a repo, or git unavailable
  }
}

// The path check must look at ARGUMENTS, not prose. A commit message that merely
// talks about wmp-cemetery-map (like the one that introduced this rule) is not an
// attempt to commit it. Heredocs and -m/--message payloads are message text: git
// never takes pathspecs from them, so stripping them cannot hide a real path.
function withoutMessageText(c) {
  return c
    .replace(/<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1[\s\S]*?^\s*\2\s*$/gm, ' ')
    .replace(/(?:^|\s)(?:-m|--message)(?:=|\s+)("[^"]*"|'[^']*'|\S+)/g, ' ');
}

if (new RegExp(GIT + '(add|commit|push)\\b', 'i').test(cmd) &&
    /wmp-cemetery-map/i.test(withoutMessageText(cmd))) {
  const root = repoRootOf(targetDir(cmd, baseCwd));
  // Only the map's OWN repo may version its contents. If the target can't be resolved
  // we fail CLOSED and block, because guessing wrong here leaks PII to a public repo.
  const isOwnRepo = !!root && path.basename(root).toLowerCase() === 'wmp-cemetery-map';
  if (!isOwnRepo) {
    block(
      'Refusing a git command that would put wmp-cemetery-map/ into ' +
      (root ? path.basename(root) : 'an unresolved repo') + '.\n' +
      'It holds real burial PII and this repo is public — it must stay untracked here.\n' +
      'It has its own local-only repo; run the command from inside that directory.'
    );
  }
}

// --- Rule 1: syntax-check index.html before any push -------------------------------
if (new RegExp(GIT + 'push\\b', 'i').test(cmd)) {
  const repoRoot = process.cwd();
  const indexPath = path.join(repoRoot, 'index.html');

  let html;
  try {
    html = fs.readFileSync(indexPath, 'utf8');
  } catch (e) {
    // No index.html here (e.g. pushing from a different worktree). Nothing to check.
    allow();
  }

  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  let m, i = 0, bad = 0;
  const errors = [];
  while ((m = re.exec(html))) {
    i++;
    try {
      // eslint-disable-next-line no-new-func
      new Function(m[1]);
    } catch (err) {
      bad++;
      errors.push('  block #' + i + ': ' + err.message);
    }
  }

  if (bad > 0) {
    block(
      'Blocking `git push`: index.html has ' + bad + ' JS syntax error(s) in ' + i + ' inline script block(s).\n' +
      errors.join('\n') + '\n' +
      'One JS error breaks the tool for everyone. Fix it, then push.'
    );
  }
}

allow();
