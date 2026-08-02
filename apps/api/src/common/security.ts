import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

const rateLimitBuckets = new Map<string, number[]>();

export function securityHeadersMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()',
  );
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  if (process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );
  }
  next();
}

export function requestIp(request: Request | undefined) {
  const forwarded = request?.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return request?.ip ?? 'unknown';
}

export function assertRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
  message?: string;
}) {
  const now = Date.now();
  const recent = (rateLimitBuckets.get(input.key) ?? []).filter(
    (timestamp) => now - timestamp < input.windowMs,
  );
  if (recent.length >= input.limit) {
    throw new HttpException(
      input.message ?? 'Rate limit exceeded',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
  recent.push(now);
  rateLimitBuckets.set(input.key, recent);
}

export function resetRateLimitsForTests() {
  rateLimitBuckets.clear();
}

export function verifyWebhookSignature(input: {
  payload: unknown;
  secret: string;
  signature?: string;
  allowPlaintextSecret?: boolean;
}) {
  if (!input.signature || !input.secret) return false;
  const provided = input.signature.trim();
  const body = stablePayload(input.payload);
  const expectedHex = createHmac('sha256', input.secret)
    .update(body)
    .digest('hex');
  const expected = `sha256=${expectedHex}`;
  if (safeEqual(provided, expected) || safeEqual(provided, expectedHex)) {
    return true;
  }
  return Boolean(input.allowPlaintextSecret && safeEqual(provided, input.secret));
}

export function assertSafeRedirectUrl(url: string, fallbackOrigin: string) {
  try {
    const parsed = new URL(url);
    const fallback = new URL(fallbackOrigin);
    if (parsed.origin !== fallback.origin) {
      throw new BadRequestException('Redirect URL origin is not allowed');
    }
    return parsed.toString();
  } catch (error) {
    if (error instanceof BadRequestException) throw error;
    throw new BadRequestException('Redirect URL is invalid');
  }
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function stablePayload(payload: unknown) {
  return JSON.stringify(sortJson(payload));
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value as Record<string, unknown>)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = sortJson((value as Record<string, unknown>)[key]);
      return acc;
    }, {});
}
