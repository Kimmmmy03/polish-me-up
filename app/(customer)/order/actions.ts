"use server";

import { notifyBookingCreated } from "@/lib/notifications/events";

export async function notifyBookingCreatedAction(
  bookingId: string,
): Promise<void> {
  await notifyBookingCreated(bookingId);
}
