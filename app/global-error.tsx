"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#FFF5F8] via-[#FFE4EC] to-[#FFD1DC]/40 p-6">
        <div className="w-full max-w-md rounded-2xl border border-[#F8BBD0] bg-white/95 p-8 text-center shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#BE3D7E]">
            Something went wrong
          </p>
          <h1 className="mt-2 text-2xl font-bold text-[#3D1A2A]">
            We hit an unexpected error
          </h1>
          <p className="mt-2 text-sm text-[#5C2D48]/80">
            Try refreshing the page. If it keeps happening, contact support and
            share the reference below.
          </p>
          {error.digest && (
            <p className="mt-3 inline-block rounded-md bg-[#FFF5F8] px-2 py-1 font-mono text-[11px] text-[#5C2D48]/70">
              ref: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#EC4899] to-[#DB2777] px-5 py-2 text-sm font-medium text-white shadow-md transition-all hover:from-[#DB2777] hover:to-[#BE185D]"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
