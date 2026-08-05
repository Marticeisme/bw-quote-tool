// THE FAMILY-PDF LOCK-IN — docs/PDF_DEBRIEF.md's rules 2, 5 and 3, as assertions.
//
//   node scripts/verify_family_type.mjs            # standalone
//   node scripts/verify_family_type.mjs --probe    # list every sub-floor element, assert nothing
//   tests/test-family-type.mjs                     # the same checks inside `npm test`
//
// Sprint-16 built the `?print=family` cut across the guides; this file is what stops it
// decaying back into what the debrief found: 7.7pt type ("no computed body type below
// 10pt"), a two-column 8pt broadsheet ("one column"), and cards with no number on them
// ("every property card carries a range or a band; ask is a last resort, not a default").
//
// What is asserted, per family-built guide, on the SERVED page under print emulation:
//   TYPE    every element that directly holds visible text computes >= 10pt, except the
//           named component conventions below (labels, kickers, footers — the reference
//           build itself sets those small, and they are furniture, not body type).
//   FLOW    `.doc-sheet` and every `.section` compute column-count auto/1 (the sheet-level
//           two-column flow is what the debrief killed; COMPONENT columns like the
//           charge list's two-up name+half-sentence grid are the debrief's own structure
//           item 4 and are allowed), and NOTHING computes column-span:all (the s16
//           Track B/D finding: span-all fragments a one-column flow into page jumps).
//   MODE    <html data-print-mode="family"> is actually set — a job URL that silently
//           stops selecting would otherwise print the full document at family caps.
//   ASK     across the photo-first guides, `.pf-price.pf-ask` appears EXACTLY where the
//           exemption table says and nowhere else. Today that is ECL's "larger units"
//           card — a genuine last-resort ask (no data module carries a larger-unit
//           range). A new ask-card is a named failure, not a default anyone can reach for.
//
// The job list is read from build_guide_pdfs.mjs rather than restated here, so a guide
// added to the build is covered the day it lands or fails the day its mode string typos.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { ROOT, startPrintServer } from './_print-server.mjs';

// Component conventions allowed under the 10pt floor. Every entry is a deliberate piece
// of furniture whose size the reference build (reference-docs/cemetery-property-
// condensed.pdf) itself established. Anything else under the floor is a failure.
const UNDER_FLOOR_OK = [
  // shared components, sizes set by the reference build
  '.cover-kicker', '.section-label', '.section-kicker', '.pf-kind', '.pf-price-label',
  '.pf-full', '.doc-footer', '.cmp-eyebrow', '.card-tag', '.rule-icon', 'figcaption',
  '.photo-caption', '.fs-detail', '.compare-table th', '.plan-note', '.provenance',
  '.masthead-addr', '.fineprint', '.print-invite', '.kicker', '.sidebar-label',
  // notes and footnotes: one-line asides in the notes convention, not body type
  '.note-inline',
  // markers-guide: the scale drawings' internal legends and the true-size guide -- tiny
  // BY DESIGN, they live inside drawn markers ('28 x 16', 'Single', the G1/G2 colour
  // chips) and the whole point is that the drawing stays to scale
  '.scale-guide', '.scale-key', '.scale-marker', '.tsg-section', '.tsg-legend-item',
  '.price-table caption',
  // card/plan furniture: type chips, price labels, footer subtotal lines
  '.opt-type', '.plan-price-block', '.plan-footer', '.tier-badge', '.vault-intro-label',
  '.color-group', '.color-swatch', '.tsg-note', '.direct-panel', '.direct-option',
  '.plan-divider', '.label-sub',
  // provenance footnotes (the fee-provenance sentences the range gates assert), the
  // urn-vault card labels, table size-notes, photo captions, and the ask-line itself
  '.footnote', '.uv-card-body', '.size-note', '.section-photo', '.pf-ask',
];
const FLOOR_PX = 13.2;               // 10pt = 13.33px, minus sub-pixel rounding headroom

// .pf-price.pf-ask exemptions: guide -> exact expected count.
const ASK_EXEMPT = new Map([['ecl-guide.html', 1]]);

const probe = process.argv.includes('--probe');

export async function run(ck) {
  const src = readFileSync(path.join(ROOT, 'scripts', 'build_guide_pdfs.mjs'), 'utf8');
  const jobs = [...src.matchAll(/\['([^']+\?[^']*print=family[^']*)'\s*,/g)].map((m) => m[1]);
  ck(jobs.length >= 20, `build_guide_pdfs.mjs carries ${jobs.length} ?print=family jobs`);

  const { base, stop } = await startPrintServer();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 816, height: 1056 } });
  try {
    for (const job of jobs) {
      const guide = job.split('?')[0];
      await page.goto(`${base}/${job}`, { waitUntil: 'networkidle' });
      await page.emulateMedia({ media: 'print' });
      const r = await page.evaluate(([okSel, floor]) => {
        const mode = document.documentElement.getAttribute('data-print-mode');
        // checkVisibility walks ANCESTORS too — an element inside a display:none nav
        // reports its own display as inline, which the first probe run proved.
        const vis = (el) => el.checkVisibility();
        const hasOwnText = (el) => [...el.childNodes].some(
          (n) => n.nodeType === 3 && n.textContent.trim().length > 1);
        const under = [];
        let spanAll = 0;
        const colFlow = [];
        for (const el of document.querySelectorAll('body *')) {
          if (!vis(el)) continue;
          const s = getComputedStyle(el);
          if (s.columnSpan === 'all') spanAll++;
          if (hasOwnText(el) && parseFloat(s.fontSize) > 0.5 && parseFloat(s.fontSize) < floor &&
              !okSel.some((q) => el.closest(q)))
            under.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')}<${(el.closest('[class]') !== el ? el.closest('[class]') : el.parentElement.closest('[class]'))?.className}` +
                       ` ${parseFloat(s.fontSize).toFixed(1)}px ` +
                       ` "${el.textContent.trim().slice(0, 40)}"`);
        }
        for (const el of document.querySelectorAll('.doc-sheet, .section')) {
          const cc = getComputedStyle(el).columnCount;
          if (cc !== 'auto' && cc !== '1') colFlow.push(el.className);
        }
        return { mode, under: under.slice(0, 12), underCount: under.length,
                 spanAll, colFlow: colFlow.slice(0, 3),
                 asks: document.querySelectorAll('.pf-price.pf-ask').length };
      }, [UNDER_FLOOR_OK, FLOOR_PX]);
      await page.emulateMedia({ media: 'screen' });

      if (probe) {
        console.log(`-- ${job}: mode=${r.mode} under=${r.underCount} spanAll=${r.spanAll} ` +
                    `colFlow=${r.colFlow.length} asks=${r.asks}`);
        r.under.forEach((u) => console.log('     ', u));
        continue;
      }
      ck(r.mode === 'family', `${guide}: data-print-mode="family" is live (${r.mode})`);
      ck(r.underCount === 0,
        `${guide}: no prose below 10pt` +
        (r.underCount ? ` — ${r.underCount} under: ${r.under.slice(0, 3).join(' | ')}` : ''));
      ck(r.colFlow.length === 0,
        `${guide}: no sheet-level column flow${r.colFlow.length ? ' — ' + r.colFlow.join(', ') : ''}`);
      ck(r.spanAll === 0, `${guide}: nothing spans columns (${r.spanAll})`);
      const wantAsks = ASK_EXEMPT.get(guide) ?? 0;
      ck(r.asks === wantAsks,
        `${guide}: ${wantAsks} ask-card(s) expected, ${r.asks} found — a range or band on ` +
        `every other card`);
    }
  } finally {
    await browser.close();
    stop();
  }
}

if (process.argv[1] && process.argv[1].endsWith('verify_family_type.mjs')) {
  let pass = 0, fail = 0;
  const ck = (cond, msg) => {
    if (cond) { pass++; if (!probe) console.log('  PASS  ' + msg); }
    else { fail++; console.log('  FAIL  ' + msg); }
  };
  await run(ck);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
