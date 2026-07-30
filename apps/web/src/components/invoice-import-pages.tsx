"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  cancelImportBatch,
  getCounterparties,
  getInvoiceExceptions,
  getInvoiceImportBatch,
  getInvoiceImportBatches,
  getInvoiceImportRows,
  getProgrammes,
  importInvoicesCsv,
  importInvoicesExcel,
  importInvoicesFromErp,
  importInvoicesJson,
  processValidImportRows,
} from "@/src/lib/api";
import { getApiError } from "@/src/lib/api/client";
import type { InvoiceImportBatch, InvoiceImportRow } from "@/src/lib/api/types";
import { formatDate } from "@/src/lib/format";
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

const sampleCsv = [
  "programmeCode,buyerRegistrationNumber,supplierRegistrationNumber,buyerTin,supplierTin,invoiceNumber,externalReference,amount,currency,issueDate,dueDate,purchaseOrderNumber,grnNumber,taxAmount,description,buyerApproved,buyerApprovalReference",
  "RF-DEMO,ANCHOR-001,SUPPLIER-001,,,INV-1001,ERP-INV-1001,15000,GHS,2026-01-15,2026-03-15,PO-1001,GRN-1001,1875,Approved payable,true,APP-1001",
].join("\n");

export function InvoiceImportPage() {
  const router = useRouter();
  const programmes = useQuery({ queryKey: ["programmes"], queryFn: getProgrammes });
  const counterparties = useQuery({ queryKey: ["counterparties"], queryFn: getCounterparties });
  const [programmeId, setProgrammeId] = useState("");
  const [programmeCode, setProgrammeCode] = useState("");
  const [anchorId, setAnchorId] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [json, setJson] = useState(
    JSON.stringify(
      {
        programmeCode: "RF-DEMO",
        invoices: [
          {
            invoiceNumber: "JSON-INV-1001",
            supplierRegistrationNumber: "SUPPLIER-001",
            amount: 12000,
            currency: "GHS",
            issueDate: "2026-01-15",
            dueDate: "2026-03-15",
            buyerApproved: true,
            buyerApprovalReference: "JSON-APP-1001",
          },
        ],
      },
      null,
      2,
    ),
  );
  const onSuccess = (batch: InvoiceImportBatch) => router.push(`/invoices/import/batches/${batch.id}`);
  const csv = useMutation({
    mutationFn: () => {
      if (!csvFile) throw new Error("Choose a CSV file first.");
      return importFile(importInvoicesCsv, csvFile, { programmeId, programmeCode, anchorId });
    },
    onSuccess,
  });
  const excel = useMutation({
    mutationFn: () => {
      if (!excelFile) throw new Error("Choose an Excel file first.");
      return importFile(importInvoicesExcel, excelFile, { programmeId, programmeCode, anchorId });
    },
    onSuccess,
  });
  const jsonImport = useMutation({
    mutationFn: () => importInvoicesJson(JSON.parse(json) as unknown),
    onSuccess,
  });
  const erp = useMutation({
    mutationFn: () => importInvoicesFromErp({ programmeId, programmeCode, anchorId }),
    onSuccess,
  });
  const anchors = counterparties.data?.filter((row) => row.type === "ANCHOR") ?? [];
  return (
    <AppShell>
      <PageHeader
        title="Invoice Import"
        description="Import approved payables from CSV, Excel, JSON or the mock ERP provider."
        action={<LinkButton href="/invoices/import/batches">Import Batches</LinkButton>}
      />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Field label="Programme">
          <select className={inputClass} value={programmeId} onChange={(event) => setProgrammeId(event.target.value)}>
            <option value="">Use programme code or row value</option>
            {programmes.data?.map((programme) => (
              <option key={programme.id} value={programme.id}>{programme.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Programme code">
          <input className={inputClass} value={programmeCode} onChange={(event) => setProgrammeCode(event.target.value)} placeholder="RF-DEMO" />
        </Field>
        <Field label="Anchor">
          <select className={inputClass} value={anchorId} onChange={(event) => setAnchorId(event.target.value)}>
            <option value="">Resolve from programme</option>
            {anchors.map((anchor) => (
              <option key={anchor.id} value={anchor.id}>{anchor.legalName}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-lg font-semibold">CSV import</h3>
          <Field label="CSV file">
            <input className={inputClass} type="file" accept=".csv,text/csv" onChange={(event) => setCsvFile(event.target.files?.[0] ?? null)} />
          </Field>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={() => csv.mutate()} disabled={csv.isPending}>Upload CSV</Button>
            <Button variant="secondary" onClick={downloadSampleCsv}>Download sample CSV</Button>
          </div>
          {csv.isError ? <ErrorText error={csv.error} /> : null}
        </Card>
        <Card>
          <h3 className="mb-4 text-lg font-semibold">Excel import</h3>
          <Field label="Excel file">
            <input className={inputClass} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => setExcelFile(event.target.files?.[0] ?? null)} />
          </Field>
          <Button className="mt-4" onClick={() => excel.mutate()} disabled={excel.isPending}>Upload Excel</Button>
          {excel.isError ? <ErrorText error={excel.error} /> : null}
        </Card>
        <Card>
          <h3 className="mb-4 text-lg font-semibold">JSON/API import</h3>
          <textarea className={`${inputClass} min-h-72 font-mono text-xs`} value={json} onChange={(event) => setJson(event.target.value)} />
          <Button className="mt-4" onClick={() => jsonImport.mutate()} disabled={jsonImport.isPending}>Import JSON</Button>
          {jsonImport.isError ? <ErrorText error={jsonImport.error} /> : null}
        </Card>
        <Card>
          <h3 className="mb-4 text-lg font-semibold">Mock ERP import</h3>
          <p className="mb-4 text-sm text-muted-foreground">Uses the configured mock ERP provider. Programme codes containing EMPTY return no invoices; codes containing FAIL simulate provider failure.</p>
          <Button onClick={() => erp.mutate()} disabled={erp.isPending}>Run mock ERP import</Button>
          {erp.isError ? <ErrorText error={erp.error} /> : null}
        </Card>
      </div>
    </AppShell>
  );
}

export function InvoiceImportBatchesPage() {
  const query = useQuery({ queryKey: ["invoice-import-batches"], queryFn: getInvoiceImportBatches });
  const rows = query.data ?? [];
  return (
    <AppShell>
      <PageHeader title="Invoice Import Batches" action={<LinkButton href="/invoices/import">New Import</LinkButton>} />
      <StatusMessage loading={query.isLoading} error={query.isError ? getApiError(query.error) : undefined} empty={rows.length === 0 ? "No import batches yet." : undefined} />
      {rows.length ? <BatchTable rows={rows} /> : null}
    </AppShell>
  );
}

export function InvoiceImportBatchDetailPage({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const batch = useQuery({ queryKey: ["invoice-import-batch", id], queryFn: () => getInvoiceImportBatch(id) });
  const rows = useQuery({ queryKey: ["invoice-import-rows", id], queryFn: () => getInvoiceImportRows(id) });
  const process = useMutation({
    mutationFn: () => processValidImportRows(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["invoice-import-batch", id] });
      await queryClient.invalidateQueries({ queryKey: ["invoice-import-rows", id] });
    },
  });
  const cancel = useMutation({
    mutationFn: () => cancelImportBatch(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoice-import-batch", id] }),
  });
  return (
    <AppShell>
      <PageHeader title="Import Batch Detail" action={<LinkButton href="/invoices/import/batches">Back</LinkButton>} />
      <StatusMessage loading={batch.isLoading || rows.isLoading} error={batch.isError ? getApiError(batch.error) : rows.isError ? getApiError(rows.error) : undefined} />
      {batch.data ? (
        <div className="grid gap-6">
          <Card>
            <div className="mb-4 flex flex-wrap gap-3">
              <Button onClick={() => process.mutate()} disabled={process.isPending}>Process valid rows</Button>
              <Button variant="secondary" onClick={() => cancel.mutate()} disabled={cancel.isPending}>Cancel batch</Button>
            </div>
            <DetailsGrid
              rows={[
                ["Status", <StatusBadge key="status" value={batch.data.status} />],
                ["Source type", batch.data.sourceType],
                ["Source reference", batch.data.sourceReference ?? "-"],
                ["Programme", batch.data.programme?.name ?? batch.data.programmeId ?? "-"],
                ["Anchor", batch.data.anchor?.legalName ?? batch.data.anchorId ?? "-"],
                ["Total rows", batch.data.totalRows],
                ["Valid rows", batch.data.validRows],
                ["Invalid rows", batch.data.invalidRows],
                ["Duplicate rows", batch.data.duplicateRows],
                ["Imported rows", batch.data.importedRows],
                ["Failed rows", batch.data.failedRows],
                ["Started", formatDate(batch.data.startedAt)],
                ["Completed", formatDate(batch.data.completedAt)],
                ["Error summary", batch.data.errorSummary ?? "-"],
              ]}
            />
            <ErrorStack errors={[process.error, cancel.error]} />
          </Card>
          {rows.data?.length ? <RowsTable rows={rows.data} /> : null}
        </div>
      ) : null}
    </AppShell>
  );
}

export function InvoiceExceptionsPage() {
  const query = useQuery({ queryKey: ["invoice-exceptions"], queryFn: getInvoiceExceptions });
  const rows = useMemo(() => query.data ?? [], [query.data]);
  return (
    <AppShell>
      <PageHeader title="Invoice Exceptions" description="Invalid, duplicate and failed import rows that require operations review." />
      <StatusMessage loading={query.isLoading} error={query.isError ? getApiError(query.error) : undefined} empty={rows.length === 0 ? "No invoice import exceptions." : undefined} />
      {rows.length ? <RowsTable rows={rows} /> : null}
    </AppShell>
  );
}

function BatchTable({ rows }: { rows: InvoiceImportBatch[] }) {
  return (
    <DataTable headers={["Source", "Status", "Programme", "Anchor", "Rows", "Valid", "Invalid", "Duplicates", "Imported", "Created", "Actions"]}>
      {rows.map((row) => (
        <tr key={row.id}>
          <td className="px-4 py-3">{row.sourceType}</td>
          <td className="px-4 py-3"><StatusBadge value={row.status} /></td>
          <td className="px-4 py-3">{row.programme?.name ?? row.programmeId ?? "-"}</td>
          <td className="px-4 py-3">{row.anchor?.legalName ?? row.anchorId ?? "-"}</td>
          <td className="px-4 py-3">{row.totalRows}</td>
          <td className="px-4 py-3">{row.validRows}</td>
          <td className="px-4 py-3">{row.invalidRows}</td>
          <td className="px-4 py-3">{row.duplicateRows}</td>
          <td className="px-4 py-3">{row.importedRows}</td>
          <td className="px-4 py-3">{formatDate(row.createdAt)}</td>
          <td className="px-4 py-3"><Link className="font-medium underline" href={`/invoices/import/batches/${row.id}`}>Review</Link></td>
        </tr>
      ))}
    </DataTable>
  );
}

function RowsTable({ rows }: { rows: InvoiceImportRow[] }) {
  return (
    <DataTable headers={["Row", "Status", "Invoice", "Amount", "Errors", "Duplicate", "Created invoice"]}>
      {rows.map((row) => {
        const normalized = row.normalizedJson ?? {};
        return (
          <tr key={row.id}>
            <td className="px-4 py-3">{row.rowNumber}</td>
            <td className="px-4 py-3"><StatusBadge value={row.status} /></td>
            <td className="px-4 py-3">{String(normalized.invoiceNumber ?? "-")}</td>
            <td className="px-4 py-3">{String(normalized.amount ?? "-")} {String(normalized.currency ?? "")}</td>
            <td className="px-4 py-3">{formatJson(row.validationErrors)}</td>
            <td className="px-4 py-3">{row.duplicateOfInvoiceId ? <Link className="underline" href={`/invoices/${row.duplicateOfInvoiceId}`}>{row.duplicateOfInvoice?.invoiceNumber ?? row.duplicateOfInvoiceId}</Link> : "-"}</td>
            <td className="px-4 py-3">{row.createdInvoiceId ? <Link className="underline" href={`/invoices/${row.createdInvoiceId}`}>{row.createdInvoice?.invoiceNumber ?? row.createdInvoiceId}</Link> : "-"}</td>
          </tr>
        );
      })}
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
    COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    IMPORTED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    VALID: "border-emerald-200 bg-emerald-50 text-emerald-700",
    COMPLETED_WITH_ERRORS: "border-amber-200 bg-amber-50 text-amber-700",
    DUPLICATE: "border-amber-200 bg-amber-50 text-amber-700",
    INVALID: "border-rose-200 bg-rose-50 text-rose-700",
    FAILED: "border-rose-200 bg-rose-50 text-rose-700",
    CANCELLED: "border-slate-200 bg-slate-50 text-slate-700",
  };
  return <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${styles[value] ?? "border-blue-200 bg-blue-50 text-blue-700"}`}>{value}</span>;
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

function formatJson(value: unknown) {
  if (!value) return "-";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function importFile(
  importer: (formData: FormData) => Promise<InvoiceImportBatch>,
  file: File,
  context: { programmeId?: string; programmeCode?: string; anchorId?: string },
) {
  const formData = new FormData();
  formData.set("file", file);
  if (context.programmeId) formData.set("programmeId", context.programmeId);
  if (context.programmeCode) formData.set("programmeCode", context.programmeCode);
  if (context.anchorId) formData.set("anchorId", context.anchorId);
  return importer(formData);
}

function downloadSampleCsv() {
  const url = URL.createObjectURL(new Blob([sampleCsv], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "invoice-import-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}
