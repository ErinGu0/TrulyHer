// api/_lib/gemini.js
//
// Single place that talks to Gemini's generateContent endpoint. Both the
// generic proxy (api/gemini.js) and the retrieval-augmented analyser
// (api/analyze.js) go through here so the key handling and error shape stay
// identical.

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-preview-09-2025';

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

  const response = await fetch(`${BASE_URL}/${MODEL}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed: ${response.status} ${await response.text()}`);
  }

  const rawText = (await response.json())?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Gemini returned an empty response');

  try {
    return JSON.parse(rawText);
  } catch {
    return rawText;
  }
}
