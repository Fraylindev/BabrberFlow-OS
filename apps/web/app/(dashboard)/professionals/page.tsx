"use client";

import { useEffect, useState, FormEvent } from "react";
import { api, ApiError, Professional } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { InputField } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";

const CAN_CREATE = ["OWNER", "ADMIN"];

export default function ProfessionalsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Professional[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  function load() {
    api
      .get<Professional[]>("/professionals")
      .then(setItems)
      .catch(() => setError("No pudimos cargar los profesionales."));
  }

  useEffect(load, []);

  const canCreate = user && CAN_CREATE.includes(user.role);

  return (
    <div>
      <PageHeader
        title="Profesionales"
        description="El equipo que atiende a tus clientes."
        action={
          canCreate && (
            <Button onClick={() => setModalOpen(true)}>+ Nuevo profesional</Button>
          )
        }
      />

      {error && (
        <p className="mb-4 rounded-sm bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      {items === null ? (
        <p className="text-sm text-[var(--color-muted)]">Cargando…</p>
      ) : items.length === 0 ? (
        <EmptyState
          title="Todavía no hay profesionales"
          description="Agrega a tu primer barbero o estilista para empezar a recibir reservas."
          action={
            canCreate && (
              <Button onClick={() => setModalOpen(true)}>+ Nuevo profesional</Button>
            )
          }
        />
      ) : (
        <Card>
          <ul className="divide-y divide-[var(--color-border)]">
            {items.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm text-[var(--color-paper)]">{p.name}</p>
                  {p.bio && (
                    <p className="text-xs text-[var(--color-muted)]">{p.bio}</p>
                  )}
                </div>
                {p.phone && (
                  <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-muted)]">
                    {p.phone}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {modalOpen && (
        <CreateProfessionalModal
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function CreateProfessionalModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/professionals", {
        name: name.trim(),
        bio: bio.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Nuevo profesional" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <InputField
          label="Nombre"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <InputField
          label="Bio (opcional)"
          name="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
        <InputField
          label="Teléfono (opcional)"
          name="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
