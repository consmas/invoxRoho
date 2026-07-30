import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateNotificationDto {
  @IsOptional()
  @IsString()
  recipientUserId?: string;

  @IsOptional()
  @IsString()
  counterpartyId?: string;

  @IsString()
  channel: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  templateKey?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsString()
  @MinLength(1)
  message: string;

  @IsString()
  @MinLength(1)
  recipient: string;

  @IsOptional()
  @IsObject()
  payloadJson?: Record<string, unknown>;
}

export class SendTemplateNotificationDto {
  @IsString()
  @MinLength(1)
  templateKey: string;

  @IsString()
  @MinLength(1)
  recipient: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
