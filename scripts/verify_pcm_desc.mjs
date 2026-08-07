#!/usr/bin/env node
// Validate a PCM design-description file (data/pcm-desc-*.json).
//
//   node scripts/verify_pcm_desc.mjs <descFile> <numbersSource> [--allow=tag,tag]
//
// <numbersSource> is either a directory of proof images (PCM<num>.jpg /
// Headstone-Design-PCM-<num>.jpg / <num>.webp) or a .json file holding an array of
// numbers, or {"nums": [...]}.  Every describable number must have an entry; every
// entry must have a non-empty title and desc, no em dash, tags drawn from the
// vocabulary in data/pcm-subject-tags.json (plus any --allow additions), and a
// language from the allowlist.
//
// Written for sprint-21 Track B1; Track B2 reuses it unchanged.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');

const LANGUAGES = new Set([
  'vietnamese', 'spanish', 'chinese', 'japanese', 'korean', 'hebrew', 'russian',
  'ukrainian', 'arabic', 'tagalog', 'samoan', 'german', 'italian', 'french',
  'portuguese', 'polish', 'greek', 'thai', 'khmer', 'lao', 'hindi', 'punjabi',
  'amharic', 'somali', 'latin'
]);

const args = process.argv.slice(2);
const allowFlag = args.find(a => a.startsWith('--allow='));
const extraTags = allowFlag ? allowFlag.slice('--allow='.length).split(',').map(s => s.trim()).filter(Boolean) : [];
const [descPath, numsPath] = args.filter(a => !a.startsWith('--'));

if (!descPath || !numsPath) {
  console.error('usage: node scripts/verify_pcm_desc.mjs <descFile> <numbersSourceDirOrJson> [--allow=tag,tag]');
  process.exit(2);
}

const errors = [];
const warn = [];
const fail = m => errors.push(m);

// ---- expected numbers -------------------------------------------------------
function numbersFrom(src) {
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    const out = new Set();
    for (const f of fs.readdirSync(src)) {
      const m = f.match(/(?:^PCM[- ]?|Headstone-Design-PCM-|^)(\d+)\.(jpg|jpeg|png|webp)/i);
      if (m) out.add(m[1]);
    }
    return [...out];
  }
  const j = JSON.parse(fs.readFileSync(src, 'utf8'));
  const arr = Array.isArray(j) ? j : (j.nums || j.numbers);
  if (!Array.isArray(arr)) throw new Error(numsPath + ': expected an array or {nums:[...]}');
  return arr.map(String);
}

const expected = numbersFrom(numsPath);
const desc = JSON.parse(fs.readFileSync(descPath, 'utf8'));
const designs = desc.designs || {};
const unavailable = (desc._unavailable && desc._unavailable.numbers) || [];

// ---- vocabulary -------------------------------------------------------------
const vocabFile = path.join(REPO, 'data/pcm-subject-tags.json');
const vocab = new Set(Object.keys(JSON.parse(fs.readFileSync(vocabFile, 'utf8')).vocabulary));
for (const t of extraTags) vocab.add(t);

// ---- checks -----------------------------------------------------------------
const have = new Set(Object.keys(designs));
const skip = new Set(unavailable.map(String));

for (const n of expected) {
  if (have.has(n)) continue;
  if (skip.has(n)) { warn.push('number ' + n + ' declared unavailable (no proof image), not described'); continue; }
  fail('missing entry for design ' + n);
}
for (const n of have) {
  if (!expected.includes(n)) fail('entry ' + n + ' is not in the expected number source');
}
for (const n of skip) {
  if (have.has(n)) fail('number ' + n + ' is listed unavailable but also has an entry');
}

const usedTags = new Map();
const langCount = new Map();
for (const [n, d] of Object.entries(designs)) {
  const at = w => 'design ' + n + ': ' + w;
  if (typeof d.title !== 'string' || !d.title.trim()) fail(at('empty title'));
  if (typeof d.desc !== 'string' || !d.desc.trim()) fail(at('empty desc'));
  if (typeof d.desc === 'string') {
    if (d.desc.includes('—')) fail(at('desc contains an em dash'));
    if (d.desc.includes('–')) fail(at('desc contains an en dash'));
    if (!/[.!?]$/.test(d.desc.trim())) fail(at('desc does not end in a full stop'));
  }
  if (typeof d.title === 'string' && d.title.includes('—')) fail(at('title contains an em dash'));
  if (!Array.isArray(d.tags)) fail(at('tags is not an array'));
  else {
    if (new Set(d.tags).size !== d.tags.length) fail(at('duplicate tags'));
    for (const t of d.tags) {
      if (!vocab.has(t)) fail(at('tag not in vocabulary: ' + t));
      usedTags.set(t, (usedTags.get(t) || 0) + 1);
    }
  }
  if (!('language' in d)) fail(at('missing language field'));
  else if (d.language !== null) {
    if (!LANGUAGES.has(d.language)) fail(at('language not in allowlist: ' + d.language));
    langCount.set(d.language, (langCount.get(d.language) || 0) + 1);
  }
  if ('piiFlag' in d && d.piiFlag !== true) fail(at('piiFlag present but not true'));
}

const declared = desc._provenance && desc._provenance.count;
if (declared !== undefined && declared !== Object.keys(designs).length) {
  fail('_provenance.count ' + declared + ' does not match ' + Object.keys(designs).length + ' entries');
}

// ---- report -----------------------------------------------------------------
console.log(path.basename(descPath) + ': ' + Object.keys(designs).length + ' described, ' +
  expected.length + ' in scope, ' + skip.size + ' unavailable, ' + usedTags.size + ' distinct tags');
if (langCount.size) {
  console.log('languages: ' + [...langCount].sort((a, b) => b[1] - a[1]).map(([k, v]) => k + '=' + v).join(', '));
}
const pii = Object.entries(designs).filter(([, d]) => d.piiFlag).map(([n]) => n);
console.log('piiFlag: ' + pii.length + (pii.length ? ' (' + pii.join(', ') + ')' : ''));
for (const w of warn) console.log('note: ' + w);
if (extraTags.length) console.log('vocabulary additions allowed: ' + extraTags.join(', '));
if (errors.length) {
  for (const e of errors) console.error('FAIL ' + e);
  console.error(errors.length + ' errors');
  process.exit(1);
}
console.log('OK');
