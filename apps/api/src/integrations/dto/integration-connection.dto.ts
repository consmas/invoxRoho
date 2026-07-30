import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateIntegrationConnectionDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  providerType: string;

  @IsString()
  @MinLength(1)
  providerKey: string;

  @IsOptional()
  @IsString()
  environment?: string;

  @IsOptional()
  @IsString()
  baseUrl?: string;

  @IsOptional()
  @IsString()
  authType?: string;

  @IsOptional()
  @IsObject()
  credentialsJson?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  configJson?: Record<string, unknown>;
}

export class UpdateIntegrationConnectionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  providerType?: string;

  @IsOptional()
  @IsString()
  providerKey?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  environment?: string;

  @IsOptional()
  @IsString()
  baseUrl?: string;

  @IsOptional()
  @IsString()
  authType?: string;

  @IsOptional()
  @IsObject()
  credentialsJson?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  configJson?: Record<string, unknown>;
}
