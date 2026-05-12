"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
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
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { itemSchema, type ItemInput } from "@/lib/validations/item.schema";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";

type Item = Tables<"items">;

export function EditItemForm({ item }: { item: Item }) {
  const router = useRouter();
  const supabase = createClient();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<ItemInput>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: item.name,
      category: item.category,
      description: item.description ?? "",
      price: Number(item.price),
      cost: Number(item.cost ?? 0),
      stock: item.stock ?? null,
      duration_min: item.duration_min ?? null,
      is_active: item.is_active ?? true,
      photo_url: item.photo_url ?? "",
    },
  });

  async function onSubmit(values: ItemInput) {
    setSubmitError(null);

    const { error } = await supabase
      .from("items")
      .update({
        name: values.name,
        category: values.category,
        description: values.description ?? null,
        price: values.price,
        cost: values.cost,
        stock: values.stock ?? null,
        duration_min: values.duration_min ?? null,
        is_active: values.is_active,
        photo_url: values.photo_url ?? null,
      })
      .eq("id", item.id);

    if (error) {
      setSubmitError(error.message);
      return;
    }

    router.refresh();
    router.push("/items?updated=true");
  }

  async function handleDelete() {
    setDeleteError(null);
    setIsDeleting(true);

    const { error } = await supabase
      .from("items")
      .update({ is_active: false })
      .eq("id", item.id);

    setIsDeleting(false);

    if (error) {
      setDeleteError(error.message);
      return;
    }

    router.refresh();
    router.push("/items");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <Link
          href="/items"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-[#E91E63]"
        >
          <ArrowLeft className="size-4" />
          Back to items
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-[#2D2D2D]">
          Edit Item
        </h1>
        <p className="text-muted-foreground">
          Update the details of this {item.category === "package" ? "package" : "add-on"}.
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-5 rounded-xl border border-[#F8BBD0] bg-white p-6"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="package">Package</SelectItem>
                    <SelectItem value="addon">Add-on</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="What's included?"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price (MYR)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      {...field}
                      value={field.value ?? 0}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? 0 : Number(e.target.value),
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost (MYR)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      {...field}
                      value={field.value ?? 0}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? 0 : Number(e.target.value),
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stock</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Leave blank for services.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="duration_min"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (min)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="photo_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Photo URL</FormLabel>
                <FormControl>
                  <Input
                    type="url"
                    placeholder="https://…"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormDescription>
                  Paste image URL (Supabase Storage upload coming later).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-2">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={!!field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-[#E91E63]"
                  />
                </FormControl>
                <FormLabel className="!mt-0 font-normal">
                  Active (available for booking)
                </FormLabel>
              </FormItem>
            )}
          />

          {submitError && (
            <p className="text-sm text-destructive">{submitError}</p>
          )}

          <div className="flex items-center justify-between gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" variant="destructive">
                  <Trash2 />
                  Delete
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete this item?</DialogTitle>
                  <DialogDescription>
                    Are you sure? This cannot be undone. The item will be
                    marked inactive and hidden from new bookings, but past
                    booking history will be preserved.
                  </DialogDescription>
                </DialogHeader>
                {deleteError && (
                  <p className="text-sm text-destructive">{deleteError}</p>
                )}
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" type="button">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting…" : "Delete"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="flex items-center gap-2">
              <Button asChild variant="outline" type="button">
                <Link href="/items">Cancel</Link>
              </Button>
              <Button
                type="submit"
                className="bg-[#E91E63] text-white hover:bg-[#C2185B]"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Saving…" : "Save item"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
