// Contact linking across all six modules, and the isolation between them.
// Fake Firebase only — production is never contacted.
import { chromium } from 'playwright';
import fs from 'fs';
const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };

const MODULES = [
  { type: 'cem', section: 'cem-quote',    box: 'cemLinkedContact', name: 'cemClientName',  space: true  },
  { type: 'fh',  section: 'fh-quote',     box: 'fhLinkedContact',  name: 'fhClientName',   space: false },
  { type: 'ric', section: 'ric-contract', box: 'ricLinkedContact', name: 'ricName',        space: true  },
  { type: 'ga',  section: 'ga-contract',  box: 'gaLinkedContact',  name: 'gaInsuredName',  space: false },
  { type: 'cp',  section: 'cp-contract',  box: 'cpLinkedContact',  first: 'cpFirstName', last: 'cpLastName', space: false },
  { type: 'an',  section: 'an-contract',  box: 'anLinkedContact',  name: 'anPurchName',    space: true  },
];

async function open(browser, hash) {
  const ctx = await browser.newContext();
  await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  page.on('dialog', async d => { if (d.type() === 'prompt') await d.accept('T'); else await d.accept(); });
  await page.addInitScript(FAKE);
  await page.addInitScript(`window.__fake.addAccount('t@bwquote.local','pw');`);
  await page.goto('http://localhost:3737/' + (hash ? 'index.html' + hash : ''), { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('t@bwquote.local', 'pw'));
  await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
  await page.waitForTimeout(300);
  return { ctx, page, errs };
}

const browser = await chromium.launch();

// 1. Every module has its link row and renders it
console.log('\n1. All six modules wired');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async (mods) => {
    const out = {};
    for (const m of mods) {
      show(m.section, null);
      await new Promise(r => setTimeout(r, 60));
      const box = document.getElementById(m.box);
      out[m.type] = {
        exists: !!box,
        offersLink: box ? /Link a contact/.test(box.textContent) : false,
        inConfig: !!BW_LINK_MODULES[m.type],
      };
    }
    return out;
  }, MODULES);
  MODULES.forEach(m => {
    ok(`${m.type}: link row present and offering`, r[m.type].exists && r[m.type].offersLink && r[m.type].inConfig, r[m.type]);
  });
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 2. Isolation — a link in one module must not appear in another
console.log('\n2. Modules do not leak into each other');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async () => {
    const a = await saveParty({ given: 'Alice', family: 'Anders' });
    const b = await saveParty({ given: 'Dan', family: 'Baker' });
    show('cem-quote', null); bwSetPendingLink('cem', a.id);
    show('ga-contract', null); bwSetPendingLink('ga', b.id);
    return {
      cem: bwPartyName(bwPartyById(_bwPendingLink.cem.partyId)),
      ga: bwPartyName(bwPartyById(_bwPendingLink.ga.partyId)),
      cemBox: document.getElementById('cemLinkedContact').textContent,
      gaBox: document.getElementById('gaLinkedContact').textContent,
      fhUntouched: _bwPendingLink.fh === undefined,
    };
  });
  ok('cemetery keeps its own contact', r.cem === 'Alice Anders', r.cem);
  ok('GA keeps its own contact', r.ga === 'Dan Baker', r.ga);
  ok('cemetery box shows only Alice', /Alice Anders/.test(r.cemBox) && !/Dan Baker/.test(r.cemBox), r.cemBox);
  ok('GA box shows only Dan', /Dan Baker/.test(r.gaBox) && !/Alice Anders/.test(r.gaBox), r.gaBox);
  ok('an unrelated module stays empty', r.fhUntouched);
  await ctx.close();
}

// 3. Name prefill per module, including ClearPoint's split name
console.log('\n3. Prefill, and never overwriting');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async (mods) => {
    const p = await saveParty({ given: 'Thanh', family: 'Vu' });
    const out = {};
    for (const m of mods) {
      show(m.section, null);
      bwSetPendingLink(m.type, p.id);
      out[m.type] = m.first
        ? { first: document.getElementById(m.first).value, last: document.getElementById(m.last).value }
        : document.getElementById(m.name).value;
    }
    // typed value must survive
    show('ric-contract', null);
    bwSetPendingLink('ric', null);
    document.getElementById('ricName').value = 'Someone Else';
    bwSetPendingLink('ric', p.id);
    out.typedSurvives = document.getElementById('ricName').value;
    return out;
  }, MODULES);
  ok('cem prefilled', r.cem === 'Thanh Vu', r.cem);
  ok('fh prefilled', r.fh === 'Thanh Vu', r.fh);
  ok('ric prefilled', r.ric === 'Thanh Vu', r.ric);
  ok('ga prefilled', r.ga === 'Thanh Vu', r.ga);
  ok('ClearPoint splits into first and last', r.cp.first === 'Thanh' && r.cp.last === 'Vu', r.cp);
  ok('an prefilled', r.an === 'Thanh Vu', r.an);
  ok('a typed name is never overwritten', r.typedSurvives === 'Someone Else', r.typedSurvives);
  await ctx.close();
}

// 4. Save creates one role per module, and finds it back
console.log('\n4. Saving links on every module');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async () => {
    const p = await saveParty({ given: 'Irene', family: 'Novak' });
    const savers = { cem: 'saveCemQuote', fh: 'saveFhQuote', ric: 'saveRicContract', ga: 'saveGaContract', cp: 'saveCpContract', an: 'saveAnContract' };
    const sections = { cem: 'cem-quote', fh: 'fh-quote', ric: 'ric-contract', ga: 'ga-contract', cp: 'cp-contract', an: 'an-contract' };
    const out = {};
    for (const t of Object.keys(savers)) {
      show(sections[t], null);
      bwSetPendingLink(t, p.id);
      // some savers require a name in their own field; the prefill above covers it
      try { window[savers[t]](); } catch (e) { out[t + 'Err'] = String(e.message || e); }
      await new Promise(r => setTimeout(r, 250));
    }
    const roles = Object.values(window.__fake.get('contractRoles') || {});
    out.types = roles.map(r => r.recordType).sort();
    out.total = roles.length;
    out.allForParty = bwRolesForParty(p.id).length;
    return out;
  });
  ok('a role was created for every module', r.types.join(',') === 'an,cem,cp,fh,ga,ric', r.types);
  ok('one each, no duplicates', r.total === 6, r.total);
  ok('all six findable from the contact', r.allForParty === 6, r.allForParty);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 5. Still optional everywhere
console.log('\n5. Linking stays optional on every module');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async () => {
    const savers = { cem: 'saveCemQuote', fh: 'saveFhQuote', ric: 'saveRicContract', ga: 'saveGaContract', cp: 'saveCpContract', an: 'saveAnContract' };
    const sections = { cem: 'cem-quote', fh: 'fh-quote', ric: 'ric-contract', ga: 'ga-contract', cp: 'cp-contract', an: 'an-contract' };
    const names = { ric: 'ricName', ga: 'gaInsuredName', cp: 'cpLastName', an: 'anPurchName', cem: 'cemClientName', fh: 'fhClientName' };
    for (const t of Object.keys(savers)) {
      show(sections[t], null);
      const nf = document.getElementById(names[t]); if (nf) nf.value = 'Unlinked ' + t;
      try { window[savers[t]](); } catch (e) {}
      await new Promise(r => setTimeout(r, 200));
    }
    const q = window.__fake.get('quotes') || {};
    return {
      saved: Object.keys(q).map(k => k + ':' + Object.keys(q[k] || {}).length).sort(),
      roles: Object.keys(window.__fake.get('contractRoles') || {}).length,
    };
  });
  ok('records saved on every module with no contact', r.saved.length === 6, r.saved);
  ok('and not one contractRole was created', r.roles === 0, r.roles);
  await ctx.close();
}

// 6. Space routes only where a space makes sense
console.log('\n6. Space handoff');
{
  for (const m of MODULES.filter(x => x.space)) {
    const { ctx, page } = await open(browser, `#${m.section}?space=81159&loc=${encodeURIComponent('Sec-18 Blk-446 Lot-B Sp-2')}`);
    const r = await page.evaluate((t) => ({
      space: _bwPendingSpace[t],
      rowVisible: (document.getElementById(BW_LINK_MODULES[t].spaceRow) || {}).style.display !== 'none',
    }), m.type);
    ok(`${m.type}: space arrives from the map`, r.space && r.space.sid === '81159', r.space);
    ok(`${m.type}: space row visible`, r.rowVisible);
    await ctx.close();
  }
  // funeral-home records have no space concept at all
  const { ctx, page } = await open(browser, '#ga-contract?space=81159');
  const r = await page.evaluate(() => ({ ga: _bwPendingSpace.ga, cfg: !!BW_LINK_MODULES.ga.spaceRow }));
  ok('GA ignores a space param — no cemetery component', r.ga === undefined && r.cfg === false, r);
  await ctx.close();
}

// 7. Reset clears only that module
console.log('\n7. Reset is scoped');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async () => {
    const p = await saveParty({ given: 'Scoped', family: 'Test' });
    bwSetPendingLink('cem', p.id);
    bwSetPendingLink('ric', p.id);
    resetCemQuote();
    await new Promise(r => setTimeout(r, 150));
    return { cem: _bwPendingLink.cem, ric: !!_bwPendingLink.ric };
  });
  ok('resetting the cemetery quote clears its link', r.cem === undefined, r.cem);
  ok('and leaves the RIC alone', r.ric === true);
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
