"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitError } from "@/lib/rate-limit";

type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };

async function requireManicurist() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "manicurist") {
    return { ok: false as const, error: "Manicurists only" };
  }
  return { ok: true as const, supabase, userId: user.id };
}

const profileSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(120),
  phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => (v ? v : null)),
  bio: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : null)),
  specialties: z.string().trim().max(300).optional().default(""),
});

export async function updateMyManicuristProfile(
  input: z.infer<typeof profileSchema>,
): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const auth = await requireManicurist();
  if (!auth.ok) return auth;
  const { supabase, userId } = auth;

  const { error: profErr } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone,
    })
    .eq("id", userId);
  if (profErr) return { ok: false, error: profErr.message };

  const specialtiesArr = parsed.data.specialties
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const { error: maniErr } = await supabase
    .from("manicurists")
    .update({
      bio: parsed.data.bio,
      specialties: specialtiesArr.length ? specialtiesArr : null,
    })
    .eq("profile_id", userId);
  if (maniErr) return { ok: false, error: maniErr.message };

  revalidatePath("/profile");
  return { ok: true };
}

const passwordSchema = z.object({
  new_password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72),
});

export async function changeMyPassword(
  input: z.infer<typeof passwordSchema>,
): Promise<ActionResult> {
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const auth = await requireManicurist();
  if (!auth.ok) return auth;

  const limit = await checkRateLimit("admin", auth.userId);
  if (!limit.ok) return { ok: false, error: rateLimitError("admin") };

  const { error } = await auth.supabase.auth.updateUser({
    password: parsed.data.new_password,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

const newManicuristSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email("Invalid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72),
});

export async function createManicuristAccount(
  input: z.infer<typeof newManicuristSchema>,
): Promise<ActionResult<{ email: string }>> {
  const parsed = newManicuristSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const auth = await requireManicurist();
  if (!auth.ok) return auth;

  const limit = await checkRateLimit("admin", auth.userId);
  if (!limit.ok) return { ok: false, error: rateLimitError("admin") };

  const admin = createAdminClient();

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name },
  });
  if (createErr || !created.user) {
    return { ok: false, error: createErr?.message ?? "Failed to create user" };
  }

  const newUserId = created.user.id;

  // Auth-triggered profile rows default to role='customer'. Promote it,
  // then ensure a manicurists row exists.
  const { error: profErr } = await admin
    .from("profiles")
    .upsert(
      {
        id: newUserId,
        email: parsed.data.email,
        full_name: parsed.data.full_name,
        role: "manicurist",
      },
      { onConflict: "id" },
    );
  if (profErr) {
    return { ok: false, error: profErr.message };
  }

  const { error: maniErr } = await admin
    .from("manicurists")
    .upsert(
      {
        profile_id: newUserId,
        is_active: true,
        rating: 5.0,
        total_jobs: 0,
      },
      { onConflict: "profile_id" },
    );
  if (maniErr) {
    return { ok: false, error: maniErr.message };
  }

  revalidatePath("/profile");
  return { ok: true, data: { email: parsed.data.email } };
}
