import type { NestExpressApplication } from '@nestjs/platform-express';

export function configureCors(
  app: NestExpressApplication,
  origins = process.env.CORS_ALLOWED_ORIGINS,
) {
  const allowedOrigins = origins
    ? origins.split(',').map((o) => o.trim())
    : ['http://localhost:3000', 'http://localhost:3001'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    exposedHeaders: [
      'X-Total-Count',
      'X-Page',
      'X-Limit',
      'X-Total-Pages',
      'X-Request-Id',
      'Retry-After',
    ],
  });
}
