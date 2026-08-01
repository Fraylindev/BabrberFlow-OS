import { NextRequest, NextResponse } from "next/server";

/**
 * Protección de /dashboard/* antes de que la ruta se renderice.
 *
 * Nota de versión: en Next.js 16 el archivo `middleware.ts` quedó
 * deprecado a favor de `proxy.ts` (mismo `config.matcher`, la función
 * exportada pasa de `middleware` a `proxy`). El runtime ya no es Edge por
 * defecto sino Node — no cambia nada de la lógica de abajo, que no depende
 * de APIs exclusivas de Edge.
 *
 * Esto NO es la capa de autorización real — solo evita el parpadeo de
 * "Cargando…" que ocurría antes al depender exclusivamente del guard de
 * cliente en app/dashboard/layout.tsx. Este archivo corre antes del render
 * y no tiene acceso a localStorage (donde vive el JWT real), así que solo
 * puede comprobar la presencia de la cookie `kb_session` que
 * auth-context.tsx escribe/borra junto con la sesión.
 *
 * La autorización de verdad sigue viviendo donde debe: en el backend
 * (JwtAuthGuard + RolesGuard sobre cada endpoint). Este archivo es una
 * mejora de UX/percepción de velocidad, no un límite de seguridad.
 */

const SESSION_FLAG_COOKIE = "kb_session";

export function proxy(request: NextRequest) {
  const hasSessionFlag = request.cookies.has(SESSION_FLAG_COOKIE);

  if (!hasSessionFlag) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
