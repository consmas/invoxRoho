import { IsObject } from 'class-validator';

export class ProductRecordDto {
  @IsObject()
  data: Record<string, unknown>;
}
