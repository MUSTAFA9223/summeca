import { chromium } from 'playwright';

const baseUrl = process.env.CURRENT_DEV_BASE_URL || 'http://127.0.0.1:4174';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar' });
await context.addCookies([{ name: 'summeca_language', value: 'ar', url: baseUrl, sameSite: 'Lax' }]);
await context.addInitScript(() => {
  localStorage.setItem('summeca.language', 'ar');
  localStorage.setItem('summeca:theme', 'light');
});
const page = await context.newPage();
const consoleMessages = [];
const pageErrors = [];
page.on('console', (msg) => {
  const entry = `[console:${msg.type()}] ${msg.text()}`;
  consoleMessages.push(entry);
  if (/hydr|mismatch|error|warning/i.test(entry)) console.log(entry);
});
page.on('pageerror', (error) => {
  const entry = `[pageerror] ${error.stack || error.message || String(error)}`;
  pageErrors.push(entry);
  console.log(entry);
});
const response = await page.goto(`${baseUrl}/checkout`, { waitUntil: 'networkidle', timeout: 60000 });
console.log(`DIAG status=${response?.status()} final=${page.url()}`);
console.log(`DIAG html=${await page.locator('html').getAttribute('lang')} dir=${await page.locator('html').getAttribute('dir')}`);
console.log(`DIAG console-count=${consoleMessages.length} pageerror-count=${pageErrors.length}`);
await page.screenshot({ path: 'visual-qa-output/checkout-dev-diagnostic.png', fullPage: true });
await context.close();
await browser.close();
