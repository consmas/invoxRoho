import { CounterpartyType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class AddProgrammeParticipantDto {
  @IsUUID()
  counterpartyId: string;

  @IsEnum(CounterpartyType)
  participantType: CounterpartyType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
