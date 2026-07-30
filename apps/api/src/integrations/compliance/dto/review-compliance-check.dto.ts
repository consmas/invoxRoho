import { IsIn, IsOptional, IsString } from 'class-validator';

export class ReviewComplianceCheckDto {
  @IsString()
  @IsIn(['APPROVED', 'REJECTED', 'ESCALATED', 'FALSE_POSITIVE', 'TRUE_MATCH'])
  decision: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
