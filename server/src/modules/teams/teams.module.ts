import { Module } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { TeamsController, ComponentsController } from './teams.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [TeamsController, ComponentsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
