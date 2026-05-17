import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#FFF5F8] via-[#FFE4EC] to-[#FFD1DC]/40 p-6">
      <div className="w-full max-w-md rounded-2xl border border-[#F8BBD0] bg-white/95 p-8 text-center shadow-lg">
        <p className="pmu-animated-gradient-text text-5xl font-bold tracking-tight">
          404
        </p>
        <h1 className="mt-3 text-xl font-bold text-[#3D1A2A]">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-[#5C2D48]/80">
          The page you&apos;re looking for doesn&apos;t exist or has been
          moved.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#EC4899] to-[#DB2777] px-5 py-2 text-sm font-medium text-white shadow-md transition-all hover:from-[#DB2777] hover:to-[#BE185D]"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
