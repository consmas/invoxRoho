"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button, Field, inputClass } from "@/src/components/app-shell";
import { confirmPasswordReset } from "@/src/lib/api";
import { getApiError } from "@/src/lib/api/client";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const search = useSearchParams();
  const [token, setToken] = useState(search.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      await confirmPasswordReset({ token, newPassword: password });
      setMessage("Password reset complete. You can now sign in.");
    } catch (resetError) {
      setError(getApiError(resetError));
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <form onSubmit={submit} className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Reset password</h1>
        <div className="mt-6 space-y-4">
          <Field label="Reset token">
            <input className={inputClass} value={token} onChange={(event) => setToken(event.target.value)} />
          </Field>
          <Field label="New password">
            <input className={inputClass} type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </Field>
        </div>
        {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
        <Button className="mt-6 w-full" disabled={pending || !token || !password}>
          {pending ? "Resetting..." : "Reset password"}
        </Button>
      </form>
    </main>
  );
}
