"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/manicurist/DataTable";
import { cn } from "@/lib/utils";
import { formatMYR } from "@/lib/utils/formatPrice";
import type { Tables } from "@/types/database.types";

type Item = Tables<"items">;

function CategoryBadge({ category }: { category: Item["category"] }) {
  const isPackage = category === "package";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        isPackage
          ? "bg-[#E91E63] text-white"
          : "bg-[#F8BBD0] text-[#C2185B] ring-1 ring-[#F8BBD0]",
      )}
    >
      {isPackage ? "Package" : "Add-on"}
    </span>
  );
}

function ActiveBadge({ isActive }: { isActive: boolean | null }) {
  const active = isActive !== false;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1",
        active
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-muted text-muted-foreground ring-border",
      )}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

const columns: ColumnDef<Item>[] = [
  {
    key: "name",
    header: "Name",
    cell: (row) => (
      <span className="font-medium text-[#2D2D2D]">{row.name}</span>
    ),
  },
  {
    key: "category",
    header: "Category",
    cell: (row) => <CategoryBadge category={row.category} />,
  },
  {
    key: "price",
    header: "Price",
    cell: (row) => formatMYR(Number(row.price ?? 0)),
  },
  {
    key: "cost",
    header: "Cost",
    cell: (row) => (
      <span className="text-muted-foreground">
        {formatMYR(Number(row.cost ?? 0))}
      </span>
    ),
  },
  {
    key: "margin",
    header: "Margin",
    cell: (row) =>
      formatMYR(Number(row.price ?? 0) - Number(row.cost ?? 0)),
  },
  {
    key: "stock",
    header: "Stock",
    cell: (row) => (row.stock == null ? "—" : row.stock),
  },
  {
    key: "duration_min",
    header: "Duration",
    cell: (row) =>
      row.duration_min == null ? "—" : `${row.duration_min} min`,
  },
  {
    key: "is_active",
    header: "Status",
    cell: (row) => <ActiveBadge isActive={row.is_active} />,
  },
];

export function ItemsTable({ items }: { items: Item[] }) {
  return (
    <DataTable<Item>
      columns={columns}
      data={items}
      searchKey="name"
      searchPlaceholder="Search by name…"
      actions={(row) => (
        <Button asChild variant="ghost" size="sm">
          <Link href={`/items/${row.id}/edit`}>
            <Pencil />
            Edit
          </Link>
        </Button>
      )}
    />
  );
}
