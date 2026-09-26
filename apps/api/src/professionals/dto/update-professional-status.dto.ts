import { ProfessionalStatus } from '@prisma/client';
import { IsIn } from 'class-validator';

export type OperableProfessionalStatus = Exclude<
  ProfessionalStatus,
  'ARCHIVED'
>;

export class UpdateProfessionalStatusDto {
  @IsIn([ProfessionalStatus.ACTIVE, ProfessionalStatus.INACTIVE])
  status!: OperableProfessionalStatus;
}
