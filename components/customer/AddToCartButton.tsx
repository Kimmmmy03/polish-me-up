"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cartStore";

export function AddToCartButton({
  itemId,
  label = "Add to booking",
}: {
  itemId: string;
  label?: string;
}) {
  const addItem = useCartStore((state) => state.addItem);
  const [justAdded, setJustAdded] = useState(false);

  function handleAdd() {
    addItem(itemId);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1200);
  }

  return (
    <Button
      type="button"
      onClick={handleAdd}
      className="w-full bg-[#E91E63] text-white hover:bg-[#C2185B]"
    >
      {justAdded ? <Check /> : <Plus />}
      {justAdded ? "Added" : label}
    </Button>
  );
}
