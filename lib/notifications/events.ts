import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  loadBookingForNotification,
  type BookingNotificationData,
} from "./recipients";

type BookingStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";

type Notification = {
  recipientProfileId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  bookingId?: string;
};

async function insertNotifications(rows: Notification[]): Promise<void> {
  if (rows.length === 0) return;
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").insert(
    rows.map((n) => ({
      recipient_profile_id: n.recipientProfileId,
      type: n.type,
      title: n.title,
      body: n.body ?? null,
      link: n.link ?? null,
      booking_id: n.bookingId ?? null,
    })),
  );
  if (error) {
    console.error("[notify] insert failed", error, rows);
  }
}

async function withBooking(
  bookingId: string,
  fn: (b: BookingNotificationData) => Promise<void>,
): Promise<void> {
  const booking = await loadBookingForNotification(bookingId);
  if (!booking) return;
  await fn(booking);
}

function bookingLabel(b: BookingNotificationData): string {
  return b.booking_number ? `#${b.booking_number}` : `#${b.id.slice(0, 8)}`;
}

function bookingWhen(b: BookingNotificationData): string {
  const date = b.booking_date;
  const time = b.booking_time ? ` at ${b.booking_time.slice(0, 5)}` : "";
  return `${date}${time}`;
}

export async function notifyBookingCreated(bookingId: string): Promise<void> {
  await withBooking(bookingId, async (b) => {
    const label = bookingLabel(b);
    const when = bookingWhen(b);
    const rows: Notification[] = [];

    if (b.customer.profile_id) {
      rows.push({
        recipientProfileId: b.customer.profile_id,
        type: "booking.created",
        title: `Booking ${label} received`,
        body: `Your booking on ${when} is pending confirmation.`,
        link: "/my-bookings",
        bookingId: b.id,
      });
    }

    if (b.manicurist?.profile_id) {
      rows.push({
        recipientProfileId: b.manicurist.profile_id,
        type: "booking.created",
        title: `New booking ${label}`,
        body: `${b.customer.full_name} booked you for ${when}.`,
        link: "/bookings",
        bookingId: b.id,
      });
    }

    await insertNotifications(rows);
  });
}

export async function notifyStatusChanged(
  bookingId: string,
  from: BookingStatus,
  to: BookingStatus,
  cancelledBy: "customer" | "manicurist" = "manicurist",
): Promise<void> {
  await withBooking(bookingId, async (b) => {
    const label = bookingLabel(b);
    const when = bookingWhen(b);
    const rows: Notification[] = [];

    if (to === "confirmed" && from === "pending" && b.customer.profile_id) {
      rows.push({
        recipientProfileId: b.customer.profile_id,
        type: "booking.confirmed",
        title: `Booking ${label} confirmed`,
        body: `Your booking on ${when} has been confirmed.`,
        link: "/my-bookings",
        bookingId: b.id,
      });
    } else if (to === "completed" && b.customer.profile_id) {
      rows.push({
        recipientProfileId: b.customer.profile_id,
        type: "booking.completed",
        title: `Booking ${label} completed`,
        body: `Thanks for choosing us! We hope you loved your service.`,
        link: "/my-bookings",
        bookingId: b.id,
      });
    } else if (to === "cancelled") {
      if (b.customer.profile_id) {
        rows.push({
          recipientProfileId: b.customer.profile_id,
          type: "booking.cancelled",
          title: `Booking ${label} cancelled`,
          body:
            cancelledBy === "manicurist"
              ? `Your manicurist cancelled your booking on ${when}.`
              : `Your booking on ${when} has been cancelled.`,
          link: "/my-bookings",
          bookingId: b.id,
        });
      }
      if (cancelledBy === "customer" && b.manicurist?.profile_id) {
        rows.push({
          recipientProfileId: b.manicurist.profile_id,
          type: "booking.cancelled",
          title: `Booking ${label} cancelled`,
          body: `${b.customer.full_name} cancelled their booking on ${when}.`,
          link: "/bookings",
          bookingId: b.id,
        });
      }
    }

    await insertNotifications(rows);
  });
}

export async function notifyPaymentReceived(bookingId: string): Promise<void> {
  await withBooking(bookingId, async (b) => {
    if (!b.customer.profile_id) return;
    await insertNotifications([
      {
        recipientProfileId: b.customer.profile_id,
        type: "payment.received",
        title: `Payment received for ${bookingLabel(b)}`,
        body: `We received your payment of RM ${b.total.toFixed(2)}.`,
        link: "/my-bookings",
        bookingId: b.id,
      },
    ]);
  });
}
