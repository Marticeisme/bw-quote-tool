// Screenshot a local page. Usage: node scripts/shot.mjs <file.html> <out.png> [height]
import { chromium } from 'playwright';
import path from 'path';
import { pathToFileURL } from 'url';

const [file, out, h] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: Number(h) || 1400 } });
await page.goto(pathToFileURL(path.resolve(file)).href, { waitUntil: 'networkidle' });
await page.screenshot({ path: out });
await browser.close();
console.log('wrote', out);
