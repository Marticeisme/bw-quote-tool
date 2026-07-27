// Sprint-05 Track A — what a family already owns.
//
// The bug this covers: the tool could not represent property, so every existing owner rendered
// as "Nothing on file yet — this contact is a prospect." All thirty imported demo contacts said
// that. It is not missing data; it is confidently wrong in the direction that loses business.
//
// NOTHING HERE TOUCHES PRODUCTION. Every context installs tests/fake-firebase.js before any page
// script runs and aborts the gstatic firebasejs request, so `_fbDB` is an in-memory tree.
//
// House rules this suite obeys:
//   · no assertion reads a value from the same constant the code reads — the 57 section codes
//     and the 4 unclassified ones are HAND-WRITTEN here, from MIS's export, and every
//     classification claim is read back out of RENDERED DOM,
//   · every capacity expectation is hand-computed in a comment beside it,
//   · fixtures are synthetic by rule, and every fixture POSITION is checked against the real
//     interment list in section 6 exactly as the demo file's positions are.
import { chromium } from 'playwright';
import { execFileSync } from 'child_process';
import fs from 'fs';

const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
const DEMO_PATH = 'data/demo-contacts.csv';
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const UID = 'uid_tester@bwquote.local';

// ─────────────────────────────────────────────────────────────────────────────────────
// THE 57 SECTION CODES, hand-written from MIS's lot-inquiry export (every row LocationCode
// = WMP). This list is the expectation; index.html's BW_SECTION_TYPES is what is under test,
// and the two are never read from one another.
const CODES_NUMERIC = ['06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17',
                       '18', '19', '20', '21', '23'];
const CODES_LETTERED = ['17S', 'CC', 'CN', 'COH', 'COM', 'ECL', 'ELBW', 'ELM', 'ELN', 'GCM',
  'GCN', 'GGBE', 'GOG', 'GOLN', 'GOM', 'GOVN', 'LCG', 'LCGB', 'LGP', 'LUG', 'LUGB', 'MVC',
  'RAD', 'RGBE', 'RH', 'RHB', 'ROA', 'ROAC', 'RUG', 'SCER', 'SCGF', 'SCTG', 'SER', 'SHOW21',
  'TGM', 'VCUG', 'VERSES', 'VETS', 'VETSM', 'VETSN'];
const CODES = CODES_NUMERIC.concat(CODES_LETTERED);

// Codes present in MIS, absent from the map's data, and named by no product list in the tool.
// They render as the raw code rather than as a guess. Each needs one sentence from Martice.
const UNCLASSIFIED = ['CC', 'ELBW', 'GOVN', 'RGBE'];

// The kind labels a pill may carry. 'unknown' has no label, which is why it has no pill.
const KIND_LABELS = ['Burial plot', 'Crypt', 'Niche', 'Urn garden', 'Scattering', 'Veteran plot',
                     'Memorial boulder', 'Mixed'];

// Positions used by THIS suite's fixtures. Checked against the real interment list in section 6
// alongside the demo file's, for exactly the same reason: a committed fixture must not assert
// that an invented person owns a grave a real person is buried in.
const FIXTURE_POSITIONS = [
  ['12', 'A', '5'], ['13', 'A', '19'], ['ECL', 'A', '4'], ['LUG', 'B', '13'], ['COH', 'A', '5'],
  ['TGM', 'A', '1'], ['GOLN', '', '6'], ['SCTG', '', '2'], ['RAD', 'A', '3'], ['ELN', 'G', '9'],
  ['08', 'C', '10'],
];

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
  await page.goto('http://localhost:3737/' + (hash || ''), { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('tester@bwquote.local', 'pw'));
  await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
  await page.waitForTimeout(200);
  return { ctx, page, errs };
}

const browser = await chromium.launch();

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n1. All 57 section codes classify, or say plainly that they do not');
{
  const { ctx, page, errs } = await open(browser, '');
  // One contact, 57 property records, one render. Every claim below comes off the DOM.
  const r = await page.evaluate(async (CODES) => {
    const p = await saveParty({ given: 'Section', family: 'Probe' });
    for (const c of CODES) {
      await saveContactProperty({ partyId: p.id, sectionCode: c, spacesOwned: 1, intermentsUsed: 0 });
    }
    show('contacts', null);
    openContactDetail(p.id);
    await new Promise((x) => setTimeout(x, 250));
    const rows = [...document.querySelectorAll('#ctProperty .ct-prop')].map((el) => ({
      title: el.querySelector('.ct-prop-loc').textContent.trim(),
      pill: el.querySelector('.ct-pill') ? el.querySelector('.ct-pill').textContent.trim() : '',
    }));
    return { rows, n: rows.length };
  }, CODES);

  ok('a property record renders for every one of the 57 codes', r.n === CODES.length, r.n);

  // The label a code renders under. The locator is "<label> · Space …" when a space is set and
  // just the label otherwise; these fixtures set no space, so the title IS the label.
  const byLabel = {};
  r.rows.forEach((x) => { byLabel[x.title] = x.pill; });
  const labels = r.rows.map((x) => x.title);

  ok('not one of them renders blank', labels.every((l) => l.length > 0),
    labels.filter((l) => !l.length).length);

  // Every unclassified code renders as ITS OWN CODE and carries no type pill — the honest gap.
  const rawShown = UNCLASSIFIED.filter((c) => labels.indexOf(c) > -1);
  ok('the ' + UNCLASSIFIED.length + ' unclassified codes render as the raw code: '
    + UNCLASSIFIED.join(', '), same(rawShown, UNCLASSIFIED), { rawShown, labels });
  ok('…and carry no type pill, rather than a guessed one',
    UNCLASSIFIED.every((c) => byLabel[c] === ''), UNCLASSIFIED.map((c) => c + '=' + byLabel[c]));

  // Every OTHER code renders under a name, with a pill from the fixed vocabulary.
  const classified = r.rows.filter((x) => UNCLASSIFIED.indexOf(x.title) === -1);
  ok('the other ' + (CODES.length - UNCLASSIFIED.length) + ' render under a name, not their code',
    classified.length === CODES.length - UNCLASSIFIED.length
    && classified.every((x) => CODES.indexOf(x.title) === -1),
    classified.filter((x) => CODES.indexOf(x.title) > -1).map((x) => x.title));
  ok('every one of those carries a type pill from the agreed vocabulary',
    classified.every((x) => KIND_LABELS.indexOf(x.pill) > -1),
    [...new Set(classified.map((x) => x.pill))].filter((k) => KIND_LABELS.indexOf(k) === -1));

  // The kinds that must actually be represented — a table where everything came out "Burial
  // plot" would pass every assertion above.
  const kinds = [...new Set(classified.map((x) => x.pill))].sort();
  ok('and at least six distinct kinds are in use across the 57',
    kinds.length >= 6, kinds);
  ['Burial plot', 'Crypt', 'Niche', 'Urn garden', 'Scattering', 'Veteran plot'].forEach((k) => {
    ok('kind "' + k + '" is used by at least one section', kinds.indexOf(k) > -1, kinds);
  });

  // The two settled specifics, read off the DOM.
  ok('ROA and ROAC are SEPARATE entries with different labels',
    labels.indexOf('Rock of Ages Columbarium') > -1
    && labels.indexOf('Rock of Ages courtyard niches') > -1, labels.filter((l) => /Rock of Ages/.test(l)));
  ok('COM is recorded as holding BOTH products rather than guessing one',
    byLabel['Chapel of Memories Mausoleum'] === 'Mixed', byLabel['Chapel of Memories Mausoleum']);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n2. A code we have never heard of renders as itself, and never blank');
{
  const { ctx, page, errs } = await open(browser, '');
  const r = await page.evaluate(async () => {
    const p = await saveParty({ given: 'Unknown', family: 'Codes' });
    await saveContactProperty({ partyId: p.id, sectionCode: 'ZQ9', lotAlpha: 'B', space: '4', spacesOwned: 1 });
    await saveContactProperty({ partyId: p.id, sectionCode: ' mvc ', lotAlpha: 'f', space: '13', spacesOwned: 1 });
    show('contacts', null);
    openContactDetail(p.id);
    await new Promise((x) => setTimeout(x, 200));
    return {
      titles: [...document.querySelectorAll('#ctProperty .ct-prop-loc')].map((e) => e.textContent.trim()),
      text: document.getElementById('contactDetail').textContent.replace(/\s+/g, ' '),
      stored: Object.keys(window.__fake.get('contactProperty') || {}).map((k) => window.__fake.get('contactProperty/' + k).sectionCode).sort(),
    };
  });
  ok('an unrecognised code renders as the code itself, with its position',
    r.titles.indexOf('ZQ9 · Row B · Space 4') > -1, r.titles);
  ok('…and never as an empty label', r.titles.every((t) => t.length > 0), r.titles);
  ok('a code arrives with whitespace and lower case and still resolves',
    r.titles.indexOf('Mountain View Columbarium · Tier F · Space 13') > -1, r.titles);
  ok('the LETTER is called a tier in a wall and a row on a lawn',
    /Tier F/.test(r.titles.join('|')) && /Row B/.test(r.titles.join('|')), r.titles);
  ok('the stored code is normalised, so two spellings cannot become two sections',
    same(r.stored, ['MVC', 'ZQ9']), r.stored);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n3. The qualifying line — Owns N · M interred · K available');
{
  const { ctx, page, errs } = await open(browser, '');
  // Hand-computed, one per capacity rule:
  //   a  Garden 12, grave, capacity 1: 4 owned x 1 = 4 rights, 2 used -> 2 available
  //   b  Garden 20, grave, capacity 1: 1 owned x 1 = 1 right,  1 used -> 0 available
  //   c  ECL, niche, capacity 2:       2 owned x 2 = 4 rights, 2 used -> 2 available
  //   d  LUG, urn garden, capacity 1:  3 owned x 1 = 3 rights, 1 used -> 2 available
  //   e  COH, niche BUT capacity 1:    2 owned x 1 = 2 rights, 2 used -> 0 available
  //   f  TGM, crypt, capacity unknown: nothing may be claimed about what is available
  //   g  SCTG, scattering, unknown:    same
  //   h  RAD, niche, record overrides capacity to 1: 2 owned -> 1 available after 1 use
  //   i  ELN, niche, more used than owned: never a negative number
  const r = await page.evaluate(async () => {
    const p = await saveParty({ given: 'Capacity', family: 'Probe' });
    const mk = (o) => saveContactProperty(Object.assign({ partyId: p.id }, o));
    await mk({ sectionCode: '12',   lotAlpha: 'A', space: '5',  spacesOwned: 4, intermentsUsed: 2 });
    await mk({ sectionCode: '20',   lotAlpha: 'A', space: '5',  spacesOwned: 1, intermentsUsed: 1 });
    await mk({ sectionCode: 'ECL',  lotAlpha: 'A', space: '4',  spacesOwned: 2, intermentsUsed: 2 });
    await mk({ sectionCode: 'LUG',  lotAlpha: 'B', space: '13', spacesOwned: 3, intermentsUsed: 1 });
    await mk({ sectionCode: 'COH',  lotAlpha: 'A', space: '5',  spacesOwned: 2, intermentsUsed: 2 });
    await mk({ sectionCode: 'TGM',  lotAlpha: 'A', space: '1',  spacesOwned: 2, intermentsUsed: 1 });
    await mk({ sectionCode: 'SCTG', space: '2', spacesOwned: 1, intermentsUsed: 1 });
    await mk({ sectionCode: 'RAD',  lotAlpha: 'A', space: '3',  spacesOwned: 2, intermentsUsed: 1, capacity: 1 });
    await mk({ sectionCode: 'ELN',  lotAlpha: 'G', space: '9',  spacesOwned: 1, intermentsUsed: 5 });
    show('contacts', null);
    openContactDetail(p.id);
    await new Promise((x) => setTimeout(x, 250));
    const out = {};
    [...document.querySelectorAll('#ctProperty .ct-prop')].forEach((el) => {
      const title = el.querySelector('.ct-prop-loc').textContent.trim();
      out[title.split(' · ')[0]] = el.querySelector('.ct-prop-counts').textContent.replace(/\s+/g, ' ').trim();
    });
    return { out, statuses: Object.keys(window.__fake.get('contactProperty') || {})
      .map((k) => window.__fake.get('contactProperty/' + k))
      .reduce((a, x) => { a[x.sectionCode] = x.status; return a; }, {}) };
  });
  const L = r.out;
  ok('a lawn owner with 4 spaces and 2 interments has 2 available',
    L['Garden 12'] === 'Owns 4 · 2 interred · 2 available', L['Garden 12']);
  ok('the zero-available case says 0, not nothing',
    L['Garden 20'] === 'Owns 1 · 1 interred · 0 available', L['Garden 20']);
  ok('A NICHE HOLDS TWO URNS — 2 niches with 2 urns placed still has 2 available',
    L['Eternal Light Columbarium'] === 'Owns 2 · 2 interred · 2 available · holds 2 per unit',
    L['Eternal Light Columbarium']);
  ok('a Lake Urn Garden space holds ONE urn — 3 owned, 1 used, 2 available',
    L['Lake Urn Garden'] === 'Owns 3 · 1 interred · 2 available', L['Lake Urn Garden']);
  ok('the Court of Honor is the exception at one urn per niche — 2 owned, 2 used, 0 available',
    L['Veterans Court of Honor'] === 'Owns 2 · 2 interred · 0 available', L['Veterans Court of Honor']);
  ok('a crypt claims NOTHING about what is available, because only the unit knows',
    /^Owns 2 · 1 interred · how many are available depends on the unit$/.test(L['Terrace Garden Mausoleum'] || ''),
    L['Terrace Garden Mausoleum']);
  ok('…and neither does a scattering garden',
    /depends on the unit$/.test(L['Terrace Garden Ossuary'] || ''), L['Terrace Garden Ossuary']);
  ok('a record may override its capacity, and the override wins over the section',
    L['Radiance Wall'] === 'Owns 2 · 1 interred · 1 available', L['Radiance Wall']);
  ok('more interments than rights never prints a negative number',
    /· 0 available/.test(L['Eternal Light Niches'] || ''), L['Eternal Light Niches']);
  ok('status is derived from the numbers, so it can never disagree with them',
    r.statuses['12'] === 'partially-used' && r.statuses['20'] === 'fully-used'
    && r.statuses.LUG === 'partially-used' && r.statuses.GOLN === undefined
    && r.statuses.COH === 'fully-used', r.statuses);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n4. "Prospect" is a state, not a default');
{
  const { ctx, page, errs } = await open(browser, '');
  const r = await page.evaluate(async () => {
    const read = async (id) => {
      openContactDetail(id);
      await new Promise((x) => setTimeout(x, 180));
      return document.getElementById('contactDetail').textContent.replace(/\s+/g, ' ');
    };
    const owner = await saveParty({ given: 'Marisol', family: 'Quintero' });
    await saveContactProperty({ partyId: owner.id, sectionCode: 'GOLN', space: '6', spacesOwned: 2, intermentsUsed: 0 });
    const empty = await saveParty({ given: 'Nadia', family: 'Fenwick', interest: 'cemetery' });
    show('contacts', null);
    const a = await read(owner.id);
    const b = await read(empty.id);
    // And the bug in its original shape: property, then a quote arrives, then the quote is
    // unlinked again. The prospect line must not come back while property is on file.
    await saveContractRole({ recordType: 'cem', recordId: 'q7', partyId: owner.id, role: 'purchaser' });
    await new Promise((x) => setTimeout(x, 80));
    const c = await read(owner.id);
    return { a, b, c };
  });
  ok('a contact WITH property is never called a prospect', !/prospect/i.test(r.a), r.a.slice(0, 200));
  ok('…and the property is what the panel leads with',
    /Property owned/.test(r.a) && /Garden of Light Niches/.test(r.a), r.a.slice(0, 260));
  ok('the qualifying line is on screen', /Owns 2 · 0 interred · 4 available/.test(r.a), r.a.slice(0, 300));
  ok('a contact with NO property and NO holdings still says prospect', /prospect/i.test(r.b), r.b.slice(0, 200));
  ok('…and still names what they are interested in', /cemetery/i.test(r.b), r.b.slice(0, 200));
  ok('property and a linked quote coexist — neither hides the other',
    !/prospect/i.test(r.c) && /Property owned/.test(r.c) && /Cemetery/.test(r.c), r.c.slice(0, 260));
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n5. The record survives the next edit of the contact, and every write is one record');
{
  const { ctx, page, errs } = await open(browser, '');
  const r = await page.evaluate(async () => {
    const p = await saveParty({ given: 'Ottoline', family: 'Rasmussen',
      phones: { p1: { value: '2065550188', isPrimary: true } } });
    const rec = await saveContactProperty({ partyId: p.id, sectionCode: '08', lotAlpha: 'C',
      space: '10', spacesOwned: 3, intermentsUsed: 1, deedNumber: 'D-000001' });
    // The failure this exists to catch: saveParty() writes parties/<id> with .set(), which
    // replaces that record wholesale. Anything living inside a party dies here.
    p.phones = { p1: { value: '2065550199', isPrimary: true } };
    await saveParty(p);
    await new Promise((x) => setTimeout(x, 120));
    show('contacts', null);
    openContactDetail(p.id);
    await new Promise((x) => setTimeout(x, 180));
    return {
      id: rec.id,
      stillInDb: !!window.__fake.get('contactProperty/' + rec.id),
      deed: (window.__fake.get('contactProperty/' + rec.id) || {}).deedNumber,
      onScreen: /Garden 08 · Row C · Space 10/.test(document.getElementById('contactDetail').textContent),
      inMemory: bwPropertyFor(p.id).length,
      // A .set() on the COLLECTION node is how this project lost real data twice.
      collectionWrites: window.__fake.log().filter((l) => (l.op === 'set' || l.op === 'update')
        && /^(contactProperty|parties)$/.test(l.path)).length,
      recordWrites: window.__fake.log().filter((l) => l.op === 'set' && /^contactProperty\//.test(l.path)).length,
    };
  });
  ok('the property record survives a subsequent saveParty() on its party', r.stillInDb === true);
  ok('…intact, not merely present', r.deed === 'D-000001', r.deed);
  ok('…and it is still in memory and still on screen', r.inMemory === 1 && r.onScreen === true, r);
  ok('NOT ONE write went to the contactProperty collection node', r.collectionWrites === 0, r.collectionWrites);
  ok('the one property write there was went to contactProperty/<id>', r.recordWrites === 1, r.recordWrites);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n6. The map link — present with a sid, absent without one, never a throw');
{
  const { ctx, page, errs } = await open(browser, '');
  const r = await page.evaluate(async () => {
    const p = await saveParty({ given: 'Wilhelmina', family: 'Okoye' });
    await saveContactProperty({ partyId: p.id, sectionCode: '12', lotAlpha: 'A', space: '5',
      sid: 'DEMO-9', spacesOwned: 1 });
    await saveContactProperty({ partyId: p.id, sectionCode: 'TGM', lotAlpha: 'A', space: '1', spacesOwned: 1 });
    show('contacts', null);
    openContactDetail(p.id);
    await new Promise((x) => setTimeout(x, 200));
    const rows = [...document.querySelectorAll('#ctProperty .ct-prop')].map((el) => ({
      title: el.querySelector('.ct-prop-loc').textContent.trim(),
      href: (el.querySelector('.ct-prop-map') || {}).getAttribute
        ? el.querySelector('.ct-prop-map').getAttribute('href') : '',
      target: (el.querySelector('.ct-prop-map') || {}).getAttribute
        ? el.querySelector('.ct-prop-map').getAttribute('target') : '',
      links: el.querySelectorAll('.ct-prop-map').length,
    }));
    // And the function itself, on the shapes that would otherwise throw.
    let threw = '';
    try {
      bwPropertyMapUrl(null); bwPropertyMapUrl({}); bwPropertyMapUrl({ sid: '' });
      bwPropertyMapUrl({ sid: '   ' }); bwPropertyMapUrl({ sid: 'a b/c?d=e' });
    } catch (e) { threw = e.message; }
    return { rows, threw, weird: bwPropertyMapUrl({ sid: 'a b/c?d=e' }), none: bwPropertyMapUrl({}) };
  });
  const withSid = r.rows.find((x) => /Garden 12/.test(x.title));
  const noSid = r.rows.find((x) => /Terrace/.test(x.title));
  ok('a record with a sid gets exactly one map link', withSid && withSid.links === 1, withSid);
  ok('…pointing at the map app on its own port', /^http:\/\/localhost:8642\/index\.html#space=DEMO-9$/.test((withSid || {}).href || ''), (withSid || {}).href);
  ok('…opened in its own tab, so the tool is never navigated away from',
    (withSid || {}).target === '_blank', (withSid || {}).target);
  ok('a record with NO sid has no link at all — an inert one is worse than none',
    noSid && noSid.links === 0, noSid);
  ok('bwPropertyMapUrl never throws, on null, {}, blank or whitespace', r.threw === '', r.threw);
  ok('…returns "" when there is nothing to link to', r.none === '', r.none);
  ok('…and percent-encodes a sid that would otherwise break the hash',
    r.weird === 'http://localhost:8642/index.html#space=a%20b%2Fc%3Fd%3De', r.weird);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n7. The demo file, end to end through the real import screen');
{
  const { ctx, page, errs } = await open(browser, '#import-contacts');
  await page.click('#impDemoBtn');
  await page.waitForSelector('#impMapSummary', { timeout: 20000 });
  const mapStep = await page.evaluate(() => ({
    cols: document.querySelectorAll('#impBody .imp-tbl tbody tr').length,
    selected: [...document.querySelectorAll('#impBody select[data-col]')].map((s) => s.value),
    summary: document.getElementById('impMapSummary').textContent,
  }));
  ok('the demo file now carries 26 columns and every one auto-maps',
    mapStep.cols === 26 && mapStep.selected.every(Boolean) && /nothing skipped/.test(mapStep.summary),
    { cols: mapStep.cols, blank: mapStep.selected.filter((s) => !s).length });
  ok('the ten property columns land on the ten property fields',
    same(mapStep.selected.slice(16), ['propSection', 'propLot', 'propLotAlpha', 'propSpace',
      'propSid', 'propKind', 'propOwned', 'propUsed', 'propDeed', 'propPurchased']),
    mapStep.selected.slice(16));

  await page.click('button.imp-go');
  await page.waitForSelector('#impRunBtn', { timeout: 20000 });
  const preview = await page.evaluate(() => ({
    also: (document.getElementById('impAlso') || {}).textContent || '',
    dropped: !!document.getElementById('impDropped'),
    counts: [...document.querySelectorAll('#impBody .imp-counts span')].map((s) => s.textContent.trim()),
  }));
  // 20 rows carry property; row 32 is the duplicate and is not imported, so 19 are planned.
  ok('the preview says it will create 19 property records', /19 property records/.test(preview.also), preview.also);
  ok('and it still says 30 will import, 1 skipped',
    /^30 will import$/.test(preview.counts[1]) && /^1 skipped as duplicates$/.test(preview.counts[2]), preview.counts);
  ok('no property value in the demo file is one the importer cannot understand',
    preview.dropped === false);

  await page.click('#impRunBtn');
  await page.waitForSelector('#impResult', { timeout: 60000 });
  const res = await page.evaluate(() => ({
    counts: [...document.querySelectorAll('#impResult .imp-counts span')].map((s) => s.textContent.trim()),
    dbProperty: Object.keys(window.__fake.get('contactProperty') || {}).length,
    collectionWrites: window.__fake.log().filter((l) => (l.op === 'set' || l.op === 'update')
      && l.path === 'contactProperty').length,
    provOk: Object.keys(window.__fake.get('contactProperty') || {}).every((k) => {
      const x = window.__fake.get('contactProperty/' + k);
      return x._prov && x._prov.src === 'csv-import' && x._prov.ref === _bwImp.result.batchId;
    }),
    batchIds: (window.__fake.get('importBatches/' + _bwImp.result.batchId) || {}).createdPropertyIds || [],
    // The skipped duplicate carries property too. It must never have been created.
    onSkipped: Object.keys(window.__fake.get('contactProperty') || {})
      .map((k) => window.__fake.get('contactProperty/' + k))
      .filter((x) => x.sectionCode === '15' && x.lotAlpha === 'D').length,
    batchId: _bwImp.result.batchId,
  }));
  ok('the result screen reports 19 property records', res.counts[5] === '19 property', res.counts);
  ok('and the database holds exactly 19', res.dbProperty === 19, res.dbProperty);
  ok('the batch records all 19 ids, so undo has a primary record', res.batchIds.length === 19, res.batchIds.length);
  ok('every one carries _prov pointing at that batch', res.provOk === true);
  ok('NOT ONE write went to the contactProperty collection node', res.collectionWrites === 0, res.collectionWrites);
  ok('the SKIPPED duplicate row created no property record', res.onSkipped === 0, res.onSkipped);

  // Now the thing Martice actually reported. Read off the rendered detail panel.
  const seen = await page.evaluate(async () => {
    show('contacts', null);
    await new Promise((x) => setTimeout(x, 150));
    const find = (fam) => _parties.find((p) => p.family === fam);
    const read = async (fam) => {
      openContactDetail(find(fam).id);
      await new Promise((x) => setTimeout(x, 160));
      const box = document.getElementById('contactDetail');
      return {
        text: box.textContent.replace(/\s+/g, ' '),
        counts: [...box.querySelectorAll('.ct-prop-counts')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()),
        title: [...box.querySelectorAll('#ctProperty .ct-prop-loc')].map((e) => e.textContent.trim()),
        links: box.querySelectorAll('.ct-prop-map').length,
      };
    };
    return {
      teodoro: await read('Vasquez-Marin'),
      ignatius: await read('Pemberly'),
      cornelius: await read('Blythewood'),
      solveig: await read('Skagerling'),
      horatio: await read('Kingsley'),
      reginald: await read('Tuppence'),
      marcus: await read('Bellweather'),
      delphine: await read('Aristide'),
      prospects: (() => {
        let n = 0;
        _parties.forEach((p) => { if (!bwPropertyFor(p.id).length) n++; });
        return n;
      })(),
    };
  });
  ok('an existing owner shows his location, not "this contact is a prospect"',
    same(seen.teodoro.title, ['Garden 12 · Row B · Space 5']) && !/prospect/i.test(seen.teodoro.text),
    { title: seen.teodoro.title, text: seen.teodoro.text.slice(0, 200) });
  ok('…with the qualifying line the whole track exists for',
    same(seen.teodoro.counts, ['Owns 4 · 2 interred · 2 available']), seen.teodoro.counts);
  ok('…and a View on map link, because that row carries a sid', seen.teodoro.links === 1, seen.teodoro.links);
  ok('the Court of Honor niche owner is fully used: 1 owned, 1 interred, 0 available',
    same(seen.ignatius.counts, ['Owns 1 · 1 interred · 0 available']), seen.ignatius.counts);
  ok('two Garden Court niches with nobody in them are FOUR available, not two',
    same(seen.cornelius.counts, ['Owns 2 · 0 interred · 4 available · holds 2 per unit']), seen.cornelius.counts);
  ok('one Lake Urn Garden space is one urn: 1 available',
    same(seen.solveig.counts, ['Owns 1 · 0 interred · 1 available']), seen.solveig.counts);
  ok('a niche with two urns already placed is 0 available',
    same(seen.horatio.counts, ['Owns 1 · 2 interred · 0 available · holds 2 per unit']), seen.horatio.counts);
  ok('a crypt owner is shown what he owns and told nothing about availability',
    /Owns 1 · 0 interred · how many are available depends on the unit/.test(seen.reginald.counts[0] || ''),
    seen.reginald.counts);
  ok('a row with no sid gets no map link', seen.marcus.links === 0, seen.marcus.links);
  ok('a genuine prospect still reads as one', /prospect/i.test(seen.delphine.text), seen.delphine.text.slice(0, 160));
  ok('11 of the 30 imported contacts are prospects and 19 are owners',
    seen.prospects === 11, seen.prospects);

  // ── and back out again ────────────────────────────────────────────────────────────
  const undone = await page.evaluate(async (id) => {
    const res = await bwImpUndo(id);
    await new Promise((x) => setTimeout(x, 150));
    return { res, left: Object.keys(window.__fake.get('contactProperty') || {}).length,
             shown: (document.getElementById('impUndone') || {}).textContent || '' };
  }, res.batchId);
  ok('undo removes the property records too', undone.res.deletedProperty === 19, undone.res.deletedProperty);
  ok('…all of them', undone.left === 0, undone.left);
  ok('…and says so on screen', /19 property records removed/.test(undone.shown), undone.shown);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n8. An interrupted import is still fully undoable, property included');
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
    const b = _batchStore[id];
    const had = b.createdPropertyIds.length;
    // Exactly what a run cut short leaves behind: the ids are gone from the batch, the records
    // and their _prov are not. Provenance is the backstop.
    b.createdPropertyIds = [];
    b.createdPartyIds = b.createdPartyIds.slice(0, 3);
    const res = await bwUndoImport(id);
    await new Promise((x) => setTimeout(x, 150));
    return { had, res, left: Object.keys(window.__fake.get('contactProperty') || {}).length };
  });
  ok('the batch had recorded 19 property ids before it was cut down', r.had === 19, r.had);
  ok('undo finds every one of them through _prov alone', r.res.deletedProperty === 19, r.res.deletedProperty);
  ok('and nothing is left behind', r.left === 0, r.left);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

await browser.close();

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n9. data/demo-contacts.csv regenerates byte-identically from scripts/');
{
  // A committed artifact whose generator exists on one machine cannot be regenerated from a
  // fresh clone (DESIGN §5). This is the check that the generator IS the file.
  const before = fs.readFileSync(DEMO_PATH);
  let out = '';
  try { out = execFileSync(process.execPath, ['scripts/build-demo-contacts.mjs'], { encoding: 'utf8' }); }
  catch (e) { out = 'THREW: ' + e.message; }
  const after = fs.readFileSync(DEMO_PATH);
  fs.writeFileSync(DEMO_PATH, before);          // restore, whatever happened
  ok('the generator runs and says what it wrote', /wrote data\/demo-contacts\.csv/.test(out), out.slice(0, 200));
  ok('and the bytes it writes are identical to the committed file',
    Buffer.compare(before, after) === 0,
    { before: before.length, after: after.length });
}

// ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n10. Not one demo position collides with a real interment');
{
  // Martice asked for locations taken from MIS's lot-inquiry export. Taken literally that would
  // publish, in a PUBLIC repo, a record asserting an invented person owns a grave a real person
  // is buried in. Real sections, real letters, real space ranges — positions from the holes.
  //
  // PII, ABSOLUTE: columns 1-5 are FirstName, LastName, DeathDate, BornDate, BurialDate and are
  // NEVER read here. Only LocationCode / Section / LotNumber / LotNumberAlpha / LotSpaceNumber
  // leave the parser below, and only as aggregates and set membership.
  const SRC = 'E:/Downloads/LotInquiryList.csv';

  // RFC 4180, because several demo rows carry a comma inside a quoted note or address and a
  // naive split would read the property columns out of the wrong cells.
  const cells = (line) => {
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
  const demo = fs.readFileSync(DEMO_PATH, 'utf8');
  const dLines = demo.split('\r\n').filter((l) => l !== '');
  const dHead = cells(dLines[0]);
  const ix = (n) => { const i = dHead.indexOf(n); if (i < 0) throw new Error('no column ' + n); return i; };
  const propCols = ['property_section', 'property_lot_alpha', 'property_space'].map(ix);
  const dRows = dLines.slice(1).map(cells);
  ok('every demo data row parses to all 26 columns', dRows.every((r) => r.length === dHead.length),
    dRows.map((r) => r.length).filter((n) => n !== dHead.length));
  const positions = dRows.map((r) => [r[propCols[0]], r[propCols[1]], r[propCols[2]]])
    .filter((p) => p[0]);
  ok('20 of the 31 demo rows carry a property position', positions.length === 20, positions.length);

  if (!fs.existsSync(SRC)) {
    console.log('  NOTE  ' + SRC + ' is not present on this machine — THE COLLISION CHECK DID NOT '
      + 'RUN. It is Martice\'s own MIS export, is not in the repo and never will be, so this is '
      + 'expected anywhere else. ' + (positions.length + FIXTURE_POSITIONS.length)
      + ' positions went unverified.');
  } else {
    // The file is malformed: the header row is TAB-delimited while every data row is comma-
    // delimited and quoted, so csv.DictReader(delimiter='\t') reads all 40,816 rows and returns
    // blank for every field WITHOUT raising. Skip the header line whole. One data line has an
    // odd number of quotes, so parsing is done line by line — a streaming parse desynchronises
    // there and silently mis-reads the remaining 39,000 rows. Same cells() as above.
    const raw = fs.readFileSync(SRC, 'utf8').replace(/^\uFEFF/, '');
    const body = raw.split(/\r\n/).slice(1).filter((l) => l !== '');
    const occupied = new Set(), sections = new Set(), lots = new Set();
    let anchored = 0;
    for (const line of body) {
      const f = cells(line);
      // 168 rows carry a comma inside a NAME field, so the location columns are not at a fixed
      // index. LocationCode is the anchor and nothing before it is ever read.
      let i = -1;
      for (let k = 0; k < f.length; k++) if (f[k].trim() === 'WMP') { i = k; break; }
      if (i < 0 || i + 4 >= f.length) continue;
      anchored++;
      const sec = f[i + 1].trim(), lot = f[i + 2].trim(), alpha = f[i + 3].trim(), sp = f[i + 4].trim();
      sections.add(sec); lots.add(lot);
      occupied.add(sec + '|' + alpha + '|' + sp);
    }
    ok('the export parses to 40,816 data lines', body.length === 40816, body.length);
    ok('…of which 40,815 anchor on a WMP location code', anchored === 40815, anchored);
    ok('it names exactly the 57 sections this suite expects',
      sections.size === CODES.length && CODES.every((c) => sections.has(c)),
      { got: sections.size, missing: CODES.filter((c) => !sections.has(c)),
        extra: [...sections].filter((c) => CODES.indexOf(c) === -1) });
    ok('and 2,931 distinct (section, row, space) triples are occupied', occupied.size === 2931, occupied.size);
    // WHY the triple is the tuple that is checked: the export's LotNumber (the block) is 0 on
    // nearly every row, so it carries no information and cannot be part of an identity.
    ok('the export records only ' + lots.size + ' distinct lot/block values in 40,815 rows, so the '
      + 'block cannot identify a grave', lots.size <= 12, lots.size);

    const hit = positions.filter((p) => occupied.has(p[0] + '|' + p[1] + '|' + p[2]));
    ok('ZERO of the ' + positions.length + ' demo positions collides with an occupied triple',
      hit.length === 0, hit);
    const fhit = FIXTURE_POSITIONS.filter((p) => occupied.has(p[0] + '|' + p[1] + '|' + p[2]));
    ok('ZERO of the ' + FIXTURE_POSITIONS.length + ' fixture positions in this suite does either',
      fhit.length === 0, fhit);
    // Realism is the other half of the requirement: invented sections would trivially not collide.
    const bogus = positions.concat(FIXTURE_POSITIONS).filter((p) => !sections.has(p[0]));
    ok('every position uses a REAL section code, so not colliding actually means something',
      bogus.length === 0, bogus);
  }
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
