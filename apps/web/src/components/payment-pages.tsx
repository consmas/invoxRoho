"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  approvePayment,
  confirmPayment,
  createPayment,
  getCounterparties,
  failPayment,
  getPayment,
  getPaymentWebhookEvent,
  getPaymentWebhookEvents,
  getPayments,
  initiateProviderPayment,
  returnPayment,
  submitPaymentForApproval,
  updatePayment,
  verifyProviderPayment,
} from "@/src/lib/api";
import { getApiError } from "@/src/lib/api/client";
import type { Payment, PaymentWebhookEvent } from "@/src/lib/api/types";
import { formatDate, formatMoney } from "@/src/lib/format";
import {
  AppShell,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  EntityPicker,
  LinkButton,
  PageHeader,
  PermissionGate,
  StatusMessage,
  type EntityOption,
  inputClass,
} from "./app-shell";
import { PERMISSIONS } from "@/src/lib/permissions";

const initialPaymentForm = {
  counterpartyId: "",
  direction: "OUTBOUND",
  rail: "SANDBOX",
  currency: "GHS",
  amount: "",
  reference: "PAY-",
  provider: "sandbox",
  valueDate: new Date().toISOString().slice(0, 10),
};

export function PaymentsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["payments"], queryFn: getPayments });
  const counterparties = useQuery({ queryKey: ["counterparties"], queryFn: getCounterparties });
  const [form, setForm] = useState(initialPaymentForm);
  const [selectedCounterparty, setSelectedCounterparty] = useState<EntityOption | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const create = useMutation({
    mutationFn: () =>
      createPayment({
        ...form,
        counterpartyId: selectedCounterparty?.id || undefined,
        amount: Number(form.amount),
        status: "INITIATED",
        valueDate: new Date(form.valueDate).toISOString(),
      }),
    onSuccess: () => {
      setForm(initialPaymentForm);
      setSelectedCounterparty(null);
      return queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });
  const counterpartyOptions = useMemo(
    () =>
      (counterparties.data ?? []).map((counterparty) => ({
        id: counterparty.id,
        label: counterparty.legalName,
        sublabel: `${counterparty.type} · ${counterparty.country}`,
        type: "Counterparty",
      })),
    [counterparties.data],
  );
  const rows = useMemo(() => {
    return (query.data ?? []).filter((row) => {
      const statusMatch = !statusFilter || row.status === statusFilter;
      const providerMatch = !providerFilter || row.provider === providerFilter;
      return statusMatch && providerMatch;
    });
  }, [query.data, providerFilter, statusFilter]);
  const pending = (query.data ?? []).filter((row) => ["INITIATED", "SENT"].includes(row.status)).length;
  const failed = (query.data ?? []).filter((row) => row.status === "FAILED").length;
  const confirmed = (query.data ?? []).filter((row) => row.status === "CONFIRMED").length;
  return (
    <AppShell>
      <PageHeader
        title="Payments"
        description="Sandbox provider payment initiation, verification, approval, returns, ledger posting and reconciliation state."
      />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <MetricCard label="Pending provider payments" value={pending} />
        <MetricCard label="Failed payments" value={failed} />
        <MetricCard label="Confirmed payments" value={confirmed} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <PermissionGate permission={PERMISSIONS.paymentsCreate}>
          <Card>
            <h3 className="mb-4 text-lg font-semibold">Create payment</h3>
            <div className="grid gap-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">Counterparty</span>
                <EntityPicker
                  options={counterpartyOptions}
                  value={selectedCounterparty}
                  onChange={setSelectedCounterparty}
                  placeholder="Search counterparty receiving or sending payment..."
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <TextInput label="Amount" value={form.amount} onChange={(amount) => setForm({ ...form, amount })} />
                <SelectInput label="Currency" value={form.currency} onChange={(currency) => setForm({ ...form, currency })} options={["GHS", "USD", "EUR", "GBP"]} />
              </div>
              <SelectInput label="Provider" value={form.provider} onChange={(provider) => setForm({ ...form, provider })} options={["sandbox", "bank", "mobile_money"]} />
              <SelectInput label="Payment type" value={form.direction} onChange={(direction) => setForm({ ...form, direction })} options={["OUTBOUND", "INBOUND"]} />
              <TextInput label="Reference" value={form.reference} onChange={(reference) => setForm({ ...form, reference })} />
              <TextInput label="Value date" value={form.valueDate} onChange={(valueDate) => setForm({ ...form, valueDate })} type="date" />
              <CreateSummary
                rows={[
                  ["Counterparty", selectedCounterparty?.label ?? "Not selected"],
                  ["Amount", form.amount ? formatMoney(form.amount, form.currency) : "-"],
                  ["Provider", form.provider],
                  ["Type", form.direction],
                ]}
              />
            </div>
            <Button
              className="mt-4"
              variant="brass"
              onClick={() => setConfirmOpen(true)}
              disabled={create.isPending || !selectedCounterparty || !Number(form.amount)}
            >
              {create.isPending ? "Creating..." : "Create payment"}
            </Button>
            <ConfirmDialog
              open={confirmOpen}
              onOpenChange={setConfirmOpen}
              title="Confirm payment creation"
              description={`Initiate payment of ${form.amount ? formatMoney(form.amount, form.currency) : `${form.currency} 0.00`} ${form.direction === "OUTBOUND" ? "to" : "from"} ${selectedCounterparty?.label ?? "the selected counterparty"} through ${form.provider}? This cannot be reversed once sent to the payment provider.`}
              confirmLabel="Create payment"
              tone="brass"
              onConfirm={() => create.mutate()}
            />
            {create.isError ? <ErrorText error={create.error} /> : null}
          </Card>
        </PermissionGate>
        <Card>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={["", "INITIATED", "SENT", "CONFIRMED", "FAILED", "RETURNED"]}
            />
            <FilterSelect
              label="Provider"
              value={providerFilter}
              onChange={setProviderFilter}
              options={["", "sandbox"]}
            />
          </div>
          <StatusMessage
            loading={query.isLoading}
            error={query.isError ? getApiError(query.error) : undefined}
            empty={rows.length === 0 ? "No payments match the filters." : undefined}
          />
          {rows.length ? <PaymentsTable rows={rows} /> : null}
        </Card>
      </div>
    </AppShell>
  );
}

export function PaymentDetailPage({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["payments", id], queryFn: () => getPayment(id) });
  const [patchJson, setPatchJson] = useState("{}");
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["payments", id] });
  const submit = useMutation({ mutationFn: () => submitPaymentForApproval(id), onSuccess: invalidate });
  const approve = useMutation({ mutationFn: () => approvePayment(id), onSuccess: invalidate });
  const initiate = useMutation({ mutationFn: () => initiateProviderPayment(id), onSuccess: invalidate });
  const verify = useMutation({ mutationFn: () => verifyProviderPayment(id), onSuccess: invalidate });
  const confirm = useMutation({ mutationFn: () => confirmPayment(id), onSuccess: invalidate });
  const fail = useMutation({ mutationFn: () => failPayment(id), onSuccess: invalidate });
  const markReturned = useMutation({ mutationFn: () => returnPayment(id), onSuccess: invalidate });
  const update = useMutation({
    mutationFn: () => updatePayment(id, JSON.parse(patchJson) as Record<string, unknown>),
    onSuccess: invalidate,
  });
  return (
    <AppShell>
      <PageHeader title="Payment Detail" action={<LinkButton href="/payments">Back</LinkButton>} />
      <StatusMessage loading={query.isLoading} error={query.isError ? getApiError(query.error) : undefined} />
      {query.data ? (
        <div className="grid gap-6">
          <Card>
            <ActionRow>
              <PermissionGate permission={PERMISSIONS.paymentsSubmitForApproval}>
                <Button onClick={() => submit.mutate()} disabled={submit.isPending}>Submit for approval</Button>
              </PermissionGate>
              <PermissionGate permission={PERMISSIONS.paymentsApprove}>
                <Button onClick={() => approve.mutate()} disabled={approve.isPending}>Approve</Button>
              </PermissionGate>
              <PermissionGate permission={PERMISSIONS.paymentsInitiateProvider}>
                <Button onClick={() => initiate.mutate()} disabled={initiate.isPending}>Initiate provider payment</Button>
              </PermissionGate>
              <PermissionGate permission={PERMISSIONS.paymentsVerifyProvider}>
                <Button onClick={() => verify.mutate()} disabled={verify.isPending}>Verify provider payment</Button>
              </PermissionGate>
              <PermissionGate permission={PERMISSIONS.paymentsConfirm}>
                <Button onClick={() => confirm.mutate()} disabled={confirm.isPending}>Manual confirm</Button>
              </PermissionGate>
              <PermissionGate permission={PERMISSIONS.paymentsFail}>
                <Button variant="secondary" onClick={() => fail.mutate()} disabled={fail.isPending}>Fail</Button>
              </PermissionGate>
              <PermissionGate permission={PERMISSIONS.paymentsReturn}>
                <Button variant="danger" onClick={() => markReturned.mutate()} disabled={markReturned.isPending}>Return</Button>
              </PermissionGate>
            </ActionRow>
            <PaymentSummary row={query.data} />
            <ErrorStack errors={[submit.error, approve.error, initiate.error, verify.error, confirm.error, fail.error, markReturned.error]} />
          </Card>
          <PermissionGate permission={PERMISSIONS.paymentsUpdate}>
            <Card>
              <h3 className="mb-4 text-lg font-semibold">Patch payment</h3>
              <textarea
                className={`${inputClass} min-h-48 font-mono text-xs`}
                value={patchJson}
                onChange={(event) => setPatchJson(event.target.value)}
              />
              <Button className="mt-4" onClick={() => update.mutate()} disabled={update.isPending}>
                {update.isPending ? "Updating..." : "Update payment"}
              </Button>
              {update.isError ? <ErrorText error={update.error} /> : null}
            </Card>
          </PermissionGate>
          <PaymentRelated row={query.data} />
        </div>
      ) : null}
    </AppShell>
  );
}

export function PaymentWebhookEventsPage() {
  const query = useQuery({ queryKey: ["payment-webhook-events"], queryFn: getPaymentWebhookEvents });
  const rows = query.data ?? [];
  return (
    <AppShell>
      <PageHeader title="Payment Webhook Events" description="Inbound sandbox payment callback audit and processing state." />
      <StatusMessage
        loading={query.isLoading}
        error={query.isError ? getApiError(query.error) : undefined}
        empty={rows.length === 0 ? "No payment webhook events yet." : undefined}
      />
      {rows.length ? (
        <DataTable headers={["Provider", "Event", "Reference", "Payment", "Signature", "Processed", "Received", "Actions"]}>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3">{row.provider}</td>
              <td className="px-4 py-3">{row.eventType}</td>
              <td className="px-4 py-3">{row.eventReference}</td>
              <td className="px-4 py-3">{row.paymentId ? <Link className="underline" href={`/payments/${row.paymentId}`}>{row.paymentId}</Link> : "-"}</td>
              <td className="px-4 py-3">{row.signatureValid ? "Valid" : "Invalid"}</td>
              <td className="px-4 py-3">{row.processed ? "Yes" : "No"}</td>
              <td className="px-4 py-3">{formatDate(row.receivedAt)}</td>
              <td className="px-4 py-3"><Link className="font-medium underline" href={`/webhooks/payments/${row.id}`}>View</Link></td>
            </tr>
          ))}
        </DataTable>
      ) : null}
    </AppShell>
  );
}

export function PaymentWebhookEventDetailPage({ id }: { id: string }) {
  const query = useQuery({ queryKey: ["payment-webhook-events", id], queryFn: () => getPaymentWebhookEvent(id) });
  return (
    <AppShell>
      <PageHeader title="Payment Webhook Event" action={<LinkButton href="/webhooks/payments">Back</LinkButton>} />
      <StatusMessage loading={query.isLoading} error={query.isError ? getApiError(query.error) : undefined} />
      {query.data ? (
        <Card>
          <WebhookSummary row={query.data} />
          <pre className="mt-4 overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-50">
            {JSON.stringify(query.data, null, 2)}
          </pre>
        </Card>
      ) : null}
    </AppShell>
  );
}

function PaymentsTable({ rows }: { rows: Payment[] }) {
  return (
    <DataTable headers={["Reference", "Direction", "Amount", "Status", "Provider", "Provider ref", "Value date", "Actions"]}>
      {rows.map((row) => (
        <tr key={row.id}>
          <td className="px-4 py-3">{row.reference ?? row.id}</td>
          <td className="px-4 py-3">{row.direction}</td>
          <td className="px-4 py-3">{formatMoney(row.amount, row.currency)}</td>
          <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
          <td className="px-4 py-3">{row.provider ?? "-"}</td>
          <td className="px-4 py-3">{row.providerReference ?? "-"}</td>
          <td className="px-4 py-3">{formatDate(row.valueDate)}</td>
          <td className="px-4 py-3"><Link className="font-medium underline" href={`/payments/${row.id}`}>View</Link></td>
        </tr>
      ))}
    </DataTable>
  );
}

function PaymentSummary({ row }: { row: Payment }) {
  const items: [string, React.ReactNode][] = [
    ["Reference", row.reference ?? "-"],
    ["Status", <StatusBadge key="status" status={row.status} />],
    ["Direction", row.direction],
    ["Rail", row.rail],
    ["Amount", formatMoney(row.amount, row.currency)],
    ["Provider", row.provider ?? "-"],
    ["Provider status", row.providerStatus ?? "-"],
    ["Provider reference", row.providerReference ?? "-"],
    ["External transaction", row.externalTransactionId ?? "-"],
    ["Idempotency key", row.idempotencyKey ?? "-"],
    ["Webhook reference", row.webhookReference ?? "-"],
    ["Financing transaction", row.financingTransactionId ? <Link className="underline" href={`/financing/${row.financingTransactionId}`}>{row.financingTransactionId}</Link> : "-"],
    ["Counterparty", row.counterparty?.legalName ?? row.counterpartyId ?? "-"],
    ["Value date", formatDate(row.valueDate)],
    ["Initiated at", formatDate(row.initiatedAt)],
    ["Verified at", formatDate(row.verifiedAt)],
    ["Approved at", formatDate(row.approvedAt)],
    ["Confirmed at", formatDate(row.confirmedAt)],
    ["Webhook received", formatDate(row.webhookReceivedAt)],
    ["Last provider check", formatDate(row.lastProviderCheckAt)],
    ["Failure reason", row.failureReason ?? "-"],
    ["Return reason", row.reversalReason ?? "-"],
  ];
  return <DetailsGrid rows={items} />;
}

function PaymentRelated({ row }: { row: Payment }) {
  return (
    <div className="grid gap-6">
      <Card>
        <h3 className="mb-4 text-lg font-semibold">Ledger entries</h3>
        {row.ledgerEntries?.length ? (
          <DataTable headers={["Account", "Type", "Amount", "Description", "Posted"]}>
            {row.ledgerEntries.map((entry) => (
              <tr key={entry.id}>
                <td className="px-4 py-3">{entry.account?.code ?? entry.accountId}</td>
                <td className="px-4 py-3">{entry.entryType}</td>
                <td className="px-4 py-3">{formatMoney(entry.amount, entry.currency)}</td>
                <td className="px-4 py-3">{entry.description ?? "-"}</td>
                <td className="px-4 py-3">{formatDate(entry.postedAt)}</td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <p className="text-sm text-muted-foreground">No ledger entries posted for this payment.</p>
        )}
      </Card>
      <Card>
        <h3 className="mb-4 text-lg font-semibold">Webhook events</h3>
        {row.webhookEvents?.length ? (
          <DataTable headers={["Provider", "Event", "Reference", "Signature", "Processed", "Received"]}>
            {row.webhookEvents.map((event) => (
              <tr key={event.id}>
                <td className="px-4 py-3">{event.provider}</td>
                <td className="px-4 py-3">{event.eventType}</td>
                <td className="px-4 py-3">{event.eventReference}</td>
                <td className="px-4 py-3">{event.signatureValid ? "Valid" : "Invalid"}</td>
                <td className="px-4 py-3">{event.processed ? "Yes" : "No"}</td>
                <td className="px-4 py-3">{formatDate(event.receivedAt)}</td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <p className="text-sm text-muted-foreground">No webhook events received for this payment.</p>
        )}
      </Card>
    </div>
  );
}

function WebhookSummary({ row }: { row: PaymentWebhookEvent }) {
  return (
    <DetailsGrid
      rows={[
        ["Provider", row.provider],
        ["Event type", row.eventType],
        ["Event reference", row.eventReference],
        ["Provider reference", row.providerReference ?? "-"],
        ["Payment", row.paymentId ? <Link className="underline" href={`/payments/${row.paymentId}`}>{row.paymentId}</Link> : "-"],
        ["Signature", row.signatureValid ? "Valid" : "Invalid"],
        ["Processed", row.processed ? "Yes" : "No"],
        ["Processed at", formatDate(row.processedAt)],
        ["Processing error", row.processingError ?? "-"],
        ["Received at", formatDate(row.receivedAt)],
      ]}
    />
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

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </Card>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <select className={inputClass} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option || "all"} value={option}>
            {option || "All"}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input
        className={inputClass}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <select className={inputClass} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    CONFIRMED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    FAILED: "border-rose-200 bg-rose-50 text-rose-700",
    RETURNED: "border-slate-200 bg-slate-50 text-slate-700",
    SENT: "border-blue-200 bg-blue-50 text-blue-700",
    INITIATED: "border-amber-200 bg-amber-50 text-amber-700",
  };
  return <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${styles[status] ?? styles.INITIATED}`}>{status}</span>;
}

function ActionRow({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 flex flex-wrap gap-3">{children}</div>;
}

function ErrorText({ error }: { error: unknown }) {
  return <p className="mt-3 text-sm text-rose-700">{getApiError(error)}</p>;
}

function ErrorStack({ errors }: { errors: unknown[] }) {
  return (
    <>
      {errors.filter(Boolean).map((error, index) => (
        <ErrorText key={index} error={error} />
      ))}
    </>
  );
}
