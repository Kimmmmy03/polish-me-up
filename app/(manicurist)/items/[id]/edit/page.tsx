import { notFound } from "next/navigation";

import { EditItemForm } from "@/components/manicurist/EditItemForm";
import { createClient } from "@/lib/supabase/server";

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: item, error } = await supabase
    .from("items")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !item) {
    notFound();
  }

  return <EditItemForm item={item} />;
}
