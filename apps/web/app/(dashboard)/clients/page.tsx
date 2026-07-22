"use client";

import { useEffect, useState, FormEvent } from "react";
import { api, ApiError, Client } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { InputField } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";

const CAN_CREATE = ["OWNER", "ADMIN", "RECEPTIONIST"];

export default function ClientsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Client[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  function load() {
    api
      .get<Client[]>("/clients")
      .then(setItems)
      .catch(() => setError("No pudimos cargar los clientes."));
  }

  useEffect(load, []);

  const canCreate = user && CAN_CREATE.includes(user.role);

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Tu cartera de clientes."
        action={canCreate && <Button onClick={() => setModalOpen(true)}>+ Nuevo cliente</Button>}
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
          title="Todavía no hay clientes"
          description="Registra tu primer cliente para empezar a agendar citas."
          action={canCreate && <Button onClick={() => setModalOpen(true)}>+ Nuevo cliente</Button>}
        />
      ) : (
        <Card>
          <ul className="divide-y divide-[var(--color-border)]">
            {items.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm text-[var(--color-paper)]">{c.name}</p>
                  {c.email && (
                    <p className="text-xs text-[var(--color-muted)]">{c.email}</p>
                  )}
                </div>
                {c.phone && (
                  <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-muted)]">
                    {c.phone}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {modalOpen && (
        <CreateClientModal
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

function CreateClientModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/clients", {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Nuevo cliente" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <InputField
          label="Nombre"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <InputField
          label="Correo (opcional)"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <InputField
          label="Teléfono (opcional)"
          name="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <InputField
          label="Notas (opcional)"
          name="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
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
