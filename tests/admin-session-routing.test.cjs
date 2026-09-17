const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const dashboardLayout = fs.readFileSync('src/app/user-dashboard/layout.tsx', 'utf8');
const passwordSignIn = fs.readFileSync('src/app/api/auth/password-sign-in/route.ts', 'utf8');

test('restored admin sessions never render the customer dashboard', () => {
  assert.match(dashboardLayout, /auth\.getUser\(\)/);
  assert.match(dashboardLayout, /from\('user_profiles'\)/);
  assert.match(dashboardLayout, /select\('is_admin'\)/);
  assert.match(dashboardLayout, /profile\?\.is_admin === true/);
  assert.match(dashboardLayout, /redirect\('\/admin'\)/);
});

test('signed-out customer dashboard requests still go to login', () => {
  assert.match(dashboardLayout, /if \(!user\)/);
  assert.match(dashboardLayout, /redirect\('\/sign-up-login-screen'\)/);
});

test('fresh password sign-in keeps routing admins directly to admin', () => {
  assert.match(passwordSignIn, /select\('is_admin'\)/);
  assert.match(passwordSignIn, /profile\?\.is_admin === true/);
  assert.match(passwordSignIn, /destination = '\/admin'/);
});
