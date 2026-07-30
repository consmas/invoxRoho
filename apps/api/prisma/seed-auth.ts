import 'dotenv/config';
import { PrismaClient, UserStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { ALL_PERMISSIONS, PERMISSIONS } from '../src/auth/permissions';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

type RoleDefinition = {
  description: string;
  permissions: string[];
};

const readOnlyRecordPermissions = [
  PERMISSIONS.counterpartyRead,
  PERMISSIONS.kycRead,
  PERMISSIONS.programmeRead,
  PERMISSIONS.creditRead,
  PERMISSIONS.exposureRead,
  PERMISSIONS.invoiceRead,
  PERMISSIONS.financingRead,
  PERMISSIONS.fundingRead,
  PERMISSIONS.paymentRead,
  PERMISSIONS.collectionRead,
  PERMISSIONS.treasuryRead,
  PERMISSIONS.ledgerRead,
  PERMISSIONS.reconciliationRead,
  PERMISSIONS.investorRead,
  PERMISSIONS.reportRead,
  PERMISSIONS.auditRead,
  PERMISSIONS.documentsRead,
  PERMISSIONS.notificationsRead,
  PERMISSIONS.integrationsLogsRead,
  PERMISSIONS.webhooksRead,
];

const relationshipOriginationPermissions = [
  PERMISSIONS.counterpartyRead,
  PERMISSIONS.counterpartyCreate,
  PERMISSIONS.counterpartyUpdate,
  PERMISSIONS.kycRead,
  PERMISSIONS.programmeRead,
  PERMISSIONS.programmeCreate,
  PERMISSIONS.programmeUpdate,
  PERMISSIONS.programmeParticipantAdd,
  PERMISSIONS.rateRead,
  PERMISSIONS.workflowRead,
  PERMISSIONS.creditRead,
  PERMISSIONS.exposureRead,
  PERMISSIONS.invoiceRead,
  PERMISSIONS.financingRead,
  PERMISSIONS.fundingRead,
  PERMISSIONS.reportRead,
];

const anchorBuyerPermissions = [
  PERMISSIONS.counterpartyRead,
  PERMISSIONS.programmeRead,
  PERMISSIONS.invoiceRead,
  PERMISSIONS.invoiceApprove,
  PERMISSIONS.financingRead,
  PERMISSIONS.paymentRead,
  PERMISSIONS.collectionRead,
  PERMISSIONS.reportRead,
];

const supplierPermissions = [
  PERMISSIONS.counterpartyRead,
  PERMISSIONS.counterpartyUpdate,
  PERMISSIONS.programmeRead,
  PERMISSIONS.invoiceRead,
  PERMISSIONS.invoiceCreate,
  PERMISSIONS.financingRead,
  PERMISSIONS.financingOfferAccept,
  PERMISSIONS.paymentRead,
  PERMISSIONS.reportRead,
];

const funderPermissions = [
  PERMISSIONS.counterpartyRead,
  PERMISSIONS.programmeRead,
  PERMISSIONS.invoiceRead,
  PERMISSIONS.financingRead,
  PERMISSIONS.fundingRead,
  PERMISSIONS.fundingAppetiteManage,
  PERMISSIONS.fundingParticipationConfirm,
  PERMISSIONS.investorRead,
  PERMISSIONS.reportRead,
  PERMISSIONS.reportExport,
];

const auditorRegulatorPermissions = [
  ...readOnlyRecordPermissions,
  PERMISSIONS.reportExport,
  PERMISSIONS.auditExport,
];

const roleDefinitions: Record<string, RoleDefinition> = {
  PLATFORM_ADMINISTRATOR: {
    description:
      'Full configuration of programmes, products, users, roles, rates, workflows and integrations.',
    permissions: ALL_PERMISSIONS,
  },
  RELATIONSHIP_ORIGINATION_MANAGER: {
    description:
      'Onboards anchors and suppliers, structures programmes and monitors origination pipeline.',
    permissions: relationshipOriginationPermissions,
  },
  CREDIT_RISK_OFFICER: {
    description:
      'Sets and approves limits, scores counterparties, approves or declines transactions and monitors exposure.',
    permissions: [
      PERMISSIONS.counterpartyRead,
      PERMISSIONS.kycRead,
      PERMISSIONS.programmeRead,
      PERMISSIONS.creditRead,
      PERMISSIONS.creditScore,
      PERMISSIONS.creditLimitSet,
      PERMISSIONS.creditApprove,
      PERMISSIONS.creditDecline,
      PERMISSIONS.exposureRead,
      PERMISSIONS.invoiceRead,
      PERMISSIONS.invoiceUpdate,
      PERMISSIONS.financingRead,
      PERMISSIONS.financingOfferGenerate,
      PERMISSIONS.fundingRead,
      PERMISSIONS.reportRead,
      PERMISSIONS.auditRead,
    ],
  },
  OPERATIONS_ANALYST: {
    description:
      'Processes invoices, resolves exceptions and manages disbursement and collection queues.',
    permissions: [
      PERMISSIONS.counterpartyRead,
      PERMISSIONS.programmeRead,
      PERMISSIONS.invoiceRead,
      PERMISSIONS.invoiceCreate,
      PERMISSIONS.invoiceUpdate,
      PERMISSIONS.invoiceExceptionResolve,
      PERMISSIONS.financingRead,
      PERMISSIONS.financingOfferGenerate,
      PERMISSIONS.paymentRead,
      PERMISSIONS.paymentApprove,
      PERMISSIONS.paymentDisburse,
      PERMISSIONS.collectionRead,
      PERMISSIONS.collectionManage,
      PERMISSIONS.reconciliationRead,
      PERMISSIONS.documentsRead,
      PERMISSIONS.documentsUpload,
      PERMISSIONS.notificationsRead,
      PERMISSIONS.reportRead,
    ],
  },
  COMPLIANCE_KYC_OFFICER: {
    description:
      'Runs KYC/KYB and AML screening, reviews alerts, files reports and maintains the audit trail.',
    permissions: [
      PERMISSIONS.counterpartyRead,
      PERMISSIONS.counterpartyUpdate,
      PERMISSIONS.kycRead,
      PERMISSIONS.kycReview,
      PERMISSIONS.kycScreen,
      PERMISSIONS.kycApprove,
      PERMISSIONS.kycReportFile,
      PERMISSIONS.bureauVerify,
      PERMISSIONS.documentsRead,
      PERMISSIONS.documentsVerify,
      PERMISSIONS.documentsReject,
      PERMISSIONS.integrationsLogsRead,
      PERMISSIONS.reportRead,
      PERMISSIONS.reportExport,
      PERMISSIONS.auditRead,
      PERMISSIONS.auditExport,
    ],
  },
  FINANCE_TREASURY: {
    description:
      'Manages funding, cash positions, GL postings, reconciliation and fee settlement.',
    permissions: [
      PERMISSIONS.programmeRead,
      PERMISSIONS.invoiceRead,
      PERMISSIONS.financingRead,
      PERMISSIONS.fundingRead,
      PERMISSIONS.fundingAllocate,
      PERMISSIONS.paymentRead,
      PERMISSIONS.paymentApprove,
      PERMISSIONS.collectionRead,
      PERMISSIONS.collectionManage,
      PERMISSIONS.treasuryRead,
      PERMISSIONS.treasuryManage,
      PERMISSIONS.ledgerRead,
      PERMISSIONS.ledgerPost,
      PERMISSIONS.reconciliationRead,
      PERMISSIONS.reconciliationManage,
      PERMISSIONS.integrationsLogsRead,
      PERMISSIONS.paymentsUpdate,
      PERMISSIONS.paymentsConfirm,
      PERMISSIONS.feeSettle,
      PERMISSIONS.reportRead,
      PERMISSIONS.reportExport,
      PERMISSIONS.auditRead,
    ],
  },
  FUND_INVESTOR_MANAGER: {
    description:
      'Manages funder allocations, capital calls, NAV and LP reporting for the SCF Fund.',
    permissions: [
      PERMISSIONS.counterpartyRead,
      PERMISSIONS.programmeRead,
      PERMISSIONS.invoiceRead,
      PERMISSIONS.financingRead,
      PERMISSIONS.fundingRead,
      PERMISSIONS.fundingAllocate,
      PERMISSIONS.fundingAppetiteManage,
      PERMISSIONS.investorRead,
      PERMISSIONS.investorManage,
      PERMISSIONS.investorReport,
      PERMISSIONS.treasuryRead,
      PERMISSIONS.reportRead,
      PERMISSIONS.reportSchedule,
      PERMISSIONS.reportExport,
      PERMISSIONS.auditRead,
    ],
  },
  ANCHOR_BUYER_USER: {
    description:
      'Approves payables, views programme dashboards and monitors financed payables and settlement obligations.',
    permissions: anchorBuyerPermissions,
  },
  SUPPLIER_USER: {
    description:
      'Enrols, uploads and views invoices, accepts early payment and views financing and settlement status.',
    permissions: supplierPermissions,
  },
  FUNDER_USER: {
    description:
      'Views fundable assets, sets appetite, confirms participation and monitors returns.',
    permissions: funderPermissions,
  },
  AUDITOR_REGULATOR_READ_ONLY: {
    description:
      'Time-boxed read-only access to records, audit trails and reports.',
    permissions: auditorRegulatorPermissions,
  },
  SYSTEM_INTEGRATION_ACTOR: {
    description:
      'API and service accounts for ERP, banking, bureau, e-invoicing and messaging integrations.',
    permissions: [
      PERMISSIONS.integrationRead,
      PERMISSIONS.integrationExecute,
      PERMISSIONS.counterpartyRead,
      PERMISSIONS.counterpartyCreate,
      PERMISSIONS.counterpartyUpdate,
      PERMISSIONS.programmeRead,
      PERMISSIONS.invoiceRead,
      PERMISSIONS.invoiceCreate,
      PERMISSIONS.invoiceUpdate,
      PERMISSIONS.invoiceApprove,
      PERMISSIONS.financingRead,
      PERMISSIONS.paymentRead,
      PERMISSIONS.paymentDisburse,
      PERMISSIONS.collectionRead,
      PERMISSIONS.bureauVerify,
      PERMISSIONS.einvoiceSubmit,
      PERMISSIONS.messagingSend,
      PERMISSIONS.integrationsRead,
      PERMISSIONS.integrationsCreate,
      PERMISSIONS.integrationsUpdate,
      PERMISSIONS.integrationsTest,
      PERMISSIONS.integrationsLogsRead,
      PERMISSIONS.webhooksRead,
      PERMISSIONS.webhooksCreate,
      PERMISSIONS.webhooksRetry,
    ],
  },
  PLATFORM_ADMIN: {
    description: 'Legacy alias for platform administrator.',
    permissions: ALL_PERMISSIONS,
  },
  RELATIONSHIP_MANAGER: {
    description: 'Legacy alias for relationship / origination manager.',
    permissions: relationshipOriginationPermissions,
  },
  ANCHOR_USER: {
    description: 'Legacy alias for anchor / buyer user.',
    permissions: anchorBuyerPermissions,
  },
  AUDITOR_READ_ONLY: {
    description: 'Legacy alias for auditor / regulator read-only.',
    permissions: auditorRegulatorPermissions,
  },
};

Object.assign(roleDefinitions, {
  PLATFORM_ADMIN: {
    description: 'Full platform administrator with all permissions.',
    permissions: ALL_PERMISSIONS,
  },
  RELATIONSHIP_MANAGER: {
    description:
      'Creates counterparties and programmes and manages origination workflow.',
    permissions: [
      PERMISSIONS.counterpartiesRead,
      PERMISSIONS.counterpartiesCreate,
      PERMISSIONS.counterpartiesUpdate,
      PERMISSIONS.programmesRead,
      PERMISSIONS.programmesCreate,
      PERMISSIONS.programmesUpdate,
      PERMISSIONS.invoicesRead,
      PERMISSIONS.financingReadV2,
      PERMISSIONS.reportsRead,
      PERMISSIONS.workflowReadV2,
      PERMISSIONS.workflowCreate,
    ],
  },
  COMPLIANCE_OFFICER: {
    description: 'KYC/KYB approver with audit and document access.',
    permissions: [
      PERMISSIONS.counterpartiesRead,
      PERMISSIONS.counterpartiesUpdate,
      PERMISSIONS.counterpartiesApproveKyc,
      PERMISSIONS.counterpartiesRejectKyc,
      PERMISSIONS.documentsRead,
      PERMISSIONS.documentsUpdate,
      PERMISSIONS.documentsVerify,
      PERMISSIONS.documentsReject,
      PERMISSIONS.integrationsLogsRead,
      PERMISSIONS.workflowReadV2,
      PERMISSIONS.workflowComplete,
      PERMISSIONS.auditReadV2,
      PERMISSIONS.reportsRead,
    ],
  },
  CREDIT_RISK_OFFICER: {
    description: 'Credit and programme approver.',
    permissions: [
      PERMISSIONS.counterpartiesRead,
      PERMISSIONS.programmesRead,
      PERMISSIONS.programmesApprove,
      PERMISSIONS.invoicesRead,
      PERMISSIONS.financingReadV2,
      PERMISSIONS.financingAllocateFunding,
      PERMISSIONS.reportsRead,
      PERMISSIONS.workflowReadV2,
      PERMISSIONS.workflowComplete,
      PERMISSIONS.auditReadV2,
    ],
  },
  OPERATIONS_ANALYST: {
    description: 'Invoice processing and operational workflow user.',
    permissions: [
      PERMISSIONS.counterpartiesRead,
      PERMISSIONS.programmesRead,
      PERMISSIONS.invoicesRead,
      PERMISSIONS.invoicesCreate,
      PERMISSIONS.invoicesUpdate,
      PERMISSIONS.invoicesValidate,
      PERMISSIONS.invoicesDispute,
      PERMISSIONS.documentsRead,
      PERMISSIONS.documentsCreate,
      PERMISSIONS.documentsUpload,
      PERMISSIONS.notificationsRead,
      PERMISSIONS.workflowReadV2,
      PERMISSIONS.workflowCreate,
      PERMISSIONS.reportsRead,
    ],
  },
  FINANCE_TREASURY: {
    description: 'Finance, payments, collections and treasury operations.',
    permissions: [
      PERMISSIONS.financingReadV2,
      PERMISSIONS.financingScheduleDisbursement,
      PERMISSIONS.financingMarkDisbursed,
      PERMISSIONS.financingMarkCollected,
      PERMISSIONS.financingClose,
      PERMISSIONS.paymentsReadV2,
      PERMISSIONS.paymentsCreate,
      PERMISSIONS.paymentsUpdate,
      PERMISSIONS.paymentsConfirm,
      PERMISSIONS.paymentsFail,
      PERMISSIONS.collectionsReadV2,
      PERMISSIONS.collectionsCreate,
      PERMISSIONS.collectionsConfirm,
      PERMISSIONS.reportsRead,
      PERMISSIONS.auditReadV2,
      PERMISSIONS.integrationsLogsRead,
    ],
  },
  ANCHOR_USER: {
    description: 'Anchor buyer user for payable approvals and reports.',
    permissions: [
      PERMISSIONS.counterpartiesRead,
      PERMISSIONS.programmesRead,
      PERMISSIONS.invoicesRead,
      PERMISSIONS.invoicesApprove,
      PERMISSIONS.documentsRead,
      PERMISSIONS.reportsRead,
    ],
  },
  SUPPLIER_USER: {
    description: 'Supplier user for invoices and early payment acceptance.',
    permissions: [
      PERMISSIONS.counterpartiesRead,
      PERMISSIONS.programmesRead,
      PERMISSIONS.invoicesRead,
      PERMISSIONS.financingReadV2,
      PERMISSIONS.financingAccept,
      PERMISSIONS.financingReject,
      PERMISSIONS.documentsRead,
    ],
  },
  FUNDER_USER: {
    description: 'Funder user for financeable assets and reports.',
    permissions: [
      PERMISSIONS.programmesRead,
      PERMISSIONS.financingReadV2,
      PERMISSIONS.reportsRead,
      PERMISSIONS.documentsRead,
    ],
  },
  AUDITOR_READ_ONLY: {
    description: 'Read-only audit and reporting user.',
    permissions: [
      PERMISSIONS.counterpartiesRead,
      PERMISSIONS.programmesRead,
      PERMISSIONS.invoicesRead,
      PERMISSIONS.financingReadV2,
      PERMISSIONS.paymentsReadV2,
      PERMISSIONS.collectionsReadV2,
      PERMISSIONS.documentsRead,
      PERMISSIONS.notificationsRead,
      PERMISSIONS.integrationsLogsRead,
      PERMISSIONS.webhooksRead,
      PERMISSIONS.workflowReadV2,
      PERMISSIONS.reportsRead,
      PERMISSIONS.auditReadV2,
    ],
  },
} satisfies Record<string, RoleDefinition>);

async function syncRolePermissions(roleId: string, permissionKeys: string[]) {
  const uniquePermissionKeys = Array.from(new Set(permissionKeys));
  const permissions = await prisma.permission.findMany({
    where: { key: { in: uniquePermissionKeys } },
  });
  const permissionIds = permissions.map((permission) => permission.id);

  await prisma.rolePermission.deleteMany({
    where: {
      roleId,
      permissionId: { notIn: permissionIds },
    },
  });

  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId,
        permissionId: permission.id,
      },
    });
  }
}

async function main() {
  for (const permission of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: permission },
      update: {
        description: permission,
      },
      create: {
        key: permission,
        description: permission,
      },
    });
  }

  for (const [roleName, definition] of Object.entries(roleDefinitions)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {
        description: definition.description,
      },
      create: {
        name: roleName,
        description: definition.description,
      },
    });

    await syncRolePermissions(role.id, definition.permissions);
  }

  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@invox.local';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@12345';
  const passwordHash = await bcrypt.hash(password, 12);
  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { name: 'PLATFORM_ADMIN' },
  });

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      status: UserStatus.ACTIVE,
      passwordChangedAt: new Date(),
    },
    create: {
      email,
      passwordHash,
      firstName: 'Platform',
      lastName: 'Admin',
      status: UserStatus.ACTIVE,
      passwordChangedAt: new Date(),
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: adminRole.id,
    },
  });

  console.log('Seeded INVOX auth, RBAC roles, permissions and admin user.');
  console.log(`Development admin email: ${email}`);
  console.log(`Development admin password: ${password}`);
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
