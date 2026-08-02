const requiredVariables = [
  'DATABASE_URL',
  'JWT_SECRET',
  'APP_PORT',
  'PRICING_ENGINE_URL',
  'CREDIT_ENGINE_URL',
  'FUNDING_ENGINE_URL',
  'REDIS_HOST',
  'REDIS_PORT',
];

const unsafeProductionValues: Record<string, string[]> = {
  JWT_SECRET: ['change_this_in_dev', 'dev_secret', 'secret', 'password'],
  PAYMENT_WEBHOOK_SECRET: ['dev_payment_secret'],
  WEBHOOK_SIGNING_SECRET: ['dev_webhook_secret'],
  ERP_WEBHOOK_SECRET: ['dev_erp_secret'],
  EINVOICING_WEBHOOK_SECRET: ['dev_einvoicing_secret'],
};

export function validateEnvironment(env: NodeJS.ProcessEnv = process.env) {
  const missing = requiredVariables.filter((key) => !env[key]);
  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  const appEnv = env.APP_ENV ?? env.NODE_ENV ?? 'development';
  if (appEnv === 'production') {
    if (String(env.JWT_SECRET ?? '').length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters in production');
    }
    const unsafe = Object.entries(unsafeProductionValues)
      .filter(([key, values]) => env[key] && values.includes(String(env[key])))
      .map(([key]) => key);
    if (unsafe.length) {
      throw new Error(
        `Unsafe production environment values detected: ${unsafe.join(', ')}`,
      );
    }
    const missingWebhookSecrets = [
      'PAYMENT_WEBHOOK_SECRET',
      'ERP_WEBHOOK_SECRET',
      'EINVOICING_WEBHOOK_SECRET',
    ].filter((key) => !env[key] || String(env[key]).length < 24);
    if (missingWebhookSecrets.length) {
      throw new Error(
        `Production webhook secrets missing or too short: ${missingWebhookSecrets.join(', ')}`,
      );
    }
    const corsOrigins = String(env.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    if (!corsOrigins.length || corsOrigins.some((origin) => origin.includes('localhost') || origin === '*')) {
      throw new Error('Production CORS_ORIGINS must contain explicit non-localhost origins');
    }
  }

  if (env.STORAGE_PROVIDER === 's3') {
    const missingS3 = [
      'S3_ENDPOINT',
      'S3_REGION',
      'S3_BUCKET',
      'S3_ACCESS_KEY_ID',
      'S3_SECRET_ACCESS_KEY',
    ].filter((key) => !env[key]);
    if (missingS3.length) {
      throw new Error(
        `S3 storage enabled but missing: ${missingS3.join(', ')}`,
      );
    }
  }

  if (env.EMAIL_PROVIDER && !['console', 'smtp'].includes(env.EMAIL_PROVIDER)) {
    throw new Error(
      `Unsupported EMAIL_PROVIDER: ${env.EMAIL_PROVIDER}. Use console or smtp.`,
    );
  }

  if (env.EMAIL_PROVIDER === 'smtp') {
    const missingSmtp = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'].filter(
      (key) => !env[key],
    );
    if (missingSmtp.length) {
      throw new Error(
        `SMTP email provider enabled but missing: ${missingSmtp.join(', ')}`,
      );
    }
  }

  if (env.PAYMENT_MODE === 'live') {
    const missingLivePayment = [
      'PAYMENT_API_BASE_URL',
      'PAYMENT_API_KEY',
      'PAYMENT_API_SECRET',
      'PAYMENT_CALLBACK_URL',
      'PAYMENT_WEBHOOK_URL',
    ].filter((key) => !env[key]);
    if (env.ENABLE_LIVE_PAYMENTS !== 'true' || missingLivePayment.length) {
      throw new Error(
        `Live payments are disabled or missing credentials: ${missingLivePayment.join(', ')}`,
      );
    }
  }

  return true;
}
