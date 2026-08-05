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
// Catches a plate that silently reverted to the pre-upscale 358x204 or was skipped by the
// run. Briefly relaxed to 600 while the budget was 20 MB, which 700px could not fit; the
// operator raised the designs budget to 24 MB on the strength of that measurement, so the
// original 700 is back and is what ships.
export const MIN_LONG_EDGE = 700;
export const QUALITY_FLOOR = 70;
export const BUDGET = 24 * 1000 * 1000;
// The plates where Real-ESRGAN was rejected and plain Lanczos-from-lossless ships instead.
// Derived from scripts/pcm_upscale_fallback.py, and asserted here EXACTLY in both
// directions: a plate silently promoted back onto the AI path is the regression this
// catches, and a plate silently demoted off it is a sharpness loss nobody asked for.
export const EXPECT_RESAMPLE = new Set([
  '2011/2108', '2011/2142', '2011/2194', '2011/2209', '2011/2251', '2011/2268',
  '2011/2274', '2011/2362', '2011/2456', '2011/2457',
  '2020/1004', '2020/1006', '2020/1008', '2020/1011', '2020/1017', '2020/1018',
  '2020/838', '2020/841', '2020/918', '2020/958', '2020/987', '2020/992',
]);

// The plates whose ceramic PHOTOGRAPH was removed and replaced with the Bonney Watson
// blank ceramic oval (scripts/pcm_photo_mask.py, regions in data/pcm-photo-masks.json). Asserted
// EXACTLY in both directions, for the same reason as EXPECT_RESAMPLE: a plate that quietly
// loses its mask puts a stranger's AI-rebuilt face back in front of a family, and a plate
// that quietly gains one has had product art painted over without anyone deciding to.
// The census was done by eye over all 699 plates; 2011 carries none, which is itself a
// finding worth pinning — that book is line art throughout.
export const EXPECT_PHOTO_MASKED = new Set([
  '2020/668', '2020/676', '2020/680', '2020/682', '2020/686', '2020/691', '2020/694',
  '2020/701', '2020/710', '2020/712', '2020/719', '2020/729', '2020/736', '2020/744',
  '2020/746', '2020/748', '2020/754', '2020/758', '2020/763', '2020/767', '2020/773',
  '2020/787', '2020/793', '2020/794', '2020/801', '2020/804', '2020/805', '2020/808',
  '2020/814', '2020/815', '2020/817', '2020/823', '2020/827', '2020/830', '2020/834',
  '2020/843', '2020/845', '2020/854', '2020/858', '2020/866', '2020/867', '2020/868',
  '2020/869', '2020/875', '2020/877', '2020/879', '2020/882', '2020/884', '2020/888',
  '2020/891', '2020/892', '2020/896', '2020/898', '2020/899', '2020/901', '2020/908',
  '2020/910', '2020/913', '2020/922', '2020/923', '2020/927', '2020/929', '2020/932',
  '2020/940', '2020/941', '2020/947', '2020/950', '2020/952', '2020/963', '2020/971',
  '2020/972', '2020/973', '2020/980', '2020/985', '2020/994', '2020/1005', '2020/1006',
  '2020/1010', '2020/1011', '2020/1012', '2020/1015', '2020/1016', '2020/1018',
  '2020/1021',
]);
export const MASKS = 'data/pcm-photo-masks.json';

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
  const need = ['model', 'scale', 'binary', 'source', 'downsample', 'upscale', 'finalPx',
                'format', 'quality'];
  const absent = need.filter((k) => !s || s[k] === undefined || s[k] === null || s[k] === '');
  ck(absent.length === 0,
    `settings records model/scale/binary/source/downsample/upscale/finalPx/format/quality` +
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
    ['w', 'h', 'bytes', 'sha256', 'method'].some((k) => e[k] === undefined));
  ck(incomplete.length === 0,
    `every entry records w/h/bytes/sha256/method` +
    (incomplete.length ? ` — ${incomplete.length} incomplete` : ''));

  // ------------------------------------------------------------ the AI/fallback split
  const badMethod = files.filter((e) => !['esrgan', 'resample'].includes(e.method));
  ck(badMethod.length === 0,
    `every method is esrgan or resample${badMethod.length ? ' — ' + some(badMethod.map((e) => `${e.path}=${e.method}`)) : ''}`);

  const key = (e) => `${e.book}/${e.num}`;
  const gotResample = new Set(files.filter((e) => e.method === 'resample').map(key));
  const promoted = [...EXPECT_RESAMPLE].filter((k) => !gotResample.has(k));
  const demoted = [...gotResample].filter((k) => !EXPECT_RESAMPLE.has(k));
  ck(promoted.length === 0,
    `every plate the sweep rejected is still on the fallback path` +
    (promoted.length ? ` — back on AI: ${some(promoted)}` : ''));
  ck(demoted.length === 0,
    `no plate was moved onto the fallback path without being listed` +
    (demoted.length ? ` — ${some(demoted)}` : ''));
  ck(gotResample.size === EXPECT_RESAMPLE.size,
    `${EXPECT_RESAMPLE.size} plates ship the no-AI fallback (manifest says ${gotResample.size})`);
  ck(files.filter((e) => e.method === 'esrgan').length === EXPECT_COUNT - EXPECT_RESAMPLE.size,
    `${EXPECT_COUNT - EXPECT_RESAMPLE.size} plates ship the Real-ESRGAN render`);
  ck(files.filter((e) => e.method === 'resample').every((e) => typeof e.reason === 'string' && e.reason.length > 8),
    'every fallback plate records why the AI was rejected');
  const mc = man.methodCounts;
  ck(!!mc && mc.resample === gotResample.size && mc.esrgan === EXPECT_COUNT - gotResample.size,
    `manifest.methodCounts agrees with files[] (${JSON.stringify(mc)})`);

  // ------------------------------------------------------------ the photo-mask set
  const gotMasked = new Set(files.filter((e) => e.photoMasked === true).map(key));
  const unmasked = [...EXPECT_PHOTO_MASKED].filter((k) => !gotMasked.has(k));
  const extraMasked = [...gotMasked].filter((k) => !EXPECT_PHOTO_MASKED.has(k));
  ck(unmasked.length === 0,
    `every plate the census found a photograph on is still masked` +
    (unmasked.length ? ` — photograph back: ${some(unmasked)}` : ''));
  ck(extraMasked.length === 0,
    `no plate was masked without being listed` +
    (extraMasked.length ? ` — ${some(extraMasked)}` : ''));
  ck(gotMasked.size === EXPECT_PHOTO_MASKED.size,
    `${EXPECT_PHOTO_MASKED.size} plates carry a removed photograph ` +
    `(manifest says ${gotMasked.size})`);
  ck(files.filter((e) => e.photoMasked === true)
        .every((e) => typeof e.maskReason === 'string' && e.maskReason.length >= 8),
    'every masked plate records why the photograph was removed');
  ck(!!s?.photoMask && typeof s.photoMask === 'object' &&
     typeof s.photoMask.source === 'string' && s.photoMask.source.length >= 8,
    'settings.photoMask records how the masking was done');

  // the checked-in region file is the census; it must name the same plates, no more, no less
  const mPath = path.join(ROOT, MASKS);
  if (!existsSync(mPath)) {
    ck(false, `${MASKS} exists`);
  } else {
    ck(true, `${MASKS} exists`);
    let masks = null;
    try { masks = JSON.parse(readFileSync(mPath, 'utf8')); } catch (e) {
      ck(false, `${MASKS} parses as JSON — ${e.message}`);
    }
    const plates = Array.isArray(masks?.plates) ? masks.plates : [];
    const listed = new Set(plates.map((p) => `${p.book}/${p.num}`));
    const onlyFile = [...listed].filter((k) => !EXPECT_PHOTO_MASKED.has(k));
    const onlyGate = [...EXPECT_PHOTO_MASKED].filter((k) => !listed.has(k));
    ck(onlyFile.length === 0 && onlyGate.length === 0,
      `${MASKS} names exactly the ${EXPECT_PHOTO_MASKED.size} masked plates` +
      (onlyFile.length ? ` — only in the file: ${some(onlyFile)}` : '') +
      (onlyGate.length ? ` — only in the gate: ${some(onlyGate)}` : ''));
    const badRegion = plates.filter((p) => !Array.isArray(p.regions) || !p.regions.length ||
      p.regions.some((r) => !Array.isArray(r.bbox) || r.bbox.length !== 4 ||
        r.bbox[2] <= r.bbox[0] || r.bbox[3] <= r.bbox[1] ||
        !['oval', 'rect'].includes(r.shape)));
    ck(badRegion.length === 0,
      `every masked plate declares at least one oval/rect region with a real bbox` +
      (badRegion.length ? ` — ${badRegion.length} bad, e.g. ${badRegion[0].book}/${badRegion[0].num}` : ''));
    const noNote = plates.filter((p) => typeof p.note !== 'string' || p.note.length < 8);
    ck(noNote.length === 0,
      `every masked plate records the verdict that put it on the list (${noNote.length} without)`);
  }

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
