import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions';
import { Phase2RecordDto } from './dto/phase2-record.dto';
import { Phase2ProductsService } from './phase2-products.service';

@Controller('phase2-products')
export class Phase2ProductsController {
  constructor(private readonly phase2: Phase2ProductsService) {}

  @RequirePermissions(PERMISSIONS.reportRead)
  @Get('dashboard')
  dashboard() {
    return this.phase2.dashboard();
  }

  @RequirePermissions(PERMISSIONS.reportRead)
  @Get(':resource')
  findAll(@Param('resource') resource: string) {
    return this.phase2.findAll(resource);
  }

  @RequirePermissions(PERMISSIONS.reportExport)
  @Header('Content-Type', 'text/csv')
  @Get(':resource/export/csv')
  exportCsv(@Param('resource') resource: string) {
    return this.phase2.exportCsv(resource);
  }

  @RequirePermissions(PERMISSIONS.reportRead)
  @Get(':resource/:id')
  findOne(@Param('resource') resource: string, @Param('id') id: string) {
    return this.phase2.findOne(resource, id);
  }

  @RequirePermissions(PERMISSIONS.reportRead)
  @Post(':resource/calculate')
  calculate(@Param('resource') resource: string, @Body() body: Record<string, unknown>) {
    return this.phase2.calculate(resource, body);
  }

  @RequirePermissions(PERMISSIONS.productConfigure)
  @Post(':resource')
  create(
    @Param('resource') resource: string,
    @Body() dto: Phase2RecordDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.phase2.create(resource, dto.data, user?.id);
  }

  @RequirePermissions(PERMISSIONS.productConfigure)
  @Patch(':resource/:id')
  update(
    @Param('resource') resource: string,
    @Param('id') id: string,
    @Body() dto: Phase2RecordDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.phase2.update(resource, id, dto.data, user?.id);
  }

  @RequirePermissions(PERMISSIONS.productConfigure)
  @Delete(':resource/:id')
  remove(
    @Param('resource') resource: string,
    @Param('id') id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.phase2.remove(resource, id, user?.id);
  }

  @RequirePermissions(PERMISSIONS.productConfigure)
  @Post(':resource/:id/actions/:action')
  action(
    @Param('resource') resource: string,
    @Param('id') id: string,
    @Param('action') action: string,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('x-idempotency-key') xIdempotencyKey?: string,
    @Body() body: Record<string, unknown> = {},
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.phase2.action(resource, id, action, body, user?.id, idempotencyKey ?? xIdempotencyKey);
  }
}
