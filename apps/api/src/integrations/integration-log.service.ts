import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const sensitiveKeys = [
  'password',
  'secret',
  'token',
  'apiKey',
  'apikey',
  'accessKey',
  'accessKeyId',
  'secretAccessKey',
  'authorization',
  'credentials',
];

@Injectable()
export class IntegrationLogService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    connectionId?: string;
    providerType: string;
    providerKey?: string;
    direction: 'OUTBOUND' | 'INBOUND';
    operation: string;
    entityType?: string;
    entityId?: string;
    requestJson?: unknown;
    responseJson?: unknown;
    status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'RETRYING' | 'SKIPPED';
    statusCode?: number;
    errorMessage?: string;
    attempt?: number;
    durationMs?: number;
  }) {
    return this.prisma.integrationLog.create({
      data: {
        ...data,
        requestJson: maskSensitive(data.requestJson) as Prisma.InputJsonValue,
        responseJson: maskSensitive(data.responseJson) as Prisma.InputJsonValue,
      },
    });
  }
}

export function maskSensitive(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => maskSensitive(item));
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => {
      const lower = key.toLowerCase();
      if (
        sensitiveKeys.some((sensitive) =>
          lower.includes(sensitive.toLowerCase()),
        )
      ) {
        return [key, '[MASKED]'];
      }
      return [key, maskSensitive(item)];
    }),
  );
}
