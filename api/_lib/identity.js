// api/_lib/identity.js
//
// Minimal identity for the memory layer.
//
// The app has no login yet, so the client generates a UUID on first run and
// sends it as `x-user-id` (see src/services/deviceIdentity.js). That is enough
// to partition one person's journal from another's in the database, and it is
// deliberately NOT a security boundary: anyone can send any id.
//
// The Cognito JWT path in lambda-function-complete.js is the intended
// replacement. When it lands, swap resolveUserId for a verified `sub` claim --
// every query already goes through it, so nothing else has to change.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function resolveUserId(req) {
  const header = req.headers['x-user-id'];
  const candidate = Array.isArray(header) ? header[0] : header;

  if (!candidate || !UUID_PATTERN.test(candidate)) {
    return null;
  }
  return candidate.toLowerCase();
}

export function requireUserId(req, res) {
  const userId = resolveUserId(req);
  if (!userId) {
    res.status(400).json({
      error: 'Missing or malformed x-user-id header (expected a UUID)'
    });
    return null;
  }
  return userId;
}
