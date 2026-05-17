"use server";

import { revalidatePath } from "next/cache";

import {
  notifyPaymentReceived,
  notifyStatusChanged,
} from "@/lib/notifications/events";
import { createClient } from "@/lib/supabase/server";
import {
  bookingStatusTransitionSchema,
  paymentStatusSchema,
  type BookingStatusTransitionInput,
  type PaymentStatusInput,
} from "@/lib/validations/bookingStatus.schema";

type ActionResult = { ok: true } | { ok: false; error: string };

async function assertManicurist(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (error || profile?.role !== "manicurist") {
    return { ok: false, error: "Only manicurists may perform this action" };
  }
  return { ok: true };
}

function isoToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function transitionBookingStatus(
  input: BookingStatusTransitionInput,
): Promise<ActionResult> {
  const parsed = bookingStatusTransitionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const auth = await assertManicurist();
  if (!auth.ok) return auth;

  const supabase = await createClient();

  // Re-check the current status server-side. Stops accidental double-clicks
  // and protects against stale UI state.
  const { data: current, error: currentErr } = await supabase
    .from("bookings")
    .select(
      "id, status, total, discount_amount, source, booking_items(quantity, items(cost))",
    )
    .eq("id", parsed.data.booking_id)
    .single();
  if (currentErr || !current) {
    return { ok: false, error: currentErr?.message ?? "Booking not found" };
  }
  if (current.status !== parsed.data.from) {
    return {
      ok: false,
      error: `Booking is already "${current.status}", cannot transition from "${parsed.data.from}"`,
    };
  }

  const { error: updateErr } = await supabase
    .from("bookings")
    .update({ status: parsed.data.to })
    .eq("id", parsed.data.booking_id);
  if (updateErr) return { ok: false, error: updateErr.message };

  // Mirror to sales when entering "completed". Upsert by booking_id so a
  // double-trigger of this action doesn't insert a duplicate sales row.
  if (parsed.data.to === "completed") {
    type LineRow = {
      quantity: number;
      items:
        | { cost: number | null }
        | { cost: number | null }[]
        | null;
    };
    const lines = (current.booking_items ?? []) as LineRow[];
    const costOfGoods = lines.reduce((sum, line) => {
      const itemRel = Array.isArray(line.items) ? line.items[0] : line.items;
      const cost = Number(itemRel?.cost ?? 0);
      return sum + cost * Number(line.quantity ?? 0);
    }, 0);

    const salesRow = {
      date: isoToday(),
      booking_id: current.id,
      gross_sales: Number(current.total ?? 0),
      refunds: 0,
      discounts: Number(current.discount_amount ?? 0),
      cost_of_goods: costOfGoods,
      source: current.source ?? "system",
    };

    const { data: existingSale } = await supabase
      .from("sales")
      .select("id")
      .eq("booking_id", current.id)
      .maybeSingle();

    if (existingSale?.id) {
      const { error: salesErr } = await supabase
        .from("sales")
        .update(salesRow)
        .eq("id", existingSale.id);
      if (salesErr) {
        return {
          ok: false,
          error: `Booking marked completed but sales update failed: ${salesErr.message}`,
        };
      }
    } else {
      const { error: salesErr } = await supabase.from("sales").insert(salesRow);
      if (salesErr) {
        return {
          ok: false,
          error: `Booking marked completed but sales insert failed: ${salesErr.message}`,
        };
      }
    }
  }

  revalidatePath("/bookings");
  revalidatePath("/sales");
  revalidatePath("/dashboard");

  // Fire-and-forget: a notification failure must not undo the DB transition.
  void notifyStatusChanged(
    parsed.data.booking_id,
    parsed.data.from,
    parsed.data.to,
    "manicurist",
  ).catch((err) => {
    console.error("[notify] status change", parsed.data.booking_id, err);
  });

  return { ok: true };
}

export async function setPaymentStatus(
  input: PaymentStatusInput,
): Promise<ActionResult> {
  const parsed = paymentStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const auth = await assertManicurist();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { error } = await supabase
    .from("bookings")
    .update({ payment_status: parsed.data.payment_status })
    .eq("id", parsed.data.booking_id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/bookings");

  if (parsed.data.payment_status === "paid") {
    void notifyPaymentReceived(parsed.data.booking_id).catch((err) => {
      console.error("[notify] payment received", parsed.data.booking_id, err);
    });
  }

  return { ok: true };
}
