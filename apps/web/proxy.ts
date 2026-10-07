import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Clerk puede emitir un token unos segundos por delante del reloj local.
// Mantener la misma tolerancia acotada del verificador Nest evita que el
// navegador y el middleware discrepen sin relajar las demás validaciones.
const CLERK_SESSION_CLOCK_SKEW_MS = 10_000;

/**
 * Clerk resuelve únicamente si existe una sesión antes de renderizar el
 * dashboard. NestJS sigue resolviendo User, Membership, tenant y rol local
 * en cada request; este proxy no concede permisos de negocio.
 */
export const proxy = clerkMiddleware(
  async (auth, request) => {
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
      const session = await auth();
      if (!session.userId) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('next', request.nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
    return NextResponse.next();
  },
  { clockSkewInMs: CLERK_SESSION_CLOCK_SKEW_MS },
);

export const config = {
  // Las páginas públicas no necesitan atravesar el middleware de autenticación.
  // El middleware permanece en cada ruta que crea, recupera o consume sesión.
  matcher: [
    '/dashboard/:path*',
    '/auth/:path*',
    '/login/:path*',
    '/register/:path*',
    '/accept-invitation/:path*',
    '/invitation-login/:path*',
  ],
};
