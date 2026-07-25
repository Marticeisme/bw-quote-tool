#!/usr/bin/env node
/*
 * pre-git-guard.test.js — regression tests for pre-git-guard.js
 *
 *   node .claude/hooks/pre-git-guard.test.js     (exit 0 = all pass, 1 = failure)
 *
 * WHY THIS EXISTS: that hook is the last line of defence keeping real burial PII
 * out of a PUBLIC repo, and it is regex-driven, which makes it easy to break in
 * both directions. Tightening it once already produced two false-positive classes
 * in a single afternoon (2026-07-24): it blocked wmp-cemetery-map's own local-only
 * repo, and then it blocked a commit whose *message* merely described the rule.
 * Both were caught here rather than in anger.
 *
 * When changing the hook, add the case you had in mind FIRST, watch it fail, then
 * fix the hook. And if a case fails after a change, check whether the assertion or
 * the hook is the wrong one — the fail-closed case below was originally asserted
 * wrongly, and "fixing" the hook to satisfy it would have been the wrong move.
 */
'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const fwd = p => p.replace(/\\/g, '/');
const toMsys = p => {
  const m = /^([A-Za-z]):[\\/](.*)$/.exec(p);
  return m ? '/' + m[1].toLowerCase() + '/' + fwd(m[2]) : fwd(p);
};

const HOOK = path.join(__dirname, 'pre-git-guard.js');
const PARENT = fwd(path.resolve(__dirname, '..', '..')); // repo root: .claude/hooks -> ../..
const MAP = fwd(path.join(PARENT, 'wmp-cemetery-map'));
const MAPMSYS = toMsys(MAP);

// Cases that assert the map's OWN repo is allowed only make sense once that repo
// exists; without it, git walks up and finds the parent repo instead.
const MAP_REPO = fs.existsSync(path.join(MAP, '.git'));

const BLOCK = 2, ALLOW = 0;

function run(command, cwd, needs) {
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ cwd, tool_input: { command } }),
    encoding: 'utf8',
    // Rule 4 shells out to Playwright over every catalog. Tests must stay fast and must
    // not depend on what happens to be unpushed, so they use the documented escape hatch.
    env: needs === 'skip-verify'
      ? Object.assign({}, process.env, { BW_SKIP_PAGE_VERIFY: '1' })
      : process.env,
  });
  return { code: r.status, err: (r.stderr || '').trim() };
}

const cases = [
  // --- the real danger: map content entering the PUBLIC parent repo ---
  ['BLOCK', BLOCK, 'git add wmp-cemetery-map/index.html', PARENT],
  ['BLOCK', BLOCK, 'git add -f wmp-cemetery-map/data/garden18/positions.json', PARENT],
  ['BLOCK', BLOCK, 'git commit -m "map" wmp-cemetery-map/', PARENT],
  ['BLOCK', BLOCK, 'git push origin main wmp-cemetery-map', PARENT],
  ['BLOCK', BLOCK, 'cd scripts && git add ../wmp-cemetery-map/index.html', PARENT],
  ['BLOCK', BLOCK, 'git add -f wmp-cemetery-map/data/gardenLUG/positions.json', PARENT],

  // --- the map's OWN local-only repo may version its own contents ---
  ['ALLOW', ALLOW, 'cd ' + MAPMSYS + ' && git commit -m "update"', PARENT, 'map-repo'],
  ['ALLOW', ALLOW, 'cd ' + MAP + ' && git commit -m "wmp-cemetery-map update"', PARENT, 'map-repo'],
  ['ALLOW', ALLOW, 'git -C ' + MAPMSYS + ' commit -m "wmp-cemetery-map"', PARENT, 'map-repo'],
  ['ALLOW', ALLOW, 'git add data/garden18/positions.json', MAP],

  // --- fail CLOSED when the target repo cannot be resolved ---
  // Needs a real PATH argument. A bare -m message that mentions the map is NOT an
  // attempt to commit it and is correctly allowed — see the note in the header.
  ['BLOCK', BLOCK, 'cd /c/nonexistent-xyz && git add wmp-cemetery-map/index.html', PARENT],
  ['ALLOW', ALLOW, 'cd /c/nonexistent-xyz && git commit -m wmp-cemetery-map', PARENT],

  // --- commit MESSAGES may talk about the map ---
  ['ALLOW', ALLOW,
    'git commit -m "pre-git-guard: scope the wmp-cemetery-map rule" -- .claude/hooks/pre-git-guard.js',
    PARENT],
  ['ALLOW', ALLOW,
    "git commit -F - -- .claude/hooks/pre-git-guard.js <<'MSG'\nfix rule for wmp-cemetery-map\n\nit blocked wmp-cemetery-map wrongly\nMSG",
    PARENT],
  // ...but a real pathspec still blocks, even when the message also mentions it
  ['BLOCK', BLOCK, 'git commit -m "touching wmp-cemetery-map" -- wmp-cemetery-map/index.html', PARENT],

  // --- rule 2: never clobber the other session's in-flight edits ---
  ['BLOCK', BLOCK, 'git add -A', PARENT],
  ['BLOCK', BLOCK, 'git add .', PARENT],
  ['BLOCK', BLOCK, 'git add --all', PARENT],
  // ...but a commit MESSAGE may describe the rule. This is the same false-positive class
  // that already bit rule 3: a heredoc line reading "git add -A rules still apply" starts
  // right after a newline, so it looks exactly like an invocation.
  ['ALLOW', ALLOW,
    "git commit -F - -- .claude/hooks/pre-git-guard.js <<'MSG'\nhook: document the rules\n\nthe PII and\ngit add -A rules still apply\nMSG",
    PARENT],
  ['ALLOW', ALLOW, 'git commit -m "explain why git add -A is refused" -- README.md', PARENT],
  // a real invocation alongside such a message must still block
  ['BLOCK', BLOCK, 'git commit -m "mentions git add -A" -- x.txt && git add -A', PARENT],

  // --- rule 4: page verification on push ---
  // The blocking path runs Playwright over every catalog, so it is proved by fault
  // injection by hand (break a facet, watch the push block) rather than here — these
  // cases pin the plumbing: the escape hatch works, and a push must never be blocked
  // just because the verify scripts exist.
  ['ALLOW', ALLOW, 'git push origin main', PARENT, 'skip-verify'],
  ['ALLOW', ALLOW, 'git push', PARENT, 'skip-verify'],
  // a non-push git command must not trigger the page checks at all
  ['ALLOW', ALLOW, 'git commit -m "docs" -- docs/BRAND_AND_BUILD_LOG.md', PARENT],

  // --- ordinary work must stay unblocked ---
  ['ALLOW', ALLOW, 'git status', PARENT],
  ['ALLOW', ALLOW, 'git add index.html', PARENT],
  ['ALLOW', ALLOW, 'git log --oneline -5', PARENT],
  ['ALLOW', ALLOW, 'git diff --cached --name-only', PARENT],
  // a quoted mention is prose, not an invocation (the hook's own stated design)
  ['ALLOW', ALLOW, 'echo "git add -A is refused for wmp-cemetery-map"', PARENT],
];

let pass = 0, fail = 0, skip = 0;
for (const [label, want, command, cwd, needs] of cases) {
  if (needs === 'map-repo' && !MAP_REPO) {
    skip++;
    console.log('  skip ' + label.padEnd(6) + '(wmp-cemetery-map has no repo here)  ' + command.slice(0, 50));
    continue;
  }
  const { code, err } = run(command, cwd, needs);
  const ok = code === want;
  ok ? pass++ : fail++;
  const shown = command.replace(/\n/g, '\\n');
  console.log(
    (ok ? '  ok   ' : '  FAIL ') + label.padEnd(6) + 'exit=' + code + '  ' +
    (shown.length > 62 ? shown.slice(0, 59) + '...' : shown) +
    (ok ? '' : '\n         expected ' + want + '   stderr: ' + err.replace(/\n/g, ' | '))
  );
}

console.log('\n  ' + pass + ' passed, ' + fail + ' failed' + (skip ? ', ' + skip + ' skipped' : ''));
process.exit(fail ? 1 : 0);
