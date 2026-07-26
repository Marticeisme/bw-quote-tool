// GATE 0 / step 3 — capture the generator baseline on UNMODIFIED main.
// Read-only against the repo: writes artifacts OUTSIDE it (temp), never to Firebase.
// Firebase is blocked at the network layer AND stubbed, so production cannot be touched.
//
// Run BEFORE any externalization edit. The post-change run must reproduce these signatures.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUT = process.env.BASELINE_OUT ||
  path.join(process.env.TEMP || '/tmp', 'bw-baseline', process.env.TAG || 'before');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
const BLOCK = /firebaseio|googleapis|gstatic|firebaseapp|google-analytics/i;

// Deterministic fixture. Values are synthetic; nothing here comes from a real record.
const FIX = {
  name: 'Aaron Prescott', first: 'Aaron', last: 'Prescott',
  phone: '2065550147', city: 'Seattle', email: 'aprescott@example.com',
};

// Pinned wall clock for every capture. Changing this invalidates the recorded baseline —
// re-capture both sides if you ever do. Local time, mid-morning, unambiguously AM.
const CLOCK = '2026-07-01T10:00:00';

const browser = await chromium.launch();

async function open() {
  const ctx = await browser.newContext({ acceptDownloads: true });
  await ctx.route('**/*', (r) => (BLOCK.test(r.request().url()) ? r.abort() : r.continue()));
  const page = await ctx.newPage();
  // Freeze the clock BEFORE any app code runs. Without this the baseline is not reproducible:
  // the RIC stamps a "Time" field and AM/PM checkboxes from the wall clock and a "25th July"
  // ordinal from the date, and the quote PDFs print "Valid through <today+30>". A capture on
  // 07-25 and one on 07-26 differed on 5 of 12 signatures with index.html untouched — which
  // makes the 141-field RIC map, the designated template-swap detector, useless as an equality
  // check. Deterministic input beats normalizing the symptom out of the output afterwards.
  // setFixedTime pins Date.now() without pausing timers, so the app's setTimeout work still runs.
  await page.clock.setFixedTime(new Date(CLOCK));
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('dialog', async (d) => { errs.push('dialog: ' + d.message().slice(0, 120)); await d.accept(); });
  await page.addInitScript(FAKE);
  await page.addInitScript(`window.__fake.addAccount('t@bwquote.local','pw');`);
  await page.goto('http://localhost:3737/', { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('t@bwquote.local', 'pw'));
  await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
  await page.waitForTimeout(300);
  return { ctx, page, errs };
}

// Per-module population. Returns whatever identifying detail we should pin in the manifest,
// so a later drift in dropdown order is visible rather than silently changing the baseline.
const SETUP = {
  cem: async (page, f) => page.evaluate(async (fx) => {
    show('cem-quote', null);
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    set('cemClientName', fx.name);
    const g = document.getElementById('qGarden');
    const opt = [...g.options].find((o) => /\|/.test(o.value));
    g.value = opt.value;
    const oc = document.getElementById('qOCNiche'); if (oc) oc.checked = true;
    cemUpdateD();
    await new Promise((r) => setTimeout(r, 250));
    return { garden: opt.value, total: window._cemTotal, lines: (window._cemLines || []).length };
  }, f),
  fh: async (page, f) => page.evaluate(async (fx) => {
    show('fh-quote', null);
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    set('fhClientName', fx.name);
    const sel = document.getElementById('fhBurialPlan');
    const opt = sel && [...sel.options].find((o) => /^\d{3,}/.test(o.value));
    if (opt) { sel.value = opt.value; fhPlanChange('burial'); }
    fhUpdate();
    await new Promise((r) => setTimeout(r, 250));
    return { plan: opt && opt.value, total: window._fhTotal, lines: (window._fhLines || []).length };
  }, f),
  ric: async (page, f) => page.evaluate((fx) => {
    show('ric-contract', null);
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    set('ricName', fx.name); set('ricPhone', fx.phone); set('ricCity', fx.city);
    return { name: fx.name };
  }, f),
  ga: async (page, f) => page.evaluate((fx) => {
    show('ga-contract', null);
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    set('gaInsuredName', fx.name);
    return { name: fx.name };
  }, f),
  cp: async (page, f) => page.evaluate((fx) => {
    show('cp-contract', null);
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    set('cpFirstName', fx.first); set('cpLastName', fx.last);
    return { name: fx.first + ' ' + fx.last };
  }, f),
  an: async (page, f) => page.evaluate((fx) => {
    show('an-contract', null);
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    set('anPurchName', fx.name); set('anPurchCellPhone', fx.phone); set('anPurchCity', fx.city);
    return { name: fx.name };
  }, f),
};

// The Combined quote keeps its OWN state (_combCemLines/_combFhLines) — populating the
// cemetery and funeral builders is not enough, the values have to be pulled across.
SETUP.comb = async (page) => page.evaluate(async () => {
  show('comb-quote', null);
  _syncCombinedCemetery();
  _syncCombinedFuneral();
  combUpdate();
  await new Promise((r) => setTimeout(r, 250));
  return { cemLines: (window._combCemLines || []).length, fhLines: (window._combFhLines || []).length,
    total: (window._combCemTotal || 0) + (window._combFhTotal || 0) };
});

// printGAContract is generated FROM the funeral-home quote: gaLines() reads the frozen
// _gaPricing snapshot that gaImportFromFH() takes off _fhLines. Without the import it alerts
// ("No Funeral Home Quote data found") and returns, producing no download at all — the same
// fixture trap as the RIC. It is the ONLY generator that exercises GA_PDF's main path.
SETUP.gaImport = async (page, f) => page.evaluate((fx) => {
  show('ga-contract', null);
  gaImportFromFH();
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
  set('gaInsuredName', fx.name);
  return { name: fx.name, lines: gaLines().length, total: gaTotal() };
}, f);

// ClearPoint's cremation path appends page index 8 of GA_PDF as the Cremation Authorization.
// The burial default never loads GA_PDF at all, so without this the second GA_PDF call site
// (index.html:15270) has no coverage either. The radio is read at generation time and has no
// change handler, so setting .checked is sufficient.
SETUP.cpCrem = async (page, f) => page.evaluate((fx) => {
  show('cp-contract', null);
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
  set('cpFirstName', fx.first); set('cpLastName', fx.last);
  document.querySelector('input[name="cpDisposition"][value="Cremation"]').checked = true;
  return { name: fx.first + ' ' + fx.last, disposition: 'Cremation' };
}, f);

// key -> [modules to populate first, window function to call (defaults to the key)].
// The key names the SCENARIO, not the function, so one generator can be captured on two
// paths — generateClearPointContract runs burial and cremation as separate signatures.
// The RIC contract is generated FROM a cemetery quote, so 'cem' is a prerequisite, not optional.
const GENERATORS = [
  ['downloadCemQuotePDF',       ['cem']],
  ['downloadFhQuotePDF',        ['fh']],
  ['downloadCombQuotePDF',      ['cem', 'fh', 'comb']],
  ['generateRICContract',       ['cem', 'ric']],
  ['generateRICFromTab',        ['cem', 'ric']],
  ['generateClearPointContract', ['cp']],
  ['generateCirgasPacket',      ['an']],
  ['riclGeneratePdf',           ['ric']],
  ['anclGeneratePdf',           ['an']],
  ['gaclGeneratePdf',           ['ga']],
  ['cpclGeneratePdf',           ['cp']],
  ['clDownloadFilledWorksheet', ['cem']],
  ['printGAContract',           ['fh', 'gaImport']],
  ['generateClearPointContract_cremation', ['cpCrem'], 'generateClearPointContract'],
];

const manifest = [];

for (const [fn, mods, callName] of GENERATORS) {
  const call = callName || fn;
  const { ctx, page, errs } = await open();
  const setupInfo = {};
  try {
    for (const m of mods) setupInfo[m] = await SETUP[m](page, FIX);

    const dl = page.waitForEvent('download', { timeout: 30000 });
    const called = await page.evaluate(async (name) => {
      if (typeof window[name] !== 'function') return 'missing';
      try { await window[name](); return 'ok'; } catch (e) { return 'threw: ' + (e && e.message); }
    }, call);

    if (called !== 'ok') throw new Error('call ' + called);
    const d = await dl;
    const file = path.join(OUT, fn + '__' + (d.suggestedFilename() || 'out.bin'));
    await d.saveAs(file);
    const size = fs.statSync(file).size;
    manifest.push({ fn, ok: true, file: path.basename(file), size, setup: setupInfo, dialogs: errs });
    console.log('  ok   ' + fn.padEnd(28) + (size / 1024).toFixed(0) + ' KB  ' + path.basename(file));
  } catch (e) {
    manifest.push({ fn, ok: false, error: String(e.message || e).split('\n')[0], setup: setupInfo, dialogs: errs });
    console.log('  MISS ' + fn.padEnd(28) + String(e.message || e).split('\n')[0]);
    if (errs.length) console.log('         ' + errs.slice(0, 2).join(' | '));
  }
  await ctx.close();
}

fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ fixture: FIX, generators: manifest }, null, 2));
const got = manifest.filter((m) => m.ok).length;
console.log('\n' + got + '/' + GENERATORS.length + ' generators captured -> ' + OUT);
await browser.close();
process.exit(0);
