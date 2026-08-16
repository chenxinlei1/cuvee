import "server-only";
import { join } from "node:path";

/**
 * Root directory for runtime data (SQLite stores, pre-hydrated cache export,
 * bundled CSVs / schema). Defaults to `data/` under the project root so local
 * development, tests, and the Docker image all share the same layout.
 *
 * Set CUVEE_DATA_DIR to relocate it — required when the image mounts a
 * persistent volume for SQLite state or when tests need an isolated copy.
 */
export function dataRoot(): string {
  return process.env.CUVEE_DATA_DIR
    ? join(process.env.CUVEE_DATA_DIR)
    : join(process.cwd(), "data");
}

/** Join path segments onto the runtime data root. */
export function dataDir(...parts: string[]): string {
  return join(dataRoot(), ...parts);
}
