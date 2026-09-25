import { Global, Module } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { DynamicRbacGuard } from './rbac.guard';

@Global()
@Module({
  providers: [RbacService, DynamicRbacGuard],
  exports: [RbacService, DynamicRbacGuard],
})
export class RbacModule {}
