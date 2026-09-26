import {
  Controller,
  Get,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createHttpTelemetry, SafeHttpExceptionFilter } from './http-telemetry';

const privateMarker = 'PRIVATE_body_email_token_note_signed_url';
@Controller('telemetry-drill')
class DrillController {
  @Get(':id')
  fail() {
    throw new Error(privateMarker);
  }
  @Post()
  unavailable() {
    throw new ServiceUnavailableException('Inténtalo más tarde.');
  }
}

describe('HTTP telemetry privacy and exception tracking', () => {
  let app: INestApplication;
  let lines: string[];
  beforeEach(async () => {
    lines = [];
    const module = await Test.createTestingModule({
      controllers: [DrillController],
    }).compile();
    app = module.createNestApplication({ logger: false });
    app.use(
      createHttpTelemetry((line) => lines.push(line), {
        DEPLOY_ENV: 'staging',
        APP_RELEASE: '6c3caa0',
      }),
    );
    app.useGlobalFilters(new SafeHttpExceptionFilter());
    await app.listen(0, '127.0.0.1');
  });
  afterEach(async () => {
    await app.close();
  });

  it('tracks an unexpected exception without path, headers, message or stack', async () => {
    const response = await request(await app.getUrl())
      .get(`/telemetry-drill/${privateMarker}?token=${privateMarker}`)
      .set('Authorization', `Bearer ${privateMarker}`)
      .set('X-Request-Id', privateMarker)
      .expect(500);
    expect(JSON.stringify(response.body)).not.toContain(privateMarker);
    expect(lines).toHaveLength(1);
    expect(lines[0]).not.toContain(privateMarker);
    const event = JSON.parse(lines[0]) as Record<string, unknown>;
    expect(event).toMatchObject({
      event: 'HTTP_REQUEST',
      status: 500,
      route: '/telemetry-drill/:id',
      errorClass: 'UnexpectedError',
      environment: 'staging',
      release: '6c3caa0',
    });
    expect(event.requestId).toEqual(response.headers['x-request-id']);
    expect(event.durationMs).toEqual(expect.any(Number));
  });

  it('preserves known HTTP errors while collecting only their safe class', async () => {
    await request(await app.getUrl())
      .post('/telemetry-drill')
      .send({
        email: privateMarker,
        password: privateMarker,
        notes: privateMarker,
      })
      .expect(503, {
        statusCode: 503,
        message: 'Inténtalo más tarde.',
        error: 'Service Unavailable',
      });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('ServiceUnavailableException');
    expect(lines[0]).not.toContain(privateMarker);
    expect(lines[0]).not.toContain('Inténtalo');
  });

  it('redacts malformed JSON in the response and telemetry', async () => {
    await request(await app.getUrl())
      .post('/telemetry-drill')
      .set('Content-Type', 'application/json')
      .send(`{"secret":"${privateMarker}`)
      .expect(400, { statusCode: 400, message: 'Solicitud no válida.' });
    expect(lines).toHaveLength(1);
    expect(lines[0]).not.toContain(privateMarker);
  });
});
