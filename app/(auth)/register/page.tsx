"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GraduationCap, PartyPopper } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { createClient } from "@/lib/supabase/client";
import {
  isEducationalEmail,
  registerSchema,
  STUDENT_EMAIL_HINT,
  type RegisterInput,
} from "@/lib/validations/auth.schema";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      phone: "",
      is_student: false,
    },
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const watchedEmail = useWatch({ control: form.control, name: "email" });
  const studentEligible = isEducationalEmail(watchedEmail ?? "");

  // Auto-toggle is_student based on edu-email eligibility.
  // When eligible, tick it for the user; when ineligible, untick.
  useEffect(() => {
    const currentlyChecked = form.getValues("is_student");
    if (studentEligible && !currentlyChecked) {
      form.setValue("is_student", true, { shouldValidate: true });
    } else if (!studentEligible && currentlyChecked) {
      form.setValue("is_student", false, { shouldValidate: true });
    }
  }, [studentEligible, form]);

  async function onSubmit(values: RegisterInput) {
    setSubmitError(null);

    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          full_name: values.full_name,
          phone: values.phone,
          is_student: values.is_student ?? false,
        },
      },
    });

    if (error) {
      setSubmitError(error.message);
      return;
    }

    router.refresh();
    router.push("/");
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-[#3D1A2A]">Create account</h2>
        <p className="text-sm text-muted-foreground">
          Sign up to book and track your visits.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="name"
                    autoCapitalize="words"
                    enterKeyHint="next"
                    placeholder="Jane Doe"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="next"
                    placeholder="you@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    enterKeyHint="next"
                    placeholder="At least 8 characters, with a letter and a number"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    enterKeyHint="go"
                    placeholder="+60 12-345 6789"
                    {...field}
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
              <FormItem>
                <div className="flex flex-row items-center gap-2">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={!!field.value}
                      disabled={!studentEligible}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="h-5 w-5 rounded border-input accent-[#EC4899] disabled:cursor-not-allowed disabled:opacity-50 md:h-4 md:w-4"
                    />
                  </FormControl>
                  <FormLabel className="!mt-0 inline-flex items-center gap-1.5 font-normal">
                    <GraduationCap className="size-4 text-[#EC4899]" />
                    I&apos;m a student (eligible for student discount)
                  </FormLabel>
                </div>
                {studentEligible ? (
                  <div
                    key={watchedEmail}
                    className="pmu-pop-in mt-2 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
                  >
                    <PartyPopper className="size-4 shrink-0 text-emerald-600" />
                    <span>
                      <span className="font-semibold">Congrats!</span> You&apos;re
                      eligible for the student discount (10% off all orders).
                    </span>
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {STUDENT_EMAIL_HINT}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {submitError && (
            <p className="text-sm text-destructive">{submitError}</p>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full bg-[#EC4899] text-white hover:bg-[#BE185D]"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Creating account…" : "Create account"}
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-[#EC4899] hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
