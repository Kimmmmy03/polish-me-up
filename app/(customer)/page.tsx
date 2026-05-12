import Link from "next/link";
import { ArrowRight, CalendarCheck, Clock, Search, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatMYR } from "@/lib/utils/formatPrice";

export default async function HomePage() {
  const supabase = await createClient();

  const { data: featured } = await supabase
    .from("items")
    .select("id, name, description, price, duration_min")
    .eq("category", "package")
    .eq("is_active", true)
    .order("price", { ascending: true })
    .limit(3);

  const featuredPackages = featured ?? [];

  return (
    <div className="space-y-16">
      <section className="rounded-3xl bg-[#FDF2F4] px-6 py-16 text-center md:px-12 md:py-24">
        <p className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-[#E91E63] ring-1 ring-[#F8BBD0]">
          <Sparkles className="size-3.5" />
          Now booking appointments
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-[#E91E63] md:text-6xl">
          Polish Me Up
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-[#2D2D2D] md:text-lg">
          Manicures, pedicures, and nail care — at home or at our booth.
        </p>
        <div className="mt-8">
          <Button
            asChild
            size="lg"
            className="bg-[#E91E63] text-white hover:bg-[#C2185B]"
          >
            <Link href="/packages">
              View Packages
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      <section className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-[#2D2D2D] md:text-3xl">
            How it works
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Three simple steps to your next appointment.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-3 rounded-2xl bg-white p-6 ring-1 ring-[#F8BBD0]">
            <div className="inline-flex size-10 items-center justify-center rounded-full bg-[#FDF2F4] text-[#E91E63]">
              <Search className="size-5" />
            </div>
            <h3 className="text-lg font-medium text-[#2D2D2D]">Browse</h3>
            <p className="text-sm text-muted-foreground">
              Pick from our packages and add-ons designed for every occasion.
            </p>
          </div>
          <div className="space-y-3 rounded-2xl bg-white p-6 ring-1 ring-[#F8BBD0]">
            <div className="inline-flex size-10 items-center justify-center rounded-full bg-[#FDF2F4] text-[#E91E63]">
              <CalendarCheck className="size-5" />
            </div>
            <h3 className="text-lg font-medium text-[#2D2D2D]">Book</h3>
            <p className="text-sm text-muted-foreground">
              Choose a date, time, and location — at home or at our booth.
            </p>
          </div>
          <div className="space-y-3 rounded-2xl bg-white p-6 ring-1 ring-[#F8BBD0]">
            <div className="inline-flex size-10 items-center justify-center rounded-full bg-[#FDF2F4] text-[#E91E63]">
              <Sparkles className="size-5" />
            </div>
            <h3 className="text-lg font-medium text-[#2D2D2D]">Relax</h3>
            <p className="text-sm text-muted-foreground">
              Sit back while our manicurists take care of every last detail.
            </p>
          </div>
        </div>
      </section>

      {featuredPackages.length > 0 && (
        <section className="space-y-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-[#2D2D2D] md:text-3xl">
                Featured packages
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Our most-loved treatments to get you started.
              </p>
            </div>
            <Link
              href="/packages"
              className="hidden text-sm font-medium text-[#E91E63] hover:underline md:inline"
            >
              See all packages →
            </Link>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {featuredPackages.map((pkg) => (
              <Card key={pkg.id} className="bg-white">
                <div className="flex h-32 items-center justify-center bg-[#F8BBD0]/40">
                  <Sparkles className="size-10 text-[#E91E63]" />
                </div>
                <CardHeader>
                  <CardTitle className="text-[#2D2D2D]">{pkg.name}</CardTitle>
                  {pkg.description && (
                    <CardDescription>{pkg.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-semibold text-[#E91E63]">
                    {formatMYR(Number(pkg.price))}
                  </p>
                  {pkg.duration_min != null && (
                    <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="size-3.5" />
                      {pkg.duration_min} min
                    </p>
                  )}
                </CardContent>
                <CardFooter>
                  <Button
                    asChild
                    className="w-full bg-[#E91E63] text-white hover:bg-[#C2185B]"
                  >
                    <Link href="/packages">Book Now</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      )}

      <footer className="border-t border-[#F8BBD0] pt-8 pb-4 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} Polish Me Up. All rights reserved.</p>
        <p className="mt-1">Find us on social — coming soon.</p>
      </footer>
    </div>
  );
}
