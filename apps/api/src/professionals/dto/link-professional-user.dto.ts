import { IsUUID } from 'class-validator';
import { Transform, type TransformFnParams } from 'class-transformer';

export class LinkProfessionalUserDto {
  @Transform(trimString)
  @IsUUID()
  userId!: string;
}

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}
