import { ComplianceProviderResult } from './compliance-provider-result';

export interface VerifyPersonPayload {
  fullName: string;
  idNumber?: string | null;
  idType?: string | null;
  nationality?: string | null;
  dateOfBirth?: Date | null;
}

export interface KycProvider {
  verifyPerson(payload: VerifyPersonPayload): Promise<ComplianceProviderResult>;
}
