import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const allowedEnvFiles = new Set([
  '.env.example',
  '.env.sample',
  '.env.template',
]);

const excludedPrefixes = [
  'node_modules/',
  '.next/',
  'dist/',
  'build/',
  '.open-next/',
  'coverage/',
];

const secretPatterns = [
  ['OpenAI API key', /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/],
  ['Anthropic API key', /\bsk-ant-[A-Za-z0-9_-]{20,}\b/],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{20,}\b/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{30,}\b/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['Stripe live secret key', /\bsk_live_[0-9A-Za-z]{16,}\b/],
  ['Resend API key', /\bre_[A-Za-z0-9_-]{20,}\b/],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/],
  ['Private key block', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
];

const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean)
  .filter((file) => !excludedPrefixes.some((prefix) => file.startsWith(prefix)));

const violations = [];

for (const file of tracked) {
  const base = path.basename(file);
  if (base === '.env' || (base.startsWith('.env.') && !allowedEnvFiles.has(base))) {
    violations.push({ file, rule: 'tracked environment file' });
    continue;
  }

  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  for (const [rule, pattern] of secretPatterns) {
    if (pattern.test(content)) {
      violations.push({ file, rule });
    }
  }
}

if (violations.length > 0) {
  console.error('Secret scan failed. Potential credential material was detected:');
  for (const { file, rule } of violations) {
    console.error(`- ${file}: ${rule}`);
  }
  console.error('No secret values are printed by this scanner. Remove the credential from Git and use a secret store.');
  process.exit(1);
}

console.log(`Secret scan passed for ${tracked.length} tracked files.`);
