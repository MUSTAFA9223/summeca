const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const userLayout = fs.readFileSync('src/app/user-dashboard/layout.tsx', 'utf8');
const adminLayout = fs.readFileSync('src/app/admin/layout.tsx', 'utf8');

test('persisted admin sessions cannot fall back into the customer dashboard', () => {
  assert.match(userLayout, /auth\.getUser\(\)/);
  assert.match(userLayout, /from\('user_profiles'\)/);
  assert.match(userLayout, /select\('is_admin'\)/);
  assert.match(userLayout, /profile\?\.is_admin === true/);
  assert.match(userLayout, /redirect\('\/admin'\)/);
  assert.match(userLayout, /force-dynamic/);
});

test('admin area still requires an authenticated admin profile', () => {
  assert.match(adminLayout, /auth\.getUser\(\)/);
  assert.match(adminLayout, /select\('is_admin, full_name, email'\)/);
  assert.match(adminLayout, /if \(!profile\?\.is_admin\)/);
});
