"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

const STORAGE_KEY = "kortek_cookie_consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem(STORAGE_KEY);
      if (!consent) {
        // Small delay so it smoothly slides in after initial page render
        const timer = setTimeout(() => setVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // LocalStorage unavailable (e.g. private browsing strict mode)
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {
      // Ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      aria-label="Aviso de privacidad y cookies"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 sm:max-w-md animate-fade-in"
    >
      <div className="rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)]/95 p-5 shadow-2xl backdrop-blur-md">
        <div className="flex items-start gap-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-brass)]">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-paper)]">
              Privacidad y Cookies Esenciales
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-muted)]">
              Empleamos únicamente almacenamiento local y cookies técnicas estrictamente necesarias para autenticación segura y el flujo de reservas. Sin rastreadores comerciales ni venta de datos.
            </p>

            <div className="mt-4 flex items-center gap-3">
              <Button
                type="button"
                onClick={handleAccept}
                className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider cursor-pointer"
              >
                Entendido
              </Button>
              <Link
                href="/cookies"
                className="text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-paper)] underline underline-offset-4 transition-colors"
              >
                Leer política de cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
