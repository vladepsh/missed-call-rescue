const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');
const { start } = require('../server');

async function main() {
  const outputDir = path.join(__dirname, '..', 'docs', 'screenshots');
  fs.mkdirSync(outputDir, { recursive: true });

  const server = start(0);
  await new Promise(resolve => server.once('listening', resolve));
  const port = server.address().port;
  const browser = await chromium.launch();

  try {
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
    await desktop.goto(`http://127.0.0.1:${port}/`);
    await desktop.getByRole('heading', { name: 'Missed-call inbox' }).waitFor();
    await desktop.screenshot({ path: path.join(outputDir, 'dashboard-desktop.png'), fullPage: true });

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    await mobile.goto(`http://127.0.0.1:${port}/`);
    await mobile.getByRole('heading', { name: 'Missed-call inbox' }).waitFor();
    await mobile.screenshot({ path: path.join(outputDir, 'dashboard-mobile.png'), fullPage: true });
  } finally {
    await browser.close();
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

