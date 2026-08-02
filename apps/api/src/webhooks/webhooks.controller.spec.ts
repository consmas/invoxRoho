import { HttpException, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';
import {
  assertWebhookRateLimit,
  resetWebhookRateLimitForTests,
} from './webhooks.controller';

describe('WebhooksController rate limiting', () => {
  beforeEach(() => {
    resetWebhookRateLimitForTests();
  });

  it('returns 429 after the callback rate limit is exceeded', () => {
    const request = {
      ip: '203.0.113.10',
      headers: {},
    } as Request;

    for (let index = 0; index < 120; index += 1) {
      expect(() => assertWebhookRateLimit(request, 'providers/erp')).not.toThrow();
    }

    try {
      assertWebhookRateLimit(request, 'providers/erp');
      throw new Error('Expected webhook rate limit to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  });
});
