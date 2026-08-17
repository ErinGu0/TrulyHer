#!/usr/bin/env node
/**
 * Apply db/migrations/*.sql in filename order.
 *
 * Exists because psql is not installed on every machine that needs to set this
 * up, and `pg` already ships with the app. Each file runs inside a transaction,
 * so a syntax error halfway through leaves the database untouched rather than
 * half-migrated.
 *
 * Usage:
 *   npm run db:migrate
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'db', 'migrations');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error(
      'DATABASE_URL is not set.\n\n' +
        'Add it to .env, then run: npm run db:migrate\n' +
        'See db/README.md for how to get one (use the POOLED connection string).'
    );
    process.exit(1);
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migrations found.');
    return;
  }

  const client = new Client({
    connectionString,
    ssl: process.env.PGSSL_DISABLE === 'true' ? false : { rejectUnauthorized: false }
  });

  await client.connect();
  console.log(`Connected. Applying ${files.length} migration(s):\n`);

  try {
    for (const name of files) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8');
      process.stdout.write(`  ${name} … `);

      // The migrations are written to be idempotent (CREATE ... IF NOT EXISTS,
      // DROP POLICY IF EXISTS), so re-running is safe and there is no version
      // table to keep in sync.
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('COMMIT');
        console.log('ok');
      } catch (error) {
        await client.query('ROLLBACK');
        console.log('FAILED');
        throw error;
      }
    }

    console.log('\nAll migrations applied. Verify with: npm run db:check');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`\n${error.message}`);

  if (/permission denied to create extension|must be (owner|superuser)/i.test(error.message)) {
    console.error(
      '\nYour database role cannot create the pgvector extension.\n' +
        'On Neon and Supabase this normally works; on a self-hosted instance ask\n' +
        'an admin to run:  CREATE EXTENSION vector;  then re-run this.'
    );
  }
  if (/type "vector" does not exist/i.test(error.message)) {
    console.error(
      '\npgvector is not available on this server. Neon and Supabase both ship it;\n' +
        'a plain Postgres install needs it compiled in.'
    );
  }

  process.exit(1);
});
