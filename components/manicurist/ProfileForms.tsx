"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  changeMyPassword,
  createManicuristAccount,
  updateMyManicuristProfile,
} from "@/app/(manicurist)/profile/actions";

type Initial = {
  full_name: string;
  email: string;
  phone: string;
  bio: string;
  specialties: string;
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#F8BBD0]/60 bg-white/80 p-5 shadow-[0_4px_16px_-8px_rgba(244,143,177,0.4)]">
      <div className="mb-4 space-y-0.5">
        <h2 className="text-lg font-semibold text-[#3D1A2A]">{title}</h2>
        {description && (
          <p className="text-xs text-[#5C2D48]/70">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function Status({
  status,
}: {
  status: { kind: "idle" } | { kind: "ok"; message: string } | { kind: "err"; message: string };
}) {
  if (status.kind === "idle") return null;
  return (
    <p
      className={`mt-2 text-xs ${
        status.kind === "ok" ? "text-emerald-700" : "text-red-700"
      }`}
    >
      {status.message}
    </p>
  );
}

function ProfileSection({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<
    { kind: "idle" } | { kind: "ok"; message: string } | { kind: "err"; message: string }
  >({ kind: "idle" });
  const [form, setForm] = useState({
    full_name: initial.full_name,
    phone: initial.phone,
    bio: initial.bio,
    specialties: initial.specialties,
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ kind: "idle" });
    startTransition(async () => {
      const res = await updateMyManicuristProfile({
        full_name: form.full_name,
        phone: form.phone,
        bio: form.bio,
        specialties: form.specialties,
      });
      if (res.ok) {
        setStatus({ kind: "ok", message: "Profile updated." });
        router.refresh();
      } else {
        setStatus({ kind: "err", message: res.error });
      }
    });
  }

  return (
    <Section title="Your details">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Full name</Label>
          <Input
            id="full_name"
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={initial.email} disabled />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            rows={3}
            placeholder="Tell customers a bit about you."
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="specialties">Specialties</Label>
          <Input
            id="specialties"
            value={form.specialties}
            onChange={(e) =>
              setForm((f) => ({ ...f, specialties: e.target.value }))
            }
            placeholder="gel, pedicure, nail art"
          />
          <p className="text-[11px] text-[#5C2D48]/60">
            Comma-separated. Shown on your public profile.
          </p>
        </div>
        <div className="flex items-center justify-end gap-3">
          <Status status={status} />
          <Button
            type="submit"
            disabled={pending}
            className="bg-gradient-to-r from-[#EC4899] to-[#DB2777] text-white"
          >
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Section>
  );
}

function PasswordSection() {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<
    { kind: "idle" } | { kind: "ok"; message: string } | { kind: "err"; message: string }
  >({ kind: "idle" });
  const [pw, setPw] = useState({ next: "", confirm: "" });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ kind: "idle" });
    if (pw.next !== pw.confirm) {
      setStatus({ kind: "err", message: "Passwords do not match." });
      return;
    }
    startTransition(async () => {
      const res = await changeMyPassword({ new_password: pw.next });
      if (res.ok) {
        setPw({ next: "", confirm: "" });
        setStatus({ kind: "ok", message: "Password updated." });
      } else {
        setStatus({ kind: "err", message: res.error });
      }
    });
  }

  return (
    <Section
      title="Change password"
      description="You'll stay signed in. No current password required."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="new_password">New password</Label>
          <Input
            id="new_password"
            type="password"
            value={pw.next}
            onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
            minLength={8}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm_password">Confirm new password</Label>
          <Input
            id="confirm_password"
            type="password"
            value={pw.confirm}
            onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
            minLength={8}
            required
          />
        </div>
        <div className="flex items-center justify-end gap-3">
          <Status status={status} />
          <Button
            type="submit"
            disabled={pending}
            className="bg-gradient-to-r from-[#EC4899] to-[#DB2777] text-white"
          >
            {pending ? "Updating…" : "Update password"}
          </Button>
        </div>
      </form>
    </Section>
  );
}

function CreateManicuristSection() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<
    { kind: "idle" } | { kind: "ok"; message: string } | { kind: "err"; message: string }
  >({ kind: "idle" });
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ kind: "idle" });
    startTransition(async () => {
      const res = await createManicuristAccount({
        full_name: form.full_name,
        email: form.email,
        password: form.password,
      });
      if (res.ok) {
        setStatus({
          kind: "ok",
          message: `Account created for ${res.data.email}.`,
        });
        setForm({ full_name: "", email: "", password: "" });
      } else {
        setStatus({ kind: "err", message: res.error });
      }
    });
  }

  return (
    <Section
      title="Add another manicurist"
      description="Creates a new manicurist account they can sign in with right away."
    >
      {!open ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(true)}
          className="border-[#F8BBD0] text-[#BE185D]"
        >
          New manicurist account
        </Button>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new_full_name">Full name</Label>
            <Input
              id="new_full_name"
              value={form.full_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, full_name: e.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new_email">Email</Label>
            <Input
              id="new_email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new_password">Temporary password</Label>
            <Input
              id="new_password"
              type="text"
              value={form.password}
              onChange={(e) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
              minLength={8}
              placeholder="Share this with them so they can sign in"
              required
            />
          </div>
          <div className="flex items-center justify-end gap-3">
            <Status status={status} />
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setStatus({ kind: "idle" });
              }}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="bg-gradient-to-r from-[#EC4899] to-[#DB2777] text-white"
            >
              {pending ? "Creating…" : "Create account"}
            </Button>
          </div>
        </form>
      )}
    </Section>
  );
}

export function ProfileForms({ initial }: { initial: Initial }) {
  return (
    <div className="space-y-5">
      <ProfileSection initial={initial} />
      <PasswordSection />
      <CreateManicuristSection />
    </div>
  );
}
