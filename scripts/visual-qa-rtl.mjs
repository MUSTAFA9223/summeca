import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const AFTER_BASE = process.env.AFTER_BASE_URL || 'https://summeca.com';
const BEFORE_BASE = process.env.BEFORE_BASE_URL || 'http://127.0.0.1:4173';
const OUTPUT_DIR = process.env.VISUAL_QA_OUTPUT || 'visual-qa-output';

const viewports = [
  { name: '320x568', width: 320, height: 568 },
  { name: '375x667', width: 375, height: 667 },
  { name: '390x844', width: 390, height: 844 },
  { name: '430x932', width: 430, height: 932 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '1440x900', width: 1440, height: 900 },
];

const routes = [
  { name: 'home', path: '/' },
  { name: 'products', path: '/products' },
  { name: 'pricing', path: '/pricing' },
  { name: 'invoiceflow', path: '/products/summeca-invoiceflow' },
  { name: 'leadfollow', path: '/products/summeca-leadfollow-ai' },
  { name: 'login', path: '/sign-up-login-screen' },
  { name: 'checkout', path: '/checkout' },
  { name: 'not-found', path: '/__rtl-visual-qa-not-found' },
  { name: 'dashboard-guard', path: '/user-dashboard', expectAuthRedirect: true },
];

const screenshotPlan = [
  ['home', '390x844', 'light'],
  ['home', '390x844', 'dark'],
  ['home', '1440x900', 'light'],
  ['products', '390x844', 'light'],
  ['pricing', '390x844', 'light'],
  ['invoiceflow', '390x844', 'light'],
  ['leadfollow', '390x844', 'light'],
  ['login', '390x844', 'light'],
  ['checkout', '390x844', 'light'],
  ['not-found', '390x844', 'light'],
  ['dashboard-guard', '390x844', 'light'],
];

function safeName(value) {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '');
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function inspectPage(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const bodyText = document.body?.innerText || '';
    const arabicChars = (bodyText.match(/[\u0600-\u06FF]/g) || []).length;
    const horizontalOverflow = root.scrollWidth > window.innerWidth + 1;

    const visible = (el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };

    const clipIssues = [...document.querySelectorAll('h1,h2,h3,h4,p,span,a,button,label,input,textarea,select')]
      .filter((el) => visible(el))
      .filter((el) => {
        const style = getComputedStyle(el);
        const clippedX = el.scrollWidth > el.clientWidth + 2;
        const clippedY = el.scrollHeight > el.clientHeight + 2;
        const intentionallyTruncated = style.textOverflow === 'ellipsis' || el.getAttribute('data-qa-allow-truncate') === 'true';
        const constrained = ['hidden', 'clip'].includes(style.overflowX) || ['hidden', 'clip'].includes(style.overflowY);
        return !intentionallyTruncated && constrained && (clippedX || clippedY);
      })
      .slice(0, 20)
      .map((el) => ({
        tag: el.tagName,
        text: (el.textContent || el.getAttribute('placeholder') || '').trim().slice(0, 120),
        className: typeof el.className === 'string' ? el.className.slice(0, 160) : '',
        clientWidth: el.clientWidth,
        scrollWidth: el.scrollWidth,
        clientHeight: el.clientHeight,
        scrollHeight: el.scrollHeight,
      }));

    const brandMirrorIssues = [...document.querySelectorAll('img,svg')]
      .filter((el) => {
        const alt = el instanceof HTMLImageElement ? el.alt : '';
        const parentText = el.parentElement?.textContent || '';
        return /summeca/i.test(alt) || /summeca/i.test(parentText);
      })
      .filter((el) => {
        const transform = getComputedStyle(el).transform;
        return transform && transform !== 'none' && (/matrix\(-/.test(transform) || /scaleX\(-1\)/.test(transform));
      })
      .slice(0, 10)
      .map((el) => ({ tag: el.tagName, transform: getComputedStyle(el).transform }));

    return {
      url: location.href,
      title: document.title,
      lang: root.lang,
      dir: root.dir,
      dataLanguage: root.dataset.language || null,
      theme: root.dataset.siteTheme || null,
      innerWidth: window.innerWidth,
      scrollWidth: root.scrollWidth,
      horizontalOverflow,
      arabicChars,
      clipIssues,
      brandMirrorIssues,
    };
  });
}

async function runSingle(browser, { baseUrl, mode, route, viewport, theme, screenshot }) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    locale: 'ar',
  });

  await context.addCookies([
    {
      name: 'summeca_language',
      value: 'ar',
      url: baseUrl,
      sameSite: 'Lax',
    },
  ]);

  await context.addInitScript((selectedTheme) => {
    try {
      localStorage.setItem('summeca.language', 'ar');
      localStorage.setItem('summeca:theme', selectedTheme);
    } catch {}
  }, theme);

  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 500));
  });
  page.on('pageerror', (error) => pageErrors.push(String(error).slice(0, 500)));
  page.on('requestfailed', (request) => {
    failedRequests.push({ url: request.url(), error: request.failure()?.errorText || 'request failed' });
  });

  const target = new URL(route.path, baseUrl).toString();
  let navigationError = null;
  let responseStatus = null;

  try {
    const response = await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 45000 });
    responseStatus = response?.status() ?? null;
    await page.waitForTimeout(1200);
  } catch (error) {
    navigationError = String(error).slice(0, 800);
  }

  let inspection = null;
  if (!navigationError) {
    inspection = await inspectPage(page);
  }

  let screenshotPath = null;
  if (screenshot && !navigationError) {
    const dir = path.join(OUTPUT_DIR, 'screenshots', mode);
    await ensureDir(dir);
    screenshotPath = path.join(
      dir,
      `${safeName(route.name)}__${viewport.name}__${theme}.png`,
    );
    await page.screenshot({ path: screenshotPath, fullPage: true });
  }

  const redirectedToLogin = route.expectAuthRedirect
    ? /\/sign-up-login-screen(?:\?|$)/.test(page.url())
    : false;

  const criticalConsoleErrors = consoleErrors.filter((message) =>
    /hydration|uncaught|typeerror|referenceerror|syntaxerror/i.test(message),
  );

  const failures = [];
  if (navigationError) failures.push('navigation-error');
  if (inspection && inspection.lang !== 'ar') failures.push(`lang=${inspection.lang || '(empty)'}`);
  if (inspection && inspection.dir !== 'rtl') failures.push(`dir=${inspection.dir || '(empty)'}`);
  if (inspection && inspection.dataLanguage && inspection.dataLanguage !== 'ar') failures.push(`data-language=${inspection.dataLanguage}`);
  if (inspection && inspection.theme !== theme) failures.push(`theme=${inspection.theme || '(empty)'}`);
  if (inspection?.horizontalOverflow) failures.push(`root-horizontal-overflow:${inspection.scrollWidth}>${inspection.innerWidth}`);
  if (inspection && inspection.arabicChars < 5 && !route.expectAuthRedirect) failures.push(`low-arabic-content:${inspection.arabicChars}`);
  if (inspection?.clipIssues.length) failures.push(`clipped-elements:${inspection.clipIssues.length}`);
  if (inspection?.brandMirrorIssues.length) failures.push(`mirrored-brand-assets:${inspection.brandMirrorIssues.length}`);
  if (criticalConsoleErrors.length) failures.push(`critical-console-errors:${criticalConsoleErrors.length}`);
  if (route.expectAuthRedirect && !redirectedToLogin) failures.push('dashboard-auth-guard-did-not-redirect');
  if (responseStatus && responseStatus >= 500) failures.push(`http-${responseStatus}`);

  const result = {
    mode,
    route: route.name,
    path: route.path,
    viewport: viewport.name,
    theme,
    target,
    finalUrl: page.url(),
    responseStatus,
    redirectedToLogin,
    navigationError,
    inspection,
    consoleErrors,
    criticalConsoleErrors,
    pageErrors,
    failedRequests: failedRequests.slice(0, 20),
    screenshotPath,
    failures,
    passed: failures.length === 0,
  };

  await context.close();
  return result;
}

async function runMatrix(browser) {
  const results = [];
  for (const viewport of viewports) {
    for (const theme of ['light', 'dark']) {
      for (const route of routes) {
        const screenshot = screenshotPlan.some(
          ([routeName, viewportName, plannedTheme]) =>
            routeName === route.name && viewportName === viewport.name && plannedTheme === theme,
        );
        const result = await runSingle(browser, {
          baseUrl: AFTER_BASE,
          mode: 'after-production',
          route,
          viewport,
          theme,
          screenshot,
        });
        results.push(result);
        console.log(`[after] ${route.name} ${viewport.name} ${theme}: ${result.passed ? 'PASS' : 'FAIL'}${result.failures.length ? ` -> ${result.failures.join(', ')}` : ''}`);
      }
    }
  }
  return results;
}

async function runBeforeDocumentation(browser) {
  const results = [];
  const representativeViewport = viewports.find((item) => item.name === '390x844');
  const desktopViewport = viewports.find((item) => item.name === '1440x900');
  const plan = [
    ['home', representativeViewport, 'light'],
    ['home', representativeViewport, 'dark'],
    ['home', desktopViewport, 'light'],
    ['products', representativeViewport, 'light'],
    ['pricing', representativeViewport, 'light'],
    ['invoiceflow', representativeViewport, 'light'],
    ['leadfollow', representativeViewport, 'light'],
    ['login', representativeViewport, 'light'],
    ['checkout', representativeViewport, 'light'],
    ['not-found', representativeViewport, 'light'],
    ['dashboard-guard', representativeViewport, 'light'],
  ];

  for (const [routeName, viewport, theme] of plan) {
    const route = routes.find((item) => item.name === routeName);
    const result = await runSingle(browser, {
      baseUrl: BEFORE_BASE,
      mode: 'before-prompt7',
      route,
      viewport,
      theme,
      screenshot: true,
    });
    results.push(result);
    console.log(`[before] ${route.name} ${viewport.name} ${theme}: ${result.passed ? 'PASS' : 'OBSERVE'}${result.failures.length ? ` -> ${result.failures.join(', ')}` : ''}`);
  }
  return results;
}

function buildMarkdown(afterResults, beforeResults) {
  const failed = afterResults.filter((item) => !item.passed);
  const criticalConsoleCount = afterResults.reduce((sum, item) => sum + item.criticalConsoleErrors.length, 0);
  const rootOverflowCount = afterResults.filter((item) => item.inspection?.horizontalOverflow).length;
  const clippingCount = afterResults.reduce((sum, item) => sum + (item.inspection?.clipIssues.length || 0), 0);
  const brandMirrorCount = afterResults.reduce((sum, item) => sum + (item.inspection?.brandMirrorIssues.length || 0), 0);
  const dashboardChecks = afterResults.filter((item) => item.route === 'dashboard-guard');
  const dashboardGuardPassed = dashboardChecks.every((item) => item.redirectedToLogin);

  const rows = afterResults
    .map((item) => `| ${item.route} | ${item.viewport} | ${item.theme} | ${item.passed ? 'PASS' : 'FAIL'} | ${item.failures.join('; ') || '—'} |`)
    .join('\n');

  return `# SUMMECA Arabic / RTL Visual QA\n\n` +
    `- Production target: ${AFTER_BASE}\n` +
    `- Baseline target: ${BEFORE_BASE}\n` +
    `- Language cookie: ar\n` +
    `- Viewports: ${viewports.map((item) => item.name).join(', ')}\n` +
    `- Themes: light, dark\n\n` +
    `## Production summary\n\n` +
    `- Matrix checks: ${afterResults.length}\n` +
    `- Passed: ${afterResults.length - failed.length}\n` +
    `- Failed: ${failed.length}\n` +
    `- Root horizontal overflow cases: ${rootOverflowCount}\n` +
    `- Potential clipped elements: ${clippingCount}\n` +
    `- Mirrored SUMMECA brand assets: ${brandMirrorCount}\n` +
    `- Critical console/hydration errors: ${criticalConsoleCount}\n` +
    `- Dashboard auth guard redirected to login at every tested viewport/theme: ${dashboardGuardPassed ? 'yes' : 'no'}\n\n` +
    `## Important limitation\n\n` +
    `The authenticated Dashboard itself was not opened because this QA run intentionally uses no customer/admin credentials and does not bypass Auth. The route guard was verified instead.\n\n` +
    `## Production matrix\n\n` +
    `| Route | Viewport | Theme | Result | Findings |\n|---|---:|---|---|---|\n${rows}\n\n` +
    `## Before/after screenshots\n\n` +
    `Representative pre-Prompt-7 screenshots are in \`screenshots/before-prompt7/\`. Current production screenshots are in \`screenshots/after-production/\`.\n`;
}

await ensureDir(OUTPUT_DIR);
const browser = await chromium.launch({ headless: true });

try {
  const afterResults = await runMatrix(browser);
  const beforeResults = await runBeforeDocumentation(browser);

  const summary = {
    generatedAt: new Date().toISOString(),
    afterBaseUrl: AFTER_BASE,
    beforeBaseUrl: BEFORE_BASE,
    viewports,
    routes,
    afterResults,
    beforeResults,
  };

  await fs.writeFile(path.join(OUTPUT_DIR, 'visual-qa-report.json'), JSON.stringify(summary, null, 2));
  await fs.writeFile(path.join(OUTPUT_DIR, 'visual-qa-report.md'), buildMarkdown(afterResults, beforeResults));

  const failedAfter = afterResults.filter((item) => !item.passed);
  console.log(`Production visual QA completed: ${afterResults.length - failedAfter.length}/${afterResults.length} checks passed.`);
  if (failedAfter.length) {
    console.log(`Production findings: ${failedAfter.length} matrix cases need review. Report artifact will contain exact routes/viewports/findings.`);
  }
} finally {
  await browser.close();
}
