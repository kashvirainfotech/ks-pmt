import { Global, Module } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { DynamicRbacGuard } from './rbac.guard';
import { RbacController } from './rbac.controller';

@Global()
@Module({
  controllers: [RbacController],
  providers: [RbacService, DynamicRbacGuard],
  exports: [RbacService, DynamicRbacGuard],
})
export class RbacModule {}
