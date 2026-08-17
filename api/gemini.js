import { generate, isAiConfigured } from './_lib/gemini.js';

/**
 * POST /api/gemini
 *
 * Generic pass-through used by the mood indicator and the personalization
 * service. Structured journal analysis goes to /api/analyze instead, which adds
 * retrieval over the user's history.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAiConfigured()) {
    return res.status(503).json({
      error: 'Gemini API key not configured',
      unavailable: true
    });
  }

  const { type, payload = {} } = req.body || {};

  try {
    const data = await generate({
      prompt: payload.prompt || payload.text || '',
      systemPrompt: payload.systemPrompt || '',
      responseSchema: payload.responseSchema || null
    });

    return res.status(200).json({ ok: true, data, type });
  } catch (error) {
    console.error('Gemini proxy error:', error);
    return res.status(500).json({
      error: error.message || 'Unable to reach Gemini',
      unavailable: true
    });
  }
}
