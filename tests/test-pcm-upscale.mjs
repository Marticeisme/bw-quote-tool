// pcm-design-images/ — the 699 AI super-resolved PCM design plates.
//
// The checks live in scripts/verify_pcm_upscale.mjs so the same gate can be run on its own
// against a work-in-progress tree; this suite is how it reaches `npm test`. It compares the
// committed data/pcm-upscale-manifest.json against the files on disk — no browser, no
// server, and above all no GPU: the Real-ESRGAN run is not repeatable in CI and must not
// have to be. Nothing here writes anything, anywhere.
//
// It also owns one check the shared gate cannot own: that the gate STILL CARRIES the
// photo-mask registry and still tests it in both directions. Deleting those lines from
// verify_pcm_upscale.mjs would otherwise be silent — every remaining assertion would pass
// and the suite total would just be smaller, which is exactly how a mask quietly stops
// being enforced. The counts and the source probe below make that deletion fail here.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run, EXPECT_PHOTO_MASKED, EXPECT_RESAMPLE } from '../scripts/verify_pcm_upscale.mjs';

let pass = 0, fail = 0;
const ck = (cond, msg) => {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg); }
};

await run(ck);

// ---- the gate still enforces the mask, in both directions -----------------------------
const GATE = path.join(path.dirname(fileURLToPath(import.meta.url)),
                       '..', 'scripts', 'verify_pcm_upscale.mjs');
const src = readFileSync(GATE, 'utf8');
// CRLF in this repo: any needle spanning lines has to tolerate \r.
const spans = (a, b) => new RegExp(a + '[\\s\\S]{0,400}?' + b).test(src);

ck(EXPECT_PHOTO_MASKED instanceof Set && EXPECT_PHOTO_MASKED.size === 84,
  `the gate exports the 84-plate photo-mask registry (got ${EXPECT_PHOTO_MASKED?.size})`);
ck([...EXPECT_PHOTO_MASKED].every((k) => /^(2020|2011)\/\d+$/.test(k)),
  'every registry key is a book/number the plates directory can hold');
ck([...EXPECT_PHOTO_MASKED].every((k) => !EXPECT_RESAMPLE.has(k) || k.startsWith('2020/')),
  'the mask registry and the fallback registry describe the same plate namespace');
ck(spans('EXPECT_PHOTO_MASKED\\]\\.filter', '!gotMasked\\.has'),
  'the gate still fails a listed plate whose photograph came back (masked-set direction)');
ck(spans('gotMasked\\]\\.filter', '!EXPECT_PHOTO_MASKED\\.has'),
  'the gate still fails an unlisted plate that got masked (registry direction)');
ck(/maskReason[\s\S]{0,200}?length >= 8/.test(src),
  'the gate still requires a reason on every masked plate');

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
