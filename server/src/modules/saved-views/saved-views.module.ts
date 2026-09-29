import { Module } from '@nestjs/common';
import { SavedViewsService } from './saved-views.service';
import { SavedViewsController } from './saved-views.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SavedViewsController],
  providers: [SavedViewsService],
  exports: [SavedViewsService],
})
export class SavedViewsModule {}
