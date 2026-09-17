const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const generate = fs.readFileSync('src/app/api/leadfollow/generate/route.ts', 'utf8');
const sendRoute = fs.readFileSync('src/app/api/leadfollow/send-email/route.ts', 'utf8');
const mailbox = fs.readFileSync('src/lib/email/leadfollowMailbox.ts', 'utf8');
const page = fs.readFileSync('src/app/user-dashboard/leadfollow/page.tsx', 'utf8');

test('LeadFollow drafts prefer concrete business facts over generic filler', () => {
  assert.match(generate, /anchor the message to at least one concrete supplied business\/offer fact/);
  assert.match(generate, /do NOT fall back to vague phrases such as "our company", "what we do"/);
  assert.match(generate, /A stage named follow-up or revive does NOT prove that a conversation happened/);
  assert.match(generate, /Do not output placeholders such as \[Company\]/);
  assert.match(generate, /finish an email with a natural closing and that business name/);
  assert.match(generate, /Prior contact recorded by LeadFollow/);
});

test('LeadFollow shows the connected sender identity before delivery', () => {
  assert.match(page, /fetch\('\/api\/leadfollow\/email-connections'/);
  assert.match(page, /type MailboxConnection/);
  assert.match(page, /From:/);
  assert.match(page, /Manage mailbox/);
  assert.match(page, /This message will be sent from/);
  assert.match(page, /Draft context ready/);
});

test('Connected Gmail sends use a server-loaded safe business display name', () => {
  assert.match(sendRoute, /from\('leadfollow_profiles'\)/);
  assert.match(sendRoute, /const senderBusinessName = safeDisplayName/);
  assert.match(sendRoute, /senderName: senderBusinessName/);
  assert.doesNotMatch(sendRoute, /body\.senderName|body\.businessName/);
  assert.match(mailbox, /senderName\?: string/);
  assert.match(mailbox, /replace\(\/\[\\r\\n\]\+\/g, ' '\)/);
  assert.match(mailbox, /From: \$\{fromHeader\}/);
});
