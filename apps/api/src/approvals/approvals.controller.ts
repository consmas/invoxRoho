import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PERMISSIONS } from '../auth/permissions';
import { ApprovalsService } from './approvals.service';
import { CreateApprovalDto } from './dto/create-approval.dto';
import {
  ApproveRequestDto,
  RejectRequestDto,
} from './dto/decision-approval.dto';

@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvals: ApprovalsService) {}

  @RequirePermissions(PERMISSIONS.workflowReadV2)
  @Get()
  findAll() {
    return this.approvals.findAll();
  }

  @RequirePermissions(PERMISSIONS.workflowReadV2)
  @Get('pending')
  pending() {
    return this.approvals.findPending();
  }

  @RequirePermissions(PERMISSIONS.workflowReadV2)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.approvals.findOne(id);
  }

  @RequirePermissions(PERMISSIONS.workflowCreate)
  @Post()
  create(
    @Body() dto: CreateApprovalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.approvals.create(dto, user);
  }

  @RequirePermissions(PERMISSIONS.workflowComplete)
  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.approvals.approve(id, dto, user);
  }

  @RequirePermissions(PERMISSIONS.workflowComplete)
  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.approvals.reject(id, dto, user);
  }

  @RequirePermissions(PERMISSIONS.workflowCancel)
  @Post(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.approvals.cancel(id, user);
  }
}
