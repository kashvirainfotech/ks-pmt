import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class LinkCrTasksDto {
  @IsNotEmpty()
  @IsArray()
  @IsUUID('4', { each: true })
  taskIds: string[];

  @IsOptional()
  @IsBoolean()
  isScopeAddition?: boolean;
}
