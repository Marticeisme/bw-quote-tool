// Gate for pcm-design-catalog.html — the PCM flat-marker design catalog.
//
// The page is GENERATED (scripts/pcm_extract.py -> data/pcm-catalog.json ->
// scripts/build_pcm_catalog.py), so the interesting failures are not typos: they are a
// silent drop in what got extracted, a card whose image 404s after a rename, a design
// whose number never made it onto the card, and the jump box — the one feature the
// operator asked for by name — quietly not finding a number any more.
//
// Everything is asserted against data/pcm-catalog.json and against the DOM, never
// against a constant this file also owns, EXCEPT the extraction census: those page
// ranges and counts are the flat-granite-only ruling written down, and a change in them
// is exactly what must fail loudly.
//
//   node scripts/verify_pcm_catalog.mjs            # standalone, against localhost
//   BW_BASE=http://localhost:4040/ node scripts/…  # or a pinned server
//
// tests/test-pcm-catalog.mjs runs the same checks inside `npm test`.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { assertFamilyRegister } from './_no_mis_assert.mjs';
import { assertServesThisTree } from './served-tree-check.mjs';

export const PAGE = 'pcm-design-catalog.html';
export const DATA = 'data/pcm-catalog.json';
export const TAGS = 'data/pcm-catalog-tags.json';

// Subject probes. Each is a word a family actually says, with what it must reach. The
// counts are NOT constants this file owns — they are computed from the tag data, so the
// assertion is "the page agrees with the tagging", and deleting a design's tags fails it.
//
// SPOT AUDIT: three designs named here are the eyeball sample. Open the image, look at
// it, and the tag had better describe what is drawn. 2011-1182 is a single rose stem,
// 2020-717 is a bugling elk in the pines, 2020-681 is a bagpiper with a celtic cross.
export const SUBJECT_PROBES = [
  { q: 'rose', tag: 'rose', mustInclude: ['2011-1182', '2011-1317', '2020-998'] },
  { q: 'roses', tag: 'rose', note: 'plural lands on the same tag as the singular' },
  { q: 'elk', tag: 'elk', mustInclude: ['2020-717'] },
  { q: 'bagpipes', tag: 'bagpipes', mustInclude: ['2020-681'] },
  { q: 'praying hands', tag: 'praying-hands', mustInclude: ['2011-1135', '2011-2159'] },
  { q: 'mountains', tag: 'mountain', mustInclude: ['2011-1444', '2020-684'] },
  { q: 'fishing', tag: 'fishing', mustInclude: ['2011-1123', '2020-706'] },
];

// The flat-granite-only ruling, as numbers. Neither design book has an upright, slant,
// bench or bronze section — the only occurrences of those words are in the glossaries,
// which are outside every range below. "Silver Bronze" in the 2020 captions is a granite
// COLOR; 18 designs carry it and all 18 belong here.
export const CENSUS = {
  '2020': { firstPage: 6, lastPage: 95, designs: 354 },
  '2011': { firstPage: 6, lastPage: 94, designs: 346 },
  elements: { firstPage: 10, lastPage: 297, cats: 18 },
};

// PCM 2271 (GREENE) is printed under Companion/Religious on p.74 and again under
// Companion/Outdoors on p.82 — it carries both a cross and a mountain scene, so the book
// files it twice. Both cards ship; the art is one design and one file.
export const CROSS_LISTED = {
  '2011-2271': ['Companion Designs / Religious', 'Companion Designs / Outdoors'],
};

// Sample lookups. Each is a real number from a different book / a different element
// category, so a regression that breaks one index does not hide behind another.
export const LOOKUPS = [
  { q: '1183', id: '2011-1183' },
  { q: 'PCM 728', id: '2020-728' },
  { q: 'pcm1021', id: '2020-1021' },
  { q: 'BASS 001', id: 'BASS 001' },
  { q: 'praying hands 017', id: 'PRAYING HANDS 017' },
];

// Format / group / category probes. Sprint-12 operator ruling: typing "companion" must
// show all companion designs. The expected set is COMPUTED OFF data/pcm-catalog.json's own
// fmt/cat/sub fields — deliberately not off the facet tokens build_pcm_catalog.py writes,
// so the gate cannot agree with the builder about a shared mistake.
//
// Note what "all companion designs" means, because the two readings differ by six cards:
// 124 designs carry fmt `companion`, and the 2011 book files another SIX under Companion
// Designs / Ledgers, whose fmt is `ledger` because they are ledgers. They are companion
// designs — the book says so on the page — so the ruling covers all 130, and `subset` below
// asserts separately that every one of the 124 is in the 130.
export const FORMAT_PROBES = [
  { q: 'companion', match: (d) => /companion/i.test(d.fmt + ' ' + d.cat + ' ' + d.sub),
    subset: (d) => d.fmt === 'companion' },
  { q: 'companions', sameAs: 'companion' },
  { q: 'individual', match: (d) => /individual/i.test(d.fmt + ' ' + d.cat + ' ' + d.sub) },
  { q: 'ledger', match: (d) => /ledger/i.test(d.fmt + ' ' + d.cat + ' ' + d.sub) },
  { q: 'ledgers', sameAs: 'ledger' },
  { q: 'flat', match: (d) => /flat/i.test(d.fmt + ' ' + d.sub) },
  { q: 'flat marker', sameAs: 'flat' },
];

// ---- image headers, read from the bytes ----------------------------------------------
// Dimensions are asserted against the FILE, not against what the catalog claims and not
// against what a decoder library would hand back after it had already normalised things.
// A PNG's IHDR also carries the bit depth and colour type, which is how "the 1-bit output
// came back" is caught rather than merely "the file is still 300 px".
export function pngInfo(buf) {
  if (buf.length < 33 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  if (buf.toString('ascii', 12, 16) !== 'IHDR') return null;
  const out = { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20),
                depth: buf[24], colorType: buf[25], palette: 0 };
  let o = 8;
  while (o + 8 <= buf.length) {
    const len = buf.readUInt32BE(o), id = buf.toString('ascii', o + 4, o + 8);
    if (id === 'PLTE') { out.palette = len / 3; break; }
    if (id === 'IDAT') break;
    o += 12 + len;
  }
  return out;
}

export function webpInfo(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null;
  let o = 12;
  while (o + 8 <= buf.length) {
    const id = buf.toString('ascii', o, o + 4), len = buf.readUInt32LE(o + 4), d = o + 8;
    // VP8 (lossy) puts the size after a 3-byte frame tag AND a 3-byte sync code, and the
    // top two bits of each 16-bit field are a scale, not size — read either wrong and you
    // get five-digit garbage out of a 990 px image.
    if (id === 'VP8X') return { w: 1 + buf.readUIntLE(d + 4, 3), h: 1 + buf.readUIntLE(d + 7, 3) };
    if (id === 'VP8 ') return { w: buf.readUInt16LE(d + 6) & 0x3fff, h: buf.readUInt16LE(d + 8) & 0x3fff };
    if (id === 'VP8L') {
      const v = buf.readUInt32LE(d + 1);
      return { w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1 };
    }
    o = d + len + (len & 1);
  }
  return null;
}

export function jpegInfo(buf) {
  if (buf.readUInt16BE(0) !== 0xffd8) return null;
  let o = 2;
  while (o + 9 < buf.length) {
    if (buf[o] !== 0xff) { o++; continue; }
    const m = buf[o + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return { h: buf.readUInt16BE(o + 5), w: buf.readUInt16BE(o + 7) };
    }
    if (m === 0xd8 || (m >= 0xd0 && m <= 0xd9)) { o += 2; continue; }
    o += 2 + buf.readUInt16BE(o + 2);
  }
  return null;
}

export function imageInfo(rel) {
  const buf = fs.readFileSync(path.resolve(rel));
  if (/\.png$/i.test(rel)) return pngInfo(buf);
  if (/\.webp$/i.test(rel)) return webpInfo(buf);
  if (/\.jpe?g$/i.test(rel)) return jpegInfo(buf);
  return null;
}

export function dirBytes(dir) {
  let bytes = 0, files = 0;
  const walk = (p) => {
    for (const e of fs.readdirSync(p, { withFileTypes: true })) {
      const q = path.join(p, e.name);
      if (e.isDirectory()) walk(q);
      else { files++; bytes += fs.statSync(q).size; }
    }
  };
  walk(path.resolve(dir));
  return { bytes, files };
}

export async function run(ck, base) {
  // REFUSE TO GRADE A PAGE WE ARE NOT READING FROM DISK. This gate reads the catalog, the
  // tags and the page source from cwd, but drives the RENDERED page over HTTP from `base`
  // — and dev-server.mjs serves the directory of the script that started it, so whichever
  // worktree got to port 3737 first answers for everybody. On 2026-08-03 that produced a
  // textbook false failure: this file at s12 HEAD, driven against a 3737 owned by main,
  // reported "144 passed, 10 failed" with every failure inside the new facet layer — the
  // data-driven half read the worktree and passed, the DOM-driven half read main's older
  // page and failed. Same commit on a correctly-served tree: 154/0.
  //
  // First statement in the function, before any ck(), so a wrong-tree run dies loudly
  // instead of emitting a hundred green checks and a plausible-looking cluster of reds.
  await assertServesThisTree(base, process.cwd(), 'the PCM catalog gate', [PAGE, DATA, TAGS]);

  const data = JSON.parse(fs.readFileSync(path.resolve(DATA), 'utf8'));
  const tags = JSON.parse(fs.readFileSync(path.resolve(TAGS), 'utf8'));
  const src = fs.readFileSync(path.resolve(PAGE), 'utf8');

  // ---- 1. the extraction census: flat granite only, from the pages we said ----
  for (const book of ['2020', '2011']) {
    const items = data.designs.filter((d) => d.book === book);
    const pages = items.map((d) => d.page);
    const c = CENSUS[book];
    ck(items.length === c.designs,
      `${book} book: ${items.length} designs (expected ${c.designs})`);
    ck(Math.min(...pages) >= c.firstPage && Math.max(...pages) <= c.lastPage,
      `${book} book: every design comes from pp. ${c.firstPage}-${c.lastPage} ` +
      `(saw ${Math.min(...pages)}-${Math.max(...pages)})`);
  }
  const ePages = data.elements.map((e) => e.page);
  ck(Math.min(...ePages) >= CENSUS.elements.firstPage &&
     Math.max(...ePages) <= CENSUS.elements.lastPage,
    `elements: every item comes from pp. ${CENSUS.elements.firstPage}-` +
    `${CENSUS.elements.lastPage} (saw ${Math.min(...ePages)}-${Math.max(...ePages)})`);
  ck(Object.keys(data.elementCats).length === CENSUS.elements.cats,
    `elements: ${Object.keys(data.elementCats).length} categories ` +
    `(expected ${CENSUS.elements.cats})`);
  ck(data.designs.every((d) => ['flat', 'ledger', 'individual', 'companion'].includes(d.fmt)),
    'every design is a flat marker, ledger or flat companion — no upright/slant/bench format');

  // Exactly one design is printed in two of the book's sections (see CROSS_LISTED). Any
  // OTHER repeat means the extractor matched one plate to two captions, so this asserts
  // the known set rather than merely tolerating duplicates.
  const cross = data.crossListed || {};
  ck(JSON.stringify(Object.keys(cross).sort()) === JSON.stringify(Object.keys(CROSS_LISTED).sort()),
    `only the documented cross-listings repeat a number (${Object.keys(cross).join(', ') || 'none'})`);
  for (const [id, groups] of Object.entries(CROSS_LISTED)) {
    ck(JSON.stringify((cross[id] || []).slice().sort()) === JSON.stringify(groups.slice().sort()),
      `${id} is listed in ${groups.join(' + ')}`);
    const imgs = new Set(data.designs.filter((d) => d.id === id).map((d) => d.img));
    ck(imgs.size === 1, `${id}'s two cards show the one design (${imgs.size} image path/s)`);
  }
  const inGroup = new Map();
  let groupDupes = 0;
  for (const d of data.designs) {
    const k = d.cat + '/' + d.sub + '/' + d.id;
    if (inGroup.has(k)) groupDupes++;
    inGroup.set(k, 1);
  }
  ck(groupDupes === 0, `no design appears twice inside one group (${groupDupes})`);
  const eDupes = data.elements.map((e) => e.code).filter((v, i, a) => a.indexOf(v) !== i);
  ck(eDupes.length === 0, `element codes are unique (${eDupes.slice(0, 4).join(', ') || 'none repeated'})`);

  // ---- 1b. the subject tagging: complete, in-vocabulary, and reaching the elements ----
  // Tagging 700 designs by eye is the kind of work that decays one forgotten design at a
  // time, so completeness is asserted rather than assumed.
  const untagged = data.designs.filter((d) => !(tags.designTags[d.id] || []).length);
  ck(untagged.length === 0,
    `every one of the ${data.designs.length} designs carries at least one subject tag` +
    (untagged.length ? ` — ${untagged.length} untagged, e.g. ${untagged[0].id}` : ''));
  const badTag = Object.entries(tags.designTags)
    .flatMap(([id, ts]) => ts.filter((t) => !tags.vocabulary[t]).map((t) => `${id}:${t}`));
  ck(badTag.length === 0,
    `every design tag is in the controlled vocabulary (${Object.keys(tags.vocabulary).length} terms)` +
    (badTag.length ? ` — stray ${badTag.slice(0, 3).join(', ')}` : ''));

  const stemRe = new RegExp(tags.stemRule);
  const stemOf = (code) => String(code).replace(stemRe, '').trim() || String(code).trim();
  const noStem = data.elements.filter((e) => !tags.elementStemTags[stemOf(e.code)]);
  ck(noStem.length === 0,
    `every one of the ${data.elements.length} elements resolves to a tagged stem` +
    (noStem.length ? ` — ${noStem.length} without, e.g. ${noStem[0].code}` : ''));

  const emptySyn = Object.entries(tags.synonyms).filter(([, v]) => !v.length).map(([k]) => k);
  ck(Object.keys(tags.synonyms).length >= 100 && emptySyn.length === 0,
    `${Object.keys(tags.synonyms).length} family words are wired to real tags` +
    (emptySyn.length ? ` — ${emptySyn.slice(0, 3).join(', ')} expand to nothing` : ''));

  // "flowers" must be a strictly wider net than "rose", or the synonym layer is doing
  // nothing and a family asking for flowers gets shown only roses.
  const taggedWith = (t) =>
    Object.entries(tags.designTags).filter(([, ts]) => ts.includes(t)).map(([id]) => id);
  const roseIds = new Set(taggedWith('rose'));
  const flowerIds = new Set(tags.synonyms.flowers.flatMap(taggedWith));
  ck(flowerIds.size > roseIds.size && [...roseIds].every((id) => flowerIds.has(id)),
    `"flowers" is a superset of "rose" in the data (${flowerIds.size} vs ${roseIds.size})`);

  // ---- 2. every referenced image is really on disk ----
  const all = [...data.designs, ...data.elements, ...data.photos, ...data.reference];
  const missing = all.map((x) => x.img).filter((p) => !fs.existsSync(path.resolve(p)));
  ck(missing.length === 0,
    `all ${all.length} referenced images exist on disk` +
    (missing.length ? ` — missing ${missing.length}, e.g. ${missing[0]}` : ''));

  // ---- 2b. resolution, encoding and the operator's size budgets ----
  // The catalog used to ship images far below what the books carry: 150 px 1-bit element
  // tiles off 270 px native art, 760 px photos off 4000 px frames. These checks assert the
  // *source's* resolution reached disk, that nothing was upscaled past it, and that the
  // three directories stay inside the budgets the operator set.
  const spec = data.imageSpec || {};
  ck(!!spec.elementDpi && !!spec.budgets,
    'the catalog records how its images were rendered (imageSpec)');
  ck(spec.elementDpi === spec.elementNativePpi,
    `elements are rendered at the book's own ${spec.elementNativePpi} ppi, not above it ` +
    `(elementDpi ${spec.elementDpi}) — anything higher would be invented detail`);

  const elInfo = data.elements.map((e) => ({ e, i: imageInfo(e.img) }));
  const badHeader = elInfo.filter(({ i }) => !i);
  ck(badHeader.length === 0,
    `every element image has a readable PNG header (${badHeader.length} unreadable)`);
  const drift = elInfo.filter(({ e, i }) => i && (i.w !== e.px[0] || i.h !== e.px[1]));
  ck(drift.length === 0,
    `every element file's real size matches the size the catalog records` +
    (drift.length ? ` — ${drift.length} disagree, e.g. ${drift[0].e.code}` : ''));
  const elLong = elInfo.filter(({ i }) => i).map(({ i }) => Math.max(i.w, i.h));
  const elMin = Math.min(...elLong), elMax = Math.max(...elLong);
  const elMed = elLong.slice().sort((a, b) => a - b)[elLong.length >> 1];
  // The floor is derived from what previously SHIPPED (elementPrevCapPx, 150) rather than
  // from a round number: the claim being gated is "no tile is worse than before", and a
  // flat ">= 280" would be a lie — the trimmed native tiles are 270-300 px, and 3,415 of
  // the 3,973 sit below 280 because the book's own art does.
  ck(elMin > spec.elementPrevCapPx,
    `every element tile beats the old ${spec.elementPrevCapPx} px ceiling ` +
    `(smallest long edge ${elMin})`);
  ck(elMed >= spec.elementPrevCapPx * 1.8,
    `the median element tile is ${elMed} px, ≥1.8x the old ${spec.elementPrevCapPx}`);
  ck(elMax <= spec.elementCapPx,
    `no element tile exceeds the ${spec.elementCapPx} px cap (largest ${elMax})`);
  const notPal = elInfo.filter(({ i }) => i && (i.colorType !== 3 || i.depth === 1));
  ck(notPal.length === 0,
    `every element tile is antialiased palette art, not 1-bit line art` +
    (notPal.length ? ` — ${notPal.length} are not, e.g. ${notPal[0].e.code}` : ''));
  const tooMany = elInfo.filter(({ i }) => i && i.palette > spec.elementGreyLevels);
  ck(tooMany.length === 0,
    `every element palette is within the ${spec.elementGreyLevels} grey levels the ` +
    `budget was measured on (${tooMany.length} over)`);

  const shot = data.photos.filter((p) => p.img.startsWith('pcm-example-images/'));
  const phInfo = shot.map((p) => ({ p, i: imageInfo(p.img) }));
  const phDrift = phInfo.filter(({ p, i }) => !i || i.w !== p.px[0] || i.h !== p.px[1]);
  ck(phDrift.length === 0,
    `every example photo's real size matches the catalog (${phDrift.length} disagree)`);
  const phLong = phInfo.map(({ i }) => Math.max(i.w, i.h));
  ck(Math.min(...phLong) > spec.photoPrevPx,
    `every one of the ${shot.length} example photos beats the old ${spec.photoPrevPx} px ` +
    `(smallest ${Math.min(...phLong)})`);
  ck(Math.max(...phLong) <= spec.photoPx,
    `no photo exceeds the ${spec.photoPx} px budget ceiling (largest ${Math.max(...phLong)})`);
  // Exactly one frame is source-limited: index 58's crop leaves 1060 px of original pixels,
  // and upscaling it to the cap would be inventing them. Asserted as "at most one" so a
  // second one appearing is a real finding.
  const belowCap = phLong.filter((v) => v < spec.photoPx).length;
  ck(belowCap <= 1,
    `${shot.length - belowCap} of ${shot.length} photos reach the ${spec.photoPx} px cap; ` +
    `${belowCap} is source-limited`);

  const refInfo = data.reference.map((r) => ({ r, i: imageInfo(r.img) }));
  const refDrift = refInfo.filter(({ r, i }) => !i || i.w !== r.px[0] || i.h !== r.px[1]);
  ck(refDrift.length === 0,
    `every reference plate's real size matches the catalog (${refDrift.length} disagree)`);
  // Sanity, not just equality: a WebP header read at the wrong offset yields five-digit
  // garbage, and a plate that "claims" 35124x42846 is a broken reader or a broken file.
  const insane = refInfo.filter(({ i }) =>
    !i || i.w < 200 || i.h < 200 || i.w > 8000 || i.h > 8000 || i.w < i.h);
  ck(insane.length === 0,
    `every reference plate reports a sane landscape page size ` +
    (insane.length ? `— ${insane[0].r.img} says ${insane[0].i.w}x${insane[0].i.h}` :
      `(all ${refInfo[0].i.w}x${refInfo[0].i.h})`));
  ck(Math.min(...refInfo.map(({ i }) => i.w)) >= spec.referencePrevPx * 1.4,
    `reference plates are at least 1.4x the old ${spec.referencePrevPx} px wide ` +
    `(${Math.min(...refInfo.map(({ i }) => i.w))} px, 2.1x the pixels)`);

  // ---- 2b. the COMPANION DESIGN PROOFS (sprint-17) --------------------------------
  // Pacific Coast Memorials' own full-colour proofs of the companion designs. They are a
  // separate SOURCE CLASS, not replacements: 119 of the numbers are also printed as book
  // plates and both ship, so a family can be shown the plate and the proof of one design.
  //
  // THE NO-MASKING RULING IS THE POINT OF HALF THESE CHECKS. Operator, 2026-08-05: these
  // ship with their artwork intact. The s15 photo-mask regime — 84 plates whose ceramic
  // portraits the Real-ESRGAN upscaler rebuilt wrong, blanked by scripts/pcm_photo_mask.py
  // — covers pcm-design-images/ and nothing else, because nothing in the proof class is
  // upscaled. Two rulings living in one catalog is exactly the arrangement that rots, so
  // the separation is asserted in BOTH directions: no proof may drift under the mask
  // regime, and no masked plate may drift out of pcm-design-images/. A future sprint that
  // "tidies up" by pointing the masker at every image directory fails here instead of
  // silently blanking 232 proofs the operator asked to keep whole.
  const PROOF_DIR = 'pcm-companion-images';
  const PROOF_MANIFEST = 'data/pcm-companion-proofs.json';
  const UPSCALE_MANIFEST = 'data/pcm-upscale-manifest.json';
  const MASK_REGIONS = 'data/pcm-photo-masks.json';

  const proofs = data.proofs || [];
  ck(proofs.length > 0, `the catalog carries the companion proof class (${proofs.length})`);

  const pman = JSON.parse(fs.readFileSync(path.resolve(PROOF_MANIFEST), 'utf8'));
  ck(pman.count === proofs.length && pman.files.length === proofs.length,
    `${PROOF_MANIFEST} and the catalog agree on the count ` +
    `(${pman.count} / ${pman.files.length} / ${proofs.length})`);

  // Both directions across data <-> disk. A one-way check passes happily while half the
  // images are orphans nobody links to, or while the data names files that 404.
  const proofFiles = new Set(fs.readdirSync(path.resolve(PROOF_DIR)));
  const namedFiles = new Set(proofs.map((p) => path.basename(p.img)));
  const onDiskOnly = [...proofFiles].filter((f) => !namedFiles.has(f));
  const inDataOnly = [...namedFiles].filter((f) => !proofFiles.has(f));
  ck(onDiskOnly.length === 0,
    `no orphan file in ${PROOF_DIR}/ that the catalog never names` +
    (onDiskOnly.length ? ` — ${onDiskOnly.slice(0, 4).join(', ')}` : ''));
  ck(inDataOnly.length === 0,
    `every proof the catalog names is on disk` +
    (inDataOnly.length ? ` — missing ${inDataOnly.slice(0, 4).join(', ')}` : ''));

  const prInfo = proofs.map((p) => ({ p, i: imageInfo(p.img) }));
  const prDrift = prInfo.filter(({ p, i }) => !i || i.w !== p.px[0] || i.h !== p.px[1]);
  ck(prDrift.length === 0,
    `every proof file's real size matches the catalog (${prDrift.length} disagree)`);
  const prLong = prInfo.filter(({ i }) => i).map(({ i }) => Math.max(i.w, i.h));
  ck(Math.max(...prLong) <= spec.proofPx,
    `no proof exceeds the ${spec.proofPx} px class (largest ${Math.max(...prLong)})`);
  ck(Math.min(...prLong) === spec.proofPx,
    `every proof reaches the ${spec.proofPx} px class — the sources are 720-800 px, so ` +
    `nothing here is enlarged and nothing is short (smallest ${Math.min(...prLong)})`);

  // Byte-determinism. The encode is pinned (LANCZOS -> WebP q70 method 6) and the manifest
  // carries a sha256 per file, so a re-run that lands different bytes — a Pillow upgrade,
  // a quality tweak someone made locally — fails here instead of shipping a silent
  // re-encode of 232 images.
  const hashDrift = pman.files.filter((e) => {
    if (!fs.existsSync(path.resolve(e.img))) return true;
    const h = crypto.createHash('sha256').update(fs.readFileSync(path.resolve(e.img))).digest('hex');
    return h !== e.sha256 || fs.statSync(path.resolve(e.img)).size !== e.bytes;
  });
  ck(hashDrift.length === 0,
    `every proof's bytes still hash to the manifest — the encode is deterministic` +
    (hashDrift.length ? ` — ${hashDrift.length} drifted, e.g. ${hashDrift[0].img}` : ''));

  // The PII hold. Twelve proofs carry real identities (full names with a home town or in
  // Vietnamese, exact dates, portrait photographs) rather than PCM's stock sample names,
  // and this repo is public. They are held OUT — asserted absent from the data, from the
  // manifest's shipping list, and from disk, so a re-run or a merge cannot quietly
  // reinstate one.
  const heldNums = new Set((pman.held || []).map((h) => h.num));
  ck(heldNums.size > 0 && (pman.held || []).every((h) => typeof h.reason === 'string' && h.reason.length >= 12),
    `${PROOF_MANIFEST} records every held proof and why (${heldNums.size} held)`);
  const heldShipped = proofs.filter((p) => heldNums.has(p.num));
  ck(heldShipped.length === 0,
    `no held proof reached the catalog` +
    (heldShipped.length ? ` — ${heldShipped.map((p) => p.num).join(', ')}` : ''));
  const heldOnDisk = [...heldNums].filter((n) => proofFiles.has(`${n}.webp`));
  ck(heldOnDisk.length === 0,
    `no held proof was left on disk` + (heldOnDisk.length ? ` — ${heldOnDisk.join(', ')}` : ''));

  // ---- the no-masking ruling, both directions ----
  ck(pman.settings && pman.settings.masked === false &&
     typeof pman.settings.maskingRuling === 'string' && pman.settings.maskingRuling.length >= 20,
    `${PROOF_MANIFEST} records the operator's no-masking ruling for this class`);
  const upman = JSON.parse(fs.readFileSync(path.resolve(UPSCALE_MANIFEST), 'utf8'));
  const proofUnderUpscale = upman.files.filter((f) => f.path.replace(/\\/g, '/').startsWith(PROOF_DIR + '/'));
  ck(proofUnderUpscale.length === 0,
    `no companion proof is listed in ${UPSCALE_MANIFEST} — the upscale/mask pipeline is ` +
    `the book plates' and does not reach this class` +
    (proofUnderUpscale.length ? ` — ${proofUnderUpscale.map((f) => f.path).join(', ')}` : ''));
  const strayPlate = upman.files.filter((f) => !f.path.replace(/\\/g, '/').startsWith('pcm-design-images/'));
  ck(strayPlate.length === 0,
    `and the reverse: every masked/upscaled entry is still a book plate under ` +
    `pcm-design-images/ (${strayPlate.length} stray)`);
  const maskDoc = JSON.parse(fs.readFileSync(path.resolve(MASK_REGIONS), 'utf8'));
  const proofNums = new Set(proofs.map((p) => p.num));
  const maskedProof = (maskDoc.plates || []).filter((pl) =>
    (pl.book || '').toLowerCase() === 'proof' || (pl.dir || '') === PROOF_DIR ||
    (pl.img || '').startsWith(PROOF_DIR + '/'));
  ck(maskedProof.length === 0,
    `${MASK_REGIONS} names no companion proof — the photographs on this class stay` +
    (maskedProof.length ? ` — ${maskedProof.length} listed` : ''));
  ck((maskDoc.plates || []).every((pl) => pl.book === '2020' || pl.book === '2011'),
    `every photo-mask entry still belongs to a design BOOK, not to a proof or a photo`);

  // ---- the overlap census, which is why this ships as its own class ----
  const plateNums = new Set(data.designs.map((d) => d.num));
  const alsoAPlate = [...proofNums].filter((n) => plateNums.has(n));
  const proofOnly = [...proofNums].filter((n) => !plateNums.has(n));
  ck(alsoAPlate.length + proofOnly.length === proofs.length && proofOnly.length > 0,
    `${alsoAPlate.length} proof numbers are also book plates (both ship, neither replaces ` +
    `the other) and ${proofOnly.length} are designs the books never printed`);
  ck(new Set(proofs.map((p) => p.img)).size === proofs.length &&
     proofNums.size === proofs.length,
    `each proof number appears exactly once and owns exactly one file — the source's ` +
    `one duplicate (PCM 2643, shipped twice under a " (1)" copy suffix) was deduped`);
  for (const n of alsoAPlate.slice(0, 3)) {
    const plate = data.designs.find((d) => d.num === n);
    ck(/companion/i.test(plate.cat + ' ' + plate.fmt),
      `PCM ${n} overlaps a plate the book files as a companion design ` +
      `(${plate.cat} / ${plate.sub}) — the class is what it says it is`);
  }

  for (const [dir, cap] of Object.entries(spec.budgets || {})) {
    const { bytes, files } = dirBytes(dir);
    ck(bytes <= cap,
      `${dir}: ${files} files, ${(bytes / 1e6).toFixed(2)} MB ` +
      `within the ${(cap / 1e6).toFixed(0)} MB budget`);
  }

  // ---- 3. no prices, and no rendered "MIS" ----
  assertFamilyRegister(ck, PAGE, src);
  const body = src.replace(/<!--[\s\S]*?-->/g, '');
  const money = body.match(/\$\s?[\d,]+(\.\d\d)?/g) || [];
  ck(money.length === 0,
    `no prices anywhere on a design-lookup page${money.length ? ' — found ' + money.slice(0, 3) : ''}`);

  // ---- 4. drive the page ----
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  try {
    await page.goto(base + PAGE, { waitUntil: 'networkidle' });

    const dom = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.design-card')];
      return {
        designs: cards.length,
        noImg: cards.filter((c) => !c.querySelector('.product-img img[src]')).length,
        noNum: cards.filter((c) => !/^PCM \d+$/.test(
          (c.querySelector('.pcm-number') || {}).textContent || '')).length,
        numMismatch: cards.filter((c) =>
          (c.querySelector('.pcm-number') || {}).textContent !== 'PCM ' + c.dataset.num).length,
        groups: [...document.querySelectorAll('.group[data-group-cat]')].map((g) => [
          g.dataset.groupCat + ' / ' + g.dataset.groupSub,
          g.querySelectorAll('.design-card').length,
          +g.querySelector('.group-count').textContent,
        ]),
        elCats: [...document.querySelectorAll('.el-cat')].map((e) => [
          e.dataset.elCat, +e.querySelector('.el-count').textContent]),
        cardTags: cards.map((c) => [c.dataset.id, c.dataset.tags || '']),
        count: document.getElementById('filterCount').textContent,
        photos: document.querySelectorAll('.photo-card').length,
        refs: document.querySelectorAll('.reference-card').length,
        proofCards: [...document.querySelectorAll('.proof-card')].map((c) => ({
          num: c.dataset.num,
          printed: (c.querySelector('.pcm-number') || {}).textContent || '',
          img: !!c.querySelector('.product-img img[src]'),
          facets: c.dataset.facets || '',
        })),
        proofsPill: (document.getElementById('proofsCount') || {}).textContent,
      };
    });

    ck(dom.designs === data.designs.length,
      `${dom.designs} design cards in the DOM, ${data.designs.length} in the data`);
    ck(dom.noImg === 0, `every design card carries an image (${dom.noImg} without)`);
    ck(dom.noNum === 0, `every design card shows a "PCM ####" number (${dom.noNum} without)`);
    ck(dom.numMismatch === 0,
      `every printed number matches its card's data (${dom.numMismatch} disagree)`);
    // The card's tags must be exactly the resolved tags — not merely non-empty. This is
    // the check that fails when a design's tags are deleted from the curated file and the
    // page is rebuilt: the card goes blank while the data still names the design.
    const tagDrift = dom.cardTags.filter(([id, on]) =>
      on !== (tags.designTags[id] || []).join(' '));
    ck(tagDrift.length === 0,
      `every card's tags match data/pcm-catalog-tags.json` +
      (tagDrift.length ? ` — ${tagDrift.length} disagree, e.g. ${tagDrift[0][0]}` : ''));
    ck(dom.cardTags.every(([, on]) => on.trim().length > 0),
      `no design card ships with an empty tag list`);

    ck(dom.photos === data.photos.length,
      `${dom.photos} example photos rendered (${data.photos.length} in the data)`);
    ck(dom.refs === data.reference.length,
      `${dom.refs} reference plates rendered (${data.reference.length} in the data)`);

    // ---- the proof cards on the page, against the data, both directions ----
    ck(dom.proofCards.length === proofs.length,
      `${dom.proofCards.length} companion proof cards rendered (${proofs.length} in the data)`);
    ck(dom.proofsPill === String(proofs.length),
      `the proofs panel pill says ${dom.proofsPill} (data says ${proofs.length})`);
    const domProofNums = new Set(dom.proofCards.map((c) => +c.num));
    const proofNumDrift = [...proofNums].filter((n) => !domProofNums.has(n));
    ck(proofNumDrift.length === 0 && domProofNums.size === proofNums.size,
      `every proof number in the data has a card and no card invents one` +
      (proofNumDrift.length ? ` — missing ${proofNumDrift.slice(0, 4).join(', ')}` : ''));
    ck(dom.proofCards.every((c) => c.img),
      `every proof card carries an image ` +
      `(${dom.proofCards.filter((c) => !c.img).length} without)`);
    ck(dom.proofCards.every((c) => c.printed === 'PCM ' + c.num),
      `every proof card prints its own PCM number ` +
      `(${dom.proofCards.filter((c) => c.printed !== 'PCM ' + c.num).length} disagree)`);
    // The facet is what makes the sprint-12 "companion" ruling keep holding for a class
    // that has no fmt/cat/sub of its own. Checked on the card, not only in the search
    // result, so a card that lost it is named rather than merely making a count wrong.
    const noFacet = dom.proofCards.filter((c) => !/\bcompanion\b/.test(c.facets));
    ck(noFacet.length === 0,
      `every proof card carries the "companion" search facet` +
      (noFacet.length ? ` — ${noFacet.length} without, e.g. PCM ${noFacet[0].num}` : ''));

    // category counts: stated pill == cards present == the data's own census
    for (const [name, actual, stated] of dom.groups) {
      const [cat, sub] = name.split(' / ');
      const fromData = (data.designCats[cat] || {})[sub];
      ck(actual === stated && actual === fromData,
        `${name}: ${actual} cards, pill says ${stated}, data says ${fromData}`);
    }
    const domGroupTotal = dom.groups.reduce((s, g) => s + g[1], 0);
    ck(domGroupTotal === data.designs.length,
      `the groups account for every design (${domGroupTotal}/${data.designs.length})`);

    for (const [name, stated] of dom.elCats) {
      ck(stated === data.elementCats[name],
        `element category ${name}: pill says ${stated}, data says ${data.elementCats[name]}`);
    }

    // ---- 5. the jump box — the whole point of the page ----
    for (const { q, id } of LOOKUPS) {
      await page.fill('#pcmJump', q);
      await page.waitForTimeout(220);
      const hit = await page.evaluate(() => {
        const f = document.querySelector('.flash');
        return { id: f && f.dataset.id, note: document.getElementById('jumpNote').textContent };
      });
      ck(hit.id === id, `"${q}" jumps to ${id}` + (hit.id === id ? '' : ` — landed on ${hit.id}`));
    }
    // A number the design books never printed has no plate to land on; the jump falls
    // through to the proof, which is the only card that answers for it. Checked with a
    // number taken from the data, not typed here, so it cannot go stale.
    await page.fill('#pcmJump', String(proofOnly[0]));
    await page.waitForTimeout(240);
    const proofJump = await page.evaluate(() => {
      const f = document.querySelector('.flash');
      return { num: f && f.dataset.num, proof: !!(f && f.classList.contains('proof-card')) };
    });
    ck(proofJump.proof && +proofJump.num === proofOnly[0],
      `jumping to ${proofOnly[0]} lands on its companion proof card ` +
      `(got ${proofJump.num}, proof-card ${proofJump.proof})`);
    // …and a number that IS a plate still lands on the plate, not on the proof: the book
    // plate is the canonical record and the proof is the second picture of it.
    const overlapNum = alsoAPlate[0];
    await page.fill('#pcmJump', String(overlapNum));
    await page.waitForTimeout(240);
    const plateFirst = await page.evaluate(() => {
      const f = document.querySelector('.flash');
      return { id: f && f.dataset.id, proof: !!(f && f.classList.contains('proof-card')) };
    });
    ck(!plateFirst.proof && /^\d{4}-/.test(plateFirst.id || ''),
      `jumping to ${overlapNum} — a number that is both — lands on the book plate ` +
      `(${plateFirst.id}), with the proof reachable under "companion"`);

    await page.fill('#pcmJump', '999999');
    await page.waitForTimeout(200);
    const missNote = await page.textContent('#jumpNote');
    ck(/No design or element numbered/.test(missNote),
      `an unknown number says so instead of failing silently ("${missNote}")`);
    await page.fill('#pcmJump', '');

    // ---- 6. search, including into an unopened element category ----
    await page.fill('#searchInput', 'salmon');
    await page.waitForTimeout(320);
    const salmon = await page.evaluate(() => ({
      count: document.getElementById('filterCount').textContent,
      visible: [...document.querySelectorAll('.el-cat:not([hidden]) .element-card')]
        .filter((c) => c.style.display !== 'none').map((c) => c.dataset.id),
    }));
    const expectSalmon = data.elements.filter((e) => /salmon/i.test(e.code)).length;
    ck(salmon.visible.length === expectSalmon && expectSalmon > 0,
      `searching "salmon" reveals ${salmon.visible.length} elements from a category that ` +
      `was never opened (${expectSalmon} exist)`);

    // ---- 6b. SUBJECT search — "if i type in rose or flowers it should show me all the
    // pcm designs and elements that have roses or flowers" ----
    const shownFor = async (q) => {
      await page.fill('#searchInput', q);
      await page.waitForTimeout(340);
      return page.evaluate(() => ({
        designs: [...document.querySelectorAll('.design-card')]
          .filter((c) => c.style.display !== 'none').map((c) => c.dataset.id),
        elements: [...document.querySelectorAll('.el-cat:not([hidden]) .element-card')]
          .filter((c) => c.style.display !== 'none').map((c) => c.dataset.id),
        elementCount: (document.getElementById('filterCount').textContent
          .match(/([\d,]+) elements/) || [, '0'])[1].replace(/,/g, ''),
        proofs: [...document.querySelectorAll('.proof-card')]
          .filter((c) => c.style.display !== 'none').map((c) => +c.dataset.num),
        proofsPill: (document.getElementById('proofsCount') || {}).textContent,
        proofsSectionHidden: !!(document.getElementById('sec-proofs') || {}).hidden,
        chips: [...document.querySelectorAll('.design-card')]
          .filter((c) => c.style.display !== 'none')
          .map((c) => [...c.querySelectorAll('.tag.hit')].map((t) => t.dataset.tag)),
      }));
    };

    const counts = {};
    for (const probe of SUBJECT_PROBES) {
      const got = await shownFor(probe.q);
      counts[probe.q] = got.designs.length;
      const expectDesigns = taggedWith(probe.tag);
      const missingDesign = expectDesigns.filter((id) => !got.designs.includes(id));
      ck(missingDesign.length === 0,
        `"${probe.q}" returns all ${expectDesigns.length} designs tagged ${probe.tag}` +
        (missingDesign.length ? ` — missing ${missingDesign.slice(0, 3).join(', ')}` : ''));

      const expectEls = data.elements.filter((e) =>
        (tags.elementStemTags[stemOf(e.code)] || []).includes(probe.tag)).length;
      ck(expectEls === 0 || +got.elementCount >= expectEls,
        `"${probe.q}" also reaches the ${expectEls} elements tagged ${probe.tag} ` +
        `(${got.elementCount} elements shown)`);

      for (const id of probe.mustInclude || []) {
        ck(got.designs.includes(id), `"${probe.q}" finds ${id}`);
      }
      const chipped = got.chips.filter((c) => c.length).length;
      ck(chipped > 0 && chipped >= Math.min(got.designs.length, expectDesigns.length),
        `"${probe.q}" shows WHY it matched — ${chipped} of ${got.designs.length} cards ` +
        `light a tag chip`);
    }
    ck(counts['roses'] === counts['rose'],
      `"roses" and "rose" return the same ${counts['rose']} designs (plural tolerated)`);
    ck(counts['mountains'] > 0, `"mountains" returns ${counts['mountains']} designs`);

    const flowers = await shownFor('flowers');
    ck(flowers.designs.length > counts['rose'],
      `"flowers" is strictly wider than "rose" on the page ` +
      `(${flowers.designs.length} vs ${counts['rose']} designs)`);
    const roseAgain = new Set(taggedWith('rose'));
    ck([...roseAgain].every((id) => flowers.designs.includes(id)),
      `"flowers" still includes every rose design (${roseAgain.size})`);

    // A synonym that crosses vocabularies: nobody tagged a design "army", but the
    // element book names 15 of them, and "army" must reach the military ornaments.
    const army = await shownFor('army');
    const armyEls = data.elements.filter((e) =>
      (tags.elementStemTags[stemOf(e.code)] || []).includes('military')).length;
    ck(+army.elementCount >= armyEls && armyEls > 0,
      `"army" reaches the ${armyEls} military elements (${army.elementCount} shown)`);

    // Number lookup must survive the subject layer — it is the page's first job.
    const byNumber = await shownFor('1183');
    ck(byNumber.designs.length === 1 && byNumber.designs[0] === '2011-1183',
      `typing a number still narrows to that one design (got ${byNumber.designs.join(', ')})`);
    // …and so must a category word.
    const byCat = await shownFor('religious');
    const religiousInData = data.designs.filter((d) => d.sub === 'Religious').length;
    ck(byCat.designs.length >= religiousInData,
      `the category word "religious" still returns its ${religiousInData} designs ` +
      `(${byCat.designs.length} shown)`);

    // ---- 6c. FORMAT / CATEGORY search — "typing companion must show all companion
    // designs". Both sides are computed: the expected set from the catalog's own
    // fmt/cat/sub, the actual from the rendered page. ----
    const fmtCounts = {};
    for (const probe of FORMAT_PROBES) {
      const got = await shownFor(probe.q);
      const ref = probe.sameAs
        ? FORMAT_PROBES.find((p) => p.q === probe.sameAs)
        : probe;
      const expect = data.designs.filter(ref.match).map((d) => d.id);
      const expectSet = new Set(expect);
      const gotSet = new Set(got.designs);
      fmtCounts[probe.q] = got.designs.length;
      const missingIds = [...expectSet].filter((id) => !gotSet.has(id));
      const extraIds = [...gotSet].filter((id) => !expectSet.has(id));
      ck(missingIds.length === 0 && extraIds.length === 0,
        // Sets, not row counts: 2011-2271 is cross-listed, so 130 companion ROWS in the
        // data are 129 distinct designs and 130 cards on the page.
        `"${probe.q}" returns exactly the ${expectSet.size} distinct designs the data ` +
        `files as ${ref.q} — ${expect.length} rows, ${got.designs.length} cards (got ${gotSet.size}` +
        (missingIds.length ? `, missing ${missingIds.slice(0, 3).join(', ')}` : '') +
        (extraIds.length ? `, extra ${extraIds.slice(0, 3).join(', ')}` : '') + ')');
      if (ref.subset) {
        const sub = data.designs.filter(ref.subset).map((d) => d.id);
        ck(sub.every((id) => gotSet.has(id)),
          `"${probe.q}" includes every one of the ${new Set(sub).size} distinct designs ` +
          `(${sub.length} rows) whose format is literally ${ref.q}`);
      }
      // Every hit must say WHY: a lit chip on each returned card.
      const lit = got.chips.filter((c) => c.length).length;
      ck(lit === got.designs.length && lit > 0,
        `"${probe.q}" lights an explanatory chip on all ${got.designs.length} cards ` +
        `(${lit} lit)`);
    }
    ck(fmtCounts['companions'] === fmtCounts['companion'] && fmtCounts['companion'] > 0,
      `"companions" and "companion" return the same ${fmtCounts['companion']} designs`);
    ck(fmtCounts['ledgers'] === fmtCounts['ledger'] && fmtCounts['ledger'] > 0,
      `"ledgers" and "ledger" return the same ${fmtCounts['ledger']} designs`);

    // The facet chip is a NAMED chip, not merely "something lit" — a "companion" hit reads
    // "format: companion" (or "group: companion designs" for the six companion ledgers).
    await page.fill('#searchInput', 'companion');
    await page.waitForTimeout(340);
    const namedChips = await page.evaluate(() =>
      [...document.querySelectorAll('.design-card')].filter((c) => c.style.display !== 'none')
        .map((c) => [...c.querySelectorAll('.tag.hit')].map((t) => t.textContent.trim())));
    const everyCardExplains = namedChips.every((cs) => cs.some((t) => /companion/.test(t)));
    ck(everyCardExplains && namedChips.length > 0,
      `every "companion" card carries a chip naming companion ` +
      `(e.g. "${(namedChips[0] || [])[0]}")`);
    const formatChip = namedChips.filter((cs) => cs.includes('format: companion')).length;
    ck(formatChip > 0, `${formatChip} of them read exactly "format: companion"`);

    // ---- 6d. the companion ruling now spans TWO classes (sprint-17) ----------------
    // "Typing companion must show all companion designs" was written when every companion
    // design was a book plate. 232 of them are now also full-colour proofs, and a ruling
    // that quietly stopped at the class boundary would be the same failure in a new
    // costume. Both sides computed: expected from the proof data, actual from the page.
    const compHit = await shownFor('companion');
    const compPlural = await shownFor('companions');
    const missProof = [...proofNums].filter((n) => !compHit.proofs.includes(n));
    ck(missProof.length === 0 && compHit.proofs.length === proofs.length,
      `"companion" returns all ${proofs.length} companion proofs as well as the design ` +
      `cards (${compHit.proofs.length} shown` +
      (missProof.length ? `, missing ${missProof.slice(0, 4).join(', ')}` : '') + ')');
    ck(compPlural.proofs.length === compHit.proofs.length,
      `"companions" reaches the same ${compHit.proofs.length} proofs — the plural ` +
      `tolerance is on the facet path this class uses, not only on the tag path`);
    ck(compHit.proofsPill === `${proofs.length} of ${proofs.length}`,
      `the proofs pill reports the search the way an element category does ` +
      `("${compHit.proofsPill}")`);
    // Specificity, so the facet is a real match and not "the proofs always show". A
    // format word this class is NOT must return none of them, and an unrelated subject
    // word must hide the section outright.
    const indiv = await shownFor('individual');
    ck(indiv.proofs.length === 0,
      `"individual" returns no companion proofs (${indiv.proofs.length}) — the facet ` +
      `discriminates instead of matching everything`);
    const noise = await shownFor('zzzznotathing');
    ck(noise.proofs.length === 0 && noise.proofsSectionHidden,
      `a word that matches nothing hides the proofs section instead of leaving 232 ` +
      `cards on screen`);
    // The number path, for the 113 designs the books never printed: those have no plate
    // to jump to, so the proof is the only card that answers.
    const proofOnlyNum = proofOnly[0];
    const byProofNum = await shownFor(String(proofOnlyNum));
    ck(byProofNum.proofs.includes(proofOnlyNum),
      `searching ${proofOnlyNum} — a number the books never printed — finds its proof`);
    await page.fill('#searchInput', '');
    await page.waitForTimeout(240);

    // The subject layer must not have moved. Both sides computed from the tag data.
    const rosesNow = await shownFor('roses');
    const roseExpect = taggedWith('rose');
    const roseEls = data.elements.filter((e) =>
      (tags.elementStemTags[stemOf(e.code)] || []).includes('rose')).length;
    ck(rosesNow.designs.length === roseExpect.length,
      `the subject baseline holds: "roses" still returns ${rosesNow.designs.length} designs ` +
      `(${roseExpect.length} tagged rose)`);
    ck(+rosesNow.elementCount === roseEls && roseEls > 0,
      `"roses" still reaches ${rosesNow.elementCount} elements (${roseEls} tagged rose)`);

    await page.fill('#searchInput', 'zzzznotathing');
    await page.waitForTimeout(320);
    const none = await page.evaluate(() => ({
      designs: [...document.querySelectorAll('.design-card')].filter((c) => c.style.display !== 'none').length,
      empty: !document.getElementById('emptyNote').hidden,
    }));
    ck(none.designs === 0 && none.empty, 'a no-match search empties the page and says so');

    await page.fill('#searchInput', '');
    await page.waitForTimeout(320);
    const back = await page.evaluate(() =>
      [...document.querySelectorAll('.design-card')].filter((c) => c.style.display !== 'none').length);
    ck(back === data.designs.length, `clearing the search restores all ${back} designs`);

    // ---- 7. facets ----
    const color = data.designs.find((d) => d.color).color;
    await page.selectOption('#colorFilter', color);
    await page.waitForTimeout(320);
    const shown = await page.evaluate(() =>
      [...document.querySelectorAll('.design-card')].filter((c) => c.style.display !== 'none').length);
    const want = data.designs.filter((d) => d.color === color).length;
    ck(shown === want, `granite color "${color}" filters to ${shown} designs (${want} exist)`);
    await page.click('#clearFilters');
    await page.waitForTimeout(320);
    const cleared = await page.evaluate(() =>
      [...document.querySelectorAll('.design-card')].filter((c) => c.style.display !== 'none').length);
    ck(cleared === data.designs.length, `Clear restores all ${cleared} designs`);

    // ---- 9. Installed Examples is a panel you can fold away ------------------------
    // Operator, mid-sprint-14: "the real examples needs to have its own toggle option
    // just like the design books and elements do." The thirty-five photographs used to
    // be a fixed block at the bottom with no control over them at all.
    //
    // It is checked by LAYOUT, not by a class name: `.open` is what the CSS keys off,
    // but a rule deleted from the stylesheet would leave the class toggling merrily on
    // a panel that never actually folds. getClientRects().length is what a reader sees.
    const exOpen = await page.evaluate(() => ({
      exists: !!document.getElementById('elcat-examples'),
      bar: !!document.querySelector('#elcat-examples .el-toggle'),
      aria: (document.querySelector('#elcat-examples .el-toggle') || {}).ariaExpanded ||
        (document.querySelector('#elcat-examples .el-toggle') || document.createElement('i'))
          .getAttribute('aria-expanded'),
      count: (document.getElementById('examplesCount') || {}).textContent,
      laidOut: [...document.querySelectorAll('.photo-card')]
        .filter((c) => c.getClientRects().length > 0).length,
      elCats: document.querySelectorAll('.el-cat').length,
    }));
    ck(exOpen.exists && exOpen.bar,
      'Installed Examples has its own toggle bar, the same shape as an element category');
    ck(exOpen.aria === 'true' && exOpen.laidOut === data.photos.length,
      `it starts open — all ${data.photos.length} photographs laid out ` +
      `(${exOpen.laidOut}), aria-expanded ${exOpen.aria}`);
    ck(exOpen.count === String(data.photos.length),
      `the bar states the count the data has (${exOpen.count} vs ${data.photos.length})`);
    // The panel must NOT be an .el-cat: everything above reads every .el-cat as an
    // element category with a count that has to match the element data, and a photo
    // panel wearing that class reported itself as a category with no data behind it.
    ck(exOpen.elCats === CENSUS.elements.cats,
      `the photo panel is not counted as an element category ` +
      `(${exOpen.elCats} .el-cat, ${CENSUS.elements.cats} expected)`);

    await page.click('#elcat-examples .el-toggle');
    await page.waitForTimeout(200);
    const exShut = await page.evaluate(() => ({
      aria: document.querySelector('#elcat-examples .el-toggle').getAttribute('aria-expanded'),
      laidOut: [...document.querySelectorAll('.photo-card')]
        .filter((c) => c.getClientRects().length > 0).length,
      barStillThere: document.querySelector('#elcat-examples .el-toggle')
        .getClientRects().length > 0,
    }));
    ck(exShut.aria === 'false' && exShut.laidOut === 0,
      `one click folds all ${data.photos.length} photographs away ` +
      `(${exShut.laidOut} laid out, aria-expanded ${exShut.aria})`);
    ck(exShut.barStillThere,
      'the bar itself stays on the page when folded, so it can be opened again');

    await page.click('#elcat-examples .el-toggle');
    await page.waitForTimeout(200);
    const exBack = await page.evaluate(() => ({
      aria: document.querySelector('#elcat-examples .el-toggle').getAttribute('aria-expanded'),
      laidOut: [...document.querySelectorAll('.photo-card')]
        .filter((c) => c.getClientRects().length > 0).length,
    }));
    ck(exBack.aria === 'true' && exBack.laidOut === data.photos.length,
      `a second click brings all ${data.photos.length} back (${exBack.laidOut})`);

    // The count follows a search the way an element category's does ("6 of 35"), which is
    // the whole point of "the same kind of toggle" — one convention, not two.
    const exProbe = data.photos[0].desc.split(/[ ,]/).filter((w) => w.length > 5)[0];
    await page.fill('#searchInput', exProbe);
    await page.waitForTimeout(340);
    const exSearch = await page.evaluate(() => ({
      count: document.getElementById('examplesCount').textContent,
      shown: [...document.querySelectorAll('.photo-card')]
        .filter((c) => c.style.display !== 'none').length,
    }));
    ck(/^\d+ of \d+$/.test(exSearch.count) &&
       exSearch.count === `${exSearch.shown} of ${data.photos.length}`,
      `searching "${exProbe}" restates the count as "${exSearch.count}"`);
    await page.fill('#searchInput', '');
    await page.waitForTimeout(340);

    // ---- 10. compare, across designs AND elements ----------------------------------
    // Scope decision (Track D): a 2020 design, a 2011 design and an ornament are three
    // things that could end up on one marker, and all three carry a number. Installed
    // photographs and the reference plates are not alternatives you pick between and
    // carry no number, so they have no checkbox.
    await page.fill('#pcmJump', 'BASS 001');
    await page.waitForTimeout(320);
    await page.fill('#pcmJump', '');
    await page.waitForTimeout(200);

    const cbCensus = await page.evaluate(() => ({
      designs: document.querySelectorAll('.design-card .compare-cb').length,
      designCards: document.querySelectorAll('.design-card').length,
      elements: document.querySelectorAll('.element-card .compare-cb').length,
      elementCards: document.querySelectorAll('.element-card').length,
      photos: document.querySelectorAll('.photo-card .compare-cb').length,
      refs: document.querySelectorAll('.reference-card .compare-cb').length,
      max: window.bwCompareMax,
    }));
    ck(cbCensus.designs === cbCensus.designCards && cbCensus.designs === data.designs.length,
      `every one of the ${cbCensus.designs} design cards carries a compare checkbox`);
    ck(cbCensus.elements === cbCensus.elementCards && cbCensus.elements > 0,
      `a lazily-built element category gets its checkboxes too ` +
      `(${cbCensus.elements} of ${cbCensus.elementCards} rendered element cards)`);
    ck(cbCensus.photos === 0 && cbCensus.refs === 0,
      'photographs and reference plates carry none — they are not alternatives you pick');

    // The overlay's ONLY view is the plates — the operator removed the Side-by-Side
    // spec table entirely (2026-08-04): the book/group/granite rows were noise next to
    // the designs themselves. So what is asserted here is the plates grid, plus the
    // POSITIVE ABSENCE of the spec table and its tabs: a well-meaning restore of either
    // is exactly the regression this now catches.
    const MIXED = ['2020-717', '2011-1182', 'BASS 001'];
    const mixed = await page.evaluate((keys) => {
      window.bwCompareSelect(keys);
      document.getElementById('compareOpenBtn').click();
      const cols = [...document.querySelectorAll('#comparePhotoGrid .compare-photo-col')];
      return {
        open: document.getElementById('compareOverlay').classList.contains('active'),
        chips: document.querySelectorAll('#compareTrayItems .compare-chip').length,
        count: document.getElementById('compareCount').textContent,
        names: cols.map((c) => c.querySelector('.compare-photo-name').textContent.trim()),
        details: cols.map((c) =>
          (c.querySelector('.compare-photo-detail') || {}).textContent || ''),
        plates: cols.filter((c) => {
          const i = c.querySelector('.compare-photo-img-wrap img');
          return i && i.getAttribute('src');
        }).length,
        specTable: !!(document.getElementById('compareTable') ||
                      document.querySelector('.compare-table')),
        tabs: !!(document.getElementById('compareTabSpecs') ||
                 document.getElementById('compareTabPhotos') ||
                 document.querySelector('.compare-tab')),
        marked: [...document.querySelectorAll('.product-card.comparing')].length,
      };
    }, MIXED);
    ck(mixed.open && mixed.chips === 3 && mixed.count === '3',
      `three items across two books and the element library compare together ` +
      `(${mixed.chips} in the tray)`);
    ck(mixed.names.join('|') === 'PCM 717|PCM 1182|BASS 001',
      `the plates are headed by number (${mixed.names.join(', ')})`);
    ck(mixed.plates === 3 && mixed.details.every((d) => d.trim().length > 0),
      `every column shows its plate with a one-line detail under it (${mixed.plates})`);
    ck(!mixed.specTable && !mixed.tabs,
      'the Side-by-Side spec table and its view tabs are genuinely gone from the DOM');
    // 2011-2271 is cross-listed, so one key can own two cards; both must light up.
    ck(mixed.marked >= 3, `every selected card is marked on the page (${mixed.marked})`);

    // The cap, exercised through .click() rather than by assigning .checked — a disabled
    // checkbox ignores a click and happily accepts an assignment, so assigning would
    // test the assertion instead of the cap.
    const capped = await page.evaluate(() => {
      window.bwCompareSelect([]);
      document.getElementById('compareClose').click();
      const cbs = [...document.querySelectorAll('.design-card .compare-cb')].slice(0, 6);
      cbs.forEach((cb) => { if (!cb.checked) cb.click(); });
      const all = [...document.querySelectorAll('.compare-cb')];
      return { count: document.getElementById('compareCount').textContent,
               checked: all.filter((c) => c.checked).length,
               lockedOut: all.filter((c) => !c.checked && c.disabled).length,
               msg: document.getElementById('compareTrayMsg').textContent.trim() };
    });
    ck(capped.count === String(cbCensus.max) && capped.checked === cbCensus.max &&
       capped.lockedOut > 0 && capped.msg.length > 0,
      `compare caps at ${cbCensus.max} and locks the rest out ` +
      `(${capped.checked} ticked, ${capped.lockedOut} disabled)`);

    // ---- 10b. the compare SHEET fits one page -- it is position:fixed and CLIPS -------
    // s09 Track K found a footer at y=636 of a 1056px page precisely because overflow
    // there means vanished rows. The plates make this sharper than it was for caskets:
    // a ledger is 10:13, so at the 2-item width cap it is 434px tall.
    //
    // "Nothing overflows the sheet" is NOT enough on its own here, and this is the trap
    // that cost the first version of these checks: `.cmp-table` carries overflow:hidden
    // for its rounded corner, so a table whose rows no longer fit CLIPS THEM AND REPORTS
    // NO OVERFLOW. Padding the label cells to 80px was proven to lose four of the seven
    // comparison rows while `scrollHeight - clientHeight` stayed 0. So the assertion that
    // does the work is geometric: the last row's bottom edge is inside the table, and the
    // footer's bottom edge is inside the page.
    await page.setViewportSize({ width: 816, height: 1056 });
    // The LEDGER leads the list on purpose — 10:13 is the tallest thing this sheet can be
    // asked to lay out. Only ONE print mode exists now: the plates (the spec-table mode
    // went with the Side-by-Side view, operator 2026-08-04).
    const ledgerId = data.designs.find((d) => d.fmt === 'ledger').id;
    const plateWidth = {};
    for (const n of [2, 3, 4]) {
      const keys = [ledgerId, '2020-717', '2011-1182', 'BASS 001'].slice(0, n);
      const geo = await page.evaluate((keys) => {
        window.bwCompareSelect(keys);
        window.bwBuildCompareSheet();
        document.body.classList.add('compare-printing');
        return { title: document.getElementById('cmpTitle').textContent };
      }, keys);
      await page.emulateMedia({ media: 'print' });
      await page.waitForTimeout(120);
      const m = await page.evaluate(() => {
        const s = document.getElementById('compareSheet');
        const nodes = [...s.querySelectorAll('.cmp-photo-row .cmp-photo-imgwrap img')];
        const box = s.querySelector('.cmp-photo-row');
        const last = [...s.querySelectorAll('.cmp-photo-col')].pop();
        return {
          over: s.scrollHeight - s.clientHeight, h: s.clientHeight,
          imgs: nodes.length,
          gridCols: box ? getComputedStyle(box).gridTemplateColumns.split(' ').length : 0,
          specTable: !!s.querySelector('.cmp-table'),
          widest: nodes.length
            ? Math.max(...nodes.map((i) => Math.round(i.getBoundingClientRect().width))) : 0,
          spill: last && box
            ? Math.round(last.getBoundingClientRect().bottom - box.getBoundingClientRect().bottom)
            : 999,
          footSpill: Math.round(
            s.querySelector('.cmp-footer').getBoundingClientRect().bottom - s.clientHeight),
        };
      });
      const pdf = await page.pdf({ format: 'Letter', printBackground: true });
      const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
      await page.emulateMedia({ media: 'screen' });
      await page.evaluate(() => document.body.classList.remove('compare-printing'));

      plateWidth[n] = m.widest;
      ck(m.over === 0 && pages === 1 && m.spill <= 1 && m.footSpill <= 1,
        `compare sheet, ${n} plates: the last column ends ${-m.spill}px inside the row, ` +
        `the footer ${-m.footSpill}px inside the page, and the real PDF is ${pages} page`);
      ck(m.imgs === n, `…all ${n} plates reach the sheet (${m.imgs})`);
      // One full-width column up to three plates, a 2x2 at four — the layout the
      // operator asked for ("one top left one top right one bottom left one bottom
      // right") and the one that renders each 16:10 plate biggest on a portrait page.
      ck(m.gridCols === (n <= 3 ? 1 : 2),
        `…${n} plates lay out in ${m.gridCols} column${m.gridCols === 1 ? '' : 's'}`);
      ck(!m.specTable, '…and no spec table rides along on the sheet');
      ck(geo.title === 'Design Plates', `…the sheet is headed "${geo.title}"`);
    }
    // Fewer plates = bigger plate: at 2 the single column gives each plate the full
    // page width; at 4 the 2x2 halves it. Checked as an ordering, not constants.
    ck(plateWidth[2] > plateWidth[4] && plateWidth[4] > 0,
      `the plate grows as fewer are compared — ${plateWidth[4]}px at 4, ` +
      `${plateWidth[2]}px at 2`);
    await page.evaluate(() => { window.bwCompareSelect([]); });
    await page.setViewportSize({ width: 1440, height: 1000 });

    // ---- 11. print what is on screen -------------------------------------------------
    // Unlike the compare sheet, this one is a static-flow stack of fixed-height pages, so
    // the assertion is that it genuinely PAGINATES: the DOM says k pages of PER_PAGE, and
    // a real Chromium PDF has k pages. A CSS-presence check would pass on a sheet that
    // renders 12 of 167.
    // The jump to BASS 001 above left its category open, and an open category's cards
    // are genuinely on screen — so close it, or the "nothing filtered" baseline below is
    // 700 designs plus a few thousand ornaments and says nothing about either.
    await page.evaluate(() => {
      document.querySelectorAll('.el-cat.open').forEach((box) => {
        box.querySelector('.el-toggle').click();
      });
    });
    await page.click('#clearFilters');
    await page.waitForTimeout(320);
    const perPage = await page.evaluate(() => window.bwFilteredPerPage);
    ck(perPage === 12,
      `${perPage} designs per printed page — a plate is 16:10 and carries no spec list, ` +
      `so a 3x4 grid fills the sheet where the casket sheets' 3 would not`);

    const allBtn = await page.evaluate(() => ({
      n: window.bwShownCardCount(),
      text: document.getElementById('filterPrintBtn').textContent.replace(/\s+/g, ' ').trim(),
      disabled: document.getElementById('filterPrintBtn').disabled,
    }));
    ck(allBtn.n === data.designs.length,
      `with nothing filtered the button offers the ${allBtn.n} designs — and not the ` +
      `${data.elements.length} elements, none of whose categories is open`);
    ck(allBtn.text === `Print these ${allBtn.n.toLocaleString()} · ` +
                       `${Math.ceil(allBtn.n / perPage)} pages` && !allBtn.disabled,
      `the button states what it will print ("${allBtn.text}")`);

    await page.fill('#searchInput', 'elk');
    await page.waitForTimeout(340);
    const sheet = await page.evaluate(() => {
      const n = window.bwShownCardCount();
      const pages = window.bwBuildFilteredSheet();
      const pageEls = [...document.querySelectorAll('#filterSheet .fs-page')];
      const onPage = [...document.querySelectorAll('#filterSheet .fs-name')]
        .map((x) => x.textContent.trim());
      const onScreen = [];
      document.querySelectorAll('.design-card, .element-card').forEach((c) => {
        if (c.style.display === 'none') return;
        const g = c.closest('.group'); if (g && g.hidden) return;
        const b = c.closest('.el-cat');
        if (b && (b.hidden || !b.classList.contains('open'))) return;
        onScreen.push((c.querySelector('.pcm-number') || {}).textContent.trim());
      });
      return {
        n, pages, pageEls: pageEls.length,
        perPageCounts: pageEls.map((p) => p.querySelectorAll('.fs-item').length),
        items: document.querySelectorAll('#filterSheet .fs-item').length,
        onPage, onScreen,
        photos: document.querySelectorAll('#filterSheet .fs-photo img').length,
        mastheads: pageEls.filter((p) => p.querySelector('.fs-masthead')).length,
        footers: pageEls.map((p) => (p.querySelector('.fs-pageno') || {}).textContent || ''),
        filterLine: (document.querySelector('#filterSheet .fs-filters') || {}).textContent || '',
        btn: document.getElementById('filterPrintBtn').textContent.replace(/\s+/g, ' ').trim(),
      };
    });
    const wantPages = Math.ceil(sheet.n / perPage);
    ck(sheet.n > perPage,
      `"elk" leaves ${sheet.n} cards on screen — more than one page, so pagination is ` +
      `actually exercised`);
    ck(sheet.pages === wantPages && sheet.pageEls === wantPages,
      `the sheet paginates ${sheet.n} cards into ${wantPages} pages of ${perPage} ` +
      `(built ${sheet.pageEls})`);
    ck(sheet.items === sheet.n && sheet.onPage.join('|') === sheet.onScreen.join('|'),
      `every card on screen reaches the sheet, in order, none dropped ` +
      `(${sheet.items} vs ${sheet.n})`);
    ck(sheet.perPageCounts.slice(0, -1).every((k) => k === perPage) &&
       sheet.perPageCounts[sheet.perPageCounts.length - 1] === (sheet.n % perPage || perPage),
      `full pages hold exactly ${perPage}, the last holds the remainder ` +
      `(${sheet.perPageCounts.join(', ')})`);
    ck(sheet.photos === sheet.n, `every printed card carries its plate (${sheet.photos})`);
    ck(sheet.mastheads === wantPages &&
       sheet.footers.every((f, i) => f === `Page ${i + 1} of ${wantPages}`),
      `a running masthead and a "Page k of n" footer on every page`);
    ck(/elk/i.test(sheet.filterLine),
      `the sheet names the filter it was printed from ("${sheet.filterLine}")`);
    ck(sheet.btn === `Print these ${sheet.n} · ${wantPages} page` +
                     (wantPages === 1 ? '' : 's'),
      `the button follows the filter ("${sheet.btn}")`);

    await page.setViewportSize({ width: 816, height: 1056 });
    await page.evaluate(() => document.body.classList.add('filter-printing'));
    await page.emulateMedia({ media: 'print' });
    await page.waitForTimeout(150);
    const fpdf = await page.pdf({ format: 'Letter', printBackground: true });
    const fpages = (fpdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    const fgeo = await page.evaluate(() => {
      const s = document.getElementById('filterSheet');
      const ps = [...s.querySelectorAll('.fs-page')];
      return { over: s.scrollHeight - s.clientHeight,
               heights: ps.map((p) => Math.round(p.getBoundingClientRect().height)),
               tops: ps.map((p) => Math.round(p.getBoundingClientRect().top)) };
    });
    await page.emulateMedia({ media: 'screen' });
    await page.evaluate(() => document.body.classList.remove('filter-printing'));
    await page.setViewportSize({ width: 1440, height: 1000 });
    ck(fpages === wantPages,
      `the printed PDF really has ${wantPages} pages (${fpages}) — the check the ` +
      `clipping compare sheet could not pass`);
    ck(new Set(fgeo.heights).size === 1 && fgeo.over === 0 &&
       fgeo.tops.every((t, i) => i === 0 || t > fgeo.tops[i - 1]),
      `pages stack below one another, all one sheet tall (${fgeo.heights[0]}px)`);

    // Nothing to print prints nothing — and does not leave the page in printing state.
    const empty = await page.evaluate(() => {
      document.getElementById('searchInput').value = 'zzzznotathing';
      applyFilters();
      window.printFiltered();
      return { n: window.bwShownCardCount(),
               disabled: document.getElementById('filterPrintBtn').disabled,
               printing: document.body.classList.contains('filter-printing'),
               pages: document.querySelectorAll('#filterSheet .fs-page').length };
    });
    ck(empty.n === 0 && empty.disabled && !empty.printing,
      'an empty result disables the button and prints nothing');

    // ---- 11b. neither sheet may leak into an ordinary print ---------------------------
    // This is what keeps the page's DEFAULT print output byte-for-byte what it was before
    // compare and print-what-is-filtered existed: both sheets and every checkbox are
    // display:none in print media until a body class asks for them.
    await page.click('#clearFilters');
    await page.waitForTimeout(320);
    await page.emulateMedia({ media: 'print' });
    const leak = await page.evaluate(() => {
      const g = (id) => getComputedStyle(document.getElementById(id)).display;
      const cb = document.querySelector('.compare-toggle');
      return { compareSheet: g('compareSheet'), filterSheet: g('filterSheet'),
               tray: g('compareTray'), overlay: g('compareOverlay'),
               toggle: cb ? getComputedStyle(cb).display : 'missing',
               btn: getComputedStyle(document.getElementById('filterPrintBtn')).display,
               classes: document.body.className };
    });
    await page.emulateMedia({ media: 'screen' });
    ck(leak.compareSheet === 'none' && leak.filterSheet === 'none' &&
       leak.tray === 'none' && leak.overlay === 'none' &&
       leak.toggle === 'none' && leak.btn === 'none' && leak.classes === '',
      `plain print media renders none of it — sheets, tray, overlay, checkbox and ` +
      `button all display:none (${JSON.stringify(leak)})`);

    // ---- 8. page health ----
    // The lightbox <img> carries no src until something is clicked; an image with no src
    // is not a broken image, and counting it would have made this check permanently red.
    const broken = await page.evaluate(() =>
      [...document.images].filter((i) => i.getAttribute('src') && i.complete && i.naturalWidth === 0)
        .map((i) => i.getAttribute('src')));
    ck(broken.length === 0,
      `no broken images${broken.length ? ' — e.g. ' + broken.slice(0, 3).join(', ') : ''}`);
    ck(errors.length === 0, `no JS errors${errors.length ? ' — ' + errors[0] : ''}`);
  } finally {
    await browser.close();
  }
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` ||
    process.argv[1].endsWith('verify_pcm_catalog.mjs')) {
  let pass = 0, fail = 0;
  const ck = (cond, msg) => {
    if (cond) { pass++; console.log('  PASS  ' + msg); }
    else { fail++; console.log('  FAIL  ' + msg); }
  };
  const base = process.env.BW_BASE || 'http://localhost:3737/';
  await run(ck, base.endsWith('/') ? base : base + '/');
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
