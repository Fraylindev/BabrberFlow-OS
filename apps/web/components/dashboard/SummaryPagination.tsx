'use client';

import { Button } from '@/components/ui/Button';

type SummaryPaginationProps = {
  label: string;
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
};

export function SummaryPagination({ label, page, totalPages, onPage }: SummaryPaginationProps) {
  if (totalPages <= 1 && page === 1) return null;

  return (
    <nav
      aria-label={label}
      className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--dash-border)] pt-3 text-xs text-[var(--dash-text-muted)]"
    >
      <Button
        tone="light"
        variant="secondary"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        Anterior
      </Button>
      <span>
        Página {page} de {Math.max(totalPages, 1)}
      </span>
      <Button
        tone="light"
        variant="secondary"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        Siguiente
      </Button>
    </nav>
  );
}
