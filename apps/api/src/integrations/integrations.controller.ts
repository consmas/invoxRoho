import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions';
import {
  CreateIntegrationConnectionDto,
  UpdateIntegrationConnectionDto,
} from './dto/integration-connection.dto';
import { IntegrationsService } from './integrations.service';

@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @RequirePermissions(PERMISSIONS.integrationsRead)
  @Get('connections')
  findConnections() {
    return this.integrations.findConnections();
  }

  @RequirePermissions(PERMISSIONS.integrationsCreate)
  @Post('connections')
  createConnection(
    @Body() dto: CreateIntegrationConnectionDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.integrations.createConnection(dto, user?.id);
  }

  @RequirePermissions(PERMISSIONS.integrationsRead)
  @Get('connections/:id')
  findConnection(@Param('id') id: string) {
    return this.integrations.findConnection(id);
  }

  @RequirePermissions(PERMISSIONS.integrationsUpdate)
  @Patch('connections/:id')
  updateConnection(
    @Param('id') id: string,
    @Body() dto: UpdateIntegrationConnectionDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.integrations.updateConnection(id, dto, user?.id);
  }

  @RequirePermissions(PERMISSIONS.integrationsTest)
  @Post('connections/:id/test')
  testConnection(
    @Param('id') id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.integrations.testConnection(id, user?.id);
  }

  @RequirePermissions(PERMISSIONS.integrationsEnable)
  @Post('connections/:id/enable')
  enableConnection(
    @Param('id') id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.integrations.setStatus(id, 'ENABLED', user?.id);
  }

  @RequirePermissions(PERMISSIONS.integrationsDisable)
  @Post('connections/:id/disable')
  disableConnection(
    @Param('id') id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.integrations.setStatus(id, 'DISABLED', user?.id);
  }

  @RequirePermissions(PERMISSIONS.integrationsLogsRead)
  @Get('logs')
  findLogs() {
    return this.integrations.findLogs();
  }

  @RequirePermissions(PERMISSIONS.integrationsLogsRead)
  @Get('logs/:id')
  findLog(@Param('id') id: string) {
    return this.integrations.findLog(id);
  }
}
