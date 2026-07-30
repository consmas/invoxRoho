export type ComplianceCheckStatus = 'COMPLETED' | 'FAILED' | 'REVIEW_REQUIRED';

export type ComplianceNormalizedResult =
  'CLEAR' | 'VERIFIED' | 'MATCH' | 'NO_MATCH' | 'REFERRED' | 'FAILED' | 'ERROR';

export type ComplianceRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ComplianceProviderResult {
  provider: string;
  providerReference?: string;
  status: ComplianceCheckStatus;
  normalizedResult: ComplianceNormalizedResult;
  riskLevel?: ComplianceRiskLevel;
  reviewRequired: boolean;
  reason?: string;
  rawResponse?: unknown;
}
