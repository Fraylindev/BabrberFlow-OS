import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cabeceras de seguridad HTTP estándar (X-Content-Type-Options,
  // X-Frame-Options, HSTS, etc.) — no existía ninguna protección de este
  // tipo antes. Sin configuración especial: los valores por defecto de
  // Helmet ya cubren lo básico para una API REST (no sirve HTML propio).
  app.use(helmet());

  // Antes: enableCors() sin argumentos = cualquier origen, cualquier
  // método, sin restricción — abierto a cualquier sitio web del mundo.
  // Ahora: lista explícita desde CORS_ALLOWED_ORIGINS (.env). Si no está
  // configurada, cae a los orígenes de desarrollo local conocidos — para
  // no romper `pnpm dev` de nadie, pero sin dejar production abierto por
  // accidente si alguien olvida configurar la variable.
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:3000', 'http://localhost:3001'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Sin esto, Nest no reenvía SIGTERM/SIGINT a los hooks de ciclo de vida
  // de los módulos — PrismaService.onModuleDestroy() (que llama a
  // $disconnect()) nunca se garantizaba que corriera en un apagado real
  // de contenedor/orquestador. Cambio de bajo riesgo, alto valor: cierre
  // limpio de conexiones en cada redeploy en vez de dejarlas colgadas.
  app.enableShutdownHooks();

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
