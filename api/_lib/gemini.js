// api/_lib/gemini.js
//
// Single place that talks to Gemini's generateContent endpoint. Both the
// generic proxy (api/gemini.js) and the retrieval-augmented analyser
// (api/analyze.js) go through here so the key handling and error shape stay
// identical.

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// Free-tier quotas are PER MODEL and small -- gemini-3.7-flash allows 20
// generate_content requests per day. A single pinned model therefore means the
// entire app returns 429 for the rest of the day once that runs out, which is
// how this was found: the journal page died after an unrelated batch job.
//
// Falling through a chain keeps the app alive on a free key. Later models are
// older or lighter, so answers degrade gracefully rather than vanishing.
// GEMINI_MODEL still overrides, and pins to a single model when set.
const MODEL_CHAIN = process.env.GEMINI_MODEL
  ? [process.env.GEMINI_MODEL]
  : [
      'gemini-3.7-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite'
    ];

// Remembered per warm lambda instance so we stop re-paying the latency of a
// model we already know is exhausted. Cleared when the instance recycles, which
// is roughly the granularity we want -- quotas reset daily, instances do not
// live that long.
const exhausted = new Set();

export function isAiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * @returns {Promise<any>} parsed JSON when the model returns JSON, raw text otherwise
 */
export async function generate({ prompt, systemPrompt = '', responseSchema = null }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  const body = {
    contents: [
      { parts: [{ text: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt }] }
    ]
  };

  if (responseSchema) {
    body.generationConfig = {
      responseMimeType: 'application/json',
      responseSchema
    };
  }

  const candidates = MODEL_CHAIN.filter((model) => !exhausted.has(model));
  // Every model looked exhausted; try the whole chain again rather than failing
  // outright, since the set may be stale.
  const attempts = candidates.length ? candidates : MODEL_CHAIN;

  let lastError = null;

  for (const model of attempts) {
    let response;
    try {
      response = await fetch(`${BASE_URL}/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (error) {
      lastError = error;
      continue;
    }

    if (response.status === 429) {
      exhausted.add(model);
      lastError = new Error(`${model}: daily quota exhausted`);
      continue;
    }

    // 503 "high demand" is transient but can persist for hours; treat it the
    // same as exhaustion for routing purposes and move on.
    if (response.status >= 500) {
      lastError = new Error(`${model}: ${response.status}`);
      continue;
    }

    if (!response.ok) {
      throw new Error(`Gemini request failed: ${response.status} ${await response.text()}`);
    }

    const rawText = (await response.json())?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      lastError = new Error(`${model}: empty response`);
      continue;
    }

    try {
      return JSON.parse(rawText);
    } catch {
      return rawText;
    }
  }

  throw new Error(
    `All Gemini models unavailable (${attempts.length} tried). Last: ${lastError?.message}`
  );
}
