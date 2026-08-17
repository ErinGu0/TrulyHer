# Semantic memory layer

Postgres + [pgvector](https://github.com/pgvector/pgvector) backing the journal.
Replaces the localStorage-only store and gives the analysis endpoint retrieval
over the user's own history.

## Why a vector index at all

The product promise is "notice patterns over time", but every analysis call used
to see exactly one entry. The model had no way to know what it had already said,
which is why the prompt had grown a 50-line section forbidding it from repeating
itself. Retrieval replaces those instructions with evidence:

| Before | After |
| --- | --- |
| 1 entry per prompt | 1 entry + top-k semantically nearest past entries |
| "don't repeat yourself" in the prompt | prior suggestions retrieved and shown to the model |
| duplicate detection by first-10-words string match | cosine distance, catches paraphrases |
| keyword search on the history page | ANN search over embeddings |

## Setup

1. **Provision Postgres with pgvector.** Neon and Supabase both ship the
   extension on their free tiers.

2. **Use the pooled connection string.** Serverless functions open many
   short-lived connections; a direct connection string will exhaust
   `max_connections` under any real traffic.
   - Neon: the host containing `-pooler`
   - Supabase: port `6543`, not `5432`

3. **Apply the migration:**

   ```bash
   psql "$DATABASE_URL" -f db/migrations/001_semantic_memory.sql
   ```

4. **Set `DATABASE_URL`** in `.env` locally and in the Vercel project settings.
   With it unset, every endpoint degrades to the localStorage path rather than
   erroring — the app still works, just without memory.

## Schema notes

**`vector(768)`** matches Gemini `text-embedding-004`. Swapping the embedding
model means a new migration *and* re-embedding every existing row; the numbers
from two different models are not comparable.

**HNSW over IVFFlat.** IVFFlat needs to be trained on a representative sample of
the data to build its cluster lists, and the table grows one row at a time — there
is no good moment to build it. HNSW is incrementally maintained and needs no
training step. `m=16, ef_construction=64` are pgvector's defaults, and
`hnsw.ef_search` is raised to 64 at query time (from a default of 40), which
trades a little latency for recall once a user passes a few hundred entries.

**Task types matter.** `text-embedding-004` produces different vectors for
`RETRIEVAL_DOCUMENT` and `RETRIEVAL_QUERY`. Entries are stored with the former
and searched with the latter; using one for both measurably hurts recall.

**Row level security.** Policies key off `current_setting('app.user_id')`, which
`withUser()` sets per transaction. Note that **Postgres skips RLS for the table
owner** — for this to be a real boundary in production, create a separate app
role:

```sql
CREATE ROLE trulyher_app LOGIN PASSWORD '...';
GRANT SELECT, INSERT, UPDATE, DELETE ON journal_entries, recommendations TO trulyher_app;
```

and point `DATABASE_URL` at that role. Today's `x-user-id` header is a partition
key, not authentication — anyone can send any id. The Cognito JWT verification
sketched in `lambda-function-complete.js` is the intended replacement, and
because every query already routes through `withUser()`, swapping it in touches
one function.

## Cost

One entry costs 2 embedding calls (document + query vectors) plus 1 batch call
for the generated suggestions. `text-embedding-004` is free within Gemini's
rate limits, so in practice the memory layer adds latency, not spend.
