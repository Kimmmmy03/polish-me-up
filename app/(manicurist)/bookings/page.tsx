import { redirect } from "next/navigation";

import { BookingsView } from "@/components/manicurist/BookingsView";
import { PageHeader } from "@/components/manicurist/PageHeader";
import { RefreshControl } from "@/components/common/RefreshControl";
import { createClient } from "@/lib/supabase/server";

export default async function BookingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Resolve the manicurist row tied to this signed-in profile. This is the
  // default "mine" filter the view starts with.
  const { data: manicuristRow } = await supabase
    .from("manicurists")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `id,
       booking_number,
       booking_date,
       booking_time,
       service_mode,
       location_type,
       address,
       address_lat,
       address_lng,
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
  const loadedAt = new Date().toISOString();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings"
        subtitle={`${bookings.length} ${bookings.length === 1 ? "booking" : "bookings"} on record`}
        userId={user.id}
        actions={<RefreshControl updatedAt={loadedAt} />}
      />

      {error ? (
        <p className="text-sm text-destructive">
          Failed to load bookings: {error.message}
        </p>
      ) : (
        <BookingsView
          bookings={bookings}
          currentManicuristId={manicuristRow?.id ?? null}
        />
      )}
    </div>
  );
}
