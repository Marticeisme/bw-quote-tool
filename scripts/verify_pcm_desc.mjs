#!/usr/bin/env node
// verify_pcm_desc.mjs - gate for the curated PCM description files.
//
// Written for sprint-21 Track B1 (data/pcm-desc-singles.json) and deliberately
// generic so Track B2 can point it at the companion file without editing it.
//
// Usage:
//   node scripts/verify_pcm_desc.mjs <desc-file.json> [expected-source]
//
// <desc-file.json>  the curated file: { _provenance: {...}, designs: { "<id>": {...} } }
// [expected-source] where the authoritative id list comes from. Optional; when
//                   omitted the file's own _provenance.sources is used. Accepts:
//                     - a directory of PCM*.jpg proofs (ids are the filename stem
//                       minus the "PCM" prefix, so PCM1148-2.jpg -> "1148-2")
//                     - a .txt file, one id per line
//                     - a .json file that is either an array of ids or an object
//                       whose keys are ids
//
// Checks:
//   1  every id in the source is present in designs, and nothing extra is present
//   2  _provenance.count matches the number of entries
//   3  title and desc are non-empty strings; title is 2-6 words
//   4  desc contains no em dash (voice rule) and is a single sentence
//   5  every tag is in the vocabulary of data/pcm-subject-tags.json, plus the
//      FLAGGED_ADDITIONS allowlist below; tags are non-empty and unique
//   6  language is null or one of LANGUAGES
//   7  a non-null language is also stated in the desc, so plain text search finds it
//   8  piiFlag, when present, is boolean true
//
// Exit code 0 = green, 1 = failures (each printed).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');

// Vocabulary slugs this gate accepts on top of data/pcm-subject-tags.json.
// Anything added here must also be reported to the operator, not slipped in.
// s21 director ruling 2026-08-07: menorah (B2: 2517/2528, B1 wanted it for 1528),
// horseshoe (2642), snowman (2654, 1654) -- reported to the operator in the wave-1
// report. Track C adds them to the shared vocabulary proper.
const FLAGGED_ADDITIONS = ['menorah', 'horseshoe', 'snowman'];

const LANGUAGES = [
  'vietnamese', 'spanish', 'chinese', 'korean', 'japanese', 'russian',
  'hebrew', 'arabic', 'tagalog', 'samoan', 'german', 'italian', 'polish',
  'portuguese', 'french', 'ukrainian', 'armenian', 'greek', 'latin',
];

const failures = [];
const fail = (msg) => failures.push(msg);

function idsFromSource(src) {
  const st = fs.existsSync(src) ? fs.statSync(src) : null;
  if (!st) throw new Error(`expected-source not found: ${src}`);
  if (st.isDirectory()) {
    const files = fs.readdirSync(src);
    const jpg = files
      .filter((f) => /^PCM.+\.jpe?g$/i.test(f))
      .map((f) => f.replace(/\.jpe?g$/i, '').slice(3))
      // a proof that failed to download is an HTML error page, not an image
      .filter((id) => fs.statSync(path.join(src, `PCM${id}.jpg`)).size > 8 * 1024);
    if (jpg.length) return jpg;
    // repo image directories (pcm-companion-images/, pcm-single-images/) name their
    // encoded outputs <id>.webp; the id is the whole stem.
    return files.filter((f) => f.endsWith('.webp')).map((f) => f.slice(0, -5));
  }
  const raw = fs.readFileSync(src, 'utf8');
  if (src.toLowerCase().endsWith('.json')) {
    const o = JSON.parse(raw);
    return Array.isArray(o) ? o.map(String) : Object.keys(o.designs || o);
  }
  return raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

function main() {
  const [descPath, sourceArg] = process.argv.slice(2);
  if (!descPath) {
    console.error('usage: node scripts/verify_pcm_desc.mjs <desc-file.json> [expected-source]');
    process.exit(2);
  }

  const doc = JSON.parse(fs.readFileSync(descPath, 'utf8'));
  const designs = doc.designs;
  if (!designs || typeof designs !== 'object') {
    console.error(`${descPath}: no "designs" object`);
    process.exit(1);
  }

  const vocabPath = path.join(REPO, 'data', 'pcm-subject-tags.json');
  const vocab = new Set([
    ...Object.keys(JSON.parse(fs.readFileSync(vocabPath, 'utf8')).vocabulary),
    ...FLAGGED_ADDITIONS,
  ]);

  const source = sourceArg || doc._provenance?.sources;
  if (!source) fail('no expected-source given and _provenance.sources is empty');

  const ids = Object.keys(designs);

  // 1 - coverage against the authoritative id list
  if (source) {
    const want = idsFromSource(source);
    const have = new Set(ids);
    const missing = want.filter((n) => !have.has(n));
    const extra = ids.filter((n) => !want.includes(n));
    if (missing.length) fail(`missing ${missing.length} design(s): ${missing.slice(0, 20).join(', ')}`);
    if (extra.length) fail(`${extra.length} design(s) not in the source: ${extra.slice(0, 20).join(', ')}`);
    if (!missing.length && !extra.length) {
      console.log(`coverage: ${want.length}/${want.length} designs from ${source}`);
    }
  }

  // 2 - declared count
  const declared = doc._provenance?.count;
  if (declared !== undefined && declared !== ids.length) {
    fail(`_provenance.count is ${declared} but there are ${ids.length} entries`);
  }

  const langCount = {};
  let piiCount = 0;

  for (const id of ids) {
    const d = designs[id];
    const at = (m) => fail(`${id}: ${m}`);

    // 3 - title and desc present, title 2-6 words
    if (typeof d.title !== 'string' || !d.title.trim()) at('empty title');
    else {
      const w = d.title.trim().split(/\s+/).length;
      if (w < 2 || w > 6) at(`title is ${w} words, want 2-6: "${d.title}"`);
    }
    if (typeof d.desc !== 'string' || !d.desc.trim()) at('empty desc');
    else {
      // 4 - voice rules
      if (/[—–]/.test(d.desc)) at('desc contains an em or en dash');
      if (!/[.!?]$/.test(d.desc.trim())) at('desc does not end in a full stop');
      const sentences = d.desc.trim().replace(/[.!?]$/, '').split(/[.!?]\s+/).length;
      if (sentences > 2) at(`desc looks like ${sentences} sentences, want one`);
    }

    // 5 - tags
    if (!Array.isArray(d.tags) || d.tags.length === 0) at('no tags');
    else {
      const seen = new Set();
      for (const t of d.tags) {
        if (typeof t !== 'string' || !t.trim()) at('empty tag');
        else if (!vocab.has(t)) at(`tag not in vocabulary: "${t}"`);
        else if (seen.has(t)) at(`duplicate tag: "${t}"`);
        seen.add(t);
      }
    }

    // 6/7 - language
    if (d.language !== null && d.language !== undefined) {
      if (!LANGUAGES.includes(d.language)) at(`language not allowed: "${d.language}"`);
      else if (typeof d.desc === 'string' && !d.desc.toLowerCase().includes(d.language)) {
        at(`language is "${d.language}" but the desc never says so`);
      }
      langCount[d.language] = (langCount[d.language] || 0) + 1;
    } else if (!('language' in d)) {
      at('no language field (use null for English)');
    }

    // 8 - piiFlag
    if ('piiFlag' in d) {
      if (d.piiFlag !== true) at('piiFlag present but not true');
      else piiCount += 1;
    }
  }

  const langs = Object.entries(langCount).map(([k, v]) => `${k}=${v}`).join(' ') || 'none';
  console.log(`entries: ${ids.length}  non-English: ${langs}  piiFlag: ${piiCount}`);
  if (FLAGGED_ADDITIONS.length) {
    console.log(`flagged vocabulary additions in use: ${FLAGGED_ADDITIONS.join(', ')}`);
  }

  if (failures.length) {
    console.error(`\n${path.basename(descPath)}: ${failures.length} FAILURE(S)`);
    for (const f of failures) console.error('  ' + f);
    process.exit(1);
  }
  console.log(`${path.basename(descPath)}: OK`);
}

main();
