const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('visible top-level controls do not offer Arabic', () => {
  for (const file of [
    'src/components/PublicNav.tsx',
    'src/app/user-dashboard/components/DashboardTopbar.tsx',
    'src/app/admin/components/AdminShell.tsx',
    'src/app/layout.tsx',
  ]) {
    const source = read(file);
    assert.doesNotMatch(source, /<LanguageSwitcher|<CompactLanguageSwitcher|GlobalLanguageSwitcher/);
  }
});
