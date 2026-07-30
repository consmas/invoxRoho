import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EmailTemplate } from './email-template';

const templates: EmailTemplate[] = [
  template(
    'user.invited',
    'You have been invited to INVOX',
    'Hello {{userName}}, you have been invited to INVOX. Open {{actionUrl}} to accept the invitation.',
    ['userName', 'actionUrl'],
  ),
  template(
    'password.reset',
    'Reset your INVOX password',
    'Hello {{userName}}, use {{actionUrl}} to reset your password. If you did not request this, ignore this email.',
    ['userName', 'actionUrl'],
  ),
  template(
    'approval.requested',
    'Approval requested for {{entityName}}',
    '{{userName}} requested approval for {{entityName}}. Review it at {{actionUrl}}.',
    ['userName', 'entityName', 'actionUrl'],
  ),
  template(
    'approval.approved',
    'Approval completed for {{entityName}}',
    '{{entityName}} has been approved. Status: {{status}}.',
    ['entityName', 'status'],
  ),
  template(
    'approval.rejected',
    'Approval rejected for {{entityName}}',
    '{{entityName}} was rejected. Reason: {{reason}}.',
    ['entityName', 'reason'],
  ),
  template(
    'kyc.submitted',
    'KYC submitted for {{entityName}}',
    'KYC/KYB has been submitted for {{entityName}}. Status: {{status}}.',
    ['entityName', 'status'],
  ),
  template(
    'kyc.approved',
    'KYC approved for {{entityName}}',
    'KYC/KYB has been approved for {{entityName}}.',
    ['entityName'],
  ),
  template(
    'kyc.rejected',
    'KYC rejected for {{entityName}}',
    'KYC/KYB has been rejected for {{entityName}}. Reason: {{reason}}.',
    ['entityName', 'reason'],
  ),
  template(
    'programme.approved',
    'Programme approved: {{entityName}}',
    'Programme {{entityName}} has been approved. Status: {{status}}.',
    ['entityName', 'status'],
  ),
  template(
    'programme.activated',
    'Programme activated: {{entityName}}',
    'Programme {{entityName}} is now active.',
    ['entityName'],
  ),
  template(
    'invoice.approved',
    'Invoice approved: {{entityName}}',
    'Invoice {{entityName}} has been approved and is ready for reverse factoring.',
    ['entityName'],
  ),
  template(
    'financing.offer_generated',
    'Financing offer generated',
    'A financing offer has been generated for {{entityName}}. Review it at {{actionUrl}}.',
    ['entityName', 'actionUrl'],
  ),
  template(
    'financing.accepted',
    'Financing offer accepted',
    'The financing offer for {{entityName}} has been accepted.',
    ['entityName'],
  ),
  template(
    'payment.disbursed',
    'Payment disbursed',
    'Payment has been disbursed for {{entityName}}. Status: {{status}}.',
    ['entityName', 'status'],
  ),
  template(
    'collection.received',
    'Collection received',
    'Collection has been received for {{entityName}}. Status: {{status}}.',
    ['entityName', 'status'],
  ),
];

export const EMAIL_TEMPLATES = Object.fromEntries(
  templates.map((item) => [item.key, item]),
) as Record<string, EmailTemplate>;

export function renderTemplate(
  templateKey: string,
  variables: Record<string, unknown>,
) {
  const source = EMAIL_TEMPLATES[templateKey];
  if (!source) {
    throw new NotFoundException(`Email template not found: ${templateKey}`);
  }
  const missing = (source.requiredVariables ?? []).filter(
    (key) => variables[key] == null || variables[key] === '',
  );
  if (missing.length) {
    throw new BadRequestException(
      `Missing template variables: ${missing.join(', ')}`,
    );
  }
  return {
    key: source.key,
    subject: renderString(source.subject, variables),
    html: renderString(source.html, variables),
    text: renderString(source.text, variables),
  };
}

function template(
  key: string,
  subject: string,
  text: string,
  requiredVariables?: string[],
): EmailTemplate {
  return {
    key,
    subject,
    text,
    html: `<p>${escapeHtml(text).replace(/\{\{([^}]+)\}\}/g, '{{$1}}')}</p>`,
    requiredVariables,
  };
}

function renderString(value: string, variables: Record<string, unknown>) {
  return value.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key: string) =>
    stringifyVariable(variables[key]),
  );
}

function stringifyVariable(value: unknown) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
