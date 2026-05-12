import { CalendarClock } from "lucide-react";

export default function AvailabilityPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-[#2D2D2D]">
          Availability
        </h1>
        <p className="text-muted-foreground">Manage your bookable hours</p>
      </div>

      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#F8BBD0] bg-white px-8 py-16 text-center">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-[#FDF2F4] text-[#E91E63]">
          <CalendarClock className="size-6" />
        </span>
        <h2 className="text-xl font-semibold text-[#2D2D2D]">Coming soon</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          The availability calendar — pick your working hours and prevent
          double-booking — is on the v1.1 roadmap. For now every 15-minute slot
          between 09:00 and 19:00 is bookable.
        </p>
      </div>
    </div>
  );
}
