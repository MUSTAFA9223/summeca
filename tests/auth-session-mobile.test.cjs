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
  assert.match(source, /appendDomainAuthCookieCleanup\(request, response\)/);
  assert.match(source, /Domain=\$\{domain\}/);
  assert.match(source, /name\.includes\('-auth-token'\)/);
  assert.match(source, /name\.includes\('-code-verifier'\)/);
  assert.doesNotMatch(source, /@\/lib\/supabase\/server/);
});

test('Google OAuth starts server-side with canonical callback and fresh PKCE cookies', () => {
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
  assert.match(starter, /getAll\(\)\s*\{\s*return \[\];/);
  assert.match(starter, /clearStaleAuthCookies\(request, response\)/);
  assert.match(starter, /appendDomainAuthCookieCleanup\(request, response\)/);
  assert.match(starter, /Domain=\$\{domain\}/);
  assert.match(starter, /pendingCookies/);
  assert.match(starter, /response\.cookies\.set/);

  assert.match(callback, /searchParams\.get\('sb_flow_id'\)/);
  assert.match(callback, /exchangeCodeForSession\([\s\S]*flowId \? \{ flowId \}/);
  assert.match(callback, /getCookiesForSupabase\(request\)/);
  assert.match(callback, /authByName\.set\(name,/);
  assert.match(callback, /clearStaleAuthCookies\(request, response\)/);
  assert.match(callback, /appendDomainAuthCookieCleanup\(request, response\)/);
});

test('password sign-in uses a native browser POST and redirects with the fresh session', () => {
  const form = fs.readFileSync('src/app/sign-up-login-screen/components/LoginForm.tsx', 'utf8');
  const route = fs.readFileSync('src/app/api/auth/password-sign-in/route.ts', 'utf8');
  const page = fs.readFileSync('src/app/sign-up-login-screen/page.tsx', 'utf8');

  assert.match(form, /action="\/api\/auth\/password-sign-in"/);
  assert.match(form, /method="post"/);
  assert.match(form, /name="email"/);
  assert.match(form, /name="password"/);
  assert.doesNotMatch(form, /fetch\('\/api\/auth\/password-sign-in'/);
  assert.doesNotMatch(form, /window\.location\.replace\(/);
  assert.doesNotMatch(form, /useAuth\(|signIn\(data\.email/);

  assert.match(route, /request\.formData\(\)/);
  assert.match(route, /createServerClient/);
  assert.match(route, /getAll\(\)\s*\{\s*return \[\];/);
  assert.match(route, /auth\.signInWithPassword\(\{ email, password \}\)/);
  assert.match(route, /NextResponse\.redirect\(new URL\(destination, request\.url\), 303\)/);
  assert.match(route, /clearStaleAuthCookies\(request, response\)/);
  assert.match(route, /appendDomainAuthCookieCleanup\(request, response\)/);
  assert.match(route, /Domain=\$\{domain\}/);
  assert.match(route, /cookie\.name\.startsWith\(prefix\)/);
  assert.match(route, /maxAge:\s*0/);
  assert.match(route, /pendingCookies/);
  assert.match(route, /response\.cookies\.set/);
  assert.match(route, /sameSite:\s*'lax'/);
  assert.match(route, /secure:\s*process\.env\.NODE_ENV === 'production'/);
  assert.match(route, /private, no-store, max-age=0/);
  assert.match(route, /Pragma:\s*'no-cache'/);
  assert.match(route, /sec-fetch-site/);

  assert.match(page, /dynamic\s*=\s*'force-dynamic'/);
  assert.match(page, /revalidate\s*=\s*0/);
});

test('middleware prefers the newest duplicate Supabase auth cookie from Chrome', () => {
  const source = fs.readFileSync('src/middleware.ts', 'utf8');
  assert.match(source, /rawCookieHeader\.split\(';'\)/);
  assert.match(source, /authByName\.set\(name,/);
  assert.match(source, /return \[\.\.\.nonAuthCookies, \.\.\.authByName\.values\(\)\]/);
  assert.match(source, /getAll\(\)\s*\{\s*return getCookiesForSupabase\(request\);/);
});

test('auth email and recovery redirects prefer the configured canonical site URL', () => {
  const source = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf8');
  const envCheck = source.indexOf('if (process.env.NEXT_PUBLIC_SITE_URL)');
  const windowCheck = source.indexOf("if (typeof window !== 'undefined') return window.location.origin");
  assert.ok(envCheck >= 0 && windowCheck >= 0 && envCheck < windowCheck);
  assert.match(source, /emailRedirectTo:\s*`\$\{getSiteUrl\(\)\}\/auth\/callback`/);
  assert.match(source, /redirectTo:\s*`\$\{getSiteUrl\(\)\}\/reset-password`/);
});
