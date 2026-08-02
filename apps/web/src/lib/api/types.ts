export type CounterpartyType = "ANCHOR" | "SUPPLIER" | "FUNDER" | "INVESTOR";
export type OnboardingStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED";
export type RiskRating = "LOW" | "MEDIUM" | "HIGH";
export type KycTier = "SIMPLIFIED" | "STANDARD" | "ENHANCED";
export type VerificationStatus =
  | "NOT_STARTED"
  | "PENDING"
  | "VERIFIED"
  | "FAILED"
  | "MANUAL_REVIEW";
export type ScreeningStatus =
  | "NOT_SCREENED"
  | "CLEAR"
  | "POSSIBLE_MATCH"
  | "CONFIRMED_MATCH";
export type DocumentStatus =
  | "REQUIRED"
  | "RECEIVED"
  | "VERIFIED"
  | "EXPIRED"
  | "WAIVED";
export type ProgrammeStatus = "DRAFT" | "ACTIVE" | "SUSPENDED" | "CLOSED";
export type ProductType =
  | "REVERSE_FACTORING"
  | "DYNAMIC_DISCOUNTING"
  | "RECEIVABLES_FINANCE"
  | "FACTORING"
  | "INVOICE_DISCOUNTING"
  | "DISTRIBUTOR_FINANCE"
  | "DEEP_TIER_FINANCE"
  | "RECEIVABLES_PURCHASE";
export type ProgrammeMode = "LIVE" | "SANDBOX";
export type DayCountConvention = "ACT_360" | "ACT_365" | "THIRTY_360";
export type DiscountMethod = "STRAIGHT_DISCOUNT" | "TRUE_DISCOUNT";
export type InvoiceStatus =
  | "RECEIVED"
  | "VALIDATED"
  | "APPROVED"
  | "FINANCEABLE"
  | "OFFERED"
  | "FINANCED"
  | "SETTLED"
  | "DISPUTED"
  | "CANCELLED";
export type FinancingStatus =
  | "OFFERED"
  | "ACCEPTED"
  | "FUNDED"
  | "DISBURSED"
  | "MATURED"
  | "COLLECTED"
  | "CLOSED"
  | "DEFAULTED"
  | "CANCELLED";

export type PaymentStatus =
  | "INITIATED"
  | "SENT"
  | "CONFIRMED"
  | "FAILED"
  | "RETURNED";

export type PaymentDirection = "OUTBOUND" | "INBOUND";

export type OperationsDashboard = {
  openObligations: number;
  pastDueObligations: number;
  unmatchedReconciliation: number;
  openWorkflowCases: number;
  pendingNotifications: number;
  activeLimits: number;
  activeFunders: number;
  activeReports: number;
  openDynamicDiscountingOffers: number;
  activeReceivablesFacilities: number;
  openMarketplaceBids: number;
  activeEsgScorecards: number;
  activeIntegrationConnections: number;
  openAiAnomalySignals: number;
  investorReportSnapshots: number;
  pendingOutboundPayments: number;
  failedPayments: number;
  failedNotifications: number;
  failedIntegrations: number;
  failedWebhookDeliveries: number;
  pendingDocumentVerifications: number;
  totalExposure: string | number;
  totalOutstanding: string | number;
  ledgerDebitTotal: string | number;
  ledgerCreditTotal: string | number;
  ledgerImbalance: string | number;
};

export type Phase2Resource =
  | "dynamic-discounting-offers"
  | "receivables-facilities"
  | "funder-marketplace-bids"
  | "esg-scorecards"
  | "ai-anomaly-signals"
  | "investor-report-snapshots";

export type Phase2Dashboard = {
  openDynamicDiscountingOffers: number;
  acceptedDynamicDiscountingOffers: number;
  activeReceivablesFacilities: number;
  submittedMarketplaceBids: number;
  confirmedMarketplaceBids: number;
  activeEsgScorecards: number;
  openAiAnomalySignals: number;
  highSeverityAiAnomalySignals: number;
  investorReportSnapshots: number;
  dynamicDiscountingInvoiceAmount: string | number;
  dynamicDiscountingDiscountAmount: string | number;
  dynamicDiscountingNetPaymentAmount: string | number;
  receivablesFacilityLimit: string | number;
  receivablesUtilisedAmount: string | number;
  marketplaceOfferedAmount: string | number;
  investorNavAmount: string | number;
  investorCommittedCapital: string | number;
  investorDrawnCapital: string | number;
};

export type DynamicDiscountingOffer = {
  id: string;
  programmeId?: string | null;
  buyerId: string;
  supplierId: string;
  invoiceId?: string | null;
  currency: string;
  invoiceAmount: string;
  buyerCashAvailable?: string | null;
  discountModel: string;
  targetYield?: string | null;
  discountRate: string;
  discountAmount: string;
  netPaymentAmount: string;
  daysAccelerated: number;
  status: string;
  requestedBy?: string | null;
  expiresAt?: string | null;
  acceptedAt?: string | null;
  rulesJson?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type ReceivablesFacility = {
  id: string;
  programmeId?: string | null;
  supplierId: string;
  debtorId?: string | null;
  facilityType: string;
  recourseType: string;
  disclosed: boolean;
  currency: string;
  facilityLimit: string;
  advanceRate: string;
  reserveRate: string;
  utilisedAmount: string;
  status: string;
  assignmentNoticeStatus?: string | null;
  lockboxAccount?: string | null;
  eligibilityRules?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type FunderMarketplaceBid = {
  id: string;
  financingTransactionId?: string | null;
  invoiceId?: string | null;
  funderId: string;
  bidType: string;
  currency: string;
  offeredAmount: string;
  minYield?: string | null;
  maxTenorDays?: number | null;
  participationStatus: string;
  validUntil?: string | null;
  conditionsJson?: Record<string, unknown> | null;
  confirmedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EsgScorecard = {
  id: string;
  counterpartyId: string;
  programmeId?: string | null;
  provider?: string | null;
  score: string;
  tier?: string | null;
  asOfDate: string;
  kpiJson?: Record<string, unknown> | null;
  evidenceJson?: Record<string, unknown> | null;
  pricingAdjustmentBps: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type AiAnomalySignal = {
  id: string;
  invoiceId?: string | null;
  paymentId?: string | null;
  counterpartyId?: string | null;
  modelName: string;
  modelVersion: string;
  signalType: string;
  severity: string;
  score: string;
  rationaleJson?: Record<string, unknown> | null;
  status: string;
  reviewedByUserId?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InvestorReportSnapshot = {
  id: string;
  investorRecordId?: string | null;
  counterpartyId?: string | null;
  reportType: string;
  periodStart: string;
  periodEnd: string;
  navAmount?: string | null;
  committedCapital?: string | null;
  drawnCapital?: string | null;
  distributedCapital?: string | null;
  grossYield?: string | null;
  delinquencyRate?: string | null;
  weightedAverageLifeDays?: number | null;
  reportJson?: Record<string, unknown> | null;
  status: string;
  generatedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type Phase2Record =
  | DynamicDiscountingOffer
  | ReceivablesFacility
  | FunderMarketplaceBid
  | EsgScorecard
  | AiAnomalySignal
  | InvestorReportSnapshot;

export type Health = {
  status: string;
  service: string;
};

export type AuthUser = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  roles: string[];
  permissions: string[];
};

export type LoginResponse = {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
  user: AuthUser;
};

export type UserStatus = "INVITED" | "ACTIVE" | "SUSPENDED" | "DISABLED";

export type RoleSummary = {
  id: string;
  name: string;
  description?: string | null;
};

export type Role = RoleSummary & {
  permissions: string[];
  createdAt: string;
  updatedAt: string;
};

export type AdminUser = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  status: UserStatus;
  roles: RoleSummary[];
  permissions: string[];
  createdAt: string;
  updatedAt: string;
};

export type ApprovalRequest = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | string;
  requestedById: string;
  approvedById?: string | null;
  rejectedById?: string | null;
  requestPayload?: Record<string, unknown> | null;
  approvalComment?: string | null;
  rejectionReason?: string | null;
  requestedAt: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Counterparty = {
  id: string;
  type: CounterpartyType;
  legalName: string;
  tradingName?: string | null;
  registrationNumber?: string | null;
  tin?: string | null;
  country: string;
  address?: string | null;
  industry?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  ownershipSummary?: string | null;
  directorsSummary?: string | null;
  onboardingStatus: OnboardingStatus;
  onboardingProgress: number;
  riskRating?: RiskRating | null;
  kycTier?: KycTier | null;
  kybStatus: VerificationStatus;
  screeningStatus?: string | null;
  sanctionsStatus?: string | null;
  pepStatus?: string | null;
  adverseMediaStatus?: string | null;
  identityVerificationStatus: VerificationStatus;
  registryVerificationStatus: VerificationStatus;
  creditBureauStatus: VerificationStatus;
  sanctionsScreeningStatus: ScreeningStatus;
  pepScreeningStatus: ScreeningStatus;
  adverseMediaScreeningStatus: ScreeningStatus;
  lastKybCheckAt?: string | null;
  lastScreenedAt?: string | null;
  lastScreeningAt?: string | null;
  nextKybReviewAt?: string | null;
  nextScreeningAt?: string | null;
  complianceReviewStatus?: string | null;
  complianceNotes?: string | null;
  nextReviewDate?: string | null;
  consentAcceptedAt?: string | null;
  dataProcessingAgreementAcceptedAt?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  onboardingDecisionReason?: string | null;
  bankAccounts?: BankAccount[];
  uboRecords?: UboRecord[];
  directors?: DirectorRecord[];
  documents?: CounterpartyDocument[];
  consentRecords?: ConsentRecord[];
  createdAt: string;
  updatedAt: string;
};

export type BankAccount = {
  id: string;
  counterpartyId: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch?: string | null;
  currency: string;
  paymentInstruction?: string | null;
  verificationStatus: VerificationStatus;
  isVerified: boolean;
  isPrimary: boolean;
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UboRecord = {
  id: string;
  counterpartyId: string;
  fullName: string;
  nationality?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  idType?: string | null;
  idNumber?: string | null;
  ownershipPercentage?: string | null;
  kycStatus?: string | null;
  screeningStatus: ScreeningStatus;
  sanctionsStatus?: string | null;
  pepStatus?: string | null;
  adverseMediaStatus?: string | null;
  lastKycCheckAt?: string | null;
  lastScreeningAt?: string | null;
  nextKycReviewAt?: string | null;
  nextScreeningAt?: string | null;
  complianceReviewStatus?: string | null;
  complianceNotes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DirectorRecord = {
  id: string;
  counterpartyId: string;
  fullName: string;
  nationality?: string | null;
  dateOfBirth?: string | null;
  idType?: string | null;
  idNumber?: string | null;
  roleTitle?: string | null;
  screeningStatus: ScreeningStatus;
  createdAt: string;
  updatedAt: string;
};

export type CounterpartyDocument = {
  id: string;
  counterpartyId: string;
  documentType: string;
  fileName?: string | null;
  status: DocumentStatus;
  issuedAt?: string | null;
  expiresAt?: string | null;
  verifiedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ConsentRecord = {
  id: string;
  counterpartyId: string;
  consentType: string;
  acceptedBy?: string | null;
  acceptedAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
};

export type ProgrammeParticipant = {
  id: string;
  programmeId: string;
  counterpartyId: string;
  participantType: CounterpartyType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  counterparty?: Counterparty;
};

export type Programme = {
  id: string;
  name: string;
  code: string;
  productType: ProductType;
  mode: ProgrammeMode;
  anchorId: string;
  anchor?: Counterparty;
  currency: string;
  status: ProgrammeStatus;
  version: number;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  publishedAt?: string | null;
  expiresAt?: string | null;
  eligibilityCounterpartyStatus: OnboardingStatus;
  minimumInvoiceAgeDays?: number | null;
  maximumInvoiceAgeDays?: number | null;
  maxTenorDays?: number | null;
  minimumInvoiceAmount?: string | null;
  maximumInvoiceAmount?: string | null;
  excludedCounterpartyIds?: string[] | null;
  programmeLimit?: string | null;
  anchorLimit?: string | null;
  supplierLimit?: string | null;
  funderLimit?: string | null;
  concentrationCapPercent?: string | null;
  referenceRateSource?: string | null;
  referenceRate?: string | null;
  funderSpread?: string | null;
  annualDiscountRate: string;
  dayCountConvention: DayCountConvention;
  discountMethod: DiscountMethod;
  platformFeeFlat: string;
  platformFeePercent: string;
  arrangementFeeFlat: string;
  servicingFeePercent: string;
  approvalWorkflow?: Record<string, unknown> | null;
  requiredDocuments?: string[] | null;
  eSignRequired: boolean;
  workflowSlaHours?: number | null;
  eligibilityRules?: Record<string, unknown> | null;
  limitRules?: Record<string, unknown> | null;
  pricingRules?: Record<string, unknown> | null;
  sandboxAssumptions?: Record<string, unknown> | null;
  whiteLabelName?: string | null;
  brandPrimaryColor?: string | null;
  brandLogoUrl?: string | null;
  termsUrl?: string | null;
  configurationNotes?: string | null;
  participants?: ProgrammeParticipant[];
  createdAt: string;
  updatedAt: string;
};

export type Invoice = {
  id: string;
  programmeId: string;
  programme?: Programme;
  buyerId: string;
  buyer?: Counterparty;
  supplierId: string;
  supplier?: Counterparty;
  invoiceNumber: string;
  externalReference?: string | null;
  ingestionChannel: string;
  sourceSystem?: string | null;
  sourceType?: string | null;
  importBatchId?: string | null;
  buyerApprovalReference?: string | null;
  buyerApprovalSource?: string | null;
  buyerApprovalImportedAt?: string | null;
  einvoicingStatus: string;
  einvoicingReference?: string | null;
  einvoicingCheckedAt?: string | null;
  einvoicingResponseJson?: Record<string, unknown> | null;
  purchaseOrderNumber?: string | null;
  goodsReceivedNote?: string | null;
  currency: string;
  amount: string;
  taxAmount: string;
  creditNoteAmount: string;
  paidAmount: string;
  disputedAmount: string;
  financeableAmount?: string | null;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  buyerApprovedAt?: string | null;
  approvedByUserId?: string | null;
  validationStatus: string;
  validationErrors?: Record<string, unknown> | null;
  duplicateCheckStatus: string;
  fraudCheckStatus: string;
  provenanceHash?: string | null;
  attachmentMetadata?: Record<string, unknown> | null;
  description?: string | null;
  fiscalReference?: string | null;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InvoiceImportBatch = {
  id: string;
  sourceType: string;
  sourceReference?: string | null;
  programmeId?: string | null;
  programme?: Programme | null;
  anchorId?: string | null;
  anchor?: Counterparty | null;
  uploadedDocumentId?: string | null;
  status: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  importedRows: number;
  failedRows: number;
  startedAt?: string | null;
  completedAt?: string | null;
  uploadedById?: string | null;
  errorSummary?: string | null;
  rows?: InvoiceImportRow[];
  createdAt: string;
  updatedAt: string;
};

export type InvoiceImportRow = {
  id: string;
  batchId: string;
  rowNumber: number;
  rawJson: Record<string, unknown>;
  normalizedJson?: Record<string, unknown> | null;
  status: string;
  validationErrors?: Record<string, unknown> | null;
  duplicateOfInvoiceId?: string | null;
  duplicateOfInvoice?: Invoice | null;
  createdInvoiceId?: string | null;
  createdInvoice?: Invoice | null;
  createdAt: string;
  updatedAt: string;
};

export type ProviderWebhookEvent = {
  id: string;
  providerType: string;
  providerKey: string;
  eventType: string;
  eventReference: string;
  signatureValid: boolean;
  payloadJson: Record<string, unknown>;
  status: string;
  entityType?: string | null;
  entityId?: string | null;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt?: string | null;
  lastAttemptAt?: string | null;
  processedAt?: string | null;
  processingError?: string | null;
  reconciliationStatus: string;
  reconciliationNotes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProviderCallbackReconciliation = {
  counts: Record<string, number>;
  events: ProviderWebhookEvent[];
};

export type FinancingTransaction = {
  id: string;
  invoiceId: string;
  invoice?: Invoice;
  offerReference?: string | null;
  programmeId: string;
  programme?: Programme;
  supplierId: string;
  buyerId: string;
  invoiceAmount: string;
  annualRate: string;
  referenceRate?: string | null;
  spreadRate?: string | null;
  daysAccelerated: number;
  discountAmount: string;
  platformFee: string;
  arrangementFee: string;
  servicingFee: string;
  netProceeds: string;
  buyerObligationAmount?: string | null;
  funderSettlementAmount?: string | null;
  maturityDate: string;
  settlementDate?: string | null;
  offerExpiresAt?: string | null;
  status: FinancingStatus;
  autoAccepted: boolean;
  discountBreakdown?: Record<string, unknown> | null;
  feeBreakdown?: Record<string, unknown> | null;
  allocationRule?: string | null;
  assignmentReference?: string | null;
  trueSaleStatus: string;
  recourseAmount: string;
  adjustmentAmount: string;
  cancellationReason?: string | null;
  acceptedAt?: string | null;
  fundedAt?: string | null;
  disbursedAt?: string | null;
  collectedAt?: string | null;
  payments?: Payment[];
  createdAt: string;
  updatedAt: string;
};

export type PaymentWebhookEvent = {
  id: string;
  provider: string;
  eventType: string;
  eventReference: string;
  paymentId?: string | null;
  providerReference?: string | null;
  payloadJson: Record<string, unknown>;
  signatureValid: boolean;
  processed: boolean;
  processedAt?: string | null;
  processingError?: string | null;
  receivedAt: string;
  payment?: Payment | null;
  createdAt: string;
  updatedAt: string;
};

export type LedgerEntry = {
  id: string;
  accountId: string;
  financingTransactionId?: string | null;
  paymentId?: string | null;
  entryType: "DEBIT" | "CREDIT";
  amount: string;
  currency: string;
  description?: string | null;
  postedAt: string;
  account?: { id: string; code: string; name: string; currency: string };
};

export type ReconciliationItem = {
  id: string;
  paymentId?: string | null;
  statementReference?: string | null;
  statementAmount: string;
  currency: string;
  statementDate: string;
  status: string;
  matchConfidence?: string | null;
};

export type Payment = {
  id: string;
  financingTransactionId?: string | null;
  financingTransaction?: FinancingTransaction | null;
  counterpartyId?: string | null;
  counterparty?: Counterparty | null;
  direction: PaymentDirection;
  rail: string;
  currency: string;
  amount: string;
  reference?: string | null;
  status: PaymentStatus;
  valueDate?: string | null;
  confirmedAt?: string | null;
  provider?: string | null;
  providerReference?: string | null;
  externalTransactionId?: string | null;
  idempotencyKey?: string | null;
  webhookReference?: string | null;
  providerStatus?: string | null;
  providerResponseJson?: Record<string, unknown> | null;
  initiatedById?: string | null;
  verifiedById?: string | null;
  approvedById?: string | null;
  initiatedAt?: string | null;
  verifiedAt?: string | null;
  approvedAt?: string | null;
  webhookReceivedAt?: string | null;
  lastProviderCheckAt?: string | null;
  failureReason?: string | null;
  reversalReason?: string | null;
  metadata?: Record<string, unknown> | null;
  reconciliationItems?: ReconciliationItem[];
  ledgerEntries?: LedgerEntry[];
  webhookEvents?: PaymentWebhookEvent[];
  createdAt: string;
  updatedAt: string;
};
