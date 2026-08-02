import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const API = "http://localhost:3001";
const WEB = "http://localhost:3000";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const DEBUG_PORT = 9223;

const results = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` - ${detail}` : ""}`);
}

async function api(path, options = {}, token) {
  const response = await fetch(`${API}${path}`, {
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

async function login() {
  for (const password of ["ChangeMe123!", "Admin@123456", "Admin@12345"]) {
    try {
      return await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "admin@invox.local", password }),
      });
    } catch {
      // Try the next known local seed password.
    }
  }
  throw new Error("Could not login with known local admin passwords");
}

async function seedRelease1Data(token) {
  const suffix = Date.now().toString().slice(-6);
  const anchor = await api(
    "/counterparties",
    {
      method: "POST",
      body: JSON.stringify({
        type: "ANCHOR",
        legalName: `Smoke Anchor ${suffix}`,
        registrationNumber: `SMK-A-${suffix}`,
        tin: `TIN-A-${suffix}`,
        country: "GH",
        contactEmail: "anchor@example.com",
      }),
    },
    token,
  );
  const supplier = await api(
    "/counterparties",
    {
      method: "POST",
      body: JSON.stringify({
        type: "SUPPLIER",
        legalName: `Smoke Supplier ${suffix}`,
        registrationNumber: `SMK-S-${suffix}`,
        tin: `TIN-S-${suffix}`,
        country: "GH",
        contactEmail: "supplier@example.com",
      }),
    },
    token,
  );
  const funder = await api(
    "/counterparties",
    {
      method: "POST",
      body: JSON.stringify({
        type: "FUNDER",
        legalName: `Smoke Funder ${suffix}`,
        registrationNumber: `SMK-F-${suffix}`,
        tin: `TIN-F-${suffix}`,
        country: "GH",
        contactEmail: "funder@example.com",
      }),
    },
    token,
  );
  const programme = await api(
    "/programmes",
    {
      method: "POST",
      body: JSON.stringify({
        name: `Smoke RF ${suffix}`,
        code: `SMK-RF-${suffix}`,
        anchorId: anchor.id,
        currency: "GHS",
        annualDiscountRate: 0.18,
        mode: "SANDBOX",
        productType: "REVERSE_FACTORING",
      }),
    },
    token,
  );
  await api(
    `/programmes/${programme.id}/participants`,
    {
      method: "POST",
      body: JSON.stringify({
        counterpartyId: supplier.id,
        participantType: "SUPPLIER",
        isActive: true,
      }),
    },
    token,
  );
  return { suffix, anchor, supplier, funder, programme };
}

async function phase2CrudAndLifecycleSmoke(page, token, seeded, invoiceId, paymentId) {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const offer = await api("/phase2-products/dynamic-discounting-offers", {
    method: "POST",
    body: JSON.stringify({
      data: {
        programmeId: seeded.programme.id,
        buyerId: seeded.anchor.id,
        supplierId: seeded.supplier.id,
        invoiceId,
        currency: "GHS",
        invoiceAmount: 100,
        buyerCashAvailable: 1000,
        discountModel: "STATIC_RATE",
        targetYield: 0.12,
        discountRate: 0.02,
        discountAmount: 2,
        netPaymentAmount: 98,
        daysAccelerated: 20,
        status: "OFFERED",
        expiresAt: tomorrow,
        rulesJson: { smoke: true },
      },
    }),
  }, token);
  const calculated = await api("/phase2-products/dynamic-discounting-offers/calculate", {
    method: "POST",
    body: JSON.stringify({
      invoiceAmount: 100,
      discountRate: 0.02,
      daysAccelerated: 20,
    }),
  }, token);
  if (Number(calculated.netPaymentAmount) <= 0) {
    throw new Error("Dynamic discounting calculator returned invalid net payment");
  }
  await page.goto(`${WEB}/phase2/dynamic-discounting/${offer.id}`);
  await page.waitForText("Dynamic Discounting Detail");
  await page.waitForText("Lifecycle Timeline");
  record("Product detail page and calculator render", true);
  await api(`/phase2-products/dynamic-discounting-offers/${offer.id}`, {
    method: "PATCH",
    body: JSON.stringify({ data: { buyerCashAvailable: 1200 } }),
  }, token);
  await api(`/phase2-products/dynamic-discounting-offers/${offer.id}/actions/accept`, { method: "POST", body: "{}" }, token);
  await api(`/phase2-products/dynamic-discounting-offers/${offer.id}`, { method: "DELETE" }, token);
  record("Product dynamic discounting CRUD and lifecycle", true);

  const facility = await api("/phase2-products/receivables-facilities", {
    method: "POST",
    body: JSON.stringify({
      data: {
        programmeId: seeded.programme.id,
        supplierId: seeded.supplier.id,
        debtorId: seeded.anchor.id,
        facilityType: "RECEIVABLES_FINANCE",
        recourseType: "WITH_RECOURSE",
        disclosed: true,
        currency: "GHS",
        facilityLimit: 1000,
        advanceRate: 0.8,
        reserveRate: 0.2,
        utilisedAmount: 0,
        status: "DRAFT",
        assignmentNoticeStatus: "NOT_SENT",
        eligibilityRules: { maxInvoiceAgeDays: 90 },
      },
    }),
  }, token);
  await api(`/phase2-products/receivables-facilities/${facility.id}/actions/approve`, { method: "POST", body: "{}" }, token);
  await api(`/phase2-products/receivables-facilities/${facility.id}/actions/activate`, { method: "POST", body: "{}" }, token);
  await api(`/phase2-products/receivables-facilities/${facility.id}`, { method: "DELETE" }, token);
  record("Product receivables facility CRUD and lifecycle", true);

  const bid = await api("/phase2-products/funder-marketplace-bids", {
    method: "POST",
    body: JSON.stringify({
      data: {
        invoiceId,
        funderId: seeded.funder.id,
        bidType: "PARTICIPATION",
        currency: "GHS",
        offeredAmount: 75,
        minYield: 0.1,
        maxTenorDays: 45,
        participationStatus: "SUBMITTED",
        validUntil: tomorrow,
        conditionsJson: { appetite: "SMOKE" },
      },
    }),
  }, token);
  await api(`/phase2-products/funder-marketplace-bids/${bid.id}/actions/confirm`, { method: "POST", body: "{}" }, token);
  await api(`/phase2-products/funder-marketplace-bids/${bid.id}/actions/allocate`, { method: "POST", body: "{}" }, token);
  await api(`/phase2-products/funder-marketplace-bids/${bid.id}`, { method: "DELETE" }, token);
  record("Product marketplace bid CRUD and lifecycle", true);

  const esg = await api("/phase2-products/esg-scorecards", {
    method: "POST",
    body: JSON.stringify({
      data: {
        counterpartyId: seeded.supplier.id,
        programmeId: seeded.programme.id,
        provider: "internal",
        score: 82,
        tier: "GREEN",
        asOfDate: new Date().toISOString(),
        pricingAdjustmentBps: -25,
        status: "ACTIVE",
        kpiJson: { localSourcing: true },
        evidenceJson: { smoke: true },
      },
    }),
  }, token);
  await api(`/phase2-products/esg-scorecards/${esg.id}/actions/review`, { method: "POST", body: "{}" }, token);
  await api(`/phase2-products/esg-scorecards/${esg.id}/actions/activate`, { method: "POST", body: "{}" }, token);
  await api(`/phase2-products/esg-scorecards/${esg.id}`, { method: "DELETE" }, token);
  record("Product ESG scorecard CRUD and lifecycle", true);

  const signal = await api("/phase2-products/ai-anomaly-signals", {
    method: "POST",
    body: JSON.stringify({
      data: {
        invoiceId,
        paymentId,
        counterpartyId: seeded.supplier.id,
        modelName: "rules-baseline",
        modelVersion: "1.0",
        signalType: "DUPLICATE_RISK",
        severity: "MEDIUM",
        score: 0.62,
        rationaleJson: { reason: "smoke" },
        status: "OPEN",
      },
    }),
  }, token);
  await api(`/phase2-products/ai-anomaly-signals/${signal.id}/actions/review`, { method: "POST", body: "{}" }, token);
  await api(`/phase2-products/ai-anomaly-signals/${signal.id}/actions/resolve`, {
    method: "POST",
    body: JSON.stringify({ rationaleJson: { decision: "resolved by smoke" } }),
  }, token);
  await api(`/phase2-products/ai-anomaly-signals/${signal.id}`, { method: "DELETE" }, token);
  record("Product anomaly signal CRUD and lifecycle", true);

  const snapshot = await api("/phase2-products/investor-report-snapshots", {
    method: "POST",
    body: JSON.stringify({
      data: {
        counterpartyId: seeded.funder.id,
        reportType: "MONTHLY_NAV",
        periodStart: new Date().toISOString(),
        periodEnd: nextMonth,
        navAmount: 5000,
        committedCapital: 10000,
        drawnCapital: 4000,
        distributedCapital: 250,
        grossYield: 0.11,
        delinquencyRate: 0.01,
        weightedAverageLifeDays: 35,
        reportJson: { smoke: true },
        status: "GENERATED",
      },
    }),
  }, token);
  await api(`/phase2-products/investor-report-snapshots/${snapshot.id}/actions/publish`, { method: "POST", body: "{}" }, token);
  await api(`/phase2-products/investor-report-snapshots/${snapshot.id}`, { method: "DELETE" }, token);
  record("Product investor report CRUD and lifecycle", true);
}

async function waitForJson(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {
      // Keep polling.
    }
    await sleep(250);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

class CdpPage {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = new Map();
    ws.onmessage = (message) => {
      const payload = JSON.parse(message.data);
      if (payload.id && this.pending.has(payload.id)) {
        const { resolve, reject } = this.pending.get(payload.id);
        this.pending.delete(payload.id);
        if (payload.error) reject(new Error(JSON.stringify(payload.error)));
        else resolve(payload.result);
        return;
      }
      const handlers = this.events.get(payload.method) ?? [];
      for (const handler of handlers) handler(payload.params);
    };
  }

  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  once(method) {
    return new Promise((resolve) => {
      const handler = (params) => {
        const handlers = this.events.get(method) ?? [];
        this.events.set(method, handlers.filter((item) => item !== handler));
        resolve(params);
      };
      this.events.set(method, [...(this.events.get(method) ?? []), handler]);
    });
  }

  async eval(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(JSON.stringify(result.exceptionDetails));
    }
    return result.result.value;
  }

  async goto(url) {
    const loaded = this.once("Page.loadEventFired");
    await this.send("Page.navigate", { url });
    await Promise.race([loaded, sleep(10000)]);
    await sleep(500);
  }

  async waitForText(text, timeoutMs = 15000) {
    await waitFor(async () => {
      const body = await this.eval("document.body.innerText");
      return body.includes(text);
    }, timeoutMs, `text ${text}`);
  }

  async clickText(text) {
    const clicked = await this.eval(`
      (() => {
        const nodes = Array.from(document.querySelectorAll('button,a'));
        const node = nodes.find((el) => el.textContent && el.textContent.includes(${JSON.stringify(text)}));
        if (!node) return false;
        node.click();
        return true;
      })()
    `);
    if (!clicked) {
      const body = await this.eval("document.body.innerText");
      throw new Error(`Could not click text: ${text}. Body: ${body.slice(0, 1000)}`);
    }
    await sleep(800);
  }

  async setFirstTextarea(value) {
    const ok = await this.eval(`
      (() => {
        const node = document.querySelector('textarea');
        if (!node) return false;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        setter.call(node, ${JSON.stringify(value)});
        node.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      })()
    `);
    if (!ok) throw new Error("Could not set textarea value");
  }
}

async function browserSmoke() {
  const loginResult = await login();
  const token = loginResult.accessToken;
  const seeded = await seedRelease1Data(token);
  record("API seed data", true, `${seeded.programme.code}`);

  const profile = await mkdtemp(join(tmpdir(), "invox-chrome-"));
  const chrome = spawn(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${DEBUG_PORT}`,
    "--remote-allow-origins=*",
    "about:blank",
  ], { stdio: "ignore" });

  try {
    await waitForJson(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
    const target = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?about:blank`, { method: "PUT" }).then((r) => r.json());
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });
    const page = new CdpPage(ws);
    await page.send("Page.enable");
    await page.send("Runtime.enable");

    await page.goto(`${WEB}/login`);
    await page.waitForText("Sign in");
    record("Login page renders", true);

    await page.eval(`
      sessionStorage.setItem('invox.accessToken', ${JSON.stringify(token)});
      sessionStorage.setItem('invox.user', ${JSON.stringify(JSON.stringify(loginResult.user))});
    `);

    const pageChecks = [
      ["/dashboard", "Workspace"],
      ["/invoices", "Invoices"],
      ["/invoices/import", "Invoice Import"],
      ["/invoices/import/batches", "Invoice Import Batches"],
      ["/invoices/exceptions", "Invoice Exceptions"],
      ["/payments", "Payments"],
      ["/webhooks/payments", "Payment Webhook Events"],
      ["/webhooks/providers", "Provider Callbacks"],
      ["/integrations/logs", "Integration Logs"],
      ["/phase2", "Product Suite"],
      ["/phase2/dynamic-discounting", "Dynamic Discounting"],
      ["/phase2/receivables", "Receivables Facilities"],
      ["/phase2/marketplace-bids", "Funder Marketplace"],
      ["/phase2/esg", "ESG Scorecards"],
      ["/phase2/anomalies", "Anomaly Signals"],
      ["/phase2/investor-reports", "Investor Reports"],
    ];
    for (const [path, text] of pageChecks) {
      await page.goto(`${WEB}${path}`);
      await page.waitForText(text);
      record(`Page renders ${path}`, true);
    }

    await page.goto(`${WEB}/invoices/import`);
    await page.waitForText("JSON/API import");
    const invoiceNumber = `UI-INV-${seeded.suffix}`;
    const jsonPayload = {
      programmeCode: seeded.programme.code,
      invoices: [
        {
          invoiceNumber,
          supplierRegistrationNumber: seeded.supplier.registrationNumber,
          amount: 4321,
          currency: "GHS",
          issueDate: "2026-01-15",
          dueDate: "2026-03-15",
          buyerApproved: true,
          buyerApprovalReference: `APP-${seeded.suffix}`,
        },
      ],
    };
    await page.setFirstTextarea(JSON.stringify(jsonPayload, null, 2));
    await page.clickText("Import JSON");
    await waitFor(async () => (await page.eval("location.pathname")).includes("/invoices/import/batches/"), 15000, "batch route");
    await page.waitForText("Import Batch Detail");
    record("UI JSON invoice import creates batch", true);

    const batchPath = await page.eval("location.pathname");
    const batchId = batchPath.split("/").pop();
    await page.clickText("Process valid rows");
    await waitFor(async () => {
      const rows = await api(`/invoices/import/batches/${batchId}/rows`, {}, token);
      return rows.some((row) => row.status === "IMPORTED");
    }, 15000, "imported row");
    record("Batch process valid rows", true);

    const importedRows = await api(`/invoices/import/batches/${batchId}/rows`, {}, token);
    const invoiceId = importedRows.find((row) => row.createdInvoiceId)?.createdInvoiceId;
    if (!invoiceId) throw new Error("No imported invoice id found");
    await page.goto(`${WEB}/invoices/${invoiceId}`);
    await page.waitForText("Invoice Detail");
    await page.waitForText("E-invoicing status");
    record("Invoice detail shows e-invoicing metadata", true);

    await page.clickText("Validate E-Invoicing");
    await sleep(1000);
    await page.clickText("Run Duplicate Check");
    await sleep(1000);
    record("Invoice detail action buttons execute", true);

    const payment = await api("/payments", {
      method: "POST",
      body: JSON.stringify({
        counterpartyId: seeded.supplier.id,
        direction: "OUTBOUND",
        rail: "SANDBOX",
        currency: "GHS",
        amount: 25,
        reference: `PAY-${seeded.suffix}`,
        status: "INITIATED",
        valueDate: new Date().toISOString(),
      }),
    }, token);
    await page.goto(`${WEB}/payments/${payment.id}`);
    await page.waitForText("Payment Detail");
    await page.waitForText("Initiate provider payment");
    await page.clickText("Initiate provider payment");
    await waitFor(async () => {
      const current = await api(`/payments/${payment.id}`, {}, token);
      return current.status === "CONFIRMED" || current.providerReference;
    }, 15000, "provider payment initiated");
    record("Payment provider action executes", true);

    await phase2CrudAndLifecycleSmoke(page, token, seeded, invoiceId, payment.id);

    const currentPayment = await api(`/payments/${payment.id}`, {}, token);
    await api("/webhooks/payments/sandbox", {
      method: "POST",
      headers: { "X-INVOX-Signature": "dev_payment_secret" },
      body: JSON.stringify({
        eventReference: `pay-webhook-${seeded.suffix}`,
        eventType: "payment.status",
        providerReference: currentPayment.providerReference,
        status: "sandbox_success",
      }),
    });
    await page.goto(`${WEB}/webhooks/payments`);
    await page.waitForText(`pay-webhook-${seeded.suffix}`);
    record("Payment webhook review page shows received event", true);

    await api("/webhooks/providers/einvoicing", {
      method: "POST",
      headers: { "X-INVOX-Signature": "dev_einvoicing_secret" },
      body: JSON.stringify({
        eventReference: `einvoice-webhook-${seeded.suffix}`,
        eventType: "einvoicing.status",
        invoiceId,
        status: "FAILED",
        reason: "Manual smoke failure callback",
      }),
    });
    await page.goto(`${WEB}/webhooks/providers`);
    await page.waitForText(`einvoice-webhook-${seeded.suffix}`);
    await page.waitForText("MISMATCHED");
    record("Provider callback page shows e-invoicing callback reconciliation", true);

    const providerEvents = await api("/invoices/provider-webhook-events", {}, token);
    const providerEvent = providerEvents.find((event) => event.eventReference === `einvoice-webhook-${seeded.suffix}`);
    if (providerEvent) {
      await page.goto(`${WEB}/webhooks/providers/${providerEvent.id}`);
      await page.waitForText("Provider Callback Detail");
      await page.waitForText("Retry processing");
      record("Provider callback detail renders retry control", true);
    }

    await page.goto(`${WEB}/invoices/exceptions`);
    await page.waitForText("Invoice Exceptions");
    record("Invoice exception queue renders", true);

    const logs = await api("/integrations/logs", {}, token);
    const hasExpectedLogs = logs.some((log) => ["invoice_import.json", "einvoicing.webhook_processed", "payment.webhook"].includes(log.operation));
    if (!hasExpectedLogs) throw new Error("Expected integration logs were not found");
    record("Integration logs contain import/webhook operations", true);

    await page.send("Page.captureScreenshot", { format: "png" }).then((screenshot) => {
      console.log(`Screenshot captured: ${screenshot.data.length} base64 chars`);
    });
    ws.close();
  } finally {
    chrome.kill("SIGTERM");
    await sleep(1000);
    await rm(profile, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function waitFor(predicate, timeoutMs, label) {
  const start = Date.now();
  let lastError;
  while (Date.now() - start < timeoutMs) {
    try {
      if (await predicate()) return;
    } catch (error) {
      lastError = error;
    }
    await sleep(300);
  }
  throw new Error(`Timed out waiting for ${label}${lastError ? `: ${lastError.message}` : ""}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

browserSmoke()
  .then(() => {
    const failed = results.filter((result) => !result.ok);
    console.log(`Manual browser smoke complete: ${results.length - failed.length}/${results.length} passed`);
    process.exit(failed.length ? 1 : 0);
  })
  .catch((error) => {
    record("Manual browser smoke runner", false, error.message);
    process.exit(1);
  });
