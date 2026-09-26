import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

const methods = new Set([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
]);
const errorClasses = new Set([
  'BadRequestException',
  'UnauthorizedException',
  'ForbiddenException',
  'NotFoundException',
  'ConflictException',
  'ServiceUnavailableException',
  'ThrottlerException',
  'HttpException',
]);

export function createHttpTelemetry(
  send: (line: string) => void = (line) => {
    process.stdout.write(`${line}\n`);
  },
  env: NodeJS.ProcessEnv = process.env,
) {
  const environment = ['production', 'staging', 'development'].includes(
    env.DEPLOY_ENV ?? '',
  )
    ? env.DEPLOY_ENV
    : 'development';
  const release = /^[a-f0-9]{7,40}$/.test(env.APP_RELEASE ?? '')
    ? env.APP_RELEASE
    : 'unversioned';
  return (request: Request, response: Response, next: NextFunction) => {
    const requestId = randomUUID();
    const started = performance.now();
    let recorded = false;
    response.setHeader('X-Request-Id', requestId);
    const record = (aborted: boolean) => {
      if (recorded) return;
      recorded = true;
      // Only the router's registered template, never originalUrl/path/params.
      const registered: unknown = (
        request.route as { path?: unknown } | undefined
      )?.path;
      const route =
        typeof registered === 'string' &&
        /^[A-Za-z0-9_/:{}*().-]{1,180}$/.test(registered)
          ? registered
          : 'unmatched';
      const event = {
        event: 'HTTP_REQUEST',
        timestamp: new Date().toISOString(),
        requestId,
        environment,
        release,
        route,
        method: methods.has(request.method) ? request.method : 'OTHER',
        status: aborted ? 499 : response.statusCode,
        durationMs: Math.round((performance.now() - started) * 100) / 100,
        errorClass:
          typeof response.locals.telemetryErrorClass === 'string' &&
          (errorClasses.has(response.locals.telemetryErrorClass) ||
            response.locals.telemetryErrorClass === 'UnexpectedError')
            ? response.locals.telemetryErrorClass
            : null,
      };
      // Monitoring must not break a business response if its sink fails.
      try {
        send(JSON.stringify(event));
      } catch {
        /* no raw sink exception */
      }
    };
    response.once('finish', () => record(false));
    response.once('close', () => record(!response.writableFinished));
    next();
  };
}

@Catch()
export class SafeHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    const isHttp = exception instanceof HttpException;
    const name = exception instanceof Error ? exception.constructor.name : '';
    response.locals.telemetryErrorClass = errorClasses.has(name)
      ? name
      : 'UnexpectedError';
    if (response.headersSent) {
      response.end();
      return;
    }
    if (isHttp) {
      const status = exception.getStatus();
      // Nest maps parser/URI SyntaxErrors to BadRequestException and discards
      // their original class. They occur before a route has been selected.
      if (status === 400 && !request.route) {
        response
          .status(400)
          .json({ statusCode: 400, message: 'Solicitud no válida.' });
        return;
      }
      const body = exception.getResponse();
      response
        .status(status)
        .json(
          typeof body === 'string'
            ? { statusCode: status, message: body }
            : body,
        );
      return;
    }
    // Body parser errors are not Nest HttpExceptions. Preserve their 4xx class
    // without returning a parse error that can contain fragments of the body.
    const parserStatus =
      exception instanceof Error && 'status' in exception
        ? exception.status
        : undefined;
    const status =
      typeof parserStatus === 'number' &&
      parserStatus >= 400 &&
      parserStatus < 500
        ? parserStatus
        : 500;
    response.status(status).json({
      statusCode: status,
      message:
        status < 500
          ? 'Solicitud no válida.'
          : 'Servicio temporalmente no disponible. Vuelve a intentarlo.',
    });
  }
}
