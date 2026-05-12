"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  ShoppingBag,
  Trash2,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCartStore } from "@/store/cartStore";
import { createClient } from "@/lib/supabase/client";
import { calculateDiscount } from "@/lib/utils/calculateDiscount";
import { formatMYR } from "@/lib/utils/formatPrice";
import {
  bookingSystemSchema,
  type BookingSystemInput,
} from "@/lib/validations/booking.schema";
import type { Tables } from "@/types/database.types";

type CartItem = Pick<
  Tables<"items">,
  "id" | "name" | "price" | "category" | "duration_min"
>;

type ManicuristOption = {
  id: string;
  rating: number | null;
  full_name: string;
};

const TIME_SLOTS: string[] = (() => {
  const slots: string[] = [];
  for (let h = 9; h <= 19; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 19 && m > 0) break;
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
})();

function isoFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function defaultDate(): Date {
  const d = startOfToday();
  d.setDate(d.getDate() + 1);
  return d;
}

function makeBookingNumber(): string {
  const year = new Date().getFullYear();
  const suffix = String(Date.now()).slice(-4);
  return `PMU-${year}-${suffix}`;
}

export default function OrderPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const cartLines = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);

  const hydrated = useSyncExternalStore(
    useCartStore.persist.onFinishHydration,
    () => useCartStore.persist.hasHydrated(),
    () => false,
  );

  const [items, setItems] = useState<Map<string, CartItem>>(new Map());
  const [manicurists, setManicurists] = useState<ManicuristOption[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [profileIsStudent, setProfileIsStudent] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<BookingSystemInput>({
    resolver: zodResolver(bookingSystemSchema),
    defaultValues: {
      customer_id: "",
      manicurist_id: "",
      booking_date: isoFromDate(defaultDate()),
      booking_time: "10:00",
      location_type: "booth",
      address: "",
      notes: "",
      is_student: false,
      items: [],
    },
  });

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      setBootstrapping(true);
      setBootstrapError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setBootstrapError("You need to be signed in.");
        return;
      }

      const [itemsRes, manicuristsRes, profileRes, customerRes] =
        await Promise.all([
          supabase
            .from("items")
            .select("id, name, price, category, duration_min")
            .eq("is_active", true),
          supabase
            .from("manicurists")
            .select("id, rating, profiles!inner(full_name)")
            .eq("is_active", true),
          supabase
            .from("profiles")
            .select("full_name, email, phone, is_student")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("customers")
            .select("id")
            .eq("profile_id", user.id)
            .maybeSingle(),
        ]);

      if (cancelled) return;

      if (itemsRes.error) {
        setBootstrapError(itemsRes.error.message);
        return;
      }
      if (manicuristsRes.error) {
        setBootstrapError(manicuristsRes.error.message);
        return;
      }

      const itemMap = new Map<string, CartItem>();
      for (const item of itemsRes.data ?? []) {
        itemMap.set(item.id, item);
      }
      setItems(itemMap);

      type ManicuristRow = {
        id: string;
        rating: number | null;
        profiles: { full_name: string | null } | { full_name: string | null }[];
      };
      const manicuristRows = (manicuristsRes.data ?? []) as ManicuristRow[];
      const opts: ManicuristOption[] = manicuristRows.map((row) => {
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        return {
          id: row.id,
          rating: row.rating,
          full_name: profile?.full_name ?? "Unnamed manicurist",
        };
      });
      setManicurists(opts);

      const profile = profileRes.data;
      setProfileIsStudent(profile?.is_student ?? false);
      form.setValue("is_student", profile?.is_student ?? false);

      let resolvedCustomerId = customerRes.data?.id ?? null;
      if (!resolvedCustomerId) {
        const { data: inserted, error: insertErr } = await supabase
          .from("customers")
          .insert({
            profile_id: user.id,
            full_name: profile?.full_name ?? user.email ?? "Customer",
            email: profile?.email ?? user.email ?? null,
            phone: profile?.phone ?? null,
            is_student: profile?.is_student ?? false,
            source: "system",
          })
          .select("id")
          .single();
        if (insertErr) {
          setBootstrapError(`Could not create customer record: ${insertErr.message}`);
          return;
        }
        resolvedCustomerId = inserted.id;
      }
      setCustomerId(resolvedCustomerId);
      form.setValue("customer_id", resolvedCustomerId);
      setBootstrapping(false);
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [supabase, form]);

  const locationType = useWatch({ control: form.control, name: "location_type" });
  const isStudent = useWatch({ control: form.control, name: "is_student" });
  const dateValueWatched = useWatch({ control: form.control, name: "booking_date" });

  const pricingLines = useMemo(() => {
    return cartLines
      .map((line) => {
        const item = items.get(line.itemId);
        if (!item) return null;
        return {
          item: { id: item.id, price: Number(item.price) },
          quantity: line.quantity,
        };
      })
      .filter((x): x is { item: { id: string; price: number }; quantity: number } => x !== null);
  }, [cartLines, items]);

  const pricing = useMemo(
    () => calculateDiscount({ lines: pricingLines, isStudent }),
    [pricingLines, isStudent],
  );

  // Sync items array into form whenever cart changes (so Zod validation has them).
  useEffect(() => {
    form.setValue(
      "items",
      cartLines
        .filter((l) => items.has(l.itemId))
        .map((l) => ({ item_id: l.itemId, quantity: l.quantity })),
      { shouldValidate: false },
    );
  }, [cartLines, items, form]);

  async function onSubmit(values: BookingSystemInput) {
    setSubmitError(null);

    // TODO: re-calculate price server-side using calculateDiscount before insert.
    // For MVP we trust the client total because RLS + the snapshot unit_price
    // on each booking_items row gives us auditability. Move this into a Route
    // Handler / Server Action when we add payments.
    const serverPricing = calculateDiscount({
      lines: pricingLines,
      isStudent: values.is_student,
    });

    if (!customerId) {
      setSubmitError("Customer record is not ready yet. Try again.");
      return;
    }

    const bookingNumber = makeBookingNumber();

    const { data: bookingInsert, error: bookingErr } = await supabase
      .from("bookings")
      .insert({
        booking_number: bookingNumber,
        customer_id: customerId,
        manicurist_id: values.manicurist_id,
        booking_date: values.booking_date,
        booking_time: values.booking_time,
        location_type: values.location_type,
        address: values.address?.trim() || null,
        notes: values.notes?.trim() || null,
        subtotal: serverPricing.subtotal,
        discount_amount: serverPricing.discountAmount,
        discount_type: serverPricing.discountType,
        total: serverPricing.total,
        status: "pending",
        payment_status: "unpaid",
        source: "system",
      })
      .select("id")
      .single();

    if (bookingErr || !bookingInsert) {
      setSubmitError(bookingErr?.message ?? "Could not create booking.");
      return;
    }

    const bookingId = bookingInsert.id;

    const itemRows = values.items.map((line) => {
      const itemRecord = items.get(line.item_id);
      const unitPrice = Number(itemRecord?.price ?? 0);
      return {
        booking_id: bookingId,
        item_id: line.item_id,
        quantity: line.quantity,
        unit_price: unitPrice,
        subtotal: Math.round(unitPrice * line.quantity * 100) / 100,
      };
    });

    const { error: itemsErr } = await supabase
      .from("booking_items")
      .insert(itemRows);

    if (itemsErr) {
      setSubmitError(`Booking saved but items failed: ${itemsErr.message}`);
      return;
    }

    // Update customer aggregates.
    const { data: existing } = await supabase
      .from("customers")
      .select("total_visits, total_spent, first_visit")
      .eq("id", customerId)
      .single();

    const today = isoFromDate(new Date());
    await supabase
      .from("customers")
      .update({
        total_visits: (existing?.total_visits ?? 0) + 1,
        total_spent: Number(existing?.total_spent ?? 0) + serverPricing.total,
        last_visit: today,
        first_visit: existing?.first_visit ?? today,
      })
      .eq("id", customerId);

    clearCart();
    router.push(`/confirm/${bookingId}`);
  }

  if (!hydrated) {
    return (
      <p className="text-sm text-muted-foreground">Loading your cart…</p>
    );
  }

  if (cartLines.length === 0) {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-2xl bg-white p-8 text-center ring-1 ring-[#F8BBD0]">
        <div className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-[#FDF2F4] text-[#E91E63]">
          <ShoppingBag className="size-6" />
        </div>
        <h1 className="text-xl font-semibold text-[#2D2D2D]">
          Your cart is empty
        </h1>
        <p className="text-sm text-muted-foreground">
          Browse our packages and add a treatment to get started.
        </p>
        <Button
          asChild
          className="bg-[#E91E63] text-white hover:bg-[#C2185B]"
        >
          <Link href="/packages">Browse packages</Link>
        </Button>
      </div>
    );
  }

  if (bootstrapError) {
    return (
      <p className="text-sm text-destructive">{bootstrapError}</p>
    );
  }

  const noManicurists = !bootstrapping && manicurists.length === 0;
  const dateAsObj = dateValueWatched
    ? new Date(`${dateValueWatched}T00:00:00`)
    : undefined;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href="/packages"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-[#E91E63]"
        >
          <ArrowLeft className="size-4" />
          Back to packages
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-[#E91E63] md:text-4xl">
          Confirm your booking
        </h1>
        <p className="text-muted-foreground">
          Pick a date, time, and manicurist — we&apos;ll confirm by message.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5 rounded-2xl border border-[#F8BBD0] bg-white p-6"
          >
            <FormField
              control={form.control}
              name="booking_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="inline-flex items-center gap-2">
                    <CalendarIcon className="size-4 text-[#E91E63]" />
                    Date
                  </FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start font-normal"
                      >
                        {dateAsObj
                          ? format(dateAsObj, "EEEE, d MMMM yyyy")
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateAsObj}
                        onSelect={(d) => {
                          if (d) field.onChange(isoFromDate(d));
                        }}
                        disabled={{ before: startOfToday() }}
                        autoFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="booking_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="inline-flex items-center gap-2">
                    <Clock className="size-4 text-[#E91E63]" />
                    Time
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pick a time" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-64">
                      {TIME_SLOTS.map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="manicurist_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="inline-flex items-center gap-2">
                    <User className="size-4 text-[#E91E63]" />
                    Manicurist
                  </FormLabel>
                  {noManicurists ? (
                    <p className="rounded-md border border-dashed border-[#F8BBD0] bg-[#FDF2F4] p-3 text-sm text-[#2D2D2D]">
                      No manicurists are available right now. Please ask an
                      admin to add one in the dashboard before booking.
                    </p>
                  ) : (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={bootstrapping}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              bootstrapping
                                ? "Loading…"
                                : "Pick a manicurist"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {manicurists.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.full_name}
                            {m.rating != null
                              ? ` — ★ ${Number(m.rating).toFixed(1)}`
                              : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="inline-flex items-center gap-2">
                    <MapPin className="size-4 text-[#E91E63]" />
                    Location
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a location" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="home">Home visit</SelectItem>
                      <SelectItem value="booth">At our booth</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(locationType === "home" || locationType === "other") && (
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {locationType === "home"
                        ? "Home address"
                        : "Address / details"}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder={
                          locationType === "home"
                            ? "Street, unit, area"
                            : "Where should we meet?"
                        }
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="Allergies, preferences, anything we should know"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_student"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2">
                  <FormControl>
                    <Input
                      type="checkbox"
                      checked={!!field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="h-4 w-4 rounded border-input accent-[#E91E63]"
                    />
                  </FormControl>
                  <FormLabel className="!mt-0 font-normal">
                    I&apos;m a student (10% off)
                    {profileIsStudent && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        from your profile
                      </span>
                    )}
                  </FormLabel>
                </FormItem>
              )}
            />

            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full bg-[#E91E63] text-white hover:bg-[#C2185B]"
              disabled={
                form.formState.isSubmitting ||
                bootstrapping ||
                noManicurists ||
                pricingLines.length === 0 ||
                !customerId
              }
            >
              {form.formState.isSubmitting
                ? "Booking…"
                : `Confirm booking — ${formatMYR(pricing.total)}`}
            </Button>
          </form>
        </Form>

        <aside className="h-fit space-y-4 rounded-2xl border border-[#F8BBD0] bg-white p-6 lg:sticky lg:top-6">
          <h2 className="text-lg font-semibold text-[#2D2D2D]">Your cart</h2>
          <ul className="space-y-3">
            {cartLines.map((line) => {
              const item = items.get(line.itemId);
              if (!item) {
                return (
                  <li
                    key={line.itemId}
                    className="flex items-center justify-between text-xs text-muted-foreground"
                  >
                    <span>Unavailable item</span>
                    <button
                      type="button"
                      onClick={() => removeItem(line.itemId)}
                      aria-label="Remove"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                );
              }
              const lineTotal = Number(item.price) * line.quantity;
              return (
                <li
                  key={line.itemId}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-[#2D2D2D]">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatMYR(Number(item.price))} × {line.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#2D2D2D]">
                      {formatMYR(lineTotal)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(line.itemId)}
                      aria-label={`Remove ${item.name}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="space-y-1.5 border-t border-[#F8BBD0] pt-4 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatMYR(pricing.subtotal)}</span>
            </div>
            {pricing.discountType === "student" && (
              <div className="flex justify-between text-[#E91E63]">
                <span>Student discount (10%)</span>
                <span>−{formatMYR(pricing.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-[#F8BBD0] pt-2 text-base font-semibold text-[#2D2D2D]">
              <span>Total</span>
              <span>{formatMYR(pricing.total)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
