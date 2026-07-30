import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const userInclude = {
  roles: {
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  },
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  findByEmailForAuth(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: userInclude,
    });
  }

  findByIdForAuth(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: userInclude,
    });
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: userInclude,
      orderBy: { createdAt: 'desc' },
    });
    return users.map((user) => this.serializeUser(user));
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: userInclude,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.serializeUser(user);
  }

  async create(dto: CreateUserDto, actorUserId?: string) {
    await this.assertRolesExist(dto.roleIds ?? []);
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        passwordHash,
        passwordChangedAt: new Date(),
        invitedAt: dto.status === UserStatus.INVITED ? new Date() : undefined,
        status: dto.status ?? UserStatus.INVITED,
        roles: dto.roleIds?.length
          ? {
              create: dto.roleIds.map((roleId) => ({ roleId })),
            }
          : undefined,
      },
      include: userInclude,
    });
    const serialized = this.serializeUser(user);
    await this.audit.log({
      actorUserId,
      action: AuditAction.CREATE,
      entityType: 'User',
      entityId: user.id,
      afterJson: serialized,
    });
    return serialized;
  }

  async update(id: string, dto: UpdateUserDto, actorUserId?: string) {
    await this.assertRolesExist(dto.roleIds ?? []);
    const before = await this.findOne(id);
    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, 12)
      : undefined;
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        email: dto.email?.toLowerCase(),
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        passwordHash,
        passwordChangedAt: passwordHash ? new Date() : undefined,
        status: dto.status,
        roles: dto.roleIds
          ? {
              deleteMany: {},
              create: dto.roleIds.map((roleId) => ({ roleId })),
            }
          : undefined,
      },
      include: userInclude,
    });
    const serialized = this.serializeUser(user);
    await this.audit.log({
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'User',
      entityId: user.id,
      beforeJson: before,
      afterJson: serialized,
    });
    return serialized;
  }

  async markLogin(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  async updatePassword(id: string, password: string) {
    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        inviteAcceptedAt: new Date(),
        status: UserStatus.ACTIVE,
      },
    });
  }

  private async assertRolesExist(roleIds: string[]) {
    if (!roleIds.length) {
      return;
    }
    const uniqueRoleIds = Array.from(new Set(roleIds));
    const count = await this.prisma.role.count({
      where: { id: { in: uniqueRoleIds } },
    });
    if (count !== uniqueRoleIds.length) {
      throw new BadRequestException('One or more roles do not exist');
    }
  }

  private serializeUser(
    user: Awaited<ReturnType<UsersService['findByEmailForAuth']>>,
  ) {
    if (!user) {
      return user;
    }
    const roles = user.roles.map((userRole) => ({
      id: userRole.role.id,
      name: userRole.role.name,
      description: userRole.role.description,
    }));
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
      phone: user.phone,
      status: user.status,
      roles,
      permissions,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
