import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../../common/decorators/permissions.decorator';
import { RbacService } from './rbac.service';

@Injectable()
export class DynamicRbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles or permissions are required, allow access
    if (!requiredRoles && !requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('User authentication required');
    }

    const activeBranchId = request.headers['x-branch-id'] || user.primaryBranchId;
    const effectivePerms = await this.rbacService.getEffectivePermissions(
      user.id,
      activeBranchId,
    );

    // Super Admin has unrestricted access
    if (effectivePerms.roleCode === 'ROLE_SUPER_ADMIN') {
      return true;
    }

    // Role check
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.includes(effectivePerms.roleCode);
      if (!hasRole) {
        throw new ForbiddenException(
          `Access denied. Required role: ${requiredRoles.join(', ')}`,
        );
      }
    }

    // Permission check
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasAllPermissions = requiredPermissions.every((perm) =>
        effectivePerms.permissions.has(perm),
      );

      if (!hasAllPermissions) {
        const missing = requiredPermissions.filter(
          (perm) => !effectivePerms.permissions.has(perm),
        );
        throw new ForbiddenException(
          `Access denied. Missing required permission(s): ${missing.join(', ')}`,
        );
      }
    }

    // Attach effective permissions to request for downstream use
    request.userEffectivePermissions = effectivePerms;
    return true;
  }
}
