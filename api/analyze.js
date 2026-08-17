// api/analyze.js
//
// POST /api/analyze
//
// Retrieval-augmented journal analysis. One round trip does the whole thing:
//
//   embed entry -> retrieve semantically similar past entries
//               -> build a grounded prompt
//               -> generate
//               -> reject suggestions that repeat earlier ones (by cosine, not by string)
//               -> persist entry + suggestions with their vectors
//
// Everything happens server-side. The browser never sees the Gemini key or the
// database URL, and it gets back one object it can render directly.

import { isDbConfigured, withUser, toVectorLiteral } from './_lib/db.js';
import { embed, embedBatch, TASK_DOCUMENT, TASK_QUERY } from './_lib/embeddings.js';
import { generate, isAiConfigured } from './_lib/gemini.js';
import { filterNovel } from './_lib/similarity.js';
import {
  retrieveRelatedEntries,
  getRecentRecommendationEmbeddings,
  buildMemoryContext
} from './_lib/memory.js';
import { requireUserId } from './_lib/identity.js';

const DEDUPE_THRESHOLD = Number(process.env.RECOMMENDATION_DEDUPE_THRESHOLD || 0.85);

// Ask for more suggestions than we show. De-duplication removes some, and it is
// better to over-generate once than to leave the user with a single tip.
const RECOMMENDATIONS_REQUESTED = 6;
const RECOMMENDATIONS_RETURNED = 4;

const ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    overall_analysis: {
      type: 'string',
      description: 'A compassionate 2-3 sentence summary in second person, addressing the person directly.'
    },
    continuity_note: {
      type: 'string',
      description: 'One sentence connecting today to a specific retrieved past entry, citing its date. Empty string if no past entry genuinely resembles today.'
    },
    detected_emotions: {
      type: 'array',
      items: { type: 'string' },
      description: '3-8 single-word emotions actually present in the text.'
    },
    imposter_syndrome_detected: {
      type: 'boolean',
      description: 'True if clear signs of imposter syndrome are present.'
    },
    imposter_confidence: {
      type: 'number',
      description: 'Confidence 0.0-1.0. Ignored when a calibrated local classifier supplied a score.'
    },
    urgent_support_needed: {
      type: 'boolean',
      description: 'True only for explicit self-harm mentions or immediate crisis.'
    },
    key_insights: {
      type: 'array',
      items: { type: 'string' },
      description: '3-5 distinct observations in second person.'
    },
    recommendations: {
      type: 'array',
      items: { type: 'string' },
      description: `${RECOMMENDATIONS_REQUESTED} concrete, immediately actionable suggestions in second person, each with a timeframe.`
    }
  },
  required: [
    'overall_analysis',
    'continuity_note',
    'detected_emotions',
    'imposter_syndrome_detected',
    'imposter_confidence',
    'urgent_support_needed',
    'key_insights',
    'recommendations'
  ]
};

function buildSystemPrompt({ moodScore, memoryContext, priorRecommendations, signals }) {
  const sections = [
    `You are a compassionate journal analyst speaking directly to the person who wrote this entry.
Write in second person. Be specific, warm, and concrete. Their current mood score is ${moodScore}/10.`
  ];

  if (memoryContext) {
    sections.push(memoryContext);
  } else {
    sections.push(
      'This person has no comparable past entries yet. Do not invent history or imply you remember them. Set continuity_note to an empty string.'
    );
  }

  if (priorRecommendations.length) {
    sections.push(
      `ADVICE THEY HAVE ALREADY BEEN GIVEN -- do not restate any of these, in any wording:\n${priorRecommendations
        .map((text) => `- ${text}`)
        .join('\n')}`
    );
  }

  if (signals?.labels && Object.keys(signals.labels).length) {
    // The local classifier decides *whether* this is imposter syndrome and how
    // strongly; the model's job is to put it into humane language, not to
    // re-adjudicate the label.
    const detected = Object.entries(signals.labels)
      .filter(([, probability]) => probability >= 0.5)
      .map(([label, probability]) => `${label} (${probability.toFixed(2)})`);

    sections.push(
      `A calibrated on-device classifier scored this entry for imposter-syndrome patterns: ${
        detected.length ? detected.join(', ') : 'no pattern above threshold'
      }. Treat this as the ground truth for which patterns are present, and speak to those specific patterns rather than generic self-doubt.`
    );
  }

  sections.push(
    `Produce exactly ${RECOMMENDATIONS_REQUESTED} recommendations. Each must use a different action verb, a different sentence structure, and address a different area of their life. Include a concrete timeframe (tonight, tomorrow morning, this week).`
  );

  return sections.join('\n\n');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAiConfigured()) {
    return res.status(503).json({ error: 'Gemini API key not configured', unavailable: true });
  }

  const userId = requireUserId(req, res);
  if (!userId) return undefined;

  const { content, moodScore = 5, audioAnalysis = null, signals = null } = req.body || {};
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'content is required' });
  }

  const memoryEnabled = isDbConfigured();

  try {
    let documentEmbedding = null;
    let queryEmbedding = null;
    let relatedEntries = [];
    let priorRecommendations = [];

    if (memoryEnabled) {
      // Gemini distinguishes storage vectors from search vectors. Both are
      // fetched in one batch call rather than two sequential round trips.
      [documentEmbedding, queryEmbedding] = await Promise.all([
        embed(content, TASK_DOCUMENT),
        embed(content, TASK_QUERY)
      ]);

      const retrieved = await withUser(userId, async (client) => ({
        entries: await retrieveRelatedEntries(client, userId, queryEmbedding),
        recommendations: await getRecentRecommendationEmbeddings(client, userId)
      }));

      relatedEntries = retrieved.entries;
      priorRecommendations = retrieved.recommendations;
    }

    const analysis = await generate({
      prompt: `JOURNAL ENTRY TO ANALYZE:\n"${content}"`,
      systemPrompt: buildSystemPrompt({
        moodScore,
        memoryContext: buildMemoryContext(relatedEntries),
        priorRecommendations: priorRecommendations.map((r) => r.text),
        signals
      }),
      responseSchema: ANALYSIS_SCHEMA
    });

    if (typeof analysis !== 'object' || analysis === null) {
      throw new Error('Gemini did not return a structured analysis');
    }

    normalizeAnalysis(analysis);
    applyLocalClassifierSignals(analysis, signals);

    // --- Semantic de-duplication of suggestions -----------------------------
    let rejectedRecommendations = [];
    let recommendationEmbeddings = [];

    if (memoryEnabled && analysis.recommendations.length) {
      recommendationEmbeddings = await embedBatch(analysis.recommendations, TASK_DOCUMENT);

      const { kept, rejected } = filterNovel(
        analysis.recommendations.map((text, index) => ({
          text,
          embedding: recommendationEmbeddings[index]
        })),
        priorRecommendations.map((r) => r.embedding).filter(Boolean),
        DEDUPE_THRESHOLD
      );

      rejectedRecommendations = rejected;
      recommendationEmbeddings = kept.slice(0, RECOMMENDATIONS_RETURNED).map((k) => k.embedding);
      analysis.recommendations = kept.slice(0, RECOMMENDATIONS_RETURNED).map((k) => k.text);
    } else {
      analysis.recommendations = analysis.recommendations.slice(0, RECOMMENDATIONS_RETURNED);
    }

    // --- Persist ------------------------------------------------------------
    let savedEntry = null;
    if (memoryEnabled) {
      savedEntry = await withUser(userId, async (client) => {
        const { rows } = await client.query(
          `INSERT INTO journal_entries
             (user_id, content, mood_score, emotions, ai_insights, critical_alerts,
              imposter_detected, imposter_confidence, imposter_source, imposter_labels,
              audio_analysis, embedding)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::vector)
           RETURNING id, entry_date`,
          [
            userId,
            content.trim(),
            clampMood(moodScore),
            analysis.detected_emotions,
            analysis.overall_analysis,
            criticalAlerts(analysis),
            analysis.imposter_syndrome_detected,
            analysis.imposter_confidence,
            signals?.source || 'gemini',
            JSON.stringify(signals?.labels || {}),
            audioAnalysis ? JSON.stringify(audioAnalysis) : null,
            toVectorLiteral(documentEmbedding)
          ]
        );

        const entry = rows[0];

        for (let i = 0; i < analysis.recommendations.length; i += 1) {
          const vector = recommendationEmbeddings[i];
          await client.query(
            `INSERT INTO recommendations (user_id, entry_id, text, embedding)
             VALUES ($1, $2, $3, $4::vector)`,
            [
              userId,
              entry.id,
              analysis.recommendations[i],
              vector ? toVectorLiteral(vector) : null
            ]
          );
        }

        return entry;
      });
    }

    return res.status(200).json({
      ok: true,
      analysis,
      entry: savedEntry
        ? { id: savedEntry.id, entry_date: savedEntry.entry_date }
        : null,
      memory: {
        enabled: memoryEnabled,
        retrievedCount: relatedEntries.length,
        relatedEntries: relatedEntries.map(({ id, entryDate, similarity, moodScore: mood }) => ({
          id,
          entryDate,
          similarity,
          moodScore: mood
        })),
        // Surfaced so the repetition filter is measurable rather than a claim.
        rejectedRecommendations
      }
    });
  } catch (error) {
    console.error('Analysis failed:', error);
    return res.status(500).json({ error: error.message || 'Analysis failed' });
  }
}

function normalizeAnalysis(analysis) {
  if (!Array.isArray(analysis.detected_emotions)) analysis.detected_emotions = [];
  if (!Array.isArray(analysis.key_insights)) analysis.key_insights = [];
  if (!Array.isArray(analysis.recommendations)) analysis.recommendations = [];
  if (typeof analysis.continuity_note !== 'string') analysis.continuity_note = '';
  if (typeof analysis.imposter_confidence !== 'number') analysis.imposter_confidence = 0;
}

/**
 * When the browser ran the fine-tuned classifier, its calibrated probability
 * replaces the number Gemini guessed. A generative model's self-reported
 * confidence is not calibrated against anything; the local model's is (see
 * ml/calibrate.py).
 */
function applyLocalClassifierSignals(analysis, signals) {
  if (!signals || typeof signals.confidence !== 'number') return;

  analysis.imposter_confidence = signals.confidence;
  analysis.imposter_syndrome_detected = Boolean(signals.detected);
  analysis.imposter_labels = signals.labels || {};
  analysis.imposter_source = signals.source || 'onnx-local';
}

function criticalAlerts(analysis) {
  const alerts = [];
  if (analysis.imposter_syndrome_detected) alerts.push('imposter_syndrome');
  if (analysis.urgent_support_needed) alerts.push('urgent_support');
  return alerts;
}

function clampMood(score) {
  const value = Math.round(Number(score));
  if (Number.isNaN(value)) return 5;
  return Math.min(10, Math.max(1, value));
}
