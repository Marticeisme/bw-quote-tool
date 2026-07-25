// Parses every inline <script> block in index.html. One JS error takes the whole tool
// down for both counselors, so this is the hard gate before any push.
// Run from the repo root: `npm run check`
import fs from 'fs';

const FILE = process.argv[2] || 'index.html';
const s = fs.readFileSync(FILE, 'utf8');

const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
let m, blocks = 0, bad = 0;
while ((m = re.exec(s))) {
  blocks++;
  try {
    new Function(m[1]);
  } catch (e) {
    bad++;
    const line = s.slice(0, m.index).split(/\r?\n/).length;
    console.log('ERR block ' + blocks + ' (starts line ' + line + '): ' + e.message);
  }
}

console.log(FILE + ': ' + blocks + ' blocks, ' + bad + ' errors');
process.exit(bad ? 1 : 0);
