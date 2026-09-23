import {
  type CallHandler,
  type ExecutionContext,
  HttpException,
  Injectable,
  type NestInterceptor,
  ServiceUnavailableException,
} from '@nestjs/common';
import { catchError, throwError } from 'rxjs';

@Injectable()
export class NotificationsErrorInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler) {
    return next
      .handle()
      .pipe(
        catchError((error: unknown) =>
          throwError(() =>
            error instanceof HttpException
              ? error
              : new ServiceUnavailableException(
                  'No pudimos consultar los avisos. Inténtalo de nuevo',
                ),
          ),
        ),
      );
  }
}
