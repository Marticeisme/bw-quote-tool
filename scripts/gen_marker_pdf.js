const path = require('path');
const { chromium } = require('playwright');

const PORT = process.env.PORT || 65197;
const OUT = process.env.OUT ||
  path.join(__dirname, '..', 'pdf-assets', 'Granite Marker Guide.pdf');

/**
 * Force every image on the page to load, then wait for all of them to decode.
 *
 * Why this exists: the 27 granite colour swatches carry loading="lazy", which is
 * correct for the browser (the page is image-heavy and they sit far below the
 * fold). But page.pdf() renders the whole document without ever scrolling, so a
 * lazy image below the viewport never enters the viewport, never starts a
 * request, and prints blank. waitUntil:'networkidle' cannot help — there is no
 * request in flight to wait for. So we flip them to eager here, at PDF-generation
 * time only, rather than removing the attribute from the page itself.
 */
async function loadAllImages(page) {
  return page.evaluate(async () => {
    const imgs = Array.from(document.images);
    for (const img of imgs) {
      if (img.loading === 'lazy') img.loading = 'eager';
      // Flipping loading to eager starts the fetch in Chromium, but re-assigning
      // src is the belt-and-braces kick for any image the swap did not restart.
      if (!img.complete && !img.currentSrc) img.src = img.src;
    }
    await Promise.all(imgs.map(img => (
      img.complete && img.naturalWidth > 0
        ? Promise.resolve()
        : new Promise(resolve => {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', resolve, { once: true });
            setTimeout(resolve, 15000);
          })
    )));
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    return imgs
      .filter(img => !(img.complete && img.naturalWidth > 0))
      .map(img => img.getAttribute('src'));
  });
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const url = `http://localhost:${PORT}/markers-guide.html`;
  console.log('Generating Granite Marker Guide PDF...');
  await page.goto(url, { waitUntil: 'networkidle' });

  const failed = await loadAllImages(page);
  const total = await page.evaluate(() => document.images.length);
  if (failed.length) {
    await browser.close();
    console.error(`FAILED: ${failed.length}/${total} images did not load:`);
    failed.forEach(src => console.error('  - ' + src));
    process.exit(1);
  }
  console.log(`All ${total} images loaded.`);

  await page.emulateMedia({ media: 'print' });
  await page.pdf({
    path: OUT,
    format: 'Letter',
    printBackground: true,
    margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
    displayHeaderFooter: false,
  });
  console.log('Done: ' + OUT);

  await browser.close();
})();
