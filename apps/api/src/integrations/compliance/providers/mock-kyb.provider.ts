import { ComplianceProviderResult } from './compliance-provider-result';
import { KybProvider, VerifyBusinessPayload } from './kyb-provider.interface';

export class MockKybProvider implements KybProvider {
  verifyBusiness(
    payload: VerifyBusinessPayload,
  ): Promise<ComplianceProviderResult> {
    const legalName = payload.legalName.toUpperCase();
    const registration = payload.registrationNumber?.toUpperCase() ?? '';
    const tin = payload.tin?.toUpperCase() ?? '';
    if (legalName.includes('FAIL')) {
      return Promise.resolve(
        result('FAILED', 'FAILED', true, 'Legal name forced KYB failure'),
      );
    }
    if (registration.includes('REVIEW') || tin.includes('REVIEW')) {
      return Promise.resolve(
        result(
          'REVIEW_REQUIRED',
          'REFERRED',
          true,
          'Registration or TIN forced manual review',
          'MEDIUM',
        ),
      );
    }
    return Promise.resolve(
      result('COMPLETED', 'VERIFIED', false, 'Mock business verified'),
    );
  }
}

function result(
  status: ComplianceProviderResult['status'],
  normalizedResult: ComplianceProviderResult['normalizedResult'],
  reviewRequired: boolean,
  reason: string,
  riskLevel?: ComplianceProviderResult['riskLevel'],
): ComplianceProviderResult {
  return {
    provider: 'mock',
    providerReference: `mock-kyb-${Date.now()}`,
    status,
    normalizedResult,
    reviewRequired,
    riskLevel,
    reason,
    rawResponse: { status, normalizedResult, reason, riskLevel },
  };
}
