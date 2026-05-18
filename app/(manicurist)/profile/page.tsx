import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/manicurist/PageHeader";
import { ProfileForms } from "@/components/manicurist/ProfileForms";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "manicurist") redirect("/login");

  const { data: manicurist } = await supabase
    .from("manicurists")
    .select("bio, specialties")
    .eq("profile_id", user.id)
    .maybeSingle();

  const specialties = (manicurist?.specialties ?? []).join(", ");

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        title="Profile"
        subtitle="Manage your details, change your password, or add another manicurist."
        userId={user.id}
      />
      <ProfileForms
        initial={{
          full_name: profile.full_name ?? "",
          email: profile.email ?? "",
          phone: profile.phone ?? "",
          bio: manicurist?.bio ?? "",
          specialties,
        }}
      />
    </div>
  );
}
