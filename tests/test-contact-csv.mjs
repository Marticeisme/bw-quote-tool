// Sprint-04 Track C — CSV in and out: the parser, the column mapper, the import, and the
// undo that makes importing into a live database acceptable at all.
//
// NOTHING HERE TOUCHES PRODUCTION. Every context installs tests/fake-firebase.js before any
// page script runs and aborts the gstatic firebasejs request, so `_fbDB` is an in-memory tree.
// The only real import of the demo file is the operator's own, on the live site, after a push.
//
// House rules this suite obeys (SPRINT.md):
//   · no assertion reads a value from the same constant the code reads — the view counts come
//     out of RENDERED DOM and the demo-file expectations are hand-written numbers,
//   · every number that matters is asserted here, not stated in a report sentence,
//   · fixtures are synthetic by rule: invented names, 555-range phones, @example.com.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
const DEMO = fs.readFileSync('data/demo-contacts.csv', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const UID = 'uid_tester@bwquote.local';

// ─────────────────────────────────────────────────────────────────────────────────────
// THE DEMO FILE'S HAND-COMPUTED EXPECTATIONS
//
// Worked out by reading data/demo-contacts.csv against the view rules in index.html, NOT by
// running the import and writing down what it said. 31 data rows: 30 distinct contacts plus
// one deliberate re-entry of the Wickersham record, same email, so the duplicate skip is
// visible in the operator's own preview. 30 land; 1 is skipped.
const DEMO_ROWS = 31;
const DEMO_CREATED = 30;
const DEMO_SKIPPED = 1;
const DEMO_NOTES = 5;     // rows 1, 4, 9, 12 and 18 carry a note. Row 31 carries one too, but
                          // it is the duplicate — it is skipped, so its note is never created.
const DEMO_TASKS = 10;    // six overdue, two far-future, two with a summary and no due date
const VIEWS = {
  followup: 6,    // an open to-do due today or earlier — the six overdue rows
  unworked: 11,   // new/working, no open to-do, no note
  newweek:  30,   // every imported contact: createdAt is import time
  nonext:   16,   // still live (not sold / not-interested / do-not-contact), zero open to-dos
  health:   5,    // one row per Data-health rule
};

// ─────────────────────────────────────────────────────────────────────────────────────
// Comparing two Firebase trees BY CONTENT.
//
// Real RTDB has no empty containers and stores no nulls: a node with no children does not
// exist. tests/fake-firebase.js keeps `importBatches: {}` behind after the last batch is
// removed, which is a property of the stub and not of the database. prune() applies Firebase's
// own semantics to BOTH sides symmetrically before anything is compared; it can therefore
// never hide a record, only an emptiness that production would not have had.
const prune = (v) => {
  if (v === null || v === undefined) return undefined;
  if (typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(prune);
  const o = {};
  Object.keys(v).sort().forEach((k) => {
    const p = prune(v[k]);
    if (p === undefined) return;
    if (p && typeof p === 'object' && !Array.isArray(p) && Object.keys(p).length === 0) return;
    o[k] = p;
  });
  return o;
};
// Every differing path, not a boolean — a red assertion has to say WHERE.
function diffPaths(a, b, at = '', out = []) {
  const t = (x) => (x === null ? 'null' : Array.isArray(x) ? 'array' : typeof x);
  if (t(a) !== t(b)) { out.push(at + ': ' + t(a) + ' vs ' + t(b)); return out; }
  if (t(a) === 'array') {
    if (a.length !== b.length) out.push(at + ': length ' + a.length + ' vs ' + b.length);
    else a.forEach((x, i) => diffPaths(x, b[i], at + '[' + i + ']', out));
  } else if (t(a) === 'object') {
    const keys = Object.keys(a).concat(Object.keys(b).filter((k) => !(k in a)));
    keys.forEach((k) => {
      if (!(k in a)) out.push(at + '/' + k + ': only after');
      else if (!(k in b)) out.push(at + '/' + k + ': only before');
      else diffPaths(a[k], b[k], at + '/' + k, out);
    });
  } else if (a !== b) out.push(at + ': ' + JSON.stringify(a) + ' vs ' + JSON.stringify(b));
  return out;
}

async function open(browser, hash, seed) {
  const ctx = await browser.newContext();
  await ctx.route(/gstatic\.com\/firebasejs/, (r) => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 220)); });
  page.on('dialog', (d) => d.accept());
  await page.addInitScript(FAKE);
  await page.addInitScript(`window.__fake.addAccount('tester@bwquote.local','pw');
    window.__fake.seed(${JSON.stringify(seed || {})});`);
  await page.goto('http://localhost:' + (process.env.PORT || 3737) + '/' + (hash || ''), { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('tester@bwquote.local', 'pw'));
  await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
  await page.waitForTimeout(200);
  return { ctx, page, errs };
}

const browser = await chromium.launch();

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n1. The parser — RFC 4180 and what actually arrives');
{
  const { ctx, page, errs } = await open(browser, '');
  const r = await page.evaluate(() => ({
    bom:        bwCsvParse('﻿a,b\r\n1,2'),
    quotedComma: bwCsvParse('a,b\r\n"x, y",2'),
    quotedNl:   bwCsvParse('a,b\r\n"line one\nline two",2'),
    quotedCrlf: bwCsvParse('a,b\r\n"line one\r\nline two",2'),
    escQuote:   bwCsvParse('a,b\r\n"he said ""hi""",2'),
    crlf:       bwCsvParse('a,b\r\n1,2\r\n3,4'),
    lf:         bwCsvParse('a,b\n1,2\n3,4'),
    ragged:     bwCsvParse('a,b,c\r\n1,2\r\n1,2,3,4'),
    trailing:   bwCsvParse('a,b\r\n1,2\r\n\r\n\r\n'),
    emptyCells: bwCsvParse('a,b,c\r\n,"",x'),
    onlyHeader: bwCsvParse('a,b,c'),
    keepsSpaces: bwCsvParse('a,b\r\n" padded ",x'),
    commaInQuotesNotSplit: bwCsvParse('a\r\n"1,2,3"').length,
  }));
  ok('a UTF-8 BOM is stripped, not read as part of the first header',
    same(r.bom, [['a', 'b'], ['1', '2']]), r.bom);
  ok('a comma inside quotes is data, not a delimiter',
    same(r.quotedComma[1], ['x, y', '2']), r.quotedComma);
  ok('an LF newline inside quotes stays inside the cell',
    same(r.quotedNl[1], ['line one\nline two', '2']) && r.quotedNl.length === 2, r.quotedNl);
  ok('a CRLF newline inside quotes stays inside the cell verbatim',
    same(r.quotedCrlf[1], ['line one\r\nline two', '2']) && r.quotedCrlf.length === 2, r.quotedCrlf);
  ok('"" is one escaped quote', same(r.escQuote[1], ['he said "hi"', '2']), r.escQuote);
  ok('CRLF separates records', same(r.crlf, [['a', 'b'], ['1', '2'], ['3', '4']]), r.crlf);
  ok('LF alone separates records too', same(r.lf, [['a', 'b'], ['1', '2'], ['3', '4']]), r.lf);
  ok('a ragged row is returned as it is, short and long alike',
    same(r.ragged, [['a', 'b', 'c'], ['1', '2'], ['1', '2', '3', '4']]), r.ragged);
  ok('trailing blank lines are dropped, the real rows are not',
    same(r.trailing, [['a', 'b'], ['1', '2']]), r.trailing);
  ok('an empty cell and an empty quoted cell both read as ""',
    same(r.emptyCells[1], ['', '', 'x']), r.emptyCells);
  ok('a header with no data rows is one row, not zero',
    same(r.onlyHeader, [['a', 'b', 'c']]), r.onlyHeader);
  ok('spaces inside a quoted cell are preserved',
    same(r.keepsSpaces[1], [' padded ', 'x']), r.keepsSpaces);
  ok('a quoted cell holding two commas is still one cell', r.commaInQuotesNotSplit === 2, r.commaInQuotesNotSplit);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n2. parse(serialise(x)) === x');
{
  const { ctx, page, errs } = await open(browser, '');
  // A comma, a quote, a newline and a leading '+', plus a CRLF inside a cell and a cell that
  // is nothing but a quote — the four the track names and the two that break naive writers.
  const FIX = [
    ['Ada, the first', 'she said "yes"', 'one\ntwo', '+15%'],
    ['plain', '"', 'has\r\nCRLF', ''],
    ['', 'trailing space ', ' leading space', '+'],
  ];
  const COLS = ['A,1', 'B"2', 'C\n3', 'D'];
  const r = await page.evaluate(({ FIX, COLS }) => {
    const csv = bwToCsv(FIX, COLS);
    const back = bwCsvParse(csv);
    const objCsv = bwToCsv([{ 'A,1': 'x,y', 'B"2': 'q"q' }], ['A,1', 'B"2']);
    return { csv, back, objCsv, objBack: bwCsvParse(objCsv) };
  }, { FIX, COLS });
  ok('the header round-trips through quoting', same(r.back[0], COLS), r.back[0]);
  ok('every fixture row round-trips exactly', same(r.back.slice(1), FIX), r.back.slice(1));
  ok('a leading + survives — no formula-guard mangling', r.back[3][3] === '+', r.back[3]);
  ok('only what needs quoting is quoted', r.csv.indexOf('plain,') > -1, r.csv.slice(0, 200));
  ok('rows given as objects serialise by column name',
    same(r.objBack, [['A,1', 'B"2'], ['x,y', 'q"q']]), r.objBack);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n3. The auto-mapper against a foreign header set');
{
  const { ctx, page, errs } = await open(browser, '');
  // Shaped like a real CRM export: different spellings, casing and punctuation, several
  // columns we have nowhere to put, and TWO that want the same field.
  const HEADER = ['First Name', 'LAST_NAME', 'E-mail Address', 'Home Phone', 'Address Line 1',
                  'City', 'ST', 'Postal Code', 'Lead Source', 'Stage', 'Tags', 'Date of Birth',
                  'Notes', 'Follow-up Date', 'Account Balance', 'Referred By', 'Mobile'];
  const r = await page.evaluate((H) => {
    const m = bwCsvAutoMap(H);
    return { m, rep: bwCsvMapReport(H, m),
             demo: bwCsvAutoMap(['first', 'last', 'email', 'phone', 'street', 'city', 'state', 'zip',
                                 'source', 'status', 'category', 'flags', 'salutation', 'note',
                                 'next_action', 'next_action_date',
                                 'property_section', 'property_lot', 'property_lot_alpha',
                                 'property_space', 'property_sid', 'property_kind',
                                 'property_spaces_owned', 'property_interments_used',
                                 'property_deed', 'property_purchased_on']) };
  }, HEADER);
  ok('every recognisable column lands on the right field',
    same(r.m.slice(0, 14), ['given', 'family', 'email', 'phone', 'street', 'city', 'state', 'zip',
                            'source', 'status', 'flags', 'dob', 'note', 'nextActionDate']), r.m);
  ok('"Account Balance" and "Referred By" have nowhere to go and are skipped',
    r.m[14] === '' && r.m[15] === '', r.m.slice(14));
  ok('a SECOND column wanting `phone` is skipped, never allowed to overwrite the first',
    r.m[16] === '', { mobile: r.m[16] });
  ok('the report names the skipped columns rather than only counting them',
    r.rep.skippedCount === 3 && same(r.rep.skipped, ['Account Balance', 'Referred By', 'Mobile']), r.rep);
  ok('and counts the mapped ones', r.rep.mapped === 14, r.rep.mapped);
  ok('no column is auto-mapped to a field another column already claimed',
    new Set(r.m.filter(Boolean)).size === r.m.filter(Boolean).length, r.m);
  // The demo file's own header, and the trap it is built to catch: `next_action` and
  // `next_action_date` are two facts and must not collapse onto one field.
  // Sixteen until sprint-05 Track A added the ten property columns at the END. Appending is
  // deliberate: the first field that claims a header wins it, so a new field can never take a
  // header away from one that existed before it.
  ok('the demo header maps all twenty-six of its columns',
    r.demo.filter(Boolean).length === 26, r.demo);
  ok('next_action is the to-do SUMMARY and next_action_date is its DUE DATE — two fields',
    r.demo[14] === 'nextAction' && r.demo[15] === 'nextActionDate', r.demo.slice(14));
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n4. Taxonomy: a LABEL resolves to its CODE; an unknown value is dropped and counted');
{
  const { ctx, page, errs } = await open(browser, '');
  const ROWS = [
    ['first', 'last', 'email', 'source', 'status', 'category', 'flags'],
    ['Ada', 'Fenwick', 'ada@example.com', 'Walk-In', 'Working', 'Pre-Need Cemetery', 'Veteran; VIP'],
    ['Bo', 'Ilesanmi', 'bo@example.com', 'walk in', 'NEW', 'at-need', 'veteran'],
    ['Cleo', 'Marchetti', 'cleo@example.com', 'Carrier Pigeon', 'Working', 'Pre-Need Cemetery', 'Astronaut'],
  ];
  const r = await page.evaluate((ROWS) => {
    const plan = bwCsvPlan(ROWS, bwCsvAutoMap(ROWS[0]), {});
    return {
      p1: plan.rows[0].party, p2: plan.rows[1].party, p3: plan.rows[2].party,
      dropped: plan.dropped, droppedCount: plan.counts.dropped,
    };
  }, ROWS);
  ok('a label stores the CODE, never the label',
    r.p1.source === 'walk-in' && r.p1.status === 'working' && r.p1.category === 'pre-need-cemetery', r.p1);
  ok('a multi-valued flags cell splits and resolves each one',
    same(r.p1.flags, ['veteran', 'vip']), r.p1.flags);
  ok('spacing and casing do not matter — "walk in", "NEW", "at-need" all resolve',
    r.p2.source === 'walk-in' && r.p2.status === 'new' && r.p2.category === 'at-need', r.p2);
  ok('an unrecognised source is NOT written through as an invented code',
    r.p3.source === undefined, r.p3.source);
  ok('an unrecognised flag is not written either', r.p3.flags === undefined, r.p3.flags);
  ok('both are reported, by line, field and value',
    r.droppedCount === 2
    && r.dropped.some((d) => d.field === 'source' && d.value === 'Carrier Pigeon' && d.line === 4)
    && r.dropped.some((d) => d.field === 'flags' && d.value === 'Astronaut' && d.line === 4), r.dropped);
  ok('the rest of that row still imports', r.p3.given === 'Cleo' && r.p3.status === 'working', r.p3);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n5. Duplicates (D8) — contact method skips, a name alone does not');
{
  const EXISTING = {
    parties: {
      x1: { id: 'x1', given: 'Delphine', family: 'Aristide', kind: 'person', ownerUid: UID,
            emails: { e1: { value: 'Delphine.Aristide@Example.com', isPrimary: true } },
            createdAt: 1, updatedAt: 1 },
      x2: { id: 'x2', given: 'Marcus', family: 'Bellweather', kind: 'person', ownerUid: UID,
            phones: { p1: { value: '2065550102', isPrimary: true } }, createdAt: 1, updatedAt: 1 },
      x3: { id: 'x3', given: 'Cleo', family: 'Marchetti', kind: 'person', ownerUid: UID,
            phones: { p1: { value: '2065550199', isPrimary: true } }, createdAt: 1, updatedAt: 1 },
    },
  };
  const { ctx, page, errs } = await open(browser, '', EXISTING);
  await page.waitForFunction(() => typeof _parties !== 'undefined' && _parties.length === 3, { timeout: 20000 });
  const ROWS = [
    ['first', 'last', 'email', 'phone'],
    ['Delphine', 'Aristide', 'delphine.aristide@example.com', '(206) 555-0101'],  // email, different case
    ['Marc', 'Bellweather', 'marc.b@example.com', '1-206-555-0102'],              // phone, ten digits, +1
    ['Cleo', 'Marchetti', 'cleo.m@example.com', '(206) 555-0188'],                // NAME only — not a dup
    ['Nadia', 'Quintero', 'nadia.q@example.com', '(206) 555-0177'],               // brand new
    ['Nadia', 'Quintero', 'nadia.q@example.com', '(206) 555-0166'],               // same as the row above
    ['', '', '', ''],                                                             // no name, no method
  ];
  const r = await page.evaluate((ROWS) => {
    const map = bwCsvAutoMap(ROWS[0]);
    const plan = bwCsvPlan(ROWS, map, {});
    const forced = bwCsvPlan(ROWS, map, { importDupes: true });
    return {
      dup: plan.rows.map((e) => (e.dupOf ? e.dupWhy.split(' ')[0] : '')),
      inFile: plan.rows.map((e) => !!e.dupInFile),
      nameWarn: plan.rows.map((e) => e.nameWarn),
      valid: plan.rows.map((e) => e.valid),
      counts: plan.counts, forcedCounts: forced.counts,
      lines: plan.rows.map((e) => e.line),
    };
  }, ROWS);
  ok('an exact email match, ignoring case, is a duplicate', r.dup[0] === 'email', r.dup);
  ok('a phone matching on all ten digits is a duplicate even written as 1-206-…', r.dup[1] === 'phone', r.dup);
  ok('a NAME-only match is not a duplicate — it imports', r.dup[2] === '', r.dup);
  ok('…and it still warns, through bwFindPossibleDuplicates', r.nameWarn[2] === 1, r.nameWarn);
  ok('a row duplicating an EARLIER ROW IN THE SAME FILE is caught too',
    r.dup[4] === 'email' && r.inFile[4] === true, { dup: r.dup, inFile: r.inFile });
  ok('a row with no name and no contact method cannot be imported', !r.valid[5], r.valid);
  ok('counts: 6 rows, 2 import, 3 duplicates, 1 impossible',
    r.counts.total === 6 && r.counts.willImport === 2 && r.counts.dupes === 3 && r.counts.invalid === 1, r.counts);
  ok('ticking "import these anyway" moves all three duplicates into the import',
    r.forcedCounts.willImport === 5 && r.forcedCounts.dupes === 0, r.forcedCounts);
  ok('the impossible row is still impossible with that box ticked', r.forcedCounts.invalid === 1, r.forcedCounts);
  ok('rows are reported by SPREADSHEET line, header included', same(r.lines, [2, 3, 4, 5, 6, 7]), r.lines);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n6. A missing demo file must fail LOUDLY, and import nothing (the SPA-fallback trap)');
{
  const { ctx, page, errs } = await open(browser, '#import-contacts');
  // A server that answers a missing file with HTTP 200 and a full HTML page is the hazard
  // this loader guard exists for — captive portals, SPA hosts, and dev-server.mjs before it
  // learned to 404 missing files (2026-07-31). The dev server no longer produces it, so the
  // hazard is manufactured here with a route: 200 + the whole of index.html, byte for byte.
  await ctx.route('**/data/this-file-does-not-exist.csv', (r) =>
    r.fulfill({ status: 200, contentType: 'text/html', body: fs.readFileSync('index.html', 'utf8') }));
  const probe = await page.evaluate(() => fetch('data/this-file-does-not-exist.csv')
    .then((res) => res.text().then((t) => ({ status: res.status, ok: res.ok, bytes: t.length, head: t.slice(0, 30).trim() }))));
  ok('the hazard is in place: the missing data/ file answers 200 + an HTML page',
    probe.status === 200 && probe.ok === true && /^<!DOCTYPE/i.test(probe.head), probe);
  ok('…and it is enormous, so a naive parse would produce thousands of junk rows',
    probe.bytes > 1000000, probe.bytes);

  const r = await page.evaluate(async () => {
    const before = window.__fake.dump();
    let msg = '';
    try { await bwLoadDemoCsv('data/this-file-does-not-exist.csv'); }
    catch (e) { msg = e.message; }
    return { msg, wroteAnything: JSON.stringify(window.__fake.dump()) !== JSON.stringify(before) };
  });
  ok('the loader throws rather than returning 2.7 MB of markup', !!r.msg, r.msg);
  ok('and the error NAMES the file and says what came back instead',
    /this-file-does-not-exist\.csv/.test(r.msg) && /HTML/i.test(r.msg), r.msg);
  ok('nothing at all was written', r.wroteAnything === false);

  // The same guard on the file-picker path, and on a body that parses but is the wrong file.
  const r2 = await page.evaluate(() => {
    bwImpBegin('<!DOCTYPE html><html><body>not a csv</body></html>', 'oops.html');
    const a = { imp: _bwImp, err: (document.getElementById('impError') || {}).textContent || '' };
    bwImpBegin('a,b\r\n1,2', 'two-columns.csv');
    const b = { step: _bwImp && _bwImp.step };
    return { a, b };
  });
  ok('a picked file that is really an HTML page is refused by name',
    r2.a.imp === null && /oops\.html/.test(r2.a.err) && /HTML/i.test(r2.a.err), r2.a);
  ok('an ordinary CSV still gets through to the mapping step', r2.b.step === 2, r2.b);

  const r3 = await page.evaluate(async () => {
    let msg = '';
    // A real CSV, served, but not the demo file: the header check must still stop it.
    try { await bwLoadDemoCsv('data/prices.json'); } catch (e) { msg = e.message; }
    return msg;
  });
  ok('a file that is not the demo file is refused on its header row', /header row/i.test(r3), r3);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n7. End to end — the demo file in, the five views, and the batch back out again');
{
  const { ctx, page, errs } = await open(browser, '#import-contacts');
  const before = await page.evaluate(() => window.__fake.dump());

  // Drive the real screen, not the model: the demo link, the mapping step, the preview, the
  // Import button. If any of them is wired wrong this fails here rather than in production.
  await page.click('#impDemoBtn');
  await page.waitForSelector('#impMapSummary', { timeout: 20000 });
  const mapStep = await page.evaluate(() => ({
    summary: document.getElementById('impMapSummary').textContent,
    cols: document.querySelectorAll('#impBody .imp-tbl tbody tr').length,
    selected: [...document.querySelectorAll('#impBody select[data-col]')].map((s) => s.value),
    step: document.querySelector('.imp-step.active').textContent,
  }));
  ok('the demo file reaches the mapping step with all twenty-six columns listed',
    mapStep.cols === 26, mapStep.cols);
  ok('every one of them is auto-mapped, and the screen says nothing was skipped',
    mapStep.selected.every(Boolean) && /nothing skipped/.test(mapStep.summary), mapStep.summary);
  ok('and it is step 2, not a one-click seed of the database', /2\. Map columns/.test(mapStep.step), mapStep.step);

  await page.click('button.imp-go');
  await page.waitForSelector('#impRunBtn', { timeout: 20000 });
  const preview = await page.evaluate(() => ({
    counts: [...document.querySelectorAll('#impBody .imp-counts span')].map((s) => s.textContent.trim()),
    rows: document.querySelectorAll('#impBody .imp-tbl tbody tr').length,
    dupes: (document.getElementById('impDupes') || {}).textContent || '',
    dropped: !!document.getElementById('impDropped'),
    btn: document.getElementById('impRunBtn').textContent.trim(),
  }));
  ok('the preview reports 31 rows', /^31 rows$/.test(preview.counts[0]), preview.counts);
  ok('30 will import', /^30 will import$/.test(preview.counts[1]), preview.counts);
  ok('1 is skipped as a duplicate', /^1 skipped as duplicates$/.test(preview.counts[2]), preview.counts);
  ok('none is unimportable', /^0 with no name/.test(preview.counts[3]), preview.counts);
  ok('the duplicate is listed by line number and by name',
    /Line 32/.test(preview.dupes) && /Wickersham/.test(preview.dupes)
    && /barnaby\.wickersham@example\.com/.test(preview.dupes), preview.dupes);
  ok('no value in the demo file is unrecognised — nothing would be dropped',
    preview.dropped === false);
  ok('the preview shows the first five rows', preview.rows === 5, preview.rows);
  ok('the button says exactly how many it will create', preview.btn === 'Import 30 contacts', preview.btn);

  await page.click('#impRunBtn');
  await page.waitForSelector('#impResult', { timeout: 60000 });
  const result = await page.evaluate(() => ({
    counts: [...document.querySelectorAll('#impResult .imp-counts span')].map((s) => s.textContent.trim()),
    skipped: (document.querySelector('#impResult .imp-list ul') || {}).textContent || '',
    batchId: _bwImp.result.batchId,
    parties: _parties.length,
    // What was WRITTEN, straight out of the stub — not what the result object claims.
    dbParties: Object.keys(window.__fake.get('parties') || {}).length,
    dbNotes: Object.keys(window.__fake.get('contactNotes') || {}).length,
    dbTasks: Object.keys(window.__fake.get('contactTasks') || {}).length,
    dbBatches: Object.keys(window.__fake.get('importBatches') || {}).length,
    // Every write must have been to a single record path. A .set() on a collection node is
    // how this project lost real data twice.
    collectionWrites: window.__fake.log().filter((l) => (l.op === 'set' || l.op === 'update')
      && /^(parties|contactNotes|contactTasks|importBatches)$/.test(l.path)).length,
    provOk: Object.keys(window.__fake.get('parties')).every((k) => {
      const p = window.__fake.get('parties/' + k);
      return p._prov && p._prov.src === 'csv-import' && p._prov.ref === _bwImp.result.batchId;
    }),
  }));
  ok('the result screen reports ' + DEMO_CREATED + ' created', result.counts[0] === DEMO_CREATED + ' created', result.counts);
  ok('and ' + DEMO_NOTES + ' notes, ' + DEMO_TASKS + ' to-dos',
    result.counts[1] === DEMO_NOTES + ' notes' && result.counts[2] === DEMO_TASKS + ' to-dos', result.counts);
  ok('and ' + DEMO_SKIPPED + ' skipped, 0 failed',
    result.counts[3] === DEMO_SKIPPED + ' skipped' && result.counts[4] === '0 failed', result.counts);
  ok('the skipped row is named with its reason', /duplicate of/.test(result.skipped) && /Line 32/.test(result.skipped), result.skipped);
  ok('the database holds exactly ' + DEMO_CREATED + ' parties', result.dbParties === DEMO_CREATED, result.dbParties);
  ok('…' + DEMO_NOTES + ' notes and ' + DEMO_TASKS + ' to-dos',
    result.dbNotes === DEMO_NOTES && result.dbTasks === DEMO_TASKS, { n: result.dbNotes, t: result.dbTasks });
  ok('…and one batch record', result.dbBatches === 1, result.dbBatches);
  ok('every party carries _prov pointing at that batch', result.provOk === true);
  ok('NOT ONE write went to a collection node — every one was a single record',
    result.collectionWrites === 0, result.collectionWrites);

  // The five views, read off the rendered buttons and then off the rendered rows.
  await page.evaluate(() => show('contacts', null));
  await page.waitForTimeout(200);
  const views = {};
  for (const code of Object.keys(VIEWS)) {
    views[code] = await page.evaluate(async (c) => {
      if (_bwCtView.view !== c) bwCtSetView(c);
      await new Promise((r) => setTimeout(r, 80));
      return {
        rows: document.querySelectorAll('#contactsList tbody tr').length,
        badge: +document.querySelector('#ctViews .ct-view[data-view="' + c + '"] .n').textContent,
      };
    }, code);
  }
  for (const [code, want] of Object.entries(VIEWS)) {
    ok('view "' + code + '" returns exactly ' + want + ' contacts', views[code].rows === want, views[code]);
    ok('view "' + code + '" badge agrees with its own list', views[code].badge === want, views[code]);
  }
  ok('every one of the five default views is non-empty',
    Object.values(views).every((v) => v.rows > 0), views);

  // ── and back out again ────────────────────────────────────────────────────────────
  const batchId = result.batchId;
  // bwImpUndo is exactly what the result screen's "Undo this import" button calls.
  const undone = await page.evaluate(async (id) => {
    const res = await bwImpUndo(id);
    await new Promise((r) => setTimeout(r, 120));
    return { res, after: window.__fake.dump(), parties: _parties.length,
             shown: (document.getElementById('impUndone') || {}).textContent || '' };
  }, batchId);
  ok('the result screen says what the undo removed',
    /30 contacts/.test(undone.shown) && /5 notes/.test(undone.shown), undone.shown);
  ok('undo removed all ' + DEMO_CREATED + ' contacts', undone.res.deletedParties === DEMO_CREATED, undone.res);
  ok('…their ' + DEMO_NOTES + ' notes and ' + DEMO_TASKS + ' to-dos',
    undone.res.deletedNotes === DEMO_NOTES && undone.res.deletedTasks === DEMO_TASKS, undone.res);
  ok('nothing was refused', undone.res.kept.length === 0, undone.res.kept);
  ok('the batch record is gone', undone.res.batchRemoved === true
    && Object.keys(undone.after.importBatches || {}).length === 0, undone.after.importBatches);
  ok('the in-memory list is empty again', undone.parties === 0, undone.parties);

  const diff = diffPaths(prune(before), prune(undone.after));
  ok('THE STORE IS IDENTICAL TO ITS STATE BEFORE THE IMPORT', diff.length === 0, diff.slice(0, 8));
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n8. Sabotage — an undo that leaves one id behind must turn that assertion red');
{
  // One contact already in the book, so `parties` exists on BOTH sides of the comparison and
  // the diff can name the exact record that was left behind rather than the whole node.
  const SEED = { parties: { keep1: { id: 'keep1', given: 'Quillon', family: 'Merribourne',
    kind: 'person', ownerUid: UID, salutation: 'Dear Quillon,',
    emails: { e1: { value: 'quillon.merribourne@example.com', isPrimary: true } },
    phones: { p1: { value: '2065550199', isPrimary: true } },
    source: 'walk-in', status: 'working', createdAt: 1, updatedAt: 1 } } };
  const { ctx, page, errs } = await open(browser, '#import-contacts', SEED);
  await page.waitForFunction(() => typeof _parties !== 'undefined' && _parties.length === 1, { timeout: 20000 });
  const before = await page.evaluate(() => window.__fake.dump());
  await page.click('#impDemoBtn');
  await page.waitForSelector('#impMapSummary', { timeout: 20000 });
  await page.click('button.imp-go');
  await page.waitForSelector('#impRunBtn', { timeout: 20000 });
  await page.click('#impRunBtn');
  await page.waitForSelector('#impResult', { timeout: 60000 });

  const r = await page.evaluate(async () => {
    const id = _bwImp.result.batchId;
    const b = _batchStore[id];
    const victim = b.createdPartyIds[7];
    // Break undo in exactly one way: drop one id from the batch AND from provenance, so
    // neither route can find it. Everything else about the undo is untouched.
    b.createdPartyIds = b.createdPartyIds.filter((x) => x !== victim);
    _partyStore[victim]._prov = { src: 'manual', ref: null, at: Date.now() };
    const res = await bwUndoImport(id);
    await new Promise((r) => setTimeout(r, 120));
    return { res, after: window.__fake.dump(), victim, victimName: bwPartyName(_partyStore[victim]) };
  });
  const diff = diffPaths(prune(before), prune(r.after));
  ok('the sabotaged undo removed one contact fewer', r.res.deletedParties === DEMO_CREATED - 1, r.res.deletedParties);
  ok('and the identical-store assertion GOES RED — it has teeth', diff.length > 0, diff.slice(0, 4));
  ok('…naming the exact record left behind',
    diff.some((d) => d.indexOf('/parties/' + r.victim) === 0), { diff: diff.slice(0, 4), victim: r.victim });
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n8b. An import interrupted before its batch was rewritten is STILL fully undoable');
{
  // The failure this covers: the browser is closed, or the connection drops, part-way through
  // a run. The batch record was written first and rewritten last, so a batch cut short holds
  // fewer ids than were actually created. Provenance is what closes that hole — every record
  // carries _prov.ref = the batch — and section 8 proves the identical-store assertion is
  // capable of failing, so this passing is a statement about the recovery, not about a weak test.
  const { ctx, page, errs } = await open(browser, '#import-contacts');
  const before = await page.evaluate(() => window.__fake.dump());
  await page.click('#impDemoBtn');
  await page.waitForSelector('#impMapSummary', { timeout: 20000 });
  await page.click('button.imp-go');
  await page.waitForSelector('#impRunBtn', { timeout: 20000 });
  await page.click('#impRunBtn');
  await page.waitForSelector('#impResult', { timeout: 60000 });

  const r = await page.evaluate(async () => {
    const id = _bwImp.result.batchId;
    const b = _batchStore[id];
    const lost = { parties: b.createdPartyIds.length, notes: b.createdNoteIds.length, tasks: b.createdTaskIds.length };
    // Exactly what an interrupted run leaves behind: the ids are missing from the batch, the
    // records and their _prov are not.
    b.createdPartyIds = b.createdPartyIds.slice(0, 4);
    b.createdNoteIds = [];
    b.createdTaskIds = [];
    const res = await bwUndoImport(id);
    await new Promise((x) => setTimeout(x, 120));
    return { res, lost, after: window.__fake.dump(), parties: _parties.length };
  });
  ok('the batch had been cut down to 4 of ' + DEMO_CREATED + ' ids', r.lost.parties === DEMO_CREATED, r.lost);
  ok('undo still finds and removes every one, through _prov',
    r.res.deletedParties === DEMO_CREATED && r.res.deletedNotes === DEMO_NOTES
    && r.res.deletedTasks === DEMO_TASKS, r.res);
  ok('the batch record is still cleared', r.res.batchRemoved === true);
  const diff = diffPaths(prune(before), prune(r.after));
  ok('and the store is identical to before the interrupted import', diff.length === 0, diff.slice(0, 8));
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n9. Undo refuses a contact that has since gained a contractRole, and says so');
{
  const { ctx, page, errs } = await open(browser, '#import-contacts');
  await page.click('#impDemoBtn');
  await page.waitForSelector('#impMapSummary', { timeout: 20000 });
  await page.click('button.imp-go');
  await page.waitForSelector('#impRunBtn', { timeout: 20000 });
  await page.click('#impRunBtn');
  await page.waitForSelector('#impResult', { timeout: 60000 });

  const r = await page.evaluate(async () => {
    const id = _bwImp.result.batchId;
    // The realistic sequence: he imports, quotes one of them, then changes his mind about
    // the import. That one contact must survive, and he must be told why.
    const keeper = _batchStore[id].createdPartyIds[3];
    const keeperName = bwPartyName(_partyStore[keeper]);
    await saveContractRole({ recordType: 'cem', recordId: 'q1', partyId: keeper, role: 'purchaser' });
    await new Promise((r) => setTimeout(r, 60));
    const res = await bwImpUndo(id);          // what the "Undo this import" button calls
    await new Promise((r) => setTimeout(r, 120));
    return {
      res, keeper, keeperName,
      stillThere: !!window.__fake.get('parties/' + keeper),
      batchStillThere: !!window.__fake.get('importBatches/' + id),
      batchIds: (window.__fake.get('importBatches/' + id) || {}).createdPartyIds || [],
      shown: (document.getElementById('impError') || {}).textContent || '',
      others: Object.keys(window.__fake.get('parties') || {}).length,
    };
  });
  ok('the linked contact is kept, not deleted', r.stillThere === true && r.res.deletedParties === DEMO_CREATED - 1, r.res);
  ok('and it is reported by name, with deleteParty\'s own reason',
    r.res.kept.length === 1 && r.res.kept[0].name === r.keeperName
    && /attached to a quote or contract/.test(r.res.kept[0].why), r.res.kept);
  ok('the refusal is surfaced on screen, not swallowed',
    r.shown.indexOf(r.keeperName) > -1 && /could not be removed/.test(r.shown), r.shown);
  ok('every OTHER contact from the batch is gone', r.others === 1, r.others);
  ok('the batch record survives, holding exactly what survived, so undo can be retried',
    r.batchStillThere === true && same(r.batchIds, [r.keeper]), { b: r.batchStillThere, ids: r.batchIds });
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n10. Export round-trips back through the importer without loss');
{
  const { ctx, page, errs } = await open(browser, '#import-contacts');
  await page.click('#impDemoBtn');
  await page.waitForSelector('#impMapSummary', { timeout: 20000 });
  await page.click('button.imp-go');
  await page.waitForSelector('#impRunBtn', { timeout: 20000 });
  await page.click('#impRunBtn');
  await page.waitForSelector('#impResult', { timeout: 60000 });

  const r = await page.evaluate(async () => {
    show('contacts', null);
    await new Promise((res) => setTimeout(res, 120));
    const csv = bwContactsToCsv();                 // no ids: the current view, all 30
    const rows = bwCsvParse(csv);
    const map = bwCsvAutoMap(rows[0]);
    const rep = bwCsvMapReport(rows[0], map);
    const plan = bwCsvPlan(rows, map, {});
    // Re-planned against a database that still holds the originals, so every row must come
    // back as a duplicate of itself — which is the strongest statement that the identity
    // fields survived the trip.
    const one = plan.rows.find((e) => e.party.family === 'Aristide');
    const notDup = plan.rows.filter((e) => !e.dupOf).map((e) => e.name);
    return {
      header: rows[0], rowCount: rows.length - 1, skipped: rep.skipped,
      dupes: plan.counts.dupes, notDup, dropped: plan.dropped, one: one && one.party,
      oneNote: one && one.note, oneTask: one && one.taskSummary, oneDue: one && one.taskDue,
    };
  });
  ok('the export writes one row per contact in the view', r.rowCount === DEMO_CREATED, r.rowCount);
  ok('only the four derived / identity columns are unrecognised on the way back in',
    same(r.skipped, ['Open To-Dos', 'Last Activity', 'Created', 'Contact ID']), r.skipped);
  ok('nothing in the export is a value the importer cannot understand', r.dropped.length === 0, r.dropped);
  ok('every exported row that HAS a contact method comes back as a duplicate of itself',
    r.dupes === DEMO_CREATED - 1, r.dupes);
  // And the one that does not is the row with neither email nor phone — there is nothing to
  // match it ON. Worth asserting rather than rounding off: it is the single case where a
  // re-import of our own export would create a second copy, and he should know which.
  ok('the only row that cannot be matched is the contact with no email and no phone',
    same(r.notDup, ['Cassius Bramblewood']), r.notDup);
  ok('names, classification and flags survive the round trip',
    r.one.given === 'Delphine' && r.one.source === 'walk-in' && r.one.status === 'working'
    && r.one.category === 'pre-need-cemetery' && same(r.one.flags, ['veteran']), r.one);
  ok('so do the address, the salutation and the phone',
    r.one.addresses.a1.city === 'Burien' && r.one.addresses.a1.postal === '98166'
    && r.one.salutation === 'Dear Del,' && r.one.phones.p1.value === '2065550101', r.one);
  ok('the note comes back as a note', /veterans section, wants two spaces/.test(r.oneNote || ''), r.oneNote);
  ok('and the next action comes back as a summary AND a date, still two things',
    r.oneTask === 'Call back about the veterans section' && r.oneDue === '2026-06-18',
    { s: r.oneTask, d: r.oneDue });
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

await browser.close();

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n11. data/demo-contacts.csv is synthetic, and provably so');
{
  const lines = DEMO.split('\r\n').filter((l) => l !== '');
  ok('the file uses CRLF, as Excel writes it', DEMO.indexOf('\r\n') > -1);
  ok('one header row plus ' + DEMO_ROWS + ' data rows', lines.length === DEMO_ROWS + 1, lines.length);
  ok('there is no BOM on it', DEMO.charCodeAt(0) !== 0xFEFF);

  const emails = DEMO.match(/[\w.+-]+@[\w.-]+/g) || [];
  ok('every email address is @example.com — ' + emails.length + ' of them',
    emails.length > 0 && emails.every((e) => e.toLowerCase().endsWith('@example.com')),
    emails.filter((e) => !e.toLowerCase().endsWith('@example.com')));

  // Every phone-shaped run of digits must sit in the reserved fictional (206) 555-01xx block.
  const phones = DEMO.match(/\(?\d{3}\)?[ .-]?\d{3}-\d{4}|\b\d{3}-\d{4}\b/g) || [];
  const badPhones = phones.filter((p) => !/^(\(206\) |206[ .-]?)?555-01\d\d$/.test(p.trim()));
  ok('every phone number is in the reserved (206) 555-01xx range — ' + phones.length + ' of them',
    phones.length >= 28 && badPhones.length === 0, badPhones);

  // The parser's exercise in the real file, not only in unit fixtures.
  ok('at least one field carries a comma inside quotes', /"[^"]*,[^"]*"/.test(DEMO));
  ok('at least one field carries an apostrophe', /'/.test(DEMO));

  // The duplicate is deliberate. Two IDENTICAL lines would be the copy-paste defect this
  // project has been bitten by; this asserts these two rows differ in everything but the email.
  const rows = lines.slice(1).map((l) => l.split(','));
  ok('no two data lines are byte-identical', new Set(lines.slice(1)).size === DEMO_ROWS, DEMO_ROWS - new Set(lines.slice(1)).size);
  const wick = lines.slice(1).filter((l) => l.indexOf('barnaby.wickersham@example.com') > -1);
  ok('exactly two rows share the duplicate email', wick.length === 2, wick.length);
  ok('and they differ in name and phone — a re-entry, not a copied line',
    wick[0] !== wick[1] && /^Barnaby,/.test(wick[0]) && /^Barnabas,/.test(wick[1]), wick);

  // The future-dated follow-ups are what keep view "followup" at exactly 6. If one of them
  // ages into the past this says so by name rather than failing somewhere else.
  //
  // Read out of the next_action_date COLUMN, not by scanning the whole file for anything that
  // looks like a date: sprint-05 added property_purchased_on, and a whole-file scan would count
  // a 2011 deed date as an overdue follow-up and fail this for the wrong reason.
  const cellsOf = (line) => {
    const out = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === ',') { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur); return out;
  };
  const head = cellsOf(lines[0]);
  const naCol = head.indexOf('next_action_date');
  ok('the demo file still has a next_action_date column', naCol > -1, head);
  const dates = lines.slice(1).map((l) => cellsOf(l)[naCol]).filter((v) => /^\d{4}-\d\d-\d\d$/.test(v || ''));
  const today = (() => { const d = new Date(), p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); })();
  const past = dates.filter((d) => d <= today), future = dates.filter((d) => d > today);
  ok('six next-action dates are in the past — the Needs-follow-up count', past.length === VIEWS.followup, past);
  ok('and two are still in the future; if this fails the demo file has aged and the expected '
    + 'followup count must be recomputed', future.length === 2, { future, today });

  // ── the cross-check against the map's real burial records ─────────────────────────
  //
  // COUNTS ONLY. No name out of wmp-cemetery-map/ is printed here, and none may ever appear
  // in a report (DESIGN §6) — the assertion below prints only OUR invented names and a count.
  //
  // SURNAMES are the check that means something. A cemetery of 79,000 positions contains most
  // common given names, so "no first name of ours occurs there" is neither achievable nor
  // informative; a surname is what identifies a family. Asserted: not one of the thirty
  // invented surnames occurs ANYWHERE in the map's data, as a substring, in any file. Four
  // candidates were rejected and replaced during this track for exactly this reason.
  //
  // A second, tighter check follows it: no (first, last) pair of ours occurs close together
  // in any map file, which is what an actual person's record would look like.
  const mapDir = 'wmp-cemetery-map';
  if (!fs.existsSync(mapDir)) {
    console.log('  NOTE  wmp-cemetery-map/ is not present in this tree — the map cross-check '
      + 'DID NOT RUN. It is gitignored and local-only, so this is expected off Martice\'s machine.');
  } else {
    const files = [];
    const walk = (d, depth) => {
      if (depth > 4 || !fs.existsSync(d)) return;
      for (const f of fs.readdirSync(d, { withFileTypes: true })) {
        if (f.name === 'node_modules' || f.name === '.git') continue;
        const p = path.join(d, f.name);
        if (f.isDirectory()) walk(p, depth + 1);
        else if (/\.(json|geojson)$/.test(f.name)) files.push(p);
      }
    };
    walk(path.join(mapDir, 'data'), 0);
    const pairs = rows.map((r) => [String(r[0] || '').toUpperCase(), String(r[1] || '').toUpperCase()])
      .filter((p) => p[1]);
    const lasts = [...new Set(pairs.map((p) => p[1]))];
    const badLast = [], badPair = [];
    for (const f of files) {
      let text;
      try { text = fs.readFileSync(f, 'utf8').toUpperCase(); } catch { continue; }
      for (const n of lasts) if (text.indexOf(n) > -1 && badLast.indexOf(n) === -1) badLast.push(n);
      for (const [first, last] of pairs) {
        if (!first) continue;
        let i = text.indexOf(first);
        while (i > -1) {
          if (text.slice(Math.max(0, i - 120), i + 120).indexOf(last) > -1) {
            if (badPair.indexOf(first + ' ' + last) === -1) badPair.push(first + ' ' + last);
            break;
          }
          i = text.indexOf(first, i + 1);
        }
      }
    }
    ok('not one of the ' + lasts.length + ' invented surnames occurs anywhere in the map data ('
      + files.length + ' files scanned)', badLast.length === 0, badLast);
    ok('and no invented first+last pair occurs together in any map record',
      badPair.length === 0, badPair);
  }
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
