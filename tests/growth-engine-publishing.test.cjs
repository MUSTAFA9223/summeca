const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const migration = read('supabase/migrations/20260923114000_growth_content_publishing.sql');
const growthApi = read('src/app/api/ai/growth-pages/route.ts');
const growthPlan = read('src/app/api/ai/growth-plan/route.ts');
const guidesIndex = read('src/app/guides/page.tsx');
const guidePage = read('src/app/guides/[slug]/page.tsx');
const sitemap = read('src/app/sitemap.ts');
const middleware = read('src/middleware.ts');
const routing = read('src/lib/locale-routing.ts');
const funnelRoute = read('src/app/api/analytics/funnel/route.ts');
const funnelClient = read('src/lib/funnelAnalytics.ts');

test('growth publishing uses a protected draft and published content table', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.growth_pages/);
  assert.match(migration, /status text NOT NULL DEFAULT 'draft'/);
  assert.match(migration, /growth_pages_public_read/);
  assert.match(migration, /USING \(status = 'published'\)/);
  assert.match(migration, /growth_pages_admin_all/);
  assert.match(migration, /ADD VALUE IF NOT EXISTS 'growth_page'/);
});

test('admin growth API grounds content in the published catalog and keeps drafts private', () => {
  assert.match(growthApi, /getPublicCatalog\(\)/);
  assert.match(growthApi, /The target product is not currently published/);
  assert.match(growthApi, /status: 'draft'/);
  assert.match(growthApi, /generation_type: 'growth_page'/);
  assert.match(growthApi, /revalidatePath\('\/guides'\)/);
  assert.match(growthApi, /revalidatePath\('\/sitemap\.xml'\)/);
});

test('public guides expose indexable metadata and structured data without generated HTML rendering', () => {
  assert.match(guidesIndex, /SUMMECA Guides & Growth Resources/);
  assert.match(guidePage, /'@type': 'Article'/);
  assert.match(guidePage, /'@type': 'FAQPage'/);
  assert.match(guidePage, /GuideProductCta/);
  assert.doesNotMatch(guidePage, /dangerouslySetInnerHTML=\{\{ __html: page\.content/);
});

test('published guides are canonical public SEO routes and sitemap entries', () => {
  assert.match(sitemap, /from\('growth_pages'\)/);
  assert.match(sitemap, /\/guides\/\$\{encodeURIComponent\(guide\.slug\)\}/);
  assert.match(routing, /publicPath\.startsWith\('\/guides\/'\)/);
  assert.match(middleware, /publicPath\.startsWith\('\/guides\/'\)/);
  assert.match(middleware, /'\/guides\/:path\*'/);
});

test('guide CTA engagement feeds the first-party growth loop', () => {
  assert.match(funnelRoute, /'content_cta_click'/);
  assert.match(funnelClient, /'content_cta_click'/);
  assert.match(growthPlan, /contentPageViews/);
  assert.match(growthPlan, /contentCtaClicks/);
});
