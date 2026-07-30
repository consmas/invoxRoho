import { Injectable } from '@nestjs/common';
import { ComplianceService } from '../compliance/compliance.service';

@Injectable()
export class KycScreeningService {
  constructor(private readonly compliance: ComplianceService) {}

  async runCounterpartyKyb(id: string, actorUserId?: string) {
    return this.compliance.runBusinessVerification(id, actorUserId);
  }

  async runCounterpartyScreening(id: string, actorUserId?: string) {
    return this.compliance.runCounterpartyScreening(id, actorUserId);
  }

  async runCounterpartyFullComplianceCheck(id: string, actorUserId?: string) {
    return this.compliance.runCounterpartyFullComplianceCheck(id, actorUserId);
  }

  async runUboKyc(id: string, actorUserId?: string) {
    return this.compliance.runPersonVerification(id, actorUserId);
  }

  async runUboScreening(id: string, actorUserId?: string) {
    return this.compliance.runUboScreening(id, actorUserId);
  }

  async runUboFullComplianceCheck(id: string, actorUserId?: string) {
    return this.compliance.runUboFullComplianceCheck(id, actorUserId);
  }
}
