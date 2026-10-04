import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, Min, IsDateString, IsUUID } from 'class-validator';

export class CreateCapacityReservationDto {
  @IsOptional()
  @IsString()
  reservation_code?: string;

  @IsUUID()
  @IsNotEmpty()
  user_id: string;

  @IsOptional()
  @IsUUID()
  project_id?: string;

  @IsEnum([
    'SUPPORT_ROTATION',
    'MENTORING',
    'RESEARCH_INNOVATION',
    'RECURRING_MEETINGS',
    'TRAINING',
    'ADMIN_OVERHEAD',
  ])
  reservation_type:
    | 'SUPPORT_ROTATION'
    | 'MENTORING'
    | 'RESEARCH_INNOVATION'
    | 'RECURRING_MEETINGS'
    | 'TRAINING'
    | 'ADMIN_OVERHEAD';

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  @IsNumber()
  @Min(0.5)
  reserved_hours_per_week: number;
}
