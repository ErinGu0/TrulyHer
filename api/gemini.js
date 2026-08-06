export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'Gemini API key not configured',
      unavailable: true
    });
  }

  const { type, payload = {} } = req.body || {};
  const prompt = payload.prompt || payload.text || '';
  const systemPrompt = payload.systemPrompt || '';
  const responseSchema = payload.responseSchema || null;

  const finalPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

  const requestBody = {
    contents: [
      {
        parts: [{ text: finalPrompt }]
      }
    ]
  };

  if (responseSchema) {
    requestBody.generationConfig = {
      responseMimeType: 'application/json',
      responseSchema
    };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Gemini request failed: ${response.status} ${errorData}`);
    }

    const result = await response.json();
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error('Gemini returned an empty response');
    }

    let parsedData;
    try {
      parsedData = JSON.parse(rawText);
    } catch {
      parsedData = rawText;
    }

    return res.status(200).json({
      ok: true,
      data: parsedData,
      type
    });
  } catch (error) {
    console.error('Gemini proxy error:', error);
    return res.status(500).json({
      error: error.message || 'Unable to reach Gemini',
      unavailable: true
    });
  }
}
