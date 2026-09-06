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
test('session refresh reaches request cookies and redirect response', async () => {
  const response = await harness({ user: { id: 'customer' }, refresh: true }).run('/sign-up-login-screen');
  assert.equal(response.status, 307);
  assert.equal(new URL(response.headers.get('location')).pathname, '/user-dashboard');
  const cookie = response.cookies.get('sb-test-auth-token');
  assert.equal(cookie.value, 'refreshed');
  assert.equal(cookie.sameSite, 'lax');
  assert.equal(cookie.secure, true);
  assert.notEqual(cookie.httpOnly, true);
  assert.match(response.headers.get('cache-control'), /no-store/);
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
  assert.match(source, /exchangeCodeForSession\(code\)/);
  assert.match(source, /auth\.updateUser\(\{ password \}\)/);
});
