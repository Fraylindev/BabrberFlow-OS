import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  // Activamos validación estricta en toda la aplicación
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Elimina campos no definidos en el DTO
      forbidNonWhitelisted: true, // Lanza error si envían campos extra
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

// Manejamos la promesa para cumplir con las reglas estrictas de ESLint
bootstrap().catch((err) => {
  console.error('Error starting server:', err);
});
