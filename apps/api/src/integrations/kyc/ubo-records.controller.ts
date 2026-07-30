import { Controller, Param, Post } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/auth.types';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../auth/permissions';
import { KycScreeningService } from './kyc-screening.service';

@Controller('ubo-records')
export class UboRecordsController {
  constructor(private readonly kyc: KycScreeningService) {}

  @RequirePermissions(PERMISSIONS.kycScreen)
  @Post(':id/run-kyc')
  runKyc(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.kyc.runUboKyc(id, user?.id);
  }

  @RequirePermissions(PERMISSIONS.kycScreen)
  @Post(':id/run-screening')
  runScreening(
    @Param('id') id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.kyc.runUboScreening(id, user?.id);
  }

  @RequirePermissions(PERMISSIONS.complianceRunChecks)
  @Post(':id/run-full-compliance-check')
  runFullComplianceCheck(
    @Param('id') id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.kyc.runUboFullComplianceCheck(id, user?.id);
  }
}
