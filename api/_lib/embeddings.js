// api/_lib/embeddings.js
//
// Wrapper around Gemini's embedding endpoint. Runs server-side only so the API
// key never reaches the browser.

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const EMBEDDING_MODEL = 'text-embedding-004';

// Must match the vector(768) column in db/migrations/001_semantic_memory.sql.
// Changing the model means a new migration and a re-embed of existing rows.
export const EMBEDDING_DIMS = 768;

// Gemini distinguishes the vector you store from the vector you search with.
// Using the wrong task type measurably degrades recall.
export const TASK_DOCUMENT = 'RETRIEVAL_DOCUMENT';
export const TASK_QUERY = 'RETRIEVAL_QUERY';

// Roughly the model's input ceiling; journal entries are far shorter, but a
// pasted wall of text should be truncated rather than rejected.
const MAX_CHARS = 8000;

function requireKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
  return apiKey;
}

/**
 * Embed a single string. Returns a 768-element array of floats.
 */
export async function embed(text, taskType = TASK_DOCUMENT) {
  const trimmed = (text || '').trim();
  if (!trimmed) throw new Error('Cannot embed empty text');

  const response = await fetch(
    `${BASE_URL}/${EMBEDDING_MODEL}:embedContent?key=${requireKey()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text: trimmed.slice(0, MAX_CHARS) }] },
        taskType
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Embedding request failed: ${response.status} ${await response.text()}`);
  }

  const values = (await response.json())?.embedding?.values;
  if (!Array.isArray(values) || values.length !== EMBEDDING_DIMS) {
    throw new Error(`Expected a ${EMBEDDING_DIMS}-dim embedding, got ${values?.length}`);
  }
  return values;
}

/**
 * Embed many strings in one round trip. Used for recommendation de-duplication,
 * where we need 3-4 vectors at once and would otherwise pay 4x the latency.
 */
export async function embedBatch(texts, taskType = TASK_DOCUMENT) {
  const cleaned = (texts || []).map((t) => (t || '').trim()).filter(Boolean);
  if (cleaned.length === 0) return [];

  const response = await fetch(
    `${BASE_URL}/${EMBEDDING_MODEL}:batchEmbedContents?key=${requireKey()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: cleaned.map((text) => ({
          model: `models/${EMBEDDING_MODEL}`,
          content: { parts: [{ text: text.slice(0, MAX_CHARS) }] },
          taskType
        }))
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Batch embedding failed: ${response.status} ${await response.text()}`);
  }

  const embeddings = (await response.json())?.embeddings || [];
  return embeddings.map((e) => e.values);
}
