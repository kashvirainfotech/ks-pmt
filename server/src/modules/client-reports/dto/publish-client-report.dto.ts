import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ReportAudienceScope } from './create-client-report.dto';

export class PublishClientReportDto {
  @IsOptional()
  @IsString()
  revisionReason?: string;

  @IsOptional()
  @IsEnum(ReportAudienceScope)
  audienceScope?: ReportAudienceScope;
}
