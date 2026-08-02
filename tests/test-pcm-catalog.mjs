// pcm-design-catalog.html — the PCM flat-marker design catalog.
//
// The checks live in scripts/verify_pcm_catalog.mjs so the same gate can be run on its
// own against a page under construction; this suite is how it reaches `npm test`.
// Nothing here writes anything, anywhere.
import { BASE } from './_base.mjs';
import { run } from '../scripts/verify_pcm_catalog.mjs';

let pass = 0, fail = 0;
const ck = (cond, msg) => {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg); }
};

await run(ck, BASE);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
