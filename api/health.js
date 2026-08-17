/**
 * GET /api/health
 *
 * Lets the frontend discover which server-side capabilities are configured
 * WITHOUT ever shipping a credential to the browser. The client used to check
 * `process.env.REACT_APP_GEMINI_API_KEY`, which Create React App inlines into
 * the public bundle -- that leaked the key to anyone who opened devtools.
 */
export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Booleans only. Never echo the values themselves.
  return res.status(200).json({
    ok: true,
    capabilities: {
      ai: Boolean(process.env.GEMINI_API_KEY),
      semanticMemory: Boolean(process.env.GEMINI_API_KEY && process.env.DATABASE_URL)
    }
  });
}
