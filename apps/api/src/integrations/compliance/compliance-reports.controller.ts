import { Controller, Get } from '@nestjs/common';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../auth/permissions';
import { ComplianceService } from './compliance.service';

@Controller('reports/compliance')
export class ComplianceReportsController {
  constructor(private readonly compliance: ComplianceService) {}

  @RequirePermissions(PERMISSIONS.complianceRead)
  @Get('summary')
  summary() {
    return this.compliance.summary();
  }
}
