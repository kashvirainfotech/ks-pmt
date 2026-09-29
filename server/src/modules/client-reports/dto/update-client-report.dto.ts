import { PartialType } from '@nestjs/mapped-types';
import { CreateClientReportDto } from './create-client-report.dto';

export class UpdateClientReportDto extends PartialType(CreateClientReportDto) {}
