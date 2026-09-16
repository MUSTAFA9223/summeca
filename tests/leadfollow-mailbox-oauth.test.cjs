const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const migration = fs.readFileSync('supabase/migrations/20260916172000_leadfollow_mailbox_connections.sql', 'utf8');
const helpers = fs.readFileSync('src/lib/email/leadfollowMailbox.ts', 'utf8');
const connections = fs.readFileSync('src/app/api/leadfollow/email-connections/route.ts', 'utf8');
const start = fs.readFileSync('src/app/api/leadfollow/email-connections/[provider]/start/route.ts', 'utf8');
const callback = fs.readFileSync('src/app/api/leadfollow/email-connections/[provider]/callback/route.ts', 'utf8');
const send = fs.readFileSync('src/app/api/leadfollow/send-email/route.ts', 'utf8');
const mailboxPage = fs.readFileSync('src/app/user-dashboard/leadfollow/mailbox/page.tsx', 'utf8');
const sidebar = fs.readFileSync('src/app/user-dashboard/components/DashboardSidebar.tsx', 'utf8');

test('LeadFollow mailbox tokens are server-only and encrypted at rest', () => {
  assert.match(migration, /create table if not exists public\.leadfollow_email_connections/);
  assert.match(migration, /encrypted_refresh_token text not null/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on table public\.leadfollow_email_connections from anon, authenticated/);
  assert.match(migration, /grant all on table public\.leadfollow_email_connections to service_role/);
  assert.match(helpers, /createCipheriv\('aes-256-gcm'/);
  assert.match(helpers, /EMAIL_OAUTH_ENCRYPTION_KEY/);
});

test('mailbox OAuth uses minimum send scopes and offline refresh access', () => {
  assert.match(helpers, /gmail\.send/);
  assert.match(helpers, /Mail\.Send/);
  assert.match(helpers, /offline_access/);
  assert.match(helpers, /access_type', 'offline'/);
  assert.match(helpers, /prompt', 'consent'/);
  assert.match(helpers, /gmail\.googleapis\.com\/gmail\/v1\/users\/me\/messages\/send/);
  assert.match(helpers, /graph\.microsoft\.com\/v1\.0\/me\/sendMail/);
});

test('OAuth callback validates state and never returns refresh tokens to the browser', () => {
  assert.match(start, /randomBytes\(32\)/);
  assert.match(start, /httpOnly: true/);
  assert.match(callback, /timingSafeEqual/);
  assert.match(callback, /encryptMailboxToken\(refreshToken\)/);
  assert.doesNotMatch(connections, /encrypted_refresh_token.*return/);
  assert.match(connections, /select\('provider, email, status, last_error, last_used_at, connected_at, updated_at'\)/);
});

test('mailbox connect routes require authenticated paid LeadFollow access', () => {
  for (const route of [connections, start, callback]) {
    assert.match(route, /getSaasAccess\(user\.id, PRODUCT_SLUG\)/);
  }
  assert.match(start, /session\.auth\.getUser\(\)/);
  assert.match(callback, /session\.auth\.getUser\(\)/);
});

test('LeadFollow sends from a connected mailbox when available and preserves the safe SUMMECA fallback', () => {
  assert.match(send, /from\('leadfollow_email_connections'\)/);
  assert.match(send, /refreshMailboxAccessToken/);
  assert.match(send, /sendMailboxMessage/);
  assert.match(send, /sender_provider: senderProvider/);
  assert.match(send, /sender_email: auditSenderEmail/);
  assert.match(send, /if \(connectedMailbox\)/);
  assert.match(send, /service\.functions\.invoke\('send-leadfollow-email'/);
  assert.match(send, /mailbox_reconnect_required/);
});

test('customer dashboard exposes mailbox connection controls without asking for a password', () => {
  assert.match(sidebar, /\/user-dashboard\/leadfollow\/mailbox/);
  assert.match(mailboxPage, /Connect Google/);
  assert.match(mailboxPage, /Connect Microsoft/);
  assert.match(mailboxPage, /never the mailbox password/i);
  assert.doesNotMatch(mailboxPage, /type="password"/);
});
