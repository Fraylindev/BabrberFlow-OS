"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "./Button";

interface DateTimePickerProps {
  id?: string;
  name?: string;
  value?: string;
  onChange: (isoString: string) => void;
  label?: string;
  required?: boolean;
}

const DAYS = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export function DateTimePicker({ value, onChange, label, required, id, name }: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Parse inicial. Ignoramos todo si no hay value.
  const initialDate = value ? new Date(value) : null;

  const [tempDate, setTempDate] = useState<Date | null>(initialDate);
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    if (initialDate && !isNaN(initialDate.getTime())) {
      return new Date(initialDate.getFullYear(), initialDate.getMonth(), 1);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      const current = value ? new Date(value) : null;
      setTempDate(current);
      if (current && !isNaN(current.getTime())) {
        setViewMonth(new Date(current.getFullYear(), current.getMonth(), 1));
      } else {
        const now = new Date();
        setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
      }
      setIsOpen(true);
    }
  };

  // Cerrar al clickear fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (isOpen && popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isOpen && e.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Cálculos de calendario
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = getFirstDayOfMonth(year, month);
  const daysInMonth = getDaysInMonth(year, month);

  const prevMonth = () => setViewMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setViewMonth(new Date(year, month + 1, 1));

  // Manejo de selecciones
  const handleDaySelect = (day: number) => {
    const now = new Date();
    const newDate = new Date(year, month, day);
    
    // Si ya teníamos una hora seleccionada, la mantenemos
    if (tempDate) {
      newDate.setHours(tempDate.getHours(), tempDate.getMinutes(), 0, 0);
    } else {
      // Valor por defecto: la hora siguiente redondeada
      const nextHour = new Date(now);
      nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
      newDate.setHours(nextHour.getHours(), nextHour.getMinutes(), 0, 0);
    }
    setTempDate(newDate);
  };

  const handleTimeChange = (type: "hour" | "minute", val: number) => {
    if (!tempDate) return;
    const newDate = new Date(tempDate);
    if (type === "hour") newDate.setHours(val);
    if (type === "minute") newDate.setMinutes(val);
    setTempDate(newDate);
  };

  // Validaciones
  const now = new Date();
  
  const isDayDisabled = (day: number) => {
    // Si el día entero ya pasó (fin del día < ahora)
    const endOfDay = new Date(year, month, day, 23, 59, 59, 999);
    return endOfDay < now;
  };

  const isInvalidTime = tempDate ? tempDate <= now : false;

  const handleApply = () => {
    if (tempDate && !isInvalidTime) {
      onChange(tempDate.toISOString());
      setIsOpen(false);
    }
  };

  // Renderizado del trigger (input simulado)
  const formatTrigger = (d: Date | null) => {
    if (!d || isNaN(d.getTime())) return "Seleccionar fecha y hora...";
    return d.toLocaleString("es-DO", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="relative flex flex-col gap-1.5" ref={popoverRef}>
      {label && (
        <label className="text-xs font-medium uppercase tracking-wider text-[var(--dash-text-muted)]">
          {label} {required && "*"}
        </label>
      )}
      
      {/* Input hidden estricto para el formulario (requerido nativo) */}
      <input type="hidden" id={id} name={name} value={value || ""} required={required} />

      <button
        type="button"
        onClick={handleToggle}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between rounded-sm border border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] px-3 py-2 text-sm text-[var(--dash-text)] outline-none focus:border-[var(--dash-accent)] focus:ring-1 focus:ring-[var(--dash-accent)] transition-colors text-left"
      >
        <span>{formatTrigger(initialDate)}</span>
        <svg className="w-4 h-4 text-[var(--dash-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {isOpen && (
        <div 
          role="dialog"
          aria-modal="true"
          className="absolute top-full z-50 mt-1 w-72 rounded-sm border border-[var(--dash-border)] bg-[var(--dash-surface)] p-3 shadow-lg"
        >
          {/* Header de navegación del mes */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 hover:bg-[var(--dash-surface-raised)] rounded-sm text-[var(--dash-text-muted)] hover:text-[var(--dash-text)] transition-colors"
              aria-label="Mes anterior"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-sm font-semibold text-[var(--dash-text)]">
              {MONTHS[month]} {year}
            </div>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 hover:bg-[var(--dash-surface-raised)] rounded-sm text-[var(--dash-text-muted)] hover:text-[var(--dash-text)] transition-colors"
              aria-label="Mes siguiente"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-medium text-[var(--dash-text-muted)]">
                {d}
              </div>
            ))}
          </div>

          {/* Cuadrícula de días */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const disabled = isDayDisabled(day);
              const isSelected = tempDate?.getDate() === day && tempDate?.getMonth() === month && tempDate?.getFullYear() === year;
              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleDaySelect(day)}
                  className={`flex h-8 w-8 items-center justify-center rounded-sm text-sm transition-colors ${
                    disabled 
                      ? "opacity-30 cursor-not-allowed" 
                      : isSelected
                        ? "bg-[var(--dash-accent)] text-white font-medium"
                        : "hover:bg-[var(--dash-surface-raised)] text-[var(--dash-text)]"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Selector de Tiempo */}
          {tempDate && (
            <div className="border-t border-[var(--dash-border-strong)] pt-3 mb-3">
              <label className="text-[10px] font-medium uppercase tracking-wider text-[var(--dash-text-muted)] block mb-1.5">
                Hora (24h)
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={tempDate.getHours()}
                  onChange={(e) => handleTimeChange("hour", Number(e.target.value))}
                  className="w-full rounded-sm border border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] px-2 py-1 text-sm text-[var(--dash-text)] outline-none focus:border-[var(--dash-accent)]"
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                  ))}
                </select>
                <span className="text-[var(--dash-text)] font-medium">:</span>
                <select
                  value={tempDate.getMinutes()}
                  onChange={(e) => handleTimeChange("minute", Number(e.target.value))}
                  className="w-full rounded-sm border border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] px-2 py-1 text-sm text-[var(--dash-text)] outline-none focus:border-[var(--dash-accent)]"
                >
                  {[0, 15, 30, 45].map((m) => (
                    <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Error inline */}
          {isInvalidTime && (
             <p className="text-xs text-[var(--dash-danger)] mb-3">
               La fecha y hora deben ser posteriores al momento actual.
             </p>
          )}

          {/* Acciones */}
          <div className="flex items-center justify-end gap-2 border-t border-[var(--dash-border)] pt-3">
            <Button type="button" tone="light" variant="ghost" className="px-2 py-1 text-xs" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" tone="light" className="px-3 py-1 text-xs" disabled={!tempDate || isInvalidTime} onClick={handleApply}>
              Aplicar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
