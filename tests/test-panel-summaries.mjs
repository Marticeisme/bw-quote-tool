// Panel value summaries (sprint-19 Track B, DESIGN_HANDOFF §2). Checks: collapse still works, summaries track the recalc, the money in a
// header equals what the running total is built from, and the topbar demotion is scoped to
// the builder views. Fake Firebase only; nothing writes.
import { chromium } from 'playwright';
import fs from 'fs';
import { BASE } from './_base.mjs';
const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
await page.addInitScript(FAKE);
await page.addInitScript(`window.__fake.addAccount('t@bwquote.local','pw');`);
await page.goto(BASE, { waitUntil: 'load', timeout: 120000 });
await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('t@bwquote.local', 'pw'));
await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
await page.evaluate(() => { location.hash = '#cem-quote'; });
await page.waitForTimeout(500);

// 1. every builder panel has a summary and it says "Not set" on an empty quote
const empty = await page.evaluate(() => {
  const p = [...document.querySelectorAll('#section-cem-quote .q-panel[data-qs], #section-fh-quote .q-panel[data-qs], #section-combined-quote .q-panel[data-qs]')];
  return {
    panels: p.length,
    withSum: p.filter(x => x.querySelector(':scope > .q-panel-header > .q-panel-sum')).length,
    notSet: p.filter(x => (x.querySelector(':scope > .q-panel-header > .q-panel-sum') || {}).textContent === 'Not set').length,
  };
});
ok('all 39 builder panels carry a .q-panel-sum', empty.panels === 39 && empty.withSum === 39, empty);
ok('an empty quote reads "Not set" on every panel', empty.notSet === 39, empty);

// 2. the header row is 44px and the icon carries no chip fill
const geom = await page.evaluate(() => {
  const h = document.querySelector('#section-cem-quote .q-panel[data-qs] > .q-panel-header');
  const ic = h.querySelector('.ph-ic');
  const cs = getComputedStyle(ic);
  return { h: h.getBoundingClientRect().height, bg: cs.backgroundColor, w: cs.width, border: cs.borderTopWidth };
});
ok('panel header is 44px', Math.round(geom.h) === 44, geom);
ok('the icon has no chip fill and is 16px', /rgba\(0, 0, 0, 0\)|transparent/.test(geom.bg) && geom.w === '16px' && geom.border === '0px', geom);

// 3. fill a quote; the header money must equal the sum of the lines it covers
await page.evaluate(() => {
  const g = document.getElementById('qGarden');
  for (const o of g.options) if (o.value && /garden/i.test(o.text)) { g.value = o.value; break; }
  g.dispatchEvent(new Event('change', { bubbles: true }));
  document.getElementById('qOCLawnSingle').checked = true;
  document.getElementById('qOCLawnSingle').dispatchEvent(new Event('change', { bubbles: true }));
  cemUpdate();
});
await page.waitForTimeout(300);
const filled = await page.evaluate(() => {
  const g = (k) => document.querySelector('#section-cem-quote .q-panel[data-qs="' + k + '"] > .q-panel-header > .q-panel-sum').textContent;
  const spaceLines = _cemLines.filter(l => l.isSpace);
  return {
    space: g('cem:space'), oc: g('cem:oc'), vault: g('cem:vault'),
    spaceSum: spaceLines.reduce((a, l) => a + l.amount, 0),
    ocLine: (_cemLines.find(l => /Lawn Interment/.test(l.label)) || {}).amount,
  };
});
const money = (t) => Number(String(t).replace(/^.*·\s*/, '').replace(/[$,]/g, ''));
ok('Burial Space money == the space lines the total is built from',
  money(filled.space) === filled.spaceSum, filled);
ok('Opening & Closing money == its own line', money(filled.oc) === filled.ocLine, filled);
ok('an untouched panel still reads "Not set"', filled.vault === 'Not set', filled);
ok('the summary names the garden, not just a count', /Garden/i.test(filled.space), filled);

// 4. collapse still works, and the summary survives it
const coll = await page.evaluate(() => {
  const p = document.querySelector('#section-cem-quote .q-panel[data-qs="cem:space"]');
  const before = { collapsed: p.classList.contains('collapsed'), bodyVisible: getComputedStyle(p.querySelector('.q-panel-body')).display !== 'none' };
  p.querySelector('.q-panel-header').click();
  const after = {
    collapsed: p.classList.contains('collapsed'),
    bodyVisible: getComputedStyle(p.querySelector('.q-panel-body')).display !== 'none',
    chev: getComputedStyle(p.querySelector('.q-chev')).transform,
    sum: p.querySelector('.q-panel-sum').textContent,
    sumVisible: p.querySelector('.q-panel-sum').getBoundingClientRect().width > 0,
  };
  p.querySelector('.q-panel-header').click();
  return { before, after, reopened: !p.classList.contains('collapsed') };
});
ok('clicking the header collapses the panel', !coll.before.collapsed && coll.after.collapsed && !coll.after.bodyVisible, coll);
ok('the chevron still rotates when collapsed', coll.after.chev !== 'none' && coll.after.chev !== 'matrix(1, 0, 0, 1, 0, 0)', coll.after.chev);
ok('the value summary persists while collapsed', coll.after.sumVisible && /Garden/i.test(coll.after.sum), coll.after);
ok('clicking again reopens it', coll.reopened, coll);

// 5. no collapse animation (motion rule: no transitions on transform/height)
const motion = await page.evaluate(() => {
  const b = document.querySelector('#section-cem-quote .q-panel-body');
  const c = document.querySelector('#section-cem-quote .q-chev');
  const d = (e) => ({ prop: getComputedStyle(e).transitionProperty, dur: getComputedStyle(e).transitionDuration });
  return { body: d(b), chev: d(c) };
});
ok('no collapse animation: zero transition duration on the body and the chevron',
  motion.body.dur === '0s' && motion.chev.dur === '0s', motion);

// 6. topbar orange demoted on a builder view, restored off it
const orange = await page.evaluate(() => {
  const b = document.querySelector('.tb-action');
  const on = getComputedStyle(b).backgroundColor;
  location.hash = '#price-list';
  return { onBuilder: on };
});
await page.waitForTimeout(400);
const off = await page.evaluate(() => getComputedStyle(document.querySelector('.tb-action')).backgroundColor);
ok('topbar action is NOT orange on a quote builder', orange.onBuilder === 'rgb(255, 255, 255)', orange);
ok('topbar action is orange again off the builders', off === 'rgb(232, 70, 16)', off);

// 7. controls picked up the 36px / ring treatment
await page.evaluate(() => { location.hash = '#cem-quote'; });
await page.waitForTimeout(400);
const ctl = await page.evaluate(() => {
  const sel = document.getElementById('qGarden');
  const cs = getComputedStyle(sel);
  sel.focus();
  const f = getComputedStyle(sel);
  return { h: cs.height, radius: cs.borderTopLeftRadius, bg: cs.backgroundColor, shadow: f.boxShadow, outline: f.outlineStyle };
});
ok('builder selects are 36px with the 6px radius', ctl.h === '36px' && ctl.radius === '6px', ctl);
ok('focus paints the --ring, not an outline', /rgba\(70, 110, 134/.test(ctl.shadow), ctl);

ok('no page errors', errs.length === 0, errs);
console.log('\n' + pass + ' passed, ' + fail + ' failed');
await browser.close();
process.exit(fail ? 1 : 0);
