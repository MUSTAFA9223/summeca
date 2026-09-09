const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('token-hash email confirmation verifies non-recovery links server-side', () => {
  const source = fs.readFileSync('src/app/auth/confirm/route.ts', 'utf8');
  assert.match(source, /createServerClient/);
  assert.match(source, /auth\.verifyOtp\(\{[\s\S]*token_hash:\s*tokenHash[\s\S]*type,/);
  assert.match(source, /pendingCookies[\s\S]*response\.cookies\.set/);
  assert.match(source, /'signup'/);
  assert.match(source, /'email_change'/);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY|createServiceClient/);
});

test('recovery token-hash links are redirected without being consumed on GET', () => {
  const source = fs.readFileSync('src/app/auth/confirm/route.ts', 'utf8');
  const recoveryStart = source.indexOf("if (type === 'recovery')");
  const verifyStart = source.indexOf('supabase.auth.verifyOtp');
  assert.notEqual(recoveryStart, -1);
  assert.notEqual(verifyStart, -1);
  assert.ok(recoveryStart < verifyStart);
  const recoveryBlock = source.slice(recoveryStart, source.indexOf('if (!VERIFIABLE_TYPES.has(type))'));
  assert.match(recoveryBlock, /url\.pathname = '\/reset-password'/);
  assert.doesNotMatch(recoveryBlock, /verifyOtp/);
});
