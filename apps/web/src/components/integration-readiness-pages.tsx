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
  getCounterparties,
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
  EntityPicker,
  Field,
  LinkButton,
  PageHeader,
  StatusMessage,
  type EntityOption,
  inputClass,
} from "./app-shell";

type AnyRecord = Record<string, unknown>;

export function DocumentsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["documents"], queryFn: getDocuments });
  const counterparties = useQuery({ queryKey: ["counterparties"], queryFn: getCounterparties });
  const [file, setFile] = useState<File | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<EntityOption | null>(null);
  const [form, setForm] = useState({
    documentType: "KYC_DOCUMENT",
    title: "",
  });
  const entityOptions = useMemo(
    () =>
      (counterparties.data ?? []).map((counterparty) => ({
        id: counterparty.id,
        label: counterparty.legalName,
        sublabel: `${counterparty.type} · ${counterparty.country}`,
        type: "Counterparty",
      })),
    [counterparties.data],
  );
  const upload = useMutation({
    mutationFn: () => {
      const data = new FormData();
      if (!file) throw new Error("Choose a file first.");
      data.set("file", file);
      for (const [key, value] of Object.entries(form)) {
        if (value) data.set(key, value);
      }
      if (selectedEntity?.type === "Counterparty") {
        data.set("counterpartyId", selectedEntity.id);
      }
      return uploadDocument(data);
    },
    onSuccess: () => {
      setFile(null);
      setSelectedEntity(null);
      return queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
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
          <Field label="Linked entity">
            <EntityPicker
              options={entityOptions}
              value={selectedEntity}
              onChange={setSelectedEntity}
              placeholder="Search counterparty to attach this document..."
            />
          </Field>
          <CreateSummary rows={[
            ["File", file?.name ?? "Not selected"],
            ["Type", form.documentType],
            ["Title", form.title || "-"],
            ["Linked entity", selectedEntity ? `${selectedEntity.type}: ${selectedEntity.label}` : "-"],
          ]} />
          <Button className="mt-4" onClick={() => upload.mutate()} disabled={upload.isPending || !file}>{upload.isPending ? "Uploading..." : "Upload"}</Button>
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
  const counterparties = useQuery({ queryKey: ["counterparties"], queryFn: getCounterparties });
  const [selectedRecipient, setSelectedRecipient] = useState<EntityOption | null>(null);
  const [notificationForm, setNotificationForm] = useState({
    channel: "EMAIL",
    recipient: "ops@example.com",
    templateKey: "general.notice",
    subject: "INVOX notification",
    message: "Hello",
  });
  const [channelFilter, setChannelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [templateFilter, setTemplateFilter] = useState("");
  const create = useMutation({
    mutationFn: () =>
      createNotification({
        ...notificationForm,
        recipient: notificationForm.recipient || selectedRecipient?.sublabel || selectedRecipient?.label,
        counterpartyId: selectedRecipient?.type === "Counterparty" ? selectedRecipient.id : undefined,
        payloadJson: selectedRecipient
          ? { recipientEntityId: selectedRecipient.id, recipientEntityType: selectedRecipient.type }
          : undefined,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const recipientOptions = useMemo(
    () =>
      (counterparties.data ?? []).map((counterparty) => ({
        id: counterparty.id,
        label: counterparty.legalName,
        sublabel: counterparty.contactEmail ?? `${counterparty.type} · ${counterparty.country}`,
        type: "Counterparty",
      })),
    [counterparties.data],
  );
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
          <div className="grid gap-4">
            <Field label="Recipient entity">
              <EntityPicker
                options={recipientOptions}
                value={selectedRecipient}
                onChange={setSelectedRecipient}
                placeholder="Search counterparty recipient..."
              />
            </Field>
            <TextInput label="Recipient address" value={notificationForm.recipient} onChange={(recipient) => setNotificationForm({ ...notificationForm, recipient })} />
            <SelectInput label="Channel" value={notificationForm.channel} onChange={(channel) => setNotificationForm({ ...notificationForm, channel })} options={["EMAIL", "SMS", "IN_APP", "WHATSAPP", "WEBHOOK"]} />
            <SelectInput label="Template" value={notificationForm.templateKey} onChange={(templateKey) => setNotificationForm({ ...notificationForm, templateKey })} options={["general.notice", "payment.created", "kyc.review", "programme.approved", "invoice.exception"]} />
            <TextInput label="Subject" value={notificationForm.subject} onChange={(subject) => setNotificationForm({ ...notificationForm, subject })} />
            <Field label="Message">
              <textarea className={`${inputClass} min-h-24`} value={notificationForm.message} onChange={(event) => setNotificationForm({ ...notificationForm, message: event.target.value })} />
            </Field>
            <CreateSummary rows={[
              ["Recipient", selectedRecipient?.label ?? notificationForm.recipient],
              ["Channel", notificationForm.channel],
              ["Template", notificationForm.templateKey],
              ["Subject", notificationForm.subject],
            ]} />
          </div>
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
  const [form, setForm] = useState({
    name: "Mock Payment",
    providerType: "PAYMENT",
    providerKey: "mock",
    environment: "SANDBOX",
  });
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedJson, setAdvancedJson] = useState("{}");
  const create = useMutation({
    mutationFn: () =>
      createIntegrationConnection({
        ...form,
        configJson: JSON.parse(advancedJson || "{}") as AnyRecord,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["integration-connections"] }),
  });
  return (
    <AppShell>
      <PageHeader title={createMode ? "New Integration Connection" : "Integration Connections"} description="Manage sandbox provider connections without exposing credentials." />
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card>
          <h3 className="mb-4 text-lg font-semibold">Create connection</h3>
          <div className="grid gap-4">
            <SelectInput label="Provider type" value={form.providerType} onChange={(providerType) => setForm({ ...form, providerType })} options={["PAYMENT", "ERP", "EINVOICING", "KYC", "SCREENING", "MESSAGING"]} />
            <TextInput label="Name" value={form.name} onChange={(name) => setForm({ ...form, name })} />
            <TextInput label="Provider key" value={form.providerKey} onChange={(providerKey) => setForm({ ...form, providerKey })} />
            <SelectInput label="Environment" value={form.environment} onChange={(environment) => setForm({ ...form, environment })} options={["SANDBOX", "STAGING", "PRODUCTION"]} />
            <AdvancedJson
              open={advancedOpen}
              onOpenChange={setAdvancedOpen}
              value={advancedJson}
              onChange={setAdvancedJson}
              label="Advanced config"
            />
            <CreateSummary rows={[
              ["Name", form.name],
              ["Provider", `${form.providerType} / ${form.providerKey}`],
              ["Environment", form.environment],
            ]} />
          </div>
          <Button className="mt-4" onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? "Saving..." : "Create connection"}
          </Button>
          {create.error ? <ErrorText error={create.error} /> : null}
        </Card>
        <RecordTable title="Records" query={query} detailBase="/integrations/connections" columns={["name", "providerType", "providerKey", "status", "environment"]} />
      </div>
    </AppShell>
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
  const [form, setForm] = useState({
    name: "Local Test",
    url: "http://localhost:9999/webhook",
    events: ["invoice.approved"],
    payloadTemplate: "{}",
  });
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const create = useMutation({
    mutationFn: () =>
      createWebhookEndpoint({
        name: form.name,
        url: form.url,
        events: form.events,
        secret: advancedOpen
          ? String((JSON.parse(form.payloadTemplate || "{}") as AnyRecord).secret ?? "")
          : undefined,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhook-endpoints"] }),
  });
  return (
    <AppShell>
      <PageHeader title={createMode ? "New Webhook Endpoint" : "Webhook Endpoints"} description="Register signed event destinations and inspect delivery state." />
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card>
          <h3 className="mb-4 text-lg font-semibold">Create endpoint</h3>
          <div className="grid gap-4">
            <TextInput label="Name" value={form.name} onChange={(name) => setForm({ ...form, name })} />
            <TextInput label="URL" value={form.url} onChange={(url) => setForm({ ...form, url })} />
            <EventMultiSelect
              value={form.events}
              onChange={(events) => setForm({ ...form, events })}
            />
            <AdvancedJson
              open={advancedOpen}
              onOpenChange={setAdvancedOpen}
              value={form.payloadTemplate}
              onChange={(payloadTemplate) => setForm({ ...form, payloadTemplate })}
              label="Raw payload template"
            />
            <CreateSummary rows={[
              ["Name", form.name],
              ["URL", form.url],
              ["Events", form.events.join(", ")],
            ]} />
          </div>
          <Button className="mt-4" onClick={() => create.mutate()} disabled={create.isPending || !form.url}>
            {create.isPending ? "Saving..." : "Create endpoint"}
          </Button>
          {create.error ? <ErrorText error={create.error} /> : null}
        </Card>
        <RecordTable title="Records" query={query} detailBase="/webhooks/endpoints" columns={["name", "url", "status", "events", "createdAt"]} />
      </div>
    </AppShell>
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
          <KeyValueGrid row={query.data as AnyRecord} />
          <details className="mt-4 rounded-md border border-border">
            <summary className="cursor-pointer px-3 py-2 text-sm font-semibold">
              Raw response
            </summary>
            <pre className="overflow-auto border-t border-border bg-slate-950 p-4 text-xs text-slate-50">{JSON.stringify(query.data, null, 2)}</pre>
          </details>
        </Card>
      ) : null}
    </AppShell>
  );
}

function KeyValueGrid({ row }: { row: AnyRecord }) {
  const entries = Object.entries(row).filter(([, value]) => {
    if (value === null || value === undefined) return true;
    return typeof value !== "object";
  });
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-md border border-border p-3">
          <p className="text-xs font-medium uppercase text-muted-foreground">{key}</p>
          <p className="mt-1 break-words text-sm">{formatValue(value)}</p>
        </div>
      ))}
    </div>
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

function CreateSummary({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <div className="rounded-md border border-border bg-muted p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Creation summary
      </p>
      <div className="space-y-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-right font-medium">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdvancedJson({
  open,
  onOpenChange,
  value,
  onChange,
  label,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <div className="rounded-md border border-border">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold"
        onClick={() => onOpenChange(!open)}
      >
        <span>{label}</span>
        <span className="text-xs text-muted-foreground">{open ? "Hide" : "Show"}</span>
      </button>
      {open ? (
        <div className="border-t border-border p-3">
          <textarea
            className={`${inputClass} min-h-28 font-mono text-xs`}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      ) : null}
    </div>
  );
}

function EventMultiSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const events = [
    "invoice.approved",
    "invoice.exception",
    "financing.accepted",
    "payment.confirmed",
    "payment.failed",
    "kyc.review_required",
  ];
  return (
    <Field label="Event types">
      <div className="grid gap-2 rounded-md border border-border p-3">
        {events.map((event) => {
          const checked = value.includes(event);
          return (
            <label key={event} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={checked}
                onChange={(inputEvent) => {
                  if (inputEvent.target.checked) {
                    onChange([...value, event]);
                  } else {
                    onChange(value.filter((item) => item !== event));
                  }
                }}
              />
              <span>{event}</span>
            </label>
          );
        })}
      </div>
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
