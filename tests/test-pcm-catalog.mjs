// pcm-design-catalog.html — the PCM flat-marker design catalog.
//
// The checks live in scripts/verify_pcm_catalog.mjs so the same gate can be run on its
// own against a page under construction; this suite is how it reaches `npm test`.
// Nothing here writes anything, anywhere.
//
// Everything except the block at the bottom lives in the verifier. That block does not:
// the verifier computes what "companion" should return from data/pcm-catalog.json, so it
// would still pass if the BUILT PAGE and the data drifted apart in the same direction
// (a stale pcm-design-catalog.html that nobody rebuilt, say). Here the expectation comes
// out of the built HTML's own markup instead, and is compared against the running page.
import fs from 'fs';
import { chromium } from 'playwright';
import { BASE } from './_base.mjs';
import { run, PAGE } from '../scripts/verify_pcm_catalog.mjs';

let pass = 0, fail = 0;
const ck = (cond, msg) => {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg); }
};

await run(ck, BASE);

// ---- format search, expected straight off the built markup ----------------------------
{
  const src = fs.readFileSync(PAGE, 'utf8');
  const cardsIn = (re) => (src.match(re) || []).length;
  const fmtCompanion = cardsIn(/data-fmt="companion"/g);
  const groupCompanion = cardsIn(/data-cat="Companion Designs"/g);
  ck(fmtCompanion > 0 && groupCompanion >= fmtCompanion,
    `the built page markup carries ${fmtCompanion} companion-format cards inside ` +
    `${groupCompanion} Companion Designs cards`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  try {
    await page.goto(BASE + PAGE, { waitUntil: 'networkidle' });
    for (const q of ['companion', 'companions']) {
      await page.fill('#searchInput', q);
      await page.waitForTimeout(340);
      const got = await page.evaluate(() => {
        const on = [...document.querySelectorAll('.design-card')]
          .filter((c) => c.style.display !== 'none');
        return {
          n: on.length,
          fmt: on.filter((c) => c.dataset.fmt === 'companion').length,
          chip: on.filter((c) => [...c.querySelectorAll('.tag.hit')]
            .some((t) => /companion/.test(t.textContent))).length,
          fmtChip: on.filter((c) => [...c.querySelectorAll('.tag.hit')]
            .some((t) => t.textContent.trim() === 'format: companion')).length,
          count: document.getElementById('filterCount').textContent,
        };
      });
      ck(got.n === groupCompanion,
        `typing "${q}" shows ${got.n} design cards, the ${groupCompanion} the markup files ` +
        `under Companion Designs`);
      ck(got.fmt === fmtCompanion,
        `…including all ${fmtCompanion} cards whose format is companion (${got.fmt})`);
      ck(got.chip === got.n,
        `…and all ${got.n} light a chip naming companion (${got.chip})`);
      ck(got.fmtChip === fmtCompanion,
        `…of which ${fmtCompanion} light "format: companion" exactly (${got.fmtChip})`);
      ck(/^\d+ designs/.test(got.count) && got.count.startsWith(String(got.n)),
        `…and the toolbar count agrees ("${got.count}")`);
    }
  } finally {
    await browser.close();
  }
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
