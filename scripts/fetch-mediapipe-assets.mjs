#!/usr/bin/env node
/**
 * Downloads the MediaPipe runtime + models into public/mediapipe so they are served
 * from our own origin (no third-party requests from candidates' browsers, no CSP
 * exceptions, works on restricted networks).
 *
 *   node scripts/fetch-mediapipe-assets.mjs            # skip files that already exist
 *   node scripts/fetch-mediapipe-assets.mjs --force
 *
 * Env: MEDIAPIPE_TASKS_VISION_VERSION (default 0.10.20; pin and test before changing)
 * Never fails the build: if the network is unavailable it prints a warning and exits 0,
 * and the app degrades gracefully (exam works, AI analysis reports "unavailable").
 * Use --strict to exit non-zero instead (CI check).
 */
import { mkdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION = process.env.MEDIAPIPE_TASKS_VISION_VERSION || '0.10.20';
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/mediapipe');
const force = process.argv.includes('--force');
const strict = process.argv.includes('--strict');
const NPM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}`;

const MODELS = {
  'blaze_face_short_range.tflite': 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
  'face_landmarker.task': 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
};
const FALLBACK_WASM = ['vision_wasm_internal.js', 'vision_wasm_internal.wasm', 'vision_wasm_nosimd_internal.js', 'vision_wasm_nosimd_internal.wasm'];

const exists = (f) => stat(f).then(() => true, () => false);

async function wasmFiles() {
  try {
    const r = await fetch(`https://data.jsdelivr.com/v1/packages/npm/@mediapipe/tasks-vision@${VERSION}?structure=flat`);
    if (r.ok) {
      const names = (await r.json()).files.map((f) => f.name).filter((n) => /^\/wasm\/[\w.-]+\.(js|wasm)$/.test(n)).map((n) => n.slice(6));
      if (names.length) return names;
    }
  } catch { /* use fallback */ }
  return FALLBACK_WASM;
}

async function get(url, dest) {
  if (!force && (await exists(dest))) return 'kept';
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, Buffer.from(await r.arrayBuffer()));
  return 'downloaded';
}

try {
  const jobs = [[`${NPM}/mediapipe/vision_bundle.mjs`, path.join(OUT, 'vision_bundle.mjs')]];
  for (const f of await wasmFiles()) jobs.push([`${NPM}/wasm/${f}`, path.join(OUT, 'wasm', f)]);
  for (const [name, url] of Object.entries(MODELS)) jobs.push([url, path.join(OUT, name)]);
  for (const [url, dest] of jobs) console.log(`${(await get(url, dest)).padEnd(10)} ${path.relative(OUT, dest)}`);
  await writeFile(path.join(OUT, 'VERSION.txt'), `@mediapipe/tasks-vision ${VERSION}\n`);
  console.log(`MediaPipe assets ready in ${OUT}`);
} catch (e) {
  console.warn(`WARNING: could not fetch MediaPipe assets (${e.message}). AI analysis will be reported as unavailable; the exam itself is unaffected.`);
  process.exit(strict ? 1 : 0);
}
