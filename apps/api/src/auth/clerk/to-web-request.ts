import type { Request } from 'express';

/**
 * Convierte un Express Request en un Request estándar de la Web Fetch API
 * para su consumo por el SDK de Clerk (authenticateRequest).
 */
export function toWebRequest(request: Request): globalThis.Request {
  const headers = new Headers();

  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      value.forEach((item) => headers.append(name, item));
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }

  const protocol = request.protocol || 'http';
  const host = request.get('host') || 'localhost';
  const path = request.originalUrl || request.url || '/';

  return new globalThis.Request(`${protocol}://${host}${path}`, {
    method: request.method,
    headers,
  });
}
