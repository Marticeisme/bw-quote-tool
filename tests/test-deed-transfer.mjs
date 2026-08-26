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
  counselor: 'Martice Morrison', receipt: 'R-70314', statementDate: '2026-09-04'
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
    return { pages: doc.getPageCount(), names: names, values: values,
             checked: checked, widgetStates: widgetStates };
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
    return r;
  } catch (e) {
    return { pages: -1, names: [], values: {}, checked: [], widgetStates: {}, name: '',
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

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
