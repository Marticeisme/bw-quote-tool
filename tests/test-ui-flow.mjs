// End-to-end through the real UI: click Save, confirm the record lands, reload, click Load.
// Fake Firebase only — production is never contacted.
import { chromium } from 'playwright';
import fs from 'fs';

const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };

const browser = await chromium.launch();
const ctx = await browser.newContext();
await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
// The two firebase SDK <script src> loads are aborted by this test on purpose, so their
// "Failed to load resource" noise is expected and not a page fault.
page.on('console', m => {
  if (m.type() !== 'error') return;
  const t = m.text();
  if (/Failed to load resource/.test(t)) return;
  errs.push('console: ' + t.slice(0, 160));
});
await page.addInitScript(FAKE);
await page.addInitScript(`window.__fake.addAccount('tester@bwquote.local', 'pw');`);
await page.goto('http://localhost:3737/', { waitUntil: 'load', timeout: 120000 });
await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('tester@bwquote.local', 'pw'));
await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });

// Save a cemetery quote through the actual button handler.
page.on('dialog', async d => {
  if (d.type() === 'prompt') await d.accept('Playwright Test Family');
  else await d.accept();
});

await page.evaluate(() => {
  const n = document.getElementById('cemClientName');
  if (n) { n.value = 'Playwright Test Family'; n.dispatchEvent(new Event('input', { bubbles: true })); }
});

const saveBtn = await page.evaluate(() => {
  const b = document.querySelector('button[onclick="saveCemQuote()"]');
  return b ? b.textContent.trim() : null;
});
console.log('  (cem save button: ' + JSON.stringify(saveBtn) + ')');

await page.evaluate(() => {
  const b = document.querySelector('button[onclick="saveCemQuote()"]');
  b.click();
});
await page.waitForTimeout(600);

const afterSave = await page.evaluate(() => {
  const cem = window.__fake.get('quotes/cem') || {};
  const keys = Object.keys(cem);
  return {
    keys,
    rec: keys.length ? cem[keys[0]] : null,
    writes: window.__fake.log().filter(l => !['once', 'signIn', 'signOut'].includes(l.op)),
    listCount: _cemSavedQuotes.length,
    listHtml: (document.getElementById('cemSavedQuotes') || {}).innerHTML || '',
    visibleSection: [...document.querySelectorAll('.section')].filter(s => s.offsetParent !== null).map(s => s.id),
  };
});

ok('clicking Save wrote exactly one record', afterSave.keys.length === 1, afterSave.keys);
ok('write was a single set() on that record path',
  afterSave.writes.length === 1 && afterSave.writes[0].op === 'set' && /^quotes\/cem\/q\d+$/.test(afterSave.writes[0].path),
  afterSave.writes);
ok('record carries the typed label', afterSave.rec && afterSave.rec.label === 'Playwright Test Family', afterSave.rec && afterSave.rec.label);
ok('record carries captured state', !!(afterSave.rec && afterSave.rec.state && afterSave.rec.state.fields));
ok('saved list shows it', afterSave.listCount === 1 && afterSave.listHtml.includes('Playwright Test Family'));
ok('navigated to the saved-quotes section', afterSave.visibleSection.includes('section-cem-saved'), afterSave.visibleSection);

// Reload with that data already in the DB — simulates coming back tomorrow.
const dump = await page.evaluate(() => window.__fake.dump());
const ctx2 = await browser.newContext();
await ctx2.route(/gstatic\.com\/firebasejs/, r => r.abort());
const p2 = await ctx2.newPage();
p2.on('pageerror', e => errs.push('reload: ' + e.message));
await p2.addInitScript(FAKE);
await p2.addInitScript(`window.__fake.addAccount('tester@bwquote.local', 'pw');`);
await p2.addInitScript(`(${(s) => window.__fake.seed(s)}).call(null, ${JSON.stringify(dump)});`);
await p2.goto('http://localhost:3737/', { waitUntil: 'load', timeout: 120000 });
await p2.evaluate(() => _fbAuth.signInWithEmailAndPassword('tester@bwquote.local', 'pw'));
await p2.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
await p2.waitForTimeout(400);

const afterReload = await p2.evaluate(() => ({
  count: _cemSavedQuotes.length,
  label: (_cemSavedQuotes[0] || {}).label,
  html: (document.getElementById('cemSavedQuotes') || {}).innerHTML.includes('Playwright Test Family'),
  bootWrites: window.__fake.log().filter(l => !['once', 'signIn', 'signOut'].includes(l.op)),
}));
ok('record survives a reload', afterReload.count === 1 && afterReload.label === 'Playwright Test Family', afterReload);
ok('saved list rendered on load', afterReload.html);
ok('boot performed no writes', afterReload.bootWrites.length === 0, afterReload.bootWrites);

// Load it back into the builder.
const loaded = await p2.evaluate(() => {
  const id = _cemSavedQuotes[0].id;
  loadSavedCemQuote(id);
  return {
    name: (document.getElementById('cemClientName') || {}).value,
    visible: [...document.querySelectorAll('.section')].filter(s => s.offsetParent !== null).map(s => s.id),
  };
});
ok('Load restores the client name', loaded.name === 'Playwright Test Family', loaded.name);
ok('Load switches back to the builder', loaded.visible.includes('section-cem-quote'), loaded.visible);

// Delete through the UI button.
const afterDelete = await p2.evaluate(() => {
  window.__fake.clearLog();
  const id = _cemSavedQuotes[0].id;
  deleteSavedQuote('cem', id);
  return {
    remaining: Object.keys(window.__fake.get('quotes/cem') || {}),
    writes: window.__fake.log().filter(l => !['once', 'signIn', 'signOut'].includes(l.op)),
    listCount: _cemSavedQuotes.length,
  };
});
ok('delete removed the record', afterDelete.remaining.length === 0, afterDelete.remaining);
ok('delete issued one remove()', afterDelete.writes.length === 1 && afterDelete.writes[0].op === 'remove', afterDelete.writes);
ok('list emptied', afterDelete.listCount === 0);

ok('no page errors anywhere', errs.length === 0, errs);

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
