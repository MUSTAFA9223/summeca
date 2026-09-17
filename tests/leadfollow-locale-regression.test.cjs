const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const dashboardLayout = read('src/app/user-dashboard/components/DashboardLayout.tsx');
const leadFollowDateTimeInputs = read('src/app/user-dashboard/components/LeadFollowEnglishDateTimeInputs.tsx');
const globalLanguageSwitcher = read('src/components/GlobalLanguageSwitcher.tsx');

test('LeadFollow forces its visible follow-up date fields to a stable English format', () => {
  assert.match(dashboardLayout, /activeRoute === 'leadfollow'.*LeadFollowEnglishDateTimeInputs/s);
  assert.match(leadFollowDateTimeInputs, /Next follow-up time/);
  assert.match(leadFollowDateTimeInputs, /Selected lead follow-up time/);
  assert.match(leadFollowDateTimeInputs, /input\.type = 'text'/);
  assert.match(leadFollowDateTimeInputs, /input\.lang = 'en-US'/);
  assert.match(leadFollowDateTimeInputs, /input\.dir = 'ltr'/);
  assert.match(leadFollowDateTimeInputs, /YYYY-MM-DDTHH:mm/);
});

test('global language fallback disappears when a hosted dashboard switcher mounts later', () => {
  assert.match(globalLanguageSwitcher, /HOST_SELECTOR/);
  assert.match(globalLanguageSwitcher, /MutationObserver/);
  assert.match(globalLanguageSwitcher, /observer\.observe\(document\.body, \{ childList: true, subtree: true \}\)/);
  assert.match(globalLanguageSwitcher, /observer\.disconnect\(\)/);
});
