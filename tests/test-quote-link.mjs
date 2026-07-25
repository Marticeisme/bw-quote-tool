// Slice two: linking a contact and a space to a cemetery quote. Linking is always OPTIONAL.
// Fake Firebase only — production is never contacted.
import { chromium } from 'playwright';
import fs from 'fs';
const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };

async function open(browser, hash) {
  const ctx = await browser.newContext();
  await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  page.on('dialog', async d => { if (d.type() === 'prompt') await d.accept('Test Quote'); else await d.accept(); });
  await page.addInitScript(FAKE);
  await page.addInitScript(`window.__fake.addAccount('t@bwquote.local','pw');`);
  await page.goto('http://localhost:3737/' + (hash ? 'index.html' + hash : ''), { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('t@bwquote.local', 'pw'));
  await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
  await page.waitForTimeout(300);
  return { ctx, page, errs };
}

const buildAQuote = () => {
  show('cem-quote', null);
  const g = document.getElementById('qGarden');
  g.value = [...g.options].find(o => /\|/.test(o.value)).value;
  const oc = document.getElementById('qOCNiche'); if (oc) oc.checked = true;
  cemUpdateD();
};

const browser = await chromium.launch();

// 1. THE RULE: a quote saves with nothing linked
console.log('\n1. Linking is optional');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async (fn) => {
    eval('(' + fn + ')()');
    await new Promise(r => setTimeout(r, 200));
    window.__fake.clearLog();
    saveCemQuote();
    await new Promise(r => setTimeout(r, 400));
    const keys = Object.keys(window.__fake.get('quotes/cem') || {});
    const rec = window.__fake.get('quotes/cem/' + keys[0]);
    return {
      saved: keys.length === 1,
      total: rec && rec.total,
      hasSpaces: rec && 'spaces' in rec,
      roles: Object.keys(window.__fake.get('contractRoles') || {}).length,
      writes: window.__fake.log().filter(l => !['once', 'signIn', 'signOut'].includes(l.op)).length,
    };
  }, buildAQuote.toString());
  ok('quote saves with no contact and no space', r.saved && r.total > 0, r);
  ok('no spaces key written when none was set', r.hasSpaces === false, r);
  ok('no contractRole created', r.roles === 0, r.roles);
  ok('exactly one write — the quote', r.writes === 1, r.writes);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 2. Linking a contact
console.log('\n2. Linking a contact');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async (fn) => {
    const p = await saveParty({ given: 'Thanh', family: 'Vu', phones: { p1: { value: '2065550147', isPrimary: true } } });
    eval('(' + fn + ')()');
    await new Promise(r => setTimeout(r, 200));
    bwSetPendingLink('cem', p.id);
    const nameFilled = document.getElementById('cemClientName').value;
    const linkHtml = document.getElementById('cemLinkedContact').textContent;
    saveCemQuote();
    await new Promise(r => setTimeout(r, 500));
    const keys = Object.keys(window.__fake.get('quotes/cem') || {});
    const rec = window.__fake.get('quotes/cem/' + keys[0]);
    const roles = Object.values(window.__fake.get('contractRoles') || {});
    return {
      nameFilled, linkHtml,
      roleCount: roles.length,
      role: roles[0],
      recId: rec && rec.id,
      viaRecord: bwRolesForRecord('cem', rec.id).length,
      viaParty: bwRolesForParty(p.id).length,
    };
  }, buildAQuote.toString());
  ok('client name auto-filled from the contact', r.nameFilled === 'Thanh Vu', r.nameFilled);
  ok('link shown in the builder', /Thanh Vu/.test(r.linkHtml) && /Purchaser/.test(r.linkHtml), r.linkHtml);
  ok('one contractRole created', r.roleCount === 1, r.roleCount);
  ok('role points at the saved quote', r.role && r.role.recordType === 'cem' && r.role.recordId === r.recId, r.role);
  ok('role is purchaser and liable', r.role.role === 'purchaser' && r.role.financiallyLiable === true, r.role);
  ok('provenance says it came from the quote tool', r.role._prov && r.role._prov.src === 'quote_tool', r.role._prov);
  ok('findable from the record', r.viaRecord === 1, r.viaRecord);
  ok('findable from the party', r.viaParty === 1, r.viaParty);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 3. Linking must not overwrite a name already typed
console.log('\n3. Never overwrite typed input');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async (fn) => {
    const p = await saveParty({ given: 'Thanh', family: 'Vu' });
    eval('(' + fn + ')()');
    document.getElementById('cemClientName').value = 'Nguyen Family';
    bwSetPendingLink('cem', p.id);
    return document.getElementById('cemClientName').value;
  }, buildAQuote.toString());
  ok('typed family name survives linking', r === 'Nguyen Family', r);
  await ctx.close();
}

// 4. Space from the map is persisted
console.log('\n4. Space from the map');
{
  const { ctx, page, errs } = await open(browser, '#cem-quote?space=81159&loc=' + encodeURIComponent('Sec-18 Blk-446 Lot-B Sp-2'));
  const r = await page.evaluate(async (fn) => {
    eval('(' + fn + ')()');
    await new Promise(r => setTimeout(r, 250));
    const shown = document.getElementById('cemLinkedSpace').textContent;
    const rowVisible = document.getElementById('cemLinkedSpaceRow').style.display !== 'none';
    saveCemQuote();
    await new Promise(r => setTimeout(r, 400));
    const keys = Object.keys(window.__fake.get('quotes/cem') || {});
    const rec = window.__fake.get('quotes/cem/' + keys[0]);
    return { shown, rowVisible, spaces: rec && rec.spaces };
  }, buildAQuote.toString());
  ok('space row visible on arrival', r.rowVisible);
  ok('shows the address and sid', /Sec-18 Blk-446 Lot-B Sp-2/.test(r.shown) && /81159/.test(r.shown), r.shown);
  ok('persisted as an array', Array.isArray(r.spaces) && r.spaces.length === 1, r.spaces);
  ok('sid stored — the contract key', r.spaces[0].sid === '81159', r.spaces[0]);
  ok('loc stored for printing', r.spaces[0].loc === 'Sec-18 Blk-446 Lot-B Sp-2', r.spaces[0]);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 5. Reopening restores both
console.log('\n5. Reopening a linked quote');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async (fn) => {
    const p = await saveParty({ given: 'Dan', family: 'Prescott' });
    eval('(' + fn + ')()');
    await new Promise(r => setTimeout(r, 200));
    bwSetPendingLink('cem', p.id);
    _bwPendingSpace['cem'] = { sid: '33708', loc: 'Sec-21 Blk-1 Lot-B Sp-4' };
    saveCemQuote();
    await new Promise(r => setTimeout(r, 500));
    const id = _cemSavedQuotes[0].id;
    resetCemQuote();
    await new Promise(r => setTimeout(r, 200));
    const clearedLink = _bwPendingLink['cem'], clearedSpace = _bwPendingSpace['cem'];
    loadSavedCemQuote(id);
    await new Promise(r => setTimeout(r, 400));
    return {
      clearedLink, clearedSpace,
      link: _bwPendingLink['cem'],
      space: _bwPendingSpace['cem'],
      linkHtml: document.getElementById('cemLinkedContact').textContent,
      partyName: _bwPendingLink['cem'] ? bwPartyName(bwPartyById(_bwPendingLink['cem'].partyId)) : null,
    };
  }, buildAQuote.toString());
  ok('reset clears the link and the space', r.clearedLink === undefined && r.clearedSpace === undefined, r);
  ok('reopening restores the contact', r.partyName === 'Dan Prescott', r.partyName);
  ok('reopening restores the space', r.space && r.space.sid === '33708', r.space);
  ok('and shows it in the builder', /Dan Prescott/.test(r.linkHtml), r.linkHtml);
  await ctx.close();
}

// 6. Unlink
console.log('\n6. Unlinking');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async (fn) => {
    const p = await saveParty({ given: 'Temp', family: 'Person' });
    eval('(' + fn + ')()');
    bwSetPendingLink('cem', p.id);
    const before = !!_bwPendingLink['cem'];
    bwSetPendingLink('cem', null);
    const after = _bwPendingLink['cem'];
    const html = document.getElementById('cemLinkedContact').textContent;
    return { before, after, html };
  }, buildAQuote.toString());
  ok('link cleared', r.before === true && r.after === undefined, r);
  ok('offers to link again', /Link a contact/.test(r.html), r.html);
  await ctx.close();
}

// 7. Picker
console.log('\n7. Contact picker');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async (fn) => {
    await saveParty({ given: 'Alice', family: 'Anders', phones: { p1: { value: '2065551000', isPrimary: true } } });
    await saveParty({ given: 'Dan', family: 'Baker' });
    eval('(' + fn + ')()');
    let picked = null;
    openContactPicker(function (id) { picked = id; });
    const visible = getComputedStyle(document.getElementById('contactPicker')).display !== 'none';
    document.getElementById('cpSearch').value = 'baker';
    renderContactPicker();
    const filtered = document.getElementById('cpResults').textContent;
    const target = _parties.find(p => p.family === 'Baker').id;
    pickerChoose(target);
    await new Promise(r => setTimeout(r, 150));
    return {
      visible, filtered, picked, matchesTarget: picked === target,
      closed: getComputedStyle(document.getElementById('contactPicker')).display === 'none',
    };
  }, buildAQuote.toString());
  ok('picker opens', r.visible);
  ok('search filters', /Dan Baker/.test(r.filtered) && !/Alice Anders/.test(r.filtered), r.filtered);
  ok('choosing calls back with the id', r.matchesTarget, r);
  ok('and closes', r.closed);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 8. Create-from-picker hands back
console.log('\n8. Create from the picker');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async (fn) => {
    eval('(' + fn + ')()');
    let picked = null;
    openContactPicker(function (id) { picked = id; });
    document.getElementById('cpSearch').value = 'Irene Novak';
    pickerCreateNew();
    const prefilledG = document.getElementById('ceG').value;
    const prefilledF = document.getElementById('ceF').value;
    submitContactEditor();
    await new Promise(r => setTimeout(r, 400));
    return { prefilledG, prefilledF, picked, name: picked ? bwPartyName(bwPartyById(picked)) : null };
  }, buildAQuote.toString());
  ok('typed text prefills the new contact', r.prefilledG === 'Irene' && r.prefilledF === 'Novak', r);
  ok('saving hands the new contact straight back', r.name === 'Irene Novak', r);
  await ctx.close();
}

// 9. Other modules untouched
console.log('\n9. No collateral damage');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async () => {
    window.__fake.clearLog();
    await saveQuoteRecord('ric', { id: 555, label: 'R', total: 1, date: 'x', state: {} }, 'R');
    return {
      writes: window.__fake.log().filter(l => !['once', 'signIn', 'signOut'].includes(l.op)),
      roles: Object.keys(window.__fake.get('contractRoles') || {}).length,
    };
  });
  ok('other record types save unchanged', r.writes.length === 1 && /^quotes\/ric\//.test(r.writes[0].path), r.writes);
  ok('no stray roles', r.roles === 0, r.roles);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
