// Hash router: URL mirrors the visible section, deep links work, Back/Forward work,
// bad hashes are ignored, and show()'s side effects don't re-run on our own hash echo.
// Fake Firebase only — production is never contacted.
import { chromium } from 'playwright';
import fs from 'fs';
import { BASE } from './_base.mjs';

const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };

const SEED = { quotes: { cem: { q1: { id: 1, label: 'A Family', total: 100, date: 'x', state: { fields: {} } } } } };

async function open(browser, hash = '') {
  const ctx = await browser.newContext();
  await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 160)); });
  await page.addInitScript(FAKE);
  await page.addInitScript(`window.__fake.addAccount('tester@bwquote.local','pw');`);
  await page.addInitScript(`(${(s) => window.__fake.seed(s)}).call(null, ${JSON.stringify(SEED)});`);
  await page.goto(BASE + (hash ? 'index.html' + hash : ''), { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('tester@bwquote.local', 'pw'));
  await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
  await page.waitForTimeout(250);
  return { ctx, page, errs };
}

const state = page => page.evaluate(() => ({
  hash: location.hash,
  active: [...document.querySelectorAll('.section')].filter(s => s.classList.contains('active')).map(s => s.id),
  activeNav: [...document.querySelectorAll('.nav-item.active')].map(n => (n.getAttribute('onclick') || '').match(/show\('([^']+)'/)?.[1]),
}));

const browser = await chromium.launch();

// ── 1. Clicking a tab writes the URL ─────────────────────────────────────────────────
console.log('\n1. Navigation updates the URL');
{
  const { ctx, page, errs } = await open(browser);
  const start = await state(page);
  ok('opens on Home with no hash', start.active.join() === 'section-home' && start.hash === '', start);

  await page.evaluate(() => document.querySelector('.nav-item[onclick^="show(\'cem-quote\'"]').click());
  await page.waitForTimeout(200);
  let s = await state(page);
  ok('hash reflects the section', s.hash === '#cem-quote', s);
  ok('section switched', s.active.join() === 'section-cem-quote', s);
  ok('nav highlighted', s.activeNav.join() === 'cem-quote', s);

  await page.evaluate(() => document.querySelector('.nav-item[onclick^="show(\'ric-contract\'"]').click());
  await page.waitForTimeout(200);
  s = await state(page);
  ok('second navigation updates too', s.hash === '#ric-contract' && s.active.join() === 'section-ric-contract', s);
  ok('only one section active at a time', s.active.length === 1, s);
  ok('only one nav highlighted', s.activeNav.length === 1, s);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ── 2. Deep link straight into a section ─────────────────────────────────────────────
console.log('\n2. Deep links');
for (const id of ['ric-contract', 'cem-saved', 'combined-quote', 'an-contract']) {
  const { ctx, page } = await open(browser, '#' + id);
  const s = await state(page);
  ok(`#${id} opens that section`, s.active.join() === 'section-' + id, s);
  ok(`#${id} highlights its nav`, s.activeNav.join() === id, s);
  await ctx.close();
}

// ── 3. Tolerates the #/id form ───────────────────────────────────────────────────────
console.log('\n3. #/id form also works');
{
  const { ctx, page } = await open(browser, '#/fh-quote');
  const s = await state(page);
  ok('#/fh-quote resolves', s.active.join() === 'section-fh-quote', s);
  await ctx.close();
}

// ── 4. A bad hash must not blank the app ─────────────────────────────────────────────
console.log('\n4. Unknown / hostile hashes');
for (const bad of ['#does-not-exist', '#', '#section-cem-quote', '#../../etc']) {
  const { ctx, page, errs } = await open(browser, bad);
  const s = await state(page);
  ok(`${bad} leaves Home showing`, s.active.join() === 'section-home', { bad, ...s });
  ok(`${bad} throws nothing`, errs.length === 0, errs);
  await ctx.close();
}

// ── 5. Back / Forward ────────────────────────────────────────────────────────────────
console.log('\n5. Browser history');
{
  const { ctx, page, errs } = await open(browser);
  await page.evaluate(() => document.querySelector('.nav-item[onclick^="show(\'cem-quote\'"]').click());
  await page.waitForTimeout(150);
  await page.evaluate(() => document.querySelector('.nav-item[onclick^="show(\'fh-quote\'"]').click());
  await page.waitForTimeout(150);

  await page.goBack(); await page.waitForTimeout(250);
  let s = await state(page);
  ok('Back returns to the previous tab', s.active.join() === 'section-cem-quote' && s.hash === '#cem-quote', s);
  ok('Back re-highlights the right nav', s.activeNav.join() === 'cem-quote', s);

  await page.goForward(); await page.waitForTimeout(250);
  s = await state(page);
  ok('Forward moves ahead again', s.active.join() === 'section-fh-quote' && s.hash === '#fh-quote', s);

  await page.goBack(); await page.goBack(); await page.waitForTimeout(250);
  s = await state(page);
  ok('Back twice reaches Home', s.active.join() === 'section-home', s);
  ok('no page errors through history', errs.length === 0, errs);
  await ctx.close();
}

// ── 6. Reload keeps you where you were ───────────────────────────────────────────────
console.log('\n6. Reload preserves the section');
{
  const { ctx, page } = await open(browser);
  await page.evaluate(() => document.querySelector('.nav-item[onclick^="show(\'ga-contract\'"]').click());
  await page.waitForTimeout(150);
  await page.reload({ waitUntil: 'load' });
  await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('tester@bwquote.local', 'pw'));
  await page.waitForTimeout(400);
  const s = await state(page);
  ok('still on the same section after reload', s.active.join() === 'section-ga-contract', s);
  await ctx.close();
}

// ── 7. The hash echo must not re-run show()'s side effects ───────────────────────────
console.log("\n7. No duplicate show() work from our own hash write");
{
  const { ctx, page } = await open(browser);
  const calls = await page.evaluate(async () => {
    // buildPriceIndex() is show()'s heaviest side effect (it rescans the DOM for ~841 prices).
    // Count it to prove the hashchange echo is being ignored rather than re-entering show().
    let n = 0;
    const orig = window.buildPriceIndex;
    window.buildPriceIndex = function () { n++; return orig.apply(this, arguments); };
    document.querySelector('.nav-item[onclick^="show(\'price-list\'"]').click();
    await new Promise(r => setTimeout(r, 400));
    return { n, hash: location.hash };
  });
  ok('price index rebuilt exactly once', calls.n === 1, calls);
  ok('hash still correct', calls.hash === '#price-list', calls);
  await ctx.close();
}

// ── 8. Every section is reachable by URL ─────────────────────────────────────────────
console.log('\n8. All sections routable');
{
  const { ctx, page } = await open(browser);
  const ids = await page.evaluate(() => [...document.querySelectorAll('.section[id^="section-"]')].map(s => s.id.replace('section-', '')));
  let bad = [];
  for (const id of ids) {
    const okOne = await page.evaluate(async (id) => {
      location.hash = '#' + id;
      await new Promise(r => setTimeout(r, 90));
      const s = document.getElementById('section-' + id);
      return !!(s && s.classList.contains('active'));
    }, id);
    if (!okOne) bad.push(id);
  }
  ok(`all ${ids.length} sections reachable by hash`, bad.length === 0, bad);
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
