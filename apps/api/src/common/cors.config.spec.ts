import {
  Controller,
  Get,
  HttpException,
  Module,
  Res,
  UseGuards,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Response } from 'express';
import request from 'supertest';
import { configureCors } from './cors.config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

@Controller()
class CorsProbeController {
  @Get('standard-limited')
  @UseGuards(ThrottlerGuard)
  standard() {
    return { ok: true };
  }
  @Get('limited')
  limited(@Res({ passthrough: true }) response: Response) {
    response.setHeader('Retry-After', '17');
    throw new HttpException('Demasiados intentos.', 429);
  }
}
@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60000, limit: 100 }],
      storage: {
        increment: () =>
          Promise.resolve({
            totalHits: 101,
            timeToExpire: 17,
            isBlocked: true,
            timeToBlockExpire: 17,
          }),
      },
    }),
  ],
  controllers: [CorsProbeController],
})
class CorsProbeModule {}

const existing = [
  'X-Total-Count',
  'X-Page',
  'X-Limit',
  'X-Total-Pages',
  'X-Request-Id',
];

describe('production CORS configuration', () => {
  let app: NestExpressApplication;
  beforeEach(async () => {
    app = await NestFactory.create<NestExpressApplication>(CorsProbeModule, {
      logger: false,
    });
    configureCors(app, 'https://web.example');
    await app.init();
  });
  afterEach(async () => {
    await app.close();
  });

  it('exposes Retry-After on 429 and preserves exactly the five existing headers', async () => {
    const response = await request(app.getHttpServer())
      .get('/limited')
      .set('Origin', 'https://web.example')
      .expect(429);
    expect(response.headers['retry-after']).toBe('17');
    expect(response.headers['access-control-allow-origin']).toBe(
      'https://web.example',
    );
    expect(response.headers['access-control-allow-credentials']).toBe('true');
    expect(
      response.headers['access-control-expose-headers'].split(','),
    ).toEqual([...existing, 'Retry-After']);
  });

  it('the standard default limiter emits Retry-After on its real 429 response', async () => {
    const response = await request(app.getHttpServer())
      .get('/standard-limited')
      .set('Origin', 'https://web.example')
      .expect(429);
    expect(response.headers['retry-after']).toBe('17');
    expect(
      response.headers['access-control-expose-headers'].split(','),
    ).toContain('Retry-After');
  });

  it('preserves preflight methods and reflected request headers', async () => {
    const response = await request(app.getHttpServer())
      .options('/limited')
      .set('Origin', 'https://web.example')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'authorization,x-organization-id')
      .expect(204);
    expect(response.headers['access-control-allow-methods']).toBe(
      'GET,HEAD,PUT,PATCH,POST,DELETE',
    );
    expect(response.headers['access-control-allow-headers']).toBe(
      'authorization,x-organization-id',
    );
  });

  it.each(['get', 'options'] as const)(
    'does not authorize a denied origin on %s',
    async (method) => {
      const response = await request(app.getHttpServer())
        [method]('/limited')
        .set('Origin', 'https://denied.example')
        .set('Access-Control-Request-Method', 'POST');
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    },
  );
});
