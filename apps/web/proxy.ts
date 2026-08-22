import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Clerk resuelve únicamente si existe una sesión antes de renderizar el
 * dashboard. NestJS sigue resolviendo User, Membership, tenant y rol local
 * en cada request; este proxy no concede permisos de negocio.
 */
export const proxy = clerkMiddleware(async (auth, request) => {
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    const session = await auth();
    if (!session.userId) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico)).*)"],
};
