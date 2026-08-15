// RIC line quantities — operator issue 3, sprint-23 (2026-08-15).
//
// The RIC's "O/C" and "Recording" contract rows aggregate several quote lines into one row
// each, and generateRICContractCore derives the printed Qty from a literal "×N" suffix in the
// line LABEL (labelQty). Any builder that multiplies the AMOUNT by a quantity but forgets the
// suffix therefore prints a doubled dollar figure beside "Qty 1".
//
// The confirmed offender was the scattering package: a scatter garden with Qty (spaces) = 2
// pushed {label: 'Recording Fee', amount: fee * 2} with no suffix, while its sibling plaque
// line right below it appended ' ×2' correctly.
//
// This suite drives the real UI, generates the real RIC PDF, and reads the AcroForm field
// values straight out of the downloaded bytes — the operator's complaint was about what is
// printed on the contract, not about the in-page model.
//
// Also covers the Compare-Options Option-B builder, whose "Qty (spaces)" was ignored by the
// 2nd/3rd Right lines (an undercharge on a figure shown to the family). Option B never
// reaches the RIC — it is asserted on the line model, which is what the compare pane, the
// compare print window and the compare PDF all read.
//
// Fake Firebase only — production is never contacted, and nothing here writes.
import { chromium } from 'playwright';
import fs from 'fs';
import { PDFDocument } from 'pdf-lib';
import { BASE } from './_base.mjs';
const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };

async function open(browser) {
  const ctx = await browser.newContext({ acceptDownloads: true });
  await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  page.on('dialog', async d => { errs.push('dialog: ' + d.message().slice(0, 140)); await d.accept(); });
  await page.addInitScript(FAKE);
  await page.addInitScript(`window.__fake.addAccount('t@bwquote.local','pw');`);
  await page.goto(BASE, { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('t@bwquote.local', 'pw'));
  await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
  await page.waitForTimeout(250);
  return { ctx, page, errs };
}

// Builds a scattering-garden quote: gardenQty spaces, the package's Recording Fee ticked,
// plus a Ground Inurnment O&C at the same quantity so both aggregated RIC rows are exercised.
const buildScatter = async (page, gardenQty) => page.evaluate(async (gq) => {
  show('cem-quote', null);
  const el_ = id => document.getElementById(id);
  el_('cemClientName').value = 'Wrenfield Scatter Test';
  const g = el_('qGarden');
  const opt = [...g.options].find(o => /\|/.test(o.value) && /^scatter_/.test(o.value.split('|')[0]));
  if (!opt) return { error: 'no scatter garden option in qGarden' };
  g.value = opt.value;
  g.dispatchEvent(new Event('change', { bubbles: true }));
  cemUpdate();
  el_('qGardenQty').value = String(gq);
  const rec = el_('qScatterRecording'); if (rec) rec.checked = true;
  const plq = el_('qScatterPlaque');    if (plq) plq.checked = true;
  // O&C lives in its own section, unaffected by the scattering package's row hiding.
  const oc = el_('qOCGround'); if (oc) oc.checked = true;
  const ocq = el_('qOCGroundQty'); if (ocq) ocq.value = String(gq);
  cemUpdate();
  await new Promise(r => setTimeout(r, 250));
  return {
    recordingFee: bwFee('RECORDING:all'),
    groundOC: bwFee('OC:ground_inurnment'),
    lines: (window._cemLines || []).map(l => ({ label: l.label, amount: l.amount, taxable: !!l.taxable, isSpace: !!l.isSpace })),
  };
}, gardenQty);

// Imports the cemetery quote into the RIC tab and generates the real contract PDF.
const ricFields = async (page) => {
  const dl = page.waitForEvent('download', { timeout: 90000 });
  await page.evaluate(async () => {
    show('ric-contract', null);
    ricImportFromQuote();
    document.getElementById('ricName').value = 'Wrenfield Scatter Test';
    await generateRICFromTab();
  });
  const d = await dl;
  const tmp = (process.env.TEMP || '/tmp') + '/bw-ric-qty-' + process.pid + '-' + Date.now() + '.pdf';
  await d.saveAs(tmp);
  const doc = await PDFDocument.load(fs.readFileSync(tmp));
  fs.unlinkSync(tmp);
  const form = doc.getForm();
  const out = {};
  for (const f of form.getFields()) {
    const name = f.getName();
    if (typeof f.getText === 'function') { try { out[name] = f.getText(); } catch { /* not a text field */ } }
  }
  return out;
};

const money = (s) => (s == null ? null : +String(s).replace(/[^0-9.\-]/g, ''));

const browser = await chromium.launch();

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n1. Scatter garden, Qty (spaces) = 2 — the reported bug');
{
  const { ctx, page, errs } = await open(browser);
  const q = await buildScatter(page, 2);
  ok('a scattering garden fixture was built', !q.error, q.error);

  const recLine = q.lines.find(l => /^Recording Fee/.test(l.label));
  ok('the quote carries a Recording Fee line', !!recLine, q.lines.map(l => l.label));
  // THE BUG, verbatim: the amount was doubled and the label was not.
  ok('the Recording Fee label carries the ×2 suffix', /\s×2$/.test(recLine.label), recLine);
  ok('the Recording Fee amount is doubled',
    Math.abs(recLine.amount - q.recordingFee * 2) < 0.005, { line: recLine, fee: q.recordingFee });
  // Its sibling in the same package always did this correctly — regression guard.
  const plaque = q.lines.find(l => /Memorial Plaque/.test(l.label));
  ok('the sibling plaque line still carries its ×2 suffix', plaque && /\s×2$/.test(plaque.label), plaque);

  const f = await ricFields(page);
  ok('the RIC generated and has form fields', Object.keys(f).length > 0, Object.keys(f).length);
  ok('RIC Qty 4 (Recording) prints 2, not 1', f['Qty 4'] === '2', { qty4: f['Qty 4'] });
  ok('RIC Recording Fee prints the doubled amount',
    Math.abs(money(f['Recording Fee']) - q.recordingFee * 2) < 0.01,
    { field: f['Recording Fee'], expected: q.recordingFee * 2 });
  ok('RIC Qty 3 (O/C) prints 2', f['Qty 3'] === '2', { qty3: f['Qty 3'] });
  ok('RIC Opening/Closing prints the doubled amount',
    Math.abs(money(f['Opening/Closing']) - q.groundOC * 2) < 0.01,
    { field: f['Opening/Closing'], expected: q.groundOC * 2 });
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n2. Qty = 1 control — no "×1" suffix is ever written');
{
  const { ctx, page, errs } = await open(browser);
  const q = await buildScatter(page, 1);
  ok('a qty-1 scattering fixture was built', !q.error, q.error);
  const withX1 = q.lines.filter(l => /\s[×x]\s*1(\s|$)/.test(l.label));
  ok('no line label contains a ×1 suffix', withX1.length === 0, withX1.map(l => l.label));
  const recLine = q.lines.find(l => /^Recording Fee/.test(l.label));
  ok('the Recording Fee label is exactly "Recording Fee"', recLine && recLine.label === 'Recording Fee', recLine);
  ok('the Recording Fee amount is the single fee',
    Math.abs(recLine.amount - q.recordingFee) < 0.005, { line: recLine, fee: q.recordingFee });

  const f = await ricFields(page);
  ok('RIC Qty 4 prints 1', f['Qty 4'] === '1', { qty4: f['Qty 4'] });
  ok('RIC Recording Fee prints the single fee',
    Math.abs(money(f['Recording Fee']) - q.recordingFee) < 0.01,
    { field: f['Recording Fee'], expected: q.recordingFee });
  ok('RIC Qty 3 prints 1', f['Qty 3'] === '1', { qty3: f['Qty 3'] });
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────
// Compare-Options Option B. Its "Qty (spaces)" scaled the space and the ECF but not the
// additional rights, even though the main builder does scale them and the code comment
// beside it claims parity.
console.log('\n3. Compare-Options Option B — Qty (spaces) scales the 2nd/3rd Right');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async () => {
    show('cem-quote', null);
    const el_ = id => document.getElementById(id);
    const g = el_('cmpB_garden');
    if (!g) return { error: 'no cmpB_garden select' };
    const opt = [...g.options].find(o => /\|/.test(o.value) && (parseFloat(o.value.split('|')[1]) || 0) > 0);
    if (!opt) return { error: 'no priced garden option in cmpB_garden' };
    const read = async (qty) => {
      g.value = opt.value;
      el_('cmpB_gardenQty').value = String(qty);
      el_('cmpB_2ndRight').checked = true;
      el_('cmpB_3rdRight').checked = true;
      calcBTotal();
      await new Promise(r2 => setTimeout(r2, 150));
      const txt = el_('cmpB_breakdown').innerHTML;
      return { txt, total: el_('cmpB_total').textContent };
    };
    const one = await read(1);
    const two = await read(2);
    return {
      space: parseFloat(opt.value.split('|')[1]) || 0,
      ecf: parseFloat(opt.value.split('|')[2]) || 0,
      one, two,
    };
  });
  ok('a priced Option-B garden fixture was built', !r.error, r.error);

  const num = (html, label) => {
    // Breakdown rows render as "<label> — $1,234.00"
    const m = html.match(new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^—]*—\\s*\\$([\\d,]+(?:\\.\\d+)?)'));
    return m ? +m[1].replace(/,/g, '') : null;
  };
  const half = r.space * 0.5;
  ok('at qty 1 the 2nd Right is half a space',
    Math.abs(num(r.one.txt, '2nd Right') - half) < 0.01, { got: num(r.one.txt, '2nd Right'), expected: half });
  // THE BUG, verbatim: this was still half a space at qty 2.
  ok('at qty 2 the 2nd Right is TWO half-spaces',
    Math.abs(num(r.two.txt, '2nd Right') - half * 2) < 0.01, { got: num(r.two.txt, '2nd Right'), expected: half * 2 });
  ok('at qty 2 the 3rd Right is TWO half-spaces',
    Math.abs(num(r.two.txt, '3rd Right') - half * 2) < 0.01, { got: num(r.two.txt, '3rd Right'), expected: half * 2 });
  ok('the qty-2 additional-right rows carry the ×2 label', /2nd Right[^<]*×2/.test(r.two.txt) && /3rd Right[^<]*×2/.test(r.two.txt),
    r.two.txt.slice(0, 400));
  ok('the qty-1 rows carry no ×1 label', !/×\s*1(\D|$)/.test(r.one.txt), r.one.txt.slice(0, 400));
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

await browser.close();
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
