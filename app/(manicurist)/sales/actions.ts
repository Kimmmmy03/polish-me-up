"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitError } from "@/lib/rate-limit";

type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };

async function requireManicurist() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "manicurist") {
    return { ok: false as const, error: "Manicurists only" };
  }
  return { ok: true as const, supabase, userId: user.id };
}

const customerSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("existing"), id: z.string().uuid() }),
  z.object({
    kind: z.literal("new"),
    name: z.string().trim().min(1, "Customer name is required").max(120),
  }),
]);

const itemRefSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("existing"), id: z.string().uuid() }),
  z.object({
    kind: z.literal("new"),
    name: z.string().trim().min(1, "Item name is required").max(120),
    cost: z.number().nonnegative().optional(),
  }),
]);

const lineSchema = z.object({
  item: itemRefSchema,
  quantity: z.number().int().positive().max(99),
  unit_price: z.number().nonnegative(),
});

const createSaleSchema = z.object({
  booking_number: z
    .string()
    .trim()
    .min(1, "Booking number is required")
    .max(40),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  customer: customerSchema,
  lines: z.array(lineSchema).min(1, "Add at least one line item"),
  discount_amount: z.number().nonnegative().default(0),
  refunds: z.number().nonnegative().default(0),
  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : null)),
});

export type CreateManualSaleInput = z.input<typeof createSaleSchema>;

export async function createManualSale(
  input: CreateManualSaleInput,
): Promise<ActionResult<{ saleId: string; bookingId: string }>> {
  const parsed = createSaleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const auth = await requireManicurist();
  if (!auth.ok) return auth;
  const { supabase, userId } = auth;

  const limit = await checkRateLimit("write", userId);
  if (!limit.ok) return { ok: false, error: rateLimitError("write") };

  // ── 1. Resolve / create customer ────────────────────────────────────────
  let customerId: string;
  if (parsed.data.customer.kind === "existing") {
    customerId = parsed.data.customer.id;
  } else {
    const { data: newCustomer, error: custErr } = await supabase
      .from("customers")
      .insert({
        full_name: parsed.data.customer.name,
        source: "manual",
      })
      .select("id")
      .single();
    if (custErr || !newCustomer) {
      return { ok: false, error: custErr?.message ?? "Failed to create customer" };
    }
    customerId = newCustomer.id;
  }

  // ── 2. Resolve / create items for every line ────────────────────────────
  // Build a parallel array of resolved item_id + cost in the same order as
  // the input lines.
  const resolvedLines: Array<{
    item_id: string;
    cost: number;
    quantity: number;
    unit_price: number;
  }> = [];

  // Look up costs for existing items in one query.
  const existingIds = parsed.data.lines
    .map((l) => (l.item.kind === "existing" ? l.item.id : null))
    .filter((x): x is string => x !== null);
  const costById = new Map<string, number>();
  if (existingIds.length > 0) {
    const { data: itemRows, error: itemsErr } = await supabase
      .from("items")
      .select("id, cost")
      .in("id", existingIds);
    if (itemsErr) return { ok: false, error: itemsErr.message };
    for (const r of itemRows ?? []) {
      costById.set(r.id, Number(r.cost ?? 0));
    }
  }

  for (const line of parsed.data.lines) {
    if (line.item.kind === "existing") {
      resolvedLines.push({
        item_id: line.item.id,
        cost: costById.get(line.item.id) ?? 0,
        quantity: line.quantity,
        unit_price: line.unit_price,
      });
    } else {
      const cost = line.item.cost ?? 0;
      const { data: newItem, error: itemErr } = await supabase
        .from("items")
        .insert({
          name: line.item.name,
          price: line.unit_price,
          cost,
          category: "package",
          service_mode: "walkin",
          is_active: false,
        })
        .select("id")
        .single();
      if (itemErr || !newItem) {
        return {
          ok: false,
          error: itemErr?.message ?? "Failed to create item",
        };
      }
      resolvedLines.push({
        item_id: newItem.id,
        cost,
        quantity: line.quantity,
        unit_price: line.unit_price,
      });
    }
  }

  // ── 3. Compute totals server-side ───────────────────────────────────────
  const subtotal = resolvedLines.reduce(
    (sum, l) => sum + l.unit_price * l.quantity,
    0,
  );
  const total = Math.max(0, subtotal - parsed.data.discount_amount);
  const costOfGoods = resolvedLines.reduce(
    (sum, l) => sum + l.cost * l.quantity,
    0,
  );

  // ── 4. Resolve manicurist row ───────────────────────────────────────────
  const { data: manicuristRow, error: maniErr } = await supabase
    .from("manicurists")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();
  if (maniErr) return { ok: false, error: maniErr.message };

  // ── 5. Insert booking ───────────────────────────────────────────────────
  const { data: bookingInsert, error: bookingErr } = await supabase
    .from("bookings")
    .insert({
      booking_number: parsed.data.booking_number,
      customer_id: customerId,
      manicurist_id: manicuristRow?.id ?? null,
      booking_date: parsed.data.date,
      booking_time: null,
      service_mode: "walkin",
      location_type: "booth",
      subtotal,
      discount_amount: parsed.data.discount_amount,
      total,
      status: "completed",
      payment_status: "paid",
      source: "manual",
      notes: parsed.data.notes,
    })
    .select("id")
    .single();
  if (bookingErr || !bookingInsert) {
    return { ok: false, error: bookingErr?.message ?? "Failed to create booking" };
  }
  const bookingId = bookingInsert.id;

  // ── 6. Insert booking_items ─────────────────────────────────────────────
  const { error: itemsInsertErr } = await supabase.from("booking_items").insert(
    resolvedLines.map((l) => ({
      booking_id: bookingId,
      item_id: l.item_id,
      quantity: l.quantity,
      unit_price: l.unit_price,
      subtotal: l.unit_price * l.quantity,
    })),
  );
  if (itemsInsertErr) {
    await supabase.from("bookings").delete().eq("id", bookingId);
    return { ok: false, error: itemsInsertErr.message };
  }

  // ── 7. Insert sales row ─────────────────────────────────────────────────
  const { data: saleInsert, error: saleErr } = await supabase
    .from("sales")
    .insert({
      date: parsed.data.date,
      booking_id: bookingId,
      gross_sales: subtotal,
      refunds: parsed.data.refunds,
      discounts: parsed.data.discount_amount,
      cost_of_goods: costOfGoods,
      source: "manual",
    })
    .select("id")
    .single();
  if (saleErr || !saleInsert) {
    await supabase.from("booking_items").delete().eq("booking_id", bookingId);
    await supabase.from("bookings").delete().eq("id", bookingId);
    return { ok: false, error: saleErr?.message ?? "Failed to create sale" };
  }

  revalidatePath("/sales");
  revalidatePath("/bookings");
  revalidatePath("/dashboard");
  return { ok: true, data: { saleId: saleInsert.id, bookingId } };
}

const deleteSaleSchema = z.object({
  sale_id: z.string().uuid("Invalid sale id"),
});

export async function deleteSale(
  input: z.infer<typeof deleteSaleSchema>,
): Promise<ActionResult> {
  const parsed = deleteSaleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const auth = await requireManicurist();
  if (!auth.ok) return auth;
  const { supabase } = auth;

  const { data: sale, error: loadErr } = await supabase
    .from("sales")
    .select("id, source, booking_id")
    .eq("id", parsed.data.sale_id)
    .single();
  if (loadErr || !sale) {
    return { ok: false, error: loadErr?.message ?? "Sale not found" };
  }

  const { error: delErr } = await supabase
    .from("sales")
    .delete()
    .eq("id", sale.id);
  if (delErr) return { ok: false, error: delErr.message };

  if (sale.booking_id && sale.source === "manual") {
    await supabase.from("booking_items").delete().eq("booking_id", sale.booking_id);
    await supabase.from("bookings").delete().eq("id", sale.booking_id);
  }

  revalidatePath("/sales");
  revalidatePath("/bookings");
  revalidatePath("/dashboard");
  return { ok: true };
}
