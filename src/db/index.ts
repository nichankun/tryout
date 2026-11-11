import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@/db/database/schema';

const globalForPostgres = globalThis as typeof globalThis & {
  postgresPool?: Pool;
};

function createPostgresPool() {
  const databaseSslSetting = process.env.DATABASE_SSL?.trim().toLowerCase();
  if (databaseSslSetting && databaseSslSetting !== 'true' && databaseSslSetting !== 'false') {
    throw new Error('DATABASE_SSL must be set to true or false.');
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    // Dokploy's internal PostgreSQL endpoint is private and commonly has TLS disabled.
    // Enable TLS explicitly for database endpoints that support it.
    ssl: databaseSslSetting === 'true',
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
