// pcm-design-images/ — the 699 AI super-resolved PCM design plates.
//
// The checks live in scripts/verify_pcm_upscale.mjs so the same gate can be run on its own
// against a work-in-progress tree; this suite is how it reaches `npm test`. It compares the
// committed data/pcm-upscale-manifest.json against the files on disk — no browser, no
// server, and above all no GPU: the Real-ESRGAN run is not repeatable in CI and must not
// have to be. Nothing here writes anything, anywhere.
import { run } from '../scripts/verify_pcm_upscale.mjs';

let pass = 0, fail = 0;
const ck = (cond, msg) => {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg); }
};

await run(ck);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
