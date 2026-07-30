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

    const result = await this.executeApproval(approval);
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
      case 'VERIFY_BANK_ACCOUNT':
        return this.prisma.bankAccount.update({
          where: { id: approval.entityId },
          data: {
            verificationStatus: VerificationStatus.VERIFIED,
            isVerified: true,
            verifiedAt: new Date(),
          },
        });
      default:
        throw new BadRequestException(
          `Unsupported approval action: ${approval.action}`,
        );
    }
  }
}
