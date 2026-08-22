"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { Button } from "@/components/ui/Button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!auth.isLoaded) return;
    if (!auth.isSignedIn) {
      router.replace("/login");
    } else if (!auth.isReady && !auth.error) {
      router.replace("/auth/continue");
    }
  }, [auth.error, auth.isLoaded, auth.isReady, auth.isSignedIn, router]);

  if (auth.error) {
    return (
      <div className="dashboard-shell flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md rounded-lg border border-[var(--dash-border)] bg-[var(--dash-surface)] p-6 text-center">
          <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--dash-text)]">
            No pudimos abrir tu panel
          </h1>
          <p className="mt-2 text-sm text-[var(--dash-text-muted)]">{auth.error}</p>
          <Button className="mt-5" onClick={() => void auth.refresh()}>
            Intentar de nuevo
          </Button>
        </div>
      </div>
    );
  }

  if (!auth.isReady) {
    return (
      <div
        role="status"
        className="dashboard-shell flex min-h-screen items-center justify-center text-sm text-[var(--dash-text-muted)]"
      >
        Preparando tu panel…
      </div>
    );
  }

  return (
    <div className="dashboard-shell flex min-h-screen">
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
