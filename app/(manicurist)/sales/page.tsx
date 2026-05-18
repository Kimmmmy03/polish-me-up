import { redirect } from "next/navigation";

import { SalesView } from "@/components/manicurist/SalesView";
import { PageHeader } from "@/components/manicurist/PageHeader";
import { RefreshControl } from "@/components/common/RefreshControl";
import { createClient } from "@/lib/supabase/server";

export default async function SalesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: manicuristRow } = await supabase
    .from("manicurists")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  const manicuristId = manicuristRow?.id ?? null;

  // Sales are scoped via their backing booking's manicurist_id. Using
  // bookings!inner with a column filter keeps the SQL on the server and
  // returns only rows that match.
  const salesQuery = supabase
    .from("sales")
    .select(
      `id,
       date,
       gross_sales,
       refunds,
       discounts,
       net_sales,
       cost_of_goods,
       gross_profit,
       source,
       booking_id,
       bookings!inner ( id, booking_number, manicurist_id )`,
    )
    .order("date", { ascending: false });

  const scopedSalesQuery = manicuristId
    ? salesQuery.eq("bookings.manicurist_id", manicuristId)
    : // No manicurist row yet → show nothing, don't leak peers.
      salesQuery.eq("bookings.manicurist_id", "00000000-0000-0000-0000-000000000000");

  const [salesRes, customersRes, itemsRes] = await Promise.all([
    scopedSalesQuery,
    supabase
      .from("customers")
      .select("id, full_name, phone")
      .order("full_name", { ascending: true }),
    supabase
      .from("items")
      .select("id, name, price, cost, category")
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ]);

  const sales = salesRes.data ?? [];
  const customers = customersRes.data ?? [];
  const items = itemsRes.data ?? [];
  const loadedAt = new Date().toISOString();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales"
        subtitle={`${sales.length} ${sales.length === 1 ? "sale" : "sales"} on record`}
        userId={user.id}
        actions={<RefreshControl updatedAt={loadedAt} />}
      />

      {salesRes.error ? (
        <p className="text-sm text-destructive">
          Failed to load sales: {salesRes.error.message}
        </p>
      ) : (
        <SalesView sales={sales} customers={customers} items={items} />
      )}
    </div>
  );
}
