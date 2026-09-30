import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ProductIdeasService } from './product-ideas.service';
import { ProductIdeasController } from './product-ideas.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [ProductIdeasController],
  providers: [ProductIdeasService],
  exports: [ProductIdeasService],
})
export class ProductIdeasModule {}
