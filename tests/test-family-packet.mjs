// Family Packet: quote + guides/catalogs/worksheets merged into one PDF.
//
// Fake Firebase only (gstatic SDK aborted); production is never contacted. Packets are built with
// bwPacketBytes() directly, so no download prompt and no export stamping happens in this suite.
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
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.dismiss());
await page.addInitScript(FAKE);
await page.addInitScript(`window.__fake.addAccount('martice@bwquote.local', 'pw');`);
await page.goto(BASE + 'index.html', { waitUntil: 'load', timeout: 120000 });
await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('martice@bwquote.local', 'pw'));
await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });

console.log('\n1. Every listed file exists, and every family PDF is listed');
{
  const listed = await page.evaluate(() => BW_PACKET_GROUPS.flatMap(g => g[1]));
  const onDisk = fs.readdirSync('pdf-assets').filter(f => f.endsWith('.pdf')).map(f => f.replace(/\.pdf$/, ''));
  const missing = listed.filter(n => !onDisk.includes(n));
  ok('all ' + listed.length + ' listed guides are in pdf-assets/', missing.length === 0, missing);
  // Professional-only material stays out of a family packet on purpose.
  // 'Marker Sizes and Pricing' is a stale June sheet retired from family use (2026-10-12 audit).
  const EXCLUDED = ['Medicaid Professional Reference', 'Marker Sizes and Pricing'];
  const unlisted = onDisk.filter(n => !listed.includes(n) && !EXCLUDED.includes(n));
  ok('no family PDF in pdf-assets/ is left off the picker (add new guides to BW_PACKET_GROUPS)', unlisted.length === 0, unlisted);
  ok('the professional reference is not offered', !listed.includes('Medicaid Professional Reference'));
}

console.log('\n2. The page: quotes appear only once built');
{
  await page.evaluate(() => show('packet', document.querySelector(`.nav-item[onclick^="show('packet'"]`)));
  await page.waitForTimeout(150);
  const r = await page.evaluate(() => ({
    disabled: [...document.querySelectorAll('#pkQuotes input')].map(i => i.disabled),
    guides: document.querySelectorAll('#pkGuides input[type=checkbox]').length,
    goDisabled: document.getElementById('pkGo').disabled,
  }));
  ok('with nothing built, all three quote boxes are disabled', r.disabled.join() === 'true,true,true', r.disabled);
  ok('the guide picker is filled', r.guides >= 40, r.guides);
  ok('Download packet is disabled until something is picked', r.goDisabled === true);
  await page.evaluate(() => {
    show('cem-quote', null);
    const g = document.getElementById('qGarden');
    g.value = [...g.options].find(o => (o.value || '').split('|').length >= 2 && parseFloat(o.value.split('|')[1]) > 0).value;
    document.getElementById('qGardenQty').value = '2';
    document.getElementById('qSettingBurial').checked = true;
    document.getElementById('cemClientName').value = 'Avery Family';
    cemUpdate();
    show('packet', null);
  });
  await page.waitForTimeout(150);
  const r2 = await page.evaluate(() => ({
    cemEnabled: !document.getElementById('pkq-cem').disabled,
    family: document.getElementById('pkFamily').value,
  }));
  ok('a built cemetery quote can be picked', r2.cemEnabled);
  ok('the family name carries over from the builder', r2.family === 'Avery Family', r2.family);
}

console.log('\n3. A packet: cover, quote, guide and two worksheets that share field names');
{
  const before = await page.evaluate(() => window.__fake.log().filter(l => ['set', 'update', 'remove'].includes(l.op)).length);
  const r = await page.evaluate(async () => {
    const picks = { quotes: ['cem'], files: ['Cremation Guide', 'Cemetery Arrangement Information', 'Cemetery Property Information'], cover: true, family: 'Avery Family' };
    const res = await bwPacketBytes(picks);
    const doc = await PDFLib.PDFDocument.load(res.bytes);
    const quoteAlone = await PDFLib.PDFDocument.load(await _fqBuildPDFBytes(bwCemQuoteModel()));
    const counts = {};
    for (const n of picks.files) counts[n] = (await PDFLib.PDFDocument.load(await (await fetch('pdf-assets/' + encodeURIComponent(n) + '.pdf')).arrayBuffer())).getPageCount();
    const fieldsIn = async n => (await PDFLib.PDFDocument.load(await (await fetch('pdf-assets/' + encodeURIComponent(n) + '.pdf')).arrayBuffer())).getForm().getFields().length;
    const fields = doc.getForm().getFields();
    const names = fields.map(f => f.getName());
    return {
      pages: doc.getPageCount(), contents: res.contents, quotePages: quoteAlone.getPageCount(), counts,
      fieldCount: fields.length,
      expectFields: (await fieldsIn('Cemetery Arrangement Information')) + (await fieldsIn('Cemetery Property Information')),
      uniqueNames: new Set(names).size, title: doc.getTitle(),
    };
  });
  const expectPages = 1 + r.quotePages + r.counts['Cremation Guide'] + r.counts['Cemetery Arrangement Information'] + r.counts['Cemetery Property Information'];
  ok('page count = cover + quote + every guide', r.pages === expectPages, { got: r.pages, expectPages });
  ok('cover lists the quote first, on page 2', r.contents[0].title === 'Cemetery Quote' && r.contents[0].page === 2, r.contents);
  ok('cover page numbers run on from each part', r.contents[1].page === 2 + r.quotePages && r.contents[2].page === r.contents[1].page + r.counts['Cremation Guide'], r.contents);
  ok('both worksheets keep every field', r.fieldCount === r.expectFields, { got: r.fieldCount, want: r.expectFields });
  ok('no two fields from different worksheets share a name', r.uniqueNames === r.fieldCount, { unique: r.uniqueNames, all: r.fieldCount });
  ok('the PDF is titled for the family', r.title === 'Avery Family - Bonney Watson Family Packet', r.title);
  ok('building a packet wrote nothing', (await page.evaluate(() => window.__fake.log().filter(l => ['set', 'update', 'remove'].includes(l.op)).length)) === before);
}

console.log('\n4. Without a cover, and guides only');
{
  const r = await page.evaluate(async () => {
    const res = await bwPacketBytes({ quotes: [], files: ['Who Decides'], cover: false, family: '' });
    return { pages: res.pages, first: res.contents[0] };
  });
  ok('no cover: the first part starts on page 1', r.first.page === 1 && r.first.title === 'Who Decides', r);
}

console.log('\n5. The quote Download PDF uses the same model as the packet');
{
  const r = await page.evaluate(() => [downloadCemQuotePDF, downloadFhQuotePDF, downloadCombQuotePDF].map(f => String(f)));
  ok('cemetery Download PDF builds through bwCemQuoteModel', /bwCemQuoteModel\(\)/.test(r[0]));
  ok('funeral home Download PDF builds through bwFhQuoteModel', /bwFhQuoteModel\(\)/.test(r[1]));
  ok('combined Download PDF builds through bwCombQuoteModel', /bwCombQuoteModel\(\)/.test(r[2]));
}

ok('no page errors', errs.length === 0, errs);
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
