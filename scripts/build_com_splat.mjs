/**
 * Converts a 3D Gaussian Splatting .ply (as exported by Brush, or by any other trainer that
 * writes the standard INRIA property set) into the compact 32-bytes-per-splat `.splat`
 * format that MAPS/COM_Walkthrough.html reads.
 *
 * Layout per splat, matching antimatter15/splat (MIT) which the viewer is vendored from:
 *   position  3 x float32   (12 B)
 *   scale     3 x float32   (12 B)   exp() of the PLY's log-scales
 *   colour    4 x uint8     ( 4 B)   SH degree-0 term -> RGB, sigmoid(opacity) -> A
 *   rotation  4 x uint8     ( 4 B)   normalised quaternion, 128-biased
 *
 * Spherical-harmonic bands 1..3 are DROPPED. That loses view-dependent shading and is
 * the single biggest size win; for a walk-through of a stone interior it is not missed.
 *
 * Splats are emitted in descending order of visual importance (volume x opacity), which
 * is what makes `--max-splats` a principled downsample rather than a truncation: the
 * tail we cut is the smallest, faintest gaussians. That ordering is also what the
 * viewer's progressive-load path expects, so a partly-loaded file still looks right.
 *
 * Two cleanup filters run before the cut, both aimed at the same artefact: the translucent
 * grey veils that hang in front of an indoor reconstruction. They are single gaussians blown
 * up to many metres across — in the Chapel of Memory model the largest was 388 world units
 * wide against a p90 of 0.17 — so they survive an importance ranking (huge volume) while
 * being pure noise. `--max-scale` drops any gaussian whose longest axis exceeds a threshold;
 * `--min-alpha` drops the near-invisible ones that only add fill-rate.
 *
 *   node scripts/build_com_splat.mjs <input.ply> <output.splat>
 *        [--max-splats N] [--max-scale S] [--min-alpha A]
 */
import fs from 'node:fs';

const args = process.argv.slice(2);
const inPath = args[0];
const outPath = args[1];
const flag = (name, def, parse = parseFloat) => {
  const i = args.indexOf(name);
  return i >= 0 ? parse(args[i + 1]) : def;
};
const maxSplats = flag('--max-splats', Infinity, (v) => parseInt(v, 10));
const maxScale = flag('--max-scale', Infinity);
const minAlpha = flag('--min-alpha', 0);
// Needle-ness: longest axis / MIDDLE axis. THE NEEDLE FILTER.
//
// Outdoor scenes reconstruct grass, bark and gravel as gaussians stretched into spikes --
// long on one axis, near-zero on the others. They sit ON the surface, so neither a position
// based statistical-outlier filter nor `--max-scale` removes them: their longest axis is not
// unusually long, it is the SHAPE that is wrong. On the Terrace Garden model those spikes are
// what turned ground-level memorial markers into a field of needles that cleared every pixel
// floor (high contrast reads as high "detail") while being unshowable to a family.
//
// It must be max/MIDDLE, not max/min. A gaussian rendering a flat surface is a DISC -- two
// large axes and one near-zero -- so its max/min ratio is just as extreme as a needle's, and a
// max/min filter deletes precisely the splats that were filling the ground in. Tried at
// --max-aniso 15 on Terrace Garden it removed 485,245 splats and made the spike field WORSE,
// because what it actually removed was the surface. A needle has one large axis and two small
// ones, so max/mid is large; a disc has two large axes, so max/mid is near 1.
const maxAniso = flag('--max-aniso', Infinity);
if (!inPath || !outPath) {
  console.error('usage: node scripts/build_com_splat.mjs <input.ply> <output.splat> [--max-splats N]');
  process.exit(2);
}

const TYPE = {
  double: [8, (dv, o) => dv.getFloat64(o, true)],
  float: [4, (dv, o) => dv.getFloat32(o, true)],
  int: [4, (dv, o) => dv.getInt32(o, true)],
  uint: [4, (dv, o) => dv.getUint32(o, true)],
  short: [2, (dv, o) => dv.getInt16(o, true)],
  ushort: [2, (dv, o) => dv.getUint16(o, true)],
  char: [1, (dv, o) => dv.getInt8(o)],
  uchar: [1, (dv, o) => dv.getUint8(o)],
};

const buf = fs.readFileSync(inPath);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const headText = Buffer.from(ab, 0, Math.min(64 * 1024, buf.length)).toString('latin1');
const endTok = 'end_header\n';
const endIdx = headText.indexOf(endTok);
if (endIdx < 0) throw new Error('no end_header found in ' + inPath);
const header = headText.slice(0, endIdx);
if (!/format binary_little_endian/.test(header)) {
  throw new Error('only binary_little_endian .ply is supported; header says:\n' + header.split('\n')[1]);
}
const count = parseInt(/element vertex (\d+)/.exec(header)[1], 10);

const off = {};
const read = {};
let stride = 0;
for (const line of header.split('\n')) {
  const m = /^property\s+(\S+)\s+(\S+)\s*$/.exec(line.trim());
  if (!m) continue;
  const t = TYPE[m[1]];
  if (!t) throw new Error('unsupported ply property type: ' + m[1]);
  off[m[2]] = stride;
  read[m[2]] = t[1];
  stride += t[0];
}
for (const req of ['x', 'y', 'z', 'scale_0', 'rot_0', 'opacity', 'f_dc_0']) {
  if (!(req in off)) throw new Error('ply is missing required property ' + req);
}

const dv = new DataView(ab, endIdx + endTok.length);
const at = (name, row) => read[name](dv, row * stride + off[name]);

// importance = gaussian volume x opacity, over the gaussians that survive the cleanup filters
const importance = new Float32Array(count);
const kept = [];
let cutScale = 0, cutAlpha = 0, cutAniso = 0;
for (let r = 0; r < count; r++) {
  const s0 = Math.exp(at('scale_0', r)), s1 = Math.exp(at('scale_1', r)), s2 = Math.exp(at('scale_2', r));
  const alpha = 1 / (1 + Math.exp(-at('opacity', r)));
  if (Math.max(s0, s1, s2) > maxScale) { cutScale++; continue; }
  if (alpha < minAlpha) { cutAlpha++; continue; }
  const srt = [s0, s1, s2].sort((x, y) => y - x);
  if (srt[0] / Math.max(1e-9, srt[1]) > maxAniso) { cutAniso++; continue; }
  importance[r] = s0 * s1 * s2 * alpha;
  kept.push(r);
}
const order = Uint32Array.from(kept);
order.sort((a, b) => importance[b] - importance[a]);

const keep = Math.min(order.length, maxSplats);
const ROW = 32;
const out = Buffer.alloc(ROW * keep);
const SH_C0 = 0.28209479177387814;
const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);

for (let j = 0; j < keep; j++) {
  const r = order[j];
  const o = j * ROW;
  out.writeFloatLE(at('x', r), o);
  out.writeFloatLE(at('y', r), o + 4);
  out.writeFloatLE(at('z', r), o + 8);
  out.writeFloatLE(Math.exp(at('scale_0', r)), o + 12);
  out.writeFloatLE(Math.exp(at('scale_1', r)), o + 16);
  out.writeFloatLE(Math.exp(at('scale_2', r)), o + 20);
  out[o + 24] = clamp255((0.5 + SH_C0 * at('f_dc_0', r)) * 255);
  out[o + 25] = clamp255((0.5 + SH_C0 * at('f_dc_1', r)) * 255);
  out[o + 26] = clamp255((0.5 + SH_C0 * at('f_dc_2', r)) * 255);
  out[o + 27] = clamp255((1 / (1 + Math.exp(-at('opacity', r)))) * 255);
  const q0 = at('rot_0', r), q1 = at('rot_1', r), q2 = at('rot_2', r), q3 = at('rot_3', r);
  const qlen = Math.hypot(q0, q1, q2, q3) || 1;
  out[o + 28] = clamp255((q0 / qlen) * 128 + 128);
  out[o + 29] = clamp255((q1 / qlen) * 128 + 128);
  out[o + 30] = clamp255((q2 / qlen) * 128 + 128);
  out[o + 31] = clamp255((q3 / qlen) * 128 + 128);
}

fs.writeFileSync(outPath, out);
const parts = [];
if (cutScale) parts.push(`${cutScale} over --max-scale ${maxScale}`);
if (cutAlpha) parts.push(`${cutAlpha} under --min-alpha ${minAlpha}`);
if (cutAniso) parts.push(`${cutAniso} needles over --max-aniso ${maxAniso}`);
if (order.length > keep) parts.push(`${order.length - keep} least-important`);
console.log(
  `${inPath}: ${count} splats, ${stride} B/row -> ${outPath}: ${keep} splats, ` +
  `${(out.length / 1048576).toFixed(2)} MB` + (parts.length ? ` (dropped ${parts.join('; ')})` : ''),
);
