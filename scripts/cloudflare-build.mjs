import { spawnSync } from 'node:child_process';

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env,
    shell: process.platform === 'win32',
  });

  if (result.error) throw result.error;
  if (result.signal) {
    throw new Error(`${command} terminated by ${result.signal}`);
  }
  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status);
  }
}

const innerBuild = process.env.SUMMECA_OPENNEXT_INNER === '1';

if (innerBuild) {
  run('npx', ['--no-install', 'next', 'build']);
  process.exit(0);
}

run(
  'npx',
  ['--no-install', 'opennextjs-cloudflare', 'build'],
  { ...process.env, SUMMECA_OPENNEXT_INNER: '1' },
);

run(process.execPath, ['scripts/prepare-cloudflare-dist.mjs']);
