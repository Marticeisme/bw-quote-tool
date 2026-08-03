// Gate for the AI super-resolved PCM design plates.
//
//   node scripts/verify_pcm_upscale.mjs      # standalone
//   tests/test-pcm-upscale.mjs               # the same checks inside `npm test`
//
// The 699 files under pcm-design-images/ are produced by a GPU run that this gate must
// never need to repeat: scripts/pcm_plate_export.py re-exports each plate losslessly from
// the PCM design books, scripts/pcm_upscale.py runs Real-ESRGAN over them and writes
// data/pcm-upscale-manifest.json pinning every output's sha256, pixel size and byte count
// along with the model/scale/final-px/quality that produced them. Verification is then a
// pure comparison against that manifest.
//
// What this is actually defending against:
//   * a plate silently reverting to the old 358x204 q64 webp (long-edge floor),
//   * a plate dropped or added by an extraction change (file-set equality both ways),
//   * an image edited or re-encoded outside the pipeline (sha256/bytes/dims),
//   * the directory creeping past the operator's hard 20 MB budget,
//   * a manifest that no longer describes what shipped (duplicates, missing settings).
//
// WebP dimensions are parsed out of the RIFF container here rather than with an image
// library, so this gate has no dependency a fresh clone would have to install.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const DIR = 'pcm-design-images';
export const MANIFEST = 'data/pcm-upscale-manifest.json';
// The census, written down on purpose: 354 plates in the 2020 book + 345 in the 2011 book.
// A change here is exactly the kind of thing that must fail loudly rather than pass.
export const EXPECT_COUNT = 699;
export const EXPECT_PER_BOOK = { 2020: 354, 2011: 345 };
// The floor exists to catch a plate that silently reverted to the pre-upscale 358x204 or
// was skipped by the run — NOT to pin the shipped size. It is 600 and not the 700 the
// sprint file first named, because 700 and the 20 MB budget cannot both hold: measured
// over all 699 plates at the q70 quality floor, a 700px long edge costs 23.06 MB. The
// budget is the operator's hard requirement and wins; 640px fits. 600 leaves a little room
// under the shipped 640 without ever letting the old 358px files back in.
export const MIN_LONG_EDGE = 600;
export const QUALITY_FLOOR = 70;
export const BUDGET = 20 * 1000 * 1000;

/** Width/height from a WebP RIFF container: lossy (VP8), lossless (VP8L), extended (VP8X). */
export function webpSize(buf) {
  if (buf.length < 30 || buf.toString('ascii', 0, 4) !== 'RIFF' ||
      buf.toString('ascii', 8, 12) !== 'WEBP') return null;
  const fourcc = buf.toString('ascii', 12, 16);
  if (fourcc === 'VP8 ') {
    // 3-byte frame tag, then the 9d 01 2a start code, then 16-bit LE w/h (14 bits used)
    if (buf[23] !== 0x9d || buf[24] !== 0x01 || buf[25] !== 0x2a) return null;
    return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
  }
  if (fourcc === 'VP8L') {
    if (buf[20] !== 0x2f) return null;
    const b = buf.readUInt32LE(21);
    return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 };
  }
  if (fourcc === 'VP8X') {
    return { w: (buf[24] | (buf[25] << 8) | (buf[26] << 16)) + 1,
             h: (buf[27] | (buf[28] << 8) | (buf[29] << 16)) + 1 };
  }
  return null;
}

function walk(rel) {
  const out = [];
  for (const e of readdirSync(path.join(ROOT, rel), { withFileTypes: true })) {
    const r = `${rel}/${e.name}`;
    if (e.isDirectory()) out.push(...walk(r));
    else out.push(r);
  }
  return out;
}

const some = (list, n = 3) => list.slice(0, n).join(', ') + (list.length > n ? ', …' : '');

export async function run(ck) {
  // ------------------------------------------------------------ manifest loads
  const manPath = path.join(ROOT, MANIFEST);
  if (!existsSync(manPath)) { ck(false, `${MANIFEST} exists`); return; }
  ck(true, `${MANIFEST} exists`);

  let man = null;
  try { man = JSON.parse(readFileSync(manPath, 'utf8')); } catch (e) {
    ck(false, `${MANIFEST} parses as JSON — ${e.message}`); return;
  }
  ck(true, `${MANIFEST} parses as JSON`);

  // ------------------------------------------------------------ settings block
  const s = man.settings;
  ck(!!s && typeof s === 'object', 'manifest carries a settings block');
  const need = ['model', 'scale', 'binary', 'source', 'downsample', 'finalPx',
                'format', 'quality'];
  const absent = need.filter((k) => !s || s[k] === undefined || s[k] === null || s[k] === '');
  ck(absent.length === 0,
    `settings records model/scale/binary/source/downsample/finalPx/format/quality` +
    (absent.length ? ` — missing ${absent.join(', ')}` : ''));
  ck(s?.format === 'webp', `settings.format is webp (got ${s?.format})`);
  ck(s?.finalPx >= MIN_LONG_EDGE,
    `settings.finalPx ${s?.finalPx} >= ${MIN_LONG_EDGE}`);
  ck(s?.quality >= QUALITY_FLOOR,
    `settings.quality ${s?.quality} >= the q${QUALITY_FLOOR} floor`);
  ck(typeof s?.model === 'string' && /realesrgan/i.test(s.model),
    `settings.model names a Real-ESRGAN model (${s?.model})`);

  // ------------------------------------------------------------ manifest shape
  const files = Array.isArray(man.files) ? man.files : null;
  if (!files) { ck(false, 'manifest has a files[] array'); return; }
  ck(true, 'manifest has a files[] array');
  ck(files.length === EXPECT_COUNT,
    `manifest lists ${EXPECT_COUNT} plates (got ${files.length})`);
  ck(man.count === files.length,
    `manifest.count ${man.count} agrees with files.length ${files.length}`);

  const paths = files.map((e) => e.path);
  const dupes = paths.filter((p, i) => paths.indexOf(p) !== i);
  ck(dupes.length === 0,
    `no duplicate manifest entries${dupes.length ? ' — ' + some([...new Set(dupes)]) : ''}`);

  const outside = paths.filter((p) => typeof p !== 'string' || !p.startsWith(`${DIR}/`));
  ck(outside.length === 0,
    `every manifest path is under ${DIR}/${outside.length ? ' — ' + some(outside) : ''}`);

  const incomplete = files.filter((e) =>
    ['w', 'h', 'bytes', 'sha256'].some((k) => e[k] === undefined));
  ck(incomplete.length === 0,
    `every entry records w/h/bytes/sha256` +
    (incomplete.length ? ` — ${incomplete.length} incomplete` : ''));

  for (const [book, n] of Object.entries(EXPECT_PER_BOOK)) {
    const got = paths.filter((p) => String(p).startsWith(`${DIR}/${book}/`)).length;
    ck(got === n, `${DIR}/${book}/ holds ${n} plates (manifest says ${got})`);
  }

  // ------------------------------------------------------------ file set on disk
  const onDisk = walk(DIR);
  const stray = onDisk.filter((p) => !p.endsWith('.webp'));
  ck(stray.length === 0,
    `${DIR}/ holds only .webp files${stray.length ? ' — ' + some(stray) : ''}`);

  const manSet = new Set(paths);
  const diskSet = new Set(onDisk);
  const extra = onDisk.filter((p) => !manSet.has(p));
  const missing = paths.filter((p) => !diskSet.has(p));
  ck(extra.length === 0,
    `no file on disk is absent from the manifest${extra.length ? ' — ' + some(extra) : ''}`);
  ck(missing.length === 0,
    `no manifest entry is missing on disk${missing.length ? ' — ' + some(missing) : ''}`);

  // ------------------------------------------------------------ bytes / hash / dims
  const badBytes = [], badHash = [], badDims = [], unreadable = [], tooSmall = [];
  let total = 0, minLong = Infinity;
  for (const p of onDisk) total += statSync(path.join(ROOT, p)).size;

  for (const e of files) {
    const abs = path.join(ROOT, e.path);
    if (!existsSync(abs)) continue;                     // already reported as missing
    const buf = readFileSync(abs);
    if (buf.length !== e.bytes) badBytes.push(`${e.path} (${buf.length} vs ${e.bytes})`);
    const hash = createHash('sha256').update(buf).digest('hex');
    if (hash !== e.sha256) badHash.push(e.path);
    const dim = webpSize(buf);
    if (!dim) { unreadable.push(e.path); continue; }
    if (dim.w !== e.w || dim.h !== e.h)
      badDims.push(`${e.path} (${dim.w}x${dim.h} vs ${e.w}x${e.h})`);
    const long = Math.max(dim.w, dim.h);
    minLong = Math.min(minLong, long);
    if (long < MIN_LONG_EDGE) tooSmall.push(`${e.path} (${long}px)`);
  }

  ck(unreadable.length === 0,
    `every plate is a readable WebP${unreadable.length ? ' — ' + some(unreadable) : ''}`);
  ck(badBytes.length === 0,
    `every plate's byte count matches the manifest${badBytes.length ? ` — ${badBytes.length} differ: ` + some(badBytes) : ''}`);
  ck(badHash.length === 0,
    `every plate's sha256 matches the manifest${badHash.length ? ` — ${badHash.length} differ: ` + some(badHash) : ''}`);
  ck(badDims.length === 0,
    `every plate's pixel size matches the manifest${badDims.length ? ` — ${badDims.length} differ: ` + some(badDims) : ''}`);
  ck(tooSmall.length === 0,
    `every plate's long edge is >= ${MIN_LONG_EDGE}px (min ${minLong})` +
    (tooSmall.length ? ` — ${tooSmall.length} short: ` + some(tooSmall) : ''));

  // ------------------------------------------------------------ size budget
  ck(total <= BUDGET,
    `${DIR}/ is ${(total / 1e6).toFixed(2)} MB, within the ${BUDGET / 1e6} MB budget`);
  ck(man.totalBytes === undefined || man.totalBytes === total,
    `manifest.totalBytes ${man.totalBytes} agrees with the ${total} bytes on disk`);
}

if (process.argv[1] && process.argv[1].endsWith('verify_pcm_upscale.mjs')) {
  let pass = 0, fail = 0;
  const ck = (cond, msg) => {
    if (cond) { pass++; console.log('  PASS  ' + msg); }
    else { fail++; console.log('  FAIL  ' + msg); }
  };
  await run(ck);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
