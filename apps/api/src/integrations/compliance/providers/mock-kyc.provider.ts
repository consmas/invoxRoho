import { ComplianceProviderResult } from './compliance-provider-result';
import { KycProvider, VerifyPersonPayload } from './kyc-provider.interface';

export class MockKycProvider implements KycProvider {
  verifyPerson(
    payload: VerifyPersonPayload,
  ): Promise<ComplianceProviderResult> {
    const name = payload.fullName.toUpperCase();
    const idNumber = payload.idNumber?.toUpperCase() ?? '';
    if (name.includes('FAIL')) {
      return Promise.resolve(
        result('FAILED', 'FAILED', true, 'Full name forced KYC failure'),
      );
    }
    if (idNumber.includes('REVIEW')) {
      return Promise.resolve(
        result(
          'REVIEW_REQUIRED',
          'REFERRED',
          true,
          'ID number forced manual review',
          'MEDIUM',
        ),
      );
    }
    return Promise.resolve(
      result('COMPLETED', 'VERIFIED', false, 'Mock person verified'),
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
    providerReference: `mock-kyc-${Date.now()}`,
    status,
    normalizedResult,
    reviewRequired,
    riskLevel,
    reason,
    rawResponse: { status, normalizedResult, reason, riskLevel },
  };
}
