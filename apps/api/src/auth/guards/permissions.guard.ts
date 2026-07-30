import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../auth.types';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PERMISSION_ALIASES } from '../permissions';

const SUPER_ADMIN_ROLES = new Set(['PLATFORM_ADMIN', 'PLATFORM_ADMINISTRATOR']);

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const userRoles = request.user?.roles ?? [];
    if (userRoles.some((role) => SUPER_ADMIN_ROLES.has(role))) {
      return true;
    }

    const userPermissions = expandPermissions(request.user?.permissions ?? []);
    const allowed = required.every((permission) =>
      userPermissions.has(permission),
    );

    if (!allowed) {
      throw new ForbiddenException('Missing required permission');
    }

    return true;
  }
}

function expandPermissions(permissions: string[]) {
  const expanded = new Set(permissions);
  for (const permission of permissions) {
    for (const alias of PERMISSION_ALIASES[permission] ?? []) {
      expanded.add(alias);
    }
    for (const [source, aliases] of Object.entries(PERMISSION_ALIASES)) {
      if (aliases.includes(permission)) {
        expanded.add(source);
      }
    }
  }
  return expanded;
}
