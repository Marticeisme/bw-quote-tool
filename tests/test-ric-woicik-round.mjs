// RIC fixes from the Woicik contract (11/13). Synthetic fixture (invented names); fake Firebase
// only, nothing is ever written. Generates through the real RIC tab, signed in as martice
// (rebuilt form) and randy (old form), and checks:
//   - paid in full: payment method prints Check (never ACH) and the ACH page is left off
//   - financed at 0%: ACH as before, ACH page present
//   - a final-date inscription custom line prints "Final Inscription" on Other Merchandise
//   - a label too long for its box raises a warning before the download
//   - the marker row keeps its stone group ("Group 1 Non-Tariffed")
//   - rebuilt remarks lead with "For the benefit of <name>." and "Marker color: <color>."
// The rules-page font check (no nameless font) runs on the saved PDFs with PyMuPDF.
import { chromium } from 'playwright';
import fs from 'fs';
import { execSync } from 'child_process';
import { BASE } from './_base.mjs';

const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
const OUT = 'scratch/ric-1113/out';
fs.mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };

// No marker words (Granite/Plaque/Flush...) or the RIC would file it on the marker row.
const LONG_LABEL = 'Bench Engraving With Custom Family Crest Artwork On Both Sides Of Seat';
const READ = `(async function(b64){
  var raw = atob(b64), arr = new Uint8Array(raw.length);
  for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  var doc = await PDFLib.PDFDocument.load(arr, { ignoreEncryption: true });
  var f = doc.getForm();
  var g = function(n){ try { return f.getTextField(n).getText() || ''; } catch(e) { return null; } };
  var dd = function(n){ try { return (f.getDropdown(n).getSelected() || [])[0] || ''; } catch(e) { return null; } };
  return { pages: doc.getPageCount(), cash: dd('Cash'), memo: g('Memorial Description'),
           om1: g('Other Merch 1 Description'), om2: g('Other Merch 2 Description'),
           remarks: [5,6,7,8,9].map(function(n){ return g('Notes ' + n) || ''; }).join(' ') };
})`;

async function run(browser, who, plan) {
  const ctx = await browser.newContext({ acceptDownloads: true });
  await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
  const page = await ctx.newPage();
  const errs = [], dialogs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('dialog', async d => { dialogs.push(d.message()); await d.accept(); });
  await page.addInitScript(FAKE);
  await page.addInitScript(`window.__fake.addAccount('${who}@bwquote.local','pw');`);
  await page.goto(BASE + 'index.html', { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(w => _fbAuth.signInWithEmailAndPassword(w + '@bwquote.local', 'pw'), who);
  await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
  const dl = page.waitForEvent('download', { timeout: 120000 });
  const method = await page.evaluate(async ({ plan, LONG_LABEL }) => {
    show('cem-quote', null);
    const g = el('qGarden');
    g.value = [...g.options].find(o => /^21\|/.test(o.value) || /Garden 21/.test(o.text)).value;
    el('qMarkerType').value = 'flush'; populateMarkerSizes();
    el('qMarkerSize').value = String(FLUSH_SIZES.findIndex(r => r[0] === '44"x20"x4"'));
    el('qMarkerColor').value = 'g1nt'; markerAdd();
    addCemLine(); addCemLine();
    const rows = el('cemCustomLines').querySelectorAll('.custom-line-row');
    rows[0].querySelector('.cl-desc').value = 'Final Date Inscription (Avery, added after his passing)';
    rows[0].querySelector('.cl-amt').value = '575';
    rows[1].querySelector('.cl-desc').value = LONG_LABEL;
    rows[1].querySelector('.cl-amt').value = '300';
    cemUpdate();
    if (plan) {
      const total = _cemTotal, down = Math.round(total * 0.1 * 100) / 100;
      _finData = { downPct: 0.1, downAmt: down, months: 60, rate: 0, monthly: Math.round((total - down) / 60 * 100) / 100 };
    } else { _finData = null; }
    show('ric-contract', null);
    ricImportFromQuote();
    const set = (id, v) => { const e = el(id); if (e) { e.value = v; e.dispatchEvent(new Event('change')); } };
    set('ricName', 'Jordan Example'); set('ricStreet', '100 Example Way'); set('ricCity', 'Lake Tapps'); set('ricState', 'WA');
    set('ricZip', '98391'); set('ricPhone', '2535550142'); set('ricControlNo', 'T-1113');
    set('ricLocation', 'Garden 21, Section 5, Lot 12, Space 1'); set('ricBenefit', 'Avery James Example');
    set('ricMarkerColor', 'Misty Pink'); set('ricRemarks', 'Companion marker over spaces 1 and 2.');
    set('ricContractDate', '2026-11-13');
    if (plan) { set('ricFirstPmtMonth', 'December'); set('ricFirstPmtDay', '20'); const y = el('ricFirstPmtYear'); if (y && y.options.length > 1) { y.selectedIndex = 1; y.dispatchEvent(new Event('change')); } }
    if (typeof ricCalcFinancing === 'function') ricCalcFinancing();
    const m = el('ricPayMethod').value;
    generateRICFromTab();
    return m;
  }, { plan, LONG_LABEL });
  const d = await dl;
  const file = `${OUT}/${who}-${plan ? 'financed' : 'paid'}.pdf`;
  await d.saveAs(file);
  const b64 = fs.readFileSync(file).toString('base64');
  const r = await page.evaluate(`(${READ})(${JSON.stringify(b64)})`);
  await ctx.close();
  return { ...r, method, errs, dialogs, file };
}

const browser = await chromium.launch();
const files = [];
for (const who of ['martice', 'randy']) {
  const rebuilt = who === 'martice';
  console.log(`\n${who} (${rebuilt ? 'rebuilt' : 'old'} RIC), paid in full`);
  const p = await run(browser, who, false);
  files.push(p.file);
  ok('RIC tab defaults the method to Check', p.method === 'Check', p.method);
  ok('Payment method prints Check', p.cash === 'Check', p.cash);
  ok('Other Merch prints "Final Inscription"', [p.om1, p.om2].includes('Final Inscription'), [p.om1, p.om2]);
  ok('marker row keeps "Group 1 Non-Tariffed"', /Group 1 Non-Tariffed/.test(p.memo || ''), p.memo);
  ok('too-long label warned before download', p.dialogs.some(m => m.includes(LONG_LABEL)), p.dialogs);
  if (rebuilt) {
    ok('remarks lead with the benefit line', p.remarks.trim().startsWith('For the benefit of Avery James Example.'), p.remarks);
    ok('remarks carry the marker color', p.remarks.includes('Marker color: Misty Pink.'), p.remarks);
    ok('typed remarks still printed', p.remarks.includes('Companion marker over spaces 1 and 2.'), p.remarks);
  }
  ok('no page errors', p.errs.length === 0, p.errs.slice(0, 3));

  console.log(`\n${who}, financed 60 months at 0%`);
  const f = await run(browser, who, true);
  files.push(f.file);
  ok('RIC tab defaults the method to ACH', f.method === 'ACH', f.method);
  ok('Payment method prints ACH', f.cash === 'ACH', f.cash);
  ok('paid-in-full RIC is exactly the ACH page shorter', p.pages === f.pages - 1, [p.pages, f.pages]);
  ok('no page errors', f.errs.length === 0, f.errs.slice(0, 3));
}
await browser.close();

// Rules page and ACH page: every drawn value must use a named, embedded font. A nameless font is
// what printed the Woicik rules-page address blank in Martice's viewer.
console.log('\nfonts (PyMuPDF)');
const py = `
import fitz, sys, json
fitz.TOOLS.mupdf_display_errors(False)
out = {}
for fn in sys.argv[1:]:
    d = fitz.open(fn)
    bad = []
    for p in d:
        for b in p.get_text('dict')['blocks']:
            for l in b.get('lines', []):
                for s in l['spans']:
                    if s['text'].strip() and not s['font']:
                        bad.append([p.number, s['text'][:30]])
    last = d[-1].get_text()
    ach = any(w.field_name == 'Charge Amount' for p in d for w in p.widgets())
    out[fn] = {'bad': bad, 'ach': ach, 'rules_has_address': ('100 Example Way' in last and 'Lake Tapps' in last and '98391' in last)}
print(json.dumps(out))`;
fs.writeFileSync(OUT + '/fonts.py', py);
const res = JSON.parse(execSync('python ' + OUT + '/fonts.py ' + files.map(f => '"' + f + '"').join(' '), { stdio: ['ignore', 'pipe', 'ignore'] }).toString());
for (const [fn, r] of Object.entries(res)) {
  ok(`${fn}: no nameless-font text`, r.bad.length === 0, r.bad.slice(0, 5));
  ok(`${fn}: rules page shows address/city/zip`, r.rules_has_address);
  ok(`${fn}: ACH page ${/financed/.test(fn) ? 'attached' : 'left off'}`, r.ach === /financed/.test(fn), r.ach);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
