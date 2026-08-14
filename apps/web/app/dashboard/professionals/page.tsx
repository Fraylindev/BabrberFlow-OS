"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  ApiError,
  Professional,
  ProfessionalManagement,
  ProfessionalOwnProfile,
  ProfessionalStatus,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  CreateProfessionalInput,
  UpdateOwnProfessionalInput,
  useArchiveProfessional,
  useBarberMembersQuery,
  useCreateProfessional,
  useLinkProfessional,
  useOwnProfessionalQuery,
  useProfessionalDetailQuery,
  useProfessionalsPageQuery,
  useRestoreProfessional,
  useUnlinkProfessional,
  useUpdateOwnProfessional,
  useUpdateProfessional,
  useUpdateProfessionalStatus,
  useUpdateProfessionalVisibility,
} from "@/lib/queries/professionals";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FieldWrapper, InputField, SelectField } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, SkeletonListRows } from "@/components/ui/Skeleton";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;
const TEXTAREA_CLASS =
  "min-h-28 w-full resize-y rounded-sm border border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] px-3 py-2 text-sm text-[var(--dash-text)] placeholder:text-[var(--dash-text-faint)] outline-none transition-colors focus:border-[var(--dash-accent)]";

type StatusFilter = "ALL" | ProfessionalStatus;
type FormMode = "create" | "edit" | "own";
type ConfirmationKind =
  | "activate"
  | "deactivate"
  | "publish"
  | "unpublish"
  | "archive"
  | "restore"
  | "unlink";
type Confirmation = {
  professional: ProfessionalManagement;
  kind: ConfirmationKind;
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

function isManagementProfessional(
  professional: Professional | ProfessionalManagement,
): professional is ProfessionalManagement {
  return "isPublic" in professional && "linkedUser" in professional;
}

function statusLabel(status: ProfessionalStatus) {
  if (status === "ACTIVE") return "Activo";
  if (status === "INACTIVE") return "Inactivo";
  return "Archivado";
}

function ProfessionalStatusBadge({ status }: { status: ProfessionalStatus }) {
  const className =
    status === "ACTIVE"
      ? "bg-[var(--dash-success-bg)] text-[var(--dash-success)]"
      : status === "ARCHIVED"
        ? "bg-[var(--dash-surface-raised)] text-[var(--dash-text-faint)]"
        : "bg-amber-50 text-amber-700";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      {statusLabel(status)}
    </span>
  );
}

function Avatar({ professional }: { professional: Professional }) {
  const initial = professional.name.trim().charAt(0).toUpperCase() || "P";
  return professional.avatar ? (
    <div
      role="img"
      aria-label={`Foto de ${professional.name}`}
      className="h-11 w-11 shrink-0 rounded-full bg-cover bg-center ring-1 ring-[var(--dash-border)]"
      style={{ backgroundImage: `url(${JSON.stringify(professional.avatar).slice(1, -1)})` }}
    />
  ) : (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--dash-accent-soft)] font-semibold text-[var(--dash-accent)]">
      {initial}
    </div>
  );
}

export default function ProfessionalsPage() {
  const { user, organization } = useAuth();
  const { toast } = useToast();
  const isManager = user?.role === "OWNER" || user?.role === "ADMIN";
  const isBarber = user?.role === "BARBER";
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ProfessionalManagement | null>(null);
  const [editOwnOpen, setEditOwnOpen] = useState(false);
  const [linking, setLinking] = useState<ProfessionalManagement | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const query = useProfessionalsPageQuery({
    search: search || undefined,
    status: status === "ALL" ? undefined : status,
    page,
    limit: PAGE_SIZE,
    scope: `${organization?.id ?? "pending"}:${isManager ? "management" : "directory"}`,
  });
  const ownQuery = useOwnProfessionalQuery(
    Boolean(isBarber),
    organization?.id,
    user?.id,
  );
  const professionals = query.data?.professionals ?? [];
  const pagination = query.data?.pagination;
  const hasFilters = Boolean(search) || status !== "ALL";

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(draftSearch.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [draftSearch]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setSearch(draftSearch.trim());
    setPage(1);
  }

  function clearFilters() {
    setDraftSearch("");
    setSearch("");
    setStatus("ALL");
    setPage(1);
  }

  return (
    <div className="min-w-0">
      <PageHeader
        tone="light"
        title={isBarber ? "Mi perfil profesional" : "Profesionales"}
        description={
          isBarber
            ? "Administra tu información pública y consulta el directorio del equipo."
            : isManager
              ? "Administra perfiles, disponibilidad operativa, publicación y cuentas vinculadas."
              : "Consulta los profesionales disponibles de la organización."
        }
        action={
          isManager ? (
            <Button tone="light" className="min-h-11" onClick={() => setCreateOpen(true)}>
              + Nuevo profesional
            </Button>
          ) : undefined
        }
      />

      {isBarber && (
        <OwnProfilePanel
          query={ownQuery}
          onEdit={() => setEditOwnOpen(true)}
        />
      )}

      <Card tone="light" className="mb-5 p-4 sm:p-5">
        <form
          onSubmit={submitSearch}
          className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-end"
        >
          <InputField
            tone="light"
            label="Buscar"
            name="professional-search"
            type="search"
            maxLength={120}
            value={draftSearch}
            placeholder="Nombre o especialidad"
            onChange={(event) => setDraftSearch(event.target.value)}
          />
          <SelectField
            tone="light"
            label="Estado"
            name="professional-status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as StatusFilter);
              setPage(1);
            }}
          >
            <option value="ALL">Todos (sin archivados)</option>
            <option value="ACTIVE">Activos</option>
            <option value="INACTIVE">Inactivos</option>
            {isManager && <option value="ARCHIVED">Archivados</option>}
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
        <Card tone="light" aria-label="Cargando profesionales">
          <SkeletonListRows tone="light" rows={6} />
        </Card>
      ) : query.isError ? (
        <ErrorState
          title="No pudimos mostrar los profesionales"
          message={errorMessage(query.error, "No pudimos cargar el directorio.")}
          onRetry={() => void query.refetch()}
        />
      ) : professionals.length === 0 ? (
        <EmptyState
          tone="light"
          title={hasFilters ? "No encontramos profesionales" : "Todavía no hay profesionales"}
          description={
            hasFilters
              ? "Prueba otra búsqueda o cambia el filtro de estado."
              : isManager
                ? "Crea el primer perfil para comenzar a organizar el equipo."
                : "El directorio todavía no tiene perfiles disponibles."
          }
          action={
            hasFilters ? (
              <Button tone="light" variant="secondary" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            ) : isManager ? (
              <Button tone="light" onClick={() => setCreateOpen(true)}>
                + Nuevo profesional
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden">
            {professionals.map((professional) => (
              <ProfessionalCard
                key={professional.id}
                professional={professional}
                canManage={Boolean(isManager)}
                onDetail={() => setDetailId(professional.id)}
              />
            ))}
          </div>

          <Card tone="light" className="hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-left">
                <thead className="border-b border-[var(--dash-border)] bg-[var(--dash-surface-raised)]">
                  <tr className="text-xs font-semibold uppercase tracking-wider text-[var(--dash-text-muted)]">
                    <th className="w-[32%] px-5 py-3">Profesional</th>
                    <th className="w-[20%] px-4 py-3">Especialidad</th>
                    <th className="w-[15%] px-4 py-3">Estado</th>
                    {isManager && <th className="w-[15%] px-4 py-3">Publicación</th>}
                    <th className="px-5 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--dash-border)]">
                  {professionals.map((professional) => (
                    <tr key={professional.id} className="text-sm text-[var(--dash-text)]">
                      <td className="px-5 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar professional={professional} />
                          <div className="min-w-0">
                            <p className="truncate font-semibold" title={professional.name}>
                              {professional.name}
                            </p>
                            {isManagementProfessional(professional) && (
                              <p className="truncate text-xs text-[var(--dash-text-muted)]">
                                {professional.linkedUser?.email ?? "Sin cuenta vinculada"}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="truncate px-4 py-4 text-[var(--dash-text-muted)]">
                        {professional.specialty || "Sin especialidad"}
                      </td>
                      <td className="px-4 py-4">
                        <ProfessionalStatusBadge status={professional.status} />
                      </td>
                      {isManager && (
                        <td className="px-4 py-4 text-[var(--dash-text-muted)]">
                          {isManagementProfessional(professional) && professional.isPublic
                            ? "Público"
                            : "Privado"}
                        </td>
                      )}
                      <td className="px-5 py-4 text-right">
                        {isManager ? (
                          <Button
                            tone="light"
                            variant="secondary"
                            className="px-3"
                            onClick={() => setDetailId(professional.id)}
                          >
                            Gestionar
                          </Button>
                        ) : (
                          <span className="text-xs text-[var(--dash-text-faint)]">Solo lectura</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Pagination
            page={page}
            count={professionals.length}
            pagination={pagination}
            fetching={query.isFetching}
            onPage={setPage}
          />
        </>
      )}

      {createOpen && (
        <ProfessionalFormModal
          mode="create"
          onClose={() => setCreateOpen(false)}
          onSuccess={(professional) => {
            setCreateOpen(false);
            setStatus("ALL");
            setPage(1);
            toast(`${professional.name} fue creado como perfil inactivo y privado.`);
          }}
        />
      )}

      {editing && (
        <ProfessionalFormModal
          mode="edit"
          professional={editing}
          onClose={() => setEditing(null)}
          onSuccess={(professional) => {
            setEditing(null);
            setDetailId(professional.id);
            toast("El perfil profesional fue actualizado.");
          }}
        />
      )}

      {editOwnOpen && ownQuery.data && (
        <ProfessionalFormModal
          mode="own"
          professional={ownQuery.data}
          onClose={() => setEditOwnOpen(false)}
          onSuccess={() => {
            setEditOwnOpen(false);
            toast("Tu perfil público fue actualizado.");
          }}
        />
      )}

      {detailId && isManager && (
        <ProfessionalDetailModal
          id={detailId}
          onClose={() => setDetailId(null)}
          onEdit={(professional) => {
            setDetailId(null);
            setEditing(professional);
          }}
          onConfirm={(professional, kind) => {
            setDetailId(null);
            setConfirmation({ professional, kind });
          }}
          onLink={(professional) => {
            setDetailId(null);
            setLinking(professional);
          }}
        />
      )}

      {linking && (
        <LinkProfessionalModal
          professional={linking}
          onClose={() => setLinking(null)}
          onSuccess={() => {
            setLinking(null);
            toast("La cuenta BARBER fue vinculada al perfil.");
          }}
        />
      )}

      {confirmation && (
        <ProfessionalConfirmationModal
          confirmation={confirmation}
          onClose={() => setConfirmation(null)}
          onSuccess={(message) => {
            if (professionals.length === 1 && page > 1) setPage((current) => current - 1);
            setConfirmation(null);
            toast(message);
          }}
        />
      )}
    </div>
  );
}

function OwnProfilePanel({
  query,
  onEdit,
}: {
  query: ReturnType<typeof useOwnProfessionalQuery>;
  onEdit: () => void;
}) {
  if (query.isLoading) {
    return (
      <Card tone="light" className="mb-5 p-5" aria-label="Cargando perfil propio">
        <Skeleton tone="light" className="h-20 w-full" />
      </Card>
    );
  }
  if (query.isError) {
    return (
      <ErrorState
        title="Tu cuenta no tiene un perfil profesional disponible"
        message={errorMessage(query.error, "Solicita a un administrador que vincule tu cuenta.")}
        onRetry={() => void query.refetch()}
        className="mb-5"
      />
    );
  }
  if (!query.data) return null;
  return (
    <Card tone="light" className="mb-5 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar professional={query.data} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-[var(--dash-text)]">{query.data.name}</p>
            <p className="mt-1 text-sm text-[var(--dash-text-muted)]">
              {query.data.specialty || "Sin especialidad"} · {statusLabel(query.data.status)} ·{" "}
              {query.data.isPublic ? "Visible públicamente" : "Perfil privado"}
            </p>
          </div>
        </div>
        <Button tone="light" variant="secondary" onClick={onEdit}>
          Editar mi perfil
        </Button>
      </div>
    </Card>
  );
}

function ProfessionalCard({
  professional,
  canManage,
  onDetail,
}: {
  professional: Professional | ProfessionalManagement;
  canManage: boolean;
  onDetail: () => void;
}) {
  return (
    <Card tone="light" className="p-4">
      <div className="flex items-start gap-3">
        <Avatar professional={professional} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-semibold text-[var(--dash-text)]">{professional.name}</p>
            <ProfessionalStatusBadge status={professional.status} />
          </div>
          <p className="mt-1 truncate text-sm text-[var(--dash-text-muted)]">
            {professional.specialty || "Sin especialidad"}
          </p>
          {isManagementProfessional(professional) && (
            <p className="mt-1 truncate text-xs text-[var(--dash-text-faint)]">
              {professional.linkedUser?.email ?? "Sin cuenta vinculada"} ·{" "}
              {professional.isPublic ? "Público" : "Privado"}
            </p>
          )}
        </div>
      </div>
      {canManage && (
        <Button tone="light" variant="secondary" className="mt-4 w-full" onClick={onDetail}>
          Gestionar perfil
        </Button>
      )}
    </Card>
  );
}

function Pagination({
  page,
  count,
  pagination,
  fetching,
  onPage,
}: {
  page: number;
  count: number;
  pagination: ReturnType<typeof useProfessionalsPageQuery>["data"] extends
    | { pagination: infer T }
    | undefined
    ? T | undefined
    : never;
  fetching: boolean;
  onPage: (page: number) => void;
}) {
  return (
    <div className="mt-4 flex flex-col gap-3 text-sm text-[var(--dash-text-muted)] sm:flex-row sm:items-center sm:justify-between">
      <p aria-live="polite">
        {pagination?.metadataAvailable ? (
          <>
            {pagination.total} profesional{pagination.total === 1 ? "" : "es"} · página{" "}
            {pagination.page}
            {pagination.totalPages ? ` de ${pagination.totalPages}` : ""}
          </>
        ) : (
          <>{count} perfiles mostrados · metadata de paginación no disponible</>
        )}
      </p>
      {pagination?.metadataAvailable && pagination.totalPages > 1 && (
        <div className="flex gap-2">
          <Button
            tone="light"
            variant="secondary"
            disabled={page <= 1 || fetching}
            onClick={() => onPage(Math.max(1, page - 1))}
          >
            Anterior
          </Button>
          <Button
            tone="light"
            variant="secondary"
            disabled={page >= pagination.totalPages || fetching}
            onClick={() => onPage(page + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}

function ProfessionalFormModal({
  mode,
  professional,
  onClose,
  onSuccess,
}: {
  mode: FormMode;
  professional?: ProfessionalManagement | ProfessionalOwnProfile;
  onClose: () => void;
  onSuccess: (professional: ProfessionalManagement | ProfessionalOwnProfile) => void;
}) {
  const createProfessional = useCreateProfessional();
  const updateProfessional = useUpdateProfessional();
  const updateOwnProfessional = useUpdateOwnProfessional();
  const [name, setName] = useState(professional?.name ?? "");
  const [specialty, setSpecialty] = useState(professional?.specialty ?? "");
  const [bio, setBio] = useState(professional?.bio ?? "");
  const [avatar, setAvatar] = useState(professional?.avatar ?? "");
  const [phone, setPhone] = useState(
    professional && "phone" in professional ? (professional.phone ?? "") : "",
  );
  const [experienceYears, setExperienceYears] = useState(
    professional?.experienceYears?.toString() ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const pending =
    createProfessional.isPending || updateProfessional.isPending || updateOwnProfessional.isPending;
  const isOwn = mode === "own";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const common: CreateProfessionalInput = {
      name: name.trim(),
      specialty: specialty.trim() || null,
      bio: bio.trim() || null,
      avatar: avatar.trim() || null,
      experienceYears: experienceYears === "" ? null : Number(experienceYears),
      ...(isOwn ? {} : { phone: phone.trim() || null }),
    };
    try {
      if (mode === "create") {
        const created = await createProfessional.mutateAsync(common);
        onSuccess(created as ProfessionalManagement);
      } else if (mode === "edit" && professional) {
        const updated = await updateProfessional.mutateAsync({ id: professional.id, ...common });
        onSuccess(updated);
      } else {
        const ownInput: UpdateOwnProfessionalInput = common;
        const updated = await updateOwnProfessional.mutateAsync(ownInput);
        onSuccess(updated);
      }
    } catch (mutationError) {
      setError(errorMessage(mutationError, "No se pudo guardar el perfil profesional."));
    }
  }

  return (
    <Modal
      title={mode === "create" ? "Nuevo profesional" : isOwn ? "Editar mi perfil" : "Editar profesional"}
      tone="light"
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        {mode === "create" && (
          <p className="rounded-lg bg-[var(--dash-info-bg)] px-3 py-2 text-sm text-[var(--dash-text-muted)]">
            El perfil se crea inactivo y privado. Podrás activarlo y publicarlo después de completar sus datos.
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputField
            tone="light"
            label="Nombre"
            name={`${mode}-professional-name`}
            required
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <InputField
            tone="light"
            label="Especialidad (opcional)"
            name={`${mode}-professional-specialty`}
            maxLength={120}
            value={specialty}
            onChange={(event) => setSpecialty(event.target.value)}
          />
          {!isOwn && (
            <InputField
              tone="light"
              label="Teléfono interno (opcional)"
              name={`${mode}-professional-phone`}
              maxLength={30}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          )}
          <InputField
            tone="light"
            label="Años de experiencia (opcional)"
            name={`${mode}-professional-experience`}
            type="number"
            min={0}
            step={1}
            value={experienceYears}
            onChange={(event) => setExperienceYears(event.target.value)}
          />
        </div>
        <InputField
          tone="light"
          label="URL de foto (opcional)"
          name={`${mode}-professional-avatar`}
          type="url"
          maxLength={2048}
          placeholder="https://…"
          value={avatar}
          onChange={(event) => setAvatar(event.target.value)}
        />
        <FieldWrapper label="Biografía (opcional)" htmlFor={`${mode}-professional-bio`} tone="light">
          <textarea
            id={`${mode}-professional-bio`}
            maxLength={2000}
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            className={TEXTAREA_CLASS}
          />
        </FieldWrapper>
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
            {pending ? "Guardando…" : mode === "create" ? "Crear profesional" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ProfessionalDetailModal({
  id,
  onClose,
  onEdit,
  onConfirm,
  onLink,
}: {
  id: string;
  onClose: () => void;
  onEdit: (professional: ProfessionalManagement) => void;
  onConfirm: (professional: ProfessionalManagement, kind: ConfirmationKind) => void;
  onLink: (professional: ProfessionalManagement) => void;
}) {
  const { organization } = useAuth();
  const query = useProfessionalDetailQuery(id, organization?.id);
  return (
    <Modal title="Detalle profesional" tone="light" onClose={onClose}>
      {query.isLoading ? (
        <div className="space-y-3">
          <Skeleton tone="light" className="h-16 w-full" />
          <Skeleton tone="light" className="h-28 w-full" />
        </div>
      ) : query.isError || !query.data ? (
        <ErrorState
          title="No pudimos cargar el perfil"
          message={errorMessage(query.error, "El perfil ya no está disponible.")}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <div className="space-y-5">
          <div className="flex items-start gap-4">
            <Avatar professional={query.data} />
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-[var(--dash-text)]">{query.data.name}</h3>
              <p className="text-sm text-[var(--dash-text-muted)]">
                {query.data.specialty || "Sin especialidad"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <ProfessionalStatusBadge status={query.data.status} />
                <span className="rounded-full bg-[var(--dash-surface-raised)] px-2.5 py-1 text-xs font-semibold text-[var(--dash-text-muted)]">
                  {query.data.isPublic ? "Público" : "Privado"}
                </span>
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-3 rounded-lg border border-[var(--dash-border)] p-4 sm:grid-cols-2">
            <Detail label="Teléfono" value={query.data.phone || "No registrado"} />
            <Detail
              label="Experiencia"
              value={
                query.data.experienceYears === null
                  ? "No registrada"
                  : `${query.data.experienceYears} año${query.data.experienceYears === 1 ? "" : "s"}`
              }
            />
            <Detail
              label="Cuenta vinculada"
              value={query.data.linkedUser?.email ?? "Sin cuenta vinculada"}
            />
            <Detail label="Biografía" value={query.data.bio || "Sin biografía"} />
          </dl>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button tone="light" variant="secondary" onClick={() => onEdit(query.data)}>
              Editar información
            </Button>
            {query.data.status !== "ARCHIVED" && (
              <Button
                tone="light"
                variant="secondary"
                onClick={() =>
                  onConfirm(query.data, query.data.status === "ACTIVE" ? "deactivate" : "activate")
                }
              >
                {query.data.status === "ACTIVE" ? "Marcar inactivo" : "Activar profesional"}
              </Button>
            )}
            <Button
              tone="light"
              variant="secondary"
              onClick={() => onConfirm(query.data, query.data.isPublic ? "unpublish" : "publish")}
              disabled={query.data.status === "ARCHIVED"}
            >
              {query.data.isPublic ? "Quitar de página pública" : "Publicar perfil"}
            </Button>
            {query.data.linkedUser ? (
              <Button tone="light" variant="secondary" onClick={() => onConfirm(query.data, "unlink")}>
                Desvincular cuenta
              </Button>
            ) : (
              <Button tone="light" variant="secondary" onClick={() => onLink(query.data)}>
                Vincular cuenta BARBER
              </Button>
            )}
            {query.data.status === "ARCHIVED" ? (
              <Button tone="light" onClick={() => onConfirm(query.data, "restore")}>
                Restaurar como inactivo
              </Button>
            ) : (
              <Button tone="light" variant="danger" onClick={() => onConfirm(query.data, "archive")}>
                Archivar profesional
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--dash-text-faint)]">{label}</dt>
      <dd className="mt-1 break-words text-sm text-[var(--dash-text)]">{value}</dd>
    </div>
  );
}

function LinkProfessionalModal({
  professional,
  onClose,
  onSuccess,
}: {
  professional: ProfessionalManagement;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { organization } = useAuth();
  const membersQuery = useBarberMembersQuery(true, organization?.id);
  const linkProfessional = useLinkProfessional();
  const [userId, setUserId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const availableMembers =
    membersQuery.data?.filter(
      (member) => !member.user.professional || member.user.professional.id === professional.id,
    ) ?? [];

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!userId) return;
    setError(null);
    try {
      await linkProfessional.mutateAsync({ id: professional.id, userId });
      onSuccess();
    } catch (mutationError) {
      setError(errorMessage(mutationError, "No se pudo vincular la cuenta."));
    }
  }

  return (
    <Modal title="Vincular cuenta BARBER" tone="light" onClose={onClose}>
      <p className="mb-4 text-sm leading-6 text-[var(--dash-text-muted)]">
        Selecciona una Membership BARBER sin otro perfil vinculado en esta organización.
      </p>
      {membersQuery.isLoading ? (
        <Skeleton tone="light" className="h-24 w-full" />
      ) : membersQuery.isError ? (
        <ErrorState
          title="No pudimos cargar las cuentas BARBER"
          message={errorMessage(membersQuery.error, "No se pudo consultar el equipo.")}
          onRetry={() => void membersQuery.refetch()}
        />
      ) : availableMembers.length === 0 ? (
        <EmptyState
          tone="light"
          title="No hay cuentas disponibles"
          description="Invita un BARBER desde Equipo o desvincula una cuenta existente."
        />
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <SelectField
            tone="light"
            label="Cuenta BARBER"
            name="professional-user-link"
            required
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
          >
            <option value="">Seleccionar cuenta</option>
            {availableMembers.map((member) => (
              <option key={member.user.id} value={member.user.id}>
                {member.user.name} · {member.user.email}
              </option>
            ))}
          </SelectField>
          {error && <p role="alert" className="text-sm text-[var(--dash-danger)]">{error}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button tone="light" variant="ghost" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button tone="light" type="submit" disabled={!userId || linkProfessional.isPending}>
              {linkProfessional.isPending ? "Vinculando…" : "Vincular cuenta"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

const CONFIRMATION_COPY: Record<
  ConfirmationKind,
  { title: string; body: (name: string) => string; button: string; success: (name: string) => string }
> = {
  activate: {
    title: "Activar profesional",
    body: (name) => `${name} podrá recibir nuevas reservas internas.`,
    button: "Activar",
    success: (name) => `${name} está activo.`,
  },
  deactivate: {
    title: "Marcar como inactivo",
    body: (name) => `${name} conservará su historial, pero no podrá recibir nuevas reservas.`,
    button: "Marcar inactivo",
    success: (name) => `${name} está inactivo.`,
  },
  publish: {
    title: "Publicar perfil",
    body: (name) => `${name} aparecerá en el flujo público cuando su estado sea activo.`,
    button: "Publicar",
    success: (name) => `${name} quedó publicado.`,
  },
  unpublish: {
    title: "Ocultar perfil público",
    body: (name) => `${name} dejará de aparecer en el flujo público de reservas.`,
    button: "Ocultar",
    success: (name) => `${name} quedó privado.`,
  },
  archive: {
    title: "Archivar profesional",
    body: (name) =>
      `${name} quedará fuera de la operación. El backend impedirá el archivo si conserva reservas futuras pendientes o confirmadas.`,
    button: "Archivar",
    success: (name) => `${name} fue archivado.`,
  },
  restore: {
    title: "Restaurar profesional",
    body: (name) => `${name} volverá como perfil inactivo y deberá activarse explícitamente.`,
    button: "Restaurar",
    success: (name) => `${name} fue restaurado como inactivo.`,
  },
  unlink: {
    title: "Desvincular cuenta",
    body: (name) => `La cuenta BARBER dejará de administrar el perfil de ${name}.`,
    button: "Desvincular",
    success: (name) => `La cuenta de ${name} fue desvinculada.`,
  },
};

function ProfessionalConfirmationModal({
  confirmation,
  onClose,
  onSuccess,
}: {
  confirmation: Confirmation;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const statusMutation = useUpdateProfessionalStatus();
  const visibilityMutation = useUpdateProfessionalVisibility();
  const archiveMutation = useArchiveProfessional();
  const restoreMutation = useRestoreProfessional();
  const unlinkMutation = useUnlinkProfessional();
  const [error, setError] = useState<string | null>(null);
  const copy = CONFIRMATION_COPY[confirmation.kind];
  const pending =
    statusMutation.isPending ||
    visibilityMutation.isPending ||
    archiveMutation.isPending ||
    restoreMutation.isPending ||
    unlinkMutation.isPending;

  async function confirm() {
    setError(null);
    try {
      const { id } = confirmation.professional;
      if (confirmation.kind === "activate" || confirmation.kind === "deactivate") {
        await statusMutation.mutateAsync({
          id,
          status: confirmation.kind === "activate" ? "ACTIVE" : "INACTIVE",
        });
      } else if (confirmation.kind === "publish" || confirmation.kind === "unpublish") {
        await visibilityMutation.mutateAsync({ id, isPublic: confirmation.kind === "publish" });
      } else if (confirmation.kind === "archive") {
        await archiveMutation.mutateAsync(id);
      } else if (confirmation.kind === "restore") {
        await restoreMutation.mutateAsync(id);
      } else {
        await unlinkMutation.mutateAsync(id);
      }
      onSuccess(copy.success(confirmation.professional.name));
    } catch (mutationError) {
      setError(errorMessage(mutationError, "No se pudo completar la acción."));
    }
  }

  return (
    <Modal title={copy.title} tone="light" onClose={onClose}>
      <p className="text-sm leading-6 text-[var(--dash-text-muted)]">
        {copy.body(confirmation.professional.name)}
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
          variant={confirmation.kind === "archive" || confirmation.kind === "unlink" ? "danger" : "primary"}
          disabled={pending}
          onClick={() => void confirm()}
        >
          {pending ? "Procesando…" : copy.button}
        </Button>
      </div>
    </Modal>
  );
}

function ErrorState({
  title,
  message,
  onRetry,
  className = "",
}: {
  title: string;
  message: string;
  onRetry: () => void;
  className?: string;
}) {
  return (
    <Card tone="light" className={`border-[var(--dash-danger)]/25 p-6 text-center ${className}`}>
      <p className="font-semibold text-[var(--dash-danger)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--dash-text-muted)]">{message}</p>
      <Button tone="light" variant="secondary" className="mt-4" onClick={onRetry}>
        Reintentar
      </Button>
    </Card>
  );
}
