"use client";

import * as React from "react";
import Link from "next/link";
import { Calendar, DollarSign, Download, ListChecks, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type ColumnDef } from "@/components/manicurist/DataTable";
import { StatsCard } from "@/components/manicurist/StatsCard";
import { exportToCSV } from "@/lib/utils/csvExport";
import { formatMYR } from "@/lib/utils/formatPrice";
import type { Database } from "@/types/database.types";

type RecordSource = Database["public"]["Enums"]["record_source"];

type BookingRel =
  | { id: string; booking_number: string | null }
  | { id: string; booking_number: string | null }[]
  | null;

export type SalesRow = {
  id: string;
  date: string;
  gross_sales: number;
  refunds: number | null;
  discounts: number | null;
  net_sales: number | null;
  cost_of_goods: number | null;
  gross_profit: number | null;
  source: RecordSource | null;
  booking_id: string | null;
  bookings: BookingRel;
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatDate(value: string): string {
  return dateFormatter.format(new Date(`${value}T00:00:00`));
}

function pickBooking(row: SalesRow): { id: string; booking_number: string | null } | null {
  if (!row.bookings) return null;
  if (Array.isArray(row.bookings)) return row.bookings[0] ?? null;
  return row.bookings;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function SalesView({ sales }: { sales: SalesRow[] }) {
  const [sourceFilter, setSourceFilter] = React.useState<RecordSource | "all">("all");
  const [dateFrom, setDateFrom] = React.useState<string>("");
  const [dateTo, setDateTo] = React.useState<string>("");

  const filtered = React.useMemo(() => {
    return sales.filter((s) => {
      if (sourceFilter !== "all" && s.source !== sourceFilter) return false;
      if (dateFrom && s.date < dateFrom) return false;
      if (dateTo && s.date > dateTo) return false;
      return true;
    });
  }, [sales, sourceFilter, dateFrom, dateTo]);

  const summary = React.useMemo(() => {
    const totalNet = filtered.reduce(
      (sum, s) => sum + Number(s.net_sales ?? 0),
      0,
    );
    const totalProfit = filtered.reduce(
      (sum, s) => sum + Number(s.gross_profit ?? 0),
      0,
    );
    const bookingsCount = filtered.filter((s) => s.booking_id).length;
    const avg = bookingsCount === 0 ? 0 : totalNet / bookingsCount;
    return { totalNet, totalProfit, bookingsCount, avg };
  }, [filtered]);

  function handleExport() {
    const rows = filtered.map((s) => {
      const booking = pickBooking(s);
      return {
        date: s.date,
        booking_number: booking?.booking_number ?? "",
        gross_sales: Number(s.gross_sales ?? 0),
        discounts: Number(s.discounts ?? 0),
        refunds: Number(s.refunds ?? 0),
        net_sales: Number(s.net_sales ?? 0),
        cost_of_goods: Number(s.cost_of_goods ?? 0),
        gross_profit: Number(s.gross_profit ?? 0),
        source: s.source ?? "",
      };
    });
    exportToCSV(rows, `sales-${todayISO()}.csv`, [
      { key: "date", label: "Date" },
      { key: "booking_number", label: "Booking #" },
      { key: "gross_sales", label: "Gross Sales" },
      { key: "discounts", label: "Discounts" },
      { key: "refunds", label: "Refunds" },
      { key: "net_sales", label: "Net Sales" },
      { key: "cost_of_goods", label: "COGS" },
      { key: "gross_profit", label: "Gross Profit" },
      { key: "source", label: "Source" },
    ]);
  }

  const columns: ColumnDef<SalesRow>[] = [
    {
      key: "date",
      header: "Date",
      cell: (row) => formatDate(row.date),
    },
    {
      key: "booking_number",
      header: "Booking",
      cell: (row) => {
        const booking = pickBooking(row);
        if (!booking) {
          return <span className="text-xs text-muted-foreground">—</span>;
        }
        return (
          <Link
            href="/bookings"
            className="font-mono text-xs text-[#E91E63] hover:underline"
          >
            {booking.booking_number ?? booking.id.slice(0, 8)}
          </Link>
        );
      },
    },
    {
      key: "gross_sales",
      header: "Gross",
      cell: (row) => formatMYR(Number(row.gross_sales ?? 0)),
    },
    {
      key: "discounts",
      header: "Discounts",
      cell: (row) => formatMYR(Number(row.discounts ?? 0)),
    },
    {
      key: "net_sales",
      header: "Net",
      cell: (row) => (
        <span className="font-medium text-[#2D2D2D]">
          {formatMYR(Number(row.net_sales ?? 0))}
        </span>
      ),
    },
    {
      key: "cost_of_goods",
      header: "COGS",
      cell: (row) => formatMYR(Number(row.cost_of_goods ?? 0)),
    },
    {
      key: "gross_profit",
      header: "Profit",
      cell: (row) => (
        <span className="font-medium text-emerald-700">
          {formatMYR(Number(row.gross_profit ?? 0))}
        </span>
      ),
    },
    {
      key: "source",
      header: "Source",
      cell: (row) => (
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {row.source ?? "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Net Sales"
          value={formatMYR(summary.totalNet)}
          icon={DollarSign}
        />
        <StatsCard
          label="Gross Profit"
          value={formatMYR(summary.totalProfit)}
          icon={TrendingUp}
        />
        <StatsCard
          label="Bookings"
          value={summary.bookingsCount}
          icon={ListChecks}
        />
        <StatsCard
          label="Average Booking"
          value={formatMYR(summary.avg)}
          icon={Calendar}
        />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-[#F8BBD0] bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Source</label>
            <Select
              value={sourceFilter}
              onValueChange={(v) => setSourceFilter(v as RecordSource | "all")}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">From</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">To</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40"
            />
          </div>

          {(sourceFilter !== "all" || dateFrom || dateTo) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSourceFilter("all");
                setDateFrom("");
                setDateTo("");
              }}
            >
              Reset
            </Button>
          )}
        </div>

        <Button type="button" variant="secondary" onClick={handleExport}>
          <Download />
          Export CSV
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {sales.length} sales rows
      </p>

      <DataTable<SalesRow>
        columns={columns}
        data={filtered}
        emptyMessage="No sales match the current filters"
      />
    </div>
  );
}
