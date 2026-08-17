-- 001_semantic_memory.sql
--
-- Replaces the localStorage-only journal with durable storage plus a vector
-- index, so every analysis can be grounded in the entries the user actually
-- wrote before instead of a stateless prompt.
--
-- Apply with:  psql "$DATABASE_URL" -f db/migrations/001_semantic_memory.sql

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Journal entries
--
-- embedding is text-embedding-004 output (768 dimensions, L2-normalised by the
-- API, so cosine distance and inner product agree).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS journal_entries (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             TEXT        NOT NULL,
    content             TEXT        NOT NULL,
    mood_score          SMALLINT    CHECK (mood_score BETWEEN 1 AND 10),
    emotions            TEXT[]      NOT NULL DEFAULT '{}',
    ai_insights         TEXT,
    critical_alerts     TEXT[]      NOT NULL DEFAULT '{}',
    imposter_detected   BOOLEAN     NOT NULL DEFAULT FALSE,
    imposter_confidence REAL,
    -- Which component produced imposter_confidence: 'onnx-local' once the
    -- fine-tuned classifier is deployed, 'gemini' for the legacy path.
    imposter_source     TEXT        NOT NULL DEFAULT 'gemini',
    imposter_labels     JSONB       NOT NULL DEFAULT '{}'::jsonb,
    audio_analysis      JSONB,
    embedding           vector(768),
    entry_date          TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS journal_entries_user_date_idx
    ON journal_entries (user_id, entry_date DESC);

-- HNSW beats IVFFlat here: the table is small and grows one row at a time, so
-- there is never a good moment to train IVFFlat's cluster lists. m=16 /
-- ef_construction=64 are pgvector's defaults and are well past sufficient for
-- per-user corpora in the thousands.
CREATE INDEX IF NOT EXISTS journal_entries_embedding_idx
    ON journal_entries USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- ---------------------------------------------------------------------------
-- Recommendations
--
-- Stored separately and embedded so we can reject a new suggestion that is
-- semantically identical to one already given. This is what replaces the
-- "ANTI-REPETITION RULES" block that used to be shouted at the model in the
-- prompt: string fingerprints only catch verbatim repeats, cosine distance
-- catches paraphrases.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recommendations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     TEXT        NOT NULL,
    entry_id    UUID        REFERENCES journal_entries(id) ON DELETE CASCADE,
    text        TEXT        NOT NULL,
    embedding   vector(768),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recommendations_user_created_idx
    ON recommendations (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS recommendations_embedding_idx
    ON recommendations USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- ---------------------------------------------------------------------------
-- Row level security
--
-- Defence in depth. The API already filters by user_id on every query; this
-- makes a missing WHERE clause fail closed instead of leaking another user's
-- journal. The app connects as a role that is NOT the table owner and sets
-- `SET LOCAL app.user_id = '<id>'` per transaction.
-- ---------------------------------------------------------------------------
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS journal_entries_owner ON journal_entries;
CREATE POLICY journal_entries_owner ON journal_entries
    USING (user_id = current_setting('app.user_id', true))
    WITH CHECK (user_id = current_setting('app.user_id', true));

DROP POLICY IF EXISTS recommendations_owner ON recommendations;
CREATE POLICY recommendations_owner ON recommendations
    USING (user_id = current_setting('app.user_id', true))
    WITH CHECK (user_id = current_setting('app.user_id', true));
