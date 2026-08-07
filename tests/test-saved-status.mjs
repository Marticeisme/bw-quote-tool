// s19/saved-lists — the three derived statuses on the six saved lists, and the rule that
// keeps them safe: stamping is ADDITIVE and never writes to the database on its own.
//
// Saved quotes are live production data. This suite drives an in-memory fake Firebase —
// the gstatic SDK request is aborted and window.firebase is replaced before any page
// script runs — and several assertions exist specifically to prove that exporting a quote
// produces ZERO database writes. A save/persist call from a test script wiped real quote
// data on 2026-07-11; nothing here may ever reach the real node.
import { chromium } from 'playwright';
import fs from 'fs';
import { BASE } from './_base.mjs';

const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra !== undefined ? '\n        ' + JSON.stringify(extra) : '')); }
};

// Synthetic fixtures only (DESIGN §6): invented names, no real records.
const cemState = (loc, atNeed, n) => ({
  fields: { qSpaceLocation: loc, cemTypeAN: atNeed, cemTypePN: !atNeed },
  lines: Array.from({ length: n }, (_, i) => ({ label: 'Item ' + (i + 1), amount: 100 })),
  total: 1000,
});
const rec = (id, label, total, state, extra) =>
  Object.assign({ id, label, total, date: 'Aug 1, 2026', state }, extra || {});

const SEED = {
  quotes: {
    cem: {
      // No stamp fields at all — this is what every record saved before s19 looks like.
      q3001: rec(3001, 'Alderwood, Marguerite', 18450.32, cemState('Garden of Devotion · Lot 214', false, 9)),
      q3002: rec(3002, 'Bexley, Thomas', 27310, cemState('Garden 19 · Lot 88', false, 14),
        { exportedAt: '2026-08-03T17:04:00.000Z' }),
      q3003: rec(3003, 'Castellan, Ovide', 9120.75, cemState('Serenity Niche Wall · RAD E-14', true, 6),
        { exportedAt: '2026-07-29T15:00:00.000Z', contractedAt: '2026-07-30T18:22:00.000Z' }),
    },
    fh: {}, ric: {}, ga: {}, cp: {}, an: {},
  },
};

async function newPage(browser, seed) {
  const ctx = await browser.newContext();
  await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', e => { fail++; console.log('  PAGEERROR: ' + e.message); });
  await page.addInitScript(FAKE);
  await page.addInitScript(`window.__fake.addAccount('tester@bwquote.local', 'pw');`);
  if (seed) await page.addInitScript(`(${(s) => window.__fake.seed(s)}).call(null, ${JSON.stringify(seed)});`);
  await page.goto(BASE, { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('tester@bwquote.local', 'pw'));
  await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
  await page.waitForTimeout(300);
  return { ctx, page };
}
const writesOf = (page) => page.evaluate(() =>
  window.__fake.log().filter(l => l.op === 'set' || l.op === 'update' || l.op === 'remove'));

const browser = await chromium.launch();

// ── 1. The three statuses derive from two optional fields ───────────────────────────
console.log('\n1. Status derivation');
{
  const { ctx, page } = await newPage(browser, SEED);
  const r = await page.evaluate(() => ({
    none:  bwSavedStatus({}),
    exp:   bwSavedStatus({ exportedAt: '2026-08-03T17:04:00.000Z' }),
    con:   bwSavedStatus({ contractedAt: '2026-07-30T18:22:00.000Z' }),
    both:  bwSavedStatus({ exportedAt: '2026-08-03T17:04:00.000Z', contractedAt: '2026-07-30T18:22:00.000Z' }),
    junk:  bwSavedStatus({ exportedAt: 'not-a-date' }),
    undef: bwSavedStatus(undefined),
  }));
  ok('no fields ⇒ Draft (old records need no migration)', r.none.cls === 'pill-draft' && r.none.text === 'Draft', r.none);
  ok('undefined record ⇒ Draft, not a crash', r.undef.cls === 'pill-draft', r.undef);
  ok('exportedAt ⇒ With family, dated', r.exp.cls === 'pill-family' && /^With family · \w{3} \d+$/.test(r.exp.text), r.exp);
  ok('contractedAt ⇒ Contracted', r.con.cls === 'pill-contracted' && r.con.text === 'Contracted', r.con);
  ok('Contracted outranks With family', r.both.cls === 'pill-contracted', r.both);
  ok('an unparseable stamp degrades to no date, never "Invalid Date"',
    r.junk.cls === 'pill-family' && r.junk.text === 'With family', r.junk);
  await ctx.close();
}

// ── 2. The rows render what the handoff asks for ────────────────────────────────────
console.log('\n2. Row rendering');
{
  const { ctx, page } = await newPage(browser, SEED);
  await page.evaluate(() => show('cem-saved'));
  await page.waitForTimeout(200);
  const r = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#cemSavedQuotes .saved-row')];
    return {
      count: rows.length,
      names: rows.map(x => x.querySelector('.saved-name').textContent),
      metas: rows.map(x => x.querySelector('.saved-meta').textContent),
      pills: rows.map(x => x.querySelector('.pill').className),
      totals: rows.map(x => x.querySelector('.saved-total').textContent),
      dates: rows.map(x => x.querySelector('.saved-date').textContent),
      actions: rows.map(x => [...x.querySelectorAll('.saved-actions .btn')].map(b => b.textContent)),
      headTitle: (document.querySelector('#cemSavedQuotes .saved-head-title') || {}).textContent,
      searchBoxes: document.querySelectorAll('#cemSavedQuotes input.saved-search').length,
      tabs: document.querySelectorAll('#cemSavedQuotes .saved-tab, #cemSavedQuotes [role=tab]').length,
    };
  });
  ok('one row per saved record', r.count === 3, r.count);
  ok('newest first', r.names.join('|') === 'Castellan, Ovide|Bexley, Thomas|Alderwood, Marguerite', r.names);
  ok('meta line is property · N items · need',
    r.metas[2] === 'Garden of Devotion · Lot 214 · 9 items · Pre-Need', r.metas);
  ok('at-need is read off the saved quote type', /· At-Need$/.test(r.metas[0]), r.metas[0]);
  ok('pills match the records', r.pills.join('|') === 'pill pill-contracted|pill pill-family|pill pill-draft', r.pills);
  ok('money is formatted', r.totals[2] === '$18,450.32', r.totals);
  ok('the saved date sits under the money', r.dates.every(d => d === 'Aug 1, 2026'), r.dates);
  ok('Open and PDF are always visible on a quote row',
    r.actions.every(a => a[0] === 'Open quote' && a[1] === 'PDF'), r.actions);
  ok('existing row actions survive', r.actions.every(a => a.includes('Print') && a.includes('Compare') && a.includes('Delete')), r.actions[0]);
  ok('header carries a plain count', r.headTitle === '3 quotes', r.headTitle);
  ok('exactly one search field', r.searchBoxes === 1, r.searchBoxes);
  ok('no status tabs (explicitly rejected until ~40 rows)', r.tabs === 0, r.tabs);
  ok('rendering wrote nothing to the database', (await writesOf(page)).length === 0, await writesOf(page));
  await ctx.close();
}

// ── 3. Search filters on name AND property text, client-side ────────────────────────
console.log('\n3. Search');
{
  const { ctx, page } = await newPage(browser, SEED);
  await page.evaluate(() => show('cem-saved'));
  await page.waitForTimeout(200);
  const names = async () => page.evaluate(() =>
    [...document.querySelectorAll('#cemSavedQuotes .saved-name')].map(x => x.textContent));
  await page.fill('#cemQuoteSearch', 'bexley');
  await page.waitForTimeout(150);
  ok('matches the family name, case-insensitively', (await names()).join('|') === 'Bexley, Thomas', await names());
  await page.fill('#cemQuoteSearch', 'serenity');
  await page.waitForTimeout(150);
  ok('matches the property text under the name', (await names()).join('|') === 'Castellan, Ovide', await names());
  await page.fill('#cemQuoteSearch', 'zzzz');
  await page.waitForTimeout(150);
  const noMatch = await page.evaluate(() => ({
    rows: document.querySelectorAll('#cemSavedQuotes .saved-row').length,
    empty: !!document.querySelector('#cemSavedQuotes .empty'),
    stillHasSearch: !!document.querySelector('#cemQuoteSearch'),
  }));
  ok('no matches shows an empty state, not a bare sentence', noMatch.rows === 0 && noMatch.empty, noMatch);
  ok('the search field survives a no-match render', noMatch.stillHasSearch, noMatch);
  ok('searching wrote nothing to the database', (await writesOf(page)).length === 0);
  await ctx.close();
}

// ── 4. Empty states render on arrival, with no records to trigger them ──────────────
console.log('\n4. Empty states');
{
  const { ctx, page } = await newPage(browser, null);
  const r = {};
  for (const [type, sec] of [['cem','cem-saved'],['fh','fh-saved'],['ric','ric-saved'],
                             ['ga','ga-saved'],['cp','cp-saved'],['an','an-saved']]) {
    await page.evaluate(id => show(id), sec);
    await page.waitForTimeout(80);
    r[type] = await page.evaluate(t => {
      const c = document.getElementById(t + 'SavedQuotes');
      const e = c && c.querySelector('.empty');
      return { has: !!e, h3: e ? e.querySelector('h3').textContent : '', emoji: /💾/.test(c ? c.innerHTML : '') };
    }, type === 'cem' ? 'cem' : type);
  }
  Object.keys(r).forEach(t => {
    ok(t + ': empty state renders with zero records', r[t].has, r[t]);
    ok(t + ': no leftover 💾 placeholder sentence', !r[t].emoji, r[t]);
  });
  ok('cem empty heading names the list', r.cem.h3 === 'No saved quotes yet', r.cem.h3);
  ok('ric empty heading names the list', r.ric.h3 === 'No saved RICs yet', r.ric.h3);
  ok('nothing was written while showing empty lists', (await writesOf(page)).length === 0);
  await ctx.close();
}

// ── 5. THE SAFETY RULE: exporting stamps memory and writes NOTHING ──────────────────
console.log('\n5. Stamping never writes to the database');
{
  const { ctx, page } = await newPage(browser, SEED);
  const r = await page.evaluate(() => {
    loadSavedCemQuote(3001);                    // record currently in the builder
    const before = JSON.parse(JSON.stringify(_quoteStore.cem.q3001));
    bwStampExport('cem');                       // what Print / Download PDF call
    const after = _quoteStore.cem.q3001;
    return {
      wasDraft: !before.exportedAt,
      nowStamped: !!after.exportedAt,
      pending: !!_bwQuoteStamps.cem.exportedAt,
      loadedId: _bwLoadedRecordId.cem,
      // everything else about the record is untouched
      sameOtherwise: JSON.stringify(Object.assign({}, after, { exportedAt: undefined }))
                  === JSON.stringify(Object.assign({}, before, { exportedAt: undefined })),
    };
  });
  ok('the record started as a Draft', r.wasDraft);
  ok('exporting stamps the loaded record in memory', r.nowStamped);
  ok('and holds a pending stamp for the next save', r.pending);
  ok('the loaded-record id tracks the builder', r.loadedId === 3001, r.loadedId);
  ok('no other field of the record changed', r.sameOtherwise);
  ok('EXPORTING PRODUCED ZERO DATABASE WRITES', (await writesOf(page)).length === 0, await writesOf(page));

  // First write wins: "With family" is the first date it went out, not the latest.
  const twice = await page.evaluate(() => {
    const first = _quoteStore.cem.q3001.exportedAt;
    bwStampExport('cem');
    return { first, second: _quoteStore.cem.q3001.exportedAt };
  });
  ok('a second export does not move the date', twice.first === twice.second, twice);
  await ctx.close();
}

// ── 6. The stamp rides the EXISTING save path onto the record ───────────────────────
console.log('\n6. The stamp persists through the existing save');
{
  const { ctx, page } = await newPage(browser, SEED);
  const r = await page.evaluate(() => {
    window.prompt = () => 'Dunmore, Patricia';   // the save flow's own name prompt
    window.confirm = () => false;
    window.alert = () => {};
    bwStampExport('cem');                        // export before there is a record at all
    const snap = { id: 4001, label: 'Dunmore, Patricia', total: 100, date: 'Aug 6, 2026', state: { fields: {} } };
    bwStampsOnSave('cem', snap);                 // the one line added to each save function
    return { snap: snap, loaded: _bwLoadedRecordId.cem };
  });
  ok('the pending stamp lands on the object the save writes', !!r.snap.exportedAt, r.snap);
  ok('and saving adopts that record as the loaded one', r.loaded === 4001, r.loaded);

  const wired = await page.evaluate(() => ({
    saveCem: String(saveCemQuote).includes("bwStampsOnSave('cem', snap)"),
    saveFh:  String(saveFhQuote).includes("bwStampsOnSave('fh', snap)"),
    saveRic: String(saveRicContract).includes("bwStampsOnSave('ric', snap)"),
    saveGa:  String(saveGaContract).includes("bwStampsOnSave('ga', snap)"),
    saveCp:  String(saveCpContract).includes("bwStampsOnSave('cp', snap)"),
    saveAn:  String(saveAnContract).includes("bwStampsOnSave('an', snap)"),
    // the stamp is folded in BEFORE saveQuoteRecord writes, not after
    orderCem: String(saveCemQuote).indexOf('bwStampsOnSave') < String(saveCemQuote).indexOf('saveQuoteRecord'),
  }));
  Object.keys(wired).forEach(k => ok('save path wired: ' + k, wired[k], wired));
  await ctx.close();
}

// ── 7. Loading and clearing move the stamps with the builder ────────────────────────
console.log('\n7. Load / clear');
{
  const { ctx, page } = await newPage(browser, SEED);
  const r = await page.evaluate(() => {
    window.alert = () => {};
    loadSavedCemQuote(3003);                     // the Contracted one
    const adopted = JSON.parse(JSON.stringify(_bwQuoteStamps.cem));
    const id = _bwLoadedRecordId.cem;
    resetCemQuote();
    return { adopted, id, afterReset: JSON.parse(JSON.stringify(_bwQuoteStamps.cem)),
             loadedAfter: _bwLoadedRecordId.cem };
  });
  ok('loading adopts the record\'s stamps', !!r.adopted.exportedAt && !!r.adopted.contractedAt, r.adopted);
  ok('loading tracks the record id', r.id === 3003, r.id);
  ok('reset drops the stamps', !r.afterReset.exportedAt && !r.afterReset.contractedAt, r.afterReset);
  ok('reset drops the loaded id, so a fresh quote inherits nothing', r.loadedAfter === undefined, r.loadedAfter);
  ok('load + reset wrote nothing to the database', (await writesOf(page)).length === 0, await writesOf(page));
  await ctx.close();
}

// ── 8. Contracted follows the real load-into-contract flow ──────────────────────────
console.log('\n8. Contracted linkage');
{
  const { ctx, page } = await newPage(browser, SEED);
  const r = await page.evaluate(() => {
    window.alert = () => {};
    loadSavedCemQuote(3001);            // a saved cemetery quote is in the builder
    bwSetContractSource('ric', 'cem');  // what ricImportFromQuote() records
    const src = JSON.parse(JSON.stringify(_bwContractSource.ric || {}));
    bwStampContracted('ric');           // what generating the RIC calls
    return { src, cem: _quoteStore.cem.q3001.contractedAt || null };
  });
  ok('importing records which saved quote the pricing came from',
    r.src.type === 'cem' && r.src.id === 3001, r.src);
  ok('generating the contract stamps that saved quote Contracted', !!r.cem, r.cem);
  ok('the linkage wrote nothing to the database', (await writesOf(page)).length === 0, await writesOf(page));

  // No loaded saved quote ⇒ no source ⇒ nothing invented.
  const none = await page.evaluate(() => {
    resetCemQuote();
    bwSetContractSource('ric', 'cem');
    return _bwContractSource.ric === undefined;
  });
  ok('an unsaved quote produces no source, so nothing is stamped by guesswork', none);

  const wired = await page.evaluate(() => ({
    ricImport:   String(ricImportFromQuote).includes("bwSetContractSource('ric', 'cem')"),
    anImport:    String(anImportFromCemeteryQuote).includes("bwSetContractSource('an', 'cem')"),
    ricFromTab:  String(generateRICFromTab).includes("bwStampContracted('ric')"),
    ricFromQuote:String(generateRICContract).includes("bwStampContracted('cem')"),
    cirgas:      String(generateCirgasPacket).includes("bwStampContracted('an')"),
    printCem:    String(printCemQuote).includes("bwStampExport('cem')"),
    printFh:     String(printFhQuote).includes("bwStampExport('fh')"),
    pdfCem:      String(downloadCemQuotePDF).includes("bwStampExport('cem')"),
    pdfFh:       String(downloadFhQuotePDF).includes("bwStampExport('fh')"),
    printSaved:  String(printSavedQuote).includes("bwStampRecord(type, id, 'exportedAt')"),
  }));
  Object.keys(wired).forEach(k => ok('stamp site wired: ' + k, wired[k], wired));
  await ctx.close();
}

// ── 9. Nothing in the diff added a database write site ──────────────────────────────
console.log('\n9. No new write sites');
{
  const src = fs.readFileSync('index.html', 'utf8');
  const i = src.indexOf('// ── Saved-record status stamps');
  const j = src.indexOf('function bwSetContractSource');
  const block = src.slice(i, src.indexOf('}', j));
  ok('the stamping block exists', i > -1 && j > i);
  ok('it contains no .set(', !/\.set\(/.test(block.replace(/^\s*\/\/.*$/gm, '')), block.length);
  ok('it contains no .update(', !/\.update\(/.test(block.replace(/^\s*\/\/.*$/gm, '')));
  ok('it never references _fbDB', !/_fbDB/.test(block.replace(/^\s*\/\/.*$/gm, '')));
  ok('persistSavedQuotes is still gone from the app', !/^function persistSavedQuotes/m.test(src));
}

await browser.close();
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
