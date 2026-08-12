import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { CLIENT_SEARCH_MAX_LENGTH } from '../clients.constants';

export class QueryClientsDto {
  @IsOptional()
  @IsString()
  @Matches(/\S/, { message: 'search no puede estar vacío' })
  @MaxLength(CLIENT_SEARCH_MAX_LENGTH)
  search?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  isActive?: 'true' | 'false';

  @IsOptional()
  @Matches(/^[1-9]\d*$/, { message: 'page debe ser un entero positivo' })
  page?: string;

  @IsOptional()
  @Matches(/^(?:[1-9]|[1-9]\d|100)$/, {
    message: 'limit debe ser un entero entre 1 y 100',
  })
  limit?: string;
}
