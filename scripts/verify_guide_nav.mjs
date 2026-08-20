// THE GUIDES SIDEBAR GATE — guide-nav.js, as assertions.
//
//   node scripts/verify_guide_nav.mjs      # standalone
//   tests/test-guide-nav.mjs               # the same checks inside `npm test`
//
// The sidebar is one shared file included by one line on every in-scope page. That shape
// is exactly why it needs a gate: nothing in the build forces a NEW guide to carry the
// tag, nothing forces a REGENERATED catalog to keep it, and nothing forces the nav model
// to keep pointing at pages that still exist. Each of those failures is silent — the page
// simply renders with no sidebar and nobody notices until a counselor is in front of a
// family.
//
// WHAT IS ASSERTED, on the SERVED pages (never on disk bytes alone):
//   SCOPE    the in-scope set is DERIVED FROM DISK, not restated here: every
//            `*-guide.html` plus the named prose pages, catalogs and the hub. A guide
//            added tomorrow is covered the day it lands, and a page that quietly loses
//            its tag fails the same day.
//   TAG      every in-scope page serves EXACTLY ONE guide-nav.js script tag (two would
//            be a generator emitting what a hand edit already added); every out-of-scope
//            page — index.html above all — serves ZERO.
//   MODEL    every href in the nav model resolves 200, and every in-scope page appears
//            in the model exactly once. No orphans: flush-markers.html has no card on
//            guides.html at all (the s24 finding) and the sidebar is its only home.
//   ACTIVE   each page marks exactly one item current, and it is that page's own item.
//   PRINT    under print emulation NOTHING injected is visible and the body offset is
//            zero, so the printed page and the built PDFs are what they always were.
//   FAMILY   pcm-design-catalog.html?family renders ZERO nav DOM — that link is handed
//            to a family precisely because it is navigation-free — while the lookalike
//            ?familyx=1 still shows it. The bail-out matches the head script emitted by
//            build_pcm_catalog.py; a regex that drifted apart from it would either break
//            the family link or swallow ordinary pages.
//   DRAWER   at 375px the sidebar is off-screen behind one menu button, opens on tap,
//            and closes on both Escape and a backdrop tap.
//
// The gate serves the CURRENT tree on its own free port via scripts/_print-server.mjs and
// still calls assertServesThisTree() before its first assertion — the standing rule after
// the sprint-12 port-3737 scar, where a verifier graded another worktree's files.
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { ROOT, startPrintServer } from './_print-server.mjs';
import { assertServesThisTree } from './served-tree-check.mjs';

// Pages that are in scope but do NOT match *-guide.html.
const EXTRA_IN_SCOPE = [
  'direct-cremation.html', 'outside-marker-rules.html', 'flush-markers.html',
  'all-caskets.html', 'metal-caskets.html', 'wood-caskets.html',
  'cremation-containers-rental-caskets.html', 'pcm-design-catalog.html',
  'guides.html',
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

export async function run(ck) {
  const PAGES = inScopePages();
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

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage();

  try {
    // ---------------------------------------------------------------- TAG
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
    await page.goto(base + 'guides.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.BW_GUIDE_NAV, null, { timeout: 10000 });
    const model = await page.evaluate(() => window.BW_GUIDE_NAV);

    ck(!!model && Array.isArray(model.sections) && model.sections.length > 0,
      `nav model is exported: ${model ? model.sections.length : 0} sections`);

    const hrefs = [model.home.href, ...model.sections.flatMap((s) => s.items.map((i) => i.href))];
    ck(new Set(hrefs).size === hrefs.length,
      `nav model lists every href once (${hrefs.length} entries, ${new Set(hrefs).size} unique)`);

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

    // ---------------------------------------------------------------- ACTIVE + INJECTION
    for (const p of PAGES) {
      await page.goto(base + p, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#bwGuideNav', { timeout: 15000 }).catch(() => {});
      const got = await page.evaluate(() => {
        const nav = document.getElementById('bwGuideNav');
        if (!nav) return null;
        const act = [...nav.querySelectorAll('.gnav-active')];
        return {
          present: true,
          drop: nav.getAttribute('data-pdf'),
          count: act.length,
          href: act.length === 1 ? act[0].getAttribute('href') : null,
          current: act.length === 1 ? act[0].getAttribute('aria-current') : null,
          onClass: document.documentElement.classList.contains('gnav-on'),
          visible: nav.getBoundingClientRect().width > 100,
          // the prose guides use a bare `.sidebar` class for their pull-out boxes;
          // the injected panel must never claim it
          stealsSidebar: nav.classList.contains('sidebar'),
        };
      });
      ck(!!got && got.present, `${p}: sidebar injected`);
      if (!got || !got.present) continue;
      ck(got.count === 1, `${p}: exactly one active item (got ${got.count})`);
      ck(got.href && got.href.split('/').pop().toLowerCase() === p.toLowerCase(),
        `${p}: the active item is this page (${got.href})`);
      ck(got.current === 'page', `${p}: the active item carries aria-current="page"`);
      ck(got.drop === 'drop', `${p}: the injected nav carries data-pdf="drop"`);
      ck(got.onClass, `${p}: <html> carries gnav-on so the body offset applies`);
      ck(got.visible, `${p}: the sidebar is visible at desktop width`);
      ck(!got.stealsSidebar, `${p}: the panel does not claim the page's own .sidebar class`);
    }

    // ---------------------------------------------------------------- PRINT
    for (const p of ['burial-guide.html', 'all-caskets.html', 'guides.html', 'pcm-design-catalog.html']) {
      await page.goto(base + p, { waitUntil: 'domcontentloaded' });
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
        `${p}: under print emulation nothing injected is visible (shown: ${seen.shown.join(',') || 'none'})`);
      ck(seen.pad === '0px', `${p}: under print emulation the body offset is 0 (got ${seen.pad})`);
    }

    // ---------------------------------------------------------------- FAMILY VIEW
    await page.goto(base + 'pcm-design-catalog.html?family', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    const fam = await page.evaluate(() => ({
      nav: document.querySelectorAll('#bwGuideNav,#bwGuideNavToggle,#bwGuideNavBackdrop,#bwGuideNavStyle').length,
      links: document.querySelectorAll('.gnav-link').length,
      cls: document.documentElement.className,
    }));
    ck(fam.nav === 0 && fam.links === 0,
      `?family renders ZERO nav DOM (nodes ${fam.nav}, links ${fam.links})`);
    ck(/family-view/.test(fam.cls), '?family still sets html.family-view (the page\'s own head script)');
    ck(!/gnav-on/.test(fam.cls), '?family does not get the gnav-on body offset');

    await page.goto(base + 'pcm-design-catalog.html?familyx=1', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#bwGuideNav', { timeout: 15000 }).catch(() => {});
    const lookalike = await page.evaluate(() => ({
      nav: !!document.getElementById('bwGuideNav'),
      cls: document.documentElement.className,
    }));
    ck(lookalike.nav, '?familyx=1 is NOT a family view: the sidebar is injected');
    ck(!/family-view/.test(lookalike.cls), '?familyx=1 does not set html.family-view either');

    // ---------------------------------------------------------------- DRAWER (375px)
    const phone = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const pp = await phone.newPage();
    await pp.goto(base + 'burial-guide.html', { waitUntil: 'domcontentloaded' });
    await pp.waitForSelector('#bwGuideNavToggle', { timeout: 15000 });

    const offscreen = () => pp.evaluate(() => {
      const n = document.getElementById('bwGuideNav');
      const r = n.getBoundingClientRect();
      return { right: Math.round(r.right), open: n.classList.contains('gnav-open') };
    });
    const toggleVisible = await pp.isVisible('#bwGuideNavToggle');
    ck(toggleVisible, '375px: the menu button is the one visible control');
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

    await pp.keyboard.press('Escape');
    await pp.waitForTimeout(350);
    st = await offscreen();
    ck(!st.open && st.right <= 0, `375px: Escape closes the drawer (right ${st.right}px)`);

    await pp.click('#bwGuideNavToggle');
    await pp.waitForTimeout(350);
    await pp.mouse.click(340, 400);          // on the backdrop, right of the 250px panel
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
