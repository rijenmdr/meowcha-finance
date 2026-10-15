"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CornerBrackets } from "@/components/CornerBrackets";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim().toLowerCase();
    const password = String(fd.get("password") || "");

    const { data, error } = await getSupabaseBrowserClient().auth.signInWithPassword({ email, password });

    if (error) {
      setPending(false);
      setError("Invalid email or password.");
      return;
    }

    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim().toLowerCase();
    if (adminEmail && data.user?.email?.toLowerCase() !== adminEmail) {
      await getSupabaseBrowserClient().auth.signOut();
      setPending(false);
      setError("This account is not authorized.");
      return;
    }

    router.replace("/overview");
    router.refresh();
  }

  return (
    <div className="grid min-h-screen place-items-center bg-canvas p-5 font-sans text-15 text-ink">
      <form
        onSubmit={handleSubmit}
        className="relative flex w-full max-w-95 flex-col gap-3.5 border border-line bg-surface p-7 shadow-card"
      >
        <CornerBrackets />

        <div className="mb-1.5 flex items-center gap-3">
          <Logo className="size-10" />
          <div>
            <div className="font-condensed text-22 font-semibold tracking-[-0.01em]">Meowcha</div>
            <div className="mt-0.75 text-11 tracking-widest text-accent-500 uppercase">Finance</div>
          </div>
        </div>

        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" type="email" name="email" autoComplete="username" required />
        </Field>

        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input id="password" type="password" name="password" autoComplete="current-password" required />
        </Field>

        {error && <FieldError>{error}</FieldError>}

        <Button type="submit" disabled={pending} className="mt-1.5 w-full">
          {pending ? "Signing in…" : "Sign in"}
        </Button>

        <div className="mt-1 text-11 text-ink/55">Access is restricted to the Meowcha admin account.</div>
      </form>
    </div>
  );
}
