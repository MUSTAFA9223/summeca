const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sidebar = fs.readFileSync(path.join(root, 'src/app/user-dashboard/components/DashboardSidebar.tsx'), 'utf8');
const route = fs.readFileSync(path.join(root, 'src/app/api/leadfollow/email-connections/route.ts'), 'utf8');

test('Email Sender navigation follows LeadFollow entitlement', () => {
  assert.match(sidebar, /fetch\('\/api\/leadfollow\/email-connections'/);
  assert.match(sidebar, /setCanUseLeadFollowEmail\(response\.ok\)/);
  const guardedItems = sidebar.match(/item\.id !== 'leadfollow-mailbox' \|\| canUseLeadFollowEmail/g) || [];
  assert.equal(guardedItems.length, 2, 'desktop and mobile navigation should both hide Email Sender without access');
});

test('Email Sender API remains protected server-side', () => {
  assert.match(route, /getSaasAccess\(user\.id, PRODUCT_SLUG\)/);
  assert.match(route, /LeadFollow AI purchase required/);
  assert.match(route, /403/);
});
