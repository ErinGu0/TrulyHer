#!/usr/bin/env node
/**
 * Copy the ONNX Runtime Web WASM binaries into public/ort/.
 *
 * transformers.js resolves these at runtime via `import.meta.url`, which
 * Create React App's webpack config cannot statically analyse -- that is the
 * "Critical dependency: Accessing import.meta directly is unsupported" warning
 * during the build. Left alone, the chunk builds fine and then fails to find
 * its WASM at runtime.
 *
 * Serving the binaries ourselves and pointing `env.backends.onnx.wasm.wasmPaths`
 * at them (see src/services/imposterClassifier.js) sidesteps the resolution
 * entirely, and keeps the app off a CDN -- worth something for a journaling app
 * that promises the entry stays on the device.
 *
 * Runs automatically via prestart/prebuild.
 */

const fs = require('fs');
const path = require('path');

const DEST = path.join(__dirname, '..', 'public', 'ort');

function findDist() {
  // onnxruntime-web's `exports` map does not expose ./package.json, so
  // require.resolve on it throws. Resolve the entry point and walk up to the
  // package root instead, with a plain node_modules lookup as a fallback.
  try {
    let dir = path.dirname(require.resolve('onnxruntime-web'));
    for (let i = 0; i < 5; i += 1) {
      if (fs.existsSync(path.join(dir, 'package.json'))) {
        return path.join(dir, 'dist');
      }
      dir = path.dirname(dir);
    }
  } catch {
    // fall through
  }

  const fallback = path.join(__dirname, '..', 'node_modules', 'onnxruntime-web', 'dist');
  return fs.existsSync(fallback) ? fallback : null;
}

function main() {
  const dist = findDist();
  if (!dist || !fs.existsSync(dist)) {
    // Not an error: the app runs without the local classifier.
    console.log('[copy-ort] onnxruntime-web not installed; skipping.');
    return;
  }

  // Only the runtime binaries and their loader shims. The dist folder also
  // holds the ort.*.mjs JS bundles, but webpack already pulls those in through
  // the import graph -- copying them would add ~15 MB to the deploy for nothing.
  const files = fs
    .readdirSync(dist)
    .filter((name) => name.startsWith('ort-wasm') && (name.endsWith('.wasm') || name.endsWith('.mjs')));

  if (files.length === 0) {
    console.log('[copy-ort] no runtime files found; skipping.');
    return;
  }

  fs.mkdirSync(DEST, { recursive: true });

  let copied = 0;
  for (const name of files) {
    const source = path.join(dist, name);
    const target = path.join(DEST, name);

    // Skip unchanged files so repeated builds stay fast.
    if (fs.existsSync(target) && fs.statSync(target).size === fs.statSync(source).size) {
      continue;
    }
    fs.copyFileSync(source, target);
    copied += 1;
  }

  console.log(`[copy-ort] ${copied} file(s) copied to public/ort/ (${files.length} total)`);
}

main();
