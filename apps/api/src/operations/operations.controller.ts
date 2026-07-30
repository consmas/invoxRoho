import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions';
import { CreateOperationRecordDto } from './dto/create-operation-record.dto';
import { OperationsService } from './operations.service';

@Controller('operations')
export class OperationsController {
  constructor(private readonly operations: OperationsService) {}

  @RequirePermissions(PERMISSIONS.reportRead)
  @Get('dashboard')
  dashboard() {
    return this.operations.dashboard();
  }

  @RequirePermissions(PERMISSIONS.reportRead)
  @Get(':resource')
  findAll(@Param('resource') resource: string) {
    return this.operations.findAll(resource);
  }

  @RequirePermissions(PERMISSIONS.reportRead)
  @Post(':resource')
  create(
    @Param('resource') resource: string,
    @Body() dto: CreateOperationRecordDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.operations.create(resource, dto.data, user?.id);
  }

  @RequirePermissions(PERMISSIONS.reconciliationManage)
  @Patch(':resource/:id')
  update(
    @Param('resource') resource: string,
    @Param('id') id: string,
    @Body() dto: CreateOperationRecordDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.operations.update(resource, id, dto.data, user?.id);
  }
}
