'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Client } from '@/lib/api';

interface ClientAutocompleteProps {
  clients: Client[];
  value: string;
  onChange: (clientId: string) => void;
  id?: string;
  name?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

const MAX_VISIBLE_RESULTS = 20;

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es');
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function ClientAutocomplete({
  clients,
  value,
  onChange,
  id,
  name,
  label = 'Cliente',
  required = false,
  disabled = false,
}: ClientAutocompleteProps) {
  const generatedId = useId();
  const controlId = id ?? `client-search-${generatedId}`;
  const listboxId = `${controlId}-listbox`;
  const helpId = `${controlId}-help`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const selectedClient = clients.find((client) => client.id === value) ?? null;
  const filteredClients = useMemo(() => {
    const search = normalizeSearch(query.trim());
    if (!search) return [];

    const searchDigits = query.replace(/\D/g, '');
    return clients.filter((client) => {
      const nameMatches = normalizeSearch(client.name).includes(search);
      const phone = client.phone ?? '';
      const phoneMatches =
        normalizeSearch(phone).includes(search) ||
        (searchDigits.length > 0 && phone.replace(/\D/g, '').includes(searchDigits));
      return nameMatches || phoneMatches;
    });
  }, [clients, query]);
  const visibleClients = filteredClients.slice(0, MAX_VISIBLE_RESULTS);
  const hasQuery = query.trim().length > 0;
  const suggestionsVisible = isOpen && hasQuery;

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  function selectClient(client: Client) {
    onChange(client.id);
    setQuery('');
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function clearSelection() {
    onChange('');
    setQuery('');
    setIsOpen(false);
    setActiveIndex(-1);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape' && suggestionsVisible) {
      event.preventDefault();
      event.stopPropagation();
      event.nativeEvent.stopImmediatePropagation();
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (visibleClients.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => (current < visibleClients.length - 1 ? current + 1 : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => (current > 0 ? current - 1 : visibleClients.length - 1));
    } else if (event.key === 'Enter' && suggestionsVisible && activeIndex >= 0) {
      event.preventDefault();
      const client = visibleClients[activeIndex];
      if (client) selectClient(client);
    }
  }

  return (
    <div ref={rootRef} className="flex flex-col gap-1.5">
      <label
        htmlFor={controlId}
        className="text-xs font-semibold uppercase tracking-wider text-[var(--dash-text-muted)]"
      >
        {label} {required && <span aria-hidden="true">*</span>}
        {required && <span className="sr-only"> (obligatorio)</span>}
      </label>

      <input type="hidden" name={name} value={value} />

      {selectedClient ? (
        <div className="flex min-w-0 items-center gap-3 rounded-lg border border-[var(--dash-accent)]/25 bg-[var(--dash-accent-soft)] p-3 shadow-sm">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--dash-accent)] text-xs font-bold text-white"
          >
            {getInitials(selectedClient.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--dash-text)]">
              {selectedClient.name}
            </p>
            <p className="truncate text-xs text-[var(--dash-text-muted)]">
              {selectedClient.phone || selectedClient.email || 'Sin datos de contacto'}
            </p>
          </div>
          <button
            id={controlId}
            type="button"
            onClick={clearSelection}
            disabled={disabled}
            className="shrink-0 rounded-md px-2 py-1.5 text-xs font-semibold text-[var(--dash-accent)] outline-none transition-colors hover:bg-white/70 focus-visible:ring-2 focus-visible:ring-[var(--dash-accent)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cambiar
            <span className="sr-only"> cliente</span>
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dash-text-muted)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
              />
            </svg>
            <input
              ref={inputRef}
              id={controlId}
              type="search"
              role="combobox"
              autoComplete="off"
              value={query}
              disabled={disabled}
              placeholder="Busca por nombre o teléfono"
              aria-autocomplete="list"
              aria-expanded={suggestionsVisible}
              aria-controls={listboxId}
              aria-activedescendant={
                suggestionsVisible && activeIndex >= 0
                  ? `${controlId}-option-${activeIndex}`
                  : undefined
              }
              aria-describedby={helpId}
              onFocus={() => {
                if (hasQuery) setIsOpen(true);
              }}
              onChange={(event) => {
                setQuery(event.target.value);
                setIsOpen(true);
                setActiveIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              className="min-h-11 w-full rounded-lg border border-[var(--dash-border-strong)] bg-[var(--dash-surface)] py-2.5 pl-10 pr-3 text-sm text-[var(--dash-text)] shadow-sm outline-none transition-[border-color,box-shadow] placeholder:text-[var(--dash-text-faint)] focus-visible:border-[var(--dash-accent)] focus-visible:ring-2 focus-visible:ring-[var(--dash-accent-soft)] disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <p id={helpId} className="text-xs text-[var(--dash-text-muted)]">
            Escribe para buscar dentro de los clientes disponibles.
          </p>

          {suggestionsVisible && (
            <div className="overflow-hidden rounded-lg border border-[var(--dash-border-strong)] bg-[var(--dash-surface)] shadow-[var(--dash-shadow-raised)]">
              {visibleClients.length > 0 ? (
                <>
                  <ul
                    id={listboxId}
                    role="listbox"
                    aria-label="Coincidencias de clientes"
                    className="max-h-56 overflow-y-auto overscroll-contain p-1"
                  >
                    {visibleClients.map((client, index) => {
                      const isActive = index === activeIndex;
                      return (
                        <li
                          key={client.id}
                          id={`${controlId}-option-${index}`}
                          role="option"
                          aria-selected={isActive}
                          onMouseEnter={() => setActiveIndex(index)}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            selectClient(client);
                          }}
                          className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors ${
                            isActive
                              ? 'bg-[var(--dash-accent-soft)]'
                              : 'hover:bg-[var(--dash-surface-raised)]'
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                              isActive
                                ? 'bg-[var(--dash-accent)] text-white'
                                : 'bg-[var(--dash-surface-raised)] text-[var(--dash-text-muted)]'
                            }`}
                          >
                            {getInitials(client.name)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-[var(--dash-text)]">
                              {client.name}
                            </span>
                            <span className="block truncate text-xs text-[var(--dash-text-muted)]">
                              {client.phone || client.email || 'Sin datos de contacto'}
                            </span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  {filteredClients.length > MAX_VISIBLE_RESULTS && (
                    <p className="border-t border-[var(--dash-border)] px-3 py-2 text-xs text-[var(--dash-text-muted)]">
                      Refina la búsqueda para ver más coincidencias.
                    </p>
                  )}
                </>
              ) : (
                <p
                  role="status"
                  className="px-4 py-5 text-center text-sm text-[var(--dash-text-muted)]"
                >
                  Sin coincidencias para “{query.trim()}”.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
