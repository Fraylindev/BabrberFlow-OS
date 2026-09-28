"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

type ToastType = "success" | "error" | "info";

interface ToastMessage {
  id: number;
  text: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (text: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe usarse dentro de un ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = useCallback((text: string, type: ToastType = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Contenedor flotante inferior derecho, moderno y limpio */}
      <div className="fixed bottom-5 right-5 z-50 flex max-w-sm w-full flex-col gap-2.5 pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex items-center gap-3.5 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)]/95 px-4 py-3 shadow-[var(--shadow-raised)] backdrop-blur-md transition-all duration-[var(--duration-base)] ease-[var(--ease-out)] animate-in fade-in slide-in-from-bottom-2"
          >
            {t.type === "success" && (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                <svg className="h-3.5 w-3.5 stroke-emerald-400" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            )}
            {t.type === "error" && (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/15 border border-red-500/30 text-red-400">
                <svg className="h-3.5 w-3.5 stroke-red-400" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </span>
            )}
            {t.type === "info" && (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-400">
                <svg className="h-3.5 w-3.5 stroke-sky-400" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </span>
            )}
            <p className="text-sm font-medium text-[var(--color-paper)] truncate">{t.text}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
