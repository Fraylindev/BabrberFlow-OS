"use client";

import { useState, type FormEvent } from "react";
import { ApiError, type TeamInvitationStatus, type UserRole } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  useCreateTeamInvitation,
  useResendTeamInvitation,
  useRevokeTeamInvitation,
  useTeamInvitationsQuery,
} from "@/lib/queries/team-invitations";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { InputField, SelectField } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";

const INVITABLE_ROLES: Array<{
  value: Exclude<UserRole, "OWNER">;
  label: string;
}> = [
  { value: "ADMIN", label: "Administrador" },
  { value: "BARBER", label: "Barbero" },
  { value: "RECEPTIONIST", label: "Recepción" },
];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  BARBER: "Barbero",
  RECEPTIONIST: "Recepción",
};

const STATUS_LABELS: Record<TeamInvitationStatus, string> = {
  CREATING: "Preparando",
  PENDING: "Pendiente",
  RESENDING: "Reenviando",
  REVOKING: "Revocando",
  ACCEPTED: "Aceptada",
  REVOKED: "Revocada",
  EXPIRED: "Vencida",
  FAILED: "No enviada",
};

const MANAGEABLE = new Set<TeamInvitationStatus>([
  "PENDING",
  "EXPIRED",
  "FAILED",
  "REVOKED",
]);

function friendlyInvitationError(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) {
    return "No pudimos aplicar esa acción porque la invitación cambió o ya existe otra activa.";
  }
  if (error instanceof ApiError && error.status === 503) {
    return "El servicio de invitaciones no está disponible ahora. Intenta de nuevo en unos minutos.";
  }
  if (error instanceof ApiError && error.status === 403) {
    return "No tienes permiso para administrar invitaciones.";
  }
  return "No pudimos completar la acción. Revisa tu conexión e intenta de nuevo.";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-DO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function TeamPage() {
  const { organization, user } = useAuth();
  const { toast } = useToast();
  const canManage = user?.role === "OWNER" || user?.role === "ADMIN";
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<UserRole, "OWNER">>("BARBER");
  const [createPublicProfile, setCreatePublicProfile] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<TeamInvitationStatus | "ALL">("ALL");
  const [formError, setFormError] = useState<string | null>(null);

  const invitations = useTeamInvitationsQuery({
    organizationId: organization?.id,
    page,
    status: status === "ALL" ? undefined : status,
    enabled: canManage,
  });
  const createInvitation = useCreateTeamInvitation();
  const resendInvitation = useResendTeamInvitation();
  const revokeInvitation = useRevokeTeamInvitation();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    try {
      await createInvitation.mutateAsync({
        email: email.trim().toLowerCase(),
        role,
        createPublicProfile: role === "BARBER" && createPublicProfile,
      });
      setEmail("");
      toast("Invitación enviada. La persona recibirá un enlace seguro.", "success");
      setPage(1);
    } catch (error) {
      const message = friendlyInvitationError(error);
      setFormError(message);
      toast(message, "error");
    }
  }

  async function resend(id: string) {
    try {
      await resendInvitation.mutateAsync(id);
      toast("Invitación reenviada.", "success");
    } catch (error) {
      toast(friendlyInvitationError(error), "error");
    }
  }

  async function revoke(id: string) {
    try {
      await revokeInvitation.mutateAsync(id);
      toast("Invitación revocada.", "success");
    } catch (error) {
      toast(friendlyInvitationError(error), "error");
    }
  }

  if (!canManage) {
    return (
      <EmptyState
        tone="light"
        title="No tienes acceso a invitaciones"
        description="Solo el propietario o una persona administradora puede gestionar el acceso del equipo."
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Equipo"
        description="Invita personas con un enlace seguro y revisa el estado de cada acceso."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Card tone="light" className="h-fit p-5 sm:p-6">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--dash-text)]">
            Nueva invitación
          </h2>
          <p className="mt-1 text-sm text-[var(--dash-text-muted)]">
            La persona crea su propia cuenta; nunca necesitas compartir una contraseña.
          </p>
          <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
            <InputField
              label="Correo de la persona"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={254}
              required
            />
            <SelectField
              label="Rol"
              name="role"
              value={role}
              onChange={(event) => {
                const nextRole = event.target.value as Exclude<UserRole, "OWNER">;
                setRole(nextRole);
                if (nextRole !== "BARBER") setCreatePublicProfile(false);
              }}
            >
              {INVITABLE_ROLES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>
            {role === "BARBER" && (
              <label className="flex cursor-pointer items-start gap-3 rounded-sm border border-[var(--dash-border)] p-3 text-sm text-[var(--dash-text)]">
                <input
                  type="checkbox"
                  checked={createPublicProfile}
                  onChange={(event) => setCreatePublicProfile(event.target.checked)}
                  className="mt-0.5 h-4 w-4"
                />
                <span>
                  Crear también su perfil profesional público y su agenda.
                </span>
              </label>
            )}
            {formError && (
              <p role="alert" className="text-sm text-[var(--dash-danger)]">
                {formError}
              </p>
            )}
            <Button
              type="submit"
              tone="light"
              disabled={createInvitation.isPending}
            >
              {createInvitation.isPending ? "Enviando…" : "Enviar invitación"}
            </Button>
          </form>
        </Card>

        <section aria-labelledby="invitation-list-title">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="invitation-list-title"
                className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--dash-text)]"
              >
                Invitaciones
              </h2>
              <p className="text-sm text-[var(--dash-text-muted)]">
                {invitations.data?.total ?? 0} en este espacio de trabajo
              </p>
            </div>
            <label className="text-sm text-[var(--dash-text-muted)]">
              Estado
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as TeamInvitationStatus | "ALL");
                  setPage(1);
                }}
                className="mt-1 block rounded-sm border border-[var(--dash-border-strong)] bg-[var(--dash-surface)] px-3 py-2 text-[var(--dash-text)]"
              >
                <option value="ALL">Todos</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {invitations.isLoading ? (
            <div className="space-y-3" aria-label="Cargando invitaciones">
              {[0, 1, 2].map((item) => (
                <Skeleton key={item} className="h-28 w-full" />
              ))}
            </div>
          ) : invitations.isError ? (
            <EmptyState
              tone="light"
              title="No pudimos cargar las invitaciones"
              description="Revisa tu conexión e intenta de nuevo."
              action={
                <Button tone="light" onClick={() => void invitations.refetch()}>
                  Intentar de nuevo
                </Button>
              }
            />
          ) : invitations.data?.items.length === 0 ? (
            <EmptyState
              tone="light"
              title={status === "ALL" ? "Aún no hay invitaciones" : "No hay invitaciones con este estado"}
              description={
                status === "ALL"
                  ? "Envía la primera para dar acceso seguro a tu equipo."
                  : "Prueba otro estado para ampliar los resultados."
              }
            />
          ) : (
            <div className="space-y-3">
              {invitations.data?.items.map((invitation) => {
                const manageable = MANAGEABLE.has(invitation.status);
                const busy =
                  (resendInvitation.isPending && resendInvitation.variables === invitation.id) ||
                  (revokeInvitation.isPending && revokeInvitation.variables === invitation.id);
                return (
                  <Card key={invitation.id} tone="light" className="p-4 sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="break-all font-medium text-[var(--dash-text)]">
                          {invitation.email}
                        </p>
                        <p className="mt-1 text-sm text-[var(--dash-text-muted)]">
                          {ROLE_LABELS[invitation.role]} · {STATUS_LABELS[invitation.status]}
                        </p>
                        <p className="mt-2 text-xs text-[var(--dash-text-faint)]">
                          Enviada {formatDate(invitation.createdAt)} · vence {formatDate(invitation.expiresAt)}
                        </p>
                      </div>
                      {manageable && (
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button
                            tone="light"
                            variant="secondary"
                            disabled={busy}
                            onClick={() => void resend(invitation.id)}
                          >
                            Reenviar
                          </Button>
                          {invitation.status !== "REVOKED" && (
                            <Button
                              tone="light"
                              variant="danger"
                              disabled={busy}
                              onClick={() => void revoke(invitation.id)}
                            >
                              Revocar
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {(invitations.data?.totalPages ?? 0) > 1 && (
            <nav aria-label="Paginación de invitaciones" className="mt-5 flex items-center justify-between gap-3">
              <Button
                tone="light"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                Anterior
              </Button>
              <span className="text-sm text-[var(--dash-text-muted)]">
                Página {invitations.data?.page} de {invitations.data?.totalPages}
              </span>
              <Button
                tone="light"
                variant="secondary"
                disabled={page >= (invitations.data?.totalPages ?? 1)}
                onClick={() => setPage((value) => value + 1)}
              >
                Siguiente
              </Button>
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}
