// Shared hash grammar + the map->tool arrival handoff. Fake Firebase only.
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
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 160)); });
await page.addInitScript(FAKE);
await page.addInitScript(`window.__fake.addAccount('tester@bwquote.local','pw');`);
await page.goto('http://localhost:' + (process.env.PORT || 3737) + '/', { waitUntil: 'load', timeout: 120000 });
await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('tester@bwquote.local', 'pw'));
await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });

// ── 1. Grammar ───────────────────────────────────────────────────────────────────────
console.log('\n1. Hash grammar');
const cases = [
  ['#cem-quote',                          'cem-quote', {}],
  ['#space=33709',                        'space',     { space: '33709' }],
  ['#section=VETS_N',                     'section',   { section: 'VETS_N' }],
  ['#cem-quote?space=33709',              'cem-quote', { space: '33709' }],
  ['#cem-quote?space=33709&loc=Sec-21%20Blk-1%20Lot-B%20Sp-4', 'cem-quote', { space: '33709', loc: 'Sec-21 Blk-1 Lot-B Sp-4' }],
  ['#search?q=smith&kind=deceased',       'search',    { q: 'smith', kind: 'deceased' }],
  ['#/cem-quote?space=1',                 'cem-quote', { space: '1' }],
  ['#cem-quote?flag',                     'cem-quote', { flag: '' }],
  ['#search?q=van+der+berg',              'search',    { q: 'van der berg' }],
];
for (const [hash, route, params] of cases) {
  const got = await page.evaluate(h => { location.hash = h; return _bwParseHash(); }, hash);
  ok(`${hash}`, got.route === route && JSON.stringify(got.params) === JSON.stringify(params), got);
}

// indoor address with internal hyphens must survive intact
const indoor = await page.evaluate(() => {
  location.hash = '#cem-quote?space=41022&loc=' + encodeURIComponent('Bldg-MVC Wall-I/S-FW Lvl-F Sp-6');
  return _bwParseHash().params.loc;
});
ok('indoor loc with hyphens and slash round-trips', indoor === 'Bldg-MVC Wall-I/S-FW Lvl-F Sp-6', indoor);

// ── 2. Arrival handler ───────────────────────────────────────────────────────────────
console.log('\n2. Map -> tool arrival');
await page.evaluate(() => { location.hash = '#home'; });
await page.waitForTimeout(150);
const arrive = await page.evaluate(async () => {
  location.hash = '#cem-quote?space=33709&loc=' + encodeURIComponent('Sec-21 Blk-1 Lot-B Sp-4');
  await new Promise(r => setTimeout(r, 300));
  return {
    active: [...document.querySelectorAll('.section')].filter(s => s.classList.contains('active')).map(s => s.id),
    incoming: window._bwPendingSpace['cem'],
    locField: (document.getElementById('qSpaceLocation') || {}).value,
    params: bwRouteParams(),
  };
});
ok('switches to the cemetery builder', arrive.active.join() === 'section-cem-quote', arrive.active);
ok('captures the sid', arrive.incoming && arrive.incoming.sid === '33709', arrive.incoming);
ok('fills the location field', arrive.locField === 'Sec-21 Blk-1 Lot-B Sp-4', arrive.locField);
ok('exposes params', arrive.params.space === '33709', arrive.params);

// second arrival, same section, different space — must not be swallowed
const second = await page.evaluate(async () => {
  location.hash = '#cem-quote?space=99999&loc=' + encodeURIComponent('Sec-23 Blk-2 Lot-A Sp-1');
  await new Promise(r => setTimeout(r, 300));
  return { incoming: window._bwPendingSpace['cem'], locField: document.getElementById('qSpaceLocation').value };
});
ok('a second space on the same section still fires', second.incoming.sid === '99999', second.incoming);
ok('does NOT overwrite a location already filled', second.locField === 'Sec-21 Blk-1 Lot-B Sp-4', second.locField);

// ── 3. Regressions ───────────────────────────────────────────────────────────────────
console.log('\n3. Plain routing still works');
const plain = await page.evaluate(async () => {
  location.hash = '#ric-contract';
  await new Promise(r => setTimeout(r, 250));
  const a = [...document.querySelectorAll('.section')].filter(s => s.classList.contains('active')).map(s => s.id);
  document.querySelector('.nav-item[onclick^="show(\'fh-quote\'"]').click();
  await new Promise(r => setTimeout(r, 250));
  return { afterHash: a, afterClick: location.hash };
});
ok('bare route still navigates', plain.afterHash.join() === 'section-ric-contract', plain.afterHash);
ok('clicking a tab writes a bare hash', plain.afterClick === '#fh-quote', plain.afterClick);

const bad = await page.evaluate(async () => {
  location.hash = '#not-a-section?space=1';
  await new Promise(r => setTimeout(r, 250));
  return [...document.querySelectorAll('.section')].filter(s => s.classList.contains('active')).map(s => s.id);
});
ok('unknown route with params is ignored', bad.join() === 'section-fh-quote', bad);

// ── 4. Outbound link builder ─────────────────────────────────────────────────────────
console.log('\n4. Links out to the map');
const urls = await page.evaluate(() => ({
  space: bwMapUrl('space', '33709'),
  section: bwMapUrl('section', 'VETS_N'),
  spacey: bwMapUrl('section', '17_S_Sundial'),
}));
ok('space link', urls.space.endsWith('#space=33709'), urls.space);
ok('section link', urls.section.endsWith('#section=VETS_N'), urls.section);
ok('sanitized code needs no escaping', urls.spacey.endsWith('#section=17_S_Sundial'), urls.spacey);

ok('no page errors', errs.length === 0, errs);
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
