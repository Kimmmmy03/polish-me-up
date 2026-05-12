import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  CalendarCheck,
  CheckCircle,
  Clock,
  MapPin,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { formatMYR } from "@/lib/utils/formatPrice";

const LOCATION_LABELS: Record<string, string> = {
  home: "Home visit",
  booth: "At our booth",
  other: "Other",
};

export default async function ConfirmBookingPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: booking, error } = await supabase
    .from("bookings")
    .select(
      `
        id,
        booking_number,
        booking_date,
        booking_time,
        location_type,
        address,
        notes,
        subtotal,
        discount_amount,
        discount_type,
        total,
        status,
        customer_id,
        customers!inner(profile_id),
        manicurists(profiles(full_name)),
        booking_items(quantity, unit_price, subtotal, items(name))
      `,
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !booking) notFound();

  type CustomerRel = { profile_id: string | null };
  const customerRel = (Array.isArray(booking.customers)
    ? booking.customers[0]
    : booking.customers) as CustomerRel | null;
  if (customerRel?.profile_id !== user.id) {
    notFound();
  }

  type ManicuristRel = {
    profiles: { full_name: string | null } | { full_name: string | null }[] | null;
  };
  const manicuristRel = (Array.isArray(booking.manicurists)
    ? booking.manicurists[0]
    : booking.manicurists) as ManicuristRel | null;
  const manicuristProfile = manicuristRel
    ? Array.isArray(manicuristRel.profiles)
      ? manicuristRel.profiles[0]
      : manicuristRel.profiles
    : null;
  const manicuristName = manicuristProfile?.full_name ?? "—";

  type LineRow = {
    quantity: number;
    unit_price: number;
    subtotal: number;
    items: { name: string } | { name: string }[] | null;
  };
  const lines = (booking.booking_items ?? []) as LineRow[];

  const dateLabel = new Date(`${booking.booking_date}T00:00:00`).toLocaleDateString(
    "en-GB",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-[#F8BBD0]">
        <div className="mx-auto inline-flex size-14 items-center justify-center rounded-full bg-[#FDF2F4] text-[#E91E63]">
          <CheckCircle className="size-7" />
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#E91E63]">
          Booking confirmed!
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;ll be in touch to confirm the details. Save your booking
          number for reference.
        </p>
        {booking.booking_number && (
          <p className="mt-4 inline-block rounded-full bg-[#FDF2F4] px-4 py-1.5 font-mono text-sm font-semibold text-[#E91E63] ring-1 ring-[#F8BBD0]">
            {booking.booking_number}
          </p>
        )}
      </div>

      <div className="space-y-4 rounded-2xl border border-[#F8BBD0] bg-white p-6">
        <h2 className="text-lg font-semibold text-[#2D2D2D]">Appointment</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <CalendarCheck className="mt-0.5 size-4 text-[#E91E63]" />
            <div>
              <dt className="text-xs text-muted-foreground">Date</dt>
              <dd className="font-medium text-[#2D2D2D]">{dateLabel}</dd>
            </div>
          </div>
          {booking.booking_time && (
            <div className="flex items-start gap-2">
              <Clock className="mt-0.5 size-4 text-[#E91E63]" />
              <div>
                <dt className="text-xs text-muted-foreground">Time</dt>
                <dd className="font-medium text-[#2D2D2D]">
                  {booking.booking_time.slice(0, 5)}
                </dd>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2">
            <User className="mt-0.5 size-4 text-[#E91E63]" />
            <div>
              <dt className="text-xs text-muted-foreground">Manicurist</dt>
              <dd className="font-medium text-[#2D2D2D]">{manicuristName}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 text-[#E91E63]" />
            <div>
              <dt className="text-xs text-muted-foreground">Location</dt>
              <dd className="font-medium text-[#2D2D2D]">
                {LOCATION_LABELS[booking.location_type] ?? booking.location_type}
              </dd>
              {booking.address && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {booking.address}
                </p>
              )}
            </div>
          </div>
        </dl>
        {booking.notes && (
          <div className="rounded-md bg-[#FDF2F4] p-3 text-sm text-[#2D2D2D]">
            <p className="text-xs text-muted-foreground">Notes</p>
            <p className="mt-1">{booking.notes}</p>
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-2xl border border-[#F8BBD0] bg-white p-6">
        <h2 className="text-lg font-semibold text-[#2D2D2D]">Items</h2>
        <ul className="divide-y divide-[#F8BBD0]/60">
          {lines.map((line, idx) => {
            const itemRel = Array.isArray(line.items)
              ? line.items[0]
              : line.items;
            return (
              <li
                key={idx}
                className="flex items-center justify-between py-2 text-sm"
              >
                <span className="text-[#2D2D2D]">
                  {itemRel?.name ?? "Item"}
                  {line.quantity > 1 && (
                    <span className="ml-2 text-muted-foreground">
                      × {line.quantity}
                    </span>
                  )}
                </span>
                <span className="font-medium text-[#2D2D2D]">
                  {formatMYR(Number(line.subtotal))}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="space-y-1.5 border-t border-[#F8BBD0] pt-3 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatMYR(Number(booking.subtotal))}</span>
          </div>
          {booking.discount_type === "student" &&
            Number(booking.discount_amount ?? 0) > 0 && (
              <div className="flex justify-between text-[#E91E63]">
                <span>Student discount</span>
                <span>−{formatMYR(Number(booking.discount_amount))}</span>
              </div>
            )}
          <div className="flex justify-between border-t border-[#F8BBD0] pt-2 text-base font-semibold text-[#2D2D2D]">
            <span>Total</span>
            <span>{formatMYR(Number(booking.total))}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline">
          <Link href="/packages">Book another</Link>
        </Button>
        <Button
          asChild
          className="bg-[#E91E63] text-white hover:bg-[#C2185B]"
        >
          <Link href="/my-bookings">View all my bookings</Link>
        </Button>
      </div>
    </div>
  );
}
