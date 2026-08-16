import "server-only";
import { mkdirSync } from "node:fs";
import { dataDir } from "@/lib/data-path";
import type { AnalyzeResult } from "@/lib/wine/types";

const TTL_MS = 24 * 60 * 60_000;
let database: import("node:sqlite").DatabaseSync | null = null;

async function db(): Promise<import("node:sqlite").DatabaseSync> {
  if (database) return database;
  const { DatabaseSync } = await import("node:sqlite");
  const dir = dataDir(".memory");
  mkdirSync(dir, { recursive: true });
  database = new DatabaseSync(dataDir(".memory", "analysis-result-cache.sqlite"));
  database.exec(`
    CREATE TABLE IF NOT EXISTS analysis_result_cache (
      cache_key TEXT PRIMARY KEY,
      result_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  return database;
}

export async function getPersistentAnalysisResult(key: string): Promise<AnalyzeResult | null> {
  const row = (await db())
    .prepare("SELECT result_json, created_at FROM analysis_result_cache WHERE cache_key = ?")
    .get(key) as { result_json: string; created_at: number } | undefined;
  if (!row) return null;
  if (Date.now() - row.created_at > TTL_MS) {
    (await db()).prepare("DELETE FROM analysis_result_cache WHERE cache_key = ?").run(key);
    return null;
  }
  try {
    return JSON.parse(row.result_json) as AnalyzeResult;
  } catch {
    return null;
  }
}

export async function putPersistentAnalysisResult(key: string, result: AnalyzeResult): Promise<void> {
  (await db())
    .prepare(
      `INSERT INTO analysis_result_cache (cache_key, result_json, created_at)
       VALUES (?, ?, ?)
       ON CONFLICT(cache_key) DO UPDATE SET result_json = excluded.result_json, created_at = excluded.created_at`,
    )
    .run(key, JSON.stringify(result), Date.now());
}
