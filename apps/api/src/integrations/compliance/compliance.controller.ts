import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/auth.types';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../auth/permissions';
import { ComplianceService } from './compliance.service';
import { ReviewComplianceCheckDto } from './dto/review-compliance-check.dto';

@Controller('compliance')
export class ComplianceController {
  constructor(private readonly compliance: ComplianceService) {}

  @RequirePermissions(PERMISSIONS.complianceRead)
  @Get('checks')
  findChecks() {
    return this.compliance.findChecks();
  }

  @RequirePermissions(PERMISSIONS.complianceRead)
  @Get('checks/:id')
  findCheck(@Param('id') id: string) {
    return this.compliance.findCheck(id);
  }

  @RequirePermissions(PERMISSIONS.complianceReview)
  @Post('checks/:id/review')
  review(
    @Param('id') id: string,
    @Body() dto: ReviewComplianceCheckDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.compliance.reviewComplianceCheck(id, dto, user?.id);
  }

  @RequirePermissions(PERMISSIONS.complianceOverride)
  @Post('checks/:id/expire')
  expire(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.compliance.expireComplianceCheck(id, user?.id);
  }

  @RequirePermissions(PERMISSIONS.complianceRead)
  @Get('review-queue')
  reviewQueue() {
    return this.compliance.reviewQueue();
  }

  @RequirePermissions(PERMISSIONS.complianceRead)
  @Get('summary')
  summary() {
    return this.compliance.summary();
  }
}
