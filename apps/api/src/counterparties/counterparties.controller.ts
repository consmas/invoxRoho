import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions';
import { KycScreeningService } from '../integrations/kyc/kyc-screening.service';
import { CreateCounterpartyDto } from './dto/create-counterparty.dto';
import { UpdateCounterpartyDto } from './dto/update-counterparty.dto';
import { CounterpartiesService } from './counterparties.service';

@Controller('counterparties')
export class CounterpartiesController {
  constructor(
    private readonly counterparties: CounterpartiesService,
    private readonly kycScreening: KycScreeningService,
  ) {}

  @RequirePermissions(PERMISSIONS.counterpartyCreate)
  @Post()
  create(@Body() dto: CreateCounterpartyDto) {
    return this.counterparties.create(dto);
  }

  @RequirePermissions(PERMISSIONS.counterpartyRead)
  @Get()
  findAll() {
    return this.counterparties.findAll();
  }

  @RequirePermissions(PERMISSIONS.counterpartyRead)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.counterparties.findOne(id);
  }

  @RequirePermissions(PERMISSIONS.kycScreen)
  @Post(':id/run-kyb')
  runKyb(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.kycScreening.runCounterpartyKyb(id, user.id);
  }

  @RequirePermissions(PERMISSIONS.kycScreen)
  @Post(':id/run-screening')
  runScreening(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.kycScreening.runCounterpartyScreening(id, user.id);
  }

  @RequirePermissions(PERMISSIONS.complianceRunChecks)
  @Post(':id/run-full-compliance-check')
  runFullComplianceCheck(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.kycScreening.runCounterpartyFullComplianceCheck(id, user.id);
  }

  @RequirePermissions(PERMISSIONS.counterpartyUpdate)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCounterpartyDto) {
    return this.counterparties.update(id, dto);
  }

  @RequirePermissions(PERMISSIONS.counterpartiesApproveKyc)
  @Post(':id/approve-kyc')
  approveKyc(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.counterparties.approveKyc(
      id,
      user.id,
      user.permissions.includes(PERMISSIONS.complianceOverride),
    );
  }

  @RequirePermissions(PERMISSIONS.counterpartiesRejectKyc)
  @Post(':id/reject-kyc')
  rejectKyc(
    @Param('id') id: string,
    @Body() dto: { reason?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.counterparties.rejectKyc(
      id,
      dto.reason ?? 'KYC rejected',
      user.id,
    );
  }
}
