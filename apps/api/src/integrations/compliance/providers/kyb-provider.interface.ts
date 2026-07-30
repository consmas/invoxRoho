import { ComplianceProviderResult } from './compliance-provider-result';

export interface VerifyBusinessPayload {
  legalName: string;
  registrationNumber?: string | null;
  tin?: string | null;
  country?: string | null;
}

export interface KybProvider {
  verifyBusiness(
    payload: VerifyBusinessPayload,
  ): Promise<ComplianceProviderResult>;
}
