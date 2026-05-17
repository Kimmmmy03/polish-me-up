"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { notifyStatusChanged } from "@/lib/notifications/events";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitError } from "@/lib/rate-limit";
import { canCancel } from "@/lib/validations/bookingStatus.schema";

type ActionResult = { ok: true } | { ok: false; error: string };

const inputSchema = z.object({
  booking_id: z.string().uuid("Invalid booking id"),
});

export async function cancelBookingAsCustomer(
  input: z.infer<typeof inputSchema>,
): Promise<ActionResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const limit = await checkRateLimit("write", user.id);
  if (!limit.ok) return { ok: false, error: rateLimitError("write") };

  const { data: booking, error: loadErr } = await supabase
    .from("bookings")
    .select("id, status, customer:customers!inner(profile_id)")
    .eq("id", parsed.data.booking_id)
    .single();

  if (loadErr || !booking) {
    return { ok: false, error: loadErr?.message ?? "Booking not found" };
  }

  type CustomerRel = { profile_id: string | null };
  const customerRel = booking.customer as CustomerRel | CustomerRel[] | null;
  const ownerProfile = Array.isArray(customerRel)
    ? customerRel[0]?.profile_id
    : customerRel?.profile_id;
  if (ownerProfile !== user.id) {
    return { ok: false, error: "You can only cancel your own bookings." };
  }

  const currentStatus = booking.status ?? "pending";
  if (!canCancel(currentStatus)) {
    return {
      ok: false,
      error: `Cannot cancel a booking that is already "${currentStatus}".`,
    };
  }

  const { error: updateErr } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", parsed.data.booking_id);
  if (updateErr) return { ok: false, error: updateErr.message };

  revalidatePath("/my-bookings");
  revalidatePath("/bookings");

  void notifyStatusChanged(
    parsed.data.booking_id,
    currentStatus,
    "cancelled",
    "customer",
  ).catch((err) => {
    console.error("[notify] customer cancel", parsed.data.booking_id, err);
  });

  return { ok: true };
}
