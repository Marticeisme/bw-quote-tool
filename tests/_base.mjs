// Single source of the base URL every suite drives. Suites used to hardcode
// http://localhost:3737/, so when another worktree's server owned 3737 there was no
// supported way to run on a free port — sprint-09 Track D had to rewrite 29 files
// temporarily. Now:
//
//     PORT=3747 npm test        # run-all starts dev-server.mjs on 3747 and the
//                               # suites follow, because both read the same variable
//     BW_BASE=http://...:3747/  # or point at an already-running server explicitly
//
// Not matched by run-all's /^test-.*\.mjs$/ filter, so this is never run as a suite.
export const PORT = parseInt(process.env.PORT, 10) || 3737;

const raw = process.env.BW_BASE || 'http://localhost:' + PORT + '/';
// Suites build URLs as BASE + 'index.html#...' — a missing trailing slash would silently
// change every path, so normalize it here.
export const BASE = raw.endsWith('/') ? raw : raw + '/';
