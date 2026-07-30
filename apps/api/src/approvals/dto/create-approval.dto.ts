import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateApprovalDto {
  @IsString()
  entityType: string;

  @IsString()
  entityId: string;

  @IsString()
  action: string;

  @IsOptional()
  @IsObject()
  requestPayload?: Record<string, unknown>;
}
