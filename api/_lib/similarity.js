// api/_lib/similarity.js

/**
 * Cosine similarity in [-1, 1]. text-embedding-004 returns unit vectors, so in
 * practice this is a dot product, but normalising keeps it correct if the
 * embedding model is ever swapped for one that does not normalise.
 */
export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dot / denominator;
}

/**
 * Drop candidates that restate something the user has already been told, and
 * candidates that restate each other within the same batch.
 *
 * This is the real fix for the repetition problem. The previous approach --
 * fingerprinting the first ten words -- only caught byte-identical openings, so
 * "Text a friend one win from today" and "Message someone a single success from
 * your day" both survived.
 *
 * @param {{text: string, embedding: number[]}[]} candidates
 * @param {number[][]} priorEmbeddings  vectors of suggestions already given
 * @param {number} threshold            cosine above which two texts are "the same"
 */
export function filterNovel(candidates, priorEmbeddings = [], threshold = 0.85) {
  const kept = [];
  const keptEmbeddings = [];
  const rejected = [];

  for (const candidate of candidates) {
    if (!candidate.embedding) {
      // Embedding failed for this one; keep it rather than silently dropping
      // a suggestion the user might need.
      kept.push(candidate);
      continue;
    }

    const maxPrior = maxSimilarity(candidate.embedding, priorEmbeddings);
    const maxWithinBatch = maxSimilarity(candidate.embedding, keptEmbeddings);
    const score = Math.max(maxPrior, maxWithinBatch);

    if (score >= threshold) {
      rejected.push({ text: candidate.text, similarity: Number(score.toFixed(3)) });
      continue;
    }

    kept.push(candidate);
    keptEmbeddings.push(candidate.embedding);
  }

  return { kept, rejected };
}

function maxSimilarity(vector, others) {
  let best = 0;
  for (const other of others) {
    const score = cosineSimilarity(vector, other);
    if (score > best) best = score;
  }
  return best;
}
