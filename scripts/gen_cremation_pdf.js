const { chromium } = require('playwright');

const PORT = process.env.PORT || 65197;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const url = `http://localhost:${PORT}/cremation-guide.html`;
  console.log('Generating Cremation Guide PDF...');
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  await page.pdf({
    path: 'C:/Users/Martice/bw-quote-tool/pdf-assets/Cremation Guide.pdf',
    format: 'Letter',
    printBackground: true,
    margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
    displayHeaderFooter: false,
  });
  console.log('Done: Cremation Guide.pdf');

  await browser.close();
})();
