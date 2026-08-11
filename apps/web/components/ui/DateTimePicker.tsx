"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "./Button";

interface DateTimePickerProps {
  id?: string;
  name?: string;
  value?: string;
  onChange: (isoString: string) => void;
  label?: string;
  required?: boolean;
}

type PickerStep = "date" | "time";

const DAYS = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];
const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
const MINUTE_OPTIONS = [0, 15, 30, 45];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function isValidDate(date: Date | null): date is Date {
  return date !== null && !Number.isNaN(date.getTime());
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getRoundedFutureTime(now: Date) {
  const rounded = new Date(now);
  rounded.setSeconds(0, 0);
  const remainder = rounded.getMinutes() % 15;
  rounded.setMinutes(rounded.getMinutes() + (remainder === 0 ? 15 : 15 - remainder));
  return rounded;
}

function getDateForSelectedDay(
  year: number,
  month: number,
  day: number,
  preferredDate: Date | null,
  now: Date,
) {
  const selected = new Date(year, month, day);
  const roundedFuture = getRoundedFutureTime(now);

  if (isValidDate(preferredDate)) {
    selected.setHours(preferredDate.getHours(), preferredDate.getMinutes(), 0, 0);
  } else {
    selected.setHours(roundedFuture.getHours(), roundedFuture.getMinutes(), 0, 0);
  }

  if (selected <= now && isSameDay(selected, now)) {
    selected.setHours(roundedFuture.getHours(), roundedFuture.getMinutes(), 0, 0);
  }

  return selected;
}

function formatTrigger(date: Date | null) {
  if (!isValidDate(date)) return "Seleccionar fecha y hora";

  const formattedDate = date.toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const formattedTime = date.toLocaleTimeString("es-DO", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${formattedDate} · ${formattedTime}`;
}

function formatSelectedDate(date: Date) {
  return capitalize(
    date.toLocaleDateString("es-DO", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }),
  );
}

function formatAccessibleDate(date: Date) {
  return date.toLocaleDateString("es-DO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatHourLabel(hour: number) {
  return new Date(2026, 0, 1, hour).toLocaleTimeString("es-DO", {
    hour: "numeric",
  });
}

export function DateTimePicker({
  value,
  onChange,
  label,
  required,
  id,
  name,
}: DateTimePickerProps) {
  const generatedId = useId();
  const controlId = id ?? `datetime-${generatedId}`;
  const dialogTitleId = `${controlId}-dialog-title`;
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<PickerStep>("date");
  const [tempDate, setTempDate] = useState<Date | null>(null);
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstDialogControlRef = useRef<HTMLButtonElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

  const committedDate = value ? new Date(value) : null;

  function openPicker() {
    const now = new Date();
    const current = isValidDate(committedDate) ? committedDate : null;
    const visibleDate = current && startOfDay(current) >= startOfDay(now) ? current : now;

    setTempDate(current);
    setViewMonth(new Date(visibleDate.getFullYear(), visibleDate.getMonth(), 1));
    setValidationError(null);
    setStep("date");
    setIsOpen(true);
  }

  function closePicker({ restoreFocus = true } = {}) {
    setIsOpen(false);
    setValidationError(null);
    if (restoreFocus) {
      window.setTimeout(() => triggerRef.current?.focus(), 0);
    }
  }

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => firstDialogControlRef.current?.focus(), 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        closePicker();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && step === "time") {
      window.setTimeout(() => stepHeadingRef.current?.focus(), 0);
    }
  }, [isOpen, step]);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = getFirstDayOfMonth(year, month);
  const daysInMonth = getDaysInMonth(year, month);
  const renderNow = new Date();
  const currentMonth = new Date(renderNow.getFullYear(), renderNow.getMonth(), 1);
  const canNavigateToPreviousMonth = viewMonth > currentMonth;
  const selectableMinutes = tempDate
    ? Array.from(new Set([...MINUTE_OPTIONS, tempDate.getMinutes()])).sort(
        (left, right) => left - right,
      )
    : MINUTE_OPTIONS;

  function isDayDisabled(day: number) {
    const lastQuarter = new Date(year, month, day, 23, 45, 0, 0);
    return lastQuarter <= renderNow;
  }

  function handleDaySelect(day: number) {
    const now = new Date();
    const selected = getDateForSelectedDay(year, month, day, tempDate, now);

    if (selected <= now) {
      setValidationError("Ya no quedan horarios disponibles para este día.");
      return;
    }

    setTempDate(selected);
    setValidationError(null);
    setStep("time");
  }

  function isTimeOptionDisabled(hour: number, minute: number, now = renderNow) {
    if (!tempDate || !isSameDay(tempDate, now)) return false;
    const candidate = new Date(tempDate);
    candidate.setHours(hour, minute, 0, 0);
    return candidate <= now;
  }

  function isHourDisabled(hour: number) {
    return MINUTE_OPTIONS.every((minute) => isTimeOptionDisabled(hour, minute));
  }

  function handleHourChange(hour: number) {
    if (!tempDate) return;

    const now = new Date();
    const nextDate = new Date(tempDate);
    nextDate.setHours(hour, tempDate.getMinutes(), 0, 0);

    if (isTimeOptionDisabled(hour, nextDate.getMinutes(), now)) {
      const firstValidMinute = MINUTE_OPTIONS.find(
        (minute) => !isTimeOptionDisabled(hour, minute, now),
      );
      if (firstValidMinute === undefined) return;
      nextDate.setMinutes(firstValidMinute);
    }

    setTempDate(nextDate);
    setValidationError(null);
  }

  function handleMinuteChange(minute: number) {
    if (!tempDate) return;
    const nextDate = new Date(tempDate);
    nextDate.setMinutes(minute, 0, 0);
    setTempDate(nextDate);
    setValidationError(null);
  }

  function handleConfirm() {
    const now = new Date();
    if (!tempDate || tempDate <= now) {
      setValidationError(
        "La fecha y hora deben ser posteriores al momento actual. Elige otro horario.",
      );
      return;
    }

    onChange(tempDate.toISOString());
    closePicker();
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={controlId}
          className="text-xs font-medium uppercase tracking-wider text-[var(--dash-text-muted)]"
        >
          {label} {required && <span aria-hidden="true">*</span>}
          {required && <span className="sr-only"> (obligatorio)</span>}
        </label>
      )}

      <input type="hidden" name={name} value={value || ""} />

      <button
        ref={triggerRef}
        id={controlId}
        type="button"
        onClick={openPicker}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] px-3 py-2.5 text-left text-sm text-[var(--dash-text)] shadow-sm outline-none transition-[border-color,box-shadow,background-color] hover:bg-[var(--dash-surface)] focus-visible:border-[var(--dash-accent)] focus-visible:ring-2 focus-visible:ring-[var(--dash-accent-soft)]"
      >
        <span className={isValidDate(committedDate) ? "font-medium" : "text-[var(--dash-text-muted)]"}>
          {formatTrigger(committedDate)}
        </span>
        <svg
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-[var(--dash-text-muted)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-3 backdrop-blur-[1px] sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePicker();
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            className="w-full max-w-sm overflow-hidden rounded-xl border border-[var(--dash-border-strong)] bg-[var(--dash-surface)] shadow-[var(--dash-shadow-raised)]"
          >
            <div className="border-b border-[var(--dash-border)] bg-[var(--dash-surface-raised)] px-4 py-3.5 sm:px-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--dash-accent)]">
                    Fecha y hora
                  </p>
                  <h2
                    ref={stepHeadingRef}
                    id={dialogTitleId}
                    tabIndex={-1}
                    className="mt-1 text-lg font-semibold text-[var(--dash-text)] outline-none"
                  >
                    {step === "date" ? "Selecciona una fecha" : "Selecciona una hora"}
                  </h2>
                </div>
                <button
                  ref={firstDialogControlRef}
                  type="button"
                  onClick={() => closePicker()}
                  aria-label="Cancelar selección de fecha y hora"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-lg text-[var(--dash-text-muted)] outline-none transition-colors hover:bg-[var(--dash-surface)] hover:text-[var(--dash-text)] focus-visible:ring-2 focus-visible:ring-[var(--dash-accent)]"
                >
                  <span aria-hidden="true">×</span>
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2" aria-label="Paso del selector">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    step === "date"
                      ? "bg-[var(--dash-accent)] text-white"
                      : "bg-[var(--dash-accent-soft)] text-[var(--dash-accent)]"
                  }`}
                >
                  1
                </span>
                <span className="text-xs font-medium text-[var(--dash-text)]">Fecha</span>
                <span className="h-px flex-1 bg-[var(--dash-border-strong)]" />
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    step === "time"
                      ? "bg-[var(--dash-accent)] text-white"
                      : "border border-[var(--dash-border-strong)] bg-[var(--dash-surface)] text-[var(--dash-text-muted)]"
                  }`}
                >
                  2
                </span>
                <span className="text-xs font-medium text-[var(--dash-text)]">Hora</span>
              </div>
            </div>

            {step === "date" ? (
              <div className="p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setViewMonth(new Date(year, month - 1, 1))}
                    disabled={!canNavigateToPreviousMonth}
                    className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--dash-text-muted)] outline-none transition-colors hover:bg-[var(--dash-surface-raised)] hover:text-[var(--dash-text)] focus-visible:ring-2 focus-visible:ring-[var(--dash-accent)] disabled:cursor-not-allowed disabled:opacity-25"
                    aria-label="Mes anterior"
                  >
                    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <p className="text-sm font-semibold text-[var(--dash-text)]">
                    {MONTHS[month]} {year}
                  </p>
                  <button
                    type="button"
                    onClick={() => setViewMonth(new Date(year, month + 1, 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--dash-text-muted)] outline-none transition-colors hover:bg-[var(--dash-surface-raised)] hover:text-[var(--dash-text)] focus-visible:ring-2 focus-visible:ring-[var(--dash-accent)]"
                    aria-label="Mes siguiente"
                  >
                    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1" aria-hidden="true">
                  {DAYS.map((day) => (
                    <div
                      key={day}
                      className="flex h-7 items-center justify-center text-[10px] font-semibold uppercase text-[var(--dash-text-muted)]"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstDay }).map((_, index) => (
                    <div key={`empty-${index}`} aria-hidden="true" />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, index) => {
                    const day = index + 1;
                    const date = new Date(year, month, day);
                    const disabled = isDayDisabled(day);
                    const selected =
                      isValidDate(tempDate) &&
                      tempDate.getDate() === day &&
                      tempDate.getMonth() === month &&
                      tempDate.getFullYear() === year;
                    const today = isSameDay(date, renderNow);

                    return (
                      <button
                        key={day}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleDaySelect(day)}
                        aria-label={formatAccessibleDate(date)}
                        aria-pressed={selected}
                        aria-current={today ? "date" : undefined}
                        className={`flex aspect-square min-h-9 items-center justify-center rounded-md text-sm outline-none transition-[background-color,color,box-shadow] focus-visible:ring-2 focus-visible:ring-[var(--dash-accent)] focus-visible:ring-offset-1 ${
                          disabled
                            ? "cursor-not-allowed text-[var(--dash-text-faint)] opacity-40"
                            : selected
                              ? "bg-[var(--dash-accent)] font-semibold text-white shadow-sm"
                              : today
                                ? "bg-[var(--dash-accent-soft)] font-semibold text-[var(--dash-accent)] hover:bg-[var(--dash-accent)] hover:text-white"
                                : "text-[var(--dash-text)] hover:bg-[var(--dash-surface-raised)]"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>

                <p className="mt-3 text-xs text-[var(--dash-text-muted)]">
                  Los días y horarios que ya pasaron no se pueden seleccionar.
                </p>
              </div>
            ) : (
              tempDate && (
                <div className="p-4 sm:p-5">
                  <div className="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] p-3.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--dash-text-muted)]">
                      Fecha seleccionada
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <p className="font-semibold text-[var(--dash-text)]">
                        {formatSelectedDate(tempDate)}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setValidationError(null);
                          setStep("date");
                        }}
                        className="shrink-0 rounded-sm px-1 py-1 text-xs font-semibold text-[var(--dash-accent)] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[var(--dash-accent)]"
                      >
                        Cambiar fecha
                      </button>
                    </div>
                  </div>

                  <fieldset className="mt-5">
                    <legend className="text-xs font-semibold uppercase tracking-wider text-[var(--dash-text-muted)]">
                      Hora
                    </legend>
                    <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <div>
                        <label htmlFor={`${controlId}-hour`} className="sr-only">
                          Hora
                        </label>
                        <select
                          id={`${controlId}-hour`}
                          value={tempDate.getHours()}
                          onChange={(event) => handleHourChange(Number(event.target.value))}
                          className="min-h-12 w-full rounded-md border border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] px-3 text-base font-medium text-[var(--dash-text)] outline-none transition-[border-color,box-shadow] focus-visible:border-[var(--dash-accent)] focus-visible:ring-2 focus-visible:ring-[var(--dash-accent-soft)]"
                        >
                          {Array.from({ length: 24 }).map((_, hour) => (
                            <option key={hour} value={hour} disabled={isHourDisabled(hour)}>
                              {formatHourLabel(hour)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <span aria-hidden="true" className="text-lg font-semibold text-[var(--dash-text-muted)]">
                        :
                      </span>
                      <div>
                        <label htmlFor={`${controlId}-minute`} className="sr-only">
                          Minutos
                        </label>
                        <select
                          id={`${controlId}-minute`}
                          value={tempDate.getMinutes()}
                          onChange={(event) => handleMinuteChange(Number(event.target.value))}
                          className="min-h-12 w-full rounded-md border border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] px-3 text-base font-medium text-[var(--dash-text)] outline-none transition-[border-color,box-shadow] focus-visible:border-[var(--dash-accent)] focus-visible:ring-2 focus-visible:ring-[var(--dash-accent-soft)]"
                        >
                          {selectableMinutes.map((minute) => (
                            <option
                              key={minute}
                              value={minute}
                              disabled={isTimeOptionDisabled(tempDate.getHours(), minute)}
                            >
                              {String(minute).padStart(2, "0")}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </fieldset>

                  {validationError && (
                    <p
                      role="alert"
                      className="mt-3 rounded-md bg-[var(--dash-danger-bg)] px-3 py-2 text-xs text-[var(--dash-danger)]"
                    >
                      {validationError}
                    </p>
                  )}

                  <div className="mt-5 grid grid-cols-2 gap-2 border-t border-[var(--dash-border)] pt-4">
                    <Button
                      type="button"
                      tone="light"
                      variant="secondary"
                      className="min-h-11 px-3"
                      onClick={() => closePicker()}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      tone="light"
                      className="min-h-11 px-3"
                      onClick={handleConfirm}
                    >
                      Confirmar fecha y hora
                    </Button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
