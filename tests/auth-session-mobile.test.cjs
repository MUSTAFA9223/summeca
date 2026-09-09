const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('signed-in password change verifies current password without creating a second session', () => {
  const source = fs.readFileSync('src/app/api/security/change-password/route.ts', 'utf8');
  assert.match(source, /auth\.updateUser\(\{[\s\S]*password:\s*newPassword,[\s\S]*current_password:\s*currentPassword/);
  assert.doesNotMatch(source, /auth\.signInWithPassword\(/);
});

test('password recovery uses an isolated non-persistent auth client and clears stale browser cookies', () => {
  const source = fs.readFileSync('src/app/api/auth/recovery/reset-password/route.ts', 'utf8');
  assert.match(source, /createClient as createSupabaseClient/);
  assert.match(source, /persistSession:\s*false/);
  assert.match(source, /autoRefreshToken:\s*false/);
  assert.match(source, /detectSessionInUrl:\s*false/);
  assert.match(source, /auth\.verifyOtp\(\{[\s\S]*type:\s*'recovery'/);
  assert.match(source, /auth\.updateUser\(\{ password:\s*newPassword \}\)/);
  assert.match(source, /clearBrowserAuthCookies\(request, response\)/);
  assert.match(source, /name\.includes\('-auth-token'\)/);
  assert.match(source, /name\.includes\('-code-verifier'\)/);
  assert.doesNotMatch(source, /@\/lib\/supabase\/server/);
});

test('Google OAuth starts server-side with canonical callback and first-party PKCE cookies', () => {
  const button = fs.readFileSync('src/app/sign-up-login-screen/components/GoogleOAuthButton.tsx', 'utf8');
  const starter = fs.readFileSync('src/app/auth/google/route.ts', 'utf8');
  const callback = fs.readFileSync('src/app/auth/callback/route.ts', 'utf8');

  assert.match(button, /new URL\('\/auth\/google'/);
  assert.match(button, /window\.location\.assign\(/);
  assert.doesNotMatch(button, /signInWithOAuth/);

  assert.match(starter, /createServerClient/);
  assert.match(starter, /NEXT_PUBLIC_SITE_URL/);
  assert.match(starter, /new URL\('\/auth\/callback', canonicalOrigin\)/);
  assert.match(starter, /appendPkceFlowIdToRedirects:\s*true/);
  assert.match(starter, /auth\.signInWithOAuth\(\{/);
  assert.match(starter, /skipBrowserRedirect:\s*true/);
  assert.match(starter, /pendingCookies/);
  assert.match(starter, /response\.cookies\.set/);

  assert.match(callback, /searchParams\.get\('sb_flow_id'\)/);
  assert.match(callback, /exchangeCodeForSession\([\s\S]*flowId \? \{ flowId \}/);
});

test('password sign-in performs a full navigation so fresh auth cookies reach protected routes', () => {
  const source = fs.readFileSync('src/app/sign-up-login-screen/components/LoginForm.tsx', 'utf8');
  assert.match(source, /window\.location\.replace\(destination\)/);
  assert.doesNotMatch(source, /router\.replace\(destination\)/);
  assert.match(source, /value\.startsWith\('\/sign-up-login-screen'\)/);
});

test('auth email and recovery redirects prefer the configured canonical site URL', () => {
  const source = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf8');
  const envCheck = source.indexOf('if (process.env.NEXT_PUBLIC_SITE_URL)');
  const windowCheck = source.indexOf("if (typeof window !== 'undefined') return window.location.origin");
  assert.ok(envCheck >= 0 && windowCheck >= 0 && envCheck < windowCheck);
  assert.match(source, /emailRedirectTo:\s*`\$\{getSiteUrl\(\)\}\/auth\/callback`/);
  assert.match(source, /redirectTo:\s*`\$\{getSiteUrl\(\)\}\/reset-password`/);
});
