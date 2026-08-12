"use client";

import { FormEvent, useState } from "react";
import { ApiError, Client } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  ClientWriteInput,
  useArchiveClient,
  useClientDetailQuery,
  useClientsPageQuery,
  useCreateClient,
  useRestoreClient,
  useUpdateClient,
} from "@/lib/queries/clients";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FieldWrapper, InputField, SelectField } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, SkeletonListRows } from "@/components/ui/Skeleton";

const MANAGEMENT_ROLES = ["OWNER", "ADMIN", "RECEPTIONIST"];
const PAGE_SIZE = 20;

type ClientStatusFilter = "active" | "inactive";
type Confirmation = { client: Client; action: "archive" | "restore" };

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

function formatDate(value?: string) {
  if (!value) return null;
  return new Intl.DateTimeFormat("es-DO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function ClientStatus({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        isActive
          ? "bg-[var(--dash-success-bg)] text-[var(--dash-success)]"
          : "bg-[var(--dash-surface-raised)] text-[var(--dash-text-muted)]"
      }`}
    >
      {isActive ? "Activo" : "Archivado"}
    </span>
  );
}

export default function ClientsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ClientStatusFilter>("active");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const canManage = Boolean(user && MANAGEMENT_ROLES.includes(user.role));
  const isBarber = user?.role === "BARBER";
  const query = useClientsPageQuery({
    search: search || undefined,
    isActive: status === "active",
    page,
    limit: PAGE_SIZE,
  });
  const clients = query.data?.clients ?? [];
  const pagination = query.data?.pagination;
  const hasFilters = Boolean(search) || status !== "active";

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setSearch(draftSearch.trim());
    setPage(1);
  }

  function clearFilters() {
    setDraftSearch("");
    setSearch("");
    setStatus("active");
    setPage(1);
  }

  return (
    <div className="min-w-0">
      <PageHeader
        tone="light"
        title={isBarber ? "Mis clientes" : "Clientes"}
        description={
          isBarber
            ? "Contactos vinculados a las reservas de tu agenda."
            : "Consulta y administra la cartera de clientes del negocio."
        }
        action={
          canManage ? (
            <Button tone="light" className="min-h-11" onClick={() => setCreateOpen(true)}>
              + Nuevo cliente
            </Button>
          ) : undefined
        }
      />

      <Card tone="light" className="mb-5 p-4 sm:p-5">
        <form
          onSubmit={submitSearch}
          className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-end"
        >
          <InputField
            tone="light"
            label="Buscar"
            name="client-search"
            type="search"
            maxLength={120}
            value={draftSearch}
            placeholder="Nombre, correo o teléfono"
            onChange={(event) => setDraftSearch(event.target.value)}
          />
          <SelectField
            tone="light"
            label="Estado"
            name="client-status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as ClientStatusFilter);
              setPage(1);
            }}
          >
            <option value="active">Activos</option>
            <option value="inactive">Archivados</option>
          </SelectField>
          <Button tone="light" variant="secondary" type="submit" className="min-h-10">
            Buscar
          </Button>
        </form>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 text-sm font-medium text-[var(--dash-accent)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-accent)]"
          >
            Limpiar filtros
          </button>
        )}
      </Card>

      {query.isLoading ? (
        <Card tone="light" aria-label="Cargando clientes">
          <SkeletonListRows tone="light" rows={6} />
        </Card>
      ) : query.isError ? (
        <ErrorState
          message={errorMessage(query.error, "No pudimos cargar los clientes.")}
          onRetry={() => void query.refetch()}
        />
      ) : clients.length === 0 ? (
        <EmptyState
          tone="light"
          title={hasFilters ? "No encontramos clientes" : "Todavía no hay clientes activos"}
          description={
            hasFilters
              ? "Prueba otra búsqueda o cambia el filtro de estado."
              : isBarber
                ? "Los clientes aparecerán cuando tengan reservas vinculadas a tu agenda."
                : "Registra el primer cliente para comenzar a gestionar su información."
          }
          action={
            hasFilters ? (
              <Button tone="light" variant="secondary" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            ) : canManage ? (
              <Button tone="light" onClick={() => setCreateOpen(true)}>
                + Nuevo cliente
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="space-y-3 lg:hidden">
            {clients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                canManage={canManage}
                onDetail={() => setDetailId(client.id)}
                onEdit={() => setEditingClient(client)}
                onToggle={() =>
                  setConfirmation({
                    client,
                    action: client.isActive ? "archive" : "restore",
                  })
                }
              />
            ))}
          </div>

          <Card tone="light" className="hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-left">
                <thead className="border-b border-[var(--dash-border)] bg-[var(--dash-surface-raised)]">
                  <tr className="text-xs font-semibold uppercase tracking-wider text-[var(--dash-text-muted)]">
                    <th className="w-[28%] px-5 py-3">Cliente</th>
                    <th className="w-[24%] px-4 py-3">Correo</th>
                    <th className="w-[18%] px-4 py-3">Teléfono</th>
                    <th className="w-[12%] px-4 py-3">Estado</th>
                    <th className="w-[18%] px-5 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--dash-border)]">
                  {clients.map((client) => (
                    <tr key={client.id} className="text-sm text-[var(--dash-text)]">
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          className="max-w-full truncate text-left font-semibold hover:text-[var(--dash-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-accent)]"
                          title={client.name}
                          onClick={() => setDetailId(client.id)}
                        >
                          {client.name}
                        </button>
                      </td>
                      <td className="truncate px-4 py-4 text-[var(--dash-text-muted)]" title={client.email ?? undefined}>
                        {client.email || "—"}
                      </td>
                      <td className="truncate px-4 py-4 font-[family-name:var(--font-mono)] text-xs text-[var(--dash-text-muted)]" title={client.phone ?? undefined}>
                        {client.phone || "—"}
                      </td>
                      <td className="px-4 py-4">
                        <ClientStatus isActive={client.isActive} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            tone="light"
                            variant="ghost"
                            className="px-2.5"
                            onClick={() => setDetailId(client.id)}
                          >
                            Ver
                          </Button>
                          {canManage && (
                            <Button
                              tone="light"
                              variant="secondary"
                              className="px-2.5"
                              onClick={() => setEditingClient(client)}
                            >
                              Editar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="mt-4 flex flex-col gap-3 text-sm text-[var(--dash-text-muted)] sm:flex-row sm:items-center sm:justify-between">
            <p aria-live="polite">
              {pagination?.metadataAvailable ? (
                <>
                  {pagination.total} cliente{pagination.total === 1 ? "" : "s"} · página {pagination.page}
                  {pagination.totalPages ? ` de ${pagination.totalPages}` : ""}
                </>
              ) : (
                <>{clients.length} clientes mostrados · metadata de paginación no disponible</>
              )}
            </p>
            {pagination?.metadataAvailable && pagination.totalPages > 1 && (
              <div className="flex gap-2">
                <Button
                  tone="light"
                  variant="secondary"
                  disabled={page <= 1 || query.isFetching}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Anterior
                </Button>
                <Button
                  tone="light"
                  variant="secondary"
                  disabled={page >= (pagination?.totalPages ?? 1) || query.isFetching}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {createOpen && (
        <ClientFormModal
          mode="create"
          onClose={() => setCreateOpen(false)}
          onSuccess={(client) => {
            setCreateOpen(false);
            setStatus("active");
            setPage(1);
            toast(`${client.name} fue creado correctamente.`);
          }}
        />
      )}

      {editingClient && (
        <ClientFormModal
          mode="edit"
          client={editingClient}
          onClose={() => setEditingClient(null)}
          onSuccess={(client) => {
            setEditingClient(null);
            setDetailId(client.id);
            toast("Los datos del cliente fueron actualizados.");
          }}
        />
      )}

      {detailId && (
        <ClientDetailModal
          id={detailId}
          canManage={canManage}
          showNotes={!isBarber}
          onClose={() => setDetailId(null)}
          onEdit={(client) => {
            setDetailId(null);
            setEditingClient(client);
          }}
          onToggle={(client) => {
            setDetailId(null);
            setConfirmation({
              client,
              action: client.isActive ? "archive" : "restore",
            });
          }}
        />
      )}

      {confirmation && (
        <ClientStateModal
          confirmation={confirmation}
          onClose={() => setConfirmation(null)}
          onSuccess={() => {
            const wasArchive = confirmation.action === "archive";
            const name = confirmation.client.name;
            if (clients.length === 1 && page > 1) setPage((current) => current - 1);
            setConfirmation(null);
            toast(
              wasArchive
                ? `${name} fue archivado correctamente.`
                : `${name} fue restaurado correctamente.`,
            );
          }}
        />
      )}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card tone="light" className="border-[var(--dash-danger)]/25 p-6 text-center">
      <p className="font-semibold text-[var(--dash-danger)]">No pudimos mostrar los clientes</p>
      <p className="mt-1 text-sm text-[var(--dash-text-muted)]">{message}</p>
      <Button tone="light" variant="secondary" className="mt-4" onClick={onRetry}>
        Reintentar
      </Button>
    </Card>
  );
}

function ClientCard({
  client,
  canManage,
  onDetail,
  onEdit,
  onToggle,
}: {
  client: Client;
  canManage: boolean;
  onDetail: () => void;
  onEdit: () => void;
  onToggle: () => void;
}) {
  return (
    <Card tone="light" className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onDetail}
            className="max-w-full truncate text-left font-semibold text-[var(--dash-text)] hover:text-[var(--dash-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-accent)]"
          >
            {client.name}
          </button>
          <p className="mt-1 truncate text-sm text-[var(--dash-text-muted)]">
            {client.email || "Sin correo"}
          </p>
        </div>
        <ClientStatus isActive={client.isActive} />
      </div>
      <p className="mt-3 font-[family-name:var(--font-mono)] text-xs text-[var(--dash-text-muted)]">
        {client.phone || "Sin teléfono"}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[var(--dash-border)] pt-3">
        <Button tone="light" variant="secondary" onClick={onDetail}>
          Ver detalle
        </Button>
        {canManage ? (
          <Button tone="light" variant="secondary" onClick={onEdit}>
            Editar
          </Button>
        ) : (
          <span />
        )}
        {canManage && (
          <Button
            tone="light"
            variant={client.isActive ? "danger" : "ghost"}
            className="col-span-2"
            onClick={onToggle}
          >
            {client.isActive ? "Archivar" : "Restaurar"}
          </Button>
        )}
      </div>
    </Card>
  );
}

function ClientDetailModal({
  id,
  canManage,
  showNotes,
  onClose,
  onEdit,
  onToggle,
}: {
  id: string;
  canManage: boolean;
  showNotes: boolean;
  onClose: () => void;
  onEdit: (client: Client) => void;
  onToggle: (client: Client) => void;
}) {
  const query = useClientDetailQuery(id);
  const client = query.data;

  return (
    <Modal title="Detalle del cliente" tone="light" onClose={onClose}>
      {query.isLoading ? (
        <div className="space-y-4" aria-label="Cargando detalle del cliente">
          <Skeleton tone="light" className="h-20 w-full" />
          <Skeleton tone="light" className="h-32 w-full" />
        </div>
      ) : query.isError ? (
        <div role="alert" className="rounded-lg bg-[var(--dash-danger-bg)] p-4">
          <p className="text-sm font-semibold text-[var(--dash-danger)]">
            {errorMessage(query.error, "No se pudo cargar el detalle.")}
          </p>
          <Button tone="light" variant="secondary" className="mt-3" onClick={() => void query.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : client ? (
        <div>
          <div className="flex items-start justify-between gap-3 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] p-4">
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-[var(--dash-text)]">{client.name}</p>
              <p className="mt-1 text-sm text-[var(--dash-text-muted)]">Ficha de contacto</p>
            </div>
            <ClientStatus isActive={client.isActive} />
          </div>
          <dl className="mt-4 divide-y divide-[var(--dash-border)] rounded-xl border border-[var(--dash-border)] px-4">
            <DetailRow label="Correo" value={client.email || "No registrado"} />
            <DetailRow label="Teléfono" value={client.phone || "No registrado"} />
            {showNotes && <DetailRow label="Notas" value={client.notes || "Sin notas"} multiline />}
            {showNotes && formatDate(client.createdAt) && (
              <DetailRow label="Creado" value={formatDate(client.createdAt) ?? ""} />
            )}
            {showNotes && formatDate(client.updatedAt) && (
              <DetailRow label="Actualizado" value={formatDate(client.updatedAt) ?? ""} />
            )}
          </dl>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button tone="light" variant="ghost" onClick={onClose}>
              Cerrar
            </Button>
            {canManage && (
              <>
                <Button tone="light" variant="secondary" onClick={() => onEdit(client)}>
                  Editar
                </Button>
                <Button
                  tone="light"
                  variant={client.isActive ? "danger" : "secondary"}
                  onClick={() => onToggle(client)}
                >
                  {client.isActive ? "Archivar" : "Restaurar"}
                </Button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function DetailRow({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[110px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--dash-text-muted)]">
        {label}
      </dt>
      <dd
        className={`text-sm text-[var(--dash-text)] ${
          multiline ? "whitespace-pre-wrap break-words" : "break-all sm:break-words"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function ClientFormModal({
  mode,
  client,
  onClose,
  onSuccess,
}: {
  mode: "create" | "edit";
  client?: Client;
  onClose: () => void;
  onSuccess: (client: Client) => void;
}) {
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const [name, setName] = useState(client?.name ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [phone, setPhone] = useState(client?.phone ?? "");
  const [notes, setNotes] = useState(client?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const pending = createClient.isPending || updateClient.isPending;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const normalizedName = name.trim();
    if (!normalizedName) {
      setError("El nombre es obligatorio.");
      return;
    }

    const values: ClientWriteInput = {
      name: normalizedName,
      email: email.trim() || null,
      phone: phone.trim() || null,
      notes: notes.trim() || null,
    };

    try {
      if (mode === "create") {
        const created = await createClient.mutateAsync(values);
        onSuccess(created);
        return;
      }

      if (!client) return;
      const changed: Partial<ClientWriteInput> = {};
      if (values.name !== client.name) changed.name = values.name;
      if (values.email !== (client.email ?? null)) changed.email = values.email;
      if (values.phone !== (client.phone ?? null)) changed.phone = values.phone;
      if (values.notes !== (client.notes ?? null)) changed.notes = values.notes;
      if (Object.keys(changed).length === 0) {
        setError("No realizaste ningún cambio.");
        return;
      }
      const updated = await updateClient.mutateAsync({ id: client.id, ...changed });
      onSuccess(updated);
    } catch (mutationError) {
      setError(
        errorMessage(
          mutationError,
          mode === "create" ? "No se pudo crear el cliente." : "No se pudo actualizar el cliente.",
        ),
      );
    }
  }

  return (
    <Modal
      title={mode === "create" ? "Nuevo cliente" : "Editar cliente"}
      tone="light"
      size="lg"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField
          tone="light"
          label="Nombre"
          name={`${mode}-client-name`}
          maxLength={120}
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputField
            tone="light"
            label="Correo (opcional)"
            name={`${mode}-client-email`}
            type="email"
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <InputField
            tone="light"
            label="Teléfono (opcional)"
            name={`${mode}-client-phone`}
            type="tel"
            maxLength={30}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </div>
        <FieldWrapper
          tone="light"
          label="Notas internas (opcional)"
          htmlFor={`${mode}-client-notes`}
        >
          <textarea
            id={`${mode}-client-notes`}
            name={`${mode}-client-notes`}
            maxLength={2000}
            rows={5}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="w-full resize-y rounded-sm border border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] px-3 py-2 text-sm text-[var(--dash-text)] outline-none transition-colors placeholder:text-[var(--dash-text-faint)] focus:border-[var(--dash-accent)]"
          />
        </FieldWrapper>
        <p className="text-right text-xs text-[var(--dash-text-faint)]">{notes.length}/2000</p>
        {error && (
          <p role="alert" className="rounded-lg bg-[var(--dash-danger-bg)] px-3 py-2 text-sm text-[var(--dash-danger)]">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 border-t border-[var(--dash-border)] pt-4 sm:flex-row sm:justify-end">
          <Button tone="light" variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button tone="light" type="submit" disabled={pending}>
            {pending ? "Guardando…" : mode === "create" ? "Crear cliente" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ClientStateModal({
  confirmation,
  onClose,
  onSuccess,
}: {
  confirmation: Confirmation;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const archiveClient = useArchiveClient();
  const restoreClient = useRestoreClient();
  const [error, setError] = useState<string | null>(null);
  const isArchive = confirmation.action === "archive";
  const pending = archiveClient.isPending || restoreClient.isPending;

  async function confirm() {
    setError(null);
    try {
      if (isArchive) {
        await archiveClient.mutateAsync(confirmation.client.id);
      } else {
        await restoreClient.mutateAsync(confirmation.client.id);
      }
      onSuccess();
    } catch (mutationError) {
      setError(
        errorMessage(
          mutationError,
          isArchive ? "No se pudo archivar el cliente." : "No se pudo restaurar el cliente.",
        ),
      );
    }
  }

  return (
    <Modal title={isArchive ? "Archivar cliente" : "Restaurar cliente"} tone="light" onClose={onClose}>
      <p className="text-sm leading-6 text-[var(--dash-text-muted)]">
        {isArchive
          ? `“${confirmation.client.name}” dejará de aparecer entre los clientes activos y no podrá usarse en nuevas reservas internas.`
          : `“${confirmation.client.name}” volverá a estar disponible entre los clientes activos.`}
      </p>
      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-[var(--dash-danger-bg)] px-3 py-2 text-sm text-[var(--dash-danger)]">
          {error}
        </p>
      )}
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button tone="light" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          tone="light"
          variant={isArchive ? "danger" : "primary"}
          disabled={pending}
          onClick={() => void confirm()}
        >
          {pending ? "Procesando…" : isArchive ? "Archivar" : "Restaurar"}
        </Button>
      </div>
    </Modal>
  );
}
