import 'dotenv/config';
import { PrismaClient, UserStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const demoPassword = process.env.DEMO_USER_PASSWORD ?? 'Demo@12345';

async function user(email: string, roleName: string, firstName: string, lastName: string) {
  const passwordHash = await bcrypt.hash(demoPassword, 12);
  const row = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, status: UserStatus.ACTIVE },
    create: { email, passwordHash, status: UserStatus.ACTIVE, firstName, lastName },
  });
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (role) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: row.id, roleId: role.id } },
      update: {},
      create: { userId: row.id, roleId: role.id },
    });
  }
  return row;
}

async function counterparty(type: 'ANCHOR' | 'SUPPLIER' | 'FUNDER', legalName: string) {
  const existing = await prisma.counterparty.findFirst({ where: { legalName, type } });
  if (existing) return existing;
  return prisma.counterparty.create({
    data: {
      type,
      legalName,
      registrationNumber: legalName.replace(/\W+/g, '-').toUpperCase(),
      tin: `TIN-${legalName.replace(/\W+/g, '-').toUpperCase()}`,
      country: 'GH',
      onboardingStatus: 'APPROVED',
      onboardingProgress: 100,
      kybStatus: 'VERIFIED',
      registryVerificationStatus: 'VERIFIED',
      sanctionsScreeningStatus: 'CLEAR',
      pepScreeningStatus: 'CLEAR',
      adverseMediaScreeningStatus: 'CLEAR',
      approvedAt: new Date(),
    },
  });
}

async function main() {
  const admin =
    (await prisma.user.findUnique({ where: { email: 'admin@invox.local' } })) ??
    (await user('admin@invox.local', 'PLATFORM_ADMIN', 'Platform', 'Admin'));
  await user('relationship.manager@invox.local', 'RELATIONSHIP_MANAGER', 'Relationship', 'Manager');
  await user('compliance.officer@invox.local', 'COMPLIANCE_OFFICER', 'Compliance', 'Officer');
  await user('credit.risk@invox.local', 'CREDIT_RISK_OFFICER', 'Credit', 'Risk');
  await user('finance.treasury@invox.local', 'FINANCE_TREASURY', 'Finance', 'Treasury');
  await user('anchor.user@invox.local', 'ANCHOR_USER', 'Anchor', 'User');
  await user('supplier.user@invox.local', 'SUPPLIER_USER', 'Supplier', 'User');
  await user('funder.user@invox.local', 'FUNDER_USER', 'Funder', 'User');
  await user('auditor@invox.local', 'AUDITOR_READ_ONLY', 'Auditor', 'ReadOnly');

  const anchor = await counterparty('ANCHOR', 'CIPA Holdings Group');
  const supplier = await counterparty('SUPPLIER', 'Demo Supplier Ltd');
  const funder = await counterparty('FUNDER', 'Syndicate SCF Fund');

  const programme = await prisma.programme.upsert({
    where: { code: 'CIPA-SCF-DEMO' },
    update: {
      status: 'ACTIVE',
      anchorId: anchor.id,
      programmeLimit: '1000000',
      anchorLimit: '1000000',
      supplierLimit: '500000',
      funderLimit: '1000000',
    },
    create: {
      name: 'CIPA Supplier Finance Programme',
      code: 'CIPA-SCF-DEMO',
      anchorId: anchor.id,
      currency: 'GHS',
      status: 'ACTIVE',
      annualDiscountRate: '0.18',
      maxTenorDays: 90,
      minimumInvoiceAmount: '1000',
      maximumInvoiceAmount: '500000',
      programmeLimit: '1000000',
      anchorLimit: '1000000',
      supplierLimit: '500000',
      funderLimit: '1000000',
      platformFeeFlat: '0',
      platformFeePercent: '0.01',
      arrangementFeeFlat: '0',
      servicingFeePercent: '0',
      approvalWorkflow: { steps: ['relationship', 'credit', 'operations'] },
      requiredDocuments: ['Programme agreement', 'Board resolution'],
      publishedAt: new Date(),
    },
  });

  for (const [counterpartyId, participantType] of [
    [supplier.id, 'SUPPLIER'],
    [funder.id, 'FUNDER'],
  ] as const) {
    await prisma.programmeParticipant.upsert({
      where: {
        programmeId_counterpartyId_participantType: {
          programmeId: programme.id,
          counterpartyId,
          participantType,
        },
      },
      update: { isActive: true },
      create: { programmeId: programme.id, counterpartyId, participantType, isActive: true },
    });
  }

  for (const [scope, counterpartyId, amount] of [
    ['PROGRAMME', null, '1000000'],
    ['ANCHOR', anchor.id, '1000000'],
    ['SUPPLIER', supplier.id, '500000'],
    ['FUNDER', funder.id, '1000000'],
  ] as const) {
    const existing = await prisma.limitRecord.findFirst({
      where: { programmeId: programme.id, counterpartyId, scope, currency: 'GHS' },
    });
    if (existing) {
      await prisma.limitRecord.update({
        where: { id: existing.id },
        data: { limitAmount: amount, availableAmount: amount, status: 'ACTIVE' },
      });
    } else {
      await prisma.limitRecord.create({
        data: { programmeId: programme.id, counterpartyId, scope, currency: 'GHS', limitAmount: amount, availableAmount: amount },
      });
    }
  }

  const existingInvoice = await prisma.invoice.findUnique({
    where: {
      buyerId_supplierId_invoiceNumber: {
        buyerId: anchor.id,
        supplierId: supplier.id,
        invoiceNumber: 'INV-DEMO-001',
      },
    },
  });
  const invoice = existingInvoice
    ? await prisma.invoice.update({
        where: { id: existingInvoice.id },
        data: { status: 'APPROVED', amount: '100000', financeableAmount: '100000' },
      })
    : await prisma.invoice.create({
        data: {
          programmeId: programme.id,
          buyerId: anchor.id,
          supplierId: supplier.id,
          invoiceNumber: 'INV-DEMO-001',
          currency: 'GHS',
          amount: '100000',
          financeableAmount: '100000',
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'APPROVED',
          buyerApprovedAt: new Date(),
          description: 'Demo approved payable invoice',
        },
      });

  await prisma.documentRecord.create({
    data: {
      counterpartyId: anchor.id,
      documentType: 'KYB_PACK',
      title: 'Demo KYB pack',
      fileName: 'demo-kyb-pack.pdf',
      originalFileName: 'demo-kyb-pack.pdf',
      fileKey: 'demo/demo-kyb-pack.pdf',
      fileUrl: 'local://demo/demo-kyb-pack.pdf',
      storageProvider: 'local',
      status: 'VERIFIED',
      uploadedById: admin.id,
      verifiedById: admin.id,
      verifiedAt: new Date(),
    },
  });

  await prisma.approvalRequest.create({
    data: {
      entityType: 'Invoice',
      entityId: invoice.id,
      action: 'APPROVE_INVOICE',
      status: 'APPROVED',
      requestedById: admin.id,
      approvedById: admin.id,
      approvedAt: new Date(),
      requestPayload: { demo: true },
    },
  });

  await prisma.notificationLog.create({
    data: {
      channel: 'EMAIL',
      recipient: 'demo@invox.local',
      subject: 'Demo data ready',
      message: 'INVOX demo dataset has been seeded.',
      templateKey: 'demo.ready',
      status: 'SENT',
      sentAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: admin.id,
      action: 'CREATE',
      entityType: 'DemoSeed',
      entityId: programme.id,
      afterJson: { programmeId: programme.id, invoiceId: invoice.id },
      reason: 'Demo data seeded',
    },
  });

  console.log('Seeded Release 1 demo data.');
  console.log(`Demo password for all demo users: ${demoPassword}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
