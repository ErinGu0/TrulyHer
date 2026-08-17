// api/_lib/db.js
//
// Postgres access for the serverless functions. Files prefixed with `_` are
// not routed as endpoints by Vercel, so this stays a private module.

import pg from 'pg';

const { Pool } = pg;

let pool = null;

export function isDbConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

function getPool() {
  if (!isDbConfigured()) return null;
  if (pool) return pool;

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Each warm lambda keeps at most one socket. Horizontal scaling is handled
    // by the *server-side* pooler (Neon -pooler host / Supabase port 6543), not
    // by a big pool in a process that may be frozen at any moment.
    max: 1,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    ssl: process.env.PGSSL_DISABLE === 'true' ? false : { rejectUnauthorized: false }
  });

  pool.on('error', (error) => {
    console.error('Unexpected Postgres pool error:', error);
  });

  return pool;
}

/**
 * Run `fn` inside a transaction scoped to one user.
 *
 * Sets `app.user_id` so the row level security policies in
 * db/migrations/001_semantic_memory.sql apply. If the connection role owns the
 * tables Postgres bypasses RLS entirely -- create a separate app role for
 * production (see db/README.md).
 */
export async function withUser(userId, fn) {
  const activePool = getPool();
  if (!activePool) throw new Error('DATABASE_URL is not configured');

  const client = await activePool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.user_id', userId]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/**
 * pgvector accepts vectors as a bracketed literal: '[0.1,0.2,...]'.
 * Cast with ::vector at the call site.
 */
export function toVectorLiteral(embedding) {
  if (!Array.isArray(embedding)) throw new TypeError('embedding must be an array');
  return `[${embedding.map((n) => Number(n)).join(',')}]`;
}
