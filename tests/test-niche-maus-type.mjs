// Sprint-19 operator round (Track F). Two operator requests, one suite:
//
//   1. The fixed summary panel lists EVERY line item on the quote. It used to show three
//      rows and "+ N more items"; a counselor reads this panel aloud, so a hidden item is
//      a surprise at signing. The list scrolls inside itself — the total block above and
//      the Download button below must stay on screen however long the quote gets.
//
//   2. qNicheName / qMausName decide which arrangement row is offered. The load-bearing
//      half is the UNCHECK: cemUpdate() prices the checkbox, not the row, so a checkbox
//      left ticked behind a hidden row bills the family for a line nobody can see.
//
// Bundle arithmetic used below (BW_FEES, all non-taxable except the inscriptions):
//   glass   = RECORDING 235 + OC:niche_inurnment 875              = 1110
//   granite = glass + INSCRIPTION 660 (taxable)
//   indoor  = RECORDING 235 + OC:mausoleum_entombment 1205 + MONOBAR 1445 + install 225
//   outdoor = RECORDING 235 + OC:mausoleum_entombment 1205 + INSCRIPTION 660 (taxable)
//
// Fake Firebase only — production is never contacted, and nothing here writes.
import { chromium } from 'playwright';
import fs from 'fs';
import { BASE } from './_base.mjs';
const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };

// The operator's classification table, 2026-08-06. Duplicated here on purpose: a test that
// imported the map from the app could not catch the map being wrong.
const NICHE = [
  ['Crystal Niches', 'glass'],
  ['Court of Honor Niches', 'granite'],
  ['Eternal Light Columbarium (New)', 'glass'],
  ['Eternal Light Niches', 'glass'],
  ['Garden Court Niches', 'granite'],
  ['Terrace Garden Niches', 'granite'],
  ['Garden of Gethsemane Niches', 'granite'],
  ['Garden of Meditation Niches', 'granite'],
  ['Mountain View Columbarium (Inside)', 'glass'],
  ['Mountain View Columbarium (Outside)', 'granite'],
  ['Mountain View Columbarium (New)', 'glass'],
  ['Radiance Wall – Chapel of Memories', 'glass'],
  ['Rock of Ages Columbarium', 'granite'],
  ['Serenity Wall – Chapel of Memories', 'glass'],
  ['__custom__', 'both'],
  ['', 'both'],
];
const MAUS = [
  ['Chapel of Memories', 'indoor'],
  ['Eternal Light Mausoleum', 'indoor'],
  ['Garden Court Mausoleum', 'outdoor'],
  ['Terrace Garden Mausoleum', 'outdoor'],
  ['__custom__', 'both'],
  ['', 'both'],
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 800 } });
await ctx.route(/gstatic\.com\/firebasejs/, r => r.abort());
const page = await ctx.newPage();
const errs = [], cemErrs = [];
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
page.on('console', m => {
  if (m.type() !== 'error') return;
  const t = m.text();
  if (/Failed to load resource/.test(t)) return;
  if (/cemUpdate error/.test(t)) cemErrs.push(t.slice(0, 200));
  errs.push(t.slice(0, 200));
});
await page.addInitScript(FAKE);
await page.addInitScript(`window.__fake.addAccount('t@bwquote.local','pw');`);
await page.goto(BASE, { waitUntil: 'load', timeout: 120000 });
await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('t@bwquote.local', 'pw'));
await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
await page.evaluate(() => { location.hash = '#cem-quote'; });
await page.waitForTimeout(500);

// Sets the location with BOTH arrangement checkboxes already ticked — the state that used
// to leak an invisible charge — then recalculates and reports what survived.
const probeNiche = (name) => page.evaluate((nm) => {
  document.getElementById('qNichePrice').value = '2000';
  document.getElementById('qNicheQty').value = '1';
  document.getElementById('qNicheName').value = nm;
  document.getElementById('qNicheGlass').checked = true;
  document.getElementById('qNicheGranite').checked = true;
  cemUpdate();
  const vis = (id) => getComputedStyle(document.getElementById(id)).display !== 'none';
  const lbls = _cemLines.map(l => l.label);
  return {
    glassRow: vis('qNicheGlassRow'), graniteRow: vis('qNicheGraniteRow'),
    glassChk: document.getElementById('qNicheGlass').checked,
    graniteChk: document.getElementById('qNicheGranite').checked,
    recordingLines: lbls.filter(l => /^Recording Fee – Inurnment/.test(l)).length,
    shutter: lbls.some(l => /^Shutter Inscription/.test(l)),
    total: _cemTotal,
  };
}, name);

const probeMaus = (name) => page.evaluate((nm) => {
  document.getElementById('qMausPrice').value = '5000';
  document.getElementById('qMausQty').value = '1';
  document.getElementById('qMausName').value = nm;
  document.getElementById('qMausIndoor').checked = true;
  document.getElementById('qMausOutdoor').checked = true;
  cemUpdate();
  const vis = (id) => getComputedStyle(document.getElementById(id)).display !== 'none';
  const lbls = _cemLines.map(l => l.label);
  return {
    indoorRow: vis('qMausIndoorRow'), outdoorRow: vis('qMausOutdoorRow'),
    indoorChk: document.getElementById('qMausIndoor').checked,
    outdoorChk: document.getElementById('qMausOutdoor').checked,
    recordingLines: lbls.filter(l => /^Recording Fee – Entombment/.test(l)).length,
    monobar: lbls.some(l => /^Monobar Court/.test(l)),
    mausInsc: lbls.some(l => /^Mausoleum\/Columbarium Inscription/.test(l)),
    total: _cemTotal,
  };
}, name);

// ── 1. Niche: the columbarium decides the front ───────────────────────────────
console.log('\n1. qNicheName resolves glass / granite (operator table 2026-08-06)');
for (const [name, want] of NICHE) {
  const r = await probeNiche(name);
  const label = name === '' ? '(nothing selected)' : name;
  if (want === 'both') {
    ok(label + ' → both rows offered, nothing force-unchecked',
      r.glassRow && r.graniteRow && r.glassChk && r.graniteChk, r);
  } else {
    const wantGlass = want === 'glass';
    ok(label + ' → only the ' + want + ' row shows',
      r.glassRow === wantGlass && r.graniteRow === !wantGlass, r);
    ok(label + ' → the hidden row\'s checkbox was unchecked',
      r.glassChk === wantGlass && r.graniteChk === !wantGlass, r);
    // one bundle priced, not two: the Recording line appears exactly once
    ok(label + ' → exactly one arrangement bundle is priced',
      r.recordingLines === 1 && r.shutter === !wantGlass, r);
  }
}

// ── 2. Mausoleum: indoor / outdoor ────────────────────────────────────────────
console.log('\n2. qMausName resolves indoor / outdoor');
await page.evaluate(() => { document.getElementById('qNichePrice').value = '0'; cemUpdate(); });
for (const [name, want] of MAUS) {
  const r = await probeMaus(name);
  const label = name === '' ? '(nothing selected)' : name;
  if (want === 'both') {
    ok(label + ' → both rows offered, nothing force-unchecked',
      r.indoorRow && r.outdoorRow && r.indoorChk && r.outdoorChk, r);
  } else {
    const wantIndoor = want === 'indoor';
    ok(label + ' → only the ' + want + ' row shows',
      r.indoorRow === wantIndoor && r.outdoorRow === !wantIndoor, r);
    ok(label + ' → the hidden row\'s checkbox was unchecked',
      r.indoorChk === wantIndoor && r.outdoorChk === !wantIndoor, r);
    ok(label + ' → exactly one arrangement bundle is priced',
      r.recordingLines === 1 && r.monobar === wantIndoor && r.mausInsc === !wantIndoor, r);
  }
}

// ── 3. The hidden row's charge actually leaves the total ──────────────────────
console.log('\n3. Hiding a row removes its money, it does not merely hide it');
{
  await page.evaluate(() => { document.getElementById('qMausPrice').value = '0'; cemUpdate(); });
  // Custom / Other is untyped: both rows, both bundles priced. That is the baseline.
  const both = await probeNiche('__custom__');
  // Court of Honor is granite-only: the glass bundle must vanish from the total.
  const granite = await probeNiche('Court of Honor Niches');
  ok('an untyped location really does price both bundles', both.recordingLines === 2, both);
  ok('switching to a granite-only wall drops the glass bundle from the total',
    Math.round((both.total - granite.total) * 100) / 100 === 1110,
    { both: both.total, granite: granite.total, delta: both.total - granite.total });
  ok('and no Glass line survives in _cemLines', granite.recordingLines === 1, granite);
  // the DOM display for the hidden row is zeroed too, so nothing stale is readable
  const disp = await page.evaluate(() => document.getElementById('qNicheGlassDisp').textContent);
  ok('the hidden glass row shows no stale amount', disp === '—' || /^\$?0/.test(disp.replace(/[$,]/g, '')), disp);
}

// ── 3b. A quote saved before the MVC split still loads ────────────────────────
// Operator amendment 2026-08-06: "Mountain View Columbarium" became (Inside)=glass and
// (Outside)=granite. Quotes saved before that hold the old ambiguous string. It must not
// blank the field or throw, and — since the old record does not say which front was sold —
// it must leave BOTH rows on offer rather than guess one.
console.log('\n3b. Legacy "Mountain View Columbarium" value still loads');
{
  const r = await page.evaluate(() => {
    resetCemQuote();
    // exactly what loading a saved quote does with the stored field bag
    restoreFieldState({
      qNicheName: 'Mountain View Columbarium',
      qNichePrice: '4200', qNicheQty: '1',
      qNicheGlass: false, qNicheGranite: false,
    });
    cemUpdate();
    const sel = document.getElementById('qNicheName');
    const vis = (id) => getComputedStyle(document.getElementById(id)).display !== 'none';
    return {
      value: sel.value,
      selectedIndex: sel.selectedIndex,
      retiredOpts: sel.querySelectorAll('option.' + BW_RETIRED_OPT_CLASS).length,
      liveOption: !!sel.querySelector('option[value="Mountain View Columbarium"]:not(.' + BW_RETIRED_OPT_CLASS + ')'),
      inside: !!sel.querySelector('option[value="Mountain View Columbarium (Inside)"]'),
      outside: !!sel.querySelector('option[value="Mountain View Columbarium (Outside)"]'),
      newMvc: !!sel.querySelector('option[value="Mountain View Columbarium (New)"]'),
      glassRow: vis('qNicheGlassRow'), graniteRow: vis('qNicheGraniteRow'),
      glassChk: document.getElementById('qNicheGlass').checked,
      graniteChk: document.getElementById('qNicheGranite').checked,
      nicheLabel: (_cemLines.find(l => l.isNiche) || {}).label,
    };
  });
  ok('the legacy value survives the load — the field is not silently blanked',
    r.value === 'Mountain View Columbarium' && r.selectedIndex !== -1, r);
  ok('it comes back through the existing retired-option path, flagged for re-picking',
    r.retiredOpts === 1 && r.liveOption === false, r);
  ok('the split options are the ones offered for new quotes',
    r.inside && r.outside && r.newMvc, r);
  ok('an ambiguous legacy value offers BOTH fronts rather than guessing one',
    r.glassRow && r.graniteRow, r);
  ok('and nothing is auto-checked on the legacy load', !r.glassChk && !r.graniteChk, r);
  ok('the quoted niche line still reads exactly as it was saved',
    /^Mountain View Columbarium/.test(r.nicheLabel || '') && !/\((Inside|Outside)\)/.test(r.nicheLabel || ''), r);
}

// ── 4. resetCemQuote puts both rows back ──────────────────────────────────────
console.log('\n4. Reset restores both arrangement rows');
{
  const r = await page.evaluate(() => {
    resetCemQuote();
    const st = (id) => document.getElementById(id).style.display;
    return { g: st('qNicheGlassRow'), gr: st('qNicheGraniteRow'), i: st('qMausIndoorRow'), o: st('qMausOutdoorRow') };
  });
  ok('reset clears the inline display on all four arrangement rows',
    r.g === '' && r.gr === '' && r.i === '' && r.o === '', r);
}

// ── 5. The summary panel lists EVERY item ─────────────────────────────────────
console.log('\n5. Fixed summary panel: all line items, no "+ N more"');
const MANY = [];
for (let i = 1; i <= 9; i++) MANY.push({ label: 'Exempt service ' + i, amount: 100 + i, taxable: false });
for (let i = 1; i <= 5; i++) MANY.push({ label: 'Taxable merchandise item number ' + i + ' with a long label', amount: 200 + i, taxable: true });
// 14 items, and one discount + one tax line that must NOT appear as items
MANY.push({ label: 'Pre-Need Discount', amount: -50, isDiscount: true, taxableDiscount: false });

{
  const r = await page.evaluate((lines) => {
    _cemLines = lines;
    _cemTotal = renderSummary('cemSummary', _cemLines, 0, '', '');
    _fhLines = lines.slice(0, 12);
    _fhTotal = renderSummary('fhSummary', _fhLines, 0, '', '');
    const body = document.getElementById('cemSummary');
    return {
      itemsBox: !!body.querySelector('.s-items'),
      rows: body.querySelectorAll('.s-items .s-prev').length,
      more: document.querySelectorAll('.s-prev-more').length,
      first: body.querySelector('.s-items .s-prev .s-prev-lbl').textContent,
      last: [...body.querySelectorAll('.s-items .s-prev .s-prev-lbl')].pop().textContent,
      hasDiscountRow: /Pre-Need Discount/.test(body.querySelector('.s-items').innerText),
      hint: !!document.getElementById('estPaymentHint'),
      fhRows: document.getElementById('fhSummary').querySelectorAll('.s-items .s-prev').length,
    };
  }, MANY);
  ok('the item list is wrapped in a scrollable .s-items box', r.itemsBox, r);
  ok('cemetery panel renders all 14 items, not 3', r.rows === 14, r);
  ok('the "+ N more items" line is gone from the app entirely', r.more === 0, r);
  ok('the last item is really rendered, not truncated away', /number 5/.test(r.last), r);
  ok('the first row is an exempt service (exempt lines lead)', /Exempt service 1/.test(r.first), r);
  ok('discount lines are still excluded from the item list', r.hasDiscountRow === false, r);
  ok('the Est. payment hint still renders below the list', r.hint, r);
  ok('funeral-home panel lists all 12 of its items', r.fhRows === 12, r);
}

// ── 6. Combined panel lists every item from both surfaces ─────────────────────
console.log('\n6. Combined panel lists cem + fh items');
{
  const r = await page.evaluate(() => {
    _combCemLines = _cemLines.slice(); _combCemTotal = _cemTotal;
    _combFhLines = _fhLines.slice();   _combFhTotal = _fhTotal;
    combUpdate();
    const body = document.getElementById('combSummary');
    const want = _combCemLines.filter(l => !l.isDiscount && !l.isTax).length
               + _combFhLines.filter(l => !l.isDiscount && !l.isTax).length;
    return { rows: body.querySelectorAll('.s-items .s-prev').length, want: want };
  });
  ok('combined panel renders every item from both surfaces', r.rows === r.want && r.want >= 26, r);
}

// ── 7. Geometry: the scroll is INSIDE the list, the chrome stays on screen ─────
console.log('\n7. Panel geometry: total block and actions stay visible');
{
  const g = await page.evaluate(() => {
    const fixed = document.querySelector('.summary-fixed[data-for="section-cem-quote"]');
    const panel = fixed.querySelector('.summary-panel');
    const items = document.querySelector('#cemSummary .s-items');
    const tot = document.getElementById('cemSummaryTotal');
    const btns = panel.querySelectorAll('.summary-actions .btn');
    const last = btns[btns.length - 1];
    const pr = panel.getBoundingClientRect();
    return {
      visible: fixed.classList.contains('visible'),
      width: Math.round(fixed.getBoundingClientRect().width),
      pad: getComputedStyle(document.getElementById('section-cem-quote')).paddingRight,
      scrolls: items.scrollHeight > items.clientHeight + 1,
      docScroll: document.documentElement.scrollHeight <= document.documentElement.clientHeight + 1,
      totBottom: tot.getBoundingClientRect().bottom,
      lastBtnBottom: last.getBoundingClientRect().bottom,
      panelBottom: pr.bottom,
      panelRight: Math.round(pr.right),
      vh: window.innerHeight,
      // s23: long labels no longer ellipse on ONE line — they wrap to at most two and the
      // untruncated text moves to the row's title attribute. Same intent as the s19 assert
      // this replaces (a long label must stay inside the 260px panel, never spill it); the
      // surface it is measured on changed, so the probe changed with it.
      lblClamp: getComputedStyle(document.querySelector('#cemSummary .s-prev-lbl')).webkitLineClamp,
      lblOverflow: getComputedStyle(document.querySelector('#cemSummary .s-prev-lbl')).overflow,
      widestRow: Math.max(...[...document.querySelectorAll('#cemSummary .s-prev')]
        .map(e => Math.round(e.getBoundingClientRect().right))),
      rowsWithTitle: document.querySelectorAll('#cemSummary .s-prev[title]').length,
      rowCount: document.querySelectorAll('#cemSummary .s-prev').length,
    };
  });
  ok('the panel is visible on the cemetery builder', g.visible, g);
  ok('geometry unchanged: 260px panel, 292px content clearance', g.width === 260 && g.pad === '292px', g);
  ok('a 14-item list overflows and scrolls INSIDE .s-items', g.scrolls, g);
  ok('the total figure is on screen with the list scrolled full', g.totBottom > 0 && g.totBottom < g.vh, g);
  ok('the last action button is on screen too', g.lastBtnBottom > 0 && g.lastBtnBottom <= g.vh, g);
  ok('the whole panel fits the viewport', g.panelBottom <= g.vh, g);
  ok('long labels are clamped to two lines, not left to run', g.lblClamp === '2' && g.lblOverflow === 'hidden', g);
  ok('and no row spills past the panel edge', g.widestRow <= g.panelRight, g);
  ok('every row carries its full label on the title attribute', g.rowCount > 0 && g.rowsWithTitle === g.rowCount, g);
}

ok('cemUpdate never threw into its catch', cemErrs.length === 0, cemErrs);
ok('no page errors', errs.length === 0, errs);
console.log('\n' + pass + ' passed, ' + fail + ' failed');
await browser.close();
process.exit(fail ? 1 : 0);
