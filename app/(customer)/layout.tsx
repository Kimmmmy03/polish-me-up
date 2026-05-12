import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/shared/SignOutButton";
import { CartIndicator } from "@/components/customer/CartIndicator";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FDF2F4]">
      <header className="border-b border-[#F8BBD0] bg-white">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-[#E91E63]"
          >
            Polish Me Up
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/"
              className="rounded-md px-3 py-1.5 text-sm text-[#2D2D2D] hover:bg-[#FDF2F4]"
            >
              Home
            </Link>
            <Link
              href="/packages"
              className="rounded-md px-3 py-1.5 text-sm text-[#2D2D2D] hover:bg-[#FDF2F4]"
            >
              Packages
            </Link>
            <Link
              href="/my-bookings"
              className="rounded-md px-3 py-1.5 text-sm text-[#2D2D2D] hover:bg-[#FDF2F4]"
            >
              My Bookings
            </Link>
            <CartIndicator />
            <SignOutButton />
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
