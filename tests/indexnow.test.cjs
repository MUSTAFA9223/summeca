const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const key = '7f4b9d13c6e24a8f95b0d3e72c1a6f48';

test('IndexNow ownership file and deploy integration stay aligned', () => {
  const keyFile = fs.readFileSync(path.join(root, 'public', `${key}.txt`), 'utf8').trim();
  const submitter = fs.readFileSync(path.join(root, 'scripts', 'submit-indexnow.mjs'), 'utf8');
  const deploy = fs.readFileSync(path.join(root, '.github', 'workflows', 'deploy-cloudflare.yml'), 'utf8');

  assert.equal(keyFile, key);
  assert.match(submitter, new RegExp(`INDEXNOW_KEY = ['"]${key}['"]`));
  assert.match(submitter, /https:\/\/api\.indexnow\.org\/indexnow/);
  assert.match(deploy, /Notify IndexNow of deployed public URLs/);
  assert.match(deploy, new RegExp(`https:\\/\\/summeca\\.com\\/${key}\\.txt`));
});
