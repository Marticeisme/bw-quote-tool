// Gate for pcm-design-catalog.html — the PCM flat-marker design catalog.
//
// The page is GENERATED (scripts/pcm_extract.py -> data/pcm-catalog.json ->
// scripts/build_pcm_catalog.py), so the interesting failures are not typos: they are a
// silent drop in what got extracted, a card whose image 404s after a rename, a design
// whose number never made it onto the card, and the jump box — the one feature the
// operator asked for by name — quietly not finding a number any more.
//
// Everything is asserted against data/pcm-catalog.json and against the DOM, never
// against a constant this file also owns, EXCEPT the extraction census: those page
// ranges and counts are the flat-granite-only ruling written down, and a change in them
// is exactly what must fail loudly.
//
//   node scripts/verify_pcm_catalog.mjs            # standalone, against localhost
//   BW_BASE=http://localhost:4040/ node scripts/…  # or a pinned server
//
// tests/test-pcm-catalog.mjs runs the same checks inside `npm test`.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { assertNoMis } from './_no_mis_assert.mjs';

export const PAGE = 'pcm-design-catalog.html';
export const DATA = 'data/pcm-catalog.json';

// The flat-granite-only ruling, as numbers. Neither design book has an upright, slant,
// bench or bronze section — the only occurrences of those words are in the glossaries,
// which are outside every range below. "Silver Bronze" in the 2020 captions is a granite
// COLOR; 18 designs carry it and all 18 belong here.
export const CENSUS = {
  '2020': { firstPage: 6, lastPage: 95, designs: 354 },
  '2011': { firstPage: 6, lastPage: 94, designs: 346 },
  elements: { firstPage: 10, lastPage: 297, cats: 18 },
};

// PCM 2271 (GREENE) is printed under Companion/Religious on p.74 and again under
// Companion/Outdoors on p.82 — it carries both a cross and a mountain scene, so the book
// files it twice. Both cards ship; the art is one design and one file.
export const CROSS_LISTED = {
  '2011-2271': ['Companion Designs / Religious', 'Companion Designs / Outdoors'],
};

// Sample lookups. Each is a real number from a different book / a different element
// category, so a regression that breaks one index does not hide behind another.
export const LOOKUPS = [
  { q: '1183', id: '2011-1183' },
  { q: 'PCM 728', id: '2020-728' },
  { q: 'pcm1021', id: '2020-1021' },
  { q: 'BASS 001', id: 'BASS 001' },
  { q: 'praying hands 017', id: 'PRAYING HANDS 017' },
];

export async function run(ck, base) {
  const data = JSON.parse(fs.readFileSync(path.resolve(DATA), 'utf8'));
  const src = fs.readFileSync(path.resolve(PAGE), 'utf8');

  // ---- 1. the extraction census: flat granite only, from the pages we said ----
  for (const book of ['2020', '2011']) {
    const items = data.designs.filter((d) => d.book === book);
    const pages = items.map((d) => d.page);
    const c = CENSUS[book];
    ck(items.length === c.designs,
      `${book} book: ${items.length} designs (expected ${c.designs})`);
    ck(Math.min(...pages) >= c.firstPage && Math.max(...pages) <= c.lastPage,
      `${book} book: every design comes from pp. ${c.firstPage}-${c.lastPage} ` +
      `(saw ${Math.min(...pages)}-${Math.max(...pages)})`);
  }
  const ePages = data.elements.map((e) => e.page);
  ck(Math.min(...ePages) >= CENSUS.elements.firstPage &&
     Math.max(...ePages) <= CENSUS.elements.lastPage,
    `elements: every item comes from pp. ${CENSUS.elements.firstPage}-` +
    `${CENSUS.elements.lastPage} (saw ${Math.min(...ePages)}-${Math.max(...ePages)})`);
  ck(Object.keys(data.elementCats).length === CENSUS.elements.cats,
    `elements: ${Object.keys(data.elementCats).length} categories ` +
    `(expected ${CENSUS.elements.cats})`);
  ck(data.designs.every((d) => ['flat', 'ledger', 'individual', 'companion'].includes(d.fmt)),
    'every design is a flat marker, ledger or flat companion — no upright/slant/bench format');

  // Exactly one design is printed in two of the book's sections (see CROSS_LISTED). Any
  // OTHER repeat means the extractor matched one plate to two captions, so this asserts
  // the known set rather than merely tolerating duplicates.
  const cross = data.crossListed || {};
  ck(JSON.stringify(Object.keys(cross).sort()) === JSON.stringify(Object.keys(CROSS_LISTED).sort()),
    `only the documented cross-listings repeat a number (${Object.keys(cross).join(', ') || 'none'})`);
  for (const [id, groups] of Object.entries(CROSS_LISTED)) {
    ck(JSON.stringify((cross[id] || []).slice().sort()) === JSON.stringify(groups.slice().sort()),
      `${id} is listed in ${groups.join(' + ')}`);
    const imgs = new Set(data.designs.filter((d) => d.id === id).map((d) => d.img));
    ck(imgs.size === 1, `${id}'s two cards show the one design (${imgs.size} image path/s)`);
  }
  const inGroup = new Map();
  let groupDupes = 0;
  for (const d of data.designs) {
    const k = d.cat + '/' + d.sub + '/' + d.id;
    if (inGroup.has(k)) groupDupes++;
    inGroup.set(k, 1);
  }
  ck(groupDupes === 0, `no design appears twice inside one group (${groupDupes})`);
  const eDupes = data.elements.map((e) => e.code).filter((v, i, a) => a.indexOf(v) !== i);
  ck(eDupes.length === 0, `element codes are unique (${eDupes.slice(0, 4).join(', ') || 'none repeated'})`);

  // ---- 2. every referenced image is really on disk ----
  const all = [...data.designs, ...data.elements, ...data.photos, ...data.reference];
  const missing = all.map((x) => x.img).filter((p) => !fs.existsSync(path.resolve(p)));
  ck(missing.length === 0,
    `all ${all.length} referenced images exist on disk` +
    (missing.length ? ` — missing ${missing.length}, e.g. ${missing[0]}` : ''));

  // ---- 3. no prices, and no rendered "MIS" ----
  assertNoMis(ck, PAGE, src);
  const body = src.replace(/<!--[\s\S]*?-->/g, '');
  const money = body.match(/\$\s?[\d,]+(\.\d\d)?/g) || [];
  ck(money.length === 0,
    `no prices anywhere on a design-lookup page${money.length ? ' — found ' + money.slice(0, 3) : ''}`);

  // ---- 4. drive the page ----
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  try {
    await page.goto(base + PAGE, { waitUntil: 'networkidle' });

    const dom = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.design-card')];
      return {
        designs: cards.length,
        noImg: cards.filter((c) => !c.querySelector('.product-img img[src]')).length,
        noNum: cards.filter((c) => !/^PCM \d+$/.test(
          (c.querySelector('.pcm-number') || {}).textContent || '')).length,
        numMismatch: cards.filter((c) =>
          (c.querySelector('.pcm-number') || {}).textContent !== 'PCM ' + c.dataset.num).length,
        groups: [...document.querySelectorAll('.group[data-group-cat]')].map((g) => [
          g.dataset.groupCat + ' / ' + g.dataset.groupSub,
          g.querySelectorAll('.design-card').length,
          +g.querySelector('.group-count').textContent,
        ]),
        elCats: [...document.querySelectorAll('.el-cat')].map((e) => [
          e.dataset.elCat, +e.querySelector('.el-count').textContent]),
        count: document.getElementById('filterCount').textContent,
        photos: document.querySelectorAll('.photo-card').length,
        refs: document.querySelectorAll('.reference-card').length,
      };
    });

    ck(dom.designs === data.designs.length,
      `${dom.designs} design cards in the DOM, ${data.designs.length} in the data`);
    ck(dom.noImg === 0, `every design card carries an image (${dom.noImg} without)`);
    ck(dom.noNum === 0, `every design card shows a "PCM ####" number (${dom.noNum} without)`);
    ck(dom.numMismatch === 0,
      `every printed number matches its card's data (${dom.numMismatch} disagree)`);
    ck(dom.photos === data.photos.length,
      `${dom.photos} example photos rendered (${data.photos.length} in the data)`);
    ck(dom.refs === data.reference.length,
      `${dom.refs} reference plates rendered (${data.reference.length} in the data)`);

    // category counts: stated pill == cards present == the data's own census
    for (const [name, actual, stated] of dom.groups) {
      const [cat, sub] = name.split(' / ');
      const fromData = (data.designCats[cat] || {})[sub];
      ck(actual === stated && actual === fromData,
        `${name}: ${actual} cards, pill says ${stated}, data says ${fromData}`);
    }
    const domGroupTotal = dom.groups.reduce((s, g) => s + g[1], 0);
    ck(domGroupTotal === data.designs.length,
      `the groups account for every design (${domGroupTotal}/${data.designs.length})`);

    for (const [name, stated] of dom.elCats) {
      ck(stated === data.elementCats[name],
        `element category ${name}: pill says ${stated}, data says ${data.elementCats[name]}`);
    }

    // ---- 5. the jump box — the whole point of the page ----
    for (const { q, id } of LOOKUPS) {
      await page.fill('#pcmJump', q);
      await page.waitForTimeout(220);
      const hit = await page.evaluate(() => {
        const f = document.querySelector('.flash');
        return { id: f && f.dataset.id, note: document.getElementById('jumpNote').textContent };
      });
      ck(hit.id === id, `"${q}" jumps to ${id}` + (hit.id === id ? '' : ` — landed on ${hit.id}`));
    }
    await page.fill('#pcmJump', '999999');
    await page.waitForTimeout(200);
    const missNote = await page.textContent('#jumpNote');
    ck(/No design or element numbered/.test(missNote),
      `an unknown number says so instead of failing silently ("${missNote}")`);
    await page.fill('#pcmJump', '');

    // ---- 6. search, including into an unopened element category ----
    await page.fill('#searchInput', 'salmon');
    await page.waitForTimeout(320);
    const salmon = await page.evaluate(() => ({
      count: document.getElementById('filterCount').textContent,
      visible: [...document.querySelectorAll('.el-cat:not([hidden]) .element-card')]
        .filter((c) => c.style.display !== 'none').map((c) => c.dataset.id),
    }));
    const expectSalmon = data.elements.filter((e) => /salmon/i.test(e.code)).length;
    ck(salmon.visible.length === expectSalmon && expectSalmon > 0,
      `searching "salmon" reveals ${salmon.visible.length} elements from a category that ` +
      `was never opened (${expectSalmon} exist)`);

    await page.fill('#searchInput', 'zzzznotathing');
    await page.waitForTimeout(320);
    const none = await page.evaluate(() => ({
      designs: [...document.querySelectorAll('.design-card')].filter((c) => c.style.display !== 'none').length,
      empty: !document.getElementById('emptyNote').hidden,
    }));
    ck(none.designs === 0 && none.empty, 'a no-match search empties the page and says so');

    await page.fill('#searchInput', '');
    await page.waitForTimeout(320);
    const back = await page.evaluate(() =>
      [...document.querySelectorAll('.design-card')].filter((c) => c.style.display !== 'none').length);
    ck(back === data.designs.length, `clearing the search restores all ${back} designs`);

    // ---- 7. facets ----
    const color = data.designs.find((d) => d.color).color;
    await page.selectOption('#colorFilter', color);
    await page.waitForTimeout(320);
    const shown = await page.evaluate(() =>
      [...document.querySelectorAll('.design-card')].filter((c) => c.style.display !== 'none').length);
    const want = data.designs.filter((d) => d.color === color).length;
    ck(shown === want, `granite color "${color}" filters to ${shown} designs (${want} exist)`);
    await page.click('#clearFilters');
    await page.waitForTimeout(320);
    const cleared = await page.evaluate(() =>
      [...document.querySelectorAll('.design-card')].filter((c) => c.style.display !== 'none').length);
    ck(cleared === data.designs.length, `Clear restores all ${cleared} designs`);

    // ---- 8. page health ----
    // The lightbox <img> carries no src until something is clicked; an image with no src
    // is not a broken image, and counting it would have made this check permanently red.
    const broken = await page.evaluate(() =>
      [...document.images].filter((i) => i.getAttribute('src') && i.complete && i.naturalWidth === 0)
        .map((i) => i.getAttribute('src')));
    ck(broken.length === 0,
      `no broken images${broken.length ? ' — e.g. ' + broken.slice(0, 3).join(', ') : ''}`);
    ck(errors.length === 0, `no JS errors${errors.length ? ' — ' + errors[0] : ''}`);
  } finally {
    await browser.close();
  }
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` ||
    process.argv[1].endsWith('verify_pcm_catalog.mjs')) {
  let pass = 0, fail = 0;
  const ck = (cond, msg) => {
    if (cond) { pass++; console.log('  PASS  ' + msg); }
    else { fail++; console.log('  FAIL  ' + msg); }
  };
  const base = process.env.BW_BASE || 'http://localhost:3737/';
  await run(ck, base.endsWith('/') ? base : base + '/');
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
