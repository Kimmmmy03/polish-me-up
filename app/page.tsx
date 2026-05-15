import Link from "next/link";
import {
  CalendarCheck,
  Clock,
  Eye,
  Heart,
  Home,
  Sparkle,
  Sparkles as SparklesIcon,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";

import Image from "next/image";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/shared/SiteHeader";
import { BottomNavCustomer } from "@/components/shared/BottomNavCustomer";
import { BlurFade } from "@/components/animations/BlurFade";
import {
  AnimatedGradientText,
  ShinyText,
} from "@/components/animations/AnimatedGradientText";
import { Sparkles } from "@/components/animations/Sparkles";
import { createClient } from "@/lib/supabase/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_IMAGE_BASE =
  `${SUPABASE_URL}/storage/v1/object/public/service-images/homepage`;

export default async function HomePage() {
  // Manicurists land directly on their studio dashboard.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role === "manicurist") {
      redirect("/dashboard");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#FFF5F8] via-[#FFE4EC] to-[#FFD1DC] text-[#3D1A2A]">
      <SiteHeader showCart />

      <main className="flex-1">
        <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,#FFD1DC_0%,transparent_45%),radial-gradient(circle_at_bottom_right,#FCC8DC_0%,transparent_50%)] pt-10 pb-16 sm:pt-16 sm:pb-24 md:pt-20 md:pb-32">
          <Sparkles />
          <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <BlurFade>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-[10px] font-semibold tracking-wide text-[#BE3D7E] uppercase shadow-sm backdrop-blur-sm sm:mb-6 sm:px-4 sm:py-1.5 sm:text-xs">
                <SparklesIcon className="size-3" />
                <ShinyText>Est. 2025</ShinyText>
              </p>
            </BlurFade>
            <BlurFade delay={120}>
              <h1 className="mb-3 text-4xl font-bold tracking-tight sm:text-5xl md:text-7xl">
                <AnimatedGradientText>Polish Me Up!</AnimatedGradientText>
              </h1>
            </BlurFade>
            <BlurFade delay={240}>
              <h2 className="mb-4 text-base font-medium text-[#5C2D48] sm:mb-6 sm:text-xl md:text-2xl">
                Remote Manicure &amp; Pedicure Services
              </h2>
            </BlurFade>
            <BlurFade delay={360}>
              <p className="mx-auto mb-6 max-w-2xl text-sm leading-relaxed text-[#5C2D48]/80 sm:mb-10 sm:text-base md:text-lg">
                Spa-quality nail services delivered to your location - home,
                booth, or any venue of your choice. Affordable prices with
                special discounts for students.
              </p>
            </BlurFade>
            <BlurFade delay={480}>
              <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
                <Button
                  asChild
                  size="lg"
                  className="h-12 w-full rounded-full bg-gradient-to-r from-[#EC4899] to-[#DB2777] px-6 text-white shadow-[0_8px_24px_-8px_rgba(244,143,177,0.55)] transition-all hover:from-[#DB2777] hover:to-[#BE185D] hover:shadow-[0_12px_28px_-8px_rgba(244,143,177,0.7)] sm:w-auto sm:px-8"
                >
                  <Link href="/order/start">
                    <Eye className="size-5" />
                    View Packages
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 w-full rounded-full border-[#F8BBD0] bg-white/80 px-6 text-[#BE3D7E] shadow-md backdrop-blur-sm transition-all hover:bg-[#FFE4EC] hover:shadow-lg sm:w-auto sm:px-8"
                >
                  <Link href="/order/start">
                    <CalendarCheck className="size-5" />
                    Book Now
                  </Link>
                </Button>
              </div>
            </BlurFade>
          </div>
        </section>

        <section className="relative z-20 -mt-6 py-12 sm:-mt-10 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <BlurFade>
              <h2 className="mb-8 text-2xl font-bold text-[#3D1A2A] sm:mb-12 sm:text-3xl">
                Our Services
              </h2>
            </BlurFade>
            <div className="grid grid-cols-1 gap-5 sm:gap-8 md:grid-cols-3">
              <BlurFade delay={80}>
                <ServiceCard
                  image={SERVICE_IMAGE_BASE + "/at-home1.jpg"}
                  icon={<Home className="size-5" />}
                  title="At Your Home"
                  description="Enjoy spa-quality nail services in the comfort of your own home without stepping out."
                />
              </BlurFade>
              <BlurFade delay={160}>
                <ServiceCard
                  image={SERVICE_IMAGE_BASE + "/booth1.jpg"}
                  icon={<Store className="size-5" />}
                  title="Booth & Events"
                  description="Perfect for events, exhibitions, or special occasions. We come to your location!"
                />
              </BlurFade>
              <BlurFade delay={240}>
                <ServiceCard
                  image={SERVICE_IMAGE_BASE + "/timing1.png"}
                  icon={<Clock className="size-5" />}
                  title="Flexible Timing"
                  description="Choose a time that fits your schedule. We adapt to your needs."
                />
              </BlurFade>
            </div>
          </div>
        </section>

        <section className="bg-white/40 py-12 backdrop-blur-sm sm:py-20">
          <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <BlurFade>
              <h2 className="mb-3 text-2xl font-bold text-[#3D1A2A] sm:mb-4 sm:text-3xl">
                Our Commitment to SDGs
              </h2>
              <p className="mb-8 text-sm text-[#5C2D48]/70 sm:mb-12 sm:text-base">
                Sustainable Development Goals that we support
              </p>
            </BlurFade>
            <div className="grid grid-cols-1 gap-5 text-left sm:gap-8 md:grid-cols-3">
              <BlurFade delay={80}>
                <SdgCard
                  icon={<Heart className="size-6" />}
                  tag="SDG 3"
                  title="Health & Wellbeing"
                  description="We promote self-care as a vital step for our customers' mental and physical health."
                />
              </BlurFade>
              <BlurFade delay={160}>
                <SdgCard
                  icon={<Users className="size-6" />}
                  tag="SDG 5"
                  title="Gender Equality"
                  description="Empowerment through beauty and self-confidence. We believe everyone deserves to feel beautiful."
                />
              </BlurFade>
              <BlurFade delay={240}>
                <SdgCard
                  icon={<TrendingUp className="size-6" />}
                  tag="SDG 8"
                  title="Decent Work & Economic Growth"
                  description="Supporting flexible work opportunities through remote services for inclusive economic growth."
                />
              </BlurFade>
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <BlurFade>
              <div className="relative overflow-hidden rounded-3xl border border-[#F8BBD0] bg-gradient-to-r from-[#FFE4EC] via-[#FFD1DC] to-[#FCC8DC] p-7 text-center shadow-inner sm:p-12">
                <Sparkles count={12} />
                <div className="relative z-10">
                  <h2 className="mb-3 text-2xl font-bold text-[#3D1A2A] sm:mb-4 sm:text-3xl">
                    Ready to <AnimatedGradientText>Shine</AnimatedGradientText>?
                  </h2>
                  <p className="mx-auto mb-6 max-w-xl text-sm text-[#5C2D48]/80 sm:mb-8 sm:text-base">
                    Book your session now and enjoy beautiful nails without the trip
                    to the salon!
                  </p>
                  <Button
                    asChild
                    size="lg"
                    className="h-12 w-full rounded-full bg-gradient-to-r from-[#EC4899] to-[#DB2777] px-8 text-white shadow-md transition-all hover:from-[#DB2777] hover:to-[#BE185D] hover:shadow-lg sm:w-auto sm:px-10"
                  >
                    <Link href="/order/start">
                      <CalendarCheck className="size-5" />
                      Book Now
                    </Link>
                  </Button>
                </div>
              </div>
            </BlurFade>
          </div>
        </section>
      </main>

      <footer className="mt-auto border-t border-[#F8BBD0]/60 bg-white/60 py-8 pb-24 backdrop-blur-sm sm:py-12 md:pb-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:gap-6 md:flex-row">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-[#EC4899] to-[#DB2777] text-white pmu-float-soft">
                <Sparkle className="size-4" />
              </span>
              <span className="font-bold text-[#3D1A2A]">Polish Me Up!</span>
            </Link>
            <p className="text-sm text-[#5C2D48]/60">
              © {new Date().getFullYear()} Polish Me Up! All rights reserved.
            </p>
            <div className="flex gap-4">
              <a
                href="https://www.instagram.com/polishmeup_my/"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="text-[#5C2D48]/40 transition-colors hover:text-[#BE3D7E]"
              >
                <svg
                  className="size-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>

      <BottomNavCustomer />
    </div>
  );
}

function ServiceCard({
  image,
  icon,
  title,
  description,
}: {
  image?: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-white/60 bg-white/80 text-center shadow-sm backdrop-blur-md transition-all hover:-translate-y-1 hover:shadow-[0_16px_32px_-12px_rgba(236,72,153,0.3)]">
      <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-[#FFE4EC] to-[#FFD1DC]">
        {image ? (
          <Image
            src={image}
            alt={title}
            fill
            sizes="(min-width: 1024px) 360px, (min-width: 768px) 33vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            unoptimized
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-[#3D1A2A]/45 via-transparent to-transparent" />
        <span className="absolute top-3 left-3 inline-flex size-9 items-center justify-center rounded-full bg-white/90 text-[#BE185D] shadow-md backdrop-blur-sm">
          {icon}
        </span>
      </div>
      <div className="p-7">
        <h3 className="mb-3 text-xl font-semibold text-[#3D1A2A]">{title}</h3>
        <p className="text-sm leading-relaxed text-[#5C2D48]/70">
          {description}
        </p>
      </div>
    </div>
  );
}

function SdgCard({
  icon,
  tag,
  title,
  description,
}: {
  icon: React.ReactNode;
  tag: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-[#F8BBD0]/40 bg-white/80 p-8 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-lg">
      <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#EC4899] to-[#DB2777] text-white">
        {icon}
      </div>
      <div className="mb-3 inline-block rounded bg-[#FFE4EC] px-2 py-1 text-xs font-bold text-[#BE3D7E]">
        {tag}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-[#3D1A2A]">{title}</h3>
      <p className="text-sm leading-relaxed text-[#5C2D48]/70">{description}</p>
    </div>
  );
}
