// api/_lib/memory.js
//
// Retrieval over the user's own journal history.
//
// Before this existed, every analysis saw exactly one entry, which is why the
// prompt had to contain 50 lines of instructions telling the model not to
// repeat itself -- it had no way to know what it had already said. Retrieval
// replaces those instructions with evidence.

import { toVectorLiteral } from './db.js';

export const DEFAULT_TOP_K = Number(process.env.MEMORY_TOP_K || 5);
export const DEFAULT_MIN_SIMILARITY = Number(process.env.MEMORY_MIN_SIMILARITY || 0.55);

// Number of past suggestions to compare against when rejecting repeats. Beyond
// a few dozen the marginal catch rate is negligible and the payload grows.
const RECOMMENDATION_HISTORY = 40;

/**
 * Approximate-nearest-neighbour search over the user's past entries.
 *
 * `<=>` is pgvector's cosine distance operator; the HNSW index only kicks in
 * when the ORDER BY uses that same operator and the query has a LIMIT.
 */
export async function retrieveRelatedEntries(client, userId, embedding, options = {}) {
  const {
    topK = DEFAULT_TOP_K,
    minSimilarity = DEFAULT_MIN_SIMILARITY,
    excludeId = null
  } = options;

  // Search a wider candidate list than we return. Default ef_search is 40,
  // which under-recalls once a user has a few hundred entries.
  await client.query('SET LOCAL hnsw.ef_search = 64');

  const { rows } = await client.query(
    `SELECT id,
            content,
            mood_score,
            emotions,
            imposter_detected,
            entry_date,
            1 - (embedding <=> $1::vector) AS similarity
       FROM journal_entries
      WHERE user_id = $2
        AND embedding IS NOT NULL
        AND ($3::uuid IS NULL OR id <> $3::uuid)
      ORDER BY embedding <=> $1::vector
      LIMIT $4`,
    [toVectorLiteral(embedding), userId, excludeId, topK]
  );

  // The ANN search always returns *something*; the similarity floor is what
  // stops an unrelated entry from being presented as a meaningful echo.
  return rows
    .filter((row) => Number(row.similarity) >= minSimilarity)
    .map((row) => ({
      id: row.id,
      content: row.content,
      moodScore: row.mood_score,
      emotions: row.emotions || [],
      imposterDetected: row.imposter_detected,
      entryDate: row.entry_date,
      similarity: Number(Number(row.similarity).toFixed(3))
    }));
}

export async function getRecentRecommendationEmbeddings(client, userId, limit = RECOMMENDATION_HISTORY) {
  const { rows } = await client.query(
    `SELECT text, embedding::text AS embedding
       FROM recommendations
      WHERE user_id = $1
        AND embedding IS NOT NULL
      ORDER BY created_at DESC
      LIMIT $2`,
    [userId, limit]
  );

  return rows.map((row) => ({
    text: row.text,
    embedding: parseVectorLiteral(row.embedding)
  }));
}

/**
 * Turn retrieved rows into the grounding block of the prompt.
 *
 * Kept deliberately factual -- dates, mood, and the user's own words. The model
 * draws the connection; we do not pre-chew it, because a wrong pre-chewed
 * pattern ("you always spiral on Mondays") reads as the app misunderstanding
 * someone at their most vulnerable.
 */
export function buildMemoryContext(relatedEntries) {
  if (!relatedEntries || relatedEntries.length === 0) return '';

  const formatted = relatedEntries
    .map((entry, index) => {
      const date = new Date(entry.entryDate).toISOString().slice(0, 10);
      const excerpt = entry.content.length > 400
        ? `${entry.content.slice(0, 400)}...`
        : entry.content;
      const emotions = entry.emotions.length ? ` | felt: ${entry.emotions.join(', ')}` : '';
      return `[${index + 1}] ${date} (mood ${entry.moodScore ?? 'n/a'}/10, similarity ${entry.similarity}${emotions})\n"${excerpt}"`;
    })
    .join('\n\n');

  return `
THE PERSON'S OWN PAST ENTRIES, retrieved because they are semantically closest to today's:

${formatted}

How to use this history:
- If today genuinely echoes one of these, name it concretely and cite the date. "You wrote something close to this on ${firstDate(relatedEntries)}" is worth more than any generic observation.
- If mood improved or worsened between then and now, say which way and by how much.
- Do NOT repeat advice these entries already received; you will be given that list separately.
- If nothing above actually resembles today's entry, ignore it entirely. A forced connection is worse than none.
`.trim();
}

function firstDate(entries) {
  return new Date(entries[0].entryDate).toISOString().slice(0, 10);
}

function parseVectorLiteral(literal) {
  if (!literal) return null;
  // pgvector renders as '[0.1,0.2,...]'
  return literal.slice(1, -1).split(',').map(Number);
}
