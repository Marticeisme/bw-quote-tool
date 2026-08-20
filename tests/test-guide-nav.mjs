// The guides sidebar (guide-nav.js), inside `npm test`. Since s25 the sidebar renders on
// guides.html and nowhere else, so this gate proves both halves of that: the hub gets the
// panel with its brand masthead, and every other in-scope page injects nothing at all
// while still serving its one script tag. The checks live in
// scripts/verify_guide_nav.mjs so the same gate runs standalone against a page under
// construction; this file is how it reaches the suite. Nothing here writes anything —
// no Firebase, no generated file, no PDF.
//
// The gate serves the CURRENT tree on its own free port (scripts/_print-server.mjs, which
// identity-checks /__served-tree) and calls assertServesThisTree() before its first
// assertion, so the port-3737 served-tree trap cannot reach it.
import { run } from '../scripts/verify_guide_nav.mjs';

let pass = 0, fail = 0;
const ck = (cond, msg) => {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg); }
};

await run(ck);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
