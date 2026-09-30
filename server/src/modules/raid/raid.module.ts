import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { RaidService } from './raid.service';
import { RaidController } from './raid.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [RaidController],
  providers: [RaidService],
  exports: [RaidService],
})
export class RaidModule {}
