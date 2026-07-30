"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  getProviderCallbackReconciliation,
  getProviderWebhookEvent,
  getProviderWebhookEvents,
  retryProviderWebhookEvent,
} from "@/src/lib/api";
import { getApiError } from "@/src/lib/api/client";
import type { ProviderWebhookEvent } from "@/src/lib/api/types";
import { formatDate } from "@/src/lib/format";
import {
  AppShell,
  Button,
  Card,
  DataTable,
  LinkButton,
  PageHeader,
  StatusMessage,
} from "./app-shell";

export function ProviderWebhookEventsPage() {
  const query = useQuery({ queryKey: ["provider-webhook-events"], queryFn: getProviderWebhookEvents });
  const reconciliation = useQuery({ queryKey: ["provider-callback-reconciliation"], queryFn: getProviderCallbackReconciliation });
  const rows = query.data ?? [];
  return (
    <AppShell>
      <PageHeader title="Provider Callbacks" description="ERP and e-invoicing inbound callback processing, retry and reconciliation state." />
      {reconciliation.data ? (
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          {Object.entries(reconciliation.data.counts).map(([status, count]) => (
            <Card key={status}>
              <p className="text-sm text-muted-foreground">{status}</p>
              <p className="mt-2 text-3xl font-semibold">{count}</p>
            </Card>
          ))}
        </div>
      ) : null}
      <StatusMessage loading={query.isLoading} error={query.isError ? getApiError(query.error) : undefined} empty={rows.length === 0 ? "No provider callbacks received yet." : undefined} />
      {rows.length ? <ProviderEventTable rows={rows} /> : null}
    </AppShell>
  );
}

export function ProviderWebhookEventDetailPage({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["provider-webhook-event", id], queryFn: () => getProviderWebhookEvent(id) });
  const retry = useMutation({
    mutationFn: () => retryProviderWebhookEvent(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["provider-webhook-event", id] }),
  });
  return (
    <AppShell>
      <PageHeader title="Provider Callback Detail" action={<LinkButton href="/webhooks/providers">Back</LinkButton>} />
      <StatusMessage loading={query.isLoading} error={query.isError ? getApiError(query.error) : undefined} />
      {query.data ? (
        <Card>
          <div className="mb-4 flex flex-wrap gap-3">
            <Button onClick={() => retry.mutate()} disabled={retry.isPending}>Retry processing</Button>
          </div>
          <DetailsGrid
            rows={[
              ["Provider", `${query.data.providerType} / ${query.data.providerKey}`],
              ["Event", query.data.eventType],
              ["Reference", query.data.eventReference],
              ["Signature", query.data.signatureValid ? "Valid" : "Invalid"],
              ["Status", query.data.status],
              ["Attempts", `${query.data.attempts}/${query.data.maxAttempts}`],
              ["Reconciliation", query.data.reconciliationStatus],
              ["Entity", entityLink(query.data)],
              ["Next attempt", formatDate(query.data.nextAttemptAt)],
              ["Last attempt", formatDate(query.data.lastAttemptAt)],
              ["Processed", formatDate(query.data.processedAt)],
              ["Error", query.data.processingError ?? "-"],
              ["Notes", query.data.reconciliationNotes ?? "-"],
            ]}
          />
          {retry.isError ? <p className="mt-3 text-sm text-rose-700">{getApiError(retry.error)}</p> : null}
          <pre className="mt-4 overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-50">{JSON.stringify(query.data.payloadJson, null, 2)}</pre>
        </Card>
      ) : null}
    </AppShell>
  );
}

function ProviderEventTable({ rows }: { rows: ProviderWebhookEvent[] }) {
  return (
    <DataTable headers={["Provider", "Event", "Reference", "Signature", "Status", "Reconciliation", "Attempts", "Entity", "Created", "Actions"]}>
      {rows.map((row) => (
        <tr key={row.id}>
          <td className="px-4 py-3">{row.providerType}</td>
          <td className="px-4 py-3">{row.eventType}</td>
          <td className="px-4 py-3">{row.eventReference}</td>
          <td className="px-4 py-3">{row.signatureValid ? "Valid" : "Invalid"}</td>
          <td className="px-4 py-3"><StatusBadge value={row.status} /></td>
          <td className="px-4 py-3">{row.reconciliationStatus}</td>
          <td className="px-4 py-3">{row.attempts}/{row.maxAttempts}</td>
          <td className="px-4 py-3">{entityLink(row)}</td>
          <td className="px-4 py-3">{formatDate(row.createdAt)}</td>
          <td className="px-4 py-3"><Link className="font-medium underline" href={`/webhooks/providers/${row.id}`}>Review</Link></td>
        </tr>
      ))}
    </DataTable>
  );
}

function DetailsGrid({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-md border border-border p-3">
          <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
          <p className="mt-1 break-words text-sm">{value}</p>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    PROCESSED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    FAILED: "border-rose-200 bg-rose-50 text-rose-700",
    RETRYING: "border-amber-200 bg-amber-50 text-amber-700",
    PENDING: "border-blue-200 bg-blue-50 text-blue-700",
  };
  return <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${styles[value] ?? styles.PENDING}`}>{value}</span>;
}

function entityLink(row: ProviderWebhookEvent) {
  if (!row.entityId || !row.entityType) return "-";
  if (row.entityType === "Invoice") return <Link className="underline" href={`/invoices/${row.entityId}`}>{row.entityId}</Link>;
  if (row.entityType === "InvoiceImportBatch") return <Link className="underline" href={`/invoices/import/batches/${row.entityId}`}>{row.entityId}</Link>;
  return `${row.entityType}:${row.entityId}`;
}
