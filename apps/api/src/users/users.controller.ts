import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PERMISSIONS } from '../auth/permissions';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @RequirePermissions(PERMISSIONS.userRead)
  @Get()
  findAll() {
    return this.users.findAll();
  }

  @RequirePermissions(PERMISSIONS.userRead)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.users.findOne(id);
  }

  @RequirePermissions(PERMISSIONS.userCreate)
  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() user?: AuthenticatedUser) {
    return this.users.create(dto, user?.id);
  }

  @RequirePermissions(PERMISSIONS.userUpdate)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.users.update(id, dto, user?.id);
  }
}
