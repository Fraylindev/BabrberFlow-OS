"use client";

import { FormEvent, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Service } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  useCreateService,
  useDeactivateService,
  useReactivateService,
  useServicesQuery,
  useUpdateService,
} from "@/lib/queries/services";
import {
  formatServiceDuration,
  formatServicePrice,
  isCurrentServicesScope,
  normalizeServiceDurationInput,
  normalizeServicePriceInput,
  SERVICE_DURATION_PRESETS,
  serviceErrorMessage,
  serviceFilterValue,
  servicesScopeKey,
  serviceWriteInput,
  validateServiceDraft,
  type ServiceFormDraft,
  type ServiceSort,
  type ServiceStatusFilter,
} from "@/lib/service-ui";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FieldWrapper, InputField, SelectField } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";

const MANAGER_ROLES = new Set(["OWNER", "ADMIN"]);

export default function ServicesPage() {
  const { user } = useAuth();
  const scopeKey = servicesScopeKey(user);
  const scopeInstance = useMemo(() => ({ key: scopeKey }), [scopeKey]);
  const currentScopeRef = useRef<typeof scopeInstance | null>(scopeInstance);

  useLayoutEffect(() => {
    currentScopeRef.current = scopeInstance;
    return () => {
      currentScopeRef.current = null;
    };
  }, [scopeInstance]);

  if (!user || !scopeKey) return null;

  return (
    <ScopedServicesPage
      key={scopeKey}
      role={user.role}
      scopeKey={scopeKey}
      isCurrentScope={() => isCurrentServicesScope(currentScopeRef.current, scopeInstance)}
    />
  );
}

function ScopedServicesPage({
  role,
  scopeKey,
  isCurrentScope,
}: {
  role: string;
  scopeKey: string;
  isCurrentScope: () => boolean;
}) {
  const { toast } = useToast();
  const [status, setStatus] = useState<ServiceStatusFilter>("ALL");
  const [sort, setSort] = useState<ServiceSort>("NAME_ASC");
  const [editing, setEditing] = useState<Service | null>(null);
  const [creating, setCreating] = useState(false);
  const [changingStatus, setChangingStatus] = useState<Service | null>(null);
  const canManage = MANAGER_ROLES.has(role);
  const services = useServicesQuery(scopeKey, {
    isActive: serviceFilterValue(status),
    sort,
  });

  function success(message: string) {
    if (!isCurrentScope()) return;
    setCreating(false);
    setEditing(null);
    setChangingStatus(null);
    toast(message, "success");
  }

  return (
    <div>
      <PageHeader
        tone="light"
        title="Servicios"
        description="Administra el catálogo de servicios de esta organización."
        action={
          canManage ? (
            <Button tone="light" onClick={() => setCreating(true)}>
              Nuevo servicio
            </Button>
          ) : undefined
        }
      />

      {!canManage && (
        <Card tone="light" className="mb-4 px-4 py-3">
          <p className="text-sm text-[var(--dash-text-muted)]">
            Puedes consultar el catálogo. Solo los dueños y administradores pueden modificarlo.
          </p>
        </Card>
      )}

      <Card tone="light" className="mb-5 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 sm:items-end lg:grid-cols-[minmax(0,18rem)_minmax(0,22rem)_auto]">
          <div className="w-full">
            <SelectField
              label="Estado"
              name="service-status"
              tone="light"
              value={status}
              onChange={(event) => setStatus(event.target.value as ServiceStatusFilter)}
            >
              <option value="ALL">Todos</option>
              <option value="ACTIVE">Activos</option>
              <option value="INACTIVE">Inactivos</option>
            </SelectField>
          </div>
          <div className="w-full">
            <SelectField
              label="Ordenar por"
              name="service-sort"
              tone="light"
              value={sort}
              onChange={(event) => setSort(event.target.value as ServiceSort)}
            >
              <option value="NAME_ASC">Nombre: A–Z</option>
              <option value="BOOKINGS_DESC">Más reservas registradas</option>
              <option value="BOOKINGS_ASC">Menos reservas registradas</option>
              <option value="CREATED_DESC">Más recientes</option>
              <option value="CREATED_ASC">Más antiguos</option>
              <option value="PRICE_ASC">Precio: menor a mayor</option>
              <option value="PRICE_DESC">Precio: mayor a menor</option>
            </SelectField>
          </div>
          <Button
            tone="light"
            variant="ghost"
            className="w-full sm:col-span-2 lg:col-span-1 lg:w-auto"
            disabled={status === "ALL" && sort === "NAME_ASC"}
            onClick={() => {
              setStatus("ALL");
              setSort("NAME_ASC");
            }}
          >
            Limpiar filtros
          </Button>
        </div>
      </Card>

      {services.isPending ? (
        <Card tone="light" className="p-5" aria-live="polite">
          <p className="sr-only">Cargando servicios</p>
          <SkeletonListRows />
        </Card>
      ) : services.isError ? (
        <Card tone="light" className="p-6 text-center">
          <div role="alert">
            <p className="font-medium text-[var(--dash-text)]">No pudimos cargar los servicios.</p>
            <p className="mt-1 text-sm text-[var(--dash-text-muted)]">
              Revisa tu conexión e intenta nuevamente.
            </p>
            <Button tone="light" className="mt-4" onClick={() => services.refetch()}>
              Reintentar
            </Button>
          </div>
        </Card>
      ) : services.data.length === 0 ? (
        <EmptyState
          tone="light"
          title={status === "ALL" ? "Todavía no hay servicios" : "No hay servicios con este estado"}
          description={
            status === "ALL"
              ? "El catálogo aparecerá aquí cuando se agregue el primer servicio."
              : "Prueba otro estado o limpia el filtro."
          }
          action={
            status === "ALL" && canManage ? (
              <Button tone="light" onClick={() => setCreating(true)}>
                Nuevo servicio
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ServiceList
          items={services.data}
          canManage={canManage}
          onEdit={setEditing}
          onChangeStatus={setChangingStatus}
        />
      )}

      {creating && (
        <ServiceFormModal
          mode="create"
          scopeKey={scopeKey}
          isCurrentScope={isCurrentScope}
          onClose={() => setCreating(false)}
          onSuccess={() => success("Servicio creado correctamente.")}
        />
      )}
      {editing && (
        <ServiceFormModal
          mode="edit"
          service={editing}
          scopeKey={scopeKey}
          isCurrentScope={isCurrentScope}
          onClose={() => setEditing(null)}
          onSuccess={() => success("Servicio actualizado correctamente.")}
        />
      )}
      {changingStatus && (
        <ServiceStatusModal
          service={changingStatus}
          scopeKey={scopeKey}
          isCurrentScope={isCurrentScope}
          onClose={() => setChangingStatus(null)}
          onSuccess={() =>
            success(
              changingStatus.isActive
                ? "Servicio desactivado correctamente."
                : "Servicio reactivado correctamente.",
            )
          }
        />
      )}
    </div>
  );
}

function ServiceList({
  items,
  canManage,
  onEdit,
  onChangeStatus,
}: {
  items: Service[];
  canManage: boolean;
  onEdit: (service: Service) => void;
  onChangeStatus: (service: Service) => void;
}) {
  return (
    <Card tone="light" className="overflow-hidden">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--dash-surface-raised)] text-xs uppercase tracking-wide text-[var(--dash-text-muted)]">
            <tr>
              <th className="px-5 py-3 font-medium">Servicio</th>
              <th className="px-5 py-3 font-medium">Duración</th>
              <th className="px-5 py-3 font-medium">Precio</th>
              <th className="px-5 py-3 font-medium">Estado</th>
              <th className="px-5 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--dash-border)]">
            {items.map((service) => (
              <tr key={service.id}>
                <td className="max-w-md px-5 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <ServiceImageSlot compact />
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--dash-text)]">{service.name}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-[var(--dash-text-muted)]">
                        {service.description || "Sin descripción"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-[var(--dash-text-muted)]">
                  {formatServiceDuration(service.duration)}
                </td>
                <td className="px-5 py-4 font-medium text-[var(--dash-text)]">
                  {formatServicePrice(service.price)}
                </td>
                <td className="px-5 py-4"><ServiceBadge active={service.isActive} /></td>
                <td className="px-5 py-4">
                  {canManage ? (
                    <div className="flex justify-end gap-2">
                      <Button tone="light" variant="ghost" onClick={() => onEdit(service)}>Editar</Button>
                      <Button
                        tone="light"
                        variant={service.isActive ? "danger" : "secondary"}
                        onClick={() => onChangeStatus(service)}
                      >
                        {service.isActive ? "Desactivar" : "Reactivar"}
                      </Button>
                    </div>
                  ) : (
                    <span className="block text-right text-xs text-[var(--dash-text-faint)]">Solo lectura</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-[var(--dash-border)] md:hidden">
        {items.map((service) => (
          <li key={service.id} className="space-y-3 p-4">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <ServiceImageSlot compact />
                <div className="min-w-0">
                  <p className="break-words font-medium text-[var(--dash-text)]">{service.name}</p>
                  <p className="mt-1 break-words text-sm text-[var(--dash-text-muted)]">
                    {service.description || "Sin descripción"}
                  </p>
                </div>
              </div>
              <ServiceBadge active={service.isActive} />
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-[var(--dash-text-muted)]">
              <span>{formatServiceDuration(service.duration)}</span>
              <span className="font-medium text-[var(--dash-text)]">{formatServicePrice(service.price)}</span>
            </div>
            {canManage && (
              <div className="grid grid-cols-2 gap-2">
                <Button tone="light" variant="secondary" onClick={() => onEdit(service)}>Editar</Button>
                <Button
                  tone="light"
                  variant={service.isActive ? "danger" : "secondary"}
                  onClick={() => onChangeStatus(service)}
                >
                  {service.isActive ? "Desactivar" : "Reactivar"}
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ServiceImageSlot({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <span
        aria-hidden="true"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] text-[var(--dash-text-faint)]"
      >
        <ImagePlaceholderIcon className="h-5 w-5" />
      </span>
    );
  }

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--dash-text-muted)]">
        Imagen del servicio
      </p>
      <div className="mt-1.5 flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] text-[var(--dash-text-faint)] sm:aspect-square">
        <div className="text-center">
          <ImagePlaceholderIcon className="mx-auto h-7 w-7" />
          <span className="mt-2 block text-xs font-medium">Sin imagen</span>
        </div>
      </div>
      <p className="mt-1.5 text-xs leading-5 text-[var(--dash-text-faint)]">
        Espacio reservado para la foto del servicio.
      </p>
    </div>
  );
}

function ImagePlaceholderIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className={className}
    >
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m5.5 17 4.25-4 3.25 3 2.25-2 3.25 3" />
    </svg>
  );
}

function ServiceBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
        active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
      }`}
    >
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}

function ServiceFormModal({
  mode,
  service,
  scopeKey,
  isCurrentScope,
  onClose,
  onSuccess,
}: {
  mode: "create" | "edit";
  service?: Service;
  scopeKey: string;
  isCurrentScope: () => boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [draft, setDraft] = useState<ServiceFormDraft>({
    name: service?.name ?? "",
    description: service?.description ?? "",
    duration: service ? String(service.duration) : "30",
    price: service?.price ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ServiceFormDraft, string>>>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const create = useCreateService();
  const update = useUpdateService();
  const pending = create.isPending || update.isPending;
  const pendingRef = useRef(pending);
  useLayoutEffect(() => {
    pendingRef.current = pending;
  }, [pending]);
  const handleClose = useCallback(() => {
    if (!pendingRef.current) onClose();
  }, [onClose]);

  function field(name: keyof ServiceFormDraft, value: string) {
    setDraft((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validateServiceDraft(draft);
    setErrors(nextErrors);
    setRequestError(null);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      const input = serviceWriteInput(draft);
      if (mode === "create") await create.mutateAsync({ scopeKey, input });
      else if (service) await update.mutateAsync({ id: service.id, scopeKey, input });
      if (isCurrentScope()) onSuccess();
    } catch (error) {
      if (isCurrentScope()) setRequestError(serviceErrorMessage(error, mode === "create" ? "create" : "update"));
    }
  }

  return (
    <Modal
      title={mode === "create" ? "Nuevo servicio" : "Editar servicio"}
      tone="light"
      size="lg"
      onClose={handleClose}
    >
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <div className="grid gap-5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-start">
          <ServiceImageSlot />
          <div className="flex flex-col gap-4">
            <InputField
              label="Nombre"
              name="name"
              tone="light"
              maxLength={120}
              value={draft.name}
              error={errors.name}
              onChange={(event) => field("name", event.target.value)}
              required
            />
            <FieldWrapper
              label="Descripción (opcional)"
              htmlFor="service-description"
              tone="light"
              error={errors.description}
            >
              <textarea
                id="service-description"
                maxLength={1000}
                rows={5}
                value={draft.description}
                onChange={(event) => field("description", event.target.value)}
                className="w-full resize-y rounded-sm border border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] px-3 py-2 text-sm text-[var(--dash-text)] outline-none transition-colors focus:border-[var(--dash-accent)]"
              />
            </FieldWrapper>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldWrapper
            label="Duración"
            htmlFor="service-duration"
            tone="light"
            error={errors.duration}
          >
            <div className="flex rounded-sm border border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] transition-colors focus-within:border-[var(--dash-accent)]">
              <input
                id="service-duration"
                name="duration"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={draft.duration}
                aria-invalid={Boolean(errors.duration)}
                onChange={(event) => {
                  const nextValue = normalizeServiceDurationInput(event.target.value);
                  if (nextValue !== null) field("duration", nextValue);
                }}
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-[var(--dash-text)] outline-none"
                required
              />
              <span className="flex items-center border-l border-[var(--dash-border)] px-3 text-xs font-medium text-[var(--dash-text-muted)]">
                min
              </span>
            </div>
            <p className="text-xs text-[var(--dash-text-faint)]">
              {formatServiceDuration(draft.duration)}
            </p>
          </FieldWrapper>
          <FieldWrapper
            label="Precio"
            htmlFor="service-price"
            tone="light"
            error={errors.price}
          >
            <div className="flex rounded-sm border border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] transition-colors focus-within:border-[var(--dash-accent)]">
              <span className="flex items-center border-r border-[var(--dash-border)] px-3 text-xs font-medium text-[var(--dash-text-muted)]">
                RD$
              </span>
              <input
                id="service-price"
                name="price"
                type="text"
                inputMode="decimal"
                maxLength={66}
                placeholder="0.00"
                value={draft.price}
                aria-invalid={Boolean(errors.price)}
                onChange={(event) => {
                  const nextValue = normalizeServicePriceInput(event.target.value);
                  if (nextValue !== null) field("price", nextValue);
                }}
                onBlur={() => {
                  if (draft.price.endsWith(".")) field("price", draft.price.slice(0, -1));
                }}
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-[var(--dash-text)] outline-none placeholder:text-[var(--dash-text-faint)]"
                required
              />
            </div>
            <p className="text-xs text-[var(--dash-text-faint)]">
              Monto en pesos dominicanos, con hasta dos decimales.
            </p>
          </FieldWrapper>
        </div>
        <fieldset>
          <legend className="text-xs font-medium uppercase tracking-wider text-[var(--dash-text-muted)]">
            Duraciones habituales
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {SERVICE_DURATION_PRESETS.map((minutes) => (
              <Button
                key={minutes}
                type="button"
                tone="light"
                variant={draft.duration === String(minutes) ? "primary" : "secondary"}
                className="px-3 py-1.5 text-xs"
                aria-pressed={draft.duration === String(minutes)}
                onClick={() => field("duration", String(minutes))}
              >
                {formatServiceDuration(minutes)}
              </Button>
            ))}
          </div>
        </fieldset>
        {requestError && <p role="alert" className="text-sm text-[var(--dash-danger)]">{requestError}</p>}
        <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" tone="light" variant="ghost" disabled={pending} onClick={handleClose}>Cancelar</Button>
          <Button type="submit" tone="light" disabled={pending}>{pending ? "Guardando…" : "Guardar servicio"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function ServiceStatusModal({
  service,
  scopeKey,
  isCurrentScope,
  onClose,
  onSuccess,
}: {
  service: Service;
  scopeKey: string;
  isCurrentScope: () => boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const deactivate = useDeactivateService();
  const reactivate = useReactivateService();
  const [error, setError] = useState<string | null>(null);
  const pending = deactivate.isPending || reactivate.isPending;

  async function confirm() {
    const action = service.isActive ? "deactivate" : "reactivate";
    setError(null);
    try {
      if (service.isActive) await deactivate.mutateAsync({ id: service.id, scopeKey });
      else await reactivate.mutateAsync({ id: service.id, scopeKey });
      if (isCurrentScope()) onSuccess();
    } catch (requestError) {
      if (isCurrentScope()) setError(serviceErrorMessage(requestError, action));
    }
  }

  return (
    <Modal title={service.isActive ? "Desactivar servicio" : "Reactivar servicio"} tone="light" onClose={() => !pending && onClose()}>
      <p className="text-sm text-[var(--dash-text-muted)]">
        {service.isActive
          ? `“${service.name}” dejará de estar disponible para nuevas selecciones. Su historial se conservará.`
          : `“${service.name}” volverá a estar disponible en el catálogo.`}
      </p>
      {error && <p role="alert" className="mt-4 text-sm text-[var(--dash-danger)]">{error}</p>}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button tone="light" variant="ghost" disabled={pending} onClick={onClose}>Cancelar</Button>
        <Button tone="light" variant={service.isActive ? "danger" : "primary"} disabled={pending} onClick={confirm}>
          {pending ? "Procesando…" : service.isActive ? "Desactivar" : "Reactivar"}
        </Button>
      </div>
    </Modal>
  );
}
