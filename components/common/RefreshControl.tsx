"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatRelative(fromMs: number, nowMs: number): string {
  const diffSec = Math.max(0, Math.round((nowMs - fromMs) / 1000));
  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return new Date(fromMs).toLocaleDateString();
}

function formatClock(ms: number): string {
  return new Date(ms).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RefreshControl({
  updatedAt,
  className,
  label = "Updated",
}: {
  updatedAt: string | number;
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const updatedMs = React.useMemo(
    () =>
      typeof updatedAt === "number"
        ? updatedAt
        : new Date(updatedAt).getTime(),
    [updatedAt],
  );
  const [now, setNow] = React.useState<number>(() => Date.now());

  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  function handleRefresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  const relative = formatRelative(updatedMs, now);
  const clock = formatClock(updatedMs);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-[#F8BBD0] bg-white/80 px-3 py-1 text-xs text-[#5C2D48] shadow-sm",
        className,
      )}
    >
      <span className="whitespace-nowrap">
        {label}{" "}
        <span className="font-medium text-[#3D1A2A]" title={`Loaded at ${clock}`}>
          {relative}
        </span>
        <span className="ml-1 hidden text-[#5C2D48]/60 sm:inline">· {clock}</span>
      </span>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={handleRefresh}
        disabled={isPending}
        aria-label="Refresh"
        className="h-7 w-7 rounded-full p-0 text-[#BE185D] hover:bg-[#FFE4EC] hover:text-[#BE185D] disabled:opacity-60"
      >
        <RefreshCw
          className={cn("size-3.5", isPending && "animate-spin")}
          aria-hidden
        />
      </Button>
    </div>
  );
}
