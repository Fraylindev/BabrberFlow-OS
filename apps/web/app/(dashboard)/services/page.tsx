"use client";

import { useEffect, useState, FormEvent } from "react";
import { api, ApiError, Service } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { InputField } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";

const CAN_CREATE = ["OWNER", "ADMIN"];

function formatMoney(value: string | number) {
  return `RD$${Number(value).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;
}

export default function ServicesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Service[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  function load() {
    api
      .get<Service[]>("/services")
      .then(setItems)
      .catch(() => setError("No pudimos cargar los servicios."));
  }

  useEffect(load, []);

  const canCreate = user && CAN_CREATE.includes(user.role);

  return (
    <div>
      <PageHeader
        title="Servicios"
        description="El catálogo que tus clientes pueden reservar."
        action={
          canCreate && <Button onClick={() => setModalOpen(true)}>+ Nuevo servicio</Button>
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
          title="Todavía no hay servicios"
          description="Agrega tu primer corte, afeitado o tratamiento para poder crear reservas."
          action={
            canCreate && <Button onClick={() => setModalOpen(true)}>+ Nuevo servicio</Button>
          }
        />
      ) : (
        <Card>
          <ul className="divide-y divide-[var(--color-border)]">
            {items.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm text-[var(--color-paper)]">{s.name}</p>
                  {s.description && (
                    <p className="text-xs text-[var(--color-muted)]">{s.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-[family-name:var(--font-mono)] text-sm text-[var(--color-brass)]">
                    {formatMoney(s.price)}
                  </p>
                  <p className="text-xs text-[var(--color-muted)]">{s.duration} min</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {modalOpen && (
        <CreateServiceModal
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

function CreateServiceModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("30");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/services", {
        name: name.trim(),
        description: description.trim() || undefined,
        duration: Number(duration),
        price: Number(price),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Nuevo servicio" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <InputField
          label="Nombre"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <InputField
          label="Descripción (opcional)"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <InputField
            label="Duración (min)"
            name="duration"
            type="number"
            min={1}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            required
          />
          <InputField
            label="Precio (RD$)"
            name="price"
            type="number"
            min={0}
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>
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
