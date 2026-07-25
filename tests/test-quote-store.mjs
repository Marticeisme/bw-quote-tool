// Exercises the per-record saved-quote store against an in-memory fake Firebase.
// The real database is never contacted: the gstatic SDK requests are aborted and
// window.firebase is replaced before any page script runs.
import { chromium } from 'playwright';
import fs from 'fs';

const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
const URL = 'http://localhost:3737/';

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '\n        ' + JSON.stringify(extra) : '')); }
};

async function newPage(browser, seed) {
  const ctx = await browser.newContext();
  await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', e => { fail++; console.log('  PAGEERROR: ' + e.message); });
  await page.addInitScript(FAKE);
  // The store only boots for a signed-in user now, so register a test account and use it.
  await page.addInitScript(`window.__fake.addAccount('tester@bwquote.local', 'pw');`);
  if (seed) await page.addInitScript(`(${(s) => window.__fake.seed(s)}).call(null, ${JSON.stringify(seed)});`);
  await page.goto(URL, { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('tester@bwquote.local', 'pw'));
  await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
  await page.waitForTimeout(300);
  return { ctx, page };
}

const legacyRec = (id, label, total) => ({ id, label, total, date: 'Jul 1, 2026', state: { fields: { x: '1' } } });

const browser = await chromium.launch();

// ── 1. Migration from the legacy savedQuotes node ────────────────────────────────────
console.log('\n1. Legacy migration');
{
  const seed = {
    savedQuotes: {
      cem: [legacyRec(1001, 'Nguyen family', 5000), legacyRec(1002, 'Ortiz plot', 7200)],
      ric: [legacyRec(2001, 'RIC — Chen', 9100)],
      fh: [], ga: [], cp: [], an: [],
    },
  };
  const { ctx, page } = await newPage(browser, seed);
  const r = await page.evaluate(() => ({
    quotes: window.__fake.get('quotes'),
    legacyStillThere: window.__fake.get('savedQuotes'),
    cemArr: _cemSavedQuotes.map(q => q.label),
    ricArr: _ricSavedContracts.map(q => q.label),
    writes: window.__fake.log().filter(l => !['once', 'signIn', 'signOut'].includes(l.op)),
  }));
  ok('records copied to quotes/cem as separate nodes',
    r.quotes && r.quotes.cem && Object.keys(r.quotes.cem).sort().join(',') === 'q1001,q1002',
    r.quotes && r.quotes.cem && Object.keys(r.quotes.cem));
  ok('records copied to quotes/ric', r.quotes && r.quotes.ric && !!r.quotes.ric.q2001);
  ok('legacy savedQuotes node left intact as backup',
    JSON.stringify(r.legacyStillThere) === JSON.stringify(seed.savedQuotes));
  ok('migration used a merging update(), never a set()',
    r.writes.length === 1 && r.writes[0].op === 'update' && r.writes[0].path === 'quotes',
    r.writes);
  ok('in-memory list is newest-first', r.cemArr.join('|') === 'Ortiz plot|Nguyen family', r.cemArr);
  ok('ric list populated', r.ricArr.join('|') === 'RIC — Chen', r.ricArr);
  await ctx.close();
}

// ── 2. No re-migration once quotes/ is populated ─────────────────────────────────────
console.log('\n2. Migration runs once only');
{
  const seed = {
    quotes: { cem: { q5: legacyRec(5, 'already migrated', 10) } },
    savedQuotes: { cem: [legacyRec(1001, 'should NOT reappear', 5000)] },
  };
  const { ctx, page } = await newPage(browser, seed);
  const r = await page.evaluate(() => ({
    keys: Object.keys(window.__fake.get('quotes').cem),
    writes: window.__fake.log().filter(l => !['once', 'signIn', 'signOut'].includes(l.op)),
  }));
  ok('did not re-import legacy records', r.keys.join(',') === 'q5', r.keys);
  ok('made no writes at all on boot', r.writes.length === 0, r.writes);
  await ctx.close();
}

// ── 3. Saving writes exactly one record path ─────────────────────────────────────────
console.log('\n3. A save touches one path only');
{
  const seed = { quotes: { cem: { q100: legacyRec(100, 'existing A', 1), q101: legacyRec(101, 'existing B', 2) } } };
  const { ctx, page } = await newPage(browser, seed);
  const r = await page.evaluate(async () => {
    window.__fake.clearLog();
    await saveQuoteRecord('cem', { id: 999, label: 'brand new', total: 42, date: 'x', state: {} }, 'brand new');
    return {
      writes: window.__fake.log().filter(l => !['once', 'signIn', 'signOut'].includes(l.op)),
      keys: Object.keys(window.__fake.get('quotes').cem).sort(),
      existingA: window.__fake.get('quotes/cem/q100'),
    };
  });
  ok('exactly one write', r.writes.length === 1, r.writes);
  ok('it was a set on the new record path only',
    r.writes[0].op === 'set' && r.writes[0].path === 'quotes/cem/q999', r.writes[0]);
  ok('other records still present', r.keys.join(',') === 'q100,q101,q999', r.keys);
  ok('a sibling record is byte-identical afterwards', r.existingA && r.existingA.label === 'existing A');
  await ctx.close();
}

// ── 4. The 20-record cap is gone ─────────────────────────────────────────────────────
console.log('\n4. No 20-record cap');
{
  const { ctx, page } = await newPage(browser, { quotes: {} });
  const r = await page.evaluate(async () => {
    for (let i = 1; i <= 25; i++) {
      await saveQuoteRecord('cem', { id: 1000 + i, label: 'Q' + i, total: i, date: 'x', state: {} }, 'Q' + i);
    }
    return {
      stored: Object.keys(window.__fake.get('quotes').cem).length,
      inMemory: _cemSavedQuotes.length,
      newestFirst: _cemSavedQuotes.slice(0, 3).map(q => q.label),
    };
  });
  ok('all 25 records persisted', r.stored === 25, r.stored);
  ok('all 25 in the rendered list', r.inMemory === 25, r.inMemory);
  ok('still newest-first', r.newestFirst.join('|') === 'Q25|Q24|Q23', r.newestFirst);
  await ctx.close();
}

// ── 5. Delete removes one path only ──────────────────────────────────────────────────
console.log('\n5. Delete is scoped to one record');
{
  const seed = { quotes: { cem: { q1: legacyRec(1, 'keep me', 1), q2: legacyRec(2, 'delete me', 2), q3: legacyRec(3, 'keep me too', 3) } } };
  const { ctx, page } = await newPage(browser, seed);
  const r = await page.evaluate(() => {
    window.__fake.clearLog();
    deleteSavedQuote('cem', 2);
    return {
      writes: window.__fake.log().filter(l => !['once', 'signIn', 'signOut'].includes(l.op)),
      keys: Object.keys(window.__fake.get('quotes').cem).sort(),
      list: _cemSavedQuotes.map(q => q.label),
    };
  });
  ok('one remove, correct path',
    r.writes.length === 1 && r.writes[0].op === 'remove' && r.writes[0].path === 'quotes/cem/q2', r.writes);
  ok('siblings survive', r.keys.join(',') === 'q1,q3', r.keys);
  ok('list updated', r.list.sort().join('|') === 'keep me|keep me too', r.list);
  await ctx.close();
}

// ── 6. Overwrite-by-name replaces rather than duplicating ────────────────────────────
console.log('\n6. Overwrite by name');
{
  const seed = { quotes: { cem: { q10: legacyRec(10, 'Same Name', 111), q11: legacyRec(11, 'Other', 222) } } };
  const { ctx, page } = await newPage(browser, seed);
  await page.evaluate(() => { window.confirm = () => true; });   // choose "overwrite"
  const r = await page.evaluate(async () => {
    window.__fake.clearLog();
    await saveQuoteRecord('cem', { id: 12, label: 'Same Name', total: 333, date: 'x', state: {} }, 'Same Name');
    return {
      keys: Object.keys(window.__fake.get('quotes').cem).sort(),
      labels: _cemSavedQuotes.map(q => q.label + ':' + q.total).sort(),
    };
  });
  ok('old duplicate removed by its own key, new one written', r.keys.join(',') === 'q11,q12', r.keys);
  ok('unrelated record untouched', r.labels.join('|') === 'Other:222|Same Name:333', r.labels);

  // and "Cancel" keeps both
  const r2 = await page.evaluate(async () => {
    window.confirm = () => false;
    await saveQuoteRecord('cem', { id: 13, label: 'Same Name', total: 444, date: 'x', state: {} }, 'Same Name');
    return Object.keys(window.__fake.get('quotes').cem).sort();
  });
  ok('declining the prompt keeps both copies', r2.join(',') === 'q11,q12,q13', r2);
  await ctx.close();
}

// ── 7. Backup import merges instead of replacing ─────────────────────────────────────
console.log('\n7. Backup import merges');
{
  const seed = { quotes: { cem: { q50: legacyRec(50, 'saved after the backup', 999) } } };
  const { ctx, page } = await newPage(browser, seed);
  const r = await page.evaluate(async () => {
    window.__fake.clearLog();
    const n = await _bulkImportQuotes({ cem: [legacyRec2(60, 'from backup A'), legacyRec2(61, 'from backup B')] });
    function legacyRec2(id, label) { return { id, label, total: 1, date: 'x', state: {} }; }
    return {
      n,
      keys: Object.keys(window.__fake.get('quotes').cem).sort(),
      writes: window.__fake.log().filter(l => !['once', 'signIn', 'signOut'].includes(l.op)),
    };
  });
  ok('reported 2 imported', r.n === 2, r.n);
  ok('newer record NOT clobbered by the older backup',
    r.keys.join(',') === 'q50,q60,q61', r.keys);
  ok('used a merging update()', r.writes.length === 1 && r.writes[0].op === 'update', r.writes);
  await ctx.close();
}

// ── 8. Remote changes stream in per record ───────────────────────────────────────────
console.log('\n8. Remote child events');
{
  const { ctx, page } = await newPage(browser, { quotes: { cem: { q1: legacyRec(1, 'first', 1) } } });
  const r = await page.evaluate(async () => {
    // simulate another tab writing a record
    await _fbDB.ref('quotes/cem/q2').set({ id: 2, label: 'from another tab', total: 5, date: 'x', state: {} });
    await new Promise(r => setTimeout(r, 100));
    const after = _cemSavedQuotes.map(q => q.label);
    await _fbDB.ref('quotes/cem/q1').remove();
    await new Promise(r => setTimeout(r, 100));
    return { after, afterRemove: _cemSavedQuotes.map(q => q.label) };
  });
  ok('remote add appears in the list', r.after.join('|') === 'from another tab|first', r.after);
  ok('remote delete disappears', r.afterRemove.join('|') === 'from another tab', r.afterRemove);
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
