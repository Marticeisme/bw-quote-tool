#!/usr/bin/env node
/*
 * pre-git-guard.js — PreToolUse hook enforcing this repo's CLAUDE.md non-negotiables
 * as hard gates instead of prose the model is merely asked to follow.
 *
 * Registered in .claude/settings.json for the Bash and PowerShell tools. It reads the
 * pending shell command from stdin (Claude Code hook payload) and BLOCKS (exit 2) when:
 *
 *   1. `git push`   and index.html has a JS syntax error in any inline <script> block.
 *   4. `git push`   and a page this push would publish fails the repo's own verify
 *      scripts (scripts/verify_catalogs.mjs / verify_guides_page.mjs). Only the
 *      surfaces the push actually touches are checked. BW_SKIP_PAGE_VERIFY=1 skips it.
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
const { execFileSync, spawnSync } = require('child_process');

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
// Tested against the command with message text removed, for the same reason rule 3 is:
// a heredoc line that merely *describes* the rule ("git add -A rules still apply") sits
// right after a newline and is otherwise indistinguishable from an invocation. git never
// takes pathspecs from -m/--message or heredoc bodies, so stripping them cannot hide a
// real `git add -A`.
if (new RegExp(GIT + 'add\\b[^\\n;&|]*?(\\s-A\\b|\\s--all\\b|\\s\\.(?:\\s|$))', 'i')
    .test(withoutMessageText(cmd))) {
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

  // No index.html here (e.g. pushing from a different worktree) -> nothing to check.
  // Note: this must NOT exit, or later push rules would be silently skipped.
  let html = null;
  try {
    html = fs.readFileSync(indexPath, 'utf8');
  } catch (e) {
    html = null;
  }

  if (html !== null) {
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
}

// --- Rule 4: verify the pages a push would publish ----------------------------------
// GitHub Pages serves this repo, so a push is a deploy: a broken facet filter or a
// guides card pointing at a missing file is live for families immediately. Runs the
// repo's own verify scripts, but ONLY for the surfaces this push actually touches —
// an index.html-only push must not pay for a full catalog sweep.
//
// Escape hatch: BW_SKIP_PAGE_VERIFY=1 skips this rule (used by the hook's tests, and
// available when Playwright itself is the thing that is broken). It deliberately does
// NOT skip the PII or `git add -A` rules.
if (new RegExp(GIT + 'push\\b', 'i').test(cmd) && process.env.BW_SKIP_PAGE_VERIFY !== '1') {
  const root = repoRootOf(targetDir(cmd, baseCwd)) || process.cwd();

  const CATALOG_PAGES = [
    'metal-caskets.html', 'wood-caskets.html', 'urns-guide.html',
    'keepsake-urns-guide.html', 'cremation-containers-rental-caskets.html',
    'all-caskets.html',
  ];

  // Guides built on the photo-first card template (sprint-11 Track D). The rollout track
  // adds its guides both here and in scripts/verify_photo_first.mjs PAGES.
  const PHOTO_FIRST_PAGES = ['urn-placement-guide.html', 'cemetery-property-guide.html'];

  // What is this push about to publish? Prefer the configured upstream; fall back to
  // origin/main. If neither resolves we cannot tell, and per this hook's fail-open
  // design we say nothing rather than wedge the push.
  let changed = null;
  for (const range of ['@{upstream}..HEAD', 'origin/main..HEAD']) {
    try {
      changed = execFileSync('git', ['-C', root, 'diff', '--name-only', range],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
        .split('\n').map(s => s.trim()).filter(Boolean);
      break;
    } catch (e) {
      changed = null; // try the next range
    }
  }

  if (changed && changed.length) {
    const jobs = [];
    if (changed.some(f => CATALOG_PAGES.includes(f))) {
      jobs.push(['scripts/verify_catalogs.mjs', 'catalog pages']);
    }
    if (changed.includes('guides.html')) {
      jobs.push(['scripts/verify_guides_page.mjs', 'the guides hub']);
    }
    // The photo-first card template (sprint-11 Track D). Cheap — it reads the data
    // modules and the two pages, no browser — so it runs whenever either page moves.
    // What it catches is a price range that went stale because a niche sold, which is a
    // wrong figure in front of a family and is invisible to every other gate here.
    if (changed.some(f => PHOTO_FIRST_PAGES.includes(f))) {
      jobs.push(['scripts/verify_photo_first.mjs', 'the photo-first guides']);
    }

    for (const [script, what] of jobs) {
      if (!fs.existsSync(path.join(root, script))) continue; // not present -> nothing to run

      let r;
      try {
        r = spawnSync(process.execPath, [script], {
          cwd: root, encoding: 'utf8', timeout: 240000,
        });
      } catch (e) {
        continue; // could not spawn -> fail open
      }
      // Timed out, killed, or node/Playwright unavailable -> fail open. This gate is a
      // quality check, not the PII rule; it must never make pushing impossible.
      if (!r || r.error || r.status === null) continue;

      if (r.status !== 0) {
        const out = ((r.stdout || '') + (r.stderr || ''))
          .split('\n').filter(l => /FAIL|BAD|ISSUES|issues|errors:/.test(l)).slice(0, 12);
        block(
          'Blocking `git push`: ' + what + ' failed verification.\n' +
          out.map(l => '  ' + l.trim()).join('\n') + '\n' +
          'Run `node ' + script + '` to see the full report. This repo deploys to GitHub\n' +
          'Pages on push, so the breakage would be live for families immediately.'
        );
      }
    }
  }
}

allow();
