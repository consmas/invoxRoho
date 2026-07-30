import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions';
import {
  CreateNotificationDto,
  SendTemplateNotificationDto,
} from './dto/notification.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @RequirePermissions(PERMISSIONS.notificationsRead)
  @Get()
  findAll() {
    return this.notifications.findAll();
  }

  @RequirePermissions(PERMISSIONS.notificationsSend)
  @Post()
  create(
    @Body() dto: CreateNotificationDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.notifications.create(dto, user?.id);
  }

  @RequirePermissions(PERMISSIONS.notificationsRead)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.notifications.findOne(id);
  }

  @RequirePermissions(PERMISSIONS.notificationsSend)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateNotificationDto>,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.notifications.update(id, dto, user?.id);
  }

  @RequirePermissions(PERMISSIONS.notificationsSend)
  @Post(':id/send')
  send(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.notifications.sendNotification(id, user?.id);
  }

  @RequirePermissions(PERMISSIONS.notificationsRetry)
  @Post(':id/retry')
  retry(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.notifications.retryNotification(id, user?.id);
  }

  @RequirePermissions(PERMISSIONS.notificationsCancel)
  @Post(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.notifications.cancelNotification(id, user?.id);
  }

  @RequirePermissions(PERMISSIONS.notificationsSend)
  @Post('send-template')
  sendTemplate(
    @Body() dto: SendTemplateNotificationDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.notifications.sendTemplate(dto, user?.id);
  }
}
