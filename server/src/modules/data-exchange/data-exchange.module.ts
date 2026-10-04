import { Module } from '@nestjs/common';
import { DataExchangeController } from './data-exchange.controller';
import { DataExchangeService } from './data-exchange.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [DataExchangeController],
  providers: [DataExchangeService],
  exports: [DataExchangeService],
})
export class DataExchangeModule {}
