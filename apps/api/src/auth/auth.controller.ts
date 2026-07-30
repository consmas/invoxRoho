import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { RequirePermissions } from './decorators/permissions.decorator';
import { PERMISSIONS } from './permissions';
import { ChangePasswordDto } from './dto/change-password.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import {
  ResetPasswordConfirmDto,
  ResetPasswordRequestDto,
} from './dto/reset-password.dto';
import type { AuthenticatedUser } from './auth.types';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('logout')
  logout(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.logout(user);
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.me(user);
  }

  @RequirePermissions(PERMISSIONS.usersCreate)
  @Post('invite-user')
  inviteUser(
    @Body() dto: InviteUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.auth.inviteUser(dto, user);
  }

  @Post('change-password')
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.auth.changePassword(user, dto);
  }

  @Public()
  @Post('reset-password/request')
  requestPasswordReset(@Body() dto: ResetPasswordRequestDto) {
    return this.auth.requestPasswordReset(dto);
  }

  @Public()
  @Post('reset-password/confirm')
  confirmPasswordReset(@Body() dto: ResetPasswordConfirmDto) {
    return this.auth.confirmPasswordReset(dto);
  }
}
