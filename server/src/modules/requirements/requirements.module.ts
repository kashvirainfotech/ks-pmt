import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { RbacModule } from '../rbac/rbac.module';
import { RequirementsController } from './requirements.controller';
import { RequirementsService } from './requirements.service';

@Module({
  imports: [DatabaseModule, RbacModule],
  controllers: [RequirementsController],
  providers: [RequirementsService],
  exports: [RequirementsService],
})
export class RequirementsModule {}
