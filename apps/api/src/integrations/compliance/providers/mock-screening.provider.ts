import { ComplianceProviderResult } from './compliance-provider-result';
import {
  ScreenBusinessPayload,
  ScreeningProvider,
  ScreenPersonPayload,
} from './screening-provider.interface';

export class MockScreeningProvider implements ScreeningProvider {
  screenBusiness(
    payload: ScreenBusinessPayload,
  ): Promise<ComplianceProviderResult> {
    return Promise.resolve(screenName(payload.name));
  }

  screenPerson(
    payload: ScreenPersonPayload,
  ): Promise<ComplianceProviderResult> {
    return Promise.resolve(screenName(payload.name));
  }
}

function screenName(name: string): ComplianceProviderResult {
  const upper = name.toUpperCase();
  if (upper.includes('SANCTION')) {
    return match('CRITICAL', 'Mock sanctions match');
  }
  if (upper.includes('PEP')) {
    return match('HIGH', 'Mock PEP match');
  }
  if (upper.includes('ADVERSE')) {
    return match('MEDIUM', 'Mock adverse media match');
  }
  return {
    provider: 'mock',
    providerReference: `mock-screen-${Date.now()}`,
    status: 'COMPLETED',
    normalizedResult: 'CLEAR',
    riskLevel: 'LOW',
    reviewRequired: false,
    reason: 'Mock screening clear',
    rawResponse: { match: false },
  };
}

function match(
  riskLevel: ComplianceProviderResult['riskLevel'],
  reason: string,
): ComplianceProviderResult {
  return {
    provider: 'mock',
    providerReference: `mock-screen-${Date.now()}`,
    status: 'REVIEW_REQUIRED',
    normalizedResult: 'MATCH',
    riskLevel,
    reviewRequired: true,
    reason,
    rawResponse: { match: true, reason, riskLevel },
  };
}
