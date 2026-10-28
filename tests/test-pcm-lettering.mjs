// pcm-design-catalog.html — Design Your Lettering (2026-10-27).
//
// A marker layout builder: a single or companion layout with the lines PCM's proofs use, a
// lettering style and case for every line, dates typed once and shown in the family's
// format, a drawn marker preview that is also what Download / Share / Print send, and the
// 62-style grid comparing any one line across every style. PCM's fonts are commercial and
// the repo is public, so each style is a freely licensed look-alike (fonts/lettering/) with
// PCM's own alphabet under its card. These checks hold the page to data/pcm-lettering.json,
// hold the font folder to its license list, and drive the builder the way a family would.
// Nothing here writes anything anywhere except this browser's own localStorage.
import fs from 'fs';
import { chromium } from 'playwright';
import { BASE } from './_base.mjs';

let pass = 0, fail = 0;
const ck = (cond, msg, extra) => {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg + (extra !== undefined ? '\n        ' + JSON.stringify(extra).slice(0, 400) : '')); }
};
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const face = (f) => `${slug(f[0])}-${f[1]}${f[2] ? 'i' : ''}`;
const styles = JSON.parse(fs.readFileSync('data/pcm-lettering.json', 'utf8')).styles;

console.log('\n1. The font folder holds only the look-alikes, each with a free license on record');
{
  const want = new Set(styles.filter((s) => s.font).map((s) => face(s.font) + '.woff'));
  const have = fs.readdirSync('fonts/lettering').filter((f) => f.endsWith('.woff'));
  ck(have.length === want.size && have.every((f) => want.has(f)),
    `fonts/lettering has exactly the ${want.size} faces the data names`,
    { extra: have.filter((f) => !want.has(f)), missing: [...want].filter((f) => !have.includes(f)) });
  const lic = fs.readFileSync('fonts/lettering/LICENSES.md', 'utf8');
  const fams = [...new Set(styles.filter((s) => s.font).map((s) => s.font[0]))];
  const unlisted = fams.filter((f) => !lic.includes(`| ${f} |`));
  ck(unlisted.length === 0, `every one of the ${fams.length} families is in LICENSES.md`, unlisted);
  const rows = lic.split('\n').filter((l) => /^\| (?!Family|---)/.test(l));
  ck(rows.every((l) => /SIL Open Font License|Apache License|GUST Font License/.test(l)),
    'every family is OFL, Apache or GUST licensed', rows.filter((l) => !/SIL|Apache|GUST/.test(l)));
  const pcmish = have.filter((f) => /trajan|optima|palatino|benguiat|friz|corsiva|zapf|pcm|monument|baskervillessi/i.test(f));
  ck(pcmish.length === 0, 'no file in fonts/lettering is named after a commercial PCM face', pcmish);
  const imgs = styles.filter((s) => s.ref).map((s) => `pcm-lettering-images/${slug(s.name)}.webp`);
  ck(imgs.every((p) => fs.existsSync(p)), `all ${imgs.length} reference alphabets are on disk`,
    imgs.filter((p) => !fs.existsSync(p)));
}

const browser = await chromium.launch();
const errs = [];
async function open(width, height, keep = false) {
  const ctx = await browser.newContext({ viewport: { width, height }, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  page.on('requestfailed', (r) => { if (/lettering/.test(r.url())) errs.push('failed ' + r.url()); });
  page.on('dialog', (d) => d.accept());
  await page.goto(BASE + 'pcm-design-catalog.html?family', { waitUntil: 'load', timeout: 120000 });
  return page;
}
const page = await open(1440, 1000);
const settle = (ms = 500) => page.evaluate((ms) => document.fonts.ready.then(() => new Promise((r) => setTimeout(r, ms))), ms);
const painted = () => page.evaluate(() => document.getElementById('ltCanvas').dataset.painted || '');
const repainted = async (before) => { for (let i = 0; i < 40; i++) { if ((await painted()) !== before) return true; await page.waitForTimeout(100); } return false; };
const sel = (role, cls) => `.lt-row[data-role="${role}"] .${cls}`;
const card = (line) => page.evaluate((i) => document.querySelector('#lt-trajan .lt-l' + i).textContent, line);

console.log('\n2. One card per style, in the data\'s order, each saying how close it is');
{
  const dom = await page.evaluate(() => [...document.querySelectorAll('#ltGrid .lt-card')].map((c) => ({
    name: c.querySelector('.lt-name').textContent, kind: c.dataset.kind, ff: c.dataset.ff || '',
    match: c.querySelector('.lt-match').className.replace('lt-match ', ''), caps: c.classList.contains('lt-caps'),
    ref: (c.querySelector('.lt-ref img') || { getAttribute: () => '' }).getAttribute('src'), product: c.classList.contains('product-card'),
    use: !!c.querySelector('.lt-use'),
  })));
  ck(dom.length === styles.length, `${dom.length} cards for ${styles.length} styles`);
  ck(dom.every((d, i) => d.name === styles[i].name), 'cards run in the data\'s order with the data\'s names');
  ck(dom.every((d, i) => d.kind === styles[i].kind && d.match === styles[i].match), 'every card carries its kind and match from the data');
  ck(dom.every((d, i) => d.ff === (styles[i].font ? 'L ' + styles[i].font[0] : '')), 'every card previews in its look-alike (the one with no sample has none)');
  ck(dom.every((d, i) => d.use === !!styles[i].font), 'every style with a look-alike has a "Use" button');
  ck(dom.every((d, i) => d.caps === (styles[i].caps === 'all')), 'the capitals-only styles preview in capitals');
  ck(dom.every((d, i) => (d.ref || '') === (styles[i].ref ? `pcm-lettering-images/${slug(styles[i].name)}.webp` : '')), 'every card with a PCM sample shows it');
  ck(dom.every((d) => !d.product), 'no lettering card is a .product-card (the page enlarges those on click)');
  const opts = await page.evaluate(() => [...document.querySelectorAll('.lt-row[data-role="last"] .lt-font option')].length);
  ck(opts === styles.filter((s) => s.font).length, `every line's style list offers all ${opts} styles that can be shown`);
  ck(await page.evaluate(() => [...document.querySelectorAll('.contents a')].some((a) => a.getAttribute('href') === '#sec-lettering')),
    'the contents row links to the section');
}

console.log('\n3. A fresh visit: one-name layout, the Classic starting point, a drawn marker');
{
  await page.evaluate(() => localStorage.removeItem('bwLettering.v1'));
  await page.reload({ waitUntil: 'load' });
  await page.evaluate(() => document.getElementById('sec-lettering').scrollIntoView());
  await settle(800);
  const s = await page.evaluate(() => ({
    rows: [...document.querySelectorAll('.lt-row')].map((r) => r.dataset.role),
    last: document.querySelector('.lt-row[data-role="last"] .lt-font').value,
    lastCase: document.querySelector('.lt-row[data-role="last"] .lt-case').value,
    dates: document.querySelector('.lt-row[data-role="dates"] .lt-font').value,
    w: document.getElementById('ltCanvas').width, h: document.getElementById('ltCanvas').height,
  }));
  ck(s.rows.join() === 'top,first,last,dates,bottom', 'the one-name layout has the lines PCM\'s proofs use', s.rows);
  ck(s.last === 'trajan' && s.lastCase === 'upper' && s.dates === 'palatino', 'Classic: a capitals surname over plain dates', s);
  ck(s.w > 0 && Math.abs(s.h / s.w - 0.5) < 0.01, 'the marker is drawn at 24 x 12 proportions', s);
  const first = await page.evaluate(() => ({
    stone: document.querySelector('.lt-stone-btn[aria-pressed="true"]').dataset.stone,
    engrave: document.getElementById('ltEngrave').value,
    stones: [...document.querySelectorAll('.lt-stone-btn')].map((b) => b.textContent.trim()),
    engraves: [...document.querySelectorAll('#ltEngrave option')].map((o) => o.textContent),
  }));
  ck(first.stones.join() === 'Barrell Gray,Absolute Black,Bahama Blue,Sentinel Red', 'the four PCM granites are offered, no brown', first.stones);
  ck(first.engraves.length === 8 && first.engraves[0] === 'Cut-in lettering, single outlined border' &&
     first.engraves[7] === 'Cut-in, gold leaf lettering', 'the eight engraving styles, named as PCM\'s book names them', first.engraves);
  ck(first.stone === 'barrell-gray' && first.engrave === 'cut-border', 'it starts on Barrell Gray with cut-in lettering', first);
}

console.log('\n3b. The lettering color follows the granite and the engraving, the way PCM\'s book shows it');
{
  // the color at the darkest/lightest pixels inside the inscription, against the stone around it
  const probe = () => page.evaluate(async () => {
    await new Promise((r) => setTimeout(r, 350));
    const c = document.getElementById('ltCanvas'), x = c.getContext('2d');
    const d = x.getImageData(c.width * 0.3, c.height * 0.35, c.width * 0.4, c.height * 0.3).data;
    let dark = 0, light = 0, gold = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      n++;
      const r = d[i], g = d[i + 1], b = d[i + 2];
      if (r < 50 && g < 50 && b < 50) dark++;
      if (r > 200 && g > 200 && b > 195) light++;
      if (r > 170 && g > 120 && b < 110 && r - b > 80) gold++;
    }
    return { dark: dark / n, light: light / n, gold: gold / n, url: c.toDataURL().length };
  });
  await page.selectOption(sel('last', 'lt-font'), 'trajan');
  let p = await probe();
  ck(p.dark > 0.03, 'cut-in on Barrell Gray: the letters are filled black, as in PCM\'s Barrell Gray example', p);
  await page.click('.lt-stone-btn[data-stone="absolute-black"]');
  p = await probe();
  ck(p.light > 0.02 && p.dark > 0.5, 'cut-in on Absolute Black: frosted light letters on the black stone', p);
  await page.selectOption('#ltEngrave', 'cut-panel');
  p = await probe();
  ck(p.dark > 0.03 && p.dark < 0.4, 'frosted panel on Absolute Black: a light panel with black letters', p);
  await page.selectOption('#ltEngrave', 'gold');
  p = await probe();
  ck(p.gold > 0.02, 'gold leaf draws gold letters', p);
  ck(await page.evaluate(() => !/em/.test(document.getElementById('ltEngraveSay').innerHTML)), 'no warning for gold leaf on black');
  await page.click('.lt-stone-btn[data-stone="barrell-gray"]');
  ck(await page.evaluate(() => /hard to read on light granite/.test(document.getElementById('ltEngraveSay').textContent)),
    'gold leaf on light granite gets a gentle note');
  const cards = [];
  for (const e of ['cut-border', 'polish-panel', 'frost-outline', 'gold']) {
    await page.selectOption('#ltEngrave', e);
    cards.push(await page.evaluate(() => getComputedStyle(document.querySelector('#lt-trajan .lt-stone')).color));
  }
  ck(new Set(cards).size >= 3, 'the cards\' lettering color changes with the engraving too', cards);
  const urls = new Set();
  for (const e of await page.evaluate(() => [...document.querySelectorAll('#ltEngrave option')].map((o) => o.value))) {
    await page.selectOption('#ltEngrave', e);
    urls.add((await page.evaluate(async () => { await new Promise((r) => setTimeout(r, 300)); return document.getElementById('ltCanvas').toDataURL(); })).slice(-400));
  }
  ck(urls.size === 8, 'each of the eight engraving styles draws differently', urls.size);
  ck(await page.evaluate(() => document.getElementById('ltEngraveSay').textContent.length > 30), 'each style is explained in plain words');
  await page.selectOption('#ltEngrave', 'cut-border');
}

console.log('\n4. Every line takes its own style, and the drawing follows');
{
  let before = await painted();
  await page.selectOption(sel('last', 'lt-font'), 'old-english');
  await page.selectOption(sel('last', 'lt-case'), 'as');
  ck(await repainted(before), 'changing the last name\'s style redraws the marker');
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('bwLettering.v1')));
  ck(st.roles.last.s === 'old-english' && st.roles.first.s === 'palatino' && st.roles.dates.s === 'palatino',
    'only that line changed; the others keep their own styles', st.roles);
  before = await painted();
  await page.fill('[data-key="top"]', 'Forever in our hearts');
  ck(await repainted(before), 'typing redraws the marker');
  await page.selectOption(sel('last', 'lt-font'), 'commercial-script');
  await page.selectOption(sel('last', 'lt-case'), 'upper');
  ck(await page.evaluate(() => !document.querySelector('.lt-row[data-role="last"] .lt-hint').hidden),
    'script in capitals gets a gentle note');
  await page.selectOption(sel('dates', 'lt-font'), 'park-avenue');
  ck(await page.evaluate(() => /dates/.test(document.querySelector('.lt-row[data-role="dates"] .lt-hint').textContent)),
    'script on the dates gets a gentle note');
  await page.selectOption(sel('dates', 'lt-font'), 'palatino');
  await page.selectOption(sel('last', 'lt-font'), 'trajan');
  ck(await page.evaluate(() => document.querySelectorAll('.lt-hint:not([hidden])').length === 0), 'and the notes go away');
}

console.log('\n5. Dates: typed any common way, shown in the format the family picks');
{
  await page.click(sel('dates', 'lt-cmp'));
  await page.fill('[data-key="born"]', '6/21/1938');
  await page.fill('[data-key="died"]', '2024-07-10');
  await page.selectOption(sel('dates', 'lt-arr'), 'line');
  await page.selectOption(sel('dates', 'lt-fmt'), 'full');
  ck(await card(1) === 'June 21, 1938 – July 10, 2024', 'full: "June 21, 1938 – July 10, 2024"', await card(1));
  await page.selectOption(sel('dates', 'lt-fmt'), 'abbr');
  ck(await card(1) === 'June 21, 1938 – July 10, 2024', 'abbreviated keeps June and July whole, the way they\'re cut');
  await page.fill('[data-key="born"]', 'September 3 1938');
  ck(await card(1) === 'Sept. 3, 1938 – July 10, 2024', 'abbreviated: "Sept. 3, 1938"', await card(1));
  await page.selectOption(sel('dates', 'lt-fmt'), 'years');
  ck(await card(1) === '1938 – 2024', 'years only: "1938 – 2024"', await card(1));
  await page.selectOption(sel('dates', 'lt-fmt'), 'full');
  await page.selectOption(sel('dates', 'lt-arr'), 'stack');
  ck(await card(1) === 'September 3, 1938' && await card(2) === 'July 10, 2024', 'stacked: one date per line');
  await page.selectOption(sel('dates', 'lt-arr'), 'labels');
  ck(await card(1) === 'Born September 3, 1938' && await card(2) === 'Died July 10, 2024', 'Born / Died');
  await page.fill('[data-key="died"]', '');
  await page.selectOption(sel('dates', 'lt-arr'), 'line');
  ck(await card(1) === 'September 3, 1938 –', 'left blank for someone living: the line ends on the dash', await card(1));
  await page.fill('[data-key="born"]', 'Summer 1938');
  ck(await card(1) === 'Summer 1938 –', 'anything else prints exactly as typed', await card(1));
  await page.fill('[data-key="born"]', 'June 21, 1938');
  await page.fill('[data-key="died"]', 'July 10, 2024');
}

console.log('\n6. Compare one line across every style, then use one');
{
  const g = await page.evaluate(() => ({
    title: document.getElementById('ltGalTitle').textContent,
    btn: document.querySelector('#lt-garamond .lt-use').textContent,
    target: document.getElementById('ltTarget').value,
    row: document.querySelector('.lt-row[data-role="dates"]').classList.contains('lt-target'),
  }));
  ck(g.title === 'Your dates in every style' && g.target === 'dates' && g.row, 'Compare on the dates shows the dates in every card', g);
  ck(g.btn === 'Use for dates', 'and each card offers "Use for dates"', g.btn);
  const before = await painted();
  await page.click('#lt-garamond .lt-use');
  ck(await page.evaluate(() => document.querySelector('.lt-row[data-role="dates"] .lt-font').value) === 'garamond',
    'clicking it sets the dates to Garamond');
  ck(await repainted(before), 'and redraws the marker');
  ck(await page.evaluate(() => !document.querySelector('#lt-garamond .lt-inuse').hidden &&
    document.querySelector('#lt-palatino .lt-inuse').hidden), 'Garamond\'s card now says "In use"; Palatino\'s no longer does');
  ck(await page.evaluate(() => document.querySelector('.lt-row[data-role="last"] .lt-font').value) === 'trajan',
    'the other lines keep their styles');
  await page.selectOption('#ltTarget', 'last');
  ck(await card(1) === 'Wilson' && await page.evaluate(() => document.querySelector('#lt-trajan .lt-preview').classList.contains('lt-upper')),
    'comparing the last name shows it in every card, in its chosen capitals');
  await page.selectOption('#ltTarget', 'all');
}

console.log('\n7. A short list');
{
  await page.click('#lt-trajan .lt-star');
  await page.click('#lt-optima .lt-star');
  await page.click('.lt-chip[data-kind="starred"]');
  const shown = await page.evaluate(() => [...document.querySelectorAll('.lt-card:not([hidden])')].map((c) => c.id));
  ck(shown.join() === 'lt-optima,lt-trajan', 'the short list shows just the starred styles', shown);
  ck(await page.evaluate(() => document.getElementById('ltStarCount').textContent) === '2', 'and counts them');
  await page.click('.lt-chip[data-kind=""]');
}

console.log('\n8. Two names: the companion layout');
{
  await page.click('.lt-seg-btn[data-layout="companion"]');
  await settle(500);
  const c = await page.evaluate(() => ({
    rows: [...document.querySelectorAll('.lt-row')].map((r) => r.dataset.role),
    twoNames: !!document.querySelector('[data-key="first1"]') && !!document.querySelector('[data-key="first2"]'),
    dates: ['born1', 'died1', 'born2', 'died2'].every((k) => document.querySelector(`[data-key="${k}"]`)),
    w: document.getElementById('ltCanvas').width, h: document.getElementById('ltCanvas').height,
  }));
  ck(c.rows.join() === 'top,family,first,dates,bottom,middle', 'family name, two first names, dates, a line under each and a center line', c.rows);
  ck(c.twoNames && c.dates, 'a box for each person\'s name and both of their dates');
  ck(Math.abs(c.h / c.w - 14 / 44) < 0.01, 'the marker is drawn at 44 x 14 proportions', c);
  await page.fill('[data-key="middle"]', 'Married June 1, 1960');
  await page.click('.lt-stone-btn[data-stone="bahama-blue"]');
  ck(await page.evaluate(() => /bahama-blue/.test(document.getElementById('ltGrid').style.getPropertyValue('--lt-bg'))),
    'the granite carries to the cards');
}

console.log('\n9. Download: a picture of exactly that marker, with a key to every line');
{
  const pic = await page.evaluate(async () => {
    const cv = await window.bwLetteringPicture();
    const d = cv.getContext('2d').getImageData(100, 100, 120, 60).data;   // the polished margin, top left
    let stone = 0; for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 69) < 45 && Math.abs(d[i + 2] - 82) < 45 && d[i + 2] >= d[i] - 6) stone++;
    return { w: cv.width, h: cv.height, stone };
  });
  ck(pic.w === 2400 && pic.h > 2400 * 14 / 44, `the picture is 2400 px wide with room for the key (${pic.w} x ${pic.h})`);
  ck(pic.stone > 3000, 'and shows the Bahama Blue that was picked', pic.stone);
  const key = await page.evaluate(() => window.bwLetteringKey().slice(0, 2).map((r) => r.label + ': ' + r.style));
  ck(key[0] === 'Granite: Bahama Blue' && key[1] === 'Engraving: Cut-in lettering, single outlined border', 'its key names the granite and the engraving', key);
  const dl = page.waitForEvent('download', { timeout: 30000 });
  await page.click('#ltDownload');
  const d = await dl;
  const path = (process.env.TEMP || '/tmp') + '/bw-lettering-' + process.pid + '.png';
  await d.saveAs(path);
  const bytes = fs.readFileSync(path); fs.unlinkSync(path);
  ck(d.suggestedFilename() === 'Marker lettering - Wilson.png', 'it downloads as "Marker lettering - Wilson.png"', d.suggestedFilename());
  ck(bytes.slice(1, 4).toString() === 'PNG' && bytes.length > 50000, `a real PNG (${Math.round(bytes.length / 1024)} KB)`);
}

console.log('\n10. Print: the picture on a sheet of its own, nothing else');
{
  await page.evaluate(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1; }; });
  await page.click('#ltPrint');
  await page.waitForFunction(() => window.__printed === 1, null, { timeout: 15000 });
  await page.emulateMedia({ media: 'print' });
  const p = await page.evaluate(() => ({
    cls: document.body.classList.contains('lettering-printing'),
    sheet: getComputedStyle(document.getElementById('ltSheet')).display,
    img: document.querySelector('#ltSheet img').naturalWidth,
    doc: getComputedStyle(document.querySelector('.doc-sheet')).display,
    title: document.title,
  }));
  await page.emulateMedia({ media: 'screen' });
  ck(p.cls && p.sheet === 'block' && p.img === 2400, 'the sheet prints the 2400 px picture', p);
  ck(p.doc === 'none', 'and the catalog itself is left out', p.doc);
  ck(p.title === 'Marker lettering - Wilson', 'Save as PDF names the file after the family', p.title);
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  ck(await page.evaluate(() => !document.body.classList.contains('lettering-printing')), 'afterwards the page is back to normal');
}

console.log('\n11. Kept on this device, and "Start over" clears it');
{
  await page.reload({ waitUntil: 'load' });
  await settle(300);
  const kept = await page.evaluate(() => ({
    layout: document.querySelector('.lt-seg-btn[aria-pressed="true"]').dataset.layout,
    middle: document.querySelector('[data-key="middle"]').value,
    stone: document.querySelector('.lt-stone-btn[aria-pressed="true"]').dataset.stone,
    stars: document.getElementById('ltStarCount').textContent,
  }));
  ck(kept.layout === 'companion' && kept.middle === 'Married June 1, 1960' && kept.stone === 'bahama-blue' && kept.stars === '2',
    'a reload brings back the layout, the words, the stone and the short list', kept);
  await page.click('#ltReset');
  await settle(300);
  const reset = await page.evaluate(() => ({
    layout: document.querySelector('.lt-seg-btn[aria-pressed="true"]').dataset.layout,
    rows: document.querySelectorAll('.lt-row').length,
    stored: JSON.parse(localStorage.getItem('bwLettering.v1') || '{}').layout,
  }));
  ck(reset.layout === 'single' && reset.rows === 5, 'Start over goes back to a fresh one-name marker', reset);
}

console.log('\n12. The page search and the design dropdowns still work around it');
{
  await page.fill('#searchInput', 'trajan');
  await page.waitForTimeout(250);
  let s = await page.evaluate(() => ({
    shown: [...document.querySelectorAll('.lt-card:not([hidden])')].map((c) => c.id),
    sec: !document.getElementById('sec-lettering').hidden, empty: !document.getElementById('emptyNote').hidden }));
  ck(s.sec && s.shown.join() === 'lt-trajan' && !s.empty, 'searching "trajan" finds the Trajan card', s);
  await page.fill('#searchInput', 'roses');
  await page.waitForTimeout(250);
  ck(await page.evaluate(() => document.getElementById('sec-lettering').hidden), 'a design search ("roses") folds the lettering away');
  await page.fill('#searchInput', 'zzqqxx');
  await page.waitForTimeout(250);
  ck(await page.evaluate(() => !document.getElementById('emptyNote').hidden), 'a search nothing answers still says so');
  await page.fill('#searchInput', '');
  await page.selectOption('#colorFilter', { index: 1 });
  ck(await page.evaluate(() => document.getElementById('sec-lettering').hidden), 'picking a granite color steps the lettering aside');
  await page.selectOption('#colorFilter', { index: 0 });
  ck(await page.evaluate(() => !document.getElementById('sec-lettering').hidden), 'clearing it brings it back');
  await page.emulateMedia({ media: 'print' });
  ck(await page.evaluate(() => getComputedStyle(document.getElementById('group-lettering')).display === 'none'),
    'an ordinary print of the catalog leaves the builder out');
  await page.emulateMedia({ media: 'screen' });
}

console.log('\n13. Every look-alike loads in the grid, and fits its card');
{
  const st = await page.evaluate(async () => {
    for (const c of document.querySelectorAll('.lt-card')) { c.scrollIntoView(); await new Promise((r) => setTimeout(r, 25)); }
    await document.fonts.ready;
    await new Promise((r) => setTimeout(r, 400));
    const cards = [...document.querySelectorAll('.lt-card')];
    return {
      notLoaded: cards.filter((c) => c.dataset.ff && ![...document.fonts].some((f) =>
        f.family.replace(/"/g, '') === c.dataset.ff && f.status === 'loaded')).map((c) => c.id),
      wrongFamily: cards.filter((c) => c.dataset.ff &&
        !getComputedStyle(c.querySelector('.lt-preview')).fontFamily.startsWith('"' + c.dataset.ff + '"')).map((c) => c.id),
      brokenImg: [...document.querySelectorAll('.lt-ref img')].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src),
      over: [...document.querySelectorAll('.lt-card .lt-line')].filter((l) => l.textContent && l.scrollWidth > l.clientWidth + 1).map((l) => l.closest('.lt-card').id),
    };
  });
  ck(st.notLoaded.length === 0, 'every look-alike font has loaded once its card scrolled into view', st.notLoaded);
  ck(st.wrongFamily.length === 0, 'every card is set in its own look-alike', st.wrongFamily);
  ck(st.brokenImg.length === 0, 'every PCM alphabet image loaded', st.brokenImg);
  ck(st.over.length === 0, 'no card\'s lettering runs out of its swatch', [...new Set(st.over)]);
}

console.log('\n14. On a phone: the marker first, one column, no sideways scroll');
{
  const phone = await open(390, 844);
  await phone.evaluate(async () => { document.getElementById('sec-lettering').scrollIntoView(); await new Promise((r) => setTimeout(r, 800)); });
  const p = await phone.evaluate(() => ({
    wide: document.documentElement.scrollWidth,
    cols: getComputedStyle(document.getElementById('ltGrid')).gridTemplateColumns.split(' ').length,
    markerFirst: document.querySelector('.lt-side').getBoundingClientRect().top < document.querySelector('.lt-rows').getBoundingClientRect().top,
    canvas: document.getElementById('ltCanvas').width > 0,
  }));
  ck(p.wide <= 390, `the page is ${p.wide}px wide on a 390px phone`);
  ck(p.cols === 1, 'one card per row');
  ck(p.markerFirst && p.canvas, 'the drawn marker sits above the line boxes');
  await phone.context().close();
}

ck(errs.length === 0, 'no page errors', errs);
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
