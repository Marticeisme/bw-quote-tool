// Generated .xlsx workbooks — sheet order and the Excel print path. Sprint-23, operator
// issues 4 and 5 (2026-08-15).
//
// Issue 4 — CIRGAS: "IOA ADDL SIGNERS" was parked at priority index 12, ten tabs behind
// "INTERMENT AUTH NEW" (a deliberate 2026-07-22 call: additional signers are the exception).
// It is now conditional — when the packet actually carries a co-signer the sheet sits
// directly behind the IOA; with no co-signer it stays at the back exactly as before.
//
// Issue 5 — the GENERATED commission worksheet failed to print, and failed convert-to-PDF,
// in Excel; an IMPORTED one printed fine. Two divergences from the CIRGAS generator, which
// has never had the problem: a stale xl/calcChain.xml left in place, and every sheet's
// <pageSetup> pointing at xl/printerSettings/printerSettingsN.bin — a DEVMODE blob captured
// from a long-gone printer — with no paperSize of its own.
//
// Everything is asserted on the real downloaded bytes. Every name/phone/email is synthetic.
// Fake Firebase only — production is never contacted, and nothing here writes.
import { chromium } from 'playwright';
import fs from 'fs';
import JSZip from 'jszip';
import { BASE } from './_base.mjs';
const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };
// generateCirgasPacket legitimately confirms before generating with no pricing imported.
const unexpected = errs => errs.filter(e => !/No pricing imported yet/.test(e));

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

const grab = async (page, run, tag) => {
  const dl = page.waitForEvent('download', { timeout: 90000 });
  await page.evaluate(run);
  const d = await dl;
  const tmp = (process.env.TEMP || '/tmp') + '/bw-xlsx-' + tag + '-' + process.pid + '-' + Date.now() + '.xlsx';
  await d.saveAs(tmp);
  const buf = fs.readFileSync(tmp);
  fs.unlinkSync(tmp);
  return buf;
};

// XML well-formedness, via the browser's own DOMParser — no extra dependency, and it is the
// same parser class Excel's own strictness stands in for here.
const parses = async (page, xml) => page.evaluate((x) => {
  const d = new DOMParser().parseFromString(x, 'application/xml');
  return !d.querySelector('parsererror');
}, xml);

const fillCirgas = async (page, coPurchaser) => page.evaluate((co) => {
  show('an-contract', null);
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
  const f = {
    decFirst: 'Marguerite', decMiddle: 'Elspeth', decLast: 'Thornbury',
    purchName: 'Callum Thornbury', purchRelation: 'Son',
    purchStreet: '1400 Kestrel Lane', purchCity: 'Renton', purchState: 'WA', purchZip: '98055',
    purchCell: '(206) 555-0132', purchEmail: 'cthornbury@example.com',
  };
  set('anDecFirst', f.decFirst); set('anDecMiddle', f.decMiddle); set('anDecLast', f.decLast);
  set('anPurchName', f.purchName); set('anPurchRelation', f.purchRelation);
  set('anPurchStreet', f.purchStreet); set('anPurchCity', f.purchCity);
  set('anPurchState', f.purchState); set('anPurchZip', f.purchZip);
  set('anPurchCellPhone', f.purchCell); set('anPurchEmail', f.purchEmail);
  if (co) {
    set('anCoPurchName', 'Rosalind Vayne'); set('anCoPurchRelation', 'Daughter');
    set('anCoPurchStreet', '22 Alder Court'); set('anCoPurchCity', 'Kent');
    set('anCoPurchState', 'WA'); set('anCoPurchZip', '98032');
    set('anCoPurchCellPhone', '(206) 555-0178'); set('anCoPurchEmail', 'rvayne@example.com');
  }
  return true;
}, coPurchaser);

// Sheet tab order + the r:id each name is bound to, read exactly as Excel would.
const sheetOrder = async (buf) => {
  const zip = await JSZip.loadAsync(buf);
  const wb = await zip.file('xl/workbook.xml').async('string');
  const names = [], rids = {};
  for (const m of wb.matchAll(/<sheet name="([^"]+)"[^>]*r:id="(rId\d+)"/g)) { names.push(m[1]); rids[m[1]] = m[2]; }
  return { names, rids, wb, zip };
};

const TEMPLATE_SHEETS = await (async () => {
  const zip = await JSZip.loadAsync(fs.readFileSync('pdf-templates/embedded/CIRGAS_XLSX_B64.xlsx'));
  const wb = await zip.file('xl/workbook.xml').async('string');
  const names = [], rids = {};
  for (const m of wb.matchAll(/<sheet name="([^"]+)"[^>]*r:id="(rId\d+)"/g)) { names.push(m[1]); rids[m[1]] = m[2]; }
  return { names, rids };
})();

const IOA = 'INTERMENT AUTH NEW';
const ADDL = 'IOA ADDL SIGNERS';

const browser = await chromium.launch();

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n1. CIRGAS, purchaser only — IOA ADDL SIGNERS stays at the back');
let soloNames = null;
{
  const { ctx, page, errs } = await open(browser);
  await fillCirgas(page, false);
  const buf = await grab(page, () => generateCirgasPacket(), 'cirgas-solo');
  const s = await sheetOrder(buf);
  soloNames = s.names;
  ok('the packet has every template sheet, none added or dropped',
    s.names.length === TEMPLATE_SHEETS.names.length &&
    s.names.slice().sort().join('|') === TEMPLATE_SHEETS.names.slice().sort().join('|'),
    { got: s.names.length, expected: TEMPLATE_SHEETS.names.length });
  ok('every sheet keeps the r:id the template bound it to',
    s.names.every(n => s.rids[n] === TEMPLATE_SHEETS.rids[n]),
    s.names.filter(n => s.rids[n] !== TEMPLATE_SHEETS.rids[n]));
  ok('workbook.xml is well-formed XML', await parses(page, s.wb));
  // Unchanged 2026-07-22 behaviour: ADDL SIGNERS sits in the back group, 13th in the
  // priority list, immediately behind Payment Options.
  ok(ADDL + ' is not adjacent to the IOA', s.names.indexOf(ADDL) !== s.names.indexOf(IOA) + 1,
    { ioa: s.names.indexOf(IOA), addl: s.names.indexOf(ADDL) });
  ok(ADDL + ' sits behind Payment Options, as 2026-07-22 left it',
    s.names.indexOf(ADDL) === s.names.indexOf('Payment Options') + 1,
    { paymentOptions: s.names.indexOf('Payment Options'), addl: s.names.indexOf(ADDL) });
  ok('the IOA is still 3rd in the tab bar', s.names.indexOf(IOA) === 2, s.names.slice(0, 5));
  ok('no unexpected page errors', unexpected(errs).length === 0, unexpected(errs));
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n2. CIRGAS with a co-purchaser — IOA ADDL SIGNERS moves next to the IOA');
{
  const { ctx, page, errs } = await open(browser);
  await fillCirgas(page, true);
  const buf = await grab(page, () => generateCirgasPacket(), 'cirgas-co');
  const s = await sheetOrder(buf);
  ok('the packet still has every template sheet',
    s.names.length === TEMPLATE_SHEETS.names.length &&
    s.names.slice().sort().join('|') === TEMPLATE_SHEETS.names.slice().sort().join('|'),
    { got: s.names.length, expected: TEMPLATE_SHEETS.names.length });
  ok('every sheet still keeps its template r:id',
    s.names.every(n => s.rids[n] === TEMPLATE_SHEETS.rids[n]),
    s.names.filter(n => s.rids[n] !== TEMPLATE_SHEETS.rids[n]));
  ok('workbook.xml is well-formed XML', await parses(page, s.wb));
  // THE FIX, verbatim.
  ok(ADDL + ' is immediately after ' + IOA,
    s.names.indexOf(ADDL) === s.names.indexOf(IOA) + 1,
    { ioa: s.names.indexOf(IOA), addl: s.names.indexOf(ADDL), head: s.names.slice(0, 6) });
  ok('the IOA is still 3rd in the tab bar', s.names.indexOf(IOA) === 2, s.names.slice(0, 5));
  // Only ONE tab moved: drop ADDL SIGNERS from both orders and the rest must be identical.
  const strip = (a) => a.filter(n => n !== ADDL);
  ok('no other tab changed position relative to the purchaser-only packet',
    strip(s.names).join('|') === strip(soloNames).join('|'),
    { co: strip(s.names).slice(0, 16), solo: strip(soloNames).slice(0, 16) });
  ok('Mem Order Form Addl Signers was deliberately left where it was',
    s.names.indexOf('Mem Order Form Addl Signers') === soloNames.indexOf('Mem Order Form Addl Signers'),
    { co: s.names.indexOf('Mem Order Form Addl Signers'), solo: soloNames.indexOf('Mem Order Form Addl Signers') });
  ok('no unexpected page errors', unexpected(errs).length === 0, unexpected(errs));
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n3. Commission worksheet — the Excel print path');
{
  const { ctx, page, errs } = await open(browser);
  const q = await page.evaluate(async () => {
    show('cem-quote', null);
    const el_ = id => document.getElementById(id);
    const an = el_('cemTypeAN'); if (an) { an.checked = true; cemQuoteTypeChange(); }
    el_('cemClientName').value = 'Marguerite Thornbury';
    const g = el_('qGarden');
    const opt = [...g.options].find(o => /\|/.test(o.value));
    g.value = opt.value; g.dispatchEvent(new Event('change', { bubbles: true }));
    const oc = el_('qOCGround'); if (oc) oc.checked = true;
    const vault = el_('qVault');
    if (vault) { const vo = [...vault.options].find(o => /\d{3,}/.test(o.value)); if (vo) vault.value = vo.value; }
    cemUpdateD();
    await new Promise(r => setTimeout(r, 300));
    return { total: window._cemTotal };
  });
  ok('the worksheet fixture has a non-zero quote total', q.total > 0, q);

  const buf = await grab(page, async () => {
    show('atneed-checklist', null);
    anclImport();
    // anclImport pulls the purchaser off the CIRGAS tab, which this fixture does not use —
    // set it directly so the I4 cell has something to carry.
    document.getElementById('anclPurchaser').value = 'Callum Thornbury';
    await clDownloadFilledWorksheet('ancl');
  }, 'commws');
  const zip = await JSZip.loadAsync(buf);
  const names = Object.keys(zip.files).filter(n => !zip.files[n].dir);
  ok('the workbook opens as a zip with parts in it', names.length > 5, names.length);

  // 1. calcChain — the repair-on-open trigger.
  ok('no xl/calcChain.xml part', !names.includes('xl/calcChain.xml'), names.filter(n => /calcChain/.test(n)));
  const ct = await zip.file('[Content_Types].xml').async('string');
  ok('no calcChain content-type override', !/calcChain/.test(ct));
  const wbRels = await zip.file('xl/_rels/workbook.xml.rels').async('string');
  ok('no calcChain workbook relationship', !/calcChain/.test(wbRels));
  ok('the surviving workbook relationships still parse', await parses(page, wbRels));
  ok('workbook.xml still asks Excel to recalculate on load',
    /fullCalcOnLoad="1"/.test(await zip.file('xl/workbook.xml').async('string')));

  // 2. printerSettings — the stale DEVMODE.
  ok('no xl/printerSettings/*.bin parts', !names.some(n => /printerSettings/.test(n)),
    names.filter(n => /printerSettings/.test(n)));
  ok('no printerSettings content-type default', !/printerSettings/.test(ct), ct.match(/<Default[^>]*>/g));
  ok('[Content_Types].xml still parses', await parses(page, ct));
  const sheets = names.filter(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort();
  ok('all three worksheets survive', sheets.length === 3, sheets);
  for (const sp of sheets) {
    const xml = await zip.file(sp).async('string');
    const ps = (xml.match(/<pageSetup\b[^>]*>/) || [])[0];
    ok(sp + ' has a pageSetup', !!ps, ps);
    ok(sp + ' pageSetup carries paperSize="1" (US Letter)', /paperSize="1"/.test(ps), ps);
    ok(sp + ' pageSetup no longer references printer settings', !/r:id=/.test(ps), ps);
    ok(sp + ' still parses', await parses(page, xml));
    const rp = sp.replace(/worksheets\/(sheet\d+\.xml)$/, 'worksheets/_rels/$1.rels');
    if (zip.file(rp)) {
      const rx = await zip.file(rp).async('string');
      ok(rp + ' has no printerSettings relationship', !/printerSettings/.test(rx), rx.slice(0, 300));
      ok(rp + ' still parses', await parses(page, rx));
    }
  }
  // sheet1 keeps its drawing relationship — only the printer rel was meant to go.
  const s1rels = await zip.file('xl/worksheets/_rels/sheet1.xml.rels').async('string');
  ok('sheet1 keeps its drawing relationship', /drawings\/drawing1\.xml/.test(s1rels), s1rels.slice(0, 300));

  // 3. The fill itself is unharmed — spot-check the cell map (index.html comment at ~21956).
  const s1 = await zip.file('xl/worksheets/sheet1.xml').async('string');
  const cell = (coord) => {
    const m = s1.match(new RegExp('<c r="' + coord + '"[^>]*?(?:/>|>([\\s\\S]*?)</c>)'));
    if (!m || !m[1]) return null;
    const is = m[1].match(/<t[^>]*>([\s\S]*?)<\/t>/);
    if (is) return is[1];
    const v = m[1].match(/<v>([\s\S]*?)<\/v>/);
    return v ? v[1] : null;
  };
  ok('F4 (FSD) is filled', !!cell('F4'), cell('F4'));
  ok('I4 (Purchaser) is filled', !!cell('I4'), cell('I4'));
  ok('O4 (Date of Sale) is a date serial', +cell('O4') > 40000, cell('O4'));
  ok('F6 (Total Payment Received) equals the quote total',
    Math.abs(+cell('F6') - q.total) < 0.005, { f6: cell('F6'), total: q.total });
  const atNeedRows = ['F10', 'F11', 'F12'].map(cell).filter(v => v !== null);
  ok('the AT NEED commissionable rows are still written', atNeedRows.length > 0, atNeedRows);
  ok('no unexpected page errors', unexpected(errs).length === 0, unexpected(errs));
  await ctx.close();
}

await browser.close();
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
