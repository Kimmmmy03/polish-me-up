import { Calendar, DollarSign, Star, Users } from "lucide-react";

import { StatsCard } from "@/components/manicurist/StatsCard";
import { createClient } from "@/lib/supabase/server";
import { formatMYR } from "@/lib/utils/formatPrice";
import type { Database } from "@/types/database.types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: "bg-gray-100 text-gray-700 ring-gray-200",
  confirmed: "bg-[#FDF2F4] text-[#E91E63] ring-[#F8BBD0]",
  in_progress: "bg-[#FDF2F4] text-[#E91E63] ring-[#F8BBD0]",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
};

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function monthBounds(now: Date) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return { start: toISODate(start), end: toISODate(end) };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const now = new Date();
  const { start: monthStart, end: monthEnd } = monthBounds(now);
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setUTCDate(ninetyDaysAgo.getUTCDate() - 90);
  const ninetyDaysAgoISO = toISODate(ninetyDaysAgo);

  const [
    customersRes,
    bookingsThisMonthRes,
    revenueRowsRes,
    topPackageRowsRes,
    recentBookingsRes,
  ] = await Promise.all([
    supabase.from("customers").select("*", { count: "exact", head: true }),
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .gte("booking_date", monthStart)
      .lte("booking_date", monthEnd),
    supabase
      .from("bookings")
      .select("total")
      .eq("status", "completed")
      .gte("booking_date", monthStart)
      .lte("booking_date", monthEnd),
    supabase
      .from("booking_items")
      .select(
        "quantity, items!inner(name, category), bookings!inner(booking_date)",
      )
      .eq("items.category", "package")
      .gte("bookings.booking_date", ninetyDaysAgoISO),
    supabase
      .from("bookings")
      .select(
        "id, booking_number, booking_date, total, status, customers(full_name), booking_items(id)",
      )
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const customersCount = customersRes.count ?? 0;
  const bookingsThisMonth = bookingsThisMonthRes.count ?? 0;
  const revenueThisMonth = (revenueRowsRes.data ?? []).reduce(
    (sum, r) => sum + Number(r.total ?? 0),
    0,
  );

  type TopRow = {
    quantity: number;
    items: { name: string } | { name: string }[] | null;
  };
  const tally = new Map<string, number>();
  for (const r of (topPackageRowsRes.data ?? []) as TopRow[]) {
    const itemRel = Array.isArray(r.items) ? r.items[0] : r.items;
    const name = itemRel?.name;
    if (!name) continue;
    tally.set(name, (tally.get(name) ?? 0) + Number(r.quantity ?? 0));
  }
  let topPackageName = "—";
  let topPackageCount = 0;
  for (const [name, count] of tally) {
    if (count > topPackageCount) {
      topPackageName = name;
      topPackageCount = count;
    }
  }

  type RecentBooking = {
    id: string;
    booking_number: string | null;
    booking_date: string;
    total: number;
    status: BookingStatus | null;
    customers: { full_name: string } | { full_name: string }[] | null;
    booking_items: { id: string }[] | null;
  };
  const recentBookings = (recentBookingsRes.data ?? []) as RecentBooking[];

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-[#2D2D2D]">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          At-a-glance view of your business
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Total Customers"
          value={customersCount}
          icon={Users}
        />
        <StatsCard
          label="Bookings This Month"
          value={bookingsThisMonth}
          icon={Calendar}
        />
        <StatsCard
          label="Revenue This Month"
          value={formatMYR(revenueThisMonth)}
          icon={DollarSign}
        />
        <StatsCard
          label="Top Package"
          value={topPackageName}
          icon={Star}
          subtext={
            topPackageCount > 0
              ? `${topPackageCount} ${topPackageCount === 1 ? "booking" : "bookings"} (last 90 days)`
              : "Last 90 days"
          }
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#2D2D2D]">
          Recent Bookings
        </h2>
        {recentBookings.length === 0 ? (
          <div className="rounded-2xl border border-[#F8BBD0] bg-white p-8 text-center text-sm text-muted-foreground">
            No bookings yet
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#F8BBD0] bg-white">
            <table className="w-full text-sm">
              <thead className="bg-[#FDF2F4] text-left text-xs font-medium uppercase tracking-wider text-[#E91E63]">
                <tr>
                  <th className="px-4 py-3">Booking</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b) => {
                  const cust = Array.isArray(b.customers)
                    ? b.customers[0]
                    : b.customers;
                  const itemsCount = b.booking_items?.length ?? 0;
                  const status = (b.status ?? "pending") as BookingStatus;
                  return (
                    <tr
                      key={b.id}
                      className="border-t border-[#F8BBD0]/60 text-[#2D2D2D]"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {b.booking_number ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {dateFormatter.format(
                          new Date(`${b.booking_date}T00:00:00`),
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {cust?.full_name ?? "—"}
                      </td>
                      <td className="px-4 py-3">{itemsCount}</td>
                      <td className="px-4 py-3 font-medium">
                        {formatMYR(Number(b.total))}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${STATUS_STYLES[status]}`}
                        >
                          {STATUS_LABELS[status]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
