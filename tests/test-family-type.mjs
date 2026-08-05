// The family-PDF lock-in, inside `npm test`. The checks live in
// scripts/verify_family_type.mjs so the same gate runs standalone against a page under
// construction; this file is how it reaches the suite. Nothing here writes anything.
//
// The gate serves the CURRENT tree on its own free port (scripts/_print-server.mjs, which
// also identity-checks /__served-tree), so the port-3737 served-tree trap cannot reach it.
import { run } from '../scripts/verify_family_type.mjs';

let pass = 0, fail = 0;
const ck = (cond, msg) => {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg); }
};

await run(ck);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
