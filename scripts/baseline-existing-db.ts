import "dotenv/config";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import initialSnapshot from "../drizzle/meta/0000_snapshot.json";

interface ColumnRow {
  table_name: string;
  column_name: string;
  udt_name: string;
  is_nullable: "YES" | "NO";
  column_default: string | null;
}

interface MigrationEntry {
  idx: number;
  tag: string;
  when: number;
}

interface MigrationJournal {
  entries: MigrationEntry[];
}

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL belum diatur.");
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: true,
  connectionTimeoutMillis: 10_000,
});

async function baselineExistingDatabase() {
  const migrationSql = await readFile("drizzle/0000_create_initial_schema.sql", "utf8");
  const journal = JSON.parse(await readFile("drizzle/meta/_journal.json", "utf8")) as MigrationJournal;
  const initialEntry = journal.entries.find((entry) => entry.idx === 0 && entry.tag === "0000_create_initial_schema");

  if (!initialEntry) {
    throw new Error("Entri migration awal tidak ditemukan; baseline dibatalkan.");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["asnpedia-initial-schema-baseline"]);

    const existingMigrationTable = await client.query(
      "SELECT table_schema FROM information_schema.tables WHERE table_name = $1",
      ["__drizzle_migrations"],
    );
    if (existingMigrationTable.rowCount) {
      throw new Error("Riwayat migration sudah ada; baseline awal ditolak agar tidak menimpa status migration.");
    }

    const actualTablesResult = await client.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = $2 ORDER BY table_name",
      ["public", "BASE TABLE"],
    );
    const expectedTables = Object.values(initialSnapshot.tables).map((table) => table.name).sort();
    const actualTables = actualTablesResult.rows.map((row) => row.table_name).sort();
    if (JSON.stringify(expectedTables) !== JSON.stringify(actualTables)) {
      throw new Error(
        `Baseline dibatalkan: tabel public berbeda. Diharapkan [${expectedTables.join(", ")}], ditemukan [${actualTables.join(", ")}].`,
      );
    }

    const columnsResult = await client.query<ColumnRow>(
      "SELECT table_name, column_name, udt_name, is_nullable, column_default FROM information_schema.columns WHERE table_schema = $1 ORDER BY table_name, ordinal_position",
      ["public"],
    );
    const actualColumns = new Map<string, Map<string, ColumnRow>>();
    for (const column of columnsResult.rows) {
      const tableColumns = actualColumns.get(column.table_name) ?? new Map<string, ColumnRow>();
      tableColumns.set(column.column_name, column);
      actualColumns.set(column.table_name, tableColumns);
    }

    const postgresTypes: Record<string, string> = {
      serial: "int4",
      integer: "int4",
      boolean: "bool",
      timestamp: "timestamp",
    };
    const columnDifferences: string[] = [];

    for (const table of Object.values(initialSnapshot.tables)) {
      const foundColumns = actualColumns.get(table.name) ?? new Map<string, ColumnRow>();
      const expectedNames = new Set(Object.keys(table.columns));
      const extraNames = [...foundColumns.keys()].filter((name) => !expectedNames.has(name));

      for (const [name, expected] of Object.entries(table.columns)) {
        const actual = foundColumns.get(name);
        if (!actual) {
          columnDifferences.push(`${table.name}.${name}: kolom tidak ditemukan`);
          continue;
        }

        const expectedType = postgresTypes[expected.type] ?? expected.type;
        const expectedNullable = expected.notNull ? "NO" : "YES";
        if (actual.udt_name !== expectedType || actual.is_nullable !== expectedNullable) {
          columnDifferences.push(
            `${table.name}.${name}: diharapkan ${expectedType}/${expectedNullable}, ditemukan ${actual.udt_name}/${actual.is_nullable}`,
          );
        }

        if ("default" in expected && expected.default !== undefined && actual.column_default !== null) {
          const expectedDefault = String(expected.default).toLowerCase().replace(/\s+/g, "");
          const actualDefault = actual.column_default
            .toLowerCase()
            .replace(/\s+/g, "")
            .replace(/::(?:text|boolean|integer|int4|regclass)$/g, "")
            .replace("current_timestamp", "now()");
          if (actualDefault !== expectedDefault) {
            columnDifferences.push(
              `${table.name}.${name}: default diharapkan ${expectedDefault}, ditemukan ${actualDefault}`,
            );
          }
        }
      }

      columnDifferences.push(...extraNames.map((name) => `${table.name}.${name}: kolom tambahan`));
    }

    const foreignKeysResult = await client.query<{ conname: string }>(
      "SELECT c.conname FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid JOIN pg_namespace n ON n.oid = t.relnamespace WHERE n.nspname = $1 AND c.contype = $2",
      ["public", "f"],
    );
    const actualForeignKeys = new Set(foreignKeysResult.rows.map((row) => row.conname));
    const expectedForeignKeys = Object.values(initialSnapshot.tables).flatMap((table) => Object.keys(table.foreignKeys));
    const missingForeignKeys = expectedForeignKeys.filter((name) => !actualForeignKeys.has(name));

    const keyConstraintsResult = await client.query<{ conname: string }>(
      "SELECT c.conname FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid JOIN pg_namespace n ON n.oid = t.relnamespace WHERE n.nspname = $1 AND c.contype IN ($2, $3)",
      ["public", "p", "u"],
    );
    const actualKeyConstraints = new Set(keyConstraintsResult.rows.map((row) => row.conname));
    const expectedKeyConstraints = Object.values(initialSnapshot.tables).flatMap((table) => {
      const singleColumnPrimaryKey = Object.values(table.columns).filter((column) => column.primaryKey).length === 1
        ? [`${table.name}_pkey`]
        : [];
      return [
        ...singleColumnPrimaryKey,
        ...Object.keys(table.compositePrimaryKeys),
        ...Object.keys(table.uniqueConstraints),
      ];
    });
    const missingKeyConstraints = expectedKeyConstraints.filter((name) => !actualKeyConstraints.has(name));

    const indexesResult = await client.query<{ indexname: string }>(
      "SELECT indexname FROM pg_indexes WHERE schemaname = $1",
      ["public"],
    );
    const actualIndexes = new Set(indexesResult.rows.map((row) => row.indexname));
    const expectedIndexes = Object.values(initialSnapshot.tables).flatMap((table) => [
      ...Object.keys(table.indexes),
      ...Object.keys(table.uniqueConstraints),
    ]);
    const missingIndexes = expectedIndexes.filter((name) => !actualIndexes.has(name));

    if (columnDifferences.length || missingForeignKeys.length || missingIndexes.length) {
      const details = [
        ...columnDifferences,
        ...missingForeignKeys.map((name) => `foreign key ${name}: tidak ditemukan`),
        ...missingKeyConstraints.map((name) => `primary/unique constraint ${name}: tidak ditemukan`),
        ...missingIndexes.map((name) => `index ${name}: tidak ditemukan`),
      ];
      throw new Error(`Baseline dibatalkan karena skema berbeda:\n- ${details.join("\n- ")}`);
    }

    await client.query("CREATE SCHEMA IF NOT EXISTS drizzle");
    await client.query(`
      CREATE TABLE drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `);
    const hash = createHash("sha256").update(migrationSql).digest("hex");
    await client.query(
      "INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)",
      [hash, initialEntry.when],
    );
    await client.query("COMMIT");
    console.log("Baseline migration awal berhasil dicatat setelah skema lama terverifikasi.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

baselineExistingDatabase()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Baseline database gagal.");
    process.exitCode = 1;
  })
  .finally(() => pool.end());
