"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
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
              <select className={inputClass} defaultValue="ANCHOR">
                <option>ANCHOR</option>
                <option>SUPPLIER</option>
                <option>FUNDER</option>
                <option>INVESTOR</option>
              </select>
            </Field>
            <Field label="Legal name">
              <input className={inputClass} placeholder="Registered business name" />
            </Field>
            <Field label="Primary contact email">
              <input className={inputClass} type="email" placeholder="finance@example.com" />
            </Field>
            <Field label="Required review track">
              <select className={inputClass} defaultValue="FULL_KYB_AML">
                <option>FULL_KYB_AML</option>
                <option>LIGHT_SUPPLIER_ENROLMENT</option>
                <option>FUNDER_DILIGENCE</option>
                <option>INVESTOR_DILIGENCE</option>
              </select>
            </Field>
            <Button type="button">Create draft intake</Button>
            <p className="text-xs text-muted-foreground">
              Draft intakes should be promoted into counterparties once compliance evidence is complete.
            </p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

export function RatesWorkspacePage() {
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
            <Button type="button" variant="secondary">Preview impact</Button>
            <Button type="button">Publish rate card</Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

export function NotificationSettingsPage() {
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
              <select className={inputClass} defaultValue="console">
                <option value="console">console</option>
                <option value="smtp">smtp</option>
                <option value="sendgrid">sendgrid</option>
                <option value="ses">ses</option>
              </select>
            </Field>
            <Field label="Default sender"><input className={inputClass} defaultValue="no-reply@invox.local" /></Field>
            <Field label="Retry attempts"><input className={inputClass} type="number" defaultValue="3" /></Field>
            <Button type="button">Save provider settings</Button>
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
  return (
    <AppShell>
      <PageHeader
        title="Scheduled Reports"
        description="Recurring exports for finance, funders, investors, auditors and regulators."
        action={<Button type="button">Create schedule</Button>}
      />
      <Card>
        <DataTable headers={["Report", "Audience", "Frequency", "Format", "Status"]}>
          {[
            ["Daily exposure pack", "Risk and treasury", "Daily 07:00", "CSV + PDF", "Active"],
            ["Investor NAV report", "Fund investors", "Monthly close", "PDF", "Draft"],
            ["Regulatory audit export", "Auditors", "Quarterly", "CSV", "Paused"],
            ["Settlement reconciliation", "Finance", "Daily 18:00", "CSV", "Active"],
          ].map((row) => (
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
  return (
    <AppShell>
      <PageHeader
        title="Bulk Operations"
        description="Batch actions for invoice review, financing offers, approvals, payments and reconciliation queues."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Bulk invoice review", "Validate, approve or reject selected invoice batches."],
          ["Bulk financing offers", "Generate offers for eligible approved invoices."],
          ["Bulk approval actions", "Approve, reject or return maker-checker queues."],
          ["Bulk payment release", "Submit disbursement and collection batches to treasury."],
        ].map(([title, body]) => (
          <Card key={title}>
            <p className="font-semibold">{title}</p>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            <Button type="button" variant="secondary" className="mt-4">Open queue</Button>
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
  return String(value ?? "Unknown").replace(/^Phase2:/, "Product:");
}
