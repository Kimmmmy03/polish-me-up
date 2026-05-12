import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarCheck, Clock, MapPin, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CancelBookingButton } from "@/components/customer/CancelBookingButton";
import { createClient } from "@/lib/supabase/server";
import { formatMYR } from "@/lib/utils/formatPrice";
import type { Database } from "@/types/database.types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

const LOCATION_LABELS: Record<string, string> = {
  home: "Home",
  booth: "Booth",
  other: "Other",
};

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: "bg-gray-100 text-gray-700 ring-gray-200",
  confirmed: "bg-[#FDF2F4] text-[#E91E63] ring-[#F8BBD0]",
  in_progress: "bg-[#FDF2F4] text-[#E91E63] ring-[#F8BBD0]",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
};

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default async function MyBookingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  const bookings = customer
    ? (
        await supabase
          .from("bookings")
          .select(
            `
              id,
              booking_number,
              booking_date,
              booking_time,
              location_type,
              total,
              status,
              manicurists(profiles(full_name)),
              booking_items(quantity, items(name))
            `,
          )
          .eq("customer_id", customer.id)
          .order("booking_date", { ascending: false })
      ).data ?? []
    : [];

  if (!customer || bookings.length === 0) {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-2xl bg-white p-8 text-center ring-1 ring-[#F8BBD0]">
        <div className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-[#FDF2F4] text-[#E91E63]">
          <CalendarCheck className="size-6" />
        </div>
        <h1 className="text-xl font-semibold text-[#2D2D2D]">No bookings yet</h1>
        <p className="text-sm text-muted-foreground">
          Browse our packages to book your first appointment.
        </p>
        <Button
          asChild
          className="bg-[#E91E63] text-white hover:bg-[#C2185B]"
        >
          <Link href="/packages">Browse packages</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-[#E91E63] md:text-4xl">
          My bookings
        </h1>
        <p className="text-muted-foreground">
          Your appointment history with Polish Me Up.
        </p>
      </div>

      <ul className="space-y-4">
        {bookings.map((b) => {
          type ManicuristRel = {
            profiles: { full_name: string | null } | { full_name: string | null }[] | null;
          };
          const mRel = (Array.isArray(b.manicurists)
            ? b.manicurists[0]
            : b.manicurists) as ManicuristRel | null;
          const mProfile = mRel
            ? Array.isArray(mRel.profiles)
              ? mRel.profiles[0]
              : mRel.profiles
            : null;
          const manicuristName = mProfile?.full_name ?? "Unassigned";

          type LineRow = {
            quantity: number;
            items: { name: string } | { name: string }[] | null;
          };
          const lines = (b.booking_items ?? []) as LineRow[];

          const dateLabel = new Date(`${b.booking_date}T00:00:00`).toLocaleDateString(
            "en-GB",
            { weekday: "short", day: "numeric", month: "short", year: "numeric" },
          );
          const status = (b.status ?? "pending") as BookingStatus;

          return (
            <li
              key={b.id}
              className="rounded-2xl border border-[#F8BBD0] bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  {b.booking_number && (
                    <p className="font-mono text-xs text-muted-foreground">
                      {b.booking_number}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-sm text-[#2D2D2D]">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarCheck className="size-4 text-[#E91E63]" />
                      {dateLabel}
                    </span>
                    {b.booking_time && (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="size-4 text-[#E91E63]" />
                        {b.booking_time.slice(0, 5)}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <User className="size-4 text-[#E91E63]" />
                      {manicuristName}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-4 text-[#E91E63]" />
                      {LOCATION_LABELS[b.location_type] ?? b.location_type}
                    </span>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${STATUS_STYLES[status]}`}
                >
                  {STATUS_LABELS[status]}
                </span>
              </div>

              {lines.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {lines.map((line, i) => {
                    const itemRel = Array.isArray(line.items)
                      ? line.items[0]
                      : line.items;
                    return (
                      <li key={i}>
                        {itemRel?.name ?? "Item"}
                        {line.quantity > 1 ? ` × ${line.quantity}` : ""}
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#F8BBD0]/60 pt-3">
                <p className="text-base font-semibold text-[#2D2D2D]">
                  {formatMYR(Number(b.total))}
                </p>
                {status === "pending" && (
                  <CancelBookingButton bookingId={b.id} />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
