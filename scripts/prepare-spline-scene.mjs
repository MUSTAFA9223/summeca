import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const SCENE_URL = 'https://prod.spline.design/H69K35LVSzZ9WcEG/scene.splinecode';
const OUTPUT_PATH = resolve('public/assets/spline/summeca-robot.splinecode');
const MIN_SCENE_BYTES = 1024;

const response = await fetch(SCENE_URL, {
  redirect: 'follow',
  headers: {
    Accept: 'application/octet-stream,*/*',
    'User-Agent': 'SUMMECA-production-build/1.0',
  },
  signal: AbortSignal.timeout(30000),
});

if (!response.ok) {
  throw new Error(`Failed to download Spline scene: HTTP ${response.status}`);
}

const scene = Buffer.from(await response.arrayBuffer());
if (scene.byteLength < MIN_SCENE_BYTES) {
  throw new Error(`Spline scene is unexpectedly small: ${scene.byteLength} bytes`);
}

await mkdir(dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, scene);

console.log(`Prepared self-hosted Spline scene (${scene.byteLength} bytes).`);
