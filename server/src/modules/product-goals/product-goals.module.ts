import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ProductGoalsController } from './product-goals.controller';
import { ProductGoalsService } from './product-goals.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ProductGoalsController],
  providers: [ProductGoalsService],
  exports: [ProductGoalsService],
})
export class ProductGoalsModule {}
