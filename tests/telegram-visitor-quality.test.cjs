const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const visitRoute = read('src/app/api/analytics/visit/route.ts');
const telegram = read('src/lib/telegram/server.ts');

test('visitor analytics suppresses repeated alerts without storing a raw IP', () => {
  assert.match(visitRoute, /DUPLICATE_ALERT_WINDOW_MS = 2 \* 60 \* 1000/);
  assert.match(visitRoute, /contains\('metadata', \{ visitorKey: stableVisitorKey \}\)/);
  assert.match(visitRoute, /if \(isNew && !duplicateAlert\)/);
  assert.match(visitRoute, /maskIp\(rawIp\)/);
  assert.match(visitRoute, /visitorKey: stableVisitorKey \|\| undefined/);
  assert.doesNotMatch(visitRoute, /metadata:\s*\{[^}]*rawIp/s);
});

test('visitor analytics uses privacy-safe fingerprints and bot signals', () => {
  assert.match(visitRoute, /crypto\.subtle\.importKey/);
  assert.match(visitRoute, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(visitRoute, /botManagement/);
  assert.match(visitRoute, /Likely bot/);
  assert.match(visitRoute, /Returning visitor/);
});

test('Telegram visit alerts show visitor status, traffic quality, and masked IP', () => {
  assert.match(telegram, /Returning visitor on SUMMECA/);
  assert.match(telegram, /Traffic: \$\{trafficType\}/);
  assert.match(telegram, /IP: \$\{maskedIp\}/);
  assert.match(telegram, /Visit: \$\{visitorStatus\}/);
});
