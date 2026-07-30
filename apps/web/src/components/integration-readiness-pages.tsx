"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  cancelNotification,
  cancelWebhookDelivery,
  createIntegrationConnection,
  createNotification,
  createWebhookEndpoint,
  deleteDocument,
  deleteWebhookEndpoint,
  disableIntegrationConnection,
  enableIntegrationConnection,
  getDocument,
  getDocumentDownloadUrl,
  getDocuments,
  getIntegrationConnection,
  getIntegrationConnections,
  getIntegrationLog,
  getIntegrationLogs,
  getNotification,
  getNotifications,
  getWebhookDeliveries,
  getWebhookDelivery,
  getWebhookEndpoint,
  getWebhookEndpoints,
  rejectDocument,
  retryNotification,
  retryWebhookDelivery,
  sendNotification,
  testIntegrationConnection,
  uploadDocument,
  verifyDocument,
} from "@/src/lib/api";
import { getApiError } from "@/src/lib/api/client";
import {
  AppShell,
  Button,
  Card,
  DataTable,
  Field,
  LinkButton,
  PageHeader,
  StatusMessage,
  inputClass,
} from "./app-shell";

type AnyRecord = Record<string, unknown>;

export function DocumentsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["documents"], queryFn: getDocuments });
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    documentType: "KYC_DOCUMENT",
    title: "",
    counterpartyId: "",
    programmeId: "",
    invoiceId: "",
    financingTransactionId: "",
  });
  const upload = useMutation({
    mutationFn: () => {
      const data = new FormData();
      if (!file) throw new Error("Choose a file first.");
      data.set("file", file);
      for (const [key, value] of Object.entries(form)) {
        if (value) data.set(key, value);
      }
      return uploadDocument(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });
  return (
    <AppShell>
      <PageHeader title="Documents" description="Upload, verify, reject, download and soft-delete document metadata." />
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card>
          <h3 className="mb-4 text-lg font-semibold">Upload document</h3>
          <Field label="File"><input className={inputClass} type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></Field>
          <TextInput label="Document type" value={form.documentType} onChange={(value) => setForm({ ...form, documentType: value })} />
          <TextInput label="Title" value={form.title} onChange={(value) => setForm({ ...form, title: value })} />
          <TextInput label="Counterparty ID" value={form.counterpartyId} onChange={(value) => setForm({ ...form, counterpartyId: value })} />
          <TextInput label="Programme ID" value={form.programmeId} onChange={(value) => setForm({ ...form, programmeId: value })} />
          <TextInput label="Invoice ID" value={form.invoiceId} onChange={(value) => setForm({ ...form, invoiceId: value })} />
          <TextInput label="Financing ID" value={form.financingTransactionId} onChange={(value) => setForm({ ...form, financingTransactionId: value })} />
          <Button onClick={() => upload.mutate()} disabled={upload.isPending}>{upload.isPending ? "Uploading..." : "Upload"}</Button>
          {upload.isError ? <ErrorText error={upload.error} /> : null}
        </Card>
        <RecordTable
          title="Document records"
          query={query}
          detailBase="/documents"
          columns={["title", "documentType", "status", "storageProvider", "mimeType", "sizeBytes", "checksum", "counterpartyId", "invoiceId", "createdAt"]}
        />
      </div>
    </AppShell>
  );
}

export function DocumentDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["documents", id], queryFn: () => getDocument(id) });
  const verify = useMutation({ mutationFn: () => verifyDocument(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents", id] }) });
  const reject = useMutation({ mutationFn: () => rejectDocument(id, { reason: "Rejected from document management" }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents", id] }) });
  const remove = useMutation({ mutationFn: () => deleteDocument(id), onSuccess: () => router.push("/documents") });
  const download = useMutation({
    mutationFn: () => getDocumentDownloadUrl(id),
    onSuccess: (result) => {
      window.open(result.downloadUrl, "_blank", "noopener,noreferrer");
    },
  });
  return (
    <DetailShell title="Document Detail" back="/documents" query={query}>
      <ActionRow>
        <Button onClick={() => download.mutate()} disabled={download.isPending}>Download</Button>
        <Button onClick={() => verify.mutate()} disabled={verify.isPending}>Verify</Button>
        <Button onClick={() => reject.mutate()} disabled={reject.isPending}>Reject</Button>
        <Button onClick={() => remove.mutate()} disabled={remove.isPending}>Delete</Button>
      </ActionRow>
    </DetailShell>
  );
}

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["notifications"], queryFn: getNotifications });
  const [json, setJson] = useState('{"channel":"EMAIL","recipient":"ops@example.com","subject":"Test","message":"Hello"}');
  const [channelFilter, setChannelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [templateFilter, setTemplateFilter] = useState("");
  const create = useMutation({
    mutationFn: () => createNotification(JSON.parse(json) as AnyRecord),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const rows = useMemo(() => {
    return ((query.data ?? []) as AnyRecord[]).filter((row) => {
      const channelMatch = !channelFilter || row.channel === channelFilter;
      const statusMatch = !statusFilter || row.status === statusFilter;
      const templateMatch = !templateFilter || String(row.templateKey ?? "").includes(templateFilter);
      return channelMatch && statusMatch && templateMatch;
    });
  }, [query.data, channelFilter, statusFilter, templateFilter]);
  const sentToday = ((query.data ?? []) as AnyRecord[]).filter((row) => {
    if (row.status !== "SENT" || !row.sentAt) return false;
    return new Date(String(row.sentAt)).toDateString() === new Date().toDateString();
  }).length;
  const pending = ((query.data ?? []) as AnyRecord[]).filter((row) => row.status === "PENDING" || row.status === "SENDING" || row.status === "RETRYING").length;
  const failed = ((query.data ?? []) as AnyRecord[]).filter((row) => row.status === "FAILED").length;
  return (
    <AppShell>
      <PageHeader title="Notifications" description="Create, send, retry and cancel notification deliveries." />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <MetricCard label="Pending notifications" value={pending} />
        <MetricCard label="Failed notifications" value={failed} />
        <MetricCard label="Sent today" value={sentToday} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card>
          <h3 className="mb-4 text-lg font-semibold">Create notification</h3>
          <textarea className={`${inputClass} min-h-52 font-mono`} value={json} onChange={(event) => setJson(event.target.value)} />
          <Button className="mt-4" onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? "Creating..." : "Create notification"}
          </Button>
          {create.isError ? <ErrorText error={create.error} /> : null}
        </Card>
        <Card>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <SelectInput label="Channel" value={channelFilter} onChange={setChannelFilter} options={["", "EMAIL", "SMS", "IN_APP", "WHATSAPP", "WEBHOOK"]} />
            <SelectInput label="Status" value={statusFilter} onChange={setStatusFilter} options={["", "PENDING", "SENDING", "RETRYING", "SENT", "FAILED", "CANCELLED"]} />
            <TextInput label="Template key" value={templateFilter} onChange={setTemplateFilter} />
          </div>
          <StatusMessage loading={query.isLoading} error={query.isError ? getApiError(query.error) : undefined} empty={rows.length === 0 ? "No notifications match the filters." : undefined} />
          {rows.length ? (
            <DataTable headers={["Status", "Channel", "Recipient", "Template", "Provider", "Provider message ID", "Attempts", "Last attempt", "Failure", "Actions"]}>
              {rows.map((row, index) => (
                <tr key={String(row.id ?? index)}>
                  <td className="px-4 py-3"><StatusBadge value={row.status} /></td>
                  <td className="px-4 py-3">{formatValue(row.channel)}</td>
                  <td className="px-4 py-3">{formatValue(row.recipient)}</td>
                  <td className="px-4 py-3">{formatValue(row.templateKey)}</td>
                  <td className="px-4 py-3">{formatValue(row.provider)}</td>
                  <td className="px-4 py-3">{formatValue(row.providerMessageId)}</td>
                  <td className="px-4 py-3">{formatValue(row.attempts)}</td>
                  <td className="px-4 py-3">{formatValue(row.lastAttemptAt)}</td>
                  <td className="px-4 py-3">{formatValue(row.failureReason)}</td>
                  <td className="px-4 py-3">{row.id ? <Link className="font-medium underline" href={`/notifications/${row.id}`}>View</Link> : null}</td>
                </tr>
              ))}
            </DataTable>
          ) : null}
        </Card>
      </div>
    </AppShell>
  );
}

export function NotificationDetailPage({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["notifications", id], queryFn: () => getNotification(id) });
  const send = useMutation({ mutationFn: () => sendNotification(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", id] }) });
  const retry = useMutation({ mutationFn: () => retryNotification(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", id] }) });
  const cancel = useMutation({ mutationFn: () => cancelNotification(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", id] }) });
  return (
    <DetailShell title="Notification Detail" back="/notifications" query={query}>
      <ActionRow>
        <Button onClick={() => send.mutate()} disabled={send.isPending}>Send</Button>
        <Button onClick={() => retry.mutate()} disabled={retry.isPending}>Retry</Button>
        <Button onClick={() => cancel.mutate()} disabled={cancel.isPending}>Cancel</Button>
      </ActionRow>
      {query.data ? <NotificationSummary row={query.data as AnyRecord} /> : null}
    </DetailShell>
  );
}

export function IntegrationConnectionsPage({ createMode = false }: { createMode?: boolean }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["integration-connections"], queryFn: getIntegrationConnections });
  const [json, setJson] = useState('{"name":"Mock Payment","providerType":"PAYMENT","providerKey":"mock","environment":"SANDBOX"}');
  const create = useMutation({
    mutationFn: () => createIntegrationConnection(JSON.parse(json) as AnyRecord),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["integration-connections"] }),
  });
  return (
    <JsonCreateListPage
      title={createMode ? "New Integration Connection" : "Integration Connections"}
      description="Manage sandbox provider connections without exposing credentials."
      json={json}
      setJson={setJson}
      createLabel="Create connection"
      create={() => create.mutate()}
      createPending={create.isPending}
      createError={create.error}
      query={query}
      detailBase="/integrations/connections"
      columns={["name", "providerType", "providerKey", "status", "environment"]}
    />
  );
}

export function IntegrationConnectionDetailPage({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["integration-connections", id], queryFn: () => getIntegrationConnection(id) });
  const test = useMutation({ mutationFn: () => testIntegrationConnection(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["integration-connections", id] }) });
  const enable = useMutation({ mutationFn: () => enableIntegrationConnection(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["integration-connections", id] }) });
  const disable = useMutation({ mutationFn: () => disableIntegrationConnection(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["integration-connections", id] }) });
  return (
    <DetailShell title="Integration Connection" back="/integrations/connections" query={query}>
      <ActionRow>
        <Button onClick={() => test.mutate()} disabled={test.isPending}>Test</Button>
        <Button onClick={() => enable.mutate()} disabled={enable.isPending}>Enable</Button>
        <Button onClick={() => disable.mutate()} disabled={disable.isPending}>Disable</Button>
      </ActionRow>
    </DetailShell>
  );
}

export function IntegrationLogsPage() {
  const query = useQuery({ queryKey: ["integration-logs"], queryFn: getIntegrationLogs });
  return (
    <AppShell>
      <PageHeader title="Integration Logs" description="Masked request and response logs for provider calls." />
      <RecordTable title="Logs" query={query} detailBase="/integrations/logs" columns={["providerType", "operation", "status", "entityType", "createdAt"]} />
    </AppShell>
  );
}

export function IntegrationLogDetailPage({ id }: { id: string }) {
  const query = useQuery({ queryKey: ["integration-logs", id], queryFn: () => getIntegrationLog(id) });
  return <DetailShell title="Integration Log" back="/integrations/logs" query={query} />;
}

export function WebhookEndpointsPage({ createMode = false }: { createMode?: boolean }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["webhook-endpoints"], queryFn: getWebhookEndpoints });
  const [json, setJson] = useState('{"name":"Local Test","url":"http://localhost:9999/webhook","events":["invoice.approved"]}');
  const create = useMutation({
    mutationFn: () => createWebhookEndpoint(JSON.parse(json) as AnyRecord),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhook-endpoints"] }),
  });
  return (
    <JsonCreateListPage
      title={createMode ? "New Webhook Endpoint" : "Webhook Endpoints"}
      description="Register signed event destinations and inspect delivery state."
      json={json}
      setJson={setJson}
      createLabel="Create endpoint"
      create={() => create.mutate()}
      createPending={create.isPending}
      createError={create.error}
      query={query}
      detailBase="/webhooks/endpoints"
      columns={["name", "url", "status", "events", "createdAt"]}
    />
  );
}

export function WebhookEndpointDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const query = useQuery({ queryKey: ["webhook-endpoints", id], queryFn: () => getWebhookEndpoint(id) });
  const remove = useMutation({ mutationFn: () => deleteWebhookEndpoint(id), onSuccess: () => router.push("/webhooks/endpoints") });
  return (
    <DetailShell title="Webhook Endpoint" back="/webhooks/endpoints" query={query}>
      <ActionRow><Button onClick={() => remove.mutate()} disabled={remove.isPending}>Disable</Button></ActionRow>
    </DetailShell>
  );
}

export function WebhookDeliveriesPage() {
  const query = useQuery({ queryKey: ["webhook-deliveries"], queryFn: getWebhookDeliveries });
  return (
    <AppShell>
      <PageHeader title="Webhook Deliveries" description="Delivery attempts, retry state, responses and failures." />
      <RecordTable title="Deliveries" query={query} detailBase="/webhooks/deliveries" columns={["eventType", "status", "attempts", "responseStatus", "createdAt"]} />
    </AppShell>
  );
}

export function WebhookDeliveryDetailPage({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["webhook-deliveries", id], queryFn: () => getWebhookDelivery(id) });
  const retry = useMutation({ mutationFn: () => retryWebhookDelivery(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhook-deliveries", id] }) });
  const cancel = useMutation({ mutationFn: () => cancelWebhookDelivery(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhook-deliveries", id] }) });
  return (
    <DetailShell title="Webhook Delivery" back="/webhooks/deliveries" query={query}>
      <ActionRow>
        <Button onClick={() => retry.mutate()} disabled={retry.isPending}>Retry</Button>
        <Button onClick={() => cancel.mutate()} disabled={cancel.isPending}>Cancel</Button>
      </ActionRow>
    </DetailShell>
  );
}

function JsonCreateListPage({
  title,
  description,
  json,
  setJson,
  createLabel,
  create,
  createPending,
  createError,
  query,
  detailBase,
  columns,
}: {
  title: string;
  description: string;
  json: string;
  setJson: (value: string) => void;
  createLabel: string;
  create: () => void;
  createPending: boolean;
  createError: unknown;
  query: ReturnType<typeof useQuery<unknown[], Error>>;
  detailBase: string;
  columns: string[];
}) {
  return (
    <AppShell>
      <PageHeader title={title} description={description} />
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card>
          <textarea className={`${inputClass} min-h-56 font-mono text-xs`} value={json} onChange={(event) => setJson(event.target.value)} />
          <div className="mt-4"><Button onClick={create} disabled={createPending}>{createPending ? "Saving..." : createLabel}</Button></div>
          {createError ? <ErrorText error={createError} /> : null}
        </Card>
        <RecordTable title="Records" query={query} detailBase={detailBase} columns={columns} />
      </div>
    </AppShell>
  );
}

function RecordTable({ title, query, detailBase, columns }: { title: string; query: ReturnType<typeof useQuery<unknown[], Error>>; detailBase: string; columns: string[] }) {
  const rows = (query.data ?? []) as AnyRecord[];
  return (
    <Card>
      <h3 className="mb-4 text-lg font-semibold">{title}</h3>
      <StatusMessage loading={query.isLoading} error={query.isError ? getApiError(query.error) : undefined} empty={rows.length === 0 ? "No records yet." : undefined} />
      {rows.length ? (
        <DataTable headers={[...columns, "Actions"]}>
          {rows.map((row, index) => (
            <tr key={String(row.id ?? index)}>
              {columns.map((column) => <td className="px-4 py-3" key={column}>{formatValue(row[column])}</td>)}
              <td className="px-4 py-3">{row.id ? <Link className="font-medium underline" href={`${detailBase}/${row.id}`}>View</Link> : null}</td>
            </tr>
          ))}
        </DataTable>
      ) : null}
    </Card>
  );
}

function DetailShell({ title, back, query, children }: { title: string; back: string; query: ReturnType<typeof useQuery<unknown, Error>>; children?: React.ReactNode }) {
  return (
    <AppShell>
      <PageHeader title={title} action={<LinkButton href={back}>Back</LinkButton>} />
      <StatusMessage loading={query.isLoading} error={query.isError ? getApiError(query.error) : undefined} />
      {query.data ? (
        <Card>
          {children}
          <pre className="mt-4 overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-50">{JSON.stringify(query.data, null, 2)}</pre>
        </Card>
      ) : null}
    </AppShell>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <Field label={label}><input className={inputClass} value={value} onChange={(event) => onChange(event.target.value)} /></Field>;
}

function SelectInput({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <Field label={label}>
      <select className={inputClass} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option || "all"} value={option}>{option || "All"}</option>
        ))}
      </select>
    </Field>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </Card>
  );
}

function StatusBadge({ value }: { value: unknown }) {
  const status = String(value ?? "UNKNOWN");
  const styles: Record<string, string> = {
    SENT: "border-emerald-200 bg-emerald-50 text-emerald-700",
    DELIVERED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    FAILED: "border-rose-200 bg-rose-50 text-rose-700",
    CANCELLED: "border-slate-200 bg-slate-50 text-slate-700",
    SENDING: "border-blue-200 bg-blue-50 text-blue-700",
    RETRYING: "border-amber-200 bg-amber-50 text-amber-700",
    PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  };
  return <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${styles[status] ?? styles.PENDING}`}>{status}</span>;
}

function NotificationSummary({ row }: { row: AnyRecord }) {
  const items: [string, unknown][] = [
    ["Recipient", row.recipient],
    ["Channel", row.channel],
    ["Status", row.status],
    ["Template", row.templateKey],
    ["Provider", row.provider],
    ["Provider message ID", row.providerMessageId],
    ["Attempts", row.attempts],
    ["Last attempt", row.lastAttemptAt],
    ["Sent at", row.sentAt],
    ["Failed at", row.failedAt],
    ["Failure reason", row.failureReason],
  ];
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={String(label)} className="rounded-md border border-border p-3">
          <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
          <p className="mt-1 break-words text-sm">{label === "Status" ? <StatusBadge value={value} /> : formatValue(value)}</p>
        </div>
      ))}
    </div>
  );
}

function ActionRow({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 flex flex-wrap gap-3">{children}</div>;
}

function ErrorText({ error }: { error: unknown }) {
  return <p className="mt-3 text-sm text-rose-700">{getApiError(error)}</p>;
}

function formatValue(value: unknown) {
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  if (value == null || value === "") return "-";
  return String(value);
}
