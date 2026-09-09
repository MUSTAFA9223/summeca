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
  assert.match(source, /if \(hasRecoveryMarkerInUrl\(\)\)[\s\S]*setLoading\(false\)[\s\S]*else[\s\S]*auth\.getSession\(\)/);
});
test('reset page exchanges a PKCE recovery code before validating the user', () => {
  const source = fs.readFileSync('src/app/reset-password/page.tsx', 'utf8');
  assert.match(source, /searchParams\.get\('code'\)/);
  assert.match(source, /exchangeCodeForSession\(\s*code\s*,?/);
  assert.match(source, /auth\.updateUser\(\{ password \}\)/);
  assert.match(source, /setRecoveryTokenHash\(pendingTokenHash\)/);
  assert.match(source, /fetch\('\/api\/auth\/recovery\/reset-password'/);
  assert.match(source, /auth\.signOut\(\{ scope:\s*'local' \}\)/);
  assert.match(source, /window\.location\.replace\('\/sign-up-login-screen\?password_reset=success'\)/);
  const confirmation = source.slice(source.indexOf('function confirmRecoveryLink'), source.indexOf('async function handleSubmit'));
  assert.doesNotMatch(confirmation, /auth\.getUser\(\)/);
});

test('cross-device password update verifies the token and updates on the server', () => {
  const source = fs.readFileSync('src/app/api/auth/recovery/reset-password/route.ts', 'utf8');
  assert.match(source, /auth\.verifyOtp\(\{[\s\S]*type:\s*'recovery'[\s\S]*token_hash:\s*tokenHash/);
  assert.match(source, /auth\.updateUser\(\{ password:\s*newPassword \}\)/);
  assert.match(source, /auth\.signOut\(\{ scope:\s*'global' \}\)/);
  assert.doesNotMatch(source, /createServiceClient|SUPABASE_SERVICE_ROLE_KEY/);
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

test('verified refund webhook delegates reconciliation to one service-only database transaction', () => {
  const source = fs.readFileSync('src/app/api/payment/webhook/route.ts', 'utf8');
  const migration = fs.readFileSync(
    'supabase/migrations/20260909221357_atomic_verified_refunds.sql',
    'utf8'
  );
  const refundHandler = source.slice(
    source.indexOf('async function handleRefund'),
    source.indexOf('async function handleCompletion')
  );

  assert.match(source, /paymentStatus === 'refunded'[\s\S]*handleRefund/);
  assert.match(refundHandler, /\.rpc\('finalize_verified_refund'/);
  assert.doesNotMatch(refundHandler, /\.from\('orders'\)[\s\S]*\.update/);
  assert.match(migration, /FOR UPDATE/);
  assert.match(migration, /INSERT INTO public\.payment_events[\s\S]*ON CONFLICT DO NOTHING/);
  assert.match(migration, /UPDATE public\.refunds[\s\S]*status = 'completed'/);
  assert.match(migration, /UPDATE public\.downloads[\s\S]*status = 'revoked'/);
  assert.match(migration, /UPDATE public\.subscriptions[\s\S]*status = 'cancelled'/);
  assert.match(migration, /REVOKE ALL ON FUNCTION[\s\S]*FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION[\s\S]*TO service_role/);
});

test('paid checkout sessions are idempotent and crypto instructions are recoverable', () => {
  const routes = [
    'src/app/api/payment/create-payoneer-session/route.ts',
    'src/app/api/payment/create-fastspring-session/route.ts',
    'src/app/api/payment/create-crypto-session/route.ts',
  ].map((file) => fs.readFileSync(file, 'utf8'));
  const checkout = fs.readFileSync('src/app/checkout/page.tsx', 'utf8');
  const recovery = fs.readFileSync('src/app/api/payment/checkout-session/route.ts', 'utf8');
  const migration = fs.readFileSync(
    'supabase/migrations/20260909223031_idempotent_checkout_sessions.sql',
    'utf8'
  );

  for (const route of routes) {
    assert.match(route, /readCheckoutIdempotencyKey\(request\)/);
    assert.match(route, /beginCheckoutAttempt\(/);
    assert.match(route, /finishCheckoutAttempt\(/);
    assert.doesNotMatch(route, /\.rpc\('create_priced_order'/);
  }
  assert.match(migration, /CREATE UNIQUE INDEX[\s\S]*user_id, checkout_idempotency_key/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /REVOKE ALL ON FUNCTION[\s\S]*FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION[\s\S]*TO service_role/);
  assert.match(checkout, /'Idempotency-Key': paidAttempt\.idempotencyKey/);
  assert.match(checkout, /window\.sessionStorage/);
  assert.doesNotMatch(checkout, /localStorage/);
  assert.match(checkout, /\/api\/payment\/checkout-session\?order_id=/);
  assert.match(recovery, /auth\.getUser\(\)/);
  assert.match(recovery, /\.eq\('user_id', user\.id\)/);
  assert.doesNotMatch(recovery, /createServiceClient/);
});

test('dashboard never sums unlike currencies and password email status reflects delivery result', () => {
  const dashboard = fs.readFileSync(
    'src/app/user-dashboard/components/DashboardOverview.tsx',
    'utf8'
  );
  const password = fs.readFileSync(
    'src/app/api/security/change-password/route.ts',
    'utf8'
  );

  assert.match(dashboard, /spendByCurrency/);
  assert.match(dashboard, /Object\.entries\(spendByCurrency\)/);
  assert.match(dashboard, /spendTotals\.map\(\(\[code,amount\]\)=>currency\(amount,code\)\)/);
  assert.doesNotMatch(dashboard, /completedOrders\.reduce\(\(s,o\)=>s\+Number/);
  assert.match(password, /const emailResult = await sendEmail/);
  assert.match(password, /emailNotificationSent = emailResult\.success/);
  assert.doesNotMatch(password, /await sendEmail\([\s\S]{0,800}emailNotificationSent = true/);
});

test('rate limits are counted atomically across Cloudflare workers', () => {
  const limiter = fs.readFileSync('src/lib/security/rateLimit.ts', 'utf8');
  const migration = fs.readFileSync(
    'supabase/migrations/20260909225902_distributed_api_rate_limits.sql',
    'utf8'
  );
  const routes = [
    'src/app/api/ai/chat-completion/route.ts',
    'src/app/api/ai/generate/route.ts',
    'src/app/api/ai/recommendations/route.ts',
    'src/app/api/ai/semantic-search/route.ts',
    'src/app/api/ai/store-assistant/route.ts',
    'src/app/api/ai/support-assistant/route.ts',
    'src/app/api/refunds/request/route.ts',
    'src/app/api/security/change-password/route.ts',
    'src/app/api/security/logout-all/route.ts',
    'src/app/api/security/logs/route.ts',
    'src/app/api/security/settings/route.ts',
  ];

  assert.match(limiter, /export async function checkRateLimit/);
  assert.match(limiter, /createHmac\('sha256', serviceSecret\)/);
  assert.match(limiter, /\.rpc\('consume_api_rate_limit'/);
  assert.match(migration, /ALTER TABLE public\.api_rate_limits ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /ON CONFLICT \(key_hash\) DO UPDATE/);
  assert.match(migration, /FOR UPDATE SKIP LOCKED/);
  assert.match(migration, /REVOKE ALL ON FUNCTION[\s\S]*FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION[\s\S]*TO service_role/);
  for (const file of routes) {
    const source = fs.readFileSync(file, 'utf8');
    assert.match(source, /await checkRateLimit\(/, file);
    assert.doesNotMatch(source, /=\s*checkRateLimit\(/, file);
  }
});
