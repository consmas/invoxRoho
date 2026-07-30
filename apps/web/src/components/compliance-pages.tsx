"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  expireComplianceCheck,
  getComplianceCheck,
  getComplianceChecks,
  getComplianceReviewQueue,
  getComplianceSummary,
  reviewComplianceCheck,
} from "@/src/lib/api";
import { getApiError } from "@/src/lib/api/client";
import { AppShell, Button, Card, DataTable, LinkButton, PageHeader, StatusMessage } from "./app-shell";

type AnyRecord = Record<string, unknown>;

export function ComplianceHomePage() {
  const summary = useQuery({ queryKey: ["compliance", "summary"], queryFn: getComplianceSummary });
  const cards = summary.data ?? {};
  return (
    <AppShell>
      <PageHeader title="Compliance" description="KYC, KYB, sanctions, PEP and adverse media screening controls." />
      <StatusMessage loading={summary.isLoading} error={summary.isError ? getApiError(summary.error) : undefined} />
      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(cards).map(([key, value]) => (
          <Card key={key}>
            <p className="text-sm text-muted-foreground">{label(key)}</p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
          </Card>
        ))}
      </div>
      <div className="mt-6 flex gap-3">
        <LinkButton href="/compliance/checks">View checks</LinkButton>
        <LinkButton href="/compliance/review-queue">Review queue</LinkButton>
      </div>
    </AppShell>
  );
}

export function ComplianceChecksPage({ queueOnly = false }: { queueOnly?: boolean }) {
  const query = useQuery({
    queryKey: ["compliance", queueOnly ? "review-queue" : "checks"],
    queryFn: queueOnly ? getComplianceReviewQueue : getComplianceChecks,
  });
  const rows = (query.data ?? []) as AnyRecord[];
  return (
    <AppShell>
      <PageHeader title={queueOnly ? "Compliance Review Queue" : "Compliance Checks"} action={<LinkButton href="/compliance">Back</LinkButton>} />
      <Card>
        <StatusMessage loading={query.isLoading} error={query.isError ? getApiError(query.error) : undefined} empty={rows.length === 0 ? "No compliance checks found." : undefined} />
        {rows.length ? (
          <DataTable headers={["Type", "Entity", "Provider", "Result", "Risk", "Reason", "Review", "Checked", "Actions"]}>
            {rows.map((row, index) => (
              <tr key={String(row.id ?? index)}>
                <td className="px-4 py-3">{value(row.checkType)}</td>
                <td className="px-4 py-3">{entity(row)}</td>
                <td className="px-4 py-3">{value(row.providerKey)}</td>
                <td className="px-4 py-3">{value(row.normalizedResult)}</td>
                <td className="px-4 py-3">{value(row.riskLevel)}</td>
                <td className="px-4 py-3">{value(row.reason)}</td>
                <td className="px-4 py-3">{String(Boolean(row.reviewRequired))}</td>
                <td className="px-4 py-3">{value(row.checkedAt)}</td>
                <td className="px-4 py-3">{row.id ? <Link className="font-medium underline" href={`/compliance/checks/${row.id}`}>Review</Link> : null}</td>
              </tr>
            ))}
          </DataTable>
        ) : null}
      </Card>
    </AppShell>
  );
}

export function ComplianceCheckDetailPage({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["compliance", "checks", id], queryFn: () => getComplianceCheck(id) });
  const review = useMutation({
    mutationFn: (decision: string) => reviewComplianceCheck(id, { decision, notes: `Reviewed as ${decision}` }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["compliance", "checks", id] }),
  });
  const expire = useMutation({
    mutationFn: () => expireComplianceCheck(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["compliance", "checks", id] }),
  });
  return (
    <AppShell>
      <PageHeader title="Compliance Check" action={<LinkButton href="/compliance/checks">Back</LinkButton>} />
      <StatusMessage loading={query.isLoading} error={query.isError ? getApiError(query.error) : undefined} />
      {query.data ? (
        <Card>
          <div className="mb-4 flex flex-wrap gap-3">
            <Button onClick={() => review.mutate("FALSE_POSITIVE")} disabled={review.isPending}>Approve as false positive</Button>
            <Button onClick={() => review.mutate("TRUE_MATCH")} disabled={review.isPending} variant="danger">Reject / true match</Button>
            <Button onClick={() => review.mutate("ESCALATED")} disabled={review.isPending} variant="secondary">Escalate</Button>
            <Button onClick={() => expire.mutate()} disabled={expire.isPending} variant="secondary">Expire</Button>
          </div>
          <pre className="overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-50">{JSON.stringify(query.data, null, 2)}</pre>
        </Card>
      ) : null}
    </AppShell>
  );
}

function entity(row: AnyRecord) {
  const counterparty = row.counterparty as AnyRecord | undefined;
  const ubo = row.uboRecord as AnyRecord | undefined;
  return String(counterparty?.legalName ?? ubo?.fullName ?? row.counterpartyId ?? row.uboRecordId ?? "-");
}

function value(input: unknown) {
  if (input == null || input === "") return "-";
  return String(input);
}

function label(key: string) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}
