import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
    if (process.env.CUVEE_WORKER_AUTOSTART === "true") {
      const { ensureWorkerStarted } = await import("./src/lib/tasks/worker");
      ensureWorkerStarted();
    }
  }
  if (process.env.NEXT_RUNTIME === "edge") await import("./sentry.edge.config");
}

export const onRequestError = Sentry.captureRequestError;
