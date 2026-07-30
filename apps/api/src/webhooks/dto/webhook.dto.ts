import {
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';

export class CreateWebhookEndpointDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsUrl({ require_tld: false })
  url: string;

  @IsOptional()
  @IsString()
  secret?: string;

  @IsArray()
  events: string[];
}

export class UpdateWebhookEndpointDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  url?: string;

  @IsOptional()
  @IsString()
  secret?: string;

  @IsOptional()
  @IsArray()
  events?: string[];

  @IsOptional()
  @IsString()
  status?: string;
}
