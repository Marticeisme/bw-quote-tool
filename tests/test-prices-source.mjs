// data/prices.json is the single source for the overlapping cemetery fees. This suite is what
// makes that permanent rather than true-on-the-day-it-shipped.
//
// Three things are checked, and the third is the one that is easy to get wrong.
//
// 1. DRIFT. Every price the app quotes must equal the amount in data/prices.json. The tool
//    side is read from the RENDERED quote lines and the page's own BW_FEES, never from a
//    constant this file also imports — a test that reads the price from the same place the
//    code does passes forever and proves nothing.
//
// 2. THE UNSOURCED KEYS. prices.json carries three fee keys the tool deliberately does not
//    read, for reasons recorded in index.html's price block and docs/PRICE_UPDATE.md. They are
//    pinned here so a fourth cannot appear unnoticed, and so the day MONOBAR_INSTALL is
//    settled in MIS this suite says so instead of staying quiet.
//
// 3. SCRAPE FORMAT. buildPriceIndex() regex-scrapes rendered label text: an item enters the
//    Price List and the top-bar search only if its label reads `Name — $1,234`. Change the
//    dash, the spacing, or where the amount sits and the item vanishes from search with no
//    error and no console warning — and the generator baseline cannot see it, because search
//    is not on a contract. Every fee label is asserted against that regex AND asserted present
//    in PRICE_INDEX, and a negative control breaks a label on purpose to prove the check fires.
//
// Fake Firebase only; production is never contacted.
import { chromium } from 'playwright';
import fs from 'fs';

const FAKE = fs.readFileSync('tests/fake-firebase.js', 'utf8');
const PRICES = JSON.parse(fs.readFileSync('data/prices.json', 'utf8'));
const FEES = PRICES.current.fees;

// The fee keys the tool does not source, and why. Each must still be ABSENT from BW_FEES.
const UNSOURCED = {
  'MONOBAR_INSTALL:crypt': 'prices.json says 215, the tool quotes 225 — unresolved, MIS decides',
  'VASE:crypt': 'the file has one vase per structure; the tool sells three distinct vase SKUs',
  'VASE:niche': 'same — "Niche Vase (ROAC)" is $275 here, not the file\'s $260',
};

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '\n        ' + JSON.stringify(x) : '')); }
};

async function open(browser) {
  const ctx = await browser.newContext();
  await ctx.route(/gstatic\.com\/firebasejs/, (r) => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  await page.addInitScript(FAKE);
  await page.addInitScript(`window.__fake.addAccount('t@bwquote.local','pw');`);
  await page.goto('http://localhost:3737/', { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(() => _fbAuth.signInWithEmailAndPassword('t@bwquote.local', 'pw'));
  await page.waitForFunction(() => window._fbQuotesReady === true, { timeout: 20000 });
  await page.waitForTimeout(250);
  return { ctx, page, errs };
}

const browser = await chromium.launch();

// 1. The page's prices are the file's prices.
console.log('\n1. index.html and data/prices.json agree');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(() => ({
    fees: window.BW_FEES,
    generated: window.BW_PRICES_GENERATED,
    url: window.BW_PRICES_URL,
  }));
  const keys = Object.keys(r.fees || {});
  ok('the page exposes a BW_FEES table', keys.length > 0, keys.length);
  const wrong = keys.filter((k) => r.fees[k] !== FEES[k]).map((k) => k + ': page ' + r.fees[k] + ' vs file ' + FEES[k]);
  ok('every price in the page matches data/prices.json', wrong.length === 0, wrong);
  ok('the generated stamp matches the file', r.generated === PRICES.generated, { page: r.generated, file: PRICES.generated });
  ok('the page fetches the file from a path Pages also serves', r.url === 'data/prices.json', r.url);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 2. The runtime guard against a deploy that shipped index.html without prices.json.
console.log('\n2. The runtime price-file check runs and finds no drift');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(async () => {
    const drift = await window.bwVerifyPriceFile();
    return {
      drift: window._bwPriceFileDrift,
      returned: drift,
      banner: !!document.getElementById('bwPriceBanner'),
    };
  });
  ok('bwVerifyPriceFile() completed', Array.isArray(r.drift), r.drift);
  ok('it found nothing out of step', r.drift && r.drift.length === 0, r.drift);
  ok('so no warning banner is shown', r.banner === false, r.banner);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 3. The keys prices.json has that the tool deliberately does not read.
console.log('\n3. The unsourced keys are still unsourced, and still the same three');
{
  const { ctx, page } = await open(browser);
  const fees = await page.evaluate(() => window.BW_FEES);
  const inFile = Object.keys(FEES).sort();
  const inPage = Object.keys(fees).sort();
  const notRead = inFile.filter((k) => inPage.indexOf(k) < 0);
  ok('data/prices.json has exactly the unsourced keys we documented',
    JSON.stringify(notRead) === JSON.stringify(Object.keys(UNSOURCED).sort()),
    { found: notRead, documented: Object.keys(UNSOURCED).sort() });
  ok('and every key the page quotes really exists in the file',
    inPage.every((k) => typeof FEES[k] === 'number'), inPage.filter((k) => typeof FEES[k] !== 'number'));

  // The known disagreement. When MIS settles it this assertion is what tells us to act:
  // if the tool ever quotes 215 the message below stops being true and the suite fails.
  const monobar = await page.evaluate(async () => {
    show('cem-quote', null);
    document.getElementById('qMausPrice').value = '10000';
    document.getElementById('qMausIndoor').checked = true;
    cemUpdateD();
    await new Promise((r) => setTimeout(r, 250));
    const l = (_cemLines || []).find((x) => /Monobar.*Install/i.test(x.label));
    return l ? l.amount : null;
  });
  ok('the monobar install fee still quotes at the tool\'s 225, not the file\'s 215 — unresolved',
    monobar === 225 && FEES['MONOBAR_INSTALL:crypt'] === 215,
    { toolQuotes: monobar, fileSays: FEES['MONOBAR_INSTALL:crypt'] });
  await ctx.close();
}

// 4. The quoted amounts — read off the built lines, not off a constant.
console.log('\n4. Every quoted fee line equals the file');
{
  const { ctx, page, errs } = await open(browser);
  const lines = await page.evaluate(async () => {
    show('cem-quote', null);
    const g = document.getElementById('qGarden');
    g.value = [...g.options].find((o) => /\|/.test(o.value)).value;
    ['qOCLawnSingle', 'qOCLawnDouble1', 'qOCLawnDouble2', 'qOCMaus', 'qOCGround',
      'qOCBoulder', 'qOCNiche', 'qOCNicheNon', 'qRecGround'].forEach((id) => {
      const e = document.getElementById(id); if (e) e.checked = true;
    });
    cemUpdateD();
    await new Promise((r) => setTimeout(r, 300));
    const out = {};
    (_cemLines || []).forEach((l) => { out[l.label] = l.amount; });
    return out;
  });
  const expect = {
    'Lawn Interment – Single Depth': 'OC:lawn_single',
    'Lawn Interment – Double Depth (1st)': 'OC:lawn_double_1st',
    'Lawn Interment – Double Depth (2nd)': 'OC:lawn_double_2nd',
    'Mausoleum Entombment': 'OC:mausoleum_entombment',
    'Ground Inurnment': 'OC:ground_inurnment',
    'Boulder Inurnment': 'OC:boulder_inurnment',
    'Niche Inurnment': 'OC:niche_inurnment',
    'Niche (Non-Inurnment)': 'OC:niche_non_inurnment',
    'Recording Fee – Interment': 'RECORDING:all',
  };
  Object.keys(expect).forEach((label) => {
    ok('"' + label + '" quotes ' + FEES[expect[label]] + ' (' + expect[label] + ')',
      lines[label] === FEES[expect[label]], { got: lines[label], want: FEES[expect[label]] });
  });
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 5. The niche / mausoleum bundles, which are the other half of the fee surface.
console.log('\n5. The niche and mausoleum bundles equal the file');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(async () => {
    show('cem-quote', null);
    document.getElementById('qNichePrice').value = '5000';
    document.getElementById('qMausPrice').value = '9000';
    ['qNicheGlass', 'qNicheGranite', 'qMausIndoor', 'qMausOutdoor'].forEach((id) => {
      const e = document.getElementById(id); if (e) e.checked = true;
    });
    cemUpdateD();
    await new Promise((r) => setTimeout(r, 300));
    const sum = {};
    (_cemLines || []).forEach((l) => { sum[l.label] = (sum[l.label] || 0) + l.amount; });
    return {
      sum,
      glass: (document.getElementById('qNicheGlassDisp') || {}).textContent,
      granite: (document.getElementById('qNicheGraniteDisp') || {}).textContent,
      indoor: (document.getElementById('qMausIndoorDisp') || {}).textContent,
      outdoor: (document.getElementById('qMausOutdoorDisp') || {}).textContent,
    };
  });
  const money = (n) => '$' + n.toLocaleString('en-US');
  ok('glass-front niche bundle totals recording + niche O&C',
    (r.glass || '').indexOf(money(FEES['RECORDING:all'] + FEES['OC:niche_inurnment'])) > -1, r.glass);
  ok('granite-front niche bundle adds the inscription',
    (r.granite || '').indexOf(money(FEES['RECORDING:all'] + FEES['OC:niche_inurnment'] + FEES['INSCRIPTION:all'])) > -1, r.granite);
  ok('indoor mausoleum bundle = recording + entombment + monobar + the unsourced 225 install',
    (r.indoor || '').indexOf(money(FEES['RECORDING:all'] + FEES['OC:mausoleum_entombment'] + FEES['MONOBAR:crypt'] + 225)) > -1, r.indoor);
  ok('outdoor mausoleum bundle = recording + entombment + inscription',
    (r.outdoor || '').indexOf(money(FEES['RECORDING:all'] + FEES['OC:mausoleum_entombment'] + FEES['INSCRIPTION:all'])) > -1, r.outdoor);
  ok('the monobar memorial line equals MONOBAR:crypt',
    r.sum['Monobar Court O/Crypt – Memorial'] === FEES['MONOBAR:crypt'], r.sum['Monobar Court O/Crypt – Memorial']);
  ok('the shutter inscription line equals INSCRIPTION:all',
    r.sum['Shutter Inscription – In-shop'] === FEES['INSCRIPTION:all'], r.sum['Shutter Inscription – In-shop']);
  await ctx.close();
}

// 6. SCRAPE FORMAT — the silent failure this whole design is arranged around.
console.log('\n6. Every fee label still reads `Name — $1,234`, and is in PRICE_INDEX');
{
  const { ctx, page, errs } = await open(browser);
  const r = await page.evaluate(() => {
    // The same regex buildPriceIndex() uses. Duplicated on purpose: if someone loosens the one
    // in the app, this copy keeps asserting the format the Price List actually renders.
    const priceRe = /^(.*?)\s*[—–-]\s*\$\s*([\d,]+(?:\.\d{1,2})?)(?:\s+(?:each|ea\.?|per\s+[\w-]+|\/\s*mo|\+))?\s*$/i;
    const scanned = [
      ...document.querySelectorAll('#section-cem-quote .q-check-row label, #section-fh-quote .q-check-row label'),
      ...document.querySelectorAll('#section-cem-quote .q-group-label, #section-fh-quote .q-group-label'),
    ];
    // The nine index-bearing fee labels, named rather than sniffed: eight O&C checkboxes
    // (literal text — the map's build-prices.py scrapes these, see index.html's price block)
    // and the recording-fee group header (a data-fee span).
    const OC = {
      qOCLawnSingle: 'OC:lawn_single', qOCLawnDouble1: 'OC:lawn_double_1st',
      qOCLawnDouble2: 'OC:lawn_double_2nd', qOCMaus: 'OC:mausoleum_entombment',
      qOCGround: 'OC:ground_inurnment', qOCBoulder: 'OC:boulder_inurnment',
      qOCNiche: 'OC:niche_inurnment', qOCNicheNon: 'OC:niche_non_inurnment',
    };
    const feeLabels = Object.keys(OC)
      .map((id) => ({ node: document.querySelector('label[for="' + id + '"]'), key: OC[id] }))
      .concat(scanned
        .filter((n) => n.classList.contains('q-group-label') && n.querySelector('[data-fee]'))
        .map((n) => ({ node: n, key: n.querySelector('[data-fee]').getAttribute('data-fee') })));
    buildPriceIndex();
    return {
      total: document.querySelectorAll('[data-fee]').length,
      blank: [...document.querySelectorAll('[data-fee]')]
        .filter((n) => !/^\$[\d,]+$/.test(n.textContent)).map((n) => n.getAttribute('data-fee') + '=' + JSON.stringify(n.textContent)),
      scannedByIndex: scanned.length,
      labels: feeLabels.map((f) => {
        const t = f.node ? (f.node.textContent || '').trim() : '';
        const m = t.match(priceRe);
        return {
          text: t,
          found: !!f.node,
          scanned: !!f.node && scanned.indexOf(f.node) > -1,
          matches: !!m,
          name: m ? m[1].replace(/\s+/g, ' ').trim() : null,
          price: m ? parseFloat(m[2].replace(/,/g, '')) : null,
          keys: [f.key],
        };
      }),
      indexed: PRICE_INDEX.map((i) => i.name + '|' + i.price),
    };
  });

  ok('every data-fee span rendered an amount — none left blank', r.blank.length === 0, r.blank);
  ok('all 40 fee spans are present', r.total === 40, r.total);
  ok('the O&C and recording labels were all found', r.labels.every((l) => l.found), r.labels.map((l) => l.text));
  ok('there are nine of them', r.labels.length === 9, r.labels.map((l) => l.text));
  ok('and buildPriceIndex actually scans every one', r.labels.every((l) => l.scanned),
    r.labels.filter((l) => !l.scanned).map((l) => l.text));

  const badFormat = r.labels.filter((l) => !l.matches).map((l) => l.text);
  ok('every fee label still matches the buildPriceIndex regex', badFormat.length === 0, badFormat);

  const notIndexed = r.labels.filter((l) => l.matches && r.indexed.indexOf(l.name + '|' + l.price) < 0)
    .map((l) => l.name + '|' + l.price);
  ok('and every one of them made it into PRICE_INDEX', notIndexed.length === 0, notIndexed);

  const wrongPrice = r.labels.filter((l) => l.matches && l.keys.length === 1 && l.price !== FEES[l.keys[0]])
    .map((l) => l.text + ' vs file ' + FEES[l.keys[0]]);
  ok('at the amount data/prices.json gives', wrongPrice.length === 0, wrongPrice);
  ok('no page errors', errs.length === 0, errs);
  await ctx.close();
}

// 7. NEGATIVE CONTROL. Break a label the way a careless edit would and prove check 6 fires.
//    Without this, checks like the one above can quietly stop testing anything.
console.log('\n7. A broken label really does fail — the check is not vacuous');
{
  const { ctx, page } = await open(browser);
  const r = await page.evaluate(() => {
    const priceRe = /^(.*?)\s*[—–-]\s*\$\s*([\d,]+(?:\.\d{1,2})?)(?:\s+(?:each|ea\.?|per\s+[\w-]+|\/\s*mo|\+))?\s*$/i;
    const lbl = document.querySelector('label[for="qOCLawnSingle"]');
    const good = (lbl.textContent || '').trim();

    // a colon instead of the em dash — visually almost identical, fatal to the scrape
    lbl.textContent = good.replace(' — ', ' : ');
    const broken = (lbl.textContent || '').trim();
    buildPriceIndex();
    const afterBreak = PRICE_INDEX.filter((i) => /^Lawn Interment . Single Depth$/.test(i.name)).length;

    lbl.textContent = good;
    buildPriceIndex();
    const afterFix = PRICE_INDEX.filter((i) => /^Lawn Interment . Single Depth$/.test(i.name)).length;

    return { goodMatches: priceRe.test(good), brokenMatches: priceRe.test(broken), afterBreak, afterFix, broken };
  });
  ok('the real label matches the regex', r.goodMatches === true, r);
  ok('the dash-swapped label does NOT', r.brokenMatches === false, r.broken);
  ok('and it silently disappears from PRICE_INDEX — the failure this guards against', r.afterBreak === 0, r.afterBreak);
  ok('restoring the dash brings it back', r.afterFix === 1, r.afterFix);
  await ctx.close();
}

// 8. THE LOOP. The map's build-prices.py produces the O&C half of data/prices.json by
//    scraping index.html's eight qOC checkbox labels — this tool is the only place those
//    amounts have ever been written down. So those eight labels are a PUBLIC INTERFACE, and
//    the obvious tidy-up (make them <span data-fee> like every other displayed fee) silently
//    returns zero matches and drops all eight O&C fees out of the file both apps read. This
//    check is the tripwire. It goes away when build-prices.py carries its own O&C table —
//    see docs/PRICE_UPDATE.md.
console.log('\n8. The map\'s build-prices.py can still read our O&C labels');
{
  // build-prices.py's own regex, transliterated. If it changes there, change it here.
  const rx = /<label for="qOC(\w+)">([^<]*?)\s*[-—]+\s*\$([\d,]+)<\/label>/g;
  const OC_PRODUCTS = {
    LawnSingle: 'lawn_single', LawnDouble1: 'lawn_double_1st',
    LawnDouble2: 'lawn_double_2nd', Maus: 'mausoleum_entombment',
    Ground: 'ground_inurnment', Boulder: 'boulder_inurnment',
    Niche: 'niche_inurnment', NicheNon: 'niche_non_inurnment',
  };
  const html = fs.readFileSync('index.html', 'utf8');
  const found = {};
  let m;
  while ((m = rx.exec(html))) found['OC:' + (OC_PRODUCTS[m[1]] || '?' + m[1])] = Number(m[3].replace(/,/g, ''));
  const keys = Object.keys(found).sort();

  ok('all eight O&C labels are still scrapable text, not empty spans', keys.length === 8, keys);
  ok('every id maps to a known product slug', keys.every((k) => k.indexOf('?') < 0), keys);
  const wrong = keys.filter((k) => found[k] !== FEES[k]).map((k) => k + ': label ' + found[k] + ' vs file ' + FEES[k]);
  ok('and each reads the amount data/prices.json holds', wrong.length === 0, wrong);
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
