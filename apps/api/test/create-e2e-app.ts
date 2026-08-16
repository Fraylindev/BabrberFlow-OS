import type { Server } from 'node:http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { globalValidationPipeOptions } from '../src/common/validation.config';

export function requestApp(app: INestApplication): ReturnType<typeof request> {
  return request(app.getHttpServer() as Server);
}

export async function createE2eApp(
  configure?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<INestApplication> {
  let builder = Test.createTestingModule({
    imports: [AppModule],
  });
  if (configure) {
    builder = configure(builder);
  }

  const moduleFixture = await builder.compile();
  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe(globalValidationPipeOptions));
  await app.init();
  return app;
}
