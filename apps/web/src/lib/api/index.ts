import { api } from "./client";
import type {
  AdminUser,
  ApprovalRequest,
  AuthUser,
  Counterparty,
  LoginResponse,
  FinancingTransaction,
  Health,
  Invoice,
  InvoiceImportBatch,
  InvoiceImportRow,
  OperationsDashboard,
  Payment,
  PaymentWebhookEvent,
  ProductDashboard,
  ProductRecord,
  ProductResource,
  ProviderCallbackReconciliation,
  ProviderWebhookEvent,
  Programme,
  ProgrammeParticipant,
  Role,
} from "./types";

export const login = async (payload: { email: string; password: string }) =>
  (await api.post<LoginResponse>("/auth/login", payload)).data;
export const getMe = async () => (await api.get<AuthUser>("/auth/me")).data;
export const requestPasswordReset = async (payload: { email: string }) =>
  (await api.post("/auth/reset-password/request", payload)).data;
export const confirmPasswordReset = async (payload: {
  token: string;
  newPassword: string;
}) => (await api.post("/auth/reset-password/confirm", payload)).data;

export const getHealth = async () =>
  (await api.get<Health>("/health")).data;

export const getUsers = async () =>
  (await api.get<AdminUser[]>("/users")).data;
export const createUser = async (payload: unknown) =>
  (await api.post<AdminUser>("/users", payload)).data;
export const updateUser = async (id: string, payload: unknown) =>
  (await api.patch<AdminUser>(`/users/${id}`, payload)).data;
export const getRoles = async () => (await api.get<Role[]>("/roles")).data;

export const getApprovals = async () =>
  (await api.get<ApprovalRequest[]>("/approvals")).data;
export const getPendingApprovals = async () =>
  (await api.get<ApprovalRequest[]>("/approvals/pending")).data;
export const getApproval = async (id: string) =>
  (await api.get<ApprovalRequest>(`/approvals/${id}`)).data;
export const createApproval = async (payload: unknown) =>
  (await api.post<ApprovalRequest>("/approvals", payload)).data;
export const approveApproval = async (id: string, payload: unknown) =>
  (await api.post(`/approvals/${id}/approve`, payload)).data;
export const rejectApproval = async (id: string, payload: unknown) =>
  (await api.post<ApprovalRequest>(`/approvals/${id}/reject`, payload)).data;
export const cancelApproval = async (id: string) =>
  (await api.post<ApprovalRequest>(`/approvals/${id}/cancel`)).data;

export const getCounterparties = async () =>
  (await api.get<Counterparty[]>("/counterparties")).data;
export const getCounterparty = async (id: string) =>
  (await api.get<Counterparty>(`/counterparties/${id}`)).data;
export const createCounterparty = async (payload: unknown) =>
  (await api.post<Counterparty>("/counterparties", payload)).data;
export const updateCounterparty = async (id: string, payload: unknown) =>
  (await api.patch<Counterparty>(`/counterparties/${id}`, payload)).data;

export const getProgrammes = async () =>
  (await api.get<Programme[]>("/programmes")).data;
export const getProgramme = async (id: string) =>
  (await api.get<Programme>(`/programmes/${id}`)).data;
export const createProgramme = async (payload: unknown) =>
  (await api.post<Programme>("/programmes", payload)).data;
export const updateProgramme = async (id: string, payload: unknown) =>
  (await api.patch<Programme>(`/programmes/${id}`, payload)).data;
export const activateProgramme = async (id: string) =>
  (await api.post<Programme>(`/programmes/${id}/activate`)).data;
export const addProgrammeParticipant = async (
  programmeId: string,
  payload: unknown,
) =>
  (
    await api.post<ProgrammeParticipant>(
      `/programmes/${programmeId}/participants`,
      payload,
    )
  ).data;

export const getInvoices = async () =>
  (await api.get<Invoice[]>("/invoices")).data;
export const getInvoice = async (id: string) =>
  (await api.get<Invoice>(`/invoices/${id}`)).data;
export const createInvoice = async (payload: unknown) =>
  (await api.post<Invoice>("/invoices", payload)).data;
export const updateInvoice = async (id: string, payload: unknown) =>
  (await api.patch<Invoice>(`/invoices/${id}`, payload)).data;
export const deleteInvoice = async (id: string) =>
  (await api.delete<Invoice>(`/invoices/${id}`)).data;
export const approveInvoice = async (id: string) =>
  (await api.post<Invoice>(`/invoices/${id}/approve`)).data;
export const importInvoicesCsv = async (formData: FormData) =>
  (
    await api.post<InvoiceImportBatch>("/invoices/import/csv", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  ).data;
export const importInvoicesExcel = async (formData: FormData) =>
  (
    await api.post<InvoiceImportBatch>("/invoices/import/excel", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  ).data;
export const importInvoicesJson = async (payload: unknown) =>
  (await api.post<InvoiceImportBatch>("/invoices/import/json", payload)).data;
export const importInvoicesFromErp = async (payload: unknown) =>
  (await api.post<InvoiceImportBatch>("/invoices/import/erp", payload)).data;
export const getInvoiceImportBatches = async () =>
  (await api.get<InvoiceImportBatch[]>("/invoices/import/batches")).data;
export const getInvoiceImportBatch = async (id: string) =>
  (await api.get<InvoiceImportBatch>(`/invoices/import/batches/${id}`)).data;
export const getInvoiceImportRows = async (batchId: string) =>
  (await api.get<InvoiceImportRow[]>(`/invoices/import/batches/${batchId}/rows`)).data;
export const processValidImportRows = async (batchId: string) =>
  (await api.post<InvoiceImportBatch>(`/invoices/import/batches/${batchId}/process-valid-rows`)).data;
export const cancelImportBatch = async (batchId: string) =>
  (await api.post<InvoiceImportBatch>(`/invoices/import/batches/${batchId}/cancel`)).data;
export const confirmBuyerApproval = async (invoiceId: string, payload: unknown) =>
  (await api.post<Invoice>(`/invoices/${invoiceId}/confirm-buyer-approval`, payload)).data;
export const validateInvoiceWithEInvoicing = async (invoiceId: string) =>
  (await api.post<Invoice>(`/invoices/${invoiceId}/validate-einvoicing`)).data;
export const runInvoiceDuplicateCheck = async (invoiceId: string) =>
  (await api.post<Invoice>(`/invoices/${invoiceId}/run-duplicate-check`)).data;
export const getInvoiceExceptions = async () =>
  (await api.get<InvoiceImportRow[]>("/invoices/exceptions")).data;
export const getProviderWebhookEvents = async () =>
  (await api.get<ProviderWebhookEvent[]>("/invoices/provider-webhook-events")).data;
export const getProviderWebhookEvent = async (id: string) =>
  (await api.get<ProviderWebhookEvent>(`/invoices/provider-webhook-events/${id}`)).data;
export const retryProviderWebhookEvent = async (id: string) =>
  (await api.post<{ event: ProviderWebhookEvent }>(`/invoices/provider-webhook-events/${id}/retry`)).data;
export const getProviderCallbackReconciliation = async () =>
  (await api.get<ProviderCallbackReconciliation>("/invoices/provider-reconciliation")).data;

export const getFinancingTransactions = async () =>
  (await api.get<FinancingTransaction[]>("/financing")).data;
export const getFinancingTransaction = async (id: string) =>
  (await api.get<FinancingTransaction>(`/financing/${id}`)).data;
export const updateFinancingTransaction = async (id: string, payload: unknown) =>
  (await api.patch<FinancingTransaction>(`/financing/${id}`, payload)).data;
export const deleteFinancingTransaction = async (id: string) =>
  (await api.delete<FinancingTransaction>(`/financing/${id}`)).data;
export const generateFinancingOfferFromInvoice = async (invoiceId: string) =>
  (
    await api.post<FinancingTransaction>(
      `/financing/offers/from-invoice/${invoiceId}`,
    )
  ).data;
export const acceptFinancingOffer = async (id: string) =>
  (await api.post<FinancingTransaction>(`/financing/${id}/accept`)).data;
export const fundFinancingTransaction = async (id: string) =>
  (await api.post<FinancingTransaction>(`/financing/${id}/fund`)).data;
export const disburseFinancingTransaction = async (id: string) =>
  (await api.post<FinancingTransaction>(`/financing/${id}/disburse`)).data;
export const collectFinancingTransaction = async (id: string) =>
  (await api.post<FinancingTransaction>(`/financing/${id}/collect`)).data;

export const getPayments = async () =>
  (await api.get<Payment[]>("/payments")).data;
export const getPayment = async (id: string) =>
  (await api.get<Payment>(`/payments/${id}`)).data;
export const createPayment = async (payload: unknown) =>
  (await api.post<Payment>("/payments", payload)).data;
export const updatePayment = async (id: string, payload: unknown) =>
  (await api.patch<Payment>(`/payments/${id}`, payload)).data;
export const submitPaymentForApproval = async (id: string) =>
  (await api.post<Payment>(`/payments/${id}/submit-for-approval`)).data;
export const approvePayment = async (id: string) =>
  (await api.post<Payment>(`/payments/${id}/approve`)).data;
export const confirmPayment = async (id: string) =>
  (await api.post<Payment>(`/payments/${id}/confirm`)).data;
export const failPayment = async (id: string, reason = "Failed from operations console") =>
  (await api.post<Payment>(`/payments/${id}/fail`, { reason })).data;
export const returnPayment = async (id: string, reason = "Returned from operations console") =>
  (await api.post<Payment>(`/payments/${id}/return`, { reason })).data;
export const initiateProviderPayment = async (paymentId: string) =>
  (await api.post<{ payment: Payment; result: unknown }>(`/payments/${paymentId}/initiate-provider-payment`)).data;
export const verifyProviderPayment = async (paymentId: string) =>
  (await api.post<{ payment: Payment; result: unknown }>(`/payments/${paymentId}/verify-provider-payment`)).data;
export const getPaymentWebhookEvents = async () =>
  (await api.get<PaymentWebhookEvent[]>("/payments/webhook-events")).data;
export const getPaymentWebhookEvent = async (id: string) =>
  (await api.get<PaymentWebhookEvent>(`/payments/webhook-events/${id}`)).data;

export const getOperationsDashboard = async () =>
  (await api.get<OperationsDashboard>("/operations/dashboard")).data;
export const getOperationRecords = async (resource: string) =>
  (await api.get<unknown[]>(`/operations/${resource}`)).data;
export const createOperationRecord = async (
  resource: string,
  data: Record<string, unknown>,
) => (await api.post(`/operations/${resource}`, { data })).data;

export const updateOperationRecord = async (
  resource: string,
  id: string,
  data: Record<string, unknown>,
) => (await api.patch(`/operations/${resource}/${id}`, { data })).data;

export const getProductDashboard = async () =>
  (await api.get<ProductDashboard>("/products/dashboard")).data;
export const getProductRecords = async (resource: ProductResource) =>
  (await api.get<ProductRecord[]>(`/products/${resource}`)).data;
export const getProductRecord = async (resource: ProductResource, id: string) =>
  (await api.get<ProductRecord>(`/products/${resource}/${id}`)).data;
export const calculateProductRecord = async (
  resource: ProductResource,
  data: Record<string, unknown>,
) =>
  (
    await api.post<Record<string, unknown>>(
      `/products/${resource}/calculate`,
      data,
    )
  ).data;
export const createProductRecord = async (
  resource: ProductResource,
  data: Record<string, unknown>,
) => (await api.post<ProductRecord>(`/products/${resource}`, { data })).data;
export const updateProductRecord = async (
  resource: ProductResource,
  id: string,
  data: Record<string, unknown>,
) => (await api.patch<ProductRecord>(`/products/${resource}/${id}`, { data })).data;
export const deleteProductRecord = async (resource: ProductResource, id: string) =>
  (await api.delete<ProductRecord>(`/products/${resource}/${id}`)).data;
export const runProductAction = async (
  resource: ProductResource,
  id: string,
  action: string,
  payload: Record<string, unknown> = {},
  idempotencyKey?: string,
) =>
  (
    await api.post<ProductRecord>(
      `/products/${resource}/${id}/actions/${action}`,
      payload,
      idempotencyKey ? { headers: { "Idempotency-Key": idempotencyKey } } : undefined,
    )
  ).data;
export const exportProductCsv = async (resource: ProductResource) =>
  (
    await api.get(`/products/${resource}/export/csv`, {
      responseType: "blob",
    })
  ).data as Blob;

export const getAuditLogs = async () => (await api.get<unknown[]>("/audit")).data;

export const getDocuments = async () => (await api.get<unknown[]>("/documents")).data;
export const getDocument = async (id: string) => (await api.get(`/documents/${id}`)).data;
export const uploadDocument = async (formData: FormData) =>
  (await api.post("/documents/upload", formData, { headers: { "Content-Type": "multipart/form-data" } })).data;
export const getDocumentDownloadUrl = async (id: string) =>
  (await api.get<{ downloadUrl: string; expiresInSeconds: number | null }>(`/documents/${id}/download-url`)).data;
export const downloadDocument = async (id: string) =>
  (await api.get(`/documents/${id}/download`, { responseType: "blob" })).data;
export const verifyDocument = async (id: string) => (await api.post(`/documents/${id}/verify`)).data;
export const rejectDocument = async (id: string, payload: { reason: string }) =>
  (await api.post(`/documents/${id}/reject`, payload)).data;
export const deleteDocument = async (id: string) => (await api.delete(`/documents/${id}`)).data;

export const getNotifications = async () => (await api.get<unknown[]>("/notifications")).data;
export const getNotification = async (id: string) => (await api.get(`/notifications/${id}`)).data;
export const createNotification = async (payload: Record<string, unknown>) =>
  (await api.post("/notifications", payload)).data;
export const sendNotification = async (id: string) => (await api.post(`/notifications/${id}/send`)).data;
export const retryNotification = async (id: string) => (await api.post(`/notifications/${id}/retry`)).data;
export const cancelNotification = async (id: string) => (await api.post(`/notifications/${id}/cancel`)).data;
export const sendTemplateNotification = async (payload: Record<string, unknown>) =>
  (await api.post("/notifications/send-template", payload)).data;

export const getIntegrationConnections = async () =>
  (await api.get<unknown[]>("/integrations/connections")).data;
export const createIntegrationConnection = async (payload: Record<string, unknown>) =>
  (await api.post("/integrations/connections", payload)).data;
export const getIntegrationConnection = async (id: string) =>
  (await api.get(`/integrations/connections/${id}`)).data;
export const updateIntegrationConnection = async (id: string, payload: Record<string, unknown>) =>
  (await api.patch(`/integrations/connections/${id}`, payload)).data;
export const testIntegrationConnection = async (id: string) =>
  (await api.post(`/integrations/connections/${id}/test`)).data;
export const enableIntegrationConnection = async (id: string) =>
  (await api.post(`/integrations/connections/${id}/enable`)).data;
export const disableIntegrationConnection = async (id: string) =>
  (await api.post(`/integrations/connections/${id}/disable`)).data;
export const getIntegrationLogs = async () => (await api.get<unknown[]>("/integrations/logs")).data;
export const getIntegrationLog = async (id: string) => (await api.get(`/integrations/logs/${id}`)).data;

export const runCounterpartyKyb = async (id: string) => (await api.post(`/counterparties/${id}/run-kyb`)).data;
export const runCounterpartyScreening = async (id: string) =>
  (await api.post(`/counterparties/${id}/run-screening`)).data;
export const runCounterpartyFullComplianceCheck = async (id: string) =>
  (await api.post(`/counterparties/${id}/run-full-compliance-check`)).data;
export const runUboKyc = async (id: string) => (await api.post(`/ubo-records/${id}/run-kyc`)).data;
export const runUboScreening = async (id: string) => (await api.post(`/ubo-records/${id}/run-screening`)).data;
export const runUboFullComplianceCheck = async (id: string) =>
  (await api.post(`/ubo-records/${id}/run-full-compliance-check`)).data;
export const getComplianceChecks = async () => (await api.get<unknown[]>("/compliance/checks")).data;
export const getComplianceCheck = async (id: string) => (await api.get(`/compliance/checks/${id}`)).data;
export const reviewComplianceCheck = async (id: string, payload: Record<string, unknown>) =>
  (await api.post(`/compliance/checks/${id}/review`, payload)).data;
export const expireComplianceCheck = async (id: string) => (await api.post(`/compliance/checks/${id}/expire`)).data;
export const getComplianceReviewQueue = async () => (await api.get<unknown[]>("/compliance/review-queue")).data;
export const getComplianceSummary = async () => (await api.get<Record<string, number>>("/compliance/summary")).data;

export const importErpInvoices = async (payload: Record<string, unknown>) =>
  (await api.post("/integrations/erp/import-invoices", payload)).data;
export const confirmErpInvoiceApproval = async (payload: Record<string, unknown>) =>
  (await api.post("/integrations/erp/confirm-invoice-approval", payload)).data;
export const getWebhookEndpoints = async () => (await api.get<unknown[]>("/webhooks/endpoints")).data;
export const createWebhookEndpoint = async (payload: Record<string, unknown>) =>
  (await api.post("/webhooks/endpoints", payload)).data;
export const getWebhookEndpoint = async (id: string) => (await api.get(`/webhooks/endpoints/${id}`)).data;
export const updateWebhookEndpoint = async (id: string, payload: Record<string, unknown>) =>
  (await api.patch(`/webhooks/endpoints/${id}`, payload)).data;
export const deleteWebhookEndpoint = async (id: string) => (await api.delete(`/webhooks/endpoints/${id}`)).data;
export const getWebhookDeliveries = async () => (await api.get<unknown[]>("/webhooks/deliveries")).data;
export const getWebhookDelivery = async (id: string) => (await api.get(`/webhooks/deliveries/${id}`)).data;
export const retryWebhookDelivery = async (id: string) => (await api.post(`/webhooks/deliveries/${id}/retry`)).data;
export const cancelWebhookDelivery = async (id: string) => (await api.post(`/webhooks/deliveries/${id}/cancel`)).data;
