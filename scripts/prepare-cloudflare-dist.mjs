import { cp, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const source = '.open-next/assets';
const target = 'dist';

if (!existsSync(source)) {
  throw new Error(`OpenNext assets directory not found: ${source}`);
}

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });

console.log(`Prepared ${target} from ${source}`);
