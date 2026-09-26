"use client";

import { FormEvent, useState } from "react";
import {
  ApiError,
  ProfessionalAvailability,
  ProfessionalAvailabilityBlock,
  ProfessionalWeeklyShift,
} from "@/lib/api";
import {
  ProfessionalAvailabilityTarget,
  WeeklyShiftInput,
  useCreateProfessionalAvailabilityBlock,
  useProfessionalAvailabilityQuery,
  useReplaceProfessionalWeeklySchedule,
  useUpdateProfessionalAvailabilityBlock,
} from "@/lib/queries/professionals";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FieldWrapper, InputField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { PROFESSIONAL_BUSINESS_TIME_COPY } from "@/lib/professional-ui";

const DAYS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

const INPUT_CLASS =
  "w-full rounded-sm border border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] px-3 py-2 text-sm text-[var(--dash-text)] outline-none transition-colors focus:border-[var(--dash-accent)]";
const TEXTAREA_CLASS =
  "min-h-24 w-full resize-y rounded-sm border border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] px-3 py-2 text-sm text-[var(--dash-text)] placeholder:text-[var(--dash-text-faint)] outline-none transition-colors focus:border-[var(--dash-accent)]";

type EditableShift = WeeklyShiftInput & { key: string };

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

function localDateTimeParts(value: string) {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
  };
}

function partsAsUtc(parts: ReturnType<typeof zonedParts>) {
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
  );
}

function zonedLocalToIso(value: string, timeZone: string) {
  const desired = localDateTimeParts(value);
  if (!desired) return null;
  const desiredEpoch = partsAsUtc(desired);
  let candidate = desiredEpoch;

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const representedEpoch = partsAsUtc(zonedParts(new Date(candidate), timeZone));
    candidate += desiredEpoch - representedEpoch;
  }

  const result = new Date(candidate);
  const roundTrip = zonedParts(result, timeZone);
  if (partsAsUtc(roundTrip) !== desiredEpoch) return null;
  return result.toISOString();
}

function isoToLocalInput(value: string, timeZone: string) {
  const parts = zonedParts(new Date(value), timeZone);
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

function formatBlockDate(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("es-DO", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function initialShifts(shifts: ProfessionalWeeklyShift[]): EditableShift[] {
  return shifts.map((shift) => ({
    key: shift.id,
    dayOfWeek: shift.dayOfWeek,
    startTime: shift.startTime,
    endTime: shift.endTime,
  }));
}

export function ProfessionalAvailabilityModal({
  target,
  professionalName,
  isCurrentScope,
  onClose,
}: {
  target: ProfessionalAvailabilityTarget;
  professionalName: string;
  isCurrentScope: () => boolean;
  onClose: () => void;
}) {
  const query = useProfessionalAvailabilityQuery(target);

  return (
    <Modal
      title={`Disponibilidad · ${professionalName}`}
      tone="light"
      size="lg"
      onClose={onClose}
    >
      {query.isLoading ? (
        <div className="space-y-4" aria-label="Cargando disponibilidad">
          <Skeleton tone="light" className="h-20 w-full" />
          <Skeleton tone="light" className="h-56 w-full" />
          <Skeleton tone="light" className="h-40 w-full" />
        </div>
      ) : query.isError || !query.data ? (
        <Card tone="light" className="border border-[var(--dash-danger)]/30 p-5">
          <h3 className="font-semibold text-[var(--dash-text)]">
            No pudimos cargar la disponibilidad
          </h3>
          <p className="mt-2 text-sm text-[var(--dash-danger)]">
            {errorMessage(query.error, "Intenta nuevamente.")}
          </p>
          <Button
            tone="light"
            variant="secondary"
            className="mt-4"
            onClick={() => void query.refetch()}
          >
            Reintentar
          </Button>
        </Card>
      ) : (
        <AvailabilityEditor
          key={`${query.data.professionalId}:${query.data.weeklySchedule.map((shift) => shift.id).join(":")}`}
          availability={query.data}
          target={target}
          isCurrentScope={isCurrentScope}
        />
      )}
    </Modal>
  );
}

function AvailabilityEditor({
  availability,
  target,
  isCurrentScope,
}: {
  availability: ProfessionalAvailability;
  target: ProfessionalAvailabilityTarget;
  isCurrentScope: () => boolean;
}) {
  const { toast } = useToast();
  const replaceWeekly = useReplaceProfessionalWeeklySchedule();
  const createBlock = useCreateProfessionalAvailabilityBlock();
  const updateBlock = useUpdateProfessionalAvailabilityBlock();
  const [inheritsHours, setInheritsHours] = useState(
    availability.inheritsOrganizationHours,
  );
  const [shifts, setShifts] = useState<EditableShift[]>(
    initialShifts(availability.weeklySchedule),
  );
  const [weeklyError, setWeeklyError] = useState<string | null>(null);
  const [blockFormOpen, setBlockFormOpen] = useState(false);
  const [editingBlock, setEditingBlock] =
    useState<ProfessionalAvailabilityBlock | null>(null);

  function addShift(dayOfWeek: number) {
    setShifts((current) => [
      ...current,
      {
        key: `${dayOfWeek}-${Date.now()}-${current.length}`,
        dayOfWeek,
        startTime: "09:00",
        endTime: "17:00",
      },
    ]);
  }

  function updateShift(key: string, field: "startTime" | "endTime", value: string) {
    setShifts((current) =>
      current.map((shift) =>
        shift.key === key ? { ...shift, [field]: value } : shift,
      ),
    );
  }

  async function saveWeeklySchedule() {
    setWeeklyError(null);
    const normalized = [...shifts]
      .map(({ dayOfWeek, startTime, endTime }) => ({
        dayOfWeek,
        startTime,
        endTime,
      }))
      .sort(
        (first, second) =>
          first.dayOfWeek - second.dayOfWeek ||
          first.startTime.localeCompare(second.startTime),
      );

    if (!inheritsHours && normalized.length === 0) {
      setWeeklyError("Agrega al menos un turno o conserva el horario global.");
      return;
    }
    for (const shift of normalized) {
      if (!shift.startTime || !shift.endTime || shift.startTime >= shift.endTime) {
        setWeeklyError("Cada turno debe terminar después de su hora de inicio.");
        return;
      }
    }
    for (let index = 1; index < normalized.length; index += 1) {
      const previous = normalized[index - 1];
      const current = normalized[index];
      if (
        previous.dayOfWeek === current.dayOfWeek &&
        current.startTime < previous.endTime
      ) {
        setWeeklyError("Los turnos de un mismo día no pueden solaparse.");
        return;
      }
    }

    try {
      const updated = await replaceWeekly.mutateAsync({
        target,
        shifts: inheritsHours ? [] : normalized,
      });
      if (!isCurrentScope()) return;
      setInheritsHours(updated.inheritsOrganizationHours);
      setShifts(initialShifts(updated.weeklySchedule));
      toast("El horario semanal fue actualizado.");
    } catch (error) {
      if (!isCurrentScope()) return;
      setWeeklyError(
        errorMessage(error, "No se pudo actualizar el horario semanal."),
      );
    }
  }

  async function changeBlockStatus(
    block: ProfessionalAvailabilityBlock,
    status: "ACTIVE" | "CANCELLED",
  ) {
    try {
      await updateBlock.mutateAsync({
        target,
        blockId: block.id,
        input: { status },
      });
      if (!isCurrentScope()) return;
      toast(
        status === "ACTIVE"
          ? "El bloqueo fue reactivado."
          : "El bloqueo fue cancelado.",
      );
    } catch (error) {
      if (!isCurrentScope()) return;
      toast(
        errorMessage(error, "No se pudo cambiar el estado del bloqueo."),
        "error",
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[var(--dash-accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--dash-accent)]">
            {PROFESSIONAL_BUSINESS_TIME_COPY.badge}
          </span>
          <p className="text-sm text-[var(--dash-text-muted)]">
            {PROFESSIONAL_BUSINESS_TIME_COPY.context}
          </p>
        </div>
        <p className="mt-2 text-xs leading-5 text-[var(--dash-text-faint)]">
          La disponibilidad efectiva combina el horario global, este horario
          individual, los bloqueos temporales y las reservas abiertas.
        </p>
      </div>

      <section aria-labelledby="weekly-schedule-title">
        <div className="mb-3">
          <h3
            id="weekly-schedule-title"
            className="font-semibold text-[var(--dash-text)]"
          >
            Horario semanal
          </h3>
          <p className="mt-1 text-sm text-[var(--dash-text-muted)]">
            Define varios turnos por día o hereda el horario global del negocio.
          </p>
        </div>

        <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--dash-border)] p-3">
          <input
            type="checkbox"
            checked={inheritsHours}
            onChange={(event) => setInheritsHours(event.target.checked)}
            className="mt-1 h-4 w-4 accent-[var(--dash-accent)]"
          />
          <span>
            <span className="block text-sm font-medium text-[var(--dash-text)]">
              Usar horario global de la organización
            </span>
            <span className="mt-0.5 block text-xs text-[var(--dash-text-muted)]">
              El profesional seguirá los turnos generales configurados.
            </span>
          </span>
        </label>

        {!inheritsHours && (
          <div className="space-y-3">
            {DAYS.map((day, dayOfWeek) => {
              const dayShifts = shifts.filter(
                (shift) => shift.dayOfWeek === dayOfWeek,
              );
              return (
                <div
                  key={day}
                  className="rounded-lg border border-[var(--dash-border)] p-3 sm:grid sm:grid-cols-[92px_minmax(0,1fr)] sm:gap-3"
                >
                  <div className="mb-2 flex items-center justify-between sm:mb-0 sm:block">
                    <p className="pt-2 text-sm font-semibold text-[var(--dash-text)]">
                      {day}
                    </p>
                    <button
                      type="button"
                      onClick={() => addShift(dayOfWeek)}
                      className="text-xs font-semibold text-[var(--dash-accent)] hover:underline sm:hidden"
                    >
                      + Turno
                    </button>
                  </div>
                  <div className="space-y-2">
                    {dayShifts.length === 0 ? (
                      <p className="py-2 text-sm text-[var(--dash-text-faint)]">
                        Sin turno individual
                      </p>
                    ) : (
                      dayShifts.map((shift) => (
                        <div
                          key={shift.key}
                          className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2"
                        >
                          <FieldWrapper
                            label="Desde"
                            htmlFor={`${shift.key}-start`}
                            tone="light"
                          >
                            <input
                              id={`${shift.key}-start`}
                              type="time"
                              value={shift.startTime}
                              onChange={(event) =>
                                updateShift(
                                  shift.key,
                                  "startTime",
                                  event.target.value,
                                )
                              }
                              className={INPUT_CLASS}
                            />
                          </FieldWrapper>
                          <FieldWrapper
                            label="Hasta"
                            htmlFor={`${shift.key}-end`}
                            tone="light"
                          >
                            <input
                              id={`${shift.key}-end`}
                              type="time"
                              value={shift.endTime}
                              onChange={(event) =>
                                updateShift(
                                  shift.key,
                                  "endTime",
                                  event.target.value,
                                )
                              }
                              className={INPUT_CLASS}
                            />
                          </FieldWrapper>
                          <button
                            type="button"
                            aria-label={`Eliminar turno de ${day}`}
                            onClick={() =>
                              setShifts((current) =>
                                current.filter((item) => item.key !== shift.key),
                              )
                            }
                            className="mb-0.5 flex h-9 w-9 items-center justify-center rounded-sm text-[var(--dash-danger)] hover:bg-[var(--dash-danger-bg)]"
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                    <button
                      type="button"
                      onClick={() => addShift(dayOfWeek)}
                      className="hidden text-xs font-semibold text-[var(--dash-accent)] hover:underline sm:inline"
                    >
                      + Agregar turno
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {weeklyError && (
          <p
            role="alert"
            className="mt-3 rounded-lg bg-[var(--dash-danger-bg)] px-3 py-2 text-sm text-[var(--dash-danger)]"
          >
            {weeklyError}
          </p>
        )}
        <div className="mt-4 flex justify-end">
          <Button
            tone="light"
            onClick={() => void saveWeeklySchedule()}
            disabled={replaceWeekly.isPending}
          >
            {replaceWeekly.isPending ? "Guardando…" : "Guardar horario"}
          </Button>
        </div>
      </section>

      <section
        aria-labelledby="temporary-blocks-title"
        className="border-t border-[var(--dash-border)] pt-6"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3
              id="temporary-blocks-title"
              className="font-semibold text-[var(--dash-text)]"
            >
              Bloqueos temporales
            </h3>
            <p className="mt-1 text-sm text-[var(--dash-text-muted)]">
              Registra ausencias o períodos sin disponibilidad. La nota es interna.
            </p>
          </div>
          <Button
            tone="light"
            variant="secondary"
            onClick={() => {
              setEditingBlock(null);
              setBlockFormOpen(true);
            }}
          >
            + Nuevo bloqueo
          </Button>
        </div>

        {blockFormOpen && (
          <BlockForm
            key={editingBlock?.id ?? "new-block"}
            block={editingBlock}
            timeZone={availability.timeZone}
            pending={createBlock.isPending || updateBlock.isPending}
            onCancel={() => {
              setBlockFormOpen(false);
              setEditingBlock(null);
            }}
            onSubmit={async (input) => {
              if (editingBlock) {
                await updateBlock.mutateAsync({
                  target,
                  blockId: editingBlock.id,
                  input,
                });
                if (!isCurrentScope()) return;
                toast("El bloqueo fue actualizado.");
              } else {
                await createBlock.mutateAsync({ target, input });
                if (!isCurrentScope()) return;
                toast("El bloqueo temporal fue creado.");
              }
              setBlockFormOpen(false);
              setEditingBlock(null);
            }}
          />
        )}

        <div className="mt-4 space-y-3">
          {availability.blocks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--dash-border-strong)] p-5 text-center">
              <p className="text-sm font-medium text-[var(--dash-text)]">
                No hay bloqueos en el período consultado
              </p>
              <p className="mt-1 text-xs text-[var(--dash-text-muted)]">
                Se muestran los próximos 90 días.
              </p>
            </div>
          ) : (
            availability.blocks.map((block) => (
              <div
                key={block.id}
                className="rounded-lg border border-[var(--dash-border)] p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-[var(--dash-text)]">
                        {formatBlockDate(block.startTime, availability.timeZone)}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          block.status === "ACTIVE"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-[var(--dash-surface-raised)] text-[var(--dash-text-faint)]"
                        }`}
                      >
                        {block.status === "ACTIVE" ? "Activo" : "Cancelado"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--dash-text-muted)]">
                      Hasta {formatBlockDate(block.endTime, availability.timeZone)}
                    </p>
                    {block.note && (
                      <p className="mt-2 break-words text-sm text-[var(--dash-text-muted)]">
                        Nota interna: {block.note}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Button
                      tone="light"
                      variant="secondary"
                      className="px-3"
                      onClick={() => {
                        setEditingBlock(block);
                        setBlockFormOpen(true);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      tone="light"
                      variant={block.status === "ACTIVE" ? "danger" : "secondary"}
                      className="px-3"
                      disabled={updateBlock.isPending}
                      onClick={() =>
                        void changeBlockStatus(
                          block,
                          block.status === "ACTIVE" ? "CANCELLED" : "ACTIVE",
                        )
                      }
                    >
                      {block.status === "ACTIVE" ? "Cancelar" : "Reactivar"}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function BlockForm({
  block,
  timeZone,
  pending,
  onCancel,
  onSubmit,
}: {
  block: ProfessionalAvailabilityBlock | null;
  timeZone: string;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (input: {
    startTime: string;
    endTime: string;
    note?: string | null;
  }) => Promise<void>;
}) {
  const [startTime, setStartTime] = useState(
    block ? isoToLocalInput(block.startTime, timeZone) : "",
  );
  const [endTime, setEndTime] = useState(
    block ? isoToLocalInput(block.endTime, timeZone) : "",
  );
  const [note, setNote] = useState(block?.note ?? "");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const startIso = zonedLocalToIso(startTime, timeZone);
    const endIso = zonedLocalToIso(endTime, timeZone);
    if (!startIso || !endIso) {
      setError(PROFESSIONAL_BUSINESS_TIME_COPY.invalid);
      return;
    }
    if (new Date(startIso) >= new Date(endIso)) {
      setError("El fin del bloqueo debe ser posterior al inicio.");
      return;
    }
    if (new Date(endIso) <= new Date()) {
      setError("El bloqueo debe finalizar en el futuro.");
      return;
    }

    try {
      await onSubmit({
        startTime: startIso,
        endTime: endIso,
        ...(block ? { note: note.trim() || null } : note.trim() ? { note: note.trim() } : {}),
      });
    } catch (mutationError) {
      setError(
        errorMessage(mutationError, "No se pudo guardar el bloqueo temporal."),
      );
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-4 rounded-lg border border-[var(--dash-accent)]/30 bg-[var(--dash-accent-soft)]/30 p-4"
    >
      <h4 className="font-semibold text-[var(--dash-text)]">
        {block ? "Editar bloqueo" : "Nuevo bloqueo"}
      </h4>
      <p className="mt-1 text-xs text-[var(--dash-text-muted)]">
        {PROFESSIONAL_BUSINESS_TIME_COPY.inputHelp}
      </p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <InputField
          tone="light"
          label="Inicio"
          name="availability-block-start"
          type="datetime-local"
          required
          value={startTime}
          onChange={(event) => setStartTime(event.target.value)}
        />
        <InputField
          tone="light"
          label="Fin"
          name="availability-block-end"
          type="datetime-local"
          required
          value={endTime}
          onChange={(event) => setEndTime(event.target.value)}
        />
      </div>
      <div className="mt-4">
        <FieldWrapper
          label="Nota interna (opcional)"
          htmlFor="availability-block-note"
          tone="light"
        >
          <textarea
            id="availability-block-note"
            maxLength={500}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Motivo operativo visible solo para el equipo autorizado"
            className={TEXTAREA_CLASS}
          />
        </FieldWrapper>
        <p className="mt-1 text-right text-xs text-[var(--dash-text-faint)]">
          {note.length}/500
        </p>
      </div>
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-[var(--dash-danger-bg)] px-3 py-2 text-sm text-[var(--dash-danger)]"
        >
          {error}
        </p>
      )}
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button tone="light" variant="ghost" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button tone="light" type="submit" disabled={pending}>
          {pending ? "Guardando…" : block ? "Guardar cambios" : "Crear bloqueo"}
        </Button>
      </div>
    </form>
  );
}
