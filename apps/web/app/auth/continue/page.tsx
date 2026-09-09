"use client";

import { Suspense, useEffect } from "react";
import { useAuth as useClerkAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { resolveDashboardRedirect } from "@/lib/auth-routes";

export default function AuthContinuePage() {
  return (
    <Suspense fallback={null}>
      <AuthContinueContent />
    </Suspense>
  );
}

function AuthContinueContent() {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = resolveDashboardRedirect(searchParams.get("next"));

  useEffect(() => {
    if (!isLoaded) return;
    router.replace(
      isSignedIn ? next : `/login?next=${encodeURIComponent(next)}`,
    );
  }, [isLoaded, isSignedIn, next, router]);

  return (
    <AuthShell
      eyebrow="Acceso seguro"
      title="Abriendo Kortek"
      description="Tu cuenta se gestiona de forma segura con Clerk."
    >
      <p role="status" className="text-sm text-[var(--color-muted)]">
        Cargando…
      </p>
    </AuthShell>
  );
}
