const puppeteer = require('puppeteer');
const ejs = require('ejs');

exports.renderPdf = async (template, renderData) => {
  const html = await ejs.renderFile(template, renderData);

  // Launch Puppeteer and generate PDF
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/usr/bin/chromium-browser',
    // executablePath: '/opt/homebrew/bin/chromium',
    args: [
      '--no-sandbox',
      '--headless',
      '--disable-gpu',
      '--disable-dev-shm-usage'
    ]
  });
  const page = await browser.newPage();
  await page.setContent(html);
  const pdfBuffer = await page.pdf({ format: 'A4' });

  await browser.close();
  return pdfBuffer;
};
