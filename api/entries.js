// api/entries.js
//
// GET /api/entries              -> most recent entries
// GET /api/entries?days=7       -> entries from the last N days
// GET /api/entries?q=<text>     -> semantic search over the user's own journal
//
// The `q` form is the reason the embeddings are worth storing beyond analysis:
// searching "times I felt like a fraud in code review" finds the entry that
// says "everyone on the PR clearly knows more than me", which no keyword search
// would ever return.

import { isDbConfigured, withUser } from './_lib/db.js';
import { embed, TASK_QUERY } from './_lib/embeddings.js';
import { retrieveRelatedEntries } from './_lib/memory.js';
import { requireUserId } from './_lib/identity.js';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isDbConfigured()) {
    // Not an error: the client falls back to its localStorage mirror.
    return res.status(200).json({ ok: true, entries: [], remote: false });
  }

  const userId = requireUserId(req, res);
  if (!userId) return undefined;

  const { q, days, limit } = req.query || {};
  const rowLimit = Math.min(MAX_LIMIT, Number(limit) || DEFAULT_LIMIT);

  try {
    if (q && q.trim()) {
      const queryEmbedding = await embed(q, TASK_QUERY);
      const results = await withUser(userId, (client) =>
        retrieveRelatedEntries(client, userId, queryEmbedding, {
          topK: Math.min(rowLimit, 25),
          // Search is user-initiated, so a lower floor is right: returning a
          // loose match beats returning nothing for a deliberate query.
          minSimilarity: 0.3
        })
      );

      return res.status(200).json({
        ok: true,
        remote: true,
        mode: 'semantic',
        entries: results.map(toClientEntry)
      });
    }

    const rows = await withUser(userId, async (client) => {
      const cutoffDays = Number(days);
      const useCutoff = Number.isFinite(cutoffDays) && cutoffDays > 0;

      const { rows: found } = await client.query(
        `SELECT id, content, mood_score, emotions, ai_insights, critical_alerts,
                imposter_detected, imposter_confidence, imposter_source,
                imposter_labels, audio_analysis, entry_date
           FROM journal_entries
          WHERE user_id = $1
            AND ($2::boolean IS FALSE OR entry_date >= now() - ($3 || ' days')::interval)
          ORDER BY entry_date DESC
          LIMIT $4`,
        [userId, useCutoff, useCutoff ? String(cutoffDays) : '0', rowLimit]
      );
      return found;
    });

    return res.status(200).json({
      ok: true,
      remote: true,
      mode: 'recent',
      entries: rows.map(toClientEntry)
    });
  } catch (error) {
    console.error('Failed to load entries:', error);
    return res.status(500).json({ error: error.message || 'Failed to load entries' });
  }
}

// Keep the wire format identical to what the localStorage version produced, so
// every existing page renders remote and local entries the same way.
function toClientEntry(row) {
  return {
    id: row.id,
    content: row.content,
    mood_score: row.moodScore ?? row.mood_score,
    emotions: row.emotions || [],
    ai_insights: row.ai_insights ?? null,
    critical_alerts: row.critical_alerts || [],
    imposter_syndrome_detected: row.imposter_detected ?? row.imposterDetected ?? false,
    imposter_confidence: row.imposter_confidence ?? null,
    imposter_source: row.imposter_source ?? null,
    imposter_labels: row.imposter_labels ?? {},
    audio_analysis: row.audio_analysis ?? null,
    entry_date: row.entry_date ?? row.entryDate,
    // Only present on semantic search results.
    ...(row.similarity !== undefined ? { similarity: row.similarity } : {})
  };
}
