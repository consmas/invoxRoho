import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { maskSensitive } from './integration-log.service';
import {
  CreateIntegrationConnectionDto,
  UpdateIntegrationConnectionDto,
} from './dto/integration-connection.dto';

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findConnections() {
    const rows = await this.prisma.integrationConnection.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(sanitizeConnection);
  }

  async findConnection(id: string) {
    const row = await this.prisma.integrationConnection.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException('Integration connection not found');
    return sanitizeConnection(row);
  }

  async createConnection(
    dto: CreateIntegrationConnectionDto,
    actorUserId?: string,
  ) {
    const row = await this.prisma.integrationConnection.create({
      data: {
        ...dto,
        systemType: dto.providerType,
        status: 'DISABLED',
        environment: dto.environment ?? 'SANDBOX',
        credentialsJson: dto.credentialsJson as Prisma.InputJsonValue,
        configJson: dto.configJson as Prisma.InputJsonValue,
        createdById: actorUserId,
      },
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.CREATE,
      entityType: 'IntegrationConnection',
      entityId: row.id,
      afterJson: sanitizeConnection(row),
    });
    return sanitizeConnection(row);
  }

  async updateConnection(
    id: string,
    dto: UpdateIntegrationConnectionDto,
    actorUserId?: string,
  ) {
    const before = await this.prisma.integrationConnection.findUnique({
      where: { id },
    });
    if (!before)
      throw new NotFoundException('Integration connection not found');
    const row = await this.prisma.integrationConnection.update({
      where: { id },
      data: {
        ...dto,
        systemType: dto.providerType,
        credentialsJson: dto.credentialsJson as Prisma.InputJsonValue,
        configJson: dto.configJson as Prisma.InputJsonValue,
      },
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'IntegrationConnection',
      entityId: id,
      beforeJson: sanitizeConnection(before),
      afterJson: sanitizeConnection(row),
    });
    return sanitizeConnection(row);
  }

  async setStatus(
    id: string,
    status: 'ENABLED' | 'DISABLED',
    actorUserId?: string,
  ) {
    const row = await this.prisma.integrationConnection.update({
      where: { id },
      data: { status },
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'IntegrationConnection',
      entityId: id,
      afterJson: sanitizeConnection(row),
      reason: `Integration ${status.toLowerCase()}`,
    });
    return sanitizeConnection(row);
  }

  async testConnection(id: string, actorUserId?: string) {
    const before = await this.prisma.integrationConnection.findUnique({
      where: { id },
    });
    if (!before)
      throw new NotFoundException('Integration connection not found');
    if (
      !['SANDBOX', 'DEV', 'TEST'].includes(before.environment.toUpperCase())
    ) {
      throw new BadRequestException(
        'Only sandbox-like connections can be tested without a real provider',
      );
    }
    const row = await this.prisma.integrationConnection.update({
      where: { id },
      data: {
        status: 'ENABLED',
        lastTestedAt: new Date(),
        lastSuccessfulAt: new Date(),
        failureReason: null,
      },
    });
    await this.prisma.integrationLog.create({
      data: {
        connectionId: id,
        providerType: row.providerType,
        providerKey: row.providerKey,
        direction: 'OUTBOUND',
        operation: 'connection.test',
        requestJson: maskSensitive({
          providerType: row.providerType,
          providerKey: row.providerKey,
        }) as Prisma.InputJsonValue,
        responseJson: { ok: true, mode: 'mock' },
        status: 'SUCCESS',
      },
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'IntegrationConnection',
      entityId: id,
      afterJson: sanitizeConnection(row),
      reason: 'Integration connection tested',
    });
    return { ok: true, connection: sanitizeConnection(row) };
  }

  findLogs() {
    return this.prisma.integrationLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async findLog(id: string) {
    const row = await this.prisma.integrationLog.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Integration log not found');
    return row;
  }
}

export function sanitizeConnection(row: {
  credentialsJson?: Prisma.JsonValue | null;
  [key: string]: unknown;
}) {
  const { credentialsJson: _credentialsJson, ...safe } = row;
  return {
    ...safe,
    hasCredentials: Boolean(_credentialsJson),
  };
}
