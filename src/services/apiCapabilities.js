// src/services/apiCapabilities.js
//
// The frontend must never read API keys. It asks the server what is configured
// instead, and the server answers with booleans only (see api/health.js).

const DEFAULT_CAPABILITIES = { ai: false, semanticMemory: false };

let cached = null;
let inFlight = null;

export async function getCapabilities({ refresh = false } = {}) {
  if (!refresh && cached) return cached;
  if (!refresh && inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const response = await fetch('/api/health');
      if (!response.ok) throw new Error(`Health check failed: ${response.status}`);
      const result = await response.json();
      cached = { ...DEFAULT_CAPABILITIES, ...(result.capabilities || {}) };
    } catch (error) {
      // Offline, or running `npm start` without the serverless functions.
      // Degrade to local-only mode rather than breaking the journal.
      console.warn('Capability probe failed, assuming local-only mode:', error.message);
      cached = { ...DEFAULT_CAPABILITIES };
    } finally {
      inFlight = null;
    }
    return cached;
  })();

  return inFlight;
}

export function getCachedCapabilities() {
  return cached || DEFAULT_CAPABILITIES;
}
