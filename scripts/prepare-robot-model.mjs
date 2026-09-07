import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { brotliDecompressSync } from 'node:zlib';

const partsDir = resolve('model-assets/summeca-robot');
const output = resolve('public/assets/models/summeca-robot.glb');

const parts = (await readdir(partsDir))
  .filter((name) => name.endsWith('.b64'))
  .sort();

if (parts.length === 0) {
  throw new Error('SUMMECA robot model parts are missing.');
}

const encoded = (await Promise.all(parts.map((name) => readFile(resolve(partsDir, name), 'utf8')))).join('');
const compressed = Buffer.from(encoded, 'base64');
const model = brotliDecompressSync(compressed);

await mkdir(dirname(output), { recursive: true });
await writeFile(output, model);
console.log(`Prepared SUMMECA robot model (${model.length} bytes from ${parts.length} parts).`);
