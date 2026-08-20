// THE GUIDES SIDEBAR GATE — guide-nav.js, as assertions.
//
//   node scripts/verify_guide_nav.mjs      # standalone
//   tests/test-guide-nav.mjs               # the same checks inside `npm test`
//
// The sidebar is one shared file included by one line on every in-scope page, and since
// s25 that file decides for itself that only guides.html gets a panel. Both halves of
// that shape need a gate. Nothing in the build forces a NEW guide to carry the tag,
// nothing forces a REGENERATED catalog to keep it, nothing forces the nav model to keep
// pointing at pages that still exist — and nothing but this file stops the hub-only
// ruling from quietly becoming an every-page sidebar again the next time someone edits
// the injection condition. Each of those failures is silent.
//
// WHAT IS ASSERTED, on the SERVED pages (never on disk bytes alone):
//   SCOPE    the in-scope set is DERIVED FROM DISK, not restated here: every
//            `*-guide.html` plus the named prose pages, catalogs and the hub. A guide
//            added tomorrow is covered the day it lands, and a page that quietly loses
//            its tag fails the same day.
//   TAG      every in-scope page serves EXACTLY ONE guide-nav.js script tag (two would
//            be a generator emitting what a hand edit already added); every out-of-scope
//            page — index.html above all — serves ZERO. The WIRING is unchanged by the
//            hub-only ruling and stays asserted: the tag is what makes re-enabling the
//            sidebar elsewhere a one-line change instead of a 33-file sweep.
//   HUB      guides.html injects the panel, and the panel carries the brand masthead:
//            a real <img> of logo.svg that actually decoded, at the height the design
//            calls for. "The logo is there" is the operator's ask, and an <img> with a
//            broken src still satisfies a naive querySelector, so the natural size is
//            asserted too.
//   QUIET    every OTHER in-scope page injects ZERO nav DOM — no panel, no style tag, no
//            menu button, no backdrop — and no gnav-on class and no body offset, so the
//            guide is exactly the page it was before the sidebar existed. This is the
//            s25 operator ruling and it is asserted page by page, not sampled.
//   MODEL    every href in the nav model resolves 200, and every in-scope page appears
//            in the model exactly once. No orphans: flush-markers.html has no card on
//            guides.html at all (the s24 finding) and the sidebar is its only home.
//   ACTIVE   the hub marks exactly one item current and it is the hub's own All Guides
//            row.
//   PRINT    under print emulation NOTHING injected is visible and the body offset is
//            zero, so the printed page and the built PDFs are what they always were.
//   FAMILY   ?family renders ZERO nav DOM — on the hub as well as on the catalog, since
//            a family-safe link is navigation-free wherever it points — while the
//            lookalike ?familyx=1 still shows the sidebar on the hub. The bail-out
//            matches the head script emitted by build_pcm_catalog.py; a regex that
//            drifted apart from it would either break the family link or swallow
//            ordinary pages.
//   DRAWER   at 375px on the hub the sidebar is off-screen behind one menu button, opens
//            on tap, and closes on both Escape and a backdrop tap.
//
// The gate serves the CURRENT tree on its own free port via scripts/_print-server.mjs and
// still calls assertServesThisTree() before its first assertion — the standing rule after
// the sprint-12 port-3737 scar, where a verifier graded another worktree's files.
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { ROOT, startPrintServer } from './_print-server.mjs';
import { assertServesThisTree } from './served-tree-check.mjs';

// The one page that gets a sidebar (s25).
const HUB = 'guides.html';

// Pages that are in scope but do NOT match *-guide.html.
const EXTRA_IN_SCOPE = [
  'direct-cremation.html', 'outside-marker-rules.html', 'flush-markers.html',
  'all-caskets.html', 'metal-caskets.html', 'wood-caskets.html',
  'cremation-containers-rental-caskets.html', 'pcm-design-catalog.html',
  HUB,
];

// Deliberately OUT of scope. index.html is the quote tool and must stay byte-untouched;
// the letters and the worksheet are operator tooling; the professional reference is
// internal; the maps have their own chrome.
const OUT_OF_SCOPE = [
  'index.html', 'payment-options-letter.html', 'deed-transfer-letter.html',
  'followup-letter.html', 'vital-worksheet.html', 'dashboard.html', 'viewer.html',
  'medicaid-professional-reference.html',
  'MAPS/COM_CryptMap.html', 'MAPS/ROAC_NicheMap.html',
];

export function inScopePages() {
  const guides = fs.readdirSync(ROOT)
    .filter((f) => /-guide\.html$/.test(f))
    .filter((f) => f !== 'medicaid-professional-reference.html');
  return [...new Set([...guides, ...EXTRA_IN_SCOPE])].sort();
}

const TAG_RE = /<script[^>]+src\s*=\s*["']guide-nav\.js["'][^>]*>/gi;

// Everything guide-nav.js can put on a page. "Injects nothing" means all of it is absent.
const PROBE = () => ({
  nodes: document.querySelectorAll(
    '#bwGuideNav,#bwGuideNavToggle,#bwGuideNavBackdrop,#bwGuideNavStyle').length,
  links: document.querySelectorAll('.gnav-link,.gnav-home').length,
  onClass: document.documentElement.classList.contains('gnav-on'),
  pad: getComputedStyle(document.body).paddingLeft,
});

export async function run(ck) {
  const PAGES = inScopePages();
  const OTHERS = PAGES.filter((p) => p !== HUB);
  const srv = await startPrintServer();
  const base = srv.base + '/';

  // FIRST assertion, before anything else reads a served byte.
  let served = true;
  try {
    await assertServesThisTree(base, ROOT, 'verify_guide_nav.mjs');
  } catch (e) {
    served = false;
    console.log('    ' + String(e.message).split('\n')[0]);
  }
  ck(served, 'served-tree check: the port under test serves THIS tree');
  if (!served) { srv.stop(); return; }

  ck(fs.existsSync(path.join(ROOT, 'guide-nav.js')), 'guide-nav.js exists at the repo root');
  ck(PAGES.length >= 34, `in-scope set derived from disk: ${PAGES.length} pages (>= 34)`);
  ck(PAGES.includes(HUB), `the hub ${HUB} is in the in-scope set`);
  ck(OTHERS.length >= 33, `${OTHERS.length} non-hub in-scope pages to prove quiet (>= 33)`);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage();

  try {
    // ---------------------------------------------------------------- TAG (wiring)
    for (const p of PAGES) {
      const r = await fetch(base + p);
      const html = r.ok ? await r.text() : '';
      const n = (html.match(TAG_RE) || []).length;
      ck(r.ok && n === 1, `${p}: serves exactly one guide-nav.js tag (got ${r.ok ? n : 'HTTP ' + r.status})`);
    }
    for (const p of OUT_OF_SCOPE) {
      const r = await fetch(base + p);
      if (!r.ok) { ck(true, `${p}: not served here, nothing to leak into`); continue; }
      const n = ((await r.text()).match(TAG_RE) || []).length;
      ck(n === 0, `${p}: OUT of scope, serves zero guide-nav.js tags (got ${n})`);
    }

    // ---------------------------------------------------------------- MODEL
    await page.goto(base + HUB, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.BW_GUIDE_NAV, null, { timeout: 10000 });
    const model = await page.evaluate(() => window.BW_GUIDE_NAV);

    ck(!!model && Array.isArray(model.sections) && model.sections.length > 0,
      `nav model is exported: ${model ? model.sections.length : 0} sections`);

    const hrefs = [model.home.href, ...model.sections.flatMap((s) => s.items.map((i) => i.href))];
    ck(new Set(hrefs).size === hrefs.length,
      `nav model lists every href once (${hrefs.length} entries, ${new Set(hrefs).size} unique)`);
    ck(model.home.href === HUB, `the nav model's home row is the hub (${model.home.href})`);

    for (const h of hrefs) {
      const r = await fetch(base + h);
      ck(r.ok, `nav href resolves: ${h} (HTTP ${r.status})`);
    }

    // No orphans, in both directions, over the in-scope set.
    const navSet = new Set(hrefs.map((h) => h.split('/').pop().toLowerCase()));
    for (const p of PAGES) {
      ck(navSet.has(p.toLowerCase()), `nav model covers the in-scope page ${p}`);
    }
    ck(navSet.has('flush-markers.html'),
      'flush-markers.html is in the nav model (it has no guides.html card — s24 orphan)');

    // Voice: no em dashes in anything a family reads off the sidebar.
    const labels = [model.home.label, ...model.sections.flatMap((s) => [s.name, ...s.items.map((i) => i.label)])];
    ck(!labels.some((l) => /—/.test(l)), 'no em dash in any visible nav label');
    ck(labels.every((l) => l.trim().length > 0 && l.length <= 40),
      'every nav label is a short page name (non-empty, <= 40 chars)');

    // ---------------------------------------------------------------- HUB: the panel
    await page.goto(base + HUB, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#bwGuideNav', { timeout: 15000 }).catch(() => {});
    const hub = await page.evaluate(() => {
      const nav = document.getElementById('bwGuideNav');
      if (!nav) return null;
      const act = [...nav.querySelectorAll('.gnav-active')];
      const img = nav.querySelector('.gnav-head img.gnav-logo');
      const head = nav.querySelector('.gnav-head');
      const hr = head ? head.getBoundingClientRect() : null;
      return {
        drop: nav.getAttribute('data-pdf'),
        count: act.length,
        href: act.length === 1 ? act[0].getAttribute('href') : null,
        current: act.length === 1 ? act[0].getAttribute('aria-current') : null,
        onClass: document.documentElement.classList.contains('gnav-on'),
        width: Math.round(nav.getBoundingClientRect().width),
        // the prose guides use a bare `.sidebar` class for their pull-out boxes;
        // the injected panel must never claim it
        stealsSidebar: nav.classList.contains('sidebar'),
        links: nav.querySelectorAll('.gnav-link').length,
        sections: nav.querySelectorAll('.gnav-sec').length,
        // the masthead
        logoSrc: img ? img.getAttribute('src') : null,
        logoAlt: img ? img.getAttribute('alt') : null,
        logoDecoded: !!img && img.complete && img.naturalWidth > 0,
        logoH: img ? Math.round(img.getBoundingClientRect().height) : 0,
        logoW: img ? Math.round(img.getBoundingClientRect().width) : 0,
        est: (nav.querySelector('.gnav-est') || {}).textContent || '',
        headH: hr ? Math.round(hr.height) : 0,
        headTop: hr ? Math.round(hr.top) : -1,
        headBg: head ? getComputedStyle(head).backgroundColor : '',
        pageHeadH: (() => {
          const h = document.querySelector('.header-inner');
          return h ? Math.round(h.getBoundingClientRect().height) : 0;
        })(),
      };
    });
    ck(!!hub, `${HUB}: the sidebar IS injected on the hub`);
    if (hub) {
      ck(hub.count === 1, `${HUB}: exactly one active item (got ${hub.count})`);
      ck(hub.href === HUB, `${HUB}: the active item is the All Guides row (${hub.href})`);
      ck(hub.current === 'page', `${HUB}: the active item carries aria-current="page"`);
      ck(hub.drop === 'drop', `${HUB}: the injected nav carries data-pdf="drop"`);
      ck(hub.onClass, `${HUB}: <html> carries gnav-on so the body offset applies`);
      ck(hub.width > 100, `${HUB}: the sidebar is visible at desktop width (${hub.width}px)`);
      ck(!hub.stealsSidebar, `${HUB}: the panel does not claim the page's own .sidebar class`);
      ck(hub.links >= 40, `${HUB}: the whole nav model is rendered (${hub.links} links)`);
      ck(hub.sections >= 6, `${HUB}: every section is rendered (${hub.sections})`);

      // MASTHEAD — the operator's ask, asserted as a real decoded image.
      ck(hub.logoSrc === 'logo.svg',
        `${HUB}: the masthead carries logo.svg, the white-on-navy lockup (got ${hub.logoSrc})`);
      ck(hub.logoDecoded, `${HUB}: the masthead logo actually decoded (not a broken img)`);
      ck(hub.logoH >= 24 && hub.logoH <= 40,
        `${HUB}: the masthead logo is at brand size (${hub.logoH}px tall)`);
      ck(hub.logoW > hub.logoH * 3,
        `${HUB}: the masthead logo keeps the lockup aspect (${hub.logoW}x${hub.logoH})`);
      ck(hub.logoAlt === 'Bonney Watson', `${HUB}: the masthead logo has its alt text`);
      ck(/Est\. 1868/.test(hub.est),
        `${HUB}: the masthead carries the site's Est. 1868 line (got "${hub.est}")`);
      ck(hub.headH === hub.pageHeadH && hub.pageHeadH > 0,
        `${HUB}: the masthead is the height of the page's own header (${hub.headH} vs ${hub.pageHeadH})`);
      ck(hub.headTop === 0, `${HUB}: the masthead sits at the top of the panel (${hub.headTop})`);
      ck(hub.headBg === 'rgb(28, 44, 54)',
        `${HUB}: the masthead is the page's chrome navy #1c2c36 (got ${hub.headBg})`);
    }

    // The masthead logo has to be a file the server actually has.
    const logoRes = await fetch(base + 'logo.svg');
    ck(logoRes.ok, `logo.svg resolves for the masthead (HTTP ${logoRes.status})`);

    // The masthead stays put while the panel scrolls — it is the left cap of a sticky
    // header, so scrolling it away would leave paper butted against navy.
    const pinned = await page.evaluate(() => {
      const nav = document.getElementById('bwGuideNav');
      nav.scrollTop = 99999;
      const h = nav.querySelector('.gnav-head').getBoundingClientRect();
      return { scrolled: nav.scrollTop > 100, top: Math.round(h.top) };
    });
    ck(pinned.scrolled && pinned.top === 0,
      `${HUB}: the masthead stays pinned while the panel scrolls (top ${pinned.top})`);

    // ---------------------------------------------------------- QUIET everywhere else
    for (const p of OTHERS) {
      await page.goto(base + p, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(120);
      const got = await page.evaluate(PROBE);
      ck(got.nodes === 0 && got.links === 0,
        `${p}: injects ZERO nav DOM (nodes ${got.nodes}, links ${got.links})`);
      ck(!got.onClass, `${p}: <html> does not carry gnav-on`);
      ck(got.pad === '0px', `${p}: full reading width is preserved (padding-left ${got.pad})`);
    }

    // ---------------------------------------------------------------- PRINT (hub)
    await page.goto(base + HUB, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#bwGuideNav', { timeout: 15000 }).catch(() => {});
    await page.emulateMedia({ media: 'print' });
    const seen = await page.evaluate(() => {
      const ids = ['bwGuideNav', 'bwGuideNavToggle', 'bwGuideNavBackdrop'];
      const shown = ids.filter((id) => {
        const n = document.getElementById(id);
        return n && getComputedStyle(n).display !== 'none';
      });
      return { shown, pad: getComputedStyle(document.body).paddingLeft };
    });
    await page.emulateMedia({ media: 'screen' });
    ck(seen.shown.length === 0,
      `${HUB}: under print emulation nothing injected is visible (shown: ${seen.shown.join(',') || 'none'})`);
    ck(seen.pad === '0px', `${HUB}: under print emulation the body offset is 0 (got ${seen.pad})`);

    // The guide pages inject nothing at all, so their printed output cannot have changed.
    for (const p of ['burial-guide.html', 'all-caskets.html', 'pcm-design-catalog.html']) {
      await page.goto(base + p, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(120);
      await page.emulateMedia({ media: 'print' });
      const q = await page.evaluate(PROBE);
      await page.emulateMedia({ media: 'screen' });
      ck(q.nodes === 0 && q.pad === '0px',
        `${p}: under print emulation there is nothing to hide (nodes ${q.nodes}, pad ${q.pad})`);
    }

    // ---------------------------------------------------------------- FAMILY VIEW
    for (const p of ['pcm-design-catalog.html?family', HUB + '?family']) {
      await page.goto(base + p, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);
      const fam = await page.evaluate(PROBE);
      ck(fam.nodes === 0 && fam.links === 0,
        `${p}: renders ZERO nav DOM (nodes ${fam.nodes}, links ${fam.links})`);
      ck(!fam.onClass, `${p}: does not get the gnav-on body offset`);
    }
    const catCls = await (async () => {
      await page.goto(base + 'pcm-design-catalog.html?family', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(300);
      return page.evaluate(() => document.documentElement.className);
    })();
    ck(/family-view/.test(catCls),
      '?family still sets html.family-view on the catalog (the page\'s own head script)');

    await page.goto(base + HUB + '?familyx=1', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#bwGuideNav', { timeout: 15000 }).catch(() => {});
    const lookalike = await page.evaluate(() => ({
      nav: !!document.getElementById('bwGuideNav'),
      cls: document.documentElement.className,
    }));
    ck(lookalike.nav, '?familyx=1 is NOT a family view: the hub sidebar is injected');
    ck(!/family-view/.test(lookalike.cls), '?familyx=1 does not set html.family-view either');

    // ---------------------------------------------------------------- DRAWER (375px)
    const phone = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const pp = await phone.newPage();

    // The drawer is the hub's too — a guide page has no button to tap.
    await pp.goto(base + 'burial-guide.html', { waitUntil: 'domcontentloaded' });
    await pp.waitForTimeout(300);
    ck(await pp.evaluate(() => !document.getElementById('bwGuideNavToggle')),
      '375px: a guide page has no menu button either');

    await pp.goto(base + HUB, { waitUntil: 'domcontentloaded' });
    await pp.waitForSelector('#bwGuideNavToggle', { timeout: 15000 });

    const offscreen = () => pp.evaluate(() => {
      const n = document.getElementById('bwGuideNav');
      const r = n.getBoundingClientRect();
      return { right: Math.round(r.right), open: n.classList.contains('gnav-open') };
    });
    ck(await pp.isVisible('#bwGuideNavToggle'), '375px: the menu button is the one visible control');
    ck(await pp.evaluate(() => getComputedStyle(document.body).paddingLeft) === '0px',
      '375px: full reading width is preserved (no body offset)');
    let st = await offscreen();
    ck(st.right <= 0 && !st.open, `375px: the drawer starts off-screen (right ${st.right}px)`);

    await pp.click('#bwGuideNavToggle');
    await pp.waitForTimeout(350);
    st = await offscreen();
    ck(st.open && st.right > 100, `375px: tapping the button opens the drawer (right ${st.right}px)`);
    ck(await pp.getAttribute('#bwGuideNavToggle', 'aria-expanded') === 'true',
      '375px: the button reports aria-expanded="true" while open');
    ck(await pp.evaluate(() => document.activeElement && document.activeElement.closest('#bwGuideNav') !== null),
      '375px: focus moves into the drawer when it opens');
    ck(await pp.evaluate(() => {
      const i = document.querySelector('#bwGuideNav .gnav-head img.gnav-logo');
      return !!i && i.complete && i.naturalWidth > 0 && i.getBoundingClientRect().height > 20;
    }), '375px: the drawer carries the same brand masthead');

    await pp.keyboard.press('Escape');
    await pp.waitForTimeout(350);
    st = await offscreen();
    ck(!st.open && st.right <= 0, `375px: Escape closes the drawer (right ${st.right}px)`);

    await pp.click('#bwGuideNavToggle');
    await pp.waitForTimeout(350);
    await pp.mouse.click(350, 400);          // on the backdrop, right of the panel
    await pp.waitForTimeout(350);
    st = await offscreen();
    ck(!st.open && st.right <= 0, `375px: a backdrop tap closes the drawer (right ${st.right}px)`);
    await phone.close();
  } finally {
    await browser.close();
    srv.stop();
  }
}

// Standalone entry point.
if (process.argv[1] && process.argv[1].endsWith('verify_guide_nav.mjs')) {
  let pass = 0, fail = 0;
  await run((c, m) => { if (c) { pass++; console.log('  PASS  ' + m); } else { fail++; console.log('  FAIL  ' + m); } });
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
