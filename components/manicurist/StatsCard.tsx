import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";

type StatsCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  subtext?: string;
};

export function StatsCard({ label, value, icon: Icon, subtext }: StatsCardProps) {
  return (
    <Card className="flex-row items-start gap-4 px-5 py-5">
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FDF2F4] text-[#E91E63]">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-2xl font-semibold text-[#2D2D2D]">
          {value}
        </p>
        {subtext && (
          <p className="text-xs text-muted-foreground">{subtext}</p>
        )}
      </div>
    </Card>
  );
}
