import Link from "next/link";
import { CheckCircle2, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CustomersTable } from "@/components/manicurist/CustomersTable";
import { ExportCustomersButton } from "@/components/manicurist/ExportCustomersButton";
import { createClient } from "@/lib/supabase/server";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  const customers = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-[#2D2D2D]">
            Customers
          </h1>
          <p className="text-muted-foreground">
            {customers.length} {customers.length === 1 ? "record" : "records"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportCustomersButton />
          <Button
            asChild
            className="bg-[#E91E63] text-white hover:bg-[#C2185B]"
          >
            <Link href="/customers/new">
              <UserPlus />
              Add Customer
            </Link>
          </Button>
        </div>
      </div>

      {params.added === "true" && (
        <div className="flex items-center gap-2 rounded-lg border border-[#F8BBD0] bg-[#FDF2F4] px-3 py-2 text-sm text-[#E91E63]">
          <CheckCircle2 className="size-4" />
          Customer added successfully.
        </div>
      )}

      {error ? (
        <p className="text-sm text-destructive">
          Failed to load customers: {error.message}
        </p>
      ) : (
        <CustomersTable customers={customers} />
      )}
    </div>
  );
}
