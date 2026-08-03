"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { getAuditLogs } from "@/src/lib/api";
import { getApiError } from "@/src/lib/api/client";
import { formatDate } from "@/src/lib/format";
import {
  AppShell,
  Button,
  Card,
  DataTable,
  Field,
  PageHeader,
  StatusBadge,
  StatusMessage,
  inputClass,
} from "./app-shell";

type Row = Record<string, unknown>;

const workflowSteps = [
  ["Request received", "Capture anchor, supplier, funder or investor intent and source channel."],
  ["KYB profile", "Record company registration, tax ID, beneficial owners and sanctions screening scope."],
  ["Documents", "Collect incorporation, board mandate, invoices, bank details and programme-specific files."],
  ["Risk review", "Route credit, compliance and operations decisions through maker-checker approvals."],
  ["Invite users", "Issue role-scoped user access after counterparty approval and programme assignment."],
];

export function OnboardingWorkspacePage() {
  const [form, setForm] = useState({
    counterpartyClass: "ANCHOR",
    legalName: "",
    email: "",
    reviewTrack: "FULL_KYB_AML",
  });
  const [drafts, setDrafts] = useState<Row[]>([]);

  const createDraft = () => {
    const legalName = form.legalName.trim();
    const email = form.email.trim();
    if (!legalName || !email) return;
    setDrafts((current) => [
      {
        id: `INTAKE-${String(current.length + 1).padStart(3, "0")}`,
        ...form,
        legalName,
        email,
        status: "DRAFT",
      },
      ...current,
    ]);
    setForm((current) => ({ ...current, legalName: "", email: "" }));
  };

  return (
    <AppShell>
      <PageHeader
        title="Onboarding & KYC"
        description="Guided intake workspace for anchors, suppliers, funders and investors before programme activation."
        action={<Link href="/counterparties/new" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Create counterparty</Link>}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card>
          <h3 className="text-lg font-semibold">Intake checklist</h3>
          <div className="mt-4 space-y-3">
            {workflowSteps.map(([title, description], index) => (
              <div key={title} className="grid gap-3 rounded-md border border-border p-4 sm:grid-cols-[40px_1fr_auto] sm:items-center">
                <div className="flex size-9 items-center justify-center rounded-md bg-muted text-sm font-semibold">{index + 1}</div>
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                </div>
                <StatusBadge value={index < 2 ? "Configured" : "Ready"} tone={index < 2 ? "success" : "warning"} />
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold">Start onboarding request</h3>
          <div className="mt-4 space-y-4">
            <Field label="Counterparty class">
              <select
                className={inputClass}
                value={form.counterpartyClass}
                onChange={(event) => setForm((current) => ({ ...current, counterpartyClass: event.target.value }))}
              >
                <option>ANCHOR</option>
                <option>SUPPLIER</option>
                <option>FUNDER</option>
                <option>INVESTOR</option>
              </select>
            </Field>
            <Field label="Legal name">
              <input
                className={inputClass}
                placeholder="Registered business name"
                value={form.legalName}
                onChange={(event) => setForm((current) => ({ ...current, legalName: event.target.value }))}
              />
            </Field>
            <Field label="Primary contact email">
              <input
                className={inputClass}
                type="email"
                placeholder="finance@example.com"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              />
            </Field>
            <Field label="Required review track">
              <select
                className={inputClass}
                value={form.reviewTrack}
                onChange={(event) => setForm((current) => ({ ...current, reviewTrack: event.target.value }))}
              >
                <option>FULL_KYB_AML</option>
                <option>LIGHT_SUPPLIER_ENROLMENT</option>
                <option>FUNDER_DILIGENCE</option>
                <option>INVESTOR_DILIGENCE</option>
              </select>
            </Field>
            <Button type="button" onClick={createDraft} disabled={!form.legalName.trim() || !form.email.trim()}>
              Create draft intake
            </Button>
            <p className="text-xs text-muted-foreground">
              Draft intakes should be promoted into counterparties once compliance evidence is complete.
            </p>
          </div>
        </Card>
      </div>
      {drafts.length ? (
        <Card className="mt-6">
          <h3 className="mb-4 text-lg font-semibold">Draft intakes</h3>
          <DataTable headers={["Reference", "Name", "Class", "Review track", "Status"]}>
            {drafts.map((draft) => (
              <tr key={String(draft.id)}>
                <td className="px-4 py-3 font-medium">{String(draft.id)}</td>
                <td className="px-4 py-3">{String(draft.legalName)}<br /><span className="text-xs text-muted-foreground">{String(draft.email)}</span></td>
                <td className="px-4 py-3">{String(draft.counterpartyClass)}</td>
                <td className="px-4 py-3">{String(draft.reviewTrack)}</td>
                <td className="px-4 py-3"><StatusBadge value={String(draft.status)} tone="warning" /></td>
              </tr>
            ))}
          </DataTable>
        </Card>
      ) : null}
    </AppShell>
  );
}

export function RatesWorkspacePage() {
  const [published, setPublished] = useState(false);
  const [previewed, setPreviewed] = useState(false);
  const rateRows = [
    ["GHS-BASE", "GHS", "Bank of Ghana policy-linked", "29.00%", "Active"],
    ["USD-SOFR", "USD", "SOFR reference curve", "5.31%", "Active"],
    ["EUR-EURIBOR", "EUR", "EURIBOR reference curve", "3.74%", "Draft"],
  ];
  const fxRows = [
    ["USD/GHS", "15.20", "Treasury upload", "Today"],
    ["EUR/GHS", "16.61", "Treasury upload", "Today"],
    ["GBP/GHS", "19.42", "Treasury upload", "Today"],
  ];

  return (
    <AppShell>
      <PageHeader
        title="Rates, FX & Fee Schedules"
        description="Central control for reference rates, spreads, fee schedules, FX rates and effective-dated pricing inputs."
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-lg font-semibold">Reference rates</h3>
          <DataTable headers={["Code", "Currency", "Basis", "Current", "Status"]}>
            {rateRows.map((row) => (
              <tr key={row[0]}>
                {row.map((cell, index) => (
                  <td key={cell} className="px-4 py-3">
                    {index === 4 ? <StatusBadge value={cell} tone={cell === "Active" ? "success" : "warning"} /> : cell}
                  </td>
                ))}
              </tr>
            ))}
          </DataTable>
        </Card>
        <Card>
          <h3 className="mb-4 text-lg font-semibold">FX rates</h3>
          <DataTable headers={["Pair", "Rate", "Source", "Effective"]}>
            {fxRows.map((row) => (
              <tr key={row[0]}>
                {row.map((cell) => <td key={cell} className="px-4 py-3">{cell}</td>)}
              </tr>
            ))}
          </DataTable>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold">Programme pricing template</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Reference rate"><input className={inputClass} defaultValue="GHS-BASE" /></Field>
            <Field label="Spread bps"><input className={inputClass} defaultValue="450" /></Field>
            <Field label="Day count"><input className={inputClass} defaultValue="ACT/365" /></Field>
            <Field label="Discount method"><input className={inputClass} defaultValue="STRAIGHT_LINE" /></Field>
          </div>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold">Effective dating controls</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Rate cards should be published with effective dates so pricing can be reproduced for any historical transaction.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button" variant="secondary" onClick={() => setPreviewed(true)}>Preview impact</Button>
            <Button type="button" onClick={() => setPublished(true)}>Publish rate card</Button>
          </div>
          {previewed ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Preview complete: this rate card would affect new programme pricing only.
            </p>
          ) : null}
          {published ? (
            <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Rate card published as a draft-effective configuration pending backend rate-store persistence.
            </div>
          ) : null}
        </Card>
      </div>
    </AppShell>
  );
}

export function NotificationSettingsPage() {
  const [provider, setProvider] = useState("console");
  const [sender, setSender] = useState("no-reply@invox.local");
  const [retryAttempts, setRetryAttempts] = useState("3");
  const [saved, setSaved] = useState(false);

  return (
    <AppShell>
      <PageHeader
        title="Notification Settings"
        description="Provider, channel, retry and template controls for emails, operational alerts and system notices."
      />
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card>
          <h3 className="text-lg font-semibold">Provider configuration</h3>
          <div className="mt-4 space-y-4">
            <Field label="Email provider">
              <select
                className={inputClass}
                value={provider}
                onChange={(event) => {
                  setProvider(event.target.value);
                  setSaved(false);
                }}
              >
                <option value="console">console</option>
                <option value="smtp">smtp</option>
                <option value="sendgrid">sendgrid</option>
                <option value="ses">ses</option>
              </select>
            </Field>
            <Field label="Default sender">
              <input className={inputClass} value={sender} onChange={(event) => {
                setSender(event.target.value);
                setSaved(false);
              }} />
            </Field>
            <Field label="Retry attempts">
              <input className={inputClass} type="number" value={retryAttempts} onChange={(event) => {
                setRetryAttempts(event.target.value);
                setSaved(false);
              }} />
            </Field>
            <Button type="button" onClick={() => setSaved(true)}>Save provider settings</Button>
            {saved ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                Saved draft provider settings: {provider}, {sender}, {retryAttempts} retries.
              </div>
            ) : null}
          </div>
        </Card>
        <Card>
          <h3 className="mb-4 text-lg font-semibold">Templates</h3>
          <DataTable headers={["Event", "Channel", "Status", "Owner"]}>
            {[
              ["invoice.approved", "Email + in-app", "Active", "Operations"],
              ["financing.offer_generated", "Email + in-app", "Active", "Origination"],
              ["payment.disbursed", "Email + in-app", "Active", "Treasury"],
              ["kyc.alert", "Email + in-app", "Review", "Compliance"],
            ].map((row) => (
              <tr key={row[0]}>
                <td className="px-4 py-3 font-medium">{row[0]}</td>
                <td className="px-4 py-3">{row[1]}</td>
                <td className="px-4 py-3"><StatusBadge value={row[2]} tone={row[2] === "Active" ? "success" : "warning"} /></td>
                <td className="px-4 py-3">{row[3]}</td>
              </tr>
            ))}
          </DataTable>
        </Card>
      </div>
    </AppShell>
  );
}

export function ApiDocsPage() {
  return (
    <AppShell>
      <PageHeader
        title="Developer API"
        description="Operational reference for service accounts, ERP integrations, webhooks and sandbox callback testing."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card>
          <h3 className="mb-4 text-lg font-semibold">Core endpoints</h3>
          <DataTable headers={["Area", "Method", "Path", "Purpose"]}>
            {[
              ["Auth", "POST", "/auth/login", "Issue JWT for user or service account"],
              ["Invoices", "POST", "/invoices/import/erp", "Import approved payables from ERP"],
              ["Payments", "POST", "/payments/:id/initiate-provider-payment", "Start provider payment"],
              ["Webhooks", "POST", "/webhooks/:provider/callback", "Receive signed provider callbacks"],
              ["Products", "GET", "/products/:resource", "List configured product records"],
            ].map((row) => (
              <tr key={`${row[1]}-${row[2]}`}>
                {row.map((cell, index) => <td key={cell} className={`px-4 py-3 ${index < 3 ? "font-mono text-xs" : ""}`}>{cell}</td>)}
              </tr>
            ))}
          </DataTable>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold">Credential controls</h3>
          <div className="mt-4 space-y-3">
            {["Service accounts", "API keys", "Webhook signing secrets", "IP allowlists", "Idempotency keys"].map((item) => (
              <div key={item} className="flex items-center justify-between rounded-md border border-border p-3">
                <span className="text-sm font-medium">{item}</span>
                <StatusBadge value="Required" tone="warning" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

export function ScheduledReportsPage() {
  const [rows, setRows] = useState([
    ["Daily exposure pack", "Risk and treasury", "Daily 07:00", "CSV + PDF", "Active"],
    ["Investor NAV report", "Fund investors", "Monthly close", "PDF", "Draft"],
    ["Regulatory audit export", "Auditors", "Quarterly", "CSV", "Paused"],
    ["Settlement reconciliation", "Finance", "Daily 18:00", "CSV", "Active"],
  ]);
  const createSchedule = () => {
    setRows((current) => [
      [`Custom export ${current.length + 1}`, "Operations", "Weekly Monday 08:00", "CSV", "Draft"],
      ...current,
    ]);
  };

  return (
    <AppShell>
      <PageHeader
        title="Scheduled Reports"
        description="Recurring exports for finance, funders, investors, auditors and regulators."
        action={<Button type="button" onClick={createSchedule}>Create schedule</Button>}
      />
      <Card>
        <DataTable headers={["Report", "Audience", "Frequency", "Format", "Status"]}>
          {rows.map((row) => (
            <tr key={row[0]}>
              <td className="px-4 py-3 font-medium">{row[0]}</td>
              <td className="px-4 py-3">{row[1]}</td>
              <td className="px-4 py-3">{row[2]}</td>
              <td className="px-4 py-3">{row[3]}</td>
              <td className="px-4 py-3"><StatusBadge value={row[4]} tone={row[4] === "Active" ? "success" : row[4] === "Draft" ? "warning" : "neutral"} /></td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </AppShell>
  );
}

export function BulkOperationsPage() {
  const queues = [
    ["Bulk invoice review", "Validate, approve or reject selected invoice batches.", "/invoices/exceptions"],
    ["Bulk financing offers", "Generate offers for eligible approved invoices.", "/financing"],
    ["Bulk approval actions", "Approve, reject or return maker-checker queues.", "/approvals/pending"],
    ["Bulk payment release", "Submit disbursement and collection batches to treasury.", "/payments"],
  ];

  return (
    <AppShell>
      <PageHeader
        title="Bulk Operations"
        description="Batch actions for invoice review, financing offers, approvals, payments and reconciliation queues."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {queues.map(([title, body, href]) => (
          <Card key={title}>
            <p className="font-semibold">{title}</p>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            <Link href={href} className="mt-4 inline-flex min-h-9 items-center justify-center rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-card-foreground transition-colors hover:bg-muted">
              Open queue
            </Link>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}

export function AuditTrailPage() {
  const audits = useQuery({ queryKey: ["audit"], queryFn: getAuditLogs });
  const rows = (audits.data ?? []) as Row[];

  return (
    <AppShell>
      <PageHeader
        title="Audit Trail"
        description="Immutable activity history across entities, approvals, integrations and financial postings."
      />
      <Card>
        <StatusMessage
          loading={audits.isLoading}
          error={audits.isError ? getApiError(audits.error) : undefined}
          empty={rows.length === 0 ? "No audit records found." : undefined}
        />
        {rows.length ? (
          <DataTable headers={["Action", "Entity", "Actor", "Reason", "Recorded"]}>
            {rows.map((row, index) => {
              const actor = row.actorUser as { email?: string } | undefined;
              return (
                <tr key={String(row.id ?? index)}>
                  <td className="px-4 py-3 font-medium">{String(row.action ?? "Recorded")}</td>
                  <td className="px-4 py-3">{formatEntityType(row.entityType)} {row.entityId ? `#${String(row.entityId).slice(0, 8)}` : ""}</td>
                  <td className="px-4 py-3">{actor?.email ?? String(row.actorUserId ?? "system")}</td>
                  <td className="px-4 py-3">{String(row.reason ?? "-")}</td>
                  <td className="px-4 py-3">{row.createdAt ? formatDate(String(row.createdAt)) : "-"}</td>
                </tr>
              );
            })}
          </DataTable>
        ) : null}
      </Card>
    </AppShell>
  );
}

function formatEntityType(value: unknown) {
  return String(value ?? "Unknown");
}
