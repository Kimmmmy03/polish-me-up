"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  User,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  transitionBookingStatus,
  setPaymentStatus,
} from "@/app/(manicurist)/bookings/actions";
import {
  canCancel,
  nextStatus,
} from "@/lib/validations/bookingStatus.schema";
import { formatMYR } from "@/lib/utils/formatPrice";
import type { Database } from "@/types/database.types";
import type { BookingRow } from "@/components/manicurist/BookingsView";
import {
  pickCustomer,
  pickManicuristName,
} from "@/components/manicurist/BookingsView";

type BookingStatus = Database["public"]["Enums"]["booking_status"];
type PaymentStatus = Database["public"]["Enums"]["payment_status"];

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const LOCATION_LABELS: Record<
  Database["public"]["Enums"]["location_type"],
  string
> = {
  home: "Home visit",
  booth: "At the booth",
  other: "Other",
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

type DetailLine = {
  id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  name: string;
};

function normalizeLines(booking: BookingRow): DetailLine[] {
  return (booking.booking_items ?? []).map((line) => {
    const itemRel = Array.isArray(line.items) ? line.items[0] : line.items;
    return {
      id: line.id,
      quantity: Number(line.quantity ?? 0),
      unit_price: Number(line.unit_price ?? 0),
      subtotal: Number(line.subtotal ?? 0),
      name: itemRel?.name ?? "Unknown item",
    };
  });
}

export function BookingDetailDialog({
  booking,
  open,
  onOpenChange,
}: {
  booking: BookingRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [trackedId, setTrackedId] = React.useState<string | null>(
    booking?.id ?? null,
  );

  // Reset the inline error when the dialog opens a different booking.
  if (booking && booking.id !== trackedId) {
    setTrackedId(booking.id);
    setError(null);
  }

  if (!booking) return null;

  const status = (booking.status ?? "pending") as BookingStatus;
  const payment = (booking.payment_status ?? "unpaid") as PaymentStatus;
  const customer = pickCustomer(booking);
  const manicuristName = pickManicuristName(booking);
  const lines = normalizeLines(booking);
  const next = nextStatus(status);

  async function advance() {
    if (!next || !booking) return;
    setError(null);
    setPending(true);
    const result = await transitionBookingStatus({
      booking_id: booking.id,
      from: status,
      to: next,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function cancel() {
    if (!booking) return;
    setError(null);
    setPending(true);
    const result = await transitionBookingStatus({
      booking_id: booking.id,
      from: status,
      to: "cancelled",
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function changePayment(value: PaymentStatus) {
    if (!booking) return;
    setError(null);
    setPending(true);
    const result = await setPaymentStatus({
      booking_id: booking.id,
      payment_status: value,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle className="text-base">
            Booking{" "}
            <span className="font-mono text-muted-foreground">
              {booking.booking_number ?? booking.id.slice(0, 8)}
            </span>
          </DialogTitle>
          <DialogDescription>
            {dateFormatter.format(new Date(`${booking.booking_date}T00:00:00`))}
            {booking.booking_time ? ` · ${booking.booking_time.slice(0, 5)}` : ""}
            {" · "}
            {STATUS_LABELS[status]}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <section className="space-y-2 rounded-lg border border-[#F8BBD0] bg-[#FDF2F4]/40 p-3">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#E91E63]">
                <User className="size-3.5" />
                Customer
              </h3>
              <p className="font-medium text-[#2D2D2D]">
                {customer?.full_name ?? "—"}
              </p>
              {customer?.email && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail className="size-3" />
                  {customer.email}
                </p>
              )}
              {customer?.phone && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="size-3" />
                  {customer.phone}
                </p>
              )}
            </section>

            <section className="space-y-2 rounded-lg border border-[#F8BBD0] bg-[#FDF2F4]/40 p-3">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#E91E63]">
                <User className="size-3.5" />
                Manicurist
              </h3>
              <p className="font-medium text-[#2D2D2D]">{manicuristName}</p>
              <h3 className="flex items-center gap-1.5 pt-1 text-xs font-semibold uppercase tracking-wide text-[#E91E63]">
                <MapPin className="size-3.5" />
                Location
              </h3>
              <p className="text-sm text-[#2D2D2D]">
                {LOCATION_LABELS[booking.location_type]}
              </p>
              {booking.address && (
                <p className="text-xs text-muted-foreground">{booking.address}</p>
              )}
            </section>
          </div>

          {booking.notes && (
            <section className="space-y-1">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Notes
              </h3>
              <p className="text-sm text-[#2D2D2D]">{booking.notes}</p>
            </section>
          )}

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Line items
            </h3>
            <div className="overflow-hidden rounded-lg border border-[#F8BBD0]">
              <table className="w-full text-sm">
                <thead className="bg-[#FDF2F4] text-left text-xs font-medium text-[#E91E63]">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Unit price</th>
                    <th className="px-3 py-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-4 text-center text-xs text-muted-foreground"
                      >
                        No line items
                      </td>
                    </tr>
                  ) : (
                    lines.map((line) => (
                      <tr
                        key={line.id}
                        className="border-t border-[#F8BBD0]/60 text-[#2D2D2D]"
                      >
                        <td className="px-3 py-2">{line.name}</td>
                        <td className="px-3 py-2">{line.quantity}</td>
                        <td className="px-3 py-2">
                          {formatMYR(line.unit_price)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatMYR(line.subtotal)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="space-y-1 rounded-lg border border-[#F8BBD0] bg-white p-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatMYR(Number(booking.subtotal ?? 0))}</span>
              </div>
              {Number(booking.discount_amount ?? 0) > 0 && (
                <div className="flex justify-between text-[#E91E63]">
                  <span>
                    Discount{" "}
                    {booking.discount_type && booking.discount_type !== "none"
                      ? `(${booking.discount_type})`
                      : ""}
                  </span>
                  <span>−{formatMYR(Number(booking.discount_amount))}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-[#F8BBD0] pt-1 font-semibold text-[#2D2D2D]">
                <span>Total</span>
                <span>{formatMYR(Number(booking.total ?? 0))}</span>
              </div>
            </div>
          </section>

          <section className="space-y-2 rounded-lg border border-[#F8BBD0] bg-white p-3">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#E91E63]">
              <CreditCard className="size-3.5" />
              Payment
            </h3>
            <div className="flex items-center gap-2">
              <Select
                value={payment}
                onValueChange={(v) => changePayment(v as PaymentStatus)}
                disabled={pending}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">
                Current: {payment}
              </span>
            </div>
          </section>

          {error && (
            <p className="rounded-md bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="!flex !flex-row !justify-between gap-2">
          <Button
            type="button"
            variant="destructive"
            onClick={cancel}
            disabled={pending || !canCancel(status)}
          >
            <X />
            Cancel booking
          </Button>
          <Button
            type="button"
            onClick={advance}
            disabled={pending || !next}
            className="bg-[#E91E63] text-white hover:bg-[#C2185B]"
          >
            <ArrowRight />
            {next
              ? `Advance to ${STATUS_LABELS[next]}`
              : status === "completed"
                ? "Already completed"
                : "No further transitions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
