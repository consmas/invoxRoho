import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestContextMiddleware.name);

  use(
    req: Request & { requestId?: string },
    res: Response,
    next: NextFunction,
  ) {
    const inboundRequestId =
      typeof req.headers['x-request-id'] === 'string'
        ? req.headers['x-request-id']
        : '';
    const requestId = /^[A-Za-z0-9._:-]{1,80}$/.test(inboundRequestId)
      ? inboundRequestId
      : randomUUID();
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);

    const started = Date.now();
    res.on('finish', () => {
      this.logger.log(
        JSON.stringify({
          requestId,
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          durationMs: Date.now() - started,
        }),
      );
    });
    next();
  }
}
