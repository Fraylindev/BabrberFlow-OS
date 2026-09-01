"use client";

import { FormEvent, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  formatServicePrice,
  isCurrentServicesScope,
  serviceErrorMessage,
  serviceFilterValue,
  servicesScopeKey,
  serviceWriteInput,
  validateServiceDraft,
  type ServiceFormDraft,
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
  const [editing, setEditing] = useState<Service | null>(null);
  const [creating, setCreating] = useState(false);
  const [changingStatus, setChangingStatus] = useState<Service | null>(null);
  const canManage = MANAGER_ROLES.has(role);
  const services = useServicesQuery(scopeKey, { isActive: serviceFilterValue(status) });

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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-xs">
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
          <Button
            tone="light"
            variant="ghost"
            disabled={status === "ALL"}
            onClick={() => setStatus("ALL")}
          >
            Limpiar filtro
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
                  <p className="font-medium text-[var(--dash-text)]">{service.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-[var(--dash-text-muted)]">
                    {service.description || "Sin descripción"}
                  </p>
                </td>
                <td className="px-5 py-4 text-[var(--dash-text-muted)]">{service.duration} min</td>
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
              <div className="min-w-0">
                <p className="break-words font-medium text-[var(--dash-text)]">{service.name}</p>
                <p className="mt-1 break-words text-sm text-[var(--dash-text-muted)]">
                  {service.description || "Sin descripción"}
                </p>
              </div>
              <ServiceBadge active={service.isActive} />
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-[var(--dash-text-muted)]">
              <span>{service.duration} min</span>
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
    <Modal title={mode === "create" ? "Nuevo servicio" : "Editar servicio"} tone="light" onClose={() => !pending && onClose()}>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <InputField label="Nombre" name="name" tone="light" maxLength={120} value={draft.name} error={errors.name} onChange={(e) => field("name", e.target.value)} required />
        <FieldWrapper label="Descripción (opcional)" htmlFor="service-description" tone="light" error={errors.description}>
          <textarea
            id="service-description"
            maxLength={1000}
            rows={4}
            value={draft.description}
            onChange={(e) => field("description", e.target.value)}
            className="w-full resize-y rounded-sm border border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] px-3 py-2 text-sm text-[var(--dash-text)] outline-none focus:border-[var(--dash-accent)]"
          />
        </FieldWrapper>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputField label="Duración (minutos)" name="duration" tone="light" type="number" min={1} max={1440} step={1} value={draft.duration} error={errors.duration} onChange={(e) => field("duration", e.target.value)} required />
          <InputField label="Precio (DOP)" name="price" tone="light" type="number" min="0.01" step="0.01" value={draft.price} error={errors.price} onChange={(e) => field("price", e.target.value)} required />
        </div>
        {requestError && <p role="alert" className="text-sm text-[var(--dash-danger)]">{requestError}</p>}
        <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" tone="light" variant="ghost" disabled={pending} onClick={onClose}>Cancelar</Button>
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
