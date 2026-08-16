import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";
import { Pool, type PoolClient } from "pg";
import { config } from "dotenv";

config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const source = resolve(process.env.CUVEE_SQLITE_PATH ?? "data/.memory/auth.sqlite");
const sqlite = new DatabaseSync(source, { readOnly: true });
const pool = new Pool({ connectionString: databaseUrl });

type Row = Record<string, unknown>;
async function insertRows(client: PoolClient, table: string, sourceRows: Row[]) {
  for (const row of sourceRows) {
    const columns = Object.keys(row);
    const values = columns.map((column) => {
      const value = row[column];
      if (table === "reports" && column === "result_json" && typeof value === "string")
        return JSON.parse(value);
      if (table === "audit_logs" && column === "metadata" && typeof value === "string")
        return JSON.parse(value);
      if (table === "report_grants" && column === "can_download") return Boolean(value);
      return value;
    });
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(",");
    await client.query(
      `INSERT INTO ${table} (${columns.join(",")}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
      values,
    );
  }
  console.log(`${table}: ${sourceRows.length}`);
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "TRUNCATE report_grants,report_permissions,audit_logs,login_attempts,documents,reports,users CASCADE",
    );
    for (const table of [
      "users",
      "reports",
      "documents",
      "audit_logs",
      "login_attempts",
      "report_permissions",
      "report_grants",
    ]) {
      const sourceRows = sqlite.prepare(`SELECT * FROM ${table}`).all() as unknown as Row[];
      await insertRows(client, table, sourceRows);
    }
    await client.query("COMMIT");
    console.log(`Imported SQLite data from ${source}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
    sqlite.close();
  }
}

void main();
