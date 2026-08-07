// Gate for the PCM design-proof import (s21 Track A).
//
// Checks the two proof classes that ship as their own image directories:
//   pcm-companion-images/ + data/pcm-companion-proofs.json
//   pcm-single-images/    + data/pcm-single-proofs.json
//
// It asserts the things a re-run could silently break: the counts, that every manifest
// sha256 matches the bytes on disk, that no file exists in either directory that the
// manifest does not account for, that the 232 proofs shipped before this track are
// BYTE-IDENTICAL (pinned aggregate digest, so a re-encode under a different Pillow
// cannot slip through), and that a number recorded as held or unavailable has no image.
//
// Read-only. Run it twice; it must print the same thing.
//
//   node scripts/verify_pcm_proofs_import.mjs

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

let pass = 0;
const fails = [];
function ok(cond, label, detail = '') {
  if (cond) pass++;
  else fails.push(label + (detail ? ' -- ' + detail : ''));
}
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

// The 232 companion proofs as they stood at the s21 Track A base commit (902b36a6).
// Aggregate = sha256 over the sorted "<filename><sha256>" concatenation. Track A's whole
// precedence rule (the original source folder wins over "PCM COMPANION NEW") exists to
// keep this constant; if it moves, 230+ shipped files were silently re-encoded.
const COMPANION_PRETRACK_COUNT = 232;
const COMPANION_PRETRACK_AGG =
  'fee525ced70d58781be4277d07d1233e9bc48156d53a0dddd5dee6dfe8da72e6';

// Sources the operator's download saved as HTML "File Not Found" bodies under a .jpg
// name. No image exists locally; they are pending a re-download, not lost data.
const COMPANION_UNAVAILABLE = [2260, 2261, 2263, 2267, 2343, 2352, 2355];
const SINGLE_UNAVAILABLE = ['1348'];

// RELEASED by the operator, in-chat, 2026-08-07 (asked twice, the second time with the
// full census quoted at scale: "Ship everything"). Formerly the s17 HELD set; the gate
// now asserts the release posture with the same rigor the hold had: held list EMPTY,
// released list exactly these 12 with their original hold reasons preserved, and every
// one of them shipped on disk. See RELEASED in scripts/pcm_companion_import.py.
const COMPANION_RELEASED =
  [2500, 2501, 2503, 2504, 2506, 2508, 2509, 2510, 2514, 2515, 2516, 2529];

const COMPANION_EXPECTED = 247;   // 232 pre-track + 245, 258, 2538 + the 12 released
const SINGLE_EXPECTED = 372;      // 373 catalogued designs - 1 failed download

function checkClass(name, dir, manifestPath, expected, keyOf, optional = false) {
  const absDir = path.join(ROOT, dir);
  const absMan = path.join(ROOT, manifestPath);
  // (optional survived from the pre-release posture, when the singles class could be
  // legitimately absent. Since the operator's 2026-08-07 "Ship everything" both classes
  // are mandatory; no caller passes optional any more.)
  if (optional && !existsSync(absDir) && !existsSync(absMan)) {
    console.log(`  SKIP ${name}: not present in this tree (run scripts/pcm_single_import.py)`);
    return null;
  }
  ok(existsSync(absDir), `${name}: ${dir}/ exists`);
  ok(existsSync(absMan), `${name}: ${manifestPath} exists`);
  if (!existsSync(absDir) || !existsSync(absMan)) return null;

  const man = JSON.parse(readFileSync(absMan, 'utf8'));
  const onDisk = readdirSync(absDir).filter((f) => f.endsWith('.webp')).sort();

  ok(man.files.length === expected,
     `${name}: manifest lists ${expected} proofs`, `got ${man.files.length}`);
  ok(man.count === man.files.length,
     `${name}: manifest count matches its own files[]`,
     `count=${man.count} files=${man.files.length}`);
  ok(onDisk.length === expected,
     `${name}: ${expected} .webp on disk`, `got ${onDisk.length}`);

  // Every manifest entry: file present, sha256 matches the bytes, size matches.
  let shaBad = 0, missing = 0, byteBad = 0;
  for (const e of man.files) {
    const p = path.join(ROOT, e.img);
    if (!existsSync(p)) { missing++; continue; }
    if (sha(p) !== e.sha256) shaBad++;
    if (readFileSync(p).length !== e.bytes) byteBad++;
  }
  ok(missing === 0, `${name}: every manifest entry exists on disk`, `${missing} missing`);
  ok(shaBad === 0, `${name}: every manifest sha256 matches disk`, `${shaBad} mismatched`);
  ok(byteBad === 0, `${name}: every manifest byte count matches disk`, `${byteBad} off`);

  // Nothing on disk that the manifest does not account for, and nothing but .webp.
  const claimed = new Set(man.files.map((e) => path.basename(e.img)));
  const stray = onDisk.filter((f) => !claimed.has(f));
  ok(stray.length === 0, `${name}: no file outside the manifest`, stray.join(', '));
  const nonWebp = readdirSync(absDir).filter((f) => !f.endsWith('.webp'));
  ok(nonWebp.length === 0, `${name}: directory holds only .webp`, nonWebp.join(', '));

  // Deterministic ordering, and unique keys.
  const keys = man.files.map(keyOf);
  ok(new Set(keys).size === keys.length, `${name}: keys are unique`);

  return { man, keys: new Set(keys.map(String)) };
}

// ---------------------------------------------------------------- companions
const comp = checkClass('companions', 'pcm-companion-images',
                        'data/pcm-companion-proofs.json', COMPANION_EXPECTED,
                        (e) => e.num);

if (comp) {
  // The pre-track 232 must be byte-for-byte what they were. Recompute the aggregate over
  // exactly the entries whose output predates this track: everything except the three
  // new numbers and the 12 released (whose outputs are new encodes by definition).
  const NEW_THIS_TRACK = new Set([245, 258, 2538, ...COMPANION_RELEASED]);
  const pre = comp.man.files.filter((e) => !NEW_THIS_TRACK.has(e.num))
                           .map((e) => [path.basename(e.img), e.sha256])
                           .sort((a, b) => (a[0] < b[0] ? -1 : 1));
  ok(pre.length === COMPANION_PRETRACK_COUNT,
     `companions: ${COMPANION_PRETRACK_COUNT} proofs predate this track`,
     `got ${pre.length}`);
  const agg = createHash('sha256').update(pre.map(([f, h]) => f + h).join('')).digest('hex');
  ok(agg === COMPANION_PRETRACK_AGG,
     'companions: the 232 pre-track proofs are byte-identical',
     `aggregate ${agg} != ${COMPANION_PRETRACK_AGG}`);

  ok(NEW_THIS_TRACK.size === 15 && [...NEW_THIS_TRACK].every((n) => comp.keys.has(String(n))),
     'companions: 245, 258, 2538 and the 12 released all shipped');

  const held = (comp.man.held || []).map((h) => h.num);
  ok(held.length === 0,
     'companions: the held list is empty after the 2026-08-07 release', held.join(', '));
  const released = (comp.man.released || []).map((r) => r.num).sort((a, b) => a - b);
  ok(JSON.stringify(released) === JSON.stringify(COMPANION_RELEASED),
     'companions: the released list is exactly the 12 formerly-held numbers',
     released.join(', '));
  ok((comp.man.released || []).every((r) => r.originalHoldReason),
     'companions: every released entry preserves its original hold reason');
  const relMissing = COMPANION_RELEASED.filter((n) => !comp.keys.has(String(n)));
  ok(relMissing.length === 0,
     'companions: every released number shipped on disk', relMissing.join(', '));

  const un = (comp.man.unavailable || []).map((u) => u.num).sort((a, b) => a - b);
  ok(JSON.stringify(un) === JSON.stringify(COMPANION_UNAVAILABLE),
     'companions: the 7 corrupt sources are recorded as unavailable', un.join(', '));
  const unShipped = COMPANION_UNAVAILABLE.filter((n) => comp.keys.has(String(n)));
  ok(unShipped.length === 0,
     'companions: no unavailable number has an image on disk', unShipped.join(', '));
  ok((comp.man.unavailable || []).every((u) => u.reason && u.source),
     'companions: every unavailable entry records a reason and its source file');
}

// ------------------------------------------------------------------- singles
const sing = checkClass('singles', 'pcm-single-images',
                        'data/pcm-single-proofs.json', SINGLE_EXPECTED,
                        (e) => e.id);

if (sing) {
  // Keys are STRINGS: "1148" and "1148-2" are different designs, and parsing them as
  // integers collides them. Track C joins data/pcm-desc-singles.json on these stems.
  ok(sing.man.files.every((e) => typeof e.id === 'string'),
     'singles: every id is a string, not a parsed integer');
  ok(sing.man.files.every((e) => path.basename(e.img) === `${e.id}.webp`),
     'singles: every output is named <id>.webp');
  const twins = ['1148', '1148-2', '1353', '1353-2', '1528', '1528-2', '16521'];
  const missingTwins = twins.filter((t) => !sing.keys.has(t));
  ok(missingTwins.length === 0,
     'singles: the "-2" twins and the five-digit id all survive as separate designs',
     missingTwins.join(', '));

  // id and the true gallery design number disagree on 8 files; both must be recorded.
  ok(sing.man.files.every((e) => Number.isInteger(e.num) && typeof e.sourceUrl === 'string'),
     'singles: every entry carries its design number and its gallery URL');
  const mismatched = sing.man.files.filter((e) => e.id !== String(e.num)).length;
  // 117, 131, 1148, 1148-2, 1353, 1353-2, 1528-2, 16521.
  ok(mismatched === 8,
     'singles: 8 shipped entries have an id that differs from the served design number',
     `got ${mismatched}`);

  const un = (sing.man.unavailable || []).map((u) => String(u.id)).sort();
  ok(JSON.stringify(un) === JSON.stringify(SINGLE_UNAVAILABLE),
     'singles: PCM1348 is recorded as unavailable', un.join(', '));
  ok(SINGLE_UNAVAILABLE.every((id) => !sing.keys.has(id)),
     'singles: no unavailable id has an image on disk');
  ok(sing.man.catalogued === SINGLE_EXPECTED + SINGLE_UNAVAILABLE.length,
     'singles: catalogued = shipped + unavailable', String(sing.man.catalogued));
}

// -------------------------------------------------------- the two stay apart
// The s15 masking regime covers pcm-design-images/ only; a proof must never land there
// and a plate must never land in a proof directory.
for (const [a, b] of [['pcm-design-images', 'pcm-companion-images'],
                      ['pcm-design-images', 'pcm-single-images']]) {
  const da = path.join(ROOT, a), db = path.join(ROOT, b);
  if (!existsSync(da) || !existsSync(db)) continue;
  const inA = new Set(readdirSync(da));
  const overlap = readdirSync(db).filter((f) => inA.has(f));
  ok(overlap.length === 0, `${a} and ${b} share no filename`, overlap.slice(0, 5).join(', '));
}

console.log(`pcm proofs import: ${pass} passed, ${fails.length} failed`);
for (const f of fails) console.log('  FAIL ' + f);
process.exit(fails.length ? 1 : 0);
