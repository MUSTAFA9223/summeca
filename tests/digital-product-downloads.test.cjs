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
