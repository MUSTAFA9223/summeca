const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('private digital product payloads are not exposed to browser roles', () => {
  const migration = fs.readFileSync(
    'supabase/migrations/20260910070000_private_digital_product_assets.sql',
    'utf8',
  );

  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all on table public\.digital_product_assets from anon, authenticated/i);
  assert.match(migration, /grant select on table public\.digital_product_assets to service_role/i);
  assert.match(migration, /dbasset:/i);
});

test('download route requires owned entitlement before serving database-backed files', () => {
  const route = fs.readFileSync('src/app/api/downloads/[id]/route.ts', 'utf8');

  assert.match(route, /auth\.getUser\(\)/);
  assert.match(route, /from\('downloads'\)/);
  assert.match(route, /\.eq\('user_id', user\.id\)/);
  assert.match(route, /download\.status !== 'available'/);
  assert.match(route, /DB_ASSET_PREFIX = 'dbasset:'/);
  assert.match(route, /createServiceClient\(\)/);
  assert.match(route, /from\('digital_product_assets'\)/);
  assert.match(route, /record_download_access/);
  assert.match(route, /Content-Disposition/);
  assert.match(route, /Cache-Control': 'no-store, private'/);
});

test('database-backed downloads preserve the dashboard JSON-to-download handshake', () => {
  const route = fs.readFileSync('src/app/api/downloads/[id]/route.ts', 'utf8');
  const dashboard = fs.readFileSync('src/app/user-dashboard/downloads/page.tsx', 'utf8');

  assert.match(dashboard, /await response\.json\(\)/);
  assert.match(dashboard, /window\.location\.assign\(payload\.url\)/);
  assert.match(route, /request\.nextUrl\.searchParams\.get\('file'\) === '1'/);
  assert.match(route, /url: `\/api\/downloads\/\$\{encodeURIComponent\(download\.id\)\}\?file=1`/);
  assert.match(route, /if \(!directFileRequest\)/);
});

test('download entitlement trigger fills only blank file URLs from product metadata', () => {
  const migration = fs.readFileSync(
    'supabase/migrations/20260910070000_private_digital_product_assets.sql',
    'utf8',
  );

  assert.match(migration, /if coalesce\(new\.file_url, ''\) <> '' then\s+return new/i);
  assert.match(migration, /p\.metadata ->> 'download_url'/);
  assert.match(migration, /p\.metadata ->> 'download_file_name'/);
  assert.match(migration, /before insert on public\.downloads/i);
});

test('server-generated digital products remain allowlisted and entitlement-gated', () => {
  const route = fs.readFileSync('src/app/api/downloads/[id]/route.ts', 'utf8');
  const kits = fs.readFileSync('src/lib/digital-products/generatedKits.ts', 'utf8');

  assert.match(route, /GENERATED_ASSET_PREFIX = 'generated:'/);
  assert.match(route, /isGeneratedDigitalProductKey/);
  assert.match(route, /buildGeneratedDigitalProductBundle/);
  assert.match(route, /recordAccess\(service, download\.id, user\.id\)/);
  assert.match(route, /Content-Type': 'application\/zip'/);
  assert.match(route, /X-Content-Type-Options': 'nosniff'/);

  assert.match(kits, /'ecommerce-product-page-conversion-kit'/);
  assert.match(kits, /'ai-social-media-content-kit'/);
  assert.match(kits, /'freelancer-client-management-kit'/);
  assert.match(kits, /SUMMECA DIGITAL PRODUCT LICENSE/);
});

test('published generated products use one-time pricing and protected generated paths', () => {
  const migration = fs.readFileSync(
    'supabase/migrations/20260910211500_publish_generated_digital_products.sql',
    'utf8',
  );

  assert.match(migration, /ecommerce-product-page-conversion-kit/);
  assert.match(migration, /ai-social-media-content-kit/);
  assert.match(migration, /freelancer-client-management-kit/);
  assert.match(migration, /generated:ecommerce-product-page-conversion-kit/);
  assert.match(migration, /generated:ai-social-media-content-kit/);
  assert.match(migration, /generated:freelancer-client-management-kit/);
  assert.match(migration, /29\.00/);
  assert.match(migration, /39\.00/);
  assert.match(migration, /49\.00/);
  assert.match(migration, /billing_period = 'one_time'/);
});

test('download-ready notification trigger is server-controlled', () => {
  const migration = fs.readFileSync(
    'supabase/migrations/20260910135000_download_ready_notifications.sql',
    'utf8',
  );

  assert.match(migration, /security definer/i);
  assert.match(migration, /after insert on public\.downloads/i);
  assert.match(migration, /revoke all on function public\.notify_download_ready\(\) from public/i);
  assert.match(migration, /grant execute on function public\.notify_download_ready\(\) to postgres, service_role/i);
});
