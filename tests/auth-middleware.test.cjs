const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest, NextResponse } = require('next/server');

// Mock only the identity service; exercise real Next.js request/response cookies.
function harness({ user = null, admin = false, refresh = false, profileError = null } = {}) {
  let calls = 0;
  const source = ts.transpileModule(fs.readFileSync('src/middleware.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const context = {
    exports: {}, process: { env: { NODE_ENV: 'production' } },
    require(name) {
      if (name === 'next/server') return { NextResponse };
      if (name !== '@supabase/ssr') throw new Error(`Unexpected import: ${name}`);
      return { createServerClient(_url, _key, options) {
        calls++;
        return {
          auth: { async getUser() {
            if (refresh) options.cookies.setAll([{ name: 'sb-test-auth-token', value: 'refreshed', options: { path: '/' } }]);
            return { data: { user } };
          } },
          from() { return { select() { return this; }, eq() { return this; },
            async single() { return { data: profileError ? null : { is_admin: admin }, error: profileError }; },
          }; },
        };
      } };
    },
  };
  vm.runInNewContext(source, context);
  return {
    run(path, init) { return context.exports.middleware(new NextRequest(`https://summeca.com${path}`, init)); },
    calls() { return calls; },
  };
}

test('guest cannot access admin API', async () => {
  assert.equal((await harness().run('/api/admin/export')).status, 401);
});
test('editable user metadata cannot grant admin access', async () => {
  const h = harness({ user: { id: 'customer', user_metadata: { role: 'admin' } } });
  assert.equal((await h.run('/api/admin/export')).status, 403);
});
test('database administrator can access admin API without shared caching', async () => {
  const response = await harness({ user: { id: 'admin' }, admin: true }).run('/api/admin/export');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control'), /no-store/);
});
test('profile lookup errors fail closed', async () => {
  assert.equal((await harness({ user: { id: 'customer' }, profileError: new Error('unavailable') }).run('/api/admin/export')).status, 403);
});
test('auth entry bypasses Supabase middleware work', async () => {
  const h = harness({ user: { id: 'customer' }, refresh: true });
  const response = await h.run('/sign-up-login-screen?next=%2Fcheckout');
  assert.equal(response.status, 200);
  assert.equal(h.calls(), 0);
});
test('refreshed cookies are forwarded to downstream handlers', async () => {
  const response = await harness({ user: { id: 'customer' }, refresh: true }).run('/user-dashboard');
  assert.match(response.headers.get('x-middleware-request-cookie'), /sb-test-auth-token=refreshed/);
});
test('cross-origin mutation is rejected before session lookup', async () => {
  const h = harness();
  assert.equal((await h.run('/api/orders', { method: 'POST', headers: { origin: 'https://attacker.invalid' } })).status, 403);
  assert.equal(h.calls(), 0);
});
test('cross-site mutation without Origin is rejected', async () => {
  assert.equal((await harness().run('/api/orders', { method: 'POST', headers: { 'sec-fetch-site': 'cross-site' } })).status, 403);
});
test('same-origin API request and external payment webhook reach their handlers', async () => {
  assert.equal((await harness().run('/api/orders', { method: 'POST', headers: { origin: 'https://summeca.com' } })).status, 200);
  assert.equal((await harness().run('/api/payment/webhook', { method: 'POST', headers: { origin: 'https://payment.invalid' } })).status, 200);
});
test('password recovery remains reachable for an authenticated user', async () => {
  assert.equal((await harness({ user: { id: 'customer' } }).run('/reset-password')).status, 200);
});
test('password recovery email redirects directly to reset page', () => {
  const source = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf8');
  assert.match(source, /redirectTo:\s*`\$\{getSiteUrl\(\)\}\/reset-password`/);
  assert.doesNotMatch(source, /resetPasswordForEmail[\s\S]*auth\/callback\?next=\/reset-password/);
});
test('reset page exchanges a PKCE recovery code before validating the user', () => {
  const source = fs.readFileSync('src/app/reset-password/page.tsx', 'utf8');
  assert.match(source, /searchParams\.get\('code'\)/);
  assert.match(source, /exchangeCodeForSession\(\s*code\s*,?/);
  assert.match(source, /auth\.updateUser\(\{ password \}\)/);
});
test('admin product CRUD stays behind the protected server API', () => {
  const pageSource = fs.readFileSync('src/app/admin/products/page.tsx', 'utf8');
  const routeSource = fs.readFileSync('src/app/api/admin/products/route.ts', 'utf8');
  assert.doesNotMatch(pageSource, /createClient|\.from\(['"]products['"]\)/);
  assert.match(pageSource, /\/api\/admin\/products/);
  assert.match(routeSource, /auth\.getUser\(\)/);
  assert.match(routeSource, /rpc\(['"]is_admin['"]\)/);
  assert.match(routeSource, /return \{ service: sessionClient \}/);
  assert.doesNotMatch(routeSource, /createServiceClient\(\)/);
  assert.match(routeSource, /action === 'save_product'/);
  assert.match(routeSource, /action === 'update_status'/);
});

test('support authorization never trusts editable auth metadata', () => {
  const ticketSource = fs.readFileSync('src/app/api/support/tickets/[id]/route.ts', 'utf8');
  const messageSource = fs.readFileSync('src/app/api/support/tickets/[id]/messages/route.ts', 'utf8');
  for (const source of [ticketSource, messageSource]) {
    assert.doesNotMatch(source, /user_metadata\?\.role|app_metadata\?\.role/);
    assert.match(source, /from\('user_profiles'\)/);
    assert.match(source, /select\('is_admin'\)/);
  }
});

test('all signed-in password forms require server-side current-password verification', () => {
  for (const file of [
    'src/app/user-dashboard/security/page.tsx',
    'src/app/user-dashboard/settings/page.tsx',
    'src/app/user-dashboard/components/UserProfilePanel.tsx',
  ]) {
    const source = fs.readFileSync(file, 'utf8');
    assert.match(source, /\/api\/security\/change-password/);
    assert.match(source, /currentPassword/);
    assert.doesNotMatch(source, /auth\.updateUser\(\{ password:/);
  }
});
