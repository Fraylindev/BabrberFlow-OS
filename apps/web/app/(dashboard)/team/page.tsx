"use client";

import { useState, FormEvent } from "react";
import { api, ApiError, UserRole } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { InputField, SelectField } from "@/components/ui/Field";

const INVITABLE_ROLES: { value: UserRole; label: string }[] = [
  { value: "ADMIN", label: "Administrador" },
  { value: "BARBER", label: "Barbero" },
  { value: "RECEPTIONIST", label: "Recepción" },
];

export default function TeamPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("BARBER");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await api.post("/auth/invite", {
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      });
      setSuccess(`${name.trim()} fue agregado como ${role.toLowerCase()}.`);
      setName("");
      setEmail("");
      setPassword("");
      setRole("BARBER");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo invitar al usuario.");
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
          <InputField
            label="Contraseña temporal"
            name="password"
            type="password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
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

          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
          {success && (
            <p className="text-sm text-[var(--color-success)]">{success}</p>
          )}

          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? "Invitando…" : "Invitar"}
          </Button>
        </form>
      </Card>

      <p className="mt-4 max-w-md text-xs text-[var(--color-muted)]">
        Por ahora no hay un listado de miembros del equipo — el backend todavía
        no expone ese endpoint. Es un buen próximo paso.
      </p>
    </div>
  );
}
