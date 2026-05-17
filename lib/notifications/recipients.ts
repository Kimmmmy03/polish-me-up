import "server-only";

import { createClient } from "@/lib/supabase/server";

export type BookingNotificationData = {
  id: string;
  booking_number: string | null;
  booking_date: string;
  booking_time: string | null;
  service_mode: "walkin" | "mobile" | null;
  address: string | null;
  notes: string | null;
  subtotal: number;
  discount_amount: number;
  total: number;
  status: string | null;
  payment_status: string | null;
  customer: { profile_id: string | null; full_name: string; email: string | null };
  manicurist: { profile_id: string; full_name: string; email: string | null } | null;
  lines: Array<{ name: string; quantity: number; unit_price: number }>;
};

type RawBooking = {
  id: string;
  booking_number: string | null;
  booking_date: string;
  booking_time: string | null;
  service_mode: "walkin" | "mobile" | null;
  address: string | null;
  notes: string | null;
  subtotal: number | null;
  discount_amount: number | null;
  total: number | null;
  status: string | null;
  payment_status: string | null;
  customers:
    | { profile_id: string | null; full_name: string; email: string | null }
    | { profile_id: string | null; full_name: string; email: string | null }[]
    | null;
  manicurists:
    | {
        profile_id: string;
        profiles:
          | { full_name: string | null; email: string | null }
          | { full_name: string | null; email: string | null }[]
          | null;
      }
    | {
        profile_id: string;
        profiles:
          | { full_name: string | null; email: string | null }
          | { full_name: string | null; email: string | null }[]
          | null;
      }[]
    | null;
  booking_items:
    | Array<{
        quantity: number | null;
        unit_price: number | null;
        items:
          | { name: string | null }
          | { name: string | null }[]
          | null;
      }>
    | null;
};

function unwrap<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? rel[0] ?? null : rel;
}

export async function loadBookingForNotification(
  bookingId: string,
): Promise<BookingNotificationData | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id, booking_number, booking_date, booking_time, service_mode,
      address, notes, subtotal, discount_amount, total, status, payment_status,
      customers!inner(profile_id, full_name, email),
      manicurists(profile_id, profiles!inner(full_name, email)),
      booking_items(quantity, unit_price, items(name))
    `,
    )
    .eq("id", bookingId)
    .single();

  if (error || !data) {
    console.error("[notify] failed to load booking", bookingId, error);
    return null;
  }

  const raw = data as unknown as RawBooking;
  const customer = unwrap(raw.customers);
  if (!customer) return null;

  const manicuristRow = unwrap(raw.manicurists);
  const manicuristProfile = manicuristRow
    ? unwrap(manicuristRow.profiles)
    : null;

  const lines = (raw.booking_items ?? []).map((line) => {
    const item = unwrap(line.items);
    return {
      name: item?.name ?? "Service",
      quantity: Number(line.quantity ?? 0),
      unit_price: Number(line.unit_price ?? 0),
    };
  });

  return {
    id: raw.id,
    booking_number: raw.booking_number,
    booking_date: raw.booking_date,
    booking_time: raw.booking_time,
    service_mode: raw.service_mode,
    address: raw.address,
    notes: raw.notes,
    subtotal: Number(raw.subtotal ?? 0),
    discount_amount: Number(raw.discount_amount ?? 0),
    total: Number(raw.total ?? 0),
    status: raw.status,
    payment_status: raw.payment_status,
    customer: {
      profile_id: customer.profile_id,
      full_name: customer.full_name,
      email: customer.email,
    },
    manicurist: manicuristRow && manicuristProfile
      ? {
          profile_id: manicuristRow.profile_id,
          full_name: manicuristProfile.full_name ?? "Your manicurist",
          email: manicuristProfile.email,
        }
      : null,
    lines,
  };
}
