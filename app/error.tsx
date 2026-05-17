"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[route-error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-[#F8BBD0] bg-white/95 p-6 text-center shadow-md">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#BE3D7E]">
          Oops
        </p>
        <h2 className="mt-2 text-lg font-bold text-[#3D1A2A]">
          We couldn&apos;t load this page
        </h2>
        <p className="mt-2 text-sm text-[#5C2D48]/80">
          The server returned an unexpected error. Please try again.
        </p>
        {error.digest && (
          <p className="mt-3 inline-block rounded-md bg-[#FFF5F8] px-2 py-1 font-mono text-[11px] text-[#5C2D48]/70">
            ref: {error.digest}
          </p>
        )}
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#EC4899] to-[#DB2777] px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:from-[#DB2777] hover:to-[#BE185D]"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-[#F8BBD0] bg-white px-4 py-2 text-sm font-medium text-[#3D1A2A] hover:bg-[#FFF5F8]"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
