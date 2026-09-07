"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function Error({
  error,
  reset,
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-rose-50 text-xl">
          !
        </div>

        <h1 className="mt-5 text-xl font-semibold text-slate-800">
          Something went wrong
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          The error has been recorded. Please try again.
        </p>

        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white"
        >
          Try Again
        </button>
      </div>
    </main>
  );
}
