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

// Which template document a page IS, from the field only that page carries.
const pageIs  = (r, i, key) => (r.perPage[i] || { names: [] }).names.indexOf(MARKER[key]) >= 0;
// Every value printed on one page, as one string.
const pageText = (r, i) => Object.keys((r.perPage[i] || {}).values || {})
  .map(k => r.perPage[i].values[k]).join(String.fromCharCode(10));

// A split signature box prints each co-owner's name and rule as page CONTENT, not as field
// values — pdf-lib emits hex-encoded show-text and filled rectangles. Nothing in the AcroForm
// carries them, so the only honest check is to decompress the page and look.
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
// The drawn signature rules: the black ones of that thickness, left to right. Each page keeps
// its own template's rule height — 0.72 on the statement, 0.48 on both Release variants and on
// the Affidavit for Loss, 0.6 on the Permission of Use.
const RULE_H = { statement: 0.72, release: 0.48, loss: 0.48, permission: 0.6 };
const sigLines = (content, h) => drawnRects(content)
  .filter(d => d.r === 0 && d.g === 0 && d.b === 0 && Math.abs(d.h - h) < 0.01)
  .sort((a, b) => a.x - b.x);
// The same rules read as STACKED ROWS: top of the page first, which is reading order. Every
// page but the statement stacks now — one full-width line per co-owner — so an assertion about
// "the second signer's line" is an assertion about y, not about x.
const sigRows = (content, h) => drawnRects(content)
  .filter(d => d.r === 0 && d.g === 0 && d.b === 0 && Math.abs(d.h - h) < 0.01)
  .sort((a, b) => b.y - a.y);
// The drawn names in the same order.
const nameRows = (content) => drawnTexts(content).sort((a, b) => b.y - a.y);
// Row baselines, top first, compared to the tenth of a point. Never compare these as strings:
// pdf-lib writes whatever the float arithmetic produced, so 480.52 can reach the stream as
// 480.52000000000004.
const atY = (rows, ys) => rows.length === ys.length &&
  rows.every((r, i) => Math.abs(r.y - ys[i]) < 0.01);
// A stack is N full-width rules at one x, evenly pitched, each with a name below it and above
// the next rule. This is the shape the operator asked for — "separate lines so they don't have
// to sign so small" — expressed once, so every page can assert it.
const stackOK = (content, h, x, w, names) => {
  const R = sigRows(content, h), T = nameRows(content);
  if (R.length !== names.length || T.length !== names.length) return false;
  const pitch = R.length > 1 ? R[0].y - R[1].y : 0;
  return R.every((r, i) =>
      Math.abs(r.x - x) < 0.01 && Math.abs(r.w - w) < 0.01 &&
      (i === 0 || Math.abs((R[i - 1].y - r.y) - pitch) < 0.01) &&
      T[i].text === names[i] && T[i].y < r.y && T[i].y > r.y - pitch);
};

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
// fields, co-owners 2..3 in rows that already exist in the DOM. Operator ruling 2026-09-07:
// "We can collect all the info it just doesn't need to print everywhere if there's not room"
// — so the list changes what the packet SAYS, never how many pages it has.
console.log('\n8. The co-owner list, the row UI and the page maths');
{
  const { ctx, page, errs } = await open(browser);
  const m = await page.evaluate((fx) => {
    show('dt-transfer', null);
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    const btn = () => document.getElementById('dtAddCoOwnerBtn').style.display;
    const listed = () => document.getElementById('dtDocList').textContent;
    const sel = { docusign: false, release: true, loss: true, heirs: true, permission: true };
    set('dtGrantorName', fx.grantor); set('dtGrantorPhone', fx.grantorPhone);
    set('dtGrantorEmail', fx.grantorEmail);
    dtUpdateDocs();
    const one = dtCoOwners(), names1 = dtOwnerNames();
    const pages1 = dtPageIndexes(sel).length, listed1 = listed();
    const addedRow = dtAddCoOwnerRow();
    set('dtCoOwner2Name', fx.co2); set('dtCoOwner2Phone', fx.co2Phone); set('dtCoOwner2Email', fx.co2Email);
    dtUpdateDocs();
    const two = dtCoOwners(), names2 = dtOwnerNames();
    const pages2 = dtPageIndexes(sel).length, listed2 = listed();
    dtAddCoOwnerRow();
    set('dtCoOwner3Name', fx.co3); set('dtCoOwner3Phone', fx.co3Phone);
    dtUpdateDocs();
    const three = dtCoOwners(), names3 = dtOwnerNames();
    const pages3 = dtPageIndexes(sel).length, listed3 = listed();
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
    const docs = dtDocList(sel).map(d => d.name + ' | ' + d.note);
    dtClearAll();
    const cleared = { rows: dtVisibleCoOwnerRows(),
                      name2: document.getElementById('dtCoOwner2Name').value, btn: btn() };
    return { one, two, three, addedRow, capped, btnHidden, blankDropped, afterRemove,
             primaryKept, cleared, docs,
             names1, names2, names3, pages1, pages2, pages3, listed1, listed2, listed3 };
  }, FIX);

  ok('one owner: dtCoOwners() is the primary alone',
    m.one.length === 1 && m.one[0].name === FIX.grantor, m.one);
  ok('the primary carries their own phone and e-mail',
    m.one[0].phone === FIX.grantorPhone && m.one[0].email === FIX.grantorEmail, m.one[0]);
  ok('"Add co-owner" reveals row 2', m.addedRow === 2, m.addedRow);
  ok('two owners: the primary is FIRST, then the co-owner',
    m.two.length === 2 && m.two[0].name === FIX.grantor && m.two[1].name === FIX.co2, m.two);
  ok("a co-owner's phone and e-mail are still COLLECTED — they are kept on the record",
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

  // Operator ruling: "Some of these on the forms should be as simple as giving both names."
  ok('dtOwnerNames() is one name at one owner', m.names1 === FIX.grantor, m.names1);
  ok('dtOwnerNames() joins two owners with " & "',
    m.names2 === FIX.grantor + ' & ' + FIX.co2, m.names2);
  ok('dtOwnerNames() joins three the same way',
    m.names3 === FIX.grantor + ' & ' + FIX.co2 + ' & ' + FIX.co3, m.names3);

  // The ruling that replaced the per-copy assembly: one packet, however many owners.
  ok('the page set does NOT grow with the number of co-owners — one packet, one copy of each',
    m.pages1 === 7 && m.pages2 === 7 && m.pages3 === 7, [m.pages1, m.pages2, m.pages3]);
  ok('the on-screen document list says the same thing at one, two and three co-owners',
    m.listed1 === m.listed2 && m.listed2 === m.listed3, [m.listed1, m.listed2]);
  // No situation toggle is ticked here, so the on-screen set is the baseline four pages —
  // and it stays four with three co-owners on the deed, not a multiple of them.
  ok('and it says 4 pages at three co-owners, not a per-owner multiple',
    /^The download will contain 4 pages:/.test(m.listed3), m.listed3.slice(0, 60));
  ok('no document is tagged as copied per co-owner',
    m.docs.every(d => !/co-owner/i.test(d)), m.docs);
  ok('Clear All collapses the list back to the primary row alone',
    m.cleared.rows === 1 && m.cleared.name2 === '' && m.cleared.btn === '', m.cleared);
  ok('no page errors across the co-owner row UI', errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

// ── 9. Two co-owners, in person: ONE packet, both names, split signature lines ──────
// The operator's ruling of 2026-09-07: "Permission of Use, Affidavit of Heirs, Affidavit for
// Loss of Certificate, Release if Interment rights needs both of their signatures just split
// the green box in half." One copy of each document, both names written in, and the two places
// they must BOTH sign — the Release line and the statement's green box — split in half.
console.log('\n9. Two co-owners (notary) — one packet, both names, split signature lines');
{
  const { ctx, page, errs } = await open(browser);
  const CO = [{ name: FIX.co2, phone: FIX.co2Phone, email: FIX.co2Email }];
  const BOTH = FIX.grantor + ' & ' + FIX.co2;
  const r = await genAudit(page, { docusign: false, lost: true, deceased: true,
                                   permission: true, heirs: 1, coOwners: CO });
  ok('the two-co-owner packet generated without throwing', !r.error, r.error);
  ok('7 pages — exactly the one-owner page set: there are no per-co-owner copies',
    r.pages === 7, r.pages);
  ok('cover, release, loss, heirs, permission, statement, terms — once each',
    pageIs(r, 0, 'cover') && pageIs(r, 1, 'releaseNotary') && pageIs(r, 2, 'lossNotary') &&
    pageIs(r, 3, 'heirs') && pageIs(r, 4, 'permissionNotary') && pageIs(r, 5, 'statement') &&
    r.perPage[6].names.length === 0,
    r.perPage.map(p => p.names[0]));
  ok('no field name carries a copy suffix — there are no copies to tell apart',
    r.names.every(n => !/ co\d+$/.test(n)), r.names.filter(n => / co\d+$/.test(n)));

  ok('the release names BOTH owners in the grantor box', r.values['day of'] === BOTH, r.values['day of']);
  ok('the release address and phone stay the shared address and the primary phone',
    /Larkspur/.test(r.values['Grantors Address'] || '') &&
    r.values['Grantors Phone Num'] === FIX.grantorPhone,
    [r.values['Grantors Address'], r.values['Grantors Phone Num']]);
  ok('the cover joins the names with " & " and prints the primary phone',
    r.values['Namephone  of current property ownerRow1'] === BOTH + ' · ' + FIX.grantorPhone,
    r.values['Namephone  of current property ownerRow1']);
  ok('the statement leaves Current Name Print EMPTY at two co-owners',
    !r.values['Current Name Print'], r.values['Current Name Print']);
  ok('the statement address block stays ONE block: shared address, primary e-mail and phone',
    r.values['Address Current'] === FIX.grantorAddress &&
    r.values['Zip Current'] === FIX.grantorZip &&
    r.values['Email Current'] === FIX.grantorEmail &&
    r.values['Cell Phone Current'] === FIX.grantorPhone,
    [r.values['Address Current'], r.values['Email Current'], r.values['Cell Phone Current']]);
  ok("the co-owner's own phone and e-mail print NOWHERE — there is no box for them",
    Object.values(r.values).every(v => v.indexOf(FIX.co2Phone) < 0 && v.indexOf(FIX.co2Email) < 0),
    Object.keys(r.values).filter(k => /0188|beatrix@/.test(r.values[k])));

  // ── the statement's green box, split in half ──
  const st = await pageContent(r.b64, 5);
  ok('BOTH printed names are DRAWN into the split statement box',
    drawn(st, FIX.grantor) && drawn(st, FIX.co2), [drawn(st, FIX.grantor), drawn(st, FIX.co2)]);
  ok('the statement box is split into TWO signature lines of equal width',
    sigLines(st, RULE_H.statement).length === 2 &&
    Math.abs(sigLines(st, RULE_H.statement)[0].w - sigLines(st, RULE_H.statement)[1].w) < 0.01,
    sigLines(st, RULE_H.statement));
  ok('the two statement lines sit inside the green box, left edge to right edge',
    sigLines(st, RULE_H.statement).length === 2 &&
    sigLines(st, RULE_H.statement)[0].x > 332.4 && sigLines(st, RULE_H.statement)[0].x < 332.6 &&
    sigLines(st, RULE_H.statement)[1].x + sigLines(st, RULE_H.statement)[1].w > 580.2 &&
    sigLines(st, RULE_H.statement).every(l => Math.abs(l.y - 436.56) < 0.01),
    sigLines(st, RULE_H.statement));
  ok('the original full-width statement rule was erased and its background restored: green ' +
     'above the fill boundary, white below',
    drawnRects(st).some(d => d.r === 0.8 && d.g === 1 && d.b === 0.8 && Math.abs(d.w - 247.8) < 0.01) &&
    drawnRects(st).some(d => d.r === 1 && d.g === 1 && d.b === 1 && Math.abs(d.w - 247.8) < 0.01),
    drawnRects(st).filter(d => Math.abs(d.w - 247.8) < 0.01));
  ok('the "Printed Name" caption was whited out — each column is captioned by its own name',
    drawnRects(st).some(d => d.r === 1 && d.g === 1 && d.b === 1 &&
                             Math.abs(d.w - 40) < 0.01 && Math.abs(d.h - 7.3) < 0.01),
    drawnRects(st).filter(d => d.r === 1 && d.w < 100));

  // ── the Release's Grantor's Signature line: a SEPARATE FULL-WIDTH LINE EACH, stacked ──
  // Operator, 2026-09-07, superseding "split it in half" for every page but the green box:
  // "No I think it should separate lines so they don't have to sign so small."
  const rl = await pageContent(r.b64, 1);
  ok("BOTH printed names are DRAWN under the Release's stacked signature lines",
    drawn(rl, FIX.grantor) && drawn(rl, FIX.co2), [drawn(rl, FIX.grantor), drawn(rl, FIX.co2)]);
  ok('the Release gives each owner a FULL-WIDTH line of his own — two rules, both 313.2 to ' +
     '522.84, one above the other, each with that owner\'s name under it',
    stackOK(rl, RULE_H.release, 313.2, 209.64, [FIX.grantor, FIX.co2]),
    [sigRows(rl, RULE_H.release), nameRows(rl)]);
  ok('the two Release lines are STACKED, not side by side: same x, 30pt apart in y',
    sigRows(rl, RULE_H.release).length === 2 &&
    Math.abs(sigRows(rl, RULE_H.release)[0].y - 450.52) < 0.01 &&
    Math.abs(sigRows(rl, RULE_H.release)[1].y - 420.52) < 0.01,
    sigRows(rl, RULE_H.release).map(l => [l.x, l.y]));
  ok('the two drawn names sit at DIFFERENT y — the proof they are not columns',
    nameRows(rl).length === 2 && Math.abs(nameRows(rl)[0].y - 440.4) < 0.01 &&
    Math.abs(nameRows(rl)[1].y - 410.4) < 0.01, nameRows(rl).map(t => t.y));
  ok("the template's own full-width Release rule was whited out at its own y (392.3 down to " +
     '402.3 in user space), so only the stack is on the page',
    drawnRects(rl).some(d => d.r === 1 && d.g === 1 && d.b === 1 &&
                             Math.abs(d.w - 210.5) < 0.01 && Math.abs(d.y - 402.3) < 0.01),
    drawnRects(rl).filter(d => d.r === 1));
  ok('the whole stack sits ABOVE the kept "(Grantor\'s Signature)" caption (top of its ink is ' +
     'y 397.67) and inside the blank band, whose ceiling is the body text at y 538.67',
    nameRows(rl).every(t => t.y > 397.67) &&
    sigRows(rl, RULE_H.release).every(l => l.y < 538.67),
    [nameRows(rl).map(t => t.y), sigRows(rl, RULE_H.release).map(l => l.y)]);

  // ── the Affidavit for Loss, stacked the same way (the operator's amendment) ──
  const lo = await pageContent(r.b64, 2);
  ok('the Loss affidavit gives each owner a full-width line of his own, 279 to 527.4, stacked',
    stackOK(lo, RULE_H.loss, 279, 248.4, [FIX.grantor, FIX.co2]),
    [sigRows(lo, RULE_H.loss), nameRows(lo)]);
  ok('the two Loss lines are 30pt apart in y (360.52 and 330.52) and their names differ in y too',
    Math.abs(sigRows(lo, RULE_H.loss)[0].y - 360.52) < 0.01 &&
    Math.abs(sigRows(lo, RULE_H.loss)[1].y - 330.52) < 0.01 &&
    nameRows(lo)[0].y !== nameRows(lo)[1].y,
    [sigRows(lo, RULE_H.loss).map(l => l.y), nameRows(lo).map(t => t.y)]);
  ok("BOTH of the block's blank template rules were whited out — the stack replaces the whole " +
     'two-line block, so no uncaptioned full-width line is left among the printed names',
    drawnRects(lo).filter(d => d.r === 1 && d.g === 1 && d.b === 1 &&
      (Math.abs(d.y - 360.3) < 0.01 || Math.abs(d.y - 341.0) < 0.01)).length === 2,
    drawnRects(lo).filter(d => d.r === 1));
  ok('the whole Loss stack is inside its blank band — below the body paragraph (y 393.83) and ' +
     'clear above the notary block (first ink y 311.0)',
    sigRows(lo, RULE_H.loss).every(l => l.y < 393.83) && nameRows(lo).every(t => t.y > 311.0),
    [sigRows(lo, RULE_H.loss).map(l => l.y), nameRows(lo).map(t => t.y)]);

  // ── the Permission of Use, NOT stacked here: an HEIR signs it in this situation ──
  // The owner is deceased in this case, so dtFillForm() puts the heir affiant in 'I_2' and
  // 'Name_4' — ONE signer. Stacking would put two dead owners' names under lines the heir
  // signs. Section 16 is the case where the owners sign it themselves.
  const pm = await pageContent(r.b64, 4);
  ok('the Permission of Use names the HEIR as the signer, not the owners',
    r.values['I_2'] === FIX.heirAffiant && r.values['Name_4'] === FIX.heirAffiant,
    [r.values['I_2'], r.values['Name_4']]);
  ok('so nothing is drawn on it — one signer, the template\'s own single line',
    drawnRects(pm).length === 0 && drawnTexts(pm).length === 0,
    [drawnRects(pm).length, drawnTexts(pm).length]);

  const notary = await page.evaluate(() => window.DT_NOTARY_FIELDS);
  const filled = notary.filter(n => r.values[n]);
  ok('EVERY notary-block field is still blank', filled.length === 0, filled);
  ok('no page errors on the two-co-owner path', errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

// ── 10. Two co-owners, DocuSign: the plain variants, split the same way ─────────────
console.log('\n10. Two co-owners (DocuSign) — the plain variants');
{
  const { ctx, page, errs } = await open(browser);
  const CO = [{ name: FIX.co2, phone: FIX.co2Phone, email: FIX.co2Email }];
  const BOTH = FIX.grantor + ' & ' + FIX.co2;
  const r = await genAudit(page, { docusign: true, lost: true, deceased: true,
                                   permission: true, heirs: 1, coOwners: CO });
  ok('the DocuSign two-co-owner packet generated without throwing', !r.error, r.error);
  ok('7 pages — the same page set as one owner', r.pages === 7, r.pages);
  ok('every document is the PLAIN variant, once each',
    pageIs(r, 1, 'releasePlain') && pageIs(r, 2, 'lossPlain') &&
    pageIs(r, 3, 'heirs') && pageIs(r, 4, 'permissionPlain'),
    r.perPage.slice(1, 5).map(p => p.names[0]));
  ok('no notary variant reached the file', !r.names.some(n => n === MARKER.releaseNotary),
    r.names.filter(n => /^day of$/.test(n)));
  ok('the plain release names BOTH owners in the grantor box',
    r.values['day of_2'] === BOTH, r.values['day of_2']);
  ok("the plain release's own printed-name widget ('2_2') is left EMPTY — the split draws the " +
     'names on the rule instead',
    !r.values['2_2'], r.values['2_2']);

  const rl = await pageContent(r.b64, 1);
  ok('the plain Release gives each owner his own full-width line, stacked, names underneath',
    stackOK(rl, RULE_H.release, 313.2, 209.64, [FIX.grantor, FIX.co2]),
    [sigRows(rl, RULE_H.release), nameRows(rl)]);
  ok('the plain Release stack sits at the same y as the notary one — 450.52 and 420.52',
    Math.abs(sigRows(rl, RULE_H.release)[0].y - 450.52) < 0.01 &&
    Math.abs(sigRows(rl, RULE_H.release)[1].y - 420.52) < 0.01,
    sigRows(rl, RULE_H.release).map(l => l.y));
  ok("the plain variant's own rule is 2pt lower than the notary one, and that is the rule " +
     'erased here (y 400.3, not 402.3)',
    drawnRects(rl).some(d => d.r === 1 && Math.abs(d.y - 400.3) < 0.01 && Math.abs(d.w - 210.5) < 0.01),
    drawnRects(rl).filter(d => d.r === 1));

  const lo = await pageContent(r.b64, 2);
  ok('the plain Loss affidavit stacks two full-width lines, 279 to 527.4, names underneath',
    stackOK(lo, RULE_H.loss, 279, 248.4, [FIX.grantor, FIX.co2]),
    [sigRows(lo, RULE_H.loss), nameRows(lo)]);
  ok("the plain variant's SECOND blank rule is 16pt lower than the notary one, and that is the " +
     'one erased here (user space 325.0, not 341.0)',
    drawnRects(lo).some(d => d.r === 1 && Math.abs(d.y - 325.0) < 0.01) &&
    !drawnRects(lo).some(d => d.r === 1 && Math.abs(d.y - 341.0) < 0.01),
    drawnRects(lo).filter(d => d.r === 1).map(d => d.y));
  ok('the plain Permission of Use is not stacked either — the heir signs it in this case too',
    drawnRects(await pageContent(r.b64, 4)).length === 0 &&
    drawnTexts(await pageContent(r.b64, 4)).length === 0);

  const st = await pageContent(r.b64, 5);
  ok('the statement is split for the DocuSign case as well',
    drawn(st, FIX.grantor) && drawn(st, FIX.co2) && sigLines(st, RULE_H.statement).length === 2,
    sigLines(st, RULE_H.statement));
  ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

// ── 11. The fallback names at two co-owners ────────────────────────────────────────
// Nothing optional typed in, so every "or fall back to the owner" default fires. Both names
// go in wherever the document NAMES the owner — with one exception: a decedent is one person,
// so the Affidavit of Heirs falls back to the PRIMARY alone. "A & B" is not a decedent.
console.log('\n11. Fallback names at two co-owners — and the decedent exception');
{
  const { ctx, page, errs } = await open(browser);
  const BOTH = FIX.grantor + ' & ' + FIX.co2;
  await page.evaluate((fx) => {
    show('dt-transfer', null);
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    const tick = (id, v) => { const e = document.getElementById(id); if (e) e.checked = !!v; };
    set('dtGrantorName', fx.grantor); set('dtGrantorPhone', fx.grantorPhone);
    set('dtGrantorAddress', fx.grantorAddress); set('dtGrantorCity', fx.grantorCity);
    set('dtGrantorState', fx.grantorState); set('dtGrantorZip', fx.grantorZip);
    set('dtNewOwnerName', fx.newOwner);
    dtAddCoOwnerRow(); set('dtCoOwner2Name', fx.co2);
    tick('dtLostCert', true); tick('dtOwnerDeceased', true); tick('dtPermissionUse', true);
    dtUpdateDocs();
  }, FIX);
  const r = await genAudit(page, null);
  ok('the defaults packet generated without throwing', !r.error, r.error);
  ok('the loss affidavit affiant defaults to BOTH owners',
    r.values['being duly sworn deposes and says'] === BOTH,
    r.values['being duly sworn deposes and says']);
  ok('the loss affidavit "That I, ... reside at" names both owners at the shared address',
    r.values['NAME NUMERO2'] === BOTH && /Larkspur/.test(r.values['reside at'] || ''),
    [r.values['NAME NUMERO2'], r.values['reside at']]);
  ok('the affidavit of heirs affiant defaults to BOTH owners',
    r.values['SWORN BORN LORN'] === BOTH, r.values['SWORN BORN LORN']);
  ok('EXCEPTION — the affidavit of heirs DECEDENT is the primary owner ALONE, never a joined ' +
     'string: a death is not recorded under two names',
    r.values['DEPOSES SAYS BLANK'] === FIX.grantor, r.values['DEPOSES SAYS BLANK']);
  ok('the permission-of-use signer defaults to BOTH owners',
    r.values['I_2'] === BOTH && r.values['Name_4'] === BOTH, [r.values['I_2'], r.values['Name_4']]);
  ok('the permission-of-use deceased owner is the primary alone, for the same reason',
    r.values['the property that belonged to'] === FIX.grantor,
    r.values['the property that belonged to']);
  ok('the signer being the owners themselves, the address and phone under the signature are ' +
     'the shared address and the primary phone',
    /Larkspur/.test(r.values['Address 1'] || '') && r.values['Phone'] === FIX.grantorPhone,
    [r.values['Address 1'], r.values['Phone']]);
  await page.evaluate(() => {
    document.getElementById('dtDecedentName').value = 'Someone Else Entirely';
    document.getElementById('dtAffiantName').value  = 'Named Affiant';
  });
  const r2 = await genAudit(page, null);
  ok('a typed affiant and a typed decedent both override the co-owner defaults',
    r2.values['being duly sworn deposes and says'] === 'Named Affiant' &&
    r2.values['DEPOSES SAYS BLANK'] === 'Someone Else Entirely',
    [r2.values['being duly sworn deposes and says'], r2.values['DEPOSES SAYS BLANK']]);
  // The signer guard, both ways round, on the same page of the same case.
  ok('with NO affiant typed the Loss affidavit stacks a line for each co-owner',
    stackOK(await pageContent(r.b64, 2), RULE_H.loss, 279, 248.4, [FIX.grantor, FIX.co2]),
    sigRows(await pageContent(r.b64, 2), RULE_H.loss));
  ok('with a DIFFERENT affiant named, that one person signs and nothing is stacked — two ' +
     'owner lines under an affidavit sworn by somebody else would be a false document',
    drawnRects(await pageContent(r2.b64, 2)).length === 0 &&
    drawnTexts(await pageContent(r2.b64, 2)).length === 0,
    drawnRects(await pageContent(r2.b64, 2)));
  ok('no page errors on the defaults path', errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

// ── 12. Three co-owners ────────────────────────────────────────────────────────────
console.log('\n12. Three co-owners — still one packet, three columns');
{
  const { ctx, page, errs } = await open(browser);
  const CO = [{ name: FIX.co2, phone: FIX.co2Phone, email: FIX.co2Email },
              { name: FIX.co3, phone: FIX.co3Phone, email: FIX.co3Email }];
  const ALL = FIX.grantor + ' & ' + FIX.co2 + ' & ' + FIX.co3;
  const r = await genAudit(page, { docusign: false, coOwners: CO });
  ok('the three-co-owner packet generated without throwing', !r.error, r.error);
  ok('4 pages — cover, release, statement, terms', r.pages === 4, r.pages);
  ok('the release names all three owners', r.values['day of'] === ALL, r.values['day of']);
  ok('the cover joins all three names with " & "',
    r.values['Namephone  of current property ownerRow1'] === ALL + ' · ' + FIX.grantorPhone,
    r.values['Namephone  of current property ownerRow1']);

  const st = await pageContent(r.b64, 2), rl = await pageContent(r.b64, 1);
  ok('all three printed names are drawn on the statement',
    drawn(st, FIX.grantor) && drawn(st, FIX.co2) && drawn(st, FIX.co3),
    [drawn(st, FIX.grantor), drawn(st, FIX.co2), drawn(st, FIX.co3)]);
  ok('the statement box is split into THREE columns',
    sigLines(st, RULE_H.statement).length === 3 &&
    Math.max.apply(null, sigLines(st, RULE_H.statement).map(l => l.w)) -
    Math.min.apply(null, sigLines(st, RULE_H.statement).map(l => l.w)) < 9.01,
    sigLines(st, RULE_H.statement));
  ok('the Release gives all THREE owners a full-width line each, stacked 30pt apart, in the ' +
     'order they were entered',
    stackOK(rl, RULE_H.release, 313.2, 209.64, [FIX.grantor, FIX.co2, FIX.co3]),
    [sigRows(rl, RULE_H.release), nameRows(rl)]);
  ok('the three Release lines are at y 480.52 / 450.52 / 420.52 and all three names are drawn ' +
     'at 9pt — a stacked line does not shrink the way a third column does',
    atY(sigRows(rl, RULE_H.release), [480.52, 450.52, 420.52]) &&
    nameRows(rl).every(t => t.size === 9),
    [sigRows(rl, RULE_H.release).map(l => l.y), nameRows(rl).map(t => t.size)]);
  ok('the top of the three-row stack still clears the body text above it (y 538.67)',
    sigRows(rl, RULE_H.release)[0].y < 538.67, sigRows(rl, RULE_H.release)[0].y);
  ok('no page errors', errs.length === 0, errs.slice(0, 3));

  // A name longer than its own column must shrink, then trim — never cross the border.
  const LONG = 'Cormac Fitzwilliam Ashgrove-Hollowell-Beaumont';
  await page.evaluate((long) => {
    document.getElementById('dtCoOwner3Name').value = long; dtUpdateDocs();
  }, LONG);
  const r2 = await genAudit(page, null);
  const t2 = drawnTexts(await pageContent(r2.b64, 2));
  ok('an over-long name is shrunk to the minimum and then trimmed on the statement',
    t2.length === 3 && /\.\.\.$/.test(t2[2].text) && t2[2].size === 5, t2);
  ok('every drawn name starts inside its own column — centred text therefore cannot cross the ' +
     'table border',
    t2.every((t, i) => t.x >= 332.51 + i * (247.8 / 3) - 0.01), t2.map(t => t.x));
  ok('the FIELD value still carries the whole name — only the drawn caption is trimmed',
    r2.values['day of'] === FIX.grantor + ' & ' + FIX.co2 + ' & ' + LONG, r2.values['day of']);
  ok('no page errors on the over-long name', errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

// ── 13. Control: at ONE owner nothing is drawn at all ──────────────────────────────
// The split is what a second owner buys. With one owner both pages must be byte-for-byte the
// s27 behaviour — no erase rectangle, no rule, no drawn name — or the assertions above would
// pass just as happily on a generator that always splits.
console.log('\n13. Control — at one owner neither page is drawn on');
{
  const { ctx, page, errs } = await open(browser);
  const r = await genAudit(page, { docusign: false, lost: true, deceased: true,
                                   permission: true, heirs: 1 });
  ok('the one-owner packet generated without throwing', !r.error, r.error);
  ok('7 pages', r.pages === 7, r.pages);
  const rl = await pageContent(r.b64, 1), st = await pageContent(r.b64, 5);
  const lo = await pageContent(r.b64, 2), pm = await pageContent(r.b64, 4);
  ok('nothing is drawn on the Release page', drawnRects(rl).length === 0 && drawnTexts(rl).length === 0,
    [drawnRects(rl).length, drawnTexts(rl).length]);
  ok('nothing is drawn on the statement page', drawnRects(st).length === 0 && drawnTexts(st).length === 0,
    [drawnRects(st).length, drawnTexts(st).length]);
  ok('nothing is drawn on the Affidavit for Loss — the two blank rules on it are the ones the ' +
     'template itself drew',
    drawnRects(lo).length === 0 && drawnTexts(lo).length === 0,
    [drawnRects(lo).length, drawnTexts(lo).length]);
  ok('nothing is drawn on the Permission of Use', drawnRects(pm).length === 0 && drawnTexts(pm).length === 0,
    [drawnRects(pm).length, drawnTexts(pm).length]);
  ok('the statement prints the single owner in Current Name Print, as it always did',
    r.values['Current Name Print'] === FIX.grantor, r.values['Current Name Print']);
  ok('the plain release variant is not in this packet, so its widget is untested here',
    r.names.indexOf('2_2') < 0, r.names.indexOf('2_2'));
  ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

// ── 14. Regression: sparse fill WITH co-owners ─────────────────────────────────────
// The 2026-08-25 crash was blank optional fields surviving the prune as orphan widgets. The
// split draws over a page whose fields have already been baked and pruned, so the sparse case
// has to survive that too — in both variants.
console.log('\n14. Regression — sparse fill, two co-owners, both variants');
for (const docusign of [false, true]) {
  const { ctx, page, errs } = await open(browser);
  await page.evaluate(([o]) => {
    show('dt-transfer', null);
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    const tick = (id, v) => { const e = document.getElementById(id); if (e) e.checked = !!v; };
    set('dtGrantorName', 'Sparse Grantor'); set('dtNewOwnerName', 'Sparse NewOwner');
    dtAddCoOwnerRow();
    set('dtCoOwner2Name', 'Sparse CoOwner');
    tick('dtDocuSign', o.docusign); tick('dtLostCert', true);
    dtUpdateDocs();
  }, [{ docusign }]);
  const label = docusign ? 'DocuSign' : 'notary';
  const r = await genAudit(page, null);
  ok(`sparse ${label}, 2 co-owners: generated without throwing`, !r.error, r.error);
  ok(`sparse ${label}, 2 co-owners: 5 pages — cover, release, loss affidavit, statement, terms`,
    r.pages === 5, r.pages);
  ok(`sparse ${label}, 2 co-owners: both names survived the appearance bake`,
    pageText(r, 1).indexOf('Sparse Grantor & Sparse CoOwner') >= 0, pageText(r, 1).slice(0, 80));
  ok(`sparse ${label}, 2 co-owners: the statement still splits`,
    drawn(await pageContent(r.b64, 3), 'Sparse CoOwner'));
  ok(`sparse ${label}, 2 co-owners: the release still stacks`,
    stackOK(await pageContent(r.b64, 1), RULE_H.release, 313.2, 209.64,
      ['Sparse Grantor', 'Sparse CoOwner']),
    sigRows(await pageContent(r.b64, 1), RULE_H.release));
  ok(`sparse ${label}, 2 co-owners: the Affidavit for Loss still stacks`,
    stackOK(await pageContent(r.b64, 2), RULE_H.loss, 279, 248.4,
      ['Sparse Grantor', 'Sparse CoOwner']),
    sigRows(await pageContent(r.b64, 2), RULE_H.loss));
  ok(`sparse ${label}, 2 co-owners: no page errors`,
    errs.filter(e => !/favicon/.test(e)).length === 0, errs.slice(0, 3));
  await ctx.close();
}

// ── 15. Save / restore round-trips the co-owner list ───────────────────────────────
// A co-owner's phone and e-mail print nowhere, but they are still COLLECTED and must still
// round-trip: the operator's ruling was "we can collect all the info it just doesn't need to
// print everywhere if there's not room."
console.log('\n15. Save / restore with co-owners, and a record saved before sprint 29');
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
  ok("the co-owner's phone and e-mail are on the record even though they print nowhere",
    saved.coOwners[1].phone === FIX.co2Phone && saved.coOwners[1].email === FIX.co2Email, saved.coOwners[1]);
  ok('the visible row count is recorded too', saved.rows === 2, saved.rows);

  const back = await page.evaluate((id) => {
    dtClearAll();
    loadSavedDeedTransfer(id);
    const g = (i) => (document.getElementById(i) || {}).value;
    return { rows: dtVisibleCoOwnerRows(), names: dtCoOwnerNames(), joined: dtOwnerNames(),
             phone2: g('dtCoOwner2Phone'), email2: g('dtCoOwner2Email'),
             btn: document.getElementById('dtAddCoOwnerBtn').style.display };
  }, saved.id);
  ok('restore brings back two visible co-owner rows', back.rows === 2, back.rows);
  ok('restore brings back both names, primary first',
    back.names.join('|') === FIX.grantor + '|' + FIX.co2, back.names);
  ok('and dtOwnerNames() joins them again after the restore',
    back.joined === FIX.grantor + ' & ' + FIX.co2, back.joined);
  ok("restore brings back the co-owner's own phone and e-mail",
    back.phone2 === FIX.co2Phone && back.email2 === FIX.co2Email, [back.phone2, back.email2]);
  ok('the Add button is still offered at two of three rows', back.btn === '', back.btn);

  const again = await genAudit(page, null);
  ok('the restored two-co-owner transfer regenerates the same packet',
    again.pages === 5 && again.values['day of_2'] === FIX.grantor + ' & ' + FIX.co2,
    [again.pages, again.values['day of_2']]);

  // A record written before sprint 29 has no coOwners and no dtCoOwner* fields at all.
  const legacy = await page.evaluate((id) => {
    const snap = _dtSavedTransfers.find(q => q.id === id);
    delete snap.state.coOwners; delete snap.state.coOwnerRows;
    Object.keys(snap.state.fields).forEach(k => { if (/^dtCoOwner/.test(k)) delete snap.state.fields[k]; });
    dtClearAll();
    loadSavedDeedTransfer(id);
    const g = (i) => (document.getElementById(i) || {}).value;
    return { rows: dtVisibleCoOwnerRows(), names: dtCoOwnerNames(), name2: g('dtCoOwner2Name'),
             grantor: g('dtGrantorName'), joined: dtOwnerNames(),
             btn: document.getElementById('dtAddCoOwnerBtn').style.display };
  }, saved.id);
  ok('a pre-sprint-29 record restores as ONE owner', legacy.rows === 1 && legacy.names.length === 1, legacy);
  ok('a pre-sprint-29 record still restores its grantor', legacy.grantor === FIX.grantor, legacy.grantor);
  ok('and names nobody else on the documents', legacy.joined === FIX.grantor, legacy.joined);
  ok('no stale co-owner value is left behind', legacy.name2 === '', legacy.name2);
  ok('and the Add button is offered again', legacy.btn === '', legacy.btn);
  ok('no page errors across save and restore with co-owners', errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

// ── 16. The Permission of Use when the OWNERS sign it ──────────────────────────────
// The operator's amendment: "it's important we give somewhere for both of them to sign but if
// there's on addresss on the form and not both thats ok as long as it reads as purcsher &
// co-purchaser," then "No I think it should separate lines so they don't have to sign so
// small." The Permission of Use is signed by whoever relinquishes the rights. With the
// owner-deceased toggle OFF that is the co-owners themselves, so the line stacks; sections 9
// and 10 pin the other half, where an heir signs alone and it must not.
console.log('\n16. Permission of Use signed by the co-owners themselves — both variants');
for (const docusign of [false, true]) {
  const { ctx, page, errs } = await open(browser);
  const CO = [{ name: FIX.co2, phone: FIX.co2Phone, email: FIX.co2Email }];
  const BOTH = FIX.grantor + ' & ' + FIX.co2;
  const label = docusign ? 'DocuSign' : 'notary';
  const first = await genAudit(page, { docusign, lost: false, deceased: false,
                                       permission: true, coOwners: CO });
  // fillLane() types a heir affiant into the form whatever the toggles say; with the deceased
  // toggle off it is not the signer, so clear it — this is the plain "we both own it and we
  // both agree" case.
  await page.evaluate(() => { document.getElementById('dtHeirAffiant').value = ''; dtUpdateDocs(); });
  const r = await genAudit(page, null);
  ok(`${label}: the packet generated without throwing`, !r.error, r.error || first.error);
  ok(`${label}: 5 pages — cover, release, permission of use, statement, terms`, r.pages === 5, r.pages);
  const iField = docusign ? 'I_3' : 'I_2', nField = docusign ? 'Name_5' : 'Name_4';
  ok(`${label}: the Permission of Use names BOTH owners as the signer`,
    r.values[iField] === BOTH, r.values[iField]);
  ok(`${label}: its "Name:" row carries both names too — that row is the block's own ` +
     'printed-name line, captioned by the form, not a name typed on the signature rule',
    r.values[nField] === BOTH, r.values[nField]);
  const pm = await pageContent(r.b64, 2);
  ok(`${label}: each owner gets a full-width line of his own, 72 to 306, stacked, with his ` +
     'name under it',
    stackOK(pm, RULE_H.permission, 72, 234, [FIX.grantor, FIX.co2]),
    [sigRows(pm, RULE_H.permission), nameRows(pm)]);
  ok(`${label}: the two lines are STACKED 30pt apart (y 444.4 and 414.4), not side by side`,
    Math.abs(sigRows(pm, RULE_H.permission)[0].y - 444.4) < 0.01 &&
    Math.abs(sigRows(pm, RULE_H.permission)[1].y - 414.4) < 0.01 &&
    nameRows(pm)[0].y !== nameRows(pm)[1].y,
    [sigRows(pm, RULE_H.permission).map(l => l.y), nameRows(pm).map(t => t.y)]);
  ok(`${label}: the template's own signer rule was whited out at its own y (user space 400.8) ` +
     'and the stack drawn above it, because "Name:" starts immediately under it',
    drawnRects(pm).some(d => d.r === 1 && d.g === 1 && d.b === 1 &&
                             Math.abs(d.y - 400.8) < 0.01 && Math.abs(d.w - 234.8) < 0.01),
    drawnRects(pm).filter(d => d.r === 1));
  ok(`${label}: the stack is inside the blank band — below the body paragraph (y 455.5) and ` +
     'above the kept "Name:" row (its ink starts at y 397.0)',
    sigRows(pm, RULE_H.permission).every(l => l.y < 455.5) && nameRows(pm).every(t => t.y > 397.0),
    [sigRows(pm, RULE_H.permission).map(l => l.y), nameRows(pm).map(t => t.y)]);
  ok(`${label}: the "Date:" rule shares that y but is untouched — nothing was drawn or erased ` +
     'right of x 306.4',
    drawnRects(pm).every(d => d.x + d.w <= 306.41), drawnRects(pm).map(d => d.x + d.w));
  ok(`${label}: no page errors`, errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

// ── 17. Three co-owners on all three stacked documents ─────────────────────────────
// The cap is three, so three full rows have to FIT on every page that stacks. They do not all
// fit at the same pitch: the Release has ~135pt of blank band and keeps the full 30, the Loss
// affidavit has 83 and squeezes to 28, the Permission of Use has 54 and squeezes to 18. That
// squeeze is the whole reason the geometry carries a bandTop.
console.log('\n17. Three co-owners — three stacked rows on every page that stacks');
{
  const { ctx, page, errs } = await open(browser);
  const CO = [{ name: FIX.co2, phone: FIX.co2Phone, email: FIX.co2Email },
              { name: FIX.co3, phone: FIX.co3Phone, email: FIX.co3Email }];
  const ALL3 = [FIX.grantor, FIX.co2, FIX.co3];
  const first = await genAudit(page, { docusign: false, lost: true, deceased: false,
                                       permission: true, coOwners: CO });
  await page.evaluate(() => { document.getElementById('dtHeirAffiant').value = ''; dtUpdateDocs(); });
  const r = await genAudit(page, null);
  ok('the three-co-owner packet generated without throwing', !r.error, r.error || first.error);
  ok('6 pages — cover, release, loss, permission, statement, terms', r.pages === 6, r.pages);
  const rl = await pageContent(r.b64, 1), lo = await pageContent(r.b64, 2),
        pm = await pageContent(r.b64, 3);
  ok('the Release stacks three full-width rows at the full 30pt pitch',
    stackOK(rl, RULE_H.release, 313.2, 209.64, ALL3) &&
    atY(sigRows(rl, RULE_H.release), [480.52, 450.52, 420.52]),
    sigRows(rl, RULE_H.release).map(l => l.y));
  ok('the Loss affidavit stacks three rows at a 28pt pitch — squeezed to clear the paragraph ' +
     'above (y 393.83) and the notary block below (y 311.0)',
    stackOK(lo, RULE_H.loss, 279, 248.4, ALL3) &&
    atY(sigRows(lo, RULE_H.loss), [386.52, 358.52, 330.52]) &&
    sigRows(lo, RULE_H.loss)[0].y < 393.83 && nameRows(lo)[2].y > 311.0,
    sigRows(lo, RULE_H.loss).map(l => l.y));
  ok('the Permission of Use stacks three rows at an 18pt pitch — the tightest page in the set, ' +
     'still inside its band (paragraph y 455.5, "Name:" ink y 397.0)',
    stackOK(pm, RULE_H.permission, 72, 234, ALL3) &&
    atY(sigRows(pm, RULE_H.permission), [450.4, 432.4, 414.4]) &&
    sigRows(pm, RULE_H.permission)[0].y < 455.5 && nameRows(pm)[2].y > 397.0,
    sigRows(pm, RULE_H.permission).map(l => l.y));
  ok('every name on every stacked page is drawn at the full 9pt — stacking, unlike columns, ' +
     'never has to shrink a name to fit',
    [rl, lo, pm].every(c => nameRows(c).length === 3 && nameRows(c).every(t => t.size === 9)),
    [rl, lo, pm].map(c => nameRows(c).map(t => t.size)));
  ok('no page errors on the three-co-owner path', errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

// ── 18. Control: ONE owner signing those same documents draws nothing ──────────────
console.log('\n18. Control — one owner, owner alive, loss and permission both on');
{
  const { ctx, page, errs } = await open(browser);
  const first = await genAudit(page, { docusign: false, lost: true, deceased: false, permission: true });
  await page.evaluate(() => { document.getElementById('dtHeirAffiant').value = ''; dtUpdateDocs(); });
  const r = await genAudit(page, null);
  ok('the one-owner packet generated without throwing', !r.error, r.error || first.error);
  ok('6 pages — cover, release, loss, permission, statement, terms', r.pages === 6, r.pages);
  const lo = await pageContent(r.b64, 2), pm = await pageContent(r.b64, 3);
  ok('nothing is drawn on the Affidavit for Loss at one owner',
    drawnRects(lo).length === 0 && drawnTexts(lo).length === 0,
    [drawnRects(lo).length, drawnTexts(lo).length]);
  ok('nothing is drawn on the Permission of Use at one owner, even though the owner signs it',
    drawnRects(pm).length === 0 && drawnTexts(pm).length === 0,
    [drawnRects(pm).length, drawnTexts(pm).length]);
  ok('and the single owner is still named as the signer on both',
    r.values['I_2'] === FIX.grantor && r.values['being duly sworn deposes and says'] === FIX.grantor,
    [r.values['I_2'], r.values['being duly sworn deposes and says']]);
  ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
