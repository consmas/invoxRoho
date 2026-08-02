"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Landmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/src/components/auth-provider";
import { Button, Field, inputClass } from "@/src/components/app-shell";
import { getApiError } from "@/src/lib/api/client";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginForm = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "admin@invox.local",
      password: "Admin@123456",
    },
  });

  async function onSubmit(values: LoginForm) {
    setError(null);
    try {
      await login(values.email, values.password);
      router.replace("/dashboard");
    } catch (loginError) {
      setError(getApiError(loginError));
    }
  }

  return (
    <main className="grid min-h-screen bg-background text-foreground lg:grid-cols-[minmax(0,1fr)_500px]">
      <section className="hidden border-r border-sidebar-border bg-sidebar p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <div className="mb-4 inline-flex rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200">
            Staging
          </div>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-white text-primary">
              <Landmark className="size-5" />
            </div>
            <div>
              <p className="font-semibold tracking-wide">INVOX</p>
              <p className="text-sm text-white/55">Supply Chain Finance OS</p>
            </div>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
            Reverse factoring operations
          </p>
          <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-tight">
            Everything is a ledger entry with a face.
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-white/62">
            Sign in to manage counterparties, programmes, invoices, financing,
            payments, approvals and controls from one permission-aware workspace.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-xs">
          {["Who", "Amount", "Stage"].map((label) => (
            <div key={label} className="rounded-md border border-white/10 bg-white/[0.04] p-3">
              <p className="font-semibold text-white">{label}</p>
              <p className="mt-1 text-white/45">Always visible</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center p-6">
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-sm"
        >
          <div className="mb-6">
            <h2 className="text-2xl font-semibold">Sign in</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use your INVOX platform account.
            </p>
          </div>

          <div className="space-y-4">
            <Field label="Email" error={form.formState.errors.email?.message}>
              <input className={inputClass} {...form.register("email")} />
            </Field>
            <Field
              label="Password"
              error={form.formState.errors.password?.message}
            >
              <input
                className={inputClass}
                type="password"
                {...form.register("password")}
              />
            </Field>
          </div>

          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

          <Button
            className="mt-6 w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Signing in..." : "Sign in"}
          </Button>

          <p className="mt-4 text-xs text-muted-foreground">
            Local seed default: admin@invox.local / Admin@123456
          </p>
        </form>
      </section>
    </main>
  );
}
