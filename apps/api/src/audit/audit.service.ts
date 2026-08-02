import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type AuditParams = {
  actorUserId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  beforeJson?: any;
  afterJson?: any;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filters: {
    entityType?: string;
    entityId?: string;
    actorUserId?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}) {
    return this.prisma.auditLog.findMany({
      where: {
        entityType: filters.entityType,
        entityId: filters.entityId,
        actorUserId: filters.actorUserId,
        createdAt: {
          gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
          lte: filters.dateTo ? new Date(filters.dateTo) : undefined,
        },
      },
      include: {
        actorUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 250,
    });
  }

  async log(params: AuditParams) {
    return this.prisma.auditLog.create({
      data: {
        actorUserId: params.actorUserId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        beforeJson: params.beforeJson as Prisma.InputJsonValue,
        afterJson: params.afterJson as Prisma.InputJsonValue,
        reason: params.reason,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  }
}
