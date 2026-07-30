import { IsObject } from 'class-validator';

export class CreateOperationRecordDto {
  @IsObject()
  data: Record<string, unknown>;
}
