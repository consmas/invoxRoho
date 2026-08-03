import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  FinancingStatus,
  InvoiceStatus,
  LedgerEntryType,
  LimitScope,
  OnboardingStatus,
  PaymentStatus,
  Prisma,
  ProgrammeStatus,
  VerificationStatus,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApprovalDto } from './dto/create-approval.dto';
import {
  ApproveRequestDto,
  RejectRequestDto,
} from './dto/decision-approval.dto';

const PENDING = 'PENDING';
const APPROVED = 'APPROVED';
const REJECTED = 'REJECTED';
const CANCELLED = 'CANCELLED';

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  findAll() {
    return this.prisma.approvalRequest.findMany({
      orderBy: { requestedAt: 'desc' },
    });
  }

  findPending() {
    return this.prisma.approvalRequest.findMany({
      where: { status: PENDING },
      orderBy: { requestedAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const approval = await this.prisma.approvalRequest.findUnique({
      where: { id },
    });
    if (!approval) {
      throw new NotFoundException('Approval request not found');
    }
    return approval;
  }

  async create(dto: CreateApprovalDto, user: AuthenticatedUser) {
    const approval = await this.prisma.approvalRequest.create({
      data: {
        entityType: dto.entityType,
        entityId: dto.entityId,
        action: dto.action,
        requestedById: user.id,
        requestPayload: dto.requestPayload as Prisma.InputJsonValue,
      },
    });
    await this.audit.log({
      actorUserId: user.id,
      action: AuditAction.CREATE,
      entityType: 'ApprovalRequest',
      entityId: approval.id,
      afterJson: approval,
      reason: `Requested ${dto.action} for ${dto.entityType}:${dto.entityId}`,
    });
    await this.notifyApproval('approval.requested', approval, user.id, {
      userName: user.email,
      actionUrl: `http://localhost:3000/approvals/${approval.id}`,
      entityName: `${dto.entityType}:${dto.entityId}`,
      status: approval.status,
    });
    return approval;
  }

  async approve(id: string, dto: ApproveRequestDto, user: AuthenticatedUser) {
    const approval = await this.findOne(id);
    if (approval.status !== PENDING) {
      throw new BadRequestException('Only pending approvals can be approved');
    }
    if (approval.requestedById === user.id) {
      throw new ForbiddenException('Requester cannot approve own request');
    }

    const result = await this.executeApproval(approval, user);
    const updated = await this.prisma.approvalRequest.update({
      where: { id },
      data: {
        status: APPROVED,
        approvedById: user.id,
        approvalComment: dto.comment,
        approvedAt: new Date(),
      },
    });
    await this.audit.log({
      actorUserId: user.id,
      action: AuditAction.APPROVE,
      entityType: 'ApprovalRequest',
      entityId: id,
      beforeJson: approval,
      afterJson: { approval: updated, result },
      reason: dto.comment,
    });
    await this.notifyApproval('approval.approved', updated, user.id, {
      entityName: `${updated.entityType}:${updated.entityId}`,
      status: updated.status,
      reason: dto.comment ?? 'Approved',
    });
    return { approval: updated, result };
  }

  async reject(id: string, dto: RejectRequestDto, user: AuthenticatedUser) {
    const approval = await this.findOne(id);
    if (approval.status !== PENDING) {
      throw new BadRequestException('Only pending approvals can be rejected');
    }
    const updated = await this.prisma.approvalRequest.update({
      where: { id },
      data: {
        status: REJECTED,
        rejectedById: user.id,
        rejectionReason: dto.reason,
        rejectedAt: new Date(),
      },
    });
    await this.audit.log({
      actorUserId: user.id,
      action: AuditAction.REJECT,
      entityType: 'ApprovalRequest',
      entityId: id,
      beforeJson: approval,
      afterJson: updated,
      reason: dto.reason,
    });
    await this.notifyApproval('approval.rejected', updated, user.id, {
      entityName: `${updated.entityType}:${updated.entityId}`,
      status: updated.status,
      reason: dto.reason,
    });
    return updated;
  }

  private async notifyApproval(
    templateKey: string,
    approval: { requestedById: string; entityType: string; entityId: string },
    fallbackUserId: string,
    variables: Record<string, unknown>,
  ) {
    const recipient = await this.prisma.user.findUnique({
      where: { id: approval.requestedById || fallbackUserId },
      select: { email: true },
    });
    await this.notifications
      .createLifecycleEmail(templateKey, recipient?.email, variables)
      .catch(() => undefined);
  }

  async cancel(id: string, user: AuthenticatedUser) {
    const approval = await this.findOne(id);
    if (approval.status !== PENDING) {
      throw new BadRequestException('Only pending approvals can be cancelled');
    }
    const updated = await this.prisma.approvalRequest.update({
      where: { id },
      data: { status: CANCELLED },
    });
    await this.audit.log({
      actorUserId: user.id,
      action: AuditAction.UPDATE,
      entityType: 'ApprovalRequest',
      entityId: id,
      beforeJson: approval,
      afterJson: updated,
      reason: 'Approval request cancelled',
    });
    return updated;
  }

  private executeApproval(
    approval: Awaited<ReturnType<ApprovalsService['findOne']>>,
    user: AuthenticatedUser,
  ) {
    switch (approval.action) {
      case 'KYC_APPROVAL':
      case 'APPROVE_KYC':
        return this.prisma.counterparty.update({
          where: { id: approval.entityId },
          data: {
            onboardingStatus: OnboardingStatus.APPROVED,
            onboardingProgress: 100,
            approvedAt: new Date(),
          },
        });
      case 'PROGRAMME_APPROVAL':
      case 'APPROVE_PROGRAMME':
        return this.prisma.programme.update({
          where: { id: approval.entityId },
          data: { status: ProgrammeStatus.ACTIVE, publishedAt: new Date() },
        });
      case 'INVOICE_APPROVAL':
      case 'APPROVE_INVOICE':
        return this.prisma.invoice.update({
          where: { id: approval.entityId },
          data: { status: InvoiceStatus.APPROVED, buyerApprovedAt: new Date() },
        });
      case 'FUNDING_ALLOCATION':
      case 'ALLOCATE_FUNDING':
        return this.prisma.financingTransaction.update({
          where: { id: approval.entityId },
          data: { status: FinancingStatus.FUNDED, fundedAt: new Date() },
        });
      case 'MARK_DISBURSED':
        return this.prisma.$transaction(async (tx) => {
          const transaction = await tx.financingTransaction.update({
            where: { id: approval.entityId },
            data: {
              status: FinancingStatus.DISBURSED,
              disbursedAt: new Date(),
            },
          });
          await tx.payment.updateMany({
            where: {
              financingTransactionId: approval.entityId,
              direction: 'OUTBOUND',
            },
            data: { status: PaymentStatus.CONFIRMED, confirmedAt: new Date() },
          });
          return transaction;
        });
      case 'MARK_COLLECTED':
        return this.prisma.financingTransaction.update({
          where: { id: approval.entityId },
          data: { status: FinancingStatus.COLLECTED, collectedAt: new Date() },
        });
      case 'CLOSE_FINANCING':
        return this.prisma.financingTransaction.update({
          where: { id: approval.entityId },
          data: { status: FinancingStatus.CLOSED },
        });
      case 'PRODUCT_ACTION':
        return this.executeProductApproval(approval);
      case 'VERIFY_BANK_ACCOUNT':
        return this.prisma.bankAccount.update({
          where: { id: approval.entityId },
          data: {
            verificationStatus: VerificationStatus.VERIFIED,
            isVerified: true,
            verifiedAt: new Date(),
          },
        });
      case 'PAYMENT_APPROVAL':
      case 'APPROVE_PAYMENT':
        return this.prisma.payment.update({
          where: { id: approval.entityId },
          data: {
            approvedById: user.id,
            approvedAt: new Date(),
          },
        });
      default:
        throw new BadRequestException(
          `Unsupported approval action: ${approval.action}`,
        );
    }
  }

  private executeProductApproval(
    approval: Awaited<ReturnType<ApprovalsService['findOne']>>,
  ) {
    const payload = approval.requestPayload as {
      resource?: string;
      action?: string;
    } | null;
    const resource = payload?.resource;
    const action = payload?.action;
    if (!resource || !action) {
      throw new BadRequestException('Product approval payload is invalid');
    }
    return this.prisma.$transaction(async (tx) => {
      switch (resource) {
        case 'dynamic-discounting-offers': {
          const current = await tx.dynamicDiscountingOffer.findUniqueOrThrow({
            where: { id: approval.entityId },
          });
          const patch =
            action === 'accept'
              ? { status: 'ACCEPTED', acceptedAt: new Date() }
              : action === 'settle'
                ? { status: 'SETTLED' }
                : action === 'cancel'
                  ? { status: 'CANCELLED' }
                  : undefined;
          if (!patch) throw new BadRequestException(`Unsupported product action: ${action}`);
          const row = await tx.dynamicDiscountingOffer.update({
            where: { id: approval.entityId },
            data: patch,
          });
          if (action === 'settle') {
            await postApprovalLedger(tx, row.currency, [
              ['5100', 'Dynamic discount expense', LedgerEntryType.DEBIT, current.discountAmount],
              ['1000', 'Cash settlement', LedgerEntryType.CREDIT, current.discountAmount],
            ]);
          }
          return row;
        }
        case 'receivables-facilities': {
          const row = await tx.receivablesFacility.update({
            where: { id: approval.entityId },
            data: productStatusPatch(action, {
              approve: 'APPROVED',
              activate: 'ACTIVE',
              suspend: 'SUSPENDED',
              close: 'CLOSED',
            }),
          });
          if (action === 'activate') {
            await tx.limitRecord.create({
              data: {
                scope: LimitScope.SUPPLIER,
                programmeId: row.programmeId,
                counterpartyId: row.supplierId,
                currency: row.currency,
                limitAmount: row.facilityLimit,
                availableAmount: new Prisma.Decimal(row.facilityLimit).minus(
                  row.utilisedAmount,
                ),
                covenantJson: { source: 'product_approval_activation' },
              },
            });
            await tx.exposureSnapshot.create({
              data: {
                scope: LimitScope.SUPPLIER,
                programmeId: row.programmeId,
                counterpartyId: row.supplierId,
                currency: row.currency,
                exposureAmount: row.utilisedAmount,
                sourceJson: { source: 'product_approval_activation' },
              },
            });
          }
          return row;
        }
        case 'funder-marketplace-bids': {
          const row = await tx.funderMarketplaceBid.update({
            where: { id: approval.entityId },
            data:
              action === 'confirm'
                ? { participationStatus: 'CONFIRMED', confirmedAt: new Date() }
                : productStatusPatch(action, {
                    allocate: 'ALLOCATED',
                    withdraw: 'WITHDRAWN',
                  }, 'participationStatus'),
          });
          if (action === 'allocate') {
            await postApprovalLedger(tx, row.currency, [
              ['1200', 'Marketplace funded asset', LedgerEntryType.DEBIT, row.offeredAmount],
              ['2200', 'Marketplace funder allocation payable', LedgerEntryType.CREDIT, row.offeredAmount],
            ]);
          }
          return row;
        }
        case 'esg-scorecards':
          return tx.esgScorecard.update({
            where: { id: approval.entityId },
            data: productStatusPatch(action, {
              review: 'UNDER_REVIEW',
              activate: 'ACTIVE',
              expire: 'EXPIRED',
            }),
          });
        default:
          throw new BadRequestException(`Unsupported product resource: ${resource}`);
      }
    });
  }
}

function productStatusPatch(
  action: string,
  states: Record<string, string>,
  field = 'status',
) {
  const status = states[action];
  if (!status) throw new BadRequestException(`Unsupported product action: ${action}`);
  return { [field]: status };
}

async function postApprovalLedger(
  tx: Prisma.TransactionClient,
  currency: string,
  entries: [string, string, LedgerEntryType, unknown][],
) {
  const totals = entries.reduce(
    (acc, [, , type, amount]) => {
      const value = new Prisma.Decimal(String(amount));
      if (type === LedgerEntryType.DEBIT) acc.debits = acc.debits.plus(value);
      else acc.credits = acc.credits.plus(value);
      return acc;
    },
    { debits: new Prisma.Decimal(0), credits: new Prisma.Decimal(0) },
  );
  if (!totals.debits.equals(totals.credits)) {
    throw new BadRequestException('Approval ledger posting is not balanced');
  }
  for (const [code, name, entryType, amount] of entries) {
    const account = await tx.ledgerAccount.upsert({
      where: { code },
      update: {},
      create: { code, name, currency },
    });
    await tx.ledgerEntry.create({
      data: {
        accountId: account.id,
        entryType,
        amount: String(amount),
        currency,
        description: name,
      },
    });
  }
}
