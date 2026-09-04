"use client";

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type {
  TeamDirectoryMember,
  TeamInvitation,
  TeamInvitationStatus,
  UserRole,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  useCreateTeamInvitation,
  useResendTeamInvitation,
  useRevokeTeamInvitation,
  useRevokeTeamMemberAccess,
  useTeamInvitationsQuery,
  useTeamMembersQuery,
  useUpdateTeamMemberRole,
} from "@/lib/queries/team";
import {
  canManageTeam,
  canManageTeamMember,
  isCurrentTeamScope,
  PROFESSIONAL_STATUS_LABELS,
  teamErrorMessage,
  teamRevokeInput,
  TEAM_ROLE_LABELS,
  TEAM_ROLE_OPTIONS,
  teamRoleInput,
  teamScopeKey,
} from "@/lib/team-ui";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { InputField, SelectField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { SkeletonListRows } from "@/components/ui/Skeleton";

type TeamView = "MEMBERS" | "INVITATIONS";

const INVITATION_STATUS_LABELS: Record<TeamInvitationStatus, string> = {
  CREATING: "Preparando",
  PENDING: "Pendiente",
  RESENDING: "Reenviando",
  REVOKING: "Revocando",
  ACCEPTED: "Aceptada",
  REVOKED: "Revocada",
  EXPIRED: "Vencida",
  FAILED: "No enviada",
};

const MANAGEABLE_INVITATION_STATUSES = new Set<TeamInvitationStatus>([
  "PENDING",
  "EXPIRED",
  "FAILED",
  "REVOKED",
]);

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-DO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function TeamPage() {
  const { organization, user } = useAuth();
  const scopeKey = teamScopeKey(user);
  const scopeInstance = useMemo(() => ({ key: scopeKey }), [scopeKey]);
  const currentScopeRef = useRef<typeof scopeInstance | null>(scopeInstance);

  useLayoutEffect(() => {
    currentScopeRef.current = scopeInstance;
    return () => {
      currentScopeRef.current = null;
    };
  }, [scopeInstance]);

  if (!user || !scopeKey) return null;

  if (!canManageTeam(user.role)) {
    return (
      <EmptyState
        tone="light"
        title="No tienes acceso a Equipo"
        description="Solo el propietario o una persona administradora puede consultar y gestionar los accesos del equipo."
      />
    );
  }

  return (
    <ScopedTeamPage
      key={scopeKey}
      scopeKey={scopeKey}
      actorRole={user.role}
      organizationName={organization?.name ?? "esta organización"}
      isCurrentScope={() =>
        isCurrentTeamScope(currentScopeRef.current, scopeInstance)
      }
    />
  );
}

function ScopedTeamPage({
  scopeKey,
  actorRole,
  organizationName,
  isCurrentScope,
}: {
  scopeKey: string;
  actorRole: UserRole;
  organizationName: string;
  isCurrentScope: () => boolean;
}) {
  const { toast } = useToast();
  const [view, setView] = useState<TeamView>("MEMBERS");
  const [memberPage, setMemberPage] = useState(1);
  const [invitationPage, setInvitationPage] = useState(1);
  const [invitationStatus, setInvitationStatus] = useState<
    TeamInvitationStatus | "ALL"
  >("ALL");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleMember, setRoleMember] = useState<TeamDirectoryMember | null>(null);
  const [revokeMember, setRevokeMember] =
    useState<TeamDirectoryMember | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const members = useTeamMembersQuery(scopeKey, memberPage, view === "MEMBERS");
  const invitations = useTeamInvitationsQuery({
    scopeKey,
    page: invitationPage,
    status: invitationStatus === "ALL" ? undefined : invitationStatus,
    enabled: view === "INVITATIONS",
  });
  const resendInvitation = useResendTeamInvitation();
  const revokeInvitation = useRevokeTeamInvitation();

  function reportSuccess(message: string) {
    if (!isCurrentScope()) return;
    setActionError(null);
    setSuccessMessage(message);
    toast(message, "success");
  }

  async function resend(invitation: TeamInvitation) {
    setActionError(null);
    try {
      await resendInvitation.mutateAsync({ id: invitation.id, scopeKey });
      reportSuccess("Invitación reenviada correctamente.");
    } catch (error) {
      if (!isCurrentScope()) return;
      const message = teamErrorMessage(error, "resend");
      setActionError(message);
      toast(message, "error");
    }
  }

  async function revokeInvitationAccess(invitation: TeamInvitation) {
    setActionError(null);
    try {
      await revokeInvitation.mutateAsync({ id: invitation.id, scopeKey });
      reportSuccess("Invitación revocada correctamente.");
    } catch (error) {
      if (!isCurrentScope()) return;
      const message = teamErrorMessage(error, "revokeInvitation");
      setActionError(message);
      toast(message, "error");
    }
  }

  return (
    <div>
      <PageHeader
        tone="light"
        title="Equipo"
        description="Gestiona quién puede entrar a esta organización y consulta sus perfiles profesionales vinculados."
        action={
          <Button tone="light" onClick={() => setInviteOpen(true)}>
            Invitar persona
          </Button>
        }
      />

      {successMessage && (
        <div
          role="status"
          className="mb-5 rounded-sm border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {successMessage}
        </div>
      )}

      <Card tone="light" className="mb-5 p-1.5">
        <div className="grid grid-cols-2 gap-1" role="tablist" aria-label="Secciones de Equipo">
          <button
            type="button"
            role="tab"
            aria-selected={view === "MEMBERS"}
            onClick={() => {
              setActionError(null);
              setView("MEMBERS");
            }}
            className={`min-h-11 rounded-sm px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--dash-accent)] ${
              view === "MEMBERS"
                ? "bg-[var(--dash-accent)] text-white"
                : "text-[var(--dash-text-muted)] hover:bg-[var(--dash-surface-raised)] hover:text-[var(--dash-text)]"
            }`}
          >
            Miembros
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "INVITATIONS"}
            onClick={() => {
              setActionError(null);
              setView("INVITATIONS");
            }}
            className={`min-h-11 rounded-sm px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--dash-accent)] ${
              view === "INVITATIONS"
                ? "bg-[var(--dash-accent)] text-white"
                : "text-[var(--dash-text-muted)] hover:bg-[var(--dash-surface-raised)] hover:text-[var(--dash-text)]"
            }`}
          >
            Invitaciones
          </button>
        </div>
      </Card>

      {actionError && (
        <div
          role="alert"
          className="mb-5 rounded-sm border border-red-200 bg-[var(--dash-danger-bg)] px-4 py-3 text-sm text-[var(--dash-danger)]"
        >
          {actionError}
        </div>
      )}

      {view === "MEMBERS" ? (
        <section aria-labelledby="members-title">
          <div className="mb-4">
            <h2
              id="members-title"
              className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--dash-text)]"
            >
              Miembros con acceso
            </h2>
            <p className="text-sm text-[var(--dash-text-muted)]">
              {members.data?.total ?? 0} en {organizationName}
            </p>
          </div>

          {members.isPending ? (
            <Card tone="light" className="overflow-hidden" aria-live="polite">
              <p className="sr-only">Cargando miembros del equipo</p>
              <SkeletonListRows tone="light" />
            </Card>
          ) : members.isError ? (
            <EmptyState
              tone="light"
              title="No pudimos cargar los miembros"
              description="Revisa tu conexión e intenta nuevamente."
              action={
                <Button tone="light" onClick={() => void members.refetch()}>
                  Reintentar
                </Button>
              }
            />
          ) : members.data.items.length === 0 ? (
            <EmptyState
              tone="light"
              title="Aún no hay miembros con acceso"
              description="Invita a la primera persona para comenzar a formar el equipo."
              action={
                <Button tone="light" onClick={() => setInviteOpen(true)}>
                  Invitar persona
                </Button>
              }
            />
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-sm border border-[var(--dash-border)] bg-[var(--dash-surface)] shadow-[var(--dash-shadow-card)] md:block">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-[var(--dash-surface-raised)] text-left text-xs uppercase tracking-wider text-[var(--dash-text-muted)]">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-medium">Persona</th>
                      <th scope="col" className="px-4 py-3 font-medium">Rol</th>
                      <th scope="col" className="px-4 py-3 font-medium">Acceso</th>
                      <th scope="col" className="px-4 py-3 font-medium">Perfil profesional</th>
                      <th scope="col" className="px-4 py-3 text-right font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--dash-border)]">
                    {members.data.items.map((member) => (
                      <MemberTableRow
                        key={member.email}
                        member={member}
                        actorRole={actorRole}
                        onChangeRole={setRoleMember}
                        onRevoke={setRevokeMember}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 md:hidden">
                {members.data.items.map((member) => (
                  <MemberCard
                    key={member.email}
                    member={member}
                    actorRole={actorRole}
                    onChangeRole={setRoleMember}
                    onRevoke={setRevokeMember}
                  />
                ))}
              </div>
            </>
          )}

          <Pagination
            label="Paginación de miembros"
            page={members.data?.page ?? memberPage}
            totalPages={members.data?.totalPages ?? 0}
            onPage={setMemberPage}
          />
        </section>
      ) : (
        <section aria-labelledby="invitations-title">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="invitations-title"
                className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--dash-text)]"
              >
                Invitaciones
              </h2>
              <p className="text-sm text-[var(--dash-text-muted)]">
                {invitations.data?.total ?? 0} en esta vista
              </p>
            </div>
            <div className="w-full sm:w-56">
              <SelectField
                tone="light"
                label="Estado"
                name="invitation-status"
                value={invitationStatus}
                onChange={(event) => {
                  setInvitationStatus(
                    event.target.value as TeamInvitationStatus | "ALL",
                  );
                  setInvitationPage(1);
                }}
              >
                <option value="ALL">Todas</option>
                {Object.entries(INVITATION_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>

          {invitations.isPending ? (
            <Card tone="light" className="overflow-hidden" aria-live="polite">
              <p className="sr-only">Cargando invitaciones</p>
              <SkeletonListRows tone="light" />
            </Card>
          ) : invitations.isError ? (
            <EmptyState
              tone="light"
              title="No pudimos cargar las invitaciones"
              description="Revisa tu conexión e intenta nuevamente."
              action={
                <Button tone="light" onClick={() => void invitations.refetch()}>
                  Reintentar
                </Button>
              }
            />
          ) : invitations.data.items.length === 0 ? (
            <EmptyState
              tone="light"
              title={
                invitationStatus === "ALL"
                  ? "Aún no hay invitaciones"
                  : "No hay invitaciones con este estado"
              }
              description={
                invitationStatus === "ALL"
                  ? "Envía una invitación para dar acceso seguro a otra persona."
                  : "Prueba otro estado o vuelve a mostrar todas las invitaciones."
              }
              action={
                invitationStatus === "ALL" ? (
                  <Button tone="light" onClick={() => setInviteOpen(true)}>
                    Invitar persona
                  </Button>
                ) : (
                  <Button
                    tone="light"
                    variant="secondary"
                    onClick={() => {
                      setInvitationStatus("ALL");
                      setInvitationPage(1);
                    }}
                  >
                    Mostrar todas
                  </Button>
                )
              }
            />
          ) : (
            <div className="space-y-3">
              {invitations.data.items.map((invitation) => {
                const manageable = MANAGEABLE_INVITATION_STATUSES.has(
                  invitation.status,
                );
                const busy =
                  (resendInvitation.isPending &&
                    resendInvitation.variables?.id === invitation.id) ||
                  (revokeInvitation.isPending &&
                    revokeInvitation.variables?.id === invitation.id);
                return (
                  <Card key={invitation.id} tone="light" className="p-4 sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="break-all font-medium text-[var(--dash-text)]">
                          {invitation.email}
                        </p>
                        <p className="mt-1 text-sm text-[var(--dash-text-muted)]">
                          {TEAM_ROLE_LABELS[invitation.role]} ·{" "}
                          {INVITATION_STATUS_LABELS[invitation.status]}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-[var(--dash-text-faint)]">
                          Enviada {formatDate(invitation.createdAt)} · vence{" "}
                          {formatDate(invitation.expiresAt)}
                        </p>
                      </div>
                      {manageable && (
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button
                            tone="light"
                            variant="secondary"
                            disabled={busy}
                            aria-label={`Reenviar invitación a ${invitation.email}`}
                            onClick={() => void resend(invitation)}
                          >
                            {resendInvitation.isPending &&
                            resendInvitation.variables?.id === invitation.id
                              ? "Reenviando…"
                              : "Reenviar"}
                          </Button>
                          {invitation.status !== "REVOKED" && (
                            <Button
                              tone="light"
                              variant="danger"
                              disabled={busy}
                              aria-label={`Revocar invitación a ${invitation.email}`}
                              onClick={() => void revokeInvitationAccess(invitation)}
                            >
                              {revokeInvitation.isPending &&
                              revokeInvitation.variables?.id === invitation.id
                                ? "Revocando…"
                                : "Revocar"}
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

          <Pagination
            label="Paginación de invitaciones"
            page={invitations.data?.page ?? invitationPage}
            totalPages={invitations.data?.totalPages ?? 0}
            onPage={setInvitationPage}
          />
        </section>
      )}

      {inviteOpen && (
        <InvitationModal
          scopeKey={scopeKey}
          isCurrentScope={isCurrentScope}
          onClose={() => setInviteOpen(false)}
          onSuccess={() => {
            if (!isCurrentScope()) return;
            setInviteOpen(false);
            setInvitationPage(1);
            reportSuccess("Invitación enviada correctamente.");
          }}
        />
      )}

      {roleMember && (
        <RoleModal
          member={roleMember}
          scopeKey={scopeKey}
          isCurrentScope={isCurrentScope}
          onClose={() => setRoleMember(null)}
          onSuccess={(member) => {
            if (!isCurrentScope()) return;
            setRoleMember(null);
            reportSuccess(`El rol de ${member.name} fue actualizado.`);
          }}
        />
      )}

      {revokeMember && (
        <RevokeMemberModal
          member={revokeMember}
          organizationName={organizationName}
          scopeKey={scopeKey}
          isCurrentScope={isCurrentScope}
          onClose={() => setRevokeMember(null)}
          onSuccess={() => {
            if (!isCurrentScope()) return;
            const name = revokeMember.name;
            setRevokeMember(null);
            if ((members.data?.items.length ?? 0) === 1 && memberPage > 1) {
              setMemberPage((current) => current - 1);
            }
            reportSuccess(`El acceso de ${name} fue revocado.`);
          }}
        />
      )}
    </div>
  );
}

interface MemberActionsProps {
  member: TeamDirectoryMember;
  actorRole: UserRole;
  onChangeRole: (member: TeamDirectoryMember) => void;
  onRevoke: (member: TeamDirectoryMember) => void;
}

function MemberTableRow({
  member,
  actorRole,
  onChangeRole,
  onRevoke,
}: MemberActionsProps) {
  const manageable = canManageTeamMember(actorRole, member.role);
  return (
    <tr>
      <td className="px-4 py-4 align-top">
        <p className="font-medium text-[var(--dash-text)]">{member.name}</p>
        <p className="break-all text-sm text-[var(--dash-text-muted)]">{member.email}</p>
      </td>
      <td className="px-4 py-4 align-top text-[var(--dash-text)]">
        {TEAM_ROLE_LABELS[member.role]}
      </td>
      <td className="px-4 py-4 align-top">
        <AccessBadge status={member.accessStatus} />
      </td>
      <td className="px-4 py-4 align-top">
        <ProfessionalSummary member={member} />
      </td>
      <td className="px-4 py-4 align-top">
        <div className="flex justify-end gap-2">
          {manageable ? (
            <>
              <Button
                tone="light"
                variant="secondary"
                aria-label={`Cambiar rol de ${member.name}`}
                onClick={() => onChangeRole(member)}
              >
                Cambiar rol
              </Button>
              <Button
                tone="light"
                variant="danger"
                aria-label={`Revocar acceso de ${member.name}`}
                onClick={() => onRevoke(member)}
              >
                Revocar acceso
              </Button>
            </>
          ) : (
            <span className="text-xs text-[var(--dash-text-faint)]">Protegido</span>
          )}
        </div>
      </td>
    </tr>
  );
}

function MemberCard({
  member,
  actorRole,
  onChangeRole,
  onRevoke,
}: MemberActionsProps) {
  const manageable = canManageTeamMember(actorRole, member.role);
  return (
    <Card tone="light" className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-[var(--dash-text)]">{member.name}</p>
          <p className="break-all text-sm text-[var(--dash-text-muted)]">{member.email}</p>
        </div>
        <AccessBadge status={member.accessStatus} />
      </div>
      <dl className="mt-4 grid gap-3 border-t border-[var(--dash-border)] pt-4 text-sm">
        <div className="flex items-start justify-between gap-4">
          <dt className="text-[var(--dash-text-muted)]">Rol</dt>
          <dd className="text-right font-medium text-[var(--dash-text)]">
            {TEAM_ROLE_LABELS[member.role]}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-4">
          <dt className="text-[var(--dash-text-muted)]">Perfil profesional</dt>
          <dd className="max-w-[65%] text-right">
            <ProfessionalSummary member={member} />
          </dd>
        </div>
      </dl>
      {manageable && (
        <div className="mt-4 grid gap-2 border-t border-[var(--dash-border)] pt-4 sm:grid-cols-2">
          <Button
            tone="light"
            variant="secondary"
            aria-label={`Cambiar rol de ${member.name}`}
            onClick={() => onChangeRole(member)}
          >
            Cambiar rol
          </Button>
          <Button
            tone="light"
            variant="danger"
            aria-label={`Revocar acceso de ${member.name}`}
            onClick={() => onRevoke(member)}
          >
            Revocar acceso
          </Button>
        </div>
      )}
    </Card>
  );
}

function AccessBadge({
  status,
}: {
  status: TeamDirectoryMember["accessStatus"];
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {status === "ACTIVE" ? "Activo" : status}
    </span>
  );
}

function ProfessionalSummary({ member }: { member: TeamDirectoryMember }) {
  if (!member.professional) {
    return <span className="text-sm text-[var(--dash-text-faint)]">Sin vínculo</span>;
  }
  return (
    <div className="text-sm">
      <p className="font-medium text-[var(--dash-text)]">{member.professional.name}</p>
      <p className="text-[var(--dash-text-muted)]">
        {PROFESSIONAL_STATUS_LABELS[member.professional.status]}
      </p>
    </div>
  );
}

function Pagination({
  label,
  page,
  totalPages,
  onPage,
}: {
  label: string;
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav
      aria-label={label}
      className="mt-5 flex items-center justify-between gap-3"
    >
      <Button
        tone="light"
        variant="secondary"
        disabled={page <= 1}
        onClick={() => onPage(Math.max(1, page - 1))}
      >
        Anterior
      </Button>
      <span className="text-sm text-[var(--dash-text-muted)]">
        Página {page} de {totalPages}
      </span>
      <Button
        tone="light"
        variant="secondary"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        Siguiente
      </Button>
    </nav>
  );
}

function InvitationModal({
  scopeKey,
  isCurrentScope,
  onClose,
  onSuccess,
}: {
  scopeKey: string;
  isCurrentScope: () => boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const createInvitation = useCreateTeamInvitation();
  const [email, setEmail] = useState("");
  const [role, setRole] =
    useState<Exclude<UserRole, "OWNER">>("BARBER");
  const [createPublicProfile, setCreatePublicProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await createInvitation.mutateAsync({
        scopeKey,
        input: {
          email: email.trim().toLowerCase(),
          role,
          createPublicProfile: role === "BARBER" && createPublicProfile,
        },
      });
      if (!isCurrentScope()) return;
      onSuccess();
    } catch (mutationError) {
      if (!isCurrentScope()) return;
      setError(teamErrorMessage(mutationError, "invite"));
    }
  }

  return (
    <Modal title="Invitar persona" tone="light" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm leading-6 text-[var(--dash-text-muted)]">
          La persona recibirá un enlace seguro y creará su propia cuenta.
        </p>
        <InputField
          tone="light"
          label="Correo"
          name="team-invitation-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          maxLength={254}
          autoComplete="email"
          required
        />
        <SelectField
          tone="light"
          label="Rol"
          name="team-invitation-role"
          value={role}
          onChange={(event) => {
            const nextRole = event.target.value as Exclude<UserRole, "OWNER">;
            setRole(nextRole);
            if (nextRole !== "BARBER") setCreatePublicProfile(false);
          }}
        >
          {TEAM_ROLE_OPTIONS.map((option) => (
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
            <span>Crear también su perfil profesional público y su agenda.</span>
          </label>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-sm bg-[var(--dash-danger-bg)] px-3 py-2 text-sm text-[var(--dash-danger)]"
          >
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 border-t border-[var(--dash-border)] pt-4 sm:flex-row sm:justify-end">
          <Button tone="light" variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button tone="light" type="submit" disabled={createInvitation.isPending}>
            {createInvitation.isPending ? "Enviando…" : "Enviar invitación"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function RoleModal({
  member,
  scopeKey,
  isCurrentScope,
  onClose,
  onSuccess,
}: {
  member: TeamDirectoryMember;
  scopeKey: string;
  isCurrentScope: () => boolean;
  onClose: () => void;
  onSuccess: (member: TeamDirectoryMember) => void;
}) {
  const updateRole = useUpdateTeamMemberRole();
  const initialRole: Exclude<UserRole, "OWNER"> =
    member.role === "OWNER" ? "ADMIN" : member.role;
  const [role, setRole] = useState(initialRole);
  const [error, setError] = useState<string | null>(null);
  const unchanged = member.role !== "OWNER" && role === member.role;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const input = teamRoleInput(member, role);
      const updated = await updateRole.mutateAsync({ scopeKey, ...input });
      if (!isCurrentScope()) return;
      onSuccess(updated);
    } catch (mutationError) {
      if (!isCurrentScope()) return;
      setError(teamErrorMessage(mutationError, "role"));
    }
  }

  return (
    <Modal title="Cambiar rol" tone="light" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <p className="font-medium text-[var(--dash-text)]">{member.name}</p>
          <p className="break-all text-sm text-[var(--dash-text-muted)]">
            {member.email}
          </p>
        </div>
        <SelectField
          tone="light"
          label="Nuevo rol"
          name="team-member-role"
          value={role}
          onChange={(event) =>
            setRole(event.target.value as Exclude<UserRole, "OWNER">)
          }
        >
          {TEAM_ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
        <p className="text-sm leading-6 text-[var(--dash-text-muted)]">
          El cambio ajusta su acceso a esta organización. Siempre debe permanecer al menos un propietario.
        </p>
        {error && (
          <p
            role="alert"
            className="rounded-sm bg-[var(--dash-danger-bg)] px-3 py-2 text-sm text-[var(--dash-danger)]"
          >
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 border-t border-[var(--dash-border)] pt-4 sm:flex-row sm:justify-end">
          <Button tone="light" variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            tone="light"
            type="submit"
            disabled={unchanged || updateRole.isPending}
          >
            {updateRole.isPending ? "Guardando…" : "Guardar rol"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function RevokeMemberModal({
  member,
  organizationName,
  scopeKey,
  isCurrentScope,
  onClose,
  onSuccess,
}: {
  member: TeamDirectoryMember;
  organizationName: string;
  scopeKey: string;
  isCurrentScope: () => boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const revokeAccess = useRevokeTeamMemberAccess();
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setError(null);
    try {
      await revokeAccess.mutateAsync({
        scopeKey,
        ...teamRevokeInput(member),
      });
      if (!isCurrentScope()) return;
      onSuccess();
    } catch (mutationError) {
      if (!isCurrentScope()) return;
      setError(teamErrorMessage(mutationError, "revokeMember"));
    }
  }

  return (
    <Modal title="Revocar acceso" tone="light" onClose={onClose}>
      <p className="text-sm leading-6 text-[var(--dash-text-muted)]">
        <strong className="text-[var(--dash-text)]">{member.name}</strong> dejará
        de poder entrar a {organizationName}. Su perfil profesional y el historial
        del negocio no se eliminarán.
      </p>
      <p className="mt-3 text-sm font-medium text-[var(--dash-danger)]">
        Esta acción retira el acceso inmediatamente.
      </p>
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-sm bg-[var(--dash-danger-bg)] px-3 py-2 text-sm text-[var(--dash-danger)]"
        >
          {error}
        </p>
      )}
      <div className="mt-5 flex flex-col-reverse gap-2 border-t border-[var(--dash-border)] pt-4 sm:flex-row sm:justify-end">
        <Button tone="light" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          tone="light"
          variant="danger"
          disabled={revokeAccess.isPending}
          onClick={() => void confirm()}
        >
          {revokeAccess.isPending ? "Revocando…" : "Sí, revocar acceso"}
        </Button>
      </div>
    </Modal>
  );
}
