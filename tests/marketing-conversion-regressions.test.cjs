const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const signup = read('src/app/sign-up-login-screen/components/SignupForm.tsx');
const quickStart = read('src/app/user-dashboard/components/DashboardQuickStart.tsx');
const dashboardPage = read('src/app/user-dashboard/page.tsx');

test('email signup records funnel milestones without sending identity fields to analytics', () => {
  assert.match(signup, /trackEvent\('signup_started'/);
  assert.match(signup, /trackEvent\('signup_completed'/);
  assert.match(signup, /method: 'email'/);
  assert.match(signup, /confirmation_required/);

  const analyticsCalls = signup.match(/trackEvent\([\s\S]*?\n\s*\}\);/g) ?? [];
  const analyticsSource = analyticsCalls.join('\n');
  assert.doesNotMatch(analyticsSource, /data\.email/);
  assert.doesNotMatch(analyticsSource, /data\.fullName/);
  assert.doesNotMatch(analyticsSource, /data\.password/);
});

test('dashboard includes a dismissible three-step quick start instead of a dead empty state', () => {
  assert.match(dashboardPage, /DashboardQuickStart/);
  assert.match(quickStart, /Get to your first useful workflow in three clear steps/);
  assert.match(quickStart, /Browse products/);
  assert.match(quickStart, /View pricing/);
  assert.match(quickStart, /Get help/);
  assert.match(quickStart, /localStorage/);
});
