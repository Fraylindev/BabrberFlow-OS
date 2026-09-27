import { Controller, Get, Module, Req } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request } from 'express';
import request from 'supertest';
import { configureProxyTrust } from './proxy-trust';

@Controller()
class ProbeController {
  @Get()
  read(@Req() req: Request) {
    return { ip: req.ip };
  }
}

@Module({ controllers: [ProbeController] })
class ProbeModule {}

describe('reverse proxy client address boundary', () => {
  let app: NestExpressApplication;
  afterEach(async () => {
    await app?.close();
  });

  async function create(environment: string) {
    app = await NestFactory.create<NestExpressApplication>(ProbeModule, {
      logger: false,
    });
    configureProxyTrust(app, { DEPLOY_ENV: environment });
    await app.init();
  }

  it('ignores forwarding headers in development', async () => {
    await create('development');
    const response = await request(app.getHttpServer())
      .get('/')
      .set('X-Forwarded-For', '198.51.100.7')
      .expect(200);
    expect((response.body as { ip: string }).ip).toMatch(/127\.0\.0\.1|::1/);
  });

  it('uses the address supplied by the loopback proxy and ignores a forged earlier hop', async () => {
    await create('production');
    const response = await request(app.getHttpServer())
      .get('/')
      .set('X-Forwarded-For', '203.0.113.99, 198.51.100.7')
      .expect(200);
    expect((response.body as { ip: string }).ip).toBe('198.51.100.7');
  });

  it('does not trust private or public remote peers', async () => {
    await create('staging');
    const trust = app.getHttpAdapter().getInstance().get('trust proxy fn') as (
      address: string,
      hop: number,
    ) => boolean;
    expect(trust('127.0.0.1', 0)).toBe(true);
    expect(trust('::1', 0)).toBe(true);
    expect(trust('10.0.1.128', 0)).toBe(false);
    expect(trust('198.51.100.7', 0)).toBe(false);
  });
});
