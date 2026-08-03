const baseUrl = process.env.API_URL ?? "http://localhost:3001";
const suffix = `r1-${Date.now()}`;

let token = "";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${options.method ?? "GET"} ${path} failed ${response.status}: ${text}`);
  }
  return body;
}

async function main() {
  const email = process.env.SMOKE_ADMIN_EMAIL ?? "admin@invox.com";
  const passwords = [
    process.env.SMOKE_ADMIN_PASSWORD ?? "Admin@123456",
    "Demo@12345",
  ];
  let login;
  for (const password of passwords) {
    try {
      login = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      break;
    } catch (error) {
      if (password === passwords.at(-1)) throw error;
    }
  }
  token = login.accessToken;

  const anchor = await request("/counterparties", {
    method: "POST",
    body: JSON.stringify({ type: "ANCHOR", legalName: `Smoke Anchor ${suffix}`, country: "GH" }),
  });
  const supplier = await request("/counterparties", {
    method: "POST",
    body: JSON.stringify({ type: "SUPPLIER", legalName: `Smoke Supplier ${suffix}`, country: "GH" }),
  });
  const funder = await request("/counterparties", {
    method: "POST",
    body: JSON.stringify({ type: "FUNDER", legalName: `Smoke Funder ${suffix}`, country: "GH" }),
  });

  await request(`/counterparties/${anchor.id}/run-kyb`, { method: "POST" });
  await request(`/counterparties/${supplier.id}/run-kyb`, { method: "POST" });
  await request(`/counterparties/${funder.id}/run-kyb`, { method: "POST" });
  await request(`/counterparties/${anchor.id}/approve-kyc`, { method: "POST" });
  await request(`/counterparties/${supplier.id}/approve-kyc`, { method: "POST" });
  await request(`/counterparties/${funder.id}/approve-kyc`, { method: "POST" });

  const programme = await request("/programmes", {
    method: "POST",
    body: JSON.stringify({
      name: `Smoke Programme ${suffix}`,
      code: `SMOKE-${suffix}`,
      anchorId: anchor.id,
      currency: "GHS",
      annualDiscountRate: 0.18,
      programmeLimit: 1000000,
      anchorLimit: 1000000,
      supplierLimit: 500000,
      funderLimit: 1000000,
      platformFeeFlat: 0,
      platformFeePercent: 0.01,
    }),
  });
  await request(`/programmes/${programme.id}/approve`, { method: "POST" });
  await request(`/programmes/${programme.id}/activate`, { method: "POST" });
  await request(`/programmes/${programme.id}/participants`, {
    method: "POST",
    body: JSON.stringify({ counterpartyId: supplier.id, participantType: "SUPPLIER", isActive: true }),
  });
  await request(`/programmes/${programme.id}/participants`, {
    method: "POST",
    body: JSON.stringify({ counterpartyId: funder.id, participantType: "FUNDER", isActive: true }),
  });

  const invoice = await request("/invoices", {
    method: "POST",
    body: JSON.stringify({
      programmeId: programme.id,
      buyerId: anchor.id,
      supplierId: supplier.id,
      invoiceNumber: `INV-${suffix}`,
      currency: "GHS",
      amount: 100000,
      issueDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }),
  });
  const approvedInvoice = await request(`/invoices/${invoice.id}/approve`, { method: "POST" });
  assert(approvedInvoice.status === "APPROVED", "invoice approval failed");

  const offer = await request(`/financing/offers/from-invoice/${invoice.id}`, { method: "POST" });
  assert(Number(offer.netProceeds) > 0, "pricing engine result was not used");
  await request(`/financing/${offer.id}/accept`, { method: "POST" });
  const funded = await request(`/financing/${offer.id}/fund`, { method: "POST" });
  assert(funded.status === "FUNDED", "funding failed");
  const disbursed = await request(`/financing/${offer.id}/disburse`, { method: "POST" });
  assert(disbursed.status === "DISBURSED", "disbursement failed");
  const collected = await request(`/financing/${offer.id}/collect`, { method: "POST" });
  assert(collected.status === "COLLECTED", "collection failed");
  const closed = await request(`/financing/${offer.id}/close`, { method: "POST" });
  assert(closed.status === "CLOSED", "close failed");

  const financing = await request(`/financing/${offer.id}`);
  const debits = financing.ledgerEntries
    .filter((row) => row.entryType === "DEBIT")
    .reduce((sum, row) => sum + Number(row.amount), 0);
  const credits = financing.ledgerEntries
    .filter((row) => row.entryType === "CREDIT")
    .reduce((sum, row) => sum + Number(row.amount), 0);
  assert(debits === credits, "ledger is not balanced");
  assert(financing.fundingAllocations.length > 0, "funding allocation missing");
  assert(financing.payments.length >= 2, "payment/collection records missing");

  const dashboard = await request("/operations/dashboard");
  assert("totalExposure" in dashboard, "reports/dashboard did not return exposure");
  const audit = await request("/audit");
  assert(Array.isArray(audit) && audit.length > 0, "audit logs missing");

  console.log(JSON.stringify({ ok: true, suffix, financingId: offer.id }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
