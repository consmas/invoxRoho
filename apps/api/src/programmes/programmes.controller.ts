import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ProgrammeStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions';
import { AddProgrammeParticipantDto } from './dto/add-programme-participant.dto';
import { CreateProgrammeDto } from './dto/create-programme.dto';
import { UpdateProgrammeDto } from './dto/update-programme.dto';
import { ProgrammesService } from './programmes.service';

@Controller('programmes')
export class ProgrammesController {
  constructor(private readonly programmes: ProgrammesService) {}

  @RequirePermissions(PERMISSIONS.programmeCreate)
  @Post()
  create(@Body() dto: CreateProgrammeDto) {
    return this.programmes.create(dto);
  }

  @RequirePermissions(PERMISSIONS.programmeRead)
  @Get()
  findAll() {
    return this.programmes.findAll();
  }

  @RequirePermissions(PERMISSIONS.programmeRead)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.programmes.findOne(id);
  }

  @RequirePermissions(PERMISSIONS.programmeUpdate)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProgrammeDto) {
    return this.programmes.update(id, dto);
  }

  @RequirePermissions(PERMISSIONS.programmeParticipantAdd)
  @Post(':id/participants')
  addParticipant(
    @Param('id') id: string,
    @Body() dto: AddProgrammeParticipantDto,
  ) {
    return this.programmes.addParticipant(id, dto);
  }

  @RequirePermissions(PERMISSIONS.programmesApprove)
  @Post(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.programmes.setStatus(
      id,
      ProgrammeStatus.ACTIVE,
      user.id,
      'Programme approved',
    );
  }

  @RequirePermissions(PERMISSIONS.programmesActivate)
  @Post(':id/activate')
  activate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.programmes.setStatus(
      id,
      ProgrammeStatus.ACTIVE,
      user.id,
      'Programme activated',
    );
  }

  @RequirePermissions(PERMISSIONS.programmesSuspend)
  @Post(':id/suspend')
  suspend(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.programmes.setStatus(
      id,
      ProgrammeStatus.SUSPENDED,
      user.id,
      'Programme suspended',
    );
  }

  @RequirePermissions(PERMISSIONS.programmesClose)
  @Post(':id/close')
  close(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.programmes.setStatus(
      id,
      ProgrammeStatus.CLOSED,
      user.id,
      'Programme closed',
    );
  }
}
