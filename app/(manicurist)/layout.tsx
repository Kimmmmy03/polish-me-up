import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/manicurist/SidebarNav";
import { SignOutButton } from "@/components/shared/SignOutButton";

export default async function ManicuristLayout({
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "manicurist") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-[#FDF2F4]">
      <aside className="flex w-60 flex-col border-r border-[#F8BBD0] bg-white">
        <div className="border-b border-[#F8BBD0] px-5 py-4">
          <Link
            href="/dashboard"
            className="text-lg font-semibold tracking-tight text-[#E91E63]"
          >
            Polish Me Up
          </Link>
        </div>
        <SidebarNav />
        <div className="border-t border-[#F8BBD0] p-3">
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
