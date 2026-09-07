// The Deed Transfer lane: page selection, variant selection, the field map, the notary
// blank rule, the cover checklist, and save/restore.
//
// What this pins, and why each pin exists:
//
//  • DocuSign ON downloads the PLAIN variants (template pages 3/5/8) and NO notary page;
//    DocuSign OFF downloads the NOTARY variants (2/4/7) and NO plain page. There is no
//    marker on a filled page saying which variant it is, so each case is identified by a
//    field that exists ONLY on that variant ('day of' vs 'day of_2', and so on).
//  • Notary-block fields are empty on the notary variants (operator ruling 4). The whole
//    DT_NOTARY_FIELDS list is checked, not a sample.
//  • Each situation toggle adds exactly its own document and nothing else, and the cover
//    checklist mirrors the derived set.
//  • Page removal is back-to-front. removePage(i) shifts every later index down one, so a
//    forward pass silently deletes the wrong pages — the resulting file still has the right
//    PAGE COUNT, which is why the assertions below identify pages by their FIELDS.
//  • The shared 'Check Box2' field (cover certificate row + statement "1st Right of
//    Interment" box, one field with two widgets) is ON for the cover widget and OFF for the
//    statement widget.
//  • Save/restore round-trips through the fake Firebase store.
//
// Fake Firebase only — production is never contacted, and nothing is ever written to it.
import { chromium } from 'playwright';
import fs from 'fs';
import zlib from 'zlib';
import { PDFDocument, PDFName, PDFArray } from 'pdf-lib';
import { BASE } from './_base.mjs';

const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
const IDENT = 'martice@bwquote.local';
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };

// Synthetic fixture — invented names, 555-range phones, @example.com. Never a real record.
const FIX = {
  grantor: 'Wendell Ashgrove', grantorPhone: '206-555-0142',
  grantorEmail: 'wendell@example.com', grantorAddress: '4120 Larkspur Way',
  grantorCity: 'Burien', grantorState: 'WA', grantorZip: '98166', grantorCounty: 'King',
  newOwner: 'Marisol Ashgrove-Reyes', newOwnerPhone: '206-555-0177',
  newOwnerEmail: 'marisol@example.com', newOwnerAddress: '881 Cedarcrest Lane',
  newOwnerCity: 'Renton', newOwnerState: 'WA', newOwnerZip: '98057',
  section: 'GOM', row: '4', block: 'B', lot: '112', plot: '3',
  cert: 'C-88421', certDate: 'March 4, 1998',
  decedent: 'Wendell Ashgrove', dod: 'January 12, 2026',
  heirAffiant: 'Marisol Ashgrove-Reyes', heirAffiantRel: 'Daughter',
  interred: 'Theodore Ashgrove',
  counselor: 'Martice Morrison', receipt: 'R-70314', statementDate: '2026-09-04',
  // Sprint 29: the current owner side can be several people.
  co2: 'Beatrix Ashgrove-Hollowell', co2Phone: '206-555-0188', co2Email: 'beatrix@example.com',
  co3: 'Cormac Ashgrove', co3Phone: '206-555-0199', co3Email: 'cormac@example.com'
};

// Reads a saved PDF back inside the page: page count, every field name, every text value,
// and the per-widget on/off state of the shared checkbox.
const AUDIT = `(function(b64){
  return (async function(){
    var raw = atob(b64), arr = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    var doc = await PDFLib.PDFDocument.load(arr, { ignoreEncryption: true });
    var form = doc.getForm(), PN = PDFLib.PDFName;
    var names = [], values = {}, checked = [];
    form.getFields().forEach(function(f){
      names.push(f.getName());
      try { if (f.getText) { var t = f.getText(); if (t) values[f.getName()] = t; } } catch(e) {}
      try { if (f.isChecked && f.isChecked()) checked.push(f.getName()); } catch(e) {}
    });
    // The shared checkbox: report each widget's own /AS keyed by its height.
    var widgetStates = {};
    try {
      form.getCheckBox('Check Box2').acroField.getWidgets().forEach(function(w){
        var r = w.getRectangle();
        var as = w.dict.get(PN.of('AS'));
        widgetStates[r.height > 15 ? 'cover' : 'statement'] = as ? as.asString() : null;
      });
    } catch(e) { widgetStates.error = String(e && e.message); }
    var perPage = doc.getPages().map(function(pg){
      var an = pg.node.Annots(), o = { names: [], values: {} };
      if (an) for (var k = 0; k < an.size(); k++) {
        try {
          var wd = an.lookup(k, PDFLib.PDFDict); if (!wd) continue;
          var tn = wd.get(PN.of('T')); if (!tn) continue;
          var nm = tn.decodeText ? tn.decodeText() : String(tn);
          o.names.push(nm);
          var vv = wd.get(PN.of('V'));
          if (vv) o.values[nm] = vv.decodeText ? vv.decodeText() : String(vv);
        } catch(e) {}
      }
      return o;
    });
    return { pages: doc.getPageCount(), names: names, values: values,
             checked: checked, widgetStates: widgetStates, perPage: perPage };
  })();
})`;

async function open(browser) {
  const ctx = await browser.newContext({ acceptDownloads: true });
  await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('dialog', async d => { errs.push('dialog: ' + d.message().slice(0, 140)); await d.accept(); });
  await page.addInitScript(FAKE);
  await page.addInitScript(`window.__fake.addAccount(${JSON.stringify(IDENT)},'pw');`);
  await page.goto(BASE, { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(id => _fbAuth.signInWithEmailAndPassword(id, 'pw'), IDENT);
  await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
  await page.waitForTimeout(300);
  return { ctx, page, errs };
}

// opts: { docusign, lost, deceased, permission, heirs: n }
async function fillLane(page, opts) {
  await page.evaluate(([fx, o]) => {
    show('dt-transfer', null);
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    const tick = (id, v) => { const e = document.getElementById(id); if (e) e.checked = !!v; };
    set('dtGrantorName', fx.grantor); set('dtGrantorPhone', fx.grantorPhone);
    set('dtGrantorEmail', fx.grantorEmail); set('dtGrantorAddress', fx.grantorAddress);
    set('dtGrantorCity', fx.grantorCity); set('dtGrantorState', fx.grantorState);
    set('dtGrantorZip', fx.grantorZip); set('dtGrantorCounty', fx.grantorCounty);
    set('dtNewOwnerName', fx.newOwner); set('dtNewOwnerPhone', fx.newOwnerPhone);
    set('dtNewOwnerEmail', fx.newOwnerEmail); set('dtNewOwnerAddress', fx.newOwnerAddress);
    set('dtNewOwnerCity', fx.newOwnerCity); set('dtNewOwnerState', fx.newOwnerState);
    set('dtNewOwnerZip', fx.newOwnerZip);
    set('dtSection', fx.section); set('dtRow', fx.row); set('dtBlock', fx.block);
    set('dtLot', fx.lot); set('dtPlot', fx.plot);
    set('dtCertNumber', fx.cert); set('dtCertDate', fx.certDate);
    set('dtDecedentName', fx.decedent); set('dtDateOfDeath', fx.dod);
    set('dtHeirAffiant', fx.heirAffiant); set('dtHeirAffiantRel', fx.heirAffiantRel);
    set('dtInterredName', fx.interred);
    set('dtCounselor', fx.counselor); set('dtReceiptNum', fx.receipt);
    set('dtStatementDate', fx.statementDate);
    tick('dtDocuSign', o.docusign); tick('dtLostCert', o.lost);
    tick('dtOwnerDeceased', o.deceased); tick('dtPermissionUse', o.permission);
    (o.coOwners || []).forEach(function(c, ci) {
      dtAddCoOwnerRow();
      set('dtCoOwner' + (ci + 2) + 'Name',  c.name);
      set('dtCoOwner' + (ci + 2) + 'Phone', c.phone);
      set('dtCoOwner' + (ci + 2) + 'Email', c.email);
    });
    for (let i = 1; i <= (o.heirs || 0); i++) {
      if (i > 1) dtAddHeirRow();
      // Heir 1 IS the affiant, so the Permission-of-Use signer-address lookup gets exercised.
      set('dtHeir' + i + 'Name', i === 1 ? fx.heirAffiant : 'Heir ' + i + ' Ashgrove');
      set('dtHeir' + i + 'Rel', i === 1 ? 'Daughter' : 'Cousin');
      set('dtHeir' + i + 'Address', (100 + i) + ' Fernbank Road, Kent WA 98032');
      set('dtHeir' + i + 'Age', String(30 + i));
    }
    dtUpdateDocs();
  }, [FIX, opts]);
}

async function generate(page) {
  // 20s, not the default 30/60: generateDeedTransferPDF() catches its own errors and alerts,
  // so a broken generator produces no download at all and the wait is how that surfaces.
  const dl = page.waitForEvent('download', { timeout: 20000 });
  const called = await page.evaluate(async () => {
    try { await window.generateDeedTransferPDF(); return 'ok'; } catch (e) { return 'threw: ' + (e && e.message); }
  });
  if (called !== 'ok') throw new Error('generateDeedTransferPDF ' + called);
  const d = await dl;
  const stream = await d.createReadStream();
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return { b64: Buffer.concat(chunks).toString('base64'), name: d.suggestedFilename() };
}


// Generates and audits in one step. A generator that THROWS (or never downloads) must show up
// as failed assertions, not as a crashed suite — a forward page-removal loop, for example,
// runs off the end of the document and would otherwise just time the run out.
async function genAudit(page, opts) {
  if (opts) await fillLane(page, opts);
  try {
    const g = await generate(page);
    const r = await page.evaluate(`(${AUDIT})(${JSON.stringify(g.b64)})`);
    r.name = g.name;
    r.b64  = g.b64;
    return r;
  } catch (e) {
    return { pages: -1, names: [], values: {}, checked: [], widgetStates: {}, perPage: [], name: '',
             error: String((e && e.message) || e).split(String.fromCharCode(10))[0].slice(0, 140) };
  }
}

// A field that exists on exactly one template page — the only reliable page fingerprint
// once the unused pages have been cut.
const MARKER = {
  cover:            'Family ServiceRow1',
  releaseNotary:    'day of',
  releasePlain:     'day of_2',
  lossNotary:       'being duly sworn deposes and says',
  lossPlain:        'being duly sworn deposes and says_2',
  heirs:            'SWORN BORN LORN',
  permissionNotary: 'I_2',
  permissionPlain:  'I_3',
  statement:        'Purch Name Printed'
  // page 10 (Terms) carries no fields at all — counted, not fingerprinted.
};

// Which template document a page IS, from the field only that page carries. Copies 2..N
// have their fields renamed (' co2', ' co3') so two AcroForm fields with one name cannot be
// forced to share a value.
const pageIs  = (r, i, key) => (r.perPage[i] || { names: [] }).names.indexOf(MARKER[key]) >= 0;
const pageIs2 = (r, i, key) => (r.perPage[i] || { names: [] }).names.indexOf(MARKER[key] + ' co2') >= 0;
const pageIs3 = (r, i, key) => (r.perPage[i] || { names: [] }).names.indexOf(MARKER[key] + ' co3') >= 0;
// Every value printed on one page, as one string — for "the other owner is not on this page".
const pageText = (r, i) => Object.keys((r.perPage[i] || {}).values || {})
  .map(k => r.perPage[i].values[k]).join(String.fromCharCode(10));

// The split statement box prints each co-owner's name and signature line as page CONTENT,
// not as field values — pdf-lib emits hex-encoded show-text and filled rectangles. Nothing in
// the AcroForm carries them, so the only honest check is to decompress the page and look.
async function pageContent(b64, pageIndex) {
  const doc = await PDFDocument.load(Buffer.from(b64, 'base64'), { ignoreEncryption: true });
  const page = doc.getPages()[pageIndex];
  const streams = [];
  const push = (obj) => {
    const o = doc.context.lookup(obj);
    if (!o) return;
    if (o instanceof PDFArray) { for (let i = 0; i < o.size(); i++) push(o.get(i)); return; }
    if (o.getContents) streams.push(o);
  };
  push(page.node.get(PDFName.of('Contents')));
  let out = '';
  for (const st of streams) {
    let bytes = Buffer.from(st.getContents());
    if (/FlateDecode/.test(String(st.dict.get(PDFName.of('Filter')) || ''))) {
      try { bytes = zlib.inflateSync(bytes); } catch (e) { continue; }
    }
    out += bytes.toString('latin1');
  }
  return out;
}
const drawn = (content, text) =>
  content.includes('<' + Buffer.from(text, 'latin1').toString('hex').toUpperCase() + '>');
// Every filled rectangle drawn on the page: colour, origin and size, straight off the stream.
const drawnRects = (content) => {
  const re = /([\d.]+) ([\d.]+) ([\d.]+) rg\s+0 w\s+\[\] 0 d\s+1 0 0 1 ([\d.]+) ([\d.]+) cm[\s\S]{0,120}?0 0 m\s+0 ([-\d.]+) l\s+([\d.]+) [-\d.]+ l/g;
  const out = []; let m;
  while ((m = re.exec(content))) out.push({ r: +m[1], g: +m[2], b: +m[3], x: +m[4], y: +m[5], h: +m[6], w: +m[7] });
  return out;
};
// The drawn names: font size, origin and text, decoded from the show-text operators.
const drawnTexts = (content) => {
  const re = /\/Times-Roman-\d+ ([\d.]+) Tf[\s\S]{0,80}?1 0 0 1 ([\d.]+) ([\d.]+) Tm\s+<([0-9A-F]+)> Tj/g;
  const out = []; let m;
  while ((m = re.exec(content))) out.push({
    size: +m[1], x: +m[2], y: +m[3], text: Buffer.from(m[4], 'hex').toString('latin1')
  });
  return out.sort((a, b) => a.x - b.x);
};
// The signature lines: the black ones at the rule y, left to right.
const sigLines = (content) => drawnRects(content)
  .filter(d => d.r === 0 && d.g === 0 && d.b === 0 && Math.abs(d.h - 0.72) < 0.01)
  .sort((a, b) => a.x - b.x);

const browser = await chromium.launch();

// ── 1. DocuSign case, everything switched on ────────────────────────────────────────
console.log('\n1. DocuSign case — lost certificate, owner deceased, permission of use');
{
  const { ctx, page, errs } = await open(browser);
  const r = await genAudit(page, { docusign: true, lost: true, deceased: true, permission: true, heirs: 3 });
  const name = r.name;
  const has = (k) => r.names.indexOf(MARKER[k]) >= 0;

  ok('the packet generated without throwing', !r.error, r.error);
  ok('7 pages: cover + release + loss + heirs + permission + statement + terms',
    r.pages === 7, r.pages);
  ok('the cover page is in', has('cover'));
  ok('the PLAIN release is in', has('releasePlain'));
  ok('the NOTARY release is NOT in', !has('releaseNotary'));
  ok('the PLAIN loss affidavit is in', has('lossPlain'));
  ok('the NOTARY loss affidavit is NOT in', !has('lossNotary'));
  ok('the affidavit of heirs is in', has('heirs'));
  ok('the PLAIN permission of use is in', has('permissionPlain'));
  ok('the NOTARY permission of use is NOT in', !has('permissionNotary'));
  ok('the statement page is in', has('statement'));

  // Shared fields fan out to every included page.
  ok('release (plain): grantor name', r.values['day of_2'] === FIX.grantor, r.values['day of_2']);
  ok('release (plain): new owner printed name',
    r.values['Printed Names of New Owner_2'] === FIX.newOwner, r.values['Printed Names of New Owner_2']);
  ok('release (plain): section/row/block/lot/plot',
    r.values['SECTION 222'] === FIX.section && r.values['ROW 222'] === FIX.row &&
    r.values['BLOCK222'] === FIX.block && r.values['LOT2222'] === FIX.lot &&
    r.values['PLOT2222'] === FIX.plot,
    [r.values['SECTION 222'], r.values['ROW 222'], r.values['BLOCK222'], r.values['LOT2222'], r.values['PLOT2222']]);
  ok('loss affidavit (plain): affiant defaults to the grantor',
    r.values['being duly sworn deposes and says_2'] === FIX.grantor,
    r.values['being duly sworn deposes and says_2']);
  ok('loss affidavit (plain): certificate number',
    r.values['Washington Memorial Park being Certificate Number_2'] === FIX.cert,
    r.values['Washington Memorial Park being Certificate Number_2']);
  ok('loss affidavit (plain): property row 1',
    r.values['Section_4'] === FIX.section && r.values['Plots_4'] === FIX.plot,
    [r.values['Section_4'], r.values['Plots_4']]);
  ok('heirs: deceased owner name', r.values['DEPOSES SAYS BLANK'] === FIX.decedent, r.values['DEPOSES SAYS BLANK']);
  ok('heirs: date of death', r.values['Date of Death'] === FIX.dod, r.values['Date of Death']);
  ok('heirs: property', r.values['Section123213132123'] === FIX.section, r.values['Section123213132123']);
  ok('heirs: three heir rows landed, the other two are blank',
    r.values['Namesamelamegame'] === FIX.heirAffiant &&
    r.values['Name_2gamesamelamename'] === 'Heir 2 Ashgrove' &&
    r.values['Name_3lamegamesamerain'] === 'Heir 3 Ashgrove' &&
    !r.values['Name_4samegamenamehame'] && !r.values['Name_5afdfds'],
    [r.values['Namesamelamegame'], r.values['Name_3lamegamesamerain'], r.values['Name_4samegamenamehame']]);
  ok('heirs: the affiant signature line is left blank for signing',
    !r.values['from any damages which may result due to any misstatements in the affidavitffff']);
  ok('permission (plain): the person to be interred',
    r.values['I hereby state that I wish to grant permission for_2'] === FIX.interred,
    r.values['I hereby state that I wish to grant permission for_2']);
  ok('statement: new owner block carries the new owner',
    r.values['Purch Name Printed'] === FIX.newOwner && r.values['Zip Code Purch'] === FIX.newOwnerZip,
    [r.values['Purch Name Printed'], r.values['Zip Code Purch']]);
  ok('statement: current owner block carries the grantor',
    r.values['Current Name Print'] === FIX.grantor && r.values['Email Current'] === FIX.grantorEmail,
    [r.values['Current Name Print'], r.values['Email Current']]);
  ok('cover: the counselor name', r.values['Family ServiceRow1'] === FIX.counselor, r.values['Family ServiceRow1']);
  ok('cover: the receipt number', r.values['receipt'] === FIX.receipt, r.values['receipt']);
  ok('the shared Location field carries the property on cover AND statement',
    r.values['Row1'] === 'Section GOM, Row 4, Block B, Lot 112, Plot 3', r.values['Row1']);

  // The $325 is flat text on the statement: the tool fills no amount anywhere.
  ok('no amount field was filled — the $325 is flat text on the page',
    Object.keys(r.values).every(k => !/^\$/.test(r.values[k])), Object.keys(r.values).filter(k => /^\$/.test(r.values[k])));

  ok('the download is named for the new owner and the transfer date',
    /^DeedTransfer_Marisol_Ashgrove_Reyes_2026-09-04\.pdf$/.test(name), name);
  ok('no page errors while generating', errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

// ── 2. In-person (notary) case, everything switched on ──────────────────────────────
console.log('\n2. In-person case — the notary variants, and their notary blocks stay blank');
{
  const { ctx, page, errs } = await open(browser);
  const r = await genAudit(page, { docusign: false, lost: true, deceased: true, permission: true, heirs: 2 });
  const has = (k) => r.names.indexOf(MARKER[k]) >= 0;

  ok('the packet generated without throwing', !r.error, r.error);
  ok('7 pages', r.pages === 7, r.pages);
  ok('the NOTARY release is in', has('releaseNotary'));
  ok('the PLAIN release is NOT in', !has('releasePlain'));
  ok('the NOTARY loss affidavit is in', has('lossNotary'));
  ok('the PLAIN loss affidavit is NOT in', !has('lossPlain'));
  ok('the NOTARY permission of use is in', has('permissionNotary'));
  ok('the PLAIN permission of use is NOT in', !has('permissionPlain'));

  ok('release (notary): grantor name', r.values['day of'] === FIX.grantor, r.values['day of']);
  ok('release (notary): county and state',
    r.values['THE GRANTOR'] === FIX.grantorCounty && r.values['state for and in consideration of'] === FIX.grantorState,
    [r.values['THE GRANTOR'], r.values['state for and in consideration of']]);
  ok('release (notary): new owner name, address and phone under the signature line',
    r.values['purpose of reassigning those interment rights to'] === FIX.newOwner &&
    /Cedarcrest/.test(r.values['Address Line 1'] || '') &&
    r.values['New Owners Signature 2'] === FIX.newOwnerPhone,
    [r.values['purpose of reassigning those interment rights to'], r.values['Address Line 1'], r.values['New Owners Signature 2']]);
  ok('permission (notary): the signer is the heirs affiant, with THEIR address, not the deceased owner’s',
    r.values['Name_4'] === FIX.heirAffiant && /Fernbank/.test(r.values['Address 1'] || '') &&
    !r.values['Phone'],
    [r.values['Name_4'], r.values['Address 1'], r.values['Phone']]);
  ok('permission (notary): the person to be interred appears in both places',
    r.values['I hereby state that I wish to grant permission for'] === FIX.interred &&
    r.values['named above is rightfully entitled to the use of such interment right in'] === FIX.interred,
    [r.values['I hereby state that I wish to grant permission for']]);

  // Operator ruling 4 — the notary completes their own block.
  const notary = await page.evaluate(() => window.DT_NOTARY_FIELDS);
  ok('the notary-field list is exported and non-trivial', Array.isArray(notary) && notary.length >= 20, notary && notary.length);
  const filledNotary = notary.filter(n => r.values[n]);
  ok('EVERY notary-block field is empty on the notary variants', filledNotary.length === 0, filledNotary);
  ok('the notary fields are actually present on those pages (so the check can see them)',
    notary.filter(n => r.names.indexOf(n) >= 0).length >= 20,
    notary.filter(n => r.names.indexOf(n) < 0));
  ok('no page errors while generating', errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

// ── 3. One toggle at a time: each adds exactly its document ─────────────────────────
console.log('\n3. Each situation toggle adds exactly its own document');
{
  const { ctx, page, errs } = await open(browser);

  // Baseline: nothing switched on.
  const base = await genAudit(page, { docusign: false });
  ok('the baseline packet generated without throwing', !base.error, base.error);
  ok('baseline is 4 pages — cover, release, statement, terms', base.pages === 4, base.pages);
  ok('baseline has the release (it IS the transfer)', base.names.indexOf(MARKER.releaseNotary) >= 0);
  ok('baseline has no loss affidavit', base.names.indexOf(MARKER.lossNotary) < 0);
  ok('baseline has no affidavit of heirs', base.names.indexOf(MARKER.heirs) < 0);
  ok('baseline has no permission of use', base.names.indexOf(MARKER.permissionNotary) < 0);
  ok('baseline cover: Check Box1 (release) and Check Box2 (certificate) are marked',
    base.checked.indexOf('Check Box1') >= 0 && base.checked.indexOf('Check Box2') >= 0, base.checked);
  ok('baseline cover: Check Box3 (heirs) is NOT marked', base.checked.indexOf('Check Box3') < 0, base.checked);
  ok('baseline cover: no supporting-document box is marked',
    ['Check Box4','Check Box5','Check Box6','Check Box7'].every(n => base.checked.indexOf(n) < 0), base.checked);
  ok('the shared checkbox is ON for the cover widget and OFF for the statement widget',
    base.widgetStates.cover === '/Yes' && base.widgetStates.statement === '/Off', base.widgetStates);

  // Lost certificate only.
  const lost = await genAudit(page, { docusign: false, lost: true });
  ok('lost-certificate: generated without throwing', !lost.error, lost.error);
  ok('lost-certificate: 5 pages', lost.pages === 5, lost.pages);
  ok('lost-certificate: adds the loss affidavit', lost.names.indexOf(MARKER.lossNotary) >= 0);
  ok('lost-certificate: adds nothing else',
    lost.names.indexOf(MARKER.heirs) < 0 && lost.names.indexOf(MARKER.permissionNotary) < 0);
  ok('lost-certificate: flips no cover checkbox — the certificate row is required either way',
    lost.checked.slice().sort().join() === base.checked.slice().sort().join(), lost.checked);

  // Owner deceased only.
  const dec = await genAudit(page, { docusign: false, deceased: true, heirs: 1 });
  ok('owner-deceased: generated without throwing', !dec.error, dec.error);
  ok('owner-deceased: 5 pages', dec.pages === 5, dec.pages);
  ok('owner-deceased: adds the affidavit of heirs', dec.names.indexOf(MARKER.heirs) >= 0);
  ok('owner-deceased: adds nothing else',
    dec.names.indexOf(MARKER.lossNotary) < 0 && dec.names.indexOf(MARKER.permissionNotary) < 0);
  ok('owner-deceased: flips exactly Check Box3 on the cover',
    dec.checked.indexOf('Check Box3') >= 0 &&
    dec.checked.length === base.checked.length + 1, dec.checked);

  // Permission of use only.
  const perm = await genAudit(page, { docusign: false, permission: true });
  ok('permission-of-use: generated without throwing', !perm.error, perm.error);
  ok('permission-of-use: 5 pages', perm.pages === 5, perm.pages);
  ok('permission-of-use: adds the permission of use', perm.names.indexOf(MARKER.permissionNotary) >= 0);
  ok('permission-of-use: adds nothing else',
    perm.names.indexOf(MARKER.lossNotary) < 0 && perm.names.indexOf(MARKER.heirs) < 0);
  ok('permission-of-use: flips no cover checkbox — it has no row on the checklist',
    perm.checked.slice().sort().join() === base.checked.slice().sort().join(), perm.checked);

  // Supporting-document boxes are their own toggles.
  await page.evaluate(() => {
    ['dtChkDeathCert','dtChkWill','dtChkPropertyCards','dtChkFeeReceived']
      .forEach(id => { const e = document.getElementById(id); if (e) e.checked = true; });
  });
  const sup = await genAudit(page, null);
  ok('the supporting-document packet generated without throwing', !sup.error, sup.error);
  ok('the four supporting-document boxes mark Check Box4..7',
    ['Check Box4','Check Box5','Check Box6','Check Box7'].every(n => sup.checked.indexOf(n) >= 0), sup.checked);

  ok('no page errors across the toggle matrix', errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

// ── 4. The page-index maths, directly ───────────────────────────────────────────────
console.log('\n4. Page selection maths');
{
  const { ctx, page, errs } = await open(browser);
  const m = await page.evaluate(() => {
    const S = (o) => dtPageIndexes(Object.assign({ docusign:false, release:true, loss:false, heirs:false, permission:false }, o));
    return {
      pagesConst: window.DT_PAGES,
      none:      S({}),
      allNotary: S({ loss:true, heirs:true, permission:true }),
      allPlain:  S({ docusign:true, loss:true, heirs:true, permission:true }),
      plainNone: S({ docusign:true }),
      docsNone:  dtDocList({ docusign:false, release:true, loss:false, heirs:false, permission:false }).length,
      docsAll:   dtDocList({ docusign:false, release:true, loss:true, heirs:true, permission:true }).length
    };
  });
  ok('DT_PAGES names all ten template pages', Object.keys(m.pagesConst).length === 10, m.pagesConst);
  ok('nothing extra selected -> [cover, release-notary, statement, terms]',
    m.none.join() === '0,1,8,9', m.none);
  ok('DocuSign with nothing extra -> the PLAIN release', m.plainNone.join() === '0,2,8,9', m.plainNone);
  ok('everything, in person -> [0,1,3,5,6,8,9]', m.allNotary.join() === '0,1,3,5,6,8,9', m.allNotary);
  ok('everything, DocuSign  -> [0,2,4,5,7,8,9]', m.allPlain.join() === '0,2,4,5,7,8,9', m.allPlain);
  ok('the kept-page list is sorted ascending, so removal can run back to front',
    [m.none, m.allNotary, m.allPlain].every(a => a.every((v, i) => i === 0 || a[i - 1] < v)),
    [m.none, m.allNotary, m.allPlain]);
  ok('the on-screen document list tracks the same derivation', m.docsNone === 4 && m.docsAll === 7,
    [m.docsNone, m.docsAll]);
  ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

// ── 5. Save and restore, through the fake Firebase store ────────────────────────────
console.log('\n5. Save / restore round-trip (fake Firebase — nothing is written to production)');
{
  const { ctx, page, errs } = await open(browser);
  await fillLane(page, { docusign: true, lost: true, deceased: true, permission: true, heirs: 4 });
  const saved = await page.evaluate(() => {
    const realPrompt = window.prompt;
    window.prompt = () => 'Ashgrove transfer';
    try { saveDeedTransfer(); } finally { window.prompt = realPrompt; }
    return {
      count: _dtSavedTransfers.length,
      label: (_dtSavedTransfers[0] || {}).label,
      id:    (_dtSavedTransfers[0] || {}).id,
      store: Object.keys(_quoteStore.dt || {}).length,
      types: QUOTE_TYPES.indexOf('dt') >= 0
    };
  });
  ok("'dt' is a registered record type", saved.types);
  ok('the transfer saved into the dt list', saved.count === 1, saved.count);
  ok('it landed in _quoteStore.dt as one per-record node', saved.store === 1, saved.store);
  ok('the label is what was typed', saved.label === 'Ashgrove transfer', saved.label);

  const listed = await page.evaluate(() => {
    show('dt-saved', null);
    const box = document.getElementById('dtSavedQuotes');
    return box ? box.innerHTML : '';
  });
  ok('the Saved Deed Transfers list renders the row', /Ashgrove transfer/.test(listed));

  const restored = await page.evaluate((id) => {
    dtClearAll();
    const cleared = document.getElementById('dtGrantorName').value;
    loadSavedDeedTransfer(id);
    const g = (i) => (document.getElementById(i) || {}).value;
    const c = (i) => !!(document.getElementById(i) || {}).checked;
    const visibleHeirs = Array.from(document.querySelectorAll('#dtHeirRows .dt-heir-row'))
      .filter(r => r.style.display !== 'none').length;
    return {
      cleared, grantor: g('dtGrantorName'), newOwner: g('dtNewOwnerName'),
      section: g('dtSection'), plot: g('dtPlot'), cert: g('dtCertNumber'),
      heir4: g('dtHeir4Name'), visibleHeirs,
      docusign: c('dtDocuSign'), lost: c('dtLostCert'),
      deceased: c('dtOwnerDeceased'), permission: c('dtPermissionUse')
    };
  }, saved.id);
  ok('Clear All really cleared the form first', restored.cleared === '', restored.cleared);
  ok('restore: grantor and new owner', restored.grantor === FIX.grantor && restored.newOwner === FIX.newOwner,
    [restored.grantor, restored.newOwner]);
  ok('restore: property and certificate',
    restored.section === FIX.section && restored.plot === FIX.plot && restored.cert === FIX.cert,
    [restored.section, restored.plot, restored.cert]);
  ok('restore: all four situation toggles',
    restored.docusign && restored.lost && restored.deceased && restored.permission, restored);
  ok('restore: the fourth heir row is filled and visible',
    restored.heir4 === 'Heir 4 Ashgrove' && restored.visibleHeirs === 4,
    [restored.heir4, restored.visibleHeirs]);

  // The restored form must regenerate the same packet.
  const again = await genAudit(page, null);
  ok('the restored packet generated without throwing', !again.error, again.error);
  ok('the restored transfer regenerates the same 7-page DocuSign packet',
    again.pages === 7 && again.names.indexOf(MARKER.releasePlain) >= 0 &&
    again.names.indexOf(MARKER.releaseNotary) < 0, again.pages);
  ok('no page errors across save and restore', errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

// ── 6. Negative control: the template on the wire has all ten pages and both variants ──
// Without this, every "page N is absent" assertion above would pass just as happily on a
// template that never had the page.
console.log('\n6. Negative control — the DT_PDF_B64 template as fetched');
{
  const { ctx, page } = await open(browser);
  const t = await page.evaluate(`(async function(){
    var bytes = await bwTemplate('DT_PDF_B64');
    var s = '', chunk = 0x8000;
    for (var i = 0; i < bytes.length; i += chunk) s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    return (${AUDIT})(btoa(s));
  })()`);
  ok('the template has all ten pages', t.pages === 10, t.pages);
  ok('the template carries BOTH release variants',
    t.names.indexOf(MARKER.releaseNotary) >= 0 && t.names.indexOf(MARKER.releasePlain) >= 0);
  ok('the template carries BOTH loss variants',
    t.names.indexOf(MARKER.lossNotary) >= 0 && t.names.indexOf(MARKER.lossPlain) >= 0);
  ok('the template carries BOTH permission variants',
    t.names.indexOf(MARKER.permissionNotary) >= 0 && t.names.indexOf(MARKER.permissionPlain) >= 0);
  ok('the template arrives blank — every assertion above is about what the tool wrote',
    Object.keys(t.values).length === 0, Object.keys(t.values).slice(0, 5));
  ok('the template has no box checked', t.checked.length === 0, t.checked);
  await ctx.close();
}

// ── 7. Regression: SPARSE fill — the 2026-08-25 live crash ─────────────────────────
// Only the two required names entered, everything optional left blank, lost-certificate on.
// This template has seven widgets (pages 3 and 6) that their own pages never list in
// /Annots; blank, they survived the prune as orphans and save()'s appearance pass crashed
// ("Expected instance of …, but got instance of undefined"). Filled fields are dirty and
// take a different path — which is why every richly-filled case above stayed green while
// the counselor's real, sparser form failed. Both variants exercised.
console.log('\n7. Regression — sparse fill, blank optionals (the live 2026-08-25 crash)');
for (const docusign of [false, true]) {
  const { ctx, page, errs } = await open(browser);
  await page.evaluate(([o]) => {
    show('dt-transfer', null);
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    const tick = (id, v) => { const e = document.getElementById(id); if (e) e.checked = !!v; };
    set('dtGrantorName', 'Sparse Grantor'); set('dtNewOwnerName', 'Sparse NewOwner');
    tick('dtDocuSign', o.docusign); tick('dtLostCert', true);
    tick('dtOwnerDeceased', false); tick('dtPermissionUse', false);
    dtUpdateDocs();
  }, [{ docusign }]);
  const label = docusign ? 'DocuSign' : 'notary';
  const r = await genAudit(page, null);
  ok(`sparse ${label}: generated without throwing`, !r.error, r.error);
  ok(`sparse ${label}: 5 pages — cover, release, loss affidavit, statement, terms`, r.pages === 5, r.pages);
  ok(`sparse ${label}: carries the right release variant`,
    r.names.indexOf(docusign ? MARKER.releasePlain : MARKER.releaseNotary) >= 0 &&
    r.names.indexOf(docusign ? MARKER.releaseNotary : MARKER.releasePlain) < 0, r.names.length);
  ok(`sparse ${label}: the grantor name survived the pre-removal appearance bake`,
    Object.values(r.values).indexOf('Sparse Grantor') >= 0, r.values);
  ok(`sparse ${label}: no page errors`, errs.filter(e => !/favicon/.test(e)).length === 0, errs.slice(0, 3));
  await ctx.close();
}

// ── 8. Co-owners: the list, the row UI and the page maths ──────────────────────────
// Sprint 29. The current owner side is a LIST: the primary in the original dtGrantor*
// fields, co-owners 2..3 in rows that already exist in the DOM.
console.log('\n8. The co-owner list, the row UI and the page maths');
{
  const { ctx, page, errs } = await open(browser);
  const m = await page.evaluate((fx) => {
    show('dt-transfer', null);
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    const btn = () => document.getElementById('dtAddCoOwnerBtn').style.display;
    set('dtGrantorName', fx.grantor); set('dtGrantorPhone', fx.grantorPhone);
    set('dtGrantorEmail', fx.grantorEmail);
    const one = dtCoOwners();
    const addedRow = dtAddCoOwnerRow();
    set('dtCoOwner2Name', fx.co2); set('dtCoOwner2Phone', fx.co2Phone); set('dtCoOwner2Email', fx.co2Email);
    const two = dtCoOwners();
    dtAddCoOwnerRow();
    set('dtCoOwner3Name', fx.co3); set('dtCoOwner3Phone', fx.co3Phone);
    const three = dtCoOwners();
    const btnHidden = btn() === 'none';
    const capped = dtAddCoOwnerRow();
    // A row with a phone but no name is not a co-owner.
    set('dtCoOwner3Name', '');
    const blankDropped = dtCoOwners().length;
    set('dtCoOwner3Name', fx.co3);
    // Remove the middle row: row 3 must move up into row 2.
    dtRemoveCoOwnerRow(2);
    const afterRemove = {
      rows: dtVisibleCoOwnerRows(), names: dtCoOwnerNames(),
      r2: document.getElementById('dtCoOwner2Name').value,
      r3: document.getElementById('dtCoOwner3Name').value, btn: btn()
    };
    const primaryKept = dtRemoveCoOwnerRow(1);   // the primary can never be removed
    const sel = { docusign: false, release: true, loss: true, heirs: true, permission: true };
    const maths = {
      per: dtPerOwnerPages(sel), keep: dtPageIndexes(sel),
      t1: dtTotalPages(sel, 1), t2: dtTotalPages(sel, 2), t3: dtTotalPages(sel, 3),
      releaseOnly3: dtTotalPages({ docusign: false, release: true }, 3)
    };
    dtClearAll();
    const cleared = { rows: dtVisibleCoOwnerRows(),
                      name2: document.getElementById('dtCoOwner2Name').value, btn: btn() };
    return { one, two, three, addedRow, capped, btnHidden, blankDropped, afterRemove,
             primaryKept, maths, cleared };
  }, FIX);

  ok('one owner: dtCoOwners() is the primary alone',
    m.one.length === 1 && m.one[0].name === FIX.grantor, m.one);
  ok('the primary carries their own phone and e-mail',
    m.one[0].phone === FIX.grantorPhone && m.one[0].email === FIX.grantorEmail, m.one[0]);
  ok('"Add co-owner" reveals row 2', m.addedRow === 2, m.addedRow);
  ok('two owners: the primary is FIRST, then the co-owner',
    m.two.length === 2 && m.two[0].name === FIX.grantor && m.two[1].name === FIX.co2, m.two);
  ok('the co-owner carries their own phone and e-mail',
    m.two[1].phone === FIX.co2Phone && m.two[1].email === FIX.co2Email, m.two[1]);
  ok('three is the cap: the Add button hides at three rows', m.btnHidden, m.btnHidden);
  ok('a fourth Add does nothing', m.capped === 3 && m.three.length === 3, [m.capped, m.three.length]);
  ok('a row with a phone but no name is dropped', m.blankDropped === 2, m.blankDropped);
  ok('removing row 2 pulls row 3 up into it',
    m.afterRemove.r2 === FIX.co3 && m.afterRemove.r3 === '', m.afterRemove);
  ok('removing a row hides the last one and brings the Add button back',
    m.afterRemove.rows === 2 && m.afterRemove.btn === '', m.afterRemove);
  ok('the surviving list is the primary plus the pulled-up co-owner',
    m.afterRemove.names.join('|') === FIX.grantor + '|' + FIX.co3, m.afterRemove.names);
  ok('the primary row can never be removed', m.primaryKept === 2, m.primaryKept);
  ok('the per-owner pages are the documents somebody signs, not the cover/statement/terms',
    m.maths.per.join() === '1,3,5,6', m.maths.per);
  ok('at ONE co-owner the total is the s27 page set, unchanged',
    m.maths.t1 === m.maths.keep.length && m.maths.t1 === 7, [m.maths.t1, m.maths.keep.length]);
  ok('the total is 1 + N x documents + 2', m.maths.t2 === 11 && m.maths.t3 === 15, [m.maths.t2, m.maths.t3]);
  ok('release only, three co-owners: 1 + 3 + 2 = 6 pages', m.maths.releaseOnly3 === 6, m.maths.releaseOnly3);
  ok('Clear All collapses the list back to the primary row alone',
    m.cleared.rows === 1 && m.cleared.name2 === '' && m.cleared.btn === '', m.cleared);
  ok('no page errors across the co-owner row UI', errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

// ── 9. Two co-owners, in person: one copy of each document, per owner, in order ─────
console.log('\n9. Two co-owners (notary) — one copy of each signed document per owner');
{
  const { ctx, page, errs } = await open(browser);
  const CO = [{ name: FIX.co2, phone: FIX.co2Phone, email: FIX.co2Email }];
  const r = await genAudit(page, { docusign: false, lost: true, deceased: true,
                                   permission: true, heirs: 1, coOwners: CO });
  ok('the two-co-owner packet generated without throwing', !r.error, r.error);
  ok('11 pages: cover + 4 documents x 2 owners + statement + terms', r.pages === 11, r.pages);

  ok('p1 is the cover', pageIs(r, 0, 'cover'), r.perPage[0].names[0]);
  ok('owner A block is release, loss, heirs, permission (pages 2-5)',
    pageIs(r, 1, 'releaseNotary') && pageIs(r, 2, 'lossNotary') &&
    pageIs(r, 3, 'heirs') && pageIs(r, 4, 'permissionNotary'),
    r.perPage.slice(1, 5).map(p => p.names[0]));
  ok('owner B block repeats the same four documents, in the same order (pages 6-9)',
    pageIs2(r, 5, 'releaseNotary') && pageIs2(r, 6, 'lossNotary') &&
    pageIs2(r, 7, 'heirs') && pageIs2(r, 8, 'permissionNotary'),
    r.perPage.slice(5, 9).map(p => p.names[0]));
  ok('p10 is the statement and p11 the terms (no fields at all)',
    pageIs(r, 9, 'statement') && r.perPage[10].names.length === 0,
    [r.perPage[9].names[0], r.perPage[10].names.length]);

  ok("owner A's release names owner A",
    r.perPage[1].values['day of'] === FIX.grantor, r.perPage[1].values['day of']);
  ok("owner B's release names owner B",
    r.perPage[5].values['day of co2'] === FIX.co2, r.perPage[5].values['day of co2']);
  ok("each release carries that owner's own phone",
    r.perPage[1].values['Grantors Phone Num'] === FIX.grantorPhone &&
    r.perPage[5].values['Grantors Phone Num co2'] === FIX.co2Phone,
    [r.perPage[1].values['Grantors Phone Num'], r.perPage[5].values['Grantors Phone Num co2']]);
  ok("owner B's name appears NOWHERE on owner A's four pages",
    [1, 2, 3, 4].every(i => pageText(r, i).indexOf(FIX.co2) < 0),
    [1, 2, 3, 4].filter(i => pageText(r, i).indexOf(FIX.co2) >= 0));
  ok("owner A's name is not the grantor or affiant on owner B's pages",
    r.perPage[5].values['day of co2'] !== FIX.grantor &&
    r.perPage[6].values['being duly sworn deposes and says co2'] === FIX.co2,
    r.perPage[6].values['being duly sworn deposes and says co2']);
  ok('the shared address is on BOTH copies — one property, one address of record',
    /Larkspur/.test(r.perPage[1].values['Grantors Address'] || '') &&
    /Larkspur/.test(r.perPage[5].values['Grantors Address co2'] || ''),
    [r.perPage[1].values['Grantors Address'], r.perPage[5].values['Grantors Address co2']]);

  ok('the cover joins the names with " & " and prints the primary phone',
    r.values['Namephone  of current property ownerRow1'] ===
      FIX.grantor + ' & ' + FIX.co2 + ' · ' + FIX.grantorPhone,
    r.values['Namephone  of current property ownerRow1']);

  ok('the statement leaves Current Name Print EMPTY at two co-owners',
    !r.perPage[9].values['Current Name Print'], r.perPage[9].values['Current Name Print']);
  ok('the statement address block stays ONE block: shared address, primary e-mail and phone',
    r.perPage[9].values['Address Current'] === FIX.grantorAddress &&
    r.perPage[9].values['Zip Current'] === FIX.grantorZip &&
    r.perPage[9].values['Email Current'] === FIX.grantorEmail &&
    r.perPage[9].values['Cell Phone Current'] === FIX.grantorPhone,
    [r.perPage[9].values['Address Current'], r.perPage[9].values['Email Current'],
     r.perPage[9].values['Cell Phone Current']]);

  const st = await pageContent(r.b64, 9);
  ok('BOTH printed names are DRAWN into the split signature box',
    drawn(st, FIX.grantor) && drawn(st, FIX.co2), [drawn(st, FIX.grantor), drawn(st, FIX.co2)]);
  ok('the box is split into TWO signature lines of equal width',
    sigLines(st).length === 2 && Math.abs(sigLines(st)[0].w - sigLines(st)[1].w) < 0.01,
    sigLines(st));
  ok('the two lines sit inside the green box, left edge to right edge',
    sigLines(st).length === 2 &&
    sigLines(st)[0].x > 332.4 && sigLines(st)[0].x < 332.6 &&
    sigLines(st)[1].x + sigLines(st)[1].w > 580.2 &&
    sigLines(st).every(l => Math.abs(l.y - 436.56) < 0.01),
    sigLines(st));

  ok('the original full-width rule was erased and its background restored: green above the ' +
     'fill boundary, white below',
    drawnRects(st).some(d => d.r === 0.8 && d.g === 1 && d.b === 0.8 && Math.abs(d.w - 247.8) < 0.01) &&
    drawnRects(st).some(d => d.r === 1 && d.g === 1 && d.b === 1 && Math.abs(d.w - 247.8) < 0.01),
    drawnRects(st).filter(d => Math.abs(d.w - 247.8) < 0.01));
  ok('the "Printed Name" caption was whited out — each column is captioned by its own name',
    drawnRects(st).some(d => d.r === 1 && d.g === 1 && d.b === 1 &&
                             Math.abs(d.w - 40) < 0.01 && Math.abs(d.h - 7.3) < 0.01),
    drawnRects(st).filter(d => d.r === 1 && d.w < 100));

  const notary = await page.evaluate(() => window.DT_NOTARY_FIELDS);
  const filled = notary.filter(n => r.values[n] || r.values[n + ' co2']);
  ok('EVERY notary-block field is still blank, on the copies too', filled.length === 0, filled);
  ok('the notary fields really are present on the copies (so the check can see them)',
    notary.filter(n => r.names.indexOf(n + ' co2') >= 0).length >= 10,
    notary.filter(n => r.names.indexOf(n + ' co2') >= 0).length);
  ok('no page errors on the two-co-owner path', errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

// ── 10. Two co-owners, DocuSign: the plain variants, copied the same way ────────────
console.log('\n10. Two co-owners (DocuSign) — the plain variants, one copy per owner');
{
  const { ctx, page, errs } = await open(browser);
  const CO = [{ name: FIX.co2, phone: FIX.co2Phone, email: FIX.co2Email }];
  const r = await genAudit(page, { docusign: true, lost: true, deceased: true,
                                   permission: true, heirs: 1, coOwners: CO });
  ok('the DocuSign two-co-owner packet generated without throwing', !r.error, r.error);
  ok('11 pages', r.pages === 11, r.pages);
  ok('owner A block is the PLAIN variants',
    pageIs(r, 1, 'releasePlain') && pageIs(r, 2, 'lossPlain') &&
    pageIs(r, 3, 'heirs') && pageIs(r, 4, 'permissionPlain'),
    r.perPage.slice(1, 5).map(p => p.names[0]));
  ok('owner B block is the PLAIN variants too',
    pageIs2(r, 5, 'releasePlain') && pageIs2(r, 6, 'lossPlain') &&
    pageIs2(r, 7, 'heirs') && pageIs2(r, 8, 'permissionPlain'),
    r.perPage.slice(5, 9).map(p => p.names[0]));
  ok('no notary variant reached the file, on either copy',
    !r.names.some(n => n === MARKER.releaseNotary || n === MARKER.releaseNotary + ' co2'),
    r.names.filter(n => /^day of( co2)?$/.test(n)));
  ok("owner A's plain release names A, owner B's names B",
    r.perPage[1].values['day of_2'] === FIX.grantor &&
    r.perPage[5].values['day of_2 co2'] === FIX.co2,
    [r.perPage[1].values['day of_2'], r.perPage[5].values['day of_2 co2']]);
  ok('the second signature line on the plain release is that owner too',
    r.perPage[1].values['2_2'] === FIX.grantor && r.perPage[5].values['2_2 co2'] === FIX.co2,
    [r.perPage[1].values['2_2'], r.perPage[5].values['2_2 co2']]);
  const st = await pageContent(r.b64, 9);
  ok('the statement is split for the DocuSign case as well',
    drawn(st, FIX.grantor) && drawn(st, FIX.co2) && sigLines(st).length === 2, sigLines(st));
  ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

// ── 11. Three co-owners ────────────────────────────────────────────────────────────
console.log('\n11. Three co-owners — three copies, three columns on the statement');
{
  const { ctx, page, errs } = await open(browser);
  const CO = [{ name: FIX.co2, phone: FIX.co2Phone, email: FIX.co2Email },
              { name: FIX.co3, phone: FIX.co3Phone, email: FIX.co3Email }];
  const r = await genAudit(page, { docusign: false, coOwners: CO });
  ok('the three-co-owner packet generated without throwing', !r.error, r.error);
  ok('6 pages: cover + release x 3 + statement + terms', r.pages === 6, r.pages);
  ok('the three releases are pages 2, 3 and 4',
    pageIs(r, 1, 'releaseNotary') && pageIs2(r, 2, 'releaseNotary') && pageIs3(r, 3, 'releaseNotary'),
    r.perPage.slice(1, 4).map(p => p.names[0]));
  ok('each release names its own co-owner, in list order',
    r.perPage[1].values['day of'] === FIX.grantor &&
    r.perPage[2].values['day of co2'] === FIX.co2 &&
    r.perPage[3].values['day of co3'] === FIX.co3,
    [r.perPage[1].values['day of'], r.perPage[2].values['day of co2'], r.perPage[3].values['day of co3']]);
  ok('the cover joins all three names with " & "',
    r.values['Namephone  of current property ownerRow1'] ===
      FIX.grantor + ' & ' + FIX.co2 + ' & ' + FIX.co3 + ' · ' + FIX.grantorPhone,
    r.values['Namephone  of current property ownerRow1']);
  const st = await pageContent(r.b64, 4);
  ok('all three printed names are drawn on the statement',
    drawn(st, FIX.grantor) && drawn(st, FIX.co2) && drawn(st, FIX.co3),
    [drawn(st, FIX.grantor), drawn(st, FIX.co2), drawn(st, FIX.co3)]);
  ok('the box is split into THREE equal columns',
    sigLines(st).length === 3 &&
    Math.max.apply(null, sigLines(st).map(l => l.w)) - Math.min.apply(null, sigLines(st).map(l => l.w)) < 9.01,
    sigLines(st));
  ok('no page errors', errs.length === 0, errs.slice(0, 3));

  // A name longer than its own column must shrink, then trim — never cross the border.
  const LONG = 'Cormac Fitzwilliam Ashgrove-Hollowell';
  await page.evaluate((long) => {
    document.getElementById('dtCoOwner3Name').value = long; dtUpdateDocs();
  }, LONG);
  const r2 = await genAudit(page, null);
  const st2 = await pageContent(r2.b64, 4);
  const texts = drawnTexts(st2);
  ok('an over-long name is shrunk to the minimum and then trimmed',
    texts.length === 3 && /\.\.\.$/.test(texts[2].text) && texts[2].size === 5, texts);
  ok('every drawn name starts inside its own column — centred text therefore cannot cross ' +
     'the table border',
    texts.every((t, i) => t.x >= 332.51 + i * (247.8 / 3) - 0.01), texts.map(t => t.x));
  ok('the FIELD value still carries the whole name — only the drawn caption is trimmed',
    r2.perPage[3].values['day of co3'] === LONG, r2.perPage[3].values['day of co3']);
  ok('no page errors on the over-long name', errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

// ── 12. Regression: sparse fill WITH co-owners ─────────────────────────────────────
// The 2026-08-25 crash was blank optional fields surviving the prune as orphan widgets.
// The multi-copy path builds one whole packet per co-owner, so it has to survive the same
// case N times over, in both variants.
console.log('\n12. Regression — sparse fill, two co-owners, both variants');
for (const docusign of [false, true]) {
  const { ctx, page, errs } = await open(browser);
  await page.evaluate(([fx, o]) => {
    show('dt-transfer', null);
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    const tick = (id, v) => { const e = document.getElementById(id); if (e) e.checked = !!v; };
    set('dtGrantorName', 'Sparse Grantor'); set('dtNewOwnerName', 'Sparse NewOwner');
    dtAddCoOwnerRow();
    set('dtCoOwner2Name', 'Sparse CoOwner');
    set('dtSection', 'GOM'); set('dtPlot', '3');
    tick('dtDocuSign', o.docusign); tick('dtLostCert', true);
    dtUpdateDocs();
  }, [FIX, { docusign }]);
  const label = docusign ? 'DocuSign' : 'notary';
  const r = await genAudit(page, null);
  ok(`sparse ${label}, 2 co-owners: generated without throwing`, !r.error, r.error);
  ok(`sparse ${label}, 2 co-owners: 7 pages — cover + (release + loss) x 2 + statement + terms`,
    r.pages === 7, r.pages);
  ok(`sparse ${label}, 2 co-owners: both copies survived the appearance bake`,
    pageText(r, 1).indexOf('Sparse Grantor') >= 0 && pageText(r, 3).indexOf('Sparse CoOwner') >= 0,
    [pageText(r, 1).slice(0, 60), pageText(r, 3).slice(0, 60)]);
  ok(`sparse ${label}, 2 co-owners: the statement still splits`,
    drawn(await pageContent(r.b64, 5), 'Sparse CoOwner'));
  ok(`sparse ${label}, 2 co-owners: no page errors`,
    errs.filter(e => !/favicon/.test(e)).length === 0, errs.slice(0, 3));
  await ctx.close();
}

// ── 13. Save / restore round-trips the co-owner list ───────────────────────────────
console.log('\n13. Save / restore with co-owners, and a record saved before sprint 29');
{
  const { ctx, page, errs } = await open(browser);
  await fillLane(page, { docusign: true, lost: true, heirs: 0,
                         coOwners: [{ name: FIX.co2, phone: FIX.co2Phone, email: FIX.co2Email }] });
  const saved = await page.evaluate(() => {
    const realPrompt = window.prompt;
    window.prompt = () => 'Ashgrove co-owner transfer';
    try { saveDeedTransfer(); } finally { window.prompt = realPrompt; }
    const snap = _dtSavedTransfers[0] || {};
    return { id: snap.id, coOwners: (snap.state || {}).coOwners, rows: (snap.state || {}).coOwnerRows };
  });
  ok('the record carries a coOwners array', Array.isArray(saved.coOwners) && saved.coOwners.length === 2, saved.coOwners);
  ok('coOwners is primary-first', saved.coOwners[0].name === FIX.grantor && saved.coOwners[1].name === FIX.co2, saved.coOwners);
  ok('the visible row count is recorded too', saved.rows === 2, saved.rows);

  const back = await page.evaluate((id) => {
    dtClearAll();
    loadSavedDeedTransfer(id);
    const g = (i) => (document.getElementById(i) || {}).value;
    return { rows: dtVisibleCoOwnerRows(), names: dtCoOwnerNames(),
             phone2: g('dtCoOwner2Phone'), email2: g('dtCoOwner2Email'),
             btn: document.getElementById('dtAddCoOwnerBtn').style.display };
  }, saved.id);
  ok('restore brings back two visible co-owner rows', back.rows === 2, back.rows);
  ok('restore brings back both names, primary first',
    back.names.join('|') === FIX.grantor + '|' + FIX.co2, back.names);
  ok("restore brings back the co-owner's own phone and e-mail",
    back.phone2 === FIX.co2Phone && back.email2 === FIX.co2Email, [back.phone2, back.email2]);
  ok('the Add button is still offered at two of three rows', back.btn === '', back.btn);

  const again = await genAudit(page, null);
  ok('the restored two-co-owner transfer regenerates the same packet',
    again.pages === 7 && again.perPage[3].values['day of_2 co2'] === FIX.co2,
    [again.pages, again.perPage[3] && again.perPage[3].values['day of_2 co2']]);

  // A record written before sprint 29 has no coOwners and no dtCoOwner* fields at all.
  const legacy = await page.evaluate((id) => {
    const snap = _dtSavedTransfers.find(q => q.id === id);
    delete snap.state.coOwners; delete snap.state.coOwnerRows;
    Object.keys(snap.state.fields).forEach(k => { if (/^dtCoOwner/.test(k)) delete snap.state.fields[k]; });
    dtClearAll();
    loadSavedDeedTransfer(id);
    const g = (i) => (document.getElementById(i) || {}).value;
    return { rows: dtVisibleCoOwnerRows(), names: dtCoOwnerNames(), name2: g('dtCoOwner2Name'),
             grantor: g('dtGrantorName'), btn: document.getElementById('dtAddCoOwnerBtn').style.display };
  }, saved.id);
  ok('a pre-sprint-29 record restores as ONE owner', legacy.rows === 1 && legacy.names.length === 1, legacy);
  ok('a pre-sprint-29 record still restores its grantor', legacy.grantor === FIX.grantor, legacy.grantor);
  ok('no stale co-owner value is left behind', legacy.name2 === '', legacy.name2);
  ok('and the Add button is offered again', legacy.btn === '', legacy.btn);
  ok('no page errors across save and restore with co-owners', errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
