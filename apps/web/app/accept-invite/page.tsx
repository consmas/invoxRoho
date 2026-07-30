"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Field, inputClass } from "@/src/components/app-shell";

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={null}>
      <AcceptInviteContent />
    </Suspense>
  );
}

function AcceptInviteContent() {
  const search = useSearchParams();
  const token = search.get("token") ?? "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <section className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Accept invitation</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Invitation acceptance is staged for the next auth hardening pass. For now, keep this token and ask a platform administrator to activate the account after verifying the invite.
        </p>
        <div className="mt-6">
          <Field label="Invite token">
            <input className={inputClass} value={token} readOnly />
          </Field>
        </div>
        <Link className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90" href="/login">
          Go to sign in
        </Link>
      </section>
    </main>
  );
}
