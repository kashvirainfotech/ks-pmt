import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { UatPackagesController } from './uat-packages.controller';
import { UatPackagesService } from './uat-packages.service';

@Module({
  imports: [DatabaseModule],
  controllers: [UatPackagesController],
  providers: [UatPackagesService],
  exports: [UatPackagesService],
})
export class UatPackagesModule {}
