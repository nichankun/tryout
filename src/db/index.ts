import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@/db/database/schema';

const globalForPostgres = globalThis as typeof globalThis & {
  postgresPool?: Pool;
};

function createPostgresPool() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    ssl: true,
    connectionTimeoutMillis: 10_000,
  });

  pool.on('error', (error) => {
    console.error('[database] Idle PostgreSQL client error:', error);
  });

  return pool;
}

const pool = globalForPostgres.postgresPool ?? createPostgresPool();
globalForPostgres.postgresPool = pool;

export const db = drizzle({ client: pool, schema });
