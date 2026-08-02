"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  acceptFinancingOffer,
  addProgrammeParticipant,
  approveInvoice,
  collectFinancingTransaction,
  confirmBuyerApproval,
  createCounterparty,
  createInvoice,
  createOperationRecord,
  createProgramme,
  createUser,
  exportPhase2Csv,
  approveApproval,
  cancelApproval,
  deleteFinancingTransaction,
  deleteInvoice,
  disburseFinancingTransaction,
  fundFinancingTransaction,
  generateFinancingOfferFromInvoice,
  getCounterparties,
  getCounterparty,
  getApproval,
  getApprovals,
  getFinancingTransaction,
  getFinancingTransactions,
  getHealth,
  getInvoice,
  getInvoices,
  getOperationRecords,
  getOperationsDashboard,
  getProgramme,
  getProgrammes,
  getRoles,
  getUsers,
  getPendingApprovals,
  getPhase2Records,
  rejectApproval,
  runCounterpartyFullComplianceCheck,
  runCounterpartyKyb,
  runCounterpartyScreening,
  runUboFullComplianceCheck,
  runUboKyc,
  runUboScreening,
  updateCounterparty,
  updateFinancingTransaction,
  updateInvoice,
  updateOperationRecord,
  updateProgramme,
  updateUser,
  runInvoiceDuplicateCheck,
  validateInvoiceWithEInvoicing,
} from "@/src/lib/api";
import { getApiError } from "@/src/lib/api/client";
import type {
  Counterparty,
  CounterpartyType,
  ApprovalRequest,
  FinancingTransaction,
  Invoice,
  AdminUser,
  Programme,
  Role,
  Phase2Resource,
} from "@/src/lib/api/types";
import { formatDate, formatMoney, formatPercent } from "@/src/lib/format";
import {
  AppShell,
  Button,
  Card,
  DataTable,
  Field,
  LinkButton,
  PageHeader,
  PermissionGate,
  StatusMessage,
  inputClass,
} from "./app-shell";
import { PERMISSIONS } from "@/src/lib/permissions";

const counterpartySchema = z.object({
  type: z.enum(["ANCHOR", "SUPPLIER", "FUNDER", "INVESTOR"]),
  legalName: z.string().min(1, "Legal name is required"),
  tradingName: z.string().optional(),
  registrationNumber: z.string().optional(),
  tin: z.string().optional(),
  country: z.string().min(1, "Country is required"),
  address: z.string().optional(),
  industry: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  website: z.string().optional(),
  ownershipSummary: z.string().optional(),
  directorsSummary: z.string().optional(),
  onboardingStatus: z.enum(["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED"]).optional(),
  onboardingProgress: z.coerce.number().int().min(0).max(100).optional().or(z.literal("")),
  riskRating: z.enum(["LOW", "MEDIUM", "HIGH"]).optional().or(z.literal("")),
  kycTier: z.enum(["SIMPLIFIED", "STANDARD", "ENHANCED"]).optional().or(z.literal("")),
  kybStatus: z.enum(["NOT_STARTED", "PENDING", "VERIFIED", "FAILED", "MANUAL_REVIEW"]).optional(),
  identityVerificationStatus: z.enum(["NOT_STARTED", "PENDING", "VERIFIED", "FAILED", "MANUAL_REVIEW"]).optional(),
  registryVerificationStatus: z.enum(["NOT_STARTED", "PENDING", "VERIFIED", "FAILED", "MANUAL_REVIEW"]).optional(),
  creditBureauStatus: z.enum(["NOT_STARTED", "PENDING", "VERIFIED", "FAILED", "MANUAL_REVIEW"]).optional(),
  sanctionsScreeningStatus: z.enum(["NOT_SCREENED", "CLEAR", "POSSIBLE_MATCH", "CONFIRMED_MATCH"]).optional(),
  pepScreeningStatus: z.enum(["NOT_SCREENED", "CLEAR", "POSSIBLE_MATCH", "CONFIRMED_MATCH"]).optional(),
  adverseMediaScreeningStatus: z.enum(["NOT_SCREENED", "CLEAR", "POSSIBLE_MATCH", "CONFIRMED_MATCH"]).optional(),
  lastScreenedAt: z.string().optional(),
  nextReviewDate: z.string().optional(),
  consentAcceptedAt: z.string().optional(),
  dataProcessingAgreementAcceptedAt: z.string().optional(),
  submittedAt: z.string().optional(),
  approvedAt: z.string().optional(),
  rejectedAt: z.string().optional(),
  onboardingDecisionReason: z.string().optional(),
  bankName: z.string().optional(),
  accountName: z.string().optional(),
  accountNumber: z.string().optional(),
  bankBranch: z.string().optional(),
  bankCurrency: z.string().optional(),
  paymentInstruction: z.string().optional(),
  bankVerificationStatus: z.enum(["NOT_STARTED", "PENDING", "VERIFIED", "FAILED", "MANUAL_REVIEW"]).optional(),
  bankIsVerified: z.boolean().optional(),
  bankIsPrimary: z.boolean().optional(),
  uboFullName: z.string().optional(),
  uboNationality: z.string().optional(),
  uboDateOfBirth: z.string().optional(),
  uboAddress: z.string().optional(),
  uboIdType: z.string().optional(),
  uboIdNumber: z.string().optional(),
  uboOwnershipPercentage: z.coerce.number().min(0).max(100).optional().or(z.literal("")),
  uboScreeningStatus: z.enum(["NOT_SCREENED", "CLEAR", "POSSIBLE_MATCH", "CONFIRMED_MATCH"]).optional(),
  directorFullName: z.string().optional(),
  directorRoleTitle: z.string().optional(),
  directorNationality: z.string().optional(),
  directorDateOfBirth: z.string().optional(),
  directorIdType: z.string().optional(),
  directorIdNumber: z.string().optional(),
  directorScreeningStatus: z.enum(["NOT_SCREENED", "CLEAR", "POSSIBLE_MATCH", "CONFIRMED_MATCH"]).optional(),
  certificateOfIncorporation: z.boolean().optional(),
  regulatoryLicences: z.boolean().optional(),
  financials: z.boolean().optional(),
  documentFileName: z.string().optional(),
  documentStatus: z.enum(["REQUIRED", "RECEIVED", "VERIFIED", "EXPIRED", "WAIVED"]).optional(),
  documentIssuedAt: z.string().optional(),
  documentExpiresAt: z.string().optional(),
  documentNotes: z.string().optional(),
  consentAccepted: z.boolean().optional(),
  dataProcessingAgreementAccepted: z.boolean().optional(),
});

const programmeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  productType: z.enum([
    "REVERSE_FACTORING",
    "DYNAMIC_DISCOUNTING",
    "RECEIVABLES_FINANCE",
    "FACTORING",
    "INVOICE_DISCOUNTING",
    "DISTRIBUTOR_FINANCE",
    "DEEP_TIER_FINANCE",
    "RECEIVABLES_PURCHASE",
  ]),
  mode: z.enum(["LIVE", "SANDBOX"]),
  anchorId: z.string().uuid("Select an anchor"),
  currency: z.string().min(1, "Currency is required"),
  status: z.enum(["DRAFT", "ACTIVE", "SUSPENDED", "CLOSED"]).optional(),
  version: z.coerce.number().int().positive().optional().or(z.literal("")),
  effectiveFrom: z.string().optional(),
  effectiveTo: z.string().optional(),
  expiresAt: z.string().optional(),
  eligibilityCounterpartyStatus: z.enum(["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED"]),
  minimumInvoiceAgeDays: z.coerce.number().int().min(0).optional().or(z.literal("")),
  maximumInvoiceAgeDays: z.coerce.number().int().min(0).optional().or(z.literal("")),
  annualDiscountRate: z.coerce.number().min(0),
  maxTenorDays: z.coerce.number().int().positive().optional().or(z.literal("")),
  minimumInvoiceAmount: z.coerce.number().min(0).optional().or(z.literal("")),
  maximumInvoiceAmount: z.coerce.number().min(0).optional().or(z.literal("")),
  excludedCounterpartyIdsText: z.string().optional(),
  programmeLimit: z.coerce.number().min(0).optional().or(z.literal("")),
  anchorLimit: z.coerce.number().min(0).optional().or(z.literal("")),
  supplierLimit: z.coerce.number().min(0).optional().or(z.literal("")),
  funderLimit: z.coerce.number().min(0).optional().or(z.literal("")),
  concentrationCapPercent: z.coerce.number().min(0).optional().or(z.literal("")),
  referenceRateSource: z.string().optional(),
  referenceRate: z.coerce.number().min(0).optional().or(z.literal("")),
  funderSpread: z.coerce.number().min(0).optional().or(z.literal("")),
  dayCountConvention: z.enum(["ACT_360", "ACT_365", "THIRTY_360"]),
  discountMethod: z.enum(["STRAIGHT_DISCOUNT", "TRUE_DISCOUNT"]),
  platformFeeFlat: z.coerce.number().min(0).optional().or(z.literal("")),
  platformFeePercent: z.coerce.number().min(0).optional().or(z.literal("")),
  arrangementFeeFlat: z.coerce.number().min(0).optional().or(z.literal("")),
  servicingFeePercent: z.coerce.number().min(0).optional().or(z.literal("")),
  requiredDocumentsText: z.string().optional(),
  eSignRequired: z.boolean().optional(),
  workflowSlaHours: z.coerce.number().int().min(0).optional().or(z.literal("")),
  approvalWorkflowText: z.string().optional(),
  eligibilityRulesText: z.string().optional(),
  limitRulesText: z.string().optional(),
  pricingRulesText: z.string().optional(),
  sandboxAssumptionsText: z.string().optional(),
  whiteLabelName: z.string().optional(),
  brandPrimaryColor: z.string().optional(),
  brandLogoUrl: z.string().optional(),
  termsUrl: z.string().optional(),
  configurationNotes: z.string().optional(),
});

const invoiceSchema = z.object({
  programmeId: z.string().uuid("Select a programme"),
  buyerId: z.string().uuid("Select a buyer"),
  supplierId: z.string().uuid("Select a supplier"),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  externalReference: z.string().optional(),
  ingestionChannel: z.string().optional(),
  sourceSystem: z.string().optional(),
  purchaseOrderNumber: z.string().optional(),
  goodsReceivedNote: z.string().optional(),
  amount: z.coerce.number().positive(),
  taxAmount: z.coerce.number().min(0).optional().or(z.literal("")),
  creditNoteAmount: z.coerce.number().min(0).optional().or(z.literal("")),
  paidAmount: z.coerce.number().min(0).optional().or(z.literal("")),
  disputedAmount: z.coerce.number().min(0).optional().or(z.literal("")),
  financeableAmount: z.coerce.number().min(0).optional().or(z.literal("")),
  currency: z.string().min(1, "Currency is required"),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  status: z.enum(["RECEIVED", "VALIDATED", "APPROVED", "FINANCEABLE", "OFFERED", "FINANCED", "SETTLED", "DISPUTED", "CANCELLED"]).optional(),
  validationStatus: z.string().optional(),
  validationErrorsText: z.string().optional(),
  duplicateCheckStatus: z.string().optional(),
  fraudCheckStatus: z.string().optional(),
  provenanceHash: z.string().optional(),
  attachmentMetadataText: z.string().optional(),
  fiscalReference: z.string().optional(),
  description: z.string().optional(),
});

const financingSchema = z.object({
  offerReference: z.string().optional(),
  invoiceAmount: z.coerce.number().min(0),
  annualRate: z.coerce.number().min(0),
  referenceRate: z.coerce.number().min(0).optional().or(z.literal("")),
  spreadRate: z.coerce.number().min(0).optional().or(z.literal("")),
  discountAmount: z.coerce.number().min(0),
  platformFee: z.coerce.number().min(0),
  arrangementFee: z.coerce.number().min(0).optional().or(z.literal("")),
  servicingFee: z.coerce.number().min(0).optional().or(z.literal("")),
  netProceeds: z.coerce.number().min(0),
  buyerObligationAmount: z.coerce.number().min(0).optional().or(z.literal("")),
  funderSettlementAmount: z.coerce.number().min(0).optional().or(z.literal("")),
  maturityDate: z.string().min(1),
  settlementDate: z.string().optional(),
  offerExpiresAt: z.string().optional(),
  status: z.enum(["OFFERED", "ACCEPTED", "FUNDED", "DISBURSED", "MATURED", "COLLECTED", "CLOSED", "DEFAULTED", "CANCELLED"]),
  autoAccepted: z.boolean().optional(),
  discountBreakdownText: z.string().optional(),
  feeBreakdownText: z.string().optional(),
  allocationRule: z.string().optional(),
  assignmentReference: z.string().optional(),
  trueSaleStatus: z.string().optional(),
  recourseAmount: z.coerce.number().min(0).optional().or(z.literal("")),
  adjustmentAmount: z.coerce.number().min(0).optional().or(z.literal("")),
  cancellationReason: z.string().optional(),
});

const userSchema = z.object({
  email: z.string().email("Valid email is required"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  status: z.enum(["INVITED", "ACTIVE", "SUSPENDED", "DISABLED"]),
  roleIds: z.array(z.string()).optional(),
});

type CounterpartyForm = z.input<typeof counterpartySchema>;
type CounterpartySubmit = z.output<typeof counterpartySchema>;
type ProgrammeForm = z.input<typeof programmeSchema>;
type ProgrammeSubmit = z.output<typeof programmeSchema>;
type InvoiceForm = z.input<typeof invoiceSchema>;
type InvoiceSubmit = z.output<typeof invoiceSchema>;
type FinancingForm = z.input<typeof financingSchema>;
type FinancingSubmit = z.output<typeof financingSchema>;
type UserForm = z.input<typeof userSchema>;
type UserSubmit = z.output<typeof userSchema>;

const verificationStatuses = ["NOT_STARTED", "PENDING", "VERIFIED", "FAILED", "MANUAL_REVIEW"] as const;
const screeningStatuses = ["NOT_SCREENED", "CLEAR", "POSSIBLE_MATCH", "CONFIRMED_MATCH"] as const;

function cleanPayload<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== "" && value != null),
  );
}

function splitList(value?: string) {
  return value
    ?.split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseJsonBlock(value?: string) {
  if (!value?.trim()) {
    return undefined;
  }
  return JSON.parse(value) as Record<string, unknown>;
}

function buildCounterpartyPayload(values: CounterpartySubmit) {
  const {
    bankName,
    accountName,
    accountNumber,
    bankBranch,
    bankCurrency,
    paymentInstruction,
    bankVerificationStatus,
    bankIsVerified,
    bankIsPrimary,
    uboFullName,
    uboNationality,
    uboDateOfBirth,
    uboAddress,
    uboIdType,
    uboIdNumber,
    uboOwnershipPercentage,
    uboScreeningStatus,
    directorFullName,
    directorRoleTitle,
    directorNationality,
    directorDateOfBirth,
    directorIdType,
    directorIdNumber,
    directorScreeningStatus,
    certificateOfIncorporation,
    regulatoryLicences,
    financials,
    documentFileName,
    documentStatus,
    documentIssuedAt,
    documentExpiresAt,
    documentNotes,
    consentAccepted,
    dataProcessingAgreementAccepted,
    ...counterparty
  } = values;
  const now = new Date().toISOString();
  const bankAccounts =
    bankName && accountName && accountNumber
      ? [
          {
            bankName,
            accountName,
            accountNumber,
            branch: bankBranch,
            currency: bankCurrency || "GHS",
            paymentInstruction,
            verificationStatus: bankVerificationStatus,
            isVerified: bankIsVerified,
            isPrimary: bankIsPrimary ?? true,
          },
        ]
      : undefined;
  const uboRecords = uboFullName
    ? [
        {
          fullName: uboFullName,
          nationality: uboNationality,
          dateOfBirth: uboDateOfBirth,
          address: uboAddress,
          idType: uboIdType,
          idNumber: uboIdNumber,
          ownershipPercentage:
            uboOwnershipPercentage === "" ? undefined : uboOwnershipPercentage,
          screeningStatus: uboScreeningStatus,
        },
      ]
    : undefined;
  const directors = directorFullName
    ? [
        {
          fullName: directorFullName,
          roleTitle: directorRoleTitle,
          nationality: directorNationality,
          dateOfBirth: directorDateOfBirth,
          idType: directorIdType,
          idNumber: directorIdNumber,
          screeningStatus: directorScreeningStatus,
        },
      ]
    : undefined;
  const documentDetails = {
    fileName: documentFileName,
    status: documentStatus,
    issuedAt: documentIssuedAt,
    expiresAt: documentExpiresAt,
    notes: documentNotes,
  };
  const documents = [
    certificateOfIncorporation ? { documentType: "Certificate of incorporation", ...documentDetails, status: documentStatus ?? "RECEIVED" } : undefined,
    regulatoryLicences ? { documentType: "Regulatory licences", ...documentDetails, status: documentStatus ?? "RECEIVED" } : undefined,
    financials ? { documentType: "Financial statements", ...documentDetails, status: documentStatus ?? "RECEIVED" } : undefined,
  ].filter(Boolean);
  const consentRecords = [
    consentAccepted ? { consentType: "DATA_PROCESSING_CONSENT", acceptedAt: now } : undefined,
    dataProcessingAgreementAccepted ? { consentType: "DATA_PROCESSING_AGREEMENT", acceptedAt: now } : undefined,
  ].filter(Boolean);

  return cleanPayload({
    ...counterparty,
    onboardingProgress: counterparty.onboardingProgress === "" ? undefined : counterparty.onboardingProgress,
    consentAcceptedAt: consentAccepted ? now : undefined,
    dataProcessingAgreementAcceptedAt: dataProcessingAgreementAccepted ? now : undefined,
    bankAccounts,
    uboRecords,
    directors,
    documents: documents.length ? documents : undefined,
    consentRecords: consentRecords.length ? consentRecords : undefined,
  });
}

function buildProgrammePayload(values: ProgrammeSubmit) {
  const {
    excludedCounterpartyIdsText,
    requiredDocumentsText,
    approvalWorkflowText,
    eligibilityRulesText,
    limitRulesText,
    pricingRulesText,
    sandboxAssumptionsText,
    ...programme
  } = values;

  return cleanPayload({
    ...programme,
    version: programme.version === "" ? undefined : programme.version,
    minimumInvoiceAgeDays:
      programme.minimumInvoiceAgeDays === "" ? undefined : programme.minimumInvoiceAgeDays,
    maximumInvoiceAgeDays:
      programme.maximumInvoiceAgeDays === "" ? undefined : programme.maximumInvoiceAgeDays,
    maxTenorDays: programme.maxTenorDays === "" ? undefined : programme.maxTenorDays,
    minimumInvoiceAmount:
      programme.minimumInvoiceAmount === "" ? undefined : programme.minimumInvoiceAmount,
    maximumInvoiceAmount:
      programme.maximumInvoiceAmount === "" ? undefined : programme.maximumInvoiceAmount,
    programmeLimit: programme.programmeLimit === "" ? undefined : programme.programmeLimit,
    anchorLimit: programme.anchorLimit === "" ? undefined : programme.anchorLimit,
    supplierLimit: programme.supplierLimit === "" ? undefined : programme.supplierLimit,
    funderLimit: programme.funderLimit === "" ? undefined : programme.funderLimit,
    concentrationCapPercent:
      programme.concentrationCapPercent === "" ? undefined : programme.concentrationCapPercent,
    referenceRate: programme.referenceRate === "" ? undefined : programme.referenceRate,
    funderSpread: programme.funderSpread === "" ? undefined : programme.funderSpread,
    platformFeeFlat:
      programme.platformFeeFlat === "" ? undefined : programme.platformFeeFlat,
    platformFeePercent:
      programme.platformFeePercent === "" ? undefined : programme.platformFeePercent,
    arrangementFeeFlat:
      programme.arrangementFeeFlat === "" ? undefined : programme.arrangementFeeFlat,
    servicingFeePercent:
      programme.servicingFeePercent === "" ? undefined : programme.servicingFeePercent,
    workflowSlaHours:
      programme.workflowSlaHours === "" ? undefined : programme.workflowSlaHours,
    excludedCounterpartyIds: splitList(excludedCounterpartyIdsText),
    requiredDocuments: splitList(requiredDocumentsText),
    approvalWorkflow: parseJsonBlock(approvalWorkflowText),
    eligibilityRules: parseJsonBlock(eligibilityRulesText),
    limitRules: parseJsonBlock(limitRulesText),
    pricingRules: parseJsonBlock(pricingRulesText),
    sandboxAssumptions: parseJsonBlock(sandboxAssumptionsText),
  });
}

function buildInvoicePayload(values: InvoiceSubmit) {
  const { validationErrorsText, attachmentMetadataText, ...invoice } = values;
  return cleanPayload({
    ...invoice,
    taxAmount: invoice.taxAmount === "" ? undefined : invoice.taxAmount,
    creditNoteAmount: invoice.creditNoteAmount === "" ? undefined : invoice.creditNoteAmount,
    paidAmount: invoice.paidAmount === "" ? undefined : invoice.paidAmount,
    disputedAmount: invoice.disputedAmount === "" ? undefined : invoice.disputedAmount,
    financeableAmount: invoice.financeableAmount === "" ? undefined : invoice.financeableAmount,
    validationErrors: parseJsonBlock(validationErrorsText),
    attachmentMetadata: parseJsonBlock(attachmentMetadataText),
  });
}

function buildFinancingPayload(values: FinancingSubmit) {
  const { discountBreakdownText, feeBreakdownText, ...financing } = values;
  return cleanPayload({
    ...financing,
    referenceRate: financing.referenceRate === "" ? undefined : financing.referenceRate,
    spreadRate: financing.spreadRate === "" ? undefined : financing.spreadRate,
    arrangementFee: financing.arrangementFee === "" ? undefined : financing.arrangementFee,
    servicingFee: financing.servicingFee === "" ? undefined : financing.servicingFee,
    buyerObligationAmount:
      financing.buyerObligationAmount === "" ? undefined : financing.buyerObligationAmount,
    funderSettlementAmount:
      financing.funderSettlementAmount === "" ? undefined : financing.funderSettlementAmount,
    recourseAmount: financing.recourseAmount === "" ? undefined : financing.recourseAmount,
    adjustmentAmount: financing.adjustmentAmount === "" ? undefined : financing.adjustmentAmount,
    discountBreakdown: parseJsonBlock(discountBreakdownText),
    feeBreakdown: parseJsonBlock(feeBreakdownText),
  });
}

function dateInput(value?: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function useCoreData() {
  const counterparties = useQuery({
    queryKey: ["counterparties"],
    queryFn: getCounterparties,
  });
  const programmes = useQuery({
    queryKey: ["programmes"],
    queryFn: getProgrammes,
  });
  const invoices = useQuery({ queryKey: ["invoices"], queryFn: getInvoices });
  const financing = useQuery({
    queryKey: ["financing"],
    queryFn: getFinancingTransactions,
  });

  return { counterparties, programmes, invoices, financing };
}

function ErrorText({ error }: { error: unknown }) {
  return <p className="mt-3 text-sm text-rose-700">{getApiError(error)}</p>;
}

function RefreshButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="secondary" onClick={onClick}>
      Refresh
    </Button>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
      {children}
    </span>
  );
}

export function DashboardPage() {
  const health = useQuery({ queryKey: ["health"], queryFn: getHealth });
  const approvals = useQuery({ queryKey: ["approvals", "pending"], queryFn: getPendingApprovals });
  const { counterparties, programmes, invoices, financing } = useCoreData();

  const metrics = useMemo(() => {
    const invoiceRows = invoices.data ?? [];
    const financingRows = financing.data ?? [];
    return [
      ["Total counterparties", counterparties.data?.length ?? 0],
      ["Total programmes", programmes.data?.length ?? 0],
      ["Total invoices", invoiceRows.length],
      ["Approved invoices", invoiceRows.filter((row) => row.status === "APPROVED").length],
      ["Financing offers", financingRows.length],
      ["Pending approvals", approvals.data?.length ?? 0],
      [
        "Accepted financing",
        financingRows.filter((row) => row.status === "ACCEPTED").length,
      ],
      [
        "Total invoice amount",
        formatMoney(invoiceRows.reduce((sum, row) => sum + Number(row.amount), 0)),
      ],
      [
        "Total net proceeds",
        formatMoney(
          financingRows.reduce((sum, row) => sum + Number(row.netProceeds), 0),
        ),
      ],
    ];
  }, [counterparties.data, programmes.data, invoices.data, financing.data, approvals.data]);

  return (
    <AppShell>
      <PageHeader
        title="Dashboard"
        description="Operating snapshot from live backend endpoints."
        action={<RefreshButton onClick={() => void health.refetch()} />}
      />
      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-500">API health</p>
        <p className="mt-1 text-lg font-semibold">
          {health.data ? `${health.data.service}: ${health.data.status}` : "Not reachable"}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map(([label, value]) => (
          <Card key={label.toString()}>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
            {label === "Pending approvals" ? (
              <Link className="mt-2 inline-block text-sm font-medium underline" href="/approvals/pending">
                Review queue
              </Link>
            ) : null}
          </Card>
        ))}
      </div>
    </AppShell>
  );
}

export function UserManagementPage() {
  const queryClient = useQueryClient();
  const users = useQuery({ queryKey: ["users"], queryFn: getUsers });
  const roles = useQuery({ queryKey: ["roles"], queryFn: getRoles });
  const form = useForm<UserForm, unknown, UserSubmit>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      status: "INVITED",
      roleIds: [],
    },
  });
  const create = useMutation({
    mutationFn: createUser,
    onSuccess: async () => {
      form.reset({ status: "INVITED", roleIds: [] });
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
  const createRoleIds = useWatch({
    control: form.control,
    name: "roleIds",
  }) ?? [];

  return (
    <AppShell>
      <PageHeader
        title="User Management"
        description="Super admin controls for users, roles and access."
        action={<RefreshButton onClick={() => void users.refetch()} />}
      />
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <PermissionGate permission={PERMISSIONS.userCreate}>
          <FormCard
            onSubmit={form.handleSubmit((values) => create.mutate(cleanPayload(values)))}
          >
            <h3 className="mb-4 text-lg font-semibold">Create user</h3>
            <div className="grid gap-4">
              <TextField label="Email" type="email" error={form.formState.errors.email?.message} {...form.register("email")} />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                <TextField label="First name" {...form.register("firstName")} />
                <TextField label="Last name" {...form.register("lastName")} />
              </div>
              <TextField label="Phone" {...form.register("phone")} />
              <TextField label="Temporary password" type="password" error={form.formState.errors.password?.message} {...form.register("password")} />
              <SelectField label="Status" {...form.register("status")}>
                {["INVITED", "ACTIVE", "SUSPENDED", "DISABLED"].map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </SelectField>
              <RoleCheckboxes
                roles={roles.data ?? []}
                selectedRoleIds={createRoleIds}
                onChange={(roleIds) => form.setValue("roleIds", roleIds)}
              />
            </div>
            <SubmitRow loading={create.isPending} />
            {create.isError ? <ErrorText error={create.error} /> : null}
          </FormCard>
        </PermissionGate>

        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Users</h3>
              <p className="text-sm text-slate-500">{users.data?.length ?? 0} configured users</p>
            </div>
          </div>
          <StatusMessage
            loading={users.isLoading || roles.isLoading}
            error={users.isError ? getApiError(users.error) : roles.isError ? getApiError(roles.error) : undefined}
            empty={users.data?.length === 0 ? "No users configured." : undefined}
          />
          {users.data?.length ? (
            <div className="space-y-4">
              {users.data.map((user) => (
                <EditableUserRow
                  key={user.id}
                  user={user}
                  roles={roles.data ?? []}
                  onSaved={() => queryClient.invalidateQueries({ queryKey: ["users"] })}
                />
              ))}
            </div>
          ) : null}
        </Card>
      </div>
    </AppShell>
  );
}

export function ApprovalsPage({ pendingOnly = false }: { pendingOnly?: boolean }) {
  const query = useQuery({
    queryKey: ["approvals", pendingOnly ? "pending" : "all"],
    queryFn: pendingOnly ? getPendingApprovals : getApprovals,
  });
  return (
    <AppShell>
      <PageHeader
        title={pendingOnly ? "Pending Approvals" : "Approvals"}
        description="Maker-checker requests for KYC, programmes, invoices, funding and payment status changes."
        action={<RefreshButton onClick={() => void query.refetch()} />}
      />
      <StatusMessage
        loading={query.isLoading}
        error={query.isError ? getApiError(query.error) : undefined}
        empty={query.data?.length === 0 ? "No approvals found." : undefined}
      />
      {query.data?.length ? <ApprovalsTable rows={query.data} /> : null}
    </AppShell>
  );
}

function ApprovalsTable({ rows }: { rows: ApprovalRequest[] }) {
  return (
    <DataTable headers={["Action", "Entity", "Status", "Requested by", "Requested", "Actions"]}>
      {rows.map((row) => (
        <tr key={row.id}>
          <td className="px-4 py-3 font-medium">{row.action}</td>
          <td className="px-4 py-3">{row.entityType}:{row.entityId.slice(0, 8)}</td>
          <td className="px-4 py-3"><Badge>{row.status}</Badge></td>
          <td className="px-4 py-3">{row.requestedById.slice(0, 8)}</td>
          <td className="px-4 py-3">{formatDate(row.requestedAt)}</td>
          <td className="px-4 py-3">
            <Link className="font-medium underline" href={`/approvals/${row.id}`}>View</Link>
          </td>
        </tr>
      ))}
    </DataTable>
  );
}

export function ApprovalDetailPage({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["approval", id], queryFn: () => getApproval(id) });
  const [comment, setComment] = useState("");
  const [reason, setReason] = useState("");
  const approve = useMutation({
    mutationFn: () => approveApproval(id, { comment }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["approval", id] });
      await queryClient.invalidateQueries({ queryKey: ["approvals"] });
    },
  });
  const reject = useMutation({
    mutationFn: () => rejectApproval(id, { reason: reason || "Rejected" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["approval", id] });
      await queryClient.invalidateQueries({ queryKey: ["approvals"] });
    },
  });
  const cancel = useMutation({
    mutationFn: () => cancelApproval(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["approval", id] });
      await queryClient.invalidateQueries({ queryKey: ["approvals"] });
    },
  });
  return (
    <AppShell>
      <PageHeader title="Approval Detail" action={<LinkButton href="/approvals">Back</LinkButton>} />
      <DetailState query={query}>
        {(row) => (
          <div className="grid gap-6">
            <DetailsGrid
              rows={[
                ["Action", row.action],
                ["Status", row.status],
                ["Entity type", row.entityType],
                ["Entity ID", row.entityId],
                ["Target record", phase2ApprovalHref(row) ? "Open linked product record below" : "-"],
                ["Requested by", row.requestedById],
                ["Approved by", row.approvedById ?? "-"],
                ["Rejected by", row.rejectedById ?? "-"],
                ["Requested at", formatDate(row.requestedAt)],
                ["Approved at", formatDate(row.approvedAt)],
                ["Rejected at", formatDate(row.rejectedAt)],
                ["Approval comment", row.approvalComment ?? "-"],
                ["Rejection reason", row.rejectionReason ?? "-"],
                ["Payload", formatJson(row.requestPayload)],
              ]}
            />
            {phase2ApprovalHref(row) ? (
              <Card>
                <h3 className="mb-3 text-lg font-semibold">Product approval context</h3>
                <p className="mb-4 text-sm text-slate-600">
                  Requested action: {phase2RequestedAction(row)}
                </p>
                <Link className="font-medium underline" href={phase2ApprovalHref(row) ?? "/approvals"}>
                  View target product record
                </Link>
              </Card>
            ) : null}
            {row.status === "PENDING" ? (
              <Card>
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField label="Approval comment" value={comment} onChange={(event) => setComment(event.target.value)} />
                  <TextField label="Rejection reason" value={reason} onChange={(event) => setReason(event.target.value)} />
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <PermissionGate permission={PERMISSIONS.workflowComplete}>
                    <Button disabled={approve.isPending} onClick={() => approve.mutate()}>Approve</Button>
                    <Button variant="danger" disabled={reject.isPending} onClick={() => reject.mutate()}>Reject</Button>
                  </PermissionGate>
                  <PermissionGate permission={PERMISSIONS.workflowCancel}>
                    <Button variant="secondary" disabled={cancel.isPending} onClick={() => cancel.mutate()}>Cancel</Button>
                  </PermissionGate>
                </div>
                {approve.isError ? <ErrorText error={approve.error} /> : null}
                {reject.isError ? <ErrorText error={reject.error} /> : null}
                {cancel.isError ? <ErrorText error={cancel.error} /> : null}
              </Card>
            ) : null}
          </div>
        )}
      </DetailState>
    </AppShell>
  );
}

export function CounterpartiesPage() {
  const query = useQuery({ queryKey: ["counterparties"], queryFn: getCounterparties });
  return (
    <AppShell>
      <PageHeader
        title="Counterparties"
        action={
          <div className="flex gap-2">
            <RefreshButton onClick={() => void query.refetch()} />
            <PermissionGate permission={PERMISSIONS.counterpartyCreate}>
              <LinkButton href="/counterparties/new">New Counterparty</LinkButton>
            </PermissionGate>
          </div>
        }
      />
      <StatusMessage
        loading={query.isLoading}
        error={query.isError ? getApiError(query.error) : undefined}
        empty={query.data?.length === 0 ? "No counterparties yet." : undefined}
      />
      {query.data?.length ? (
        <DataTable
          headers={[
            "Legal name",
            "Type",
            "Country",
            "Onboarding status",
            "Progress",
            "KYC tier",
            "Risk rating",
            "Created date",
            "Actions",
          ]}
        >
          {query.data.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3 font-medium">{row.legalName}</td>
              <td className="px-4 py-3"><Badge>{row.type}</Badge></td>
              <td className="px-4 py-3">{row.country}</td>
              <td className="px-4 py-3">{row.onboardingStatus}</td>
              <td className="px-4 py-3">{row.onboardingProgress}%</td>
              <td className="px-4 py-3">{row.kycTier ?? "-"}</td>
              <td className="px-4 py-3">{row.riskRating ?? "-"}</td>
              <td className="px-4 py-3">{formatDate(row.createdAt)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <Link className="font-medium text-slate-950 underline" href={`/counterparties/${row.id}`}>
                    View
                  </Link>
                  <PermissionGate permission={PERMISSIONS.counterpartyUpdate}>
                    <Link className="font-medium text-slate-950 underline" href={`/counterparties/${row.id}/edit`}>
                      Edit
                    </Link>
                  </PermissionGate>
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      ) : null}
    </AppShell>
  );
}

export function NewCounterpartyPage() {
  const router = useRouter();
  const form = useForm<CounterpartyForm, unknown, CounterpartySubmit>({
    resolver: zodResolver(counterpartySchema),
    defaultValues: {
      type: "ANCHOR",
      country: "GH",
      onboardingProgress: 0,
      kybStatus: "NOT_STARTED",
      identityVerificationStatus: "NOT_STARTED",
      registryVerificationStatus: "NOT_STARTED",
      creditBureauStatus: "NOT_STARTED",
      sanctionsScreeningStatus: "NOT_SCREENED",
      pepScreeningStatus: "NOT_SCREENED",
      adverseMediaScreeningStatus: "NOT_SCREENED",
      bankCurrency: "GHS",
    },
  });
  const mutation = useMutation({
    mutationFn: createCounterparty,
    onSuccess: () => router.push("/counterparties"),
  });

  return (
    <AppShell>
      <PageHeader title="New Counterparty" />
      <FormCard
        onSubmit={form.handleSubmit((values) =>
          mutation.mutate(buildCounterpartyPayload(values)),
        )}
      >
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Role-specific onboarding</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField label="Type" error={form.formState.errors.type?.message} {...form.register("type")}>
            {["ANCHOR", "SUPPLIER", "FUNDER", "INVESTOR"].map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </SelectField>
          <TextField label="Legal name" error={form.formState.errors.legalName?.message} {...form.register("legalName")} />
          <TextField label="Trading name" {...form.register("tradingName")} />
          <TextField label="Registration number" {...form.register("registrationNumber")} />
          <TextField label="TIN" {...form.register("tin")} />
          <TextField label="Country" error={form.formState.errors.country?.message} {...form.register("country")} />
          <TextField label="Address" {...form.register("address")} />
          <TextField label="Industry" {...form.register("industry")} />
          <TextField label="Contact email" type="email" {...form.register("contactEmail")} />
          <TextField label="Contact phone" {...form.register("contactPhone")} />
          <TextField label="Website" {...form.register("website")} />
          <TextField label="Onboarding progress %" type="number" min={0} max={100} {...form.register("onboardingProgress")} />
          <TextField label="Next periodic review" type="date" {...form.register("nextReviewDate")} />
        </div>

        <h3 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">KYC / KYB risk and screening</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField label="Risk rating" {...form.register("riskRating")}>
            <option value="">Unrated</option>
            {["LOW", "MEDIUM", "HIGH"].map((status) => <option key={status} value={status}>{status}</option>)}
          </SelectField>
          <SelectField label="KYC tier" {...form.register("kycTier")}>
            <option value="">Not assigned</option>
            {["SIMPLIFIED", "STANDARD", "ENHANCED"].map((tier) => <option key={tier} value={tier}>{tier}</option>)}
          </SelectField>
          <SelectField label="KYB status" {...form.register("kybStatus")}>
            {verificationStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </SelectField>
          <SelectField label="Identity verification" {...form.register("identityVerificationStatus")}>
            {verificationStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </SelectField>
          <SelectField label="Registry verification" {...form.register("registryVerificationStatus")}>
            {verificationStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </SelectField>
          <SelectField label="Credit bureau status" {...form.register("creditBureauStatus")}>
            {verificationStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </SelectField>
          <SelectField label="Sanctions screening" {...form.register("sanctionsScreeningStatus")}>
            {screeningStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </SelectField>
          <SelectField label="PEP screening" {...form.register("pepScreeningStatus")}>
            {screeningStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </SelectField>
          <SelectField label="Adverse media screening" {...form.register("adverseMediaScreeningStatus")}>
            {screeningStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </SelectField>
        </div>

        <h3 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">Ownership, directors and bank details</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Ownership summary" {...form.register("ownershipSummary")} />
          <TextField label="Directors summary" {...form.register("directorsSummary")} />
          <TextField label="UBO full name" {...form.register("uboFullName")} />
          <TextField label="UBO nationality" {...form.register("uboNationality")} />
          <TextField label="UBO ID type" {...form.register("uboIdType")} />
          <TextField label="UBO ID number" {...form.register("uboIdNumber")} />
          <TextField label="UBO ownership %" type="number" min={0} max={100} {...form.register("uboOwnershipPercentage")} />
          <TextField label="Director full name" {...form.register("directorFullName")} />
          <TextField label="Director role/title" {...form.register("directorRoleTitle")} />
          <TextField label="Director nationality" {...form.register("directorNationality")} />
          <TextField label="Bank name" {...form.register("bankName")} />
          <TextField label="Account name" {...form.register("accountName")} />
          <TextField label="Account number" {...form.register("accountNumber")} />
          <TextField label="Branch" {...form.register("bankBranch")} />
          <TextField label="Bank currency" {...form.register("bankCurrency")} />
          <TextField label="Payment instruction" {...form.register("paymentInstruction")} />
        </div>

        <h3 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">Documents and consent</h3>
        <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" {...form.register("certificateOfIncorporation")} />
            Certificate of incorporation received
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" {...form.register("regulatoryLicences")} />
            Regulatory licences received
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" {...form.register("financials")} />
            Financial statements received
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" {...form.register("consentAccepted")} />
            Data-processing consent captured
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" {...form.register("dataProcessingAgreementAccepted")} />
            Data-processing agreement accepted
          </label>
        </div>
        <SubmitRow loading={mutation.isPending} />
        {mutation.isError ? <ErrorText error={mutation.error} /> : null}
      </FormCard>
    </AppShell>
  );
}

export function CounterpartyDetailPage({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["counterparty", id], queryFn: () => getCounterparty(id) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["counterparty", id] });
  const runKyb = useMutation({ mutationFn: () => runCounterpartyKyb(id), onSuccess: refresh });
  const runScreening = useMutation({ mutationFn: () => runCounterpartyScreening(id), onSuccess: refresh });
  const runFull = useMutation({ mutationFn: () => runCounterpartyFullComplianceCheck(id), onSuccess: refresh });
  return (
    <AppShell>
      <PageHeader title="Counterparty Detail" action={<LinkButton href="/counterparties">Back</LinkButton>} />
      <DetailState query={query}>
        {(row) => (
          <div className="space-y-6">
            <DetailsGrid
              rows={[
                ["Legal name", row.legalName],
                ["Trading name", row.tradingName ?? "-"],
                ["Type", row.type],
                ["Registration number", row.registrationNumber ?? "-"],
                ["TIN", row.tin ?? "-"],
                ["Country", row.country],
                ["Address", row.address ?? "-"],
                ["Industry", row.industry ?? "-"],
                ["Contact email", row.contactEmail ?? "-"],
                ["Contact phone", row.contactPhone ?? "-"],
                ["Website", row.website ?? "-"],
                ["Onboarding status", row.onboardingStatus],
                ["Onboarding progress", `${row.onboardingProgress}%`],
                ["Risk rating", row.riskRating ?? "-"],
                ["KYC tier", row.kycTier ?? "-"],
                ["Next periodic review", formatDate(row.nextReviewDate)],
                ["Consent accepted", formatDate(row.consentAcceptedAt)],
                ["Data processing agreement", formatDate(row.dataProcessingAgreementAcceptedAt)],
                ["Created date", formatDate(row.createdAt)],
                ["Updated date", formatDate(row.updatedAt)],
              ]}
            />
            <DetailsGrid
              rows={[
                ["KYB status", row.kybStatus],
                ["Identity verification", row.identityVerificationStatus],
                ["Registry verification", row.registryVerificationStatus],
                ["Credit bureau status", row.creditBureauStatus],
                ["Sanctions screening", row.sanctionsScreeningStatus],
                ["PEP screening", row.pepScreeningStatus],
                ["Adverse media screening", row.adverseMediaScreeningStatus],
                ["Last screened", formatDate(row.lastScreenedAt)],
                ["Ownership summary", row.ownershipSummary ?? "-"],
                ["Directors summary", row.directorsSummary ?? "-"],
              ]}
            />
            <PermissionGate permission={PERMISSIONS.complianceRunChecks}>
              <Card>
                <h3 className="mb-4 text-lg font-semibold">Compliance actions</h3>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => runKyb.mutate()} disabled={runKyb.isPending}>Run KYB</Button>
                  <Button onClick={() => runScreening.mutate()} disabled={runScreening.isPending}>Run screening</Button>
                  <Button onClick={() => runFull.mutate()} disabled={runFull.isPending}>Run full compliance check</Button>
                </div>
              </Card>
            </PermissionGate>
            <CounterpartyRelatedTables row={row} />
          </div>
        )}
      </DetailState>
    </AppShell>
  );
}

export function EditCounterpartyPage({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const query = useQuery({ queryKey: ["counterparty", id], queryFn: () => getCounterparty(id) });
  return (
    <AppShell>
      <PageHeader title="Edit Counterparty" action={<LinkButton href={`/counterparties/${id}`}>Back to Counterparty</LinkButton>} />
      <DetailState query={query}>
        {(row) => (
          <PermissionGate permission={PERMISSIONS.counterpartyUpdate}>
            <CounterpartyEditForm
              counterparty={row}
              onSaved={async () => {
                await queryClient.invalidateQueries({ queryKey: ["counterparty", id] });
                await queryClient.invalidateQueries({ queryKey: ["counterparties"] });
                router.push(`/counterparties/${id}`);
              }}
            />
          </PermissionGate>
        )}
      </DetailState>
    </AppShell>
  );
}

function CounterpartyRelatedTables({ row }: { row: Counterparty }) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["counterparty", row.id] });
  const runUboKycMutation = useMutation({ mutationFn: runUboKyc, onSuccess: refresh });
  const runUboScreeningMutation = useMutation({ mutationFn: runUboScreening, onSuccess: refresh });
  const runUboFullMutation = useMutation({ mutationFn: runUboFullComplianceCheck, onSuccess: refresh });
  return (
    <div className="space-y-6">
      <RelatedSection title="Bank and payment instructions" empty={!row.bankAccounts?.length}>
        <DataTable headers={["Bank", "Account name", "Account number", "Currency", "Verified", "Instruction"]}>
          {row.bankAccounts?.map((account) => (
            <tr key={account.id}>
              <td className="px-4 py-3">{account.bankName}</td>
              <td className="px-4 py-3">{account.accountName}</td>
              <td className="px-4 py-3">{account.accountNumber}</td>
              <td className="px-4 py-3">{account.currency}</td>
              <td className="px-4 py-3">{account.verificationStatus}</td>
              <td className="px-4 py-3">{account.paymentInstruction ?? "-"}</td>
            </tr>
          ))}
        </DataTable>
      </RelatedSection>
      <RelatedSection title="Ultimate beneficial owners" empty={!row.uboRecords?.length}>
        <DataTable headers={["Name", "Nationality", "ID type", "ID number", "Ownership", "KYC", "Screening", "Sanctions", "PEP", "Adverse", "Actions"]}>
          {row.uboRecords?.map((ubo) => (
            <tr key={ubo.id}>
              <td className="px-4 py-3">{ubo.fullName}</td>
              <td className="px-4 py-3">{ubo.nationality ?? "-"}</td>
              <td className="px-4 py-3">{ubo.idType ?? "-"}</td>
              <td className="px-4 py-3">{ubo.idNumber ?? "-"}</td>
              <td className="px-4 py-3">{ubo.ownershipPercentage ?? "-"}</td>
              <td className="px-4 py-3">{ubo.kycStatus ?? "-"}</td>
              <td className="px-4 py-3">{ubo.screeningStatus}</td>
              <td className="px-4 py-3">{ubo.sanctionsStatus ?? "-"}</td>
              <td className="px-4 py-3">{ubo.pepStatus ?? "-"}</td>
              <td className="px-4 py-3">{ubo.adverseMediaStatus ?? "-"}</td>
              <td className="px-4 py-3">
                <PermissionGate permission={PERMISSIONS.complianceRunChecks}>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => runUboKycMutation.mutate(ubo.id)} disabled={runUboKycMutation.isPending}>KYC</Button>
                    <Button variant="secondary" onClick={() => runUboScreeningMutation.mutate(ubo.id)} disabled={runUboScreeningMutation.isPending}>Screen</Button>
                    <Button variant="secondary" onClick={() => runUboFullMutation.mutate(ubo.id)} disabled={runUboFullMutation.isPending}>Full</Button>
                  </div>
                </PermissionGate>
              </td>
            </tr>
          ))}
        </DataTable>
      </RelatedSection>
      <RelatedSection title="Directors" empty={!row.directors?.length}>
        <DataTable headers={["Name", "Role", "Nationality", "ID type", "ID number", "Screening"]}>
          {row.directors?.map((director) => (
            <tr key={director.id}>
              <td className="px-4 py-3">{director.fullName}</td>
              <td className="px-4 py-3">{director.roleTitle ?? "-"}</td>
              <td className="px-4 py-3">{director.nationality ?? "-"}</td>
              <td className="px-4 py-3">{director.idType ?? "-"}</td>
              <td className="px-4 py-3">{director.idNumber ?? "-"}</td>
              <td className="px-4 py-3">{director.screeningStatus}</td>
            </tr>
          ))}
        </DataTable>
      </RelatedSection>
      <RelatedSection title="Document collection" empty={!row.documents?.length}>
        <DataTable headers={["Document", "File", "Status", "Issued", "Expires", "Notes"]}>
          {row.documents?.map((document) => (
            <tr key={document.id}>
              <td className="px-4 py-3">{document.documentType}</td>
              <td className="px-4 py-3">{document.fileName ?? "-"}</td>
              <td className="px-4 py-3">{document.status}</td>
              <td className="px-4 py-3">{formatDate(document.issuedAt)}</td>
              <td className="px-4 py-3">{formatDate(document.expiresAt)}</td>
              <td className="px-4 py-3">{document.notes ?? "-"}</td>
            </tr>
          ))}
        </DataTable>
      </RelatedSection>
      <RelatedSection title="Consent records" empty={!row.consentRecords?.length}>
        <DataTable headers={["Consent type", "Accepted by", "Accepted at"]}>
          {row.consentRecords?.map((consent) => (
            <tr key={consent.id}>
              <td className="px-4 py-3">{consent.consentType}</td>
              <td className="px-4 py-3">{consent.acceptedBy ?? "-"}</td>
              <td className="px-4 py-3">{formatDate(consent.acceptedAt)}</td>
            </tr>
          ))}
        </DataTable>
      </RelatedSection>
    </div>
  );
}

export function ProgrammesPage() {
  const query = useQuery({ queryKey: ["programmes"], queryFn: getProgrammes });
  return (
    <AppShell>
      <PageHeader
        title="Programmes"
        action={
          <div className="flex gap-2">
            <RefreshButton onClick={() => void query.refetch()} />
            <PermissionGate permission={PERMISSIONS.programmeCreate}>
              <LinkButton href="/programmes/new">New Programme</LinkButton>
            </PermissionGate>
          </div>
        }
      />
      <StatusMessage
        loading={query.isLoading}
        error={query.isError ? getApiError(query.error) : undefined}
        empty={query.data?.length === 0 ? "No programmes yet." : undefined}
      />
      {query.data?.length ? (
        <DataTable headers={["Name", "Code", "Product", "Mode", "Anchor", "Currency", "Status", "Version", "Annual discount rate", "Actions"]}>
          {query.data.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3 font-medium">{row.name}</td>
              <td className="px-4 py-3">{row.code}</td>
              <td className="px-4 py-3">{row.productType}</td>
              <td className="px-4 py-3"><Badge>{row.mode}</Badge></td>
              <td className="px-4 py-3">{row.anchor?.legalName ?? row.anchorId}</td>
              <td className="px-4 py-3">{row.currency}</td>
              <td className="px-4 py-3"><Badge>{row.status}</Badge></td>
              <td className="px-4 py-3">{row.version}</td>
              <td className="px-4 py-3">{formatPercent(row.annualDiscountRate)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <Link className="font-medium underline" href={`/programmes/${row.id}`}>View</Link>
                  <PermissionGate permission={PERMISSIONS.programmeUpdate}>
                    <Link className="font-medium underline" href={`/programmes/${row.id}/edit`}>Edit</Link>
                  </PermissionGate>
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      ) : null}
    </AppShell>
  );
}

export function NewProgrammePage() {
  const router = useRouter();
  const counterparties = useQuery({ queryKey: ["counterparties"], queryFn: getCounterparties });
  const anchors = counterparties.data?.filter((item) => item.type === "ANCHOR") ?? [];
  const [jsonError, setJsonError] = useState("");
  const form = useForm<ProgrammeForm, unknown, ProgrammeSubmit>({
    resolver: zodResolver(programmeSchema),
    defaultValues: {
      productType: "REVERSE_FACTORING",
      mode: "LIVE",
      currency: "GHS",
      version: 1,
      eligibilityCounterpartyStatus: "APPROVED",
      annualDiscountRate: 0.24,
      dayCountConvention: "ACT_360",
      discountMethod: "STRAIGHT_DISCOUNT",
      platformFeeFlat: 100,
      platformFeePercent: 0,
      arrangementFeeFlat: 0,
      servicingFeePercent: 0,
      eSignRequired: false,
      approvalWorkflowText: '{ "steps": ["relationship_manager", "credit", "operations"] }',
      eligibilityRulesText: '{ "requireActiveProgrammeEnrollment": true }',
      limitRulesText: '{ "checkAvailableLimitAtOrigination": true }',
      pricingRulesText: '{ "allowFunderSpecificSpread": true }',
      sandboxAssumptionsText: '{ "invoiceAmount": 100000, "daysAccelerated": 45 }',
    },
  });
  const mutation = useMutation({
    mutationFn: createProgramme,
    onSuccess: () => router.push("/programmes"),
  });
  return (
    <AppShell>
      <PageHeader title="New Programme" />
      <FormCard
        onSubmit={form.handleSubmit((values) => {
          try {
            setJsonError("");
            mutation.mutate(buildProgrammePayload(values));
          } catch (error) {
            setJsonError(error instanceof Error ? error.message : "Invalid JSON rule block.");
          }
        })}
      >
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Product and versioning</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Name" error={form.formState.errors.name?.message} {...form.register("name")} />
          <TextField label="Code" error={form.formState.errors.code?.message} {...form.register("code")} />
          <SelectField label="Product type" {...form.register("productType")}>
            {["REVERSE_FACTORING", "DYNAMIC_DISCOUNTING", "RECEIVABLES_FINANCE", "FACTORING", "INVOICE_DISCOUNTING", "DISTRIBUTOR_FINANCE", "DEEP_TIER_FINANCE", "RECEIVABLES_PURCHASE"].map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </SelectField>
          <SelectField label="Mode" {...form.register("mode")}>
            {["LIVE", "SANDBOX"].map((mode) => <option key={mode} value={mode}>{mode}</option>)}
          </SelectField>
          <SelectField label="Anchor" error={form.formState.errors.anchorId?.message} {...form.register("anchorId")}>
            <option value="">Select anchor</option>
            {anchors.map((anchor) => <option key={anchor.id} value={anchor.id}>{anchor.legalName}</option>)}
          </SelectField>
          <TextField label="Currency" {...form.register("currency")} />
          <TextField label="Configuration version" type="number" min={1} {...form.register("version")} />
          <TextField label="Effective from" type="date" {...form.register("effectiveFrom")} />
          <TextField label="Effective to" type="date" {...form.register("effectiveTo")} />
          <TextField label="Programme expiry" type="date" {...form.register("expiresAt")} />
        </div>

        <h3 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">Eligibility and ticket rules</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField label="Required counterparty status" {...form.register("eligibilityCounterpartyStatus")}>
            {["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED"].map((status) => <option key={status} value={status}>{status}</option>)}
          </SelectField>
          <TextField label="Minimum invoice age days" type="number" min={0} {...form.register("minimumInvoiceAgeDays")} />
          <TextField label="Maximum invoice age days" type="number" min={0} {...form.register("maximumInvoiceAgeDays")} />
          <TextField label="Max tenor days" type="number" {...form.register("maxTenorDays")} />
          <TextField label="Minimum invoice amount" type="number" {...form.register("minimumInvoiceAmount")} />
          <TextField label="Maximum invoice amount" type="number" {...form.register("maximumInvoiceAmount")} />
        </div>
        <TextAreaField label="Excluded counterparty IDs" placeholder="One UUID per line or comma-separated" {...form.register("excludedCounterpartyIdsText")} />
        <TextAreaField label="Eligibility rules JSON" {...form.register("eligibilityRulesText")} />

        <h3 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">Limits and concentration</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Programme limit" type="number" {...form.register("programmeLimit")} />
          <TextField label="Anchor limit" type="number" {...form.register("anchorLimit")} />
          <TextField label="Supplier limit" type="number" {...form.register("supplierLimit")} />
          <TextField label="Funder limit" type="number" {...form.register("funderLimit")} />
          <TextField label="Concentration cap %" type="number" step="0.01" {...form.register("concentrationCapPercent")} />
        </div>
        <TextAreaField label="Limit rules JSON" {...form.register("limitRulesText")} />

        <h3 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">Pricing, fees and yield basis</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Reference rate source" {...form.register("referenceRateSource")} />
          <TextField label="Reference rate" type="number" step="0.01" {...form.register("referenceRate")} />
          <TextField label="Funder spread" type="number" step="0.01" {...form.register("funderSpread")} />
          <TextField label="Annual discount rate" type="number" step="0.01" {...form.register("annualDiscountRate")} />
          <SelectField label="Day count convention" {...form.register("dayCountConvention")}>
            {["ACT_360", "ACT_365", "THIRTY_360"].map((item) => <option key={item} value={item}>{item}</option>)}
          </SelectField>
          <SelectField label="Discount method" {...form.register("discountMethod")}>
            {["STRAIGHT_DISCOUNT", "TRUE_DISCOUNT"].map((item) => <option key={item} value={item}>{item}</option>)}
          </SelectField>
          <TextField label="Platform fee flat" type="number" {...form.register("platformFeeFlat")} />
          <TextField label="Platform fee percent" type="number" step="0.01" {...form.register("platformFeePercent")} />
          <TextField label="Arrangement fee flat" type="number" {...form.register("arrangementFeeFlat")} />
          <TextField label="Servicing fee percent" type="number" step="0.01" {...form.register("servicingFeePercent")} />
        </div>
        <TextAreaField label="Pricing rules JSON" {...form.register("pricingRulesText")} />

        <h3 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">Workflow, documents and e-signature</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Workflow SLA hours" type="number" min={0} {...form.register("workflowSlaHours")} />
          <label className="flex items-center gap-2 pt-7 text-sm text-slate-700">
            <input type="checkbox" {...form.register("eSignRequired")} />
            E-signature required
          </label>
        </div>
        <TextAreaField label="Required documents" placeholder="Programme agreement, board resolution, supplier mandate" {...form.register("requiredDocumentsText")} />
        <TextAreaField label="Approval workflow JSON" {...form.register("approvalWorkflowText")} />

        <h3 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">Sandbox and branding</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="White-label name" {...form.register("whiteLabelName")} />
          <TextField label="Brand primary color" placeholder="#0f172a" {...form.register("brandPrimaryColor")} />
          <TextField label="Brand logo URL" {...form.register("brandLogoUrl")} />
          <TextField label="Terms URL" {...form.register("termsUrl")} />
        </div>
        <TextAreaField label="Sandbox assumptions JSON" {...form.register("sandboxAssumptionsText")} />
        <TextAreaField label="Configuration notes" {...form.register("configurationNotes")} />
        <SubmitRow loading={mutation.isPending} />
        {jsonError ? <p className="mt-3 text-sm text-rose-700">{jsonError}</p> : null}
        {mutation.isError ? <ErrorText error={mutation.error} /> : null}
      </FormCard>
    </AppShell>
  );
}

export function ProgrammeDetailPage({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const programme = useQuery({ queryKey: ["programme", id], queryFn: () => getProgramme(id) });
  const counterparties = useQuery({ queryKey: ["counterparties"], queryFn: getCounterparties });
  const [supplierId, setSupplierId] = useState("");
  const [funderId, setFunderId] = useState("");
  const mutation = useMutation({
    mutationFn: (payload: { counterpartyId: string; participantType: CounterpartyType }) =>
      addProgrammeParticipant(id, payload),
    onSuccess: async () => {
      setSupplierId("");
      setFunderId("");
      await queryClient.invalidateQueries({ queryKey: ["programme", id] });
      await queryClient.invalidateQueries({ queryKey: ["programmes"] });
    },
  });
  const suppliers = counterparties.data?.filter((item) => item.type === "SUPPLIER") ?? [];
  const funders = counterparties.data?.filter((item) => item.type === "FUNDER") ?? [];

  return (
    <AppShell>
      <PageHeader title="Programme Detail" action={<LinkButton href="/programmes">Back</LinkButton>} />
      <DetailState query={programme}>
        {(row) => (
          <div className="grid gap-6">
            <DetailsGrid
              rows={[
                ["Name", row.name],
                ["Code", row.code],
                ["Product type", row.productType],
                ["Mode", row.mode],
                ["Anchor", row.anchor?.legalName ?? row.anchorId],
                ["Currency", row.currency],
                ["Status", row.status],
                ["Version", row.version],
                ["Effective from", formatDate(row.effectiveFrom)],
                ["Effective to", formatDate(row.effectiveTo)],
                ["Programme expiry", formatDate(row.expiresAt)],
                ["Required counterparty status", row.eligibilityCounterpartyStatus],
                ["Invoice age", `${row.minimumInvoiceAgeDays ?? 0} - ${row.maximumInvoiceAgeDays ?? "-"} days`],
                ["Max tenor days", row.maxTenorDays ?? "-"],
                ["Ticket size", `${formatMoney(row.minimumInvoiceAmount ?? 0, row.currency)} - ${row.maximumInvoiceAmount ? formatMoney(row.maximumInvoiceAmount, row.currency) : "-"}`],
                ["Programme limit", row.programmeLimit ? formatMoney(row.programmeLimit, row.currency) : "-"],
                ["Anchor limit", row.anchorLimit ? formatMoney(row.anchorLimit, row.currency) : "-"],
                ["Supplier limit", row.supplierLimit ? formatMoney(row.supplierLimit, row.currency) : "-"],
                ["Funder limit", row.funderLimit ? formatMoney(row.funderLimit, row.currency) : "-"],
                ["Concentration cap", row.concentrationCapPercent ? formatPercent(row.concentrationCapPercent) : "-"],
                ["Reference rate source", row.referenceRateSource ?? "-"],
                ["Reference rate", row.referenceRate ? formatPercent(row.referenceRate) : "-"],
                ["Funder spread", row.funderSpread ? formatPercent(row.funderSpread) : "-"],
                ["Annual discount rate", formatPercent(row.annualDiscountRate)],
                ["Day count", row.dayCountConvention],
                ["Discount method", row.discountMethod],
                ["Platform fee flat", formatMoney(row.platformFeeFlat, row.currency)],
                ["Platform fee percent", formatPercent(row.platformFeePercent)],
                ["Arrangement fee flat", formatMoney(row.arrangementFeeFlat, row.currency)],
                ["Servicing fee percent", formatPercent(row.servicingFeePercent)],
                ["E-sign required", row.eSignRequired ? "Yes" : "No"],
                ["Workflow SLA hours", row.workflowSlaHours ?? "-"],
                ["White-label name", row.whiteLabelName ?? "-"],
                ["Brand primary color", row.brandPrimaryColor ?? "-"],
                ["Brand logo URL", row.brandLogoUrl ?? "-"],
                ["Terms URL", row.termsUrl ?? "-"],
                ["Configuration notes", row.configurationNotes ?? "-"],
              ]}
            />
            <DetailsGrid
              rows={[
                ["Excluded counterparties", formatJson(row.excludedCounterpartyIds)],
                ["Required documents", formatJson(row.requiredDocuments)],
                ["Approval workflow", formatJson(row.approvalWorkflow)],
                ["Eligibility rules", formatJson(row.eligibilityRules)],
                ["Limit rules", formatJson(row.limitRules)],
                ["Pricing rules", formatJson(row.pricingRules)],
                ["Sandbox assumptions", formatJson(row.sandboxAssumptions)],
              ]}
            />
            <Card>
              <h3 className="mb-4 text-lg font-semibold">Participants</h3>
              <div className="mb-5 grid gap-3 md:grid-cols-[1fr_auto_1fr_auto]">
                <select className={inputClass} value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
                  <option value="">Select supplier</option>
                  {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.legalName}</option>)}
                </select>
                <PermissionGate permission={PERMISSIONS.programmeParticipantAdd}>
                  <Button disabled={!supplierId || mutation.isPending} onClick={() => mutation.mutate({ counterpartyId: supplierId, participantType: "SUPPLIER" })}>
                    Add supplier
                  </Button>
                </PermissionGate>
                <select className={inputClass} value={funderId} onChange={(event) => setFunderId(event.target.value)}>
                  <option value="">Select funder</option>
                  {funders.map((funder) => <option key={funder.id} value={funder.id}>{funder.legalName}</option>)}
                </select>
                <PermissionGate permission={PERMISSIONS.programmeParticipantAdd}>
                  <Button disabled={!funderId || mutation.isPending} onClick={() => mutation.mutate({ counterpartyId: funderId, participantType: "FUNDER" })}>
                    Add funder
                  </Button>
                </PermissionGate>
              </div>
              {mutation.isError ? <ErrorText error={mutation.error} /> : null}
              {row.participants?.length ? (
                <DataTable headers={["Counterparty", "Type", "Active", "Created"]}>
                  {row.participants.map((participant) => (
                    <tr key={participant.id}>
                      <td className="px-4 py-3">{participant.counterparty?.legalName ?? participant.counterpartyId}</td>
                      <td className="px-4 py-3"><Badge>{participant.participantType}</Badge></td>
                      <td className="px-4 py-3">{participant.isActive ? "Yes" : "No"}</td>
                      <td className="px-4 py-3">{formatDate(participant.createdAt)}</td>
                    </tr>
                  ))}
                </DataTable>
              ) : (
                <p className="text-sm text-slate-500">No participants yet.</p>
              )}
            </Card>
          </div>
        )}
      </DetailState>
    </AppShell>
  );
}

export function EditProgrammePage({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const query = useQuery({ queryKey: ["programme", id], queryFn: () => getProgramme(id) });
  return (
    <AppShell>
      <PageHeader title="Edit Programme" action={<LinkButton href={`/programmes/${id}`}>Back to Programme</LinkButton>} />
      <DetailState query={query}>
        {(row) => (
          <PermissionGate permission={PERMISSIONS.programmeUpdate}>
            <ProgrammeEditForm
              programme={row}
              onSaved={async () => {
                await queryClient.invalidateQueries({ queryKey: ["programme", id] });
                await queryClient.invalidateQueries({ queryKey: ["programmes"] });
                router.push(`/programmes/${id}`);
              }}
            />
          </PermissionGate>
        )}
      </DetailState>
    </AppShell>
  );
}

export function InvoicesPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["invoices"], queryFn: getInvoices });
  const approve = useMutation({
    mutationFn: approveInvoice,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices"] }),
  });
  const offer = useMutation({
    mutationFn: generateFinancingOfferFromInvoice,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      void queryClient.invalidateQueries({ queryKey: ["financing"] });
    },
  });
  return (
    <AppShell>
      <PageHeader
        title="Invoices"
        action={
          <div className="flex gap-2">
            <RefreshButton onClick={() => void query.refetch()} />
            <PermissionGate permission={PERMISSIONS.invoiceCreate}>
              <LinkButton href="/invoices/new">New Invoice</LinkButton>
            </PermissionGate>
          </div>
        }
      />
      <StatusMessage loading={query.isLoading} error={query.isError ? getApiError(query.error) : undefined} empty={query.data?.length === 0 ? "No invoices yet." : undefined} />
      {approve.isError ? <ErrorText error={approve.error} /> : null}
      {offer.isError ? <ErrorText error={offer.error} /> : null}
      {query.data?.length ? (
        <DataTable headers={["Invoice number", "Programme", "Buyer", "Supplier", "Amount", "Currency", "Due date", "Status", "Actions"]}>
          {query.data.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3 font-medium">{row.invoiceNumber}</td>
              <td className="px-4 py-3">{row.programme?.name ?? row.programmeId}</td>
              <td className="px-4 py-3">{row.buyer?.legalName ?? row.buyerId}</td>
              <td className="px-4 py-3">{row.supplier?.legalName ?? row.supplierId}</td>
              <td className="px-4 py-3">{formatMoney(row.amount, row.currency)}</td>
              <td className="px-4 py-3">{row.currency}</td>
              <td className="px-4 py-3">{formatDate(row.dueDate)}</td>
              <td className="px-4 py-3"><Badge>{row.status}</Badge></td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <Link className="font-medium underline" href={`/invoices/${row.id}`}>View</Link>
                  <PermissionGate permission={PERMISSIONS.invoiceUpdate}>
                    <Link className="font-medium underline" href={`/invoices/${row.id}/edit`}>Edit</Link>
                  </PermissionGate>
                  {canApprove(row) ? (
                    <PermissionGate permission={PERMISSIONS.invoiceApprove}>
                      <button className="font-medium underline" onClick={() => approve.mutate(row.id)}>Approve</button>
                    </PermissionGate>
                  ) : null}
                  {row.status === "APPROVED" ? (
                    <PermissionGate permission={PERMISSIONS.financingOfferGenerate}>
                      <button className="font-medium underline" onClick={() => offer.mutate(row.id)}>Generate Offer</button>
                    </PermissionGate>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      ) : null}
    </AppShell>
  );
}

export function NewInvoicePage() {
  const router = useRouter();
  const counterparties = useQuery({ queryKey: ["counterparties"], queryFn: getCounterparties });
  const programmes = useQuery({ queryKey: ["programmes"], queryFn: getProgrammes });
  const anchors = counterparties.data?.filter((item) => item.type === "ANCHOR") ?? [];
  const suppliers = counterparties.data?.filter((item) => item.type === "SUPPLIER") ?? [];
  const [dateDefaults] = useState(() => {
    const issueDate = new Date();
    const maturityDate = new Date(issueDate);
    maturityDate.setDate(issueDate.getDate() + 30);
    return {
      issueDate: issueDate.toISOString().slice(0, 10),
      dueDate: maturityDate.toISOString().slice(0, 10),
    };
  });
  const form = useForm<InvoiceForm, unknown, InvoiceSubmit>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      currency: "GHS",
      issueDate: dateDefaults.issueDate,
      dueDate: dateDefaults.dueDate,
      ingestionChannel: "MANUAL",
      validationStatus: "PENDING",
      duplicateCheckStatus: "PENDING",
      fraudCheckStatus: "PENDING",
    },
  });
  const mutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: () => router.push("/invoices"),
  });
  return (
    <AppShell>
      <PageHeader title="New Invoice" />
      <FormCard onSubmit={form.handleSubmit((values) => mutation.mutate(buildInvoicePayload(values)))}>
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField label="Programme" error={form.formState.errors.programmeId?.message} {...form.register("programmeId")}>
            <option value="">Select programme</option>
            {programmes.data?.map((programme) => <option key={programme.id} value={programme.id}>{programme.name}</option>)}
          </SelectField>
          <SelectField label="Buyer" error={form.formState.errors.buyerId?.message} {...form.register("buyerId")}>
            <option value="">Select buyer</option>
            {anchors.map((anchor) => <option key={anchor.id} value={anchor.id}>{anchor.legalName}</option>)}
          </SelectField>
          <SelectField label="Supplier" error={form.formState.errors.supplierId?.message} {...form.register("supplierId")}>
            <option value="">Select supplier</option>
            {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.legalName}</option>)}
          </SelectField>
          <TextField label="Invoice number" error={form.formState.errors.invoiceNumber?.message} {...form.register("invoiceNumber")} />
          <TextField label="External reference" {...form.register("externalReference")} />
          <TextField label="Ingestion channel" {...form.register("ingestionChannel")} />
          <TextField label="Source system" {...form.register("sourceSystem")} />
          <TextField label="Purchase order number" {...form.register("purchaseOrderNumber")} />
          <TextField label="Goods received note" {...form.register("goodsReceivedNote")} />
          <TextField label="Amount" type="number" error={form.formState.errors.amount?.message} {...form.register("amount")} />
          <TextField label="Tax amount" type="number" {...form.register("taxAmount")} />
          <TextField label="Credit note amount" type="number" {...form.register("creditNoteAmount")} />
          <TextField label="Paid amount" type="number" {...form.register("paidAmount")} />
          <TextField label="Disputed amount" type="number" {...form.register("disputedAmount")} />
          <TextField label="Financeable amount" type="number" {...form.register("financeableAmount")} />
          <TextField label="Currency" {...form.register("currency")} />
          <TextField label="Issue date" type="date" {...form.register("issueDate")} />
          <TextField label="Due date" type="date" {...form.register("dueDate")} />
          <TextField label="Fiscal reference" {...form.register("fiscalReference")} />
          <TextField label="Validation status" {...form.register("validationStatus")} />
          <TextField label="Duplicate check status" {...form.register("duplicateCheckStatus")} />
          <TextField label="Fraud check status" {...form.register("fraudCheckStatus")} />
          <TextField label="Provenance hash" {...form.register("provenanceHash")} />
          <TextField label="Description" {...form.register("description")} />
        </div>
        <TextAreaField label="Validation errors JSON" {...form.register("validationErrorsText")} />
        <TextAreaField label="Attachment metadata JSON" {...form.register("attachmentMetadataText")} />
        <SubmitRow loading={mutation.isPending} />
        {mutation.isError ? <ErrorText error={mutation.error} /> : null}
      </FormCard>
    </AppShell>
  );
}

export function InvoiceDetailPage({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const query = useQuery({ queryKey: ["invoice", id], queryFn: () => getInvoice(id) });
  const approve = useMutation({
    mutationFn: approveInvoice,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoice", id] }),
  });
  const offer = useMutation({
    mutationFn: generateFinancingOfferFromInvoice,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoice", id] }),
  });
  const confirmApproval = useMutation({
    mutationFn: () => confirmBuyerApproval(id, { source: "manual" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoice", id] }),
  });
  const einvoicing = useMutation({
    mutationFn: () => validateInvoiceWithEInvoicing(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoice", id] }),
  });
  const duplicateCheck = useMutation({
    mutationFn: () => runInvoiceDuplicateCheck(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoice", id] }),
  });
  const remove = useMutation({
    mutationFn: deleteInvoice,
    onSuccess: () => router.push("/invoices"),
  });
  return (
    <AppShell>
      <PageHeader title="Invoice Detail" action={<LinkButton href="/invoices">Back</LinkButton>} />
      <DetailState query={query}>
        {(row) => (
          <div className="grid gap-6">
            <DetailsGrid rows={invoiceRows(row)} />
            <Card>
              <div className="flex flex-wrap gap-3">
                {canApprove(row) ? (
                  <PermissionGate permission={PERMISSIONS.invoiceApprove}>
                    <Button disabled={approve.isPending} onClick={() => approve.mutate(row.id)}>Approve Invoice</Button>
                  </PermissionGate>
                ) : null}
                {row.status === "APPROVED" ? (
                  <PermissionGate permission={PERMISSIONS.financingOfferGenerate}>
                    <Button disabled={offer.isPending} onClick={() => offer.mutate(row.id)}>Generate Financing Offer</Button>
                  </PermissionGate>
                ) : null}
                <PermissionGate permission={PERMISSIONS.invoicesValidate}>
                  <Button variant="secondary" disabled={confirmApproval.isPending} onClick={() => confirmApproval.mutate()}>Confirm Buyer Approval</Button>
                  <Button variant="secondary" disabled={einvoicing.isPending} onClick={() => einvoicing.mutate()}>Validate E-Invoicing</Button>
                  <Button variant="secondary" disabled={duplicateCheck.isPending} onClick={() => duplicateCheck.mutate()}>Run Duplicate Check</Button>
                </PermissionGate>
                <PermissionGate permission={PERMISSIONS.invoiceDelete}>
                  <Button variant="secondary" disabled={remove.isPending} onClick={() => remove.mutate(row.id)}>
                    Delete Invoice
                  </Button>
                </PermissionGate>
              </div>
              {approve.isError ? <ErrorText error={approve.error} /> : null}
              {offer.isError ? <ErrorText error={offer.error} /> : null}
              {confirmApproval.isError ? <ErrorText error={confirmApproval.error} /> : null}
              {einvoicing.isError ? <ErrorText error={einvoicing.error} /> : null}
              {duplicateCheck.isError ? <ErrorText error={duplicateCheck.error} /> : null}
              {remove.isError ? <ErrorText error={remove.error} /> : null}
            </Card>
          </div>
        )}
      </DetailState>
    </AppShell>
  );
}

export function EditInvoicePage({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const query = useQuery({ queryKey: ["invoice", id], queryFn: () => getInvoice(id) });
  return (
    <AppShell>
      <PageHeader title="Edit Invoice" action={<LinkButton href={`/invoices/${id}`}>Back to Invoice</LinkButton>} />
      <DetailState query={query}>
        {(row) => (
          <PermissionGate permission={PERMISSIONS.invoiceUpdate}>
            <InvoiceEditForm
              invoice={row}
              onSaved={async () => {
                await queryClient.invalidateQueries({ queryKey: ["invoice", id] });
                await queryClient.invalidateQueries({ queryKey: ["invoices"] });
                router.push(`/invoices/${id}`);
              }}
            />
          </PermissionGate>
        )}
      </DetailState>
    </AppShell>
  );
}

export function FinancingPage() {
  const query = useQuery({ queryKey: ["financing"], queryFn: getFinancingTransactions });
  return (
    <AppShell>
      <PageHeader title="Financing" action={<RefreshButton onClick={() => void query.refetch()} />} />
      <StatusMessage loading={query.isLoading} error={query.isError ? getApiError(query.error) : undefined} empty={query.data?.length === 0 ? "No financing transactions yet." : undefined} />
      {query.data?.length ? (
        <DataTable headers={["Invoice number", "Supplier", "Buyer", "Invoice amount", "Discount amount", "Platform fee", "Net proceeds", "Days accelerated", "Status", "Maturity date", "Actions"]}>
          {query.data.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3">{row.invoice?.invoiceNumber ?? row.invoiceId}</td>
              <td className="px-4 py-3">{row.invoice?.supplier?.legalName ?? row.supplierId}</td>
              <td className="px-4 py-3">{row.invoice?.buyer?.legalName ?? row.buyerId}</td>
              <td className="px-4 py-3">{formatMoney(row.invoiceAmount, row.invoice?.currency)}</td>
              <td className="px-4 py-3">{formatMoney(row.discountAmount, row.invoice?.currency)}</td>
              <td className="px-4 py-3">{formatMoney(row.platformFee, row.invoice?.currency)}</td>
              <td className="px-4 py-3">{formatMoney(row.netProceeds, row.invoice?.currency)}</td>
              <td className="px-4 py-3">{row.daysAccelerated}</td>
              <td className="px-4 py-3"><Badge>{row.status}</Badge></td>
              <td className="px-4 py-3">{formatDate(row.maturityDate)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <Link className="font-medium underline" href={`/financing/${row.id}`}>View</Link>
                  <PermissionGate permission={PERMISSIONS.financingUpdate}>
                    <Link className="font-medium underline" href={`/financing/${row.id}/edit`}>Edit</Link>
                  </PermissionGate>
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      ) : null}
    </AppShell>
  );
}

export function FinancingDetailPage({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const query = useQuery({ queryKey: ["financing", id], queryFn: () => getFinancingTransaction(id) });
  const accept = useMutation({
    mutationFn: acceptFinancingOffer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["financing", id] }),
  });
  const fund = useMutation({
    mutationFn: fundFinancingTransaction,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["financing", id] }),
  });
  const disburse = useMutation({
    mutationFn: disburseFinancingTransaction,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["financing", id] }),
  });
  const collect = useMutation({
    mutationFn: collectFinancingTransaction,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["financing", id] }),
  });
  const remove = useMutation({
    mutationFn: deleteFinancingTransaction,
    onSuccess: () => router.push("/financing"),
  });
  return (
    <AppShell>
      <PageHeader title="Financing Detail" action={<LinkButton href="/financing">Back</LinkButton>} />
      <DetailState query={query}>
        {(row) => (
          <div className="grid gap-6">
            <DetailsGrid rows={financingRows(row)} />
            <Card>
              <h3 className="mb-4 text-lg font-semibold">Provider payments</h3>
              {row.payments?.length ? (
                <DataTable headers={["Reference", "Direction", "Amount", "Status", "Provider", "Provider status", "Provider ref", "Actions"]}>
                  {row.payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-4 py-3">{payment.reference ?? payment.id}</td>
                      <td className="px-4 py-3">{payment.direction}</td>
                      <td className="px-4 py-3">{formatMoney(payment.amount, payment.currency)}</td>
                      <td className="px-4 py-3"><Badge>{payment.status}</Badge></td>
                      <td className="px-4 py-3">{payment.provider ?? "-"}</td>
                      <td className="px-4 py-3">{payment.providerStatus ?? "-"}</td>
                      <td className="px-4 py-3">{payment.providerReference ?? "-"}</td>
                      <td className="px-4 py-3"><Link className="font-medium underline" href={`/payments/${payment.id}`}>Open</Link></td>
                    </tr>
                  ))}
                </DataTable>
              ) : (
                <p className="text-sm text-muted-foreground">No provider payments have been created for this financing transaction.</p>
              )}
            </Card>
            {row.status === "OFFERED" ? (
              <PermissionGate permission={PERMISSIONS.financingOfferAccept}>
              <Card>
                <Button disabled={accept.isPending} onClick={() => accept.mutate(row.id)}>
                  Accept Offer
                </Button>
                {accept.isError ? <ErrorText error={accept.error} /> : null}
              </Card>
              </PermissionGate>
            ) : null}
            {row.status === "ACCEPTED" ? (
              <PermissionGate permission={PERMISSIONS.fundingAllocate}>
                <Card>
                  <Button disabled={fund.isPending} onClick={() => fund.mutate(row.id)}>
                    Allocate Funding
                  </Button>
                  {fund.isError ? <ErrorText error={fund.error} /> : null}
                </Card>
              </PermissionGate>
            ) : null}
            {row.status === "FUNDED" ? (
              <PermissionGate permission={PERMISSIONS.paymentDisburse}>
                <Card>
                  <Button disabled={disburse.isPending} onClick={() => disburse.mutate(row.id)}>
                    Confirm Disbursement
                  </Button>
                  {disburse.isError ? <ErrorText error={disburse.error} /> : null}
                </Card>
              </PermissionGate>
            ) : null}
            {row.status === "DISBURSED" || row.status === "MATURED" ? (
              <PermissionGate permission={PERMISSIONS.collectionManage}>
                <Card>
                  <Button disabled={collect.isPending} onClick={() => collect.mutate(row.id)}>
                    Record Collection
                  </Button>
                  {collect.isError ? <ErrorText error={collect.error} /> : null}
                </Card>
              </PermissionGate>
            ) : null}
            <PermissionGate permission={PERMISSIONS.financingDelete}>
              <Card>
                <Button variant="secondary" disabled={remove.isPending} onClick={() => remove.mutate(row.id)}>
                  Delete Financing
                </Button>
                {remove.isError ? <ErrorText error={remove.error} /> : null}
              </Card>
            </PermissionGate>
          </div>
        )}
      </DetailState>
    </AppShell>
  );
}

export function EditFinancingPage({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const query = useQuery({ queryKey: ["financing", id], queryFn: () => getFinancingTransaction(id) });
  return (
    <AppShell>
      <PageHeader title="Edit Financing" action={<LinkButton href={`/financing/${id}`}>Back to Financing</LinkButton>} />
      <DetailState query={query}>
        {(row) => (
          <PermissionGate permission={PERMISSIONS.financingUpdate}>
            <FinancingEditForm
              transaction={row}
              onSaved={async () => {
                await queryClient.invalidateQueries({ queryKey: ["financing", id] });
                await queryClient.invalidateQueries({ queryKey: ["financing"] });
                router.push(`/financing/${id}`);
              }}
            />
          </PermissionGate>
        )}
      </DetailState>
    </AppShell>
  );
}

export function ReportsPage() {
  const { counterparties, invoices, financing } = useCoreData();
  const phase2Resources: [Phase2Resource, string][] = [
    ["dynamic-discounting-offers", "Dynamic discounting"],
    ["receivables-facilities", "Receivables facilities"],
    ["funder-marketplace-bids", "Marketplace bids"],
    ["esg-scorecards", "ESG scorecards"],
    ["ai-anomaly-signals", "Anomaly signals"],
    ["investor-report-snapshots", "Investor reports"],
  ];
  const phase2Queries = {
    dynamicDiscounting: useQuery({ queryKey: ["phase2", "dynamic-discounting-offers"], queryFn: () => getPhase2Records("dynamic-discounting-offers") }),
    receivables: useQuery({ queryKey: ["phase2", "receivables-facilities"], queryFn: () => getPhase2Records("receivables-facilities") }),
    marketplace: useQuery({ queryKey: ["phase2", "funder-marketplace-bids"], queryFn: () => getPhase2Records("funder-marketplace-bids") }),
    esg: useQuery({ queryKey: ["phase2", "esg-scorecards"], queryFn: () => getPhase2Records("esg-scorecards") }),
    anomalies: useQuery({ queryKey: ["phase2", "ai-anomaly-signals"], queryFn: () => getPhase2Records("ai-anomaly-signals") }),
    investorReports: useQuery({ queryKey: ["phase2", "investor-report-snapshots"], queryFn: () => getPhase2Records("investor-report-snapshots") }),
  };
  const invoiceRows = invoices.data ?? [];
  const financingRows = financing.data ?? [];
  const counterpartyRows = counterparties.data ?? [];
  const exportCsv = async (resource: Phase2Resource, label: string) => {
    const blob = await exportPhase2Csv(resource);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${label.toLowerCase().replace(/\s+/g, "-")}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <AppShell>
      <PageHeader title="Reports" description="Operating summaries, exports and investor reporting snapshots." />
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <SummaryCard title="Invoice status count" rows={countBy(invoiceRows, (row) => row.status)} />
        <SummaryCard title="Financing status count" rows={countBy(financingRows, (row) => row.status)} />
        <SummaryCard title="Counterparty type count" rows={countBy(counterpartyRows, (row) => row.type)} />
        <Card>
          <p className="text-sm text-slate-500">Total invoice amount</p>
          <p className="mt-2 text-2xl font-semibold">{formatMoney(invoiceRows.reduce((sum, row) => sum + Number(row.amount), 0))}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Total net proceeds</p>
          <p className="mt-2 text-2xl font-semibold">{formatMoney(financingRows.reduce((sum, row) => sum + Number(row.netProceeds), 0))}</p>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <SummaryCard title="Dynamic discounting status" rows={countBy(phase2Queries.dynamicDiscounting.data ?? [], (row) => String((row as { status?: string }).status ?? "-"))} />
        <SummaryCard title="Receivables status" rows={countBy(phase2Queries.receivables.data ?? [], (row) => String((row as { status?: string }).status ?? "-"))} />
        <SummaryCard title="Marketplace bid status" rows={countBy(phase2Queries.marketplace.data ?? [], (row) => String((row as { participationStatus?: string }).participationStatus ?? "-"))} />
        <SummaryCard title="ESG status" rows={countBy(phase2Queries.esg.data ?? [], (row) => String((row as { status?: string }).status ?? "-"))} />
        <SummaryCard title="Anomaly severity" rows={countBy(phase2Queries.anomalies.data ?? [], (row) => String((row as { severity?: string }).severity ?? "-"))} />
        <Card>
          <p className="text-sm text-slate-500">Investor report snapshots</p>
          <p className="mt-2 text-2xl font-semibold">{phase2Queries.investorReports.data?.length ?? 0}</p>
        </Card>
      </div>
      <Card>
        <h3 className="mb-4 text-lg font-semibold">Product CSV exports</h3>
        <div className="flex flex-wrap gap-3">
          {phase2Resources.map(([resource, label]) => (
            <PermissionGate key={resource} permission={PERMISSIONS.reportExport}>
              <Button type="button" variant="secondary" onClick={() => void exportCsv(resource, label)}>
                Export {label}
              </Button>
            </PermissionGate>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}

const operationResources = [
  ["limits", "Limits"],
  ["exposures", "Exposure snapshots"],
  ["credit-decisions", "Credit decisions"],
  ["funder-profiles", "Funder profiles"],
  ["provenance", "Invoice provenance"],
  ["obligations", "Maturity obligations"],
  ["reconciliation", "Reconciliation"],
  ["investors", "Investor records"],
  ["documents", "Documents"],
  ["workflow-cases", "Workflow cases"],
  ["notifications", "Notifications"],
  ["reports", "Report catalogue"],
  ["dynamic-discounting-offers", "Dynamic discounting offers"],
  ["receivables-facilities", "Receivables facilities"],
  ["funder-marketplace-bids", "Funder marketplace bids"],
  ["esg-scorecards", "ESG scorecards"],
  ["integration-connections", "Integration connections"],
  ["ai-anomaly-signals", "AI anomaly signals"],
  ["investor-report-snapshots", "Investor report snapshots"],
] as const;

export function OperationsControlPage() {
  const queryClient = useQueryClient();
  const dashboard = useQuery({
    queryKey: ["operations-dashboard"],
    queryFn: getOperationsDashboard,
  });
  const [resource, setResource] = useState<(typeof operationResources)[number][0]>("limits");
  const records = useQuery({
    queryKey: ["operations", resource],
    queryFn: () => getOperationRecords(resource),
  });
  const [json, setJson] = useState("{}");
  const [jsonError, setJsonError] = useState("");
  const [editingId, setEditingId] = useState("");
  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => createOperationRecord(resource, data),
    onSuccess: async () => {
      setJson("{}");
      setEditingId("");
      await queryClient.invalidateQueries({ queryKey: ["operations", resource] });
      await queryClient.invalidateQueries({ queryKey: ["operations-dashboard"] });
    },
  });
  const update = useMutation({
    mutationFn: (data: Record<string, unknown>) => updateOperationRecord(resource, editingId, data),
    onSuccess: async () => {
      setJson("{}");
      setEditingId("");
      await queryClient.invalidateQueries({ queryKey: ["operations", resource] });
      await queryClient.invalidateQueries({ queryKey: ["operations-dashboard"] });
    },
  });

  const metrics = dashboard.data
    ? [
        ["Open obligations", dashboard.data.openObligations],
        ["Past due obligations", dashboard.data.pastDueObligations],
        ["Unmatched reconciliation", dashboard.data.unmatchedReconciliation],
        ["Open workflow cases", dashboard.data.openWorkflowCases],
        ["Pending notifications", dashboard.data.pendingNotifications],
        ["Active limits", dashboard.data.activeLimits],
        ["Active funders", dashboard.data.activeFunders],
        ["Active reports", dashboard.data.activeReports],
        ["DD offers", dashboard.data.openDynamicDiscountingOffers],
        ["Receivables facilities", dashboard.data.activeReceivablesFacilities],
        ["Marketplace bids", dashboard.data.openMarketplaceBids],
        ["ESG scorecards", dashboard.data.activeEsgScorecards],
        ["Integrations", dashboard.data.activeIntegrationConnections],
        ["AI anomaly signals", dashboard.data.openAiAnomalySignals],
        ["Investor report snapshots", dashboard.data.investorReportSnapshots],
        ["Pending outbound payments", dashboard.data.pendingOutboundPayments],
        ["Failed payments", dashboard.data.failedPayments],
        ["Failed notifications", dashboard.data.failedNotifications],
        ["Failed integrations", dashboard.data.failedIntegrations],
        ["Failed webhook deliveries", dashboard.data.failedWebhookDeliveries],
        ["Pending document verifications", dashboard.data.pendingDocumentVerifications],
        ["Total exposure", formatMoney(dashboard.data.totalExposure)],
        ["Outstanding obligations", formatMoney(dashboard.data.totalOutstanding)],
        ["Ledger debits", formatMoney(dashboard.data.ledgerDebitTotal)],
        ["Ledger credits", formatMoney(dashboard.data.ledgerCreditTotal)],
        ["Ledger imbalance", formatMoney(dashboard.data.ledgerImbalance)],
      ]
    : [];

  return (
    <AppShell>
      <PageHeader
        title="Operations Control"
        description="Core controls, product operations, enhanced funding, ESG, integrations and anomaly review."
        action={<RefreshButton onClick={() => void dashboard.refetch()} />}
      />
      <StatusMessage
        loading={dashboard.isLoading}
        error={dashboard.isError ? getApiError(dashboard.error) : undefined}
      />
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metrics.map(([label, value]) => (
          <Card key={label.toString()}>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-xl font-semibold">{value}</p>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <FormCard
          onSubmit={(event) => {
            event.preventDefault();
            try {
              setJsonError("");
              const payload = JSON.parse(json) as Record<string, unknown>;
              if (editingId) {
                update.mutate(payload);
              } else {
                create.mutate(payload);
              }
            } catch (error) {
              setJsonError(error instanceof Error ? error.message : "Invalid JSON.");
            }
          }}
        >
          <h3 className="mb-4 text-lg font-semibold">{editingId ? "Update control record" : "Create control record"}</h3>
          <SelectField
            label="Record type"
            value={resource}
            onChange={(event) => {
              setResource(event.target.value as typeof resource);
              setEditingId("");
              setJson("{}");
            }}
          >
            {operationResources.map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </SelectField>
          {editingId ? <p className="mb-3 text-xs text-slate-500">Editing record {editingId}</p> : null}
          <TextAreaField
            label="Record JSON"
            value={json}
            onChange={(event) => setJson(event.target.value)}
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button disabled={create.isPending || update.isPending}>
              {create.isPending || update.isPending ? "Saving..." : editingId ? "Update" : "Create"}
            </Button>
            {editingId ? (
              <button
                type="button"
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium"
                onClick={() => {
                  setEditingId("");
                  setJson("{}");
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
          {jsonError ? <p className="mt-3 text-sm text-rose-700">{jsonError}</p> : null}
          {create.isError ? <ErrorText error={create.error} /> : null}
          {update.isError ? <ErrorText error={update.error} /> : null}
        </FormCard>
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">
              {operationResources.find(([key]) => key === resource)?.[1]}
            </h3>
            <RefreshButton onClick={() => void records.refetch()} />
          </div>
          <StatusMessage
            loading={records.isLoading}
            error={records.isError ? getApiError(records.error) : undefined}
            empty={records.data?.length === 0 ? "No records captured." : undefined}
          />
          {records.data?.length ? (
            <div className="space-y-3">
              {records.data.map((record, index) => (
                <div key={String((record as { id?: string }).id ?? index)} className="rounded-md border border-slate-200 p-3">
                  <div className="mb-3 flex justify-end">
                    {(record as { id?: string }).id ? (
                      <button
                        className="text-sm font-medium underline"
                        onClick={() => {
                          setEditingId(String((record as { id?: string }).id));
                          setJson(JSON.stringify(record, null, 2));
                        }}
                      >
                        Edit
                      </button>
                    ) : null}
                  </div>
                  {formatJson(record)}
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      </div>
    </AppShell>
  );
}

function FormCard({
  children,
  onSubmit,
}: {
  children: React.ReactNode;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
}) {
  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      {children}
    </form>
  );
}

type TextFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

function TextField({ label, error, ...props }: TextFieldProps) {
  return (
    <Field label={label} error={error}>
      <input className={inputClass} {...props} />
    </Field>
  );
}

type TextAreaFieldProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
};

function TextAreaField({ label, error, ...props }: TextAreaFieldProps) {
  return (
    <div className="mt-4">
      <Field label={label} error={error}>
        <textarea className={`${inputClass} min-h-24 font-mono text-xs`} {...props} />
      </Field>
    </div>
  );
}

type SelectFieldProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
};

function SelectField({ label, error, children, ...props }: SelectFieldProps) {
  return (
    <Field label={label} error={error}>
      <select className={inputClass} {...props}>
        {children}
      </select>
    </Field>
  );
}

function SubmitRow({ loading }: { loading: boolean }) {
  return (
    <div className="mt-6 flex justify-end">
      <Button disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
    </div>
  );
}

function DetailState<T>({
  query,
  children,
}: {
  query: { isLoading: boolean; isError: boolean; error: unknown; data?: T };
  children: (data: T) => React.ReactNode;
}) {
  if (query.isLoading) {
    return <StatusMessage loading />;
  }
  if (query.isError) {
    return <StatusMessage error={getApiError(query.error)} />;
  }
  if (!query.data) {
    return <StatusMessage empty="Record not found." />;
  }
  return <>{children(query.data)}</>;
}

function DetailsGrid({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <Card>
      <dl className="grid gap-4 md:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm font-medium text-slate-500">{label}</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-950">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function formatJson(value: unknown) {
  if (value == null) {
    return "-";
  }
  return (
    <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 p-2 text-xs font-normal">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function phase2ApprovalHref(row: ApprovalRequest) {
  const prefix = row.entityType.startsWith("Product:")
    ? "Product:"
    : row.entityType.startsWith("Phase2:")
      ? "Phase2:"
      : "";
  if (!prefix) return null;
  const resource = row.entityType.replace(prefix, "");
  const paths: Record<string, string> = {
    "dynamic-discounting-offers": "/phase2/dynamic-discounting",
    "receivables-facilities": "/phase2/receivables",
    "funder-marketplace-bids": "/phase2/marketplace-bids",
    "esg-scorecards": "/phase2/esg",
    "ai-anomaly-signals": "/phase2/anomalies",
    "investor-report-snapshots": "/phase2/investor-reports",
  };
  return paths[resource] ? `${paths[resource]}/${row.entityId}` : null;
}

function phase2RequestedAction(row: ApprovalRequest) {
  const payload = row.requestPayload as { action?: string } | null | undefined;
  return payload?.action ?? row.action;
}

function RelatedSection({
  title,
  empty,
  children,
}: {
  title: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      {empty ? <p className="text-sm text-slate-500">No records captured.</p> : children}
    </section>
  );
}

function CounterpartyEditForm({
  counterparty,
  onSaved,
}: {
  counterparty: Counterparty;
  onSaved: () => Promise<unknown>;
}) {
  const account = counterparty.bankAccounts?.[0];
  const ubo = counterparty.uboRecords?.[0];
  const director = counterparty.directors?.[0];
  const document = counterparty.documents?.[0];
  const form = useForm<CounterpartyForm, unknown, CounterpartySubmit>({
    resolver: zodResolver(counterpartySchema),
    defaultValues: {
      type: counterparty.type,
      legalName: counterparty.legalName,
      tradingName: counterparty.tradingName ?? "",
      registrationNumber: counterparty.registrationNumber ?? "",
      tin: counterparty.tin ?? "",
      country: counterparty.country,
      address: counterparty.address ?? "",
      industry: counterparty.industry ?? "",
      contactEmail: counterparty.contactEmail ?? "",
      contactPhone: counterparty.contactPhone ?? "",
      website: counterparty.website ?? "",
      ownershipSummary: counterparty.ownershipSummary ?? "",
      directorsSummary: counterparty.directorsSummary ?? "",
      onboardingStatus: counterparty.onboardingStatus,
      onboardingProgress: counterparty.onboardingProgress,
      riskRating: counterparty.riskRating ?? "",
      kycTier: counterparty.kycTier ?? "",
      kybStatus: counterparty.kybStatus,
      identityVerificationStatus: counterparty.identityVerificationStatus,
      registryVerificationStatus: counterparty.registryVerificationStatus,
      creditBureauStatus: counterparty.creditBureauStatus,
      sanctionsScreeningStatus: counterparty.sanctionsScreeningStatus,
      pepScreeningStatus: counterparty.pepScreeningStatus,
      adverseMediaScreeningStatus: counterparty.adverseMediaScreeningStatus,
      lastScreenedAt: dateInput(counterparty.lastScreenedAt),
      nextReviewDate: dateInput(counterparty.nextReviewDate),
      consentAcceptedAt: dateInput(counterparty.consentAcceptedAt),
      dataProcessingAgreementAcceptedAt: dateInput(counterparty.dataProcessingAgreementAcceptedAt),
      submittedAt: dateInput(counterparty.submittedAt),
      approvedAt: dateInput(counterparty.approvedAt),
      rejectedAt: dateInput(counterparty.rejectedAt),
      onboardingDecisionReason: counterparty.onboardingDecisionReason ?? "",
      bankName: account?.bankName ?? "",
      accountName: account?.accountName ?? "",
      accountNumber: account?.accountNumber ?? "",
      bankBranch: account?.branch ?? "",
      bankCurrency: account?.currency ?? "GHS",
      paymentInstruction: account?.paymentInstruction ?? "",
      bankVerificationStatus: account?.verificationStatus ?? "NOT_STARTED",
      bankIsVerified: account?.isVerified ?? false,
      bankIsPrimary: account?.isPrimary ?? true,
      uboFullName: ubo?.fullName ?? "",
      uboNationality: ubo?.nationality ?? "",
      uboDateOfBirth: dateInput(ubo?.dateOfBirth),
      uboAddress: ubo?.address ?? "",
      uboIdType: ubo?.idType ?? "",
      uboIdNumber: ubo?.idNumber ?? "",
      uboOwnershipPercentage: ubo?.ownershipPercentage ? Number(ubo.ownershipPercentage) : "",
      uboScreeningStatus: ubo?.screeningStatus ?? "NOT_SCREENED",
      directorFullName: director?.fullName ?? "",
      directorRoleTitle: director?.roleTitle ?? "",
      directorNationality: director?.nationality ?? "",
      directorDateOfBirth: dateInput(director?.dateOfBirth),
      directorIdType: director?.idType ?? "",
      directorIdNumber: director?.idNumber ?? "",
      directorScreeningStatus: director?.screeningStatus ?? "NOT_SCREENED",
      certificateOfIncorporation: counterparty.documents?.some((row) => row.documentType === "Certificate of incorporation") ?? false,
      regulatoryLicences: counterparty.documents?.some((row) => row.documentType === "Regulatory licences") ?? false,
      financials: counterparty.documents?.some((row) => row.documentType === "Financial statements") ?? false,
      documentFileName: document?.fileName ?? "",
      documentStatus: document?.status ?? "RECEIVED",
      documentIssuedAt: dateInput(document?.issuedAt),
      documentExpiresAt: dateInput(document?.expiresAt),
      documentNotes: document?.notes ?? "",
      consentAccepted: Boolean(counterparty.consentAcceptedAt ?? counterparty.consentRecords?.some((row) => row.consentType === "DATA_PROCESSING_CONSENT")),
      dataProcessingAgreementAccepted: Boolean(counterparty.dataProcessingAgreementAcceptedAt ?? counterparty.consentRecords?.some((row) => row.consentType === "DATA_PROCESSING_AGREEMENT")),
    },
  });
  const update = useMutation({
    mutationFn: (payload: unknown) => updateCounterparty(counterparty.id, payload),
    onSuccess: () => onSaved(),
  });

  return (
    <FormCard onSubmit={form.handleSubmit((values) => update.mutate(buildCounterpartyPayload(values)))}>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Role-specific onboarding</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField label="Type" error={form.formState.errors.type?.message} {...form.register("type")}>
          {["ANCHOR", "SUPPLIER", "FUNDER", "INVESTOR"].map((type) => <option key={type} value={type}>{type}</option>)}
        </SelectField>
        <TextField label="Legal name" error={form.formState.errors.legalName?.message} {...form.register("legalName")} />
        <TextField label="Trading name" {...form.register("tradingName")} />
        <TextField label="Registration number" {...form.register("registrationNumber")} />
        <TextField label="TIN" {...form.register("tin")} />
        <TextField label="Country" error={form.formState.errors.country?.message} {...form.register("country")} />
        <TextField label="Address" {...form.register("address")} />
        <TextField label="Industry" {...form.register("industry")} />
        <TextField label="Contact email" type="email" {...form.register("contactEmail")} />
        <TextField label="Contact phone" {...form.register("contactPhone")} />
        <TextField label="Website" {...form.register("website")} />
        <SelectField label="Onboarding status" {...form.register("onboardingStatus")}>
          {["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED"].map((status) => <option key={status} value={status}>{status}</option>)}
        </SelectField>
        <TextField label="Onboarding progress %" type="number" min={0} max={100} {...form.register("onboardingProgress")} />
        <TextField label="Submitted at" type="date" {...form.register("submittedAt")} />
        <TextField label="Approved at" type="date" {...form.register("approvedAt")} />
        <TextField label="Rejected at" type="date" {...form.register("rejectedAt")} />
        <TextField label="Onboarding decision reason" {...form.register("onboardingDecisionReason")} />
        <TextField label="Next periodic review" type="date" {...form.register("nextReviewDate")} />
      </div>

      <h3 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">KYC / KYB risk and screening</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField label="Risk rating" {...form.register("riskRating")}>
          <option value="">Unrated</option>
          {["LOW", "MEDIUM", "HIGH"].map((status) => <option key={status} value={status}>{status}</option>)}
        </SelectField>
        <SelectField label="KYC tier" {...form.register("kycTier")}>
          <option value="">Not assigned</option>
          {["SIMPLIFIED", "STANDARD", "ENHANCED"].map((tier) => <option key={tier} value={tier}>{tier}</option>)}
        </SelectField>
        <SelectField label="KYB status" {...form.register("kybStatus")}>
          {verificationStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </SelectField>
        <SelectField label="Identity verification" {...form.register("identityVerificationStatus")}>
          {verificationStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </SelectField>
        <SelectField label="Registry verification" {...form.register("registryVerificationStatus")}>
          {verificationStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </SelectField>
        <SelectField label="Credit bureau status" {...form.register("creditBureauStatus")}>
          {verificationStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </SelectField>
        <SelectField label="Sanctions screening" {...form.register("sanctionsScreeningStatus")}>
          {screeningStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </SelectField>
        <SelectField label="PEP screening" {...form.register("pepScreeningStatus")}>
          {screeningStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </SelectField>
        <SelectField label="Adverse media screening" {...form.register("adverseMediaScreeningStatus")}>
          {screeningStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </SelectField>
        <TextField label="Last screened" type="date" {...form.register("lastScreenedAt")} />
      </div>

      <h3 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">Ownership, directors and bank details</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="Ownership summary" {...form.register("ownershipSummary")} />
        <TextField label="Directors summary" {...form.register("directorsSummary")} />
        <TextField label="UBO full name" {...form.register("uboFullName")} />
        <TextField label="UBO nationality" {...form.register("uboNationality")} />
        <TextField label="UBO date of birth" type="date" {...form.register("uboDateOfBirth")} />
        <TextField label="UBO address" {...form.register("uboAddress")} />
        <TextField label="UBO ID type" {...form.register("uboIdType")} />
        <TextField label="UBO ID number" {...form.register("uboIdNumber")} />
        <TextField label="UBO ownership %" type="number" min={0} max={100} {...form.register("uboOwnershipPercentage")} />
        <SelectField label="UBO screening status" {...form.register("uboScreeningStatus")}>
          {screeningStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </SelectField>
        <TextField label="Director full name" {...form.register("directorFullName")} />
        <TextField label="Director role/title" {...form.register("directorRoleTitle")} />
        <TextField label="Director nationality" {...form.register("directorNationality")} />
        <TextField label="Director date of birth" type="date" {...form.register("directorDateOfBirth")} />
        <TextField label="Director ID type" {...form.register("directorIdType")} />
        <TextField label="Director ID number" {...form.register("directorIdNumber")} />
        <SelectField label="Director screening status" {...form.register("directorScreeningStatus")}>
          {screeningStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </SelectField>
        <TextField label="Bank name" {...form.register("bankName")} />
        <TextField label="Account name" {...form.register("accountName")} />
        <TextField label="Account number" {...form.register("accountNumber")} />
        <TextField label="Branch" {...form.register("bankBranch")} />
        <TextField label="Bank currency" {...form.register("bankCurrency")} />
        <TextField label="Payment instruction" {...form.register("paymentInstruction")} />
        <SelectField label="Bank verification status" {...form.register("bankVerificationStatus")}>
          {verificationStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </SelectField>
        <label className="flex items-center gap-2 pt-7 text-sm text-slate-700">
          <input type="checkbox" {...form.register("bankIsVerified")} />
          Bank account verified
        </label>
        <label className="flex items-center gap-2 pt-7 text-sm text-slate-700">
          <input type="checkbox" {...form.register("bankIsPrimary")} />
          Primary bank account
        </label>
      </div>

      <h3 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">Documents and consent</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="Document file name" {...form.register("documentFileName")} />
        <SelectField label="Document status" {...form.register("documentStatus")}>
          {["REQUIRED", "RECEIVED", "VERIFIED", "EXPIRED", "WAIVED"].map((status) => <option key={status} value={status}>{status}</option>)}
        </SelectField>
        <TextField label="Document issued at" type="date" {...form.register("documentIssuedAt")} />
        <TextField label="Document expires at" type="date" {...form.register("documentExpiresAt")} />
        <TextField label="Document notes" {...form.register("documentNotes")} />
        <TextField label="Consent accepted at" type="date" {...form.register("consentAcceptedAt")} />
        <TextField label="Data-processing agreement accepted at" type="date" {...form.register("dataProcessingAgreementAcceptedAt")} />
      </div>
      <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
        <label className="flex items-center gap-2">
          <input type="checkbox" {...form.register("certificateOfIncorporation")} />
          Certificate of incorporation received
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" {...form.register("regulatoryLicences")} />
          Regulatory licences received
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" {...form.register("financials")} />
          Financial statements received
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" {...form.register("consentAccepted")} />
          Data-processing consent captured
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" {...form.register("dataProcessingAgreementAccepted")} />
          Data-processing agreement accepted
        </label>
      </div>
      <SubmitRow loading={update.isPending} />
      {update.isError ? <ErrorText error={update.error} /> : null}
    </FormCard>
  );
}

function ProgrammeEditForm({
  programme,
  onSaved,
}: {
  programme: Programme;
  onSaved: () => Promise<unknown>;
}) {
  const counterparties = useQuery({ queryKey: ["counterparties"], queryFn: getCounterparties });
  const anchors = counterparties.data?.filter((item) => item.type === "ANCHOR") ?? [];
  const [jsonError, setJsonError] = useState("");
  const form = useForm<ProgrammeForm, unknown, ProgrammeSubmit>({
    resolver: zodResolver(programmeSchema),
    defaultValues: {
      name: programme.name,
      code: programme.code,
      productType: programme.productType,
      mode: programme.mode,
      anchorId: programme.anchorId,
      currency: programme.currency,
      status: programme.status,
      version: programme.version,
      effectiveFrom: dateInput(programme.effectiveFrom),
      effectiveTo: dateInput(programme.effectiveTo),
      expiresAt: dateInput(programme.expiresAt),
      eligibilityCounterpartyStatus: programme.eligibilityCounterpartyStatus,
      minimumInvoiceAgeDays: programme.minimumInvoiceAgeDays ?? "",
      maximumInvoiceAgeDays: programme.maximumInvoiceAgeDays ?? "",
      maxTenorDays: programme.maxTenorDays ?? "",
      minimumInvoiceAmount: programme.minimumInvoiceAmount ? Number(programme.minimumInvoiceAmount) : "",
      maximumInvoiceAmount: programme.maximumInvoiceAmount ? Number(programme.maximumInvoiceAmount) : "",
      excludedCounterpartyIdsText: programme.excludedCounterpartyIds?.join("\n") ?? "",
      programmeLimit: programme.programmeLimit ? Number(programme.programmeLimit) : "",
      anchorLimit: programme.anchorLimit ? Number(programme.anchorLimit) : "",
      supplierLimit: programme.supplierLimit ? Number(programme.supplierLimit) : "",
      funderLimit: programme.funderLimit ? Number(programme.funderLimit) : "",
      concentrationCapPercent: programme.concentrationCapPercent ? Number(programme.concentrationCapPercent) : "",
      referenceRateSource: programme.referenceRateSource ?? "",
      referenceRate: programme.referenceRate ? Number(programme.referenceRate) : "",
      funderSpread: programme.funderSpread ? Number(programme.funderSpread) : "",
      annualDiscountRate: Number(programme.annualDiscountRate),
      dayCountConvention: programme.dayCountConvention,
      discountMethod: programme.discountMethod,
      platformFeeFlat: Number(programme.platformFeeFlat),
      platformFeePercent: Number(programme.platformFeePercent),
      arrangementFeeFlat: Number(programme.arrangementFeeFlat),
      servicingFeePercent: Number(programme.servicingFeePercent),
      requiredDocumentsText: programme.requiredDocuments?.join("\n") ?? "",
      eSignRequired: programme.eSignRequired,
      workflowSlaHours: programme.workflowSlaHours ?? "",
      approvalWorkflowText: programme.approvalWorkflow ? JSON.stringify(programme.approvalWorkflow, null, 2) : "",
      eligibilityRulesText: programme.eligibilityRules ? JSON.stringify(programme.eligibilityRules, null, 2) : "",
      limitRulesText: programme.limitRules ? JSON.stringify(programme.limitRules, null, 2) : "",
      pricingRulesText: programme.pricingRules ? JSON.stringify(programme.pricingRules, null, 2) : "",
      sandboxAssumptionsText: programme.sandboxAssumptions ? JSON.stringify(programme.sandboxAssumptions, null, 2) : "",
      whiteLabelName: programme.whiteLabelName ?? "",
      brandPrimaryColor: programme.brandPrimaryColor ?? "",
      brandLogoUrl: programme.brandLogoUrl ?? "",
      termsUrl: programme.termsUrl ?? "",
      configurationNotes: programme.configurationNotes ?? "",
    },
  });
  const update = useMutation({
    mutationFn: (payload: unknown) => updateProgramme(programme.id, payload),
    onSuccess: () => onSaved(),
  });

  return (
    <FormCard
      onSubmit={form.handleSubmit((values) => {
        try {
          setJsonError("");
          update.mutate(buildProgrammePayload(values));
        } catch (error) {
          setJsonError(error instanceof Error ? error.message : "Invalid JSON rule block.");
        }
      })}
    >
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Product and versioning</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="Name" error={form.formState.errors.name?.message} {...form.register("name")} />
        <TextField label="Code" error={form.formState.errors.code?.message} {...form.register("code")} />
        <SelectField label="Product type" {...form.register("productType")}>
          {["REVERSE_FACTORING", "DYNAMIC_DISCOUNTING", "RECEIVABLES_FINANCE", "FACTORING", "INVOICE_DISCOUNTING", "DISTRIBUTOR_FINANCE", "DEEP_TIER_FINANCE", "RECEIVABLES_PURCHASE"].map((type) => <option key={type} value={type}>{type}</option>)}
        </SelectField>
        <SelectField label="Mode" {...form.register("mode")}>
          {["LIVE", "SANDBOX"].map((mode) => <option key={mode} value={mode}>{mode}</option>)}
        </SelectField>
        <SelectField label="Anchor" error={form.formState.errors.anchorId?.message} {...form.register("anchorId")}>
          <option value="">Select anchor</option>
          {anchors.map((anchor) => <option key={anchor.id} value={anchor.id}>{anchor.legalName}</option>)}
        </SelectField>
        <TextField label="Currency" {...form.register("currency")} />
        <SelectField label="Programme status" {...form.register("status")}>
          {["DRAFT", "ACTIVE", "SUSPENDED", "CLOSED"].map((status) => <option key={status} value={status}>{status}</option>)}
        </SelectField>
        <TextField label="Configuration version" type="number" min={1} {...form.register("version")} />
        <TextField label="Effective from" type="date" {...form.register("effectiveFrom")} />
        <TextField label="Effective to" type="date" {...form.register("effectiveTo")} />
        <TextField label="Programme expiry" type="date" {...form.register("expiresAt")} />
      </div>

      <h3 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">Eligibility and ticket rules</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField label="Required counterparty status" {...form.register("eligibilityCounterpartyStatus")}>
          {["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED"].map((status) => <option key={status} value={status}>{status}</option>)}
        </SelectField>
        <TextField label="Minimum invoice age days" type="number" min={0} {...form.register("minimumInvoiceAgeDays")} />
        <TextField label="Maximum invoice age days" type="number" min={0} {...form.register("maximumInvoiceAgeDays")} />
        <TextField label="Max tenor days" type="number" {...form.register("maxTenorDays")} />
        <TextField label="Minimum invoice amount" type="number" {...form.register("minimumInvoiceAmount")} />
        <TextField label="Maximum invoice amount" type="number" {...form.register("maximumInvoiceAmount")} />
      </div>
      <TextAreaField label="Excluded counterparty IDs" placeholder="One UUID per line or comma-separated" {...form.register("excludedCounterpartyIdsText")} />
      <TextAreaField label="Eligibility rules JSON" {...form.register("eligibilityRulesText")} />

      <h3 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">Limits and concentration</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="Programme limit" type="number" {...form.register("programmeLimit")} />
        <TextField label="Anchor limit" type="number" {...form.register("anchorLimit")} />
        <TextField label="Supplier limit" type="number" {...form.register("supplierLimit")} />
        <TextField label="Funder limit" type="number" {...form.register("funderLimit")} />
        <TextField label="Concentration cap %" type="number" step="0.01" {...form.register("concentrationCapPercent")} />
      </div>
      <TextAreaField label="Limit rules JSON" {...form.register("limitRulesText")} />

      <h3 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">Pricing, fees and yield basis</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="Reference rate source" {...form.register("referenceRateSource")} />
        <TextField label="Reference rate" type="number" step="0.01" {...form.register("referenceRate")} />
        <TextField label="Funder spread" type="number" step="0.01" {...form.register("funderSpread")} />
        <TextField label="Annual discount rate" type="number" step="0.01" {...form.register("annualDiscountRate")} />
        <SelectField label="Day count convention" {...form.register("dayCountConvention")}>
          {["ACT_360", "ACT_365", "THIRTY_360"].map((item) => <option key={item} value={item}>{item}</option>)}
        </SelectField>
        <SelectField label="Discount method" {...form.register("discountMethod")}>
          {["STRAIGHT_DISCOUNT", "TRUE_DISCOUNT"].map((item) => <option key={item} value={item}>{item}</option>)}
        </SelectField>
        <TextField label="Platform fee flat" type="number" {...form.register("platformFeeFlat")} />
        <TextField label="Platform fee percent" type="number" step="0.01" {...form.register("platformFeePercent")} />
        <TextField label="Arrangement fee flat" type="number" {...form.register("arrangementFeeFlat")} />
        <TextField label="Servicing fee percent" type="number" step="0.01" {...form.register("servicingFeePercent")} />
      </div>
      <TextAreaField label="Pricing rules JSON" {...form.register("pricingRulesText")} />

      <h3 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">Workflow, documents and e-signature</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="Workflow SLA hours" type="number" min={0} {...form.register("workflowSlaHours")} />
        <label className="flex items-center gap-2 pt-7 text-sm text-slate-700">
          <input type="checkbox" {...form.register("eSignRequired")} />
          E-signature required
        </label>
      </div>
      <TextAreaField label="Required documents" placeholder="Programme agreement, board resolution, supplier mandate" {...form.register("requiredDocumentsText")} />
      <TextAreaField label="Approval workflow JSON" {...form.register("approvalWorkflowText")} />

      <h3 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">Sandbox and branding</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="White-label name" {...form.register("whiteLabelName")} />
        <TextField label="Brand primary color" placeholder="#0f172a" {...form.register("brandPrimaryColor")} />
        <TextField label="Brand logo URL" {...form.register("brandLogoUrl")} />
        <TextField label="Terms URL" {...form.register("termsUrl")} />
      </div>
      <TextAreaField label="Sandbox assumptions JSON" {...form.register("sandboxAssumptionsText")} />
      <TextAreaField label="Configuration notes" {...form.register("configurationNotes")} />
      <SubmitRow loading={update.isPending} />
      {jsonError ? <p className="mt-3 text-sm text-rose-700">{jsonError}</p> : null}
      {update.isError ? <ErrorText error={update.error} /> : null}
    </FormCard>
  );
}

function InvoiceEditForm({
  invoice,
  onSaved,
}: {
  invoice: Invoice;
  onSaved: () => Promise<unknown>;
}) {
  const form = useForm<InvoiceForm, unknown, InvoiceSubmit>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      programmeId: invoice.programmeId,
      buyerId: invoice.buyerId,
      supplierId: invoice.supplierId,
      invoiceNumber: invoice.invoiceNumber,
      externalReference: invoice.externalReference ?? "",
      ingestionChannel: invoice.ingestionChannel,
      sourceSystem: invoice.sourceSystem ?? "",
      purchaseOrderNumber: invoice.purchaseOrderNumber ?? "",
      goodsReceivedNote: invoice.goodsReceivedNote ?? "",
      amount: Number(invoice.amount),
      taxAmount: Number(invoice.taxAmount),
      creditNoteAmount: Number(invoice.creditNoteAmount),
      paidAmount: Number(invoice.paidAmount),
      disputedAmount: Number(invoice.disputedAmount),
      financeableAmount: invoice.financeableAmount ? Number(invoice.financeableAmount) : "",
      currency: invoice.currency,
      issueDate: dateInput(invoice.issueDate),
      dueDate: dateInput(invoice.dueDate),
      status: invoice.status,
      validationStatus: invoice.validationStatus,
      validationErrorsText: invoice.validationErrors ? JSON.stringify(invoice.validationErrors, null, 2) : "",
      duplicateCheckStatus: invoice.duplicateCheckStatus,
      fraudCheckStatus: invoice.fraudCheckStatus,
      provenanceHash: invoice.provenanceHash ?? "",
      attachmentMetadataText: invoice.attachmentMetadata ? JSON.stringify(invoice.attachmentMetadata, null, 2) : "",
      fiscalReference: invoice.fiscalReference ?? "",
      description: invoice.description ?? "",
    },
  });
  const update = useMutation({
    mutationFn: (payload: unknown) => updateInvoice(invoice.id, payload),
    onSuccess: () => onSaved(),
  });

  return (
    <FormCard onSubmit={form.handleSubmit((values) => update.mutate(buildInvoicePayload(values)))}>
      <h3 className="mb-4 text-lg font-semibold">Edit invoice</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="Invoice number" {...form.register("invoiceNumber")} />
        <TextField label="External reference" {...form.register("externalReference")} />
        <TextField label="Ingestion channel" {...form.register("ingestionChannel")} />
        <TextField label="Source system" {...form.register("sourceSystem")} />
        <TextField label="Purchase order number" {...form.register("purchaseOrderNumber")} />
        <TextField label="Goods received note" {...form.register("goodsReceivedNote")} />
        <TextField label="Amount" type="number" {...form.register("amount")} />
        <TextField label="Tax amount" type="number" {...form.register("taxAmount")} />
        <TextField label="Credit note amount" type="number" {...form.register("creditNoteAmount")} />
        <TextField label="Paid amount" type="number" {...form.register("paidAmount")} />
        <TextField label="Disputed amount" type="number" {...form.register("disputedAmount")} />
        <TextField label="Financeable amount" type="number" {...form.register("financeableAmount")} />
        <TextField label="Currency" {...form.register("currency")} />
        <TextField label="Issue date" type="date" {...form.register("issueDate")} />
        <TextField label="Due date" type="date" {...form.register("dueDate")} />
        <SelectField label="Status" {...form.register("status")}>
          {["RECEIVED", "VALIDATED", "APPROVED", "FINANCEABLE", "OFFERED", "FINANCED", "SETTLED", "DISPUTED", "CANCELLED"].map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </SelectField>
        <TextField label="Fiscal reference" {...form.register("fiscalReference")} />
        <TextField label="Validation status" {...form.register("validationStatus")} />
        <TextField label="Duplicate check status" {...form.register("duplicateCheckStatus")} />
        <TextField label="Fraud check status" {...form.register("fraudCheckStatus")} />
        <TextField label="Provenance hash" {...form.register("provenanceHash")} />
        <TextField label="Description" {...form.register("description")} />
      </div>
      <TextAreaField label="Validation errors JSON" {...form.register("validationErrorsText")} />
      <TextAreaField label="Attachment metadata JSON" {...form.register("attachmentMetadataText")} />
      <SubmitRow loading={update.isPending} />
      {update.isError ? <ErrorText error={update.error} /> : null}
    </FormCard>
  );
}

function FinancingEditForm({
  transaction,
  onSaved,
}: {
  transaction: FinancingTransaction;
  onSaved: () => Promise<unknown>;
}) {
  const form = useForm<FinancingForm, unknown, FinancingSubmit>({
    resolver: zodResolver(financingSchema),
    defaultValues: {
      offerReference: transaction.offerReference ?? "",
      invoiceAmount: Number(transaction.invoiceAmount),
      annualRate: Number(transaction.annualRate),
      referenceRate: transaction.referenceRate ? Number(transaction.referenceRate) : "",
      spreadRate: transaction.spreadRate ? Number(transaction.spreadRate) : "",
      discountAmount: Number(transaction.discountAmount),
      platformFee: Number(transaction.platformFee),
      arrangementFee: Number(transaction.arrangementFee),
      servicingFee: Number(transaction.servicingFee),
      netProceeds: Number(transaction.netProceeds),
      buyerObligationAmount: transaction.buyerObligationAmount ? Number(transaction.buyerObligationAmount) : "",
      funderSettlementAmount: transaction.funderSettlementAmount ? Number(transaction.funderSettlementAmount) : "",
      maturityDate: dateInput(transaction.maturityDate),
      settlementDate: dateInput(transaction.settlementDate),
      offerExpiresAt: dateInput(transaction.offerExpiresAt),
      status: transaction.status,
      autoAccepted: transaction.autoAccepted,
      discountBreakdownText: transaction.discountBreakdown ? JSON.stringify(transaction.discountBreakdown, null, 2) : "",
      feeBreakdownText: transaction.feeBreakdown ? JSON.stringify(transaction.feeBreakdown, null, 2) : "",
      allocationRule: transaction.allocationRule ?? "",
      assignmentReference: transaction.assignmentReference ?? "",
      trueSaleStatus: transaction.trueSaleStatus,
      recourseAmount: Number(transaction.recourseAmount),
      adjustmentAmount: Number(transaction.adjustmentAmount),
      cancellationReason: transaction.cancellationReason ?? "",
    },
  });
  const update = useMutation({
    mutationFn: (payload: unknown) => updateFinancingTransaction(transaction.id, payload),
    onSuccess: () => onSaved(),
  });

  return (
    <FormCard onSubmit={form.handleSubmit((values) => update.mutate(buildFinancingPayload(values)))}>
      <h3 className="mb-4 text-lg font-semibold">Edit financing</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="Offer reference" {...form.register("offerReference")} />
        <TextField label="Invoice amount" type="number" {...form.register("invoiceAmount")} />
        <TextField label="Annual rate" type="number" step="0.01" {...form.register("annualRate")} />
        <TextField label="Reference rate" type="number" step="0.01" {...form.register("referenceRate")} />
        <TextField label="Spread rate" type="number" step="0.01" {...form.register("spreadRate")} />
        <TextField label="Discount amount" type="number" {...form.register("discountAmount")} />
        <TextField label="Platform fee" type="number" {...form.register("platformFee")} />
        <TextField label="Arrangement fee" type="number" {...form.register("arrangementFee")} />
        <TextField label="Servicing fee" type="number" {...form.register("servicingFee")} />
        <TextField label="Net proceeds" type="number" {...form.register("netProceeds")} />
        <TextField label="Buyer obligation amount" type="number" {...form.register("buyerObligationAmount")} />
        <TextField label="Funder settlement amount" type="number" {...form.register("funderSettlementAmount")} />
        <TextField label="Maturity date" type="date" {...form.register("maturityDate")} />
        <TextField label="Settlement date" type="date" {...form.register("settlementDate")} />
        <TextField label="Offer expires" type="date" {...form.register("offerExpiresAt")} />
        <SelectField label="Status" {...form.register("status")}>
          {["OFFERED", "ACCEPTED", "FUNDED", "DISBURSED", "MATURED", "COLLECTED", "CLOSED", "DEFAULTED", "CANCELLED"].map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </SelectField>
        <TextField label="Allocation rule" {...form.register("allocationRule")} />
        <TextField label="Assignment reference" {...form.register("assignmentReference")} />
        <TextField label="True-sale status" {...form.register("trueSaleStatus")} />
        <TextField label="Recourse amount" type="number" {...form.register("recourseAmount")} />
        <TextField label="Adjustment amount" type="number" {...form.register("adjustmentAmount")} />
        <TextField label="Cancellation reason" {...form.register("cancellationReason")} />
        <label className="flex items-center gap-2 pt-7 text-sm text-slate-700">
          <input type="checkbox" {...form.register("autoAccepted")} />
          Auto accepted
        </label>
      </div>
      <TextAreaField label="Discount breakdown JSON" {...form.register("discountBreakdownText")} />
      <TextAreaField label="Fee breakdown JSON" {...form.register("feeBreakdownText")} />
      <SubmitRow loading={update.isPending} />
      {update.isError ? <ErrorText error={update.error} /> : null}
    </FormCard>
  );
}

function RoleCheckboxes({
  roles,
  selectedRoleIds,
  onChange,
}: {
  roles: Role[];
  selectedRoleIds: string[];
  onChange: (roleIds: string[]) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-700">Roles</p>
      <div className="max-h-56 space-y-2 overflow-auto rounded-md border border-slate-200 p-3">
        {roles.map((role) => {
          const checked = selectedRoleIds.includes(role.id);
          return (
            <label key={role.id} className="flex items-start gap-2 text-sm">
              <input
                className="mt-1"
                type="checkbox"
                checked={checked}
                onChange={(event) => {
                  if (event.target.checked) {
                    onChange([...selectedRoleIds, role.id]);
                  } else {
                    onChange(selectedRoleIds.filter((roleId) => roleId !== role.id));
                  }
                }}
              />
              <span>
                <span className="block font-medium text-slate-800">{role.name}</span>
                <span className="block text-xs text-slate-500">{role.description ?? `${role.permissions.length} permissions`}</span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function EditableUserRow({
  user,
  roles,
  onSaved,
}: {
  user: AdminUser;
  roles: Role[];
  onSaved: () => Promise<unknown>;
}) {
  const [status, setStatus] = useState(user.status);
  const [roleIds, setRoleIds] = useState(user.roles.map((role) => role.id));
  const [password, setPassword] = useState("");
  const update = useMutation({
    mutationFn: () =>
      updateUser(
        user.id,
        cleanPayload({
          status,
          roleIds,
          password: password || undefined,
        }),
      ),
    onSuccess: async () => {
      setPassword("");
      await onSaved();
    },
  });

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="mb-4 grid gap-3 lg:grid-cols-[1.3fr_0.7fr_1fr_auto] lg:items-start">
        <div>
          <p className="font-semibold text-slate-950">{user.email}</p>
          <p className="text-sm text-slate-500">
            {[user.firstName, user.lastName].filter(Boolean).join(" ") || "No name"} · {user.permissions.length} permissions
          </p>
          <p className="mt-1 text-xs text-slate-500">Created {formatDate(user.createdAt)}</p>
        </div>
        <SelectField label="Status" value={status} onChange={(event) => setStatus(event.target.value as AdminUser["status"])}>
          {["INVITED", "ACTIVE", "SUSPENDED", "DISABLED"].map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </SelectField>
        <TextField
          label="Reset password"
          type="password"
          placeholder="Leave blank to keep current"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <PermissionGate permission={PERMISSIONS.userUpdate}>
          <div className="pt-7">
            <Button disabled={update.isPending} onClick={() => update.mutate()}>
              {update.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </PermissionGate>
      </div>
      <RoleCheckboxes roles={roles} selectedRoleIds={roleIds} onChange={setRoleIds} />
      {update.isError ? <ErrorText error={update.error} /> : null}
    </div>
  );
}

function invoiceRows(row: Invoice): [string, React.ReactNode][] {
  return [
    ["Invoice number", row.invoiceNumber],
    ["External reference", row.externalReference ?? "-"],
    ["Ingestion channel", row.ingestionChannel],
    ["Source system", row.sourceSystem ?? "-"],
    ["Source type", row.sourceType ?? "-"],
    ["Import batch", row.importBatchId ? <Link className="underline" href={`/invoices/import/batches/${row.importBatchId}`}>{row.importBatchId}</Link> : "-"],
    ["Buyer approval source", row.buyerApprovalSource ?? "-"],
    ["Buyer approval reference", row.buyerApprovalReference ?? "-"],
    ["Buyer approval imported", formatDate(row.buyerApprovalImportedAt)],
    ["Purchase order", row.purchaseOrderNumber ?? "-"],
    ["Goods received note", row.goodsReceivedNote ?? "-"],
    ["Programme", row.programme?.name ?? row.programmeId],
    ["Buyer", row.buyer?.legalName ?? row.buyerId],
    ["Supplier", row.supplier?.legalName ?? row.supplierId],
    ["Amount", formatMoney(row.amount, row.currency)],
    ["Tax amount", formatMoney(row.taxAmount, row.currency)],
    ["Credit notes", formatMoney(row.creditNoteAmount, row.currency)],
    ["Paid amount", formatMoney(row.paidAmount, row.currency)],
    ["Disputed amount", formatMoney(row.disputedAmount, row.currency)],
    ["Financeable amount", formatMoney(row.financeableAmount, row.currency)],
    ["Currency", row.currency],
    ["Issue date", formatDate(row.issueDate)],
    ["Due date", formatDate(row.dueDate)],
    ["Status", row.status],
    ["Buyer approved at", formatDate(row.buyerApprovedAt)],
    ["Validation status", row.validationStatus],
    ["Duplicate check", row.duplicateCheckStatus],
    ["Fraud check", row.fraudCheckStatus],
    ["E-invoicing status", row.einvoicingStatus],
    ["E-invoicing reference", row.einvoicingReference ?? "-"],
    ["E-invoicing checked", formatDate(row.einvoicingCheckedAt)],
    ["E-invoicing response", formatJson(row.einvoicingResponseJson)],
    ["Fiscal reference", row.fiscalReference ?? "-"],
    ["Provenance hash", row.provenanceHash ?? "-"],
    ["Validation errors", formatJson(row.validationErrors)],
    ["Attachments", formatJson(row.attachmentMetadata)],
    ["Description", row.description ?? "-"],
    ["Cancellation reason", row.cancellationReason ?? "-"],
  ];
}

function financingRows(row: FinancingTransaction): [string, React.ReactNode][] {
  const currency = row.invoice?.currency ?? "GHS";
  return [
    ["Offer reference", row.offerReference ?? "-"],
    ["Invoice amount", formatMoney(row.invoiceAmount, currency)],
    ["Annual rate", formatPercent(row.annualRate)],
    ["Reference rate", row.referenceRate ? formatPercent(row.referenceRate) : "-"],
    ["Spread rate", row.spreadRate ? formatPercent(row.spreadRate) : "-"],
    ["Days accelerated", row.daysAccelerated],
    ["Discount amount", formatMoney(row.discountAmount, currency)],
    ["Platform fee", formatMoney(row.platformFee, currency)],
    ["Arrangement fee", formatMoney(row.arrangementFee, currency)],
    ["Servicing fee", formatMoney(row.servicingFee, currency)],
    ["Net proceeds", formatMoney(row.netProceeds, currency)],
    ["Buyer obligation", formatMoney(row.buyerObligationAmount, currency)],
    ["Funder settlement", formatMoney(row.funderSettlementAmount, currency)],
    ["Maturity date", formatDate(row.maturityDate)],
    ["Settlement date", formatDate(row.settlementDate)],
    ["Offer expires", formatDate(row.offerExpiresAt)],
    ["Status", row.status],
    ["Auto accepted", row.autoAccepted ? "Yes" : "No"],
    ["Allocation rule", row.allocationRule ?? "-"],
    ["Assignment reference", row.assignmentReference ?? "-"],
    ["True-sale status", row.trueSaleStatus],
    ["Recourse amount", formatMoney(row.recourseAmount, currency)],
    ["Adjustment amount", formatMoney(row.adjustmentAmount, currency)],
    ["Discount breakdown", formatJson(row.discountBreakdown)],
    ["Fee breakdown", formatJson(row.feeBreakdown)],
    ["Accepted at", formatDate(row.acceptedAt)],
    ["Funded at", formatDate(row.fundedAt)],
    ["Disbursed at", formatDate(row.disbursedAt)],
    ["Collected at", formatDate(row.collectedAt)],
    ["Cancellation reason", row.cancellationReason ?? "-"],
  ];
}

function canApprove(row: Invoice) {
  return !["CANCELLED", "FINANCED", "OFFERED", "FINANCEABLE", "SETTLED"].includes(row.status);
}

function SummaryCard({
  title,
  rows,
}: {
  title: string;
  rows: [string, number][];
}) {
  return (
    <Card>
      <h3 className="mb-4 text-lg font-semibold">{title}</h3>
      {rows.length ? (
        <div className="space-y-2">
          {rows.map(([label, count]) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-slate-600">{label}</span>
              <span className="font-semibold">{count}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No data yet.</p>
      )}
    </Card>
  );
}

function countBy<T>(rows: T[], selector: (row: T) => string): [string, number][] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = selector(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries()).sort(([a], [b]) => a.localeCompare(b));
}
