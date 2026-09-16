const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const sendRoute = fs.readFileSync('src/app/api/leadfollow/send-email/route.ts', 'utf8');
const page = fs.readFileSync('src/app/user-dashboard/leadfollow/page.tsx', 'utf8');
const sender = fs.readFileSync('supabase/functions/send-leadfollow-email/index.ts', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260916165000_leadfollow_email_delivery.sql', 'utf8');

test('LeadFollow email sending is authenticated, paid-access gated, rate limited, and same-origin protected', () => {
  assert.match(sendRoute, /auth\.getUser\(\)/);
  assert.match(sendRoute, /getSaasAccess\(user\.id, PRODUCT_SLUG\)/);
  assert.match(sendRoute, /requestOrigin.*new URL\(request\.url\)\.origin/s);
  assert.match(sendRoute, /leadfollow-email-hour/);
  assert.match(sendRoute, /leadfollow-email-day/);
  assert.match(sendRoute, /confirmed === true/);
});

test('LeadFollow never trusts a browser supplied recipient and only sends owned Email-channel drafts', () => {
  assert.match(sendRoute, /from\('leadfollow_messages'\)/);
  assert.match(sendRoute, /\.eq\('user_id', user\.id\)/);
  assert.match(sendRoute, /message\.channel !== 'email'/);
  assert.match(sendRoute, /from\('leadfollow_leads'\)/);
  assert.match(sendRoute, /const recipient = \(lead\.email/);
  assert.doesNotMatch(sendRoute, /body\.to/);

  // Sender identity comes only from a server-loaded mailbox connection or the
  // signed-in SUMMECA account used by the legacy fallback; neither is supplied
  // by the browser request body.
  assert.match(sendRoute, /from\('leadfollow_email_connections'\)/);
  assert.match(sendRoute, /const senderEmail = \(connection\?\.email/);
  assert.match(sendRoute, /fallbackReplyTo = \(user\.email/);
  assert.doesNotMatch(sendRoute, /body\.senderEmail|body\.replyTo|body\.from/);
});

test('LeadFollow marks contact only after the selected provider confirms the email send', () => {
  const connectedSendIndex = sendRoute.indexOf('sendMailboxMessage({');
  const fallbackInvokeIndex = sendRoute.indexOf("functions.invoke('send-leadfollow-email'");
  const leadPatchIndex = sendRoute.indexOf('const leadPatch');

  assert.ok(connectedSendIndex >= 0, 'connected Gmail/Microsoft send path must exist');
  assert.ok(fallbackInvokeIndex >= 0, 'legacy SUMMECA fallback send path must exist');
  assert.ok(
    leadPatchIndex > connectedSendIndex && leadPatchIndex > fallbackInvokeIndex,
    'lead contact state must only be updated after either provider path completes',
  );

  assert.match(sendRoute, /connected mailbox could not send this email[\s\S]*No lead status was changed/);
  assert.match(sendRoute, /if \(!sent\)[\s\S]*No lead status was changed/);
  assert.match(sendRoute, /if \(lead\.status === 'new'\) leadPatch\.status = 'contacted'/);
  assert.match(sendRoute, /last_contacted_at: sentAt/);
});

test('LeadFollow email worker keeps provider credentials server-side and replies to the signed-in owner', () => {
  assert.match(sender, /RESEND_API_KEY/);
  assert.match(sender, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(sender, /isAuthorized\(req\)/);
  assert.match(sender, /https:\/\/api\.resend\.com\/emails/);
  assert.match(sender, /from: FROM_EMAIL/);
  assert.match(sender, /reply_to: replyTo/);
  assert.match(sender, /Idempotency-Key/);
  assert.doesNotMatch(sender, /NEXT_PUBLIC_RESEND/);
});

test('LeadFollow email delivery audit table is service-role only', () => {
  assert.match(migration, /create table if not exists public\.leadfollow_email_deliveries/);
  assert.match(migration, /unique\(user_id, message_id\)/);
  assert.match(migration, /alter table public\.leadfollow_email_deliveries enable row level security/i);
  assert.match(migration, /revoke all on table public\.leadfollow_email_deliveries from anon, authenticated/i);
  assert.match(migration, /grant all on table public\.leadfollow_email_deliveries to service_role/i);
});

test('LeadFollow UI reviews and confirms email before a server-side send', () => {
  assert.match(page, /emailPermissionConfirmed/);
  assert.match(page, /I confirm I have permission or a lawful basis to email this lead/);
  assert.match(page, /fetch\('\/api\/leadfollow\/send-email'/);
  assert.match(page, /Send email/);
  assert.match(page, /latestDraftChannel === 'email'/);
  assert.match(page, /type="email" placeholder="Email"/);
});
