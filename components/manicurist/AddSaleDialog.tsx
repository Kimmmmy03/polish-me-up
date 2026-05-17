"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  TypeaheadCombobox,
  type TypeaheadOption,
  type TypeaheadValue,
} from "@/components/manicurist/TypeaheadCombobox";
import { formatMYR } from "@/lib/utils/formatPrice";
import { createManualSale } from "@/app/(manicurist)/sales/actions";

export type CustomerOption = {
  id: string;
  full_name: string;
  phone: string | null;
};

export type ItemOption = {
  id: string;
  name: string;
  price: number;
  cost: number | null;
  category: string;
};

type Line = {
  key: string;
  selection: TypeaheadValue;
  quantity: number;
  unit_price: number;
  cost: number; // only used when selection.kind === "new"
};

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function generateBookingNumber(): string {
  const year = new Date().getFullYear();
  const suffix = String(Date.now()).slice(-4);
  return `PMU-${year}-${suffix}`;
}

function nextKey(): string {
  return Math.random().toString(36).slice(2, 9);
}

function makeEmptyLine(): Line {
  return { key: nextKey(), selection: null, quantity: 1, unit_price: 0, cost: 0 };
}

export function AddSaleDialog({
  customers,
  items,
}: {
  customers: CustomerOption[];
  items: ItemOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const [bookingNumber, setBookingNumber] = React.useState(generateBookingNumber());
  const [date, setDate] = React.useState(todayISO());
  const [customer, setCustomer] = React.useState<TypeaheadValue>(null);
  const [lines, setLines] = React.useState<Line[]>([makeEmptyLine()]);
  const [discountMode, setDiscountMode] = React.useState<"amount" | "percent">(
    "amount",
  );
  const [discountAmount, setDiscountAmount] = React.useState<number>(0);
  const [discountPercent, setDiscountPercent] = React.useState<number>(0);
  const [refunds, setRefunds] = React.useState<number>(0);
  const [notes, setNotes] = React.useState("");

  const itemById = React.useMemo(
    () => new Map(items.map((i) => [i.id, i])),
    [items],
  );

  const customerOptions: TypeaheadOption[] = React.useMemo(
    () =>
      customers.map((c) => ({
        id: c.id,
        label: c.full_name,
        hint: c.phone ?? undefined,
      })),
    [customers],
  );
  const itemOptions: TypeaheadOption[] = React.useMemo(
    () =>
      items.map((i) => ({
        id: i.id,
        label: i.name,
        hint: formatMYR(Number(i.price)),
      })),
    [items],
  );

  React.useEffect(() => {
    if (!open) return;
    setBookingNumber(generateBookingNumber());
    setDate(todayISO());
    setCustomer(null);
    setLines([makeEmptyLine()]);
    setDiscountMode("amount");
    setDiscountAmount(0);
    setDiscountPercent(0);
    setRefunds(0);
    setNotes("");
    setError(null);
  }, [open]);

  const subtotal = lines.reduce(
    (sum, l) => sum + l.unit_price * l.quantity,
    0,
  );
  const effectiveDiscountAmount =
    discountMode === "percent"
      ? Math.round(subtotal * (discountPercent / 100) * 100) / 100
      : discountAmount;
  const total = Math.max(0, subtotal - effectiveDiscountAmount);
  const cogs = lines.reduce((sum, l) => {
    if (l.selection?.kind === "existing") {
      const item = itemById.get(l.selection.id);
      return sum + Number(item?.cost ?? 0) * l.quantity;
    }
    if (l.selection?.kind === "new") {
      return sum + l.cost * l.quantity;
    }
    return sum;
  }, 0);

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    );
  }

  function setLineSelection(key: string, sel: TypeaheadValue) {
    // When the user picks an existing item, autofill its unit price.
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        if (sel?.kind === "existing") {
          const item = itemById.get(sel.id);
          return {
            ...l,
            selection: sel,
            unit_price: item ? Number(item.price) : l.unit_price,
            cost: 0,
          };
        }
        return { ...l, selection: sel };
      }),
    );
  }

  function addLine() {
    setLines((prev) => [...prev, makeEmptyLine()]);
  }

  function removeLine(key: string) {
    setLines((prev) =>
      prev.length === 1 ? prev : prev.filter((l) => l.key !== key),
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!customer) {
      setError("Pick or type a customer.");
      return;
    }
    if (lines.some((l) => !l.selection)) {
      setError("Every line needs an item.");
      return;
    }

    const payload = {
      booking_number: bookingNumber.trim(),
      date,
      customer:
        customer.kind === "existing"
          ? ({ kind: "existing", id: customer.id } as const)
          : ({ kind: "new", name: customer.name } as const),
      lines: lines.map((l) => ({
        item:
          l.selection!.kind === "existing"
            ? ({ kind: "existing", id: l.selection!.id } as const)
            : ({
                kind: "new",
                name: l.selection!.name,
                cost: l.cost > 0 ? l.cost : undefined,
              } as const),
        quantity: l.quantity,
        unit_price: l.unit_price,
      })),
      discount_amount: effectiveDiscountAmount,
      refunds,
      notes: notes.trim() || undefined,
    };

    startTransition(async () => {
      const res = await createManualSale(payload);
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-[#EC4899] to-[#DB2777] text-white">
          <Plus className="size-4" />
          Add sale
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record a sale</DialogTitle>
          <DialogDescription>
            Creates a completed walk-in booking and a linked sale entry. Pick from
            the catalog or type a new customer / item.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={onSubmit}
          className="max-h-[70vh] space-y-4 overflow-y-auto px-1"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="booking_number">Booking number</Label>
              <div className="flex gap-2">
                <Input
                  id="booking_number"
                  value={bookingNumber}
                  onChange={(e) => setBookingNumber(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBookingNumber(generateBookingNumber())}
                  className="shrink-0"
                  title="Regenerate"
                >
                  ↻
                </Button>
              </div>
              <p className="text-[11px] text-[#5C2D48]/60">
                Auto-generated, editable.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sale_date">Date</Label>
              <Input
                id="sale_date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="customer">Customer</Label>
            <TypeaheadCombobox
              inputId="customer"
              options={customerOptions}
              value={customer}
              onChange={setCustomer}
              placeholder="Search or type a new customer"
              emptyHint="New customer — will be added"
            />
            {customer?.kind === "new" && (
              <p className="text-[11px] text-[#BE185D]">
                Will create a new customer named &ldquo;{customer.name}&rdquo;.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Line items</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addLine}
              >
                <Plus className="size-3.5" />
                Add line
              </Button>
            </div>
            <div className="space-y-2">
              {lines.map((line) => {
                const isNew = line.selection?.kind === "new";
                const existing =
                  line.selection?.kind === "existing"
                    ? itemById.get(line.selection.id)
                    : undefined;
                return (
                  <div
                    key={line.key}
                    className="grid grid-cols-12 gap-2 rounded-lg border border-[#F8BBD0]/60 bg-white/60 p-2"
                  >
                    <div className="col-span-12 sm:col-span-6">
                      <TypeaheadCombobox
                        options={itemOptions}
                        value={line.selection}
                        onChange={(v) => setLineSelection(line.key, v)}
                        placeholder="Search or type a new item"
                        emptyHint="New item — will be added (inactive)"
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-2">
                      <Input
                        type="number"
                        min={1}
                        max={99}
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(line.key, {
                            quantity: Math.max(1, Number(e.target.value || 1)),
                          })
                        }
                        aria-label="Quantity"
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-3">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.unit_price}
                        onChange={(e) =>
                          updateLine(line.key, {
                            unit_price: Math.max(0, Number(e.target.value || 0)),
                          })
                        }
                        aria-label="Unit price"
                        placeholder="Unit price"
                      />
                    </div>
                    <div className="col-span-3 flex items-center justify-end sm:col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeLine(line.key)}
                        disabled={lines.length === 1}
                        aria-label="Remove line"
                      >
                        <Trash2 className="size-4 text-[#BE185D]" />
                      </Button>
                    </div>
                    {existing?.cost != null && (
                      <p className="col-span-12 text-[11px] text-[#5C2D48]/60">
                        Cost per unit: {formatMYR(Number(existing.cost))}
                      </p>
                    )}
                    {isNew && (
                      <div className="col-span-12 grid grid-cols-12 items-center gap-2">
                        <Label
                          htmlFor={`line_cost_${line.key}`}
                          className="col-span-5 text-[11px] text-[#5C2D48]/70 sm:col-span-3"
                        >
                          Cost per unit (optional)
                        </Label>
                        <Input
                          id={`line_cost_${line.key}`}
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.cost}
                          onChange={(e) =>
                            updateLine(line.key, {
                              cost: Math.max(0, Number(e.target.value || 0)),
                            })
                          }
                          className="col-span-7 sm:col-span-3"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="discount_mode">Discount as</Label>
              <Select
                value={discountMode}
                onValueChange={(v) => setDiscountMode(v as "amount" | "percent")}
              >
                <SelectTrigger id="discount_mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount">RM amount</SelectItem>
                  <SelectItem value="percent">Percent of subtotal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {discountMode === "amount" ? (
              <div className="space-y-1.5">
                <Label htmlFor="discount_amount">Discount (RM)</Label>
                <Input
                  id="discount_amount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={discountAmount}
                  onChange={(e) =>
                    setDiscountAmount(Math.max(0, Number(e.target.value || 0)))
                  }
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="discount_percent">Discount (%)</Label>
                <Input
                  id="discount_percent"
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  value={discountPercent}
                  onChange={(e) =>
                    setDiscountPercent(
                      Math.min(100, Math.max(0, Number(e.target.value || 0))),
                    )
                  }
                />
                <p className="text-[11px] text-[#5C2D48]/60">
                  = {formatMYR(effectiveDiscountAmount)}
                </p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="refunds">Refunds (RM)</Label>
              <Input
                id="refunds"
                type="number"
                min={0}
                step="0.01"
                value={refunds}
                onChange={(e) =>
                  setRefunds(Math.max(0, Number(e.target.value || 0)))
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sale_notes">Notes</Label>
            <Textarea
              id="sale_notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional internal notes"
            />
          </div>

          <div className="rounded-lg bg-[#FFF5F8] p-3 text-sm">
            <div className="grid grid-cols-2 gap-y-1">
              <span className="text-[#5C2D48]">Subtotal</span>
              <span className="text-right font-medium">{formatMYR(subtotal)}</span>
              <span className="text-[#5C2D48]">Discount</span>
              <span className="text-right font-medium">
                − {formatMYR(effectiveDiscountAmount)}
              </span>
              <span className="text-[#5C2D48]">COGS</span>
              <span className="text-right font-medium">{formatMYR(cogs)}</span>
              <span className="text-base font-semibold text-[#3D1A2A]">Total</span>
              <span className="text-right text-base font-semibold text-[#3D1A2A]">
                {formatMYR(total)}
              </span>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-700">{error}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="bg-gradient-to-r from-[#EC4899] to-[#DB2777] text-white"
            >
              {pending ? "Saving…" : "Save sale"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
