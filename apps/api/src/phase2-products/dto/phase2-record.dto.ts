import { IsObject } from 'class-validator';

export class Phase2RecordDto {
  @IsObject()
  data: Record<string, unknown>;
}
