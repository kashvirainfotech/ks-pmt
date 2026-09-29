import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../../database/database.module';
import { ChangeRequestsModule } from '../change-requests/change-requests.module';
import { UatPackagesModule } from '../uat-packages/uat-packages.module';
import { ClientPortalService } from './client-portal.service';
import { ClientPortalController } from './client-portal.controller';

@Module({
  imports: [
    DatabaseModule,
    JwtModule.register({}),
    ChangeRequestsModule,
    UatPackagesModule,
  ],
  controllers: [ClientPortalController],
  providers: [ClientPortalService],
  exports: [ClientPortalService],
})
export class ClientPortalModule {}
