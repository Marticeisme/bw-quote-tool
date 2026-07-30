// The downloaded ClearPoint contract must carry NO Acrobat field JavaScript.
//
// The regression this guards: `pdf-templates/embedded/CP_PDF_B64.pdf` ships a live
// calculation chain — an AcroForm /CO with 6 entries (e.g. `Amount Trusted` runs
// AFSimple_Calculate("PRD", ["90%","FPTotal"])) plus AF number-format (/F) and keystroke
// (/K) scripts on ~44 field objects. The tool fills values like "1,234.56"; the moment
// Martice edits ANY field in Acrobat the chain re-fires, cannot parse the state, warns
// "The value entered does not match the format of the field [FPTotal]" and collapses
// PLAN TOTAL to $1.#R. Operator decision 2026-07-29: strip the field-level JS from the
// downloaded copy, accepting that totals no longer auto-recalculate in Acrobat.
//
// The strip lives in generateClearPointContract() and applies to the in-memory copy only —
// so this suite also asserts the TEMPLATE on the wire still HAS /AA and /CO. That negative
// control is what makes the positive assertions mean something: without it a check that
// always returns "clean" would pass on a broken strip just as happily.
//
// Fake Firebase only — production is never contacted, and nothing is ever written.
import { chromium } from 'playwright';
import fs from 'fs';

const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
const IDENT = 'martice@bwquote.local';
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };

// Runs inside the page. Reports every trace of Acrobat JS in a pdf-lib document.
const AUDIT = `(function(bytesB64){
  return (async function(){
    var raw = atob(bytesB64), arr = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    var doc = await PDFLib.PDFDocument.load(arr, { ignoreEncryption: true });
    var PN = PDFLib.PDFName, form = doc.getForm();
    var aaFields = [], aaWidgets = 0, fields = 0;
    form.getFields().forEach(function(f){
      fields++;
      if (f.acroField.dict.get(PN.of('AA'))) aaFields.push(f.getName());
      f.acroField.getWidgets().forEach(function(w){ if (w.dict.get(PN.of('AA'))) aaWidgets++; });
    });
    var aaAnnots = 0;
    doc.getPages().forEach(function(pg){
      var an = pg.node.Annots(); if (!an) return;
      for (var j = 0; j < an.size(); j++) {
        try { var a = an.lookup(j, PDFLib.PDFDict); if (a && a.get(PN.of('AA'))) aaAnnots++; } catch(e) {}
      }
    });
    var acro = doc.catalog.lookup(PN.of('AcroForm'));
    var names = doc.catalog.lookup(PN.of('Names'));
    var oa = doc.catalog.lookup(PN.of('OpenAction'));
    var values = {}, fieldNames = [];
    form.getFields().forEach(function(f){
      fieldNames.push(f.getName());
      try { if (f.getText) { var t = f.getText(); if (t) values[f.getName()] = t; } } catch(e) {}
    });
    return {
      pages: doc.getPageCount(), fields: fields,
      aaFields: aaFields, aaWidgets: aaWidgets, aaAnnots: aaAnnots,
      hasCO: !!(acro && acro.get(PN.of('CO'))),
      hasDocJS: !!(names && names.get && names.get(PN.of('JavaScript'))),
      hasJsOpenAction: !!(oa && oa.get && oa.get(PN.of('S')) === PN.of('JavaScript')),
      names: fieldNames, values: values
    };
  })();
})`;

async function open(browser) {
  const ctx = await browser.newContext({ acceptDownloads: true });
  await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('dialog', async d => { errs.push('dialog: ' + d.message().slice(0, 120)); await d.accept(); });
  await page.addInitScript(FAKE);
  await page.addInitScript(`window.__fake.addAccount(${JSON.stringify(IDENT)},'pw');`);
  await page.goto('http://localhost:3737/', { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(id => _fbAuth.signInWithEmailAndPassword(id, 'pw'), IDENT);
  await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
  await page.waitForTimeout(300);
  return { ctx, page, errs };
}

// Synthetic fixture — invented name, 555-range phone. Never a real record.
const FIX = { first: 'Aaron', last: 'Prescott' };

async function generate(page, cremation) {
  await page.evaluate((fx) => {
    show('cp-contract', null);
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    set('cpFirstName', fx.first); set('cpLastName', fx.last);
  }, FIX);
  if (cremation) {
    await page.evaluate(() => {
      const r = document.querySelector('input[name="cpDisposition"][value="Cremation"]');
      if (r) r.checked = true;
    });
  }
  const dl = page.waitForEvent('download', { timeout: 60000 });
  const called = await page.evaluate(async () => {
    try { await window.generateClearPointContract(); return 'ok'; } catch (e) { return 'threw: ' + (e && e.message); }
  });
  if (called !== 'ok') throw new Error('generateClearPointContract ' + called);
  const d = await dl;
  const stream = await d.createReadStream();
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return Buffer.concat(chunks).toString('base64');
}

const browser = await chromium.launch();

for (const mode of ['burial', 'cremation']) {
  console.log('\n' + (pass + fail === 0 ? '1' : '2') + '. Downloaded ClearPoint contract (' + mode + ')');
  const { ctx, page, errs } = await open(browser);
  const b64 = await generate(page, mode === 'cremation');
  const r = await page.evaluate(`(${AUDIT})(${JSON.stringify(b64)})`);

  ok(mode + ': the contract generated and has fields', r.fields > 0, r.fields);
  ok(mode + ': page count is ' + (mode === 'cremation' ? 4 : 3),
    r.pages === (mode === 'cremation' ? 4 : 3), r.pages);
  ok(mode + ': ZERO form fields carry an /AA action dictionary',
    r.aaFields.length === 0, r.aaFields.slice(0, 12));
  ok(mode + ': ZERO field widgets carry an /AA action dictionary', r.aaWidgets === 0, r.aaWidgets);
  ok(mode + ': ZERO page annotations carry an /AA action dictionary', r.aaAnnots === 0, r.aaAnnots);
  ok(mode + ': the AcroForm has no /CO calculation order', r.hasCO === false);
  ok(mode + ': no document-level /Names /JavaScript', r.hasDocJS === false);
  ok(mode + ': no JavaScript /OpenAction', r.hasJsOpenAction === false);
  // The strip must not be a flatten in disguise and must not blank the fill.
  ok(mode + ': the form is still editable (fields survive the strip)', r.fields >= 100, r.fields);
  ok(mode + ': filled values survive — LAST NAME is the fixture surname',
    r.values['LAST NAME'] === FIX.last, r.values['LAST NAME']);
  // The five fields Acrobat named in the warnings must still be present and addressable —
  // the strip removes their actions, not the fields themselves.
  const MONEY = ['FPTotal', 'Amount Trusted', 'fill_60', 'Tax', 'FP'];
  ok(mode + ': the five warned-about money fields still exist on the form',
    MONEY.every(n => r.names.indexOf(n) >= 0), MONEY.filter(n => r.names.indexOf(n) < 0));
  ok(mode + ': no page errors while generating', errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

// ── 3. Negative control: the TEMPLATE still carries the JS the strip removes ─────────
// If this fails, either the template on disk was edited (out of scope for this change) or
// the audit above cannot actually see /AA — in which case its zeroes prove nothing.
console.log('\n3. Negative control — the CP_PDF_B64 template as fetched');
{
  const { ctx, page } = await open(browser);
  const t = await page.evaluate(`(async function(){
    var bytes = await bwTemplate('CP_PDF_B64');
    var b64 = '', chunk = 0x8000;
    for (var i = 0; i < bytes.length; i += chunk) b64 += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    return (${AUDIT})(btoa(b64));
  })()`);
  ok('the template DOES carry /AA on its fields (so the check can detect it)',
    t.aaFields.length > 0, t.aaFields.length);
  ok('the template DOES carry an AcroForm /CO (so the check can detect it)', t.hasCO === true);
  ok('the template is untouched on disk — the strip is in-memory only',
    t.aaFields.length > 0 && t.hasCO === true,
    { aa: t.aaFields.length, co: t.hasCO });
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
