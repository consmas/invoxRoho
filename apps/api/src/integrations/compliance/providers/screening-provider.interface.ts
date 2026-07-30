import { ComplianceProviderResult } from './compliance-provider-result';

export interface ScreenBusinessPayload {
  name: string;
  registrationNumber?: string | null;
  country?: string | null;
}

export interface ScreenPersonPayload {
  name: string;
  idNumber?: string | null;
  nationality?: string | null;
  dateOfBirth?: Date | null;
}

export interface ScreeningProvider {
  screenBusiness(
    payload: ScreenBusinessPayload,
  ): Promise<ComplianceProviderResult>;
  screenPerson(payload: ScreenPersonPayload): Promise<ComplianceProviderResult>;
}
