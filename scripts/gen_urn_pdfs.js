const { chromium } = require('playwright');

const PORT = process.env.PORT || 65197;
const guides = [
  { html: 'urns-guide.html', pdf: 'Urn Catalog.pdf' },
  { html: 'keepsake-urns-guide.html', pdf: 'Keepsake Urn Catalog.pdf' },
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const g of guides) {
    const url = `http://localhost:${PORT}/${g.html}`;
    console.log(`Generating ${g.pdf}...`);
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.emulateMedia({ media: 'print' });
    await page.pdf({
      path: `C:/Users/Martice/bw-quote-tool/pdf-assets/${g.pdf}`,
      format: 'Letter',
      printBackground: true,
      margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
      displayHeaderFooter: false,
    });
    console.log(`  Done: ${g.pdf}`);
  }

  await browser.close();
  console.log('All done.');
})();
