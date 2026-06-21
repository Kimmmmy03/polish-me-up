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

  // Fetch every sale and let the client scope to "Mine" vs "All manicurists"
  // (mirrors the Bookings page). Each sale carries its booking's manicurist +
  // name so the view can filter by, and label, the owning manicurist.
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
       bookings!inner ( id, booking_number, manicurist_id, manicurists ( id, profiles ( full_name ) ) )`,
    )
    .order("date", { ascending: false });

  const [salesRes, customersRes, itemsRes] = await Promise.all([
    salesQuery,
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
        <SalesView
          sales={sales}
          customers={customers}
          items={items}
          currentManicuristId={manicuristId}
        />
      )}
    </div>
  );
}
