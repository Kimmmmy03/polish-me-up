import Link from "next/link";
import { CheckCircle2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ItemsTable } from "@/components/manicurist/ItemsTable";
import { ExportItemsButton } from "@/components/manicurist/ExportItemsButton";
import { createClient } from "@/lib/supabase/server";

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string; updated?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  const items = data ?? [];
  const packageCount = items.filter((i) => i.category === "package").length;
  const addonCount = items.filter((i) => i.category === "addon").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-[#2D2D2D]">
            Items
          </h1>
          <p className="text-muted-foreground">
            {packageCount} {packageCount === 1 ? "package" : "packages"},{" "}
            {addonCount} {addonCount === 1 ? "add-on" : "add-ons"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportItemsButton />
          <Button
            asChild
            className="bg-[#E91E63] text-white hover:bg-[#C2185B]"
          >
            <Link href="/items/new">
              <Plus />
              Add Item
            </Link>
          </Button>
        </div>
      </div>

      {params.added === "true" && (
        <div className="flex items-center gap-2 rounded-lg border border-[#F8BBD0] bg-[#FDF2F4] px-3 py-2 text-sm text-[#E91E63]">
          <CheckCircle2 className="size-4" />
          Item added successfully.
        </div>
      )}

      {params.updated === "true" && (
        <div className="flex items-center gap-2 rounded-lg border border-[#F8BBD0] bg-[#FDF2F4] px-3 py-2 text-sm text-[#E91E63]">
          <CheckCircle2 className="size-4" />
          Item updated successfully.
        </div>
      )}

      {error ? (
        <p className="text-sm text-destructive">
          Failed to load items: {error.message}
        </p>
      ) : (
        <ItemsTable items={items} />
      )}
    </div>
  );
}
