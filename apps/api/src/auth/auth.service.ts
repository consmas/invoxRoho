import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuditAction, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../audit/audit.service';
import {
  assertRateLimit,
  randomToken,
} from '../common/security';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UsersService } from '../users/users.service';
import { AuthenticatedUser, JwtPayload } from './auth.types';
import { ChangePasswordDto } from './dto/change-password.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { RegisterDto } from './dto/register.dto';
import {
  ResetPasswordConfirmDto,
  ResetPasswordRequestDto,
} from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async login(email: string, password: string, ip = 'unknown') {
    const normalizedEmail = email.toLowerCase();
    this.assertAuthRateLimit(`login:ip:${ip}`, 20, 60_000);
    this.assertAuthRateLimit(`login:email:${normalizedEmail}`, 8, 60_000);
    const user = await this.users.findByEmailForAuth(normalizedEmail);

    if (!user || !user.passwordHash || user.status !== UserStatus.ACTIVE) {
      await this.audit.log({
        action: AuditAction.FAILED_LOGIN,
        entityType: 'User',
        entityId: user?.id,
        reason: `Failed login for ${normalizedEmail}`,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      await this.audit.log({
        actorUserId: user.id,
        action: AuditAction.FAILED_LOGIN,
        entityType: 'User',
        entityId: user.id,
        reason: 'Invalid password',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const authUser = this.toAuthUser(user);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: authUser.roles,
      permissions: authUser.permissions,
    };

    await this.audit.log({
      actorUserId: user.id,
      action: AuditAction.LOGIN,
      entityType: 'User',
      entityId: user.id,
    });
    await this.users.markLogin(user.id);

    return {
      accessToken: await this.jwt.signAsync(payload),
      tokenType: 'Bearer',
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN') ?? '1d',
      user: authUser,
    };
  }

  async me(user: AuthenticatedUser) {
    const currentUser = await this.users.findByEmailForAuth(
      user.email.toLowerCase(),
    );
    if (!currentUser || currentUser.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid session');
    }
    return this.toAuthUser(currentUser);
  }

  async register(dto: RegisterDto, ip = 'unknown') {
    this.assertAuthRateLimit(`register:ip:${ip}`, 5, 60 * 60_000);
    const existing = await this.users.findByEmailForAuth(
      dto.email.toLowerCase(),
    );
    if (existing) {
      throw new ConflictException('Email is already registered');
    }
    const user = await this.users.create({
      ...dto,
      status: UserStatus.ACTIVE,
    } satisfies CreateUserDto);
    if (!user) {
      throw new UnauthorizedException('Registration failed');
    }
    return {
      id: user.id,
      email: user.email,
      status: user.status,
    };
  }

  logout(user: AuthenticatedUser) {
    return {
      success: true,
      userId: user.id,
      message:
        'Client token discarded. Server-side token blacklist is not enabled in development.',
    };
  }

  async inviteUser(dto: InviteUserDto, actor?: AuthenticatedUser) {
    const temporaryPassword = `Invite-${randomToken(24)}`;
    const user = await this.users.create(
      {
        ...dto,
        password: temporaryPassword,
        status: UserStatus.INVITED,
      },
      actor?.id,
    );
    if (!user) {
      throw new UnauthorizedException('Invitation failed');
    }
    const inviteToken = randomToken(32);
    await this.notifications
      .sendTemplateEmail(
        'user.invited',
        user.email,
        {
          userName: displayName(user),
          actionUrl: `${this.appUrl()}/accept-invite?token=${inviteToken}`,
          token: inviteToken,
        },
        actor?.id,
      )
      .catch(() => undefined);
    return {
      user,
      inviteToken,
      emailQueued: true,
    };
  }

  async changePassword(user: AuthenticatedUser, dto: ChangePasswordDto) {
    const currentUser = await this.users.findByIdForAuth(user.id);
    if (!currentUser?.passwordHash) {
      throw new UnauthorizedException('Invalid session');
    }
    const validPassword = await bcrypt.compare(
      dto.currentPassword,
      currentUser.passwordHash,
    );
    if (!validPassword) {
      throw new UnauthorizedException('Invalid password');
    }
    await this.users.updatePassword(user.id, dto.newPassword);
    return { success: true };
  }

  async requestPasswordReset(dto: ResetPasswordRequestDto, ip = 'unknown') {
    this.assertAuthRateLimit(`reset:ip:${ip}`, 10, 60 * 60_000);
    this.assertAuthRateLimit(
      `reset:email:${dto.email.toLowerCase()}`,
      5,
      60 * 60_000,
    );
    const user = await this.users.findByEmailForAuth(dto.email.toLowerCase());
    if (user) {
      const resetToken = randomToken(32);
      passwordResetTokens.set(resetToken, {
        userId: user.id,
        expiresAt: Date.now() + 15 * 60_000,
      });
      await this.notifications
        .sendTemplateEmail('password.reset', user.email, {
          userName: displayName(user),
          actionUrl: `${this.appUrl()}/reset-password?token=${resetToken}`,
          token: resetToken,
        })
        .catch(() => undefined);
    }
    return {
      success: true,
      message: 'If the email exists, password reset instructions will be sent.',
    };
  }

  async confirmPasswordReset(dto: ResetPasswordConfirmDto) {
    const token = passwordResetTokens.get(dto.token);
    passwordResetTokens.delete(dto.token);
    if (!token || token.expiresAt < Date.now()) {
      throw new UnauthorizedException('Invalid reset token');
    }
    const user = await this.users.findByIdForAuth(token.userId);
    if (!user) {
      throw new UnauthorizedException('Invalid reset token');
    }
    await this.users.updatePassword(user.id, dto.newPassword);
    return { success: true };
  }

  private toAuthUser(
    user: NonNullable<Awaited<ReturnType<UsersService['findByEmailForAuth']>>>,
  ): AuthenticatedUser & {
    firstName?: string | null;
    lastName?: string | null;
  } {
    const roles = user.roles.map((userRole) => userRole.role.name);
    const permissions = Array.from(
      new Set(
        user.roles.flatMap((userRole) =>
          userRole.role.permissions.map(
            (rolePermission) => rolePermission.permission.key,
          ),
        ),
      ),
    ).sort();

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
      permissions,
    };
  }

  private appUrl() {
    const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
    const parsed = new URL(appUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new UnauthorizedException('APP_URL must use http or https');
    }
    return parsed.toString().replace(/\/$/, '');
  }

  private assertAuthRateLimit(key: string, limit: number, windowMs: number) {
    assertRateLimit({
      key,
      limit,
      windowMs,
      message: 'Too many authentication attempts',
    });
  }
}

const passwordResetTokens = new Map<
  string,
  { userId: string; expiresAt: number }
>();

function displayName(user: {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}) {
  return (
    [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
  );
}
