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
 *   3. any git add/commit/push that references wmp-cemetery-map/ — real burial PII,
 *      public repo, must never be committed.
 *
 * Exit 0 = allow. Exit 2 = block; stderr is shown back to Claude as the reason.
 * Anything unexpected -> exit 0 (fail-open) so the hook never wedges normal work.
 */

'use strict';

const fs = require('fs');
const path = require('path');

function allow() { process.exit(0); }
function block(msg) { process.stderr.write('[pre-git-guard] ' + msg + '\n'); process.exit(2); }

let raw = '';
try {
  raw = fs.readFileSync(0, 'utf8'); // stdin
} catch (e) {
  allow(); // no payload -> don't interfere
}

let cmd = '';
try {
  const payload = JSON.parse(raw);
  cmd = (payload && payload.tool_input && payload.tool_input.command) || '';
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

// --- Rule 3: anything touching wmp-cemetery-map/ ------------------------------------
if (new RegExp(GIT + '(add|commit|push)\\b', 'i').test(cmd) && /wmp-cemetery-map/i.test(cmd)) {
  block(
    'Refusing a git command that references wmp-cemetery-map/.\n' +
    'It holds real burial PII and the repo is public — it must stay untracked.'
  );
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
