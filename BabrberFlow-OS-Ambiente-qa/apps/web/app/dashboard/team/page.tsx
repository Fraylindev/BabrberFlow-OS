"use client";

import { useState, FormEvent } from "react";
import { api, ApiError, UserRole } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { InputField, SelectField } from "@/components/ui/Field";
import { PasswordField } from "@/components/ui/PasswordField";

const INVITABLE_ROLES: { value: UserRole; label: string }[] = [
  { value: "ADMIN", label: "Administrador" },
  { value: "BARBER", label: "Barbero" },
  { value: "RECEPTIONIST", label: "Recepción" },
];

interface JustInvited {
  name: string;
  email: string;
  password: string;
  phone: string;
  professionalCreated: boolean;
}

function waLink(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  const base = digits ? `https://wa.me/${digits}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(message)}`;
}

export default function TeamPage() {
  const { organization } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("BARBER");
  const [createPublicProfile, setCreatePublicProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [justInvited, setJustInvited] = useState<JustInvited | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<{ professionalCreated: boolean }>(
        "/auth/invite",
        {
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          createPublicProfile: role === "BARBER" ? createPublicProfile : false,
        },
      );
      toast(`${name.trim()} fue agregado como ${role.toLowerCase()}.`, "success");
      setJustInvited({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim(),
        professionalCreated: res.professionalCreated,
      });
      setName("");
      setEmail("");
      setPassword("");
      setPhone("");
      setRole("BARBER");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "No se pudo invitar al usuario.";
      setError(message);
      toast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Equipo"
        description="Da acceso al panel a otros miembros de tu barbería."
      />

      <Card className="max-w-md p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <InputField
            label="Nombre"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <InputField
            label="Correo"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <PasswordField
            label="Contraseña temporal"
            name="password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <InputField
            label="WhatsApp (opcional, para enviarle los datos)"
            name="phone"
            maxLength={11}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="8091234567"
          />
          <SelectField
            label="Rol"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            {INVITABLE_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </SelectField>

          {role === "BARBER" && (
            <label className="flex cursor-pointer items-start gap-3 rounded-sm border border-[var(--color-border)] p-3">
              <input
                type="checkbox"
                checked={createPublicProfile}
                onChange={(e) => setCreatePublicProfile(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-sm text-[var(--color-paper)]">
                Crear perfil público — aparecerá en la página de reservas y
                tendrá su propia agenda en el panel.
              </span>
            </label>
          )}

          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? "Invitando…" : "Invitar"}
          </Button>
        </form>
      </Card>

      {justInvited && (
        <Card className="mt-4 max-w-md p-6">
          <p className="text-sm text-[var(--color-paper)]">
            {justInvited.name} ya puede iniciar sesión.
          </p>
          {justInvited.professionalCreated && (
            <p className="mt-1 text-xs text-[var(--color-success)]">
              También quedó visible en la página pública de reservas.
            </p>
          )}
          <a
            href={waLink(
              justInvited.phone,
              `Hola ${justInvited.name}! Ya tienes acceso al panel de ${organization?.name ?? "tu barbería"}.\n\nBarbería: ${organization?.slug ?? ""}\nCorreo: ${justInvited.email}\nContraseña temporal: ${justInvited.password}\n\nTe recomendamos cambiarla al entrar.`,
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block"
          >
            <Button variant="secondary">Enviar credenciales por WhatsApp</Button>
          </a>
        </Card>
      )}

      <p className="mt-4 max-w-md text-xs text-[var(--color-muted)]">
        Por ahora no hay un listado de miembros del equipo — el backend todavía
        no expone ese endpoint. Es un buen próximo paso.
      </p>
    </div>
  );
}
