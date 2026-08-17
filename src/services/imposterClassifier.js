/**
 * imposterClassifier.js
 *
 * Runs the fine-tuned imposter-syndrome classifier in the browser, via
 * onnxruntime-web through transformers.js.
 *
 * The journal text never leaves the device for this step. That is the point:
 * the app asks people to write down the thing they are most afraid is true
 * about themselves, so the classification of that text should happen locally.
 * Gemini still writes the response -- it is far better at warm, specific
 * language than a 66M-parameter model -- but it no longer decides *whether*
 * this is imposter syndrome.
 *
 * Every failure path here returns null rather than throwing. A missing model
 * bundle, an unsupported browser, or a slow first load must never stop someone
 * from saving what they wrote; the server falls back to Gemini's own judgment.
 *
 * Build the bundle with:  python ml/export_onnx.py
 */

const MODEL_ID = 'imposter-clf';
const MODEL_ROOT = '/models/';
const CALIBRATION_URL = `${MODEL_ROOT}${MODEL_ID}/calibration.json`;
const MAX_LENGTH = 256;

// First load pulls ~67 MB and compiles the WASM graph. After that the browser
// cache makes it near-instant, so a generous ceiling only ever costs the very
// first entry.
const LOAD_TIMEOUT_MS = 30_000;
const INFERENCE_TIMEOUT_MS = 5_000;

let loadPromise = null;
let unavailable = false;

async function withTimeout(promise, ms, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function load() {
  // Dynamic import keeps transformers.js and the ONNX runtime out of the main
  // bundle; they are only fetched when someone actually writes an entry.
  const { AutoTokenizer, AutoModelForSequenceClassification, env } = await import(
    '@huggingface/transformers'
  );

  // Serve strictly from public/models. Never silently reach out to the HF Hub:
  // a wrong-but-loadable model would produce plausible numbers that nothing in
  // this pipeline calibrated.
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.localModelPath = MODEL_ROOT;

  // transformers.js normally locates the ONNX Runtime WASM via `import.meta.url`,
  // which CRA's webpack cannot statically resolve -- it builds, then 404s at
  // runtime. scripts/copy-ort-runtime.js puts the binaries in public/ort/ and
  // this points at them. Also keeps the runtime off a CDN, which matters for an
  // app whose selling point is that the entry stays on the device.
  env.backends.onnx.wasm.wasmPaths = '/ort/';

  const calibrationResponse = await fetch(CALIBRATION_URL);
  if (!calibrationResponse.ok) {
    throw new Error(`No calibration.json at ${CALIBRATION_URL} (run ml/export_onnx.py)`);
  }
  const calibration = await calibrationResponse.json();

  const [tokenizer, model] = await Promise.all([
    AutoTokenizer.from_pretrained(MODEL_ID),
    AutoModelForSequenceClassification.from_pretrained(MODEL_ID, { dtype: 'q8' })
  ]);

  return { tokenizer, model, calibration };
}

function ensureLoaded() {
  if (unavailable) return null;
  if (!loadPromise) {
    loadPromise = withTimeout(load(), LOAD_TIMEOUT_MS, 'Classifier load').catch((error) => {
      // Latch the failure. Retrying a missing bundle on every keystroke would
      // just stack failed 404s.
      console.warn(
        'Local imposter classifier unavailable, deferring to the server:',
        error.message
      );
      unavailable = true;
      loadPromise = null;
      return null;
    });
  }
  return loadPromise;
}

/** Start fetching the model before the user finishes writing. */
export function warmUp() {
  ensureLoaded();
}

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

/**
 * @returns {Promise<null | {
 *   detected: boolean,
 *   confidence: number,
 *   labels: Record<string, number>,
 *   source: string
 * }>}
 */
export async function classifyEntry(text) {
  if (!text || text.trim().length < 20) return null;

  const loaded = await ensureLoaded();
  if (!loaded) return null;

  try {
    const { tokenizer, model, calibration } = loaded;
    const { labels, temperatures, thresholds } = calibration;

    const inputs = await tokenizer(text, { truncation: true, max_length: MAX_LENGTH });
    const output = await withTimeout(model(inputs), INFERENCE_TIMEOUT_MS, 'Classification');
    const logits = output.logits.tolist()[0];

    // Temperature scaling, applied here rather than baked into the graph so the
    // calibration can be refitted without re-exporting the model.
    const probabilities = {};
    let maxProbability = 0;
    let anyAboveThreshold = false;

    labels.forEach((label, index) => {
      const probability = sigmoid(logits[index] / (temperatures[index] || 1));
      probabilities[label] = Number(probability.toFixed(4));

      if (probability > maxProbability) maxProbability = probability;
      if (probability >= (thresholds[index] ?? 0.5)) anyAboveThreshold = true;
    });

    return {
      detected: anyAboveThreshold,
      // Reported confidence is the strongest single pattern, not an average --
      // one clearly-present pattern is a detection, and averaging across five
      // labels would drown it.
      confidence: Number(maxProbability.toFixed(4)),
      labels: probabilities,
      source: 'onnx-local'
    };
  } catch (error) {
    console.warn('Local classification failed:', error.message);
    return null;
  }
}

export function isClassifierAvailable() {
  return !unavailable;
}
