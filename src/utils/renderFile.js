const puppeteer = require('puppeteer');
const ejs = require('ejs');

exports.renderPdf = async (template, renderData) => {
  const html = await ejs.renderFile(template, renderData);

  // Launch Puppeteer and generate PDF
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(html);
  const pdfBuffer = await page.pdf({ format: 'A4' });

  await browser.close();
  return pdfBuffer;
};
