import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { createHmac } from 'crypto';
import { GlobalExceptionFilter } from './global-exception.filter';
import { RequestContextMiddleware } from './request-context.middleware';
import {
  assertRateLimit,
  resetRateLimitsForTests,
  verifyWebhookSignature,
} from './security';

describe('security controls', () => {
  beforeEach(() => resetRateLimitsForTests());

  it('verifies HMAC webhook signatures and rejects plaintext secrets in production mode', () => {
    const payload = { b: 2, a: 1 };
    const secret = 'strong-webhook-secret';
    const signature = `sha256=${createHmac('sha256', secret)
      .update(JSON.stringify({ a: 1, b: 2 }))
      .digest('hex')}`;

    expect(
      verifyWebhookSignature({ payload, secret, signature }),
    ).toBe(true);
    expect(
      verifyWebhookSignature({
        payload,
        secret,
        signature: secret,
        allowPlaintextSecret: false,
      }),
    ).toBe(false);
    expect(
      verifyWebhookSignature({
        payload,
        secret,
        signature: secret,
        allowPlaintextSecret: true,
      }),
    ).toBe(true);
  });

  it('enforces fixed-window rate limits', () => {
    assertRateLimit({ key: 'auth:test', limit: 2, windowMs: 60_000 });
    assertRateLimit({ key: 'auth:test', limit: 2, windowMs: 60_000 });

    expect(() =>
      assertRateLimit({ key: 'auth:test', limit: 2, windowMs: 60_000 }),
    ).toThrow(HttpException);
  });

  it('sanitizes untrusted request IDs', () => {
    const middleware = new RequestContextMiddleware();
    const setHeader = jest.fn();
    const on = jest.fn();

    middleware.use(
      {
        headers: { 'x-request-id': 'bad\nid' },
        method: 'GET',
        originalUrl: '/test',
      } as never,
      { setHeader, on, statusCode: 200 } as never,
      jest.fn(),
    );

    expect(setHeader.mock.calls[0][1]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('does not expose internal error details in 500 responses', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const filter = new GlobalExceptionFilter();

    filter.catch(
      new Error('database password leaked'),
      {
        switchToHttp: () => ({
          getResponse: () => ({ status }),
          getRequest: () => ({
            requestId: 'req-1',
            method: 'GET',
            originalUrl: '/boom',
          }),
        }),
      } as ArgumentsHost,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Internal server error' }),
    );
  });
});
