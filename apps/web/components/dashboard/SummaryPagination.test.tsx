import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SummaryPagination } from './SummaryPagination';

describe('SummaryPagination', () => {
  it('no ocupa espacio cuando existe una sola página', () => {
    const { container } = render(
      <SummaryPagination label="Páginas de agenda" page={1} totalPages={1} onPage={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('expone navegación accesible y desactiva el límite inicial', () => {
    render(
      <SummaryPagination label="Páginas de agenda" page={1} totalPages={3} onPage={vi.fn()} />,
    );

    expect(screen.getByRole('navigation', { name: 'Páginas de agenda' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled();
    expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();
  });

  it('solicita páginas adyacentes y respeta el límite final', () => {
    const onPage = vi.fn();
    const { rerender } = render(
      <SummaryPagination label="Páginas de carga" page={2} totalPages={3} onPage={onPage} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(onPage.mock.calls).toEqual([[1], [3]]);

    rerender(
      <SummaryPagination label="Páginas de carga" page={3} totalPages={3} onPage={onPage} />,
    );
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });
});
