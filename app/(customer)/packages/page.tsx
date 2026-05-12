import { Clock, Sparkles, Plus as PlusIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AddToCartButton } from "@/components/customer/AddToCartButton";
import { createClient } from "@/lib/supabase/server";
import { formatMYR } from "@/lib/utils/formatPrice";
import type { Tables } from "@/types/database.types";

type Item = Pick<
  Tables<"items">,
  "id" | "name" | "description" | "price" | "duration_min" | "category"
>;

function ItemCard({
  item,
  variant,
}: {
  item: Item;
  variant: "package" | "addon";
}) {
  const isPackage = variant === "package";
  return (
    <Card className="bg-white">
      {isPackage ? (
        <div className="flex h-32 items-center justify-center bg-[#F8BBD0]/40">
          <Sparkles className="size-10 text-[#E91E63]" />
        </div>
      ) : (
        <div className="flex h-16 items-center justify-center bg-[#FDF2F4]">
          <PlusIcon className="size-6 text-[#E91E63]" />
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-[#2D2D2D]">{item.name}</CardTitle>
        {item.description && (
          <CardDescription>{item.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <p
          className={
            isPackage
              ? "text-2xl font-semibold text-[#E91E63]"
              : "text-lg font-semibold text-[#E91E63]"
          }
        >
          {formatMYR(Number(item.price))}
        </p>
        {item.duration_min != null && (
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            {item.duration_min} min
          </p>
        )}
      </CardContent>
      <CardFooter>
        <AddToCartButton itemId={item.id} />
      </CardFooter>
    </Card>
  );
}

export default async function PackagesPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("items")
    .select("id, name, description, price, duration_min, category")
    .eq("is_active", true)
    .order("price", { ascending: true });

  if (error) {
    return (
      <p className="text-sm text-destructive">
        Failed to load packages: {error.message}
      </p>
    );
  }

  const items = data ?? [];
  const packages = items.filter((item) => item.category === "package");
  const addons = items.filter((item) => item.category === "addon");

  return (
    <div className="space-y-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-[#E91E63] md:text-4xl">
          Our menu
        </h1>
        <p className="text-muted-foreground">
          Pick a package, add any extras, and head to checkout when you&apos;re
          ready.
        </p>
      </header>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold tracking-tight text-[#2D2D2D]">
          Packages
        </h2>
        {packages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No packages available right now. Please check back soon.
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {packages.map((pkg) => (
              <ItemCard key={pkg.id} item={pkg} variant="package" />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[#2D2D2D]">
            Add-ons
          </h2>
          <p className="text-sm text-muted-foreground">
            Optional extras to pair with your package.
          </p>
        </div>
        {addons.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No add-ons available right now.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {addons.map((addon) => (
              <ItemCard key={addon.id} item={addon} variant="addon" />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
