"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  createPhase2Record,
  calculatePhase2Record,
  deletePhase2Record,
  getAuditLogs,
  getCounterparties,
  getFinancingTransactions,
  getInvoices,
  getPayments,
  getPhase2Dashboard,
  getPhase2Records,
  getPhase2Record,
  getProgrammes,
  runPhase2Action,
  updatePhase2Record,
} from "@/src/lib/api";
import { getApiError } from "@/src/lib/api/client";
import type { Phase2Record, Phase2Resource } from "@/src/lib/api/types";
import { formatDate, formatMoney } from "@/src/lib/format";
import { PERMISSIONS } from "@/src/lib/permissions";
import {
  AppShell,
  Button,
  Card,
  DataTable,
  Field,
  PageHeader,
  PermissionGate,
  StatusMessage,
  inputClass,
} from "./app-shell";

type FieldKind = "text" | "number" | "date" | "textarea" | "checkbox" | "json";

type FieldConfig = {
  key: string;
  label: string;
  kind?: FieldKind;
  required?: boolean;
  placeholder?: string;
  source?: "counterparties" | "programmes" | "invoices" | "financing" | "payments";
  counterpartyType?: string;
};

type ResourceConfig = {
  resource: Phase2Resource;
  title: string;
  description: string;
  path: string;
  createLabel: string;
  defaults: Record<string, unknown>;
  fields: FieldConfig[];
  tableColumns: { key: string; label: string; format?: "money" | "date" | "badge" }[];
  actions: string[];
};

const configs: ResourceConfig[] = [
  {
    resource: "dynamic-discounting-offers",
    title: "Dynamic Discounting",
    description: "Buyer-funded early-payment offers with yield, cash availability and discount modelling.",
    path: "/dynamic-discounting",
    createLabel: "Create offer",
    defaults: {
      programmeId: "",
      buyerId: "",
      supplierId: "",
      invoiceId: "",
      currency: "GHS",
      invoiceAmount: "0",
      buyerCashAvailable: "",
      discountModel: "STATIC_RATE",
      targetYield: "",
      discountRate: "0",
      discountAmount: "0",
      netPaymentAmount: "0",
      daysAccelerated: 0,
      status: "OFFERED",
      requestedBy: "",
      expiresAt: "",
      acceptedAt: "",
      rulesJson: "{}",
    },
    fields: [
      select("programmeId", "Programme", "programmes"),
      select("buyerId", "Buyer", "counterparties", true, "ANCHOR"),
      select("supplierId", "Supplier", "counterparties", true, "SUPPLIER"),
      select("invoiceId", "Invoice", "invoices"),
      money("invoiceAmount", "Invoice amount", true),
      money("buyerCashAvailable", "Buyer cash available"),
      text("currency", "Currency", true),
      text("discountModel", "Discount model", true),
      number("targetYield", "Target yield"),
      number("discountRate", "Discount rate", true),
      money("discountAmount", "Discount amount", true),
      money("netPaymentAmount", "Net payment amount", true),
      number("daysAccelerated", "Days accelerated", true),
      text("status", "Status", true),
      date("expiresAt", "Expires at"),
      date("acceptedAt", "Accepted at"),
      json("rulesJson", "Rules JSON"),
    ],
    tableColumns: [
      { key: "buyerId", label: "Buyer" },
      { key: "supplierId", label: "Supplier" },
      { key: "invoiceAmount", label: "Invoice", format: "money" },
      { key: "discountAmount", label: "Discount", format: "money" },
      { key: "netPaymentAmount", label: "Net pay", format: "money" },
      { key: "status", label: "Status", format: "badge" },
    ],
    actions: ["accept", "settle", "cancel"],
  },
  {
    resource: "receivables-facilities",
    title: "Receivables Facilities",
    description: "Supplier-led receivables finance, factoring and invoice-discounting facility records.",
    path: "/receivables",
    createLabel: "Create facility",
    defaults: {
      programmeId: "",
      supplierId: "",
      debtorId: "",
      facilityType: "RECEIVABLES_FINANCE",
      recourseType: "WITH_RECOURSE",
      disclosed: false,
      currency: "GHS",
      facilityLimit: "0",
      advanceRate: "0",
      reserveRate: "0",
      utilisedAmount: "0",
      status: "DRAFT",
      assignmentNoticeStatus: "NOT_SENT",
      lockboxAccount: "",
      eligibilityRules: "{}",
    },
    fields: [
      select("programmeId", "Programme", "programmes"),
      select("supplierId", "Supplier", "counterparties", true, "SUPPLIER"),
      select("debtorId", "Debtor", "counterparties"),
      text("facilityType", "Facility type", true),
      text("recourseType", "Recourse type", true),
      checkbox("disclosed", "Disclosed"),
      text("currency", "Currency", true),
      money("facilityLimit", "Facility limit", true),
      number("advanceRate", "Advance rate", true),
      number("reserveRate", "Reserve rate"),
      money("utilisedAmount", "Utilised amount"),
      text("status", "Status", true),
      text("assignmentNoticeStatus", "Assignment notice status"),
      text("lockboxAccount", "Lockbox account"),
      json("eligibilityRules", "Eligibility rules JSON"),
    ],
    tableColumns: [
      { key: "supplierId", label: "Supplier" },
      { key: "debtorId", label: "Debtor" },
      { key: "facilityType", label: "Type" },
      { key: "facilityLimit", label: "Limit", format: "money" },
      { key: "utilisedAmount", label: "Utilised", format: "money" },
      { key: "status", label: "Status", format: "badge" },
    ],
    actions: ["approve", "activate", "suspend", "close"],
  },
  {
    resource: "funder-marketplace-bids",
    title: "Funder Marketplace",
    description: "Funder appetite, participation bids, tenor constraints and yield conditions.",
    path: "/marketplace",
    createLabel: "Create bid",
    defaults: {
      financingTransactionId: "",
      invoiceId: "",
      funderId: "",
      bidType: "PARTICIPATION",
      currency: "GHS",
      offeredAmount: "0",
      minYield: "",
      maxTenorDays: "",
      participationStatus: "SUBMITTED",
      validUntil: "",
      confirmedAt: "",
      conditionsJson: "{}",
    },
    fields: [
      select("financingTransactionId", "Financing transaction", "financing"),
      select("invoiceId", "Invoice", "invoices"),
      select("funderId", "Funder", "counterparties", true, "FUNDER"),
      text("bidType", "Bid type", true),
      text("currency", "Currency", true),
      money("offeredAmount", "Offered amount", true),
      number("minYield", "Minimum yield"),
      number("maxTenorDays", "Maximum tenor days"),
      text("participationStatus", "Participation status", true),
      date("validUntil", "Valid until"),
      date("confirmedAt", "Confirmed at"),
      json("conditionsJson", "Conditions JSON"),
    ],
    tableColumns: [
      { key: "funderId", label: "Funder" },
      { key: "bidType", label: "Bid type" },
      { key: "offeredAmount", label: "Amount", format: "money" },
      { key: "minYield", label: "Min yield" },
      { key: "validUntil", label: "Valid until", format: "date" },
      { key: "participationStatus", label: "Status", format: "badge" },
    ],
    actions: ["confirm", "allocate", "withdraw"],
  },
  {
    resource: "esg-scorecards",
    title: "ESG Scorecards",
    description: "Supplier or programme ESG scoring with KPI evidence and pricing adjustments.",
    path: "/esg",
    createLabel: "Create scorecard",
    defaults: {
      counterpartyId: "",
      programmeId: "",
      provider: "internal",
      score: "0",
      tier: "STANDARD",
      asOfDate: new Date().toISOString(),
      kpiJson: "{}",
      evidenceJson: "{}",
      pricingAdjustmentBps: "0",
      status: "ACTIVE",
    },
    fields: [
      select("counterpartyId", "Counterparty", "counterparties", true),
      select("programmeId", "Programme", "programmes"),
      text("provider", "Provider"),
      number("score", "Score", true),
      text("tier", "Tier"),
      date("asOfDate", "As of date", true),
      number("pricingAdjustmentBps", "Pricing adjustment bps"),
      text("status", "Status", true),
      json("kpiJson", "KPI JSON"),
      json("evidenceJson", "Evidence JSON"),
    ],
    tableColumns: [
      { key: "counterpartyId", label: "Counterparty" },
      { key: "programmeId", label: "Programme" },
      { key: "score", label: "Score" },
      { key: "tier", label: "Tier" },
      { key: "pricingAdjustmentBps", label: "Adj bps" },
      { key: "status", label: "Status", format: "badge" },
    ],
    actions: ["review", "activate", "expire"],
  },
  {
    resource: "ai-anomaly-signals",
    title: "Anomaly Signals",
    description: "AI/rules anomaly review queue for invoice, payment and counterparty signals.",
    path: "/anomalies",
    createLabel: "Create signal",
    defaults: {
      invoiceId: "",
      paymentId: "",
      counterpartyId: "",
      modelName: "rules-baseline",
      modelVersion: "1.0",
      signalType: "DUPLICATE_RISK",
      severity: "MEDIUM",
      score: "0",
      rationaleJson: "{}",
      status: "OPEN",
      reviewedByUserId: "",
      reviewedAt: "",
    },
    fields: [
      select("invoiceId", "Invoice", "invoices"),
      select("paymentId", "Payment", "payments"),
      select("counterpartyId", "Counterparty", "counterparties"),
      text("modelName", "Model name", true),
      text("modelVersion", "Model version", true),
      text("signalType", "Signal type", true),
      text("severity", "Severity", true),
      number("score", "Score", true),
      text("status", "Status", true),
      text("reviewedByUserId", "Reviewed by user ID"),
      date("reviewedAt", "Reviewed at"),
      json("rationaleJson", "Rationale JSON"),
    ],
    tableColumns: [
      { key: "signalType", label: "Signal" },
      { key: "severity", label: "Severity", format: "badge" },
      { key: "score", label: "Score" },
      { key: "invoiceId", label: "Invoice" },
      { key: "paymentId", label: "Payment" },
      { key: "status", label: "Status", format: "badge" },
    ],
    actions: ["review", "resolve", "dismiss"],
  },
  {
    resource: "investor-report-snapshots",
    title: "Investor Reports",
    description: "SCF fund reporting snapshots covering NAV, commitments, drawdowns, distributions and yield.",
    path: "/investor-reports",
    createLabel: "Create snapshot",
    defaults: {
      investorRecordId: "",
      counterpartyId: "",
      reportType: "MONTHLY_NAV",
      periodStart: new Date().toISOString(),
      periodEnd: new Date().toISOString(),
      navAmount: "",
      committedCapital: "",
      drawnCapital: "",
      distributedCapital: "",
      grossYield: "",
      delinquencyRate: "",
      weightedAverageLifeDays: "",
      reportJson: "{}",
      status: "GENERATED",
      generatedAt: new Date().toISOString(),
    },
    fields: [
      text("investorRecordId", "Investor record ID"),
      select("counterpartyId", "Counterparty", "counterparties"),
      text("reportType", "Report type", true),
      date("periodStart", "Period start", true),
      date("periodEnd", "Period end", true),
      money("navAmount", "NAV amount"),
      money("committedCapital", "Committed capital"),
      money("drawnCapital", "Drawn capital"),
      money("distributedCapital", "Distributed capital"),
      number("grossYield", "Gross yield"),
      number("delinquencyRate", "Delinquency rate"),
      number("weightedAverageLifeDays", "Weighted average life days"),
      text("status", "Status", true),
      date("generatedAt", "Generated at"),
      json("reportJson", "Report JSON"),
    ],
    tableColumns: [
      { key: "reportType", label: "Type" },
      { key: "periodStart", label: "Start", format: "date" },
      { key: "periodEnd", label: "End", format: "date" },
      { key: "navAmount", label: "NAV", format: "money" },
      { key: "grossYield", label: "Yield" },
      { key: "status", label: "Status", format: "badge" },
    ],
    actions: ["generate", "publish", "archive"],
  },
];

export function Phase2OverviewPage() {
  const dashboard = useQuery({ queryKey: ["phase2-dashboard"], queryFn: getPhase2Dashboard });
  const metrics = dashboard.data
    ? [
        ["Open DD offers", dashboard.data.openDynamicDiscountingOffers],
        ["Accepted DD offers", dashboard.data.acceptedDynamicDiscountingOffers],
        ["Active facilities", dashboard.data.activeReceivablesFacilities],
        ["Submitted bids", dashboard.data.submittedMarketplaceBids],
        ["Confirmed bids", dashboard.data.confirmedMarketplaceBids],
        ["Active ESG scorecards", dashboard.data.activeEsgScorecards],
        ["Open anomaly signals", dashboard.data.openAiAnomalySignals],
        ["High severity signals", dashboard.data.highSeverityAiAnomalySignals],
        ["Investor snapshots", dashboard.data.investorReportSnapshots],
        ["DD invoice total", formatMoney(dashboard.data.dynamicDiscountingInvoiceAmount)],
        ["DD discount total", formatMoney(dashboard.data.dynamicDiscountingDiscountAmount)],
        ["Receivables limit", formatMoney(dashboard.data.receivablesFacilityLimit)],
        ["Receivables utilised", formatMoney(dashboard.data.receivablesUtilisedAmount)],
        ["Marketplace offers", formatMoney(dashboard.data.marketplaceOfferedAmount)],
        ["Investor NAV", formatMoney(dashboard.data.investorNavAmount)],
      ]
    : [];

  return (
    <AppShell>
      <PageHeader
        title="Product Suite"
        description="Operational control surface for dynamic discounting, receivables finance, marketplace funding, ESG pricing, anomaly review and investor reporting."
      />
      <StatusMessage
        loading={dashboard.isLoading}
        error={dashboard.isError ? getApiError(dashboard.error) : undefined}
      />
      <div className="mb-6 grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {metrics.map(([label, value]) => (
          <Card key={String(label)}>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-xl font-semibold">{value}</p>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {configs.map((config) => (
          <Link key={config.resource} href={config.path} className="rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:bg-muted/40">
            <p className="text-lg font-semibold">{config.title}</p>
            <p className="mt-2 text-sm text-muted-foreground">{config.description}</p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}

export function Phase2ResourcePage({ resource }: { resource: Phase2Resource }) {
  const config = getConfig(resource);
  const queryClient = useQueryClient();
  const records = useQuery({
    queryKey: ["phase2", resource],
    queryFn: () => getPhase2Records(resource),
  });
  const counterparties = useQuery({ queryKey: ["counterparties"], queryFn: getCounterparties });
  const programmes = useQuery({ queryKey: ["programmes"], queryFn: getProgrammes });
  const invoices = useQuery({ queryKey: ["invoices"], queryFn: getInvoices });
  const financing = useQuery({ queryKey: ["financing"], queryFn: getFinancingTransactions });
  const payments = useQuery({ queryKey: ["payments"], queryFn: getPayments });
  const [form, setForm] = useState<Record<string, unknown>>(config.defaults);
  const [editingId, setEditingId] = useState("");
  const [formError, setFormError] = useState("");
  const [filter, setFilter] = useState("");

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["phase2", resource] });
    await queryClient.invalidateQueries({ queryKey: ["phase2-dashboard"] });
  };
  const create = useMutation({
    mutationFn: () => createPhase2Record(resource, toPayload(config, form)),
    onSuccess: async () => {
      setForm(config.defaults);
      setEditingId("");
      await invalidate();
    },
  });
  const update = useMutation({
    mutationFn: () => updatePhase2Record(resource, editingId, toPayload(config, form)),
    onSuccess: async () => {
      setForm(config.defaults);
      setEditingId("");
      await invalidate();
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => deletePhase2Record(resource, id),
    onSuccess: invalidate,
  });
  const lifecycle = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      runPhase2Action(resource, id, action),
    onSuccess: invalidate,
  });
  const calculate = useMutation({
    mutationFn: () => calculatePhase2Record(resource, toPayload(config, form)),
    onSuccess: (result) => setForm((current) => ({ ...current, ...result })),
  });
  const rows = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return records.data ?? [];
    return (records.data ?? []).filter((row) => JSON.stringify(row).toLowerCase().includes(term));
  }, [filter, records.data]);

  return (
    <AppShell>
      <PageHeader title={config.title} description={config.description} />
      <div className="grid gap-6 xl:grid-cols-[460px_1fr]">
        <PermissionGate permission={PERMISSIONS.productConfigure}>
          <Card>
            <h3 className="mb-4 text-lg font-semibold">{editingId ? "Edit record" : config.createLabel}</h3>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                setFormError("");
                try {
                  if (editingId) update.mutate();
                  else create.mutate();
                } catch (error) {
                  setFormError(error instanceof Error ? error.message : "Invalid form data.");
                }
              }}
            >
              {config.fields.map((field) => (
                <ConfiguredField
                  key={field.key}
                  field={field}
                  value={form[field.key]}
                  options={optionsFor(field, {
                    counterparties: counterparties.data ?? [],
                    programmes: programmes.data ?? [],
                    invoices: invoices.data ?? [],
                    financing: financing.data ?? [],
                    payments: payments.data ?? [],
                  })}
                  onChange={(value) => setForm((current) => ({ ...current, [field.key]: value }))}
                />
              ))}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium"
                  onClick={() => calculate.mutate()}
                  disabled={calculate.isPending}
                >
                  {calculate.isPending ? "Calculating..." : "Calculate"}
                </button>
                <Button disabled={create.isPending || update.isPending}>
                  {create.isPending || update.isPending ? "Saving..." : editingId ? "Update" : "Create"}
                </Button>
                {editingId ? (
                  <button
                    type="button"
                    className="rounded-md border border-border px-4 py-2 text-sm font-medium"
                    onClick={() => {
                      setEditingId("");
                      setForm(config.defaults);
                    }}
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
              {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
              {create.isError ? <ErrorText error={create.error} /> : null}
              {update.isError ? <ErrorText error={update.error} /> : null}
              {calculate.isError ? <ErrorText error={calculate.error} /> : null}
            </form>
          </Card>
        </PermissionGate>
        <Card>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <Field label="Search">
              <input className={inputClass} value={filter} onChange={(event) => setFilter(event.target.value)} />
            </Field>
            <p className="text-sm text-muted-foreground">{rows.length} records</p>
          </div>
          <StatusMessage
            loading={records.isLoading}
            error={records.isError ? getApiError(records.error) : undefined}
            empty={rows.length === 0 ? "No records found." : undefined}
          />
          {rows.length ? (
            <DataTable headers={[...config.tableColumns.map((column) => column.label), "Updated", "Actions"]}>
              {rows.map((row) => (
                <tr key={row.id}>
                  {config.tableColumns.map((column) => (
                    <td key={column.key} className="px-4 py-3">
                      {formatCell(row, column.key, column.format)}
                    </td>
                  ))}
                  <td className="px-4 py-3">{formatDate(row.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-3">
                      <Link className="font-medium underline" href={`${config.path}/${row.id}`}>
                        View
                      </Link>
                      <button
                        type="button"
                        className="font-medium underline"
                        onClick={() => {
                          setEditingId(row.id);
                          setForm(fromRecord(config, row));
                        }}
                      >
                        Edit
                      </button>
                      <PermissionGate permission={PERMISSIONS.productConfigure}>
                        <button
                          type="button"
                          className="font-medium text-destructive underline"
                          onClick={() => {
                            if (window.confirm("Delete this product record?")) remove.mutate(row.id);
                          }}
                        >
                          Delete
                        </button>
                      </PermissionGate>
                    </div>
                  </td>
                </tr>
              ))}
            </DataTable>
          ) : null}
          {remove.isError ? <ErrorText error={remove.error} /> : null}
          {lifecycle.isError ? <ErrorText error={lifecycle.error} /> : null}
        </Card>
      </div>
    </AppShell>
  );
}

export function Phase2RecordDetailPage({
  resource,
  id,
}: {
  resource: Phase2Resource;
  id: string;
}) {
  const config = getConfig(resource);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["phase2", resource, id],
    queryFn: () => getPhase2Record(resource, id),
  });
  const audits = useQuery({ queryKey: ["audit"], queryFn: getAuditLogs });
  const lifecycle = useMutation({
    mutationFn: (action: string) =>
      runPhase2Action(resource, id, action, {}, `ui-${resource}-${id}-${action}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["phase2", resource, id] });
      await queryClient.invalidateQueries({ queryKey: ["audit"] });
    },
  });
  const timeline = useMemo(() => {
    return (audits.data ?? []).filter((row) => {
      const log = row as { entityType?: string; entityId?: string };
      return ["Product:", "Phase2:"].some((prefix) => log.entityType === `${prefix}${resource}`) && log.entityId === id;
    });
  }, [audits.data, id, resource]);

  return (
    <AppShell>
      <PageHeader
        title={`${config.title} Detail`}
        description="Lifecycle state, calculated economics, audit trail and raw record data."
        action={<Link href={config.path} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Back</Link>}
      />
      <StatusMessage
        loading={query.isLoading}
        error={query.isError ? getApiError(query.error) : undefined}
      />
      {query.data ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <Card>
            <h3 className="mb-4 text-lg font-semibold">Record Summary</h3>
            <PermissionGate permission={PERMISSIONS.productConfigure}>
              <div className="mb-4 flex flex-wrap gap-3">
                {config.actions.map((action) => (
                  <Button
                    key={action}
                    type="button"
                    variant="secondary"
                    disabled={lifecycle.isPending}
                    onClick={() => lifecycle.mutate(action)}
                  >
                    {labelAction(action)}
                  </Button>
                ))}
              </div>
              {lifecycle.isError ? <ErrorText error={lifecycle.error} /> : null}
            </PermissionGate>
            <div className="grid gap-3 md:grid-cols-2">
              {Object.entries(query.data as Record<string, unknown>)
                .filter(([key]) => !["createdAt", "updatedAt"].includes(key))
                .slice(0, 18)
                .map(([key, value]) => (
                  <div key={key} className="rounded-md border border-border p-3">
                    <p className="text-xs font-medium uppercase text-muted-foreground">{key}</p>
                    <p className="mt-1 break-words text-sm">{displayValue(value)}</p>
                  </div>
                ))}
            </div>
          </Card>
          <Card>
            <h3 className="mb-4 text-lg font-semibold">Lifecycle Timeline</h3>
            <StatusMessage
              loading={audits.isLoading}
              error={audits.isError ? getApiError(audits.error) : undefined}
              empty={timeline.length === 0 ? "No audit events captured for this record yet." : undefined}
            />
            <div className="space-y-3">
              {timeline.map((row) => {
                const log = row as {
                  id: string;
                  action: string;
                  reason?: string | null;
                  createdAt: string;
                  actorUser?: { email?: string | null };
                };
                return (
                  <div key={log.id} className="rounded-md border border-border p-3">
                    <p className="text-sm font-semibold">{log.action}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(log.createdAt)} by {log.actorUser?.email ?? "system"}</p>
                    {log.reason ? <p className="mt-2 text-sm">{log.reason}</p> : null}
                  </div>
                );
              })}
            </div>
          </Card>
          <Card>
            <h3 className="mb-4 text-lg font-semibold">Raw JSON</h3>
            <pre className="overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-50">
              {JSON.stringify(query.data, null, 2)}
            </pre>
          </Card>
        </div>
      ) : null}
    </AppShell>
  );
}

function ConfiguredField({
  field,
  value,
  options,
  onChange,
}: {
  field: FieldConfig;
  value: unknown;
  options?: { value: string; label: string }[];
  onChange: (value: unknown) => void;
}) {
  if (field.source) {
    return (
      <Field label={field.label}>
        <select
          className={inputClass}
          required={field.required}
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Select {field.label.toLowerCase()}</option>
          {(options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
    );
  }
  if (field.kind === "checkbox") {
    return (
      <Field label={field.label}>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />
      </Field>
    );
  }
  if (field.kind === "textarea" || field.kind === "json") {
    return (
      <Field label={field.label}>
        <textarea
          className={`${inputClass} min-h-24 font-mono text-xs`}
          required={field.required}
          placeholder={field.placeholder}
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
        />
      </Field>
    );
  }
  return (
    <Field label={field.label}>
      <input
        className={inputClass}
        type={field.kind === "number" ? "number" : field.kind === "date" ? "datetime-local" : "text"}
        step={field.kind === "number" ? "any" : undefined}
        required={field.required}
        placeholder={field.placeholder}
        value={toInputValue(value, field.kind)}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

function toPayload(config: ResourceConfig, form: Record<string, unknown>) {
  const payload: Record<string, unknown> = {};
  for (const field of config.fields) {
    const value = form[field.key];
    if (value === "" || value === undefined || value === null) continue;
    if (field.kind === "json") {
      payload[field.key] = typeof value === "string" ? JSON.parse(value) : value;
    } else if (field.kind === "number") {
      payload[field.key] = Number(value);
    } else if (field.kind === "checkbox") {
      payload[field.key] = Boolean(value);
    } else if (field.kind === "date") {
      payload[field.key] = new Date(String(value)).toISOString();
    } else {
      payload[field.key] = value;
    }
  }
  return payload;
}

function fromRecord(config: ResourceConfig, record: Phase2Record) {
  const data: Record<string, unknown> = {};
  for (const field of config.fields) {
    const value = (record as unknown as Record<string, unknown>)[field.key];
    if (field.kind === "json") data[field.key] = JSON.stringify(value ?? {}, null, 2);
    else if (field.kind === "date") data[field.key] = toInputValue(value, "date");
    else data[field.key] = value ?? config.defaults[field.key] ?? "";
  }
  return data;
}

function formatCell(row: Phase2Record, key: string, format?: "money" | "date" | "badge") {
  const value = (row as unknown as Record<string, unknown>)[key];
  if (value === null || value === undefined || value === "") return "-";
  if (format === "money") return formatMoney(value as string | number, "currency" in row ? row.currency : "GHS");
  if (format === "date") return formatDate(String(value));
  if (format === "badge") return <StatusBadge value={String(value)} />;
  return String(value);
}

function StatusBadge({ value }: { value: string }) {
  const color = value.includes("FAIL") || value.includes("HIGH") || value.includes("CRITICAL")
    ? "border-rose-200 bg-rose-50 text-rose-700"
    : value.includes("ACTIVE") || value.includes("CONFIRMED") || value.includes("ACCEPTED")
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-slate-200 bg-slate-50 text-slate-700";
  return <span className={`rounded-full border px-2 py-1 text-xs font-medium ${color}`}>{value}</span>;
}

function ErrorText({ error }: { error: unknown }) {
  return <p className="mt-3 text-sm text-destructive">{getApiError(error)}</p>;
}

function getConfig(resource: Phase2Resource) {
  return configs.find((config) => config.resource === resource) ?? configs[0];
}

function text(key: string, label: string, required = false): FieldConfig {
  return { key, label, required };
}

function select(
  key: string,
  label: string,
  source: NonNullable<FieldConfig["source"]>,
  required = false,
  counterpartyType?: string,
): FieldConfig {
  return { key, label, required, source, counterpartyType };
}

function money(key: string, label: string, required = false): FieldConfig {
  return { key, label, required, kind: "number" };
}

function number(key: string, label: string, required = false): FieldConfig {
  return { key, label, required, kind: "number" };
}

function date(key: string, label: string, required = false): FieldConfig {
  return { key, label, required, kind: "date" };
}

function checkbox(key: string, label: string): FieldConfig {
  return { key, label, kind: "checkbox" };
}

function json(key: string, label: string): FieldConfig {
  return { key, label, kind: "json" };
}

function toInputValue(value: unknown, kind?: FieldKind) {
  if (!value) return "";
  if (kind === "date") {
    const dateValue = new Date(String(value));
    if (Number.isNaN(dateValue.getTime())) return "";
    return dateValue.toISOString().slice(0, 16);
  }
  return String(value);
}

function optionsFor(
  field: FieldConfig,
  data: {
    counterparties: Array<{ id: string; legalName: string; type: string }>;
    programmes: Array<{ id: string; name: string; code: string }>;
    invoices: Array<{ id: string; invoiceNumber: string; amount: string; currency: string }>;
    financing: Array<{ id: string; offerReference?: string | null; invoiceAmount: string; currency?: string }>;
    payments: Array<{ id: string; reference?: string | null; amount: string; currency: string }>;
  },
) {
  if (field.source === "counterparties") {
    return data.counterparties
      .filter((row) => !field.counterpartyType || row.type === field.counterpartyType)
      .map((row) => ({ value: row.id, label: `${row.legalName} (${row.type})` }));
  }
  if (field.source === "programmes") {
    return data.programmes.map((row) => ({ value: row.id, label: `${row.name} (${row.code})` }));
  }
  if (field.source === "invoices") {
    return data.invoices.map((row) => ({
      value: row.id,
      label: `${row.invoiceNumber} - ${formatMoney(row.amount, row.currency)}`,
    }));
  }
  if (field.source === "financing") {
    return data.financing.map((row) => ({
      value: row.id,
      label: `${row.offerReference ?? row.id} - ${formatMoney(row.invoiceAmount, row.currency ?? "GHS")}`,
    }));
  }
  if (field.source === "payments") {
    return data.payments.map((row) => ({
      value: row.id,
      label: `${row.reference ?? row.id} - ${formatMoney(row.amount, row.currency)}`,
    }));
  }
  return [];
}

function labelAction(action: string) {
  return action.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
