#!/usr/bin/env node
/**
 * Verify the semantic memory layer is actually working end to end.
 *
 * Checks structure (extension, tables, HNSW indexes, RLS), then does a real
 * round trip: writes two throwaway rows with hand-built vectors, confirms that
 * nearest-neighbour search ranks the closer one first, and deletes them. A
 * migration that "ran successfully" but returns results in the wrong order is
 * the failure worth catching, and only a round trip catches it.
 *
 * Usage:
 *   npm run db:check
 */

const { Client } = require('pg');

const TEST_USER = '00000000-0000-4000-8000-00000000dead';
const DIMS = 768;

let failures = 0;

function report(ok, label, detail = '') {
  console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
}

/** Unit vector pointing mostly along axis `axis`, with a little spread. */
function vector(axis, tilt = 0) {
  const values = new Array(DIMS).fill(0);
  values[axis] = 1;
  if (tilt) values[(axis + 1) % DIMS] = tilt;
  const norm = Math.hypot(...values.filter(Boolean));
  return `[${values.map((v) => v / norm).join(',')}]`;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set. Add it to .env first.');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: process.env.PGSSL_DISABLE === 'true' ? false : { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Structure:');

  const { rows: ext } = await client.query(
    `SELECT extversion FROM pg_extension WHERE extname = 'vector'`
  );
  report(ext.length > 0, 'pgvector installed', ext[0]?.extversion);

  for (const table of ['journal_entries', 'recommendations']) {
    const { rows } = await client.query(`SELECT to_regclass($1) AS t`, [table]);
    report(Boolean(rows[0].t), `table ${table}`);
  }

  const { rows: indexes } = await client.query(
    `SELECT indexname FROM pg_indexes
      WHERE tablename IN ('journal_entries','recommendations')
        AND indexdef ILIKE '%hnsw%'`
  );
  report(indexes.length >= 2, 'HNSW vector indexes', `${indexes.length} found`);

  const { rows: rls } = await client.query(
    `SELECT relname, relrowsecurity FROM pg_class
      WHERE relname IN ('journal_entries','recommendations')`
  );
  report(rls.every((r) => r.relrowsecurity), 'row level security enabled');

  const { rows: owner } = await client.query(
    `SELECT current_user = tableowner AS is_owner
       FROM pg_tables WHERE tablename = 'journal_entries'`
  );
  if (owner[0]?.is_owner) {
    console.log(
      '  ! connected as the table owner, so Postgres BYPASSES row level security.\n' +
        '    Fine for development. See db/README.md before relying on it in production.'
    );
  }

  console.log('\nRound trip:');
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1,$2,true)', ['app.user_id', TEST_USER]);

    await client.query(
      `INSERT INTO journal_entries (user_id, content, mood_score, embedding)
       VALUES ($1,$2,$3,$4::vector), ($1,$5,$6,$7::vector)`,
      [TEST_USER, 'db-check near', 5, vector(0, 0.1), 'db-check far', 5, vector(500)]
    );
    report(true, 'insert with 768-dim vectors');

    const { rows: found } = await client.query(
      `SELECT content, 1 - (embedding <=> $1::vector) AS similarity
         FROM journal_entries
        WHERE user_id = $2
        ORDER BY embedding <=> $1::vector
        LIMIT 2`,
      [vector(0), TEST_USER]
    );

    report(found.length === 2, 'nearest-neighbour query returns rows');
    report(
      found[0]?.content === 'db-check near',
      'ranks the semantically closer row first',
      found.map((r) => `${r.content}=${Number(r.similarity).toFixed(3)}`).join(', ')
    );

    await client.query('ROLLBACK');
    report(true, 'test rows rolled back (nothing left behind)');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    report(false, 'round trip', error.message);
  }

  await client.end();

  console.log(
    failures === 0
      ? '\nSemantic memory is ready. Set DATABASE_URL in Vercel too, then write a few entries.'
      : `\n${failures} check(s) failed. Run: npm run db:migrate`
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  process.exit(1);
});
