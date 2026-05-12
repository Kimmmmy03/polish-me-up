import { BookingsView } from "@/components/manicurist/BookingsView";
import { createClient } from "@/lib/supabase/server";

export default async function BookingsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `id,
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
       payment_status,
       source,
       customer_id,
       manicurist_id,
       created_at,
       customers ( id, full_name, email, phone ),
       manicurists ( id, profiles ( full_name ) ),
       booking_items (
         id,
         quantity,
         unit_price,
         subtotal,
         items ( id, name, cost )
       )`,
    )
    .order("booking_date", { ascending: false })
    .order("booking_time", { ascending: false, nullsFirst: false });

  const bookings = data ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-[#2D2D2D]">
          Bookings
        </h1>
        <p className="text-muted-foreground">
          {bookings.length} {bookings.length === 1 ? "booking" : "bookings"} on record
        </p>
      </div>

      {error ? (
        <p className="text-sm text-destructive">
          Failed to load bookings: {error.message}
        </p>
      ) : (
        <BookingsView bookings={bookings} />
      )}
    </div>
  );
}
