"use client";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <main
      style={{
        fontFamily: "system-ui",
        padding: "4rem",
        maxWidth: "42rem",
        margin: "auto",
      }}
    >
      <h1>Something went wrong</h1>
      <p>The error has been recorded. You can safely try again.</p>
      <button onClick={reset}>Try again</button>
    </main>
  );
}
