"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <main style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, sans-serif",
          background: "#f8fafc",
          padding: "24px",
        }}>
          <div style={{
            maxWidth: "420px",
            width: "100%",
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "18px",
            padding: "32px",
            textAlign: "center",
          }}>
            <h1>
              CareTrack encountered an error
            </h1>

            <p style={{
              color: "#64748b",
              lineHeight: 1.6,
            }}>
              The issue has been recorded automatically.
            </p>

            <button
              onClick={() => reset()}
              style={{
                marginTop: "18px",
                border: 0,
                borderRadius: "10px",
                padding: "12px 18px",
                background: "#4f46e5",
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reload
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
