import { ValidationPipeOptions } from '@nestjs/common';

export const globalValidationPipeOptions: ValidationPipeOptions = {
  whitelist: true, // Elimina campos no definidos en el DTO
  forbidNonWhitelisted: true, // Lanza error si envían campos extra
};
