const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('obsolete password-reset email endpoint is removed', () => {
  assert.equal(fs.existsSync('src/app/api/email/password-reset/route.ts'), false);
});

test('reset page accepts token-hash recovery only and rejects legacy implicit/code handling', () => {
  const source = fs.readFileSync('src/app/reset-password/page.tsx', 'utf8');
  assert.match(source, /searchParams\.get\('token_hash'\)/);
  assert.match(source, /type === 'recovery'/);
  assert.match(source, /fetch\('\/api\/auth\/recovery\/reset-password'/);
  assert.doesNotMatch(source, /searchParams\.get\('code'\)/);
  assert.doesNotMatch(source, /searchParams\.get\('sb_flow_id'\)/);
  assert.doesNotMatch(source, /searchParams\.get\('access_token'\)/);
  assert.doesNotMatch(source, /searchParams\.get\('refresh_token'\)/);
  assert.doesNotMatch(source, /auth\.setSession\(/);
  assert.doesNotMatch(source, /exchangeCodeForSession\(/);
  assert.doesNotMatch(source, /(?:window\.)?localStorage\.(?:getItem|setItem|removeItem)/);
});

test('recovery endpoint is isolated, non-persistent, scanner-safe, and returns generic update errors', () => {
  const source = fs.readFileSync('src/app/api/auth/recovery/reset-password/route.ts', 'utf8');
  assert.match(source, /persistSession:\s*false/);
  assert.match(source, /autoRefreshToken:\s*false/);
  assert.match(source, /detectSessionInUrl:\s*false/);
  assert.match(source, /auth\.verifyOtp\(\{[\s\S]*type:\s*'recovery'[\s\S]*token_hash:\s*tokenHash/);
  assert.match(source, /auth\.updateUser\(\{ password:\s*newPassword \}\)/);
  assert.match(source, /Unable to update your password\. Please request a new reset link and try again\./);
  assert.doesNotMatch(source, /error:\s*updateError\.message/);
  assert.match(source, /private, no-store, max-age=0/);
});

test('Google OAuth PKCE verifier is server-only and short-lived', () => {
  const starter = fs.readFileSync('src/app/auth/google/route.ts', 'utf8');
  const callback = fs.readFileSync('src/app/auth/callback/route.ts', 'utf8');

  for (const source of [starter, callback]) {
    assert.match(source, /PKCE_VERIFIER_MAX_AGE_SECONDS\s*=\s*10\s*\*\s*60/);
    assert.match(source, /isPkceVerifierCookie/);
    assert.match(source, /httpOnly:\s*pkceVerifier/);
    assert.match(source, /maxAge:\s*PKCE_VERIFIER_MAX_AGE_SECONDS/);
  }

  assert.match(starter, /auth\.signInWithOAuth\(\{/);
  assert.match(starter, /skipBrowserRedirect:\s*true/);
  assert.match(callback, /exchangeCodeForSession\(/);
});

test('AuthContext does not propagate implicit recovery fragments and sanitizes user-facing auth errors', () => {
  const source = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf8');
  assert.match(source, /search\.get\('type'\) === 'recovery'/);
  assert.match(source, /Boolean\(search\.get\('token_hash'\)\)/);
  assert.doesNotMatch(source, /window\.location\.hash/);
  assert.doesNotMatch(source, /url\.hash\s*=/);
  assert.doesNotMatch(source, /PASSWORD_RECOVERY/);
  assert.match(source, /throw new Error\('Unable to create your account\. Please check your details and try again\.'\)/);
  assert.match(source, /throw new Error\('Unable to sign in\. Check your email and password and try again\.'\)/);
  assert.match(source, /throw new Error\('Unable to request a password reset right now\. Please try again\.'\)/);
});

test('confirmation route remains token-hash based and recovery is not consumed on GET', () => {
  const source = fs.readFileSync('src/app/auth/confirm/route.ts', 'utf8');
  assert.match(source, /auth\.verifyOtp\(\{[\s\S]*token_hash:\s*tokenHash[\s\S]*type,/);
  const recoveryStart = source.indexOf("if (type === 'recovery')");
  const verifyStart = source.indexOf('supabase.auth.verifyOtp');
  assert.notEqual(recoveryStart, -1);
  assert.notEqual(verifyStart, -1);
  assert.ok(recoveryStart < verifyStart);
});
